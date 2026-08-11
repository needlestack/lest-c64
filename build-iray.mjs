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
// MOVE_SHIFT, so the effective rate is 64 >> 4 = 4 units of 1/256 cell per tick = 0.94 cells
// a second. Round numbers rather than exact ones: neither constant costs anything at runtime
// (the table is built here, the rate is an immediate), so there is no reason to carry 68 and
// 4.25 around for the last 6%. Keeping the table at 64 rather than 4 is what stops the
// DIRECTION quantising -- cos(a)*4 rounds to five levels and you walk visibly off-axis -- and
// 64 leaves headroom under the signed-byte limit the entries have to fit.
const MOVE_STEP = 64, MOVE_SHIFT = 4;
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
// Wall pixels are bit pair 11, which takes its colour from the low 3 bits of colour RAM. That
// is written once at startup to $08 -- multicolor on, colour black -- and never touched again,
// so the walls cost no colour-RAM traffic at all. Pair 01 ($d022) is also black and is now
// unused by the cell codes; it stays black so the two are interchangeable if anything wants it.
// A pattern is four column heights 0..8, and the glyph is just those four columns filled from
// the bottom -- one ink for the whole cell, so a shape's code depends on its SHAPE alone.
const FGPX = [0xc0, 0x30, 0x0c, 0x03];
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
  // wall columns are 11 normally, but 01 under PLAN=2 -- see the SOLID note above
  const wall = +(process.env.PLAN ?? 0) === 2 ? 1 : 3;
  const row = [0, 1, 2, 3].reduce((b, i) => b | ((i === k ? 2 : wall) << (6 - 2 * i)), 0);
  glyphs.push(new Array(8).fill(row));
}
if (glyphs.length > 256) throw new Error(`charset overflow: ${CELLCODES} cell patterns + ${NGLYPH} glyphs + 4 seams = ${glyphs.length} > 256`);
console.error(`charset: ${CELLCODES} cell codes + ${NGLYPH} readout glyphs + 4 seam = ${glyphs.length}/256` +
  `  -- ${256 - glyphs.length} free`);
// Ramps and steps share one placement pass (so pairing can mate a ramp with a step), which
// means there is no contiguous "steps" range to report -- they interleave by frequency.
console.error(`  codes: 0 BLANK, 1 SOLID, 2-${CELLCODES-1} ramps+steps interleaved, ` +
              `${GLYPH0}-${GLYPH0+NGLYPH-1} readout, ${SEAM0}-${SEAM0+3} seam`);
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
    rampThr: PLAN === 3 ? [...Array(256)].map((_, i) => planThr.get('r' + i) ?? 0) : null,
    stepThr: PLAN === 3 ? [0, 1, 2].map(k => [...Array(SLOTN)].map((_, i) => planThr.get(`s${k}.${i}`) ?? 0)) : null,
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
// fraction carries between frames instead of being lost. 3/4 of a unit per tick * 60 ticks =
// 45 units a second = 63 degrees.
const TURN_RATE = 192;          // 3/4 of an angle unit per tick
// Ticks. The cap exists so a hitch cannot step far enough to jump a wall: at 4 units of 1/256
// cell per tick, 32 ticks is half a cell against walls a whole cell thick, and the collision
// box catches anything that lands inside one. It has to clear the 4x run multiplier too, or
// running would silently stop scaling with frame rate below about 15 fps.
const DT_MAX = 32;
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
const SEAMCOL = +(process.env.SEAMCOL ?? 11);   // $d023: 11 = dark grey (grey 1), 1 = white
const SEAMS = process.env.SEAMS !== '0';
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
// VIC bank 0 is now EXACTLY full -- two screen buffers, two charsets and the f-tables
// leave no free 1K/2K-aligned slot. Any new table must live above $4000 (see NEWTABLES).
const SCR_A = 0x0400;
const SCR_B = 0x2400;
const CHARSET = 0x2800;                 // charset A: upright glyphs, used above the horizon
const FTABLES = 0x3000;                 // f0Lo/f0Hi/f1Lo/f1Hi + run-id tables
const CHARSET_B = 0x3800;               // charset B: every glyph flipped vertically
const NEWTABLES = 0x4000;               // clampT / rampT / stepT, outside VIC bank 0
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
// $d018: bits 7-4 = video matrix / 1024, bits 3-1 = charset / 2048
const vm = scr => (scr >> 10) << 4;
const cb = cs => (cs >> 11) << 1;
const CB_A = cb(CHARSET), CB_B = cb(CHARSET_B);
// Raster line of the horizon. The 25-row display window starts at raster 51, so logical
// row 100 is raster 151; arm the split one line early so the swap lands before that line's
// character fetch.
const SPLITLINE = 150;
const hx = n => '$' + n.toString(16).padStart(2, '0');
const hx16 = n => '$' + n.toString(16).padStart(4, '0');

