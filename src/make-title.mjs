// make-title.mjs -- art/lest.png -> title-screen.json, run by hand like make-quote.mjs.
//
// The title is drawn in HI-RES character mode, the boot quote's own mode, and it is built from the
// quote's own charset: the letters are made of the quote's glyph shapes used as big rough STAMPS,
// plus up to 39 glyphs of its own -- the 256 - 217 slots the quote leaves free. Colour RAM gives
// each cell one of the two greys in the source art (grey 1 / grey 2, colours 11 / 12; the art's
// dark tone #262625 is darker than any C64 grey, so it becomes grey 1).
//
// The CHARSET IS SHARED: glyphs 0..NQ-1 are the quote's (quote-screen.json, which make-quote.mjs
// merges to a budget so these fit), and this screen's own glyphs fill the slots after them. So run
// this AFTER make-quote.mjs: the stamps ARE the quote's glyphs, and a new quote re-stamps the title.
//
// The look was chosen by eye (2026-10-07, preview "T2s1" plus hand edits; re-stamped the same day
// from quote-start.png's charset, which changed only texture cells); each step below
// exists because a simpler one looked wrong:
//
//   1. COVERAGE. The 640x480 art is box-averaged to 320x200, one coverage value per tone.
//   2. TEXTURE TARGETS. A cell whose light tone dominates traces only the LIGHT shapes, so the
//      lighter texture shows inside the dark letters; any other inked cell traces the silhouette.
//   3. DISTRESS. Pixels near a letter edge or a grey-1/grey-2 seam are eroded by smooth value
//      noise (features ~3 px, reach AMP px), so edges are torn in CLUMPS. Eroding the glyphs
//      instead chewed every cell border, interiors too, and read as static.
//   4. FIT. 24 extra glyphs are chosen greedily (each the target pattern that most reduces the
//      total error), then every cell takes its nearest glyph. The quote's charset alone has no
//      solid shape at all -- it is italic strokes -- so letters came out as fine type texture.
//   5. TEAR. Any perfect rectangle (a solid block, half or strip) still showing gets 1-2 CONVEX
//      corners torn off, from 15 torn variants shared at random across blocks. Rules learned the
//      hard way: a real bite only where the corner faces BLACK (anywhere else it is a black hole
//      inside a letter), a 2-pixel nick where it meets the other grey, one tear per meeting
//      point (four tears at one point made a black diamond), and convex corners only (tearing
//      where stacked blocks continue one straight edge notched it every 8 px, like beads).
//   6. HAND EDITS, from a hand-edited preview (title-preview-T2s1-edit.png, not kept): six cells erased, three recoloured.
//
// REPRODUCIBILITY: every random choice comes from a seeded LCG, so a run reproduces the approved
// screen for a given quote charset -- but step 5 shuffles with Array.sort and a random comparator, whose call order belongs
// to the JS engine. title-screen.json is therefore the source of truth; re-running this on another
// engine may tear different corners. Check with the preview it writes before committing a rerun.
//
//   node src/make-title.mjs              -> data/title-screen.json + build/title-preview.png (3x, for looking)
import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { png } from './png.mjs';
import { ROOT } from './paths.mjs';
process.chdir(ROOT);   // paths below are repo-relative (see src/paths.mjs)

const SRC = process.argv[2] ?? './art/lest.png';
const AMP = 2.4, NOISE_SEED = 11, NOISE_SCALE = 3;    // distress reach and grain (S2)
const TEAR_SEED = 1;
const BLANK = [[14, 13], [15, 13], [19, 12], [19, 13], [25, 6], [26, 6]];   // erased by hand
const DARK = [[16, 13], [16, 14], [15, 14]];           // recoloured by hand: grey 2 -> grey 1, same shape
const INK_DARK = 11, INK_LIGHT = 12;

