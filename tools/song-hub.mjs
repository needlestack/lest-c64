// song-hub.mjs -- the hub's atmosphere (level 4): wind in a hollow room, written as a GoatTracker 2 song.
//
//   node tools/song-hub.mjs [out.sng]        (default music/hub.sng)
//
// The sound plan: level 4 is "silent save a very soft background atmosphere". The user (2026-10-27):
// "bandpassed noise with a long slow sweep? Maybe with little faster sweeps here and there? Like breezes?"
//
// Voice 1, the wind: noise through the band-pass, the cutoff swept slowly up and down (WIND), with short
// fast swells -- gusts -- between the sweeps. The band-pass keeps a narrow slice of the noise, so it is
// quiet and airy, and at resonance it whistles faintly at the cutoff, a bottle blown across: the hollow.
// Under the sweep, the NOISE's own pitch drifts on its own schedule (fine hiss <-> coarse rush), so the
// two motions never line up the same way twice in a loop.
// Voice 2, ROOM=1: a very quiet low triangle, the room tone, that slides a step now and then. Unfiltered.
//
// VOLUME. The SID has no per-voice volume; a held note's SUSTAIN level is its volume (WSUS, ROOMSUS). But
// an attack always rises to FULL volume before decaying to the sustain -- the user: "the long attack kills
// the sustain volume trick" -- so a voice can't fade in with its envelope. The silent attack instead: the
// gate goes up with NO waveform selected (wavetable $E1, an inaudible wave = gate only), the envelope
// rises and decays to its sustain level unheard (QUIET seconds), and only then the waveform switches on --
// at the sustain level. The wind then fades in with its FILTER: the cutoff starts closed (WSTART) and the
// intro opens it. The master volume stays at F: changing it clicks on the 6581 (it is how samples play).
// The 6581's DC offset makes an envelope audible even with no waveform, as a thump on a fast attack, so
// the silent attack was a moderate one (AD 99: ~0.25 s up, ~0.75 s down -- a sub-audible DC swell).
// Then the user: "the fade in with the filter doesn't work -- it just sounds like someone switching the
// sound on after some silence ... let's just go with the sound starting immediately." So now: AD 00 (the
// envelope at its sustain within ~8 ms, still unheard), QUIET a tenth of a second, no WINTRO, and the
// filter starts where the loop does. QUIET=3 WAD=99 WSTART=30 WINTRO=8>70 is the old fade-in.
//
// THE FILTER PROGRAMS. GoatTracker's cutoff is 8 bits and a filtertable modulation step adds a whole unit
// a tick at the least ($00 -> $40 in ~1 s), far too fast for a sweep of tens of seconds. So every sweep is
// a RAMP program that LOOPS: +-1 unit, then H-1 ticks of hold, jump back (H ticks a unit, any speed). A
// loop never ends by itself; the pattern ends it, switching the filter to the next program with command
// Axx (A00 = stop, the cutoff holds) on the row the sweep should arrive. The generator simulates the
// player's filter tick by tick (gplay.c's own steps) to know where each sweep really ends, so the next
// starts from the true cutoff; the cycle's last event SETS the cutoff to where the cycle began, so the
// loop can never drift however the rows round.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const OUT = process.argv[2] ?? 'music/hub.sng';
const env = (k, d) => process.env[k] ?? d;
const hexv = (k, d) => parseInt(env(k, d), 16);

