// song-gbb.mjs -- "G Bb": a filtered pulse dyad over a chromatic bass (2026-10-22, the user's sketch).
//
//   node tools/song-gbb.mjs [out.sng]        (default music/gbb.sng)
//
// The user's spec, as given:
//   G Bb dyad -- quarter note repeating, fairly staccato, very filtered pulse
//   (then: "I should say 1/8th notes for the diad" ... "filtered to the point it sounds like a distant
//   thump. I do want it to sound like a synth chord" -- eighths, and the filter opened)
//   low notes, an 8-step bar:   1  2  3  4  5  6  7  8
//                               D        D     Db        (twice)
//                               D        D#    D#
//                               E        E#    E#
// Read as eighth notes (8 to a bar), four bars looping. A step is two rows, so the bar is a 16-row
// pattern and the dyad strikes every 2 rows (the eighths). What the sketch leaves open is a default
// here, each overridable: tempo, octaves, the envelopes, the filter.
//
// Voices: 1 the bass, 2 and 3 the dyad -- all one tone (see 'Tone'), all through the low-pass. The pulse
// width sweeps slowly through the loop, started only by each voice's first note so a strike never
// restarts it; that slow sweep under the filter is what moves.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const OUT = process.argv[2] ?? 'music/gbb.sng';
const env = (k, d) => process.env[k] ?? d;
const hexv = (k, d) => parseInt(env(k, d), 16);

const TEMPO_T = +env('TEMPOT', 12);                // ticks a row: a step (8th) = 24 ticks, 75 BPM at 60 Hz (was 9, ~100: "slow the tempo about 25%")
const BASS_OCT = +env('BASSOCT', 2), DYAD_OCT = +env('DYADOCT', 4);   // the dyad was G3/Bb3: "bring the diad up an octave"
// The tone (every voice, the bass too -- the user: "bring back in the bass notes using the same tone"):
// "stuccato but not quite that stucato. The release is fine, but the sustain should be like a 16th note
// long" -> "maybe it should be a 32nd note?" -> "a dotted 32nd": held DYAD_HOLD ticks at sustain A, then
// let go by the WAVETABLE (a row is a 16th, too coarse for a key-off), released at 6 (~200 ms). Gate
// timer $82, as level 3's roll: the hard restart would cut the tail dead in VICE.
const DYAD_AD = hexv('DYADAD', '00'), DYAD_SR = hexv('DYADSR', 'a6'), DYAD_GT = hexv('DYADGT', '82');
const DYAD_HOLD = +env('DYADHOLD', 9);             // a dotted 32nd at tempo 12 (6.75 at 9)
const BASS_HOLD = +env('BASSHOLD', 2 * DYAD_HOLD); // "make the bass notes about twice as long" -- the same tone, held longer
// DYADSTAG=n: the upper note n ticks late (a wavetable delay row first, gate still off). Tried at 2, then
// 1; then "remove the stagger. it sounded better just played together" -- off
const DYAD_STAG = +env('DYADSTAG', 0);
// $1c/C was "a distant thump"; $50/8 kept some edge; "open the filter more": $90; "back to $80"; then
// "try 4 for resonance ... drop the filter down to $60"; then (bass back in) "down two steps": $40; then
// "bass back in the filter, but bring it up to $50"
const FCUT = hexv('FCUT', '50'), FRES = hexv('FRES', '4');
// BASS=0 drops it (it was off for a while: "let's do just the diad pulse for now. (skip the bass)")
const BASS = env('BASS', '1') === '1';
const PW_LO = hexv('PWLO', '02'), PW_SPD = hexv('PWSPD', '08');          // the sweep: $200 up to $5f8 (8 a tick, 127 ticks) and back

// ---- GoatTracker's encodings ----
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
// sharps, flats and E#/B# as written in the sketch: Db = C#, E# = F
const ALIAS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', 'E#': 'F', 'B#': 'C' };
const n = (nm, oct) => { const k = ALIAS[nm] ?? nm; if (!(k in NOTE)) throw new Error(`note ${nm}`);
  return 0x60 + 12 * (oct + (nm === 'B#' ? 1 : 0)) + NOTE[k]; };
const REST = 0xbd, CMD_TEMPO = 0xf;

// ---- tables (1-based rows; a jump names an absolute row) ----
const T = { wave: [], pulse: [], filt: [], speed: [] };
const add = (t, rows) => { const at = T[t].length + 1; T[t].push(...rows.map(r => typeof r === 'function' ? r(at) : r)); return at; };
// pulse + gate, a delay row (DYAD_HOLD - 2 more ticks: the first row and the gate-off row are a tick each), gate off, stop
// (a delay row holds at most 15 ticks, so a longer hold takes two)
const toneWave = (stag, hold = DYAD_HOLD) => { const d = []; for (let t = hold - 2; t > 0; t -= 15) d.push([Math.min(15, t), 0x00]);
  return add('wave', [...(stag ? [[stag, 0x00]] : []), [0x41, 0x00], ...d, [0x40, 0x00], [0xff, 0x00]]); };
