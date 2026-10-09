#!/usr/bin/env node
// fps per level: THE LOCKED-IN BENCHMARK (the user, 2026-10-09), and a functionality check.
//
//   node tools/fpsr.mjs "" suite             every level: a spin and a run each; exits 1 on any problem
//   node tools/fpsr.mjs "ANGEL=0" suite      the same with a build flag on every level
//   node tools/fpsr.mjs "CHAIN=n" level      one level, both segments
//   node tools/fpsr.mjs "CHAIN=n" level walk one level, just the run (or `spin`)
//   DISK=build/x.d64 node tools/fpsr.mjs "CHAIN=n" level walk
//                                            build that segment's disk instead, to WATCH it
//
// For each level, from one pose (the level's start, or POSE below):
//   spin -- turning through every cast angle, no travel;
//   walk -- a SHUTTLE: run as far as the pose can without meeting a wall (CLEAR), straight back
//           the same, and again. Forward, except level 6 (forward falls into an exit, so it runs
//           BACKWARDS). No pose can run far -- level 1 clears 3 diagonal squares, ~1.4 s -- so
//           reversing is what makes a ~5 s sample.
//
// HOW IT WORKS, and why each piece is there:
//
//   The AUTO-MOVER, not a scripted route. WALK/WALKB/SPIN hold one control, which is exactly "I
//   held the key down", and the build reverses it for the return legs. (The scripted tours --
//   TOURW, ROUTE, RECORD -- and their route compiler were deleted 2026-10-09; they had walked into
//   walls ever since the levels changed.)
//
//   A window the BUILD times (MOVEAT/MOVEFOR/MOVELEGS, see build-iray.mjs). The mover holds still
//   until tick T0, so boot is excluded, then runs exactly the window and records frameCnt, the
//   iteration count and px/py at both ends itself, in maS; this reads them with --until. Timing
//   from the host does not work: probe's --at reads land ~12 ticks late, a large slice of a run
//   leg, and a spin started at boot covers different headings on every run (identical builds read
//   24.16 and 25.00 on level 3). Runs repeat exactly; spins to within a frame.
//
//   A BUMP CHECK. The moment the player bumps a wall they stop, the render cache takes over and the
//   frames go cheap -- a flattering number for the wrong reason. A bump shows twice: the first leg
//   stops short of where it should reach, and since only the outward legs are shortened, the
//   shuttle no longer ends where it began.
//
// WHAT THE NUMBER CANNOT TELL YOU: fps is an integer frame count over ~5 s, so its resolution is
// ONE FRAME, printed as the +-1 frame column (~1-2%). A change smaller than that is inside it; for
// a fine A/B use vprof (SPINF/WALKF/BENCHF, cycle-exact).
import { execFileSync } from 'child_process';

const MV_RUN = 12, TICKS = 300, T0 = 60;   // the player always runs: 12 units of 1/256 cell a tick

