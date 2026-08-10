// Choose a charset by frequency-weighted k-medians, from the bucket histograms CELLSCAN dumps.
//
//   CELLSCAN=1 CELLSTEP=0.2 CELLANG=1 node build-iray.mjs && node charsetgen.mjs
//
// WHY NOT THE GREEDY MERGE IN mergecells.mjs. That folds a rare shape into whichever L1==1
// NEIGHBOUR is more common, so when five shapes collapse into one they all land on the most
// popular member rather than on the shape closest to all five -- and because it is greedy and
// pairwise, the answer depends on which fold happened first. Both are real biases and both
// disappear here: a cluster's representative is chosen to minimise the total weighted distance
// to its members, and it does not have to be one of them.
//
// Two facts make that cheap rather than a research project:
//   * The codeword is any [a,b,c,d] in 0..8. It is a glyph we are about to draw, not a shape we
//     observed, so the centre is free to sit BETWEEN the members.
//   * Under L1 the optimal centre of a weighted set is the per-column WEIGHTED MEDIAN. Exact,
//     closed form, no iteration inside the update step. (Under L2 it would be the mean, which
//     is wrong here: one distant outlier would drag the whole glyph.)
//
// The unit of clustering is the BUCKET, not the shape. The engine picks one pattern per rampT
// entry and per step slot, so shapes that share a bucket are forced to share an answer whatever
// we do; clustering shapes independently would optimise something the engine cannot express.
import { readFileSync, writeFileSync } from 'fs';

const scan = JSON.parse(readFileSync('./cellscan.json', 'utf8'));
const FRAMES = scan.positions * Math.ceil(256 / scan.angleStride);
const parse = k => k.split(',').map(Number);
const L1 = (a, b) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) + Math.abs(a[3]-b[3]);
const hamm = (a, b) => (a[0]!==b[0]) + (a[1]!==b[1]) + (a[2]!==b[2]) + (a[3]!==b[3]);

// ---- buckets: what the engine is forced to answer in one code
const B = scan.buckets.map(([key, hist]) => {
  const shapes = hist.map(([s, n]) => ({ v: parse(s), n }));
  return { key, kind: key[0] === 'r' ? 'ramp' : 'step', shapes,
           n: shapes.reduce((a, s) => a + s.n, 0) };
});

// weighted per-column median of a shape list -- the L1-optimal glyph for that set
function median(shapes) {
  const out = [0, 0, 0, 0];
  const tot = shapes.reduce((a, s) => a + s.n, 0);
  for (let c = 0; c < 4; c++) {
    const xs = shapes.map(s => ({ x: s.v[c], n: s.n })).sort((a, b) => a.x - b.x);
    let run = 0;
    for (const p of xs) { run += p.n; if (run * 2 >= tot) { out[c] = p.x; break; } }
  }
  return out;
}
// cost of answering a set of shapes with one glyph
const costOf = (shapes, g) => shapes.reduce((a, s) => a + s.n * L1(s.v, g), 0);
const costCols = (shapes, g) => shapes.reduce((a, s) => a + s.n * hamm(s.v, g), 0);

for (const b of B) { b.ideal = median(b.shapes); b.floor = costOf(b.shapes, b.ideal); }

// ---- the floor: one code per bucket. Everything below is what BUCKETING costs, and no
// charset, of any size, can go under it while the addressing stays as it is.
const FLOOR = B.reduce((a, b) => a + b.floor, 0);
const FLOORC = B.reduce((a, b) => a + costCols(b.shapes, b.ideal), 0);
const TOTAL = B.reduce((a, b) => a + b.n, 0);

