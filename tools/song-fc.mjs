// song-fc.mjs -- "F C": a quarter-note ostinato against a pedal C (2026-10-25, the user's sketch).
//
//   node tools/song-fc.mjs [out.sng]        (default music/fc.sng)
//
// The user's spec, as given:
//   tempo 100 bpm (or close), quarter note repeating pattern: F C Bb C Ab C G C -- start with a
//   triangle wave, legato.
// Eight quarters = two bars of 4/4, looping. A row is a 16th, so a quarter is 4 rows and the loop one
// 32-row pattern. Tempo 9 ticks a row: a quarter = 36 frames = 0.6 s = exactly 100 BPM at 60 Hz.
// What the sketch leaves open is a default here, each overridable: the octaves, the envelope.
// Not a bass line: "a mid-register ... more of a pipe organ pattern -- the F is the lowest note and all
// other notes are higher, so descending from the C". So F3 at the bottom, C4 the pedal on top, and
// Bb3 Ab3 G3 falling from it toward the F (OCTS).
// Then: "double that speed, and an octave higher" -- eighths (STEP 2, a one-bar loop), F4 up to C5 --
// "double it or even triple it, giving it some overtones like an additive organ ... using the sustain
// volume trick so that the overtones are much softer than the primary": voices 2 and 3 play the same
// line transposed (HARM), each its own instrument whose SUSTAIN level is its volume (the SID has no
// per-voice volume; a held note sits at its sustain level, and the envelope's output is linear in it).
// The default is the drawbar organ's 8' 4' 2 2/3': the octave (+12) and the twelfth (+19, the 3rd
// harmonic), at sustain 7 and 4 against the fundamental's F -- roughly 1/2 and 1/4, softer than the
// 1/2 1/3 of a real harmonic series, as asked.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const OUT = process.argv[2] ?? 'music/fc.sng';
const env = (k, d) => process.env[k] ?? d;
const hexv = (k, d) => parseInt(env(k, d), 16);

const TEMPO_T = +env('TEMPOT', 9);                     // ticks a row (16th): 3600 / (9 * 4) = 100 BPM
const LINE = env('LINE', 'F C Bb C Ab C G C').split(' ');
const OCTS = env('OCTS', '4 5 4 5 4 5 4 5').split(' ').map(Number);   // GoatTracker octaves, one per note
const STEP = +env('STEP', 2);                          // rows a note: 2 = eighths (was 4, quarters)
// AD 10: a short swell rather than a click; SR F8: full sustain, a medium release (only the loop's
// very first note ever attacks -- see 'legato' below)
const AD = hexv('AD', '10'), SR = hexv('SR', 'f8');
// HARM: 'semitones:sustain' per extra voice (at most two: voices 2, 3); HARM='' = the triangle alone
const HARM = env('HARM', '12:7,19:4').split(',').filter(Boolean).map(h => h.split(':')).map(([st, sus]) => [+st, parseInt(sus, 16)]);
// PULSE=1: the one-voice answer to that -- "i wonder here if we're just using 3 voices to get a sound
// that a filtered pulse wave will get us with one". A pulse of width d has harmonic n at |sin(pi n d)| / n:
// at 25% ($400) the octave is 0.71 of the fundamental and the 3rd harmonic 0.33 (the 4th is missing),
// close to HARM's 1/2 and 1/4; the low-pass (PCUT, resonance PRES) then rolls off what is above.
// HARM is ignored; voices 2-3 are left free.
// Then: "this is fine, though a relatively shallow pulse sweep will give it some life. And then a second
// channel doing an echo?" -- PULSE is the default; the width sweeps PWLO..PWHI and back at PWSPD a tick
// (the default: $300-$500 around the 25%, ~4.3 s each way). ECHO=1: voice 2 plays the line ECHODELAY rows
// (16ths) late at sustain ECHOSUS, through the same filter (ECHOFILT=1). PULSE=0 = the triangle organ
// (music/fc-organ.sng).
const PULSE = env('PULSE', '1') === '1', PW = hexv('PW', '400'), PCUT = hexv('PCUT', '60'), PRES = hexv('PRES', '4');
if (PULSE) HARM.length = 0;
if (HARM.length > 2) throw new Error(`HARM: ${HARM.length} overtones, but only voices 2 and 3 are free`);

// ---- GoatTracker's encodings (as song-gbb.mjs) ----
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const ALIAS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const n = (nm, oct) => { const k = ALIAS[nm] ?? nm; if (!(k in NOTE)) throw new Error(`note ${nm}`); return 0x60 + 12 * oct + NOTE[k]; };
const REST = 0xbd, KEYOFF = 0xbe, CMD_TEMPO = 0xf;
if (OCTS.length !== LINE.length) throw new Error(`OCTS: ${OCTS.length} octaves for ${LINE.length} notes`);

