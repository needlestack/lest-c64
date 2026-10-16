// Fit an ORDINARY IMAGE to the EXISTING angel-face charset -- no new glyphs, just a screen map.
//
// The charset in angel-face.json was clustered from hangl1 and its 256 glyphs are fixed. This
// asks a different question: given those glyphs, what is the best 1000-cell arrangement for
// some other picture? Nearest glyph per 4x8 tile, measured in luminance, and nothing else.
//
//   node src/fit-face.mjs "angel 3.png" a3 [more.png tag ...]
//
// Writes build/face-extra.json (tag -> screen map) and one build/<tag>-fit.png to eyeball.
import { execFileSync } from 'child_process';
import { readGek } from './gek.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { png } from './png.mjs';

const FACE = JSON.parse(readFileSync(new URL('../data/angel-face.json', import.meta.url), 'utf8')).hangl1;
// FACED023=n (2026-10-15): another colour for the global third ink -- 1 makes the highlights WHITE
if (process.env.FACED023) FACE.d023 = +process.env.FACED023;
// bit pair -> the register it reads, after fit-angel's 0<->3 swap
//   00 $d021   01 $d022   10 $d023   11 colour RAM
const RGB = { 0: [0,0,0], 11: [68,68,68], 12: [108,108,108], 15: [149,149,149], 1: [255,255,255] };
const INK = [FACE.d021, FACE.d022, FACE.d023, FACE.colram];
const lum = c => (RGB[c][0]*0.299 + RGB[c][1]*0.587 + RGB[c][2]*0.114);
export const LU = INK.map(lum);

// The picture is grey-on-WHITE and the charset is light-on-BLACK, so the background has to go.
// NOT by inverting: the statue is darker than its background but its own shading runs the right
// way round, and a straight negative turns every crevice into a highlight. Send everything above
// BG to black instead, and spread what is left across the three greys -- the modelling survives
// and only the paper disappears.
const BG   = +(process.env.FACEBG ?? 228);
const LO   = +(process.env.FACELO ?? 20);
const HI   = +(process.env.FACEHI ?? 222);
const GAM  = +(process.env.FACEGAMMA ?? 1);
// how hard to perturb the quantiser, in luminance units. 0 = pure Floyd-Steinberg.
const GRIT = +(process.env.FACEGRIT ?? 40);
// FACEGRITTOP=g, FACEGRITROW=y (2026-10-15): a different grit ABOVE pixel row y (the face), easing to
// FACEGRIT over the next 16 rows so the two textures do not meet at a visible line
const GRITTOP = process.env.FACEGRITTOP === undefined ? GRIT : +process.env.FACEGRITTOP;
const GRITROW = +(process.env.FACEGRITROW ?? 72);
const gritRow = y => y < GRITROW ? GRITTOP : y >= GRITROW + 16 ? GRIT : GRITTOP + (GRIT - GRITTOP) * (y - GRITROW) / 16;
// FACEGRITBOX="x0,y0,x1,y1,g,tmin" (2026-10-15): grit g for the BRIGHT pixels (tone >= tmin) inside a
// box, in 160x200 pixel coordinates -- the sword, which reads better smoother than the robe around it
const GB = process.env.FACEGRITBOX ? process.env.FACEGRITBOX.split(',').map(Number) : null;
const gritAt = (x, y, t) => GB && x >= GB[0] && y >= GB[1] && x <= GB[2] && y <= GB[3] && t >= GB[5] ? GB[4] : gritRow(y);
// the three non-black inks, darkest first, as pixel values
export const GREYS = [0,1,2,3].filter(v => INK[v] !== 0).sort((a, b) => LU[a] - LU[b]);
export const BLACK = [0,1,2,3].find(v => INK[v] === 0);

