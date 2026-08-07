// analyze-clean2.mjs — refined "clean" test: a view is mergeable unless some wall FACE
// is interrupted and then RESUMES (a nearer object with the same far wall on both sides,
// or a colinear wall with a gap). One-sided occlusion is just a boundary -> always fine.

const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r => r.split('').map(Number));
const wall = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? 1 : M[y][x];

const NCOL = 80, FOV = 47, PI2 = Math.PI * 2;
const rayOff = []; for (let c = 0; c < NCOL; c++) rayOff.push(Math.round((c - (NCOL - 1) / 2) * FOV / (NCOL - 1)));

// returns { faceId (the flat wall PLANE+side), cellId, h }
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
    if (wall(mapX, mapY)) { perp = side === 0 ? (mapX - px + (1 - stepX) / 2) / dx : (mapY - py + (1 - stepY) / 2) / dy; break; }
  }
  let h = Math.round(44 / Math.max(0.03, perp)); h = Math.max(0, Math.min(50, h));
  // faceId = flat wall plane + which side. side=0: vertical wall x=mapX (W/E). side=1: horiz y=mapY (N/S).
  const faceId = side === 0 ? (mapX * 4 + (stepX > 0 ? 0 : 1)) : (256 + mapY * 4 + (stepY > 0 ? 2 : 3));
  return { faceId, cellId: mapY * 16 + mapX, h };
}

const NDIR = 32, SUBS = [0.2, 0.5, 0.8];
let total = 0, cleanNew = 0, cleanOld = 0;
let faceRuns = 0, faceRunsMergeable = 0;
let sumCells = 0, sumFaces = 0;

for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 16; cx++) {
  if (wall(cx, cy)) continue;
  for (const sxf of SUBS) for (const syf of SUBS) {
    const px = cx + sxf, py = cy + syf;
    for (let d = 0; d < NDIR; d++) {
      const pa = Math.round(d * 256 / NDIR);
      const F = [], C = [], H = [];
      for (let c = 0; c < NCOL; c++) { const r = cast(px, py, pa, c); F.push(r.faceId); C.push(r.cellId); H.push(r.h); }
      total++;
      // NEW metric: any face that appears non-contiguously (interrupted then resumes)?
      const closed = new Set(); let prev = null, cleanView = true;
      // count contiguous face-runs while we're at it
      let runs = 0;
      for (let x = 0; x < NCOL; x++) {
        if (F[x] === prev) continue;
        runs++;
        if (closed.has(F[x])) cleanView = false;   // reappearance -> both-sides occlusion
        if (prev !== null) closed.add(prev);
        prev = F[x];
      }
      if (cleanView) cleanNew++;
      // per-run mergeability: a run is mergeable if its face never reappears elsewhere
      {
        const appears = new Map(); // faceId -> list of run indices
        let p = null, ri = -1; const runFace = [];
        for (let x = 0; x < NCOL; x++) { if (F[x] !== p) { ri++; runFace.push(F[x]); p = F[x]; } }
        const cnt = new Map(); for (const f of runFace) cnt.set(f, (cnt.get(f) || 0) + 1);
        for (const f of runFace) { faceRuns++; if (cnt.get(f) === 1) faceRunsMergeable++; }
      }
      // OLD metric: coarse K=4 interp within 3 rows
      let maxErr = 0;
      for (let a = 0; a < NCOL - 1; a += 4) { const b = Math.min(a + 4, NCOL - 1); for (let x = a; x <= b; x++) { const t = (x - a) / (b - a); maxErr = Math.max(maxErr, Math.abs(H[a] + (H[b] - H[a]) * t - H[x])); } }
      if (maxErr <= 3) cleanOld++;
      // stats
      let dc = 1, df = 1; for (let x = 1; x < NCOL; x++) { if (C[x] !== C[x - 1]) dc++; if (F[x] !== F[x - 1]) df++; } sumCells += dc; sumFaces += df;
    }
  }
}

console.log(`viewpoints: ${total}`);
console.log(`CLEAN (new: no face interrupted-and-resumed -> whole view mergeable): ${(100 * cleanNew / total).toFixed(1)}%`);
console.log(`CLEAN (old: coarse K=4 interp within 3 rows):                        ${(100 * cleanOld / total).toFixed(1)}%`);
console.log(`per-face-run mergeable (face never reappears in that view):          ${(100 * faceRunsMergeable / faceRuns).toFixed(1)}%  (of ${faceRuns} runs)`);
console.log(`avg distinct cells/view: ${(sumCells / total).toFixed(1)}   avg distinct faces/view: ${(sumFaces / total).toFixed(1)}`);