// ---- k-medians over buckets. cost(bucket -> glyph) is over the bucket's WHOLE histogram, not
// the distance from its ideal: two buckets with the same median can have very different spreads.
function kmedians(bs, K, seed) {
  if (!bs.length) return { codes: [], cost: 0, assign: new Map() };
  K = Math.min(K, bs.length);
  let rnd = seed;
  const rand = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  // k-means++ init, weighted by how many cells the bucket accounts for: a seed spent on a
  // bucket seen twice is a code spent on nothing.
  const codes = [bs[0].ideal.slice()];
  {
    let bestI = 0, bestN = -1;
    bs.forEach((b, i) => { if (b.n > bestN) { bestN = b.n; bestI = i; } });
    codes[0] = bs[bestI].ideal.slice();
  }
  while (codes.length < K) {
    const d = bs.map(b => Math.min(...codes.map(c => costOf(b.shapes, c))));
    const tot = d.reduce((a, v) => a + v, 0);
    if (tot <= 0) break;
    let r = rand() * tot, pick = 0;
    for (let i = 0; i < d.length; i++) { r -= d[i]; if (r <= 0) { pick = i; break; } }
    const cand = bs[pick].ideal.slice();
    if (!codes.some(c => L1(c, cand) === 0)) codes.push(cand);
    else { const alt = bs.find(b => !codes.some(c => L1(c, b.ideal) === 0));
           if (!alt) break; codes.push(alt.ideal.slice()); }
  }
  // Lloyd: assign to cheapest glyph, then move each glyph to the median of everything it answers
  let assign = new Map(), last = Infinity;
  for (let it = 0; it < 60; it++) {
    assign = new Map();
    const members = codes.map(() => []);
    let cost = 0;
    for (const b of bs) {
      let bi = 0, bc = Infinity;
      for (let i = 0; i < codes.length; i++) { const c = costOf(b.shapes, codes[i]);
        if (c < bc) { bc = c; bi = i; } }
      assign.set(b.key, bi); members[bi].push(b); cost += bc;
    }
    for (let i = 0; i < codes.length; i++) {
      if (!members[i].length) continue;
      codes[i] = median(members[i].flatMap(b => b.shapes));
    }
    if (Math.abs(last - cost) < 1e-9) { last = cost; break; }
    last = cost;
  }
  // drop glyphs nothing uses, so K is codes SPENT rather than codes asked for
  const used = new Set(assign.values());
  const remap = new Map(); const kept = [];
  for (const i of [...used].sort((a, b) => a - b)) { remap.set(i, kept.length); kept.push(codes[i]); }
  for (const [k, v] of assign) assign.set(k, remap.get(v));
  let cost = 0, cols = 0;
  for (const b of bs) { const g = kept[assign.get(b.key)];
    cost += costOf(b.shapes, g); cols += costCols(b.shapes, g); }
  return { codes: kept, cost, cols, assign };
}

function best(bs, K, tries = 6) {
  let b = null;
  for (let s = 1; s <= tries; s++) { const r = kmedians(bs, K, s * 7919);
    if (!b || r.cost < b.cost) b = r; }
  return b;
}

const per = (v) => (v / FRAMES).toFixed(3);
console.log(`charsetgen  ${B.length} reachable buckets ` +
  `(${B.filter(b => b.kind === 'ramp').length} ramp, ${B.filter(b => b.kind === 'step').length} step), ` +
  `${TOTAL.toLocaleString()} mixed cells over ${FRAMES.toLocaleString()} frames`);
console.log(`  SHIPPED today:            ${per(scan.shippedPx)} px/frame, ${per(scan.shippedCols)} cols/frame`
  .replace(per(scan.shippedPx), scan.shippedPx.toFixed(3))
  .replace(per(scan.shippedCols), scan.shippedCols.toFixed(3)));
console.log(`  FLOOR (1 code per bucket, ${B.length} codes): ${per(FLOOR)} px/frame, ${per(FLOORC)} cols/frame`);
console.log(`     -- that is what the ADDRESSING costs. No charset can beat it without changing`);
console.log(`        how a cell is indexed, and it is already better than today with no merging.`);

// ---- the split the request asks for, and the shared codebook it is competing with
const ramps = B.filter(b => b.kind === 'ramp'), steps = B.filter(b => b.kind === 'step');
const PLANS = (process.env.PLANS || '128:96,110:114,96:128,140:84,160:64').split(',')
  .map(p => p.split(':').map(Number));

console.log(`\n  SPLIT budgets (ramp codes : step codes) -- separate codebooks:`);
console.log(`    ramp  step  total   px/frame  cols/frame`);
const results = [];
for (const [kr, ks] of PLANS) {
  const r = best(ramps, kr), s = best(steps, ks);
  const px = r.cost + s.cost, cols = r.cols + s.cols;
  const tot = r.codes.length + s.codes.length;
  results.push({ kr, ks, tot, px, cols, r, s });
  console.log(`    ${String(r.codes.length).padStart(4)}  ${String(s.codes.length).padStart(4)}  ` +
    `${String(tot).padStart(5)}   ${per(px).padStart(8)}   ${per(cols).padStart(8)}`);
}

console.log(`\n  SHARED codebook -- one pool both tables index into:`);
console.log(`    codes   px/frame  cols/frame`);
const shared = [];
for (const K of (process.env.SHARED || '160,190,214,224,234').split(',').map(Number)) {
  const a = best(B, K);
  shared.push({ K, a });
  console.log(`    ${String(a.codes.length).padStart(5)}   ${per(a.cost).padStart(8)}   ${per(a.cols).padStart(8)}`);
}