// Error diffusion, because the charset it has to share is DITHERED. hangl1 was dithered by
// hand, so its 256 glyphs are textures -- checkers, gradients, stipple. Thresholding a
// photograph into three flat bands produces tiles that look nothing like that, and a joint
// clustering then has to spend its codes spanning two incompatible rendering styles rather than
// on detail. Dither first and both pictures speak the same language.
// Floyd-Steinberg, serpentine: alternating the scan direction stops the error trailing off to
// one side and worming.
export function dither(tone, inks) {
  const lo = Math.min(...inks.map(v => LU[v])), hi = Math.max(...inks.map(v => LU[v]));
  const target = Float64Array.from(tone, t => t < 0 ? -1 : lo + t * (hi - lo));
  const buf = Float64Array.from(target);
  const out = new Uint8Array(160 * 200);
  for (let y = 0; y < 200; y++) {
    const ltr = (y & 1) === 0;
    for (let k = 0; k < 160; k++) {
      const x = ltr ? k : 159 - k, i = y * 160 + x;
      if (target[i] < 0) { out[i] = BLACK; continue; }   // background: not ours to dither
      // ---- GRIT ----
      // Error diffusion makes NO texture where the tone already sits on a palette level: the
      // error is zero, nothing propagates, and a whole region comes out solid. Those are the
      // flat patches with visible 8x8 seams. Perturb the DECISION with a deterministic
      // per-pixel offset so those regions break into stipple -- and measure the error against
      // the TRUE value, so diffusion still corrects the average and the tone does not shift.
      const gr = gritAt(x, y, tone[i]);
      const n = gr ? (((((x * 73856093) ^ (y * 19349663)) >>> 8) & 255) / 255 - 0.5) * gr : 0;
      const want = buf[i] + n;
      let best = inks[0], bd = Infinity;
      for (const v of inks) { const d = Math.abs(LU[v] - want); if (d < bd) { bd = d; best = v; } }
      out[i] = best;
      const e = buf[i] - LU[best];
      const put = (xx, yy, f) => {
        if (xx < 0 || xx > 159 || yy > 199) return;
        const j = yy * 160 + xx;
        if (target[j] >= 0) buf[j] += e * f;             // never bleed into the background
      };
      const dx = ltr ? 1 : -1;
      put(x + dx, y,     7 / 16);
      put(x - dx, y + 1, 3 / 16);
      put(x,      y + 1, 5 / 16);
      put(x + dx, y + 1, 1 / 16);
    }
  }
  return out;
}

