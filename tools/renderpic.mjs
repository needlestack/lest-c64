#!/usr/bin/env node
// renderpic.mjs -- draw a death-scene picture asset as a PNG, exactly as the game shows it.
//
//   node tools/renderpic.mjs [asset.json] [picture index] [out.png]
//   node tools/renderpic.mjs data/death-pics.json 0 /tmp/angel.png      (the shipped picture)
//
// The asset is what build-facetest3.mjs writes (ASSET=1, or ASSETOUT=path): one 256-glyph charset and
// a 1,000-cell screen map per picture. The scene shows it in MULTICOLOUR text, so a cell is 4 x 8
// double-wide pixels and each bit pair picks an ink: 00 $d021, 01 $d022, 10 $d023, 11 colour RAM's
// low three bits. 40 x 25 cells -> 320 x 200, in the Colodore palette (VICE 3.x's default).
import { readFileSync, writeFileSync } from 'fs';
import { png } from '../src/png.mjs';
const [file = 'data/death-pics.json', idx = '0', out = 'pic.png'] = process.argv.slice(2);
const a = JSON.parse(readFileSync(file, 'utf8'));
const PAL = ['000000', 'ffffff', '813338', '75cec8', '8e3c97', '56ac4d', '2e2c9b', 'edf171',
             '8e5029', '553800', 'c46c71', '4a4a4a', '7b7b7b', 'a9ff9f', '706deb', 'b2b2b2']
  .map(h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)));
const inks = [a.d021, a.d022, a.d023, a.colram & 7];
const map = a.maps[+idx].map;
// colmap (tools/percell-white.mjs): a per-cell colour RAM value, so bit pair 11 differs by cell
const colmap = a.maps[+idx].colmap;
const W = 320, H = 200, rgb = new Uint8Array(W * H * 3);
for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
  const code = map[cy * 40 + cx];
  for (let r = 0; r < 8; r++) {
    const byte = a.chars[code * 8 + r];
    for (let p = 0; p < 4; p++) {
      const pr = (byte >> (6 - 2 * p)) & 3;
      const c = PAL[pr === 3 && colmap ? colmap[cy * 40 + cx] & 7 : inks[pr]];
      for (let dx = 0; dx < 2; dx++) {
        const o = ((cy * 8 + r) * W + cx * 8 + p * 2 + dx) * 3;
        rgb[o] = c[0]; rgb[o + 1] = c[1]; rgb[o + 2] = c[2];
      }
    }
  }
}
writeFileSync(out, png(W, H, rgb));
console.log(`${out}: ${a.maps[+idx].name}, ${new Set(map).size} glyphs used, inks ${inks.join('/')}`);
