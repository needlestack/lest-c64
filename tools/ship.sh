#!/bin/zsh
# ship.sh [save]: build THE shipping disk and compare it against a saved baseline.
#   tools/ship.sh save   -- before a change: record the baseline (tools/.ship/, git-ignored)
#   tools/ship.sh        -- after it: IDENTICAL or DIFFERS (with an asm diff line count)
# A cleanup that removes code no shipping build emits must leave it IDENTICAL.
# One disk (2026-11-15): every disk is the whole game, so the partial configs (dev = CHAIN=1,2,3,4,
# leveltest = CHAIN=4,5,6,7) went with CHAIN. It builds to build/zz-latest.d64 and never writes
# lest-c64.d64 (its last step used to be a plain build, which replaced the disk the user plays).
# The cartridge (2026-11-15) is held to the same standard: the build writes zz-latest.crt beside the
# disk, and IDENTICAL means both. (A baseline saved before the cartridge has no .crt: save again.)
S=$(cd "$(dirname "$0")" && pwd)/.ship
mkdir -p "$S"
cd "${0:A:h}/.."   # the checkout this script lives in, wherever that is
out=$(D64=build/zz-latest.d64 node src/build-iray.mjs 2>&1 | grep -E "^ok:|ASM ERROR|Error" | head -2)
[[ "$out" == ok:* ]] || { echo "latest: BUILD FAILED: $out"; exit 1; }
mv build/zz-latest.d64 $S/sh-latest.d64; mv build/zz-latest.crt $S/sh-latest.crt; cp build/iray.asm $S/sh-latest.asm
if [[ "$1" == save ]]; then cp $S/sh-latest.d64 $S/base-latest.d64; cp $S/sh-latest.crt $S/base-latest.crt; cp build/iray.asm $S/base-latest.asm
  echo "latest $(md5 -q $S/sh-latest.d64) saved (crt $(md5 -q $S/sh-latest.crt))"
elif [[ ! -f $S/base-latest.crt ]]; then echo "latest: the baseline has no .crt (saved before the cartridge) -- run tools/ship.sh save"; exit 1
elif cmp -s $S/sh-latest.d64 $S/base-latest.d64 && cmp -s $S/sh-latest.crt $S/base-latest.crt; then echo "latest IDENTICAL (disk and cartridge)"
elif cmp -s $S/sh-latest.d64 $S/base-latest.d64; then echo "latest: disk IDENTICAL, cartridge DIFFERS"; exit 1
else echo "latest DIFFERS  asm diff lines: $(diff $S/base-latest.asm $S/sh-latest.asm | grep -c '^[<>]')"; exit 1; fi
