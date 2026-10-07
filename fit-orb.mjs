// Sample a photorealistic sphere render down to ONE multicolor sprite: 12x21 pixels, three greys
// plus transparent. That single sprite is the top of the orb ladder -- every smaller rung is
// resampled from it by orbScale in build-iray.mjs, exactly as the hand-drawn art is today.
//
//   node fit-orb.mjs sphere-rough.png            -- preview as ASCII + the 63 bytes
//
// The sprite's four pixel values are fixed by the VIC, not chosen here:
//   0 transparent   1 = $d025 (grey1, 68)   2 = sprite colour (grey2, 108)   3 = $d026 (grey3, 149)
// so this is the same three-level problem as the face charset, on a 180-pixel canvas.
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';

// SOURCE ART lives in art/. A bare file name ('goat6.png') means art/goat6.png; anything with a
// slash is a path and is taken as given -- so IDOLART=some/other.png still points anywhere.
// Resolved against this file, not the working directory, so a tool run from elsewhere finds it.
const ART = new URL('./art/', import.meta.url).pathname;
export const artPath = f => {
  const p = f.includes('/') ? f : ART + f;
  if (!existsSync(p)) throw new Error(`source art not found: ${p}`);
  return p;
};

const LU = [null, 68, 108, 149];              // luminance of pixel values 1..3
const LEVELS = [1, 2, 3];
const BG     = +(process.env.ORBBG ?? 235);   // source is on white; above this is background
const BGDARK = +(process.env.ORBBGDARK ?? 24);  // ...or on black; BELOW this is background
const COVER  = +(process.env.ORBCOVER ?? 0.5);// destination pixel needs this much ink to exist
const DITHER = process.env.ORBDITHER !== '0';
// The renders are lit from the RIGHT; the hand-drawn orb has its highlight at upper LEFT. Mirror
// so the new art agrees with the light direction already established in the game.
const MIRROR = process.env.ORBMIRROR !== '0';

// Decode and mask ONCE per file, then fit to as many sizes as asked. The orb ladder wants a
// dozen sizes out of the same render -- see fitArt's note on why every rung is fitted from the
// SOURCE rather than resampled from the biggest one.
const srcCache = new Map();
// dark: the background is BLACK rather than white. The sphere renders sit dark on white, so the
// flood fill looks for bright pixels reachable from the border; art that is lit-on-black (the ram
// statues) has no bright border to start from, every pixel comes back as ink, and the fit returns
// a filled rectangle. One comparison, flipped.
function loadArt(file, mirror, dark) {
  file = artPath(file);
  const key = `${file}|${mirror}|${dark ? 'd' : 'l'}`;
  if (srcCache.has(key)) return srcCache.get(key);
  const [sw, sh] = execFileSync('magick', ['identify', '-format', '%w %h', file])
    .toString().split(' ').map(Number);
  const raw = execFileSync('magick', [file, '-colorspace', 'gray', '-depth', '8', 'gray:-'],
    { maxBuffer: 1 << 28 });
  const at = (x, y) => raw[y * sw + (mirror ? sw - 1 - x : x)];

  // Background is what the border CONNECTS to, not simply what is bright. A glossy sphere's
  // specular highlight is brighter than the white backdrop, so a plain "v >= BG is background"
  // test punches transparent holes straight through the lit side of the ball -- which is exactly
  // what it did before this was a flood fill. Only white reachable from the edge is background.
  const bg = new Uint8Array(sw * sh);
  const stack = [];
  for (let x = 0; x < sw; x++) { stack.push(x, 0); stack.push(x, sh - 1); }
  for (let y = 0; y < sh; y++) { stack.push(0, y); stack.push(sw - 1, y); }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || x >= sw || y < 0 || y >= sh) continue;
    const i = y * sw + x;
    if (bg[i] || (dark ? at(x, y) > BGDARK : at(x, y) < BG)) continue;
    bg[i] = 1;
    stack.push(x + 1, y); stack.push(x - 1, y); stack.push(x, y + 1); stack.push(x, y - 1);
  }
  const isInk = (x, y) => !bg[y * sw + x];

  // Content box. The whole composition -- ball, gap and ground shadow -- is stretched to fill the
  // 12x21 frame, which is what the hand-drawn art does too, so the orb keeps its exact on-screen
  // footprint and nothing downstream in the ladder has to move.
  let x0 = sw, x1 = -1, y0 = sh, y1 = -1;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++)
    if (isInk(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x;
                       if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const v = { sw, sh, at, isInk, x0, y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1 };
  srcCache.set(key, v);
  return v;
}

// Fit to a W x H grid of sprite pixel values (0 transparent, 1/2/3 the three greys).
export function fitArt(file, W, H, opts = {}) {
  const { at, isInk, x0, y0, bw, bh } = loadArt(file, opts.mirror ?? MIRROR, opts.dark);
  const dither = opts.dither ?? DITHER;

  // Box-filter each destination pixel: mean luminance over its footprint, and what fraction of
  // that footprint is actually ink. Averaging tone only over the INKED samples matters at this
  // size -- letting white background into the mean would wash out every edge pixel of the ball.
  const tone = new Float64Array(W * H).fill(-1);
  let lo = 255, hi = 0;
  for (let dy = 0; dy < H; dy++) for (let dx = 0; dx < W; dx++) {
    const sx0 = x0 + Math.floor(bw * dx / W), sx1 = x0 + Math.ceil(bw * (dx + 1) / W);
    const sy0 = y0 + Math.floor(bh * dy / H), sy1 = y0 + Math.ceil(bh * (dy + 1) / H);
    let sum = 0, ink = 0, n = 0;
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      n++;
      if (isInk(x, y)) { sum += at(x, y); ink++; }
    }
    if (ink / n < COVER) continue;            // mostly background: this pixel stays transparent
    const m = sum / ink;
    tone[dy * W + dx] = m;
    if (m < lo) lo = m;
    if (m > hi) hi = m;
  }

  // Stretch the sphere's own tonal range across the three greys. The renders sit dark against
  // white (centre ~77 of 255), so mapping absolute luminance would put the whole ball on grey1
  // and throw away two thirds of the palette.
  // ARTCON: an S-curve about the midpoint, applied AFTER normalisation. Contrast added to the
  // source PNG does not survive this function -- the range is stretched to the palette either
  // way, so a linear boost is undone and the level mix barely moves. What limits apparent detail
  // is that two thirds of the figure lands on the middle grey; pushing tones away from the centre
  // is what spreads them onto the outer two and makes the shading read.
  const CON = opts.contrast ?? +(process.env.ARTCON ?? 1);
  const want = new Float64Array(W * H).fill(-1);
  for (let i = 0; i < W * H; i++) {
    if (tone[i] < 0) continue;
    let t = (tone[i] - lo) / Math.max(1, hi - lo);
    t = Math.min(1, Math.max(0, 0.5 + (t - 0.5) * CON));
    want[i] = LU[1] + t * (LU[3] - LU[1]);
  }

  const px = new Uint8Array(W * H);
  const buf = Float64Array.from(want);
  for (let y = 0; y < H; y++) {
    // Serpentine, so the error does not comb in one direction -- very visible on a canvas this
    // narrow, where a left-to-right scan pushes every residue into the same edge column.
    const rev = (y & 1) === 1;
    for (let k = 0; k < W; k++) {
      const x = rev ? W - 1 - k : k, i = y * W + x;
      if (want[i] < 0) continue;
      let best = LEVELS[0], bd = Infinity;
      for (const v of LEVELS) { const d = Math.abs(buf[i] - LU[v]); if (d < bd) { bd = d; best = v; } }
      px[i] = best;
      if (!dither) continue;
      const e = buf[i] - LU[best];
      const put = (xx, yy, f) => {
        if (xx < 0 || xx >= W || yy < 0 || yy >= H) return;
        if (want[yy * W + xx] < 0) return;    // never diffuse into transparency: it is not a tone
        buf[yy * W + xx] += e * f;
      };
      const d = rev ? -1 : 1;
      put(x + d, y,     7 / 16);
      put(x - d, y + 1, 3 / 16);
      put(x,     y + 1, 5 / 16);
      put(x + d, y + 1, 1 / 16);
    }
  }

  const bytes = [];
  for (let y = 0; y < H; y++) for (let b = 0; b < 3; b++)
    bytes.push([0, 1, 2, 3].reduce((v, k) => v | (px[y * W + b * 4 + k] << (6 - 2 * k)), 0));
  bytes.push(0);                              // 64th byte: sprite pointers are 64-byte aligned
  return { bytes, px, box: [bw, bh], range: [lo, hi] };
}

