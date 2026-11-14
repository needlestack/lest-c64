#!/usr/bin/env node
// cellviews.mjs -- BEFORE and AFTER pictures of a charset change, on the views it matters most for.
//
//   node tools/cellviews.mjs before.json after.json out.png [--top 12]
//
// The inputs are CELLVIEWS dumps from the build's cell scan (CELLSCAN=1 CELLVIEWS=... or
// CELLVIEWIN=...): the same views, scored under two charsets. Each view holds the 160 column heights
// the JS model of the renderer computed -- the EXACT picture -- and, for every mixed cell, the
// four-column shape the charset actually DRAWS there.
//
// Each output row is one view: EXACT | BEFORE | AFTER, wall black on white, the top half mirrored
// below the horizon as the engine draws it. A cell the charset gets wrong is tinted: red where the
// drawn shape has wall the true one does not, blue where it is missing wall -- step cells in full
// colour, ramps paler, so the corners stand out. The table it prints says which view is which row
// and how its step error moved.
import { readFileSync, writeFileSync } from 'fs';
import { png } from '../src/png.mjs';

const [, , fb, fa, fout] = process.argv;
if (!fb || !fa || !fout) { console.error('usage: cellviews.mjs before.json after.json out.png [--top N]'); process.exit(2); }
const top = process.argv.includes('--top') ? +process.argv[process.argv.indexOf('--top') + 1] : 12;
const B = JSON.parse(readFileSync(fb, 'utf8')), A = JSON.parse(readFileSync(fa, 'utf8'));
const key = v => `${v.level}:${v.px}:${v.py}:${v.a}`;
const after = new Map(A.views.map(v => [key(v), v]));
const views = B.views.filter(v => after.has(key(v))).sort((x, y) => y.stepErr - x.stepErr).slice(0, top);
if (!views.length) { console.error('cellviews: no view appears in both files'); process.exit(1); }

const W = 160, H = 200, SX = 2;                 // a multicolour pixel is two wide: draw 320 x 200
const PW = W * SX, GAP = 8, ROW = H + GAP;
const out = new Uint8Array((3 * PW + 2 * GAP) * (views.length * ROW) * 3).fill(40);
const OW = 3 * PW + 2 * GAP;
const put = (x, y, rgb) => { const i = (y * OW + x) * 3; out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; };
const WHITE = [235, 235, 235], BLACK = [16, 16, 16];
const C8 = v => Math.max(0, Math.min(8, v));

// one panel: the exact picture from the heights, with each mixed cell replaced by `shape(cell)`
// (null = draw it exactly) and tinted where that differs from the truth
function panel(v, ox, oy, shape) {
  const cells = new Map(v.cells.map(c => [`${c.g},${c.R}`, c]));
  for (let x = 0; x < W; x++) for (let y = 0; y < 100; y++) {
    const g = x >> 2, col = x & 3, R = y >> 3, row = y & 7;
    const h = v.h[x], truth = y >= 100 - h;           // the wall's top edge is h rows above the horizon
    const c = cells.get(`${g},${R}`), s = c && shape(c);
    let wall = truth, tint = null;
    if (s) {                                           // the drawn shape: wall in the cell's bottom s[col] rows
      wall = row >= 8 - s[col];
      const t = C8(h + 8 * R - 92);
      if (s[col] !== t && wall !== truth) tint = wall ? (c.kb ? [220, 40, 40] : [240, 160, 160]) : (c.kb ? [40, 90, 230] : [160, 185, 245]);
    }
    const rgb = tint ?? (wall ? BLACK : WHITE);
    for (const yy of [y, 199 - y]) for (let k = 0; k < SX; k++) put(ox + x * SX + k, oy + yy, rgb);
  }
}

console.log(`row  level  position        angle  step error before -> after  (all cells before -> after)`);
views.forEach((v, i) => {
  const a = after.get(key(v)), oy = i * ROW;
  panel(v, 0, oy, () => null);
  panel(v, PW + GAP, oy, c => c.drawn);
  const ac = new Map(a.cells.map(c => [`${c.g},${c.R}`, c]));
  panel(v, 2 * (PW + GAP), oy, c => ac.get(`${c.g},${c.R}`)?.drawn ?? c.drawn);
  console.log(`${String(i + 1).padStart(3)}  ${String(v.level).padStart(5)}  (${v.px.toFixed(2)}, ${v.py.toFixed(2)})`.padEnd(32) +
    `${String(v.a).padStart(5)}  ${String(v.stepErr).padStart(10)} -> ${String(a.stepErr).padEnd(6)}       (${v.err} -> ${a.err})`);
});
writeFileSync(fout, png(OW, views.length * ROW, out));
const sb = views.reduce((s, v) => s + v.stepErr, 0), sa = views.reduce((s, v) => s + after.get(key(v)).stepErr, 0);
console.log(`\nthese ${views.length} views: step error ${sb} -> ${sa} wrong pixels (${(100 * (sa - sb) / sb).toFixed(0)}%)  -> ${fout}`);
