// editzones.mjs -- turn a hand-edited copy of a c64pic multicolour preview into NO-BROWN ZONES.
//
//   node tools/editzones.mjs <render.png> <edited.png> <zones.json>    then  c64pic ... --nobrown zones.json
//
// Paint brown out of the preview in any editor; this finds every multicolour pixel that WAS brown or
// orange in the render and is not in the edit, grows those patches a few pixels (to cover the specks
// at their edges) and writes a 320x200 mask. The edit need not be pixel-exact: the converter
// re-dithers the zones itself. Editors crop and rescale -- the first edit came back 939 wide, its
// left 21 columns cut -- so both readings (cropped, scaled) are tried at every x offset and the one
// that best matches the FLOOR (bottom quarter, never edited) wins; it reports the agreement.
import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
const [R, E, OUT] = process.argv.slice(2);
if (!OUT) { console.error('usage: editzones.mjs <render.png> <edited.png> <zones.json>'); process.exit(1); }
const dims = f => execFileSync('magick', ['identify', '-format', '%w %h', f]).toString().split(' ').map(Number);
const rgbOf = (f, w, h) => execFileSync('magick', [f, '-filter', 'point', '-resize', `${w}x${h}!`, '-depth', '8', 'rgb:-'], { maxBuffer: 1 << 26 });
const [RW, RH] = dims(R), [EW, EH] = dims(E);
if (RW !== 960 || RH !== 600) throw new Error(`${R} is ${RW}x${RH}; expected a c64pic multicolour preview (960x600)`);
const A = rgbOf(R, 960, 600);
const PAL = ['000000','ffffff','813338','75cec8','8e3c97','56ac4d','2e2c9b','edf171','8e5029','553800','c46c71','4a4a4a','7b7b7b','a9ff9f','706deb','b2b2b2'].map(h => [0,2,4].map(i => parseInt(h.slice(i,i+2),16)));
const idxOf = (buf, w, x, y) => { if (x < 0 || x >= w) return -1; const p = (y * w + x) * 3; let bi = 0, bd = 1e9;
  PAL.forEach((c, k) => { const d = (buf[p]-c[0])**2 + (buf[p+1]-c[1])**2 + (buf[p+2]-c[2])**2; if (d < bd) { bd = d; bi = k; } }); return bi; };
let best = null;
for (const mode of ['crop', 'scale']) {
  const w = mode === 'crop' ? Math.round(EW * 600 / EH) : 960, B = rgbOf(E, w, 600);
  for (let off = -40; off <= 40; off++) { let s = 0, n = 0;
    for (let cy = 150; cy < 200; cy++) for (let cx = 2; cx < 158; cx++) { const x = cx * 6 + 3, y = cy * 3 + 1, b = idxOf(B, w, x + off, y);
      if (b < 0) continue; n++; if (idxOf(A, 960, x, y) === b) s++; }
    if (n && (!best || s / n > best.agree)) best = { mode, off, w, B, agree: s / n }; }
}
console.log(`edit read as ${best.mode}, x offset ${best.off}: floor agreement ${(100 * best.agree).toFixed(1)}%`);
if (best.agree < 0.95) console.log('  WARNING: under 95% -- the edit may not line up; check the zones before trusting them');
const W = 160, H = 200, removed = new Uint8Array(W * H); let n = 0;
for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) { const x = cx * 6 + 3, y = cy * 3 + 1;
  const a = idxOf(A, 960, x, y), b = idxOf(best.B, best.w, x + best.off, y);
  if ((a === 8 || a === 9) && b >= 0 && b !== 8 && b !== 9) { removed[cy * W + cx] = 1; n++; } }
const rx = 2, ry = 4, z = new Uint8Array(320 * 200); let nz = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, c = 0;
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) { const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < W && yy < H) { s += removed[yy * W + xx]; c++; } }
  if (s / c > 0.12) { z[y * 320 + 2 * x] = z[y * 320 + 2 * x + 1] = 1; nz++; } }
writeFileSync(OUT, JSON.stringify({ W: 320, H: 200, note: `no-brown zones from ${E} (${best.mode}, offset ${best.off})`, mask: [...z] }));
console.log(`${n} pixels had brown painted out; ${nz} multicolour pixels in the zones -> ${OUT}`);