const asm = `
charset = ${hx(CHARSET)}
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
paF     = $cb5b                  ; low byte of the 16-bit player angle; pa is the high
dtv     = $cb50
dtm     = $cb59                  ; elapsed ticks scaled for movement, and for turning
dtt     = $cb5a
lastMv  = $cb51
dxs     = $cb52
dxsH    = $cb53
dys     = $cb54
dysH    = $cb55
dxSgn   = $cb56
dySgn   = $cb57
rowv    = $cb58                  ; keyboard row 1, held so SHIFT/E/S read it once
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
stackLT = $c000
stackRT = $c080
; per-logical-column arrays, now 160 entries each (was 80). Page-aligned so a column
; index never needs a 16-bit add.
sideT   = $c100
idT     = $c200
colH    = $c300
cwA     = $c500                 ; per cell-column: the ceiling run length this buffer holds
cwB     = $c528
cbA     = $c550                 ; ... and the solid run start, or $ff for "always redraw"
cbB     = $c578
faceIdT = $c400
cstepT  = $c680                 ; per cell-column (40): face-boundary column, 0 = none
bidx    = $cbf0                ; PLAN=2: the bucket index the code came from, and which
thsel   = $cbf1                 ; threshold table to read it out of (0 = ramp, 1..3 = step k)
paqL    = $cbf6                 ; FINEANG: pa*4 as a 10-bit value, formed ONCE a frame
paqH    = $cbf7
rqL     = $cbf8                 ; and this ray's 10-bit angle: rqL is the table index,
rqH     = $cbfc                 ; rqH (0..3) picks which quarter of the 1024-entry table.
                                ; It was declared TWICE, at $cbf9 and here; the assembler takes
                                ; the last, so $cbf9 was never the live one. Removed rather
                                ; than left as a trap for the next reader.
cqtmp   = $cbf2                 ; the colour this cell needs, while both its rows are queued
cmtmp   = $cbf4                 ; PLAN=3: calcM scratch, and the m it returns. m = w1 + w2 is
cmv     = $cbf5                 ; the ninth index bit -- the two columns the bucket throws away
cqN     = $cbf3                 ; entries in the colour queue
cqp     = $3e                   ; 2 bytes: colour RAM pointer, flush only
cqLo    = $cc00                 ; colour queue: address low, high, and the value to write.
cqHi    = $cc40                 ; Written after the buffer flip, never inline -- colour RAM is
cqCol   = $cc80                 ; NOT double buffered, so an inline write repaints the frame
                                ; still on screen. That is the shimmer the old pairing hit.
pfAcc   = $c900                 ; PROFILE: 13 phases x 3 bytes, raster lines summed
pfPrvF  = $c930                 ; previous timestamp: frame counter, then raster line
pfPrvL  = $c932
pfCurH  = $c936                 ; ninth raster bit, current and previous
pfPrvH  = $c937
pfTmp   = $c938
pfTmp2  = $c939
pfN     = $c93c                 ; frames accumulated so far (2 bytes)
pfCurF  = $c93a                 ; scratch for one timestamp read and the delta
pfCurL  = $c93b
pfCurX  = $c93f
pfDLo   = $c93d
pfDHi   = $c93e
pfRow   = $c934
pfDone  = $c935
seamT   = $c6c0                 ; per cell-column (40): char code for the solid run --
                                ;   SOLID, or a seam variant when a panel line lands here
${PIVOT ? `; ---- PIVOT state: last frame's boundaries, and the viewpoint they were seen from ----
; Three ${hx(NBND)}-byte arrays in the page splitT used to hold. Read ENTIRELY by pivPrep at the
; top of the frame and only written afterwards, as the search pins this frame's boundaries --
; so one buffer is enough and no copy is needed.
pvBnd   = ${hx16(RELOC + 0x2700)}             ; the column the boundary was pinned at
pvAng   = ${hx16(RELOC + 0x2700 + NBND)}             ; its WORLD bearing as a byte angle, pa + rayOffT[col]
pvRcp   = ${hx16(RELOC + 0x2700 + 2 * NBND)}             ; 163/distance, for the translation term
pvN     = $cb00                 ; how many of them there are; 0 disables the hint for a frame
opaL    = $cb01                 ; the 16-bit angle those bearings were taken at
opaH    = $cb02
opxL    = $cb03                 ; ... and the position, so the translation term has a delta
opxH    = $cb04
opyL    = $cb05
opyH    = $cb06
dqa     = $cb07                 ; this frame's rotation, quarter-units, signed
pvDX    = $cb08                 ; this frame's translation, 1/256 cells, signed bytes.
pvDY    = $cb09                 ;   NOT dxv/dyv -- interpSpan already owns those as its
                                ;   Bresenham span width and error step.