// a row is TEMPOT ticks: 6 = a tenth of a second at 60 Hz, the resolution of every time below
const TEMPO_T = +env('TEMPOT', 6), ROW_S = TEMPO_T / 60;
// band-pass ($A0; WTYPE=lp is $90, hp $C0) at resonance WRES (gusts may raise it); the cutoff starts at
// WSTART. The 6581's cutoff curve is nearly flat (~200 Hz) across the bottom third of the register and
// climbs steeply above ~$60: the first take swept $18..$52, all in the dull flat end -- the user: "a bit
// too fully sounding -- maybe roll off the low end more? or bring up the pitch?" -- so it now lives in
// $50..$c0 (the first take: music/hub-v1.sng)
const WTYPE = { lp: 0x90, bp: 0xa0, hp: 0xc0 }[env('WTYPE', 'bp')], WRES = hexv('WRES', '8');
// the wind's envelope: the silent attack (above), then sustain WSUS, release WREL when the level ends
// (2026-10-27, after level 3's atmosphere: wind 1 -> 2, hum 2 -> 4, "bump up to 2 and 4"; the take
// before is music/hub-v10.sng)
const WAD = hexv('WAD', '00'), WSR = hexv('WSUS', '2') << 4 | hexv('WREL', 'a');
const QUIET = +env('QUIET', 0.1);                        // seconds of silent attack before any sound
// WIND: the cutoff's moves, in seconds and hex cutoff units. `secs>cut` sweeps to cut over secs; `secs=`
// holds; `g:amp:up:down[:res]` is a gust: amp units up in up seconds and back down in down seconds, the
// resonance stepping up to res at its peak and back (the user: "pushing resonance up and down will be good
// for light gusts") -- amp 0 is a resonance-only breath. Resonance has 16 levels and no slide, so a gust
// steps it, a pattern event a level (as many as its rows allow).
// WINTRO plays once (the fade-in, from WSTART after QUIET), WIND loops; WIND must end where WINTRO did.
// "a bit too static -- if we can make the changes over time a bit more pronounced": wider and quicker
// sweeps, deeper dips, more gusts, most of them with a resonance swell (take 1: '10>20' and
// '14>34 g:10:.6:2 6= 12>1c 4= g:c:.5:1.5 10>40 3= g:14:.4:2.5 16>18 8= 9>28 g:8:.5:1.2 7>20 5=')
// Then: "it went from almost no audible movement to super dramatic sweeps. maybe something in between
// ... I think it goes too high": WDEPTH scales every move about WMID -- a target c plays at
// WMID + (c - $80) * WDEPTH, a gust's amplitude and resonance swell by WDEPTH too. WDEPTH=1 WMID=80 is
// take 2 exactly (music/hub-v2.sng); the default halves it and centres it lower ($5c..$9c, peaks ~$a8).
// Then "sweeps are still too dramatic. cut the range for any sweep (pitch/filter/resonance) in half", and
// to tell the three apart, a depth knob each: WDEPTH the cutoff, RDEPTH the resonance swells (take 3 had
// them both at 0.5), NDEPTH the noise pitch's intervals (take 3: 1; each glide's interval from the start
// note, scaled and rounded to a semitone). 0 turns that motion off: the hub-demo-*.sng files.
// Take 4 then sounded "harsher, higher pitched ... more like static than wind, and it's not really moving
// again"; the user: "the closest we had was your second attempt ... decent sound and decent movement
// except the sweeps went too far to the high end". So take 5 is take 2 with its cutoff moves HALVED TOWARD
// THE BOTTOM: WMID $6c puts take 2's lowest target ($58) where it was and its peak ($d6) at $97. Take 2's
// resonance swells (RDEPTH 1: resting 6, gusts to f -- likely what made it air rather than static; take
// 1's airy sound was resonance c throughout) and its steady noise pitch (NDEPTH 0: take 2's glides never
// ran, see NOISE). Take 4: WDEPTH=0.25 RDEPTH=0.25 NDEPTH=0.5 WMID=78 ROOM=1 (music/hub-v4.sng).
// Take 6, after three single-motion tests (music/hub-test-*.sng): "pitch changes sound somewhat unnatural,
// so let's leave them out. filter sweep sounds good but is dramatic and needs to be used subtly ...
// resonance is much subtler, but I think useful for gusts, and I think you need more dramatic levels ...
// long slow subtle filter sweep (something that unfolds over the course of 10-20 seconds) and then
// resonance at shorter timeframes, 2-5 seconds ... filter & resonance numbers somewhere between the range
// of v1 & v2". v1's tone was the favourite: B4 noise, resonance c, cutoff $18..$52; v2 $57..$d6, 6..f.
// So: B4, steady; the cutoff $30..$6c in 12-18 s sweeps; resonance resting at 9, gusts to d-f riding on
// the sweeps (the `@` syntax). The depth knobs now default to identity; take 5 was WDEPTH=0.5 WMID=6c
// RDEPTH=1 NOISE='B5 ...' WRES=6 and take 2's WIND (music/hub-v5.sng).
const WDEPTH = +env('WDEPTH', 1), RDEPTH = +env('RDEPTH', 1), NDEPTH = +env('NDEPTH', 0), WMID = hexv('WMID', '80');
const WINTRO = env('WINTRO', '');
// the cutoff the song starts at, where the loop begins and ends (WIND's last target, $70, scaled)
// Take 7: "the top of the filter sweep is too high. can we bring it back about 25%? ... some go all the
// way (25% lower than current peak) but some only go partway (50% lower)": take 6 swept up from ~$30 to
// $6c, so the full peaks are now $5d (3/4 of that climb) and the partial ones $4e (half), alternating.
// "Resonance is maybe a bit too subtle still, make it a bit more intense (but keep the timing)": every
// gust peaks at f, from a resting 8 (was 9, peaks d-f). Take 6's WIND:
// '14>60@3:f:1:2.5@9:e:1.5:3 4= 18>30@5:f:1.2:3@13:d:1:2 4=@.3:f:1:2.5 12>48@6:e:1:3 16>6c@2:f:1.5:3.5@10:f:1:2 5= 15>40@7:e:1.2:2.5'
// with WRES=9 WSUS=4 ROOM=0 (music/hub-v6.sng).
// Take 9, at wind sustain 1 / hum 2 (music/hub-w1h2.sng): at that level a cutoff near $30 is silence, so
// the user hears the sweeps as SWELLS out of silence -- "start with about 6-10 seconds of silence ... then
// have the *lower* swell first, lasting 15-20 seconds, and back to 6-10 seconds of silence, then the longer,
// higher, swell, then back to silence and then a softer one" (the hum stays throughout). So the loop is:
// 8 s silent ($30), a 20 s swell to $4e, 8 s, a 32 s swell to $5d, 8 s, a 15 s swell to $44 -- and back to
// the opening silence. Take 8's WIND (music/hub-v8.sng, sustain 2/4):
// '14>5d@3:f:1:2.5@9:f:1.5:3 4= 18>30@5:f:1.2:3@13:f:1:2 4=@.3:f:1:2.5 12>4e@6:f:1:3 10>34@2:f:1.5:3.5 16>5d@2:f:1.5:3.5@10:f:1:2 5= 15>38@7:f:1.2:2.5 8>4e@2:f:1:3 8>40@3:f:1:2.5'
// Take 10: "lets have the first (opening) and second silences be shorter by about half. for the big long
// louder wind peak, have it fall 75% from peak, then rise back to 50% peak, then fall to silence ... I
// don't want it to just be all up-down blank up-down blank -- too monotonous". Silences 4, 4, 8 s; the big
// swell climbs $30 -> $5d, falls to $3b (a quarter of the climb left), recovers to $46 (half), then out.
// Take 9's WIND (music/hub-v9.sng):
// '8= 10>4e@4:f:1:2.5 10>30@2:f:1.2:3 8= 14>5d@3:f:1:2.5@9:f:1.5:3 4=@.3:f:1:2.5 14>30@4:f:1.2:3@10:f:1:2 8= 7>44@3:f:1:2.5 8>30@2:f:1:3'
// Take 11 (2026-10-27), wind sustain 2 / hum 4: at sustain 2 the $30 floor let the noise through in VICE.
// A third of every cutoff ($10..$1f, WDEPTH=0.33333 WMID=2b) silenced it but flattened the swells away
// (all inside the 6581's flat bottom) -- the user: "have the floor $10, but make the low swell $30, the soft
// swell $40, and the big swell $50>$30>$40". Take 10's WIND (music/hub-v10.sng, sustain 1 / hum 2):
// '4= 10>4e@4:f:1:2.5 10>30@2:f:1.2:3 4= 14>5d@3:f:1:2.5@9:f:1.5:3 4=@.3:f:1:2.5 10>3b@3:f:1.2:3 6>46@2:f:1:2.5 7>30@2:f:1:3 8= 7>44@3:f:1:2.5 8>30@2:f:1:3'
const WIND = env('WIND', '4= 10>30@4:f:1:2.5 10>10@2:f:1.2:3 4= 14>50@3:f:1:2.5@9:f:1.5:3 4=@.3:f:1:2.5 10>30@3:f:1.2:3 6>40@2:f:1:2.5 7>10@2:f:1:3 8= 7>40@3:f:1:2.5 8>10@2:f:1:3');
const lastTarget = parseInt([...WIND.matchAll(/>([0-9a-f]+)/gi)].at(-1)?.[1] ?? '70', 16);
const WSTART = process.env.WSTART ? hexv('WSTART') : Math.round(WMID + (lastTarget - 0x80) * WDEPTH);
// NOISE: the noise's pitch, `start  t:note/secs ...` -- at t seconds into the WIND loop, glide to note
// over secs. Higher = finer hiss. The last glide must return to the start.
// (Takes 1 and 2 never glided: a GoatTracker pattern command lasts ONE row -- an empty row is command 0,
// which ends a portamento -- so each glide moved a tenth of a second's worth and stopped. The glide now
// runs from the WAVETABLE, a toneportamento step that jumps to itself every frame: see glideWave.)
// (an octave up from take 1's 'B4 18:F#4/9 47:D5/12 70:A4/15 92:B4/8': brighter, less rumble)
const NOISE = env('NOISE', 'B4');
// the room tone, voice 2, at ROOMSUS -- the user: "really what we want is a 60hz hum": HUMHZ, held. 60 Hz
// falls between A#1 (58.3) and B1 (61.7), so the hum strikes the note below and, once, a portamento step
// adds the difference in SID frequency units (on the NTSC clock the game plays at; ~0.1% sharp on PAL).
// HUMWAVE=tri (default: nearly a pure tone) or pulse at HUMPW ($028 ~ 1%: "a pulse at like 1% or 99% to
// thin it way out" -- the two are the same sound, one the other inverted; a narrow pulse has every
// harmonic at nearly equal strength, a buzz, the electrical hum rather than the felt one)
// (ROOM=0 for now: "lose the triangle buzz ... we'll add it back after we get the air sounds worked out")
// (back for take 7, with the wind at sustain 2: "bring back the 60-cycle hum (it doesn't have to be exactly
// 60 btw, closest note is fine)" -- HUMEXACT=1 adds the nudge to 60.0)
const ROOM = env('ROOM', '1') === '1', ROOMSUS = hexv('ROOMSUS', '4');
const HUMHZ = +env('HUMHZ', 60), HUMWAVE = env('HUMWAVE', 'tri'), HUMPW = hexv('HUMPW', '028');

