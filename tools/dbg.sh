#!/bin/zsh
# dbg.sh: the debug/test configurations still build (no runtime check). Every disk is the full game
# (2026-11-15), so the CHAIN= configs of the old list are these flags on it.
cd "${0:A:h}/.."   # the checkout this script lives in, wherever that is
for c in "IDOLSEAT=1 ANGFREEZE=1" "PROFILE=1 PROFCOARSE=1 PROFN=1 ENTPROF=1 ENT1PROF=1" "GATEPROF=1 PROFILE=1 PROFCOARSE=1 PROFN=1" "FALLNOW=1" "FOVCHK=1" "CULLCNT=1" "GATECHK=1" "OSCNT=1 OCCFBN=1" "PROFILE=1 PROFWIN=100,300 EDGCHK=1" "RAYCNT=1 SEAMCNT=1" "SPIN=1 WALK=1 DIETEST=1"; do
  r=$(env ${=c} D64=build/zz-dbg.d64 node src/build-iray.mjs 2>&1 | grep -E "^ok:|ASM ERROR|Error" | head -1 | cut -c1-120)
  echo "${c}: ${r:0:60}"
done
rm -f build/zz-dbg.d64   # (no plain build after: that wrote lest-c64.d64, the disk being played)
