#!/bin/bash
# THE benchmark. One VICE run, ~30 seconds of wall clock, one number -- and the split behind it.
#
#   ./bench.sh                    the current tree
#   ./bench.sh "SEAMS=0"          any extra build vars, for an A/B
#   ./bench.sh "" --sub           the fine-grained buckets too (a second run; see seamprof.mjs)
#
# ROUTE=bench walks and runs a fixed 89-second route through level 1 with no objects -- the
# open room crossed on long diagonals facing its stepped walls, the corridor once each way --
# the way a player moves: no spins, no oscillation, no waits, no hole. It is driven in 60Hz
# ticks and, since the twStep expiry fix of 2026-09-15, lands every step exactly where the
# route compiler says (posecheck.mjs proves it), so a build of ANY frame rate walks the SAME
# line and renders the same journey. Two runs of one build agree to a tenth of a raster line
# per phase.
#
# The numbers to compare between builds:
#   fps          frames rendered over the fixed 89s -- what the player gets
#   lines/tour   per phase, wait excluded -- what the code costs; comparable across builds
#                because the tour is the same wall-clock length and the same journey whatever
#                the speed. NOT lines/frame: a faster build renders more, cheaper frames.
# See seamprof.mjs for the pfTick correction and why the wait is excluded.
set -u
cd /Users/jfield/c64fps
EXTRA=${1:-}
SUB=""
[ "${2:-}" = "--sub" ] && SUB="" || SUB="--coarse --cost=3.7"
node seamprof.mjs --route=bench $SUB ${EXTRA:+--env "$EXTRA"}
# Leave latest.d64 as the shipping build, never a benchmark one.
env -u ROUTE -u TOURW -u PROFILE -u PROFCOARSE -u PROFTOUR -u PROFN -u FRAMELOG -u DIE -u NOORB -u ANGEL -u TWOLEV -u LVL \
  node build-iray.mjs >/dev/null 2>&1 && echo "latest.d64 rebuilt at defaults"
