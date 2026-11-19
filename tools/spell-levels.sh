#!/bin/zsh
# spell-levels.sh -- music/spell-level-5/6/7.sng: each level's song is two rounds of Spell (song-glide.mjs
# songs on the aligned grid) joined by song-rounds.mjs, then packed by song-pack.mjs. Run from the repo root;
# the rounds go to $TMPDIR.
#   5: spell-aligned -> spell-robin           the theme plain, then the voices' waveforms start to walk
#   6: spell-tri-hp  -> spell-aligned-arp-tri  soft triangles, then the arps and the beat arrive
#   7: spell-lead-a  -> lead C, all pulse      the arps become a melody; round 2 a second line, brighter
# (2026-10-31, the user: "make these as spell-level-5, 6, and 7 ... create a different but similarly styled
# line for the second round on level 7")
R=${TMPDIR:-/tmp}/spell-levels; mkdir -p $R
LEAD_A='F5:4 E5 D5 ~C5 D5 | A4:4 G4 A4 B4 C5 | D5:3 ~C5 B4:4 | B4:3 G4 A4 B4 C5 D5 |
E5:3 F5 G5 A5:2 G5 | G5:3 F5 E5 D5 C5 B4 | A4:4 C5 A4 F4 G4 | A4:3 C5 D5 E5 F5 E5 |
D5:4 ~C5 Bb4 A4 Bb4 | Bb4:3 A4 Bb4 C5 D5 E5 | F5:6 ~E5:2 | E5:3 G5 F5 E5 D5:2 |
E5:4 D5 E5 ~D5 A4 | A4:3 B4 C5 D5 E5 D5 | C#5:4 D5 E5 F5 E5 | E5:3 A4 Bb4 C#5 D5 E5 |'
LEAD_C='D5:3 E5 F5 G5 A5:2 | -:2 G5 F5 E5 D5 C5 D5 | B4:4 A4 G4 A4 B4 | D5:3 E5 D5 C5 B4 C5 |
E5:3 D5 E5 F5 G5 A5 | G5:3 E5 C5 D5 E5:2 | F5:4 E5 D5 C5 A4 | C5:3 A4 G4 A4 Bb4 C5 |
D5:4 F5 E5 D5 ~C5 | Bb4:2 C5 D5 E5 F5 G5 A5 | G5:2 F5:4 ~E5:2 | E5:3 D5 C5 B4 A4 B4 |
A4:3 E5 D5 E5 A5:2 | -:2 G5 F5 E5:2 D5 E5 | C#5:4 E5 D5 C#5 Bb4 | A4:3 C#5 E5 G5 F5 E5 |'
ALIGNED="TEMPOT=6 VIB=0 BASSPW=400,15,57 PADAPW=180,18,60 PADBPW=200,17,63 GLIDEFIRST=1"
CA='40 D3 D2 F4 @15 D4~.5 - - @30 - - E4 / 40 = G2 B3 @20 D3 - - / 20 D4 . E4 / 20 C3 C2 = @15 A3~.5 - - / 40 = F2 C4 @30 A2 - - / 40 Bb2 G2 D4 @15 Bb3~.5 - - / 35 F3 C3 G4 @15 E3~.2 - - / 40 E4~.5 D3~.5 A4~.5 / 45 C#4~.5 A2~.5 = @25 - - A3 / 0 D3 D2 F4'
CARP='40 D3 D2 F4^4,9 @15 D4~.5 - - @30 - - E4^5,10 / 40 = G2 B3^3,8 @20 D3 - - / 20 D4 . E4^5,10 / 20 C3 C2 =^3,8 @15 A3~.5 - - / 40 = F2 C4^5,9 @30 A2 - - / 40 Bb2 G2 D4^5,8 @15 Bb3~.5 - - / 35 F3 C3 G4^5,10 @15 E3~.2 - - @20 - - =^5,9 / 40 E4~.5 D3~.5 = @5 - - A4^5,7 / 45 C#4~.5 A2~.5 = @5 - - =^4,7 @25 - - A3^4,7 / 0 D3 D2 F4^4,9'
LP="FILT=1 FTYPE=lp FMASK=7 RSWEEP=2,e FCYCLE=4"
NZ="RHYTHM=2:CkTk RHYTHMBEAT=0.25 HITDROP=24"
G="node tools/song-glide.mjs"
env ${=ALIGNED} ${=LP} CSWEEP=b0,d0,16 CHORDS=$CA ${=G} $R/aligned.sng >/dev/null
env ${=ALIGNED} ${=LP} CSWEEP=b0,d0,16 BEATCYCLE=7,11,13 ROBIN=1 CHORDS=$CA ${=G} $R/robin.sng >/dev/null
env ${=ALIGNED} WAVES=t,t,t FILT=1 FTYPE=hp FRES=0 FMASK=7 FLO=08 FHI=48 FSTEP=2 FCYCLE=8 CHORDS=$CA ${=G} $R/trihp.sng >/dev/null
env ${=ALIGNED} ARPSAME=1 ARPT=15 ARPDIR=down ${=NZ} WAVES=p,p,t ${=LP} CSWEEP=90,b0,16 FADEIN=0.4 CHORDS=$CARP ${=G} $R/arptri.sng >/dev/null
env ${=ALIGNED} ${=NZ} WAVES=p,p,t ${=LP} CSWEEP=90,b0,16 FADEIN=0.4 CHORDS=$CA LEAD=$LEAD_A ${=G} $R/leada.sng >/dev/null
env ${=ALIGNED} ${=NZ} WAVES=p,p,p ${=LP} CSWEEP=90,b0,16 FADEIN=0.4 CHORDS=$CA LEAD=$LEAD_C ${=G} $R/leadc-pulse.sng >/dev/null
for a b in aligned spell-aligned robin spell-robin trihp spell-tri-hp arptri spell-aligned-arp-tri leada spell-lead-a; do
  cmp -s $R/$a.sng music/$b.sng && echo "$b rebuilds identical" || echo "$b DIFFERS"; done
