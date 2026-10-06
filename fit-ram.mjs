// Sample the ram idol renders down to C64 multicolor SPRITES, for a possible new entity.
//
//   node fit-ram.mjs                    -- writes ram-sprite-*.png
//
// WHY NOT fit-orb.mjs's fitArt. That one is built for a sphere render on WHITE: it finds the
// background by FLOOD FILLING inward from the border, which is exactly right for a glossy ball
// whose specular highlight is brighter than the backdrop. These are gold on BLACK, and ram3 has
// black gaps ENCLOSED by the pentagram and the horns -- regions the flood fill can never reach,
// so they would come out as opaque white and read as the brightest thing in the sprite. Keying
// alpha by luminance instead gets the holes right, and the rest of the pipeline below is
// deliberately the same as fitArt's: box-filter, normalise the figure's own range across the
// three levels, S-curve, serpentine Floyd-Steinberg.
//
// THE PALETTE IS NOT A CHOICE, except for one slot. Every sprite in this engine is multicolor
// ($d01c = $ff), so each has four bit pairs and only ONE of them is its own:
//   00  transparent
//   01  $d025      grey 1   SHARED by every sprite -- the orbs and the angel use it as shadow
//   10  $d027+n    per-sprite: THE ONE FREE COLOUR. Grey 2 today; yellow for a gold idol.
//   11  $d026      grey 3   SHARED -- highlight and ground shadow
// So a gold ram is yellow where the body is, with grey 1 and grey 3 doing the shading. Both
// variants are rendered below so the difference can be judged rather than argued about.
//
// Multicolor pixels are TWICE AS WIDE as they are tall, so every preview here is drawn 2:1.
// A sprite judged on a square grid looks nothing like the one that reaches the screen.
import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
import { png } from './png.mjs';

const LU = [null, 68, 108, 149];              // luminance of pixel values 1..3, as fit-orb has it
const LEVELS = [1, 2, 3];
// Colodore, the modern reference palette. Only three of these are reachable in one sprite.
export const RGB = { 0: [0, 0, 0], 7: [237, 241, 113], 8: [142, 80, 41], 9: [85, 56, 0],
              11: [74, 74, 74], 12: [123, 123, 123], 15: [178, 178, 178] };
export const GREY = { 1: 11, 2: 12, 3: 15 };         // the palette the orbs and the angel already use
export const GOLD = { 1: 11, 2: 7, 3: 15 };          // ...with the one free slot spent on yellow
// NOT REACHABLE ON ONE SPRITE, and drawn anyway because it answers "what would gold look like".
// Pairs 01 and 11 are $d025/$d026, SHARED by all eight sprites, so brown and yellow here would
// repaint the orbs and the angel too -- it is a whole-game palette decision, not an entity one.
// It is also the better RAMP: brown/orange/yellow is monotonic in luminance (58, 94, 225), where
// GOLD above puts its brightest colour on the MIDDLE level and has to shade with two greys.
export const GOLD3 = { 1: 9, 2: 8, 3: 7 };           // brown shadow, orange body, yellow highlight
// ORANGE body, and this is the one that is both free AND graphically correct. Yellow in the
// middle slot is BRIGHTER than grey 3 (225 against 178), so what is drawn as a highlight reads
// darker than the thing it is highlighting and the shading runs backwards -- which is why the
// yellow versions all looked flat and noisy however the tones were cut. Orange is 94: darker
// than grey 3, lighter than grey 1, so shadow-body-highlight finally ascends.
export const ORANGE = { 1: 11, 2: 8, 3: 15 };

