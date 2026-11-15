#!/bin/zsh
# regress.sh [REV] -- does the working tree DRAW the same as REV (default HEAD)? See docs/TESTING.md.
#
# For changes that move bytes on purpose but must not change the game: layout, space savings, code
# that does the same thing differently. (A change that must not move bytes at all is ship.sh's job;
# whether it still plays and how fast is fpsr.mjs's.)
#
# ON THE TEST RIG (2026-11-14). Each side builds ONE rig (TESTRIG=1, see build-iray.mjs) -- REV in its
# own git worktree (never `git stash`, which breaks this tree), this tree here, the two builds side by
# side -- and every workload is a PATCHED COPY of its own side's rig disk (tools/rig.mjs), run by this
# tree's tools on both sides. It used to be a build per workload per side, 24 builds of the ten-level
# game. SO REV MUST HAVE THE RIG: a revision from before 2026-11-14 cannot build TESTRIG=1 and this
# stops with that said. (For an older baseline, check out this script's previous version.)
# Each workload is a rig PARAMETER SET (rig.mjs's keys); a level other than 1 is entered by a real fall
# from level 1, and frame 0 is the first frame of play on it.
#   FRAMES  frames.mjs records the displayed screen after every rendered frame of a fixed mover
#           (walkf: forward a fixed step per rendered frame), compared by framecmp.mjs. Five
#           workloads: a level-1 walk; level 1 with forced falls (fallnow), which is the drop, the
#           level load and level 2; the hub, level 4; and falls OUT of level 4 (4->5->4) and level 8
#           (8->9). Those two since 2026-11-13, when level 4's wall mark and level 8's orb shadow
#           became level code that puts the shared art back on the way out (lxBye): nothing else
#           leaves either level.
#   STILLS  a screenshot at a fixed cycle count, compared pixel for pixel: levels 5, 6, 7, 8 and 9 at
#           their starts, a fall held mid-drop (fallhold), and the death scene's picture (dietest:
#           already cornered, then spin to face the angel). Level 8 since 2026-10-14, when its
#           flicker became LEVEL CODE (loaded with the level, reached through lxTick): the tube's
#           random sequence advances once per raster-locked tick, so the inks at a cycle count are
#           the same in any two rigs that reach the level in the same time.
# 2 builds and 24 emulator runs, each capped. Level 9 (2026-10-15) with svfreeze: its sentries glide and
# spark on the 60Hz clock, so its still is only comparable with them held. Exit 1 if anything differs.
# It never writes lest-c64.d64 (2026-11-14): its last step used to be a plain build "to leave the tree
# as a plain build leaves it", which overwrote the disk the user plays. The rigs are build/regress-rig.*.
cd "${0:A:h}/.."
REV=${1:-HEAD}
SHA=$(git rev-parse --short "$REV") || exit 2
WT=${TMPDIR:-/tmp}/lest-regress-$SHA
OUT=$WT-out
TOOLS=$PWD/tools   # every emulator run uses this tree's tools, on either side
# prune first: a worktree whose temp dir was cleaned is still registered, and `add` refuses it
git worktree prune
[[ -d $WT ]] || git worktree add -q --detach "$WT" "$SHA" || exit 2
[[ -e $WT/tools/node_modules ]] || ln -s "$PWD/tools/node_modules" "$WT/tools/node_modules"
mkdir -p $OUT
bad=0

# ---- the two rigs, built at once (different trees, so nothing is shared) ----
# Always built, never reused: a reference is built now, not remembered (TESTING.md, Rules).
RIGD64=build/regress-rig.d64
rig() {   # root logfile: build the rig in root; the json's path on stdout, or the reason on the log
  node --input-type=module -e "
    import { buildRig } from '$TOOLS/rig.mjs';
    try { console.log(buildRig({}, process.argv[1], '$RIGD64')); }
    catch (e) { console.error(e.message); process.exit(1); }" "$1" 2>"$2"
}
rm -f $WT/$RIGD64 $PWD/$RIGD64 $OUT/rig-base.log $OUT/rig-new.log
rig $WT $OUT/rig-base.log > $OUT/rig-base.path & pb=$!
rig $PWD $OUT/rig-new.log > $OUT/rig-new.path & pn=$!
wait $pb; sb=$?; wait $pn; sn=$?
if (( sb )); then
  echo "REV $SHA CANNOT BUILD THE TEST RIG (TESTRIG=1): $(cat $OUT/rig-base.log)"
  echo "regress.sh compares rigs since 2026-11-14: REV must be a revision that has one."
  exit 2
