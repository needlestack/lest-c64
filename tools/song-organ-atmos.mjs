// song-organ-atmos.mjs -- the organ siciliano's mood as ATMOSPHERE, a GoatTracker 2 song (.sng).
//
//   node tools/song-organ-atmos.mjs [out.sng]        (default music/organ-atmos.sng)
//
// The user (2026-10-27), of music/organ-siciliano.sng (tools/song-organ.mjs): "i like this piece. keep it
// around. but i think it's too directly musical for this situation ... keeping some of the mood but making
// it more like atmosphere and less like a piece of music. i like the chord structures ... more like a
// post-modern piece? ... more sparse? sections of held notes. moments of dissonance?"
// What is kept: C minor, the siciliano's harmony (Cm, Ab, Fm, G; Cm, Eb, Ab, G) and its melodic CELLS.
// What goes: the meter (changes fall every 6-16 s, never on a beat), the tune, the pulse.
// - Voices 1-2 HOLD the harmony: long triangle tones, swelling in slowly, legato from chord to chord,
//   through a low-pass that breathes on its own ~20 s cycle; silences between the groups, where the
//   release tails ring on.
// - The dissonance is SUSPENSION: the upper tone hangs on into the next chord and rubs before it moves
//   (G over the Ab bass: a major 7th; Ab over the G bass: a minor 9th; F over G: the 7th).
// - Voice 3 plays only FRAGMENTS of the siciliano's cells (G-Ab-G, Eb-F-D ...) in its long-short-long
//   lilt, slowed, with long silences between; some land against the harmony (D over Ab: the tritone).
//   Voice 3 is also the effects channel -- the fragments are sparse, and an effect simply takes it over.
// Every line is `note:seconds` (decimal) or `.:seconds` for silence; each voice must add up to the same
// length. A row is TEMPOT ticks.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const OUT = process.argv[2] ?? 'music/organ-atmos.sng';
const env = (k, d) => process.env[k] ?? d;
const hexv = (k, d) => parseInt(env(k, d), 16);
const TEMPO_T = +env('TEMPOT', 12), ROW_S = TEMPO_T / 60;

// the bass: the progression, in uneven spans (C3 16 s, Ab2 12, F2 12, G2 14, a rest, C3, Eb3, Ab2, G2)
const LOW = env('LOW', '.:2 C3:16 G#2:12 F2:12 G2:14 .:4 C3:12 D#3:10 G#2:8 G2:6');
// the upper held tone, its changes falling ACROSS the bass's (each one a suspension)
const HIGH = env('HIGH', '.:6 G3:14 C4:14 G#3:10 G3:8 B3:4 .:6 D#4:12 G3:10 F3:12');
// the fragments
const FRAG = env('FRAG', '.:10 G4:1.2 G#4:0.6 G4:2.4 .:9.8 D#4:1.2 F4:0.6 D4:3 .:17.2 D4:1.2 D#4:0.6 F4:1.2 B3:4 ' +
  '.:13 C5:1.2 A#4:0.6 G#4:3 .:15.2 D#4:1.2 D4:0.6 C4:4 .:4.2');