// Decode to RGBA with the dark surround keyed out. `thresh` is a luminance percentage: below it
// is background. `crop` is for a source that has things in it other than the subject.
// `core` is a morphological OPEN radius. It answers "which of this is the SUBJECT", and it
// answers it structurally rather than by brightness: the ram is a thick solid mass and the star
// and circle behind it are thin strokes, so an opening wide enough to swallow a stroke keeps the
// ram and deletes the frame. Luminance cannot do this -- the frame is the same gold as the ram,
// and the ram has dark engraved surfaces of its own, so every threshold either eats the ram's
// shadows or keeps the star. Close first: the engraving breaks the ram into fragments otherwise,
// and an opening then removes the fragments too.
export function load(file, thresh, crop, core = 0) {
  const args = [file];
  if (crop) args.push('-crop', crop, '+repage');
  args.push('(', '+clone', '-colorspace', 'gray', '-threshold', `${thresh}%`, ')',
            '-alpha', 'off', '-compose', 'copy_opacity', '-composite');
  const [w, h] = execFileSync('magick', [...args, '-format', '%w %h', 'info:']).toString().split(' ').map(Number);
  const raw = execFileSync('magick', [...args, '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 28 });
  let coreMask = null;
  if (core) {
    const m = execFileSync('magick', [...args, '-colorspace', 'gray', '-threshold', `${thresh}%`,
      '-morphology', 'Close', 'Disk:10', '-morphology', 'Open', `Disk:${core}`,
      '-depth', '8', 'gray:-'], { maxBuffer: 1 << 28 });
    coreMask = new Uint8Array(m.length);
    for (let i = 0; i < m.length; i++) coreMask[i] = m[i] > 127 ? 1 : 0;
  }
  const lum = new Uint8Array(w * h), alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b, a] = [raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2], raw[i * 4 + 3]];
    lum[i] = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
    alpha[i] = a > 127 ? 1 : 0;
  }
  // Content box, so the subject fills the sprite rather than floating in whatever margin the
  // render happened to have.
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { w, h, lum, alpha, core: coreMask, x0, y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1 };
}

// KEEP THE ASPECT. fitArt stretches the content box to fill the frame, which is right for the
// orb -- ball, gap and ground shadow are one composition that should fill its footprint. A ram
// is a THING, and stretching it to a 12x42 frame turns a standing animal into a smear. The
// sprite's screen aspect is 2W:H, because multicolor pixels are double width.
// TONE MAPPING, which turned out to matter more than the hue. Spreading the figure's range
// evenly over three levels and dithering gives a speckle of all three everywhere -- it reads as
// noise, not as metal. What reads as GOLD is a wide body of the one colour, with the greys kept
// for true shadow and true highlight only. So: posterise at two cut points instead, and do not
// dither, because dithering a wide flat band is precisely what puts the noise back.
// shadow/hilite are fractions of the figure's OWN normalised range, not absolute luminance.
// cover 0.22, not the orb's 0.5: a half-covered destination pixel at the edge of a HORN is the
// horn, and demanding half the footprint be ink thins every limb until the idol reads as a stick
// figure. Swept from 0.2 to 0.5 and the silhouette fills out monotonically as it drops.
export function fit(src, W, H, { cover = 0.22, contrast = 1.0, keepAspect = true,
                          shadow = 0.10, hilite = 0.82, dither = false, pct = 0.06 } = {}) {
  const { w, lum, alpha, x0: bx, y0: by, bw: bbw, bh: bbh } = src;
  let x0 = bx, y0 = by, bw = bbw, bh = bbh;
  if (keepAspect) {
    const want = (2 * W) / H;                 // frame aspect, in source pixels
    if (bw / bh > want) { const nh = bw / want; y0 -= (nh - bh) / 2; bh = nh; }   // letterbox
    else               { const nw = bh * want; x0 -= (nw - bw) / 2; bw = nw; }    // pillarbox
  }
  const tone = new Float64Array(W * H).fill(-1);
  let lo = 255, hi = 0;
  for (let dy = 0; dy < H; dy++) for (let dx = 0; dx < W; dx++) {
    const sx0 = Math.round(x0 + bw * dx / W), sx1 = Math.max(Math.round(x0 + bw * (dx + 1) / W), sx0 + 1);
    const sy0 = Math.round(y0 + bh * dy / H), sy1 = Math.max(Math.round(y0 + bh * (dy + 1) / H), sy0 + 1);
    let sum = 0, ink = 0, n = 0;
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      n++;
      if (x < 0 || y < 0 || x >= src.w || y >= src.h) continue;   // outside: letterbox margin
      if (alpha[y * w + x]) { sum += lum[y * w + x]; ink++; }
    }
    if (ink / n < cover) continue;            // mostly background: this pixel stays transparent
    tone[dy * W + dx] = sum / ink;
  }
  // PERCENTILES, not min and max. These renders have a handful of specular pixels far brighter
  // than anything else on the figure; normalising to the true maximum lets those few compress
  // the whole body down below the shadow cut, which came out as a dark sprite with gold confetti
  // on it. Clipping the top and bottom few per cent puts the BODY in the middle where it belongs.
  const vals = [...tone].filter(v => v >= 0).sort((a, b) => a - b);
  if (vals.length) { lo = vals[Math.floor(vals.length * pct)]; hi = vals[Math.min(vals.length - 1, Math.ceil(vals.length * (1 - pct)))]; }
  // The figure's OWN range across the three levels. Absolute luminance would put a dark bronze
  // render entirely on grey 1 and throw away two thirds of the palette -- fitArt's note applies
  // here unchanged.
  const want = new Float64Array(W * H).fill(-1), norm = new Float64Array(W * H).fill(-1);
  for (let i = 0; i < W * H; i++) {
    if (tone[i] < 0) continue;
    let t = (tone[i] - lo) / Math.max(1, hi - lo);
    t = Math.min(1, Math.max(0, 0.5 + (t - 0.5) * contrast));
    norm[i] = t;
    want[i] = LU[1] + t * (LU[3] - LU[1]);
  }
  const px = new Uint8Array(W * H), buf = Float64Array.from(want);
  if (!dither) {                              // two cuts, a wide body, no speckle
    for (let i = 0; i < W * H; i++) {
      if (norm[i] < 0) continue;
      px[i] = norm[i] < shadow ? 1 : norm[i] > hilite ? 3 : 2;
    }
    return px;
  }
  for (let y = 0; y < H; y++) {
    const rev = (y & 1) === 1;                // serpentine: a one-way scan combs residue into one edge
    for (let k = 0; k < W; k++) {
      const x = rev ? W - 1 - k : k, i = y * W + x;
      if (want[i] < 0) continue;
      let best = LEVELS[0], bd = Infinity;
      for (const v of LEVELS) { const d = Math.abs(buf[i] - LU[v]); if (d < bd) { bd = d; best = v; } }
      px[i] = best;
      const e = buf[i] - LU[best], d = rev ? -1 : 1;
      const put = (xx, yy, f) => {
        if (xx < 0 || xx >= W || yy < 0 || yy >= H || want[yy * W + xx] < 0) return;
        buf[yy * W + xx] += e * f;
      };
      put(x + d, y, 7 / 16); put(x - d, y + 1, 3 / 16); put(x, y + 1, 5 / 16); put(x + d, y + 1, 1 / 16);
    }
  }
  return px;
}

