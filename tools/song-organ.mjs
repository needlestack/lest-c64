// song-organ.mjs -- a soft flute-stop organ piece, written as a GoatTracker 2 song (.sng).
//
//   node tools/song-organ.mjs [out.sng]        (default music/organ.sng)
//
// The user (2026-10-27), for level 3: "a soft pipe-organ like motif, it should be in a different key than
// level 2 so when you get there it feels like something has changed. i'm thinking of the flutey
// higher-register parts of toccata and fugue, but I definitely don't want it to sound like it's actually
// that (hello gyruss!)".
// Level 2 sits in A minor (the A drone, the data voice's A/C/E), so this is C MINOR, a minor third up.
// Not the fugue's pedal-point figure (a held note alternating with a falling line IS BWV 565's subject):
// a SICILIANO instead -- 6/8, the lilting dotted-eighth / sixteenth / eighth -- the pastoral side of
// baroque organ writing rather than the dramatic one. A row is a 16th, a bar 12 rows.
//
// Voices: 1 the flute, 2 the pedal (a soft low triangle). Voice 3 is left empty for the sound effects.
// The phrase plays twice: as written, then on the ECHO manual, as organ music answers itself.
// Take 2 (the user: "musically this is fine -- the sounds themselves are too electronic though. softer
// attacks? more legato playing? variation in tone ... the higher notes brought down an octave ... how it
// would sound much slower"):
// - LEGATO: gate timer $42 (no hard restart, no gate-off), so within a phrase a new note only changes the
//   pitch, the way a held organ key hands over to the next; a `-` in MELODY/PEDAL is a breath (key-off),
//   and the next note attacks again. Attacks are slower (AD 88: ~0.1 s up, a short settle).
// - TONE THAT MOVES: the flute is a PULSE whose width sweeps slowly ($300-$800: thin-reedy to hollow)
//   through a low-pass that opens and closes over the phrase (the organ's swell box), restarted by each
//   phrase's first note. The echo is a different stop: a soft unfiltered triangle.
// - An octave down (the melody in octave 4), the echo at the same pitch (ECHOUP 0).
// Take 1 was TEMPOT=8 with the triangle flute, octave 5, and the echo +12 (music/organ-v1.sng).
// Take 3 ("i like the triangle sound better than the pulse ... we can create movement with filter and
// resonance. 2/3 speed is about right ... if we have room to do an echo on the melody line"):
// - the flute is a triangle again (FLUTEWAVE=pulse: take 2's), through the swell box, whose RESONANCE
//   now rises with the cutoff and falls back with it (FRESLO..FRESHI);
// - TEMPOT 12 (take 2 at 8 is music/organ-v2.sng; organ-slow.sng was this speed);
// - DELAY: voice 3 plays the melody DELAYROWS 16ths late, softer (DELAYSUS) -- an echo. Voice 3 is also
//   where the sound effects play: an effect takes the channel over while it sounds, and the echo, the
//   most expendable line, comes back on its next note. DELAY=0 leaves voice 3 to the effects alone.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const OUT = process.argv[2] ?? 'music/organ.sng';
const env = (k, d) => process.env[k] ?? d;
const hexv = (k, d) => parseInt(env(k, d), 16);

// 8 frames a 16th: a dotted quarter (the 6/8 beat) is 48 frames, 75 to the minute
const TEMPO_T = +env('TEMPOT', 12);    // 12: a dotted quarter is 72 frames, 50 to the minute
// MELODY: one bar per `|`, each `note:rows` (rows of 16ths; 3 = a dotted eighth, 1 a sixteenth, 2 an
// eighth, 6 a dotted quarter). `-` for a rest. Every bar must add up to 12.
const MELODY = env('MELODY',
  'G4:3 G#4:1 G4:2 D#4:3 F4:1 D4:2 | C4:3 D4:1 D#4:2 G#4:6 | G#4:3 A#4:1 G#4:2 F4:3 G4:1 D#4:2 | D4:3 D#4:1 F4:2 B3:5 -:1 | ' +
  'D#4:3 F4:1 G4:2 C5:3 A#4:1 G#4:2 | G4:3 F4:1 D#4:2 F4:3 D#4:1 D4:2 | D#4:3 D4:1 C4:2 D4:3 B3:3 | C4:11 -:1');
// PEDAL: the bass, the same way (dotted quarters, mostly)
const PEDAL = env('PEDAL',
  'C3:6 A#2:6 | G#2:6 F2:6 | F2:6 G#2:6 | G2:11 -:1 | C3:6 D#3:6 | G#2:6 A#2:6 | G2:12 | C3:11 -:1');
