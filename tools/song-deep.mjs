#!/usr/bin/env node
// song-deep.mjs -- "Deep": a slow atmospheric piece, written as a GoatTracker 2 song (.sng).
//
//   node tools/song-deep.mjs [music/deep.sng]
//
// The user's brief (2026-10-15): long slow notes, atmosphere with a hint of melody; a low drone that
// GLIDES between bass notes (~half-second slides) over many measures, pulse-modulated and filtered;
// a slow arpeggiated melody over it, minor with exotic notes, some notes sliding long (DKC's
// underwater levels); a slow heartbeat and soft brushes for drums.
//
// Ch1 drone: pulse, slow PWM, resonant lowpass breathing; each change is a toneportamento (3XY).
//   Bass: A F Bb E | A F D E(->G#) -- Bb is the Phrygian flat second, G# the leading tone.
// Ch2 melody: soft triangle; each new note BLOOMS (root, 5th, octave, 5th, root, ~1/4 s each), then
//   holds with a delayed vibrato; some notes slide slowly into the next. A harmonic minor + Bb.
// Ch3: a lub-dub heartbeat every ~2 s, and brushes (noise with a slow attack).
// Tempo 8: a row is 8 ticks (~133 ms on NTSC); a 32-row pattern ~4.3 s; the loop is 8 of them.
// Built from the format and the SID's behaviour, NOT heard: tune by ear in GoatTracker.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
const OUT = process.argv[2] ?? 'music/deep.sng';

const T = { wave: [], pulse: [], filt: [], speed: [] };
const add = (t, rows) => { const at = T[t].length + 1; T[t].push(...rows); return at; };

// ---- speedtable entries first: commands name them by index ----
// DRONEGLIDE=hex: the drone's toneportamento speed per tick. $06 slides A1->F1 in ~0.5 s; the default
// $40 gets there in ~3 ticks (50 ms) -- a clean NOTE CHANGE that still never retriggers the drone (its
// attack, pulse and filter sweeps run on through it). The user, 2026-10-15: the slides were "too slow
// or too close to read as note changes".
// $0C (2026-10-15, the user: "bring back the glide ... about twice as fast" as the first $06): ~1/4 s.
const S_BASSGLIDE = add('speed', [[0x00, parseInt(process.env.DRONEGLIDE ?? '0c', 16)]]);
const S_MELGLIDE  = add('speed', [[0x00, 0x10]]);   // $0010/tick: ~0.5 s per semitone up high
const S_MELVIB    = add('speed', [[0x05, 0x14]]);   // slow, shallow vibrato

const INSTR = [
  { name: 'Drone', ad: 0x8f, sr: 0xf8,
    wave:  [[0x41, 0x00], [0xff, 0x00]],
    // pulse width $400 <-> $800, round and hollow, never the thin buzzy end. A 680-tick cycle (340 up,
    // 340 down at 3/tick): NOT a multiple of the 256-tick section, so it drifts across the note changes
    pulse: [[0x84, 0x00], [0x7f, 0x03], [0x7f, 0x03], [0x56, 0x03],
                          [0x7f, 0xfd], [0x7f, 0xfd], [0x56, 0xfd], [0xff, 0x02]],
    // lowpass, resonance A, channel 1, cutoff kept LOW ($08-$48) so the drone stays dark. It breathes
    // in STAIRS -- 4 ticks of movement, a 15-tick hold, 16 of them up and 16 down -- because a cutoff
    // step of 1 a tick is the slowest a plain ramp goes: ~10 s a cycle (608 ticks), and 608 is not a
    // multiple of the 256-tick section either. (It was 128 ticks: in lockstep with the bass.)
    filt:  [[0x90, 0xa1], [0x00, 0x08],
            ...[...Array(16)].flatMap(() => [[0x04, 0x01], [0x0f, 0x00]]),
            ...[...Array(16)].flatMap(() => [[0x04, 0xff], [0x0f, 0x00]]),
            [0xff, 0x03]] },
  { name: 'Bloom', ad: 0x6a, sr: 0x9c, vib: S_MELVIB, vibDelay: 0x50,
    // the slow arpeggio: root (16 ticks), 5th, octave, 5th (16 each), root, then STOP -- so the
    // vibrato and any glide can move the pitch freely afterwards
    wave:  [[0x11, 0x00], [0x0e, 0x00], [0x0f, 0x07], [0x0f, 0x0c], [0x0f, 0x07], [0x0f, 0x00], [0xff, 0x00]],
    pulse: [[0x88, 0x00], [0xff, 0x00]] },
  { name: 'Heart lub', ad: 0x05, sr: 0x00,
    // a low triangle thump, its pitch falling
    // absolute notes E2 C2 A1 G1: a heart, not a tom (around 50-80 Hz)
    wave:  [[0x11, 0x9c], [0x11, 0x98], [0x11, 0x95], [0x10, 0x93], [0xff, 0x00]] },
  { name: 'Heart dub', ad: 0x04, sr: 0x00,
    wave:  [[0x11, 0x9a], [0x11, 0x96], [0x10, 0x93], [0xff, 0x00]] },   // D2 A#1 G1: the softer second beat
  { name: 'Brush', ad: 0x69, sr: 0x05,
    // noise swelling in and away: a breath, not a hit
    wave:  [[0x81, 0xc8], [0x81, 0xc6], [0xff, 0x00]] },
];
for (const i of INSTR) {
  i.wp = add('wave', i.wave);
  i.pp = i.pulse ? add('pulse', i.pulse) : 0;
  i.fp = i.filt ? add('filt', i.filt) : 0;
}
const I = Object.fromEntries(INSTR.map((x, n) => [x.name, n + 1]));