// ---- the quote's charset, as 64-pixel arrays ----
const Q = JSON.parse(readFileSync('./data/quote-screen.json', 'utf8'));
const NQ = Q.glyphs, G = [];
// THE APPROVED BUDGET is 24 fitted + 15 torn = 39. More slots would not improve the title, they
// would CHANGE it -- more fitted glyphs means a cleaner fit, and the chosen look is the rough one.
// So it takes 39 when the quote leaves that many (quote-start.png: 179 glyphs, 77 free), and only
// when the quote is bigger does it shrink, keeping the same proportion.
const FREE = Math.min(39, 256 - NQ), TORN = Math.round(FREE * 15 / 39), FITTED = FREE - TORN;
for (let g = 0; g < NQ; g++) {
  const b = []; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) b.push((Q.chars[g * 8 + r] >> (7 - c)) & 1);
  G.push(b);
}

// ---- 1. coverage of each tone at 320x200 ----
const [W, H] = execFileSync('magick', ['identify', '-format', '%w %h', SRC]).toString().split(' ').map(Number);
const raw = execFileSync('magick', [SRC, '-colorspace', 'gray', '-depth', '8', 'gray:-'], { maxBuffer: 1 << 26 });
const tone = v => v < 20 ? 0 : v < 75 ? 1 : 2;           // black, dark tone (38), light tone (108)
const cov = [new Float32Array(64000), new Float32Array(64000)];
for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) {
  const y0 = Math.floor(y * H / 200), y1 = Math.floor((y + 1) * H / 200);
  const x0 = Math.floor(x * W / 320), x1 = Math.floor((x + 1) * W / 320);
  let n = 0, d = 0, l = 0;
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const t = tone(raw[yy * W + xx]); n++; d += t === 1; l += t === 2; }
  cov[0][y * 320 + x] = d / n; cov[1][y * 320 + x] = l / n;
}
const pix = (i, k) => ((Math.floor(i / 40) * 8 + (k >> 3)) * 320 + (i % 40) * 8 + (k & 7));
const inkOf = i => { let D = 0, L = 0; for (let k = 0; k < 64; k++) { D += cov[0][pix(i, k)]; L += cov[1][pix(i, k)]; } return L > D ? INK_LIGHT : INK_DARK; };

// ---- 2. per-cell targets ----
const RAW = [...Array(1000)].map((_, i) => {
  const lit = inkOf(i) === INK_LIGHT;
  return [...Array(64)].map((_, k) => { const j = pix(i, k); return (lit ? cov[1][j] : cov[0][j] + cov[1][j]) > 0.5 ? 1 : 0; });
});

// ---- 3. distress: clumpy erosion near letter edges and grey seams ----
const rng = seed => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
const noise = (() => {
  const R = rng(NOISE_SEED), S = NOISE_SCALE, gw = Math.ceil(320 / S) + 2, gh = Math.ceil(200 / S) + 2;
  const g = [...Array(gw * gh)].map(() => R()), f = new Float32Array(64000), sm = u => u * u * (3 - 2 * u);
  for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) {
    const gx = x / S, gy = y / S, x0 = gx | 0, y0 = gy | 0, u = sm(gx - x0), v = sm(gy - y0);
    const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1], c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
    f[y * 320 + x] = (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }
  return f;
})();
const INK = RAW.map((t, i) => t.some(Boolean) ? inkOf(i) : 0);
const TGT = (() => {
  const px = (x, y) => { if (x < 0 || y < 0 || x >= 320 || y >= 200) return 0; const i = (y >> 3) * 40 + (x >> 3); return RAW[i][(y & 7) * 8 + (x & 7)] ? INK[i] : 0; };
  const R = Math.ceil(AMP) + 1;
  return RAW.map((cell, i) => cell.map((v, k) => {
    if (!v) return 0;
    const x = (i % 40) * 8 + (k & 7), y = Math.floor(i / 40) * 8 + (k >> 3), me = INK[i];
    let dmin = 99;                                     // distance to black or the other grey
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++)
      if (px(x + dx, y + dy) !== me) dmin = Math.min(dmin, Math.hypot(dx, dy));
    return dmin <= AMP * noise[y * 320 + x] ? 0 : 1;
  }));
})();

