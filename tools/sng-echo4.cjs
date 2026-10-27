// node tools/sng-echo4.cjs -- builds music/gbb-v2-echo4.sng from the user's music/gbb-v2-echo2.sng
// echo3's counterpoint (tools/sng-echo3.cjs) extended to EIGHT bars: four passes of the 2-bar loop on
// channel 1, the counterpoint climbing an octave and coming back ("extend the pattern and have the
// counterpoint experiment with climbing an octave up and back ... keep the bass as it is"). Channel 1's
// bass rows ('O') and voice 2's echo are the user's, untouched; voice 2 keeps its 2-bar loop, which
// stays in step with channel 1's 8-bar one (32 rows divide 128).
const fs = require('fs');
const src = fs.readFileSync('music/gbb-v2-echo2.sng');
let o = 4 + 96; const head = src.slice(0, o); const nsub = src[o++];
const ord = []; for (let c = 0; c < 3 * nsub; c++) { const L = src[o]; ord.push([...src.slice(o + 1, o + L + 2)]); o += L + 2; }
const midAt = o; const ni = src[o++]; o += ni * 25; for (let t = 0; t < 4; t++) { const n = src[o++]; o += 2 * n; }
const mid = src.slice(midAt, o);                        // instruments + tables, as the user saved them
const np = src[o++]; const pats = []; for (let p = 0; p < np; p++) { const l = src[o++]; pats.push([...src.slice(o, o + 4 * l)]); o += 4 * l; }
const NN = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, Bb: 10, B: 11 };
const nv = s => { const m = /^([A-G][#b]?)(\d)$/.exec(s); return 0x60 + 12 * +m[2] + NN[m[1]]; };
// a pass: 32 rows of channel 1 -- a note = the Tone (instrument 1), '.' = rest (the Tone rings out),
// 'O' = the original bass row. The bass under it (voice 2, a 16th late): D rows 1-9, C# 10-17, D 18-25, C# 26-0
const PASSES = [
  // 1: echo3 -- the user's phrase, the answer over C#, the phrase broken up
  ['A2','G3','C4','F3','E3','O','O','O','O','O','O','O','Bb3','A3','.','E3',
   'F3','.','O','O','O','O','A2','.','G3','C4','.','Bb3','A3','.','O','O'],
  // 2: climbing -- the same shape a fourth higher (D3 up to D4), the answer lifts, bar 2 reaches for E4 F4
  ['D3','A3','D4','G3','F3','O','O','O','O','O','O','O','C4','Bb3','.','G3',
   'A3','.','O','O','O','O','D3','.','A3','D4','.','E4','F4','.','O','O'],
  // 3: the top -- the user's phrase an octave up, the answer from Bb4, bar 2 peaking on D5
  ['A3','G4','C5','F4','E4','O','O','O','O','O','O','O','Bb4','A4','.','E4',
   'F4','.','O','O','O','O','A3','.','G4','C5','.','D5','C5','.','O','O'],
  // 4: coming back -- a scale run down from A4, the answer stepping down, bar 2 landing on C# with the bass
  ['A4','G4','F4','E4','D4','O','O','O','O','O','O','O','C4','Bb3','.','A3',
   'G3','.','O','O','O','O','F3','.','E3','D3','.','.','C#3','.','O','O'],
];
const base = [pats[0], pats[1]];                        // channel 1's two bars, as saved
const ch1 = [];
PASSES.forEach((line, k) => { if (line.length !== 32) throw new Error(`pass ${k + 1}: ${line.length} rows`);
  for (let h = 0; h < 2; h++) { const p = [...base[h]];
    for (let r = 0; r < 16; r++) { const x = line[h * 16 + r], at = 4 * r; if (x === 'O') continue;
      if (x === '.') { p[at] = 0xbd; p[at + 1] = 0; } else { p[at] = nv(x); p[at + 1] = 1; } }   // cmd/data kept: row 0's tempo
    if (k === 0) pats[h] = p; else { pats.push(p); }
    ch1.push(k === 0 ? h : pats.length - 1); } });
ord[0] = [...ch1, 0xff, 0];                              // channel 1: the four passes, looping to the top
const out = [...head, nsub];
for (const x of ord) out.push(x.length - 2 + 1, ...x);
out.push(...mid, pats.length);
for (const p of pats) out.push(p.length / 4, ...p);
fs.writeFileSync('music/gbb-v2-echo4.sng', Buffer.from(out));
console.log('music/gbb-v2-echo4.sng', out.length, 'bytes,', pats.length, 'patterns; channel 1 order', ch1.join(' '));
