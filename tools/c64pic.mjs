// c64pic.mjs -- convert an image to a C64 bitmap, hi-res or multicolour, dithered, with each
// block's colours chosen for that block.
//
//   node tools/c64pic.mjs <image> <out-prefix> [--hires] [--mc] [--bg n] [--crop] [--mixpen x]
//                         [--regions labels.json [--leaf 0,5,13] [--bark 0,9,8]]
//
// REGIONS (--regions): a 320x200 label map (bit 1 = leaf, bit 2 = bark; both = an overlap zone)
// gives those pixels a THEME -- only the listed colours may appear there. A whole-picture search
// gave the tree its true averaged colour, a flat brown; a theme says what it should READ as. Blocks
// still choose their own colours, from what their pixels allow; pixels outside every region keep
// all 16. Multicolour uses the map at half width (a double-wide pixel takes both halves' labels).
//
// Writes <out-prefix>-hires.png / -mc.png (3x previews, true C64 pixel shapes) and the C64 files
// <out-prefix>.art (hi-res: $2000 bitmap + $3f40 screen) and <out-prefix>.kla (Koala Painter).
//
// THE MODES. Hi-res: 320x200, each 8x8 block any 2 of the 16 colours (screen RAM nybbles).
// Multicolour: 160x200 double-wide pixels, each 4x8 block the shared background ($d021) plus any 3
// (screen RAM's two nybbles and colour RAM).
//
// HOW EACH BLOCK CHOOSES ITS COLOURS. Not by "nearest colours present": a block of smooth gradient
// wants colours that BRACKET it, which a dither then mixes. So every candidate set (120 pairs in
// hi-res, 455 triples in multicolour) is scored by how close each pixel can be got by blending two
// of its colours (see scoreBlock). The winning sets then constrain one Floyd-Steinberg pass over the whole picture, so
// the error flows across block borders rather than restarting at each. Dithering and blurring run
// in LINEAR light (averages of light are what the eye sees); every DISTANCE is measured in Oklab, a
// perceptual space. The first version weighted distance by luminance alone, which is nearly blind
// to hue: the olive foliage matched brown and grey on brightness and the tree lost its green.
import { execFileSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { png } from '../png.mjs';

const args = process.argv.slice(2);
const SRC = args[0], OUT = args[1];
const has = f => args.includes(f), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const DO_HI = has('--hires') || !has('--mc'), DO_MC = has('--mc') || !has('--hires');
if (!SRC || !OUT) { console.error('usage: c64pic.mjs <image> <out-prefix> [--hires] [--mc] [--bg n] [--crop]'); process.exit(1); }

// Colodore (Philip "pepto" Timmermann's 2017 measurement of real hardware), the default in VICE 3.x
const PAL = ['000000', 'ffffff', '813338', '75cec8', '8e3c97', '56ac4d', '2e2c9b', 'edf171',
             '8e5029', '553800', 'c46c71', '4a4a4a', '7b7b7b', 'a9ff9f', '706deb', 'b2b2b2']
  .map(h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)));
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const unlin = v => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
const PL = PAL.map(c => c.map(lin));
// Oklab from LINEAR rgb (Bjorn Ottosson, 2020). Inputs are clamped: a pixel carrying dither error
// can leave [0,1], and its nearest colour is that of the clamped value.
const oklab = (r, g, b) => {
  r = r < 0 ? 0 : r > 1 ? 1 : r; g = g < 0 ? 0 : g > 1 ? 1 : g; b = b < 0 ? 0 : b > 1 ? 1 : b;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
};
const PK = PL.map(p => oklab(...p));
const dk = (a, b) => { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; };
const d2 = (r, g, b, p) => dk(oklab(r, g, b), PK[PL.indexOf(p)]);

// ---- load and scale ----
const load = (w, h) => {
  const geo = has('--crop') ? [`${w}x${h}^`, '-gravity', 'center', '-extent', `${w}x${h}`] : [`${w}x${h}!`];
  // --sharpen r: an unsharp mask AFTER downscaling, to keep the detail the averaging smooths away
  const sh = opt('--sharpen', null) ? ['-unsharp', `0x${opt('--sharpen')}+1.0+0.02`] : [];
  const raw = execFileSync('magick', [SRC, '-colorspace', 'sRGB', '-filter', 'Lanczos', '-resize', ...geo, ...sh, '-depth', '8', 'rgb:-'],
                          { maxBuffer: 1 << 26 });
  const img = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h * 3; i++) img[i] = lin(raw[i]);
  return img;
};

