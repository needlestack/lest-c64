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
// Ch2 DATA (2026-10-16, the user: "computer information transmission"): an upper register in 16ths, each
//   note trilling in 32nds or chirping per tick, its runs drawn from the chord over the current bass note.
//   Each section is a PACKET: the same sync figure on beat 0, a seeded payload, a burst to close.
//   On every beat its pulse width sweeps (the Accent instrument) and the shared filter throbs.
// Ch3 LEAD (2026-10-16): a smooth triangle in long lines -- held notes, glides, and slow bends into
//   the spicy notes. Unfiltered: it sits clear above the filtered two.
// Voices: default drone + data + lead. MELODY=1 puts Bloom on ch2 instead of data, HEART=1 the
//   heartbeat on ch3 instead of the lead,
//   STEAM=1 the steam engine on ch3 instead of the lead (DATA=0 leaves ch2 silent),
//   DRONEONLY=1 the drone alone, LEAD=0 drone + data. DATAWAVE=tri, DATAHALF=1: see DW/DSTEP. DATASEED=n rerolls the payload; THROB=n the filter throb depth.
// TEMPO_T 10: a row is 10 ticks (~167 ms on NTSC) = a 16th; a beat is 4 rows (90 bpm); a 32-row
//   pattern ~5.3 s; the loop is 8 of them. (Tempo 8, 112.5 bpm, until 2026-10-16.)
// Built from the format and the SID's behaviour, NOT heard: tune by ear in GoatTracker.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
const OUT = process.argv[2] ?? 'music/deep.sng';

const T = { wave: [], pulse: [], filt: [], speed: [] };
// a table's FF jump is written relative to its own first row (FF 02 = its row 2) and made absolute
// here -- GoatTracker's jumps are absolute positions in the shared table, so a relative jump in any
// table but the first lands in another instrument's rows. ($00 = stop stays $00.)
const add = (t, rows) => { const at = T[t].length + 1;
  T[t].push(...rows.map(([l, r]) => l === 0xff && r ? [l, r + at - 1] : [l, r])); return at; };

// ---- speedtable entries first: commands name them by index ----
// DRONEGLIDE=hex: the drone's toneportamento speed per tick. $06 slides A1->F1 in ~0.5 s; the default
// $40 gets there in ~3 ticks (50 ms) -- a clean NOTE CHANGE that still never retriggers the drone (its
// attack, pulse and filter sweeps run on through it). The user, 2026-10-15: the slides were "too slow
// or too close to read as note changes".
// $0C (2026-10-15, the user: "bring back the glide ... about twice as fast" as the first $06): ~1/4 s.
const S_BASSGLIDE = add('speed', [[0x00, parseInt(process.env.DRONEGLIDE ?? '0c', 16)]]);
const S_MELGLIDE  = add('speed', [[0x00, 0x10]]);   // $0010/tick: ~0.5 s per semitone up high
const S_MELVIB    = add('speed', [[0x05, 0x14]]);   // slow, shallow vibrato
// the LEAD's speeds are CALCULATED (left bit 7): a semitone at the sounding note, shifted right by the
// right side, per tick -- so a slide takes the same time in any register. Glide 1/4 semitone a tick;
// bend 1/32 (~0.6 s a semitone, with tick 0 of each row skipped); vibrato 5 ticks a way at 1/64.
const LGLIDE_DIV = 2, LBEND_DIV = 5;
const S_LGLIDE = add('speed', [[0x80, LGLIDE_DIV]]);
const S_LBEND  = add('speed', [[0x80, LBEND_DIV]]);
const S_LVIB   = add('speed', [[0x85, 0x06]]);

