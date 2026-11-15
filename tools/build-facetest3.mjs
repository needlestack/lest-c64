// build-facetest3.mjs -- THE DEATH PICTURE: a photograph fitted to one multicolour charset.
//
// Makes data/death-pics.json, the picture the game cuts to when an angel takes you: one 256-glyph
// charset (at most ~200 drawn, the image's budget), one 40x25 screen map, four inks (mid grey
// behind, dark and light grey, black per cell). The game reads the asset; this tool is how it is
// remade. Without ASSET=1 it also writes a slideshow disk (OUT, default la-test8.d64) to view
// candidates on the machine -- the harness the scene was developed in, with a raster split for two
// charsets (below).
//
// ---- REBUILD THE SHIPPED PICTURE ----
//   SHIPPED=1 node tools/build-facetest3.mjs                  -> data/death-pics.json, byte for byte
//   SHIPPED=1 ASSETOUT=/tmp/dp.json node tools/build-facetest3.mjs    (somewhere else, to compare)
// SHIPPED=1 applies the settings in SHIPPED_RECIPE below (they win over the environment) and
// records the recipe in the asset's `recipe` field. THE SOURCE IS art/death-angel-v5-85.png. It was
// made from the user's statue render (hasterot-angel-5-sword.png, in git history) by
//   magick <it> -background "#f8f8f8" -flatten -resize 85% -gravity south -extent 1014x760 <out>
// (checked 2026-11-15: the same pixels again, `magick compare -metric AE` 0), but the 85% picture is
// the source now. tools/renderpic.mjs draws an asset as a PNG.
//
// ---- DESIGN NOTES: what was tried for the sword angel (2026-10-15) ----
// Candidates were fitted from the user's statue renders (hasterot-angel-N-sword.png, revisions 2-6,
// in git history; v5 at 85% is art/death-angel-v5-85.png) and judged as rendered pictures. SHIPPED: "g20-s3", grit 20 with the seam-aware refit at
// 3. Common to every candidate: source v5 at 85% bottom-anchored on off-white
// (death-angel-v5-85.png); FACEBGFILL=1 (background = bright pixels CONNECTED to the top/sides, so
// the white sword survives); FACEMAGICK="-clahe 25x25%+128+3" (local contrast); FACEEDGE=2,0.4
// (darken a 2-pixel band inside the silhouette, so the lit rim does not halo); FACEGAMMA=1.5;
// KONE=200; SPLITROW=9 with TRAIN=top,all (the face band counted twice).
//   g20-s3   FACEGRIT=20 FACESEAM=3 -- SHIPPED
//   g40-s3   grit 40, seam 3: the user's favourite BODY, but a 5-pixel light bar across the nose
//   g30-s3   grit 30, seam 3
//   g20top40-s3          grit 20 in the face band, 40 below (FACEGRITTOP=20 FACEGRITROW=72)
//   g20top40-sword20-s3  that, plus grit 20 on the sword's bright pixels (FACEGRITBOX=66,120,86,199,20,0.8)
//   g40-s3-facerun4      g40-s3 with the face-band light-bar rule (FACERUN=4): the bar gone, 2 cells changed
//   center-c4/c6/c8      g40's body (fitted at 192) with g20's face copied exactly into the centre 4/6/8
//                        cells (a compositing tool, compose-face.mjs, since removed: none shipped)
//   edge2 / edge2-256    grit 40, no seam refit; 200 and 256 glyphs
//   v3/v4/v6-85-200      the other source revisions: grit 40, no seam refit, no edge darkening
// WHAT MATTERED, in order: a smaller figure (cells per glyph near the original angel's 1.9), local
// contrast, the seam-aware refit (blockiness), then grit. Fit error (RMS) guided but did not
// decide: the user judges what LOOKS good and what draws the eye.
//
// ---- TWO CHARSETS, split by a raster IRQ (the slideshow; the game ships ONEBOOK=1) ----
// A charset is 256 glyphs and a picture is 1,000 cells, so the dictionary is the binding
// constraint on how well a photograph renders. $d018 carries the charset pointer and the game
// already changes it mid-screen, so a picture can have TWO dictionaries, one fitted to the rows
// above the split and one to the rows below -- fitted SEPARATELY, so the top book spends itself on
// the face and never on a texture that only occurs lower down. Cost: 2,048 more bytes. The game has
// one book for the scene, so ASSET needs ONEBOOK=1.
//
//   node tools/build-facetest3.mjs        -> la-test8.d64 (the slideshow)
//   IMAGES=a.png,b.png SPLITROW=12 node tools/build-facetest3.mjs
import { writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { assemble } from '../src/asm6502.mjs';
await import('../src/d64lib.js');
import { ROOT } from '../src/paths.mjs';
process.chdir(ROOT);   // paths below are repo-relative (see src/paths.mjs)
const D64 = globalThis.D64;

// The command that made the shipped data/death-pics.json (also its `recipe` field, verbatim).
const SHIPPED_RECIPE = 'FACEGRIT=20 FACESEAM=3 FACEEDGE=2,0.4 FACEGAMMA=1.5 FACEMAGICK="-clahe 25x25%+128+3" FACEBGFILL=1 KONE=200 SPLITROW=9 ONEBOOK=1 ASSET=1 IMAGES=art/death-angel-v5-85.png TRAIN=art/death-angel-v5-85.png:top,art/death-angel-v5-85.png:all SHOW=art/death-angel-v5-85.png node tools/build-facetest3.mjs';
const SHIPPED = process.env.SHIPPED === '1';
// Before anything below reads its knob: every NAME=value (or NAME="...") before 'node'.
if (SHIPPED) for (const [, k, v] of SHIPPED_RECIPE.split(' node ')[0]
  .matchAll(/(\w+)=("[^"]*"|\S+)/g)) process.env[k] = v.replace(/^"|"$/g, '');

// ==== THE FITTING PIPELINE ====
// (Was src/fit-face.mjs, which also fitted pictures to the old GameMaker face; this tool was its only
// live user, so the pipeline lives here now.)
// The scene's four inks. A bit pair names a register: 00 $d021, 01 $d022, 10 $d023, 11 colour RAM.
// Mid grey behind, dark and light grey, and BLACK in colour RAM -- so black is the per-cell pair.
const INK = [12, 11, 15, 0];
// FACED023=n (2026-10-15): another colour for the global third ink -- 1 makes the highlights WHITE
if (process.env.FACED023) INK[2] = +process.env.FACED023;
const RGB = { 0: [0,0,0], 11: [68,68,68], 12: [108,108,108], 15: [149,149,149], 1: [255,255,255] };
const lumOf = c => (RGB[c][0]*0.299 + RGB[c][1]*0.587 + RGB[c][2]*0.114);
const LU = INK.map(lumOf);

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
const GREYS = [0,1,2,3].filter(v => INK[v] !== 0).sort((a, b) => LU[a] - LU[b]);
const BLACK = [0,1,2,3].find(v => INK[v] === 0);

// Error diffusion: thresholding a photograph into flat bands of four inks loses every gradient,
// and a dithered picture's tiles are textures -- checkers, gradients, stipple -- which a
// codebook of real tiles (the medoids below) can reproduce.
// Floyd-Steinberg, serpentine: alternating the scan direction stops the error trailing off to
// one side and worming.
function dither(tone, inks) {
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

function toPixels(file) {
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

const tilesOf = px => {
  const out = [];
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    const t = new Uint8Array(32);
    for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++)
      t[r * 4 + i] = px[(cy * 8 + r) * 160 + cx * 4 + i];
    out.push(t);
  }
  return out;
};
// k-means in LUMINANCE, seeded on the commonest distinct tiles: raw 2-bit values would score a
// light/mid swap as a smaller error than a light/dark one, which is backwards.
function cluster(tiles, K, iters = 60) {
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

// each cell's nearest glyph in a book (glyphs as 32 luminances)
function fitTo(px, glyphs) {
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

// IMAGES=a.png,b.png: the pictures to fit (default: the shipped one).
const IMAGES = (process.env.IMAGES ?? 'art/death-angel-v5-85.png').split(',').map(s => s.trim()).filter(Boolean);
const hx = n => '$' + n.toString(16);
// Where the dictionary changes. 12 puts it just under the face on this image set; it is a build
// knob because the right row is a property of the PICTURES, not of the hardware.
const SPLITROW = +(process.env.SPLITROW ?? 12);
const KTOP = +(process.env.KTOP ?? 256), KBOT = +(process.env.KBOT ?? 256);

// ---- fit ----
// The pipeline above: greyscale and letterbox, Floyd-Steinberg with grit over the 4-ink palette, then k-medoids over the resulting tiles.
const INKS = [...GREYS, BLACK];
const pix = {}, tiles = {}, edge = {}, tone = {};
for (const f of IMAGES) {
  const { tgt } = toPixels(f);
  // the SMOOTH target, in luminance (background black), for FACESEAM: the dither's own pixel noise
  // would make every cell boundary look like a jump
  { const lo = Math.min(...INKS.map(v => LU[v])), hi = Math.max(...INKS.map(v => LU[v]));
    tone[f] = Float64Array.from(tgt, t => t < 0 ? LU[BLACK] : lo + t * (hi - lo)); }
  pix[f] = dither(tgt, INKS);
  tiles[f] = tilesOf(pix[f]);
  // a cell the silhouette crosses: some pixels figure (tgt >= 0), some background (tgt < 0)
  edge[f] = [...Array(1000)].map((_, c) => { let fg = 0, bg = 0;
    for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++)
      (tgt[(((c / 40) | 0) * 8 + r) * 160 + (c % 40) * 4 + i] < 0 ? bg++ : fg++);
    return fg > 0 && bg > 0; });
}
// EDGETRAIN=0 (2026-10-15): leave the cells the silhouette crosses OUT of the training pool. Each is a
// near-unique slice of outline and wins a glyph the interior then lacks; they are still drawn, fitted
// to the nearest glyph the interior produced. Default 1: trained like any other cell.
const EDGETRAIN = process.env.EDGETRAIN !== '0';
// ---- TRAIN / SHOW: the codebook's training set need not be the set it renders ----
// A codebook is a budget, and pooling every tile of every picture spends it evenly on content
// that does not matter evenly. TRAIN names what the clusterer sees, per picture and per band;
// SHOW names what actually gets drawn. Anything rendered but not trained on is fitted against a
// dictionary that never saw it -- which is the interesting half of the experiment, not a bug.
//   TRAIN=a.png:top,b.png:all      SHOW=a.png,b.png
const band = r => (r < SPLITROW ? 0 : 1);
const TRAIN = (process.env.TRAIN ?? IMAGES.map(f => `${f}:all`).join(','))
  .split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const [f, b = 'all'] = s.split(':');
    if (!IMAGES.includes(f)) throw new Error(`TRAIN names ${f}, which is not in IMAGES`);
    if (!['top', 'bottom', 'all'].includes(b)) throw new Error(`TRAIN band must be top|bottom|all, got ${b}`);
    return [f, b];
  });
const SHOW = (process.env.SHOW ?? IMAGES.join(',')).split(',').map(s => s.trim()).filter(Boolean);
for (const f of SHOW) if (!IMAGES.includes(f)) throw new Error(`SHOW names ${f}, which is not in IMAGES`);
const pool = [[], []];
for (const [f, b] of TRAIN)
  tiles[f].forEach((t, i) => {
    if (!EDGETRAIN && edge[f][i]) return;
    const bd = band(Math.floor(i / 40));
    if (b === 'all' || (b === 'top') === (bd === 0)) pool[bd].push(t);
  });
if (process.env.TRAIN || process.env.SHOW)
  console.error(`  train: ${TRAIN.map(([f, b]) => f.replace('angel-', '').replace('.png', '') + ':' + b).join(' ')}` +
                `   show: ${SHOW.map(f => f.replace('angel-', '').replace('.png', '')).join(' ')}`);
// ONEBOOK=1: the CONTROL. One 256-codeword book for the whole frame, same dither, same
// clusterer, same fitter -- so the only thing that differs from the split build is the split.
// Comparing against la-test's preq instead would confound it: that was clustered with a
// per-picture slot budget, which is a different experiment.
const ONEBOOK = process.env.ONEBOOK === '1';
const books = [], K = [KTOP, KBOT];
if (ONEBOOK) {
  // KONE=n (2026-10-15): fewer than 256 codewords, so the shipped charset is smaller (the game packs
  // it to the glyphs drawn). The asset is still padded to 256 glyphs, which the build expects.
  const { cents } = cluster([...pool[0], ...pool[1]], +(process.env.KONE ?? 256));
  books.push(cents, cents);
  console.error(`  ONEBOOK control: ${pool[0].length + pool[1].length} tiles -> one 256-codeword book`);
} else for (let b = 0; b < 2; b++) {
  const { cents } = cluster(pool[b], K[b]);
  books.push(cents);
  console.error(`  band ${b} (${b ? 25 - SPLITROW : SPLITROW} rows): ${pool[b].length} tiles` +
                ` -> ${K[b]} codewords`);
}
// Luminance form, which is what fitTo compares in -- raw 2-bit values would score a light/mid
// swap as a smaller error than a light/dark one, which is backwards.
const lum = book => book.map(c => Float64Array.from(c, v => LU[v]));
const bookLum = books.map(lum);

// Each cell is fitted against ITS OWN band's book. fitTo works over a whole 160x200 frame, so
// run it twice per picture and take the rows that belong to each band.
const MAPS = [], rms = [];
for (const f of SHOW) {
  const top = fitTo(pix[f], bookLum[0]), bot = fitTo(pix[f], bookLum[1]);
  const m = new Array(1000);
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    const i = cy * 40 + cx;
    m[i] = (cy < SPLITROW ? top : bot).screen[i];
  }
  // ---- FACESEAM=w (2026-10-15): a seam-aware refit against blockiness ----
  // Each cell above chose its glyph alone. Blockiness is a step in tone AT a cell boundary that the
  // picture does not have, so refit cell by cell (3 passes, each seeing its neighbours' current
  // glyphs): own squared error, plus w times, per side, (the glyphs' mean-edge step - the source's
  // mean-edge step)^2 -- edge means of the SMOOTH tone, 4 pixels on a horizontal side, 8 on a vertical.
  const SEAMW = +(process.env.FACESEAM ?? 0);
  if (SEAMW > 0) {
    const T = tone[f], P = pix[f];
    // a cell's four edge means -- top, bottom, left, right -- from 32 luminances
    const edges = L => { let t = 0, b = 0, l = 0, r = 0;
      for (let i = 0; i < 4; i++) { t += L[i]; b += L[28 + i]; }
      for (let k = 0; k < 8; k++) { l += L[k * 4]; r += L[k * 4 + 3]; }
      return [t / 4, b / 4, l / 8, r / 8]; };
    const cellL = (src, c) => { const o = new Float64Array(32), cx = c % 40, cy = (c / 40) | 0;
      for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++) o[r * 4 + i] = src(((cy * 8 + r) * 160 + cx * 4 + i)); return o; };
    const gE = bookLum.map(bk => bk.map(edges));                                 // per band, per glyph
    const tE = [...Array(1000)].map((_, c) => edges(cellL(i => T[i], c)));
    const pL = [...Array(1000)].map((_, c) => cellL(i => LU[P[i]], c));
    // side k of a cell meets side opp[k] of the neighbour at offset nb[k]
    const nb = [-40, 40, -1, 1], opp = [1, 0, 3, 2];
    // FACERUN=n (2026-10-15): a horizontal run of n or more LIGHTEST-grey pixels -- inside the glyph or
    // across its joins with the cells left and right -- reads as a glitch (a 5-pixel bar across the
    // nose, from two cells that each looked fine). A glyph that would make one costs as much as a
    // whole badly fitted cell.
    const RUN = +(process.env.FACERUN ?? 0), LT = GREYS[GREYS.length - 1];
    const runCost = (c, cx, gv) => {
      if (!RUN || band((c / 40) | 0) !== 0) return 0;   // the FACE band only: below it, the sword's guard
                                                          //   and lit shoulders ARE horizontal light bars
      const L = cx > 0 ? books[band(((c - 1) / 40) | 0)][m[c - 1]] : null;
      const R = cx < 39 ? books[band(((c + 1) / 40) | 0)][m[c + 1]] : null;
      let bad = 0;
      for (let r = 0; r < 8; r++) {
        const row = [...(L ? L.slice(r * 4, r * 4 + 4) : [-1, -1, -1, -1]), ...gv.slice(r * 4, r * 4 + 4),
                     ...(R ? R.slice(r * 4, r * 4 + 4) : [-1, -1, -1, -1])];
        let run = 0;
        for (let k = 0; k < 12; k++) { run = row[k] === LT ? run + 1 : 0;
          if (run >= RUN && k >= 4 && k - run + 1 < 8) { bad++; break; } }   // the run touches THIS glyph
      }
      return bad * 32 * 255 * 255;
    };
    for (let pass = 0; pass < 3; pass++) for (let c = 0; c < 1000; c++) {
      const cx = c % 40, cy = (c / 40) | 0, bk = bookLum[band(cy)], ge = gE[band(cy)];
      let best = m[c], bd = Infinity;
      for (let g = 0; g < bk.length; g++) {
        let d = 0;
        for (let p = 0; p < 32; p++) { const e = pL[c][p] - bk[g][p]; d += e * e; }
        if (d >= bd) continue;
        for (let k = 0; k < 4; k++) {
          const n = c + nb[k];
          if ((k === 2 && cx === 0) || (k === 3 && cx === 39) || n < 0 || n >= 1000) continue;
          const nE = gE[band((n / 40) | 0)][m[n]][opp[k]];
          const e = (ge[g][k] - nE) - (tE[c][k] - tE[n][opp[k]]);
          d += SEAMW * e * e * (k < 2 ? 4 : 8);
        }
        d += runCost(c, cx, books[band(cy)][g]);
        if (d < bd) { bd = d; best = g; }
      }
      m[c] = best;
    }
  }
  MAPS.push(m);
  // Report the error over the cells each band actually owns, not the whole-frame RMS, which
  // would average in rows the other band drew and hide which half is doing badly.
  let e = 0;
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    const g = books[band(cy)][m[cy * 40 + cx]];
    for (let r = 0; r < 8; r++) for (let i2 = 0; i2 < 4; i2++) {
      const d = LU[pix[f][(cy * 8 + r) * 160 + cx * 4 + i2]] - LU[g[r * 4 + i2]];
      e += d * d;
    }
  }
  rms.push(Math.sqrt(e / 32000) / 255);
  console.error(`  ${f}: RMS ${rms[rms.length - 1].toFixed(4)}` +
                `  (${new Set(m.slice(0, SPLITROW * 40)).size} top codes, ` +
                `${new Set(m.slice(SPLITROW * 40)).size} bottom codes used)`);
}
console.error(`  mean RMS ${(rms.reduce((a, b) => a + b, 0) / rms.length).toFixed(4)}`);