// ECHO=1: the phrase a second time, the melody +ECHOUP semitones on the softer echo stop
const ECHO = env('ECHO', '1') === '1', ECHOUP = +env('ECHOUP', 0);
// the stops: sustain is the volume (an attack still peaks at full and settles to it -- slowly enough here
// to read as the pipe speaking). The flute's level goes INTO the filter, so it stays moderate: the 6581's
// filter saturates on a hot input, and this wants to be soft.
const FLUTE_SUS = hexv('FLUTESUS', 'a'), ECHO_SUS = hexv('ECHOSUS', '8'), PEDAL_SUS = hexv('PEDALSUS', 'a');
const AD = hexv('AD', '88'), ECHO_AD = hexv('ECHOAD', '99'), REL = hexv('REL', '6');
// the flute's wave (FLUTEWAVE=pulse: take 2's, with its width sweep) and swell box
const FLUTE_PULSE = env('FLUTEWAVE', 'tri') === 'pulse';
const PWLO = hexv('PWLO', '300'), PWHI = hexv('PWHI', '800'), PWSPD = +env('PWSPD', 4);
const CUTLO = hexv('CUTLO', '58'), CUTHI = hexv('CUTHI', '98'), FRESLO = hexv('FRESLO', '3'), FRESHI = hexv('FRESHI', '9');
// the echo on voice 3
const DELAY = env('DELAY', '1') === '1', DELAY_ROWS = +env('DELAYROWS', 2), DELAY_SUS = hexv('DELAYSUS', '5');
const SWELL_HOLD = +env('SWELLHOLD', 8);    // ticks per 2-unit step of the swell: $30 up in ~3 s, and back
// the tremulant: vibrato after TREMDELAY ticks, TREMSPEED ticks each way, depth a 2^TREMSHIFT-th of the
// note's semitone a tick (note-relative, so it is the same width in every octave). 3/5 = ~5 Hz, ~9 cents.
const TREMDELAY = hexv('TREMDELAY', '10'), TREMSPEED = +env('TREMSPEED', 3), TREMSHIFT = +env('TREMSHIFT', 5);
// CHIFF=1: the pipe's breathy onset -- one frame of high noise before the triangle (off by default: at
// full envelope it may read as a click rather than air)
const CHIFF = env('CHIFF', '0') === '1';