const extra = process.argv[2] ?? '';
const only = process.argv[3];
// ---- `suite`: every level, one after another ----
// Any build flag in the first argument applies to every level (CHAIN is the suite's to set). A level
// that fails to build or boot, cannot be read, or whose run BUMPS makes the whole suite exit 1.
if (only === 'suite') {
  let bad = 0;
  console.log(`level  segment   fps     frames  ticks   +-1 frame   travelled`);
  for (let n = 1; n <= 7; n++) {
    let o;
    try {
      o = execFileSync(process.execPath, [new URL(import.meta.url).pathname, `CHAIN=${n}${extra ? ' ' + extra : ''}`, 'level'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
    } catch (e) { o = e.stdout ?? ''; bad++; }
    for (const l of o.split('\n').slice(1).filter(Boolean)) {
      if (/BUMPED|FAILED|could not/.test(l)) bad++;
      console.log(`  ${n}    ${l}`);
    }
  }
  console.log(bad ? `*** ${bad} PROBLEM(S) -- see above ***` : 'all levels ran clean');
  process.exit(bad ? 1 : 0);
}
if (only !== 'level') { console.error('usage: fpsr.mjs "FLAGS" suite | fpsr.mjs "CHAIN=n FLAGS" level [spin|walk]'); process.exit(2); }

const LVL = +((/CHAIN=(\d)/.exec(extra) ?? [0, 1])[1]);
// HOW FAR EACH POSE CAN RUN before it meets a wall (the user, paced out in play, 2026-10-09).
// Diagonal runs are counted in diagonal squares, sqrt(2) cells each.
const CLEAR = { 1: 3 * Math.SQRT2, 2: 7, 3: 4 * Math.SQRT2, 4: 5, 5: 4, 6: 4, 7: 7 };
// A quarter cell short of the wall: the player's collision radius stops it before the cell edge.
// LEG=n overrides it, which with LEGS=1 is how a new pose's clear run is measured (a long leg, then
// read how far it got).
const RUN_TICKS = +(process.env.LEG ?? Math.round(((CLEAR[LVL] ?? 2) - 0.25) * 256 / MV_RUN));
// An even number of legs filling about TICKS, so the sample is ~5 s however short the clear run is.
const LEGS = +(process.env.LEGS ?? Math.max(2, 2 * Math.round(TICKS / (2 * RUN_TICKS))));
// Poses of the rig's own, where the level's start is a poor benchmark (the user's, from play):
//   2 -- the level's start clears only ~2.3 cells; this one measured clear for 8.76.
//   7 -- the level's start strafes along a wall right in the view's face, an easy render. From
//        here a strafe bumps within 0.6 cells either way, but forward (west) clears ~8.4.
const POSE = { 2: 'PX=01ad PY=09e5 PA=e0 PAF=80', 7: 'PX=0b93 PY=0ab3 PA=7e PAF=c0' };
const pose = POSE[LVL] ? POSE[LVL] + ' ' : '';
const SEGS = [
  // A leg is a byte of ticks, so the spin's 300 are two legs; spinStep has no reverse, so both turn
  // the same way. It stands where the run starts.
  { name: 'spin', env: 'SPIN=1', moves: false, ticks: TICKS / 2, legs: 2 },
  { name: LVL === 6 ? 'walkb' : 'walk', env: LVL === 6 ? 'WALKB=1' : 'WALK=1', moves: true, ticks: RUN_TICKS, legs: LEGS },
];
const pick = process.argv[4];
const want = SEGS.filter(s => !pick || (pick === 'walk' ? s.moves : s.name === pick));
if (!want.length) { console.error(`no such segment: ${pick}. known: spin, walk`); process.exit(2); }

console.log(`segment   fps     frames  ticks   +-1 frame   travelled`);
for (const s of want) {
  const env = `${pose}${s.env} MOVEAT=${T0} MOVEFOR=${s.ticks} MOVELEGS=${s.legs}${extra ? ' ' + extra : ''}`;
  // DISK=path: build exactly this segment's disk and stop, to WATCH the run at real speed (the user
  // checks by eye that no leg rubs a wall). The mover holds still for T0 ticks after boot, then runs.
  if (process.env.DISK) {
    const kv = Object.fromEntries(`${env} D64=${process.env.DISK}`
      .split(/\s+/).filter(Boolean).map(a => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
    execFileSync(process.execPath, ['src/build-iray.mjs'],
      { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, ...kv }, stdio: 'ignore' });
    console.log(`${s.name.padEnd(9)} -> ${process.env.DISK}`);
    continue;
  }
  let out;
  try {
    out = execFileSync(process.execPath, ['probe.mjs', env, 'maS:20', 'maGo', '--until', 'maGo>=2'],
      { cwd: new URL('.', import.meta.url).pathname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { console.log(`${s.name.padEnd(9)} BUILD OR RUN FAILED`); continue; }
  // The build's own record of the window: frameCnt, iterations, px, py (16-bit each) at its first
  // frame, then at its last, then px/py at the far end of the first leg.
  const b = (/^maS\s+\$\w+\s+((?:\d+ ){19}\d+)/m.exec(out)?.[1] ?? '').split(' ').map(Number);
  if (b.length !== 20) { console.log(`${s.name.padEnd(9)} could not read maS`); continue; }
  const v = i => b[i] + 256 * b[i + 1];
  // The ticks are lastMv, one byte, and the window is longer than 256 ticks; but the build ends it
  // on the first frame at or past its last leg, so the total is legs * leg plus less than one frame.
  const ticks = s.legs * s.ticks + ((b[8] - b[0] - s.legs * s.ticks) & 0xff);
  const frames = v(10) - v(2), fps = frames / (ticks / 60);
  let travel = '';
  if (s.moves) {
    const out1 = Math.hypot(v(16) - v(4), v(18) - v(6)) / 256, want1 = s.ticks * MV_RUN / 256;
    const home = Math.hypot(v(12) - v(4), v(14) - v(6)) / 256;
    travel = `${s.legs} legs of ${out1.toFixed(2)}/${want1.toFixed(2)} cells, ends ${home.toFixed(2)} from the start` +
      (out1 < 0.95 * want1 || (s.legs % 2 === 0 && home > 0.35) ? '  *** BUMPED ***' : '');
  }
  console.log(`${s.name.padEnd(9)} ${fps.toFixed(2).padStart(6)}  ${String(frames).padStart(6)}  ` +
              `${String(ticks).padStart(5)}   ${(100 / frames).toFixed(1).padStart(5)}%     ${travel}`);
}