// ---- tables (1-based rows) ----
const T = { wave: [], pulse: [], filt: [], speed: [] };
const add = (t, rows) => { const at = T[t].length + 1; T[t].push(...rows); return at; };
// triangle (or PULSE's pulse) + gate, and stay
const TRI = add('wave', [[PULSE ? 0x41 : 0x11, 0x00], [0xff, 0x00]]);
// PULSE: a fixed width, and a static low-pass on voice 1 ($90 = set type low-pass + resonance/routing)
const PWLO = hexv('PWLO', '300'), PWHI = hexv('PWHI', '500'), PWSPD = +env('PWSPD', 2);
const ECHO = PULSE && env('ECHO', '1') === '1', ECHO_DELAY = +env('ECHODELAY', 3), ECHO_SUS = hexv('ECHOSUS', '4');   // was 8: "too loud -- cut the volume in half again"
// "run the pattern twice alone, then twice with the echo": ECHOIN bars of the line alone, then the echo
// joins and the song loops from there (each voice's orderlist restarts on its own loop pattern)
const ECHO_IN = +env('ECHOIN', 0);   // was 2: "no point to the first bar where it's one voice ... start with two loops of that"
// KICK: voice 3, from bar KICKIN + 1, on the 16ths KICKSTEPS (1-based, the synth line's 16 units): "it's
// not triplets i realize, it's actual 1, 4, and 7" -- a 3+3 push into beat 2's second 16th.
// KICKT=12 is the triplet grid it was ("three beats in ... 8th note triplets", then "half that speed"):
// voice 3 runs its OWN tempo (F8C: $80 + 12, this channel only), a row a triplet 8th, a bar 12 of its rows
// (144 ticks, as the line's 16 x 9) -- KICKT=12 KICKSTEPS='1 2 3' = music/fc-kick8t.sng, '1 3 5' the
// quarter triplets. The sound is song-gbb's kick: one frame of noise, then a square diving E3 -> F#1.
const KICK = PULSE && env('KICK', '1') === '1', KICK_IN = +env('KICKIN', 2), KICK_T = +env('KICKT', TEMPO_T);
// KSND: the sound. 'tom' (default): "a longer sustain on the kick. more of a floor tom or timpani" -- the
// noise click, then a TRIANGLE (round, no buzz) dropping a few semitones in as many frames and settling ON
// a pitch, TOMNOTE (F2, the song's key: a timpani is tuned), at decay A (~1.5 s, cut by the next hit's
// hard restart; KAD=09 is ~0.75 s, the floor tom end). 'kick' = the dive to F#1 at decay 8 (music/fc-kick.sng).
// Then "deeper. and maybe more of a note sweep down?": it lands an octave lower, F1 (was F2, from C3 in 5
// frames), sweeping down TOMSWEEP semitones (12: from F2) at TOMRATE frames a semitone (2: ~0.4 s, about
// the 3 16ths between hits) -- KSND=tom TOMNOTE=F2 TOMSWEEP=5 TOMRATE=1 is close to the first tom, not exact.
const KSND = env('KSND', 'tom'), TOM_NOTE = env('TOMNOTE', 'F1'), TOM_SWEEP = +env('TOMSWEEP', 12), TOM_RATE = +env('TOMRATE', 2);
const KICK_ROWS = env('KICKSTEPS', '1 4 7').split(' ').map(x => x - 1), KICK_AD = hexv('KAD', KSND === 'tom' ? '0a' : '08');
const ECHO_FILT = env('ECHOFILT', '1') === '1';
// the sweep: set PWLO, then up and back in modulation steps (a step holds at most 127 ticks), looping
// to the first step; PWSPD=0 = the fixed PW
const sweep = (dir) => { const st = []; for (let t = Math.round((PWHI - PWLO) / PWSPD); t > 0; t -= 127) st.push([Math.min(127, t), dir * PWSPD & 0xff]); return st; };
// (the jump names an absolute row: the program's 2nd, the first up step)
const PP = !PULSE ? 0 : !PWSPD ? add('pulse', [[0x80 | PW >> 8, PW & 0xff], [0xff, 0x00]])
  : add('pulse', [[0x80 | PWLO >> 8, PWLO & 0xff], ...sweep(1), ...sweep(-1), [0xff, T.pulse.length + 2]]);
const FP = PULSE ? add('filt', [[0x90, PRES << 4 | (ECHO && ECHO_FILT ? 0x03 : 0x01)], [0x00, PCUT], [0xff, 0x00]]) : 0;

// Legato: gate timer bit $40 = no hard restart and no gateoff, so the gate goes up once, on the first
// note, and every later note only changes the pitch: no re-attack, no gap. The 1st frame wave must be
// $11 (triangle + gate), NOT the readme's legato $00: the player writes wave AND gate to the SID
// (gplay.c), and only a nonzero 1st frame wave raises the gate -- $00 left it down and the song silent.
// PULSE: an instrument with a pulse pointer RESTARTS the sweep on every note (gplay.c), so each voice
// strikes its first note with a 'start' instrument (the sweep, the filter) and the rest with a plain one
// (pointers 0: left running) -- and the loop restarts past those first strikes
const pulseI = (name, sr) => [{ name: `${name} start`, ad: AD, sr, wp: TRI, pp: PP, fp: FP, gt: 0x42, fw: 0x41 },
  { name, ad: AD, sr, wp: TRI, pp: 0, fp: 0, gt: 0x42, fw: 0x41 }];
const INSTR = PULSE ? [...pulseI('Pulse', SR), ...ECHO ? pulseI('Echo', ECHO_SUS << 4 | SR & 0x0f) : []] : [{ name: 'Tri legato', ad: AD, sr: SR, wp: TRI, pp: PP, fp: FP, gt: 0x42, fw: 0x11 },
  ...HARM.map(([st, sus]) => ({ name: `Tri +${st}`, ad: AD, sr: sus << 4 | SR & 0x0f, wp: TRI, pp: 0, fp: 0, gt: 0x42, fw: 0x11 }))];
// BASS: "a deep sweepy pulse wave F two octaves lower" (F2), on voice 2 from bar BASSIN + 1 -- it REPLACES
// the echo there (the user's pick of the three ways to find a 4th voice). Legato like the line, so a new
// bottom note slides in without a re-attack; its own pulse program sweeps wide and fast (BASSPWLO..HI at
// BASSPWSPD a tick: $180-$780, ~1.6 s each way) where the line's is shallow, and restarts on each new
// note. Through the same filter as the echo it replaces (voice 2's routing).
const BASS = PULSE && ECHO && env('BASS', '1') === '1', BASS_OCT = +env('BASSOCT', 2);
const BASS_AD = hexv('BASSAD', '40'), BASS_SR = hexv('BASSSR', 'c8');
const BPWLO = hexv('BASSPWLO', '180'), BPWHI = hexv('BASSPWHI', '780'), BPWSPD = +env('BASSPWSPD', 16);
const bsweep = dir => { const st = []; for (let t = Math.round((BPWHI - BPWLO) / BPWSPD); t > 0; t -= 127) st.push([Math.min(127, t), dir * BPWSPD & 0xff]); return st; };
// Its FIRST note must NOT be legato ('Bass start', gt $02: gateoff + hard restart): voice 2 is mid-echo,
// and a legato note keeps the echo's envelope -- the SID's envelope only DECAYS to a new sustain level,
// never rises to one, so the bass sat at the echo's sustain 4, under the filter: "bass is not audible".
// The later bottom notes ('Bass') stay legato.
const BPP = BASS ? add('pulse', [[0x80 | BPWLO >> 8, BPWLO & 0xff], ...bsweep(1), ...bsweep(-1), [0xff, T.pulse.length + 2]]) : 0;
if (BASS) INSTR.push({ name: 'Bass start', ad: BASS_AD, sr: BASS_SR, wp: TRI, fp: 0, gt: 0x02, fw: 0x41, pp: BPP },
  { name: 'Bass', ad: BASS_AD, sr: BASS_SR, wp: TRI, fp: 0, gt: 0x42, fw: 0x41, pp: BPP });