// ---- fitTwo: TWO REGIONS, each with its own rule ----
// One tonal ramp cannot express this composition. The star and circle are the same gold as the
// ram, so any global mapping either renders both in yellow (and the ram vanishes into its own
// halo) or renders both dark. What the picture actually wants is SEMANTIC: the frame is
// structure, so it goes dark with the odd gold glint; the ram is the subject, so it goes gold
// with the odd pale highlight. Two regions, two mappings, one sprite.
//
// The segmentation is a luminance split at SOURCE resolution, which works because the renders
// light the ram much more brightly than the bronze frame behind it. Splitting after the
// downsample would not: by then a horn and the star limb behind it share a pixel.
// coverFrame is far lower than cover, and has to be: the star and circle are THIN. A stroke
// crossing a destination pixel covers a fraction of it, so at the ram's threshold every one of
// them is discarded as background and the idol floats in space with no frame at all. The subject
// wants a high bar so its edges stay solid; the frame wants a low one so it exists.
export function fitTwo(src, W, H, { cover = 0.22, coverFrame = 0.10, keepAspect = true, ramWins = 0.35,
                                    ramHi = 0.86, frameHi = 0.88, pct = 0.06 } = {}) {
  const { w, lum, alpha, core, x0: bx, y0: by, bw: bbw, bh: bbh } = src;
  if (!core) throw new Error('fitTwo needs a core mask: load(file, thresh, crop, openRadius)');
  let x0 = bx, y0 = by, bw = bbw, bh = bbh;
  if (keepAspect) {
    const want = (2 * W) / H;
    if (bw / bh > want) { const nh = bw / want; y0 -= (nh - bh) / 2; bh = nh; }
    else               { const nw = bh * want; x0 -= (nw - bw) / 2; bw = nw; }
  }
  const cls = new Int8Array(W * H).fill(-1);  // 0 = frame, 1 = ram
  const tone = new Float64Array(W * H).fill(-1);
  for (let dy = 0; dy < H; dy++) for (let dx = 0; dx < W; dx++) {
    const sx0 = Math.round(x0 + bw * dx / W), sx1 = Math.max(Math.round(x0 + bw * (dx + 1) / W), sx0 + 1);
    const sy0 = Math.round(y0 + bh * dy / H), sy1 = Math.max(Math.round(y0 + bh * (dy + 1) / H), sy0 + 1);
    let n = 0, ink = 0, rn = 0, rs = 0, fn = 0, fs = 0;
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      n++;
      if (x < 0 || y < 0 || x >= w || y >= src.h || !alpha[y * w + x]) continue;
      ink++;
      const v = lum[y * w + x];
      if (core[y * w + x]) { rn++; rs += v; } else { fn++; fs += v; }
    }
    if (!n || !ink) continue;
    const ramPx = rn / ink > ramWins;
    if (ink / n < (ramPx ? cover : coverFrame)) continue;
    // ramWins is deliberately well under half: a horn crossing a star limb shares its pixel with
    // the frame, and the SUBJECT should win that pixel. At 0.5 the horns dissolve into the star
    // exactly where the two overlap, which is most of their length.
    const i = dy * W + dx;
    if (ramPx) { cls[i] = 1; tone[i] = rs / rn; } else { cls[i] = 0; tone[i] = fs / fn; }
  }
  // Normalise WITHIN each region, so the frame's own brightest bits become its glints rather
  // than being measured against a ram that is brighter than all of them.
  const px = new Uint8Array(W * H);
  for (const region of [0, 1]) {
    const idx = [...cls.keys()].filter(i => cls[i] === region);
    if (!idx.length) continue;
    const vals = idx.map(i => tone[i]).sort((a, b) => a - b);
    const lo = vals[Math.floor(vals.length * pct)];
    const hi = vals[Math.min(vals.length - 1, Math.ceil(vals.length * (1 - pct)))];
    const cut = region ? ramHi : frameHi;
    for (const i of idx) {
      const t = (tone[i] - lo) / Math.max(1, hi - lo);
      // ram:   body is the free colour, its brightest few go pale grey
      // frame: body is grey 1, its brightest few go gold
      px[i] = region ? (t > cut ? 3 : 2) : (t > cut ? 2 : 1);
    }
  }
  return px;
}

