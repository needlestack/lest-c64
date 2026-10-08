// treeseg.mjs -- leaf / bark masks for the tree image, at a given conversion resolution.
//   node treeseg.mjs <image> <W> <H> <out.json> [overlay.png]
// Classes come from measured Oklab stats of the source (leaves hue ~95-100, bark ~60, both
// chroma ~0.04-0.05, mid-dark; racks near-neutral; floor/ceiling bright), smoothed so a region is
// a coherent area rather than per-pixel noise. labels: 0 rest, 1 leaf, 2 bark, 3 both (overlap).
import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
import { png } from '../src/png.mjs';
const [SRC, W, H, OUT, OV] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5], process.argv[6]];
const P = k => +(process.env[k] ?? { CMIN: 0.022, LMIN: 0.10, LMAX: 0.72, HSPLIT: 78, HMAX: 145, HMIN: 30, R: 3, TH: 0.35, OV: 0.18 }[k]);
const raw = execFileSync('magick', [SRC, '-colorspace', 'sRGB', '-filter', 'Lanczos', '-resize', `${W}x${H}!`, '-depth', '8', 'rgb:-'], { maxBuffer: 1 << 26 });
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const ok = (r, g, b) => { [r, g, b] = [r, g, b].map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]; };
const leaf = new Float32Array(W * H), bark = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const [L, a, b] = ok(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]), C = Math.hypot(a, b), h = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  if (C < P('CMIN') || L < P('LMIN') || L > P('LMAX') || h < P('HMIN') || h > P('HMAX')) continue;
  if (h >= P('HSPLIT')) leaf[i] = 1; else bark[i] = 1;
}
// smooth: fraction of class pixels within radius R (a box; the pixel aspect differs by mode, so R is in pixels of this grid)
const box = (m, R) => { const o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) { s += m[yy * W + xx]; n++; } }
    o[y * W + x] = s / n; } return o; };
const R = Math.max(1, Math.round(P('R') * W / 320)), ls = box(leaf, R), bs = box(bark, R);
const lab = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  const L = ls[i] > P('TH') || (ls[i] > P('OV') && bs[i] > P('OV')), B = bs[i] > P('TH') || (bs[i] > P('OV') && ls[i] > P('OV'));
  lab[i] = (L ? 1 : 0) | (B ? 2 : 0);
}
// THE TREE IS ONE PIECE: keep only the largest 8-connected region of `bits`. Run twice: for the
// whole tree (any class), then for BARK alone -- the warm-lit strips where the walls meet the
// ceiling pass the colour test as bark and touch the canopy's leaves, but not the trunk's bark.
const keepLargest = bits => { const comp = new Int32Array(W * H).fill(-1), sizes = [];
  for (let i = 0; i < W * H; i++) if ((lab[i] & bits) && comp[i] < 0) { const id = sizes.length, st = [i]; comp[i] = id; let n = 0;
    while (st.length) { const p = st.pop(); n++; const x = p % W, y = (p / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy, q = yy * W + xx;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && (lab[q] & bits) && comp[q] < 0) { comp[q] = id; st.push(q); } } }
    sizes.push(n); }
  const big = sizes.indexOf(Math.max(...sizes));
  for (let i = 0; i < W * H; i++) if ((lab[i] & bits) && comp[i] !== big) lab[i] &= ~bits; };
keepLargest(3);
// Collect the WALL STRIPS before bark connectivity removes them: pure-bark regions touching the
// picture's border. (The right one used to vanish in keepLargest(2) and was never line-fitted, so
// its diagonal "branch" stayed in the canopy -- the user circled both.)
const strips = [];
{ const seen = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (lab[i] === 2 && !seen[i]) { const st = [i], part = []; seen[i] = 1; let edge = false;
    while (st.length) { const p = st.pop(); part.push(p); const x = p % W, y = (p / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy, q = yy * W + xx;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && lab[q] === 2 && !seen[q]) { seen[q] = 1; st.push(q); } } }
    if (edge) { for (const q of part) lab[q] = 32; strips.push(part); } } }   // 32: the wall TRIM
