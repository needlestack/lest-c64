#!/usr/bin/env node
// sng-hubbard-rhythm.mjs -- the opening rhythm of Rob Hubbard's Master of Magic theme, REBUILT in
// GoatTracker 2 from the disassembly (Games Explained, master-of-magic: music_instruments $C427,
// pattern 9, the drum and octave effects $C1xx). Not a rip: two instruments and one pattern written
// to do what his driver does.
//
//   node tools/sng-hubbard-rhythm.mjs [music/hubbard-rhythm.sng]
//
// ONE voice plays both the drum and the tune. Pattern 9 alternates two instruments, 48 ticks, 3+3+2:
//   G2 BOOM (8) . C5 tick (8) . C4 tick (8) . G2 BOOM (8) . C5 tick (8) . C4 tick (4) . G2 BOOM (4)
//   BOOM (his instrument 7): triangle, AD $0F SR $0F, the DRUM flag -- gate on, then on the note's
//     first tick NOISE with the gate OFF, then the triangle again with the gate still off, so the
//     whole note is a noise click into the long release (rate F) of a pitched triangle.
//   tick (his instrument 8): triangle, AD $0B SR $00 -- a plucked, decaying blip.
//   Both have his OCTAVE ARPEGGIO: 7 frames in 8 an octave up, 1 frame on the note itself, which
//   gives each note its buzzing shimmer (the pitch the drum flag would let fall is rewritten by it,
//   so it does not fall).
// His tempo is a tick every 2 frames; GoatTracker tempo 2 is the same row length. (He wrote for
// PAL, 50 Hz; this plays at 60 on NTSC, 20% faster.) Built from the code, NOT heard: tune by ear.
import { writeFileSync } from 'fs';
const OUT = process.argv[2] ?? 'music/hubbard-rhythm.sng';
const T = { wave: [], pulse: [], filt: [], speed: [] };
const add = (t, rows) => { const at = T[t].length + 1;
  T[t].push(...rows.map(([l, r]) => l === 0xff && r ? [l, r + at - 1] : [l, r])); return at; };
const INSTR = [
  { name: 'Boom (MoM 7)', ad: 0x0f, sr: 0x0f,
    // noise+gate one frame, noise gate-off one frame, then the triangle gate-off: 7 frames up an
    // octave, 1 on the note, round and round
    wave: [[0x81, 0x00], [0x80, 0x00], [0x10, 0x0c], [0x05, 0x0c], [0x00, 0x00], [0xff, 0x03]] },
  { name: 'Tick (MoM 8)', ad: 0x0b, sr: 0x00,
    wave: [[0x11, 0x0c], [0x05, 0x0c], [0x00, 0x00], [0xff, 0x01]] },
];
for (const i of INSTR) i.wp = add('wave', i.wave);
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const n = s => { const m = /^([A-G]#?)(\d)$/.exec(s); return 0x60 + 12 * +m[2] + NOTE[m[1]]; };
const REST = 0xbd;
// pattern 9, ticks -> rows: [row, note, instrument]
const ev = [[0, 'G2', 1], [8, 'C5', 2], [16, 'C4', 2], [24, 'G2', 1], [32, 'C5', 2], [40, 'C4', 2], [44, 'G2', 1]];
const rows = [...Array(48)].map(() => [REST, 0, 0, 0]);
for (const [r, nt, i] of ev) rows[r] = [n(nt), i, r ? 0 : 0xf, r ? 0 : 2];   // tempo 2 on the first row
const PATS = [[...rows, [0xff, 0, 0, 0]], [[REST, 0, 0, 0], [0xff, 0, 0, 0]]];
const ORDER = [[0], [1], [1]];          // the rhythm on voice 1, the others silent
const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('MoM rhythm (rebuilt)', 32); str('after Rob Hubbard', 32); str('', 32);
b.push(1);
for (const o of ORDER) b.push(o.length + 1, ...o, 0xff, 0);
b.push(INSTR.length);
// gate timer $81: NO hard restart -- his driver has none, and a hard restart would cut the BOOM's
// long release; first frame $08 (test bit, gate off): no DC thump (see song-deep.mjs)
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp, 0, 0, 0, 0, 0x81, 0x08); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1]));
b.push(PATS.length);
for (const p of PATS) { b.push(p.length); for (const row of p) b.push(...row); }
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes`);
