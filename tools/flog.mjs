// flog.mjs -- read a FRAMELOG dump (probe.mjs output) and rank where the frames were expensive.
//
//   node tools/probe.mjs "ROUTE=cover ... FRAMELOG=1" flogB:2816 flogN:2 twFrm:2 --until "pfDone>=1" > cover.txt
//   node tools/flog.mjs cover.txt [--map]
//
// Each record is (cell, heading, work in raster lines) for one rendered frame, taken IN MOTION on
// a route that covers the level. The ranking is by cell and by (cell, heading-octant) because
// those are the units a route can be authored in: a waypoint is a cell, and the heading between
// two waypoints is whatever the geometry gives, so an octant is as fine as it is worth being.
import { readFileSync } from 'fs';

const t = readFileSync(process.argv[2], 'utf8');
const field = n => {
  const m = t.match(new RegExp(`^${n}\\s+\\$[0-9a-f]+\\s+([0-9 ]+?)(?:\\s{2}|$)`, 'm'));
  if (!m) throw new Error(`no ${n} in the dump`);
  return m[1].trim().split(/\s+/).map(Number);
};
const b = field('flogB'), nb = field('flogN'), n = nb[0] + 256 * nb[1];
if (n > b.length) throw new Error(`the log WRAPPED: cursor ${n} past a ${b.length}-byte buffer. Raise FLOGDIV.`);
const MAPW = +(process.env.MAPW ?? 16);
// Record 0 is measured against a zero opening tick and is garbage by construction; drop it.
const recs = [];
for (let i = 4; i + 3 < n; i += 4)
  recs.push({ cell: b[i], x: b[i] % MAPW, y: (b[i] / MAPW) | 0, pa: b[i + 1], w: b[i + 2] + 256 * b[i + 3] });
const CY = 65;
const ws = recs.map(r => r.w).sort((a, b) => a - b);
const q = p => ws[Math.min(ws.length - 1, Math.floor(p * ws.length))];
console.log(`${recs.length} frames logged; work (raster lines): min ${ws[0]}  p25 ${q(.25)}  median ${q(.5)}  ` +
  `p75 ${q(.75)}  p90 ${q(.9)}  max ${ws[ws.length - 1]}   (x${CY} for cycles; 263 lines = one video frame)`);

// by cell
const byCell = new Map();
for (const r of recs) { const k = r.cell; (byCell.get(k) ?? byCell.set(k, []).get(k)).push(r); }
const rows = [...byCell].map(([cell, rs]) => {
  const w = rs.map(r => r.w), mean = w.reduce((a, b) => a + b, 0) / w.length;
  return { cell, x: cell % MAPW, y: (cell / MAPW) | 0, n: w.length, mean, max: Math.max(...w) };
}).sort((a, b) => b.mean - a.mean);
console.log('\nby cell, worst first (mean lines of work per frame while moving through it):');
console.log('   cell        n    mean     max');
for (const r of rows.slice(0, 14))
  console.log(`  (${String(r.x).padStart(2)},${r.y})   ${String(r.n).padStart(4)}  ${r.mean.toFixed(0).padStart(6)}  ${String(r.max).padStart(6)}`);

// by (cell, octant): heading in 8 sectors of 32 units, centred on the axes
const oct = pa => ((pa + 16) >> 5) & 7;
const OCT = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];   // pa rises toward +y, which is SOUTH on the map
const byCO = new Map();
for (const r of recs) { const k = `${r.cell}:${oct(r.pa)}`; (byCO.get(k) ?? byCO.set(k, []).get(k)).push(r); }
const co = [...byCO].map(([k, rs]) => {
  const [cell, o] = k.split(':').map(Number), w = rs.map(r => r.w);
  return { x: cell % MAPW, y: (cell / MAPW) | 0, o, n: w.length, mean: w.reduce((a, b) => a + b, 0) / w.length, max: Math.max(...w) };
}).filter(r => r.n >= 3).sort((a, b) => b.mean - a.mean);
console.log('\nby cell and heading, worst first (3+ frames):');
console.log('   cell   facing    n    mean     max');
for (const r of co.slice(0, 16))
  console.log(`  (${String(r.x).padStart(2)},${r.y})   ${OCT[r.o].padEnd(4)}   ${String(r.n).padStart(4)}  ${r.mean.toFixed(0).padStart(6)}  ${String(r.max).padStart(6)}`);

if (process.argv.includes('--map')) {
  const H = Math.max(...rows.map(r => r.y)) + 1;
  // A cell's mean is over the HEADINGS the route happened to have there, and a route walks most
  // corridors one way. The heading-octant count is printed under each number so a lopsided figure
  // announces itself: 1 means "seen facing one way only", and its mirror cell may say otherwise.
  const octs = new Map();
  for (const r of recs) { const k = r.cell; (octs.get(k) ?? octs.set(k, new Set()).get(k)).add(oct(r.pa)); }
  console.log('\nmean work per cell, as a map (lines/frame; . = never visited).');
  console.log('Under each: how many of 8 heading octants fed it -- a 1 is one direction only, not the cell.');
  console.log('263 lines = one video frame: 780 = 20 fps, 1043 = 15, 1306 = 12, 1569 = 10.');
  for (let y = 0; y < H; y++) {
    let line = `  y=${String(y).padStart(2)} `, sub = '      ';
    for (let x = 0; x < MAPW; x++) {
      const r = rows.find(r => r.x === x && r.y === y);
      line += r ? r.mean.toFixed(0).padStart(5) : '    .';
      sub += r ? String(octs.get(r.cell).size).padStart(5) : '     ';
    }
    console.log(line); console.log(sub);
  }
}