// ---- GoatTracker's encodings (as song-hub.mjs) ----
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const ALIAS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const n = s => { const m = /^([A-G][b#]?)(\d)$/.exec(s); if (!m) throw new Error(`note ${s}`); return 0x60 + 12 * +m[2] + NOTE[ALIAS[m[1]] ?? m[1]]; };
const REST = 0xbd, KEYOFF = 0xbe, CMD_TEMPO = 0xf;

// ---- tables ----
const T = { wave: [], pulse: [], filt: [], speed: [] };
const add = (t, rows) => { const at = T[t].length + 1; T[t].push(...rows); return at; };
const PUL = add('wave', CHIFF ? [[0x81, 0x30], [0x41, 0x00], [0xff, 0x00]] : [[0x41, 0x00], [0xff, 0x00]]);
const TRI = add('wave', [[0x11, 0x00], [0xff, 0x00]]);
const TREM = add('speed', [[0x80 | TREMSPEED, TREMSHIFT]]);       // $80: depth relative to the note
// up and back in modulation steps of at most 127 ticks, looping (as song-fc's sweep)
const sweep = dir => { const st = []; for (let t = Math.round((PWHI - PWLO) / PWSPD); t > 0; t -= 127) st.push([Math.min(127, t), dir * PWSPD & 0xff]); return st; };
const FPP = FLUTE_PULSE ? add('pulse', [[0x80 | PWLO >> 8, PWLO & 0xff], ...sweep(1), ...sweep(-1), [0xff, T.pulse.length + 2]]) : 0;
// the swell box: low-pass, voice 1 only, CUTLO up to CUTHI and back in 2-unit steps, looping; the
// resonance climbs FRESLO -> FRESHI on the way up and back down with it, a level a segment (a resonance
// row is a filter-parameter step: a frame of its own, the cutoff holding)
const pairs = (CUTHI - CUTLO) / 2, nRes = FRESHI - FRESLO + 1;
if (pairs !== Math.floor(pairs)) throw new Error('CUTHI - CUTLO must be even');
const swell = (v, resAt) => [...Array(pairs)].flatMap((_, k) => {
  const seg = Math.floor(k * nRes / pairs), first = Math.floor(seg * pairs / nRes) === k;
  return [...first ? [[0x90, resAt(seg) << 4 | 0x01]] : [], [0x01, v & 0xff], [SWELL_HOLD - 1, 0x00]]; });
const FFP = add('filt', [[0x90, FRESLO << 4 | 0x01], [0x00, CUTLO],
  ...swell(2, g => FRESLO + g), ...swell(-2, g => FRESHI - g), [0xff, T.filt.length + 3]]);
// the echo stop takes voice 1 OUT of the filter (routing 0) for as long as it plays
const EFP = add('filt', [[0x90, 0x00], [0xff, 0x00]]);
// gate timer $42 = legato (no hard restart, no gate-off); the first-frame wave must carry the gate or
// the note is silent. A phrase's first note is the START instrument, whose pulse/filter pointers restart
// the sweep and the swell; the rest leave them running (a nonzero pointer restarts its program).
const FW = FLUTE_PULSE ? PUL : TRI, FFW = FLUTE_PULSE ? 0x41 : 0x11;
const INSTR = [
  { name: 'Flute start', ad: AD, sr: FLUTE_SUS << 4 | REL, wp: FW, pp: FPP, fp: FFP, vib: TREM, vd: TREMDELAY, fw: FFW },
  { name: 'Flute', ad: AD, sr: FLUTE_SUS << 4 | REL, wp: FW, pp: 0, fp: 0, vib: TREM, vd: TREMDELAY, fw: FFW },
  { name: 'Echo start', ad: ECHO_AD, sr: ECHO_SUS << 4 | REL, wp: TRI, pp: 0, fp: EFP, vib: TREM, vd: TREMDELAY, fw: 0x11 },
  { name: 'Echo', ad: ECHO_AD, sr: ECHO_SUS << 4 | REL, wp: TRI, pp: 0, fp: 0, vib: TREM, vd: TREMDELAY, fw: 0x11 },
  { name: 'Pedal', ad: AD, sr: PEDAL_SUS << 4 | 0x8, wp: TRI, pp: 0, fp: 0, vib: 0, vd: 0, fw: 0x11 },
  // the echo: no filter pointer, so the swell box's program runs on (it routes voice 1 only)
  { name: 'Delay', ad: AD, sr: DELAY_SUS << 4 | REL, wp: TRI, pp: 0, fp: 0, vib: TREM, vd: TREMDELAY, fw: 0x11 }];

// ---- the patterns: one per bar per voice, identical bars shared ----
const P = [];
const pat = rows => { const key = JSON.stringify(rows), had = P.findIndex(p => JSON.stringify(p.slice(0, -1)) === key);
  if (had >= 0) return had;
  P.push([...rows, [0xff, 0, 0, 0]]); return P.length - 1; };
const bars = s => s.split('|').map(b => b.trim().split(/\s+/).map(t => { const [nm, r] = t.split(':'); return [nm, +r]; }));
// a section's rows, bar after bar; ins = [start, legato]: the start instrument at the head of the
// section and after a breath (`-`, a key-off); `up` transposes
const lineRows = (bs, ins, up) => {
  const rows = [];
  let fresh = true;
  for (const bar of bs) {
    const r = [...Array(12)].map(() => [REST, 0, 0, 0]);
    let at = 0;
    for (const [nm, len] of bar) {
      if (nm !== '-') { r[at] = [n(nm) + up, fresh ? ins[0] : ins[1], 0, 0]; fresh = false; }
      else { r[at] = [KEYOFF, 0, 0, 0]; fresh = true; }
      at += len; }
    if (at !== 12) throw new Error(`a bar adds up to ${at} rows, not 12: ${bar.map(x => x.join(':')).join(' ')}`);
    rows.push(...r); }
  return rows; };
const mel = bars(MELODY), ped = bars(PEDAL);
if (mel.length !== ped.length) throw new Error(`MELODY has ${mel.length} bars, PEDAL ${ped.length}`);
const r1 = [...lineRows(mel, [1, 2], 0), ...(ECHO ? lineRows(mel, [3, 4], ECHOUP) : [])];
const r2 = [...lineRows(ped, [5, 5], 0), ...(ECHO ? lineRows(ped, [5, 5], 0) : [])];
// the echo: voice 1 DELAY_ROWS later, wrapping round the loop (its last notes sound at the top of the
// next pass), every note on the Delay instrument -- legato like the line, so the first note after each
// breath (start, instrument 1 or 3) is where its gate rises again
const r3 = DELAY ? r1.map((_, i) => { const [nt, ins] = r1[(i - DELAY_ROWS + r1.length) % r1.length];
  return [nt, ins ? 6 : 0, 0, 0]; }) : null;
r1[0] = [r1[0][0], r1[0][1], CMD_TEMPO, TEMPO_T];
const toPats = rows => [...Array(rows.length / 12)].map((_, k) => pat(rows.slice(12 * k, 12 * k + 12)));
const v1 = toPats(r1), v2 = toPats(r2);
const silent = pat([...Array(12)].map(() => [REST, 0, 0, 0]));
const ORDER = [v1, v2, DELAY ? toPats(r3) : [silent]];

// ---- the .sng (GoatTracker 2 "GTS5") ----
const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('Organ', 32); str('', 32); str('', 32);
b.push(1);
for (const o of ORDER) b.push(o.length + 1, ...o, 0xff, 0);
b.push(INSTR.length);
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp, i.pp, i.fp, i.vib, i.vd, 0x42, i.fw); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1]));
b.push(P.length);
for (const p of P) { b.push(p.length); for (const row of p) b.push(...row); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(b));
const secs = v1.length * 12 * TEMPO_T / 60;
console.log(`${OUT}: ${b.length} bytes; ${mel.length} bars of 6/8${ECHO ? ` twice (the echo ${ECHOUP ? `+${ECHOUP}` : 'at the same pitch'})` : ''}, ${secs.toFixed(1)} s a loop`);