// BASSRUN: "6 1/16th notes before the F drops to E, it plays F G G# G F G and then E on the first beat ...
// to make that first F stand out it probably has to stop the long F drone a tiny bit before that first
// note of the run" -- semitones over the bottom note, so the run walks down with it (E: E F# G F# E F#).
// Its first note is 'Bass pick': gt $02 drops the gate 2 ticks early (the gap after the drone) and
// hard-restarts, attack 0 so it speaks at once (RUNAD: decay 6 back down to the sustain). The rest are
// 'Bass run', legato with NO pulse pointer, so the sweep runs on through the 16ths instead of restarting
// on each; the new bottom note ('Bass', legato) lands from the run without a re-attack.
// BASSRUNS: then "are we using the same shape for each run? ... try a few variations tonally and
// rhythmically" -- one run per change, '|' between them (cycling), each a 16th a token, ending on the
// bar line: a number = semitones over the bottom note (legato), '!' before it = a pick (the gap and a
// fresh attack; a run's first note always picks), '-' = hold, '.' = rest (a key-off; the next note picks).
// The defaults, the landing note being one under the bottom note (-1):
//   F->E    0 2 3 2 0 2                    the first run: F G G# G F G
//   E->Eb   0 12 - 10 7 5 3 1              an octave leap, then down the blues scale: E E' D B A G F
//   Eb->D   -12 -9 -7 -5 -3 -2             UP from the octave below: Eb1 F#1 G#1 A#1 C2 C#2, into D
//   D->Db   0 -2 -3 -2 0 -2                the first run upside down: D C B C D C, up into Db
//   Db->G1  0 -1 -2 -3 -4 -5               a fill straight down: Db C B Bb A Ab, onto G (a tritone under)
//   G1->C2  0 - 2 3 - 4                    and up: G . A Bb . B, onto C
// (Eb->D was '!0 . !0 . 5 3 0 -2', two stabs and a turn, and D->Db '!0 3 5 !0 3 5 !0 3 5 3 2 1', 3+3+3
// picks: "the other two are a bit too much ... one that comes up from lower notes?")
// BASSRUN (one run) gives every change the same: BASSRUN='0 2 3 2 0 2' = music/fc-run1.sng.
const RUNS = (process.env.BASSRUN ?? env('BASSRUNS', '0 2 3 2 0 2|0 12 - 10 7 5 3 1|-12 -9 -7 -5 -3 -2|0 -2 -3 -2 0 -2|0 -1 -2 -3 -4 -5|0 - 2 3 - 4'))
  .split('|').map(r => r.split(' ').filter(Boolean)).filter(r => r.length);
for (const r of RUNS) for (const t of r) if (!/^(!?-?\d+|-|\.)$/.test(t)) throw new Error(`BASSRUNS: '${t}' (a number, !number, - or .)`);
const RUN = RUNS[0] ?? [], RUN_AD = hexv('RUNAD', '06');
if (BASS && RUNS.length) INSTR.push({ name: 'Bass pick', ad: RUN_AD, sr: BASS_SR, wp: TRI, fp: 0, gt: 0x02, fw: 0x41, pp: 0 },
  { name: 'Bass run', ad: RUN_AD, sr: BASS_SR, wp: TRI, fp: 0, gt: 0x42, fw: 0x41, pp: 0 });
// the kick: absolute wavetable notes ($80 + note), so the pattern's note doesn't matter. Decay-only
// (sustain 0): the decay is the length. gt 02: a hard restart, every hit from silence
const an = (nm, oct) => 0x80 + n(nm, oct) - 0x60;
const tomAt = an(TOM_NOTE.slice(0, -1), +TOM_NOTE.slice(-1));
if (KICK && !['kick', 'tom'].includes(KSND)) throw new Error(`KSND ${KSND}: kick or tom`);
if (KICK) INSTR.push(KSND === 'kick' ? { name: 'kick', ad: KICK_AD, sr: 0x00, fp: 0, gt: 0x02, fw: 0x08,
  wp: add('wave', [[0x81, an('E', 4)], ...['E3', 'A#2', 'F2', 'C#2', 'A#1', 'G#1', 'F#1'].map(x => [0x41, an(x.slice(0, -1), +x.slice(-1))]), [0xff, 0x00]]),
  pp: add('pulse', [[0x88, 0x00], [0xff, 0x00]]) }
  : { name: 'tom', ad: KICK_AD, sr: 0x00, fp: 0, gt: 0x02, fw: 0x08, pp: 0,
    wp: add('wave', [[0x81, an('E', 4)], ...[...Array(TOM_SWEEP * TOM_RATE + 1).keys()].map(f => [0x11, tomAt + TOM_SWEEP - Math.floor(f / TOM_RATE)]), [0xff, 0x00]]) });
// DRUMS2: from the bass's entrance on, voice 3 changes sound and rhythm -- "the kick just sounds like a
// thin noise transient now that the bass drone is there ... a quick two beats on the first two 16ths
// with lower freq noise, then a longer sustaining snare/crash snap on the next 5th note of the synth
// pattern" (the 5th 8th: 16th 9, beat 3). DRUM2 is the bar a 16th a token: t thump, S snap, . nothing.
//   thump: noise only, LOW (the noise's pitch is its clock: C4 falling to C3 in 3 frames), decay THAD
//          (5: ~170 ms, so the second cuts the first) -- out of the drone's register, where the tom sat
//   snap:  song-gbb's snare shape -- a frame of bright noise (C7, the crack), two of square (F#3 C3, the
//          body's thwack) -- then a noise tail at SNTAIL (C6, between a snare and a crash) left to ring at
//          decay SNAD (A: ~1.5 s, about to the next bar's thumps)
// 'T': the tom with the LONG ring (TOM2LAD, A: ~1.5 s, the timpani's) -- "a longer note/decay like the
// earlier tom -- at least for the second one since it won't get cut off right away" (the snap cuts it 7
// 16ths on, ~1 s). With T2=thump, T is a thump.
const DRUM2 = env('DRUM2', 'tT......S.......'), TH_AD = hexv('THAD', '05'), SN_AD = hexv('SNAD', '0a'), SN_TAIL = env('SNTAIL', 'C6');
if (DRUM2.length !== LINE.length * STEP || /[^tTS.]/.test(DRUM2)) throw new Error(`DRUM2: ${LINE.length * STEP} 16ths of t T S .`);
const atNote = x => an(x.slice(0, -1), +x.slice(-1));
// T2: what DRUM2's 't' is. 'thump' (above), or 'tom' (default): "I wish it could have the body of the
// earlier drum, but somehow cut through a bit more ... that first floor tom sound ... but switch from
// triangle to pulse or saw?" -- the first tom (the click, then down from +5 onto TOM2NOTE, F2, in 5
// frames) at the floor tom's decay (TOM2AD 9, ~0.75 s), in T2WAVE: saw (default) or pulse (at T2PW, $400:
// 25%, brighter than a square). The triangle's partials are faint; both of these carry every harmonic,
// so the drum speaks above the drone that buried it.
// Then "i prefer the saw. can it be deepened just a bit, along with the pulse bump? Maybe sweep a bit
// further a bit faster?": it lands on D2 (was F2) from an octave up in 4 frames (TOM2SWEEP, was 5 3 2 1 0)
// Then (after DUCK, "just sounds like a dropout"): "less of a sweep and more of a note" -- a 3-semitone
// blip in 2 frames (was 12 5 1 0) and a longer ring (TOM2AD A, ~1.5 s, was 9), so the pitch registers.
// TOM2ROOT=1: the pitch follows the bass's bottom note, TOM2OCT octaves under it (TOM2NOTE ignored) --
// a fixed D2 rubs a semitone against the Eb and Db bars once it is heard as a note
// And back: "put the saw back to a larger sweep like we had before, but try filtering it" (TOM2FILT)
// Then "i hear the sustain, but it's not the same register and sweep as the tom": the bars-3-4 tom's own
// register and slide -- onto F1 (was D2), down TOM_SWEEP semitones at TOM_RATE frames each (12 at 2: the
// octave in ~0.4 s; was 12 5 1 0, 4 frames). TOM2SWEEP still overrides it with its own frame list.
const TOM2_SWEEP = process.env.TOM2SWEEP ? process.env.TOM2SWEEP.split(' ').map(Number)
  : [...Array(TOM_SWEEP * TOM_RATE + 1).keys()].map(f => TOM_SWEEP - Math.floor(f / TOM_RATE));
