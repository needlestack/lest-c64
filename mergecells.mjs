// Merge the reachable cell shapes found by CELLSCAN, folding near-duplicates into their more
// common neighbour. Reads cellscan.json so it can be re-run in a second without repeating the
// 9s walkthrough: `CELLSCAN=1 CELLSTEP=0.2 CELLANG=1 node build-iray.mjs` first.
//
// "1 pixel difference" means the L1 distance, not the Hamming distance the charset code uses.
// hamm counts how many of the four COLUMNS differ at all, so [0,0,0,1] and [0,0,0,8] are both
// "distance 1" to [0,0,0,0] -- one is invisible and the other is a solid black column. L1 sums
// |level difference| per column, so L1 == 1 means exactly one column, moved by exactly one
// pixel row. That is the tightest merge that can be said to change nothing anyone can see.
//
// DRIFT bounds the damage. Merging is transitive -- fold a into b, then b into c, and a is now
// drawn as c -- so a chain of individually-invisible steps is not itself invisible. Every
// original shape is kept within DRIFT pixels of what finally gets drawn for it; DRIFT=1 keeps
// the promise the merge rule makes, and higher values are offered priced rather than assumed.
import { readFileSync } from 'fs';

const DRIFT = +(process.env.DRIFT ?? 1);
const SRC = process.argv[2] ?? './cellscan.json';
const scan = JSON.parse(readFileSync(SRC, 'utf8'));

const parse = k => k.split(',').map(Number);
const L1 = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) +
                     Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]);

// live[key] = { n, members } -- members are the ORIGINAL shapes now drawn as `key`.
const live = new Map();
for (const s of scan.shapes) live.set(s.p, { n: s.n, members: [s.p], vec: parse(s.p) });
const totalCells = [...live.values()].reduce((a, e) => a + e.n, 0);
const START = live.size;
const freqOf0 = new Map(scan.shapes.map(s => [s.p, s.n]));   // ORIGINAL counts, before folding

// Neighbour lookup: a shape at L1 == 1 differs in exactly one column by exactly one, so there
// are at most 8 of them and they can be named directly rather than searched for. O(n) a round
// instead of O(n^2) -- 1546 shapes is small, but this also makes the round order deterministic.
const neighbours = v => { const out = [];
  for (let i = 0; i < 4; i++) for (const d of [-1, 1]) {
    const w = v.slice(); w[i] += d;
    if (w[i] < 0 || w[i] > 8) continue;
    if (w.every(x => x === 0) || w.every(x => x === 8)) continue;   // BLANK/SOLID need no code
    out.push(w.join(','));
  }
  return out; };

// TARGET=N merges to an exact code budget instead of a uniform drift cap. A flat cap spends the
// same allowance on a shape drawn 400,000 times and one drawn twice; ranking by n*d (cells
// affected x pixels wrong) buys the cheapest reduction first, which is the same rule the
// existing ramp merge uses. DRIFT still applies as a hard ceiling on any single shape.
const TARGET = +(process.env.TARGET ?? 0);
let round = 0, merged = 0;
const history = [];
if (TARGET) {
  for (;;) {
    if (live.size <= TARGET) break;
    // cheapest available fold across the whole set, not the rarest shape's best option
    let pick = null;
    for (const [key, e] of live) {
      for (const nk of neighbours(e.vec)) {
        const t = live.get(nk);
        if (!t || nk === key) continue;
        if (t.n < e.n || (t.n === e.n && nk < key)) continue;
        if (e.members.some(m => L1(parse(m), t.vec) > DRIFT)) continue;
        const c = e.members.reduce((a, m) => a + (freqOf0.get(m) ?? 0) * L1(parse(m), t.vec), 0);
        if (!pick || c < pick.c) pick = { key, nk, c, t, e };
      }
    }
    if (!pick) break;                       // nothing left that respects DRIFT
    pick.t.n += pick.e.n;
    pick.t.members.push(...pick.e.members);
    live.delete(pick.key);
    merged++;
  }
  history.push([1, live.size, merged]);
}
for (; !TARGET;) {
  // Ascending frequency: the rarest shape is the one that should give way. Ties broken by key
  // so a re-run produces the same charset -- a build that reshuffles codes on identical input
  // is one you cannot diff.
  const order = [...live.entries()].sort((a, b) => a[1].n - b[1].n || (a[0] < b[0] ? -1 : 1));
  let did = 0;
  for (const [key, e] of order) {
    if (!live.has(key)) continue;                       // already folded away this round
    let best = null;
    for (const nk of neighbours(e.vec)) {
      const t = live.get(nk);
      if (!t || nk === key) continue;
      if (t.n < e.n || (t.n === e.n && nk < key)) continue;         // only into a COMMONER one
      // every original that would land on nk must stay inside the drift budget
      if (e.members.some(m => L1(parse(m), t.vec) > DRIFT)) continue;
      if (!best || t.n > best.n) best = t, best.key = nk;
    }
    if (!best) continue;
    best.n += e.n;
    best.members.push(...e.members);
    live.delete(key);
    did++; merged++;
  }
  history.push([++round, live.size, did]);
  if (!did) break;
}