// ---- sigil: the frame DRAWN, the ram set inside it ----
// The circle cannot survive a downsample. At twelve pixels wide its stroke is under half a
// pixel, so every sampler either drops it or smears it into the horns -- which is what all of
// them did. So it is drawn: an ellipse and a five-pointed star plotted straight into the grid.
//
// The colour rule is SEMANTIC, exactly as asked. The frame is structure, so it is grey 1 with a
// couple of gold glints where the star crosses itself; the ram is the subject, so it is the free
// colour with a couple of pale highlights on brow and muzzle. Nothing here is a tone mapping --
// at this size "which THING is this pixel" beats "how bright was it".
//
// The ellipse is 12 wide and 24 tall because a sprite pixel is TWICE AS WIDE as it is tall: 12
// across and 24 down is a circle on screen, and 12 x 12 would be a letterbox.
function line(px, W, H, x0, y0, x1, y1, v) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = v;
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
export function sigil(W, H, ram, { cx = 5.5, cy = 12.5, rx = 5.5, ry = 12.0, ramTop = 4 } = {}) {
  const px = new Uint8Array(W * H);
  // the circle
  for (let a = 0; a < 720; a++) {
    const t = a * Math.PI / 360;
    const x = Math.round(cx + rx * Math.cos(t)), y = Math.round(cy + ry * Math.sin(t));
    if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = 1;
  }
  // the star, POINT DOWN, each vertex joined to the one two along -- which is what makes the
  // pentagram rather than a pentagon.
  const vx = [], vy = [];
  for (let k = 0; k < 5; k++) {
    const t = (90 + k * 72) * Math.PI / 180;
    vx.push(Math.round(cx + rx * Math.cos(t)));
    vy.push(Math.round(cy + ry * Math.sin(t)));
  }
  for (let k = 0; k < 5; k++) line(px, W, H, vx[k], vy[k], vx[(k + 2) % 5], vy[(k + 2) % 5], 1);
  // two gold glints on the frame, at the upper star crossings, so the frame reads as the same
  // metal as the ram and not as a separate grey object behind it
  for (const [gx, gy] of [[1, 6], [10, 6]]) if (px[gy * W + gx]) px[gy * W + gx] = 2;
  // A KEYLINE OF TRANSPARENCY around the ram, punched through the frame BEFORE the ram is laid
  // down. Without it the star lines show through the gaps between horn and face -- grey against
  // gold, which the eye reads as more of the same mass rather than as a gap, and the ram
  // dissolves into a blob inside a circle. That one step is the difference between "a shape in a
  // ring" and "a ram in a pentacle". It is the sprite equivalent of a cartoonist's white gap.
  const ink = new Uint8Array(W * H);
  ram.forEach((row, y) => {
    const Y = y + ramTop;
    if (Y >= H) return;
    row.padEnd(W, '.').split('').forEach((c, x) => { if (c !== '.') ink[Y * W + x] = +c; });
  });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (ink[y * W + x]) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && X < W && Y >= 0 && Y < H && ink[Y * W + X]) { near = true; break; }
    }
    if (near) px[y * W + x] = 0;
  }
  for (let i = 0; i < W * H; i++) if (ink[i]) px[i] = ink[i];
  return px;
}