pvI     = $cb0a                 ; index while walking the hints, and the last cut emitted
pvLast  = $cb0b
pvTL    = $cb0c                 ; the signed 16-bit term, and the top two bytes of the
pvTH    = $cb0d                 ;   24-bit product it feeds
pvPH    = $cb0e
pvPB    = $cb0f
pvSgn   = $cb10                 ; sign of the term, carried around the unsigned multiply
pvI2    = $cb11                 ; the hint index, saved across mul8 (which needs X)
pvYs    = $cb12                 ; the bearing, saved across the first multiply
` : ''}${RAYCNT ? `; RAYCNT diagnostics. Declared OUTSIDE the PIVOT block: a RAYCNT build with PIVOT=0 is the
; baseline half of the comparison, and gating these on PIVOT made that build fail to assemble --
; which left latest.d64 holding the PREVIOUS disk and reported the default viewpoint as if it
; were the one asked for. Silent, and exactly the trap the RELOC comment warns about.
rayN    = $cb14                 ; marchCol calls this frame
rayAcc  = $cb15                 ; 2 bytes: 256 frames of rayN. The HIGH byte is then the mean,
rayFrm  = $cb17                 ; for free -- the same trick the profiler uses
rayMean = $cb18
pvNdbg  = $cb13                 ; pvN as pivPrep saw it, before pivPrep clears it
` : ''}${TOUR ? `tourC   = $cb19                 ; TOUR phase counter
` : ''}bndT    = $ca00                 ; columns where a face or saturation state begins (${hx(NBND)} max)
remLoT  = $c700                 ; per marched column: castRay's raw hit distance, 8.8 cells.
remHiT  = $c800                 ;   Parked so u can be derived later, only where it is needed.

        * = $0801
        !byte $0c,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
entry:
        sei
        lda #$36                ; LORAM off: BASIC ROM out, so $a000-$bfff reads the RAM the
        sta $01                 ; program was loaded into. The relocated tables have grown past
                                ; $a000 and were silently reading ROM -- step patterns came back
                                ; as BASIC bytes, so corners picked nonsense and flickered.
                                ; KERNAL and I/O stay mapped.
        lda #$00
        sta $d01a
        lda $dd00
        ora #$03
        sta $dd00
        lda #$1b
        sta $d011
        lda #$18
        sta $d016               ; MCM: multicolor text -> 4 logical px per cell, 2 physical px each
        lda #${hx(vm(SCR_A))}
        sta d018vm              ; display buffer A; IRQ ORs the charset bits per half-screen
        lda #${hx(vm(SCR_A) | CB_A)}
        sta $d018
        lda #$01
        sta $d021               ; 00 = white  (ceiling / floor)
        lda #$00
        sta $d022               ; 01 = black  (readout glyphs only; walls are 11, via colour RAM)
        lda #${hx(SEAMCOL)}
        sta $d023               ; 10 = panel seam. Its own register precisely so the tone can
                                ; be retuned without touching a charset entry: bit pairs 00
                                ; and 01 carry the shape, 10 carries only the seam.
        lda #$00
        sta $d020
        lda #$ff
        sta $dc02
        lda #$00
        sta $dc03
        ldx #$00
        ldx #$00                ; no run cached for either buffer yet -- an uninitialised
        lda #$ff                ; cache byte that happens to match rb or rs would leave a
rfCz:   sta cwA,x               ; column never drawn at all
        inx
        bne rfCz
        lda #$08                ; bit3 = per-cell multicolor enable, low three bits = the
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
        lda #<irq
        sta $0314
        lda #>irq
        sta $0315
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
${PROFILE ? '        ldx #6\n        jsr pfTick              ; closes the raster wait\n' : ''}        jsr tickDelta
        ${TOUR ? 'jsr tourStep' : SPIN ? 'jsr spinStep' : WALK ? 'jsr moveFwd' : STRAFE ? 'jsr strafeR' : BACK ? 'jsr moveBack' : 'jsr readKeys'}
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
${RAYCNT ? '        sta rayN\n' : ''}
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
        lda spanL
        tax
        lda faceIdT,x
        tax                     ; X = the run on this side
        ldy spanR
        lda faceIdT,y           ; A = the run on the other side
        cmp cpLoT,x
        beq subCv
        cmp cpHiT,x
        bne subCn               ; not a concave partner: convex silhouette, draw nothing
subCv:  lda spanR
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
        ; Kept SORTED by column, by insertion. The subdivision discovers boundaries in stack
        ; order, not left to right, and pivPrep needs them ascending: it walks them once,
        ; emitting cuts, and drops any that would not increase. Unsorted, almost every hint
        ; failed that test and the frame silently fell back to plain bisection -- which is
        ; exactly what the first measurement showed, 26 rays with the pivot and 26 without.
        ; (The JS model hid this: it called .sort() on the cut list, so it was measuring an
        ; ordering the 6502 never had.) ~6 entries, so insertion is a few hundred cycles.
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
        bcc pvInsD              ; found the slot: everything left of it is smaller
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
        bne subLp               ; first boundary in a cell wins, as the old adjacent-pair scan did
        lda tmp
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
subDn:  lda #$00                ; the first face always starts at column 0
        sta spanL
        sta bcur
        lda nbnd
        beq subOne              ; no delimiters: the whole screen is one face
        cmp #$02
        bcc subEmt              ; one delimiter needs no sorting
        ldx nbnd                ; bubble the handful of delimiters into column order
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
subEmt: ldx bcur
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
        lda #$00
        sta col
        jsr marchCol
        lda #${NLOG - 1}
        sta col
        jsr marchCol
        lda #$00
        sta sp
        sta pvLast
        sta pvI
${RAYCNT ? '        lda pvN\n        sta pvNdbg\n' : ''}pivLp:  lda pvI
        cmp pvN
        bcs pivEnd
        ldx pvI
        jsr pivOne              ; A = where hint X is predicted to be now
        cmp pvLast
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
pivNx:  inc pvI
        bne pivLp               ; always: pvI < NBND
pivEnd: lda #${hx(NLOG - 1)}    ; the last span always runs to the right edge
        jsr pivPush
        lda #$00
        sta pvN                 ; this frame records its own boundaries from scratch
        rts

; march column A, then push the span (pvLast, A) and make A the new pvLast
pivCut: pha
        sta col
        jsr marchCol
        pla
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
        ldy pvAng,x
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
        ldx pvI2                ; + rayOffQS[col], sign-extended
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
${PROFILE && !PROFILE1 ? '        ldx #2\n        jsr pfTick              ; cast + interpolate + seams (prepCells is folded in here)\n' : ''}${NOFILL ? '' : '        jsr renderSym'}
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
` : ''}        inc iterLo
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
        ldy col4T,x             ; first logical column of this cell; colH is page-aligned, so
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
        sta tmp2
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
        cmp #$00
        beq rfEdge
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
${NOEDGE ? `        lda #${hx(SOLID)}
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
        ldx colc
        lda cstepT,x
        bne rfStep
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
        sty bidx
        jsr calcM
        ldy bidx
        cmp rampThrT,y
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
` : ''}${PLAN === 3 ? `        sty bidx
        jsr calcM
        sta cmv                 ; m survives the kpos dispatch below
        ldy bidx
` : ''}        lda kpos
        cmp #$02
        beq rfSt2
        bcs rfSt3
