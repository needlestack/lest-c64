// make-quote.mjs -- quote0N.png -> quote-screen.json, run by hand like make-pedestal-art.mjs.
//
// The boot quote is a 320x200 HI-RES image, but it does NOT ship as a bitmap. A 1-bit image of
// text at 8x8 granularity repeats enormously -- every blank cell is one glyph, and thresholded
// strokes recur -- so it goes as a CHARSET plus a 40x25 screen map. Measured on quote02 at
// threshold 0.36: 1000 cells, 217 distinct. It fits in 256 with room to spare, which makes the
// conversion LOSSLESS: the reconstruction is pixel-identical, not an approximation.
//
//   bitmap:          8000 B + 1000 screen        = 9000 B
//   charset + map:   217*8 = 1736 B + 1000       = 2736 B
//
// and 2736 fits where 9000 never could -- which is the whole reason for doing it this way.
import { readFileSync, writeFileSync } from 'fs';
import { inflateSync } from 'zlib';

const SRC = process.argv[2] ?? './quote02.png';
const THR = +(process.argv[3] ?? 0.36);          // the user's pick: 'b', a touch thicker than faithful
const INK = +(process.argv[4] ?? 12);            // grey2

// ---- PNG in (8-bit, any colour type incl. palette) ----
const b = readFileSync(SRC); let o = 8, w, h, bd, ct, plte = null, idat = [];
while (o < b.length) { const len = b.readUInt32BE(o), ty = b.toString('ascii', o+4, o+8);
  if (ty === 'IHDR') { w = b.readUInt32BE(o+8); h = b.readUInt32BE(o+12); bd = b[o+16]; ct = b[o+17]; }
  if (ty === 'PLTE') plte = b.slice(o+8, o+8+len);
  if (ty === 'IDAT') idat.push(b.slice(o+8, o+8+len)); o += 12 + len; }
if (bd !== 8) throw new Error(`${SRC}: bit depth ${bd}, need 8`);
const ch = { 0:1, 2:3, 3:1, 4:2, 6:4 }[ct], stride = w * ch;
const raw = inflateSync(Buffer.concat(idat)), img = Buffer.alloc(h * stride); let pos = 0;
for (let y = 0; y < h; y++) { const fl = raw[pos++];
  for (let i = 0; i < stride; i++) { const a = i>=ch?img[y*stride+i-ch]:0, u = y>0?img[(y-1)*stride+i]:0,
      c = (y>0&&i>=ch)?img[(y-1)*stride+i-ch]:0; let v = raw[pos+i];
    if (fl===1) v+=a; else if (fl===2) v+=u; else if (fl===3) v+=(a+u)>>1;
    else if (fl===4) { const pa=Math.abs(u-c), pb=Math.abs(a-c), pc=Math.abs(a+u-2*c);
      v += (pa<=pb&&pa<=pc)?a:(pb<=pc?u:c); } img[y*stride+i]=v&255; }
  pos += stride; }
const lum = (x,y) => { const q = y*stride + x*ch;
  if (ct === 3) { const i = img[q]*3; return 0.299*plte[i] + 0.587*plte[i+1] + 0.114*plte[i+2]; }
  return ch >= 3 ? 0.299*img[q] + 0.587*img[q+1] + 0.114*img[q+2] : img[q]; };

// ---- box-average to 320x200 and threshold ----
// Normalised against the source's OWN peak: the art is dark grey on black, so its text core sits
// around 77, not 255, and thresholding against 255 would erase the whole thing.
let peak = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) peak = Math.max(peak, lum(x,y));
const W = 320, H = 200, px = new Uint8Array(W*H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x0 = Math.floor(w*i/W), x1 = Math.max(x0+1, Math.floor(w*(i+1)/W));
  const y0 = Math.floor(h*j/H), y1 = Math.max(y0+1, Math.floor(h*(j+1)/H));
  let s = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += lum(x,y); n++; }
  px[j*W+i] = (s/n/peak) > THR ? 1 : 0; }

// ---- 40x25 cells of 8 bytes, deduplicated ----
const CW = 40, CH = 25, glyphs = [], index = new Map(), screen = [];
for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
  const g = [];
  for (let r = 0; r < 8; r++) { let v = 0;
    for (let c = 0; c < 8; c++) v = (v<<1) | px[(cy*8+r)*W + cx*8+c];
    g.push(v); }
  const k = g.join(',');
  if (!index.has(k)) { index.set(k, glyphs.length); glyphs.push(g); }
  screen.push(index.get(k)); }
if (glyphs.length > 256) throw new Error(
  `${SRC} at threshold ${THR} needs ${glyphs.length} distinct cells; a charset holds 256. ` +
  `Raise the threshold, or cluster to 256 (k-medians, as the cell charset does) and accept the loss.`);

// ---- prove it round-trips before writing anything ----
let wrong = 0;
for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) { const g = glyphs[screen[cy*CW+cx]];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (((g[r] >> (7-c)) & 1) !== px[(cy*8+r)*W + cx*8+c]) wrong++; }
if (wrong) throw new Error(`reconstruction differs in ${wrong} pixels -- the dedup is wrong`);

// THE BLANK CELL MUST BE GLYPH 0. The screen is cleared to 0 before the map is stamped, and a
// partly-written screen should read as empty rather than as whatever cell happened to be first.
const blank = glyphs.findIndex(g => g.every(v => v === 0));
if (blank > 0) { const t = glyphs[0]; glyphs[0] = glyphs[blank]; glyphs[blank] = t;
  for (let i = 0; i < screen.length; i++) screen[i] = screen[i] === 0 ? blank : screen[i] === blank ? 0 : screen[i]; }

writeFileSync('./quote-screen.json', JSON.stringify({
  note: 'Boot quote: a 320x200 hi-res image as a charset plus a 40x25 map. LOSSLESS -- see ' +
        'make-quote.mjs. glyphs are 8 bytes each, MSB left; screen is 1000 bytes of glyph index; ' +
        'ink is the C64 colour for colour RAM, background is black.',
  src: SRC, threshold: THR, ink: INK, glyphs: glyphs.length,
  chars: glyphs.flat(), screen,
}, null, 1));
console.error(`quote-screen.json: ${SRC} thr ${THR} -> ${glyphs.length} glyphs ` +
  `(${glyphs.length*8} B) + ${screen.length} B screen = ${glyphs.length*8 + screen.length} B, ` +
  `reconstruction exact`);