const TOM2_ROOT = env('TOM2ROOT', '0') === '1', TOM2_OCT = +env('TOM2OCT', 1);
const T2 = env('T2', 'tom'), T2WAVE = env('T2WAVE', 'tri'), TOM2_NOTE = env('TOM2NOTE', TOM_NOTE), TOM2_AD = hexv('TOM2AD', '09'), T2PW = hexv('T2PW', '400');
// T2WAVE=tri: the triangle again, for DUCK (below)
if (!['tom', 'thump'].includes(T2) || !['saw', 'pulse', 'tri'].includes(T2WAVE)) throw new Error(`T2 ${T2} (tom/thump), T2WAVE ${T2WAVE} (saw/pulse/tri)`);
// TOM2FILT=1: the tom through the low-pass with the line and the bass. The routing is ONE register for
// all three voices, so the tom's filter program routes voice 3 in ($x7) and the snap's routes it back out
// ($x3) -- the snap stays bright. Both re-set the same cutoff and resonance (static: re-applying is
// harmless). The bars-3-4 timpani never touch it, and the routing it sees is $x3: from the line's first
// note, and on the loop from the last snap.
const TOM2_FILT = BASS && KICK && T2 === 'tom' && env('TOM2FILT', '0') === '1';
const routeF = mask => add('filt', [[0x90, PRES << 4 | mask], [0x00, PCUT], [0xff, 0x00]]);
const TOM2_FP = TOM2_FILT ? routeF(0x07) : 0, SNAP_FP = TOM2_FILT ? routeF(0x03) : 0;
if (BASS && KICK && T2 === 'tom') INSTR.push({ name: 't', ad: TOM2_AD, sr: 0x00, fp: TOM2_FP, gt: 0x02, fw: 0x08,
  pp: T2WAVE === 'pulse' ? add('pulse', [[0x80 | T2PW >> 8, T2PW & 0xff], [0xff, 0x00]]) : 0,
  wp: add('wave', [[0x81, an('E', 4)], ...TOM2_SWEEP.map(d => [{ saw: 0x21, pulse: 0x41, tri: 0x11 }[T2WAVE], TOM2_ROOT ? d & 0x7f : atNote(TOM2_NOTE) + d]), [0xff, 0x00]]) });
if (BASS && KICK && T2 === 'tom' && DRUM2.includes('T')) INSTR.push({ ...INSTR.at(-1), name: 'T', ad: hexv('TOM2LAD', '0a') });
if (BASS && KICK) INSTR.push({ name: 'thump', ad: TH_AD, sr: 0x00, fp: 0, gt: 0x02, fw: 0x08, pp: 0,
    wp: add('wave', [...['C4', 'A3', 'F3', 'C3'].map(x => [0x81, atNote(x)]), [0xff, 0x00]]) },
  { name: 'snap', ad: SN_AD, sr: 0x00, fp: SNAP_FP, gt: 0x02, fw: 0x08, pp: add('pulse', [[0x88, 0x00], [0xff, 0x00]]),
    wp: add('wave', [[0x81, atNote('C7')], [0x41, atNote('F#3')], [0x41, atNote('C3')], [0x81, atNote(SN_TAIL)], [0xff, 0x00]]) });
// BUMP: the thump still "doesn't cut through the bass ... make the bass do some work there with quick
// bumps aligned with that noise? maybe a quick attack pitch sweep and drop right back into the bass drone"
// -- on every DRUM2 't' the bass re-strikes ('Bass bump': gt $02 drops the gate 2 ticks early, attack 0)
// with its wavetable sweeping DOWN from BUMP semitones over the note to it, a frame a step (relative
// notes: 12 7 3 1 0, an octave dropping in ~80 ms), then holding: the drone carries on, no new note.
// No pulse pointer: the bass's sweep runs on through ('Bass bump start' starts it, at the bass's entrance).
// The bump replaces the legato landing on a change bar's row 0 -- the run now lands WITH the thump.
// Then deeper, further, faster (with the tom above): from a 12th up (19, was 12) in 3 frames, and
// UNDER the note by 2 for a frame before it settles -- the dip is the thud (was 12 7 3 1 0)
// Then (the drum back to the tom: T2WAVE=tri, TOM2FILT=0 -- the saw and the filtered saw were tried):
// "have the bass bump mirror it with the pulse, pitch sweeping similarly timed but landing on the drone
// note" -- the tom's own slide over the drone: TOM_SWEEP semitones down at TOM_RATE frames each (an
// octave in ~0.4 s), landing ON the note, no dip. BUMP (a frame list) still overrides it; it was
// '19 8 2 -2 0', and '12 7 3 1 0' before that.
// Then "the bass is going to have to get to its note a lot faster ... cut the bass's note sweep time in
// half": BUMPRATE frames a semitone (1, the tom's 2 halved: the octave in ~0.2 s)
const BUMP_DIR = env('BUMPDIR', 'span');
// span's default rate: 3 frames a semitone, so its 4 semitones take about as long as the dip's octave did
// (~0.2 s: "this does get the kick sound i want")
const BUMP_RATE = +env('BUMPRATE', BUMP_DIR === 'span' ? 3 : TOM_RATE / 2);
// Then "instead of ... jumping up and falling to the drone note, let's have it drop down and pop back up
// to the drone note": BUMPDIR=up (default) starts TOM_SWEEP UNDER the note (an octave: F1 under F2) and
// rises back to it at the same rate; BUMPDIR=down is the fall from above. (Negative relative notes are
// the wavetable's $60-$7F.)
// And "not quite what i meant -- still have it sweep down, but have it start sweeping down from the drone
// note, and when it's done with the sweep, pop back up immediately to the drone note": BUMPDIR=dip (the
// default) slides from the note DOWN TOM_SWEEP at the same rate (F2 to F1 in ~0.2 s), then jumps
// straight back to the note in one frame. (BUMPDIR=up was the octave under and rising.)
// Then, the dip's octave snapping back "sounds a bit glitchy": BUMPDIR=span (the default) slides from
// BUMPHI over the note (+2) down to BUMPLO (-2) at BUMPRATE frames a semitone, then pops back to the note
// -- a 2-semitone pop where the dip's was 12. (BUMPDIR=dip: 0 to -12, then the octave pop.)
// Then "+5 to drone, no pop" was tried (BUMPHI=5 BUMPLO=0 BUMPRATE=2: no closing pop when BUMPLO is 0) --
// "+5 is a bit too high. let's go back to +2-2": the default again.
const BUMP_HI = +env('BUMPHI', 2), BUMP_LO = +env('BUMPLO', -2);
const BUMP_STEPS = [...Array(TOM_SWEEP * BUMP_RATE + 1).keys()].map(f => Math.floor(f / BUMP_RATE));
if (!['span', 'dip', 'up', 'down'].includes(BUMP_DIR)) throw new Error(`BUMPDIR ${BUMP_DIR}: span, dip, up or down`);
const BUMP = process.env.BUMP !== undefined ? process.env.BUMP.split(' ').filter(Boolean).map(Number)
  : BUMP_DIR === 'span' ? [...[...Array((BUMP_HI - BUMP_LO) * BUMP_RATE + 1).keys()].map(f => BUMP_HI - Math.floor(f / BUMP_RATE) || 0), ...BUMP_LO ? [0] : []]
  : BUMP_DIR === 'dip' ? [...BUMP_STEPS.map(d => -d || 0), 0]
  : BUMP_STEPS.map(d => (BUMP_DIR === 'up' ? -1 : 1) * (TOM_SWEEP - d) || 0);
