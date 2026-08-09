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
import { writeFileSync } from 'fs';
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
const NLOG = 160, FOV = 47;             // one ray per output column (160 logical cols)
const NCELL = NLOG / 4;                 // 4x8 cells across the screen (40)
// RECTILINEAR projection: columns spaced by atan (flat image plane) + per-column
// cos-correction of the distance. Fixes the fisheye arch AND makes wall height linear.
const CTR = (NLOG - 1) / 2, HALF_UNITS = FOV / 2, TANHALF = Math.tan(HALF_UNITS / 256 * 2 * Math.PI);
const rayOff = [], cosCorr = [];
for (let c = 0; c < NLOG; c++) {
  const camX = (c - CTR) / CTR * TANHALF;
  rayOff.push(Math.round(Math.atan(camX) / (2 * Math.PI) * 256) & 255);
  cosCorr.push(Math.min(255, Math.round(256 / Math.sqrt(1 + camX * camX))));
}
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
// N runs a horizontal strip at constant y -- which is what makes sprite occlusion a single
// comparison later. runPlane is the coordinate, runFace which side is the visible one.
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
const [LA, LM, LB] = (process.env.QLEVELS ?? '7,4,9').split(',').map(Number);
if (LA * LM * LB > 256) throw new Error(`step index ${LA}*${LM}*${LB} = ${LA*LM*LB} > 256`);
if (LA > 8 || LM > 8) throw new Error('qmT is addressed as qA*8 + qM, so LA and LM must be <= 8');
const QA = QLEV[LA], QM = QLEV[LM], QB = QLEV[LB];
const C8 = x => Math.max(0, Math.min(8, x));
const hamm = (p, t) => (p[0] !== t[0]) + (p[1] !== t[1]) + (p[2] !== t[2]) + (p[3] !== t[3]);
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

// --- assign char codes: cell patterns first, then the 18 readout glyphs ---
const codeOf = new Map(), glyphs = [];          // glyphs[code] = 8 bytes of multicolor bitmap
// Wall pixels are bit pair 11, not 01, and that is load-bearing: in MULTICOLOR char mode the
// VIC treats pairs 00 and 01 as background and 10 and 11 as foreground for sprite priority.
// With walls as foreground and $d01b set, sprite occlusion is exact, per-pixel and free --
// no masking, no mutable sprite copies, no cycles at all. 11 takes its colour from the low 3
// bits of colour RAM, which is written once at startup to $08: multicolor on, colour black,
// which is what the walls wanted anyway.
// Wall pixels are bit pair 11 in a FULL cell and 01 in a partial one. Both are black -- 11
// through colour RAM, 01 through $d022 -- so nothing about the image changes. What changes is
// sprite priority: 11 is foreground and clips sprites, 01 is background and does not.
//
// Full cells and STEP cells clip; RAMP cells do not. A ramp is the one-row band along a
// wall's top or bottom boundary, and geometry keeps an orb off those on a near wall: the top
// edge is at 100-h, the bottom at 100+h, and the orb stands at 100+h_orb with h_orb < h_wall,
// so it is above the bottom edge and far below the top. A STEP is a corner, whose boundary
// runs the whole height of the wall -- an orb meets those all the time, and making them
// background let an orb draw straight over a near wall's edge.
const patBytes = (p, isStep) => {
  const full = isStep || p.every(v => v >= 8);
  const [a, b, c, d] = full ? [0xc0, 0x30, 0x0c, 0x03] : [0x40, 0x10, 0x04, 0x01];
  return [...Array(8)].map((_, i) =>
    (p[0] > 7 - i ? a : 0) | (p[1] > 7 - i ? b : 0) | (p[2] > 7 - i ? c : 0) | (p[3] > 7 - i ? d : 0));
};
function intern(p) { const k = p.join(','); if (!codeOf.has(k)) { codeOf.set(k, glyphs.length); glyphs.push(patBytes(p)); } return codeOf.get(k); }
intern([0, 0, 0, 0]); intern([8, 8, 8, 8]);     // BLANK=0 SOLID=1: the fast-fill constants
// SOLID's twin: the same solid black, but bit pair 01, which the VIC classes as BACKGROUND and
// so does NOT clip sprites against. Cells under a sprite whose wall is FARTHER than it get
// repointed to this, which is the only way to express per-column depth -- $d01b is one bit for
// the whole sprite. Only SOLID needs a twin: a ground object meets a wall's flat body, never
// the one-cell band at its top, so the ramp and step patterns can stay single-coded.
const SOLIDBG = glyphs.length;
glyphs.push([...Array(8)].fill(+(process.env.VSTEPDBG ?? 0) ? 0xaa : 0x55));  // 01 01 01 01

// ---- SOLID split six ways: black on black, with a priority edge inside the cell ----
// Sprite priority is a property of the BIT PAIR, so it is per logical column, not per cell.
// A cell at a corner shows two walls -- one that must clip a sprite and one that must not --
// and both are black, so the cell can carry a vertical priority edge that is invisible as
// colour and exact as occlusion. Same trick as SOLIDBG, just applied per column instead of
// per cell, which is what SOLIDBG should have been all along.
//
// Six codes: the boundary falls at column 1, 2 or 3 (a boundary on the cell edge leaves the
// cell showing one wall, so there is nothing to split), and either side may be the near one.
// Code = SPLIT0 + (k-1)*2 + (the FIRST run is the near one ? 0 : 1).
const SPLIT0 = glyphs.length;
for (let k = 1; k <= 3; k++) for (const leftFg of [true, false])
  glyphs.push([...Array(8)].fill([0, 1, 2, 3].reduce(
    (b, c) => b | (((c < k) === leftFg ? 3 : 1) << (6 - 2 * c)), 0)));