export function toPixels(file) {
  // Fit the picture into the 320x200 display without distorting it: scale to full height and
  // letterbox. A multicolor pixel is two hires pixels wide, so the grid is 160 across.
  const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', file])
    .toString().split(' ').map(Number);
  // A multicolor pixel is 2 hires pixels wide, but the 320x200 frame is displayed at 4:3, so it
  // is not 2 SQUARE pixels wide -- it is 320/200 / (4/3) = 1.2 times narrower than that. Dividing
  // by a flat 2 assumed square hires pixels and letterboxed a correctly-framed 4:3 source into
  // 133 of the 160 columns, throwing away 17% of the width and the author's crop with it.
  const PAR = +(process.env.FACEPAR ?? (2 / 1.2));   // display width of one mc pixel, in rows
  const mcw = Math.max(1, Math.min(160, Math.round(200 * (w / h) / PAR)));
  const raw = execFileSync('magick',
    // FACEMAGICK="..." (2026-10-15): extra ImageMagick steps on the greyscale BEFORE the resize --
    // e.g. "-clahe 25x25%+128+3" for local contrast, which a softly lit statue needs: its folds are
    // gradients a few levels deep that four inks and a dither flatten to nothing.
    [file, '-colorspace', 'gray', ...(process.env.FACEMAGICK ?? '').split(/\s+/).filter(Boolean),
     '-resize', `${mcw}x200!`, '-depth', '8', 'gray:-'],
    { maxBuffer: 1 << 26 });
  const x0 = (160 - mcw) >> 1;
  const px = new Uint8Array(160 * 200).fill(BLACK);
  // ...and the same thing as a CONTINUOUS 0..1 tone for the ditherer, -1 meaning background.
  // NORMALISED, not a luminance: each palette stretches it to its own range, and baking the
  // grey-only range in here is what made adding black to the palette do nothing at all -- no
  // target pixel ever landed near it.
  const tgt = new Float64Array(160 * 200).fill(-1);
  // FACEBGFILL=1 (2026-10-15, the sword angel): background is a bright pixel CONNECTED to the top,
  // left or right edge, not every bright pixel. A white sword held by the statue is brighter than
  // the off-white backdrop, so the plain threshold keyed it out with the background. The bottom edge
  // seeds nothing, because the blade runs off it.
  // The background is judged on the image BEFORE any FACEMAGICK step: local contrast (CLAHE) stretches
  // a flat backdrop's faint paper texture into specks below BG, which then drew as stray dots (2026-10-15).
  const plain = process.env.FACEMAGICK ? execFileSync('magick',
    [file, '-colorspace', 'gray', '-resize', `${mcw}x200!`, '-depth', '8', 'gray:-'], { maxBuffer: 1 << 26 }) : raw;
  let isBg = i => plain[i] >= BG;
  if (process.env.FACEBGFILL === '1') {
    const bg = new Uint8Array(mcw * 200), st = [];
    const seed = (x, y) => { const i = y * mcw + x; if (!bg[i] && plain[i] >= BG) { bg[i] = 1; st.push(i); } };
    for (let x = 0; x < mcw; x++) seed(x, 0);
    for (let y = 0; y < 200; y++) { seed(0, y); seed(mcw - 1, y); }
    while (st.length) { const i = st.pop(), x = i % mcw, y = (i / mcw) | 0;
      if (x > 0) seed(x - 1, y); if (x < mcw - 1) seed(x + 1, y); if (y > 0) seed(x, y - 1); if (y < 199) seed(x, y + 1); }
    isBg = i => bg[i] === 1;
  }
  // FACEEDGE=n[,k] (2026-10-15): darken the figure's tone in a band n output pixels inside its
  // silhouette -- by k at the very edge (default 0.4), easing to none at n -- so a statue's lit rim
  // stops dithering into a light-grey halo against the black. 0 or unset: off.
  const [EN, EK] = (process.env.FACEEDGE ?? '0').split(',').map(Number);
  const edgeD = new Uint8Array(mcw * 200).fill(255);
  if (EN > 0) {
    let fr = [];
    for (let i = 0; i < mcw * 200; i++) if (isBg(i)) { edgeD[i] = 0; fr.push(i); }
    for (let d = 1; d <= EN && fr.length; d++) {
      const nx = [];
      for (const i of fr) { const x = i % mcw, y = (i / mcw) | 0;
        for (const j of [x > 0 ? i - 1 : -1, x < mcw - 1 ? i + 1 : -1, y > 0 ? i - mcw : -1, y < 199 ? i + mcw : -1])
          if (j >= 0 && edgeD[j] === 255) { edgeD[j] = d; nx.push(j); } }
      fr = nx;
    }
  }
  const edgeF = i => EN > 0 && edgeD[i] <= EN ? (EK ?? 0.4) + (1 - (EK ?? 0.4)) * (edgeD[i] - 1) / EN : 1;
  for (let y = 0; y < 200; y++) for (let x = 0; x < mcw; x++) {
    const v = raw[y * mcw + x];
    if (isBg(y * mcw + x)) continue;                          // background: leave it black
    let t = (Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO); // 0 = darkest statue tone
    t = Math.pow(t, GAM) * edgeF(y * mcw + x);
    px[y * 160 + x0 + x] = GREYS[Math.min(GREYS.length - 1, Math.floor(t * GREYS.length))];
    tgt[y * 160 + x0 + x] = t;
  }
  return { px, tgt, mcw };
}

// every existing glyph as 32 luminances, once
const GL = [...Array(256)].map((_, g) => {
  const out = new Float64Array(32);
  for (let r = 0; r < 8; r++) { const b = FACE.chars[g * 8 + r];
    for (let i = 0; i < 4; i++) out[r * 4 + i] = LU[(b >> (6 - 2 * i)) & 3]; }
  return out;
});

function fit(px) {
  const screen = new Array(1000);
  let err = 0;
  const t = new Float64Array(32);
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++)
      t[r * 4 + i] = LU[px[(cy * 8 + r) * 160 + cx * 4 + i]];
    let best = 0, bd = Infinity;
    for (let g = 0; g < 256; g++) {
      let d = 0;
      for (let p = 0; p < 32; p++) { const e = t[p] - GL[g][p]; d += e * e; if (d >= bd) break; }
      if (d < bd) { bd = d; best = g; }
    }
    screen[cy * 40 + cx] = best;
    err += bd;
  }
  return { screen, rms: Math.sqrt(err / 32000) / 255 };
}

