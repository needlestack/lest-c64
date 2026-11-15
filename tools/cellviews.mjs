#!/usr/bin/env node
// cellviews.mjs -- BEFORE and AFTER pictures of a charset change, on the views it matters most for.
//
//   node tools/cellviews.mjs before.json after.json out.png [--top 12] [--zoom 4]
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
// --zoom N: each view CROPPED to the cells either charset gets wrong (plus a cell of margin, mirrored
// half included) and scaled N times -- the errors are a few pixels in a full view and vanish at 1:1.
import { readFileSync, writeFileSync } from 'fs';
import { png } from '../src/png.mjs';

const [, , fb, fa, fout] = process.argv;
if (!fb || !fa || !fout) { console.error('usage: cellviews.mjs before.json after.json out.png [--top N]'); process.exit(2); }
const top = process.argv.includes('--top') ? +process.argv[process.argv.indexOf('--top') + 1] : 12;
const ZOOM = process.argv.includes('--zoom') ? +process.argv[process.argv.indexOf('--zoom') + 1] : 0;
const B = JSON.parse(readFileSync(fb, 'utf8')), A = JSON.parse(readFileSync(fa, 'utf8'));
const key = v => `${v.level}:${v.px}:${v.py}:${v.a}`;
const after = new Map(A.views.map(v => [key(v), v]));
const views = B.views.filter(v => after.has(key(v))).sort((x, y) => y.stepErr - x.stepErr).slice(0, top);
if (!views.length) { console.error('cellviews: no view appears in both files'); process.exit(1); }

const W = 160, H = 200, SX = 2;                 // a multicolour pixel is two wide
const WHITE = [235, 235, 235], BLACK = [16, 16, 16];
const C8 = v => Math.max(0, Math.min(8, v));

// one panel, 160 x 200 RGB: the exact picture from the heights, with each mixed cell replaced by
// `shape(cell)` (null = draw it exactly) and tinted where that differs from the truth
function panel(v, shape) {
  const img = new Array(W * H);
  const cells = new Map(v.cells.map(c => [`${c.g},${c.R}`, c]));
  for (let x = 0; x < W; x++) for (let y = 0; y < 100; y++) {
    const g = x >> 2, col = x & 3, R = y >> 3, row = y & 7;
    const h = v.h[x], truth = y >= 100 - h;           // the wall's top edge is h rows above the horizon
    const c = cells.get(`${g},${R}`), s = c && shape(c);
    let wall = truth, tint = null;
    if (s) {                                           // the drawn shape: wall in the cell's bottom s[col] rows
      wall = row >= 8 - s[col];
      if (wall !== truth) tint = wall ? (c.kb ? [220, 40, 40] : [240, 160, 160]) : (c.kb ? [40, 90, 230] : [160, 185, 245]);
    }
    img[y * W + x] = img[(199 - y) * W + x] = tint ?? (wall ? BLACK : WHITE);
  }
  return img;
}
// the crop: every cell either charset draws wrong, plus a cell of margin, in the top half (mirrored)
function box(v, a) {
  const bad = [];
  const C = (cs, c) => { const t = [0, 1, 2, 3].map(i => C8(v.h[c.g * 4 + i] + 8 * c.R - 92)); return t.some((x, i) => x !== c.drawn[i]); };
  for (const c of v.cells) if (C(v, c)) bad.push(c);
  for (const c of a.cells) if (C(a, c)) bad.push(c);
  if (!bad.length) return { x0: 0, x1: W, y0: 0, y1: 100 };
  const gx = bad.map(c => c.g), ry = bad.map(c => c.R);
  return { x0: Math.max(0, (Math.min(...gx) - 1) * 4), x1: Math.min(W, (Math.max(...gx) + 2) * 4),
           y0: Math.max(0, (Math.min(...ry) - 1) * 8), y1: Math.min(100, (Math.max(...ry) + 2) * 8) };
}
const Z = ZOOM || 1;
const rows = views.map(v => { const a = after.get(key(v));
  const bx = ZOOM ? box(v, a) : { x0: 0, x1: W, y0: 0, y1: 100 };
  // full view: both halves; zoomed: the crop in the top half only
  const y1 = ZOOM ? bx.y1 : H;
  return { v, a, bx, w: (bx.x1 - bx.x0) * SX * Z, h: (y1 - bx.y0) * Z, y1 }; });
const PW = Math.max(...rows.map(r => r.w)), GAP = 8;
const OW = 3 * PW + 2 * GAP, OH = rows.reduce((t, r) => t + r.h + GAP, 0);
const out = new Uint8Array(OW * OH * 3).fill(40);
const put = (x, y, rgb) => { const i = (y * OW + x) * 3; out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; };
const blit = (img, r, ox, oy) => {
  for (let y = r.bx.y0; y < r.y1; y++) for (let x = r.bx.x0; x < r.bx.x1; x++) {
    const rgb = img[y * W + x];
    for (let dy = 0; dy < Z; dy++) for (let dx = 0; dx < SX * Z; dx++)
      put(ox + (x - r.bx.x0) * SX * Z + dx, oy + (y - r.bx.y0) * Z + dy, rgb);
  }
};
console.log(`row  level  position        angle  step error before -> after  (all cells before -> after)`);
let oy = 0;
rows.forEach((r, i) => {
  const { v, a } = r;
  const ac = new Map(a.cells.map(c => [`${c.g},${c.R}`, c]));
  blit(panel(v, () => null), r, 0, oy);
  blit(panel(v, c => c.drawn), r, PW + GAP, oy);
  blit(panel(v, c => ac.get(`${c.g},${c.R}`)?.drawn ?? c.drawn), r, 2 * (PW + GAP), oy);
  oy += r.h + GAP;
  console.log(`${String(i + 1).padStart(3)}  ${String(v.level).padStart(5)}  (${v.px.toFixed(2)}, ${v.py.toFixed(2)})`.padEnd(32) +
    `${String(v.a).padStart(5)}  ${String(v.stepErr).padStart(10)} -> ${String(a.stepErr).padEnd(6)}       (${v.err} -> ${a.err})`);
});
writeFileSync(fout, png(OW, OH, out));
const sb = views.reduce((s, v) => s + v.stepErr, 0), sa = views.reduce((s, v) => s + after.get(key(v)).stepErr, 0);
console.log(`\nthese ${views.length} views: step error ${sb} -> ${sa} wrong pixels (${(100 * (sa - sb) / sb).toFixed(0)}%)  -> ${fout}`);
