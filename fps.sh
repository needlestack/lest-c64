#!/bin/bash
# Precise SPIN fps in FIVE VICE runs. Build with SPIN=1 first, then: bash fps.sh <tag>
#
# Five is a hard budget: each run occupies the machine, so benchmarking and regression
# checks stay at or under it (runviews.sh is 5 views for the same reason). Debugging a
# specific bug is the exception -- run as many as the bug needs.
#
# Two constraints shape the sampling. The angle byte counts frames and wraps at 256, so a
# window must stay under 256 frames to be unambiguous: at ~18 fps that is under ~14M
# cycles. And fps swings roughly 12-30 depending on view angle, so the window has to cover
# a whole number of rotations or the leftover partial rotation biases the result by several
# frames. 4 segments x 11M cycles = 43s = ~780 frames = ~3.05 rotations: each segment is
# ~195 frames (safely unambiguous) and the partial rotation is a small fraction of the
# total. A single 20M window -- what the old "21.9 fps" came from -- is BOTH ambiguous and
# only 1.4 rotations, which is why it read ~5 fps high.
set -u
S=${SHOTDIR:-/tmp/c64fps-shots}
mkdir -p "$S"
TAG=$1
cd /Users/jfield/c64fps
for T in 15 26 37 48 59; do
  /Applications/vice-arm64-gtk3-3.8/bin/x64sc -silent -warp -ntsc +drive8truedrive \
     -limitcycles ${T}000000 -jamaction 1 -exitscreenshot "$S/fps-$TAG-$T.png" \
     -autostart latest.d64 >/dev/null 2>&1
done
SHOTDIR="$S" node - "$TAG" <<'EOF'
import {execSync} from 'child_process';
const S=process.env.SHOTDIR, tag=process.argv[2], Ts=[15,26,37,48,59];
const a=Ts.map(T=>{const o=execSync(`node /Users/jfield/c64fps/readout.mjs ${S}/fps-${tag}-${T}.png`).toString();
  return parseInt(o.match(/A([0-9A-F]{2})/)[1],16);});
let tot=0; const segs=[];
for(let i=1;i<Ts.length;i++){const d=(a[i]-a[i-1]+256)%256; tot+=d; segs.push(d);}
const secs=(Ts.at(-1)-Ts[0])*1e6/1022727;
if(segs.some(d=>d>240)) console.log(`WARNING: a segment is ${Math.max(...segs)} frames, close to the 256 wrap -- shorten the step`);
console.log(`${tag}: segments ${segs.join(' ')}  = ${tot} frames over ${secs.toFixed(2)}s  -> ${(tot/secs).toFixed(2)} fps`);
EOF