function preview(screen, file) {
  const W = 320, H = 200, rgb = new Uint8Array(W * H * 3);
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    const g = screen[cy * 40 + cx];
    for (let r = 0; r < 8; r++) { const b = FACE.chars[g * 8 + r];
      for (let i = 0; i < 4; i++) {
        const c = RGB[INK[(b >> (6 - 2 * i)) & 3]];
        for (let d = 0; d < 2; d++) {
          const o = ((cy * 8 + r) * W + cx * 8 + i * 2 + d) * 3;
          rgb[o] = c[0]; rgb[o+1] = c[1]; rgb[o+2] = c[2];
        }
      }
    }
  }
  writeFileSync(file, png(W, H, rgb));
}

// ---- a charset fitted to ALL THREE pictures at once ----
// The shipped charset was clustered from hangl1 alone, so the other two are borrowing a
// vocabulary built for a face. Cluster over all 3000 tiles instead and every picture gets a say
// -- which must make hangl1 worse, since it no longer owns all 256 codes, and should make the
// other two better by the same argument. That trade is the whole experiment.
// hangl1 from its ORIGINAL GEK, not from angel-face.json.
// Reading it back out of the shipped charset returns an image that has already been through a
// 256-glyph bottleneck: 1000 cells drawn from 256 distinct tiles, every one repeating about four
// times. The clustering counts multiplicity -- it seeds on the commonest distinct tiles and the
// medoid sum weights repeats -- so hangl1 got roughly four votes per tile against the statues'
// one, and 63% of the joint charset came out as literal hangl1 tiles. That is an artefact of
// prior compression, not a property of the picture. The GEK is the same image before any of
// that, with as many distinct tiles as the others.
function hanglPixels() {
  if (process.env.FACEQUANT === '1') {          // the old behaviour, for comparison
    const px = new Uint8Array(160 * 200);
    for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
      const g = FACE.screen[cy * 40 + cx];
      for (let r = 0; r < 8; r++) { const b = FACE.chars[g * 8 + r];
        for (let i = 0; i < 4; i++) px[(cy * 8 + r) * 160 + cx * 4 + i] = (b >> (6 - 2 * i)) & 3; }
    }
    return px;
  }
  const g = readGek(new URL('../art/gamemaker/hangl1.gek', import.meta.url).pathname);
  // GEK pixel values are scene-order (bg, c1, c2, c3); fit-angel's 0<->3 swap put black on the
  // per-cell pair, and every table here is in that post-swap order.
  const sw = v => v === 0 ? 3 : v === 3 ? 0 : v;
  const px = new Uint8Array(160 * 200);
  for (let t = 0; t < 1000; t++) {
    const cx = t % 40, cy = (t / 40) | 0;
    for (let r = 0; r < 8; r++) { const b = g.img[t * 8 + r];
      for (let i = 0; i < 4; i++)
        px[(cy * 8 + r) * 160 + cx * 4 + i] = sw((b >> (6 - 2 * i)) & 3); }
  }
  return px;
}
export const tilesOf = px => {
  const out = [];
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    const t = new Uint8Array(32);
    for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++)
      t[r * 4 + i] = px[(cy * 8 + r) * 160 + cx * 4 + i];
    out.push(t);
  }
  return out;
};
// k-means in LUMINANCE, seeded on the commonest distinct tiles -- the same scheme fit-angel
// uses, and for the same reason: raw 2-bit values would score a light/mid swap as a smaller
// error than a light/dark one, which is backwards.
export function cluster(tiles, K, iters = 60) {
  const freq = new Map();
  for (const p of tiles) { const k = p.join(','); freq.set(k, (freq.get(k) ?? 0) + 1); }
  const cents = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, K)
    .map(([k]) => Uint8Array.from(k.split(',').map(Number)));
  while (cents.length < K) cents.push(new Uint8Array(32));
  const assign = new Int32Array(tiles.length);
  for (let it = 0; it < iters; it++) {
    let moved = 0;
    for (let i = 0; i < tiles.length; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < K; c++) {
        let d = 0;
        for (let p = 0; p < 32; p++) { const e = LU[tiles[i][p]] - LU[cents[c][p]]; d += e * e;
          if (d >= bd) break; }
        if (d < bd) { bd = d; best = c; }
      }
      if (assign[i] !== best) { assign[i] = best; moved++; }
    }
    // ---- MEDOID, not mean ----
    // Averaging the tiles in a cluster and snapping the result back to four levels drives every
    // pixel toward the local mean, which erases exactly the high-frequency structure dithering
    // exists to create: measured, k-means glyphs carry 18% fewer pixel transitions than the
    // hand-dithered set. So take a REAL tile from the cluster instead -- the one with the least
    // total distance to the rest. Every glyph then stays a genuine dither pattern, and the
    // squared error gets slightly worse while the picture reads better.
    const mem = [...Array(K)].map(() => []);
    for (let i = 0; i < tiles.length; i++) mem[assign[i]].push(i);
    for (let c = 0; c < K; c++) {
      const m = mem[c];
      if (!m.length) continue;
      // A flat background collapses into one enormous cluster, and all-pairs over it would
      // dominate the run. Score candidates against an evenly spaced sample instead; the medoid
      // of a near-uniform cluster is not a close call.
      const step = Math.max(1, Math.ceil(m.length / 128));
      const ref = []; for (let i = 0; i < m.length; i += step) ref.push(m[i]);
      let best = m[0], bd = Infinity;
      for (const a of m) {
        let d = 0;
        for (const b of ref) {
          for (let p = 0; p < 32; p++) { const e = LU[tiles[a][p]] - LU[tiles[b][p]]; d += e * e; }
          if (d >= bd) break;
        }
        if (d < bd) { bd = d; best = a; }
      }
      cents[c] = tiles[best];
    }
    if (!moved && it) break;
  }
  return { cents, assign };
}

