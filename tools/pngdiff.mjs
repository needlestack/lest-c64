// pngdiff.mjs -- compare two VICE screenshots pixel for pixel, no dependencies.
//
//   node tools/pngdiff.mjs a.png b.png            differing pixel count and bounding box
//   node tools/pngdiff.mjs a.png b.png --dump     ...and the differing region as text (each char a pixel:
//                                            '.' same, 'a'/'b' where only one is dark, '#' both dark, differ)
//   node tools/pngdiff.mjs a.png --crop x,y,w,h   print one region of ONE image as text ('#' dark, '.' light)
//
// A PNG read of "looks the same" is worth nothing for a pixel-exact claim; this is the check. VICE
// writes 8-bit RGB(A) non-interlaced PNGs, which is all this decodes.
import { readFileSync } from 'fs';
import { inflateSync } from 'zlib';

const decode = f => {
  const b = readFileSync(f);
  let p = 8, w, h, bpp, idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('latin1', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4);
      const depth = d[8], ct = d[9];
      if (depth !== 8 || d[12] !== 0) throw new Error(`${f}: only 8-bit non-interlaced PNGs`);
      bpp = { 2: 3, 6: 4, 0: 1, 4: 2 }[ct];
      if (!bpp) throw new Error(`${f}: colour type ${ct} not handled`);
    } else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0, i = 0; y < h; y++) {
    const ft = raw[i++], row = out.subarray(y * stride, (y + 1) * stride), up = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0, bb = up ? up[x] : 0, c = up && x >= bpp ? up[x - bpp] : 0, v = raw[i++];
      let r;
      switch (ft) {
        case 0: r = v; break;
        case 1: r = v + a; break;
        case 2: r = v + bb; break;
        case 3: r = v + ((a + bb) >> 1); break;
        case 4: { const q = a + bb - c, pa = Math.abs(q - a), pb = Math.abs(q - bb), pc = Math.abs(q - c);
                  r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c); break; }
        default: throw new Error(`filter ${ft}`);
      }
      row[x] = r & 255;
    }
  }
  // luma per pixel, which is all a two-colour screen needs
  const lum = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = bpp >= 3 ? (out[i * bpp] * 3 + out[i * bpp + 1] * 6 + out[i * bpp + 2]) / 10 : out[i * bpp];
  return { w, h, lum };
};

const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('--'));
const opt = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1] ?? true; };
const A = decode(files[0]);
if (opt('--crop')) {
  const [x0, y0, cw, ch] = opt('--crop').split(',').map(Number);
  for (let y = y0; y < y0 + ch; y++) {
    let s = '';
    for (let x = x0; x < x0 + cw; x++) s += A.lum[y * A.w + x] < 128 ? '#' : '.';
    console.log(String(y).padStart(4) + ' ' + s);
  }
  process.exit(0);
}
const B = decode(files[1]);
if (A.w !== B.w || A.h !== B.h) throw new Error(`sizes differ: ${A.w}x${A.h} vs ${B.w}x${B.h}`);
let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
  const i = y * A.w + x;
  if (Math.abs(A.lum[i] - B.lum[i]) > 40) { n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
}
console.log(n ? `${n} pixels differ, in x ${x0}-${x1}, y ${y0}-${y1}` : 'identical');
if (n && opt('--dump')) {
  for (let y = y0; y <= y1; y++) {
    let s = '';
    for (let x = x0; x <= x1; x++) {
      const i = y * A.w + x, da = A.lum[i] < 128, db = B.lum[i] < 128;
      s += da === db ? (da ? '#' : '.') : da ? 'a' : 'b';
    }
    console.log(String(y).padStart(4) + ' ' + s);
  }
}