// How compressible is a map? They are mostly one background code, so a run-length pass may
// decide whether the pictures live in the game's image or have to come off the disk.
{
  const rle = m => { let n = 0; for (let i = 0; i < m.length;) { let j = i; 
    while (j < m.length && m[j] === m[i] && j - i < 255) j++; n += 2; i = j; } return n; };
  const tot = MAPS.reduce((a, m) => a + rle(m), 0);
  console.error('  RLE report: ' + MAPS.map(m => rle(m)).join(' + ') + ' = ' + tot +
                ' bytes, against ' + MAPS.length * 1000 + ' raw');
}
const packed = book => book.flatMap(c => {
  const bytes = [];
  for (let r = 0; r < 8; r++)
    bytes.push([0, 1, 2, 3].reduce((v, i) => v | (c[r * 4 + i] << (6 - 2 * i)), 0));
  return bytes;
});

// ---- VIC bank 0 ----
const LIVE = 0x2000;              // two screen slots, so the next picture loads off-display
// With one book there is no second charset to point at, so both $d018 values name the same
// address and the split store becomes a harmless rewrite of the value already there.
const CHARS = ONEBOOK ? [0x3000, 0x3000] : [0x3000, 0x3800];
const MAPSRC = 0x4000;
const NIMG = SHOW.length;
// The screen pointer is the high nibble and the charset pointer is bits 1-3, so one byte carries
// both -- and the split is a single store of the SAME screen with the other charset.
const d018 = (slot, chr) => hx(((((LIVE + slot * 0x400) >> 6) & 0xf0) | ((CHARS[chr] >> 10) & 0x0e)));
// Raster line of the split. Row 0's first line is 51, so row N starts at 51 + N*8. The store has
// to land before the VIC fetches this line's character data, which is why it happens at the very
// top of the line rather than at leisure.
const SPLITRAS = 51 + SPLITROW * 8;
const PICFR = +(process.env.FACEPICFR ?? 0);

