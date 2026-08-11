#!/bin/bash
# Precise SPIN fps in FIVE VICE runs. Build with SPIN=1 first, then: bash fps.sh <tag>
#
# The SPIN build now hops to the next of four preset viewpoints on every full rotation, so a
# run averages over several parts of the map rather than measuring one spot forever. It used
# to sit at the start corridor for all five samples, which flattered anything whose cost
# scales with what is on screen -- the cheapest view is not a benchmark. The hop is
# frame-locked so two builds still visit the same places in the same order.
#
# Five is a hard budget: each run occupies the machine, so benchmarking and regression
# checks stay at or under it (runviews.sh is 5 views for the same reason). Debugging a
# specific bug is the exception -- run as many as the bug needs.
#
# Two constraints shape the sampling. The angle byte counts frames and wraps at 256, so a
# window must stay under 256 frames to be unambiguous: at ~18 fps that is under ~14M
# cycles. The step is 7M rather than 11M since the viewpoint hopping was added: at the fast
# viewpoints 11M cycles is over 256 frames, and a segment that wraps to exactly 256 reads as
# ZERO, which is how it failed the first time. 7M is ~205 frames at 30 fps, with margin.
# And fps swings roughly 8-30 with view angle and position, so the window wants a whole
# number of rotations or the leftover biases the result. A single 20M window -- what the old
# "21.9 fps" came from -- is BOTH ambiguous and only 1.4 rotations, which is why it read high.
set -u
S=${SHOTDIR:-/tmp/c64fps-shots}
mkdir -p "$S"
TAG=$1
cd /Users/jfield/c64fps
for T in 15 22 29 36 43; do
  /Applications/vice-arm64-gtk3-3.8/bin/x64sc -silent -warp -ntsc +drive8truedrive \
     -limitcycles ${T}000000 -jamaction 1 -exitscreenshot "$S/fps-$TAG-$T.png" \
     -autostart latest.d64 >/dev/null 2>&1
done
SHOTDIR="$S" node - "$TAG" <<'EOF'
import {execSync} from 'child_process';
const S=process.env.SHOTDIR, tag=process.argv[2], Ts=[15,22,29,36,43];
const a=Ts.map(T=>{const o=execSync(`node /Users/jfield/c64fps/readout.mjs ${S}/fps-${tag}-${T}.png`).toString();
  return parseInt(o.match(/A([0-9A-F]{2})/)[1],16);});
let tot=0; const segs=[];
for(let i=1;i<Ts.length;i++){const d=(a[i]-a[i-1]+256)%256; tot+=d; segs.push(d);}
const secs=(Ts.at(-1)-Ts[0])*1e6/1022727;
// A segment that wraps past 256 reads LOW, and one that wraps to exactly 256 reads ZERO --
// which is what an 11M step did once the benchmark started visiting the faster viewpoints.
if(segs.some(d=>d===0)) console.log(`WARNING: a segment read 0 frames -- that is a 256-frame wrap, not a stall`);
if(segs.some(d=>d>200)) console.log(`WARNING: a segment is ${Math.max(...segs)} frames, near the 256 wrap -- shorten the step`);
console.log(`${tag}: segments ${segs.join(' ')}  = ${tot} frames over ${secs.toFixed(2)}s  -> ${(tot/secs).toFixed(2)} fps`);
EOF

# fps.sh must be run against a SPIN=1 build, which bakes auto-rotate into iray.asm and
# latest.d64. Leave the shipping disk behind instead of a spinning one -- twice now the disk
# handed over has been a measurement build.
node build-iray.mjs >/dev/null 2>&1 && echo "latest.d64 rebuilt at defaults (SPIN off)"
