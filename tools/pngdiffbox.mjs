// pngdiffbox.mjs a.png b.png -- how many pixels differ, and the bounding box (VICE screenshots: 8-bit RGB)
import { readFileSync } from 'fs'; import zlib from 'zlib';
const rd = f => { const b = readFileSync(f); let o = 8, w, h, idat = [];
  while (o < b.length) { const len = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8), d = b.slice(o + 8, o + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); } if (t === 'IDAT') idat.push(d); o += 12 + len; }
  return { w, h, raw: zlib.inflateSync(Buffer.concat(idat)) }; };
const a = rd(process.argv[2]), b = rd(process.argv[3]), st = a.raw.length / a.h;
let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
for (let y = 0; y < a.h; y++) for (let i = 1; i < st; i++) if (a.raw[y * st + i] !== b.raw[y * st + i]) {
  n++; const x = Math.floor((i - 1) / 3); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
console.log(n ? `${n} bytes differ, box x ${x0}-${x1} y ${y0}-${y1}` : 'identical');