// ---- GoatTracker's encodings (as song-fc.mjs) ----
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const ALIAS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const idx = s => { const m = /^([A-G][b#]?)(\d)$/.exec(s); if (!m) throw new Error(`note ${s}`); const k = ALIAS[m[1]] ?? m[1]; return 12 * +m[2] + NOTE[k]; };
const n = s => 0x60 + idx(s);
const REST = 0xbd, CMD_TONEPORTA = 0x3, CMD_WAVEPTR = 0x8, CMD_FILTPTR = 0xa, CMD_FILTCTRL = 0xb, CMD_TEMPO = 0xf;
// the SID frequency of a note (GoatTracker's default PAL table, A4 = 440): only the glides' speeds use it,
// and the build's retuning (-G) moves every note by the same ratio, so a glide's length barely changes
const freq = k => Math.round(440 * 2 ** ((k - 57) / 12) * 16777216 / 985248);

// ---- tables (1-based rows) ----
const T = { wave: [], pulse: [], filt: [], speed: [] };
const add = (t, rows) => { const at = T[t].length + 1; T[t].push(...rows); return at; };
const shared = {};
const addOnce = (t, rows) => shared[t + JSON.stringify(rows)] ??= add(t, rows);
// the silent attack: gate only ($E1), QUIET seconds of 15-frame delays, then the waveform + gate
const silentWave = wave => { const d = Math.round(QUIET * 60), rows = [[0xe1, 0x00]];
  for (let left = d; left > 0; left -= 15) rows.push([Math.min(15, left), 0x00]);
  return add('wave', [...rows, [wave, 0x00], [0xff, 0x00]]); };
// the hum: the note just below HUMHZ, then one portamento-up step of the difference (a 16-bit speed)
const NTSC_HZ = 1022727, humK = Math.floor(57 + 12 * Math.log2(HUMHZ / 440));
const humNote = `${Object.keys(NOTE)[humK % 12]}${Math.floor(humK / 12)}`;
const humUp = Math.round((HUMHZ - 440 * 2 ** ((humK - 57) / 12)) * 16777216 / NTSC_HZ);
const WIND_WP = silentWave(0x81);
const ROOM_WP = ROOM ? silentWave(HUMWAVE === 'pulse' ? 0x41 : 0x11) : 0;
if (ROOM && humUp && env('HUMEXACT', '0') === '1') { T.wave.splice(-1, 0, [0xf1, add('speed', [[humUp >> 8, humUp & 0xff]])]); }
const ROOM_PP = ROOM && HUMWAVE === 'pulse' ? add('pulse', [[0x80 | HUMPW >> 8, HUMPW & 0xff], [0xff, 0x00]]) : 0;
// a glide: a toneportamento step at that speed, jumping to itself -- every frame, toward the voice's note,
// until the next 8xx points the wavetable elsewhere (a pattern's 3xx would end on the next empty row)
const glideWave = sp => shared[`glide${sp}`] ??= add('wave', [[0xf3, sp], [0xff, T.wave.length + 1]]);
// the wind's first filter program: type + resonance + voice 1 only, the starting cutoff, stop
const START_FP = add('filt', [[WTYPE, WRES << 4 | 0x01], [0x00, WSTART], [0xff, 0x00]]);
// a ramp: v units a step, one step every h ticks, looping (a 1-tick step can't be followed by a 0-tick
// hold: a modulation step's time 0 is "set cutoff", so h = 1 is one long step that jumps to itself)
// res: set the resonance first (the filter-parameter step, a frame of its own), the loop jumping back past it
const param = res => [WTYPE, res << 4 | 0x01];
const ramp = (v, h, res) => { const key = `ramp${v},${h},${res}`;
  if (shared[key]) return shared[key];
  const pre = res === undefined ? [] : [param(res)], at = T.filt.length + 1 + pre.length;
  add('filt', pre);
  return shared[key] = (h === 1 ? add('filt', [[0x7f, v & 0xff], [0xff, at]]) : add('filt', [[0x01, v & 0xff], [h - 1, 0x00], [0xff, at]])) - pre.length; };
// a hold that sets the resonance (then stops: the cutoff stays)
const holdRes = res => addOnce('filt', [param(res), [0xff, 0x00]]);
const setCut = (c, res) => addOnce('filt', [param(res), [0x00, c], [0xff, 0x00]]);
// a glide's speed, ticks from one note to another (toneportamento's 16-bit step a tick, at least 1)
const speedFor = (from, to, secs) => { const v = Math.max(1, Math.round(Math.abs(freq(idx(to)) - freq(idx(from))) / (secs * 60)));
  return addOnce('speed', [[v >> 8, v & 0xff]]); };

// ---- gplay.c's filter execution, to know where each program really leaves the cutoff ----
const simFilter = (cut, ptr, ticks, trace) => {
  let time = 0;
  for (let t = 0; t < ticks; t++) {
    if (ptr) {
      if (T.filt[ptr - 1][0] === 0xff) ptr = T.filt[ptr - 1][1];
      if (ptr && !time) {
        const [l, r] = T.filt[ptr - 1];
        if (l >= 0x80) { ptr++; if (T.filt[ptr - 1][0] === 0x00) { cut = T.filt[ptr - 1][1]; ptr++; } }
        else if (l) time = l;
        else { cut = r; ptr++; }
      }
      if (ptr && time) { cut += T.filt[ptr - 1][1] << 24 >> 24; if (--time === 0) ptr++; }
      if (ptr && T.filt[ptr - 1]?.[0] === 0xff && !T.filt[ptr - 1][1]) ptr = 0;
    }
    if (cut < 0 || cut > 0xff) throw new Error(`the cutoff left 00..ff (${cut}): a WIND sweep runs past its row`);
    trace?.push(cut);
  }
  return cut; };

// ---- the wind: moves -> filter events on rows ----
// each move becomes [row, filter pointer]; the cutoff is simulated from row to row
const windEvents = (moves, cut, trace) => {
  const ev = []; let row = 0, res = WRES;
  const go = (ptr, rows) => { ev.push([row, ptr]); cut = simFilter(cut, ptr, rows * TEMPO_T, trace); row += rows; };
  const rowsOf = s => Math.max(1, Math.round(s / ROW_S));
  // to `to` over secs, the resonance arriving at `toRes` -- in one step a level, each its own event
  const sweep = (to, secs, toRes = res) => {
    const steps = Math.max(1, Math.min(Math.abs(toRes - res), rowsOf(secs))), from = cut, fromRes = res;
    for (let k = 1; k <= steps; k++) {
      const tk = Math.round(from + (to - from) * k / steps), sk = secs / steps, rk = Math.round(fromRes + (toRes - fromRes) * k / steps);
      const nr = rk !== res ? rk : undefined; res = rk;
      const d = tk - cut;
      if (!d) { go(nr === undefined ? 0 : holdRes(nr), rowsOf(sk)); continue; }
      // whole units a tick when that is fast enough, else one unit every h ticks
      const ticks = Math.max(1, Math.round(sk * 60)), v = Math.max(1, Math.round(Math.abs(d) / ticks)), h = Math.max(1, Math.round(ticks * v / Math.abs(d)));
      go(ramp(Math.sign(d) * v, h, nr), rowsOf((Math.abs(d) / v * h + (nr === undefined ? 0 : 1)) / 60));
    } };
  // a sweep or hold with resonance gusts riding on it (`@t:peak:up:down` -- t seconds in, up to peak in up
  // seconds, back in down). The resonance moves by pattern command Bxy (filter control: resonance + voice
  // mask), which leaves the running filter program alone -- re-pointing the program with a resonance step
  // (as g: does) restarts the ramp's hold every level and knocked a gusty sweep seconds off its plan
  const layered = (to, secs, gusts) => {
    const r0 = row, base = res;
    if (to === null) go(0, rowsOf(secs)); else sweep(to, secs);
    const at = new Map();
    for (const g of gusts.split('@').filter(Boolean)) {
      const [t0, pk, up, dn] = g.split(':'), peak = parseInt(pk, 16), n1 = Math.abs(peak - base), sg = Math.sign(peak - base);
      if (+t0 + +up + +dn > secs + 0.05) throw new Error(`WIND: gust @${g} runs past its ${secs} s`);
      for (let k = 1; k <= n1; k++) {
        at.set(Math.round((+t0 + +up * k / n1) / ROW_S), base + sg * k);
        at.set(Math.round((+t0 + +up + +dn * k / n1) / ROW_S), peak - sg * k); } }
    for (const [r, v] of at) ev.push([r0 + r, null, CMD_FILTCTRL, v << 4 | 0x01]); };
  for (const m of moves.split(' ').filter(Boolean)) {
    let r;
    if ((r = /^([\d.]+)(?:>([0-9a-f]+)|=)((?:@[\d.]+:[0-9a-f]:[\d.]+:[\d.]+)+)$/i.exec(m))) layered(r[2] ? parseInt(r[2], 16) : null, +r[1], r[3]);
    else if ((r = /^([\d.]+)>([0-9a-f]+)$/i.exec(m))) sweep(parseInt(r[2], 16), +r[1]);
    else if ((r = /^([\d.]+)=$/.exec(m))) go(0, rowsOf(+r[1]));
    else if ((r = /^g:([0-9a-f]+):([\d.]+):([\d.]+)(?::([0-9a-f]))?$/i.exec(m))) { const base = cut, baseRes = res, peak = r[4] ? parseInt(r[4], 16) : res;
      sweep(base + parseInt(r[1], 16), +r[2], peak); sweep(base, +r[3], baseRes); }
    else throw new Error(`WIND: ${m}`);
  }
  if (res !== WRES) throw new Error(`WIND: the resonance ends at ${res}, not WRES`);
  return { ev, rows: row, cut }; };

// WDEPTH: scale every target about WMID, every gust's size and swell
const scaleMoves = moves => moves.split(' ').filter(Boolean).map(m => {
  let r;
  const hx = v => Math.max(0, Math.min(0xff, Math.round(v))).toString(16);
  // (a move with gusts too: `10>4e@...` -- the gusts move the resonance, not the cutoff, so they stay)
  if ((r = /^([\d.]+)>([0-9a-f]+)((?:@[\d.:a-f]+)*)$/i.exec(m))) return `${r[1]}>${hx(WMID + (parseInt(r[2], 16) - 0x80) * WDEPTH)}${r[3]}`;
  if ((r = /^g:([0-9a-f]+):([\d.]+):([\d.]+)(?::([0-9a-f]))?$/i.exec(m)))
    return `g:${hx(parseInt(r[1], 16) * WDEPTH)}:${r[2]}:${r[3]}` + (r[4] ? `:${Math.round(WRES + (parseInt(r[4], 16) - WRES) * RDEPTH).toString(16)}` : '');
  return m; }).join(' ');
const qRows = Math.max(1, Math.round(QUIET / ROW_S));
const introTrace = [], loopTrace = [];
const intro = windEvents(scaleMoves(WINTRO), WSTART, introTrace);
// (with no WINTRO the loop must still end on the cutoff it starts at)
const loop = windEvents(scaleMoves(WIND), intro.cut, loopTrace);
// the loop's last word: back exactly to where it began (a row or so of rounding is at most a unit or two)
if (Math.abs(loop.cut - intro.cut) > 2) throw new Error(`WIND ends at $${loop.cut.toString(16)}, not WINTRO's $${intro.cut.toString(16)}`);
loop.ev.push([loop.rows - 1, setCut(intro.cut, WRES)]);

// the noise's glides, placed on the loop's rows (moved later past a row that has a filter event)
// NDEPTH scales each glide's interval from the start note
const noteName = k => `${Object.keys(NOTE)[k % 12]}${Math.floor(k / 12)}`;
const [noiseStart, ...glides] = NOISE.split(' ').filter(Boolean);
if (!NDEPTH) glides.length = 0;              // a steady pitch: no glide rows at all
glides.forEach((g, k) => glides[k] = g.replace(/:([A-G][b#]?\d)\//, (_, to) => `:${noteName(idx(noiseStart) + Math.round((idx(to) - idx(noiseStart)) * NDEPTH))}/`));
if (glides.length && glides.at(-1).split(':')[1].split('/')[0] !== noiseStart) throw new Error(`NOISE must glide back to ${noiseStart}`);

// ---- the patterns ----
const P = [];
const MAXROWS = 120;
const pat = rows => { const key = JSON.stringify(rows), had = P.findIndex(p => JSON.stringify(p.slice(0, -1)) === key);
  if (had >= 0) return had;
  P.push([...rows, [0xff, 0, 0, 0]]); return P.length - 1; };
// a voice's timeline (row -> [note, instr, cmd, data]) cut into patterns of at most MAXROWS rows
const toPats = (len, events) => { const r = [...Array(len)].map(() => [REST, 0, 0, 0]);
  for (const [row, e] of events) { let at = row;
    while (r[at][2] || r[at][0] !== REST) if (++at >= len) throw new Error(`no free row after ${row}`);
    r[at] = e; }
  const out = []; for (let k = 0; k < len; k += MAXROWS) out.push(pat(r.slice(k, k + MAXROWS)));
  return out; };

const INSTR = [
  { name: 'Wind', ad: WAD, sr: WSR, wp: WIND_WP, pp: 0, fp: START_FP, gt: 0x02, fw: 0x09 },
  { name: 'Hum', ad: WAD, sr: ROOMSUS << 4 | 0xa, wp: ROOM_WP, pp: ROOM_PP, fp: 0, gt: 0x02, fw: 0x09 }];

// voice 1: the intro (the strike, the silent attack, the fade-in), then the loop
let pitch = noiseStart;
const v1Intro = toPats(qRows + intro.rows, [[0, [n(noiseStart), 1, CMD_TEMPO, TEMPO_T]],
  ...intro.ev.map(([r, p, c, d]) => [qRows + r, [REST, 0, c ?? CMD_FILTPTR, c ? d : p]])]);
const v1Loop = toPats(loop.rows, [...loop.ev.map(([r, p, c, d]) => [r, [REST, 0, c ?? CMD_FILTPTR, c ? d : p]]),
  ...glides.map(g => { const [, t, to, secs] = /^([\d.]+):([A-G][b#]?\d)\/([\d.]+)$/.exec(g) ?? [];
    if (!to) throw new Error(`NOISE: ${g}`);
    // the wavetable's glide at this speed first, then the new target note (3xx: no re-strike)
    const sp = speedFor(pitch, to, +secs), at = Math.round(+t / ROW_S); pitch = to;
    return [[at, [REST, 0, CMD_WAVEPTR, glideWave(sp)]], [at + 1, [n(to), 0, CMD_TONEPORTA, sp]]]; }).flat()]);
// voice 2: the hum, struck once and held (the loop is one empty pattern)
const v2Intro = toPats(qRows, ROOM ? [[0, [n(humNote), 2, 0, 0]]] : []);
const v2Loop = [pat([...Array(MAXROWS)].map(() => [REST, 0, 0, 0]))];
const silent = pat([...Array(MAXROWS)].map(() => [REST, 0, 0, 0]));
const ORDER = [[...v1Intro, ...v1Loop], [...v2Intro, ...v2Loop], [silent]];
const RESTART = [v1Intro.length, v2Intro.length, 0];

// ---- the .sng (GoatTracker 2 "GTS5") ----
const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('Hub', 32); str('', 32); str('', 32);
b.push(1);
ORDER.forEach((o, v) => b.push(o.length + 1, ...o, 0xff, RESTART[v]));
b.push(INSTR.length);
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp, i.pp, i.fp, 0, 0, i.gt, i.fw); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1]));
b.push(P.length);
for (const p of P) { b.push(p.length); for (const row of p) b.push(...row); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(b));

// the report: the loop's cutoff, one column a second
const lo = Math.min(...loopTrace), hi = Math.max(...loopTrace), H = 8, W = Math.ceil(loopTrace.length / 60);
const col = s => Math.max(...loopTrace.slice(s * 60, s * 60 + 60));
const plot = [...Array(H)].map((_, y) => [...Array(W)].map((_, s) => Math.round((col(s) - lo) / Math.max(1, hi - lo) * (H - 1)) >= H - 1 - y ? '#' : ' ').join(''));
console.log(`${OUT}: ${b.length} bytes; ${(QUIET + intro.rows * ROW_S).toFixed(1)} s intro, then a ${(loop.rows * ROW_S).toFixed(1)} s wind loop` +
  (ROOM ? `, a ~${HUMHZ} Hz ${HUMWAVE} hum (${humNote}${env("HUMEXACT", "0") === "1" ? ` + ${humUp}` : ""})` : '') + `; cutoff $${lo.toString(16)}..$${hi.toString(16)}`);
console.log(plot.map(l => '  |' + l).join('\n') + `\n  +${'-'.repeat(W)} (s)`);
