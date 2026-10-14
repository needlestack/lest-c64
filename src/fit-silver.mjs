// ---- THE SILVER ORB (level 9, LAB=1): four animation frames fitted to the orb's ten rungs ----
// art/silver-orb-animation-v3.png is four quadrants: the plain ball, then three with lightning.
// Every frame is cut to ONE box -- the union of all four -- so the ball sits at the same place and
// the same size in each, and only the lightning comes and goes. The ball itself is fitted ONCE,
// from the plain frame, and reused under every frame's lightning: fitted per frame, the dither
// would reshuffle on every flash and the ball would shimmer as well as spark.
//
// Inks are the orb's (fit-orb.mjs): 1 = $d025 grey1, 2 = sprite colour grey2, 3 = $d026 grey3,
// the user's choice -- the render's reflections were made for the white/black levels. The
// LIGHTNING is drawn in whichever of the three the plain ball uses LEAST (the user, 2026-10-13),
// and that ink is turned light blue while a lightning frame is up -- so a bolt always shows blue,
// and the few ball pixels in that ink tint with it.
//
//   node src/fit-silver.mjs [h]          -- preview every frame at rung height h as ASCII
import { execFileSync } from 'child_process';
import { artPath } from './fit-orb.mjs';

const FILE = 'silver-orb-animation-v3.png';
// pixel value -> luminance the dither aims at. fit-orb's greys by default; the build sets the
// real inks' (setSilverLuma) -- black/grey2/white wants the stretch to reach both ends.
let LU = [null, 68, 108, 149];
export const setSilverLuma = l => { LU = [null, ...l]; };
// A source pixel is LIGHTNING when it is distinctly blue: the bolts are saturated blue-white
// with a pale blue glow, the ball is neutral grey. SILVBLUEDIFF sets how blue: 70 keeps the
// bolts and their nearer glow and drops the faint halo, which at 45 fattened every bolt.
const BLUEDIFF = +(process.env.SILVBLUEDIFF ?? 70);
const isBlue = (r, g, b) => b > 150 && b - r > BLUEDIFF;
const BLUECOV = +(process.env.SILVBLUE ?? 0.12);   // the least of a bolt that can claim a pixel...
// ...and only on its RIDGE (the user, 2026-10-13: "the blue is too thick ... more spindly"): a
// pixel is bolt only where its coverage is a local maximum across OR down, so a bolt that
// smears over two or three pixels at this size keeps the one along its spine. SILVRIDGE=0 off.
const RIDGE = process.env.SILVRIDGE !== '0';
const COVER = 0.5;                                  // ...the ball needs half the footprint, like the orb
const CON = +(process.env.SILVCON ?? 1.3);          // S-curve, as fitArt's ARTCON
// C64 PAL: a hires pixel is 0.936 as wide as it is tall, and a multicolour sprite pixel is two of
// them, so a square of source maps to h rows by h / 1.87 sprite pixels.
// NTSC, not PAL: the game runs NTSC, where a hires pixel is about 0.75 as wide as it is tall. At
// PAL's 0.936 the ball came out a quarter narrower than the orb's own (12 wide by 17 rows) -- "too
// narrow horizontally" (the user, 2026-10-13). SILVASPECT overrides the hires pixel's shape.
const MC_ASPECT = 2 * +(process.env.SILVASPECT ?? 0.75);

