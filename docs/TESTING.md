# Testing LEST

These are THE tests. A change is checked with the tool below that answers its question, run the
way it says, and the result is reported as that tool printed it. Nothing else counts as a test:
not a workload made up for the occasion, not fps timed from the host, not a single-level build, not
"it looked fine". Each of those has produced a wrong answer at least once. The tools exist because
the obvious way to check something was misleading.

Four questions, four tools:

| question | tool | when |
|---|---|---|
| Does every level still play, and how fast? | `node tools/fpsr.mjs "" suite` | every change that reaches the engine |
| Does it still DRAW the same as before? | `tools/regress.sh [REV]` | changes that move bytes but must not change the game: layout, space savings, rewrites |
| Are the shipped bytes unchanged? | `tools/ship.sh save`, then `tools/ship.sh` | cleanups that must emit the identical program |
| Did this routine get faster or slower, by how many cycles? | `tools/vprof.mjs` with `SPINF=1 BENCHF=n --until benchEnd NOHUD=1` | optimisation A/B, below fpsr's 1-frame resolution |

## 1. Functionality and fps: `fpsr.mjs suite`

```
node tools/fpsr.mjs "" suite          # the game as shipped
node tools/fpsr.mjs "FLAG=x" suite    # the same with a build flag on every level
```

For each of levels 1-7, from one fixed pose (the level's start, or the rig's own pose for levels 2
and 7):

- **spin**: turn through every cast angle, standing still.
- **walk**: a shuttle run. Run as far as the pose clears without meeting a wall, come straight back,
  and repeat for about 5 s. Level 6 runs backwards, because its forward run falls into an exit.

The build times the window itself (`MOVEAT`/`MOVEFOR`/`MOVELEGS`), so boot is excluded and a run
repeats exactly. It exits 1 on a level that fails to build or boot, or a walk that BUMPS. That makes
it the functionality check too: run it after every engine change. It takes 14 emulator runs, a few
minutes.

**No bumps, asserted directly (2026-10-11).** The build counts every blocked move inside the window,
and the `blocked` column must read 0. Any count is BUMPED, even a glancing slide that loses no
distance. The two older signs stay as cross-checks: the first leg stopping short, and the shuttle
not ending where it should, within two frames of running. The counter's first run found two grazes
the end-point check had passed for days: level 7's run slid along the south wall (14 blocked), and
level 2's last frame touched (2 blocked). Both poses were fixed (see `CLEAR` and `POSE` in fpsr.mjs).

**Level 5 runs inset legs.** Its start has a quarter cell behind it, and a tick-timed leg can
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
- **OPEN: an occasional `BUILD OR RUN FAILED`.** Twice in three suites (2026-10-11) one walk failed
  and passed when rerun alone, on a different level each time. The rig now prints probe's reason
  after the message. The next time it happens, read that before rerunning.

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
- **Stills**: a screenshot at a fixed cycle count, compared pixel for pixel:
  - levels 5, 6 and 7 at their starts
  - a fall parked mid-drop (`FALLHOLD=12`)
  - the death picture (`DIETEST=1`: already cornered, then spin to face the angel)

`framecmp` reports IDENTICAL, or IN ORDER. IN ORDER means every frame the reference drew appears,
in the same order, in the new run. That is the pass for a build that got faster: the movers repeat
exactly per rendered frame, but a fall and the death scene run on the raster clock, so a faster
build can show them in a different number of frames. Anything wrong on screen is a frame the
reference never drew, and fails. It takes 16 emulator runs.

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

## Last recorded `fpsr.mjs "" suite`

2026-10-11, after the bump counter and the pose fixes. The `was` column is the 2026-10-10 record
(the space audit).

| level | spin fps | was | walk fps | was | walk |
|---|---:|---:|---:|---:|---|
| 1 | 21.40 | 21.60 | 15.26 | 15.26 | 4 legs, 0 blocked |
| 2 | 31.10 | 31.10 | 12.73 | 12.95 | 2 legs, 0 blocked (clear 7 -> 6.75) |
| 3 | 27.51 | 27.51 | 15.97 | 15.97 | 2 legs, 0 blocked |
| 4 | 17.60 | 17.60 | 15.96 | 15.96 | 2 legs, 0 blocked |
| 5 | 27.80 | 27.80 | 11.16 | 11.25 | 4 legs inset, 0 blocked |
| 6 | 23.80 | 23.80 | 14.91 | 14.95 | 4 legs backwards, 0 blocked |
| 7 | 30.40 | 29.40 | 14.79 | 14.64 | 2 legs, 0 blocked (pose moved to the row's middle) |

The walks on levels 2, 5 and 7 changed course, so their `was` is not a like-for-like comparison.
Level 1's spin moved by one frame (107 vs 108), inside the resolution. Level 7's spin moved because
its pose moved. Level 6's spin, 0.4 fps (2 frames) under its pre-audit 24.20, is not being chased.
