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
//
// It is also PACKED here, with exomizer, and the packed bytes go in the json. That is deliberate:
// the boot loads the quote at KERNAL speed (~290 B/s) before any fast loader exists, so 2760 -> 1445
// bytes is ~4.5 seconds off the black screen. Packing HERE and not in build-iray.mjs keeps the main
// build free of a C toolchain -- this generator is run by hand, like make-pedestal-art.mjs, and the
// result is committed.
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { inflateSync } from 'zlib';
import { QUOTE_SCR, QUOTE_CHR, EXO_GETBYTE, EXO_CODE, EXO_TABLE } from './loader-src.mjs';

const SRC = process.argv[2] ?? './art/quote02.png';
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

// ---- pack it, exactly as the boot will decrunch it: one blob at QUOTE_SCR ----
// The screen map is 1000 bytes but the charset starts on the next 1K boundary, so the gap is
// part of the blob. It costs nothing -- a run of zeros is what a packer is best at.
const blob = [...screen, ...Array(QUOTE_CHR - QUOTE_SCR - screen.length).fill(0), ...glyphs.flat()];
const exo = process.env.EXOMIZER ?? 'exomizer';
const tmp = mkdtempSync(`${tmpdir()}/quote-`);
let packed, decr;
try {
  writeFileSync(`${tmp}/blob.bin`, Buffer.from(blob));
  // `mem`, NOT `raw`. This is the mode exodecrs/acme/exodecrunch.asm is written for -- it embeds
  // the destination in the stream, which is what the decruncher's init_zp reads in its first
  // three bytes (dest_hi, dest_lo, bitbuf). A `raw` stream has no such header and decrunches to
  // whatever those three bytes happen to say: for our blob, $21f9.
  // Backward is the DEFAULT and the pairing DECRUNCH_FORWARDS = 0 expects: the decruncher reads
  // the packed bytes from the END downwards and writes the output from its top down. It costs 6
  // bytes over `-f` and needs no second variant of the decruncher.
  //
  // AS A PRG, WITH A LOAD ADDRESS. `mem` reads its input as a PRG and takes the first two bytes
  // as the load address -- and it does that to a raw file too, silently eating two bytes of
  // payload. Handing it `blob.bin,0xf400` therefore crunched 2758 bytes, not 2760, and the
  // decruncher left $f400-$f401 untouched: two screen cells holding whatever the RAM pattern
  // was, pointing at a glyph past the end of the charset. One "==" in the top-left corner, on a
  // screen that was otherwise pixel-perfect. Give it a real header and the arithmetic disappears.
  writeFileSync(`${tmp}/blob.prg`, Buffer.from([QUOTE_SCR & 255, QUOTE_SCR >> 8, ...blob]));
  execFileSync(exo, ['mem', '-q', '-o', `${tmp}/blob.exo`, `${tmp}/blob.prg`]);
  packed = [...readFileSync(`${tmp}/blob.exo`)];
  // exomizer writes the destination into the stream's last two bytes and the decruncher stores
  // DOWNWARDS from one below it, so this is the whole contract between packer and boot -- and
  // the only place it is visible. Two bytes out is a corrupt quote nobody can debug from a
  // screenshot; check it here, where the numbers exist.
  const dest = packed[packed.length - 1] << 8 | packed[packed.length - 2];
  if (dest !== QUOTE_SCR + blob.length) throw new Error(
    `exomizer's embedded destination is $${dest.toString(16)}, so the blob would land at ` +
    `$${(dest - blob.length).toString(16)} and not $${QUOTE_SCR.toString(16)}.`);

  // ---- and assemble the matching decruncher, because asm6502.mjs cannot ----
  // exodecrunch.asm is acme: macros, !ifndef, local labels. The main build has none of that, so
  // the decruncher ships as BYTES at a fixed address, like Krill's install and resident binaries.
  // Relocating its 156-byte table out of the file (the one ALTERED line in exodecrunch.asm) takes
  // it from 461 bytes to 293 -- and every one of those is loaded at KERNAL speed.
  const hx = n => '$' + n.toString(16);
  writeFileSync(`${tmp}/w.asm`, `exod_get_crunched_byte = ${hx(EXO_GETBYTE)}\n` +
    `exod_decrunch_table = ${hx(EXO_TABLE)}\n        * = ${hx(EXO_CODE)}\n` +
    `        !source "${process.cwd()}/exodecrunch.asm"\n`);
  execFileSync('acme', ['-f', 'plain', '-o', `${tmp}/exo.bin`,
                        '--symbollist', `${tmp}/exo.sym`, `${tmp}/w.asm`]);
  const sym = readFileSync(`${tmp}/exo.sym`, 'utf8');
  const m = /^\s*exod_decrunch\s*=\s*\$([0-9a-fA-F]+)/m.exec(sym);
  if (!m) throw new Error('acme did not report exod_decrunch; the decruncher entry is unknown');
  decr = { at: EXO_CODE, entry: parseInt(m[1], 16), bytes: [...readFileSync(`${tmp}/exo.bin`)] };
} catch (e) {
  if (e.code === 'ENOENT') throw new Error(
    `exomizer or acme not found (exomizer tried as "${exo}"). Build exomizer from Krill's ` +
    `tools -- make -C tools/exomizer-3.1/src exomizer -- and set EXOMIZER=<path>. acme must be ` +
    `on PATH; it assembles the decruncher, which asm6502.mjs cannot.`);
  throw e;
}

writeFileSync('./quote-screen.json', JSON.stringify({
  note: 'Boot quote: a 320x200 hi-res image as a charset plus a 40x25 map. LOSSLESS -- see ' +
        'make-quote.mjs. glyphs are 8 bytes each, MSB left; screen is 1000 bytes of glyph index; ' +
        'ink is the C64 colour for colour RAM, background is black.',
  src: SRC, threshold: THR, ink: INK, glyphs: glyphs.length,
  // packedAt/packedLen are what build-iray.mjs checks against loader-src.mjs's QUOTE_SCR and the
  // blob it expects: the packed bytes are opaque, so a moved address must fail the BUILD rather
  // than decrunch a picture into the wrong place.
  packedAt: QUOTE_SCR, packedLen: blob.length, packed, decr,
  chars: glyphs.flat(), screen,
}, null, 1));
console.error(`quote-screen.json: ${SRC} thr ${THR} -> ${glyphs.length} glyphs ` +
  `(${glyphs.length*8} B) + ${screen.length} B screen = ${glyphs.length*8 + screen.length} B, ` +
  `reconstruction exact; exomizer ${blob.length} -> ${packed.length} B (${Math.round(100*packed.length/blob.length)}%), decruncher ${decr.bytes.length} B at $${decr.at.toString(16)}`);
