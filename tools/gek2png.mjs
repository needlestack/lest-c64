#!/usr/bin/env node
// gek2png.mjs -- render the GEK editor files in art/gek/ to PNGs beside them, for looking at.
//
//   node tools/gek2png.mjs
//
// The files came off art/TMP-3.d64 (deleted 2026-10-09; only these were on it). The .gek/.spr files
// are the SOURCE -- fit-angel.mjs and fit-face.mjs read hangl1.gek directly -- and the PNGs are
// views of them. Multicolour pixels are two hires pixels wide, so everything is drawn at 2x1 and
// then scaled up.
//
// .gek: a 160x200 multicolour scene (see src/gek.mjs).
// .spr: GEK sprites. Per sprite a 32-byte header, then 63 bytes of a 24x21 multicolour sprite and a
//       pad byte; the file starts with a 2-byte load address and "GEK". In the header (counting
//       from the byte after "GEK") byte 7 is multicolour 0 ($d025, pair 01), byte 8 multicolour 1
//       ($d026, pair 11), and byte 23 the sprite's own colour (pair 10). Pair 00 is transparent,
//       drawn black. angel.spr is two sprites stacked, 24x42 -- and its colours, 11/12/15, are the
//       greys the game's angel still uses, which is how the header bytes were identified.
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { png } from '../src/png.mjs';
import { readGek } from '../src/gek.mjs';
import { ROOT } from '../src/paths.mjs';
process.chdir(ROOT);

// the "Pepto" C64 palette
const C64 = ['000000','ffffff','68372b','70a4b2','6f3d86','588d43','352879','b8c76f',
             '6f4f25','433900','9a6759','444444','6c6c6c','9ad284','6c5eb5','959595']
  .map(h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)));
const SCALE = 3;
const draw = (w, h, pairAt, colOf, file) => {          // w x h multicolour pixels
  const W = w * 2 * SCALE, H = h * SCALE, rgb = new Uint8Array(W * H * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = C64[colOf(pairAt(x, y), y)];
    for (let dy = 0; dy < SCALE; dy++) for (let dx = 0; dx < 2 * SCALE; dx++)
      rgb.set(c, ((y * SCALE + dy) * W + x * 2 * SCALE + dx) * 3);
  }
  writeFileSync(file, png(W, H, rgb));
  console.log(`${file}: ${w}x${h}`);
};

for (const f of readdirSync('art/gek').sort()) {
  const p = `art/gek/${f}`;
  if (f.endsWith('.gek')) {
    const g = readGek(p), col = [g.bg, g.c1, g.c2, g.c3];
    draw(160, 200, (x, y) => {                          // stored as 4x8 tiles, 40 to a row
      const b = g.img[(((y >> 3) * 40 + (x >> 2)) * 8) + (y & 7)];
      return (b >> (6 - 2 * (x & 3))) & 3;
    }, v => col[v], p.replace(/\.gek$/, '.png'));
  } else if (f.endsWith('.spr')) {
    const d = readFileSync(p), sprites = [];
    for (let o = 5; o + 32 + 63 <= d.length; o += 32 + 64) {
      const h = d.slice(o, o + 32);
      sprites.push({ data: d.slice(o + 32, o + 95), col: [null, h[7] & 15, h[23] & 15, h[8] & 15] });
    }
    draw(12, 21 * sprites.length, (x, y) => {
      const s = sprites[(y / 21) | 0], r = y % 21;
      return (s.data[r * 3 + (x >> 2)] >> (6 - 2 * (x & 3))) & 3;
    }, (v, y) => v ? sprites[(y / 21) | 0].col[v] : 0, p.replace(/\.spr$/, '.png'));
  }
}
