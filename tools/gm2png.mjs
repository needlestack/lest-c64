#!/usr/bin/env node
// gm2png.mjs -- render the GameMaker files in art/gamemaker/ to PNGs beside them, for looking at.
//
//   node tools/gm2png.mjs
//
// The files came off art/TMP-3.d64 (deleted 2026-10-09; these were everything on it). The .gek and
// .spr files are the SOURCE -- fit-angel.mjs and fit-face.mjs read hangl1.gek directly -- and the
// PNGs are only views of them. THE FORMATS ARE WRITTEN UP IN docs/GAMEMAKER-FORMATS.md. Both are
// GMC64's (Garry Kitchen's GameMaker): the authoritative readers are
// ../GMC64/code/js/gmScene.js and gmSprite.js, and this follows them (src/gek.mjs is the scene one).
// Multicolour pixels are two hires pixels wide, so everything is drawn on a 320-wide grid.
//
// .spr (gmSprite.js decodeHeader/decodeSpriteData -- its own header COMMENT TABLE is stale, the code
// is not): a 37-byte main header ("\x1d\x60GEK" magic), then for each of up to 4 hardware sprites
// ("quads") a 32-byte subheader (all but the first; offsets in it are the main header's minus 5),
// then that quad's frames, 64 bytes each (63 of pixels; the file's very last frame has no pad).
//   main 12 / 13 / 28   colours for pixel 01 / 11 / 10 (hi-res uses only 28); one palette for all quads
//   14                  0 = hi-res, else multicolour
//   19                  quads - 1
//   20-21 (+o)          the quad's data size: frames = (size - 32) / 64
//   sub raw 17 / 18     the quad's x (fat pixels) / y offset from the main sprite, signed
// Every frame is drawn, left to right.
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
// put(x, y, c64colour) on a W x H grid of HIRES pixels, then write it scaled
const canvas = (W, H) => {
  const px = new Int8Array(W * H).fill(-1);           // -1 = transparent, drawn black
  return { W, H, put: (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = c; },
    save(file) {
      const w = W * SCALE, h = H * SCALE, rgb = new Uint8Array(w * h * 3);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const c = px[((y / SCALE) | 0) * W + ((x / SCALE) | 0)];
        rgb.set(C64[c < 0 ? 0 : c], (y * w + x) * 3);
      }
      writeFileSync(file, png(w, h, rgb));
    } };
};
const signed = b => b > 127 ? b - 256 : b;

for (const f of readdirSync('art/gamemaker').sort()) {
  const p = `art/gamemaker/${f}`;
  if (f.endsWith('.gek')) {
    const g = readGek(p), col = [g.bg, g.c1, g.c2, g.c3], cv = canvas(320, 200);
    for (let y = 0; y < 200; y++) for (let x = 0; x < 160; x++) {   // stored as 4x8 tiles, 40 a row
      const b = g.img[(((y >> 3) * 40 + (x >> 2)) * 8) + (y & 7)];
      const c = col[(b >> (6 - 2 * (x & 3))) & 3];
      cv.put(2 * x, y, c); cv.put(2 * x + 1, y, c);
    }
    cv.save(p.replace(/\.gek$/, '.png'));
    console.log(`${p}: scene, colours bg ${g.bg} / ${g.c1} ${g.c2} ${g.c3}`);
  } else if (f.endsWith('.spr')) {
    const d = readFileSync(p), mc = d[14] !== 0, nq = d[19] + 1;
    const pal = mc ? [-1, d[12], d[28], d[13]] : [-1, d[28]];
    const quads = [];
    for (let q = 0, at = 0; q < nq; q++) {
      const hdr = at, o = q ? -5 : 0, size = q ? 32 : 37;
      const frames = (d[hdr + 20 + o] + (d[hdr + 21 + o] << 8) - 32) / 64;
      const dx = q ? signed(d[hdr + 17]) * 2 : 0, dy = q ? signed(d[hdr + 18]) : 0;  // x in fat pixels
      const data = [];
      for (let k = 0; k < frames; k++) data.push(d.subarray(hdr + size + 64 * k, hdr + size + 64 * k + 63));
      quads.push({ dx, dy, data });
      at = hdr + size + 64 * frames;
    }
    const nf = Math.max(...quads.map(q => q.data.length));
    const x0 = Math.min(0, ...quads.map(q => q.dx)), y0 = Math.min(0, ...quads.map(q => q.dy));
    const fw = Math.max(...quads.map(q => q.dx + 24)) - x0, fh = Math.max(...quads.map(q => q.dy + 21)) - y0;
    const GAP = 4, cv = canvas(nf * (fw + GAP) - GAP, fh);
    for (const q of quads) q.data.forEach((fr, k) => {
      for (let y = 0; y < 21; y++) for (let x = 0; x < 24; x++) {
        const b = fr[y * 3 + (x >> 3)];
        const v = mc ? (b >> (6 - 2 * ((x >> 1) & 3))) & 3 : (b >> (7 - (x & 7))) & 1;
        if (v) cv.put(k * (fw + GAP) + q.dx - x0 + x, q.dy - y0 + y, pal[v]);
      }
    });
    cv.save(p.replace(/\.spr$/, '.png'));
    console.log(`${p}: ${mc ? 'multicolour' : 'hi-res'} sprite, ${nq} quad${nq > 1 ? 's' : ''}, ` +
      `${nf} frame${nf > 1 ? 's' : ''}, colours ${pal.slice(1).join(' ')}`);
  }
}
