// editdark.mjs -- how much DARKER did a hand edit make each part of a c64pic multicolour preview?
//
//   node tools/editdark.mjs <render.png> <edited.png> <darkmap.json> [--from 0.68]
//   then  c64pic ... --darkmap darkmap.json
//
// The user darkened the earth around the tree's roots by hand (not pixel-exact, and on an older
// render). Pixel matching would be meaningless, so this compares BRIGHTNESS, SMOOTHED: both pictures
// are read on the 160x200 multicolour grid (alignment found from the never-edited floor, as in
// editzones.mjs), each pixel's C64 colour turned into linear luminance, box-blurred over a few
// pixels, and the ratio edit/render taken wherever the edit is darker. Only rows from --from (a
// fraction of the height, default 0.68: the base of the tree) are kept; elsewhere the map is 1.
// Writes a 320x200 map of factors 0.05..1.
import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
const args = process.argv.slice(2), [R, E, OUT] = args.filter(a => !a.startsWith('--') && !/^[0-9.]+$/.test(a));
const FROM = +(args[args.indexOf('--from') + 1] ?? 0.68) || 0.68;
if (!OUT) { console.error('usage: editdark.mjs <render.png> <edited.png> <darkmap.json> [--from f]'); process.exit(1); }
const dims = f => execFileSync('magick', ['identify', '-format', '%w %h', f]).toString().split(' ').map(Number);
const rgbOf = (f, w, h) => execFileSync('magick', [f, '-filter', 'point', '-resize', `${w}x${h}!`, '-depth', '8', 'rgb:-'], { maxBuffer: 1 << 26 });
const [EW, EH] = dims(E), A = rgbOf(R, 960, 600);
const PAL = ['000000','ffffff','813338','75cec8','8e3c97','56ac4d','2e2c9b','edf171','8e5029','553800','c46c71','4a4a4a','7b7b7b','a9ff9f','706deb','b2b2b2'].map(h => [0,2,4].map(i => parseInt(h.slice(i,i+2),16)));
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const LUM = PAL.map(([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b));
const idxOf = (buf, w, x, y) => { if (x < 0 || x >= w) return -1; const p = (y * w + x) * 3; let bi = 0, bd = 1e9;
  PAL.forEach((c, k) => { const d = (buf[p]-c[0])**2 + (buf[p+1]-c[1])**2 + (buf[p+2]-c[2])**2; if (d < bd) { bd = d; bi = k; } }); return bi; };
let best = null;
for (const mode of ['crop', 'scale']) {
  const w = mode === 'crop' ? Math.round(EW * 600 / EH) : 960, B = rgbOf(E, w, 600);
  for (let off = -40; off <= 40; off++) { let s = 0, n = 0;
    for (let cy = 185; cy < 200; cy++) for (let cx = 2; cx < 158; cx++) { const x = cx * 6 + 3, y = cy * 3 + 1, b = idxOf(B, w, x + off, y);
      if (b < 0) continue; n++; if (idxOf(A, 960, x, y) === b) s++; }
    if (n && (!best || s / n > best.agree)) best = { mode, off, w, B, agree: s / n }; }
}
console.log(`edit read as ${best.mode}, x offset ${best.off}: bottom-floor agreement ${(100 * best.agree).toFixed(1)}%`);
const W = 160, H = 200, la = new Float32Array(W * H), le = new Float32Array(W * H);
for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) { const x = cx * 6 + 3, y = cy * 3 + 1, i = cy * W + cx;
  la[i] = LUM[idxOf(A, 960, x, y)]; const b = idxOf(best.B, best.w, x + best.off, y); le[i] = b < 0 ? la[i] : LUM[b]; }
const blur = (m, rx, ry) => { const o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0;
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) { const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) { s += m[yy * W + xx]; n++; } }
    o[y * W + x] = s / n; } return o; };
const ba = blur(la, 2, 3), be = blur(le, 2, 3), map = new Float32Array(320 * 200).fill(1);
let n = 0, sum = 0;
for (let y = Math.round(FROM * H); y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x;
  if (be[i] >= ba[i] || ba[i] < 1e-4) continue;
  const f = Math.max(0.05, be[i] / ba[i]); map[y * 320 + 2 * x] = map[y * 320 + 2 * x + 1] = f; n++; sum += f; }
// ...and the edit's own COLOURS there (linear rgb), for c64pic to use as the TARGET of those pixels. The ratio alone was too gentle:
// the user's base is mostly flat black with thin brown root lines, and averaging brightness over a
// neighbourhood blurred those lines into the black, which weakened the measured darkening.
const rgbE = [0, 1, 2].map(c => { const m = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) { const cy = Math.floor(i / W), cx = i % W, b = idxOf(best.B, best.w, cx * 6 + 3 + best.off, cy * 3 + 1);
    m[i] = b < 0 ? -1 : lin(PAL[b][c]); } return m; });
const target = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (y < Math.round(FROM * H)) { target.push(null); continue; }
  // EXACT pixel colour, not smoothed: a 3x3 blend in linear light let the brighter brown outweigh
  // black, smearing the thin root lines over the black earth -- the target came out brown.
  const i = y * W + x;
  target.push(rgbE[0][i] < 0 ? null : [0, 1, 2].map(c => Math.round(rgbE[c][i] * 10000) / 10000));
}
writeFileSync(OUT, JSON.stringify({ W: 320, H: 200, note: `darkening from ${E} vs ${R} (${best.mode}, offset ${best.off}), rows from ${FROM}`,
  map: [...map].map(v => Math.round(v * 1000) / 1000), targetW: W, target }));
console.log(`${n} multicolour pixels darkened, mean factor ${(sum / Math.max(1, n)).toFixed(2)} -> ${OUT}`);
