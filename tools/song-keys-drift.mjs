// node tools/song-keys-drift.mjs [music/keys-drift.sng] -- the keys build-up, loosened (2026-10-27).
// The user, of music/keys-build3.sng (level 3's song before the organ): "I like the notes, overall, but
// the rolling chords are too predictable maybe? ... take what's there and add some of the more...
// abstractness ... [of] level 3's new music ... slightly more experimental, but based on the same
// feelings ... take a stab at injecting some post-modernism".
//
// WHAT IS KEPT: every SOUND -- the instruments and all four tables are copied byte for byte from
// keys-build3.sng (the struck pulse bass with its noise blips, the ringing triangle keys, the roll and
// its echo, the filter's breath) -- and the HARMONY: the bass line A F Bb E | A F Bb E | A F Bb E D C Bb
// E, the dyad over each note, the roll's chord tones (the F E D A cell under D C Bb, E G# A B C D under
// the last E), and the arc: dyads alone, then more, then the rolls.
// WHAT IS LOOSENED (organ-atmos's lessons, and its "no meter"):
// - TIME: the bass notes are uneven (BASSLEN seconds, each stretched or squeezed by up to RUBATO), and
//   nothing else sits on a grid either -- the row is 1/12 s, half a 16th of the original.
// - THE DYAD is struck like a hand, not a sequencer: the upper note late by a different amount each
//   time, sometimes an octave up, sometimes missing.
// - THE ROLLS become GESTURES: a handful of the chord's tones over two octaves, in a contour (up, down,
//   an arch, or scattered), at a rhythm that ACCELERATES or SLOWS rather than ticking, then silence;
//   the echo voice answers it a few rows late, sometimes an octave up, sometimes not at all.
// - THE NOISE RHYTHM comes in clusters -- a stumble of 2-5 hits, then nothing -- instead of a bar.
// SEED rerolls every chance decision; the same seed is always the same song.
//
// MODE=mid (2026-10-27, the user: "somewhere between this and the original -- particularly with letting
// more of the rolls towards the end happen, though I'm all for them being broken up a bit"):
// - the bass is nearly even again (RUBATO 0.12), the dyad back on count 2 with only a small stagger;
// - the noise is the ORIGINAL's bars (thud + hat in passes 1-2, the k16 kit in pass 3) with hits
//   dropped at random (NKEEP, the share kept, by pass) -- a groove with holes, not a stumble;
// - pass 2 keeps one gesture a note; pass 3 is the ORIGINAL ROLL -- the same 32 notes a bass note, the
//   inversion climb, the F E D A cells, the last E's shuffle -- BROKEN: in runs of 4-12 notes, each run
//   played or left silent, the share played rising through the pass (ROLLP, first note to last), so the
//   end is nearly the whole roll; inside a run, now and then a note held over the next or a group of
//   four turned backwards; the echo two rows behind (the original's one row), dropping out a run at a time.
import { readFileSync, writeFileSync } from 'fs';
const OUT = process.argv[2] ?? 'music/keys-drift.sng';
const env = (k, d) => process.env[k] ?? d;
const SEED = +env('SEED', 3);
const TEMPO_T = +env('TEMPOT', 5), ROW_S = TEMPO_T / 60;   // 5 ticks: 12 rows a second
const BASSLEN = +env('BASSLEN', 5.4), RUBATO = +env('RUBATO', process.env.MODE === 'mid' ? 0.12 : 0.35);
const GEST = env('GEST', process.env.MODE === 'mid' ? '0,1,0' : '0,1.2,3').split(',').map(Number);  // gestures per bass note, by pass (an average)
const BLIPS = env('BLIPS', '1,2,3.5').split(',').map(Number); // noise clusters per bass note, by pass
const ECHO = +env('ECHO', 0.7);                               // the chance the echo answers a gesture
const MID = env('MODE', '') === 'mid';
const NKEEP = env('NKEEP', '0.6,0.7,0.75').split(',').map(Number);
const ROLLP = env('ROLLP', '0.5,0.95').split(',').map(Number);