// Draw one or more fitted sprites side by side, 2:1 pixels, on the game's black.
export function sheet(items, zoom, gap = 4) {
  const H = Math.max(...items.map(i => i.H));
  const W = items.reduce((n, i) => n + i.W * 2 + gap, gap);
  const rgb = new Uint8Array(W * zoom * H * zoom * 3);
  let ox = gap;
  for (const { px, W: w, H: h, pal } of items) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = RGB[px[y * w + x] ? pal[px[y * w + x]] : 0];
      for (let sy = 0; sy < zoom; sy++) for (let sx = 0; sx < zoom * 2; sx++) {
        const X = (ox + x * 2) * zoom + sx, Y = y * zoom + sy;
        const o = (Y * W * zoom + X) * 3;
        rgb[o] = c[0]; rgb[o + 1] = c[1]; rgb[o + 2] = c[2];
      }
    }
    ox += w * 2 + gap;
  }
  return { rgb, W: W * zoom, H: H * zoom };
}

// ---- DRAWN, not sampled ----
// A downsample keeps whatever the render had; at twelve pixels wide what survives is the
// silhouette and nothing else, and a ram reads almost entirely from the CURL of its horns --
// the one feature a box filter turns to mush. So these are drawn against the grid instead: the
// horn is a deliberate C, the eyes are single grey-1 pixels, and the tones are placed rather
// than dithered. '.' is transparent, 1 and 3 the shared greys, 2 the one free colour.
// Remember the 2:1 pixel: these look far too wide here and correct on screen.
const DRAWN = {
  // THE HORN IS THE WHOLE READ. Squared-off horns on top of the head look like HANDLES, and a
  // face drawn the full twelve wide is a squat blob with a bar across it -- both were tried. What
  // says "ram" is a narrow face with the horn sweeping OUT at the temple, down the outside, and
  // back IN by the jaw, so the pair rings the face. The eyes are single grey-1 pixels with body
  // between them; put them adjacent and they merge into one dark bar at this size.
  // 12x21 -- a head, for an orb-sized pickup.
  head: [
    '....3223....', '..33222233..', '.32.2222.23.', '32..2222..23', '32..1221..23',
    '32..2222..23', '32..3223..23', '32...22...23', '32...22...23', '.3...22...3.',
    '.32..22..23.', '..32.22.23..', '..32222223..', '...322223...', '....2222....',
    '....3223....', '.....11.....', '.....33.....', '............', '............',
    '............',
  ],
  // 12x42 -- the same head on a plinth, for a tall entity the way the angel is tall.
  idol: [
    '............', '....3223....', '..33222233..', '.32.2222.23.', '32..2222..23',
    '32..1221..23', '32..2222..23', '32..3223..23', '32...22...23', '32...22...23',
    '.3...22...3.', '.32..22..23.', '..32.22.23..', '..32222223..', '...322223...',
    '....2222....', '....3223....', '.....11.....', '.....33.....', '....3223....',
    '....2222....', '...322223...', '..32222223..', '..22222222..', '..23222232..',
    '..22222222..', '..32222223..', '...222222...', '....3223....', '............',
    '..33333333..', '..32222223..', '..22222222..', '..21222122..', '..22222222..',
    '.3222222223.', '.2222222222.', '.2232332322.', '.2222222222.', '323222222223',
    '333333333333', '............',
  ],
};
// The ram that sits inside the sigil. Narrower than the standalone ones -- it has to leave the
// circle and the star room to exist around it -- and the horns bulge OUT before curling back IN,
// because at eight pixels across that curve is the only thing that says ram rather than skull.
// THE HORNS CURL DOWN, which is the whole point of drawing this rather than sampling it. They
// sweep out at the crown, run down the OUTSIDE of the face, and hook back in level with the jaw.
// The grey-1 pips along the inner edge are ridge grooves: a plain orange band reads as a bar,
// and the grooves are what make it read as something wound.
// The face narrows from brow to muzzle -- held at a constant width it reads as a T.
export const CURLED = [
  '...32223....', '..2212122...', '.22.2222.22.', '21..2112..12', '22..2222..22',
  '21..3223..12', '22..2222..22', '21...22...12', '22...22...22', '.1...22...1.',
  '.22..22..22.', '..21.22.12..', '..22.22.22..', '...2.22.2...', '....3223....',
  '....2222....', '.....11.....', '.....33.....',
  '....2222....', '...322223...', '..32222223..', '..22222222..', '..23222232..',
  '..22222222..', '...222222...', '....3223....',
  '.....11.....', '.....11.....', '.....11.....', '....1111....',
  '..11111111..', '..12222221..', '.1111111111.', '.1211211211.', '.1111111111.',
  '111111111111', '.1111111111.',
];