// Which patterns actually occur? The charset cannot hold every ramp and step the clamp can
// express, so the sampler decides what is worth a code and what gets dropped (see placeAll).
// Widening the clamp to 16 levels added patterns that only arise from very steep slopes, and
// most of those are unreachable in practice.
function patternFreq() {
  const f = new Map(), TH = Math.tan(FOV / 2 / 256 * 2 * Math.PI), CT = (NLOG - 1) / 2;
  const cx = c => (c - CT) / CT * TH;
  const ang = [...Array(NLOG)].map((_, c) => Math.atan(cx(c)));
  const cc = [...Array(NLOG)].map((_, c) => 1 / Math.sqrt(1 + cx(c) ** 2));
  const shoot = (px, py, a) => { const dx = Math.cos(a), dy = Math.sin(a);
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
  const cl = v => Math.max(CLO, Math.min(CHI, v));
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
          const slot = qIdxA(w[0]) * (LM * LB) + qIdxM(w[kb - 1]) * LB + qIdxB(w[3]);
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
  // Nothing placed here clips a sprite: the six vertical steps that may are interned ahead of
  // this call, so everything left is a ramp or a transitional step, and both are background.
  for (const p of all) { const k = p.join(',');
    codeOf.set(k, glyphs.length); glyphs.push(patBytes(p)); }
  const stepKeys = new Set(STEPS.chosen.map(q => q.join(',')));
  console.error(`  cell codes: ${all.filter(p => stepKeys.has(p.join(','))).length} non-vertical ` +
    `step + ${all.filter(p => !stepKeys.has(p.join(','))).length} ramp, none clipping; ` +
    `6 vertical steps clip, at ${VSTEP0}-${VSTEP0 + 5} with twins at ${VSTEP0 + 6}-${VSTEP0 + 11}`);
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
const STEPN = +(process.env.STEPN ?? 64);
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
// The chosen patterns' frequencies have to reach PFREQ before pairing runs, or the pairing
// ranks every step pattern at zero and happily pairs away the common ones.
for (let k = 0; k < 3; k++) for (const [slot, p] of STEPS.assign[k]) {
  const m = stepStats[k].get(slot); if (!m) continue;
  const n = [...m.values()].reduce((a, b) => a + b, 0);
  const key = p.join(','); PFREQ.set(key, (PFREQ.get(key) || 0) + n);
}
for (const fr of PFRAMES) for (let i = 0; i < fr.length; i++)
  if (Array.isArray(fr[i])) fr[i] = STEPS.assign[fr[i][0]].get(fr[i][1]).join(',');
console.error(`  step patterns: ${LA}/${LM}/${LB} levels, ${STEPS.nslots} ` +
  `sampled of ${3*LA*LM*LB} (k,slot) pairs, ${STEPS.chosen.length} codes; corner error ${(oldErr / SFRAMES).toFixed(3)} -> ` +
  `${(STEPS.after / SFRAMES).toFixed(3)} wrong cols/frame (flat plateau -> sloped)`);
// ---- the six vertical steps, and their background twins ----
// A step whose every column is either empty or full is a CORNER: its boundary is a straight
// vertical edge running the height of the wall, and an orb meets those constantly. Those six
// are the only steps that may clip a sprite -- see patBytes. Every other step is a transitional
// cell on a steep silhouette, at most a sliver wide, and clipping against one is what put a
// black bite out of an orb standing in front of a wall's lower corner.
//
// They are placed HERE, ahead of placeAll, so the six land on consecutive codes with their six
// twins immediately after: the repoint pass then converts one to the other with a single ADC #6
// rather than a lookup. placeAll skips them, since codeOf already holds them.
const VSTEPDBG = +(process.env.VSTEPDBG ?? 0);

// ---- split twins for the busiest wall-meets-wall steps ----
// Every step cell IS a corner: the subdivision only picks one where a face boundary falls
// inside the cell. So when a step has a SATURATED column and a partial one, the saturated
// side is the wall that fills the cell -- the taller one on screen, hence the nearer one.
// That makes the split self-describing: no second orientation is needed, unlike SOLID, where
// both sides are equally black and only the run ids can say which is near.
//
// The class has 35 members and a flat distribution, so it cannot be covered outright. These
// are the busiest, interned consecutively so the swap is one add, like the vertical steps.
// 8, not 10: past 8 the extra exact twins cost more never-sampled patterns than they buy in
// coverage, because the nearest-twin substitution below already reaches the whole class.
const SSTEPN = +(process.env.SSTEPN ?? 8);
const SSTEPS = STEPS.chosen
  .filter(p => p.some(v => v >= 8) && p.some(v => v > 0 && v < 8))
  .sort((a, b) => (PFREQ.get(b.join(',')) || 0) - (PFREQ.get(a.join(',')) || 0))
  .slice(0, SSTEPN);
// ink unchanged, but each column's bit pair says whether it clips: saturated = the near wall
const splitBytes = p => [...Array(8)].map((_, i) =>
  [0, 1, 2, 3].reduce((b, c) => b | (p[c] > 7 - i ? (p[c] >= 8 ? 3 : 1) << (6 - 2 * c) : 0), 0));

const VSTEPS = STEPS.chosen.filter(p => p.every(v => v === 0 || v >= 8));
if (VSTEPS.length !== 6) throw new Error(`expected 6 vertical steps, found ${VSTEPS.length}`);
const VSTEP0 = glyphs.length;
for (const p of VSTEPS) { codeOf.set(p.join(','), glyphs.length); glyphs.push(patBytes(p, true)); }
for (const p of VSTEPS) glyphs.push(VSTEPDBG
  ? patBytes(p, true).map(b => { let o = 0;   // VSTEPDBG: paint the twins seam-grey so a
      for (let i = 0; i < 4; i++) if ((b >> (6 - 2*i)) & 3) o |= 2 << (6 - 2*i);   // repointed
      return o; })                            // corner is visible on screen at a glance
  : patBytes(p, false));                      // same pixels, bit pair 01
const VSTEPN = VSTEPS.length;
const SSTEP0 = glyphs.length;
for (const p of SSTEPS) { codeOf.set(p.join(','), glyphs.length); glyphs.push(patBytes(p)); }
for (const p of SSTEPS) glyphs.push(splitBytes(p));
console.error(`  split steps: ${SSTEPN} of ${STEPS.chosen.filter(p => p.some(v => v >= 8) &&
  p.some(v => v > 0 && v < 8)).length} wall-meets-wall patterns, at ${SSTEP0}-${SSTEP0 + SSTEPN - 1}` +
  ` with splits at ${SSTEP0 + SSTEPN}-${SSTEP0 + 2 * SSTEPN - 1}`);
placeAll([rampsAll, STEPS.chosen]);
const CELLCODES = glyphs.length;
// A step's split twin has to have the step's own ink, and the class is far too big to give
// every member one. But the charset already accepts a nearest-pattern substitution for the
// patterns it had to drop, and the same rule works here: a step whose own twin does not exist
// borrows the twin of the closest one that does. The ink is then off by a logical column or
// two of height for as long as an orb overlaps that one cell -- against the orb bleeding over
// a whole near wall, which is what happens with no twin at all.
const SPLITSUB = 2;               // refuse a substitution worse than this many columns
const splitT = new Array(256).fill(0);
{ let exact = 0, near = 0;
  for (const [key, code] of codeOf) {
    const q = key.split(',').map(Number);
    if (!(q.some(v => v >= 8) && q.some(v => v > 0 && v < 8))) continue;   // not wall-meets-wall
    let bd = 99, bi = -1;
    SSTEPS.forEach((p, i) => { const d = hamm(p, q); if (d < bd) { bd = d; bi = i; } });
    if (bi < 0 || bd > SPLITSUB) continue;
    splitT[code] = SSTEP0 + SSTEPN + bi;
    if (bd === 0) exact++; else near++;
  }
  console.error(`  split twins: ${exact} steps use their own, ${near} borrow the nearest ` +
    `(within ${SPLITSUB} columns), out of ${[...codeOf].filter(([k]) => { const q = k.split(',').map(Number);
      return q.some(v => v >= 8) && q.some(v => v > 0 && v < 8); }).length} wall-meets-wall codes`);
}
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
  const row = [0, 1, 2, 3].reduce((b, i) => b | ((i === k ? 2 : 3) << (6 - 2 * i)), 0);
  glyphs.push(new Array(8).fill(row));
}
// ... and the same four with their BLACK columns in the background pair. Only the grey stripe
// itself has to stay foreground -- pair 10 is the one place grey lives, and both background
// pairs are spent on white and black. So a seam on a wall that must not clip a sprite costs
// two pixels of line across it instead of the whole cell, and the wall keeps its seam. This
// is what lets a seam cell take part in the ordinary foreground rule like any other wall.
const SEAMBG0 = glyphs.length;
for (let k = 0; k < 4; k++) {
  const row = [0, 1, 2, 3].reduce((b, i) => b | ((i === k ? 2 : 1) << (6 - 2 * i)), 0);
  glyphs.push(new Array(8).fill(row));
}
if (glyphs.length > 256) throw new Error(`charset overflow: ${CELLCODES} cell patterns + ${NGLYPH} glyphs + 8 seams = ${glyphs.length} > 256`);
console.error(`charset: ${CELLCODES} cell codes + ${NGLYPH} readout glyphs + 8 seam = ${glyphs.length}/256`);
// Ramps and steps share one placement pass (so pairing can mate a ramp with a step), which
// means there is no contiguous "steps" range to report -- they interleave by frequency.
console.error(`  codes: 0 BLANK, 1 SOLID, 2-${CELLCODES-1} ramps+steps interleaved, ` +
              `${GLYPH0}-${GLYPH0+NGLYPH-1} readout, ${SEAM0}-${SEAM0+3} seam, ${SEAMBG0}-${SEAMBG0+3} seam-bg`);
// charset A, and charset B = every glyph flipped vertically. The raster split at the
// horizon selects B for the bottom half, so ONE char code renders as its own mirror
// there -- renderSym writes the identical byte to both halves and needs no flip table.
const fontA = new Uint8Array(256 * 8), fontB = new Uint8Array(256 * 8);
for (let c = 0; c < 256; c++) { const g = glyphs[c] || [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 8; i++) { fontA[c * 8 + i] = g[i]; fontB[c * 8 + i] = g[7 - i]; } }
// rampT[wL*16 + wR] -> char code, for a cell covering a single wall face.
const rampT = new Array(CN * 16).fill(0);
for (let a = 0; a < CN; a++) for (let b = 0; b < CN; b++) {
  const p = rampPat(a + CLO, b + CLO);
  rampT[a * 16 + b] = codeFor(p);
}
// stepT<k>[qA*36 + qM*6 + qB] -> char code, for a cell whose face boundary falls at column
// k. qM is the level at the LAST column before the boundary: that third sample is what lets
// the plateau slope down to meet the corner instead of capping it flat.
const stepT = [0, 1, 2].map(k => { const t = new Array(LA * LM * LB).fill(0);
  for (const [slot, p] of STEPS.assign[k]) t[slot] = codeFor(p);
  return t; });
// qmT[qA*8 + qM] = qA*36 + qM*6. The 6502 has no multiply, and folding both scales into one
// lookup keeps the whole index inside a byte (max 5*36 + 5*6 + 5 = 215), so the table stays
// reachable with plain abs,Y addressing.
const qmT = new Array(64).fill(0);
for (let a = 0; a < LA; a++) for (let m = 0; m < LM; m++) qmT[a * 8 + m] = a * (LM * LB) + m * LB;
// clampT output -> index into each axis's quantisation.
const qIdxAT = [...Array(CN)].map((_, v) => qIdxA(v + CLO));
const qIdxMT = [...Array(CN)].map((_, v) => qIdxM(v + CLO));
const qIdxBT = [...Array(CN)].map((_, v) => qIdxB(v + CLO));

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
// Same table with the value pre-shifted into the high nibble. rampT is indexed by
// wL*16 + wR, and the left level was being shifted left four times right after clampT
// handed it over -- 8 cycles per edge cell to undo a table lookup's own output.
const clampT16 = clampT.map(v => v << 4);
const BLANK = codeOf.get('0,0,0,0'), SOLID = codeOf.get('8,8,8,8');
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
const SPIN = flag('SPIN');
// Viewpoints a SPIN benchmark cycles through, one per full rotation: the start corridor, the
// busiest cell on the map (12 orb candidates), and two rooms away from both.
const SPINPOS = [[1.5, 1.5], [8.5, 4.5], [12.5, 9.5], [9.5, 12.5]];     // auto-rotate, ignore input
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

// DBGORB adds code ahead of this, and the diagnostic build has run into it twice -- VICE then
// silently boots the PREVIOUS disk and you read stale numbers. Let a debug build push it up.
// A diagnostic build adds code ahead of this and has run into it twice; the failure is silent
// (the assembler errors, VICE boots the PREVIOUS disk, you read stale numbers off a stale
// frame), so give those builds the extra page automatically rather than by remembering to.
const RELOC = +(process.env.RELOC ??
  (process.env.DBGORB === '1' || +(process.env.VSTEPDBG ?? 0) ? 0x8500 : 0x8400));
// ---- the orbs ----
// Seven size variants were authored (orb0 smallest .. orb6 largest) but only FIVE bitmaps:
// orb5 and orb6 are orb3 and orb4 with the VIC's 2x expand bits set, so they cost no extra
// data. Multicolor, and the colour mapping is the author's, NOT what the gmSprite header
// comment implies -- that comment's [13]/[14]/[15] do not match this file version. Bit pair 10
// is the body, 01 the shaded underside, 11 the highlight and the ground shadow. The shadow is
// the useful part for us: it marks where the orb meets the floor.
//
// Only the BODY can vary per orb. Bit pair 10 reads $d027+n, which is per sprite, but 01 and
// 11 read $d025/$d026, which are single registers shared by all eight. So the underside and
// the highlight are common to every orb on screen and only the body colour is free.
const SPRITES = process.env.SPRITES !== '0';
// SPRPRI=0 sets the initial priority byte; orbMove overwrites it every frame, so it is not an
// A/B for occlusion. ORBMIX=0 is -- it skips repointing far cells to SOLID's twin.
const SPRPRI = +(process.env.SPRPRI ?? 1);
const DBGORB = flag('DBGORB');
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
const ORBMIX = process.env.ORBMIX !== '0';
// ORBPRI=0/1 forces every sprite in front of / behind the walls, ignoring the depth scan.
// Renders the two answers the scan is choosing between, so a frame can be compared against
// both instead of guessed at.
const ORBPRI = process.env.ORBPRI;
// Skip reprojecting when the viewpoint has not moved. OFF for now -- full calculations
// whether moving or not -- because it flatters stationary frames and hides what the projection
// actually costs. ORBSTILL=1 turns it back on.
const ORBSTILL = process.env.ORBSTILL === '1';
const SPRBASE = 0x2000;                 // VIC bank 0, 64-byte aligned, below screen buffer B
// ORB4 -- the full-size, unexpanded one -- is the canonical orb, and every other size is
// resampled from it at build time. The author's other six were a hand-picked ladder with a
// 2:1 gap at the top; scaling gives an even progression instead, and the sizes then follow
// from the geometry rather than from a fudge factor.
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
// The art is a ball, a gap, then a ground shadow, and the two solid parts want different
// downsampling. Find the gap so they can be scaled separately.
const _ballEnd = (() => { for (let y = _rows[0]; y <= SY1; y++) if (!ORBSRC12[y].some(v => v)) return y - 1; return SY1; })();
const _shadTop = (() => { for (let y = SY1; y >= SY0; y--) if (!ORBSRC12[y].some(v => v)) return y + 1; return SY0; })();
// Area coverage with a threshold, sampled 4x4 within each destination pixel. The BALL needs a
// true half-coverage test or its edges square off -- filling a destination pixel whenever any
// source pixel under it is set dilates the silhouette out to its bounding box, which is what
// made the small orbs look cuboid. The SHADOW is three rows of soft ellipse and a half-coverage
// test erases most of it, so it gets a low threshold and keeps its width.
const ORBTHR = +(process.env.ORBTHR ?? 0.5);
function orbRegion(out, oy, hgt, y0, y1, w, thr) {
  const sh = y1 - y0 + 1, N = 4, ox = (12 - w) >> 1;
  for (let dy = 0; dy < hgt; dy++) for (let dx = 0; dx < w; dx++) {
    const t = [0, 0, 0, 0]; let n = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const sx = Math.floor(SX0 + SW * (dx + (i + 0.5) / N) / w);
      const sy = Math.floor(y0 + sh * (dy + (j + 0.5) / N) / hgt);
      if (sx >= 0 && sx < 12 && sy >= 0 && sy < 21) { t[ORBSRC12[sy][sx]]++; n++; }
    }
    if (t[1] + t[2] + t[3] < n * thr) continue;
    let bn = 0, v = 0; for (let k = 1; k < 4; k++) if (t[k] > bn) { bn = t[k]; v = k; }
    out[oy + dy][ox + dx] = v;
  }
}
function orbScale(w) {
  const sc = w / SW;
  const bh = Math.max(1, Math.round((_ballEnd - SY0 + 1) * sc));
  const gh = Math.max(0, Math.round((_shadTop - _ballEnd - 1) * sc));
  const sh = Math.max(1, Math.round((SY1 - _shadTop + 1) * sc));
  const out = [...Array(21)].map(() => new Array(12).fill(0));
  const oy = 21 - (bh + gh + sh);       // standing on the sprite's floor
  orbRegion(out, oy, bh, SY0, _ballEnd, w, ORBTHR);
  orbRegion(out, oy + bh + gh, sh, _shadTop, SY1, w, 0.2);
  return out;
}
const NORBBM = 12;                              // one bitmap per multicolor-pixel width, 1..12
// The widest rung must come back byte-identical to the art it was scaled from. If a change to
// the resampler breaks that, every other rung is suspect too.
{ const g = orbScale(SW), b = [];
  for (let y = 0; y < 21; y++) for (let k = 0; k < 3; k++)
    b.push([0,1,2,3].reduce((v, i) => v | (g[y][k*4+i] << (6-2*i)), 0));
  if (b.join() !== ORB4RAW.join()) throw new Error('orbScale does not reproduce ORB4 at full width'); }