// DATAWAVE=tri: the data voice plays a TRIANGLE ($11) instead of the pulse ($41) -- its pulse sweep
// then does nothing. DATAHALF=1: the data voice moves in 8ths, half the speed (2026-10-16 variations).
// TEMPO_T: ticks a row. 8 was 112.5 bpm; 10 (2026-10-16, the user: "the overall tempo needs to be
// slower ... drop it about 20%") is 90 bpm, exactly 20% slower. Everything timed in ticks follows it.
const TEMPO_T = +(process.env.TEMPOT ?? 10);
const DW = process.env.DATAWAVE === 'tri' ? 0x11 : 0x41;
const DSTEP = process.env.DATAHALF === '1' ? 2 : 1;
// and so does the motion INSIDE a note (the user: the 8ths version still had "the same feel as the
// 16th"): the trill's step is TD+1 ticks (half a row = 32nds; a row at half speed = 16ths), the
// chirp's CD+1 (1, 2)
// (per set of data instruments: see dataSet)
// DATAMIX=1 (2026-10-16, the user: "the 1/8 triangle pattern over it. And after a bit, the 1/16 pulse
// pattern"): BOTH sets in one song -- 8 sections of triangle 8ths, then 8 of pulse 16ths, each with
// its own instruments; the pulse half switches the filter to the throb (pattern command AXY).
// SONG=1 (2026-10-16, the user's arrangement): four passes of the bass loop -- the drone alone; + the
// steam; + the triangle 8ths; the triangle swapped for the pulse 16ths -- then back to the start.
const SONG = process.env.SONG === '1';
const DATAMIX = process.env.DATAMIX === '1' || SONG;
const DATA = process.env.DRONEONLY !== '1' && process.env.MELODY !== '1' && process.env.DATA !== '0';
// The SID has ONE filter, and an instrument with a filtertable takes it over -- so the drone's table
// is the only one, and it carries both motions. Per 32-tick beat: the THROB (cutoff up 6*s over 2
// ticks, back down s a tick over 12), then the slow DRIFT (one tick), then a 17-tick hold. The drift
// climbs +6 a beat for 10 beats and falls back over 9: a 19-beat (608-tick) breath, still not a
// multiple of the 256-tick section. The table starts with the drone's first note, on song tick 0, and
// its rows are exactly tick-counted (the set rows share one tick, a jump costs none), so the throb
// stays on the beat for ever. With the data voice on, the filter takes ch2 as well (mask 3); the steam
// is IN the filter too (mask +4). (The hold is 4*TEMPO_T-15 ticks: a beat is 4 rows.)
// No throb (THROB=0, and the default for the lower-energy 8ths -- the user, 2026-10-16: "too fast --
// that should go back to a long filter sweep"): the drone's own breath from before the data voice,
// 16 stairs up and 16 down (4 ticks of +1, a 15-tick hold), 608 ticks, no beat in it at all.
const THROB = +(process.env.THROB ?? (DATA && DSTEP === 1 && !DATAMIX ? 2 : 0));
const THROB_MIX = +(process.env.THROB ?? 2);                     // the throb the mix's pulse half uses
const beatF = (d, t) => [[0x02, (6 * t) & 0xff], [0x0c, -t & 0xff], [0x01, d & 0xff], [4 * TEMPO_T - 15, 0x00]];
const STEAMON = process.env.STEAM === '1' || SONG;
const FMASK = 0xa1 | (DATA ? 2 : 0) | (STEAMON ? 4 : 0);
const FILT_THROB = t => [[0x90, FMASK], [0x00, 0x08],
  ...[...Array(10)].flatMap(() => beatF(6, t)), ...[...Array(8)].flatMap(() => beatF(-7, t)), ...beatF(-4, t),
  [0xff, 0x03]];
// STAIRS=8: the same ~10 s breath (608 ticks) and range in 8 steps of 8 instead of 16 of 4 -- half
// the table (64 bytes), coarser steps; for a build short of room (2026-10-16 sound test)
const STAIRS = +(process.env.STAIRS ?? 16), SPT = 608 / 2 / STAIRS;      // ticks per stair
const FILT_SWEEP = [[0x90, FMASK], [0x00, 0x08],
  ...[...Array(STAIRS)].flatMap(() => [[0x04, 64 / STAIRS / 4], [SPT - 4, 0x00]]),
  ...[...Array(STAIRS)].flatMap(() => [[0x04, -(64 / STAIRS / 4) & 0xff], [SPT - 4, 0x00]]),
  [0xff, 0x03]];
