// analyze-seams.mjs (v2) — iray uses ANGULAR columns (equal angle steps), so:
//  - a seam projects to the column matching the ANGLE to its world point
//  - height ~ cos(theta - wallNormal), so check how much linear interp over a run errs
const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r => r.split('').map(Number));
const wall = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? 1 : M[y][x];
const NCOL = 80, FOV = 47, PI2 = Math.PI * 2, CENTER = (NCOL - 1) / 2;
const rayOff = []; for (let c = 0; c < NCOL; c++) rayOff.push(Math.round((c - CENTER) * FOV / (NCOL - 1)));

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
  const faceId = side === 0 ? (mapX * 4 + (stepX > 0 ? 0 : 1)) : (256 + mapY * 4 + (stepY > 0 ? 2 : 3));
  return { faceId, cellId: mapY * 16 + mapX, side, h, mapX, mapY, stepX, stepY };
}
// angle (0..256) from player to world point, then to column via the angular mapping
function colOfPoint(px, py, pa, wx, wy) {
  let a = Math.atan2(wy - py, wx - px) / PI2 * 256;
  let d = a - pa; while (d > 128) d -= 256; while (d < -128) d += 256;
  return CENTER + d * (NCOL - 1) / FOV;
}

const NDIR = 32, SUBS = [0.2, 0.5, 0.8];
let seamN = 0, seamOK = 0, seamErrSum = 0, seamErrMax = 0;
let hN = 0, hErrSum = 0, hErrMax = 0, runsHiErr = 0, runsTot = 0;

for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 16; cx++) {
  if (wall(cx, cy)) continue;
  for (const sxf of SUBS) for (const syf of SUBS) {
    const px = cx + sxf, py = cy + syf;
    for (let d = 0; d < NDIR; d++) {
      const pa = Math.round(d * 256 / NDIR);
      const R = []; for (let c = 0; c < NCOL; c++) R.push(cast(px, py, pa, c));
      let a = 0;
      while (a < NCOL) {
        let b = a; while (b + 1 < NCOL && R[b + 1].faceId === R[a].faceId) b++;
        if (b - a >= 2) {                       // runs worth merging
          runsTot++;
          // height: linear interp over the run vs truth
          let runHErr = 0;
          for (let x = a; x <= b; x++) { const t = (x - a) / (b - a); const hi = R[a].h + (R[b].h - R[a].h) * t; const e = Math.abs(hi - R[x].h); hErrSum += e; hN++; hErrMax = Math.max(hErrMax, e); runHErr = Math.max(runHErr, e); }
          if (runHErr > 3) runsHiErr++;
          // seams: project each cell-boundary world point via the ANGULAR mapping
          for (let x = a + 1; x <= b; x++) {
            if (R[x].cellId !== R[x - 1].cellId) {
              // seam world point = the shared cell-boundary corner
              let wx, wy;
              if (R[x].side === 0) { wx = R[x].stepX > 0 ? R[x].mapX : R[x].mapX + 1; wy = Math.max(R[x].mapY, R[x - 1].mapY); }
              else { wy = R[x].stepY > 0 ? R[x].mapY : R[x].mapY + 1; wx = Math.max(R[x].mapX, R[x - 1].mapX); }
              const pc = colOfPoint(px, py, pa, wx, wy);
              const trueC = x - 0.5;
              const e = Math.abs(pc - trueC);
              seamN++; seamErrSum += e; seamErrMax = Math.max(seamErrMax, e);
              if (e <= 1.0) seamOK++;
            }
          }
        }
        a = b + 1;
      }
    }
  }
}
console.log(`SEAMS: ${seamN} checked, within 1 col: ${(100 * seamOK / seamN).toFixed(1)}%, avg err ${(seamErrSum / seamN).toFixed(3)} col, max ${seamErrMax.toFixed(2)}`);
console.log(`HEIGHT (linear interp over whole run): avg err ${(hErrSum / hN).toFixed(2)} rows, max ${hErrMax.toFixed(1)}`);
console.log(`runs with height error >3 rows: ${(100 * runsHiErr / runsTot).toFixed(1)}% of ${runsTot} runs`);

// --- extra: are height-linear-fail runs short (near) or long (far)? ---
{
  let okCells = 0, okN = 0, failCells = 0, failN = 0;
  for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 16; cx++) {
    if (wall(cx, cy)) continue;
    for (const sxf of SUBS) for (const syf of SUBS) {
      const px = cx + sxf, py = cy + syf;
      for (let d = 0; d < NDIR; d++) {
        const pa = Math.round(d * 256 / NDIR);
        const R = []; for (let c = 0; c < NCOL; c++) R.push(cast(px, py, pa, c));
        let a = 0;
        while (a < NCOL) {
          let b = a; while (b + 1 < NCOL && R[b + 1].faceId === R[a].faceId) b++;
          if (b - a >= 2) {
            let he = 0; for (let x = a; x <= b; x++) { const t = (x - a) / (b - a); he = Math.max(he, Math.abs(R[a].h + (R[b].h - R[a].h) * t - R[x].h)); }
            let cells = 1; for (let x = a + 1; x <= b; x++) if (R[x].cellId !== R[x - 1].cellId) cells++;
            if (he <= 3) { okCells += cells; okN++; } else { failCells += cells; failN++; }
          }
          a = b + 1;
        }
      }
    }
  }
  console.log(`linear-OK runs:   avg ${(okCells / okN).toFixed(1)} cells/run  (${okN} runs)`);
  console.log(`linear-FAIL runs: avg ${(failCells / failN).toFixed(1)} cells/run  (${failN} runs)`);
}
