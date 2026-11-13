// ---- THE BALL LIGHTNING: the big angel's projectile, one sprite at every rung ----
// The user, 2026-11-10: "some kind of glowing ball lightning ... yellow, cyan, and transparent (where
// black)", from art/ball-lightning.png; "for bonus points, have it rotate a bit each ladder step".
//
// Inks: a pixel is TRANSPARENT unless enough of its footprint is bright (the art is drawn on black),
// then CYAN or YELLOW by the hue of its bright part. Cyan is ink 2, the sprite's own colour ($d027+n);
// yellow is ink 3, $d026 -- which on level 10 (gold) already IS yellow. Ink 1 ($d025, level 10's
// brown) is never used.
// Rotation: rung k is cut from the art turned ROTSTEP*k degrees about the ball's centre, so as it
// flies at you and the ladder steps up, the ball turns -- a few degrees a step, not a spin.
//
//   node src/fit-bolt.mjs out.png      -- preview the whole ladder at screen size (with the x2 rungs)
import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
import { artPath } from './fit-orb.mjs';

const FILE = process.env.BOLTART ?? 'ball-lightning.png';
// NTSC: a hires pixel is ~0.75 as wide as it is tall, an mc sprite pixel two of them (as fit-silver)
const MC_ASPECT = 2 * +(process.env.BOLTASPECT ?? 0.75);
// Only the FILAMENTS are lit: the ball's body between them is a dim glow, and lighting that too made
// one flat yellow disc. A lit source pixel is cyan when it is bluer than red by CYANDIFF; a sprite
// pixel is inked when COVER of its footprint is lit, and cyan when CYANF of its lit part is.
const BRIGHT = +(process.env.BOLTBRIGHT ?? 230);   // 230/0.45 (was 170/0.25, then 220/0.35): lacy, see-through between filaments
const COVER = +(process.env.BOLTCOVER ?? 0.45);
// MOSTLY CYAN (the user, 2026-11-10: "mostly cyan & transparent with only a few details of yellow"):
// a lit pixel is cyan unless its lit part is strongly YELLOW -- YELF of it red-over-blue by YELDIFF.
const YELDIFF = +(process.env.BOLTYELDIFF ?? 140);
const YELF = +(process.env.BOLTYELF ?? 0.8);
const CROP = +(process.env.BOLTCROP ?? 0.92);       // of the art's box: the ball and most of its bolts
// THE BOLTS SURVIVE (the user, 2026-11-10: "see if you can make the bolts survive the downsample"): a
// bolt is a line a few source pixels wide crossing a footprint ~90 wide, so it never covers COVER of
// one. Outside the ball (BALLR of the square, from its centre) a pixel is inked by BOLTCOV of lit
// footprint instead -- any bolt crossing it -- and the bolt's own hue decides its ink.
const BALLR = +(process.env.BOLTBALLR ?? 0.37);
const BOLTCOV = +(process.env.BOLTCOV ?? 0.03);
export const ROTSTEP = +(process.env.BOLTROT ?? 22.5);
// rungs in rows, largest first: 12 sprite pixels wide is 18 rows round at NTSC
// THE game's list (build-iray.mjs reads it): the smallest went -- "they don't look smaller, they just look
// less round" (the user, 2026-11-10)
export const BOLT_H = (process.env.BOLTH ?? '18,14,11,9,7').split(',').map(Number);
// HIRES=1: a single-colour hi-res sprite instead -- 24 pixels across, one ink (the sprite's own colour)
export const HIRES = process.env.BOLTHIRES !== '0';   // DEFAULT since the user preferred it in play (2026-11-10); 0 = multicolour

let src = null;                                    // the ball's square, cut once
const load = () => {
  if (src) return src;
  const f = artPath(FILE);
  // the ball's own box (black around it), squared about its centre
  const [w, h, x, y] = execFileSync('magick', [f, '-fuzz', '8%', '-trim', '-format', '%w %h %X %Y', 'info:'])
    .toString().split(' ').map(s => parseInt(s, 10));
  // CROP: the ball is only ~70% of that box -- the bolts round it pad the rest, and at 12 pixels they
  // are too thin to survive -- so cut tighter (the user: "you're not using the full 12 pixel width")
  const S = Math.round(Math.max(w, h) * CROP), cx = x + w / 2, cy = y + h / 2;
  src = { f, S, cx, cy };
  return src;
};
const rotated = deg => {
  const { f, S, cx, cy } = load();
  const raw = execFileSync('magick', [f, '-background', 'black', '-virtual-pixel', 'black',
    '-distort', 'SRT', `${cx},${cy} 1 ${deg}`, '-crop', `${S}x${S}+${Math.round(cx - S / 2)}+${Math.round(cy - S / 2)}`,
    '+repage', '-depth', '8', 'rgb:-'], { maxBuffer: 1 << 28 });
  return { raw, S };
};

