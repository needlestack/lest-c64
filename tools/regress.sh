#!/bin/zsh
# regress.sh [REV] -- does the working tree DRAW the same as REV (default HEAD)? See docs/TESTING.md.
#
# For changes that move bytes on purpose but must not change the game: layout, space savings, code
# that does the same thing differently. (A change that must not move bytes at all is ship.sh's job;
# whether it still plays and how fast is fpsr.mjs's.)
#
# REV is built in its own git worktree -- never `git stash`, which breaks this tree -- and every
# check runs the same workload on both builds:
#   FRAMES  frames.mjs records the displayed screen after every rendered frame of a fixed mover
#           (WALKF: forward a fixed step per rendered frame), compared by framecmp.mjs. Three
#           workloads: a level-1 walk; levels 1->2 with two forced falls (FALLNOW), which is the
#           drop, the level load and level 2; and the hub, level 4.
#   STILLS  a screenshot at a fixed cycle count, compared pixel for pixel: levels 5, 6 and 7 at
#           their starts, a fall held mid-drop (FALLHOLD), and the death scene's picture (DIETEST:
#           already cornered, then spin to face the angel).
# 16 emulator runs, each capped. Exit 1 if anything differs.
cd "${0:A:h}/.."
REV=${1:-HEAD}
SHA=$(git rev-parse --short "$REV") || exit 2
WT=${TMPDIR:-/tmp}/lest-regress-$SHA
OUT=$WT-out
[[ -d $WT ]] || git worktree add -q --detach "$WT" "$SHA" || exit 2
[[ -e $WT/tools/node_modules ]] || ln -s "$PWD/tools/node_modules" "$WT/tools/node_modules"
mkdir -p $OUT
bad=0
FRAMES=(
  "CHAIN=1 WALKF=1 BENCHF=300 NOHUD=1"
  "CHAIN=1,2 WALKF=1 BENCHF=400 NOHUD=1 FALLNOW=128"
  "CHAIN=4 WALKF=1 BENCHF=300 NOHUD=1"
)
for w in $FRAMES; do
  t=${w//[^A-Za-z0-9]/_}
  (cd $WT && perl -e 'alarm 100; exec @ARGV' node tools/frames.mjs "$w" --out $OUT/base-$t >/dev/null 2>&1)
  perl -e 'alarm 100; exec @ARGV' node tools/frames.mjs "$w" --out $OUT/new-$t >/dev/null 2>&1
  if [[ ! -s $OUT/base-$t/frames.bin || ! -s $OUT/new-$t/frames.bin ]]; then echo "FAILED   frames: $w (no frames recorded)"; bad=1; continue; fi
  r=$(node tools/framecmp.mjs $OUT/base-$t/frames.bin $OUT/new-$t/frames.bin) || bad=1
  echo "${r%%$'\n'*}  -- frames: $w"
  [[ $r == *$'\n'* ]] && echo "${r#*$'\n'}"
done
# The forced falls start on frame n-1 of FALLNOW=n, never frame 0 (nothing rendered yet: the drop would
# snapshot boot's leftovers), hence FALLNOW=2 for the parked one.
# A still is taken at a cycle count, so it must be a scene that HOLDS: a static pose, a parked fall,
# or the death picture, which is up from ~35M to ~40M cycles (32M catches the fade, which runs on
# the raster clock and so lands differently in a faster build).
STILLS=(
  "CHAIN=5 ANGFREEZE=1 DEADOK=1 NOHUD=1@100000000"
  "CHAIN=6 ANGFREEZE=1 DEADOK=1 NOHUD=1@100000000"
  "CHAIN=7 ANGFREEZE=1 DEADOK=1 NOHUD=1@100000000"
  "CHAIN=1,2 FALLNOW=2 FALLHOLD=12 ANGFREEZE=1 NOHUD=1@100000000"
  "DIETEST=1 SPINF=1 NOHUD=1@36000000"
)
shot() {   # dir env cycles png
  (cd $1 && env ${=2} D64=build/zz-regress.d64 node src/build-iray.mjs >/dev/null 2>&1 || { echo "BUILD FAILED in $1: $2"; return 1 }
   node tools/vicerun.mjs 55 -warp -jamaction 1 -limitcycles $3 -exitscreenshot "$4" -autostart build/zz-regress.d64 >/dev/null 2>&1
   rm -f build/zz-regress.d64)
}
for s in $STILLS; do
  w=${s%@*}; cy=${s##*@}; t=${w//[^A-Za-z0-9]/_}
  rm -f $OUT/base-$t.png $OUT/new-$t.png
  shot $WT "$w" $cy $OUT/base-$t.png; shot $PWD "$w" $cy $OUT/new-$t.png
  if [[ ! -s $OUT/base-$t.png || ! -s $OUT/new-$t.png ]]; then echo "FAILED   still: $w (no screenshot)"; bad=1
  elif cmp -s $OUT/base-$t.png $OUT/new-$t.png; then echo "SAME     still: $w @$cy"
  else echo "DIFFERS  still: $w @$cy  ($OUT/base-$t.png vs $OUT/new-$t.png)"; bad=1; fi
done
# leave the tree as a plain build leaves it
node src/build-iray.mjs >/dev/null 2>&1
echo ${${bad/1/*** DIFFERENCES -- see above ***}/0/renders the same as $SHA}
exit $bad
