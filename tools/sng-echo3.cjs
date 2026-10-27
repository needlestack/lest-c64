// node tools/sng-echo3.cjs -- rebuilds music/gbb-v2-echo3.sng from the user's music/gbb-v2-echo2.sng
// echo3: the user's echo2 with the counterpoint carried through channel 1 (voice 2, the echo, untouched)
const fs = require('fs');
const b = Buffer.from(fs.readFileSync('music/gbb-v2-echo2.sng'));
let o = 4 + 96; const nsub = b[o++]; for (let c = 0; c < 3 * nsub; c++) o += b[o] + 2;
const ni = b[o++]; o += ni * 25; for (let t = 0; t < 4; t++) { const n = b[o++]; o += 2 * n; }
const np = b[o++]; const pat = []; for (let p = 0; p < np; p++) { const l = b[o++]; pat.push(o); o += 4 * l; }
const NN = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, Bb: 10, B: 11 };
const nv = s => { const m = /^([A-G][#b]?)(\d)$/.exec(s); return 0x60 + 12 * +m[2] + NN[m[1]]; };
// 32 rows of channel 1 (patterns 0, 1): a note = the Tone (instrument 1), '.' = rest (the Tone rings
// out), 'O' = leave the original bass row
const LINE = ['A2','G3','C4','F3','E3','O','O','O','O','O','O','O','Bb3','A3','.','E3',
              'F3','.','O','O','O','O','A2','.','G3','C4','.','Bb3','A3','.','O','O'];
LINE.forEach((x, i) => { const at = pat[i >> 4] + 4 * (i & 15); if (x === 'O') return;
  const keepCmd = [b[at + 2], b[at + 3]];                 // row 0 carries the tempo
  if (x === '.') { b[at] = 0xbd; b[at + 1] = 0; } else { b[at] = nv(x); b[at + 1] = 1; }
  [b[at + 2], b[at + 3]] = keepCmd; });
fs.writeFileSync('music/gbb-v2-echo3.sng', b);
console.log('music/gbb-v2-echo3.sng', b.length, 'bytes');
