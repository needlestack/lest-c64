#!/bin/zsh
# ship.sh [save]: build the shipping disks and compare each against a saved baseline.
#   tools/ship.sh save   -- before a change: record the baselines (tools/.ship/, git-ignored)
#   tools/ship.sh        -- after it: IDENTICAL or DIFFERS per disk (with an asm diff line count)
# A cleanup that removes code no shipping build emits must leave every one IDENTICAL.
S=$(cd "$(dirname "$0")" && pwd)/.ship
mkdir -p "$S"
cd "${0:A:h}/.."   # the checkout this script lives in, wherever that is
typeset -A CFG
# game: THE GAME -- all seven levels, loaded on demand (2026-10-06: the first full playthrough).
# latest: the development default (levels 1-4), which is also what iray.asm records.
# leveltest: levels 4-7.
# The 4-7 RESIDENT builds (VSLOTS, with or without BGLOAD) do not fit since the edge chain became
# the default -- parked by the user; add them back here once they assemble.
CFG=(game "CHAIN=1,2,3,4,5,6,7" latest "" leveltest "CHAIN=4,5,6,7")
for k in game latest leveltest; do
  out=$(env ${=CFG[$k]} D64=zz-$k.d64 node build-iray.mjs 2>&1 | grep -E "^ok:|ASM ERROR|Error" | head -2)
  [[ "$out" == ok:* ]] || { echo "$k: BUILD FAILED: $out"; continue; }
  mv zz-$k.d64 $S/sh-$k.d64; cp iray.asm $S/sh-$k.asm
  if [[ "$1" == save ]]; then cp $S/sh-$k.d64 $S/base-$k.d64; cp iray.asm $S/base-$k.asm; echo "$k $(md5 -q $S/sh-$k.d64) saved"
  else
    if cmp -s $S/sh-$k.d64 $S/base-$k.d64; then echo "$k IDENTICAL"; else echo "$k DIFFERS  asm diff lines: $(diff $S/base-$k.asm $S/sh-$k.asm | grep -c '^[<>]')"; fi
  fi
done
# Leave the tree as a plain build leaves it (iray.asm is the DEFAULT build's, and tracked), but
# leave the GAME in latest.d64: that is the disk to play, and rebuilding the default over it
# quietly swapped a seven-level disk for a four-level one.
node build-iray.mjs >/dev/null 2>&1
[[ -f $S/sh-game.d64 ]] && cp $S/sh-game.d64 latest.d64