// ---- score one candidate set on one block: how well, and how CALMLY, can dithering make it? ----
// A dither of colours A and B can show any blend between them -- a point on the segment A..B in
// LINEAR light. But a blend of distant colours is visible GRAIN up close: black and yellow make
// olive mathematically and a speckle visually (the second version did exactly that to the tree).
// So each blend also pays MIXPEN x t(1-t) x dist(A,B): nothing for a pure colour, most for an even
// mix of far-apart ones (the idea of Joel Yliluoma's positional-dithering work). Score = per pixel,
// the best over the set's pairs of  dist(pixel, blend) + penalty,  all distances in Oklab.
// Blends are tabulated per pair at 17 steps so scoring needs no colour conversions.
const MIXPEN = +(opt('--mixpen', 0.4));   // swept 0.25-1.0 on the tree: 0.25-0.5 best; 1.0 floods flat colour
const STEPS = 16, MIX = [];
for (let i = 0; i < 16; i++) { MIX.push([]); for (let j = 0; j < 16; j++) { const A = PL[i], B = PL[j], row = [];
  for (let k = 0; k <= STEPS; k++) { const t = k / STEPS; row.push(oklab(A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1]), A[2] + t * (B[2] - A[2]))); }
  MIX[i].push({ row, pen: MIXPEN * dk(PK[i], PK[j]) }); } }
function scoreBlock(img, W, x0, y0, bw, bh, set, pk, allow) {
  let sc = 0;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const s = ((y0 + y) * W + x0 + x) * 3, r = img[s], g = img[s + 1], b = img[s + 2], q = pk[(y0 + y) * W + x0 + x];
    const al = allow[(y0 + y) * W + x0 + x];
    let bd = Infinity;
    for (let i = 0; i < set.length; i++) for (let j = i; j < set.length; j++) {
      if (!((al >> set[i]) & 1) || !((al >> set[j]) & 1)) continue;   // outside this pixel's theme
      const A = PL[set[i]], B = PL[set[j]], dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2];
      const ll = dx * dx + dy * dy + dz * dz;
      let t = ll ? ((r - A[0]) * dx + (g - A[1]) * dy + (b - A[2]) * dz) / ll : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const k = Math.round(t * STEPS), m = MIX[set[i]][set[j]];
      const e = dk(q, m.row[k]) + m.pen * (k / STEPS) * (1 - k / STEPS);
      if (e < bd) bd = e;
    }
    sc += bd === Infinity ? 4 : bd;              // the set has nothing this pixel may use
  }
  return sc;
}

// ---- choose a set per block, then one global serpentine FS within the chosen sets ----
// setsFor(mask) -> the candidate sets for a block whose pixels together allow colour bits `mask`
function convert(img, W, H, bw, bh, setsFor, allow) {
  const BX = W / bw, BY = H / bh, choice = [], cache = new Map();
  const pk = []; for (let i = 0; i < W * H; i++) pk.push(oklab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2]));
  let total = 0;
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) {
    let mask = 0;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) mask |= allow[(by * bh + y) * W + bx * bw + x];
    if (!cache.has(mask)) cache.set(mask, setsFor(mask));
    let best = null, bs = Infinity;
    for (const set of cache.get(mask)) { const s = scoreBlock(img, W, bx * bw, by * bh, bw, bh, set, pk, allow); if (s < bs) { bs = s; best = set; } }
    choice.push(best); total += bs;
  }
  const work = Float32Array.from(img), idx = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const rev = y & 1;
    for (let i = 0; i < W; i++) {
      const x = rev ? W - 1 - i : i, t = (y * W + x) * 3, set = choice[Math.floor(y / bh) * BX + Math.floor(x / bw)];
      // clamp the carried error: an unbounded pile-up across a block that cannot express it bleeds
      // as a streak into the next block. But NOT tightly: themed regions dither colours far apart
      // (black and green), and a clamp at -0.2/1.2 threw away the darkness the black pixels should
      // have absorbed -- leaves of mean RGB 108,97,56 came out 94% solid green.
      const C0 = -0.6, C1 = 1.6;
      const r = Math.min(C1, Math.max(C0, work[t])), g = Math.min(C1, Math.max(C0, work[t + 1])), b = Math.min(C1, Math.max(C0, work[t + 2]));
      const al = allow[y * W + x], ok = set.filter(k => (al >> k) & 1), cand = ok.length ? ok : set;
      let bi = cand[0], bd = Infinity; const q = oklab(r, g, b);
      for (const k of cand) { const dd = dk(q, PK[k]); if (dd < bd) { bd = dd; bi = k; } }
      idx[y * W + x] = bi;
      const p = PL[bi], er = r - p[0], eg = g - p[1], eb = b - p[2], sx = rev ? -1 : 1;
      const push = (dx, dy, f) => { const xx = x + dx * sx, yy = y + dy; if (xx < 0 || xx >= W || yy >= H) return;
        const u = (yy * W + xx) * 3; work[u] += er * f; work[u + 1] += eg * f; work[u + 2] += eb * f; };
      push(1, 0, 7 / 16); push(-1, 1, 3 / 16); push(0, 1, 5 / 16); push(1, 1, 1 / 16);
    }
  }
  return { choice, idx, score: total };
}

