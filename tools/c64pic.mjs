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
// Oklab -> LINEAR rgb (the inverse of oklab above), for adjusting a colour's chroma in place
const unoklab = (L, a, b) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3,
        s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076956010 * s];
};
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
// smooth > 0: NEIGHBOUR-AWARE CHOICE (hi-res). Each block first takes its own best set; then a few
// rounds re-pick every block counting a cost for each neighbour it shares NO colour with (1) or
// only one with while differing (0.3), scaled by `smooth` x the mean block score. Two blocks with
// disjoint pairs can only meet in a hard line; sharing a colour lets the border dither through it.
// In MULTICOLOUR the cost is the fraction of a block's own three colours its neighbour lacks (the
// shared background never counts) -- the lesson of a 4-colour-total conversion that looked better in
// places than per-block freedom: where every block uses the same colours there are no seams.
// KEEPERR (default on with --regions; --leakerr turns it off): dither error stays inside the region
// it came from. Error is a debt in ONE theme's terms; carried into another ramp it is meaningless,
// and the bright-leaf dither (black <-> light green, large swings) poured its leftovers down into
// the trunk and flattened it to dark brown -- the trunk only looked right without that ramp.
function convert(img, W, H, bw, bh, setsFor, allow, smooth = 0, mc = false, region = null) {
  const BX = W / bw, BY = H / bh, choice = [], cache = new Map(), cands = [];
  const pk = []; for (let i = 0; i < W * H; i++) pk.push(oklab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2]));
  let total = 0;
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) {
    let mask = 0;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) mask |= allow[(by * bh + y) * W + bx * bw + x];
    if (!cache.has(mask)) cache.set(mask, setsFor(mask));
    const list = cache.get(mask).map(set => ({ set, sc: scoreBlock(img, W, bx * bw, by * bh, bw, bh, set, pk, allow) }));
    let best = list[0];
    for (const c of list) if (c.sc < best.sc) best = c;
    cands.push(list); choice.push(best.set); total += best.sc;
  }
  if (smooth > 0) {
    const lam = smooth * total / choice.length;
    const clash = mc ? (a, b) => a.slice(1).filter(c => !b.includes(c)).length / 3
                     : (a, b) => { const sh = a.filter(c => b.includes(c)).length;
                                   return sh === 0 ? 1 : (sh < a.length && sh < b.length) ? 0.3 : 0; };
    for (let round = 0; round < 4; round++) {
      let changed = 0;
      for (let b = 0; b < choice.length; b++) {
        const bx = b % BX, by = Math.floor(b / BX), nb = [];
        if (bx > 0) nb.push(b - 1); if (bx < BX - 1) nb.push(b + 1); if (by > 0) nb.push(b - BX); if (by < BY - 1) nb.push(b + BX);
        let best = null, bc = Infinity;
        for (const c of cands[b]) { const cost = c.sc + lam * nb.reduce((n, o) => n + clash(c.set, choice[o]), 0);
          if (cost < bc) { bc = cost; best = c.set; } }
        if (best !== choice[b]) { choice[b] = best; changed++; }
      }
      if (!changed) break;
    }
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
        if (region && region[yy * W + xx] !== region[y * W + x] && (KEEPERR === 'all' || region[y * W + x] === 2)) return;
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
const SMOOTH = +opt('--smooth', 0.5), SMOOTHMC = +opt('--smoothmc', 0);
// 'all' (default): no error crosses a region border -- on the tree, the trunk closest to the
// user's preferred version. 'bright': only error LEAVING the bright-leaf region is held back (left
// the trunk's upper part flatter). --leakerr: none held back (the trunk went flat dark brown).
const KEEPERR = has('--leakerr') ? false : opt('--keeperr', 'all');
const SHOOTS = +opt('--shoots', 0);
const BRANCHTEX = +opt('--branchtex', 0);
const REG = opt('--regions', null) ? JSON.parse(readFileSync(opt('--regions'), 'utf8')) : null;
const LEAFC = opt('--leaf', '0,5,13').split(',').map(Number), BARKC = opt('--bark', '0,9,8').split(',').map(Number);
const NOLEAF2 = opt('--leaf2', '') === 'none';
const LEAF2C = (NOLEAF2 ? '0,13' : opt('--leaf2', '0,13')).split(',').map(Number);
const bitsOf = cols => cols.reduce((m, c) => m | (1 << c), 0);
const colsOf = mask => ALL.filter(c => (mask >> c) & 1);
// A THEME IS A RAMP. Themed pixels are re-targeted to their LUMINANCE placed on the theme's ramp
// (its colours sorted by brightness, blended in linear light between neighbours). Without this the
// dither ran away: leaves of RGB 108,97,56 carry red that neither black nor green can give back, the
// red error piled up without limit, and that pile pushed every pixel to green -- the canopy came
// out flat. "Black, green, light green" means the leaves' BRIGHTNESS drawn in greens.
const Y = p => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
const ramp = cols => [...cols].sort((a, b) => Y(PL[a]) - Y(PL[b])).map(c => PL[c]);
const onRamp = (rp, y) => {
  if (y <= Y(rp[0])) return rp[0];
  for (let i = 0; i + 1 < rp.length; i++) { const a = Y(rp[i]), b = Y(rp[i + 1]);
    if (y <= b) { const t = (y - a) / (b - a); return rp[i].map((v, c) => v + t * (rp[i + 1][c] - v)); } }
  return rp[rp.length - 1];
};
const boxBlur = (m, W, H, rx, ry) => {             // separable box, edge-normalised
  const t = new Float32Array(W * H), o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0;
    for (let d = -rx; d <= rx; d++) { const xx = x + d; if (xx >= 0 && xx < W) { s += m[y * W + xx]; n++; } } t[y * W + x] = s / n; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0;
    for (let d = -ry; d <= ry; d++) { const yy = y + d; if (yy >= 0 && yy < H) { s += t[yy * W + x]; n++; } } o[y * W + x] = s / n; }
  return o;
};
// THEMES ARE FEATHERED. A pixel is not "leaf" or "bark" or "background" but a mix, by WEIGHTS: the
// labels blurred over --feather pixels (default 4, in 320-wide units). Its target blends each
// theme's ramp colour with the original by those weights, and every palette with real weight is
// allowed there. The first version switched hard at the region edges, so neighbouring blocks shared
// almost no colours and every border became a straight line -- a staircase on the 8x8 grid.
// BRIGHT LEAVES (--leaf2, black/light green): leaves about as bright as C64 green rendered as SOLID
// green -- the ceiling-lit top and right of the canopy, a large flat area. Leaves get leaf2's ramp
// in proportion to their local brightness (ramping in from 60% to 90% of green's luminance), so
// that brightness comes out as a black/light-green dither instead.
const FEATHER = +opt('--feather', 4);
const TEXTURE = +opt('--texture', 0);
// --overlap: 'hue' (default -- the version the user preferred: split at 78 degrees, then feathered
// with the rest), 'branch' (per pixel, unblurred, bark below --barkhue), 'leaf' (all leaf).
const OVERLAP = opt('--overlap', 'hue');
// --scene: also theme treeseg's racks/ceiling (grey ramps) and free its lights. Opt-in: the user
// preferred the scene in its own colours, with only brown kept out of it (--bgavoid).
const SCENE = has('--scene');
// --edgesoft r: within r pixels of a BLOCK edge the target fades toward a local blur that spans
// both blocks. Each block's last pixels before the border then ask for an in-between colour, which
// two colours can only give by dithering -- on both sides. Without it, two blocks of different
// colour sets met as flat fills in a straight line (the user: "any time a block is going to get
// cut to another color at the edge, there should be dithering on both blocks").
const EDGESOFT = +opt('--edgesoft', 0);
const edgeSoft = (img, W, H, bw, bh, r) => {
  if (!r) return img;
  const out = Float32Array.from(img), ch = [0, 1, 2].map(c => { const m = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) m[i] = img[i * 3 + c]; return boxBlur(m, W, H, r, r); });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.min(x % bw, bw - 1 - (x % bw), y % bh, bh - 1 - (y % bh)), w = Math.max(0, 1 - d / r);
    if (!w) continue;
    const i = y * W + x; for (let c = 0; c < 3; c++) out[i * 3 + c] = img[i * 3 + c] * (1 - w) + ch[c][i] * w;
  }
  return out;
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// OVERLAP (branches inside the canopy), --overlap: 'leaf' = all leaf (hi-res: a 2-colour block
// cannot draw the leaf-and-twig mix and went flat brown); 'branch' (default) = per pixel, UNBLURRED,
// bark only where the pixel itself is clearly bark-hued (Oklab hue < --barkhue, 65) -- the branch
// LINES. The first multicolour version split overlap at 78 and then blurred the bark weight over
// 4 px, which laid swaths of brown across leafy parts of the canopy.
// SCENE THEMES (from treeseg's bits 4/8/16): racks on --racks (black/dark grey/grey/light grey),
// ceiling on --ceil (dark grey up to white), and LIGHTS -- small saturated spots in the racks --
// left completely free so the LEDs keep their colours.
const RACKC = opt('--racks', '0,11,12,15').split(',').map(Number), CEILC = opt('--ceil', '11,12,15,1').split(',').map(Number);
const BARKHUE = +opt('--barkhue', 65);
// --bgavoid c,c: colours the BACKGROUND (everything outside the tree's themes) may not use. The
// user, on the preferred version: walls, floor and ceiling may keep some colour, but not brown --
// the background should avoid the tree's palette so the trunk pops. Default brown and orange.
// --trimavoid c,c (default red): further colours banned on the wall TRIM only (treeseg's bit 32,
// grown 2 px to take in the blocks along its edge). The C64's red (#813338) is nearly as bright as
// dark grey, so with brown banned the warm trim landed on red: a solid red block and red corners.
// Banning red everywhere fixed that and killed the rack LEDs the user wants to keep -- and blink.
const TRIMAVOID = bitsOf(opt('--trimavoid', '2').split(',').filter(Boolean).map(Number));
const BGSAT = +opt('--bgsat', 1);
const BASEDARK = +opt('--basedark', 0);
const DM = opt('--darkmap', null) ? JSON.parse(readFileSync(opt('--darkmap'), 'utf8')) : null;
const DARKMAP = DM ? DM.map : null, DARKTGT = DM ? DM.target : null, DARKTW = DM ? DM.targetW : 0;
const EDITMODE = opt('--editmode', 'exact');
let dmN, dmY;
const AVOID = bitsOf(opt('--bgavoid', REG ? '9,8' : '').split(',').filter(Boolean).map(Number));
// --nobrown mask.json: hand-marked zones (320x200) where the tree is leaf and brown/orange may not
// appear -- made from the user's manual edit, the patches they painted brown out of, grown a few
// pixels to cover the specks at their edges. The dither stays the converter's own, so it blends.
const NOBROWN = opt('--nobrown', null) ? JSON.parse(readFileSync(opt('--nobrown'), 'utf8')).mask : null;
const themed = (img, W, H) => {
  const nbAt = (x, y) => NOBROWN ? (W === 320 ? NOBROWN[y * 320 + x] : NOBROWN[y * 320 + 2 * x] | NOBROWN[y * 320 + 2 * x + 1]) : 0;
  const allow = new Uint16Array(W * H).fill(0xffff & ~AVOID);
  if (!REG) return { img, allow, region: new Uint8Array(W * H) };
  if (REG.W !== 320 || REG.H !== 200) throw new Error(`--regions must be 320x200, not ${REG.W}x${REG.H}`);
  const n = W * H, cls = [1, 2, 4, 8].map(() => new Float32Array(n)), lum = new Float32Array(n);
  const region = new Uint8Array(n);          // the pixel's DOMINANT theme, 0 = background (see KEEPERR)
  const ovl = new Int8Array(n), light = new Uint8Array(n);   // overlap: 1 leaf / 2 bark, per pixel
  const both = new Uint8Array(n);                            // overlap in 'hue' mode: may use both palettes
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, lab = W === 320 ? REG.labels[y * 320 + x] : REG.labels[y * 320 + 2 * x] | REG.labels[y * 320 + 2 * x + 1];
    const p = [img[i * 3], img[i * 3 + 1], img[i * 3 + 2]]; lum[i] = Y(p);
    if (SCENE && (lab & 16)) { light[i] = 1; continue; }
    if (nbAt(x, y)) { cls[0][i] = 1; continue; }              // a no-brown zone: leaf, whatever else
    // ...and an OVERLAP pixel (may take either palette) within 2 px of one: the zone's edge had left
    // a 1-pixel brown line down the side of a painted-out branch (see REMNANTS below)
    if ((lab & 3) === 3 && NOBROWN) { let nb = 0;
      for (let dy = -2; dy <= 2 && !nb; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && nbAt(xx, yy)) { nb = 1; break; } }
      if (nb) { cls[0][i] = 1; continue; } }
    if ((lab & 3) === 3) {
      if (OVERLAP === 'leaf') { cls[0][i] = 1; continue; }
      const [, a, b] = oklab(...p), h = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
      if (OVERLAP === 'hue') { cls[h >= 78 ? 0 : 1][i] = 1; both[i] = 1; continue; }   // the version the user preferred
      ovl[i] = h < BARKHUE ? 2 : 1; continue;
    }
    if (lab & 1) cls[0][i] = 1; else if (lab & 2) cls[1][i] = 1;
    else if (SCENE && (lab & 4)) cls[2][i] = 1; else if (SCENE && (lab & 8)) cls[3][i] = 1;
  }
  // REMNANTS of painted-out branches: a no-brown zone is the user's painting grown a little, but where
  // a branch ran along its edge the outermost pixel column survived as a 1-pixel brown LINE (the user:
  // "a brown branch thing on the left that reads as a line of pixels"). Any bark-class piece of the
  // canopy (above the base) that TOUCHES a zone and is small is the rest of what was painted out: leaf.
  if (NOBROWN) {
    const isB = i => cls[1][i] || ovl[i] === 2 || (both[i] && cls[1][i]);
    const seen = new Uint8Array(n), top = Math.round(0.72 * H), MAXR = Math.round(40 * W / 160);
    let gone = 0;
    for (let s0 = 0; s0 < top * W; s0++) {
      if (seen[s0] || !isB(s0)) continue;
      const comp = [s0]; seen[s0] = 1; let touch = false;
      for (let k = 0; k < comp.length; k++) { const i = comp[k], x = i % W, y = (i - x) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= top) continue;
          const j = yy * W + xx; if (nbAt(xx, yy)) touch = true;
          if (!seen[j] && isB(j)) { seen[j] = 1; comp.push(j); } } }
      if (!touch || comp.length > MAXR) continue;
      for (const i of comp) { cls[1][i] = 0; cls[0][i] = 1; ovl[i] = ovl[i] ? 1 : 0; gone++; }
    }
    if (process.env.DMDBG) console.error(`remnants: ${gone} bark pixels next to no-brown zones made leaf`);
  }
  // --shoots r: inside the canopy, brown is for SHOOTS. Overlap pixels that took the bark class form
  // areas as well as lines -- blobs, and one wide diagonal sweep that was really the warm-lit strip
  // where the wall meets the ceiling, seen through the leaves (it followed the wall's angle exactly).
  // An OPENING (erode then dilate, (2r+1)^2) recovers exactly the parts at least 2r+1 wide; those
  // become leaf, and what is thin stays brown.
  if (SHOOTS && OVERLAP === 'hue') {
    const ob = new Uint8Array(n); for (let i = 0; i < n; i++) ob[i] = both[i] && cls[1][i] ? 1 : 0;
    const morph = (m, keep) => { const o = new Uint8Array(n);       // keep=1: erode (all), 0: dilate (any)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let all = 1, any = 0;
        for (let dy = -SHOOTS; dy <= SHOOTS; dy++) for (let dx = -SHOOTS; dx <= SHOOTS; dx++) {
          const xx = x + dx, yy = y + dy, v = xx >= 0 && yy >= 0 && xx < W && yy < H ? m[yy * W + xx] : 0;
          all &= v; any |= v; }
        o[y * W + x] = keep ? all : any; }
      return o; };
    const wide = morph(morph(ob, 1), 0);
    for (let i = 0; i < n; i++) if (ob[i] && wide[i]) { cls[1][i] = 0; cls[0][i] = 1; }
  }
  const rx = Math.max(1, Math.round(FEATHER * W / 320));
  // --feather 0: HARD theme edges, no blur at all (the preferred version)
  const [wl, wb, wk, wc] = cls.map(m => FEATHER ? boxBlur(m, W, H, rx, FEATHER) : m);
  const ls = boxBlur(lum, W, H, Math.max(1, Math.round(2 * W / 320)), 2), Yg = Y(PL[5]);
  const LR = ramp(LEAFC), L2 = ramp(LEAF2C), BR = ramp(BARKC), KR = ramp(RACKC), CR = ramp(CEILC), out = Float32Array.from(img);
  for (let i = 0; i < n; i++) {
    if (light[i]) continue;                                   // free: keeps its colour, any of 16
    let L = wl[i], B = wb[i];
    if (ovl[i]) { L = ovl[i] === 1 ? 1 : 0; B = ovl[i] === 2 ? 1 : 0; }
    // (--leaf2 none: no bright-leaf ramp, as in the preferred version)
    const f = NOLEAF2 ? 0 : Math.min(1, Math.max(0, (ls[i] - 0.6 * Yg) / (0.3 * Yg)));
    const w = [L * (1 - f), L * f, B, ovl[i] ? 0 : wk[i], ovl[i] ? 0 : wc[i]];
    const tot = w.reduce((a, v) => a + v, 0);
    if (SCENE && tot > 1) for (let k = 0; k < 5; k++) w[k] /= tot;   // (the preferred version did not normalise)
    const wr = Math.max(0, 1 - w.reduce((a, v) => a + v, 0));
    // --bgsat s: the BACKGROUND's colour pulled toward grey (chroma x s, lightness and hue kept). With
    // brown and orange banned there, the warm wall trim's nearest colour was red, and it filled whole
    // blocks; at reduced chroma it lands on grey, with red only as an occasional dithered dot.
    if (BGSAT !== 1 && wr > 0) {
      const [L, a, b] = oklab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2]), q = unoklab(L, a * BGSAT, b * BGSAT);
      for (let c = 0; c < 3; c++) img[i * 3 + c] = img[i * 3 + c] * (1 - wr) + Math.max(0, q[c]) * wr;
    }
    if (wr >= 1) { for (let c = 0; c < 3; c++) out[i * 3 + c] = img[i * 3 + c]; continue; }
    const q = [LR, L2, BR, KR, CR].map(rp => onRamp(rp, lum[i]));
    { let k = -1, best = wr; w.forEach((v, j) => { if (v > best) { best = v; k = j; } }); region[i] = k + 1; }
    // --texture t: the themed part's brightness x (1 + t x (Bayer - 1/2)). A target sitting ON a
    // palette colour (branches at C64 brown's brightness) dithers into nothing -- a solid block,
    // and in hi-res a hard-edged one. The 4x4 pattern averages out, so brightness is unchanged.
    const x = i % W, y = Math.floor(i / W), bay = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5;
    // --branchtex t: extra texture for BRANCH pixels inside the canopy (overlap pixels on the bark
    // ramp) -- the user: brown branch areas came out too undithered. The trunk is left alone.
    const mod = 1 + (TEXTURE + (both[i] && w[2] > 0.5 ? BRANCHTEX : 0)) * bay * (1 - wr);
    for (let c = 0; c < 3; c++) out[i * 3 + c] = w.reduce((a, v, k) => a + v * q[k][c], 0) * mod + wr * img[i * 3 + c];
    // A BRIGHT leaf (f > 0.5) may not use the plain leaf ramp at all: allowed by weight alone, plain
    // green stayed available wherever any of that ramp remained, and error diffusion picked it for
    // every target near green's brightness -- the flat band across the top came straight back.
    allow[i] = (wr > 0.05 ? 0xffff & ~AVOID : 0) | (w[0] > 0.05 && f <= 0.5 ? bitsOf(LEAFC) : 0) | (w[1] > 0.05 ? bitsOf(LEAF2C) : 0) |
               (w[2] > 0.05 ? bitsOf(BARKC) : 0) | (w[3] > 0.05 ? bitsOf(RACKC) : 0) | (w[4] > 0.05 ? bitsOf(CEILC) : 0);
    if (ovl[i] || both[i]) allow[i] |= bitsOf(LEAFC) | bitsOf(BARKC);    // a branch line may sit in a leafy block
    if (nbAt(i % W, Math.floor(i / W))) allow[i] &= ~bitsOf([8, 9]);
    if (!allow[i]) allow[i] = 0xffff & ~AVOID;
  }
  // --basedark s: DARK EARTH between the roots. The base of the tree read as all tree; the user wants
  // the raised roots, with darker earth between them, darker the further from a root. Bark-themed
  // pixels below row BASE_Y (fading in over 8 rows) are split into ROOTS -- brighter than their
  // neighbourhood, where the light catches them -- and EARTH; earth is darkened by s x (distance to
  // the nearest root / BASE_D), capped at s. Leaf pixels (the green down there) are never touched.
  if (BASEDARK > 0) {
    const sx = W / 320, BASE_Y = Math.round(0.74 * H), BASE_D = 3;
    const nb2 = boxBlur(lum, W, H, Math.max(1, Math.round(2 * sx)), 2);
    const INF = 1e9, d = new Float32Array(n).fill(INF), inBase = new Uint8Array(n);
    for (let y = BASE_Y - 8; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (region[i] !== 3) continue;
      inBase[i] = 1; if (lum[i] > nb2[i] * 1.05) d[i] = 0;          // a root: lit above its surroundings
    }
    const step = (i, j, c) => { if (d[j] + c < d[i]) d[i] = d[j] + c; };   // chamfer distance, in 320-wide px
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!inBase[i]) continue;
      if (x > 0) step(i, i - 1, 1 / sx); if (y > 0) step(i, i - W, 1); }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!inBase[i]) continue;
      if (x < W - 1) step(i, i + 1, 1 / sx); if (y < H - 1) step(i, i + W, 1); }
    for (let i = 0; i < n; i++) { if (!inBase[i] || d[i] === 0) continue;
      const y = Math.floor(i / W), fade = Math.min(1, Math.max(0, (y - (BASE_Y - 8)) / 8));
      const f = Math.min(1, (d[i] === INF ? BASE_D : d[i]) / BASE_D) * BASEDARK * fade;
      for (let c = 0; c < 3; c++) out[i * 3 + c] *= 1 - f;
    }
  }
  // --darkmap file: brightness factors measured from a HAND EDIT (tools/editdark.mjs) -- the user
  // darkened the earth round the roots far more than --basedark did. Applied to BARK-themed pixels
  // only, so the green at the base is never darkened; the converter re-dithers the result.
  // EDITMODE 'exact' (default): inside the mound's box (the tree's base pixels, grown 4 px -- which
  // takes in the floor right round it, where the user cleaned brown spill into greys and white), each
  // pixel's target is the edit's colour AND that is the only colour it may use. As a mere target
  // ('target') the block chooser still traded a few points of black away (44% drawn, 38% out) and the
  // user said it "did not really take the darkness as I drew it". 'ratio' only scales brightness.
  if (DARKMAP && EDITMODE === 'exact' && DM.idx) {
    let x0 = W, x1 = -1, y0 = H, y1 = -1, exactN = 0;
    // the box: tree-themed pixels AND wherever the drawing has tree colours (brown, orange, greens) --
    // the mound's tails are not labelled tree, and a box from the labels alone missed them
    const treeCol = new Set([8, 9, 5, 13]);
    for (let y = Math.round(0.72 * H); y < H; y++) for (let x = 0; x < W; x++) {
      const k = DM.idx[y * DARKTW + (W === 320 ? x >> 1 : x)];
      if ((region[y * W + x] >= 1 && region[y * W + x] <= 3) || treeCol.has(k)) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
    const gx = Math.round(4 * W / 320), sx = W === 320 ? 1 : 0;
    for (let y = Math.max(0, y0 - 4); y <= Math.min(H - 1, y1 + 4); y++) for (let x = Math.max(0, x0 - gx); x <= Math.min(W - 1, x1 + gx); x++) {
      const i = y * W + x, k = DM.idx[y * DARKTW + (x >> sx)];
      if (k === undefined || k < 0) continue;
      for (let c = 0; c < 3; c++) out[i * 3 + c] = PL[k][c];
      allow[i] = 1 << k; region[i] = 9;                      // its own region: no error crosses in or out
      exactN++;
    }
    if (process.env.DMDBG) console.error(`exact: box x ${x0}-${x1} y ${y0}-${y1} (W ${W}), ${exactN} pixels pinned to the drawing`);
  } else if (DARKMAP) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (region[i] !== 3) continue;
    const tx = W === 320 ? x >> 1 : x, t = DARKTGT && DARKTGT[y * DARKTW + tx];
    if (EDITMODE === 'target' && t) { for (let c = 0; c < 3; c++) out[i * 3 + c] = t[c];
      if (process.env.DMDBG) { dmN = (dmN ?? 0) + 1; dmY = (dmY ?? 0) + Y(t); } continue; }
    const f = W === 320 ? DARKMAP[y * 320 + x] : (DARKMAP[y * 320 + 2 * x] + DARKMAP[y * 320 + 2 * x + 1]) / 2;
    if (f < 1) for (let c = 0; c < 3; c++) out[i * 3 + c] *= f;
  }
  if (process.env.DMDBG) { let rb = 0, base = 0; for (let y = Math.round(0.72 * H); y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (region[i]) base++; if (region[i] === 3) rb++; }
    console.error(`darkmap: ${dmN ?? 0} targets applied, mean Y ${((dmY ?? 0) / (dmN || 1)).toFixed(3)}; base rows: ${base} themed, ${rb} bark`); }
  if (TRIMAVOID) {                  // the wall trim, grown 2 px (1 in double-wide multicolour pixels)
    const ry = 2, rx = W === 320 ? 2 : 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let t = 0;
      for (let dy = -ry; dy <= ry && !t; dy++) for (let dx = -rx; dx <= rx && !t; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        t = W === 320 ? REG.labels[yy * 320 + xx] & 32 : (REG.labels[yy * 320 + 2 * xx] | REG.labels[yy * 320 + 2 * xx + 1]) & 32; }
      if (t) { allow[y * W + x] &= ~TRIMAVOID; if (!allow[y * W + x]) allow[y * W + x] = 0xffff & ~AVOID & ~TRIMAVOID; }
    }
  }
  if (process.env.REGIONPNG) {      // debug: each pixel's dominant theme, as a picture
    const C = [[60, 60, 60], [40, 200, 60], [170, 255, 160], [230, 120, 30], [60, 90, 220], [170, 60, 200]];
    const rgb = new Uint8Array(n * 3); for (let i = 0; i < n; i++) C[region[i]].forEach((v, c) => { rgb[i * 3 + c] = v; });
    writeFileSync(process.env.REGIONPNG, png(W, H, rgb));
  }
  return { img: out, allow, region };
};

