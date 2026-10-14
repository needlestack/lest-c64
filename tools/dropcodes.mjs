// dropcodes.mjs -- free N charset codes from the SHIPPED plan without refitting it.
//
//   node tools/dropcodes.mjs N [plan.json] [out.json]      (defaults: data/charset-plan.json, in place)
//
// Why not just rerun charsetgen at a smaller KCELL: the shipped plan was fitted to a 2,000,000-sample
// CELLRAND scan (512M frames) that nobody kept, and a fresh scan does not reproduce it -- at the same
// KCELL only 116 of 197 codes come back. A refit would change most of the codebook to free a few.
// So this keeps the plan and removes codes one at a time: each round drops the code whose removal
// costs least, its sub-buckets going to their next-best surviving code. The cost is measured on
// build/cellscan.json (CELLSCAN=1 CELLSTEP=0.2 CELLANG=1), which is only the WEIGHTS here; a
// sub-bucket the scan never saw goes to the surviving code nearest the dropped one's shape.
// The rivets experiment did this once from a scratch script that was lost; this is that, kept.
import { readFileSync, writeFileSync } from 'fs';
import { ROOT } from '../src/paths.mjs';
process.chdir(ROOT);

const N = +process.argv[2];
const IN = process.argv[3] ?? 'data/charset-plan.json', OUT = process.argv[4] ?? IN;
if (!(N > 0)) { console.error('usage: node tools/dropcodes.mjs N [plan.json] [out.json]'); process.exit(2); }
const plan = JSON.parse(readFileSync(IN, 'utf8'));
const scan = JSON.parse(readFileSync('build/cellscan.json', 'utf8'));
const fine = plan.fine;
const L1 = (a, b) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) + Math.abs(a[3]-b[3]);
const parse = k => k.split(',').map(Number);

// the scan's buckets, split by the PLAN's thresholds -- the same .h/.l keys its assign uses
const thr = new Map(fine.thr);
const sub = new Map();                    // sub-bucket key -> [{v, n}]
for (const [key, hist] of scan.buckets) {
  const t = thr.get(key) ?? 0;
  for (const [s, n] of hist) {
    const v = parse(s), k = key + (v[1] + v[2] >= t ? '.h' : '.l');
    if (!sub.has(k)) sub.set(k, []);
    sub.get(k).push({ v, n });
  }
}
const cost = (k, c) => (sub.get(k) ?? []).reduce((a, s) => a + s.n * L1(s.v, c), 0);

const codes = fine.codes.map(c => c.slice());
const assign = new Map(fine.assign);
const alive = codes.map(() => true);
const total = () => [...assign].reduce((a, [k, i]) => a + cost(k, codes[i]), 0);
const before = total();
// where sub-bucket k goes if code i is gone: its cheapest survivor on the scan, or (unseen) the
// survivor nearest code i itself
const rehome = (k, i) => {
  let best = -1, bc = Infinity;
  for (let j = 0; j < codes.length; j++) {
    if (!alive[j] || j === i) continue;
    const c = sub.has(k) ? cost(k, codes[j]) : L1(codes[i], codes[j]);
    if (c < bc) { bc = c; best = j; }
  }
  return best;
};
const log = [];
for (let r = 0; r < N; r++) {
  let pick = -1, pc = Infinity;
  for (let i = 0; i < codes.length; i++) {
    if (!alive[i]) continue;
    let d = 0;
    for (const [k, j] of assign) if (j === i && sub.has(k)) d += cost(k, codes[rehome(k, i)]) - cost(k, codes[i]);
    if (d < pc) { pc = d; pick = i; }
  }
  for (const [k, j] of assign) if (j === pick) assign.set(k, rehome(k, pick));
  alive[pick] = false;
  log.push(`  drop [${codes[pick]}]: +${pc} px over the scan`);
}
const after = total();
// renumber the survivors
const remap = new Map(); const kept = [];
codes.forEach((c, i) => { if (alive[i]) { remap.set(i, kept.length); kept.push(c); } });
fine.codes = kept;
fine.assign = [...assign].map(([k, i]) => [k, remap.get(i)]);
// The plan's own predicted cost is over the scan it was FITTED to, which is gone; scale it by what
// the drop did on this one -- never DOWN: a drop can come out cheaper on a scan the plan was not
// fitted to (it re-homes buckets the old assignment answered badly here), and that is no evidence
// it is cheaper on the one it was.
fine.cost = fine.cost * Math.max(1, after / before);
fine.dropped = (fine.dropped ?? 0) + N;
writeFileSync(OUT, JSON.stringify(plan));
console.log(log.join('\n'));
console.log(`${codes.length} -> ${kept.length} codes; on the scan (${scan.positions * Math.ceil(256 / scan.angleStride)} frames) ` +
  `${before} -> ${after} px (+${((after / before - 1) * 100).toFixed(2)}%); wrote ${OUT}`);
