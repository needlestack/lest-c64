// crossfit.mjs -- score a charset PLAN against a SCAN it was not fitted to.
//
//   CELLSCAN=1 CELLRAND=2000000 CHAIN=1 node build-iray.mjs   # -> cellscan.json for a level
//   node charsetgen.mjs                                              # -> charset-plan.json fitted to it
//   node crossfit.mjs charset-plan.json cellscan.json "label"
//
// Applies the plan the way PLAN=3 ships it: per bucket a hi and a lo codeword, chosen per shape by
// w1 + w2 >= thr; a bucket the fit never saw falls back to the nearest code to its median, as the
// build does. Weighted L1 error over the 4 fill heights, per frame.
//
// 2026-09-16, the user asked whether the plan fitted to the OLD level 1 (a maze) serves the NEW
// level 1 (long flat walls, a pillar, alcoves) or only mazes. Both plans on both 2M-sample scans:
//     OLD plan on OLD level  5.419 wrong px/frame      NEW plan on NEW level  3.402
//     OLD plan on NEW level  3.416  (ships)            NEW plan on OLD level  5.358
// A refit is worth 0.4% on the mean and changes nothing in the tail: the error is 1-px shading
// on gentle ramps, and shapes wrong by 8+ px total 0.18 per 1,000 frames. The charset is not the
// source of the corner artefacts the user sees. "Shape-rich so it generalises" was never measured;
// this is the measurement, and the answer is that the two levels' shape mixes are close enough
// that either fit serves both.
import { readFileSync } from 'fs';
const [,, planF, scanF, label] = process.argv;
const plan = JSON.parse(readFileSync(planF)), scan = JSON.parse(readFileSync(scanF));
const parse = s => s.split(',').map(Number);
const L1 = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0);
const codes = plan.fine.codes, assign = new Map(plan.fine.assign), thr = new Map(plan.fine.thr ?? []);
const nearest = v => { let bi = 0, bd = 1e9; codes.forEach((c, i) => { const d = L1(c, v); if (d < bd) { bd = d; bi = i; } }); return bi; };
let px = 0, cells = 0, fbMass = 0, fb = 0, buckets = 0;
for (const [key, hist] of scan.buckets) {
  buckets++;
  const shapes = hist.map(([s, n]) => ({ v: parse(s), n })), n = shapes.reduce((a, s) => a + s.n, 0); cells += n;
  const hi = assign.get(key + '.h'), lo = assign.get(key + '.l'), t = +(thr.get(key) ?? 0);
  if (hi === undefined) {                      // the fit never saw this bucket: the build falls back to the nearest code to its median
    fb++; fbMass += n;
    const med = [0,1,2,3].map(c => { const xs = shapes.map(s => ({ x: s.v[c], n: s.n })).sort((a, b) => a.x - b.x); let r = 0; for (const p of xs) { r += p.n; if (r * 2 >= n) return p.x; } return 0; });
    const g = codes[nearest(med)];
    for (const s of shapes) px += s.n * L1(s.v, g);
    continue;
  }
  for (const s of shapes) {
    const g = codes[(lo !== undefined && s.v[1] + s.v[2] < t) ? lo : hi];
    px += s.n * L1(s.v, g);
  }
}
console.log(`${label.padEnd(30)} ${(px / scan.frames).toFixed(3).padStart(8)} wrong px/frame   ` +
  `${fb} of ${buckets} buckets unseen by the fit (${(100 * fbMass / cells).toFixed(2)}% of cells)`);