const BUMP_AD = hexv('BUMPAD', '06');
// DUCK=1: the opposite of the bump. "maybe the tri had more bottom ... the filter was making it too soft?"
// -- it never was filtered (the routing is voices 1-2; voice 3 is never muted), it was MASKED: the tom
// lands where the drone sits, and the bump made the bass LOUDER on the hit. So the bass gets out of the
// way: a key-off on the bar's first 't' (its release R 8 falls most of the way in the 2 rows), and a
// re-strike DUCKAT rows in ('Bass duck': gt $02, its soft attack AD 40 swelling back, no pulse pointer).
// It replaces the bumps.
const DUCK = BASS && KICK && env('DUCK', '0') === '1', DUCK_AT = +env('DUCKAT', 2);
if (DUCK) INSTR.push({ name: 'Bass duck start', ad: BASS_AD, sr: BASS_SR, wp: TRI, fp: 0, gt: 0x02, fw: 0x41, pp: BPP },
  { name: 'Bass duck', ad: BASS_AD, sr: BASS_SR, wp: TRI, fp: 0, gt: 0x02, fw: 0x41, pp: 0 });
const BUMP_ROWS = BASS && KICK && BUMP.length && !DUCK ? [...DRUM2].flatMap((c, r) => /[tT]/.test(c) ? [r] : []) : [];
if (BUMP_ROWS.length) { const wp = add('wave', [...BUMP.map(d => [0x41, d & 0x7f]), [0xff, 0x00]]);
  if (BUMP.some(d => d < -32 || d > 0x5f)) throw new Error('BUMP: semitones -32..95 from the note');   // $60-$7F: the readme's negative relative notes
  INSTR.push({ name: 'Bass bump start', ad: BUMP_AD, sr: BASS_SR, wp, fp: 0, gt: 0x02, fw: 0x41, pp: BPP },
    { name: 'Bass bump', ad: BUMP_AD, sr: BASS_SR, wp, fp: 0, gt: 0x02, fw: 0x41, pp: 0 }); }

// ---- the pattern ----
const P = [];
const pat = (events, len) => { const r = [...Array(len)].map(() => [REST, 0, 0, 0]);
  for (const [row, note, i = 0, cmd = 0, data = 0] of events) r[row] = [note, i, cmd, data];
  // an identical bar already written is reused: the orderlist names it again
  const key = JSON.stringify(r), had = P.findIndex(p => JSON.stringify(p.slice(0, -1)) === key);
  if (had >= 0) return had;
  P.push([...r, [0xff, 0, 0, 0]]); return P.length - 1; };
