// Choose a charset by frequency-weighted k-medians, from the bucket histograms CELLSCAN dumps.
//
//   CELLSCAN=1 CELLSTEP=0.2 CELLANG=1 node src/build-iray.mjs && node src/charsetgen.mjs
//
// WHY NOT THE GREEDY MERGE of the earlier mergecells.mjs (since removed). That folds a rare shape into whichever L1==1
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
import { ROOT } from './paths.mjs';
process.chdir(ROOT);   // paths below are repo-relative (see src/paths.mjs)

const scan = JSON.parse(readFileSync('./build/cellscan.json', 'utf8'));
// KCELL is what is left for cell patterns after BLANK, SOLID, the 18 readout glyphs and the 4
// seam codes: 256 - 2 - 18 - 4 = 232. BLANK and SOLID are not in the codebook -- they answer the
// all-white and all-black cells, which are not "mixed" and never reach a bucket.
//
// Declared HERE, above every consumer. It used to sit at the bottom, below the finer-index loop
// that quantises the codebook PLAN=3 actually ships -- and that loop had 232 hardcoded twice. So
// setting KCELL resized the PLAN=1 codebook, which the shipping build does not use, and silently
// left PLAN=3 at 232. It looked like it worked: the plan file changed and the build did not.
// 219, not 232: THIRTEEN codes are reserved for the sprite occluders -- one all-foreground-black
// cell plus the six vertical splits (boundary at column 1, 2 or 3 x which side is foreground).
// ... plus six more of those splits backed by WHITE rather than black, for a cell straddling a
// wall's vertical silhouette, where beyond the edge is floor or ceiling and painting it black
// would blot out the corridor. Measured cost of the thirteen: the shipped codebook goes 97.570%
// -> 97.459% accurate, and 0.019 -> 0.020 predicted px/frame, against 445.194 pre-plan.
// charset-plan.json is derived and untracked, so this default IS the reservation: regenerating
// with 232 would build a plan the occluders have no room in.
// 207: the seam codes are 16 -- 4 singles and 12 sub-cell starts (rows 2/4/6 x 4 columns). The
// six two-line PAIRS are gone: two lines closer than a cell now collapse to the nearer one, so
// 0.020 -> 0.020 px/frame against a shipped 445, so the six cost nothing measurable.
// 197, not 207: OCCSYN_N went 6 -> 8 so the occluder synthesiser gets four scratch codes per
// screen buffer instead of three, and those come off the top of the charset. 207 fitted 201 cell
// codes into 250 of 256; 197 fits 199 into 248, leaving the 8. Cost on the 2M scan: predicted
// error 6,932,472 -> 6,963,243 px over 512M frames, i.e. 0.014 px/frame either way -- the tail of
// this codebook is nearly free, which is the whole point of the char-headroom measurement.
// charset-plan.json is derived and untracked, so THIS DEFAULT IS THE RESERVATION: regenerating
// at 207 builds a plan the eight scratch codes have no room in, and the build's charset guard
// fires rather than anything silently overlapping.
// 189, not 197: eight EDGE splits that keep a corner line under an occluder stamp (SEDGE in the
// build, 2026-10-13) -- the line used to vanish wherever an entity passed behind a wall's edge.
// The SHIPPED plan was not refit for them: tools/dropcodes.mjs took eight codes out of it (a fresh scan
// does not reproduce the shipped one). 189 here keeps a regenerated plan inside the same room.
const KCELL = +(process.env.KCELL ?? 189);
const FRAMES = scan.positions * Math.ceil(256 / scan.angleStride);
const parse = k => k.split(',').map(Number);
const L1 = (a, b) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) + Math.abs(a[3]-b[3]);
const hamm = (a, b) => (a[0]!==b[0]) + (a[1]!==b[1]) + (a[2]!==b[2]) + (a[3]!==b[3]);

// ---- buckets: what the engine is forced to answer in one code
// STEPA=1: a step bucket's ANSWER is the formula's shape, not a median of what landed in it.
// So that is what the codebook must CONTAIN -- otherwise the engine looks up a shape nobody
// allocated a code for and nearestCode lands somewhere arbitrary, which is what "wrong corners"
// looked like. The demand is the formula shape, weighted by how many cells the bucket serves.
const STEPA = process.env.STEPA === '1';
const { QA, QM, QB, LM, LB } = scan;
const C8 = x => Math.max(0, Math.min(8, x));
const lerp = (v0, v1, n) => [...Array(n)].map((_, i) => n < 2 ? v0 : Math.round(v0 + (v1 - v0) * i / (n - 1)));
const stepAPat = (k, slot) => { const kb = k + 1;
  const a = QA[Math.floor(slot / (LM * LB))], r = slot % (LM * LB);
  const m = QM[Math.floor(r / LB)], b = QB[r % LB];
  return (kb === 1 ? [a, ...lerp(m, b, 3)] : [...lerp(a, m, kb), ...Array(4 - kb).fill(b)]).map(C8); };