const ORBBM = [...Array(NORBBM)].map((_, i) => {
  const g = orbScale(i + 1), bytes = [];
  for (let y = 0; y < 21; y++) for (let b = 0; b < 3; b++)
    bytes.push([0, 1, 2, 3].reduce((v, k) => v | (g[y][b * 4 + k] << (6 - 2 * k)), 0));
  bytes.push(0);
  return bytes;
});
// A variant is a bitmap plus whether the VIC doubles it. Expansion is free -- same bitmap, one
// register bit -- so the top of the ladder costs no extra data. Doubling a bitmap narrower
// than 7 would just duplicate an unexpanded width at half the vertical resolution, so it is
// only used above that.
const ORBSRC = [], ORBEXP = [], ORBWIDE = [];
for (let w = 1; w <= NORBBM; w++) { ORBSRC.push(w - 1); ORBEXP.push(0); ORBWIDE.push(w * 2); }
for (let w = 7; w <= NORBBM; w++) { ORBSRC.push(w - 1); ORBEXP.push(1); ORBWIDE.push(w * 4); }
// The content is bottom-aligned in every bitmap, so the ground shadow always ends on the
// sprite's last row and the anchor is simply the sprite's height. No per-variant table of
// hand-measured shadow positions any more.
const ORBANCH = ORBEXP.map(e => e ? 42 : 21);
// ... but the sprite RECTANGLE is 21 rows whatever the ball's size, so a small distant orb
// carries up to 18 blank rows above its content. The repoint pass walked those, so it deleted
// seams and repointed walls in cells the sprite never puts a pixel in -- visible as a corner
// seam simply missing, with no orb anywhere near it to explain the loss.
const orbBlankT = ORBSRC.map((src, v) => {
  const g = orbScale(src + 1);
  let n = 0; while (n < 21 && g[n].every(p => p === 0)) n++;
  return n * (ORBEXP[v] ? 2 : 1);
});
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
console.error(`  occluders: ${OCCBYTES} bytes x ${ORBS.length} orbs = ${OCCBYTES * ORBS.length}` +
  ` bytes; a run can occlude ${(orbOcc.reduce((a, m) =>
    a + m.reduce((b, v) => b + v.toString(2).split('1').length - 1, 0), 0) / ORBS.length).toFixed(1)}` +
  ` orbs on average`);

