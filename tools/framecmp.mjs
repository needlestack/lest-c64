#!/usr/bin/env node
// framecmp.mjs -- did two runs of the same fixed workload DRAW the same thing?
//
//   node tools/framecmp.mjs base/frames.bin new/frames.bin
//
// Input: two frames.bin files from tools/frames.mjs (1000 screen bytes per displayed frame), made
// with the same workload env on two builds. Exit 0 if they match, 1 if not.
//
// "Match" has two strengths, and both are reported:
//   IDENTICAL  -- frame k is byte-identical in both runs, for every k.
//   IN ORDER   -- every base frame appears in the new run, in the same order (new may have extra
//                 frames between them). This is the test that passes a correct build whose code got
//                 FASTER: the movers (WALKF/SPINF) step per RENDERED frame and so repeat exactly,
//                 but a fall or the death scene runs on the raster clock, so a faster build can show
//                 an animation in a different number of rendered frames. Anything WRONG on screen
//                 is a frame the base never drew, and fails this.
// Anything less is a failure, and the first frames and cells that differ are printed to look at.
import { readFileSync } from 'fs';

const [fa, fb] = process.argv.slice(2);
if (!fa || !fb) { console.error('usage: framecmp.mjs base/frames.bin new/frames.bin'); process.exit(2); }
const split = buf => Array.from({ length: Math.floor(buf.length / 1000) }, (_, k) => buf.subarray(k * 1000, k * 1000 + 1000));
const A = split(readFileSync(fa)), B = split(readFileSync(fb));
const key = f => Buffer.from(f).toString('latin1');

const n = Math.min(A.length, B.length);
let firstDiff = -1;
for (let k = 0; k < n && firstDiff < 0; k++) if (key(A[k]) !== key(B[k])) firstDiff = k;
if (firstDiff < 0 && A.length === B.length) { console.log(`IDENTICAL  ${A.length} frames`); process.exit(0); }

const at = new Map();
B.forEach((f, k) => { const s = key(f); if (!at.has(s)) at.set(s, []); at.get(s).push(k); });
let j = 0;
const missing = [];
A.forEach((f, k) => {
  const next = (at.get(key(f)) ?? []).find(x => x >= j);
  if (next === undefined) missing.push(k); else j = next + 1;
});
if (!missing.length) {
  console.log(`IN ORDER   all ${A.length} base frames appear in order in the new run's ${B.length} (first difference at frame ${firstDiff})`);
  process.exit(0);
}
console.log(`DIFFERS    ${missing.length} of ${A.length} base frames never appear in order in the new run: ` +
  `${missing.slice(0, 12).join(' ')}${missing.length > 12 ? ' ...' : ''}`);
for (const k of missing.slice(0, 3)) {
  if (k >= B.length) { console.log(`  frame ${k}: past the end of the new run`); continue; }
  const cells = [];
  for (let i = 0; i < 1000; i++) if (A[k][i] !== B[k][i]) cells.push(`(${i / 40 | 0},${i % 40}) ${A[k][i]}->${B[k][i]}`);
  console.log(`  frame ${k}: ${cells.length} cells differ (row,col base->new): ${cells.slice(0, 8).join('  ')}`);
}
process.exit(1);
