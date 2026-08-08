#!/usr/bin/env node
// Decode a DUMPH=1 screenshot back into colH[0..159] -- the heights the ENGINE actually
// interpolated, as opposed to what a JS replay of the subdivision predicts. Reach for this
// the moment the model and the screen disagree about a wall top; guessing which one is
// wrong has cost more time than writing this did.
//   node readh.mjs shot.png            -> all 160
//   node readh.mjs shot.png 44 56      -> just that column range
//
// dumpH writes colH as hex over screen rows 0-7: column c lands at char column c%40, high
// nibble on char row 2*(c/40), low nibble on the row below.
import { readFileSync } from 'fs'; import { inflateSync } from 'zlib';

const f = process.argv[2];
const buf = readFileSync(f);
let p = 8, w = 0, h = 0, bd = 0, ct = 0, idat = [];
while (p < buf.length) {
  const len = buf.readUInt32BE(p), typ = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
  if (typ === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; }
  else if (typ === 'IDAT') idat.push(d);
  else if (typ === 'IEND') break;
  p += 12 + len;
}
const raw = inflateSync(Buffer.concat(idat));
const ch = ct === 2 ? 3 : ct === 6 ? 4 : ct === 4 ? 2 : 1;
const bpp = Math.max(1, (ch * bd) >> 3), stride = Math.ceil(w * ch * bd / 8);
const img = Buffer.alloc(h * stride);
for (let y = 0, o = 0; y < h; y++) {
  const ft = raw[o++]; const row = raw.subarray(o, o + stride); o += stride;
  const cur = img.subarray(y * stride, y * stride + stride), pr = y ? img.subarray((y - 1) * stride, y * stride) : null;
  for (let i = 0; i < stride; i++) {
    const a = i >= bpp ? cur[i - bpp] : 0, b = pr ? pr[i] : 0, c = (pr && i >= bpp) ? pr[i - bpp] : 0; let v = row[i];
    if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
    else if (ft === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      v += (pa <= pb && pa <= pc) ? a : (pb <= pc) ? b : c; }
    cur[i] = v & 255;
  }
}
// Raw colour index, NOT luminance: the glyphs sit over ceiling/floor colour that can be
// brighter than the ink, so an absolute threshold misreads them. Compare against the
// char's own row 0 instead, which drawDbg's glyphs always leave as background.
const px = (x, y) => {
  if (bd === 8 && ch === 1) return img[y * stride + x];
  if (bd === 4) { const b = img[y * stride + (x >> 1)]; return (x & 1) ? (b & 15) : (b >> 4); }
  const i = y * stride + x * bpp; return (img[i] << 16) | (img[i + 1] << 8) | img[i + 2];
};

// Same table as build-iray.mjs: 5 rows of 3 bits per glyph, index = nibble; 16='X', 17='Y'.
const digGlyph = [
 7,5,5,5,7, 2,6,2,2,7, 7,1,7,4,7, 7,1,7,1,7, 5,5,7,1,1,
 7,4,7,1,7, 7,4,7,5,7, 7,1,2,2,2, 7,5,7,5,7, 7,5,7,1,7,
 2,5,7,5,5, 6,5,6,5,6, 7,4,4,4,7, 6,5,5,5,6, 7,4,6,4,7, 7,4,6,4,4,
 5,5,2,5,5, 5,5,2,2,2];
const NAME = [...'0123456789ABCDEF', 'X', 'Y'];

// Screen geometry: 320x200 display starts at (32,23); 4x8 cells so char col C is logical
// col 4C -> x = 32+8C, char row R -> y = 23+8R. Glyph ink is rows 1-5, logical px 0-2.
const readChar = (C, R) => {
  const x0 = 32 + 8 * C, y0 = 23 + 8 * R;
  const bg = px(x0, y0);                       // row 0 is always background
  const rows = [];
  for (let j = 1; j <= 5; j++) {
    let v = 0;
    for (let i = 0; i < 3; i++) if (px(x0 + 2 * i, y0 + j) !== bg) v |= 4 >> i;
    rows.push(v);
  }
  for (let g = 0; g < digGlyph.length / 5; g++)
    if (digGlyph.slice(g * 5, g * 5 + 5).every((v, k) => v === rows[k])) return NAME[g];
  return rows.every(v => v === 0) ? ' ' : '?';
};

const field = (R, n) => [...Array(n)].map((_, i) => readChar(36 + i, R)).join('');


const C0 = process.argv[3] === undefined ? 0 : +process.argv[3];
const C1 = process.argv[4] === undefined ? 159 : +process.argv[4];
const hex = c => {
  const k = c / 40 | 0, cc = c % 40;
  const hi = readChar(cc, 2 * k), lo = readChar(cc, 2 * k + 1);
  const v = parseInt(hi + lo, 16);
  return Number.isNaN(v) ? null : v;
};
const out = [];
for (let c = C0; c <= C1; c++) { const v = hex(c); out.push(`${c}:${v === null ? '??' : v}`); }
console.log(out.join('  '));