const preview = (idx, W, H, pxw, file) => {
  const S = 3, OW = W * pxw * S, OH = H * S, rgb = new Uint8Array(OW * OH * 3);
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
    const c = PAL[idx[Math.floor(y / S) * W + Math.floor(x / (S * pxw))]], p = (y * OW + x) * 3;
    rgb[p] = c[0]; rgb[p + 1] = c[1]; rgb[p + 2] = c[2];
  }
  writeFileSync(file, png(OW, OH, rgb));
};
const combos = (n, k, from) => { const out = []; const rec = (s, a) => { if (a.length === k) return out.push(a);
  for (let i = s; i < from.length; i++) rec(i + 1, [...a, from[i]]); }; rec(0, []); return out; };
const ALL = [...Array(16).keys()];
const REG = opt('--regions', null) ? JSON.parse(readFileSync(opt('--regions'), 'utf8')) : null;
const LEAFC = opt('--leaf', '0,5,13').split(',').map(Number), BARKC = opt('--bark', '0,9,8').split(',').map(Number);
const bitsOf = cols => cols.reduce((m, c) => m | (1 << c), 0);
const allowFor = (W, H) => {
  const a = new Uint16Array(W * H).fill(0xffff);
  if (!REG) return a;
  if (REG.W !== 320 || REG.H !== 200) throw new Error(`--regions must be 320x200, not ${REG.W}x${REG.H}`);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lab = W === 320 ? REG.labels[y * 320 + x] : REG.labels[y * 320 + 2 * x] | REG.labels[y * 320 + 2 * x + 1];
    if (lab) a[y * W + x] = ((lab & 1) ? bitsOf(LEAFC) : 0) | ((lab & 2) ? bitsOf(BARKC) : 0);
  }
  return a;
};
const colsOf = mask => ALL.filter(c => (mask >> c) & 1);
// A THEME IS A RAMP. Themed pixels are re-targeted to their LUMINANCE placed on the theme's ramp
// (its colours sorted by brightness, blended in linear light between neighbours) before anything
// else happens. Without this the dither ran away: leaves of RGB 108,97,56 carry red that neither
// black nor green can give back, the red error piled up without limit, and that pile pushed every
// pixel to green -- the canopy came out flat. "Black, green, light green" means the leaves'
// BRIGHTNESS drawn in greens. Overlap pixels take the ramp their own hue is nearer (leaf above
// ~78 degrees in Oklab, bark below: measured on this image).
const Y = p => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
const ramp = cols => [...cols].sort((a, b) => Y(PL[a]) - Y(PL[b])).map(c => PL[c]);
const onRamp = (rp, y) => {
  if (y <= Y(rp[0])) return rp[0];
  for (let i = 0; i + 1 < rp.length; i++) { const a = Y(rp[i]), b = Y(rp[i + 1]);
    if (y <= b) { const t = (y - a) / (b - a); return rp[i].map((v, c) => v + t * (rp[i + 1][c] - v)); } }
  return rp[rp.length - 1];
};
// --stretch: each theme's own brightness range (2nd-98th percentile of its pixels) is spread over
// its ramp's full range, in Oklab L, so a region whose leaves all sit near one ramp colour (the
// ceiling-lit top of the canopy sat on plain green) still gets dithered texture.
const STRETCH = has('--stretch');
const Lof = p => oklab(...p)[0];
const theme = (img, W, H) => {
  if (!REG) return img;
  const out = Float32Array.from(img), LR = ramp(LEAFC), BR = ramp(BARKC);
  const labAt = (x, y) => W === 320 ? REG.labels[y * 320 + x] : REG.labels[y * 320 + 2 * x] | REG.labels[y * 320 + 2 * x + 1];
  const span = {};
  if (STRETCH) for (const [k, rp] of [[1, LR], [2, BR]]) {
    const Ls = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (labAt(x, y) === k) { const i = (y * W + x) * 3; Ls.push(Lof([img[i], img[i + 1], img[i + 2]])); }
    Ls.sort((a, b) => a - b);
    span[k] = { lo: Ls[Math.floor(Ls.length * 0.02)], hi: Ls[Math.floor(Ls.length * 0.98)], rlo: Lof(rp[0]), rhi: Lof(rp[rp.length - 1]) };
  }
  // map a pixel's L through its theme's stretch, then back to linear luminance for the ramp
  const yOf = (p, k) => { if (!STRETCH) return Y(p);
    const s = span[k], L = s.rlo + Math.min(1, Math.max(0, (Lof(p) - s.lo) / (s.hi - s.lo))) * (s.rhi - s.rlo);
    return L ** 3; };                     // Oklab L of a grey is cbrt(Y): invert it
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lab = W === 320 ? REG.labels[y * 320 + x] : REG.labels[y * 320 + 2 * x] | REG.labels[y * 320 + 2 * x + 1];
    if (!lab) continue;
    const i = (y * W + x) * 3, p = [img[i], img[i + 1], img[i + 2]];
    let k = lab === 3 ? 0 : lab;
    if (!k) { const [, a, b] = oklab(...p); k = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 >= 78 ? 1 : 2; }
    const q = onRamp(k === 1 ? LR : BR, yOf(p, k)); out[i] = q[0]; out[i + 1] = q[1]; out[i + 2] = q[2];
  }
  return out;
};