// ---- what a SECOND pattern per code could be worth, which is the whole case for the colour
// RAM trick. The trap: more shapes cannot help on their own. A bucket answers with one glyph
// because the bucket INDEX is all the engine knows about the cell -- give it 468 shapes and it
// still has to pick one per bucket, and the floor above does not move. Pairing only pays if the
// colour bit carries one bit of information the index does not, splitting the bucket in two.
//
// So this prices a perfect extra bit: let every bucket answer with TWO glyphs and assign each
// occurrence to the better one. That is an upper bound -- it assumes the engine can decide, per
// cell and for free, which half it is in.
//
// The pair must NEST (componentwise <=), because the encoding is 01 = black in both, 00 = white
// in both, 11 = differs, with colour RAM choosing whether 11 reads black or white. Unconstrained
// two-glyph is reported alongside to show what the nesting rule itself costs.
function best2(shapes, nest) {
  // small enough to be exact-ish: seed from the shapes present, refine by reassignment
  const cands = [...new Map(shapes.map(s => [s.v.join(','), s.v])).values()];
  let bestPair = null, bestCost = Infinity;
  for (let i = 0; i < cands.length; i++) for (let j = i; j < cands.length; j++) {
    let A = cands[i], Bv = cands[j];
    if (nest) {                                   // force a nesting pair around the two seeds
      const hi = [0,1,2,3].map(c => Math.max(A[c], Bv[c]));
      const lo = [0,1,2,3].map(c => Math.min(A[c], Bv[c]));
      A = hi; Bv = lo;
    }
    let c = 0;
    for (const s of shapes) c += s.n * Math.min(L1(s.v, A), L1(s.v, Bv));
    if (c < bestCost) { bestCost = c; bestPair = [A, Bv]; }
  }
  return { cost: bestCost, pair: bestPair };
}
let floor2 = 0, floor2n = 0, pairWorth = 0;
for (const b of B) {
  const u = best2(b.shapes, false), n2 = best2(b.shapes, true);
  floor2 += u.cost; floor2n += n2.cost;
  b.pair = n2.pair; b.pairCost = n2.cost;
  if (b.floor - n2.cost > 0) pairWorth += b.floor - n2.cost;
}
console.log(`\n  A SECOND pattern per code (the colour RAM trick), priced as a perfect extra bit:`);
console.log(`    1 glyph  per bucket (${B.length} codes):        ${per(FLOOR)} px/frame   <- the floor above`);
console.log(`    2 glyphs per bucket, nesting:          ${per(floor2n)} px/frame`);
console.log(`    2 glyphs per bucket, unconstrained:    ${per(floor2)} px/frame  (nesting costs ` +
  `${((floor2n - floor2) / FRAMES).toFixed(3)})`);
console.log(`    best case gain from the extra bit:     ${((FLOOR - floor2n) / FRAMES).toFixed(3)} px/frame ` +
  `= ${(100 * (FLOOR - floor2n) / FLOOR).toFixed(1)}%`);
console.log(`    ...and that is BEFORE paying for the colour RAM writes, and assumes the engine`);
console.log(`       can name which half a cell is in for free, which it currently cannot.`);

// The oracle above is not buildable: the engine has to DECIDE the bit, per cell, from what it
// already holds. It does hold all four columns (colH is per logical column) -- the bucket is
// only two of them because a 4D index is what costs, not the data. So price the cheapest real
// rule: one add and one compare against a per-bucket threshold, m = w1 + w2 >= thr.
// That is ~8 cycles on an edge cell, against ~23 edge cells a frame.
let realCost = 0;
for (const b of B) {
  let bestC = Infinity, bestT = 0, bestPair = null;
  for (let thr = 0; thr <= 17; thr++) {
    const lo = b.shapes.filter(s => s.v[1] + s.v[2] < thr);
    const hi = b.shapes.filter(s => s.v[1] + s.v[2] >= thr);
    if (!lo.length || !hi.length) continue;
    let gA = median(hi), gB = median(lo);
    const p = [0,1,2,3].map(c => Math.max(gA[c], gB[c]));   // nesting pair around the two
    const q = [0,1,2,3].map(c => Math.min(gA[c], gB[c]));
    const c = costOf(hi, p) + costOf(lo, q);
    if (c < bestC) { bestC = c; bestT = thr; bestPair = [p, q]; }
  }
  if (bestPair && bestC < b.floor) { b.realPair = bestPair; b.thr = bestT; realCost += bestC; }
  else { b.realPair = null; realCost += b.floor; }
}
console.log(`    REALIZABLE bit (m = w1+w2 >= per-bucket threshold):`);
console.log(`      ${(realCost / FRAMES).toFixed(3)} px/frame  -- captures ` +
  `${(100 * (FLOOR - realCost) / (FLOOR - floor2n)).toFixed(0)}% of the oracle's gain, ` +
  `${(100 * (FLOOR - realCost) / FLOOR).toFixed(1)}% below the 1-glyph floor`);