const WAVE = toneWave(0), BWAVE = toneWave(0, BASS_HOLD);
// the sweep: set $x00, up for 127 ticks, down for 127, round again -- ~8.5 s a cycle
const PULSE = add('pulse', [[0x80 | PW_LO, 0x00], [0x7f, PW_SPD], [0x7f, -PW_SPD & 0xff], at => [0xff, at + 1]]);
// low-pass ($10 in the type bits), resonance FRES, all three voices routed (the bass came out and went back
// in: "nah, bass back in the filter"); then the cutoff; then stop
const FILT = add('filt', [[0x90, FRES << 4 | 0x07], [0x00, FCUT], [0xff, 0x00]]);

// Every strike sets the filter (fp: static, so re-applying it is harmless -- an AXY on a later row left
// the very first strike unfiltered). The pulse sweep must NOT restart at every strike, so only each
// voice's first note of the loop starts it ('Tone start'); the rest leave it running ('Tone'). That also
// frees row 0 of every channel from commands but the tempo.
const INSTR = [
  { name: 'Tone', ad: DYAD_AD, sr: DYAD_SR, wp: WAVE, pp: 0, fp: FILT, gt: DYAD_GT },
  { name: 'Tone start', ad: DYAD_AD, sr: DYAD_SR, wp: WAVE, pp: PULSE, fp: FILT, gt: DYAD_GT },
  { name: 'Bass', ad: DYAD_AD, sr: DYAD_SR, wp: BWAVE, pp: 0, fp: FILT, gt: DYAD_GT },
  { name: 'Bass start', ad: DYAD_AD, sr: DYAD_SR, wp: BWAVE, pp: PULSE, fp: FILT, gt: DYAD_GT },
  ...DYAD_STAG ? [{ name: 'Tone hi', ad: DYAD_AD, sr: DYAD_SR, wp: toneWave(DYAD_STAG), pp: 0, fp: FILT, gt: DYAD_GT },
                  { name: 'Tone hi start', ad: DYAD_AD, sr: DYAD_SR, wp: toneWave(DYAD_STAG), pp: PULSE, fp: FILT, gt: DYAD_GT }] : [],
];
const I = Object.fromEntries(INSTR.map((x, k) => [x.name, k + 1]));
const ins = (hi, first) => I[`Tone${hi && DYAD_STAG ? ' hi' : ''}${first ? ' start' : ''}`];

// ---- patterns: a bar is 16 rows (8 steps of 2) ----
const P = [];
const pat = events => { const r = [...Array(16)].map(() => [REST, 0, 0, 0]);
  for (const [row, note, i = 0, cmd = 0, data = 0] of events) r[row] = [note === null ? REST : note, i, cmd, data];
  P.push([...r, [0xff, 0, 0, 0]]); return P.length - 1; };
const step = s => (s - 1) * 2;                         // the sketch's step 1-8 -> its row

// the bass: [step 1, step 4, step 6]; bar 1 carries the tempo
const BARS = [['D', 'D', 'Db'], ['D', 'D', 'Db'], ['D', 'D#', 'D#'], ['E', 'E#', 'E#']];
const bassBar = (b, first) => pat(BASS ? [
  [step(1), n(b[0], BASS_OCT), I[first ? 'Bass start' : 'Bass'], ...(first ? [CMD_TEMPO, TEMPO_T] : [])],
  [step(4), n(b[1], BASS_OCT), I.Bass], [step(6), n(b[2], BASS_OCT), I.Bass]]
  : first ? [[0, null, 0, CMD_TEMPO, TEMPO_T]] : []);
// an 8th: struck on its first row; the wavetable lets it go DYAD_HOLD ticks in, and it releases from there
const dyadBar = (nm, hi, first) => pat([0, 2, 4, 6, 8, 10, 12, 14].map((r, k) => [r, n(nm, DYAD_OCT), ins(hi, first && !k)]));
const ORDER = [
  [bassBar(BARS[0], true), ...BARS.slice(1).map(b => bassBar(b, false))],
  ...[['G', false], ['Bb', true]].map(([nm, hi]) => { const rest = dyadBar(nm, hi, false); return [dyadBar(nm, hi, true), rest, rest, rest]; }),
];

// ---- the .sng (GoatTracker 2 "GTS5") ----
const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('G Bb', 32); str('', 32); str('', 32);
b.push(1);                                             // one subtune
for (const o of ORDER) b.push(o.length + 1, ...o, 0xff, 0);   // loop to the top
b.push(INSTR.length);
// 1st-frame wave $08 (test bit, gate OFF): see song-deep.mjs -- $09 clicks on a 6581
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp, i.pp, i.fp, 0, 0, i.gt ?? 0x02, 0x08); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1]));
b.push(P.length);
for (const p of P) { b.push(p.length); for (const row of p) b.push(...row); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes, ${P.length} patterns, 4 bars x 16 rows at tempo ${TEMPO_T} (~${Math.round(3600 / (TEMPO_T * 4))} BPM)`);