const losFree = (ax, ay, bx, by) => {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 8);
  for (let i = 1; i < n; i++) { const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (map[(y | 0) * 16 + (x | 0)]) return false; }
  return true;
};
const CANDBASE = RELOC + 0x1900;                 // must match the org below
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
if (candList.length > 0x2300 - 0x1900) throw new Error(
  `visibility lists are ${candList.length} bytes and would run into the step tables`);
const _pal = [...new Set(ORBBODY)].length === 1
  ? `all body colour ${ORBBODY[0]}`
  : ORBBODY.map((b, c) => `${ORBS.filter(o => o.c === c).length}x${b}`).join('/');
console.error(`orbs: ${ORBS.length} placed (${_pal}), visibility lists ` +
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
const orbVarT = [...Array(256)].map((_, h) => {
  const want = ORBSCALE * h / 88;
  let b = 0; for (let v = 1; v < ORBWIDE.length; v++)
    if (Math.abs(ORBWIDE[v] - want) < Math.abs(ORBWIDE[b] - want)) b = v;   // ties keep the
                                        // earlier (unexpanded) entry: twice the vertical detail
  return b;
});
{ // which rungs can actually be reached, and at what distance each one takes over?
  const band = [];
  for (let v = 0; v < ORBWIDE.length; v++) {
    const lim = 251 - (150 - ORBANCH[v]);
    const hs = [...Array(lim).keys()].filter(h => orbVarT[h] === v);
    band.push(hs.length ? `${ORBWIDE[v]}px@${(22528 / hs[hs.length - 1] / 256).toFixed(2)}-` +
      `${(22528 / Math.max(hs[0], 1) / 256).toFixed(2)}` : `${ORBWIDE[v]}px UNREACHABLE`);
  }
  console.error(`  orb size ladder (cells): ${band.join('  ')}`);
}
const orbPtrT = ORBSRC.map(b => (SPRBASE >> 6) + b);
const orbExpT = ORBEXP.map(e => e);
// Distance from the sprite's LEFT EDGE to the ball's centre, which is what positioning needs
// -- not half the ball's width. orbScale centres the content in the 12-column sprite, so the
// centre sits ~12px in whatever the ball's size; using ballWidth/2 drew small orbs up to 10px
// right of where they belong AND shifted them on every variant change, which is the scaling
// jump. It also put the sprite somewhere the depth scan had not tested, hence stray occlusion.
const orbHalfT = ORBSRC.map((b, v) => {
  const w = b + 1, ox = (12 - w) >> 1;
  return (2 * ox + w) * (ORBEXP[v] ? 2 : 1);
});
// 150 - anchor: raster 50 + display row 100, less the rows from the sprite's top down to the
// bottom of its ground shadow. Adding h to THIS cannot overflow until the orb is long gone.
const orbYBaseT = ORBANCH.map(a => 150 - a);
const orbColT = ORBWIDE.map(w => w >> 2);        // half-width in LOGICAL columns
const orbSpHT = ORBEXP.map(e => e ? 42 : 21);    // sprite height in raster lines
const orbBitT = [...Array(8)].map((_, i) => 1 << i);
// The occluder bitmaps, laid out one after another, with a pointer table so a run-id lookup
// is (ptr),y with no multiply.
const OCCBASE = RELOC + 0x2200;   // above the visibility lists; see the org below
const orbOccFlat = orbOcc.flat();
const orbOccLo = ORBS.map((_, i) => (OCCBASE + i * OCCBYTES) & 255);
const orbOccHi = ORBS.map((_, i) => (OCCBASE + i * OCCBYTES) >> 8);
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
rang    = $07
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
nbnd    = $14                   ; how many span delimiters the search pinned
nbnd    = $14                   ; delimiters the search pinned this frame
bcur    = $18
bswp    = $19
bcnt    = $08
nbnd    = $14                   ; delimiters the search pinned this frame
bcur    = $18
bswp    = $19
bcnt    = $08
cell0   = $13                   ; the player's own cell index, constant for the frame
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
cellFaceT = $c4a0            ; per cell-column (40): the LAST wall run the cell shows
cellFace2T = $c4c8           ; ... and the FIRST. A cell at a corner shows two walls with
                                ; opposite answers, so one run per cell cannot decide it
ocl2    = $cb93                 ; the bounding box in COLUMNS, not cells
ocmax   = $cb94
fgCell  = $c5a0                 ; per cell-column (40): bits 3..0 = which of the cell's four
                                ; logical columns must be FOREGROUND (clip a sprite), bit 7 =
                                ; some orb's bounding box covers this cell
opsl    = $cb95
opbn    = $cbc4                 ; index into opbuf while pass 1 walks a box
opbuf   = $cbd0                 ; the per-cell masks of the orb in hand, up to 12 cells
opreq   = $cbc2                 ; columns of this orb's box that must clip it, and
opcon   = $cbc3                 ; columns made foreground that must not
opcl    = $cb96
opcr    = $cb97
opbl    = $cbc0
opbr    = $cbc1                 ; the sprite slot orbPaint has in hand
pbb     = $cb90                 ; the columns of the cell in hand that lie inside that box
pkm     = $cb91                 ; ... that belong to the cell's FIRST run
pmk     = $cb92                 ; ... that this orb needs foreground
obCL    = $cb98                 ; per sprite slot, for the second pass: cell range and
obCR    = $cba0                 ; bounding-box edge masks, so pass 2 need not reproject
obBL    = $cba8
obBR    = $cbb0
obIX    = $cbb8
cstepT  = $c680                 ; per cell-column (40): face-boundary column, 0 = none
pfAcc   = $c900                 ; PROFILE: 7 phases x 3 bytes, raster lines summed
pfPrvF  = $c920                 ; previous timestamp: frame counter, then raster line
pfPrvL  = $c922
pfN     = $c923                 ; frames accumulated so far (2 bytes)
pfCurF  = $c925                 ; scratch for one timestamp read and the delta
pfCurL  = $c926
pfCurX  = $c927
pfDLo   = $c928
pfDHi   = $c929
pfRow   = $c92a
pfDone  = $c92b
seamT   = $c6c0                 ; per cell-column (40): char code for the solid run --
                                ;   SOLID, or a seam variant when a panel line lands here
; orbMove's hot working set, on seamSpan's scratch -- dead by the time orbMove runs
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
omptr   = $87                    ; 2 bytes: this orb's occluder bitmap. Shares oaL/oaH,
                                ;   which are dead once the column offset has been worked out
ocptr   = $9e                    ; 2 bytes: into the cell's visibility list
; ... and the cold tail, touched once or twice each, left in absolute RAM
ocos    = $cb00
ocosS   = $cb01
osin    = $cb02
osinS   = $cb03
fwdL    = $cb04
fwdH    = $cb05
rgtL    = $cb06
rgtH    = $cb07
ogL     = $cb08
ogH     = $cb09
oe      = $cb0a
o3      = $cb0b
ocoff   = $cb0c
ovar    = $cb0d
ocnear  = $cb0f
ocol    = $cb10
ocspan  = $cb11
ocl     = $cb12
ocr     = $cb13
ocrow   = $cb14
ocrw2   = $cb15
oidx    = $cb17
ocn3    = $cb2a
ocn     = $cb18
ocy     = $cb19
onv     = $cb1a
omEn    = $cb1b
omXX    = $cb1c
omYY    = $cb1d
omPri   = $cb1e
omX8    = $cb1f
omBit   = $cb20
omMix   = $cb21
obX     = $cb30
obY     = $cb38
obP     = $cb40
obC     = $cb48                  ; per-sprite state, flushed to the VIC in the border
opx     = $cb5c                  ; the viewpoint orbMove last projected from
opy     = $cb5e
opa     = $cb60
ofx     = $cb64
ofy     = $cb65
kxc     = $cb66
kxs     = $cb67
kyc     = $cb68
kys     = $cb69
kfL     = $cb6a
kfH     = $cb6b
krL     = $cb6c
krH     = $cb6d
oix     = $cb6e
oiy     = $cb6f
oax     = $cb70
oay     = $cb71
oixS    = $cb72
oiyS    = $cb73
ocmask  = $cb74                  ; per cell under the sprite: 1 = its face cannot occlude
ocsplit = $cb76                  ; ... 1 = its two runs DISAGREE, so it needs a column split
ocside  = $cb77                  ; ... 1 = of those two, the FIRST run is the near one
oflag   = $cb75                  ; DBGORB: candidates that passed the bearing test
odb     = $cb22                  ; DBGORB scratch: six bytes shown as hex on screen row 3
bndT    = $ca00                 ; columns where a face or saturation state begins
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
        sta $d022               ; 01 = black  (readout glyphs only; walls moved to 11)
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
        ldx #$00                ; no run cached for either buffer yet. NOT in the sprite
        lda #$ff                ; setup: SPRITES=0 builds render too, and an uninitialised
rfCz:   sta cwA,x               ; cache byte that happens to match rb or rs leaves a column
        inx                     ; never drawn at all
        bne rfCz
        lda #$08                ; bit3 = per-cell multicolor enable. The low three bits are
                                ; the bit-pair-11 colour, and nothing emits 11 any more --
                                ; shape comes from 00/01 and seams from 10 -- so this is
                                ; written once at startup and never touched again.
ccf:    sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne ccf
${SPRITES ? `        ; ---- orb sprite: static setup. Position and shape change per frame in orbMove.
        lda #$00
        sta $d015               ; nothing visible until orbMove has decided what is
        lda pa
        eor #$80
        sta opa                 ; cannot match pa, so the first frame never takes the still path
        lda #$ff
        sta $d01c               ; ALL eight in multicolor -- orbMove hands out slots as it
                                ; finds visible orbs, so any of them can be in use. $d015 is
                                ; built per frame and not set here.
        lda #${SPRPRI}
        sta $d01b               ; sprite 0 BEHIND foreground. Walls are bit pair 11 and seams
                                ; 10, both foreground, so the VIC clips the orb against the
                                ; scene per pixel and orbMove does not test occlusion at all.
        sta $d017
        sta $d01d
        lda #${hx(ORBUNDER)}
        sta $d025               ; bit pair 01 = blue, the shaded underside
        lda #${hx(ORBHILITE)}
        sta $d026               ; bit pair 11 = grey 3, highlight and ground shadow
        lda #$0e
        sta $d027               ; bit pair 10 = light blue, the body
        lda #${SPRBASE >> 6}
        sta $07f8               ; the pointer lives in the SCREEN, so both buffers need it
        sta $27f8
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
        ${SPIN ? 'jsr spinStep' : WALK ? 'jsr moveFwd' : STRAFE ? 'jsr strafeR' : BACK ? 'jsr moveBack' : 'jsr readKeys'}
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
        lda #$00
${[...Array(NCELL)].map((_, i) => `        sta fgCell+${i}`).join('\n')}
        lda #${hx(SOLIDBG)}     ; and every wall back to BACKGROUND black -- a sprite passes in
                                ; front of it unless an orb asks for the column to clip
${[...Array(NCELL)].map((_, i) => `        sta seamT+${i}`).join('\n')}` : ''}
${PROFILE && !PROFILE1 ? '        ldx #1\n        jsr pfTick              ; per-frame table clears\n' : ''}        lda py+1                ; the DDA's starting cell, once for the whole frame
        asl
        asl
        asl
        asl
        clc
        adc px+1
        sta cell0
        lda #$00                ; explicit: the clears above leave A holding their own fill
        sta nbnd
        sta col
        jsr marchCol            ; column 0
${DOUBLE === 'marchCol' ? '        jsr marchCol\n' : ''}
        lda #${NLOG - 1}
        sta col
        jsr marchCol            ; column 79
${DOUBLE === 'marchCol' ? '        jsr marchCol\n' : ''}
        lda #$00
        sta stackLT
        lda #${NLOG - 1}
        sta stackRT             ; push (0,79)
        lda #$01
        sta sp
subLp:  ldx sp
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
        lda spanR
        lsr
        lsr
        tax
        lda seamT,x
        cmp #${hx(SOLIDBG)}     ; still a plain fill? the default is BACKGROUND black now
        bne subCn               ; a line is already claimed in this cell; one per char code
        lda spanR
        and #$03
        clc
        adc #${hx(SEAMBG0)}
        sta seamT,x
subCn:` : ''}
        jsr subBnd              ; a face starts here: remember it as a span delimiter
        lda spanR
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
        jsr marchCol
${DOUBLE === 'marchCol' ? '        jsr marchCol\n' : ''}
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
        ; ---- which wall faces does each CELL show? ----
        ; A span has one face at both ends by construction, so filling per cell here costs at
        ; most 40 stores a frame -- against 160 if faceIdT were filled per column, which it is
        ; not (castRay writes it only where it actually marched).
        ;
        ; TWO runs per cell, not one. A cell is 4 logical columns, and at a corner those 4
        ; columns can belong to two different walls whose answers are OPPOSITE: the near wall
        ; must clip a sprite and the far wall must not. Recording only the later run made the
        ; whole cell answer for the near wall, so a far wall's body and seam inside the same
        ; cell went on cutting into an orb standing in front of them.
        ;
        ; No per-frame clear and no assumption about span order is needed. Only the FIRST cell
        ; of a span can be shared with the span before it, and that span already wrote this
        ; cell as one of its interior cells -- so the first run is already there, and this span
        ; must only update the last. Every other cell of the span belongs to it entirely.
        lda spanL
        lsr
        lsr
        tax                     ; cl = first cell
        lda spanR
        lsr
        lsr
        sta tmp2                ; cr = last cell
        ldy spanL
        lda faceIdT,y           ; the span's face: both ends agree, that is why it merged
        tay                     ; Y holds the run for the rest of this
        lda spanL
        and #$03
        bne cfL1                ; starts mid-cell: the previous span owns this cell's first run
        tya
        sta cellFace2T,x
cfL1:   tya
        sta cellFaceT,x
        cpx tmp2
        bcs cfDn                ; the span lies within one cell
cfLp:   inx
        tya
        sta cellFaceT,x
        sta cellFace2T,x        ; wholly inside this span: first and last are the same run
        cpx tmp2
        bcc cfLp
cfDn:
        jsr interpSpan
${DOUBLE === 'interpSpan' ? '        jsr interpSpan\n' : ''}${SEAMS ? '        jsr seamSpan\n' : ''}subFDn: rts

subBnd: ldx nbnd                ; remember a column where a new face/saturation state begins
        cpx #${NLOG / 8}
        bcs subBDn              ; list full: leave the rest as the search left them
        lda spanR
        sta bndT,x
        inc nbnd
subBDn: rts

subFin:
${PROFILE && !PROFILE1 ? '        ldx #2\n        jsr pfTick              ; cast + interpolate + seams\n' : ''}${PROFILE && !PROFILE1 ? '        ldx #3\n        jsr pfTick              ; prepCells\n' : ''}${SPRITES ? `        jsr orbMove             ; BEFORE renderSym: it decides which columns are
        jsr orbPaint            ; foreground, and renderSym draws them that way first time
` : ''}${NOFILL ? '' : '        jsr renderSym'}
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
${SPRITES ? '        jsr osFlush             ; sprite registers, now that the beam is out of the way\n' : ''}        inc iterLo
        bne mloop
        inc iterHi
        jmp mloop

; The old makeDiv drew a white seam slit by ZEROING colH at each face boundary. That is
; incompatible with 4-wide cells -- a zeroed column silently became a ramp endpoint, so a
; boundary landing on a cell edge turned the whole cell into a diagonal. It is also now
; redundant: the face boundary is rendered as a true vertical step (see prepCells/cstepT).

; ============ prepCells: per cell-column summary, once per frame ============
; renderSym visits 520 cells but only ~25 are edge cells; the other 495 must be rejected
; as fully-solid or fully-blank as cheaply as possible. Computing min/max over 4 columns
; inside that loop would cost 4 loads per cell, so it is hoisted here: 40 iterations
; instead of 520. Also caps the height at 100 -- colH is deliberately left UNCAPPED by the
; interpolator so merged spans stay linear, but (h + K) must fit a signed byte downstream.
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
        lda rampT,y
        jmp rfStore             ; (the ramp is the common case; see rfStore below)
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
        adc kpos
        tax
        dex                     ; X = 4*column + k - 1
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
        lda kpos
        cmp #$02
        beq rfSt2
        bcs rfSt3
        lda stepT1,y
        jmp rfStore
rfSt2:  lda stepT2,y
        jmp rfStore
rfSt3:  lda stepT3,y
        ; Store it at this row and its mirror. This used to hand-build two 16-bit pointers
        ; -- rowLoT/rowHiT + colc with the carry, twice -- and store through them: 85 cycles
        ; to write two bytes. The stub has both addresses baked in and takes the column from
        ; X, exactly like the run chains, so the addressing mode does the arithmetic instead.
rfStore:sta ecode
        lda erow
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
        cmp #${hx(SOLIDBG)}     ; the default now that walls start as background black. Anything
        bne rfSlSm              ; else -- a seam, or a column an orb asked to clip -- can change
        ` : ''}lda rsv           ; without rs moving, so it is never cached
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
        cmp #${hx(SOLIDBG)}     ; still a plain fill? the default is BACKGROUND black now
        bne ssOne               ; already spoken for: one line per char code
        tya
        and #$03
        clc
        adc #${hx(SEAMBG0)}
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
        jsr castRay
        ldx col
        lda pp
        sta colH,x
        lda side
        sta sideT,x             ; side kept separate (avoids id/side bit collision)
        lda cell                ; castRay already maintains the cell id
        ldx col
        sta idT,x
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
friSto: ldx col
        sta faceIdT,x
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
        lda pa
        clc
        adc rayOffT,x
        sta rang
        tax
        lda ddxLoT,x
        sta ddx
        lda ddxHiT,x
        sta ddxH
        lda ddyLoT,x
        sta ddy
        lda ddyHiT,x
        sta ddyH
        lda cell0               ; cell = mapY*16 + mapX, stepped by +-1 / +-16 from here on.
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
        jsr sideMul