${PLAN === 3 ? `        lda cmv
        cmp stepThrT1,y
        bcs st1h
        lda stepT1lo,y
        jmp rfStore
st1h:   lda stepT1hi,y
        jmp rfStore
rfSt2:  lda cmv
        cmp stepThrT2,y
        bcs st2h
        lda stepT2lo,y
        jmp rfStore
st2h:   lda stepT2hi,y
        jmp rfStore
rfSt3:  lda cmv
        cmp stepThrT3,y
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
rfSolid:${SEAMS ? `lda seamT,x
        cmp #${hx(SOLID)}       ; the frame's default. A seam variant can change without rs
        bne rfSlSm              ; moving, so a seam column is never cached
        ` : ''}lda rsv
rfCb1:  cmp cbA,x
        beq rfNext
rfCb2:  sta cbA,x
        jmp rfSlDr
${SEAMS ? `rfSlSm: lda #$ff
rfCb3:  sta cbA,x               ; a value rs can never take, so next frame redraws too
` : ''}rfSlDr: lda rsv
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
        inc pa
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

readKeys:
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
        ; LEFT SHIFT: run. 3 cells/s and 120 deg/s, against 1 and 60 walking -- movement and
        ; turning get their own multipliers so running does not spin the world faster than it
        ; moves through it. Scaling elapsed TIME rather than the step keeps both frame-rate
        ; independent for free.
        lda dtv
        asl
        clc
        adc dtv                 ; 3x movement
        bcs rkShMc
        cmp #${DT_MAX}
        bcc rkShM
rkShMc: lda #${DT_MAX}
rkShM:  sta dtm
        lda dtv
        asl                     ; 2x turning
        cmp #${DT_MAX}
        bcc rkShT
        lda #${DT_MAX}
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

moveFwd:
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
        ldx #${MOVE_SHIFT}      ; arithmetic shift: cmp #$80 puts bit 7 back into carry
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
        lda px
        sta fr
        lda ddx
        sta mlo
        lda ddxH
        sta mhi
        ; --- sideMul inlined: a jsr/rts pair here is 12 cy a call, 24 a ray, ~770 a
        ; --- frame. Every other caller still uses the subroutine.
        lda fr                  ; --- high half: fr * mhi -> s2:s1 ---
        clc
        adc mhi
        tax
        bcc cxmh0
        lda f1LoT,x
        tay                     ; the low byte rides in Y instead of zero page: this routine
        lda f1HiT,x             ; never used Y at all, and it is the hottest one here
        sta s2
        jmp cxmh1
cxmh0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta s2
cxmh1:   lda fr
        sec
        sbc mhi
        bcs cxmh2
        eor #$ff                ; |fr-mhi|; carry is already clear from the borrow
        adc #$01
cxmh2:   tax
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
        bcc cxml0
        lda f1LoT,x
        tay
        lda f1HiT,x
        sta qhi
        jmp cxml1
cxml0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta qhi
cxml1:   lda fr
        sec
        sbc mlo
        bcs cxml2
        eor #$ff
        adc #$01
cxml2:   tax
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
        lda s1
        sta sdx
        lda s2
        sta sdxH
        jmp cydo
cxpos:  lda #$01
        sta stpX
        sec
        lda ddx
        sbc s1
        sta sdx
        lda ddxH
        sbc s2
        sta sdxH
cydo:   lda py
        sta fr
        lda ddy
        sta mlo
        lda ddyH
        sta mhi
        ; --- sideMul inlined: a jsr/rts pair here is 12 cy a call, 24 a ray, ~770 a
        ; --- frame. Every other caller still uses the subroutine.
        lda fr                  ; --- high half: fr * mhi -> s2:s1 ---
        clc
        adc mhi
        tax
        bcc cymh0
        lda f1LoT,x
        tay                     ; the low byte rides in Y instead of zero page: this routine
        lda f1HiT,x             ; never used Y at all, and it is the hottest one here
        sta s2
        jmp cymh1
cymh0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta s2
cymh1:   lda fr
        sec
        sbc mhi
        bcs cymh2
        eor #$ff                ; |fr-mhi|; carry is already clear from the borrow
        adc #$01
cymh2:   tax
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
        bcc cyml0
        lda f1LoT,x
        tay
        lda f1HiT,x
        sta qhi
        jmp cyml1
cyml0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta qhi
cyml1:   lda fr
        sec
        sbc mlo
        bcs cyml2
        eor #$ff
        adc #$01
cyml2:   tax
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
${DOUBLE === 'sideMulRay' ? '        jsr sideMul\n' : ''}
        lda rqH                 ; sin >= 0 in quarters 0 and 1
        cmp #$02
        bcc cypos
        lda #$ff
        sta stpY
        lda #$f0                ; -16: one cell row back
        sta stpY16
        lda s1
        sta sdy
        lda s2
        sta sdyH
        jmp cydone
cypos:  lda #$01
        sta stpY
        lda #$10                ; +16: one cell row on
        sta stpY16
        sec
        lda ddy
        sbc s1
        sta sdy
        lda ddyH
        sbc s2
        sta sdyH
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
irq:    lda $d019
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
rcNc:   inc rayFrm
        bne rcNd
        lda rayAcc+1
        sta rayMean
        lda #$00
        sta rayAcc
        sta rayAcc+1
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
` : ''}` : ''}ddAng:  lda #$02
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
rampThrT: !byte ${[...Array(256)].map((_, i) => planThr.get('r' + i) ?? 0).join(',')}
stepThrT1: !byte ${[...Array(SLOTN)].map((_, i) => planThr.get('s0.' + i) ?? 0).join(',')}
stepThrT2: !byte ${[...Array(SLOTN)].map((_, i) => planThr.get('s1.' + i) ?? 0).join(',')}
stepThrT3: !byte ${[...Array(SLOTN)].map((_, i) => planThr.get('s2.' + i) ?? 0).join(',')}
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
; sideT / idT / colH are per-frame mutable arrays in scratch RAM at $c100+ (see equates)
dataEnd:                        ; guard: must clear both screen buffers AND the charset -- see the layout check in build-iray.mjs

        * = charset
${chunk(fontA, 32)}

; connected-wall-run id tables (indexed by cell id) live above the f-tables in free RAM

        * = charsetB            ; charset A with every glyph's 8 bytes reversed
${chunk(fontB, 32)}

        * = ${hx16(NEWTABLES)}  ; VIC bank 0 is full -- these live above it
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
cpLoT:  !byte ${cpLo.join(',')}
cpHiT:  !byte ${cpHi.join(',')}
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
rampThrT: !byte ${[...Array(256)].map((_, i) => planThr.get('r' + i) ?? 0).join(',')}
        * = ${hx16(RELOC + 0x3200)}
stepThrT1: !byte ${[...Array(SLOTN)].map((_, i) => planThr.get('s0.' + i) ?? 0).join(',')}
        * = ${hx16(RELOC + 0x3300)}
stepThrT2: !byte ${[...Array(SLOTN)].map((_, i) => planThr.get('s1.' + i) ?? 0).join(',')}
        * = ${hx16(RELOC + 0x3400)}
stepThrT3: !byte ${[...Array(SLOTN)].map((_, i) => planThr.get('s2.' + i) ?? 0).join(',')}
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
        cmp #$0d
        bcc psLp
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
  const reserved = [
    ['screen buffer A', SCR_A, SCR_A + 0x400],
    ['screen buffer B', SCR_B, SCR_B + 0x400],
    ['charset A', CHARSET, CHARSET + 0x800],
    ['f-tables', FTABLES, FTABLES + 0x800],
    ['charset B', CHARSET_B, CHARSET_B + 0x800],
  ];
  if (r.labels.chainEnd > HTABLE)
    throw new Error(`fill chains end at $${r.labels.chainEnd.toString(16)}, past the height tables at $${HTABLE.toString(16)}`);
  const dataLo = r.org, dataHi = r.labels.dataEnd;
  for (const [name, lo, hi] of reserved) {
    if (dataLo < hi && dataHi > lo) {
      throw new Error(`data segment $${dataLo.toString(16)}-$${dataHi.toString(16)} overlaps ${name} ` +
        `$${lo.toString(16)}-$${hi.toString(16)} by ${Math.min(dataHi, hi) - Math.max(dataLo, lo)} bytes ` +
        `(move tables above the f-tables)`);
    }
  }
  writeFileSync('./iray.prg', Buffer.from(r.prg));
  const d = D64.createEmpty('IRAY', '01');
  d.writeFile('IMAZE'.padEnd(6) + '/PRG', r.prg, D64.FILE_TYPE_PRG);
  // Single canonical disk. Every build overwrites it, so "the disk in the project root"
  // is always the current build -- no -ntsc/-merge/foundation variants to get stale and
  // mislead. iray.asm/iray.prg are the matching support files for diffing and label lookup.
  writeFileSync('./latest.d64', Buffer.from(d.getData()));
  // Say how much room is left below the screen buffer. The data segment has nowhere to
  // grow -- charset A is at $2800 and buffer B sits in the way at $2400 -- so this going
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
  // What is left in VIC bank 0. Sprite data has to live here, 64 bytes per sprite on a
  // 64-byte boundary, so this is the number that decides how many sprites a future object
  // pass can have. Nothing in this build uses sprites -- the figure is reported for that.
  // $1000-$1fff is NOT usable for VIC data in banks 0 and 2: the VIC sees the character
  // ROM there regardless of what RAM holds, so sprites or a charset placed in it would
  // display the ROM font. Cut that window out of the free list.
  const CHARROM = [0x1000, 0x2000];
  const gaps = [[r.labels.dataEnd, SCR_B], [CHARSET + 0x800, CHARSET_B]]
    .flatMap(([lo, hi]) => (lo < CHARROM[1] && hi > CHARROM[0])
      ? [[lo, Math.min(hi, CHARROM[0])], [Math.max(lo, CHARROM[1]), hi]] : [[lo, hi]])
    .map(([lo, hi]) => [(lo + 63) & ~63, hi]).filter(([lo, hi]) => hi > lo);
  const free = gaps.reduce((a, [lo, hi]) => a + (hi - lo), 0);
  console.log(`headroom below screen buffer B: ${SCR_B - r.labels.dataEnd} bytes`);
  console.log(`VIC bank 0 free: ${gaps.map(([lo, hi]) =>
    `$${lo.toString(16)}-$${(hi - 1).toString(16)}`).join(', ')}` +
    `  = ${free} bytes, ${free >> 6} sprite slots`);
  // $a000-$bfff is BASIC ROM unless LORAM is cleared, and $d000-$dfff is I/O no matter what.
  // Reading a table through either returns something other than what was written there.
  if (r.end >= 0xd000) throw new Error(
    `program ends at $${r.end.toString(16)}, past $d000 -- that is I/O, not RAM`);
  console.log(`ok: rays=${NLOG} org=$${r.org.toString(16)} end=$${r.end.toString(16)} bytes=${r.bytes.length} -> latest.d64`
    + (DIAG.length ? `\nDIAGNOSTIC BUILD [${DIAG.join(' ')}] -- asm to ${asmPath}, not for fps numbers` : ''));
} catch (e) { console.error('ASM ERROR:', e.message); process.exit(1); }