let SRC = null;
function load() {
  if (SRC) return SRC;
  const file = artPath(FILE);
  const [sw, sh] = execFileSync('magick', ['identify', '-format', '%w %h', file]).toString().split(' ').map(Number);
  const rgb = execFileSync('magick', [file, '-depth', '8', 'rgb:-'], { maxBuffer: 1 << 28 });
  const q = sw >> 1;
  const frames = [[0, 0], [q, 0], [0, q], [q, q]].map(([ox, oy]) => {
    // background = near-white reachable from the quadrant's border (fit-orb's flood fill: the
    // ball's specular highlight is as white as the backdrop and must not be punched through)
    const kind = new Uint8Array(q * q);             // 0 bg, 1 ball, 2 lightning
    const px = (x, y) => { const o = ((oy + y) * sw + ox + x) * 3; return [rgb[o], rgb[o + 1], rgb[o + 2]]; };
    const bg = new Uint8Array(q * q), st = [];
    for (let i = 0; i < q; i++) st.push(i, 0, i, q - 1, 0, i, q - 1, i);
    while (st.length) {
      const y = st.pop(), x = st.pop();
      if (x < 0 || y < 0 || x >= q || y >= q || bg[y * q + x]) continue;
      const [r, g, b] = px(x, y);
      if (Math.min(r, g, b) < 235) continue;
      bg[y * q + x] = 1;
      st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    const lum = new Uint8Array(q * q);
    for (let y = 0; y < q; y++) for (let x = 0; x < q; x++) {
      const i = y * q + x, [r, g, b] = px(x, y);
      lum[i] = (r * 299 + g * 587 + b * 114) / 1000;
      kind[i] = bg[i] ? 0 : isBlue(r, g, b) ? 2 : 1;
    }
    return { kind, lum };
  });
  // the union box of everything inked in any frame
  let x0 = q, y0 = q, x1 = -1, y1 = -1;
  for (const f of frames) for (let y = 0; y < q; y++) for (let x = 0; x < q; x++)
    if (f.kind[y * q + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  // the ball's tonal range, from the plain frame -- every frame's ball is that one
  let lo = 255, hi = 0, bx0 = q, bx1 = -1;
  const f0 = frames[0];
  for (let i = 0; i < q * q; i++) if (f0.kind[i] === 1) {
    lo = Math.min(lo, f0.lum[i]); hi = Math.max(hi, f0.lum[i]);
    bx0 = Math.min(bx0, i % q); bx1 = Math.max(bx1, i % q);
  }
  // ---- TRIM THE BOLTS' SIDEWAYS REACH (the user, 2026-10-13) ----
  // Two sprites are 24 pixels across, and the union box is ~1.7 ball-diameters wide, so the WIDTH
  // was what capped the 2x2 ball -- at NTSC's pixel shape a 42-row box wanted 28 pixels. Cut the
  // box to SILVTRIMX ball-diameters, centred on the ball: 1.4 makes a 42-row rung exactly 24 wide,
  // so height is the limit again, and it clips only the outermost bolt tips. 0 keeps the union.
  const TRIMX = +(process.env.SILVTRIMX ?? 1.4);
  if (TRIMX > 0) {
    const d = bx1 - bx0 + 1, cx = (bx0 + bx1) / 2, w = Math.round(TRIMX * d);
    x0 = Math.max(x0, Math.round(cx - w / 2)); x1 = Math.min(x1, x0 + w - 1);
  }
  SRC = { q, frames, x0, y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1, lo, hi, ballW: bx1 - bx0 + 1 };
  return SRC;
}

// Sprite pixels across for a rung h rows tall, keeping the box's proportions on screen.
// Up to 24: the near rungs are two sprites wide (2x2), not one sprite magnified.
export const silverW = h => { const s = load(); return Math.max(1, Math.min(24, Math.round(h * s.bw / s.bh / MC_ASPECT))); };

// The plain ball at w x h: values 0..3, dithered like fitArt (serpentine Floyd-Steinberg).
function ballAt(w, h) {
  const { q, frames, x0, y0, bw, bh, lo, hi } = load(), f = frames[0];
  const want = new Float64Array(w * h).fill(-1);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const sx0 = x0 + Math.floor(bw * dx / w), sx1 = x0 + Math.ceil(bw * (dx + 1) / w);
    const sy0 = y0 + Math.floor(bh * dy / h), sy1 = y0 + Math.ceil(bh * (dy + 1) / h);
    let sum = 0, ink = 0, n = 0;
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      n++; const i = y * q + x;
      if (f.kind[i] === 1) { sum += f.lum[i]; ink++; }
    }
    if (ink / n < COVER) continue;
    let t = (sum / ink - lo) / Math.max(1, hi - lo);
    t = Math.min(1, Math.max(0, 0.5 + (t - 0.5) * CON));
    want[dy * w + dx] = LU[1] + t * (LU[3] - LU[1]);
  }
  const px = new Uint8Array(w * h), buf = Float64Array.from(want);
  for (let y = 0; y < h; y++) {
    const rev = (y & 1) === 1;
    for (let k = 0; k < w; k++) {
      const x = rev ? w - 1 - k : k, i = y * w + x;
      if (want[i] < 0) continue;
      let best = 1, bd = Infinity;
      for (const v of [1, 2, 3]) { const d = Math.abs(buf[i] - LU[v]); if (d < bd) { bd = d; best = v; } }
      px[i] = best;
      const e = buf[i] - LU[best], d = rev ? -1 : 1;
      const put = (xx, yy, fr) => { if (xx >= 0 && xx < w && yy >= 0 && yy < h && want[yy * w + xx] >= 0) buf[yy * w + xx] += e * fr; };
      put(x + d, y, 7 / 16); put(x - d, y + 1, 3 / 16); put(x, y + 1, 5 / 16); put(x + d, y + 1, 1 / 16);
    }
  }
  return px;
}

// Which of the three inks the plain ball uses least, over every rung the ladder fits.
export function silverLeast(heights) {
  const n = [0, 0, 0, 0];
  for (const h of heights) for (const v of ballAt(silverW(h), h)) n[v]++;
  return { ink: [1, 2, 3].reduce((a, b) => (n[b] < n[a] ? b : a)), counts: n.slice(1) };
}

// Frame f (0 plain, 1..3 lightning) at w x h, the lightning drawn in ink `bolt`.
export function silverAt(f, w, h, bolt) {
  const px = ballAt(w, h);
  if (f === 0) return px;
  const { q, frames, x0, y0, bw, bh } = load(), fr = frames[f];
  const cov = new Float64Array(w * h);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const sx0 = x0 + Math.floor(bw * dx / w), sx1 = x0 + Math.ceil(bw * (dx + 1) / w);
    const sy0 = y0 + Math.floor(bh * dy / h), sy1 = y0 + Math.ceil(bh * (dy + 1) / h);
    let blue = 0, n = 0;
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) { n++; if (fr.kind[y * q + x] === 2) blue++; }
    cov[dy * w + dx] = blue / n;
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : cov[y * w + x];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const c = at(dx, dy);
    if (c < BLUECOV) continue;
    // strictly above one neighbour and not below the other: a two-pixel plateau keeps one pixel
    const ridge = !RIDGE || (c > at(dx - 1, dy) && c >= at(dx + 1, dy)) || (c > at(dx, dy - 1) && c >= at(dx, dy + 1));
    if (ridge) px[dy * w + dx] = bolt;
  }
  return px;
}

if (process.argv[1]?.endsWith('fit-silver.mjs')) {
  const h = +(process.argv[2] ?? 21), w = silverW(h);
  const L = silverLeast([21, 19, 18, 16, 14, 12, 10, 8, 6, 4]);
  const s = load();
  console.log(`box ${s.bw}x${s.bh} (union of the four frames, trimmed to ${(s.bw / s.ballW).toFixed(2)} ball widths), rung ${w}x${h}; ball inks 1/2/3 used ${L.counts.join('/')} -> lightning in ink ${L.ink}`);
  const fr = [0, 1, 2, 3].map(f => silverAt(f, w, h, L.ink));
  for (let y = 0; y < h; y++) console.log(fr.map(p => [...p.slice(y * w, y * w + w)].map(v => '.-+#'[v]).join('')).join('   '));
}