// -> { w, h, px[w*h] of 0 (clear) / 2 (cyan) / 3 (yellow), bytes[64] }
export function fitBolt(h, deg, hires = HIRES) {
  const W = hires ? 24 : 12, w = Math.min(W, Math.max(1, Math.round(h / (hires ? MC_ASPECT / 2 : MC_ASPECT))));
  const { raw, S } = rotated(deg);
  const px = new Array(w * h).fill(0);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const x0 = Math.floor(S * dx / w), x1 = Math.ceil(S * (dx + 1) / w);
    const y0 = Math.floor(S * dy / h), y1 = Math.ceil(S * (dy + 1) / h);
    let n = 0, lit = 0, ye = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * S + x) * 3; n++;
      if (Math.max(raw[i], raw[i + 1], raw[i + 2]) > BRIGHT) { lit++; if (raw[i] - raw[i + 2] > YELDIFF) ye++; }
    }
    const ddx = (dx + 0.5) / w - 0.5, ddy = (dy + 0.5) / h - 0.5;
    const outside = Math.hypot(ddx, ddy) > BALLR;
    if (lit / n < (outside ? BOLTCOV : COVER)) continue;
    px[dy * w + dx] = hires ? 1 : ye / lit >= YELF ? 3 : 2;
  }
  // into a 12x21 sprite, centred across and down (the ball floats: there is no floor to stand on)
  const ox = (W - w) >> 1, oy = (21 - h) >> 1, grid = [...Array(21)].map(() => new Array(W).fill(0));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) grid[oy + y][ox + x] = px[y * w + x];
  const bytes = [];
  for (let y = 0; y < 21; y++) for (let k = 0; k < 3; k++)
    bytes.push(hires ? [...Array(8)].reduce((v, _, i) => v | (grid[y][k * 8 + i] << (7 - i)), 0)
                     : [0, 1, 2, 3].reduce((v, i) => v | (grid[y][k * 4 + i] << (6 - 2 * i)), 0));
  bytes.push(0);
  return { w, h, px, grid, bytes, hires };
}

export const boltLadder = () => BOLT_H.map((h, k) => ({ ...fitBolt(h, ROTSTEP * k), rot: ROTSTEP * k }));

// ---- preview: every rung at its on-screen size, then the biggest few magnified (x2), on level 10's
// floor grey; a hires pixel is 2x2 here, so a plain mc pixel is 4x2 and a magnified one 8x4 ----
if (process.argv[1]?.endsWith('fit-bolt.mjs')) {
  const out = process.argv[2] ?? 'bolt.png';
  const L = boltLadder(), MAG = +(process.env.BOLTMAG ?? 4);
  const shown = [...L.slice(0, MAG).map(r => ({ r, m: 2 })), ...L.map(r => ({ r, m: 1 }))];
  const BODY = { cyan: [0x70, 0xa4, 0xb2], ltblue: [0x6c, 0x5e, 0xb5] };   // VICE colodore-ish
  const COL = { 0: null, 2: BODY[process.env.BOLTPREV ?? 'cyan'], 3: [0xbf, 0xce, 0x72] };   // body, yellow
  const ZX = 3, ZY = 4, PAD = 12, cellW = q => 12 * 2 * q.m * ZX, H = 21 * 2 * ZY + 2 * PAD;   // a hires pixel 3x4: NTSC's 0.75
  const W = shown.reduce((t, q) => t + cellW(q) + PAD, PAD);
  const buf = Buffer.alloc(W * H * 3, 0x44);
  let gx = PAD;
  for (const q of shown) {
    const oy = PAD + (21 * 2 * ZY - 21 * q.m * ZY);
    const GW = q.r.hires ? 24 : 12, PW = q.r.hires ? 1 : 2;   // a pixel is 1 or 2 hires wide
    for (let y = 0; y < 21; y++) for (let x = 0; x < GW; x++) {
      const c = COL[q.r.grid[y][x] === 1 ? 2 : q.r.grid[y][x]];
      // the sprite's frame, faintly, so the size reads
      const frame = y === 0 || y === 20 || x === 0 || x === GW - 1;
      for (let yy = 0; yy < q.m * ZY; yy++) for (let xx = 0; xx < PW * q.m * ZX; xx++) {
        const X = gx + (x * PW * q.m * ZX) + xx, Y = oy + y * q.m * ZY + yy;
        buf.set(c ?? (frame ? [0x55, 0x55, 0x55] : [0x44, 0x44, 0x44]), (Y * W + X) * 3);
      }
    }
    gx += cellW(q) + PAD;
  }
  writeFileSync(out + '.ppm', Buffer.concat([Buffer.from(`P6 ${W} ${H} 255\n`), buf]));
  execFileSync('magick', [out + '.ppm', out]);
  console.log(L.map(r => `${r.h}x${r.w} @${r.rot}deg ${r.px.filter(Boolean).length}px`).join('  '));
}
