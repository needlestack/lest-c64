#!/bin/zsh
# ship.sh [save]: build the shipping disks and compare each against a saved baseline.
#   tools/ship.sh save   -- before a change: record the baselines (tools/.ship/, git-ignored)
#   tools/ship.sh        -- after it: IDENTICAL or DIFFERS per disk (with an asm diff line count)
# A cleanup that removes code no shipping build emits must leave every one IDENTICAL.
S=$(cd "$(dirname "$0")" && pwd)/.ship
mkdir -p "$S"
cd "${0:A:h}/.."   # the checkout this script lives in, wherever that is
typeset -A CFG
# latest: THE GAME, the default build -- all seven levels, loaded on demand; iray.asm records it.
# dev: levels 1-4 (the default until 2026-10-06, and what most benchmark baselines were taken on).
# leveltest: levels 4-7.
CFG=(latest "" dev "CHAIN=1,2,3,4" leveltest "CHAIN=4,5,6,7")
for k in latest dev leveltest; do
  out=$(env ${=CFG[$k]} D64=zz-$k.d64 node src/build-iray.mjs 2>&1 | grep -E "^ok:|ASM ERROR|Error" | head -2)
  [[ "$out" == ok:* ]] || { echo "$k: BUILD FAILED: $out"; continue; }
  mv zz-$k.d64 $S/sh-$k.d64; cp build/iray.asm $S/sh-$k.asm
  if [[ "$1" == save ]]; then cp $S/sh-$k.d64 $S/base-$k.d64; cp build/iray.asm $S/base-$k.asm; echo "$k $(md5 -q $S/sh-$k.d64) saved"
  else
    if cmp -s $S/sh-$k.d64 $S/base-$k.d64; then echo "$k IDENTICAL"; else echo "$k DIFFERS  asm diff lines: $(diff $S/base-$k.asm $S/sh-$k.asm | grep -c '^[<>]')"; fi
  fi
done
# leave the tree as a plain build leaves it: iray.asm (tracked) and lest-c64.d64 are the game's
node src/build-iray.mjs >/dev/null 2>&1