// What it costs: every original shape is now drawn as its representative.
// Two units, because the rest of the toolchain speaks COLUMNS (hamm: how many of the four
// columns differ at all) and this merge is defined in PIXELS (L1). Reporting only one makes it
// impossible to compare a direct shape table against the endpoint model CELLSCAN prices.
const hamm = (a, b) => (a[0] !== b[0]) + (a[1] !== b[1]) + (a[2] !== b[2]) + (a[3] !== b[3]);
const freqOf = freqOf0;
let cost = 0, costCols = 0, worst = 0, moved = 0, movedCells = 0;
const examples = [];
for (const [key, e] of live) for (const m of e.members) {
  if (m === key) continue;
  const mv = parse(m), d = L1(mv, e.vec), dc = hamm(mv, e.vec);
  const n = freqOf.get(m);
  cost += n * d; costCols += n * dc; moved++; movedCells += n;
  if (d > worst) worst = d;
  examples.push({ from: m, to: key, d, n });
}
examples.sort((a, b) => b.n * b.d - a.n * a.d);

const FRAMES = scan.positions * Math.ceil(256 / scan.angleStride);
const pct = x => (100 * x / totalCells).toFixed(2);
console.log(`mergecells  DRIFT=${DRIFT}  (${SRC}: ${scan.positions} positions x ` +
  `${Math.ceil(256 / scan.angleStride)} angles, ${totalCells.toLocaleString()} mixed cells)`);
console.log(`  shapes ${START} -> ${live.size}   (${merged} folded away, ` +
  `${TARGET ? `cheapest-first to TARGET=${TARGET}` : `${Math.max(0, round - 1)} rounds`})`);
console.log(`  rounds (round: shapes left, merged this round): ` +
  history.map(([r, s, d]) => `${r}:${s}/-${d}`).join('  '));
console.log(`  cells drawn as a neighbour: ${movedCells.toLocaleString()} (${pct(movedCells)}%)`);
console.log(`  cost ${(cost / FRAMES).toFixed(4)} wrong PIXELS/frame, ` +
  `${(costCols / FRAMES).toFixed(4)} wrong COLUMNS/frame, worst shape off by ${worst} pixel(s)`);
console.log(`  (for scale: one mixed cell is 4 columns x 8 rows, ${(totalCells / FRAMES).toFixed(1)} mixed cells/frame)`);
console.log(`  vs the SHIPPED engine on the same walkthrough: ${scan.shippedCols?.toFixed(4) ?? '?'} wrong COLUMNS/frame, ` +
  `${scan.shippedPx?.toFixed(4) ?? '?'} wrong PIXELS/frame (endpoint model + ${scan.cellCodes ?? '?'} codes)`);
console.log(`  biggest single folds:`);
for (const x of examples.slice(0, 12))
  console.log(`    [${x.from}] -> [${x.to}]  ${String(x.n).padStart(8)} cells  off ${x.d}px`);

// The whole point is the code budget, so say what it means for the charset.
console.log(`\n  charset: ${live.size} codes would cover every reachable shape exactly-or-within-${DRIFT}px.`);
console.log(`  Budget on this branch is 213/256 used, 43 free; cell patterns hold ${191} codes.`);