// fitting against an ARBITRARY glyph set, not just the shipped one
export function fitTo(px, glyphs) {
  const screen = new Array(1000);
  let err = 0;
  const t = new Float64Array(32);
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++)
      t[r * 4 + i] = LU[px[(cy * 8 + r) * 160 + cx * 4 + i]];
    let best = 0, bd = Infinity;
    for (let g = 0; g < glyphs.length; g++) {
      let d = 0;
      for (let p = 0; p < 32; p++) { const e = t[p] - glyphs[g][p]; d += e * e; if (d >= bd) break; }
      if (d < bd) { bd = d; best = g; }
    }
    screen[cy * 40 + cx] = best;
    err += bd;
  }
  return { screen, rms: Math.sqrt(err / 32000) / 255 };
}
// ---- metrics that track what the eye actually complains about ----
// Plain RMS is averaged over all 32000 pixels INCLUDING the black surround, so a picture that
// fills a third of the frame has its errors diluted threefold and scores well while looking
// worse. And no per-pixel measure sees BLOCKINESS at all: an image can be locally accurate and
// still show the 8x8 grid, because what reveals the grid is a discontinuity AT the cell
// boundary that is larger than the variation just inside it.
function render(screen, chars) {
  const px = new Uint8Array(160 * 200);
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    const g = screen[cy * 40 + cx];
    for (let r = 0; r < 8; r++) { const b = chars[g * 8 + r];
      for (let i = 0; i < 4; i++) px[(cy * 8 + r) * 160 + cx * 4 + i] = (b >> (6 - 2 * i)) & 3; }
  }
  return px;
}
function metrics(target, screen, chars) {
  const got = render(screen, chars);
  let eAll = 0, eInk = 0, nInk = 0;
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    let inked = false;
    for (let r = 0; r < 8 && !inked; r++) for (let i = 0; i < 4; i++)
      if (target[(cy * 8 + r) * 160 + cx * 4 + i] !== BLACK) { inked = true; break; }
    for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++) {
      const o = (cy * 8 + r) * 160 + cx * 4 + i;
      const e = LU[target[o]] - LU[got[o]];
      eAll += e * e;
      if (inked) { eInk += e * e; nInk++; }
    }
  }
  // blockiness: the average luminance step ACROSS a cell edge against the step one pixel inside
  let onEdge = 0, nEdge = 0, inside = 0, nIn = 0;
  for (let y = 0; y < 200; y++) for (let x = 1; x < 160; x++) {
    const d = Math.abs(LU[got[y * 160 + x]] - LU[got[y * 160 + x - 1]]);
    if (x % 4 === 0) { onEdge += d; nEdge++; } else { inside += d; nIn++; }
  }
  for (let y = 1; y < 200; y++) for (let x = 0; x < 160; x++) {
    const d = Math.abs(LU[got[y * 160 + x]] - LU[got[(y - 1) * 160 + x]]);
    if (y % 8 === 0) { onEdge += d; nEdge++; } else { inside += d; nIn++; }
  }
  // RECOGNISABILITY: collapse both to one mean luminance per cell and compare. That throws away
  // every texture decision and keeps only the large-scale tonal layout -- which is what makes a
  // face read as that face. An image can be locally wrong everywhere and still score well here,
  // which is exactly the case a per-pixel metric cannot express.
  let eCell = 0;
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    let a = 0, b = 0;
    for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++) {
      const o = (cy * 8 + r) * 160 + cx * 4 + i;
      a += LU[target[o]]; b += LU[got[o]];
    }
    const e = (a - b) / 32; eCell += e * e;
  }
  return { cell: Math.sqrt(eCell / 1000) / 255,
           rmsAll: Math.sqrt(eAll / 32000) / 255,
           rmsInk: nInk ? Math.sqrt(eInk / nInk) / 255 : 0,
           inkFrac: nInk / 32000,
           block: (onEdge / nEdge) / (inside / nIn) };
}

