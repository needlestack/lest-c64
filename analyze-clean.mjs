// analyze-clean.mjs — how much of the map affords SAFE coarse (whole-wall) interpolation?
// For each (empty-cell sub-position, direction) we cast the true 80-ray view, then test
// whether sampling every K rays and linearly interpolating reproduces it within THRESH.
// "clean" viewpoints are where the fast 20->80 path is provably safe (no hidden occluder).

const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r => r.split('').map(Number));
const wall = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? 1 : M[y][x];

const NCOL = 80, FOV = 47, PI2 = Math.PI * 2;
const rayOff = []; for (let c = 0; c < NCOL; c++) rayOff.push(Math.round((c - (NCOL - 1) / 2) * FOV / (NCOL - 1)));

// standard DDA raycast for one column -> { h(half-height 0..50), id(cell), side }
function cast(px, py, pa, c) {
  const ang = (pa + rayOff[c]) / 256 * PI2;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let mapX = Math.floor(px), mapY = Math.floor(py);
  const ddx = Math.abs(dx) < 1e-9 ? 1e9 : Math.abs(1 / dx);
  const ddy = Math.abs(dy) < 1e-9 ? 1e9 : Math.abs(1 / dy);
  let stepX, stepY, sdx, sdy;
  if (dx < 0) { stepX = -1; sdx = (px - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - px) * ddx; }
  if (dy < 0) { stepY = -1; sdy = (py - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - py) * ddy; }
  let side = 0, perp = 64;
  for (let i = 0; i < 64; i++) {
    if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; } else { sdy += ddy; mapY += stepY; side = 1; }
    if (wall(mapX, mapY)) {
      perp = side === 0 ? (mapX - px + (1 - stepX) / 2) / dx : (mapY - py + (1 - stepY) / 2) / dy;
      break;
    }
  }
  let h = Math.round(44 / Math.max(0.03, perp)); h = Math.max(0, Math.min(50, h));
  return { h, id: mapY * 16 + mapX, side };
}

const K = 4, THRESH = 3;           // every-4th-ray (20->80) interpolation, allow 3-row error
const NDIR = 32;                   // directions sampled per position
const SUBS = [0.2, 0.5, 0.8];      // sub-cell positions per axis

let total = 0, clean = 0;
let cellCount = 0;                 // empty cells
const perCellClean = [];           // clean-direction fraction per cell
let sumDistinctCells = 0, sumDistinctFaces = 0, views = 0;

for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 16; cx++) {
  if (wall(cx, cy)) continue;
  cellCount++;
  let cellClean = 0, cellTot = 0;
  for (const sxf of SUBS) for (const syf of SUBS) {
    const px = cx + sxf, py = cy + syf;
    for (let d = 0; d < NDIR; d++) {
      const pa = Math.round(d * 256 / NDIR);
      const H = [], ID = [], SD = [];
      for (let c = 0; c < NCOL; c++) { const r = cast(px, py, pa, c); H.push(r.h); ID.push(r.id); SD.push(r.side); }
      // coarse interpolation: sample columns 0,K,2K,... and last, lerp between
      let maxErr = 0;
      for (let a = 0; a < NCOL - 1; a += K) {
        const b = Math.min(a + K, NCOL - 1);
        for (let x = a; x <= b; x++) {
          const t = (x - a) / (b - a);
          const interp = H[a] + (H[b] - H[a]) * t;
          maxErr = Math.max(maxErr, Math.abs(interp - H[x]));
        }
      }
      const isClean = maxErr <= THRESH;
      total++; cellTot++;
      if (isClean) { clean++; cellClean++; }
      // stats: distinct cells (per-cell subdivision marches) vs distinct faces (corners)
      let dc = 1, df = 1;
      for (let x = 1; x < NCOL; x++) {
        if (ID[x] !== ID[x - 1]) dc++;
        if (ID[x] !== ID[x - 1] || SD[x] !== SD[x - 1]) { /* face change requires cell or side change */ }
        if (SD[x] !== SD[x - 1] || Math.abs(H[x] - H[x - 1]) > 12) df++;
      }
      sumDistinctCells += dc; sumDistinctFaces += df; views++;
    }
  }
  perCellClean.push(cellClean / cellTot);
}

console.log(`map: ${cellCount} empty cells, ${total} viewpoints sampled (${SUBS.length ** 2} sub-pos x ${NDIR} dirs each)`);
console.log(`CLEAN (K=${K} / 20-ray interp accurate within ${THRESH} rows): ${(100 * clean / total).toFixed(1)}%`);
console.log(`avg distinct wall-cells per view (per-cell subdivision marches): ${(sumDistinctCells / views).toFixed(1)}`);
console.log(`avg distinct faces per view (corner-level marches):            ${(sumDistinctFaces / views).toFixed(1)}`);
// distribution of per-cell cleanliness
const buckets = [0, 0, 0, 0, 0]; // 0-20,20-40,40-60,60-80,80-100 %
for (const f of perCellClean) buckets[Math.min(4, Math.floor(f * 5))]++;
console.log(`per-cell clean-direction fraction distribution (of ${cellCount} cells):`);
console.log(`  0-20%: ${buckets[0]}   20-40%: ${buckets[1]}   40-60%: ${buckets[2]}   60-80%: ${buckets[3]}   80-100%: ${buckets[4]}`);

// also try a few K / THRESH combos for context
for (const [k, th] of [[2, 3], [4, 5], [8, 3], [8, 6]]) {
  let cl = 0, tt = 0;
  for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 16; cx++) {
    if (wall(cx, cy)) continue;
    for (const sxf of SUBS) for (const syf of SUBS) {
      const px = cx + sxf, py = cy + syf;
      for (let d = 0; d < NDIR; d++) {
        const pa = Math.round(d * 256 / NDIR);
        const H = []; for (let c = 0; c < NCOL; c++) H.push(cast(px, py, pa, c).h);
        let me = 0;
        for (let a = 0; a < NCOL - 1; a += k) { const b = Math.min(a + k, NCOL - 1); for (let x = a; x <= b; x++) { const t = (x - a) / (b - a); me = Math.max(me, Math.abs(H[a] + (H[b] - H[a]) * t - H[x])); } }
        tt++; if (me <= th) cl++;
      }
    }
  }
  console.log(`  K=${k}, THRESH=${th}: ${(100 * cl / tt).toFixed(1)}% clean`);
}