export const fitOrb = (file) => fitArt(file, 12, 21);

if (process.argv[1]?.endsWith('fit-orb.mjs') && process.argv[2]) {
  const r = fitArt(process.argv[2], +(process.env.ORBW ?? 12), +(process.env.ORBH ?? 21));
  const CH = '.-+#';
  console.error(`${process.argv[2]}: content box ${r.box[0]}x${r.box[1]}, ` +
                `tone ${r.range[0].toFixed(0)}..${r.range[1].toFixed(0)}` +
                `${DITHER ? '' : ', NO dither'}${MIRROR ? ', mirrored' : ''}`);
  const [W, H] = [+(process.env.ORBW ?? 12), +(process.env.ORBH ?? 21)];
  for (let y = 0; y < H; y++)
    console.error(String(y).padStart(2) + ' ' +
      [...r.px.slice(y * W, y * W + W)].map(v => CH[v]).join(''));
  console.log(r.bytes.join(','));
}

// ---- fatBits: read a hand-drawn W x H cell straight out of a pixel-editor screenshot ----
// A "fat bits" grab is a magnified grid drawn on a black canvas, so it is the CANVAS, not the
// ink, that bounds the cell -- taking the ink's bounding box would crop to the symbol and lose
// which grid squares it actually sits in. Sampling the centre of each grid square then ignores
// the editor's gridlines and any half-pixel at the edges, which is what makes this exact:
// fitArt's box filter and dither exist for photographs and would soften a two-colour bitmap.
export function fatBits(file, W, H) {
  file = artPath(file);
  const [sw, sh] = execFileSync('magick', ['identify', '-format', '%w %h', file])
    .toString().split(' ').map(Number);
  const raw = execFileSync('magick', [file, '-colorspace', 'gray', '-depth', '8', 'gray:-'],
    { maxBuffer: 1 << 28 });
  const at = (x, y) => raw[y * sw + x];
  let x0 = sw, x1 = -1, y0 = sh, y1 = -1;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++)
    if (at(x, y) < 40) { if (x < x0) x0 = x; if (x > x1) x1 = x;
                         if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) throw new Error(`${file}: no dark canvas -- is it a fat-bits grab?`);
  const cw = (x1 - x0 + 1) / W, rh = (y1 - y0 + 1) / H;
  return [...Array(W * H)].map((_, i) =>
    at(Math.round(x0 + cw * ((i % W) + 0.5)), Math.round(y0 + rh * ((i / W | 0) + 0.5))) > 40);
}
