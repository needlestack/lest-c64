#!/usr/bin/env node
// Decode the drawDbg X/Y/A readout (and the fps digits) straight off a VICE screenshot.
// Needed because SPIN measurement means differencing the angle byte between two runs, and
// eyeballing 3x5 glyphs out of a multicolor ASCII dump is slow and error-prone.
//   node tools/readout.mjs shot.png        -> X=... Y=... A=... FPS=...
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

// C0 defaults to 36 because that is where drawDbg starts X and Y. The angle row starts one
// column earlier: it carries the sub-unit fraction too, so it is five characters wide.
const field = (R, n, C0 = 36) => [...Array(n)].map((_, i) => readChar(C0 + i, R)).join('');

// DBGROW=1: decode the DBGORB hex dump, which drawDbg writes as 12 digits at row 3, column 0.
// Reading those glyphs off a scaled screenshot by eye is guesswork -- they are 3x5 pixels. This
// uses the same glyph table the display was drawn from, so the numbers are exact.
if (process.env.DBGROW) {
  const hex = [...Array(12)].map((_, i) => readChar(i, 3)).join('');
  const bytes = [...Array(6)].map((_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
  console.log('DBGORB row: ' + hex + '   bytes: ' +
    bytes.map(b => Number.isNaN(b) ? '??' : b + ' ($' + b.toString(16) + ')').join('  '));
  process.exit(0);
}

// RAYCNT=1 builds print the frame's marchCol count as 'E' + two hex digits on row 3. It is the
// only direct read on whether a subdivision change did what it claimed: fps is raster-quantised
// and averages over every other phase, so a real change in ray count can vanish inside it.
if (process.env.RAYS) {
  const h = readChar(38, 3) + readChar(39, 3);
  const n = readChar(38, 4) + readChar(39, 4);
  const e = readChar(38, 5) + readChar(39, 5);
  console.log(`${f}: rays/frame = ${h} (${parseInt(h, 16)})   hints = ${n} (${parseInt(n, 16)})` +
              `   edge cells/frame = ${e} (${parseInt(e, 16)})`);
  const c = readChar(38, 6) + readChar(39, 6);
  console.log(`${' '.repeat(f.length)}  run-cache MISSES = ${parseInt(c, 16)} of 80 chains/frame`);
  process.exit(0);
}

// PROF=1: the PROFILE build prints 7 phase totals as 4 hex digits each, rows 4-10, cols 0-3.
// The value is mean raster LINES per frame (accumulated over exactly 256 frames); one line
// is 65 cycles.
if (process.env.PROF) {
  // 'input' is NOT tickDelta + readKeys costing 6,000 cycles. Phase 0 opens the instant the
  // raster wait ends, which is exactly when the top-of-frame IRQ fires, so the IRQ lands in it
  // systematically. Treat it as IRQ overhead, not input, until someone brackets it properly.
  //
  // Phases 7 and 13 split what used to be one 'subdivision control' bucket. It read 23.6% at
  // the worst viewpoint and nobody could say what was in it, which is the same failure mode
  // the old unused phase 7 had: a number with no owner is a number nobody acts on.
  const NAMES = ['input (+ the top-of-frame IRQ, see below)', 'table clears', 'subdiv: subLp + flush bookkeeping', '  ray: angle+dispatch',
                 'renderSym', 'fps counter + readout', 'raster wait',
                 'subdiv: delimiter bubble sort', '  interpSpan', '  seamSpan',
                 '  ray: initial distances', '  ray: DDA loop', '  ray: hit + height',
                 'subdiv: pivOne prediction', 'subdiv: pivPrep bookkeeping'];
  // two columns of five: phase r is at row 4 + r%5, starting at char col 0, 5 or 10. Rows 12-13
  // would sit below the horizon where charset B mirrors the glyphs and they cannot be decoded.
  const vals = [...Array(15)].map((_, r) =>
    parseInt([...Array(4)].map((_, i) =>
      readChar(Math.floor(r / 5) * 5 + i, 4 + (r % 5))).join(''), 16));
  const tot = vals.reduce((a, b) => a + b, 0);
  console.log(`${f}\n`);
  console.log('  phase                          lines    cycles    share');
  vals.forEach((v, i) => console.log(
    `  ${NAMES[i].padEnd(30)}${String(v).padStart(5)}  ${String(v * 65).padStart(8)}   ` +
    `${(v / tot * 100).toFixed(1).padStart(5)}%`));
  console.log(`  ${'TOTAL'.padEnd(30)}${String(tot).padStart(5)}  ${String(tot * 65).padStart(8)}` +
              `   -> ${(1022727 / (tot * 65)).toFixed(2)} fps`);
  const work = tot - vals[6];
  console.log(`\n  work excluding the wait: ${work * 65} cycles = ${(work / tot * 100).toFixed(1)}%` +
              `  (${(work * 65 / 17045).toFixed(2)} raster frames)`);
  process.exit(0);
}
const HUDROW = 1;                              // matches build-iray.mjs: 24-row mode
const X = field(HUDROW, 4), Y = field(HUDROW + 1, 4), A = field(HUDROW + 2, 5, 35);
// fps is two digits at char cols 0-1 of row 0, written by drawFps with the same glyphs.
const FPS = readChar(0, HUDROW) + readChar(1, HUDROW);
// ENT=1: the HUD's E field -- the ANGEL's cell, as 'E' + x + y, at row 4 column 37 (drawDbg's
// `ldy #37`). Reading it by eye off a 3x5 glyph is guesswork; this uses the same glyph table the
// display was drawn from. It is how an angel's progress is measured between two builds.
const ENT = process.env.ENT ? '  ' + field(4, 3, 37) : '';
console.log(`${f}: ${X} ${Y} ${A}  fps=${FPS}${ENT}`);