if (DO_HI) {
  const t0 = Date.now(), img = theme(load(320, 200), 320, 200);
  const { choice, idx } = convert(img, 320, 200, 8, 8, m => { const c = colsOf(m);
    return c.length >= 2 ? combos(c.length, 2, c) : [[c[0], c[0]]]; }, allowFor(320, 200));
  preview(idx, 320, 200, 1, `${OUT}-hires.png`);
  // .art (Art Studio): $2000, 8000 bytes of bitmap, then 1000 of screen (fg high nybble, bg low)
  const bm = new Uint8Array(8000), scr = new Uint8Array(1000);
  choice.forEach(([a, b], c) => { scr[c] = (b << 4) | a; });
  for (let c = 0; c < 1000; c++) { const cx = c % 40, cy = Math.floor(c / 40), [a, b] = choice[c];
    for (let r = 0; r < 8; r++) { let v = 0; for (let k = 0; k < 8; k++) v = (v << 1) | (idx[(cy * 8 + r) * 320 + cx * 8 + k] === b ? 1 : 0); bm[c * 8 + r] = v; } }
  writeFileSync(`${OUT}.art`, Buffer.from([0x00, 0x20, ...bm, ...scr, 0]));
  console.log(`hi-res: ${OUT}-hires.png, ${OUT}.art (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

if (DO_MC) {
  const t0 = Date.now(), img = theme(load(160, 200), 160, 200);
  // The background is shared by every block, so it is chosen by trying the likely ones whole.
  const tryBg = opt('--bg', null) !== null ? [+opt('--bg')] : [0, 11, 9, 6];
  let best = null;
  for (const bg of tryBg) {
    const r = convert(img, 160, 200, 4, 8, m => {
      let c = colsOf(m).filter(k => k !== bg);
      // fewer than 3 allowed: pad with colours no pixel here may use -- the slot exists regardless
      if (c.length < 3) c = c.concat(ALL.filter(k => k !== bg && !c.includes(k))).slice(0, 3);
      return combos(c.length, 3, c).map(s => [bg, ...s]); }, allowFor(160, 200));
    console.log(`  multicolour, background ${bg}: score ${r.score.toFixed(3)}`);
    if (!best || r.score < best.score) best = { ...r, bg };
  }
  preview(best.idx, 160, 200, 2, `${OUT}-mc.png`);
  // .kla (Koala): $6000, 8000 bitmap, 1000 screen (01 high nybble, 10 low), 1000 colour RAM (11), bg
  const bm = new Uint8Array(8000), scr = new Uint8Array(1000), col = new Uint8Array(1000);
  for (let c = 0; c < 1000; c++) {
    const [, c1, c2, c3] = best.choice[c], cx = c % 40, cy = Math.floor(c / 40);
    scr[c] = (c1 << 4) | c2; col[c] = c3;
    for (let r = 0; r < 8; r++) { let v = 0;
      for (let k = 0; k < 4; k++) { const p = best.idx[(cy * 8 + r) * 160 + cx * 4 + k];
        v = (v << 2) | (p === best.bg ? 0 : p === c1 ? 1 : p === c2 ? 2 : 3); }
      bm[c * 8 + r] = v; }
  }
  writeFileSync(`${OUT}.kla`, Buffer.from([0x00, 0x60, ...bm, ...scr, ...col, best.bg]));
  console.log(`multicolour: ${OUT}-mc.png, ${OUT}.kla, background ${best.bg} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
