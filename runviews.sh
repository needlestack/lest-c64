#!/bin/bash
# Run every view in views.txt through build -> VICE -> verify-render (+ verify-seams).
# $1 = tag for the output files (e.g. "steep" or "base")
set -u
S=${SHOTDIR:-/tmp/c64fps-shots}
mkdir -p "$S"
TAG=${1:-cur}
cd /Users/jfield/c64fps
n=0
while read -r PX PY PA rest; do
  case "$PX" in ''|'#') continue;; esac
  n=$((n+1))
  # SPRITES=0: this checks the WALL renderer against the reference model, which knows
  # nothing about sprites -- an orb in shot would just read as a pile of wrong pixels.
  SPRITES=0 PX=$PX PY=$PY PA=$PA node build-iray.mjs >/dev/null 2>&1 || { echo "$n BUILD FAILED"; continue; }
  /Applications/vice-arm64-gtk3-3.8/bin/x64sc -silent -warp -ntsc +drive8truedrive \
     -limitcycles 30000000 -jamaction 1 -exitscreenshot "$S/$TAG-$n.png" \
     -autostart latest.d64 >/dev/null 2>&1
  if [ ! -f "$S/$TAG-$n.png" ]; then echo "$n VICE FAILED"; continue; fi
  R=$(node verify-render.mjs "$S/$TAG-$n.png" "$PX" "$PY" "$PA" 2>&1 | tail -1)
  echo "$n  $PX $PY $PA  |  $R"
  # verify-render counts a white seam pixel as "not wall", so with seams on its number is
  # inflated by design; verify-seams is the one that actually judges them.
  if [ "${SEAMS:-1}" != "0" ]; then
    node verify-seams.mjs "$S/$TAG-$n.png" "$PX" "$PY" "$PA" 2>&1 | tail -n +2 | sed 's/^/     /'
  fi
done < views.txt
