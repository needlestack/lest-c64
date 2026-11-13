# Testing LEST

These are THE tests. A change is checked with the tool below that answers its question, run the
way it says, and the result is reported as that tool printed it. Nothing else counts as a test:
not a workload made up for the occasion, not fps timed from the host, not a single-level build, not
"it looked fine". Each of those has produced a wrong answer at least once. The tools exist because
the obvious way to check something was misleading.

Five questions, five tools:

| question | tool | when |
|---|---|---|
| Does every level still play, and how fast? | `node tools/fpsr.mjs "" suite` | every change that reaches the engine |
| Does it still DRAW the same as before? | `tools/regress.sh [REV]` | changes that move bytes but must not change the game: layout, space savings, rewrites |
| Are the shipped bytes unchanged? | `tools/ship.sh save`, then `tools/ship.sh` | cleanups that must emit the identical program |
| Did this routine get faster or slower, by how many cycles? | `tools/vprof.mjs` with `SPINF=1 BENCHF=n --until benchEnd NOHUD=1` | optimisation A/B, below fpsr's 1-frame resolution |
| Does the ray search (subdivision, pivot prediction) cast fewer rays, per kind of motion? | `node tools/pivlab.mjs "" "FLAG=x"` | any change to where rays are cast |

## 1. Functionality and fps: `fpsr.mjs suite`

```
node tools/fpsr.mjs "" suite          # the game as shipped
node tools/fpsr.mjs "FLAG=x" suite    # the same with a build flag on every level
```

For each of levels 1-9, from one fixed pose (the level's start, or the rig's own pose for levels 2
and 7):

- **spin**: turn through every cast angle, standing still.
- **walk**: a shuttle run. Run as far as the pose clears without meeting a wall, come straight back,
  and repeat for about 5 s. Level 6 runs backwards, because its forward run falls into an exit.

The build times the window itself (`MOVEAT`/`MOVEFOR`/`MOVELEGS`), so boot is excluded and a run
repeats exactly. It exits 1 on a level that fails to build or boot, or a walk that BUMPS. That makes
it the functionality check too: run it after every engine change. It takes 18 emulator runs, a few
minutes.

**No bumps, asserted directly (2026-10-11).** The build counts every blocked move inside the window,
and the `blocked` column must read 0. Any count is BUMPED, even a glancing slide that loses no
distance. The two older signs stay as cross-checks: the first leg stopping short, and the shuttle
not ending where it should, within two frames of running. The counter's first run found two grazes
the end-point check had passed for days: level 7's run slid along the south wall (14 blocked), and
level 2's last frame touched (2 blocked). Both poses were fixed (see `CLEAR` and `POSE` in fpsr.mjs).

**Levels 2, 5 and 9 run inset legs.** Level 9's start is 0.4 cells off the west wall and level 2's
rig pose 0.11 off the south wall, so a return leg that overshot the start clipped them (found
2026-10-15 with a store watch on `maS+20`, the bump counter: `probe.mjs ... --until "maGo>=1" --watch
<maS+20>,<maS+20>` stops on the blocked move and reads the pose).
**Level 5:** Its start has a quarter cell behind it, and a tick-timed leg can
overshoot by a frame, about 0.23 cells at 11 fps. So every leg after the first runs 21 ticks (one
cell) short: 3.75 out, then 2.77 back and forth, ending a cell out from the start (`INSET`, and
`MOVEINSET` in the build).

Reading it:

- fps is a whole number of frames over ~5 s, so its resolution is the `+-1 frame` column, about
  1-2%. Smaller than that is noise. Use vprof for it.
- Compare against the previous suite run on the commit you started from, not against memory. The
  last recorded results are at the end of this file. Update them when a change moves them on
  purpose.
- To watch a walk at real speed: `DISK=build/x.d64 node tools/fpsr.mjs "CHAIN=n" level walk`.
- **An occasional `BUILD OR RUN FAILED`.** Twice in three suites (2026-10-11) one walk failed and
  passed when rerun alone; the rig now prints probe's reason after the message. On 2026-10-15 EVERY
  level failed this way: VICE had been upgraded and `tools/vice.mjs`/`tools/probe.mjs` named the old
  install's path. So: if every level fails, check the VICE path first; if one does, read the reason.

## 2. Draws the same: `regress.sh`

```
tools/regress.sh            # the working tree against HEAD
tools/regress.sh 8a9f6dc    # ...or against any revision
```

Builds REV in its own git worktree (never `git stash`, which breaks this tree) and runs the same
fixed workloads on both builds:

- **Frames**: `frames.mjs` records the displayed screen after every rendered frame of a mover
  that steps a fixed amount per rendered frame (`WALKF`), and `framecmp.mjs` compares the runs.
  Three workloads:
  - a level-1 walk
  - levels 1→2 with two forced falls (`FALLNOW=128`): the drop, the level load, and level 2
  - the hub, level 4
  - falls out of level 4 (4→5→4) and out of level 8 (8→9): their wall mark and orb shadow are
    level code that restores the shared charset and orb ladder on the way out (`lxBye`), and no
    other workload leaves either level
- **Stills**: a screenshot at a fixed cycle count, compared pixel for pixel:
  - levels 5, 6, 7, 8 and 9 at their starts (level 9 with `SVFREEZE=1`: its sentries glide and
    spark on the 60Hz clock, so a still is only comparable with them held)
  - a fall parked mid-drop (`FALLHOLD=12`)
  - the death picture (`DIETEST=1`: already cornered, then spin to face the angel)

