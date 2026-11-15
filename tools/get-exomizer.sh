#!/bin/zsh
# get-exomizer.sh -- fetch and build the exomizer that packs the boot quote (src/make-quote.mjs).
#
#   tools/get-exomizer.sh        -> tools/exomizer-3.1/src/exomizer (git-ignored; make-quote finds it)
#
# Exomizer is Magnus Lind's cruncher (https://bitbucket.org/magli143/exomizer), under the zlib licence:
# free to use, change and redistribute, provided its notice stays with the source. It is FETCHED here,
# not kept in this repository, because its source is ~740 KB -- more than ten times the rest of the
# third-party code we carry (krill/). Pinned to release 3.1.2 BY COMMIT: that exact version reproduces
# data/quote-screen.json byte for byte (checked 2026-11-15), and a different one need not. The quote
# was first packed with the copy inside Krill's loader package (its tools/exomizer-3.1), which is why
# the path is what it is.
set -e
cd "${0:A:h}/.."
TAG=3.1.2 SHA=df77c879ce2addc027043e5e80e3992a2ec99eb9 DIR=tools/exomizer-3.1
if [[ -x $DIR/src/exomizer ]]; then echo "already built: $DIR/src/exomizer"; exit 0; fi
rm -rf $DIR
git -c advice.detachedHead=false clone -q --depth 1 --branch $TAG https://bitbucket.org/magli143/exomizer.git $DIR
got=$(git -C $DIR rev-parse HEAD)
if [[ $got != $SHA ]]; then echo "exomizer $TAG is commit $got, not the pinned $SHA -- refusing (the quote would not reproduce)"; rm -rf $DIR; exit 1; fi
make -s -C $DIR/src exomizer
echo "built $DIR/src/exomizer ($TAG, $SHA)"
