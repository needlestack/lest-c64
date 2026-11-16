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
| Does it still DRAW the same as before? | `tools/regress.sh [REV]` (REV must have the rig: 2026-11-14 on) | changes that move bytes but must not change the game: layout, space savings, rewrites |
| Are the shipped bytes unchanged? | `tools/ship.sh save`, then `tools/ship.sh` | cleanups that must emit the identical program |
| Did this routine get faster or slower, by how many cycles? | `tools/vprof.mjs "level=n mode=spinf bench=N" --until benchEnd` (a rig parameter set) | optimisation A/B, below fpsr's 1-frame resolution |
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
it the functionality check too: run it after every engine change. It takes ONE build and 18 emulator
runs, about 100 s (2026-11-15: 97 s, the build 5 s of it, its sub-builds out of `build/.cache/`; a
source edit makes that build ~25 s. 2026-11-14, before the cache: 173 s, the build 95 s of it).

**The sub-build cache (2026-11-15).** A build's 26 sub-builds (the other levels' tables, the wall
variants) are cached in `build/.cache/`, keyed on the bytes of src/, data/, art/, music/, krill/,
the build's environment, node and `magick -version`, so a cached dump is the one a fresh sub-build
would make; misses run in parallel. `NOSUBCACHE=1` bypasses it (not `NOCACHE`: that is the renderer's
run-cache poison). Clearing the directory is always safe.

**One build: the test rig (2026-11-14).** Every segment used to be a build of its own (the level,
pose, mover and window were all build flags), so the suite was 18 builds of the ten-level game,
about an hour. Now fpsr builds `TESTRIG=1 D64=build/rig.d64` once: the game with the test drivers
compiled in, reading their settings from a parameter block in IMG (`rgBlk`, 18 fields in 23 bytes since
stage 2, in four short data runs: the frames/regress/vprof settings joined fpsr's). The build
writes `build/rig.json` beside the disk (each parameter's byte offsets IN THE .d64 FILE, from IMG's
sector chain, and its default) and `build/rig.syms.json` (its own labels). Each segment is then a
copy of the disk patched by `tools/rig.mjs`, run by `probe.mjs` with `PROBESYMS=build/rig.syms.json`,
which builds nothing. The rig never touches `lest-c64.d64`.

- **Levels are entered by a real fall.** The rig boots like the game, into level 1; for another
  level it does what the `L`+digit select does (exit 0 now leads there, and the player stands on
  it), so `fallChk` runs the real transition. The pose lands with the level (`rgLand`, at the head
  of `lvlStart`), and `MOVEAT` counts from the first frame of play after the landing, not from boot.
- **The idle is the default:** level 1, standing still. `node tools/rig.mjs build/rig.json out.d64
  level=8 mode=walk at=60 for=85 legs=4 inset=21 px=0180 py=0580 pa=00 noshock=1` writes any
  workload's disk by hand (`mode` is idle, spin, walk or walkb -- timed -- or spinf, walkf: a fixed
  step per rendered frame). Stage 2 added `bench`, `fallnow`, `fallhold`, `angfreeze`, `svfreeze`,
  `angat`, `die` and `dietest` (the keys are listed at the head of rig.mjs).
- `RIG=build/rig.json node tools/fpsr.mjs "" suite` reuses a rig already built: 18 runs, about 4 s each.
- Flags in the first argument go into the rig build, so `fpsr.mjs "ANGEL=0" suite` still works. The
  compile-time movers and test switches (`SPIN`, `WALK`, `MOVEAT`, `PX`, `BENCHF`,
  `FALLNOW`, `ANGFREEZE`, `DIETEST`...) are refused with `TESTRIG`: they are the block's.
- **Where the rig's code lives** is a measured answer: readKeys goes (the rig plays no keys) and
  maStep and spinStep take its place in the code stream; rgPre, rgLand and the data are `@FLOAT`
  runs. Other placements shifted the pinned hot loops by up to 211 bytes of padding and no level
  slot fit (see "TESTRIG's drivers, IN readKeys' PLACE" in build-iray.mjs). With it, the stage-1 rig
  had 170 bytes spendable and its slot at $6200. Stage 2 (2026-11-14) adds no byte to the code stream (each
  hook replaces an instruction of its size: `jsr rgFrm`, `jsr rgAng`, `jsr rgFall`, rgIter's tail);
  its code is `@FLOAT` runs of 16 bytes or less, which fill the 16-byte page tails no other run fits
  (`RG_SPLIT`), maStep's record moved to low RAM, and lvKey's dead keys half is not emitted. The slot
  is now where the shipping build's is, at $6500 (the build log's `ILV1 ...@$6500`, 2026-11-15), with
  0 bytes spendable in the image's holes and 46 B of arena edge left over (shipping: 246 and 73).
