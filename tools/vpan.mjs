// vpan.mjs -- read a vprof.mjs report and say where the cycles go, per RENDERED FRAME.
//
//   node tools/vpan.mjs prof.txt [--hot 30] [--cross 25]
//
// From VICE's per-instruction profile (cycles, executions, average cycles) it derives:
//   * self cycles per frame for every routine that was broken down;
//   * the hottest single instructions;
//   * PAGE-CROSSING PENALTIES: an indexed read (abs,X / abs,Y / (zp),Y) costs one extra cycle
//     when the effective address crosses a page, and a TAKEN branch one extra when its target is
//     in another page. VICE reports what each instruction actually cost, so the penalty is simply
//     actual - (base cycles + taken branches). It is the cost of WHERE things landed, not of what
//     the code does -- the relayout decides it, and it can be fixed without touching the logic.
// "Stolen" cycles (VIC badlines, sprite DMA) are not in these numbers; vprof prints them per routine.
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const txt = readFileSync(args[0], 'utf8');
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : +args[i + 1]; };
const HOT = opt('--hot', 30), CROSS = opt('--cross', 25);
const frames = +(/(\d+) rendered frames/.exec(txt) ?? [0, 0])[1];
if (!frames) throw new Error('no rendered-frame count in the report');

// SHY/SHX (undocumented, SHYCOL uses SHY) always take the indexed-store time, like STA abs,X.
const RMW = /^(ASL|LSR|ROL|ROR|INC|DEC)$/, STORE = /^(STA|STX|STY|SHY|SHX)$/;
const BR = /^(BCC|BCS|BEQ|BNE|BMI|BPL|BVC|BVS)$/;
const IMPL = { PHA: 3, PHP: 3, PLA: 4, PLP: 4, RTS: 6, RTI: 6, BRK: 7 };
// Base cycles, NMOS 6502, before any page-crossing penalty or taken branch.
function base(mn, op) {
  if (BR.test(mn)) return 2;
  if (mn === 'JSR') return 6;
  if (mn === 'JMP') return op.startsWith('(') ? 5 : 3;
  if (!op || op === 'A') return IMPL[mn] ?? 2;
  if (op.startsWith('#')) return 2;
  if (/^\(.*,X\)$/.test(op)) return 6;
  if (/^\(.*\),Y$/.test(op)) return STORE.test(mn) ? 6 : 5;
  const zp = /^\$[0-9A-F]{2}(,[XY])?$/i.test(op) || (/^\.[\w]+(,[XY])?$/.test(op) && false);
  const idx = /,[XY]$/.test(op);
  // A label hides whether it is zero page; the byte count settles it (2 bytes = zero page).
  return { idx, zp, rmw: RMW.test(mn), store: STORE.test(mn) };
}
function baseCycles(mn, op, nbytes) {
  const b = base(mn, op);
  if (typeof b === 'number') return b;
  const zp = nbytes === 2;
  if (zp) return b.idx ? (b.rmw ? 6 : 4) : (b.rmw ? 5 : 3);
  if (b.idx) return b.rmw ? 7 : b.store ? 5 : 4;
  return b.rmw ? 6 : 4;
}

const fns = [];
for (const blk of txt.split(/^==== /m).slice(1)) {
  const name = blk.split('\n')[0].trim();
  const rows = [];
  for (const l of blk.split('\n')) {
    // "   451,086   0.7%   150,362 3   [ 7.5%] .C:10de   86 75       STX .colc"
    const m = /^\s*([\d,]+)\s+[\d.na]+%\s+([\d,]+)\s+([\d.]+)\s+(?:([\d.]+)%\s+)?(?:\d\s+)?\*?\.C:([0-9a-f]{4})\s+((?:[0-9A-F]{2} ){1,3})\s*(\w{3})\s*(.*)$/.exec(l);
    if (!m) continue;
    const cyc = +m[1].replace(/,/g, ''), times = +m[2].replace(/,/g, '');
    const br = m[4] != null ? +m[4] / 100 : 0;
    const nbytes = m[6].trim().split(' ').length, mn = m[7], op = m[8].trim();
    const bc = baseCycles(mn, op, nbytes);
    const expect = times * bc + (BR.test(mn) ? Math.round(times * br) : 0);
    rows.push({ fn: name, addr: m[5], mn, op, cyc, times, avg: +m[3], pen: Math.max(0, cyc - expect) });
  }
  fns.push({ name, rows, self: rows.reduce((a, r) => a + r.cyc, 0), pen: rows.reduce((a, r) => a + r.pen, 0) });
}
// The main loop's raster wait (LDA $D012 / CMP #$FA / BNE mvsW) is IDLE, not work: the time left
// over until the next 60th. Separated out so a routine's share is of the WORK, and so the slack a
// change frees shows up somewhere.
const isIdle = r => (r.mn === 'LDA' && r.op === '$D012') || (r.mn === 'CMP' && r.op === '#$FA') || (BR.test(r.mn) && r.op === '.mvsW');
for (const f of fns) { f.idle = f.rows.filter(isIdle).reduce((a, r) => a + r.cyc, 0); f.self -= f.idle;
  f.pen -= f.rows.filter(isIdle).reduce((a, r) => a + r.pen, 0); }
if (args.includes('--json')) {
  console.log(JSON.stringify({ frames, idle: fns.reduce((a, f) => a + f.idle, 0) / frames,
    fns: Object.fromEntries(fns.map(f => [f.name.replace(/^\./, ''), { self: f.self / frames, pen: f.pen / frames }])) }));
  process.exit(0);
}
const pf = c => (c / frames).toFixed(0).padStart(7);
console.log(`${frames} rendered frames; raster-wait idle ${pf(fns.reduce((a, f) => a + f.idle, 0))} cy/frame (not counted below)\n`);
console.log('routine                      self cy/frame   page-cross cy/frame');
for (const f of fns.sort((a, b) => b.self - a.self))
  console.log(`  ${f.name.padEnd(26)} ${pf(f.self)}         ${pf(f.pen)}`);
const all = fns.flatMap(f => f.rows);
console.log(`\nhottest instructions (cy/frame, executions/frame, avg cycles):`);
for (const r of all.sort((a, b) => b.cyc - a.cyc).slice(0, HOT))
  console.log(`  ${pf(r.cyc)}  ${(r.times / frames).toFixed(1).padStart(6)}x  ${r.avg.toFixed(2)}  ${r.fn.padEnd(14)} $${r.addr}  ${r.mn} ${r.op}`);
console.log(`\npage-crossing penalties (cy/frame) -- total ${pf(all.reduce((a, r) => a + r.pen, 0))}:`);
for (const r of all.filter(r => r.pen > 0).sort((a, b) => b.pen - a.pen).slice(0, CROSS))
  console.log(`  ${pf(r.pen)}  ${(100 * r.pen / r.times).toFixed(0).padStart(3)}% of runs  ${r.fn.padEnd(14)} $${r.addr}  ${r.mn} ${r.op}`);
