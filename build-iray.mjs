// build-iray.mjs — char-framebuffer raycaster for a stock C64. Emits iray.asm, assembles
// it, and writes latest.d64. The engine, top to bottom:
//
//   castRay     8-bit integer DDA, one ray per connected-wall-run boundary rather than
//               per column -- adaptive subdivision, so ~25 rays cover 160 columns.
//               Cosine correction is folded into the height tables, not applied per ray.
//   interpSpan  Bresenham-interpolates colH across each span between two cast rays.
//               8-bit error term, promoted to 16-bit only when dxv+dyv can exceed 255.
//   prepCells   per 4-column cell: min/max of colH, and the cap at 100. Hoisted out of
//               renderSym so the 495-of-520 fully-solid/blank cells reject cheaply.
//   renderSym   picks a char per cell (blank / solid / ramp / step) and fills the runs
//               above and below via unrolled store chains, column-major.
//
// 160x200 logical pixels in multicolor 4x8 cells, mirrored about the horizon so one char
// code serves both halves. 8-bit DDA throughout. ESDF turn/move, joystick up/down = fwd/back.
// Diagnostic knobs are collected in DIAG below; MEASURE=1 -> flat-out + fps counter.
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { assemble } from './asm6502.mjs';
await import('./d64lib.js');
const D64 = globalThis.D64;
const chunk = (arr, per = 24, ind = '        ') => { const o = []; for (let i = 0; i < arr.length; i += per) o.push(ind + '!byte ' + Array.from(arr.slice(i, i + per)).join(',')); return o.join('\n'); };


const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r => r.split('').map(Number));
const map = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) map.push(M[y][x]);

// 16-bit fixed point: 256 units = 1 cell (8.8). deltaDist = 256/|dir|, clamp 65535.
const SCALE = 256;
const ddxLo = [], ddxHi = [], ddyLo = [], ddyHi = [], posX = [], posY = [];
for (let a = 0; a < 256; a++) {
  const cx = Math.cos(a / 256 * 2 * Math.PI), sy = Math.sin(a / 256 * 2 * Math.PI);
  const dx = Math.min(65535, Math.round(SCALE / Math.max(1e-3, Math.abs(cx))));
  const dy = Math.min(65535, Math.round(SCALE / Math.max(1e-3, Math.abs(sy))));
  ddxLo.push(dx & 255); ddxHi.push(dx >> 8); ddyLo.push(dy & 255); ddyHi.push(dy >> 8);
  posX.push(cx >= 0 ? 1 : 0); posY.push(sy >= 0 ? 1 : 0);
}
// FINEANG=1: the DDA deltas at QUARTER-angle resolution, 1024 entries instead of 256.
// The angle byte gives only 48 distinct ray directions across 160 columns, so 3-5 adjacent
// columns march the identical ray and a wall's far end can only sit on a run edge -- it jumps a
// whole character instead of scrolling. Two fractional bits make every column distinct.
//
// ONLY these four tables grow. absSinT/absCosT feed u for seams, which is already +-1-2
// columns, so they stay on the integer angle; posXT/posYT likewise, for calcU's own ssAng.
// castRay itself no longer forms a coarse angle at all -- its step signs come from rqH.
// ON by default: the byte angle gave only 48 distinct ray directions across 160 columns, which
// made every wall's far end jump a whole character instead of scrolling. FINEANG=0 restores it.
const FINEANG = process.env.FINEANG !== '0';

const ddxLoQ = [], ddxHiQ = [], ddyLoQ = [], ddyHiQ = [];
for (let q = 0; q < 1024; q++) {
  const cx = Math.cos(q / 1024 * 2 * Math.PI), sy = Math.sin(q / 1024 * 2 * Math.PI);
  const dx = Math.min(65535, Math.round(SCALE / Math.max(1e-3, Math.abs(cx))));
  const dy = Math.min(65535, Math.round(SCALE / Math.max(1e-3, Math.abs(sy))));
  ddxLoQ.push(dx & 255); ddxHiQ.push(dx >> 8); ddyLoQ.push(dy & 255); ddyHiQ.push(dy >> 8);
}
const NLOG = 160, FOV = 47;             // one ray per output column (160 logical cols)
const NCELL = NLOG / 4;                 // 4x8 cells across the screen (40)
// Span delimiters the subdivision may pin. Was NLOG/8 = 20, which the COARSE angle table never
// reached: 3-5 adjacent columns shared a ray, so boundaries that fell inside a run were invisible
// and merged. FINEANG resolves them, the list fills, and everything past the overflow is left as
// the search happened to leave it -- 100+ rows of wrong wall, always at the right of the screen
// because that is what gets searched last. bndT owns a whole page, so the cap was never about
// space. The build reports the worst SAMPLED frame so this cannot silently re-fill.
const NBND = +(process.env.NBND ?? (FINEANG ? 64 : NLOG / 8));
// RECTILINEAR projection: columns spaced by atan (flat image plane) + per-column
// cos-correction of the distance. Fixes the fisheye arch AND makes wall height linear.
const CTR = (NLOG - 1) / 2, HALF_UNITS = FOV / 2, TANHALF = Math.tan(HALF_UNITS / 256 * 2 * Math.PI);
const rayOff = [], cosCorr = [], rayOffQ = [];
for (let c = 0; c < NLOG; c++) {
  const camX = (c - CTR) / CTR * TANHALF;
  rayOff.push(Math.round(Math.atan(camX) / (2 * Math.PI) * 256) & 255);
  rayOffQ.push(Math.round(Math.atan(camX) / (2 * Math.PI) * 1024));   // signed, |v| < 128
  cosCorr.push(Math.min(255, Math.round(256 / Math.sqrt(1 + camX * camX))));
}
// ---- PIVOT: seed the subdivision from where last frame's boundaries have moved to ----
// The subdivision bisects, so it spends ~7.3 marches locating each boundary from scratch every
// frame -- and boundaries barely move between frames. Predict each one forward and start the
// search from a ONE-COLUMN bracket around the prediction instead of from the whole screen.
// Modelled in analyze-pivot.mjs at 22.6 -> 15.0 marches a frame (-33%), 0 boundaries lost.
//
// It cannot lose a boundary, structurally: the extra cut points only ever SPLIT a span, and
// every sub-span still gets the same face-id test, so this finds a superset of what bisection
// finds. A bad prediction costs probes, never pixels -- which is what makes w=0 safe.
//
// prediction (all fixed point, see analyze-pivot.mjs where the scales were verified):
//   q' = rayOffQS[c] - dqa + ((dxv*sin(a) - dyv*cos(a)) * rcp + 2^14 >> 15)
//        \___ where it was ___/  \_ rotation _/  \______ translation, first order ______/
// then qToColT turns q' back into a column. The 2^14 is a ROUND: a bare >>15 truncates toward
// -inf, which is -0.4 of a column every frame and at w=0 there is no slack for it.
// Requires FINEANG (for rayOffQS) and PLAN=3 (for the three table pages it frees; see the
// emission site). Both are the defaults, so this is on unless something else is being tested.
const PIVOT = FINEANG && +(process.env.PLAN ?? 3) === 3 && process.env.PIVOT !== '0';
// PIVTRANS=0 zeroes the translation delta, leaving the rotation-only prediction. Not a tuning
// knob -- it is the A/B that says whether the translation term earns the two multiplies, and
// the only way to tell a WORKING translation term from a broken one, since a broken one cannot
// corrupt the image (extra cuts only split spans) and shows up purely as lost rays.
const PIVTRANS = process.env.PIVTRANS !== '0';
// signed sin * 128, by BYTE angle. absSinT/absCosT hold the magnitudes but put the sign in a
// separate table, which is a second lookup and a branch on a path that multiplies twice per
// boundary per frame. Only SIN is stored: cos(a) = sin(a + 64) at 256 units to the turn, and
// the quarter-turn add is four cycles against a whole page of table -- which matters, because
// the three pages below are exactly the three the step tables vacate under PLAN=3.
const sinS = [];
for (let a = 0; a < 256; a++)
  sinS.push(Math.max(-128, Math.min(127, Math.round(Math.sin(a / 256 * 2 * Math.PI) * 128))) & 255);
// quarter-unit offset (+128 bias) -> column. The inverse of rayOffQS, and the reason the
// prediction needs no divide: the rectilinear spacing is baked in here rather than solved for.
// Offsets outside the FOV clamp to the screen edge, which is what should happen to a boundary
// that has rotated off screen -- it lands on column 0 or 159 and merges away.
const qToCol = [...Array(256)].map((_, i) => {
  const q = i - 128, camX = Math.tan(q / 1024 * 2 * Math.PI);
  return Math.max(0, Math.min(NLOG - 1, Math.round(CTR + camX / TANHALF * CTR)));
});
// 163/d as a byte, indexed by d in 1/16-cell steps. 163 is what makes the final shift 2^15.
// Saturates at d = 0.639 cells; nearer than that the correction is under-applied and that
// boundary falls back to bisection, which the structural argument above makes harmless.
const RCPK = 163;
const rcpD = [...Array(256)].map((_, i) =>
  i === 0 ? 255 : Math.max(1, Math.min(255, Math.round(RCPK * 16 / i))));
// Half-height from distance. Indexed by perpDist>>3 (1/32-cell units); 88 half-px at one
// cell. Left UNCAPPED at 254 so merged spans interpolate the true (linear) height --
// prepCells caps at 100 on draw.
//
// The rectilinear cos correction depends ONLY on the column, never on the player, so it is
// folded in here rather than multiplied onto every ray's distance. That deletes one whole
// sideMul (two 8x16 multiplies) per ray, which was ~16% of castRay. Cost is one table per
// quantised cosine group: 16 groups keeps the drawn-height error to at most 1px (measured
// over every column x distance pair), for 12KB.
//
// Each group covers 768 entries = exactly 3 pages, so the asm picks a group by ADDING a
// page offset -- no multiply, no shifts. 768 entries spans 24 cells, more than the 22.6
// cell diagonal of a 16x16 map, so nothing in range is ever clamped away (the old code
// clamped past 16 cells and drew those walls at height 1).
const HGROUPS = 16, HSPAN = 768;
const ccLo = Math.min(...cosCorr), ccHi = Math.max(...cosCorr);
const hGrpOf = cosCorr.map(v => Math.min(HGROUPS - 1, Math.floor((v - ccLo) / (ccHi - ccLo + 1e-9) * HGROUPS)));
const hRep = [...Array(HGROUPS)].map((_, g) => { const m = cosCorr.filter((_, i) => hGrpOf[i] === g);
  return m.length ? Math.round((Math.min(...m) + Math.max(...m)) / 2) : ccLo; });
const colGrpT = hGrpOf.map(g => g * 3);         // page offset of this column's group
const hTab = [];
for (let g = 0; g < HGROUPS; g++) for (let j = 0; j < HSPAN; j++)
  hTab.push(Math.max(0, Math.min(254, Math.round(2816 / (Math.max(1, j) * hRep[g] / 256)))));

// ===== connected-wall-run ids =====
// "Same wall" = same CONTIGUOUS run of wall faces, not merely the same plane. Two wall
// segments split by a hallway are different runs -> the merge won't span the gap. A run =
// maximal contiguous wall cells along a plane whose facing side is open (so the face is one
// visible flat surface). Four face directions; each cell gets the run id for the face a ray
// would hit from that side. This makes the face-merge exact (no gap-fill) with no precompute.
// castRay drops its bounds check and steps a single cell index by +-1 / +-16, both of
// which are only safe because a ray can never leave the grid. That holds iff the border is
// solid all the way round -- assert it rather than trust it.
for (let i = 0; i < 16; i++) {
  if (!map[i] || !map[15 * 16 + i] || !map[i * 16] || !map[i * 16 + 15])
    throw new Error(`map border must be solid: castRay has no bounds check (row/col ${i} is open)`);
}
const mapW = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? 1 : map[y * 16 + x];
const runW = new Array(256).fill(0), runE = new Array(256).fill(0), runN = new Array(256).fill(0), runS = new Array(256).fill(0);
let nextRun = 1;
// Every run lies in ONE plane and faces one way -- W runs are a vertical strip at constant x,
// N runs a horizontal strip at constant y. runPlane is the coordinate, runFace which side is
// the visible one; the seam pass uses both to place a panel line at the right column.
const runPlane = [0], runFace = [0];    // index by run id; 0 is "no run"
const newRun = (plane, face) => { runPlane[nextRun] = plane; runFace[nextRun] = face; return nextRun++; };
for (let x = 0; x < 16; x++) {          // vertical planes: west/east faces, contiguous in y
  let wp = false, ep = false, wId = 0, eId = 0;
  for (let y = 0; y < 16; y++) {
    const wf = mapW(x, y) && !mapW(x - 1, y), ef = mapW(x, y) && !mapW(x + 1, y);
    if (wf) { if (!wp) wId = newRun(x, 'W'); runW[y * 16 + x] = wId; } wp = wf;
    if (ef) { if (!ep) eId = newRun(x + 1, 'E'); runE[y * 16 + x] = eId; } ep = ef;
  }
}
for (let y = 0; y < 16; y++) {          // horizontal planes: north/south faces, contiguous in x
  let np = false, sp = false, nId = 0, sId = 0;
  for (let x = 0; x < 16; x++) {
    const nf = mapW(x, y) && !mapW(x, y - 1), sf = mapW(x, y) && !mapW(x, y + 1);
    if (nf) { if (!np) nId = newRun(y, 'N'); runN[y * 16 + x] = nId; } np = nf;
    if (sf) { if (!sp) sId = newRun(y + 1, 'S'); runS[y * 16 + x] = sId; } sp = sf;
  }
}
if (nextRun - 1 > 255) throw new Error(`too many wall runs (${nextRun - 1}) for a byte id`);
console.error(`connected-wall-run ids: ${nextRun - 1} (byte-sized) — merge by run, gap-safe, no precompute`);

// ---- CONVEX run ends carry no seam ----
// A seam at the end of a receding wall marks a corner you cannot see around, and the
// silhouette there already steps 20+ rows (measured: 21/22/25/27 across the six views), so the
// line is redundant -- it draws a grey divider across a boundary the 20-row jump has already
// made unmistakable. Dropping these makes every convex corner a plain two-black step.
//
// A run ends because the next cell along its strip is open (the wall simply stops -> CONVEX,
// you see past the edge) or solid (the wall turns and another face meets it -> CONCAVE). The
// concave ones MUST keep their seam: there the two faces sit at nearly the same depth (median
// step 2 rows) so it is black meeting black, and the grey line is the only thing dividing them.
//
// A CONVEX end keeps its line too, but only when BOTH of its faces are visible -- when the
// player is past the plane of both walls and the outside corner protrudes toward them, the two
// faces genuinely meet on screen and that edge needs dividing. What must lose its line is the
// convex corner facing AWAY, where only one face is visible and the boundary is a pure
// silhouette against an unrelated wall behind it.
//
// Both cases collapse to the same cheap test, because the run on the far side of the boundary
// says which it is. The test has to run where corners are marked, in subFace, and there the two
// runs either side are all that is in hand -- not a coordinate. So enumerate the PARTNER of each
// run end:
//   concave end (next cell solid, the wall turns): the perpendicular face that meets it, found
//     at a corner of an OPEN cell whose two adjoining cells are both solid;
//   convex end (next cell open, the wall stops): the perpendicular face of the run's OWN end
//     cell, which is the other half of the protruding corner.
// If the run across the boundary is that partner, both faces are visible and the line stays.
// If it is anything else, the wall behind is unrelated and the boundary is a silhouette.
//
// Every run end has exactly ONE partner, so a run has at most two -- two bytes, two compares.
const cpLo = new Array(nextRun).fill(0), cpHi = new Array(nextRun).fill(0);
{
  const addPair = (a, b) => {
    if (!a || !b || a === b) return;
    for (const [x, y] of [[a, b], [b, a]]) {
      if (cpLo[x] === y || cpHi[x] === y) continue;
      if (!cpLo[x]) cpLo[x] = y; else if (!cpHi[x]) cpHi[x] = y;
      else throw new Error(`run ${x} has more than two corner partners`);
    }
  };
  // concave ends: an inside corner, seen from an open cell with two solid neighbours
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (mapW(x, y)) continue;
    const W_ = mapW(x - 1, y), E_ = mapW(x + 1, y), N_ = mapW(x, y - 1), S_ = mapW(x, y + 1);
    if (W_ && N_) addPair(runE[y * 16 + (x - 1)], runS[(y - 1) * 16 + x]);
    if (E_ && N_) addPair(runW[y * 16 + (x + 1)], runS[(y - 1) * 16 + x]);
    if (W_ && S_) addPair(runE[y * 16 + (x - 1)], runN[(y + 1) * 16 + x]);
    if (E_ && S_) addPair(runW[y * 16 + (x + 1)], runN[(y + 1) * 16 + x]);
  }
  // convex ends: the wall stops, and its own end cell's perpendicular face turns the corner.
  // Pairing them keeps the line when the player sees BOTH faces of that protruding edge, and
  // drops it when the far side is an unrelated wall -- the corner facing away from the view.
  const ARR = { W: runW, E: runE, N: runN, S: runS };
  for (let r = 1; r < nextRun; r++) {
    const f = runFace[r], arr = ARR[f], vert = (f === 'W' || f === 'E');
    const cells = [];
    for (let c = 0; c < 256; c++) if (arr[c] === r) cells.push({ x: c % 16, y: c >> 4 });
    if (!cells.length) continue;
    const key = c => vert ? c.y : c.x;
    const lo = cells.reduce((a, b) => key(a) < key(b) ? a : b);
    const hi = cells.reduce((a, b) => key(a) > key(b) ? a : b);
    if (vert) {
      if (!mapW(lo.x, lo.y - 1)) addPair(r, runN[lo.y * 16 + lo.x]);
      if (!mapW(hi.x, hi.y + 1)) addPair(r, runS[hi.y * 16 + hi.x]);
    } else {
      if (!mapW(lo.x - 1, lo.y)) addPair(r, runW[lo.y * 16 + lo.x]);
      if (!mapW(hi.x + 1, hi.y)) addPair(r, runE[hi.y * 16 + hi.x]);
    }
  }
}
console.error(`  corner partners (line kept): ` +
  `${cpLo.filter(Boolean).length + cpHi.filter(Boolean).length} run ends of ${(nextRun - 1) * 2}` +
  ` -- inside corners, plus outside corners with both faces visible; a corner facing away from` +
  ` the view has an unrelated wall across the boundary and draws no line`);

// Per-frame step, in 1/256ths of a map cell (px/py are 8.8 fixed point). Must stay well
// under 256: moveApply only collision-tests the DESTINATION cell, so a step approaching a
// full cell would tunnel through walls. 36/256 = 0.14 cells is safe.
// Movement is per 60Hz TICK, not per frame -- see readKeys. MOVE_STEP is the table's
// precision, not the speed: the step is scaled by elapsed ticks and then shifted down by
// MOVE_SHIFT, so the effective rate is 64 >> 6 = 1 unit of 1/256 cell per tick = 0.23 cells
// a second. That is a QUARTER of what it was (>> 4), for fine positioning while judging
// rendering; running is unchanged, see the 4x in readKeys' SHIFT block. Round numbers rather than exact ones: neither constant costs anything at runtime
// (the table is built here, the rate is an immediate), so there is no reason to carry 68 and
// 4.25 around for the last 6%. Keeping the table at 64 rather than 4 is what stops the
// DIRECTION quantising -- cos(a)*4 rounds to five levels and you walk visibly off-axis -- and
// 64 leaves headroom under the signed-byte limit the entries have to fit.
const MOVE_STEP = 64, MOVE_SHIFT = 6;
const moveX = [], moveY = [];
for (let a = 0; a < 256; a++) { moveX.push(Math.round(Math.cos(a / 256 * 2 * Math.PI) * MOVE_STEP) & 255); moveY.push(Math.round(Math.sin(a / 256 * 2 * Math.PI) * MOVE_STEP) & 255); }
const f0Lo = [], f0Hi = [], f1Lo = [], f1Hi = [];
for (let i = 0; i < 256; i++) { const v = Math.floor(i * i / 4); f0Lo.push(v & 255); f0Hi.push((v >> 8) & 255); }
for (let i = 256; i < 512; i++) { const v = Math.floor(i * i / 4); f1Lo.push(v & 255); f1Hi.push((v >> 8) & 255); }
// ===================== MULTICOLOR 4x8 CELL CHARSET =====================
// Multicolor text mode: a cell is 4 logical pixels wide x 8 tall (each pixel 2 physical
// px wide, 1 tall) => 160x200 logical in the same 1000 screen bytes. Bit pair per pixel:
// 00 = $d021 (ceiling/floor), 01 = $d022 (wall). Pixel k occupies bits (7-2k, 6-2k), so
// a wall pixel contributes 1<<(6-2k).
//
// A cell is described by [f0..f3] = wall pixels counted UP FROM THE CELL BOTTOM in each
// of the 4 columns. Only 253 of the 2^32 possible cells are ever needed, because under
// rectilinear projection the wall top is a straight line across a face -- see
// analyze-4x8*.mjs / analyze-final.mjs for the derivation and the measured error.
//
// Index: (wL, wR, bulge). wL/wR are the clamped end columns; bulge distinguishes the
// three interior shapes the endpoints alone cannot separate (a step cannot be told from
// a ramp by its endpoints). Straight-line interior sum is exactly wL+wR, which makes the
// bulge test a subtraction: (w1+w2)-(w0+w3).
const CLO = -3, CHI = 12, CN = CHI - CLO + 1;   // endpoint clamp range -> 16 levels.
// 13 levels left 4.3% of edge-cell endpoints clamped -- that is what flattened steep slopes.
// 16 covers 99.5%, and it is the widest range that keeps rampT's wL*16+wR index inside one
// 256-byte page; 25 levels would reach 100% but needs a paged lookup for the last 0.5%.
// Step levels are quantised. Walls are vertical prisms, so a face boundary is EXACTLY a
// vertical line on screen and the renderer reads its position straight out of faceIdT --
// no inference. The step table is addressed by three quantised levels (see chooseSteps), so
// the level count enters cubed: 6 is what keeps that table to 216 bytes per boundary
// position. Fine at the extremes (a saturated side must land exactly on 0 or 8) and coarse
// in the middle where 1px is invisible.
// The step table is addressed by THREE quantised levels -- the near end, the last column
// before the boundary, and the far end -- so the level counts multiply, and their product
// must stay under 256 to keep the index in one byte and the table reachable with abs,Y.
// That is the binding constraint on corner accuracy, not the charset: at 6/6/6 = 216, going
// from 64 to 128 step codes only moved the error 1.056 -> 1.004, because distinct cells were
// already colliding in the same slot. Levels always include 0 and 8 exactly -- a saturated
// side has to land dead on the cell edge or the corner shows a seam.
const QLEV = {
  3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 1, 3, 5, 7, 8],
  7: [0, 1, 3, 4, 5, 7, 8], 8: [0, 1, 2, 3, 5, 6, 7, 8], 9: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
// Keying all four columns instead (4*4*4*4 = 256, the same one-byte index) was measured
// 2026-08-09 and is WORSE: corner error 0.576 -> 1.486, six views 1484 -> 1506, and visibly so
// -- 4 levels cannot place a wall top closer than ~2 rows, which becomes a 5-row jump inside a
// single cell and reads as spikes along the wall top. No level spacing rescues it (0,3,5,8 ->
// 1.535; 0,2,5,8 -> 1.537; 0,3,6,8 -> 1.486). The three-axis key's blind spot -- it cannot see
// the interior column on the far side of the boundary -- is a design limit, accepted.
// 9,3,9 not 7,4,9. Both edges EXACT, the middle coarse. Re-bucketing the walkthrough over every
// balance whose product fits a byte says this is the best one available -- and it is smaller
// (243 states against 252):
//   7x4x9  252  0.356 px/step-cell  96.5% hard edges kept   <- was
//   9x3x9  243  0.334              98.0%                    <- is
//   8x4x8  256  0.393              98.3%
//   9x2x9  162  0.429              97.0%
// The middle sample only has to say roughly WHERE the step falls; the edges set the heights the
// eye aligns against, so trading middle resolution for exact edges is the right direction. It is
// specifically BOTH edges together that pays: 9x3x8 and 8x3x9 both fall back to ~0.384.
// (9x9x9 reaches 0.154 but needs 729 states = 3 pages -- see DECISIONS.md.)
const [LA, LM, LB] = (process.env.QLEVELS ?? '9,3,9').split(',').map(Number);
// The one-byte slot is not a law, it is a budget. Past 256 states the slot becomes 9 or 10 bits
// and the step tables gain pages, dispatched on the high byte -- the same trick the quarter-angle
// table uses. Only ~2.9 step cells a frame reach this path, so the ~30 extra cycles are noise.
// The measured payoff: 7x4x9 = 0.352 px/step-cell, 9x6x9 = 0.228, 9x9x9 = 0.154.
const SLOTPAGES = Math.ceil(LA * LM * LB / 256);
if (SLOTPAGES > 1) throw new Error(
  `step index ${LA}*${LM}*${LB} = ${LA*LM*LB} needs ${SLOTPAGES} pages. The JS side is ready ` +
  `(qmLoT/qaLoT/qaHiT below) but the 6502 side is NOT: rfStep still folds qA*8+qM into one byte ` +
  `via qmT, and stepT1/2/3 are emitted one page each. Both must change together -- see the ` +
  `unfinished work note in DECISIONS.md.`);
if (LA > 9 || LM > 9 || LB > 9) throw new Error('quantisation levels max out at 9 (exact 0..8)');
const QA = QLEV[LA], QM = QLEV[LM], QB = QLEV[LB];

const SLOTN = LA * LM * LB;

const C8 = x => Math.max(0, Math.min(8, x));
// STEPA=1 -- reconstruct a step cell by FORMULA instead of by sampled median.
//
// The three samples are qA (column 0), qM (the last column before the boundary) and qB
// (column 3). Two of them sit on the NEAR wall, so that side gets a real ramp; the far wall has
// only one sample, so it is drawn FLAT at qB. That guarantees a hard edge at the boundary, which
// is the whole point: a sampled median over a mixed bucket can emit a compromise shape that
// smears a corner, and L1 scores that identically to a harmless 1px slope error even though only
// one of them is visible.
//
// Measured against the best-possible table for this index (per-bucket weighted median):
//   free 4-level glyph  0.514 px/step-cell     formula  0.574     +0.172 wrong px/FRAME
// against a shipped total of 12.182, i.e. ~1.4% of frame error, for a class of artefact it
// cannot produce at all. Two schemes that lost: flat near + ramped far (0.718), and ramping
// BOTH sides toward the centre sample (2.787 -- the far wall's height at the boundary has
// nothing to do with the near wall's, so that fights the geometry).
//
// Build-time only: stepT keeps its size, its index and its three lookups. Nothing in the
// renderer changes.
const STEPA = process.env.STEPA === '1';
// Which column the MIDDLE sample reads. It was always w[kb-1] -- "the last column before the
// boundary" -- which for kb=1 is w[0], i.e. qA itself. That wasted a third of the key exactly
// where two walls meet: the s0 bucket class measures 0.812 px/cell against 0.31-0.41 for s1/s2,
// with worst spread 17 against 6-10. kb=1 has only ONE near column, so nothing is lost by
// reading the FAR side instead.
const qmCol = kb => (kb === 1 ? 1 : kb - 1);
const lerp = (v0, v1, n) => [...Array(n)].map((_, i) => n < 2 ? v0 : Math.round(v0 + (v1 - v0) * i / (n - 1)));
const stepAPat = (k, slot) => {
  const kb = k + 1;
  const qAi = Math.floor(slot / (LM * LB)), r = slot % (LM * LB);
  const a = QA[qAi], m = QM[Math.floor(r / LB)], b = QB[r % LB];
  // m sits on the near side for kb=2/3 (the near wall gets a real ramp between two samples) and
  // on the FAR side for kb=1, where the near wall is one column and needs no ramp -- so the
  // sample gives the far side a slope instead of being thrown away.
  return (kb === 1 ? [a, ...lerp(m, b, 3)]
                   : [...lerp(a, m, kb), ...Array(4 - kb).fill(b)]).map(C8);
};
// every shape the formula can ask for, so placeAll gives them codes
// ...but ONLY for slots the sampler actually reaches. Generating all 756 asks for 630 distinct
// shapes against 191 codes; the ~255 reachable slots are what the map can really produce, and
// unreachable ones fall back to the nearest code exactly as dropped patterns always have.
let stepAAll = [];
const hamm = (p, t) => (p[0] !== t[0]) + (p[1] !== t[1]) + (p[2] !== t[2]) + (p[3] !== t[3]);
// Counting differing COLUMNS, not rows of difference, is deliberate. Weighting by magnitude
// instead (sum of |row difference|) was measured 2026-08-09 and is WORSE: corner error 0.653 ->
// 1.016, and it did not fix the artifact that motivated trying it. Substitution was never the
// binding constraint -- a step slot is keyed on (a, m, b) and cannot see the third column, so
// 0006/0056/0066 share one slot and one code whichever metric picks between them.
const qsnap = (Q, v) => Q.reduce((b, q) => Math.abs(q - v) < Math.abs(b - v) ? q : b, Q[0]);
const rampPat = (a, b) => [0, 1, 2, 3].map(k => C8(Math.round(a + (b - a) * k / 3)));
// 3x5 digit glyphs (each row = 3 bits, bit2 = left column). In the new scheme these are
// whole CHARACTERS, not plotted pixels -- the readout pokes a char code instead of ORing
// bits into a framebuffer, which is what let the old overlay corrupt renderer tables.
const digGlyph = [
 7,5,5,5,7, 2,6,2,2,7, 7,1,7,4,7, 7,1,7,1,7, 5,5,7,1,1,          // 0-4
 7,4,7,1,7, 7,4,7,5,7, 7,1,2,2,2, 7,5,7,5,7, 7,5,7,1,7,          // 5-9
 2,5,7,5,5, 6,5,6,5,6, 7,4,4,4,7, 6,5,5,5,6, 7,4,6,4,7, 7,4,6,4,4, // A-F (glyph idx = nibble)
 5,5,2,5,5, 5,5,2,2,2];                                          // X (16), Y (17) labels
const NGLYPH = digGlyph.length / 5;

// NOTE for whoever adds objects back (2026-08-11, at the user's request): every trace of the
// orb/sprite pass has been removed from this file, deliberately and not because it was broken.
// The plan is to do objects as a SECOND PASS over the finished wall image rather than weaving
// priority into the charset, so none of what follows should be reinstated as it was. What that
// old scheme cost is worth knowing before rebuilding it: the fg/bg split below is INVISIBLE --
// bit pairs 01 and 11 are both black (01 through $d022, 11 through colour RAM) and only sprite
// priority tells them apart -- and expressing it cost 43 of 256 char codes (SOLID's twin, six
// vertical splits, four seam-bg, twelve ramp/step background twins, twenty shared-shape
// foreground duplicates). Those 43 codes are now spent on rendering accuracy instead.

// --- assign char codes: cell patterns first, then the 18 readout glyphs ---
const codeOf = new Map(), glyphs = [];          // glyphs[code] = 8 bytes of multicolor bitmap
// Wall pixels are bit pair 01, which reads $d022. THREE INKS, one per register:
//   00  $d021  the ceiling and floor      01  $d022  the walls      10  $d023  the seams
// and bit pair 11 is deliberately UNUSED. 11 is the one pair whose colour comes from colour RAM,
// and colour RAM only has three usable bits -- eight colours, not sixteen. Retiring 11 rather
// than 01 is what lets all three inks reach the whole palette from their own register, which is
// what the 1/2/3 keys cycle. Colour RAM is still written once at startup because bit 3 is the
// per-cell multicolor ENABLE; its colour bits no longer reach the screen.
//
// A pattern is four column heights 0..8, and the glyph is just those four columns filled from
// the bottom -- one ink for the whole cell, so a shape's code depends on its SHAPE alone.
const FGPX = [0x40, 0x10, 0x04, 0x01];
const patBytes = p =>
  [...Array(8)].map((_, i) =>
    (p[0] > 7 - i ? FGPX[0] : 0) | (p[1] > 7 - i ? FGPX[1] : 0) |
    (p[2] > 7 - i ? FGPX[2] : 0) | (p[3] > 7 - i ? FGPX[3] : 0));
function intern(p) { const k = p.join(','); if (!codeOf.has(k)) { codeOf.set(k, glyphs.length); glyphs.push(patBytes(p)); } return codeOf.get(k); }
intern([0, 0, 0, 0]); intern([8, 8, 8, 8]);     // BLANK=0 SOLID=1: the fast-fill constants
// Under PLAN=2 colour RAM means something, so every glyph that is NOT a nesting pair has to be
// colour-INDEPENDENT or it changes with its neighbours. SOLID becomes black-in-both (01) rather
// than the bit pair 11 the walls-only build uses. That is also what removes the need to restore
// colour RAM: a cell that stops being an edge cell gets SOLID or BLANK, and neither reads $d800.
if (+(process.env.PLAN ?? 0) === 2) glyphs[1] = [...Array(8)].fill(0x55);
const BLANK = codeOf.get('0,0,0,0'), SOLID = codeOf.get('8,8,8,8');

// Which patterns actually occur? The charset cannot hold every ramp and step the clamp can
// express, so the sampler decides what is worth a code and what gets dropped (see placeAll).
// Widening the clamp to 16 levels added patterns that only arise from very steep slopes, and
// most of those are unreachable in practice.
// The reference camera and ray, hoisted out of patternFreq so that anything else measuring the
// scene (CELLSCAN below) casts through the SAME model. A second implementation of the DDA would
// be a second thing to keep in step, and the whole value of this model is that it is the one the
// charset is built from.
const TH = Math.tan(FOV / 2 / 256 * 2 * Math.PI), CT = (NLOG - 1) / 2;
const refCx = c => (c - CT) / CT * TH;
const refAng = [...Array(NLOG)].map((_, c) => Math.atan(refCx(c)));
const refCc = [...Array(NLOG)].map((_, c) => 1 / Math.sqrt(1 + refCx(c) ** 2));
const refShoot = (px, py, a) => { const dx = Math.cos(a), dy = Math.sin(a);
    let mx = Math.floor(px), my = Math.floor(py);
    const ddx = Math.abs(1 / (dx || 1e-9)), ddy = Math.abs(1 / (dy || 1e-9));
    let sx, sy, sdx, sdy, side = 0;
    if (dx < 0) { sx = -1; sdx = (px - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - px) * ddx; }
    if (dy < 0) { sy = -1; sdy = (py - my) * ddy; } else { sy = 1; sdy = (my + 1 - py) * ddy; }
    for (let i = 0; i < 48; i++) { if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; }
      else { sdy += ddy; my += sy; side = 1; }
      if (mx < 0 || my < 0 || mx > 15 || my > 15) return [1e9, 0];
      if (map[my * 16 + mx]) {
        // The run id, not just the distance: a cell whose four columns do not all share one
        // wall face is a STEP cell, and the sampler used to be blind to those -- it emitted a
        // ramp pattern for every cell it saw, so step patterns have never been frequency
        // ranked at all. That is why STEPQ was a hand-picked list rather than a measured one.
        const face = side === 0 ? (sx > 0 ? runW : runE) : (sy > 0 ? runN : runS);
        return [side === 0 ? sdx - ddx : sdy - ddy, face[my * 16 + mx]]; } }
    return [1e9, 0]; };
const refClamp = v => Math.max(CLO, Math.min(CHI, v));

function patternFreq() {
  const f = new Map();
  const ang = refAng, cc = refCc, shoot = refShoot, cl = refClamp;
  // Sample where the PLAYER CAN ACTUALLY STAND, not just cell centres. A centre is never
  // closer than 0.5 cells to a wall, but the collision box lets you press to within ~0.1 --
  // and that is exactly where walls tower and the steep ramps get used. Sampling centres
  // only made the rarest patterns look unused, so the pairing spent its cheap slots wrong.
  const spots = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (map[y * 16 + x]) continue;
    const solid = (cx2, cy2) => cx2 < 0 || cy2 < 0 || cx2 > 15 || cy2 > 15 || map[cy2 * 16 + cx2];
    spots.push([x + 0.5, y + 0.5]);
    const W = solid(x - 1, y), E = solid(x + 1, y), N = solid(x, y - 1), S = solid(x, y + 1);
    if (W) spots.push([x + 0.12, y + 0.5]);
    if (E) spots.push([x + 0.88, y + 0.5]);
    if (N) spots.push([x + 0.5, y + 0.12]);
    if (S) spots.push([x + 0.5, y + 0.88]);
    if (W && N) spots.push([x + 0.12, y + 0.12]);      // inside corners: two walls at once
    if (E && S) spots.push([x + 0.88, y + 0.88]);
  }
  // frames[] keeps each sampled frame's pattern list, not just the total, because the thing
  // that can actually break is the 80-entry colour queue overflowing in ONE frame. An average
  // of 0.00% says nothing about the worst frame.
  const frames = [];
  for (const [px, py] of spots) {
    for (let a = 0; a < 256; a += 16) {
      const base = a / 256 * 2 * Math.PI, frame = [];
      const hit = [...Array(NLOG)].map((_, c) => shoot(px, py, base + ang[c]));
      const h = hit.map(([d], c) => Math.min(100, Math.round(88 / Math.max(d * cc[c], 0.02))));
      const fid = hit.map(([, id]) => id);
      for (let g = 0; g < NLOG / 4; g++) {
        const q = h.slice(g * 4, g * 4 + 4), mx2 = Math.max(...q), mn = Math.min(...q);
        const ff = fid.slice(g * 4, g * 4 + 4);
        let kb = 0; for (let i = 1; i < 4; i++) if (ff[i] !== ff[0]) { kb = i; break; }
        const rb = mx2 > 92 ? 0 : Math.floor((92 - mx2) / 8) + 1;
        let rs = mn >= 100 ? 0 : Math.ceil((100 - mn) / 8); if (rs < rb) rs = rb;
        for (let R = rb; R < rs; R++) { const K = 8 * R - 92;
          const w = q.map(v => cl(v + K));
          if (!kb) {                                     // one face across the cell: a ramp
            const k = rampPat(w[0], w[3]).join(',');
            f.set(k, (f.get(k) || 0) + 1); frame.push(k); continue; }
          // A face boundary inside the cell. Record the table slot it lands in and what the
          // cell TRULY looks like, so the step patterns can be chosen to fit the map instead
          // of being a fixed cross product of quantised levels.
          // What the old scheme would have drawn here: flat plateau, 6 quantised levels.
          const oq = v => QLEV[6].reduce((b, q) => Math.abs(q - v) < Math.abs(b - v) ? q : b, 0);
          const oldP = [0, 1, 2, 3].map(i => i < kb ? oq(C8(w[0])) : oq(C8(w[3])));
          oldErr += hamm(oldP, w.map(C8));
          const slot = qIdxA(w[0]) * (LM * LB) + qIdxM(w[qmCol(kb)]) * LB + qIdxB(w[3]);
          const key = w.map(C8).join(',');
          let m = stepStats[kb - 1].get(slot);
          if (!m) stepStats[kb - 1].set(slot, m = new Map());
          m.set(key, (m.get(key) || 0) + 1);
          frame.push([kb - 1, slot]); } }                // resolved once patterns are chosen
      frames.push(frame); } }
  return { f, frames };
}
// qIdx<X>: a clamped level (CLO..CHI) -> its index in that axis's quantisation. Same mapping
// the 6502 does via qIdxAT / qIdxMT / qIdxBT.
const qIdxA = w => QA.indexOf(qsnap(QA, C8(w)));
const qIdxM = w => QM.indexOf(qsnap(QM, C8(w)));
const qIdxB = w => QB.indexOf(qsnap(QB, C8(w)));
const stepStats = [new Map(), new Map(), new Map()];     // per boundary position k=1,2,3
let oldErr = 0;   // what the flat-plateau scheme would have cost, for an honest comparison
const { f: PFREQ, frames: PFRAMES } = patternFreq();
const SFRAMES = PFRAMES.length;
// Over budget: drop patterns rather than fold two into one code.
//
// This used to pair patterns via colour RAM -- bit pair 11 reads colour RAM per cell, so one
// code could hold two nesting patterns and a per-cell write picked which. It bought the
// clamp widening from 13 levels to 16. Then frequency-aware placement spent the pairing
// entirely on patterns the map never produces, so no cell ever needed the write... and the
// mechanism was still costing ~300 cycles a frame and ~1500 bytes to test a condition that
// was always false, in order to save ONE code. Ripped out 2026-08-08. If a future charset
// genuinely needs two patterns per code, it is in the history at 66bc8cf.
//
// What is lost: pairing was safe under sampling error. An unsampled pattern still rendered
// correctly, it just cost a write. A DROPPED pattern renders as its nearest neighbour, so a
// frame the sampler never visited can show one wrong cell. Hence dropPenalty below (drop the
// patterns whose nearest survivor is closest, so even a miss is off by as little as possible)
// and the hard guard that a dropped pattern must never have been sampled at all.
const dropped = [];
function placeAll(groups) {
  const all = [];
  for (const g of groups) for (const p of g)
    if (!codeOf.has(p.join(',')) && !all.some(q => q.join(',') === p.join(','))) all.push(p);
  const BUDGET = 256 - NGLYPH - 4 - glyphs.length;   // room left for cell patterns
  const unused = all.filter(p => !PFREQ.get(p.join(',')));
  console.error(`  patterns: ${all.length} distinct, ${BUDGET} codes available ` +
                `(over by ${all.length - BUDGET}); ${unused.length} never sampled`);
  // ---- merge RAMPS that are nearly duplicates of one another ----
  // Runs BEFORE the never-sampled drop below, so the codes it frees count against what that
  // tier still has to find. The other way round, the drop tier throws before the merge can help.
  // (was: second tier) merge RAMPS that are nearly duplicates of one another ----
  // Never-sampled patterns are free to drop; past those, freeing a code costs accuracy. Spend
  // it on ramps rather than steps. A ramp error is one row of height in one column of a smooth
  // gradient, which reads as a slightly different slope; a step error changes the shape of a
  // CORNER, which the eye goes straight to. Same Hamming distance, very different visibility.
  //
  // Cost of merging a pattern into its nearest survivor = how often it is sampled times how far
  // that survivor is, so this is priced in the same units the step table reports: wrong logical
  // columns per frame. Cheapest first.
  // 56 frees enough for every wall-meets-wall step to get its own exact twin, and costs 0.009
// wrong logical columns a frame -- one percent of what the sloped-step scheme itself is worth.
// Ramps had that much slack because the clamp expresses far more slopes than the map produces.
// 60, not 56: the extra four pay for the background twins that ramp/step shape
// collisions need (see below). Costs +0.010 wrong logical columns a frame against
// +0.009, which is nothing beside a ramp cell clipping an orb.
const RAMPFREE = +(process.env.RAMPFREE ?? 60);
  const merged = [];
  if (RAMPFREE) {
    const stepK = new Set(STEPS.chosen.map(q => q.join(',')));
    const keep = new Set(all.map(p => p.join(',')));
    const cand = all.filter(p => !stepK.has(p.join(',')))
      .map(p => { let d = 9, bq = null;
        for (const q of all) { if (q === p) continue; const h = hamm(p, q); if (h < d) { d = h; bq = q; } }
        return { p, d, n: PFREQ.get(p.join(',')) || 0 }; })
      .sort((a, b) => a.n * a.d - b.n * b.d);
    if (cand.length < RAMPFREE) throw new Error(`only ${cand.length} ramps to merge`);
    for (let i = 0; i < RAMPFREE; i++) {
      // do not merge a pattern into one that is itself being merged away
      if (!keep.has(cand[i].p.join(','))) continue;
      merged.push(cand[i]); dropped.push(cand[i].p); keep.delete(cand[i].p.join(','));
    }
    for (let i = all.length - 1; i >= 0; i--) if (!keep.has(all[i].join(','))) all.splice(i, 1);
    const cost = merged.reduce((a, m) => a + m.n * m.d, 0) / SFRAMES;
    console.error(`  merged ${merged.length} near-duplicate ramps to free codes: ` +
      `+${cost.toFixed(3)} wrong logical columns a frame ` +
      `(the sloped-step scheme is worth 0.920 by the same measure); ` +
      `worst single merge moves ${Math.max(...merged.map(m => m.d))} column(s), ` +
      `busiest merged ramp was sampled ${Math.max(...merged.map(m => m.n))} times`);
  }
  // Keep 4 codes spare so a small map edit does not immediately overflow the charset.
  let need = Math.max(0, all.length - BUDGET + 4);
  if (need) {
    // Only ever drop never-sampled patterns, cheapest first: cheap = some OTHER pattern in
    // the set is nearly identical, so if this one does turn up the cell is barely wrong.
    const keep = new Set(all.map(p => p.join(',')));
    const rank = unused.map(p => {
      let d = 9; for (const q of all) { if (q === p) continue;
        const h = hamm(p, q); if (h < d) d = h; }
      return { p, d };
    }).sort((a, b) => a.d - b.d);
    if (rank.length < need) throw new Error(
      `charset overflow: need to drop ${need} patterns but only ${rank.length} are unsampled`);
    for (let i = 0; i < need; i++) { dropped.push(rank[i].p); keep.delete(rank[i].p.join(',')); }
    for (let i = all.length - 1; i >= 0; i--) if (!keep.has(all[i].join(','))) all.splice(i, 1);
  }
  for (const p of all) { const k = p.join(',');
    codeOf.set(k, glyphs.length); glyphs.push(patBytes(p)); }
  const stepKeys = new Set(STEPS.chosen.map(q => q.join(',')));
  console.error(`  cell codes: ${all.filter(p => stepKeys.has(p.join(','))).length} step + ` +
    `${all.filter(p => !stepKeys.has(p.join(','))).length} ramp`);
  console.error(`  dropped ${dropped.length} never-sampled patterns` +
    (dropped.length ? ` (worst substitution is ${Math.max(...dropped.map(p => {
      let d = 9; for (const q of all) { const h = hamm(p, q); if (h < d) d = h; } return d; }))}` +
      ` logical columns off, and only in a frame the sampler never visited)` : ''));
}
// codeFor: a dropped pattern falls back to the closest survivor. Table build time only --
// the 6502 never sees this, it just reads a code out of rampT/stepT.
const codeFor = p => {
  const c = codeOf.get(p.join(',')); if (c !== undefined) return c;
  let bd = 9, bp = null;
  for (const [k] of codeOf) { const q = k.split(',').map(Number);
    const h = hamm(p, q); if (h < bd) { bd = h; bp = k; } }
  return codeOf.get(bp);
};
const rampsAll = [];
for (let a = CLO; a <= CHI; a++) for (let b = CLO; b <= CHI; b++) rampsAll.push(rampPat(a, b));

// ---- choosing the step patterns ----
// A cell with a face boundary in it used to render as [A,A,A,B]: a flat plateau, then a
// vertical drop. But the near wall is still receding across that plateau, so capping it flat
// is the "corner cap" artifact -- measured at 1.56 wrong logical columns a frame, against
// 0.46 if the plateau is allowed to slope. Rendering the slope needs 285 distinct patterns
// and the charset cannot hold them, so choose the ones that buy the most accuracy per code
// and let every other table slot fall back to the closest pattern already in the charset.
// A slot that lands on a ramp pattern costs nothing at all: ramps are placed regardless.
//
// The plateau's slope needs a third sample -- the height at the LAST column before the
// boundary -- so the step table is addressed by three levels rather than two.
// 100, not 64: dropping the sprite-priority twins returned 41 codes, which went here.
// Steps are where the error is: the ramp merging costs
// +0.009 wrong logical columns a frame against the step corner error's 0.653, so un-merging
// ramps would spend all 44 codes on the smaller of the two by two orders of magnitude.
// Measured: corner error 0.653 -> 0.576, six views 1490 -> 1484 pixels, and 0401/027c/31 88 ->
// 74 wrong pixels. NOT a fix for the reported bulge itself: column 54 still draws its top at
// row 56 against the model's 50, byte for byte, at 64 and at 100 alike. What improved there is
// OTHER step error in the same column. 140 buys nothing at all -- past here the limit is the
// slot key, which cannot see a step's third column, and no code budget reaches that.
// 80, not 100: twenty codes went to foreground duplicates of the busiest SHARED ramp/step
// shapes (SHAREDUP), which is what stops a wall's vertical edge losing foreground for the one
// cell whose shape happens to coincide with a ramp. Paying for them out of the step table costs
// corner error 0.576 -> 0.606; paying out of the ramp table instead (RAMPFREE 60 -> 84) costs
// +0.31 wrong columns a frame, ten times more, because the cheap near-duplicate ramps run out.
const STEPN = +(process.env.STEPN ?? 80);
const idealStep = (k, qA, qM, qB) => {          // k = 0,1,2 for boundary position 1,2,3
  const a = QA[qA], m = QM[qM], c = QB[qB];
  return k === 0 ? [a, c, c, c]                 // one column before the boundary: no slope
       : k === 1 ? [a, m, c, c]
       : [a, C8(Math.round((a + m) / 2)), m, c];
};
function chooseSteps() {
  const slots = [];
  for (let k = 0; k < 3; k++) for (const [slot, m] of stepStats[k])
    slots.push({ k, slot, truths: [...m].map(([s, n]) => [s.split(',').map(Number), n]) });
  const cset = new Map();
  for (const p of rampsAll) cset.set(p.join(','), p);           // already in the charset
  const nFree = cset.size;
  for (const s of slots) for (const [t] of s.truths) cset.set(t.join(','), t);
  const cands = [...cset.values()], avail = cands.map((_, i) => i < nFree);
  const E = cands.map(p => slots.map(s =>
    s.truths.reduce((a, [t, n]) => a + n * hamm(p, t), 0)));
  const best = slots.map((_, j) => {
    let b = Infinity; for (let i = 0; i < nFree; i++) if (E[i][j] < b) b = E[i][j]; return b; });
  const base = best.reduce((a, b) => a + b, 0);
  const chosen = [];
  for (let n = 0; n < STEPN; n++) {
    let bi = -1, bg = 0;
    for (let i = nFree; i < cands.length; i++) {
      if (avail[i]) continue;
      let g = 0;
      for (let j = 0; j < slots.length; j++) { const d = best[j] - E[i][j]; if (d > 0) g += d; }
      if (g > bg) { bg = g; bi = i; }
    }
    if (bi < 0) break;                          // nothing left that helps
    avail[bi] = true; chosen.push(cands[bi]);
    for (let j = 0; j < slots.length; j++) if (E[bi][j] < best[j]) best[j] = E[bi][j];
  }
  const after = best.reduce((a, b) => a + b, 0);
  // Final assignment for every table slot, sampled or not.
  const pool = cands.filter((_, i) => avail[i]);
  // STEPDIAG=1 lists the pool as digit strings ("0066" = [0,0,6,6]). The selection is greedy on
  // SAMPLED frequency, so a shape the walkthrough never produced can lose even when codes are
  // free -- which is invisible from the code counts alone and needs checking directly when a
  // single column renders at the wrong height.
  if (process.env.STEPDIAG === '1') {
    let occ = 0; for (let k = 0; k < 3; k++) for (const [, m] of stepStats[k])
      for (const [, n] of m) occ += n;
    console.error(`  step cells sampled: ${occ} over ${PFRAMES.length} sampled frames = ` +
      `${(occ / PFRAMES.length).toFixed(2)} per frame -- this is what any per-cell selection cost is multiplied by`);
  }
  if (process.env.STEPDIAG === '1')
    console.error(`  step pool (${pool.length}): ${pool.map(p => p.join('')).sort().join(' ')}`);
  // STEPDIAG=<pattern> (e.g. 0066) traces ONE truth: which (k,slot) it lands in, what else
  // shares that slot, and what the slot ends up assigned. A slot key is (a, m, b) -- it does
  // NOT include every column -- so two different-looking cells can be forced to share one code,
  // and that is invisible from the pool listing alone.
  const trace = process.env.STEPDIAG && /^\d{4}$/.test(process.env.STEPDIAG)
    ? process.env.STEPDIAG : null;
  if (trace) {
    for (const s of slots) {
      if (!s.truths.some(([t]) => t.join('') === trace)) continue;
      const share = s.truths.map(([t, n]) => `${t.join('')}x${n}`).join(' ');
      console.error(`  STEPDIAG ${trace}: k=${s.k} slot=${s.slot}`);
      console.error(`    truths sharing this slot: ${share}`);
    }
  }
  const assign = [new Map(), new Map(), new Map()];
  for (const s of slots) {
    let bp = pool[0], be = Infinity;
    for (const p of pool) { const e = s.truths.reduce((a, [t, n]) => a + n * hamm(p, t), 0);
      if (e < be) { be = e; bp = p; } }
    assign[s.k].set(s.slot, bp);
  }
  for (let k = 0; k < 3; k++) for (let a = 0; a < LA; a++) for (let m = 0; m < LM; m++)
    for (let b = 0; b < LB; b++) {
      const slot = a * (LM * LB) + m * LB + b;
      if (assign[k].has(slot)) continue;         // never sampled: nearest to the ideal shape
      const want = idealStep(k, a, m, b);
      let bp = pool[0], be = Infinity;
      for (const p of pool) { const e = hamm(p, want); if (e < be) { be = e; bp = p; } }
      assign[k].set(slot, bp);
    }
  const tot = slots.reduce((a, s) => a + s.truths.reduce((x, [, n]) => x + n, 0), 0);
  return { chosen, assign, base, after, nslots: slots.length, tot };
}
const STEPS = chooseSteps();
if (STEPA) { const seen = new Map();
  // stepStats holds the slots the sampler actually VISITED; STEPS.assign back-fills all 756
  // with nearest-shape guesses, so using it would ask for shapes the map never produces.
  for (let k = 0; k < 3; k++) for (const slot of stepStats[k].keys()) {
    const p = stepAPat(k, slot); seen.set(p.join(','), p); }
  stepAAll = [...seen.values()];
  console.error(`  STEPA: ${stepAAll.length} distinct formula shapes over ` +
    `${stepStats.reduce((a, m) => a + m.size, 0)} sampled slots`); }
// The chosen patterns' frequencies have to reach PFREQ before pairing runs, or the pairing
// ranks every step pattern at zero and happily pairs away the common ones.
for (let k = 0; k < 3; k++) for (const [slot, p] of STEPS.assign[k]) {
  const m = stepStats[k].get(slot); if (!m) continue;
  const n = [...m.values()].reduce((a, b) => a + b, 0);
  // Under STEPA the code the slot will USE is the formula's shape, not the sampled pattern, so
  // that is what must carry the frequency. Registering p instead left every formula shape with
  // no frequency at all, which made the drop tier treat all 227 of them as never-sampled and
  // discard exactly the shapes the step table was about to ask for.
  const key = (STEPA ? stepAPat(k, slot) : p).join(',');
  PFREQ.set(key, (PFREQ.get(key) || 0) + n);
}
for (const fr of PFRAMES) for (let i = 0; i < fr.length; i++)
  if (Array.isArray(fr[i])) fr[i] = STEPS.assign[fr[i][0]].get(fr[i][1]).join(',');
console.error(`  step patterns: ${LA}/${LM}/${LB} levels, ${STEPS.nslots} ` +
  `sampled of ${3*SLOTN} (k,slot) pairs, ${STEPS.chosen.length} codes; corner error ${(oldErr / SFRAMES).toFixed(3)} -> ` +
  `${(STEPS.after / SFRAMES).toFixed(3)} wrong cols/frame (flat plateau -> sloped)`);
// The six VERTICAL steps -- every column either empty or full, i.e. a wall corner seen edge-on.
// Nothing special about them any more (they used to be interned here, ahead of placeAll, so
// their sprite-priority twins could land on consecutive codes), but the assert is worth keeping:
// if the step chooser ever stops producing all six, a corner would render as its nearest
// neighbour and the wall would grow a notch.
const VSTEPS = STEPS.chosen.filter(p => p.every(v => v === 0 || v >= 8));
if (VSTEPS.length !== 6) throw new Error(`expected 6 vertical steps, found ${VSTEPS.length}`);
// PLAN=1 / PLAN=2 replace the whole generated codebook with charsetgen's k-medians plan.
// The pipeline above still runs -- STEPS and the sampler are what produced the buckets the plan
// is expressed in -- but its code ASSIGNMENT is thrown away and rebuilt from the plan, so the
// merges, drops and nearest-neighbour substitutions no longer apply.
//
// PLAN=2 additionally makes every code carry a NESTING PAIR: 01 = black in both, 00 = white in
// both, 11 = the rows where they differ. Colour RAM picks whether 11 reads black (the fuller
// half) or white (the sparser half), so one code holds two patterns and the cell chooses.
// PLAN=3 by default -- the finer ramp index plus the k-medians charset. It needs
// charset-plan.json, which charsetgen writes and which is NOT tracked (it is derived), so fall
// back rather than fail if someone builds from a clean checkout:
//   CELLSCAN=1 CELLSTEP=0.2 CELLANG=1 node build-iray.mjs && node charsetgen.mjs
const PLAN = (() => {
  const want = +(process.env.PLAN ?? 3);
  if (!want) return 0;
  if (existsSync('./charset-plan.json')) return want;
  console.error('  no charset-plan.json -- building WITHOUT the k-medians charset (PLAN=0).');
  console.error('  regenerate: CELLSCAN=1 CELLSTEP=0.2 CELLANG=1 node build-iray.mjs && node charsetgen.mjs');
  return 0;
})();
const planData = PLAN ? JSON.parse(readFileSync('./charset-plan.json', 'utf8')) : null;
if (PLAN === 2 && !planData.paired) throw new Error('charset-plan.json has no paired plan: rerun with PAIRED=1');
if (PLAN === 3 && !planData.fine) throw new Error('charset-plan.json has no fine plan: rerun charsetgen');
// Bottom-anchored fills, so row i (0 = top) is lit when i >= 8 - level. Both halves of a pair
// use the same rule, which is why nesting is just componentwise <=.
const pairBytes = (hi, lo) => [...Array(8)].map((_, i) =>
  [0, 1, 2, 3].reduce((b, c) => b | ((i >= 8 - lo[c] ? 1 : i >= 8 - hi[c] ? 3 : 0) << (6 - 2 * c)), 0));
// 64 entries: ~23 edge cells a frame, two rows each, so 46 is the working number and 64 is
// headroom. The build asserts the worst SAMPLED frame below rather than trusting the estimate.
const CQMAX = 64;
let planCode = null;                      // bucket key -> code, for rampT/stepT below
let planThr = null;                       // bucket key -> the w1+w2 threshold for its pair
if (!PLAN) placeAll([rampsAll, STEPA ? stepAAll : STEPS.chosen]);
else {
  glyphs.length = 2;                      // keep BLANK=0 and SOLID=1; drop everything interned
  for (const k of [...codeOf.keys()]) if (codeOf.get(k) >= 2) codeOf.delete(k);
  const src = PLAN === 2 ? planData.paired : PLAN === 3 ? planData.fine : planData;
  src.codes.forEach(c => glyphs.push(PLAN === 2 ? pairBytes(c[0], c[1]) : patBytes(c)));
  planCode = new Map(src.assign.map(([k, i]) => [k, 2 + i]));
  if (PLAN === 2 || PLAN === 3) planThr = new Map(src.thr);
  console.error(`PLAN=${PLAN}: ${src.codes.length} codes from charsetgen` +
    (PLAN === 2 ? ` (${2 * src.codes.length} glyphs, nesting pairs)` : '') +
    `, predicted ${(src.cost ?? src.costPx).toFixed(0)} px over ${planData.frames} frames ` +
    `(${((src.cost ?? src.costPx) / planData.frames).toFixed(3)}/frame vs ${planData.shippedPx.toFixed(3)} shipped)`);
}
const CELLCODES = glyphs.length;
const GLYPH0 = glyphs.length;                   // first readout glyph code
for (let g = 0; g < NGLYPH; g++) {
  const rows = digGlyph.slice(g * 5, g * 5 + 5);
  glyphs.push([...Array(8)].map((_, i) => { const r = (i >= 1 && i <= 5) ? rows[i - 1] : 0;
    return ((r >> 2 & 1) ? 0x40 : 0) | ((r >> 1 & 1) ? 0x10 : 0) | ((r & 1) ? 0x04 : 0); }));
}
// Panel seams: a fully-solid cell with one logical pixel knocked out to bit pair 10.
// Only two of the four multicolor pair values were in use (00 = $d021 ceiling/floor,
// 01 = $d022 wall), so the seam gets a colour register of its own and can be retuned
// later without touching a single charset entry.
//
// Four codes, one per pixel position -- and ONLY on the solid cell. A seam variant of the
// ramp/step cells would be 4 x 221 patterns, so the seam starts one cell row below the
// wall top. Every row is identical, which makes the pattern its own vertical mirror and
// keeps the flipped fontB free.
const SEAM0 = glyphs.length;
for (let k = 0; k < 4; k++) {
  const wall = 1;               // bit pair 01, like every other wall pixel
  const row = [0, 1, 2, 3].reduce((b, i) => b | ((i === k ? 2 : wall) << (6 - 2 * i)), 0);
  glyphs.push(new Array(8).fill(row));
}
// ---- the sprite occluders: seven cells of black that CLIP ----
// Bit pair 11, where every wall pixel is 01. In multicolor char mode 00 and 01 count as
// BACKGROUND for sprite priority and 10 and 11 as FOREGROUND, so these clip a sprite whose
// $d01b bit is set while the walls around them do not. Pair 11 takes its colour from the low
// three bits of colour RAM, which is $08 everywhere -- so it draws BLACK, identical to the wall
// it is stamped over. The difference is invisible as colour and exact as occlusion.
//
// Indexed by how many columns from one side are foreground:
//   OCC0+0..3  foreground on the LEFT,  1..4 columns (4 = the whole cell)
//   OCC0+4..6  foreground on the RIGHT, 1..3 columns
// Four boundary positions x two sides would be eight, but "all four from the left" and "all four
// from the right" are the same cell, so it is seven.
//
// Every row is identical, which makes each glyph its own vertical mirror -- so charset B, which
// cpChr builds by reversing each glyph's rows, comes out correct for free.
const OCC0 = glyphs.length;
const occRow = (n, fromRight, bg) => [0, 1, 2, 3].reduce((b, i) => {
  const fg = fromRight ? i >= 4 - n : i < n;
  return b | ((fg ? 3 : bg) << (6 - 2 * i));      // 11 = foreground; bg is the rest of the cell
}, 0);
for (let n = 1; n <= 4; n++) glyphs.push(new Array(8).fill(occRow(n, false, 1)));
for (let n = 1; n <= 3; n++) glyphs.push(new Array(8).fill(occRow(n, true, 1)));
const OCC_FULL = OCC0 + 3;                        // all four columns foreground

// ---- and the same splits backed by WHITE ----
// A cell straddling a wall's VERTICAL silhouette has floor or ceiling beyond the edge, not more
// wall. Backing the split with black there blots out the corridor, so the same six shapes exist
// again over bit pair 00. Which one a cell gets is decided at stamp time from what renderSym
// actually drew there -- see oSCells. No white "whole cell": a cell with no wall in it at all is
// not something to hide an orb behind, and OCC_FULL already covers the all-wall case.
const OCCW0 = glyphs.length;
for (let n = 1; n <= 3; n++) glyphs.push(new Array(8).fill(occRow(n, false, 0)));
for (let n = 1; n <= 3; n++) glyphs.push(new Array(8).fill(occRow(n, true, 0)));

// CELLMARK=1: put a 2x2 grey dot in the middle of SOLID and of all seven occluders -- columns 1
// and 2, rows 3 and 4, at bit pair 10 ($d023, grey). Purely a debugging aid: it makes the CHAR
// GRID visible, so a stamp that is one column out can be read off the screen directly instead of
// inferred from where blue meets black. It does clip sprites where the dot is, since 10 is a
// foreground pair -- acceptable for a diagnostic build, not for anything else.
//
// Every row of these glyphs is identical, so charset B (built by reversing each glyph's rows)
// keeps the dot centred without any special handling.
if (process.env.CELLMARK === '1') {
  // SOLID gets a GREY dot (pair 10) and every occluder a WHITE one (pair 00), so wall and stamp
  // are told apart at a glance. Always the same two columns and rows whatever the split, so the
  // dot marks the CELL's centre and the char grid can be counted directly.
  //
  // White is a bonus: 00 is a BACKGROUND pair, so unlike the grey dot it does not clip sprites.
  // The grey one on SOLID does, which is why this stays a diagnostic build.
  const dot = (row, pair) => (row & 0xc3) | (pair << 4) | (pair << 2);
  for (const r of [3, 4]) {
    glyphs[SOLID][r] = dot(glyphs[SOLID][r], 2);
    for (let i = 0; i < 7; i++) glyphs[OCC0 + i][r] = dot(glyphs[OCC0 + i][r], 0);
  }
}
if (glyphs.length > 256) throw new Error(`charset overflow: ${CELLCODES} cell patterns + ${NGLYPH} glyphs + 4 seams = ${glyphs.length} > 256`);
console.error(`charset: ${CELLCODES} cell codes + ${NGLYPH} readout + 4 seam + 7 occluder ` +
  `+ 6 white-backed = ${glyphs.length}/256  -- ${256 - glyphs.length} free`);
// Ramps and steps share one placement pass (so pairing can mate a ramp with a step), which
// means there is no contiguous "steps" range to report -- they interleave by frequency.
console.error(`  codes: 0 BLANK, 1 SOLID, 2-${CELLCODES-1} ramps+steps interleaved, ` +
              `${GLYPH0}-${GLYPH0+NGLYPH-1} readout, ${SEAM0}-${SEAM0+3} seam, ` +
              `${OCC0}-${OCC0+6} occluder on black, ${OCCW0}-${OCCW0+5} on white ` +
              `(${OCC_FULL} = whole cell)`);
// rampT[wL*16 + wR] -> char code, for a cell covering a single wall face.
const edgeCode = p => codeFor(p);
// Under PLAN the entry is whatever charsetgen assigned to that BUCKET. Buckets the walkthrough
// never reached still need an answer -- they are reachable geometry the scan happened to miss,
// not impossible ones -- so they fall back to the codeword nearest the pattern the old linear
// model would have drawn. nearestCode is also what keeps a plan valid after a map edit.
const planL1 = (a, b) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) + Math.abs(a[3]-b[3]);
// MUST be the codebook the glyphs were actually built from. This read planData.codes even under
// PLAN=3, whose glyphs come from planData.fine.codes -- a DIFFERENT array -- so nearestCode
// returned an index into the wrong list and every fallback slot pointed at an unrelated glyph.
// It only shows on buckets the walkthrough never reached (71 of 1012), which is why it survived
// the six-view check and turned up as a ramp facing the wrong way at one viewpoint.
const planPats = !PLAN ? []
  : PLAN === 2 ? planData.paired.codes.map(c => c[0])
  : PLAN === 3 ? planData.fine.codes
  : planData.codes;
const nearestCode = p => { let bi = 0, bd = 99;
  planPats.forEach((q, i) => { const d = planL1(p, q); if (d < bd) { bd = d; bi = i; } });
  return 2 + bi; };
let planFallback = 0;
const rampT = new Array(CN * 16).fill(0);
for (let a = 0; a < CN; a++) for (let b = 0; b < CN; b++) {
  const p = rampPat(a + CLO, b + CLO);
  if (PLAN) {
    const hit = planCode.get(`r${a * 16 + b}`);
    if (hit === undefined) planFallback++;
    rampT[a * 16 + b] = hit ?? nearestCode(p);
  } else
  rampT[a * 16 + b] = codeFor(p);
}
// stepT<k>[qA*36 + qM*6 + qB] -> char code, for a cell whose face boundary falls at column
// k. qM is the level at the LAST column before the boundary: that third sample is what lets
// the plateau slope down to meet the corner instead of capping it flat.
const stepT = [0, 1, 2].map(k => { const t = new Array(SLOTN).fill(0);
  if (PLAN && STEPA) {
    // Scheme A + a k-medians codebook: do NOT reserve codes for the formula's shapes. The
    // sampler already chose the best set of shapes it could afford; the formula just indexes
    // into it by nearest match. That is the whole point -- steps, ramps and the six hard
    // verticals all come out of one pool, and nothing is set aside.
    for (let slot = 0; slot < SLOTN; slot++) t[slot] = nearestCode(stepAPat(k, slot));
    return t;
  }
  if (PLAN) {
    // Every slot, not just the sampled ones: an unsampled slot still gets reached at some
    // viewpoint, and leaving it 0 draws a BLANK hole in a wall.
    for (let slot = 0; slot < SLOTN; slot++) {
      const hit = planCode.get(`s${k}.${slot}`);
      if (hit !== undefined) { t[slot] = hit; continue; }
      planFallback++;
      const p = STEPS.assign[k].get(slot);
      t[slot] = nearestCode(p ?? [QA[Math.floor(slot / (LM * LB))] ?? 0, 0, 0,
                                  QB[slot % LB] ?? 0]);
    }
    return t;
  }
  if (STEPA) {                       // every slot, by formula -- no sampling involved
    for (let slot = 0; slot < SLOTN; slot++) {
      const c = edgeCode(stepAPat(k, slot)); t[slot] = c; }
    return t;
  }
  for (const [slot, p] of STEPS.assign[k]) t[slot] = edgeCode(p);
  return t; });
// PLAN=3: the index gains a ninth bit, so every table gains a second copy -- one for each half
// of the split. A bucket that never split has thr 0, which compares true for every m, so its LO
// copy is unreachable and just mirrors HI rather than needing a special case.
let rampTlo = null, rampThi = null, stepTlo = null, stepThi = null;
let fineHit = 0, fineMiss = 0; const stepAErr = [];
if (PLAN === 3) {
  rampThi = new Array(CN * 16).fill(0); rampTlo = new Array(CN * 16).fill(0);
  for (let a = 0; a < CN; a++) for (let b = 0; b < CN; b++) {
    const i = a * 16 + b, fb = nearestCode(rampPat(a + CLO, b + CLO));
    planCode.has(`r${i}.h`) ? fineHit++ : fineMiss++;
    rampThi[i] = planCode.get(`r${i}.h`) ?? fb;
    rampTlo[i] = planCode.get(`r${i}.l`) ?? rampThi[i];
  }
  stepThi = [0, 1, 2].map(() => new Array(SLOTN).fill(0));
  stepTlo = [0, 1, 2].map(() => new Array(SLOTN).fill(0));
  for (let k = 0; k < 3; k++) for (let slot = 0; slot < SLOTN; slot++) {
    if (STEPA) {
      // Scheme A: the shape comes from the formula, so both halves of the fine index answer the
      // same way -- the extra bit says nothing the three samples do not already carry. It is
      // still spent usefully on RAMPS, which is where 83% of the error lives.
      const want = stepAPat(k, slot);
      const code = nearestCode(want);
      stepThi[k][slot] = stepTlo[k][slot] = code;
      // MIDPOINT PROBE: does the table actually encode what the formula asked for?
      const got = planPats[code - 2] ?? [0,0,0,0];
      const d = Math.abs(want[0]-got[0])+Math.abs(want[1]-got[1])+Math.abs(want[2]-got[2])+Math.abs(want[3]-got[3]);
      stepAErr.push({ k, slot, want: want.join(','), got: got.join(','), d });
      fineHit++; continue;
    }
    const fb = nearestCode(STEPS.assign[k].get(slot) ?? [0, 0, 0, 0]);
    planCode.has(`s${k}.${slot}.h`) ? fineHit++ : fineMiss++;
    stepThi[k][slot] = planCode.get(`s${k}.${slot}.h`) ?? fb;
    stepTlo[k][slot] = planCode.get(`s${k}.${slot}.l`) ?? stepThi[k][slot];
  }
  if (stepAErr.length) { const ex = stepAErr.filter(e => e.d === 0).length;
    const bad = stepAErr.filter(e => e.d > 0).sort((a, b) => b.d - a.d);
    console.error(`  STEPA TABLE PROBE: ${ex}/${stepAErr.length} slots encode the formula EXACTLY; ` +
      `mean L1 ${(stepAErr.reduce((a,e)=>a+e.d,0)/stepAErr.length).toFixed(3)}, worst ${bad[0]?.d ?? 0}`);
    for (const e of bad.slice(0, 6))
      console.error(`     k=${e.k} slot=${e.slot}  want [${e.want}]  got [${e.got}]  off ${e.d}`); }
  console.error(`  PLAN=3: ${fineHit} of ${fineHit + fineMiss} index slots come from the plan, ` +
    `${fineMiss} fall back to the nearest codeword (never reached by the walkthrough)`);
}
// ---- normalise the thresholds so "no ninth bit" is encoded as zero ----
// m is a sum of two clamp8T levels, so m >= 0 always holds and a threshold of 0 means the hi
// half wins unconditionally. Wherever the plan gave a slot no second codeword, lo == hi and the
// threshold is meaningless -- 121 slots carried a live one and computed a bit that changed
// nothing. Forcing those to 0 lets the renderer recognise them and skip calcM (83 cycles an
// edge cell) on 435 of 985 slots instead of 314, with no change to any pixel.
const rampThrN = i => (PLAN === 3 && rampTlo[i] === rampThi[i]) ? 0 : (planThr.get('r' + i) ?? 0);
const stepThrN = (k, i) => (PLAN === 3 && stepTlo[k][i] === stepThi[k][i]) ? 0
                                                                          : (planThr.get(`s${k}.${i}`) ?? 0);
if (PLAN === 3) {
  const nz = [...Array(256)].filter((_, i) => rampThrN(i) === 0).length +
             [0, 1, 2].reduce((a, k) => a + [...Array(SLOTN)].filter((_, i) => stepThrN(k, i) === 0).length, 0);
  console.error(`  ninth bit: ${nz} of ${256 + 3 * SLOTN} slots have no second codeword, so calcM is skipped there`);
}
if (PLAN && PLAN !== 3) console.error(`  PLAN: ${planFallback} of ${CN * 16 + 3 * SLOTN} table entries fell back ` +
  `to the nearest codeword (bucket never reached by the walkthrough)`);

// ---- CELLSCAN: a dense walkthrough, to price what the sparse sampler cannot see ----
// patternFreq samples 332 hand-chosen positions x 16 of the 256 angle bytes, and everything
// downstream trusts it: the drop tier only ever discards patterns it reports as NEVER SAMPLED,
// and a dropped pattern renders as its nearest neighbour. So a shape that occurs at some angle
// the sampler skipped is a wrong cell in a frame nobody measured.
//
// This walks a fine grid of positions the player can actually stand at, through EVERY angle
// byte, and records the true content of every cell that contains both white and black -- which
// is exactly the set of cells that needs a charset code. It reports what the engine would draw
// for each, so the error is measured against the real code tables rather than estimated.
//
// CELLSTEP = position grid in cells (default 0.25), CELLANG = angle byte stride (default 1,
// i.e. all 256). It is analysis only: nothing here feeds the charset, and the run exits before
// emitting so it can never write a disk built from a diagnostic path.
if (process.env.CELLSCAN === '1') {
  const STEP = +(process.env.CELLSTEP ?? 0.25);
  const ASTEP = +(process.env.CELLANG ?? 1);
  // The collision box lets the player press to ~0.1 of a wall but no closer, so a position
  // nearer than PAD to a solid cell is not reachable and its patterns are not real.
  const PAD = 0.1;
  const solid = (x, y) => x < 0 || y < 0 || x > 15 || y > 15 || !!map[y * 16 + x];
  const spots = [];
  for (let cy = 0; cy < 16; cy++) for (let cx0 = 0; cx0 < 16; cx0++) {
    if (map[cy * 16 + cx0]) continue;
    for (let gy = STEP / 2; gy < 1; gy += STEP) for (let gx = STEP / 2; gx < 1; gx += STEP) {
      const px = cx0 + gx, py = cy + gy;
      if (gx < PAD && solid(cx0 - 1, cy)) continue;
      if (gx > 1 - PAD && solid(cx0 + 1, cy)) continue;
      if (gy < PAD && solid(cx0, cy - 1)) continue;
      if (gy > 1 - PAD && solid(cx0, cy + 1)) continue;
      spots.push([px, py]);
    }
  }
  // What the engine would actually put on screen for a cell, through the very tables it ships.
  const patOfCode2 = (() => { const m = new Map();
    for (const [k, c] of codeOf) if (!m.has(c)) m.set(c, k.split(',').map(Number));
    return c => m.get(c); })();
  // TWO losses sit between the real cell and the pixels, and they have completely different
  // cures, so measuring them together is useless:
  //
  //   MODEL   what the engine can even express. A ramp cell is rebuilt by interpolating its two
  //           ENDPOINTS, so [7,8,8,8] is not a pattern it can ask for -- endpoints (7,8) give
  //           [7,7,8,8]. A step cell is its quantised (qA,qM,qB) slot. No number of charset
  //           codes fixes this; it needs a different representation.
  //   CHARSET what the shipped codes do to the pattern the model DID ask for -- merged ramps,
  //           dropped patterns, nearest-neighbour substitution. THIS is what free codes buy.
  const modelFor = (w, kb) => {
    if (!kb) return rampPat(w[0], w[3]);
    const slot = qIdxA(w[0]) * (LM * LB) + qIdxM(w[qmCol(kb)]) * LB + qIdxB(w[3]);
    return STEPS.assign[kb - 1].get(slot) ?? null;
  };
  const drawnFor = (w, kb) => {
    const code = kb ? stepT[kb - 1][qIdxA(w[0]) * (LM * LB) + qIdxM(w[qmCol(kb)]) * LB + qIdxB(w[3])]
                    : rampT[(w[0] - CLO) * 16 + (w[3] - CLO)];
    return patOfCode2(code) ?? [0, 0, 0, 0];
  };
  const seen = new Map();          // true 4-column content -> {n, kb, w, at, cols, px, ex}
  const buckets = new Map();       // "r<idx>" / "s<k>.<slot>" -> Map(trueShape -> count)
  let cells = 0, mixed = 0;
  // L1 = wrong PIXELS, hamm = wrong COLUMNS. mergecells prices a direct shape table in pixels,
  // so the shipped engine has to be priced in the same unit or the two cannot be compared.
  const L1 = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) +
                       Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]);
  let exactN = 0, offN = 0, offCols = 0, offPx = 0;
  let mdlCols = 0, chrCols = 0, mdlN = 0, chrN = 0;
  const curve = [];                // saturation: distinct shapes after each 5% of positions
  const t0 = Date.now();
  // CELLRAND=N: N unique random samples instead of the grid x every angle. The reachable state
  // space is FINITE and not continuous -- px/py are 8.8 fixed point (256 sub-positions per cell)
  // and pa is a byte -- so uniform-over-that-lattice is the honest reading of "any valid value";
  // sampling off it would measure states the engine cannot be in. Seeded, so a run is repeatable.
  const NRAND = +(process.env.CELLRAND ?? 0);
  const samples = [];
  if (NRAND) {
    const open = [];
    for (let cy = 0; cy < 16; cy++) for (let cx0 = 0; cx0 < 16; cx0++)
      if (!map[cy * 16 + cx0]) open.push([cx0, cy]);
    // mulberry32, not an LCG: rnd*1103515245 exceeds 2^53 in JS and loses the low bits, so the
    // obvious LCG degenerates into a short cycle -- it produced 3,670 unique values out of 2M.
    let rnd = +(process.env.CELLSEED ?? 12345);   // CELLSEED: an independent draw, to measure how often a fallback is really hit
    const rand = () => { rnd = rnd + 0x6D2B79F5 | 0;
      let t = Math.imul(rnd ^ rnd >>> 15, 1 | rnd);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const seen = new Set();
    let guard = 0;
    while (samples.length < NRAND && guard++ < NRAND * 20) {
      const [cx0, cy] = open[(rand() * open.length) | 0];
      const fx = (rand() * 256) | 0, fy = (rand() * 256) | 0;
      const gx = fx / 256, gy = fy / 256;
      if (gx < PAD && solid(cx0 - 1, cy)) continue;
      if (gx > 1 - PAD && solid(cx0 + 1, cy)) continue;
      if (gy < PAD && solid(cx0, cy - 1)) continue;
      if (gy > 1 - PAD && solid(cx0, cy + 1)) continue;
      const a = (rand() * 256) | 0;
      const key = ((cx0 * 256 + fx) * 4096 + (cy * 256 + fy)) * 256 + a;
      if (seen.has(key)) continue;
      seen.add(key);
      samples.push([cx0 + gx, cy + gy, a]);
    }
    console.error(`  CELLRAND: ${samples.length.toLocaleString()} unique random (px,py,pa) samples`);
  }
  const driver = NRAND
    ? cb => samples.forEach(([px, py, a], si) => cb(px, py, a, si))
    : cb => spots.forEach(([px, py], si) => { for (let a = 0; a < 256; a += ASTEP) cb(px, py, a, si); });
  driver((px, py, a, si) => {
    {
      const base = a / 256 * 2 * Math.PI;
      const hit = [...Array(NLOG)].map((_, c) => refShoot(px, py, base + refAng[c]));
      const h = hit.map(([d], c) => Math.min(100, Math.round(88 / Math.max(d * refCc[c], 0.02))));
      const fid = hit.map(([, id]) => id);
      for (let g = 0; g < NLOG / 4; g++) {
        const q = h.slice(g * 4, g * 4 + 4), mx2 = Math.max(...q), mn = Math.min(...q);
        const ff = fid.slice(g * 4, g * 4 + 4);
        let kb = 0; for (let i = 1; i < 4; i++) if (ff[i] !== ff[0]) { kb = i; break; }
        const rb = mx2 > 92 ? 0 : Math.floor((92 - mx2) / 8) + 1;
        let rs = mn >= 100 ? 0 : Math.ceil((100 - mn) / 8); if (rs < rb) rs = rb;
        cells += 25;                 // every cell row of this column-group, mixed or not
        for (let R = rb; R < rs; R++) {
          const w = q.map(v => refClamp(v + 8 * R - 92));
          const t = w.map(C8);
          // "contains both a white and a black pixel": every column empty, or every column
          // full, is BLANK or SOLID and needs no pattern code at all.
          if (t.every(v => v === 0) || t.every(v => v === 8)) continue;
          mixed++;
          // Error is accumulated PER OCCURRENCE, not once per distinct shape. rampT is indexed
          // by the endpoint-clamped w (CLO..CHI), not by the 0..8 shape, so the same visible
          // shape reached with different w draws differently -- scoring one representative for
          // the whole class silently mixed those together. The browser transcription of this
          // model disagreeing on the totals is what surfaced it; the shape COUNTS matched all
          // along, which is why it looked fine.
          const drawn = drawnFor(w, kb), model = modelFor(w, kb) ?? drawn;
          const dm = hamm(t, model), dch = hamm(model, drawn), d = hamm(t, drawn);
          const dpx = L1(t, drawn);
          offPx += dpx; offCols += d; mdlCols += dm; chrCols += dch;
          if (dm) mdlN++;
          if (dch) chrN++;
          if (d === 0) exactN++; else offN++;
          const key = t.join(',');
          let e = seen.get(key);
          if (!e) seen.set(key, e = { n: 0, kb, w: w.slice(), at: [px, py, a], cols: 0, px: 0, ex: 0 });
          e.n++; e.cols += d; e.px += dpx;
          if (d === 0) e.ex++;
          // Per-BUCKET histograms: which true shapes land in each rampT entry and each step
          // slot, and how often. The charset picks one pattern per bucket, so this is the only
          // distribution that can tell it which pattern to pick -- a global shape histogram
          // cannot, because it does not know which shapes have to share an answer.
          const bk = kb ? `s${kb - 1}.${qIdxA(w[0]) * (LM * LB) + qIdxM(w[qmCol(kb)]) * LB + qIdxB(w[3])}`
                        : `r${(w[0] - CLO) * 16 + (w[3] - CLO)}`;
          let bh = buckets.get(bk);
          if (!bh) buckets.set(bk, bh = new Map());
          bh.set(key, (bh.get(key) || 0) + 1);
        }
      }
    }
    if (si % Math.max(1, Math.floor((NRAND || spots.length) / 20)) === 0) curve.push([si, seen.size]);
  });
  curve.push([NRAND || spots.length, seen.size]);
  // Per-shape REPORTING only -- the totals were accumulated per occurrence in the loop above.
  // A shape counts as "drawn exactly" only if EVERY occurrence of it was: the same shape reached
  // with different endpoint-clamped w can draw differently, so a shape can be part-right.
  let exact = 0;
  const misses = [];
  for (const [key, e] of seen) {
    if (e.ex === e.n) { exact++; continue; }
    misses.push({ key, n: e.n, cols: e.cols, px: e.px, kb: e.kb, at: e.at,
                  d: (e.cols / e.n), partial: e.ex > 0 });
  }
  misses.sort((a, b) => b.cols - a.cols);
  const worst = misses[0];
  const sampled = new Set(PFREQ.keys());
  const unseenByBuild = [...seen].filter(([k]) => !sampled.has(k));
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.error(`\nCELLSCAN  step ${STEP} cells, angle stride ${ASTEP}: ${spots.length} positions ` +
    `x ${Math.ceil(256 / ASTEP)} angles = ${(spots.length * Math.ceil(256 / ASTEP)).toLocaleString()} frames, ${secs}s`);
  const FR = NRAND || (spots.length * Math.ceil(256 / ASTEP));
  console.error(`  cells on screen ${cells.toLocaleString()}, of which mixed (need a pattern code) ` +
    `${mixed.toLocaleString()} (${(100 * mixed / cells).toFixed(1)}%, ${(mixed / FR).toFixed(1)}/frame)`);
  console.error(`  DISTINCT mixed shapes actually reachable: ${seen.size}`);
  console.error(`  saturation (positions scanned -> distinct shapes): ` +
    curve.filter((_, i) => i % 4 === 0 || i === curve.length - 1)
         .map(([s, d]) => `${s}:${d}`).join('  '));
  console.error(`  drawn EXACTLY: ${exact}/${seen.size} shapes, ` +
    `${(100 * exactN / mixed).toFixed(2)}% of all mixed cells by frequency`);
  console.error(`  loss splits into:`);
  console.error(`    MODEL   ${(100 * mdlN / mixed).toFixed(2)}% of cells, ` +
    `${(mdlCols / FR).toFixed(3)} wrong cols/frame  -- ramp rebuilt from 2 endpoints, step quantised.`);
  console.error(`                                                 More charset codes CANNOT fix this.`);
  console.error(`    CHARSET ${(100 * chrN / mixed).toFixed(2)}% of cells, ` +
    `${(chrCols / FR).toFixed(3)} wrong cols/frame  -- merges, drops, nearest-neighbour.`);
  console.error(`                                                 This is what the 43 free codes buy back.`);
  console.error(`    TOTAL   ${(100 * offN / mixed).toFixed(2)}% of cells, ${(offCols / FR).toFixed(3)} wrong cols/frame` +
    `, ${(offPx / FR).toFixed(3)} wrong PIXELS/frame`);
  if (worst) console.error(`  worst single shape: [${worst.key}] seen ${worst.n}x, ` +
    `${worst.cols} wrong cols total (${worst.d.toFixed(2)} avg), e.g. PX=${worst.at[0].toFixed(2)} ` +
    `PY=${worst.at[1].toFixed(2)} A=${worst.at[2]}`);
  console.error(`  shapes the BUILD's 332x16 sampler never saw: ${unseenByBuild.length} of ${seen.size} ` +
    `(${(100 * unseenByBuild.reduce((a, [, e]) => a + e.n, 0) / mixed).toFixed(2)}% of cells)`);
  console.error(`         shape        count   wrong cols  avg   kind`);
  for (const m of misses.slice(0, 15))
    console.error(`    [${m.key}] ${String(m.n).padStart(8)}   ${String(m.cols).padStart(8)}  ` +
      `${m.d.toFixed(2)}  ${m.kb ? `step k=${m.kb}` : 'ramp'}` +
      `${m.partial ? ' (part-exact)' : ''}${sampled.has(m.key) ? '' : '   NEVER SAMPLED'}`);
  writeFileSync('./cellscan.json', JSON.stringify({
    step: STEP, angleStride: ASTEP, positions: NRAND || spots.length, cells, mixed,
    randomSamples: NRAND || 0, frames: NRAND || (spots.length * Math.ceil(256 / ASTEP)),
    distinct: seen.size, exact, curve,
    shippedCols: offCols / FR, shippedPx: offPx / FR, cellCodes: CELLCODES,
    QA, QM, QB, LM, LB,
    shapes: [...seen].map(([k, e]) => ({ p: k, n: e.n, kb: e.kb,
      drawn: drawnFor(e.w, e.kb).join(','), sampledByBuild: sampled.has(k), at: e.at }))
      .sort((a, b) => b.n - a.n),
    buckets: [...buckets].map(([b, h]) => [b, [...h]]),
  }, null, 1));
  console.error('  wrote cellscan.json');
  process.exit(0);
}

// charset A, and charset B = every glyph flipped vertically. The raster split at the
// horizon selects B for the bottom half, so ONE char code renders as its own mirror
// there -- renderSym writes the identical byte to both halves and needs no flip table.
// Both charsets keep bit pair 11 for wall pixels. A version of this rewrote charset A's 11
// pairs to 01, on the theory that nothing above the horizon ever needs the foreground pair.
// That reasoning does not generalise -- a tall object rises above the horizon under
// perspective even though the ceiling never does -- so leave A and B identical in ink.
const fontA = new Uint8Array(256 * 8), fontB = new Uint8Array(256 * 8);
for (let c = 0; c < 256; c++) { const g = glyphs[c] || [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 8; i++) { fontA[c * 8 + i] = g[i]; fontB[c * 8 + i] = g[7 - i]; } }
// cpChr derives charset B from A at startup with "y = x EOR 7" instead of loading a second 2KB
// copy. That is only valid if fontB is EXACTLY fontA with the low three bits of the index flipped.
// Asserted here rather than trusted: the failure mode is 2KB of subtly wrong glyphs below the
// horizon, which reads as a rendering bug anywhere except where it actually is.
for (let i = 0; i < fontA.length; i++)
  if (fontB[i] !== fontA[i ^ 7])
    throw new Error(`charset B is not fontA[i^7] at i=${i} (glyph ${i >> 3} row ${i & 7}): ` +
      `fontB=${fontB[i]} fontA[i^7]=${fontA[i ^ 7]} -- cpChr's EOR derivation is invalid`);
// qA*(LM*LB) exceeds a byte once the slot does, so the single fold table becomes three small
// ones. qM*LB + qB can never carry (max (LM-1)*LB + LB-1 = LM*LB - 1 < 256 for every legal
// shape), which is what keeps the whole sum to ONE 16-bit add instead of two.
const qmT = new Array(64).fill(0);
for (let a = 0; a < LA; a++) for (let m = 0; m < LM; m++) qmT[a * 8 + m] = a * (LM * LB) + m * LB;
const qmLoT = [...Array(16)].map((_, m) => (m < LM ? m * LB : 0));
const qaLoT = [...Array(16)].map((_, a) => (a < LA ? (a * LM * LB) & 255 : 0));
const qaHiT = [...Array(16)].map((_, a) => (a < LA ? (a * LM * LB) >> 8 : 0));
// clampT output -> index into each axis's quantisation.
const qIdxAT = [...Array(CN)].map((_, v) => qIdxA(v + CLO));
const qIdxMT = [...Array(CN)].map((_, v) => qIdxM(v + CLO));
const qIdxBT = [...Array(CN)].map((_, v) => qIdxB(v + CLO));

// MODELJSON=1 dumps everything a standalone copy of the model needs -- the map, the run ids the
// face test reads, the clamp, the two code tables and the pattern behind every code. Written so
// the model can be run somewhere without Node (see iray-model.html): the alternative is a
// hand-copied second implementation, which is exactly what refShoot was hoisted to avoid.
if (process.env.MODELJSON === '1') {
  // Under PLAN the codebook is the plan's, not codeOf -- codeOf keeps only BLANK and SOLID once
  // placeAll is skipped, so building the glyph table from it yields 2 patterns and a blank page.
  const patOfCode3 = (() => { const m = new Map();
    for (const [k, c] of codeOf) if (!m.has(c)) m.set(c, k.split(',').map(Number));
    planPats.forEach((p, i) => m.set(2 + i, p));
    return m; })();
  writeFileSync('./model.json', JSON.stringify({
    NLOG, FOV, NCELL, CLO, CHI, CN, LA, LM, LB,
    map: [...map], runW: [...runW], runE: [...runE], runN: [...runN], runS: [...runS],
    rampT, stepT, qIdxAT, qIdxMT, qIdxBT,
    // PLAN=3's actual tables, so the browser page models the SHIPPED renderer rather than a
    // single-index approximation of it. Without these the page silently shows a different engine.
    plan: PLAN,
    rampTlo, rampThi, stepTlo, stepThi,
    rampThr: PLAN === 3 ? [...Array(256)].map((_, i) => rampThrN(i)) : null,
    stepThr: PLAN === 3 ? [0, 1, 2].map(k => [...Array(SLOTN)].map((_, i) => stepThrN(k, i))) : null,
    codePat: [...Array(256)].map((_, c) => patOfCode3.get(c) ?? null),
    cellCodes: CELLCODES, seam0: SEAM0, blank: BLANK, solid: SOLID,
  }));
  console.error(`MODELJSON: wrote model.json (${CELLCODES} cell codes)`);
}


// ---- unrolled fill chains ----
// A straight line of store instructions, one slot per cell row, each with its screen
// address baked into the instruction. Jumping INTO the middle of that line writes exactly
// the rows from that slot to the end -- so a run of identical cells costs one jump plus
// ~5 cycles per cell, with no loop counter, no per-cell test and no address arithmetic.
// The descending chain paints the ceiling run above the wall top; the ascending one paints
// the solid run below it. Each slot also stores the MIRRORED row, so one pass covers both
// halves of the screen (row 12 is its own mirror, hence the single store there).
// One pair of chains per screen buffer, since the addresses are baked in.
// One interpolated column of the 8-bit fast path, for the 4x unrolled group. Carry is
// clear on entry to every copy: the group's "cmp spanR" falls through clear, "bcc" into the
// write is only taken when clear, and the subtract loop exits on a failed "bcs". So no copy
// needs its own clc, and the four share one bounds test instead of paying inx/cpx/bcs/jmp.
const ispanCol = (id, step, last) => `        inx
        adc dyv
        bcs ish${id}            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc isw${id}
iss${id}:  sbc dxv
        ${step}
        cmp dxv
        bcs iss${id}
isw${id}:  sta errv
        tya
        sta colH,x` + (last ? '' : `
        lda errv`);
// The 9th bit of the error term, inline instead of a whole second interpolator.
// err is always < dxv <= 159 at the top of a column, so errH is only ever set transiently
// by the add -- there is no 16-bit state to carry between columns. Subtracting dxv while
// the carry survives clears the 9th bit; the borrow that finally clears it IS the carry
// into the true 8-bit value. Coalesced faces put a quarter of all columns through here.
const ispanHi = (id, step) => `ish${id}:  sec
        sbc dxv
        ${step}
        bcs ish${id}            ; no borrow -> the 9th bit is still set
        cmp dxv
        bcc isw${id}
        bcs iss${id}            ; always`;
const chainSrc = (nm, base, rows, tail) => rows.map(r => {
  const a = base + r * 40, b = base + (24 - r) * 40;
  return `${nm}${r}:` + `\tsta ${hx16(a)},x` + (r === 12 ? '' : `\n\tsta ${hx16(b)},x`);
}).join('\n') + `\n\tjmp ${tail}`;
const ROWSD = [...Array(13)].map((_, i) => 12 - i), ROWSA = [...Array(13)].map((_, i) => i);
// One stub per cell row: store the edge char at that row AND its mirror, step the row, and
// go back round. The run chains get their address for free from "sta abs,x" -- row baked
// into the operand, X supplying the column -- while the edge path used to hand-build two
// 16-bit pointers to write the same two bytes, 42 cycles a character against 5. These give
// the edge cell the same deal.
const edgeSrc = (nm, base) => ROWSA.map(r => {
  const a = base + r * 40, b = base + (24 - r) * 40;
  return `${nm}${r}:` + `\tsta ${hx16(a)},x` + (r === 12 ? '' : `\n\tsta ${hx16(b)},x`) +
         `\n\tinc erow\n\tjmp rfEdgeT`;
}).join('\n');
// rbT[maxHeight] = first cell row that is not fully ceiling; rsT[minHeight] = first row
// that is fully wall. Derived from fill = h + 8R - 92, so they replace a per-cell test
// with one table lookup per column.
const rbT = [...Array(256)].map((_, cmx) => cmx > 92 ? 0 : Math.floor((92 - cmx) / 8) + 1);
const rsT = [...Array(256)].map((_, cmn) => cmn >= 100 ? 0 : Math.ceil((100 - cmn) / 8));
// entry tables: blk indexed by rb (target row rb-1), sld indexed by rs (target row rs)
const blkEnt = sel => ['0', ...ROWSA.map(r => `${sel}bkA${r}`)].concat(['0', ...ROWSA.map(r => `${sel}bkB${r}`)]).join(',');
const sldEnt = sel => [...ROWSA.map(r => `${sel}slA${r}`), '0'].concat([...ROWSA.map(r => `${sel}slB${r}`), '0']).join(',');
const edgEnt = sel => [...ROWSA.map(r => `${sel}edA${r}`), '0'].concat([...ROWSA.map(r => `${sel}edB${r}`), '0']).join(',');
// clampT[(h + K) as signed byte] -> level 0..12. K = 8R-92 is negative for every row above
// the horizon, so the sum is genuinely signed; h is pre-capped at 100 so it cannot wrap.
const clampT = [...Array(256)].map((_, i) => { const v = i < 128 ? i : i - 256;
  return Math.max(CLO, Math.min(CHI, v)) - CLO; });
// clamp8T: the same index straight to the LEVEL C8 uses, 0..8. clampT returns 0..15 -- an index
// into the 16-level clamp, where the level is value+CLO and anything at or above 11 is a full
// column. calcM needs the level, because the thresholds it compares against were computed
// offline on 0..8 shapes; summing clampT instead compares a 0..30 quantity against a 0..17
// threshold, which is the bug this fixes. Doing the arithmetic inline would be `sbc #3` plus a
// clamp at each end, ~20 cycles twice on the hottest path. A second 256-byte table is free:
// the lookup happens either way.
const clamp8T = [...Array(256)].map((_, i) => { const v = i < 128 ? i : i - 256;
  return Math.max(0, Math.min(8, v)); });
// Same table with the value pre-shifted into the high nibble. rampT is indexed by
// wL*16 + wR, and the left level was being shifted left four times right after clampT
// handed it over -- 8 cycles per edge cell to undo a table lookup's own output.
const clampT16 = clampT.map(v => v << 4);
if (PLAN === 3) {
  // ---- the two invariants renderSym's skip-calcM shortcut RELIES on, asserted ----
  // Both were comments until now, and a comment does not fail the build. The shortcut reads the
  // threshold, and on zero jumps straight to the hi half without computing m at all. That is
  // only sound while:
  //
  //   (a) m cannot be negative, so "m >= thr" at thr = 0 is a tautology. m is the sum of two
  //       clamp8T entries, so this is a claim about clamp8T's RANGE -- which is enforced by a
  //       Math.max(0, ...) today and would be silently broken by anyone widening it.
  //   (b) thr == 0 implies lo == hi. The normaliser above guarantees the forward direction, but
  //       NOT the converse: if a future charset plan ever emitted a real threshold of 0 for a
  //       slot whose halves differ, every cell landing there would render the hi half forever.
  //       Nothing else in the pipeline would notice -- it is a wrong CODE, not a wrong shape,
  //       so verify-render would report a handful of stray pixels with no hint of the cause.
  const c8 = clamp8T.findIndex(v => v < 0 || v > 8);
  if (c8 >= 0) throw new Error(
    `clamp8T[${c8}] = ${clamp8T[c8]} is outside 0..8, so m could go negative and renderSym's ` +
    `thr == 0 shortcut (skip calcM, take the hi half) is no longer a tautology`);
  const offenders = [];
  for (let i = 0; i < 256; i++)
    if (rampThrN(i) === 0 && rampTlo[i] !== rampThi[i]) offenders.push(`ramp slot ${i}`);
  for (let k = 0; k < 3; k++) for (let i = 0; i < SLOTN; i++)
    if (stepThrN(k, i) === 0 && stepTlo[k][i] !== stepThi[k][i]) offenders.push(`step k=${k} slot ${i}`);
  if (offenders.length) throw new Error(
    `${offenders.length} slot(s) have threshold 0 but lo != hi (${offenders.slice(0, 4).join(', ')}` +
    `${offenders.length > 4 ? ', ...' : ''}). renderSym treats thr == 0 as "no second codeword" ` +
    `and would always pick the hi half there`);
}

// kTab[R] = 8R-92 as a two's-complement byte: fill = h + kTab[R], clamped to 0..8.
const kTab = [...Array(13)].map((_, R) => (8 * R - 92) & 255);
// per cell-row: cell is fully solid when min height >= t1, fully blank when max < tb.
// fill = h + 8R - 92, so solid at fill>=8 and blank at fill<=0.
const t1Tab = [], tbTab = [];
for (let R = 0; R < 13; R++) { t1Tab.push(100 - 8 * R); tbTab.push(Math.max(0, 93 - 8 * R)); }
const rowLo = [], rowHi = []; for (let R = 0; R < 25; R++) { rowLo.push((R * 40) & 255); rowHi.push((R * 40) >> 8); }

// ---- diagnostic knobs ----
// Read every knob through flag()/hexArg() so DIAG lists exactly the ones in force. Two
// things depend on knowing that: the build must not overwrite the tracked iray.asm with a
// throwaway configuration (see the write site at the bottom), and the "ok:" line has to
// say out loud which knobs are on -- NORAY and NOFILL in particular produce a build that
// renders faster-looking nonsense and have already been mistaken for a real measurement.
const DIAG = [];
const flag = n => { const on = process.env[n] === '1'; if (on) DIAG.push(n); return on; };
const hexArg = (n, dflt, mask) => {
  if (process.env[n] === undefined) return dflt;
  DIAG.push(`${n}=${process.env[n]}`);
  return parseInt(process.env[n], 16) & mask;
};

const MEASURE = flag('MEASURE');
// TOUR=1: spinStep's rotation PLUS a forward/back oscillation. Exists because every test we had
// left half the temporal pivot unexercised -- runviews pins the viewpoint (rotation AND
// translation both zero, so the prediction is a bare table round trip) and SPIN only rotates
// (translation still zero). The pivot's translation term -- two multiplies, the sign handling,
// the reciprocal, the 24-bit product -- had never run on a non-zero input.
//
// Oscillating rather than walking: moveFwd stops dead at a wall, so a plain walk test decays
// into a standing test after a few seconds and reports a flattering number for the wrong reason.
// Out 32 frames, back 32, while turning, cannot wedge.
// It does NOT hop viewpoints, and that is the whole point. The first version reused spinStep,
// which hops on the angle wrap every 256 frames -- exactly the period of the ray-count mean.
// So each sample reported ONE viewpoint, and WHICH one depended on how many frames had elapsed
// in the cycle budget, which depends on the frame rate, which is the thing being measured. Three
// configs landed on three different scenes and produced 9 / 16 / 8 rays; I nearly reported that
// as proof the translation term works. It compares nothing.
//
// Fixed viewpoint + 1 angle unit a frame + a 16-frame oscillation means a 256-frame window is
// exactly one full rotation and a whole number of oscillations -- identical in composition for
// every build, whatever its frame rate. PX/PY choose the scene.
const TOUR = flag('TOUR');
const SPIN = flag('SPIN');
// Viewpoints a SPIN benchmark cycles through, one per full rotation: the start corridor, the
// busiest cell on the map, and two rooms away from both.
// auto-rotate, ignore input. TOUR gets a FIFTH stop that SPIN does not: the four spin
// viewpoints are all simple scenes -- 8-9 rays a frame against 28 at the corridor around
// (3.5,13.5) -- so a tour of them exercises the pivot's code without exercising its workload,
// and reported +1.0% where the hard viewpoint alone gives +25%. SPIN's four are deliberately
// left untouched: fps.sh's ruler changed once before (5f07f0a) and every number from before it
// became incomparable. Do not repeat that to make a graph look better.
const SPINPOS = [[1.5, 1.5], [8.5, 4.5], [12.5, 9.5], [9.5, 12.5]];    // auto-rotate, ignore input
const NORAY = flag('NORAY');   // skip marching/subdivision
const NOFILL = flag('NOFILL'); // skip renderSym (fill)
// DUMPH: print colH as hex over the top 8 rows, so the interpolated heights can be read
// straight off a screenshot. The VICE monitor's checkpoint/bsave route does not survive
// -autostart here, and inferring colH from drawn pixels cannot see values above 100.
const DUMPH = flag('DUMPH');
// static start angle, e.g. PA=4f. Angle-dependent glitches are far easier to pin here than
// under SPIN -- a fixed angle makes the frame reproducible, so a plain -exitscreenshot run
// is comparable across builds without breakpointing the frame counter.
const PA = hexArg('PA', 0, 0xff);
// PX/PY: exact 8.8 start position, matching the on-screen readout's cell.frac hex
// (e.g. the readout showing X=273 is PX=273). Lets a screenshot be replayed exactly.
const PX = hexArg('PX', 0x0180, 0xffff);
const PY = hexArg('PY', 0x0180, 0xffff);
// Angle units per frame while the joystick is held. The angle byte is a full turn in 256
// steps, so this is also the angular resolution of the view -- rayOff/cosCorr are indexed
// by the same byte, so turning cannot be made smooth by shrinking this, only coarser by
// growing it. 6/256 = 8.4 degrees per frame.
// Turning is accumulated in 1/256ths of an angle unit, because 60 deg/s is 0.711 units per
// tick -- less than one. pa is the high byte of a 16-bit angle and paF the low, so the
// fraction carries between frames instead of being lost. 3/16 of a unit per tick * 60 ticks =
// 11.25 units a second = 16 degrees -- a QUARTER of the 63 deg/s it was, to match the walking
// step. The fractional accumulator is what makes a rate this small work at all.
const TURN_RATE = 48;           // 3/16 of an angle unit per tick
// Ticks. The cap exists so a hitch cannot step far enough to jump a wall: at 1 unit of 1/256
// cell per tick, 128 ticks is half a cell against walls a whole cell thick, and the collision
// box catches anything that lands inside one. It rose from 32 with the step's fall from 4 to
// 1 unit, holding that half-cell guarantee exactly. It has to clear the run multipliers too,
// or running would silently stop scaling with frame rate below about 15 fps.
const DT_MAX = 128;
// Panel seams are a look, not a diagnostic: SEAMS=0 compiles every trace of them out --
// the charset entries, the projection pass and the per-cell table -- so the disabled build
// costs exactly what it did before the feature existed.
// PROFILE=1 brackets each phase of the main loop with a raster timestamp and accumulates
// the deltas over 256 frames, then prints them as hex. One run gives the whole split --
// including the raster wait, which the old "call it twice and difference the fps" method
// cannot see at all, because doubling the work just eats into the wait.
const PROFILE0 = flag('PROFILE');
// PROFILE1=1: emit ONLY the whole-frame tick, as an independent check on the phase split.
const PROFILE1 = flag('PROFILE1');
const PROFILE = PROFILE0 || PROFILE1;
// DOUBLE=interpSpan|marchCol calls that routine twice. Differencing two PROFILE runs then
// gives its exact cost -- the old fps-based version of this trick was distorted by the
// raster wait absorbing the extra work.
const DOUBLE = process.env.DOUBLE || '';
if (DOUBLE) DIAG.push(`DOUBLE=${DOUBLE}`);
// NOHUD=1 drops the fps counter and the X/Y readout, keeping only the two hex digits of
// the angle so SPIN can still be measured. That is what the shipping build would look like.
const NOHUD = flag('NOHUD');
// WIGGLE=1: step forward and back on alternate frames, driving moveFwd/moveBack directly. A
// forward step and a back step must be exact inverses, so X/Y in the readout must not move at
// all. Any change is drift, and it is measurable in one run rather than felt over a minute of
// walking. This is how the arithmetic-shift asymmetry was confirmed and then confirmed fixed.
const WIGGLE = flag('WIGGLE');

// Where the CPU-only tables start, and so the ceiling on how much code there may be. A build
// that adds code ahead of this has run into it twice, and the failure is SILENT: the assembler
// errors, VICE boots the PREVIOUS disk, and you read stale numbers off a stale frame.
// $8600 for every build, not just the instrumented ones. Keeping ONE base for all configs
// matters beyond fitting: a measurement build has to have the same table layout as the build
// it is measuring, or the number describes a different program.
const RELOC = +(process.env.RELOC ?? 0x8600);
// NOEDGE=1: skip choosing a ramp/step piece and store SOLID at every wall-top cell. Renders
// wrong on purpose -- it exists only to price the selection, which cannot be isolated any
// other way (the cell COUNTS are unchanged, only the per-cell work).
const NOEDGE = flag('NOEDGE');
// FLATSPAN=1: fill each span with its left endpoint instead of interpolating. Renders wrong
// on purpose. It prices the WHOLE interpolator, which is the ceiling on what any reduction of
// horizontal resolution could win -- halving the column count can save at most about half of
// what the loop costs, and this says what that loop costs.
const FLATSPAN = flag('FLATSPAN');
// NOMINMAX=1: take the cell's min and max from its first column instead of comparing all
// four. Renders slightly wrong; it prices the comparison half of prepCells, leaving the loop
// overhead in place so the two can be told apart.
const NOMINMAX = flag('NOMINMAX');
// RAYCNT=1 shows the number of marchCol calls this frame as two hex digits on row 3. The one
// number that says whether a change to the SUBDIVISION did what it claimed -- fps cannot, since
// it is raster-quantised and mixes in every other phase.
const RAYCNT = flag('RAYCNT');
// PALKEYS=0 drops the 1/2/3 palette cycling (~30 cycles a frame) for clean benchmarking.
const PALKEYS = process.env.PALKEYS !== '0';
const SEAMCOL = +(process.env.SEAMCOL ?? 11);   // $d023: 11 = dark grey (grey 1), 1 = white
const SEAMS = process.env.SEAMS !== '0';
// CVXSEAM=1 (default): a run end gets its seam whether the corner is concave or convex.
// They were dropped from convex ends because the silhouette there already steps 20+ rows so
// the line looked redundant, and because the boundary landed in the one cell an orb needed
// per-column occlusion in. The orb reason is gone, and the line is NOT redundant where it
// matters: below the far wall's top both sides are black, and the grey stripe is the only
// thing dividing them. seamT applies to the SOLID run only -- rows rs..12, where rs comes
// from the cell's MINIMUM height, i.e. the far wall's top -- so the line automatically starts
// where the step pieces end and never runs up the near wall's full height.
// CVXSEAM=0 restores the concave-only rule (and with it the need for cpLoT/cpHiT).
const CVXSEAM = process.env.CVXSEAM !== '0';
// PARTIAL=0 restores the pure equality test on both run caches -- redraw the whole chain on any
// change. The A/B for the shrink/grow skip, and the only way to tell a stale-pixel bug in it
// from ordinary model disagreement, since the pinned six views never exercise either path.
const PARTIAL = process.env.PARTIAL !== '0';
if (!SEAMS) DIAG.push('SEAMS=0');
const WALK = flag('WALK');     // auto-walk forward (sweeps frac through 0)
const STRAFE = flag('STRAFE'); // auto-strafe (parallel to walls)
const BACK = flag('BACK');     // auto-walk backward

// ---- VIC bank 0 memory layout ----
// The double buffer flips between two 1KB screen matrices. Both are RAM the renderer
// WRITES every frame, so any table overlapping one gets shredded a frame at a time --
// and because only one buffer is affected, the two banks then disagree and the display
// alternates between a good and a corrupt image. Buffer B used to sit at $2000, which
// overlapped the tail of patTab ($1d61-$20a1); drawDbg's black plate landed on
// patTab[cr=11][h=3..5], the live partial-fill entries for the cell row just above the
// horizon. Kept at $2400 so the whole data segment clears it; enforced by the guard
// after assemble(), which checks every reserved region, not just the charset.
// ===================== VIC BANK 3: GRAPHICS, AND ONLY GRAPHICS =====================
// The VIC lives in bank 3 ($c000-$ffff) and everything it reads lives there; nothing else does.
// A bank you can reason about as a unit is worth more than the churn of moving things out of it,
// and it makes the sprite budget one number instead of "whatever is left between the tables".
//
// THE POINT OF BANK 3 IS THE I/O HOLE. The VIC's fetches do not go through the processor port --
// the only exception is the character ROM, which it sees at $1000-$1fff in banks 0 and 2. So in
// bank 3 the VIC reads plain RAM at $d000-$dfff, which is exactly 4KB, exactly two charsets, and
// exactly the RAM the CPU can never use because it needs I/O mapped there. Free space.
//
// Two consequences worth stating out loud:
//   - The charsets CANNOT be loaded into place: LOAD runs with I/O mapped, so the loader would
//     write VIC and CIA registers instead of memory. So the charset is not LOADED at all: the
//     up at startup with the port switched to $34. See cpChr.
//   - CHARSET_B at $d800 sits under COLOUR RAM. Those are different physical memories: colour RAM
//     is a separate 1K chip the CPU reaches when I/O is mapped, and the DRAM underneath is what
//     the VIC reads. They coexist, and the colour-RAM init must run with I/O mapped while the
//     charset copy runs with it banked out.
//
// Bank 0 is now CPU-only, so the char-ROM shadow at $1000-$1fff stops mattering entirely.
const VBANK = 0xc000;                   // VIC bank 3
const SCR_A = 0xe000;                   // both screens must stay CPU-writable: renderSym
const SCR_B = 0xe400;                   //   writes one of them every frame
const CHARSET = 0xd000;                 // charset A: upright glyphs, above the horizon
const CHARSET_B = 0xd800;               // charset B: every glyph flipped, below the horizon
// Charset B is DERIVED from A at startup (see cpChr), so only ONE charset exists anywhere --
// and it is never in the image: the loader decodes it straight into $d000, which is the one
// thing a KERNAL LOAD cannot do. The paragraph that used to be here described a low "source"
// copy at $3000-$3fff and two build guards defending it; all of that is gone.
// CHARSRC is GONE. The charset is not in the image at any address: it is a separate compressed
// segment the loader decodes straight into $d000. Nothing here may name a load address for it,
// because there isn't one -- the destination lives in the --seg argument, and $d000/$d800 are named
// by the `charset`/`charsetB` equates, which is where the CPU and the VIC actually find it.
// FTABLES is GONE, and deliberately not replaced by a constant nobody uses. f0Lo/f0Hi/f1Lo/f1Hi
// and the run-id tables were moved up to RELOC with the rest of the CPU-only tables; only this
// constant and a build guard citing it stayed behind at $3000, reserving 2KB against a tenant that
// had left and pinning the code's ceiling at $2800 for years. The charsets occupy $3000-$3fff now.
// If a table needs a base address, take it from RELOC's allocation, not from a fresh constant --
// a constant is a claim about the map that nothing checks. The charsets are NOT at $3000 any
// more either -- that space is the orb tables and the code's growth room.
const NEWTABLES = 0x4000;               // clampT / rampT / stepT

// ============================ ORBS: the data layer ============================
// Restored 2026-08-12 from ddfa4bc^ (the pass deleted at ddfa4bc), porting ONLY what does not
// depend on the abandoned two-blacks occlusion scheme: the art and its resampling ladder, the
// placement, the per-cell visibility lists, and the per-variant/per-orb tables. The charset
// twins, the four painting rules, repointing and STEPSTATIC are deliberately NOT brought back --
// occlusion will be done by stamping foreground-black chars per orb per cell instead.
const SPRITES = process.env.SPRITES !== '0';
// DBGORB=1 dumps the LAST orb processed -- which is the FARTHEST one, since the candidate list
// is distance-sorted. The orb you are looking at is usually sprite 0, the nearest. Snapshot on
// onv == 0 or you will spend a run reading about an orb that is off-screen.
const DBGORB = process.env.DBGORB === '1';
// ORBOCC=0 switches the whole-orb occlusion test off, so it can be A/B'd in one run the way
// SPRITES=0 does. With it off every projected orb draws, including ones entirely behind a wall.
const ORBOCC = process.env.ORBOCC !== '0';
// ORBINV=0: stamp but do NOT invalidate the run cache. Renders with trails; exists to price the
// invalidation separately from the stamping, which is the only way to know which one costs.
const ORBINV = process.env.ORBINV !== '0';
// ORBDESEAM=0: skip the seam sweep, to price it against the stamping.
const ORBDESEAM = process.env.ORBDESEAM !== '0';
// ORBFG=<n>: tint the OCCLUDERS. Bit pair 11 takes its colour from the low three bits of colour
// RAM, so filling it with $08|n paints every stamped cell colour n while walls (pair 01, $d022)
// and ceiling (00, $d021) stay as they are. ORBFG=6 makes every cell the stamp touches blue,
// which is the only way to see WHERE it is drawing rather than infer it from what looks wrong.
const ORBFG = process.env.ORBFG;
// ORBSTAMP=0 disables PARTIAL occlusion. On by default: the slot-count clobber that made this
// walk a hundred garbage slots per frame is fixed -- see orbStamp's entry.
const ORBSTAMP = process.env.ORBSTAMP !== '0';
// ORBGATE=1 restores the build-time canOcc gate on the STAMP pass. OFF by default.
//
// canOcc comes from blockers(), which marches from 9 eye positions in the cell across +-0.25
// cells of the orb. That answers "can this orb be occluded from this cell" well enough for the
// WHOLE-ORB hide, but partial occlusion asks a wider question -- can any PART of it be hidden
// from anywhere in the cell -- and ORBGATECHK=1 measures the gate answering "no" wrongly for
// 4 of 426 gated candidates (0.9%). Each of those is an orb that visibly overlaps a wall for as
// long as you stand in that cell, and pops correct again one step later.
//
// Skipping the gate costs 21.59 -> 21.48 fps, which is worth not having that class of bug.
const ORBGATE = process.env.ORBGATE === '1';
// ORBNOCELL=1: walk and decide, but stamp nothing. Separates the SEARCH cost from the WRITING.
const ORBNOCELL = process.env.ORBNOCELL === '1';
// The sprite bitmaps are PLACED into VIC bank 3 by the self-extracting loader ($c000, 64-byte
// aligned, first of the 159 free slots) rather than emitted into the image. They were at $2000
// in bank 0 before the bank-3 move, which is now the code's growth room.
const SPRBASE = 0xc000;
// The orb tables go at the TOP of the hole above the code, ending at $4000 where the first
// emitted table begins. Placing them at the top rather than the bottom keeps the code's growth
// room ONE contiguous piece below them instead of splitting the hole in two. RELOC+0x1300,
// where these lived before, belongs to FINEANG's quarter-angle tables now.
//
// Named bases rather than offsets from one origin: the visibility lists are 2.3KB, an order of
// magnitude bigger than everything else here, and an offset scheme invites the mistake of
// budgeting them like a small table. The four 256-entry tables are page-aligned because the
// 6502 indexes them by a whole byte (cell number, or h).
const ORB_VART     = 0x2d00;    // h -> size variant, 256
const ORB_CANDCNT  = 0x2e00;    // per cell: how many candidates, 256
const ORB_CANDLO   = 0x2f00;    // per cell: pointer to its list, lo/hi, 256 each
const ORB_CANDHI   = 0x3000;
const ORB_OCC      = 0x3100;    // occluder masks, OCCBYTES x norbs
const ORB_SMALL    = 0x3300;    // the per-variant and per-orb tables: FOUR pages. The ladder
                                //   made every per-variant table 22 entries instead of 18, and
                                //   the stamp pass added orbAnchT, so two pages stopped fitting.
const ORB_CANDLIST = 0x3700;    // the visibility lists themselves: 3 bytes per candidate
const ORB_TOP      = 0x4000;    // and the first emitted table, which they must not reach

const ORB4RAW = [0, 170, 0, 10, 170, 160, 43, 234, 168, 47, 170, 168, 174, 170, 169, 170, 170, 169, 170, 170, 169, 170, 170, 165, 170, 170, 165, 170, 170, 165, 170, 170, 149, 42, 170, 148, 42, 170, 84, 10, 149, 80, 0, 85, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 255, 255, 255, 3, 255, 192];
const ORBSRC12 = (() => {
  const d = ORB4RAW, g = [];
  for (let y = 0; y < 21; y++) { const r = [];
    for (let b = 0; b < 3; b++) for (let i = 0; i < 4; i++) r.push((d[y * 3 + b] >> (6 - 2 * i)) & 3);
    g.push(r); }
  return g;
})();
// Scale about the DRAWN content, not the 12x21 frame it happens to sit in.
const _cols = [...Array(12).keys()].filter(x => ORBSRC12.some(r => r[x]));
const _rows = [...Array(21).keys()].filter(y => ORBSRC12[y].some(v => v));
const SX0 = Math.min(..._cols), SX1 = Math.max(..._cols);
const SY0 = Math.min(..._rows), SY1 = Math.max(..._rows);
const SW = SX1 - SX0 + 1, SH = SY1 - SY0 + 1;
// ---- one scheme for the whole sprite ----
// The ball, the gap and the ground shadow used to be three regions, each resampled with its own
// threshold and its own independent rounding of its row count. That is what produced the visible
// jump: at bitmap width 9 all three roundings tipped at once and the drawn height fell from 19
// rows to 15 for a 10% change in width -- a lurch, not a step. The regions are gone.
//
// The rule is now: resample the whole content box to w x h, and give each destination pixel the
// MOST COMMON of the four values among its samples, with transparency competing on equal terms.
// No thresholds, no per-region special cases, nothing tuned. Ties go to the higher index, so a
// half-covered edge pixel fills rather than erodes and a highlight survives against body colour
// at small sizes -- the case that made nearest-neighbour unusable below about 6px across.
const ORBSAMP = 4;                              // NxN point samples per destination pixel
function orbScale(w, h) {
  const out = [...Array(21)].map(() => new Array(12).fill(0));
  const ox = (12 - w) >> 1, oy = 21 - h;        // centred across, and standing on the floor
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const t = [0, 0, 0, 0];
    for (let i = 0; i < ORBSAMP; i++) for (let j = 0; j < ORBSAMP; j++) {
      const sx = Math.floor(SX0 + SW * (dx + (i + 0.5) / ORBSAMP) / w);
      const sy = Math.floor(SY0 + SH * (dy + (j + 0.5) / ORBSAMP) / h);
      if (sx >= 0 && sx < 12 && sy >= 0 && sy < 21) t[ORBSRC12[sy][sx]]++;
    }
    let bn = -1, v = 0;
    for (let k = 0; k < 4; k++) if (t[k] >= bn) { bn = t[k]; v = k; }
    out[oy + dy][ox + dx] = v;
  }
  return out;
}
// ---- the ladder: one rung per 2 APPARENT screen pixels of height ----
// A bitmap row is 2 screen rows when the VIC expands the sprite and 1 when it does not, so the
// same 2px rule means stepping the bitmap by ONE row while expanded and TWO while not. The
// expanded half runs down to where its apparent height meets the largest unexpanded one (22 vs
// 21), and the two halves SHARE bitmaps -- an expanded rung and a normal rung of the same bitmap
// height are the same 63 bytes with a different register bit. 22 rungs from 16 bitmaps.
//
// Driven by height rather than width because height has 21 levels against width's 12, so it is
// the finer axis: stepping it gives 4.8-6.3% near-range steps where stepping width gave 9-17%.
// The cost is that five expanded rungs repeat the previous width, since width cannot follow at
// that resolution -- the orb shrinks vertically for one rung before its width catches up, about
// +-5% of aspect wobble. That is the trade: a small squash instead of a large jump.
const orbW = h => Math.max(1, Math.round(SW * h / SH));
const LADDER = [];
for (let h = SH; 2 * h >= SH; h--) LADDER.push({ h, exp: 1 });
for (let h = SH; h >= 1; h -= 2)   LADDER.push({ h, exp: 0 });
const ORBBMH = [...new Set(LADDER.map(r => r.h))].sort((a, b) => b - a);   // distinct bitmaps
const ORBBM = ORBBMH.map(h => {
  const g = orbScale(orbW(h), h), bytes = [];
  for (let y = 0; y < 21; y++) for (let b = 0; b < 3; b++)
    bytes.push([0, 1, 2, 3].reduce((v, k) => v | (g[y][b * 4 + k] << (6 - 2 * k)), 0));
  bytes.push(0);
  return bytes;
});
const NORBBM = ORBBM.length;
// The widest rung must come back byte-identical to the art it was scaled from. If a change to
// the resampler breaks that, every other rung is suspect too.
if (ORBBM[0].slice(0, 63).join() !== ORB4RAW.slice(0, 63).join())
  throw new Error('orbScale does not reproduce ORB4 at full size -- the resampler changed');
const ORBSRC = LADDER.map(r => ORBBMH.indexOf(r.h));
const ORBEXP = LADDER.map(r => r.exp);
const ORBWIDE = LADDER.map(r => orbW(r.h) * (r.exp ? 4 : 2));    // apparent width, screen px
const ORBTALL = LADDER.map(r => r.h * (r.exp ? 2 : 1));          // apparent height, screen px
if (process.env.ORBDUMP === '1') {
  const CH = [' ', '.', '#', 'o'];
  console.error(`  ${LADDER.length} rungs from ${NORBBM} bitmaps (${NORBBM * 64} bytes, ` +
                `${NORBBM} of 159 sprite slots)`);
  LADDER.forEach((r, v) => {
    const g = orbScale(orbW(r.h), r.h);
    const step = v ? (100 * (1 - ORBTALL[v] / ORBTALL[v - 1])).toFixed(1) + '%' : '-';
    console.error(`  --- rung ${v + 1}: bitmap ${orbW(r.h)}x${r.h}${r.exp ? ' EXPANDED' : ''}` +
                  `, apparent ${ORBTALL[v]}h x ${ORBWIDE[v]}w, step ${step}`);
    for (let y = 21 - r.h; y < 21; y++)
      console.error('      |' + g[y].map(c => CH[c]).join('').replace(/\s+$/, '').padEnd(12) + '|');
  });
}
// The content is bottom-aligned in every bitmap, so the ground shadow always ends on the
// sprite's last row and the anchor is simply the sprite's height. No per-variant table of
// hand-measured shadow positions any more.
const ORBANCH = ORBEXP.map(e => e ? 42 : 21);
// The whole scene is white ceiling, black wall, grey-1 seams -- so the orbs go monochrome too
// and the palette closes: grey 1 underside, grey 2 body, grey 3 highlight and ground shadow.
// ORBPAL=colour brings back light blue / light red / light green bodies.
const ORBBODY = process.env.ORBPAL === 'colour' ? [14, 10, 13] : [12, 12, 12];
const ORBUNDER = 11, ORBHILITE = 15;             // shared: $d025 underside, $d026 highlight

// Placement. Greedy over the open cells with a minimum spacing, which spreads them through
// every room and corridor without clumping. 2.2 cells lands 34 orbs and keeps the worst cell's
// candidate list to 9 -- see the visibility lists below, which are what make this affordable.
const ORBSPACE = +(process.env.ORBSPACE ?? 2.2);
// How far an orb can be and still make the cell's list. A full projection is ~2400 cycles
// whether the orb ends up 48 pixels across or 4, so the tail of tiny distant dots is the
// expensive part of being generous. 9 cells is where an orb is still a couple of pixels.
const ORBSEE = +(process.env.ORBSEE ?? 9);
const ORBS = [];
for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) {
  if (map[y * 16 + x]) continue;
  const cx = x + 0.5, cy = y + 0.5;
  if (cx < 2 && cy < 2) continue;                // not sitting on the player's start
  if (ORBS.some(o => Math.hypot(o.x - cx, o.y - cy) < ORBSPACE)) continue;
  ORBS.push({ x: cx, y: cy, c: ORBS.length % ORBBODY.length });
}
if (process.env.ORBWHERE)
  ORBS.forEach((o, i) => { if (String(i) === process.env.ORBWHERE)
    console.error(`  orb ${i}: world x=${o.x} y=${o.y}`); });
if (ORBS.length > 255) throw new Error(`${ORBS.length} orbs: the index tables are byte-sized`);

// Per-cell candidate lists. Projecting an orb costs about a thousand cycles, so the thing that
// decides whether many orbs are affordable at all is how few we even look at. From any cell,
// only orbs with line of sight can possibly be on screen, and in a corridor maze that is very
// few: mean 4.3, worst 9. Sorted by distance, so taking the first eight that project takes the
// NEAREST eight, and assigning them to sprites in order gets the overlap priority right for
// free -- sprite 0 draws over sprite 1.
// ---- which walls can occlude which orb ----
// A wall face occludes an orb only if the orb is on the FAR side of that face's plane. We
// render camera-facing faces only, so a face that appears on screen already faces the camera;
// if the orb is beyond it, the face is between them. That answer does not involve the camera
// at all, so it is a constant: 66 runs x 34 orbs, computed here, one bit each.
//
// This replaces comparing the orb's height against the wall's. Depth comparison is per column
// and quantised, so two neighbouring cells of one flat wall could disagree -- which is where
// every occlusion artifact in this thing has come from. A plane test is per FACE, so every
// cell showing that face gets the same answer by construction.
const OCCBYTES = (nextRun + 7) >> 3;
const orbOcc = ORBS.map(o => {
  const m = new Array(OCCBYTES).fill(0);
  for (let r = 1; r < nextRun; r++) {
    const k = runPlane[r];
    const beyond = runFace[r] === 'W' ? o.x > k : runFace[r] === 'E' ? o.x < k
                 : runFace[r] === 'N' ? o.y > k : o.y < k;
    if (beyond) m[r >> 3] |= 1 << (r & 7);
  }
  return m;
});
if (SPRITES) console.error(`  occluders: ${OCCBYTES} bytes x ${ORBS.length} orbs = ${OCCBYTES * ORBS.length}` +
  ` bytes; a run can occlude ${(orbOcc.reduce((a, m) =>
    a + m.reduce((b, v) => b + v.toString(2).split('1').length - 1, 0), 0) / ORBS.length).toFixed(1)}` +
  ` orbs on average`);

const losFree = (ax, ay, bx, by) => {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 8);
  for (let i = 1; i < n; i++) { const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (map[(y | 0) * 16 + (x | 0)]) return false; }
  return true;
};
const CANDBASE = ORB_CANDLIST;                    // a FULL address: the 6502 loads it into a pointer
const candList = [], candLo = new Array(256).fill(0), candHi = new Array(256).fill(0),
      candCnt = new Array(256).fill(0);
for (let cell = 0; cell < 256; cell++) {
  const x = cell & 15, y = cell >> 4;
  if (map[cell]) continue;
  const cx = x + 0.5, cy = y + 0.5;
  // Line of sight from ANYWHERE in the cell, not just its centre. The player occupies the
  // whole cell, and standing at one edge you can see round a corner the centre cannot -- which
  // showed up as an orb popping in and out as you walked a corridor, present in cells 9 and 11
  // and missing in 10. Sampling a 3x3 grid makes the list a superset of what is reachable.
  const eye = [-0.45, 0, 0.45].flatMap(ox => [-0.45, 0, 0.45].map(oy => [cx + ox, cy + oy]));
  const vis = ORBS.map((o, i) => ({ i, d: Math.hypot(o.x - cx, o.y - cy) }))
    .filter(o => o.d < ORBSEE &&
      eye.some(([ex, ey]) => losFree(ex, ey, ORBS[o.i].x, ORBS[o.i].y)))
    .sort((a, b) => a.d - b.d);
  // FULL ADDRESS, not an offset: the 6502 loads these straight into a pointer.
  const a = CANDBASE + candList.length;
  candLo[cell] = a & 255; candHi[cell] = a >> 8;
  candCnt[cell] = vis.length;
  // Three bytes per candidate: orb index, bearing from this cell, and how far off that
  // bearing the player may still see it. The list covers all 360 degrees but the FOV is 66,
  // so without this test four candidates in five are fully projected only to be discarded --
  // and a full projection is about 2000 cycles against 20 for the test.
  // What can get BETWEEN an eye position in this cell and the orb? Asking "what runs are
  // visible from here" was far too broad -- from most cells you can see most of the map, so
  // it skipped almost nothing. March each eye position at the orb instead, across the orb's
  // width, and see what is hit on the way.
  const blockers = (o) => {
    const out = new Set();
    for (const [ex, ey] of eye) {
      const vx = o.x - ex, vy = o.y - ey, L = Math.hypot(vx, vy) || 1;
      for (const off of [-0.25, 0, 0.25]) {          // the orb has width, so sample across it
        const tx = o.x - vy / L * off, ty = o.y + vx / L * off;
        const dx = tx - ex, dy = ty - ey, n = Math.ceil(Math.hypot(dx, dy) * 8);
        for (let i = 1; i < n; i++) {
          const t = i / n, x = ex + dx * t, y = ey + dy * t;
          const mx = x | 0, my = y | 0;
          if (mx < 0 || my < 0 || mx > 15 || my > 15) break;
          if (map[my * 16 + mx]) {                    // which face did we come through?
            const px2 = ex + dx * ((i - 1) / n), py2 = ey + dy * ((i - 1) / n);
            const t2 = (px2 | 0) !== mx ? (dx > 0 ? runW : runE) : (dy > 0 ? runN : runS);
            out.add(t2[my * 16 + mx]); break;
          }
        }
      }
    }
    return out;
  };
  for (const v of vis) {
    const o = ORBS[v.i];
    const brg = Math.round(Math.atan2(o.y - cy, o.x - cx) / (2 * Math.PI) * 256) & 255;
    // Half the FOV, plus however far the bearing can swing as the player moves off the cell
    // centre -- up to 0.71 cells away, which matters enormously for a near orb.
    const win = Math.min(127, Math.ceil(FOV / 2 + Math.atan2(0.71, Math.max(v.d, 0.71))
                                                  / (2 * Math.PI) * 256) + 2);
    // Bit 7 of the window byte is spare (windows never exceed 127): set it when some run
    // visible from this cell could occlude this orb.
    const canOcc = [...blockers(o)].some(r => (orbOcc[v.i][r >> 3] >> (r & 7)) & 1);
    candList.push(v.i, brg, win | (canOcc ? 0x80 : 0));
  }
}
if (ORB_CANDLIST + candList.length > ORB_TOP) throw new Error(
  `visibility lists are ${candList.length} bytes, ending at $${(ORB_CANDLIST + candList.length)
  .toString(16)} past the first emitted table at $${ORB_TOP.toString(16)}. ORBSEE (currently ` +
  `${ORBSEE} cells) is the knob: it decides how many orbs each cell may list.`);
// ORBDIAG=1 writes every input to the occlusion decision as JSON. Occlusion questions are
// "which run, which plane, which orb, was it culled" -- all build-time constants -- and
// re-deriving them in a separate script is how the last analysis went wrong (it approximated
// the projection and pointed at a viewpoint where nothing clipped at all). Dump the real ones.
if (process.env.ORBDIAG === '1') {
  const perCell = {};
  for (let c = 0; c < 256; c++) {
    if (map[c] || !candCnt[c]) continue;
    const base = (candLo[c] | (candHi[c] << 8)) - CANDBASE;
    perCell[`${c % 16},${c >> 4}`] = [...Array(candCnt[c])].map((_, j) => ({
      orb: candList[base + j * 3], brg: candList[base + j * 3 + 1],
      win: candList[base + j * 3 + 2] & 0x7f,
      canOcc: !!(candList[base + j * 3 + 2] & 0x80),
    }));
  }
  writeFileSync('orbdiag.json', JSON.stringify({
    orbs: ORBS, runFace, runPlane, nextRun, map,
    runW, runE, runN, runS,
    orbOcc: orbOcc.map(m => m.map(b => b)), perCell,
  }));
  console.error('ORBDIAG: wrote orbdiag.json');
}
// ORBOCCFIND=1: name viewpoints where the whole-orb test MUST fire. The runtime test can only
// hide an orb the visibility list still offers, so the case is: some eye position in the cell
// sees the orb (hence it is listed) but the cell CENTRE does not (hence standing there, every
// column under it is wall). Rare by construction, which is why walking around did not find one.
if (process.env.ORBOCCFIND === '1') {
  const hits = [];
  for (let cell = 0; cell < 256; cell++) {
    if (map[cell] || !candCnt[cell]) continue;
    const cx = (cell & 15) + 0.5, cy = (cell >> 4) + 0.5;
    const base = (candLo[cell] | (candHi[cell] << 8)) - CANDBASE;
    for (let j = 0; j < candCnt[cell]; j++) {
      const oi = candList[base + j * 3], win = candList[base + j * 3 + 2];
      if (!(win & 0x80)) continue;                       // build says nothing can occlude it
      const o = ORBS[oi];
      if (losFree(cx, cy, o.x, o.y)) continue;           // visible from the centre: no good
      const brg = Math.round(Math.atan2(o.y - cy, o.x - cx) / (2 * Math.PI) * 256) & 255;
      hits.push({ cell, cx, cy, oi, brg, d: Math.hypot(o.x - cx, o.y - cy) });
    }
  }
  hits.sort((a, b) => a.d - b.d);
  console.error(`ORBOCCFIND: ${hits.length} (cell, orb) pairs where the test must fire`);
  for (const h of hits.slice(0, 6))
    console.error(`  PX=${(h.cx * 256).toString(16).padStart(4, '0')} ` +
      `PY=${(h.cy * 256).toString(16).padStart(4, '0')} PA=${h.brg.toString(16).padStart(2, '0')}` +
      `   orb ${h.oi} at ${h.d.toFixed(1)} cells, blocked from the cell centre`);
}
// ORBGATECHK=1: is the build-time canOcc bit ever WRONG? blockers() marches from 9 eye positions
// across +-0.25 cells of the orb. Partial occlusion needs "can any part of this orb be hidden from
// anywhere in this cell", which is a wider question -- and if the gate says no where the answer is
// yes, the stamp is skipped and the orb visibly overlaps the wall. Sample the cell far more finely
// here, and across the orb's real half-width, to find out.
if (process.env.ORBGATECHK === '1') {
  let checked = 0, wrong = 0;
  const N = 7, OFF = [-0.45, 0.45];
  for (let cell = 0; cell < 256; cell++) {
    if (map[cell] || !candCnt[cell]) continue;
    const cx = (cell & 15) + 0.5, cy = (cell >> 4) + 0.5;
    const base = (candLo[cell] | (candHi[cell] << 8)) - CANDBASE;
    for (let j = 0; j < candCnt[cell]; j++) {
      const oi = candList[base + j * 3], win = candList[base + j * 3 + 2];
      if (win & 0x80) continue;              // gate already says occlusion is possible
      checked++;
      const o = ORBS[oi];
      // the orb's true half-width in cells at this distance: apparent width / (2 * 163 / d)
      const d = Math.hypot(o.x - cx, o.y - cy);
      // The orb's world half-width. The screen spans 2*d*tan(FOV/2) ~= 0.87*d cells, and the
      // ball is about 49 of 320 pixels across at any distance, so its diameter is ~0.13*d cells.
      // ORBSCALE is declared further down the file, so the constant is inlined here.
      const half = Math.max(0.2, 0.067 * d);
      let bad = false;
      for (let a = 0; a < N && !bad; a++) for (let b = 0; b < N && !bad; b++) {
        const ex = cx + OFF[0] + (OFF[1] - OFF[0]) * a / (N - 1);
        const ey = cy + OFF[0] + (OFF[1] - OFF[0]) * b / (N - 1);
        const vx = o.x - ex, vy = o.y - ey, L = Math.hypot(vx, vy) || 1;
        for (const t of [-half, half])
          if (!losFree(ex, ey, o.x - vy / L * t, o.y + vx / L * t)) bad = true;
      }
      if (bad) wrong++;
    }
  }
  console.error(`ORBGATECHK: ${wrong} of ${checked} candidates whose gate says "nothing can ` +
    `occlude" ARE partly occluded from somewhere in their cell (${(100*wrong/checked).toFixed(1)}%)`);
}
const _pal = [...new Set(ORBBODY)].length === 1
  ? `all body colour ${ORBBODY[0]}`
  : ORBBODY.map((b, c) => `${ORBS.filter(o => o.c === c).length}x${b}`).join('/');
if (SPRITES) console.error(`orbs: ${ORBS.length} placed (${_pal}), visibility lists ` +
  `${candList.length} bytes (3/candidate), worst cell sees ${Math.max(...candCnt)}; ` +
  `${(100 * candList.filter((_, i) => i % 3 === 2 && (candList[i] & 0x80)).length /
     (candList.length / 3)).toFixed(0)}% of candidates could be occluded from their cell`);
// Every orb is at a cell CENTRE, and orbOne leans on it hard: the offset to an orb is an
// integer cell difference plus a fraction that is the same for every orb in the frame, so the
// fractional half of each product becomes a per-frame constant and the per-orb half drops from
// a 16x8 multiply to an 8x8. If placement ever stops being cell-centred, that has to be undone.
for (const o of ORBS) if ((o.x % 1) !== 0.5 || (o.y % 1) !== 0.5)
  throw new Error(`orb at (${o.x},${o.y}) is not cell-centred; orbOne assumes it is`);
const orbXC = ORBS.map(o => o.x | 0), orbYC = ORBS.map(o => o.y | 0);

const orbCol = ORBS.map(o => ORBBODY[o.c]);
// h -> size variant. The walls are 88/d tall, so scaling the orbs off the same h keeps them
// locked to the world rather than to the screen. ORBSCALE is the ball's diameter in pixels at
// h = 88, i.e. how big it looks one cell away.
// The ladder has to reach its top before the orb walks off the bottom of the screen. At 34
// the largest variant needed h > 103 while orbOne rejects h >= HMAX, so orb6 could never be
// chosen at all -- the ladder topped out one rung short. Scaled so the top rung lands where
// the second-from-top used to, which shifts every band down with it.
const ORBSCALE = +(process.env.ORBSCALE ?? 49);
// The largest h any variant can still show at: $d001 = (150 - anchor) + h must stay under 251.
const ORBHMAX = 251 - (150 - Math.max(...ORBANCH));
// Selection is by apparent HEIGHT, not width. The ladder steps height evenly, and width -- with
// only 12 levels against height's 21 -- cannot follow: five rungs repeat the width of the rung
// above them. Choosing on width therefore made those five UNREACHABLE, because a nearest-width
// search can only ever return the first of a pair. ORBSCALE keeps its meaning (the ball's
// diameter in pixels at h = 88, a width) and is converted through the top rung's own aspect, so
// the tuning knob is unchanged.
const orbVarT = [...Array(256)].map((_, h) => {
  const want = (ORBSCALE * h / 88) * ORBTALL[0] / ORBWIDE[0];
  let b = 0; for (let v = 1; v < ORBTALL.length; v++)
    if (Math.abs(ORBTALL[v] - want) < Math.abs(ORBTALL[b] - want)) b = v;   // ties keep the
                                        // earlier (expanded) entry: twice the horizontal detail
  return b;
});
{ // which rungs can actually be reached, and at what distance each one takes over?
  const band = [];
  for (let v = 0; v < ORBWIDE.length; v++) {
    const lim = 251 - (150 - ORBANCH[v]);
    const hs = [...Array(lim).keys()].filter(h => orbVarT[h] === v);
    band.push(hs.length ? `${ORBTALL[v]}h@${(22528 / hs[hs.length - 1] / 256).toFixed(2)}-` +
      `${(22528 / Math.max(hs[0], 1) / 256).toFixed(2)}` : `${ORBTALL[v]}h/${ORBWIDE[v]}w UNREACHABLE`);
  }
  if (SPRITES) console.error(`  orb size ladder (cells): ${band.join('  ')}`);
}
// A sprite pointer is BANK-RELATIVE, not absolute: the VIC forms the address as bank base +
// pointer*64. This read (SPRBASE >> 6) when bank 0 made the two the same thing -- the identical
// latent assumption that vm()/cb() carried into the bank-3 move. In bank 3 the absolute form
// would give 768, which does not even fit in a pointer byte.
const orbPtrT = ORBSRC.map(b => ((SPRBASE - VBANK) >> 6) + b);
const orbExpT = ORBEXP.map(e => e);
// Distance from the sprite's LEFT EDGE to the anchor the projection aims at. orbScale centres
// the content in the 12-column sprite, so this is ~half the sprite whatever the ball's size;
// using ballWidth/2 drew small orbs up to 10px right of where they belong AND shifted them on
// every variant change, which is the scaling jump. It also put the sprite somewhere the depth
// scan had not tested, hence stray occlusion.
//
// NOTE the `b` here is ORBSRC -- an INDEX into the bitmap list, not a width -- so `w` is not the
// ball's width and this is not the ball's centre. It lands on the SPRITE's centre instead, which
// is why it comes out a near-constant 11/12 (22/24 expanded) and why the scaling jump stayed
// fixed. It is left exactly as it is: it defines where every orb is drawn. What must not happen
// again is a SECOND, independently-derived idea of where the ball is -- so the bounding box
// below is computed FROM this value rather than alongside it.
const orbHalfT = ORBSRC.map((b, v) => {
  const w = b + 1, ox = (12 - w) >> 1;
  return (2 * ox + w) * (ORBEXP[v] ? 2 : 1);
});
// 150 - anchor: raster 50 + display row 100, less the rows from the sprite's top down to the
// bottom of its ground shadow. Adding h to THIS cannot overflow until the orb is long gone.
const orbYBaseT = ORBANCH.map(a => 150 - a);
// Leading blank rows per variant, doubled when the VIC expands, and the sprite's total height.
// The ball is bottom-aligned in every bitmap, so a small variant carries most of its 21 rows
// blank ABOVE the ball -- up to two and a half char rows of nothing. orbSeam uses these to
// patch only the rows an orb actually inks; using the raw sprite rectangle instead is what
// once made seams vanish in cells with no orb near them.
const orbBlankT = LADDER.map((r, v) => ORBANCH[v] - ORBTALL[v]);
const orbHgtT = ORBSRC.map((b, v) => 21 * (ORBEXP[v] ? 2 : 1));
// Half the sprite, in LOGICAL COLUMNS. Everything in this engine lives on the 160x200 grid, and
// a multicolor sprite pixel is two hires pixels, so a sprite has no odd X worth taking: the old
// code built a 16-bit hires X and then snapped its low bit off again (`and #$fe`). Rounding UP
// here is exactly what that snap did -- effective halfWidth h + (h & 1) -- so no orb moves.
const orbHalfCT = orbHalfT.map(h => Math.ceil(h / 2));
// X = 24 + 2*col, and 24 hires px is 12 columns, so X = 2 * (col + 12) and the sprite's left
// column is ocol - orbHalfCT. Fold both into one table: b = ocol + orbXOffT, X = b << 1. The
// offset is never negative (orbHalfCT is 6..12), so it is a plain ADC with no sign handling, and
// X comes out EVEN by construction rather than by masking.
const orbXOffT = orbHalfCT.map(h => 12 - h);
if (orbXOffT.some(v => v < 0 || v > 12))
  throw new Error('orbXOffT out of range -- a sprite is more than 12 columns off its own centre');

// The bounding box, as the ball's TRUE extent in logical columns each side of ocol. Asymmetric,
// and it has to be: the ball is centred in the sprite by ox = (12 - w) >> 1, which TRUNCATES, so
// whenever 12 - w is odd the ball sits half a sprite-pixel left of the sprite's centre -- and
// ocol is the sprite's centre (see orbHalfT). A symmetric +/-halfWidth box cannot express that,
// nor can it express an even-column-wide ball at all, since it is always an odd number of columns
// wide. Rung 10 measured: a 7-wide expanded ball spans 14 columns at -8/+5 about ocol, where the
// symmetric box claimed +/-7 -- so it missed the ball's leftmost column, and a one-column sliver
// of orb showed through a wall that was otherwise clipping it correctly.
//
// Derived from orbHalfCT so the two can never drift apart: the sprite's left column is
// ocol - orbHalfCT, and the ball starts ox sprite-pixels into it.
//
// EXACT, with no rounding anywhere, because sprite X is now built on the 160-column grid (see
// orbXOffT). While X was a hires quantity that got its low bit snapped off at the end, the box
// had to round outward to cover the half column the snap could take.
const orbBoxT = LADDER.map((r, v) => {
  const w = orbW(r.h), ox = (12 - w) >> 1, xx = r.exp ? 2 : 1;
  const left = ox * xx, wide = w * xx;                   // logical columns, from the sprite's left
  return { l: orbHalfCT[v] - left, r: left + wide - 1 - orbHalfCT[v] };
});
const orbColLT = orbBoxT.map(b => b.l);          // columns from ocol to the ball's left edge
// The last rung is a ONE-column ball sitting entirely left of ocol, so its true right offset is
// -1. The runtime adds this to ocol with a carry test for "past column 255", which a negative
// addend would trip. Clamp it: over-covering by a column is invisible, because the stamp only
// writes cells that are already fully wall, and the occluder is black on black there. It is
// UNDER-covering that shows, which is the bug this whole table exists to fix.
const orbColRT = orbBoxT.map(b => Math.max(0, b.r));
if (orbBoxT.filter(b => b.r < 0).length > 1)
  throw new Error('more than the smallest rung has a negative right offset -- the ladder changed');
if (process.env.ORBBOX === '1')
  orbBoxT.forEach((b, v) => console.error(`  raw rung ${v+1}: l=${b.l} r=${b.r}`));
if (process.env.ORBBOX === '1')
  LADDER.forEach((r, v) => console.error(
    `  rung ${v+1}: bitmapW=${orbW(r.h)} exp=${r.exp?1:0} halfCols=${orbHalfCT[v]}` +
    ` box=-${orbColLT[v]}/+${orbColRT[v]} (${orbColLT[v]+orbColRT[v]+1} cols)`));
const orbBitT = [...Array(8)].map((_, i) => 1 << i);
// The occluder bitmaps, laid out one after another, with a pointer table so a run-id lookup
// is (ptr),y with no multiply.
const OCCBASE = ORB_OCC;
const orbOccFlat = orbOcc.flat();
const orbOccLo = ORBS.map((_, i) => (OCCBASE + i * OCCBYTES) & 255);
const orbOccHi = ORBS.map((_, i) => (OCCBASE + i * OCCBYTES) >> 8);
// Seam projection tables. |cos| / |sin| as 0..255 turn a hit distance into the hit's
// coordinate ALONG the wall with one sideMul; recip turns the single divide the projective
// solve needs into another one. 1024 bytes, all above VIC bank 0.
const absCos = [], absSin = [];
for (let a = 0; a < 256; a++) {
  absCos.push(Math.min(255, Math.round(Math.abs(Math.cos(a / 256 * 2 * Math.PI)) * 256)));
  absSin.push(Math.min(255, Math.round(Math.abs(Math.sin(a / 256 * 2 * Math.PI)) * 256)));
}
const recipLo = [], recipHi = [];       // recip[n] = 65536/n, so (P * recip[n]) >> 8 = P*256/n
for (let n = 0; n < 256; n++) { const v = n === 0 ? 65535 : Math.min(65535, Math.round(65536 / n));
  recipLo.push(v & 255); recipHi.push(v >> 8); }
const HTABLE = 0x4d00;                  // page-aligned: 16 height tables x 3 pages
                                        // (was $4800, then $4d00; the edge stubs, clmp16 and
                                        // then the three-level step tables grew the data
                                        // block below it. The assembler catches an overlap,
                                        // so raise this whenever it complains.)
// $d018: bits 7-4 = video matrix / 1024, bits 3-1 = charset / 2048 -- both RELATIVE TO THE BANK,
// which is why these subtract VBANK. They read as absolute addresses and are not.
const vm = scr => (((scr - VBANK) >> 10) & 15) << 4;
const cb = cs => (((cs - VBANK) >> 11) & 7) << 1;
const CB_A = cb(CHARSET), CB_B = cb(CHARSET_B);
// Raster line of the horizon. The 25-row display window starts at raster 51, so logical
// row 100 is raster 151; arm the split one line early so the swap lands before that line's
// character fetch.
const SPLITLINE = 150;
const hx = n => '$' + n.toString(16).padStart(2, '0');
const hx16 = n => '$' + n.toString(16).padStart(4, '0');

const asm = `
charset = ${hx(CHARSET)}        ; where the VIC reads them: under the I/O hole
charsetB = ${hx(CHARSET_B)}
px      = $02
py      = $04
pa      = $06
; $07 is free: it was rang, the coarse byte ray angle, dead since castRay's step
; signs moved to the fine angle.
sdx     = $0a
sdy     = $0b
ddx     = $0c
ddy     = $0d
stpX    = $0e
stpY    = $0f
side    = $10
pp      = $11
fr      = $12
qlo     = $15
qhi     = $16
col     = $17
tmp     = $1f
baseHi  = $22
paF     = $805b                  ; low byte of the 16-bit player angle; pa is the high
dtv     = $8050
dtm     = $8059                  ; elapsed ticks scaled for movement, and for turning
dtt     = $805a
dtr     = $805c                  ; elapsed ticks x4, the run's compensation for the quartered
                                 ;   walking rates; the 3x/2x below then apply on top of it
lastMv  = $8051
dxs     = $8052
dxsH    = $8053
dys     = $8054
dysH    = $8055
dxSgn   = $8056
dySgn   = $8057
rowv    = $8058                  ; keyboard row 1, held so SHIFT/E/S read it once
dxv     = $23
dyv     = $24
nxL     = $25
nxH     = $26
nyL     = $27
nyH     = $28
iterLo  = $29
iterHi  = $2a
cb      = $31
hh0     = $32
hh1     = $33
hcur    = $37
ddxH    = $40
ddyH    = $41
sdxH    = $42
sdyH    = $43
remL    = $44
remH    = $45
mlo     = $46
mhi     = $47
s1      = $48
s2      = $49
frameCnt = $4a
lastFrame = $4c
renderCnt = $4e
fpsTens = $4f
fpsOnes = $50
deltaL  = $51
deltaH  = $52
fpsv    = $53
dpx     = $54                   ; fps scratch (was the pixel plotter's x/y)
dpy     = $55
ppHi    = $56
ppLo    = $57
tmp2    = $58
kpos    = $6c                   ; step path: boundary position, and qB held across the
qbv     = $6b                   ;   middle-column read that needs A and X
spanL   = $60
spanR   = $61
sp      = $62
errv    = $63
syNeg   = $64
joyv    = $67
joyEor  = $68
; The overlay's private scratch block (pdBase/pdTmp/... at $6b-$70) is gone with the
; pixel plotter: the readout now pokes whole char codes, so it holds no renderer state.
ppPtr   = $71                   ; 2 bytes ($71/$72): readout row pointer
kr      = $73                   ; per-row 8*cr-92: turns a height into a cell fill
d018vm  = $74                   ; live video-matrix nibble; the raster IRQ ORs charset bits
ecode   = $1b
                                ;   stub's address is looked up
colc    = $75                   ; cell column, parked while the chains own X
rbv     = $76                   ; first cell row that is not fully ceiling
rsv     = $77                   ; first cell row that is fully wall
erow    = $78                   ; current row inside the edge run
jv      = $79                   ; 2 bytes: chain entry vector, then the edge store pointer
ep2     = $7b                   ; 2 bytes: mirrored-row store pointer
bufOff  = $7d                   ; 0 or 14: selects the chain set for the buffer being drawn
nbnd    = $14                   ; delimiters the search pinned this frame
bcur    = $18                   ; subIns/subEmt: the delimiter being sorted, and its swap
bswp    = $19
bcnt    = $08
cell0   = $13                  ; the player's own cell index, constant for the frame
cell    = $7e                   ; DDA cell index = mapY*16 + mapX, stepped incrementally
stpY16  = $7f                   ; +16 / -16: one Y step in cell-index units
hp      = $80                   ; 2 bytes: pointer into this column's height table
errH    = $86                   ; high byte of the interpolator's error term
uwL     = $20                   ; seam pass scratch: u low byte, then the projective solve
uwH     = $21
skL     = $87                   ; --- seam pass scratch, all dead outside seamSpan ---
skH     = $88                   ; the seam's world coordinate k, as 8.8
uaL     = $89                   ; u at spanL / spanR
uaH     = $8a
ubL     = $8b
ubH     = $8c
saL     = $8d                   ; |u_L - k| and |u_R - k|, squeezed to 8 bits
saH     = $8e
sbL     = $8f
sbH     = $90
sPlo    = $91                   ; P = a*h_L, and the running sum P+Q
sPhi    = $92
sSlo    = $93
sShi    = $94
ssK     = $95                   ; current boundary coordinate, and how many are left
ssN     = $96
ssW     = $97                   ; span width in columns
ssAng   = $9d
mp      = $98                   ; mul8 operands / product
mq      = $99
plo     = $9a
phi     = $9b
cx0     = $82                   ; collision box corners, in map cells
cx1     = $83
cy0     = $84
cy1     = $85
; $0400-$04e0 is ALSO where the self-extracting loader copies its decoder and runs it, so these two
; hold decoder bytes rather than KERNAL screen data at the moment the game starts. That is safe, and
; deadvars is what makes it safe rather than an argument: it reports 0 variables read before being
; written, so nothing here is ever consumed before the subdivision pushes to it. If that check ever
; comes back non-zero for a $04xx array, this is the first thing to suspect.
stackLT = $0400
stackRT = $0480
; per-logical-column arrays, now 160 entries each (was 80). Page-aligned so a column
; index never needs a 16-bit add.
sideT   = $0500
idT     = $0600
colH    = $0700
; ---- the per-frame arrays: ALL of them live in the reclaimed charset source, $3000-$37ff ----
; Two evictions got them here, both for the same reason -- an array in the code's growth room is
; an array that caps the engine:
;
;   1. Six of these sat at $2400-$27ff, the image's filler between the data segment and the
;      charset source, i.e. the only space the CODE has to grow into. That made the build's
;      headroom report a LIE: it printed $2800 - dataEnd = 1,762 bytes, but the code would have
;      hit faceIdT at $2400 after 738.
;   2. Then the charset source itself moved from $2800 up to $3000, closing a dead 2KB hole and
;      taking the code's ceiling with it -- so the arrays followed it up here, out of the way.
;
; Everything is page-aligned where a full byte indexes it. Packing tighter than this would buy
; nothing: $3000-$37ff is not the scarce resource, the ceiling below it is.
cwA     = $8400                 ; per cell-column: the ceiling run length this buffer holds
cwB     = $8428
cbA     = $8450                 ; ... and the solid run start, or $ff for "always redraw"
cbB     = $8478
faceIdT = $8200                 ; page-aligned: a column index must never need a 16-bit add
cstepT  = $84a0                 ; per cell-column (40): face-boundary column, 0 = none
bidx    = $80f0                ; PLAN=2: the bucket index the code came from, and which
thsel   = $80f1                 ; threshold table to read it out of (0 = ramp, 1..3 = step k)
paqL    = $80f6                 ; FINEANG: pa*4 as a 10-bit value, formed ONCE a frame
paqH    = $80f7
rqL     = $80f8                 ; and this ray's 10-bit angle: rqL is the table index,
rqH     = $80fc                 ; rqH (0..3) picks which quarter of the 1024-entry table.
                                ; It was declared TWICE, at $cbf9 and here; the assembler takes
                                ; the last, so $cbf9 was never the live one. Removed rather
                                ; than left as a trap for the next reader.
cqtmp   = $80f2                 ; the colour this cell needs, while both its rows are queued
cmtmp   = $80f4                 ; PLAN=3: calcM scratch, and the m it returns. m = w1 + w2 is
cmv     = $80f5                 ; the ninth index bit -- the two columns the bucket throws away
cqN     = $80f3                 ; entries in the colour queue
cqp     = $3e                   ; 2 bytes: colour RAM pointer, flush only
cqLo    = $8100                 ; colour queue: address low, high, and the value to write.
cqHi    = $8140                 ; Written after the buffer flip, never inline -- colour RAM is
cqCol   = $8180                 ; NOT double buffered, so an inline write repaints the frame
                                ; still on screen. That is the shimmer the old pairing hit.
pfAcc   = $7e00                 ; PROFILE: 13 phases x 3 bytes, raster lines summed
pfPrvF  = $7e30                 ; previous timestamp: frame counter, then raster line
pfPrvL  = $7e32
pfCurH  = $7e36                 ; ninth raster bit, current and previous
pfPrvH  = $7e37
pfTmp   = $7e38
pfTmp2  = $7e39
pfN     = $7e3c                 ; frames accumulated so far -- ONE byte. It is incremented and
                                ;   the WRAP to zero is what counts 256 (inc pfN / bne / inc pfDone),
                                ;   so pfDone is the high byte in effect. The comment here said
                                ;   "2 bytes" and pfDLo sits at $7e3d, which made the new overlap
                                ;   guard fire -- correctly, on the comment rather than the code.
pfCurF  = $7e3a                 ; scratch for one timestamp read and the delta
pfCurL  = $7e3b
pfCurX  = $7e3f
pfDLo   = $7e3d
pfDHi   = $7e3e
pfRow   = $7e34
pfDone  = $7e35
seamT   = $84c8                 ; per cell-column (40): char code for the solid run --
                                ;   SOLID, or a seam variant when a panel line lands here
${PIVOT ? `; ---- PIVOT state: last frame's boundaries, and the viewpoint they were seen from ----
; Three ${hx(NBND)}-byte arrays in the page splitT used to hold. Read ENTIRELY by pivPrep at the
; top of the frame and only written afterwards, as the search pins this frame's boundaries --
; so one buffer is enough and no copy is needed.
; These sat in a HOLE in the emitted image (RELOC+0x2700, a page the fixed table map happened to
; skip), which is why all three needed image-vs-equate allowlist entries. A hole is a terrible
; place for RAM: it is only free because of where its neighbours' page counts happen to land, so
; any table gaining a page silently overwrites the pivot state. They now live in the reclaimed
; charset-B source, which is free by construction after cpChr rather than by coincidence.
pvBnd   = $ad00                 ; the column the boundary was pinned at
pvAng   = ${hx16(0xad00 + NBND)}                 ; its WORLD bearing as a byte angle, pa + rayOffT[col]
pvRcp   = ${hx16(0xad00 + 2 * NBND)}                 ; 163/distance, for the translation term
pvN     = $8000                 ; how many of them there are; 0 disables the hint for a frame
opaL    = $8001                 ; the 16-bit angle those bearings were taken at
opaH    = $8002
opxL    = $8003                 ; ... and the position, so the translation term has a delta
opxH    = $8004
opyL    = $8005
opyH    = $8006
dqa     = $8007                 ; this frame's rotation, quarter-units, signed
pvDX    = $8008                 ; this frame's translation, 1/256 cells, signed bytes.
pvDY    = $8009                 ;   NOT dxv/dyv -- interpSpan already owns those as its
                                ;   Bresenham span width and error step.
pvI     = $800a                 ; index while walking the hints, and the last cut emitted
pvLast  = $800b
pvTL    = $800c                 ; the signed 16-bit term, and the top two bytes of the
pvTH    = $800d                 ;   24-bit product it feeds
pvPH    = $800e
pvPB    = $800f
pvSgn   = $8010                 ; sign of the term, carried around the unsigned multiply
pvI2    = $8011                 ; the hint index, saved across mul8 (which needs X)
pvYs    = $8012                 ; the bearing, saved across the first multiply
pvMode  = $802a                 ; 0 = predict in full, 1 = turned in place (the translation
                                ;   term is identically zero), 2 = nothing moved at all.
                                ; NOT beside pvYs: $cb13-$cb29 are claimed by the RAYCNT,
                                ; TOUR and PALKEYS blocks below, which are separate build
                                ; flags -- a PIVOT variable landing in that range collides
                                ; only in the diagnostic builds, i.e. silently.
` : ''}${RAYCNT ? `; RAYCNT diagnostics. Declared OUTSIDE the PIVOT block: a RAYCNT build with PIVOT=0 is the
; baseline half of the comparison, and gating these on PIVOT made that build fail to assemble --
; which left latest.d64 holding the PREVIOUS disk and reported the default viewpoint as if it
; were the one asked for. Silent, and exactly the trap the RELOC comment warns about.
rayN    = $8014                 ; marchCol calls this frame
edgN    = $801a                 ; edge cells drawn this frame -- the part of renderSym the run
edgAcc  = $801b                 ;   cache cannot skip, and so the part worth optimising
edgMean = $801d
chnN    = $801e                 ; chain DRAWS this frame, of 80 possible (40 ceiling + 40 solid)
chnAcc  = $801f                 ;   -- i.e. how often the run cache MISSES
chnMean = $8021
rayAcc  = $8015                 ; 2 bytes: 256 frames of rayN. The HIGH byte is then the mean,
rayFrm  = $8017                 ; for free -- the same trick the profiler uses
rayMean = $8018
pvNdbg  = $8013                 ; pvN as pivPrep saw it, before pivPrep clears it
` : ''}${TOUR ? `tourC   = $802d                 ; TOUR phase counter. Was $cb19 -- an address from BEFORE the
                                ;   move to VIC bank 3, so it pointed into what is now sprite space.
                                ;   Nothing caught it: $cb19 is outside the image, so the
                                ;   image-vs-equate guard had nothing to say, and TOUR is a
                                ;   diagnostic build nobody diffs.
tourF   = $802b                 ; 2 bytes: frames elapsed, for the 512-frame freeze. It was at
                                ;   $8022, whose HIGH byte $8023 is colW -- so in any TOUR build
                                ;   "inc tourF+1" recoloured the walls, and colW's value decided
                                ;   when the freeze happened. That defeats the one thing TOUR is
                                ;   for: freezing at exactly PX/PY/PA so a stale row left by a bad
                                ;   run-cache skip stays on screen to be scored.
                                ;
                                ;   Found by the RAM-overlap guard, which is also why the guard
                                ;   needs SIZES: as a 1-byte variable tourF looked harmless.
                                ;   NOTE there is a dead "tourF: rts" label in the FIRST tourStep
                                ;   above, which is disabled by a false template guard and never
                                ;   emitted. The LIVE tourStep is the second one, and it uses this
                                ;   as a 2-byte variable.
` : ''}colW    = $8023                 ; the three ink colours, one register each. NOT inside the PALKEYS
colB    = $8024                 ;   block: init loads $d021/$d022/$d023 from these in EVERY build,
colS    = $8025                 ;   so PALKEYS=0 failed to assemble on an undefined colW. It is the
                                ;   key CYCLING that is optional, not the colours -- and a config
                                ;   that does not assemble is the silent trap this file warns about
                                ;   elsewhere: VICE boots the PREVIOUS disk and the numbers look real.
${PALKEYS ? `pkNew   = $8026                 ; palette keys this frame, last frame, and the fresh presses
pkOld   = $8027
pkEdge  = $8028
pkJoy   = $8029                 ; joystick-1 lines, masked out of the palette-key reads
` : ''}${SPRITES ? `; ---- orb scratch ----
; The absolute half was at $cbxx, which the bank-3 move turned into graphics-only space. It is
; now the LAST FREE PAGE of the array hole ($8500-$85ef) -- one page, every relative offset
; preserved. The zero-page half is seamSpan's scratch, dead by the time orbMove runs. NOTE
; mul8's own mp/mq/plo/phi sit at $98-$9b: ivH/ohgt/ocptr are deliberately ABOVE them and
; o0-o2/ivL below, because relaxing that once put ivH on mp and every jsr mul8 ate its own
; inputs -- the orb simply vanished.
oaL     = $87
oaH     = $88
oaS     = $89
orL     = $8c
orH     = $8d
o0      = $94
o1      = $95
o2      = $96
ivL     = $97
ivH     = $9c                    ; $98-$9b is mul8's mp/mq/plo/phi -- step over it
ohgt    = $9d
ocptr   = $9e                    ; 2 bytes: into the cell's visibility list
ocos    = $8500
ocosS   = $8501
osin    = $8502
osinS   = $8503
fwdL    = $8504
fwdH    = $8505
rgtL    = $8506
rgtH    = $8507
ogL     = $8508
ogH     = $8509
oe      = $850a
o3      = $850b
ocoff   = $850c
ovar    = $850d
ocol    = $8510
ocl     = $8512
ocr     = $8513
oidx    = $8517
ocn     = $8518
ocy     = $8519
onv     = $851a
omEn    = $851b
omXX    = $851c
omYY    = $851d
omPri   = $851e
omX8    = $851f
omBit   = $8520
odb     = $8522                  ; DBGORB scratch: six bytes shown as hex on screen row 3
ocn3    = $852a
obX     = $8530
obY     = $8538
obP     = $8540
obC     = $8548                  ; per-sprite state, flushed to the VIC in the border
opx     = $855c                  ; the viewpoint orbMove last projected from
opy     = $855e
opa     = $8560
ofx     = $8564
ofy     = $8565
kxc     = $8566
kxs     = $8567
kyc     = $8568
kys     = $8569
kfL     = $856a
kfH     = $856b
krL     = $856c
krH     = $856d
oix     = $856e
oiy     = $856f
oax     = $8570
oay     = $8571
oixS    = $8572
oiyS    = $8573
ocl2    = $8593                 ; the bounding box in COLUMNS, not cells
ocmax   = $8594
obCL    = $8598                 ; per sprite slot, for the second pass: cell range and
obCR    = $85a0                 ; bounding-box edge masks, so pass 2 need not reproject
obBL    = $85a8
obBR    = $85b0
obIX    = $85b8
obV     = $85d0                 ; size variant per slot, so orbSeam can find the sprite's
obOcc   = $85e0                 ; per slot: bit 7 = this orb has a possible occluder here
obL     = $8574                 ; per slot: the orb's TIGHT column range, which the cell range
obR     = $857c                 ;   cannot give -- a cell is 4 columns and a box starts inside one
osI     = $85f4                 ; orbStamp: slot being stamped, and how many there are
osN     = $85f5
osL     = $85f6                 ; the span/box intersection being stamped
osR     = $85f7
osRow   = $85f8                 ; char row range
osRowB  = $85f9
ohFst   = $8595                 ; the stamp's two edge glyphs, chosen once per span
ohLst   = $8596
ohFstW  = $8523                 ; the same two edge glyphs backed by white
ohLstW  = $8524
ohFstM  = $8525                 ; the columns each split leaves UNCOVERED, as a cellFillT mask:
ohLstM  = $8526                 ;   what the cell shows outside the stamp, which picks the backing
ohMsk   = $8527                 ; oSBack scratch: the mask under test, and the saved X
ohMsX   = $8528
o2r     = $8529                 ; the ball's RIGHT extent from ocol; o2 is now the LEFT one.
                                ;   Not zero page: it is touched a handful of times per orb, in
                                ;   the projection, never in a per-column loop.
osDC    = $85fb                 ; orbStamp: the de-seam's current cell column
oSCnt   = $85fc                 ; DBGORB: cells stamped this frame, orbs that entered the walk,
oSOrb   = $85fd                 ;   and spans visited -- the three numbers the cost is made of
oSSpn   = $85fe
ohSv    = $85fa                 ; span right edge / row counter, reused
osPtr   = $9e                   ; SHARES ocptr: the candidate walk is finished by the time
                                ;   orbStamp runs, so its pointer is free
omptr   = $87                   ; 2 bytes: this orb's occluder mask. Deliberately SHARES oaL/oaH,
                                ;   the multiply accumulator, which is dead once the projection
                                ;   has produced a column range -- the same aliasing the original
                                ;   used. Anything calling oabs after this point would break it.
ohRun   = $85f0                 ; the run id, held across the mask-byte lookup
ohL     = $85f1                 ; the span being tested: its left column, and the index into bndT
ohBX    = $85f2
ohDbg   = $85f3                 ; ORBOCCDBG: furthest stage any orb reached this frame
ocolN   = $8597                 ; centre column went left of 0: ocol holds the magnitude
ocanO   = $85e8                 ; the same bit while the candidate list is being walked
` : ''}
bndT    = $7f00                 ; columns where a face or saturation state begins (${hx(NBND)} max)
remLoT  = $8300                 ; per marched column: castRay's raw hit distance, 8.8 cells.
remHiT  = $7d00                 ;   Parked so u can be derived later, only where it is needed.

        * = $0801
        !byte $0c,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
entry:
        sei
        lda #$35                ; processor-port mode 5: RAM at $a000-$bfff, I/O at $d000-$dfff,
        sta $01                 ; RAM at $e000-$ffff. BASIC and KERNAL both out, I/O still there.
                                ;
                                ; $34 IS THE TRAP AND IT LOOKS RIGHT. Mode 4 (LORAM=0, HIRAM=0,
                                ; CHAREN=1) is RAM EVERYWHERE -- $d000-$dfff included -- because
                                ; the PLA only maps I/O when LORAM or HIRAM is set; CHAREN alone
                                ; does not do it. Every $d0xx store then lands in RAM, the VIC
                                ; never sees a register write, and the six views came back
                                ; 38-60% wrong. Mode 5 keeps LORAM=1, which costs nothing here:
                                ; BASIC needs HIRAM too, so $a000 is RAM either way.
                                ;
                                ; BASIC had to go because the relocated tables grew past $a000
                                ; and were silently reading ROM -- step patterns came back as
                                ; BASIC bytes, so corners picked nonsense and flickered.
                                ;
                                ; The KERNAL goes for 8KB of table space at $e000-$ffff, which
                                ; is the only sizeable block left and is invisible to the VIC
                                ; (it lies in VIC bank 3; we render from bank 0), so it cannot
                                ; eat the sprite headroom in bank 0. Nothing calls a KERNAL
                                ; entry point after startup -- the autostart loader is done by
                                ; the time this runs, and mloop never returns to BASIC.
                                ;
                                ; THE PRICE IS THE VECTORS. With the ROM gone the CPU fetches
                                ; $fffa/$fffe out of RAM, so this must install them itself --
                                ; see below. Writes always land in RAM on a 6510, so the order
                                ; of the banking and the vector stores does not matter.
        ; ---- copy both charsets into the RAM under the I/O hole ----
        ; This CANNOT be done by the loader: LOAD runs with I/O mapped, so it would write VIC and
        ; CIA registers rather than memory (the build refuses an image past $c000 for the same
        ; reason). Charset A is therefore not loaded at all in the usual sense: the self-extracting
        ; loader decodes it STRAIGHT into $d000 with the port at $34. All that is left to do here is
        ; build the mirror, charset B, from the copy already in place.
        ;
        ; The port goes to $34 -- mode 4, RAM everywhere -- for the duration. Interrupts are still
        ; off (this is well before cli) and nothing here touches I/O, which is the only reason it
        ; is safe to have the VIC's registers unmapped for the duration (2KB read, 4KB written).
        ;
        ; ORDER MATTERS AND IT IS SUBTLE. The colour-RAM fill above had to run with I/O MAPPED,
        ; because colour RAM is a separate 1K chip at $d800-$dbff. Charset B also lives at $d800 --
        ; in the DRAM underneath, which is what the VIC reads. Two different memories at one
        ; address, each reached in a different port mode, and the writes above and below must not
        ; be swapped.
        lda #$34
        sta $01
        ; Charset B is DERIVED here, not loaded. It is charset A with every glyph's eight rows
        ; reversed, and for a byte at index x within a glyph the mirrored row is simply x EOR 7:
        ; 7-n == n EOR 7 for n in 0..7, and the EOR leaves the glyph's base address alone. Each
        ; page is a whole number of glyphs (256 = 32 x 8), so the mirrored index never leaves the
        ; page either, and the same ",y" offset works for all eight.
        ;
        ; So the file carries ONE non-mirrored charset and nothing else: 2KB, compressed, placed
        ; directly in bank 3. The mirror costs about 20,000 cycles once at startup, against 2KB of
        ; the load -- and against the ordering invariant and the copy loop that used to be needed.
        ldx #$00
cpChr:  txa
        eor #$07
        tay                     ; y now indexes the MIRRORED row of the same glyph as x
                                ; -- and the SOURCE is charset A itself, already in place at $d000.
                                ; Readable only because the port is $34: in $35 these loads would
                                ; return VIC and CIA register values, not glyphs.
        lda charset,y
        sta charsetB,x
        lda charset+256,y
        sta charsetB+256,x
        lda charset+512,y
        sta charsetB+512,x
        lda charset+768,y
        sta charsetB+768,x
        lda charset+1024,y
        sta charsetB+1024,x
        lda charset+1280,y
        sta charsetB+1280,x
        lda charset+1536,y
        sta charsetB+1536,x
        lda charset+1792,y
        sta charsetB+1792,x
        inx
        bne cpChr
        lda #$35                ; back to mode 5: I/O mapped, both ROMs still out
        sta $01
        lda #$00
        sta $d01a
        lda $dd00               ; VIC bank 3 ($c000-$ffff). The bits are INVERTED, so bank 3 is
        and #$fc                ; %00 -- "and", where bank 0 was "ora #$03".
        sta $dd00
        lda #$1b
        sta $d011
        lda #$18
        sta $d016               ; MCM: multicolor text -> 4 logical px per cell, 2 physical px each
        lda #${hx(vm(SCR_A))}
        sta d018vm              ; display buffer A; IRQ ORs the charset bits per half-screen
        lda #${hx(vm(SCR_A) | CB_A)}
        sta $d018
        ; Three inks, one register each, and each held in a variable so keys 1/2/3 can walk it
        ; round the palette. Bit pair 11 is unused -- see the charset note.
        lda #$01
        sta colW
        sta $d021               ; 00 = ceiling and floor
        lda #$00
        sta colB
        sta $d022               ; 01 = walls (and the readout glyphs, which are wall-coloured)
        lda #${hx(SEAMCOL)}
        sta colS
        sta $d023               ; 10 = panel seam. Its own register precisely so the tone can
                                ; be retuned without touching a charset entry.
${SPRITES ? `        ; ---- orbs: static sprite setup. Position and shape change per frame in orbMove.
        lda #$00
        sta $d015               ; nothing visible until orbMove has decided what is
        lda pa
        eor #$80
        sta opa                 ; cannot match pa, so the first frame never takes the still path
        lda #$ff
        sta $d01c               ; ALL eight in multicolor: orbMove hands out slots as it finds
                                ; visible orbs, so any of them can be in use
        lda #${hx(ORBUNDER)}
        sta $d025               ; sprite bit pair 01 = the shaded underside
        lda #${hx(ORBHILITE)}
        sta $d026               ; sprite bit pair 11 = highlight and ground shadow
        lda #${hx(ORBBODY[0])}
        sta $d027               ; sprite bit pair 10 = the body. Per-sprite, so osFlush rewrites
                                ; it; this is only the first frame's value.
                                ;
                                ; $d01b comes from omPri every frame, and nothing SETS omPri yet,
                                ; so every sprite is IN FRONT of all foreground. Deliberate: the
                                ; walls are already bit pair 01 (background), so orbs draw over
                                ; them -- but the seams are bit pair 10, which IS foreground, and
                                ; would otherwise take a bite out of an orb standing in front of
                                ; one. Occlusion returns as stamped foreground-black chars plus a
                                ; per-orb priority bit, and that is when this changes.
` : ''}${PALKEYS ? `        lda #$00
        sta pkOld               ; no keys held on the first frame, so nothing reads as a fresh press
` : ''}        lda #$00
        sta $d020
        lda #$ff
        sta $dc02
        lda #$00
        sta $dc03
        ldx #$00
        ; No run cached for either buffer yet. The two halves need OPPOSITE sentinels now that
        ; the tests are ordered compares rather than equality:
        ;   cwA/cwB start at 0 -- the ceiling test skips when rb has SHRUNK, and $ff would make
        ;     every column look like a shrink and skip its own first paint, leaving the BASIC
        ;     screen showing through.
        ;   cbA/cbB start at $ff -- the solid test skips when rs has GROWN, and $ff exceeds any
        ;     rs, so the first frame always draws.
        ; The four tables are contiguous at $c500/$c528/$c550/$c578, so one walk covers them:
        ; offsets 0-79 are the ceiling pair, 80-159 the solid pair.
        ldx #$00
        lda #$00
rfCz0:  sta cwA,x
        inx
        cpx #80
        bcc rfCz0
        lda #$ff
rfCz:   sta cwA,x
        inx
        bne rfCz
        lda #${hx(0x08 | (ORBFG ? (+ORBFG & 7) : 0))}                ; bit3 = per-cell multicolor enable, low three bits = the
                                ; bit-pair-11 colour. Written once at startup and never
                                ; touched again: the pattern pairing that used to rewrite it
                                ; per cell was removed at 66bc8cf.
                                ;
                                ; It is still the live hook for two-patterns-per-code, and
                                ; more so than before -- every wall pixel is pair 11 now, so
                                ; $08/$09 per cell would flip that cell's whole wall between
                                ; black and white. The old encoding's other two values are
                                ; also still where they were: 01 = $d022 black, 00 = $d021
                                ; white. What killed it was the per-frame write, not the
                                ; charset trick.
ccf:    sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne ccf
${PLAN === 2 ? `        lda #$00                ; the colour queue must start EMPTY. Uninitialised, a boot value
        sta cqN                 ; of 64 or more makes every push hit the full check silently,
                                ; and the first flush walks 64 garbage pointers writing colour
                                ; bytes wherever they happen to point.
` : ''}        lda #${hx(PX & 255)}
        sta px
        lda #${hx(PX >> 8)}
        sta px+1
        lda #${hx(PY & 255)}
        sta py
        lda #${hx(PY >> 8)}
        sta py+1
        lda #${hx(PA)}
        sta pa
        lda #${hx(SCR_A >> 8)}
        sta baseHi
        lda #$00
        sta iterLo
        sta iterHi
        ; raster IRQ frame counter (for fps)
        ; ---- hardware IRQ/NMI vectors, not the KERNAL's $0314 indirection ----
        ; Going direct is not just necessary now the ROM is gone, it is FASTER: the KERNAL
        ; handler pushes the registers, polls the interrupt source and then jmp ($0314), which
        ; is ~40-50 cycles of dispatch on every interrupt. There are two a frame (top of frame
        ; and the horizon split), so this hands back ~100 cycles a frame.
        lda #<irq
        sta $fffe
        lda #>irq
        sta $ffff
        ; NMI must be pointed somewhere real or RESTORE jams the machine: with the ROM out,
        ; $fffa would otherwise be whatever the loader left in RAM.
        lda #<nmi
        sta $fffa
        lda #>nmi
        sta $fffb
        ; $fffc (RESET) is deliberately left alone. A reset resets the processor port to $37,
        ; mapping the ROM back in, so the CPU reads the KERNAL's reset vector, not this RAM.
        lda #$01
        sta $d01a
        lda #$00
        sta $d012
        lda $d011
        and #$7f
        sta $d011
        lda #$7f
        sta $dc0d
        lda $dc0d
        lda #$ff
        sta $d019
        lda #$00
        sta frameCnt
        sta frameCnt+1
        sta lastFrame
        sta lastFrame+1
        sta renderCnt
        sta fpsTens
        sta fpsOnes
${PROFILE ? `        ldx #$2f                ; the profile accumulators live in uninitialised scratch
        lda #$00
pfInit: sta pfAcc,x
        dex
        bpl pfInit` : ''}
        cli

mloop:
${PROFILE ? '        ldx #6\n        jsr pfTick              ; closes the raster wait\n' : ''}${PALKEYS ? `        jsr palKeys             ; 1/2/3 walk the three inks round the palette
` : ''}        jsr tickDelta
        ${TOUR ? 'jsr tourStep' : SPIN ? 'jsr spinStep' : WIGGLE ? 'jsr wiggleStep' : WALK ? 'jsr moveFwd' : STRAFE ? 'jsr strafeR' : BACK ? 'jsr moveBack' : 'jsr readKeys'}
${PROFILE && !PROFILE1 ? '        ldx #0\n        jsr pfTick              ; input\n' : ''}
${NORAY ? '        jmp subDn' : ''}
        ; ---- adaptive subdivision: march only at connected-wall-run boundaries ----
        ; cstepT is filled by the subdivision itself now (see subFace), so it has to start
        ; the frame empty. 40 bytes; the scan it replaces in prepCells cost 1920 cycles.
        ; Straight-line, not a loop: "sta abs" is 4 cycles against the 9 a loop iteration
        ; costs with its dex and bpl, and 80 bytes of table twice a frame is enough for
        ; that to matter. 240 bytes of code for ~700 cycles.
        lda #$00
${[...Array(NCELL)].map((_, i) => `        sta cstepT+${i}`).join('\n')}${SEAMS ? `
        lda #${hx(SOLID)}       ; and every wall column back to a plain fill
${[...Array(NCELL)].map((_, i) => `        sta seamT+${i}`).join('\n')}` : ''}
${PROFILE && !PROFILE1 ? '        ldx #1\n        jsr pfTick              ; per-frame table clears\n' : ''}        lda py+1                ; the DDA's starting cell, once for the whole frame
        asl
        asl
        asl
        asl
        clc
        adc px+1
        sta cell0
${FINEANG ? `        lda pa                  ; pa*4 once a frame, not once a ray -- it is constant across
        asl                     ; the whole frame and the rays only add their own offset
        sta paqL
        lda #$00
        rol
        asl paqL
        rol
        sta paqH
` : ''}        lda #$00                ; explicit: the clears above leave A holding their own fill
        sta nbnd
${RAYCNT ? '        sta rayN\n        sta edgN\n        sta chnN\n' : ''}
${PIVOT ? `        jsr pivPrep             ; marches 0 and 159, then a bracket per predicted boundary,
                                ; and leaves the stack holding the spans between them
` : `        sta col
${PROFILE && !PROFILE1 ? '        ldx #2\n        jsr pfTick\n' : ''}        jsr marchCol            ; column 0
${PROFILE && !PROFILE1 ? '        ldx #12\n        jsr pfTick              ; ray: hit + height + marchCol stores\n' : ''}${DOUBLE === 'marchCol' ? '        jsr marchCol\n' : ''}
        lda #${NLOG - 1}
        sta col
${PROFILE && !PROFILE1 ? '        ldx #2\n        jsr pfTick\n' : ''}        jsr marchCol            ; column 159
${PROFILE && !PROFILE1 ? '        ldx #12\n        jsr pfTick              ; ray: hit + height + marchCol stores\n' : ''}${DOUBLE === 'marchCol' ? '        jsr marchCol\n' : ''}
        lda #$00
        sta stackLT
        lda #${NLOG - 1}
        sta stackRT             ; push (0,159)
        lda #$01
        sta sp
`}subLp:  ldx sp
        beq subDn
        dex
        stx sp
        lda stackLT,x
        sta spanL
        lda stackRT,x
        sta spanR
        ldx spanL
        lda faceIdT,x
        sta tmp
        ldx spanR
        lda faceIdT,x
        cmp tmp
        bne subFace             ; different wall FACE -> split, and maybe record a boundary
        ; Heights are linear across a face, which is what makes the merge exact -- but only
        ; while they FIT. colH is a byte, so anything closer than 88/254 = 0.35 cells
        ; saturates, and interpolating from a saturated endpoint skews the whole span,
        ; including the part that is on screen. If exactly one end is saturated, split
        ; instead; if BOTH are, the span is entirely off-screen-tall and merging is still
        ; exact (a linear function between two saturated ends never dips below them).
        ldx spanL
        lda colH,x
        cmp #254
        lda #$00
        rol                     ; A = 1 if the left end saturated
        sta tmp2
        ldx spanR
        lda colH,x
        cmp #254
        lda #$00
        rol
        cmp tmp2
        bne subSp
        jmp subLp               ; merged: the interpolation happens once per FACE, at subDn
        ; The face changes somewhere in this span. Once the span is a single column wide the
        ; boundary is pinned, and THIS is the only place in the frame it can be discovered --
        ; so record it straight into cstepT. The old route was to write a face id into all
        ; 160 columns of faceIdT and have prepCells rediscover the ~2 transitions by
        ; comparing adjacent entries in every one of the 40 cells. Same answer, minus a
        ; per-column store in the interpolator's hot loop and minus the whole scan.
subFace:lda spanR
        sec
        sbc spanL
        cmp #$02
        bcs subMid              ; still wide -> split further
${SEAMS ? `        ; A corner is pinned to one column, so its seam line needs no projection at
        ; all -- it is simply the column we just found. Do it before the k=0 bail below:
        ; the seam CAN sit at pixel 0 of a cell, cstepT cannot.
        ;
        ; ...but only if the corner is CONCAVE, an inside corner where two perpendicular faces
        ; meet. There the two walls sit at the same depth, so it is black meeting black and the
        ; line is the only thing dividing them. A CONVEX corner -- the end of a receding wall,
        ; the kind you cannot see around -- is already drawn by the silhouette, which steps 20+
        ; rows at that column. The grey line adds nothing to a boundary that emphatic, so
        ; convex corners are left seam-free and render as plain two-black steps.
${CVXSEAM ? '' : `        lda spanL
        tax
        lda faceIdT,x
        tax                     ; X = the run on this side
        ldy spanR
        lda faceIdT,y           ; A = the run on the other side
        cmp cpLoT,x
        beq subCv
        cmp cpHiT,x
        bne subCn               ; not a concave partner: convex silhouette, draw nothing
`}subCv:  lda spanR
        lsr
        lsr
        tax
        lda seamT,x
        cmp #${hx(SOLID)}       ; still a plain fill? one seam line per cell
        bne subCn               ; a line is already claimed in this cell; one per char code
        lda spanR
        and #$03
        clc
        adc #${hx(SEAM0)}
        sta seamT,x
subCn:` : ''}
        jsr subBnd              ; a face starts here: remember it as a span delimiter
${PIVOT ? `        ; ---- and remember it as NEXT frame's hint ----
        ; Recorded HERE rather than from bndT afterwards, because bndT also holds saturation
        ; splits and only real face boundaries are worth predicting. Three bytes: the column,
        ; the WORLD bearing it was seen at (so the rotation term is a plain subtract next
        ; frame), and 163/distance for the translation term. The distance costs nothing to
        ; obtain -- castRay already parked it in remLoT/remHiT for calcU.
        ; Kept SORTED by column, by insertion. pivPrep has to see them in ascending column
        ; order: it walks them once, emitting cuts, and drops any that would not increase.
        ; Unsorted, almost every hint failed that test and the frame silently fell back to
        ; plain bisection -- which is exactly what the first measurement showed, 26 rays with
        ; the pivot and 26 without. (The JS model hid this: it called .sort() on the cut list,
        ; so it was measuring an ordering the 6502 never had.)
        ;
        ; The list is kept DESCENDING and pivPrep walks it backwards. The span stack pops the
        ; rightmost span first, so boundaries are discovered right to left, and inserting a
        ; descending stream into an ascending list puts every arrival at the FRONT -- three
        ; parallel arrays shifted up by one, nine times, 1,500 cycles at the worst viewpoint.
        ; Matching the list's order to the discovery order turns all of that into an append.
        ldx pvN
        cpx #${hx(NBND)}
        bcs pvRcD               ; hint list full: the rest of this frame's boundaries go
        lda spanL               ; unpredicted, which costs probes and nothing else
                                ; spanL, NOT spanR. The boundary lies BETWEEN the two, and
                                ; pivPrep brackets a hint p with cuts at p and p+1 -- so the
                                ; hint has to be the LEFT column or every bracket sits one
                                ; column past its boundary and catches nothing. bndT keeps
                                ; storing spanR; that is a span delimiter, a different thing.
        sta tmp2
pvInsL: txa
        beq pvInsD
        lda pvBnd-1,x
        cmp tmp2
        bcs pvInsD              ; found the slot: everything left of it is LARGER (descending)
        sta pvBnd,x             ; A still holds pvBnd[x-1] -- cmp does not disturb it
        lda pvAng-1,x
        sta pvAng,x
        lda pvRcp-1,x
        sta pvRcp,x
        dex
        jmp pvInsL
pvInsD: lda tmp2
        sta pvBnd,x
        tay
        lda rayOffT,y
        clc
        adc pa
        sta pvAng,x
        lda remHiT,y
        cmp #16
        bcs pvRcFar             ; 16+ cells: the translation term is under a quarter-unit at
        asl                     ; any plausible speed, so a constant is as good as a lookup
        asl
        asl
        asl
        sta tmp
        lda remLoT,y
        lsr
        lsr
        lsr
        lsr
        ora tmp                 ; distance in 1/16 cells
        tay
        lda rcpDT,y
        jmp pvRcS
pvRcFar:lda #10
pvRcS:  sta pvRcp,x
        inc pvN
pvRcD:
` : ''}        lda spanR
        and #$03
        beq subLp               ; boundary on a cell edge: the two cells simply differ, and
                                ; cstepT can only name an interior column (1..3)
        sta tmp
        lda spanR
        lsr
        lsr
        tax                     ; cell = spanR/4
        lda cstepT,x
        and #$03                ; bit 7 is subBnd's "delimiter inside this cell" mark, not a
        bne subLp               ; position -- first POSITION in a cell still wins
        lda cstepT,x
        ora tmp
        sta cstepT,x
        jmp subLp
subSp:  lda spanR               ; saturation split: a real split, but NOT a face boundary
        sec
        sbc spanL
        cmp #$02
        bcs subMid
        jsr subBnd              ; a delimiter too: never interpolate across a saturated end
        jmp subLp
subMid: lda spanL
        clc
        adc spanR
        ror                     ; ROR not LSR: at 160 columns spanL+spanR reaches 318, so the
                                ; sum is 9 bits and the carry IS bit 8 of the midpoint
        sta col                 ; mid = (L+R)/2
${PROFILE && !PROFILE1 ? '        ldx #2\n        jsr pfTick\n' : ''}        jsr marchCol
${PROFILE && !PROFILE1 ? '        ldx #12\n        jsr pfTick              ; ray: hit + height + marchCol stores\n' : ''}${DOUBLE === 'marchCol' ? '        jsr marchCol\n' : ''}
        ldx sp
        lda spanL
        sta stackLT,x
        lda col
        sta stackRT,x
        inx
        lda col
        sta stackLT,x
        lda spanR
        sta stackRT,x
        inx
        stx sp
        jmp subLp
        ; ---- one interpolation per FACE, not per binary-search interval ----
        ; The search merges wherever its two probes happen to agree, so a single flat wall
        ; comes out as five or six abutting spans, each interpolating between its OWN marched
        ; endpoints. That is seven noisy sample points across a wall that needs two, and it
        ; is why a wall dead ahead had a top that rose, dipped and rose again instead of
        ; running straight. Height is EXACTLY linear across a face, so interpolating end to
        ; end is not an approximation -- it is the right answer, and it is cheaper, because
        ; span setup happens once per face instead of once per interval.
subDn:${PROFILE && !PROFILE1 ? `
        ldx #2
        jsr pfTick              ; closes subLp's span-stack machine before the sort` : ''}
        lda #$00                ; the first face always starts at column 0
        sta spanL
        sta bcur
        lda nbnd
        beq subOne              ; no delimiters: the whole screen is one face
        cmp #$02
        bcc subEmt              ; one delimiter needs no sorting
        ; ---- reverse first, because the delimiters arrive fully DESCENDING ----
        ; subLp pops the rightmost span first, so it discovers boundaries right to left and
        ; bndT fills in reverse. That is the bubble sort's worst case exactly: n passes of n
        ; compares, every one of them swapping. Measured 2,445 cycles at the worst viewpoint,
        ; 3.4% of the frame, to sort nine bytes. Reversing is O(n) and leaves the sort in
        ; place, so a run that is NOT perfectly descending -- a saturation split landing out
        ; of turn -- still comes out ordered, just without the free ride.
        ldx #$00
        ldy nbnd
        dey
brvLp:  stx tmp
        cpy tmp
        bcc brvDn               ; the ends have crossed
        beq brvDn               ; ... or met, at an odd middle element
        lda bndT,x
        sta tmp2
        lda bndT,y
        sta bndT,x
        lda tmp2
        sta bndT,y
        inx
        dey
        jmp brvLp
brvDn:  ldx nbnd                ; bubble the handful of delimiters into column order
        dex
        stx bcnt
subIns: ldx #$00
        lda #$00
        sta bswp
subInL: lda bndT+1,x
        cmp bndT,x
        bcs subInN
        ldy bndT,x              ; swap (STY has no abs,x, so it goes out through A)
        sta bndT,x
        tya
        sta bndT+1,x
        inc bswp
subInN: inx
        cpx bcnt
        bcc subInL
        lda bswp
        bne subIns
${PROFILE && !PROFILE1 ? '        ldx #7\n        jsr pfTick              ; the delimiter bubble sort\n' : ''}subEmt: ldx bcur
        lda bndT,x
        sec
        sbc #$01
        sta spanR               ; this face runs up to the column before the delimiter
        jsr subFlush
        ldx bcur
        lda bndT,x
        sta spanL
        inc bcur
        lda bcur
        cmp nbnd
        bcc subEmt
subOne: lda #${NLOG - 1}
        sta spanR
        jsr subFlush
        jmp subFin

subFlush:                       ; interpolate + seam one maximal face
        lda spanR
        cmp spanL
        bcc subFDn              ; empty
${PROFILE && !PROFILE1 ? '        ldx #2\n        jsr pfTick\n' : ''}        jsr interpSpan
${DOUBLE === 'interpSpan' ? '        jsr interpSpan\n' : ''}${PROFILE && !PROFILE1 ? '        ldx #8\n        jsr pfTick              ; interpSpan\n' : ''}${SEAMS ? '        jsr seamSpan\n' : ''}${PROFILE && !PROFILE1 && SEAMS ? '        ldx #9\n        jsr pfTick              ; seamSpan\n' : ''}subFDn: rts

subBnd: ldx nbnd                ; remember a column where a new face/saturation state begins
        cpx #${hx(NBND)}
        bcs subBDn              ; list full: leave the rest as the search left them
        lda spanR
        sta bndT,x
        inc nbnd
        ; ---- and mark the CELL, in bit 7 of cstepT ----
        ; interpSpan interpolates linearly between delimiters, so between them colH is monotonic
        ; and a cell's min and max are simply its END columns. That is only true of a cell with no
        ; delimiter strictly inside it -- two linear pieces can meet in a V. So record which cells
        ; those are, and renderSym scans all four columns only for them. Measured over 11,960
        ; cells: 97.0% have no interior delimiter, and the end columns gave the right min/max for
        ; every one of them.
        ;
        ; A delimiter on a cell EDGE does not count: the cell is still one linear piece.
        ; Bit 7 rather than a second table, because cstepT is already cleared every frame and
        ; already indexed by cell. Everything reading it for the step position masks #$03.
        and #$03
        beq subBDn
        lda spanR
        lsr
        lsr
        tax
        lda cstepT,x
        ora #$80
        sta cstepT,x
subBDn: rts
${PIVOT ? `
; ===== pivPrep: seed the subdivision from where last frame's boundaries have moved to =====
; Bisection locates each boundary from scratch every frame, ~7.3 marches each, and boundaries
; barely move between frames. This predicts each one forward and hands the search a ONE-COLUMN
; bracket around it instead of the whole screen. The spans BETWEEN brackets merge on their first
; pop and cost nothing, so the win is the whole search tree above each boundary.
;
; It cannot lose a boundary: extra cut points only ever SPLIT a span, and every sub-span still
; gets the same face-id test in subLp -- so this finds a superset of what bisection finds. That
; is why the bracket can be one column wide with no safety margin: a wrong prediction costs
; probes, never pixels. Modelled in analyze-pivot.mjs at 22.6 -> 15.0 marches/frame.
;
; With pvN = 0 -- first frame, or PIVOT off -- it degenerates to exactly the old seeding.
pivPrep:
        ; ---- rotation, quarter-units: (pa:paF - opa) >> 6 ----
        lda paF
        sec
        sbc opaL
        sta pvTL
        lda pa
        sbc opaH
        sta pvTH
        asl pvTL                ; <<2 and take the high byte IS >>6, sign intact: DT_MAX caps
        rol pvTH                ; the turn at 32 ticks x 192 = 6144, and 6144<<2 still fits 16
        asl pvTL                ; bits. Without that cap this would silently wrap.
        rol pvTH
        lda pvTH
        sta dqa
        ; ---- translation, 1/256 cells ----
        lda px
        sec
        sbc opxL
        sta pvTL
        lda px+1
        sbc opxH
        sta pvTH
        jsr pvClmp
${PIVTRANS ? '        sta pvDX' : '        lda #$00\n        sta pvDX                ; PIVTRANS=0: rotation-only prediction'}
        lda py
        sec
        sbc opyL
        sta pvTL
        lda py+1
        sbc opyH
        sta pvTH
        jsr pvClmp
${PIVTRANS ? '        sta pvDY' : '        lda #$00\n        sta pvDY'}
        ; ---- how much of the prediction does this frame actually need? ----
        ; pivOne is 890 cycles a hint -- measured, 11% of the worst frame at nine hints -- and
        ; almost all of it is the translation term: two signed multiplies for the displacement
        ; and a third for the reciprocal. When the camera has not translated that term is
        ; identically zero, so the whole chain computes a very expensive nothing. Turning on
        ; the spot is the common case that hits this, and standing still hits the stronger one:
        ; with no rotation either, the boundary is exactly where it was pinned last frame.
        lda #$00
        sta pvMode
        lda pvDX
        ora pvDY
        bne pvMDn               ; the camera moved: the full prediction earns its cycles
        inc pvMode
        lda dqa
        bne pvMDn
        inc pvMode
pvMDn:
        ; ---- this viewpoint becomes next frame's reference ----
        lda paF
        sta opaL
        lda pa
        sta opaH
        lda px
        sta opxL
        lda px+1
        sta opxH
        lda py
        sta opyL
        lda py+1
        sta opyH
        ; ---- the two screen edges, as always ----
        ; Ticked like every other march. Without these the profiler credited pivPrep's rays to
        ; whatever phase happened to be open and reported "ray: hit + height + marchCol stores"
        ; at 0.0% -- which is impossible, and was the tell that the numbers were describing a
        ; tick layout the code no longer had.
        lda #$00
        sta col
${PROFILE && !PROFILE1 ? '        ldx #14\n        jsr pfTick\n' : ''}        jsr marchCol
${PROFILE && !PROFILE1 ? '        ldx #12\n        jsr pfTick              ; ray: hit + height + marchCol stores\n' : ''}        lda #${NLOG - 1}
        sta col
${PROFILE && !PROFILE1 ? '        ldx #14\n        jsr pfTick\n' : ''}        jsr marchCol
${PROFILE && !PROFILE1 ? '        ldx #12\n        jsr pfTick              ; ray: hit + height + marchCol stores\n' : ''}
        lda #$00
        sta sp
        sta pvLast
        lda pvN                 ; the hint list is DESCENDING (see pvInsL), so walking it from
        sta pvI                 ; the end is what yields ascending columns here
${RAYCNT ? '        lda pvN\n        sta pvNdbg\n' : ''}pivLp:  ldx pvI
        beq pivEnd
        dex
        stx pvI
${PROFILE && !PROFILE1 ? '        ldx #14\n        jsr pfTick\n        ldx pvI\n' : ''}        jsr pivOne              ; A = where hint X is predicted to be now
${PROFILE && !PROFILE1 ? '        pha                     ; pfTick clobbers A, and A is the predicted column\n        ldx #13\n        jsr pfTick              ; pivOne: the per-hint prediction arithmetic\n        pla\n' : ''}        cmp pvLast
        beq pivNx               ; predictions must come out strictly increasing, or the spans
        bcc pivNx               ; would overlap and the stack would describe nonsense. Rotation
        cmp #${hx(NLOG - 1)}    ; is monotonic but the per-boundary translation term is not, so
        bcs pivNx               ; anything out of order is simply dropped -- it costs one
        pha                     ; unpredicted boundary, not a wrong image.
        jsr pivCut
        pla
        clc
        adc #$01
        cmp #${hx(NLOG - 1)}
        bcs pivNx
        jsr pivCut
pivNx:  jmp pivLp               ; pvI was decremented at the top; 0 ends the walk
pivEnd: lda #${hx(NLOG - 1)}    ; the last span always runs to the right edge
        jsr pivPush
        lda #$00
        sta pvN                 ; this frame records its own boundaries from scratch
        rts

; march column A, then push the span (pvLast, A) and make A the new pvLast
pivCut: pha
        sta col
${PROFILE && !PROFILE1 ? '        ldx #14\n        jsr pfTick\n' : ''}        jsr marchCol
${PROFILE && !PROFILE1 ? '        ldx #12\n        jsr pfTick              ; ray: hit + height + marchCol stores\n' : ''}        pla
pivPush:ldx sp
        pha
        lda pvLast
        sta stackLT,x
        pla
        sta stackRT,x
        sta pvLast
        inx
        stx sp
        rts

; pvClmp: signed 16-bit pvTL/pvTH -> A, saturating to -128..127 rather than wrapping. A wrap
; here would turn a large forward step into a large BACKWARD prediction, which is worse than
; no prediction at all.
pvClmp: lda pvTH
        beq pvcP
        cmp #$ff
        beq pvcN
        lda pvTH
        bmi pvcLo
        lda #$7f
        rts
pvcLo:  lda #$80
        rts
pvcP:   lda pvTL                ; high byte 0: fits iff the low byte is not already negative
        bpl pvcD
        lda #$7f
        rts
pvcN:   lda pvTL                ; high byte $ff: fits iff the low byte IS negative
        bmi pvcD
        lda #$80
pvcD:   rts

; pivOne: X = hint index -> A = predicted column.
;   q' = rayOffQS[col] - dqa + ((pvDX*sin(a) - pvDY*cos(a)) * rcp + 2^14 >> 15)
; and qToColT turns q' back into a column, which is why there is no divide anywhere here --
; the rectilinear column spacing is baked into that table.
pivOne: stx pvI2
        lda pvMode              ; see pvMDn: skip what this frame's motion makes zero
        beq pv1All
        cmp #$02
        bcs pv1Sti
        lda #$00                ; turned in place: daq = 0, so the term, both multiplies and
        sta pvTL                ; the reciprocal are all skipped -- only the rotation is left
        sta pvTH
        jmp pv1r
pv1Sti: lda pvBnd,x             ; nothing moved: the boundary is still exactly where it was
        rts                     ; pinned, which is a better answer than the rounding the
                                ; qToColT round trip would give it
pv1All: ldy pvAng,x
        jsr pivTerm             ; pvTL/pvTH = the signed 16-bit term
        lda #$00
        sta pvSgn
        lda pvTH
        bpl pv1p
        lda #$00                ; |term|, sign remembered
        sec
        sbc pvTL
        sta pvTL
        lda #$00
        sbc pvTH
        sta pvTH
        lda #$ff
        sta pvSgn
pv1p:   ldx pvI2                ; |term| * rcp, 16x8 -> 24 bits
        lda pvRcp,x
        sta mq
        lda pvTL
        jsr mul8                ; the product's LOW byte is never read: the >>15 below takes
        lda phi                 ; only bits 15..22, so byte 0 cannot reach the result
        sta pvPH
        lda #$00
        sta pvPB
        lda pvTH
        beq pv1n                ; high byte zero -- the common case, one multiply not two
        jsr mul8                ; mq still holds rcp
        clc
        lda pvPH
        adc plo
        sta pvPH
        lda phi
        adc #$00
        sta pvPB
pv1n:   lda pvPH                ; + 2^14: a bare >>15 truncates toward -inf, and -0.4 of a
        clc                     ; column every frame is enough to miss at a one-column bracket
        adc #$40
        sta pvPH
        lda pvPB
        adc #$00
        sta pvPB
        lda pvPH                ; >>15 = (pvPB<<1) | bit 7 of pvPH
        asl
        lda pvPB
        rol
        ldy pvSgn
        bpl pv1s
        eor #$ff                ; put the sign back
        clc
        adc #$01
pv1s:   sta pvTL                ; daq, signed byte -> sign-extend for the 16-bit sum
        ldy #$00
        bit pvTL
        bpl pv1e
        ldy #$ff
pv1e:   sty pvTH
pv1r:   ldx pvI2                ; + rayOffQS[col], sign-extended
        ldy pvBnd,x
        lda rayOffQS,y
        clc
        adc pvTL
        sta pvTL
        lda rayOffQS,y
        and #$80
        beq pv1f
        lda #$ff
pv1f:   adc pvTH                ; carry from the low add is still live
        sta pvTH
        lda pvTL                ; - dqa, sign-extended
        sec
        sbc dqa
        sta pvTL
        lda dqa
        and #$80
        beq pv1g
        lda #$ff
pv1g:   sta tmp
        lda pvTH
        sbc tmp
        sta pvTH
        jsr pvClmp              ; off-screen offsets saturate, so a boundary that rotated out
        clc                     ; of view lands on column 0 or 159 and merges away
        adc #$80
        tay
        lda qToColT,y
        rts

; pivTerm: Y = the boundary's world bearing -> pvTL/pvTH = pvDX*sin(a) - pvDY*cos(a), signed.
; Two unsigned multiplies with the signs carried in pvSgn, because mul8 is a quarter-square
; table and only takes magnitudes.
pivTerm:lda #$00
        sta pvTL
        sta pvTH
        sta pvSgn
        sty pvYs
        lda sinST,y
        jsr pvNeg
        sta mq
        lda pvDX
        jsr pvNeg
        jsr mul8
        lda pvSgn
        bmi pvT1s
        clc                     ; term += |dx*sin|
        lda pvTL
        adc plo
        sta pvTL
        lda pvTH
        adc phi
        sta pvTH
        jmp pvT2
pvT1s:  sec                     ; term -= |dx*sin|
        lda pvTL
        sbc plo
        sta pvTL
        lda pvTH
        sbc phi
        sta pvTH
pvT2:   lda #$00
        sta pvSgn
        lda pvYs                ; cos(a) = sin(a + a quarter turn); no second table
        clc
        adc #$40
        tay
        lda sinST,y
        jsr pvNeg
        sta mq
        lda pvDY
        jsr pvNeg
        jsr mul8
        lda pvSgn               ; this product is SUBTRACTED, so the senses invert
        bmi pvT2a
        sec
        lda pvTL
        sbc plo
        sta pvTL
        lda pvTH
        sbc phi
        sta pvTH
        rts
pvT2a:  clc
        lda pvTL
        adc plo
        sta pvTL
        lda pvTH
        adc phi
        sta pvTH
        rts

; pvNeg: A signed -> A = |A|, flipping pvSgn's bit 7 when it was negative
pvNeg:  cmp #$80
        bcc pvNgD
        eor #$ff
        clc
        adc #$01
        pha
        lda pvSgn
        eor #$80
        sta pvSgn
        pla
pvNgD:  rts
` : ''}
subFin:
${PROFILE && !PROFILE1 ? '        ldx #2\n        jsr pfTick              ; cast + interpolate + seams (prepCells is folded in here)\n' : ''}${SPRITES ? '        jsr orbMove             ; once a frame: project every candidate the cell lists\n' : ''}${NOFILL ? '' : '        jsr renderSym'}${SPRITES && ORBOCC && ORBSTAMP ? '\n        jsr orbStamp            ; AFTER renderSym: it overwrites cells renderSym just drew' : ''}
${PROFILE && !PROFILE1 ? '        ldx #4\n        jsr pfTick              ; renderSym\n' : ''}${NOHUD ? '' : '        jsr drawFps'}
        jsr drawDbg
${PROFILE && !PROFILE1 ? '        ldx #5\n        jsr pfTick              ; fps counter + readout\n' : ''}${PROFILE ? `        lda pfDone              ; 256 frames, so the average is just the top two bytes
        bne pfRdy
        inc pfN
        bne pfNd
        inc pfDone              ; latch: freezes pfTick, starts drawing the table
pfRdy:  jsr pfShow              ; every frame from now on -- the two screen buffers alternate,
pfNd:                           ; so a one-shot draw is only in one of them
` : ''}${DUMPH ? '        jsr dumpH      ; AFTER the readout: drawDbg writes rows 0-2 at cols 36-39' : ''}
        inc renderCnt
        lda renderCnt
        cmp #16
        bcc noFps
        jsr computeFps
        lda #$00
        sta renderCnt
noFps:
mvs:    lda $d012
        cmp #250
        bne mvs
        lda baseHi
        cmp #${hx(SCR_A >> 8)}
        bne mshB
        lda #${hx(vm(SCR_A))}
        sta d018vm              ; show A, draw into B (IRQ ORs in the charset bits)
        lda #${hx(SCR_B >> 8)}
        sta baseHi
        jmp mnext
mshB:   lda #${hx(vm(SCR_B))}
        sta d018vm              ; show B, draw into A
        lda #${hx(SCR_A >> 8)}
        sta baseHi
mnext:
${PLAN === 2 ? `        ; ---- colour RAM flush: past raster 250, after the flip, never inline ----
        ; Only edge cells carry a nesting pair, and every edge cell is queued every frame, so
        ; nothing has to be restored: a cell that stops being an edge gets SOLID or BLANK, and
        ; neither of those glyphs contains a bit pair 11 to colour.
        ldx cqN
        beq cqDone
cqF1:   dex
        lda cqLo,x
        sta cqp
        lda cqHi,x
        sta cqp+1
        lda cqCol,x
        ldy #$00
        sta (cqp),y
        cpx #$00
        bne cqF1
cqDone: lda #$00
        sta cqN
` : ''}${SPRITES ? '        jsr osFlush             ; sprite registers, now the beam is out of the way\n' : ''}        inc iterLo
        bne mloop
        inc iterHi
        jmp mloop

; The old makeDiv drew a white seam slit by ZEROING colH at each face boundary. That is
; incompatible with 4-wide cells -- a zeroed column silently became a ramp endpoint, so a
; boundary landing on a cell edge turned the whole cell into a diagonal. It is also now
; redundant: the face boundary is rendered as a true vertical step (see prepCells/cstepT).

; 8x8 -> 16 unsigned, A * mq -> phi:plo, off the same quarter-square tables as sideMul.
mul8:   sta mp
        clc
        adc mq
        tax
        bcc m8l0
        lda f1LoT,x
        sta plo
        lda f1HiT,x
        sta phi
        jmp m8l1
m8l0:   lda f0LoT,x
        sta plo
        lda f0HiT,x
        sta phi
m8l1:   lda mp
        sec
        sbc mq
        bcs m8l2
        eor #$ff
        adc #$01
m8l2:   tax
        sec
        lda plo
        sbc f0LoT,x
        sta plo
        lda phi
        sbc f0HiT,x
        sta phi
        rts

; ================= render: 4x8 multicolor cells + vertical symmetry =================
; Walks CELL COLUMNS, not rows. Everything a column needs follows from one number -- the
; row its wall top lands in -- so the old row-major loop was re-deriving per cell what is
; known once per column. Here each column is three runs:
;
;     rows 0 .. rb-1     ceiling      painted by an unrolled chain
;     rows rb .. rs-1    the wall top computed per cell (usually one row)
;     rows rs .. 12      solid wall   painted by an unrolled chain
;
; rb/rs come from two table lookups on the column's min/max height, so no cell is ever
; tested. The runs are painted by jumping into a straight line of store instructions with
; the addresses baked in (see chainSrc), which is what makes walking DOWN a column cheap
; despite the 40-byte stride -- normally the reason to render row-major.
;
; Each chain slot also writes the mirrored row, so both halves are painted in one pass;
; charset B (raster-split at the horizon) makes the same char code render upside down.
renderSym:
        lda baseHi
        cmp #${hx(SCR_A >> 8)}
        beq rfBufA
        lda #14                 ; upper half of the entry tables = buffer B chains
        bne rfBufS              ; always
rfBufA: lda #$00
rfBufS: sta bufOff
        ; ---- which buffer's run cache? ----
        ; The chains repaint rows this buffer already holds whenever the run lengths have not
        ; changed since it was last drawn, two frames ago. Each buffer needs its OWN cache --
        ; sharing one makes each skip writes based on what the other holds, which shows up as
        ; the view flickering on every bank switch. All four tables sit in one page, so
        ; choosing between them is four operand bytes patched here rather than an index
        ; computed per column.
        lda baseHi
        cmp #${hx(SCR_A >> 8)}
        bne rfCbB
        lda #<cwA
        ldy #<cbA
        jmp rfCbS               ; not bne: cwA is page-aligned, so A is zero here
rfCbB:  lda #<cwB
        ldy #<cbB
rfCbS:  sta rfCw1+1
        sta rfCw2+1
        sty rfCb1+1
        sty rfCb2+1
${SEAMS ? '        sty rfCb3+1\n' : ''}

        ldx #39                 ; X = cell column throughout; the chains use it as their index
        ; The cell's min and max heights, computed HERE rather than in a pass of their own.
        ; prepCells walked these same 40 cell columns to write cmnT/cmxT for renderSym to read
        ; back one loop later -- 40 iterations of loop overhead and a store-then-load round
        ; trip to move two bytes between two routines that visit the cells in the same order.
        ; X is the cell column and the chains index by it, so it has to survive; Y and A are
        ; free here, which is all this needs.
rfCol:  stx colc
        ; colH is ONE linear ramp across any cell with no delimiter inside it, so its extremes
        ; are its END columns and the middle two need not be looked at. 97% of cells, measured.
        ; The four-way scan below is kept for the other 3%, where two linear pieces meet and the
        ; extreme can be in the middle.
${NOMINMAX ? `        ; NOMINMAX: min = max = the cell's FIRST column, so neither the two-column compare
        ; nor the four-way scan runs. Renders wrong on purpose. It prices the COMPARISONS while
        ; leaving the per-column loop, the rbT/rsT lookups and both cache tests in place, so the
        ; two halves of the per-column head can be told apart.
        ldy col4T,x
        lda colH,y
        sta tmp
        sta tmp2
        jmp pmB3` : `        lda cstepT,x
        bne pmSlow
        ; X MUST survive this: it is the cell column, and the run-cache test right after pmB3
        ; is a cmp against cwA,x. The first cut held h3 in X and addressed the cache with a
        ; wall height instead -- six views went 914 -> 6913 wrong pixels.
        ldy col4T,x
        lda colH,y              ; h0
        cmp colH+3,y            ; vs h3
        bcs pmFhi
        sta tmp                 ; h0 < h3: min = h0, max = h3
        lda colH+3,y
        sta tmp2
        jmp pmB3
pmFhi:  sta tmp2                ; h0 >= h3: max = h0, min = h3
        lda colH+3,y
        sta tmp
        jmp pmB3
pmSlow: ldy col4T,x             ; first logical column of this cell; colH is page-aligned, so
        lda colH,y              ; the +1/+2/+3 forms cannot cross a page
        sta tmp                 ; running min
        sta tmp2                ; running max
        lda colH+1,y
        cmp tmp
        bcs pmA1
        sta tmp
pmA1:   cmp tmp2
        bcc pmB1
        sta tmp2
pmB1:   lda colH+2,y
        cmp tmp
        bcs pmA2
        sta tmp
pmA2:   cmp tmp2
        bcc pmB2
        sta tmp2
pmB2:   lda colH+3,y
        cmp tmp
        bcs pmA3
        sta tmp
pmA3:   cmp tmp2
        bcc pmB3
        sta tmp2`}
pmB3:   ldy tmp2
        lda rbT,y
        sta rbv
        ldy tmp
        lda rsT,y
        cmp rbv
        bcs rfRs
        lda rbv                 ; a tall column can put rs below rb; keep the runs disjoint
rfRs:   sta rsv
        ; ---- ceiling run: rows 0 .. rb-1 ----
        lda rbv
rfCw1:  cmp cwA,x               ; operand patched above
        beq rfEdge              ; same length as this buffer already holds: leave it alone
rfCw2:  sta cwA,x
        ; SHRANK -- and a shorter ceiling needs no writes at all. Rows 0..rb-1 are already
        ; blank, being a prefix of what this buffer holds, and the rows the ceiling gave up
        ; (rb..rb_old-1) are overwritten THIS frame by the edge loop, which runs rb..rs-1, or
        ; by the solid chain under it. rfRs clamps rs >= rb, so between them those two always
        ; cover the gap -- which is what makes this safe rather than merely usually right.
${PARTIAL ? '        bcc rfEdge\n' : ''}        cmp #$00
        beq rfEdge
${RAYCNT ? '        inc chnN\n' : ''}
        clc
        adc bufOff
        tay
        lda blkLoT,y
        sta jv
        lda blkHiT,y
        sta jv+1
        ldx colc
        lda #${hx(BLANK)}       ; A must be loaded last: the chain stores it as-is
        jmp (jv)                ; -> descending chain -> jmp rfEdge
        ; ---- wall-top run: rows rb .. rs-1, one real cell each ----
        ; Test at the bottom, not the top: 23 of 40 columns have no edge row at all, and
        ; the old shape made every one of them load erow back out of memory to discover it.
rfEdge: lda rbv
        cmp rsv
        bcs rfSolid             ; nothing between the ceiling and the solid run
        sta erow
rfEdgeL:
${RAYCNT ? '        inc edgN\n' : ''}${NOEDGE ? `        lda #${hx(SOLID)}
        sta ecode
        jmp rfStore
` : ''}        ldy erow
        lda kTabT,y
        sta kr
        ldx colc
        lda col4T,x
        tax                     ; X = 4*column -> logical column of this cell
        lda colH,x              ; cap here, not over all 160 columns: (h + K) has to fit a
        cmp #101                ; signed byte, and colH is deliberately left uncapped so the
        bcc rfCp0               ; interpolator's merged spans stay linear
        lda #100
rfCp0:  clc
        adc kr
        tay
        lda clmp16,y
        sta hh0                 ; left level, already shifted into the high nibble
        lda colH+3,x
        cmp #101
        bcc rfCp3
        lda #100
rfCp3:  clc
        adc kr
        tay
        lda clampT,y
        sta hh1                 ; right level (0..12)
        ldy colc                ; through Y, NOT X: X still holds 4*col from the h0/h3 loads
        lda cstepT,y            ; above, and the ramp path's inlined calcM below needs it. The
        and #$03                ; mask subBnd's cell mark; only the POSITION selects a step
        bne rfStep              ; step path clobbers X anyway and rebuilds 4*col for itself.
        lda hh0                 ; single face: ramp, index = wL*16 + wR
        ora hh1                 ; hh0 is already <<4, straight from clmp16
        tay
${PLAN === 2 ? `        sty bidx                ; the pair's threshold is indexed the same way as its code
        lda #$00
        sta thsel
        lda rampT,y
        jmp rfStore             ; (the ramp is the common case; see rfStore below)` : PLAN === 3 ? `        ; The ninth bit of the index. The byte in Y is two of the cell's four columns; m is the
        ; other two, and the per-bucket threshold turns it into one bit. Carry from the compare
        ; picks the table, so no wide arithmetic is needed -- the tables are page-aligned and the
        ; index stays a byte in Y.
        ; ---- and 44% of slots do not have a ninth bit at all ----
        ; m is clamp8T + clamp8T, two levels of 0..8, so it can never be negative and "m >= 0"
        ; is a tautology. A threshold of ZERO therefore means "always the hi half, whatever m
        ; is" -- which makes it the exact encoding for "the plan never allocated this slot a
        ; second codeword". Reading the threshold FIRST and bailing on zero skips calcM
        ; entirely: 83 cycles an edge cell, on 435 of 985 slots, for a 7-cycle test and no
        ; change to a single pixel. The build normalises every lo == hi slot to zero (see
        ; rampThrN) so the test catches all of them, not just the 314 that were already zero.
        sty bidx
        lda rampThrT,y
        beq rmpHi
        sta cmv                 ; cmv held m across the kpos dispatch; the threshold needs it
                                ; more, and m no longer has to survive anything
        ; ---- calcM, inlined on the ramp path only ----
        ; X still holds 4*col, which is why the cstepT test above went through Y. As a
        ; subroutine this rebuilt it from colc on EVERY edge cell -- ldx colc / lda col4T,x /
        ; tax, plus the jsr/rts: 21 cycles, on the ~45 of 48 edge cells a frame that are ramps.
        ; The three step sites still call calcM; they clobber X and only 2.7 cells a frame
        ; reach them, so a second inlined copy there would be 40 bytes for nothing.
        lda colH+1,x
        cmp #101                ; same cap as the endpoints: (h + K) must fit a signed byte
        bcc rmpM1
        lda #100
rmpM1:  clc
        adc kr
        tay
        lda clamp8T,y           ; the LEVEL 0..8, not clampT's 0..15 clamp index
        sta cmtmp
        lda colH+2,x
        cmp #101
        bcc rmpM2
        lda #100
rmpM2:  clc
        adc kr
        tay
        lda clamp8T,y
        clc
        adc cmtmp               ; A = m
        ldy bidx
        cmp cmv
        bcs rmpHi
        lda rampTlo,y
        jmp rfStore
rmpHi:  lda rampThi,y
        jmp rfStore` : `        lda rampT,y
        jmp rfStore             ; (the ramp is the common case; see rfStore below)`}
        ; A face boundary inside the cell -- a genuinely vertical step, whose position the
        ; renderer reads straight out of cstepT rather than inferring. The old scheme drew a
        ; flat plateau up to that column, but the near wall is still receding across it, so
        ; corners grew a horizontal cap. Sampling the height at the LAST column before the
        ; boundary as well lets the plateau slope: 1.57 -> 0.65 wrong logical columns a frame.
rfStep: sta kpos                ; boundary position, 1..3
        lda hh0                 ; hh0 arrives pre-shifted for the ramp path; undo that here
        lsr
        lsr
        lsr
        lsr
        tax
        lda qIdxAT,x
        asl
        asl
        asl
        sta tmp                 ; qA*8, the row of qmT
        ldx hh1
        lda qIdxBT,x
        sta qbv
        ldx colc                ; recompute 4*column: cheaper than storing it on every edge
        lda col4T,x             ;   cell when only the 2.7 step cells a frame need it
        clc
        ldy kpos                ; qmColT = 0,1,1,2 -- never w[0], which qA already covers
        adc qmColT,y
        tax
        lda colH,x
        cmp #101                ; same cap as the endpoints: (h + K) must fit a signed byte
        bcc rfMc
        lda #100
rfMc:   clc
        adc kr
        tay
        lda clampT,y
        tax
        lda qIdxMT,x
        ora tmp                 ; qA*8 + qM
        tay
        lda qmT,y               ; -> qA*(LM*LB) + qM*LB, folded so there is no multiply here
        clc
        adc qbv
        tay
${PLAN === 2 ? `        sty bidx
        lda kpos                ; 1..3, and thsel 0 is the ramp -- so kpos IS the selector
        sta thsel
` : ''}${PLAN === 3 ? `        sty bidx                ; calcM is NOT called yet -- see the ramp path: the threshold
                                ; decides whether it is needed at all, and the threshold to read
                                ; depends on kpos, so the dispatch has to come first now. Y holds
                                ; the slot index throughout; nothing below disturbs it.
` : ''}        lda kpos
        cmp #$02
        beq rfSt2
        bcs rfSt3
${PLAN === 3 ? `        lda stepThrT1,y
        beq st1h                ; threshold 0: no second codeword for this slot, skip calcM
        sta cmv
        jsr calcM
        ldy bidx
        cmp cmv
        bcs st1h
        lda stepT1lo,y
        jmp rfStore
st1h:   lda stepT1hi,y
        jmp rfStore
rfSt2:  lda stepThrT2,y
        beq st2h
        sta cmv
        jsr calcM
        ldy bidx
        cmp cmv
        bcs st2h
        lda stepT2lo,y
        jmp rfStore
st2h:   lda stepT2hi,y
        jmp rfStore
rfSt3:  lda stepThrT3,y
        beq st3h
        sta cmv
        jsr calcM
        ldy bidx
        cmp cmv
        bcs st3h
        lda stepT3lo,y
        jmp rfStore
st3h:   lda stepT3hi,y` : `        lda stepT1,y
        jmp rfStore
rfSt2:  lda stepT2,y
        jmp rfStore
rfSt3:  lda stepT3,y`}
        ; Store it at this row and its mirror. This used to hand-build two 16-bit pointers
        ; -- rowLoT/rowHiT + colc with the carry, twice -- and store through them: 85 cycles
        ; to write two bytes. The stub has both addresses baked in and takes the column from
        ; X, exactly like the run chains, so the addressing mode does the arithmetic instead.
rfStore:sta ecode
${PLAN === 2 ? `        ; ---- which half of the pair does this cell show? ----
        ; The bucket is two of the four columns, because a 4D index is what costs -- not the
        ; data, which colH has all along. So one add and one table compare recover most of what
        ; the bucket threw away: m = w1 + w2 against a threshold chosen per bucket offline.
        ; Measured at 99% of what a perfect oracle bit would be worth.
        ldx colc
        lda col4T,x
        tax
        lda colH+1,x
        cmp #101                ; same cap as the endpoints: (h + K) must fit a signed byte
        bcc rcM1
        lda #100
rcM1:   clc
        adc kr
        tay
        lda clamp8T,y           ; LEVEL 0..8, matching the offline thresholds -- not clampT
        sta cqtmp               ; free scratch: the colour is not chosen until below
        lda colH+2,x
        cmp #101
        bcc rcM2
        lda #100
rcM2:   clc
        adc kr
        tay
        lda clamp8T,y
        clc
        adc cqtmp               ; A = m, and the compares below only need the carry
        ldy bidx
        ldx thsel
        beq rcRamp
        dex
        beq rcS1
        dex
        beq rcS2
        cmp stepThrT3,y
        jmp rcSet
rcS1:   cmp stepThrT1,y
        jmp rcSet
rcS2:   cmp stepThrT2,y
        jmp rcSet
rcRamp: cmp rampThrT,y
rcSet:  lda #$08                ; carry set: m >= thr -> the FULLER half -> 11 reads black
        bcs rcHave
        lda #$09                ; sparser half -> 11 reads white, so those rows drop out
rcHave: sta cqtmp
        ldy erow                ; queue this row and its mirror; renderSym writes both
        jsr cqPush
        lda #24
        sec
        sbc erow
        tay
        jsr cqPush
` : ''}lda erow
        clc
        adc bufOff
        tay
        lda edgLoT,y
        sta jv
        lda edgHiT,y
        sta jv+1
        ldx colc
        lda ecode
        jmp (jv)                ; -> edA<row>/edB<row> -> inc erow -> jmp rfEdgeL
        ; ---- solid run: rows rs .. 12 ----
rfEdgeT:lda erow                ; bottom of the edge run
        cmp rsv
        bcc rfEdgeL
rfSolid:${SEAMS ? `; A seam column always redraws. The cache byte HAS room to carry the seam variant as well --
        ; rs is 0..13, so the top nibble is spare -- and that was tried and MEASURED: 25 chain
        ; draws of 80 with it, 25 without. Not one extra hit.
        ;
        ; The reason is worth keeping. rb and rs are quantised to 13 char ROWS, so a column's
        ; wall top must move ~8 pixels to change one -- coarser than a frame of motion, which is
        ; why they hit 69% of the time. A seam's position is one of 4 slots inside a 4-pixel
        ; cell, two physical pixels apiece: finer than a frame of motion, so it changes every
        ; frame and the key never matches. A cache key pays only when it is COARSER than the
        ; movement between frames, and no amount of spare bits changes that.
        lda seamT,x
        cmp #${hx(SOLID)}
        bne rfSlSm              ; a seam column bypasses the COMPARE entirely -- see below
        ` : ''}lda rsv
rfCb1:  cmp cbA,x
        beq rfNext
rfCb2:  sta cbA,x
${PARTIAL ? `        bcs rfNext              ; rs GREW: the solid run starts later, so it only gave rows up,
                                ; and the edge loop (rb..rs-1) has just redrawn every one of
                                ; them. Rows rs..12 are a suffix of what the buffer holds.
` : ''}        jmp rfSlDr
${SEAMS ? `rfSlSm: lda #$ff              ; $ff is a value rs cannot take, so next frame's compare fails
rfCb3:  sta cbA,x               ; and the column redraws. It must be STORED WITHOUT COMPARING:
                                ; comparing $ff against a cache that already holds $ff matches,
                                ; and the column is skipped even though its seam may have MOVED.
                                ; Collapsing this into the common path cost 914 -> 7117 wrong
                                ; pixels across the six views.
` : ''}rfSlDr:${RAYCNT ? ' inc chnN\n       ' : ''} lda rsv
        cmp #13
        bcs rfNext
        clc
        adc bufOff
        tay
        lda sldLoT,y
        sta jv
        lda sldHiT,y
        sta jv+1
        ldx colc
        ${SEAMS ? 'lda seamT,x             ; SOLID, or this column\'s seam variant' : `lda #${hx(SOLID)}`}
        jmp (jv)                ; -> ascending chain -> jmp rfNext
rfNext: ldx colc
        dex
        bpl rfCol
        rts
${PLAN === 3 ? `
; calcM: A = w1 + w2, the two columns the bucket index does not carry. Same cap and clamp the
; endpoints get -- (h + K) must fit a signed byte, and clampT is the only thing that turns a
; height into a level. A subroutine rather than inlined twice: 12 cycles of jsr/rts against
; ~40 bytes duplicated, on a path that already costs ~50.
calcM:  ldx colc
        lda col4T,x
        tax
        lda colH+1,x
        cmp #101
        bcc cm1
        lda #100
cm1:    clc
        adc kr
        tay
        lda clamp8T,y           ; the LEVEL 0..8, not clampT's 0..15 clamp index
        sta cmtmp
        lda colH+2,x
        cmp #101
        bcc cm2
        lda #100
cm2:    clc
        adc kr
        tay
        lda clamp8T,y
        clc
        adc cmtmp
        rts
` : ''}${PLAN === 2 ? `
; cqPush: queue colour RAM cell (Y = char row, colc = column) = cqtmp. The cap is a real bound,
; not a guess -- the build asserts the worst sampled frame against it, exactly as the old colour
; queue did, because an overflow here is a wrong-coloured cell rather than a crash and would go
; unnoticed for a long time.
cqPush: lda ccLoT,y
        clc
        adc colc
        ldx cqN
        sta cqLo,x
        lda ccHiT,y
        adc #$00
        sta cqHi,x
        lda cqtmp
        sta cqCol,x
        inx
        cpx #${hx(CQMAX)}
        bcs cqFull              ; full: drop it. One cell shows the other half of its pair for
        stx cqN                 ; one frame, which beats scribbling past the queue.
cqFull: rts
` : ''}
${DUMPH ? `
; diagnostic: colH[0..159] as hex pairs, 40 columns per row-pair, over screen rows 0-7
dumpH:  ldx #$00
        lda #$00
        sta tmp
dhK:    lda tmp
        asl
        tay
        lda rowLoT,y
        sta ppPtr
        lda rowHiT,y
        clc
        adc baseHi
        sta ppPtr+1
        iny
        lda rowLoT,y
        sta ep2
        lda rowHiT,y
        clc
        adc baseHi
        sta ep2+1
        ldy #$00
dhJ:    lda colH,x
        lsr
        lsr
        lsr
        lsr
        clc
        adc #${hx(GLYPH0)}
        sta (ppPtr),y
        lda colH,x
        and #$0f
        clc
        adc #${hx(GLYPH0)}
        sta (ep2),y
        inx
        iny
        cpy #40
        bne dhJ
        inc tmp
        lda tmp
        cmp #$04
        bne dhK
        rts
` : ''}
; ================= ESDF keyboard =================
${SPIN ? `; ---- spinStep: rotate one unit a frame, and hop between viewpoints ----
; pa doubles as the frame counter for fps.sh, so the rotation has to stay exactly one unit a
; frame. Every full rotation the player is teleported to the next preset, so a benchmark run
; averages over several parts of the map instead of measuring one spot forever. The hop is
; frame-locked, not time-locked, so two builds at different frame rates still visit the same
; places in the same order and stay comparable.
spinStep:
        inc pa
        bne ssDn
        ldx spinIx
        inx
        cpx #${SPINPOS.length}
        bcc ssIx
        ldx #$00
ssIx:   stx spinIx
        lda spinXL,x
        sta px
        lda spinXH,x
        sta px+1
        lda spinYL,x
        sta py
        lda spinYH,x
        sta py+1
ssDn:   rts
${false ? `
; tourStep: turn AND translate. Drives px/py DIRECTLY rather than calling moveFwd, because
; moveFwd stops dead at a wall and a benchmark that quietly stops moving still prints a
; confident number. The first cut of this used moveFwd and read 7 rays/frame for every config
; including plain bisection -- the player had wedged in a corner and most frames were a blank
; wall at arm's length. A test that cannot fail loudly is worse than no test.
;
; +-0.25 cells on both axes around the spin viewpoint, reversing every 8 frames. The viewpoints
; are cell centres, so 0.25 stays 0.25 clear of the wall against a collision box of 0.102 -- no
; collision test is needed and the motion therefore cannot stop. 8/256 a frame at ~20 fps is
; 0.63 cells/s against a player's 0.94, so the deltas are the right order of magnitude.
tourStep:
        jsr spinStep            ; rotation, and the viewpoint hop on a full turn
        inc tourC
        lda tourC
        and #$08                ; 8 frames one way, 8 the other
        beq tourF
        lda px
        sec
        sbc #$08
        sta px
        lda px+1
        sbc #$00
        sta px+1
        lda py
        sec
        sbc #$08
        sta py
        lda py+1
        sbc #$00
        sta py+1
        rts
tourF:  rts
` : ''}` : ''}
${TOUR ? `
; ---- tourStep: rotate AND translate, at a FIXED viewpoint ----
; The benchmark motion that actually exercises the temporal pivot. Rotation alone (SPIN) leaves
; the prediction's translation term -- two multiplies, the signs, the reciprocal, the 24-bit
; product -- running on zero every frame, which is how it went untested into a commit.
;
; One angle unit a frame and a 16-frame position cycle, so 256 frames is exactly one rotation
; and 16 whole oscillations. Every 256-frame window is therefore IDENTICAL in composition no
; matter how fast the build runs, which is what makes two configs comparable. No viewpoint hop,
; for the same reason -- see the TOUR comment above for how that went the first time.
;
; px/py are driven directly rather than through moveFwd: moveFwd stops at a wall, and a
; benchmark that silently stops moving still prints a confident number. +-0.25 cells around a
; cell centre clears the 0.102 collision box, so it cannot stop.
tourStep:
        ; TOURSTOP: move for 512 frames, then FREEZE. That is what makes the run cache
        ; testable. A pinned viewpoint never changes rb or rs, so the equality test always
        ; hits and the shrink/grow skips never execute -- the six views would pass with those
        ; paths completely broken. Moving first exercises them; freezing afterwards makes the
        ; result scoreable, because a stale row left behind by a wrong skip is never redrawn
        ; once nothing is changing, so it sits there until the screenshot catches it.
        ; 512 is a whole number of rotations (1 angle unit a frame) and of the 16-frame
        ; oscillation, so the frozen viewpoint is exactly PX/PY/PA again.
        lda tourF+1
        cmp #$02
        bcs tourDn
        inc tourF
        bne tsNc
        inc tourF+1
tsNc:   inc pa
        inc tourC
        lda tourC
        and #$08                ; 8 frames out, 8 back: period 16, net displacement zero
        bne tourBk
        lda px
        clc
        adc #$08
        sta px
        lda px+1
        adc #$00
        sta px+1
        lda py
        clc
        adc #$08
        sta py
        lda py+1
        adc #$00
        sta py+1
        rts
tourDn: rts
tourBk: lda px
        sec
        sbc #$08
        sta px
        lda px+1
        sbc #$00
        sta px+1
        lda py
        sec
        sbc #$08
        sta py
        lda py+1
        sbc #$00
        sta py+1
        rts
` : ''}; ---- tickDelta: how much time has passed, in 60ths ----
; The step used to be per FRAME, so walking speed rose and fell with the frame rate -- fastest
; down an empty corridor, slowest where the geometry is dense, which is exactly backwards.
; frameCnt is bumped by the top-of-frame raster IRQ, so it counts 60ths of a second no matter
; how long the render took. Called from the main loop rather than from readKeys, so the WALK
; and STRAFE diagnostic builds move at the same speed a player does.
tickDelta:
        lda frameCnt
        sec
        sbc lastMv
        sta dtv
        lda frameCnt
        sta lastMv
        lda dtv
        bne tdCl
        inc dtv                 ; two renders inside one tick: still move a little
tdCl:   lda dtv
        cmp #${DT_MAX}
        bcc tdDn
        lda #${DT_MAX}          ; a hitch must not step far enough to tunnel a wall
        sta dtv
tdDn:   lda dtv                 ; unshifted, both run at plain elapsed time
        sta dtm
        sta dtt
        rts

${PALKEYS ? `; ---- palKeys: 1 / 2 / 3 cycle the ceiling, wall and seam inks ----
; Purely for looking at. In mloop rather than readKeys so it works in the SPIN and TOUR builds
; too, which never call readKeys. ~30 cycles a frame; PALKEYS=0 removes it for benchmarking.
;
; Matrix rows: '1' and '2' are both row $7f (bits 0 and 3), '3' is row $fd bit 0. The three are
; folded into one byte as bit0='1', bit2='3', bit3='2' so a single edge test covers them --
; without the edge test a held key would sprint through all sixteen colours in a quarter second.
palKeys:
        ; JOYSTICK 1 SHARES $dc01 WITH THE KEYBOARD COLUMNS, so a row read sees both. Joy-1 up
        ; pulls bit 0 and right pulls bit 3 -- the very bits '1'/'3' and '2' live on -- so
        ; without this mask, pushing the stick up cycled the ceiling AND the seam, and pushing
        ; right cycled the walls. readKeys has always done this; palKeys was written without it.
        ; Read the port with NO row selected: whatever is low then is the stick, not a key.
        lda #$ff
        sta $dc00
        lda $dc01
        eor #$ff
        sta pkJoy               ; 1 where a joystick line is active
        lda #$7f
        sta $dc00
        lda $dc01
        ora pkJoy               ; force the stick's bits high = "not pressed" in this active-low
        eor #$ff                ; read, THEN invert so 1 means pressed
        and #$09
        sta pkNew
        lda #$fd
        sta $dc00
        lda $dc01
        ora pkJoy
        eor #$ff
        and #$01
        asl
        asl
        ora pkNew
        sta pkNew
        eor pkOld               ; changed since last frame ...
        and pkNew               ; ... and pressed now: a fresh press
        sta pkEdge
        lda pkNew
        sta pkOld
        lda #$ff
        sta $dc00               ; leave the port neutral for the joystick read in readKeys
        lda pkEdge
        and #$01
        beq pk2
        inc colW
        lda colW
        and #$0f
        sta colW
        sta $d021
pk2:    lda pkEdge
        and #$08
        beq pk3
        inc colB
        lda colB
        and #$0f
        sta colB
        sta $d022
pk3:    lda pkEdge
        and #$04
        beq pkDn
        inc colS
        lda colS
        and #$0f
        sta colS
        sta $d023
pkDn:   rts

` : ''}readKeys:
        ; read pure joystick-1 first ($dc00=$ff, so no keyboard column pulls $dc01);
        ; joyEor has 1s where a joystick line is active, so we can mask it out of the
        ; keyboard scan (joystick-1 shares $dc01 with the keyboard matrix rows).
        lda #$ff
        sta $dc00
        lda $dc01
        sta joyv
        eor #$ff
        sta joyEor
        lda #$fd
        sta $dc00
        lda $dc01
        ora joyEor
        sta rowv                ; SHIFT, E and S all live in this row -- read it once
        and #$80
        bne rkNoSh
        ; LEFT SHIFT: run. 3 cells/s and 120 deg/s, against 0.23 and 16 walking -- movement and
        ; turning get their own multipliers so running does not spin the world faster than it
        ; moves through it. Scaling elapsed TIME rather than the step keeps both frame-rate
        ; independent for free.
        ; Walking is a QUARTER of what it was (MOVE_SHIFT, TURN_RATE), so running scales elapsed
        ; time by 4 first and then applies the 3x/2x it always did. Running therefore moves and
        ; turns at exactly the speed it always has, while walking got four times finer.
        lda dtv
        asl
        bcs rkR4s
        asl
        bcc rkR4
rkR4s:  lda #${DT_MAX}
rkR4:   sta dtr
        asl
        clc
        adc dtr                 ; 3x movement
        bcs rkShMc
        cmp #${DT_MAX}
        bcc rkShM
rkShMc: lda #${DT_MAX}
rkShM:  sta dtm
        lda dtr
        asl                     ; 2x turning. dtr reaches DT_MAX now, so this can carry out
        bcs rkShTs              ;   where the old 2x of a 32-capped dtv never could
        cmp #${DT_MAX}
        bcc rkShT
rkShTs: lda #${DT_MAX}
rkShT:  sta dtt
rkNoSh: lda rowv
        and #$40
        beq rkFwd               ; E held
        lda joyv
        and #$01
        bne rkNotE              ; joystick-1 up also moves forward
rkFwd:  jsr moveFwd
rkNotE: lda rowv
        and #$20
        bne rkNotS
        jsr strafeL
rkNotS: lda #$fb
        sta $dc00
        lda $dc01
        ora joyEor
        and #$04
        beq rkBack              ; D held
        lda joyv
        and #$02
        bne rkNotD              ; joystick-1 down also moves back
rkBack: jsr moveBack
rkNotD: lda $dc01
        ora joyEor
        and #$20
        bne rkNotF
        jsr strafeR
rkNotF: lda joyv
        and #$04
        bne rkJR                ; joystick-1 left = turn left
        ldx dtt
        ldy pa
        lda paF
rkTlL:  sec
        sbc #${hx(TURN_RATE)}
        bcs rkTlL2
        dey                     ; the fraction borrowed: step the angle byte
rkTlL2: dex
        bne rkTlL
        sta paF
        sty pa
rkJR:   lda joyv
        and #$08
        bne rkJD                ; joystick-1 right = turn right
        ldx dtt
        ldy pa
        lda paF
rkTlR:  clc
        adc #${hx(TURN_RATE)}
        bcc rkTlR2
        iny                     ; the fraction carried: step the angle byte
rkTlR2: dex
        bne rkTlR
        sta paF
        sty pa
rkJD:   rts

${WIGGLE ? `wiggleStep:
        lda iterLo              ; alternate frames: forward, back, forward, back...
        and #$01
        bne wgBack
        jmp moveFwd
wgBack: jmp moveBack
` : ''}moveFwd:
        ldx pa
        lda moveXT,x
        sta dxv
        lda moveYT,x
        sta dyv
        jmp moveApply
moveBack:
        ldx pa
        lda moveXT,x
        eor #$ff
        clc
        adc #$01
        sta dxv
        lda moveYT,x
        eor #$ff
        clc
        adc #$01
        sta dyv
        jmp moveApply
strafeL:
        lda pa
        sec
        sbc #64
        tax
        lda moveXT,x
        sta dxv
        lda moveYT,x
        sta dyv
        jmp moveApply
strafeR:
        lda pa
        clc
        adc #64
        tax
        lda moveXT,x
        sta dxv
        lda moveYT,x
        sta dyv
moveApply:
        ; Scale the step by elapsed ticks: dxs = dxv * dtv >> MOVE_SHIFT, sign extended to 16
        ; bits. dtv is single digits, so repeated addition beats setting up a multiply, and
        ; doing the shift AFTER is what keeps the direction accurate -- the table is deliberately
        ; 8x coarser than the speed so cos(a) has somewhere to live.
        ldy #$00
        lda dxv
        bpl maSx
        ldy #$ff
maSx:   sty dxSgn
        ldy #$00
        lda dyv
        bpl maSy
        ldy #$ff
maSy:   sty dySgn
        lda #$00
        sta dxs
        sta dxsH
        sta dys
        sta dysH
        ldx dtm
maLp:   clc
        lda dxs
        adc dxv
        sta dxs
        lda dxsH
        adc dxSgn
        sta dxsH
        clc
        lda dys
        adc dyv
        sta dys
        lda dysH
        adc dySgn
        sta dysH
        dex
        bne maLp
        ; ROUND TOWARD ZERO, not toward negative infinity. The shift below is arithmetic, so it
        ; floors -- and floor(v/16) + floor(-v/16) = -1 for any v that is not a multiple of 16.
        ; That makes a step forward and a step back NOT inverses: each pair loses one unit of
        ; 1/256 cell on every axis whose product is not a multiple of 16, always toward -x/-y.
        ; Wiggling back and forth therefore walked the player slowly north-west, which reads as
        ; a sideways drift whose SCREEN direction depends on facing -- the same world-space bleed
        ; projecting left at one heading and right at another.
        ;
        ; Biasing a negative value by 2^SHIFT-1 before an arithmetic shift truncates toward zero,
        ; which makes the two directions exact mirrors. The sign is already known in dxSgn/dySgn,
        ; so this is two conditional 16-bit adds once a frame. Verified with WIGGLE=1.
        lda dxSgn
        beq maBy
        clc
        lda dxs
        adc #${hx((1 << MOVE_SHIFT) - 1)}
        sta dxs
        lda dxsH
        adc #$00
        sta dxsH
maBy:   lda dySgn
        beq maBd
        clc
        lda dys
        adc #${hx((1 << MOVE_SHIFT) - 1)}
        sta dys
        lda dysH
        adc #$00
        sta dysH
maBd:   ldx #${MOVE_SHIFT}      ; arithmetic shift: cmp #$80 puts bit 7 back into carry
maSh:   lda dxsH
        cmp #$80
        ror dxsH
        ror dxs
        lda dysH
        cmp #$80
        ror dysH
        ror dys
        dex
        bne maSh
        jsr mvCalcX
        jsr mvCalcY
        jsr mvFree
        bcc mvGo                ; whole step is clear -- the common case, one test
        ; Blocked. Rather than stop dead, retry one axis at a time and take the first that
        ; fits. The component running INTO the wall is the one that fails, so what survives
        ; is the component ALONG it, at full speed: a glancing hit becomes a slide, and a
        ; corner you cut too close is rounded instead of sticking to you.
        ;
        ; No angle threshold is wanted here. A head-on hit has no component along the wall,
        ; so it still stops; as the approach shallows the surviving component grows on its
        ; own. Any explicit cutoff would only add a discontinuity where the smooth version
        ; already does the right thing.
        ;
        ; Dominant axis first. It only matters when BOTH axes fit -- squeezing past a corner
        ; where just the diagonal cell is solid -- and there, continuing the way you were
        ; already heading reads as cutting the corner, while taking the other one reads as
        ; an unexplained sideways jink.
        lda dxv
        bpl mvAbx
        eor #$ff
        clc
        adc #$01
mvAbx:  sta tmp                 ; |dx|
        lda dyv
        bpl mvAby
        eor #$ff
        clc
        adc #$01
mvAby:  cmp tmp                 ; |dy| - |dx|
        bcs mvYfst
        jsr mvTryX
        bcc mvGo
        jsr mvTryY
        bcc mvGo
        rts                     ; both axes blocked: a real dead end, stand still
mvYfst: jsr mvTryY
        bcc mvGo
        jsr mvTryX
        bcc mvGo
        rts
mvGo:   lda nxL
        sta px
        lda nxH
        sta px+1
        lda nyL
        sta py
        lda nyH
        sta py+1
        rts

mvTryX: jsr mvCalcX             ; X component alone: hold Y where it already is
        lda py
        sta nyL
        lda py+1
        sta nyH
        jmp mvFree              ; tail call: its carry is our answer
mvTryY: jsr mvCalcY             ; Y component alone: hold X where it already is
        lda px
        sta nxL
        lda px+1
        sta nxH
        jmp mvFree

mvCalcX:clc                     ; nx = px + dxs, already a proper signed 16-bit step
        lda px
        adc dxs
        sta nxL
        lda px+1
        adc dxsH
        sta nxH
        rts
mvCalcY:clc
        lda py
        adc dys
        sta nyL
        lda py+1
        adc dysH
        sta nyH
        rts
; mvFree: is the player box at (nx, ny) clear? Returns carry SET if blocked, clear if free,
; so callers can chain attempts with bcc. It reads nx/ny and touches nothing else, which is
; what lets moveApply probe three candidate positions with one copy of the test.
;
; The player is a small square, not a point. Testing only the centre let you stand with
; your face flat against a wall at distance 0, which looks wrong and drives the wall height
; to absurd values (88/d). Radius is a hardcoded 26/256 = 0.10 cells -- computing it per
; frame would be pointless, it never changes.
;
; Note this does NOT stop colH from saturating: that needs 0.35 cells of clearance, which
; would feel like walking in a padded corridor. Saturation is handled properly in the
; span-merge instead (see subLp).
mvFree: sec                     ; cx0 = (nx - r) >> 8
        lda nxL
        sbc #26
        lda nxH
        sbc #$00
        sta cx0
        clc                     ; cx1 = (nx + r) >> 8
        lda nxL
        adc #26
        lda nxH
        adc #$00
        sta cx1
        sec                     ; cy0 = (ny - r) >> 8
        lda nyL
        sbc #26
        lda nyH
        sbc #$00
        sta cy0
        clc                     ; cy1 = (ny + r) >> 8
        lda nyL
        adc #26
        lda nyH
        adc #$00
        sta cy1
        lda cx0                 ; any corner off the map (or wrapped) rejects the move
        cmp #16
        bcs mvBlk
        lda cx1
        cmp #16
        bcs mvBlk
        lda cy0
        cmp #16
        bcs mvBlk
        lda cy1
        cmp #16
        bcs mvBlk
        lda cy0                 ; all four corners must be open
        asl
        asl
        asl
        asl
        sta tmp
        ora cx0
        tax
        lda mapT,x
        bne mvBlk
        lda tmp
        ora cx1
        tax
        lda mapT,x
        bne mvBlk
        lda cy1
        asl
        asl
        asl
        asl
        sta tmp
        ora cx0
        tax
        lda mapT,x
        bne mvBlk
        lda tmp
        ora cx1
        tax
        lda mapT,x
        bne mvBlk
        clc                     ; all four corners open
        rts
mvBlk:  sec
        rts

${SEAMS ? `; ================= seamSpan: project this face's cell boundaries to columns =========
; The span runs along ONE flat face, so u (the coordinate along it) is monotonic and every
; integer strictly between u[spanL] and u[spanR] is a cell boundary the wall crosses.
;
; Screen position of one: 1/z is linear in screen column -- that is exactly why the height
; merge is exact -- and u = (u/z)/(1/z) with u/z also linear. Writing h for colH (which IS
; 1/z up to a constant), a = |u_L - k| and b = |u_R - k|, the split falls at
;
;     c = spanL + (spanR - spanL) * h_L*a / (h_L*a + h_R*b)
;
; one divide per seam, no extra rays and no per-column work. Everything below is that.
seamSpan:
        lda spanR
        sec
        sbc spanL
        cmp #$02
        bcc ssDn                ; adjacent columns: nothing between them to mark
        sta ssW                 ; span width in columns
        ; Cheap reject FIRST. idT already holds the hit cell at both ends, and the cell
        ; coordinate along the face is the whole question: same cell, no boundary. 65% of
        ; spans stop on this test, which is exactly why u is derived here instead of in
        ; marchCol -- computing it for all 19 marched columns spent ~2850 cycles a frame
        ; to use about a third of the answer.
        ldx spanL
        lda idT,x
        ldx spanR
        cmp idT,x
        beq ssDn                ; identical cell -> no boundary. A run is a contiguous line
                                ; of cells along ONE plane, so its cells can only differ in
                                ; the coordinate that runs along the face -- comparing the
                                ; raw cell ids is exactly the boundary test, no masking.
        ldx spanL               ; now it is worth deriving u
        jsr calcU
        lda uwL
        sta uaL
        lda uwH
        sta uaH
        ldx spanR
        jsr calcU
        lda uwL
        sta ubL
        lda uwH
        sta ubH
        ; Walk the integer coordinates between the two ends. Direction first: the face can
        ; run either way across the screen.
        lda uaH
        cmp ubH
        beq ssDn                ; same cell, no boundary crossed -- the common case
        bcc ssUp
        ; descending: boundaries at uaH, uaH-1, ... ubH+1
        lda uaH
        sta ssK
        lda uaH
        sec
        sbc ubH
        jmp ssCnt
ssUp:   lda uaH                 ; ascending: boundaries at uaH+1 ... ubH
        clc
        adc #$01
        sta ssK
        lda ubH
        sec
        sbc uaH
ssCnt:  cmp #17
        bcs ssDn                ; more than 16 cells of wall in one span means u is junk
        sta ssN                 ; (castRay's far/guard exits leave remL/remH meaningless)
        ; Every boundary this walk emits is INTERIOR to the run: uaH/ubH are the cells the two
        ; end rays land in, so the outer edges of the wall are never crossed between them. The
        ; corner at the end of a receding wall is marked by subFace instead, which is where it
        ; gets suppressed.
ssLp:   jsr seamOne
        dec ssN
        beq ssDn
        lda uaH                 ; step k toward the far end
        cmp ubH
        bcc ssKup
        dec ssK
        jmp ssLp
ssKup:  inc ssK
        jmp ssLp
ssDn:   rts

; One boundary, at world coordinate ssK. Leaves seamT marked if it lands on a free cell.
seamOne:
        lda #$00                ; k as 8.8
        sta skL
        lda ssK
        sta skH
        sec                     ; a = |u_L - k|
        lda uaL
        sbc skL
        sta saL
        lda uaH
        sbc skH
        sta saH
        bcs ssaP
        sec                     ; negate
        lda #$00
        sbc saL
        sta saL
        lda #$00
        sbc saH
        sta saH
ssaP:   sec                     ; b = |u_R - k|
        lda ubL
        sbc skL
        sta sbL
        lda ubH
        sbc skH
        sta sbH
        bcs ssbP
        sec
        lda #$00
        sbc sbL
        sta sbL
        lda #$00
        sbc sbH
        sta sbH
        ; Squeeze a and b down to 8 bits together, so their ratio survives. The larger keeps
        ; its top bit; the smaller may collapse to 0, which is the right limit anyway -- a
        ; seam sitting on an endpoint belongs at that endpoint.
ssbP:   lda saH
        ora sbH
        beq ssFit
        lsr saH
        ror saL
        lsr sbH
        ror sbL
        jmp ssbP
ssFit:  ldx spanL               ; P = a * h_L, Q = b * h_R, both 8x8 -> 16
        lda colH,x
        sta mq
        lda saL
        jsr mul8
        lda plo
        sta sPlo
        lda phi
        sta sPhi
        ldx spanR
        lda colH,x
        sta mq
        lda sbL
        jsr mul8
        clc                     ; sum = P + Q
        lda plo
        adc sPlo
        sta sSlo
        lda phi
        adc sPhi
        sta sShi
        bcc ssNrm
        ror sShi                ; a 17-bit sum: fold the carry back in, P follows below
        ror sSlo
        lsr sPhi
        ror sPlo
ssNrm:  lda sShi                ; scale P and sum until the sum is a byte: recip is indexed by it
        beq ssDiv
        lsr sShi
        ror sSlo
        lsr sPhi
        ror sPlo
        jmp ssNrm
ssDiv:  lda sSlo
        beq ssOne               ; degenerate (zero-length wall): leave it alone
        tax
        lda sPlo                ; t = P*256/sum, via one reciprocal multiply
        sta fr
        lda recipLoT,x
        sta mlo
        lda recipHiT,x
        sta mhi
        jsr sideMul
        lda s2
        beq ssT8
        lda #$ff                ; t saturated at 1.0
        jmp ssOff
ssT8:   lda s1
ssOff:  sta mq                  ; offset = (t * width) >> 8, rounded
        lda ssW
        jsr mul8
        lda plo                 ; round to nearest column: truncating biased every seam a
        cmp #$80                ; column low, which reads as the whole wall being off by one
        lda phi
        adc #$00
        clc
        adc spanL
        cmp #${NLOG}
        bcs ssOne               ; off screen; cannot happen, but a stray write would corrupt
        tay                     ; Y = the seam's logical column
        tya
        lsr
        lsr
        tax                     ; cell column
        lda seamT,x
        cmp #${hx(SOLID)}       ; still a plain fill? one seam line per cell
        bne ssOne               ; already spoken for: one line per char code
        tya
        and #$03
        clc
        adc #${hx(SEAM0)}
        sta seamT,x
ssOne:  rts

; u for one marched column (X): where along the wall the ray landed, 8.8 cells.
; A y-face is a wall of constant y, so the coordinate that varies along it is x, and vice
; versa. u = p + d*dir, one sideMul: sideMul(fr, m) returns fr/256 * m, so feeding it |cos|
; (or |sin|) as 0..255 against the parked hit distance gives exactly d*|dir|. The sign comes
; from the same posXT/posYT the DDA used to choose its step. sideMul eats X, hence ssAng.
calcU:  lda remLoT,x
        sta mlo
        lda remHiT,x
        sta mhi
        lda pa
        clc
        adc rayOffT,x
        sta ssAng
        lda sideT,x
        bne cuX
        ldx ssAng
        lda absSinT,x
        sta fr
        jsr sideMul
        ldx ssAng
        lda posYT,x
        bne cuYp
        sec
        lda py
        sbc s1
        sta uwL
        lda py+1
        sbc s2
        sta uwH
        rts
cuYp:   clc
        lda py
        adc s1
        sta uwL
        lda py+1
        adc s2
        sta uwH
        rts
cuX:    ldx ssAng
        lda absCosT,x
        sta fr
        jsr sideMul
        ldx ssAng
        lda posXT,x
        bne cuXp
        sec
        lda px
        sbc s1
        sta uwL
        lda px+1
        sbc s2
        sta uwH
        rts
cuXp:   clc
        lda px
        adc s1
        sta uwL
        lda px+1
        adc s2
        sta uwH
        rts


` : ''}; ================= march one column: cast + store colH/idT =================
marchCol:
${RAYCNT ? '        inc rayN\n' : ''}        jsr castRay
        ldx col
        lda pp
        sta colH,x
        lda side
        sta sideT,x             ; side kept separate (avoids id/side bit collision)
        lda cell                ; castRay already maintains the cell id
        sta idT,x               ; X is still col -- nothing since the store above touches it
        ; --- faceIdT = connected-wall-run id: "same wall" means same contiguous run,
        ;     not merely same plane -> the merge cannot span a hallway gap ---
        tay                     ; Y = cell id (index into run tables)
        lda side
        bne friS1
        lda stpX                ; side0: +x ray hits WEST face, -x hits EAST face
        bmi friE
        lda runWT,y
        jmp friSto
friE:   lda runET,y
        jmp friSto
friS1:  lda stpY                ; side1: +y ray hits NORTH face, -y hits SOUTH face
        bmi friSo
        lda runNT,y
        jmp friSto
friSo:  lda runST,y
friSto: sta faceIdT,x           ; X still col: the run-table branch above only uses A and Y
${SEAMS ? `        lda remL                ; park the raw hit distance; u is derived from it later, and
        sta remLoT,x            ; only for the ~35% of spans that actually cross a boundary
        lda remH
        sta remHiT,x` : ''}
        rts

; ===== interpolate colH linearly across a same-face span [spanL,spanR] (Bresenham) =====
interpSpan:
        lda spanR
        sec
        sbc spanL
        sta dxv                 ; width (>=1)
        cmp #$02
        bcc isDn                ; no interior columns
        ldx spanL
        lda colH,x
        sta hcur                ; h = colH[spanL]
${FLATSPAN ? `        inx
isFl:   sta colH,x
        inx
        cpx spanR
        bcc isFl
        rts
` : ''}
        ldx spanR
        lda colH,x
        sec
        sbc hcur                ; colH[R]-colH[L]
        bcs isPos
        eor #$ff
        clc
        adc #$01
        sta dyv
        lda #$01
        sta syNeg
        jmp isErr
isPos:  sta dyv
        lda #$00
        sta syNeg
        ; The error term overflows 8 bits exactly when dxv + dyv > 255: err stays below dxv
        ; (span width, up to 159) and dyv is the height delta (up to 254), so err+dyv can
        ; reach 413. Dropping that carry made the whole span interpolate garbage -- a
        ; receding near wall stayed far too tall right up to the next marched column.
        ; Test once per span and use the cheap 8-bit loop when it cannot happen, which is
        ; the overwhelming majority of spans.
isErr:  lda dxv
        lsr
        sta errv                ; err = width/2
        lda spanL
        sta col
        ; --- 8-bit fast path ---
        ; This loop sets 92% of all 160 colH values (only ~13 columns are actually marched),
        ; so it is worth spending every register on it: X = col, Y = hcur, A = err, and no
        ; zero-page traffic per column beyond the one colH store. Three details pay for
        ; themselves:
        ;   - ascending and descending are separate loops, so the syNeg test happens once
        ;     per span instead of once per Bresenham step;
        ;   - no clc before "adc dyv": falling through "cpx spanR" already leaves carry
        ;     clear, and so does the branch that ends the subtract loop;
        ;   - no sec before "sbc dxv": the "cmp dxv" that got us there already set carry.
        ; 63% of columns take zero Bresenham steps and 23% take one, so the fixed per-column
        ; cost dominates and that is what these target -- 53 cycles/column down to 38.
        ldy hcur
        lda errv
        ldx syNeg
        bne isD8
        ldx spanL
isA8:   txa                     ; --- ascending, four columns per bounds test ---
        clc
        adc #$04
        cmp spanR
        bcs isA1                ; fewer than four left: rolled tail below
        lda errv                ; the test above needed A; err is where the last body left it
${ispanCol('a1', 'iny')}
${ispanCol('a2', 'iny')}
${ispanCol('a3', 'iny')}
${ispanCol('a4', 'iny', true)}
        jmp isA8
${ispanHi('a1','iny')}
${ispanHi('a2','iny')}
${ispanHi('a3','iny')}
${ispanHi('a4','iny')}
isA1:   lda errv
        inx
        cpx spanR
        bcs isDn
        adc dyv                 ; carry clear: cpx fell through
        bcs isAhi           ; 9th bit: same handling as the unrolled bodies
        cmp dxv
        bcc isAWr
isAsb:  sbc dxv                 ; carry set by the cmp above / by this sbc
        iny
        cmp dxv
        bcs isAsb
isAWr:  sta errv                ; park err: A is needed for the stores
        tya
        sta colH,x
        lda errv
        jmp isA1
isAhi: sec
        sbc dxv
        iny
        bcs isAhi
        cmp dxv
        bcc isAWr
        bcs isAsb           ; always
isD8:   ldx spanL               ; --- descending ---
isDl8:  txa
        clc
        adc #$04
        cmp spanR
        bcs isD1
        lda errv
${ispanCol('d1', 'dey')}
${ispanCol('d2', 'dey')}
${ispanCol('d3', 'dey')}
${ispanCol('d4', 'dey', true)}
        jmp isDl8
${ispanHi('d1','dey')}
${ispanHi('d2','dey')}
${ispanHi('d3','dey')}
${ispanHi('d4','dey')}
isD1:   lda errv
        inx
        cpx spanR
        bcs isDn
        adc dyv
        bcs isDhi           ; 9th bit: same handling as the unrolled bodies
        cmp dxv
        bcc isDWr
isDsb:  sbc dxv
        dey
        cmp dxv
        bcs isDsb
isDWr:  sta errv
        tya
        sta colH,x
        lda errv
        jmp isD1
isDhi: sec
        sbc dxv
        dey
        bcs isDhi
        cmp dxv
        bcc isDWr
        bcs isDsb           ; always
isDn:   rts

; ================= cast one ray (16-bit DDA) =================
castRay:
        ldx col
        ; The coarse angle is gone: the step signs now come from the fine angle's quarter, and
        ; posXT/posYT/absSinT/absCosT are only read by calcU, which builds its own ssAng.
${FINEANG ? `        ; ---- 10-bit ray angle for the DDA deltas ----
        ; Dispatch on the quarter rather than patching four operands: rqH is 0..3, so four load
        ; blocks with the page folded into the absolute address cost ~8 cycles, against ~40 to
        ; self-modify. Only 13.2 rays are cast a frame, so this is ~400 cycles total.
        lda rayOffQS,x          ; signed: sign-extend into the high byte by hand
        bmi faNeg
        clc
        adc paqL
        sta rqL
        lda paqH
        adc #$00
        jmp faHi
faNeg:  clc
        adc paqL
        sta rqL
        lda paqH
        adc #$ff                ; -1 in the high byte
faHi:   and #$03
        sta rqH                 ; which quarter of the circle the FINE angle is in
        tax
        ldy rqL
        cpx #$00                ; NOT a bare BEQ: the LDY above sets Z from rqL, not from the
        beq faP0                ; page, and without this the dispatch branches on the index
        dex
        beq faP1
        dex
        beq faP2
        lda ddxLoTQ+768,y
        sta ddx
        lda ddxHiTQ+768,y
        sta ddxH
        lda ddyLoTQ+768,y
        sta ddy
        lda ddyHiTQ+768,y
        sta ddyH
        jmp faDn
faP0:   lda ddxLoTQ,y
        sta ddx
        lda ddxHiTQ,y
        sta ddxH
        lda ddyLoTQ,y
        sta ddy
        lda ddyHiTQ,y
        sta ddyH
        jmp faDn
faP1:   lda ddxLoTQ+256,y
        sta ddx
        lda ddxHiTQ+256,y
        sta ddxH
        lda ddyLoTQ+256,y
        sta ddy
        lda ddyHiTQ+256,y
        sta ddyH
        jmp faDn
faP2:   lda ddxLoTQ+512,y
        sta ddx
        lda ddxHiTQ+512,y
        sta ddxH
        lda ddyLoTQ+512,y
        sta ddy
        lda ddyHiTQ+512,y
        sta ddyH
faDn:` : `        tax
        lda ddxLoT,x
        sta ddx
        lda ddxHiT,x
        sta ddxH
        lda ddyLoT,x
        sta ddy
        lda ddyHiT,x
        sta ddyH`}
${PROFILE && !PROFILE1 ? '        ldx #3\n        jsr pfTick              ; ray: angle + quarter-angle dispatch\n' : ''}        lda cell0               ; cell = mapY*16 + mapX, stepped by +-1 / +-16 from here on.
        sta cell                ; The value is the player's cell, so it is the same for every
                                ; ray in the frame -- computed once in mloop, not 11 times.
        ; X side dist: m = frac*ddx>>8 ; -x -> sdx=m ; +x -> sdx=ddx-m
        ; (standard form: full cell at frac=0, avoids the fr=256->0 wrap spike)
${DOUBLE === 'sideMulRay' ? `        lda px                  ; DOUBLE=sideMulRay calls the SUBROUTINE below, which reads
        sta fr                  ; fr/mlo/mhi; the inlined copy no longer sets them up
        lda ddx
        sta mlo
        lda ddxH
        sta mhi
` : ''}        ; --- sideMul inlined: a jsr/rts pair here is 12 cy a call, 24 a ray, ~770 a
        ; --- frame. Every other caller still uses the subroutine.
        ; It reads px / ddxH / ddx DIRECTLY rather than copying them into fr / mhi / mlo first.
        ; All six are zero page, so the copies bought nothing and cost 18 cycles an axis --
        ; 36 a ray, ~720 a frame. The names only ever existed as sideMul's argument protocol,
        ; and an inlined body has no protocol to honour.
        lda px                  ; --- high half: fr * mhi -> sdxH:s1 ---
        clc
        adc ddxH
        tax
        bcc cxmh0
        lda f1LoT,x
        tay                     ; the low byte rides in Y instead of zero page: this routine
        lda f1HiT,x             ; never used Y at all, and it is the hottest one here
        sta sdxH
        jmp cxmh1
cxmh0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta sdxH
cxmh1:   lda px
        sec
        sbc ddxH
        bcs cxmh2
        eor #$ff                ; |fr-mhi|; carry is already clear from the borrow
        adc #$01
cxmh2:   tax
        sec
        tya
        sbc f0LoT,x
        sta sdx
        lda sdxH
        sbc f0HiT,x
        sta sdxH
        lda px                  ; --- low half: only the HIGH byte survives the >>8 ---
        clc
        adc ddx
        tax
        bcc cxml0
        lda f1HiT,x
        sta qhi
        jmp cxml1
cxml0:   lda f0HiT,x
        sta qhi
cxml1:   lda px
        sec
        sbc ddx
        bcs cxml2
        eor #$ff
        adc #$01
cxml2:   tax
        ; THE BORROW FROM THE LOW BYTES IS DELIBERATELY NOT COMPUTED. This half only ever
        ; contributed the high byte of fr*ddxL, so the two low-byte loads and the subtract
        ; that produced their borrow existed only to be +/-1 correct in the LAST bit.
        ; Dropping them leaves the product high by 0 or 1 -- the side distance wrong by at
        ; most 1/256 of a cell, one-sided, and NOT accumulated: the DDA adds exact deltas
        ; from here on. On screen: colH = 88/d so dColH ~ 88*(1/256)/d^2, and a wall top is
        ; only VISIBLE below colH 100, i.e. d >= 0.88 cells -- so the worst visible error is
        ; 0.45 of a logical pixel, falling off as the square of distance.
        sec
        lda qhi
        sbc f0HiT,x             ; high byte of fr*ddxL, straight into sdx
        clc
        adc sdx
        sta sdx
        lda sdxH
        adc #$00
        sta sdxH
${DOUBLE === 'sideMulRay' ? '        jsr sideMul\n' : ''}
        ; STEP SIGNS COME FROM THE FINE ANGLE. FINEANG moved the deltas to rq but left these
        ; on the coarse rang, and the two disagree at the axis boundaries -- the ray then steps
        ; the wrong way while using a delta for a slightly different direction. cos >= 0 in
        ; quarters 0 and 3, sin >= 0 in quarters 0 and 1, so rqH decides both, and posXT/posYT
        ; (512 bytes holding two bits) are not needed at all.
        lda rqH
        beq cxpos
        cmp #$03
        beq cxpos
        lda #$ff
        sta stpX
        jmp cydo                ; negative: m IS the side distance, and the inlined
                                ; multiply above now writes it straight into sdx
cxpos:  lda #$01
        sta stpX
        sec                     ; positive: sdx = ddx - m, in place
        lda ddx
        sbc sdx
        sta sdx
        lda ddxH
        sbc sdxH
        sta sdxH
cydo:${DOUBLE === 'sideMulRay' ? `   lda py                  ; see the X axis: only the DOUBLE build needs fr/mlo/mhi
        sta fr
        lda ddy
        sta mlo
        lda ddyH
        sta mhi
` : ''}
        ; --- sideMul inlined; reads py / ddyH / ddy directly, see the X axis above ---
        lda py                  ; --- high half: fr * mhi -> sdyH:s1 ---
        clc
        adc ddyH
        tax
        bcc cymh0
        lda f1LoT,x
        tay                     ; the low byte rides in Y instead of zero page: this routine
        lda f1HiT,x             ; never used Y at all, and it is the hottest one here
        sta sdyH
        jmp cymh1
cymh0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta sdyH
cymh1:   lda py
        sec
        sbc ddyH
        bcs cymh2
        eor #$ff                ; |fr-mhi|; carry is already clear from the borrow
        adc #$01
cymh2:   tax
        sec
        tya
        sbc f0LoT,x
        sta sdy
        lda sdyH
        sbc f0HiT,x
        sta sdyH
        lda py                  ; --- low half: only the HIGH byte survives the >>8 ---
        clc
        adc ddy
        tax
        bcc cyml0
        lda f1HiT,x
        sta qhi
        jmp cyml1
cyml0:   lda f0HiT,x
        sta qhi
cyml1:   lda py
        sec
        sbc ddy
        bcs cyml2
        eor #$ff
        adc #$01
cyml2:   tax
        ; THE BORROW FROM THE LOW BYTES IS DELIBERATELY NOT COMPUTED. This half only ever
        ; contributed the high byte of fr*ddyL, so the two low-byte loads and the subtract
        ; that produced their borrow existed only to be +/-1 correct in the LAST bit.
        ; Dropping them leaves the product high by 0 or 1 -- the side distance wrong by at
        ; most 1/256 of a cell, one-sided, and NOT accumulated: the DDA adds exact deltas
        ; from here on. On screen: colH = 88/d so dColH ~ 88*(1/256)/d^2, and a wall top is
        ; only VISIBLE below colH 100, i.e. d >= 0.88 cells -- so the worst visible error is
        ; 0.45 of a logical pixel, falling off as the square of distance.
        sec
        lda qhi
        sbc f0HiT,x             ; high byte of fr*ddyL, straight into sdy
        clc
        adc sdy
        sta sdy
        lda sdyH
        adc #$00
        sta sdyH
${DOUBLE === 'sideMulRay' ? '        jsr sideMul\n' : ''}
        lda rqH                 ; sin >= 0 in quarters 0 and 1
        cmp #$02
        bcc cypos
        lda #$ff
        sta stpY
        lda #$f0                ; -16: one cell row back
        sta stpY16
        jmp cySat               ; negative: m IS the side distance, so there is nothing to
                                ; subtract -- but the saturation below still has to run
cypos:  lda #$01
        sta stpY
        lda #$10                ; +16: one cell row on
        sta stpY16
        sec                     ; positive: sdy = ddy - m, in place
        lda ddy
        sbc sdy
        sta sdy
        lda ddyH
        sbc sdyH
        sta sdyH
cySat:
        ; Two things the old loop did on EVERY step that are only needed once, on the step
        ; that hits: it wrote "side" (5 cycles a step, read once after the loop), and it
        ; round-tripped the cell index through memory -- "lda cell / adc / sta cell",
        ; then "ldx cell" to index mapT. The index lives in X for the whole march now,
        ; and each direction has its own tail, so "side" is a constant on the hit path
        ; and the "which side did we come from" test after the loop goes away too.
        ;
        ; No bounds check: the map border is solid on all four sides (asserted at build
        ; time), so a ray always hits a wall before it can step outside the grid. That also
        ; makes the +-1 cell stepping safe -- mapX never runs off the end of a row.
        ; An axis-aligned ray never crosses a grid line on that axis, and the delta table
        ; says so by saturating to $ffff. The FIRST side distance did not: it is the
        ; fraction of a cell to the next line multiplied by that delta, and a small enough
        ; fraction pulls the product right back down into range -- at y=4.992 the fraction
        ; is 1/128 and $ffff becomes 512, two cells. The DDA then took a step it should
        ; never take, hit the wrong wall, and drew a column of the wrong height straight
        ; through the scene. Saturate the product too, on both axes.
        ;
        ; AND BOTH DIRECTIONS MUST REACH IT. The -y branch used to "jmp cydone" straight past this
        ; check, so the guard only ever ran when stepping +y. Stepping -y gives sdy = ddy * frac,
        ; which collapses the same way when frac is small -- rarer than the +y case the comment
        ; above describes, but the same bug, and it was an asymmetry rather than a reason.
        lda ddxH
        and ddx
        cmp #$ff
        bne cySx
        sta sdx
        sta sdxH
cySx:   lda ddyH
        and ddy
        cmp #$ff
        bne cydone
        sta sdy
        sta sdyH
cydone:${PROFILE && !PROFILE1 ? '\n        ldx #10\n        jsr pfTick              ; ray: initial side distances (AFTER the label --\n                                ; jmp/bne cydone would otherwise skip the tick)' : ''}
        ldy #24
        ldx cell
cdda:   lda sdxH
        cmp sdyH
        bcc cstepX
        bne cstepY
        lda sdx
        cmp sdy
        bcc cstepX
        beq cstepX
        ; Saturate, do not wrap. deltaDist is clamped at $ffff for a ray running parallel to
        ; an axis, so a side distance that is already large overflows 16 bits on the next
        ; add and comes back round as a SMALL number -- the DDA then thinks the crossing is
        ; a cell away and keeps stepping that way forever. It needs the player within 1/256
        ; of a cell boundary and a ray parallel to it, which is why it stayed hidden: a
        ; whole wall vanished and an unrelated one filled the column.
cstepY: clc
        lda sdy
        adc ddy
        sta sdy
        lda sdyH
        adc ddyH
        sta sdyH
        bcc cyNs
        lda #$ff                ; this axis is effectively never crossed again
        sta sdy
        sta sdyH
cyNs:   txa
        clc
        adc stpY16
        tax
        lda mapT,x
        bne cwallY
        dey
        bne cdda
        jmp cfar
cstepX: clc
        lda sdx
        adc ddx
        sta sdx
        lda sdxH
        adc ddxH
        sta sdxH
        bcc cxNs
        lda #$ff
        sta sdx
        sta sdxH
cxNs:   txa
        clc
        adc stpX
        tax
        lda mapT,x
        bne cwallX
        dey
        bne cdda
cfar:   stx cell                ; step guard expired; unreachable with a solid border
        lda #$01
        sta pp
        rts
cwallX: stx cell                ; marchCol reads the cell back for the run-id lookup
        lda #$00
        sta side
        sec
        lda sdx
        sbc ddx
        sta remL
        lda sdxH
        sbc ddxH
        sta remH
        jmp cidx
cwallY: stx cell
        lda #$01
        sta side
        sec
        lda sdy
        sbc ddy
        sta remL
        lda sdyH
        sbc ddyH
        sta remH
        ; No cos correction here: it depends only on the column, so it is baked into the
        ; per-column height tables (see hTabT). This used to be a whole sideMul per ray.
cidx:${PROFILE && !PROFILE1 ? '\n        ldx #11\n        jsr pfTick              ; ray: the DDA loop (after the label: jmp cidx skips it)' : ''}
        lda remH
        cmp #24
        bcc cidxok
        lda #$01                ; past the map diagonal -> tiny far wall
        sta pp
        rts
        ; index = perpDist>>3 = remH*32 + (remL>>3)  (0..767), 1/32-cell steps
cidxok: lda remL
        lsr
        lsr
        lsr
        sta tmp                 ; remL>>3 (0..31)
        ldx remH                ; remH*32 was five rounds of "asl zp / rol zp" -- 50 cycles
        clc                     ; to multiply a value the cmp above just bounded under 24.
        lda m32LoT,x
        adc tmp
        sta ppLo
        lda m32HiT,x
        adc #$00
        sta ppHi                ; 0..2: which page inside this column's group
        ldx col
        lda colGrpT,x           ; group base, already scaled to pages
        clc
        adc ppHi
        adc #>hTabT
        sta hp+1
        lda #$00
        sta hp
        ldy ppLo
        lda (hp),y
        sta pp
        rts

; sideMul: fr(8) * (mhi:mlo)(16) >>8 -> s2:s1
; Quarter-square multiply (a*b = f[a+b] - f[|a-b|], f[n] = n^2/4) inlined twice. It used to
; be two jsr's to a shared mul8 with the operands shuffled through qa/qb; at two calls per
; ray and ~60 cycles each, that plumbing was most of the routine's overhead.
sideMul:
        lda fr                  ; --- high half: fr * mhi -> s2:s1 ---
        clc
        adc mhi
        tax
        bcc smh0
        lda f1LoT,x
        tay                     ; the low byte rides in Y instead of zero page: this routine
        lda f1HiT,x             ; never used Y at all, and it is the hottest one here
        sta s2
        jmp smh1
smh0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta s2
smh1:   lda fr
        sec
        sbc mhi
        bcs smh2
        eor #$ff                ; |fr-mhi|; carry is already clear from the borrow
        adc #$01
smh2:   tax
        sec
        tya
        sbc f0LoT,x
        sta s1
        lda s2
        sbc f0HiT,x
        sta s2
        lda fr                  ; --- low half: only the HIGH byte survives the >>8 ---
        clc
        adc mlo
        tax
        bcc sml0
        lda f1LoT,x
        tay
        lda f1HiT,x
        sta qhi
        jmp sml1
sml0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta qhi
sml1:   lda fr
        sec
        sbc mlo
        bcs sml2
        eor #$ff
        adc #$01
sml2:   tax
        sec
        tya
        sbc f0LoT,x             ; result discarded -- only the borrow into the high byte
        lda qhi                 ; matters, so the old "sta qlo" here was writing a dead value
        sbc f0HiT,x             ; A = high byte of fr*mlo, so it can go straight into s1
        clc
        adc s1
        sta s1
        lda s2
        adc #$00
        sta s2
        rts

; ---- raster IRQ: count video frames ----
; Two raster IRQs per frame implement the mirror trick. Charset B is charset A with every
; glyph's 8 bytes reversed, so below the split the SAME char code renders upside down --
; which is exactly the vertical symmetry of the scene. renderSym therefore writes one
; identical byte to a row and its mirror and needs no flip table at all.
;
; The split is at logical row 100 (the horizon), which is the MIDDLE of char row 12. That
; is legal and in fact required: the VIC re-fetches character-generator data every raster
; line from the current CB bits, so row 12 draws its top 4 lines from A and its bottom 4
; from B -- self-mirroring, exactly what the horizon row needs.
;
; $d018 also carries the video-matrix nibble, which the main loop flips per frame for
; double buffering, so the handler ORs the charset bits onto the live value in d018vm
; rather than writing a constant.
; The CPU stacks only PC and P, so the registers are this routine's job now. The KERNAL used
; to push A/X/Y before jmp ($0314), which is why the tail below pulls three bytes -- that tail
; was always here, and without these four pushes it would return with the stack out of step.
irq:    pha
        txa
        pha
        tya
        pha
        lda $d019
        and #$01
        beq irqd                ; not a raster IRQ
        lda $d012
        cmp #${hx(SPLITLINE)}
        bcs irqSplit
        ; --- top of frame: select charset A, arm the split ---
        lda d018vm
        ora #${hx(CB_A)}
        sta $d018
        lda #${hx(SPLITLINE)}
        sta $d012
        inc frameCnt
        bne irqd
        inc frameCnt+1
        jmp irqd
irqSplit:
        lda d018vm              ; --- horizon: select mirrored charset B ---
        ora #${hx(CB_B)}
        sta $d018
        lda #$00
        sta $d012
irqd:   lda #$ff
        sta $d019
        pla
        tay
        pla
        tax
        pla
        rti

; ---- nmi: swallow RESTORE ----
; The only NMI source here is the RESTORE key. With the KERNAL banked out there is no handler
; behind it, so this exists purely to make that keypress harmless. $dd0d is read to clear the
; CIA2 latch in case an NMI ever arrives from there instead.
nmi:    pha
        lda $dd0d
        pla
        rti

; ---- fps = 960 / (frames per 16 renders) ----
computeFps:
        sec
        lda frameCnt
        sbc lastFrame
        sta deltaL
        lda frameCnt+1
        sbc lastFrame+1
        sta deltaH
        lda frameCnt
        sta lastFrame
        lda frameCnt+1
        sta lastFrame+1
        lda deltaL
        ora deltaH
        bne cf1
        rts
cf1:    lda #$c0
        sta dpx
        lda #$03
        sta dpy                 ; dividend 960
        lda #$00
        sta fpsv
cfdiv:  sec
        lda dpx
        sbc deltaL
        tax
        lda dpy
        sbc deltaH
        bcc cfdd
        stx dpx
        sta dpy
        inc fpsv
        jmp cfdiv
cfdd:   ldx #$00
        lda fpsv
cft:    cmp #10
        bcc cfo
        sec
        sbc #10
        inx
        jmp cft
cfo:    sta fpsOnes
        stx fpsTens
        rts

; ---- readout: fps top-left, X/Y/A top-right ----
; The overlay no longer plots pixels. In the 4x8 scheme a char code is an INDEX into the
; cell-pattern set, not a bitmap, so there is nothing to OR bits into -- instead the last
; 18 codes are literal digit glyphs and the readout just pokes them into screen RAM. That
; also removes the whole class of bug where the overlay reached into renderer tables.
setRow:                         ; A = char row -> ppPtr
        tax
        lda rowLoT,x
        sta ppPtr
        lda rowHiT,x
        clc
        adc baseHi
        sta ppPtr+1
        rts

drawFps:
        lda #$00
        jsr setRow
        ldy #$00
        lda fpsTens
        clc
        adc #${hx(GLYPH0)}
        sta (ppPtr),y
        iny
        lda fpsOnes
        clc
        adc #${hx(GLYPH0)}
        sta (ppPtr),y
        rts

; X/Y as cell.frac hex (1 nibble cell + 2 nibbles fraction of the 8.8 fixed point),
; A = the raw angle byte. Screenshot it to get an exactly reproducible viewpoint.
drawDbg:
${NOHUD ? '        jmp ddAng               ; angle only: SPIN measurement still needs it' : ''}
        lda #$00
        jsr setRow
        ldy #36
        lda #16                 ; 'X'
        jsr ddPut
        lda px+1
        and #$0f
        jsr ddPut
        lda px
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda px
        and #$0f
        jsr ddPut
        lda #$01
        jsr setRow
        ldy #36
        lda #17                 ; 'Y'
        jsr ddPut
        lda py+1
        and #$0f
        jsr ddPut
        lda py
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda py
        and #$0f
        jsr ddPut
${RAYCNT ? `        ; Accumulate rayN over exactly 256 frames; the high byte of the total IS the mean.
        ; A single frame's count is meaningless under motion, and motion is the only condition
        ; that exercises the prediction at all.
        lda rayAcc
        clc
        adc rayN
        sta rayAcc
        bcc rcNc
        inc rayAcc+1
rcNc:   lda chnAcc
        clc
        adc chnN
        sta chnAcc
        bcc rcNf
        inc chnAcc+1
rcNf:   lda edgAcc
        clc
        adc edgN
        sta edgAcc
        bcc rcNe
        inc edgAcc+1
rcNe:   inc rayFrm
        bne rcNd
        lda rayAcc+1
        sta rayMean
        lda edgAcc+1
        sta edgMean
        lda chnAcc+1
        sta chnMean
        lda #$00
        sta rayAcc
        sta rayAcc+1
        sta edgAcc
        sta edgAcc+1
        sta chnAcc
        sta chnAcc+1
rcNd:   lda #$03
        jsr setRow
        ldy #37
        lda #14                 ; 'E' -- MEAN rays/frame over the last 256 frames, hex
        jsr ddPut
        lda rayMean
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda rayMean
        and #$0f
        jsr ddPut
${PIVOT ? `        lda #$04                ; row 4: how many hints pivPrep had to work with. If this is
        jsr setRow              ; 0 every frame the prediction is not running at all, which
        ldy #38                 ; no amount of staring at the ray count would reveal.
        lda pvNdbg
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda pvNdbg
        and #$0f
        jsr ddPut
` : ''}        lda #$05                ; row 5: MEAN edge cells a frame -- rows the run cache
        jsr setRow              ; cannot skip, each one a full ramp/step selection
        ldy #38
        lda edgMean
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda edgMean
        and #$0f
        jsr ddPut
        lda #$06                ; row 6: MEAN chain draws a frame, of 80. The run cache's miss
        jsr setRow              ; rate -- the direct read on whether the RLE is doing its job
        ldy #38
        lda chnMean
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda chnMean
        and #$0f
        jsr ddPut
` : ''}ddAng:  lda #$02
        jsr setRow
        ldy #37
        lda #10                 ; 'A'
        jsr ddPut
        lda pa
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda pa
        and #$0f
        jsr ddPut
        rts
ddPut:  clc
        adc #${hx(GLYPH0)}
        sta (ppPtr),y
        iny
        rts

; ================= data =================
cosCorrT: !byte ${cosCorr.join(',')}
moveXT: ${chunk(moveX).trim()}
moveYT: ${chunk(moveY).trim()}
rowLoT: !byte ${rowLo.join(',')}
rowHiT: !byte ${rowHi.join(',')}
kTabT:  !byte ${kTab.join(',')}
col4T:  !byte ${[...Array(40)].map((_, i) => i * 4).join(',')}
qmColT: !byte 0,${[1,2,3].map(qmCol).join(',')}   ; middle-sample column, indexed by kpos
${PLAN === 2 ? `; Colour RAM row bases. $d800 is fixed -- colour RAM is NOT double buffered -- so unlike
; rowLoT/rowHiT these need no per-buffer offset.
ccLoT:  !byte ${[...Array(25)].map((_, r) => (0xd800 + r * 40) & 255).join(',')}
ccHiT:  !byte ${[...Array(25)].map((_, r) => (0xd800 + r * 40) >> 8).join(',')}
; Per-bucket threshold on m = w1 + w2. A bucket whose pair collapsed to a single glyph gets 0,
; which compares true for every m and so always picks the fuller half -- the same answer the
; single-glyph plan would have given.
rampThrT: !byte ${[...Array(256)].map((_, i) => rampThrN(i)).join(',')}
stepThrT1: !byte ${[...Array(SLOTN)].map((_, i) => stepThrN(0, i)).join(',')}
stepThrT2: !byte ${[...Array(SLOTN)].map((_, i) => stepThrN(1, i)).join(',')}
stepThrT3: !byte ${[...Array(SLOTN)].map((_, i) => stepThrN(2, i)).join(',')}
` : ''}
m32LoT: !byte ${[...Array(24)].map((_, i) => (i * 32) & 255).join(',')}
m32HiT: !byte ${[...Array(24)].map((_, i) => (i * 32) >> 8).join(',')}
blkLoT: !byte ${blkEnt('<')}
blkHiT: !byte ${blkEnt('>')}
sldLoT: !byte ${sldEnt('<')}
sldHiT: !byte ${sldEnt('>')}
edgLoT: !byte ${edgEnt('<')}
edgHiT: !byte ${edgEnt('>')}
t1TabT: !byte ${t1Tab.join(',')}
tbTabT: !byte ${tbTab.join(',')}
${SPRITES ? `
; ==================== orbs: projection and placement ====================
; Ported from ddfa4bc^ (the pass deleted at ddfa4bc) with three changes for the current map:
;   - the sprite pointers live in the last eight bytes of SCREEN memory, which is bank 3 now;
;   - the scratch moved off $cbxx -- bank 3 is graphics-only -- to the array hole's last page;
;   - orbPaint and orbSeam are NOT ported, so nothing here decides occlusion.

; ---- orbMove: place every visible orb ----
; Once a frame. Written for clarity over cycles and keeping its working set in absolute RAM
; where it can, since 50-odd absolute accesses cost 50 cycles and buy back the whole seam
; scratch. The hot half lives in that scratch, which is dead by the time this runs.
;
; Camera space: forward = dx*cos(pa) + dy*sin(pa), right = dy*cos(pa) - dx*sin(pa). "right" is
; the direction of INCREASING column, which is d/dpa of the ray direction = (-sin, cos). Map y
; runs downward, matching the DDA, so no handedness fixup is needed anywhere here.
;
; The candidate list for the player's cell is pre-sorted by distance, so the first eight orbs
; that project are the NEAREST eight and assigning them to sprites in order also gets the
; overlap priority right -- sprite 0 draws over sprite 1.
orbMove:
        ; ---- nothing moved? then nothing projects differently ----
        ; Six orbs on screen is about 18,700 cycles, and standing still it is 18,700 cycles
        ; spent arriving at last frame's answer. The sprite registers already hold it. All that
        ; has to be repeated is the repointing of far cells to SOLID's twin, because renderSym
        ; rewrites the screen every frame and puts plain SOLID back.
        jmp obMoved             ; DEADCODE-OK: the still-frame short-circuit is off until the
                                ; occlusion stamping lands -- see the comment above it.
        lda px
        cmp opx
        bne obMoved
        lda px+1
        cmp opx+1
        bne obMoved
        lda py
        cmp opy
        bne obMoved
        lda py+1
        cmp opy+1
        bne obMoved
        lda pa
        cmp opa
        bne obMoved
        rts                     ; a still frame. The slot data from the last one still stands
                                ; and orbPaint runs unconditionally, so the walls come out
                                ; painted the same way without reprojecting anything.
obMoved:lda px
        sta opx
        lda px+1
        sta opx+1
        lda py
        sta opy
        lda py+1
        sta opy+1
        lda pa
        sta opa
        ldx pa                  ; |cos| and |sin| are already tabulated for the DDA
        lda absCosT,x
        sta ocos
        lda absSinT,x
        sta osin
        lda #$00                ; sin(a) < 0 exactly when bit 7 of a is set, and cos(a) < 0
        sta osinS               ; when bit 7 of a+64 is -- no sign tables needed
        lda pa
        bpl oss
        lda #$ff
        sta osinS
oss:    lda #$00
        sta ocosS
        lda pa
        clc
        adc #$40
        bpl ocs
        lda #$ff
        sta ocosS
ocs:    ; ---- the half of every product that all orbs share ----
        ; dx = (orbCell - playerCell) + (0.5 - playerFraction). The right-hand term is the same
        ; for every orb, so (that * cos) and (that * sin) are frame constants. Folding them into
        ; one addend per axis pair leaves the per-orb work as four 8x8 multiplies.
        ; 0.5 - playerFraction, as a signed byte. The range is -127..+128 and +128 does not
        ; fit -- it reads as -128, flipping the sign of every term derived from it. That
        ; happens for exactly one value, a fraction of zero, which is the player sitting
        ; precisely on a cell boundary: the orbs lurch for a single frame while crossing and
        ; snap back once past. Clamp to +127; the 1/256 of a cell it costs is invisible.
        sec
        lda #$80
        sbc px
        cmp #$80
        bne ofxOk
        lda #$7f
ofxOk:  sta ofx
        sec
        lda #$80
        sbc py
        cmp #$80
        bne ofyOk
        lda #$7f
ofyOk:  sta ofy
        lda ofx
        ldx ocos
        ldy ocosS
        jsr oFrac
        sta kxc
        lda ofx
        ldx osin
        ldy osinS
        jsr oFrac
        sta kxs
        lda ofy
        ldx ocos
        ldy ocosS
        jsr oFrac
        sta kyc
        lda ofy
        ldx osin
        ldy osinS
        jsr oFrac
        sta kys
        ; forward picks up kxc + kys, right picks up kyc - kxs. Both are sums of SIGNED
        ; bytes and both need a real 16-bit add: sign-extend each operand into its own high
        ; byte and let adc/sbc carry between them. Sign-extending and then discarding the
        ; carry -- which is what this did -- is wrong by 256 whenever the low bytes carry,
        ; and since these terms come from the player's sub-cell position the error moves as
        ; you walk. It reads as the orbs drifting off the map.
        lda kxc
        jsr kSgn
        sta tmp
        lda kys
        jsr kSgn
        sta tmp2
        clc
        lda kxc
        adc kys
        sta kfL
        lda tmp
        adc tmp2
        sta kfH
        lda kyc
        jsr kSgn
        sta tmp
        lda kxs
        jsr kSgn
        sta tmp2
        sec
        lda kyc
        sbc kxs
        sta krL
        lda tmp
        sbc tmp2
        sta krH
        lda #$00                ; the per-sprite bit registers are built up a bit at a time and
        sta omEn                ; written once, so an unused slot is simply never set
        sta omXX
        sta omYY
        sta omPri
        sta omX8
        sta onv
${process.env.ORBOCCDBG ? `        sta ohDbg
` : ''}        lda py+1                ; which cell is the player standing in?
        asl
        asl
        asl
        asl
        clc
        adc px+1
        tax
        lda candCntT,x
        beq obEnd
        sta ocn
        asl                     ; three bytes per record
        clc
        adc ocn
        sta ocn3
${DBGORB ? '        lda #$01\n' : ''}        lda candLoT,x
        sta ocptr
        lda candHiT,x
        sta ocptr+1
        lda #$00
        sta ocy
        
obLoop: ldy ocy
        lda (ocptr),y
        sta oidx
        iny
        lda pa                  ; is the orb anywhere near the way we are facing? The list is
        sec                     ; all-round, the view is 66 degrees, and a full projection
        sbc (ocptr),y           ; costs a hundred times what this compare does
        bpl obPos
        eor #$ff
        clc
        adc #$01
obPos:  iny
        sta tmp                 ; how far off the bearing we are
        lda (ocptr),y
        sta ocanO               ; bit 7: can ANY run reachable from this cell occlude this orb?
                                ; blockers() answered that at build time and it was being
                                ; thrown away here, so every projected orb paid for the full
                                ; per-cell mask even when the answer was always no
        and #$7f
        cmp tmp
        bcc obNext              ; outside the window: not on screen
        jsr orbOne
obNext: lda ocy
        clc
        adc #$03
        sta ocy
        lda onv
        cmp #$08                ; eight hardware sprites, and the list is nearest-first
        bcs obEnd
        lda ocy
        cmp ocn3
        bcc obLoop
obEnd:  ${DBGORB ? `lda osI
        sta odb                 ; the loop counter and its bound, against what set the bound
        lda osN
        sta odb+1
        lda onv
        sta odb+2
        lda obOcc
        sta odb+3               ; slot 0's gate byte
        lda obV
        sta odb+4               ; slot 0's variant, which indexes orbBlankT/orbAnchT
        lda obY
        sta odb+5
        ldx #$00
        ldy #$00
odbLp:  lda odb,x
        lsr
        lsr
        lsr
        lsr
        clc
        adc #${hx(GLYPH0)}
        sta ${hx16(SCR_A + 0x78)},y
        sta ${hx16(SCR_B + 0x78)},y
        iny
        lda odb,x
        and #$0f
        clc
        adc #${hx(GLYPH0)}
        sta ${hx16(SCR_A + 0x78)},y
        sta ${hx16(SCR_B + 0x78)},y
        iny
        inx
        cpx #$06
        bne odbLp
        ` : ''}rts

; ---- osFlush: hand the frame's sprite state to the VIC, in the border ----
; Everything above only fills buffers. Writing $d000/$d001, a sprite pointer or a colour while
; the raster is inside the visible area lets the VIC fetch half of one frame's sprite and half
; of the next -- a sheared orb, or one that pops to somewhere else for a single frame. Called
; after the raster wait and the buffer flip, when the beam is past line 250 and no sprite is
; being fetched. Costs about 30 cycles per visible orb, which is nothing next to the ~2400 it
; took to work out where the orb goes.
; ---- orbStamp: paint foreground black where a wall should clip an orb ----
; Runs AFTER renderSym, because it overwrites cells renderSym has just drawn. The seven occluder
; glyphs are the same black as the wall and differ only in bit pair, so a stamped cell is
; invisible as colour and clips exactly.
;
; Per orb, only where the build already said occlusion is possible (obOcc bit 7, false for 56% of
; candidates). Walk the spans overlapping the orb's box exactly as orbOne does; every span whose
; run occludes this orb gets its intersection with the box stamped.
;
; Two things follow from stamping at all, and both are handled here rather than anywhere else:
;   - the orb's PRIORITY bit has to be set, or foreground means nothing to it. Set per orb, not
;     globally: an orb with nothing occluding it keeps priority 0, which is why seams cannot bite
;     it and why it needs no de-seam sweep.
;   - once its bit is set, SEAMS clip it too -- they are bit pair 10, the only other foreground
;     in the charset. So every seam inside the orb's box becomes plain black. Its whole box, not
;     just the occluded part: a near wall's seam would otherwise bite an orb that a DIFFERENT
;     wall is occluding at the edge.
orbStamp:
${DBGORB ? `        lda #$00
        sta oSCnt
        sta oSOrb
        sta oSSpn
` : ''}        lda onv
        beq oSDn
        sta osN                 ; the slot count, taken BEFORE anything else touches A. The buffer
        lda #$00                ;   selection below leaves the cache base in A, and with this store
        sta osI                 ;   after it, osN got #<cbA / #<cbB -- 80 or 120 -- so the loop
                                ;   walked a hundred slots of an eight-slot array and stamped
                                ;   garbage. It alternated with the buffer, which is exactly why
                                ;   only ever one buffer looked wrong.
        ; Which buffer's run cache to invalidate. renderSym patches operands rather than indexing
        ; per column; do the same, once per frame. cbA/cbB hold the solid-run START this buffer
        ; already shows, and $ff is the sentinel it treats as "always redraw" -- a value rs cannot
        ; take, already used for seam columns. A stamped cell is invisible to that cache, so
        ; without this the column is skipped next time this buffer comes round and the black block
        ; STAYS: a trail behind every moving orb.
        lda baseHi
        cmp #$e0
        bne oSCbB
        lda #<cbA
        jmp oSCbS
oSCbB:  lda #<cbB
oSCbS:  sta oSInv+1
        sta oSDIn+1
oSLoop: ldx osI
${ORBGATE ? `        lda obOcc,x
        bpl oSNext              ; nothing reachable from this cell can occlude this orb
` : ''}
${DBGORB ? `        inc oSOrb
` : ''}        lda obIX,x
        tay
        lda orbOccLoT,y
        sta omptr
        lda orbOccHiT,y
        sta omptr+1
        ; char rows the orb's CONTENT covers. obY is the sprite's $d001; the content is bottom
        ; aligned in the frame, so it ends at obY + anchor - 1 and starts orbBlankT rows in.
        ; Display y is raster - 50, and a char row is eight of those.
        ldy obV,x
        ; Display y is raster - 50, and a char row is eight of those. SUBTRACT THE 50 FIRST: obY
        ; is 150 - anchor + h, so obY + anchor is 150 + h, which passes 255 once h > 105 and wraps.
        ; The bottom row then came out tiny, the stamp ran from a bogus row, and black cells landed
        ; on the white CEILING -- long vertical bars, with the de-seam stripping seams nowhere near
        ; the orb. One overflow, both symptoms.
        lda obY,x
        sec
        sbc #$32
        sta ohSv                ; display y of the sprite frame's top row
        clc
        adc orbBlankT,y         ; ... plus the blank rows above the content
        lsr
        lsr
        lsr
        sta osRow
        lda ohSv
        clc
        adc orbAnchT,y
        sec
        sbc #$01                ; the last inked row
        lsr
        lsr
        lsr
        cmp #$19
        bcc oSRok
        lda #$18                ; clamp to the last screen row: a near orb's box runs off the
                                ; bottom, and the rows below 24 are not screen memory at all
oSRok:  sta osRowB
        ; The TOP row is CHECKED, not clamped. Clamping it to 24 turned "this orb's box starts
        ; below the screen" into "stamp row 24" -- a bar of foreground black along the bottom of
        ; the floor, appearing as soon as you walk close to anything, since a near orb's box runs
        ; off the bottom. An orb that starts past the last row has nothing on screen at all.
        lda osRow
        cmp #$19
        bcs oSNone
        cmp osRowB
        beq oSRok2
        bcc oSRok2
oSNone: jmp oSDone              ; nothing of this orb is on screen
oSRok2:
        ; walk the spans, exactly as the whole-orb test does
        lda #$00
        sta ohL
        sta ohBX
oSSpan: ${DBGORB ? `inc oSSpn
        ` : ''}ldx ohBX
        cpx nbnd
        bcc oSSB
        lda #${hx(NLOG - 1)}
        jmp oSSR
oSSB:   lda bndT,x
        sec
        sbc #$01
oSSR:   sta ohRun               ; borrow: this span's right edge
        ldx osI
        cmp obL,x
        bcc oSAdv               ; span ends before the orb begins
        lda ohL
        cmp obR,x
        beq oSChk
        bcs oSDone              ; span begins past the orb: nothing left to stamp
oSChk:  ldx ohL
        ldy faceIdT,x
        beq oSAdv               ; no run in this span, so it cannot occlude
        sty ohSv
        lda runByteT,y
        tay
        lda (omptr),y
        ldy ohSv
        and runBitT,y
        beq oSAdv               ; this run does not occlude this orb
        ; it does: stamp [max(spanL, obL) .. min(spanR, obR)] -- but the two ends are NOT alike.
        ;
        ; One end comes from the WALL's edge and the other from the ORB's box. Only the wall edge
        ; needs precision: that is where the wall stops and the orb should start showing. At the
        ; orb's own edge there is no orb beyond to clip and the wall carries on regardless, so a
        ; split there buys nothing -- it just spends a partial glyph saying something invisible.
        ; Round that end OUT to the cell boundary instead.
        ;
        ; And it makes every band exactly expressible. The splits are "n columns from one side",
        ; so a band needs at most ONE non-aligned end; with the orb's edge snapped to a boundary
        ; the only ragged end left is the wall's, which is precisely what they are for. The
        ; middle-band case -- both ends interior to one cell, which no glyph can say -- cannot
        ; arise any more.
        ldx osI
        lda ohL
        cmp obL,x
        bcs oSL1                ; the WALL's edge wins: keep it exact
        lda obL,x
        and #$fc                ; the ORB's edge wins: round out to the start of its cell
oSL1:   sta osL
        lda ohRun
        cmp obR,x
        bcc oSR1                ; the WALL's edge wins
        lda obR,x
        ora #$03                ; the ORB's edge: round out to the end of its cell
oSR1:   sta osR
        lda osL
        cmp osR
        beq oSCall
        bcs oSAdv               ; inverted intersection: nothing to stamp for this span
oSCall: jsr oSCells
oSAdv:  ldx ohBX
        cpx nbnd
        bcs oSDone
        lda bndT,x
        sta ohL
        inc ohBX
        jmp oSSpan
oSDone: lda omPri            ; was anything stamped for this orb? then its seams must go
        ldx osI
        and orbBitT,x
        beq oSDsk
${ORBDESEAM ? `        jsr oSDeseam` : `        nop                      ; ORBDESEAM=0`}
oSDsk:  inc osI
        lda osI
        cmp osN
        bcs oSDn
        jmp oSLoop
oSNext: inc osI
        lda osI
        cmp osN
        bcc oSLoop
oSDn:   rts

; oSCells: fill cells [osL>>2 .. osR>>2] x rows [osRow .. osRowB] with the whole-cell occluder,
; and set this orb's priority bit. Whole cells only for now: the edge splits are the next step,
; so occlusion currently quantises to a 4-column cell (8 screen pixels).
oSCells:${ORBNOCELL ? `rts
` : ''}        lda osL
        and #$03
        tay
        lda occRT,y
        sta ohFst               ; the glyph for the cell the stamp starts in, on black ...
        lda occRTW,y
        sta ohFstW              ; ... and the same shape on white
        lda kMskT,y
        sta ohFstM              ; ... and which of the cell's columns this split leaves showing
        lda osR
        and #$03
        tay
        lda occLT,y
        sta ohLst               ; ditto for the cell it ends in
        lda occLTW,y
        sta ohLstW
        lda mMskT,y
        sta ohLstM
${process.env.ORBFGDBG ? `        lda osRow
        and #$0f
        sta $d020               ; PROBE: the row oSCells is about to stamp from
` : ''}        ldx osI
        lda orbBitT,x
        ora omPri
        sta omPri               ; this orb is now BEHIND foreground
        lda osRow
        sta ohSv
oSCRow: lda ohSv
        cmp osRowB
        beq oSCR1
        bcs oSCDn
oSCR1:  cmp #$19
        bcs oSCDn               ; rowLoT/rowHiT hold 25 entries. Indexing past them gives a
                                ; garbage high byte, osPtr then points ANYWHERE, and the store
                                ; below writes wherever that lands -- including over osI and osN,
                                ; the loop's own counters. That is how one bad row became a
                                ; runaway loop writing across the machine.
        tay
        lda rowLoT,y
        sta osPtr
        lda rowHiT,y
        clc
        adc baseHi
        sta osPtr+1
        lda osL
        lsr
        lsr
        tay                     ; first cell
        cpy #$28
        bcs oSCDn               ; and a cell index has to be a real column, 0..39
        lda osR
        lsr
        lsr
        cmp #$28
        bcc oSCR2
        lda #$27
oSCR2:  sta ohRun               ; last cell
        cpy ohRun
        bcc oSCMid
        bne oSCNx               ; first cell past last: an inverted range, nothing to stamp
        ; ---- the whole stamp lies inside ONE cell ----
        ; Columns k..m of it clip, and no single glyph says that unless k is 0 or m is 3. Take the
        ; "from the right" one, which clips k..3, over-covering to the right by up to 3 columns.
        ; Over-covering takes a small bite out of the orb; under-covering leaves orb drawn ON the
        ; wall, which is the error that reads as broken -- so this errs the safe way.
        lda ohFstM
        jsr oSBack              ; single-cell stamp: pick the backing, do not skip
        lda ohFst
        bcs oSC1s
        lda ohFstW
oSC1s:  sta (osPtr),y
        jmp oSCNx
        ; ---- only stamp cells that actually HOLD WALL ----
        ; The stamp covers the ORB's rows, on the assumption that a wall which occludes an orb
        ; extends below its feet. Where that does not hold -- a receding wall whose base has risen
        ; above the orb's bottom -- it painted foreground black onto the FLOOR, below the orb,
        ; where there is nothing to occlude with.
        ;
        ; renderSym has just drawn the scene, so the cell itself is the answer, with no depth or
        ; height arithmetic anywhere. And the test is the user's own rule: occlusion is vertical
        ; edges and FULLY BLACK WALL CHARS. Only SOLID and the seam variants are fully wall.
        ;
        ; Testing merely "not BLANK" was not enough. A cell at the wall's BASE is a partial edge
        ; cell -- part wall, part floor -- and the splits are horizontal only, so stamping one
        ; paints its floor half black. That is the black block below the wall's lower bound.
        ; Skipping them leaves up to 8px of orb showing over the wall's bottom edge instead, which
        ; is the smaller error and the one that reads as a soft edge rather than a stray block.
oSCMid: ${DBGORB ? `inc oSCnt
        ` : ''}lda ohFstM
        jsr oSBack        ; the FIRST cell straddles the wall's edge, so it is stamped
        lda ohFst               ;   whatever is there -- only the backing changes. A cell that is
        bcs oSCMs               ;   not fully wall has floor or ceiling beyond the silhouette, and
        lda ohFstW              ;   the white-backed split leaves that showing.
oSCMs:               ; first cell: the stamp starts part way in, so clip from the right
        sta (osPtr),y
oSCCol: iny
        cpy ohRun
        beq oSCLst
        jsr oSWall
        bcc oSCCol              ; ditto for every interior cell
        lda #${hx(OCC_FULL)}
        sta (osPtr),y
        jmp oSCCol
oSCLst: lda ohLstM
        jsr oSBack
        lda ohLst
        bcs oSCLs
        lda ohLstW
oSCLs:               ; last cell: the stamp ends part way in, so clip from the left
        sta (osPtr),y
oSCNx:  inc ohSv
        jmp oSCRow
; oSWall: carry set if the cell at (osPtr),y is FULLY wall -- SOLID, or a seam variant, which is
; SOLID with a panel line on it. Ramp and step cells are part ceiling or part floor and cannot be
; stamped, because the occluder splits are horizontal only.
oSWall: lda (osPtr),y
        cmp #${hx(SOLID)}
        beq oSWyes
        cmp #${hx(SEAM0)}
        bcc oSWno
        cmp #${hx(SEAM0 + 4)}
        bcs oSWno
oSWyes: sec
        rts
oSWno:  clc
        rts

; oSBack: choose an EDGE cell's backing. A = the cellFillT mask naming the columns the split does
; NOT cover. Carry set -> the black-backed glyph, because those columns hold wall; clear -> white.
;
; This is the question oSWall could not answer. "Is the cell SOLID" conflates two different cells:
; a step at a CORNER is not SOLID but has wall on both sides and wants BLACK, while a cell on a
; vertical silhouette has floor or ceiling beyond it and wants WHITE. Both took white, so the
; corner case showed a white notch where the wall continues.
;
; X is not live in the cell loop, but oSCDn's cache invalidation follows it, so save it rather
; than depend on that -- twice per span row is not worth the coupling.
oSBack: sta ohMsk
        stx ohMsX
        lda (osPtr),y
        tax
        lda cellFillT,x
        ldx ohMsX
        and ohMsk
        beq oSBw
        sec
        rts
oSBw:   clc
        rts

oSCDn:  lda osL                 ; invalidate the cache for every cell column just stamped
        lsr
        lsr
        tay
        lda osR
        lsr
        lsr
        sta ohSv
oSCIv:  lda #$ff
${ORBINV ? `oSInv:  sta cbA,y               ; operand patched above to this buffer's cache` : `oSInv:  bit $ffff                ; ORBINV=0: invalidation off, so the stamp leaves trails`}
        cpy ohSv
        bcs oSCId
        iny
        bne oSCIv
oSCId:  rts

; oSDeseam: a seam inside a stamped orb's box would clip it -- seams are bit pair 10, the only
; other foreground in the charset. Replace each with plain SOLID, which is the same black at bit
; pair 01 and cannot clip. The orb's WHOLE box, not just the occluded part: a near wall's seam
; would otherwise bite an orb that a DIFFERENT wall is occluding at the edge.
;
; Only reached by orbs that were actually stamped, so an unoccluded orb pays nothing and keeps
; its seams -- which is the whole reason the priority bit is per orb rather than global.
oSDeseam:
        ldx osI
        lda obCR,x              ; the orb's full cell range; hoisted, CPY has no abs,x
        cmp #$28
        bcc oSDc1
        lda #$27                ; a cell index must be 0..39 whatever the slot data says
oSDc1:  sta osR
        lda obCL,x
        cmp #$28
        bcs oSDDn
        sta osDC
        ; COLUMNS OUTER, rows inner. seamT says per cell column what the solid run carries --
        ; SOLID, or a seam variant when a panel line lands there -- so a column with no seam skips
        ; all of its rows without a single screen read. Seams are rare, so nearly every column
        ; exits here. With the test inside the row loop instead it saved the read but kept the
        ; loop, and cost the same 3 fps.
oSDCol: ldy osDC
        lda seamT,y
        cmp #${hx(SEAM0)}
        bcc oSDNx
        cmp #${hx(SEAM0 + 4)}
        bcs oSDNx
        lda osRow
        sta ohSv
oSDRow: lda ohSv
        cmp osRowB
        beq oSDR1
        bcs oSDNx
oSDR1:  cmp #$19
        bcs oSDNx               ; same bound as oSCells -- never index the row tables past 24
        tay
        lda rowLoT,y
        sta osPtr
        lda rowHiT,y
        clc
        adc baseHi
        sta osPtr+1
        ldy osDC
        lda (osPtr),y           ; the seam does not reach every row of the box: the rows above the
        cmp #${hx(SEAM0)}       ;   solid run are ceiling or edge cells and must not become SOLID
        bcc oSDRN
        cmp #${hx(SEAM0 + 4)}
        bcs oSDRN
        lda #${hx(SOLID)}
        sta (osPtr),y
        lda #$ff
${ORBINV ? `oSDIn:  sta cbA,y               ; operand shares oSInv's patch target` : `oSDIn:  bit $ffff                ; ORBINV=0`}
oSDRN:  inc ohSv
        jmp oSDRow
oSDNx:  ldy osDC
        cpy osR
        bcs oSDDn
        inc osDC
        jmp oSDCol
oSDDn:  rts

osFlush:${process.env.ORBOCCDBG ? `
        lda ohDbg
        sta $d020               ; 0 none 1 reached 2 gate-passed 3 span-overlap 4 HIDDEN` : ''}
        ldx onv
        beq osBits
osLp:   dex
        txa
        asl
        tay
        lda obX,x
        sta $d000,y
        lda obY,x
        sta $d001,y
        lda obP,x
        sta ${hx16(SCR_A + 0x3f8)},x             ; the pointer lives in the SCREEN, so both buffers need it
        sta ${hx16(SCR_B + 0x3f8)},x
        lda obC,x
        sta $d027,x
        cpx #$00
        bne osLp
osBits: lda omEn
        sta $d015
        lda omXX
        sta $d01d
        lda omYY
        sta $d017
        lda omPri
        sta $d01b
        lda omX8
        sta $d010
        rts

; ---- orbOne: project orb oidx, and if it lands on screen take the next sprite slot ----
orbOne: ldx oidx
        sec                     ; Ix, Iy = orb cell - player cell, -15..15
        lda orbXCT,x
        sbc px+1
        sta oix
        sec
        lda orbYCT,x
        sbc py+1
        sta oiy
        ldy #$00                ; magnitudes and signs, so the products can be unsigned
        lda oix
        bpl oipx
        eor #$ff
        clc
        adc #$01
        ldy #$ff
oipx:   sta oax
        sty oixS
        ldy #$00
        lda oiy
        bpl oipy
        eor #$ff
        clc
        adc #$01
        ldy #$ff
oipy:   sta oay
        sty oiyS
        ; forward = Ix*cos + Iy*sin + kf
        lda oax
        ldx ocos
        lda oixS
        eor ocosS
        ldy oax
        jsr oTerm
        lda orL
        sta fwdL
        lda orH
        sta fwdH
        lda oiyS
        eor osinS
        ldx osin
        ldy oay
        jsr oTerm
        clc
        lda fwdL
        adc orL
        sta fwdL
        lda fwdH
        adc orH
        sta fwdH
        clc
        lda fwdL
        adc kfL
        sta fwdL
        lda fwdH
        adc kfH
        sta fwdH
        lda fwdH                ; behind the camera, or close enough to be inside us. Tested
        bmi orbNo               ; HERE, before "right" costs two more products: at any given
        bne ofwOk               ; moment most of the world is behind you
        lda fwdL
        cmp #$40
        bcc orbNo
ofwOk:  ; right = Iy*cos - Ix*sin + kr
        lda oiyS
        eor ocosS
        ldx ocos
        ldy oay
        jsr oTerm
        lda orL
        sta rgtL
        lda orH
        sta rgtH
        lda oixS
        eor osinS
        ldx osin
        ldy oax
        jsr oTerm
        sec
        lda rgtL
        sbc orL
        sta rgtL
        lda rgtH
        sbc orH
        sta rgtH
        clc
        lda rgtL
        adc krL
        sta rgtL
        lda rgtH
        adc krH
        sta rgtH
        ; iv = 1048576 / forward, via the existing 65536/n table. Normalise G = forward*2 down
        ; to 8 bits (n in 128..255, e shifts) and iv = recip[n] << (5-e). Dropping the low bits
        ; of forward costs under 0.4% -- less than half a column at the screen edge.
        lda fwdL
        asl
        sta ogL
        lda fwdH
        rol
        sta ogH
        lda #$00
        sta oe
onLp:   lda ogH
        beq onDn
        lsr ogH
        ror ogL
        inc oe
        jmp onLp
onDn:   ldx ogL
        lda recipLoT,x
        sta ivL
        lda recipHiT,x
        sta ivH
        lda #$05
        sec
        sbc oe
        beq ivDn
        bmi ivRt
        tax
ivLp:   asl ivL
        rol ivH
        dex
        bne ivLp
        jmp ivDn
ivRt:   tax                     ; e > 5: shift the other way instead
ivRl:   lsr ivH
        ror ivL
        inx
        bne ivRl
ivDn:   lda #$0b                ; h = 22528/forward = iv * 11/512, the same 88/d the walls use
        sta mq
        lda ivL
        jsr mul8
        lda plo
        sta o0
        lda phi
        sta o1
        lda #$00
        sta o2
        lda #$0b
        sta mq
        lda ivH
        jsr mul8
        clc
        lda o1
        adc plo
        sta o1
        lda o2
        adc phi
        sta o2
        lsr o2
        ror o1
        lda o2
        beq ohOk
        lda #$ff
        sta o1
ohOk:   lda o1
        sta ohgt
        ; column offset = right * (80/tan(FOV/2)) / forward. h is ALREADY 22528/forward, so the
        ; ratio comes free off it -- right*h/183 -- and the 16x16 multiply plus 32-bit shift
        ; that computing right/forward separately would need is gone entirely.
        lda rgtL
        sta oaL
        lda rgtH
        sta oaH
        jsr oabs
        lda ohgt
        sta mq
        lda oaL
        jsr mul8
        lda plo
        sta o0
        lda phi
        sta o1
        lda ohgt
        sta mq
        lda oaH
        jsr mul8
        clc
        lda o1
        adc plo
        sta o1
        lda phi
        adc #$00
        bne orbNo               ; |right|*h past 65535 is far outside the FOV
        lda #179                ; /183.2, as *179 >> 15. The product is 24 bits and a 15-bit
        sta mq                  ; shift of it is just (b2 << 1) | (b1 >> 7) -- no shift loop.
        lda o0
        jsr mul8
        lda phi
        sta o2
        lda #179
        sta mq
        lda o1
        jsr mul8
        clc
        lda o2
        adc plo
        sta o2
        lda phi
        adc #$00
        asl o2
        rol
        bcs orbNo               ; past 255 columns off centre: nowhere near the screen
        sta ocoff
        ldx ohgt                ; --- size variant, scaled exactly as the walls are ---
        lda orbVarT,x
        sta ovar
        lda oaS                 ; --- centre column ---
        bmi ocN
        clc
        lda #80
        adc ocoff
        bcc ocS                 ; 80 + ocoff past 255 means the centre is off the RIGHT of the
        jmp orbNo               ;   screen by more than a screen's width. ocol is a plain byte,
                                ;   so it WRAPS -- and a wrapped ocol is a small number, which
                                ;   reads as a column near the LEFT edge. An orb 59 degrees off
                                ;   axis was drawn at column 16, and as the player turned away
                                ;   from it ocoff grew, so the ghost slid RIGHT across a scene
                                ;   moving the other way, until ocoff finally passed 255 and the
                                ;   guard above deleted it. The mirror case going LEFT was
                                ;   handled (ocolN, below); this side was not. Rejecting is
                                ;   safe: a centre at column 256+ puts the nearest edge of the
                                ;   widest orb at column 244, off the 160-column screen.
ocN:    sec
        lda #80
        sbc ocoff
        bcs ocS
        ; The centre is LEFT of column 0. ocol is a plain byte, so it has just wrapped to
        ; something large -- and a large ocol is indistinguishable from an orb far to the RIGHT.
        ; Keep the magnitude and a flag instead, so the box code below can tell the two apart. An
        ; orb whose CENTRE is off the left edge can still be half on screen, and treating its
        ; wrapped column as "off the right" would delete it.
        eor #$ff
        clc
        adc #$01                ; A = how far left of column 0 the centre sits
        sta ocol
        lda #$ff
        sta ocolN
        jmp ocDn
ocS:    sta ocol
        lda #$00
        sta ocolN
ocDn:
        ; --- screen X, on the 160-COLUMN grid: X = 2 * (ocol + orbXOffT) ---
        ; The engine is 160x200 throughout and a multicolor sprite pixel is two hires pixels, so
        ; there is no odd sprite X worth having. This used to build a signed 16-bit HIRES x --
        ; two 16-bit adds and a 16-bit subtract -- and then threw the low bit away again with
        ; an AND #$fe. In columns it is one byte add and a shift, X is even by construction,
        ; and the half column the snap could take is gone, which is what lets the bounding box
        ; above be exact instead of rounded outward.
        ldx ovar
        lda ocolN
        bne oxNeg
        lda ocol                ; centre on screen: b = ocol + (12 - halfCols)
        clc
        adc orbXOffT,x
        bcc oxDn
        jmp orbNo               ; b past 255: far off the right, and b<<1 would wrap
oxNeg:  lda orbXOffT,x          ; centre is ocol columns LEFT of column 0, so b = offset - ocol
        sec
        sbc ocol
        bcc orbNo               ; sprite's left edge is left of X = 0, which no sprite can be
oxDn:   asl                     ; X = b * 2, low byte and the X8 bit
        sta o0
        lda #$00
        rol
        sta o1
        ; --- screen Y: ground shadow on the floor line, 100 + h ---
        ; $d001 = 150 + h - anchor, but computed as (150 - anchor) + h. Adding 150 first
        ; carries out of a byte once h passes 105, which used to cap how close an orb could
        ; get -- it blinked out at 0.84 cells instead of sliding off the bottom. Folding the
        ; anchor into the constant keeps the sum in range all the way down to 0.62 cells,
        ; which is past the point where the whole sprite is below the last visible line.
        ldx ovar
        lda orbYBaseT,x
        clc
        adc ohgt
        bcs orbNo               ; far below the screen
        cmp #251
        bcs orbNo               ; top of the sprite is past the last visible raster line
        sta o3
        ; ---- occlusion: is the orb beyond the faces it overlaps? ----
        ; A face occludes the orb only if the orb lies on the FAR side of its plane. We render
        ; camera-facing faces only, so anything on screen already faces the camera; if the orb
        ; is beyond it, the face is between them. That answer never involves the camera, so it
        ; is precomputed at build time: one bit per (orb, run).
        ;
        ; Per FACE, not per column, and that is the whole point. Comparing the orb's height
        ; against the wall's was per column and quantised, so two cells of one flat wall could
        ; disagree -- and every occlusion artifact in this thing has been exactly that
        ; disagreement showing up as a sliver of orb through a wall or a slice cut out of one.
        ; ---- record what this orb needs, for the paint pass below ----
        ; Nothing is decided here and nothing is written to the screen. The orb states which
        ; columns under it must clip it; orbPaint merges every orb's statement and renderSym
        ; then draws each column that way the first time. There is no second pass over the
        ; walls at all, which is what removes every artifact that came from editing them.
        ldx ovar                ; the ball's extent each side of ocol, in logical columns. Two
        lda orbColLT,x          ;   tables, not one half-width: the ball is not centred on ocol
        sta o2                  ;   (see orbColLT) and an even-wide ball never can be
        lda orbColRT,x
        sta o2r
        lda ocolN               ; the bounding box, in logical columns
        bne opBLn
        lda ocol
        sec
        sbc o2
        bcs opBL1
        lda #$00
        jmp opBL2               ; straddles column 0 from the right: left edge is 0
opBLn:  lda o2r                 ; centre is LEFT of 0 by ocol columns, so the box ends at
        sec                     ;   o2 - ocol. If that borrows, the whole orb is off screen.
        sbc ocol
        bcc opBLx
        beq opBLx
        lda #$00                ; part of it shows: the box starts at column 0
        jmp opBL2
opBLx:  jmp orbNo
opBL1:  cmp #${hx(NLOG)}        ; A box that STARTS past the last column is an orb entirely off
        bcc opBL2               ; the right edge. This used to clamp to 159, which turned "not on
        jmp orbNo               ; screen" into "one column at the screen edge" -- so the orb took a
                                ; sprite slot it could never be seen in, and orbStamp then painted
                                ; occluders into cell 39 for it. Invisible in the shipping build,
                                ; since black on black wall looks the same, but real work for an
                                ; orb that is not there. Clamping was added to stop the box
                                ; running off the end of fgCell and seamT; rejecting does that
                                ; too, and is what the geometry actually says.
opBL2:  sta ocl2
        lsr
        lsr
        sta ocl
        lda ocolN
        bne opBRn
        lda ocol
        clc
        adc o2r
        bcc opBR1
        lda #159
        jmp opBR1
opBRn:  lda o2r                 ; the centre is ocol columns LEFT of 0, so the box ends at
        sec                     ;   o2 - ocol. The check above already proved o2 > ocol, so this
        sbc ocol                ;   cannot borrow and the result is well under 160.
opBR1:  cmp #160
        bcc opBR2
        lda #159
opBR2:  sta ocmax
        lsr
        lsr
        cmp ocl
        bcs opBR3
        lda ocl
opBR3:  sta ocr
${ORBOCC ? `        ; ---- is this orb WHOLLY occluded? ----
        ; The rule is the user's: a wall facing AWAY from an orb always occludes it, and a wall
        ; facing the orb never can. Which side of each face's plane every orb lies on is a
        ; build-time constant (orbOccT, one bit per orb x run), so the only runtime question is
        ; whether some column under the orb shows a run that does NOT occlude it -- and the first
        ; such column means the orb is visible. There is no depth test and no height test:
        ;
        ;   - no depth, because the plane test decides it per FACE, so every column showing that
        ;     face gets the same answer by construction. Depth comparisons are per column and
        ;     quantised, which is where every occlusion artifact in this engine has come from.
        ;   - no height, because camera height is fixed and everything stands on the floor. A wall
        ;     that occludes an orb is NEARER, hence taller on screen with a lower base, so the orb
        ;     projects entirely inside its solid region and can never poke out above it.
        ;
        ; faceIdT is the run id per logical COLUMN, filled during casting for the run-merge, so it
        ; costs nothing to produce here -- and it is FINER than the per-cell fill the old scheme
        ; needed. A corner cell showing two different runs was the source of most of that scheme's
        ; artifacts and of its "every run in the cell must agree" rule; per column, that case does
        ; not arise.
${process.env.ORBOCCDBG ? `        lda #$01
        cmp ohDbg
        bcc ohDa
        sta ohDbg
ohDa:
` : ''}        lda ocanO
        bpl opDone              ; build time: nothing reachable from this cell can occlude it, and
                                ; that is true of 56% of candidates -- they never enter the walk
${process.env.ORBOCCDBG ? `        lda #$02
        cmp ohDbg
        bcc ohDb
        sta ohDbg
ohDb:
` : ''}
        ldy oidx
        lda orbOccLoT,y
        sta omptr
        lda orbOccHiT,y
        sta omptr+1
        ; Walk the SPANS the subdivision left behind, not the columns. bndT holds the columns
        ; where a new face begins, sorted, so the spans are [0,bndT[0]-1], [bndT[0],bndT[1]-1],
        ; ... [bndT[n-1],159] -- about fourteen of them. Each span is a contiguous piece of ONE
        ; wall run, and its LEFT column is a cast column, which is the only place faceIdT is
        ; valid: it is written once per ray, and adaptive subdivision casts ~14-26 of 160. Reading
        ; it per column looks right and silently returns last frame's values for the rest.
        ;
        ; So this needs nothing added to the interpolator or to the wall drawing. It reads what
        ; the subdivision already produced, and it stops at the first span that does not occlude.
        lda #$00
        sta ohL                 ; the first span starts at column 0
        sta ohBX
ohSpan: ldx ohBX                ; this span's right edge
        cpx nbnd
        bcc ohSB
        lda #${hx(NLOG - 1)}    ; the last span runs to the right edge of the screen
        jmp ohSR
ohSB:   lda bndT,x
        sec
        sbc #$01
ohSR:   cmp ocl2
        bcc ohAdv               ; span ends before the orb begins: irrelevant, skip it
        lda ohL
        cmp ocmax
        beq ohChk
        bcs ohHide              ; span begins past the orb: every overlapping span occluded it
ohChk:
${process.env.ORBOCCDBG ? `        lda #$03
        cmp ohDbg
        bcc ohDc
        sta ohDbg
ohDc:
` : ''}        ldx ohL
        ldy faceIdT,x           ; the run this span shows
        beq opDone              ; no run here at all, so the orb shows through
        sty ohRun
        lda runByteT,y
        tay
        lda (omptr),y           ; the mask byte holding this run's bit
        ldy ohRun
        and runBitT,y
        beq opDone              ; this run does not occlude this orb -> the orb is visible
ohAdv:  ldx ohBX
        cpx nbnd
        bcs ohHide              ; that was the last span, and it occluded
        lda bndT,x
        sta ohL                 ; the next span starts at this boundary
        inc ohBX
        jmp ohSpan
${process.env.ORBOCCDBG ? `ohHide:${process.env.ORBOCCDBG ? `
        lda #$04
        sta ohDbg` : ''}
        jmp orbNo
` : `ohHide: jmp orbNo           ; wholly occluded: take no sprite slot at all
`}` : ''}opDone:
        ; --- take a sprite slot ---
        ldx onv
        lda orbBitT,x
        sta omBit
        ora omEn
        sta omEn
        ldy ovar
        lda orbPtrT,y
        sta obP,x               ; buffered, not written: see osFlush
        ldy oidx
        lda orbColT2,y
        sta obC,x               ; the ONE thing that can differ per orb: bit pair 10
        ldy ovar
        lda orbExpT,y
        beq oNoX
        lda omBit
        ora omXX
        sta omXX
        lda omBit
        ora omYY
        sta omYY
oNoX:   lda o0                  ; already on the multicolor grid -- X is 2*b, so always even.
                                ; It has to be: a multicolor CHAR pixel is two hires pixels
                                ; aligned to the character, a multicolor SPRITE pixel is two
                                ; aligned to the sprite's own X, and at an odd X the two grids
                                ; are half a pixel out of phase. The VIC then decides priority
                                ; per HIRES pixel, so one half of a sprite pixel lands on
                                ; foreground and clips while its partner lands on background and
                                ; draws -- a one-pixel sliver of orb peeking past a wall edge
                                ; that is otherwise clipping it correctly.
        sta obX,x
        lda o3
        sta obY,x
        lda o1
        beq oNoM
        lda omBit
        ora omX8
        sta omX8
oNoM:   ; remember what this orb asked for; the second pass compares it against what the
        ; scene actually ended up painting, which is the only place a conflict can show up
        ldx onv
        lda oidx
        sta obIX,x
        lda ovar
        sta obV,x
        lda ocanO
        sta obOcc,x
        lda ocl
        sta obCL,x
        lda ocr
        sta obCR,x
        lda ocl2
        sta obL,x               ; the tight column range, for the stamp pass
        lda ocmax
        sta obR,x
        lda ocl2
        and #$03
        tay
        lda bbLT,y              ; the columns of the leftmost cell inside the box
        sta obBL,x
        lda ocmax
        and #$03
        tay
        lda bbRT,y              ; ... and of the rightmost
        sta obBR,x
        inc onv
orbYes: rts
orbNo:  rts
kSgn:   bmi kSgN
        lda #$00
        rts
kSgN:   lda #$ff
        rts

; oTerm: (Y * X) as a 16-bit product in orL/orH, negated if A is negative. Y is a cell
; difference magnitude (0..15) and X a trig magnitude, so this is a plain 8x8 -- the 16x8 the
; old orot did was only ever needed because the orb offset carried a fraction, and that
; fraction is now a per-frame constant instead.
oTerm:  stx mq
        sta tmp2
        tya
        jsr mul8
        lda tmp2
        bpl otD
        sec
        lda #$00
        sbc plo
        sta orL
        lda #$00
        sbc phi
        sta orH
        rts
otD:    lda plo
        sta orL
        lda phi
        sta orH
        rts

; oFrac: (signed A * unsigned X) >> 8, negated if Y is $ff. A is 0.5 minus the player's
; fractional position, so the result is the shared fractional term of one product -- and it
; always fits a signed byte, since |A| <= 128 and X <= 255.
oFrac:  stx mq
        sta tmp
        cmp #$00                ; STA does not set flags -- without this the branch tested
        bpl ofP                 ; whatever the caller's ldy left, so a negative offset was
                                ; multiplied as its unsigned byte and never negated
        eor #$ff
        clc
        adc #$01
        tya
        eor #$ff
        tay                     ; A was negative: flip the sign we were handed
        lda tmp
        eor #$ff
        clc
        adc #$01
ofP:    sty tmp2
        jsr mul8
        lda tmp2
        bpl ofD
        sec
        lda #$00
        sbc phi
        rts
ofD:    lda phi
        rts

; |a| with the sign kept aside, so every product below can be done unsigned and negated once.
oabs:   lda #$00
        sta oaS
        lda oaH
        bpl oabsD
        lda #$ff
        sta oaS
        sec
        lda #$00
        sbc oaL
        sta oaL
        lda #$00
        sbc oaH
        sta oaH
oabsD:  rts
` : ''}
; sideT / idT / colH are per-frame mutable arrays in scratch RAM at $c100+ (see equates)
dataEnd:                        ; guard: must clear both screen buffers AND the charset -- see the layout check in build-iray.mjs

; The charset is NOT in the image. It is shipped as its own compressed segment and decoded
; straight into $d000-$d7ff by the loader, with the port at $34 -- which is the one thing a KERNAL
; LOAD can never do, and the reason a low "source" copy existed here for as long as it did. See
; iray-charset.bin and the --seg argument in the SELFEXT block below.

; connected-wall-run id tables (indexed by cell id) live above the f-tables in free RAM

; charset B has NO source: cpChr derives it from A with an EOR #$07 on the row index. fontB is
; still built in JS -- charsetgen and the readout glyph checks compare against it -- but nothing
; is emitted, which is the point: it was a permutation of bytes already in the image.

${SPRITES ? `; ================= orb tables =================
; These sit in the hole between the code and the first emitted table. Only what the projection
; and the whole-orb hide need: the painting pass's tables (fgCodeT, kMaskT, bbLT/bbRT, opbBaseT,
; popcT) are NOT here, because they addressed charset twins that no longer exist.
        * = ${hx16(ORB_VART)}
orbVarT: !byte ${orbVarT.join(',')}
        * = ${hx16(ORB_CANDCNT)}
candCntT: !byte ${candCnt.join(',')}
        * = ${hx16(ORB_CANDLO)}
candLoT: !byte ${candLo.join(',')}
        * = ${hx16(ORB_CANDHI)}
candHiT: !byte ${candHi.join(',')}
        * = ${hx16(ORB_OCC)}
; One bit per (orb, run): is the orb BEYOND that face's plane, hence occluded by it. A constant,
; because the test does not involve the camera at all -- see the data layer above.
orbOccT: !byte ${orbOccFlat.join(',')}
        * = ${hx16(ORB_SMALL)}
orbPtrT: !byte ${orbPtrT.join(',')}
orbExpT: !byte ${orbExpT.join(',')}
orbXOffT: !byte ${orbXOffT.join(',')}
orbYBaseT: !byte ${orbYBaseT.join(',')}
orbBlankT: !byte ${orbBlankT.join(',')}
orbAnchT: !byte ${ORBANCH.join(',')}
orbHgtT: !byte ${orbHgtT.join(',')}
orbColLT: !byte ${orbColLT.join(',')}
orbColRT: !byte ${orbColRT.join(',')}
orbBitT: !byte ${orbBitT.join(',')}
; The stamp's edge cells. A cell is 4 logical columns, so a stamp that begins or ends inside one
; needs a glyph with only part of it foreground.
;   occRT[k] -- the stamp STARTS at column k of this cell, so columns k..3 clip: "from the right"
;   occLT[m] -- the stamp ENDS at column m, so columns 0..m clip: "from the left"
; Both give the whole-cell glyph where the boundary lands on a cell edge, so no special case.
occRT: !byte ${[0,1,2,3].map(k => k === 0 ? OCC_FULL : OCC0 + 3 + (4 - k)).join(',')}
occLT: !byte ${[0,1,2,3].map(m => OCC0 + m).join(',')}
; the same two, backed by white, for a cell on a wall's vertical silhouette
occRTW: !byte ${[0,1,2,3].map(k => k === 0 ? OCC_FULL : OCCW0 + 2 + (4 - k)).join(',')}
occLTW: !byte ${[0,1,2,3].map(m => m === 3 ? OCC_FULL : OCCW0 + m).join(',')}
; Which of a glyph's four columns contain WALL, one bit each, bit 3 = column 0. A column counts
; as wall if any of its eight rows is bit pair 01. This is what decides an edge cell's backing:
; ask what the columns the stamp does NOT cover actually hold, rather than guessing from whether
; the cell is SOLID. A step at a corner has wall on both sides and wants BLACK; a cell on a
; vertical silhouette has floor beyond it and wants WHITE. "Is it SOLID" cannot tell them apart.
cellFillT: !byte ${[...Array(256)].map((_, c) => {
  const g = glyphs[c] || new Array(8).fill(0);
  let m = 0;
  for (let col = 0; col < 4; col++)
    if (g.some(row => ((row >> (6 - 2 * col)) & 3) === 1)) m |= 8 >> col;
  return m;
}).join(',')}
; the columns a split leaves uncovered: kMskT by the START offset, mMskT by the END offset
kMskT: !byte ${[0,1,2,3].map(k => (((1 << k) - 1) << (4 - k)) & 15).join(',')}
mMskT: !byte ${[0,1,2,3].map(m => (1 << (3 - m)) - 1).join(',')}
; Run id -> which byte of an orb's occluder mask holds its bit, and which bit. Two small tables
; instead of three lsrs and an and per column: this runs once per logical column under every orb
; that might be occluded, which is the only part of the test that is not O(1).
runByteT: !byte ${[...Array(nextRun)].map((_, r) => r >> 3).join(',')}
runBitT: !byte ${[...Array(nextRun)].map((_, r) => 1 << (r & 7)).join(',')}
orbOccLoT: !byte ${orbOccLo.join(',')}
orbOccHiT: !byte ${orbOccHi.join(',')}
orbXCT: !byte ${orbXC.join(',')}
orbYCT: !byte ${orbYC.join(',')}
orbColT2: !byte ${orbCol.join(',')}
; bbLT / bbRT: a bounding box starts and ends part-way through a cell, so these give the columns
; of that first and last cell which lie inside it. Bit 3 is the leftmost column. These are about
; the BOUNDING BOX, not the charset -- which is why they come back while fgCodeT and kMaskT,
; which named charset twins, do not.
bbLT:   !byte $0f,$07,$03,$01
bbRT:   !byte $08,$0c,$0e,$0f
popcT:  !byte 0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4
opbBaseT: !byte 0,12,24,36,48,60,72,84
        * = ${hx16(ORB_CANDLIST)}
candListT: !byte ${candList.join(',')}   ; read through a 16-bit pointer, so it may cross pages
` : ''}        * = ${hx16(NEWTABLES)}  ; VIC bank 0 is full -- these live above it
absCosT: ${chunk(absCos).trim()}
absSinT: ${chunk(absSin).trim()}
recipLoT: ${chunk(recipLo).trim()}
recipHiT: ${chunk(recipHi).trim()}
clampT: ${chunk(clampT).trim()}
clmp16: ${chunk(clampT16).trim()}
qIdxAT: !byte ${qIdxAT.join(',')}
qIdxMT: !byte ${qIdxMT.join(',')}
qIdxBT: !byte ${qIdxBT.join(',')}
qmT:    !byte ${qmT.join(',')}
${PLAN === 3 ? '' : `rampT:  ${chunk(rampT).trim()}`}
${chainSrc('bkA', SCR_A, ROWSD, 'rfEdge')}
${chainSrc('bkB', SCR_B, ROWSD, 'rfEdge')}
${chainSrc('slA', SCR_A, ROWSA, 'rfNext')}
${chainSrc('slB', SCR_B, ROWSA, 'rfNext')}
${edgeSrc('edA', SCR_A)}
${edgeSrc('edB', SCR_B)}
chainEnd:
        * = ${hx16(HTABLE)}
hTabT:  ${chunk(hTab, 32).trim()}
        ; ---- CPU-only tables, lifted clear of VIC bank 0 ----
        ; None of this is ever fetched by the VIC, so none of it belongs in the 16K the
        ; VIC can see. Moving it out frees bank 0 for sprites, and gives every 256-entry
        ; table its own page for free -- an "lda table,x" that crosses a page costs an
        ; extra cycle, and these are indexed by a full byte.
        * = ${hx16(RELOC)}
f0LoT:  ${chunk(f0Lo).trim()}
        * = ${hx16(RELOC + 0x100)}
f0HiT:  ${chunk(f0Hi).trim()}
        * = ${hx16(RELOC + 0x200)}
f1LoT:  ${chunk(f1Lo).trim()}
        * = ${hx16(RELOC + 0x300)}
f1HiT:  ${chunk(f1Hi).trim()}
        * = ${hx16(RELOC + 0x400)}
runWT: !byte ${runW.join(',')}
        * = ${hx16(RELOC + 0x500)}
runET: !byte ${runE.join(',')}
        * = ${hx16(RELOC + 0x600)}
runNT: !byte ${runN.join(',')}
        * = ${hx16(RELOC + 0x700)}
runST: !byte ${runS.join(',')}
        * = ${hx16(RELOC + 0x800)}
mapT:   ${chunk(map, 16).trim()}
        * = ${hx16(RELOC + 0x900)}
rbT:    ${chunk(rbT).trim()}
        * = ${hx16(RELOC + 0xa00)}
rsT:    ${chunk(rsT).trim()}
        * = ${hx16(RELOC + 0xb00)}
ddxLoT: ${chunk(ddxLo).trim()}
        * = ${hx16(RELOC + 0xc00)}
ddxHiT: ${chunk(ddxHi).trim()}
        * = ${hx16(RELOC + 0xd00)}
ddyLoT: ${chunk(ddyLo).trim()}
        * = ${hx16(RELOC + 0xe00)}
ddyHiT: ${chunk(ddyHi).trim()}
        * = ${hx16(RELOC + 0xf00)}
posXT:  ${chunk(posX).trim()}
        * = ${hx16(RELOC + 0x1000)}
posYT:  ${chunk(posY).trim()}
        * = ${hx16(RELOC + 0x1100)}
rayOffT: !byte ${rayOff.join(',')}
        * = ${hx16(RELOC + 0x1200)}
colGrpT: !byte ${colGrpT.join(',')}
${SPIN ? `spinIx: !byte 0
spinXL: !byte ${SPINPOS.map(p => Math.round(p[0]*256) & 255).join(',')}
spinXH: !byte ${SPINPOS.map(p => Math.round(p[0]*256) >> 8).join(',')}
spinYL: !byte ${SPINPOS.map(p => Math.round(p[1]*256) & 255).join(',')}
spinYH: !byte ${SPINPOS.map(p => Math.round(p[1]*256) >> 8).join(',')}` : ''}
${FINEANG ? `        * = ${hx16(RELOC + 0x1300)}
; The DDA deltas at quarter-angle resolution. 1024 entries each, addressed as four pages via
; the dispatch in castRay, so no index arithmetic wider than a byte ever happens. The 256-entry
; originals are left in place and unused -- posXT/posYT/absSinT/absCosT still index by the
; integer angle, and their page-alignment check would have to be reworked for no gain.
ddxLoTQ: ${chunk(ddxLoQ).trim()}
        * = ${hx16(RELOC + 0x1700)}
ddxHiTQ: ${chunk(ddxHiQ).trim()}
        * = ${hx16(RELOC + 0x1b00)}
ddyLoTQ: ${chunk(ddyLoQ).trim()}
        * = ${hx16(RELOC + 0x1f00)}
ddyHiTQ: ${chunk(ddyHiQ).trim()}
        * = ${hx16(RELOC + 0x2300)}
; SIGNED quarter-unit offset from the view centre, |v| < 128, so one byte covers the whole FOV
; and there is no second table. The first cut stored a 10-bit value as lo/hi pairs and the hi
; table landed on $c000 -- which is stackLT, the subdivision's own stack. It rendered fine until
; the recursion got deep enough to reach it, then corrupted every span from mid-screen right.
rayOffQS: !byte ${rayOffQ.map(v => v & 255).join(',')}
` : ''}        ; Step tables, one page each. Addressed by qA*(LM*LB) + qM*LB + qB, so a full byte of
        ; index -- exactly the case a page crossing taxes, and exactly why they are up here
        ; rather than packed in below the height tables where they used to live.
        * = ${hx16(RELOC + 0x2400)}
${PLAN === 3 ? '' : `stepT1: ${chunk(stepT[0]).trim()}`}${PIVOT ? `
; PIVOT's lookups live in the three pages PLAN=3 vacates -- stepT1/2/3 are replaced by the
; lo/hi pair up at 0x2900 and emit nothing here. There is no room above the tables (the
; profiler already claims 0x3600 and $c000 is stackLT), so this is the space there is, and it
; is why PIVOT requires PLAN=3.
;
; qToColT: a quarter-unit offset (biased by 128) straight back to a column -- the inverse of
; rayOffQS. This table is what keeps the prediction divide-free; the rectilinear column
; spacing lives here instead of in an atan.
qToColT: !byte ${qToCol.join(',')}` : ''}
        * = ${hx16(RELOC + 0x2500)}
${PLAN === 3 ? '' : `stepT2: ${chunk(stepT[1]).trim()}`}${PIVOT ? `
sinST:  !byte ${sinS.join(',')}` : ''}
        * = ${hx16(RELOC + 0x2600)}
${PLAN === 3 ? '' : `stepT3: ${chunk(stepT[2]).trim()}`}${PIVOT ? `
; 163/d as a byte, d in 1/16 cells. 163 is the constant that makes the final shift exactly
; 2^15. Saturates at d = 0.639 cells, where the correction is under-applied and that boundary
; falls back to bisection -- harmless, because a missed prediction can only cost probes.
rcpDT:  !byte ${rcpD.join(',')}` : ''}
${SEAMS ? `        * = ${hx16(RELOC + 0x2800)}
; The (at most two) runs each run meets at a CONCAVE corner, 0 for none. subFace keeps its
; corner line only when the run across the boundary is one of these; every other run-to-run
; boundary is a convex silhouette, where the wall's edge stands against something unrelated
; behind it and the 20-row step has already drawn the division.
; Indexed by run id, so whole tables rather than a packed set.
${CVXSEAM ? `; Emitted only when CVXSEAM=0. With every run-to-run boundary drawing a line, nothing reads
; these -- ${cpLo.filter(Boolean).length + cpHi.filter(Boolean).length} bytes of corner-partner
; tables and the whole build-time derivation exist purely to tell a corner from a silhouette,
; and the renderer no longer cares which it is.` : `cpLoT:  !byte ${cpLo.join(',')}
cpHiT:  !byte ${cpHi.join(',')}`}
` : ''}
${PLAN === 3 ? `        * = ${hx16(RELOC + 0x2900)}
; The ninth index bit costs a second copy of every code table plus the thresholds that derive
; it. Each is page-aligned so "lda table,y" stays 4 cycles -- a page crossing here would tax the
; hottest lookup in the renderer. The single-copy rampT/stepT are not emitted at all under
; PLAN=3, which pays back four of these twelve pages.
rampTlo: ${chunk(rampTlo).trim()}
        * = ${hx16(RELOC + 0x2a00)}
rampThi: ${chunk(rampThi).trim()}
        * = ${hx16(RELOC + 0x2b00)}
stepT1lo: ${chunk(stepTlo[0]).trim()}
        * = ${hx16(RELOC + 0x2c00)}
stepT1hi: ${chunk(stepThi[0]).trim()}
        * = ${hx16(RELOC + 0x2d00)}
stepT2lo: ${chunk(stepTlo[1]).trim()}
        * = ${hx16(RELOC + 0x2e00)}
stepT2hi: ${chunk(stepThi[1]).trim()}
        * = ${hx16(RELOC + 0x2f00)}
stepT3lo: ${chunk(stepTlo[2]).trim()}
        * = ${hx16(RELOC + 0x3000)}
stepT3hi: ${chunk(stepThi[2]).trim()}
        * = ${hx16(RELOC + 0x3100)}
rampThrT: !byte ${[...Array(256)].map((_, i) => rampThrN(i)).join(',')}
        * = ${hx16(RELOC + 0x3200)}
stepThrT1: !byte ${[...Array(SLOTN)].map((_, i) => stepThrN(0, i)).join(',')}
        * = ${hx16(RELOC + 0x3300)}
stepThrT2: !byte ${[...Array(SLOTN)].map((_, i) => stepThrN(1, i)).join(',')}
        * = ${hx16(RELOC + 0x3400)}
stepThrT3: !byte ${[...Array(SLOTN)].map((_, i) => stepThrN(2, i)).join(',')}
        * = ${hx16(RELOC + 0x3500)}
clamp8T: ${chunk(clamp8T).trim()}
` : ''}
${PROFILE ? `        * = ${hx16(RELOC + (PLAN === 3 ? 0x3600 : 0x2900))}  ; the profiler lives above the relocated
                            ; tables: it must not crowd the shipping build out of the
                            ; space it has left below screen buffer B. PLAN=3 claims
                            ; RELOC+0x2900 for its lo/hi code tables, so the profiler
                            ; moves above THOSE -- otherwise the origin runs backward
                            ; and the build dies with an overlap error.
` : ''}${PROFILE ? `; ---- pfShow: 7 phases as 4 hex digits each, one per row from row 4 ----
; Accumulated over exactly 256 frames, so bytes 1 and 2 of each 24-bit total ARE the mean
; raster lines per frame. One line is 65 cycles. Read it back with readout.mjs PROF=1.
pfShow: lda #$00
        sta pfRow
        ; TWO COLUMNS of five. Ten rows starting at 4 would reach rows 12-13, which are BELOW
        ; the horizon -- the raster split swaps to the vertically flipped charset B there, so the
        ; digits render mirrored and cannot be read back. Everything must stay above row 12.
psLp:   lda pfRow               ; row = 4 + phase mod 5
        cmp #$0a
        bcc psR1
        sec
        sbc #$05
psR1:   cmp #$05
        bcc psRw
        sec
        sbc #$05
psRw:   clc
        adc #$04
        jsr setRow
        ldy #$00
        lda pfRow               ; column = (phase / 5) * 5 chars across
        cmp #$0a
        bcc psC1
        ldy #$0a
        bne psCol
psC1:   cmp #$05
        bcc psCol
        ldy #$05
psCol:  lda pfRow               ; byte offset = row*3 + 1 (skip the low byte: /256)
        asl
        clc
        adc pfRow
        tax
        lda pfAcc+2,x           ; high nibble pair first
        pha
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        pla
        and #$0f
        jsr ddPut
        lda pfAcc+1,x
        pha
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        pla
        and #$0f
        jsr ddPut
        inc pfRow
        lda pfRow
        cmp #$0f                ; 15 phases. Row = 4 + r%5 and column = (r/5)*5, so r=14 is
        bcc psLp                ; row 8 / col 10 -- still above the horizon, still readable.
        rts

; ---- pfTick: close the phase in X and open the next ----
; Time is (frameCnt, raster line). frameCnt only advances in the IRQ, so read it, read the
; line, then read it again -- if it moved, the two halves came from different frames and
; the pair is meaningless. Costs ~60 cycles, 8 times a frame: 0.8%, and it lands in the
; phase being measured, so subtract ~60 lines/256 frames per phase if you care.
pfTick: lda pfDone
        bne pfOff
        lda frameCnt
        sta pfCurF
        lda $d012               ; LOW 8 bits only -- $d012 cannot tell line 5 from line 261, so
        sta pfCurL              ; the ninth bit comes from $d011 bit 7. Normalise it to 0/1 HERE,
        lda $d011               ; at capture: doing it during the subtract clobbers the borrow
        asl                     ; the 16-bit chain below depends on.
        lda #$00
        rol
        sta pfCurH
        lda frameCnt
        cmp pfCurF
        bne pfTick
        sec                     ; delta = (f - pf)*263 + (l - pl), l a full 9 bits.
        lda pfCurL              ; One unbroken borrow chain: nothing may touch the carry
        sbc pfPrvL              ; between these two subtracts.
        sta pfDLo
        lda pfCurH
        sbc pfPrvH
        sta pfDHi
        lda pfCurF
        sec
        sbc pfPrvF
        tay
        beq pfNoF
pfFLp:  clc                     ; one whole video frame is 263 lines
        lda pfDLo
        adc #<263
        sta pfDLo
        lda pfDHi
        adc #>263
        sta pfDHi
        dey
        bne pfFLp
pfNoF:  lda pfDHi               ; A negative delta means the raster wrapped 262->0 but the
        bpl pfPos               ; IRQ had not yet bumped frameCnt -- the read caught the gap.
        clc                     ; Add the frame the counter had not counted, so the delta is
        lda pfDLo               ; always non-negative and the accumulate below stays simple.
        adc #$07
        sta pfDLo
        lda pfDHi
        adc #$01
        sta pfDHi
pfPos:  lda pfCurF              ; this timestamp becomes the next phase's start
        sta pfPrvF
        lda pfCurL
        sta pfPrvL
        lda pfCurH
        sta pfPrvH
        stx pfCurX              ; X = phase -> byte offset X*3
        txa
        asl
        clc
        adc pfCurX
        tay
        clc                     ; 24-bit accumulate
        lda pfAcc,y
        adc pfDLo
        sta pfAcc,y
        iny
        lda pfAcc,y
        adc pfDHi
        sta pfAcc,y
        iny
        lda pfAcc,y
        adc #$00
        sta pfAcc,y
pfOff:  rts

` : ''}
`;

// iray.asm is deliberately tracked (see .gitignore): diffing the generated assembly is how
// a JS change gets reviewed. But a diagnostic build bakes throwaway state into it -- a
// `PX=0bc6` start position, or `mloop: inc pa` for SPIN -- and writing that to the tracked
// path leaves junk in `git status` that gets swept into the next stash or commit. It has
// happened. Diagnostic builds therefore emit to an ignored side path; labels are still
// there to look up, the tracked reference just stays honest.
const asmPath = DIAG.length ? './iray.diag.asm' : './iray.asm';
writeFileSync(asmPath, asm);
try {
  const r = assemble(asm);
  // Layout guard. The old version only checked the charset, which is why buffer B at
  // $2000 silently ate the tail of patTab for weeks: a screen buffer looks like free RAM
  // to the assembler but is rewritten every frame. Check every region the data segment
  // must not touch, and name the overlap so the next collision is a build error rather
  // than a glitch three cell-rows wide near the horizon.
  // Bank 0 holds no VIC data any more -- the screens and charsets are in bank 3 -- so what the
  // growing data segment can still collide with is the charset SOURCE it is loaded alongside,
  // and the f-tables between the two halves of it.
  // The f-tables used to be reserved here as well, at $3000-$37ff. They moved up to
  // RELOC and the reservation stayed, so the build defended 2KB that held nothing and capped the
  // code at $3000. Reserving a region for a tenant that has left is worse than not checking:
  // the guard's existence is what stops anyone asking whether the region is still needed.
  // Nothing is reserved in the image for graphics now: the charset is a separate segment placed at
  // $d000 by the loader, and bank 3 holds no CPU data. The list is kept (empty) rather than deleted
  // because the NEXT thing shipped as a segment -- sprites -- will want the same check if it ever
  // needs a staging area inside the image.
  const reserved = [];
  if (r.labels.chainEnd > HTABLE)
    throw new Error(`fill chains end at $${r.labels.chainEnd.toString(16)}, past the height tables at $${HTABLE.toString(16)}`);
  // LABELS=<substr> prints matching label addresses, so a debugger can be pointed at a routine
  // without hand-assembling. The listing has the labels; only the assembler knows their addresses.
  if (process.env.LABELS)
    for (const [k, v] of Object.entries(r.labels).sort((a, b) => a[1] - b[1]))
      if (k.toLowerCase().includes(process.env.LABELS.toLowerCase()))
        console.log(`  label ${k} = $${v.toString(16)}`);
  const dataLo = r.org, dataHi = r.labels.dataEnd;
  for (const [name, lo, hi] of reserved) {
    if (dataLo < hi && dataHi > lo) {
      throw new Error(`data segment $${dataLo.toString(16)}-$${dataHi.toString(16)} overlaps ${name} ` +
        `$${lo.toString(16)}-$${hi.toString(16)} by ${Math.min(dataHi, hi) - Math.max(dataLo, lo)} bytes ` +
        `(move tables above the f-tables)`);
    }
  }
  // The charset ships as a raw binary for the loader to place, not as part of the image.
  writeFileSync('./iray-charset.bin', Buffer.from(fontA));
  // Same for the sprite bitmaps, which go to $c000 -- the first of VIC bank 3's free slots.
  // They were at $2000 in bank 0 before the bank-3 move, competing with code for address space;
  // now they are graphics living in the graphics bank, which is what bank 3 is for.
  if (SPRITES) writeFileSync('./iray-sprites.bin', Buffer.from(ORBBM.flat()));
  writeFileSync('./iray.prg', Buffer.from(r.prg));
  const d = D64.createEmpty('IRAY', '01');
  d.writeFile('IMAZE'.padEnd(6) + '/PRG', r.prg, D64.FILE_TYPE_PRG);
  // Single canonical disk. Every build overwrites it, so "the disk in the project root"
  // is always the current build -- no -ntsc/-merge/foundation variants to get stale and
  // mislead. iray.asm/iray.prg are the matching support files for diffing and label lookup.
  writeFileSync('./latest.d64', Buffer.from(d.getData()));
  // SELFEXT=1: package as a COMPRESSED self-extracting PRG instead of a load-in-place image.
  //
  // Why this is the direction and not a size trick: a load-in-place image must be ONE contiguous
  // run that the KERNAL can write with I/O mapped, which is what forces the charset to be shipped
  // as a low "source" and copied up by cpChr, and what makes every hole in the image dead weight
  // in the file. A decompressing loader places each element wherever we want -- including straight
  // into $d000-$dfff, which LOAD can never reach.
  //
  // selfext.mjs is vendored from ~/GMC64/code UNCHANGED except its d64lib path. It is VICE-verified
  // byte-exact upstream on a 57KB image spanning the I/O hole, so it is invoked as a subprocess
  // rather than forked into this file: a verified packer that drifts is worth less than one that is
  // slightly awkward to call.
  // NOT optional any more, and NOSELFEXT is a debugging escape hatch that produces a disk which
  // CANNOT RENDER: the charset is no longer in the image, so a plain load leaves $d000 full of
  // whatever was there. It exists only to inspect the uncompressed image quickly.
  if (!process.env.NOSELFEXT) {
    const { execSync } = await import('child_process');
    const out = execSync('node ./selfext.mjs ./iray.prg ./iray-c.prg ' +
                         '--seg d000:./iray-charset.bin' +
                         (SPRITES ? ' --seg c000:./iray-sprites.bin' : ''), { encoding: 'utf8' });
    console.log(out.trim());
    writeFileSync('./latest.d64', readFileSync('./iray-c.d64'));
    console.log('latest.d64 is the COMPRESSED self-extracting build');
  }
  // Say how much room is left below the screen buffer. The data segment has nowhere to
  // grow -- charset A is at $3000 and buffer B sits in the way at $2400 -- so this going
  // quiet is the difference between a build error and a frame-by-frame corruption.
  // Zero page is packed tight and several variables are two bytes wide, so a new equate
  // can silently land on someone's high byte. bcnt did exactly that -- it sat on py+1, the
  // player's Y cell -- and the symptom was the whole screen filling with wall. Comparing
  // equate addresses is not enough; the extents have to be checked.
  {
    const zp = {}, two = new Set();
    for (const m of asm.matchAll(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\$([0-9a-fA-F]{1,2})\s*(?:;.*)?$/gm)) {
      const a = parseInt(m[2], 16); if (a < 0x100) zp[m[1]] = a;
    }
    // strip comments first: "boundaries at uaH+1 .. ubH" in prose is not a reference
    const code = asm.split('\n').map(l => l.replace(/;.*$/, '')).join('\n');
    for (const n of Object.keys(zp)) if (new RegExp(`\\b${n}\\+1\\b`).test(code)) two.add(n);
    // If a future pass wants to share zero page with seamSpan's scratch, note where the trap
    // is: mul8's own mp/mq/plo/phi sit at $98-$9b in the middle of that range and are live
    // inside every jsr mul8. The orb pass shared them once and each multiply ate its own inputs.
    // The same collision check for the $cb00 scratch block. Zero page has been guarded for a
    // while; this block has not, and two variables quietly shared $cb21 for several commits.
    {
      const own = {};
      for (const m of asm.matchAll(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\$(cb[0-9a-fA-F]{2})\s*(?:;.*)?$/gm)) {
        const a = parseInt(m[2], 16);
        if (own[a] && own[a] !== m[1])
          throw new Error(`$${m[2]} claimed by both ${own[a]} and ${m[1]}`);
        own[a] = m[1];
      }
    }
    const ZPSHARED = new Set();
    for (let a = 0x87; a <= 0x97; a++) ZPSHARED.add(a);
    for (let a = 0x9c; a <= 0x9f; a++) ZPSHARED.add(a);
    const owner = {};
    for (const [n, a] of Object.entries(zp)) {
      for (const b of two.has(n) ? [a, a + 1] : [a]) {
        if (owner[b] && owner[b] !== n && !ZPSHARED.has(b))
          throw new Error(`zero page $${b.toString(16)} claimed by both ${owner[b]} and ${n}` +
            (two.has(owner[b]) || two.has(n) ? ' (one of them is two bytes wide)' : ''));
        owner[b] = n;
      }
    }
  }
  // An "lda table,x" indexed by a full byte costs an extra cycle every time the index
  // crosses a page. These are the ones indexed that way; keeping them page-aligned is free
  // as long as nobody quietly moves them, so make moving them a build error.
  const aligned = { mapT: 256, f0LoT: 256, f0HiT: 256, f1LoT: 256, f1HiT: 256,
    runWT: 256, runET: 256, runNT: 256, runST: 256, rbT: 256, rsT: 256,
    ddxLoT: 256, ddxHiT: 256, ddyLoT: 256, ddyHiT: 256, posXT: 256, posYT: 256,
    rayOffT: NLOG, colGrpT: NLOG, clampT: 256, clmp16: 256 };
  for (const [t, n] of Object.entries(aligned)) {
    const a = r.labels[t];
    if (a === undefined) continue;
    if (((a & 255) + n - 1) > 255)
      throw new Error(`${t} at $${a.toString(16)} spans a page boundary; every indexed read ` +
        `past $${((a | 255) + 1).toString(16)} costs an extra cycle (page-align it)`);
  }
  // What is left in VIC BANK 3 for sprites. Sprite data is 64 bytes on a 64-byte boundary, so
  // this is the number that decides how many sprites an object pass can have. No char-ROM window
  // to cut out any more -- that shadow is banks 0 and 2 only, which is half the reason for moving.
  //
  // Occupied: the two screens, the two charsets under the I/O hole, and $fffa-$ffff, which the VIC
  // would happily read but which we write the NMI and IRQ vectors into -- so graphics placed there
  // would have six bytes punched out of it.
  // ...and any CPU equate still squatting in the bank. Bank 3 is meant to be graphics-only; until
  // every one of these is evicted the free figure would be a lie, and a lie in the direction that
  // gets sprite data written over the span stack.
  const squatters = [...asm.matchAll(/^([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*\$([0-9a-fA-F]+)/gm)]
    .map(m => [m[1], parseInt(m[2], 16)])
    .filter(([n, a]) => a >= VBANK && a < 0xfffa && n !== 'charset' && n !== 'charsetB');
  const used = [[SCR_A, SCR_A + 0x400], [SCR_B, SCR_B + 0x400],
                [CHARSET, CHARSET + 0x800], [CHARSET_B, CHARSET_B + 0x800],
                [0xfffa, 0x10000],
                // a squatter's extent is unknown, so reserve to the next page boundary
                ...squatters.map(([, a]) => [a & ~255, (a & ~255) + 256]),
               ].sort((a, b) => a[0] - b[0]);
  if (squatters.length) console.log(`  bank 3 still has ${squatters.length} CPU equate(s) in it ` +
    `($${Math.min(...squatters.map(x => x[1])).toString(16)}-` +
    `$${Math.max(...squatters.map(x => x[1])).toString(16)}) -- not yet graphics-only`);
  const gaps = []; let at = VBANK;
  for (const [lo, hi] of used) { if (lo > at) gaps.push([at, lo]); at = Math.max(at, hi); }
  if (at < 0x10000) gaps.push([at, 0x10000]);
  const bank3 = gaps.map(([lo, hi]) => [(lo + 63) & ~63, hi]).filter(([lo, hi]) => hi > lo);
  const free = bank3.reduce((a, [lo, hi]) => a + (hi - lo), 0);
  // ---- the free-space picture, in one place ----
  // Report the FIRST thing the code block would hit as it grows, not an assumed one. This used to
  // print CHARSRC - dataEnd unconditionally and so overstated the room by 1,024 bytes for as long
  // as arrays sat in the filler at $2400. A headroom figure nobody can trust is worse than none:
  // it is the number you consult before deciding a feature fits.
  //
  // Then every HOLE in the image. These are what makes the total free space larger than the code's
  // headroom and yet mostly unspendable: a hole is only usable by whoever it is adjacent to. That
  // gap between "free" and "usable" is the whole argument for allocating the data heap downward
  // from $c000, so it is worth printing rather than reasoning about.
  {
    const de = r.labels.dataEnd;
    const eqs = [...asm.matchAll(/^([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*\$([0-9a-fA-F]{4})/gm)]
      .map(m => [m[1], parseInt(m[2], 16)]);
    // The ceiling is wherever the hole above the code ENDS -- i.e. the next emitted byte -- or the
    // first array parked inside that hole, whichever comes first. Deriving it from a constant is
    // what made this report wrong twice: once when arrays sat in the filler, once when the constant
    // outlived the data it named.
    const gap = (r.holes ?? []).find(([lo, hi]) => de >= lo && de < hi) ?? [de, de];
    const obst = eqs.filter(([, a]) => a > de && a < gap[1]).sort((x, y) => x[1] - y[1])[0];
    const [what, at] = obst ?? ['the next emitted table', gap[1]];
    console.log(`code headroom: ${at - de} bytes  ($${de.toString(16)} -> ` +
                `$${at.toString(16)}, ${what})`);
    // A hole is only real free space if no RAM equate already lives in it -- the arrays in the
    // reclaimed charset source are exactly that case, and counting them as free is the mistake
    // the old headroom line made.
    const holes = (r.holes ?? []).map(([lo, hi]) => {
      const squatters = eqs.filter(([, a]) => a >= lo && a < hi).map(([n]) => n);
      return [lo, hi, squatters];
    });
    const spendable = holes.filter(h => !h[2].length).reduce((a, [lo, hi]) => a + (hi - lo), 0);
    console.log(`image holes: ${holes.length}, ${spendable} bytes with nothing living in them` +
                ` (+ ${VBANK - r.end} bytes above the image, below $c000)`);
    for (const [lo, hi, sq] of holes)
      console.log(`  $${lo.toString(16)}-$${(hi - 1).toString(16)}  ${String(hi - lo).padStart(5)}` +
                  `  ${sq.length ? 'holds ' + sq.slice(0, 6).join(' ') + (sq.length > 6 ? ' ...' : '')
                                 : '(free)'}`);
    console.log(`TOTAL SPENDABLE: ${spendable + (VBANK - r.end)} bytes, in ` +
                `${holes.filter(h => !h[2].length).length + 1} fragments`);
  }
  console.log(`VIC bank 3 free: ${bank3.map(([lo, hi]) =>
    `$${lo.toString(16)}-$${(hi - 1).toString(16)}`).join(', ')}` +
    `  = ${free} bytes, ${free >> 6} sprite slots`);
  // $a000-$bfff is BASIC ROM unless LORAM is cleared, and $d000-$dfff is I/O no matter what.
  // Reading a table through either returns something other than what was written there.
  // ---- no RAM equate may sit inside the emitted image ----
  // The assembler catches emitted-vs-emitted overlap ("* = $x moves backward") and there is a
  // separate zero-page collision checker, but nothing checked emitted DATA against a RAM EQUATE --
  // an equate has no origin, so there is nothing to move backward from. That gap cost a day: a
  // table emitted at $c000 was perfect on disk and shredded within one frame, because $c000 is
  // stackLT, the subdivision's span stack. It then immediately found a second, latent one: the
  // PROFILE build's profiler spilling past $c000 into the same place.
  // Sabotage-test it by moving stackLT to $b000; it must fire.
  {
    // Deliberate overlaps, each for a stated reason -- the ; DEADCODE-OK pattern applied to layout.
    // Anything NOT listed that lands in the image is a real bug: the program writes over RAM the
    // loader filled with data, so it works for one frame and not the next.
    const OK = {
    };
    // ONE documented region rather than seventy-five individual exceptions. $3000-$37ff is bank 0's
    // post-startup RAM: the charset source itself, which cpChr consumes at startup.
    //
    // It used to start at $2400, taking in the image's filler as well -- but arrays living in the
    // filler are arrays living in the code's growth room, which is what hid the real 738-byte
    // ceiling. The region is now exactly the reclaimed source, so the guard's lower bound and the
    // code's upper bound are the same number and neither can drift without the other noticing.
    //
    // An equate inside the image is fine in exactly one case: it lies in a HOLE -- a range the
    // assembler pads rather than fills. A hole is the ideal home for per-frame RAM, and strictly
    // better than the charset source the arrays used to sit in:
    //
    //   - the charset source needs an ORDERING invariant ("nothing may touch $3000-$37ff before
    //     cpChr has run"), which is invisible at the point of use and breaks as corrupt graphics;
    //   - a hole needs nothing. The loader writes zeros there and no code ever reads it.
    //
    // So the region rule is gone, and with it the reason cpChr had to be the first thing init
    // does. This checks the assembler's ACTUAL holes rather than a hand-maintained range, which
    // means a table growing into an array's page is a build error the day it happens: the hole
    // shrinks, the equate is no longer covered, and the message below names it.
    // ---- do the arrays overlap EACH OTHER? ----
    // Nothing checked this until it bit twice in one sitting: relocating the arrays by hand put
    // bndT exactly on top of faceIdT, and colW 0x23 bytes inside remLoT. Both builds were clean --
    // the zero-page checker only covers zero page, deadvars sees reads and writes rather than
    // addresses, and the hole rule below is satisfied by BOTH of two overlapping arrays. It showed
    // up as 14,000 wrong pixels across six views with no hint of where to look.
    //
    // Sizes have to be declared because an equate carries none. Only multi-byte arrays need an
    // entry; everything else is assumed to be one byte, which is the common case and the safe
    // default (a missed entry under-reports, it never invents an overlap).
    const SIZES = {
      stackLT: 128, stackRT: 128, sideT: 256, idT: 256, colH: 256,
      faceIdT: 256, remLoT: 256, remHiT: 256,
      cwA: 40, cwB: 40, cbA: 40, cbB: 40, cstepT: 40, seamT: 40,
      bndT: NBND, pvBnd: NBND, pvAng: NBND, pvRcp: NBND,
      cqLo: 64, cqHi: 64, cqCol: 64,
      pfAcc: 39,                       // 13 phases x 3 bytes
      rayAcc: 2, edgAcc: 2, chnAcc: 2, // RAYCNT: 256 frames summed, so the HIGH byte is the mean
      tourF: 2,                        // TOUR: frames elapsed, for the 512-frame freeze
    };
    {
      const all = [...asm.matchAll(/^([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*\$([0-9a-fA-F]+)\s*(?:;.*)?$/gm)]
        .map(m => [m[1], parseInt(m[2], 16)]).filter(([, a]) => a >= 0x0400)
        .map(([n, a]) => [n, a, SIZES[n] ?? 1]).sort((x, y) => x[1] - y[1]);
      for (let i = 1; i < all.length; i++) {
        const [pn, pa, ps] = all[i - 1], [n, a, sz] = all[i];
        if (a < pa + ps) throw new Error(
          `RAM overlap: ${n}=$${a.toString(16)} (${sz}B) starts inside ${pn}=$${pa.toString(16)} ` +
          `(${ps}B, through $${(pa + ps - 1).toString(16)}). One of them is silently corrupting the ` +
          `other every frame.`);
      }
    }
    const holes = r.holes ?? [];
    const inHole = (a, n) => holes.some(([lo, hi]) => a >= lo && a + n <= hi);
    const eq = [...asm.matchAll(/^([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*\$([0-9a-fA-F]+)\s*(?:;.*)?$/gm)]
      .map(m => [m[1], parseInt(m[2], 16)])
      .filter(([n, a]) => a >= 0x0400 && !(n in OK));
    const clash = eq.filter(([, a]) => a >= r.org && a < r.end && !inHole(a, 1));
    if (clash.length) throw new Error(
      `${clash.length} RAM equate(s) sit inside the emitted image $${r.org.toString(16)}-` +
      `$${r.end.toString(16)} and NOT in one of its ${holes.length} holes, so the program's own ` +
      `writes will overwrite emitted data: ` +
      clash.slice(0, 6).map(([n, a]) => `${n}=$${a.toString(16)}`).join(', ') +
      `${clash.length > 6 ? ', ...' : ''}`);
  }
  // The image must stop at $c000. It used to be $d000 (past which LOAD would write I/O registers
  // rather than memory) but bank 3 is graphics-only now, so $c000 is the real wall -- and it is the
  // number that will tell us the day a compressed loader becomes necessary rather than optional.
  if (r.end > VBANK) throw new Error(
    `program ends at $${r.end.toString(16)}, past $${VBANK.toString(16)} -- bank 3 is graphics-only. ` +
    `${r.end - VBANK} bytes over; the single-load ceiling is $0801-$bfff (47.5KB).`);
  console.log(`ok: rays=${NLOG} org=$${r.org.toString(16)} end=$${r.end.toString(16)} bytes=${r.bytes.length} -> latest.d64`
    + (DIAG.length ? `\nDIAGNOSTIC BUILD [${DIAG.join(' ')}] -- asm to ${asmPath}, not for fps numbers` : ''));
} catch (e) { console.error('ASM ERROR:', e.message); process.exit(1); }
