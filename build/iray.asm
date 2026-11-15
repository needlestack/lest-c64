
; ---- THE LEVEL IS NOT IN THIS IMAGE ----
; Every per-level table is an EQUATE into the slot at $6500, in manifest order, mapT first
; so it lands page-aligned at offset 0. The bytes arrive as their own disk file. Nothing below
; changes: every reference still names the label, which now resolves into the slot instead of
; into a run of !byte the image carries.
mapT = $6500
rowMulT = $6600
bfsDCT = $6620
lvlDimT = $6624
orbXCT = $6629
orbYCT = $663a
orbX0T = $664b
orbY0T = $6655
angLeashT = $665f
angPerT = $6668
lvlCorT = $6669
hlFillT = $666a
sockWallT = $6671
wallDLoT = $6674
wallDHiT = $6678
wallCLoT = $667c
wallCHiT = $6680
orbTallT = $6684
orbArtT = $668e
orbColT2 = $6698
orbIdolT = $66a2
orbHid0T = $66ac
lvlNxtT = $66b6
nOrbT = $66ba
nHoleT = $66bb
nExitT = $66bc
nOrbM1T = $66bd
nSockT = $66be
nAllM1T = $66bf
nAllT = $66c0
nPedT = $66c1
lvlStartT = $66c2
lvlLxT = $66c8
sockStgT = $66c9
svNT = $66cc
stNT = $66cd
stWT = $66ce
stWXT = $66d0
stWYT = $66d2
stWAXT = $66d4
stWAYT = $66d6
stFstT = $66d8
lvlArtT = $66da
lvlAnT = $66db
bltIxT = $66dc
bgAIxT = $66dd
lvlMeT = $66de
hzMskT = $66df
stmpT = $66e6
zoneT = $6741

charset = $c000        ; where the VIC reads them: under the I/O hole
charsetB = $c800
px      = $02
py      = $04
pa      = $06
; $07 is free: it was rang, the coarse byte ray angle, dead since castRay's step
; signs moved to the fine angle.
snSrc   = $6d                    ; the snapshot copy's source screen page. Zero page: two bytes
                                 ;   shorter per access. (Its destination is per row now: snapLoT/HiT.)
sdx     = $0a
sdy     = $0b
ddx     = $0c
ddy     = $0d
frc     = $7f                   ; castRay: this axis's fraction to its first gridline (frac or 1-frac)
stpX    = $0e
stpY    = $0f
side    = $10
pp      = $11
fr      = $12
qhi     = $16
col     = $17
tmp     = $1f
baseHi  = $22
paF     = $1e                  ; low byte of the 16-bit player angle; pa is the high
; smCnt: named by nothing in this build, so given no RAM (compact.mjs)                  ; SLOWMO: frames left before the auto-mover steps again
                                 ; $8060-$8073 are free: they held the sprite GRID walk and its
                                 ; debug capture, both gone with the six-sprite angel
oqa     = $b6fe                  ; 9-bit angle being folded onto the quarter circle
dtv     = $56
dtm     = $8f9e                  ; elapsed ticks scaled for movement, and for turning
dtt     = $ee
rxF     = $ada0                  ; the sub-quantum remainder of each axis' step, carried to the
ryF     = $ada1                  ;   next frame instead of being truncated away (see moveApply)
lastMv  = $7594
dxs     = $d6
dxsH    = $d5
dys     = $d4
dysH    = $d3
dxSgn   = $acab
dySgn   = $acac
rowv    = $ef                  ; keyboard row 1, held so SHIFT/E/S read it once
dxv     = $23
dyv     = $24
nxL     = $25
nxH     = $26
nyL     = $27
nyH     = $28
iterLo  = $29
iterHi  = $2a
cb      = $31
hh0     = $32
hh1     = $33
hcur    = $37
ddxH    = $40
ddyH    = $41
sdxH    = $42
sdyH    = $43
remL    = $44
remH    = $45
mlo     = $46
mhi     = $47
s1      = $48
s2      = $49
frameCnt = $4a
tmp2    = $58
vsOn    = $f1                 ; VSPLIT: this column is a step column with a stack in progress
vsRow   = $60fe                 ;   the row the FAR wall's top lands in (rbT of the far height)
vsCode  = $60ff                 ;   the pure-split glyph for this column's kpos and side
kpos    = $6c                   ; step path: boundary position, and qB held across the
qbv     = $6b                   ;   middle-column read that needs A and X
spanL   = $60
spanR   = $61
sp      = $62
errv    = $63
syNeg   = $64
joyv    = $67
joyEor  = $68
; The overlay's private scratch block (pdBase/pdTmp/... at $6b-$70) is gone with the
; pixel plotter: the readout now pokes whole char codes, so it holds no renderer state.
kr      = $73                   ; per-row 8*cr-92: turns a height into a cell fill
d018vm  = $74                   ; live video-matrix nibble; the raster IRQ ORs charset bits
ecode   = $1b
                                ;   stub's address is looked up
colc    = $75                   ; cell column, parked while the chains own X
rbv     = $76                   ; first cell row that is not fully ceiling
rsv     = $77                   ; first cell row that is fully wall
erow    = $78                   ; current row inside the edge run
jv      = $79                   ; 2 bytes: chain entry vector, then the edge store pointer
bufOff  = $7d                   ; 0 or 14: selects the chain set for the buffer being drawn
nbnd    = $14                   ; delimiters the search pinned this frame
bcur    = $18                   ; subIns/subEmt: the delimiter being sorted, and its swap
bswp    = $19
bcnt    = $08
cell0   = $13                  ; the player's own cell index, constant for the frame
cell    = $7e                   ; DDA cell index = mapY*16 + mapX, stepped incrementally
uwL     = $20                   ; seam pass scratch: u low byte, then the projective solve
uwH     = $21
sdK     = $92                   ; the seam code's offset from SEAM0, decoded once
sdH     = $91                   ; the wall's height AT the seam's own column
sdCol   = $8f                   ; seamDrw: the seam's own pixel column, the window minimum
sdMin   = $9e                   ;   around it, and the row the SEAM (not the wall) starts on
sdSRow  = $9f
cuQL    = $8d                   ; calcU's fine angle: its low byte, its quadrant, and which of
cuQH    = $8e                   ;   px/py it reads. Shares the seam scratch below -- calcU runs at
cuP     = $8f                   ;   span setup, before the walk.
ssCol   = $8d                   ; seamOne's distance test: the seam's column and cell, the cell
ssCell  = $8e                   ;   being scanned, how many are left, and a scratch. All of it is
ssScan  = $8f                   ;   seam-pass zp the projective solve has finished with by here.
ssCnt3  = $9e
ssTmp   = $91
ssFH    = $91                   ; SHARES ssTmp: the unrounded column, live only from the multiply
                                ;   to the band test. ssTmp's own user is the distance scan, which
                                ;   has not started yet -- same reuse the block above documents.
sdPtr   = $87                   ; seamDrw: 2 bytes. Shares skL/skH deliberately -- seamSpan has
sdCode  = $8d                   ;   finished for the frame by the time renderSym runs, so all of
sdRow   = $8e                   ;   this scratch is dead. sdCode/sdRow share saL/saH likewise.
skL     = $87                   ; --- seam pass scratch, all dead outside seamSpan ---
skH     = $88                   ; the seam's world coordinate k, as 8.8
uaL     = $89                   ; u at spanL / spanR
uaH     = $8a
ubL     = $8b
ubH     = $8c
saL     = $8d                   ; |u_L - k| and |u_R - k|, squeezed to 8 bits
saH     = $8e
sbL     = $8f
sbH     = $9e                   ; NOT $90/$93, which the KERNAL uses for STATUS and VERCK. The
sPlo    = $91                   ;   game banks the ROM out, but a level LOAD banks it back in and
sPhi    = $92                   ;   those two are the only places the seam solver overlapped its
sSlo    = $9f                   ;   workspace. Everything else LOAD needs ($ac-$c4) was already free.
sShi    = $94
ssK     = $95                   ; current boundary coordinate, and how many are left
ssN     = $96
ssW     = $97                   ; span width in columns
ssCut   = $bcfb                 ; the column where the wall crosses the height a line needs,
ssCutD  = $bcfc                 ;   and which side of it is too short ($00 = to the right)
ssHL    = $f2                 ; the two end heights, while that is being worked out
ssHR    = $b8fb
ssPU    = $b8fc                 ; SEAMPW: the player's position on THIS face's running axis, the
ssPUL   = $b8fd                 ;   two bytes of it, worked out once per span
ssKLo   = $b8fe                 ;   ...and the FIRST and LAST cell boundary worth a line, so the
ssKHi   = $b8ff                 ;   per-boundary test is two compares (see ssPwS)
shD     = $7b                 ;   dp while it is being formed, then dp in quarter cells
smLo    = $d7                 ;   s_max scaled to 8.8 while the range is formed
smHi    = $963b
ssDir   = $963c                 ; which way the boundary walk steps: 0 = up, 1 = down
; ---- SEAMHYST: last frame's panel columns, and this frame's being collected ----
; Two arrays and not one: a line placed earlier in THIS frame must not become a band centre for a
; later one. Only panel lines go in. Corner marks are pinned to a cast column and were already
; steady, and the four-column rule keeps a panel far enough from one that it could never match.
; No seam identity is needed or wanted here -- run ids renumber every frame -- so the match is
; pure proximity, which is exactly what the band means.
; (Hand-placed in a gap below the old holeSeeT before compaction; it rehomes them like every RAM equate.)
sHyP    = $963d                 ; 12 columns
sHyC    = $9649                 ; 12 columns
sHyPN   = $9655
sHyN    = $9656
mp      = $98                   ; mul8 operands / product
mq      = $99
plo     = $9a
phi     = $9b
cx0     = $82                   ; collision box corners, in map cells
cx1     = $83
cy0     = $84
cy1     = $85
; $0400-$04e0 was where the old self-extracting decoder ran. The loader is a separate file now, so these two
; hold decoder bytes rather than KERNAL screen data at the moment the game starts. That is safe, and
; deadvars is what makes it safe rather than an argument: it reports 0 variables read before being
; written, so nothing here is ever consumed before the subdivision pushes to it. If that check ever
; comes back non-zero for a $04xx array, this is the first thing to suspect.
; ---- ORBHI_N=12 only: KRILL'S RESIDENT KEPT AT $0400 FOR GOOD ----
; Declared so the region is RESERVED rather than merely unused -- which is the whole history of
; low RAM in this build: $0200-$03ff was never reserved, only never counted, and things drifted
; into it. In the default build (ORBHI_N=0) the renderer's scratch has $0400 instead, and the
; resident (251 bytes now, $0400-$04fa; once 556, to $062c) is parked at krillRt by klPark and
; copied back for each level load -- see KRILL_RT_AT.
; (ORBHI_N=0: the scratch is back in low RAM and there is no room for one)
; ---- ORBHI_N=12: FOUR OF THE FIVE MOVED OUT OF $04xx-$06xx ----
; (With ORBHI_N=0, the default, they stay in low RAM: SCRATCH_AT.) Under ORBHI_N=12 Krill's
; resident keeps $0400, so these four go to the slots the tail of the orb ladder vacates, and
; the ladder goes under the I/O hole.
; IT COSTS NOTHING. These are NOT in zero page and never were -- $04xx is ordinary absolute
; memory, and for an indexed array zero page is not even faster: lda zp,x and lda abs,x are both
; 4 cycles, and only a STORE saves one. What the old addresses actually bought was PAGE
; ALIGNMENT, so a column index never needs a 16-bit add, and the new ones are aligned the same
; way -- including stackRT's half-page offset. Same addressing modes, same cycle counts.
; colH stays: it has 42 of the 65 accesses between the five, and it sits above the resident.
sideT   = $0500
idT     = $0600
stackLT = $0400
stackRT = $0480
; per-logical-column arrays, now 160 entries each (was 80). Page-aligned so a column
; index never needs a 16-bit add.
colH    = $fe00                 ; SHYCOL: the page with H+1 = $ff (see ispanSto)
; ---- the per-frame arrays ----
; Their addresses are placeholders: compact.mjs rehomes them (see the note above bfsLast). They once
; lived at $2400-$27ff and then in the charset source at $3000-$37ff, moved twice so as not to cap the
; code's growth room in the hand layout. Page-aligned where a full byte indexes them.
cwA     = $6100                 ; per cell-column: the ceiling run length this buffer holds
cwB     = $6128
cbA     = $6150                 ; ... and the solid run start, or $ff for "always redraw"
cbB     = $6178
faceIdT = $6300                 ; page-aligned: a column index must never need a 16-bit add
cstepT  = $61a0                 ; per cell-column (40): face-boundary column, 0 = none
bidx    = $15                  ; PLAN=2: the bucket index the code came from, and which
; thsel: named by nothing in this build, so given no RAM (compact.mjs)                 ; threshold table to read it out of (0 = ramp, 1..3 = step k)
paqL    = $6e                 ; FINEANG: pa*4 as a 10-bit value, formed ONCE a frame
paqH    = $81
rqL     = $b9ff                 ; and this ray's 10-bit angle: rqL is the table index,
rqH     = $baff                 ; rqH (0..3) picks which quarter of the 1024-entry table.
                                ; It was declared TWICE, at $cbf9 and here; the assembler takes
                                ; the last, so $cbf9 was never the live one. Removed rather
                                ; than left as a trap for the next reader.
; cqtmp: named by nothing in this build, so given no RAM (compact.mjs)                 ; the colour this cell needs, while both its rows are queued
cmtmp   = $86                   ; PLAN=3: calcM scratch, and the m it returns. m = w1 + w2 is
cmv     = $b0                   ; the ninth index bit -- the two columns the bucket throws away

; bfsLast and mulWY are zero-page scalars. The page arithmetic that once placed them and their
; neighbours here -- page $7c00's tail, $7ce8/$7d00, $6300/$6400, chosen from the PACKPROBE hole maps
; of the RESIDENT and LATE chain shapes -- went with the hand layout: compact.mjs rehomes every RAM
; equate in the image range (the 4-digit addresses in this block are placeholders it replaces).
bfsLast = $59                   ; frameCnt when the fill last ran; see bfsExp
mulWY   = $5a                   ; mulW saves Y here


; fallMk: named by nothing in this build, so given no RAM (compact.mjs)                 ; FALLMARK=undefined: how far the fall's level change got

seamT   = $61c8                 ; per cell-column (40): char code for the solid run --
                                ;   SOLID, or a seam variant when a panel line lands here
; ---- PIVOT state: last frame's boundaries, and the viewpoint they were seen from ----
; Three $40-byte arrays in the page splitT used to hold. Read ENTIRELY by pivPrep at the
; top of the frame and only written afterwards, as the search pins this frame's boundaries --
; so one buffer is enough and no copy is needed.
; These sat in a HOLE in the emitted image (RELOC+0x2700, a page the fixed table map happened to
; skip), which is why all three needed image-vs-equate allowlist entries. A hole is a terrible
; place for RAM: it is only free because of where its neighbours' page counts happen to land, so
; any table gaining a page silently overwrites the pivot state. They now live in the reclaimed
; charset-B source, which is free by construction after cpChr rather than by coincidence.
pvBnd   = $033c                 ; the column the boundary was pinned at
pvAng   = $037c                 ; its WORLD bearing as a byte angle, pa + rayOffT[col]
pvRcp   = $03bc                 ; 163/distance, for the translation term
pvN     = $aca0                 ; how many of them there are; 0 disables the hint for a frame
opaL    = $aca1                 ; the 16-bit angle those bearings were taken at
opaH    = $aca2
opxL    = $aca3                 ; ... and the position, so the translation term has a delta
opxH    = $aca4
opyL    = $aca5
opyH    = $aca6
dqa     = $aca7                 ; this frame's rotation, quarter-units, signed
pvDX    = $aca8                 ; this frame's translation, 1/256 cells, signed bytes.
pvDY    = $aca9                 ;   NOT dxv/dyv -- interpSpan already owns those as its
                                ;   Bresenham span width and error step.
pvI     = $acaa                 ; index while walking the hints, and the last cut emitted
pvLast  = $f0
pvTL    = $1a                 ; the signed 16-bit term, and the top two bytes of the
pvTH    = $09                 ;   24-bit product it feeds
pvPH    = $cb
pvPB    = $ca
pvSgn   = $ab27                 ; sign of the term, carried around the unsigned multiply
pvI2    = $ab28                 ; the hint index, saved across mul8 (which needs X)
pvMode  = $62ff                 ; 0 = predict in full, 1 = turned in place (the translation
                                ;   term is identically zero), 2 = nothing moved at all.
                                ; NOT beside pvYs: $cb13-$cb29 were claimed by the RAYCNT
                                ; and (since removed) palette-key blocks below, separate build
                                ; flags -- a PIVOT variable landing in that range collides
                                ; only in the diagnostic builds, i.e. silently.
colW    = $b5fd                 ; the three ink colours, one register each: init loads
colB    = $b5fe                 ;   $d021/$d022/$d023 from these. (The 1/2/3 and Q/W keys that
colS    = $b5ff                 ;   cycled them were a development tool, removed 2026-10-10.)
; ---- orb scratch ----
; The absolute half was at $cbxx, which the bank-3 move turned into graphics-only space. It is
; now the LAST FREE PAGE of the array hole ($8500-$85ef) -- one page, every relative offset
; preserved. The zero-page half is seamSpan's scratch, dead by the time orbMove runs. NOTE
; mul8's own mp/mq/plo/phi sit at $98-$9b: ivH/ohgt/ocptr are deliberately ABOVE them and
; o0-o2/ivL below, because relaxing that once put ivH on mp and every jsr mul8 ate its own
; inputs -- the orb simply vanished.
oaL     = $87
oaH     = $88
oaS     = $89
orL     = $8c
orH     = $8d
o0      = $94
o1      = $95
o2      = $96
ivL     = $97
ivH     = $9c                    ; $98-$9b is mul8's mp/mq/plo/phi -- step over it
ohgt    = $9d
cnB     = $aa                    ; ENTCONE: the cell delta's bearing, as the quadrant is applied
cnT     = $ab                    ;   ...then its distance's tolerance, then twice it. ZERO PAGE
                                 ;   because this is the hottest test in the entity pass -- it runs
                                 ;   for every entity every frame, where oax/oay below are only
                                 ;   reached by the ones it lets through.
cnI     = $ad                    ; CONEGATE: entGate's entity index, its end, whether ANY
cnEnd   = $ae                    ;   entity passed, and which bit of the LOS row the player's cell
cnAny   = $af                    ;   is. All four die with the gate; none outlives a frame.

ocos    = $bdf4
ocosS   = $93
osin    = $de
osinS   = $ac
fwdL    = $c2
fwdH    = $c1
rgtL    = $dd
rgtH    = $dc
ogL     = $34
ogH     = $53
oe      = $bdf5
o3      = $3f
ocoff   = $ce
ovar    = $52
ocol    = $30
ocl     = $8f99
ocr     = $8f9a
oidx    = $07
onv     = $2f
ohtmp   = $bcff
mvTc    = $b3                   ; mvMine: the corner cell it is asked about
mvTr    = $b4
hbL     = $b1                   ; holeTail -> holeSlot: this hole-like's INK box, as screen columns (0..159),
hbR     = $b2                   ;   so each slice's stamp can be clipped to where something is drawn
carry   = $35                  ; 0 = empty hands, else the held entity's index + 1
fcCell  = $b9fc                  ; the cell directly in front of the player, and its parts
fcX     = $b9fd
fcY     = $b9fe
okStr   = $e8                  ; FIRESTRAFE: this press has strafed, so letting it go does nothing
okOld   = $baf9                  ; SPACE or FIRE was down last frame
okJoy   = $bafa                  ; how many slots this rung of the hole wants
onvH    = $5e                  ; the HOLE allocates downward from 8: it is flat on the floor,
omEn    = $62f0
omXX    = $62f1
omYY    = $62f2
omPri   = $62f3
omX8    = $62f4
omBit   = $62f5
marked  = $5d                  ; 0, or the index+1 of the angel that stepped up beside you
dieSt   = $51                  ; 0 alive, 1 the room going out, 2 a picture up, 3 held on black
dieRem  = $bdf8                  ; 1 while the turn is still under way, 0 once it has landed
dieSgn  = $919a                  ; oaS at the last projection: which side of centre
dieLk   = $9199                  ; consecutive frames the angel has read as centred
dieIdx  = $9198                  ; the entity the death sweep is steering onto
dieTgF  = $50                  ; the turn's target heading, 16-bit like pa:paF (dieAim, refined
dieTg   = $55                  ;   by the projection once the angel is near the middle)
dvQ0    = $1d                  ; udiv: 24-bit dividend in, quotient out
dvQ1    = $1c
dvQ2    = $36
dvD     = $54                  ; udiv: the divisor
dmS     = $4d                  ; dieAim/dieFade: signs and the octant swap
dmT     = $72                  ; scratch
dmU     = $965f
plLX    = $b6fc                  ; the last cell you stood on that was not a hole (fallChk; idolStay)
plLY    = $b6fd
lkArm   = $919b                  ; lvKey: nonzero once 'L' has been seen UP -- one drop per press (LVSKIP)
dieArr  = $ed                  ; this death's turn and glide, in 60ths: one of DIE_ARRS
dieQ    = $b6fb                  ; ...and which (0 front, 1 side, 2 back), times 24: dsPlan's row
; dieCy: named by nothing in this build, so given no RAM (compact.mjs)                  ; ($8060-$8073 came free with the six-sprite angel; $8066-$8068 went to
                                 ;   lkArm, markC and mvBmp, 2026-11-13, which had been sitting on oqa/dvQ0/dvQ1)
dieOff  = $bdf9                  ; the angel's column offset from centre, from the projection
dieT0   = $f6                  ; frameCnt when they died: everything is measured from here
dieTck  = $d9                  ; the last palette tick written, so a fill happens once
dkArm   = $bdfa                  ; the held black: 0 until fire has been seen UP, then fire restarts
dieLat  = $bcf4                  ; dieSt, LATCHED at raster 250. sprPal runs in the IRQ and read
                                 ;   dieSt direct, so the frame dieGo set it the shared sprite
                                 ;   inks changed WITHIN that frame -- while obC goes out through
                                 ;   osFlush at raster 250 and lands the frame after. One frame
                                 ;   apart, every time. Same trick as idolOn/idolWk, and for the
                                 ;   same reason: what the IRQ reads sixty times a second must
                                 ;   not change under it halfway down the screen.
dieInk  = $bcf3                  ; the orb's body colour, walked down to black with the room
ovProbe = $cd                  ; the span walk is counting columns, not allocating a sprite
ovVis   = $da                  ; columns of the entity a span SHOWS
ovOcc   = $b5f3                  ;   ... and columns a span HIDES
ovSpR   = $b5f5                  ; the span's right edge, kept for the overlap width
ovTmp   = $b5f6
ovSvS   = $b5f7                  ; orbSeenT saved across a probe -- orbNo writes it
markPa  = $b5f4                  ; heading when the angel cornered you: the turn trigger's origin

omMc    = $bafd
amIdx   = $c0                    ; angel movement scratch: entity, chosen step, target cell.
amTX    = $c3                    ;   ZERO PAGE for SIZE, like fkV: ~40 operands one byte shorter is
amTY    = $c4                    ;   what paid for the adjacent-mark rule (anAdj) in a full image.
amCell  = $c5                    ;   Only live inside angStep/slTick/dieChk, never across a level
                                 ;   load (Krill is $e0-$e6; the KERNAL's LOAD use of $90-$fa is
                                 ;   boot-time only). $c1/$c2 were amDX/amDY, now gone.
amX     = $c6
amY     = $c7

odBest  = $fb                  ; the drop/take chooser: best |columns from centre| so far,
odCell  = $90                  ;   what won ($ff = nothing in reach), and the loop counter
odX     = $bafb
odY     = $bafc
odD     = $df
apC     = $b5f8                  ; anPath: the angel's cell, and the distance it is looking for
apD     = $b5f9
bfsPhase = $70                 ; the incremental distance fill: 0 idle, 1 clearing, 2 expanding
bfsCl   = $b7fb                  ;   clear cursor, the cell each map is FOR, the queue ends,
bfsFor  = $b7fc                  ;   the cell being expanded and its distance+1, and the
bfsDone = $b7fd                  ;   per-frame expansion counter
bfsWant = $b7fe
bfsHead = $b7ff
bfsTail = $f5
bfsC    = $b5fa
bfsND   = $b5fb
bfsN    = $b5fc
hlFill  = $bcf7                  ; the fill ink of the hole-like entity being projected
hlKind  = $bcf8                  ; which ladder holeTail is currently patched for
hoI     = $d8                  ; holeOne's loop: which hole-like entity
ooCX    = $8f98                  ; occBy: the cell the entity is being tested from
ooCY    = $8f9d                  ; buffered $d01c. STALE: the held object was a hi-res icon once;
                                 ;   it is the full multicolor sprite now, so this is $ff always
                                 ;   and the held object shares $d025/$d026 like everything else
; (The fall's two 1000-byte SCREEN SNAPSHOTS were runtime-only, and before they were named here
; the hole report handed them out twice -- the drop came up as a screenful of garbage. Today the
; arriving room's snapshot is SNAP_ROWS rows in buffers dead at the time: see SNAP_HOSTS.)
; ---- $6c00-$6fff: the four CPU pages, back in the image where they belong ----
; All four were exiled into VIC bank 3 for ONE reason, each comment saying so in its own words:
; the image had no free PAGE. Deleting fRowT (40 blocks x 32 bytes, all of it derivable) made
; that false -- it left exactly four contiguous page-aligned pages here. Bringing them home
; costs nothing in file bytes (the assembler pads holes either way) and buys 1,024 bytes of
; bank 3, which is the scarce resource: it is what lets a FOURTH level be resident, and it
; finally makes bank 3 graphics-only, which the build has been nagging about.
runPFT  = $6440                 ; per run id, ONE byte: the wall's plane (bits 0-4), the axis it is
                                 ;   across (bit 6, 1 = y: an N/S face) and which side is visible
                                 ;   (bit 7: 1 = E/S). Derived by mkRuns at boot and after every
                                 ;   level change. It was TWO tables, runPlaneT and runFaceT, a byte
                                 ;   each per id; packed (2026-11-11) so the breakable walls of the
                                 ;   user's pillar halls could have 128 ids. Compaction places it.
obKT    = $5b                   ; obOrder: the smallest key so far, its entity, and the keys
obKI    = $5c  
obKeyT  = $62c7                 ;   (NORB bytes, at most 8: the sprite budget bounds the cast)
obLT    = $62d1                 ; obOrder: the survivors, nearest first (NORB bytes), placed by compaction
obLN    = $62db                 ;   ...and how many
arcMap  = $6200                  ; the fall's arc map (CELLCODES bytes, built by arcBld): placed by compaction
bfsQ    = $6000                  ; the angel fill's queue: one byte per open cell, so up to 254.
                                 ;   Pure scratch, nothing swaps it. Exiled to bank 3 when level
                                 ;   3's 196 open cells outgrew its old spot (2026-09-18) and no
                                 ;   image hole held a page; back in the image since fRowT left.
fallTailB = $0200               ; FALLTAIL: the source rows BELOW the screen, 7 x 40.
                                 ;   In LOW RAM (see LOWBOOT): the KERNAL's input buffer and file
                                 ;   tables, dead from the moment the last file has loaded, and
                                 ;   this is not written until the first fall. It was in bank 3
                                 ;   behind the pivot scratch, where it was half of what capped
                                 ;   the level shadow at $fe00 and held the chain to three levels.
                                 ;   A RAM buffer, not loaded data, so it costs no file bytes
                                 ;   and needs no loader entry.
                                 ;   (The old note, still true of where it came from: CPU-
                                 ;   addressable because the port is $35 all through play --
                                 ;   to hold the real NMI/RESET/IRQ vectors.

fdS     = $2b                    ; fallDraw's source and destination row pointers. Zero page
fdD     = $2d                    ;   because the copy is (zp),y -- the DATA can live anywhere
fallSt  = $4c                  ; 0 normal, 1 dropping, 2 render the new view, 3 landing.
                                 ; CLEARED AT ENTRY -- see fsZero. It used to be initialised by
                                 ; nothing at all, which was free only while it sat in a page that
                                 ; happened to come up zero. The relayout rehomed it ($5aff in the
                                 ; shipping build) and the main loop's first "lda fallSt / beq" then
                                 ; read whatever the decruncher left: non-zero means the FIRST frame
                                 ; of the game calls fallStep, which animates a drop out of
                                 ; uninitialised snapshot buffers. The user saw it as "the benchmark
                                 ; sometimes starts with a corrupt looking hole fall", and
                                 ; "sometimes" is the tell -- which byte lands there depends on the
                                 ; build, so it comes and goes with unrelated flags.
                                 ; EXACTLY the pfN bug (see pfInit), second instance. The rule it
                                 ; teaches: a variable's initialisation is not free because its page
                                 ; is zero today, and a layout tool is allowed to move it.
fdN     = $bcfd
ohP     = $62f6                  ; hole scratch: the left half's sprite pointer, the hires-pixel
ohT     = $bafe
ohWc    = $bdf6                  ; how many COLUMNS one sprite of this rung covers, 12 or 24
ohBL    = $db                  ; this slice's column + 12, signed and 16-bit: it runs to
ohBH    = $e7                  ;   249, so bit 7 of the low byte cannot carry the sign
arcA    = $ec                  ; the rim's amplitude this frame, 88s/r -- the whole animation
arcHi   = $5f                  ; the LOWEST rim row over all 40 columns: whole rows below it are
                                 ;   solid hole and fill fast, so only the thin band above it
                                 ;   needs per-column work
fdCol   = $baf3                  ; what fdFill lays down: floor or hole
arcNg   = $baf4                  ; $ff once the eye is BELOW floor level and the arc inverts
fFrm    = $71                  ; which frame of the drop: the index into fRowT. ABOVE arcR's
fwRow   = $bdf3                  ;   40 bytes -- $81cd is pd11, which the overlap check caught
fwN     = $c8
arcY    = $80                  ; the crown's pixel row this frame
apPrev  = $9658                  ; arcBand: the boundary pixel row at this cell's left edge,
apCur   = $9659                  ;   and at its right -- carried over so 41 edges cost 41
apRow   = $965a                  ;   multiplies, not 80. Then the cell row, 8*row+8, the
apBase  = $965b                  ;   half-built rampThi index, the glyph, and the saved
apIdx   = $965c                  ;   edge counter while Y addresses the screen.
apCode  = $965d
apY     = $965e
apT     = $ea                  ; arcLvl's argument
phA     = $baf5                  ; the arc's row LAST time each buffer was drawn. The region below
phB     = $baf6                  ;   it is already solid, so only the newly covered rows need
                                 ;   painting -- and PER BUFFER, because each one is two animation
                                 ;   frames stale.
arcBlw  = $bcfe                  ; what fills BELOW the rim this phase
arcInv  = $4f                  ; 0 on the drop, $ff on the landing: the colours swap
pd11    = $eb                  ; PENDING $d011 and split line, published at the buffer flip.
pSplit  = $c9
anKx    = $b9f9                  ; the reach test's dx+1 and dy+1, kept so the DIAGONAL case
anKy    = $b9fa                  ;   can be told from the orthogonal one
markSaw = $b9fb                  ; was the angel being WATCHED when it reached you? Then there is
                                 ;   no "look away and back" left to wait for -- see dieChk.
markC   = $919c                  ; the marking angel's cell (y*MAPW+x), for mvFree to recognise
mvBmp   = $919d                  ; non-zero once a move was refused by THAT cell -- see dcTurn
idolHd  = $d2                  ; 1 while the IDOL is the thing in your hands. The angel
                                 ;   step reads it: carrying it, being looked at no longer stops
                                 ;   them. That is the whole cost of the thing.
pSplit2 = $e9                  ; the arc's split: charset A again from the rim down
pCh0    = $ff                  ; which charset each of the three regions uses. The DROP wants
pCh1    = $fe                  ;   A,B,A -- scene above the horizon, mirrored scene below it,
arcSkip = $baf7                  ; the landing places its own splits
arcIx   = $baf8                  ; which arc frame to draw -- not always fFrm, see the overlap
; ($81eb-$81ec: rsHi/rsLo, renderSym's column range, went 2026-11-14 -- always 39..0 now)
otmp    = $fc
                                 ; ($81e6-$81ea held the sliced background render's state,
                                 ; bgOn/bgN/bgMore/bgCol/bgPh; never emitted once the drop rendered
                                 ; in the black middle, and removed 2026-11-14.) renderSym cannot target fallBuf2 -- its
                                 ; fill chains bake the screen address in -- so fallMid renders
                                 ; into the back buffer and bgCopy copies it out.
pCh2    = $fd                  ;   then A for the rim. The LANDING wants B,A,B: its rim is at
                                 ;   the TOP in the mirrored polarity, then the new room's ceiling
                                 ;   half, then its floor half. Same three-stage chain either way.
                                 ;   The fine scroll belongs to the content it shifts, and that
                                 ;   content is in the BACK buffer -- writing the register inside
                                 ;   fallStep showed the new scroll against the OLD frame for one
                                 ;   60Hz frame, and since the scroll is (3-pos)&7 it steps
                                 ;   BACKWARDS every time pos crosses a character. Measured on a
                                 ;   frame-by-frame recording as +1, -4, +8/+5, -1, +2, +24 ...
                                 ;   Same lesson as omEn: when the value is double buffered, the
                                 ;   register is the wrong lever. See [[iray-fall]].
fT0     = $9657                  ; frameCnt at the last flip: the fall's constant-rate reference
hlv     = $bdf7                  ; which hole is live (hlvOf, its x32 line-of-sight offset, had no
                                 ;   reader left and was deleted 2026-10-10)
ohF     = $8f9b                  ; the rung's flag byte: bit 0 hmag, bit 1 two sprites, bit 2 vmag
pcell   = $8f9c                  ; the cell the player stands in, for the hole's LOS gate
odb     = $62f7                  ; DBGORB scratch: six bytes shown as hex on screen row 3
obX     = $ab07
obY     = $ab0f
obP     = $ab17
obC     = $ab1f                  ; per-sprite state, flushed to the VIC in the border
ofx     = $b9f3
ofy     = $b9f4
kxc     = $b9f5
kxs     = $b9f6
kyc     = $b9f7
kys     = $b9f8
kfL     = $fa
kfH     = $f9
krL     = $f8
krH     = $f7
oix     = $d0   ; GATEFAST: zero page -- the gate's inlined cone and orbProj both hit these
oiy     = $d1
oax     = $62dc
oay     = $62dd
oixS    = $62de
oiyS    = $62df
ocl2    = $66                 ; the bounding box in COLUMNS, not cells
ocmax   = $65
obCL    = $61f0                 ; per sprite slot: the orb's cell range, for oSDeseam
obCR    = $61f8
obIX    = $b6f3
obV     = $b7f3                 ; size variant per slot, so orbSeam can find the sprite's
obOcc   = $b8f3                 ; per HOLE-LIKE slot: bit 7 = stamp it, else the fill colour
obL     = $62e0                 ; per slot: the orb's TIGHT column range, which the cell range
obR     = $62e8                 ;   cannot give -- a cell is 4 columns and a box starts inside one
osI     = $3e                 ; occStamp: slot being stamped, and how many there are
osN     = $f3
osL     = $6f                 ; the span/box intersection being stamped
osR     = $69
osRow   = $bcf9                 ; char row range
osRowB  = $bcfa
ohFst   = $bcf5                 ; the stamp's two edge glyphs, chosen once per span
ohLst   = $bcf6
ohFstW  = $62f8                 ; the same two edge glyphs backed by white
ohLstW  = $62f9
ohFstM  = $62fa                 ; the columns each split leaves UNCOVERED, as a cellFillT mask:
ohLstM  = $62fb                 ;   what the cell shows outside the stamp, which picks the backing
ohMsk   = $62fc                 ; oSBack scratch: the mask under test, and the saved X
osSrc   = $a0                   ; OCCSYN: source glyph pointer (2). The destinations are patched
                                ;   into oSPut's own stores (oSPa/oSPb), not held here.
osCov   = $a2                   ;   the covered-column pair mask
osTmp   = $a3                   ;   the code being built, and a byte temp (2)
osGly   = $a5                   ;   the fallback split glyphs, black- and white-backed
osGlyW  = $a6
osSyn   = $a7                   ;   the next scratch glyph, and the first one past this buffer's half
osLim   = $a8
osPY    = $a9                   ;   Y saved across the row loop
osLast  = $cf                   ;   1 on the BOTTOM row of the stamp, 0 above it. The only row
                                ;   where a cell can run past the wall's base, so the only row
                                ;   synthesis is allowed to consider -- see OCCSYNTH.
ohMsX   = $62fd
o2r     = $62fe                 ; the ball's RIGHT extent from ocol; o2 is now the LEFT one.
                                ;   Not zero page: it is touched a handful of times per orb, in
                                ;   the projection, never in a per-column loop.
osDC    = $bdfb                 ; occStamp: the de-seam's current cell column
; oSCnt: named by nothing in this build, so given no RAM (compact.mjs)                 ; DBGORB: cells stamped this frame, orbs that entered the walk,
; oSOrb: named by nothing in this build, so given no RAM (compact.mjs)                 ;   and spans visited -- the three numbers the cost is made of
; oSSpn: named by nothing in this build, so given no RAM (compact.mjs)
; oSHbase: named by nothing in this build, so given no RAM (compact.mjs)                 ; OCCFBN: baseHi as occStamp saw it, latched
; oSHist: named by nothing in this build, so given no RAM (compact.mjs)                 ; OCCFBN: oSPut's branch histogram, 6 bytes, FREE-RUNNING.
                                ;   NOT in the $8500 page: that is the orb scratch page and it is
                                ;   densely occupied, $8580 included -- and a 6-byte array declared
                                ;   as ONE equate is only guarded for its first byte, so the
                                ;   overlap check said nothing and all six read zero for ever. -- asked / BLANK /
                                ;   readout / already-stamped / pre-built split / synthesised.
                                ;   "Which branch does the cell that goes unstamped take" is not a
                                ;   question to answer by reading the dispatch.
; oSDbg: named by nothing in this build, so given no RAM (compact.mjs)                 ; OCCFBN: 4 bytes. [0] occStamp entries, [2] renderCnt bumps as
                                ;   the REFERENCE. PAST oSHist's eight, not on top of them: both
                                ;   live under the same flag, so sharing $70e8 would have had
                                ;   oSDbg+0 and oSHist+0 counting into one byte. Declared here AND
                                ;   sized in OCC_BUFS -- an equate with no size is reserved for
                                ;   one byte, which is how an 8-byte array ended up reading other
                                ;   variables twice.
; oSFbN: named by nothing in this build, so given no RAM (compact.mjs)                 ; OCCFBN: edge cells THIS FRAME that wanted a synthesised glyph
                                ;   and could not get one -- the scratch codes ran out and oSPfb
                                ;   stamped the old whole-column block instead. Per frame, zeroed
                                ;   by occStamp, so a static pose reads the steady-state count.
ohSv    = $57                 ; span right edge / row counter, reused
arcTopR = $3c                   ; region 3's first character row, and the same clamped into the
arcTopC = $3d                   ;   fill band -- zero page, which is what makes fdSpl fit
fdA     = $38                   ; fdGlyph's source/destination pointers. Zero page because
fdB     = $3a                   ;   the glyph walk is (zp),y -- there is no absolute form of it.
osPtr   = $9e                   ; SHARES ocptr: the candidate walk is finished by the time
                                ;   occStamp runs, so its pointer is free
ohRun   = $f4                 ; the run id, held across the mask-byte lookup
ohL     = $6a                 ; the span being tested: its left column, and the index into bndT
ohBX    = $4e
ocolN   = $cc                 ; centre column went left of 0: ocol holds the magnitude

bndT    = $64c0                 ; columns where a face or saturation state begins ($40 max)
                                ; MOVED OFF $7f00 (2026-09-26). It is 64 bytes and it was
                                ;   holding a page down on its own -- the best ratio in the
                                ;   build -- while the 192 above it sat free. Emptying it
                                ;   gives seamEdge a whole page to be placed in, which is
                                ;   what it needs to stop growing into the code headroom.
                                ;   64 entries from $9180 end at $91bf: no page crossed, so
                                ;   the indexed reads cost exactly what they did.
remLoT  = $63a0                 ; per marched column: castRay's raw hit distance, 8.8 cells.
remHiT  = $74d9                 ;   Parked so u can be derived later, only where it is needed.

        * = $0801
                                ; (no BASIC header: the boot loader jumps to entry, and compaction
                                ;   moved this origin off $0801 long ago, so SYS 2061 was wrong anyway)
entry:
        sei
        lda #$35                ; processor-port mode 5: RAM at $a000-$bfff, I/O at $d000-$dfff,
        sta $01                 ; RAM at $e000-$ffff. BASIC and KERNAL both out, I/O still there.
                                ;
                                ; $34 IS THE TRAP AND IT LOOKS RIGHT. Mode 4 (LORAM=0, HIRAM=0,
                                ; CHAREN=1) is RAM EVERYWHERE -- $d000-$dfff included -- because
                                ; the PLA only maps I/O when LORAM or HIRAM is set; CHAREN alone
                                ; does not do it. Every $d0xx store then lands in RAM, the VIC
                                ; never sees a register write, and the six views came back
                                ; 38-60% wrong. Mode 5 keeps LORAM=1, which costs nothing here:
                                ; BASIC needs HIRAM too, so $a000 is RAM either way.
                                ;
                                ; BASIC had to go because the relocated tables grew past $a000
                                ; and were silently reading ROM -- step patterns came back as
                                ; BASIC bytes, so corners picked nonsense and flickered.
                                ;
                                ; The KERNAL goes for 8KB of table space at $e000-$ffff, which
                                ; is the only sizeable block left and is invisible to the VIC
                                ; (it lies in VIC bank 3; we render from bank 0), so it cannot
                                ; eat the sprite headroom in bank 0. Nothing calls a KERNAL
                                ; entry point after startup -- the autostart loader is done by
                                ; the time this runs, and mloop never returns to BASIC.
                                ;
                                ; THE PRICE IS THE VECTORS. With the ROM gone the CPU fetches
                                ; $fffa/$fffe out of RAM, so this must install them itself --
                                ; see below. Writes always land in RAM on a 6510, so the order
                                ; of the banking and the vector stores does not matter.
        jsr klPark              ; park the LIVE loader before the renderer writes over it
        ; ---- copy both charsets into the RAM under the I/O hole ----
        ; This CANNOT be done by the loader: LOAD runs with I/O mapped, so it would write VIC and
        ; CIA registers rather than memory (the build refuses an image past $c000 for the same
        ; reason). Charset A is therefore not loaded at all in the usual sense: the self-extracting
        ; loader lands it at $c000. All that is left to do here is build the mirror, charset B,
        ; from the copy already in place.
        ;
        ; NO PORT DANCE ANY MORE (2026-09-16). The charsets sat under the I/O hole and this block
        ; ran with the port at $34 -- RAM everywhere, VIC registers unmapped -- with a long note
        ; about why the colour-RAM fill above and this copy could not be reordered (two memories
        ; at one address). They are at $c000/$c800 now, plain RAM in the engine's own mode $35,
        ; so this is a copy loop and nothing else. The hole ladder took the spot under the hole,
        ; being the one thing in bank 3 the CPU never reads or writes.
        ; Charset B is DERIVED here, not loaded. It is charset A with every glyph's eight rows
        ; reversed, and for a byte at index x within a glyph the mirrored row is simply x EOR 7:
        ; 7-n == n EOR 7 for n in 0..7, and the EOR leaves the glyph's base address alone. Each
        ; page is a whole number of glyphs (256 = 32 x 8), so the mirrored index never leaves the
        ; page either, and the same ",y" offset works for all eight.
        ;
        ; So the file carries ONE non-mirrored charset and nothing else: 2KB, compressed, placed
        ; directly in bank 3. The mirror costs about 20,000 cycles once at startup, against 2KB of
        ; the load -- and against the ordering invariant and the copy loop that used to be needed.
        ldx #$00
cpChr:  txa
        eor #$07
        tay                     ; y now indexes the MIRRORED row of the same glyph as x
                                ; -- and the SOURCE is charset A itself, already in place at $d000.
                                ; Readable only because the port is $34: in $35 these loads would
                                ; return VIC and CIA register values, not glyphs.
        lda charset,y
        sta charsetB,x
        lda charset+256,y
        sta charsetB+256,x
        lda charset+512,y
        sta charsetB+512,x
        lda charset+768,y
        sta charsetB+768,x
        lda charset+1024,y
        sta charsetB+1024,x
        lda charset+1280,y
        sta charsetB+1280,x
        lda charset+1536,y
        sta charsetB+1536,x
        lda charset+1792,y
        sta charsetB+1792,x
        inx
        bne cpChr
        lda #$01                ; entry is the RESTART too, and cpChr has just rebuilt charset B
        sta fdWas               ;   clean from A -- so fdGlyph's memory of what B holds is stale.
                                ;   $01 is neither state, so the next arrival rebuilds whatever it
                                ;   wants rather than trusting a value from before the restart.
        jsr arcBl2              ; the arriving arc's set, off charset B while it is still clean
        lda #$00
        sta $d01a
        ; ---- VIC bank 3 ($c000-$ffff), WRITTEN WHOLE, NOT read-modify-written ----
        ; This was a read-modify-write of $dd00, which is correct C64 practice: bits 0-1
        ; are the bank, inverted, and the upper bits are the serial lines, so you preserve them.
        ; With KRILL'S LOADER INSTALLED it is wrong, and its README says so outright -- "the
        ; upper 6 bits must always be set to 0 [...] no masking of the value read from $dd00
        ; must be performed". The loader owns those lines and zero is its idle state.
        ; Leaving them set cost most of a day: loadraw worked when called before this write and
        ; hung waiting for the drive when called after it, for any file, and every other
        ; difference between those two moments -- banking, interrupts, badlines, zero page, the
        ; resident's address and state -- was ruled out one at a time before reading this page.
        ; The value is Krill's, not the hardware's: it does not invert, so $03 is $0000-$3fff and
        ; $00 is the $c000 bank we want. Same low bits as before; it is the other six that matter.
        lda #$00
        sta $dd00

        lda #$03                ; 24-ROW MODE, ALWAYS -- but DEN OFF until the first frame is
        sta pd11                ;   drawn. entry is the RESTART too, and a death picture is still
        sta $d011               ;   in both buffers while cpChr rebuilds the cell charset beneath
                                ;   it: the angel, drawn in the level's wall ramps, for a frame.
                                ;   renderSym turns the display on once it has something real.
                                ; (pd11 is the value mnext republishes every frame, so it has to
                                ;  start out agreeing with the register)
                                ; YSCROLL exposes while scrolling is hidden, and -- because the
                                ; fall needs 24-row mode anyway -- the screen no longer changes
                                ; size when you drop into a hole. There is no transition to pop.
        lda #$18
        sta $d016               ; MCM: multicolor text -> 4 logical px per cell, 2 physical px each
        lda #$96
        sta pSplit              ; the pending splits start where the renderer wants them
        lda #246
        sta pSplit2
        lda #$00        ; AND THE PENDING CHARSETS. mnext publishes these into the IRQ's
        sta pCh0                ;   three "ora #" operands every frame, not just during a fall,
        sta pCh2                ;   so leaving them as power-on garbage ORed random bits into
        lda #$02        ;   $d018 from the first frame: the whole screen came up as
        sta pCh1                ;   noise. deadvars cannot see it -- they ARE written, just not
        lda #$00                ;   before they are first read.
        sta arcSkip
        sta arcIx
        sta fT0
        lda #$80
        sta d018vm              ; display buffer A; IRQ ORs the charset bits per half-screen
        lda #$80
        sta $d018
        ; Three inks, one register each, and each held in a variable so keys 1/2/3 can walk it
        ; round the palette. Bit pair 11 is unused -- see the charset note.
        jsr lvlBoot             ; the three inks and the wall mark of the STARTING level

        ; ---- orbs: static sprite setup. Position and shape change per frame in orbMove.
        lda #$00
        sta hlv                 ; hole 0 is the live one until the first drop swaps them
        sta $d015               ; nothing visible until orbMove has decided what is
        lda #$ff
        sta $d01c               ; ALL eight in multicolor: orbMove hands out slots as it finds
                                ; visible orbs, so any of them can be in use
        lda #$0b
        sta $d025               ; sprite bit pair 01 = the shaded underside
        lda #$0f
        sta $d026               ; sprite bit pair 11 = highlight and ground shadow
        lda #$0c
        sta $d027               ; sprite bit pair 10 = the body. Per-sprite, so osFlush rewrites
                                ; it; this is only the first frame's value.
                                ;
                                ; $d01b comes from omPri every frame, and nothing SETS omPri yet,
                                ; so every sprite is IN FRONT of all foreground. Deliberate: the
                                ; walls are already bit pair 01 (background), so orbs draw over
                                ; them -- but the seams are bit pair 10, which IS foreground, and
                                ; would otherwise take a bite out of an orb standing in front of
                                ; one. Occlusion returns as stamped foreground-black chars plus a
                                ; per-orb priority bit, and that is when this changes.
        lda #$00
        sta $d020
        lda #$ff
        sta $dc02
        lda #$00
        sta $dc03
        ldx #$00
        ; No run cached for either buffer yet. The two halves need OPPOSITE sentinels now that
        ; the tests are ordered compares rather than equality:
        ;   cwA/cwB start at 0 -- the ceiling test skips when rb has SHRUNK, and $ff would make
        ;     every column look like a shrink and skip its own first paint, leaving the BASIC
        ;     screen showing through.
        ;   cbA/cbB start at $ff -- the solid test skips when rs has GROWN, and $ff exceeds any
        ;     rs, so the first frame always draws.
        ; The four tables are contiguous (cwA, cwB, cbA, cbB, 40 bytes each), so one walk covers
        ; them: offsets 0-79 are the ceiling pair, 80-159 the solid pair. EXACTLY 160: the walk
        ; used to run on to X = 255, which was harmless while the four had a page to themselves
        ; and, once compaction packed other buffers behind them, stamped $ff over the next 96
        ; bytes at every boot and every death restart (pvMode and the sprite buffers among them,
        ; 2026-10-10).
        ldx #$00
        lda #$00
rfCz0:  sta cwA,x
        inx
        cpx #80
        bcc rfCz0
        lda #$ff
rfCz:   sta cwA,x
        inx
        cpx #160
        bcc rfCz
        ldx #$00                ; ccf below walks colour RAM from X = 0. It used to inherit that from
                                ;   this loop running X round to 0; bounded at 160, it no longer does.
        lda #$08                ; bit3 = per-cell multicolor enable, low three bits = the
                                ; bit-pair-11 colour. Written once at startup and never
                                ; touched again: the pattern pairing that used to rewrite it
                                ; per cell was removed at 66bc8cf.
                                ;
                                ; It is still the live hook for two-patterns-per-code, and
                                ; more so than before. THIS SAID "every wall pixel is pair 11
                                ; now", which is FALSE and cost an afternoon: patBytes builds
                                ; every cell glyph from FGPX = $40/$10/$04/$01, so a wall pixel
                                ; is pair 01 = $d022, and pair 11 is deliberately unused (see
                                ; patBytes for why -- colour RAM only reaches eight colours).
                                ; It describes PLAN=2, where SOLID becomes $55 and colour RAM
                                ; means something. Believing it suggested recolouring $d022 per
                                ; raster region to hide the floor dither above the horizon --
                                ; which would have repainted every wall in the room.
                                ; What killed the per-cell trick was the per-frame write, not
                                ; the charset trick.
ccf:    sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne ccf
        lda #$00                ; ---- NOT FALLING. Say so. ----
        sta fallSt              ; fsZero: the main loop's first act is "lda fallSt / beq mfIn", and
                                ;   nothing had ever written this. See fallSt's own note: it worked
                                ;   only while its page came up zero, and the relayout moved it.
                                ;   entry is also the death restart, so a restart mid-drop needs
                                ;   this too -- that path could not have worked either.
        jsr lvlStart            ; the LIVE level's start -- boot and every death come here

        lda #$00
        sta dieSt               ; power-on garbage here sent the loop straight into the cut scene with
        sta marked              ;   no state set up, and the program fell out to BASIC
        lda #$00
        sta sokAn               ; a death restarts by JUMPING to entry, not by reloading, so
        jsr wallsBack           ;   anything mid-animation is still live RAM and has to be
                                ;   cleared by hand. A wall the sockets took out must come back
                                ;   too, or a restart hands you a level already solved.
        jsr mkRuns              ; ALWAYS at boot now: runPFT is not emitted at all
                                ;   (RAM scratch), so the live level derives it exactly as an
                                ;   arriving one does. The four per-cell run tables are still
                                ;   carried, and this rewrites them byte for byte (MKRUNS=1 was
                                ;   the proof of that, and is now simply the default).
        jsr objInit             ; entities back to their starting cells -- a death restarts by
                                ;   jumping here, and their state is all live RAM
        lda #$00
        sta carry               ; CARRY=n starts the run holding entity n-1, for headless testing

        jsr idolLk              ; AFTER carry is set, not with lvlBoot: this is what puts
                                ;   idolHd in a known state, and it is RAM that powers up as
                                ;   garbage -- a non-zero one there and the angels would never
                                ;   freeze under your gaze at all until you first picked
                                ;   something up. It also gives CARRY=n the right look for free.



        lda #$e0
        sta baseHi
        lda #$00
        sta iterLo
        sta iterHi
        ; raster IRQ frame counter (for fps)
        ; ---- hardware IRQ/NMI vectors, not the KERNAL's $0314 indirection ----
        ; Going direct is not just necessary now the ROM is gone, it is FASTER: the KERNAL
        ; handler pushes the registers, polls the interrupt source and then jmp ($0314), which
        ; is ~40-50 cycles of dispatch on every interrupt. There are two a frame (top of frame
        ; and the horizon split), so this hands back ~100 cycles a frame.
        lda #<irq
        sta $fffe
        lda #>irq
        sta $ffff
        ; NMI must be pointed somewhere real or RESTORE jams the machine: with the ROM out,
        ; $fffa would otherwise be whatever the loader left in RAM.
        lda #<nmi
        sta $fffa
        lda #>nmi
        sta $fffb
        ; $fffc (RESET) is deliberately left alone. A reset resets the processor port to $37,
        ; mapping the ROM back in, so the CPU reads the KERNAL's reset vector, not this RAM.
        lda #$01
        sta $d01a
        lda #$00
        sta $d012
        lda $d011
        and #$7f
        sta $d011
        lda #$7f
        sta $dc0d
        lda $dc0d
        lda #$ff
        sta $d019
        lda #$00
        sta frameCnt
        sta frameCnt+1

        lda #$01                ; FIRESTRAFE: a press already down (fire restarts after a death,
        sta okStr               ;   and is still held) is not a tap, so letting it go does nothing
        cli
        jsr musGo               ; MUSIC: this level's song, unless one is already playing (a death restart)

mloop:
        jsr tickDelta
        lda dieSt               ; the face is arriving: no input, no rays, no renderSym, and
        cmp #$02                ;   the same three-period pacing the fall runs at
        bcc mfAlive
        jsr dieShow
        jmp fwait
mfAlive:
        lda fallSt              ; falling? then no input, no rays, no renderSym -- one block
        beq mfIn                ;   copy and out, which is what lets it run at 60fps
        jsr fallStep
        jmp fwait
mfIn:   lda dieSt
        beq mfLive
        jsr dieFade
        jmp mfSkip
mfLive: jsr readKeys
mfSkip:
        jsr fallChk             ; stepped into the hole? the cut-scene starts on this frame
        lda fallSt
        beq mfRnd
        jsr fallStep            ; the destination render is a background job now -- no state
        jmp mvs                 ;   between walking and falling
mfRnd:
        jsr rayAll              ; the cast is a SUBROUTINE now, so the fall can run it too --
        jmp subFin              ;   in slices, into a buffer, while the animation keeps moving
rayAll:



        ; ---- adaptive subdivision: march only at connected-wall-run boundaries ----
        ; cstepT is filled by the subdivision itself now (see subFace), so it has to start
        ; the frame empty. 40 bytes; the scan it replaces in prepCells cost 1920 cycles.
        ; Straight-line, not a loop: "sta abs" is 4 cycles against the 9 a loop iteration
        ; costs with its dex and bpl, and 80 bytes of table twice a frame is enough for
        ; that to matter. 240 bytes of code for ~700 cycles.
        lda #$00
        sta cstepT+0
        sta cstepT+1
        sta cstepT+2
        sta cstepT+3
        sta cstepT+4
        sta cstepT+5
        sta cstepT+6
        sta cstepT+7
        sta cstepT+8
        sta cstepT+9
        sta cstepT+10
        sta cstepT+11
        sta cstepT+12
        sta cstepT+13
        sta cstepT+14
        sta cstepT+15
        sta cstepT+16
        sta cstepT+17
        sta cstepT+18
        sta cstepT+19
        sta cstepT+20
        sta cstepT+21
        sta cstepT+22
        sta cstepT+23
        sta cstepT+24
        sta cstepT+25
        sta cstepT+26
        sta cstepT+27
        sta cstepT+28
        sta cstepT+29
        sta cstepT+30
        sta cstepT+31
        sta cstepT+32
        sta cstepT+33
        sta cstepT+34
        sta cstepT+35
        sta cstepT+36
        sta cstepT+37
        sta cstepT+38
        sta cstepT+39
        lda #$01       ; and every wall column back to a plain fill
        sta seamT+0
        sta seamT+1
        sta seamT+2
        sta seamT+3
        sta seamT+4
        sta seamT+5
        sta seamT+6
        sta seamT+7
        sta seamT+8
        sta seamT+9
        sta seamT+10
        sta seamT+11
        sta seamT+12
        sta seamT+13
        sta seamT+14
        sta seamT+15
        sta seamT+16
        sta seamT+17
        sta seamT+18
        sta seamT+19
        sta seamT+20
        sta seamT+21
        sta seamT+22
        sta seamT+23
        sta seamT+24
        sta seamT+25
        sta seamT+26
        sta seamT+27
        sta seamT+28
        sta seamT+29
        sta seamT+30
        sta seamT+31
        sta seamT+32
        sta seamT+33
        sta seamT+34
        sta seamT+35
        sta seamT+36
        sta seamT+37
        sta seamT+38
        sta seamT+39
        ldx #11        ; roll the band forward one frame. A is dead here -- the profile
sHyCp:  lda sHyC,x              ;   tick and the "lda py+1" below both reload it.
        sta sHyP,x
        dex
        bpl sHyCp
        lda sHyN
        sta sHyPN
        lda #$00
        sta sHyN
        lda py+1                ; the DDA's starting cell, once for the whole frame
        jsr mulW
        clc
        adc px+1
        sta cell0
        jsr lxHaz               ; the run tables are patched for the cell being RENDERED from, so
                                ;   this stays right even when the fall renders a different cell
                                ;   than the player stands in
        ; ---- the view angle at QUARTER-unit resolution: paq = (pa:paF) >> 6 ----
        ; Once a frame, not once a ray: it is constant across the whole frame and the rays only
        ; add their own offset.
        ;
        ; This used to be pa*4, which set the two fractional bits to zero every frame -- so the
        ; angle fraction readKeys accumulates never reached the picture and the view could only
        ; turn in WHOLE units. Turning is well under one unit a frame, so some frames turned and
        ; some did not: a whole unit is 3.0 screen columns at the centre of the view and 4.3 at
        ; the edge, which is a plainly visible hitch several times a second. A quarter unit is
        ; 0.75 and 1.06, at or under what the renderer can draw at all.
        ; pivPrep, forty lines further on, has always worked from the full 16-bit angle -- it
        ; was predicting a rotation the rays then declined to perform.
        lda paF
        asl
        sta tmp                 ; paF << 1, its top bit now in C
        lda pa
        rol
        sta paqL
        lda #$00
        rol
        sta paqH                ; (pa:paF) >> 7 so far, 9 bits
        asl tmp
        rol paqL
        rol paqH                ; and once more: >> 6, the 10 bits the tables are indexed by
        lda #$00                ; explicit: the clears above leave A holding their own fill
        sta nbnd

        jsr pivPrep             ; marches 0 and 159, then a bracket per predicted boundary,
                                ; and leaves the stack holding the spans between them
subLp:   ; fallMid renders the destination WHOLE in the drop's black middle, so the cast is
                                ;   never interrupted and the per-pop budget check below is gone
                                ;   (2026-10-11) -- one compare a pop off every frame.
subLp0: ldx sp
        beq subDn
        dex
        stx sp
        lda stackLT,x
        sta spanL
        lda stackRT,x
        sta spanR
        ldx spanL
        lda faceIdT,x
        sta tmp
        ldx spanR
        lda faceIdT,x
        cmp tmp
        bne subFace             ; different wall FACE -> split, and maybe record a boundary
        ; Heights are linear across a face, which is what makes the merge exact -- but only
        ; while they FIT. colH is a byte, so anything closer than 88/254 = 0.35 cells
        ; saturates, and interpolating from a saturated endpoint skews the whole span,
        ; including the part that is on screen. If exactly one end is saturated, split
        ; instead; if BOTH are, the span is entirely off-screen-tall and merging is still
        ; exact (a linear function between two saturated ends never dips below them).
        ldx spanL
        lda colH,x
        cmp #254
        lda #$00
        rol                     ; A = 1 if the left end saturated
        sta tmp2
        ldx spanR
        lda colH,x
        cmp #254
        lda #$00
        rol
        cmp tmp2
        bne subSp
        jmp subLp               ; merged: the interpolation happens once per FACE, at subDn
        ; The face changes somewhere in this span. Once the span is a single column wide the
        ; boundary is pinned, and THIS is the only place in the frame it can be discovered --
        ; so record it straight into cstepT. The old route was to write a face id into all
        ; 160 columns of faceIdT and have prepCells rediscover the ~2 transitions by
        ; comparing adjacent entries in every one of the 40 cells. Same answer, minus a
        ; per-column store in the interpolator's hot loop and minus the whole scan.
subFace:lda spanR
        sec
        sbc spanL
        cmp #$02
        bcs subMid              ; still wide -> split further
        ; A corner is pinned to one column, so its seam line needs no projection at
        ; all -- it is simply the column we just found. Do it before the k=0 bail below:
        ; the seam CAN sit at pixel 0 of a cell, cstepT cannot.
        ;
        ; EVERY run end gets its mark, concave or convex -- not the whole vertical run, just the
        ; column where black meets black.
subCv:  
        jsr subCvM              ; choose the column, settle any collision, place the mark
subCn:
        jsr subBnd              ; a face starts here: remember it as a span delimiter
        ; ---- and remember it as NEXT frame's hint ----
        ; Recorded HERE rather than from bndT afterwards, because bndT also holds saturation
        ; splits and only real face boundaries are worth predicting. Three bytes: the column,
        ; the WORLD bearing it was seen at (so the rotation term is a plain subtract next
        ; frame), and 163/distance for the translation term. The distance costs nothing to
        ; obtain -- castRay already parked it in remLoT/remHiT for calcU.
        ; Kept SORTED by column, by insertion. pivPrep has to see them in ascending column
        ; order: it walks them once, emitting cuts, and drops any that would not increase.
        ; Unsorted, almost every hint failed that test and the frame silently fell back to
        ; plain bisection -- which is exactly what the first measurement showed, 26 rays with
        ; the pivot and 26 without. (The JS model hid this: it called .sort() on the cut list,
        ; so it was measuring an ordering the 6502 never had.)
        ;
        ; The list is kept DESCENDING and pivPrep walks it backwards. The span stack pops the
        ; rightmost span first, so boundaries are discovered right to left, and inserting a
        ; descending stream into an ascending list puts every arrival at the FRONT -- three
        ; parallel arrays shifted up by one, nine times, 1,500 cycles at the worst viewpoint.
        ; Matching the list's order to the discovery order turns all of that into an append.
        ldx pvN
        cpx #$40
        bcs pvRcD               ; hint list full: the rest of this frame's boundaries go
        lda spanL               ; unpredicted, which costs probes and nothing else
                                ; spanL, NOT spanR. The boundary lies BETWEEN the two, and
                                ; pivPrep brackets a hint p with cuts at p and p+1 -- so the
                                ; hint has to be the LEFT column or every bracket sits one
                                ; column past its boundary and catches nothing. bndT keeps
                                ; storing spanR; that is a span delimiter, a different thing.
        sta tmp2
pvInsL: txa
        beq pvInsD
        lda pvBnd-1,x
        cmp tmp2
        bcs pvInsD              ; found the slot: everything left of it is LARGER (descending)
        sta pvBnd,x             ; A still holds pvBnd[x-1] -- cmp does not disturb it
        lda pvAng-1,x
        sta pvAng,x
        lda pvRcp-1,x
        sta pvRcp,x
        dex
        jmp pvInsL
pvInsD: lda tmp2
        sta pvBnd,x
        tay
        lda rayOffT,y
        clc
        adc pa
        sta pvAng,x
        ; ---- the reciprocal must come from the NEARER side, not from spanL ----
        ; A silhouette boundary is a physical edge on the near surface, so it moves with THAT
        ; surface's parallax. spanL is the near side for a right-facing silhouette and the FAR
        ; side for a left-facing one, so taking the distance from spanL unconditionally
        ; mispredicted every left-facing silhouette -- it was told to drift at the far wall's
        ; rate when the edge actually moves at the near object's. That is why the glitch was
        ; asymmetric: strafing one way the mispredicted bracket still landed inside the object,
        ; strafing the other it fell short onto the far wall and the object went unprobed.
        ; Whole cells only, no fraction tiebreak: the case this exists for is a near object
        ; against a far wall, which always differs in the high byte. When the two sides ARE in
        ; the same cell of distance their reciprocals agree to within a 1/16-cell table step,
        ; so which one wins cannot matter -- and 13 bytes of headroom can.
        ; spanR is always spanL+1, so fold the +1 into the ADDRESS and the iny/dey disappear.
        ldy tmp2
        lda remHiT+1,y          ; the far end of the pinned pair
        cmp remHiT,y
        bcs pvNL                ; right is no nearer -> keep spanL
        iny                     ; right is nearer -> spanR
pvNL:        lda remHiT,y
        cmp #16
        bcs pvRcFar             ; 16+ cells: the translation term is under a quarter-unit at
        asl                     ; any plausible speed, so a constant is as good as a lookup
        asl
        asl
        asl
        sta tmp
        lda remLoT,y
        lsr
        lsr
        lsr
        lsr
        ora tmp                 ; distance in 1/16 cells
        tay
        lda rcpDT,y
        jmp pvRcS
pvRcFar:lda #10
pvRcS:  sta pvRcp,x
        inc pvN
pvRcD:
        lda spanR
        and #$03
        beq subLp               ; boundary on a cell edge: the two cells simply differ, and
                                ; cstepT can only name an interior column (1..3)
        sta tmp                 ; the position, 1..3
        ; ---- a cell can hold TWO face boundaries, and cstepT names one ----
        ; The rule used to be "first POSITION in a cell wins", and since the span stack pops the
        ; rightmost span first that meant the RIGHTMOST boundary won -- regardless of size. A
        ; 2-row step against a distant wall could therefore displace the 6-row silhouette beside
        ; it, and the step model ("plateau to the boundary column, then drop") then paints wall
        ; across a column that has none. Keep the boundary with the LARGER height jump instead:
        ; a step's whole job is to place the edge the eye reads, and that is the big one.
        ; |dh| lives in bits 2-6, which nothing else uses -- bits 0-1 are the position and bit 7
        ; is subBnd's mark. Both columns are span ends, so both heights are already marched.
        ;
        ; SATURATE at 31, do not scale. colH is a height in ROWS, and a distant corridor is only
        ; 9-15 rows tall all the way across -- the first cut shifted |dh| down by 3 and every
        ; boundary in this frame quantised to zero, so the tie-break kept the rightmost and the
        ; rule changed nothing. The comparison only needs an ORDER, and the pair it has to
        ; separate is small-against-small far more often than huge-against-huge.
        ldx spanR
        lda colH,x
        ldx spanL
        sec
        sbc colH,x
        bcs csAbs
        eor #$ff
        adc #$01                ; carry is clear on this path, so this is a true negate
csAbs:  cmp #32
        bcc csSat               ; two boundaries both jumping 31+ rows in one cell is two
        lda #31                 ; silhouettes in four columns: either is a defensible edge
csSat:  asl
        asl                     ; 0..31 -> bits 2-6
        ora tmp
        sta tmp                 ; strength | position: both what gets stored and what we compare
        lda spanR
        lsr
        lsr
        tax                     ; cell = spanR/4
        lda cstepT,x
        and #$7f                ; drop subBnd's "delimiter inside this cell" mark. What is left
        beq csSet               ; is strength|position, so ONE compare orders by strength and
        cmp tmp                 ; breaks ties on position -- no need to mask the two apart
        bcs subLp               ; the recorded boundary jumps at least as far: keep it. On a tie
                                ; the higher position wins, and within one cell that is the
                                ; rightmost -- exactly what the old first-wins rule kept
csSet:  lda cstepT,x
        and #$80                ; keep subBnd's mark; clear any position we are replacing
        ora tmp
        sta cstepT,x
        jmp subLp
subSp:  lda spanR               ; saturation split: a real split, but NOT a face boundary
        sec
        sbc spanL
        cmp #$02
        bcs subMid
        jsr subBnd              ; a delimiter too: never interpolate across a saturated end
        jmp subLp
subMid: lda spanL
        clc
        adc spanR
        ror                     ; ROR not LSR: at 160 columns spanL+spanR reaches 318, so the
                                ; sum is 9 bits and the carry IS bit 8 of the midpoint
        sta col                 ; mid = (L+R)/2
        jsr marchCol

        ldx sp
        lda spanL
        sta stackLT,x
        lda col
        sta stackRT,x
        inx
        lda col
        sta stackLT,x
        lda spanR
        sta stackRT,x
        inx
        stx sp
        jmp subLp
        ; ---- one interpolation per FACE, not per binary-search interval ----
        ; The search merges wherever its two probes happen to agree, so a single flat wall
        ; comes out as five or six abutting spans, each interpolating between its OWN marched
        ; endpoints. That is seven noisy sample points across a wall that needs two, and it
        ; is why a wall dead ahead had a top that rose, dipped and rose again instead of
        ; running straight. Height is EXACTLY linear across a face, so interpolating end to
        ; end is not an approximation -- it is the right answer, and it is cheaper, because
        ; span setup happens once per face instead of once per interval.
subDn:
        lda #$00                ; the first face always starts at column 0
        sta spanL
        sta bcur
        lda nbnd
        beq subOne              ; no delimiters: the whole screen is one face
        cmp #$02
        bcc subEmt              ; one delimiter needs no sorting
        ; ---- reverse first, because the delimiters arrive fully DESCENDING ----
        ; subLp pops the rightmost span first, so it discovers boundaries right to left and
        ; bndT fills in reverse. That is the bubble sort's worst case exactly: n passes of n
        ; compares, every one of them swapping. Measured 2,445 cycles at the worst viewpoint,
        ; 3.4% of the frame, to sort nine bytes. Reversing is O(n) and leaves the sort in
        ; place, so a run that is NOT perfectly descending -- a saturation split landing out
        ; of turn -- still comes out ordered, just without the free ride.
        ldx #$00
        ldy nbnd
        dey
brvLp:  stx tmp
        cpy tmp
        bcc brvDn               ; the ends have crossed
        beq brvDn               ; ... or met, at an odd middle element
        lda bndT,x
        sta tmp2
        lda bndT,y
        sta bndT,x
        lda tmp2
        sta bndT,y
        inx
        dey
        jmp brvLp
brvDn:  ldx nbnd                ; bubble the handful of delimiters into column order
        dex
        stx bcnt
subIns: ldx #$00
        lda #$00
        sta bswp
subInL: lda bndT+1,x
        cmp bndT,x
        bcs subInN
        ldy bndT,x              ; swap (STY has no abs,x, so it goes out through A)
        sta bndT,x
        tya
        sta bndT+1,x
        inc bswp
subInN: inx
        cpx bcnt
        bcc subInL
        lda bswp
        bne subIns
subEmt: ldx bcur
        lda bndT,x
        sec
        sbc #$01
        sta spanR               ; this face runs up to the column before the delimiter
        jsr subFlush
        ldx bcur
        lda bndT,x
        sta spanL
        inc bcur
        lda bcur
        cmp nbnd
        bcc subEmt
subOne: lda #159
        sta spanR
        jmp subFlush            ; a tail call: rayAll returns to its caller through subFlush's rts

subFlush:                       ; interpolate + seam one maximal face
        lda spanR
        cmp spanL
        bcc subFDn              ; empty
        jsr interpSpan
        jmp seamSpan            ; a tail call
subFDn: rts

subBnd: ldx nbnd                ; remember a column where a new face/saturation state begins
        cpx #$40
        bcs subBDn              ; list full: leave the rest as the search left them
        lda spanR
        sta bndT,x
        inc nbnd
        ; ---- and mark the CELL, in bit 7 of cstepT ----
        ; interpSpan interpolates linearly between delimiters, so between them colH is monotonic
        ; and a cell's min and max are simply its END columns. That is only true of a cell with no
        ; delimiter strictly inside it -- two linear pieces can meet in a V. So record which cells
        ; those are, and renderSym scans all four columns only for them. Measured over 11,960
        ; cells: 97.0% have no interior delimiter, and the end columns gave the right min/max for
        ; every one of them.
        ;
        ; A delimiter on a cell EDGE does not count: the cell is still one linear piece.
        ; Bit 7 rather than a second table, because cstepT is already cleared every frame and
        ; already indexed by cell. Everything reading it for the step position masks #$03.
        and #$03
        beq subBDn
        lda spanR
        lsr
        lsr
        tax
        lda cstepT,x
        ora #$80
        sta cstepT,x
subBDn: rts

; ===== pivPrep: seed the subdivision from where last frame's boundaries have moved to =====
; Bisection locates each boundary from scratch every frame, ~7.3 marches each, and boundaries
; barely move between frames. This predicts each one forward and hands the search a ONE-COLUMN
; bracket around it instead of the whole screen. The spans BETWEEN brackets merge on their first
; pop and cost nothing, so the win is the whole search tree above each boundary.
;
; It cannot lose a boundary: extra cut points only ever SPLIT a span, and every sub-span still
; gets the same face-id test in subLp -- so this finds a superset of what bisection finds. That
; is why the bracket can be one column wide with no safety margin: a wrong prediction costs
; probes, never pixels. Modelled offline at 22.6 -> 15.0 marches/frame.
;
; With pvN = 0 -- first frame, or PIVOT off -- it degenerates to exactly the old seeding.
pivPrep:
        ; ---- rotation, quarter-units: (pa:paF - opa) >> 6 ----
        lda paF
        sec
        sbc opaL
        sta pvTL
        lda pa
        sbc opaH
        sta pvTH
        asl pvTL                ; <<2 and take the high byte IS >>6, sign intact: DT_MAX caps
        rol pvTH                ; the turn at 32 ticks x 192 = 6144, and 6144<<2 still fits 16
        asl pvTL                ; bits. Without that cap this would silently wrap.
        rol pvTH
        lda pvTH
        sta dqa
        ; ---- translation, 1/256 cells ----
        lda px
        sec
        sbc opxL
        sta pvTL
        lda px+1
        sbc opxH
        sta pvTH
        jsr pvClmp
        jsr pvC63
        sta pvDX
        lda py
        sec
        sbc opyL
        sta pvTL
        lda py+1
        sbc opyH
        sta pvTH
        jsr pvClmp
        jsr pvC63
        sta pvDY
        ; ---- how much of the prediction does this frame actually need? ----
        ; pivOne was 890 cycles a hint (now ~700, see pv1All) -- 11% of the worst frame at nine hints -- and
        ; almost all of it is the translation term: two signed multiplies for the displacement
        ; and a third for the reciprocal. When the camera has not translated that term is
        ; identically zero, so the whole chain computes a very expensive nothing. Turning on
        ; the spot is the common case that hits this, and standing still hits the stronger one:
        ; with no rotation either, the boundary is exactly where it was pinned last frame.
        lda #$00
        sta pvMode
        lda pvDX
        ora pvDY
        bne pvMDn               ; the camera moved: the full prediction earns its cycles

        inc pvMode
        lda dqa
        bne pvMDn
        inc pvMode
pvMDn:
        ; ---- this viewpoint becomes next frame's reference ----
        lda paF
        sta opaL
        lda pa
        sta opaH
        lda px
        sta opxL
        lda px+1
        sta opxH
        lda py
        sta opyL
        lda py+1
        sta opyH
        ; ---- the two screen edges, as always ----
        ; Ticked like every other march. Without these the profiler credited pivPrep's rays to
        ; whatever phase happened to be open and reported "ray: hit + height + marchCol stores"
        ; at 0.0% -- which is impossible, and was the tell that the numbers were describing a
        ; tick layout the code no longer had.
        lda #$00
        sta col
        jsr marchCol
        lda #159
        sta col
        jsr marchCol

        lda #$00
        sta sp
        sta pvLast
        lda pvN                 ; the hint list is DESCENDING (see pvInsL), so walking it from
        sta pvI                 ; the end is what yields ascending columns here
pivLp:  ldx pvI
        beq pivEnd
        dex
        stx pvI
        jsr pivOne              ; A = where hint X is predicted to be now
        cmp pvLast
        beq pivNx               ; predictions must come out strictly increasing, or the spans
        bcc pivNx               ; would overlap and the stack would describe nonsense. Rotation
        cmp #$9f    ; is monotonic but the per-boundary translation term is not, so
        bcs pivNx               ; anything out of order is simply dropped -- it costs one
        pha                     ; unpredicted boundary, not a wrong image.
        pla
        ; ---- PIVNEAR: march the bracket, and if it missed, its two neighbours ----
        ; A boundary is only known to lie BETWEEN two marched columns, so where it lands after
        ; any motion that is not a whole number of columns is ambiguous by one column either way
        ; -- tools/pivlab.mjs measured the misses as almost all exactly 1 off, evenly split
        ; left and right. Left to the search, a miss costs the bisection of the neighbouring
        ; span from its MIDDLE, ~4 extra rays to find a boundary sitting right next to the
        ; bracket. Looking next door first costs 1 or 2. So march first and push afterwards,
        ; in ascending order, every column marched (a marched column is a free cut).
        sta pvP
        lda #$00
        sta pvNb                ; bit 0: p-1 was marched, bit 1: p+2 was
        lda pvP
        jsr pivMrc
        lda pvP
        clc
        adc #$01
        cmp #$9f
        bcs pnCmp               ; p+1 is the right edge, marched already
        jsr pivMrc
pnCmp:  ldx pvP
        lda faceIdT,x
        cmp faceIdT+1,x
        bne pnPush              ; caught
        dex                     ; missed: p-1, if it is right of the last cut
        cpx pvLast
        beq pnR
        bcc pnR
        txa
        jsr pivMrc
        inc pvNb
        ldx pvP
        lda faceIdT-1,x
        cmp faceIdT,x
        bne pnPush              ; it was one column left
pnR:    lda pvP                 ; ...then p+2, if it is short of the right edge
        clc
        adc #$02
        cmp #$9f
        bcs pnPush
        jsr pivMrc
        lda pvNb
        ora #$02
        sta pvNb
pnPush: lsr pvNb
        bcc pnP1
        ldx pvP
        dex
        txa
        jsr pivPush
pnP1:   lda pvP
        jsr pivPush
        lda pvP
        clc
        adc #$01
        cmp #$9f
        bcs pivNx
        jsr pivPush
        lsr pvNb
        bcc pivNx
        lda pvP
        clc
        adc #$02
        jsr pivPush
pivNx:  jmp pivLp               ; pvI was decremented at the top; 0 ends the walk
pvP:    !byte 0                 ; PIVNEAR: this hint's predicted column
pvNb:   !byte 0                 ;   ...and which neighbours were marched
pivEnd: lda #$9f    ; the last span always runs to the right edge
        jsr pivPush
        lda #$00
        sta pvN                 ; this frame records its own boundaries from scratch
        rts

; march column A, then push the span (pvLast, A) and make A the new pvLast
pivCut: pha
        jsr pivMrc
        pla
        jmp pivPush
; march column A
pivMrc: sta col
        jmp marchCol            ; a tail call
; push the span (pvLast, A) and make A the new pvLast
pivPush:ldx sp
        pha
        lda pvLast
        sta stackLT,x
        pla
        sta stackRT,x
        sta pvLast
        inx
        stx sp
        rts

; pvC63: signed A -> clamped to +-63, so the term's quarter-square sums fit a signed byte (pv1All)
pvC63:  cmp #$80
        bcs pc63n
        cmp #$40
        bcc pc63d
        lda #$3f
        rts
pc63n:  cmp #$c1
        bcs pc63d
        lda #$c1
pc63d:  rts

; pvClmp: signed 16-bit pvTL/pvTH -> A, saturating to -128..127 rather than wrapping. A wrap
; here would turn a large forward step into a large BACKWARD prediction, which is worse than
; no prediction at all.
pvClmp: lda pvTH
        beq pvcP
        cmp #$ff
        beq pvcN
        lda pvTH
        bmi pvcLo
        lda #$7f
        rts
pvcLo:  lda #$80
        rts
pvcP:   lda pvTL                ; high byte 0: fits iff the low byte is not already negative
        bpl pvcD
        lda #$7f
        rts
pvcN:   lda pvTL                ; high byte $ff: fits iff the low byte IS negative
        bmi pvcD
        lda #$80
pvcD:   rts

; pivOne: X = hint index -> A = predicted column.
;   q' = rayOffQS[col] - dqa + ((pvDX*sin(a) - pvDY*cos(a)) * rcp + 2^14 >> 15)
; and qToColT turns q' back into a column, which is why there is no divide anywhere here --
; the rectilinear column spacing is baked into that table.
pivOne: stx pvI2
        lda pvMode              ; see pvMDn: skip what this frame's motion makes zero
        beq pv1All
        cmp #$02
        bcs pv1Sti
        lda #$00                ; turned in place: daq = 0, so the term, both multiplies and
        sta pvTL                ; the reciprocal are all skipped -- only the rotation is left
        sta pvTH
        jmp pv1r
pv1Sti: lda pvBnd,x             ; nothing moved: the boundary is still exactly where it was
        rts                     ; pinned, which is a better answer than the rounding the
                                ; qToColT round trip would give it
; ---- the translation term, signed quarter squares (2026-10-15) ----
; t = dX*sin(a) - dY*cos(a), with sin/cos at x64 and dX/dY clamped to +-63 (a quarter cell a
; frame), so every a+b and a-b fits a SIGNED byte and ab = f0[|a+b|] - f0[|a-b|] comes out
; signed with no sign bookkeeping at all. The old route took magnitudes, carried the sign in
; pvSgn through two unsigned mul8s and a pvNeg per operand: ~960 cycles a hint, ~5k a moving
; frame (tools/pivlab.mjs). Then u = |t| * rcp >> 14 as before (x64 not x128, so 14 not 15).
pvS     = pvPH                  ; sin and cos live in the product bytes until the product
pvC     = pvPB                  ;   needs them -- both are spent by then
pv1All: ldy pvAng,x
        lda sinST,y
        cmp #$80
        ror                     ; sin x64, sign kept
        sta pvS
        tya
        clc
        adc #$40                ; cos(a) = sin(a + a quarter turn)
        tay
        lda sinST,y
        cmp #$80
        ror
        sta pvC
        lda pvDX
        clc
        adc pvS
        bpl pvq1a
        eor #$ff
        clc
        adc #$01
pvq1a:   tax
        lda pvDX
        sec
        sbc pvS
        bpl pvq1b
        eor #$ff
        clc
        adc #$01
pvq1b:   tay
        lda f0LoT,x             ; t = f0[|a+b|] - f0[|a-b|]
        sec
        sbc f0LoT,y
        sta pvTL
        lda f0HiT,x
        sbc f0HiT,y
        sta pvTH
        lda pvDY
        clc
        adc pvC
        bpl pvq2a
        eor #$ff
        clc
        adc #$01
pvq2a:   tax
        lda pvDY
        sec
        sbc pvC
        bpl pvq2b
        eor #$ff
        clc
        adc #$01
pvq2b:   tay
        lda pvTL                ; t -= f0[|a+b|] - f0[|a-b|]
        sec
        sbc f0LoT,x
        sta pvTL
        lda pvTH
        sbc f0HiT,x
        sta pvTH
        lda pvTL
        clc
        adc f0LoT,y
        sta pvTL
        lda pvTH
        adc f0HiT,y
        sta pvTH
        lda #$00
        sta pvSgn
        lda pvTH
        bpl pv1p
        lda #$00                ; |term|, sign remembered
        sec
        sbc pvTL
        sta pvTL
        lda #$00
        sbc pvTH
        sta pvTH
        lda #$ff
        sta pvSgn
pv1p:   ldx pvI2                ; |term| * rcp, 16x8 -> 24 bits
        lda pvRcp,x
        sta mq
        lda pvTL
        jsr mul8                ; the product's LOW byte is never read: the >>14 below takes
        lda phi                 ; only bits 14..21, and +2^13 cannot carry out of byte 0's
        sta pvPH                ; contribution by more than the rounding it is for
        lda #$00
        sta pvPB
        lda pvTH
        beq pv1n                ; high byte zero -- the common case, one multiply not two
        jsr mul8                ; mq still holds rcp
        clc
        lda pvPH
        adc plo
        sta pvPH
        lda phi
        adc #$00
        sta pvPB
pv1n:   lda pvPH                ; + 2^13: a bare >>14 truncates toward -inf, and -0.4 of a
        clc                     ; column every frame is enough to miss at a one-column bracket
        adc #$20
        sta pvPH
        lda pvPB
        adc #$00
        sta pvPB
        asl pvPH                ; >>14 = (pvPB<<2) | the top two bits of pvPH
        rol pvPB
        asl pvPH
        rol pvPB
        lda pvPB
        ldy pvSgn
        bpl pv1s
        eor #$ff                ; put the sign back
        clc
        adc #$01
pv1s:   sta pvTL                ; daq, signed byte -> sign-extend for the 16-bit sum
        ldy #$00
        bit pvTL
        bpl pv1e
        ldy #$ff
pv1e:   sty pvTH
pv1r:   ldx pvI2                ; + rayOffQS[col], sign-extended
        ldy pvBnd,x
        lda rayOffQS,y
        clc
        adc pvTL
        sta pvTL
        lda rayOffQS,y
        and #$80
        beq pv1f
        lda #$ff
pv1f:   adc pvTH                ; carry from the low add is still live
        sta pvTH
        lda pvTL                ; - dqa, sign-extended
        sec
        sbc dqa
        sta pvTL
        lda dqa
        and #$80
        beq pv1g
        lda #$ff
pv1g:   sta tmp
        lda pvTH
        sbc tmp
        sta pvTH
        jsr pvClmp              ; off-screen offsets saturate, so a boundary that rotated out
        clc                     ; of view lands on column 0 or 159 and merges away
        adc #$80
        tay
        lda qToColT,y
        rts


subFin:
        jsr lvlSpr              ; the level's SHARED sprite inks, beside the projection
                                ;   that decides what osFlush will write. The two have to land on
                                ;   the SAME frame or the cast recolours in two steps: the bodies
                                ;   follow the projection, so the shared pair has to as well.
                                ; Here and not at mnext: fwait falls THROUGH into mnext, so a fall
                                ;   reaches it -- and this must not run during one, or the idol in
                                ;   your hands changes colour mid-descent. This half of the loop
                                ;   is the half a fall skips, which is exactly the property wanted.
        jsr orbMove             ; once a frame: project every candidate the cell lists
        jsr orbKey              ; SPACE: take the orb you are looking at, or put the carried one
                                ;   down. AFTER orbMove, because that is what sets up the frame
                                ;   trig and fractional-offset terms orbProj reads. Acting a frame
                                ;   later than the press is invisible; projecting from last
                                ;   frame pose would not be.
        jsr bfsTick             ; a few cells of the angel distance map; see anPath
        jsr lxStep              ; LEVEL CODE: the sentries glide and spark (svStep), or the drone follows the angels (drStep)
        jsr angStep             ; AFTER the projection, so orbSeenT describes THIS frame. Run
                                ;   before it, the angel decided on last frame visibility and so
                                ;   took one free step on the very frame you turned to face it --
                                ;   it moved AS you looked, which reads as a pop. Its own step is
                                ;   rendered next frame, which nobody can see.
        jsr dieChk              ; the mark, and the moment they turn far enough to see it
        jsr lxDot               ; LEVEL CODE: brStr, new faces marked and a broken wall taken out (before the sink takes idT)
        jsr wallSink            ; a vanishing wall, mid-collapse
        jsr renderSym
        lda #$13                ; DEN on: there is a rendered frame to show now
        sta pd11
        jsr occStamp            ; AFTER renderSym: it overwrites cells renderSym just drew


        jmp mvs                 ; the ordinary path takes the SINGLE wait. Falling through to the
                                ; fall's wait gave every rendered frame an extra raster period --
                                ; 17,045 cycles on a frame that already costs three or four of
                                ; them, ~a fifth of the frame rate, on the one path that was
                                ; never meant to be locked to a fixed rate.

; ---- fwait: the fall's CONSTANT-RATE wait, 3 raster periods per animation frame ----
; Counting periods off frameCnt is what makes it constant. The old form -- spin to 250, then burn
; one more period -- is only two periods while the frame's work fits inside the first; when it ran
; past 250 the spin silently picked up a third, so the fall alternated 30 and 20fps. A rate that
; VARIES reads as stutter far more than a low rate does. frameCnt is incremented by the top-of-frame
; IRQ, so it keeps counting THROUGH the block copy: the deadline is absolute, not measured from
; whenever the work happened to finish.
fwait:  lda palRas              ; the RASTER's own count (= the tick on NTSC; on PAL the doubled tick would
        sec                     ;   cut every fifth period short, the varying rate this exists to stop
        sbc fT0
        cmp #3
        bcc fwait
mvs:
mvsW:   lda $d012
        cmp #250
        bne mvsW
        lda palRas              ; the flip IS the fall's clock reference: raster 250 of a known
        sta fT0                 ;   frame, so the next deadline is exactly fT0 + 3
        lda pd11                ; PUBLISH the pending scroll and split HERE, alongside the buffer
        sta $d011               ;   flip below, so the fine scroll and the content it shifts reach
        lda pSplit              ;   the screen on the same 60Hz frame. Written inside fallStep they
        sta irqCmp+1            ;   landed a frame early, against the back buffer -- which is the
        sta irqArm+1            ;   whole of the fall's backwards jitter. Raster 250 is in the
        lda pSplit2
        sta irqCm2+1
        sta irqAr2+1
        lda colT                ; BOTH HALVES OF THE GROUND, PUBLISHED TOGETHER -- see colT
        sta irqB0+1
        lda dieSt               ; ...and the death's sprite palette with them, so the flash,
        sta dieLat              ;   the shared inks and the per-sprite inks are ONE frame

        lda colF                ; THE GROUND TRAVELS WITH ITS OWN SPLIT LINE.
        sta irqB1+1             ;   lvlLook used to store this the moment the landing
                                ;   began, while pSplit -- the line region 1 STARTS at --
                                ;   is pending and does not land until here. For the rest
                                ;   of that frame the IRQ painted the arriving level's
                                ;   ground from the OLD pSplit, which by then is 51: the
                                ;   top of the display. That is the one-frame flash of the
                                ;   next level's colour over the whole screen.
        lda #$ff                ; region 4 off until region 3 arms it. Its compare is
        sta irqCm3+1            ;   PATCHED by region 3, so left alone it holds last frame's
                                ;   line -- and when pSplit2 jumps back to 246 at a fall's end
                                ;   that stale line is below it, so region 4 would match first
                                ;   and region 3's charset store would never run.

        lda pCh0
        sta irqC0+1
        lda pCh1
        sta irqC1+1
        lda pCh2
        sta irqC2+1
                                ;   lower border, so both are safe to touch here.
        lda baseHi
        cmp #$e0
        bne mshB
        lda #$80
        sta d018vm              ; show A, draw into B (IRQ ORs in the charset bits)
        lda #$e4
        sta baseHi
        jmp mnext
mshB:   lda #$90
        sta d018vm              ; show B, draw into A
        lda #$e0
        sta baseHi
mnext:
        jsr osFlush             ; sprite registers, now the beam is out of the way
        inc iterLo
        bne mloop
        inc iterHi
        jmp mloop

; The old makeDiv drew a white seam slit by ZEROING colH at each face boundary. That is
; incompatible with 4-wide cells -- a zeroed column silently became a ramp endpoint, so a
; boundary landing on a cell edge turned the whole cell into a diagonal. It is also now
; redundant: the face boundary is rendered as a true vertical step (see cstepT).

; 8x8 -> 16 unsigned, A * mq -> phi:plo, off the same quarter-square tables as sideMul.
mul8:   sta mp
        clc
        adc mq
        tax
        bcc m8l0
        lda f1LoT,x
        sta plo
        lda f1HiT,x
        sta phi
        jmp m8l1
m8l0:   lda f0LoT,x
        sta plo
        lda f0HiT,x
        sta phi
m8l1:   lda mp
        sec
        sbc mq
        bcs m8l2
        eor #$ff
        adc #$01
m8l2:   tax
        sec
        lda plo
        sbc f0LoT,x
        sta plo
        lda phi
        sbc f0HiT,x
        sta phi
        rts

; ================= render: 4x8 multicolor cells + vertical symmetry =================
; Walks CELL COLUMNS, not rows. Everything a column needs follows from one number -- the
; row its wall top lands in -- so the old row-major loop was re-deriving per cell what is
; known once per column. Here each column is three runs:
;
;     rows 0 .. rb-1     ceiling      painted by an unrolled chain
;     rows rb .. rs-1    the wall top computed per cell (usually one row)
;     rows rs .. 12      solid wall   painted by an unrolled chain
;
; rb/rs come from two table lookups on the column's min/max height, so no cell is ever
; tested. The runs are painted by jumping into a straight line of store instructions with
; the addresses baked in (see chainSrc), which is what makes walking DOWN a column cheap
; despite the 40-byte stride -- normally the reason to render row-major.
;
; Each chain slot also writes the mirrored row, so both halves are painted in one pass;
; charset B (raster-split at the horizon) makes the same char code render upside down.
renderSym:
        ldx baseHi
        stx ecA1+2
        stx ecA2+2
        stx ecA3+2
        stx ecA4+2
        stx ecA5+2
        stx ecA6+2
        inx
        stx ecA7+2
        stx ecA8+2
        stx ecA9+2
        stx ecA10+2
        stx ecA11+2
        stx ecA12+2
        inx
        stx ecB5+2
        stx ecB6+2
        stx ecB7+2
        stx ecB8+2
        stx ecB9+2
        stx ecB10+2
        stx ecB11+2
        inx
        stx ecB1+2
        stx ecB2+2
        stx ecB3+2
        stx ecB4+2
        lda #$ff                ; VSPLIT: vsOn names the COLUMN whose stack is in progress, so it
        sta vsOn                ;   is reset once a frame here rather than at every column head --
                                ;   39 clears a frame for a stack that starts ~2 times. $ff is no
                                ;   column, and without this a stale number from last frame could
                                ;   match the same column this frame.
        lda baseHi
        cmp #$e0
        beq rfBufA
        lda #14                 ; upper half of the entry tables = buffer B chains
        bne rfBufS              ; always
rfBufA: lda #$00
rfBufS: sta bufOff
        ; ---- which buffer's run cache? ----
        ; The chains repaint rows this buffer already holds whenever the run lengths have not
        ; changed since it was last drawn, two frames ago. Each buffer needs its OWN cache --
        ; sharing one makes each skip writes based on what the other holds, which shows up as
        ; the view flickering on every bank switch. All four tables sit in one page, so
        ; choosing between them is four operand bytes patched here rather than an index
        ; computed per column.
        lda baseHi
        cmp #$e0
        bne rfCbB
        lda #<cwA
        ldy #<cbA
        jmp rfCbS               ; not bne: cwA is page-aligned, so A is zero here
rfCbB:  lda #<cwB
        ldy #<cbB
rfCbS:  sta rfCw1+1
        sta rfCw2+1
        sty rfCb1+1
        sty rfCb2+1
        sty rfCb3+1


        ldx #39                 ; X = cell column throughout; the chains use it as their index.
                                ; ALWAYS 39..0 (2026-11-14): the range rsLo..rsHi served the sliced
                                ; fall render, which went that day.
        ; The cell's min and max heights, computed HERE rather than in a pass of their own.
        ; prepCells walked these same 40 cell columns to write cmnT/cmxT for renderSym to read
        ; back one loop later -- 40 iterations of loop overhead and a store-then-load round
        ; trip to move two bytes between two routines that visit the cells in the same order.
        ; X is the cell column and the chains index by it, so it has to survive; Y and A are
        ; free here, which is all this needs.
rfCol:  stx colc
        ; colH is ONE linear ramp across any cell with no delimiter inside it, so its extremes
        ; are its END columns and the middle two need not be looked at. 97% of cells, measured.
        ; The four-way scan below is kept for the other 3%, where two linear pieces meet and the
        ; extreme can be in the middle.
        lda cstepT,x
        bne pmSlow
        ; X MUST survive this: it is the cell column, and the run-cache test right after pmB3
        ; is a cmp against cwA,x. The first cut held h3 in X and addressed the cache with a
        ; wall height instead -- six views went 914 -> 6913 wrong pixels.
        ldy col4T,x
        lda colH,y              ; h0
        cmp colH+3,y            ; vs h3
        bcs pmFhi
        sta tmp                 ; h0 < h3: min = h0, max = h3
        lda colH+3,y
        sta tmp2
        jmp pmB3
pmFhi:  sta tmp2                ; h0 >= h3: max = h0, min = h3
        lda colH+3,y
        sta tmp
        jmp pmB3
pmSlow: ldy col4T,x             ; first logical column of this cell; colH is page-aligned, so
        lda colH,y              ; the +1/+2/+3 forms cannot cross a page
        sta tmp                 ; running min
        sta tmp2                ; running max
        lda colH+1,y
        cmp tmp
        bcs pmA1
        sta tmp
pmA1:   cmp tmp2
        bcc pmB1
        sta tmp2
pmB1:   lda colH+2,y
        cmp tmp
        bcs pmA2
        sta tmp
pmA2:   cmp tmp2
        bcc pmB2
        sta tmp2
pmB2:   lda colH+3,y
        cmp tmp
        bcs pmA3
        sta tmp
pmA3:   cmp tmp2
        bcc pmB3
        sta tmp2
pmB3:   ldy tmp2
        lda rbT,y
        sta rbv
        ldy tmp
        lda rsT,y
        cmp rbv
        bcs rfRs
        lda rbv                 ; a tall column can put rs below rb; keep the runs disjoint
rfRs:   sta rsv
        ; ---- ceiling run: rows 0 .. rb-1 ----
        lda rbv
rfCw1:  cmp cwA,x               ; operand patched above
        beq rfEdge              ; same length as this buffer already holds: leave it alone
rfCw2:  sta cwA,x
        ; SHRANK -- and a shorter ceiling needs no writes at all. Rows 0..rb-1 are already
        ; blank, being a prefix of what this buffer holds, and the rows the ceiling gave up
        ; (rb..rb_old-1) are overwritten THIS frame by the edge loop, which runs rb..rs-1, or
        ; by the solid chain under it. rfRs clamps rs >= rb, so between them those two always
        ; cover the gap -- which is what makes this safe rather than merely usually right.
        bcc rfEdge
        cmp #$00
        beq rfEdge

        clc
        adc bufOff
        tay
        lda blkLoT,y
        sta jv
        lda blkHiT,y
        sta jv+1
        ldx colc
        lda #$00       ; A must be loaded last: the chain stores it as-is
        jmp (jv)                ; -> descending chain -> jmp rfEdge
        ; ---- wall-top run: rows rb .. rs-1, one real cell each ----
        ; Test at the bottom, not the top: 23 of 40 columns have no edge row at all, and
        ; the old shape made every one of them load erow back out of memory to discover it.
rfEdge: lda rbv
        cmp rsv
        bcs rfSolid             ; nothing between the ceiling and the solid run
        sta erow
        tay                     ; EDGECHAIN: row 0 keeps the generic chooser (see ecRow)
        beq rfEdgeL
        ldx colc
        lda cstepT,x            ; a step column: the generic chooser for all its rows
        and #$03
        bne rfEdgeL
        lda col4T,x
        tax                     ; X = 4*column, which every row of the chain samples from
        lda ecLoT-1,y
        sta jv
        lda ecHiT-1,y
        sta jv+1
        jmp (jv)

rfEdgeL:
        ldy erow
        lda kTabT,y
        sta kr
        ldx colc
        lda col4T,x
        tax                     ; X = 4*column -> logical column of this cell
        lda colH,x              ; cap here, not over all 160 columns: (h + K) has to fit a
        hcp0: cmp #101                ; signed byte, and colH is deliberately left uncapped so the
        bcc rfCp0               ; interpolator's merged spans stay linear
        lda #100
rfCp0:  clc
        adc kr
        tay
        lda ecM16,y
        sta hh0                 ; left level, already shifted into the high nibble
        lda colH+3,x
        hcp1: cmp #101
        bcc rfCp3
        lda #100
rfCp3:  clc
        adc kr
        tay
        lda ecMT,y
        sta hh1                 ; right level (0..12)
        ldy colc                ; through Y, NOT X: X still holds 4*col from the h0/h3 loads
        lda cstepT,y            ; above, and the ramp path's inlined calcM below needs it. The
        and #$03                ; mask subBnd's cell mark; only the POSITION selects a step
        bne rfStep              ; step path clobbers X anyway and rebuilds 4*col for itself.
        lda hh0                 ; single face: ramp, index = wL*16 + wR
        ora hh1                 ; hh0 is already <<4, straight from clmp16
        tay
        ; The ninth bit of the index. The byte in Y is two of the cell's four columns; m is the
        ; other two, and the per-bucket threshold turns it into one bit. Carry from the compare
        ; picks the table, so no wide arithmetic is needed -- the tables are page-aligned and the
        ; index stays a byte in Y.
        ; ---- and 44% of slots do not have a ninth bit at all ----
        ; m is clamp8T + clamp8T, two levels of 0..8, so it can never be negative and "m >= 0"
        ; is a tautology. A threshold of ZERO therefore means "always the hi half, whatever m
        ; is" -- which makes it the exact encoding for "the plan never allocated this slot a
        ; second codeword". Reading the threshold FIRST and bailing on zero skips calcM
        ; entirely: 83 cycles an edge cell, on 435 of 985 slots, for a 7-cycle test and no
        ; change to a single pixel. The build normalises every lo == hi slot to zero (see
        ; rampThrN) so the test catches all of them, not just the 314 that were already zero.
        sty bidx
        lda rampThrT,y
        beq rmpHi
        sta cmv                 ; cmv held m across the kpos dispatch; the threshold needs it
                                ; more, and m no longer has to survive anything
        ; ---- calcM, inlined on the ramp path only ----
        ; X still holds 4*col, which is why the cstepT test above went through Y. As a
        ; subroutine this rebuilt it from colc on EVERY edge cell -- ldx colc / lda col4T,x /
        ; tax, plus the jsr/rts: 21 cycles, on the ~45 of 48 edge cells a frame that are ramps.
        ; The three step sites still call calcM; they clobber X and only 2.7 cells a frame
        ; reach them, so a second inlined copy there would be 40 bytes for nothing.
        lda colH+1,x
        hcp2: cmp #101                ; same cap as the endpoints: (h + K) must fit a signed byte
        bcc rmpM1
        lda #100
rmpM1:  clc
        adc kr
        tay
        lda ecM8,y           ; the LEVEL 0..8, not clampT's 0..15 clamp index
        sta cmtmp
        lda colH+2,x
        hcp3: cmp #101
        bcc rmpM2
        lda #100
rmpM2:  clc
        adc kr
        tay
        lda ecM8,y
        clc
        adc cmtmp               ; A = m
        ldy bidx
        cmp cmv
        bcs rmpHi
        lda rampTlo,y
        jmp rfStore
rmpHi:  lda rampThi,y
        jmp rfStore
        ; A face boundary inside the cell -- a genuinely vertical step, whose position the
        ; renderer reads straight out of cstepT rather than inferring. The old scheme drew a
        ; flat plateau up to that column, but the near wall is still receding across it, so
        ; corners grew a horizontal cap. Sampling the height at the LAST column before the
        ; boundary as well lets the plateau slope: 1.57 -> 0.65 wrong logical columns a frame.
rfStep: sta kpos                ; boundary position, 1..3
        ; VSPLIT: only worth preparing if the column's edge band is at least three rows --
        ; top cell, one or more split cells, far-top cell. A band of one or two rows has no
        ; middle, and vsPrep on every step cell cost the benchmark more than the stacks saved.
        lda rsv
        sec
        sbc rbv
        cmp #$03
        bcc vsNo
        jsr vsPrep              ; side, far-top row and split code for this column
vsNo:
        lda hh0                 ; hh0 arrives pre-shifted for the ramp path; undo that here
        lsr
        lsr
        lsr
        lsr
        tax
        lda qIdxAT,x
        asl
        asl
        asl
        sta tmp                 ; qA*8, the row of qmT
        ldx hh1
        lda qIdxBT,x
        sta qbv
        ldx colc                ; recompute 4*column: cheaper than storing it on every edge
        lda col4T,x             ;   cell when only the 2.7 step cells a frame need it
        clc
        ldy kpos                ; qmColT = 0,1,1,2 -- never w[0], which qA already covers
        adc qmColT,y
        tax
        lda colH,x
        hcp4: cmp #101                ; same cap as the endpoints: (h + K) must fit a signed byte
        bcc rfMc
        lda #100
rfMc:   clc
        adc kr
        tay
        lda ecMT,y
        tax
        lda qIdxMT,x
        ora tmp                 ; qA*8 + qM
        tay
        lda qmT,y               ; -> qA*(LM*LB) + qM*LB, folded so there is no multiply here
        clc
        adc qbv
        tay
        sty bidx                ; calcM is NOT called yet -- see the ramp path: the threshold
                                ; decides whether it is needed at all, and the threshold to read
                                ; depends on kpos, so the dispatch has to come first now. Y holds
                                ; the slot index throughout; nothing below disturbs it.
        lda kpos
        cmp #$02
        beq rfSt2
        bcs rfSt3
        lda stepThrT1,y
        beq st1h                ; threshold 0: no second codeword for this slot, skip calcM
        sta cmv
        jsr calcM
        ldy bidx
        cmp cmv
        bcs st1h
        lda stepT1lo,y
        jmp rfStore
st1h:   lda stepT1hi,y
        jmp rfStore
rfSt2:  lda stepThrT2,y
        beq st2h
        sta cmv
        jsr calcM
        ldy bidx
        cmp cmv
        bcs st2h
        lda stepT2lo,y
        jmp rfStore
st2h:   lda stepT2hi,y
        jmp rfStore
rfSt3:  lda stepThrT3,y
        beq st3h
        sta cmv
        jsr calcM
        ldy bidx
        cmp cmv
        bcs st3h
        lda stepT3lo,y
        jmp rfStore
st3h:   lda stepT3hi,y
        ; Store it at this row and its mirror. This used to hand-build two 16-bit pointers
        ; -- rowLoT/rowHiT + colc with the carry, twice -- and store through them: 85 cycles
        ; to write two bytes. The stub has both addresses baked in and takes the column from
        ; X, exactly like the run chains, so the addressing mode does the arithmetic instead.
rfStore:sta ecode

lda erow
        clc
        adc bufOff
        tay
        lda edgLoT,y
        sta jv
        lda edgHiT,y
        sta jv+1
        ldx colc
        lda ecode
        jmp (jv)                ; -> edA<row>/edB<row> -> inc erow -> jmp rfEdgeL
        ; ---- solid run: rows rs .. 12 ----
        ; ---- EDGECHAIN: rows 1..12, one routine each (see ecRow) ----
ecR1:  ldy colH,x              ; row 1: X = 4*column for the whole chain
        lda ecM16+64,y
        sta hh0
        ldy colH+3,x
        lda ecMT+64,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH1
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+64,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+64,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH1
        lda rampTlo,y
        bcc ecS1              ; always: the bcs above fell through
ecH1:  lda rampThi,y
ecS1:  ldy colc
ecA1:  sta $e028,y
ecB1:  sta $e398,y
        lda #2
        cmp rsv
        bcc ecR2           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR2:  ldy colH,x              ; row 2: X = 4*column for the whole chain
        lda ecM16+72,y
        sta hh0
        ldy colH+3,x
        lda ecMT+72,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH2
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+72,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+72,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH2
        lda rampTlo,y
        bcc ecS2              ; always: the bcs above fell through
ecH2:  lda rampThi,y
ecS2:  ldy colc
ecA2:  sta $e050,y
ecB2:  sta $e370,y
        lda #3
        cmp rsv
        bcc ecR3           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR3:  ldy colH,x              ; row 3: X = 4*column for the whole chain
        lda ecM16+80,y
        sta hh0
        ldy colH+3,x
        lda ecMT+80,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH3
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+80,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+80,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH3
        lda rampTlo,y
        bcc ecS3              ; always: the bcs above fell through
ecH3:  lda rampThi,y
ecS3:  ldy colc
ecA3:  sta $e078,y
ecB3:  sta $e348,y
        lda #4
        cmp rsv
        bcc ecR4           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR4:  ldy colH,x              ; row 4: X = 4*column for the whole chain
        lda ecM16+88,y
        sta hh0
        ldy colH+3,x
        lda ecMT+88,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH4
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+88,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+88,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH4
        lda rampTlo,y
        bcc ecS4              ; always: the bcs above fell through
ecH4:  lda rampThi,y
ecS4:  ldy colc
ecA4:  sta $e0a0,y
ecB4:  sta $e320,y
        lda #5
        cmp rsv
        bcc ecR5           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR5:  ldy colH,x              ; row 5: X = 4*column for the whole chain
        lda ecM16+96,y
        sta hh0
        ldy colH+3,x
        lda ecMT+96,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH5
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+96,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+96,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH5
        lda rampTlo,y
        bcc ecS5              ; always: the bcs above fell through
ecH5:  lda rampThi,y
ecS5:  ldy colc
ecA5:  sta $e0c8,y
ecB5:  sta $e2f8,y
        lda #6
        cmp rsv
        bcc ecR6           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR6:  ldy colH,x              ; row 6: X = 4*column for the whole chain
        lda ecM16+104,y
        sta hh0
        ldy colH+3,x
        lda ecMT+104,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH6
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+104,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+104,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH6
        lda rampTlo,y
        bcc ecS6              ; always: the bcs above fell through
ecH6:  lda rampThi,y
ecS6:  ldy colc
ecA6:  sta $e0f0,y
ecB6:  sta $e2d0,y
        lda #7
        cmp rsv
        bcc ecR7           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR7:  ldy colH,x              ; row 7: X = 4*column for the whole chain
        lda ecM16+112,y
        sta hh0
        ldy colH+3,x
        lda ecMT+112,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH7
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+112,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+112,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH7
        lda rampTlo,y
        bcc ecS7              ; always: the bcs above fell through
ecH7:  lda rampThi,y
ecS7:  ldy colc
ecA7:  sta $e118,y
ecB7:  sta $e2a8,y
        lda #8
        cmp rsv
        bcc ecR8           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR8:  ldy colH,x              ; row 8: X = 4*column for the whole chain
        lda ecM16+120,y
        sta hh0
        ldy colH+3,x
        lda ecMT+120,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH8
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+120,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+120,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH8
        lda rampTlo,y
        bcc ecS8              ; always: the bcs above fell through
ecH8:  lda rampThi,y
ecS8:  ldy colc
ecA8:  sta $e140,y
ecB8:  sta $e280,y
        lda #9
        cmp rsv
        bcc ecR9           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR9:  ldy colH,x              ; row 9: X = 4*column for the whole chain
        lda ecM16+128,y
        sta hh0
        ldy colH+3,x
        lda ecMT+128,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH9
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+128,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+128,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH9
        lda rampTlo,y
        bcc ecS9              ; always: the bcs above fell through
ecH9:  lda rampThi,y
ecS9:  ldy colc
ecA9:  sta $e168,y
ecB9:  sta $e258,y
        lda #10
        cmp rsv
        bcc ecR10           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR10:  ldy colH,x              ; row 10: X = 4*column for the whole chain
        lda ecM16+136,y
        sta hh0
        ldy colH+3,x
        lda ecMT+136,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH10
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+136,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+136,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH10
        lda rampTlo,y
        bcc ecS10              ; always: the bcs above fell through
ecH10:  lda rampThi,y
ecS10:  ldy colc
ecA10:  sta $e190,y
ecB10:  sta $e230,y
        lda #11
        cmp rsv
        bcc ecR11           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR11:  ldy colH,x              ; row 11: X = 4*column for the whole chain
        lda ecM16+144,y
        sta hh0
        ldy colH+3,x
        lda ecMT+144,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH11
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+144,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+144,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH11
        lda rampTlo,y
        bcc ecS11              ; always: the bcs above fell through
ecH11:  lda rampThi,y
ecS11:  ldy colc
ecA11:  sta $e1b8,y
ecB11:  sta $e208,y
        lda #12
        cmp rsv
        bcc ecR12           ; another edge row: straight into its code
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecR12:  ldy colH,x              ; row 12: X = 4*column for the whole chain
        lda ecM16+152,y
        sta hh0
        ldy colH+3,x
        lda ecMT+152,y
        ora hh0
        tay
        lda rampThrT,y
        beq ecH12
        sta cmv
        sty bidx
        ldy colH+1,x
        lda ecM8+152,y
        sta cmtmp
        ldy colH+2,x
        lda ecM8+152,y
        clc
        adc cmtmp
        ldy bidx
        cmp cmv
        bcs ecH12
        lda rampTlo,y
        bcc ecS12              ; always: the bcs above fell through
ecH12:  lda rampThi,y
ecS12:  ldy colc
ecA12:  sta $e1e0,y
        ldx colc                ; rfSolid indexes the seam and run caches by X = COLUMN
        jmp rfSolid
ecLoT:  !byte <ecR1,<ecR2,<ecR3,<ecR4,<ecR5,<ecR6,<ecR7,<ecR8,<ecR9,<ecR10,<ecR11,<ecR12
ecHiT:  !byte >ecR1,>ecR2,>ecR3,>ecR4,>ecR5,>ecR6,>ecR7,>ecR8,>ecR9,>ecR10,>ecR11,>ecR12
rfEdgeT:lda erow                ; bottom of the edge run
        cmp rsv
        bcc vsChk
        jmp rfSolid
vsChk:  ldx vsOn                ; ---- VSPLIT: inside THIS column's stack? ----
        cpx colc                ;   (X, not A: A is erow and the compare below needs it)
        bne rfEdgeL             ; no: the ordinary selection
        cmp vsRow               ; A = erow: before the far top's row, the pure split
        bcs vsEnd
        clc
        adc bufOff
        tay
        lda edgLoT,y
        sta jv
        lda edgHiT,y
        sta jv+1
        ldx colc
        lda vsCode
        sta ecode
        jmp (jv)                ; -> edA<row> -> inc erow -> jmp rfEdgeT
vsEnd:  lda #$ff                ; the far top's row and below: back to real selection
        sta vsOn
        jmp rfEdgeL
rfSolid:; A seam column always redraws. The cache byte HAS room to carry the seam variant as well --
        ; rs is 0..13, so the top nibble is spare -- and that was tried and MEASURED: 25 chain
        ; draws of 80 with it, 25 without. Not one extra hit.
        ;
        ; The reason is worth keeping. rb and rs are quantised to 13 char ROWS, so a column's
        ; wall top must move ~8 pixels to change one -- coarser than a frame of motion, which is
        ; why they hit 69% of the time. A seam's position is one of 4 slots inside a 4-pixel
        ; cell, two physical pixels apiece: finer than a frame of motion, so it changes every
        ; frame and the key never matches. A cache key pays only when it is COARSER than the
        ; movement between frames, and no amount of spare bits changes that.
        lda seamT,x
        cmp #$01
        bne rfSlSm              ; a seam column bypasses the COMPARE entirely -- see below
        lda rsv
rfCb1:  cmp cbA,x
        beq rfNext
rfCb2:  sta cbA,x
        bcs rfNext              ; rs GREW: the solid run starts later, so it only gave rows up,
                                ; and the edge loop (rb..rs-1) has just redrawn every one of
                                ; them. Rows rs..12 are a suffix of what the buffer holds.
        jmp rfSlDr
rfSlSm: cmp #$ee
        beq rfSlMk
        cmp #$f0               ; a NEW FACE's marked fill (or the CURTAIN's): drawn by the plain chain and
        bne rfSlS2              ;   CACHED like it, keyed rs + $40 (rs is 0..13) so the key says
rfSlMk:
        lda rsv                 ;   which fill too. Unlike a seam's, this key is coarse -- a face's
        ora #$40                ;   fill changes only where a face boundary moves -- so it hits.
        bne rfCb1               ;   (always: A >= $40.) PARTIAL's "rs grew" holds mark to mark; plain to mark it
                                ;   would not, so brStr turns a plain entry under a mark to $ff
rfSlS2: lda #$ff              ; $ff is a value rs cannot take, so next frame's compare fails
rfCb3:  sta cbA,x               ; and the column redraws. It must be STORED WITHOUT COMPARING:
                                ; comparing $ff against a cache that already holds $ff matches,
                                ; and the column is skipped even though its seam may have MOVED.
                                ; Collapsing this into the common path cost 914 -> 7117 wrong
                                ; pixels across the six views.
        jmp seamDrw             ; seam columns draw their run out at SEAM_BLK, which is the whole
                                ; cost here: the block below ORB_SMALL has no room for the rest
rfSlDr: lda rsv
        cmp #13
        bcs rfNext
        clc
        adc bufOff
        tay
        lda sldLoT,y
        sta jv
        lda sldHiT,y
        sta jv+1
        ldx colc
        lda seamT,x             ; SOLID, or this column's seam variant
        jmp (jv)                ; -> ascending chain -> jmp rfNext
rfNext: ldx colc
        dex
        bpl rfCol               ; down to column 0
        rts

; calcM: A = w1 + w2, the two columns the bucket index does not carry. Same cap and clamp the
; endpoints get -- (h + K) must fit a signed byte, and clampT is the only thing that turns a
; height into a level. A subroutine rather than inlined twice: 12 cycles of jsr/rts against
; ~40 bytes duplicated, on a path that already costs ~50.
calcM:  ldx colc
        lda col4T,x
        tax
        lda colH+1,x
        hcp5: cmp #101
        bcc cm1
        lda #100
cm1:    clc
        adc kr
        tay
        lda ecM8,y           ; the LEVEL 0..8, not clampT's 0..15 clamp index
        sta cmtmp
        lda colH+2,x
        hcp6: cmp #101
        bcc cm2
        lda #100
cm2:    clc
        adc kr
        tay
        lda ecM8,y
        clc
        adc cmtmp
        rts


; ================= ESDF keyboard =================

; ---- tickDelta: how much time has passed, in 60ths ----
; The step used to be per FRAME, so walking speed rose and fell with the frame rate -- fastest
; down an empty corridor, slowest where the geometry is dense, which is exactly backwards.
; frameCnt is bumped by the top-of-frame raster IRQ, so it counts 60ths of a second no matter
; how long the render took. Called from the main loop rather than from readKeys, so the WALK
; and STRAFE diagnostic builds move at the same speed a player does.
tickDelta:
        ; frameCnt is READ ONCE. It used to be read twice -- once for the difference, once to store
        ; as lastMv -- and when the top-of-frame IRQ landed between the reads, that tick went into
        ; lastMv but never into dtv: lost. About one frame in eight (2026-10-15, level 9's spin),
        ; so a faster frame rate lost MORE time per second: turning measured 4.7% slow at 21 fps
        ; and 1.7% slow at 9 fps -- "rotation is slower when the frame rate is higher" (the user).
        ldx frameCnt
        txa
        sec
        sbc lastMv
        sta dtv
        stx lastMv
        lda dtv
        bne tdCl
        inc dtv                 ; two renders inside one tick: still move a little
tdCl:   lda dtv
        cmp #32
        bcc tdDn
        lda #32          ; a hitch must not step far enough to tunnel a wall
        sta dtv
tdDn:   ; ---- THE PLAYER ALWAYS RUNS (2026-10-09) ----
        ; 3 cells/s and 127 deg/s. There used to be a walk at 0.94 and 63 with SHIFT to run, but
        ; the walk was barely twice an angel's 0.5 cells/s and nothing in the game rewarded it, so
        ; the run is now simply the speed. Done HERE, not in readKeys, so the benchmark movers
        ; (WALK, STRAFE, SPIN...) move at the speed a player does -- the reason tickDelta lives
        ; in the main loop at all. Movement and turning get their own multipliers so running
        ; does not spin the world faster than it moves through it; scaling elapsed TIME rather
        ; than the step keeps both frame-rate independent. Clamped again: 3x a clamped dtv can
        ; pass DT_MAX, and DT_MAX is the anti-tunnelling cap on the STEP, not on the ticks.
        lda dtv
        asl
        clc
        adc dtv                 ; 3x movement: 12 units of 1/256 cell a tick
        cmp #32
        bcc tdM
        lda #32
tdM:    sta dtm
        lda dtv
        asl                     ; 2x turning: 384 units of the 16-bit angle a tick
        cmp #32
        bcc tdT
        lda #32
tdT:    sta dtt
        rts

; (Only in a build that READS the keyboard: an auto-mover build -- every fps, regress and vprof
; workload -- calls its mover in readKeys' place, and the 195 bytes it never ran were exactly the
; room the full game no longer had for a test build's drivers, 2026-11-14.)
readKeys:
        ; read pure joystick-1 first ($dc00=$ff, so no keyboard column pulls $dc01);
        ; joyEor has 1s where a joystick line is active, so we can mask it out of the
        ; keyboard scan (joystick-1 shares $dc01 with the keyboard matrix rows).
        lda #$ff
        sta $dc00
        lda $dc01
        sta joyv
        eor #$ff
        sta joyEor
        lda #$fd
        sta $dc00
        lda $dc01
        ora joyEor
        sta rowv                ; E and S live in this row -- read it once
        and #$40
        beq rkFwd               ; E held
        lda joyv
        and #$01
        bne rkNotE              ; joystick-1 up also moves forward
rkFwd:  jsr moveFwd
rkNotE: lda rowv
        and #$20
        bne rkNotS
        jsr strafeL
rkNotS: lda #$fb
        sta $dc00
        lda $dc01
        ora joyEor
        and #$04
        beq rkBack              ; D held
        lda joyv
        and #$02
        bne rkNotD              ; joystick-1 down also moves back
rkBack: jsr moveBack
rkNotD: lda $dc01
        ora joyEor
        and #$20
        bne rkNotF
        jsr strafeR
rkNotF: lda #$df                ; ---- ',' and '.': the '<' and '>' keys turn, for a keyboard alone ----
        sta $dc00               ; (the user, 2026-11-12). Column 5: ',' is bit 7, '.' bit 4 -- bit 4
        lda $dc01               ;   is also the stick's FIRE, and joyEor forces whatever the stick
        ora joyEor              ;   holds back high, so '>' cannot be read while fire is down.
        sta rowv                ;   E and S are done with rowv by now
        jsr lvKey               ; LVSKIP: 'L' is bit 2 of this column, the stick already masked
        lda joyv
        and #$04
        beq rkSL                ; joystick-1 left
        lda rowv
        bmi rkJR                ; nor ','
        bpl rkTL                ; always: ',' turns left
rkSL:
        lda joyv
        and #$10
        bne rkTL                ; FIRE up: the stick turns
        lda #$01                ; FIRE down: it strafes, and this press no longer picks up or
        sta okStr               ;   puts down when it is let go (see orbKey)
        jsr strafeL
        jmp rkJR
rkTL:   lda dtt                 ; THE TURN, closed form (2026-11-15; it was dtt passes of a loop
        asl                     ;   adding TURN_RATE, ~11 cycles each): TURN_RATE is 192 = 3 x 64,
        adc dtt                 ;   so dtt x 192 is (3 x dtt) << 6 -- 3 x dtt in one shift and add
        tay                     ;   (C clear: dtt <= DT_MAX), its top six bits the whole angle units
        lsr                     ;   and its low two the fraction's top two. Same angle, every frame.
        lsr
        eor #$ff
        tax                     ; X = ~((3 dtt) >> 2): the whole units, complemented to subtract
        tya
        and #$03
        clc                     ; (the lsr's left bit 1 in C) -- three rotates with C clear put
        ror                     ;   bits 1-0 at 7-6, the rest zero, and leave C clear again
        ror
        ror
        eor #$ff                ; ~((3 dtt & 3) << 6)
        sec                     ; paF - frac, pa - whole - borrow: the complement added, C chaining
        adc paF
        sta paF
        txa
        adc pa
        sta pa
rkJR:   lda joyv
        and #$08
        beq rkSR                ; joystick-1 right
        lda rowv
        and #$10
        bne rkJD                ; nor '.'
        beq rkTR                ; always: '.' turns right
rkSR:
        lda joyv
        and #$10
        bne rkTR                ; FIRE up: the stick turns
        lda #$01
        sta okStr
        jmp strafeR             ; FIRE down: it strafes
rkTR:   lda dtt                 ; the turn, closed form: see rkTL
        asl
        adc dtt                 ; 3 x dtt
        tay
        lsr
        lsr
        tax                     ; X = (3 dtt) >> 2: whole angle units
        tya
        and #$03
        clc                     ; (see rkTL: the lsr's left a bit in C)
        ror
        ror
        ror                     ; (3 dtt & 3) << 6: the fraction (C clear after)
        adc paF
        sta paF
        txa
        adc pa                  ; ...carrying into the angle byte
        sta pa
rkJD:   rts

moveFwd:
        ldx pa
        lda moveXT,x
        sta dxv
        lda moveYT,x
        sta dyv
        jmp moveApply
moveBack:
        ldx pa
        lda moveXT,x
        eor #$ff
        clc
        adc #$01
        sta dxv
        lda moveYT,x
        eor #$ff
        clc
        adc #$01
        sta dyv
        jmp moveApply
strafeL:
        lda pa
        sec
        sbc #64
        tax
        lda moveXT,x
        sta dxv
        lda moveYT,x
        sta dyv
        jmp moveApply
strafeR:
        lda pa
        clc
        adc #64
        tax
        lda moveXT,x
        sta dxv
        lda moveYT,x
        sta dyv
moveApply:
        ; Scale the step by elapsed ticks: dxs = dxv * dtm >> MOVE_SHIFT, sign extended to 16
        ; bits. dtm (the run-scaled ticks, tdDn) is small, so repeated addition beats setting up a
        ; multiply, and doing the shift AFTER is what keeps the direction accurate -- the table is
        ; deliberately 16x finer than the step so cos(a) has somewhere to live.
        ldy #$00
        lda dxv
        bpl maSx
        ldy #$ff
maSx:   sty dxSgn
        ldy #$00
        lda dyv
        bpl maSy
        ldy #$ff
maSy:   sty dySgn
        lda rxF                 ; seed each axis with what it had left over last frame, so the
        sta dxs                 ;   sub-quantum part of the step is never lost (see below)
        lda ryF
        sta dys
        lda #$00
        sta dxsH                ; the remainders are 0..2^MOVE_SHIFT-1, so never negative
        sta dysH
        ldx dtm
maLp:   clc
        lda dxs
        adc dxv
        sta dxs
        lda dxsH
        adc dxSgn
        sta dxsH
        clc
        lda dys
        adc dyv
        sta dys
        lda dysH
        adc dySgn
        sta dysH
        dex
        bne maLp
        ; ---- CARRY the remainder, do not round it away ----
        ; The shift below is arithmetic, so it FLOORS, and floor(v/16) + floor(-v/16) = -1 for
        ; any v that is not a multiple of 16. That made a step forward and a step back not
        ; inverses: each pair lost one unit of 1/256 cell on every axis whose product is not a
        ; multiple of 16, always toward -x/-y. Wiggling back and forth therefore walked the
        ; player slowly north-west, a sideways drift whose SCREEN direction depends on facing.
        ; It also meant the rate depended on heading -- cos(a)*dtm/16 truncated, so a diagonal
        ; ran measurably slow -- and that a frame taking 33% longer could cover exactly the
        ; same ground, because both products floored to the same step.
        ;
        ; This used to be fixed by biasing a negative value by 2^SHIFT-1 to truncate toward
        ; zero, which cures the drift and neither of the other two. Keeping the remainder cures
        ; all three at once and is CHEAPER than the bias it replaces: the low bits are the exact
        ; floor remainder in two's complement, so one AND per axis and next frame's accumulation
        ; starts from it. Sum of steps then equals the floor of the sum however the frame times
        ; and the heading wander, forward and back are exact inverses again (r returns to what
        ; it was), and no facing is slow.
        lda dxs
        and #$0f
        sta rxF
        lda dys
        and #$0f
        sta ryF
        ldx #4      ; arithmetic shift: cmp #$80 puts bit 7 back into carry
maSh:   lda dxsH
        cmp #$80
        ror dxsH
        ror dxs
        lda dysH
        cmp #$80
        ror dysH
        ror dys
        dex
        bne maSh
        jsr mvCalcX
        jsr mvCalcY
        jsr mvFree
        bcc mvGo                ; whole step is clear -- the common case, one test
        ; Blocked. Rather than stop dead, retry one axis at a time and take the first that
        ; fits. The component running INTO the wall is the one that fails, so what survives
        ; is the component ALONG it, at full speed: a glancing hit becomes a slide, and a
        ; corner you cut too close is rounded instead of sticking to you.
        ;
        ; No angle threshold is wanted here. A head-on hit has no component along the wall,
        ; so it still stops; as the approach shallows the surviving component grows on its
        ; own. Any explicit cutoff would only add a discontinuity where the smooth version
        ; already does the right thing.
        ;
        ; Dominant axis first. It only matters when BOTH axes fit -- squeezing past a corner
        ; where just the diagonal cell is solid -- and there, continuing the way you were
        ; already heading reads as cutting the corner, while taking the other one reads as
        ; an unexplained sideways jink.
        lda dxv
        bpl mvAbx
        eor #$ff
        clc
        adc #$01
mvAbx:  sta tmp                 ; |dx|
        lda dyv
        bpl mvAby
        eor #$ff
        clc
        adc #$01
mvAby:  cmp tmp                 ; |dy| - |dx|
        bcs mvYfst
        jsr mvTryX
        bcc mvGo
        jsr mvTryY
        bcc mvGo
        rts                     ; both axes blocked: a real dead end, stand still
mvYfst: jsr mvTryY
        bcc mvGo
        jsr mvTryX
        bcc mvGo
        rts
mvGo:   lda nxL
        sta px
        lda nxH
        sta px+1
        lda nyL
        sta py
        lda nyH
        sta py+1
        rts

mvTryX: jsr mvCalcX             ; X component alone: hold Y where it already is
        lda py
        sta nyL
        lda py+1
        sta nyH
        jmp mvFree              ; tail call: its carry is our answer
mvTryY: jsr mvCalcY             ; Y component alone: hold X where it already is
        lda px
        sta nxL
        lda px+1
        sta nxH
        jmp mvFree

mvCalcX:clc                     ; nx = px + dxs, already a proper signed 16-bit step
        lda px
        adc dxs
        sta nxL
        lda px+1
        adc dxsH
        sta nxH
        rts
mvCalcY:clc
        lda py
        adc dys
        sta nyL
        lda py+1
        adc dysH
        sta nyH
        rts
; mvFree: is the player box at (nx, ny) clear? Returns carry SET if blocked, clear if free,
; so callers can chain attempts with bcc. It reads nx/ny and touches nothing else, which is
; what lets moveApply probe three candidate positions with one copy of the test.
;
; The player is a small square, not a point. Testing only the centre let you stand with
; your face flat against a wall at distance 0, which looks wrong and drives the wall height
; to absurd values (88/d). Radius is a hardcoded 26/256 = 0.10 cells -- computing it per
; frame would be pointless, it never changes.
;
; Note this does NOT stop colH from saturating: that needs 0.35 cells of clearance, which
; would feel like walking in a padded corridor. Saturation is handled properly in the
; span-merge instead (see subLp).
mvFree: sec                     ; cx0 = (nx - r) >> 8
        lda nxL
        sbc #26
        lda nxH
        sbc #$00
        sta cx0
        clc                     ; cx1 = (nx + r) >> 8
        lda nxL
        adc #26
        lda nxH
        adc #$00
        sta cx1
        sec                     ; cy0 = (ny - r) >> 8
        lda nyL
        sbc #26
        lda nyH
        sbc #$00
        sta cy0
        clc                     ; cy1 = (ny + r) >> 8
        lda nyL
        adc #26
        lda nyH
        adc #$00
        sta cy1
        lda cx0                 ; any corner off the map (or wrapped) rejects the move
        cmp lvlDimT             ; ...against the LIVE LEVEL's width and height (lvlDimT is
        bcs mvBlk               ;   swapped with the level). At a fixed 16 this was an invisible
        lda cx1                 ;   wall down the x=16 line -- the join of a combined level.
        cmp lvlDimT
        bcs mvBlk
        lda cy0
        cmp lvlDimT+1
        bcs mvBlk
        lda cy1
        cmp lvlDimT+1
        bcs mvBlk
        ; All four corners must be open -- except an ENTITY's cell that your box is ALREADY on. An
        ; entity can end up under you (die holding the idol on the level's start cell and it drops
        ; exactly where you respawn); every move keeps a corner on it until you are fully clear, so
        ; blocking it froze you in place. The exemption is the CURRENT BOX, not your centre cell: the
        ; box reaches COLL_R past the centre, and a centre-only rule stuck you again on the cell edge.
        ; Once you are fully off it, it blocks as usual. Walls never get the exemption.
        lda cy0
        jsr mulW
        sta tmp
        clc
        adc cx0
        tax
        lda blkT,x
        beq mvOw0
        cmp #$02                ; an ENTITY -- walls (1) always block
        bne mvBlk
        lda cx0                ; ...and only if your box is not on that cell already
        ldy cy0
        jsr mvMine
        bcs mvEnt
mvOw0:
        lda tmp                 ; the row offset again -- ADDX, not ora: this reuses a stored
        clc
        adc cx1                  ;   y*MAPW so there is no MULW in front of it to spot
        tax
        lda blkT,x
        beq mvOw1
        cmp #$02                ; an ENTITY -- walls (1) always block
        bne mvBlk
        lda cx1                ; ...and only if your box is not on that cell already
        ldy cy0
        jsr mvMine
        bcs mvEnt
mvOw1:
        lda cy1
        jsr mulW
        sta tmp
        clc
        adc cx0
        tax
        lda blkT,x
        beq mvOw2
        cmp #$02                ; an ENTITY -- walls (1) always block
        bne mvBlk
        lda cx0                ; ...and only if your box is not on that cell already
        ldy cy1
        jsr mvMine
        bcs mvEnt
mvOw2:
        lda tmp                 ; the row offset again -- ADDX, not ora: this reuses a stored
        clc
        adc cx1                  ;   y*MAPW so there is no MULW in front of it to spot
        tax
        lda blkT,x
        beq mvOw3
        cmp #$02                ; an ENTITY -- walls (1) always block
        bne mvBlk
        lda cx1                ; ...and only if your box is not on that cell already
        ldy cy1
        jsr mvMine
        bcs mvEnt
mvOw3:
        clc                     ; all four corners open
        rts
mvEnt:  lda marked              ; refused by an ENTITY (X = its cell): is it the angel that has
        beq mvBlk               ;   you? Then you walked into it -- backing, strafing, it does not
        cpx markC               ;   matter which, or whether you could see it: it has you, and
        bne mvBlk               ;   dcTurn starts the scene. A = marked, never 0 here.
        sta mvBmp
mvBlk:  sec
        rts
; mvMine: is cell (A = column, Y = row) under the player's CURRENT box? Carry CLEAR = yes.
; Only reached when a corner hits an entity, so its cost lands on the rare blocked move, not on
; every step. px/py are 16-bit with the cell in the high byte, as in mvFree.
mvMine: sta mvTc
        sty mvTr
        sec                     ; left edge: (px - r) >> 8 must be <= the column
        lda px
        sbc #26
        lda px+1
        sbc #$00
        cmp mvTc
        beq mvM1
        bcs mvMo
mvM1:   clc                     ; right edge: (px + r) >> 8 must be >= the column
        lda px
        adc #26
        lda px+1
        adc #$00
        cmp mvTc
        bcc mvMo
        sec                     ; top edge
        lda py
        sbc #26
        lda py+1
        sbc #$00
        cmp mvTr
        beq mvM2
        bcs mvMo
mvM2:   clc                     ; bottom edge
        lda py
        adc #26
        lda py+1
        adc #$00
        cmp mvTr
        bcc mvMo
        clc
        rts
mvMo:   sec
        rts

; ================= seamSpan: project this face's cell boundaries to columns =========
; The span runs along ONE flat face, so u (the coordinate along it) is monotonic and every
; integer strictly between u[spanL] and u[spanR] is a cell boundary the wall crosses.
;
; Screen position of one: 1/z is linear in screen column -- that is exactly why the height
; merge is exact -- and u = (u/z)/(1/z) with u/z also linear. Writing h for colH (which IS
; 1/z up to a constant), a = |u_L - k| and b = |u_R - k|, the split falls at
;
;     c = spanL + (spanR - spanL) * h_L*a / (h_L*a + h_R*b)
;
; one divide per seam, no extra rays and no per-column work. Everything below is that.
seamSpan:
        ; ---- cheapest and most exclusive FIRST ----
        ; Measured over 405 frames at the hall viewpoint: this rejects HALF of everything offered,
        ; for two loads and a compare. It used to run third, behind the width and SEAMFAR tests,
        ; which reject 10% and 11% and cost more between them.
        ; A run is a contiguous line of cells along ONE plane, so its cells can only differ in the
        ; coordinate that runs along the face -- comparing raw cell ids IS the boundary test, with
        ; no masking and no knowledge of which way the wall faces.
        ldx spanL
        lda idT,x
        ldx spanR
        cmp idT,x
        beq ssDn                ; identical cell -> no boundary between the ends
        lda spanR
        sec
        sbc spanL
        cmp #$07
        bcc ssDn                ; ---- too narrow a face to hold a line at all ----
                                ; A face carries corner marks at spanL and spanR+1, and a panel
                                ; line must clear both by four columns: it needs c >= spanL+4 and
                                ; c <= spanR-3, impossible below seven columns wide. Anything
                                ; narrower used to be walked, projected, and then thrown out by
                                ; the distance rule against its own corners.
                                ; Not quite free: the height cutoff can drop a corner, and then a
                                ; narrow face could have held a line after all.
        sta ssW                 ; span width in columns
        ; ---- SEAMFAR: drop the panel line once the wall is too short to show one ----
        ; colH is a height in ROWS, so it is 1/z up to a constant and the whole distance test is
        ; one compare -- no arithmetic, and it lands BEFORE calcU and the divide, which is where
        ; the cost actually is. Keep the TALLER end: a span running away from you still has a
        ; near end worth marking, and only when BOTH ends are small is there nothing to see.
        ldx spanL
        lda colH,x
        ldx spanR
        cmp colH,x
        bcs ssTall
        lda colH,x
ssTall: cmp #$0b
        bcc ssDn                ; too far for a one-pixel line to read as panelling

        ; Cheap reject FIRST. idT already holds the hit cell at both ends, and the cell
        ; coordinate along the face is the whole question: same cell, no boundary. 65% of
        ; spans stop on this test, which is exactly why u is derived here instead of in
        ; marchCol -- computing it for all 19 marched columns spent ~2850 cycles a frame
        ; to use about a third of the answer.
        ldx spanL               ; now it is worth deriving u
        jsr calcU
        lda uwL
        sta uaL
        lda uwH
        sta uaH
        ldx spanR
        jsr calcU
        lda uwL
        sta ubL
        lda uwH
        sta ubH
        ; Walk the integer coordinates between the two ends. Direction first: the face can
        ; run either way across the screen.
        lda uaH
        cmp ubH
        beq ssDn                ; same cell, no boundary crossed -- the common case
        ; ---- walk the NEAR end of the face FIRST ----
        ; The old walk always started at spanL, which is the left of the SCREEN and has nothing to
        ; do with which end is near. It matters because ssAny stops the walk once the span has no
        ; writable cell left: whatever is reached first is what survives. A near line is wider,
        ; steadier and better placed, so it should be the one that gets the room.
        ; The taller end is the near one -- colH is 1/z up to a constant, so this is one compare.
        ldx spanL
        lda colH,x
        ldx spanR
        cmp colH,x
        bcc ssNrR
        lda uaH                 ; spanL is the near end
        sta ssK
        sec
        sbc ubH
        jmp ssNc
ssNrR:  lda ubH                 ; spanR is the near end
        sta ssK
        sec
        sbc uaH
ssNc:   bcs ssNp                ; near u > far u: walk DOWN away from the player
        eor #$ff                ; near u < far u: walk UP; carry is clear, so this negates
        adc #$01
        inc ssK                 ;   and the first boundary above the near end is near+1
        ldx #$00
        stx ssDir
        jmp ssCnt
ssNp:   ldx #$01
        stx ssDir
        ; This USED to reject a span covering more than 16 cells, on the grounds that u must be
        ; junk -- castRay's far/guard exits leave remL/remH meaningless. It was dead in that role:
        ; castRay's old step-guard exit was unreachable with a solid border, and the build asserts a solid
        ; border. What it actually did was silently deny seams to any wall longer than 16 cells,
        ; near part included, because it rejects before ssCutS could clip the far end.
        ; The only real requirement is that the count fit the byte the walk counts down, and that
        ; is proved at build time from the map's dimensions. SEAMMAXN=n restores a cap for
        ; experiments.
ssCnt:  sta ssN
        jsr ssCutS              ; the column where this wall gets too short for a line
        jsr ssPwS               ; dp, and the widest s that still leaves a placeable panel


        ; Every boundary this walk emits is INTERIOR to the run: uaH/ubH are the cells the two
        ; end rays land in, so the outer edges of the wall are never crossed between them. The
        ; corner at the end of a receding wall is marked by subFace instead, which is where it
        ; gets suppressed.
ssLp:   jsr ssPw                ; no panel wide enough to place a line in: stop, because the
        bcs ssDn                ;   face only gets narrower from here

        jsr seamOne
        dec ssN
        beq ssDn
        lda ssDir               ; step k toward the far end, in the order chosen at setup
        bne ssKdn
        inc ssK
        jmp ssLp
ssKdn:  dec ssK
        jmp ssLp
ssDn:   rts


; Can ANY cell of this span still take a seam? A cell qualifies only if it AND both its
; neighbours are unmarked -- the same three-cell rule seamOne applies below -- so a span can
; be exhausted long before its boundaries run out. Down a hall that is the ordinary case: five
; char cells, a corner on each outer one, their neighbours blocked by adjacency, and exactly
; ONE cell in the middle that can ever hold a line. However long the wall is, three cells or
; twenty, it can only ever produce that single seam, and once it is placed every remaining
; boundary is guaranteed to be discarded -- so the walk stops instead of projecting them.
;
; This is the test SEAMPRE got wrong. It asked whether a cell was still SOLID, which is a much
; weaker question than whether one can be WRITTEN: a free cell next to a corner is unusable,
; and down a hall most free cells are exactly that. Asking the weak question, nothing ever
; looked exhausted and the pre-test never fired.


; u for one marched column (X): where along the wall the ray landed, 8.8 cells.
; A y-face is a wall of constant y, so the coordinate that varies along it is x, and vice
; versa. u = p + d*dir, one sideMul: sideMul(fr, m) returns fr/256 * m, so feeding it |cos|
; (or |sin|) as 0..255 against the parked hit distance gives exactly d*|dir|.
; Both come from qcosT, |cos| over one quarter circle at the ray's own fine angle, and so does
; the sign: no table at all. (Until 2026-11-02 it was |sin|/|cos| on the BYTE angle, lerped with
; the fine angle's two spare bits, and two sign tables -- 640 bytes, the slower way round to a less
; exact answer, and the sign was wrong in the first quarter-unit past each axis.)
calcU:  lda remLoT,x
        sta mlo
        lda remHiT,x
        sta mhi
        ; ---- the angle the ray was actually CAST at, to quarter resolution ----
        ; Same inputs as the caster: paq is formed once a frame, rayOffQS holds the per-column
        ; quarter offsets. The quadrant is the high byte's bits 0-1, the angle within it the low byte.
        lda rayOffQS,x
        bmi cuAN
        clc
        adc paqL
        sta cuQL
        lda paqH
        adc #$00
        jmp cuAH
cuAN:   clc
        adc paqL
        sta cuQL
        lda paqH
        adc #$ff                ; sign-extended: -1 in the high byte
cuAH:   sta cuQH                ; only bits 0-1 are read from here on
        ldy #py-px              ; side 0, a face across x: u runs along y -- |sin|, from py
        lda sideT,x
        beq cuSin
        ldy #$00                ; side 1: along x -- |cos|, from px, and
        inc cuQH                ;   |cos q| = |sin(q + a quarter turn)|, sign and all
cuSin:  sty cuP
        lda cuQH
        lsr                     ; C = an odd quadrant: |sin| climbs the quarter circle there,
        lda cuQL                ;   qcosT[r], and comes down it in an even one, qcosT[256 - r]
        bcs cuUp
        eor #$ff
        adc #$01                ; (C clear) 256 - r ...
        beq cuZ                 ; ...but r = 0 is a whole quadrant, where the sine is exactly 0
cuUp:   tax
        lda qcosT,x
cuZ:    sta fr
        jsr sideMul
        ldx cuP
        lda cuQH
        and #$02                ; quadrants 0 and 1: the sine is positive
        bne cuNeg
        clc
        lda px,x
        adc s1
        sta uwL
        lda px+1,x
        adc s2
        sta uwH
        rts
cuNeg:  sec
        lda px,x
        sbc s1
        sta uwL
        lda px+1,x
        sbc s2
        sta uwH
        rts



; (level code 'haz' cut here: see LX_SRC)
; ================= march one column: cast + store colH/idT =================
marchCol:
        jsr castRay
        ldx col
        lda pp
        sta colH,x
        lda side
        sta sideT,x             ; side kept separate (avoids id/side bit collision)
        lda cell                ; castRay already maintains the cell id
        sta idT,x               ; X is still col -- nothing since the store above touches it
        ; --- faceIdT = connected-wall-run id: "same wall" means same contiguous run,
        ;     not merely same plane -> the merge cannot span a hallway gap ---
        tay                     ; Y = cell id (index into run tables)
        lda side
        bne friS1
        lda stpX                ; side0: +x ray hits WEST face, -x hits EAST face
        bmi friE
        lda runWT,y
        jmp friSto
friE:   lda runET,y
        jmp friSto
friS1:  lda stpY                ; side1: +y ray hits NORTH face, -y hits SOUTH face
        bmi friSo
        lda runNT,y
        jmp friSto
friSo:  lda runST,y
friSto: sta faceIdT,x
           ; X still col: the run-table branch above only uses A and Y
        lda remL                ; park the raw hit distance; u is derived from it later, and
        sta remLoT,x            ; only for the ~35% of spans that actually cross a boundary
        lda remH                ; -- and the PIVOT reads it too: a hint's reciprocal is taken from
        sta remHiT,x            ; it. This was SEAMS-only, so a SEAMS=0 build read stale distances
                                ; and every translation prediction was garbage: walking, 11% of
                                ; brackets landed against 66% with no translation term at all
                                ; (tools/pivlab.mjs, 2026-10-15). Shipping builds have seams.
        rts

; ===== interpolate colH linearly across a same-face span [spanL,spanR] (Bresenham) =====
interpSpan:
        lda spanR
        sec
        sbc spanL
        sta dxv                 ; width (>=1)
        cmp #$02
        bcc isDn                ; no interior columns
        ldx spanL
        lda colH,x
        sta hcur                ; h = colH[spanL]

        ldx spanR
        lda colH,x
        sec
        sbc hcur                ; colH[R]-colH[L]
        bcs isPos
        eor #$ff
        clc
        adc #$01
        sta dyv
        lda #$01
        sta syNeg
        jmp isErr
isPos:  sta dyv
        lda #$00
        sta syNeg
        ; The error term overflows 8 bits exactly when dxv + dyv > 255: err stays below dxv
        ; (span width, up to 159) and dyv is the height delta (up to 254), so err+dyv can
        ; reach 413. Dropping that carry made the whole span interpolate garbage -- a
        ; receding near wall stayed far too tall right up to the next marched column.
        ; Test once per span and use the cheap 8-bit loop when it cannot happen, which is
        ; the overwhelming majority of spans.
isErr:  lda dxv
        lsr
        sta errv                ; err = width/2
        lda spanL
        sta col
        ; --- 8-bit fast path ---
        ; This loop sets 92% of all 160 colH values (only ~13 columns are actually marched),
        ; so it is worth spending every register on it: X = col, Y = hcur, A = err, and no
        ; zero-page traffic per column beyond the one colH store. Three details pay for
        ; themselves:
        ;   - ascending and descending are separate loops, so the syNeg test happens once
        ;     per span instead of once per Bresenham step;
        ;   - no clc before "adc dyv": falling through "cpx spanR" already leaves carry
        ;     clear, and so does the branch that ends the subtract loop;
        ;   - no sec before "sbc dxv": the "cmp dxv" that got us there already set carry.
        ; 63% of columns take zero Bresenham steps and 23% take one, so the fixed per-column
        ; cost dominates and that is what these target -- 53 cycles/column down to 38.
        ; SHYCOL: A carries err from column to column, so the group's bounds test may not
        ; touch it. "x + 4 < spanR" becomes "x < spanR - 4" against an immediate patched once
        ; per span; spanR < 4 patches 0, which no X is below. Falling through leaves carry
        ; clear, as the bodies need.
        lda spanR
        sec
        sbc #$04
        bcs isLim
        lda #$00
isLim:  sta isA8+1
        sta isDl8+1
        ldy hcur
        lda errv
        ldx syNeg
        bne isD8
        ldx spanL
isA8:   cpx #$00                ; --- ascending, four columns per bounds test ---
        bcs isA1                ; PATCHED to spanR - 4 (isLim); A is err, untouched
        inx
        adc dyv
        bcs isha1            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswa1
issa1:  sbc dxv
        iny
        cmp dxv
        bcs issa1
iswa1:
        !byte $9c,<colH,>colH   ; = "sty colH,x" (SHY, undocumented -- see STY_COLH_X)
        inx
        adc dyv
        bcs isha2            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswa2
issa2:  sbc dxv
        iny
        cmp dxv
        bcs issa2
iswa2:
        !byte $9c,<colH,>colH   ; = "sty colH,x" (SHY, undocumented -- see STY_COLH_X)
        inx
        adc dyv
        bcs isha3            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswa3
issa3:  sbc dxv
        iny
        cmp dxv
        bcs issa3
iswa3:
        !byte $9c,<colH,>colH   ; = "sty colH,x" (SHY, undocumented -- see STY_COLH_X)
        inx
        adc dyv
        bcs isha4            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswa4
issa4:  sbc dxv
        iny
        cmp dxv
        bcs issa4
iswa4:
        !byte $9c,<colH,>colH   ; = "sty colH,x" (SHY, undocumented -- see STY_COLH_X)
        jmp isA8
isha1:  sec
        sbc dxv
        iny
        bcs isha1            ; no borrow -> the 9th bit is still set
        cmp dxv
        bcc iswa1
        bcs issa1            ; always
isha2:  sec
        sbc dxv
        iny
        bcs isha2            ; no borrow -> the 9th bit is still set
        cmp dxv
        bcc iswa2
        bcs issa2            ; always
isha3:  sec
        sbc dxv
        iny
        bcs isha3            ; no borrow -> the 9th bit is still set
        cmp dxv
        bcc iswa3
        bcs issa3            ; always
isha4:  sec
        sbc dxv
        iny
        bcs isha4            ; no borrow -> the 9th bit is still set
        cmp dxv
        bcc iswa4
        bcs issa4            ; always
isA1: inx
        cpx spanR
        bcs isDn
        adc dyv                 ; carry clear: cpx fell through
        bcs isAhi           ; 9th bit: same handling as the unrolled bodies
        cmp dxv
        bcc isAWr
isAsb:  sbc dxv                 ; carry set by the cmp above / by this sbc
        iny
        cmp dxv
        bcs isAsb
isAWr:                          ; store h; A keeps err
        !byte $9c,<colH,>colH   ; = "sty colH,x" (SHY, undocumented -- see STY_COLH_X)
        jmp isA1
isAhi: sec
        sbc dxv
        iny
        bcs isAhi
        cmp dxv
        bcc isAWr
        bcs isAsb           ; always
isD8:   ldx spanL               ; --- descending ---
isDl8:  cpx #$00                ; PATCHED to spanR - 4 (isLim)
        bcs isD1
        inx
        adc dyv
        bcs ishd1            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswd1
issd1:  sbc dxv
        dey
        cmp dxv
        bcs issd1
iswd1:
        !byte $9c,<colH,>colH   ; = "sty colH,x" (SHY, undocumented -- see STY_COLH_X)
        inx
        adc dyv
        bcs ishd2            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswd2
issd2:  sbc dxv
        dey
        cmp dxv
        bcs issd2
iswd2:
        !byte $9c,<colH,>colH   ; = "sty colH,x" (SHY, undocumented -- see STY_COLH_X)
        inx
        adc dyv
        bcs ishd3            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswd3
issd3:  sbc dxv
        dey
        cmp dxv
        bcs issd3
iswd3:
        !byte $9c,<colH,>colH   ; = "sty colH,x" (SHY, undocumented -- see STY_COLH_X)
        inx
        adc dyv
        bcs ishd4            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswd4
issd4:  sbc dxv
        dey
        cmp dxv
        bcs issd4
iswd4:
        !byte $9c,<colH,>colH   ; = "sty colH,x" (SHY, undocumented -- see STY_COLH_X)
        jmp isDl8
ishd1:  sec
        sbc dxv
        dey
        bcs ishd1            ; no borrow -> the 9th bit is still set
        cmp dxv
        bcc iswd1
        bcs issd1            ; always
ishd2:  sec
        sbc dxv
        dey
        bcs ishd2            ; no borrow -> the 9th bit is still set
        cmp dxv
        bcc iswd2
        bcs issd2            ; always
ishd3:  sec
        sbc dxv
        dey
        bcs ishd3            ; no borrow -> the 9th bit is still set
        cmp dxv
        bcc iswd3
        bcs issd3            ; always
ishd4:  sec
        sbc dxv
        dey
        bcs ishd4            ; no borrow -> the 9th bit is still set
        cmp dxv
        bcc iswd4
        bcs issd4            ; always
isD1: inx
        cpx spanR
        bcs isDn
        adc dyv
        bcs isDhi           ; 9th bit: same handling as the unrolled bodies
        cmp dxv
        bcc isDWr
isDsb:  sbc dxv
        dey
        cmp dxv
        bcs isDsb
isDWr:
        !byte $9c,<colH,>colH   ; = "sty colH,x" (SHY, undocumented -- see STY_COLH_X)
        jmp isD1
isDhi: sec
        sbc dxv
        dey
        bcs isDhi
        cmp dxv
        bcc isDWr
        bcs isDsb           ; always
isDn:   rts

; ================= cast one ray (16-bit DDA) =================
castRay:
        ldx col
        ; The coarse angle is gone: the step signs now come from the fine angle's quarter.
        ; ---- 10-bit ray angle for the DDA deltas ----
        ; Dispatch on the quarter rather than patching four operands: rqH is 0..3, so four load
        ; blocks with the page folded into the absolute address cost ~8 cycles, against ~40 to
        ; self-modify. Only 13.2 rays are cast a frame, so this is ~400 cycles total.
        lda rayOffQS,x          ; signed: sign-extend into the high byte by hand
        bmi faNeg
        clc
        adc paqL
        sta rqL
        lda paqH
        adc #$00
        jmp faHi
faNeg:  clc
        adc paqL
        sta rqL
        lda paqH
        adc #$ff                ; -1 in the high byte
faHi:   and #$03
        sta rqH                 ; which quarter of the circle the FINE angle is in
        ldy rqL
        ; ---- TWO PAGES OF TABLE SERVE ALL FOUR QUARTERS, AND THERE IS NO ddy AT ALL ----
        ; ddx = SCALE/|cos| and ddy = SCALE/|sin|, and both identities below are proved
        ; byte-for-byte at build time rather than argued from the trigonometry:
        ;   |cos| has period HALF a circle, so quarters 2 and 3 repeat quarters 0 and 1
        ;     -> only BIT 0 of the quarter selects a page.
        ;   sin and cos are a quarter turn apart, and a quarter of 1024 is exactly 256 --
        ;     one whole page -- so ddy is the OTHER page at the same index.
        ; So the whole 4KB of quarter-angle deltas is 1KB, the dispatch is one branch instead
        ; of four compares, and not a cycle of it is spent on the folding.
        lsr                     ; carry = bit 0 of the quarter; ldy above leaves it alone
        bcs faOdd
        lda ddxLoTQ,y           ; even quarter: ddx from page 0, ddy from page 1
        sta ddx
        lda ddxHiTQ,y
        sta ddxH
        lda ddxLoTQ+256,y
        sta ddy
        lda ddxHiTQ+256,y
        sta ddyH
        jmp faDn
faOdd:  lda ddxLoTQ+256,y       ; odd quarter: the two pages swap roles
        sta ddx
        lda ddxHiTQ+256,y
        sta ddxH
        lda ddxLoTQ,y
        sta ddy
        lda ddxHiTQ,y
        sta ddyH
faDn:
        ; X side dist: m = frac*ddx>>8 ; -x -> sdx=m ; +x -> sdx=ddx-m
        ; (standard form: full cell at frac=0, avoids the fr=256->0 wrap spike)
        ; --- sideMul inlined: a jsr/rts pair here is 12 cy a call, 24 a ray, ~770 a
        ; --- frame. Every other caller still uses the subroutine.
        ; It reads px / ddxH / ddx DIRECTLY rather than copying them into fr / mhi / mlo first.
        ; All six are zero page, so the copies bought nothing and cost 18 cycles an axis --
        ; 36 a ray, ~720 a frame. The names only ever existed as sideMul's argument protocol,
        ; and an inlined body has no protocol to honour.
        ; ---- DIRECTION FIRST, so each axis is ONE multiply by the right fraction ----
        ; Stepping -x, the side distance is to THIS cell's line: frac * ddx. Stepping +x it is to
        ; the NEXT line: (1 - frac) * ddx. That used to be computed as ddx - frac*ddx, a 16-bit
        ; subtract after the multiply; now the multiply is simply given 1 - frac. As a byte that
        ; is 255 - frac (eor #$ff), one 256th short of 256 - frac, so the distance comes out
        ; short by ddx/256 -- 1/256 of a cell crossing, the same size as the low-half rounding
        ; below, and never the 256 -> 0 wrap that 256 - frac would hit at frac = 0.
        ; Step signs come from the FINE angle's quarter (rqH): cos >= 0 in quarters 0 and 3,
        ; sin >= 0 in quarters 0 and 1. (The coarse angle once disagreed at axis boundaries.)
        lda rqH
        beq cxpos
        cmp #$03
        beq cxpos
        lda #$ff
        sta stpX
        lda #$ca                ; dex: the DDA's X step, patched rather than added -- see cxInc
        sta cxInc
        lda px                  ; -x: frac
        jmp cxFr
cxpos:  lda #$01
        sta stpX
        lda #$e8                ; inx
        sta cxInc
        lda px
        eor #$ff                ; +x: 1 - frac (as 255 - frac)
cxFr:   sta frc
        ; ---- ddxH == 1: THE HIGH HALF IS THE FRACTION ITSELF ----
        ; The delta is SCALE/|cos| with SCALE = 256, so its high byte is exactly 1 whenever
        ; |cos| > 0.5 -- and every ray has at least one such axis. fr * 1 needs no quarter-square
        ; pair: it is fr, exactly (f(fr+1) - f(fr-1) = fr with no rounding), so the result is
        ; byte-identical. 17 cycles against ~60; the full product pays 10 for the test.
        ldx ddxH
        dex
        beq cxm1
        lda frc                  ; --- high half: fr * mhi -> sdxH:s1 ---
        clc
        adc ddxH
        tax
        bcc cxmh0
        lda f1LoT,x
        tay                     ; the low byte rides in Y instead of zero page: this routine
        lda f1HiT,x             ; never used Y at all, and it is the hottest one here
        sta sdxH
        jmp cxmh1
cxmh0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta sdxH
cxmh1:   lda frc
        sec
        sbc ddxH
        bcs cxmh2
        eor #$ff                ; |fr-mhi|; carry is already clear from the borrow
        adc #$01
cxmh2:   tax
        sec
        tya
        sbc f0LoT,x
        sta sdx
        lda sdxH
        sbc f0HiT,x
        sta sdxH
        jmp cxmL
cxm1:   lda frc                  ; ddxH == 1: sdxH:sdx = 0:fr (X is 0 after the dex)
        sta sdx
        stx sdxH
cxmL:   lda frc                  ; --- low half: only the HIGH byte survives the >>8 ---
        clc
        adc ddx
        tax
        bcc cxml0
        lda f1HiT,x
        sta qhi
        jmp cxml1
cxml0:   lda f0HiT,x
        sta qhi
cxml1:   lda frc
        sec
        sbc ddx
        bcs cxml2
        eor #$ff
        adc #$01
cxml2:   tax
        ; THE BORROW FROM THE LOW BYTES IS DELIBERATELY NOT COMPUTED. This half only ever
        ; contributed the high byte of fr*ddxL, so the two low-byte loads and the subtract
        ; that produced their borrow existed only to be +/-1 correct in the LAST bit.
        ; Dropping them leaves the product high by 0 or 1 -- the side distance wrong by at
        ; most 1/256 of a cell, one-sided, and NOT accumulated: the DDA adds exact deltas
        ; from here on. On screen: colH = 88/d so dColH ~ 88*(1/256)/d^2, and a wall top is
        ; only VISIBLE below colH 100, i.e. d >= 0.88 cells -- so the worst visible error is
        ; 0.45 of a logical pixel, falling off as the square of distance.
        sec
        lda qhi
        sbc f0HiT,x             ; high byte of fr*ddxL, straight into sdx
        clc
        adc sdx
        sta sdx
        lda sdxH
        adc #$00
        sta sdxH

cydo:
        ; --- sideMul inlined; reads py / ddyH / ddy directly, see the X axis above ---
        ; ---- direction first, as on the X axis ----
        lda rqH                 ; sin >= 0 in quarters 0 and 1
        cmp #$02
        bcc cypos
        lda #$ff
        sta stpY
        lda lvlDimT             ; stepping -y is X += -MAPW, i.e. X -= MAPW (see cyStep)
        sta cyStep+1
        lda py                  ; -y: frac
        jmp cyFr
cypos:  lda #$01
        sta stpY
        lda lvlDimT+2           ; stepping +y is X += MAPW, i.e. X -= -MAPW (see cyStep)
        sta cyStep+1
        lda py
        eor #$ff                ; +y: 1 - frac (as 255 - frac)
cyFr:   sta frc
        ; ---- ddyH == 1: THE HIGH HALF IS THE FRACTION ITSELF ----
        ; The delta is SCALE/|sin| with SCALE = 256, so its high byte is exactly 1 whenever
        ; |sin| > 0.5 -- and every ray has at least one such axis. fr * 1 needs no quarter-square
        ; pair: it is fr, exactly (f(fr+1) - f(fr-1) = fr with no rounding), so the result is
        ; byte-identical. 17 cycles against ~60; the full product pays 10 for the test.
        ldx ddyH
        dex
        beq cym1
        lda frc                  ; --- high half: fr * mhi -> sdyH:s1 ---
        clc
        adc ddyH
        tax
        bcc cymh0
        lda f1LoT,x
        tay                     ; the low byte rides in Y instead of zero page: this routine
        lda f1HiT,x             ; never used Y at all, and it is the hottest one here
        sta sdyH
        jmp cymh1
cymh0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta sdyH
cymh1:   lda frc
        sec
        sbc ddyH
        bcs cymh2
        eor #$ff                ; |fr-mhi|; carry is already clear from the borrow
        adc #$01
cymh2:   tax
        sec
        tya
        sbc f0LoT,x
        sta sdy
        lda sdyH
        sbc f0HiT,x
        sta sdyH
        jmp cymL
cym1:   lda frc                  ; ddyH == 1: sdyH:sdy = 0:fr (X is 0 after the dex)
        sta sdy
        stx sdyH
cymL:   lda frc                  ; --- low half: only the HIGH byte survives the >>8 ---
        clc
        adc ddy
        tax
        bcc cyml0
        lda f1HiT,x
        sta qhi
        jmp cyml1
cyml0:   lda f0HiT,x
        sta qhi
cyml1:   lda frc
        sec
        sbc ddy
        bcs cyml2
        eor #$ff
        adc #$01
cyml2:   tax
        ; THE BORROW FROM THE LOW BYTES IS DELIBERATELY NOT COMPUTED. This half only ever
        ; contributed the high byte of fr*ddyL, so the two low-byte loads and the subtract
        ; that produced their borrow existed only to be +/-1 correct in the LAST bit.
        ; Dropping them leaves the product high by 0 or 1 -- the side distance wrong by at
        ; most 1/256 of a cell, one-sided, and NOT accumulated: the DDA adds exact deltas
        ; from here on. On screen: colH = 88/d so dColH ~ 88*(1/256)/d^2, and a wall top is
        ; only VISIBLE below colH 100, i.e. d >= 0.88 cells -- so the worst visible error is
        ; 0.45 of a logical pixel, falling off as the square of distance.
        sec
        lda qhi
        sbc f0HiT,x             ; high byte of fr*ddyL, straight into sdy
        clc
        adc sdy
        sta sdy
        lda sdyH
        adc #$00
        sta sdyH

cySat:  lda rqL                 ; a delta saturates ONLY at rqL == 0 (asserted at build time), so
        bne cydone              ;   every other ray skips both checks below
        ; Two things the old loop did on EVERY step that are only needed once, on the step
        ; that hits: it wrote "side" (5 cycles a step, read once after the loop), and it
        ; round-tripped the cell index through memory -- "lda cell / adc / sta cell",
        ; then "ldx cell" to index mapT. The index lives in X for the whole march now,
        ; and each direction has its own tail, so "side" is a constant on the hit path
        ; and the "which side did we come from" test after the loop goes away too.
        ;
        ; No bounds check: the map border is solid on all four sides (asserted at build
        ; time), so a ray always hits a wall before it can step outside the grid. That also
        ; makes the +-1 cell stepping safe -- mapX never runs off the end of a row.
        ; An axis-aligned ray never crosses a grid line on that axis, and the delta table
        ; says so by saturating to $ffff. The FIRST side distance did not: it is the
        ; fraction of a cell to the next line multiplied by that delta, and a small enough
        ; fraction pulls the product right back down into range -- at y=4.992 the fraction
        ; is 1/128 and $ffff becomes 512, two cells. The DDA then took a step it should
        ; never take, hit the wrong wall, and drew a column of the wrong height straight
        ; through the scene. Saturate the product too, on both axes.
        ;
        ; AND BOTH DIRECTIONS MUST REACH IT. The -y branch used to "jmp cydone" straight past this
        ; check, so the guard only ever ran when stepping +y. Stepping -y gives sdy = ddy * frac,
        ; which collapses the same way when frac is small -- rarer than the +y case the comment
        ; above describes, but the same bug, and it was an asymmetry rather than a reason.
        lda ddxH
        and ddx
        cmp #$ff
        bne cySx
        sta sdx
        sta sdxH
cySx:   lda ddyH
        and ddy
        cmp #$ff
        bne cydone
        sta sdy
        sta sdyH
cydone:
        ; NO STEP COUNT. The march ends only by hitting a wall, which it always does: the map
        ; border is solid (asserted at build time for every level and every removable-wall
        ; variant). If corrupt map data ever opens the border, this loops forever -- a hang that
        ; says "fix the corruption", rather than a counter quietly drawing a stub wall over it.
        ldx cell0               ; the march starts in the player's cell (computed once a frame in
                                ;   mloop) and lives in X; both exits (cwallX/cwallY) store it
                                ;   to cell, so cell itself is never written here first
cdda:   lda sdxH
        cmp sdyH
        bcc cstepX
        bne cstepY
        lda sdx
        cmp sdy
        bcc cstepX
        beq cstepXc             ; the ONLY entry that arrives with carry SET -- see cstepXc
        ; Saturate, do not wrap. deltaDist is clamped at $ffff for a ray running parallel to
        ; an axis, so a side distance that is already large overflows 16 bits on the next
        ; add and comes back round as a SMALL number -- the DDA then thinks the crossing is
        ; a cell away and keeps stepping that way forever. It needs the player within 1/256
        ; of a cell boundary and a ray parallel to it, which is why it stayed hidden: a
        ; whole wall vanished and an unrelated one filled the column.
        ; THE CELL IS TESTED BEFORE THE ADD. sdy is the distance to the gridline being
        ; crossed, so on a hit it already IS the hit distance -- the old order added ddy and
        ; then subtracted it straight back at cwallY. Only the steps that do not hit pay the add.
cstepY: lda #$ff                ; one row along: X -= the patched step (A = $ff, see X_MINUS_IMM)
cyStep: !byte $cb,$00          ; = "X -= #imm" (SBX, undocumented -- see X_MINUS_IMM); PATCHED imm
        lda mapT,x
        beq cwallY                 ; mapT: walls are $00, open cells their zone mask
        clc
        lda sdy
        adc ddy
        sta sdy
        lda sdyH
        adc ddyH
        sta sdyH
        bcc cdda                ; no overflow: the next step
        lda #$ff                ; this axis is effectively never crossed again
        sta sdy
        sta sdyH
        jmp cdda
        ; Both 'bcc cstepX' above arrive with carry CLEAR -- that is what the branch tested --
        ; so the add below does not need a clc. Only the exact-tie 'beq' arrives with it set,
        ; and that pays for its own here rather than taxing every step. (The Y side keeps its
        ; clc: 'bne cstepY' is reached when sdxH > sdyH, i.e. carry SET.)
cstepXc: clc
cstepX:
        ; stpX is ALWAYS +-1 and is decided once per ray, so this is inx/dex -- 2 cycles
        ; against the 9 that txa / clc / adc stpX / tax cost. The opcode is patched at the
        ; same place stpX is set; stpX itself stays, because marchCol reads it to pick which
        ; face of the cell was hit.
cxInc:  inx                     ; PATCHED to $e8 inx / $ca dex, once per ray
        lda mapT,x              ; tested before the add, as on the Y side; inx/lda/beq leave
        beq cwallX              ;   the carry the compare set, so the add still needs no clc
        lda sdx
        adc ddx
        sta sdx
        lda sdxH
        adc ddxH
        sta sdxH
        bcc cdda                ; no overflow: the next step
        lda #$ff
        sta sdx
        sta sdxH
        jmp cdda
cwallX: stx cell                ; marchCol reads the cell back for the run-id lookup
        lda #$00
        sta side
        lda sdx                 ; the hit distance: the add for this step never happened
        sta remL
        lda sdxH
        sta remH
        jmp cidx
cwallY: stx cell
        lda #$01
        sta side
        lda sdy                 ; the hit distance (see cstepY)
        sta remL
        lda sdyH
        sta remH
        ; No cos correction here: it depends only on the column, so it is baked into the
        ; per-column height tables (see hTabT). This used to be a whole sideMul per ray.
cidx:
        ; ---- distance -> height: y = hzBaseT[remH] | (remL >> s), s fixed per zone ----
        ; j = remH*32 + (remL>>3) folds onto the group's page as hJofY's inverse describes:
        ; one entry per j below 128, then two, eight, sixteen. Each zone is a RANGE OF remH
        ; (0-3, 4-7, 8-15, 16-23), so the fold is a per-remH base plus remL shifted by the zone's
        ; count (3, 4, 6, 7) -- and the shifted part never reaches the base's set bits, so ora
        ; joins them with no carry to clear. The same y the 16-bit index and its fold produced,
        ; without building j at all.
        ldx remH
        cpx #24
        bcs hzOut
        lda remL
        cpx #8
        bcs hzFar
        cpx #4
        bcc hz0
        lsr                     ; remH 4-7: >>4
hz0:    lsr                     ; remH 0-3: >>3
        lsr
        lsr
        ora hzBaseT,x
        tay
        ; The page of this column's height table, precomputed (hPgT = >hTabT + group), patched
        ; into the load: the zero-page pointer with its forced-zero low byte cost 9 more cycles.
hzPg:   ldx col
        lda hPgT,x
        sta hzLd+2
hzLd:   lda $ff00,y             ; PATCHED high byte; low byte 0, so abs,y never crosses a page
        sta pp
        rts
hzFar:  cpx #16
        bcs hz3
        lsr                     ; remH 8-15: >>6
        lsr
        lsr
        lsr
        lsr
        lsr
        ora hzBaseT,x
        tay
        jmp hzPg
hz3:    lsr                     ; remH 16-23: >>7
        lsr
        lsr
        lsr
        lsr
        lsr
        lsr
        ora hzBaseT,x
        tay
        jmp hzPg
hzOut:  lda #$01                ; past the map diagonal -> tiny far wall
        sta pp
        rts

; sideMul: fr(8) * (mhi:mlo)(16) >>8 -> s2:s1
; Quarter-square multiply (a*b = f[a+b] - f[|a-b|], f[n] = n^2/4) inlined twice. It used to
; be two jsr's to a shared mul8 with the operands shuffled through qa/qb; at two calls per
; ray and ~60 cycles each, that plumbing was most of the routine's overhead.
sideMul:
        lda fr                  ; --- high half: fr * mhi -> s2:s1 ---
        clc
        adc mhi
        tax
        bcc smh0
        lda f1LoT,x
        tay                     ; the low byte rides in Y instead of zero page: this routine
        lda f1HiT,x             ; never used Y at all, and it is the hottest one here
        sta s2
        jmp smh1
smh0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta s2
smh1:   lda fr
        sec
        sbc mhi
        bcs smh2
        eor #$ff                ; |fr-mhi|; carry is already clear from the borrow
        adc #$01
smh2:   tax
        sec
        tya
        sbc f0LoT,x
        sta s1
        lda s2
        sbc f0HiT,x
        sta s2
        lda fr                  ; --- low half: only the HIGH byte survives the >>8 ---
        clc
        adc mlo
        tax
        bcc sml0
        lda f1LoT,x
        tay
        lda f1HiT,x
        sta qhi
        jmp sml1
sml0:   lda f0LoT,x
        tay
        lda f0HiT,x
        sta qhi
sml1:   lda fr
        sec
        sbc mlo
        bcs sml2
        eor #$ff
        adc #$01
sml2:   tax
        sec
        tya
        sbc f0LoT,x             ; result discarded -- only the borrow into the high byte
        lda qhi                 ; matters, so the old "sta qlo" here was writing a dead value
        sbc f0HiT,x             ; A = high byte of fr*mlo, so it can go straight into s1
        clc
        adc s1
        sta s1
        lda s2
        adc #$00
        sta s2
        rts

; ---- raster IRQ: count video frames ----
; Two raster IRQs per frame implement the mirror trick. Charset B is charset A with every
; glyph's 8 bytes reversed, so below the split the SAME char code renders upside down --
; which is exactly the vertical symmetry of the scene. renderSym therefore writes one
; identical byte to a row and its mirror and needs no flip table at all.
;
; The split is at logical row 100 (the horizon), which is the MIDDLE of char row 12. That
; is legal and in fact required: the VIC re-fetches character-generator data every raster
; line from the current CB bits, so row 12 draws its top 4 lines from A and its bottom 4
; from B -- self-mirroring, exactly what the horizon row needs.
;
; $d018 also carries the video-matrix nibble, which the main loop flips per frame for
; double buffering, so the handler ORs the charset bits onto the live value in d018vm
; rather than writing a constant.
; The CPU stacks only PC and P, so the registers are this routine's job now. The KERNAL used
; to push A/X/Y before jmp ($0314), which is why the tail below pulls three bytes -- that tail
; was always here, and without these four pushes it would return with the stack out of step.
irq:    pha
        txa
        pha
        tya
        pha
        lda $d019
        and #$01
        beq irqd                ; not a raster IRQ

        ; ---- THREE regions, because the two things below the horizon want opposite polarities.
        ; The frozen scene below the horizon is drawn as MIRRORED glyphs and needs charset B; the
        ; arc's rim is floor-above/hole-below and needs A, which is the only polarity the ramp
        ; dictionary holds. Parking the whole screen in A drew every wall bottom upside down --
        ; the jaggedness, and the same failure the moving split was invented for.
        ; Ordered so the HORIZON split, the one over live content, takes the shortest path.
        lda $d012
irqCmp: cmp #$96   ; operands PATCHED, not variable reads: "cmp abs" is two cycles
        bcc irqTop              ;   more than "cmp #" and that was once enough to push the
irqCm2: cmp #246                ;   sta $d018 past the VIC's fetch point for the line.
        bcs irqA2
        nop                     ; 4 CYCLES OF TIMING, not code: the held object's split compare
        nop                     ;   ("cmp #$ff / bcs", never taken) sat here until 2026-11-12, and
                                ;   the horizon's store is timed with it. Without them the switch
                                ;   lands 32 px further left and the right end of the horizon row
                                ;   flickers with the other charset and ground (the user, level 10)
        lda d018vm              ; --- horizon..arc: the mirrored half ---
irqC1:  ora #$02
        sta $d018
irqB1:  lda #$01      ; on an OVERLAP frame this line sits between the two
        sta $d021               ;   rims, so this is where the ground colour changes -- region 4
                                ;   cannot do it there, because pSplit2 is parked at 246 and the
                                ;   between-arcs line is pSplit. Equal to irqB0 the rest of the
                                ;   time, so it changes nothing then.

irqAr2: lda #246                ; next stop: the top of the arc
        sta $d012
        jmp irqd
        ; region 3 -- before the next frame's sprites -- is where the shared sprite inks are
        ; set (sprPal: the level's, or the idol's tint). It used to be done from osFlush, which runs once per RENDERED
        ; frame: at 20fps that is one restore every three raster frames, so for two frames in
        ; three the whole screen kept the HELD palette. That was the 60Hz flicker.
irqA2:
irqCm3: cmp #$ff                ; --- past the COLOUR line? then this is region 4 --- (patched
        bcs irqA3               ;   by region 3 below, so it always trails it by CSPLIT)
        lda d018vm              ; --- arc top and below: back to A for the rim glyph ---
irqC2:  ora #$00
        sta $d018
        jsr sprPal              ; ...and the WORLD sprite inks back, every raster frame
        lda irqCm2+1            ; arm the colour line: CSPLIT rasters below this one, because
        clc                     ;   the arc's top rows still draw the DEPARTING level's floor
        adc #$58              ;   around the curve, so flipping colour up there tints the
        bcs irqNo               ;   last line or two of the room being left.
        cmp #246                ; no room below? then region 4 simply does not run this frame.
        bcs irqNo               ;   NOT clamped to 245: in normal play pSplit2 IS 246, so a clamp
        sta $d012               ;   puts the colour line ABOVE the charset line, region 4 matches
        sta irqCm3+1            ;   first, and region 3's $d018 store never runs at all.
        jmp irqd
irqNo:  lda #$ff                ; $ff never matches: region 4 is skipped this frame
        sta irqCm3+1
        bne irqA3x              ; always taken
irqA3:  ; --- the colour line: the charset is region 3's already, only the ground flips ---
irqB2:  lda #$01      ; the ground of whatever is seen THROUGH the hole. After
        sta $d021               ;   region 3's $d018 store, so that one keeps its timing -- it is
                                ;   the cycle-critical half (see the cmp # note above). A late
                                ;   background write only frets one line, in a band that is one
                                ;   flat colour anyway.
irqA3x:
        lda #$00
        sta $d012
        jmp irqd
irqTop: lda d018vm              ; --- top of frame: charset A, arm the horizon ---
irqC0:  ora #$00
        sta $d018
irqB0:  lda #$01      ; the ground colour ABOVE the rim: during a drop that is
        sta $d021               ;   still the level being LEFT. The middle region inherits it.
irqArm: lda #$96
        sta $d012
        inc palRas              ; the RASTER's count, for the one clock that is the screen's (fwait)
irqTk:  inc frameCnt              ; ---- THE TICK: everything from here to irqd is TIME, 60 a second ----
        bne irqNf
        inc frameCnt+1
irqNf:
        lda musOn               ; MUSIC: the player, 60 times a second, while a level's song is live
        beq irqNm
irqPl:  jsr $ff03                ; the player's play: high byte PATCHED by musGo (musAtT)
irqNm:  lda dsGl                ; the death's glide, kick or closing filter, 60 times a second (dsTick)
        ora dsHr
        ora dsKk
        ora dsCf
        beq irqNd
        jsr dsTick
irqNd:
        jsr lxTick              ; LEVEL CODE: flkTick (after irqB0, so a flash overrides its ground) or svTick
        lda palF                ; PAL (palF, from the KERNAL's $02a6 at boot): 50 raster frames a
        beq irqd                ;   second, 60 ticks -- so every fifth frame ticks TWICE. NTSC: never.
        dec palQ
        bne irqd                ; Back to back, so ticks land 20,20,20,20,20,0 ms apart
        lda #5                  ;   rather than evenly; nothing here is tighter than a tick, and the
        sta palQ                ;   player and dsTick only ever count them.
        jmp irqTk
palQ:   !byte 5
palRas: !byte 0
palF:   !byte 0                 ; 1 = a PAL C64: written by the boot body from $02a6, read by the IRQ
irqd:   lda #$ff
        sta $d019
        pla
        tay
        pla
        tax
        pla
        rti

; ---- musGo / musOff: the level's song (see MUSIC) ----
; musGo starts it only if NONE is playing, so a death restart (jmp entry) leaves the music running;
; musOff is the only way it stops, and it runs before every level load (the song lives in the slot).
; musOn gates the IRQ's call, so the player is never entered while init is rewriting its state.
musGo:  lda #$00                ; a death restart: the death's sound stops before the song starts over
        sta dsGl
        sta dsHr
        sta dsKk
        sta dsCf
        lda musOn
        bne mgD
        ldx lvlMeT
        lda musAtT,x            ; this level's block, by page: 0 = a silent level
        beq mgD
        sta mgJ+2               ; ...and the player's three entry points patched to it
        sta irqPl+2
        sta spJ+2
        lda #$ff                ; the release mask OPEN (a fall closed it; fmSame keeps the block)
        jsr musRel
        lda #$00                ; subtune 0
mgJ:    jsr $ff00                ; the player's init (patched above)
        lda #$01
        sta musOn
mgD:    rts
musOff: lda #$00
        sta musOn
        sta $d404               ; every voice gated off, so nothing hangs on while the slot is
        sta $d40b               ;   reloaded under the player. NOT $d418: a volume write is a bump.
        sta $d412               ;   (The release has faded them by now -- see THE FADE.)
        rts
; musRel: A = the release mask ($fe = let every voice go, $ff = play) into this level's player
musRel: ldx lvlMeT
        ldy musRLT,x
        sty mrSt+1
        ldy musRHT,x
        sty mrSt+2
mrSt:   sta $ffff               ; SELF-MODIFIED: the level's release-mask operand
        rts
musRLT: !byte 0,0,79,70,114,92,91,226,0,0,0    ; by level id: the release mask's address in its block (musBuild fills these)
musRHT: !byte 0,0,107,107,112,107,108,107,0,0,0
musAtT: !byte 0,0,104,104,110,104,105,104,0,0,0    ; by level id: its block's page, 0 = no block
musOn:  !byte 0                 ; DATA, not an equate: it must start at 0, and a restart keeps it
; ---- dsGo: the death begins (dieGo) -- the song drops out; two voices a semitone apart converge ----
dsGo:   lda #$00
        sta musOn               ; FIRST: the IRQ stops playing the song before its voices are cut
        sta dsKk
        sta dsCf
        sta dsGl
        sta $d415               ; the cutoff's low bits: nothing else of the level's filter is left
        ; ---- HARD RESTART (2026-11-04, the user: "consider leftover filter settings, pulse width
        ; settings ... and envelope settings") ----
        ; Only one of the three voices was sounding, sporadically. The drone holds voices 1 and 2
        ; gated at full sustain, and gating them off and on again a few dozen cycles later, with the
        ; envelope's rate counter wherever it happened to be, is the SID's ADSR bug -- the reason
        ; every tracker hard-restarts. So: gate off with the TEST bit (it also zeroes the three
        ; oscillators, so they start in step), AD/SR $0000, and the gate goes on FOUR ticks later in
        ; dsTick (dsHr), once the envelopes have settled at zero.
        ; Why four (measured 2026-11-04 from snapshots of the user's own deaths): at two, voices 1 and
        ; 2 were still at the drone's $ff when the gate went on in four deaths out of five -- the
        ; new release rate waits on the rate counter's wrap, up to 32768 cycles (32 ms), and two
        ; ticks is 33. Gated at $ff, the attack's first step wraps the counter to 0 and the envelope
        ; FREEZES there (resid's hold_zero; the real chip does the same): silent for the whole glide,
        ; leaving voice 3 alone, G2 -> D2. Four ticks (67 ms) covers the 32 ms wait plus the ~6 ms a
        ; rate-0 release takes from $ff.
        ldy #14
dgH:    lda #$08                ; test bit, gate off
        sta $d404,y
        lda #$00
        sta $d405,y
        sta $d406,y
        tya
        sec
        sbc #7
        tay
        bcs dgH
        lda #$04
        sta dsHr
        lda #$c7            ; all three voices into the low-pass, resonance 12
        sta $d417
        lda #$1f                ; low-pass, volume 15 (a silent level may never have set it;
        sta $d418               ;   the cut itself masks the bump this write makes)
        lda #$18
        sta dsC
        sta $d416
        lda #$00
        sta dsQ
        ldx #11
dgF:    lda dsF0,x              ; the three voices' starts (32-bit, 16 of fraction); they hold
        sta dsF,x               ;   here until dsPlan sets them moving
        dex
        bpl dgF
        ldx #0                  ; X: dsF, Y: the voice's SID registers
        ldy #0
dgV:    lda dsF+2,x
        sta $d400,y
        lda dsF+3,x
        sta $d401,y
        inx
        inx
        inx
        inx
        tya
        clc
        adc #7
        tay
        cpy #21
        bcc dgV
        rts
; ---- dsPlan: dieGo, once it knows the turn's duration -- the glide over the same dieArr 60ths ----
dsPlan: ldy dieQ                ; 0/24/48: the row of dsPlT
        ldx #0
dpL:    lda dsPlT,y             ; the speeds, then the pulls, into dsV/dsA (adjacent)
        sta dsV,x
        iny
        inx
        cpx #24
        bcc dpL
        lda dieArr
        sta dsK
        lda #$01
        sta dsGl                ; and the IRQ starts it
        rts
; ---- dsBoom: a picture lands (picOn) -- two noises and a kick, overdriving a closing resonant low-pass ----
dsBoom: lda #$00
        sta dsGl
        lda #$f7                ; resonance F, all three voices into the filter
        sta $d417
        lda #$1f                ; low-pass, volume 15 (the boom masks this write's bump)
        sta $d418
        lda #$40
        sta dsC
        sta $d416
        lda #$01
        sta dsCf
        lda #$00
        sta $d40d               ; no sustain on the noises or the kick
        sta $d414
        sta $d406
        lda #$0b
        sta $d40c
        sta $d413
        lda #<$047c
        sta $d40e
        lda #>$047c
        sta $d40f
        lda #<$0303
        sta $d407
        lda #>$0303
        sta $d408
        lda #$80                ; gate LOW first: the envelope will not retrigger otherwise
        sta $d40b
        sta $d412
        lda #$81                ; noise + gate
        sta $d40b
        sta $d412
        lda #<$0520
        sta dsKF
        sta $d400
        lda #>$0520
        sta dsKF+1
        sta $d401
        lda #$0a
        sta $d405
        lda #$10                ; the kick: triangle, gate low then high
        sta $d404
        lda #$11
        sta $d404
        lda #8
        sta dsKk
        rts
; ---- dsTick (IRQ) ----
; The glide: each voice f += v, v += a (dsPlan), for DIE_ARR 60ths, then it holds on the chord. The
; kick falls linearly; the cutoff closes by 1.
dsTick: lda dsHr                ; ---- the hard restart: two ticks at zero, then the gate ----
        beq dtGo
        dec dsHr
        bne dtHw
        ldy #14
dtHg:   lda #$08
        sta $d405,y
        lda #$a9
        sta $d406,y
        lda #$21
        sta $d404,y             ; gated, and the test bit off: the oscillators run from zero together
        tya
        sec
        sbc #7
        tay
        bcs dtHg
dtHw:   rts                     ; the glide moves from the next tick (dsK counts only moving ticks)
dtGo:   lda dsGl
        beq dtKk
        ldx #0                  ; X: the voice's 4 bytes in dsF/dsV/dsA
        ldy #0                  ; Y: its SID registers
dtV:    clc
        lda dsF,x
        adc dsV,x
        sta dsF,x
        lda dsF+1,x
        adc dsV+1,x
        sta dsF+1,x
        lda dsF+2,x
        adc dsV+2,x
        sta dsF+2,x
        sta $d400,y
        lda dsF+3,x
        adc dsV+3,x
        sta dsF+3,x
        sta $d401,y
        clc
        lda dsV,x
        adc dsA,x
        sta dsV,x
        lda dsV+1,x
        adc dsA+1,x
        sta dsV+1,x
        lda dsV+2,x
        adc dsA+2,x
        sta dsV+2,x
        lda dsV+3,x
        adc dsA+3,x
        sta dsV+3,x
        inx
        inx
        inx
        inx
        tya
        clc
        adc #7
        tay
        cpy #21
        bcc dtV
        dec dsK
        bne dtOp
        lda #$00                ; arrived: the chord holds where it is, the cutoff stops with it
        sta dsGl
        beq dtKk
dtOp:   inc dsQ                 ; the cutoff opens a step every 4 60ths, to DSGC1
        lda dsQ
        and #$03
        bne dtKk
        lda dsC
        cmp #$40
        bcs dtKk
        inc dsC
        lda dsC
        sta $d416
dtKk:   lda dsKk
        beq dtCf
        dec dsKk
        sec
        lda dsKF
        sbc #<$0073
        sta dsKF
        sta $d400
        lda dsKF+1
        sbc #>$0073
        sta dsKF+1
        sta $d401
dtCf:   lda dsCf
        beq dtDn
        dec dsC
        lda dsC
        sta $d416
        cmp #$08
        bne dtDn
        lda #$00                ; closed: the noises decay on under it
        sta dsCf
dtDn:   rts
dsF0:   !byte $00,$00,$a7,$06,$00,$00,$ed,$05,$00,$00,$48,$06   ; the cluster
dsPlT:  !byte $d4,$e6,$db,$ff,$20,$d6,$eb,$ff,$10,$c1,$f2,$ff,$05,$9a,$00,$00,$08,$56,$00,$00,$84,$38,$00,$00,$18,$cd,$ed,$ff,$80,$d5,$f5,$ff,$78,$52,$f9,$ff,$d3,$26,$00,$00,$b0,$15,$00,$00,$3f,$0e,$00,$00,$dc,$d5,$f3,$ff,$78,$34,$f9,$ff,$6c,$89,$fb,$ff,$4d,$11,$00,$00,$aa,$09,$00,$00,$59,$06,$00,$00   ; per duration: speeds, then pulls
dsF:    !byte 0,0,0,0,0,0,0,0,0,0,0,0 ; voices 1-3 now
dsV:    !byte 0,0,0,0,0,0,0,0,0,0,0,0 ; ...their speeds
dsA:    !byte 0,0,0,0,0,0,0,0,0,0,0,0 ; ...and the pull on them: speed reaches 0 at the chord (after dsV: dsPlan fills both)
dsK:    !byte 0                 ; 60ths of glide left
dsQ:    !byte 0                 ; 60ths of glide, for the cutoff's pace
dsGl:   !byte 0                 ; 1 = the voices are converging
dsHr:   !byte 0                 ; ticks of hard restart left before the gate (dsGo)
dsKk:   !byte 0                 ; 60ths of kick left
dsCf:   !byte 0                 ; 1 = the boom's cutoff is closing
dsC:    !byte 0
dsKF:   !byte 0,0               ; the kick's frequency
; ---- sfxPlay: A = an effect id (SFX_ID), played on voice 3 by the live block's effect engine ----
; Silent where no block is live. Interrupts off around the call: the effect engine's start writes the
; channel's effect pointer, which the IRQ's play would otherwise read half written.
sfxPlay:ldx musOn
        beq spLx                ; no GoatTracker block: the level's own sound, if it has any
        tax
        lda sfxLoT-1,x
        ldy sfxHiT-1,x
        ldx #14                 ; voice 3: on a music level, the voice the song can best spare
        php
        sei
spJ:    jsr $ff06                ; the player's effect entry (patched by musGo)
        plp
        rts
spLx:   jmp lxSfx               ; drSfx, or lxNone (rts)
sfxLoT: !byte <sfxData+0,<sfxData+27,<sfxData+50
sfxHiT: !byte >sfxData+0,>sfxData+27,>sfxData+50
; ONE run, so the order holds: the effect engine's priority IS the address -- an effect higher in
; memory is never cut off by one lower down. Least important first.
sfxData:!byte 8,0,8,204,17,211,216,211,211,211,204,204,204,204,204,204,204,204,204,204,204,204,204,204,204,16,0,10,0,8,188,17,187,186,185,184,182,181,180,179,178,177,176,175,173,172,171,170,169,0,12,0,8,183,129,182,181,180,179,178,177,176,175,174,173,172,171,170,169,168,167,166,165,164,163,162,161,160,159,158,157,156,155,154,153,152,0

; (level code 'drone' cut here: see LX_SRC)
; ---- nmi: swallow RESTORE ----
; The only NMI source here is the RESTORE key. With the KERNAL banked out there is no handler
; behind it, so this exists purely to make that keypress harmless. $dd0d is read to clear the
; CIA2 latch in case an NMI ever arrives from there instead.
nmi:    pha
        lda $dd0d
        pla
        rti

; (the fps readout is hudX's, HUD=1 only)

; ================= data =================
dirXT:  !byte 1,1,0,255,255,255,0,1
dirYT:  !byte 0,1,1,1,0,255,255,255
; rowLoT: 25 bytes found inside mul40LoT, so not emitted (see embedIn)
; rowHiT: 25 bytes found inside mul40HiT, so not emitted (see embedIn)
kTabT:  !byte 56,64,72,80,88,96,104,112,120,128,136,144,152,48,40,32,24,16,8,0
vsplitL: !byte 0,12,24,7   ; VSPLIT: solid LEFT of boundary column 1,2,3: #... ##.. ###.
vsplitR: !byte 0,14,22,32   ;   solid RIGHT: .### ..## ...#
; ---- sMaxT (in the MAIN block since 2026-09-16: the $9d00 stream hit rayOffQS with the two-level
; build; this is 128 bytes of build constant with no alignment need, and the main block had 235 free): the largest s that still leaves a placeable panel, per dp ----
; s*s <= dp*(4K/n - dp) has ONE unknown at run time once dp is known, so the whole test collapses
; to a bound on s -- and that bound is a pure function of dp_q and a build constant. Precomputing
; it turns the per-boundary work from a subtract, an abs, a rounding, two shifts, a multiply and a
; 16-bit compare into two compares against a range worked out once per span.
; Quarter cells in and out. 128 entries: dp_q past that is a wall plane 32 cells to the side, which
; SEAMFAR threw away long before.
sMaxT:  !byte 0,11,16,20,23,25,28,30,32,34,35,37,39,40,41,43,44,45,46,47,48,49,50,51,52,53,54,54,55,56,57,57,58,59,59,60,60,61,61,62,62,63,63,64,64,65,65,65,66,66,66,66,67,67,67,67,68,68,68,68,68,68,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,68,68,68,68,68,68,67,67,67,67,66,66,66,66,65,65,65,64,64,63,63,62,62,61,61,60,60,59,59,58,57,57,56,55,54,54,53,52,51,50,49,48,47,46,45,44,43,41,40,39

col4T:  !byte 0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60,64,68,72,76,80,84,88,92,96,100,104,108,112,116,120,124,128,132,136,140,144,148,152,156

qmColT: !byte 0,1,1,2   ; middle-sample column, indexed by kpos

hzBaseT: !byte 0,32,64,96,128,144,160,176,192,196,200,204,208,212,216,220,224,226,228,230,232,234,236,238
blkLoT: !byte 0,<bkA0,<bkA1,<bkA2,<bkA3,<bkA4,<bkA5,<bkA6,<bkA7,<bkA8,<bkA9,<bkA10,<bkA11,<bkA12,0,<bkB0,<bkB1,<bkB2,<bkB3,<bkB4,<bkB5,<bkB6,<bkB7,<bkB8,<bkB9,<bkB10,<bkB11,<bkB12
blkHiT: !byte 0,>bkA0,>bkA1,>bkA2,>bkA3,>bkA4,>bkA5,>bkA6,>bkA7,>bkA8,>bkA9,>bkA10,>bkA11,>bkA12,0,>bkB0,>bkB1,>bkB2,>bkB3,>bkB4,>bkB5,>bkB6,>bkB7,>bkB8,>bkB9,>bkB10,>bkB11,>bkB12
sldLoT: !byte <slA0,<slA1,<slA2,<slA3,<slA4,<slA5,<slA6,<slA7,<slA8,<slA9,<slA10,<slA11,<slA12,0,<slB0,<slB1,<slB2,<slB3,<slB4,<slB5,<slB6,<slB7,<slB8,<slB9,<slB10,<slB11,<slB12,0
sldHiT: !byte >slA0,>slA1,>slA2,>slA3,>slA4,>slA5,>slA6,>slA7,>slA8,>slA9,>slA10,>slA11,>slA12,0,>slB0,>slB1,>slB2,>slB3,>slB4,>slB5,>slB6,>slB7,>slB8,>slB9,>slB10,>slB11,>slB12,0
edgLoT: !byte <edA0,<edA1,<edA2,<edA3,<edA4,<edA5,<edA6,<edA7,<edA8,<edA9,<edA10,<edA11,<edA12,0,<edB0,<edB1,<edB2,<edB3,<edB4,<edB5,<edB6,<edB7,<edB8,<edB9,<edB10,<edB11,<edB12,0,<edT0,<edT1,<edT2,<edT3,<edT4,<edT5,<edT6
edgHiT: !byte >edA0,>edA1,>edA2,>edA3,>edA4,>edA5,>edA6,>edA7,>edA8,>edA9,>edA10,>edA11,>edA12,0,>edB0,>edB1,>edB2,>edB3,>edB4,>edB5,>edB6,>edB7,>edB8,>edB9,>edB10,>edB11,>edB12,0,>edT0,>edT1,>edT2,>edT3,>edT4,>edT5,>edT6
; REMOVED 2026-09-26, nothing in the image named it: t1TabT/tbTabT: the SUPERSEDED form of the fill early-out. kTab two lines above is what
; ships -- fill = h + kTab[R] -- and these were the per-cell-row thresholds it replaced.

; ==================== orbs: projection and placement ====================
; Ported from ddfa4bc^ (the pass deleted at ddfa4bc) with three changes for the current map:
;   - the sprite pointers live in the last eight bytes of SCREEN memory, which is bank 3 now;
;   - the scratch moved off $cbxx -- bank 3 is graphics-only -- to the array hole's last page;
;   - orbPaint and orbSeam are NOT ported, so nothing here decides occlusion.

; ---- orbMove: place every visible orb ----
; Once a frame. Written for clarity over cycles and keeping its working set in absolute RAM
; where it can, since 50-odd absolute accesses cost 50 cycles and buy back the whole seam
; scratch. The hot half lives in that scratch, which is dead by the time this runs.
;
; Camera space: forward = dx*cos(pa) + dy*sin(pa), right = dy*cos(pa) - dx*sin(pa). "right" is
; the direction of INCREASING column, which is d/dpa of the ray direction = (-sin, cos). Map y
; runs downward, matching the DDA, so no handedness fixup is needed anywhere here.
;
; The candidate list for the player's cell is pre-sorted by distance, so the first eight orbs
; that project are the NEAREST eight and assigning them to sprites in order also gets the
; overlap priority right -- sprite 0 draws over sprite 1.
orbMove:
        lda #$00                ; SILVER: no slots until this pass draws the orb again
        sta svCnt
        jsr entGate             ; ---- anything to project at all? ---- (out of line: the
        bcc ogFull              ;   main block is full; see entGate for what it tests)
        rts                     ; carry set: nothing in sight, registers already cleared
ogFull:
        jsr omTrig              ; the frame's trig and the shared halves of every projection
                                ;   -- out of line, the main block is at its ceiling; see omTrig
        lda #$00                ; the per-sprite bit registers are built up a bit at a time and
        sta omEn                ; written once, so an unused slot is simply never set
        sta omXX
        sta omYY
        sta omPri
        sta omX8
        sta onv
        ldx #$08                ;   so nothing can ever be behind it -- anything further away is
        stx onvH                ;   higher up the screen and does not overlap. Last slot = lowest
                                ;   VIC priority, and the two allocators meet in the middle.
        lda #$ff
        sta omMc                ; every sprite multicolor unless the icon says otherwise
        lda sokAn               ; ---- being swallowed by a socket? animate instead of holding ----
        bne omSwal
        lda carry               ; ---- the carried orb, HELD IN FRONT OF YOU ----
        beq omNoIco
        ldx dieSt               ; ...but not once the scene has started: the room is leaving
        bne omNoIco             ;   and an orb held in front of you goes with it.
                                ; THROUGH X, NOT A: A still holds carry, and the tax below is what
                                ;   turns it into the entity index. As an lda this read
                                ;   orbColT2 at $ff -- one byte BEFORE the table -- so the held
                                ;   orb took its body colour from whatever sat there ($73, and the
                                ;   VIC keeps the low nibble: 3, cyan). The world orbs were
                                ;   unaffected, which is what made it look like a carry-only bug.
             ; Was a small hi-res icon in the lower left. Now it is the orb
                                ;   itself at its nearest ladder rung -- variant 0, a 21-row
                                ;   bitmap vertically expanded to 42 -- parked centre-bottom with
                                ;   its ground shadow off the end of the screen, so it reads as
                                ;   carried rather than as a HUD element.
                                ; SLOT 0, and the world then allocates from 1. Sprite-vs-sprite
                                ;   priority is fixed by slot number and nothing else, so being
                                ;   in the foreground means being slot 0 -- at 7 a near orb in
                                ;   the corner would have drawn over it.
        tax
        dex                     ; carry is index+1, so zero can mean empty
        lda orbColT2,x          ; the idol's OWN body colour, out of THIS level's slot table.
                                ; It briefly came from idolCar, the room's idol tint, on the
                                ; grounds that a carried idol has no entry here -- which stopped
                                ; being true when every level that can hold one started
                                ; declaring a slot for it. The room's tint made every idol held
                                ; in the hub light red, whatever you were carrying, and correct
                                ; again the moment you put it down.
                                ; The two SHARED inks still re-tone per room (idolU/idolH, and
                                ; they have to: one pair of registers serves all eight sprites).
                                ; The body is per sprite, so it answers to nothing but the idol.
        sta obC                 ; the orb's OWN body colour, not the icon's fixed grey
        lda #$a0
        clc                     ; what you are CARRYING is drawn with its own art too. X is
        adc orbArtT,x           ;   still the entity index from the dex above; without this the
                                ;   idol was held in front of you as an orb.
        sta obP
        lda #$a0
        sta obX
        lda #$d2
        sta obY
        lda #$ff
        sta obIX                ; not an entity: this is the value occStamp's hole test already
                                ;   rejects, so it stamps no occluders
        lda #$01
        sta omEn
        sta onv                 ; world entities start at slot 1
        sta omYY                ; BOTH ways, which is what orbExpT says for this variant and what
        sta omXX                ;   the world does for it -- expanded vertically only, it was half
                                ;   its proper width. Safe to store rather than OR: both buffers
                                ;   were cleared just above and the world ORs its slots in after.
        jmp omNoIco
        ; ---- the swallow, one drawn step a frame ----
omSwal: lda sokAn
        cmp #$03
        bcc omSwTk              ; the orb has gone; only the socket is closing now
        ldx sokVar
        lda orbPtrT,x
        sta obP
        lda #12
        sta obC
        lda #$ff
        sta obIX
        lda #$01
        sta omEn
        sta onv
        ldy sokVar              ; the smaller rungs are not all expanded; ask the same table the
        lda orbExpT,y           ;   world asks rather than assuming
        beq omSwHf
        lda #$01
        sta omXX
        sta omYY
        lda sokCX               ; expanded: 48 hires wide, 42 rasters tall
        sec
        sbc #$18
        sta obX
        lda sokCY
        sec
        sbc #$2a
        jmp omSwPy
omSwHf: lda sokCX               ; not expanded: 24 by 21
        sec
        sbc #$0c
        sta obX
        lda sokCY
        sec
        sbc #$15
omSwPy: sta obY
omSwNx: clc                     ; walk it toward the socket and down the ladder
        lda sokCX
        adc sokDX
        sta sokCX
        clc
        lda sokCY
        adc sokDY
        sta sokCY
        lda sokVar
        clc
        adc #$05
        cmp #$10
        bcc omSwV
        lda #$0f  ; never past the orb's own rungs and into the angel's
omSwV:  sta sokVar
omSwTk: dec sokAn
        bne omNoIco
        ; ---- landed: the socket eats it, and both leave the world ----
        ldy sokWho
        dey
        lda #$ff
        sta hlSeat,y
        iny
        sty sockHit
        ; ---- seating opens a wall... unless it is a PEDESTAL ----
        ; A socket opens its own wall the instant it is fed. A pedestal opens NOTHING until
        ; every pedestal on the level is seated: the hub is one puzzle about collecting three
        ; things, not three independent doors. On a level with no pedestals nPedT == nHoleT and
        ; the test is never true, so this costs those levels one compare.
        lda sokWho              ; hole-like index + 1: exits, then sockets, then pedestals
        sec
        sbc #$01
        cmp nPedT
        bcc omWTog              ; a socket: its own wall, now
        ldy nPedT
omPdC:  lda hlSeat,y            ; bit 7 = seated
        bpl omNoIco             ; one still empty, so this seating changes nothing else
        iny
        cpy nHoleT
        bcc omPdC
        lda sokWho              ; the last one: open the wall all three of them name
        sec
        sbc #$01
omWTog: sec
        sbc nExitT              ; -> the socket's own index, which is what sockWallT is keyed by
        tay
        lda sockWallT,y         ; ...names its wall, or $ff for a seat that opens nothing
        bmi omNoIco
        sta wsWall
        tax                     ; a wall already OUT opens nothing more: two sockets may name one
        lda wallStT,x           ;   group (level 6's two S1s), and wallTog would put it BACK
        bne omNoIco
        lda sockStgT,y          ; LEVEL CODE: does this socket start anything? (0 = no)
        pha
        jsr wallTog
        pla
        beq omNoIco
        jsr lxSock              ; the door is falling: level 9 closes the wall behind and changes
                                ;   the cast (stGo); a closer level shuts its closer (clGo)
omNoIco:
        lda py+1                ; which cell is the player standing in?
        jsr mulW
        clc
        adc px+1
        tax
        stx pcell
        jsr holeOne             ; ---- the hole FIRST, before the orbs claim the slots ----
                                ; It used to go last, so any frame with seven orbs on screen
                                ; simply lost it -- a level exit blinking in and out as you
                                ; walk is far worse than one orb fewer. The orb list is still
                                ; nearest-first, so what it costs is the farthest orbs.
        ; ---- every entity, every frame ----
        ; The per-cell candidate lists carried a PRECOMPUTED bearing and occlusion answer for each
        ; (cell, orb) pair, which is exactly what a movable orb invalidates. With a handful of
        ; entities the list was never the expensive part -- projecting is -- so the loop just walks
        ; them all and lets orbOne reject what is off screen -- and always asks the occlusion test
        ; rather than trust a build-time answer about where things used to be.
        jsr obOrder             ; NEAREST FIRST, out of line -- see obOrder for why
obEnd:  rts

; qTrig: 9-bit angle in oqa -> |cos| of it, from the 256-byte quarter circle.
; |cos| mirrors about a quarter turn, so 256..511 reads back down the same table.
qTrig:  lda oqa+1
        beq qtLo
        lda #$00                ; a >= 256: index 512 - a
        sec
        sbc oqa
        beq qtZ                 ; a == 256 exactly -> cos is 0, and 256 is off the end
        tax
        lda qcosT,x
        rts
qtZ:    lda #$00
        rts
qtLo:   ldx oqa
        lda qcosT,x
        rts

; ---- osFlush: hand the frame's sprite state to the VIC, in the border ----
; Everything above only fills buffers. Writing $d000/$d001, a sprite pointer or a colour while
; the raster is inside the visible area lets the VIC fetch half of one frame's sprite and half
; of the next -- a sheared orb, or one that pops to somewhere else for a single frame. Called
; after the raster wait and the buffer flip, when the beam is past line 250 and no sprite is
; being fetched. Costs about 30 cycles per visible orb, which is nothing next to the ~2400 it
; took to work out where the orb goes.
; ---- occStamp: paint foreground black where a wall should clip an ENTITY ----
; Named for what it does, not for what it was written for: orbs, angels and anything else that
; takes a sprite slot all clip the same way, and the angel is just an entity with two of them.
; Runs AFTER renderSym, because it overwrites cells renderSym has just drawn. The seven occluder
; glyphs are the same black as the wall and differ only in bit pair, so a stamped cell is
; invisible as colour and clips exactly.
;
; Per orb, only where the build already said occlusion is possible (obOcc bit 7, false for 56% of
; candidates). Walk the spans overlapping the orb's box exactly as orbOne does; every span whose
; run occludes this orb gets its intersection with the box stamped.
;
; Two things follow from stamping at all, and both are handled here rather than anywhere else:
;   - the orb's PRIORITY bit has to be set, or foreground means nothing to it. Set per orb, not
;     globally: an orb with nothing occluding it keeps priority 0, which is why seams cannot bite
;     it and why it needs no de-seam sweep.
;   - once its bit is set, SEAMS clip it too -- they are bit pair 10, the only other foreground
;     in the charset. So every seam inside the orb's box becomes plain black. Its whole box, not
;     just the occluded part: a near wall's seam would otherwise bite an orb that a DIFFERENT
;     wall is occluding at the edge.
occStamp:
        lda onv
                                ; NO EARLY-OUT ON ZERO any more: a SOCKET can hold a slot when no
                                ; orb does, its slots are at the far end of the array, and the
                                ; scratch-glyph and run-cache setup below has to run for it too.
                                ; The test moved to just above oSLoop, where the setup is done.
        ldy #$04   ; OCCSYN: this buffer's half of the scratch glyphs is free again.
        ldx baseHi              ;   Buffer A ($e0) takes the first half, B the second; see OCCSYN.
        cpx #$e0                ;   (A still holds onv for the store below, so X and Y do the test)
        beq oSSynA
        ldx #$04
        ldy #$08
        bne oSSynB              ; always
oSSynA: ldx #$00
oSSynB: stx osSyn
        sty osLim

        sta osN                 ; the slot count, taken BEFORE anything else touches A. The buffer
        lda #$00                ;   selection below leaves the cache base in A, and with this store
        sta osI                 ;   after it, osN got #<cbA / #<cbB -- 80 or 120 -- so the loop
                                ;   walked a hundred slots of an eight-slot array and stamped
                                ;   garbage. It alternated with the buffer, which is exactly why
                                ;   only ever one buffer looked wrong.
        ; Which buffer's run cache to invalidate. renderSym patches operands rather than indexing
        ; per column; do the same, once per frame. cbA/cbB hold the solid-run START this buffer
        ; already shows, and $ff is the sentinel it treats as "always redraw" -- a value rs cannot
        ; take, already used for seam columns. A stamped cell is invisible to that cache, so
        ; without this the column is skipped next time this buffer comes round and the black block
        ; STAYS: a trail behind every moving orb.
        lda baseHi
        cmp #$e0
        bne oSCbB
        lda #<cbA
        jmp oSCbS
oSCbB:  lda #<cbB
oSCbS:  sta oSInv+1
        sta oSDIn+1
        lda baseHi              ; ...and the same buffer's CEILING/BLANK-run cache. A stamped char
        cmp #$e0                ;   lands in one of three bands: the blank run above (cwA), the
        bne oSCwB               ;   solid run below (cbA), or the edge band between. The edge band
        lda #<cwA               ;   is redrawn unconditionally so it needs nothing, and cbA was
        jmp oSCwS               ;   already poisoned -- but a stamp in the BLANK run was invisible
oSCwB:  lda #<cwB               ;   to both, so rfCw1's compare kept matching and those rows were
oSCwS:  sta oSInvW+1            ;   never redrawn again.
        lda osN
        beq oSHole              ; no orb slots at all: straight to the hole-like ones
oSLoop: ldx osI
        lda obIX,x              ; a HOLE's slot: it carries no stamp state, and unlike the gate
        cmp #$fe                ;   below this test is always here, because ORBGATE is off by
        beq oSUpHf              ;   default and cannot be relied on to fence anything
        cmp #$ff
        beq oSNext              ; the CARRIED orb's icon: not an entity, and it fills no state
        cmp nOrbT
        bcc oSIdl               ; an orb, which always carries it
        lda obOcc,x             ; hole-like: only a slot holeSlot made STAMPABLE carries it (bit 7) --
        bpl oSNext              ;   every kind has a rows table now, exits included; otherwise obOcc
                                ;   holds the fill colour (0-15) and the slot is not stamped.
        lda obIX,x              ; RAGGED: the CORNER exit always goes on. STMP is worked out from the map
        cmp lvlCorT             ;   as built, where its cell is wall: it cannot know which blocks round
        beq oSEnt               ;   it the ball has taken, so it would never let it be stamped
        lda obIX,x              ; STMP: can a wall partly hide THIS one from the player's cell at all?
        sec                     ;   Almost never (the build lists the few cells where it can) -- and
        sbc nOrbT               ;   without this a hub pedestal paid ~580 cycles a frame to find out
        tay
        lda orbBitT,y
        and stmpM
        beq oSNext
        jmp oSEnt
oSIdl:  tay                     ; STMP: an IDOL up on a drum stands in the drum's footprint (PEDR is the
        lda orbIdolT,y          ;   orb's radius by construction) and is just as static, so the drum's
        bmi oSEnt               ;   stamp-list bit decides for it too. Any other orb keeps the full path.
        tay
        lda idolOnPedT,y        ; pedestal index + 1, 0 = on the floor
        beq oSEnt
        clc
        adc nPedT               ; -> the drum's hole-like index + 1
        tay
        lda orbBitT-1,y
        and stmpM
        bne oSEnt
        jmp oSNext
oSEnt:



        ldy obIX,x              ; the big angel's slot is stamped by DEPTH (bgOcc)
        lda orbTallT,y
        and #$02
        sta osBig
        lda obIX,x              ; OCCFACE: the cell occBy tests the runs' faces against
        tay
        lda orbXCT,y
        sta ooCX
        lda orbYCT,y
        sta ooCY
        lda #$00                ; RAGGED: is this slot the CORNER exit? (osRag)
        cpy lvlCorT
        bne oSRg0
        lda #$01
oSRg0:  sta osRag
        ; char rows the orb's CONTENT covers. obY is the sprite's $d001; the content is bottom
        ; aligned in the frame, so it ends at obY + anchor - 1 and starts orbBlankT rows in.
        ; Display y is raster - 50, and a char row is eight of those.
        ; ---- blank and anchor: from the variant tables for an orb, from the SLOT for a socket ----
        ; A socket's obV is NOT a variant. holeSlot puts the rung's height in rows there, because
        ; three hole-like ladders would not fit in orbAnchT's block (four spare bytes; see
        ; visRows). Its blank count needs no table at all: a hole-like ellipse is drawn from the
        ; top of its frame, so it is zero. osL/osR are the span-intersection scratch and nothing
        ; has written them yet this slot -- oSCells is the only reader and the span loop is below.
        ldy obV,x
        lda obIX,x
        cmp nOrbT
        bcs oSRhl
        lda orbBlankT,y
        sta osL
        lda orbAnchT,y
        sta osR
        jmp oSRgo
oSRhl:  lda #$00
        sta osL
        sty osR
        ; Display y is raster - 50, and a char row is eight of those. SUBTRACT THE 50 FIRST: obY
        ; is 150 - anchor + h, so obY + anchor is 150 + h, which passes 255 once h > 105 and wraps.
        ; The bottom row then came out tiny, the stamp ran from a bogus row, and black cells landed
        ; on the white CEILING -- long vertical bars, with the de-seam stripping seams nowhere near
        ; the orb. One overflow, both symptoms.
oSRgo:  lda obY,x
        sec
        sbc #$32
        sta ohSv                ; display y of the sprite frame's top row
        clc
        adc osL                 ; ... plus the blank rows above the content
        lsr
        lsr
        lsr
        sta osRow
        lda ohSv
        clc
        adc osR
        sec
        sbc #$01                ; the last inked row
        lsr
        lsr
        lsr
        cmp #$19
        bcc oSRok
        lda #$18                ; clamp to the last screen row: a near orb's box runs off the
                                ; bottom, and the rows below 24 are not screen memory at all
oSRok:  sta osRowB
        ; The TOP row is CHECKED, not clamped. Clamping it to 24 turned "this orb's box starts
        ; below the screen" into "stamp row 24" -- a bar of foreground black along the bottom of
        ; the floor, appearing as soon as you walk close to anything, since a near orb's box runs
        ; off the bottom. An orb that starts past the last row has nothing on screen at all.
        lda osRow
        cmp #$19
        bcs oSNone
        cmp osRowB
        beq oSRok2
        bcc oSRok2
oSNone: jmp oSDone              ; nothing of this orb is on screen
oSRok2:
        ; ---- start at the first span that can overlap this entity, not at the screen's left edge ----
        ; Span i covers [bndT[i-1], bndT[i]-1] (span 0 from column 0, the last to 159), bndT ascending,
        ; so the first one reaching obL is index = how many boundaries are <= obL. This was a LINEAR
        ; walk from column 0 for every slot -- ~600 cycles a slot on the hub, which stamped nothing.
        ; Binary search, lo = 0 .. hi = nbnd; everything from here on is the scan it always was.
        lda #$00
        sta ohBX                ; lo
        lda nbnd
        sta ohHiB               ; hi
oSBl:   lda ohBX
        cmp ohHiB
        bcs oSBd
        clc
        adc ohHiB
        ror                     ; (lo + hi) / 2, the add's carry rotated back in
        tax
        lda bndT,x
        ldy osI
        cmp obL,y
        beq oSBle               ; a boundary AT obL: the span it opens is the first one
        bcs oSBgt
oSBle:  inx
        stx ohBX                ; lo = mid + 1
        jmp oSBl
oSBgt:  stx ohHiB               ; hi = mid
        jmp oSBl
oSBd:   ldx ohBX                ; the span's left edge: column 0, or the boundary before it
        lda #$00
        cpx #$00
        beq oSBs
        lda bndT-1,x
oSBs:   sta ohL
oSSpan: ldx ohBX
        cpx nbnd
        bcc oSSB
        lda #$9f
        jmp oSSR
oSSB:   lda bndT,x
        sec
        sbc #$01
oSSR:   sta ohRun               ; borrow: this span's right edge
        ldx osI
        cmp obL,x
        bcc oSAdv               ; span ends before the orb begins
        lda ohL
        cmp obR,x
        beq oSChk
        bcs oSDone              ; span begins past the orb: nothing left to stamp
oSChk:  ldx ohL
        ldy faceIdT,x
        beq oSAdv               ; no run in this span, so it cannot occlude
        lda osBig
        beq oSChkN
        jmp lxBgOcc             ; (level code: bgOcc)
oSChkN:
        sty ohSv
        lda osRag               ; RAGGED: the corner exit takes EVERY face in its box. It is flat on the
        bne oSAll               ;   floor, so any wall pixel drawn over it is nearer than it -- and the
                                ;   facing test, asked from the quadrant cell bhStep gives it, says no
                                ;   face at all is in front, since it straddles their planes
        jsr occBy
        bcc oSAdv               ; this run's face is not in front of this orb
oSAll:

        ; it does: stamp [max(spanL, obL) .. min(spanR, obR)] -- but the two ends are NOT alike.
        ;
        ; One end comes from the WALL's edge and the other from the ORB's box. Only the wall edge
        ; needs precision: that is where the wall stops and the orb should start showing. At the
        ; orb's own edge there is no orb beyond to clip and the wall carries on regardless, so a
        ; split there buys nothing -- it just spends a partial glyph saying something invisible.
        ; Round that end OUT to the cell boundary instead.
        ;
        ; And it makes every band exactly expressible. The splits are "n columns from one side",
        ; so a band needs at most ONE non-aligned end; with the orb's edge snapped to a boundary
        ; the only ragged end left is the wall's, which is precisely what they are for. The
        ; middle-band case -- both ends interior to one cell, which no glyph can say -- cannot
        ; arise any more.
        ldx osI
        lda ohL
        cmp obL,x
        bcs oSL1                ; the WALL's edge wins: keep it exact
        lda obL,x
        and #$fc                ; the ORB's edge wins: round out to the start of its cell
oSL1:   sta osL
        lda ohRun
        cmp obR,x
        bcc oSR1                ; the WALL's edge wins
        lda obR,x
        ora #$03                ; the ORB's edge: round out to the end of its cell
oSR1:   sta osR
        lda osL
        cmp osR
        beq oSCall
        bcs oSAdv               ; inverted intersection: nothing to stamp for this span
oSCall: jsr oSCells
oSAdv:  ldx ohBX
        cpx nbnd
        bcs oSDone
        lda bndT,x
        sta ohL
        inc ohBX
        jmp oSSpan
oSDone: lda omPri            ; was anything stamped for this orb? then its seams must go
        ldx osI
        and orbBitT,x
        beq oSDsk
        jsr oSDeseam
oSDsk:  inc osI
        lda osI
        cmp osN
        bcs oSHole              ; end of this pass -- there may be a second one
        jmp oSLoop
; ---- the UPPER half of a tall entity: take the priority bit, stamp nothing ----
; Its rows are already covered -- orbBlankT is negative for a two-sprite variant so the LOWER
; slot's span reaches over both -- but $d01b is per SPRITE, and without its bit set this half
; draws in front of the very occluders the lower half just laid down.
; The lower half is always the slot BEFORE it: orbOne does inc onv / ldx onv, and
; entity slots run upward from 0 while holes come downward from 8, so the pair is contiguous.
; occStamp walks slots in ascending order, so the lower half's bit is already in omPri here.
oSUpHf: dex
        lda orbBitT,x
        and omPri
        beq oSNext              ; the lower half was not occluded, so neither is this one
        inx
        lda orbBitT,x
        ora omPri
        sta omPri
oSNext: inc osI
        lda osI
        cmp osN
        bcc oSLoop
        ; ---- and round again over the HOLE-LIKE slots, which are at the OTHER END ----
        ; Entity slots run upward from 0 and hole-like ones downward from 8, so the orb loop's
        ; bound cannot reach a socket however high it counts -- which is why letting sockets past
        ; the gate above changed nothing at all until this existed. One re-entry rather than a
        ; second copy of the loop; osN = 8 is also the flag that says this pass has been done,
        ; and it cannot collide with the first pass, since onv = 8 leaves no slots for holes.
oSHole: lda osN
        cmp #$08
        beq oSDn

        lda onvH
        cmp #$08
        beq oSDn                ; nothing hole-like took a slot this frame
        sta osI
        lda #$08
        sta osN
        jmp oSLoop
oSDn:   rts

; (level code 'big' cut here: see LX_SRC)

; oSCells: fill cells [osL>>2 .. osR>>2] x rows [osRow .. osRowB] with the whole-cell occluder,
; and set this orb's priority bit. Whole cells only for now: the edge splits are the next step,
; so occlusion currently quantises to a 4-column cell (8 screen pixels).
oSCells:        lda osL
        and #$03
        tay
        lda occRT,y
        sta ohFst               ; the glyph for the cell the stamp starts in, on black ...
        lda occRTW,y
        sta ohFstW              ; ... and the same shape on white
        lda kMskT,y
        sta ohFstM              ; ... and which of the cell's columns this split leaves showing
        lda osR
        and #$03
        tay
        lda occLT,y
        sta ohLst               ; ditto for the cell it ends in
        lda occLTW,y
        sta ohLstW
        lda mMskT,y
        sta ohLstM
        ldx osI
        lda orbBitT,x
        ora omPri
        sta omPri               ; this orb is now BEHIND foreground
        lda osRow
        sta ohSv
oSCRow: lda ohSv
        cmp osRowB
        beq oSCRlo              ; the LAST row of the stamp: the only one that can hang past the
        bcs oSCDn               ;   wall's base, so the only one allowed to synthesise
        lda #$00
        sta osLast
        lda ohSv
        bcc oSCR1               ; always: carry is clear on this path
oSCRlo: lda #$01
        sta osLast
        lda ohSv
oSCR1:  cmp #$19
        bcs oSCDn               ; rowLoT/rowHiT hold 25 entries. Indexing past them gives a
                                ; garbage high byte, osPtr then points ANYWHERE, and the store
                                ; below writes wherever that lands -- including over osI and osN,
                                ; the loop's own counters. That is how one bad row became a
                                ; runaway loop writing across the machine.
        tay
        lda rowLoT,y
        sta osPtr
        lda rowHiT,y
        clc
        adc baseHi
        sta osPtr+1
        lda osL
        lsr
        lsr
        tay                     ; first cell
        cpy #$28
        bcs oSCDn               ; and a cell index has to be a real column, 0..39
        lda osR
        lsr
        lsr
        cmp #$28
        bcc oSCR2
        lda #$27
oSCR2:  sta ohRun               ; last cell
        cpy ohRun
        bcc oSCMid
        bne oSCNx               ; first cell past last: an inverted range, nothing to stamp
        ; ---- the whole stamp lies inside ONE cell ----
        ; Columns k..m of it clip, and no single glyph says that unless k is 0 or m is 3.
        ;
        ; When k IS 0 the "from the left" glyph says it exactly, so use that. Taking the
        ; from-the-right one unconditionally covered k..3 whatever m was, which put a column of
        ; foreground black outside the wall's own edge -- visible against the ceiling beyond it.
        ; The wall's edge is the one end that has to be exact; that is the whole reason the split
        ; glyphs exist.
        ;
        ; With both ends interior there is still no glyph for it, and it stays the from-the-right
        ; one: over-covering takes a small bite out of the orb, while under-covering leaves orb
        ; drawn ON the wall, which is the error that reads as broken.
        ; With synthesis the single-cell case is exact: the covered columns are k..m, i.e. those
        ; in NEITHER mask, and the fallback glyph (used only when the scratch slots run out) is
        ; whichever edge glyph the old rule chose.
        lda ohFstM
        ora ohLstM              ; showing = left of k OR right of m
        pha
        lda osL
        and #$03
        bne oSC1r
        ldx ohLst
        stx osGly
        ldx ohLstW
        stx osGlyW              ; the white-backed twin: oSPut picks between them
        jmp oSC1g
oSC1r:  ldx ohFst
        stx osGly
        ldx ohFstW
        stx osGlyW              ; the white-backed twin: oSPut picks between them
oSC1g:  pla
        jsr oSPut
        jmp oSCNx

        ; ---- only stamp cells that actually HOLD WALL ----
        ; The stamp covers the ORB's rows, on the assumption that a wall which occludes an orb
        ; extends below its feet. Where that does not hold -- a receding wall whose base has risen
        ; above the orb's bottom -- it painted foreground black onto the FLOOR, below the orb,
        ; where there is nothing to occlude with.
        ;
        ; renderSym has just drawn the scene, so the cell itself is the answer, with no depth or
        ; height arithmetic anywhere. And the test is the user's own rule: occlusion is vertical
        ; edges and FULLY BLACK WALL CHARS. Only SOLID and the seam variants are fully wall.
        ;
        ; Testing merely "not BLANK" was not enough. A cell at the wall's BASE is a partial edge
        ; cell -- part wall, part floor -- and the splits are horizontal only, so stamping one
        ; paints its floor half black. That is the black block below the wall's lower bound.
        ; Skipping them leaves up to 8px of orb showing over the wall's bottom edge instead, which
        ; is the smaller error and the one that reads as a soft edge rather than a stray block.
oSCMid: lda ohFstM              ; the columns this split leaves showing; oSPut covers the rest
        ldx ohFst
        stx osGly
        ldx ohFstW
        stx osGlyW              ; the white-backed twin: oSPut picks between them
        jsr oSPut
oSCCol: iny
        cpy ohRun
        beq oSCLst
        lda #$00                ; interior: every column covered
        ldx #$da
        stx osGly
        stx osGlyW              ; the white-backed twin: oSPut picks between them
        jsr oSPut
        jmp oSCCol
oSCLst: lda ohLstM
        ldx ohLst
        stx osGly
        ldx ohLstW
        stx osGlyW              ; the white-backed twin: oSPut picks between them
        jsr oSPut
oSCNx:  inc ohSv
        jmp oSCRow
; (oSWall -- "is the cell at (osPtr),y FULLY wall" -- lived here; oSBack replaced every call to it,
; and it was deleted on 2026-10-10 as dead code.)
; oSBack: choose an EDGE cell's backing. A = the cellFillT mask naming the columns the split does
; NOT cover. Carry set -> the black-backed glyph, because those columns hold wall; clear -> white.
;
; This is the question oSWall could not answer. "Is the cell SOLID" conflates two different cells:
; a step at a CORNER is not SOLID but has wall on both sides and wants BLACK, while a cell on a
; vertical silhouette has floor or ceiling beyond it and wants WHITE. Both took white, so the
; corner case showed a white notch where the wall continues.
;
; X is not live in the cell loop, but oSCDn's cache invalidation follows it, so save it rather
; than depend on that -- twice per span row is not worth the coupling.
oSBack: sta ohMsk
        stx ohMsX
        lda (osPtr),y
        tax
        lda cellFillT,x
        ldx ohMsX
        and ohMsk
        beq oSBw
        sec
        rts
oSBw:   clc
        rts

oSCDn:  lda osL                 ; invalidate the cache for every cell column just stamped
        lsr
        lsr
        tay
        lda osR
        lsr
        lsr
        sta ohSv
oSCIv:  lda #$ff
oSInv:  sta cbA,y               ; operand patched above to this buffer's cache
        lda #$00                ; The two tests are ordered compares in OPPOSITE directions,
oSInvW: sta cwA,y               ;   so they need opposite poisons: $ff would read as a SHRUNK
                                ;   ceiling and be skipped, and 0 is a length rs can take.
        cpy ohSv
        bcs oSCId
        iny
        bne oSCIv
oSCId:  rts

; oSDeseam: a seam inside a stamped orb's box would clip it -- seams are bit pair 10, the only
; other foreground in the charset. Replace each with plain SOLID, which is the same black at bit
; pair 01 and cannot clip. The orb's WHOLE box, not just the occluded part: a near wall's seam
; would otherwise bite an orb that a DIFFERENT wall is occluding at the edge.
;
; Only reached by orbs that were actually stamped, so an unoccluded orb pays nothing and keeps
; its seams -- which is the whole reason the priority bit is per orb rather than global.
oSDeseam:
        ldx osI
        lda obCR,x              ; the orb's full cell range; hoisted, CPY has no abs,x
        cmp #$28
        bcc oSDc1
        lda #$27                ; a cell index must be 0..39 whatever the slot data says
oSDc1:  sta osR
        lda obCL,x
        cmp #$28
        bcs oSDDn
        sta osDC
        ; COLUMNS OUTER, rows inner. seamT says per cell column what the solid run carries --
        ; SOLID, or a seam variant when a panel line lands there -- so a column with no seam skips
        ; all of its rows without a single screen read. Seams are rare, so nearly every column
        ; exits here. With the test inside the row loop instead it saved the read but kept the
        ; loop, and cost the same 3 fps.
oSDCol: ldy osDC
        lda seamT,y
        cmp #$c7
        bcc oSDNx
        cmp #$d7
        bcs oSDNx
        lda osRow
        sta ohSv
oSDRow: lda ohSv
        cmp osRowB
        beq oSDR1
        bcs oSDNx
oSDR1:  cmp #$19
        bcs oSDNx               ; same bound as oSCells -- never index the row tables past 24
        tay
        lda rowLoT,y
        sta osPtr
        lda rowHiT,y
        clc
        adc baseHi
        sta osPtr+1
        ldy osDC
        lda (osPtr),y           ; the seam does not reach every row of the box: the rows above the
        cmp #$c7       ;   solid run are ceiling or edge cells and must not become SOLID
        bcc oSDRN
        cmp #$d7
        bcs oSDRN
        lda #$01
        sta (osPtr),y
        lda #$ff
oSDIn:  sta cbA,y               ; operand shares oSInv's patch target
oSDRN:  inc ohSv
        jmp oSDRow
oSDNx:  ldy osDC
        cpy osR
        bcs oSDDn
        inc osDC
        jmp oSDCol
oSDDn:  rts

osFlush:
        ldx #$08                ; ALL eight slots, not onv: the hole and the carried-orb icon
osLp:   dex                     ;   allocate DOWNWARD from 7, so a loop bounded by onv set their
                                ;   enable bit and never wrote X/Y/pointer -- both stayed parked
                                ;   at 0,0, off the top of the screen. Flushing an unallocated
                                ;   slot in between is free: its enable bit is clear.
        txa
        asl
        tay
        lda obX,x
        sta $d000,y
        lda obY,x
        sta $d001,y
        lda obP,x
        sta $e3f8,x             ; the pointer lives in the SCREEN, so both buffers need it
        sta $e7f8,x
        lda obC,x
        ldy flkDk               ; FLKSPR: in the dark the body wears the darker colour
        beq osC
        tay
        lda flkMapT,y
osC:
        sta $d027,x
        cpx #$00
        bne osLp
        jsr idolLat             ; THIS frame's finding, not last frame's. Latched at the start
                                ;   of the projection it lagged a whole rendered frame: on the
                                ;   frame you set the idol down, carry is already 0 and the world
                                ;   entity is already placed, but idolOn still said "not in view"
                                ;   -- so the palette fell back to the level's greys for 50ms
                                ;   between the button and the idol appearing.
        ; ---- SILVER: what is on screen NOW is what svTick may repoint ----
        ; svTick used to read the list the projection was still building, so for the rest of a
        ; rendered frame it put the NEXT rung's bitmaps into slots still showing the old rung's X,
        ; Y and expand bits -- a quadrant of the wrong size, or in the wrong place, for a few 60ths:
        ; the "strange glitchy size jumps" (the user, 2026-10-13). Copied here, as the registers are
        ; written; the count goes to 0 first so an IRQ mid-copy sees an empty list, not a torn one.
        lda #$00
        sta svLCnt
        ldy svCnt
        beq osSv0
osSvL:  dey
        lda svSlT,y
        sta svLSlT,y
        lda svBsT,y
        sta svLBsT,y
        tya
        bne osSvL
osSv0:  lda svCnt
        sta svLCnt
        jsr lxWr                ; and the frame that is up NOW, not the one the projection saw (svWr)
osBits: lda omEn
        sta $d015
        lda omMc
        sta $d01c
        lda omXX
        sta $d01d
        lda omYY
        sta $d017
        lda omPri
        sta $d01b
        lda omX8
        sta $d010
        rts

; (orbOne -- project orb oidx, and if it lands on screen take the next sprite slot -- is below, after orbProj.)

; ---- orbProj: cell delta (oix, oiy) -> ohgt and |column offset from screen centre| ----
; Split out of orbOne so the drop-target chooser can ask "where would an entity standing in
; THAT cell appear" without a second copy of the projection. C clear on return means nowhere
; on screen at all: behind the camera, close enough to be inside us, or past 255 columns off
; centre. oaS carries the side. Nothing here touches oidx, which is why it splits cleanly.
; ---- orbProjC: ONE projection for an idol and the drum it stands on ----
; An idol up on a pedestal stands in the pedestal's cell, and orbProj depends on nothing but the cell
; (its FOV bound is the same for every kind -- checked), so the two were being projected twice to
; bit-identical answers: ~1,830 cycles each, three times a frame on the hub with every idol seated.
; Hole-likes run before orbs (holeOne first), so the DRUM's answer -- ohgt, ocoff, oaS and the carry,
; the only things read after orbProj -- is kept, and an idol standing on it restores it. Kept only for
; THIS frame (entGate clears pcP); a drum culled before projecting keeps nothing, and its idol
; projects itself.
orbProjC:
        ldx oidx
        cpx nOrbT
        bcc opcOrb
        txa                     ; a hole-like (they run FIRST, in holeOne): if it is a pedestal,
        sec                     ;   project it and keep the answer for the idol that may stand on it
        sbc nOrbT
        sec
        sbc nPedT               ; the hole-like index where the pedestals start
        bcc opcP                ; an exit or a socket: just project
        cmp #$03
        bcs opcP
        pha
        jsr orbProj
        php
        pla
        tax                     ; the flags
        pla
        tay                     ; the pedestal index
        txa
        sta pcP,y               ; the flags, carry included -- never 0, so it doubles as "kept"
        lda ohgt
        sta pcH,y
        lda ocoff
        sta pcC,y
        lda oaS
        sta pcS,y
        lda pcP,y
        pha
        plp
        rts
opcOrb: ldy orbIdolT,x          ; an orb: an idol up on a drum whose answer is already kept?
        bmi opcP
        lda idolOnPedT,y        ; pedestal index + 1, 0 = on the floor
        beq opcP
        tay
        dey
        lda pcP,y
        beq opcP                ; the drum was not projected this frame: do it ourselves
        lda pcH,y
        sta ohgt
        lda pcC,y
        sta ocoff
        lda pcS,y
        sta oaS
        lda pcP,y
        pha
        plp                     ; the carry the drum's projection returned
        rts
opcP:   jmp orbProj
pcH:    !fill 3, 0
pcC:    !fill 3, 0
pcS:    !fill 3, 0
pcP:    !fill 3, 0
orbProj:
        ldy #$00                ; magnitudes and signs, so the products can be unsigned
        lda oix
        bpl oipx
        eor #$ff
        clc
        adc #$01
        ldy #$ff
oipx:   sta oax
        sty oixS
        ldy #$00
        lda oiy
        bpl oipy
        eor #$ff
        clc
        adc #$01
        ldy #$ff
oipy:   sta oay
        sty oiyS
        ; forward = Ix*cos + Iy*sin + kf
        lda oixS
        eor ocosS
        ldy oax
        jsr oTmC
        lda orL
        sta fwdL
        lda orH
        sta fwdH
        lda oiyS
        eor osinS
        ldy oay
        jsr oTmS
        clc
        lda fwdL
        adc orL
        sta fwdL
        lda fwdH
        adc orH
        sta fwdH
        clc
        lda fwdL
        adc kfL
        sta fwdL
        lda fwdH
        adc kfH
        sta fwdH
        lda fwdH                ; behind the camera, or close enough to be inside us. Tested
        bmi opjNo               ; HERE, before "right" costs two more products: at any given
        bne ofwOk               ; moment most of the world is behind you
        lda fwdL
        cmp #$40
        bcc opjNo
ofwOk:  ; right = Iy*cos - Ix*sin + kr
        lda oiyS
        eor ocosS
        ldy oay
        jsr oTmC
        lda orL
        sta rgtL
        lda orH
        sta rgtH
        lda oixS
        eor osinS
        ldy oax
        jsr oTmS
        sec
        lda rgtL
        sbc orL
        sta rgtL
        lda rgtH
        sbc orH
        sta rgtH
        clc
        lda rgtL
        adc krL
        sta rgtL
        lda rgtH
        adc krH
        sta rgtH
        ; ---- beside the camera: off screen by construction, so stop HERE ----
        ; The column is F_COL * |right| / forward with F_COL ~ 184. The widest thing drawn is the
        ; exit hole at 36 columns each side of its centre (holeXOffT; the orbs reach 24), and
        ; holeTail draws a pair whose start is under 160 or whose end is under 72 -- so a centre
        ; up to 80 + 36 = 116 columns off axis can still put pixels on screen, and NOTHING past
        ; that can: |right| / forward > 116/184 = 0.63. Everything below this point (the
        ; reciprocal, three multiplies, then the box tests) exists to discover that at ~800
        ; cycles a time, and on the benchmark 56% of the entities that got this far were thrown
        ; away there. Test |right| > forward * 3/4 = forward/2 + forward/4: LOOSER than 0.63, so
        ; it can only reject what the box tests would have rejected anyway, and it is two shifts
        ; and a 16-bit compare. The band 0.63..0.75 still takes the long road; it is thin.
        ; The first cut used 5/8 = 0.625 from the ORB width, one column inside the hole's real
        ; bound, and FOVCHK caught it: 4 sprites in a walkthrough that the cull would have
        ; dropped. Verified at 3/4: fovBad = 0 on both walkthroughs. Do not tighten this without
        ; re-running FOVCHK=1 on a route that shows the hole at the screen edge.
        ; Signed compare: right can be negative; forward is known positive here (tested above).
        lda rgtL                ; |right| -> o0:o1. o0..o2 and ogL/ogH are orbProj's own
        sta o0                  ;   scratch, all written AFTER this point, so they are free here
        lda rgtH
        sta o1
        bpl ofvP
        sec
        lda #$00
        sbc o0
        sta o0
        lda #$00
        sbc o1
        sta o1
ofvP:   lda fwdH                ; bound = fwd/2 + fwd/4: fwd is positive, so plain shifts
        lsr
        sta ogH
        lda fwdL
        ror
        sta ogL                 ; fwd/2
        lda ogH
        lsr
        sta o2
        lda ogL
        ror                     ; fwd/4
        clc
        adc ogL
        sta ogL
        lda o2
        adc ogH
        sta ogH
        lda o1                  ; |right| > bound ?
        cmp ogH
        bcc ofvOk
        bne ofvNo
        lda o0
        cmp ogL
        bcc ofvOk
        beq ofvOk
ofvNo:  jmp opjNo
ofvOk:
        ; iv = 1048576 / forward, via the existing 65536/n table. Normalise G = forward*2 down
        ; to 8 bits (n in 128..255, e shifts) and iv = recip[n] << (5-e). Dropping the low bits
        ; of forward costs under 0.4% -- less than half a column at the screen edge.
        lda fwdL
        asl
        sta ogL
        lda fwdH
        rol
        sta ogH
        lda #$00
        sta oe
onLp:   lda ogH
        beq onDn
        lsr ogH
        ror ogL
        inc oe
        jmp onLp
onDn:   ldx ogL
        lda recipLoT,x
        sta ivL
        lda recipHiT,x
        sta ivH
        lda #$05
        sec
        sbc oe
        beq ivDn
        bmi ivRt
        tax
ivLp:   asl ivL
        rol ivH
        dex
        bne ivLp
        jmp ivDn
ivRt:   tax                     ; e > 5: shift the other way instead
ivRl:   lsr ivH
        ror ivL
        inx
        bne ivRl
ivDn:   ; h = 22528/forward = iv * 11/512, the same 88/d the walls use. iv * 11 = iv + 2iv + 8iv,
        ; by shifts and adds -- a constant multiplier needs no mul8, and this was two of them an
        ; entity (2026-10-14). The 24-bit result o2:o1:o0 is the same exact product they gave.
        ; ogL/ogH/o3 are free here: the FOV bound above is done with ogL/ogH, and o3 is not
        ; written until orbYok, after the projection.
        lda ivL                 ; o = iv
        sta o0
        lda ivH
        sta o1
        lda #$00
        sta o2
        sta o3
        lda ivL                 ; s = 2iv
        asl
        sta ogL
        lda ivH
        rol
        sta ogH
        rol o3
        jsr oAddS               ; o = 3iv
        asl ogL                 ; s = 8iv
        rol ogH
        rol o3
        asl ogL
        rol ogH
        rol o3
        jsr oAddS               ; o = 11iv
        lsr o2
        ror o1
        lda o0                  ; FINECOL: keep the fraction the shift drops (the carry is
        ror                     ;   o1's old bit 0), so the column below is not quantised to
        sta ocF                 ;   whole rows of h
        lda o2
        beq ohOk
        lda #$ff
        sta o1
ohOk:   lda o1
        sta ohgt
        ; column offset = right * (80/tan(FOV/2)) / forward. h is ALREADY 22528/forward, so the
        ; ratio comes free off it -- right*h/183 -- and the 16x16 multiply plus 32-bit shift
        ; that computing right/forward separately would need is gone entirely.
        lda rgtL
        sta oaL
        lda rgtH
        sta oaH
        jsr oabs
        lda ohgt
        sta mq
        lda oaL
        jsr mul8
        lda plo
        sta o0
        lda phi
        sta o1
        lda ohgt
        sta mq
        lda oaH
        jsr mul8
        clc
        lda o1
        adc plo
        sta o1
        lda phi
        adc #$00
        bne opjNo               ; |right|*h past 65535 is far outside the FOV
        lda oidx                ; FINECOL: the SENTRIES only, entities 0..svN-1 (holes are all
        cmp svNT                ;   past nOrbT, so past them too)
        bcc ocfGo
        cmp nOrbT               ; ...and the BIG angel, which glides in at an angle in plain sight: the
        bcs ocfDn               ;   user saw it "go right, then snap back over and over as it approaches"
        tay                     ;   from the side of the hall (a hole-like is past the entity tables)
        lda orbTallT,y
        cmp #$02
        bne ocfDn
ocfGo:
        lda ocF                 ; ---- FINECOL: + |right| * frac(h) / 256 ----
        beq ocfDn               ; Without it the column moves only when h ticks over a whole row,
        sta mq                  ;   and at a distance h is ~10: the column held still (or drifted
        lda oaL                 ;   with |right| alone) and then jumped ~10% when h stepped, so an
        jsr mul8                ;   orb gliding in at an angle sawtoothed sideways, "right a few
        lda phi                 ;   pixels, then a left jump" (the user, 2026-10-13). Two more
        sta o2                  ;   mul8s per projection.
        lda oaH
        jsr mul8
        clc
        lda o2
        adc plo
        sta o2
        lda phi
        adc #$00
        sta ogL
        clc
        lda o0
        adc o2
        sta o0
        lda o1
        adc ogL
        sta o1
        bcs opjNo
ocfDn:
        lda #179                ; /183.2, as *179 >> 15. The product is 24 bits and a 15-bit
        sta mq                  ; shift of it is just (b2 << 1) | (b1 >> 7) -- no shift loop.
        lda o0
        jsr mul8
        lda phi
        sta o2
        lda #179
        sta mq
        lda o1
        jsr mul8
        clc
        lda o2
        adc plo
        sta o2
        lda phi
        adc #$00
        asl o2
        rol
        bcs opjNo               ; past 255 columns off centre: nowhere near the screen
        sta ocoff
        sec
        rts
opjNo:  clc
        rts
ocF:    !byte 0                 ; FINECOL: h's fraction, orbProj -> its own column
orbOne: ldx oidx
        sec                     ; Ix, Iy = orb cell - player cell, -15..15
        lda orbXCT,x
        sbc px+1
        sta oix
        sec
        lda orbYCT,x
        sbc py+1
        sta oiy
        ; ---- the cone's verdict, decided ONCE, in entGate ----
        ; 8 cycles. entGate now runs the bearing test for every entity BEFORE omTrig, which is the
        ; whole point: omTrig's ~800 cycles of frame trig used to run before anything asked whether
        ; an entity would use them, and the gate could not answer because all it tested was whether
        ; an un-hidden orb exists ANYWHERE on the level -- always yes, so it closed on zero frames
        ; of a 4,630-frame run. The test is not new work here, it is the SAME work moved up.
        lda ovProbe
        bne cnYes               ; PROBING a hypothetical cell (angStep): the cached verdict is for
                                ;   where the angel really IS, so it says nothing about where it is
                                ;   thinking of going. Take the full path -- it runs at most once
                                ;   per angel per two seconds, and a wrong "not visible" here is
                                ;   exactly what would let one walk into the open.
        ldx oidx
        lda cnOkT,x
        bne cnYes
        jmp orbNo
cnYes:
        jsr orbProjS             ; -> ohgt, ocoff, oaS. Everything below needs the entity,

        bcc orbNo               ;   everything above needs only the cell it stands in

        lda oidx                ; the death sweep steers by ONE entity's column offset, so
        cmp dieIdx              ;   test identity, not tallness: hole-like entities reach the tall
        bne odSk                ;   test below with an index PAST THE END of orbTallT, and a stray
        lda ocoff               ;   non-zero there let the exit hole coming into view stop the
        sta dieOff              ;   sweep dead, forty degrees short of the angel.
        lda oaS                 ; ocoff is an unsigned MAGNITUDE: orbOne takes the side from oaS
        sta dieSgn              ;   and forms 80+ocoff or 80-ocoff. Read as a signed byte instead,
                                ;   250 columns off centre looks like -6 and the lock fires on it.
odSk:
        ldx ohgt                ; --- size variant, scaled exactly as the walls are ---
        cpx #$61               ; past here every height gets the same rung, and the
        bcc omVarC              ;   tables stop one entry into that tail (see VAR_CLAMP)
        ldx #$61
omVarC:
        ldy oidx                ; TALL entities have their own rungs, appended to the same
        cpy bltIxT              ; the BALL LIGHTNING: its own rungs (bltVarT)
        bne omVarN
        lda bltVarT,x
        jmp omVarS
omVarN:

        cpy svNT                ;   variant list so every table indexed by ovar still works --
        bcc omVarV              ;   and so do the SENTRIES, entities 0..svN-1, after the angel's
        lda orbTallT,y
        beq omVarO
        lsr                     ; 2 = the BIG angel (LEVEL_BIG): its own distance map
        bne omVarG

        lda angVarT,x
        bne omVarS              ; always taken: the angel's rungs never start at 0
omVarG: cpx #$40               ; (its table stops where its top rung begins)
        bcc omVgC
        ldx #$3f
omVgC:  lda bigVarT,x
        cmp #$2d               ; its TOP rung: drawn at full size
        jmp omVarS              ; (a bne here was never taken: Z is the cmp's, equal)
omVarV: lda svVarT,x
        bne omVarS              ; always taken: nor do the sentry's
omVarO: lda orbVarT,x
omVarS: sta ovar
        lda oaS                 ; --- centre column ---
        bmi ocN
        clc
        lda #80
        adc ocoff
        bcc ocS                 ; 80 + ocoff past 255 means the centre is off the RIGHT of the
        jmp orbNo               ;   screen by more than a screen's width. ocol is a plain byte,
                                ;   so it WRAPS -- and a wrapped ocol is a small number, which
                                ;   reads as a column near the LEFT edge. An orb 59 degrees off
                                ;   axis was drawn at column 16, and as the player turned away
                                ;   from it ocoff grew, so the ghost slid RIGHT across a scene
                                ;   moving the other way, until ocoff finally passed 255 and the
                                ;   guard above deleted it. The mirror case going LEFT was
                                ;   handled (ocolN, below); this side was not. Rejecting is
                                ;   safe: a centre at column 256+ puts the nearest edge of the
                                ;   widest orb at column 244, off the 160-column screen.
ocN:    sec
        lda #80
        sbc ocoff
        bcs ocS
        ; The centre is LEFT of column 0. ocol is a plain byte, so it has just wrapped to
        ; something large -- and a large ocol is indistinguishable from an orb far to the RIGHT.
        ; Keep the magnitude and a flag instead, so the box code below can tell the two apart. An
        ; orb whose CENTRE is off the left edge can still be half on screen, and treating its
        ; wrapped column as "off the right" would delete it.
        eor #$ff
        clc
        adc #$01                ; A = how far left of column 0 the centre sits
        sta ocol
        lda #$ff
        sta ocolN
        jmp ocDn
ocS:    sta ocol
        lda #$00
        sta ocolN
ocDn:
        lda oidx
        cmp nOrbT
        bcs holeTail            ; entries above the orbs in orbXCT/orbYCT are HOLES. Everything
                                ;   up to here -- forward, right, h, ocol -- is the same
                                ;   question for a disc on the floor as for a sphere; only the
                                ;   ladder differs, because a disc projects to an ellipse whose
                                ;   aspect changes with distance and a sphere does not.
        ; --- screen X, on the 160-COLUMN grid: X = 2 * (ocol + orbXOffT) ---
        ; The engine is 160x200 throughout and a multicolor sprite pixel is two hires pixels, so
        ; there is no odd sprite X worth having. This used to build a signed 16-bit HIRES x --
        ; two 16-bit adds and a 16-bit subtract -- and then threw the low bit away again with
        ; an AND #$fe. In columns it is one byte add and a shift, X is even by construction,
        ; and the half column the snap could take is gone, which is what lets the bounding box
        ; above be exact instead of rounded outward.
        ldx ovar
        lda ocolN
        bne oxNeg
        lda ocol                ; centre on screen: b = ocol + (12 - halfCols)
        clc
        adc orbXOffT,x
        ldy orbXOffT,x          ; SILVER: a NEGATIVE offset (a magnified 2x2 rung) borrows
        bmi oxDn                ;   rather than carries; b >= -12, and asl wraps it (see oxNeg)
        bcc oxDn
        jmp orbNo               ; b past 255: far off the right, and b<<1 would wrap
oxNeg:  lda orbXOffT,x          ; centre is ocol columns LEFT of column 0, so b = offset - ocol
        sec
        sbc ocol
        ; A NEGATIVE b IS FINE: SPRITE X WRAPS. This used to reject the entity here ("left of X = 0,
        ; which no sprite can be"), so a close orb or angel vanished while part of it was still on
        ; screen -- and the angel's move probe, which runs through here, read that as "nothing of it
        ; shows" and let an angel you could SEE move. holeTail has always relied on the wrap: X is
        ; 9 bits and the beam's counter rolls over, so a sprite placed at 2b mod 512 draws its
        ; visible part at the left of the same line. An entity with NOTHING on screen is rejected by
        ; the box test further down, before any slot takes this X; for the rest, b >= -24, so asl of
        ; the two's-complement byte is exactly the wrapped X: bit 7 of b becomes the X8 bit.
oxDn:   asl                     ; X = b * 2, low byte and the X8 bit
        sta o0
        lda #$00
        rol
        sta o1
        ; --- screen Y: ground shadow on the floor line, 100 + h ---
        ; $d001 = 150 + h - anchor, but computed as (150 - anchor) + h. Adding 150 first
        ; carries out of a byte once h passes 105, which used to cap how close an orb could
        ; get -- it blinked out at 0.84 cells instead of sliding off the bottom. Folding the
        ; anchor into the constant keeps the sum in range all the way down to 0.62 cells,
        ; which is past the point where the whole sprite is below the last visible line.
        ldx ovar
        ldy oidx                ; the BIG angel FLOATS: its centre held BIGC rows above the horizon
        lda orbTallT,y          ;   at every distance, so close up it looms rather than sinking
        cmp #$02                ;   with the floor line -- one Y per rung, bigYT (level code: bgFlt)
        beq oBgY
        cpy bltIxT              ; ...and its BALL LIGHTNING floats too
        bne oBgN
oBgY:   jmp lxBgY
oBgN:
        cpx #$24               ; a SENTRY's rung? It hovers (below); nothing else does
        bcc oSvYn
        cpx #$2d               ; (the big angel's rungs follow the sentry's)
        bcc oSvY
oSvYn:
        lda orbYBaseT,x
        clc
        adc ohgt
        jmp oSvYD
oSvY:   lda orbYBaseT,x
        clc
        adc ohgt
        sta svY                 ; ---- SENTRY: lifted to the horizon (svCtrT) ----
        lda #$00                ;   The floor-anchored Y in 16 bits first, because close up it
        adc #$00                ;   passes 255 BEFORE the lift brings it back on screen -- the
        sta svYH                ;   pinning test below would otherwise sink the ball to the floor
        lda ohgt                ;   the moment you walked under it.
        sec                     ; the lift: h - the rung's ball centre (its centre to the horizon,
        sbc svCtrT,x            ;   h rows above the floor), never below 0 -- X is ovar
        bcs svLfP
        lda #$00
svLfP:  sta svDLo               ; (svTouch's scratch: svStep runs after the projection)
        lda svY
        sec
        sbc svDLo
        sta svY
        lda svYH
        sbc #$00
        bmi svTop               ; lifted past the top of the frame: park it above the screen
        bne orbYCp              ; still past 255: below the screen, pinned like anything else
        lda svY
        clc                     ; so the bcs below falls through
        bcc svYDn               ; always
svTop:  lda #$00
        clc
svYDn:
oSvYD:
        bcs orbYCp              ; the sum passed 255, so it is far below the screen
        pha                     ; ---- centre a TALL entity on its ideal height ----
        ldy oidx                ;   the offset is half the rung's quantisation error, signed,
        lda orbTallT,y          ;   precomputed per ohgt -- see angMidT in the build. X holds
        cmp #$01                ;   (the BIG angel stands on the floor: angMidT is the angel's)
        bne oMidSk

        ldy ohgt
        pla
        clc
        adc angMidT,y
        jmp oMidNo
oMidSk: pla
oMidNo:
        ; ---- an idol standing ON a pedestal sits on its TOP plane, not the floor ----
        ; Everything else is anchored to the floor line at 100 + h. The drum's top is
        ; 2*PEDH*h above that at every distance -- a fixed fraction of the apparent height the
        ; projection is already holding -- so this is one table lookup, no distance maths and
        ; no second art. X still holds ovar for the cap below, so only A and Y move.
        pha                     ; the floor-anchored Y, while A does the asking
        ; orbIdolT is nOrbT long and oidx indexes orbs AND holes -- but ocDn above has
        ; already sent everything at or past nOrbT to holeTail, so nothing reaching here can be
        ; out of range. Said out loud because the table is short enough to look unsafe.
        ldy oidx
        lda orbIdolT,y
        bmi oPedNo              ; $ff: not an idol, so never raised
        tay
        lda idolOnPedT,y
        beq oPedNo              ; an idol, but standing on the floor like everything else
        lda ohgt
        lsr                     ; pedLiftT is indexed by ohgt>>1 -- 64 bytes instead of 128
        cmp #$40   ; ...but ohgt is NOT bounded by 127. A cell from a pedestal it
        bcc oPedIx              ;   is about 147, which indexed ten bytes PAST the table and
        lda #$3f  ;   lifted the sprite by whatever idolXT happened to hold.
oPedIx: tay                     ;   Clamped: at that range the drum is taller than the screen
                                ;   and a row or two of lift is not what you would notice.
        pla
        sec
        sbc pedLiftT,y
        jmp oPedDn
oPedNo: pla
oPedDn:
        cmp orbYCapT,x
        bcc orbYok
orbYCp: lda orbYCapT,x          ; PINNED rather than dropped: an entity you are pressed against
orbYok: sta o3                  ;   keeps ORB_FLOOR rows above the last raster line, so anything
                                ;   close enough to pick up is close enough to see
        ; ---- occlusion: is the orb beyond the faces it overlaps? ----
        ; A face occludes the orb only if the orb lies on the FAR side of its plane. We render
        ; camera-facing faces only, so anything on screen already faces the camera; if the orb
        ; is beyond it, the face is between them. That answer never involves the camera, so it
        ; is precomputed at build time: one bit per (orb, run).
        ;
        ; Per FACE, not per column, and that is the whole point. Comparing the orb's height
        ; against the wall's was per column and quantised, so two cells of one flat wall could
        ; disagree -- and every occlusion artifact in this thing has been exactly that
        ; disagreement showing up as a sliver of orb through a wall or a slice cut out of one.
        ; ---- record what this orb needs, for the paint pass below ----
        ; Nothing is decided here and nothing is written to the screen. The orb states which
        ; columns under it must clip it; orbPaint merges every orb's statement and renderSym
        ; then draws each column that way the first time. There is no second pass over the
        ; walls at all, which is what removes every artifact that came from editing them.
        ldx ovar                ; the ball's extent each side of ocol, in logical columns. Two
        lda orbColLT,x          ;   tables, not one half-width: the ball is not centred on ocol
        sta o2                  ;   (see orbColLT) and an even-wide ball never can be
        lda orbColRT,x
        sta o2r
        lda ocolN
        bne opBLn
        lda ocol
        sec
        sbc o2
        bcs opBL1
        lda #$00                ; straddles column 0 from the right: lo is 0
        jmp opBL2
opBLn: lda o2r                ; centre LEFT of 0: the box ends at R - ocol...
        sec
        sbc ocol
        bcc opBLx              ; ...and if that borrows, nothing of it is on screen
        lda #$00
        jmp opBL2
opBLx: jmp orbNo
opBL1: cmp #$a0        ; starts past the last column: entirely off the right (rejecting,
        bcc opBL2              ;   not clamping -- a clamp turns "not on screen" into "column 159")
        jmp orbNo
opBL2: sta ocl2
        lsr                     ; ...and in CELLS, while A still holds it
        lsr
        sta ocl
        lda ocolN
        bne opBRn
        lda ocol
        clc
        adc o2r
        bcc opBR1
        lda #$9f
        jmp opBR1
opBRn: lda o2r                ; centre left of 0: the L test proved R >= ocol, so no borrow
        sec
        sbc ocol
opBR1: cmp #$a0
        bcc opBR2
        lda #$9f
opBR2: sta ocmax
        lsr
        lsr
        cmp ocl
        bcs opBR3
        lda ocl
opBR3:  sta ocr
        ; ---- is this orb WHOLLY occluded? ----
        ; The rule is the user's: a wall facing AWAY from an orb always occludes it, and a wall
        ; facing the orb never can. Which side of each face's plane an orb lies on is asked
        ; when needed (occBy, from runPFT and the orb's cell), so the only runtime question is
        ; whether some column under the orb shows a run that does NOT occlude it -- and the first
        ; such column means the orb is visible. There is no depth test and no height test:
        ;
        ;   - no depth, because the plane test decides it per FACE, so every column showing that
        ;     face gets the same answer by construction. Depth comparisons are per column and
        ;     quantised, which is where every occlusion artifact in this engine has come from.
        ;   - no height, because camera height is fixed and everything stands on the floor. A wall
        ;     that occludes an orb is NEARER, hence taller on screen with a lower base, so the orb
        ;     projects entirely inside its solid region and can never poke out above it.
        ;
        ; faceIdT is the run id per logical COLUMN, filled during casting for the run-merge, so it
        ; costs nothing to produce here -- and it is FINER than the per-cell fill the old scheme
        ; needed. A corner cell showing two different runs was the source of most of that scheme's
        ; artifacts and of its "every run in the cell must agree" rule; per column, that case does
        ; not arise.
occWalk:                        ; ENTRY POINT for a probe: with ovProbe set, ohHide rts's instead of
                                ;   jumping to orbNo, so a caller can ask the question and act on
                                ;   the answer itself. (There used to be an early exit here on a
                                ;   build-time "nothing reachable from this cell can occlude it"
                                ;   bit, ocanO; that bit was retired and every caller set it to
                                ;   $80, so the exit was dead and the variable constant -- gone.)

        ldy oidx                ; the BIG angel is as wide as a corridor, so one cell against each face's
        lda orbTallT,y          ;   plane cannot say what hides it (its wings reach past the walls its
        cmp #$02                ;   centre is clear of). DEPTH instead, per column: a wall hides it
        bne owNB                ;   where it is nearer (colH = 88/d against its own h). It shows if any
        ldx ocl2                ;   column of its box has a wall no nearer than itself.
owBL:   lda colH,x
        cmp ohgt
        beq owBV
        bcc owBV
        cpx ocmax
        bcs owBH
        inx
        bne owBL                ; always
owBV:   jmp opDone
owBH:   jmp ohHide
owNB:
        ldy oidx                ; OCCFACE: the cell occBy tests the runs' faces against -- for the
        lda orbXCT,y            ;   angel's probe, the cell it is THINKING of, which anTry has just
        sta ooCX                ;   written here
        lda orbYCT,y
        sta ooCY
        ; Walk the SPANS the subdivision left behind, not the columns. bndT holds the columns
        ; where a new face begins, sorted, so the spans are [0,bndT[0]-1], [bndT[0],bndT[1]-1],
        ; ... [bndT[n-1],159] -- about fourteen of them. Each span is a contiguous piece of ONE
        ; wall run, and its LEFT column is a cast column, which is the only place faceIdT is
        ; valid: it is written once per ray, and adaptive subdivision casts ~14-26 of 160. Reading
        ; it per column looks right and silently returns last frame's values for the rest.
        ;
        ; So this needs nothing added to the interpolator or to the wall drawing. It reads what
        ; the subdivision already produced, and it stops at the first span that does not occlude.
        lda #$00
        sta ohL                 ; the first span starts at column 0
        sta ohBX
ohSpan: ldx ohBX                ; this span's right edge
        cpx nbnd
        bcc ohSB
        lda #$9f    ; the last span runs to the right edge of the screen
        jmp ohSR
ohSB:   lda bndT,x
        sec
        sbc #$01
ohSR:   sta ovSpR               ; the probe needs this span's right edge for the overlap width
        cmp ocl2
        bcc ohAdv               ; span ends before the orb begins: irrelevant, skip it
        lda ohL
        cmp ocmax
        beq ohChk
        bcs ohHide              ; span begins past the orb: every overlapping span occluded it
ohChk:
        ldx ohL
        ldy faceIdT,x           ; the run this span shows
        beq opVis               ; no run here at all, so the orb shows through
        sty ohRun
        jsr occBy               ; C = this run's face is in front of the entity
        lda #$00
        rol                     ; ...as A, for the flags the code below was written against
        beq opVis               ; this run does not occlude this orb -> the orb is visible
        lda ovProbe             ; occluding. Only on THIS path: the "span ends before the orb"
        beq ohAdv               ;   skip below reaches ohAdv having covered nothing.
        jsr ovWide
        clc
        adc ovOcc
        sta ovOcc
        jmp ohAdv
opVis:  lda ovProbe             ; PROBING: one visible span is not the answer, because the
        beq opDone              ;   question is HOW MUCH of it shows. Keep walking and count.
        jsr ovWide
        clc
        adc ovVis
        sta ovVis
ohAdv:  ldx ohBX
        cpx nbnd
        bcs ohHide              ; that was the last span, and it occluded
        lda bndT,x
        sta ohL                 ; the next span starts at this boundary
        inc ohBX
        jmp ohSpan
ohHide:
        lda ovProbe
        beq ohHid0
        rts                     ; probe done: the counters are the answer, and nothing has been
ohHid0: jmp orbNo               ;   allocated, because allocation lives past opDone

; ovWide: how many of the ENTITY's columns this span covers.
;   min(spanRight, ocmax) - max(spanLeft, ocl2) + 1
ovWide: lda ohL
        cmp ocl2
        bcs ovW1
        lda ocl2
ovW1:   sta ovTmp
        lda ovSpR
        cmp ocmax
        bcc ovW2
        lda ocmax
ovW2:   sec
        sbc ovTmp
        clc
        adc #$01
        rts
opDone:
        ; --- take a sprite slot ---
        ldx onv
        lda orbBitT,x
        sta omBit
        ora omEn
        sta omEn
        lda oidx                ; BOLTHIRES: the ball lightning is a HI-RES sprite -- its slot's
        cmp bltIxT              ;   multicolour bit comes out of omMc ($ff again every frame)
        bne obMcN
        lda omBit
        eor #$ff
        and omMc
        sta omMc
obMcN:
        ldy ovar
        lda orbPtrT,y
        cpy #$24               ; Y = ovar: a SENTRY's sprite? svReg notes it for the 60Hz
        bcc oSvR1               ;   svTick and hands back the frame that is up right now
        cpy #$2d
        bcs oSvR1
        jsr svReg
oSvR1:
        ldy oidx                ; the ENTITY, not the variant
        clc                     ; 0 for an orb; the idol's bitmap base for the idol. The two
        adc orbArtT,y           ;   ladders are geometrically identical, so the idol borrows the
                                ;   orb's rung wholesale and swaps only the picture.
        sta obP,x               ; buffered, not written: see osFlush
        lda oidx                ; the BALL LIGHTNING has TWO frames a rung (the second turned 90
        cmp bltIxT              ;   degrees), swapped every rendered frame (the user, 2026-11-10: "just
        bne obFrN               ;   two per rung, swapped every frame ... to make it look more lively")
        lda iterLo
        and #$01
        clc
        adc obP,x
        sta obP,x
obFrN:
        lda orbArtT,y           ; non-zero only for the idol, and we reach here only when
        beq obNotI              ;   this entity actually TOOK a slot -- so this means "the idol
        sta idolWk              ;   is on screen", not "the level has one"
obNotI:
        lda orbColT2,y
        sta obC,x               ; the ONE thing that can differ per orb: bit pair 10
        ldy ovar
        lda orbExpT,y
        beq oNoX
        lsr                     ; SILVER: bit 0 doubles the WIDTH, bit 1 the HEIGHT -- apart, for
        bcc oNoXy              ;   the two-wide rungs that double only the height (SVQUAD=v)
        lda omBit               ; (X is the SLOT here -- the flags are re-read, not parked in it)
        ora omXX
        sta omXX
        lda orbExpT,y
        lsr
oNoXy: lsr
        bcc oNoX
        lda omBit
        ora omYY
        sta omYY
oNoX:   lda o0                  ; already on the multicolor grid -- X is 2*b, so always even.
                                ; It has to be: a multicolor CHAR pixel is two hires pixels
                                ; aligned to the character, a multicolor SPRITE pixel is two
                                ; aligned to the sprite's own X, and at an odd X the two grids
                                ; are half a pixel out of phase. The VIC then decides priority
                                ; per HIRES pixel, so one half of a sprite pixel lands on
                                ; foreground and clips while its partner lands on background and
                                ; draws -- a one-pixel sliver of orb peeking past a wall edge
                                ; that is otherwise clipping it correctly.
        sta obX,x
        lda o3
        sta obY,x
        lda o1
        beq oNoM
        lda omBit
        ora omX8
        sta omX8
oNoM:   ; the slot's record, for occStamp: which entity, its variant, its cells and columns
        ldx onv
        lda oidx
        sta obIX,x
        lda ovar
        sta obV,x
        lda ocl
        sta obCL,x
        lda ocr
        sta obCR,x
        lda ocl2
        sta obL,x               ; the tight column range, for the stamp pass
        lda ocmax
        sta obR,x
        inc onv
        ; ---- a TALL entity takes a second slot for its upper half ----
        ; Same X, same colour, same expand; the other bitmap; and one sprite height above -- 21
        ; rows, or 42 once vmag has doubled it, which is exactly what orbAnchT already holds.
        ldy ovar
        lda orbPtrU,y
        beq orbRt              ; one-sprite entity: nothing more to do
        sta otmp
        ldx onv
        cpx onvH
        bcs orbRt              ; no slot left: show the lower half rather than nothing
        sec
        lda o3
        sbc orbAnchT,y
        bcc orbRt              ; upper half is off the top of the screen
        sta obY,x
        lda otmp
        cpy #$24               ; (Y = ovar still) the sentry's upper half, likewise
        bcc oSvR2
        cpy #$2d
        bcs oSvR2
        jsr svReg
oSvR2:
        sta obP,x
        lda orbBitT,x
        sta omBit
        ora omEn
        sta omEn
        ldy oidx
        lda orbColT2,y
        sta obC,x
        ldy ovar
        lda orbExpT,y
        beq oNoX2
        lsr                     ; SILVER: bit 0 doubles the WIDTH, bit 1 the HEIGHT -- apart, for
        bcc oNoX2y              ;   the two-wide rungs that double only the height (SVQUAD=v)
        lda omBit               ; (X is the SLOT here -- the flags are re-read, not parked in it)
        ora omXX
        sta omXX
        lda orbExpT,y
        lsr
oNoX2y: lsr
        bcc oNoX2
        lda omBit
        ora omYY
        sta omYY
oNoX2:  lda o0
        sta obX,x
        lda o1
        beq oNoM2
        lda omBit
        ora omX8
        sta omX8
oNoM2:  lda #$fe                ; ---- the upper half must NOT stamp ----
        sta obIX,x              ; The old note here said the two halves span the same columns, so
                                ; the upper slot could just copy the lower's record and let the
                                ; stamp pass clip by column. But the stamp clips by ROW too, from
                                ; obY + orbBlankT[obV] -- and this slot carries the LOWER's obV
                                ; with an obY one anchor higher. orbBlankT is NEGATIVE for a
                                ; two-sprite variant precisely because the lower slot's span
                                ; already covers the whole entity, so the upper one laid down a
                                ; second rectangle 21 rows above it: a bar of occluder standing
                                ; two to three cells clear over the angel's head, occluding
                                ; correctly but far too much.
                                ; $fe rather than the icon/hole's $ff, because this slot is not
                                ; simply "nothing": STAMPING is per ENTITY but PRIORITY is per
                                ; SPRITE. Marking it $ff skipped it outright and its $d01b bit
                                ; stopped being set, so the angel's top half drew IN FRONT of the
                                ; occluders it was supposed to be behind. occStamp gives $fe its
                                ; own arm -- inherit the bit, stamp nothing. Both values are
                                ; >= ORBS.length, so the ordinary reject still catches them.
        inc onv
orbRt:  ; ---- SILVER, BIG ANGEL: a 2-wide rung's RIGHT column, one sprite (24 hires pixels) over ----
        ; Built like the upper half: same colour and priority, the lower slot's record, $fe so it
        ; does not stamp -- the lower slot's box already spans both columns (orbPartsOf).
        ldy ovar
        cpy #$24               ; only a SENTRY's rung can have one: the tables start at SV_V0
        bcc orbYes
        cpy #$2d
        bcc orbSvR
        jmp lxBgPt              ; the BIG angel's other sprites (level code: bgPart)
orbSvR:
        lda orbPtrR,y
        beq orbYes              ; a one-column rung
        sta otmp
        lda orbExpT,y           ; one sprite over: 24 hires pixels, 48 when its WIDTH is doubled
        and #$01
        beq orbR1
        lda #48
        bne orbR2               ; always
orbR1:  lda #24
orbR2:  clc
        adc o0
        sta svRX
        lda o1
        adc #$00
        and #$01                ; X is 9 bits and WRAPS: a left column parked off the left edge
        sta svRX8               ;   at 2b mod 512 ($1F6) plus 24 is 14, not 270 -- the carry on
                                ;   top of an X8 of 1 made 2, which read as "X8 set" and threw
                                ;   the right column to the far right (the user, 2026-10-13)
        ldx onv
        cpx onvH
        bcs orbYes              ; no slot left: the left column alone
        lda o3
        sta obY,x
        lda otmp
        jsr svQuad
        ldy ovar
        lda orbPtrRU,y
        beq orbYes
        sta otmp
        ldx onv
        cpx onvH
        bcs orbYes
        sec
        lda o3
        sbc orbAnchT,y
        bcc orbYes              ; off the top of the screen
        sta obY,x
        lda otmp
        jsr svQuad
orbYes: ldx oidx                ; it got a sprite slot, so a pixel of it is on screen. The
        lda #$01                ;   renderer already culls anything off screen or wholly
        sta orbSeenT,x          ;   occluded, so this IS the "unobserved" test, for free
        rts
orbNo:  ldx oidx
        lda #$00
        sta orbSeenT,x
        rts

; holeOne: the live hole's LOS gate and projection, run BEFORE the orb candidates so it can
; never lose its sprite slots to them. A projection is ~2,400 cycles and this test is ~25,
; which is the ratio the whole candidate-list scheme exists for -- without it the hole paid
; full price every frame, including from cells it cannot be seen from at all, most of them.
; Loops every hole-like entity: the LIVE exit hole, then every socket. Each has its own 32-byte
; LOS bitmap, its own fill ink and (for sockets) its own ladder -- hlSet points holeTail at the
; right one. The exits come first in HOLELIKE and only the live one is drawn, so the loop skips
; the other; sockets are always live.
holeOne:lda nHoleT              ; a level with no hole-likes at all: nothing to walk
        beq hoRts
        lda #$00                ; the exits first, so they can never lose a slot to a
        sta hoI                 ;   socket -- the slots are allocated downward and it is the
hoLp:   lda hoI                 ; ZONES: entGate's VERDICT for this hole-like -- its zone test AND the
        clc                     ;   cone, already in cnOkT. Checked here, BEFORE hlSet re-patches the
        adc nOrbT               ;   drawing routine and orbOne is called only to read the same byte
        tax                     ;   and bail: that cost ~650 cycles per culled hole-like, every frame
        lda cnOkT,x             ;   (the hub profile, 2026-10-05: 7 hole-likes walked, 4 drawn)
        beq hoNx
        ldy hoI                 ; ...and a CONSUMED socket is not in the world at all any more.
        lda hlSeat,y            ; Exit holes keep 0 here for ever, so this costs them one compare.
        bmi hoNx
        lda hoI
        jsr hlSet               ; ink and ladder for THIS one
        lda hoI
        clc
        adc nOrbT               ; hole-like entities follow the orbs in orbXCT/orbYCT
        sta oidx
        jsr orbOne              ; orbOne branches to holeTail on the index
        ; ---- EVERY exit draws, not just hlv's ----
        ; This used to jump hoI past the other exits, because a level had two holes that took
        ; turns and only one of them was real. The hub has FOUR and all four are ways out, so
        ; three of them were invisible floor. (The user, 2026-09-24: "would love the holes to be
        ; on the floor as well -- currently only one shows".) Which LEVEL each leads to is still
        ; one byte for the whole level; that is the next thing this wants, not this.
hoNx:   inc hoI
        lda hoI
        cmp nHoleT
        bcc hoLp
hoRts:  rts


; ================= the drop =================
; Both phases scroll the SAME way: a static source blitted at a signed row offset, black
; wherever the source does not reach. The drop scrolls the frozen last frame up and off
; (offset 0 -> +25); the landing scrolls the new view up INTO place from below (-25 -> 0).
; One routine draws both, which is why the acceleration and the deceleration cost the same.
;
; Sub-row motion is $d011's fine scroll, and it is not optional: a quadratic fall's first
; frame moves 0.44 pixels, so whole-row steps would stall for four frames and then jump.
; $d011 is written once at init and by nothing per-frame, so the low three bits are ours.
;
; Colour RAM is uniform $08 and written once at startup, so unlike a normal char-mode scroll
; this moves the screen matrix ONLY -- half the work a scrolling game would do here.

; fallChk: standing in the hole's cell? Then go.
fallChk:lda nExitT              ; no exit on this level: nothing to fall through
        beq fcNo

        ; ---- ANY exit, not just hlv's ----
        ; The entity index of exit n is nOrbT + n -- the SWAPPED count, not this build's
        ; ORBS.length. Level 1 has four orbs and angels before its hole; the socket room has one.
        ; With the immediate baked in, the socket room's hole was compared at index 4 -- past its
        ; three entities -- and could never be fallen through.
        ; hlv still records WHICH exit was used, because the drop animation reads its cell; what
        ; it no longer does is decide which one is real. Its old eor #$01 only ever toggled 0
        ; and 1, so on the hub's four exits two of them could not be fallen through at all.
        ldx nOrbT               ; entity index of exit 0
        ldy #$00
fcLp:   lda lvlNxtT,y           ; an exit with nowhere to go is NOT an exit: walk straight over
        cmp #$ff                ;   it. Without this the drop ran anyway and lvlEnd put you back
        beq fcNx                ;   at the same level's start -- a hole that falls you on the
        lda px+1                ;   spot, which is worse than one that does nothing. Every
        cmp orbXCT,x            ;   shipping exit is wired (levelExitDst), so this guards a
        bne fcNx                ;   new level's unwired exit, not the game's.
        lda py+1
        cmp orbYCT,x
        beq fcHit
fcNx:   inx
        iny
        cpy nExitT
        bcc fcLp
        bcs fcNo                ; always taken: none of them is under us
fcHit:  sty hlv                 ; the one we are dropping through
        jsr idolStay            ; an idol only ever leaves its OWN room (see idolStay)
        lda musOn               ; MUSIC: the fade -- every voice into its release
        beq fcNoM
        lda #$fe
        jsr musRel
fcNoM:
        ; ---- sprites away: they belong to the level being left ----
        ; The BUFFER, not $d015 -- osFlush runs after the buffer flip, which is past where the
        ; fall path rejoins the loop, so it would put the register straight back and leave an
        ; orb hanging in space while the world scrolled away behind it.
        ; ...EXCEPT what is in your hands, IF it is coming with you. The carried icon is slot 0
        ; and nothing else is, so ONE BIT of each buffer keeps it and drops the rest. Only the IDOL
        ; travels (idolHand survives the fall); a carried ORB belongs to the level being left, and
        ; objInit drops it on landing -- so it goes now, with the rest, not after the landing (the
        ; user, 2026-10-15). orbArtT tells them apart: 0 for an orb, an art set for the idol.
        ; omEn/omXX/omYY/omPri/omX8 are five CONSECUTIVE bytes, which is what lets one masked
        ; loop do all five. Enable alone was not enough: omXX and omYY are $d01d and $d017, the
        ; two expands, and zeroing them left the held idol un-magnified for the whole drop and
        ; snapping back to size on landing.
        ldx #$04
        ldy carry
        beq fdZap
        lda orbArtT-1,y         ; carry is the entity index PLUS ONE
        beq fdZap               ; an orb in hand: it stays behind, so it goes now
fdKeep: lda omEn,x              ; something in hand: keep its slot-0 bit in all five
        and #$01
        sta omEn,x
        dex
        bpl fdKeep
        bmi fdSpr               ; always
fdZap:  lda #$00
fdZLp:  sta omEn,x
        dex
        bpl fdZLp
fdSpr:
        ldx hlv                 ; the destination's NUMBER is all the hole needs. The level
        lda lvlNxtT,x           ;   change, the loads and the render all wait for fallMid; the colour
        cmp #$fe                ;   seen THROUGH the hole is an engine palette entry, so it can be
        bcs fmHole              ;   the arriving level's already, as it always was. $fe is THE END
                                ;   and $ff no exit: neither is a level, so neither has a palette
        tax
        dex
        lda lvlPalceilT,x
        sta irqB2+1
fmHole:
        ldx #$ff                ; the drop starts on THIS frame -- mfIn falls into fallStep and
        stx fFrm                ;   draws frame 0, so stepping in and falling are the same frame
        ldx #25
        stx phA
        stx phB
        jsr arcBld              ; the departing arc's dictionary, while charset B is still the
                                ;   level being LEFT -- lvlLook does not run until the handover
        lda #$01
        sta fallSt
        jsr fallInv             ; THE RENDER COMING IN A FEW FRAMES DRAWS INTO A BUFFER A PREVIOUS
                                ; FALL SCRIBBLED. Without this renderSym skips every column whose
                                ; cached runs still look unchanged and leaves the LAST fall's
                                ; destination sitting there -- the second drop showed the first
                                ; one's room sliding up, and only corrected at fstEnd, which is
                                ; the next place the cache is cleared. Bug 1 in [[iray-fall]],
                                ; for the third time: anything that writes the screen behind
                                ; renderSym has to invalidate before renderSym runs again.
        lda #$00                ; NO SNAPSHOT of the room being left: the drop slides it straight
        sta fwKd                ;   off the screen (see fwSlo). The frame on display now IS the
                                ;   frozen room, every source row at its own row: offset 0.
        jsr fallTail            ; ...and the five rows below the screen it cannot see

fcNo:   lda px+1                ; not in a hole: this is the last floor cell, if the next one is
        sta plLX                ;   (idolStay leaves an idol here rather than take it out of the hub)
        lda py+1
        sta plLY
        rts

; ---- fallMid: EVERY piece of level work, in one black moment between the two arcs ----
; Called at the handover, when the top arc has left the screen and the bottom one has not appeared:
; the display is pure hole, so blanking it is invisible. Then the level change, and the
; destination rendered in FULL: one cast, one renderSym over all 40 columns, one copy. (It was the
; sliced render's step -- an engine bgStep, not level 10's -- driven to completion; the sliced
; render went 2026-11-14.) DEN stays off until the landing's first flip publishes
; pd11. With FMLOG=1, fmTk = the ticks it all took, so the pause can be measured rather than guessed.
fallMid:lda $d011
        and #$6f                ; DEN off -- AND bit 7: a READ of $d011 returns the raster's ninth bit,
        sta $d011               ;   a WRITE sets the IRQ line's. Read below line 255 and written back, it
                                ;   moved the raster IRQ to line 256+n, which never comes: palRas stopped
                                ;   and fwait hung in the black (PAL, 2026-11-15: 56 lines a frame there,
                                ;   7 on NTSC, so PAL found it). Same fix in the load wrapper below.
        jsr musOff              ; MUSIC: before the load writes over the song
        ldx hlv                 ; the exit taken -- still the departing level's numbering here
        lda lvlNxtT,x
        cmp #$ff
        beq fmSame
        pha                     ; wallsBack does not preserve A
        jsr wallsBack           ; leave with every wall in place, exactly as at the hole before
        pla
        jsr lvlLoad             ; the arriving level (and its load list); lvlLoad keeps DEN off
        jsr mkRuns
        jsr objInit
fmSame: jsr lvlStart            ; the arriving level's start: what the render below looks from
        jsr musGo               ; MUSIC: the arriving level's song, through the landing
        lda #$00
        sta hlv
        jsr fallInv
        jsr rayAll              ; the whole destination cast in one go -- nothing caps it here
        jsr fallInv             ; renderSym must not trust a cache the fall has been scribbling
        jsr renderSym           ; every column into the back buffer...
        jsr bgCopy              ; ...and out to fallSnapD, ready for the landing
        rts


; fallStep: advance the physics and draw one frame. Called instead of the whole renderer.
fallStep:
        ldx fFrm                ; BOTH phases run the same arc table now, so both advance the same
        inx                     ;   counter. Up here because everything below is a branch target
        ldy fallSt              ;   -- putting it lower hid it behind a branch once already.
        cpy #$03                ; the DROP hands over ARC_OVERLAP frames early; its last frames
        beq fstLim3             ;   are drawn on top of the landing's first ones
        cpx #20
        jmp fstLimD
fstLim3:cpx #20
fstLimD:bcc fstFOk
        dex                     ; ---- this phase has run its course ----
        stx fFrm
        lda fallSt
        cmp #$03
        beq fstEnd
        lda #$03                ; drop over -- straight into the landing. The destination room
        sta fallSt              ;   is loaded, rendered and snapshotted right here, by fallMid, so there
        jsr fallMid             ; the level work, all of it, while the screen is black
        jsr lvlLook             ; the arriving level's inks and wall mark
        jsr lvlChr              ; the charset too, and the WHOLE rebuild -- still blanked
        jsr fdGlFl

                                ; ^ the arriving level's LOOK lands here, after the drop: the
                                ;   drop shows the room being LEFT, so repainting its ceiling
                                ;   and stamping its walls any earlier (when the level was
                                ;   swapped in as you stepped into the hole)
                                ;   recoloured the wrong room for the whole descent.
        ldx #25                 ;   is nothing to stall for here. Neither buffer holds any of the
        stx phA                 ;   landing's colour yet.
        stx phB
        jsr fallInv             ; the fall scribbled both buffers behind renderSym's run cache
        ldx #$00                ; and THIS frame is landing frame 0, drawn without a gap
fstFOk: stx fFrm
        lda fallSt              ; ---- which way round is the arc drawn? ----
        cmp #$03
        beq fsLand
        ldx fFrm                ; DROP: the horizon TRAVELS now, because the room slides up with
        lda arcSpT,x            ;   the arc. Below it the frozen scene is MIRRORED and needs
        sta pSplit              ;   charset B; arcPrep sets the second split, at the top of the
        lda #$00                ;   arc, where A has to come back for the rim glyph.
        sta arcInv
        lda #$00        ; DROP: A above the horizon, B below it, and the ARC'S OWN block
        sta pCh0                ;   for the rim -- which is what keeps the rim's dither out of the
        lda #$0e      ;   ceiling, since region 1 up there is still reading A
        sta pCh2

        lda #$02
        sta pCh1
        lda #$00
        sta arcSkip             ; the drop lets arcPrep place the arc's split
        beq fsDone              ; always taken
fsLand: ldx fFrm                ; LANDING: B,A,B -- the rim is at the TOP now, in the mirrored
        lda #$02        ;   polarity, then the new room's ceiling half, then its floor
        sta pCh2                ;   half. The room is held clear of the arc (see ARC_GAP) so no
        lda #$06     ;   scanline ever has to serve both. Region 1 is the RIM, and it
        sta pCh0                ;   reads its own block: its surround is the ceiling, undithered,
                                ;   while region 3 below is the floor, dithered -- one charset
                                ;   could not be both, which is what this set is for.

        lda #$00
        sta pCh1
        lda arcSp2T,x           ; white rising to replace the black, over the NEW room sliding up
        sta pSplit              ;   into place. The rim is SOLID above and
        lda #$ff                ;   BLANK below, which is the mirror of what the dictionary
        sta arcInv              ;   holds, so park the split ABOVE the display instead and let
                                ;   charset B supply the other polarity. Every column flips on
                                ;   the same frame, so one raster line does the whole job.
fsL2:   jsr lvlHi               ; past the overlap window: the DEPARTING rim has left the
                                ;   screen, so the top of the frame can finally take the new
                                ;   level's ground colour too. Until here it must not -- that is
                                ;   what made the upper level go dark while it was still visible.
                lda arcSp2bT,x          ; and the room's own horizon, where B resumes
        sta pSplit2
fsL3:   jsr fdGlTk              ; a slice of the charset rebuild, if one is pending
        lda #$ff
        sta arcSkip             ; arcPrep must not overwrite pSplit2 on the landing
fsDone: lda #$13
        sta pd11
        jmp fallDraw
fstEnd: jsr fdGlFl              ; whatever is left of the rebuild, before the renderer
        lda #$96
        sta pSplit              ; horizon back where the renderer expects it -- pending, so it
                                ;   lands with the settled frame drawn just below
        lda #246                ; a settled frame wants A above the horizon and B below it
        sta pSplit2
        lda #$00        ; AND THE CHARSET PLAN BACK. Restoring the split lines but not
        sta pCh0                ;   these left the renderer running the landing's B,A,B -- both
        sta pCh2                ;   halves of every frame mirrored until the next fall.
        lda #$02
        sta pCh1
        jsr fdWarp              ; and it wants the ROOM, in place. The last landing block is the
                                ;   identity, so this is a straight copy -- filling white here
                                ;   instead was a one-frame flash between the arc finishing and
                                ;   the renderer taking over.
        lda #$00                ; landing over: hand the screen back to the renderer
        sta fallSt
        lda #$13                ; back to the resting mode, which is also 24 rows
        sta pd11
        ; fall through into fallInv

; fallInv: forget both buffers' run caches. renderSym skips a column whose cached ceiling run
; and solid-run start still match, and the fall wrote the screen straight past it -- so without
; this the scrolled image STAYS in every column the renderer thinks it already got right. Same
; hazard occStamp has to clear after itself, and it reads as an inverted, sheared frame.
; THE TWO HALVES NEED OPPOSITE SENTINELS -- the same pair the power-on clear uses, and for the
; same reason. The tests are ordered compares, not equality: the ceiling test skips when rb has
; SHRUNK, so cwA/cwB must go to 0 or every column looks like a shrink and skips its own repaint,
; leaving the old screen showing through; the solid test skips when rs has GROWN, so cbA/cbB
; must go to $ff, which exceeds any rs. Filling all 160 with $ff instead produced a sheared,
; inverted frame at 7 fps -- and the frame rate is the tell, because a stale cache costs
; nothing while a bogus run LENGTH makes renderSym walk far past the column.
fallInv:ldx #$00
        lda #$00
fivC:   sta cwA,x               ; offsets 0-79: the ceiling pair
        inx
        cpx #80
        bcc fivC
        lda #$ff
fivS:   sta cwA,x               ; offsets 80-159: the solid pair
        inx
        cpx #160
        bcc fivS
        rts

; fallDraw: one path for both phases. arcInv swaps which side of the rim is floor and which is
; hole; the arc itself -- crown, depth, profile -- is identical, so the world closing over you and
; the room opening under you are the same sixteen frames run twice.
fallDraw:
        lda fFrm                ; which arc frame to draw. The overlap re-points this at a DROP
        sta arcIx               ;   frame further on, so it has to be reset every frame -- losing
                                ;   this line left arcPrep reading whatever the tail draw set
                                ;   last, and the arc appeared late and in the wrong place.
        jsr arcPrep             ; the crown, the depth, and where the arc bottoms out
        jsr fdWarp              ; the room, slid up. No shear -- see fRowT.

        ldx #$fa       ; drop: floor above, hole below. The floor is charset B's code
        ldy #$f6              ;   until the band crosses the arc's top -- see arcTopR
        lda arcInv
        beq fdPol
        ldx #$f6      ; landing: the other way round -- the shaft above the rim,
        ldy #$f7       ;   and the new room's CEILING below it, which is never dithered
fdPol:  stx fdCol
        sty arcBlw              ; arcBand fills below its glyph with this
        ldy #$07                ; the hole's black is a SCRATCH code (see VOIDCH): lay its glyph
vdLp:   lda #$ff                ;   down here rather than own a charset code for it. All pair 11,
        sta $c7c0,y     ;   which reads colour RAM, which is $08 -- black
        sta $cfc0,y   ;   everywhere -- and never marked by symPut.
        dey
        bpl vdLp
        ldy #$07                ; ...and the fall's GROUND, carrying this level's floor checker
                                ;   (see FDGND). Copied from BLANK, which floorDk wrote on arrival:
fgLp:   lda $c800,y  ;  so a DROP gets the level being left and a
        sta $cfc8,y  ;  LANDING the one arrived at, with nothing kept.
        sta $c7c8,y    ;  NOT ROW-REVERSED, though every other A-from-B copy
        dey                     ;   in this program is. The mirror is right for GEOMETRY and wrong
        bpl fgLp                ;   for a TEXTURE: the checker alternates every row, so 7-r always
                                ;   has the opposite parity to r, and A's copy came out one
                                ;   multicolour pixel off B's -- a permanent horizontal seam
                                ;   wherever the two met. And they meet by construction: one fdFill
                                ;   band spans the arc's top split, so the SAME code is drawn
                                ;   through B above it and through A below. arcDth takes its mask
                                ;   from here too, so the rim inherited the same offset.
        lda fwN                 ; ---- nothing below the room at all? then draw nothing ----
        cmp #25                 ; arcPrep CLAMPS the arc's row to 24 while it is still off the
        bcs fdTail              ;   bottom of the screen, so arcBand lays a cell there even on
                                ;   frame 0 -- over the wall's last row, in the only four pixels
                                ;   of row 24 that 24-row mode shows. It was invisible until the
                                ;   room started reaching row 24: before that those rows were
                                ;   fill anyway. "Four pixels cleared before anything moves."
        ldx fwN                 ; the warped scene already fills rows 0..fwN-1, so the band
        lda arcHi               ;   starts where its content stopped. Filling from row 0 here
        sec                     ;   erased the copy that had just been made -- paying for the
        sbc fwN                 ;   scene twice and then throwing it away.
        bcc fdNoF
        pha
        lda mul40LoT,x
        sta fdD
        clc
        lda mul40HiT,x
        adc baseHi
        sta fdD+1
        pla
        jsr fdSpl               ; a DROP's band crosses the arc's top: two fills, not one
        jsr fdFill              ; everything between the scene and the arc, whole rows
fdNoF:
        lda arcHi               ; bounded: arcHi is off the foot while the arc still is, and
        cmp #25                 ;   mul40T now HAS rows 25..30 for the tail -- so an unbounded
        bcc fdnOk               ;   index builds a real-looking address past the screen instead
        lda #24                 ;   of reading off the end of a 26-entry table as it used to.
fdnOk:  tax
               ; point fdD at the band explicitly rather than relying on the
        lda mul40LoT,x          ;   fills to have walked there
        sta fdD
        clc
        lda mul40HiT,x
        adc baseHi
        sta fdD+1
        jsr arcBand             ; the curve itself, at pixel resolution via the ramps
        jsr fdBlw               ; ---- and the rows below the arc ----
        lda arcInv
        beq fdIncr
        ; LANDING: from the arc's bottom down to the room's first row, every frame. See fRowT's
        ; block byte 26 for why this is not incremental.
        lda fwBlk+26            ; the room's first row this frame, written by fwGenB
        sec
        sbc arcHi
        bcc fdTail              ; the room has reached the arc: nothing between them
        beq fdTail
        jsr fdFill
        jmp fdTail
fdIncr:
        ; DROP: only the rows that just CHANGED. The arc only ever rises, so everything below
        ; where it was last time this buffer was drawn is already hole. Fill from the new edge to
        ; the old one and no further: four rows on a typical frame instead of up to twenty-five.
        ; Per buffer, because each is two animation frames behind the other.
        ldx #<phA
        lda baseHi
        cmp #$e0
        beq fdPhA
        ldx #<phB
fdPhA:  stx fdPh+1              ; both operands patched: one reads it, one writes it back
        stx fdPhW+1
fdPh:   lda phA
        sec
        sbc arcHi
        bcs fdPh2
        lda #$00                ; the arc went backwards: nothing new to cover
fdPh2:  pha
        lda arcHi
fdPhW:  sta phA                 ; remember where it is now, for this buffer
        pla
        jsr fdFill
fdTail:
fdTDn:  rts

; ---- fdWarp: the drop's copy, one source row per DESTINATION row ----
; This is the camera height. Instead of translating the frozen frame by a fixed offset, every
; destination row pulls from wherever that piece of the world has moved to -- so wall bases rise
; toward the horizon while the ceiling opens away from it, and both stop dead at row 100.
; The per-row cost over a flat translation is the lookup and the two pointer builds, ~30 cycles,
; against the 550 the 40-byte copy already costs. There is no fine scroll to pair with it: with
; every row moving at its own rate there is no uniform translation left for one to carry.
fdWarp: lda arcInv               ; the landing's blocks follow the drop's in the same table
        beq fdwD
        lda fFrm
        clc
        adc #20
        jmp fdwI
fdwD:   lda fFrm
fdwI:   sta apT
        jsr fwGenB              ; build this frame's row map into fwBlk. Was twenty instructions
                                ;   of pointer arithmetic to pick one of forty stored blocks --
                                ;   all of which held the same thing a slide and two bounds say.
        ldy #25
        lda fwBlk,y             ; offset 25 is where content stops
        sta fwN
        lda #$00
        sta fwRow
fwLp:   lda fwRow
        cmp #25
        bcs fwDn
        tay
        lda fwBlk,y              ; the row map is a fixed buffer now, not one of forty blocks
        cmp #255
        beq fwSkip              ; no source for this row -- the landing's room has not reached it
        tax
        lda arcInv              ; the landing slides the DESTINATION room, snapshotted before
        beq fwSrcA              ;   the drop began; the drop slides the one being left
        lda mulSnapLoT,x        ; the row's ADDRESS (SNAP_AT: its slot lives in a host buffer)
        sta fdS
        lda mulSnapHiT,x
        sta fdS+1
        jmp fwSrcD
fwSrcA: cpx #25
        bcc fwSlo               ; rows 25..29 are the tail, in their own buffer
        txa
        sec
        sbc #25
        tax
        lda mul40LoT,x
        clc
        adc #<fallTailB
        sta fdS
        lda mul40HiT,x
        adc #>fallTailB
        sta fdS+1
        jmp fwSrcD
fwSlo: txa                     ; ---- THE DROP READS THE SCREEN, NOT A SNAPSHOT (2026-10-11) ----
        sec                     ; The frame on display is the previous drop frame (the fall flips
        sbc fwKd                ;   every frame), which holds source row s at row s - fwKd. Its
        tax                     ;   content runs 0..nsrc-1, and the build proves every row this
        lda mul40LoT,x          ;   frame asks for is inside that (see DROPREAD). Saves the 520-byte
        sta fdS                 ;   fallSnapS and the copy into it. The bottom half needs no mirror:
        lda baseHi              ;   renderSym already drew it as the top half's codes through the
        eor #$04               ;   flipped charset. The displayed buffer is the other one.
        clc
        adc mul40HiT,x
        sta fdS+1
fwSrcD:
        ldx fwRow
        lda mul40LoT,x
        sta fdD
        lda mul40HiT,x
        clc
        adc baseHi
        sta fdD+1
        ldy #39
fwB:    lda (fdS),y
        sta (fdD),y
        dey
        lda (fdS),y
        sta (fdD),y
        dey
        lda (fdS),y
        sta (fdD),y
        dey
        lda (fdS),y
        sta (fdD),y
        dey
        bpl fwB
fwSkip: inc fwRow
        jmp fwLp
fwDn:   lda arcInv
        bne fwDnL
        lda fwK                 ; the drop: this frame goes on display next, at this offset
        sta fwKd
fwDnL:  rts

; ---- faceCell: the cell directly in front, to the nearest of eight ----
; pa is a full byte of turn, so +16 then >>5 rounds to the nearest octant instead of truncating
; toward the one you have just left. Eight rather than four because "the square most in front of
; you" means exactly that when you are facing a corner, and because the angels move in eight.
; (dpCand -- the neighbouring cell one step along direction X -- is out of line, beside pedGate.)

; ---- dropPick: which neighbouring cell the carried orb should go in ----
; NOT the one the facing rounds to. An entity is drawn at its cell's CENTRE, and the centre of
; the cell dead ahead can be a long way off the view axis when the player is standing near a cell
; boundary -- which is why a dropped orb kept landing at the edge of the screen. So ask the
; projection where each candidate would actually appear and keep the most centred one. The
; nearest cell is deliberately still a candidate even though the orb lands pinned at the bottom
; of the screen there. Eight projections, once per keypress, against 30,208 cycles in a frame.
dropPick:
        lda #$ff
        sta odBest
        sta odCell              ; nothing placeable in reach
        ldx #$07
dpLp:   stx odD
        lda dirXT,x
        sta oix
        lda dirYT,x
        sta oiy
        jsr seeDiag             ; ...and only where you can SEE the cell's centre: see seeDiag
        bcs dpNext
        jsr dpCand
        ldx fcCell
        lda blkT,x
        bne dpNext              ; a wall, or something already standing there
        ldx odD
        jsr orbProj
        bcc dpNext              ; would not be on screen at all
        lda ocoff
        cmp odBest
        bcs dpNext
        sta odBest
        lda fcCell
        sta odCell
        lda fcX
        sta odX
        lda fcY
        sta odY
dpNext: ldx odD
        dex
        bpl dpLp
        rts

; ---- takePick: which adjacent orb the player is looking at ----
; Same ranking, over entities rather than directions: the one whose cell projects nearest the
; middle of the screen. Walking over an orb diagonally used to leave it unpickable because the
; rounded facing named a different cell.
takePick:
        lda #$ff
        sta odBest
        sta odCell              ; holds an ENTITY index here, not a cell
        ldx #$00
tkLp:   stx odD
        cpx svNT                ; nor is a sentry (entities 0..svN-1)
        bcc tkNext
        lda orbTallT,x
        bne tkNext              ; an angel is not luggage
        lda orbHidT,x
        bne tkNext
        sec
        lda orbXCT,x
        sbc px+1
        sta oix
        clc                     ; delta + 1 is 0, 1 or 2 exactly when the delta is -1, 0 or 1
        adc #$01
        cmp #$03
        bcs tkNext
        ldx odD
        sec
        lda orbYCT,x
        sbc py+1
        sta oiy
        clc
        adc #$01
        cmp #$03
        bcs tkNext
        lda oix
        ora oiy
        beq tkNext              ; our own cell: nothing to project
        jsr seeDiag             ; the same sight rule as putting down (seeDiag keeps X)
        bcs tkNext
        jsr orbProj
        bcc tkNext
        lda ocoff
        cmp odBest
        bcs tkNext
        sta odBest
        lda odD
        sta odCell
tkNext: ldx odD
        inx
        cpx nOrbT
        bcc tkLp
        rts

; ---- seeDiag: can you see the centre of the neighbouring cell oix/oiy? C set to REJECT ----
; Taking and putting down both ask this (the user, 2026-10-27: "require that you can see the center
; of the square you're putting down/picking up from ... pick up/put down should use the same
; checks"). Before, taking had no corner rule at all -- an orb a diagonal away came up through two
; solid corner cells -- and putting down (the old dpDiag) needed only ONE of the two open, so you
; could still set an orb round a corner you could not see past.
; An orthogonal neighbour shares an edge with your cell: always seen. For a diagonal one the sight
; line from your position to its centre passes through exactly one of the two corner cells, and
; which one is cheap to know EXACTLY. Put the corner the three cells share at the origin, ux and uy
; your distances from it along each axis, the target centre at (+1/2, +1/2): the line crosses the
; x boundary at y = (ux - uy) / (2ux + 1), below the corner exactly when ux < uy. So the nearer
; boundary is the one you see through: ux < uy -> the x-neighbour, uy < ux -> the y-neighbour, and
; on the tie the line grazes the corner and either open side will do. ux is px's fraction (toward
; -x) or its complement (toward +x, off by 1/256 -- the same on both axes, so it cancels). blkT, so
; anything standing in the corner cell blocks the view too, as it blocked the old squeeze test.
; Keeps X (takePick holds the entity index across it); mulW keeps Y.
seeDiag:
        lda oix
        beq sdOk                ; orthogonal: nothing between you
        lda oiy
        beq sdOk
        lda px                  ; ux
        bit oix
        bmi sdUx                ; toward -x: the corner is at your cell's west edge
        eor #$ff
sdUx:   sta tmp
        lda py                  ; uy
        bit oiy
        bmi sdUy
        eor #$ff
sdUy:   cmp tmp
        beq sdTie
        bcc sdY                 ; uy < ux: through the y-neighbour
        jsr sdXc                ; ux < uy: through the x-neighbour
        bne sdNo
sdOk:   clc
        rts
sdY:    jsr sdYc
        bne sdNo
        clc
        rts
sdTie:  jsr sdXc
        beq sdOk
        jsr sdYc
        beq sdOk
sdNo:   sec
        rts
sdXc:   lda py+1                ; (x + dx, y): Z set when open
        jsr mulW
        clc
        adc px+1
        clc
        adc oix
        tay
        lda blkT,y
        rts
sdYc:   lda py+1                ; (x, y + dy)
        clc
        adc oiy
        jsr mulW
        clc
        adc px+1
        tay
        lda blkT,y
        rts

; ---- orbKey: SPACE -- or joystick 1's FIRE -- picks up and puts down, one action a press ----
; FIRESTRAFE: on the RELEASE, and only if the press did not strafe (okStr, set in readKeys). The
; action comes a tap's length later than it used to, which is the price of the button doubling as
; the strafe modifier.
; Row 7 bit 4. The joystick shares these lines, so the port is read with no row selected first and
; whatever the stick holds is forced back high for the key read -- otherwise any stick direction
; on that row would read as a key. FIRE is then taken from that stick read on purpose: it is the
; same bit 4, and the user wants the game playable with the joystick alone.
orbKey:
        lda #$ff
        sta $dc00
        lda $dc01
        eor #$ff
        sta okJoy               ; 1 where a joystick line is active
        lda #$7f
        sta $dc00
        lda $dc01
        ora okJoy
        eor #$ff
        ora okJoy               ; ...and the stick's own bit 4: FIRE
        and #$10
        tax                     ; X = $10 while SPACE or FIRE is down
        lda #$ff
        sta $dc00               ; leave the port neutral for the joystick read in readKeys
        txa
        beq okUp
        sta okOld               ; held: nothing happens until it is let go
        rts
okUp:   lda okOld               ; held last frame?
        ldy #$00
        sty okOld
        ldx okStr               ; ...and strafed while held?
        sty okStr               ; cleared on EVERY release: readKeys and this read the button
        tay                     ;   at different moments, so a press can be seen by one alone
        beq okDone
        txa
        bne okDone
        jmp orbUse
okDone: rts

; ================= WHAT ENTERING A LEVEL ESTABLISHES =================
; There are THREE ways into a level -- boot, a fall, and fire after a death -- and each one
; used to write its own sequence. They drifted, and the way you find out is a bug report about
; colour. So: every piece of per-level state has exactly ONE owner below, and a new one goes to
; whichever owner already holds the thing it depends on. Nothing is set at a call site.
;
;   lvlLoad    THE LEVEL ITSELF. Every table in the manifest -- map, dimensions, entity cells
;              and colours, counts, exits, hazards -- read off the disk over the departing
;              level's, in place (and its level code, art and angel ladder with it).
;   mkRuns     everything derived from the map: the run tables. After the load, before anything
;              renders.
;   objInit    all ENTITY and player state: entity cells, blkT, carry (and therefore idolHd --
;              see the note at its tail), marked, bfsPhase, hlSeat, bfsDone.
;   lvlStart   the PLAYER's pose. One place a level begins, however you got there.
;   lvlLook    every INK: the three screen registers (ceiling, wall, seam) and the two shared
;              sprite registers, plus the idol's own pair -- and the level code's own look
;              (lxLook: symPut, shdIn, ...); lvlChr makes the charset edits (seamEdge, floorDk). The fall calls it in three stages
;              (fdSpr's irqB2 / lvlLook / lvlHi) because two levels are on screen at once during a drop;
;              boot calls it once through lvlBoot. The STAGING differs, the CONTENT must not.
;
; idolCar -- the colour of the thing in your hands -- was briefly an exception to this, latched
; at pick-up and carried. It is NOT: the shared sprite inks are one pair of registers for all
; eight sprites, so an idol's colours have to work against whatever else the room it is now in
; puts on screen. So it is ordinary per-level data, established by lvlLook like the rest, and
; the idol re-tones as you drop through the hole.
;
; ---- objInit: every entity back to its starting cell ----
; A restart is a jmp to entry, and entity state lives in tables the game edits IN PLACE. blkT is
; rebuilt from mapT rather than kept as a second copy -- 256 bytes of table saved, and it can
; never drift out of step with the walls.
objInit:
        lda #$00                ; GATEFAST: a new level (or a restart) -- the cached cell is meaningless
        sta ogPcV
        lda #$ff                ; ...and so is hlSet's cached kind. It was never initialised: whatever
        sta hlKind              ;   boot left at its address decided whether the FIRST hole-like got
                                ;   patched, and the assembled operands are not all one kind's (hlVB
                                ;   defaults to sockVisT, the rest to the exit's) -- so an exit could
                                ;   stamp with the socket's rows. $ff is no kind, so the first call
                                ;   always patches.
        ldx #$00
oiBlk:  lda mapT,x              ; walls first
        cmp #$01                ; mapT is $00 for a wall and a zone mask otherwise;
        lda #$00                ;   blkT still wants 1 = wall, 0 = open
        rol
        eor #$01
        sta blkT,x
        inx
        bne oiBlk
        lda nOrbT               ; a level may have NO entities at all
        beq oiEntD
        ldx nOrbM1T
oiEnt:  lda orbX0T,x            ; then each entity, back at its build-time cell
        sta orbXCT,x
        lda orbY0T,x
        sta orbYCT,x
        lda orbHid0T,x          ; the BUILD's hidden flag, not zero: CARRY=n starts the run
        sta orbHidT,x           ;   holding an entity, and resetting that put it back in the
        bne oiNext              ;   world -- both carried AND blocking its old cell
        sta angAccT,x
        sta angSlDT,x           ; and no lunge in progress: a restart lands nothing
        sta orbSeenT,x
        lda orbY0T,x
        jsr mulW
        clc
        adc orbX0T,x
        tay
        cpx svNT                ; a SENTRY is not in blkT: touching one is a HIT, not a wall,
        bcc oiNext              ;   and it glides through cells (svStep)
        lda #$02
        sta blkT,y              ; 2 = entity, not wall -- angStep and mvFree both rely on it

oiNext: dex
        bpl oiEnt
oiEntD:
        lda #$00
        sta carry
        sta marked
        sta bfsPhase            ; NO FILL IN FLIGHT. Uninitialised this could read as phase 2,
                                ;   which drops bfsTick straight into the expand loop with a
                                ;   garbage bfsTail and scribbles past bfsQ.
        ldx #$09       ; ANGREACT: every angel arrives STANDING, nothing re-phased --
oiRx:   sta angRxT,x            ;   the last level's directions mean nothing here (A is 0)
        lda #$ff
        sta angLDT,x
        lda #$00
        dex
        bpl oiRx
        ldx #$06   ; the MAX: clearing a seat this level does not have is free
hlSCl:  sta hlSeat,x            ; nothing seated: a restart empties every socket
        dex
        bpl hlSCl
        lda #$ff                ; a cell the player can never be in, so the first frame always
        sta bfsDone             ;   starts a fill
        jsr lxInit              ; LEVEL CODE: drIn (the drone's SID set-up) or stInit (every closing wall out) then svReset -- the
                                ;   sentries' PLACE ON THEIR PATHS, and the charge: the loop above put
                                ;   them back on their start cells, and a sentry whose path index
                                ;   still says mid-loop walks through walls from there. Here, not at
                                ;   entry, because the FALL arrives through objInit too (the user hit
                                ;   it: drop through the lab's exit, and every sentry went wrong).
        jsr idolPlace           ; ---- ...then put the IDOLS where they actually are ----
                                ; objInit has just restored every entity from the build data,
                                ; which says each idol is at home. Three of them may not be.
        jmp idolLk              ; ---- carry was just cleared, so RE-DERIVE what depends on it ----
                                ; idolHd is a pure function of carry (see idolLk) and is the one
                                ; piece of entity state that was not being re-derived here. Boot
                                ; called idolLk for itself and the FALL did not, so the two
                                ; arrival paths disagreed: pick the idol up, drop through a hole,
                                ; and you arrived holding nothing with idolHd still saying you
                                ; held the idol. That left the arriving level permanently wearing
                                ; the idol's shared inks, and -- until dckIdl stopped repainting
                                ; the cast -- every sprite in it flooded with the idol's body
                                ; colour. It also suspends the gaze rule and the covering rule,
                                ; so the angels stopped freezing when looked at.
                                ; Here rather than at the fall's call site: objInit is what owns
                                ; carry, so objInit is what owes the invariant. Every caller gets
                                ; it, including the next one nobody has written yet. (A tail
                                ; call: idolLk's rts returns from here.)

; ---- occBy: does wall run Y's face stand IN FRONT of the entity at (ooCX, ooCY)? C set = it does ----
; THE FACING RULE, asked when it is needed (OCCFACE, 2026-10-14). A face can hide an entity only if
; the entity is beyond the face's plane; occStamp and occWalk ask it for exactly the runs drawn in
; the columns a sprite covers, a handful a frame. It used to be answered ahead of time, for EVERY
; run in the level, as a per-entity bit mask (orbOccT) rebuilt whenever the entity changed cell:
; ~3,000 cycles a rebuild, a moving sentry or angel paying it twice a cell, plus a dirty test every
; frame -- to save the ~20 cycles a test costs here. The user, on level 9's final room: "None of
; these sentries can be occluded by any of the walls in this room because they're all on the facing
; side of the wall." The answer is the same bit, from the same cell, so the pictures are the same.
; runPFT: bits 0-4 the plane, bit 6 the axis it is across (1 = y), bit 7 the sense: 1 = the entity
; must be strictly nearer than the plane, 0 = at or past it. Keeps X and Y.
occBy:  lda runPFT,y
        and #$1f
        sta obyP                ; the plane
        lda runPFT,y
        and #$40                ; the axis
        beq obyX
        lda ooCY
        jmp obyA
obyX:   lda ooCX
obyA:   cmp obyP                ; C = cell >= plane
        lda runPFT,y            ; N = the sense (lda leaves C alone)
        bpl obyR                ; sense 0: in front when cell >= plane, which C already says
        bcs obyNo               ; sense 1: in front when cell < plane
        sec
        rts
obyNo:  clc
obyR:   rts
obyP:   !byte 0



; ---- angStep: give every unobserved angel its share of the clock, and move the ones that are due
; The accumulator advances ONLY while the angel is unobserved, so looking at one stops its clock
; rather than just its feet -- look away and it takes a normal-length pause, not an instant step.
; Per angel, not global: two angels in different directions have to keep separate time, which is
; the whole squeeze. dtv is 60ths elapsed, capped at 32 by tickDelta, so the sum cannot carry.
angStep:
        lda dieSt               ; ---- THE SCENE HAS STARTED: nothing moves in it ----
        bne asOut               ; The main loop swaps input for dieFade but still runs this. A
                                ;   watched angel's clock never stopped while you held the idol,
                                ;   so ~1.6 s after it caught you it set off again -- mid-scene,
                                ;   sliding away from the face it is meant to be.
        ldx #$00
asLp:   stx amIdx
        lda orbTallT,x
        beq asNext              ; not an angel
        txa                     ; ...and the one that has MARKED you holds where it caught you,
        clc                     ;   through the half second before the scene too. Stepping away
        adc #$01                ;   would lift its own mark (dieChk lets you go past a cell).
        cmp marked              ;   marked is the entity + 1, 0 for nobody
        beq asNext

        lda orbHidT,x
        bne asNext              ; not in the world
        lda orbTallT,x          ; the BIG angel: seen or not, it glides (BIG_PER)
        cmp #$02
        bne asNB
        lda angSlDT,x
        bne asFree              ; mid-glide: its clock runs and it lands when due
        lda #$00                ; standing: nothing banked -- slTick sets it off the moment it may,
        sta angAccT,x           ;   so a refused step never comes due as a teleport (angOne)
        jsr slTick
        jmp asNext
asNB:
        lda orbSeenT,x
        beq asFree              ; unobserved: it moves, as it always has
        lda angSlDT,x           ; seen MID-SLIDE: it finishes the step (the user, 2026-10-09).
        bne asFree              ;   Freezing it between two cells read as a cheat in reverse; it
                                ;   lands, and the gaze holds it from the next step on
        lda idolHd              ; seen -- but holding the IDOL a gaze no longer holds them,
        beq asSeen              ;   and they come for you in plain sight
        bne asFree              ; always
asSeen: jsr anAdj               ; one visible pixel freezes it -- and BESIDE you, its clock is
        bcc asNext              ;   ZEROED rather than held, so turning away gives you exactly
        lda #$00                ;   one step period (2 s) before it marks you (angOne), however
        sta angAccT,x           ;   much it had banked before you looked
        beq asNext              ; always
asFree:
        lda angAccT,x
        clc
        adc dtv
        cmp angPerT             ; the period is per LEVEL, swapped with the rest of the manifest
        bcc asSlid
        sbc angPerT             ; ---- CARRY the remainder, do not zero it ----
        pha                     ; Carry is set from the cmp, so this is A - period. Zeroing made
        ldx amIdx
        lda angSlDT,x           ; mid-lunge: it LANDS now, on the tick it would have teleported
        beq asStep
        jsr slLand
        jmp asLand
asStep:
        jsr angOne              ; the effective period "period + whatever this frame overshot by",
asLand:         pla                     ; and that overshoot is one frame of ticks -- so the angel walked
                                ; SLOWER on a slower build, and faster down an empty corridor than
                                ; in a dense view. Carrying it makes the average period exact at
                                ; any frame rate, which is what the accumulator was for.
                                ; (X is the entity; angOne preserves nothing, hence the pha/pla.)
        jmp asKeep
asSlid: ldx amIdx               ; not due yet -- but the last ANGSLIDE 60ths before it are the lunge
        sta angAccT,x
        jsr slTick
        jmp asNext
asKeep: ldx amIdx
        sta angAccT,x
asNext: ldx amIdx
        inx
        cpx nOrbT
        bcc asLp
asOut:  rts

; ---- angOne: one grid step toward the player ----
; Greedy, not a path. A distance field would have to be rebuilt every time the player moves or an
; orb lands, and slow-and-inexorable is both cheaper and the better feeling. Diagonal first, then
; each axis alone, so a blocked diagonal still makes progress along a wall.
angOne: jsr anAdj               ; ALREADY beside you when its step falls due, unseen: it does
        bcs anReach             ;   not need to move to mark you (the user, 2026-10-09). Before,
                                ;   only a step that LANDED beside you marked, so turning your
                                ;   back on an angel you had walked up to was safe forever.
        jsr angPick             ; where to, and may it go there?
        bcs anGo
        ldx amIdx               ; ANGREACT: due, and refused -- it is STANDING. angPick left the way
        lda angLDT,x            ;   it was refused in (a leash, an orb, a cage); bit 7 says so, and
        ora #$80                ;   only a DIFFERENT way is news to angRx. This step's re-phase,
        sta angLDT,x            ;   if any, is spent.
        lda #$00
        sta angRxT,x
        rts
; ---- ANGREACT: the fixed reaction (see ANG_REACT in the build) ----
; frameCnt is read with interrupts off: the IRQ increments it, and a carry between the two reads
; would put the stamp 256 ticks out.
; (rxStamp: after entGate -- see there)
; rxGo (bfsGo): the moment this fill answers for. A fill for a NEW player cell answers for the tick
; they entered it; one for the same cell (an orb or an angel moved) answers for now. And nobody has
; been reached yet.
rxGo:   lda bfsWant
        cmp bfsDone
        beq rgNow
        lda rxWT
        ldy rxWT+1
        jmp rgSet
rgNow:  sei
        lda frameCnt
        ldy frameCnt+1
        cli
rgSet:  sta rxFT
        sty rxFT+1
        ldx #$09
        lda #$00
rgCl:   sta angNwT,x
        dex
        bpl rgCl
        rts
; angRx (the fill's early-out loop, X = an angel its cell is labeled for): the first time this fill
; reaches it, has its way round REVERSED (or was it standing and now has a way)? Then re-set its
; clock so the step lands ANGREACT ticks after the moment the fill answers for. Leaves X = bfsEnI.
angRx:  lda angNwT,x
        bne arxNo               ; already looked at, this fill
        inc angNwT,x
        lda orbSeenT,x
        bne arxNo               ; held by your gaze: its clock is stopped anyway
        lda angSlDT,x
        bne arxNo               ; mid-lunge: this step is already chosen
        lda angRxT,x
        bne arxNo               ; re-phased once this step already
        stx amIdx
        jsr anPath              ; A = its way now, off the fill in flight (its cell is labeled)
        cmp #$ff
        beq arxNo
        sta arN
        ldx amIdx
        lda angLDT,x
        bpl arxMv
        and #$7f                ; STANDING (refused that way, or never set off: $7f)
        cmp arN
        beq arxNo               ;   the same way it was refused in: no news
        bne arxGo               ;   any other way is
arxMv:
        ; ---- reversed? per axis, both moving: the same way counts +1, opposite -1 ----
        ; Negative = it would turn back the way it came. A corner (one axis kept, the other new) is
        ; not a reversal -- an angel rounding a bend keeps its own pace.
        tax
        ldy arN
        lda #$00
        sta arS
        lda pathDXT,x
        beq arxY
        lda pathDXT,y
        beq arxY
        cmp pathDXT,x
        beq arxX1
        dec arS
        dec arS
arxX1:  inc arS
arxY:   lda pathDYT,x
        beq arxT
        lda pathDYT,y
        beq arxT
        cmp pathDYT,x
        beq arxY1
        dec arS
        dec arS
arxY1:  inc arS
arxT:   lda arS
        bpl arxNo               ; not back the way it came
arxGo:  sei
        lda frameCnt
        ldy frameCnt+1
        cli
        sec
        sbc rxFT
        sta arA                 ; how long ago the moment it answers for was
        tya
        sbc rxFT+1
        bne arxLt               ; 256 ticks or more: late
        lda arA
        cmp #$49
        bcs arxLt               ; too late to land at R: one lunge from now
        lda #$60
        sec
        sbc arA                 ; ticks left until it should land (at least the lunge)
        bne arxSt               ; always
arxLt:  lda #$18
arxSt:  sta arA
        lda angPerT
        sec
        sbc arA                 ; banked = period - left: the lunge sets out when left = the lunge
        bcs arxA
        lda #$00
arxA:   ldx amIdx
        sta angAccT,x
        lda #$01
        sta angRxT,x
arxNo:  ldx bfsEnI
        rts
rxPrv:  !byte $ff
rxWT:   !byte 0,0
rxFT:   !byte 0,0
arN:    !byte 0
arS:    !byte 0
arA:    !byte 0
angLDT: !byte $ff,$ff,$ff,$ff,$ff,$ff,$ff,$ff,$ff,$ff   ; the way each angel last set off (anPath index); bit 7 = refused it, standing
angRxT: !byte 0,0,0,0,0,0,0,0,0,0   ; 1 = re-phased this step
angNwT: !byte 0,0,0,0,0,0,0,0,0,0   ; 1 = this fill has reached it already
; ---- angPick: the step for angel X, decided but NOT taken. C set (amTX/amTY/amX/amY/amCell
; filled) if there is a legal one. Split from the taking so a lunge can choose its cell when it
; SETS OUT and commit it when it lands. ----
angPick:stx amIdx
        ; (The sign of player - angel per axis, amDX/amDY, was worked out here for the greedy
        ;   fallback; nothing has read it since the fill replaced greedy. Deleted 2026-10-10.)
        ; ---- the precomputed shortest step, then the greedy list as a fallback ----
        ; pathT is exact for the WALLS, which never move. It cannot know about a dropped orb, so
        ; when anTry refuses the step the old greedy pair still gets its turn -- one wasted tick
        ; against an obstacle that is rare, transient and two seconds from being irrelevant.
        jsr anPath
        cmp #$ff
        beq apNo                ; no descending neighbour: it is walled in, so it WAITS
        ldy amIdx
        pha
        lda orbTallT,y
        cmp #$02
        bne apStd
        pla
        jmp lxBgAim             ; the BIG angel picks its own way (level code: bgAim) -- A = the fill's
apStd:  pla                     ;   step; it answers as anTry does, C set with the step in am*
        ldy amIdx               ; ANGREACT: the way it is going, for angRx's "has it reversed?"
        sta angLDT,y
        tax
        stx amDir              ; the direction index, kept for the lunge: index + 1 IS its code
        lda pathDXT,x
        sta amTX
        lda pathDYT,x
        sta amTY
        ; ---- THE GREEDY FALLBACK IS GONE, and the fill is why ----
        ; It existed only to paper over a path that was plotted through orbs it could not see:
        ; the angel walked into one, was refused, and slid sideways. That produced the pacing --
        ; a caged angel wandering its cage because greedy tracked whichever side the player was
        ; on -- and it could never solve a room with one door blocked and another open, because
        ; greedy points AT the player, through the wall, not round to the far door.
        ; Now the fill itself routes round orbs, so a refused step means genuinely boxed in, and
        ; the right answer to that is to stand still.
        jmp anTry               ; a tail call: C is anTry's verdict
apNo:   clc                     ; (the cmp above left C set)
        rts
anGo:   inc blkVer              ; the obstacle map changed: the fill has to be redone
        ldx amIdx
        lda #$00                ; ANGREACT: a step taken -- the next one may be re-phased again
        sta angRxT,x

        lda orbYCT,x            ; the cell it is leaving opens
        jsr mulW
        clc
        adc orbXCT,x
        tay
        lda #$00
        sta blkT,y
        lda amX
        sta orbXCT,x
        lda amY
        sta orbYCT,x
        ldy amCell
        lda #$02
        sta blkT,y
        jsr anAdj               ; did that land it beside the player? then they are MARKED.
        bcc anNoMk              ;   A step is one trigger; the other is an angel ALREADY beside
                                ;   you whose step falls due unseen (angOne) -- see asSeen.
        ; ---- A LUNGE YOU WATCH LAND DOES NOT MARK YOU (the user, 2026-11-08) ----
        ; Seen mid-slide an angel still finishes its step (asFree), so turning onto one already
        ; under way put it beside you WHILE you watched -- caught in plain sight, dead half a
        ; second later, standing still and looking right at it. It takes the cell; the mark waits.
        ; Beside you and watched, asSeen zeroes its clock, so looking away gives one step period
        ; before angOne marks you, which jumps to anReach past this. Holding the idol a gaze holds
        ; nothing, so then it marks you as before.
        lda orbSeenT,x
        beq anReach             ; unseen: the step marks you, as it always has
        lda idolHd
        beq anNoMk              ; watched, no idol: it lands beside you and waits
anReach:
        ; ---- ONE MARK AT A TIME: a second angel beside you does not take it over ----
        ; dcClr unhid only the angel in marked (a caught angel was hidden until 2026-11-02), so
        ; overwriting marked left the first one hidden for good -- invisible, still holding its cell
        ; in blkT, until a restart. Found by the overhead simulator on level 8 (2026-10-12), where
        ; the user had once seen an angel go missing. Still one: markC and markPa are the
        ; first one's. The newcomer just stands beside you; its own step re-checks every period.
        lda marked
        bne anNoMk              ; (anNoMk only reloads X now: the occluder mask it refreshed is gone, see occBy)
        ldx amIdx
        stx dieIdx              ; from the mark on, the projection stashes THIS angel's side of the
        lda #$ff                ;   screen in dieOff/dieSgn -- which it only does while the angel
        sta dieOff              ;   is drawn, so $ff still standing at dieGo means it never was
        ; ---- IT STAYS IN THE WORLD, DRAWN (2026-11-02) ----
        ; Unseen, it used to stop rendering entirely and wait for a 30-degree turn -- "the whole
        ; trigger is one angle comparison". But a turn is not a look: the user, pinned, backed and
        ; strafed with it beside them and pushed against where it stood, seeing nothing -- a short
        ; turn put it on screen still hidden, then the scene pulled it "out of thin air". Now it is
        ; drawn like any angel, so whatever brings it into view (a turn, a step, a strafe) shows it,
        ; and dieChk starts the scene the moment it does.
        lda #$00
        sta markSaw             ; 0, "not seen yet": dieChk, later this same frame, sees whether
                                ;   you were LOOKING at it (dcTurn) and starts the half second
        sta mvBmp               ; no bump into it yet (mvFree, the move test)
        lda orbYCT,x            ; its cell, for mvFree to recognise
        jsr mulW
        clc
        adc orbXCT,x
        sta markC
        inx
        stx marked
        lda pa                  ; the heading it caught you at, for the turn trigger
        sta markPa
        rts                     ; (this fell through into dckPnt until 2026-11-02, painting every
                                ;   sprite in the colour numbered by your heading for one frame)
dckPnt: ldx #$07               ; A -> every sprite's own colour
dckLp:  sta obC,x
        dex
        bpl dckLp
        rts

anNoMk: ldx amIdx
        rts                     ; (an occluder mask for the new cell was rebuilt here: gone -- see occBy)
; ---- anAdj: can angel X reach the player from where it stands? C set if so. X kept, Y lost ----
anAdj:
        lda orbTallT,x          ; the big angel marks nobody (for now: the user is eyeballing it)
        cmp #$02
        bne anAdjG
        clc
        rts
anAdjG:
        sec
        lda orbXCT,x
        sbc px+1
        clc
        adc #$01
        sta anKx                ; 1 = same column; 0 or 2 = one cell to a side
        cmp #$03
        bcs aaNo
        sec
        lda orbYCT,x
        sbc py+1
        clc
        adc #$01
        sta anKy
        cmp #$03
        bcs aaNo
        ; ---- ON THE DIAGONAL, BOTH corner cells have to be clear ----
        ; "if it's at an angle but there's nothing at all between you, death. But if you're
        ; around a corner, it has to clear the corner." Orthogonally adjacent there is nothing
        ; between you by definition, so this only runs for the corner case. blkT is non-zero for
        ; a wall AND for an entity, so an orb parked in the gap blocks the reach too, which is
        ; the same answer for the same reason.
        lda anKx
        cmp #$01
        beq aaYes               ; same column: orthogonal, nothing to clear
        lda anKy
        cmp #$01
        beq aaYes               ; same row
        lda py+1                ; corner one: the angel's column, your row
        jsr mulW                ; mulW leaves X alone -- anGo relies on that too
        clc
        adc orbXCT,x
        tay
        lda blkT,y
        bne aaNo
        lda orbYCT,x            ; corner two: your column, the angel's row
        jsr mulW
        clc
        adc px+1
        tay
        lda blkT,y
        bne aaNo
aaYes:  sec
        rts
aaNo:   clc
        rts

; ---- anTry: is the step in amTX/amTY legal? C set and amCell/amX/amY filled if so ----
; Only ever after anPath (angPick), which has already refused a zero step, a taken cell (blkT) and
; a diagonal that would cut a corner. A range check is not needed either: the border is solid, so
; a step from an open cell never leaves the map. What is left is what anPath cannot know.
anTry:  ldx amIdx
        clc
        lda orbXCT,x
        adc amTX
        sta amX
        clc
        lda orbYCT,x
        adc amTY
        sta amY
        lda amX                 ; never step ONTO the player: touching is harmless by design,
        cmp px+1                ;   but blkT under their feet would make mvFree refuse every
        bne anT1                ;   move they tried and the game would just stop
        lda amY
        cmp py+1
        beq anNo
anT1:   lda amY
        jsr mulW
        clc
        adc amX
        sta amCell
        ; ---- the leash: a SPARSE (entity slot, cell) list, $ff-terminated ----
        ; See LEASH_AT for why the fill ignores it, and angLeash for why this is a list and not
        ; the one-bit-per-cell bitmap it used to be. Scanned once per attempted step -- once
        ; every two seconds per angel -- so the walk is free at any plausible NLEASH, and it
        ; leaves X alone, which the bitmap version could not (it needed X for the bit shift and
        ; two bytes of scratch for the mask and the row offset).
        ldy #$00
alLp:   lda angLeashT,y
        cmp #$ff
        beq anSqOk              ; end of the list: nothing leashes anything here
        cmp amIdx
        bne alNx                ; some other angel's entry
        lda angLeashT+1,y       ; this angel: is this the cell it may not enter?
        cmp amCell
        beq anNo                ; leashed: this one does not go there
alNx:   iny
        iny
        bne alLp                ; always taken -- NLEASH is far below the 128 pairs that would
                                ;   wrap Y, and the $ff above is what actually ends the walk
anSqOk:
        ldx amIdx               ; the BIG angel steps in plain sight -- but never nearer than BIGSTOP
        lda orbTallT,x
        cmp #$02
        bne anSqN
        jmp lxBgFar             ; (level code: bgFar)
anSqN:
        ; ---- how much of it would the player SEE standing there? ----
        ; It MAY step into view -- an angel easing round a corner and freezing mid-peek is the
        ; best thing it does -- but only into a cell something covers. Walking out into an open
        ; room breaks the one rule it has. The span walk counts columns shown against columns
        ; hidden, so this is a fraction, not a boolean, and the compare needs no division.
        ; Off screen and behind a wall are the same case, deliberately.
        ldx amIdx
        lda orbXCT,x            ; point it at the DESTINATION (culling, zones and occBy read it)
        pha
        lda orbYCT,x
        pha
        lda orbSeenT,x          ; orbNo writes this on its early exits and the freeze test reads
        sta ovSvS               ;   it next frame -- a probe must not disturb it
        lda amX
        sta orbXCT,x
        lda amY
        sta orbYCT,x
        ldx amIdx
        stx oidx
        lda #$00
        sta ovVis
        sta ovOcc
        lda #$01
        sta ovProbe
        jsr orbOne
        lda #$00
        sta ovProbe
        ldx amIdx               ; and put it back where it really is
        lda ovSvS
        sta orbSeenT,x
        pla
        sta orbYCT,x
        pla
        sta orbXCT,x
        lda ovVis
        beq anYes               ; nothing of it shows there at all
        lda idolHd              ; ---- and the IDOL suspends the covering rule too ----
        beq anCov               ; This is the DEEPER of the angel's two rules: the freeze stops
                                ;   a watched angel's clock, but THIS is what stops it stepping
                                ;   into the open at all -- watch one down a corridor and every
                                ;   cell toward you is fully in view, so every candidate is
                                ;   rejected and it never moves however loudly its clock runs.
                                ;   Bypassing only the freeze changes nothing you can see, which
                                ;   is exactly what the first build of this did.
        bne anYes               ; always: carrying it, they walk at you in the open
anCov:  lda ovVis

        cmp ovOcc
        beq anYes
        bcc anYes               ; at least half of it is covered: it may creep in
        jmp anNo                ; out in the open, so it stays where it is
anYes:  sec
        rts
anNo:   clc
        rts
; ---- THE LUNGE (ANGSLIDE): every step drawn as a slide, not a teleport (see slTick) ----
; An angel lunging owns BOTH cells -- the one it left and the one it is going to are 2 in blkT for
; the whole slide -- so nothing can walk into either and the landing is always legal. Halfway, its
; orbXCT/orbYCT switch to the new cell: culling, zones and the facing rule (occBy) then answer for the
; cell it is NEARER, and its projection offset (slOn) runs -0.5..0 from there instead of 0..+0.5.
angSlDT: !byte 0,0,0,0,0,0,0,0,0,0   ; 0 = not lunging, else 1..4 = +x,-x,+y,-y; bit 7 once switched
angSlFT = $758a             ; how far, in 256ths of the cell. RAM in a build with sentries
                                ;   (2026-10-14, the arena one byte short): read only while angSlDT is
                                ;   set, and every write of angSlDT (stSet, svStep, svRole) writes it too
slFT:   !byte $0a,$14,$1f,$29,$33,$3d,$48,$52,$5c,$66,$71,$7b,$85,$8f,$9a,$a4,$ae,$b8,$c3,$cd,$d7,$e1,$ec,$f6   ; 60ths into the lunge -> 256ths of the way
slDXT:  !byte 0,1,$ff,0,0,1,$ff,1,$ff
slDYT:  !byte 0,0,0,1,$ff,1,1,$ff,$ff
amDir:  !byte 0                 ; angPick: anPath's direction index
slOA:   !byte 0                 ; slOn: the signed offset along the axis being added
slDir:  !byte 0
slNgT:  !byte 0,0,1,0,1         ; west and north run the offset backwards (the sentries' stcS reads it too)
slO:    !byte 0
slF:    !byte 0                 ; this projection's own forward and right terms, kept to take back
slFH:   !byte 0
slR:    !byte 0
slRH:   !byte 0

; ---- slTick: angel X's step is not due yet; A = its banked 60ths ----
; Inside the last ANGSLIDE 60ths the step is chosen now and drawn as a slide that lands when it
; falls due. EVERY step, not only with the idol in hand (2026-10-09). An unseen step used to be a
; teleport, and the visibility test only asks about the two CELLS: an angel could leave a cell you
; could not see and land in another, passing through the sliver of floor you WERE looking at --
; which read as a cheat. Sliding, its sprite crosses that sliver and orbSeenT catches it -- but a
; slide once begun always COMPLETES (angStep keeps the clock of an angel with angSlDT set running,
; the user's rule of 2026-10-09). It lands in the new cell, and only then does the gaze hold it.
; With the idol in hand a seen angel's clock keeps running, so the same slide is the lunge.
slTick: lda angSlDT,x
        bne stMove
        lda orbTallT,x          ; the big angel sets off at once: its whole period is the glide
        cmp #$02
        beq slGo
        lda angAccT,x
        clc
        adc #$18         ; fits: the build asserts period + slide <= 256
        cmp angPerT
        bcc stOut               ; not yet
slGo:   jsr angPick             ; clobbers X
        bcc stOut               ; nowhere to go: try next frame; when it falls due it steps as usual
        ldx amIdx
        ldy amCell
        lda #$02
        sta blkT,y              ; the landing cell is taken from now on
        inc blkVer              ; ...which the path fill has to know
        ldy amDir               ; anPath's index 0..7 (E W S N, SE SW NE NW) + 1 = the lunge code:
        iny                     ;   1..4 as before, 5..8 the diagonals -- slDXT/slDYT are in that order
        tya
stSet:  sta angSlDT,x
stMove:
        lda orbTallT,x
        cmp #$02
        bne stMvN
        ldy angAccT,x           ; the big angel: 60ths into its glide -> the slide's step (bigSlT: its
        lda bigSlT,y            ;   glide is the whole period, BIG_PER, whatever that is)
        jmp stIx
stMvN:
        lda angAccT,x           ; 60ths into the lunge = banked - (period - slide), clamped to the table
        clc                     ;   (should it read negative, hold at the start)
        adc #$18
        sec
        sbc angPerT
        bcs stIx
        lda #$00
stIx:   cmp #$18
        bcc stIx2
        lda #$17
stIx2:  tay
        lda slFT,y
        sta angSlFT,x
        bpl stDty               ; first half: still counted in the cell it is leaving
        lda angSlDT,x
        bmi stDty               ; switched already
        ora #$80
        sta angSlDT,x
        jsr slFwd               ; now it is NEARER the new cell
stDty:
stOut:  rts

; slFwd / slBack: move angel X's cell one step along its lunge, or back
slFwd:  lda angSlDT,x
        and #$7f
        tay
        clc
        lda orbXCT,x
        adc slDXT,y
        sta orbXCT,x
        clc
        lda orbYCT,x
        adc slDYT,y
        sta orbYCT,x
        rts
slBack: lda angSlDT,x
        and #$7f
        tay
        sec
        lda orbXCT,x
        sbc slDXT,y
        sta orbXCT,x
        sec
        lda orbYCT,x
        sbc slDYT,y
        sta orbYCT,x
        rts

; ---- slLand: the step falls due mid-lunge. Land it through anGo, the instant step's own tail ----
; anGo moves an angel from orbXCT/orbYCT to amX/amY: it frees the cell left, takes the new one,
; marks the player if that is beside them (the occluder mask it rebuilt is gone). So put the cell back
; where the lunge set out from, name the landing cell, and let it do exactly what it always did.
slLand: lda angSlDT,x
        bmi slL2
        jsr slFwd               ; a lunge that never reached halfway (one long frame): finish it
slL2:   lda orbXCT,x
        sta amX
        lda orbYCT,x
        sta amY
        jsr mulW
        clc
        adc amX
        sta amCell
        ldx amIdx
        jsr slBack
        lda #$00
        sta angSlDT,x
        sta angSlFT,x
        jmp anGo

; ---- orbProjS: the projection, with a lunging angel's own fraction of a cell added ----
; The shared terms kf/kr carry the PLAYER's fraction (see omTrig). A lunging angel adds its own:
; two of the same small products omTrig makes, for this one projection only, then taken back.
; Nothing else in orbProj changes, and an entity that is not lunging pays a load and a branch.
orbProjS:
        ldx oidx
        cpx nOrbT
        bcs opsH                ; a hole-like: never lunges
        lda angSlDT,x
        bne opsS
opsP:   jmp orbProjC
opsH:   cpx lvlCorT             ; ...except the CORNER exit: a north-west "lunge" held at 127/256
        bne opsP                ;   of a cell, which brIn sets in its angSlDT/angSlFT -- its cell's corner
opsS:   jsr slOn
        jsr orbProjC
        php                     ; the carry is orbProj's answer
        jsr slOff
        plp
        rts
; slOn: the offset o from orbXCT/orbYCT is angSlFT as a SIGNED byte -- +f before the halfway
; switch, f-256 (from the new cell) after it -- turned round for a lunge west or north. Along x
; it adds o*cos to forward and takes o*sin from right; along y, o*sin and o*cos, the same shape
; as omTrig's kf = kxc + kys and kr = kyc - kxs.
slOn:   lda kfL                 ; ---- ANGDIAG: keep the player's terms, add x and y parts in place ----
        sta slF                 ; slOff puts these back exactly: nothing between the two writes kf/kr
        lda kfH                 ;   (omTrig sets them once a frame; orbProj only reads them), and a
        sta slFH                ;   diagonal's two parts together can pass the 8 bits a total would get
        lda krL
        sta slR
        lda krH
        sta slRH
        lda angSlDT,x
        and #$7f
        cmp #$40               ; the BALL LIGHTNING: any angle, its own x and y offsets
        beq snBolt
        sta slDir
        lda angSlFT,x
        jsr snC
        sta slO
        ldy slDir
        lda slDXT,y
        beq snNoX
        jsr snNeg
        jsr snX
snNoX:  ldy slDir
        lda slDYT,y
        beq snDone
        jsr snNeg
snY:    sta slOA                ; along y: forward += o*sin, right += o*cos
        ldx osin
        ldy osinS
        jsr oFrac
        jsr kfAdd
        lda slOA
        ldx ocos
        ldy ocosS
        jsr oFrac
        jmp krAdd
snX:    sta slOA                ; along x: forward += o*cos, right -= o*sin
        ldx ocos
        ldy ocosS
        jsr oFrac
        jsr kfAdd
        lda slOA
        ldx osin
        ldy osinS
        jsr oFrac
        eor #$ff
        clc
        adc #$01
        jmp krAdd
snBolt: lda bsXF                ; (bgStep keeps them: signed 256ths of a cell from its cell's centre)
        jsr snC
        jsr snX
        lda bsYF
        jsr snC
        jmp snY
; snC: -128 is outside oFrac's range, so it becomes -127 (1/256 of a cell does not show)
snC:    cmp #$80
        bne snCo
        lda #$81
snCo:   rts
; snNeg: A = the axis step (1 or $ff) -> A = the offset, negated for a step backwards
snNeg:  cmp #$80
        lda slO
        bcc snDone
        eor #$ff
        adc #$00                ; C set from the cmp: + 1
snDone: rts
; kfAdd / krAdd: add A, a signed byte, into kf / kr
kfAdd:  ldx #$00
        cmp #$80
        bcc kfA1
        dex
kfA1:   clc
        adc kfL
        sta kfL
        txa
        adc kfH
        sta kfH
        rts
krAdd:  ldx #$00
        cmp #$80
        bcc krA1
        dex
krA1:   clc
        adc krL
        sta krL
        txa
        adc krH
        sta krH
        rts
slOff:  lda slF                 ; the saved terms back
        sta kfL
        lda slFH
        sta kfH
        lda slR
        sta krL
        lda slRH
        sta krH
        rts



; ---- svReg: sprite slot X is showing a sentry, A = its plain-ball pointer. Note both for the 60Hz
; svTick, and return A = the pointer of the frame that is up right now. Clobbers Y. ----
svReg:  pha
        txa
        ldy svCnt
        sta svSlT,y
        pla
        sta svBsT,y
        inc svCnt
        clc
        adc svPD
        rts
; ---- svQuad: one right-column sprite of the silver orb. A = its plain pointer, X = the slot,
; obY,x already set. Marked $fe, as the upper half is: it takes the priority bit and stamps nothing. ----
svQuad:
        cpy #$2d               ; (Y = ovar) the big angel's: no sentry to note
        bcs sqNoR
        jsr svReg               ; a sentry's rung: svReg notes it for svTick
sqNoR:

        sta obP,x
        lda orbBitT,x
        sta omBit
        ora omEn
        sta omEn
        ldy oidx
        lda orbColT2,y
        sta obC,x
        lda svRX
        sta obX,x
        lda svRX8
        beq sqNoM
        lda omBit
        ora omX8
        sta omX8
sqNoM:  ldy ovar
        lda orbExpT,y
        beq sqNoX
        lsr                     ; SILVER: bit 0 doubles the WIDTH, bit 1 the HEIGHT -- apart, for
        bcc sqNoXy              ;   the two-wide rungs that double only the height (SVQUAD=v)
        lda omBit               ; (X is the SLOT here -- the flags are re-read, not parked in it)
        ora omXX
        sta omXX
        lda orbExpT,y
        lsr
sqNoXy: lsr
        bcc sqNoX
        lda omBit
        ora omYY
        sta omYY
sqNoX:  lda #$fe                ; inherit the priority bit, stamp nothing (see the upper half)
        sta obIX,x
        inc onv
        rts

; (level code 'silver' cut here: see LX_SRC)
; ---- THE SENTRIES' RESIDENT STATE: what the engine's own code reads (the projection, osFlush) ----
; svShT svDurT svPDT svInkT svBdT svVarT: equates into IAR1 -- see SVTBL
svVarT = $fd80
svShT = $fde2
svDurT = $fdea
svPDT = $fdf2
svInkT = $fdf6
svBdT = $fdfa
   ; this level's sentry count: entities 0..svN-1
; svPathT (every PATH, once, as direction codes, each ended by -length), svP0T (per role: where in
; its path it starts), svRXT/svRYT (start cells of the roles past stage 0's), stSvT and stRmT: in the
; silver module now (L9T)
   ; the STAGES: how many (1 = the level is one room)






svDLo:  !byte 0                 ; svTouch's scratch, and the projection's (svStep runs after it)
svCnt:  !byte 0                 ; sprites the sentries took in the projection pass under way
svSlT   = $757a                 ; ...their slots (eight: every sentry shares the list). RAM: read only below svCnt
svBsT:  !byte 0,0,0,0,0,0,0,0   ; ...and their plain-ball pointers
svLCnt: !byte 0                 ; the same, as of the last osFlush: what is ON SCREEN, and the
svLSlT  = $7582                 ;   only list svTick may touch -- see osFlush. RAM: read only below svLCnt
svLBsT: !byte 0,0,0,0,0,0,0,0
bgPK:   !byte 0                 ; the big angel's next part, and parts left to try
bgPN:   !byte 0
bgPM:   !byte 0                 ; ...its rung magnified, and scratch
bgPD:   !byte 0
bsN:    !byte 0                 ; bgStep: ticks left this frame
bsXF:   !byte 0                 ; the ball's offsets from its cell's centre, signed 256ths (slOn reads them)
bsYF:   !byte 0
bsVX:   !byte 0                 ; ...and its velocity, signed 256ths a tick
bsVY:   !byte 0
bsDX:   !byte 0                 ; |ball - you| (bsBD), 8.8 -- the aim halves them to fit -- and which
bsHX:   !byte 0                 ;   way (bsS). In THIS order: bsAb reaches y's two at ,y = 2
bsDY:   !byte 0
bsHY:   !byte 0
bsS:    !byte 0
bsC:    !byte 0                 ; bsOpen's row offset
bsFl:   !byte 0                 ; bgStep: ticks of the hit flash left (0 = none)
bsL:    !byte 0
bsH:    !byte 0
bgHgt:  !byte 0                 ; ...its h (88/d) this frame, for the stamp's depth test
osBig:  !byte 0                 ; occStamp: this slot is the big angel's (stamp by depth)
bgC:    !byte 0                 ; bgOcc's scan column and the overlap's end
bgE:    !byte 0
svRX:   !byte 0                 ; the right column's X, 9 bits
svRX8:  !byte 0
svPD:   !byte 0
svY:    !byte 0
svYH:   !byte 0

; ---- dieFade: the room goes out, and nothing else happens ----
; No charset corruption any more: the swap is one frame, done once the screen is already black,
; so it is invisible. Reads the LIVE colour registers and walks each one step darker per tick,
; so slots that start dark reach black early and the whole palette converges.
dieFade:
        ; ---- THE TURN: onto the angel, arriving at dieArr (see DIE_ARR) ----
        lda dieRem              ; 0 = landed (or nothing to face)
        beq dfTDn
        lda dieOff              ; columns off centre, UNSIGNED -- see the stash in orbOne
dfOP:   cmp #$18
        bcs dfMiss
        ; ---- TWO consecutive frames, not one ----
        ; The angel is a cell away, so on the frame it crosses into the frustum its forward
        ; distance is near zero and the projection is numerically unstable -- it can alias to a
        ; small offset. A value that survives two frames is evidence; one frame is not.
        inc dieLk
        lda dieLk
        cmp #$02
        bcc dfStp
        ; ---- near the middle: the SCREEN refines the target ----
        ; dieAim aims at the angel's cell centre; where the sprite actually lands can differ by a
        ; column or two (the projection's own rounding). One column is COL_FINE units of angle, and
        ; this frame's offset was measured at this pa, so pa +- off * COL_FINE is where it is.
        lda dieOff              ; already a magnitude, so there is no sign to strip
dfLP:   ldx #$4b
        stx mq
        jsr mul8                ; phi:plo = |off| * COL_FINE
        lda dieSgn              ; which side it sits on decides which way to correct
        bmi dfLN
        clc                     ; right of centre: turning up sweeps it left, onto the middle
        lda paF
        adc plo
        sta dieTgF
        lda pa
        adc phi
        sta dieTg
        jmp dfStp
dfLN:   sec
        lda paF
        sbc plo
        sta dieTgF
        lda pa
        sbc phi
        sta dieTg
        jmp dfStp
dfMiss: lda #$00                ; outside the window: the run of good frames restarts
        sta dieLk
dfStp:  lda frameCnt            ; ---- how much of the remaining turn is THIS frame's ----
        sec
        sbc dieT0
        cmp dieArr
        bcs dfLand              ; time: land exactly, on the tick the note arrives
        sta dmT                 ; elapsed
        lda dieArr
        sec
        sbc dmT                 ; ticks left after this frame...
        clc
        adc dtv                 ; ...plus this frame's own: what was left when it began
        sta dvD                 ;   (<= dieArr + DT_MAX, a byte)
        sec                     ; the angle still to go, signed 16-bit: the short way round
        lda dieTgF
        sbc paF
        sta dvQ0
        lda dieTg
        sbc pa
        sta dvQ1
        sta dmS                 ; bit 7: which way
        bpl dfAb
        sec
        lda #$00
        sbc dvQ0
        sta dvQ0
        lda #$00
        sbc dvQ1
        sta dvQ1
dfAb:   lda dtv                 ; |rest| * dtv, 24-bit: (hi * dtv) << 8 + lo * dtv
        sta mq
        lda dvQ1
        jsr mul8
        lda plo
        sta dmT
        lda phi
        sta dmU
        lda dvQ0
        jsr mul8                ; (mq survives: mul8 only reads it)
        lda plo
        sta dvQ0
        clc
        lda phi
        adc dmT
        sta dvQ1
        lda dmU
        adc #$00
        sta dvQ2
        jsr udiv                ; / ticks left: this frame's share, never more than the rest
        bit dmS
        bmi dfSn
        clc
        lda paF
        adc dvQ0
        sta paF
        lda pa
        adc dvQ1
        sta pa
        jmp dfTDn
dfSn:   sec
        lda paF
        sbc dvQ0
        sta paF
        lda pa
        sbc dvQ1
        sta pa
        jmp dfTDn
dfLand: lda dieTgF              ; ---- arrived: exactly on it, with the note ----
        sta paF
        lda dieTg
        sta pa
        lda #$00
        sta dieRem
        jsr setGnd              ; the room has already gone; $d023 is untouched, so the seams
        sta $d022               ;   stay and the angel is not left alone in the black
        lda frameCnt            ; re-date, so "elapsed >= DIE_OUT" fires DIE_PAUSE ticks from now
        sec
        sbc #$b4
        sta dieT0
        rts
; ---- dieAim: X = the angel. dieTg:dieTgF = the exact heading from (px,py) to its cell centre ----
; No atan at run time anywhere else, so one here: fold the delta onto the first octant, look the
; ratio up in atanQT, unfold. The delta is under 1.5 cells either way (the angel is a neighbour),
; so one halving puts both magnitudes in a byte and the ratio in 0..64 costs one udiv.
dieAim: sec                     ; dx = cell centre - px, 16-bit (cells in the high byte)
        lda #$80
        sbc px
        sta dvQ0
        lda orbXCT,x
        sbc px+1
        sta dvQ1
        sec                     ; dy, likewise
        lda #$80
        sbc py
        sta dvQ2
        lda orbYCT,x
        sbc py+1
        sta dvD
        lda dvQ1
        and #$80
        sta dmS                 ; bit 7: west
        bpl daX
        sec
        lda #$00
        sbc dvQ0
        sta dvQ0
        lda #$00
        sbc dvQ1
        sta dvQ1
daX:    lda dvD
        bpl daY
        lda dmS
        ora #$40                ; bit 6: north
        sta dmS
        sec
        lda #$00
        sbc dvQ2
        sta dvQ2
        lda #$00
        sbc dvD
        sta dvD
daY:    lda dvQ1                ; both under 384: if either needs 9 bits, halve both
        ora dvD
        beq da8
        lsr dvQ1
        ror dvQ0
        lsr dvD
        ror dvQ2
da8:    lda dvQ0                ; |dx|
        cmp dvQ2                ; |dy|
        bcs daXb
        sta dmT                 ; steeper than 45 degrees: the ratio |dx|/|dy|, from south
        lda dvQ2
        sta dvD
        lda dmS
        ora #$20                ; bit 5: the octant is swapped
        sta dmS
        jmp daDv
daXb:   sta dvD                 ; the ratio |dy|/|dx|, from east
        lda dvQ2
        sta dmT
daDv:   lda #$00
        ldx dvD
        beq daT                 ; 0/0 cannot happen (a neighbour), but never divide by it
        sta dvQ2
        lda dmT                 ; num << 6: high byte num >> 2, its two low bits atop the low byte
        lsr
        ror dvQ2
        lsr
        ror dvQ2
        sta dvQ1
        lda dvQ2
        sta dvQ0
        lda #$00
        sta dvQ2
        jsr udiv                ; 0..64
        ldx dvQ0
        lda atanQT,x            ; quarter units
daT:    sta dmT
        lsr
        lsr
        sta dieTg
        lda dmT
        asl
        asl
        asl
        asl
        asl
        asl
        sta dieTgF
        lda dmS
        and #$20
        beq daS1
        sec                     ; swapped: 64 units - it
        lda #$00
        sbc dieTgF
        sta dieTgF
        lda #$40
        sbc dieTg
        sta dieTg
daS1:   bit dmS
        bpl daS2
        sec                     ; west: 128 units - it
        lda #$00
        sbc dieTgF
        sta dieTgF
        lda #$80
        sbc dieTg
        sta dieTg
daS2:   bit dmS
        bvc daS3
        sec                     ; north: minus it (y runs south)
        lda #$00
        sbc dieTgF
        sta dieTgF
        lda #$00
        sbc dieTg
        sta dieTg
daS3:   sec                     ; ---- which quadrant: how far round from where they face ----
        lda dieTg
        sbc pa
        bpl daQp
        eor #$ff                ; |difference| (128 stays 128: unsigned below)
        clc
        adc #$01
daQp:   ldx #$3c
        ldy #0
        cmp #$20                ; within 45 degrees: in front
        bcc daQ
        ldx #$78
        ldy #24
        cmp #$60                ; within 135: to one side
        bcc daQ
        ldx #$b4
        ldy #48                 ; behind
daQ:    stx dieArr
        sty dieQ
        lda #$01
        sta dieRem
        rts
; ---- udiv: dvQ0..2 (24-bit) / dvD -> quotient in dvQ0..2. dvD must not be 0 ----
udiv:   lda #$00                ; the remainder, its ninth bit in carry
        ldx #24
udL:    asl dvQ0
        rol dvQ1
        rol dvQ2
        rol
        bcs udS                 ; past 255: certainly >= the divisor
        cmp dvD
        bcc udN
udS:    sbc dvD                 ; carry is set on both ways in
        inc dvQ0
udN:    dex
        bne udL
        rts
dfTDn:
        lda frameCnt
        sec
        sbc dieT0
        cmp #$f0
        bcs dfEnd
        cmp #$10                ; elapsed -> shade, three frames each; past the table it is black
        bcc dffOk
        lda #$0f
dffOk:  tax
        lda dieFadeT,x
        cmp dieTck
        beq dfDn                ; this tick already written
        sta dieTck
        lda $d021               ; VIC colour registers read back, but with the UNUSED UPPER BITS
        and #$0f                ;   SET -- white reads as $f1, not $01, which indexed a 16-entry
        tax                     ;   table 241 bytes past its end
        lda darkerT,x
        jsr setGnd
        lda $d022
        and #$0f
        tax
        lda darkerT,x
        sta $d022
        ; $d023 is deliberately NOT walked down: the seams stay lit through the whole turn, and
        ; once the walls and floor have gone they are the only thing still drawing the room.
        ; $d025/$d026 and dieInk are the ANGEL's inks and are deliberately left alone: it is the
        ; one thing that does not go out. The orbs cannot be spared with it -- those two registers
        ; are shared by all eight sprites -- which is why dieGo cuts them outright instead.
        lda dieTck
        bne dfDn
        ldx #$00                ; first tick only: the occluder ink goes at once. It shows in a
dfCol:  lda #$08                ;   handful of stamped cells, and a fill per tick is 14,000
        sta $d800,x             ;   cycles inside a frame that is still rendering
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne dfCol
dfDn:   rts

; ---- dieSwap: hand the screen to the face, in ONE frame, on black ----
dfEnd:
        lda #$00                ; ---- BLACK FIRST, THEN SWAP ----
        sta $d022               ; The ground is already black from the fade, but the walls and the
        sta $d023               ;   SEAMS were still lit while the charset was overwritten
                                ;   underneath them -- half a screen of world codes drawn through
                                ;   a charset that is turning into the picture. That is the char
                                ;   corruption, and it is confined to the bottom half because
                                ;   that is the half the split draws from charset B.
        ldx #$00                ; charset B is plain RAM now: no port dance, no sei. (It was five
                                ;   pages under the I/O hole, ~12,800 cycles with interrupts off.)
                                ; unrolled per page and GENERATED from the glyph count -- this
dsLp:
        lda faceChrT+$0000,x
        sta $c800,x
        lda faceChrT+$0100,x
        sta $c900,x
        lda faceChrT+$0200,x
        sta $ca00,x
        lda faceChrT+$0300,x
        sta $cb00,x
        lda faceChrT+$0400,x
        sta $cc00,x
        lda faceChrT+$0500,x
        sta $cd00,x
        inx
        bne dsLp
        ldx #$38             ; ...and the last, partial page, top down
dsTl:   lda faceChrT+$05ff,x
        sta $cdff,x
        dex
        bne dsTl
        ldx #$00                ; colour RAM is the OTHER memory at $d800 and needs I/O back in.
dsCol:  lda #$08  ; bit 3 keeps the cell multicolor; the face wants black here
        sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne dsCol
        lda #$02        ; the picture charset -- it was copied over charset B -- in all
        sta pCh0                ;   three raster regions. This was a literal $06, the $d018 nibble
                                ;   for $d800, and it survived the charsets' move to $c000/$c800
                                ;   (2026-09-16) for exactly one play session: the death scene
                                ;   selected an empty page and drew nothing. The user caught it.
        sta pCh1
        sta pCh2
        lda #$00                ; still black: phase 2 ramps up from here
        jsr setGnd
        sta $d022
        sta $d023
        ; ---- and straight into the first picture ----
        ; The screen is black here (the fade just finished and the swap set every palette register
        ; to 0), so the copy is invisible and the cut is picOn's three stores on the next frame.
        lda #$02
        sta dieSt
        lda #$ff                ; "not placed yet" -- see dieShow. dfEnd runs INSIDE the fade
        sta dieTck              ;   frame, which returns into the render path, so anything drawn
        rts                     ;   here is painted over by renderSym before it is ever displayed.

; ---- dieShow: the pictures, cut to hard and held ----
; The face used to SLIDE in and back out, fading up and down, never still. This does not: the
; screen is already black when a picture is prepared, so the cut is one write per palette register
; and the picture is simply THERE. Stark reads as more unsettling than motion -- the user's call
; after seeing both, and the reason the charset-cycling experiment was dropped entirely.
;
; One picture: shown for DIE_SHOW sixtieths, then black and held until fire.
dieShow:
        lda #$00                ; no sprites from here on. Clearing this at the SWAP did not hold:
        sta omEn                ;   the swap runs early in the frame and orbMove refills omEn
        sta $d015               ;   later in the same one, so the carried-orb slot came back.
        lda dieSt
        cmp #$03
        beq dshFir              ; HELD: black, waiting on fire, nothing left to time
        lda dieTck              ; $ff = the picture is not on screen yet. It CANNOT be placed in
        cmp #$ff                ;   dfEnd: that runs inside the FADE frame, which returns into the
        bne dshRun              ;   render path and repaints the room over it. By here the main
        jsr picPut              ;   loop has branched away from the renderer, so the screen sticks.
        jsr picOn
        lda frameCnt
        sta dieT0
        lda #$00
        sta dieTck
        rts
dshRun: lda frameCnt            ; elapsed since this picture went up
        sec
        sbc dieT0
        cmp #$78
        bcc dshHld              ; still showing it
        ; ---- this picture is done: black FIRST, always ----
        ; Going black before deciding what comes next is what makes the next cut hard. The copy
        ; takes about a frame and a half and both buffers are displayed in turn, so it cannot
        ; happen while a picture is up without showing itself.
        lda #$00
        jsr setGnd
        sta $d022
        sta $d023

        lda #$03                ; nothing sounds here: the dark is silent
        sta dieSt
        lda #$00                ; fire is not armed until it has been seen released
        sta dkArm
dshHld: rts
; ---- the held black: FIRE restarts the level ----
; Only once the close-up has gone (the user, 2026-11-03: "make fire restart the level, but only
; after the death-angel close-up disappears"), and only on a fresh press: a player who died with
; the button down -- carrying, reaching for an orb -- must not skip the black they are still
; holding it through. (RETURN restarted from anywhere until 2026-11-12, for testing; the user
; dropped it with the HUD. RESETNOW=n is the headless test's restart.)
; (A blind playtester sat at this black with only the joystick: "Fire did nothing ... A real
; player might sit at a black screen wondering if it crashed.")
dshFir: lda #$7f                ; SPACE's column: bit 4 is SPACE there, and joystick-1 FIRE pulls the same
        sta $dc00               ;   line whatever the column -- so either restarts, as either acts in play.
        lda $dc01               ;   (It was $ff, fire alone: a keyboard player -- EmulatorJS, 2026-11-13 --
        ldx #$ff                ;   sat at the black pressing SPACE, which looked exactly like a freeze.)
        stx $dc00               ; the port neutral again: the joystick reads elsewhere expect it
        and #$10
        bne dsfUp
        lda dkArm
        beq dshHld              ; still the press from before the black
        ldx #$ff                ; out of a jsr chain, so drop the stack first
        txs
        jmp entry
dsfUp:  lda #$01
        sta dkArm
        rts


; ---- orbUse: take the orb in front, or set the carried one down there ----
; ---- hlAt: is odX/odY a SOCKET? Y = its hole-like index, or $ff ----
; Exits are skipped: you cannot put an orb down a hole you are about to fall through.
hlAt:   ldy nExitT
hlAtL:  cpy nHoleT
        bcs hlAtNo
        tya
        clc
        adc nOrbT               ; hole-like entities follow the orbs in orbXCT/orbYCT
        tax
        lda orbXCT,x
        cmp odX
        bne hlAtN
        lda orbYCT,x
        cmp odY
        beq hlAtD
hlAtN:  iny
        bne hlAtL               ; always taken
hlAtNo: ldy #$ff
hlAtD:  rts

orbUse: lda carry
        bne orbPut
        jsr takePick            ; ---- pick up ----
        ldx odCell
        cpx #$ff
        bne okTake
        ; nothing loose adjacent, and nothing to take back: seating is one-way now, so a
        ; filled socket has nothing in it to retrieve.
        rts
okTake: inc blkVer              ; lifting an orb OPENS its cell -- a path may exist now
        lda #$01                ; out of the world, into the hands
        sta orbHidT,x
        lda orbYCT,x            ; and the cell it was standing in opens
        jsr mulW
        clc
        adc orbXCT,x
        tay
        lda #$00
        sta blkT,y
        inx
        stx carry               ; index + 1, so zero can mean empty
        txa                     ; the room takes the idol's colours while you hold it
        pha
        jsr idolLk
        jsr pedOff              ; ...and lifting one OFF a pedestal empties that pedestal
        pla
        tax


        lda #1
        jsr sfxPlay             ; the clink of it coming off the floor
        rts
orbPut: jsr dropPick            ; ---- put down ----
        ldx odCell
        cpx #$ff
        beq okDone              ; nowhere it could go: keep hold of it
        jsr hlAt                ; a socket? then it goes IN rather than on the floor
        cpy #$ff
        beq okPlain
        ldx carry               ; ...unless what you are holding is not an ORB. The idol is
        dex                     ;   luggage, not a key to a SOCKET: it is set down on a pedestal
        lda orbArtT,x           ;   and stands there, both sprites drawn, the idol simply raised
        bne okPlain             ;   onto the drum's top plane. Nothing is consumed and no art
        lda hlSeat,y
        bmi okPlain             ; already used (bit 7, CONSUMED, one-way): it is FLOOR now, so the orb
                                ;   is set down on it. It was okDone -- you kept hold of it, on a
                                ;   square that looked like any other (the user, level 2, 2026-11-13)
        ; ---- ONE WAY. The orb and the socket both leave the world. ----
        ; They used to seat: the orb stayed orbHidT and drew as a half-ball sitting in the dish,
        ; and you could take it back out. Neither survives the design -- an orb spent on a socket
        ; is spent, which is what makes it compete with its own use as a wall. So the socket is
        ; marked consumed and stops rendering, the orb is already hidden from the pickup and
        ; simply never returns, and sockHit says which one for whatever the level hangs on it.
        iny
        sty sokWho              ; index+1; the consume happens when the animation lands
        lda #$06
        sta sokAn               ; orb phase while sokAn >= SOK_SHR, socket closing at or below it
        lda #2
        jsr sfxPlay             ; ...and it is heard going in

        lda #$00
        sta sokVar
        ; sokCX is the orb's CENTRE, not its left edge. A sprite shrinks about its left edge, so
        ; walking obX directly made the ball drift left as it lost its expand bit -- 12 hires
        ; pixels of it, which is exactly "it goes to the left of the socket". The centre is walked
        ; and the half-width is taken off at draw time, where the variant's real width is known.
        lda #$b8   ; held, expanded: 48 wide, so centre = left + 24
        sta sokCX
        lda #$fc   ; and sokCY is the orb's BOTTOM, for the same reason: a
        sta sokCY                     ;   sprite shrinks about its TOP edge, so walking obY made
                                      ;   the ball climb 21 rasters as it lost its Y expand. Only
                                      ;   visible when the socket is nearly under you, because
                                      ;   otherwise the fall toward it hides the drift.
        lda sokLC               ; the socket's centre column -> hires centre, +24 for the border
        asl
        clc
        adc #$18
        sec
        sbc #$b8
        cmp #$80                ; /4, ARITHMETIC: cmp #$80 seeds carry from bit 7, so ror keeps
        ror                     ;   the sign. A plain lsr would send a leftward move rightwards.
        cmp #$80
        ror
        sta sokDX
        lda sokLY               ; the socket's top row is where the ball comes to rest
        sec
        sbc #$fc
        cmp #$80
        ror
        cmp #$80
        ror
        sta sokDY
        lda #$00
        sta carry               ; out of your hands from this instant; the animation owns it now
        rts
okPlain:inc blkVer              ; ...and setting one down closes a cell
        ; ---- pull the player off the cell boundary FIRST ----
        ; mvFree tests a box of radius 26 around the DESTINATION, so if the orb lands in a cell
        ; that box already reaches into, every single-frame move keeps reaching into it and is
        ; refused. A walk step is 4 per tick, about 12 a frame -- less than 26 -- so the player
        ; can never get out and is trapped for good. (Running is ~36 and does escape, which is
        ; why this only bit "once in a while".) dropPick tests blkT but never the player's own
        ; footprint, and the eight candidates are all NEIGHBOURS -- so clamping the fraction to
        ; [26,230] puts the whole box inside the player's own cell, which no candidate can be.
        ; At most 26/256 of a cell, and the integer part never changes, so the cell dropPick
        ; already chose stays the right one.
        lda px
        cmp #26
        bcs okpX1
        lda #26
okpX1:  cmp #230
        bcc okpX2
        lda #230
okpX2:  sta px
        lda py
        cmp #26
        bcs okpY1
        lda #26
okpY1:  cmp #230
        bcc okpY2
        lda #230
okpY2:  sta py
        ldx odCell              ; NOT the X orbPut loaded: hlAt walks the sockets through X on
        lda #$02                ;   its way here, so on any level WITH sockets the wall went to
        sta blkT,x              ;   a border cell and the angel walked straight through the
                                ;   orb (level 2, 2026-09-18, reported from play)
        ldx carry
        dex
        lda odX                 ; cell coordinates ARE the position, so it lands centred
        sta orbXCT,x
        lda odY
        sta orbYCT,x
        ldy orbIdolT,x          ; an IDOL remembers where you put it, because its cell
        bmi odNotI              ;   has to survive objInit on the next arrival -- see idolXT
        lda odX
        sta idolXT,y
        lda odY
        sta idolYT,y
        ; ---- ...and whether it is standing ON something ----
        ; hlAt answers "which hole-like entity is at odX/odY", and at or past nPedT that is a
        ; PEDESTAL. Asked once here, when the idol is set down, rather than per frame in the
        ; projection. It clobbers X, and X is the entity slot the caller still needs, so both
        ; it and the idol id go through the stack -- slot pushed first so the id comes back
        ; first, since the id is what the store below is indexed by.
        txa
        pha
        tya
        pha
        jsr hlAt                ; Y = the hole-like index at this cell, or $ff
        ldx #$00                ; assume it is standing on the floor
        cpy #$ff
        beq odPSt
        cpy nPedT
        bcc odPSt
        ; ---- WHICH pedestal, not just "a pedestal" ----
        ; Stored as the pedestal's index PLUS ONE, so 0 still means "on the floor" and the two
        ; other readers (the sprite lift, and idolPlace's blkT rule) keep working unchanged --
        ; both only ever ask zero / non-zero, and an idol up on ANY drum is lifted and does not
        ; block. Only pedGate cares which one, and it is the only place the puzzle is decided.
        tya                     ; hole-like index -> pedestal index
        sec
        sbc nPedT
        tax
        inx                     ; ...+1, so 0 stays "floor"
odPSt:  pla
        tay                     ; the idol id
        txa
        sta idolOnPedT,y
        jsr pedGate             ; ---- three idols on three pedestals opens the wall ----
                                ;   Clobbers X and Y; the entity slot comes back off the stack
                                ;   below, which is why the call sits inside the push/pull.
        pla
        tax                     ; ...and the caller's entity slot, back again
odNotI:

        lda #$00
        sta orbHidT,x
        sta carry
        txa                     ; ...and gives them back when you set it down
        pha
        jsr idolLk
        pla
        tax
        rts                     ; (its occluder mask was rebuilt here for the new cell: gone -- see occBy)

; ---- arcPrep: two bytes of animation, and where the arc bottoms out ----
; The profile is monotonic from centre to edge, so the boundary's lowest point on screen is always
; either the centre (inverted) or an edge (arch) -- no scan is needed to find arcHi.
arcPrep:ldx arcIx
        lda arcInv              ; the landing runs the crown's two speeds in the other order
        bne apL
        lda arcYT,x
        sta arcY
        lda arcET,x
        jmp apE
apL:    lda arcYT2,x
        sta arcY                ; the crown's pixel row
        lda arcET2,x            ; and the signed depth: + is an arch, - is inverted
apE:
        bpl apEP
        eor #$ff
        clc
        adc #$01
        ldx #$ff
        stx arcNg
        sta arcA
        lda arcY                ; inverted: the CENTRE is the lowest point
        jmp apH3
apEP:   ldx #$00
        stx arcNg
        sta arcA
        clc                     ; arch: the EDGES are
        lda arcY
        adc arcA
        bcc apH3
        lda #199
apH3:   cmp #200
        bcc apH4
        lda #199
apH4:   lsr
        lsr
        lsr
        clc
        adc #$01                ; first row that is entirely hole
        cmp #26
        bcc apHok
        lda #25
apHok:  sta arcHi
        ; ---- and the top of the arc, which is where charset A has to come back ----
        lda arcSkip             ; the landing sets both splits itself, from its own tables
        beq apTop
        rts
apTop:  lda arcNg               ; inverted: the EDGES are highest; arch: the crown is
        beq apT1
        lda arcY
        sec
        sbc arcA
        bcs apT2
        lda #$00
        beq apT2
apT1:   lda arcY
apT2:   lsr
        lsr
        lsr                     ; -> character row
        cmp #26                 ; CLAMP FIRST. arcY is 255 while the arc is off the foot, which
        bcc apT2b               ;   gives row 31 -> 248 -> +50 = 298, and that wrapped to 42:
        lda #25                 ;   below pSplit, so the clamp collapsed region B to nothing and
apT2b:  asl                     ;   drew the whole lower screen in charset A.
        asl
        asl
        clc
        adc #50
        cmp pSplit              ; never ABOVE the horizon split -- which now MOVES. With the arc
        bcs apT3                ;   up there the scene below is entirely covered by hole, which is
        lda pSplit              ;   mirror-invariant, so collapsing region B to nothing is right
apT3:   cmp #246
        bcc apT4
        lda #246                ; off the foot: region B runs to the bottom. NOT 250 -- the
                                ;   buffer flip spins on that line and a split IRQ there costs
                                ;   it a whole frame. Third time; see [[iray-fall]].
apT4:   sta pSplit2
        sec                     ; ...and the same line as a character ROW, because that is where
        sbc #50                 ;   the fill has to change from charset B's code to the arc
        lsr                     ;   block's: region 3 begins here, and a column whose rim is lower
        lsr                     ;   than the crown has fill rows sitting below the split. Taken
        lsr                     ;   from the CLAMPED pSplit2, not the raw arc row, or the two
        sta arcTopR             ;   disagree exactly when the clamps fire.

        rts


; ---- arcBand: the arc at PIXEL resolution, out of the existing ramp dictionary ----
; A character cell gets the ramp whose left and right endpoints match the boundary's height at
; that cell's two edges: rampThi[wL*16 + wR], level counted in pixels UP FROM THE CELL FLOOR, so
; level = 8 + 8*row - px. The dictionary already carries every endpoint pair over CLO..CHI, and
; the arc's steepest cell changes by 5px, so nothing new had to be fitted -- see [[iray-fall]].
; NO BANK SWITCH IS NEEDED: the rim is floor-above/hole-below whichever way it curves, which is
; charset A's polarity, and the whole screen is parked in A for the drop. Rows below the glyph are
; solid hole; rows above it were filled BLANK already.
arcBand:ldy #$00
        jsr arcPx
        sta apPrev
        ldy #$01
abLp:   jsr arcPx
        sta apCur
        clc                     ; the cell is placed by the MIDPOINT of its two edges, which keeps
        adc apPrev              ;   both endpoints inside CLO..CHI even on the steepest cell
        ror                     ;   (9-bit average: the carry is bit 8)
        lsr
        lsr
        lsr
        sta apRow
        asl
        asl
        asl
        sta apBase              ; 8*row
        lda apPrev
        jsr arcLvl
        asl
        asl
        asl
        asl               ; hi<<4 | lo: packing two 4-bit LEVELS, not a cell
        sta apIdx
        lda apCur
        jsr arcLvl
        ora apIdx
        tax
        ; ---- the two DEGENERATE ends, which rampThi does not define ----
        ; rampThi is only valid for a cell the boundary actually CROSSES. On screen rbv/rsv
        ; classify blank and solid cells out before the chooser ever sees them ("rfEdgeL is
        ; ONLY valid for a cell holding the boundary"); arcBand has no such filter and asks it
        ; about every column. At the arc's flat crown every column lands on the same degenerate
        ; entry -- and those entries are NOT blank and solid. The k-medians charset's nearest
        ; glyph to "no wall" is 34, which is one pixel in the cell's corner, and to "all wall"
        ; is 20, which is one pixel MISSING from it. So a run of them draws a DOTTED LINE: dark
        ; dots at one end, light dots at the other. Measured at landing frame 12, columns 16..23
        ; all had pxL = pxR = 48 with apRow 6 -> index $33 -> code 34 -> eight dots 8px apart.
        ; Both answers are polarity-independent: a cell the rim misses is floor either way
        ; (BLANK is fdCol on the drop and arcBlw on the landing), and one it has passed is hole.
        lda rampThi,x           ; BOTH phases draw their rim from an arc block now, and the two
        tax                     ;   sets share code numbers, so one map serves them: the block
        lda arcMap,x  ;   differs, not the code. The degenerate ends translate with the
        bne abSet               ;   33 real ones -- a cell the rim missed is ground, one it has
        lda rampThi,x           ;   passed is the hole. (always taken: ARC_C0 is not zero)
        cmp #$01                ;   (see rampThi's build). A cell the rim misses is floor in
        bne abNS               ;   BOTH polarities and a cell it has passed is the HOLE,
        lda #$f8              ;   not wall ink, so that one answer has to be translated.
        bne abSet               ; always: VOIDCH is never 0
abNS:   cmp #$00                ; ...and so does the floor, once it is a code of its own
        bne abSet               ;   rather than BLANK -- see FDGND
        lda #$f9
abSet:  sta apCode
        ldx apRow               ; screen address = base + 40*row + column, column = Y-1
        tya
        sec
        sbc #$01
        clc
        adc mul40LoT,x
        sta fdS
        lda mul40HiT,x
        adc baseHi
        sta fdS+1
        sty apY
        ldy #$00
        lda apRow               ; ---- and only if this column's rim is ON the screen ----
        cmp #25                 ; apRow is a pixel midpoint shifted right three, so it reaches
        bcs abNx                ;   31 while the arc is still below the foot. mul40T has no such
                                ;   row, so the address above is off the end of it and the store
                                ;   goes wherever that lands -- four dots in the top right, and
                                ;   only in one of the two buffers, which is why they flicker.
        lda apCode
        sta (fdS),y
        lda arcHi               ; and solid hole from the row below it down to arcHi
        cmp #25                 ; ...but no further than the screen: arcHi is off the foot while
        bcc abHOk               ;   the arc still is, and this walk adds 40 a row with nothing to
        lda #25                 ;   stop it -- the stray black line low on the right in dots-2.
                                ;
                                ; TWENTY-FIVE, not 24, and the difference is one frame of one
                                ; row. The loop below fills apRow+1 .. A-1, leaving row A itself
                                ; to the incremental pass -- which is right while the arc's foot
                                ; is ON screen, because that pass owns the rows the arc has just
                                ; vacated. But on the FIRST frame the rim reaches row 24, arcHi
                                ; is still 25: the foot is off the bottom, so the incremental
                                ; pass computes phA - arcHi = 25 - 25 = 0 and fills nothing,
                                ; while a clamp of 24 stopped this loop at row 23. Row 24 then
                                ; kept the band fill from ABOVE the rim -- BLANK on the drop and
                                ; VOIDCH on the landing, i.e. the floor's ink where the hole's
                                ; belonged. Visible as exactly four pixels, because 24-row mode
                                ; shows only the top half of row 24, and gone on the next frame,
                                ; when arcHi comes on screen and the incremental pass takes over.
                                ; With 25 the count is 24 - apRow, so the fill runs to row 24
                                ; INCLUSIVE and stops there; at apRow 24 it is 0, as it must be.
abHOk:  sec
        sbc apRow
        bcc abNx
        beq abNx
        sec
        sbc #$01
        beq abNx
        tax
abW:    clc
        lda fdS
        adc #40
        sta fdS
        bcc abW1
        inc fdS+1
abW1:   lda arcBlw
        sta (fdS),y
        dex
        bne abW
abNx:   ldy apY
        lda apCur
        sta apPrev
        iny
        cpy #41
        bcc abLp
        rts

fdFill: sta fdN                 ; A rows of black, advancing the destination only
        cmp #$00                ; explicit, not inherited: a zero count here would run the
        beq fdfDn              ;   dec/bne loop 256 times and blit 10KB over the program
fdfRow: lda fdCol
        ldy #39
fdfB:   sta (fdD),y             ; the same four-way unroll: 11 cycles a byte down to 8.75
        dey
        sta (fdD),y
        dey
        sta (fdD),y
        dey
        sta (fdD),y
        dey
        bpl fdfB
        clc
        lda fdD
        adc #40
        sta fdD
        bcc fdfS
        inc fdD+1
fdfS:   dec fdN
        bne fdfRow
fdfDn:  rts


; ---- hlSet: point holeTail at one hole-like entity's ladder, and pick up its ink ----
; A = index into HOLELIKE. Exits come first, so anything at or past the exit count is a socket.
; The six operands only need re-patching when the KIND changes, and a frame is normally one exit
; then a run of sockets -- so this is two patch runs a frame, not one per entity.
hlSet:  tay
        cpy nExitT
        bcs hlSsock
        lda hlFillT,y           ; an exit hole: its level's fill colour (black on most levels)
        sta hlFill
        lda #$00
        beq hlSk                ; always taken
hlSsock:lda hlFillT,y           ; grey3 inside a grey1 rim. hlSeat is a CONSUMED flag and
                                ;   nothing but bit 7 of it is read any more
        sta hlFill
        lda #$01
        ; ---- THERE IS NO "SEATED" KIND ----
        ; There was: hlSeat bit 7 picked a second ladder that drew a half-ball sitting in the
        ; dish. Nothing has reached it since seating became one-way -- the entity loop skips a
        ; consumed socket outright ("lda hlSeat,y / bmi hoNx") before hlSet is ever called, and
        ; kinds 2 and 4 were byte-for-byte copies of 1 and 3 anyway. It would have read
        ; orbColT2+15 if it ever ran, $ff's low nibble being 15.
        ; The pedestal does not want one either: an idol set down on one keeps its own sprite
        ; and is simply RAISED onto the drum's top plane. No new art, just a y offset.
        ; Kinds are 0 exit, 1 socket, 2 pedestal. Pedestals sit past the sockets in HOLELIKE,
        ; so ONE boundary byte tells them apart and +1 lands on the pedestal kind.
hlSped: cpy nPedT
        bcc hlSk
        clc
        adc #$01
hlSk:   cmp hlKind
        beq hlSdn               ; already pointed the right way -- the usual case
        sta hlKind
        ; ---- point the six operands at this kind's ladder ----
        ; Three near-identical patch blocks were 175 bytes of code; this is a table of the five
        ; base addresses per kind and one run of stores. BOTH bytes of every operand, because
        ; the table sets are emitted next to each other and may straddle a page.
        tax
        lda hlVisL,x            ; where this kind's rung -> rows table lives, for occStamp's box
        sta hlVB+1              ;   -- low byte only, see hlVisL
        ldy hlK5T,x             ; seven entries a kind
        lda hlSrcL,y
        sta hlRung+1
        lda hlSrcH,y
        sta hlRung+2
        lda hlSrcL+1,y
        sta hlYB+1
        lda hlSrcH+1,y
        sta hlYB+2
        lda hlSrcL+2,y
        sta hlPtr+1
        lda hlSrcH+2,y
        sta hlPtr+2
        lda hlSrcL+3,y
        sta hlFlg+1
        lda hlSrcH+3,y
        sta hlFlg+2
        lda hlSrcL+4,y
        sta hlXO1+1
        sta hlXO2+1
        lda hlSrcH+4,y
        sta hlXO1+2
        sta hlXO2+2
        lda hlSrcL+5,y          ; the probe's box: the inked extent left and right of ocol
        sta hlBXL+1
        lda hlSrcH+5,y
        sta hlBXL+2
        lda hlSrcL+6,y
        sta hlBXR+1
        lda hlSrcH+6,y
        sta hlBXR+2
hlSdn:  rts

; ---- holeTail: the hole's half of orbOne, entered with ohgt and ocol already computed ----
; Up to three sprites side by side holding one ellipse. Occluded like every other entity: the probe
; below drops it when its INK is wholly behind walls, and otherwise occStamp clips it where a wall
; is in front (exits included -- they stopped being the wall's own black when level 4 coloured them).
holeTail:
        ; ---- FULLY OCCLUDED? ASK THE TEST THE ORBS AND THE ANGEL ALREADY USE ----
        ; The zones (mapT's mask) are the only other occlusion a hole gets, and they are per CELL:
        ; a zone counts as seen if it is visible from ANYWHERE in the player's cell. Deliberately a
        ; superset (as holeSeeT, which they replaced, was), so a hole stays drawn from a spot in the
        ; cell with a wall squarely in front of it. The real test is the span walk in orbOne, and
        ; holes were once excluded from it only because they had no occluder mask.
        ldx ohgt                ; h; the rung comes straight out of a page-aligned table. This was a
hlRung: jsr hlRungH             ; PATCHED: hlRungH reads the hole's 256-byte h -> rung table,
                                ;   hlRungS scans the socket's 10 rungs
        cmp #$ff                ;   ~600 cycles a frame, which is a sixth of what the whole
        beq orbNo               ;   hole costs to draw.
        tax                     ; X = rung, and it indexes every table below
        ; ---- closing on a swallowed orb? walk this socket down its own ladder ----
        ; Rungs run nearest-first, so ADDING to the index shrinks it. Overlaps the orb's last
        ; frame by one, which is what makes the two read as one motion rather than two events.
        lda sokAn
        beq hlNoShr
        cmp #$04
        bcs hlNoShr             ; still the orb's part of the animation
        lda oidx                ; ...and only the socket actually doing the swallowing
        sec
        sbc nOrbM1T             ; hole-like index + 1, which is what sokWho holds
        cmp sokWho
        bne hlNoShr
        lda #$03
        sec
        sbc sokAn               ; 0, 1, 2 ... as it closes
        tay
        txa                     ; the rung it would have drawn at...
        clc
        adc sokShrT,y           ; ...pushed down the ladder. A TABLE, not a shift: the step is 3
        cmp #$0a   ;   here and shifting only ever multiplies by a power of two
        bcc hlShrX
        lda #$09   ; never past the smallest rung it has
hlShrX: tax
hlNoShr:
        ; ---- FULLY OCCLUDED? ASK THE TEST THE ORBS AND THE ANGEL ALREADY USE ----
        ; The zones (mapT's mask) are the only other occlusion a hole gets, and they are per CELL:
        ; a zone counts as seen if it is visible from ANYWHERE in the player's cell. Deliberately a
        ; superset (as holeSeeT, which they replaced, was), so a hole stays drawn from a spot in the
        ; cell with a wall squarely in front of it.
        ;
        ; THE BOX IS THIS RUNG'S OWN WIDTH. Two earlier versions of it were wrong in opposite
        ; directions, and both were visible:
        ;   - ONE COLUMN at ocol culled the entity the instant its CENTRE crossed a wall edge,
        ;     with up to 24 columns of socket still showing ("it disappears quite a long way
        ;     before it's actually behind the wall", X4ED Y6FC ADEC0 against X4F9 Y707 ADEC0).
        ;   - ocol +/- HL_HALFMAX, the widest half-width ANY kind has, asked about a box twelve
        ;     times too big for a far socket and kept finding a visible column long after the
        ;     thing was buried ("stamping long after it's fully occluded", X4F3 Y855 AD740).
        ; The reasoning the one-column version inherited -- "a hole is the wall's own colour, so
        ; partial occlusion needs no handling, it melts into the wall" -- dates from when an exit
        ; hole was always BLACK. Sockets and exits are both in the FLOOR and neither melts into
        ; anything now that level 4 gives an exit a fill colour.
        ;
        ; This is why the probe lives HERE and not above hlRung, where it used to: the rung is
        ; only final after the shrink, and the half-width is a per-kind table. ocl2 is free until
        ; hlVst, three instructions down, which is the one window where both are true.
hlBXL:  lda holeBoxLT,x         ; PATCHED by hlSet: how far this rung's INKED pixels reach left of
        sta o2                  ;   ocol -- not the sprite frame (see holeExtT in the build)
hlBXR:  lda holeBoxRT,x         ; PATCHED by hlSet: ...and right of it
        sta o2r
        ; THE SAME BOX CODE AS orbOne (emitBox). This used to skip the probe whenever the centre was
        ; off either edge, so a disc just off-screen with its visible part behind a wall was never
        ; culled; now an off-screen centre is boxed like any other, and nothing on screen is dropped.
        ; The box is also what holeSlot clips each slice's stamp to (hbL/hbR).
        lda ocolN
        bne hlBLn
        lda ocol
        sec
        sbc o2
        bcs hlBL1
        lda #$00                ; straddles column 0 from the right: lo is 0
        jmp hlBL2
hlBLn: lda o2r                ; centre LEFT of 0: the box ends at R - ocol...
        sec
        sbc ocol
        bcc hlBLx              ; ...and if that borrows, nothing of it is on screen
        lda #$00
        jmp hlBL2
hlBLx: jmp orbNo
hlBL1: cmp #$a0        ; starts past the last column: entirely off the right (rejecting,
        bcc hlBL2              ;   not clamping -- a clamp turns "not on screen" into "column 159")
        jmp orbNo
hlBL2: sta ocl2
        sta hbL
        lda ocolN
        bne hlBRn
        lda ocol
        clc
        adc o2r
        bcc hlBR1
        lda #$9f
        jmp hlBR1
hlBRn: lda o2r                ; centre left of 0: the L test proved R >= ocol, so no borrow
        sec
        sbc ocol
hlBR1: cmp #$a0
        bcc hlBR2
        lda #$9f
hlBR2: sta ocmax
        sta hbR
        txa
        pha                     ; occWalk clobbers X, and the rung indexes every table below
        lda #$00
        sta ovVis
        sta ovOcc
        lda #$01
        sta ovProbe             ; probe: the walk returns instead of drawing or rejecting
        jsr occWalk
        lda #$00
        sta ovProbe
        lda ovVis
        bne hlOcSk
        pla                     ; nothing of it shows: balance the stack, then drop the entity
        jmp orbNo
hlOcSk: pla
        tax                     ; the rung, back where everything below expects it
        ; ---- how many rows this rung covers, resolved NOW while the rung is still in X ----
        ; holeSlot is called once per slice and takes X for the slot, so the rung is gone by the
        ; second slice; looking it up there would read a slot number as a rung and box the stamp
        ; at the wrong height. ocl2 is dead from here to the end of the entity -- the probe above
        ; was its last reader -- so it carries the answer rather than costing a byte of its own.
        ; 0 means "do not stamp this one": every real rung covers at least one row.
hlVB:   lda sockVisT,x          ; PATCHED by hlSet to this kind's table. EVERY kind has one
                                ;   now, the exit hole included -- see exitVisT.
hlVst:  sta ocl2
hlYB:   lda holeYBaseT,x        ; PATCHED. The TOP row is the ellipse's FAR edge, 100+88/(d+r),
        clc                     ;   so the base folds in the offset from h that the rung implies
        adc ohgt
        bcs orbNo
        cmp #251
        bcs orbNo               ; top past the last visible raster line
        sta o3
        ; Remember where the last SOCKET was drawn. The swallow animation flies the orb to it, and
        ; by the time that starts the socket is the cell you are facing -- so it was drawn this
        ; frame and these are current. ocol is the 160-column grid; doubling gives the sprite X.
        lda oidx
        cmp nSockT
        bcc hlNoSk              ; an exit hole, not a socket
        lda ocol
        sta sokLC
        lda o3
        sta sokLY
hlNoSk:
hlPtr:  lda holePtrT,x          ; PATCHED
        sta ohP
hlFlg:  lda holeFlagT,x         ; PATCHED
        sta ohF                 ; bits 0-1 sprite count, bit 2 hmag, bit 3 vmag
        and #$03
        sta ohT                 ; 1, 2 or 3 sprites side by side, holding ONE ellipse
        sta ohtmp               ; the hole takes its slots from the TOP, so what it needs is room
        lda onvH                ;   between the two allocators, not room below eight
        sec
        sbc ohtmp
        cmp onv
        bcc orbNo               ; would need a slot the orbs already hold: draw none of it,
                                ;   a hole missing its right-hand third reads as a wall, not a
                                ;   hole. Checked HERE and not at the call site, which cannot
                                ;   know the rung until the projection has run.
        lda ohF
        and #$04
        beq ohNoMc
        lda #24                 ; hmag: each sprite covers 24 columns rather than 12
        bne ohSetC              ; always taken
ohNoMc: lda #12
ohSetC: sta ohWc
        ; ---- where the leftmost sprite goes, and which sprites are worth placing ----
        ; b = the pair's start column + 12, because sprite X is 2*column + 24. This used to
        ; reject the whole hole the moment b went negative, which threw away a hole that was
        ; still most of the way on screen -- a 48-column one vanished while 35 of its columns
        ; were still visible. A sprite cannot start left of X=0, but the ones to its RIGHT can
        ; still be placed: drop leading sprites until the leftmost fits, and draw the rest.
        ; ---- b = this sprite's column + 12, kept SIGNED and 16-bit ----
        ; SPRITE X WRAPS. It is a 9-bit compare against a counter that also wraps, so a sprite
        ; placed near 512 starts late in the line, the counter rolls over, and the rest of it
        ; draws at the left of the SAME line. That makes a negative column exact rather than
        ; impossible: for a slice starting at column s, its pixel c lands at 2(s+c)+24 mod 512,
        ; which is display column s+c. So asl on the two's-complement byte IS the right X,
        ; and nothing needs dropping for being off the left -- it either shows its visible part
        ; or falls in the right border where nobody sees it.
        lda ocolN
        beq ohXP
        lda ocol                ; the centre sits ocol columns LEFT of column 0
        clc
hlXO1:  adc holeXOffT,x         ; PATCHED
        cmp #$48       ; no frame is wider than HOLE_FRAME_MAX, so a left edge that far off
        bcs orbNo               ;   puts even the pair's right edge off the screen
        sta tmp
        lda #$0c
        sec
        sbc tmp                 ; b = 12 - (ocol + half)
        jmp ohXS
ohXP:   lda ocol
        sec
hlXO2:  sbc holeXOffT,x         ; PATCHED. s = ocol - half, the pair's start column
        bcs ohXPP               ; s >= 0
        clc                     ; s < 0: b = s + 12, and the carry OUT of this add is a real
        adc #$0c                ;   sign flag, because it says the sum crossed back through 0
        jmp ohXS
ohXPP:  cmp #$a0
        bcs orbNo               ; the pair starts right of the last column
        clc
        adc #$0c                ; b = s + 12, which cannot be negative on this path -- so force
        sec                     ;   the flag. Taking the carry from the ADD instead marked every
                                ;   on-screen hole as negative (adc only carries past 255), the
                                ;   loop took the off-the-left branch, and nothing was ever
                                ;   placed: the hole vanished from the start position entirely.
ohXS:   sta ohBL                ; carry now says whether b came out non-negative
        lda #$00
        bcs ohXH
        lda #$ff                ; sign-extend: the loop below tests bH, not bit 7 of bL,
ohXH:   sta ohBH                ;   because b runs to 249 and bit 7 would be ambiguous there
ohXok:  ; ---- place each slice that has any of its box on screen, and only those ----
        ; Each is judged on ITS OWN column span, not on whether the leftmost one fits. Off the
        ; left it is still placed, because the X wrap draws its visible part correctly; only a
        ; slice with no visible column at all is skipped, and one entirely off the RIGHT ends
        ; the loop since every slice after it is further right still.
ohLp:   lda ohBH
        bmi ohLL                ; b < 0: off the left, or partly so
        bne ohDone              ; b >= 256: off the right, and so is everything after it
        lda ohBL
        cmp #$ac           ; b is the column + 12, so this is column NLOG or beyond: same
        bcs ohDone
        jmp ohPl
ohLL:   clc                     ; b < 0: visible only if b + cols reaches column 0, i.e. 12
        lda ohBL
        adc ohWc
        bcc ohNx                ; still negative even a whole slice later: nothing shows
        cmp #13
        bcc ohNx
ohPl:   lda ohBL                ; X = 2b as a 9-bit value. For negative b the two's-complement
        asl                     ;   byte shifts straight into the wrapped X the VIC wants.
        sta o0
        lda #$00
        rol
        sta o1
        jsr holeSlot
ohNx:   dec ohT
        beq ohDone
        inc ohP                 ; the slices are consecutive slots by construction, so the
        clc                     ;   pointer walks and only the column advances
        lda ohBL
        adc ohWc
        sta ohBL
        lda ohBH
        adc #$00
        sta ohBH
        jmp ohLp
ohDone: rts

; holeSlot: give o0/o1 (X), o3 (Y) and ohP to the next free sprite slot -- counting DOWN from 8.
; The hole lies flat on the floor, so nothing can be behind it: anything further away is higher up
; the screen and cannot overlap, and anything nearer must be in front. Lowest VIC priority is
; therefore always right, and it stops the hole painting over an angel standing beyond it.
holeSlot:
        dec onvH
        ldx onvH
        lda orbBitT,x
        sta omBit
        ora omEn
        sta omEn
        ; ---- priority: EARNED by stamping; blanket only for a slot that will not be stamped ----
        ; A stampable slot (ocl2 = its rows, non-zero -- every kind now, exits included since they
        ; stopped being the wall's own black) gets the $d01b bit from occStamp, and only on slots it
        ; actually stamped -- which also keeps the de-seam sweep honest, since that sweep fires on
        ; exactly this bit and would otherwise strip seams around every hole-like on screen. A slot
        ; with no rows (ocl2 = 0) would have no other occlusion, so it goes behind foreground here.
        lda ocl2
        bne ohNoPri
        lda omBit
        ora omPri               ; behind foreground: a wall in front of the hole has to win, and
        sta omPri               ;   the floor it lies in is background, so it still draws there
ohNoPri:lda ohP
        sta obP,x
        lda hlFill              ; bit pair 10 is the per-sprite colour: the ONE ink that can
        sta obC,x               ;   differ per sprite, and so the whole difference between a pit
                                ;   and a socket. Set from hlFillT by hlSet.
        sta obOcc,x
        lda oidx                ; and MARK THE SLOT as a hole, so occStamp can tell. It fills no
        sta obIX,x              ;   stamp state at all, and it no longer sits reliably at the end
                                ;   of the list where a count could fence it off. obOcc is not
                                ;   enough: the gate that reads it is behind ORBGATE, which is
                                ;   OFF by default -- so the stamp was walking these slots with
                                ;   a stale obL/obR and scribbling occluders over a garbage cell
                                ;   range. 29,510 cycles for a hole that costs 2,400 to project.
        ; ---- ...and a SOCKET fills that stamp state in, so occStamp treats it as an orb ----
        ; Same span walk, same per-run facing test (occBy), same edge glyphs. That is what gets a
        ; socket clipped at a cell edge by the corner in front of it, instead of the whole thing
        ; blinking out the moment its CENTRE column goes behind a wall.
        lda ocl2
        beq hsNoSt              ; 0: do not stamp (every kind has a rows table now, exits included)
        sta obV,x               ; the rows this slice covers -- occStamp's box, straight out of
                                ;   the slot, where an orb's comes from orbAnchT by variant
        lda #$80
        sta obOcc,x             ; conservative: "may have an occluder", as for every orb
        ; This slice's own columns, s .. s+ohWc-1, clipped to the screen -- and each slice is
        ; judged separately, because each is its own sprite. b is s+12 and (ohBH:ohBL) carries
        ; it SIGNED: b >= 0 does not mean s >= 0, since the twelve columns of the offset can
        ; still be hanging off the left edge.
        lda ohBL
        sec
        sbc #$0c
        sta ocmax               ; s, low byte -- kept for the right edge below
        lda ohBH
        sbc #$00
        sta ohtmp               ; s, high byte: $00 or $ff. Dead since the slot check above.
        bmi hsL0                ; s < 0: the HIGH byte is the only honest sign test
        ; The screen is 160 COLUMNS WIDE, so columns 128-159 have bit 7 set and a bpl on the
        ; low byte reads every one of them as negative. This clamped obL to 0 for any slice on
        ; the right third of the screen, and the stamp row then ran from column 0 to the slice's
        ; real right edge -- the whole screen. Visible wherever a cell along that bogus span was
        ; a wall-base ramp rather than wall or blank: a black bar on the floor, nowhere near the
        ; entity, with nothing to occlude (the user, 2026-10-01, at X444 Y63F ADE00, s = 141).
        ; The sign already lives in ohtmp and the bmi above has used it; the second test only
        ; has to fence off a slice that starts off the RIGHT edge.
        lda ocmax
        cmp #$a0
        bcc hsLst               ; 0..NLOG-1: a real column, bit 7 and all
        bcs hsDrop              ; >= NLOG: the slice starts past the right edge, nothing to stamp
hsL0:   lda #$00                ; s < 0: the visible part starts at column 0
hsLst:  sta obL,x
        lda ocmax
        clc
        adc ohWc
        tay                     ; s + width, low
        lda ohtmp
        adc #$00
        bmi hsDrop              ; the whole slice is still left of column 0
        bne hsRhi               ; ...or past 255, so it ends at the right edge
        cpy #$00
        beq hsDrop              ; s + width == 0: it ends exactly at column -1
        dey                     ; the LAST column, not one past it
        cpy #$a0
        bcc hsRst
hsRhi:  ldy #$9f
hsRst:  tya
        ; ---- CLIP TO THE INK: stamp only the columns where this slice can have drawn something ----
        ; The slice is a 12- or 24-column sprite, and around a far ellipse most of it is blank. The
        ; stamp only ever writes cells that are already wall, so stamping the blank part was never
        ; WRONG -- it was occluder work for pixels that do not exist.
        cmp hbR
        bcc hsC1
        lda hbR                 ; the slice runs past the ink's right edge
hsC1:   sta obR,x
        lda obL,x
        cmp hbL
        bcs hsC2
        lda hbL                 ; ...or starts left of its left edge
        sta obL,x
hsC2:   lda obR,x
        cmp obL,x
        bcc hsDrop              ; no inked column in this slice at all: no stamp claim for it
        ; ---- ...and the same range in CELLS, for oSDeseam ----
        ; occStamp de-seams any slot whose priority bit it set, over obCL..obCR -- which only orbOne
        ; used to write. A stamped hole-like slot (they count down from 8) therefore de-seamed
        ; whatever cell range an ORB last left in that slot. obR >= obL here, so the cells are ordered.
        lsr
        lsr
        sta obCR,x
        lda obL,x
        lsr
        lsr
        sta obCL,x
        jmp hsNoSt              ; OVER the retract below. This is the SUCCESS path and it used to
                                ;   fall straight into hsNoSt; dropping hsDrop in front of that
                                ;   label put the retract in its way, so every correctly placed
                                ;   socket cleared its own obOcc and NOTHING was stamped at all
                                ;   (the user, 2026-10-01). A label does not stop a fall-through,
                                ;   and the stranded-instruction lint cannot see one that lands
                                ;   on a label -- only a test for a stamp that SHOULD appear can.
hsDrop: lda #$00                ; RETRACT the stamp claim. obOcc bit 7 is the only thing that
        sta obOcc,x             ;   makes occStamp walk a hole-like slot, and it is set well
                                ;   above -- BEFORE the clipping tests that land here. Falling
                                ;   through with it still set left the slot carrying a half
                                ;   written obL (0, from the left clamp) and an obR stale from
                                ;   the previous frame: a one-cell occluder at column 0 for a
                                ;   socket entirely off the left edge (the user, 2026-10-01, at
                                ;   X46E Y7DC AF6C0). The exit-hole early-out above must NOT
                                ;   come here -- it jumps straight to hsNoSt, because for a hole
                                ;   obOcc still holds the fill colour hlSet put there.
hsNoSt:
        lda ohF                 ; the two magnifications are decided SEPARATELY, from the
        and #$04                ;   ellipse's own visible width and height -- which is what lets
        beq ohNoX               ;   a near rung be 48 columns wide and 33 rows tall on two
        lda omBit               ;   sprites, and is why no bitmap can be shared between rungs
        ora omXX                ;   the way the orb ladder shares them across the expand bit
        sta omXX
ohNoX:  lda ohF
        and #$08
        beq ohNoY
        lda omBit
        ora omYY
        sta omYY
ohNoY:  lda o0
        sta obX,x
        lda o3
        sta obY,x
        lda o1
        beq ohNo8
        lda omBit
        ora omX8
        sta omX8
ohNo8:  rts
; oAddS: o2:o1:o0 += o3:ogH:ogL (orbProj's height, above)
oAddS:  clc
        lda o0
        adc ogL
        sta o0
        lda o1
        adc ogH
        sta o1
        lda o2
        adc o3
        sta o2
        rts
kSgn:   bmi kSgN
        lda #$00
        rts
kSgN:   lda #$ff
        rts

; oTmC / oTmS: Y * |cos| (or |sin|) as a 16-bit product in orL/orH, negated if A is negative.
; Y is a cell difference's magnitude and |cos|/|sin| are this FRAME's, so the products are a short
; table of multiples, not a multiply each (2026-10-14: four mul8s an entity, ~95 cycles each with the
; sign handling; level 9's final room projects eight). The table grows only as far as an entity
; asks -- omTrig resets it when the angle changes, so a spin past one orb builds a few entries, not
; MULN. Exact: the same integer products the mul8s gave.
oTmC:   cpy mcN
        bcc oTmC1
        jsr mcGrow
oTmC1:  pha
        lda mcLoT,y
        sta orL
        lda mcHiT,y
        jmp oTmN
oTmS:   cpy mcN
        bcc oTmS1
        jsr mcGrow
oTmS1:  pha
        lda msLoT,y
        sta orL
        lda msHiT,y
oTmN:   sta orH
        pla
        bpl oTmD
        sec
        lda #$00
        sbc orL
        sta orL
        lda #$00
        sbc orH
        sta orH
oTmD:   rts
; mcGrow: extend both tables through entry Y, each from the last by one addition. Keeps A and Y.
mcGrow: pha
        sty mcY
        ldx mcN
mcGL:   clc
        lda mcLoT-1,x
        adc ocos
        sta mcLoT,x
        lda mcHiT-1,x
        adc #$00
        sta mcHiT,x
        clc
        lda msLoT-1,x
        adc osin
        sta msLoT,x
        lda msHiT-1,x
        adc #$00
        sta msHiT,x
        cpx mcY                 ; C set once the entry just built is Y's...
        inx                     ;   (inx leaves C alone)
        bcc mcGL
        stx mcN                 ; ...and now Y+1 entries are valid
        pla
        rts
mcY:    !byte 0
mcN:    !byte 1                 ; entries valid in the tables below; entry 0 is 0, always
mcLoT:  !fill 32, 0             ; i * |cos|, this frame
mcHiT:  !fill 32, 0
msLoT:  !fill 32, 0             ; i * |sin|
msHiT:  !fill 32, 0
omCs:   !byte $ff,$ff           ; the |cos|,|sin| the tables were built for

; oFrac: (signed A * unsigned X) >> 8, negated if Y is $ff. A is 0.5 minus the player's
; fractional position, so the result is the shared fractional term of one product -- and it
; always fits a signed byte, since |A| <= 128 and X <= 255.
oFrac:  stx mq
        sta tmp
        cmp #$00                ; STA does not set flags -- without this the branch tested
        bpl ofP                 ; whatever the caller's ldy left, so a negative offset was
                                ; multiplied as its unsigned byte and never negated
        eor #$ff
        clc
        adc #$01
        tya
        eor #$ff
        tay                     ; A was negative: flip the sign we were handed
        lda tmp
        eor #$ff
        clc
        adc #$01
ofP:    sty tmp2
        jsr mul8
        lda tmp2
        bpl ofD
        sec
        lda #$00
        sbc phi
        rts
ofD:    lda phi
        rts

; |a| with the sign kept aside, so every product below can be done unsigned and negated once.
oabs:   lda #$00
        sta oaS
        lda oaH
        bpl oabsD
        lda #$ff
        sta oaS
        sec
        lda #$00
        sbc oaL
        sta oaL
        lda #$00
        sbc oaH
        sta oaH
oabsD:  rts

; ---- mulW: A = row -> A = row * MAPW ----
; A power-of-two width is four asl and an ora; anything else needs a real multiply, and a table
; of MAPH entries is both smaller and faster than shift-and-add. Y is saved because the callers
; are spread across the cast, the collision test, the entity code and the BFS, and several hold
; a live Y across the call.
mulW:   sty mulWY
        tay
        lda rowMulT,y
        ldy mulWY
        rts
   ; from the MANIFEST: the live level's stride

; sideT / idT / colH are per-frame mutable arrays in scratch RAM (see their equates)
dataEnd:                        ; guard: must clear both screen buffers AND the charset -- see the layout check in build-iray.mjs

; The charset is NOT in the image. It is its own disk file, ICHR, loaded straight to $c000
; (CHARSET, plain RAM in VIC bank 3); cpChr derives charset B from it.

; connected-wall-run id tables (indexed by cell id) live above the f-tables in free RAM

; charset B has NO source: cpChr derives it from A with an EOR #$07 on the row index. fontB is
; still built in JS -- charsetgen and the readout glyph checks compare against it -- but nothing
; is emitted, which is the point: it was a permutation of bytes already in the image.

; ---- the per-level sprite and palette rows ----
; (In the main code stream, a placement from the hand layout: the block beside lvlStart was full.)
;
; Every level in the "do the levels actually differ?" filter (LEVEL_IDS) as well as in PAL_N: a row
; is emitted only when some level disagrees with the first.
lvlSprunderT: !byte $0b,$0b,$0b,$00,$0b,$0b,$0b,$00,$0b,$09
lvlSprhiT: !byte $0f,$0f,$0f,$0c,$0f,$0f,$0f,$0b,$0f,$07
lvlPalceilT: !byte $01,$01,$01,$0b,$02,$05,$06,$00,$01,$0b
lvlPalseamT: !byte $0b,$0b,$0b,$0e,$0a,$0d,$0e,$06,$0b,$0c
lvlIdolunderT: !byte $0b,$0b,$0b,$00,$09,$09,$09,$0b,$0b,$0b
lvlIdolhiT: !byte $0c,$0c,$0c,$0c,$07,$07,$07,$0c,$0c,$0c
; ================= orb tables =================
; (Hand-placed in the hole between the code and the tables before compaction.) Only what the projection
; and the whole-orb hide need: the painting pass's tables (fgCodeT, kMaskT, bbLT/bbRT, opbBaseT,
; popcT) are NOT here, because they addressed charset twins that no longer exist.
        ; (holeSeeT -- one bit per cell per hole-like entity: can it be seen from anywhere in that
        ; cell? -- was placed here by hand, sized to NHOLE. The visibility zones replaced it
        ; (ZONES, 2026-10-04). The origin below is the hand layout's.)
        * = $8d97
        ; ---- the pedestal's ladder: the same disc, EXTRUDED ----
        ; (Down here rather than beside the socket's for room in the hand layout.)
        ; Same five tables again, so hlSet's patch run does not know or care that this kind
        ; stands up. One sprite a rung (see makePedLadder), so pedPtrT is the whole pointer --
        ; there is no right half to increment onto.
        ; A build with NO pedestals anywhere still emits these as one zero byte: hlSrcL names
        ; the labels unconditionally, and an empty !byte assembles as "bad number: $".
pedPtrT: !byte 222,223,224,225,226,227,228,229,230,231
pedXOffT: !byte 12,12,12,6,6,6,6,6,6,6
pedBoxLT: !byte 12,10,8,6,5,4,3,3,2,1
pedBoxRT: !byte 11,9,7,5,4,3,2,1,1,0
pedYBaseT: !byte 126,131,136,139,141,143,145,146,147,147
pedFlagT: !byte 13,13,5,1,1,1,1,1,1,1
pedHT: !byte 86,72,57,43,36,29,22,18,14,11   ; DESCENDING, scanned by hlRungP
; Here rather than with the other two rung finders at $48c3, which has five bytes left and
; runs into fallSnapD at $4900 the moment it does not. Its only table is the one above it.
; The pedestal scans like the socket: 10 rungs does not earn a 256-byte page, and the
; hole already spent the one that was going.
hlRungP:txa
        ldy #$00
hrpL:   cmp pedHT,y
        bcs hrpHit
        iny
        cpy #$0a
        bcc hrpL
        ; ---- past the far end, CLAMP: the smallest rung, not "no rung" ----
        ; It used to return $ff and draw nothing. That was right while the ladder ran down to
        ; two columns, which is further than any of these rooms can put you from a pedestal;
        ; with that rung gone the first thing past the end is a distance you CAN stand at, and
        ; a pedestal that blinks out because you took a step back is worse than one drawn a
        ; column too wide. Y is the rung count here, so dey is the last rung.
        dey
hrpHit: tya
        rts
   ; ZONES: every cell's zone, two to a byte
   ; ZONES: each hole-like's zones (its disc)
zBitT:  !byte 1,2,4,8,16,32,64,128   ; ZONES: zone -> its bit in a mask
ogPcV:  !byte 0                 ; GATEFAST: pcell/znP/stmpM are valid for the live level (objInit clears)
ogTol:  !byte 0                 ; GATEFAST: the inlined cone's tolerance for this distance
   ; STMP: [count, (cell, hole-like mask)...]
stmpM:  !byte 0                 ; STMP: this frame's hole-likes that CAN be partly hidden from here
znP:    !byte 0                 ; ZONES: mapT[player cell] -- the zones visible from it, this frame
        ; Which seats hold an orb: bit 7 set, low nibble the orb's colour. RUNTIME state, not a
        ; manifest table -- hlSCl clears NHOLE of them on every restart. (Placed beside the old
        ; holeSeeT, NHOLE-sized too, in the hand layout.)
hlSeat: !fill 7, 0

        * = $8afb
; ---- hole ladder: a disc on the floor, not a sphere (see HOLE_LADDER in the build) ----
; holePtrT is the LEFT half's sprite pointer; the right half is always the next slot, so a
; two-sprite rung needs one pointer and an increment.
holePtrT: !byte 64,66,66,66,69,72,75,78,80,82,84,86,88,90,91,92,93,94,94,94
holeXOffT: !byte 24,36,36,36,36,36,36,24,24,24,24,24,24,12,12,6,6,6,6,6
holeBoxLT: !byte 24,32,32,30,28,26,24,22,20,18,16,14,12,10,8,6,5,4,3,2
holeBoxRT: !byte 23,31,31,29,27,25,23,21,19,17,15,13,11,9,7,5,4,3,2,1
holeYBaseT: !byte 121,124,127,130,133,135,137,139,141,143,143,145,147,147,148,149,149,150,150,150
holeFlagT: !byte 6,7,7,7,15,15,15,14,14,6,6,6,6,5,5,1,1,1,1,1
        ; ---- the socket's ladder: same tables, half the radius ----
        ; No 256-byte h -> rung table for this one. The hole earned its page at 35 rungs; a
        ; socket has 10, so hlRungS scans and the page stays spent on something else.
sockPtrT: !byte 206,208,210,212,214,216,218,219,220,221
sockXOffT: !byte 12,12,12,12,12,12,6,6,6,6
sockBoxLT: !byte 12,11,9,9,8,6,5,4,4,2
sockBoxRT: !byte 11,10,8,8,7,5,4,3,3,1
sockYBaseT: !byte 144,145,145,146,147,147,148,149,150,150
sockFlagT: !byte 2,2,2,2,2,2,1,1,1,1
sockHT: !byte 77,70,64,57,50,44,37,30,23,13   ; DESCENDING h thresholds, scanned by hlRungS
        ; ---- and an orb seated in one ----

        ; (orbColLT / orbColRT are further down, beside occRT/occLT.)
; The stamp's edge cells. A cell is 4 logical columns, so a stamp that begins or ends inside one
; needs a glyph with only part of it foreground.
;   occRT[k] -- the stamp STARTS at column k of this cell, so columns k..3 clip: "from the right"
;   occLT[m] -- the stamp ENDS at column m, so columns 0..m clip: "from the left"
; Both give the whole-cell glyph where the boundary lands on a cell edge, so no special case.
; Which of a glyph's four columns are WALL, one bit each, bit 3 = column 0. A column counts as
; wall if MOST of its eight rows are NOT BACKGROUND -- not merely one of them. A cell at the wall's
; BASE is floor with a sliver of wall along its top edge, and "any row" handed that whole column
; to the wall, backing the split in black over what is plainly floor. The split covers all eight
; rows of the cell, so the honest summary of a column is what it mostly shows. This is what
; decides an edge cell's backing:
; ask what the columns the stamp does NOT cover actually hold, rather than guessing from whether
; the cell is SOLID. A step at a corner has wall on both sides and wants BLACK; a cell on a
; vertical silhouette has floor beyond it and wants WHITE. "Is it SOLID" cannot tell them apart.
;
; NOT-BACKGROUND, not "is pair 01". White backing exists for exactly one reason -- the column
; shows ceiling or floor beyond the wall's silhouette -- and that is pair 00 and nothing else.
; Testing for 01 also excluded:
;   pair 10, a SEAM. A seam column is SOLID with a panel line on it, and oSWall already counts
;     seam variants as fully wall, so the two tests disagreed. When the uncovered part was
;     EXACTLY the seam column -- last cell with osR&3 = 2 and the seam in column 3, or first
;     cell with osL&3 = 1 and the seam in column 0 -- the mask ANDed to zero and the cell was
;     backed in WHITE, punching a 2px-wide full-height white sliver through the occlusion. In a
;     seamed corridor that is a white edge on nearly every stamp. (oSDeseam could not save it:
;     it runs at oSDone, AFTER every cell of the orb has already been stamped and read.)
;   pair 11, another entity's occluder, where two stamps overlap. Opaque, and backing it white
;     would punch a hole through the first stamp.
occVrtT: !byte 0,1,0,0,0,0,0,1,0,0,1,1,1,0,1,1,0,1,1,0,0,1,1,0,1,0,0,1,0,0,0,0,1,1,1,0,0,1,0,1,0,0,0,0,0,0,1,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,1,1,1,1,0,0,1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,0,1,1,1,1,0,0,1,0,0,0,1,1,1,0,1,1,0,0,1,1,1,1,0,1,1,0,0,0,0,1,1,1,0,1,0,0,1,0,1,1,0,0,0,0,1,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1   ; 1 = a column split expresses this cell; see OCC_VRT
cellFillT: !byte 0,15,15,0,0,15,15,14,3,8,15,15,8,7,7,15,0,14,15,0,0,15,3,15,12,0,0,15,15,12,8,15,1,15,3,15,0,14,8,8,12,15,12,1,3,0,15,1,0,0,15,0,15,15,0,7,7,12,1,15,0,14,3,15,0,1,15,0,15,15,15,0,15,3,15,8,15,15,15,14,12,12,3,3,7,15,15,8,14,3,0,15,15,14,0,0,12,15,0,1,12,7,15,7,8,0,15,15,15,0,0,14,0,1,7,0,3,7,0,14,12,15,0,7,0,3,15,12,14,15,8,8,1,12,1,14,0,15,1,15,1,0,3,12,0,12,0,3,7,7,0,8,15,14,1,15,3,15,15,0,7,15,3,15,15,0,3,3,14,0,15,12,12,14,15,15,15,8,0,12,0,15,15,15,0,12,1,0,1,3,1,3,7,12,8,14,1,3,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,8,12,14,1,3,7,15,15,15,15,15,15,15,15,15,15,15,15,15,0,0,0,15,15,15,15,0,0,0,0,0,0,0,0
; (The occluder masks' run-id tables, runByteT/runBitT, went with the masks, 2026-10-14.)
; runPFT (plane, axis and sense per run id) is DERIVED on every arrival (mkRuns, from entry too)
; and lives in RAM scratch: nothing emits it; mkRuns + hazSpFix write every byte that is read.
; The last entry in each is the HOLE's cell, not an orb -- orbOne projects it with the same
; arithmetic and branches to holeTail on the index. HOLEX/HOLEY move it.
      ; from the MANIFEST, so its length cannot
      ;   disagree with what the swap moves
   ; from the MANIFEST and SWAPPED: a level with
                                ;   more entities than this one indexes past this one's count

        * = $88fb  ; VIC bank 0 is full -- these live above it
recipLoT: !byte 255,255,0,85,0,51,171,146,0,114,154,70,85,177,73,17,0,15,57,121,205,49,163,33
        !byte 171,61,217,123,37,212,137,66,0,194,136,80,28,235,189,144,102,62,24,244,209,176,145,114
        !byte 85,57,31,5,236,213,190,168,146,126,106,87,68,50,33,16,0,240,225,210,196,182,168,155
        !byte 142,130,118,106,94,83,72,62,51,41,31,22,12,3,250,241,233,224,216,208,200,193,185,178
        !byte 171,164,157,150,143,137,131,124,118,112,106,100,95,89,84,78,73,68,63,58,53,48,43,39
        !byte 34,30,25,21,17,12,8,4,0,252,248,244,240,237,233,229,226,222,219,215,212,209,206,202
        !byte 199,196,193,190,187,184,181,178,175,172,170,167,164,161,159,156,154,151,149,146,144,141,139,136
        !byte 134,132,130,127,125,123,121,118,116,114,112,110,108,106,104,102,100,98,96,94,93,91,89,87
        !byte 85,84,82,80,78,77,75,73,72,70,68,67,65,64,62,61,59,58,56,55,53,52,50,49
        !byte 47,46,45,43,42,41,39,38,37,35,34,33,31,30,29,28,26,25,24,23,22,21,19,18
        !byte 17,16,15,14,13,11,10,9,8,7,6,5,4,3,2,1
recipHiT: !byte 255,255,128,85,64,51,42,36,32,28,25,23,21,19,18,17,16,15,14,13,12,12,11,11
        !byte 10,10,9,9,9,8,8,8,8,7,7,7,7,6,6,6,6,6,6,5,5,5,5,5
        !byte 5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3
        !byte 3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2
        !byte 2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
        !byte 2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        * = $8e00
; the unsigned clamp tables (see ECOFF): here among the data, NOT beside the code that reads
; them -- an aligned table opens a run, and the code after it would be classed as data.
ecMT:   !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        * = $9000
ecM16:  !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,32,48,64,80,96,112,128,144,160,176,192,208,224,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240
        * = $9200
ecM8:   !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
; qIdxAT: 16 bytes found inside ecM8, so not emitted (see embedIn)
qIdxMT: !byte 0,0,0,0,0,0,1,1,1,1,2,2,2,2,2,2
; qIdxBT: 16 bytes found inside qIdxAT, so not emitted (see embedIn)
qmT:    !byte 0,9,18,0,0,0,0,0,27,36,45,0,0,0,0,0,54,63,72,0,0,0,0,0,81,90,99,0,0,0,0,0,108,117,126,0,0,0,0,0,135,144,153,0,0,0,0,0,162,171,180,0,0,0,0,0,189,198,207,0,0,0,0,0,216,225,234

bkA12:	sta $e1e0,x
bkA11:	sta $e1b8,x
	sta $e208,x
bkA10:	sta $e190,x
	sta $e230,x
bkA9:	sta $e168,x
	sta $e258,x
bkA8:	sta $e140,x
	sta $e280,x
bkA7:	sta $e118,x
	sta $e2a8,x
bkA6:	sta $e0f0,x
	sta $e2d0,x
bkA5:	sta $e0c8,x
	sta $e2f8,x
bkA4:	sta $e0a0,x
	sta $e320,x
bkA3:	sta $e078,x
	sta $e348,x
bkA2:	sta $e050,x
	sta $e370,x
bkA1:	sta $e028,x
	sta $e398,x
bkA0:	sta $e000,x
	sta $e3c0,x
	jmp rfEdge
bkB12:	sta $e5e0,x
bkB11:	sta $e5b8,x
	sta $e608,x
bkB10:	sta $e590,x
	sta $e630,x
bkB9:	sta $e568,x
	sta $e658,x
bkB8:	sta $e540,x
	sta $e680,x
bkB7:	sta $e518,x
	sta $e6a8,x
bkB6:	sta $e4f0,x
	sta $e6d0,x
bkB5:	sta $e4c8,x
	sta $e6f8,x
bkB4:	sta $e4a0,x
	sta $e720,x
bkB3:	sta $e478,x
	sta $e748,x
bkB2:	sta $e450,x
	sta $e770,x
bkB1:	sta $e428,x
	sta $e798,x
bkB0:	sta $e400,x
	sta $e7c0,x
	jmp rfEdge
slA0:	sta $e000,x
	sta $e3c0,x
slA1:	sta $e028,x
	sta $e398,x
slA2:	sta $e050,x
	sta $e370,x
slA3:	sta $e078,x
	sta $e348,x
slA4:	sta $e0a0,x
	sta $e320,x
slA5:	sta $e0c8,x
	sta $e2f8,x
slA6:	sta $e0f0,x
	sta $e2d0,x
slA7:	sta $e118,x
	sta $e2a8,x
slA8:	sta $e140,x
	sta $e280,x
slA9:	sta $e168,x
	sta $e258,x
slA10:	sta $e190,x
	sta $e230,x
slA11:	sta $e1b8,x
	sta $e208,x
slA12:	sta $e1e0,x
	jmp rfNext
slB0:	sta $e400,x
	sta $e7c0,x
slB1:	sta $e428,x
	sta $e798,x
slB2:	sta $e450,x
	sta $e770,x
slB3:	sta $e478,x
	sta $e748,x
slB4:	sta $e4a0,x
	sta $e720,x
slB5:	sta $e4c8,x
	sta $e6f8,x
slB6:	sta $e4f0,x
	sta $e6d0,x
slB7:	sta $e518,x
	sta $e6a8,x
slB8:	sta $e540,x
	sta $e680,x
slB9:	sta $e568,x
	sta $e658,x
slB10:	sta $e590,x
	sta $e630,x
slB11:	sta $e5b8,x
	sta $e608,x
slB12:	sta $e5e0,x
	jmp rfNext
edA0:	sta $e000,x
	sta $e3c0,x
	inc erow
	jmp rfEdgeT
edA1:	sta $e028,x
	sta $e398,x
	inc erow
	jmp rfEdgeT
edA2:	sta $e050,x
	sta $e370,x
	inc erow
	jmp rfEdgeT
edA3:	sta $e078,x
	sta $e348,x
	inc erow
	jmp rfEdgeT
edA4:	sta $e0a0,x
	sta $e320,x
	inc erow
	jmp rfEdgeT
edA5:	sta $e0c8,x
	sta $e2f8,x
	inc erow
	jmp rfEdgeT
edA6:	sta $e0f0,x
	sta $e2d0,x
	inc erow
	jmp rfEdgeT
edA7:	sta $e118,x
	sta $e2a8,x
	inc erow
	jmp rfEdgeT
edA8:	sta $e140,x
	sta $e280,x
	inc erow
	jmp rfEdgeT
edA9:	sta $e168,x
	sta $e258,x
	inc erow
	jmp rfEdgeT
edA10:	sta $e190,x
	sta $e230,x
	inc erow
	jmp rfEdgeT
edA11:	sta $e1b8,x
	sta $e208,x
	inc erow
	jmp rfEdgeT
edA12:	sta $e1e0,x
	inc erow
	jmp rfEdgeT
edB0:	sta $e400,x
	sta $e7c0,x
	inc erow
	jmp rfEdgeT
edB1:	sta $e428,x
	sta $e798,x
	inc erow
	jmp rfEdgeT
edB2:	sta $e450,x
	sta $e770,x
	inc erow
	jmp rfEdgeT
edB3:	sta $e478,x
	sta $e748,x
	inc erow
	jmp rfEdgeT
edB4:	sta $e4a0,x
	sta $e720,x
	inc erow
	jmp rfEdgeT
edB5:	sta $e4c8,x
	sta $e6f8,x
	inc erow
	jmp rfEdgeT
edB6:	sta $e4f0,x
	sta $e6d0,x
	inc erow
	jmp rfEdgeT
edB7:	sta $e518,x
	sta $e6a8,x
	inc erow
	jmp rfEdgeT
edB8:	sta $e540,x
	sta $e680,x
	inc erow
	jmp rfEdgeT
edB9:	sta $e568,x
	sta $e658,x
	inc erow
	jmp rfEdgeT
edB10:	sta $e590,x
	sta $e630,x
	inc erow
	jmp rfEdgeT
edB11:	sta $e5b8,x
	sta $e608,x
	inc erow
	jmp rfEdgeT
edB12:	sta $e5e0,x
	inc erow
	jmp rfEdgeT
chainEnd:
        ; ---- the two rung finders, in the sliver before fallSnapD at $4900 ----
        ; Out here only because the main code block ends a few bytes short of ORB_SMALL once
        ; PROFILE adds its ticks. Reached by a patched jsr from holeTail, so nothing falls in.
        * = $47c8
; X = h. A = the rung, or $ff for "past the smallest".
hlRungH:cpx #$7d               ; past here the rung is constant, and the table stops there
        bcc hlRHc
        ldx #$7d
hlRHc:  lda holeVarT,x
        rts
; The socket scans instead. sockHT descends, so the first threshold at or below h is the rung,
; and h above the first entry clamps to rung 0 -- the same rule holeVarT bakes in.
hlRungS:txa
        ldy #$00
hrsL:   cmp sockHT,y
        bcs hrsHit
        iny
        cpy #$0a
        bcc hrsL
        lda #$ff
        rts
hrsHit: tya
        rts

        ; Out here for the same reason the rung finders are: the bfsTick block ends 21 bytes
        ; short of $6100 and this needs 30. jsr-entered, nothing falls into it.
; ---- bfsSeed: queue every entity cell the main wave reached, for the deferred second wave ----
; The main wave never expands THROUGH an entity, so an orb parked in a one-wide corridor leaves
; every cell beyond it at $ff. The angel behind it reads $ff for its own cell, anPath returns
; $ff, and angStep's "it is walled in, so it WAITS" freezes it on the spot -- rooms away, not at
; the obstacle. (The user, 2026-09-20, blocking level 1's corridor: "the angel no longer follows".)
;
; So when the queue runs dry, seed it from the entity cells that DID get a distance and keep
; going. Because a cell is only written when it is still $ff, this second wave can ONLY fill
; cells the first could not reach: a route that goes round an orb is still found by wave 1 and is
; still exactly as short as it was. Nothing about the preferred case changes.
; Every cell it does fill got its distance from a neighbour one less, so the strictly-decreasing
; guarantee still holds across both waves and anPath is untouched. The angel descends normally to
; the cell beside the orb, where its only d-1 neighbour IS the orb -- which anPath refuses on
; blkT -- and stops there facing the player, which is the whole point.
;
; blkT == 2 SPECIFICALLY, not "blocked": bfsStN writes a distance for EVERY cell including walls,
; and seeding from a wall would expand a route straight through it.
; Scanning blkT rather than walking the entity table: 256 cheap iterations beat nAllT of them
; once each needs a row multiply to turn (x,y) back into a cell -- 30 bytes against 73, and this
; block has 21 to spare. ~3,000 cycles, once per fill, which is once in ~120 frames.
; The whole 256 is safe: blkT is padded to a full page with WALL, so the bytes past the map read
; as 1 and can never match. (A 256-iteration loop over a MAPN table is otherwise the standing
; trap here -- a 253-cell map has three bytes of something else behind it.)
; It also handles entities that are not really there: a carried or hidden orb leaves its old cell
; unblocked, so it simply is not a 2 and is not seeded.
bfsSeed:ldx #$00
bfsSdL: lda blkT,x
        cmp #$02
        bne bfsSdN              ; wall, floor, or an entity that is not here: not an obstacle
bfsSdQ: lda bfsD1,x             ; operand PATCHED to the work map
        cmp #$ff
        beq bfsSdN              ; wave 1 never reached this one either: nothing to expand from
        txa
        ldy bfsTail
        sta bfsQ,y
        inc bfsTail
bfsSdN: inx
        bne bfsSdL
        rts


        * = $9700
hTabG0: !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,254,237,221,208,195,185,175,166,158,151,144,138,133,128,123,119,115,111,107
        !byte 104,101,98,95,92,90,87,85,83,81,79,77,76,74,72,71,69,68,66,65,64,63,62,60,59,58,57,56,55,54,54,53
        !byte 52,51,50,50,49,48,47,47,46,46,45,44,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35
        !byte 35,34,34,34,33,33,33,32,32,32,31,31,31,30,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,27,26,26
        !byte 26,26,25,25,24,24,24,23,23,23,22,22,22,22,21,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17
        !byte 17,17,17,17,17,16,16,16,16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,13,13,13,13
        !byte 13,13,12,12,12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7
        !byte 6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,4
        * = $9800
hTabG1: !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,250,232,216,203,191,180,171,162,155,148,141,135,130,125,120,116,112,108,105
        !byte 101,98,96,93,90,88,85,83,81,79,77,76,74,72,71,69,68,66,65,64,62,61,60,59,58,57,56,55,54,53,52,52
        !byte 51,50,49,48,48,47,46,46,45,44,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,36,36,36,35,35,35,34
        !byte 34,33,33,33,32,32,32,32,31,31,31,30,30,30,30,29,29,29,28,28,28,28,28,27,27,27,27,26,26,26,26,26
        !byte 25,25,25,24,24,24,23,23,23,22,22,22,21,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17
        !byte 17,17,17,16,16,16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13
        !byte 13,12,12,12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6
        !byte 6,6,6,6,6,5,5,5,5,5,5,5,5,5,4,4
        * = $9900
hTabG2: !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,245,228,213,199,188,177,168,159,152,145,139,133,128,123,118,114,110,106,103
        !byte 100,97,94,91,89,86,84,82,80,78,76,74,72,71,69,68,66,65,64,63,61,60,59,58,57,56,55,54,53,52,51,51
        !byte 50,49,48,48,47,46,46,45,44,44,43,43,42,41,41,40,40,39,39,38,38,38,37,37,36,36,35,35,35,34,34,34
        !byte 33,33,33,32,32,32,31,31,31,30,30,30,30,29,29,29,28,28,28,28,27,27,27,27,27,26,26,26,26,26,25,25
        !byte 25,25,24,24,23,23,23,22,22,22,22,21,21,21,20,20,20,20,19,19,19,19,19,18,18,18,18,18,17,17,17,17
        !byte 17,16,16,16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13
        !byte 12,12,12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6
        !byte 6,6,6,6,6,5,5,5,5,5,5,5,5,4,4,4
        * = $9a00
hTabG3: !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,241,224,209,196,184,174,165,157,149,142,136,131,125,121,116,112,108,104,101
        !byte 98,95,92,90,87,85,82,80,78,76,75,73,71,70,68,67,65,64,63,61,60,59,58,57,56,55,54,53,52,51,51,50
        !byte 49,48,47,47,46,45,45,44,44,43,42,42,41,41,40,40,39,39,38,38,37,37,36,36,36,35,35,34,34,34,33,33
        !byte 33,32,32,32,31,31,31,30,30,30,30,29,29,29,28,28,28,28,27,27,27,27,27,26,26,26,26,25,25,25,25,25
        !byte 24,24,24,23,23,23,22,22,22,21,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16
        !byte 16,16,16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12
        !byte 12,12,12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6
        !byte 6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4
        * = $9b00
hTabG4: !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,237,220,205,193,181,171,162,154,147,140,134,128,123,118,114,110,106,103,99
        !byte 96,93,91,88,86,83,81,79,77,75,73,72,70,68,67,66,64,63,62,60,59,58,57,56,55,54,53,52,51,51,50,49
        !byte 48,47,47,46,45,45,44,43,43,42,42,41,41,40,39,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32
        !byte 32,32,31,31,31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24
        !byte 24,24,23,23,23,22,22,22,21,21,21,21,20,20,20,19,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16
        !byte 16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12
        !byte 12,12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6
        !byte 6,6,6,6,5,5,5,5,5,5,5,4,4,4,4,4
        * = $9c00
hTabG5: !byte 254,254,254,254,254,254,254,254,254,254,254,254,252,233,216,202,189,178,168,159,151,144,138,132,126,121,116,112,108,104,101,98
        !byte 95,92,89,87,84,82,80,78,76,74,72,70,69,67,66,64,63,62,61,59,58,57,56,55,54,53,52,51,50,50,49,48
        !byte 47,47,46,45,45,44,43,43,42,41,41,40,40,39,39,38,38,37,37,36,36,36,35,35,34,34,34,33,33,33,32,32
        !byte 32,31,31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24
        !byte 24,23,23,23,22,22,22,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16,16,16
        !byte 16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12
        !byte 12,11,11,11,11,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6,6
        !byte 6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4
        * = $9d00
hTabG6: !byte 254,254,254,254,254,254,254,254,254,254,254,254,248,229,213,199,186,175,165,157,149,142,135,130,124,119,115,110,106,103,99,96
        !byte 93,90,88,85,83,81,78,76,74,73,71,69,68,66,65,63,62,61,60,58,57,56,55,54,53,52,51,50,50,49,48,47
        !byte 47,46,45,44,44,43,43,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32,32,32,31
        !byte 31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24,24,23
        !byte 23,23,23,22,22,22,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16,16,16,16
        !byte 16,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12
        !byte 12,11,11,11,10,10,10,10,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6,6,6
        !byte 6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4
        * = $9e00
hTabG7: !byte 254,254,254,254,254,254,254,254,254,254,254,254,244,225,209,195,183,172,163,154,147,140,133,127,122,117,113,109,105,101,98,95
        !byte 92,89,86,84,81,79,77,75,73,71,70,68,67,65,64,62,61,60,59,57,56,55,54,53,52,51,51,50,49,48,47,47
        !byte 46,45,44,44,43,42,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,34,34,34,33,33,33,32,32,32,31,31
        !byte 31,30,30,30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24,24,23,23,23
        !byte 23,23,22,22,22,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,17,17,17,17,17,16,16,16,16,16,16,15
        !byte 15,15,15,15,15,15,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12
        !byte 11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6
        !byte 6,6,5,5,5,5,5,5,5,4,4,4,4,4,4,4
        * = $9f00
hTabG8: !byte 254,254,254,254,254,254,254,254,254,254,254,254,240,222,206,192,180,170,160,152,144,137,131,125,120,115,111,107,103,99,96,93
        !byte 90,87,85,82,80,78,76,74,72,70,69,67,66,64,63,61,60,59,58,57,55,54,53,52,51,51,50,49,48,47,47,46
        !byte 45,44,44,43,42,42,41,41,40,40,39,38,38,37,37,37,36,36,35,35,34,34,34,33,33,32,32,32,31,31,31,30
        !byte 30,30,29,29,29,29,28,28,28,27,27,27,27,26,26,26,26,26,25,25,25,25,24,24,24,24,24,23,23,23,23,23
        !byte 23,22,22,22,21,21,21,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16,16,16,16,16,15,15
        !byte 15,15,15,15,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,11,11
        !byte 11,11,11,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6
        !byte 6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4
        * = $a000
hTabG9: !byte 254,254,254,254,254,254,254,254,254,254,254,254,237,218,203,189,177,167,158,149,142,135,129,123,118,114,109,105,101,98,95,92
        !byte 89,86,83,81,79,77,75,73,71,69,68,66,65,63,62,60,59,58,57,56,55,54,53,52,51,50,49,48,47,47,46,45
        !byte 44,44,43,42,42,41,41,40,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32,32,32,31,31,31,30,30
        !byte 30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,24,24,24,24,24,23,23,23,23,23,23,22
        !byte 22,22,22,21,21,21,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16,16,16,16,15,15,15,15
        !byte 15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,11,11,11,11
        !byte 11,11,10,10,10,10,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6
        !byte 6,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4
        * = $919e
orbVarT: !byte 15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,13,13,13,13,12,12,12,12,11,11,11,11,10,10,10,10,9,9,9,9,8,8,8,7,7,7,7,6,6,6,6,6,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,2,2,2,2,2,2,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        ; ---- the angel's distance maps, its pathing code, and its queue ----
        ; NOT at $4900 or $6200: those are the fall's screen snapshots, which are runtime-only
        ; and so invisible to the hole report until it was told about them. Putting the path
        ; table on one and these maps on the other is what turned the drop into garbage.
        ; The two maps are ping-ponged -- bfsTick builds the WORK one a few cells a frame while
        ; anPath reads the LIVE one -- and both are page-aligned because a whole cell byte
        ; indexes them. bfsD0 lives off at $ae00 because this gap is not big enough for both.
        * = $a100
bfsD1:  !fill 256, 255            ; A FULL PAGE: the clear loop runs until X wraps
        * = $4800
; ---- anPath: A = the first step from the angel's cell toward the player, or $ff ----
; Reads the LIVE distance map: find the neighbour whose distance is exactly one less than ours.
; BFS guarantees one exists for every reachable cell, so the only $ff cases are a map that has
; not been filled yet and the angel standing on the player, which anTry already prevents.
; The two LIVE reads are self-modified rather than indirect -- the map base is one of two pages
; and only changes when a fill completes, so paying for it per read would be silly.

anPath: ldx amIdx
        lda orbYCT,x
        jsr mulW
        clc
        adc orbXCT,x
        sta apC
        tax
        ; ---- BFSJIT: read the fill IN FLIGHT if it has reached this angel ----
        ; BFS labels in order of distance, so once this cell has one, every cell nearer the player
        ; has one too -- which is all this walk reads. The fresher map wins; otherwise the live one.
        lda bfsLiveP
        ldy bfsPhase
        cpy #$02
        bcc apPg                ; no fill expanding (idle, or still clearing)
apLdW:  ldy bfsD1,x             ; operand PATCHED to the work map
        iny
        beq apPg                ; $ff: not reached yet
        lda bfsClS+2            ; the work page
apPg:   sta apLdA+2
        sta apLdB+2
        sta apLdD+2
apLdA:  lda bfsD0,x             ; operand PATCHED to the live map
        cmp #$ff
        beq anPNo               ; no fill has completed yet
        sec
        sbc #$01
        bcc anPNo               ; distance 0: standing on the player
        sta apD
        ; ---- ANGDIAG: a diagonal step two closer, both corner cells clear ----
        ; Tried FIRST: where it exists it is the shorter walk. Only from d >= 3, so the cell it lands
        ; in is never the player's (d = 2 diagonally is already beside you, and anAdj marks).
        cmp #$02
        bcc apDgN
        ldy #$03                ; directions 4..7 (SE SW NE NW), from pathDXT/pathDYT
apDgL:  sty apDi
        ldx apDxI,y
        lda apC
        clc
        adc bfsDCT,x
        tax
        lda blkT,x              ; the corner along x: a BLOCKER only, no visibility test (the user,
        bne apDgX               ;   2026-10-29) -- walls, orbs and angels all count
        txa
        ldx apDyI,y
        clc
        adc bfsDCT,x            ; corner x + the y step: the diagonal cell itself
        tay
        lda apC
        clc
        adc bfsDCT,x
        tax
        lda blkT,x              ; the corner along y
        bne apDgX
        lda blkT,y
        bne apDgX               ; the diagonal cell is taken
apLdD:  lda bfsD0,y             ; operand PATCHED with apLdA
        clc
        adc #$01                ; ($ff + 1 = 0 never matches: apD >= 2 here)
        cmp apD
        bne apDgX               ; not two closer
        lda apDi
        clc
        adc #$04
        rts
apDgX:  ldy apDi
        dey
        bpl apDgL
apDgN:
        ldy #$00
anPLp:  lda apC
        clc
        adc bfsDCT,y            ; no bounds check: the border is solid, so a step off the open
        tax                     ;   region always lands in a wall and is rejected below
        lda blkT,x              ; blkT, matching the fill: walls and entities alike are refused
        bne anPNx
apLdB:  lda bfsD0,x             ; operand PATCHED to the live map
        cmp apD
        beq anPHit
anPNx:  iny
        cpy #$04
        bcc anPLp
anPNo:  lda #$ff
        rts
anPHit: tya
        rts
apDxI:  !byte 0,1,0,1             ; diagonal y -> its x step, as a bfsDCT index (E W E W)
apDyI:  !byte 2,2,3,3             ;   ...and its y step (S S N N): directions 4..7 = SE SW NE NW
apDi:   !byte 0                   ; the diagonal being tried
bfsLiveP: !byte >bfsD0            ; which page anPath's LIVE reads use (apLdA's assembled base)
bfsMiss: !byte 0
bdT:    !byte 0

; ---- bfsDue (BFSJIT): C set if some angel will choose a step within its lead ----
; Ticks until it sets out = period - slide - banked; lead = cells the last fill took to reach it,
; at BFSTICK a tick, plus the clear. Angels held by your gaze are skipped: their clocks are stopped
; (unless you carry the idol), and one that turns free reads whatever map exists, a moment stale.
bfsDue: ldx nOrbM1T              ; every entity: an orb or a hole never banks time (angAccT stays 0),
bdLp:                           ;   so it is never within its lead -- no need to ask what it is
        lda orbTallT,x          ; the BIG angel steps every period, seen or not, and stands with its
        cmp #$02                ;   clock at 0 -- so by the rules below it was never due: a stale map
        beq bdYes               ;   stopped it for good, anywhere (the user, 2026-11-10: "it still gets
                                ;   stuck at the corner ... even if I'm not near it or not looking")
        lda angSlDT,x
        bne bdNx                ; lunging: its step is already chosen
        lda orbSeenT,x
        beq bdFree
        lda idolHd
        beq bdNx                ; seen and frozen
bdFree: lda angPerT
        sec
        sbc #$18
        sec
        sbc angAccT,x
        bcc bdYes               ; already past its set-out point: due now
        sta bdT
        lda angLabT,x
        lsr
        clc
        adc #20                 ; the clear (4 frames) and a frame of slack, in 60ths at 15 fps
        bcs bdYes
        cmp bdT
        bcs bdYes               ; its lead covers the time left: start now
bdNx:   dex
        bpl bdLp
        clc
        rts
bdYes:  sec
        rts

; ---- bfsTick: a few cells of the distance map, once a frame ----
; The angel reads the map once per ANG_PERIOD -- ~120 frames -- so there is no reason to pay for
; a whole fill in one of them. Phase 1 clears the work map 64 bytes a frame, phase 2 expands
; BFS_RATE cells a frame; the whole thing lands in about 30 frames.
;
; If the player keeps moving, the fill in flight is allowed to FINISH rather than being
; restarted -- bfsWant remembers where they got to and the next fill starts there. A map at most
; one fill old is invisible on something that steps once every two seconds, and restarting
; forever would mean the map never completed at all.
bfsTick:
        lda py+1                ; where the player is NOW
        jsr mulW
        clc
        adc px+1
        sta bfsWant
        jsr rxStamp             ; ANGREACT: the tick the player ENTERED this cell
        lda bfsPhase
        bne bfsWork
        ; Idle: is the live map still good? It has to be for the right PLAYER CELL and for the
        ; current arrangement of obstacles -- now that orbs block a path, picking one up or
        ; setting one down changes the answer just as much as walking does.
        lda bfsWant
        cmp bfsDone
        bne bfsJit
        lda blkVer
        cmp bfsBVD
        beq bfsRts
bfsJit: lda bfsDone                ; ---- BFSJIT: the map is stale, but is anyone about to read it? ----
        cmp #$ff
        beq bfsGo               ; no map at all yet this level (objInit): fill now
        jsr bfsDue
        bcc bfsRts              ; nobody steps within its lead: leave it stale, it costs nothing
bfsGo:  lda bfsWant
        sta bfsFor
        lda blkVer
        sta bfsBVF              ; remember what this fill is for, not what is current when it ends
        lda #$00
        sta bfsCl
        lda #$01
        sta bfsPhase
        ldx #$09
        lda #$00
bfsLSc: sta angLabT,x           ; reached on the first frame keeps 0: the lead is then the clear alone
        dex
        bpl bfsLSc
        jsr rxGo                ; ANGREACT: the moment this fill answers for, and nobody reached yet
bfsWork:
        lda bfsPhase
        cmp #$02
        bcs bfsExp              ; 2 = the main wave, 3 = the deferred entity wave (see bfsSeed)
        ; ---- phase 1: clear the work map, 64 bytes a frame ----
        ldx bfsCl
        ldy #64
        lda #$ff
bfsClL: 
bfsClS: sta bfsD1,x             ; operand PATCHED to the work map
        inx
        dey
        bne bfsClL
        stx bfsCl
        txa                     ; STX SETS NO FLAGS -- without this the branch tested the Z the
        bne bfsRts              ;   clear loop exited on, which is always set, so the queue was
                                ;   seeded after every 64-byte chunk instead of once the page
                                ;   was done. X wrapping to 0 is what "finished" means here.
        ldx bfsFor              ; seed the queue with the player's own cell at distance 0
        lda #$00
bfsSd:  sta bfsD1,x             ; operand PATCHED to the work map
        lda bfsFor
        sta bfsQ
        lda #$00
        sta bfsHead
        lda #$01
        sta bfsTail
        lda #$02
        sta bfsPhase
        rts
        ; ---- phase 2: expand cells at a rate set by TIME, not by frames ----
        ; It used to be $02 cells a FRAME, which tied the angel's route freshness to the frame
        ; rate -- so it was least alert exactly when the scene was most expensive, and two builds
        ; of different speed sent it to different places from the same inputs. frameCnt is the
        ; raster IRQ at 60Hz, so its delta is real time; half a cell a tick is the same average
        ; rate $02 a frame gave at 15fps. Computed here rather than from dtt because dtt only
        ; exists when readKeys runs, and the auto-movers replace it.
bfsExp: lda frameCnt
        tax
        sec
        sbc bfsLast
        stx bfsLast
        bne bfsE1
        lda #$01                ; never zero: a fast frame must still make progress
bfsE1:  cmp #$09
        bcc bfsE2
        lda #$08                ; never a burst: a long stall counts as 8 ticks at most
bfsE2:  sta bfsN                ; ticks, 1..8 -- times BFSTICK cells a tick (8 * BFSTICK fits a byte)
        clc
        adc bfsN
        sta bfsN
bfsExL: lda bfsHead
        cmp bfsTail
        beq bfsQE               ; queue empty -> the main wave is done; is there a second?
        tax
        lda bfsQ,x
        sta bfsC
        inc bfsHead
        tax
bfsLdC: lda bfsD1,x             ; operand PATCHED to the work map
        clc
        adc #$01
        sta bfsND
        ldy #$00
bfsNbL: lda bfsC
        clc
        adc bfsDCT,y
        tax
        ; ---- blkT, NOT mapT: an orb is a real obstacle and the path has to go round it ----
        ; A blocked cell still RECEIVES a distance -- otherwise an entity could never read its
        ; own cell, which is the reason this fill used to ignore entities entirely -- but it is
        ; never EXPANDED from, so no route is ever plotted through one.
        ; A WALL gets nothing (2026-11-01, the user: skip it "just on principle"): only an entity
        ; ever reads its own cell, and anPath refuses any neighbour with blkT set before it reads
        ; the map -- so a wall's distance was written and never read. It keeps the clear's $ff.
        lda blkT,x
        cmp #$01
        beq bfsNbN              ; a wall: not labeled, not queued
        sta bfsBlk
bfsLdN: lda bfsD1,x             ; operand PATCHED to the work map
        cmp #$ff
        bne bfsNbN              ; already has a distance
        lda bfsND
bfsStN: sta bfsD1,x             ; operand PATCHED to the work map
        lda bfsBlk              ; leaves X alone, which still holds the cell
        bne bfsNbN              ; blocked: distance recorded, but nothing expands from here
        txa
        ldx bfsTail
        sta bfsQ,x
        inc bfsTail
bfsNbN: iny
        cpy #$04
        bcc bfsNbL
        dec bfsN
        bne bfsExL
        ; ---- EARLY OUT: stop as soon as every angel can see its way to the player ----
        ; BFS assigns in strictly increasing distance, so the instant an angel's own cell has a
        ; value, every cell nearer than it already has one -- and that is exactly the set anPath
        ; reads. Filling the far side of the map it is never going to walk buys nothing. The
        ; point is not frame rate (2 cells a frame was never the cost) but FRESHNESS: a short
        ; fill lands sooner, so dropping an orb re-routes the angel in a fraction of the time.
        ; An angel that is walled in never gets a distance, so this never fires and the fill
        ; runs to its natural end -- which is correct, and is also when it matters least.
        lda nOrbT               ; no entities: nothing to path toward
        beq bfsFin
        lda #$00
        sta bfsMiss
        ldx nOrbM1T
bfsEnL: lda orbTallT,x
        beq bfsEnN
        lda orbHidT,x
        bne bfsEnN              ; not in the world
        stx bfsEnI
        lda orbYCT,x
        jsr mulW
        clc
        adc orbXCT,x
        tax
bfsLdE: lda bfsD1,x             ; operand PATCHED to the work map
        ldx bfsEnI
        cmp #$ff
        beq bfsEnM
        jsr angRx               ; ANGREACT: reached -- the first time this fill, has its way round turned?
        jmp bfsEnN              ;   (angRx leaves X = bfsEnI)
bfsEnM:        inc bfsMiss             ; not reached yet -- go on, the others' counts still get written
        lda bfsHead             ; ---- BFSJIT: cells expanded so far without reaching this angel ----
        sta angLabT,x           ;   the next fill's lead for it, at BFSTICK cells a tick
bfsEnN: dex
        bpl bfsEnL
        lda bfsMiss
        bne bfsRts              ; someone has no distance yet: keep filling
        jmp bfsFin              ; every angel has its answer
bfsRts: rts
        ; ---- the fill is done: swap the maps over ----
        ; ---- the queue has run dry ----
bfsQE:  lda bfsPhase
        cmp #$03
        beq bfsFin              ; the entity wave has already run: the map really is complete
        lda #$03
        sta bfsPhase
        jsr bfsSeed
        jmp bfsExL              ; straight on with whatever it queued -- if nothing, we come
                                ;   back here, phase is 3, and the fill ends

bfsFin: lda bfsFor
        sta bfsDone
        lda bfsBVF
        sta bfsBVD
        lda #$00
        sta bfsPhase
        lda bfsLiveP            ; live <-> work. anPath patches its own reads per call (it may
        pha                     ;   read the fill in flight), so the live page is kept as a byte
        lda bfsClS+2
        sta bfsLiveP
        pla
        sta apLdW+2             ; anPath's "reached yet?" probe reads the WORK map
        sta bfsClS+2
        sta bfsSd+2
        sta bfsLdC+2
        sta bfsLdN+2
        sta bfsStN+2
        sta bfsSdQ+2            ; bfsSeed reads the WORK map too, so it swaps with the rest
        sta bfsLdE+2            ; the early-out reads the WORK map, so it swaps with the rest
        rts

        ; the four orthogonal steps, in one order everywhere: 0 = +x, 1 = -x, 2 = +y, 3 = -y
      ; ...as a CELL delta (manifest: the live level's width)
   ; W, H, -W, W+H, H-1: the live level's shape, for every
                                ;   stride the code used to carry as an immediate
pathDXT: !byte 1,255,0,0,1,255,1,255        ; ...and as the amTX/amTY pair anTry wants
pathDYT: !byte 0,0,1,255,1,1,255,255         ;   (ANGDIAG: 4..7 = SE SW NE NW)
        ; Per hole-like entity: the FILL ink. 0 is a pit, grey3 an empty socket, an orb's colour
        ; a seated one -- the whole difference, one byte. See holeTail.

        ; Runtime, one per hole-like entity: bit 7 = an orb is seated here, low nibble its body
        ; colour. Emitted rather than equated so a fresh load starts it clear.
; Entered by jsr only, nothing falls in. (Placed out of the main block in the hand layout, under
; holeVarT's old $6100; compaction places it now.)
; bgCopy / snapCp: copy the top 13 rows of a screen into a half-height snapshot, all 40
; columns. bgCopy names the back buffer fallMid just rendered and jumps into snapCp. (The walk
; was once written twice; fallSnap, its other caller, is gone.)
bgCopy: lda baseHi
        sta snSrc

        jmp snapCp              ; ...the shared walk, parked in a free run of its own

        * = $887d
; Page-aligned because it is indexed by a whole byte of h. See holeVarT in the build.
holeVarT: !byte 255,255,255,255,255,255,255,19,19,19,18,18,18,17,17,17,17,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,13,13,13,13,13,13,12,12,12,12,12,12,12,11,11,11,11,11,11,11,10,10,10,10,10,10,9,9,9,9,9,9,9,8,8,8,8,8,8,8,7,7,7,7,7,7,6,6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,0
        ; ---- CPU-only tables, lifted clear of VIC bank 0 ----
        ; None of this is ever fetched by the VIC, so none of it belongs in the 16K the
        ; VIC can see. Moving it out frees bank 0 for sprites, and gives every 256-entry
        ; table its own page for free -- an "lda table,x" that crosses a page costs an
        ; extra cycle, and these are indexed by a full byte.
        * = $823a          ; the fall's animation data, out of the image's own segment
arcYT: !byte 255,248,232,216,200,184,168,152,136,120,104,91,80,69,57,46,34,23,11,0     ;   which has no slack left above ORB_SMALL at $3300
arcET: !byte 20,20,20,20,20,20,20,20,20,20,20,17,12,7,3,254,250,245,241,236
arcYT2: !byte 200,189,177,166,154,143,131,120,109,96,80,64,48,32,16,0,0,0,0,0    ; the landing's mirrored schedule
arcET2: !byte 20,15,11,6,2,253,249,244,239,236,236,236,236,236,236,236,236,236,236,236
arcD: !byte 255,227,202,178,156,136,118,101,85,71,59,47,37,28,21,14,9,5,2,1,0,1,2,5,9,14,21,28,37,47,59,71,85,101,118,136,156,178,202,227,255
; REMOVED 2026-09-26, nothing in the image named it: arcTrT/arcTopT: BUILD-TIME inputs that were emitted out of habit. arcTrT feeds arcSpT and
; arcTopT feeds the fall's clamp; the derived tables ship and are read, the inputs are not.
arcSpT: !byte 150,143,127,111,95,79,63,51,51,51,51,51,51,51,51,51,51,51,51,51
arcSp2T: !byte 246,246,242,226,210,194,186,178,162,154,138,122,106,90,74,58,58,58,58,58
arcSp2bT: !byte 246,246,246,246,246,246,246,246,246,246,230,214,198,182,166,150,150,150,150,150
; the split for an overlap frame: between the departing arc's lowest row and the arriving one's
; highest, so each rim sits in the charset its polarity needs
; One bit per cell: can the hole be seen from anywhere in it? 32 bytes, where a fourth candidate
; record per cell would have been 768 and the lists have 21 bytes spare.
; PADDED TO A PAGE. objInit rebuilds this from mapT with a 256-iteration "inx / bne" copy -- the
; cheapest loop there is -- and a 253-cell map made the last three stores land on whatever came
; next: mul40LoT[0..2], which the fall uses to find rows 0, 1 and 2. Rows 1 and 2 of every fall
; frame went to row 0 instead, leftover rim black sat in row 2 for the last five landing frames,
; and the two buffers flickered it against each other (2026-09-17). The pad is what those three
; stores hit now; the level change that shrank the map to 253 cells is what exposed it.
blkT: !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1,0,0,0,0,1,0,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1,0,1,1,0,1,0,1,1,1,0,0,0,0,2,2,0,0,0,0,0,0,1,0,1,1,2,2,0,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1,0,1,1,0,1,0,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1,0,0,0,0,1,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,0,0,1,1,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
; fallDraw indexes these by whole rows of offset, 0..25, to place its two block pointers.
mul40LoT: !byte 0,40,80,120,160,200,240,24,64,104,144,184,224,8,48,88,128,168,208,248,32,72,112,152,192,232,16,56,96,136,176
mul40HiT: !byte 0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4,4
; ---- THE FALL'S SNAPSHOTS ARE HALF HEIGHT ----
; renderSym writes the identical byte to both halves of the screen (charset B is charset A flipped
; and the raster split selects it below the horizon), so a frame is its own vertical mirror about
; row 12 and only rows 0-12 need storing. 520 bytes instead of 1000.
; mulSnapT is 40*min(x, 24-x): the row offset INTO the snapshot for screen row x. It replaces
; mul40 at the two snapshot reads, so the mirror costs no cycles at all -- same instruction, a
; different table.
mulSnapLoT: !byte <fallTailB+0,<fallTailB+40,<fallTailB+80,<fallTailB+120,<fallTailB+160,<fallTailB+200,<fallTailB+240,<bfsQ+0,<bfsQ+40,<bfsQ+80,<bfsQ+120,<bfsQ+160,<bfsQ+200,<bfsQ+160,<bfsQ+120,<bfsQ+80,<bfsQ+40,<bfsQ+0,<fallTailB+240,<fallTailB+200,<fallTailB+160,<fallTailB+120,<fallTailB+80,<fallTailB+40,<fallTailB+0,<fallTailB+0,<fallTailB+0,<fallTailB+0,<fallTailB+0,<fallTailB+0,<fallTailB+0
mulSnapHiT: !byte >fallTailB+0,>fallTailB+40,>fallTailB+80,>fallTailB+120,>fallTailB+160,>fallTailB+200,>fallTailB+240,>bfsQ+0,>bfsQ+40,>bfsQ+80,>bfsQ+120,>bfsQ+160,>bfsQ+200,>bfsQ+160,>bfsQ+120,>bfsQ+80,>bfsQ+40,>bfsQ+0,>fallTailB+240,>fallTailB+200,>fallTailB+160,>fallTailB+120,>fallTailB+80,>fallTailB+40,>fallTailB+0,>fallTailB+0,>fallTailB+0,>fallTailB+0,>fallTailB+0,>fallTailB+0,>fallTailB+0
; (acme applies < and > LAST, so <fallTailB+40 is the low byte of fallTailB+40)
snapLoT: !byte <fallTailB+0,<fallTailB+40,<fallTailB+80,<fallTailB+120,<fallTailB+160,<fallTailB+200,<fallTailB+240,<bfsQ+0,<bfsQ+40,<bfsQ+80,<bfsQ+120,<bfsQ+160,<bfsQ+200   ; slot -> address, for the writer
snapHiT: !byte >fallTailB+0,>fallTailB+40,>fallTailB+80,>fallTailB+120,>fallTailB+160,>fallTailB+200,>fallTailB+240,>bfsQ+0,>bfsQ+40,>bfsQ+80,>bfsQ+120,>bfsQ+160,>bfsQ+200
; Which SCREEN row each slot copies from. Slots 1-5 take rows 23-19 -- their own mirrors -- because
; the HUD is drawn over rows 1-5 AFTER renderSym, so those rows are the only asymmetric ones on
; screen. Their mirrors hold exactly the render the HUD is covering, so this both loses the HUD
; for the fall (which is wanted) and keeps the geometry underneath it (which storing a blank
; would not). Everything else stores itself.
snapSrcT: !byte 0,23,22,21,20,19,6,7,8,9,10,11,12
; the per-VARIANT tables live out here: the angel's rungs doubled their length and pushed the
; image segment through holeSeeT at $3240
orbPtrT: !byte 160,161,162,163,164,165,160,161,162,163,164,165,166,167,168,169,170,172,174,176,178,180,182,170,172,174,176,178,180,182,184,185,186,187,188,189,95,97,99,101,102,103,104,105,106,222,222,228,228,234,234,237,237,240,243,172,173,174,175,175,177,177,179,179,181,183
orbPtrU: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,171,173,175,177,179,181,183,171,173,175,177,179,181,183,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
; The sentry's RIGHT column: its lower sprite, 0 = one column, and its upper one. The sentry's rungs
; only (orbRt tests ovar >= SV_V0 first), so each label sits SV_V0 before its first byte.
; (The equates FOLLOW the tables: the assembler resolves an equate when it reads it.)
svPtrRT: !byte 96,98,100,0,0,0,0,0,0
svPtrRUT:!byte 0,0,0,0,0,0,0,0,0
orbPtrR = svPtrRT - $24
orbPtrRU = svPtrRUT - $24
; ...and the big angel's other sprites and float heights: equates into IAR2 (see BIGTBL)
bigPP = $fd00
bigPX = $fd2d
bigPU = $fd5a
bgPIT = $fd87
bgYT = $fd94
bgBST = $fda1
bobT = $fdae
bigSlT = $fdce
bigPI = bgPIT - $2d
bigYT = bgYT - $2d
bigBST = bgBST - $2d
; ...and each rung's ball centre, in rows above its floor anchor: the hover is h minus this (oSvY)
svCtrBT: !byte 20,16,12,10,8,6,5,3,2
svCtrT = svCtrBT - $24


   ; bitmap offset per entity; 0 = the orb's art
orbHidT: !byte 0,0,0,0,0,0,0,0,0,0
   ; which idol each slot is, $ff = none
   ; the build's hidden flags, for objInit
   ; where objInit puts them back on a restart

; Did this entity take a sprite slot last frame -- which is exactly "is any pixel of it on
; screen", the observation test the angels freeze on. Sized like orbXCT so the HOLE's index,
; which shares oidx, lands somewhere harmless rather than past the end.
orbSeenT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
ohHiB:  !byte 0                 ; occStamp's binary search: the upper bound
; CONEGATE: the cone's verdict per entity, rebuilt by entGate every frame it runs. Sized like
; orbSeenT, so the hole-likes' indices -- which share oidx -- land inside it.
cnOkT:  !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0



angAccT: !byte 0,0,0,0,0,0,0,0,0,0   ; 60ths banked toward this angel's next step
angLabT: !byte 0,0,0,0,0,0,0,0,0,0   ; BFSJIT: cells the last fill expanded before reaching this angel

orbExpT: !byte 3,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,3,0,3,0,3,0,3,0,0,0,0,0,0,3,0,3,0,3,0,0,0
orbXOffT: !byte 1,0,1,0,1,0,6,6,6,6,6,6,6,6,6,6,1,1,1,1,1,1,1,6,6,6,6,6,6,6,6,6,6,6,6,6,0,0,1,6,6,7,6,6,6,0,6,0,6,0,6,0,6,7,6,6,6,7,0,6,1,7,1,7,6,7
orbYBaseT: !byte 108,108,108,108,108,108,129,129,129,129,129,129,129,129,129,129,108,108,108,108,108,108,108,129,129,129,129,129,129,129,129,129,129,129,129,129,108,108,108,129,129,129,129,129,129,108,129,108,129,108,129,108,129,129,129,129,129,129,108,129,108,129,108,129,129,129
orbYCapT: !byte 238,234,232,228,224,220,238,236,235,233,231,229,227,225,223,221,212,212,212,212,212,212,212,233,233,233,233,233,233,233,233,233,233,233,233,233,230,222,216,233,230,227,225,222,220,212,233,212,233,212,233,212,233,233,233,233,233,233,236,237,230,234,226,232,232,231
orbBlankT: !byte 0,4,6,10,14,18,0,2,3,5,7,9,11,13,15,17,-42,-36,-30,-24,-18,-12,-6,-21,-18,-15,-12,-9,-6,-3,0,3,7,9,12,15,8,16,22,5,8,11,13,16,18,-84,-42,-62,-31,-42,-21,-26,-13,-9,-6,0,3,6,2,1,8,4,12,6,6,7
orbAnchT: !byte 42,42,42,42,42,42,21,21,21,21,21,21,21,21,21,21,42,42,42,42,42,42,42,21,21,21,21,21,21,21,21,21,21,21,21,21,42,42,42,21,21,21,21,21,21,42,21,42,21,42,21,42,21,21,21,21,21,21,42,21,42,21,42,21,21,21

; REMOVED 2026-09-26, nothing in the image named it: orbHgtT: sprite height per variant, 21 or 42. Nothing read it; it is one shift from ORBEXP.
angVarT: !byte 35,35,35,35,35,35,35,35,35,34,34,34,34,33,33,33,33,32,32,32,31,31,31,31,30,30,30,29,29,29,29,28,28,28,27,27,27,27,26,26,26,26,25,25,25,24,24,24,24,23,23,23,23,23,22,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20,20,20,19,19,19,19,19,19,19,19,18,18,18,18,18,18,18,17,17,17,17,17,17,17,16
bltVarT = $ee40             ; the ball lightning's h -> rung: in IAN1, behind its bitmaps
bigVarT = $eea2             ; ...and the BIG angel's, behind that, cut at BIGVAR_N (omVarG clamps)

; ---- ENTCONE: the bearing of a cell delta, and how wrong it can be ----
; 64 + 32 bytes of PURE GEOMETRY. atan2 of a cell delta is the same on every level, so unlike
; the old holeSeeT this costs no per-level bytes, ships once with the engine, and cannot go stale.
; First quadrant only, stride 8, both magnitudes 0..7; the other three come from the signs.
coneBQT: !byte 0,0,0,0,0,0,0,0,64,32,19,13,10,8,7,6,64,45,32,24,19,16,13,11,64,51,40,32,26,22,19,16,64,54,45,38,32,27,24,21,64,56,48,42,37,32,28,25,64,57,51,45,40,36,32,29,64,58,53,48,43,39,35,32
; Indexed by Chebyshev distance. 29 is half the cone (atan(3/4), ENTFOV's own verified bound,
; plus two units); the rest is how far the cell-centre bearing can be from the true one -- the
; player's 0.707 of slack inside their own cell, and the rounding the >>1 folding introduces.
; Entry 0 and 1 are never read: the test bails out below distance 2, where no tolerance is safe.
coneTolT: !byte 127,127,44,39,37,36,35,34,41,40,39,38,37,37,36,36,39,39,38,38,37,37,37,37,36,36,36,36,35,35,35,35
arcOvSpT: !byte 
        ; ---- which ladder each kind uses: rung finder, yBase, ptr, flag, xOff ----
        ; 0 = the exit hole, 1 = an empty socket, 2 = an orb seated in one. hlSet indexes this
        ; instead of carrying three copies of the same six stores.
; Five kinds now: exit, socket empty, socket seated, pedestal empty, pedestal seated. The two
; pedestal rows are IDENTICAL -- seating changes only hlFill, not the shape -- and they are both
; here so that "seated is the next kind up" stays one adc #1 in hlSet for every seatable thing.
hlK5T:  !byte 0,7,14             ; seven entries a kind (five + the probe box's two)
        ; The sixth operand -- this kind's rung -> rows table -- is patched from hlVisL, which
        ; sits with the tables themselves; this block has four spare bytes. Low byte only: they
        ; share a page, and the build checks that they still do.
hlSrcL: !byte <hlRungH,<holeYBaseT,<holePtrT,<holeFlagT,<holeXOffT,<holeBoxLT,<holeBoxRT
        !byte <hlRungS,<sockYBaseT,<sockPtrT,<sockFlagT,<sockXOffT,<sockBoxLT,<sockBoxRT
        !byte <hlRungP,<pedYBaseT,<pedPtrT,<pedFlagT,<pedXOffT,<pedBoxLT,<pedBoxRT
hlSrcH: !byte >hlRungH,>holeYBaseT,>holePtrT,>holeFlagT,>holeXOffT,>holeBoxLT,>holeBoxRT
        !byte >hlRungS,>sockYBaseT,>sockPtrT,>sockFlagT,>sockXOffT,>sockBoxLT,>sockBoxRT
        !byte >hlRungP,>pedYBaseT,>pedPtrT,>pedFlagT,>pedXOffT,>pedBoxLT,>pedBoxRT

; ---- fdGlyph: carry the floor's dither THROUGH the ramps and steps ----
; Dithering BLANK alone leaves an 8-pixel stairstep along every wall base: the cell where floor
; meets wall is a ramp, its lower half is ground at bit pair 00, and that half stayed flat while
; everything around it went dark. So the same checker has to land on the 00 pairs of every ramp
; and step glyph -- codes 2..198 -- in charset B.
;
; NOT REVERSIBLE IN PLACE, which is what decides the shape of this. The outline trick (seamEdge)
; can undo itself because the ramps hold ZERO bit pair 10, so anything that is 10 was put there
; and can be taken away. Here the dither is pair 01, which is exactly what a ramp's WALL pixels
; already are -- a 01 we added is indistinguishable from one that was always there. So a level
; that does not want the dither cannot subtract it; it has to REBUILD from charset A.
; That is affordable because cpChr's relationship still holds: B is A with the low three bits of
; the index flipped, so rebuilding is a copy with the rows reversed.
;
; fdWas remembers what charset B currently holds, so this runs on a CHANGE of state, not on
; every arrival -- walking 5,6,7 or walking 1,2,3,4 costs nothing after the first.
fdGlyph:lda fdWant
        cmp fdWas
        beq fdGDn               ; charset B already says what this level wants
        sta fdWas
        lda #$c5
        sta fdCnt               ; ...and that is ALL this does now -- no pointers. See fdGlTk.
fdGDn:  jmp fdGEnd              ; ...which decides whether anything will ever TICK this. Was a
                                ;   plain "jmp seamEdge"; the redirect is free, where a call at
                                ;   the boot site was three bytes a full block did not have.

; ---- fdGlTk: the rebuild, 13 glyphs at a time, once per landing frame ----
; All 197 in one call is about 108,000 cycles -- five or six frames of stall, and it showed as
; a hitch a few frames into the landing however it was scheduled. The pointers and the counter
; were already the whole of the state, so slicing it costs a wrapper and nothing else.
; SAFE HERE because charset B is not read between the end of the overlap window and the moment
; the new room's horizon rises into region 3: the rim comes from an arc block and the room's
; ceiling half from charset A. It must not start EARLIER than the window's end, though -- the
; buffer on display through the window still holds the drop's last frame, whose cells are
; charset B's, and re-dithering them under it is the bug this was moved off the handover to fix.
fdGlTk: lda #$0d      ; the per-frame slice; fdGlFl enters below with $ff, and a slice
fdGlF2: sta fdSlc               ;   that big is a flush
        lda fdCnt
        beq fdGtD
        lda #$00                ; NOT in X. The glyph body's second instruction is "ldx #$00" --
                                ;   X is its fdBuf index -- so a slice counter there is destroyed
                                ;   before it is ever tested, dex/bne always loops, and it runs
                                ;   all 197 glyphs in one call: the whole stall, straight back.
        ; ---- THE POINTERS ARE REBUILT EVERY TICK, and fdCnt is the only thing that crosses a
        ; frame. They used to be set once by the arm and carried, which is fine for a routine
        ; that runs to completion inside one call and fatal for one spread over sixteen frames:
        ; fdA/fdB are zero page and shared -- arcBld uses the same pair -- so anything running
        ; between two ticks moved the destination, and the loop wrote glyphs over whatever it
        ; then pointed at. A hard freeze, a few rows into the sweep.
        ; The glyph to do next is CELLCODES - fdCnt: 201 - 199 = 2, the first cell code.
        sta fdA+1
        lda #$c7
        sec
        sbc fdCnt
        asl
        rol fdA+1
        asl
        rol fdA+1
        asl
        rol fdA+1               ; index * 8; a code is a byte, so no carry out
        sta fdA
        sta fdB                 ; both charsets are 2KB apart, so the low byte is shared
        lda fdA+1               ; no clc: index*8 is at most $640, so the last rol left C clear
        adc #$c0
        sta fdA+1               ; ...and $c0 + 6 does not carry either, for the add below
        adc #$08
        sta fdB+1
fdGl:   ldy #$07                ; A's rows 7..0 into the buffer in B's order (y EOR 7)
        ldx #$00
fdCp:   lda (fdA),y
        sta fdBuf,x
        inx
        dey
        bpl fdCp
        ldy #$07
fdDi:   lda fdBuf,y
        sta fdT                 ; ---- set the checker's bits on the pairs that are 00 ----
        and #$55                ;   lo bits
        sta fdT2
        lda fdT
        lsr
        and #$55                ;   hi bits, brought into line
        ora fdT2                ;   1 at the low bit of every NON-00 pair
        eor #$55                ;   ...so this is 1 at every 00 pair
        and $c800,y ;   the checker, already masked by the level -- BLANK's own
        ora fdT                 ;   glyph was written from it a moment ago, so it is the mask
        sta (fdB),y
        dey
        bpl fdDi
        lda fdA                 ; on to the next glyph, both pointers
        clc
        adc #$08
        sta fdA
        bcc fdG1
        inc fdA+1
fdG1:   lda fdB
        clc
        adc #$08
        sta fdB
        bcc fdG2
        inc fdB+1
fdG2:   dec fdCnt
        beq fdGtD
        dec fdSlc
        bne fdGl
fdGtD:  rts

        * = $ab48
; ---- fwGenB: build THIS frame's row map, instead of storing forty of them ----
; Was fRowT: 40 blocks x 32 bytes = 1,280, every one of them "src = row + k" outside a single
; run of $ff at one end. Now four 40-byte tables and the 25 rows generated on entry to fdWarp.
; ~500 cycles per animation frame of a fall, against nothing per rendered frame -- see fRowPack.
; fwBlk is a FIXED buffer, so both readers -- fdWarp's row loop and fdNoF's landing fill --
; index it directly; they used to share fdWarp's patched operand to find the block of the frame.
fwGenB: ldx apT
        lda fKT,x
        sta fwK
        lda fLoT,x
        sta fwLo
        sta fwBlk+26            ; ...and offset 26, the landing's first room row: same number
        lda fHiT,x
        sta fwHi
        lda fNT,x
        sta fwBlk+25            ; offset 25 is where content stops, as it was in the table
        ldy #24
fwGl:   tya
        cmp fwLo
        bcc fwG255              ; before the content starts
        cmp fwHi
        beq fwGok
        bcs fwG255              ; ...or after it ends
fwGok:  clc
        adc fwK                 ; src = row + k, k signed
        jmp fwGst
fwG255: lda #$ff
fwGst:  sta fwBlk,y
        dey
        bpl fwGl
        rts
fwK:    !byte 0
fwKd:   !byte 0                 ; the offset the displayed drop frame was drawn at
fwLo:   !byte 0
fwHi:   !byte 0
fKT:    !byte 0,1,3,5,7,9,11,13,15,17,19,21,22,23,25,26,28,29,0,0,0,232,234,235,237,238,240,241,242,244,246,248,250,252,254,0,0,0,0,0
fLoT:   !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,25,25,25,24,22,21,19,18,16,15,14,12,10,8,6,4,2,0,0,0,0,0
fHiT:   !byte 24,24,24,24,24,22,20,18,16,14,12,10,9,7,6,4,2,0,0,0,0,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24

; ---- an origin with nothing after it: lateLoad, then dpCand/dpDiag, lived here ----
; [origin folded into the run above by compact.mjs]
; (LATE went 2026-10-05; dpDiag became seeDiag, in the main block beside takePick, 2026-10-27.)


; ---- $6e00: WHERE THE LIVE LOADER IS PARKED ----
; NOT a second build of Krill. That was tried and it hangs: the protocol is STATEFUL across
; loads, and a pristine copy has none of the state install() and the boot's own loads left in
; the live one -- the drive simply does not answer it, and the resident spins at $6ec7 for ever.
; So there is ONE resident, the boot's, built for $0400. entry copies it up here before the
; first frame writes stackLT over it, and llName (klUn) copies it back down to run it. It keeps its
; address and its state, and what it clobbers on the way back is per-frame scratch.
        * = $813f
krillRt: !fill 251, 0
        * = $4a95
; ---- klPark / lvlLoad: THE LEVEL COMES OFF THE DISK ----
; klPark saves Krill's live resident before the renderer's span stack overwrites $0400. It is the
; ONLY copy that works -- the protocol is stateful across loads and the drive is talking to this
; one; a second pristine build at another address hangs waiting for a reply that never comes.
; ONCE PER POWER-ON, NEVER AGAIN. Entry runs on every death restart too (dshFir is "jmp entry"),
; and by then $0400 is the renderer's span stack: re-parking copied stackLT/stackRT over the live
; loader's code, and the NEXT disk load ran the stack as code and hung on a black screen
; (2026-10-04: die once on level 3, then drop to 4). klParked is DATA, not an equate: the death restart's
; "jmp entry" reloads nothing, so an emitted 0 is the only initialisation a restart never repeats.
klPark: lda klParked
        bne kpDn
; compact.mjs puts the code that zeroes its promoted zero-page buffers at the marker. They used to
; be scratch INSIDE the image, which loads as zeros, and some code reads one before writing it.
; Once per power-on, like the park: a restart never re-zeroed them before either.
; @ZPCLEAR
        lda #$00                ; ZPCLEAR: zero page from $02, all but the loader's
        ldx #$02
zpcLp:  cpx #$e0
        bcc zpcSt
        cpx #$e7
        bcc zpcNx               ; Krill's range: its resident is live during play
zpcSt:  sta $00,x
zpcNx:  inx
        bne zpcLp
        ldx #$00
kpL:    lda $0400,x
        sta krillRt,x
        inx
        cpx #$fb
        bne kpL
        inc klParked
kpDn:   rts
klParked: !byte 0

; lvlLoad: A = the level to bring in. Called from fallMid, in the drop's black middle (where lvlSwap
; was). With one slot there is nothing to exchange, so the arriving level is simply read over the
; departing one, and fallMid renders the destination whole once this returns. It BLOCKS,
; deliberately: the screen is black and nothing else is drawn until the landing.
lvlLoad:
        pha
        jsr lxOff               ; LEVEL CODE: the departing level's is about to be read over
        pla
        cmp #$fe                ; THE END is not a level: endGo loads the ending instead
        beq endGo
        ora #$30                ; the file is ILV<n>: the level number IS its last character,
        sta nILV+3              ;   so choosing a level is one byte of self-modification
        jsr llName
        jsr lxOn                ; LEVEL CODE: the arriving level's, if it brought any
; ---- lvlArt: and the LEVEL ART at OVLBASE, if the arriving level wants the other set ----
; The pedestal and the idol (IAR0) or the sentry's frames 2-3 (IAR1) -- see ART_SETS. Loaded with
; the level, by the same resident under the same blanked display, by renaming the one name buffer
; as endGo does. lvlArtT is 0 for a level that uses neither, which keeps whatever is in place.
        lda lvlArtT
        beq laDn
        cmp artCur
        beq laDn
        sta artCur
        sta nILV+3
        lda #$41                ; 'A'
        sta nILV+1
        lda #$52                ; 'R'
        sta nILV+2
        jsr llName
        lda #$4c                ; 'L'
        sta nILV+1
        lda #$56                ; 'V'
        sta nILV+2               ; ...and back to ILV for the next level
laDn:
        lda lvlAnT              ; ---- ...and over the ANGEL's ladder: IAN0 (the angel's) or IAN1 ----
        cmp anCur               ;   (the big angel's overflow, see BIGAN), the same way
        beq lnDn
        sta anCur
        sta nILV+3
        lda #$41                ; 'A'
        sta nILV+1
        lda #$4e                ; 'N'
        sta nILV+2
        jsr llName
        lda #$4c                ; 'L'
        sta nILV+1
        lda #$56                ; 'V'
        sta nILV+2
lnDn:
        rts
; artCur is DATA, not an equate: an emitted value is the only initialisation
; a death restart (jmp entry, which loads nothing) never repeats -- and the art does stay loaded.
artCur: !byte $30
fluteGot: !byte 0               ; 1 once the flute is taken (LEVEL_FLUTE). DATA for the same reason: a death
                                ;   restart reloads nothing, so it is never reset -- and the ending reads it
   ; the level art set this level wants (see lvlArt)
   ; ...and over the angel's ladder: IAN0, or IAN1 the big angel's overflow
anCur:  !byte $30                ; IAN0: level 1, the boot level, has the ordinary angel
   ; the ball lightning's entity ($ff none)
   ; ...and its thrower
; ---- THE LEVEL-CODE VECTORS (see LX_FEATURES) ----
; The engine calls level code only through these. Each is a jmp: into the module's jump table at
; LXAT while a level that brought code is live, at lxNone otherwise. lxOff stubs them before a load
; reads over the module, the IRQ's FIRST; lxOn points them back, the IRQ's LAST -- each with
; interrupts masked, because a jmp whose two address bytes disagree for one instruction is a crash.
; They start out pointing wherever level 1, the boot level, needs: its module rides in IMG with its tables.
lxVec:
lxTick: jmp $67f4
lxStep: jmp $67f7
lxInit: jmp $67fa
lxSock: jmp $67fd
lxWr:   jmp $6800
lxLook: jmp $6803
lxSfx:  jmp $6806
lxBgY:  jmp $6809
lxBgPt: jmp $680c
lxBgFar:jmp $680f
lxBgOcc:jmp $6812
lxDot:  jmp $6815
lxBgAim:jmp $6818
lxBur:  jmp $681b
lxHaz:  jmp $681e
lxBye:  jmp $6821
lxNone: rts
lxOff:  jsr lxBye               ; the departing level undoes what it did to the SHARED art (the
                                ;   charset, the orb ladder) while its code is still here to do it
        php
        sei
        ldy #$00
lxOfL:  lda #<lxNone
        sta lxVec+1,y
        lda #>lxNone
        sta lxVec+2,y
        iny
        iny
        iny
        cpy #48
        bne lxOfL
        plp
        rts
lxOn:   lda lvlLxT
        beq lxOnD               ; no level code: the stubs stay
        php
        sei
        ldy #45
lxOnL:  tya
        clc
        adc #<$67f4
        sta lxVec+1,y
        lda #>$67f4
        adc #$00
        sta lxVec+2,y
        dey
        dey
        dey
        bpl lxOnL
        plp
lxOnD:  rts
   ; 1 = this level brings code (at LXAT)
   ; per socket: the lxSock event it starts (a stage, a closer), 0 = none
llName:
        lda $99                 ; the three KERNAL bytes the resident reads and the engine owns
        sta llZP
        lda $9a
        sta llZP+1
        lda #$00
        sta $99                 ; DFLTN: input from the keyboard
        lda #$03
        sta $9a                 ; DFLTO: output to the screen
        lda #$08
        sta $ba                 ; FA: the drive to talk to
        ldx #$00                ; the loader back where it was built to run
klUn:   lda krillRt,x
        sta $0400,x
        inx
        cpx #$fb
        bne klUn
        lda $d011               ; DEN off across the transfer: badlines and sprite DMA steal the
        and #$7f                ;   (bit 7 is the raster's ninth bit when READ: never restore it -- see fallMid)
        pha                     ;   cycles the serial handshake needs, and the fall is on screen
        and #$ef
        sta $d011               ; (LLDEN=1, a test: leave the display ON -- can Krill load under badlines?)
        ldx #<nILV
        ldy #>nILV
        jsr $0400   ; = loadraw, at the address it was assembled for
        tax                     ; the status, across the $d011 restore
        pla
        sta $d011
        txa
        sta llErr               ; carry set means it did not arrive; llErr is for probing
        lda llZP
        sta $99
        lda llZP+1
        sta $9a
        rts
nILV:   !byte $49,$4c,$56,$31,0   ; NAME_BUF: see nmFits
llZP:   !fill 2, 0              ; DFLTN, DFLTO
llErr:  !byte 0

; ---- endGo: THE END. The player fell through the last hole; the game stops here for good ----
; Called in the drop's black middle, display off. The ending is loaded exactly as a level is -- the
; same live resident, the same name buffer renamed IEND -- and jumped into; it takes the machine
; (interrupts, sprites, sound) and never comes back. Its own REBOOT reloads the game for the next go.
endGo:  sei
        lda #$45                ; 'E'
        sta nILV+1
        lda #$4e                ; 'N'
        sta nILV+2
        lda #$44                ; 'D'
        sta nILV+3
        jsr llName
        bcs egFail
        jmp $cc00             ; IEND's qStart
egFail: lda #$02                ; RED border, display on: the ending did not load
        sta $d020
        lda #$1b
        sta $d011
egF:    jmp egF



        * = $8f9f
; One bit per (orb, run): is the orb BEYOND that face's plane, hence occluded by it. A constant,
; because the test does not involve the camera at all -- see the data layer above.
; (orbOccT, the per-entity occluder masks, lived here. Gone: occBy answers the facing rule when asked.)

atanQT: !byte 0,3,5,8,10,13,15,18,20,23,25,28,30,33,35,38,40,42,45,47,49,52,54,56,58,61,63,65,67,69,71,74,76,78,80,82,84,85,87,89,91,93,95,96,98,100,102,103,105,106,108,110,111,113,114,116,117,119,120,121,123,124,125,127,128
dieFadeT: !byte 0,0,0,1,1,1,2,2,2,3,3,3,4,4,4,5
darkerT: !byte 0,15,11,12,11,12,0,15,11,0,12,0,11,15,12,12
; ---- the death cut scene's charset and its 40x25 of codes ----
; EMITTED INTO THE IMAGE, deliberately, not placed with --seg. A placed segment decodes BEFORE
; the main stream, and $7100 sits inside the main stream's own staged copy -- so the face was
; overwriting the compressed bytes the main decode then read, and the program never started.
; Every other placed segment targets $c000 or above, clear of the staging area. That is the rule.
; ONLY THE CHARSET LIVES HERE NOW. The MAPS all ship as IPIC in bank 3 (see PICSEG): a map is
; 1,000 bytes the CPU copies to a screen, so it wants to be on the CPU-reachable side of the I/O
; hole, and moving the first one out is what freed the page-aligned kilobyte at $7900. The
; charset stays because it is 2,048 and there is no 2K of bank 3 left to put it in -- and it is
; read exactly once, by dieSwap, straight into charset B's slot.
        * = $7ad5
faceChrT: !byte 255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,127,255,255,255,255,245,213,220,80,255,255,255,215,85,16,1,65
        !byte 255,255,255,255,95,87,23,5,255,255,255,255,253,245,213,212,255,255,215,85,65,72,34,36,255,255,223,85,69,0,168,0
        !byte 255,255,255,255,127,95,31,23,255,255,255,255,253,245,245,213,255,255,255,127,85,21,64,84,255,255,255,255,87,85,37,5
        !byte 255,255,253,255,253,212,213,84,81,93,213,65,1,5,7,55,5,85,127,255,127,255,255,255,87,209,245,221,245,119,253,255
        !byte 255,127,127,127,255,127,127,255,255,255,255,255,253,253,253,253,246,80,81,209,197,87,87,29,20,52,212,212,196,101,133,95
        !byte 80,53,29,95,71,87,81,93,23,5,85,85,223,117,245,116,255,255,255,255,255,127,127,95,245,245,87,87,247,93,119,223
        !byte 84,117,223,127,247,255,255,223,17,84,69,65,82,212,245,253,255,95,23,95,85,5,7,65,255,255,255,253,255,247,245,245
        !byte 116,81,215,84,196,1,25,17,127,215,95,127,93,127,255,223,125,255,255,255,253,255,255,255,247,247,253,255,247,247,245,223
        !byte 127,63,127,127,127,63,127,127,212,221,247,223,213,255,245,247,93,95,127,127,253,117,252,244,253,125,213,252,244,216,104,229
        !byte 255,95,93,63,31,7,133,71,125,245,253,125,253,95,125,87,95,119,215,255,95,95,87,69,127,221,119,95,127,93,119,87
        !byte 253,255,255,223,255,255,255,223,221,255,253,127,247,255,255,247,65,80,212,116,69,208,112,212,127,95,95,95,151,23,79,69
        !byte 255,255,255,255,255,255,253,255,253,212,212,244,81,213,71,84,19,87,87,247,223,87,23,31,253,223,127,255,119,127,247,127
        !byte 247,255,255,247,255,255,223,255,245,215,245,245,117,245,253,213,127,127,127,127,255,127,127,127,87,119,255,215,95,127,95,247
        !byte 252,213,125,85,93,93,125,93,71,65,73,89,87,125,83,81,243,213,65,69,87,255,213,83,127,247,247,119,255,125,247,127
        !byte 125,221,93,85,215,247,247,127,127,213,95,85,127,213,87,117,253,255,255,223,255,255,125,255,244,117,253,221,255,221,255,247
        !byte 69,81,209,117,28,13,103,65,255,127,127,255,95,127,95,55,255,253,253,253,255,247,245,253,84,80,80,208,64,65,1,1
        !byte 31,55,87,119,215,93,85,221,119,127,223,127,221,247,223,127,119,255,255,223,125,255,127,255,213,244,252,213,245,125,245,253
        !byte 95,95,95,95,95,23,7,87,255,255,255,253,245,212,213,247,221,221,117,117,21,7,95,255,191,159,191,191,191,159,191,159
        !byte 88,193,213,255,255,127,215,125,3,83,119,255,255,223,223,255,245,253,253,245,255,253,247,247,213,85,117,21,128,66,80,209
        !byte 255,127,127,127,127,87,23,247,255,255,253,253,253,255,244,245,223,85,93,71,87,85,23,5,247,127,255,127,247,127,125,223
        !byte 119,255,255,255,223,255,255,255,125,255,223,125,253,119,255,247,88,192,80,208,240,116,112,117,23,23,151,23,31,5,5,5
        !byte 255,255,255,255,255,255,127,127,127,255,255,255,255,255,255,255,213,213,215,213,85,213,85,85,5,37,5,148,21,21,85,213
        !byte 93,221,221,245,221,85,93,87,215,127,93,223,93,119,95,213,119,125,255,119,255,95,255,253,221,245,253,223,245,127,253,247
        !byte 101,69,65,8,65,210,74,212,255,255,255,127,127,95,29,149,245,245,253,245,247,85,85,93,127,253,213,208,66,32,106,0
        !byte 31,31,63,63,63,95,255,255,215,213,213,85,119,85,85,85,127,127,221,221,221,245,209,85,255,253,247,253,255,255,253,127
        !byte 221,255,119,65,81,85,93,253,119,87,95,223,23,65,209,117,255,255,255,255,255,127,93,221,245,245,214,212,80,88,96,32
        !byte 31,19,5,53,23,23,21,85,253,95,127,215,253,127,221,95,221,255,127,221,253,223,255,247,253,223,255,221,253,95,253,127
        !byte 245,125,119,253,247,93,221,119,7,65,97,195,81,209,112,117,255,127,127,127,255,95,127,95,253,253,255,253,247,245,253,253
        !byte 119,213,209,193,64,1,64,80,85,65,5,5,13,13,149,13,29,5,5,5,5,133,7,3,213,213,213,213,197,247,255,127
        !byte 95,247,223,119,215,213,223,255,255,247,255,127,221,247,255,255,116,213,85,245,245,255,117,255,37,33,137,5,127,87,92,210
        !byte 117,87,87,255,245,85,41,160,1,87,245,125,124,212,71,13,255,247,255,61,20,85,81,200,93,117,193,1,64,81,213,119
        !byte 83,87,67,81,71,213,213,221,255,255,255,117,253,125,125,85,84,244,84,29,157,29,80,240,31,129,81,117,15,37,74,42
        !byte 85,66,72,8,83,93,125,141,4,5,129,5,1,1,1,5,95,117,31,85,87,221,245,93,119,221,221,215,85,119,245,223
        !byte 223,253,223,221,215,127,255,255,247,253,247,223,221,221,247,117,93,223,93,223,93,223,119,127,125,93,21,80,4,16,0,64
        !byte 127,55,23,95,95,5,23,23,253,255,253,253,245,245,253,247,0,96,64,64,192,64,192,64,21,29,23,23,31,87,87,85
        !byte 85,5,20,80,241,208,212,113,85,85,85,87,85,85,85,85,253,125,223,117,93,119,127,223,255,247,255,247,255,119,255,93
        !byte 255,253,127,247,253,253,220,252,90,106,42,42,138,170,169,160,168,21,128,161,133,84,74,41,64,118,84,81,215,127,244,214
        !byte 74,0,80,192,88,80,37,32,133,130,32,33,20,141,41,80,65,162,40,106,21,80,170,26,4,128,0,1,0,0,128,0
        !byte 80,0,84,64,213,253,125,151,106,234,106,106,74,234,106,106,161,161,161,136,40,162,40,96,127,87,13,215,119,85,53,29
        !byte 223,93,85,117,247,245,119,221,223,87,215,85,85,215,93,253,221,255,117,247,87,223,119,221,215,245,221,221,95,87,127,215
        !byte 127,127,245,119,125,247,245,125,81,64,80,208,192,208,208,240,23,55,23,23,63,23,21,29,247,247,255,253,221,221,221,221
        !byte 65,1,97,67,65,71,65,212,81,81,65,80,81,64,73,64,245,119,127,127,125,119,245,213,87,213,21,21,65,71,71,87
        !byte 95,221,223,93,87,85,95,213,247,223,223,223,255,253,255,223,244,244,246,244,240,240,210,208,164,130,170,42,8,41,167,141
        !byte 161,175,29,61,245,253,93,77,98,34,162,34,170,42,170,34,138,138,136,138,42,138,40,8,61,135,9,138,134,162,168,41
        !byte 73,32,166,146,24,90,10,106,42,42,40,10,8,42,42,8,161,168,40,168,170,170,170,170,218,242,124,125,31,63,93,85
        !byte 170,170,170,170,74,210,198,192,181,157,135,143,135,167,165,167,223,213,117,117,127,127,95,125,253,221,221,85,117,85,93,77
        !byte 117,117,117,84,117,92,117,116,95,247,255,127,127,119,127,125,215,119,213,119,85,221,85,215,213,116,213,124,221,221,119,119
        !byte 21,13,141,13,7,7,67,81,221,245,213,253,213,221,220,244,209,208,65,64,1,1,0,36,21,170,170,85,223,255,255,255
        !byte 17,1,17,5,17,1,5,5,93,223,253,245,93,215,85,69,93,255,245,247,245,119,245,85,255,221,127,127,247,127,253,221
        !byte 210,218,201,67,79,29,125,124,60,126,208,208,34,42,42,170,167,163,167,167,167,167,167,167


; ---- four COLD routines, rehoused out of the block under $a900 ----
; They sat beside arcBld with the hazard tables, and level 5's real design pushed that block
; 96 bytes over. Each runs a handful of times per FALL, so none had any claim on contested
; space; this is the run the packed cut-scene charset leaves ahead of the ladder tables, which
; FALLNOW's scratch already uses the same way. VISTAB's guard says if it stops fitting.
; ---- fdBlw: what fills the rows BELOW the arc, which is not one answer ----
; On a DROP it is the hole, and region 3 down there reads the arc's own block, so it is the
; block's code. On a LANDING it is the gap between the arc and the room, and every region below
; the arc's bottom is a CHARSET -- so it has to be the charset's ground, BLANK. The arc block's
; ground code is 234, which in charset A is a seam glyph.
fdBlw:  lda arcBlw              ; drop: the hole, in the arc's own block
        ldy arcInv
        beq fdBlwS
        lda #$00       ; landing: the charset's ground. NOT a branch on this value --
fdBlwS: sta fdCol               ;   BLANK is zero, and the obvious "bne" never fires.
        rts


; ---- fdSpl: a drop's fill band crosses the arc's top, so it is TWO fills ----
; The band runs from the frozen scene down to the arc's FOOT, and region 3 -- with its own
; dictionary -- begins at the arc's CROWN. Every column whose rim is lower than the crown
; therefore has fill rows below the split, where charset B's ground code is sprite data.
; Does the first fill itself and hands the caller the count for the second, so the main block
; pays three bytes for this: it has no headroom left.
fdSpl:  ldy arcInv              ; A is the row count and the landing path leaves it alone; the
        bne fdS1                ;   drop path computes both of its own from arcHi/fwN/arcTopC,
                                ;   so nothing has to be stashed across the branch
        lda arcTopR             ; the split row, clamped into the band
        cmp fwN
        bcs fdSa
        lda fwN
fdSa:   cmp arcHi
        bcc fdSb
        lda arcHi
fdSb:   sta arcTopC
        sec                     ; ...the rows above it, in charset B's own ground code
        sbc fwN                 ;   (no zero test: fdFill's own first act is one)
        jsr fdFill
        lda #$f7    ; ...and the rest in the arc block's, fdD having walked there
        sta fdCol
        lda arcHi
        sec
        sbc arcTopC
fdS1:   rts


        ; ---- rung -> rows on screen, the one thing occStamp cannot derive for a socket ----
        ; See visRows. Anchored just below the run tables, in the tail the packed cut-scene
        ; charset leaves free -- the ladder tables' own block ends exactly at $4000.
        * = $acd5
hlVisL: !byte <exitVisT,<sockVisT,<pedVisT
exitVisT: !byte 21,21,21,21,42,38,32,26,22,18,15,11,8,5,4,2,2,2,2,2
sockVisT: !byte 15,12,11,9,7,6,4,3,3,2
pedVisT: !byte 34,26,18,13,10,8,6,5,4,2

        ; (runByteT / runBitT lived here: a run id as a mask byte and bit. Gone with the masks -- see occBy.)

        * = $7995               ; ---- out of the main code block, into the page faceScrT vacated ----
; moveXT/moveYT were 512 bytes of TABLE sitting inside the code block -- the scarcest resource
; on the machine. Now 320 bytes out of it: the pair shares a page and a quarter (quarterPair).
moveYT: !byte 0,2,3,5,6,8,9,11,12,14,16,17,19,20,22,23,24,26,27,29,30,32,33,34
        !byte 36,37,38,39,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,56,57,58,59
        !byte 59,60,60,61,61,62,62,62,63,63,63,64,64,64,64,64
moveXT: !byte 64,64,64,64,64,64,63,63,63,62,62,62,61,61,60,60,59,59,58,57,56,56,55,54
        !byte 53,52,51,50,49,48,47,46,45,44,43,42,41,39,38,37,36,34,33,32,30,29,27,26
        !byte 24,23,22,20,19,17,16,14,12,11,9,8,6,5,3,2,0,254,253,251,250,248,247,245
        !byte 244,242,240,239,237,236,234,233,232,230,229,227,226,224,223,222,220,219,218,217,215,214,213,212
        !byte 211,210,209,208,207,206,205,204,203,202,201,200,200,199,198,197,197,196,196,195,195,194,194,194
        !byte 193,193,193,192,192,192,192,192,192,192,192,192,192,192,193,193,193,194,194,194,195,195,196,196
        !byte 197,197,198,199,200,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,217,218,219
        !byte 220,222,223,224,226,227,229,230,232,233,234,236,237,239,240,242,244,245,247,248,250,251,253,254
        !byte 0,2,3,5,6,8,9,11,12,14,16,17,19,20,22,23,24,26,27,29,30,32,33,34
        !byte 36,37,38,39,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,56,57,58,59
        !byte 59,60,60,61,61,62,62,62,63,63,63,64,64,64,64,64   ; moveYT runs on into this: see sharedPair

        * = $4c03               ; ---- and the whole readout ----
; 322 bytes of the main block, all of it jsr-only and drawn once a frame -- nowhere near a hot
; path, and the last big thing in there that is not the engine. Moved as ONE run, in order, so
; that drawFps falling through into whatever follows it still does. The only branches that
; reach these labels are computeFps's own (cf1/cfdd/cfo), so nothing outside needs a longer arm.
; All of it is HUD=1 now, but for setRow and ddPut, which the profiler and DIEDBG also draw with.

; ---- readout: fps top-left, X/Y/A top-right ----
; The overlay no longer plots pixels. In the 4x8 scheme a char code is an INDEX into the
; cell-pattern set, not a bitmap, so there is nothing to OR bits into -- instead the last
; 18 codes are literal digit glyphs and the readout just pokes them into screen RAM. That
; also removes the whole class of bug where the overlay reached into renderer tables.


; X/Y as cell.frac hex (1 nibble cell + 2 nibbles fraction of the 8.8 fixed point),
; A = the raw angle byte. Screenshot it to get an exactly reproducible viewpoint.




; ---- idolLk: is the IDOL the thing in your hands? ----
; Called wherever carry changes. It sets one flag and touches nothing else -- the room keeps the
; level's own colours, and the tell is on the SPRITES: see sprPal, where holding the idol tints
; an angel the same brown/orange/yellow that seeing one in the world does.
;
; An earlier cut of this repainted the whole room. It read well but it was wrong twice over: the
; level stopped being recognisable as itself, and the death scene inherited the tint, because
; dieSwap runs against whatever inks were live and lvlLook never gets a chance to put them back.

; ---- sprPal: the two SHARED sprite inks, once a frame ----
; Bit pairs 01 and 11 are one register each for ALL eight sprites, so this cannot be per entity.
; While the idol holds a slot they go brown/yellow, which re-tones every sprite in view and not
; just the idol -- the whole cast catches the light off it. The idol's own body is orange, which
; IS per sprite ($d027+n, from orbColT2), so it stays orange whatever else is on screen.
sprPal: lda sprU                ; whatever lvlLook left for this level...
        ldy sprH
        ldx dieLat              ; ---- the death scene wants the inks to SIT STILL ----
        bne spWSt               ; no idol tint: this is what $d025/$d026 held before any of this
        ldx idolOn              ;   existed, and the scene's fade was written against it. "The
        bne spTint              ;   world no longer goes black correctly."
        ldx idolHd              ; ...or the idol is in your HANDS, which is the tell that the
        beq spWSt               ;   angels have stopped caring whether you are looking
spTint: lda idolU               ; ...or the idol's. The tests are on X, so a black ink (a flag the
        ldy idolH               ;   old "bne ... always" once wrongly trusted) decides nothing.
spWSt:  sta $d025
        sty $d026
        rts
; (The HELD object had a raster split of its own here -- sprSpl, its inks from SPRSPL down -- removed
; 2026-11-12: since the idol tints every sprite while it is held, both halves were always the same.)

idolWk: !byte $00               ;   times a second, and the projection clears-then-sets, so
                                ;   reading the working flag direct would show 0 for any raster
                                ;   frame whose IRQ landed inside the projection -- one bad frame
                                ;   in roughly four, which is exactly the flicker this chases.
idolLat:lda idolWk
        sta idolOn
        lda #$00
        sta idolWk
        rts



; ---- arcBl2: the ARRIVING arc's dictionary, stamped once at boot ----
; Its glyphs are charset B's own, unchanged: the landing's rim is hole-above/floor-below, which
; is the mirror of what the dictionary holds, and charset B IS that mirror. Clean, because the
; surround is the new room's CEILING -- charset B gets dithered later and this must not.
; Called from entry right after cpChr, which is where charset B is clean by construction.
; $d000-$dfff is I/O to the CPU at the engine's $35; $34 shows the RAM the VIC has been reading
; all along. Interrupts off across it -- the raster handler writes $d018 and $d021, and neither
; is there while the port is down.
arcBl2: php                     ; SAVE AND RESTORE THE I FLAG, do not assume it. This runs from
        sei                     ;   entry, before $0314 is pointed anywhere and before $d01a is
        lda #$34                ;   even cleared -- a bare cli here enables interrupts into
        sta $01                 ;   nothing with the KERNAL banked out, and the machine is gone
                                ;   before the first frame. Cost me a black screen.
                                ; The PORT is restored to a literal $35 below rather than saved:
                                ;   cpChr runs immediately above this and reads the charsets as
                                ;   plain RAM, which is only true in $35. Three bytes, and the
                                ;   block was one over.
        lda #<$deb8
        sta fdB
        lda #>$deb8
        sta fdB+1
        ldx #$00
a2Lp:   jsr agPt                ; ...then up two pages, to charset B's copy of the same glyph
        lda fdA+1
        clc
        adc #$08
        sta fdA+1
        ldy #$07
a2Rw:   lda (fdA),y
        sta (fdB),y
        dey
        bpl a2Rw
        jsr agNx
        inx
        cpx #$1f
        bne a2Lp
        lda #$ff                ; the shaft above the rim
        ldy #$07
a2V:    sta (fdB),y
        dey
        bpl a2V
        jsr agNx
        lda #$00                ; ...and the new room's ceiling below it, flat and never dithered
        ldy #$07
a2F:    sta (fdB),y
        dey
        bpl a2F
        lda #$35
        sta $01
        plp
        ; ---- arcMap's entry 0, which arcBld's fill deliberately cannot reach ----
        ; That fill counts DOWN and ends on bne, so it writes 198..1 and never 0.
        ; It cannot use bpl instead -- bpl tests the SIGN bit and the table is 199 long, which
        ; is what the bug was. Index 0 is BLANK, a cell the rim MISSED, and a miss is ground in
        ; both polarities -- a CONSTANT. So it is written once, here, rather than costing three
        ; bytes a fall in a block that is already one over; see the note on that fill.
        lda #$f7
        sta arcMap
        rts

; ...it is HERE, and not beside arcBld and the rest of the arc code, because that block sits
; under $a900 with the hazard tables and level 5's real design pushed it 96 bytes over. This
; routine runs ONCE, at boot, and never again -- so it was the obvious thing to move out of
; contested space. Same reasoning that moved dpCand out of the main block.
        * = $4c7c
; ---- symPut: install SOLID's glyph for the LIVE level, into BOTH charsets ----
; The mark is per level, so it is written at runtime rather than baked into the charset: cpChr
; builds charset B from A at startup with y = x EOR 7, and this symbol is NOT its own vertical
; mirror, so a baked-in A would render it upside down below the horizon. Writing both charsets
; explicitly is what gives an above-horizon and a below-horizon glyph, and it costs nothing at
; all: the two charsets are separate 2K blocks picked by $d018 per raster half, and nothing
; re-derives B after boot. Both get the mark the same way up.
; ...and the level's three inks with it, out of the main block too: they are a table and three
; instructions per ink that some level overrides, and the main block is the tightest resource in
; the project. One jsr at each of the two sites instead.

colT:   !byte $01             ; the TOP region's pending ink. irqB0 is read at the top of
                                ;   the frame and irqB1 at pSplit, so a store that reaches one of
                                ;   them immediately can NEVER reach the other on the same frame:
                                ;   the two halves were a frame apart through the whole death
                                ;   fade, white over the top half while the bottom was still the
                                ;   room and so on down the ramp. Both are published at raster
                                ;   250 now, so both take effect at the same top of frame.
                                ;   NOT colW: colW is the level's ceiling ink and lvlLook sets it
                                ;   the moment a fall hands over, which is a frame before the top
                                ;   of the screen is allowed to change. lvlHi is what moves it.
colF:   !byte $01             ; the FLOOR's ink. colW is the ceiling's now.
sprU:   !byte $0b             ; this level's shared sprite inks, shadowed
sprH:   !byte $0f             ;   because the idol swap borrows the registers
; ---- WHERE EACH IDOL IS: the one piece of state a death does not undo ----
; DATA, not an equate: the death restart is "jmp entry", which
; reloads nothing, so the emitted bytes are the only initialisation these ever get -- and that
; is what makes them survive a restart while everything else goes back to its build state.
; "Everything resets except the idols." One byte each: the level the idol is currently in, or
; $ff while it is in your hands and belongs to no room.
idolLoc: !byte $05,$06,$07
idolU:  !byte $0b             ; the idol's three inks for the LIVE level. lvlLook
idolH:  !byte $0c             ;   rewrites all three on arrival, whether or not they
idolOn: !byte $00               ; the idol is on screen. LATCHED: the IRQ reads this sixty


; lvlBoot: the starting level's whole look. The wall ink lives here rather than at the boot site
; because the main block is the tightest resource in the project and this runs once.
lvlBoot:jsr lvlLook             ; all five inks, then fall through to lvlHi
        jsr lvlSpr              ; ...the sprite inks, which only the FALL defers...
        jsr lvlChr              ; ...and the charset, which it defers differently -- see fdGEnd

        ; fall through to lvlHi: at boot there is no departing level, so all three agree
; lvlHi: the region ABOVE the rim catches up with the rest. Called when the DEPARTING rim has
; finally left the screen -- until then it must keep the colour of the level being left, which is
; the whole point of the split.
lvlHi:  lda colW
        sta colT                ; THE moment the top of the screen is allowed to become the
        rts                     ;   arriving level. irqB1 needs nothing here: it tracks colF
                                ;   through mnext's publish, and lvlLook has already set colF.

; (lvlLo, the region BELOW the rim for the sliced drop, went 2026-11-14: fdSpr sets irqB2 itself.)
lvlLook:
        ldx lvlMeT              ; LEVEL_FLICKER: is this level's light failing? (flkTick)
        lda lvlFlkT-1,x
        sta flkOn
        sta flkDk               ; FLKSPR: a flickering level starts dark
        jsr lxLook              ; LEVEL CODE: the level's own look -- the flicker's empty rectangle
                                ;   (its zero page is whatever a load left) and dark orb shadow
                                ;   (shdIn), level 4's wall mark (symPut). Undone by lxBye.
 ldx lvlMeT             ; indexed by level id - 1; lvlMeT is the level ARRIVED at
        dex
        lda lvlPalceilT,x
        sta colW
        lda #$00
        sta colB
        sta $d022
        lda lvlPalseamT,x
        sta colS
        sta $d023

        lda colW                ; the two regions BELOW the departing rim are this level
        sta colF                ;   now -- but NOT irqB0. The overlap frames still have the old
        sta irqB2+1             ;   level's rim at the top, and lvlHi hands that over later.
                                ; irqB1 is NOT stored here: mnext publishes it from colF at raster
                                ;   250, with the pSplit that says where region 1 begins. Storing
                                ;   it here put the new ground on screen a whole frame before the
                                ;   line that bounds it.
        rts


; ---- lvlSpr: the SPRITE inks, which must not change while the fall is still running ----
; These used to sit in lvlLook, and the fall calls that at the HANDOVER -- ARC_OVERLAP frames
; before the drop has finished drawing. So the idol in your hands changed colour mid-descent and
; then the rest of the level's cast arrived in the same scheme a moment later: two changes where
; there should be one. Called from fstEnd instead, which is the frame the renderer takes the
; screen back and draws the level's own sprites, so the cast and its palette appear together.
; The idol keeps the DEPARTING level's inks for the whole fall, which is what it is wearing.
lvlSpr:  lda flkLit              ; FLKSPR: a lit frame is wearing the cast's NORMAL inks; this
        bne lvSpX               ;   runs every rendered frame and would put the dark ones back
        ldx lvlMeT             ; indexed by level id - 1, as lvlLook is
        dex
        lda lvlSprunderT,x
        sta sprU
        lda lvlSprhiT,x
        sta sprH
        lda lvlIdolunderT,x
        sta idolU
        lda lvlIdolhiT,x
        sta idolH
lvSpX:  rts

; ---- lvlChr: the arriving level's CHARSET, which must NOT happen at the handover ----
; The inks above are per-region and can change the moment the phase does -- there are two $d021s
; for the two levels on screen. The charset is one object for the whole screen, and rewriting it
; at the handover caught the DEPARTING room: the buffer still on display then holds the drop's
; last frame, whose top rows are the old room's own cells, and floorDk/fdGlyph dither code 0 and
; codes 2..200 underneath them. One frame of the arriving level's checker on the floor you just
; left. Deferred to the end of the overlap window, which costs nothing because charset B is not
; read AT ALL while it runs: both rims are drawn from the arc blocks up there.
lvlChr:


        jmp floorDk   ; (level 4's wall mark is its own code now: symPut)
; (level code 'sym' cut here: see LX_SRC)
; ---- setGnd: A -> the ground colour, and the two operands the IRQ paints it from ----
; $d021 is written by the IRQ every RASTER frame now, so a plain "sta $d021" anywhere else
; survives at most 16ms. Everything else that sets the ground -- the death fade, the cut-scene
; pictures -- goes through here, which costs each site nothing: jsr is the same three bytes the
; store was. A is preserved, so a site that also writes $d022 still can.
setGnd: sta colT                ; THE SHADOWS ONLY. Both are published at raster 250, so the two
        sta colW                ;   halves change at the same top of frame instead of a frame
        sta colF                ;   apart -- and there is no mid-frame $d021 store to paint a
        rts                     ;   partial band down the middle of the one it lands in.

; (level code 'close' cut here: see LX_SRC)

; (level code 'curtain' cut here: see LX_SRC)

; (level code 'sink' cut here: see LX_SRC)

; (level code 'flicker' cut here: see LX_SRC)
; ---- the flicker's RESIDENT state: lvlLook, osFlush and lvlSpr read it ----
flkMapT:!byte $00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00
flkDk:  !byte 0                 ; 1 = the bodies wear FLKSPR_MAP (dark), 0 = their own colours
flkOn:  !byte 0                 ; lvlLook: this level's lvlFlkT entry
flkLit: !byte 0                 ; the inks on screen are the LIT ones
lvlFlkT:!byte 0,0,0,0,0,0,0,1,0,0   ; per level id - 1
; (level code 'flicker' cut here: see LX_SRC)
        ; ---- seamEdge has a PAGE of its own now (2026-09-26), and is not in the block below ----
        ; It is 249 bytes and it only exists when a resident level wants the outline -- so with
        ; level 5 in the chain it appeared underneath ORB_SMALL and pushed that whole block down
        ; into a 211-byte code headroom, 89 bytes too far. Nothing about it wanted to be there:
        ; it is COLD, entered once per level entry (lvlChr's tail jmp, or floorDk's), and it fits whole in the page
        ; bndT was holding down on its own. See bndT for the move that freed it.
        * = $4d16
; ---- the idol subsystem lives in the front of seamEdge's page ----
; It was in the main code stream and it ate the last of the code headroom -- CARRY=1 on a
; four-level chain went 48 bytes over. This page holds 256 and seamEdge is ONE byte of it
; while no level asks for the wall/ceiling outline (SEAMCODE, and LEVEL_SEAM is empty since
; level 5 became a stub). The two cannot both live here: turn the outline back on anywhere and
; seamEdge's 249 bytes leave no room, and the "* = $8000" guard below says so at build time
; rather than letting them overlap. Whoever turns it on has to rehome one of them.

; ---- floorDk: the ground's dither, per level, into charset B's BLANK ----
; lvlFloorT holds $ff for a level that wants it and $00 for one that does not, so the same eight
; stores serve both: ANDing the pattern with the flag writes the checker or writes zeros. A
; branch would need a second loop and this is on the level-entry path, not a hot one.
floorDk:ldx lvlMeT
        dex
        lda lvlFloorT,x
        sta fdM+1
        sta fdWant              ; fdGlyph compares this against what charset B already holds
        ldy #$07
fdLp:   lda fdPatT,y
fdM:    and #$00                ; operand patched above: $ff keeps the dither, $00 clears it
        sta $c800,y
        dey
        bpl fdLp
        jmp fdGlyph             ; ...then the ramps and steps, then the wall/ceiling outline
fdPatT: !byte $44,$11,$44,$11,$44,$11,$44,$11
lvlFloorT: !byte $00,$00,$00,$00,$ff,$ff,$ff,$00,$00,$00

; ---- idolLk: what is in your hands, as both a flag and an identity ----
; idolHd is "is it the idol" and drives the gaze and covering rules. idolHand is WHICH idol,
; and unlike carry it survives a fall -- carry indexes the live level's entity table and
; objInit clears it, so idolPlace rebuilds carry from idolHand on the other side.
; Both are derived from carry, so every write to carry must come back through here.
idolLk: ldx #$00                ; assume not
        ldy #$ff
        sty idolHand
        ldy carry
        beq idlPut              ; empty hands
        dey
        lda orbArtT,y           ; 0 = an orb. Only the idol changes the rules.
        beq idlPut
        lda orbIdolT,y          ; ...and WHICH idol, out of this level's slot table
        sta idolHand
        inx
idlPut: stx idolHd
        rts
; WHICH idol is in your hands, $ff for none. Persistent alongside idolLoc and for the same
; reason: carry is an index into the LIVE level's entity table and objInit clears it on every
; arrival, so it cannot survive a fall. This can, and idolPlace rebuilds carry from it.
idolHand: !byte $ff
; ---- and WHERE it is in that level ----
; Presence was persistent and position was not, so an idol left in the middle of the hub was
; back on its pedestal when you returned -- objInit restores every entity's cell from the
; build data and idolPlace only decided whether to SHOW it. These two bytes per idol are
; written when you set it down and applied by idolPlace, so an idol stays where you left it.
; Is this idol standing ON a pedestal? Then its sprite is raised onto the drum's top plane
; instead of the floor. Persistent with the rest: where an idol is includes whether it is up
; on something, and that has to survive leaving the room like its cell does.
idolOnPedT: !byte 0,0,0   ; IDOLLOC drops an idol BESIDE its pedestal,
                                ;   on the floor; only IDOLSEAT starts it up on the drum
; Rows to raise a seated sprite, indexed by ohgt>>1. See PEDLIFT: the pedestal's top plane is
; 2*PEDH*h above the floor at every distance, and h IS the apparent height the projection
; already holds -- so the lift is a fraction of it, not a distance calculation.
pedLiftT = $fc80       ; ...in IAR0, behind the pedestal and idol bitmaps (PEDTBL)
idolXT: !byte $0f,$0e,$07
idolYT: !byte $02,$05,$08
; ---- idolPlace: every idol slot in THIS level, shown or hidden by where the idol is ----
; Runs straight after objInit, which has just restored orbHidT from the build's orbHid0T -- i.e.
; "every idol is at home". This is the overlay that makes that true or false per idol.
; One rule, no per-level special cases: a slot showing idol n is visible exactly when idolLoc,n
; names the level we are in. That covers a room whose idol has been taken (hide it), the hub
; with a delivered one standing on its pedestal (show it), and the slot of an idol that is
; somewhere else entirely (stay hidden) -- the same three lines for all of them.
; blkT is fixed up too: a hidden entity must not block movement and a shown one must.
idolPlace:
        ; The idol in your hands is, by definition, in the level you are in. So the fall does
        ; not have to hand it over -- it just becomes true here, after lvlMeT has become the
        ; destination. That is why nothing was added to the fall's swap bookkeeping, where A,
        ; X and Y are all live and a spare byte is hard to come by.
        ldy idolHand
        bmi ipHands             ; $ff = empty hands, and 0..2 never set bit 7
        lda lvlMeT
        sta idolLoc,y
ipHands:ldx nOrbM1T             ; every entity slot, high to low
ipLp:   ldy orbIdolT,x
        cpy #$ff
        beq ipNext              ; not an idol slot
        ; THREE cases, TWO outcomes: in another level, in this one on the floor, or in this
        ; one in your hands. Held and elsewhere both mean "no world sprite, cell open" -- the
        ; only thing held adds is taking hold of it again -- so they share an arm.
        lda idolLoc,y
        cmp lvlMeT
        bne ipAway
        lda idolXT,y            ; in THIS level: at the cell you last set it down in, not the
        sta orbXCT,x            ;   build-time one objInit just restored
        lda idolYT,y
        sta orbYCT,x
        cpy idolHand
        beq ipHeld
        lda #$00                ; here, standing on the floor
        beq ipSet               ; always
ipHeld: txa                     ; here, in your hands: carry is an index into THIS level's
        clc                     ;   entity table and objInit cleared it, so rebuild it from
        adc #$01                ;   idolHand -- which is the whole reason idolHand exists
        sta carry
ipAway: lda #$01
ipSet:  sta orbHidT,x
        lda idolOnPedT,y        ; UP ON A DRUM? then it does not block. The drum itself does
        bne ipOpen              ;   not -- blkT is 0 at a pedestal cell, you walk over it -- and
                                ;   once the wall goes the ONLY way east is across the three of
                                ;   them. Three seated idols would plug the corridor they just
                                ;   unlocked, which is exactly what they did. Y is still the
                                ;   idol id here: every path into ipSet leaves it alone.
        lda orbHidT,x           ; and blkT follows from it: shown = 2 (entity), hidden = 0.
        eor #$01                ;   0 eor 1 = 1, asl = 2;  1 eor 1 = 0, asl = 0 -- so the two
        asl                     ;   values fall out of the flag and need no second branch
        bpl ipBlk               ; always taken: 2 and 0 are both positive
ipOpen: lda #$00
ipBlk:  pha                     ; the cell calculation below needs Y, which is the idol id until
        lda orbYCT,x            ; the cell it stands in
        jsr mulW
        clc
        adc orbXCT,x
        tay
        pla                     ;   ...here
        sta blkT,y
ipNext: dex
        bpl ipLp
        rts
; ---- THE IDOL'S TWO RULES (the user, 2026-11-04) ----
; "idol resets like everything else makes the most sense from a puzzle game. but if you take it out
; of the level it stays wherever it ends up in level 4 ... you *can't* take an idol out of level 4."
; So in its OWN room an idol is part of the puzzle and a death puts it back on its spawn cell, held
; or set down; once carried out to the hub it belongs there for good, and a hole out of the hub
; does not take it -- it is left on the last floor cell you stood on before the hole.
; (The idol used to drop where you died, wherever that was: a 2026-09-28 fix for an idol lost when
; the restart filed it under the wrong room. Its record is now always written whole, here.)
; idolDie (dieGo): carry is still set and idolHand still valid -- the restart clears both later.
idolDie:ldy idolHand
        bmi idlNH               ; $ff = empty hands
        lda lvlMeT              ; in hand: it is in THIS level, where you fell...
        sta idolLoc,y
        lda px+1                ;   ...at your cell (px/py hold the cell in the high byte). Only
        sta idolXT,y            ;   kept away from its own room -- the loop below sends it home
        lda py+1
        sta idolYT,y
        lda #$00                ; on the floor, not up on a drum
        sta idolOnPedT,y
        lda #$ff                ; and no longer in your hands: idolPlace runs inside objInit,
        sta idolHand            ;   before anything re-derives idolHand from the cleared carry
idlNH:  ldy #$02
idlLp:  lda idolLoc,y           ; ---- every idol standing in its OWN room goes back to its spawn ----
        cmp lvlMeT
        bne idlNx
        cmp idHomeT,y
        bne idlNx
        lda idSpXT,y
        sta idolXT,y
        lda idSpYT,y
        sta idolYT,y
idlNx:  dey
        bpl idlLp
        rts
; idolStay (fallChk, a hole just taken): an idol in hand goes through ONLY out of its own room. Out
; of anywhere else -- the hub -- it stays on the last floor cell you stood on (plLX/plLY), and your
; hands come away empty, so the fall leaves its sprite behind like an orb's.
idolStay:ldy idolHand
        bmi isNo
        lda idHomeT,y
        cmp lvlMeT
        beq isNo                ; its own room: it travels with you, to the hub
        lda lvlMeT
        sta idolLoc,y
        lda plLX
        sta idolXT,y
        lda plLY
        sta idolYT,y
        lda #$00
        sta idolOnPedT,y
        lda #$00
        sta carry
        jsr idolLk              ; idolHand and idolHd follow carry
isNo:   rts
idHomeT: !byte $05,$06,$07   ; each idol's own room
idSpXT: !byte $0f,$0e,$07   ; ...and its spawn cell there
idSpYT: !byte $02,$05,$08
; ---- and seamEdge itself starts wherever the idol code ended ----
; ---- seamEdge: a wall pixel touching a ceiling pixel takes the SEAM ink ----
; Runs on every level entry, the tail of lvlChr (jmp seamEdge, or floorDk's). Codes 2..200 only -- the ramps and the
; steps. See LEVEL_SEAM in the build for why this needs no pristine charset and why charset B
; is written from the same answer instead of being re-derived.
;
; Per row byte, four bit pairs, and everything below is ONE BIT PER PAIR sitting at the pair's
; low bit (so every mask is a subset of $55):
;     hi   = (b >> 1) & $55        the high bit of each pair, brought into line
;     lo   = b & $55
;     w01  = lo & ~hi              a WALL pixel
;     w10  = ~lo & hi              a seam pixel: only this routine can have made one
;     c00  = ~lo & ~hi             ground or ceiling
; and a pair is flipped by EOR with (m | m<<1): 01 EOR 11 = 10, and 10 EOR 11 = 01, which is
; why the same trick both sets the outline and takes it away again.
seamEdge:
        rts

        ; (An origin from the hand layout, once the guard on seamEdge's hand count: an
        ; overrun made it "moves backward". Compaction rewrites it like every origin.)
; [origin folded into the run above by compact.mjs]

        ; ---- $82a0: the tail faceIdT leaves in its page ----
        ; faceIdT is 160 bytes -- one per ray column -- in a 256-byte page, and rays is the one
        ; dimension in this program that never changes, so these 96 bytes are stable in a way the
        ; !fill MAPN tails are NOT: those collapse to three bytes on a build whose live level is
        ; the 253-cell one. Code, not data, because the blocks that were full held code.
        * = $ab29
arcCdT: !byte 2,4,5,13,15,16,19,21,23,27,29,31,35,45,49,52,63,67,69,76,86,90,95,110,121,124,126,174,183,184,187


        ; ...and $83a0 is the same again in the next page. NOT $6d82, which is where these were:
        ; runFaceT moves into that stretch on a chain whose live level is 7, and the RAM-overlap
        ; guard catches it -- a reminder that "free" in one chain's report is not free in all.
        * = $4e3e
; ---- pedOff: lifting an idol OFF a pedestal empties that pedestal ----
; Without it idolOnPedT still read "up on the drum" while the idol was in your hands, so two on
; drums plus one held would have opened the wall. A CALL and not eleven inline bytes, because
; orbUse is in the main block -- see pedGate.
pedOff: ldy idolHand
        bmi poNo
        lda #$00
        sta idolOnPedT,y
poNo:   rts
        * = $4e49
dpCand: clc                     ; ---- the eight cells around the player, as a CELL index ----
        ; No mask on either coordinate. It used to "and #$0f", which is only the map's width on a
        ; 16-wide one: on the 28x9 combined level an x of 16..27 wrapped round to 0..11 and the
        ; orb was placed most of a map away from the player, which is exactly how it looked.
        ; Nothing is needed in its place. dirXT/dirYT are -1, 0 or +1, the map border is solid on
        ; all four sides (asserted at build), and the player cannot stand in a wall -- so px+1 is
        ; within 1..MAPW-2 and the candidate is always inside the grid. Same for y.
        ; See orbProj's "RANGE CHECK, not a mask" for the same bug caught in another place.
        lda px+1
        adc dirXT,x
        sta fcX
        clc
        lda py+1
        adc dirYT,x
        sta fcY
        jsr mulW
        clc
        adc fcX
        sta fcCell
        rts

; ---- fdGEnd: fdGlyph only ARMS, and something has to tick it ----
; The slices hang off fsL3, which is the LANDING. Boot and death come through lvlBoot and have no
; landing at all, so nothing ever ticked and the ramps came back UNDITHERED after dying. Outside a
; fall, do the whole thing here and now: the stall is invisible on a path with no frame on screen.
fdGEnd: lda fallSt
        bne fdGE1
        jsr fdGlFl
fdGE1:  jmp seamEdge

; ---- fdGlFl: whatever is left of the charset sweep, on the frame the landing ends ----
; So a landing shorter than fdGlTk's arithmetic assumes cannot leave the charset half converted.
fdGlFl: lda #$ff
        jmp fdGlF2

agNx:   lda fdB                 ; on to the next glyph slot
        clc
        adc #$08
        sta fdB
        bcc agN1
        inc fdB+1
agN1:   rts

; fdGlyph's state, rehoused: its own block ran 8 bytes over when level 6 landed, and these
; are DATA -- they do not care which block they sit in, where its code does.
fdBuf:  !fill 8, 0
fdT:    !byte 0                 ; the row byte, and its low bits -- absolute, not zero page:
fdT2:   !byte 0                 ;   only the two POINTERS need (zp),y
fdCnt:    !byte 0
fdSlc:    !byte 0               ; glyphs left in THIS slice; fdCnt is the whole job
fdWant: !byte 0
fdWas:  !byte $01               ; not $00 and not $ff: neither state, so the FIRST level always
                                ;   builds and nothing depends on what powers up here


        * = $a200
f0LoT:  !byte 0,0,1,2,4,6,9,12,16,20,25,30,36,42,49,56,64,72,81,90,100,110,121,132
        !byte 144,156,169,182,196,210,225,240,0,16,33,50,68,86,105,124,144,164,185,206,228,250,17,40
        !byte 64,88,113,138,164,190,217,244,16,44,73,102,132,162,193,224,0,32,65,98,132,166,201,236
        !byte 16,52,89,126,164,202,241,24,64,104,145,186,228,14,57,100,144,188,233,22,68,114,161,208
        !byte 0,48,97,146,196,246,41,92,144,196,249,46,100,154,209,8,64,120,177,234,36,94,153,212
        !byte 16,76,137,198,4,66,129,192,0,64,129,194,4,70,137,204,16,84,153,222,36,106,177,248
        !byte 64,136,209,26,100,174,249,68,144,220,41,118,196,18,97,176,0,80,161,242,68,150,233,60
        !byte 144,228,57,142,228,58,145,232,64,152,241,74,164,254,89,180,16,108,201,38,132,226,65,160
        !byte 0,96,193,34,132,230,73,172,16,116,217,62,164,10,113,216,64,168,17,122,228,78,185,36
        !byte 144,252,105,214,68,178,33,144,0,112,225,82,196,54,169,28,144,4,121,238,100,218,81,200
        !byte 64,184,49,170,36,158,25,148,16,140,9,134,4,130,1,128
        * = $a300
f0HiT:  !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2
        !byte 2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4
        !byte 5,5,5,5,5,5,5,6,6,6,6,6,6,7,7,7,7,7,7,8,8,8,8,8
        !byte 9,9,9,9,9,9,10,10,10,10,10,11,11,11,11,12,12,12,12,12,13,13,13,13
        !byte 14,14,14,14,15,15,15,15,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19
        !byte 20,20,20,21,21,21,21,22,22,22,23,23,23,24,24,24,25,25,25,25,26,26,26,27
        !byte 27,27,28,28,28,29,29,29,30,30,30,31,31,31,32,32,33,33,33,34,34,34,35,35
        !byte 36,36,36,37,37,37,38,38,39,39,39,40,40,41,41,41,42,42,43,43,43,44,44,45
        !byte 45,45,46,46,47,47,48,48,49,49,49,50,50,51,51,52,52,53,53,53,54,54,55,55
        !byte 56,56,57,57,58,58,59,59,60,60,61,61,62,62,63,63
        * = $a400
f1LoT:  !byte 0,128,1,130,4,134,9,140,16,148,25,158,36,170,49,184,64,200,81,218,100,238,121,4
        !byte 144,28,169,54,196,82,225,112,0,144,33,178,68,214,105,252,144,36,185,78,228,122,17,168
        !byte 64,216,113,10,164,62,217,116,16,172,73,230,132,34,193,96,0,160,65,226,132,38,201,108
        !byte 16,180,89,254,164,74,241,152,64,232,145,58,228,142,57,228,144,60,233,150,68,242,161,80
        !byte 0,176,97,18,196,118,41,220,144,68,249,174,100,26,209,136,64,248,177,106,36,222,153,84
        !byte 16,204,137,70,4,194,129,64,0,192,129,66,4,198,137,76,16,212,153,94,36,234,177,120
        !byte 64,8,209,154,100,46,249,196,144,92,41,246,196,146,97,48,0,208,161,114,68,22,233,188
        !byte 144,100,57,14,228,186,145,104,64,24,241,202,164,126,89,52,16,236,201,166,132,98,65,32
        !byte 0,224,193,162,132,102,73,44,16,244,217,190,164,138,113,88,64,40,17,250,228,206,185,164
        !byte 144,124,105,86,68,50,33,16,0,240,225,210,196,182,169,156,144,132,121,110,100,90,81,72
        !byte 64,56,49,42,36,30,25,20,16,12,9,6,4,2,1,0
        * = $a500
f1HiT:  !byte 64,64,65,65,66,66,67,67,68,68,69,69,70,70,71,71,72,72,73,73,74,74,75,76
        !byte 76,77,77,78,78,79,79,80,81,81,82,82,83,83,84,84,85,86,86,87,87,88,89,89
        !byte 90,90,91,92,92,93,93,94,95,95,96,96,97,98,98,99,100,100,101,101,102,103,103,104
        !byte 105,105,106,106,107,108,108,109,110,110,111,112,112,113,114,114,115,116,116,117,118,118,119,120
        !byte 121,121,122,123,123,124,125,125,126,127,127,128,129,130,130,131,132,132,133,134,135,135,136,137
        !byte 138,138,139,140,141,141,142,143,144,144,145,146,147,147,148,149,150,150,151,152,153,153,154,155
        !byte 156,157,157,158,159,160,160,161,162,163,164,164,165,166,167,168,169,169,170,171,172,173,173,174
        !byte 175,176,177,178,178,179,180,181,182,183,183,184,185,186,187,188,189,189,190,191,192,193,194,195
        !byte 196,196,197,198,199,200,201,202,203,203,204,205,206,207,208,209,210,211,212,212,213,214,215,216
        !byte 217,218,219,220,221,222,223,224,225,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239
        !byte 240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255
        * = $a600
; A FULL PAGE, not MAPN bytes. mkRuns clears these with "ldx #0 ... inx / bne", so all 256 are
; WRITTEN however few cells the live level has -- the remainder is part of the table, not a hole.
; Emitted short, the free-space report called those bytes spendable (618 of them on a 153-cell
; live level) and anything placed there would be wiped on the next level change. Same reason
; mapT and blkT are padded to a page. See the MAPN note above MAPW.
runWT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,10,0,0,0,0,0,0,0,0,0,0,0,0,0,22,0,0,0,0,0,0,0,10,0,0,0,0,0,0,14,0,0,0,0,0,0,22,0,0,0,0,0,0,8,0,0,0,0,0,0,0,14,0,0,0,0,19,0,22,0,0,0,0,0,0,8,0,0,0,0,0,0,0,14,0,16,0,0,19,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,16,0,0,0,0,22,0,0,0,0,0,0,9,0,0,0,0,0,0,0,14,0,16,0,0,20,0,22,0,0,0,0,0,0,9,0,0,0,0,0,0,0,14,0,0,0,0,20,0,22,0,0,0,0,0,0,0,11,0,0,0,0,0,0,14,0,0,0,0,0,0,22,0,0,0,5,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $a700
runET: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,6,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,18,0,0,0,3,0,0,0,0,0,0,0,0,0,0,12,0,15,0,0,0,0,18,0,0,0,3,0,0,0,0,0,0,0,0,0,0,12,0,15,0,0,17,0,18,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,15,0,0,17,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,13,0,15,0,0,17,0,21,0,0,0,3,0,0,0,0,0,0,0,0,0,0,13,0,15,0,0,0,0,21,0,0,2,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,0,0,0,21,0,0,2,0,0,0,7,0,0,0,0,0,0,0,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
; ---- snapCp: the half-height snapshot copy (its caller is bgCopy) ----
; Out here from the hand layout, where it filled 64 bytes of stable slack; compaction places it.
        * = $4e8f
snapCp: ldx #$00                ; x = the SLOT being filled, 0..12
bgcRow: lda snapSrcT,x          ; ...from this screen row, which is not always x
        tay
        lda mul40LoT,y          ; source: the screen, row snapSrcT[x]
        sta fdS
        lda mul40HiT,y
        clc
        adc snSrc               ; screens are page-aligned, so no low-byte carry
        sta fdS+1
        lda snapLoT,x           ; destination: slot x, wherever SNAP_AT put it
        sta fdD
        lda snapHiT,x
        sta fdD+1
        ldy #$00
bgcB:   lda (fdS),y
        sta (fdD),y
        cpy #39
        beq bgcAdv
        iny
        jmp bgcB
bgcAdv: inx
        cpx #$0d
        bne bgcRow
        rts
        * = $a800
runNT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,27,27,27,27,27,27,0,0,0,29,0,0,0,0,30,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,34,34,34,34,34,34,34,0,0,0,0,0,0,36,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,40,40,40,0,0,0,0,0,0,41,41,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,42,42,0,0,43,43,0,0,0,0,0,0,44,44,44,44,44,44,44,44,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $a900
runST: !byte 0,23,23,0,0,24,24,0,0,0,0,0,0,25,25,25,25,25,25,25,25,0,0,0,0,26,26,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,28,28,28,28,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,31,31,31,31,31,31,0,0,0,0,0,0,33,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,35,35,0,0,0,0,0,37,0,0,0,0,38,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,39,39,39,39,39,39,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
; [origin folded into the run above by compact.mjs]
   ; padded to the page with WALL: mkRuns reads c-1 at cell 0 and c+1 at the last cell
        * = $aa00
; rsT and rbT are one formula 7 apart (rbT[c] = rsT[c + 7]; both 0 past the wall's reach), so they
; share bytes. rsT keeps the page; rbT, 7 in, crosses it only for a column 249+ pixels tall.
rsT: !byte 13,13,13,13,12,12,12
rbT: !byte 12,12,12,12,12,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,9,9,9
        !byte 9,9,9,9,9,8,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6
        !byte 6,6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3
        !byte 3,3,3,3,3,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0   ; rsT runs on into this: see sharedPair

        ; The sound effects, out here because the $9d00 block that holds the level shadow
        ; ran out of room the moment a level was allowed to declare its own sockets: the
        ; shadow carries the other level's tables and those grew with it. This hole is
        ; 768 bytes and holds nothing else.
        * = $4ec0
; ---- mkRuns: rebuild the wall-run tables from mapT ----
; Four 256-byte tables plus 100 bytes of per-run metadata -- 1,124 of the 1,789 bytes a level
; used to carry -- are DERIVED from the map by two passes over it, PLUS the split ids (see the
; tail): the merge-hazard lists split runs into pieces with ids of their own, which no pass over
; the map can produce, and this routine used to leave those ids' plane and face holding the level
; you fell FROM -- the socket room's column then occluded against level 1's planes. Carrying them was costing more
; than recomputing them: the old swap ran at ~29 cycles a byte, so not moving 1,124 of them saved
; ~32,000 cycles, and this costs about 25,000 (and it is fewer bytes off the disk now).
;
; The id order is load-bearing and must match the build exactly: columns first (west then east
; per cell), then rows (north then south), ids handed out in that interleaved order. Any other
; order renumbers every run and the merge-hazard lists, which name ids, stop meaning anything.
;
; The map border is solid (the build refuses one that is not), so a border cell never has an
; outward face and the neighbour reads at x=0 (c-1) and x=MAPW-1 (c+1) only have to be DEFINED,
; not right: for cell 0 and cell MAPN-1 they leave the map, and mapT is padded to a full page of
; walls so they read wall. The north and south passes would leave the TABLE (c-MAPW, c+MAPW), so
; the north pass starts at row 1 and the south pass stops at row MAPH-2; row 0 has no north face
; to see and the last row no south face, and both get their inward side from the other pass.
;
; THE 23x11 LEVELS BROKE THIS THREE WAYS (2026-09-17), every one a 16x16 assumption:
;   - the vertical pass walked y until the cell index WRAPPED, which on a 253-cell map visits the
;     three bytes past the map for x=0..2 -- so it now counts MAPH rows;
;   - the south pass stopped at "row 15" (cmp #$0f), so on an 11-row map the last row read c+23
;     past the table and grew a south face along the bottom border;
;   - the bytes past mapT were 0 = open, so cell 0 saw an open west neighbour and cell 252 an open
;     east one, and each grew a run of its own.
; Three phantom runs took ids 1, 6 and 11, the socket room's column renumbered from 2/3/6/7 to
; 3/4/8/9, and its 40 merge-hazard lists -- which name the BUILD's ids -- spliced the column onto
; whichever wall held the old number: "the central column stretches as if attached to another
; wall off screen" (the user). Level 1 was untouched because mkRuns only runs after a fall.
mkRuns: ldx #$00
        txa
mrZ:    sta runWT,x             ; 0 = "no run here"
        sta runET,x
        sta runNT,x
        sta runST,x
        inx
        bne mrZ
        lda #$01
        sta mrNext              ; id 0 means no run, so ids start at 1

        ; ---- vertical planes: west and east faces, contiguous in y ----
        lda #$00
        sta mrX
mrVx:   lda #$00
        sta mrWp                ; no run in progress on either face
        sta mrEp
        sta mrY                 ; the row, counted: the index wrapping is NOT the end of a column
        lda mrX
        tay                     ; c = y*MAPW + x, walking y means stepping MAPW
mrVy:   lda mapT,y
        beq mrVw
        lda #$00                ; mapT: an open cell is not 0 (a zone mask), and the stores want 0
        sta mrWp                ; open cell: both runs end here
        sta mrEp
        jmp mrVn
mrVw:   dey                     ; west face? the cell at c-1 must be open
        lda mapT,y
        iny                     ; restoring Y CLOBBERS the flags the load just set, so the
        cmp #$00                ;   compare has to be redone -- without this the branch below
        beq mrVwn               ;   tested Y and every west run came out wrong
        lda mrWp
        bne mrVws
        lda mrNext              ; a new run: plane = x, face W
        sta mrWid
        inc mrNext
        tax
        lda mrX                 ; runPFT: the plane, and W's flags are 0
        sta runPFT,x
mrVws:  lda mrWid
        sta runWT,y
        lda #$01
        sta mrWp
        jmp mrVe
mrVwn:  lda #$00
        sta mrWp
mrVe:   iny                     ; east face? the cell at c+1 must be open
        lda mapT,y
        dey                     ; same trap as the west face above
        cmp #$00
        beq mrVen
        lda mrEp
        bne mrVes
        lda mrNext              ; plane = x+1, face E
        sta mrEid
        inc mrNext
        tax
        lda mrX
        clc
        adc #$81                ; the plane x+1, and bit 7: E's sense
        sta runPFT,x
mrVes:  lda mrEid
        sta runET,y
        lda #$01
        sta mrEp
        jmp mrVn
mrVen:  lda #$00
        sta mrEp
mrVn:   tya                     ; next row, same column
        clc
        adc lvlDimT             ; + MAPW
        tay
        inc mrY
        lda mrY
        cmp lvlDimT+1           ; MAPH
        bcc mrVy
        inc mrX
        lda mrX
        cmp lvlDimT             ; MAPW
        bcc mrVx

        ; ---- horizontal planes: north and south faces, contiguous in x ----
        lda #$00
        sta mrY
        tay                     ; c = y*16, walking x means stepping 1
mrHy:   lda #$00
        sta mrWp                ; mrWp/mrEp do double duty as the N/S run-in-progress flags
        sta mrEp
        ldx #$00
        stx mrX
mrHx:   lda mapT,y
        beq mrHn
        lda #$00                ; as at mrVy
        sta mrWp
        sta mrEp
        jmp mrHnx
mrHn:   lda mrY                 ; north face: row 0 has none to see, and c-MAPW would leave mapT
        beq mrHnn
        tya
        sec
        sbc lvlDimT             ; c - MAPW
        tax
        lda mapT,x
        beq mrHnn
        lda mrWp
        bne mrHns
        lda mrNext              ; plane = y, face N
        sta mrWid
        inc mrNext
        tax
        lda mrY
        ora #$40                ; the plane y, and bit 6: across y
        sta runPFT,x
mrHns:  lda mrWid
        sta runNT,y
        lda #$01
        sta mrWp
        jmp mrHs
mrHnn:  lda #$00
        sta mrWp
mrHs:   lda mrY                 ; south face: the last row has none, and c+MAPW would leave mapT
        cmp lvlDimT+4           ; MAPH - 1
        beq mrHsn
        tya
        clc
        adc lvlDimT             ; c + MAPW
        tax
        lda mapT,x
        beq mrHsn
        lda mrEp
        bne mrHss
        lda mrNext              ; plane = y+1, face S
        sta mrEid
        inc mrNext
        tax
        lda mrY
        clc
        adc #$c1                ; the plane y+1, across y, S's sense
        sta runPFT,x
mrHss:  lda mrEid
        sta runST,y
        lda #$01
        sta mrEp
        jmp mrHnx
mrHsn:  lda #$00
        sta mrEp
mrHnx:  iny
        inc mrX
        lda mrX
        cmp lvlDimT             ; MAPW
        bcc mrHx
        inc mrY
        lda mrY
        cmp lvlDimT+1           ; MAPH
        bcc mrHy

        ; ---- the per-run bit lookups, which are pure arithmetic on the id ----
        ; EVERY id gets its bit, not just the ones below mrNext. The merge-hazard lists hand out
        ; ids of their own for the pieces a run is split into (the socket room's 8 runs become 12),
        ; and those never pass through the passes above -- so zeroing "ids past this level's
        ; count" zeroed exactly the ids the hazard patches write, and an entity behind a split
        ; run had an empty occluder bit: it popped in and out with the player's cell (2026-09-17).
        ; No id in the live tables can be stale: the swap is followed by this rebuild, and the
        ; masks are remade from the live tables every frame.
        jmp lxBur               ; LEVEL CODE, the runs just rebuilt: level 4's hazard split ids take
                                ;   their parent's plane and face (hazSpFix), level 10's brSplit breaks
                                ;   a run where a new face meets one of the level's own; lxNone elsewhere


; Out of the main block (11 bytes over once level 1's two angel readouts met the per-level
; stride reads, 2026-09-18) into the tail of the bfsQ page. jsr-only; "* = $9500 moves
; backward" guards it.

; ---- obOrder: project every entity, nearest first, until the sprite slots run out ----
; The walk used to go in entity order, and the slots ran out on whoever came last: level 3's
; third angel (entity 4, two sprites) simply did not draw whenever the two orbs, the hole and
; a socket had taken theirs -- "still blocks me, still kills me, but doesn't render" (the user,
; 2026-09-18). Now each entity gets a key of |dx|+|dy| cells from the player and the nearest is
; projected first, so what drops when eight is not enough is the smallest thing on screen.
; It WAS a repeated minimum over every entity: each pick scanned all nOrbT, culled or not, so level
; 9's room with 8 sentries in view (14 entities, ~9 picks) spent ~2,000 cycles a frame choosing
; (2026-10-15). Now the key pass INSERTS each survivor into obLT as it goes -- a stable insertion
; after every equal key, and the pass runs from the highest index down, so equal keys still come
; out highest index first, exactly the order the repeated minimum gave -- and the walk just reads it.
; Out here because the main block has no room; jsr-only.
obOrder:ldx nOrbT
        beq obODn
        lda #$00
        sta obLN
obKLp:  dex
        lda #$ff                ; $ff = never: hidden, or not an angel while dying
        ldy orbHidT,x
        bne obKSt
        ldy cnOkT,x             ; CULLED by entGate (zone or cone): orbOne would only reject it, so it
        beq obKSt               ;   never enters the sort (A is still $ff) -- a pick scans every entity,
                                ;   and level 9's room 1 has 14, most out of sight (2026-10-14). orbNo's
                                ;   one job, NOT SEEN, entGate now does as it culls -- see ogENo.
        ldy dieSt               ; dying: the ANGEL keeps its sprite and nothing else does.
        beq obKLiv              ;   Done here rather than by clearing omEn, because orbMove
        ldy orbTallT,x          ;   refills omEn later in the same frame -- which is exactly how
        beq obKSt               ;   the carried-orb slot came back the last time this was tried.
obKLiv:
        lda orbXCT,x
        sec
        sbc px+1
        bcs obKx
        eor #$ff
        adc #$01
obKx:
        sta obKT
        lda orbYCT,x
        sec
        sbc py+1
        bcs obKy
        eor #$ff
        adc #$01
obKy:
        clc
        adc obKT                ; |dx| + |dy| in cells: at most 30, so never $ff
obKSt:  sta obKeyT,x
        cmp #$ff
        beq obKNx               ; never: not in the list
        sta obKT                ; ---- insert entity X, key A, after every key <= it ----
        stx obKI
        ldy obLN
obIns:  beq obIPut              ; reached the front
        ldx obLT-1,y
        lda obKeyT,x
        cmp obKT
        bcc obIPut              ; smaller...
        beq obIPut              ;   ...or EQUAL stays ahead: stable, highest index first
        txa                     ; larger: it moves up one
        sta obLT,y
        dey
        jmp obIns
obIPut: lda obKI
        sta obLT,y
        inc obLN
        tax
obKNx:  txa
        bne obKLp
        lda #$00                ; ---- the walk: nearest first, until the slots run out ----
        sta obKI                ; obKI is the list position now (orbOne clobbers X and Y)
obPick: ldy obKI
        cpy obLN
        beq obODn               ; every survivor done
        lda obLT,y
        inc obKI
        sta oidx
        jsr orbOne
        lda onv
        cmp onvH
        bcc obPick              ; slots left: the next nearest
obODn:  rts
; [origin folded into the run above by compact.mjs]
        * = $ac00
rayOffT: !byte 233,233,233,233,233,234,234,234,234,235,235,235,235,236,236,236,236,237,237,237,238,238,238,238,239,239,239,239,240,240,240,241,241,241,241,242,242,242,243,243,243,244,244,244,244,245,245,245,246,246,246,247,247,247,248,248,248,249,249,249,250,250,250,251,251,251,252,252,252,253,253,253,254,254,254,255,255,255,255,0,0,1,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10,11,11,11,12,12,12,12,13,13,13,14,14,14,15,15,15,15,16,16,16,17,17,17,17,18,18,18,18,19,19,19,20,20,20,20,21,21,21,21,22,22,22,22,23,23,23,23,24
        ; ---- the seated orb's per-variant tables ----
        ; Indexed by ORB VARIANT, because a seated orb steps exactly as a standing one and
        ; Out here in the tails of two pages the ray tables do
        ; not fill: the ORB_SMALL region they were in has no room for 44-entry tables.
        * = $50c9

; ---- fwBlk and fNT live up here, away from the fall's other tables ----
; They were at the foot of the $6c00 block with fKT/fLoT/fHiT, and level 7's tables push that run
; down until it overlaps runFaceT -- 65 bytes of it. These two are 72, and the sfx pages leave
; exactly that much in their tails. Neither is hot: fwBlk is rebuilt once a frame and fNT is read
; once per fall frame, so a page of their own costs nothing but the two origins.
fwBlk:  !fill 32, 0             ; the block fdWarp reads, rebuilt once a frame
; ---- pedGate: every pedestal filled opens the wall ----
; In this tail, not in orbUse where it was first written: orbUse is in the main block, the most
; contested space in the build, and thirty-seven bytes there went straight over the code ceiling
; the moment FALLNOW was also on. It runs once per SPACE press. The faceIdT tails are the STABLE
; slack (see $82a0) -- rays never change, unlike the !fill MAPN tails, which collapse to nothing
; on a chain whose live level has a bigger map.
; The SOCKET gate in orbMove (omPdC) could never have served: it fires when a socket EATS an orb,
; and reads hlSeat bit 7 -- which ALSO means "gone from the world", the flag that stops a filled
; socket drawing at all. An idol is not eaten. It stands on the drum, visible, and can be taken
; back, so seating a pedestal that way would make the pedestal itself vanish.
pedGate:beq pgNo               ; A is the byte orbUse just stored: 0 = set down on plain floor.
                               ;   A drop that is not onto a drum can neither complete the set
                               ;   nor need the fix below.
        ldx odCell             ; ON A DRUM: undo the block the put-down stamped a moment ago --
        lda #$00               ;   see idolPlace for why a seated idol must not block
        sta blkT,x
        ldy #$02
        ; EACH IDOL ON ITS OWN DRUM. idolOnPedT holds the pedestal's index + 1, and idol n
        ; belongs on pedestal n (they are declared in pedestal order), so the test is simply
        ; "does the byte equal y+1". Any-idol-on-any-drum was the old behaviour and made the
        ; three colours decorative -- the pedestals are inked to say which one goes where.
pgC:    tya
        clc
        adc #$01               ; the drum THIS idol belongs on
        cmp idolOnPedT,y
        bne pgNo               ; missing, or on the wrong one
        dey
        bpl pgC
        ldy #$00                 ; the wall all of them name -- see PED_WALL
        lda wallStT,y          ; ALREADY OPEN? wallTog TOGGLES, so taking an idol back off and
        bne pgNo               ;   setting it down again would SHUT the wall again.
        sty wsWall
        jmp wallTog            ; tail call -- there is nothing to do afterwards
pgNo:   rts

        * = $ad00
; each group is its own page-aligned table (hTabG0..15), so the high byte alone names it
hPgT:   !byte >hTabG0,>hTabG0,>hTabG0,>hTabG0,>hTabG0,>hTabG0,>hTabG0,>hTabG1,>hTabG1,>hTabG1,>hTabG1,>hTabG1,>hTabG2,>hTabG2,>hTabG2,>hTabG2,>hTabG2,>hTabG3,>hTabG3,>hTabG3,>hTabG3,>hTabG3,>hTabG4,>hTabG4,>hTabG4,>hTabG4,>hTabG4,>hTabG4,>hTabG5,>hTabG5,>hTabG5,>hTabG5,>hTabG5,>hTabG5,>hTabG6,>hTabG6,>hTabG6,>hTabG6,>hTabG6,>hTabG6,>hTabG7,>hTabG7,>hTabG7,>hTabG7,>hTabG7,>hTabG7,>hTabG7,>hTabG7,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG9,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG8,>hTabG7,>hTabG7,>hTabG7,>hTabG7,>hTabG7,>hTabG7,>hTabG7,>hTabG7,>hTabG6,>hTabG6,>hTabG6,>hTabG6,>hTabG6,>hTabG6,>hTabG5,>hTabG5,>hTabG5,>hTabG5,>hTabG5,>hTabG5,>hTabG4,>hTabG4,>hTabG4,>hTabG4,>hTabG4,>hTabG4,>hTabG3,>hTabG3,>hTabG3,>hTabG3,>hTabG3,>hTabG2,>hTabG2,>hTabG2,>hTabG2,>hTabG2,>hTabG1,>hTabG1,>hTabG1,>hTabG1,>hTabG1,>hTabG0,>hTabG0,>hTabG0,>hTabG0,>hTabG0,>hTabG0,>hTabG0
        * = $acad

fNT:    !byte 25,25,25,25,25,23,21,19,17,15,13,11,10,8,7,5,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $ae00
; The DDA deltas at quarter-angle resolution. TWO pages, not the eight a naive ddx/ddy pair at
; 1024 entries would take: |cos| has period half a circle and sin is cos a quarter turn along,
; so castRay picks between these two pages on bit 0 of the quarter and reads ddy out of the one
; ddx is not using. Both identities are asserted over every entry at build time.
ddxLoTQ: !byte 0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,2,2,2,2,2,3
        !byte 3,3,3,4,4,4,4,5,5,5,6,6,6,7,7,8,8,8,9,9,10,10,11,11
        !byte 12,12,13,13,14,14,15,15,16,16,17,18,18,19,20,20,21,22,23,23,24,25,26,26
        !byte 27,28,29,30,31,31,32,33,34,35,36,37,38,39,40,41,42,44,45,46,47,48,49,51
        !byte 52,53,54,56,57,58,60,61,63,64,66,67,69,70,72,74,75,77,79,80,82,84,86,88
        !byte 90,91,93,95,97,100,102,104,106,108,111,113,115,118,120,123,125,128,130,133,136,139,142,145
        !byte 148,151,154,157,160,163,167,170,174,177,181,185,189,193,197,201,205,209,213,218,223,227,232,237
        !byte 242,247,252,2,7,13,19,25,31,37,44,51,57,64,72,79,87,95,103,111,120,129,138,147
        !byte 157,167,177,188,199,211,223,235,248,5,19,33,48,64,80,96,114,132,151,171,192,214,236,4
        !byte 30,56,84,113,144,177,212,249,32,74,119,166,217,16,76,139,209,28,110,200,43,153,19,155
        !byte 52,225,168,141,152,212,79,30,97,74,43,154,191,84,125,250,255,250,125,84,191,154,43,74
        !byte 97,30,79,212,152,141,168,225,52,155,19,153,43,200,110,28,209,139,76,16,217,166,119,74
        !byte 32,249,212,177,144,113,84,56,30,4,236,214,192,171,151,132,114,96,80,64,48,33,19,5
        !byte 248,235,223,211,199,188,177,167,157,147,138,129,120,111,103,95,87,79,72,64,57,51,44,37
        !byte 31,25,19,13,7,2,252,247,242,237,232,227,223,218,213,209,205,201,197,193,189,185,181,177
        !byte 174,170,167,163,160,157,154,151,148,145,142,139,136,133,130,128,125,123,120,118,115,113,111,108
        !byte 106,104,102,100,97,95,93,91,90,88,86,84,82,80,79,77,75,74,72,70,69,67,66,64
        !byte 63,61,60,58,57,56,54,53,52,51,49,48,47,46,45,44,42,41,40,39,38,37,36,35
        !byte 34,33,32,31,31,30,29,28,27,26,26,25,24,23,23,22,21,20,20,19,18,18,17,16
        !byte 16,15,15,14,14,13,13,12,12,11,11,10,10,9,9,8,8,8,7,7,6,6,6,5
        !byte 5,5,4,4,4,4,3,3,3,3,2,2,2,2,2,1,1,1,1,1,1,1,0,0
        !byte 0,0,0,0,0,0,0,0
        * = $b000
ddxHiTQ: !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
        !byte 2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4
        !byte 4,4,4,4,4,4,4,4,5,5,5,5,5,6,6,6,6,7,7,7,8,8,9,9
        !byte 10,10,11,12,13,14,16,18,20,23,27,32,40,54,81,162,255,162,81,54,40,32,27,23
        !byte 20,18,16,14,13,12,11,10,10,9,9,8,8,7,7,7,6,6,6,6,5,5,5,5
        !byte 5,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3
        !byte 2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
        !byte 2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1
; [origin folded into the run above by compact.mjs]
; ---- the angel-path fill's own state ----
; UNCONDITIONAL, and deliberately outside the block below: this is engine state and has nothing to
; do with the level. (Tucked into a gated block once, it compiled on the default build and broke
; the old TWOLEV=0 ones with an undefined symbol.) Nothing loads it -- it is scratch.
; ---- seamEdge's scratch, 24 bytes ----
; The hole below $be00 is what the dieChk block at $bc00 does not use, and the rule for picking
; one of these is the hole REPORT, not "no label there" (OCCCHK's shadow, picked that way, once
; landed on live variables and the program ran wild).
; PACKED AGAINST $be00, not against the code. It used to start at $bdd4, the hole's first byte,
; with the DIE block ending at $bdd3 -- so the block had ZERO bytes of slack and the next single
; instruction added to it (one "lda #imm" becoming "lda abs") pushed emitted data over seB and
; failed the build. Ending at $bdff instead leaves that growth room in front of the scratch
; rather than behind it, where nothing can use it.
; seB: named by nothing in this build, so given no RAM (compact.mjs)                 ; the row being worked on
; seHi: named by nothing in this build, so given no RAM (compact.mjs)                 ; its high bits, brought into line with the low ones
; seNL: named by nothing in this build, so given no RAM (compact.mjs)                 ; ~lo
; seLo: named by nothing in this build, so given no RAM (compact.mjs)
; seT: named by nothing in this build, so given no RAM (compact.mjs)                 ; the adjacency union
; seW: named by nothing in this build, so given no RAM (compact.mjs)                 ; the pairs about to be flipped
; seMsk: named by nothing in this build, so given no RAM (compact.mjs)                 ; $55 or $00: does this level want the outline
; seN: named by nothing in this build, so given no RAM (compact.mjs)                 ; glyphs left
; seC00: named by nothing in this build, so given no RAM (compact.mjs)                 ; 8 bytes: ground/ceiling pixels, per row
; seNB: named by nothing in this build, so given no RAM (compact.mjs)                 ; 8 bytes: the row being built, ending exactly at $bdff
        * = $510e
bfsBlk: !byte 0                 ; was the neighbour the fill is looking at a blocked cell?
bfsEnI: !byte 0                 ; entity index, saved across the early-out's cell arithmetic
blkVer: !byte 0                 ; bumped whenever blkT changes -- see bfsTick
bfsBVF: !byte 0                 ; the blkT version the fill in progress is for
bfsBVD: !byte 0                 ; ...and the one the LIVE map was built from
sockHit: !byte 0                ; socket index+1 the last orb was spent on; 0 = none
; Socket -> the wall id it opens, LOCAL TO THIS LEVEL, $ff = opens nothing. NOT inside the
; WALL_DELTA block below, even though only a wall build reads it: it is a LVL_TABLES entry, so
; lvlDstLoT names it in every build, and a chain with no removable walls anywhere (CHAIN=1)
; failed to assemble on an undefined symbol. Sockets and removable walls are separate features
; and the manifest should not couple them.

; ---- THIS LEVEL'S WALL DELTAS: where each local wall id's two lists lie ----
; In the blob for the same reason sockWallT is: they describe one room. Emitted here (outside
; the WALL_DELTA block) so a chain with no removable walls still defines the symbols the
; manifest names -- the tables are then NWALL zeros nothing ever reads.

sokShrT: !byte 0,3,6   ; rungs down, per closing frame
; ---- A WALL, TAKEN OUT AND PUT BACK ----
; Both configurations of the room are built (the second in a subprocess, same trick the shadow
; level uses) and only the DIFFERENCE ships. It cannot be recomputed on the machine: the
; merge-hazard pass alone is 1024 directions by 3x3 samples. Run ids renumber wholesale when a
; wall goes, so the delta is never the one map byte you would guess: these 17 come to
; 5, 5, 5, 9, 13, 5, 5, 17, 13, 9, 13, 5, 5, 5, 5, 5, 5 bytes. (It said "13 runs become 5 here" when there was one wall on one
; level to point at, and reported wall 0's count as if it were every wall's.)
; The format is (addrLo, addrHi, outValue, backValue) until $ff -- see hzRunW. It was two
; separate hzRun triple lists, one a direction, until levels 2 and 3 both had removable walls and
; the two sets together overran rayOffQS at $a900: the addresses were stored twice.
; NOT in the delta, deliberately: stepT (map-independent since STEPFB) and the charset (canonical
; -- fontA is byte-identical with the column present and removed).
; ONE PAIR PER REMOVABLE WALL (2026-09-18): level 2 has three sockets and three walls, and each
; socket names its wall through sockWallT. wsWall is the wall being toggled; wallStT its state.
; The four pointer tables that used to stand here are LVL_TABLES entries now (see wallPtrs):
; sized to the chain, they were the last thing forcing a global wall id space.
; ONE BYTE PER LOCAL WALL ID, not per wall in the chain: 0 = the wall is there. It is engine
; state and does not travel -- wallsBack puts every wall back before a level leaves, so an
; arriving level always finds this clear and a level's solved-ness is never carried out of it.
wallStT: !fill 4, 0
wsWall: !byte 0                 ; which wall wallTog / wallSink are working on
wsDir:  !byte 0                 ; ...and which way: 1 = taking it out, 0 = putting it back
hzWv:   !byte 0                 ; hzRunW's held "out" value while it reads the "back" one

; ---- wallTog: flip it, either way ----
wallTog:ldy wsWall
        lda wallStT,y
        bne wtBack
        jsr wtDoom              ; load the group's cells into dcT: the sink's column scan tests
                                ;   them directly now that doomT is gone
        jsr wtRun               ; ...and give their faces runs of their own, so rays land ON them
        lda #$04        ; going: START THE COLLAPSE. The map itself does not change until
        sta wsN                 ;   the last frame of it -- see wallSink.
        lda #3
        jsr sfxPlay             ; only on the way OUT: wtBack is how a restart puts the wall back

        ldx #$9f                ; and wipe idT, because only the ~14-26 CAST columns are written
        lda #$ff                ;   each frame and the rest still hold the cell some earlier pose
wtClr:  sta idT,x               ;   struck there. Scanning those stale entries stretched the span
        dex                     ;   to 0..158 while turning -- every wall on screen sank, not the
        cpx #$ff                ;   doomed one. ($ff is safe as "no cell": ids are y*16+x and no
        bne wtClr               ;   map here is 16 rows deep.)
        rts
wtBack: ldy wsWall              ; coming back: no animation, just put it there
        lda #$00
        beq wtGo                ; always taken
wtOff:  ldy wsWall
        lda #$01
wtGo:   sta wallStT,y
        sta wsDir               ; the state IS the direction: 1 = out, 0 = back
        lda wallDLoT,y
        sta hzRd+1
        lda wallDHiT,y
        sta hzRd+2
        jsr hzRunW              ; sets its own X and walks to the $ff
        jsr wtCells             ; every cell of the group: blkT from the new mapT (the delta no
                                ;   longer carries blkT or the run tables, since neither travels
                                ;   with a level), and doomT back to 0
        jsr mkRuns              ; ...and the runs renumber wholesale, so re-derive the rest
        inc blkVer              ; the obstacle map moved: the angel's fill must be redone
        jmp fallInv             ; renderSym's run cache still believes the old geometry -- a
                                ;   column it thinks is unchanged is a column it will not repaint

; ---- wtCells: walk wall wsWall's cell list: blkT[cell] = mapT[cell] ----
; It used to set doomT[cell] = A as well, which is why it took an argument and why it was called
; twice -- once on the way out purely to MARK the group (the map does not change until the last
; frame, so the blkT copy that call did was a no-op), once on the way back to rebuild blkT.
; With doomT gone the marking call went with it and this takes no argument.
wtCells:ldy wsWall
        lda wallCLoT,y
        sta wtLd+1
        lda wallCHiT,y
        sta wtLd+2
        ldy #$00
wtLd:   lda $ffff,y             ; operand patched: the group's $ff-ended cell list
        cmp #$ff
        beq wtCDn
        tax
        lda mapT,x
        cmp #$01                ; mapT: translate, as oiBlk does
        lda #$00
        rol
        eor #$01
        sta blkT,x
        iny
        bne wtLd                ; always: a group is far shorter than a page
wtCDn:  rts

; ---- wtDoom: load the doomed group's cells into the compare slots wallSink tests ----
; Replaces doomT, a 256-byte page that marked at most $04 cells. Runs once, when the collapse
; starts.
; The unused slots are filled with a DUPLICATE of the first cell rather than a sentinel: idT
; uses $ff for "a column that struck nothing", so an $ff in a slot would match those columns and
; every empty column would read as doomed. A duplicate can only match what the real list matches.
wtDoom: ldy wsWall
        lda wallCLoT,y
        sta wdF+1
        sta wdLd+1
        lda wallCHiT,y
        sta wdF+2
        sta wdLd+2
        ldy #$00
wdF:    lda $ffff,y             ; operand patched: the first cell -- a group always has one
        ldx #$03
wdFil:  sta dcT,x
        dex
        bpl wdFil
        ldx #$00
wdLd:   lda $ffff,y             ; operand patched: ...then the slots the group actually uses
        cmp #$ff
        beq wdDn
        sta dcT,x
        iny
        inx
        cpx #$04       ; the NDOOM guard makes a longer list a build error, so this can
        bcc wdLd                ;   only stop early -- but it must not walk off the end of dcT
wdDn:   rts
dcT:    !fill 4, 0       ; the doomed cells, one slot each; see wallSink

; ---- wtRun: every exposed face of the doomed cells gets a run id of its own (see DOOM_RUNS) ----
; The ray search splits a span wherever the two ends' run ids differ, and finds the boundary to the
; column, so a door with its own ids gets rays cast at both its edges -- which is what wallSink's
; scan needs to find it. Each new id copies its old one's plane and face, so every other reader
; (seams, occlusion) sees the same wall. Nothing has to put them back: the collapse ends in wtOff,
; and a restart or a level change in entry, and both run mkRuns, which renumbers from the map.
; The FAR SIDE first. A door flush in a straight wall splits its run into old | door | old, and a
; span whose two ends both land on "old" still merges without looking inside -- so the door is
; never struck. Renaming every cell of the run past the door (by cell index: a run lies along one
; line, so "after" is one side) makes it old | door | new, and both of the door's edges split.
wtRun:  lda #$78
        sta wrId
        ldx #$03
wfC:    stx wrK
        ldy #$03                ; the four face tables
wfT:    sty wfTi
        lda runTLo,y
        sta wfR+1
        sta wfS+1
        sta wfW+1
        sta wfV+1
        lda runTHi,y
        sta wfR+2
        sta wfS+2
        sta wfW+2
        sta wfV+2
        ldy dcT,x
wfR:    lda $ffff,y             ; operand patched: the run of this face at the door
        beq wfNx
        cmp #$78
        bcs wfNx                ; already one of ours: dcT pads with a duplicate of its first cell
        sta wfRv
        sty wfDc
        lda #$00
        sta wfM                 ; no new id taken yet: one is only spent if the run goes on
wfJ:    iny                     ; every cell after the door. The run tables are a full page, so
        beq wfDr                ;   walking to 255 reads only zeros past the map
wfS:    lda $ffff,y
        cmp wfRv
        bne wfJ
        tya
        ldx #$03
wfD:    cmp dcT,x               ; another door cell keeps its id for its own turn
        beq wfJ
        dex
        bpl wfD
        lda wfM
        bne wfW
        lda wfRv
        jsr wrOne               ; Y kept
        sta wfM
wfW:    sta $ffff,y
        jmp wfJ
wfDr:   ldy wfDc                ; ...and then the face of the door itself. After its far side is
        lda wfRv                ;   safe for a multi-cell door: a door cell further along the run
        jsr wrOne               ;   was skipped above, still holds the old id, and gets its turn
wfV:    sta $ffff,y
wfNx:   ldx wrK
        ldy wfTi
        dey
        bpl wfT
        dex
        bpl wfC
        rts
; wrOne: A = one face's run id (0 = no face there) -> the id it has now. Y is kept.
wrOne:  beq wrRt                ; no face this side
        cmp #$78
        bcs wrRt                ; already one of ours: dcT pads with a duplicate of its first cell
        tax
        lda wrId
        cmp #$80
        bcs wrFull              ; the reserve is spent: this face keeps its old id
        lda runPFT,x
        ldx wrId
        sta runPFT,x
        inc wrId
wrFull: txa
wrRt:   rts
wrId:   !byte 0
wrK:    !byte 0
wfTi:   !byte 0
wfRv:   !byte 0
wfM:    !byte 0
wfDc:   !byte 0
; the four face tables, by number -- also hzRun's (one copy: the hazard block emits it only when
; there is no wall block to own it)
runTLo: !byte <runWT,<runET,<runNT,<runST
runTHi: !byte >runWT,>runET,>runNT,>runST

; ---- hzRunW: walk one wall's (addrLo, addrHi, outValue, backValue) quads ----
; Both directions in ONE list. They used to be two hzRun triple lists over the SAME addresses,
; so every changed byte cost 6 bytes rather than 4 -- fine while one level had walls, and 19
; bytes over the rayOffQS ceiling the day levels 2 and 3 both did. This is 111 of them back.
; Both values are read every time, whichever way we are going, so the stride stays 4 and the
; walk needs no branch to skip a byte. hzGet/hzRd are hzRun's, shared deliberately: hzRd is the
; self-modified source pointer both routines walk, and wtGo above has just pointed it here.
hzRunW: ldx #$00
hzWL:   jsr hzGet
        cmp #$ff
        beq hzWRt
        sta hzW+1
        jsr hzGet
        sta hzW+2
        jsr hzGet
        sta hzWv                ; the value that takes the wall out...
        jsr hzGet               ; ...and the one that puts it back, now in A
        ldy wsDir
        beq hzWS                ; going back: A is already the byte to store
        lda hzWv
hzWS:
hzW:    sta $ffff               ; self-modified: the table byte this quad names
        jmp hzWL
hzWRt:  rts                     ; hzRun's own hzRt is in the hazard block, out of branch range


; ---- wallsBack: put back every wall that is out, no animation ----
; The restart jumps to entry and reloads nothing, and a fall EXCHANGES the level's tables with
; the shadow -- so a level has to leave in the state it arrived in, or the shadow keeps the
; solved map and hands it back on the next drop.
wallsBack:
        lda #$00                ; a collapse in progress is abandoned. (This used to clear all
        sta wsN                 ;   256 bytes of doomT as well -- a page that existed to mark at
                                ;   most four cells, and had to be wiped on every level change
                                ;   and restart because no file loads it. dcT needs no clearing:
                                ;   wallSink only reads it while wsN says a collapse is running,
                                ;   and wtDoom fills it when one starts.)
        ldx #$03   ; EVERY id the engine has room for, which since wall ids went
wbLp:   stx wsWall              ;   level-local is at most this level's own walls -- the ids
                                ;   above its count have wallStT 0 and are skipped. It used to
                                ;   walk every wall in the chain, and was correct only because
                                ;   this runs before every swap: a level that was not live had
                                ;   wallStT 0 throughout, which is the invariant the whole
                                ;   global-id scheme rested on. Local ids need no such argument.
        lda wallStT,x
        beq wbNx
        txa
        pha
        jsr wallTog             ; wallStT non-zero takes the wtBack path
        pla
        tax
wbNx:   dex
        bpl wbLp
        rts

; ---- wallSink: the doomed wall dropping into the floor, one frame at a time ----
; Called just before renderSym, which is the only place this can go: renderSym derives each
; cell's min and max straight from colH (prepCells, which used to cache them, is gone), so
; colH IS the height the wall will be drawn at.
; idT holds the cell each column's ray struck -- written once per cast column and interpolated
; across the spans -- so a column showing this wall's face is exactly one whose idT matches.
; Halving colH a frame drops it into the floor in four. What is revealed above it is ceiling and
; floor colour, not the room behind: the ray STOPPED at this wall, so nothing behind it was ever
; cast. For four frames of a wall dissolving into white that is the effect, not a compromise --
; the real geometry arrives on the last frame with the delta.
wallSink:
        lda wsN                 ; idle? Then there is no collapse to advance. Without this the
        bne wsBusy              ;   fallthrough hits the dec wsN below on every ordinary frame,
        rts                     ;   wrapping 0 -> $ff and re-running the collapse every 256 frames.
wsBusy: lda #$ff                ; find the doomed wall's SPAN this frame. Scanning downward means
        sta wsLo                ;   the first match is the rightmost column, so wsHi is written
        sta wsHi                ;   once (guarded below) and wsLo keeps falling to the leftmost.
        ldx #$9f
wsFind: ldy idT,x
        ; is the cell this column struck one of the doomed group? This was one indexed load from
        ; doomT, a 256-byte page marking at most 4 cells; it is now 4 compares against the
        ; cells themselves -- about 20 cycles a column more, for the four frames of a collapse
        ; and nothing else, which is roughly two thirds of one frame over the whole animation.
        ; A column that struck nothing holds $ff, which no slot can equal: $ff terminates the
        ; cell list, so it is not a representable cell, and wtDoom pads with a duplicate.
        cpy dcT
        beq wsHit
        cpy dcT+1
        beq wsHit
        cpy dcT+2
        beq wsHit
        cpy dcT+3
        beq wsHit
        bne wsFN                ; the last compare failed, so Z is clear: always taken
wsHit:
        stx wsLo
        lda wsHi
        cmp #$ff
        bne wsFN
        stx wsHi
wsFN:   lda #$ff                ; consume it: an entry this frame's cast did not write must not
        sta idT,x               ;   be matched again next frame. See wtClr.
        dex
        cpx #$ff                ; NOT bpl: the scan starts at column 159, which already has bit 7
        bne wsFind              ;   set, so dex/bpl would fall through after testing ONE column.
                                ;   Run until X wraps past zero instead.
        lda wsHi
        cmp #$ff
        beq wsTick              ; not on screen this frame: nothing to shrink, but the clock
                                ;   still has to run or the collapse would stall out of view
        ; How low may a column go? To the wall it is REVEALING, and no lower (the user,
        ; 2026-11-08: "stop when it gets to the height of the walls it is revealing -- angles of
        ; nearby walls, or flat walls in the distance"). This frame's cast stopped at the door, so
        ; wsBeh casts again through it: the door cells open for a few rays across the span, and
        ; the loop below reads that height back at any column. It used to stop at the wall BESIDE the
        ; span instead, a stand-in that for a door flush in a straight wall is the door's own
        ; height -- so every column had "arrived" on the first frame.
        jsr wsBeh
        lda #$00
        sta wsAny               ; ...and whether ANY column is still falling
        ldx wsHi
wsLp:   lda colH,x
        jsr wsScl
        sta wsT3                ; the door, this frame
        txa                     ; what is behind it, at this column: the NEAREST sample. It
        sec                     ;   interpolated between the two around it until 2026-11-08 (a
        sbc wsLo                ;   lerp and an 8-step multiply, ~70 bytes); over a 4-frame sink
        clc                     ;   the step left at a corner -- at most 4 columns of the wrong
        adc #$04                ;   behind height, for a frame or two -- does not show, and the
        lsr                     ;   bytes were the game. +4 rounds to the nearest 8 (the span is
        lsr                     ;   under 160, so no carry), and the last sample is at or past
        lsr                     ;   wsHi, so this never reads beyond it
        tay
        lda wsBT,y
        cmp wsT3
        bcs wsPut               ; the door is down to it: this column has become the room
        inc wsAny               ; still standing proud of what it hides
        lda wsT3
wsPut:  sta colH,x
        cpx wsLo
        beq wsScan
        dex
        jmp wsLp
; ---- wsBeh: what stands behind the door, every 8 columns across wsLo..wsHi ----
; Sample k is at column wsLo + 8k, the last one at or past wsHi (clamped to the screen). With the
; door's cells opened in mapT -- any non-zero byte is floor to castRay -- each ray runs on to the
; wall behind; they go back to wall at the end. Between samples wsLp takes the nearest, which is exact
; along a flat wall and a few columns out at a corner -- and only until the last frame, when the
; map really opens and the cast takes over with the same answer.
wsBeh:  lda col
        pha
        ldx #$03
wbO:    ldy dcT,x               ; (a duplicate slot just opens the same cell twice)
        lda #$ff
        sta mapT,y
        dex
        bpl wbO
        lda wsLo
        sta wsC
        ldx #$00
wbL:    stx wsK
        lda wsC
        cmp #$a0
        bcc wbIn
        lda #$9f                ; past the right edge: the edge column
wbIn:   sta col
        jsr castRay             ; pp = the height of whatever it reached
        ldx wsK
        lda pp
        sta wsBT,x
        lda wsC
        cmp wsHi
        bcs wbDn                ; this sample is at or past the span's end
        adc #$08                ; (carry clear: the bcs above was not taken)
        sta wsC
        inx
        bne wbL                 ; always
wbDn:   ldx #$03
wbC:    ldy dcT,x
        lda #$00                ; wall again
        sta mapT,y
        dex
        bpl wbC
        pla
        sta col
        rts
wsScl:  sta wsT                 ; A = h -> A = h * wsN / WS_N, X untouched. The accumulator
        lda #$00                ;   STARTS at h and adds h another wsN times, so wsN = WS_N-1
        sta wsT2                ;   returns exactly h -- which is the first frame that scales
        lda wsT                 ;   anything, since arming wipes idT and the span is only found
        ldy wsN                 ;   on the frame after.
wsMul:  clc
        adc wsT
        bcc wsM1
        inc wsT2
wsM1:   dey
        bne wsMul
        ldy #$02       ; >> log2(WS_N), 16-bit
wsDiv:  lsr wsT2
        ror
        dey
        bne wsDiv
        rts

        ; Every column has clamped, so there is nothing left to animate: end it here rather
        ; than sitting on a finished picture until the clock runs out. Reached ONLY from the
        ; bottom of the scan loop -- a frame that found no span exits at wsTick instead, and
        ; must, because arming wipes idT and that first frame is indistinguishable from this
        ; one on wsAny alone. Conflating them ended the collapse before it drew a frame.
wsScan: lda wsAny
        beq wsDone
wsTick: dec wsN
        bne wsMore
wsDone: lda #$00                ; the wsAny path skips the dec, so stop the clock by hand or the
        sta wsN                 ;   idle guard lets the whole collapse run again next frame
        jmp wtOff               ; the collapse has finished: NOW the map really changes (tail call)
wsMore: jmp fallInv             ; repaint in full while it falls, since colH is moving under the cache
wsN:    !byte 0                 ; frames of collapse left
wsT:    !byte 0
wsT2:   !byte 0
wsAny:  !byte 0                 ; any column still above the wall beside it this frame?
wsT3:   !byte 0                 ; the door column's height this frame
wsC:    !byte 0                 ; wsBeh's sample column
wsK:    !byte 0                 ; ...and its index
wsBT:   !fill 21, 0             ; the behind heights, one per 8 columns of the span: (159+7)/8 + 1
wsLo:   !byte 0
wsHi:   !byte 0

sokAn:  !byte 0                 ; frames left in the swallow; 0 = idle
sokWho: !byte 0                 ; hole-like index+1 of the socket doing the swallowing
sokLC:  !byte 0                 ; the last socket DRAWN: its centre column...
sokLY:  !byte 0                 ; ...and its sprite Y, which the orb flies to
sokVar: !byte 0                 ; the orb's ladder variant this frame
sokCX:  !byte 0                 ; and where it is, walked by sokDX/sokDY
sokCY:  !byte 0
sokDX:  !byte 0
sokDY:  !byte 0
        ; One bit per cell, per level, swapped with the rest of the manifest. 32 bytes rather than
        ; 256: it is consulted once per angel step, so the shift costs nothing that matters.

        ; More per-level manifest bytes, moved here from the $3d40 block when the wider level 2
        ; map grew the run tables and pushed it three bytes past $6100. They are label-addressed
        ; and the manifest carries each chunk's destination, so where they live is free choice.
; THIS level's entity counts, and the offsets derived from them. Every shared loop and every
; boundary test reads one of these instead of an immediate, which is what lets one binary serve
; levels holding different numbers of things. SIX CONTIGUOUS BYTES and one manifest entry -- the
; swap copies the block, so a derived value can never drift from the count it came from.
; nOrbT doubles as the ORB/HOLE boundary in orbXCT/orbYCT because the layout is packed.
   ; the LEVEL each EXIT leads to, one byte
                                ;   each; $ff = nowhere, and fallChk walks over such a hole
                                ;   rather than dropping you back where you stand
                 ; orbs
                 ; hole-like entities: exits then sockets
                 ; ...of which this many are exits
                 ; last orb index, for the down-counting loops
                 ; entity index of the first socket
                 ; last entity index of all
                 ; ...and how MANY, which is the one
                                ;   an empty level can state: every loop below counts DOWN from an
                                ;   INDEX, and index 0 means "one entity", never "none"
                 ; HOLE-LIKE index where the pedestals
                                ;   start -- hlSet's only way to tell a pedestal from a socket.
                                ;   Equal to nHoleT on a level with none, so the test never fires.
   ; 60ths between angel steps on THIS level, when it is close
   ; the CORNER exit's entity on this level, $ff for none (LEVEL_CORNER)
                 ; the level that is live (its id): every per-level
                                ;   row indexed by level id - 1 reads it.

; ---- orbColLT / orbColRT: the ball's extent each side of its centre column, per rung ----
; Pure functions of the ladder, in no level file. (This table and the ones below were evicted from
; the hand layout's ORB_SMALL block, which ended at $4000, to give the code room.)
orbColLT: !byte 11,12,9,10,7,8,6,6,5,5,4,4,3,3,2,1,11,11,9,9,9,7,7,6,6,5,5,5,4,4,3,3,2,2,2,1,9,7,5,4,4,2,2,1,1,36,18,30,15,24,12,20,10,8,8,6,5,4,12,6,9,4,7,3,3,2
orbColRT: !byte 12,9,10,7,8,5,5,4,4,3,3,2,2,1,0,0,12,10,10,8,8,8,6,5,4,4,3,3,3,2,2,1,1,0,0,0,8,6,5,3,3,2,1,0,0,35,17,29,14,23,11,19,9,8,7,5,4,4,11,5,8,4,6,3,2,2

; ---- occRT / occLT / occRTW / occLTW ----
; Sixteen bytes, indexed by a clip column 0-3, the same on every level and in no level file.
; What they MEAN is explained next to the glyph scheme ("The stamp's edge cells").
occRT: !byte 218,221,220,219
occLT: !byte 215,216,217,218
; the same two, backed by white, for a cell on a wall's vertical silhouette
occRTW: !byte 218,227,226,225
occLTW: !byte 222,223,224,218

; ---- kMskT / mMskT / orbBitT ----
; Small fixed lookups, identical on every level and in no level file.
orbBitT: !byte 1,2,4,8,16,32,64,128




kMskT: !byte 0,8,12,14
; synMskT: a cellFillT column mask of the columns left SHOWING (bit 3 = column 0) -> the HIGH bit
; of each COVERED column's pixel pair (column c is bits 7-2c,6-2c), so that (b & $55) << 1 &
; synMskT[m] turns exactly the covered columns' 01 pairs into 11. The 01 -> 11 map is what makes wall pixels stamp ink and leaves 00
; (sky/floor) and 10 (seam) alone.
synMskT: !byte 170,168,162,160,138,136,130,128,42,40,34,32,10,8,2,0
mMskT: !byte 7,3,1,0




; ---- the solid-run draw for a SEAM column ----
; Everything rfSlDr does, plus the half-height first row. Seam columns jmp here so the main block
; spends three bytes; this is out of line because there was nowhere else to put it.
; (EDGCHK/RAYCNT instrument rfSlDr and therefore no longer see seam columns. Diagnostic only.)
seamDrw: lda rsv
        sta sdRow
        cmp #13
        bcs sdNext              ; the run starts below the horizon: nothing to draw
        ; ---- two different questions, two different numbers ----
        ; WHERE THE LINE STARTS wants a conservative floor: it may not begin above the cell's
        ; solid run, or it paints ramp rows. A minimum over a window CENTRED on the seam is
        ; always <= the cell's own minimum, so it is safe, and it slides a column at a time
        ; instead of jumping four when the seam changes cell.
        ; WHETHER IT DROPS HALF A CELL wants the opposite: the smoothest number available. That
        ; is the wall AT THE SEAM'S OWN COLUMN -- the seam marks a fixed world boundary, so its
        ; own height moves exactly as smoothly as you do. A MINIMUM cannot serve here: it is
        ; whatever sits at the edge of the window, so a step in the wall entering or leaving
        ; flips it. Measured over one strafe the window minimum read 31,32,31,32 while the wall
        ; at the seam read 32,32,32,32.
        ; Using either number for both jobs breaks the other, which is how this arrived here.
        ldx colc
        lda seamT,x
        sec
        sbc #$c7
        sta sdK                 ; seamT holds only single lines now -- see subCvM -- so the
        sta sdCode              ;   code's offset IS the sub-column
        txa
        asl
        asl
        clc
        adc sdCode
        sta sdCol
        tay
        lda colH,y
        sta sdH                 ; the wall at the seam
        ; The window is clamped so it can never run off either end, which keeps the bounds test
        ; out of the loop. At the edges it slides rather than shrinks, and still contains the
        ; seam's cell either way -- s<3 means cell 0, s>156 means cell 39.
        lda sdCol
        sec
        sbc #$03
        bcs sdW0
        lda #$00
sdW0:   cmp #154
        bcc sdW1
        lda #153
sdW1:   tay
        lda #$ff
        sta sdMin
        ldx #$07
sdWl:   lda colH,y
        cmp sdMin
        bcs sdWn
        sta sdMin
sdWn:   iny
        dex
        bne sdWl
        ldy sdMin               ; where the LINE starts, at or below where the wall's run does
        lda rsT,y
        cmp sdRow
        bcs sdSR
        lda sdRow               ; never above the cell's solid run
sdSR:   cmp #13
        bcc sdSR2
        lda #13                 ; entirely below the horizon: all solid, no line
sdSR2:  sta sdSRow

        ; ---- rows the wall has and the line does not: plain SOLID ----
        lda #$01
        sta sdCode
sdFl:   lda sdRow
        cmp sdSRow
        bcs sdFd
        jsr sdPut               ; writes the row AND the row it mirrors to
        inc sdRow
        jmp sdFl
sdFd:   cmp #13                 ; A is still sdRow, from the compare above
        bcs sdNext              ; the solid fill reached the horizon: no line to draw
        ; gap = 8*start + h - 100, the black space between the wall at the seam and where the
        ; line would start. Push the line down by MASK - (gap & MASK) so the residual lands in a
        ; band SEAMSTEP px wide, and the edge steps by SEAMSTEP instead of by a whole char row.
        lda sdSRow
        asl
        asl
        asl
        clc
        adc sdH
        sec
        sbc #100
        cmp #$08
        bcs sdFull              ; the line already starts a whole row or more below the wall:
        and #$06    ;   pushing it further down would only widen the gap
        sta sdCode
        lda #$06
        sec
        sbc sdCode
        beq sdFull              ; offset 0 is the plain full-height line
        lsr                     ; v = offset/2, so 1, 2 or 3
        sec
        sbc #$01
        asl
        asl                     ; (v-1)*4
        clc
        adc sdK                 ; + the seam's column
        clc
        adc #$cb
        sta sdCode
        jsr sdPut               ; the line's first row, and its mirror below the horizon, where
        inc sdRow               ;   fontB turns the same code into a line in rows 0-3
        lda sdRow
        cmp #13
        bcs sdNext              ; the half row WAS the whole line
sdFull: lda sdRow
        clc
        adc bufOff
        tay
        lda sldLoT,y
        sta jv
        lda sldHiT,y
        sta jv+1
        ldx colc
        lda seamT,x
        jmp (jv)                ; -> ascending chain -> jmp rfNext
sdNext: jmp rfNext

; sdCode into row sdRow of the live buffer at this column, AND into the row it mirrors to below
; the horizon -- the same pairing the solid chain does in one store, so callers never have to
; think about the second write. The buffer base is page-aligned, so rowLoT/rowHiT (which hold
; row*40) need only the high byte added.
; ---- place a corner's mark: which column, and who wins a collision ----
; WHICH COLUMN. subFace has narrowed the span to ADJACENT columns by the time it gets here, so
; spanL and spanR straddle the boundary: one is the near wall, the other the far. Taking spanR
; unconditionally put the mark on whichever side happened to be on the RIGHT, so mirror-image
; corners resolved opposite ways -- one reading as a line on the corner in front of you, the other
; as a line on the far wall. colH is 1/z, so the taller column IS the nearer wall.
;
; WHO WINS. Two lines closer than a char cell collapse to the NEARER one. The test is column
; DISTANCE, not "same cell", and that distinction is the whole point: a cell-based rule is
; discrete, so two lines 2-3px apart pop in and out as they drift across a cell boundary -- which
; is exactly what the two-line pair glyphs were built to paper over. Distance is continuous: the
; gap closes, crosses four columns once, and the far line goes for good. A step, not a flicker.
;
; Four columns is not arbitrary. The widest two lines can sit inside ONE cell is 3 columns, so
; collapsing anything closer than 4 makes the same-cell case unreachable, and the pair glyphs with
; it. Scanning cell-1..cell+1 covers the rule -- a line within 3 columns cannot be further away
; than that -- and the distance test discards whatever the scan over-reaches into.
; ---- where does this wall stop being tall enough to carry a line? ----
; colH is LINEAR in screen column -- that is what the rectilinear projection buys -- so the two
; end heights give the crossing exactly, once per span, with no per-boundary height lookup:
;
;     H  = 11 = 8M-4, the height at which the solid run is M chars tall
;     c* = spanL + W * (h_L - H) / (h_L - h_R)
;
; and every boundary past c* is shorter still, because a planar wall recedes one way. This is
; one rule doing the work of the two it replaces: both ends below H means c* falls outside the
; span and nothing is drawn (what SEAMFAR did), and a seam past c* is too short (what SEAMNEAR
; did, but without reading colH for every boundary).
;
; SEAMFAR has already thrown out the both-ends-short case, so exactly one end is above H here.
ssCutS: ldx spanL
        lda colH,x
        sta ssHL
        ldx spanR
        lda colH,x
        sta ssHR
        lda #$00
        sta ssCutD
        lda ssHL
        cmp #$0b
        bcc ssCtR               ; left end short -> the wall recedes LEFT
        lda ssHR
        cmp #$0b
        bcs ssCtN               ; both ends tall enough: no cut anywhere
        sec                     ; receding right: t = (h_L - H) / (h_L - h_R)
        lda ssHL
        sbc #$0b
        sta fr
        sec
        lda ssHL
        sbc ssHR
        jmp ssCtT
ssCtR:  lda #$ff
        sta ssCutD              ; receding left: t = (H - h_L) / (h_R - h_L)
        sec
        lda #$0b
        sbc ssHL
        sta fr
        sec
        lda ssHR
        sbc ssHL
ssCtT:  tax                     ; X = the height difference across the span
        lda recipLoT,x
        sta mlo
        lda recipHiT,x
        sta mhi
        jsr sideMul             ; s1 = fr * 256 / difference, the fraction along the span
        lda s2
        beq ssCtF
        lda #$ff                ; saturated: the crossing is at the far end
        bne ssCtG               ; always
ssCtF:  lda s1                  ; NOT s2 -- reading the high byte here made t zero every time,
ssCtG:  sta mq                  ;   so c* collapsed to spanL: a right-receding wall lost every
                                ;   seam past its first column while a left-receding one lost
                                ;   none. The user spotted it as exactly that asymmetry.
        lda ssW
        jsr mul8
        lda phi
        clc
        adc spanL
        sta ssCut
        rts
ssCtN:  lda #$9f    ; nothing on screen is past this
        sta ssCut
        rts

; ---- moved out of the main code block ----
; jsr-entered from the boundary walk, so its address is free, and the block below
; ORB_SMALL had 26 bytes when the effective-column basis needed 135.
; One boundary, at world coordinate ssK. Leaves seamT marked if it lands on a free cell.
; ---- ssPwS: dp for this face, and the largest s*s that still leaves a placeable panel ----
; Out here in the free run rather than inline in seamSpan, which lives in the MAIN block below
; ORB_SMALL: that block was down to 41 bytes and this is 60 of them, while the stream has room to
; spare. A jsr per walking span, about 65 cycles a frame.
        ; dp is the perpendicular distance from the player to the wall PLANE, and runPFT holds
        ; that plane per run -- a run lies in one plane by construction. sideT picks the axis the
        ; same way calcU does, so the two cannot disagree about which coordinate u is.
        ; Once per span, and only here: 65% of spans die on the uaH/ubH test above without ever
        ; reaching the walk, and paying a multiply for those would cost more than this saves.
ssPwS:  ldx spanL
        ldy faceIdT,x           ; the RUN id. idT holds the CELL id -- that is what seamSpan's
        lda sideT,x             ;   first test compares -- and runPFT is indexed by run.
        bne spwX
        lda py                  ; side 0: u runs along Y, so the plane is an X
        sta ssPUL
        lda py+1
        sta ssPU
        lda #$00
        sec
        sbc px
        sta shD
        lda runPFT,y
        and #$1f                ; the plane (AND leaves the borrow alone)
        sbc px+1
        jmp spwA
spwX:   lda px                  ; otherwise u runs along X and the plane is a Y
        sta ssPUL
        lda px+1
        sta ssPU
        lda #$00
        sec
        sbc py
        sta shD
        lda runPFT,y
        and #$1f
        sbc py+1
spwA:   sta shD+1
        bpl spwP
        lda #$00                ; |plane - player| as 8.8 cells
        sec
        sbc shD
        sta shD
        lda #$00
        sbc shD+1
        sta shD+1
spwP:   lda shD+1               ; 64 cells to the side: the shift below would wrap, and SEAMFAR
        cmp #$40                ;   threw this away long ago
        bcs spwNo
        lda shD                 ; dp in QUARTER cells, ROUNDED: (dp8.8 + 32) >> 6, which is the
        clc                     ;   top byte once it has been shifted left twice
        adc #$20
        sta shD
        lda shD+1
        adc #$00
        sta shD+1
        asl shD
        rol shD+1
        asl shD
        rol shD+1
        lda shD+1
        bne spwNz
        lda #$01                ; floored at a quarter cell: standing ON the plane is a degenerate
spwNz:  cmp #$80                ; dp_q past 127 is a plane 32 cells to the side, which SEAMFAR
        bcs spwNo               ;   threw away long ago -- and it is the table's bound
        tay
        lda sMaxT,y             ; the largest s that still leaves a placeable panel, quarter cells
        beq spwNo
        sta smHi                ; s_max as 8.8 cells is q*64, so take (q,0) down two bits
        lda #$00
        sta smLo
        lsr smHi
        ror smLo
        lsr smHi
        ror smLo
        lda smLo                ; +half a quarter cell. The test this replaces ROUNDED s to quarter
        clc                     ;   cells before squaring, so an s of 5.859 rounded down to 5.75
        adc #$20                ;   and passed; comparing against an exact s_max is half a quarter
        sta smLo                ;   tighter and dropped a seam the old rule kept. The low six bits
                                ;   of q*64 are clear, so this can never carry.
        clc                     ; kHi = floor(p_along + s_max)
        lda ssPUL
        adc smLo
        lda ssPU
        adc smHi
        sta ssKHi
        sec                     ; kLo = CEIL(p_along - s_max): a boundary on the band's lower edge
        lda ssPUL               ;   counts only if at or above it, so a fraction rounds UP
        sbc smLo
        tax
        lda ssPU
        sbc smHi
        bcc spwLo0              ; the band runs off the near end of the map
        cpx #$00
        beq spwLoS
        clc
        adc #$01
spwLoS: sta ssKLo
        rts
spwLo0: lda #$00
        sta ssKLo
        rts
spwNo:  lda #$01                ; an EMPTY range -- kLo above kHi -- rejects every boundary
        sta ssKLo
        lda #$00
        sta ssKHi
        rts


; ---- ssPw: is there a panel at ssK wide enough to place a line in? ----
; Carry CLEAR = yes. Called from the walk BEFORE ssAny because it is O(1) against ssAny's scan
; over the span's cells, and down a hall it is the test that actually fires: a boundary too narrow
; to place stops the walk outright, since everything further along the face is narrower still.
; The 16-bit compare at the end already leaves the answer in carry, so the routine needs no
; epilogue -- and the early "too far to bother" exit lands on the same rts with carry SET.
ssPw:   lda ssK                 ; two compares against the range ssPwS worked out per span
        cmp ssKLo
        bcc ssPwNo
        cmp ssKHi
        bcc ssPwOk
        beq ssPwOk
ssPwNo: sec                     ; outside the band: stop the walk, the face only narrows from here
        rts
ssPwOk: clc
        rts                     ; carry clear = the panel is wide enough to place a line in

; ---- entGate: can ANY entity be projected this frame? Carry SET = no, and the sprite
; registers have been cleared; carry CLEAR = yes, run the frame trig and the loops.
; The frame trig in orbMove -- two qTrig, four oFrac, four kSgn, ~800 cycles -- was computed
; before anything asked whether an entity would use it. Nothing can when no entity passes the
; cone and zone tests (the loop below fills cnOkT) and no icon wants a slot (the carried orb, a
; socket animation). (It once asked only whether an un-hidden orb existed and whether a hole was
; in line of sight -- holeSeeT, which the zones replaced; see the history in the loop's comment.)
entGate:
        ; ---- ASK THE CONE, FOR EVERY ENTITY, ONCE ----
        ; THE CARRY/sokAn TEST MOVED BELOW THE LOOP. It used to return "yes" before anything else
        ; ran, which was free when the gate's only other job was a scan. Now the loop FILLS cnOkT
        ; and orbOne reads it, so an early exit here would leave orbOne reading last frame's
        ; verdicts -- entities appearing and vanishing by one frame of history, every time you
        ; picked something up.
        ; This gate's whole job is to spare omTrig's ~800 cycles of frame trig when nothing will
        ; use them, and it could not do it: all it asked was whether an un-hidden orb exists
        ; ANYWHERE on the level. On any level with an orb that is always yes, and CULLCNT measured
        ; it closing on ZERO frames of a 4,630-frame run.
        ; cnTest can answer it, and orbOne was already paying for it once per entity -- so it moves
        ; up here, the verdicts go in cnOkT, and orbOne reads one byte. Same cycles spent on the
        ; test; omTrig skipped whenever nothing is in front of you, which on the spin pose is 82%
        ; of frames. One loop over the orbs and then the hole-likes, in holeOne's own order.
        ; It does NOT early-out on the first entity that passes: every verdict has to be stored,
        ; because orbOne reads all of them.
        lda #$00                ; orbProjC: no idol has been projected yet this frame
        sta pcP+0
        sta pcP+1
        sta pcP+2
        lda py+1                ; ZONES: the player's cell, and the zones visible from anywhere in it --
        jsr mulW
        clc
        adc px+1
        ldx ogPcV               ; GATEFAST: the same cell as when znP and stmpM were worked out? Then
        beq ogPcN               ;   they still hold -- the cell changes about every ten frames walking,
        cmp pcell               ;   and the stamp-list scan alone was up to ~460 cycles on the hub.
        beq ogPcS               ;   objInit clears ogPcV on every level change and restart.
ogPcN:  ldx #$01
        stx ogPcV
        sta pcell               ;   one mapT read a frame, for every entity's test below
        tax
        lda mapT,x
        sta znP
        lda #$00                ; STMP: which pedestals/sockets could a wall partly hide from this cell?
        sta stmpM               ;   (a short sorted list; most cells are not in it)
        ldx stmpT
        beq ogStD
        ldy #$01
ogStL:  lda stmpT,y
        cmp pcell
        beq ogStH
        bcs ogStD               ; sorted: past it, so it is not listed
        iny
        iny
        dex
        bne ogStL
        beq ogStD
ogStH:  lda stmpT+1,y
        sta stmpM
ogStD:
ogPcS:
ogNoH:
        clc
        lda nOrbT
        adc nHoleT
        sta cnEnd
        lda #$00
        sta cnAny
        sta cnI
        tax                     ; GATEFAST: X IS the entity index for the whole loop
ogEnL:  cpx nOrbT
        bcs ogEHol

        lda orbHidT,x
        bne ogENo               ; hidden: no verdict to give
        ldy orbYCT,x            ; ZONES: its zone's bit against mapT[player cell] -- BEFORE the cone,
        lda rowMulT,y           ;   which costs ~125 to this test's ~40. (mulW inlined: no jsr/rts or
                                ;   Y save in the gate's per-entity loop -- same rowMulT table.)
        clc
        adc orbXCT,x            ; its cell
        lsr                     ; two cells to a byte; carry = the odd one, in the high nibble
        tay
        lda zoneT,y
        bcc ogZe
        lsr
        lsr
        lsr
        lsr
ogZe:   and #$07
        tay
        lda zBitT,y
        and znP
        beq ogENo               ; no part of its zone is visible from anywhere in this cell
        bne ogETst              ; always
ogEHol: txa                     ; GATEFAST: A must BE the entity index here -- the old loop head left it
        sec                     ; ---- a hole-like: its fixed zone mask (its whole disc) ----
        sbc nOrbT
        tax
        lda hzMskT,x
        and znP
        beq ogENo
        lda hlSeat,x            ; a CONSUMED socket is not in the world any more (holeOne skips it too);
        bmi ogENo               ;   left in, it still set cnAny and kept the per-frame entity work alive.
                                ;   AFTER the zone test, so only a disc that could be in view pays for it.
        ldx cnI                 ; GATEFAST: back to the entity index for the cone
ogETst:                         ; GATEFAST: cnTest INLINED, Y and A only -- X keeps the entity
        sec                     ; the cell delta, exactly as orbOne computes it (zero page now)
        lda orbXCT,x
        sbc px+1
        sta oix
        bcs ogXP
        eor #$ff
        adc #$01
ogXP:
        sta cnB                 ; |dx|
        sec
        lda orbYCT,x
        sbc py+1
        sta oiy
        bcs ogYP
        eor #$ff
        adc #$01
ogYP:
        sta cnT                 ; |dy|
        cmp cnB
        bcs ogCh
        lda cnB
ogCh:   cmp #$02                ; Chebyshev distance: adjacent or nearer is always in
        bcc ogPass
        tay
        lda coneTolT,y          ; the tolerance for the TRUE distance, before any halving
        sta ogTol
        tya
ogHv:   cmp #$08                ; halve both deltas until the larger fits the 8x8 table
        bcc ogIx
        lsr cnB
        lsr cnT
        lsr
        bne ogHv                ; always: A was >= 8, so it is >= 4 now
ogIx:   lda cnT
        asl
        asl
        asl
        ora cnB
        tay
        lda coneBQT,y           ; first-quadrant bearing
        bit oix
        bpl ogQX
        eor #$ff                ; dx < 0: $80 - b
        clc
        adc #$81
ogQX:   bit oiy
        bpl ogQY
        eor #$ff                ; dy < 0: 0 - b
        clc
        adc #$01
ogQY:   sec
        sbc pa
        clc
        adc ogTol
        sta cnB                 ; (bearing - heading + tol) & 255
        lda ogTol
        asl                     ; 2 * tol: inside the cone iff the value is below it
        cmp cnB
        beq ogENo
        bcc ogENo
ogPass: lda #$ff
        sta cnOkT,x
        sta cnAny
        bne ogENx               ; always: A is $ff

ogENo:  ldx cnI
        lda #$00
        sta cnOkT,x
        sta orbSeenT,x          ; ...and NOT SEEN: obOrder leaves a culled entity out of the sort, so
                                ;   orbNo never runs for it -- and a stale 1 freezes an angel for ever
ogENx:  inx
        stx cnI
        cpx cnEnd
        bcc ogEnL
        lda cnAny
        ora carry               ; ...and the two things that want a slot without being in the world
        ora sokAn
        bne ogYes
ogNone:
        lda #$00                ; nothing in sight: an empty frame, registers cleared as usual
        sta omEn
        sta omXX
        sta omYY
        sta omPri
        sta omX8
        sta onv
        ldx #$08                ; ...and the HOLE allocator's count, which the open path resets to 8
        stx onvH                ;   ("no hole-like slot used"). Left alone, it kept its last value --
                                ;   0 from boot on a view that never opens the gate -- and occStamp
                                ;   read that as eight hole-like slots and stamped all eight from
                                ;   stale slot data, every shut frame (~20 raster lines on level 1's
                                ;   strafe). The third "a gate that shuts" contract, after orbSeenT
                                ;   and the carry/sokAn exit.
        ; ---- AND NOTHING WAS SEEN ----
        ; orbSeenT is "did this entity take a sprite slot last frame", which is the angels' whole
        ; observation test. orbOne writes it, and when this gate shuts orbOne never runs -- so the
        ; flags would keep LAST frame's values for as long as the gate stays shut. The old gate got
        ; away with it by never shutting on a level with an orb; this one shuts constantly, and a
        ; stale 1 here means an angel you have turned away from stays frozen for ever.
        ldx #$10
ogSn:   sta orbSeenT,x
        dex
        bpl ogSn
        lda #$00                ; (the loop left A alone, but say so rather than rely on it)
        sec
        rts
ogYes:  clc
        rts
; ---- ANGREACT's rxStamp, HERE and not beside rxGo (2026-11-12) ----
; Placed AFTER entGate on purpose: ogEnL is a pinned hot loop, and the padding compaction puts in
; front of it is the one hole faceIdT (160 bytes, inside one page) fits. That padding is 159 + the
; bytes moved across, and it exists only while the loop would otherwise straddle a page, so moving
; this 23-byte routine across leaves room both ways: about 20 bytes of engine growth before ogEnL,
; and about 25 of shrinkage, before faceIdT has no home ("no hole for faceIdT"). Move cold code
; across (either way) to re-centre it if that error comes back.
; rxStamp (bfsTick, every frame): the tick the player entered the cell they are in now.
rxStamp:cmp rxPrv
        beq rxsD
        sta rxPrv
        sei
        lda frameCnt
        ldy frameCnt+1
        cli
        sta rxWT
        sty rxWT+1
rxsD:   rts
; ---- oSPut: stamp ONE cell of a stamp row, synthesising the glyph where the cell is a wall edge ----
; A = the columns the stamp leaves SHOWING (cellFillT mask, bit 3 = column 0); osGly / osGlyW =
; the whole-column split glyphs to fall back on, black- and white-backed; Y = the column, (osPtr),y
; the cell. Preserves Y.
;   BLANK           nothing to occlude: leave it (sky or floor; the orb is in front)
;   SOLID or seam   fully wall: the split glyph, black-backed, as before
;   a ramp / step   a wall EDGE: copy its 8 rows into the next scratch glyph with 01 -> 11 on the
;                   covered columns, in BOTH charsets (B is the row-reversed copy), store that code
;   scratch full    fall back to the old rule: oSBack picks the backing, the split glyph goes in
; The synthesis is the whole point: at a wall's base the cell is floor with a sliver of wall along
; its top, and stamping a whole-column split there hung the stamp 7 px over the floor. Now the ink
; follows the wall's own outline in that cell, pixel for pixel.
oSPut:  sta ohMsk
        tax
        lda synMskT,x           ; the pair-high-bit mask for the COVERED columns
        sta osCov
        lda (osPtr),y
        beq oSPdn               ; BLANK: leave it
        cmp #$c7
        bcc oSPedg              ; a ramp or a step (SOLID is caught below)
        cmp #$c7
        bcc oSPdn               ; a readout: leave it
        cmp #$d7
        bcc oSPsol              ; a seam is a whole wall
        cmp #$ee               ; a NEW FACE's marked fill is whole wall too. HERE, before the rts:
        bne oSPnbk              ;   its code is past the seams, among the occluders' and scratch codes
        lda ohMsk               ; ...and covered WHOLE (no column left showing): the DOTTED occluder,
        bne oSPso2              ;   so the stamped cells keep the face's dots. Part-covered: the plain
        lda #$ef               ;   split. (It went to oSPsol, whose SEDGE test then read the
        sta (osPtr),y           ;   mark's code as a seam's.)
        rts
oSPnbk:
        cmp #$f0               ; ...and so is the CURTAIN's
        beq oSPsol
        ldx osRag               ; RAGGED, the corner exit: a SPLIT here is the other face's stamp. The
        beq oSPq                ;   two faces meet at the corner line, right over the hole, in one cell:
        sec                     ;   the first span's stamp covered its side of it and the second found an
        sbc #$d7            ;   occluder and left it, so the hole showed through the line's foot (the
        bcc oSPq                ;   user, 2026-11-13). Both sides stamped is the whole cell: ragMgT says
        cmp #$13            ;   which code that is -- the full-cover line keeper if the split kept
        bcs oSPq                ;   a corner line at column 0 or 3, else OCC_FULL.
        tax
        lda ragMgT,x
        sta (osPtr),y
oSPq:        rts                     ; an occluder or scratch code already
oSPedg: cmp #$01
        beq oSPsol

        ; ---- can a PRE-BUILT split say this cell? ----
        ; A vertical boundary can be said by one of the seven occluders (or their white-backed
        ; twins) and costs no scratch code. Only a cell split across ROWS -- the wall's base --
        ; actually needs synthesising. Testing this is what stops a tall wall edge eating the
        ; whole scratch budget and leaving its lower cells unstamped.
        tax
        lda osRag               ; ---- RAGGED: the corner exit's stamp over a wall's BASE -> rubble ----
        beq oSPnr
        lda occVrtT,x           ; 0: some row of this cell has no wall -- the base crosses it
        bne oSPnr
                                ; PART-covered too: where two faces meet, each stamp covers half of
                                ;   the cell. It took a split, the other face's stamp found it and
                                ;   ragMgT filled it WHOLE -- a full black cell hanging at an inside
                                ;   corner, the shallowest point of the base (the user's screen02,
                                ;   2026-11-13). Rubble across the cell is right there: both halves
                                ;   are wall, and the second stamp leaves rubble alone. At a block's
                                ;   OUTER edge it overhangs the floor beside it by its own height.
        sty osPY
        txa                     ; the cell's glyph in charset B, as the eye sees it below the horizon
        asl                     ;   (osSrc: the synthesis pointer, free here)
        sta osSrc
        lda #$19
        rol
        asl osSrc
        rol
        asl osSrc
        rol
        sta osSrc+1
        ldy #$00                ; how far down the cell the wall reaches: its rows with any wall in them
oSRgL:  lda (osSrc),y
        beq oSRgD
        iny
        cpy #$08
        bne oSRgL
oSRgD:  tya                     ; the rows of wall, 1-7, ARE the glyph: RAG0 + rows - 1
        bne oSRgH
        ldy osPY                ; (0: no wall in the top row -- nothing to stand on: the split, as before)
        jmp oSPnr
oSRgH:  clc
        adc #$f0
        ldy osPY
        sta (osPtr),y
        rts
oSPnr:
        lda osLast              ; bottom of this column only -- OCCSYNROW=all drops this gate (see OCCSYNTH)
        beq oSPnos
        lda occVrtT,x
        beq oSPsyn
oSPnos:
        lda ohMsk               ; oSBack reads the cell again and says which backing is right:
        jsr oSBack              ;   carry set = wall beyond the split, clear = floor beyond
        lda osGly
        bcs oSPvs
        lda osGlyW
oSPvs:  sta (osPtr),y
        rts
oSPsyn: txa                     ; THE CELL CODE, out of X.
        sta osSrc               ;   A does NOT hold it here: oSPedg's "lda occVrtT,x / beq oSPsyn"
                                ;   leaves A = 0 on the branch taken, so building the source
                                ;   pointer from A read charset code 0 -- BLANK -- and every
                                ;   synthesised glyph came out 48 bytes of zero. Broken since
                                ;   occVrtT was added (7c25c05); X has held the code since the
                                ;   "tax" in oSPedg, and ldx osSyn below is what takes it away.
                                ;   The symptom reads as the OPPOSITE thing depending on the view:
                                ;   where the stamp overhung, a blank glyph looks like the fix;
                                ;   where it did not, it is a hole punched through a solid
                                ;   occluder. Same bug (the user, 2026-10-02, X372 Y5A5 A1540 --
                                ;   screen cell held scratch code 250 with $c7d0 all zeroes).
        ldx osSyn
        cpx osLim
        bcs oSPfb               ; this buffer's scratch exhausted this frame: the old whole-column stamp
        sty osPY
        lda #$00
        sta osSrc+1
        asl osSrc
        rol osSrc+1
        asl osSrc
        rol osSrc+1
        asl osSrc
        rol osSrc+1             ; C = 0 after this: the code is a byte
        lda osSrc+1
        adc #>charset
        sta osSrc+1
        ; destination: scratch glyph X, in A and in B. The scratch codes are the top of the charset,
        ; so every one lies in the charset's last page: the high bytes are constants and only the
        ; low byte is patched into the two stores below.
        txa
        adc #$f8        ; C is still 0
        sta osTmp               ; the code we will store
        txa
        asl
        asl
        asl
        adc #$c0   ; C = 0: X <= 8
        sta oSPa+1
        sta oSPb+1
        ; 8 rows: t = b | (((b & $55) << 1) & cov). A gets row Y, B (the mirror) gets row X = 7 - Y.
        ldy #$00
        ldx #$07
oSPrw:  lda (osSrc),y
        sta osTmp+1
        and #$55
        asl
        and osCov
        ora osTmp+1
oSPa:   sta $c7c0,y
oSPb:   sta $cfc0,x
        iny
        dex
        bpl oSPrw
        inc osSyn
        ldy osPY
        lda osTmp
        sta (osPtr),y
        rts
oSPfb:                          ; OCCFB=skip: fall through to the rts and leave the cell as drawn.
                        ; See OCCFB -- stamping OCC_FULL here is the wall-base overhang bug,
                        ; and it fires fifteen times a frame on the hub.
oSPdn:  rts
oSPsol: cmp #$c7         ; a SEAM cell whose stamp ends on the line: the edge split that
        bcc oSPso2              ;   keeps it (SEDGE). SOLID comes here too, and goes straight on.
        sbc #$c7         ; C set by the cmp
        and #$03                ; the line's column -- the sub-cell starts too ((v-1)*4 + k + 4):
        ldx ohMsk               ;   the line then starts at the top of this one cell, not 2-6 px
        bne oSPsep              ;   down, which is the look before those existed
        tax                     ; FULLY covered: keyed on the line alone (column 0 or 3)
        lda seFT,x
        beq oSPso2
        sta (osPtr),y
        rts
oSPsep: cmp seKT,x              ; partly covered: the edge split whose line is this one
        bne oSPso2
        lda seGT,x
        sta (osPtr),y
        rts
oSPso2: lda osGly               ; fully wall: black-backed split, no question to ask
        sta (osPtr),y
        rts
osRag:  !byte 0                 ; RAGGED: 1 while occStamp is on the corner exit's slot
ragMgT: !byte $da,$da,$da,$da,$da,$da,$da,$da,$da,$da,$da,$da,$da,$ea,$eb,$ec,$eb,$ec,$ed   ; an occluder/split code - OCC0 -> the same cell covered whole
seKT:   !byte $ff,2,$ff,1,$ff,$ff,$ff,0,1,$ff,$ff,$ff,2,$ff,3,$ff   ; cellFillT mask -> the seam column its edge split keeps, $ff none
seGT:   !byte 0,230,0,229,0,0,0,228,231,0,0,0,232,0,233,0   ; ...and that split's code
seFT:   !byte 234,235,236,237   ; fully covered, line at k -> its split, 0 none
; mkRuns's bit table and scratch. Out of the $9200 block, which the row-counted vertical pass
; (2026-09-17) filled to the byte -- bfsQ sits at its end and the page boundary is hard.
mrNext: !byte 0
mrWid:  !byte 0
mrEid:  !byte 0
mrWp:   !byte 0
mrEp:   !byte 0
mrX:    !byte 0
mrY:    !byte 0
; ---- omTrig: once a frame, the trig and the shared product halves every entity projection uses ----
; This was inline in orbMove. It is ~110 bytes with four local labels and no early exit, called
; exactly once a frame, and the main code block below ORB_SMALL ran out of room when the two-level
; build met VSPLIT and ENTFOV. A jsr/rts here is 12 cycles against ~800 of arithmetic.
omTrig:
        ; |cos| and |sin| at quarter-unit resolution, folded out of one quarter circle.
        ; cos: a = paq mod 512.  sin: |sin(x)| = |cos(x + quarter turn)|, so a = (paq+256) mod 512.
        lda paqL
        sta oqa
        lda paqH
        and #$01
        sta oqa+1
        jsr qTrig
        sta ocos
        lda paqL
        sta oqa
        lda paqH
        clc
        adc #$01
        and #$01
        sta oqa+1
        jsr qTrig
        sta osin
        cmp omCs+1              ; a new |cos| or |sin|: orbProj's table of multiples starts over
        bne omMcR               ;   (oTmC grows it as entities ask)
        lda ocos
        cmp omCs
        beq omMcD
omMcR:  lda ocos
        sta omCs
        lda osin
        sta omCs+1
        lda #$01
        sta mcN
omMcD:  lda #$00                ; sin(a) < 0 exactly when bit 7 of a is set, and cos(a) < 0
        sta osinS               ; when bit 7 of a+64 is -- no sign tables needed
        lda pa
        bpl oss
        lda #$ff
        sta osinS
oss:    lda #$00
        sta ocosS
        lda pa
        clc
        adc #$40
        bpl ocs
        lda #$ff
        sta ocosS
ocs:    ; ---- the half of every product that all orbs share ----
        ; dx = (orbCell - playerCell) + (0.5 - playerFraction). The right-hand term is the same
        ; for every orb, so (that * cos) and (that * sin) are frame constants. Folding them into
        ; one addend per axis pair leaves the per-orb work as four 8x8 multiplies.
        ; 0.5 - playerFraction, as a signed byte. The range is -127..+128 and +128 does not
        ; fit -- it reads as -128, flipping the sign of every term derived from it. That
        ; happens for exactly one value, a fraction of zero, which is the player sitting
        ; precisely on a cell boundary: the orbs lurch for a single frame while crossing and
        ; snap back once past. Clamp to +127; the 1/256 of a cell it costs is invisible.
        sec
        lda #$80
        sbc px
        cmp #$80
        bne ofxOk
        lda #$7f
ofxOk:  sta ofx
        sec
        lda #$80
        sbc py
        cmp #$80
        bne ofyOk
        lda #$7f
ofyOk:  sta ofy
        lda ofx
        ldx ocos
        ldy ocosS
        jsr oFrac
        sta kxc
        lda ofx
        ldx osin
        ldy osinS
        jsr oFrac
        sta kxs
        lda ofy
        ldx ocos
        ldy ocosS
        jsr oFrac
        sta kyc
        lda ofy
        ldx osin
        ldy osinS
        jsr oFrac
        sta kys
        ; forward picks up kxc + kys, right picks up kyc - kxs. Both are sums of SIGNED
        ; bytes and both need a real 16-bit add: sign-extend each operand into its own high
        ; byte and let adc/sbc carry between them. Sign-extending and then discarding the
        ; carry -- which is what this did -- is wrong by 256 whenever the low bytes carry,
        ; and since these terms come from the player's sub-cell position the error moves as
        ; you walk. It reads as the orbs drifting off the map.
        lda kxc
        jsr kSgn
        sta tmp
        lda kys
        jsr kSgn
        sta tmp2
        clc
        lda kxc
        adc kys
        sta kfL
        lda tmp
        adc tmp2
        sta kfH
        lda kyc
        jsr kSgn
        sta tmp
        lda kxs
        jsr kSgn
        sta tmp2
        sec
        lda kyc
        sbc kxs
        sta krL
        lda tmp
        sbc tmp2
        sta krH
        rts
; ---- vsPrep: a step column's near side, the row its far top lands in, the split code ----
; Called once, on the top step cell of the column (kpos is set). Rows after that one and strictly
; before vsRow are the pure split; vsRow itself, the far top, gets a real selection. The taller
; end is the near wall. Out of line because the main block is within 20 bytes of its ceiling.
vsPrep:
        ldx colc
        lda col4T,x
        tax
        lda colH,x              ; left height...
        cmp colH+3,x            ; ...against right
        bcc vsRgt
        lda colH+3,x            ; left is near: the far top is the right height
        tay
        lda rbT,y
        sta vsRow
        ldy kpos
        lda vsplitL,y
        sta vsCode
        jmp vsSet
vsRgt:  tay                     ; right is near: A = left height = the far one
        lda rbT,y
        sta vsRow
        ldy kpos
        lda vsplitR,y
        sta vsCode
vsSet:  lda colc                ; the stack belongs to this column (see renderSym's entry)
        sta vsOn
        rts
seamOne:
        lda #$00                ; k as 8.8
        sta skL
        lda ssK
        sta skH
        sec                     ; a = |u_L - k|
        lda uaL
        sbc skL
        sta saL
        lda uaH
        sbc skH
        sta saH
        bcs ssaP
        sec                     ; negate
        lda #$00
        sbc saL
        sta saL
        lda #$00
        sbc saH
        sta saH
ssaP:   sec                     ; b = |u_R - k|
        lda ubL
        sbc skL
        sta sbL
        lda ubH
        sbc skH
        sta sbH
        bcs ssbP
        sec
        lda #$00
        sbc sbL
        sta sbL
        lda #$00
        sbc sbH
        sta sbH
        ; Squeeze a and b down to 8 bits together, so their ratio survives. The larger keeps
        ; its top bit; the smaller may collapse to 0, which is the right limit anyway -- a
        ; seam sitting on an endpoint belongs at that endpoint.
ssbP:   lda saH
        ora sbH
        beq ssFit
        lsr saH
        ror saL
        lsr sbH
        ror sbL
        jmp ssbP
ssFit:  ldx spanL               ; P = a * h_L, Q = b * h_R, both 8x8 -> 16
        lda colH,x
        sta mq
        lda saL
        jsr mul8
        lda plo
        sta sPlo
        lda phi
        sta sPhi
        ldx spanR
        lda colH,x
        sta mq
        lda sbL
        jsr mul8
        clc                     ; sum = P + Q
        lda plo
        adc sPlo
        sta sSlo
        lda phi
        adc sPhi
        sta sShi
        bcc ssNrm
        ror sShi                ; a 17-bit sum: fold the carry back in, P follows below
        ror sSlo
        lsr sPhi
        ror sPlo
ssNrm:  lda sShi                ; scale P and sum until the sum is a byte: recip is indexed by it
        beq ssDiv
        lsr sShi
        ror sSlo
        lsr sPhi
        ror sPlo
        jmp ssNrm
ssDiv:  lda sSlo
        beq ssOne               ; degenerate (zero-length wall): leave it alone
        tax
        lda sPlo                ; t = P*256/sum, via one reciprocal multiply
        sta fr
        lda recipLoT,x
        sta mlo
        lda recipHiT,x
        sta mhi
        jsr sideMul
        lda s2
        beq ssT8
        lda #$ff                ; t saturated at 1.0
        jmp ssOff
ssT8:   lda s1
ssOff:  sta mq                  ; offset = (t * width) >> 8
        lda ssW
        jsr mul8
        clc                     ; FH = spanL + (t*W >> 8): the column BEFORE rounding, which is
        lda phi                 ;   what the band has to be measured against -- rounding is the
        adc spanL               ;   step it exists to override, so it cannot come first.
        sta ssFH
        ; ---- hold last frame's line while the solve stays within one column of it ----
        ; The target is FH + plo/256, so a previous line at c is inside the open band (FH-1, FH+1)
        ; exactly when c - FH is 0 or 1: at c = FH the gap is plo/256 < 1, at c = FH+1 it is
        ; 1 - plo/256 < 1, and at c = FH-1 it is 1 + plo/256, which is not. So the whole test is
        ; one subtract and "cmp #2" -- no distances, no fractions, and c < FH borrows to a value
        ; well above 1 and fails it for free.
        ldx sHyPN
        beq ssHyR               ; first frame, or nothing placed last frame
        dex
ssHyL:  lda sHyP,x
        sec
        sbc ssFH
        cmp #$02
        bcc ssHyH
        dex
        bpl ssHyL
ssHyR:  lda plo                 ; nothing to hold: round to nearest, as it always did
        cmp #$80
        lda ssFH
        adc #$00
        jmp ssHyD
ssHyH:  lda sHyP,x              ; inside the band -- last frame's answer stands
ssHyD:  cmp #160
        bcs ssOne               ; ---- off screen: REACHABLE, and the only thing stopping a write
                                ; past seamT (40 bytes, indexed col>>2). It used to be unreachable
                                ; -- the column was interpolated between spanL and spanR, both
                                ; <= 159 -- but the effective-column basis moved the ends: the ray
                                ; nominally at 159 has an angle corresponding to column 161.15, so
                                ; a seam near the right edge can compute 160 or 161 legitimately.
                                ; Also catches an underflow at the left edge, since a negative
                                ; 16-bit value shifts down to something well past 159.
        tay                     ; Y = the seam's logical column

        ; ---- past the point where this wall is too short to carry a line? ----
        ; One compare. ssCutS worked out the column where the wall crosses the height a line
        ; needs, so nothing here has to look at colH again.
        lda ssCutD
        bne ssCtL
        cpy ssCut
        beq ssCtK
        bcs ssOne               ; receding to the RIGHT: past the cut is too short
        bcc ssCtK
ssCtL:  cpy ssCut
        bcc ssOne               ; receding to the LEFT: before the cut is too short
ssCtK:
        ; ---- keep at least four columns between any two lines ----
        ; This was "the cell and both its neighbours must be unmarked" -- the same blunt instrument
        ; the corner rule used to be, and it fails the same way. It is quantised to CELLS, so the
        ; gap it actually enforces runs anywhere from 5 to 11 columns depending where the cell
        ; boundaries happen to fall; as seams drift across those boundaries the surviving set
        ; changes, which is oscillation rather than thinning.
        ; Four columns flat is uniform, and it is the number the corner rule already uses, chosen
        ; for the same two reasons: two lines can never share a char cell (the widest they can sit
        ; inside one is 3 columns), and nothing changes as they cross a cell boundary.
        ; A panel never displaces what is already there. Corners are written during subdivision,
        ; before this pass runs, so they keep precedence -- they mark real structure, a panel line
        ; is decoration.
        sty ssCol
        tya
        lsr
        lsr
        sta ssCell
        sec
        sbc #$01
        bcs ssD0
        lda #$00                ; clamped at cell 0; over-reaching right is harmless, the
ssD0:   sta ssScan              ;   distance test throws it out
        lda #$03
        sta ssCnt3
ssDl:   ldy ssScan
        cpy #$28
        bcs ssDk                ; past the last cell
        lda seamT,y
        cmp #$01
        beq ssDk                ; nothing claimed here
        sec
        sbc #$c7
        sta ssTmp
        tya
        asl
        asl
        clc
        adc ssTmp               ; the column that line sits on
        sec
        sbc ssCol
        bcs ssDp
        eor #$ff                ; |theirs - ours|
        adc #$01
ssDp:   cmp #$04
        bcc ssOne               ; within three columns of a line already drawn
ssDk:   inc ssScan
        dec ssCnt3
        bne ssDl
        ldx ssCell
        lda ssCol
        and #$03
        clc
        adc #$c7
        sta seamT,x
        ldx sHyN                ; only lines that SURVIVED every test become band centres:
        cpx #12            ;   a rejected one is not on screen to be held still
        bcs ssOne
        lda ssCol
        sta sHyC,x
        inc sHyN
ssOne:  rts

        ; ---- and a DEAD BAND on that choice, or a concave corner dithers ----
        ; The two candidates are adjacent columns, so at a CONCAVE corner -- where the faces meet
        ; at the same depth -- their heights are near-tied and the comparison flips as they cross.
        ; Measured walking forward past one: colH 50/51 -> 51/51 -> 51/52 put the mark at column
        ; 96, 95, 96, a visible left-right jump, while the corner itself never moved (bndT read
        ; 80,96,155 at all three). A convex corner is a near wall against a far one, never close,
        ; which is why only concave ones did it.
        ; So spanR only wins when it is taller by SEAMTIE or more. Inside the band the two are
        ; equally near and "nearer" carries no information, so a fixed side is the honest answer --
        ; and it is deterministic per frame, not hysteresis: no memory of what was chosen before.
subCvM: ldx spanL
        ldy spanR
        lda colH,y
        sec
        sbc colH,x              ; h_R - h_L
        bcc subCq               ; spanL is taller: it is the nearer wall
        cmp #$04
        bcc subCq               ; too close to call: take a fixed side rather than dither
        ldx spanR               ; spanR is taller by a margin, so it is the nearer wall
subCq:  stx skH                 ; our column
        lda colH,x
        sta skL                 ; ...and our depth: bigger colH is nearer

        txa
        lsr
        lsr
        sta saH                 ; our cell
        sec
        sbc #$01
        bcs subCs
        lda #$00                ; clamped at cell 0; over-reaching to the right is harmless,
subCs:  sta saL                 ;   the distance test throws it out
        lda #$03
        sta sbH
subCl:  ldy saL
        cpy #$28
        bcs subCk               ; past the last cell
        lda seamT,y
        cmp #$01
        beq subCk               ; nothing claimed here
        sec
        sbc #$c7
        sta sbL
        tya
        asl
        asl
        clc
        adc sbL
        sta sbL                 ; the column the sitting line is on
        sec
        sbc skH
        bcs subCp
        eor #$ff                ; |theirs - ours|
        adc #$01
subCp:  cmp #$04
        bcs subCk               ; a cell apart or more: both lines can stand
        ldy sbL
        lda colH,y
        cmp skL
        bcs subCx               ; theirs is nearer, or level: ours is the one that goes
        ldy saL
        lda #$01
        sta seamT,y             ; ours is nearer, so theirs makes way
subCk:  inc saL
        dec sbH
        bne subCl
        ldx saH                 ; nothing nearer stood in the way: place ours
        lda skH
        and #$03
        clc
        adc #$c7
        sta seamT,x
subCx:  rts

sdPut:  ldy sdRow
        jsr sdPut1
        lda #24
        sec
        sbc sdRow
        tay
sdPut1: lda rowLoT,y
        sta sdPtr
        lda rowHiT,y
        clc
        adc baseHi
        sta sdPtr+1
        lda sdCode
        ldy colc
        sta (sdPtr),y
        rts

        ; The walker and all its data. The dispatcher stays down in the
        ; main code stream's headroom; only this needs somewhere with room.
        ; NO FIXED ORIGIN any more (2026-09-16). It sat at HAZ_BASE = $a700 so the lists would be
        ; at the same address on every level -- but every level-specific table in here is in the
        ; swap manifest now, so the address owes nothing to the level, and the 512-byte slot
        ; between the stream and rayOffQS had hit its ceiling for the second time (the first is
        ; was the $a600 -> $a700 move when each level began carrying its own lists). The stream simply continues, and the assembler's
        ; forward-only origin at rayOffQS ($a900) is the guard: overflow fails the build there.
hzRun:                          ; X = a list's offset in hazLstT: (table, cell, id) until $ff
hzL:    jsr hzGet               ; the table: 0-3 = runWT runET runNT runST
        cmp #$ff
        beq hzRt
        tay
        lda runTLo,y
        sta hzS+1
        lda runTHi,y
        sta hzS+2
        jsr hzGet               ; the cell
        tay
        jsr hzGet               ; the run id it takes
hzS:    sta $ffff,y             ; self-modified: the run table this triple names
        jmp hzL
hzRt:   rts
hzGet:                          ; next byte of the list; every list is well under 256 bytes
hzRd:   lda $ffff,x
        inx
        rts


; ---- arcBld: stamp the departing arc's dictionary into its own block, once per fall ----
; Called as the fall STARTS, which is the one moment charset B still holds the level being LEFT
; -- lvlLook does not run until the handover. So the rim carries the departing floor's checker
; for the whole descent without anything having to remember it.
; The checker comes from charset B's BLANK at the SAME row index, not the mirrored one: see fgLp.
; A glyph here is charset A's, unmirrored, because the drop's rim is floor-above/hole-below, and
; that is the polarity the dictionary holds.
arcBld: lda #$f7     ; ---- the map first: every code is ground unless said otherwise
        ldx #$c6   ;   (a code the walk never saw then draws flat, not sprite data)
agM:    sta arcMap,x  ; counting DOWN: dex already sets the flag, where counting up
        dex                     ;   needs a cpx. Two bytes, and the block was one over.
        ; BNE, NOT BPL. bpl tests the SIGN bit, so a countdown from 198 ($$c6) exits on
        ; the FIRST dex -- $$c5 is still negative -- and the loop filled exactly ONE entry.
        ; The other 198 stayed as whatever was in RAM, so every cell code the rim walk never
        ; saw translated to junk: zeros fell through the bne abSet below (which asserts the map
        ; is never 0) and stored the RAW cell code, which the arc block then drew from sprite
        ; data -- one wrong 8x8 char, the same one everywhere that code appeared. bpl is only
        ; safe counting down from <= $7f; this table is 199 long and always will be.
        bne agM                 ; ...which leaves index 0 unwritten, because dex hits 0 first.
                                ;   BLANK's entry is a CONSTANT (a miss is ground either way), so
                                ;   arcBl2 writes it once at boot -- see there. Doing it here cost
                                ;   three bytes a fall in a block that had none.
        lda #$f6    ; ...except SOLID, which is a cell the rim has already passed
        sta arcMap+1
        ldx #$00
agR:    lda arcCdT,x
        tay
        txa
        clc
        adc #$d7
        sta arcMap,y
        inx
        cpx #$1f
        bne agR
        lda #<$feb8  ; ---- then the glyphs themselves ----
        sta fdB
        lda #>$feb8
        sta fdB+1
        ldx #$00
agLp:   jsr agPt
        ldy #$07
agRw:   lda (fdA),y
        sta fdT                 ; ---- the checker, on the pairs that are 00 ----
        and #$55
        sta fdT2
        lda fdT
        lsr
        and #$55
        ora fdT2                ;   1 at the low bit of every NON-00 pair
        eor #$55                ;   ...so this is 1 at every 00 pair
        and $c800,y ;   and this is the level's checker: BLANK's own glyph, at the
        ora fdT                 ;   SAME row index -- the phase has to match the fill (see fgLp)
        sta (fdB),y
        dey
        bpl agRw
        jsr agNx
        inx
        cpx #$1f
        bne agLp
        lda #$ff                ; the hole: all pair 11, which reads colour RAM -- $08, black
        ldy #$07                ;   everywhere, and a code symPut never marks
agV:    sta (fdB),y
        sta $ffc0,y   ; ...and VOIDCH, the same picture at the code the
        dey                     ;   LANDING lays above its rim. Region 1 reads this block through
        bpl agV                 ;   the overlap window and what is up there is not only fdTail's
        jsr agNx                ;   output; unbacked, code 250 here is $ffd0 and drew as four rows
                                ;   of wall over four of ground, repeating, between the two rims.
        ldy #$07                ; ...and the flat ground either side of the curve, which is the
agG:    lda $c800,y ;   checker itself
        sta (fdB),y
        sta $cfd0,y  ; ...which is also the departing floor ABOVE the
        sta $ffc8,y    ;   rim, in charset B, frozen here for the whole fall
        sta $ffd0,y    ;   (see FDOUT)
        dey
        bpl agG
        ; ---- and the SCRATCH codes, backed in this block as well ----
        ; Region 1 reads this block through the overlap window, and what is up there is not only
        ; fdTail's own output: the landing has already filled its hole area with VOIDCH, which
        ; fdTail does not always overwrite as far down as the region reaches. VOIDCH is code 250,
        ; and code 250 in THIS block is $ffd0 -- unwritten RAM, which drew as four rows of wall
        ; over four rows of ground, repeating, between the two rims. The pictures are the same in
        ; both blocks, so backing them here makes it not matter which code the cell holds.
        ; Stops at $fc: code 255's slot would land on the CPU vectors at $fffa.
        rts
agPt:   lda #$00                ; fdA -> charset A's glyph for rim code X. X survives, which is
        sta fdA+1               ;   what lets it carry the loop count in both builders.
        lda arcCdT,x
        asl
        rol fdA+1
        asl
        rol fdA+1
        asl
        rol fdA+1               ; code * 8; a code is a byte, so no carry out
        sta fdA
        lda fdA+1               ; no clc: code*8 is at most $640, so the last rol left C clear
        adc #$c0
        sta fdA+1
        rts



        * = $9660
; SIGNED quarter-unit offset from the view centre, |v| < 128, so one byte covers the whole FOV
; and there is no second table. The first cut stored a 10-bit value as lo/hi pairs and the hi
; table landed on $c000 -- which is stackLT, the subdivision's own stack. It rendered fine until
; the recursion got deep enough to reach it, then corrupted every span from mid-screen right.
rayOffQS: !byte 162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,187,188,189,190,191,192,193,194,196,197,198,199,200,201,203,204,205,206,207,209,210,211,212,214,215,216,217,219,220,221,222,224,225,226,228,229,230,232,233,234,235,237,238,239,241,242,243,245,246,247,249,250,251,253,254,255,1,2,3,5,6,7,9,10,11,13,14,15,17,18,19,21,22,23,24,26,27,28,30,31,32,34,35,36,37,39,40,41,42,44,45,46,47,49,50,51,52,53,55,56,57,58,59,60,62,63,64,65,66,67,68,69,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94
        ; Step tables, one page each. Addressed by qA*(LM*LB) + qM*LB + qB, so a full byte of
        ; index -- exactly the case a page crossing taxes, and exactly why they are up here
        ; rather than packed in below the height tables where they used to live.
        * = $5d64
; ---- lvlStart: put the player at the LIVE level's official start ----
; Boot and every death go through here. the death restart is "jmp entry", but lvlMeT is RAM and
; still names the level you died on, so reading the start from a table indexed by it is what
; makes a death return you to THAT level's spot rather than the build's.
lvlStart: lda lvlStartT      ; the LIVE level's own six bytes: no level id, no table length
        sta px               ;   -- lvlLoad brought them in with everything else
        lda lvlStartT+1
        sta px+1
        lda lvlStartT+2
        sta py
        lda lvlStartT+3
        sta py+1
        lda lvlStartT+4
        sta pa
        lda lvlStartT+5
        sta paF
        rts
; The live level's own start pose. A LVL_TABLES entry, so it arrives in the level file like any
; other per-level table -- which is the whole point: no level id, no PAL_N.



        * = $7895

; PIVOT's lookups live in the three pages PLAN=3 vacates -- stepT1/2/3 are replaced by the
; lo/hi pair up at 0x2900 and emit nothing here. There is no room above the tables (the
; profiler already claims 0x3600 and $c000 is stackLT), so this is the space there is, and it
; is why PIVOT requires PLAN=3.
;
; qToColT: a quarter-unit offset (biased by 128) straight back to a column -- the inverse of
; rayOffQS. This table is what keeps the prediction divide-free; the rectilinear column
; spacing lives here instead of in an atan.
qToColT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,24,25,26,27,28,29,30,31,31,32,33,34,35,36,37,37,38,39,40,41,42,42,43,44,45,46,46,47,48,49,50,50,51,52,53,54,54,55,56,57,58,58,59,60,61,61,62,63,64,64,65,66,67,67,68,69,70,70,71,72,73,73,74,75,76,77,77,78,79,80,80,81,82,82,83,84,85,86,86,87,88,89,89,90,91,92,92,93,94,95,95,96,97,98,98,99,100,101,101,102,103,104,105,105,106,107,108,109,109,110,111,112,113,113,114,115,116,117,117,118,119,120,121,122,122,123,124,125,126,127,128,128,129,130,131,132,133,134,135,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159
        * = $7795

sinST:  !byte 0,3,6,9,13,16,19,22,25,28,31,34,37,40,43,46,49,52,55,58,60,63,66,68,71,74,76,79,81,84,86,88,91,93,95,97,99,101,103,105,106,108,110,111,113,114,116,117,118,119,121,122,122,123,124,125,126,126,127,127,127,127,127,127,127,127,127,127,127,127,127,126,126,125,124,123,122,122,121,119,118,117,116,114,113,111,110,108,106,105,103,101,99,97,95,93,91,88,86,84,81,79,76,74,71,68,66,63,60,58,55,52,49,46,43,40,37,34,31,28,25,22,19,16,13,9,6,3,0,253,250,247,243,240,237,234,231,228,225,222,219,216,213,210,207,204,201,198,196,193,190,188,185,182,180,177,175,172,170,168,165,163,161,159,157,155,153,151,150,148,146,145,143,142,140,139,138,137,135,134,134,133,132,131,130,130,129,129,129,128,128,128,128,128,128,128,129,129,129,130,130,131,132,133,134,134,135,137,138,139,140,142,143,145,146,148,150,151,153,155,157,159,161,163,165,168,170,172,175,177,180,182,185,188,190,193,196,198,201,204,207,210,213,216,219,222,225,228,231,234,237,240,243,247,250,253
        * = $7695

; 163/d as a byte, d in 1/16 cells. 163 is the constant that makes the final shift exactly
; 2^15. Saturates at d = 0.639 cells, where the correction is under-applied and that boundary
; falls back to bisection -- harmless, because a missed prediction can only cost probes.
rcpDT:  !byte 255,255,255,255,255,255,255,255,255,255,255,237,217,201,186,174,163,153,145,137,130,124,119,113,109,104,100,97,93,90,87,84,82,79,77,75,72,70,69,67,65,64,62,61,59,58,57,55,54,53,52,51,50,49,48,47,47,46,45,44,43,43,42,41,41,40,40,39,38,38,37,37,36,36,35,35,34,34,33,33,33,32,32,31,31,31,30,30,30,29,29,29,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,24,24,24,24,23,23,23,23,23,22,22,22,22,22,22,21,21,21,21,21,21,20,20,20,20,20,20,19,19,19,19,19,19,19,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10
; The corner-partner tables used to sit at RELOC+$2800, which IS $ae00 -- the page bfsD0 claims
; immediately below. Nothing noticed because they are only emitted when CVXSEAM=0, and that
; config had not been built in a long time; when it was, it died with "* = $ae00 moves backward
; from $ae2a". They live in the stream now, with the other displaced lookups.

        * = $5d83               ; ---- the arc's pixel solver, and the fall's tail ----
; The page the pivot's three scratch tables vacated for VIC bank 3 (see PVBASE), and the only
; free run left in a four-level image big enough to hold fallTail in ONE piece -- the next
; largest is 36 bytes.
;
; arcPx is out here for the room, not for tidiness. FALLTAIL's dispersed edits -- cmp hCap at
; nine sites, fwSrcA's redirect for source rows past 24, fdNoF's bound on arcHi -- cost 72 bytes
; of a main block that has 3. arcPx is a jsr target only and runs once per arc COLUMN during a
; fall, which is a cold path, so the move costs nothing. (A hand-layout placement, like the others
; of its day; compaction places it now.)
; ---- arcPx: the boundary's pixel row at cell edge Y ----
; px = crown + (|E| * arcD[edge] >> 8), signed by arcNg. mul8 keeps Y, which is what lets the
; caller walk the 41 edges with the index in Y throughout.
arcPx:  lda arcD,y
        sta mq
        lda arcA
        jsr mul8
        lda arcNg
        bne apxN
        clc
        lda arcY
        adc phi
        bcs apxLo               ; past the foot of the screen
        cmp #200
        bcc apxD
apxLo:  lda #199
        rts
apxN:   lda arcY
        sec
        sbc phi
        bcs apxD
        lda #$00                ; past the top
apxD:   rts

; px -> rampThi nibble. rampThi holds BLANK-above/SOLID-below glyphs with the level counted in
; pixels UP FROM THE CELL FLOOR. The landing needs the opposite polarity and gets it from charset
; B, which mirrors the glyph vertically -- so there the level is measured from the cell TOP
; instead, and the same table serves both.
arcLvl: sta apT
        lda arcInv
        bne alvB
        lda apBase              ; drop:    level = 8 + 8*row - px
        clc
        adc #$08
        sec
        sbc apT
        jmp arcClp
alvB:   lda apT                 ; landing: level = px - 8*row, and B flips it on the way out
        sec
        sbc apBase
        jmp arcClp

; level -> rampThi nibble: clamp to CLO..CHI and bias by -CLO. A level arrives as a signed byte
; and both ends really do occur -- the arc leaves the cell at the steep columns.
arcClp: clc
        adc #$03
        bmi aclZ
        cmp #$10
        bcc aclD
        lda #$0f
        rts
aclZ:   lda #$00
aclD:   rts

; ---- fallTail: the five source rows BELOW the screen ----
; The snapshot is 25 rows, so a wall whose base is off the bottom ends in a flat cut that rises
; with the room. These are the rows that should be under it.
;
; It does not re-implement anything. renderSym computes 13 cell rows and MIRRORS them, so screen
; row 25 IS cell row -1 -- and rfEdgeL already takes a cell row in erow and a column in colc and
; picks the right ramp or step glyph for it. Five more kTab entries give it the K for rows -1..-5,
; five more chain entries give rfStore somewhere to put the answer, and it walks the columns.
; The step path, VSPLIT and calcM all come along for free because it IS the chooser.
;
; No height cap here, unlike the on-screen path: that cap exists because K is +4 at the horizon,
; where an uncapped h would wrap the index. Up here K is -100 to -132, so h - 100 is what the
; tables want, and they already handle both ends -- clampT saturates at 15 (solid) going up and
; is 0 (blank) through the wrapped negatives.
;
; bufOff 15 + erow 13..17 lands on chain entries 28..32, clear of buffer A's 0..13 and B's 14..27.
; rsv 18 keeps rfEdgeT looping, and edT4 returns instead of chaining, which ends the column.
fallTail:
        lda #200                ; tail rows: K is -100..-148, so 200 is already fully solid -- the
        sta hcp0+1
        sta hcp1+1
        sta hcp2+1
        sta hcp3+1
        sta hcp4+1
        sta hcp5+1
        sta hcp6+1
                                ;   cap only keeps h' + kTab (<= 200 + 48) inside a byte
        lda #$ff                ; ...and no VSPLIT stack: vsOn names a column, and renderSym's
        sta vsOn                ;   last one could match a tail column
        lda #15                 ; erow 13..17 + 15 -> chain entries 28..32
        sta bufOff
        ldx #39
ftCol:  stx colc
        lda col4T,x
        tax                     ; X = 4*col: the cell's four ray columns
        lda colH,x              ; min and max over the cell, from its two ENDPOINTS: the
        sta ftMin               ;   interpolator keeps a span linear between them, so the two
        sta ftMax               ;   inner columns cannot lie outside the pair
        lda colH+3,x
        cmp ftMax
        bcc ftLo
        sta ftMax
        bcs ftHi                ; always
ftLo:   sta ftMin
ftHi:   ldy #$00
ftRow:  sty ftR                 ; ---- blank, solid, or an edge? ----
        tya                     ; rfEdgeL is ONLY valid for a cell holding the boundary. On
        clc                     ;   screen rbv/rsv keep blank and solid cells away from it;
        adc #13                 ;   up here nothing does, so this is that test.
        sta erow
        lda ftMax
        cmp ftTbT,y
        bcc ftBlank             ; the whole cell is above the wall: floor
        lda ftMin
        cmp ftT1T,y
        bcs ftSolid             ; the whole cell is inside it
        jsr rfEdgeL             ; an edge: the real chooser, ramps, steps and all
        jmp ftNext
ftBlank:lda #$00
        jsr rfStore
        jmp ftNext
ftSolid:lda #$01
        jsr rfStore
ftNext: ldy ftR
        iny
        cpy #$07
        bcc ftRow
        ldx colc
        dex
        bpl ftCol
        lda #101                ; and back, before anything renders the screen again
        sta hcp0+1
        sta hcp1+1
        sta hcp2+1
        sta hcp3+1
        sta hcp4+1
        sta hcp5+1
        sta hcp6+1
        lda #$00                ; ...and bufOff, which rfStore turns into a chain index. Left at
        sta bufOff              ;   15 it points the NEXT store at entries 28..34 -- the tail's
                                ;   own stubs, which write into fallTailB. The background render
                                ;   of the destination room runs DURING the drop, so this is not
                                ;   hypothetical.
        rts
        ; ---- the tail's data and store stubs ----
; hCap (now the IMMEDIATE operand of every capCmp site): the height cap the cell chooser applies. 101 for the screen,
                                ;   where K is +4 at the horizon and an uncapped h would wrap the
                                ;   index; $ff for the tail rows, where K is -100 to -132 and the
                                ;   cap is the whole problem -- it flattens every wall with h>100
                                ;   to exactly 100, so all the edge cells pick the SAME glyph and
                                ;   the boundary comes out as a staircase of whole cells.
ftMin:  !byte 0
ftMax:  !byte 0
ftR:    !byte 0
ftT1T:  !byte 108,116,124,132,140,148,156
ftTbT:  !byte 101,109,117,125,133,141,149
edT0:	sta fallTailB,x
	rts
edT1:	sta fallTailB+40,x
	rts
edT2:	sta fallTailB+80,x
	rts
edT3:	sta fallTailB+120,x
	rts
edT4:	sta fallTailB+160,x
	rts
edT5:	sta fallTailB+200,x
	rts
edT6:	sta fallTailB+240,x
	rts

        * = $b200
bfsD0:  !fill 256, 255            ; A FULL PAGE: the clear loop runs until X wraps      ; the angel's other distance map -- see bfsD1 at $5e00
        * = $b300
; The ninth index bit costs a second copy of every code table plus the thresholds that derive
; it. Each is page-aligned so "lda table,y" stays 4 cycles -- a page crossing here would tax the
; hottest lookup in the renderer. The single-copy rampT/stepT are not emitted at all under
; PLAN=3, which pays back four of these twelve pages.
rampTlo: !byte 0,0,0,0,20,159,144,113,58,58,32,147,147,147,147,167,0,0,0,0,20,159,141,58
        !byte 58,43,142,166,166,166,166,156,0,0,0,0,20,3,141,99,43,43,142,166,166,166,149,156
        !byte 0,0,0,0,20,3,122,43,43,142,166,191,191,191,149,149,54,54,54,115,19,60,4,190
        !byte 62,62,44,197,197,149,149,160,180,180,169,105,51,45,94,186,125,8,84,84,84,84,160,160
        !byte 64,64,146,71,112,118,16,82,89,55,84,148,148,148,148,77,9,194,194,38,87,30,104,31
        !byte 6,163,35,148,148,77,77,77,177,75,38,38,87,40,120,41,23,68,92,176,176,77,15,15
        !byte 75,75,38,57,57,80,93,59,97,5,5,50,15,15,15,157,75,42,57,133,133,79,128,107
        !byte 28,85,2,91,91,21,21,21,185,143,143,143,143,79,17,53,181,18,10,1,1,1,1,1
        !byte 185,143,143,143,143,79,17,53,181,63,10,1,1,1,1,1,185,143,143,143,173,17,17,182
        !byte 158,63,27,1,1,1,1,1,185,143,143,173,173,168,17,182,161,63,27,1,1,1,1,1
        !byte 24,173,173,173,168,168,182,182,161,70,27,1,1,1,1,1
        * = $b400
rampThi: !byte 0,0,0,0,20,3,141,196,58,154,147,156,166,167,167,156,0,0,0,0,20,3,98,58
        !byte 154,142,142,156,166,166,149,101,0,0,0,0,49,3,122,43,43,142,166,156,191,191,149,101
        !byte 0,0,0,0,49,187,122,65,43,142,44,101,191,149,149,101,54,54,115,90,19,95,4,190
        !byte 62,8,44,160,197,149,160,101,169,169,169,124,184,45,67,82,125,8,84,160,148,160,160,103
        !byte 64,146,71,71,110,16,16,13,117,55,35,148,148,148,77,103,194,194,38,38,87,81,29,31
        !byte 76,35,35,77,77,77,77,103,75,179,38,57,172,40,119,121,23,174,86,106,15,15,15,106
        !byte 75,57,57,57,80,111,93,69,183,5,86,15,15,157,157,157,42,42,133,133,133,79,107,107
        !byte 126,52,2,21,21,21,21,21,24,173,173,173,168,168,17,182,161,63,27,1,1,1,1,1
        !byte 42,143,143,143,79,17,17,182,161,63,27,1,1,1,1,1,42,143,143,173,173,168,17,182
        !byte 161,70,27,1,1,1,1,1,143,143,143,173,173,168,182,161,161,70,27,1,1,1,1,1
        !byte 173,173,37,37,37,135,135,198,108,70,27,1,1,1,1,1
        * = $b500
stepT1lo: !byte 109,20,3,141,196,58,58,32,32,26,114,150,65,65,162,56,56,149,61,123,123,123,123,14
        !byte 192,192,14,54,19,19,4,99,62,134,134,138,26,36,95,67,186,62,56,44,197,61,123,123
        !byte 123,123,14,192,192,14,180,19,45,165,113,62,140,116,188,48,110,45,67,186,125,8,8,84
        !byte 61,168,168,182,182,103,84,84,103,64,178,25,25,16,113,140,140,140,136,110,118,16,16,89
        !byte 55,55,148,61,168,168,182,182,103,174,103,103,9,9,178,25,99,154,134,140,140,38,87,30
        !byte 104,31,74,163,35,33,61,168,168,182,182,161,174,2,77,177,178,177,104,99,154,134,102,140
        !byte 179,172,40,120,41,6,23,35,176,61,168,168,182,182,161,174,2,15,131,131,131,39,131,154
        !byte 134,102,140,145,57,80,120,78,66,5,5,72,193,79,79,80,69,126,5,2,15,12,12,39
        !byte 12,12,130,130,46,140,42,133,171,130,46,66,85,85,102,24,96,79,128,53,126,52,2,91
        !byte 12,12,151,39,151,39,12,12,140,185,185,39,130,130,46,129,137,129,24,173,168,17,182,181
        !byte 63,139,139
        * = $b600
stepT1hi: !byte 90,49,150,122,65,43,142,142,22,26,114,150,114,114,123,192,192,101,61,123,123,123,123,14
        !byte 192,14,14,115,19,60,4,190,62,62,44,83,26,36,67,67,114,123,192,192,160,61,123,123
        !byte 123,123,14,192,14,14,124,51,45,94,94,62,8,116,34,124,110,67,67,13,76,84,84,160
        !byte 61,168,168,182,182,103,84,103,103,71,112,25,16,16,89,8,73,34,36,110,16,16,82,76
        !byte 174,35,148,61,168,168,182,182,103,103,103,103,194,178,25,104,99,154,134,140,33,38,87,81
        !byte 29,31,6,174,35,77,61,168,168,182,182,161,164,103,103,75,87,25,104,99,154,134,102,33
        !byte 57,172,40,119,121,23,68,92,77,61,168,168,182,182,161,164,106,106,75,151,39,104,131,154
        !byte 134,102,33,57,80,111,93,69,97,5,86,170,61,79,195,17,69,126,164,157,157,75,151,39
        !byte 130,46,130,130,46,33,133,79,79,128,107,28,85,2,91,133,79,17,17,126,126,164,2,21
        !byte 12,151,39,130,46,129,137,139,33,143,79,79,46,46,129,137,139,91,7,7,135,135,198,161
        !byte 70,27,91
        * = $b700
stepT2lo: !byte 109,20,3,144,196,58,58,32,32,109,19,150,65,114,162,56,149,156,109,19,150,114,114,123
        !byte 192,192,14,54,20,60,4,99,43,134,134,138,48,19,95,67,186,62,56,44,197,24,19,95
        !byte 67,114,123,192,192,14,169,51,19,165,165,62,134,188,116,48,110,45,67,186,125,84,8,34
        !byte 24,51,45,67,13,76,84,84,103,64,178,25,25,25,89,89,132,47,136,110,118,16,16,89
        !byte 89,132,47,24,96,118,16,13,76,103,103,103,9,178,25,25,31,6,73,73,22,38,87,30
        !byte 104,104,74,6,35,102,24,96,81,29,11,76,164,2,77,177,178,25,25,31,6,68,73,22
        !byte 179,172,40,120,41,74,68,35,152,24,96,100,100,11,23,174,2,15,131,151,39,39,78,66
        !byte 5,86,22,145,57,80,120,78,66,66,86,170,193,96,195,17,69,126,5,2,15,12,151,39
        !byte 39,46,66,85,2,22,42,171,171,130,78,66,85,85,72,24,96,79,128,53,126,52,2,91
        !byte 12,151,39,130,46,129,137,139,22,185,185,171,130,46,129,137,137,33,24,96,100,100,11,158
        !byte 175,10,10
        * = $b800
stepT2hi: !byte 90,49,187,98,98,189,189,73,22,109,19,150,114,114,123,56,192,101,109,19,150,114,114,123
        !byte 192,192,14,115,19,95,4,190,62,189,83,83,48,19,67,67,114,123,192,84,101,24,19,95
        !byte 67,114,123,192,14,14,48,184,45,94,94,62,8,116,34,26,36,67,67,13,6,84,84,160
        !byte 24,51,45,67,13,76,84,103,103,146,112,25,16,82,89,8,116,34,36,110,16,16,13,117
        !byte 55,148,33,24,96,118,16,13,76,103,103,103,194,87,25,104,31,6,73,73,22,127,81,81
        !byte 29,31,76,163,35,33,24,96,81,29,11,76,164,77,103,75,87,25,104,31,6,68,73,22
        !byte 179,61,40,119,121,23,174,92,155,24,96,100,100,11,23,164,106,106,75,75,39,104,78,66
        !byte 5,86,22,193,193,195,93,69,183,5,86,170,88,195,195,17,69,126,164,15,157,75,151,39
        !byte 39,46,66,85,2,22,42,42,171,128,107,28,85,2,91,173,79,79,17,126,126,164,2,21
        !byte 12,151,39,130,46,129,137,139,22,143,143,143,128,53,129,137,139,33,7,7,135,135,198,108
        !byte 70,27,139
        * = $b900
stepT3lo: !byte 49,20,159,144,113,113,32,32,32,26,150,98,98,43,154,189,147,147,114,114,114,114,114,56
        !byte 56,73,156,54,19,19,141,99,99,140,140,140,36,36,95,4,190,62,62,44,197,61,123,123
        !byte 123,123,123,160,84,160,169,19,45,165,99,165,188,138,138,26,184,45,94,186,125,8,132,188
        !byte 61,160,160,160,160,160,160,84,160,64,178,25,25,25,25,132,132,188,36,36,16,16,16,89
        !byte 132,132,47,88,88,195,77,77,77,148,148,148,194,38,30,104,104,194,132,132,47,36,81,30
        !byte 104,29,74,74,102,102,88,88,195,77,77,77,35,35,77,177,87,30,104,104,74,132,132,47
        !byte 61,40,40,120,31,23,23,152,102,7,7,135,135,198,15,174,86,176,75,57,171,120,75,75
        !byte 75,132,47,61,111,80,93,78,66,5,5,72,88,88,195,69,69,183,5,86,50,75,171,171
        !byte 171,171,171,171,171,102,133,133,80,128,107,28,85,85,72,37,37,17,17,126,126,164,2,2
        !byte 185,143,171,100,46,46,46,46,46,173,143,79,17,53,181,175,139,139,37,37,37,135,161,161
        !byte 63,10,139
        * = $ba00
stepT3hi: !byte 90,49,187,122,196,58,58,32,32,26,150,187,65,65,162,142,166,191,114,114,114,114,114,56
        !byte 56,149,14,90,19,60,4,99,99,134,138,138,36,36,95,4,62,62,8,44,197,61,123,123
        !byte 123,123,123,160,84,14,26,51,45,165,165,165,188,188,188,36,36,67,67,82,8,8,84,47
        !byte 61,160,160,160,160,160,160,84,103,71,112,118,16,16,89,132,132,47,153,36,16,16,82,117
        !byte 55,35,102,88,88,195,77,77,77,148,148,103,38,87,30,104,104,194,132,132,47,153,153,81
        !byte 29,31,6,163,35,102,88,88,195,77,77,77,174,77,103,38,172,40,120,104,74,132,132,47
        !byte 61,61,111,121,41,23,68,92,152,7,7,135,135,198,15,174,77,106,57,57,171,120,75,75
        !byte 75,132,47,88,88,195,69,59,97,5,5,72,88,88,195,17,69,126,164,2,15,57,133,171
        !byte 171,171,171,171,171,102,88,79,79,107,107,28,52,2,2,7,7,135,135,198,108,164,2,21
        !byte 24,143,100,100,46,46,46,46,46,37,168,168,17,182,158,175,10,139,7,7,135,135,198,108
        !byte 70,27,10
        * = $bb00
rampThrT: !byte 0,0,0,0,0,1,1,1,0,3,3,7,5,5,6,9,0,0,0,0,0,1,2,0,3,5,0,9,0,0,10,12,0,0,0,0,1,0,2,4,0,5,7,10,9,9,0,13,0,0,0,0,1,3,0,5,0,0,8,11,0,10,0,13,0,0,1,2,0,4,0,0,0,7,0,11,0,0,12,14,1,1,0,3,4,0,6,7,0,0,0,12,12,12,0,15,0,2,3,0,5,6,0,8,8,0,11,0,0,0,14,15,1,0,4,0,0,7,7,0,10,11,0,13,13,0,0,16,2,3,0,5,6,0,8,10,0,12,13,14,15,15,0,16,0,5,5,0,7,9,0,11,12,0,13,15,0,16,16,0,3,0,7,0,0,0,11,0,13,13,0,16,16,0,0,0,7,9,10,11,11,12,0,13,14,15,16,0,0,0,0,0,5,0,0,0,10,12,0,13,15,0,16,0,0,0,0,0,5,0,0,10,0,12,0,0,15,16,0,0,0,0,0,0,6,0,0,0,0,0,14,15,0,16,0,0,0,0,0,0,9,0,13,13,14,15,15,16,16,0,0,0,0,0,0,0
        * = $bc00
stepThrT1: !byte 2,1,3,3,3,3,4,4,5,0,0,0,7,7,9,11,11,13,0,0,0,0,0,0,0,15,0,1,0,3,0,5,0,6,6,5,0,0,6,0,8,9,11,11,11,0,0,0,0,0,0,0,15,0,2,3,0,5,1,0,1,0,6,4,0,6,0,7,9,10,10,12,0,0,0,0,0,0,0,15,0,2,3,0,5,0,1,3,3,6,5,0,6,0,7,9,11,11,0,0,0,0,0,0,0,14,0,0,1,1,3,5,0,0,0,0,5,0,0,7,7,0,9,11,0,13,0,0,0,0,0,0,14,15,16,1,3,3,0,0,0,0,0,5,5,0,0,8,9,10,11,12,14,0,0,0,0,0,0,14,15,16,1,1,3,5,0,0,0,0,5,6,7,8,8,10,11,0,13,14,8,0,12,11,0,0,14,15,16,1,1,0,3,4,0,0,0,5,6,9,8,9,10,11,0,13,9,9,11,12,11,13,0,14,0,16,0,1,3,5,3,5,5,5,6,7,8,8,7,7,9,11,13,11,12,14,15,15,15,14,16,15,15
        * = $bd00
stepThrT2: !byte 2,1,2,2,3,4,4,4,5,0,0,0,7,0,9,0,12,13,0,0,0,0,0,0,0,0,0,1,1,3,0,5,5,6,7,7,0,0,6,0,8,9,11,8,12,0,0,0,0,0,0,0,15,0,2,3,3,5,5,0,6,7,9,4,6,6,0,8,9,0,10,12,0,0,0,0,0,0,0,15,0,1,3,0,5,5,0,7,7,8,5,0,6,0,7,8,9,10,10,0,0,0,0,0,0,0,0,0,1,3,0,5,0,0,0,0,0,4,6,6,7,7,9,10,0,11,0,0,0,0,0,0,0,15,16,1,3,0,5,0,0,0,0,0,0,8,0,8,9,9,11,12,12,0,0,0,0,0,0,14,15,16,1,3,0,5,0,0,0,0,0,6,6,9,8,10,11,11,0,0,9,9,0,0,0,0,14,15,16,1,0,0,0,0,0,0,0,0,0,6,0,8,10,11,0,13,14,10,10,0,12,13,0,14,0,16,0,0,0,0,0,0,0,0,0,6,6,8,9,10,0,0,13,0,12,13,13,14,14,15,15,16,14
        * = $be00
stepThrT3: !byte 2,1,2,2,1,1,1,0,0,0,0,4,5,5,5,6,6,7,0,0,0,0,0,0,0,9,14,1,0,3,3,0,0,1,2,1,0,0,0,0,6,0,8,0,0,0,0,0,0,0,0,0,0,15,3,3,0,0,3,0,0,3,3,6,6,6,6,7,8,0,7,6,0,0,0,0,0,0,0,0,15,3,4,5,5,5,5,0,0,5,7,0,0,0,7,8,8,9,7,0,0,0,0,0,0,0,0,14,4,5,0,0,0,0,0,0,0,7,8,7,7,8,9,10,10,0,0,0,0,0,0,0,13,13,15,3,6,6,6,0,0,0,0,0,0,9,9,9,9,0,11,11,9,0,0,0,0,0,0,0,14,14,4,0,0,0,0,0,0,0,0,11,11,10,11,10,11,0,0,0,0,0,0,14,0,14,14,14,15,4,7,0,0,0,0,0,0,0,11,10,10,11,0,0,13,13,13,15,15,15,15,15,15,0,0,15,6,0,8,0,0,0,0,0,0,13,11,12,0,13,14,0,14,0,16,16,16,0,16,16,16,16,15
; [origin folded into the run above by compact.mjs]

; The image used to be padded out to $bfff to buy load-time headroom -- the staged copy of the
; compressed stream was pinned to the image's top, so a taller image lifted it. There is no
; staged copy any more, so the padding bought nothing and cost a kilobyte of disk and load time.

        ; ---- dieChk and dieGo, relocated ----
        ; Another jsr target, out of the main block because the cut scene needs those bytes.
        ; $bc00 is a whole free page and now uncontested: the merge-hazard lists used to claim
        ; the same address and only fitted because level 1 has no hazard cells. They live in
        ; the code stream now (see hzRun), well clear of this page.
        * = $5e98
; ---- dieChk: is the mark still on, and has the player nearly turned far enough? ----
; The mark is SET by angOne when a step lands beside the player -- caused by the ANGEL moving,
; which is what makes walking into one harmless. Here we only LIFT it, and fire.
; Caught in sight, the scene follows half a second on (markSaw). Caught UNSEEN it waits, drawn like
; any angel, for one of three things (dcTurn): it comes into view, you walk into it, or you turn
; DIE_TURN either way. Get more than a cell away first and the mark lifts -- an escape.
dieChk: lda dieSt               ; once it has started, the only thing left to do here is repaint
        beq dckIdl              ;   the sprites. obC is rewritten by orbMove every frame and
        lda dieInk              ;   flushed to $d027+n after us, so this is the last word on it.
        jmp dckPnt              ; the scene owns everything else: nothing live to check
dckIdl:                         ; ---- holding the idol no longer repaints the whole CAST ----
                                ; It used to: "lda idolB / jsr dckPnt", every sprite's body set
                                ; to the idol's colour, from when the tint was brown/yellow and
                                ; the idea was that the cast catches the light off it. With a
                                ; per-level scheme that is just a flood -- carry the red idol
                                ; back and the hub's three pedestals and four holes all turn
                                ; light red, losing the one thing their colour is FOR.
                                ; The two SHARED inks still swap while you hold it (sprPal), and
                                ; the idol's own body is per sprite and set where it is drawn.
                                ; dckPnt survives for the death scene, which does want all eight.
dckLive:                        ; (the player's own turn rate was captured here for the sweep to
                                ;   continue -- see DIE_ARR for why it no longer is)
        lda marked
        beq dcNo
        tax
        dex
        stx amIdx
        sec
        lda orbXCT,x
        sbc px+1
        sta oix
        clc
        adc #$01
        cmp #$03
        bcs dcClr               ; more than a cell away in x: the mark lifts
        ldx amIdx
        sec
        lda orbYCT,x
        sbc py+1
        sta oiy
        clc
        adc #$01
        cmp #$03
        bcs dcClr
        lda markSaw             ; ---- caught you while you were WATCHING it ----
        beq dcTurn              ; There is no "look away and back" left to wait for, so the turn
        sec                     ;   trigger below is not the rule. Instead: half a second in which
        sbc dtv                 ;   NOTHING changes, then the scene, with the angel still on
        bcs dcHold              ;   screen to rotate onto. Drained by dtv, so the half second is
        lda #$00                ;   half a second whatever the frame rate is doing.
dcHold: sta markSaw
        bne dcNo                ; still owed: nothing happens yet
        beq dcGo                ; just hit zero: go
dcTurn:
        ; ---- caught unseen: THREE triggers (2026-11-02) ----
        lda orbSeenT,x          ; 1. it has come into VIEW -- any of it, by a turn, a step or a
        beq dcBmp               ;   strafe: from here it is the watched case, the half second
        lda #$1e              ;   with it standing there, then the scene
        sta markSaw
        bne dcNo                ; always
dcBmp:  lda mvBmp               ; 2. you walked into it (mvEnt): the scene turns you to face it
        bne dcGo
        sec                     ; 3. THE TURN: did they turn far enough since it cornered them?
        lda pa                  ;   For an angel still off screen -- on your flank it can need
        sbc markPa              ;   most of a revolution to come into view. 20 degrees either way.
        bpl dcPos
        eor #$ff
        clc
        adc #$01
dcPos:  cmp #$0e
        bcc dcNo
dcGo:                           ; also the entry DIENOW uses, so the test path is the real one
dieGo:  jsr dsGo                ; MUSIC: the song drops out, the glide begins
        jsr idolDie             ; ---- THE IDOL ON A DEATH: see idolDie ----
        ; ---- aim, and unhide it ----
        ; A marked angel is HIDDEN -- that is how contact works -- so the scene is where it comes
        ; back. dieAim works out its exact bearing; dieFade turns onto it over dieArr ticks.
        lda #$01                ; ---- ONE FRAME OF WHITE, ceiling and floor together ----
        jsr setGnd              ; setGnd writes colW AND colF, so both halves flash on the SAME
                                ;   frame -- they used to change on different ones. The ramp
                                ;   below takes it down from here, so the white lasts exactly the
                                ;   frame the angel reaches you, and the sprites lose the idol's
                                ;   fire on the same frame (sprPal stands down once dieSt is set).
        lda #$ff                ; unsigned "never projected", far outside the lock window
        sta dieOff
        lda #$00
        sta dieRem              ; no turn unless an angel marked us (DIENOW may fire without one)
        sta dieLk
        lda #$b4     ; ...and the glide then takes the longest
        sta dieArr
        lda #48
        sta dieQ
        lda marked
        beq dpDn
        ldx amIdx
        stx dieIdx              ; the one entity dieOff is allowed to come from
        jsr dieAim              ; the exact bearing, and the turn begins
dpDn:   jsr dsPlan              ; the glide, over the turn's own time
        lda #$00
        sta marked
        lda nOrbT               ; the angel simply is not there any more -- hiding it is one
        beq dgAD                ;   store, and orbMove then never gives it a slot.
        ldx nOrbM1T
dgA:    lda orbTallT,x          ;   store, and orbMove then never gives it a slot.
        bne dgA2                ; TALL: that is the angel, and it is the one thing that stays
        lda #$01
        sta orbHidT,x           ; everything else is cut outright -- see above, $d025/$d026 are
                                ;   shared, so an orb cannot dim while the angel stays lit
dgA2:   dex
        bpl dgA
dgAD:   lda #$0c  ; the orb, by contrast, fades out with everything else
        sta dieInk
        jsr dckPnt              ; ...and EVERY sprite takes it right now. While dying the main
                                ;   loop runs dieFade and never dieChk, so nothing repainted obC
                                ;   at all: it kept whatever the last live frame left, which with
                                ;   the idol in hand is orange. It held that for the whole fade.
        lda #$01
        sta dieSt
        lda frameCnt
        sta dieT0
        lda #$ff
        sta dieTck              ; no tick written yet
        rts
dcClr:  lda #$00                ; out of reach again: the sentence lifts.
        sta marked              ;   (It was never hidden, so nothing has to come back.)
dcNo:   rts


        ; ---- the rest of the relocated region ----
        ; Continues straight on from dieChk/dieGo above: $bc00-$bdff is 512 free bytes and the
        ; group needs about 480, so ONE origin serves the lot. Stating a second one at $bd00 only
        ; worked while the first block was small enough to leave room for it.

; ---- picPut: the current picture into BOTH screen buffers ----
; Both, because the buffers still flip every frame during the scene -- writing only the one being
; drawn is exactly the "slides over and stutters back and forth" the old version was reported as.
; Four whole pages rather than 1,000 bytes: the 24-byte overrun lands in the unused tail of the
; screen and the source overruns into free space, so the loop costs nothing to keep simple.
picPut: lda #$80     ; the picture's map, in bank 3 as IPIC
        sta ppRd+1
        lda #$ef
        sta ppRd+2
        lda #$00
        sta ppWA+1
        sta ppWB+1
        lda #$e0
        sta ppWA+2
        lda #$e4
        sta ppWB+2
        ldx #$04
ppPg:   ldy #$00
ppRd:   lda $ffff,y
ppWA:   sta $ffff,y
ppWB:   sta $ffff,y
        iny
        bne ppRd
        inc ppRd+2
        inc ppWA+2
        inc ppWB+2
        dex
        bne ppPg
        rts

; ---- picOn: the cut itself ----
; One write per palette register, on a frame that is already black. No ramp and no slide: between
; one frame and the next the picture is simply there.
picOn:  jsr dsBoom              ; the cut lands on a boom
        lda #$0c
        jsr setGnd
        lda #$0b
        sta $d022
        lda #$0f
        sta $d023
        rts

        * = $adb6               ; @FLOAT (see compact.mjs): placed in the code stream, beside readKeys,
                                ;   this routine moved four pinned hot loops across page lines and
                                ;   cost 402 bytes of padding; as a self-contained run it drops into
                                ;   a pre-alignment gap instead. (The address is a placeholder.)
; ---- lvKey: the secret level select (LVSKIP) -- hold 'L', press a digit, drop to that level ----
; Like the old 'L' skip it does NOT change level itself: it points exit 0 at the chosen level and
; stands the player on that exit, so fallChk runs the REAL transition (the drop, wallsBack, the
; loads, objInit) and not a second copy that could drift from it. lvlNxtT arrives with every level
; file, so the next load (which this fall is) puts the real wiring back. Every level has an exit
; to stand on: asserted beside nExitT. Every digit's level has a file: checked after the disk is
; built ("EVERY SHIPPING LEVEL IS ON THE DISK"), since a missing ILV file would hang the load.
; 'L' and every digit sit on joystick-1 lines (bits 0, 2, 3), so the combo counts only with the
; stick idle both BEFORE the keys (joyEor, readKeys' sample this frame) and AFTER them (see
; joystick-key-race: one sample let a LEFT landing between the reads fire the old 'L').
; The level you are ON is allowed -- the full drop and reload restarts it (the user, 2026-11-13) --
; so one drop per press needs a latch: lkArm is set while 'L' is up and spent by a drop, or a combo
; still held after landing would drop again and again. (Uninitialised is fine: garbage arms it, 0
; just waits for the first frame without 'L'.)
; From readKeys, A = the column-5 read with the stick masked. Keeps rowv; leaves $dc00 neutral.
lvKey:  and #$04                ; 'L'
        beq lkDown
        sta lkArm               ; up: armed (A = 4)
        bne lkOut               ; always
lkDown: lda lkArm
        beq lkOut               ; still the press that dropped us: wait for 'L' to come up
        ldx #9
lkDg:   lda lkColT,x
        sta $dc00
        lda $dc01
        and lkBitT,x
        beq lkSeen
        dex
        bpl lkDg
lkOut:  lda #$ff
        sta $dc00               ; leave the port neutral for the next joystick read
        rts
lkSeen: jsr lkOut               ; the port neutral...
        lda $dc01               ; ...and the stick again, after the keys
        eor #$ff
        ora joyEor
        and #$1f
        bne lkOut               ; a stick line was down at either sample: no key is believed
        sta lkArm               ; A = 0: this press is spent
        inx                     ; the level: its digit's index + 1 (1..10)
lkGo:   stx lvlNxtT             ; exit 0 now leads there... (lkGo: TESTRIG's maStep enters here too)
        ldy nOrbT               ; ...and we stand on it (exit 0's entity index, as fallChk counts)
        lda orbXCT,y
        sta px+1
        lda orbYCT,y
        sta py+1
        rts
        * = $ada2               ; lvKey's tables: a data run of their own, for the same gap-filling
lkColT: !byte $7f,$7f,$fd,$fd,$fb,$fb,$f7,$f7,$ef,$ef   ; lvKey: each level's digit, its keyboard column...
lkBitT: !byte $01,$08,$01,$08,$01,$08,$01,$08,$01,$08   ; ...and its row bit

        ; 256 bytes, so it goes above the image with the rest rather than into the per-variant
        ; block, which it overflows. It is gated on ANGMID and nothing else -- it was once written
        ; inside the six-sprite angel's table block, and gating a table on one flag while its use
        ; site is gated on another broke the DEFAULT build outright.
        * = $7595
angMidT: !byte 3,3,2,2,1,1,0,0,0,1,0,0,255,1,0,0,255,0,0,0,1,0,0,255,0,0,0,1,0,0,255,0,0,0,1,0,0,255,1,0,0,255,0,0,0,1,0,0,255,0,0,0,255,255,1,1,0,0,0,255,255,1,1,1,0,0,255,255,1,1,1,0,0,255,255,2,1,1,0,0,255,255,255,1,1,0,0,255,255,255,1,1,0,0,0,255,255,1,1,0,0,0,255,255,254,254,253,253,253,252,252,251,251,251,250,250,249,249,248,248,248,247,247,246,246,246,245,245,244,244,243,243,243,242,242,241,241,240,240,240,239,239,238,238,238,237,237,236,236,235,235,235,234,234,233,233,232,232,232,231,231,230,230,230,229,229,228,228,227,227,227,226,226,225,225,225,224,224,223,223,222,222,222,221,221,220,220,219,219,219,218,218,217,217,217,216,216,215,215,214,214,214,213,213,212,212,211,211,211,210,210,209,209,209,208,208,207,207,206,206,206,205,205,204,204,204,203,203,202,202,201,201,201,200,200,199,199,198,198,198,197,197,196,196,196,195,195,194,194,193,193,193,192,192,191,191
        * = $bf00
qcosT: !byte 255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,254,254,254,254,254,253,253,253,253,252,252,252,252,251,251,251,250,250,250,249,249,249,248,248,248,247,247,246,246,245,245,245,244,244,243,243,242,242,241,241,240,239,239,238,238,237,237,236,235,235,234,233,233,232,231,231,230,229,229,228,227,227,226,225,224,224,223,222,221,220,220,219,218,217,216,215,215,214,213,212,211,210,209,208,207,207,206,205,204,203,202,201,200,199,198,197,196,195,194,193,192,191,190,189,188,186,185,184,183,182,181,180,179,178,177,175,174,173,172,171,170,168,167,166,165,164,162,161,160,159,157,156,155,154,152,151,150,149,147,146,145,144,142,141,140,138,137,136,134,133,132,130,129,128,126,125,123,122,121,119,118,117,115,114,112,111,109,108,107,105,104,102,101,99,98,97,95,94,92,91,89,88,86,85,83,82,80,79,77,76,74,73,71,70,68,67,65,64,62,61,59,58,56,55,53,51,50,48,47,45,44,42,41,39,38,36,34,33,31,30,28,27,25,24,22,20,19,17,16,14,13,11,9,8,6,5,3,2


; ---- tables that live inside other tables (embedIn) ----
rowLoT = mul40LoT+0               ; 25 bytes, already there: see embedIn
rowHiT = mul40HiT+0               ; 25 bytes, already there: see embedIn
qIdxAT = ecM8+145               ; 16 bytes, already there: see embedIn
qIdxBT = qIdxAT+0               ; 16 bytes, already there: see embedIn
