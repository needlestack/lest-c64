#!/usr/bin/env node
// fps per level: THE LOCKED-IN BENCHMARK (the user, 2026-10-09), and a functionality check.
//
//   node tools/fpsr.mjs "" suite               every level: a spin and a run each; exits 1 on any problem
//   node tools/fpsr.mjs "ANGEL=0" suite        the same with a build flag on every level
//   node tools/fpsr.mjs "" level n             one level, both segments
//   node tools/fpsr.mjs "" level n walk        one level, just the run (or `spin`)
//   DISK=build/x.d64 node tools/fpsr.mjs "" level n walk
//                                              write that segment's disk instead, to WATCH it
//   RIG=build/rig.json node tools/fpsr.mjs "" suite      reuse a rig already built (no build at all)
//
// ONE BUILD (2026-11-14). Every segment used to be a build of its own -- the level, the pose, the
// mover and its window were all build flags -- so the suite was 18 builds of the ten-level game,
// about an hour. Now it builds the TEST RIG once (TESTRIG=1, see build-iray.mjs): the game with the
// drivers compiled in, reading their settings from a parameter block in IMG. Each segment is a COPY
// of that disk with its parameters patched in (tools/rig.mjs, byte offsets the build wrote to
// build/rig.json) and run by probe.mjs with the build's own labels (PROBESYMS), no build.
// The rig boots exactly as the game does, into level 1, and reaches any other level by a REAL fall
// (it stands on exit 0 with exit 0 pointed at the level, as the 'L'+digit select does), so the
// window is timed from the landing, not from boot.
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
//   The AUTO-MOVER, not a scripted route. Spin / walk / walk back hold one control, which is
//   exactly "I held the key down", and the rig reverses it for the return legs. (The scripted tours
//   -- TOURW, ROUTE, RECORD -- and their route compiler were deleted 2026-10-09; they had walked
//   into walls ever since the levels changed.)
//
//   A window the BUILD times (MOVEAT/MOVEFOR/MOVELEGS, see build-iray.mjs). The mover holds still
//   until tick T0 after the level starts, so boot and the fall are excluded, then runs exactly the
//   window and records frameCnt, the iteration count and px/py at both ends itself, in maS; this
//   reads them with --until. Timing from the host does not work: probe's --at reads land ~12 ticks
//   late, a large slice of a run leg, and a spin started at boot covers different headings on every
//   run (identical builds read 24.16 and 25.00 on level 3). Runs repeat exactly; spins to within a
//   frame.
//
//   A BUMP CHECK. The moment the player bumps a wall they stop, the render cache takes over and the
//   frames go cheap -- a flattering number for the wrong reason. The build COUNTS every blocked
//   move inside the window (maS+20), and any count at all is a bump. Two indirect signs are kept
//   as cross-checks: the first leg stopping short of where it should reach, and the shuttle not
//   ending where it should.
//
// WHAT THE NUMBER CANNOT TELL YOU: fps is an integer frame count over ~5 s, so its resolution is
// ONE FRAME, printed as the +-1 frame column (~1-2%). A change smaller than that is inside it; for
// a fine A/B use vprof (SPINF/WALKF/BENCHF, cycle-exact).
import { execFileSync } from 'child_process';
import { readFileSync, mkdirSync, unlinkSync } from 'fs';
import { patchRig } from './rig.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const abs = p => p.startsWith('/') ? p : ROOT + p;   // paths are the project root's, as probe runs
const MV_RUN = 12, TICKS = 300, T0 = 60;   // the player always runs: 12 units of 1/256 cell a tick

const argFlags = process.argv[2] ?? '';
const only = process.argv[3];
// The level is `level n`: the rig's parameter, never a build flag. (BOOTLVL=n among the flags, which
// old command lines used, went with BOOTLVL itself, 2026-11-15: the build refuses it.)
const extra = argFlags.trim();
const lvArg = only === 'level' && /^\d+$/.test(process.argv[4] ?? '') ? +process.argv[4] : null;
const pick = lvArg !== null ? process.argv[5] : process.argv[4];
if (only !== 'suite' && only !== 'level') {
  console.error('usage: fpsr.mjs "FLAGS" suite | fpsr.mjs "FLAGS" level n [spin|walk]'); process.exit(2);
}