export const SIGIL_RAM = [
  '..2......2..', '..2.3223.2..', '.2..2222..2.', '.2..2112..2.', '.2..2222..2.',
  '..2.2222.2..', '..22.22.22..', '...2.22.2...', '....3223....', '.....22.....',
  '.....11.....',
];

// Pad every row to W, and fail on a row that is too long: a typo in the art above should be an
// error here, not a sprite with a bite out of it.
function drawn(rows, W, H) {
  const px = new Uint8Array(W * H);
  if (rows.length > H) throw new Error(`drawn art is ${rows.length} rows, frame is ${H}`);
  rows.forEach((r, y) => {
    if (r.length > W) throw new Error(`drawn row ${y} is ${r.length} wide, frame is ${W}: "${r}"`);
    const line = r.padEnd(W, '.');
    for (let x = 0; x < W; x++) px[y * W + x] = line[x] === '.' ? 0 : +line[x];
  });
  return px;
}

// ---- GameMaker .SPR export ----
// Layout taken from gmSprite.js's serialize(), NOT from the format comment at the top of that
// file, which is stale: it puts the colours at 13/14/15 where the parser reads 12/13/28, and it
// does not mention byte 11's constant, the subheader's 0x2D marker, or that the final frame is
// written as 63 bytes rather than 64. Cross-checked against decodeHeader, which is the reader.
//
// The pixel values need no translation. GM stores the VIC's own bit pairs, and so do we:
//   00 transparent   01 GM "Color 2" (shared)   10 GM "Color 1" (unique)   11 GM "Color 3"
// which is exactly 0/1/2/3 here, because both are just naming $d025, $d027+n and $d026.
//
// A 12x42 sprite is TWO C64 sprites stacked, so it ships as a quad of two: the main one and a
// subsprite at a y offset of 21. The angel is built the same way.
const gmName = (t, n) => [...t.padEnd(n, ' ')].slice(0, n).map(c => {
  const u = c.toUpperCase().charCodeAt(0);
  return u >= 65 && u <= 90 ? u - 64 : c >= '0' && c <= '9' ? c.charCodeAt(0) : 0x20;
});
// `pair` maps a fitted LEVEL (1 shadow, 2 mid, 3 highlight) onto a VIC bit pair, and it has to
// exist because the pairs are bound to registers, not to brightness: 01 is always $d025, 11 is
// always $d026 and 10 is always the per-sprite colour. So "put grey 3 in the midtone and yellow
// in the highlight" is not a palette change -- grey 3 only exists at pair 11, so the midtone
// PIXELS have to be written as 11 and the highlights as 10. Default is the identity.
export function gmSpr(px, W, H, { name = 'ram', c1 = 8, c2 = 11, c3 = 15, bg = 0,
                                  xFat = 80, y = 60, pair = { 1: 1, 2: 2, 3: 3 } } = {}) {
  if (W !== 12) throw new Error(`a C64 sprite is 12 multicolor pixels wide, not ${W}`);
  const quads = Math.ceil(H / 21);
  if (quads > 4) throw new Error(`${H} rows is ${quads} sprites; GM allows at most 4`);
  const frame = q => {                        // 21 rows x 3 bytes, 4 pixels to the byte
    const b = [];
    for (let r = 0; r < 21; r++) for (let byte = 0; byte < 3; byte++) {
      const y0 = q * 21 + r;
      b.push([0, 1, 2, 3].reduce((v, k) => {
        const lvl = y0 < H ? px[y0 * W + byte * 4 + k] : 0;
        return v | ((lvl ? pair[lvl] : 0) << (6 - 2 * k));
      }, 0));
    }
    return b;                                 // 63; the 64th padding byte is added by the writer
  };
  const xPos = xFat * 2 + 24;                 // GM stores the RIGHT edge, in hi-res coords
  const out = [];
  const put = (i, v) => { out[i] = v; };
  for (const [i, v] of [[0, 0x1d], [1, 0x60], [2, 0x47], [3, 0x45], [4, 0x4b]]) put(i, v);
  gmName(name, 6).forEach((v, i) => put(5 + i, v));
  put(11, 0x01);                              // constant in every original file
  put(12, c2); put(13, c3); put(14, 0x01);    // shared colours, multicolor on
  put(15, 0); put(16, 0); put(17, 0);         // one frame, no doubling
  put(18, bg); put(19, quads - 1);
  const qSize = 32 + 64;                      // one frame per quad
  put(20, qSize & 255); put(21, qSize >> 8); put(22, 0); put(23, 0);
  put(24, xPos & 255); put(25, y + 50); put(26, xPos > 255 ? 0x10 : 0);
  put(27, 0); put(28, c1);
  for (let i = 29; i < 37; i++) put(i, 0);
  let o = 37, written = 0;
  const writeFrame = q => {
    const f = frame(q), last = ++written === quads;
    for (let i = 0; i < (last ? 63 : 64); i++) out[o++] = f[i] ?? 0;
  };
  writeFrame(0);
  for (let q = 1; q < quads; q++) {
    const start = o;
    out[o++] = 0x2d;                          // subheader marker
    gmName(name, 5).forEach(v => { out[o++] = v; });
    out[o++] = 0x01;
    out[o++] = c2; out[o++] = c3; out[o++] = 0x01;
    out[o++] = 0; out[o++] = 0; out[o++] = 0;
    out[o++] = bg; out[o++] = quads - 1;
    out[o++] = qSize & 255; out[o++] = qSize >> 8;
    out[o++] = 0;                             // x offset, in FAT pixels
    out[o++] = 21 * q;                        // ...and y, which is what stacks them
    out[o++] = xPos & 255; out[o++] = (y + 50 + 21 * q) & 255;
    out[o++] = 0; out[o++] = q; out[o++] = c1;
    while (o < start + 32) out[o++] = 0;
    writeFrame(q);
  }
  return Buffer.from(out);
}