- **Before the rig, levels 2 and 7 did not run from their poses.** From the switch to `BOOTLVL`
  builds (2026-11-14) a build's `PX` moved its `LVL`'s start, and `BOOTLVL` left `LVL` at 1, so the
  rig poses (fpsr's `POSE`) moved level 1's start, and levels 2 and 7 ran from their own -- and bumped.
  `LEVELSTART=1` runs every level from its own start, to compare with those suites.

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
- One level: `node tools/fpsr.mjs "" level n [spin|walk]`. To watch a walk at real speed:
  `DISK=build/x.d64 node tools/fpsr.mjs "" level n walk` writes that segment's patched disk.
- **An occasional `BUILD OR RUN FAILED`.** Twice in three suites (2026-10-11) one walk failed and
  passed when rerun alone; the rig now prints probe's reason after the message. On 2026-10-15 EVERY
  level failed this way: VICE had been upgraded and `tools/vice.mjs`/`tools/probe.mjs` named the old
  install's path. So: if every level fails, check the VICE path first; if one does, read the reason.

## 2. Draws the same: `regress.sh`

```
tools/regress.sh            # the working tree against HEAD
tools/regress.sh 8a9f6dc    # ...or against any revision THAT HAS THE RIG (2026-11-14 on)
```

Builds REV in its own git worktree (never `git stash`, which breaks this tree) and runs the same
fixed workloads on both sides. **On the test rig (2026-11-14):** each side builds ONE rig
(`TESTRIG=1 D64=build/regress-rig.d64`, REV's in its worktree and this tree's here, the two builds
at once), and every workload is a patched copy of its own side's rig disk (`tools/rig.mjs`), run by
this tree's tools. It used to be a build per workload per side, 24 builds of the ten-level game.
So REV must be a revision with the rig: an older one cannot build `TESTRIG=1`, and regress stops
with `REV ... CANNOT BUILD THE TEST RIG` (exit 2) rather than comparing something else. For a
baseline from before the rig, use regress.sh's own previous version (git history).

**Frames compare CHARACTER CODES, not pixels.** A change to the charset itself -- a regenerated
codebook, glyphs added, removed or renumbered -- shows as DIFFERS on nearly every frame even when the
game draws correctly. Regress is the wrong tool for those: judge them with the before/after cell
pictures (`tools/cellviews.mjs`) and the stills. (Against revisions from before 3801b77 the readout
glyphs shifted every code by 20; every revision with the rig is after that, so it no longer
arises.) Each workload's output folders are cleared before it runs, so a
missing result cannot hide behind an old one.

Each workload is a rig parameter set (see `tools/rig.mjs` for every key). A level other than 1 is
entered by a real fall from level 1, and **frame 0 is the first frame of play on it** (`rgGo`):
`bench` and `fallnow` count from there, so frame k means what it meant in a `BOOTLVL` build.

- **Frames**: `frames.mjs` records the displayed screen after every rendered frame of a mover
  that steps a fixed amount per rendered frame (`mode=walkf`), from frame 0 to `bench`, and
  `framecmp.mjs` compares the runs. Five workloads:
  - a level-1 walk (`level=1 mode=walkf bench=300`)
  - levels 1→2 with two forced falls (`fallnow=128`): the drop, the level load, and level 2
  - the hub, level 4
  - falls out of level 4 (4→5→4) and out of level 8 (8→9): their wall mark and orb shadow are
    level code that restores the shared charset and orb ladder on the way out (`lxBye`), and no
    other workload leaves either level
- **Stills**: a patched rig disk run to a fixed cycle count (`vicerun.mjs -limitcycles -exitscreenshot`),
  compared pixel for pixel:
  - levels 5, 6, 7, 8 and 9 at their starts (`angfreeze=1`; level 9 with `svfreeze=1`: its sentries
    glide and spark on the 60Hz clock, so a still is only comparable with them held)
  - a fall parked mid-drop (`level=1 fallnow=2 fallhold=12`)
  - the death picture (`dietest=1 mode=spinf`: already cornered, then spin to face the angel)

`framecmp` reports IDENTICAL, or IN ORDER. IN ORDER means every frame the reference drew appears,
in the same order, in the new run. That is the pass for a build that got faster: the movers repeat
exactly per rendered frame, but a fall and the death scene run on the raster clock, so a faster
build can show them in a different number of frames. Anything wrong on screen is a frame the
reference never drew, and fails. It takes 2 builds and 24 emulator runs, about 5 minutes (2026-11-14,
the tree against itself: 272 s, the two rig builds at once about half of it).

It never writes `lest-c64.d64`. Until 2026-11-14 its last step was a plain build "to leave the tree
as a plain build leaves it", which overwrote the disk the user plays.

**Rig vs the old per-build way (2026-11-14, on one tree).** Every workload was run both ways: the
five frames workloads, IDENTICAL for levels 1 and 4 (all 300/400 frames); level 8's fall run
differs in frame 0 only (20 cells in two panel-line columns, glyph codes one apart), because a
BOOTLVL build drew frame 0 with no previous frame and the rig after the landing's renders of the
same view: `SEAMHYST` holds a panel line where it was last frame. Frames 1-199 are identical. Six of
the seven stills are the SAME; level 8's differs only in its INKS (the same lines, the tube dark):
the flicker's random sequence steps once per tick from boot, and the rig reaches level 8 later, by a
fall, so at 100M cycles the tube is in another phase. Two rigs reach it at the same time, so
rig-vs-rig compares.

Why each workload is there:

- **The level-1 walk is not enough on its own.** On 2026-10-10 it passed a zero-page change that
  broke the fall: `omEn`'s masked loop at a drop reaches four bytes no instruction names.
- **Falls and the death scene run on the raster clock.** Compare them as IN ORDER, or as stills of
  a scene that holds (a parked fall, the picture). Never a timed screenshot of a moving scene: it
  lands on a different frame every run.
- **Forced falls never start on frame 0.** `fallnow=n` falls on frames n-1, 2n-1, ... Until
  2026-10-10 it fell on frame 0, when nothing had been rendered: the drop snapshotted whatever the
  boot loader had left on screen, which varies with load timing, so the falls workload drew a
  different stray column on every run. It also used the per-frame tables (`cstepT`, `seamT`)
  before `rayAll` had ever cleared them. Real play can't fall before its first frame, so only the
  test was affected. `fallnow=1` (every frame) still includes frame 0, which is why the parked
  fall uses `fallnow=2`. (Off level 1, rig.mjs wants `fallnow` of 4 or more: level 1's frames 0 and
  1 come before the rig's level.) A forced fall always takes exit 0 (`hlv` is 0 whenever one can
  fire), and stops after sixteen.

## 3. Byte-identical: `ship.sh`

```
tools/ship.sh save     # before the change
tools/ship.sh          # after: IDENTICAL or DIFFERS (the one shipping disk; never writes lest-c64.d64)
```

For deletions of code no shipping build emits, and flag folds. They must leave the disk
IDENTICAL, and when they do, that is the whole proof. No emulator run is needed.

## 4. Cycles: `vprof.mjs`

```
node tools/vprof.mjs "level=1 mode=spinf bench=2000 angfreeze=1" --until benchEnd    # builds build/vprof-rig.d64
RIG=build/rig.json node tools/vprof.mjs "level=4 mode=walkf bench=600" --until benchEnd   # a rig already built
```

Only with a fixed workload (`mode=spinf` or `mode=walkf`, `bench=n`) and `--until benchEnd`. That run
is cycle-exact and deterministic. A timed spin drifts 33-71 cycles a frame between identical builds,
so it can't compare anything.

**On the test rig (2026-11-14):** the first argument is a rig parameter set (lowercase keys, see
`tools/rig.mjs`); build flags for the rig go in `--flags "X=1"`. The profile runs from `rgGo`, the
first frame of play on the level, to `benchEnd`: exactly n rendered frames, with boot, the loader
and the fall that reaches the level left out. Two runs of one rig agree to the cycle on every render
routine; the frame loop's own line (its raster wait) moves by a few thousand cycles in 2000 frames
with disk timing, so compare routines, not the grand total. For an A/B, build each side's rig (the
REV worktree's `build/regress-rig.json` from a regress run is one) and pass it as `RIG=`.
Build-flag mode is still there for flags the rig does not carry, on level 1 only (every disk boots
level 1): `node tools/vprof.mjs "SPINF=1 BENCHF=n ANGFREEZE=1 NOHUD=1" --until benchEnd` (window
from boot).

## 5. The ray search: `pivlab.mjs`

```
node tools/pivlab.mjs "" "PIVCOLD=1"                     # current vs no prediction, level 9's open room
PLBASE="LVL=9 NOSV=1 SEAMS=0 STAGE=1 NOSHOCK=1 MUSIC=0 PX=0x880 PY=0x180 PA=0x40" \
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
- **The level is reached by a fall (2026-11-15).** The build is the whole game, booting level 1;
  `LVL=9` makes the bench drop to level 9 through the level select's tail (`lkGo`, as the rig does)
  before its script starts, with `PX`/`PY`/`PA` and `STAGE` applying to level 9. It used to be `LAB=1`
  (level 9 alone on a disk). The full game with the bench's code came out ~290 B short of a level
  slot, so the base has `MUSIC=0`, which removes levels 2-7's songs (level 9 has none) and the
  player, where it had `SOUND=0`, a flag that no longer existed; an auto-mover build also drops
  lvKey's dead keys half now, as the rig does. Rays, hints, misses and end points came out identical to the `LAB=1` run in
  every segment; cast cycles moved by up to 0.3k and one segment's fps by 0.5 (layout, and no
  music IRQ). It writes `build/pivlab.d64`, never `lest-c64.d64`.

## Rules

- **Cap every emulator run.** The tools carry their own caps. A run you start by hand gets
  `perl -e 'alarm 60; exec @ARGV' ...`. Never `pkill` VICE: the user may have one open.
- **Build the reference, don't remember it.** A baseline is a run of the same tool on the
  reference revision, made now: a worktree for regress.sh, a save for ship.sh, a suite run for
  fpsr.
- **There is one kind of disk: the whole game (2026-11-15).** `CHAIN`, `BOOTLVL` and `LAB` are gone
  (the build refuses them); a level other than 1 is reached by a real fall, on the rig.
- **New mechanics get a workload here.** If a change adds something none of the workloads above
  reaches, add one to regress.sh and say why it is there.

- **PAL: the same tools with `PAL=1`.** The VICE tools launch a PAL machine; the disk is the same
  one (since 2026-11-15 the game detects PAL at boot from the KERNAL's `$02a6` and ticks twice every
  fifth raster frame). `PAL=1 node tools/fpsr.mjs "" suite`. fps is counted against the game's 60
  ticks a second, so it compares directly with NTSC: a `ticks` or `travelled` column that differs
  from NTSC's means the PAL clock is wrong. First one-disk PAL suite (2026-11-15): level 1 spin
  19.34 fps, level 9 spin 18.22, all clean, ~300 ticks a segment like NTSC. NTSC stays the reference.

## Last recorded `fpsr.mjs "" suite`

2026-11-14, the first suite on the TEST RIG (one build, each run a patched copy, levels entered by a
real fall): all levels clean, 174 s in all. On the tree with the dead-code sweep's phase 2 (renderSym's
column range constant, HUD-only zero page freed). Levels 5 and 6 re-paced for the v2 maps (CLEAR 2.95
and 3.15, a quarter cell short of the wall a long leg met); their walk figures are a new route, not
comparable with `was`. Levels 2 and 7 run their rig poses again (a BOOTLVL bug that day had
ignored them). `was` = 2026-11-12, one build per segment.
Updated 2026-11-15 to the rig as it stands (stage 2 and phase 3 give identical figures): level 3 spin
125 -> 122 frames, level 6 spin 125 -> 124, level 7 walk 79 -> 78 frames, from the rig's own layout
changing between stage 1 and stage 2, with the engine unchanged. Compare fps only between rigs of
the same rig code.

| level | spin fps | was | walk fps | was |
|---|---:|---:|---:|---:|
| 1 | 23.12 | 22.92 | 16.22 | 16.22 |
| 2 | 31.89 | 31.30 | 13.72 | 13.72 |
| 3 | 24.32 | 23.05 | 15.78 | 15.78 |
| 4 | 21.80 | 21.60 | 15.80 | 15.67 |
| 5 | 27.91 | 27.40 | 11.89 (new route) | 11.86 BUMPED |
| 6 | 24.80 | 24.40 | 14.76 (new route) | 14.53 BUMPED |
| 7 | 33.00 | 32.09 | 16.25 | 15.99 |
| 8 | 22.85 | 22.45 | 15.56 | 15.28 |
| 9 | 20.66 | 20.20 | 19.93 | 19.57 |