const DRONE_FILT = THROB ? FILT_THROB(THROB) : FILT_SWEEP;
// ---- the data voice: instant attack, short release; the hard restart (gate timer 2) cuts each note
// 2 ticks early, so every note is a separate blip. One SET of four instruments per (wave, speed):
const dataSet = ({ tag, dw, dstep }) => {
  const TD = Math.round(TEMPO_T / 2) * dstep - 1, CD = dstep - 1;
  return [
  { name: `${tag} accent`, ad: 0x00, sr: 0xc4,
    // on the beat: the trill (root / octave) and the pulse sweep, thin -> hollow -> thin over the
    // beat. The off-beat instruments have NO pulsetable, so the sweep runs on under them.
    wave:  [[dw, 0x00], [TD, 0x0c], [TD, 0x00], [0xff, 0x02]],
    pulse: [[0x81, 0x00], [2 * TEMPO_T, Math.round(0x300 / (2 * TEMPO_T))], [2 * TEMPO_T, -Math.round(0x300 / (2 * TEMPO_T)) & 0xff], [0xff, 0x00]] },
  { name: tag, ad: 0x00, sr: 0xa4,
    wave:  [[dw, 0x00], [TD, 0x0c], [TD, 0x00], [0xff, 0x02]] },    // the root / octave trill
  { name: `${tag} fifth`, ad: 0x00, sr: 0xa4,
    wave:  [[dw, 0x00], [TD, 0x07], [TD, 0x00], [0xff, 0x02]] },    // root / fifth
  { name: `${tag} chirp`, ad: 0x00, sr: 0x94,
    // a chord swept up and down ONE TICK a step (60 Hz): the modem sound
    wave:  [[dw, 0x00], [CD, 0x07], [CD, 0x0c], [CD, 0x13], [CD, 0x0c], [CD, 0x07], [0xff, 0x01]] }];
};
const DSET_ENV = { tag: 'Data', dw: DW, dstep: DSTEP };
const DSET_TRI = { tag: 'Tri', dw: 0x11, dstep: 2 }, DSET_PUL = { tag: 'Data', dw: 0x41, dstep: 1 };
const DATASETS = DATAMIX ? [DSET_TRI, DSET_PUL] : [DSET_ENV];
const INSTR = [
  { name: 'Drone', ad: 0x8f, sr: 0xf8,
    wave:  [[0x41, 0x00], [0xff, 0x00]],
    // pulse width $400 <-> $800, round and hollow, never the thin buzzy end. A 680-tick cycle (340 up,
    // 340 down at 3/tick): NOT a multiple of the 256-tick section, so it drifts across the note changes
    pulse: [[0x84, 0x00], [0x7f, 0x03], [0x7f, 0x03], [0x56, 0x03],
                          [0x7f, 0xfd], [0x7f, 0xfd], [0x56, 0xfd], [0xff, 0x02]],
    // lowpass, resonance A, cutoff kept LOW ($08-$44) so the drone stays dark; it breathes in steps
    // over ~10 s (608 ticks). (It was 128 ticks: in lockstep with the bass; then 19-tick stairs, until
    // the data voice's beat needed the same table -- DRONE_FILT, above.)
    filt:  DRONE_FILT },
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
  { name: 'Lead', ad: 0x8a, sr: 0xca, vib: S_LVIB, vibDelay: 0x20,
    // a plain triangle, soft attack, long release; the wavetable stops at once so the realtime slides
    // and the vibrato own the pitch (a running wavetable would lock them out)
    wave:  [[0x11, 0x00], [0xff, 0x00]] },
  // ---- ch3 STEAM v3 (2026-10-16, the user: "a low filtered noise (same filter as the bass) ... modulate
  // the 'pitch' of the noise up and down in a four level CHUG-a-chug-a, never stopping, no attack,
  // flowing up and down in rhythm"). ONE noise note, struck once and never released; the pattern only
  // glides its noise clock between four levels (3XY), so it rises and falls with no envelope at all.
  // (v1: Hubbard's per-frame noise/pulse switching with an a-tempo start-up -- "too literal"; v2:
  // separate strokes, lagged behind the beat, a C1 pulse grumble -- inaudible on a laptop.)
  { name: 'Steam', ad: 0x00, sr: 0xc8,                           // (release 8: SONG keys it off)
    wave:  [[0x81, 0x00], [0xff, 0x00]] },                     // the wavetable stops, so 3XY owns the pitch
  ...DATASETS.flatMap(d => dataSet(d)),
];
for (const i of INSTR) {
  i.wp = add('wave', i.wave);
  i.pp = i.pulse ? add('pulse', i.pulse) : 0;
  i.fp = i.filt ? add('filt', i.filt) : 0;
}
const I = Object.fromEntries(INSTR.map((x, n) => [x.name, n + 1]));
// the mix's second filter table, started from a pattern (the drone's own is the sweep)
// (THROB=0: no second table -- the pulse half keeps the sweep, and its first row carries no AXY)
const FTHROB_AT = DATAMIX && THROB_MIX ? add('filt', FILT_THROB(THROB_MIX)) : 0;

