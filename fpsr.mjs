#!/usr/bin/env node
// fps over a fixed SEGMENT: one pose, one control held down, one number.
//
//   node fpsr.mjs                      every segment, as the game ships
//   node fpsr.mjs "ANGEL=0"            the same segments with a build flag
//   node fpsr.mjs "" walk              one segment by name
//
// WHY NOT bench.sh / seamprof / fps.sh: ROUTE=bench walks into walls on the current level 1,
// seamprof needs the full profiler, and fps.sh cannot run because SPIN=1 does not build. All
// three predate the 23x11 map and the compaction relayout.
//
// HOW IT WORKS, and why each piece is there:
//
//   The AUTO-MOVER, not a route. WALK/STRAFE/SPIN hold one control for the whole run, which is
//   exactly "I held the key down for n seconds" and needs no route compiler.
//
//   An EXACT WINDOW. --at 60,360 reads at tick 60 and tick 360, so the figure covers precisely
//   300 ticks (5 seconds) of game time with the boot excluded. frameCnt is the 60Hz raster IRQ,
//   so its delta is real time whatever the frame rate. iterLo/iterHi is the main loop's own
//   counter, one per RENDERED frame. fps = frames / (ticks/60).
//   This costs warp: probe turns it off for --at, because under warp the client cannot attach
//   until thousands of ticks have gone by. A run takes ~30s of wall clock. The alternative,
//   --until, keeps warp but gives one sample, which folds the boot frames into the average.
//
//   A DISTANCE CHECK. The moment the player bumps a wall they stop, the render cache takes over
//   and the frames go cheap -- so a segment that hits something reports a flattering number for
//   the wrong reason. Each segment therefore declares how far it SHOULD travel, and the report
//   says so when it falls short. MV_WALK is 4 units of 1/256 cell per tick, so 300 ticks is
//   4.69 cells; the poses below were chosen to clear that.
import { execFileSync } from 'child_process';

const MV_WALK = 4, TICKS = 300, T0 = 60, T1 = T0 + TICKS;
// Poses are the user's, taken from play (the on-screen readout is X.... Y.... A....).
const SEGMENTS = [
  { name: 'walk',   env: 'WALK=1 PX=011a PY=0127 PA=21 PAF=c0', moves: true,
    note: 'north-east across the west room, its far wall in view the whole way' },
  { name: 'strafe', env: 'STRAFE=1 PX=0466 PY=08df PA=80 PAF=80', moves: true,
    note: 'sidestepping north up the room -- the walls slide across the view' },
  // SPIN=1 does not build (it fails on its own, not from anything here). Restore this when it
  // does: a spin is the only motion that exercises every one of the 256 cast angles.
  // { name: 'spin', env: 'SPIN=1 PX=044d PY=0579', moves: false, note: 'standing turn' },
];

const extra = process.argv[2] ?? '';
const only = process.argv[3];
const want = SEGMENTS.filter(s => !only || s.name === only);
if (!want.length) { console.error(`no such segment. known: ${SEGMENTS.map(s => s.name).join(', ')}`); process.exit(2); }

const num = (out, n) => {
  const m = new RegExp(`^${n}\\s.*\\(16-bit: (-?\\d+)\\).*\\(delta (-?\\d+)\\)`, 'm').exec(out);
  return m ? { at0: +m[1], delta: +m[2] } : null;
};
console.log(`segment   fps     frames  ticks   travelled`);
for (const s of want) {
  const env = `CHAIN=1 ${s.env}${extra ? ' ' + extra : ''}`;
  let out;
  try {
    out = execFileSync(process.execPath,
      ['probe.mjs', env, 'iterLo:2', 'px:2', 'py:2', '--at', `${T0},${T1}`],
      { cwd: '/Users/jfield/c64fps', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { console.log(`${s.name.padEnd(9)} BUILD OR RUN FAILED`); continue; }
  const it = num(out, 'iterLo'), fc = num(out, 'frameCnt');
  if (!it || !fc) { console.log(`${s.name.padEnd(9)} could not read the counters`); continue; }
  const fps = it.delta / (fc.delta / 60);
  let travel = '';
  if (s.moves) {
    const dx = (num(out, 'px')?.delta ?? 0) / 256, dy = (num(out, 'py')?.delta ?? 0) / 256;
    const got = Math.hypot(dx, dy), want = fc.delta * MV_WALK / 256;
    const pct = 100 * got / want;
    travel = `${got.toFixed(2)}/${want.toFixed(2)} cells` +
      (pct < 97 ? `  *** BUMPED at ${pct.toFixed(0)}% -- shorten the window or move the pose ***` : '');
  }
  console.log(`${s.name.padEnd(9)} ${fps.toFixed(2).padStart(6)}  ${String(it.delta).padStart(6)}  ` +
              `${String(fc.delta).padStart(5)}   ${travel}`);
}