const B = scan.buckets.map(([key, hist]) => {
  let shapes = hist.map(([s, n]) => ({ v: parse(s), n }));
  const n = shapes.reduce((a, s) => a + s.n, 0);
  if (STEPA && key[0] === 's') {
    const [k, slot] = [+key[1], +key.slice(3)];
    shapes = [{ v: stepAPat(k, slot), n }];
  }
  return { key, kind: key[0] === 'r' ? 'ramp' : 'step', shapes, n };
});
if (STEPA) console.log(`  STEPA: ${B.filter(b => b.kind === 'step').length} step buckets ` +
  `demand their formula shape, ${new Set(B.filter(b => b.kind === 'step')
    .map(b => b.shapes[0].v.join(','))).size} distinct`);

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

// ---- ONE accuracy number, used for every comparison from here on.
//
// Two error measures matter and neither alone is honest. Wrong PIXELS says how far the drawn
// silhouette is displaced; wrong COLUMNS says how widely. A column off by 8 pixels and one off
// by 1 are equally "a wrong column", and 8 pixels spread over 8 columns is far more visible
// than 8 pixels stacked in one. So normalise each against its own worst case and average:
//
//   P = wrong pixels  / (32 * mixed cells)     a cell has 4 columns x 8 rows to get wrong
//   C = wrong columns / (4  * mixed cells)     a cell has 4 columns to get wrong AT ALL
//   accuracy = 100 - 100*(P + C)/2
//
// It is an INDEX, not a physical quantity -- the point is that one number ranks every scheme on
// one scale. px/frame and cols/frame stay in the output as the inputs to it, so the index can
// never quietly drift from what it is made of.
const acc = (px, cols) => 100 - 100 * (px / (32 * TOTAL) + cols / (4 * TOTAL)) / 2;
const A = (px, cols) => acc(px, cols).toFixed(3) + '%';
const per = (v) => (v / FRAMES).toFixed(3);
console.log(`charsetgen  ${B.length} reachable buckets ` +
  `(${B.filter(b => b.kind === 'ramp').length} ramp, ${B.filter(b => b.kind === 'step').length} step), ` +
  `${TOTAL.toLocaleString()} mixed cells over ${FRAMES.toLocaleString()} frames`);
const shipPx = scan.shippedPx * FRAMES, shipCols = scan.shippedCols * FRAMES;
console.log(`\n  scheme                                accuracy    px/frame  cols/frame  codes`);
console.log(`  SHIPPED today                         ${A(shipPx, shipCols).padStart(8)}    ` +
  `${scan.shippedPx.toFixed(3).padStart(8)}  ${scan.shippedCols.toFixed(3).padStart(10)}    191`);
console.log(`  FLOOR (one code per bucket)           ${A(FLOOR, FLOORC).padStart(8)}    ` +
  `${per(FLOOR).padStart(8)}  ${per(FLOORC).padStart(10)}    ${B.length}`);
console.log(`     -- that is what the ADDRESSING costs. No charset can beat it without changing`);
console.log(`        how a cell is indexed, and it is already better than today with no merging.`);

// ---- the split the request asks for, and the shared codebook it is competing with
const ramps = B.filter(b => b.kind === 'ramp'), steps = B.filter(b => b.kind === 'step');
const PLANS = (process.env.PLANS || '128:96,110:114,96:128,140:84,160:64').split(',')
  .map(p => p.split(':').map(Number));

console.log(`\n  SPLIT budgets (ramp codes : step codes) -- separate codebooks:`);
console.log(`    ramp  step  total   accuracy   px/frame  cols/frame`);
const results = [];
for (const [kr, ks] of PLANS) {
  const r = best(ramps, kr), s = best(steps, ks);
  const px = r.cost + s.cost, cols = r.cols + s.cols;
  const tot = r.codes.length + s.codes.length;
  results.push({ kr, ks, tot, px, cols, r, s });
  console.log(`    ${String(r.codes.length).padStart(4)}  ${String(s.codes.length).padStart(4)}  ` +
    `${String(tot).padStart(5)}   ${A(px, cols).padStart(8)}   ${per(px).padStart(8)}   ${per(cols).padStart(8)}`);
}

