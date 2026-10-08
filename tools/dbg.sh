#!/bin/zsh
# dbg.sh: the debug/test configurations still build (no runtime check)
cd "${0:A:h}/.."   # the checkout this script lives in, wherever that is
for c in "CHAIN=2" "CHAIN=4 IDOLSEAT=1 ANGFREEZE=1" "PROFILE=1 PROFCOARSE=1 PROFN=1 ENTPROF=1 ENT1PROF=1" "CHAIN=4 GATEPROF=1 PROFILE=1 PROFCOARSE=1 PROFN=1" "FALLNOW=1 CHAIN=4,5,6,7" "FOVCHK=1" "CULLCNT=1" "GATECHK=1 CHAIN=4" "OSCNT=1 OCCFBN=1" "PROFILE=1 PROFWIN=100,300 EDGCHK=1" "RAYCNT=1 SEAMCNT=1" "SPIN=1 WALK=1 DIETEST=1"; do
  r=$(env ${=c} D64=zz-dbg.d64 node src/build-iray.mjs 2>&1 | grep -E "^ok:|ASM ERROR|Error" | head -1 | cut -c1-120)
  echo "${c}: ${r:0:60}"
done
rm -f zz-dbg.d64; node src/build-iray.mjs >/dev/null 2>&1
