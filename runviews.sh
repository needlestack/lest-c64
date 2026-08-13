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
  PX=$PX PY=$PY PA=$PA node build-iray.mjs >/dev/null 2>&1 || { echo "$n BUILD FAILED"; continue; }
# VICE inverts boolean flags: +opt DISABLES, -opt enables. So +drive8truedrive means true drive
# emulation is OFF, which is what we want -- nothing measured here depends on 1541 timing, and
# with it ON a 13.5KB disk takes over 50M cycles to load.
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

# Leave latest.d64 as the SHIPPING build. Every iteration above overwrites it with a
# viewpoint-pinned variant, so without this the disk in the project root is whatever the
# last view happened to be -- which has cost a round trip before.
# Rebuild at TRUE defaults. This used to be a bare `node build-iray.mjs`, which INHERITS the
# environment -- so `SPRITES=0 ./runviews.sh` left a sprites-off disk while printing
# "rebuilt at defaults", and the next person to run latest.d64 saw no orbs and went looking
# for a bug. Clearing the diagnostic vars explicitly is the only way the message is true.
env -u SPIN -u SPRITES -u ORBOCC -u ORBOCCDBG -u ORBDUMP -u WIGGLE -u TOUR -u PROFILE -u RAYCNT -u PLAN -u PX -u PY -u PA -u NOSELFEXT -u DBGORB -u FINEANG -u SEAMS -u PIVOT -u PALKEYS -u KCELL node build-iray.mjs >/dev/null 2>&1 && echo "latest.d64 rebuilt at defaults"