// ---- the sounds: keys-build3's instruments and tables ----
const src = [...readFileSync(env('FROM', 'music/keys-build3.sng'))];
let o = 4 + 96;
if (src[o++] !== 1) throw new Error('expected one subtune');
for (let v = 0; v < 3; v++) o += src[o] + 2;
const insAt = o, nIns = src[o];
o += 1 + 25 * nIns;
for (let t = 0; t < 4; t++) o += 1 + 2 * src[o];
const SOUNDS = src.slice(insAt, o);                          // instrument count, instruments, the tables
const insName = k => String.fromCharCode(...src.slice(insAt + 1 + 25 * (k - 1) + 9, insAt + 1 + 25 * k)).replace(/\0.*$/, '');
const I = Object.fromEntries([...Array(nIns)].map((_, k) => [insName(k + 1), k + 1]));
for (const nm of ['Keys', 'Keys hi', 'Roll', 'Roll echo', 'Bass key', 'Bass k32'])
  if (!I[nm]) throw new Error(`keys-build3 has no instrument "${nm}"`);
// the wavetable programs the original's patterns point the bass at (8xx): its hiss, its knock, the k16 kit
const HISS = 0x0f, KNOCK = 0x13, KIT = [0x18, 0x1b, 0x1e, 0x21];
// its two filter breaths (Axx): pass 1's, and the one pass 2 hands over
const FILT1 = 0x01, FILT2 = 0x24;

