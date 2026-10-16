#!/usr/bin/env node
// compose-face.mjs -- one death-scene picture from TWO fits: a base for the body, a donor for the face.
//
//   node tools/compose-face.mjs base.json face.json "x0,y0,x1,y1" N out.json
//
// base.json and face.json are build-facetest3.mjs assets (ASSETOUT) of the same picture, fitted with
// different settings (2026-10-15: the user liked grit 40's body and grit 20's face). The base keeps
// its glyphs and its map outside the box (cells, inclusive). Inside it, the TARGET is the donor's
// face exactly as it renders, and N new glyphs are added to the base's book for it: chosen greedily
// from the donor's face tiles, each round taking the tile that most reduces the face's error given
// the book so far. Every cell in the box then takes its best glyph from the enlarged book.
// So: fit the base with N fewer glyphs (KONE) than the budget, and the result fits the budget.
import { readFileSync, writeFileSync } from 'fs';
const [baseF, faceF, boxS, nS, outF] = process.argv.slice(2);
const base = JSON.parse(readFileSync(baseF, 'utf8')), face = JSON.parse(readFileSync(faceF, 'utf8'));
const [x0, y0, x1, y1] = boxS.split(',').map(Number);
// N = "all": copy the donor's face EXACTLY -- every donor glyph in the box joins the book, and each box
// cell takes its donor glyph (2026-10-15: the greedy few changed 7-10 of 64 cells, not enough to look
// like the donor's face; looking right is the point, not a lower error)
const ALL = nS === 'all', N = ALL ? Infinity : +nS;
// luminance of a bit pair, from the assets' own inks (00 $d021, 01 $d022, 10 $d023, 11 colour RAM)
const RGB = { 0: [0, 0, 0], 1: [255, 255, 255], 11: [68, 68, 68], 12: [108, 108, 108], 15: [149, 149, 149] };
const lumOf = c => RGB[c][0] * 0.299 + RGB[c][1] * 0.587 + RGB[c][2] * 0.114;
const LU = [base.d021, base.d022, base.d023, base.colram & 7].map(lumOf);
const tileOf = (a, g) => { const t = new Float64Array(32);
  for (let r = 0; r < 8; r++) { const b = a.chars[g * 8 + r]; for (let i = 0; i < 4; i++) t[r * 4 + i] = LU[(b >> (6 - 2 * i)) & 3]; }
  return t; };
const bits = (a, g) => a.chars.slice(g * 8, g * 8 + 8);
const err = (p, q) => { let d = 0; for (let i = 0; i < 32; i++) { const e = p[i] - q[i]; d += e * e; } return d; };
const used = [...new Set(base.maps[0].map)];                       // the base's glyphs, as drawn
const book = used.map(g => ({ bits: bits(base, g), lum: tileOf(base, g) }));
const cells = [];
for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) cells.push(cy * 40 + cx);
const target = cells.map(c => tileOf(face, face.maps[0].map[c]));
const bestErr = () => target.map(t => Math.min(...book.map(b => err(t, b.lum))));
let cur = bestErr();
const cand = [...new Set(cells.map(c => face.maps[0].map[c]))].map(g => ({ bits: bits(face, g), lum: tileOf(face, g) }));
for (let k = 0; !ALL && k < N; k++) {
  let pick = null, gain = 0;
  for (const c of cand) {
    if (book.includes(c)) continue;
    let g = 0; target.forEach((t, i) => { g += Math.max(0, cur[i] - err(t, c.lum)); });
    if (g > gain) { gain = g; pick = c; }
  }
  if (!pick) break;
  book.push(pick); cur = bestErr();
  console.error(`  face glyph ${k + 1}: error ${Math.round(gain)} less`);
}
// the composed map: base glyphs renumbered into the new book, face cells refitted against all of it
const idx = new Map(used.map((g, n) => [g, n]));
const map = base.maps[0].map.map(g => idx.get(g));
if (ALL) {
  const key = b => b.join(',');
  const have = new Map(book.map((b, n) => [key(b.bits), n]));
  cells.forEach(c => { const g = face.maps[0].map[c], k = key(bits(face, g));
    if (!have.has(k)) { have.set(k, book.length); book.push({ bits: bits(face, g), lum: tileOf(face, g) }); }
    map[c] = have.get(k); });
  cur = target.map(() => 0);
} else cells.forEach((c, i) => { let b = 0, bd = Infinity;
  book.forEach((g, n) => { const d = err(target[i], g.lum); if (d < bd) { bd = d; b = n; } }); map[c] = b; });
const chars = book.flatMap(b => b.bits);
while (chars.length < 2048) chars.push(0);
const faceErr = cur.reduce((a, b) => a + b, 0), changed = cells.filter(c => base.maps[0].map[c] !== used[map[c]]).length;
writeFileSync(outF, JSON.stringify({ ...base, source: 'compose-face.mjs', chars,
  maps: [{ name: base.maps[0].name, map }], composed: { base: baseF, face: faceF, box: boxS, extra: N } }));
console.log(`${outF}: ${book.length} glyphs (${used.length} base + ${book.length - used.length} for the face), ` +
  `${changed} of ${cells.length} face cells changed, face RMS against the donor ${(Math.sqrt(faceErr / (cells.length * 32)) / 255).toFixed(4)}`);
