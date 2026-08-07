// poly-ref.mjs — JS reference for the polygon (Wayout-style) maze renderer.
// Renders the same 80x80 view by projecting wall FACES as filled trapezoids,
// painter's-sorted. Validates the math before porting to 6502. Outputs PBM.
import { writeFileSync } from 'fs';

const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r => r.split('').map(Number));
const wall = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? 1 : M[y][x];

// wall faces bordering empty cells: [x0,y0,x1,y1, nx,ny] (n = outward normal to empty)
const faces = [];
for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 16; cx++) {
  if (!wall(cx, cy)) continue;
  if (!wall(cx, cy - 1)) faces.push([cx, cy, cx + 1, cy, 0, -1]);       // north
  if (!wall(cx, cy + 1)) faces.push([cx, cy + 1, cx + 1, cy + 1, 0, 1]); // south
  if (!wall(cx - 1, cy)) faces.push([cx, cy, cx, cy + 1, -1, 0]);       // west
  if (!wall(cx + 1, cy)) faces.push([cx + 1, cy, cx + 1, cy + 1, 1, 0]); // east
}

const WIN = 80, CENTER = 40, PROJX = 61.5, PROJH = 70, MIND = 0.05;
// camera (match the raycaster start): (2.5,2.5) facing +x
const px = 2.5, py = 2.5, pa = +(process.argv[2] || 0);
const cosA = Math.cos(pa / 256 * 2 * Math.PI), sinA = Math.sin(pa / 256 * 2 * Math.PI);

function cam(wx, wy) {
  const rx = wx - px, ry = wy - py;
  return { depth: rx * cosA + ry * sinA, lat: ry * cosA - rx * sinA };
}
// project a camera-space point to screen (x, and wall top/bot)
function project(c) {
  const inv = 1 / c.depth;
  return { sx: CENTER + c.lat * PROJX * inv, half: 0.5 * PROJH * inv };
}

// build draw list: transform+clip each face, keep visible ones
const draws = [];
for (const [x0, y0, x1, y1, nx, ny] of faces) {
  // back-face cull: skip faces the player is behind (player must be on the empty side)
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  if ((px - mx) * nx + (py - my) * ny <= 0) continue;
  let a = cam(x0, y0), b = cam(x1, y1);
  if (a.depth <= MIND && b.depth <= MIND) continue;      // fully behind
  // near-plane clip
  if (a.depth <= MIND) { const t = (MIND - a.depth) / (b.depth - a.depth); a = { depth: MIND, lat: a.lat + (b.lat - a.lat) * t }; }
  if (b.depth <= MIND) { const t = (MIND - b.depth) / (a.depth - b.depth); b = { depth: MIND, lat: b.lat + (a.lat - b.lat) * t }; }
  const pa2 = project(a), pb2 = project(b);
  let L = { sx: pa2.sx, half: pa2.half }, R = { sx: pb2.sx, half: pb2.half };
  if (L.sx > R.sx) [L, R] = [R, L];
  if (R.sx < 0 || L.sx > WIN - 1) continue;              // off-screen
  draws.push({ L, R, depth: Math.min(a.depth, b.depth) });
}
// painter's: far first
draws.sort((p, q) => q.depth - p.depth);

// rasterize
const buf = new Uint8Array(WIN * WIN);  // 0=white,1=black
for (const d of draws) {
  const x0 = Math.max(0, Math.ceil(d.L.sx)), x1 = Math.min(WIN - 1, Math.floor(d.R.sx));
  const span = d.R.sx - d.L.sx || 1;
  for (let x = x0; x <= x1; x++) {
    const t = (x - d.L.sx) / span;
    const half = d.L.half + (d.R.half - d.L.half) * t;
    let top = Math.round(CENTER - half), bot = Math.round(CENTER + half);
    top = Math.max(0, top); bot = Math.min(WIN - 1, bot);
    for (let y = top; y <= bot; y++) buf[y * WIN + x] = 1;
  }
}

// write PBM (P1). Wall=1=black.
let out = `P1\n${WIN} ${WIN}\n`;
for (let y = 0; y < WIN; y++) { for (let x = 0; x < WIN; x++) out += buf[y * WIN + x]; out += '\n'; }
writeFileSync('./poly-ref.pbm', out);
console.log(`faces total=${faces.length} drawn=${draws.length}`);