const src = `
        * = $0801
        !byte $0b,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00   ; SYS 2061

start:  sei
        lda $d016
        ora #$10                ; multicolor char mode
        sta $d016
        lda #${INK[0]}
        sta $d021
        lda #${INK[1]}
        sta $d022
        lda #${INK[2]}
        sta $d023
        lda #$00
        sta $d020
        ldx #$00
        lda #${hx(0x08 | (INK[3] & 7))}
cr:     sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne cr

        lda $02a6               ; KERNAL's PAL flag, still valid: a frame differs on the two machines
        beq isNtsc
        lda #${PICFR || 100}
        sta picFr
        jmp rdy
isNtsc: lda #${PICFR || 120}
        sta picFr

rdy:    lda #${NIMG - 1}        ; see preld: it loads the picture AFTER pic, into the slot NOT
        sta pic                 ;   displayed, so both start one behind
        lda #$01
        sta slot
        jsr preld
        lda #$00
        sta slot
        lda nxt
        sta pic

main:   jsr shown
        jsr preld               ; next picture into the other slot while this one is up
        lda picFr
        sta cnt
frm:    jsr wframe
        dec cnt
        bne frm
        lda slot
        eor #$01
        sta slot
        lda nxt
        sta pic
        bne main                ; only picture 0 gets the black pause in front of it

        lda $d011               ; safe here: wframe just returned, so the beam is in the lower
        and #$ef                ;   border and DEN lands between frames rather than tearing one
        sta $d011
        jsr shown
        ldx picFr
blk:    jsr wframe
        dex
        bne blk
        lda $d011
        ora #$10
        sta $d011
        jmp main

        ; The two $d018 values for the slot on display: same screen, the two charsets.
shown:  ldx slot
        lda d018TT,x
        sta vTop
        lda d018TB,x
        sta vBot
        ; Store the TOP value, not the bottom one. wframe only restores vTop at raster 251, which
        ; is after the coming frame has already been drawn -- and preld's 1KB copy runs for most
        ; of that frame -- so leaving $d018 on the bottom charset here draws the whole top band
        ; with the wrong dictionary for exactly one frame at every picture change. That is the
        ; flicker. Called from the lower border, so the store itself is safe.
        lda vTop
        sta $d018
        rts

        ; ---- one frame, and the charset split inside it ----
        ; Wait for the split line and store the bottom charset, then wait for the lower border and
        ; put the top one back for the next frame. Two stores; the VIC does the rest.
        ; The split line is a BADLINE -- row N's first line is raster 51+8N and 51&7 == 3 ==
        ; YSCROLL, so the VIC stalls the CPU from cycle 12 to 54 on exactly the line we want to
        ; change. A store issued at cycle ~10 races that stall; lose, and it lands at cycle 55
        ; with the whole line already fetched from the OLD charset -- one scanline of row N drawn
        ; with the wrong dictionary, which is a visible crease on every picture.
        ; So switch on the line BEFORE, which is not a badline, and only after its own character
        ; fetch has finished. The delay puts the store in the gap between the two lines' fetches.
wframe: lda $d012
        cmp #${hx(SPLITRAS - 1)}
        bne wframe
        ldx #${process.env.SPLITDLY ?? 10}
wfd:    dex
        bne wfd
        lda vBot
        sta $d018
wf2:    lda $d012
        cmp #$fb
        bne wf2
        lda vTop
        sta $d018
wf3:    lda $d012               ; leave the line, so a second call cannot retrigger on it
        cmp #$fb
        beq wf3
        rts

        ; Copy the next picture's map ($400) into the slot not on display.
preld:  ldx pic
        inx
        cpx #${NIMG}
        bcc pl1
        ldx #$00
pl1:    stx nxt
        txa
        asl
        asl                     ; $400 a picture = 4 pages
        clc
        adc #${hx(MAPSRC >> 8)}
        sta rdp+2
        lda slot
        eor #$01
        asl
        asl
        clc
        adc #${hx(LIVE >> 8)}
        sta wrp+2
        ldx #$04
pg:     ldy #$00
rdp:    lda $ff00,y             ; only the HIGH byte is patched, so the low one must be 00
wrp:    sta $ff00,y
        iny
        bne rdp
        inc rdp+2
        inc wrp+2
        dex
        bne pg
        rts

pic:    !byte 0
nxt:    !byte 0
slot:   !byte 0
cnt:    !byte 0
picFr:  !byte 0
vTop:   !byte 0
vBot:   !byte 0
d018TT: !byte ${[0, 1].map(s => d018(s, 0)).join(',')}
d018TB: !byte ${[0, 1].map(s => d018(s, 1)).join(',')}

        * = ${hx(CHARS[0])}
        !byte ${packed(books[0]).join(',')}${ONEBOOK ? '' : `
        * = ${hx(CHARS[1])}
        !byte ${packed(books[1]).join(',')}`}
${MAPS.map((m, i) => `        * = ${hx(MAPSRC + i * 0x400)}\n        !byte ${m.join(',')}`).join('\n')}
`;