// How many cells per frame would actually need the non-default colour? Assign the busier half
// of each pair to the default so the write is the exception, the same "spend the mechanism on
// what is never used" rule that made the old pairing free.
let minority = 0;
for (const b of B) {
  if (!b.pair) continue;
  let a = 0, c = 0;
  for (const s of b.shapes) (L1(s.v, b.pair[0]) <= L1(s.v, b.pair[1]) ? (a += s.n) : (c += s.n));
  minority += Math.min(a, c);
}
console.log(`    cells needing the non-default colour:  ${(minority / FRAMES).toFixed(2)} per frame ` +
  `(${(100 * minority / TOTAL).toFixed(1)}% of mixed cells)`);

// ---- write the plan the build consumes.
// KCELL is what is left for cell patterns after BLANK, SOLID, the 18 readout glyphs and the 4
// seam codes: 256 - 2 - 18 - 4 = 232. BLANK and SOLID are not in the codebook -- they answer
// the all-white and all-black cells, which are not "mixed" and never reach a bucket.
const KCELL = +(process.env.KCELL ?? 232);
const PAIRED = process.env.PAIRED === '1';

const finalPlan = best(B, KCELL, 10);
console.log(`\n  PLAN (KCELL=${KCELL}, single glyph): ${finalPlan.codes.length} codes, ` +
  `${per(finalPlan.cost)} px/frame, ${per(finalPlan.cols)} cols/frame`);

let paired = null;
if (PAIRED) {
  // Each code carries a nesting pair, so KCELL codes hold up to 2*KCELL glyphs. Cluster the
  // buckets into KCELL groups first, then give each group the best nesting pair for everything
  // it answers, plus the w1+w2 threshold that chooses between them.
  const grp = best(B, KCELL, 10);
  const members = grp.codes.map(() => []);
  for (const b of B) members[grp.assign.get(b.key)].push(b);
  const pairs = [], thrs = new Map();
  let pcost = 0, pminority = 0;
  members.forEach((ms, i) => {
    const all = ms.flatMap(b => b.shapes);
    let bestC = Infinity, bestP = null, bestT = 0;
    for (let thr = 0; thr <= 17; thr++) {
      const hi = all.filter(s => s.v[1] + s.v[2] >= thr), lo = all.filter(s => s.v[1] + s.v[2] < thr);
      if (!hi.length || !lo.length) continue;
      const gA = median(hi), gB = median(lo);
      const p = [0,1,2,3].map(c => Math.max(gA[c], gB[c]));
      const q = [0,1,2,3].map(c => Math.min(gA[c], gB[c]));
      const c = costOf(hi, p) + costOf(lo, q);
      if (c < bestC) { bestC = c; bestP = [p, q]; bestT = thr; }
    }
    if (!bestP) { bestP = [grp.codes[i], grp.codes[i]]; bestT = 0; bestC = costOf(all, grp.codes[i]); }
    pairs.push(bestP); pcost += bestC;
    for (const b of ms) thrs.set(b.key, bestT);
    const hi = all.filter(s => s.v[1] + s.v[2] >= bestT).reduce((a, s) => a + s.n, 0);
    const lo = all.reduce((a, s) => a + s.n, 0) - hi;
    pminority += Math.min(hi, lo);
  });
  let pcols = 0;
  for (const b of B) { const i = grp.assign.get(b.key), t = thrs.get(b.key), [p, q] = pairs[i];
    for (const s of b.shapes) pcols += s.n * hamm(s.v, (s.v[1] + s.v[2] >= t) ? p : q); }
  paired = { codes: pairs, assign: [...grp.assign], thr: [...thrs], cost: pcost, cols: pcols };
  console.log(`  PLAN (KCELL=${KCELL}, PAIRED):        ${pairs.length} codes / ${2 * pairs.length} glyphs, ` +
    `${per(pcost)} px/frame, ${per(pcols)} cols/frame`);
  console.log(`      colour writes: ${(pminority / FRAMES).toFixed(2)} cells/frame need the non-default half`);
}

const out = {
  source: 'charsetgen', frames: FRAMES, totalCells: TOTAL,
  floorPx: FLOOR, floorCols: FLOORC, buckets: B.length, kcell: KCELL,
  shippedPx: scan.shippedPx, shippedCols: scan.shippedCols,
  codes: finalPlan.codes, assign: [...finalPlan.assign],
  costPx: finalPlan.cost, costCols: finalPlan.cols,
  paired,
};
writeFileSync('./charset-plan.json', JSON.stringify(out));
console.log(`  wrote charset-plan.json`);
