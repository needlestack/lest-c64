#!/usr/bin/env node
// sng-starter.mjs -- write a GoatTracker 2 song (.sng, format GTS5) to start composing from:
// a handful of Rob Hubbard-flavoured instruments and a short demo that uses each.
//
//   node tools/sng-starter.mjs [music/lest-starter.sng]
//
// The format is GoatTracker's readme section 6.1 (checked against gsong.c's savesong: an orderlist
// length counts its RST endmark, a pattern length counts its end row). Table pointers are 1-based.
// The instruments are a starting point to TUNE BY EAR -- they were built from the docs, not heard.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
const OUT = process.argv[2] ?? 'music/lest-starter.sng';

// ---- the four tables: [left, right] rows, 1-based pointers handed out as rows are added ----
const T = { wave: [], pulse: [], filt: [], speed: [] };
// an FF jump is written relative to its own table's first row and made absolute here: GoatTracker's
// jumps are positions in the SHARED table (this was missed at first -- Minor arp and Bouncy bass looped
// into other instruments' rows)
const add = (t, rows) => { const at = T[t].length + 1;
  T[t].push(...rows.map(([l, r]) => l === 0xff && r ? [l, r + at - 1] : [l, r])); return at; };

// ---- instruments (AD, SR, tables, vibrato) ----
// Each wavetable row is [waveform or delay/command, note]: right side 00-5F relative, 80 keep,
// 81-DF ABSOLUTE (C#0..B-7). Waveforms: 11 triangle, 21 saw, 41 pulse, 81 noise (+1 = gate on).
const INSTR = [
  { name: 'PWM lead', ad: 0x09, sr: 0xa9, vibDelay: 0x18,
    wave:  [[0x41, 0x00], [0xff, 0x00]],
    // thin pulse sweeping wide and back, for ever: THE Hubbard lead
    pulse: [[0x82, 0x00], [0x40, 0x20], [0x40, 0xe0], [0xff, 0x02]],
    speed: [[0x03, 0x28]] },                                     // vibrato: speed 3, depth $28, after $18 ticks
  { name: 'Minor arp', ad: 0x03, sr: 0x99,
    // one voice playing a chord: root, minor third, fifth, octave -- one tick each, looping
    wave:  [[0x41, 0x00], [0x00, 0x03], [0x00, 0x07], [0x00, 0x0c], [0x00, 0x00], [0xff, 0x02]],
    pulse: [[0x86, 0x00], [0x20, 0x30], [0x20, 0xd0], [0xff, 0x02]] },
  { name: 'Bouncy bass', ad: 0x09, sr: 0x40,
    wave:  [[0x41, 0x0c], [0x41, 0x00], [0xff, 0x00]],           // an octave up for one tick: the "pluck"
    pulse: [[0x84, 0x00], [0x30, 0x18], [0x30, 0xe8], [0xff, 0x02]] },
  { name: 'Kick', ad: 0x00, sr: 0xf0,
    // a click of noise, then a triangle dropping fast through absolute pitches, then gate off
    wave:  [[0x81, 0xdc], [0x11, 0xb4], [0x11, 0xac], [0x11, 0xa4], [0x10, 0xa0], [0xff, 0x00]] },
  { name: 'Snare', ad: 0x00, sr: 0xf9,
    // the readme's own snare: noise, two pulse ticks, then noise released
    wave:  [[0x81, 0xd0], [0x41, 0xaa], [0x41, 0xa4], [0x80, 0xd4], [0x80, 0xd1], [0xff, 0x00]],
    pulse: [[0x88, 0x00], [0xff, 0x00]] },
  { name: 'Hi-hat', ad: 0x00, sr: 0xc3,
    wave:  [[0x81, 0xdf], [0x80, 0xdf], [0xff, 0x00]] },         // the highest noise, gate straight off
  { name: 'Filter pad', ad: 0x8a, sr: 0xa8,
    wave:  [[0x21, 0x00], [0xff, 0x00]],                         // sawtooth
    // lowpass, resonance 8, on channel 1; cutoff breathing up and down
    filt:  [[0x90, 0x81], [0x00, 0x30], [0x30, 0x01], [0x30, 0xff], [0xff, 0x03]] },
];
for (const i of INSTR) {
  i.wp = add('wave', i.wave);
  i.pp = i.pulse ? add('pulse', i.pulse) : 0;
  i.fp = i.filt ? add('filt', i.filt) : 0;
  i.sp = i.speed ? add('speed', i.speed) : 0;
}
const I = Object.fromEntries(INSTR.map((x, n) => [x.name, n + 1]));   // instrument numbers, from 1