console.log(`\n  SHARED codebook -- one pool both tables index into:`);
console.log(`    codes   accuracy   px/frame  cols/frame`);
const shared = [];
for (const K of (process.env.SHARED || '160,190,214,224,234').split(',').map(Number)) {
  const a = best(B, K);
  shared.push({ K, a });
  console.log(`    ${String(a.codes.length).padStart(5)}   ${A(a.cost, a.cols).padStart(8)}   ${per(a.cost).padStart(8)}   ${per(a.cols).padStart(8)}`);
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

// ---- Is the win ADDRESSING or GLYPHS? The colour trick changes both at once -- it doubles the
// index (one extra bit per cell) and doubles the glyphs (two per code) -- so on its own it
// cannot say which one is doing the work. This isolates the addressing half: split every bucket
// by the same w1+w2 threshold to get a FINER INDEX, then quantise those sub-buckets down to the
// SAME 232 codes. No pairing, no nesting constraint, no colour RAM writes -- just a bigger
// table feeding the same charset.
let fine = null;
{
  const B2 = [], fthr = new Map();
  for (const b of B) {
    let bt = null, bc = Infinity;
    for (let thr = 0; thr <= 17; thr++) {
      const hi = b.shapes.filter(x => x.v[1] + x.v[2] >= thr), lo = b.shapes.filter(x => x.v[1] + x.v[2] < thr);
      if (!hi.length || !lo.length) continue;
      const c = costOf(hi, median(hi)) + costOf(lo, median(lo));
      if (c < bc) { bc = c; bt = thr; }
    }
    // thr 0 compares true for every m, so a bucket that would not split answers from its HI
    // half and its LO half is never reached -- same result as not splitting, no special case.
    fthr.set(b.key, bt === null ? 0 : bt);
    if (bt === null) { B2.push({ ...b, key: b.key + '.h' }); continue; }
    const hi = b.shapes.filter(x => x.v[1] + x.v[2] >= bt), lo = b.shapes.filter(x => x.v[1] + x.v[2] < bt);
    B2.push({ key: b.key + '.h', kind: b.kind, shapes: hi, n: hi.reduce((a, x) => a + x.n, 0) });
    B2.push({ key: b.key + '.l', kind: b.kind, shapes: lo, n: lo.reduce((a, x) => a + x.n, 0) });
  }
  for (const b of B2) if (!b.ideal) { b.ideal = median(b.shapes); b.floor = costOf(b.shapes, b.ideal); }
  const f2 = B2.reduce((a, b) => a + b.floor, 0);
  const f2c = B2.reduce((a, b) => a + costCols(b.shapes, b.ideal), 0);
  console.log(`\n  ISOLATING the two halves of what PLAN=2 changes:`);
  console.log(`    finer index, ${B2.length} sub-buckets, unlimited codes   ` +
    `${A(f2, f2c).padStart(8)}    ${per(f2).padStart(8)}  ${per(f2c).padStart(10)}`);
  for (const K of [KCELL, 2 * KCELL]) {
    const r = best(B2, K, 8);
    console.log(`    finer index, quantised to ${String(K).padStart(3)} codes        ` +
      `${A(r.cost, r.cols).padStart(8)}    ${per(r.cost).padStart(8)}  ${per(r.cols).padStart(10)}`);
    if (K === KCELL) fine = { codes: r.codes, assign: [...r.assign], thr: [...fthr],
                            cost: r.cost, cols: r.cols, acc: acc(r.cost, r.cols) };
  }
}

// ---- write the plan the build consumes.
// KCELL is what is left for cell patterns after BLANK, SOLID, the 18 readout glyphs and the 4
// seam codes: 256 - 2 - 18 - 4 = 232. BLANK and SOLID are not in the codebook -- they answer
// the all-white and all-black cells, which are not "mixed" and never reach a bucket.
const PAIRED = process.env.PAIRED === '1';

const finalPlan = best(B, KCELL, 10);
console.log(`  PLAN=1 (KCELL=${KCELL}, single glyph)  ${A(finalPlan.cost, finalPlan.cols).padStart(8)}    ` +
  `${per(finalPlan.cost).padStart(8)}  ${per(finalPlan.cols).padStart(10)}    ${finalPlan.codes.length}`);

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
  console.log(`  PLAN=2 (KCELL=${KCELL}, nesting pairs) ${A(pcost, pcols).padStart(8)}    ` +
    `${per(pcost).padStart(8)}  ${per(pcols).padStart(10)}    ${pairs.length} codes = ${2 * pairs.length} glyphs`);
  console.log(`      colour writes: ${(pminority / FRAMES).toFixed(2)} cells/frame need the non-default half`);
}

const out = {
  source: 'charsetgen', frames: FRAMES, totalCells: TOTAL,
  floorPx: FLOOR, floorCols: FLOORC, buckets: B.length, kcell: KCELL,
  shippedPx: scan.shippedPx, shippedCols: scan.shippedCols,
  codes: finalPlan.codes, assign: [...finalPlan.assign], fine,
  costPx: finalPlan.cost, costCols: finalPlan.cols, acc: acc(finalPlan.cost, finalPlan.cols),
  paired,
};
writeFileSync('./data/charset-plan.json', JSON.stringify(out));
console.log(`  wrote charset-plan.json`);