${DOUBLE === 'sideMulRay' ? '        jsr sideMul\n' : ''}
        ldx rang
        lda posXT,x
        bne cxpos
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
        jsr sideMul
${DOUBLE === 'sideMulRay' ? '        jsr sideMul\n' : ''}
        ldx rang
        lda posYT,x
        bne cypos
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
cydone: ldy #24
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
cidx:   lda remH
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
ddAng:  lda #$02
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

${SPRITES ? `        * = ${hx16(SPRBASE)}\norbBM:  ${ORBBM.map(b => '!byte ' + b.join(',')).join('\n        ')}\n` : ''}        * = charset
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
rampT:  ${chunk(rampT).trim()}
${chainSrc('bkA', SCR_A, ROWSD, 'rfEdge')}
${chainSrc('bkB', SCR_B, ROWSD, 'rfEdge')}
${chainSrc('slA', SCR_A, ROWSA, 'rfNext')}
${chainSrc('slB', SCR_B, ROWSA, 'rfNext')}
${edgeSrc('edA', SCR_A)}
${edgeSrc('edB', SCR_B)}
chainEnd:
        * = ${hx16(HTABLE)}
hTabT:  ${chunk(hTab, 32).trim()}
${PROFILE ? '' : ''}${SPRITES ? `

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
${ORBSTILL ? '' : '        jmp obMoved'}
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
        sta omMix
        lda py+1                ; which cell is the player standing in?
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
        sta oflag               ; bit 7: some run visible from this cell could occlude this orb
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
obEnd:  ${DBGORB ? `lda py+1
        asl
        asl
        asl
        asl
        clc
        adc px+1
        sta odb
        lda kxc
        sta odb+1
        lda kxs
        sta odb+2
        lda kyc
        sta odb+3
        lda kys
        sta odb+4
        lda onv
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
        sta $0478,y
        sta $2478,y
        iny
        lda odb,x
        and #$0f
        clc
        adc #${hx(GLYPH0)}
        sta $0478,y
        sta $2478,y
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
osFlush:ldx onv
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
        sta $07f8,x             ; the pointer lives in the SCREEN, so both buffers need it
        sta $27f8,x
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
        lda ${ORBPRI === undefined ? 'omPri' : '#$0' + (ORBPRI === '1' ? 'ff' : '0')}
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
        jmp ocS
ocN:    sec
        lda #80
        sbc ocoff
ocS:    sta ocol
        lda ocoff               ; --- screen X: 24 + 2*column - halfWidth, signed 16-bit ---
        asl
        sta o0
        lda #$00
        rol
        sta o1
        lda oaS
        bmi oxNeg
        clc
        lda o0
        adc #${24 + 160}
        sta o0
        lda o1
        adc #$00
        sta o1
        jmp oxDn
oxNeg:  sec
        lda #${24 + 160}
        sbc o0
        sta o0
        lda #$00
        sbc o1
        sta o1
oxDn:   ldx ovar
        sec
        lda o0
        sbc orbHalfT,x
        sta o0
        lda o1
        sbc #$00
        sta o1
        bmi orbNo               ; fully off the left edge
        cmp #$02
        bcs orbNo               ; past x = 512, fully off the right
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
        ldx ovar                ; half the orb's width, in logical columns
        lda orbColT,x
        sta o2
        lda ocol                ; the bounding box, in logical columns
        sec
        sbc o2
        bcs opBL1
        lda #$00
opBL1:  sta ocl2
        lsr
        lsr
        sta ocl
        lda ocol
        clc
        adc o2
        bcc opBR1
        lda #159
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
opDone: ${VSTEPDBG ? `lda ocnear              ; VSTEPDBG: the LAST projected orb's counts, as
        sta $d020               ; border and ceiling colour -- the on-screen hex readout needs
        lda ocspan              ; a clean background and the interesting viewpoints are exactly
        sta $d021               ; the ones that lack it
` : ''}
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
oNoX:   lda o0
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
        lda ocl
        sta obCL,x
        lda ocr
        sta obCR,x
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
; ---- orbPaint: turn what the orbs asked for into what the walls will be drawn as ----
;
; Three steps, in order, and no screen memory is touched by any of them.
;   1. every orb marks the cells its bounding box covers, and within those cells the COLUMNS
;      whose wall must clip it. Columns, not cells: a cell at a corner shows two walls, and the
;      four bit pairs of a char can say something different about each of its four columns.
;   2. each orb's priority bit. It is "behind foreground" unless some column inside its box came
;      out foreground that this orb did NOT ask for -- meaning another, nearer orb needed it. The
;      hardware offers one shared foreground set and one bit per sprite, so that case cannot be
;      expressed; letting the orb through reads far better than a bite out of it.
;   3. one char code per covered cell, straight from the four-bit mask, which already names the
;      split boundary. Cells no orb covers keep whatever the renderer chose, seam and all.
orbPaint:
        lda onv
        beq opAllD              ; nothing on screen: the walls stay background and nothing clips
        ldx #$00
opAll:  jsr opSlot              ; load slot X's box and occluder bitmap
        ; First just count. An orb every column of whose box is occluded cannot be seen at all,
        ; and an orb nobody can see must not get a vote: its demands would make walls foreground
        ; for no visible gain and force VISIBLE orbs into the conflict rule below. It does not
        ; even need a sprite -- dropping it is both cheaper and exactly what it looks like.
        lda #$00
        sta opreq
        sta opcon               ; reused here as the box's own column count
        tay
        sty opbn
        ldx opcl
opA0:   jsr opCell
        ldy opbn
        sta opbuf,y             ; keep it: recomputing costs two bitmap lookups a cell
        tay
        lda popcT,y
        clc
        adc opreq
        sta opreq
        ldy pbb
        lda popcT,y
        clc
        adc opcon
        sta opcon
        inx
        ldy opbn
        iny
        sty opbn
        cpx opcr
        bcc opA0
        beq opA0
        lda opreq
        cmp opcon
        bcc opA1s               ; something of it shows: let it speak
        ldx opsl                ; wholly hidden: take its sprite away and move on
        lda orbBitT,x
        eor #$ff
        and omEn
        sta omEn
        jmp opANx
opA1s:  ldx opcl
        ldy #$00
opA1:   lda opbuf,y
        ora fgCell,x
        sta fgCell,x
        iny
        inx
        cpx opcr
        bcc opA1
        beq opA1
opANx:  ldx opsl
        inx
        cpx onv
        bcc opAll
        ; ---- 2. each orb's priority bit, now that the foreground set is final ----
        ldx #$00
opPri:  jsr opSlot
        lda orbBitT,x
        and omEn
        beq opP2                ; pass 1 took this one's sprite away: nothing to decide
        lda #$00
        sta opreq
        sta opcon
        ldx opcl
opP1:   jsr opCell
        sta pmk                 ; columns this orb needs to clip it ...
        tay
        lda popcT,y
        clc
        adc opreq
        sta opreq
        lda pmk
        eor #$0f                ; ... against columns it did NOT ask for but which something
        and pbb                 ; else made foreground. Both are counted rather than the second
        and fgCell,x            ; merely noted: one shared foreground set and one bit per sprite
        tay                     ; cannot express both, so the bit goes with the majority.
        lda popcT,y
        clc
        adc opcon
        sta opcon
        inx
        cpx opcr
        bcc opP1
        beq opP1
        lda opcon               ; more of the box wants clipping than not: let the VIC clip.
        cmp opreq               ; Ties go to clipping -- a wall that should hide an orb is more
        beq opP1a               ; conspicuous than an orb slightly over one that should not.
        bcs opP2
opP1a:  ldx opsl
        lda orbBitT,x
        ora omPri
        sta omPri
opP2:   ldx opsl
        inx
        cpx onv
        bcc opPri
        ; ---- 3. the char code for every covered cell ----
        ldx #${hx(NCELL - 1)}
opMat:  lda fgCell,x
        beq opMt1               ; no orb needs this column to clip: it stays background black
        tay
        lda seamT,x
        cmp #${hx(SEAM0)}
        bcc opMt2
        ; A seam has only two forms, all-clipping or all-not, because its grey stripe can live
        ; in no other bit pair and there are no codes left for a per-column seam. So it goes
        ; with the majority of the cell, and a tie goes to NOT clipping: an orb slightly over a
        ; wall reads better than a bite out of one, and the stripe still crosses it either way.
        lda fgCell,x
        tay
        lda popcT,y
        cmp #$03
        bcc opMt1
        lda seamT,x
        sec                     ; same line, but its black columns now clip
        sbc #$04
        sta seamT,x
        bcs opMt1               ; always
opMt2:  lda fgCodeT,y
        sta seamT,x
opMt1:  dex
        bpl opMat
opAllD: rts

; opSlot: copy sprite slot X's cell range and box-edge masks into scratch, and point omptr at
; its occluder bitmap. CPX and LDX have no indexed-absolute mode, so the loop bounds have to
; live somewhere the comparisons can reach.
opSlot: stx opsl
        lda obCL,x
        sta opcl
        lda obCR,x
        sta opcr
        lda obBL,x
        sta opbl
        lda obBR,x
        sta opbr
        lda obIX,x
        tay
        lda orbOccLoT,y
        sta omptr
        lda orbOccHiT,y
        sta omptr+1
        rts

; opCell: for the orb whose bitmap omptr points at, which of cell X's four columns must clip
; it? Returns that four-bit mask in A, and leaves the box mask for the cell in pbb. Bit 3 is
; the cell's leftmost column, so the mask reads left to right and indexes fgCodeT directly.
opCell: lda #$0f
        cpx opcl
        bne opC1
        and opbl
opC1:   cpx opcr
        bne opC2
        and opbr
opC2:   sta pbb
        lda #$00
        sta pmk
        ldy cstepT,x
        lda kMaskT,y            ; the columns belonging to the cell's FIRST run
        sta pkm
        lda cellFace2T,x
        jsr opBit
        beq opC3
        lda pkm
        sta pmk
opC3:   lda cellFaceT,x
        jsr opBit
        beq opC4
        lda pkm
        eor #$0f                ; ... and the rest belong to its LAST run
        ora pmk
        sta pmk
opC4:   lda pmk
        and pbb
        rts

; opBit: A = a wall run id -> Z=0 if this orb lies beyond that run's face plane, from the
; precomputed bitmap at omptr. X is the caller's cell index and is preserved.
opBit:  sta tmp
        lsr
        lsr
        lsr
        tay
        lda (omptr),y
        sta tmp2
        lda tmp
        and #$07
        tay
        lda orbBitT,y
        and tmp2
        rts

; kSgn: the high byte a signed byte sign-extends to.
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
${SPRITES ? `        * = ${hx16(RELOC + 0x1300)}
orbVarT: !byte ${orbVarT.join(',')}
        * = ${hx16(RELOC + 0x1400)}
orbPtrT: !byte ${orbPtrT.join(',')}
orbExpT: !byte ${orbExpT.join(',')}
orbHalfT: !byte ${orbHalfT.join(',')}
orbYBaseT: !byte ${orbYBaseT.join(',')}
orbColT: !byte ${orbColT.join(',')}
orbSpHT: !byte ${orbSpHT.join(',')}
orbBlankT: !byte ${orbBlankT.join(',')}   ; transparent rows above the ball, per variant
; bbLT / bbRT: a bounding box starts and ends part-way through a cell, so these give the
; columns of that first and last cell which lie inside it. Bit 3 is the leftmost column.
popcT:  !byte 0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4
bbLT:   !byte $0f,$07,$03,$01
bbRT:   !byte $08,$0c,$0e,$0f
; kMaskT: cstepT names where a cell's run boundary falls, so this is the set of columns
; belonging to the FIRST of its two runs. 0 = no boundary, so the cell shows one run and it
; is the last one.
kMaskT: !byte $00,$08,$0c,$0e
; fgCodeT: the four-bit foreground mask straight to a char code. The mask already names the
; split boundary, so no separate lookup of where it falls is needed. The four non-contiguous
; masks need three runs inside one cell to arise and have no code; they fall back to whichever
; answer covers more of the cell.
fgCodeT: !byte ${[...Array(16)].map((_, m) => {
  const bit = c => (m >> (3 - c)) & 1;
  if (m === 0) return hx(SOLIDBG);
  if (m === 15) return hx(SOLID);
  for (let k = 1; k <= 3; k++) {
    const left = [...Array(4)].map((_, c) => (c < k ? 1 : 0));
    if (left.every((v, c) => v === bit(c))) return hx(SPLIT0 + (k - 1) * 2);
    if (left.every((v, c) => (1 - v) === bit(c))) return hx(SPLIT0 + (k - 1) * 2 + 1);
  }
  const n = [0,1,2,3].filter(bit).length;
  return hx(n >= 2 ? SOLID : SOLIDBG);
}).join(',')}
orbBitT: !byte ${orbBitT.join(',')}
orbOccLoT: !byte ${orbOccLo.join(',')}
orbOccHiT: !byte ${orbOccHi.join(',')}
        * = ${hx16(RELOC + 0x1500)}
orbXCT: !byte ${orbXC.join(',')}
orbYCT: !byte ${orbYC.join(',')}
orbColT2: !byte ${orbCol.join(',')}
        * = ${hx16(RELOC + 0x1600)}
candCntT: !byte ${candCnt.join(',')}
        * = ${hx16(RELOC + 0x1700)}
candLoT: !byte ${candLo.join(',')}
        * = ${hx16(RELOC + 0x1800)}
candHiT: !byte ${candHi.join(',')}
` : ''}${SPRITES ? `        * = ${hx16(RELOC + 0x1900)}
candListT: !byte ${candList.join(',')}   ; read through a 16-bit pointer, so it may cross pages
` : ''}${SPRITES ? `        * = ${hx16(OCCBASE)}
orbOccT: !byte ${orbOccFlat.join(',')}
` : ''}        ; Step tables, one page each. Addressed by qA*(LM*LB) + qM*LB + qB, so a full byte of
        ; index -- exactly the case a page crossing taxes, and exactly why they are up here
        ; rather than packed in below the height tables where they used to live.
        * = ${hx16(RELOC + 0x2400)}
stepT1: ${chunk(stepT[0]).trim()}
        * = ${hx16(RELOC + 0x2500)}
stepT2: ${chunk(stepT[1]).trim()}
        * = ${hx16(RELOC + 0x2600)}
stepT3: ${chunk(stepT[2]).trim()}
${SPRITES ? `        * = ${hx16(RELOC + 0x2700)}
; splitT: cell code -> the same cell drawn with a priority edge down the run boundary inside
; it, or 0 for "no such twin, fall back to a whole-cell answer". Sits above the step tables
; because the assembler takes origins in ascending order only.
splitT: !byte ${splitT.join(',')}
` : ''}
${PROFILE ? `        * = ${hx16(RELOC + 0x2800)}  ; the profiler lives above the relocated
                            ; tables: it must not crowd the shipping build out of the
                            ; space it has left below screen buffer B
` : ''}${PROFILE ? `; ---- pfShow: 7 phases as 4 hex digits each, one per row from row 4 ----
; Accumulated over exactly 256 frames, so bytes 1 and 2 of each 24-bit total ARE the mean
; raster lines per frame. One line is 65 cycles. Read it back with readout.mjs PROF=1.
pfShow: lda #$00
        sta pfRow
psLp:   lda pfRow
        clc
        adc #$04
        jsr setRow
        ldy #$00
        lda pfRow               ; byte offset = row*3 + 1 (skip the low byte: /256)
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
        cmp #$07
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
        lda $d012
        sta pfCurL
        lda frameCnt
        cmp pfCurF
        bne pfTick
        sec                     ; delta = (f - pf)*263 + (l - pl)
        lda pfCurL
        sbc pfPrvL
        sta pfDLo
        lda #$00
        sbc #$00                ; sign-extend the line difference
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
    // Deliberately shared: orbMove runs after renderSym, by which point seamSpan's scratch is
    // dead for the frame, and orbMove keeps nothing across frames. Zero page is full, and this
    // routine's working set is hot enough that absolute addressing cost it ~240 cycles a frame.
    // NOT the whole seam range: mul8's own mp/mq/plo/phi sit at $98-$9b in the middle of it,
    // and they are live inside every jsr mul8 orbMove makes. Sharing those put ivH on mp and
    // ohgt on mq, and each multiply quietly ate its own inputs.
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
  // 64-byte boundary, so this is the number that decides how many sprites are possible.
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
