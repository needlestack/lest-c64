#!/bin/zsh
# pixcmp.sh [REV] -- does the working tree RENDER the same as REV (default HEAD)?
# For changes that move bytes on purpose (layout, code), where tools/ship.sh's md5 cannot say.
# Each scene: build REV's build-iray.mjs and the working tree's with the same env, run both to the
# same cycle count, compare the screenshots. Scenes are STATIC poses plus the 16-drop FALLNOW run:
# a moving scene (SPIN, WALK) is captured at a heading that drifts between runs, so it cannot be
# compared even against itself.
cd "$(dirname "$0")/.." || exit 1
REV=${1:-HEAD}
T=$(mktemp -d)
cp src/build-iray.mjs "$T/new.mjs"; git show "$REV:src/build-iray.mjs" > "$T/old.mjs"
# The scenes swap REV's build-iray.mjs over the live one; an interrupt used to leave REV's in the tree.
trap 'cp "$T/new.mjs" src/build-iray.mjs' EXIT INT TERM
shot() {   # $1 env, $2 png
  env ${=1} D64=zz-pix.d64 node src/build-iray.mjs >/dev/null 2>&1 || { echo "BUILD FAILED: $1"; return 1; }
  # vicerun: a private config, the standard drive flags, a hard cap, and its OWN process group killed
  # afterwards -- this used to end with `pkill -f x64sc`, which closed any VICE the user had open.
  node tools/vicerun.mjs 55 -warp -jamaction 1 -limitcycles 100000000 -exitscreenshot "$2" -autostart zz-pix.d64 >/dev/null 2>&1
}
# Poses in the levels, which is what the player moves through; the HUD is off (NOHUD=1) because its
# fps/position readout depends on timing and differs from run to run. Falls are not checked by
# default (the user, 2026-10-05: falls are fine, moving around the levels is what matters).
SCENES=(
  "CHAIN=1 ANGFREEZE=1 DEADOK=1 NOHUD=1"
  "CHAIN=1 ANGFREEZE=1 DEADOK=1 NOHUD=1 PA=40"
  "CHAIN=2 ANGFREEZE=1 DEADOK=1 NOHUD=1"
  "CHAIN=3 ANGFREEZE=1 DEADOK=1 NOHUD=1"
  "CHAIN=4 IDOLSEAT=1 ANGFREEZE=1 DEADOK=1 NOHUD=1"
  "CHAIN=4 IDOLSEAT=1 ANGFREEZE=1 DEADOK=1 NOHUD=1 PA=F5 PAF=C0"
  "CHAIN=5 ANGFREEZE=1 DEADOK=1 NOHUD=1"
  "CHAIN=6 ANGFREEZE=1 DEADOK=1 NOHUD=1"
  "CHAIN=7 ANGFREEZE=1 DEADOK=1 NOHUD=1"
)
# PIXSCENES="env1|env2|..." replaces the list (e.g. mid-fall holds: FALLNOW=1 FALLHOLD=n).
[[ -n "$PIXSCENES" ]] && SCENES=("${(@s:|:)PIXSCENES}")
bad=0
for sc in $SCENES; do
  cp "$T/old.mjs" src/build-iray.mjs; shot "$sc" "$T/o.png"
  cp "$T/new.mjs" src/build-iray.mjs; shot "$sc" "$T/n.png"
  if cmp -s "$T/o.png" "$T/n.png"; then echo "SAME     $sc"; else echo "DIFFERS  $sc  ($T/o.png vs $T/n.png)"; bad=1; fi
done
cp "$T/new.mjs" src/build-iray.mjs; rm -f zz-pix.d64
node src/build-iray.mjs >/dev/null 2>&1
exit $bad