// thresh/crop chosen per source: ram1 is a lit statue in a dark TEMPLE with braziers either
// side, so it is cropped past the flames first; ram3 and ram4 are already on flat black.
const SRC = [
  { name: 'ram1', file: 'art/ram1.png', thresh: 17, crop: '880x1010+190+20' },
  { name: 'ram5', file: 'art/ram5.png', thresh: 12 },   // the same composition, cut out on black
  { name: 'ram3', file: 'art/ram3.png', thresh: 14 },
  { name: 'ram4', file: 'art/ref/ram4.png', thresh: 14 },
];
const SIZES = [[12, 42, 'tall'], [12, 21, 'small']];
const out = [];
for (const s of SRC) {
  const src = load(s.file, s.thresh, s.crop);
  for (const [W, H, tag] of SIZES) {
    const px = fit(src, W, H, s.fit);
    const ink = px.reduce((n, v) => n + (v ? 1 : 0), 0);
    for (const [pname, pal] of [['grey', GREY], ['orange', ORANGE]]) {
      const one = sheet([{ px, W, H, pal }], 8, 0);
      const f = `ram-sprite-${s.name}-${tag}-${pname}.png`;
      writeFileSync(f, png(one.W, one.H, one.rgb));
      out.push(f);
    }
    console.log(`  ${s.name} ${tag} ${W}x${H}: ${ink}/${W * H} pixels inked ` +
                `(source box ${src.bw}x${src.bh}, threshold ${s.thresh}%)`);
  }
}
// One contact sheet so the six can be compared at a glance rather than opened one at a time.
const all = [];
for (const s of SRC) {
  const src = load(s.file, s.thresh, s.crop);
  for (const [W, H] of SIZES) {
    const px = fit(src, W, H, s.fit);
    all.push({ px, W, H, pal: GREY }, { px, W, H, pal: ORANGE });
  }
}
// ...and the drawn pair alongside them, so the two approaches can be compared directly.
for (const [name, rows, W, H] of [['head', DRAWN.head, 12, 21], ['idol', DRAWN.idol, 12, 42],
                                  ['curled', CURLED, 12, 42]]) {
  const px = drawn(rows, W, H);
  for (const [pname, pal] of [['grey', GREY], ['orange', ORANGE]]) {
    const one = sheet([{ px, W, H, pal }], 8, 0);
    const f = `ram-sprite-drawn-${name}-${pname}.png`;
    writeFileSync(f, png(one.W, one.H, one.rgb));
    out.push(f);
  }
  all.push({ px, W, H, pal: GREY }, { px, W, H, pal: ORANGE });
  console.log(`  drawn ${name} ${W}x${H}: ${px.reduce((n, v) => n + (v ? 1 : 0), 0)}/${W * H} inked`);
}
// ...the drawn sigil: frame in grey with two gold glints, ram in gold with pale highlights.
{
  const px = sigil(12, 42, SIGIL_RAM, { ry: 12, cy: 13, ramTop: 8 });
  // ...standing on the plinth, so a 42-row entity is not half empty. Grey, like the frame: the
  // gold is reserved for the ram, which is what the eye should land on first.
  // A stem joins the ring to the plinth. Without it the two float apart and read as two objects,
  // which at sprite size is worse than either alone.
  ['.....11.....', '.....11.....', '.....11.....', '.....11.....', '....1111....',
   '...111111...', '..11111111..', '..12222221..', '.1111111111.', '.1211211211.',
   '.1111111111.', '111111111111', '.1111111111.'].forEach((row, y) =>
    row.split('').forEach((c, x) => { if (c !== '.') px[(y + 27) * 12 + x] = +c; }));
  for (const [pname, pal] of [['grey', GREY], ['orange', ORANGE]]) {
    const one = sheet([{ px, W: 12, H: 42, pal }], 8, 0);
    const f = `ram-sprite-sigil-${pname}.png`;
    writeFileSync(f, png(one.W, one.H, one.rgb));
    out.push(f);
  }
  all.push({ px, W: 12, H: 42, pal: GREY }, { px, W: 12, H: 42, pal: ORANGE });
  console.log(`  drawn sigil 12x42: ${px.reduce((n, v) => n + (v ? 1 : 0), 0)}/504 inked`);
}
const cs = sheet(all, 6);
writeFileSync('ram-sprites-all.png', png(cs.W, cs.H, cs.rgb));
// ...and the same eight in the three-colour gold ramp.
const g3 = sheet(all.filter((_, i) => i % 2 === 0).map(o => ({ ...o, pal: GOLD3 })), 6);
writeFileSync('ram-sprites-all-gold3.png', png(g3.W, g3.H, g3.rgb));
console.log(`\n  ${out.length} sprites + ram-sprites-all.png (grey/orange pairs, left to right: ` +
            SRC.map(s => `${s.name} tall, ${s.name} small`).join(', ') + ', drawn head, drawn idol, curled, sigil)');