// the held tones: slow swell (attack D ~3 s), a long settle to sustain C, release C (~3 s) into the rests
const HELD_AD = hexv('HELDAD', 'dc'), HELD_SR = hexv('HELDSR', 'cc');
// the fragments: a soft onset, legato within a cell, a long tail (release B ~2.4 s)
const FRAG_AD = hexv('FRAGAD', 'd8'), FRAG_SR = hexv('FRAGSR', '9d');
// SOFTER fragments (the user: "make the melody notes softer using the sustain volume trick or filter").
// An ADSR envelope always attacks to FULL volume before it decays, so a quiet sustain alone still peaks
// loud. THE SUSTAIN TRICK: the fragment's wavetable opens with FRAGMUTE frames of gate-without-waveform
// ($01): the envelope runs its attack and decay to the sustain level in silence, and the triangle comes in
// already at that level (use AD 00, so attack+decay take ~8 ms; FRAGSR's high nybble is the volume).
// The notes after the first in a cell are TIED (toneportamento $00), so they do not restart the
// wavetable's mute. FRAGFILT=1 instead (or as well) routes voice 3 into the breathing low-pass.
const FRAG_MUTE = +env('FRAGMUTE', 0), FRAG_FILT = +env('FRAGFILT', 0);
// THE ATTACK TRICK (the user: "make the swell slow enough that it doesn't reach peak volume before
// key-up and release"), which keeps the swell. The SID's attack is LINEAR, so a cell whose gate is held
// FRAGGATE seconds under an attack of A seconds peaks at FRAGGATE/A of full volume, then releases from
// there. The key-off lands FRAGGATE into each cell, wherever its notes fall; the notes after the cell's
// first are tied (toneportamento $00), so the ones after the key-off change pitch inside the release
// tail instead of re-gating. Attack nybbles: D = 3 s, E = 5 s, F = 8 s.
const FRAG_GATE = +env('FRAGGATE', 1.6);
const ATTACK_S = [0.002, 0.008, 0.016, 0.024, 0.038, 0.056, 0.068, 0.08, 0.1, 0.25, 0.5, 0.8, 1, 3, 5, 8];
// the breathing low-pass on voices 1-2: CUTLO..CUTHI in 2-unit steps every BREATH ticks, resonance FRES
const CUTLO = hexv('CUTLO', '40'), CUTHI = hexv('CUTHI', '70'), BREATH = +env('BREATH', 24), FRES = hexv('FRES', '6');
// the tremulant (as song-organ.mjs) on the fragments only; the held tones are still
const TREMDELAY = hexv('TREMDELAY', '18'), TREMSPEED = +env('TREMSPEED', 3), TREMSHIFT = +env('TREMSHIFT', 5);

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const ALIAS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const n = s => { const m = /^([A-G][b#]?)(\d)$/.exec(s); if (!m) throw new Error(`note ${s}`); return 0x60 + 12 * +m[2] + NOTE[ALIAS[m[1]] ?? m[1]]; };
const REST = 0xbd, KEYOFF = 0xbe, CMD_TEMPO = 0xf;

const T = { wave: [], pulse: [], filt: [], speed: [] };
const add = (t, rows) => { const at = T[t].length + 1; T[t].push(...rows); return at; };
const TRI = add('wave', [[0x11, 0x00], [0xff, 0x00]]);
const FRAGW = FRAG_MUTE ? add('wave', [[0xe1, 0x00], ...(FRAG_MUTE > 1 ? [[FRAG_MUTE - 1, 0x00]] : []), [0x11, 0x00], [0xff, 0x00]]) : TRI;
const TREM = add('speed', [[0x80 | TREMSPEED, TREMSHIFT]]);
const breath = v => [...Array((CUTHI - CUTLO) / 2)].flatMap(() => [[0x01, v & 0xff], [BREATH - 1, 0x00]]);
const FP = add('filt', [[0x90, FRES << 4 | (FRAG_FILT ? 0x07 : 0x03)], [0x00, CUTLO], ...breath(2), ...breath(-2), [0xff, T.filt.length + 3]]);
// legato everywhere (gate timer $42); the first note of the song starts the filter's breath (a filter
// pointer restarts its program on every note, so only that one instrument carries it)
const INSTR = [
  { name: 'Held breath', ad: HELD_AD, sr: HELD_SR, fp: FP, vib: 0, vd: 0 },
  { name: 'Held', ad: HELD_AD, sr: HELD_SR, fp: 0, vib: 0, vd: 0 },
  { name: 'Fragment', ad: FRAG_AD, sr: FRAG_SR, wp: FRAGW, fp: 0, vib: TREM, vd: TREMDELAY }];

// a line -> its rows; a note after silence attacks (the legato instrument's gate rises again after the
// key-off), a note after a note only moves the pitch
const line = (s, ins, first) => {
  const rows = [];
  let pos = 0, end = 0, playing = false, firstNote = first;
  for (const t of s.split(/\s+/).filter(Boolean)) {
    const [nm, secs] = t.split(':');
    end += +secs;
    const at = Math.round(pos / ROW_S), to = Math.round(end / ROW_S);
    pos = end;
    if (to <= at) throw new Error(`${t}: shorter than a row`);
    const r = [...Array(to - at)].map(() => [REST, 0, 0, 0]);
    if (nm === '.') { if (playing) r[0] = [KEYOFF, 0, 0, 0]; playing = false; }
    else if (playing && ins === 3 && (FRAG_MUTE || FRAG_GATE)) r[0] = [n(nm), 0, 0x3, 0x00];   // tied: see FRAGMUTE, FRAGGATE
    else { r[0] = [n(nm), firstNote ? 1 : ins, 0, 0]; firstNote = false; playing = true; }
    rows.push(...r); }
  return rows; };
const r1 = line(HIGH, 2, false), r2 = line(LOW, 2, true), r3 = line(FRAG, 3, false);
// FRAGGATE: a key-off FRAGGATE seconds into each cell (on the next row with no note, before the cell ends)
if (FRAG_GATE) {
  const gateRows = Math.round(FRAG_GATE / ROW_S), peaks = [];
  for (let k = 0; k < r3.length; k++) {
    if (r3[k][1] !== 3) continue;
    let j = k + 1, len = 1;
    while (j < r3.length && r3[j][0] !== KEYOFF && (r3[j][0] === REST || r3[j][2] === 0x3)) { j++; len++; }
    if (len <= gateRows) { peaks.push(len * ROW_S); continue; }      // the cell is shorter: its own key-off stands
    let at = k + gateRows;
    while (at < j && r3[at][0] !== REST) at++;
    if (at < j) { r3[at] = [KEYOFF, 0, 0, 0]; peaks.push((at - k) * ROW_S); } else peaks.push(len * ROW_S); }
  const A = ATTACK_S[FRAG_AD >> 4];
  console.log(`fragment peaks (of 15): ${peaks.map(t => (15 * Math.min(1, t / A)).toFixed(1)).join(' ')}`); }
if (r1.length !== r2.length || r3.length !== r2.length) throw new Error(`the lines differ in length: ${r1.length} ${r2.length} ${r3.length} rows`);
r1[0] = [r1[0][0], r1[0][1], CMD_TEMPO, TEMPO_T];

const P = [];
const pat = rows => { const key = JSON.stringify(rows), had = P.findIndex(p => JSON.stringify(p.slice(0, -1)) === key);
  if (had >= 0) return had;
  P.push([...rows, [0xff, 0, 0, 0]]); return P.length - 1; };
const toPats = rows => { const out = []; for (let k = 0; k < rows.length; k += 96) out.push(pat(rows.slice(k, k + 96))); return out; };
const ORDER = [toPats(r1), toPats(r2), toPats(r3)];

const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('Organ atmosphere', 32); str('', 32); str('', 32);
b.push(1);
for (const o of ORDER) b.push(o.length + 1, ...o, 0xff, 0);
b.push(INSTR.length);
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp ?? TRI, 0, i.fp, i.vib, i.vd, 0x42, 0x11); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1]));
b.push(P.length);
for (const p of P) { b.push(p.length); for (const row of p) b.push(...row); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes; a ${(r1.length * ROW_S).toFixed(0)} s loop`);