if (DO_HI) {
  const t0 = Date.now(), th = themed(load(320, 200), 320, 200), img = edgeSoft(th.img, 320, 200, 8, 8, EDGESOFT);
  // --hiresblack: inside a THEMED block (one that does not allow all 16), every pair includes black.
  // Neighbouring tree blocks then always share a colour, so a border can dither through it; with free
  // pairs, a branch block of brown+green met a leaf block of black+green as two flat fills in a line.
  const HB = has('--hiresblack');
  const { choice, idx } = convert(img, 320, 200, 8, 8, m => { const c = colsOf(m);
    let pairs = c.length >= 2 ? combos(c.length, 2, c) : [[c[0], c[0]]];
    if (HB && m !== 0xffff && c.includes(0)) pairs = pairs.filter(p => p.includes(0));
    return pairs; }, th.allow, SMOOTH, false, KEEPERR ? th.region : null);
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
  const t0 = Date.now(), th = themed(load(160, 200), 160, 200), img = edgeSoft(th.img, 160, 200, 4, 8, Math.max(1, Math.round(EDGESOFT / 2)) * (EDGESOFT ? 1 : 0));
  // The background is shared by every block, so it is chosen by trying the likely ones whole.
  const tryBg = opt('--bg', null) !== null ? [+opt('--bg')] : [0, 11, 9, 6];
  let best = null;
  for (const bg of tryBg) {
    const r = convert(img, 160, 200, 4, 8, m => {
      let c = colsOf(m).filter(k => k !== bg);
      // fewer than 3 allowed: pad with colours no pixel here may use -- the slot exists regardless
      if (c.length < 3) c = c.concat(ALL.filter(k => k !== bg && !c.includes(k))).slice(0, 3);
      return combos(c.length, 3, c).map(s => [bg, ...s]); }, th.allow, SMOOTHMC, true, KEEPERR ? th.region : null);
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