const LEN = LINE.length * STEP;
// voice 1 the fundamental (carrying the tempo), voices 2-3 the overtones, else silent
const lineP = (up, ins) => pat(LINE.map((nm, k) => [k * STEP, n(nm, OCTS[k]) + up, ins, ...(k || ins > 1 ? [] : [CMD_TEMPO, TEMPO_T])]), LEN);
// PULSE: the song is KICKIN bars of the line, then the bars of ROOTS (the drums' section, where the song
// loops back to). ROOTS names each bar's FIRST note, the low one -- "after 2 reps of the drum pattern: the
// F drops to E for one loop, then Eb, D, and Db" -- the C pedal and the falling Bb Ab G stay put. Then
// "draw it out a bit. Keep the F pattern for another two reps after the drum kicks in for two reps. But add
// a deep sweepy pulse wave F ... Then the pattern moves down as described, but holds each new bottom note
// for two reps": F x4 (the bass in at the 3rd, BASSIN), then two bars each of E Eb D Db.
// Each voice's first bar strikes with its 'start' instrument (the sweep, the filter) and the rest with the
// plain one, and every orderlist restarts at bar KICKIN + 1, past those first strikes.
// The echo is the line ECHO_DELAY rows late, from bar ECHOIN + 1: a note pushed past a bar line wraps to
// the top of the NEXT bar, so its first bar is silent until the delay and each later bar opens on the
// previous bar's tail.
// Then "a quick fill like the other transitions leading directly to G, to be held and then a run up to C
// to be held like the other bass notes" (the TURN below was a misreading, kept off): two more drones, G1
// and C2 -- a root may carry its bass octave (G1: DOWN from Db2, not G2 above it). SYNTHLINES gives a root
// its own synth bar: the tension the user asked for ("the synth pattern on top to change as well to
// bring out some new tension in those chords before looping back"), the same shape -- low, top, middle,
// top -- with the top pedal off C:
//   G1  F D B D Ab D G D       G7b9: the pedal up to D, B natural, the Ab rubbing on the G
//   C2  E Db Bb Db G Db E Db   C7b9: the leading tone E and the pedal's Db both fall into the loop's F C
const ROOTS = env('ROOTS', 'F F F F E E Eb Eb D D Db Db G1 G1 C2 C2').split(' ');
// Then "when it drops to the G the higher synth can switch to double speed and sweeping up and down those
// chords": a SYNTHLINES bar of 16 notes is 16ths (8 = 8ths). Each bar one sweep up two octaves and back down,
// on the chord without its root -- the diminished 7th inside each 7b9, the bass having the root:
//   G1  F Ab B D F Ab B D F' D B Ab F D B Ab      (B dim7 = G7b9)
//   C2  E G Bb Db E G Bb Db E' Db Bb G E Db Bb G  (E dim7 = C7b9)
// (SYNTHLINES, not LINES: zsh's LINES is the terminal height.) The 8th-note bars were 'G1:F4 D5 B4 D5 Ab4 D5 G4 D5|C2:E4 Db5 Bb4 Db5 G4 Db5 E4 Db5' (music/fc-gc8.sng).
// Then "don't go up as high (too piercing) so roll lower if needed, also, it shouldn't be just rills up and
// down, there should be some note skipping and repeated rolls up or down in layers": Ab3-F5 at most (was
// to F6), and a root's bars may differ -- '/' between them, taken in turn. 4-note cells (_ a chord tone
// skipped):
//   G 1  D F Ab D . F Ab B F . Ab B D Ab . B D F B        a roll up and back to its start, each layer a tone higher
//   G 2  F D B _F . D B Ab _D . B Ab F _B . Ab F D _Ab    rolls down, each leaping over its last tone
//   C 1  E G Bb G . E _Bb Db Bb . G _Db E Db . Bb G E Db  skipping up, then turning down
//   C 2  E Db Bb E . Db Bb G Db . Bb G E Bb . G E Db E    layers down, ending on E: into the loop's F
// No cell starts on the note the last one ended on: the line is legato, so a repeated note does not
// re-attack -- the two merge into one held note (the first try, '... F | F ...', blurred the layers).
// (One sweep a bar to F6/E6: music/fc-gc16.sng.)
const LINES = Object.fromEntries(env('SYNTHLINES', 'G1:D4 F4 Ab4 D4 F4 Ab4 B4 F4 Ab4 B4 D5 Ab4 B4 D5 F5 B4/F5 D5 B4 F4 D5 B4 Ab4 D4 B4 Ab4 F4 B3 Ab4 F4 D4 Ab3'
  + '|C2:E4 G4 Bb4 G4 E4 Bb4 Db5 Bb4 G4 Db5 E5 Db5 Bb4 G4 E4 Db4/E5 Db5 Bb4 E5 Db5 Bb4 G4 Db5 Bb4 G4 E4 Bb4 G4 E4 Db4 E4')
  .split('|').filter(Boolean).map(t => { const [r, ln] = t.split(':'); return [r, ln.split('/').map(x => x.split(' '))]; }));
// GCROLLS=1: "only in the last two sections (G and C) when we're already going faster" -- 32nd rolls in
// the 16th bars (music/fc-gcrolls.sng). A note written 'Ab4-3' is a roll: Ab4 for 5 ticks, then 3
// semitones down for the last 4 (a 32nd is 4.5 ticks at tempo 9, off the row grid, so the WAVETABLE
// does it: 'Roll -3', legato, a relative note after a delay row). 4 of a bar's 16 (the user's 1/4),
// mostly where the line leaps, so the roll runs into it; none lands on the note after it (it would merge):
//   G 1  D F Ab-3 D . F Ab B F-3 . Ab B D-3 Ab . B D F-3 B
//   G 2  F D B F+3 . D B Ab-3 D . B Ab F B+3 . Ab F D-3 Ab
//   C 1  E G Bb G . E+3 Bb Db Bb . G+3 Db E+3 Db . Bb G E Db+3
//   C 2  E Db Bb-3 E . Db Bb G-3 Db . Bb G E-3 Bb . G E Db-3 E
if (env('GCROLLS', '0') === '1' && !process.env.SYNTHLINES) Object.assign(LINES, Object.fromEntries(
  ['G1:D4 F4 Ab4-3 D4 F4 Ab4 B4 F4-3 Ab4 B4 D5-3 Ab4 B4 D5 F5-3 B4/F5 D5 B4 F4+3 D5 B4 Ab4-3 D4 B4 Ab4 F4 B3+3 Ab4 F4 D4-3 Ab3',
   'C2:E4 G4 Bb4 G4 E4+3 Bb4 Db5 Bb4 G4+3 Db5 E5+3 Db5 Bb4 G4 E4 Db4+3/E5 Db5 Bb4-3 E5 Db5 Bb4 G4-3 Db5 Bb4 G4 E4-3 Bb4 G4 E4 Db4-3 E4']
  .map(t => { const [r, ln] = t.split(':'); return [r, ln.split('/').map(x => x.split(' '))]; })));
// GCRUNS=1: then "more sectional than back and forth ... add in a bar or two of 32nd note runs during
// that time ... make the 32nd note runs longer and more spaced out" (music/fc-gcruns.sng): bars 15 and 17
// as the 16th layers, bar 16 a WHOLE bar of 32nds, bar 18 half 16ths then half 32nds. 'A>B' writes a 16th
// as two 32nds (a roll by B - A):
//   G 2  F5 D5 B4 Ab4 B4 D5 . B4 Ab4 F4 D4 F4 Ab4 . F4 D4 B3 Ab3 B3 D4 .  waves falling in layers
//        F4 Ab4 B4 D5 F5 D5 B4 Ab4 . F4 D4 B3 D4 F4 Ab4                  a climb, and back to Ab
//   C 2  E5 Db5 Bb4 E5 Db5 Bb4 G4 Db5 (16ths) . Bb4 G4 E4 Db4 E4 G4 Bb4 G4 E4 Db4 Bb3 G3 Bb3 Db4 G4 E4
//        winding down onto E, the leading tone into the loop's F
const pairs = ns => ns.split(' ').reduce((a, x, k, all) => k % 2 ? a : [...a, `${x}>${all[k + 1]}`], []).join(' ');
if (env('GCRUNS', '0') === '1' && !process.env.SYNTHLINES) {
  LINES.G1 = [LINES.G1[0], pairs('F5 D5 B4 Ab4 B4 D5 B4 Ab4 F4 D4 F4 Ab4 F4 D4 B3 Ab3 B3 D4 F4 Ab4 B4 D5 F5 D5 B4 Ab4 F4 D4 B3 D4 F4 Ab4').split(' ')];
  LINES.C2 = [LINES.C2[0], ['E5', 'Db5', 'Bb4', 'E5', 'Db5', 'Bb4', 'G4', 'Db5', ...pairs('Bb4 G4 E4 Db4 E4 G4 Bb4 G4 E4 Db4 Bb3 G3 Bb3 Db4 G4 E4').split(' ')]]; }
