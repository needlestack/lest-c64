// make-pedestal-art.mjs -- pedestal.png -> pedestal-art.json, run once by hand.
//
// The build does NOT read the photo. It reads two small luminance bands lifted off it, for the
// same reason goat-art.json exists: the art is then tracked, diffable and editable, and the
// build stays dependency-free and fast.
//
// TWO bands, not one silhouette, because the pedestal's silhouette is NOT the photo's. A drum
// is drawn procedurally in makePedLadder (the exit hole's disc extruded), and the shape of its
// top ellipse depends on how far away you are -- the photo is one fixed camera and the game is
// not. So the photo contributes MATERIAL, not outline: a TOP band and a SIDE band, each sampled
// by surface coordinate, which is also what keeps the stone sitting still on the drum as you
// walk around it.
import { readFileSync, writeFileSync } from 'fs';
import { inflateSync } from 'zlib';
import { ROOT } from './paths.mjs';
process.chdir(ROOT);   // paths below are repo-relative (see src/paths.mjs)

const SRC = process.argv[2] ?? './art/pedestal.png';
const b = readFileSync(SRC); let o = 8, w, h, ct, idat = [];
while (o < b.length) { const len = b.readUInt32BE(o), ty = b.toString('ascii', o + 4, o + 8);
  if (ty === 'IHDR') { w = b.readUInt32BE(o + 8); h = b.readUInt32BE(o + 12); ct = b[o + 17]; }
  if (ty === 'IDAT') idat.push(b.slice(o + 8, o + 8 + len)); o += 12 + len; }
const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 4 ? 2 : 1, stride = w * ch;
const raw = inflateSync(Buffer.concat(idat)), img = Buffer.alloc(h * stride); let pos = 0;
for (let y = 0; y < h; y++) { const fl = raw[pos++];
  for (let i = 0; i < stride; i++) { const a = i >= ch ? img[y * stride + i - ch] : 0,
      u = y > 0 ? img[(y - 1) * stride + i] : 0, c = (y > 0 && i >= ch) ? img[(y - 1) * stride + i - ch] : 0;
    let v = raw[pos + i];
    if (fl === 1) v += a; else if (fl === 2) v += u; else if (fl === 3) v += (a + u) >> 1;
    else if (fl === 4) { const pa = Math.abs(u - c), pb = Math.abs(a - c), pc = Math.abs(a + u - 2 * c);
      v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? u : c); }
    img[y * stride + i] = v & 255; } pos += stride; }
const lum = (x, y) => img[y * stride + x * ch];

// ---- the drum in the frame ----
const BG = 235;                                   // the photo is on near-white
let X0 = 1e9, X1 = -1, Y0 = 1e9, Y1 = -1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (lum(x, y) < BG) {
  if (x < X0) X0 = x; if (x > X1) X1 = x; if (y < Y0) Y0 = y; if (y > Y1) Y1 = y; }
const WD = X1 - X0 + 1, HT = Y1 - Y0 + 1;
// The silhouette first reaches full width at the top ellipse's own widest point, which is its
// CENTRE row; the front rim is the same distance again below it.
let maxw = 0, mid = Y0;
for (let y = Y0; y <= Y1; y++) { let a = 1e9, bx = -1;
  for (let x = X0; x <= X1; x++) if (lum(x, y) < BG) { if (x < a) a = x; if (x > bx) bx = x; }
  if (bx - a + 1 > maxw) { maxw = bx - a + 1; mid = y; } }
const RIM = 2 * mid - Y0;                          // where the top face ends and the side begins

// ---- two bands, resampled ----
// Averaged over the CENTRE of each source cell, not the whole of it. Averaging the whole cell
// (12 source pixels across, at 64 samples over an 807-pixel drum) is a box blur that removes
// exactly the thing being sampled for: the stone's mottle. What came back was a clean
// left-to-right lighting ramp, and ordered-dithering a clean ramp gives regular diagonal
// stripes -- a gradient, not a rock. A narrow window keeps the local variation that makes the
// dither irregular, which is what the hand-drawn orb and angel get from being hand-drawn.
const WIN = +(process.env.PEDWIN ?? 0.34);        // fraction of the cell to average over
const band = (ya, yb, bw, bh) => {
  const rows = [];
  for (let j = 0; j < bh; j++) { const vals = [];
    for (let i = 0; i < bw; i++) {
      const cw = WD / bw, cxm = X0 + cw * (i + 0.5), chh = (yb - ya) / bh, cym = ya + chh * (j + 0.5);
      const xa = Math.round(cxm - cw * WIN / 2), xb = Math.max(Math.round(cxm + cw * WIN / 2), xa + 1);
      const ta = Math.round(cym - chh * WIN / 2), tb = Math.max(Math.round(cym + chh * WIN / 2), ta + 1);
      let s = 0, n = 0;
      for (let y = ta; y < tb; y++) for (let x = xa; x < xb; x++) { const L = lum(x, y); if (L < BG) { s += L; n++; } }
      vals.push(n ? Math.round(s / n) : null); }
    // Off the drum -- the bottom ellipse curves in, so the band's lower corners are backdrop.
    // Held at the nearest real sample in the row rather than at white: the build masks these
    // away in most rungs, and a stray 255 that DOES get sampled is a bright speck on the stone.
    for (let i = 0; i < bw; i++) if (vals[i] === null) {
      let k = 1, v = null;
      while (k < bw && v === null) { v = vals[i - k] ?? vals[i + k] ?? null; k++; }
      vals[i] = v ?? 128; }
    rows.push(vals.map(v => v.toString(16).padStart(2, '0')).join('')); }
  return rows;
};
const out = {
  note: 'Luminance bands lifted off pedestal.png by make-pedestal-art.mjs. Two hex digits a ' +
        'sample, 0 = black. NOT a silhouette: makePedLadder draws the drum procedurally and ' +
        'samples these for its MATERIAL, top band by top-face surface coordinate and side band ' +
        'by angle-and-height. Re-run the script to change the stone.',
  src: SRC, box: [X0, Y0, WD, HT], rimFrac: +((RIM - Y0) / HT).toFixed(4),
  topW: 64, topH: 12, sideW: 64, sideH: 24,
  top: band(Y0, RIM, 64, 12),
  side: band(RIM, Y1 + 1, 64, 24),
};
writeFileSync('./data/pedestal-art.json', JSON.stringify(out, null, 1));
const stat = rs => { const v = rs.join('').match(/../g).map(x => parseInt(x, 16)).sort((a, b) => a - b);
  return `min ${v[0]} median ${v[v.length >> 1]} max ${v[v.length - 1]}`; };
console.error(`pedestal-art.json: box ${WD}x${HT} (aspect ${(WD / HT).toFixed(2)}), rim at ${out.rimFrac} of the height`);
console.error(`  top  64x12  ${stat(out.top)}`);
console.error(`  side 64x24  ${stat(out.side)}`);