function previewWith(screen, chars, file) {
  const W = 320, H = 200, rgb = new Uint8Array(W * H * 3);
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    const g = screen[cy * 40 + cx];
    for (let r = 0; r < 8; r++) { const b = chars[g * 8 + r];
      for (let i = 0; i < 4; i++) {
        const c = RGB[INK[(b >> (6 - 2 * i)) & 3]];
        for (let d = 0; d < 2; d++) {
          const o = ((cy * 8 + r) * W + cx * 8 + i * 2 + d) * 3;
          rgb[o] = c[0]; rgb[o+1] = c[1]; rgb[o+2] = c[2];
        }
      }
    }
  }
  writeFileSync(file, png(W, H, rgb));
}

const out = existsSync(new URL('../build/face-extra.json', import.meta.url))
  ? JSON.parse(readFileSync(new URL('../build/face-extra.json', import.meta.url), 'utf8')) : {};
const args = process.argv.slice(2);
const pixU = {}, pixD = {}, tgts = {};
for (let i = 0; i < args.length; i += 2) {
  const [file, tag] = [args[i], args[i + 1]];
  const { px, tgt, mcw } = toPixels(file);
  pixU[tag] = px;
  tgts[tag] = tgt;
  pixD[tag] = dither(tgt, GREYS);          // for the version-1 preview below
  // version 1 is unchanged: the UNDITHERED picture against the shipped charset
  const { screen, rms } = fit(px);
  out[tag] = { screen, rmsOwn: rms };
  preview(screen, new URL(`../build/${tag}-fit.png`, import.meta.url).pathname);
  previewWith(fitTo(pixD[tag], GL).screen, FACE.chars, `${tag}-dither-old.png`);
  console.error(`${tag}: ${file} -> ${mcw}x200 in a 160-wide frame, RMS ${rms.toFixed(4)}` +
                `, ${new Set(screen).size}/256 glyphs used`);
}
// ---- a charset per dither palette ----
// hangl1 is already dithered and already uses black, so it is the same picture in both; only
// the CHARSET differs, because the statue tiles clustered alongside it are different.
//   3-ink: grey1/2/3, black reserved for background. The statues keep a hard silhouette but
//          their darkest crevices bottom out at grey1, so they read lighter than the face.
//   4-ink: black in the dither too. More depth in the shadows, at the cost of the statue
//          dissolving into the background where it is darkest.
if (process.env.FACEHANGL !== '0') {   // the game's death face, joined to whatever else is fitted
  pixD.hangl1 = hanglPixels();
  pixU.hangl1 = pixD.hangl1;
}
const TAGS = Object.keys(pixD);
// Black in the dither palette, because without it the statues' darkest tones bottom out at
// grey1 and the whole picture reads low-contrast against a black ground.
// FACEKEY names the output set, so the same fitter can produce several for comparison.
const PALETTES = [{ key: process.env.FACEKEY ?? 'joint',
                    inks: [...GREYS, BLACK], name: 'medoid' }];