const OUT = process.env.OUT ?? './la-test8.d64';
const r = assemble(src);
const d = D64.createEmpty('FACETEST3', '03');
d.writeFile('FACETEST3', Buffer.from(r.prg), D64.FILE_TYPE_PRG);
writeFileSync(OUT, Buffer.from(d.getData()));
console.log(`${OUT}: $${r.org.toString(16)}-$${r.end.toString(16)}, ${r.bytes.length} bytes, ` +
            `${NIMG} pictures x 1 map, ${ONEBOOK ? 'ONE charset (' + (2048 + NIMG*1000) + ' bytes)' : 'TWO charsets split at row ' + SPLITROW + ' (raster ' + SPLITRAS + ')'}`);

// ---- ASSET=1: emit death-pics.json for build-iray.mjs ----
// Same rule the rest of the project follows: a file the BUILD READS is an asset and is committed,
// and everything else here is a picture regenerated by a tool. The game needs the charset, one
// map per picture, and the four palette values -- nothing about the slideshow harness.
if (process.env.ASSET === '1') {
  if (!ONEBOOK) throw new Error('ASSET needs ONEBOOK=1: the game has ONE charset for the scene');
  const asset = {
    source: 'build-facetest3.mjs',
    train: TRAIN.map(([f, b]) => `${f}:${b}`).join(','),
    chars: packed(books[0]),
    maps: SHOW.map((f, i) => ({ name: f, map: MAPS[i] })),
    d021: INK[0], d022: INK[1], d023: INK[2],
    colram: 0x08 | (INK[3] & 7),
    rms: rms.map(v => +v.toFixed(4)),
    ...(SHIPPED ? { recipe: SHIPPED_RECIPE } : {}),
  };
  while (asset.chars.length < 2048) asset.chars.push(0);     // KONE < 256: pad to the full charset
  if (asset.chars.length !== 2048) throw new Error(`charset is ${asset.chars.length} bytes, not 2048`);
  for (const m of asset.maps) if (m.map.length !== 1000)
    throw new Error(`${m.name} map is ${m.map.length} cells, not 1000`);
  // ASSETOUT=path: write the asset elsewhere, to LOOK at a candidate without replacing the game's
  // (tools/renderpic.mjs draws one as a PNG)
  // Written with ', ' and ': ' between items (Python's json.dumps layout): the committed file was
  // last written that way, when its `recipe` was added, so this is what reproduces it byte for byte.
  const py = v => Array.isArray(v) ? '[' + v.map(py).join(', ') + ']'
    : v && typeof v === 'object' ? '{' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + py(x)).join(', ') + '}'
    : JSON.stringify(v);
  writeFileSync(process.env.ASSETOUT ?? './data/death-pics.json', py(asset));
  console.error(`  death-pics.json: charset 2048 + ${asset.maps.length} x 1000` +
                ` = ${2048 + asset.maps.length * 1000} bytes, RMS ${asset.rms.join('/')}`);
}