`framecmp` reports IDENTICAL, or IN ORDER. IN ORDER means every frame the reference drew appears,
in the same order, in the new run. That is the pass for a build that got faster: the movers repeat
exactly per rendered frame, but a fall and the death scene run on the raster clock, so a faster
build can show them in a different number of frames. Anything wrong on screen is a frame the
reference never drew, and fails. It takes 24 emulator runs.

Why each workload is there:

- **The level-1 walk is not enough on its own.** On 2026-10-10 it passed a zero-page change that
  broke the fall: `omEn`'s masked loop at a drop reaches four bytes no instruction names.
- **Falls and the death scene run on the raster clock.** Compare them as IN ORDER, or as stills of
  a scene that holds (a parked fall, the picture). Never a timed screenshot of a moving scene: it
  lands on a different frame every run.
- **Forced falls never start on frame 0.** `FALLNOW=n` falls on frames n-1, 2n-1, ... Until
  2026-10-10 it fell on frame 0, when nothing had been rendered: the drop snapshotted whatever the
  boot loader had left on screen, which varies with load timing, so the falls workload drew a
  different stray column on every run. It also used the per-frame tables (`cstepT`, `seamT`)
  before `rayAll` had ever cleared them. Real play can't fall before its first frame, so only the
  test was affected. `FALLNOW=1` (every frame) still includes frame 0, which is why the parked
  fall uses `FALLNOW=2`.

## 3. Byte-identical: `ship.sh`

```
tools/ship.sh save     # before the change
tools/ship.sh          # after: IDENTICAL or DIFFERS per shipping disk
```

For deletions of code no shipping build emits, and flag folds. They must leave every disk
IDENTICAL, and when they do, that is the whole proof. No emulator run is needed.

## 4. Cycles: `vprof.mjs`

Only with `SPINF=1 BENCHF=n --until benchEnd` and `NOHUD=1`. That run is cycle-exact and
deterministic. A timed spin drifts 33-71 cycles a frame between identical builds, so it can't
compare anything.

## 5. The ray search: `pivlab.mjs`

```
node tools/pivlab.mjs "" "PIVCOLD=1"                     # current vs no prediction, level 9's open room
PLBASE="LAB=1 NOSV=1 SEAMS=0 STAGE=1 NOSHOCK=1 SOUND=0 PX=0x880 PY=0x180 PA=0x40" \
  node tools/pivlab.mjs ""                                 # the same in room 2's corridor
```

Each argument is a build variant. Every variant runs the same script of motions (still, turn, walk,
back, strafe, and combinations: `PLS`) at a fixed step per RENDERED frame (`PLDT`), so frame k is
the same view in every build. One emulator run per variant. Per segment it prints rays, the floor
(2 per boundary, what perfect prediction would cast), how many hints landed and how far the misses
were, and the cycles in the whole cast and in the prediction arithmetic, timed by the build itself
on CIA2's timers.

- **Judge on rays and cast cycles, not fps.** A hint can only change where rays are cast, never a
  pixel, so a broken prediction shows up only as extra rays.
- **Read the `ends at` column.** Shuttles must end where they began; a different end means a move
  bumped a wall and the segments are no longer the same frames.
- **Two views, because they disagree.** The open room has ~5 boundaries; the corridor has 14, where
  plain bisection is already cheap and prediction barely pays on strafes. A change that helps one
  can hurt the other.
- `PIVLAB` keeps its records in the death picture's RAM, so it needs `NOSHOCK=1` (the default base
  has it).

## Rules

- **Cap every emulator run.** The tools carry their own caps. A run you start by hand gets
  `perl -e 'alarm 60; exec @ARGV' ...`. Never `pkill` VICE: the user may have one open.
- **Build the reference, don't remember it.** A baseline is a run of the same tool on the
  reference revision, made now: a worktree for regress.sh, a save for ship.sh, a suite run for
  fpsr.
- **A single-level chain is a weaker test, not a faster one.** The engine is the same whatever
  the chain is, but level loading, falls and exits only happen in a chain.
- **New mechanics get a workload here.** If a change adds something none of the workloads above
  reaches, add one to regress.sh and say why it is there.

- **PAL: the same tools with `PAL=1`.** The VICE tools launch a PAL machine and the builds they
  make are PAL builds (`PAL=1 node tools/fpsr.mjs "" suite`). fps is still counted against the
  game's 60 ticks a second, so it compares directly with NTSC. A `ticks` or `travelled` column
  that differs from NTSC's means the PAL clock is wrong. NTSC stays the reference.

## Last recorded `fpsr.mjs "" suite`

2026-11-12, after the full-game memory work (uncommitted): level 9's sentry tables and level 4's
merge-hazard code and lists moved into their levels' code, pedLiftT into IAR0, rxStamp past entGate.
Run against a reference suite of the tree just before (the `was` column): every figure the same or
better. Levels 5 and 6 walks report BUMPED in BOTH runs -- the walk routes predate the v2 map edits.

| level | spin fps | was | walk fps | was |
|---|---:|---:|---:|---:|
| 1 | 22.92 | 22.92 | 16.22 | 16.22 |
| 2 | 31.30 | 31.30 | 13.72 | 13.72 |
| 3 | 23.05 | 23.05 | 15.78 | 15.78 |
| 4 | 21.60 | 21.60 | 15.67 | 15.67 |
| 5 | 27.40 | 27.40 | 11.86 | 11.86 |
| 6 | 24.40 | 24.40 | 14.53 | 14.49 |
| 7 | 32.09 | 32.09 | 15.99 | 15.99 |
| 8 | 22.45 | 22.45 | 15.28 | 15.21 |
| 9 | 20.20 | 20.20 | 19.57 | 19.57 |
