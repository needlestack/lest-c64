#!/bin/bash
# Score the render after MOTION, at a frozen viewpoint.
#
# The pinned six views never change rb or rs, so the run cache always hits its equality test and
# the shrink/grow skip paths never run -- they would pass with those paths entirely broken. TOUR
# moves for 512 frames (a whole number of rotations and oscillations, so it lands back on
# PX/PY/PA exactly) and then FREEZES. Any row a wrong skip failed to redraw is never redrawn
# again, so it is still on screen when the shot is taken.
S="${CLAUDE_JOB_DIR:-/tmp}/tmp"; V=/Applications/vice-arm64-gtk3-3.8/bin/x64sc
for VP in "034c 0d80 f8" "0bc6 09b3 7a" "0c80 0eb3 80"; do
  set -- $VP
  TOUR=1 PARTIAL=${PARTIAL:-1} PX=$1 PY=$2 PA=$3 node build-iray.mjs >/dev/null 2>&1 \
    || { echo "$VP BUILD FAILED"; continue; }
  $V -silent -warp -ntsc +drive8truedrive -limitcycles 90000000 -jamaction 1 \
     -exitscreenshot "$S/mv.png" -autostart latest.d64 >/dev/null 2>&1
  echo "$VP  |  $(node verify-render.mjs "$S/mv.png" "$1" "$2" "$3" 2>&1 | tail -1)"
done