const NOTE = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
const n = s => { const m = /^([A-G]#?)(\d)$/.exec(s); return 0x60 + 12 * +m[2] + NOTE[m[1]]; };
const REST = 0xbd, KEYOFF = 0xbe, PORTA = 0x3, TEMPO = 0xf;
// an event: [row, note, instrument, command, data]; a GLIDE is a note with command 3 and no
// instrument -- toneportamento slides the sounding note to it without retriggering
const pat = (events, rows = 32) => {
  const r = [...Array(rows)].map(() => [REST, 0, 0, 0]);
  // an event is one row, or a GROUP of rows (a glide): flatten the groups
  for (const [row, note, ins = 0, cmd = 0, data = 0] of events.flatMap(e => Array.isArray(e[0]) ? e : [e]))
    r[row] = [note === null ? REST : note === 'off' ? KEYOFF : n(note), ins, cmd, data];
  return [...r, [0xff, 0, 0, 0]];
};
// A GLIDE has to be held: 3XY is a REALTIME command and runs only on rows that carry it -- the first
// version put it on the note's row alone, so every slide stopped after one row (~7 ticks) and the
// drone sat stranded BETWEEN notes (the user: "can't identify the melody pattern"). So the command
// repeats on GLIDE_ROWS rows; it stops by itself at the target, and the packer stores a repeated
// command once. 5 rows = 35 ticks, room for the largest drone jump (Bb1->E1, ~24 ticks at $0C).
const GLIDE_ROWS = 5;
const glide = (row, note, sp) => [[row, note, 0, PORTA, sp],
  ...[...Array(GLIDE_ROWS - 1)].map((_, k) => [row + 1 + k, null, 0, PORTA, sp])];

const P = [];
const def = (events, rows) => { P.push(pat(events, rows)); return P.length - 1; };
// ---- ch1: the drone ----
const B_IN  = def([[0, 'A1', I['Drone'], TEMPO, 8]], 8);           // starts the drone, sets tempo 8
const B_A   = def([glide(0, 'A1', S_BASSGLIDE)]);
const B_F   = def([glide(0, 'F1', S_BASSGLIDE)]);
const B_BB  = def([glide(0, 'A#1', S_BASSGLIDE)]);
const B_E   = def([glide(0, 'E1', S_BASSGLIDE)]);
const B_D   = def([glide(0, 'D1', S_BASSGLIDE)]);
// (B_E2, E then a rise to G# halfway, was dropped 2026-10-15: the user -- "lose the G# and just hold the E")
// ---- ch2: the melody ----
const bl = (row, note) => [row, note, I['Bloom']];
const mg = (row, note) => glide(row, note, S_MELGLIDE);
const M_IN = def([], 8);
const M1 = def([bl(0, 'A4'), bl(12, 'C5'), mg(22, 'B4')]);
const M2 = def([bl(0, 'C5'), bl(16, 'A4'), mg(24, 'G#4')]);                 // G# over F: the augmented 2nd
const M3 = def([bl(0, 'D5'), bl(10, 'F5'), mg(20, 'E5')]);                  // over Bb: Phrygian shade
const M4 = def([bl(0, 'G#4'), bl(16, 'B4')]);
const M5 = def([bl(0, 'E5'), bl(12, 'D5'), mg(22, 'C5')]);
const M6 = def([bl(0, 'A4'), mg(16, 'C5')]);
const M7 = def([bl(0, 'F4'), bl(12, 'A4'), mg(22, 'G#4')]);
const M8 = def([bl(0, 'B4'), mg(14, 'E5')]);                                // a long rise to the loop
// ---- ch3: heartbeat and brushes ----
const beat = r => [[r, 'C3', I['Heart lub']], [r + 3, 'C3', I['Heart dub']]];
const D_IN = def([...beat(0)], 8);
const D1 = def([...beat(0), [8, 'C5', I['Brush']], ...beat(16), [26, 'C5', I['Brush']]]);
const D2 = def([...beat(0), ...beat(16)]);

const ORDER = [
  [B_IN, B_A, B_F, B_BB, B_E, B_A, B_F, B_D, B_E],
  [M_IN, M1, M2, M3, M4, M5, M6, M7, M8],
  [D_IN, D1, D2, D1, D2, D1, D2, D1, D2],
];
// DRONEONLY=1: voices 2 and 3 play silence (an all-rest pattern), to work on the drone alone
if (process.env.DRONEONLY === '1') {
  const SIL = def([]), SIL_IN = def([], 8);
  ORDER[1] = ORDER[1].map((_, k) => k ? SIL : SIL_IN);
  ORDER[2] = ORDER[2].map((_, k) => k ? SIL : SIL_IN);
}
const RESTART = 1;                                                // loop past the intro

const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('Deep', 32); str('', 32); str('', 32);
b.push(1);
for (const o of ORDER) b.push(o.length + 1, ...o, 0xff, RESTART);
b.push(INSTR.length);
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp, i.pp, i.fp, i.vib ?? 0, i.vibDelay ?? 0, 0x02, 0x09); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1]));
b.push(P.length);
for (const p of P) { b.push(p.length); for (const row of p) b.push(...row); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes, ${INSTR.length} instruments, ${P.length} patterns, loop ${ORDER[0].length - RESTART} x 32 rows at tempo 8`);