// ---- the rig: built once, with the suite's flags ----
// RIG=<json> reuses one; otherwise build/rig.d64 (never lest-c64.d64: someone may be playing it).
const RIGD64 = 'build/rig.d64', RIGJSON = 'build/rig.json';
const buildRig = () => {
  if (process.env.RIG) return process.env.RIG;
  const kv = Object.fromEntries(extra.split(/\s+/).filter(Boolean)
    .map(a => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
  const t = Date.now();
  try {
    execFileSync(process.execPath, ['src/build-iray.mjs'], { cwd: ROOT,
      env: { ...process.env, ...kv, TESTRIG: '1', D64: RIGD64 }, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const why = (String(e.stdout ?? '') + String(e.stderr ?? '')).match(/ASM ERROR.*|Error: .*/)?.[0] ?? 'see the build';
    console.log(`RIG BUILD FAILED: ${why}`); process.exit(1);
  }
  console.error(`  (rig built in ${((Date.now() - t) / 1000).toFixed(0)} s: ${RIGD64})`);
  return RIGJSON;
};

// HOW FAR EACH POSE CAN RUN before it meets a wall (the user, paced out in play, 2026-10-09).
// Diagonal runs are counted in diagonal squares, sqrt(2) cells each.
// Level 2 was 7, and the blocked-move count showed its last frame touching the wall (2026-10-11).
// Level 8: east down the middle hall from (1.5,5.5) to the pillar at (7,5) -- 5.5 cells (measured, not paced).
// Level 9: east from (1.5,5.0) on the row 4/5 line toward the wall at x = 6 (2026-10-15); 4.5 to the
// face graze-bumped (a leg overshoots by a frame), so a quarter cell less.
// Levels 5 and 6 (2026-11-14): the v2 maps put a wall into their runs -- one long leg (LEGS=1 LEG=120 on
// the rig) stopped at 3.19 and 3.38 cells -- so each is a quarter cell short of that, as level 9's is.
const CLEAR = { 1: 3 * Math.SQRT2, 2: 6.75, 3: 4 * Math.SQRT2, 4: 5, 5: 2.95, 6: 3.15, 7: 7, 8: 5.25, 9: 4.25 };
// INSET (the user, 2026-10-11): ticks every leg after the first runs SHORT, so the return legs turn
// back before the start instead of on it. A leg reverses on the first rendered frame past its tick
// count, so it can overshoot by a frame, ~0.23 cells at 11 fps. Level 5's start has a quarter cell
// behind it and bumped on exactly that; 21 ticks is one cell, so it runs 4 out, 3 back, 3 out...
// Level 9 likewise (2026-10-15): its start is 0.4 cells off the west wall, and a return leg that
// overshot by a 6-tick frame clipped it at x = 1.36 -- caught by a store watch on maS+20.
// And level 2 (2026-10-15): the rig's pose is 0.11 cells off the south wall, so ANY return overshoot
// touched it -- the one blocked move that had failed every suite since level 8 shipped.
const INSETS = { 2: 21, 5: 21, 9: 21 };
// Poses of the rig's own, where the level's start is a poor benchmark (the user's, from play):
//   2 -- the level's start clears only ~2.3 cells; this one measured clear for 8.76.
//   7 -- the level's start strafes along a wall right in the view's face, an easy render. From
//        here a strafe bumps within 0.6 cells either way, but forward (west) clears ~8.4.
//        PY was 0ab3 (10.70): heading 0x7e runs 0.05 cells south per cell, so from 0.2 cells off
//        the south wall the run slid along it from ~4 cells on -- 14 blocked moves, invisible to
//        the end-point check. 0a80 is the middle of the row (2026-10-11).
// LEVELSTART=1 runs every level from its own start, ignoring these. Why it exists: from the switch
// to BOOTLVL builds (2026-11-14, before the rig) until the rig, these poses moved LEVEL 1's start
// (a build's PX applies to its LVL, which BOOTLVL left at 1), so levels 2 and 7 ran from their own
// starts -- and bumped. LEVELSTART=1 reproduces those suites for comparison.
const POSE = { 2: { px: '01ad', py: '09e5', pa: 'e0', paf: '80' }, 7: { px: '0b93', py: '0a80', pa: '7e', paf: 'c0' } };
// Per-level parameters of the rig's own. Level 9: the walk crosses section 1's sentry loops, and a
// touch would kill the run part-way -- noshock keeps the touch (it still flashes) and drops the death.
const LVLPAR = { 9: { noshock: 1 } };

// The segments of level n, with the rig parameters each runs.
const segsOf = n => {
  // A quarter cell short of the wall: the player's collision radius stops it before the cell edge.
  // LEG=n overrides it, which with LEGS=1 is how a new pose's clear run is measured (a long leg, then
  // read how far it got).
  const RUN_TICKS = +(process.env.LEG ?? Math.round(((CLEAR[n] ?? 2) - 0.25) * 256 / MV_RUN));
  const INSET = +(process.env.INSET ?? INSETS[n] ?? 0);
  // An even number of legs filling about TICKS, so the sample is ~5 s however short the clear run is.
  const LEGS = +(process.env.LEGS ?? Math.max(2, 2 * Math.round((1 + (TICKS - RUN_TICKS) / (RUN_TICKS - INSET)) / 2)));
  const base = { level: n, at: T0, ...(process.env.LEVELSTART === '1' ? {} : POSE[n] ?? {}), ...(LVLPAR[n] ?? {}) };
  return [
    // A leg is a byte of ticks, so the spin's 300 are two legs; the spin has no reverse, so both
    // turn the same way. It stands where the run starts.
    { name: 'spin', moves: false, ticks: TICKS / 2, legs: 2, inset: 0,
      par: { ...base, mode: 'spin', for: TICKS / 2, legs: 2 } },
    { name: n === 6 ? 'walkb' : 'walk', moves: true, ticks: RUN_TICKS, legs: LEGS, inset: INSET,
      par: { ...base, mode: n === 6 ? 'walkb' : 'walk', for: RUN_TICKS, legs: LEGS, inset: INSET } },
  ];
};

// One segment: patch a copy of the rig, run it, read the window. Returns the line to print.
const runSeg = (rig, s) => {
  // DISK=path: write exactly this segment's disk and stop, to WATCH the run at real speed (the user
  // checks by eye that no leg rubs a wall). The mover holds still for T0 ticks after the level
  // starts, then runs.
  if (process.env.DISK) {
    patchRig(abs(rig), abs(process.env.DISK), s.par);
    return `${s.name.padEnd(9)} -> ${process.env.DISK}`;
  }
  // CART=1 (2026-11-15): from the rig's cartridge, so every level comes in through the cart loader
  const tmp = `build/tmp/rig-run-${process.pid}.${process.env.CART === '1' ? 'crt' : 'd64'}`;
  mkdirSync(ROOT + 'build/tmp', { recursive: true });
  patchRig(abs(rig), ROOT + tmp, s.par);
  const syms = JSON.parse(readFileSync(abs(rig), 'utf8')).syms;
  let out;
  try {
    out = execFileSync(process.execPath, ['tools/probe.mjs', '', 'maS:21', 'maGo', '--until', 'maGo>=2'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, D64: tmp, PROBESYMS: syms, NOPROBEREBUILD: '1' } });
  } catch (e) {
    // Say WHY: probe prints the cause (a jam, a held port, a deadline) on stderr.
    const why = String(e.stderr ?? '').trim().split('\n').slice(-3).join(' | ');
    return `${s.name.padEnd(9)} BUILD OR RUN FAILED${why ? ': ' + why : ''}`;
  } finally { try { unlinkSync(ROOT + tmp); } catch {} }
  // The build's own record of the window: frameCnt, iterations, px, py (16-bit each) at its first
  // frame, then at its last, then px/py at the far end of the first leg.
  const b = (/^maS\s+\$\w+\s+((?:\d+ ){20}\d+)/m.exec(out)?.[1] ?? '').split(' ').map(Number);
  if (b.length !== 21) return `${s.name.padEnd(9)} could not read maS`;
  const v = i => b[i] + 256 * b[i + 1];
  // The ticks are lastMv, one byte, and the window is longer than 256 ticks; but the build ends it
  // on the first frame at or past its last leg, so the total is the legs plus less than one frame.
  const planned = s.legs * s.ticks - (s.legs - 1) * s.inset;
  const ticks = planned + ((b[8] - b[0] - planned) & 0xff);
  const frames = v(10) - v(2), fps = frames / (ticks / 60);
  let travel = '';
  if (s.moves) {
    const out1 = Math.hypot(v(16) - v(4), v(18) - v(6)) / 256, want1 = s.ticks * MV_RUN / 256;
    const home = Math.hypot(v(12) - v(4), v(14) - v(6)) / 256;
    // An even shuttle ends where it began, or INSET ticks of running out from it.
    const wantHome = s.legs % 2 === 0 ? s.inset * MV_RUN / 256 : null;
    const bumps = b[20];
    // Each reversal lands on a rendered frame, so either end of the shuttle can be off by one frame's
    // running: allow two frames before calling the end point wrong.
    const slack = 2 * MV_RUN * ticks / (v(10) - v(2)) / 256;
    travel = `${s.legs} legs of ${out1.toFixed(2)}/${want1.toFixed(2)} cells${s.inset ? ` (then ${s.inset} ticks short)` : ''}, ` +
      `ends ${home.toFixed(2)} from the start${wantHome ? ` (wants ${wantHome.toFixed(2)})` : ''}, ${bumps} blocked` +
      (bumps || out1 < 0.95 * want1 || (wantHome !== null && Math.abs(home - wantHome) > slack) ? '  *** BUMPED ***' : '');
  }
  return `${s.name.padEnd(9)} ${fps.toFixed(2).padStart(6)}  ${String(frames).padStart(6)}  ` +
         `${String(ticks).padStart(5)}   ${(100 / frames).toFixed(1).padStart(5)}%     ${travel}`;
};

// ---- `suite`: every level, one after another, on ONE rig ----
// Any build flag in the first argument goes into the rig, so it applies to every level. A level
// that fails to boot, cannot be read, or whose run BUMPS makes the whole suite exit 1.
if (only === 'suite') {
  const t0 = Date.now();
  const rig = buildRig();
  let bad = 0, runs = 0;
  console.log(`level  segment   fps     frames  ticks   +-1 frame   travelled`);
  for (let n = 1; n <= 9; n++) for (const s of segsOf(n)) {
    const l = runSeg(rig, s); runs++;
    if (/BUMPED|FAILED|could not/.test(l)) bad++;
    console.log(`  ${n}    ${l}`);
  }
  console.log(bad ? `*** ${bad} PROBLEM(S) -- see above ***` : 'all levels ran clean');
  console.error(`  (${runs} runs on one rig, ${((Date.now() - t0) / 1000).toFixed(0)} s in all)`);
  process.exit(bad ? 1 : 0);
}

// ---- `level n [spin|walk]` ----
const LVL = lvArg ?? 1;
const want = segsOf(LVL).filter(s => !pick || (pick === 'walk' ? s.moves : s.name === pick));
if (!want.length) { console.error(`no such segment: ${pick}. known: spin, walk`); process.exit(2); }
const rig = buildRig();
console.log(`segment   fps     frames  ticks   +-1 frame   travelled`);
for (const s of want) console.log(runSeg(rig, s));
