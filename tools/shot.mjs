#!/usr/bin/env node
// Read a VICE -exitscreenshot PNG and print a region as ASCII, or report stats.
// Node's zlib is enough; no image library needed.  usage:
//   node tools/shot.mjs file.png            -> size + a downscaled overview
//   node tools/shot.mjs file.png x y w h    -> that region, 1 char per pixel
import { readFileSync } from 'fs'; import { inflateSync } from 'zlib';
const f = process.argv[2];
const buf = readFileSync(f);
let p = 8, w = 0, h = 0, bd = 0, ct = 0, idat = [], pal = null;
while (p < buf.length) {
  const len = buf.readUInt32BE(p), typ = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
  if (typ === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; }
  else if (typ === 'PLTE') pal = d;
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
const lum = (x, y) => {
  if (bd === 8 && ch === 1) { const v = img[y * stride + x]; return pal ? (pal[v * 3] + pal[v * 3 + 1] + pal[v * 3 + 2]) / 3 : v; }
  if (bd === 4) { const b = img[y * stride + (x >> 1)], v = (x & 1) ? (b & 15) : (b >> 4); return pal ? (pal[v * 3] + pal[v * 3 + 1] + pal[v * 3 + 2]) / 3 : v * 17; }
  const i = y * stride + x * bpp; return (img[i] + img[i + 1] + img[i + 2]) / 3;
};
// RRGGBB per pixel, space separated. The '#'/'.' modes threshold luminance at 128, which is
// blind to anything dark-on-dark: the dark-grey panel seams (lum 98) on the black wall read
// as plain wall, so the seam checker silently reported "drawn 0" for every view once the
// seams were recoloured. A caller that compares colours instead of brightness survives the
// next recolour too.
const col = (x, y) => {
  if (bd === 8 && ch === 1) { const v = img[y * stride + x];
    return pal ? [pal[v*3], pal[v*3+1], pal[v*3+2]].map(n => n.toString(16).padStart(2,'0')).join('')
               : v.toString(16).padStart(2,'0').repeat(3); }
  if (bd === 4) { const b = img[y * stride + (x >> 1)], v = (x & 1) ? (b & 15) : (b >> 4);
    return pal ? [pal[v*3], pal[v*3+1], pal[v*3+2]].map(n => n.toString(16).padStart(2,'0')).join('')
               : (v * 17).toString(16).padStart(2,'0').repeat(3); }
  const i = y * stride + x * bpp;
  return [img[i], img[i+1], img[i+2]].map(n => n.toString(16).padStart(2,'0')).join('');
};
const rawMode = process.argv.includes('--raw');
const a = process.argv.slice(3).filter(s => s !== '--raw').map(Number);
if (a.length === 4) {
  const [x0, y0, ww, hh] = a; let out = '';
  for (let y = y0; y < y0 + hh; y++) { let s = [];
    for (let x = x0; x < x0 + ww; x++) s.push(rawMode ? col(x, y) : (lum(x, y) > 128 ? '#' : '.'));
    out += (rawMode ? s.join(' ') : s.join('')) + '\n'; }
  process.stdout.write(out);
} else {
  console.log(`${f}: ${w}x${h} bd=${bd} ct=${ct} pal=${!!pal}`);
  let s = '';
  for (let y = 0; y < h; y += 4) { for (let x = 0; x < w; x += 2) s += lum(x, y) > 128 ? '#' : '.'; s += '\n'; }
  process.stdout.write(s);
}