fi
if (( sn )); then echo "THIS TREE CANNOT BUILD THE TEST RIG (TESTRIG=1): $(cat $OUT/rig-new.log)"; exit 2; fi
BASE=$(<$OUT/rig-base.path) NEW=$(<$OUT/rig-new.path)

FRAMES=(
  "level=1 mode=walkf bench=300"
  "level=1 mode=walkf bench=400 fallnow=128"
  "level=4 mode=walkf bench=300"
  "level=4 mode=walkf bench=400 fallnow=128"
  "level=8 mode=walkf bench=200 fallnow=128"
)
for w in $FRAMES; do
  t=${w//[^A-Za-z0-9]/_}
  rm -rf "$OUT/base-$t" "$OUT/new-$t"   # never compare a previous run's frames (the 2026-11-13 audit)
  RIG=$BASE perl -e 'alarm 180; exec @ARGV' node $TOOLS/frames.mjs "$w" --out $OUT/base-$t >$OUT/base-$t.log 2>&1
  RIG=$NEW perl -e 'alarm 180; exec @ARGV' node $TOOLS/frames.mjs "$w" --out $OUT/new-$t >$OUT/new-$t.log 2>&1
  if [[ ! -s $OUT/base-$t/frames.bin || ! -s $OUT/new-$t/frames.bin ]]; then
    echo "FAILED   frames: $w (no frames recorded: $(tail -1 $OUT/base-$t.log) | $(tail -1 $OUT/new-$t.log))"; bad=1; continue
  fi
  r=$(node $TOOLS/framecmp.mjs $OUT/base-$t/frames.bin $OUT/new-$t/frames.bin) || bad=1
  echo "${r%%$'\n'*}  -- frames: $w"
  [[ $r == *$'\n'* ]] && echo "${r#*$'\n'}"
done
# The forced falls start on frame n-1 of fallnow=n, never frame 0 (nothing rendered yet: the drop would
# snapshot boot's leftovers), hence fallnow=2 for the parked one.
# A still is taken at a cycle count, so it must be a scene that HOLDS: a static pose, a parked fall,
# or the death picture, which is up from ~35M to ~40M cycles (32M catches the fade, which runs on
# the raster clock and so lands differently in a faster build).
STILLS=(
  "level=5 angfreeze=1@100000000"
  "level=6 angfreeze=1@100000000"
  "level=7 angfreeze=1@100000000"
  "level=8 angfreeze=1@100000000"
  "level=9 svfreeze=1@100000000"
  "level=1 fallnow=2 fallhold=12 angfreeze=1@100000000"
  "dietest=1 mode=spinf@36000000"
)
shot() {   # rig.json params cycles png: a patched copy of that rig, run to the cycle count
  local d=${4%.png}.d64
  rm -f $d
  node $TOOLS/rig.mjs $1 $d ${=2} >/dev/null || { echo "PATCH FAILED: $2 on $1"; return 1 }
  node $TOOLS/vicerun.mjs 55 -warp -jamaction 1 -limitcycles $3 -exitscreenshot "$4" -autostart $d >/dev/null 2>&1
  rm -f $d
}
for s in $STILLS; do
  w=${s%@*}; cy=${s##*@}; t=${w//[^A-Za-z0-9]/_}
  rm -f $OUT/base-$t.png $OUT/new-$t.png
  shot $BASE "$w" $cy $OUT/base-$t.png; shot $NEW "$w" $cy $OUT/new-$t.png
  if [[ ! -s $OUT/base-$t.png || ! -s $OUT/new-$t.png ]]; then echo "FAILED   still: $w (no screenshot)"; bad=1
  elif cmp -s $OUT/base-$t.png $OUT/new-$t.png; then echo "SAME     still: $w @$cy"
  else echo "DIFFERS  still: $w @$cy  ($OUT/base-$t.png vs $OUT/new-$t.png)"; bad=1; fi
done
echo ${${bad/1/*** DIFFERENCES -- see above ***}/0/renders the same as $SHA}
exit $bad