# THE LEVEL SONGS' rounds, in fewer bytes (2026-10-31: the three did not fit the level region):
#   RSTEP=2    the resonance moves 2 levels a step, each step twice as long -- the one change you hear (the
#              user: "you can step at 2s, but keep both resonance and cutoff")
#   BEATLOOP=1 the noise beat from one looping wave program, the same hits tick for tick
#   CLOOP=1    one resonance cycle stored a drift direction (or one cutoff step a direction, tri-hp), a
#              filter-pointer command switching them -- the same sweep
L2="RSTEP=2 BEATLOOP=1 CLOOP=1"
# (level 5: robin strikes every voice at row 160 and glides them all into row 240, so its switches may come
# a row early or late -- and aligned, sharing its filter program, carries the same waits)
# (2026-11-18, the user, by A/B in VICE at the game's 60 Hz: the cutoff down from b0-d0 to 60-80, every voice's
# SUSTAIN halved for less distortion (BASSSR=69 PADSR=59: 12 and 11 of 15 -> 6 and 5; the same bytes), and in
# robin the narrow pulse widened 180 -> 400: under the lower cutoff a $180 pulse lost most of its level, a
# dropout rather than a change of colour)
L5="CSWEEP=60,80,16 BASSSR=69 PADSR=59"
env ${=ALIGNED} ${=LP} ${=L2} CLOOPE=1 CLOOPL=1 ${=L5} CHORDS=$CA ${=G} $R/aligned2.sng >/dev/null
env ${=ALIGNED} ${=LP} ${=L2} CLOOPE=1 CLOOPL=1 ${=L5} BEATCYCLE=7,11,13 ROBIN=1 BEATPW=800,400 CHORDS=$CA ${=G} $R/robin2.sng >/dev/null
env ${=ALIGNED} WAVES=t,t,t FILT=1 FTYPE=hp FRES=0 FMASK=7 FLO=08 FHI=48 FSTEP=2 FCYCLE=8 CLOOP=1 CHORDS=$CA ${=G} $R/trihp2.sng >/dev/null
# (level 6's arp-tri round has no FADEIN: only a song's start plays it, and round 2 never starts the song)
env ${=ALIGNED} ARPSAME=1 ARPT=15 ARPDIR=down ${=NZ} WAVES=p,p,t ${=LP} ${=L2} CSWEEP=90,b0,16 CHORDS=$CARP ${=G} $R/arptri2.sng >/dev/null
env ${=ALIGNED} ${=NZ} WAVES=p,p,t ${=LP} ${=L2} CSWEEP=90,b0,16 FADEIN=0.4 CHORDS=$CA LEAD=$LEAD_A ${=G} $R/leada2.sng >/dev/null
env ${=ALIGNED} ${=NZ} WAVES=p,p,p ${=LP} ${=L2} CSWEEP=90,b0,16 FADEIN=0.4 CHORDS=$CA LEAD=$LEAD_C ${=G} $R/leadc-pulse2.sng >/dev/null
# then song-rounds.mjs joins each level's two, and song-pack.mjs stores what repeats once (a figure through
# every chord, the rounds' shared programs and instruments) -- all three play exactly as packed
for n a b in 5 aligned2 robin2 6 trihp2 arptri2 7 leada2 leadc-pulse2; do
  node tools/song-rounds.mjs $R/level-$n.sng $R/$a.sng $R/$b.sng 2>&1 | grep -v "^ *at \|^$\|Node.js"
  node tools/song-pack.mjs $R/level-$n.sng music/spell-level-$n.sng; done