// ---- patterns: 32 rows, [note, instrument, command, data] ----
const NOTE = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
const n = s => { const m = /^([A-G]#?)(\d)$/.exec(s); return 0x60 + 12 * +m[2] + NOTE[m[1]]; };
const REST = 0xbd, KEYOFF = 0xbe;
const pat = (events, rows = 32) => {
  const r = [...Array(rows)].map(() => [REST, 0, 0, 0]);
  for (const [row, note, ins, cmd = 0, data = 0] of events)
    r[row] = [note === 'off' ? KEYOFF : n(note), note === 'off' ? 0 : ins, cmd, data];
  return [...r, [0xff, 0, 0, 0]];                                 // the end row, counted in the length
};
const PATS = [
  // 0: the lead melody (channel 1)
  pat([[0, 'A4', I['PWM lead']], [4, 'C5', I['PWM lead']], [8, 'E5', I['PWM lead']], [12, 'D5', I['PWM lead']],
       [16, 'C5', I['PWM lead']], [20, 'B4', I['PWM lead']], [24, 'A4', I['PWM lead']], [30, 'off']]),
  // 1: the bass line, octave-bouncing eighths: Am Am F E (channel 2)
  pat([...[0, 2, 4, 6, 8, 10, 12, 14].map(r => [r, r % 4 ? 'A3' : 'A2', I['Bouncy bass']]),
       ...[16, 18, 20, 22].map(r => [r, r % 4 ? 'F3' : 'F2', I['Bouncy bass']]),
       ...[24, 26, 28, 30].map(r => [r, r % 4 ? 'E3' : 'E2', I['Bouncy bass']])]),
  // 2: drums -- kick, snare, hats (channel 3); tempo 6 set on the first row (command F)
  pat([...[0, 8, 16, 24].map(r => [r, 'C4', I['Kick'], r ? 0 : 0xf, r ? 0 : 0x06]),
       ...[4, 12, 20, 28].map(r => [r, 'C4', I['Snare']]),
       ...[2, 6, 10, 14, 18, 22, 26, 30].map(r => [r, 'C4', I['Hi-hat']])]),
  // 3: the chord arpeggio over the same changes (channel 1)
  pat([[0, 'A3', I['Minor arp']], [16, 'F3', I['Minor arp']], [24, 'E3', I['Minor arp']], [31, 'off']]),
  // 4: the filter pad (channel 1)
  pat([[0, 'A3', I['Filter pad']], [16, 'F3', I['Filter pad']], [24, 'E3', I['Filter pad']], [31, 'off']]),
];
// ---- the order lists: lead, arp, pad over bass and drums, then loop ----
const ORDER = [[0, 3, 4], [1, 1, 1], [2, 2, 2]];

// ---- write it ----
const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4);
str('LEST starter', 32); str('', 32); str('', 32);
b.push(1);                                                        // one subtune
for (const o of ORDER) { b.push(o.length + 1, ...o, 0xff, 0x00); }   // n counts the RST; restart at 0
b.push(INSTR.length);
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp, i.pp, i.fp, i.sp, i.vibDelay ?? 0, 0x02, 0x09); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) {
  b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1]));
}
b.push(PATS.length);
for (const p of PATS) { b.push(p.length); for (const row of p) b.push(...row); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes, ${INSTR.length} instruments, ${PATS.length} patterns`);