// ---- the material ----
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const n = s => { const m = /^([A-G]#?)(\d)$/.exec(s); if (!m) throw new Error(`note ${s}`); return 0x60 + 12 * +m[2] + NOTE[m[1]]; };
const REST = 0xbd, KEYOFF = 0xbe;
const BASS = { A: 'A1', F: 'F1', Bb: 'A#1', E: 'E1', D: 'D1', C: 'C2' };
const DYAD = { A: ['C4', 'E4'], F: ['C4', 'E4'], Bb: ['D4', 'E4'], E: ['D4', 'E4'], D: ['D4', 'E4'], C: ['C4', 'E4'], Bb2: ['D4', 'F4'], E2: ['D4', 'E4'] };
const FEDA = ['A3', 'D4', 'E4', 'F4'];
const POOL = { A: ['A3', 'C4', 'E4'], F: ['C4', 'E4', 'F4'], Bb: ['A#3', 'D4', 'E4'], E: ['B3', 'D4', 'E4'],
               D: FEDA, C: FEDA, Bb2: FEDA, E2: ['E4', 'G#4', 'A4', 'B4', 'C5', 'D5'] };
// the original roll (song-deep.mjs's KROLL/rollNotes and KB2's cells): 32 notes a bass note
const inv = (c, k) => { let v = [...c]; for (let i = 0; i < k; i++) v = [...v.slice(1), v[0] + 12]; return v; };
const rollNotes = c => [0, 1, 2, 3, 4, 3, 2, 1].flatMap(k => { const v = inv(c.map(n), k); return [v[0], v[1], v[2], v[1]]; });
const CLIMB = [0, 1, 2, 3, 3, 2, 1, 0];
const feda = (k, up) => { const v = inv(FEDA.map(n), k); return up ? v : [...v].reverse(); };
const ROLL = { A: rollNotes(['A3', 'C4', 'E4']), F: rollNotes(['C4', 'E4', 'F4']), Bb: rollNotes(['A#3', 'D4', 'E4']),
  E: rollNotes(['B3', 'D4', 'E4']), D: CLIMB.flatMap(k => feda(k, false)), C: CLIMB.flatMap(k => feda(k, true)),
  Bb2: CLIMB.flatMap((k, b) => feda(k, b % 2 === 1)),
  E2: 'E4 G#4 A4 B4 C5 D5 C5 B4 A4 C5 E4 D5 B4 G#4 B4 D5 G#4 B4 D5 C5 A4 E4 A4 C5 D5 C5 B4 A4 G#4 E4 G#4 B4'.split(' ').map(n) };
// the original's noise bars, as [16th, program]: thud + hat (passes 1-2), the k16 kit (pass 3)
const GRID_BOTH = [[2, HISS], [6, KNOCK], [10, HISS], [12, KNOCK], [14, HISS], [18, HISS], [20, KNOCK], [22, KNOCK], [26, HISS], [28, KNOCK], [30, HISS]];
const GRID_K16 = [[1, 0x18], [2, 0x18], [3, 0x18], [6, 0x1b], [7, 0x1b], [8, 0x1b], [9, 0x1b], [12, 0x1e], [13, 0x1e], [14, 0x1e], [15, 0x1e],
  [18, 0x1b], [19, 0x1b], [20, 0x1b], [21, 0x1b], [24, 0x1e], [25, 0x1e], [26, 0x21], [27, 0x21], [28, 0x18], [29, 0x18], [30, 0x1b]];
const PASSES = [['A', 'F', 'Bb', 'E'], ['A', 'F', 'Bb', 'E'], ['A', 'F', 'Bb', 'E', 'D', 'C', 'Bb2', 'E2']];

// ---- chance, repeatable ----
let s = SEED >>> 0;
const rnd = () => { s = s + 0x6d2b79f5 >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const count = avg => Math.floor(avg) + (rnd() < avg % 1 ? 1 : 0);
const rows = sec => Math.max(1, Math.round(sec / ROW_S));

// ---- the timeline: per voice, row -> [note, instr, cmd, data] ----
const V = [new Map(), new Map(), new Map()];
// put an event on the first free row at or after r (an event never displaces another), before `end`
// (key-offs and a gesture's notes may spill past their bass note: a missing key-off would leave a note
// held at its sustain until the voice's next strike)
const put = (v, r, e, end = Infinity) => { while (V[v].has(r)) r++; if (r >= end) return null; V[v].set(r, e); return r; };
const busy = [[], [], []];                                    // [from, to) spans a voice is sounding a part
const free = (v, a, b) => !busy[v].some(([x, y]) => a < y && b > x);

let t = 0;
PASSES.forEach((pass, pi) => pass.forEach((key, ki) => {
  const len = rows(BASSLEN * (1 + RUBATO * (2 * rnd() - 1))), end = t + len;
  const root = BASS[key.replace(/2$/, '')];
  // the bass: struck (pass 3 with the noise strike), now and then struck again a breath later -- a stutter
  const first = t === 0;
  V[0].set(t, [n(root), pi === 2 ? I['Bass k32'] : I['Bass key'], first ? 0xf : 0, first ? TEMPO_T : 0]);
  if (rnd() < 0.15) put(0, t + ri(2, 4), [n(root), I['Bass key'], 0, 0], end);
  // the filter: pass 1's breath from the top, pass 2's from its first note (on the keys voice: a free row)
  if (first) V[1].set(t, [REST, 0, 0xa, FILT1]);
  if (pi === 1 && ki === 0) put(1, t, [REST, 0, 0xa, FILT2]);
  // MID: the original's bar, stretched to this note's length, each hit kept or dropped
  const at16 = k => t + Math.round(k * len / 32);
  if (MID) for (const [k, w] of pi === 2 ? GRID_K16 : GRID_BOTH) if (rnd() < NKEEP[pi]) put(0, at16(k), [REST, 0, 0x8, w], end);
  // the noise: clusters, a stumble of hits, each a hiss or a knock (the kit in pass 3)
  if (!MID) for (let c = count(BLIPS[pi]); c > 0; c--) {
    let r = t + ri(3, len - 6);
    const kinds = pi === 2 ? [HISS, KNOCK, ...KIT] : [HISS, KNOCK];
    for (let h = ri(2, 5); h > 0 && r < end - 1; h--) { put(0, r, [REST, 0, 0x8, pick(kinds)], end); r += ri(1, 3); } }
  // MID pass 3: the broken roll, and no dyad (the original's roll took the dyad voices too)
  if (MID && pi === 2) {
    const seq = ROLL[key], p = ROLLP[0] + (ROLLP[1] - ROLLP[0]) * ki / (pass.length - 1);
    for (let j = 0; j < 32;) {
      const L = Math.min(32 - j, ri(4, 12)), play = rnd() < p, echo = rnd() < 0.75;
      if (play) {
        let run = seq.slice(j, j + L);
        if (L >= 4 && rnd() < 0.15) { const g = ri(0, L - 4); run = [...run.slice(0, g), ...run.slice(g, g + 4).reverse(), ...run.slice(g + 4)]; }
        for (let q = 0; q < L; q++) {
          if (q && rnd() < 0.1) continue;                       // held over: the note before rings on
          const last = q === L - 1;
          put(1, at16(j + q), [run[q], I['Roll'], last ? 0x6 : 0, last ? 0xab : 0]);
          if (echo) put(2, at16(j + q) + 2, [run[q], I['Roll echo'], last ? 0x6 : 0, last ? 0x5b : 0]); }
        put(1, at16(j + L), [KEYOFF, 0, 0, 0]);
        if (echo) put(2, at16(j + L) + 2, [KEYOFF, 0, 0, 0]); }
      j += L; }
    t = end; return; }
  // the dyad: the lower note somewhere around count 2 (MID: on it, give or take a row), the upper late by
  // a hand's unevenness (MID: a few rows)
  const [lo, hi] = DYAD[key], at = MID ? at16(8) + ri(-1, 1) : t + rows(0.8 + rnd() * 1.4);
  const r1 = put(1, at, [n(lo), I['Keys'], 0, 0], end);
  put(1, r1 + rows(0.5 + rnd() * 1.2), [KEYOFF, 0, 0, 0]);
  busy[1].push([r1, r1 + rows(2)]);
  if (rnd() < (MID ? 0.95 : 0.85)) {
    const up = rnd() < (MID ? 0.1 : 0.25) ? 12 : 0, r2 = put(2, at + (MID ? ri(0, 3) : ri(1, 10)), [n(hi) + up, I['Keys hi'], 0, 0], end);
    if (r2 !== null) { put(2, r2 + rows(0.5 + rnd() * 1.2), [KEYOFF, 0, 0, 0]); busy[2].push([r2, r2 + rows(2)]); } }
  // the gestures: chord tones over two octaves, a contour, a rhythm that speeds up or slows down
  const tones = [...POOL[key].map(n), ...POOL[key].map(x => n(x) + 12)].sort((a, b) => a - b);
  for (let g = count(GEST[pi]); g > 0; g--) {
    const k = ri(3, pi === 2 ? 9 : 6), shape = pick(['up', 'down', 'arch', 'scatter']);
    let line;
    const i0 = ri(0, Math.max(0, tones.length - k));
    const run = [...Array(k)].map((_, j) => tones[Math.min(tones.length - 1, i0 + j)]);
    line = shape === 'up' ? run : shape === 'down' ? [...run].reverse()
      : shape === 'arch' ? [...run.slice(0, Math.ceil(k / 2)), ...run.slice(0, Math.floor(k / 2)).reverse()]
      : [...Array(k)].map(() => pick(tones));
    const accel = rnd() < 0.5, d0 = accel ? ri(3, 5) : 1, ratio = accel ? 0.72 : 1.4;
    const durs = line.map((_, j) => Math.max(1, Math.min(6, Math.round(d0 * ratio ** j))));
    const span = durs.reduce((a, b) => a + b, 0) + 6;
    let r = t + ri(rows(1.5), Math.max(rows(1.5), len - span - 2));
    if (!free(1, r, r + span)) continue;                      // a silence instead: that is allowed too
    busy[1].push([r, r + span]);
    const echoD = ri(3, 9), echoUp = rnd() < 0.35 ? 12 : 0, echo = rnd() < ECHO && free(2, r + echoD, r + echoD + span);
    if (echo) busy[2].push([r + echoD, r + echoD + span]);
    line.forEach((x, j) => {
      const last = j === line.length - 1;
      put(1, r, [x, I['Roll'], last ? 0x6 : 0, last ? 0xab : 0]);           // the last note rings (release B)
      if (echo) put(2, r + echoD, [x + echoUp, I['Roll echo'], last ? 0x6 : 0, last ? 0x5b : 0]);
      r += durs[j]; });
    put(1, r + 2, [KEYOFF, 0, 0, 0], end);
    if (echo) put(2, r + echoD + 2, [KEYOFF, 0, 0, 0], end);
  }
  t = end;
}));
const TOTAL = t;
// the loop: every voice let go before the top (the original's last roll note "lingering" into pass 1
// was a choice there; here the top is the bass alone)
for (const v of [1, 2]) if (!V[v].has(TOTAL - 1)) V[v].set(TOTAL - 1, [KEYOFF, 0, 0, 0]);

// ---- patterns: each voice's timeline cut into 128-row patterns ----
const P = [], PLEN = 128;
const pat = rs => { const key = JSON.stringify(rs), had = P.findIndex(p => JSON.stringify(p.slice(0, -1)) === key);
  if (had >= 0) return had;
  P.push([...rs, [0xff, 0, 0, 0]]); return P.length - 1; };
const ORDER = V.map(m => { const all = [...Array(TOTAL)].map((_, r) => m.get(r) ?? [REST, 0, 0, 0]), out = [];
  for (let k = 0; k < TOTAL; k += PLEN) out.push(pat(all.slice(k, k + PLEN)));
  return out; });
const b = [];
const str = (x, len) => { for (let k = 0; k < len; k++) b.push(k < x.length ? x.charCodeAt(k) : 0); };
str('GTS5', 4); str('Keys drift', 32); str('', 32); str('', 32);
b.push(1);
for (const ol of ORDER) b.push(ol.length + 1, ...ol, 0xff, 0);
b.push(...SOUNDS);
b.push(P.length);
for (const p of P) { b.push(p.length); for (const row of p) b.push(...row); }
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes; a ${(TOTAL * ROW_S).toFixed(0)} s loop, ${P.length} patterns, seed ${SEED}`);
