#!/bin/sh
# Rebuild Krill's loader from ../../tmp/krill/loader against krill/loaderconfig.inc.
#
# INSTALL/RESIDENT are NOT Krill's defaults and must not drift from loader-src.mjs:
#   RESIDENT=0400 -- the screen, moved to $f400 by the boot body before install runs
#   INSTALL =09c0 -- just above the boot stub. Krill's default $1000 leaves 654 bytes of
#                    $1000 leaves 654 bytes of PADDING inside the boot PRG, and the boot PRG
#                    is loaded at KERNAL speed, so that padding is ~2.3 SECONDS of black screen.
set -e
SRC=${KRILL_SRC:-/private/tmp/krill/loader}
HERE=$(cd "$(dirname "$0")" && pwd)
make -C "$SRC/src" clean >/dev/null 2>&1 || true
VER=$(sed -n 's/.*VERSION_STRING "\([^"]*\)".*/\1/p' "$SRC/version.inc")
# macOS grep has no -P, which is how the Makefile reads its own version; pass it in instead.
make -C "$SRC/src" prg VERSION="$VER" PLATFORM=c64 INSTALL=${INSTALL:-09c0} RESIDENT=${RESIDENT:-0400} \
     EXTCONFIGPATH="$HERE" >/dev/null
cp "$SRC/build/loader-c64.prg" "$SRC/build/install-c64.prg" \
   "$SRC/build/loadersymbols-c64.inc" "$HERE/"
printf 'install %d B @ $%s   resident %d B @ $%s\n' \
  $(( $(stat -f%z "$HERE/install-c64.prg") - 2 )) ${INSTALL:-09c0} \
  $(( $(stat -f%z "$HERE/loader-c64.prg") - 2 )) ${RESIDENT:-0400}
