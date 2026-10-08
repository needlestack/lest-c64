#!/usr/bin/env node
// fps over a fixed SEGMENT: one pose, one control held down, one number.
//
//   node tools/fpsr.mjs                      every segment, as the game ships
//   node tools/fpsr.mjs "ANGEL=0"            the same segments with a build flag
//   node tools/fpsr.mjs "" walk              one segment by name
//
// WHY NOT bench.sh / seamprof: ROUTE=bench walks into walls on the current level 1, and
// seamprof needs a profiler that compaction was dropping. Both predate the 23x11 map and the
// relayout. (fps.sh, runviews.sh and motionview.sh were deleted 2026-10-06: they used the trap loader,
// which stalls under Krill, and their own launch code; this script and `level` mode replace them.)
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
  // A spin is the only motion that exercises every one of the 256 cast angles, and the only one
  // where the player does not move, so there is no wall to bump and no travel to check.
  { name: 'spin',   env: 'SPIN=1 PX=044d PY=0579 PA=00 PAF=80', moves: false,
    note: 'standing in the corridor mouth, turning through every angle' },
];

const extra = process.argv[2] ?? '';
const only = process.argv[3];
// ---- `level`: THE PER-LEVEL BENCHMARK (the user, 2026-10-06) ----
// The segments above carry LEVEL 1's poses, so on any other CHAIN they stand the player at level-1
// coordinates -- in a corner, or a wall. `node tools/fpsr.mjs "CHAIN=n" level` instead starts from the
// level's OWN start pose and runs the two things the user benchmarks a level with:
//   spin -- every cast angle, no travel;
//   walk -- about TWO SQUARES from the start: forward, except level 6 (forward falls into an exit,
//           so it walks BACKWARDS) and level 7 (forward runs into a wall, so it STRAFES).
// The mover runs from boot, and the window opens at T0, so two squares in total is a SHORT window
// (68 ticks): about one second, with the coarser +-1-frame resolution that implies.
const LVL = +((/CHAIN=(\d)/.exec(extra) ?? [0, 1])[1]);
const TWO_SQUARES = Math.round(2 * 256 / MV_WALK) - T0;   // ticks of window that end two cells out
const LEVEL_SEGS = [
  { name: 'spin', env: 'SPIN=1', moves: false, prefix: '' },
  { name: LVL === 6 ? 'walkb' : LVL === 7 ? 'strafe' : 'walk', env: LVL === 6 ? 'WALKB=1' : LVL === 7 ? 'STRAFE=1' : 'WALK=1',
    moves: true, prefix: '', ticks: TWO_SQUARES },
];
const want = only === 'level' ? LEVEL_SEGS : SEGMENTS.filter(s => !only || s.name === only);
if (!want.length) { console.error(`no such segment. known: ${SEGMENTS.map(s => s.name).join(', ')}`); process.exit(2); }

const num = (out, n) => {
  const m = new RegExp(`^${n}\\s.*\\(16-bit: (-?\\d+)\\).*\\(delta (-?\\d+)\\)`, 'm').exec(out);
  return m ? { at0: +m[1], delta: +m[2] } : null;
};
// ---- AND WHAT THE NUMBER CANNOT TELL YOU ----
// fps here is an integer frame count over a fixed window, so its resolution is ONE FRAME: at 11
// fps over 300 ticks that is 57 frames, and +-1 of them is +-1.8%. A 1% change -- which is what a
// decent cull or a few hundred cycles looks like -- is INSIDE that, and reading it as a result is
// how ENTCONE first looked like a 2.4% regression on walk and a 3.2% win on strafe in the same
// pair of runs. The window cannot simply be lengthened: walk and strafe bump a wall at ~5s, which
// is what the distance check guards. For anything smaller than the figure printed here, use
// prof.mjs -- raster lines summed over 256 frames resolves ~0.09% -- and accept that it only
// works on spin.
console.log(`segment   fps     frames  ticks   +-1 frame   travelled`);
for (const s of want) {
  const env = `${s.prefix ?? 'CHAIN=1 '}${s.env}${extra ? ' ' + extra : ''}`;
  const t1 = T0 + (s.ticks ?? TICKS);
  let out;
  try {
    out = execFileSync(process.execPath,
      ['probe.mjs', env, 'iterLo:2', 'px:2', 'py:2', '--at', `${T0},${t1}`],
      { cwd: new URL('.', import.meta.url).pathname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
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
              `${String(fc.delta).padStart(5)}   ${(100 / it.delta).toFixed(1).padStart(5)}%     ${travel}`);
}
