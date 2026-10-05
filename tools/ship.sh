#!/bin/zsh
# ship.sh [save]: build the four shipping disks and compare each against a saved baseline.
#   tools/ship.sh save   -- before a change: record the baselines (tools/.ship/, git-ignored)
#   tools/ship.sh        -- after it: IDENTICAL or DIFFERS per disk (with an asm diff line count)
# A cleanup that removes code no shipping build emits must leave all four IDENTICAL.
S=$(cd "$(dirname "$0")" && pwd)/.ship
mkdir -p "$S"
cd /Users/jfield/c64fps
typeset -A CFG
# The two disks that ship. The 7-level build is retired (user, 2026-10-05: the largest set ever
# resident is 4-7). The 4-7 RESIDENT builds (VSLOTS, with or without BGLOAD) do not fit since the
# edge chain became the default -- parked by the user ("let's not worry about that now"); add
# them back here once they assemble.
CFG=(latest "" leveltest "CHAIN=4,5,6,7")
for k in latest leveltest; do
  out=$(env ${=CFG[$k]} D64=zz-$k.d64 node build-iray.mjs 2>&1 | grep -E "^ok:|ASM ERROR|Error" | head -2)
  [[ "$out" == ok:* ]] || { echo "$k: BUILD FAILED: $out"; continue; }
  mv zz-$k.d64 $S/sh-$k.d64; cp iray.asm $S/sh-$k.asm
  if [[ "$1" == save ]]; then cp $S/sh-$k.d64 $S/base-$k.d64; cp iray.asm $S/base-$k.asm; echo "$k $(md5 -q $S/sh-$k.d64) saved"
  else
    if cmp -s $S/sh-$k.d64 $S/base-$k.d64; then echo "$k IDENTICAL"; else echo "$k DIFFERS  asm diff lines: $(diff $S/base-$k.asm $S/sh-$k.asm | grep -c '^[<>]')"; fi
  fi
done
node build-iray.mjs >/dev/null 2>&1