// a written note: 'Ab4', 'Ab4-3' (a roll by -3) or 'Ab4>F4' (a roll to F4)
const ROLLRE = /^([A-G][b#]?\d)(?:([+-]\d+)|>([A-G][b#]?\d))?$/;
const rollD = x => { const m = ROLLRE.exec(x); if (!m) throw new Error(`SYNTHLINES: '${x}'`); const nn = y => n(y.slice(0, -1), +y.slice(-1)); return m[2] ? +m[2] : m[3] ? nn(m[3]) - nn(m[1]) : 0; };
const rollIv = new Set(Object.values(LINES).flat(2).map(rollD).filter(Boolean));
if (PULSE) for (const d of rollIv) INSTR.push({ name: `Roll ${d > 0 ? '+' : ''}${d}`, ad: AD, sr: SR, fp: 0, gt: 0x42, fw: 0x41, pp: 0,
  wp: add('wave', [[0x41, 0x00], [0x03, 0x00], [0x41, d & 0x7f], [0xff, 0x00]]) });   // 1 tick + a delay row of 3 (4 ticks), then the turn
// TURN: then "after the bass notes we have now, I want the bass to do a run all the way down to G, then
// back up to C ... the synth pattern on top to change as well to bring out some new tension in those
// chords before looping back". Bars of 'bass[,bass]:8 synth eighths', '|' between them: the bass moves a
// HALF bar a note (a run, not the two-bar drones), down C B Bb A Ab G and back up A B to a whole bar of C
// (the dominant: the loop falls to F). The synth keeps its shape -- low, top, middle, top -- but its top
// pedal leaves C (D over B and G, Db over Bb) and the chords darken:
//   C   F C Ab C     Fm over C, unsettled        B   F D Ab D     B dim (a G7b9 colour)
//   Bb  F Db Bb Db   Bb minor                    A   Eb C Gb C    A dim
//   Ab  Eb C Ab C    Ab: the one moment of rest  G   F D B D      G7, the B natural
//   A   Gb C Eb C    A dim, climbing             B   Ab D F D     B dim
//   C   E Db G Db Bb Db G Db   C7b9: the leading tone E and the pedal's Db both fall into the loop's F C
// TURN='' = no turnaround.
// (off: with ROOTS ending at Db and the first four BASSRUNS, TURN='C2,B1:F4 C5 Ab4 C5 F4 D5 Ab4 D5|Bb1,A1:F4 Db5 Bb4 Db5 Eb4 C5 Gb4 C5|Ab1,G1:Eb4 C5 Ab4 C5 F4 D5 B4 D5|A1,B1:Gb4 C5 Eb4 C5 Ab4 D5 F4 D5|C2:E4 Db5 G4 Db5 Bb4 Db5 G4 Db5' = music/fc-turn-half.sng)
const TURN = env('TURN', '')
  .split('|').filter(Boolean).map(t => { const [bs, ln] = t.split(':'); return { bass: bs.split(','), line: ln.split(' ') }; });
const pn = x => n(x.slice(0, -1), +x.slice(-1));
const TURN_AT = PULSE ? KICK_IN + ROOTS.length : Infinity;
if (TURN.some(t => t.line.length !== LINE.length || t.bass.length > 2)) throw new Error(`TURN: each bar ${LINE.length} synth notes and 1-2 bass notes`);
const BARS = PULSE ? [...Array(KICK_IN).fill(LINE[0]), ...ROOTS, ...TURN.map(t => t.bass[0].slice(0, -1))] : [];
const turnOf = b => b >= TURN_AT ? TURN[b - TURN_AT] : null;
const BASS_IN = +env('BASSIN', KICK_IN + 2);
if (PULSE && (KICK_IN < 1 || ECHO_IN >= KICK_IN)) throw new Error(`KICKIN ${KICK_IN} must be past bar 1 and the echo's entrance (ECHOIN ${ECHO_IN})`);
if (BASS && (BASS_IN <= KICK_IN || BASS_IN >= BARS.length)) throw new Error(`BASSIN ${BASS_IN}: inside the loop (bars ${KICK_IN + 2}-${BARS.length})`);
const I_ = Object.fromEntries(INSTR.map((x, k) => [x.name, k + 1]));
const bassNote = b => /\d$/.test(BARS[b]) ? pn(BARS[b]) : n(BARS[b], BASS_OCT);   // a root with its own octave, or at BASSOCT
// a root's k-th bar in a row takes its k-th SYNTHLINES bar (cycling)
// ROLLS: "a version where there are some little rolls that are double the rate of the notes now, so maybe
// 3/4 like it is now and 1/4 double-speed notes here and there to break up monotony" -- in the 8th-note
// bars, two 8ths a bar split into two 16ths: the 8th's note, then the note plus 'd' semitones. Bars take
// the sets in turn ('|' between bars, 'pos:d' with pos the 8th 0-7: 0 F, 1 C, 2 Bb, 3 C, 4 Ab, 5 C, 6 G,
// 7 C). ROLLS=1 is the preset (music/fc-rolls.sng); the default '' = none. Each roll's 2nd note differs
// from the next 8th's: the line is legato, and a repeated note would merge into it.
//   1:+1 5:-4   C Db | Bb ... C Ab | G     the pedal turning up a half step, then dropping to Ab
//   2:-2 6:+1   Bb Ab | C ... G Ab | C     the falling line's notes turning back
//   3:+1 7:-2   C Db | Ab ... C Bb | F     up into Ab, and down into the next bar
//   4:-1 7:+1   Ab G | C ... C Db | F      a chromatic dip, and a lift into the next bar
const ROLLS = (env('ROLLS', '') === '1' ? '1:1 5:-4|2:-2 6:1|3:1 7:-2|4:-1 7:1' : env('ROLLS', ''))
  .split('|').filter(Boolean).map(r => r.split(' ').map(x => x.split(':').map(Number)));
if (ROLLS.some(r => r.some(([p]) => !(p >= 0 && p < LINE.length))) || STEP % 2) throw new Error('ROLLS: pos 0-7 of the 8th-note line');
const runOf = b => { let k = 0; while (b - k - 1 >= 0 && BARS[b - k - 1] === BARS[b]) k++; return k; };
const notesOf = b => { const own = turnOf(b)?.line ?? LINES[BARS[b]]?.[runOf(b) % LINES[BARS[b]].length];
  if (own && LEN % own.length) throw new Error(`LINES: ${own.length} notes do not divide the bar's ${LEN} 16ths`);
  if (own) return own.map((x, k) => { const d = rollD(x);
    return [k * LEN / own.length, pn(ROLLRE.exec(x)[1]), k, ...d ? [`Roll ${d > 0 ? '+' : ''}${d}`] : []]; });
  const ev = LINE.map((nm, k) => [k * STEP, n(k ? nm : BARS[b], OCTS[k]), k]), roll = ROLLS[b % (ROLLS.length || 1)] ?? [];
  // a roll: the 8th's second 16th becomes a new note (k past the line's, so never a 'start' strike)
  // a roll whose 2nd note IS the note after it (the next bar's first, at a bar line) is dropped: it would merge
  for (const [p, d] of roll) { const next = p + 1 < LINE.length ? ev[p + 1][1] : b + 1 < BARS.length ? notesOf(b + 1)[0][1] : null;
    if (ev[p][1] + d !== next) ev.push([p * STEP + STEP / 2, ev[p][1] + d, LINE.length + p]); }
  return ev.sort((x, y) => x[0] - y[0]); };
// fresh: the echo coming back on voice 2 after the bass (the loop's first bar): a key-off on row 0 lets
// the bass go, and its first note is the 'start' instrument again -- the plain one would carry on running
// the BASS's pulse program
const voiceBar = (b, delay, from, insStart, ins, fresh = false) => {
  const tail = prev => prev < from ? [] : notesOf(prev).map(([r, nt]) => [r + delay - LEN, nt, ins]).filter(([r]) => r >= 0);
  // the loop's first bar opens on the LAST bar's tail too: one pattern serves both, so they must agree
  // (unless the last bar is the BASS's: the echo's tail there was never played)
  if (b === KICK_IN && b > from && !(BASS && BARS.length - 1 >= BASS_IN) && JSON.stringify(tail(b - 1)) !== JSON.stringify(tail(BARS.length - 1)))
    throw new Error(`echo: bar ${b + 1} opens on different tails the first time and on the loop`);
  const ev = [...notesOf(b).map(([r, nt, k, roll]) => [r + delay, nt, roll && !delay ? I_[roll] : b === from && !k ? insStart : ins, ...(b === 0 && !k && !delay ? [CMD_TEMPO, TEMPO_T] : [])])
    .filter(([r]) => r < LEN), ...tail(b - 1)].sort((x, y) => x[0] - y[0]);
  if (fresh) { ev[0] = [ev[0][0], ev[0][1], insStart]; if (ev[0][0]) ev.unshift([0, KEYOFF]); }
  return pat(ev, LEN); };
// the bass: a strike on row 0 whenever the bottom note changes (or the bass comes in), else the note
// holds; and the bar before a change (to another bass bar) ends on the run
// a TURN bar: the bumps on its first note, and its second (if any) half way, picked like a run's first
const bassBar = b => turnOf(b) ? pat([...BUMP_ROWS.map(r => [r, pn(turnOf(b).bass[0]), I_['Bass bump']]),
    ...turnOf(b).bass[1] ? [[LEN / 2, pn(turnOf(b).bass[1]), I_['Bass pick']]] : []], LEN) : bassBar1(b);
const bassBar1 = b => { const ev = DUCK ? [...b === BASS_IN ? [] : [[0, KEYOFF]], [DUCK_AT, bassNote(b), I_[b === BASS_IN ? 'Bass duck start' : 'Bass duck']]]
    : BUMP_ROWS.length ? BUMP_ROWS.map(r => [r, bassNote(b), b === BASS_IN && !r ? I_['Bass bump start'] : I_['Bass bump']])
    : b === BASS_IN || BARS[b] !== BARS[b - 1] ? [[0, bassNote(b), b === BASS_IN ? I_['Bass start'] : I_.Bass]] : [];
  if (RUNS.length && b + 1 < BARS.length && BARS[b + 1] !== BARS[b]) {
    // the change's number among the changes so far picks its run
    const c = BARS.slice(BASS_IN, b + 1).filter((x, k, a) => k && x !== a[k - 1]).length, run = RUNS[c % RUNS.length];
    if (run.length > LEN - (ev.length ? 1 : 0)) throw new Error(`BASSRUNS: ${run.length} 16ths will not fit before bar ${b + 2}`);
    let pick = true;
    run.forEach((t, k) => { const r = LEN - run.length + k;
      if (t === '-') return;
      if (t === '.') { ev.push([r, KEYOFF]); pick = true; return; }
      ev.push([r, bassNote(b) + parseInt(t.replace('!', '')), pick || t[0] === '!' ? I_['Bass pick'] : I_['Bass run']]); pick = false; }); }
  return pat(ev, LEN); };
const ORDER = PULSE ? [BARS.map((_, b) => voiceBar(b, 0, 0, 1, 2)),
  ECHO ? BARS.map((_, b) => b < ECHO_IN ? pat([], LEN) : BASS && b >= BASS_IN ? bassBar(b)
    : voiceBar(b, ECHO_DELAY, ECHO_IN, 3, 4, BASS && b === KICK_IN)) : [pat([], LEN), pat([], LEN)],
  KICK ? BARS.map((_, b) => b < KICK_IN ? pat([], LEN) : BASS && b >= BASS_IN ? pat([...DRUM2].flatMap((c, r) => c === '.' ? [] : [[r, /[tT]/.test(c) && TOM2_ROOT ? bassNote(b) - 12 * TOM2_OCT : n('C', 3), I_[c === 'S' ? 'snap' : T2 === 'tom' ? c : 'thump']]]), LEN) : pat(KICK_ROWS.map((r, k) => [r, n('C', 3), I_[KSND], ...k || KICK_T === TEMPO_T ? [] : [CMD_TEMPO, 0x80 | KICK_T]]), LEN * TEMPO_T / KICK_T))
    : [pat([], LEN), pat([], LEN)]]
  : [0, 1, 2].map(v => [v ? (HARM[v - 1] ? lineP(HARM[v - 1][0], v + 1) : pat([], LEN)) : lineP(0, 1)]);
const RESTART = o => PULSE ? Math.min(KICK_IN, o.length - 1) : 0;   // loop to the drums' entrance

// ---- the .sng (GoatTracker 2 "GTS5") ----
const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('F C', 32); str('', 32); str('', 32);
b.push(1);                                             // one subtune
for (const o of ORDER) b.push(o.length + 1, ...o, 0xff, RESTART(o));   // loop to the top (PULSE: past the first strikes)
b.push(INSTR.length);
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp, i.pp, i.fp, 0, 0, i.gt, i.fw); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1]));
b.push(P.length);
for (const p of P) { b.push(p.length); for (const row of p) b.push(...row); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes, ${LINE.length} notes x ${STEP} rows at tempo ${TEMPO_T} (~${Math.round(3600 / (TEMPO_T * 4))} BPM)`);
