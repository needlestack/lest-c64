#!/usr/bin/env node
// The simplest fps number that means anything: walk a fixed route, count rendered frames.
//
//   node fpsr.mjs                      ROUTE=b1 on level 1, as it ships
//   node fpsr.mjs "NOORB=1 ANGEL=0"    the same walk with no entities
//   node fpsr.mjs "" 6000              a longer sample
//
// WHY NOT seamprof/bench.sh: bench.sh's ROUTE=bench was authored for the old 16-wide level 1
// and walks into walls on the 23x11 map; seamprof wants the full profiler (pfAcc) and fails
// without it. This needs neither -- the engine already counts both numbers it takes.
//
//   iterLo/iterHi  the main loop's own counter: one per RENDERED frame
//   frameCnt       the raster IRQ at 60Hz, so its delta is real time
//   fps = frames / (ticks / 60)
//
// ONE sample, taken once, so the figure is the average since the program started. That is only
// meaningful because the route is frame-rate exact (see compileRoute): any build walks the same
// line through the same places, so two builds are comparable even though neither is a pure
// measure of the route alone. Pick a wait that lands near the route's end -- ticks come out at
// roughly wait_ms minus the load -- or the idle after it dilutes the number.
import { execFileSync } from 'child_process';

const extra = process.argv[2] ?? '';
const wait = +(process.argv[3] ?? 4500);
const env = `CHAIN=1 ROUTE=b1 TOURW=1${extra ? ' ' + extra : ''}`;
let out;
try {
  out = execFileSync(process.execPath,
    ['probe.mjs', env, 'iterLo:2', 'frameCnt:2', '--wait', String(wait)],
    { cwd: '/Users/jfield/c64fps', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) { console.error((e.stdout ?? '') + (e.stderr ?? '')); process.exit(1); }

const num = n => {
  const m = new RegExp(`^${n}\\s.*\\(16-bit: (\\d+)\\)`, 'm').exec(out);
  if (!m) { console.error(out); throw new Error(`${n} not in the probe output`); }
  return +m[1];
};
const frames = num('iterLo'), ticks = num('frameCnt');
const secs = ticks / 60;
// The route's own length, printed by the build, so the report can say whether this sample
// covered it or ran past it into the stand-still at the end.
const ROUTE_TICKS = 3982;
console.log(`${env}`);
console.log(`  ${frames} frames over ${ticks} ticks (${secs.toFixed(1)}s of game time)`);
console.log(`  ${(frames / secs).toFixed(2)} fps` +
  (ticks < ROUTE_TICKS * 0.9 ? `   [sampled ${(100 * ticks / ROUTE_TICKS).toFixed(0)}% of the route -- raise the wait]`
   : ticks > ROUTE_TICKS * 1.3 ? `   [ran ${(ticks - ROUTE_TICKS)} ticks past the route's end -- lower the wait]`
   : `   [covers the route]`));