// ---- 4. greedy extra glyphs, then nearest glyph per cell ----
const ham = (a, b) => { let e = 0; for (let i = 0; i < 64; i++) e += a[i] !== b[i]; return e; };
{
  const cur = TGT.map(t => Math.min(...G.map(g => ham(g, t))));
  const cand = [...new Map(TGT.map(t => [t.join(''), t])).values()];
  for (let n = 0; n < FITTED; n++) {
    let bi = -1, bs = 0;
    cand.forEach((c, ci) => { let s = 0; TGT.forEach((t, j) => { const e = ham(c, t); if (e < cur[j]) s += cur[j] - e; }); if (s > bs) { bs = s; bi = ci; } });
    if (bi < 0) break;
    G.push(cand[bi]); TGT.forEach((t, j) => { cur[j] = Math.min(cur[j], ham(cand[bi], t)); });
  }
}
const nearest = t => { let bg = 0, be = 99; G.forEach((g, gi) => { const e = ham(g, t); if (e < be) { be = e; bg = gi; } }); return bg; };
const cells = RAW.map((r, i) => r.some(Boolean) ? { bits: G[nearest(TGT[i])], ink: INK[i] } : { bits: r, ink: 0 });

// ---- 5. tear the visible corners of perfect rectangles ----
const isRect = b => {
  let x0 = 8, x1 = -1, y0 = 8, y1 = -1, n = 0;
  b.forEach((v, i) => { if (v) { n++; const x = i & 7, y = i >> 3; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
  return n >= 6 && n === (x1 - x0 + 1) * (y1 - y0 + 1) ? [x0, y0, x1, y1] : null;
};
{
  const at = (x, y) => { if (x < 0 || y < 0 || x >= 320 || y >= 200) return 0; const c = cells[(y >> 3) * 40 + (x >> 3)]; return c.bits[(y & 7) * 8 + (x & 7)] ? c.ink : 0; };
  const R = rng(TEAR_SEED), keys = new Map(), assign = [], claimed = new Set();
  cells.forEach((c, i) => {
    const rc = c.ink && isRect(c.bits); if (!rc) return;
    const [x0, y0, x1, y1] = rc, ox = (i % 40) * 8, oy = Math.floor(i / 40) * 8;
    const corners = [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]];
    const kind = [], pt = [];
    const exposed = corners.map(([x, y, sx, sy], ci) => {
      const X = ox + x, Y = oy + y, out = [at(X + sx, Y), at(X, Y + sy), at(X + sx, Y + sy)];
      pt[ci] = `${X + (sx > 0 ? 1 : 0)},${Y + (sy > 0 ? 1 : 0)}`;
      if (claimed.has(pt[ci])) return -1;                       // one tear per meeting point
      if (out[0] === c.ink || out[1] === c.ink) return -1;      // not convex: a straight edge continues
      if (out[0] === 0 || out[1] === 0) { kind[ci] = 'B'; return ci; }   // faces black: a bite
      if (R() < 0.5) { kind[ci] = 'n'; return ci; }             // meets the other grey: maybe a nick
      return -1;
    }).filter(ci => ci >= 0);
    if (!exposed.length) return;
    // reuse a torn shape that fits (same rectangle, its torn corners all allowed here), by
    // choice 60% of the time and always once the budget is spent
    const rk = rc.join(','), ok = (ci, t) => exposed.includes(ci) && (t === 'n' || kind[ci] === 'B');
    const fits = [...keys.entries()].filter(([k, v]) => k.startsWith(rk + '|') && v.pick.every((ci, j) => ok(ci, v.kinds[j]))).map(([k]) => k);
    const room = keys.size < TORN;
    const take = key => { assign.push([i, key]); for (const ci of keys.get(key).pick) claimed.add(pt[ci]); };
    if (fits.length && (!room || R() < 0.6)) { take(fits[Math.floor(R() * fits.length)]); return; }
    if (!room) return;
    const pick = exposed.sort(() => R() - 0.5).slice(0, exposed.length > 1 && R() < 0.5 ? 2 : 1).sort();
    const kinds = pick.map(ci => kind[ci]), key = rk + '|' + pick.map((ci, j) => ci + kinds[j]).join('');
    if (!keys.has(key)) keys.set(key, { rc, pick, kinds });
    take(key);
  });
  const B = rng(TEAR_SEED * 7 + 1);
  const tri = n => { const o = []; for (let a = 0; a < n; a++) for (let b = 0; b < n - a; b++) o.push([a, b]); return o; };
  const bite = () => {
    const k = Math.floor(B() * 4);
    if (k === 0) return tri(3);
    if (k === 1) return tri(4);
    if (k === 2) return [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [0, 2]].concat(B() < .5 ? [[3, 0]] : [[0, 3]]);   // lopsided notch
    return tri(4).filter(() => B() < 0.8).concat([[0, 0], [1, 0], [0, 1]]);                                    // ragged
  };
  const variant = new Map();
  for (const [key, { rc: [x0, y0, x1, y1], pick, kinds }] of keys) {
    const b = Array(64).fill(0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) b[y * 8 + x] = 1;
    pick.forEach((ci, j) => {
      const cx = ci & 1 ? x1 : x0, cy = ci & 2 ? y1 : y0, sx = ci & 1 ? -1 : 1, sy = ci & 2 ? -1 : 1;
      const nick = [[0, 0], B() < 0.5 ? [1, 0] : [0, 1]];
      for (const [a, d] of (kinds[j] === 'n' ? nick : bite())) {
        const x = cx + sx * a, y = cy + sy * d;
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) b[y * 8 + x] = 0;
      }
    });
    variant.set(key, b);
  }
  for (const [i, key] of assign) cells[i] = { ...cells[i], bits: variant.get(key) };
}

// ---- 6. hand edits ----
for (const [x, y] of BLANK) cells[y * 40 + x] = { bits: Array(64).fill(0), ink: 0 };
for (const [x, y] of DARK) cells[y * 40 + x] = { ...cells[y * 40 + x], ink: INK_DARK };

// ---- out: the quote's glyphs first (indices 0..216 unchanged), then this screen's own ----
const index = new Map(G.slice(0, NQ).map((g, i) => [g.join(''), i]).reverse());   // first match wins
const extra = [];
const screen = cells.map(c => {
  const k = c.bits.join('');
  if (!index.has(k)) { index.set(k, NQ + extra.length); extra.push(c.bits); }
  return index.get(k);
});
if (NQ + extra.length > 256) throw new Error(`${extra.length} extra glyphs: the charset holds ${256 - NQ} more`);
const bytes = b => [...Array(8)].map((_, r) => b.slice(r * 8, r * 8 + 8).reduce((v, p) => v * 2 + p, 0));
writeFileSync('./data/title-screen.json', JSON.stringify({
  note: 'Title screen: hi-res char mode on the boot quote\'s charset (glyphs 0..' + (NQ - 1) + ' are quote-screen.json\'s), ' +
        'plus `extra` glyphs appended after them (8 bytes each, MSB left). screen = 1000 glyph indices, ' +
        'colour = 1000 colour-RAM values, background black. Generated by make-title.mjs; this file is the source of truth.',
  src: SRC, quoteGlyphs: NQ, extra: extra.flatMap(bytes), screen, colour: cells.map(c => c.ink),
}));
const PAL = { 0: [0, 0, 0], 11: [68, 68, 68], 12: [108, 108, 108] };
const S3 = 3, rgb = new Uint8Array(960 * 600 * 3);
for (let y = 0; y < 600; y++) for (let x = 0; x < 960; x++) {
  const X = Math.floor(x / S3), Y = Math.floor(y / S3), c = cells[(Y >> 3) * 40 + (X >> 3)];
  const col = c.bits[(Y & 7) * 8 + (X & 7)] ? PAL[c.ink] : PAL[0], p = (y * 960 + x) * 3;
  rgb[p] = col[0]; rgb[p + 1] = col[1]; rgb[p + 2] = col[2];
}
writeFileSync('./build/title-preview.png', png(960, 600, rgb));
console.log(`title-screen.json: ${extra.length} extra glyphs (of ${256 - NQ} free), ` +
            `${new Set(screen).size} distinct glyphs on screen; preview in title-preview.png`);