const scores = {};
for (const pal of PALETTES) {
  const pixP = {};
  for (const t of TAGS)
    pixP[t] = t === 'hangl1' ? pixD.hangl1 : dither(tgts[t], pal.inks);
  if (process.env.FACEDISTINCT) {
    for (const t of TAGS) {
      const d = new Set(tilesOf(pixP[t]).map(x => x.join(',')));
      console.error(`   ${t.padEnd(8)} ${String(d.size).padStart(4)} distinct of 1000 tiles` +
                    `  -> average multiplicity ${(1000 / d.size).toFixed(1)}`);
    }
  }
  // ---- one vote per DISTINCT tile ----
  // The clustering counts multiplicity twice over: it seeds on the commonest distinct tiles and
  // the medoid sum weights repeats. Any picture that repeats itself therefore captures the
  // charset -- first hangl1, because it arrived pre-quantised to 256 tiles, and then a3, because
  // three quarters of its frame is black background. Neither is a statement about the picture.
  // Deduplicating puts every distinct tile on the same footing, whoever it came from and however
  // much flat area it sits in.
  // Deduplicating alone does NOT level this: it just changes which picture wins. a3 is a narrow
  // portrait on black and carries only ~250 distinct tiles, so it fits inside 256 slots nearly
  // losslessly, and an unconstrained clustering spends the charset wherever the wins are cheapest.
  // The only thing that actually equalises quality is a fixed slot budget per picture: 256/N each,
  // clustered independently, then merged. A picture cannot then be starved by a simpler neighbour.
  const per = Math.floor(256 / TAGS.length);
  let cents;
  if (process.env.FACEPREQ === '1') {
    // ---- two-stage: glyphify each picture privately, THEN cluster the results ----
    // hangl1 looked startlingly good back when it arrived pre-quantised, and it is worth asking
    // how much of that was hoarding slots and how much was the pre-quantisation itself. A private
    // 256-glyph pass is a per-picture summary: rare one-off tiles get absorbed into their nearest
    // common neighbour before the joint clustering ever sees them, so medoids are not dragged
    // around by singletons. It also balances the corpus for free -- every picture now contributes
    // exactly 256 distinct tiles at ~4x multiplicity, so neither the seeding nor the medoid sum
    // can favour one. The cost is that stage two fits to already-lossy tiles, so the errors stack.
    const corpus = [];
    for (const t of TAGS) {
      const seen = new Map();
      for (const tile of tilesOf(pixP[t])) seen.set(tile.join(','), tile);
      // FACEPREQK: how hard the private pass squeezes. Lower absorbs more singletons into their
      // nearest common neighbour -- more denoising, but also more detail gone before stage two.
      const priv = cluster([...seen.values()], +(process.env.FACEPREQK ?? 256)).cents;
      const pg = priv.map(c => Float64Array.from([...c].map(v => LU[v])));
      const { screen } = fitTo(pixP[t], pg);
      // re-render the picture from its private charset and take THOSE tiles, with multiplicity
      for (const g of screen) corpus.push(priv[g]);
    }
    ({ cents } = cluster(corpus, 256));
  } else if (process.env.FACEQUOTA === '0') {
    let corpus = TAGS.flatMap(t => tilesOf(pixP[t]));
    const seen = new Map();
    for (const t of corpus) seen.set(t.join(','), t);
    ({ cents } = cluster([...seen.values()], 256));
  } else {
    cents = [];
    for (const t of TAGS) {
      const seen = new Map();
      for (const tile of tilesOf(pixP[t])) seen.set(tile.join(','), tile);
      const k = t === TAGS[TAGS.length - 1] ? 256 - cents.length : per;   // remainder to the last
      cents.push(...cluster([...seen.values()], k).cents);
    }
  }
  const chars = [];
  for (const c of cents) for (let r = 0; r < 8; r++)
    chars.push((c[r*4] << 6) | (c[r*4+1] << 4) | (c[r*4+2] << 2) | c[r*4+3]);
  const jg = cents.map(c => Float64Array.from([...c].map(v => LU[v])));
  out[pal.key] = { chars, screen: {} };
  for (const t of TAGS) {
    const { screen, rms } = fitTo(pixP[t], jg);
    out[pal.key].screen[t] = screen;
    previewWith(screen, chars, `${t}-${pal.key}.png`);
    (scores[t] ??= {})[pal.name] = { rms, used: new Set(screen).size };
  }
}
// ---- the same charset, upside down, re-fitted ----
// Not an idle question: cpChr in the game builds its second charset from the first by reversing
// each glyph's rows, so a vertical flip is FREE at runtime. If the flipped vocabulary fits
// nearly as well, these 256 glyphs are carrying generic texture rather than shapes specific to
// these pictures -- and a flip buys a whole second charset for nothing.
{
  const key = (process.env.FACEKEY ?? 'joint');
  const base = out[key];
  const flip = [];
  for (let g = 0; g < 256; g++)
    for (let r = 7; r >= 0; r--) flip.push(base.chars[g * 8 + r]);
  const fg = [...Array(256)].map((_, g) => {
    const a = new Float64Array(32);
    for (let r = 0; r < 8; r++) { const b = flip[g * 8 + r];
      for (let i = 0; i < 4; i++) a[r * 4 + i] = LU[(b >> (6 - 2 * i)) & 3]; }
    return a;
  });
  out[key + 'Flip'] = { chars: flip, screen: {} };
  for (const t of TAGS) {
    const px = t === 'hangl1' ? pixD.hangl1 : dither(tgts[t], [...GREYS, BLACK]);
    const { screen, rms } = fitTo(px, fg);
    out[key + 'Flip'].screen[t] = screen;
    previewWith(screen, flip, `${t}-flip.png`);
    (scores[t] ??= {}).flip = { rms, used: new Set(screen).size };
  }
}
console.error('\n                     UPRIGHT                      FLIPPED');
console.error('  picture  inked |  struct  detail  blocky  |  struct  detail  blocky');
for (const t of TAGS) {
  const tp = t === 'hangl1' ? pixD.hangl1 : dither(tgts[t], [...GREYS, BLACK]);
  const k = process.env.FACEKEY ?? 'joint';
  const u = metrics(tp, out[k].screen[t], out[k].chars);
  const f = metrics(tp, out[k + 'Flip'].screen[t], out[k + 'Flip'].chars);
  console.error(`  ${t.padEnd(8)} ${(u.inkFrac * 100).toFixed(0).padStart(3)}%  |  ` +
    `${u.cell.toFixed(4)}  ${u.rmsInk.toFixed(4)}  ${u.block.toFixed(2)}  |  ` +
    `${f.cell.toFixed(4)}  ${f.rmsInk.toFixed(4)}  ${f.block.toFixed(2)}`);
}
console.error('\n  picture   shipped+flat   medoid+4-ink    same charset FLIPPED');
for (const t of TAGS) {
  const own = t === 'hangl1' ? fitTo(pixU[t], GL).rms : out[t].rmsOwn;
  const f = k => `${scores[t][k].rms.toFixed(4)} (${String(scores[t][k].used).padStart(3)}/256)`;
  console.error(`  ${t.padEnd(8)} ${own.toFixed(4)}         ${f('medoid')}  ${f('flip')}`);
}
// Guarded: build-facetest3.mjs imports this module for its fitting pipeline, and an import
// must not rewrite the asset every other build reads.
if (process.argv[1] && process.argv[1].endsWith('fit-face.mjs'))
  writeFileSync(new URL('../build/face-extra.json', import.meta.url), JSON.stringify(out));
console.error(`\nface-extra.json: ${Object.keys(out).join(', ')}`);