keepLargest(2);
// ...and the left strip still reached the trunk THROUGH the canopy's overlap zone. What really
// tells it apart: it runs off the edge of the picture, and no part of the tree's bark does. So a
// region of PURE bark that touches the border is not bark.
{ const seen = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (lab[i] === 2 && !seen[i]) { const st = [i], part = []; seen[i] = 1; let edge = false;
    while (st.length) { const p = st.pop(); part.push(p); const x = p % W, y = (p / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy, q = yy * W + xx;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && lab[q] === 2 && !seen[q]) { seen[q] = 1; st.push(q); } } }
    if (edge) { for (const q of part) lab[q] = 0; strips.push(part); } } }
// ...AND THE STRIP CONTINUES BEHIND THE TREE. The warm wall/ceiling edge shows through gaps in the
// leaves as bark-coloured specks, which lined up into a brown diagonal sweep across the canopy at
// exactly the wall's angle (the user circled it). Its colour does not separate it from real branches
// (median L 0.43 against 0.36, overlapping), but its POSITION is known: fit a line through each
// visible strip, extend it, and inside the canopy's overlap zone nothing along it is bark.
for (const part of strips) {
  if (part.length < 20) continue;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of part) { const x = p % W, y = (p / W) | 0; sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const k = part.length, a = (k * sxy - sx * sy) / (k * sxx - sx * sx), b = (sy - a * sx) / k;
  const nrm = Math.hypot(a, 1), ds = part.map(p => Math.abs(a * (p % W) - ((p / W) | 0) + b) / nrm).sort((u, v) => u - v);
  const half = ds[Math.floor(ds.length * 0.9)] + 2, left = sx / k < W / 2;
  let n = 0;
  for (let i = 0; i < W * H; i++) { const x = i % W, y = (i / W) | 0;
    if (lab[i] !== 3 || (left ? x > W / 2 : x < W / 2)) continue;
    if (Math.abs(a * x - y + b) / nrm <= half) { lab[i] = 1; n++; } }
  console.log(`wall strip (${left ? 'left' : 'right'}): y = ${a.toFixed(2)}x + ${b.toFixed(1)}, half-width ${half.toFixed(1)}; ${n} canopy pixels no longer bark`);
}
// ---- THE REST OF THE SCENE (bits 4, 8, 16), measured by row band on this image: non-tree pixels
// are bright above row ~50 (the ceiling) and below ~145 (the floor), dark between (the racks), and
// the racks carry small saturated spots (the LEDs). Fractions of H so another size works.
//   4 racks: grey ramp   8 ceiling: grey ramp   16 a light inside the racks: left free
//   32 the wall TRIM (the warm strip where each wall meets the ceiling; set above)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x; if (lab[i]) continue;
  const [L, a, b] = ok(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]), C = Math.hypot(a, b);
  const ceil = y < 0.5 * H && L > 0.5, floor = y >= 0.72 * H && L > 0.5;
  if (ceil) lab[i] = 8;
  else if (!floor) lab[i] = C > 0.06 && L > 0.3 ? 16 : 4;
}
writeFileSync(OUT, JSON.stringify({ W, H, labels: [...lab] }));
if (OV) {   // the source, dimmed, tinted by class: green leaf, orange bark, yellow both
  const S = Math.round(960 / W), OW = W * S, OH = H * S * (W === 160 ? 1 : 1), rgb = new Uint8Array(OW * H * S * 3);
  for (let y = 0; y < H * S; y++) for (let x = 0; x < OW; x++) { const i = Math.floor(y / S) * W + Math.floor(x / S), p = (y * OW + x) * 3;
    const g = (raw[i * 3] + raw[i * 3 + 1] + raw[i * 3 + 2]) / 6;
    const t = { 0: [g, g, g], 1: [40, 200, 60], 2: [230, 120, 30], 3: [240, 230, 40], 4: [60, 90, 220], 8: [170, 60, 200], 16: [255, 0, 0], 32: [255, 255, 255] }[lab[i]];
    const k = lab[i] ? 0.6 : 0; for (let c = 0; c < 3; c++) rgb[p + c] = Math.round(g * (1 - k) + t[c] * k); }
  writeFileSync(OV, png(OW, H * S, rgb));
}
const cnt = {}; lab.forEach(v => { cnt[v] = (cnt[v] ?? 0) + 1; });
console.log(`${W}x${H}: ` + Object.entries({ 0: 'floor/rest', 1: 'leaf', 2: 'bark', 3: 'both', 4: 'racks', 8: 'ceiling', 16: 'lights', 32: 'trim' })
  .map(([k, n]) => `${n} ${cnt[k] ?? 0}`).join(', '));
