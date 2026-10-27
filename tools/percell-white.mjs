#!/usr/bin/env node
// percell-white.mjs -- EXPERIMENT (2026-10-15): a death-scene picture whose fourth ink is chosen PER CELL.
//
//   IMAGES=pic.png KONE=200 ASSETOUT=out.json node tools/percell-white.mjs
//   (same FACE* tone settings as build-facetest3.mjs; render with tools/renderpic.mjs)
//
// In multicolour text, bit pairs 00/01/10 are global registers ($d021/$d022/$d023: the three greys)
// and 11 comes from COLOUR RAM, per cell, colours 0-7. The scene fills colour RAM with black. White is
// colour 1, so a cell can trade black for WHITE: highlight cells (the sword, a lit cheek, a wing edge)
// get dark/mid/light grey + white, the rest keep black. A glyph is still one bit pattern shared by
// every cell that uses it; what pair 11 MEANS depends on the cell, so a cell is matched against every
// glyph drawn in its own inks.
//
// Pipeline: tone as fit-face's toPixels; dither once with all five inks to see where white is wanted;
// a cell is WHITE when its white pixels outnumber its black ones; dither again with each cell's own
// four inks; cluster the tiles (luminance k-medoids, fit-face's cluster); fit each cell in its inks.
// Not wired into the game: the game would need a 1,000-bit colour map (125 bytes) and its expander.
import { writeFileSync } from 'fs';
import { toPixels, tilesOf, cluster, LU, GREYS, BLACK } from '../src/fit-face.mjs';
import { ROOT } from '../src/paths.mjs';
process.chdir(ROOT);

const FILE = process.env.IMAGES, K = +(process.env.KONE ?? 200), OUT = process.env.ASSETOUT ?? 'percell.json';
const WHITE = 4;                       // a fifth pixel value: pair 11 in a white cell
LU[WHITE] = 255;                       // fit-face's luminance table, extended for it
const GRIT = +(process.env.FACEGRIT ?? 40);
const { tgt } = toPixels(FILE);

// Floyd-Steinberg as fit-face's dither, but with the ink set chosen per pixel (by its cell)
const lo = Math.min(...[...GREYS, BLACK].map(v => LU[v])), lt = LU[GREYS[GREYS.length - 1]];
// The tone ramp keeps the scene's darkness: up to the knee it spans black..light grey exactly as the
// four-ink fit does, and only the brightest tones above it reach on to white -- highlights, not a lift.
const KNEE = +(process.env.FACEWHITE ?? 0.85);
const ramp = t => t <= KNEE ? lo + (t / KNEE) * (lt - lo) : lt + ((t - KNEE) / (1 - KNEE)) * (255 - lt);
function ditherBy(inksAt) {
  const target = Float64Array.from(tgt, t => t < 0 ? -1 : ramp(t));
  const buf = Float64Array.from(target), out = new Uint8Array(160 * 200);
  for (let y = 0; y < 200; y++) {
    const ltr = (y & 1) === 0;
    for (let k = 0; k < 160; k++) {
      const x = ltr ? k : 159 - k, i = y * 160 + x;
      if (target[i] < 0) { out[i] = BLACK; continue; }
      const n = GRIT ? (((((x * 73856093) ^ (y * 19349663)) >>> 8) & 255) / 255 - 0.5) * GRIT : 0;
      let best = 0, bd = Infinity;
      for (const v of inksAt(x, y)) { const d = Math.abs(LU[v] - (buf[i] + n)); if (d < bd) { bd = d; best = v; } }
      out[i] = best;
      const e = buf[i] - LU[best], dx = ltr ? 1 : -1;
      for (const [xx, yy, f] of [[x + dx, y, 7], [x - dx, y + 1, 3], [x, y + 1, 5], [x + dx, y + 1, 1]])
        if (xx >= 0 && xx < 160 && yy < 200 && target[yy * 160 + xx] >= 0) buf[yy * 160 + xx] += e * f / 16;
    }
  }
  return out;
}
// 1. where does the picture WANT white? (tone stretched to white at the top)
const all5 = ditherBy(() => [...GREYS, BLACK, WHITE]);
const isW = new Uint8Array(1000);
for (let c = 0; c < 1000; c++) {
  let w = 0, b = 0;
  const cx = c % 40, cy = (c / 40) | 0;
  for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++) {
    const v = all5[(cy * 8 + r) * 160 + cx * 4 + i]; if (v === WHITE) w++; else if (v === BLACK && tgt[(cy * 8 + r) * 160 + cx * 4 + i] >= 0) b++;
  }
  isW[c] = w > b ? 1 : 0;
}
// 2. dither again, each cell in its own four inks
const px = ditherBy((x, y) => isW[((y >> 3) * 40) + (x >> 2)] ? [...GREYS, WHITE] : [...GREYS, BLACK]);
// 3. one dictionary of tiles (luminance medoids: a medoid IS a real tile, so it has a cell type)
const tiles = tilesOf(px);
const { cents } = cluster(tiles, K);
const pattern = t => Array.from(t, v => v === WHITE ? BLACK : v);   // the bits: white is pair 11 too
// 4. fit each cell against every glyph drawn in ITS inks
const glyphs = cents.map(pattern);
const map = [], colmap = [];
let err = 0;
for (let c = 0; c < 1000; c++) {
  const t = tiles[c], hi = isW[c] ? WHITE : BLACK;
  let best = 0, bd = Infinity;
  for (let g = 0; g < glyphs.length; g++) {
    let d = 0;
    for (let p = 0; p < 32; p++) { const v = glyphs[g][p] === BLACK ? hi : glyphs[g][p]; const e = LU[t[p]] - LU[v]; d += e * e; if (d >= bd) break; }
    if (d < bd) { bd = d; best = g; }
  }
  map.push(best); colmap.push(0x08 | (isW[c] ? 1 : 0)); err += bd;
}
const chars = [];
for (const g of glyphs) for (let r = 0; r < 8; r++)
  chars.push((g[r * 4] << 6) | (g[r * 4 + 1] << 4) | (g[r * 4 + 2] << 2) | g[r * 4 + 3]);
while (chars.length < 2048) chars.push(0);
// the inks: pixel value -> register, as build-facetest3's asset (value v is bit pair v)
const face = JSON.parse((await import('fs')).readFileSync('./data/angel-face.json', 'utf8')).hangl1;
writeFileSync(OUT, JSON.stringify({ source: 'percell-white.mjs', chars, d021: face.d021, d022: face.d022,
  d023: face.d023, colram: 0x08 | (face.colram & 7), maps: [{ name: FILE, map, colmap }] }));
console.log(`${OUT}: ${K} glyphs, ${isW.reduce((a, b) => a + b, 0)} white cells, RMS ${(Math.sqrt(err / 32000) / 255).toFixed(4)}`);