const NOTE = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
const n = s => { const m = /^([A-G]#?)(\d)$/.exec(s); return 0x60 + 12 * +m[2] + NOTE[m[1]]; };
const REST = 0xbd, KEYOFF = 0xbe, PORTA = 0x3, TEMPO = 0xf;
// an event: [row, note, instrument, command, data]; a GLIDE is a note with command 3 and no
// instrument -- toneportamento slides the sounding note to it without retriggering
const pat = (events, rows = 32) => {
  const r = [...Array(rows)].map(() => [REST, 0, 0, 0]);
  // an event is one row, or a GROUP of rows (a glide): flatten the groups
  for (const [row, note, ins = 0, cmd = 0, data = 0] of events.flatMap(e => Array.isArray(e[0]) ? e : [e]))
    r[row] = [note === null ? REST : note === 'off' ? KEYOFF : typeof note === 'number' ? note : n(note), ins, cmd, data];
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
const B_IN  = def([[0, 'A1', I['Drone'], TEMPO, TEMPO_T]], 8);     // starts the drone, sets the tempo
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

// ---- ch2: data ----
// The chord over each bass note (pitch classes, root first) and one OUTSIDE tone for the payload to
// brush past: A minor's G#, F's E, Bb's A, E's F (its flat 2nd), D minor's G# (the tritone).
const CHORD = { A1: [[9, 0, 4], 8], F1: [[5, 9, 0], 4], 'A#1': [[10, 2, 5], 9], E1: [[4, 8, 11], 5], D1: [[2, 5, 9], 8] };
const BASS = ['A1', 'F1', 'A#1', 'E1', 'A1', 'F1', 'D1', 'E1'];
let seed = +(process.env.DATASEED ?? 1);
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const LO = n('G3'), HI = n('F5');
// a packet over one bass note: 8 beats of 4 sixteenths
// REUSE=1 (SONG's default): one packet per (bass note, set, filter command) -- the bass line plays A
// and F twice, so those sections replay their first packet instead of storing a second (2026-10-16:
// the song has to fit the level region).
const PKCACHE = new Map(), REUSE = (process.env.REUSE ?? (SONG ? '1' : '0')) === '1';
const packet = (bass, set, fcmd) => {
  const key = `${bass}|${set.tag}|${fcmd ?? ''}`;
  if (REUSE && PKCACHE.has(key)) return PKCACHE.get(key);
  const p = packetNew(bass, set, fcmd); PKCACHE.set(key, p); return p;
};
const packetNew = (bass, { tag, dstep: DSTEP }, fcmd) => {
  const [pcs, out] = CHORD[bass];
  const lad = []; for (let v = LO; v <= HI; v++) if (pcs.includes((v - 0x60) % 12)) lad.push(v);
  const root = lad.findIndex(v => v >= n('A3') && (v - 0x60) % 12 === pcs[0]);
  const near = v => { for (let d = 1; ; d++) for (const w of [v + d, v - d]) if ((w - 0x60) % 12 === out) return w; };
  const at = i => lad[Math.max(0, Math.min(lad.length - 1, i))];
  const FIG = {
    up:    i => [at(i), at(i + 1), at(i + 2), at(i + 3)],
    down:  i => [at(i + 3), at(i + 2), at(i + 1), at(i)],
    osc:   i => [at(i), at(i + 2), at(i), at(i + 2)],
    zig:   i => [at(i), at(i + 2), at(i + 1), at(i + 3)],
    burst: i => [at(i), at(i), 'off', null],
    blink: i => [at(i), 'off', at(i + 1), 'off'],
    hold:  i => [at(i), null, null, null],                       // one note, the trill carries it
    out:   i => [at(i), near(at(i)), at(i), 'off'],              // brushing the outside tone
  };
  const ev = [];
  // the lower-energy 8ths drop the chirp (the user, 2026-10-16: "the chirps are too much here ... the
  // trill is ok"): its notes take the plain trill. Swapped in place, so the seeded notes don't move.
  const CHIRP = DSTEP === 2 ? I[tag] : I[`${tag} chirp`];
  // NO ROW IS SILENT (the user, 2026-10-16: "never stop outright ... keep the rhythm going almost like
  // a hi-hat or a modem running at 120 baud"): where a figure rests or keys off, the last note is
  // struck again -- its own 16th blip and trill -- so the melody pauses but the carrier never does
  let last = null;
  const beat = (b, notes, ins) => notes.forEach((v, k) => {
    if (v === null || v === 'off') v = last; else last = v;
    // at half speed a note lasts two rows (the trill runs on through the second), and the third note
    // of a figure falls on the next beat, so it takes the accent (the pulse sweep) too
    ev.push([(b * 4 + k) * DSTEP, v, DSTEP === 2 && k === 2 ? I[`${tag} accent`] : ins[k]]); });
  // beat 0, the SYNC: the same figure on every packet (root, octave, root, octave; chirping)
  beat(0, [at(root), at(root + 3), at(root), at(root + 3)], [I[`${tag} accent`], CHIRP, CHIRP, CHIRP]);
  // 8 figures of 4 notes a packet -- 4 at half speed: sync, payload, end
  const NF = 8 / DSTEP;
  for (let b = 1; b < NF - 1; b++) {
    const notes = FIG[pick(['up', 'down', 'osc', 'zig', 'blink', 'hold', 'out', 'up', 'osc'])](Math.floor(rnd() * (lad.length - 3)));
    beat(b, notes, [I[`${tag} accent`], ...[1, 2, 3].map(() => pick([I[tag], I[tag], I[`${tag} fifth`], CHIRP]))]);
  }
  beat(NF - 1, FIG[pick(['burst', 'blink'])](root), [I[`${tag} accent`], I[tag], I[tag], I[tag]]);   // end of packet
  if (fcmd) ev[0].push(...fcmd);                                // e.g. AXY: hand the filter a table
  return def(ev);
};
// ---- ch3: the lead ----
// [section, row, how, note]: HIT strikes the note; GLIDE and BEND slide to it without a retrigger
// (3XY held on every row of the slide -- rows computed from the distance, see GLIDE_ROWS); OFF lets
// it ring away. The spice is in the bends: F over A, C# over Bb, G against E's G#, Bb over A, G# over
// F, F# over D, D# under E -- each reached slowly, most of them leaned back out of.
const LEAD = [
  [0, 0, 'hit', 'A4'], [0, 6, 'glide', 'C5'], [0, 12, 'glide', 'E5'], [0, 20, 'bend', 'F5'],
  [1, 10, 'glide', 'E5'], [1, 20, 'glide', 'C5'], [1, 26, 'glide', 'D5'],
  [2, 6, 'bend', 'C#5'], [2, 18, 'glide', 'F5'], [2, 27, 'glide', 'G#5'],
  [3, 12, 'bend', 'G5'], [3, 22, 'glide', 'E5'], [3, 28, 'off'],
  [4, 0, 'hit', 'E5'], [4, 4, 'glide', 'A5'], [4, 14, 'bend', 'A#5'], [4, 26, 'bend', 'A5'],
  [5, 8, 'bend', 'G#5'], [5, 18, 'glide', 'E5'], [5, 26, 'glide', 'C5'],
  [6, 0, 'glide', 'D5'], [6, 8, 'glide', 'F5'], [6, 16, 'bend', 'F#5'], [6, 26, 'glide', 'E5'],
  [7, 6, 'bend', 'D#5'], [7, 16, 'bend', 'E5'], [7, 24, 'off'],
];
const leadPats = (() => {
  const tl = [...Array(256)].map(() => null);
  let cur = null, free = 0;
  for (const [sec, row, how, note] of LEAD) {
    const at = sec * 32 + row;
    if (at < free) throw new Error(`lead: ${how} ${note ?? ''} at ${sec}:${row} starts inside the slide before it`);
    if (how === 'hit') { tl[at] = [at % 32, note, I['Lead']]; cur = n(note); free = at + 1; continue; }
    if (how === 'off') { tl[at] = [at % 32, 'off']; free = at + 1; continue; }
    const div = how === 'glide' ? LGLIDE_DIV : LBEND_DIV, sp = how === 'glide' ? S_LGLIDE : S_LBEND;
    // all but tick 0 of a row run the slide (tick 0 is skipped), and one spare row to be sure it lands
    const rows = Math.ceil(Math.abs(n(note) - cur) * 2 ** div / (TEMPO_T - 1)) + 1;
    for (let k = 0; k < rows; k++) tl[at + k] = [(at + k) % 32, k ? null : note, 0, PORTA, sp];
    cur = n(note); free = at + rows;
  }
  return [...Array(8)].map((_, sec) => def(tl.slice(sec * 32, sec * 32 + 32).filter(Boolean)));
})();
// ---- ch3: steam ----
// CHUG-a-chug-a: four 8th-note syllables over two beats, STEAMLV = their levels (high CHUG, low a, mid
// chug, low a). The HIGH points are SHORT (the user, 2026-10-16): a high syllable rises fast (STEAMUP)
// and on its second row already falls (STEAMDOWN) toward the next low level, so the peak lasts about
// half its 8th while the rhythm of the peaks stays exact. Speeds are hex frequency units a tick.
// v3.2 (2026-10-16, "half the dynamic range"): peaks an octave (C3) and a minor 6th (A#2) over the
// lows, was two octaves and a 12th; the speeds a third of before (the distances are), so the shape
// keeps its timing: up in ~4 ticks, down in ~8 -- the fall MUST land inside its row: the low rows
// carry the flutter (4XY), and a glide still under way when they start stops where it is, short of the low.
// The flutter, in frequency units at the lows (a semitone at C2-D2 is ~66-74). Read off the player's
// vibrato counter (mt_effect_4): at speed 2 it moves +2 ticks, then -4, +4, -4 ... -- CENTRED on the
// note, swinging 4x the depth peak to peak. So 15 a tick is ~0.9 semitone of swing, 41 ~2.5. (The
// first guess counted 2x and swung twice as wide as asked.)
// FLUTTER=1: the low syllables, settled at their level, FLUTTER (vibrato, 4XY: STEAMFS ticks each way)
// with a depth that swells and fades over the 8-section loop (FLUTMIN..FLUTMAX units a tick, 8
// steps) -- the noise's own slow sweep. 3XY and 4XY are both realtime and only one runs on a row, so
// the flutter takes the rows where the glide has already landed.
const STEAMLV = (process.env.STEAMLV ?? 'C3,C2,A#2,D2').split(',');
const spd = v => [v >> 8, v & 0xff];
const S_SUP = add('speed', [spd(parseInt(process.env.STEAMUP ?? '0118', 16))]);
const S_SDN = add('speed', [spd(parseInt(process.env.STEAMDOWN ?? '0090', 16))]);
const FLUTTER = process.env.FLUTTER === '1';
const FS = +(process.env.STEAMFS ?? 2), FMIN = +(process.env.FLUTMIN ?? 15), FMAX = +(process.env.FLUTMAX ?? 41);
const S_FLUT = [...Array(8)].map((_, k) => add('speed', [[FS, Math.round(FMIN + (FMAX - FMIN) * k / 7)]]));
const STEAM_IN = def([[0, STEAMLV[3], I['Steam']]], 8);                 // the one strike: in the intro
// strike: the pattern that starts the steam strikes its note on the first CHUG instead of gliding there
const steamPat = (sec, strike) => def([...Array(16)].flatMap((_, k) => {
  const r = k * 2, hi = !(k & 1), next = STEAMLV[(k + 1) & 3];
  if (hi) return [strike && !k ? [r, STEAMLV[0], I['Steam']] : [r, STEAMLV[k & 3], 0, PORTA, S_SUP], [r + 1, next, 0, PORTA, S_SDN]];
  // the flutter's depth: a triangle over the loop, 0 -> 7 -> 0 across 128 syllables
  const t = sec * 16 + k, step = Math.round(7 * (1 - Math.abs(t / 64 - 1)));
  return FLUTTER ? [[r, null, 0, 0x4, S_FLUT[step]], [r + 1, null, 0, 0x4, S_FLUT[step]]]
                 : [[r, null, 0, PORTA, S_SDN], [r + 1, null, 0, PORTA, S_SDN]];
}));
const STEAM1 = FLUTTER ? null : steamPat(0);                            // without flutter, one pattern
const STEAMS = BASS.map((_, sec) => FLUTTER ? steamPat(sec) : STEAM1);
const SIL = def([]), SIL_IN = def([], 8);
const BLOOP = [B_A, B_F, B_BB, B_E, B_A, B_F, B_D, B_E];
// PASSES=3 (SONG): the first three passes only -- no pulse 16ths -- for a test that needs it smaller
const PASSES = +(process.env.PASSES ?? 4);
const ORDER = SONG && PASSES === 3 ? [
  [B_IN, ...BLOOP, ...BLOOP, ...BLOOP],
  [SIL_IN, SIL, ...Array(7).fill(SIL), ...Array(8).fill(SIL), ...BASS.map(bs => packet(bs, DSET_TRI))],
  [SIL_IN, def([[0, 'off']]), ...Array(7).fill(SIL), steamPat(0, true), ...Array(7 + 8).fill(STEAM1)],
] : SONG ? [
  [B_IN, ...BLOOP, ...BLOOP, ...BLOOP, ...BLOOP],
  // pass 1's first row hands the filter back the slow sweep (pass 4 had the throb)
  [SIL_IN, FTHROB_AT ? def([[0, null, 0, 0xa, INSTR[0].fp]]) : SIL, ...Array(7).fill(SIL), ...Array(8).fill(SIL),
   ...BASS.map(bs => packet(bs, DSET_TRI)),
   ...BASS.map((bs, k) => packet(bs, DSET_PUL, k || !FTHROB_AT ? null : [0xa, FTHROB_AT]))],
  // pass 1 keys the steam off (it fades on its release), pass 2 strikes it
  [SIL_IN, def([[0, 'off']]), ...Array(7).fill(SIL), steamPat(0, true), ...Array(7 + 16).fill(STEAM1)],
] : [
  [B_IN, ...BLOOP],
  DATAMIX ? [SIL_IN, ...BASS.map((bs, k) => packet(bs, DSET_TRI, k ? null : [0xa, INSTR[0].fp])),
                     ...BASS.map((bs, k) => packet(bs, DSET_PUL, k ? null : [0xa, FTHROB_AT]))] :
  DATA ? [SIL_IN, ...BASS.map(bs => packet(bs, DSET_ENV))] : process.env.MELODY === '1' ? [M_IN, M1, M2, M3, M4, M5, M6, M7, M8] : [SIL_IN, ...BASS.map(() => SIL)],
  process.env.DRONEONLY === '1' ? [SIL_IN, ...BASS.map(() => SIL)] :
    STEAMON ? [STEAM_IN, ...STEAMS] :
    process.env.HEART === '1' ? [D_IN, D1, D2, D1, D2, D1, D2, D1, D2] :
    process.env.LEAD === '0' ? [SIL_IN, ...BASS.map(() => SIL)] : [SIL_IN, ...leadPats],
];
const RESTART = 1;                                                // loop past the intro

const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('Deep', 32); str('', 32); str('', 32);
b.push(1);
for (const o of ORDER) b.push(o.length + 1, ...o, 0xff, RESTART);
b.push(INSTR.length);
// 1st-frame wave $08 (test bit, gate OFF), not GoatTracker's usual $09 (test + gate): with the gate on and
// no waveform, a 6581 outputs DC times the envelope -- a click as each voice's first note starts, which
// is what the song's restart on a landing sounded like (2026-10-16). The wavetable's first row gates it.
const FIRSTWAVE = parseInt(process.env.FIRSTWAVE ?? '08', 16);
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp, i.pp, i.fp, i.vib ?? 0, i.vibDelay ?? 0, i.gt ?? 0x02, FIRSTWAVE); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1]));
b.push(P.length);
for (const p of P) { b.push(p.length); for (const row of p) b.push(...row); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes, ${INSTR.length} instruments, ${P.length} patterns, loop ${ORDER[0].length - RESTART} x 32 rows at tempo ${TEMPO_T}`);
