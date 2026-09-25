
charset = $c000        ; where the VIC reads them: under the I/O hole
charsetB = $c800
px      = $02
py      = $04
pa      = $06
; $07 is free: it was rang, the coarse byte ray angle, dead since castRay's step
; signs moved to the fine angle.
sdx     = $0a
sdy     = $0b
ddx     = $0c
ddy     = $0d
stpX    = $0e
stpY    = $0f
side    = $10
pp      = $11
fr      = $12
qlo     = $15
qhi     = $16
col     = $17
tmp     = $1f
baseHi  = $22
paF     = $805b                  ; low byte of the 16-bit player angle; pa is the high
smCnt   = $805e                  ; SLOWMO: frames left before the auto-mover steps again
hazCur  = $805f                  ; the cell whose run-table patches are currently applied
                                 ; $8060-$8073 are free: they held the sprite GRID walk and its
                                 ; debug capture, both gone with the six-sprite angel
oqa     = $8074                  ; 9-bit angle being folded onto the quarter circle
opaqL   = $8076                  ; the paq the cached frame trig was taken at
opaqH   = $8077
acRow   = $8078                  ; ANGCHAR: the silhouette stamp's cell walk -- row, running
acIx    = $8079                  ;   index into the cell map, and which charset half the row
acB     = $807a                  ;   falls in (0 = A above the horizon, 1 = B below it)
dtv     = $8050
dtm     = $8059                  ; elapsed ticks scaled for movement, and for turning
dtt     = $805a
rxF     = $805c                  ; the sub-quantum remainder of each axis' step, carried to the
ryF     = $805d                  ;   next frame instead of being truncated away (see moveApply)
lastMv  = $8051
dxs     = $8052
dxsH    = $8053
dys     = $8054
dysH    = $8055
dxSgn   = $8056
dySgn   = $8057
rowv    = $8058                  ; keyboard row 1, held so SHIFT/E/S read it once
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
lastFrame = $4c
renderCnt = $4e
fpsTens = $4f
fpsOnes = $50
deltaL  = $51
deltaH  = $52
fpsv    = $53
dpx     = $54                   ; fps scratch (was the pixel plotter's x/y)
dpy     = $55
ppHi    = $56
ppLo    = $57
tmp2    = $58
vsOn    = $70e8                 ; VSPLIT: this column is a step column with a stack in progress
vsRow   = $70e9                 ;   the row the FAR wall's top lands in (rbT of the far height)
vsCode  = $70ea                 ;   the pure-split glyph for this column's kpos and side
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
ppPtr   = $71                   ; 2 bytes ($71/$72): readout row pointer
kr      = $73                   ; per-row 8*cr-92: turns a height into a cell fill
d018vm  = $74                   ; live video-matrix nibble; the raster IRQ ORs charset bits
ecode   = $1b
                                ;   stub's address is looked up
colc    = $75                   ; cell column, parked while the chains own X
rbv     = $76                   ; first cell row that is not fully ceiling
rsv     = $77                   ; first cell row that is fully wall
erow    = $78                   ; current row inside the edge run
jv      = $79                   ; 2 bytes: chain entry vector, then the edge store pointer
ep2     = $7b                   ; 2 bytes: mirrored-row store pointer
bufOff  = $7d                   ; 0 or 14: selects the chain set for the buffer being drawn
nbnd    = $14                   ; delimiters the search pinned this frame
bcur    = $18                   ; subIns/subEmt: the delimiter being sorted, and its swap
bswp    = $19
bcnt    = $08
cell0   = $13                  ; the player's own cell index, constant for the frame
cell    = $7e                   ; DDA cell index = mapY*16 + mapX, stepped incrementally
stpY16  = $7f                   ; +16 / -16: one Y step in cell-index units
hp      = $80                   ; 2 bytes: pointer into this column's height table
errH    = $86                   ; high byte of the interpolator's error term
uwL     = $20                   ; seam pass scratch: u low byte, then the projective solve
uwH     = $21
sdK     = $92                   ; the seam code's offset from SEAM0, decoded once
sdH     = $91                   ; the wall's height AT the seam's own column
sdCol   = $8f                   ; seamDrw: the seam's own pixel column, the window minimum
sdMin   = $9e                   ;   around it, and the row the SEAM (not the wall) starts on
sdSRow  = $9f
cuQL    = $8d                   ; calcU's fine angle: its low byte, which quarter it lands in,
cuQF    = $8e                   ;   and a scratch for the three-quarter case. Shares the seam
cuQT    = $8f                   ;   scratch below -- calcU runs at span setup, before the walk.
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
ssCut   = $9150                 ; the column where the wall crosses the height a line needs,
ssCutD  = $9151                 ;   and which side of it is too short ($00 = to the right)
ssHL    = $9152                 ; the two end heights, while that is being worked out
ssHR    = $9153
ssPU    = $9154                 ; SEAMPW: the player's position on THIS face's running axis, the
ssPUL   = $9155                 ;   two bytes of it, worked out once per span
ssKLo   = $9156                 ;   ...and the FIRST and LAST cell boundary worth a line, so the
ssKHi   = $9157                 ;   per-boundary test is two compares (see ssPwS)
shD     = $9158                 ;   dp while it is being formed, then dp in quarter cells
smLo    = $915a                 ;   s_max scaled to 8.8 while the range is formed
smHi    = $915b
ssDir   = $915c                 ; which way the boundary walk steps: 0 = up, 1 = down
; ---- SEAMHYST: last frame's panel columns, and this frame's being collected ----
; Two arrays and not one: a line placed earlier in THIS frame must not become a band centre for a
; later one. Only panel lines go in. Corner marks are pinned to a cast column and were already
; steady, and the four-column rule keeps a panel far enough from one that it could never match.
; No seam identity is needed or wanted here -- run ids renumber every frame -- so the match is
; pure proximity, which is exactly what the band means.
; At fixed addresses in this gap rather than in the free-run stream: that stream runs up to
; HAZ_BASE and TOURW's waypoint script sits in its tail, so 26 bytes there is 26 the tour cannot
; have. The gap below holeSeeT at $9180 was doing nothing.
sHyP    = $915d                 ; 12 columns
sHyC    = $9169                 ; 12 columns
sHyPN   = $9175
sHyN    = $9176
ssAng   = $9d
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
stackLT = $0400
stackRT = $0480
; per-logical-column arrays, now 160 entries each (was 80). Page-aligned so a column
; index never needs a 16-bit add.
sideT   = $0500
idT     = $0600
colH    = $0700
; ---- the per-frame arrays: ALL of them live in the reclaimed charset source, $3000-$37ff ----
; Two evictions got them here, both for the same reason -- an array in the code's growth room is
; an array that caps the engine:
;
;   1. Six of these sat at $2400-$27ff, the image's filler between the data segment and the
;      charset source, i.e. the only space the CODE has to grow into. That made the build's
;      headroom report a LIE: it printed $2800 - dataEnd = 1,762 bytes, but the code would have
;      hit faceIdT at $2400 after 738.
;   2. Then the charset source itself moved from $2800 up to $3000, closing a dead 2KB hole and
;      taking the code's ceiling with it -- so the arrays followed it up here, out of the way.
;
; Everything is page-aligned where a full byte indexes it. Packing tighter than this would buy
; nothing: $3000-$37ff is not the scarce resource, the ceiling below it is.
cwA     = $8400                 ; per cell-column: the ceiling run length this buffer holds
cwB     = $8428
cbA     = $8450                 ; ... and the solid run start, or $ff for "always redraw"
cbB     = $8478
faceIdT = $8200                 ; page-aligned: a column index must never need a 16-bit add
cstepT  = $84a0                 ; per cell-column (40): face-boundary column, 0 = none
bidx    = $80f0                ; PLAN=2: the bucket index the code came from, and which
thsel   = $80f1                 ; threshold table to read it out of (0 = ramp, 1..3 = step k)
paqL    = $80f6                 ; FINEANG: pa*4 as a 10-bit value, formed ONCE a frame
paqH    = $80f7
rqL     = $80f8                 ; and this ray's 10-bit angle: rqL is the table index,
rqH     = $80fc                 ; rqH (0..3) picks which quarter of the 1024-entry table.
                                ; It was declared TWICE, at $cbf9 and here; the assembler takes
                                ; the last, so $cbf9 was never the live one. Removed rather
                                ; than left as a trap for the next reader.
cqtmp   = $80f2                 ; the colour this cell needs, while both its rows are queued
cmtmp   = $80f4                 ; PLAN=3: calcM scratch, and the m it returns. m = w1 + w2 is
cmv     = $80f5                 ; the ninth index bit -- the two columns the bucket throws away

; bfsLast and mulWY were the ONLY live equates on page $7c00 -- everything else there is the
; PROFMAX/SEAMPRE/SEAMCNT clusters, now gated above. The hole report reserves a whole PAGE per
; squatter, so these two bytes were holding 256 out of the free map, and deleting the dead
; equates around them would have freed NOTHING while they stayed. Parked beside obKeyT on
; page $7c00's 24-byte tail, and the PROFILE/PROFMAX/SEAMCNT/SEAMPRE clusters take page $7e00
; in exchange -- gated, so only their own builds reserve it. That trades 24 bytes for 256.
; (Not $70xx: that is orbOccT's emitted range, which grows with the level's run count -- the
; overlap guard caught exactly that.)
bfsLast = $7ce8                 ; frameCnt when the fill last ran; see bfsExp
mulWY   = $7ce9                 ; mulW saves Y here



seamT   = $84c8                 ; per cell-column (40): char code for the solid run --
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
pvBnd   = $fe00                 ; the column the boundary was pinned at
pvAng   = $fe40                 ; its WORLD bearing as a byte angle, pa + rayOffT[col]
pvRcp   = $fe80                 ; 163/distance, for the translation term
pvN     = $8000                 ; how many of them there are; 0 disables the hint for a frame
opaL    = $8001                 ; the 16-bit angle those bearings were taken at
opaH    = $8002
opxL    = $8003                 ; ... and the position, so the translation term has a delta
opxH    = $8004
opyL    = $8005
opyH    = $8006
dqa     = $8007                 ; this frame's rotation, quarter-units, signed
pvDX    = $8008                 ; this frame's translation, 1/256 cells, signed bytes.
pvDY    = $8009                 ;   NOT dxv/dyv -- interpSpan already owns those as its
                                ;   Bresenham span width and error step.
pvI     = $800a                 ; index while walking the hints, and the last cut emitted
pvLast  = $800b
pvTL    = $800c                 ; the signed 16-bit term, and the top two bytes of the
pvTH    = $800d                 ;   24-bit product it feeds
pvPH    = $800e
pvPB    = $800f
pvSgn   = $8010                 ; sign of the term, carried around the unsigned multiply
pvI2    = $8011                 ; the hint index, saved across mul8 (which needs X)
pvYs    = $8012                 ; the bearing, saved across the first multiply
pvMode  = $802a                 ; 0 = predict in full, 1 = turned in place (the translation
                                ;   term is identically zero), 2 = nothing moved at all.
                                ; NOT beside pvYs: $cb13-$cb29 are claimed by the RAYCNT,
                                ; TOUR and PALKEYS blocks below, which are separate build
                                ; flags -- a PIVOT variable landing in that range collides
                                ; only in the diagnostic builds, i.e. silently.
colW    = $8023                 ; the three ink colours, one register each. NOT inside the PALKEYS
colB    = $8024                 ;   block: init loads $d021/$d022/$d023 from these in EVERY build,
colS    = $8025                 ;   so PALKEYS=0 failed to assemble on an undefined colW. It is the
                                ;   key CYCLING that is optional, not the colours -- and a config
                                ;   that does not assemble is the silent trap this file warns about
                                ;   elsewhere: VICE boots the PREVIOUS disk and the numbers look real.
pkNew   = $8026                 ; palette keys this frame, last frame, and the fresh presses
pkOld   = $8027
pkEdge  = $8028
pkJoy   = $8029                 ; joystick-1 lines, masked out of the palette-key reads
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
ocptr   = $9e                    ; 2 bytes: into the cell's visibility list
ocos    = $8500
ocosS   = $8501
osin    = $8502
osinS   = $8503
fwdL    = $8504
fwdH    = $8505
rgtL    = $8506
rgtH    = $8507
ogL     = $8508
ogH     = $8509
oe      = $850a
o3      = $850b
ocoff   = $850c
ovar    = $850d
ocol    = $8510
ocl     = $8512
ocr     = $8513
oidx    = $8517
ocn     = $8518
ocy     = $8519
onv     = $851a
ohtmp   = $81f0
carry   = $81f1                  ; 0 = empty hands, else the held entity's index + 1
fcCell  = $81f2                  ; the cell directly in front of the player, and its parts
fcX     = $81f3
fcY     = $81f4
okNew   = $81f5                  ; SPACE, debounced to one action a press
okOld   = $81f6
okJoy   = $81f7                  ; how many slots this rung of the hole wants
onvH    = $81ef                  ; the HOLE allocates downward from 8: it is flat on the floor,
omEn    = $851b
omXX    = $851c
omYY    = $851d
omPri   = $851e
omX8    = $851f
omBit   = $8520
melCnt  = $85c3                  ; 60ths left on this note, where we are in the figure, and the
melIx   = $85c4                  ;   shimmer phase plus the waveform byte it selects
melPh   = $85c5
melWav  = $85c6
skJoy   = $85c7                  ; SNDTEST: the live cutoff / pulse-width tweak keys
skTmp   = $85c8
skOld   = $85c9
skNew   = $85cc
skEdge  = $85cd
marked  = $8584                  ; 0, or the index+1 of the angel that stepped up beside you
dieSt   = $8585                  ; 0 alive, 1 the room going out, 2 a picture up, 3 held on black
dieCnt  = $8586
dieDir  = $8587                  ; the turn the player was making, locked in
dieOpa  = $8588
dieP    = $8589                  ; which picture of this death's sequence is on screen
dieRem  = $858a                  ; whole angle units the sweep still owes
dieCl   = $858b                  ; scratch: dx+1 and dy+1 while the bearing index is built
dieRlT  = $8069                  ; frames before the landing note's gate drops
dieKik  = $8068                  ; frames left in the kick's downward sweep
dieFqL  = $8066                  ; the rising tone's 16-bit frequency
dieFqH  = $8067
dieSgn  = $8065                  ; oaS at the last projection: which side of centre
dieLk   = $8064                  ; consecutive frames the angel has read as centred
dieIdx  = $8063                  ; the entity the death sweep is steering onto
dieDirF = $8061                  ; fine half of the captured turn rate
dieOpaF = $8062
dieCy   = $8060                  ; ($8060-$8073 came free with the six-sprite angel)
dieOff  = $858d                  ; the angel's column offset from centre, from the projection
dieT0   = $858e                  ; frameCnt when they died: everything is measured from here
dieTck  = $858f                  ; the last palette tick written, so a fill happens once
dieEl   = $8590
dkJoy   = $8591
dieLat  = $8562                  ; dieSt, LATCHED at raster 250. sprPal runs in the IRQ and read
                                 ;   dieSt direct, so the frame dieGo set it the shared sprite
                                 ;   inks changed WITHIN that frame -- while obC goes out through
                                 ;   osFlush at raster 250 and lands the frame after. One frame
                                 ;   apart, every time. Same trick as idolOn/idolWk, and for the
                                 ;   same reason: what the IRQ reads sixty times a second must
                                 ;   not change under it halfway down the screen.
dieInk  = $8561                  ; the orb's body colour, walked down to black with the room
ovProbe = $8550                  ; the span walk is counting columns, not allocating a sprite
ovVis   = $8551                  ; columns of the entity a span SHOWS
ovOcc   = $8552                  ;   ... and columns a span HIDES
ovSpR   = $8554                  ; the span's right edge, kept for the overlap width
ovTmp   = $8555
ovSvS   = $8556                  ; orbSeenT saved across a probe -- orbNo writes it
sdL     = $85d8                  ; STAMPDBG: the cell range the last stamped span covered, and
sdR     = $85d9                  ;   how many spans were stamped this frame. Recorded by the
sdN     = $85da                  ;   stamp ITSELF, so it can be read at a single breakpoint --
sdEnt   = $85db                  ;   watchpoints shift raster timing and this engine notices.
markPa  = $8553                  ; heading when the angel cornered you: the turn trigger's origin
sndMode = $85ce                  ; index into sndModeT: low / band / high / notch
sndVol  = $85cf
sndFc   = $85ca
sndPw   = $85cb
sndD    = $85c0                  ; nearest angel, in cells; and the scratch the search needs
sndI    = $85c1
sndT    = $85c2

omMc    = $850e
amIdx   = $84f6                  ; angel movement scratch: entity, chosen step, target cell
amDX    = $84f7
amDY    = $84f8
amTX    = $84f9
amTY    = $84fa
amCell  = $84fb
amX     = $84fc
amY     = $84fd
entDty  = $84fe                  ; an ENTITY moved, so orbMove's still-frame gate must not skip
dbgOnce = $84f5                  ; DROPNOW only

odBest  = $84f0                  ; the drop/take chooser: best |columns from centre| so far,
odCell  = $84f1                  ;   what won ($ff = nothing in reach), and the loop counter
odX     = $84f2
odY     = $84f3
odD     = $84f4
apC     = $8557                  ; anPath: the angel's cell, and the distance it is looking for
apD     = $8558
bfsPhase = $85e9                 ; the incremental distance fill: 0 idle, 1 clearing, 2 expanding
bfsCl   = $85ea                  ;   clear cursor, the cell each map is FOR, the queue ends,
bfsFor  = $85eb                  ;   the cell being expanded and its distance+1, and the
bfsDone = $85ec                  ;   per-frame expansion counter
bfsWant = $85ed
bfsHead = $85ee
bfsTail = $85ef
bfsC    = $8559
bfsND   = $855a
bfsN    = $855b
hlFill  = $85dc                  ; the fill ink of the hole-like entity being projected
hlKind  = $85dd                  ; which ladder holeTail is currently patched for
hoI     = $85de                  ; holeOne's loop: which hole-like entity, and its
hoOf    = $85df                  ;   LOS bitmap offset (index x 32)
ooCX    = $8511                  ; orbOcc1: the cell the entity is being tested from
ooAI    = $858c                  ; orbOccAll's loop counter -- orbOcc1 clobbers X
ooCY    = $8516                  ; buffered $d01c. STALE: the held object was a hi-res icon once;
                                 ;   it is the full multicolor sprite now, so this is $ff always
                                 ;   and the held object shares $d025/$d026 like everything else
; ---- the fall's two SCREEN SNAPSHOTS, 1000 bytes each ----
; fallDraw scrolls one room past another by copying rows out of these. They are written and read
; ONLY at runtime -- nothing is emitted into them -- so before they were named here the hole
; report counted both as free space and handed them out twice: the angel path table landed on
; $4900 and the BFS distance maps on $6200, and the drop came up as a screenful of garbage.
; ---- $6c00-$6fff: the four CPU pages, back in the image where they belong ----
; All four were exiled into VIC bank 3 for ONE reason, each comment saying so in its own words:
; the image had no free PAGE. Deleting fRowT (40 blocks x 32 bytes, all of it derivable) made
; that false -- it left exactly four contiguous page-aligned pages here. Bringing them home
; costs nothing in file bytes (the assembler pads holes either way) and buys 1,024 bytes of
; bank 3, which is the scarce resource: it is what lets a FOURTH level be resident, and it
; finally makes bank 3 graphics-only, which the build has been nagging about.
runPlaneT = $6d00                ; per run id: the wall's plane coordinate and which face is
runFaceT  = $6e00                ;   visible. Derived by mkRuns at boot and after every level
                                 ;   change; a page each because a level may have up to 255 runs
                                 ;   (level 4 has 100, which is what outgrew its old home).
doomT   = $6c00                  ; per cell: 1 while it belongs to a wall mid-collapse. wallSink
                                 ;   matches the columns showing the doomed group through it, so a
                                 ;   group can be any shape. Written only by wtCells; needs a whole
                                 ;   clear page, which the image now has again.
obKT    = $7cea                 ; obOrder: the smallest key so far, its entity, and the keys
obKI    = $7ceb
obKeyT  = $7cec                 ;   (NORB bytes, at most 8: the sprite budget bounds the cast)
bfsQ    = $6f00                  ; the angel fill's queue: one byte per open cell, so up to 254.
                                 ;   Pure scratch, nothing swaps it. Exiled to bank 3 when level
                                 ;   3's 196 open cells outgrew its old spot (2026-09-18) and no
                                 ;   image hole held a page; back in the image since fRowT left.
fallTailB = $fec0               ; FALLTAIL: the source rows BELOW the screen, 7 x 40.
                                 ;   In VIC bank 3 behind the pivot scratch (see PVBASE): the
                                 ;   four-level image has no contiguous 280 bytes anywhere.
                                 ;   A RAM buffer, not loaded data, so it costs no file bytes
                                 ;   and needs no loader entry -- only bank-3 sprite slots,
                                 ;   which is the cheaper currency. CPU-addressable because the
                                 ;   port is $35 all through play: HIRAM=0, so $e000-$ffff is
                                 ;   RAM, the same reason the screen can live at $e000/$e400.
                                 ;   Stops short of $fffa, which with the KERNAL banked out has
                                 ;   to hold the real NMI/RESET/IRQ vectors.
fallSnapD = $4900                ; the destination room, snapshotted before the drop begins
fallSnapS = $6200                ; the room being left
fdS     = $2b                    ; fallDraw's source and destination row pointers. Zero page
fdD     = $2d                    ;   because the copy is (zp),y -- the DATA can live anywhere
fallSt  = $81c0                  ; 0 normal, 1 dropping, 2 render the new view, 3 landing
fdN     = $81c7
ohP     = $8521                  ; hole scratch: the left half's sprite pointer, the hires-pixel
ohT     = $850f
ohWc    = $852b                  ; how many COLUMNS one sprite of this rung covers, 12 or 24
ohBL    = $852c                  ; this slice's column + 12, signed and 16-bit: it runs to
ohBH    = $852d                  ;   249, so bit 7 of the low byte cannot carry the sign
arcC    = $81c8                  ; arcCalc/arcBand: the column being worked
arcA    = $81c9                  ; the rim's amplitude this frame, 88s/r -- the whole animation
arcHi   = $81ca                  ; the LOWEST rim row over all 40 columns: whole rows below it are
                                 ;   solid hole and fill fast, so only the thin band above it
                                 ;   needs per-column work
fdCol   = $81cb                  ; what fdFill lays down: floor or hole
arcNg   = $81cc                  ; $ff once the eye is BELOW floor level and the arc inverts
fFrm    = $81f8                  ; which frame of the drop: the index into fRowT. ABOVE arcR's
fwRow   = $81f9                  ;   40 bytes -- $81cd is pd11, which the overlap check caught
fwN     = $81fa
arcY    = $81fb                  ; the crown's pixel row this frame
apPrev  = $81d0                  ; arcBand: the boundary pixel row at this cell's left edge,
apCur   = $81d1                  ;   and at its right -- carried over so 41 edges cost 41
apRow   = $81d2                  ;   multiplies, not 80. Then the cell row, 8*row+8, the
apBase  = $81d3                  ;   half-built rampThi index, the glyph, and the saved
apIdx   = $81d4                  ;   edge counter while Y addresses the screen.
apCode  = $81d5
apY     = $81d6
apT     = $81d7                  ; arcLvl's argument
phA     = $81df                  ; the arc's row LAST time each buffer was drawn. The region below
phB     = $81e0                  ;   it is already solid, so only the newly covered rows need
                                 ;   painting -- and PER BUFFER, because each one is two animation
                                 ;   frames stale.
arcBlw  = $81d8                  ; what fills BELOW the rim this phase
arcInv  = $81d9                  ; 0 on the drop, $ff on the landing: the colours swap
pd11    = $81cd                  ; PENDING $d011 and split line, published at the buffer flip.
pSplit  = $81ce
anKx    = $81db                  ; the reach test's dx+1 and dy+1, kept so the DIAGONAL case
anKy    = $81dc                  ;   can be told from the orthogonal one
markSaw = $81dd                  ; was the angel being WATCHED when it reached you? Then there is
                                 ;   no "look away and back" left to wait for -- see dieChk.
idolHd  = $81da                  ; 1 while the IDOL is the thing in your hands. The angel
                                 ;   step reads it: carrying it, being looked at no longer stops
                                 ;   them. That is the whole cost of the thing.
pSplit2 = $81de                  ; the arc's split: charset A again from the rim down
pCh0    = $81e1                  ; which charset each of the three regions uses. The DROP wants
pCh1    = $81e2                  ;   A,B,A -- scene above the horizon, mirrored scene below it,
arcSkip = $81e4                  ; the landing places its own splits
arcIx   = $81e5                  ; which arc frame to draw -- not always fFrm, see the overlap
rsHi    = $81eb                  ; renderSym's column range, 39..0 for an ordinary frame
rsLo    = $81ec
otmp    = $81ed
onvL    = $81ee                  ;   lower half took, so its clip record can be inherited
bgOn    = $81e6                  ; background render in progress: cap the subdivision loop
bgN     = $81e7                  ; iterations left this frame
bgMore  = $81e8                  ; $ff = the stack still has work on it
bgCol   = $81e9                  ; next column for the sliced renderSym
bgPh    = $81ea                  ; 0 idle, 1 casting, 2 drawing columns, 3 done
                                 ; NOTE: renderSym cannot target fallBuf2 -- its fill chains are
                                 ; straight lines of stores with the screen address BAKED IN, one
                                 ; pair per buffer. The slices therefore render into the back
                                 ; buffer and get copied out column-wise before the fall frame
                                 ; paints over them.
pCh2    = $81e3                  ;   then A for the rim. The LANDING wants B,A,B: its rim is at
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
fT0     = $81cf                  ; frameCnt at the last flip: the fall's constant-rate reference
hlv     = $852e                  ; which hole is live, 0 or 1, and that times 32 for the
hlvOf   = $852f                  ;   per-hole line-of-sight map
ohF     = $8514                  ; the rung's flag byte: bit 0 hmag, bit 1 two sprites, bit 2 vmag
pcell   = $8515                  ; the cell the player stands in, for the hole's LOS gate
odb     = $8522                  ; DBGORB scratch: six bytes shown as hex on screen row 3
ocn3    = $852a
obX     = $8530
obY     = $8538
obP     = $8540
obC     = $8548                  ; per-sprite state, flushed to the VIC in the border
opx     = $855c                  ; the viewpoint orbMove last projected from
opy     = $855e
opa     = $8560
ofx     = $8564
ofy     = $8565
kxc     = $8566
kxs     = $8567
kyc     = $8568
kys     = $8569
kfL     = $856a
kfH     = $856b
krL     = $856c
krH     = $856d
oix     = $856e
oiy     = $856f
oax     = $8570
oay     = $8571
oixS    = $8572
oiyS    = $8573
ocl2    = $8593                 ; the bounding box in COLUMNS, not cells
ocmax   = $8594
obCL    = $8598                 ; per sprite slot, for the second pass: cell range and
obCR    = $85a0                 ; bounding-box edge masks, so pass 2 need not reproject
obBL    = $85a8
obBR    = $85b0
obIX    = $85b8
obV     = $85d0                 ; size variant per slot, so orbSeam can find the sprite's
obOcc   = $85e0                 ; per slot: bit 7 = this orb has a possible occluder here
obL     = $8574                 ; per slot: the orb's TIGHT column range, which the cell range
obR     = $857c                 ;   cannot give -- a cell is 4 columns and a box starts inside one
osI     = $85f4                 ; occStamp: slot being stamped, and how many there are
osN     = $85f5
osL     = $85f6                 ; the span/box intersection being stamped
osR     = $85f7
osRow   = $85f8                 ; char row range
osRowB  = $85f9
ohFst   = $8595                 ; the stamp's two edge glyphs, chosen once per span
ohLst   = $8596
ohFstW  = $8523                 ; the same two edge glyphs backed by white
ohLstW  = $8524
ohFstM  = $8525                 ; the columns each split leaves UNCOVERED, as a cellFillT mask:
ohLstM  = $8526                 ;   what the cell shows outside the stamp, which picks the backing
ohMsk   = $8527                 ; oSBack scratch: the mask under test, and the saved X
osSrc   = $a0                   ; OCCSYN: source glyph pointer (2). The destinations are patched
                                ;   into oSPut's own stores (oSPa/oSPb), not held here.
osCov   = $a2                   ;   the covered-column pair mask
osTmp   = $a3                   ;   the code being built, and a byte temp (2)
osGly   = $a5                   ;   the fallback split glyphs, black- and white-backed
osGlyW  = $a6
osSyn   = $a7                   ;   the next scratch glyph, and the first one past this buffer's half
osLim   = $a8
osPY    = $a9                   ;   Y saved across the row loop
ohMsX   = $8528
o2r     = $8529                 ; the ball's RIGHT extent from ocol; o2 is now the LEFT one.
                                ;   Not zero page: it is touched a handful of times per orb, in
                                ;   the projection, never in a per-column loop.
osDC    = $85fb                 ; occStamp: the de-seam's current cell column
oSCnt   = $85fc                 ; DBGORB: cells stamped this frame, orbs that entered the walk,
oSOrb   = $85fd                 ;   and spans visited -- the three numbers the cost is made of
oSSpn   = $85fe
ohSv    = $85fa                 ; span right edge / row counter, reused
osPtr   = $9e                   ; SHARES ocptr: the candidate walk is finished by the time
                                ;   occStamp runs, so its pointer is free
omptr   = $87                   ; 2 bytes: this orb's occluder mask. Deliberately SHARES oaL/oaH,
                                ;   the multiply accumulator, which is dead once the projection
                                ;   has produced a column range -- the same aliasing the original
                                ;   used. Anything calling oabs after this point would break it.
ohRun   = $85f0                 ; the run id, held across the mask-byte lookup
ohL     = $85f1                 ; the span being tested: its left column, and the index into bndT
ohBX    = $85f2
ohDbg   = $85f3                 ; ORBOCCDBG: furthest stage any orb reached this frame
ocolN   = $8597                 ; centre column went left of 0: ocol holds the magnitude
ocanO   = $85e8                 ; the same bit while the candidate list is being walked

bndT    = $7f00                 ; columns where a face or saturation state begins ($40 max)
remLoT  = $8300                 ; per marched column: castRay's raw hit distance, 8.8 cells.
remHiT  = $7d00                 ;   Parked so u can be derived later, only where it is needed.

        * = $0801
        !byte $0c,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
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
        lda #$00
        sta $d01a
        lda $dd00               ; VIC bank 3 ($c000-$ffff). The bits are INVERTED, so bank 3 is
        and #$fc                ; %00 -- "and", where bank 0 was "ora #$03".
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
        lda #$00
        sta arcSkip
        lda #$00
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
        sta hlvOf
        sta $d015               ; nothing visible until orbMove has decided what is
        lda pa
        eor #$80
        sta opa                 ; cannot match pa, so the first frame never takes the still path
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
        sta pkOld               ; no keys held on the first frame, so nothing reads as a fresh press
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
        ; The four tables are contiguous at $c500/$c528/$c550/$c578, so one walk covers them:
        ; offsets 0-79 are the ceiling pair, 80-159 the solid pair.
        ldx #$00
        lda #$00
rfCz0:  sta cwA,x
        inx
        cpx #80
        bcc rfCz0
        lda #$ff
rfCz:   sta cwA,x
        inx
        bne rfCz
        lda #$08                ; bit3 = per-cell multicolor enable, low three bits = the
                                ; bit-pair-11 colour. Written once at startup and never
                                ; touched again: the pattern pairing that used to rewrite it
                                ; per cell was removed at 66bc8cf.
                                ;
                                ; It is still the live hook for two-patterns-per-code, and
                                ; more so than before -- every wall pixel is pair 11 now, so
                                ; $08/$09 per cell would flip that cell's whole wall between
                                ; black and white. The old encoding's other two values are
                                ; also still where they were: 01 = $d022 black, 00 = $d021
                                ; white. What killed it was the per-frame write, not the
                                ; charset trick.
ccf:    sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne ccf
        jsr lvlStart            ; the LIVE level's start -- boot and every death come here
        jsr sndInit             ; the drone starts before the first frame and never stops

        lda #$ff                ; hazCur is READ to decide whether the run-table patches are stale
        sta hazCur              ;   and never written anywhere, so it held power-on garbage. When
                                ;   that garbage happened to equal the current cell, hazSet was
                                ;   SKIPPED -- and run ids feed the occlusion masks, which decide
                                ;   whether the angel counts as seen, which decides whether it
                                ;   moves. VICE randomises RAM per run, so the same disk took a
                                ;   different path every time. $ff is not a legal cell here (ids
                                ;   are y*16+x and no map is 16 rows deep), so hazSet always runs,
                                ;   which is the behaviour the garbage gave us MOST of the time.
        lda #$00
        sta dieSt               ; power-on garbage here sent the loop straight into the cut scene with
        sta marked              ;   no state set up, and the program fell out to BASIC
        lda #$0f
        sta sndD
        lda #$00
        sta sokAn               ; RETURN restarts by JUMPING to entry, not by reloading, so
        jsr wallsBack           ;   anything mid-animation is still live RAM and has to be
                                ;   cleared by hand. A wall the sockets took out must come back
                                ;   too, or a restart hands you a level already solved.
        jsr mkRuns              ; ALWAYS at boot now: runPlaneT/runFaceT are not emitted at all
                                ;   (bank-3 scratch), so the live level derives them exactly as a
                                ;   swapped-in one does. The four per-cell run tables are still
                                ;   carried, and this rewrites them byte for byte (MKRUNS=1 was
                                ;   the proof of that, and is now simply the default).
        jsr objInit             ; entities back to their starting cells -- RETURN restarts by
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
        sta lastFrame
        sta lastFrame+1
        sta renderCnt
        sta fpsTens
        sta fpsOnes

        cli

mloop:
        jsr palKeys             ; 1/2/3 walk the three inks round the palette
        jsr dieKey              ; RETURN restarts, at any time


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
mfLive: jsr sndTick
        jsr sfxTick
        jsr readKeys
mfSkip:
        jsr fallChk             ; stepped into the hole? the cut-scene starts on this frame
        lda fallSt
        beq mfRnd
        jsr fallStep            ; the destination render is a background job now -- no state
        jmp mvs                 ;   between walking and falling
mfRnd:  lda #$00
        sta bgOn                ; the player's own frame is never capped, and draws every column
        sta rsLo
        lda #39
        sta rsHi
        jsr rayAll              ; the cast is a SUBROUTINE now, so the fall can run it too --
        jmp subFin              ;   in slices, into a buffer, while the animation keeps moving
rayCont:jmp subLp               ; resume a capped cast: everything it needs is still in RAM
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
        cmp hazCur              ; the run tables are patched for the cell being RENDERED
        beq hzOk                ;   from, so this stays consistent even when the fall renders a
        jsr hazSet              ;   different cell than the player stands in
hzOk:
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
subLp:  lda bgOn                ; ---- the cast is INTERRUPTIBLE ----
        beq subLp0              ;   Normal rendering pays one compare per pop for this. The
        dec bgN                 ;   background render for the fall gets a per-frame iteration
        bne subLp0              ;   budget instead, and when it runs out it simply RETURNS: sp
        lda #$ff                ;   and the two stack arrays are plain RAM, so next frame picks
        sta bgMore              ;   up exactly where it stopped. No recursion to unwind -- the
        rts                     ;   subdivision was an explicit stack all along.
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
        ; CVXSEAM=1 IS THE DEFAULT, so EVERY run end gets its mark, concave or convex -- not the
        ; whole vertical run, just the column where black meets black. The block below is the
        ; CVXSEAM=0 path and the rest of this note describes IT, not what ships:
        ;   a CONCAVE corner is an inside corner where two perpendicular faces meet, both walls
        ;   at the same depth, so the line is the only thing dividing them. A CONVEX corner --
        ;   the end of a receding wall -- is already drawn by the silhouette stepping 20+ rows,
        ;   and the argument was that a grey line adds nothing to a boundary that emphatic.
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
        jsr subFlush
        rts                     ; was "jmp subFin": rayAll returns to its caller now

subFlush:                       ; interpolate + seam one maximal face
        lda spanR
        cmp spanL
        bcc subFDn              ; empty
        jsr interpSpan
        jsr seamSpan
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
; probes, never pixels. Modelled in analyze-pivot.mjs at 22.6 -> 15.0 marches/frame.
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
        sta pvDX
        lda py
        sec
        sbc opyL
        sta pvTL
        lda py+1
        sbc opyH
        sta pvTH
        jsr pvClmp
        sta pvDY
        ; ---- how much of the prediction does this frame actually need? ----
        ; pivOne is 890 cycles a hint -- measured, 11% of the worst frame at nine hints -- and
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
        jsr pivCut
        pla
        clc
        adc #$01
        cmp #$9f
        bcs pivNx
        jsr pivCut
pivNx:  jmp pivLp               ; pvI was decremented at the top; 0 ends the walk
pivEnd: lda #$9f    ; the last span always runs to the right edge
        jsr pivPush
        lda #$00
        sta pvN                 ; this frame records its own boundaries from scratch
        rts

; march column A, then push the span (pvLast, A) and make A the new pvLast
pivCut: pha
        sta col
        jsr marchCol
        pla
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
pv1All: ldy pvAng,x
        jsr pivTerm             ; pvTL/pvTH = the signed 16-bit term
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
        jsr mul8                ; the product's LOW byte is never read: the >>15 below takes
        lda phi                 ; only bits 15..22, so byte 0 cannot reach the result
        sta pvPH
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
pv1n:   lda pvPH                ; + 2^14: a bare >>15 truncates toward -inf, and -0.4 of a
        clc                     ; column every frame is enough to miss at a one-column bracket
        adc #$40
        sta pvPH
        lda pvPB
        adc #$00
        sta pvPB
        lda pvPH                ; >>15 = (pvPB<<1) | bit 7 of pvPH
        asl
        lda pvPB
        rol
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

; pivTerm: Y = the boundary's world bearing -> pvTL/pvTH = pvDX*sin(a) - pvDY*cos(a), signed.
; Two unsigned multiplies with the signs carried in pvSgn, because mul8 is a quarter-square
; table and only takes magnitudes.
pivTerm:lda #$00
        sta pvTL
        sta pvTH
        sta pvSgn
        sty pvYs
        lda sinST,y
        jsr pvNeg
        sta mq
        lda pvDX
        jsr pvNeg
        jsr mul8
        lda pvSgn
        bmi pvT1s
        clc                     ; term += |dx*sin|
        lda pvTL
        adc plo
        sta pvTL
        lda pvTH
        adc phi
        sta pvTH
        jmp pvT2
pvT1s:  sec                     ; term -= |dx*sin|
        lda pvTL
        sbc plo
        sta pvTL
        lda pvTH
        sbc phi
        sta pvTH
pvT2:   lda #$00
        sta pvSgn
        lda pvYs                ; cos(a) = sin(a + a quarter turn); no second table
        clc
        adc #$40
        tay
        lda sinST,y
        jsr pvNeg
        sta mq
        lda pvDY
        jsr pvNeg
        jsr mul8
        lda pvSgn               ; this product is SUBTRACTED, so the senses invert
        bmi pvT2a
        sec
        lda pvTL
        sbc plo
        sta pvTL
        lda pvTH
        sbc phi
        sta pvTH
        rts
pvT2a:  clc
        lda pvTL
        adc plo
        sta pvTL
        lda pvTH
        adc phi
        sta pvTH
        rts

; pvNeg: A signed -> A = |A|, flipping pvSgn's bit 7 when it was negative
pvNeg:  cmp #$80
        bcc pvNgD
        eor #$ff
        clc
        adc #$01
        pha
        lda pvSgn
        eor #$80
        sta pvSgn
        pla
pvNgD:  rts

subFin:
        jsr orbOccAll           ; the run table is final HERE and renumbers every frame, so every
                                ;   entity mask has to be rebuilt against it before anything reads
                                ;   one. See orbOcc1.
        jsr orbMove             ; once a frame: project every candidate the cell lists
        jsr orbKey              ; SPACE: take the orb you are looking at, or put the carried one
                                ;   down. AFTER orbMove, because that is what sets up the frame
                                ;   trig and fractional-offset terms orbProj reads. Acting a frame
                                ;   later than the press is invisible; projecting from last
                                ;   frame pose would not be.
        jsr bfsTick             ; a few cells of the angel distance map; see anPath
        jsr angStep             ; AFTER the projection, so orbSeenT describes THIS frame. Run
                                ;   before it, the angel decided on last frame visibility and so
                                ;   took one free step on the very frame you turned to face it --
                                ;   it moved AS you looked, which reads as a pop. Its own step is
                                ;   rendered next frame via entDty, which nobody can see.
        jsr dieChk              ; the mark, and the moment they turn far enough to see it
        jsr wallSink            ; a vanishing wall, mid-collapse
        jsr renderSym
        lda #$13                ; DEN on: there is a rendered frame to show now
        sta pd11
        jsr occStamp            ; AFTER renderSym: it overwrites cells renderSym just drew
        jsr hudX                ; the raster count, the LEVEL line and the 'L' key. Outside the
                                ;   NOHUD gate: the key is a control, not a readout.
        jsr drawFps
        jsr drawDbg


        inc renderCnt
        lda renderCnt
        cmp #16
        bcc noFps
        jsr computeFps
        lda #$00
        sta renderCnt
noFps:  jmp mvs                 ; the ordinary path takes the SINGLE wait. Falling through to the
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
fwait:  lda frameCnt
        sec
        sbc fT0
        cmp #3
        bcc fwait
mvs:    lda $d012
        cmp #250
        bne mvs
        lda frameCnt            ; the flip IS the fall's clock reference: raster 250 of a known
        sta fT0                 ;   frame, so the next deadline is exactly fT0 + 3
        lda pd11                ; PUBLISH the pending scroll and split HERE, alongside the buffer
        sta $d011               ;   flip below, so the fine scroll and the content it shifts reach
        lda pSplit              ;   the screen on the same 60Hz frame. Written inside fallStep they
        sta irqCmp+1            ;   landed a frame early, against the back buffer -- which is the
        sta irqArm+1            ;   whole of the fall's backwards jitter. Raster 250 is in the
        lda pSplit2
        sta irqCm2+1
        sta irqAr2+1
        jsr sprArm              ; ...and whether the held object gets its own inks
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
; redundant: the face boundary is rendered as a true vertical step (see prepCells/cstepT).

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


        ldx rsHi                ; X = cell column throughout; the chains use it as their index.
                                ; A RANGE, not always 39..0: the fall renders the destination
                                ; room a slice of columns at a time, in the gaps its own frames
                                ; leave, so nothing has to stall for a whole render.
        ; The cell's min and max heights, computed HERE rather than in a pass of their own.
        ; prepCells walked these same 40 cell columns to write cmnT/cmxT for renderSym to read
        ; back one loop later -- 40 iterations of loop overhead and a store-then-load round
        ; trip to move two bytes between two routines that visit the cells in the same order.
        ; X is the cell column and the chains index by it, so it has to survive; Y and A are
        ; free here, which is all this needs.
rfCol:  stx colc
        lda #$00
        sta vsOn                ; VSPLIT: no stack in progress
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
rfEdgeL:
        ldy erow
        lda kTabT,y
        sta kr
        ldx colc
        lda col4T,x
        tax                     ; X = 4*column -> logical column of this cell
        lda colH,x              ; cap here, not over all 160 columns: (h + K) has to fit a
        cmp hCap                ; signed byte, and colH is deliberately left uncapped so the
        bcc rfCp0               ; interpolator's merged spans stay linear
        lda #100
rfCp0:  clc
        adc kr
        tay
        lda clmp16,y
        sta hh0                 ; left level, already shifted into the high nibble
        lda colH+3,x
        cmp hCap
        bcc rfCp3
        lda #100
rfCp3:  clc
        adc kr
        tay
        lda clampT,y
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
        cmp hCap                ; same cap as the endpoints: (h + K) must fit a signed byte
        bcc rmpM1
        lda #100
rmpM1:  clc
        adc kr
        tay
        lda clamp8T,y           ; the LEVEL 0..8, not clampT's 0..15 clamp index
        sta cmtmp
        lda colH+2,x
        cmp hCap
        bcc rmpM2
        lda #100
rmpM2:  clc
        adc kr
        tay
        lda clamp8T,y
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
        cmp hCap                ; same cap as the endpoints: (h + K) must fit a signed byte
        bcc rfMc
        lda #100
rfMc:   clc
        adc kr
        tay
        lda clampT,y
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
rfEdgeT:lda erow                ; bottom of the edge run
        cmp rsv
        bcc vsChk
        jmp rfSolid
vsChk:  ldx vsOn                ; ---- VSPLIT: inside a step column's stack? ----
        beq rfEdgeL             ; no: the ordinary selection
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
vsEnd:  lda #$00                ; the far top's row and below: back to real selection
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
rfSlSm: lda #$ff              ; $ff is a value rs cannot take, so next frame's compare fails
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
        bmi rfDone              ; past column 0
        cpx rsLo
        bcs rfCol               ; still inside the slice
rfDone: rts

; calcM: A = w1 + w2, the two columns the bucket index does not carry. Same cap and clamp the
; endpoints get -- (h + K) must fit a signed byte, and clampT is the only thing that turns a
; height into a level. A subroutine rather than inlined twice: 12 cycles of jsr/rts against
; ~40 bytes duplicated, on a path that already costs ~50.
calcM:  ldx colc
        lda col4T,x
        tax
        lda colH+1,x
        cmp hCap
        bcc cm1
        lda #100
cm1:    clc
        adc kr
        tay
        lda clamp8T,y           ; the LEVEL 0..8, not clampT's 0..15 clamp index
        sta cmtmp
        lda colH+2,x
        cmp hCap
        bcc cm2
        lda #100
cm2:    clc
        adc kr
        tay
        lda clamp8T,y
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
        lda frameCnt
        sec
        sbc lastMv
        sta dtv
        lda frameCnt
        sta lastMv
        lda dtv
        bne tdCl
        inc dtv                 ; two renders inside one tick: still move a little
tdCl:   lda dtv
        cmp #32
        bcc tdDn
        lda #32          ; a hitch must not step far enough to tunnel a wall
        sta dtv
tdDn:   lda dtv                 ; unshifted, both run at plain elapsed time
        sta dtm
        sta dtt
        rts

; ---- palKeys: 1 / 2 / 3 cycle the ceiling, wall and seam inks ----

; Purely for looking at. In mloop rather than readKeys so it works in the SPIN and TOUR builds
; too, which never call readKeys. ~30 cycles a frame; PALKEYS=0 removes it for benchmarking.
;
; Matrix rows: '1' and '2' are both row $7f (bits 0 and 3), '3' is row $fd bit 0. The three are
; folded into one byte as bit0='1', bit2='3', bit3='2' so a single edge test covers them --
; without the edge test a held key would sprint through all sixteen colours in a quarter second.
palKeys:
        ; JOYSTICK 1 SHARES $dc01 WITH THE KEYBOARD COLUMNS, so a row read sees both. Joy-1 up
        ; pulls bit 0 and right pulls bit 3 -- the very bits '1'/'3' and '2' live on -- so
        ; without this mask, pushing the stick up cycled the ceiling AND the seam, and pushing
        ; right cycled the walls. readKeys has always done this; palKeys was written without it.
        ; Read the port with NO row selected: whatever is low then is the stick, not a key.
        lda #$ff
        sta $dc00
        lda $dc01
        eor #$ff
        sta pkJoy               ; 1 where a joystick line is active
        lda #$7f
        sta $dc00
        lda $dc01
        ora pkJoy               ; force the stick's bits high = "not pressed" in this active-low
        eor #$ff                ; read, THEN invert so 1 means pressed
        and #$49                ; row 7: bit0 '1', bit3 '2', bit6 'Q'
        sta pkNew
        lda #$fd
        sta $dc00
        lda $dc01
        ora pkJoy
        eor #$ff
        and #$03                ; row 1: bit0 '3', bit1 'W'
        asl                     ;   -> bits 4 and 5, which nothing else in pkEdge uses
        asl
        asl
        asl
        ora pkNew
        sta pkNew
        eor pkOld               ; changed since last frame ...
        and pkNew               ; ... and pressed now: a fresh press
        sta pkEdge
        lda pkNew
        sta pkOld
        lda #$ff
        sta $dc00               ; leave the port neutral for the joystick read in readKeys
        jsr palCol              ; '1' both grounds, 'Q' the floor, 'W' the ceiling.
                                ;   Out of the main block: three keys' worth of advance does not
                                ;   fit in what is left of it, and this frees what the one key
                                ;   used to cost.
pk2:    lda pkEdge
        and #$08
        beq pk3
        inc colB
        lda colB
        and #$0f
        sta colB
        sta $d022
pk3:    lda pkEdge
        and #$10                ; '3' sits at bit 4 now
        beq pkDn
        inc colS
        lda colS
        and #$0f
        sta colS
        sta $d023
pkDn:   rts
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
        sta rowv                ; SHIFT, E and S all live in this row -- read it once

        and #$80
        bne rkNoSh
        ; LEFT SHIFT: run. 3 cells/s and 127 deg/s, against 0.94 and 63 walking -- movement and
        ; turning get their own multipliers so running does not spin the world faster than it
        ; moves through it. Scaling elapsed TIME rather than the step keeps both frame-rate
        ; independent for free.
        ; The extra x4 that b3e72b0 put in front of these is gone with the quarter-speed walk
        ; it was compensating for: 3x/2x of a plain dtv gives running exactly the rates it has
        ; had throughout, 12 units of 1/256 cell and 6 quarter-units of angle per tick.
        lda dtv
        asl
        clc
        adc dtv                 ; 3x movement
        bcs rkShMc
        cmp #32
        bcc rkShM
rkShMc: lda #32
rkShM:  sta dtm
        lda dtv
        asl                     ; 2x turning
        cmp #32
        bcc rkShT
        lda #32
rkShT:  sta dtt
rkNoSh: lda rowv
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
rkNotF: lda joyv
        and #$04
        bne rkJR                ; joystick-1 left = turn left
        ldx dtt
        ldy pa
        lda paF
rkTlL:  sec
        sbc #$c0
        bcs rkTlL2
        dey                     ; the fraction borrowed: step the angle byte
rkTlL2: dex
        bne rkTlL
        sta paF
        sty pa
rkJR:   lda joyv
        and #$08
        bne rkJD                ; joystick-1 right = turn right
        ldx dtt
        ldy pa
        lda paF
rkTlR:  clc
        adc #$c0
        bcc rkTlR2
        iny                     ; the fraction carried: step the angle byte
rkTlR2: dex
        bne rkTlR
        sta paF
        sty pa
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
        ; Scale the step by elapsed ticks: dxs = dxv * dtv >> MOVE_SHIFT, sign extended to 16
        ; bits. dtv is single digits, so repeated addition beats setting up a multiply, and
        ; doing the shift AFTER is what keeps the direction accurate -- the table is deliberately
        ; 8x coarser than the speed so cos(a) has somewhere to live.
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
        ; it was -- verify with WIGGLE=1), and no facing is slow.
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
        lda cy0                 ; all four corners must be open
        jsr mulW
        sta tmp
        clc
        adc cx0
        tax
        lda blkT,x
        bne mvBlk
        lda tmp                 ; the row offset again -- ADDX, not ora: this reuses a stored
        clc
        adc cx1                  ;   y*MAPW so there is no MULW in front of it to spot
        tax
        lda blkT,x
        bne mvBlk
        lda cy1
        jsr mulW
        sta tmp
        clc
        adc cx0
        tax
        lda blkT,x
        bne mvBlk
        lda tmp                 ; the row offset again -- ADDX, not ora: this reuses a stored
        clc
        adc cx1                  ;   y*MAPW so there is no MULW in front of it to spot
        tax
        lda blkT,x
        bne mvBlk
        clc                     ; all four corners open
        rts
mvBlk:  sec
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
        ; cfar says of itself "unreachable with a solid border", and the build asserts a solid
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
; (or |sin|) as 0..255 against the parked hit distance gives exactly d*|dir|. The sign comes
; from the same posXT/posYT the DDA used to choose its step. sideMul eats X, hence ssAng.
; fr += (A - fr) * cuQF / 4, A being the next table entry. |sin| and |cos| move by at most ~6
; between adjacent 8-bit entries, so two bits of interpolation brings the error under 2 -- which
; is what the fine angle is worth. The slope is SIGNED, hence cmp #$80 / ror for the shifts.
cuLerp: sec
        sbc fr
        cpy #$02
        beq cuL2
        bcs cuL3
        cmp #$80                ; a quarter of the way: slope/4
        ror
        cmp #$80
        ror
        jmp cuLA
cuL2:   cmp #$80                ; halfway: slope/2
        ror
        jmp cuLA
cuL3:   cmp #$80                ; three quarters: slope/2 + slope/4
        ror
        sta cuQT
        cmp #$80
        ror
        clc
        adc cuQT
cuLA:   clc
        adc fr
        sta fr
        rts

calcU:  lda remLoT,x
        sta mlo
        lda remHiT,x
        sta mhi
        ; ---- the angle the ray was actually CAST at, to quarter resolution ----
        ; The DDA has used the fine angle since FINEANG; this was still adding the 8-bit rayOffT,
        ; so u described a direction the ray never took -- up to half a coarse unit, about 1.5
        ; columns, and THREE columns share one coarse entry. Same inputs as the caster: paq is
        ; formed once a frame, rayOffQS holds the per-column quarter offsets.
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
cuAH:   and #$03
        asl
        asl
        asl
        asl
        asl
        asl                     ; the quarter's two bits become the angle's top two
        sta ssAng
        lda cuQL
        and #$03
        sta cuQF                ; which quarter WITHIN the coarse entry, 0..3
        lda cuQL
        lsr
        lsr
        ora ssAng
        sta ssAng

        lda sideT,x
        bne cuX
        ldx ssAng
        lda absSinT,x
        sta fr
        ldy cuQF
        beq cuS0
        inx                     ; the next entry: X wraps at 255 and the table is periodic
        lda absSinT,x
        jsr cuLerp
cuS0:
        jsr sideMul
        ldx ssAng
        lda posYT,x
        bne cuYp
        sec
        lda py
        sbc s1
        sta uwL
        lda py+1
        sbc s2
        sta uwH
        rts
cuYp:   clc
        lda py
        adc s1
        sta uwL
        lda py+1
        adc s2
        sta uwH
        rts
cuX:    ldx ssAng
        lda absCosT,x
        sta fr
        ldy cuQF
        beq cuC0
        inx
        lda absCosT,x
        jsr cuLerp
cuC0:
        jsr sideMul
        ldx ssAng
        lda posXT,x
        bne cuXp
        sec
        lda px
        sbc s1
        sta uwL
        lda px+1
        sbc s2
        sta uwH
        rts
cuXp:   clc
        lda px
        adc s1
        sta uwL
        lda px+1
        adc s2
        sta uwH
        rts


; ============ per-cell run splits: make subLp's merge test correct, by cell ============
; subLp merges a span on faceIdT alone and never looks between the ends, so a wall hidden inside
; one is not drawn at all. From most cells every run is visible in ONE piece and that merge is
; exact; from a few, an occluder breaks a run in two and it is wrong. Those cells -- and only
; those -- get the far run's second half renamed to a spare id, so the EXISTING test splits the
; span. No width cap, no forced probes, no per-ray cost: cells that can merge safely still do.
;
; Restore-everything-then-apply, rather than reverting the last cell's patches. It costs a few
; more stores on a cell change and removes the entire class of bug where a stale patch outlives
; the cell that set it -- there is no "currently applied" state to get wrong.
hazSet: lda #<hazRstT    ; hzRd is self-modified rather than indirect: (zp),y needs a ZERO
        sta hzRd+1      ;   PAGE pointer, and there is none spare -- pointing it at $805f
        lda #>hazRstT   ;   assembled as ($5f),y and scattered writes across memory.
        sta hzRd+2
        jsr hzRun               ; every splittable run back to its merged id
        ldx hazNT               ; how many cells THIS level splits, less one. $ff = none, and it
        bmi hzNo                ;   must branch out: x=$ff would read 255 bytes past hazCT.
                                ;   (hzRt is in the HAZ_BASE block, far out of branch range.)
hzF:    lda hazCT,x             ; does THIS cell split anything?
        cmp cell0
        beq hzG
        dex
        bpl hzF
hzNo:   rts
hzG:    lda hazLoT,x            ; X must survive to here: hzRun clobbers it, and has not run yet
        sta hzRd+1
        lda hazHiT,x
        sta hzRd+2
        jmp hzRun

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
        lda remH
        sta remHiT,x
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
        ldy hcur
        lda errv
        ldx syNeg
        bne isD8
        ldx spanL
isA8:   txa                     ; --- ascending, four columns per bounds test ---
        clc
        adc #$04
        cmp spanR
        bcs isA1                ; fewer than four left: rolled tail below
        lda errv                ; the test above needed A; err is where the last body left it
        inx
        adc dyv
        bcs isha1            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswa1
issa1:  sbc dxv
        iny
        cmp dxv
        bcs issa1
iswa1:  sta errv
        tya
        sta colH,x
        lda errv
        inx
        adc dyv
        bcs isha2            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswa2
issa2:  sbc dxv
        iny
        cmp dxv
        bcs issa2
iswa2:  sta errv
        tya
        sta colH,x
        lda errv
        inx
        adc dyv
        bcs isha3            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswa3
issa3:  sbc dxv
        iny
        cmp dxv
        bcs issa3
iswa3:  sta errv
        tya
        sta colH,x
        lda errv
        inx
        adc dyv
        bcs isha4            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswa4
issa4:  sbc dxv
        iny
        cmp dxv
        bcs issa4
iswa4:  sta errv
        tya
        sta colH,x
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
isA1:   lda errv
        inx
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
isAWr:  sta errv                ; park err: A is needed for the stores
        tya
        sta colH,x
        lda errv
        jmp isA1
isAhi: sec
        sbc dxv
        iny
        bcs isAhi
        cmp dxv
        bcc isAWr
        bcs isAsb           ; always
isD8:   ldx spanL               ; --- descending ---
isDl8:  txa
        clc
        adc #$04
        cmp spanR
        bcs isD1
        lda errv
        inx
        adc dyv
        bcs ishd1            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswd1
issd1:  sbc dxv
        dey
        cmp dxv
        bcs issd1
iswd1:  sta errv
        tya
        sta colH,x
        lda errv
        inx
        adc dyv
        bcs ishd2            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswd2
issd2:  sbc dxv
        dey
        cmp dxv
        bcs issd2
iswd2:  sta errv
        tya
        sta colH,x
        lda errv
        inx
        adc dyv
        bcs ishd3            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswd3
issd3:  sbc dxv
        dey
        cmp dxv
        bcs issd3
iswd3:  sta errv
        tya
        sta colH,x
        lda errv
        inx
        adc dyv
        bcs ishd4            ; err+dyv crossed 256: handled below, out of line
        cmp dxv
        bcc iswd4
issd4:  sbc dxv
        dey
        cmp dxv
        bcs issd4
iswd4:  sta errv
        tya
        sta colH,x
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
isD1:   lda errv
        inx
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
isDWr:  sta errv
        tya
        sta colH,x
        lda errv
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
        ; The coarse angle is gone: the step signs now come from the fine angle's quarter, and
        ; posXT/posYT/absSinT/absCosT are only read by calcU, which builds its own ssAng.
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
        lda cell0               ; cell = mapY*16 + mapX, stepped by +-1 / +-16 from here on.
        sta cell                ; The value is the player's cell, so it is the same for every
                                ; ray in the frame -- computed once in mloop, not 11 times.
        ; X side dist: m = frac*ddx>>8 ; -x -> sdx=m ; +x -> sdx=ddx-m
        ; (standard form: full cell at frac=0, avoids the fr=256->0 wrap spike)
        ; --- sideMul inlined: a jsr/rts pair here is 12 cy a call, 24 a ray, ~770 a
        ; --- frame. Every other caller still uses the subroutine.
        ; It reads px / ddxH / ddx DIRECTLY rather than copying them into fr / mhi / mlo first.
        ; All six are zero page, so the copies bought nothing and cost 18 cycles an axis --
        ; 36 a ray, ~720 a frame. The names only ever existed as sideMul's argument protocol,
        ; and an inlined body has no protocol to honour.
        lda px                  ; --- high half: fr * mhi -> sdxH:s1 ---
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
cxmh1:   lda px
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
        lda px                  ; --- low half: only the HIGH byte survives the >>8 ---
        clc
        adc ddx
        tax
        bcc cxml0
        lda f1HiT,x
        sta qhi
        jmp cxml1
cxml0:   lda f0HiT,x
        sta qhi
cxml1:   lda px
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

        ; STEP SIGNS COME FROM THE FINE ANGLE. FINEANG moved the deltas to rq but left these
        ; on the coarse rang, and the two disagree at the axis boundaries -- the ray then steps
        ; the wrong way while using a delta for a slightly different direction. cos >= 0 in
        ; quarters 0 and 3, sin >= 0 in quarters 0 and 1, so rqH decides both, and posXT/posYT
        ; (512 bytes holding two bits) are not needed at all.
        lda rqH
        beq cxpos
        cmp #$03
        beq cxpos
        lda #$ff
        sta stpX
        lda #$ca                ; dex: the DDA's X step, patched rather than added -- see cxInc
        sta cxInc
        jmp cydo                ; negative: m IS the side distance, and the inlined
                                ; multiply above now writes it straight into sdx
cxpos:  lda #$01
        sta stpX
        lda #$e8                ; inx
        sta cxInc
        sec                     ; positive: sdx = ddx - m, in place
        lda ddx
        sbc sdx
        sta sdx
        lda ddxH
        sbc sdxH
        sta sdxH
cydo:
        ; --- sideMul inlined; reads py / ddyH / ddy directly, see the X axis above ---
        lda py                  ; --- high half: fr * mhi -> sdyH:s1 ---
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
cymh1:   lda py
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
        lda py                  ; --- low half: only the HIGH byte survives the >>8 ---
        clc
        adc ddy
        tax
        bcc cyml0
        lda f1HiT,x
        sta qhi
        jmp cyml1
cyml0:   lda f0HiT,x
        sta qhi
cyml1:   lda py
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

        lda rqH                 ; sin >= 0 in quarters 0 and 1
        cmp #$02
        bcc cypos
        lda #$ff
        sta stpY
        lda lvlDimT+2           ; -MAPW: one cell row back
        sta stpY16
        jmp cySat               ; negative: m IS the side distance, so there is nothing to
                                ; subtract -- but the saturation below still has to run
cypos:  lda #$01
        sta stpY
        lda lvlDimT             ; +MAPW: one cell row on
        sta stpY16
        sec                     ; positive: sdy = ddy - m, in place
        lda ddy
        sbc sdy
        sta sdy
        lda ddyH
        sbc sdyH
        sta sdyH
cySat:
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
        ldy lvlDimT+3           ; the step guard must span the MAP: a ray crosses at most
                                ;   W + H cell boundaries before it leaves the grid. At a fixed 24
                                ;   a long sightline expires early, cfar sets pp = 1, and the
                                ;   column ends up with no wall run -- which occWalk reads as
                                ;   "nothing here occludes", so entities BEHIND the wall draw.
        ldx cell
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
cstepY: clc
        lda sdy
        adc ddy
        sta sdy
        lda sdyH
        adc ddyH
        sta sdyH
        bcc cyNs
        lda #$ff                ; this axis is effectively never crossed again
        sta sdy
        sta sdyH
cyNs:   txa
        clc
        adc stpY16
        tax
        lda mapT,x
        bne cwallY
        dey
        bne cdda
        jmp cfar
        ; Both 'bcc cstepX' above arrive with carry CLEAR -- that is what the branch tested --
        ; so the add below does not need a clc. Only the exact-tie 'beq' arrives with it set,
        ; and that pays for its own here rather than taxing every step. (The Y side keeps its
        ; clc: 'bne cstepY' is reached when sdxH > sdyH, i.e. carry SET.)
cstepXc: clc
cstepX: lda sdx
        adc ddx
        sta sdx
        lda sdxH
        adc ddxH
        sta sdxH
        bcc cxNs
        lda #$ff
        sta sdx
        sta sdxH
        ; stpX is ALWAYS +-1 and is decided once per ray, so this is inx/dex -- 2 cycles
        ; against the 9 that txa / clc / adc stpX / tax cost. The opcode is patched at the
        ; same place stpX is set; stpX itself stays, because marchCol reads it to pick which
        ; face of the cell was hit.
cxNs:
cxInc:  inx                     ; PATCHED to $e8 inx / $ca dex, once per ray
        lda mapT,x
        bne cwallX
        dey
        bne cdda
cfar:   stx cell                ; step guard expired; unreachable with a solid border
        lda #$01
        sta pp
        rts
cwallX: stx cell                ; marchCol reads the cell back for the run-id lookup
        lda #$00
        sta side
        sec
        lda sdx
        sbc ddx
        sta remL
        lda sdxH
        sbc ddxH
        sta remH
        jmp cidx
cwallY: stx cell
        lda #$01
        sta side
        sec
        lda sdy
        sbc ddy
        sta remL
        lda sdyH
        sbc ddyH
        sta remH
        ; No cos correction here: it depends only on the column, so it is baked into the
        ; per-column height tables (see hTabT). This used to be a whole sideMul per ray.
cidx:
        lda remH
        cmp #24
        bcc cidxok
        lda #$01                ; past the map diagonal -> tiny far wall
        sta pp
        rts
        ; index = perpDist>>3 = remH*32 + (remL>>3)  (0..767), 1/32-cell steps
cidxok: lda remL
        lsr
        lsr
        lsr
        sta tmp                 ; remL>>3 (0..31)
        ldx remH                ; remH*32 was five rounds of "asl zp / rol zp" -- 50 cycles
        clc                     ; to multiply a value the cmp above just bounded under 24.
        lda m32LoT,x
        adc tmp
        sta ppLo
        lda m32HiT,x
        adc #$00
        sta ppHi                ; 0..2: which 256 of the distance index j
        ; ---- fold j onto the group's SINGLE page (see hJofY in the build) ----
        ; Zone boundaries are the page of j and the top bit of its low byte, so this is two
        ; branches on bytes already in hand -- no arithmetic on a 16-bit j. The near field
        ; (j < 128, walls inside ~4 cells) is the common case and takes the short path.
        lda ppHi
        bne hzFar
        lda ppLo
        bpl hzDn                ; j 0..127: one table entry per j
        and #$7f
        lsr
        ora #$80                ; j 128..255: two per entry. Bit 7 is set, so never zero
        bne hzDn                ;   and this branch is unconditional
hzFar:  lsr                     ; ppHi 1 -> C=1, ppHi 2 -> C=0
        lda ppLo
        bcc hzF2
        lsr
        lsr
        lsr
        clc
        adc #192                ; j 256..511: eight per entry
        bne hzDn                ; >= 192, so never zero
hzF2:   lsr
        lsr
        lsr
        lsr
        clc
        adc #224                ; j 512..767: sixteen per entry
hzDn:   tay
        ldx col
        lda colGrpT,x           ; the group IS the page: one per group now, not three
        clc
        adc #>hTabT
        sta hp+1
        lda #$00
        sta hp
        lda (hp),y
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
irqSpC: cmp #$ff                ; the HELD object's split, $ff while it is switched off
        bcs irqSp
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
irqSp:  jmp sprSpl              ; out of the main block; rejoins at irqd
        ; region 3 -- below the split, before the next frame's sprites -- is where the
        ; WORLD's inks come back. It used to be done from osFlush, which runs once per RENDERED
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
        inc frameCnt
        bne irqNf
        inc frameCnt+1
irqNf:
irqd:   lda #$ff
        sta $d019
        pla
        tay
        pla
        tax
        pla
        rti

; ---- nmi: swallow RESTORE ----
; The only NMI source here is the RESTORE key. With the KERNAL banked out there is no handler
; behind it, so this exists purely to make that keypress harmless. $dd0d is read to clear the
; CIA2 latch in case an NMI ever arrives from there instead.
nmi:    pha
        lda $dd0d
        pla
        rti

; ---- fps = 960 / (frames per 16 renders) ----

; ================= data =================
dirXT:  !byte 1,1,0,255,255,255,0,1
dirYT:  !byte 0,1,1,1,0,255,255,255
rowLoT: !byte 0,40,80,120,160,200,240,24,64,104,144,184,224,8,48,88,128,168,208,248,32,72,112,152,192
rowHiT: !byte 0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,2,2,3,3,3,3,3
kTabT:  !byte 164,172,180,188,196,204,212,220,228,236,244,252,4,156,148,140,132,124,116,108
vsplitL: !byte 0,5,10,11   ; VSPLIT: solid LEFT of boundary column 1,2,3: #... ##.. ###.
vsplitR: !byte 0,4,63,35   ;   solid RIGHT: .### ..## ...#
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

m32LoT: !byte 0,32,64,96,128,160,192,224,0,32,64,96,128,160,192,224,0,32,64,96,128,160,192,224
m32HiT: !byte 0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2
blkLoT: !byte 0,<bkA0,<bkA1,<bkA2,<bkA3,<bkA4,<bkA5,<bkA6,<bkA7,<bkA8,<bkA9,<bkA10,<bkA11,<bkA12,0,<bkB0,<bkB1,<bkB2,<bkB3,<bkB4,<bkB5,<bkB6,<bkB7,<bkB8,<bkB9,<bkB10,<bkB11,<bkB12
blkHiT: !byte 0,>bkA0,>bkA1,>bkA2,>bkA3,>bkA4,>bkA5,>bkA6,>bkA7,>bkA8,>bkA9,>bkA10,>bkA11,>bkA12,0,>bkB0,>bkB1,>bkB2,>bkB3,>bkB4,>bkB5,>bkB6,>bkB7,>bkB8,>bkB9,>bkB10,>bkB11,>bkB12
sldLoT: !byte <slA0,<slA1,<slA2,<slA3,<slA4,<slA5,<slA6,<slA7,<slA8,<slA9,<slA10,<slA11,<slA12,0,<slB0,<slB1,<slB2,<slB3,<slB4,<slB5,<slB6,<slB7,<slB8,<slB9,<slB10,<slB11,<slB12,0
sldHiT: !byte >slA0,>slA1,>slA2,>slA3,>slA4,>slA5,>slA6,>slA7,>slA8,>slA9,>slA10,>slA11,>slA12,0,>slB0,>slB1,>slB2,>slB3,>slB4,>slB5,>slB6,>slB7,>slB8,>slB9,>slB10,>slB11,>slB12,0
edgLoT: !byte <edA0,<edA1,<edA2,<edA3,<edA4,<edA5,<edA6,<edA7,<edA8,<edA9,<edA10,<edA11,<edA12,0,<edB0,<edB1,<edB2,<edB3,<edB4,<edB5,<edB6,<edB7,<edB8,<edB9,<edB10,<edB11,<edB12,0,<edT0,<edT1,<edT2,<edT3,<edT4,<edT5,<edT6
edgHiT: !byte >edA0,>edA1,>edA2,>edA3,>edA4,>edA5,>edA6,>edA7,>edA8,>edA9,>edA10,>edA11,>edA12,0,>edB0,>edB1,>edB2,>edB3,>edB4,>edB5,>edB6,>edB7,>edB8,>edB9,>edB10,>edB11,>edB12,0,>edT0,>edT1,>edT2,>edT3,>edT4,>edT5,>edT6
t1TabT: !byte 100,92,84,76,68,60,52,44,36,28,20,12,4
tbTabT: !byte 93,85,77,69,61,53,45,37,29,21,13,5,0

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
        ; ---- nothing moved? then nothing projects differently ----
        ; Six orbs on screen is about 18,700 cycles, and standing still it is 18,700 cycles
        ; spent arriving at last frame's answer. The sprite registers already hold it. All that
        ; has to be repeated is the repointing of far cells to SOLID's twin, because renderSym
        ; rewrites the screen every frame and puts plain SOLID back.
        jmp obMoved             ; DEADCODE-OK: the still-frame short-circuit is off until the
                                ; occlusion stamping lands -- see the comment above it.
        lda dieSt               ; the cut scene owns the sprites from the swap onward. Clearing
        cmp #$02                ;   omEn inside the swap did not hold: the swap runs from mfIn and
        bcs omDead              ;   the REST of that same frame still calls orbMove, which put the
        lda entDty              ; an entity moved even though the player did not. Without this
        bne obMoved             ;   a dropped orb stayed unrendered, and an angel that stepped
                                ;   while you stood still never appeared where it went
        lda px
        cmp opx
        bne obMoved
        lda px+1
        cmp opx+1
        bne obMoved
        lda py
        cmp opy
        bne obMoved
        lda py+1
        cmp opy+1
        bne obMoved
        lda paqL                ; the QUARTER-unit angle: comparing pa alone made a sub-unit turn
        cmp opaqL               ;   look like a still frame, so sprites were not reprojected at
        bne obMoved             ;   all until pa ticked over -- three columns at a time
        lda paqH
        cmp opaqH
        bne obMoved
        rts                     ; a still frame. The slot data from the last one still stands
                                ; and orbPaint runs unconditionally, so the walls come out
                                ; painted the same way without reprojecting anything.
omDead: rts
obMoved:lda #$00
        sta entDty
        lda px
        sta opx
        lda px+1
        sta opx+1
        lda py
        sta opy
        lda py+1
        sta opy+1
        lda pa
        sta opa
        lda paqL
        sta opaqL
        lda paqH
        sta opaqH
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
        lda orbColT2,x
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
        adc #$07
        cmp #$16
        bcc omSwV
        lda #$15  ; never past the orb's own rungs and into the angel's
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
        lda #$01
        sta entDty
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
        jsr wallTog
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
        ; them all and lets orbOne reject what is off screen. ocanO goes conservative: ask the
        ; occlusion test rather than trust a build-time answer about where things used to be.
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
        beq oSDn
        ldy #$03   ; OCCSYN: this buffer's half of the scratch glyphs is free again.
        ldx baseHi              ;   Buffer A ($e0) takes the first half, B the second; see OCCSYN.
        cpx #$e0                ;   (A still holds onv for the store below, so X and Y do the test)
        beq oSSynA
        ldx #$03
        ldy #$06
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
oSLoop: ldx osI
        lda obIX,x              ; a HOLE's slot: it carries no stamp state, and unlike the gate
        cmp #$fe                ;   below this test is always here, because ORBGATE is off by
        beq oSUpHf              ;   default and cannot be relied on to fence anything
        cmp nOrbT
        bcs oSNext

        lda obIX,x
        tay
        lda orbOccLoT,y
        sta omptr
        lda orbOccHiT,y
        sta omptr+1
        ; char rows the orb's CONTENT covers. obY is the sprite's $d001; the content is bottom
        ; aligned in the frame, so it ends at obY + anchor - 1 and starts orbBlankT rows in.
        ; Display y is raster - 50, and a char row is eight of those.
        ldy obV,x
        ; Display y is raster - 50, and a char row is eight of those. SUBTRACT THE 50 FIRST: obY
        ; is 150 - anchor + h, so obY + anchor is 150 + h, which passes 255 once h > 105 and wraps.
        ; The bottom row then came out tiny, the stamp ran from a bogus row, and black cells landed
        ; on the white CEILING -- long vertical bars, with the de-seam stripping seams nowhere near
        ; the orb. One overflow, both symptoms.
        lda obY,x
        sec
        sbc #$32
        sta ohSv                ; display y of the sprite frame's top row
        clc
        adc orbBlankT,y         ; ... plus the blank rows above the content
        lsr
        lsr
        lsr
        sta osRow
        lda ohSv
        clc
        adc orbAnchT,y
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
        ; walk the spans, exactly as the whole-orb test does
        lda #$00
        sta ohL
        sta ohBX
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
        sty ohSv
        lda runByteT,y
        tay
        lda (omptr),y
        ldy ohSv
        and runBitT,y
        beq oSAdv               ; this run does not occlude this orb
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
        bcs oSDn
        jmp oSLoop
; ---- the UPPER half of a tall entity: take the priority bit, stamp nothing ----
; Its rows are already covered -- orbBlankT is negative for a two-sprite variant so the LOWER
; slot's span reaches over both -- but $d01b is per SPRITE, and without its bit set this half
; draws in front of the very occluders the lower half just laid down.
; The lower half is always the slot BEFORE it: orbOne does stx onvL / inc onv / ldx onv, and
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
oSDn:   rts

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
        beq oSCR1
        bcs oSCDn
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
        stx osGlyW
        jmp oSC1g
oSC1r:  ldx ohFst
        stx osGly
        ldx ohFstW
        stx osGlyW
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
        stx osGlyW
        jsr oSPut
oSCCol: iny
        cpy ohRun
        beq oSCLst
        lda #$00                ; interior: every column covered
        ldx #$f0
        stx osGly
        stx osGlyW
        jsr oSPut
        jmp oSCCol
oSCLst: lda ohLstM
        ldx ohLst
        stx osGly
        ldx ohLstW
        stx osGlyW
        jsr oSPut
oSCNx:  inc ohSv
        jmp oSCRow
; oSWall: carry set if the cell at (osPtr),y is FULLY wall -- SOLID, or a seam variant, which is
; SOLID with a panel line on it. Ramp and step cells are part ceiling or part floor and cannot be
; stamped, because the occluder splits are horizontal only.
oSWall: lda (osPtr),y
        cmp #$01
        beq oSWyes
        cmp #$dd
        bcc oSWno
        cmp #$ed
        bcs oSWno
oSWyes: sec
        rts
oSWno:  clc
        rts

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
        cmp #$dd
        bcc oSDNx
        cmp #$ed
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
        cmp #$dd       ;   solid run are ceiling or edge cells and must not become SOLID
        bcc oSDRN
        cmp #$ed
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
        sta $d027,x
        cpx #$00
        bne osLp
        jsr idolLat             ; THIS frame's finding, not last frame's. Latched at the start
                                ;   of the projection it lagged a whole rendered frame: on the
                                ;   frame you set the idol down, carry is already 0 and the world
                                ;   entity is already placed, but idolOn still said "not in view"
                                ;   -- so the palette fell back to the level's greys for 50ms
                                ;   between the button and the idol appearing.
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

; ---- orbOne: project orb oidx, and if it lands on screen take the next sprite slot ----

; ---- orbProj: cell delta (oix, oiy) -> ohgt and |column offset from screen centre| ----
; Split out of orbOne so the drop-target chooser can ask "where would an entity standing in
; THAT cell appear" without a second copy of the projection. C clear on return means nowhere
; on screen at all: behind the camera, close enough to be inside us, or past 255 columns off
; centre. oaS carries the side. Nothing here touches oidx, which is why it splits cleanly.
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
        lda oax
        ldx ocos
        lda oixS
        eor ocosS
        ldy oax
        jsr oTerm
        lda orL
        sta fwdL
        lda orH
        sta fwdH
        lda oiyS
        eor osinS
        ldx osin
        ldy oay
        jsr oTerm
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
        ldx ocos
        ldy oay
        jsr oTerm
        lda orL
        sta rgtL
        lda orH
        sta rgtH
        lda oixS
        eor osinS
        ldx osin
        ldy oax
        jsr oTerm
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
ivDn:   lda #$0b                ; h = 22528/forward = iv * 11/512, the same 88/d the walls use
        sta mq
        lda ivL
        jsr mul8
        lda plo
        sta o0
        lda phi
        sta o1
        lda #$00
        sta o2
        lda #$0b
        sta mq
        lda ivH
        jsr mul8
        clc
        lda o1
        adc plo
        sta o1
        lda o2
        adc phi
        sta o2
        lsr o2
        ror o1
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
orbOne: ldx oidx
        sec                     ; Ix, Iy = orb cell - player cell, -15..15
        lda orbXCT,x
        sbc px+1
        sta oix
        sec
        lda orbYCT,x
        sbc py+1
        sta oiy
        jsr orbProj             ; -> ohgt, ocoff, oaS. Everything below needs the entity,
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
        ldy oidx                ; TALL entities have their own rungs, appended to the same
        lda orbTallT,y          ;   variant list so every table indexed by ovar still works
        beq omVarO

        lda angVarT,x
        bne omVarS              ; always taken: the angel's rungs never start at 0
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
        bcc oxDn
        jmp orbNo               ; b past 255: far off the right, and b<<1 would wrap
oxNeg:  lda orbXOffT,x          ; centre is ocol columns LEFT of column 0, so b = offset - ocol
        sec
        sbc ocol
        bcc orbNo               ; sprite's left edge is left of X = 0, which no sprite can be
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
        lda orbYBaseT,x
        clc
        adc ohgt
        bcs orbYCp              ; the sum passed 255, so it is far below the screen
        pha                     ; ---- centre a TALL entity on its ideal height ----
        ldy oidx                ;   the offset is half the rung's quantisation error, signed,
        lda orbTallT,y          ;   precomputed per ohgt -- see angMidT in the build. X holds
        beq oMidSk              ;   ovar for the cap below, so only A and Y are touched here.
        ldy ohgt
        pla
        clc
        adc angMidT,y
        jmp oMidNo
oMidSk: pla
oMidNo:
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
        lda ocolN               ; the bounding box, in logical columns
        bne opBLn
        lda ocol
        sec
        sbc o2
        bcs opBL1
        lda #$00
        jmp opBL2               ; straddles column 0 from the right: left edge is 0
opBLn:  lda o2r                 ; centre is LEFT of 0 by ocol columns, so the box ends at
        sec                     ;   o2 - ocol. If that borrows, the whole orb is off screen.
        sbc ocol
        bcc opBLx
        beq opBLx
        lda #$00                ; part of it shows: the box starts at column 0
        jmp opBL2
opBLx:  jmp orbNo
opBL1:  cmp #$a0        ; A box that STARTS past the last column is an orb entirely off
        bcc opBL2               ; the right edge. This used to clamp to 159, which turned "not on
        jmp orbNo               ; screen" into "one column at the screen edge" -- so the orb took a
                                ; sprite slot it could never be seen in, and occStamp then painted
                                ; occluders into cell 39 for it. Invisible in the shipping build,
                                ; since black on black wall looks the same, but real work for an
                                ; orb that is not there. Clamping was added to stop the box
                                ; running off the end of fgCell and seamT; rejecting does that
                                ; too, and is what the geometry actually says.
opBL2:  sta ocl2
        lsr
        lsr
        sta ocl
        lda ocolN
        bne opBRn
        lda ocol
        clc
        adc o2r
        bcc opBR1
        lda #159
        jmp opBR1
opBRn:  lda o2r                 ; the centre is ocol columns LEFT of 0, so the box ends at
        sec                     ;   o2 - ocol. The check above already proved o2 > ocol, so this
        sbc ocol                ;   cannot borrow and the result is well under 160.
opBR1:  cmp #160
        bcc opBR2
        lda #159
opBR2:  sta ocmax
        lsr
        lsr
        cmp ocl
        bcs opBR3
        lda ocl
opBR3:  sta ocr
        ; ---- is this orb WHOLLY occluded? ----
        ; The rule is the user's: a wall facing AWAY from an orb always occludes it, and a wall
        ; facing the orb never can. Which side of each face's plane every orb lies on is a
        ; build-time constant (orbOccT, one bit per orb x run), so the only runtime question is
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
occWalk:lda ocanO       ; ENTRY POINT for a probe: with ovProbe set, ohHide rts's instead of
        bpl opDone              ;   jumping to orbNo, so a caller can ask the question and act on
                                ;   the answer itself. build time: nothing reachable from this
                                ;   cell can occlude it, and
                                ; that is true of 56% of candidates -- they never enter the walk

        ldy oidx
        lda orbOccLoT,y
        sta omptr
        lda orbOccHiT,y
        sta omptr+1
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
        lda runByteT,y
        tay
        lda (omptr),y           ; the mask byte holding this run's bit
        ldy ohRun
        and runBitT,y
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
        ldy ovar
        lda orbPtrT,y
        ldy oidx                ; the ENTITY, not the variant
        clc                     ; 0 for an orb; the idol's bitmap base for the idol. The two
        adc orbArtT,y           ;   ladders are geometrically identical, so the idol borrows the
                                ;   orb's rung wholesale and swaps only the picture.
        sta obP,x               ; buffered, not written: see osFlush
        lda orbArtT,y           ; non-zero only for the idol, and we reach here only when
        beq obNotI              ;   this entity actually TOOK a slot -- so this means "the idol
        sta idolWk              ;   is on screen", not "the level has one"
obNotI:
        lda orbColT2,y
        sta obC,x               ; the ONE thing that can differ per orb: bit pair 10
        ldy ovar
        lda orbExpT,y
        beq oNoX
        lda omBit
        ora omXX
        sta omXX
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
oNoM:   ; remember what this orb asked for; the second pass compares it against what the
        ; scene actually ended up painting, which is the only place a conflict can show up
        ldx onv
        lda oidx
        sta obIX,x
        lda ovar
        sta obV,x
        lda ocanO
        sta obOcc,x
        lda ocl
        sta obCL,x
        lda ocr
        sta obCR,x
        lda ocl2
        sta obL,x               ; the tight column range, for the stamp pass
        lda ocmax
        sta obR,x
        lda ocl2
        and #$03
        tay
        lda bbLT,y              ; the columns of the leftmost cell inside the box
        sta obBL,x
        lda ocmax
        and #$03
        tay
        lda bbRT,y              ; ... and of the rightmost
        sta obBR,x
        stx onvL                ; X is still the lower slot: the upper half copies its record
        inc onv
        ; ---- a TALL entity takes a second slot for its upper half ----
        ; Same X, same colour, same expand; the other bitmap; and one sprite height above -- 21
        ; rows, or 42 once vmag has doubled it, which is exactly what orbAnchT already holds.
        ldy ovar
        lda orbPtrU,y
        beq orbYes              ; one-sprite entity: nothing more to do
        sta otmp
        ldx onv
        cpx onvH
        bcs orbYes              ; no slot left: show the lower half rather than nothing
        sec
        lda o3
        sbc orbAnchT,y
        bcc orbYes              ; upper half is off the top of the screen
        sta obY,x
        lda otmp
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
        lda omBit
        ora omXX
        sta omXX
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
oNoM2:  ldy onvL                ; the upper half inherits the lower's record, EXCEPT its identity
        lda #$fe                ; ---- and it must NOT stamp ----
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
        lda obV,y
        sta obV,x
        lda obOcc,y
        sta obOcc,x
        lda obCL,y
        sta obCL,x
        lda obCR,y
        sta obCR,x
        lda obL,y
        sta obL,x
        lda obR,y
        sta obR,x
        lda obBL,y
        sta obBL,x
        lda obBR,y
        sta obBR,x
        inc onv
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
hoLp:   lda hoI                 ;   biggest thing here
        asl                     ; x32: this entity's LOS bitmap -- ceil(MAPN/8) per entity, and
        asl
        asl
        asl
        asl
        sta hoOf                ;   NOT a cell multiply: it stays 32 whatever MAPW is
        lda pcell
        and #$07
        tay
        lda pcell
        lsr
        lsr
        lsr
        clc
        adc hoOf
        tax
        lda holeSeeT,x
        and orbBitT,y
        beq hoNx                ; not visible from this cell: ~25 cycles against a ~2,400 projection
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
        lda px+1                ;   spot, which is worse than one that does nothing. Three of the
        cmp orbXCT,x            ;   hub's four are marked and unwired, so this is now reachable
        bne fcNx                ;   in a chain build for the first time.
        lda py+1
        cmp orbYCT,x
        beq fcHit
fcNx:   inx
        iny
        cpy nExitT
        bcc fcLp
        bcs fcNo                ; always taken: none of them is under us
fcHit:  sty hlv                 ; the one we are dropping through
        tya
        asl                     ; x32, the LOS stride -- see hlvOf
        asl
        asl
        asl
        asl
        sta hlvOf
        lda #$00                ; sprites away: they belong to the level being left. Clear the
        sta omEn                ;   BUFFER, not $d015 -- osFlush runs after the buffer flip,
        sta omXX                ;   which is past where the fall path rejoins the loop, so it
        sta omYY                ;   would put the register straight back and leave an orb
        sta omPri               ;   hanging in space while the world scrolled away behind it
        sta omX8
        ; ---- THE LEVEL CHANGES HERE, BEFORE ANYTHING READS THE DESTINATION ----
        ; Order is load-bearing twice over. lvlSwap must run before lvlStart reads the destination's
        ; start point, or the player is placed at the spot they just left (it named landXT until
        ; 2026-09-22); and objInit must run after it, because it rebuilds
        ; blkT from the NEW mapT and puts each entity back at the new level's build-time cell.
        ; Both are done here rather than on landing so the destination render -- which bgPh starts
        ; a slice per frame from the next frame on -- sees the new geometry from its first slice.
        ldx hlv                 ; WHICH exit did fallChk match? Its destination is lvlNxtT's
        lda lvlNxtT,x           ;   entry for that exit -- one byte per exit since the hub got
                                ;   four of them. $ff means nowhere --
        cmp #$ff                ;   a standalone or NOFALL build, whose hole is scenery
        beq lvlEnd
        pha                     ; wallsBack does not preserve A, and the stack is cheaper here
        jsr wallsBack           ; leave with every wall in place: the exchange keeps what it takes
        pla
        ldx #$01   ; WHICH SLOT is it in now? Not a build-time constant: the
lvFind: cmp lvlAtT,x            ;   swap is an exchange, so the level being left takes the slot
        beq lvGot               ;   the level being entered came out of, and the layout permutes
        dex                     ;   every fall. nextLevel only ever names a level in the chain,
        bpl lvFind              ;   so this always finds one.
        bmi lvlEnd              ; belt and braces: a level not in any slot is a dead hole, never
lvGot:  ldy lvlMeT              ;   a swap against X = $ff
        sta lvlMeT              ; A is the level being entered: it is the live one now...
        tya
        sta lvlAtT,x            ;   ...and the one being left lands in the slot it came out of
        txa
        jsr lvlSwap
        jsr mkRuns              ; the run tables no longer travel with the level -- they are
                                ;   derived from the mapT the swap just brought in. Must come
                                ;   AFTER the swap and BEFORE anything renders the new room.
        jsr objInit             ; ...and this rebuilds blkT from that same mapT, which is why
                                ;   blkT need not travel either.

        jsr lvlLo               ; what you see THROUGH the hole is already the new level
lvlEnd:
        jsr lvlStart            ; go to the arriving level's OFFICIAL START now, and let the
                                ;   main loop render it next frame -- fallLand snapshots it and
                                ;   starts the drop; the player does not move again for the rest
                                ;   of the fall. This used to be landXT/landYT/landAT, a SECOND
                                ;   per-level spot that happened to agree with the start until
                                ;   the starts became a table -- at which point falling (and 'L',
                                ;   which fakes a fall) still went to the old cell while boot and
                                ;   death went to the new one. One place a level begins, however
                                ;   you got there.
        ; Every exit is live now (see fallChk), so there is nothing to alternate: hlv is only a
        ; record of which one the last drop used, and the level being arrived at has not used one.
        lda #$00
        sta hlv
        asl                     ; x32, the same LOS stride -- not a cell multiply
        asl
        asl
        asl
        asl
        sta hlvOf
        ldx #$ff                ; the drop starts on THIS frame -- mfIn falls into fallStep and
        stx fFrm                ;   draws frame 0, so stepping in and falling are the same frame
        ldx #25
        stx phA
        stx phB
        lda #$01
        sta fallSt
        sta bgPh                ; and start rendering the destination room IN THE BACKGROUND,
                                ;   a slice per frame in the slack the fall leaves
        jsr fallInv             ; THE RENDER COMING IN A FEW FRAMES DRAWS INTO A BUFFER A PREVIOUS
                                ; FALL SCRIBBLED. Without this renderSym skips every column whose
                                ; cached runs still look unchanged and leaves the LAST fall's
                                ; destination sitting there -- the second drop showed the first
                                ; one's room sliding up, and only corrected at fstEnd, which is
                                ; the next place the cache is cleared. Bug 1 in [[iray-fall]],
                                ; for the third time: anything that writes the screen behind
                                ; renderSym has to invalidate before renderSym runs again.
        lda baseHi              ; freeze what is on screen NOW -- baseHi is the buffer being
        cmp #$e0  ;   drawn into, so the displayed one is the other
        bne fcGB
        lda #$e4
        bne fcGrab              ; always taken: a page number, never zero
fcGB:   lda #$e0
fcGrab: jsr fallSnap
        jsr fallTail            ; ...and the five rows below the screen it cannot see

fcNo:   rts


; fallStep: advance the physics and draw one frame. Called instead of the whole renderer.
fallStep:
        ldx fFrm                ; BOTH phases run the same arc table now, so both advance the same
        inx                     ;   counter. Up here because everything below is a branch target
        ldy fallSt              ;   -- putting it lower hid it behind a branch once already.
        cpy #$03                ; the DROP hands over ARC_OVERLAP frames early; its last frames
        beq fstLim3             ;   are drawn on top of the landing's first ones
        cpx #16
        jmp fstLimD
fstLim3:cpx #20
fstLimD:bcc fstFOk
        dex                     ; ---- this phase has run its course ----
        stx fFrm
        lda fallSt
        cmp #$03
        beq fstEnd
        lda #$03                ; drop over -- straight into the landing. The destination room
        sta fallSt              ;   was rendered and snapshotted before the drop began, so there
        jsr lvlLook             ; the arriving level's inks and wall mark
                                ; ^ the arriving level's LOOK lands here, not at the swap:
                                ;   the swap happens the moment you step into the hole (the
                                ;   destination render needs the new geometry from its first
                                ;   slice), but the drop is still showing the room being LEFT,
                                ;   so repainting its ceiling and stamping its walls there was
                                ;   recolouring the wrong room for the whole descent.
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
        lda #$00        ; DROP: A above the horizon, B below it, A again for the rim
        sta pCh0
        sta pCh2
        lda #$02
        sta pCh1
        lda #$00
        sta arcSkip             ; the drop lets arcPrep place the arc's split
        beq fsDone              ; always taken
fsLand: ldx fFrm                ; LANDING: B,A,B -- the rim is at the TOP now, in the mirrored
        lda #$02        ;   polarity, then the new room's ceiling half, then its floor
        sta pCh0                ;   half. The room is held clear of the arc (see ARC_GAP) so no
        sta pCh2                ;   scanline ever has to serve both.
        lda #$00
        sta pCh1
        lda arcSp2T,x           ; white rising to replace the black, over the NEW room sliding up
        sta pSplit              ;   into place. The rim is SOLID above and
        lda #$ff                ;   BLANK below, which is the mirror of what the dictionary
        sta arcInv              ;   holds, so park the split ABOVE the display instead and let
                                ;   charset B supply the other polarity. Every column flips on
                                ;   the same frame, so one raster line does the whole job.
        cpx #4     ; still inside the overlap window? then the screen is the two
        bcs fsL2                ;   RIMS and nothing else: A for the departing one at the top,
        lda #$00        ;   B for the arriving one below it. The new room is held off
        sta pCh0                ;   screen this early, so two regions is all it takes.
        lda #$02
        sta pCh1
        sta pCh2
        lda arcOvSpT,x
        sta pSplit
        lda #246
        sta pSplit2
        jmp fsL3
fsL2:   jsr lvlHi               ; past the overlap window: the DEPARTING rim has left the
                                ;   screen, so the top of the frame can finally take the new
                                ;   level's ground colour too. Until here it must not -- that is
                                ;   what made the upper level go dark while it was still visible.
                lda arcSp2bT,x          ; and the room's own horizon, where B resumes
        sta pSplit2
fsL3:
        lda #$ff
        sta arcSkip             ; arcPrep must not overwrite pSplit2 on the landing
fsDone: lda #$13
        sta pd11
        jmp fallDraw
fstEnd: lda #$96
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
        lda pa                  ; force orbMove to reproject: it early-outs on a still frame,
        eor #$80                ;   and the player has not moved since the landing began, so
        sta opa                 ;   the sprites we just cleared would never come back
        lda #$00                ; landing over: hand the screen back to the renderer
        sta fallSt
        sta renderCnt           ; and start the fps window fresh. It counts ticks per 16 RENDERED
        lda frameCnt            ;   frames, and the fall advances the clock without rendering any
        sta lastFrame           ;   -- so every drop poisoned the next reading. That is what the
        lda frameCnt+1          ;   apparent frame-rate hit was: the counter, not the renderer.
        sta lastFrame+1
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
        jsr bgStep              ; a slice of the destination render first -- it draws into the
                                ;   back buffer and copies itself out, and the fall frame below
                                ;   then paints over the whole thing
        lda fFrm                ; which arc frame to draw. The overlap re-points this at a DROP
        sta arcIx               ;   frame further on, so it has to be reset every frame -- losing
                                ;   this line left arcPrep reading whatever the tail draw set
                                ;   last, and the arc appeared late and in the wrong place.
        jsr arcPrep             ; the crown, the depth, and where the arc bottoms out
        jsr fdWarp              ; the room, slid up. No shear -- see fRowT.

        ldx #$00       ; drop: floor above, hole below
        ldy #$f0
        lda arcInv
        beq fdPol
        ldx #$f0      ; landing: the other way round, and charset B has already been
        ldy #$00       ;   selected to give the rim glyph the matching polarity
fdPol:  stx fdCol
        sty arcBlw              ; arcBand fills below its glyph with this
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
        lda arcBlw              ; ---- and the rows below the arc ----
        sta fdCol
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
        ; ---- the DEPARTING arc, drawn over the top of an arriving one ----
        ; Only for the first ARC_OVERLAP frames of the landing, and only ever above it: the two
        ; rims never share a row (see arcOvSpT). Its polarity is the drop's -- floor above, hole
        ; below -- so charset A, which is why pCh0 goes back to A through the window. No second
        ; routine: fill BLANK down to where the rim bottoms out, then let arcBand lay the glyph
        ; and run SOLID beneath it, which is exactly what it already does.
        lda arcInv
        beq fdTDn               ; drop frames have no tail to draw
        lda fFrm
        cmp #4
        bcs fdTDn
        clc
        adc #16
        sta arcIx
        lda #$00
        sta arcInv              ; drop tables, drop polarity
        jsr arcPrep
        lda #$00
        sta fdCol
        lda #$f0
        sta arcBlw
        lda #$00
        sta fdD
        lda baseHi
        sta fdD+1
        lda arcHi
        jsr fdFill              ; white from the top down to the rim's lowest row
        ldx arcHi
        lda mul40LoT,x
        sta fdD
        clc
        lda mul40HiT,x
        adc baseHi
        sta fdD+1
        jsr arcBand
        lda #$ff
        sta arcInv              ; put it back: the landing owns the rest of the phase
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
        lda mul40LoT,x
        clc
        adc #<$4900
        sta fdS
        lda mul40HiT,x
        adc #>$4900
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
fwSlo: lda mul40LoT,x
        clc
        adc #<$6200
        sta fdS
        lda mul40HiT,x
        adc #>$6200
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
fwDn:   rts

; ---- faceCell: the cell directly in front, to the nearest of eight ----
; pa is a full byte of turn, so +16 then >>5 rounds to the nearest octant instead of truncating
; toward the one you have just left. Eight rather than four because "the square most in front of
; you" means exactly that when you are facing a corner, and because the angels move in eight.
; ---- dpCand: the neighbouring cell one step along direction X, and its parts ----
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
        jsr dpCand
        ldx fcCell
        lda blkT,x
        bne dpNext              ; a wall, or something already standing there
        ldx odD
        lda dirXT,x
        sta oix
        lda dirYT,x
        sta oiy
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

; ---- orbKey: SPACE picks up and puts down, one action a press ----
; Row 7 bit 4. The joystick shares these lines, so read the port with no row selected first and
; force whatever the stick is holding back high -- otherwise FIRE reads as SPACE.
orbKey: lda #$ff
        sta $dc00
        lda $dc01
        eor #$ff
        sta okJoy
        lda #$7f
        sta $dc00
        lda $dc01
        ora okJoy
        eor #$ff
        and #$10
        sta okNew
        lda #$ff
        sta $dc00               ; leave the port neutral for the joystick read in readKeys
        lda okNew
        beq okUp
        lda okOld
        bne okDone              ; held, not a fresh press
        lda #$01
        sta okOld
        jmp orbUse
okUp:   lda #$00
        sta okOld
okDone: rts

; ---- objInit: every entity back to its starting cell ----
; A restart is a jmp to entry, and entity state lives in tables the game edits IN PLACE. blkT is
; rebuilt from mapT rather than kept as a second copy -- 256 bytes of table saved, and it can
; never drift out of step with the walls.
objInit:
        ldx #$00
oiBlk:  lda mapT,x              ; walls first
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
        sta orbSeenT,x
        lda orbY0T,x
        jsr mulW
        clc
        adc orbX0T,x
        tay
        lda #$02
        sta blkT,y              ; 2 = entity, not wall -- angStep and mvFree both rely on it
oiNext: txa
        pha                     ; orbOcc1 CLOBBERS X. Without this the dex/bpl below ran on
        jsr orbOcc1             ;   garbage and the loop scribbled 2s across blkT at random
        pla                     ;   cells -- which opened the doorway the caging orb was
        tax                     ;   supposed to block, and the angel walked straight out.
        dex
        bpl oiEnt
oiEntD: lda #$00
        sta carry
        sta marked
        sta entDty
        sta bfsPhase            ; NO FILL IN FLIGHT. Uninitialised this could read as phase 2,
                                ;   which drops bfsTick straight into the expand loop with a
                                ;   garbage bfsTail and scribbles past bfsQ.
        ldx #$06   ; the MAX: clearing a seat this level does not have is free
hlSCl:  sta hlSeat,x            ; nothing seated: a restart empties every socket
        dex
        bpl hlSCl
        lda #$ff                ; a cell the player can never be in, so the first frame always
        sta bfsDone             ;   starts a fill
        rts

; ---- orbOcc1: rebuild entity X's occluder mask from the cell it stands in NOW ----
; orbOccT answers "is this entity beyond that wall run's plane" -- the facing rule, and the only
; thing about occlusion that is precomputed. Every bit of it is a function of where the entity
; WAS at build time, so setting an orb down somewhere else, or an angel taking a step, makes it
; describe the old position: hidden behind walls it is now in front of, and stamped through ones
; it is behind.
;
; It is ALSO a function of the run table, and that is per-frame. Run ids are handed out by the
; subdivision in the order the runs come out of it, so they renumber whenever the view changes --
; the same id is a different wall a frame later. A mask built once at boot and refreshed only on
; an angel's step (once every two seconds) therefore spent every frame in between naming the
; wrong runs: an occluder that should have stamped did nothing, and one that should not have
; stamped hid the entity. That is the "missing blue block with the statue peeking through it".
; So orbOccAll below re-runs it for every entity every frame, from subFin where the table is
; final and before orbMove, which is the first thing to read the mask.
; The mask base is self-modified rather than indirect-indexed because the loop needs Y for the
; run id and X for the byte within the mask.
orbOcc1:
        lda orbOccLoT,x
        sta ooCl+1
        sta ooLd+1
        sta ooSt+1
        lda orbOccHiT,x
        sta ooCl+2
        sta ooLd+2
        sta ooSt+2
        lda orbXCT,x
        sta ooCX
        lda orbYCT,x
        sta ooCY
        lda #$00
        ldx #$07
ooCl:   sta $ffff,x
        dex
        bpl ooCl
        ldy #$01                ; run 0 is the "no run" sentinel and owns no bit
ooLp:   lda runFaceT,y
        pha                     ; PLA sets N from bit 7 and leaves C alone, so the sense survives
        and #$01                ;   the axis pick and the compare below
        beq ooAxX
        lda ooCY
        jmp ooCmp
ooAxX:  lda ooCX
ooCmp:  cmp runPlaneT,y         ; C set = cell >= plane
        pla
        bpl ooGE
        bcc ooSet               ; sense 1: the entity must be strictly nearer than the plane
        bcs ooNx                ; always taken
ooGE:   bcc ooNx
ooSet:  ldx runByteT,y
ooLd:   lda $ffff,x
        ora runBitT,y
ooSt:   sta $ffff,x
ooNx:   iny
        cpy #$39        ; NRUN, not this level's own count: the loops are shared
        bcc ooLp
        rts

; ---- orbOccAll: every entity's mask, rebuilt against THIS frame's run numbering ----
; Called from subFin, where the subdivision is done and the run table will not change again this
; frame. orbOcc1 clobbers X, so the loop counter lives in a byte rather than the register.
orbOccAll:
        ; The masks say whether an entity is beyond a wall face's PLANE -- no camera term at
        ; all -- so they only go stale when an entity moves or the run tables are re-patched.
        ; blkVer catches the first (angOne, okTake, okPlain all bump it); the viewing cell
        ; catches the second, since hazSet patches per RENDERING cell. On a map that splits
        ; nothing -- which is every map here -- neither changes most frames, and this was
        ; rebuilding byte-identical masks every single one.
        lda blkVer
        cmp occVer
        bne ooDirty
        lda cell0
        cmp occCell
        beq ooSkip
ooDirty:lda blkVer  ;   differences that mean nothing
        sta occVer
        lda cell0
        sta occCell
        lda nAllT               ; orbs AND hole-like entities -- the COUNT, so that none is
        beq ooAlD               ;   sayable; the index below cannot say it
        lda nAllM1T
ooAlp:  sta ooAI
        tax
        jsr orbOcc1
        lda ooAI
        sec
        sbc #$01
        bcs ooAlp               ; ...down to 0, then the borrow out of 0 ends it
ooAlD:
ooSkip:
        rts



; ---- sndTick: the detune tracks the nearest angel ----
; Chebyshev distance, because the angel moves on a king's graph -- diagonal and orthogonal steps
; are both one move, so that is what "one cell away" has to mean here too. It runs whether or not
; you are looking, which is the point: the sound is the channel that works when sight does not.
sndTick:
        lda #$0f
        sta sndD
        ldx #$00
stLp:   stx sndI
        lda orbTallT,x
        beq stNext              ; not an angel
        lda orbHidT,x
        bne stNext
        sec
        lda orbXCT,x
        sbc px+1
        bcs stPx
        eor #$ff                ; borrow: A is the two's complement, so negate for |dx|
        clc
        adc #$01
stPx:   sta sndT
        ldx sndI
        sec
        lda orbYCT,x
        sbc py+1
        bcs stPy
        eor #$ff
        clc
        adc #$01
stPy:   cmp sndT
        bcs stMax               ; Chebyshev: whichever axis is further
        lda sndT
stMax:  cmp sndD
        bcs stNext
        sta sndD                ; a new nearest
stNext: ldx sndI
        inx
        cpx nOrbT
        bcc stLp
        lda sndD
        cmp #$10
        bcc stOk
        lda #$0f                ; the table only runs to 15 cells; the map is 16 wide
stOk:   ldy marked              ; cornered: the angel is HIDDEN so the search above skipped it,
        beq stOk2               ;   but it is standing on top of you and the drone should say so
        lda #$00
stOk2:  tax                     ; everything comes straight off tables -- the climb, the detune
        lda sndV1L,x            ;   and the loudness pair are all folded in at build time, so
        sta $d400               ;   there is no arithmetic here at all
        lda sndV1H,x
        sta $d401
        lda sndV2L,x
        sta $d407
        lda sndV2H,x
        sta $d408
        lda sndVolT,x           ; VOLUME ONLY. Cutoff, resonance and pulse width are set once in
        ora #$10                ;   sndInit and left there -- with three things moving at once you
        sta sndLvl              ;   cannot tell which one you are hearing. Low-pass, as it began.
                                ; NOT written to $d418 here: sfxTick runs next and is the single
                                ;   writer, so the drone and an effect cannot fight over the
                                ;   master and step it against each other.
        rts

; ---- angStep: give every unobserved angel its share of the clock, and move the ones that are due
; The accumulator advances ONLY while the angel is unobserved, so looking at one stops its clock
; rather than just its feet -- look away and it takes a normal-length pause, not an instant step.
; Per angel, not global: two angels in different directions have to keep separate time, which is
; the whole squeeze. dtv is 60ths elapsed, capped at 32 by tickDelta, so the sum cannot carry.
angStep:
        ldx #$00
asLp:   stx amIdx
        lda orbTallT,x
        beq asNext              ; not an angel

        lda orbHidT,x
        bne asNext              ; not in the world
        lda orbSeenT,x
        beq asFree              ; unobserved: it moves, as it always has
        lda idolHd              ; seen -- but holding the IDOL a gaze no longer holds them,
        beq asNext              ;   and they come for you in plain sight
        bne asFree              ; always
        bne asNext              ; one visible pixel freezes it, and its clock with it
asFree:
        ; ---- how long until this angel's next step? It depends how far away it is. ----
        ; Y holds the answer rather than A because the accumulator has to be loaded after this and
        ; there is no cmp with a Y-indexed operand -- hence the one-byte parking spot.
        jsr angDst              ; A = BFS cells from the player; $ff if no fill has landed yet
        ldy angPerT             ; the near period, and the safe default
        cmp #$ff
        beq asPer               ;   no map yet -- do NOT let an unreachable angel run at the fast
        cmp angFarT             ;   rate just because $ff compares high
        bcc asPer
        ldy angPerFT            ; far off: close the gap at the shorter period
asPer:  sty asPCur
        ldx amIdx               ; angDst clobbered X
        lda angAccT,x
        clc
        adc dtv
        cmp asPCur              ; both periods are per LEVEL, swapped with the rest of the manifest
        bcc asKeep
        sbc asPCur              ; ---- CARRY the remainder, do not zero it ----
        pha                     ; Carry is set from the cmp, so this is A - period. Zeroing made
        jsr angOne              ; the effective period "period + whatever this frame overshot by",
        pla                     ; and that overshoot is one frame of ticks -- so the angel walked
                                ; SLOWER on a slower build, and faster down an empty corridor than
                                ; in a dense view. Carrying it makes the average period exact at
                                ; any frame rate, which is what the accumulator was for.
                                ; It also un-breaks the scripted walkthrough: TOURW's "wait until
                                ; the angel reaches (4,4)" is a CONDITION, so a drifting angel
                                ; clock landed that step on a different tick every time the frame
                                ; rate moved, and every step after it walked a different line.
                                ; (X is the entity; angOne preserves nothing, hence the pha/pla.)
asKeep: ldx amIdx
        sta angAccT,x
asNext: ldx amIdx
        inx
        cpx nOrbT
        bcc asLp
        rts

; ---- angOne: one grid step toward the player ----
; Greedy, not a path. A distance field would have to be rebuilt every time the player moves or an
; orb lands, and slow-and-inexorable is both cheaper and the better feeling. Diagonal first, then
; each axis alone, so a blocked diagonal still makes progress along a wall.
angOne: stx amIdx
        lda #$00
        sta amDX
        sta amDY
        lda px+1                ; dx = sign(player cell - angel cell), per axis
        cmp orbXCT,x
        beq anNoX
        lda #$01
        bcs anSetX
        lda #$ff
anSetX: sta amDX
anNoX:  lda py+1
        cmp orbYCT,x
        beq anNoY
        lda #$01
        bcs anSetY
        lda #$ff
anSetY: sta amDY
        ; ---- the precomputed shortest step, then the greedy list as a fallback ----
        ; pathT is exact for the WALLS, which never move. It cannot know about a dropped orb, so
        ; when anTry refuses the step the old greedy pair still gets its turn -- one wasted tick
        ; against an obstacle that is rare, transient and two seconds from being irrelevant.
anNoY:  jsr anPath
        cmp #$ff
        beq anDone              ; no descending neighbour: it is walled in, so it WAITS
        tax
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
        jsr anTry
        bcc anDone
anGo:   inc blkVer              ; the obstacle map changed: the fill has to be redone
        ldx amIdx
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
        lda #$01
        sta entDty
        sec                     ; did that land it beside the player? then they are MARKED.
        lda orbXCT,x            ;   Triggered by the ANGEL moving, never by adjacency itself --
        sbc px+1                ;   which is exactly why walking into one yourself is harmless.
        clc                     ;   and needs no "who moved last" bookkeeping at all.
        adc #$01
        sta anKx                ; 1 = same column; 0 or 2 = one cell to a side
        cmp #$03
        bcs anNoMk
        sec
        lda orbYCT,x
        sbc py+1
        clc
        adc #$01
        sta anKy
        cmp #$03
        bcs anNoMk
        ; ---- ON THE DIAGONAL, BOTH corner cells have to be clear ----
        ; "if it's at an angle but there's nothing at all between you, death. But if you're
        ; around a corner, it has to clear the corner." Orthogonally adjacent there is nothing
        ; between you by definition, so this only runs for the corner case. blkT is non-zero for
        ; a wall AND for an entity, so an orb parked in the gap blocks the reach too, which is
        ; the same answer for the same reason.
        lda anKx
        cmp #$01
        beq anReach             ; same column: orthogonal, nothing to clear
        lda anKy
        cmp #$01
        beq anReach             ; same row
        lda py+1                ; corner one: the angel's column, your row
        jsr mulW                ; mulW leaves X alone -- anGo relies on that too
        clc
        adc orbXCT,x
        tay
        lda blkT,y
        bne anNoMk
        lda orbYCT,x            ; corner two: your column, the angel's row
        jsr mulW
        clc
        adc px+1
        tay
        lda blkT,y
        bne anNoMk
anReach:
        ldx amIdx
        lda orbSeenT,x          ; were you LOOKING at it when it reached you?
        beq anHide              ; no: it hides and waits for the turn, as it always has
        lda #$1e              ; yes: it stays on screen, and the scene starts after this
        sta markSaw             ;   many 60ths -- half a second of "it has you" in which nothing
        lda #$00                ;   changes at all. markSaw is the countdown AND the flag.
        beq anMark              ; always
anHide: sta markSaw             ; A is 0 here, which is the "wait for the turn" case
        lda #$01                ; it stops rendering ENTIRELY from here. Nothing after this has
anMark: sta orbHidT,x           ;   to reason about where the sprite is or whether it shows.
        inx
        stx marked
        lda pa                  ; the heading it caught you at, for the turn trigger
        sta markPa
dckPnt: ldx #$07               ; A -> every sprite's own colour
dckLp:  sta obC,x
        dex
        bpl dckLp
        rts

anNoMk: ldx amIdx
        jmp orbOcc1             ; X is the entity index, and its mask describes the OLD cell
anDone: rts

; ---- anTry: is the step in amTX/amTY legal? C set and amCell/amX/amY filled if so ----
; Steps are ORTHOGONAL ONLY now, so exactly one of amTX/amTY is zero and the old diagonal
; squeeze test -- both brushed cells must be open -- has no case left to guard. It is gone with
; the diagonals; if they ever come back, it has to come back with them.
anTry:  lda amTX
        ora amTY
        beq anNo                ; standing in the player's cell already
        ldx amIdx
        clc
        lda orbXCT,x
        adc amTX
        cmp lvlDimT             ; RANGE CHECK, not a mask, against the live level's width. "and
        bcs anNo                ;   #$0f" wrapped x=16 round to 0 -- the border wall -- so an angel
        sta amX                 ;   walking east stopped dead at the end of the corridor. A mask
        clc                     ;   cannot work at a width that is not a power of two, and a step
        lda orbYCT,x            ;   off the map is refused by the solid border; this catches the wrap.
        adc amTY
        cmp lvlDimT+1
        bcs anNo
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
        tay
        lda blkT,y
        bne anNo                ; wall, orb or another angel
        ; ---- the leash. One bit per cell; see LEASH_AT for why the fill ignores it. ----
        lda amCell
        and #$07
        tax
        lda #$01                ; 1 << (cell & 7), by shifting rather than a table -- this runs
alMsk:  dex                     ;   once per attempted step, which is once every two seconds
        bmi alGot
        asl
        bne alMsk               ; always taken: bit 7 is the last one that can be set
alGot:  sta atMsk
        lda amIdx               ; THIS angel's row: entity slot x 32 -- the same x32 the LOS
        asl                     ;   bitmaps use, and for the same reason (ceil(256/8) = 32)
        asl
        asl
        asl
        asl
        sta atTmp
        lda amCell
        lsr
        lsr
        lsr
        clc
        adc atTmp
        tay
        lda angBlkT,y
        and atMsk
        bne anNo                ; leashed: this one does not go there
anSqOk:
        ; ---- how much of it would the player SEE standing there? ----
        ; It MAY step into view -- an angel easing round a corner and freezing mid-peek is the
        ; best thing it does -- but only into a cell something covers. Walking out into an open
        ; room breaks the one rule it has. The span walk counts columns shown against columns
        ; hidden, so this is a fraction, not a boolean, and the compare needs no division.
        ; Off screen and behind a wall are the same case, deliberately.
        ldx amIdx
        lda orbXCT,x            ; point it at the DESTINATION, occluder mask and all
        pha
        lda orbYCT,x
        pha
        lda orbSeenT,x          ; orbNo writes this on its early exits and the freeze test reads
        sta ovSvS               ;   it next frame -- a probe must not disturb it
        lda amX
        sta orbXCT,x
        lda amY
        sta orbYCT,x
        jsr orbOcc1
        ldx amIdx
        stx oidx
        lda #$00
        sta ovVis
        sta ovOcc
        lda #$01
        sta ovProbe
        lda #$80
        sta ocanO
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
        jsr orbOcc1
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

; ---- snTone / snRise: the DRONE climbs ----
; Not a note over the top: the drone itself is wound up, voices 1 and 2 together, keeping their
; absolute detune so the beating between them stays where it was while the pitch rises.
snTone: lda #<$03bc
        sta dieFqL
        lda #>$03bc
        sta dieFqH
        rts
snRise: lda dieFqH              ; at the top already? then hold there
        cmp #>$08e1
        bcs snRDn
        clc
        lda dieFqL
        adc #<$0013
        sta dieFqL
        lda dieFqH
        adc #>$0013
        sta dieFqH
snRDn:  lda dieFqL              ; voice 1
        sta $d400
        lda dieFqH
        sta $d401
        clc                     ; voice 2 rides DIE_DET above it, the same gap throughout
        lda dieFqL
        adc #<$0024
        sta $d407
        lda dieFqH
        adc #>$0024
        sta $d408
        rts
snOff:  lda #$00                ; the angel is centred and everything stops. A low note under
        sta $d404               ;   the noise hit could not be heard anyway, and silence at the
        sta $d40b               ;   moment it faces you is stronger than another sound.
        rts

; ---- snBoom / snCrash: the picture arrives, and the dark closes ----
; Same voice, one after the other and never overlapping, so they can simply overwrite each other.
snBoom: lda #$00                ; the drone stops dead as the picture lands -- the hit should
        sta $d404               ;   arrive into silence, not on top of a chord. Clearing the
        sta $d40b               ;   waveform cuts it at once; releasing would take ~750ms.
        lda #<$08f9
        sta $d40e
        lda #>$08f9
        sta $d40f
        jmp snHit
snHit:  jsr snKick              ; the tonal half of the drum, under the noise
        lda #$0a
        sta $d413
        lda #$00
        sta $d414
        lda #$80                ; gate LOW first: the envelope will not retrigger otherwise
        sta $d412
        lda #$81                ; noise + gate -- pitched, because the noise generator is clocked
        sta $d412               ;   by the frequency registers
        rts

; ---- dieFade: the room goes out, and nothing else happens ----
; No charset corruption any more: the swap is one frame, done once the screen is already black,
; so it is invisible. Reads the LIVE colour registers and walks each one step darker per tick,
; so slots that start dark reach black early and the whole palette converges.
dieFade:
        ; Their own turn, continued for them and eased out. dieDir only supplies the DIRECTION
        ; now: the rate comes from dieRotT so the sweep decelerates into stillness instead of
        ; stopping dead when the fade happens to end.
        ; TURN_RATE a tick, dtt ticks a frame: the identical loop readKeys runs, so the sweep is
        ; the same speed as turning by hand. dieRem is the whole units still owed, counted down on
        ; each carry out of the fraction, and the sweep simply stops when it reaches zero.
        lda dieRem              ; frames of turn left: a backstop, not the stopping rule
        beq dfTDn
        dec dieRem
        lda dieOff              ; columns off centre, UNSIGNED -- see the stash in orbOne
dfOP:   cmp #$18
        bcs dfMiss
        ; ---- TWO consecutive frames, not one ----
        ; The angel is a cell away, so on the frame it crosses into the frustum its forward
        ; distance is near zero and the projection is numerically unstable -- it can alias to a
        ; small offset. Measured: the lock fired on a reading of about 4 columns, applied a
        ; 315-fine correction, and the very next projection put the angel at -76. A single frame
        ; of a very close object entering view is not evidence; a value that survives two frames is.
        inc dieLk
        lda dieLk
        cmp #$02
        bcc dfSpin
        ; ---- inside the window: land it exactly ----
        ; One column is COL_FINE units of angle, so the residual converts straight into a
        ; correction and the angel locks dead centre in a single step. Turning until |off| is
        ; merely "small enough" cannot do that -- one frame of turn covers more than any sane
        ; tolerance, so it stopped short or sailed past depending on which frame it landed on.
        lda #$00
        sta dieRem
        jsr snOff               ; the drone CUTS here, before the correction branches --
                                ;   sitting it just above dfLD meant the positive side's
                                ;   "jmp dfLD" jumped clean over it, so only one turn direction
                                ;   ever silenced the drone.
        lda dieOff              ; already a magnitude, so there is no sign to strip
dfLP:   ldx #$4b
        stx mq
        jsr mul8                ; phi:plo = |off| * COL_FINE
        lda dieSgn              ; which side it sits on decides which way to correct
        bmi dfLN
        clc                     ; right of centre: turning up sweeps it left, onto the middle
        lda paF
        adc plo
        sta paF
        lda pa
        adc phi
        sta pa
        jmp dfLD
dfLN:   sec
        lda paF
        sbc plo
        sta paF
        lda pa
        sbc phi
        sta pa
dfLD:   lda #$00                ; the room has already gone; $d023 is untouched, so the seams
        jsr setGnd               ;   stay and the angel is not left alone in the black
        sta $d022
        lda frameCnt            ; re-date, so "elapsed >= DIE_OUT" fires DIE_PAUSE frames from now
        sec
        sbc #$78
        sta dieT0
        rts
dfMiss: lda #$00                ; outside the window: the run of good frames restarts
        sta dieLk
        jsr snRise              ; a step up the octave for every frame of turn
dfSpin: clc                     ; their OWN rate, continued: one signed 16-bit add a frame, no
        lda paF                 ;   ramp and no easing -- it turns exactly as they were turning
        adc dieDirF
        sta paF
        lda pa
        adc dieDir
        sta pa
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
        lda faceChrT+$0600,x
        sta $ce00,x
        lda faceChrT+$0700,x
        sta $cf00,x
        inx
        bne dsLp
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
        lda #$00                ; which edge the face arrives at. Increasing pa sweeps world
        ldx dieDir              ;   points LEFT, so a right turn brings new scenery in from the
        bpl dsMir               ;   RIGHT -- and the face has to match, or it slides in from the
        lda #$ff                ;   side you are turning AWAY from
dsMir:
        ; ---- and straight into the first picture ----
        ; The screen is black here (the fade just finished and the swap set every palette register
        ; to 0), so the copy is invisible and the cut is picOn's three stores on the next frame.
        lda #$00
        sta dieP
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
; dieN is how many pictures THIS death shows. It survives the restart because dieKey does
; "jmp entry", which reloads nothing and clears only what entry explicitly clears -- so dieN is
; EMITTED data, 0 off the disk, and counts up from there. dieP is which one is on screen.
dieShow:
        jsr snKTick             ; the kick keeps falling while the picture holds
        lda #$00                ; no sprites from here on. Clearing this at the SWAP did not hold:
        sta omEn                ;   the swap runs early in the frame and orbMove refills omEn
        sta $d015               ;   later in the same one, so the carried-orb slot came back.
        lda dieSt
        cmp #$03
        beq dshHld              ; HELD: black, waiting on RETURN, nothing left to time
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

        inc dieP
        lda dieP
        cmp dieN
        bcs dshEnd              ; shown them all
        jsr picPut              ; the next one into both buffers, still black
        jsr picOn               ; ...and cut to it
        lda frameCnt
        sta dieT0
        rts
dshEnd: lda #$03                ; nothing sounds here: the dark is silent
        sta dieSt
        lda dieN                ; the sequence ran its full length: start the next death over
        cmp #$01
        bcc dshHld
        lda #$00
        sta dieN
dshHld: rts


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
        pla
        tax

        lda #$03
        jsr sfxGo               ; the clink of it coming off the floor

        lda #$01
        sta entDty
        rts
orbPut: jsr dropPick            ; ---- put down ----
        ldx odCell
        cpx #$ff
        beq okDone              ; nowhere it could go: keep hold of it
        jsr hlAt                ; a socket? then it goes IN rather than on the floor
        cpy #$ff
        beq okPlain
        ldx carry               ; ...unless what you are holding is not an ORB. The idol is
        dex                     ;   luggage, not a key: it can be set down on a socket and picked
        lda orbArtT,x           ;   straight back up, and nothing seats. orbArtT is 0 exactly for
        bne okPlain             ;   the orb's own art, so "draws as an orb" IS "acts as a key".
        lda hlSeat,y
        bmi okDone              ; already used: bit 7 now means CONSUMED, and it is one-way
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
        lda #$01
        jsr sfxGo               ; ...and it is heard going in

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
        lda #$01
        sta entDty
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
        lda #$00
        sta orbHidT,x
        sta carry
        txa                     ; ...and gives them back when you set it down
        pha
        jsr idolLk
        pla
        tax
        lda #$01
        sta entDty              ; leaves X alone, and X is still the entity index orbOcc1 wants
        jmp orbOcc1             ; X is still the entity index. Its build-time occluder mask is
                                ;   about the cell it came from and is now wrong.

; ---- bgStep: one slice of the destination render, once per fall frame ----
bgStep: lda bgPh
        beq bgDn
        cmp #$03
        beq bgDn                ; finished: the room is waiting in fallBuf2
        cmp #$02
        beq bgDraw
        ; ---- casting ----
        lda #$ff
        sta bgOn                ; cap the subdivision: it returns when the budget runs out
        lda #40
        sta bgN
        lda #$00
        sta bgMore
        lda bgPh
        cmp #$04
        beq bgCont
        jsr rayAll              ; first slice: prepCells, pivot, the two edge rays, then subLp
        jmp bgCastD
bgCont: jsr rayCont             ; later slices: straight back into subLp, sp untouched
bgCastD:lda #$00
        sta bgOn
        lda bgMore
        beq bgCast2
        lda #$04                ; more on the stack
        sta bgPh
        rts
bgCast2:lda #$02                ; cast done -- draw the columns next
        sta bgPh
        lda #39
        sta bgCol
        jmp fallInv             ; renderSym must not trust a cache the fall has been scribbling
        ; ---- drawing ----
bgDraw: lda bgCol
        sta rsHi
        sec
        sbc #9
        bcs bgD1
        lda #$00
bgD1:   sta rsLo
        jsr renderSym
        jsr bgCopy              ; out to fallBuf2 before the fall frame paints over it
        lda rsLo
        beq bgFin
        sec
        sbc #$01
        sta bgCol
        rts
bgFin:  lda #$03
        sta bgPh
bgDn:   rts


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
        lda rampThi,x           ; the degenerate ends are BLANK and SOLID in the table now
        cmp #$01                ;   (see rampThi's build), and BLANK is already right here:
        bne abSet               ;   a cell the rim misses is floor in BOTH polarities. A cell it
        lda #$f0              ;   has passed is the HOLE though, not wall ink, so that one
abSet:  sta apCode              ;   answer has to be translated.
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
        lda hlFillT,y           ; an exit hole: black, and it is never anything else
        sta hlFill
        lda #$00
        beq hlSk                ; always taken
hlSsock:lda hlSeat,y            ; bit 7 = an orb is sitting in this one, low nibble its colour
        bmi hlSfull
        lda hlFillT,y           ; empty: grey3 inside a grey1 rim
        sta hlFill
        lda #$01
        bne hlSped              ; always taken
hlSfull:and #$0f
        tax                     ; seated: the ORB's own body colour fills it
        lda orbColT2,x
        sta hlFill
        lda #$02
        ; ---- and a PEDESTAL is a socket that stands up ----
        ; Kinds 1,2 are the socket's empty and seated; 3,4 are the pedestal's. Pedestals sit past
        ; the sockets in HOLELIKE, so ONE boundary byte tells them apart and +2 lands on the
        ; matching pedestal kind -- no per-entity kind table, and nothing to swap but nPedT.
hlSped: cpy nPedT
        bcc hlSk
        clc
        adc #$02
hlSk:   cmp hlKind
        beq hlSdn               ; already pointed the right way -- the usual case
        sta hlKind
        ; ---- point the six operands at this kind's ladder ----
        ; Three near-identical patch blocks were 175 bytes of code; this is a table of the five
        ; base addresses per kind and one run of stores. BOTH bytes of every operand, because
        ; the table sets are emitted next to each other and may straddle a page.
        tax
        ldy hlK5T,x             ; five entries a kind
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
hlSdn:  rts

; ---- holeTail: the hole's half of orbOne, entered with ohgt and ocol already computed ----
; Two sprites side by side, the left half and the right half of one ellipse, so the pair reads
; as a single shape up to 48 columns wide. No occlusion mask and no stamp: a hole is IN the
; floor, so the only thing that can hide it is a wall in front, which the $d01b bit handles.
holeTail:
        ; ---- FULLY OCCLUDED? ASK THE TEST THE ORBS AND THE ANGEL ALREADY USE ----
        ; holeSeeT is the only other occlusion a hole gets, and it is a per-CELL bitmap: nine eye
        ; points across the player's whole cell, ANY of which seeing the hole means it is drawn.
        ; Deliberately a superset -- it was added because orbs popped in and out along a corridor
        ; -- so a hole stays drawn from a spot in the cell with a wall squarely in front of it.
        ; The real test is the span walk in orbOne, and it works for any entity with an occluder
        ; mask; holes had none, which is the only reason they were excluded. They have one now.
        ; ONE COLUMN, the hole's centre. A hole is the wall's own colour, so partial occlusion
        ; needs no handling -- it melts into the wall. Only "wholly behind" must stop drawing.
        lda ocolN
        bne hlOcDn              ; centre is off the left edge; the column tests below decide
        lda ocol
        cmp #$a0
        bcs hlOcDn              ; ...or off the right
        sta ocl2
        sta ocmax               ; a one-column box: ovWide then measures just that column
        lda #$00
        sta ovVis
        sta ovOcc
        lda #$01
        sta ovProbe             ; probe: the walk returns instead of drawing or rejecting
        lda #$80
        sta ocanO               ; conservative, exactly as obLoop and the angel probe do
        jsr occWalk
        lda #$00
        sta ovProbe
        lda ovVis
        beq orbNo               ; no visible column: it is wholly behind a wall
hlOcDn: ldx ohgt                ; the rung, straight out of a page-aligned table. This was a
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
        cmp #72
        bcs orbNo               ; even the pair's right edge is off the screen
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
ohXPP:  cmp #160
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
        cmp #172
        bcs ohDone              ; column 160 or beyond: same
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
        ora omPri               ; behind foreground: a wall in front of the hole has to win, and
        sta omPri               ;   the floor it lies in is background, so it still draws there
        lda ohP
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
kSgn:   bmi kSgN
        lda #$00
        rts
kSgN:   lda #$ff
        rts

; oTerm: (Y * X) as a 16-bit product in orL/orH, negated if A is negative. Y is a cell
; difference magnitude (0..15) and X a trig magnitude, so this is a plain 8x8 -- the 16x8 the
; old orot did was only ever needed because the orb offset carried a fraction, and that
; fraction is now a per-frame constant instead.
oTerm:  stx mq
        sta tmp2
        tya
        jsr mul8
        lda tmp2
        bpl otD
        sec
        lda #$00
        sbc plo
        sta orL
        lda #$00
        sbc phi
        sta orH
        rts
otD:    lda plo
        sta orL
        lda phi
        sta orH
        rts

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
rowMulT: !byte 0,23,46,69,92,115,138,161,184,207,230,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0   ; from the MANIFEST: the live level's stride

; sideT / idT / colH are per-frame mutable arrays in scratch RAM at $c100+ (see equates)
dataEnd:                        ; guard: must clear both screen buffers AND the charset -- see the layout check in build-iray.mjs

; The charset is NOT in the image. It is shipped as its own compressed segment and decoded
; straight into $d000-$d7ff by the loader, with the port at $34 -- which is the one thing a KERNAL
; LOAD can never do, and the reason a low "source" copy existed here for as long as it did. See
; the ICHR file on the disk, which the boot loader lands at $c000 and copies under the hole.

; connected-wall-run id tables (indexed by cell id) live above the f-tables in free RAM

; charset B has NO source: cpChr derives it from A with an EOR #$07 on the row index. fontB is
; still built in JS -- charsetgen and the readout glyph checks compare against it -- but nothing
; is emitted, which is the point: it was a permutation of bytes already in the image.

; ================= orb tables =================
; These sit in the hole between the code and the first emitted table. Only what the projection
; and the whole-orb hide need: the painting pass's tables (fgCodeT, kMaskT, bbLT/bbRT, opbBaseT,
; popcT) are NOT here, because they addressed charset twins that no longer exist.
        ; One bit per cell per hole-like entity: can it be seen from anywhere in that cell?
        ; 32 bytes each, sized to the LARGEST resident level -- a level with sockets has more
        ; hole-like entities than one without. It lived in the fall's block, then in the bfs
        ; block, and outgrew both, and then sat at $9180 where the gap above the $9100 jsr target
        ; is exactly 128 bytes -- which is the ONLY reason NHOLE was capped at four.
        ; It is butted up under ORB_SMALL (the hole-ladder block) now and sized to NHOLE, so a
        ; chain that needs more rows takes them out of the code headroom below and the headroom
        ; report says so, instead of the build dying on an origin that moves backward.
        * = $3c58
        ; ---- the pedestal's ladder: the same disc, EXTRUDED ----
        ; Down here rather than beside the socket's because the ORB_SMALL block ends 47 bytes
        ; short of hudX at $3f5f with these in it. Butted under holeSeeT, so the two together
        ; are one run taken off the top of the code headroom and the report prices them as one.
        ; Same five tables again, so hlSet's patch run does not know or care that this kind
        ; stands up. One sprite a rung (see makePedLadder), so pedPtrT is the whole pointer --
        ; there is no right half to increment onto.
        ; A build with NO pedestals anywhere still emits these as one zero byte: hlSrcL names
        ; the labels unconditionally, and an empty !byte assembles as "bad number: $".
pedPtrT: !byte 95,96,97,98,99,100,101,102,103,104,105,106,107,108,109
pedXOffT: !byte 12,12,12,12,12,12,6,6,6,6,6,6,6,6,6
pedYBaseT: !byte 126,128,131,133,136,138,139,141,143,144,145,146,147,147,149
pedFlagT: !byte 13,13,13,13,5,5,1,1,1,1,1,1,1,1,1
pedHT: !byte 86,79,72,65,57,50,43,36,29,25,22,18,14,11,7   ; DESCENDING, scanned by hlRungP
; Here rather than with the other two rung finders at $48c3, which has five bytes left and
; runs into fallSnapD at $4900 the moment it does not. Its only table is the one above it.
; The pedestal scans like the socket: 15 rungs does not earn a 256-byte page, and the
; hole already spent the one that was going.
hlRungP:txa
        ldy #$00
hrpL:   cmp pedHT,y
        bcs hrpHit
        iny
        cpy #$0f
        bcc hrpL
        lda #$ff
        rts
hrpHit: tya
        rts
holeSeeT: !byte 0,0,0,0,0,0,0,0,0,0,48,0,0,8,0,0,4,0,0,2,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        ; Which seats hold an orb: bit 7 set, low nibble the orb's colour. RUNTIME state, not a
        ; manifest table -- hlSCl clears NHOLE of them on every restart. Up here with holeSeeT
        ; because it is NHOLE-sized too, and raising NHOLE to seven put the $5f00 block six bytes
        ; over; one run of NHOLE-sized things in one place is what makes that cost legible.
hlSeat: !fill 7, 0

        * = $3d9c
; ---- hole ladder: a disc on the floor, not a sphere (see HOLE_LADDER in the build) ----
; holePtrT is the LEFT half's sprite pointer; the right half is always the next slot, so a
; two-sprite rung needs one pointer and an increment.
holePtrT: !byte 64,66,66,66,69,72,75,78,80,82,84,86,88,90,91,92,93,94,94,94
holeXOffT: !byte 24,36,36,36,36,36,36,24,24,24,24,24,24,12,12,6,6,6,6,6
holeYBaseT: !byte 121,124,127,130,133,135,137,139,141,143,143,145,147,147,148,149,149,150,150,150
holeFlagT: !byte 6,7,7,7,15,15,15,14,14,6,6,6,6,5,5,1,1,1,1,1
        ; ---- the socket's ladder: same tables, half the radius ----
        ; No 256-byte h -> rung table for this one. The hole earned its page at 35 rungs; a
        ; socket has 10, so hlRungS scans and the page stays spent on something else.
sockPtrT: !byte 88,88,88,90,91,92,93,94,94,94
sockXOffT: !byte 24,24,24,12,12,6,6,6,6,6
sockYBaseT: !byte 138,140,143,145,146,148,148,149,150,150
sockFlagT: !byte 14,14,14,13,13,9,9,9,9,9
sockHT: !byte 107,94,80,67,54,40,34,27,20,13   ; DESCENDING h thresholds, scanned by hlRungS
        ; ---- and an orb seated in one ----

        ; orbColLT / orbColRT moved out to the free run below HAZ_BASE -- see them there.
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
cellFillT: !byte 0,15,15,8,7,8,15,0,0,1,12,14,15,15,15,0,3,15,15,15,15,15,14,0,15,0,0,12,15,15,14,7,7,14,0,1,0,15,3,0,15,1,0,0,14,12,14,14,0,0,12,0,15,7,15,0,15,15,0,15,15,15,7,3,15,7,3,15,15,3,15,3,0,0,7,15,0,12,15,3,0,7,15,0,0,0,15,15,15,12,15,1,15,8,7,15,12,15,3,1,15,14,1,3,8,12,0,15,7,3,1,1,7,15,8,0,15,1,15,0,8,8,12,14,0,7,15,15,12,15,8,15,15,15,8,14,15,1,1,15,15,14,0,15,12,15,3,0,0,7,3,7,7,15,14,15,12,15,0,14,12,15,12,8,0,1,0,8,8,1,12,15,8,15,15,3,14,3,0,8,12,1,1,0,15,3,0,15,12,7,12,15,15,15,0,0,12,14,15,14,12,10,4,10,2,2,10,10,4,10,10,10,8,8,8,8,8,10,0,8,10,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,8,12,14,1,3,7,0,0,0,0,0,0
; the columns a split leaves uncovered: kMskT by the START offset, mMskT by the END offset
; Run id -> which byte of an orb's occluder mask holds its bit, and which bit. Two small tables
; instead of three lsrs and an and per column: this runs once per logical column under every orb
; that might be occluded, which is the only part of the test that is not O(1).
; The plane test itself, so a MOVED entity can rebuild its own mask. runFaceT encodes the two
; things the comparison needs: bit 0 picks the axis (0 = x, 1 = y) and bit 7 the sense (0 = the
; entity's cell must be >= the plane, 1 = strictly less). Entities are cell-centred, so the
; build's "o.x > k" on a .5 coordinate is exactly "cellX >= k" on an integer one.
        ; Straight from the per-level manifest, not a second copy of the same expression: these
        ; are NRUN long rather than this level's own run count, and the swap exchanges them
        ; against a shadow sized the same way. Two sources for one table is how they drift.
; runPlaneT / runFaceT are DERIVED at boot now (mkRuns runs from entry, see there) and live in
; bank 3 as equates: level 4's 100 runs made them 202 bytes, which the ORB_SMALL block did not
; have (2026-09-18). Nothing emits them; mkRuns + hazSpFix write every byte that is read.
orbOccLoT: !byte 0,8,16,24,32,40,48,56,64,72,80
orbOccHiT: !byte 112,112,112,112,112,112,112,112,112,112,112
; The last entry in each is the HOLE's cell, not an orb -- orbOne projects it with the same
; arithmetic and branches to holeTail on the index. HOLEX/HOLEY move it.
orbXCT: !byte 6,20,7,19,15,0,0,0,0,0,0      ; from the MANIFEST, so its length cannot
orbYCT: !byte 5,5,5,5,5,0,0,0,0,0,0      ;   disagree with what the swap moves
orbColT2: !byte 12,12,12,12   ; from the MANIFEST and SWAPPED: a level with
                                ;   more entities than this one indexes past this one's count
; bbLT / bbRT: a bounding box starts and ends part-way through a cell, so these give the columns
; of that first and last cell which lie inside it. Bit 3 is the leftmost column. These are about
; the BOUNDING BOX, not the charset -- which is why they come back while fgCodeT and kMaskT,
; which named charset twins, do not.
popcT:  !byte 0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4
opbBaseT: !byte 0,12,24,36,48,60,72,84

        ; ---- hudX: the per-frame raster count, the LEVEL line, and the 'L' key ----
        ; Out here in the slack above ORB_SMALL because the main block has about fifteen bytes
        ; and this is a hundred and thirty. jsr-entered from mloop; nothing falls into it.
        ; The address is a knob because the block BELOW it grows with NOCC -- five resident
        ; levels with pedestals put twelve more bytes of per-entity table under it. hudX is 130
        ; bytes and $4000 is absCosT, so there is room to slide it to about $3f80 and no
        ; further; past that it wants a different home. Both ends are guarded by the
        ; assembler's own "moves backward".
        * = $3f72
        ; ---- how many raster interrupts the frame just drawn took ----
        ; dtv straight out of tickDelta: frameCnt - lastMv, so it is the duration of the frame in
        ; front of you, not an average. Six of these is about 10 fps.
        ; It is the CLAMPED value, deliberately: tickDelta floors it at 1 and caps it at 32, and
        ; neither bound is reachable while the game is running. 0 needs two renders inside one
        ; raster tick, and this engine does 8-22 fps against a 50Hz IRQ; the cap bites only on the
        ; BOOT frame, whose delta is the whole disk load, and after a cut scene. Those frames read
        ; $20 instead of the truth, and they are the frames whose duration means nothing anyway.
hudX:
        lda #$02
        jsr setRow
        ldy #$00
        lda dtv
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda dtv
        and #$0f
        jsr ddPut
        ; ---- LEVEL n ----
        ; RAYCNT=1 draws two hex digits on this row too and will sit on the "LE". It is opt-in
        ; and this is not, so the diagnostic wins on the build that asks for it.
        lda #$03
        jsr setRow
        ldy #$00
        ldx #$00
hxLv:   lda hxLvT,x
        jsr ddPut               ; ddPut adds GLYPH0, so the table holds glyph INDICES
        inx
        cpx #$05
        bne hxLv
        lda #$00                ; BLANK is char code 0, not a readout glyph: it goes direct
        sta (ppPtr),y
        iny
        lda lvlMeT
        jsr ddPut
        ; ---- 'L': go to the next level ----
        ; Row $df bit 2, which nothing else in the build reads.
        ; It does NOT call the level change: it stands the player on the live exit cell and lets
        ; fallChk find them there, so the skip runs the REAL transition -- fallStep, wallsBack,
        ; the slot lookup, lvlSwap, mkRuns, objInit -- rather than a second copy that could drift
        ; from the one play uses. Same trick FALLNOW uses to test the chain headlessly.
        ; JOYSTICK 1 SHARES $dc01 WITH THE KEYBOARD COLUMNS, and joy-1 LEFT pulls bit 2 -- the
        ; very bit 'L' sits on. Read the port with NO row selected first: whatever is low then is
        ; the stick, and it is forced back high before any key is believed. palKeys learned this
        ; by cycling the walls every time the stick went right.
        lda #$ff
        sta $dc00
        lda $dc01
        eor #$ff
        sta hxJoy               ; 1 where a joystick line is active
        lda #$df
        sta $dc00
        lda $dc01
        ora hxJoy
        eor #$ff
        and #$04                ; bit 2 = 'L'
        tax
        beq hxDn                ; not pressed
        cpx hxOld
        beq hxDn                ; still down from last frame: one level a press, not one a frame
        lda nExitT              ; a level with no exit has nowhere to skip to
        beq hxDn
        lda hlv                 ; the live exit's entity index, the arithmetic fallChk uses
        clc
        adc nOrbT
        tay
        lda orbXCT,y
        sta px+1
        lda orbYCT,y
        sta py+1
hxDn:   stx hxOld
        lda #$ff
        sta $dc00               ; leave the port neutral for the joystick read in readKeys
        rts
hxOld:  !byte 0                 ; 'L' last frame, for the edge test
hxJoy:  !byte 0
hxLvT:  !byte 18,14,19,14,18   ; L E V E L as glyph indices -- 14 is the hex digit E
        * = $4000  ; VIC bank 0 is full -- these live above it
absCosT: !byte 255,255,255,255,255,254,253,252,251,250,248,247,245,243,241,239,237,234,231,229,226,223,220,216
        !byte 213,209,206,202,198,194,190,185,181,177,172,167,162,157,152,147,142,137,132,126,121,115,109,104
        !byte 98,92,86,80,74,68,62,56,50,44,38,31,25,19,13,6,0,6,13,19,25,31,38,44
        !byte 50,56,62,68,74,80,86,92,98,104,109,115,121,126,132,137,142,147,152,157,162,167,172,177
        !byte 181,185,190,194,198,202,206,209,213,216,220,223,226,229,231,234,237,239,241,243,245,247,248,250
        !byte 251,252,253,254,255,255,255,255,255,255,255,255,255,254,253,252,251,250,248,247,245,243,241,239
        !byte 237,234,231,229,226,223,220,216,213,209,206,202,198,194,190,185,181,177,172,167,162,157,152,147
        !byte 142,137,132,126,121,115,109,104,98,92,86,80,74,68,62,56,50,44,38,31,25,19,13,6
        !byte 0,6,13,19,25,31,38,44,50,56,62,68,74,80,86,92,98,104,109,115,121,126,132,137
        !byte 142,147,152,157,162,167,172,177,181,185,190,194,198,202,206,209,213,216,220,223,226,229,231,234
        !byte 237,239,241,243,245,247,248,250,251,252,253,254,255,255,255,255
absSinT: !byte 0,6,13,19,25,31,38,44,50,56,62,68,74,80,86,92,98,104,109,115,121,126,132,137
        !byte 142,147,152,157,162,167,172,177,181,185,190,194,198,202,206,209,213,216,220,223,226,229,231,234
        !byte 237,239,241,243,245,247,248,250,251,252,253,254,255,255,255,255,255,255,255,255,255,254,253,252
        !byte 251,250,248,247,245,243,241,239,237,234,231,229,226,223,220,216,213,209,206,202,198,194,190,185
        !byte 181,177,172,167,162,157,152,147,142,137,132,126,121,115,109,104,98,92,86,80,74,68,62,56
        !byte 50,44,38,31,25,19,13,6,0,6,13,19,25,31,38,44,50,56,62,68,74,80,86,92
        !byte 98,104,109,115,121,126,132,137,142,147,152,157,162,167,172,177,181,185,190,194,198,202,206,209
        !byte 213,216,220,223,226,229,231,234,237,239,241,243,245,247,248,250,251,252,253,254,255,255,255,255
        !byte 255,255,255,255,255,254,253,252,251,250,248,247,245,243,241,239,237,234,231,229,226,223,220,216
        !byte 213,209,206,202,198,194,190,185,181,177,172,167,162,157,152,147,142,137,132,126,121,115,109,104
        !byte 98,92,86,80,74,68,62,56,50,44,38,31,25,19,13,6
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
clampT: !byte 3,4,5,6,7,8,9,10,11,12,13,14,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2

clmp16: !byte 48,64,80,96,112,128,144,160,176,192,208,224,240,240,240,240,240,240,240,240,240,240,240,240
        !byte 240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240
        !byte 240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240
        !byte 240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240
        !byte 240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240,240
        !byte 240,240,240,240,240,240,240,240,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,32
qIdxAT: !byte 0,0,0,0,1,2,3,4,5,6,7,8,8,8,8,8
qIdxMT: !byte 0,0,0,0,0,0,1,1,1,1,2,2,2,2,2,2
qIdxBT: !byte 0,0,0,0,1,2,3,4,5,6,7,8,8,8,8,8
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
        * = $48c3
; X = h. A = the rung, or $ff for "past the smallest".
hlRungH:lda holeVarT,x
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
; A seated orb steps exactly as a standing one, so it reads the SAME table the orb does.
hlRungE:lda orbVarT,x
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


        * = $4d00
hTabT:  !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,254,238,222,209,196,185,176,167,159,152,145,139,133,128,124,119,115,111,108
        !byte 104,101,98,95,93,90,88,86,83,81,79,78,76,74,73,71,70,68,67,65,64,63,62,61,60,59,58,57,56,55,54,53
        !byte 52,51,51,50,49,48,48,47,46,46,45,44,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,37,36,36,36,35
        !byte 35,34,34,34,33,33,33,32,32,32,31,31,31,31,30,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26
        !byte 26,26,25,25,25,24,24,24,23,23,23,22,22,22,21,21,21,21,20,20,20,20,19,19,19,19,19,18,18,18,18,18
        !byte 17,17,17,17,17,17,16,16,16,16,16,16,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13
        !byte 13,13,12,12,12,11,11,11,10,10,10,10,9,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7
        !byte 7,6,6,6,6,6,5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,253,235,219,206,194,183,173,165,157,150,143,137,132,127,122,118,114,110,106
        !byte 103,100,97,94,91,89,87,84,82,80,78,77,75,73,72,70,69,67,66,65,63,62,61,60,59,58,57,56,55,54,53,52
        !byte 51,51,50,49,48,48,47,46,46,45,44,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35,35
        !byte 34,34,34,33,33,33,32,32,32,31,31,31,30,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,27,26,26,26
        !byte 26,25,25,25,24,24,24,23,23,23,22,22,22,21,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,18,17
        !byte 17,17,17,17,16,16,16,16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13
        !byte 13,12,12,12,11,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,7
        !byte 6,6,6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,250,232,216,203,191,180,171,162,155,148,141,135,130,125,120,116,112,108,105
        !byte 101,98,96,93,90,88,85,83,81,79,77,76,74,72,71,69,68,66,65,64,62,61,60,59,58,57,56,55,54,53,52,52
        !byte 51,50,49,48,48,47,46,46,45,44,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,36,36,36,35,35,35,34
        !byte 34,33,33,33,32,32,32,32,31,31,31,30,30,30,30,29,29,29,28,28,28,28,28,27,27,27,27,26,26,26,26,26
        !byte 25,25,25,24,24,24,23,23,23,22,22,22,21,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17
        !byte 17,17,17,16,16,16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13
        !byte 13,12,12,12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6
        !byte 6,6,6,6,6,5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,248,230,215,201,189,179,169,161,153,146,140,134,129,124,119,115,111,107,104
        !byte 101,98,95,92,89,87,85,83,80,78,77,75,73,72,70,68,67,66,64,63,62,61,60,59,57,56,55,55,54,53,52,51
        !byte 50,50,49,48,47,47,46,45,45,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35,35,34,34
        !byte 34,33,33,33,32,32,32,31,31,31,30,30,30,30,29,29,29,28,28,28,28,28,27,27,27,27,26,26,26,26,26,25
        !byte 25,25,24,24,24,23,23,23,22,22,22,21,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17
        !byte 17,17,16,16,16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13
        !byte 13,12,12,11,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6
        !byte 6,6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,244,227,212,198,187,176,167,159,151,144,138,132,127,122,118,113,110,106,102
        !byte 99,96,93,91,88,86,84,81,79,77,76,74,72,71,69,68,66,65,64,62,61,60,59,58,57,56,55,54,53,52,51,50
        !byte 50,49,48,47,47,46,45,45,44,44,43,42,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35,35,34,34,33
        !byte 33,33,32,32,32,31,31,31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,26,25,25,25
        !byte 25,24,24,24,23,23,23,22,22,22,21,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17
        !byte 17,16,16,16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13
        !byte 12,12,12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,7,6,6
        !byte 6,6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,242,225,210,197,185,175,166,157,150,143,137,131,126,121,117,112,109,105,102
        !byte 98,95,93,90,87,85,83,81,79,77,75,73,72,70,68,67,66,64,63,62,61,59,58,57,56,55,54,53,52,52,51,50
        !byte 49,48,48,47,46,46,45,44,44,43,43,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35,35,34,34,33,33
        !byte 33,32,32,32,31,31,31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,26,25,25,25,25
        !byte 25,24,24,23,23,23,22,22,22,22,21,21,21,20,20,20,20,19,19,19,19,19,18,18,18,18,17,17,17,17,17,17
        !byte 16,16,16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12
        !byte 12,12,12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6
        !byte 6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,239,222,207,194,183,173,164,155,148,141,135,129,124,120,115,111,107,104,100
        !byte 97,94,91,89,86,84,82,80,78,76,74,72,71,69,68,66,65,63,62,61,60,59,58,56,55,55,54,53,52,51,50,49
        !byte 49,48,47,46,46,45,44,44,43,43,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35,35,34,34,33,33,33
        !byte 32,32,32,31,31,31,30,30,30,30,29,29,29,29,28,28,28,27,27,27,27,27,26,26,26,26,25,25,25,25,25,24
        !byte 24,24,24,23,23,23,22,22,22,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,17,16
        !byte 16,16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12
        !byte 12,12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6
        !byte 6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,237,220,205,193,181,171,162,154,147,140,134,128,123,118,114,110,106,103,99
        !byte 96,93,91,88,86,83,81,79,77,75,73,72,70,68,67,66,64,63,62,60,59,58,57,56,55,54,53,52,51,51,50,49
        !byte 48,47,47,46,45,45,44,43,43,42,42,41,41,40,39,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32
        !byte 32,32,31,31,31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24
        !byte 24,24,23,23,23,22,22,22,21,21,21,21,20,20,20,19,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16
        !byte 16,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12
        !byte 12,12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6
        !byte 6,6,6,6,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,253,234,217,203,190,179,169,160,152,145,138,132,127,122,117,113,109,105,101,98
        !byte 95,92,89,87,84,82,80,78,76,74,72,71,69,68,66,65,63,62,61,60,58,57,56,55,54,53,52,52,51,50,49,48
        !byte 48,47,46,45,45,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32,32
        !byte 32,31,31,31,30,30,30,30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,26,25,25,25,25,25,24,24,24
        !byte 24,23,23,23,22,22,22,21,21,21,21,20,20,20,19,19,19,19,19,18,18,18,18,17,17,17,17,17,17,16,16,16
        !byte 16,16,16,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12
        !byte 12,12,11,11,11,10,10,10,10,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6,6
        !byte 6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,251,232,215,201,189,177,168,159,151,144,137,131,126,121,116,112,108,104,101,97
        !byte 94,91,89,86,84,82,79,77,75,74,72,70,69,67,66,64,63,62,60,59,58,57,56,55,54,53,52,51,50,49,49,48
        !byte 47,46,46,45,44,44,43,42,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,35,34,34,34,33,33,32,32,32
        !byte 31,31,31,30,30,30,30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,26,25,25,25,25,25,24,24,24,24
        !byte 24,23,23,23,22,22,22,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16,16,16
        !byte 16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12
        !byte 12,11,11,11,10,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6,6
        !byte 6,6,6,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,248,229,213,199,186,175,165,157,149,142,135,130,124,119,115,110,106,103,99,96
        !byte 93,90,88,85,83,81,78,76,74,73,71,69,68,66,65,63,62,61,60,58,57,56,55,54,53,52,51,50,50,49,48,47
        !byte 47,46,45,44,44,43,43,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32,32,32,31
        !byte 31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24,24,23
        !byte 23,23,23,22,22,22,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16,16,16,16
        !byte 16,15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12
        !byte 12,11,11,11,10,10,10,10,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6,6,6
        !byte 6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,246,227,211,197,185,174,164,155,148,141,134,128,123,118,114,109,106,102,98,95
        !byte 92,90,87,84,82,80,78,76,74,72,70,69,67,66,64,63,62,60,59,58,57,56,55,54,53,52,51,50,49,48,48,47
        !byte 46,45,45,44,43,43,42,42,41,40,40,39,39,38,38,37,37,36,36,36,35,35,34,34,34,33,33,32,32,32,31,31
        !byte 31,30,30,30,30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24,24,23,23
        !byte 23,23,22,22,22,21,21,21,21,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16,16,16,16,16
        !byte 15,15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12
        !byte 12,11,11,11,10,10,10,9,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,6,6,6,6,6,6,6
        !byte 6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,243,225,208,195,182,172,162,154,146,139,133,127,122,117,112,108,104,101,97,94
        !byte 91,88,86,83,81,79,77,75,73,71,69,68,66,65,63,62,61,60,58,57,56,55,54,53,52,51,50,49,49,48,47,46
        !byte 46,45,44,44,43,42,42,41,41,40,39,39,38,38,37,37,36,36,36,35,35,34,34,34,33,33,32,32,32,31,31,31
        !byte 30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24,24,23,23,23
        !byte 23,22,22,22,21,21,21,21,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16,16,16,16,16,15
        !byte 15,15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,11
        !byte 11,11,11,10,10,10,10,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6
        !byte 6,6,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,241,223,207,193,181,170,161,152,145,138,132,126,121,116,111,107,103,100,97,93
        !byte 90,88,85,83,80,78,76,74,72,71,69,67,66,64,63,62,60,59,58,57,56,55,54,53,52,51,50,49,48,47,47,46
        !byte 45,45,44,43,43,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,34,34,34,33,33,33,32,32,31,31,31,30
        !byte 30,30,30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24,24,23,23,23,23
        !byte 23,22,22,22,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,17,17,17,17,17,16,16,16,16,16,16,15,15
        !byte 15,15,15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,11,11
        !byte 11,11,11,10,10,10,10,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6
        !byte 6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,238,220,204,191,179,168,159,151,143,136,130,124,119,114,110,106,102,99,95,92
        !byte 89,87,84,82,79,77,75,73,72,70,68,67,65,64,62,61,60,58,57,56,55,54,53,52,51,50,49,48,48,47,46,45
        !byte 45,44,43,43,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,34,34,34,33,33,33,32,32,31,31,31,30,30
        !byte 30,29,29,29,29,28,28,28,28,27,27,27,26,26,26,26,26,25,25,25,25,24,24,24,24,24,23,23,23,23,23,23
        !byte 22,22,22,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,17,17,17,17,17,16,16,16,16,16,16,15,15,15
        !byte 15,15,15,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,11,11,11
        !byte 11,11,11,10,10,10,9,9,9,9,9,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6
        !byte 6,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,237,218,203,189,177,167,158,149,142,135,129,123,118,114,109,105,101,98,95,92
        !byte 89,86,83,81,79,77,75,73,71,69,68,66,65,63,62,60,59,58,57,56,55,54,53,52,51,50,49,48,47,47,46,45
        !byte 44,44,43,42,42,41,41,40,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32,32,32,31,31,31,30,30
        !byte 30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,24,24,24,24,24,23,23,23,23,23,23,22
        !byte 22,22,22,21,21,21,20,20,20,19,19,19,19,18,18,18,18,18,17,17,17,17,17,16,16,16,16,16,15,15,15,15
        !byte 15,15,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,11,11,11,11
        !byte 11,11,10,10,10,10,9,9,9,9,8,8,8,8,8,8,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6
        !byte 6,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3
        * = $5d00
orbVarT: !byte 21,21,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,17,17,17,17,16,16,16,16,15,15,15,15,14,14,14,14,13,13,13,13,12,12,12,12,12,11,11,11,10,10,10,9,9,9,9,8,8,8,8,7,7,7,7,6,6,6,6,5,5,5,5,4,4,4,4,3,3,3,3,2,2,2,2,2,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        ; ---- the angel's distance maps, its pathing code, and its queue ----
        ; NOT at $4900 or $6200: those are the fall's screen snapshots, which are runtime-only
        ; and so invisible to the hole report until it was told about them. Putting the path
        ; table on one and these maps on the other is what turned the drop into garbage.
        ; The two maps are ping-ponged -- bfsTick builds the WORK one a few cells a frame while
        ; anPath reads the LIVE one -- and both are page-aligned because a whole cell byte
        ; indexes them. bfsD0 lives off at $ae00 because this gap is not big enough for both.
        * = $5e00
bfsD1:  !fill 253, 255
        * = $5f00
; ---- anPath: A = the first step from the angel's cell toward the player, or $ff ----
; Reads the LIVE distance map: find the neighbour whose distance is exactly one less than ours.
; BFS guarantees one exists for every reachable cell, so the only $ff cases are a map that has
; not been filled yet and the angel standing on the player, which anTry already prevents.
; The two LIVE reads are self-modified rather than indirect -- the map base is one of two pages
; and only changes when a fill completes, so paying for it per read would be silly.
; ---- angDst: how many steps the player is from entity X, off the live BFS map ----
; The same field anPath walks, read one cell deep. $ff means the fill has not reached this cell --
; either no fill has completed yet, or the angel is walled off -- and callers must treat that as
; "unknown", not as "very far", or a marooned angel would run at the fast rate forever.
angDst: lda orbYCT,x
        jsr mulW
        clc
        adc orbXCT,x
        tax
apLdC:  lda bfsD0,x             ; operand PATCHED to the live map, alongside apLdA/apLdB
        rts
asPCur: !byte 0                 ; the period angStep settled on for the angel it is looking at
angPerFT: !byte $78  ; 60ths between steps when the player is far off...
angFarT: !byte $06      ; ...where "far" starts. Per level, both swapped with angPerT.

anPath: ldx amIdx
        lda orbYCT,x
        jsr mulW
        clc
        adc orbXCT,x
        sta apC
        tax
apLdA:  lda bfsD0,x             ; operand PATCHED to the live map
        cmp #$ff
        beq anPNo               ; no fill has completed yet
        sec
        sbc #$01
        bcc anPNo               ; distance 0: standing on the player
        sta apD
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
        lda bfsPhase
        bne bfsWork
        ; Idle: is the live map still good? It has to be for the right PLAYER CELL and for the
        ; current arrangement of obstacles -- now that orbs block a path, picking one up or
        ; setting one down changes the answer just as much as walking does.
        lda bfsWant
        cmp bfsDone
        bne bfsGo
        lda blkVer
        cmp bfsBVD
        beq bfsRts
bfsGo:  lda bfsWant
        sta bfsFor
        lda blkVer
        sta bfsBVF              ; remember what this fill is for, not what is current when it ends
        lda #$00
        sta bfsCl
        lda #$01
        sta bfsPhase
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
        lsr
        bne bfsE1
        lda #$01                ; never zero: a fast frame must still make progress
bfsE1:  cmp #$09
        bcc bfsE2
        lda #$08                ; and never a burst -- a long stall must not dump the whole queue
bfsE2:  sta bfsN
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
        lda blkT,x
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
        cmp #$ff
        beq bfsRts              ; no distance yet: keep filling
        ldx bfsEnI
bfsEnN: dex
        bpl bfsEnL
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
        lda apLdA+2             ; live <-> work, by swapping the patched high bytes
        pha
        lda bfsClS+2
        sta apLdA+2
        sta apLdB+2
        sta apLdC+2             ; angDst reads the same map as anPath, so it swaps with it
        pla
        sta bfsClS+2
        sta bfsSd+2
        sta bfsLdC+2
        sta bfsLdN+2
        sta bfsStN+2
        sta bfsSdQ+2            ; bfsSeed reads the WORK map too, so it swaps with the rest
        sta bfsLdE+2            ; the early-out reads the WORK map, so it swaps with the rest
        rts

        ; the four orthogonal steps, in one order everywhere: 0 = +x, 1 = -x, 2 = +y, 3 = -y
bfsDCT: !byte 1,255,23,233      ; ...as a CELL delta (manifest: the live level's width)
lvlDimT: !byte 23,11,233,34,10   ; W, H, -W, W+H, H-1: the live level's shape, for every
                                ;   stride the code used to carry as an immediate
pathDXT: !byte 1,255,0,0        ; ...and as the amTX/amTY pair anTry wants
pathDYT: !byte 0,0,1,255
        ; Per hole-like entity: the FILL ink. 0 is a pit, grey3 an empty socket, an orb's colour
        ; a seated one -- the whole difference, one byte. See holeTail.
hlFillT: !byte 0,0,0,0,0,0,0
        ; Runtime, one per hole-like entity: bit 7 = an orb is seated here, low nibble its body
        ; colour. Emitted rather than equated so a fresh load starts it clear.
; Out of the main block (which the landing's arc-to-room fill overran by 24 bytes, 2026-09-17)
; into the hole under holeVarT: entered by jsr only, nothing falls in, and "* = $6100 moves
; backward" is the guard if this block grows into it.
; bgCopy: columns rsLo..rsHi of the back buffer, into the same columns of fallBuf2.
bgCopy: lda #$00
        sta fdS
        sta fdD
        lda baseHi
        sta fdS+1
        lda #$49
        sta fdD+1
        ldx #25
bgcRow: ldy rsLo
bgcB:   lda (fdS),y
        sta (fdD),y
        cpy rsHi
        beq bgcAdv
        iny
        jmp bgcB
bgcAdv: clc
        lda fdS
        adc #40
        sta fdS
        bcc bgcS1
        inc fdS+1
bgcS1:  clc
        lda fdD
        adc #40
        sta fdD
        bcc bgcS2
        inc fdD+1
bgcS2:  dex
        bne bgcRow
        rts
        * = $6100
; Page-aligned because it is indexed by a whole byte of h. See holeVarT in the build.
holeVarT: !byte 255,255,255,255,255,255,255,19,19,19,18,18,18,17,17,17,17,16,16,16,15,15,15,15,15,15,15,14,14,14,14,14,14,14,13,13,13,13,13,13,12,12,12,12,12,12,12,11,11,11,11,11,11,11,10,10,10,10,10,10,9,9,9,9,9,9,9,8,8,8,8,8,8,8,7,7,7,7,7,7,6,6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        ; ---- CPU-only tables, lifted clear of VIC bank 0 ----
        ; None of this is ever fetched by the VIC, so none of it belongs in the 16K the
        ; VIC can see. Moving it out frees bank 0 for sprites, and gives every 256-entry
        ; table its own page for free -- an "lda table,x" that crosses a page costs an
        ; extra cycle, and these are indexed by a full byte.
        * = $6600          ; the fall's animation data, out of the image's own segment
arcYT: !byte 255,248,232,216,200,184,168,152,136,120,104,91,80,69,57,46,34,23,11,0     ;   which has no slack left above ORB_SMALL at $3300
arcET: !byte 20,20,20,20,20,20,20,20,20,20,20,17,12,7,3,254,250,245,241,236
arcYT2: !byte 200,189,177,166,154,143,131,120,109,96,80,64,48,32,16,0,0,0,0,0    ; the landing's mirrored schedule
arcET2: !byte 20,15,11,6,2,253,249,244,239,236,236,236,236,236,236,236,236,236,236,236
arcD: !byte 255,227,202,178,156,136,118,101,85,71,59,47,37,28,21,14,9,5,2,1,0,1,2,5,9,14,21,28,37,47,59,71,85,101,118,136,156,178,202,227,255
arcTrT: !byte 0,7,23,39,55,71,87,103,119,135,151,164,175,186,198,209,221,232,244,255
arcSpT: !byte 150,143,127,111,95,79,63,51,51,51,51,51,51,51,51,51,51,51,51,51
arcSp2T: !byte 246,246,242,226,210,194,186,178,162,154,138,122,106,90,74,58,58,58,58,58
arcSp2bT: !byte 246,246,246,246,246,246,246,246,246,246,230,214,198,182,166,150,150,150,150,150
arcTopT: !byte 25,25,25,25,25,23,21,19,17,15,13,11,10,8,7,5,3,1,0,0
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
blkT: !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1,0,0,0,0,0,1,0,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1,0,1,1,0,0,1,0,1,1,1,0,0,0,0,2,2,0,0,0,0,0,0,1,0,1,1,0,2,2,0,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1,0,1,1,0,0,1,0,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1,0,0,0,0,0,1,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,0,0,1,1,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
; fallDraw indexes these by whole rows of offset, 0..25, to place its two block pointers.
mul40LoT: !byte 0,40,80,120,160,200,240,24,64,104,144,184,224,8,48,88,128,168,208,248,32,72,112,152,192,232,16,56,96,136,176
mul40HiT: !byte 0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4,4
; the per-VARIANT tables live out here: the angel's rungs doubled their length and pushed the
; image segment through holeSeeT at $3240
orbPtrT: !byte 160,161,162,163,164,165,166,167,168,169,170,160,162,164,166,168,170,171,172,173,174,175,176,178,180,182,184,186,188,176,178,180,182,184,186,188,190,191,192,193,194,195
orbPtrU: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,177,179,181,183,185,187,189,177,179,181,183,185,187,189,0,0,0,0,0,0
orbTallT: !byte 0,0,1,1
orbArtT: !byte $00,$00,$00,$00   ; bitmap offset per entity; 0 = the orb's art
orbHidT: !byte 0,0,0,0
orbHid0T: !byte 0,0,0,0   ; the build's hidden flags, for objInit
orbX0T: !byte 6,20,7,19   ; where objInit puts them back on a restart
orbY0T: !byte 5,5,5,5
; Did this entity take a sprite slot last frame -- which is exactly "is any pixel of it on
; screen", the observation test the angels freeze on. Sized like orbXCT so the HOLE's index,
; which shares oidx, lands somewhere harmless rather than past the end.
orbSeenT: !byte 0,0,0,0,0,0,0,0,0,0,0
angAccT: !byte 0,0,0,0   ; 60ths banked toward this angel's next step
orbExpT: !byte 1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0
orbXOffT: !byte 1,0,1,0,1,0,1,0,1,0,1,6,6,6,6,6,6,6,6,6,6,6,1,1,1,1,1,1,1,6,6,6,6,6,6,6,6,6,6,6,6,6
orbYBaseT: !byte 108,108,108,108,108,108,108,108,108,108,108,129,129,129,129,129,129,129,129,129,129,129,108,108,108,108,108,108,108,129,129,129,129,129,129,129,129,129,129,129,129,129
orbYCapT: !byte 238,236,234,232,230,228,226,224,222,220,218,238,236,234,232,230,228,226,224,222,220,218,212,212,212,212,212,212,212,233,233,233,233,233,233,233,233,233,233,233,233,233
orbBlankT: !byte 0,2,4,6,8,10,12,14,16,18,20,0,2,4,6,8,10,12,14,16,18,20,-42,-36,-30,-24,-18,-12,-6,-21,-18,-15,-12,-9,-6,-3,0,3,6,9,12,15
orbAnchT: !byte 42,42,42,42,42,42,42,42,42,42,42,21,21,21,21,21,21,21,21,21,21,21,42,42,42,42,42,42,42,21,21,21,21,21,21,21,21,21,21,21,21,21

orbHgtT: !byte 42,42,42,42,42,42,42,42,42,42,42,21,21,21,21,21,21,21,21,21,21,21,42,42,42,42,42,42,42,21,21,21,21,21,21,21,21,21,21,21,21,21
angVarT: !byte 41,41,41,41,41,41,41,41,41,40,40,40,40,39,39,39,39,38,38,38,37,37,37,37,36,36,36,35,35,35,35,34,34,34,33,33,33,33,32,32,32,32,31,31,31,30,30,30,30,29,29,29,29,29,28,28,28,28,28,28,28,27,27,27,27,27,27,27,26,26,26,26,26,26,26,25,25,25,25,25,25,25,25,24,24,24,24,24,24,24,23,23,23,23,23,23,23,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22
arcOvSpT: !byte 170,154,146,130
        ; ---- which ladder each kind uses: rung finder, yBase, ptr, flag, xOff ----
        ; 0 = the exit hole, 1 = an empty socket, 2 = an orb seated in one. hlSet indexes this
        ; instead of carrying three copies of the same six stores.
; Five kinds now: exit, socket empty, socket seated, pedestal empty, pedestal seated. The two
; pedestal rows are IDENTICAL -- seating changes only hlFill, not the shape -- and they are both
; here so that "seated is the next kind up" stays one adc #1 in hlSet for every seatable thing.
hlK5T:  !byte 0,5,10,15,20
hlSrcL: !byte <hlRungH,<holeYBaseT,<holePtrT,<holeFlagT,<holeXOffT
        !byte <hlRungS,<sockYBaseT,<sockPtrT,<sockFlagT,<sockXOffT
        !byte <hlRungE,<seatYBaseT,<seatPtrT,<seatFlagT,<seatXOffT
        !byte <hlRungP,<pedYBaseT,<pedPtrT,<pedFlagT,<pedXOffT
        !byte <hlRungP,<pedYBaseT,<pedPtrT,<pedFlagT,<pedXOffT
hlSrcH: !byte >hlRungH,>holeYBaseT,>holePtrT,>holeFlagT,>holeXOffT
        !byte >hlRungS,>sockYBaseT,>sockPtrT,>sockFlagT,>sockXOffT
        !byte >hlRungE,>seatYBaseT,>seatPtrT,>seatFlagT,>seatXOffT
        !byte >hlRungP,>pedYBaseT,>pedPtrT,>pedFlagT,>pedXOffT
        !byte >hlRungP,>pedYBaseT,>pedPtrT,>pedFlagT,>pedXOffT
        * = $6b00
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
fwLo:   !byte 0
fwHi:   !byte 0
fwBlk:  !fill 32, 0             ; the block fdWarp reads, rebuilt once a frame
fKT:    !byte 0,1,3,5,7,9,11,13,15,17,19,21,22,23,25,26,28,29,0,0,0,232,234,235,237,238,240,241,242,244,246,248,250,252,254,0,0,0,0,0
fLoT:   !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,25,25,25,24,22,21,19,18,16,15,14,12,10,8,6,4,2,0,0,0,0,0
fHiT:   !byte 24,24,24,24,24,22,20,18,16,14,12,10,9,7,6,4,2,0,0,0,0,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24
fNT:    !byte 25,25,25,25,25,23,21,19,17,15,13,11,10,8,7,5,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $7000
; One bit per (orb, run): is the orb BEYOND that face's plane, hence occluded by it. A constant,
; because the test does not involve the camera at all -- see the data layer above.
orbOccT: !byte 48,179,38,104,233,0,0,0,48,79,61,104,233,0,0,0,48,191,38,104,233,0,0,0,48,79,37,104,233,0,0,0,48,79,38,104,233,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
; The two voices, fully precomputed per cell distance: centre climb and symmetric detune are
; both folded in, so sndTick does no arithmetic. Parked with the occluder masks because the block
; the rest of the per-orb tables live in runs right up against FROWT+0x500.
sndV1L: !byte 188,171,159,151,145,141,138,136,134,134,134,134,134,134,134,134
sndV1H: !byte 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3
sndV2L: !byte 224,197,177,164,154,148,143,139,137,136,136,136,136,136,136,136
sndV2H: !byte 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3
sndVolT: !byte 15,12,10,8,7,6,5,4,3,3,3,3,2,2,2,2
; Where each picture's map lives. The first is inside the image next to the charset; the rest
; ride in bank 3 as IPIC, because a 1,000-byte map has no contiguous home in the image.
picLoT: !byte $00
picHiT: !byte $f1
; dieN is the death counter and it is DATA, not an equate, on purpose: dieKey restarts with
; "jmp entry", which reloads nothing, so an emitted 0 is the only initialisation it ever gets --
; and that is exactly what makes it survive the restart and count deaths rather than resetting.
dieN:   !byte 0
angBearT: !byte 160,192,224,128,0,0,96,64,32
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
        * = $7100
faceChrT: !byte 255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,191,255,255,255,255,255,255,255,254,255,255,255,255,255,247,255,255
        !byte 255,255,255,255,255,255,254,252,255,255,255,255,255,255,63,63,255,255,255,255,255,255,255,253,255,253,255,255,255,255,255,255
        !byte 255,255,255,253,255,255,255,255,255,255,255,255,255,255,252,252,255,255,223,255,255,255,125,255,255,255,255,255,255,254,252,252
        !byte 191,255,255,255,255,255,255,255,85,255,255,255,255,255,255,255,255,255,255,255,255,255,191,191,255,255,255,255,255,191,63,127
        !byte 255,255,255,255,247,255,255,255,255,255,127,255,255,255,255,255,255,255,255,127,255,255,255,255,255,255,255,255,255,255,255,247
        !byte 255,255,255,255,255,3,170,128,255,255,255,255,255,255,175,43,255,255,255,255,226,144,72,81,255,255,255,255,43,66,40,80
        !byte 255,255,255,255,255,254,242,241,255,255,255,255,255,168,43,74,255,255,255,255,255,255,191,175,240,245,198,192,24,11,93,85
        !byte 69,95,157,127,127,255,125,255,211,211,214,246,254,244,222,246,253,241,247,247,229,149,63,63,80,85,221,116,245,244,194,213
        !byte 69,217,112,53,63,157,167,83,63,111,79,95,3,67,94,246,229,229,205,215,207,213,223,207,81,252,212,255,253,255,119,255
        !byte 47,99,128,34,76,218,215,244,255,255,255,255,255,63,191,239,253,241,240,240,240,224,199,149,19,3,77,31,31,247,125,55
        !byte 254,246,118,214,244,214,242,214,255,255,255,252,254,253,252,254,55,215,63,95,255,127,255,127,255,253,92,92,84,213,211,213
        !byte 255,127,85,137,1,80,81,64,247,211,212,253,255,245,254,252,196,237,197,237,193,197,197,197,244,244,116,253,255,247,221,255
        !byte 207,175,43,35,218,88,84,45,4,82,16,89,65,73,5,3,61,87,253,95,93,215,125,87,255,255,119,255,223,255,119,223
        !byte 245,116,244,244,213,209,244,209,255,255,255,255,63,191,63,47,255,255,255,249,244,231,247,245,127,55,255,223,127,119,255,255
        !byte 95,221,213,252,247,223,215,223,83,215,71,31,215,215,83,67,253,221,221,213,245,245,253,127,255,63,63,63,143,95,251,255
        !byte 215,213,221,149,23,21,93,21,255,223,247,255,255,247,221,255,255,255,119,247,255,255,221,253,209,72,210,90,246,210,116,212
        !byte 191,191,63,63,63,175,15,143,252,249,241,243,241,237,220,212,37,85,29,85,84,81,69,13,245,83,245,93,125,85,93,29
        !byte 255,223,93,255,127,215,29,221,125,245,253,221,255,253,223,247,79,15,35,96,216,81,213,87,247,245,215,87,95,125,127,245
        !byte 223,127,255,63,79,211,245,209,247,221,197,119,117,85,66,8,83,71,97,65,80,66,40,111,255,253,253,253,255,53,21,5
        !byte 79,207,112,119,29,85,253,79,252,248,241,48,32,64,69,84,23,23,93,87,93,87,117,119,127,247,119,127,255,215,93,223
        !byte 127,221,119,253,127,253,119,125,245,247,119,215,245,221,93,221,139,131,67,71,210,80,65,1,224,224,192,196,194,212,212,214
        !byte 37,21,13,13,5,87,95,81,23,23,92,85,197,193,205,213,247,255,93,95,221,119,87,95,255,255,125,247,255,127,223,247
        !byte 245,252,214,214,250,208,80,193,1,225,5,5,163,21,81,99,93,84,213,69,92,244,212,66,8,174,106,65,21,5,73,21
        !byte 46,62,168,0,0,82,41,64,117,93,17,20,53,95,135,160,8,47,3,79,91,68,8,202,213,55,221,197,229,229,183,35
        !byte 119,119,253,213,221,119,253,93,223,127,93,223,215,93,213,255,253,221,245,221,127,215,117,215,244,125,253,93,245,119,247,223
        !byte 0,0,32,0,1,0,32,0,146,180,48,48,20,93,84,20,81,80,85,209,1,81,85,81,221,245,212,117,21,85,95,31
        !byte 247,117,87,117,215,247,117,127,255,223,127,247,255,127,221,125,216,68,80,68,89,71,31,85,44,28,125,252,85,93,29,13
        !byte 40,42,11,43,42,2,84,80,199,193,226,160,137,129,100,21,67,11,82,2,0,0,64,80,128,170,250,190,60,40,34,0
        !byte 122,118,61,63,149,53,116,84,161,137,129,96,96,216,116,54,119,213,253,223,95,215,124,119,215,119,85,119,115,119,93,95
        !byte 127,95,95,87,223,221,245,125,213,119,87,93,213,215,93,215,73,209,81,208,86,244,84,212,191,63,127,127,127,63,63,191
        !byte 255,247,255,255,255,253,255,255,2,16,80,64,64,64,64,1,21,85,93,5,5,5,7,71,5,21,85,21,5,5,20,21
        !byte 247,93,85,125,127,95,93,119,253,221,117,247,255,247,215,221,240,248,8,32,16,0,34,8,165,79,15,23,133,143,151,15
        !byte 85,85,215,85,116,84,244,84,17,5,68,20,20,49,88,208,5,5,1,85,21,20,16,80,85,4,16,16,81,81,64,64
        !byte 58,212,212,212,210,212,240,212,156,5,175,179,177,169,161,136,55,149,93,71,199,209,245,85,93,87,85,93,247,253,85,221
        !byte 247,85,117,93,119,85,85,93,117,95,125,85,117,119,85,117,70,196,80,192,66,64,192,80,191,191,127,63,127,63,63,191
        !byte 8,64,65,81,81,55,117,85,129,19,5,5,132,16,85,68,85,85,244,213,93,85,93,87,119,125,85,119,119,119,87,247
        !byte 253,245,220,245,245,116,113,212,136,128,42,32,128,0,0,0,103,87,7,83,133,65,252,79,85,213,223,93,221,116,247,117
        !byte 80,65,65,16,86,81,64,85,81,69,5,1,0,129,161,161,85,65,69,0,21,81,89,77,218,212,244,211,196,213,84,223
        !byte 170,168,116,84,168,0,100,216,87,83,85,23,23,7,13,7,117,221,21,93,93,87,85,87,93,93,31,87,93,117,85,253
        !byte 241,85,117,85,213,85,85,85,66,80,192,80,80,244,116,124,191,191,63,127,63,127,127,63,81,84,80,80,66,80,84,84
        !byte 68,208,85,84,4,16,21,21,87,87,93,85,71,85,93,23,223,221,87,255,247,127,125,125,213,213,83,83,95,85,29,79
        !byte 84,80,85,69,85,71,87,111,185,172,11,10,34,84,221,247,93,255,61,225,168,9,87,253,117,7,70,127,127,117,213,255
        !byte 1,192,112,86,220,253,93,223,127,127,0,191,59,162,84,253,84,79,255,250,250,32,81,93,22,76,5,81,16,50,126,252
        !byte 103,67,113,51,21,53,28,156,87,215,85,215,223,253,221,253,215,117,85,85,125,85,85,85,116,85,93,87,119,93,21,93
        !byte 84,244,84,84,0,84,68,84,191,191,63,191,191,191,63,191,18,148,212,212,198,196,196,196,4,69,21,21,5,19,5,21
        !byte 85,21,93,23,87,85,245,119,253,117,117,119,124,221,117,125,125,93,92,93,125,116,117,116,79,79,95,79,79,79,95,79
        !byte 223,221,255,247,255,119,255,223,253,253,253,253,253,125,220,253,253,253,93,119,247,117,125,127,127,87,255,119,255,87,93,21
        !byte 221,253,255,247,247,245,253,245,133,149,69,101,64,202,208,208,117,125,85,125,117,125,85,125,221,85,85,87,119,85,85,71
        !byte 112,213,221,69,212,85,92,69,0,20,20,70,6,7,71,15,255,255,252,240,244,210,10,97,251,175,2,186,176,130,137,65
        !byte 255,255,239,250,170,2,81,85,215,255,255,127,23,15,7,65,255,248,229,197,148,80,87,213,10,140,104,73,41,20,232,1
        !byte 8,66,34,64,79,220,65,82,255,175,139,43,6,128,96,88,255,255,255,255,255,252,252,248,255,251,234,128,128,5,85,87
        !byte 255,255,138,251,171,10,91,82,255,255,47,235,254,184,10,15,255,255,255,255,255,63,191,63,253,249,252,241,228,212,24,86
        !byte 15,84,74,32,33,133,129,23,71,87,127,93,255,127,255,221,93,255,253,255,119,255,255,255,35,91,215,214,82,214,244,116
        !byte 252,251,245,255,229,205,199,5,28,116,221,213,125,221,127,127,33,53,221,253,242,208,214,212,208,118,221,127,31,15,135,71
        !byte 20,173,39,0,93,209,116,221,191,15,79,207,95,95,2,37,248,241,241,245,241,245,231,229,85,95,255,221,119,255,127,255
        !byte 85,253,255,221,247,223,255,253,83,37,44,74,83,208,214,253,143,211,50,80,0,48,60,44,255,255,255,255,63,255,191,63
        !byte 255,255,252,252,249,245,237,212,22,16,65,79,92,144,96,0,127,255,85,95,63,63,55,127,255,255,255,125,255,255,127,253
        !byte 223,255,255,255,221,255,255,255,212,246,220,246,86,246,244,118,254,252,253,255,253,253,252,255,65,247,255,255,125,255,223,95
        !byte 221,95,253,253,247,247,255,255,80,66,74,84,253,125,252,253,35,49,40,64,95,255,63,63,245,117,127,29,127,95,255,87
        !byte 0,211,255,255,85,117,213,212,255,63,63,63,191,255,255,63,245,245,247,247,241,245,247,243,215,255,255,127,221,255,255,127
        !byte 127,255,255,255,223,255,255,255,221,127,221,253,255,127,215,255,75,67,194,222,93,209,88,214,15,143,195,226,226,187,58,46
        !byte 255,255,255,255,255,255,252,253,250,224,192,144,136,1,5,5,17,5,99,71,95,95,215,221,255,255,93,255,255,127,119,253
        !byte 255,255,255,125,255,255,253,223,221,255,255,253,247,255,255,255,86,214,214,214,70,82,212,82,254,241,245,239,199,213,215,195
        !byte 255,95,127,255,255,255,255,255,223,213,215,209,215,245,247,221,252,124,198,84,30,22,69,95,63,157,129,129,136,144,72,208

        * = $7900               ; ---- out of the main code block, into the page faceScrT vacated ----
; moveXT/moveYT are 512 bytes of TABLE that were sitting inside the code block -- the scarcest
; resource on the machine -- at $1f3e, which is not even page-aligned, so a byte-indexed read
; crossing $2000 was paying an extra cycle. Here they are one page each: the ceiling gets 512
; bytes back AND the movement code gets marginally faster.
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
        !byte 59,60,60,61,61,62,62,62,63,63,63,64,64,64,64,64
        * = $7a00
moveYT: !byte 0,2,3,5,6,8,9,11,12,14,16,17,19,20,22,23,24,26,27,29,30,32,33,34
        !byte 36,37,38,39,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,56,57,58,59
        !byte 59,60,60,61,61,62,62,62,63,63,63,64,64,64,64,64,64,64,64,64,64,64,63,63
        !byte 63,62,62,62,61,61,60,60,59,59,58,57,56,56,55,54,53,52,51,50,49,48,47,46
        !byte 45,44,43,42,41,39,38,37,36,34,33,32,30,29,27,26,24,23,22,20,19,17,16,14
        !byte 12,11,9,8,6,5,3,2,0,254,253,251,250,248,247,245,244,242,240,239,237,236,234,233
        !byte 232,230,229,227,226,224,223,222,220,219,218,217,215,214,213,212,211,210,209,208,207,206,205,204
        !byte 203,202,201,200,200,199,198,197,197,196,196,195,195,194,194,194,193,193,193,192,192,192,192,192
        !byte 192,192,192,192,192,192,193,193,193,194,194,194,195,195,196,196,197,197,198,199,200,200,201,202
        !byte 203,204,205,206,207,208,209,210,211,212,213,214,215,217,218,219,220,222,223,224,226,227,229,230
        !byte 232,233,234,236,237,239,240,242,244,245,247,248,250,251,253,254

        * = $7b00               ; ---- and the whole readout ----
; 322 bytes of the main block, all of it jsr-only and drawn once a frame -- nowhere near a hot
; path, and the last big thing in there that is not the engine. Moved as ONE run, in order, so
; that drawFps falling through into whatever follows it still does. The only branches that
; reach these labels are computeFps's own (cf1/cfdd/cfo), so nothing outside needs a longer arm.
computeFps:
        sec
        lda frameCnt
        sbc lastFrame
        sta deltaL
        lda frameCnt+1
        sbc lastFrame+1
        sta deltaH
        lda frameCnt
        sta lastFrame
        lda frameCnt+1
        sta lastFrame+1
        lda deltaL
        ora deltaH
        bne cf1
        rts
cf1:    lda #$c0
        sta dpx
        lda #$03
        sta dpy                 ; dividend 960
        lda #$00
        sta fpsv
cfdiv:  sec
        lda dpx
        sbc deltaL
        tax
        lda dpy
        sbc deltaH
        bcc cfdd
        stx dpx
        sta dpy
        inc fpsv
        jmp cfdiv
cfdd:   ldx #$00
        lda fpsv
cft:    cmp #10
        bcc cfo
        sec
        sbc #10
        inx
        jmp cft
cfo:    sta fpsOnes
        stx fpsTens
        rts

; ---- readout: fps top-left, X/Y/A top-right ----
; The overlay no longer plots pixels. In the 4x8 scheme a char code is an INDEX into the
; cell-pattern set, not a bitmap, so there is nothing to OR bits into -- instead the last
; 18 codes are literal digit glyphs and the readout just pokes them into screen RAM. That
; also removes the whole class of bug where the overlay reached into renderer tables.
setRow:                         ; A = char row -> ppPtr
        tax
        lda rowLoT,x
        sta ppPtr
        lda rowHiT,x
        clc
        adc baseHi
        sta ppPtr+1
        rts

drawFps:
        lda #$01      ; not row 0: 24-row mode crops the top four pixels, and the
        jsr setRow              ;   glyph ink starts on the second line of the cell
        ldy #$00
        lda fpsTens
        clc
        adc #$c9
        sta (ppPtr),y
        iny
        lda fpsOnes
        clc
        adc #$c9
        sta (ppPtr),y
        rts

; X/Y as cell.frac hex (1 nibble cell + 2 nibbles fraction of the 8.8 fixed point),
; A = the raw angle byte. Screenshot it to get an exactly reproducible viewpoint.

drawDbg:

        lda #$01      ; see drawFps: the top character row is half under the border
        jsr setRow
        ldy #36
        lda #16                 ; 'X'
        jsr ddPut
        lda px+1
        and #$0f
        jsr ddPut
        lda px
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda px
        and #$0f
        jsr ddPut
        lda #$02
        jsr setRow
        ldy #36
        lda #17                 ; 'Y'
        jsr ddPut
        lda py+1
        and #$0f
        jsr ddPut
        lda py
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda py
        and #$0f
        jsr ddPut
        ; ---- the angel's CELL ----
        ; x/y/a pin the CAMERA, and that used to be the whole story. It is not any more: an angel
        ; wanders while unobserved, so the same three numbers put a different scene in front of it
        ; every run and a reported artefact cannot be reproduced at all. Worse, a camera parked
        ; facing one freezes its clock, so waiting does not sweep the possibilities either --
        ; the cell has to be READ OFF and fed back in through ANGAT.
        ; ONE LINE PER ANGEL, every angel: level 3's third was cut for 31 bytes of main block
        ; until obOrder moved out of it (2026-09-19).
        lda #$04
        jsr setRow
        ldy #36                 ; 36, not 37: x needs TWO digits. On a 28-wide map "and #$0f"
        lda #14                 ;   showed an angel at x=21 as x=5 -- a cell in the other half of
        jsr ddPut               ;   the level, which reads exactly like it teleported.
        ldx #$02          ; ONE LINE PER ANGEL. This was a single hardcoded findIndex, so a
        lda orbXCT,x            ;   second angel was invisible to the readout entirely.
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda orbXCT,x
        and #$0f
        jsr ddPut
        lda orbYCT,x
        and #$0f
        jsr ddPut
        lda #$05
        jsr setRow
        ldy #36                 ; 36, not 37: x needs TWO digits. On a 28-wide map "and #$0f"
        lda #14                 ;   showed an angel at x=21 as x=5 -- a cell in the other half of
        jsr ddPut               ;   the level, which reads exactly like it teleported.
        ldx #$03          ; ONE LINE PER ANGEL. This was a single hardcoded findIndex, so a
        lda orbXCT,x            ;   second angel was invisible to the readout entirely.
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda orbXCT,x
        and #$0f
        jsr ddPut
        lda orbYCT,x
        and #$0f
        jsr ddPut
ddAng:  lda #$03
        jsr setRow
        ldy #35                 ; one column left of X/Y: the angle is FOUR digits, not two
        lda #10                 ; 'A'
        jsr ddPut
        lda pa
        lsr
        lsr
        lsr
        lsr
        jsr ddPut
        lda pa
        and #$0f
        jsr ddPut
        lda paF                 ; ---- and the SUB-UNIT half of it ----
        lsr                     ; pa alone is ambiguous: paq indexes the ray tables at
        lsr                     ; quarter-unit resolution, so pa:paF = C000, C040, C080 and C0C0
        lsr                     ; are four DIFFERENT renders that all used to read "AC0" on
        lsr                     ; screen. Three of every four reachable views could not be
        jsr ddPut               ; replayed from a screenshot, and a glitch living on one of them
        lda paF                 ; looked like it simply did not reproduce. Read all four digits
        and #$0f                ; off and feed them straight back in as PA=c0 PAF=40.
        jmp ddPut
ddPut:  clc
        adc #$c9
        sta (ppPtr),y
        iny
        rts


symT:   !byte $55,$55,$55,$55,$55,$55,$55,$55   ; plain SOLID: every column pair 01
        !byte $55,$55,$55,$45,$55,$55,$55,$55
symOT:  !byte $ff,$ff,$ff,$ff,$ff,$ff,$ff,$ff   ; plain OCC_FULL: every column pair 11
        !byte $ff,$ff,$ff,$cf,$ff,$ff,$ff,$ff
lvlSymT: !byte 0,0,0,8,8

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
sprPal: lda dieLat              ; ---- the death scene wants the inks to SIT STILL ----
        bne spLvl               ; no idol tint and no held split: this is what $d025/$d026 held
        lda idolOn              ;   before any of this existed, and the scene's fade was written
        bne spTint              ;   against it. "The world no longer goes black correctly."
        lda idolHd              ; ...or the idol is in your HANDS, which is the tell that the
        beq spLvl               ;   angels have stopped caring whether you are looking
spTint:
        lda #$09      ; ---- above the split: the world's ----
        ldy #$07
        bne spWSt               ; always: brown is not zero
spLvl:  lda sprU                ; whatever lvlLook left for this level
        ldy sprH
spWSt:  sta $d025
        sty $d026
        sta irqSpU+1            ; the held half MATCHES the world by default, so the split shows
        sty irqSpH+1            ;   nothing at all -- including when a WORLD idol is what is
                                ;   tinting things and walks down into the last few rows.
        lda dieLat
        bne spDn
        ldx carry               ; ---- below the split: only if something special is in hand ----
        beq spDn
        dex                     ;   carry is the entity index PLUS ONE
        lda orbArtT,x
        beq spDn                ; an orb holds no special inks
        lda #$09
        ldy #$07
        sta irqSpU+1
        sty irqSpH+1
spDn:   rts

idolWk: !byte $00               ;   times a second, and the projection clears-then-sets, so
                                ;   reading the working flag direct would show 0 for any raster
                                ;   frame whose IRQ landed inside the projection -- one bad frame
                                ;   in roughly four, which is exactly the flicker this chases.
idolLat:lda idolWk
        sta idolOn
        lda #$00
        sta idolWk
        rts

idolLk: ldx #$00                ; assume not
        ldy carry
        beq idlPut              ; empty hands
        dey
        lda orbArtT,y           ; 0 = an orb. Only the idol changes the rules.
        beq idlPut
        inx
idlPut: stx idolHd
        rts


        * = $7e00
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
; ---- sprSpl: the HELD object's inks, from its own raster line down ----
; Bit pairs 01 and 11 are one register each for all eight sprites, so the only way to give the
; thing in your hand its own tones is to change them partway down the screen. It is slot 0 at
; ORB_HOLD_Y, Y-expanded to 42 rows, so it owns everything below SPRSPL and one split does it.
; Anything in the WORLD whose sprite reaches below that line takes these inks too -- there is no
; per-sprite escape from a shared register, only a per-SCANLINE one.
sprSpl:
irqSpU: lda #$0b
        sta $d025
irqSpH: lda #$0f
        sta $d026
        lda irqCm2+1            ; on to whatever the arc split wants next
        sta $d012
        jmp irqd

; sprArm: the split is off during a FALL -- every sprite is cleared on the frame one starts, and
; the arc's own split can sit ABOVE this line, which would strand region 3 behind it.
sprArm: lda fallSt
        bne saOff
        lda #$d1
        sta irqSpC+1
        sta irqAr2+1            ; region 1 now ends here rather than at the arc split
        rts
saOff:  lda #$ff                ; never matches, and irqAr2 keeps the arc split
        sta irqSpC+1
        rts

; ---- palCol: the ground inks, by key ----
; '1' advances CEILING and FLOOR together, keeping any difference between them; 'Q' advances the
; floor alone and 'W' the ceiling alone. They are separable because the raster split gave the two
; their own registers: irqB0 is everything above the horizon, irqB1 everything below it. Pressing
; '1' used to move only the ceiling once irqB1 existed, which is the bug that found this feature.
; No $d021 store: the IRQ writes both regions from these two operands every frame anyway.
palCol: lda pkEdge
        and #$01
        beq pcQ
        jsr pcCei
        jsr pcFlr
pcQ:    lda pkEdge
        and #$40                ; 'Q'
        beq pcW
        jsr pcFlr
pcW:    lda pkEdge
        and #$20                ; 'W'
        beq pcDn
        jsr pcCei
pcDn:   rts
pcCei:  inc colW
        lda colW
        and #$0f
        sta colW
        sta colT                ; through the shadow, like everything else that paints the ground
        rts
pcFlr:  inc colF
        lda colF
        and #$0f
        sta colF
        sta irqB1+1
        rts
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
idolOn: !byte $00               ; the idol is on screen. LATCHED: the IRQ reads this sixty


; lvlBoot: the starting level's whole look. The wall ink lives here rather than at the boot site
; because the main block is the tightest resource in the project and this runs once.
lvlBoot:jsr lvlLook             ; all five inks, then fall through to lvlHi
        ; fall through to lvlHi: at boot there is no departing level, so all three agree
; lvlHi: the region ABOVE the rim catches up with the rest. Called when the DEPARTING rim has
; finally left the screen -- until then it must keep the colour of the level being left, which is
; the whole point of the split.
lvlHi:  lda colW
        sta colT                ; THE moment the top of the screen is allowed to become the
        rts                     ;   arriving level. irqB1 needs nothing here: it tracks colF
                                ;   through mnext's publish, and lvlLook has already set colF.

; lvlLo: the region BELOW the rim only. Called the moment a fall starts, when the level has
; already swapped underneath but the drop is still showing the room being left above the rim.
; Two $d021s for the two levels on screen at once -- the overlap frames used to have to pick one,
; which made whichever lost look as though IT had changed colour.
lvlLo:  ldx lvlMeT
        dex
        lda lvlPalceilT,x
        sta irqB2+1
        rts
lvlLook: ldx lvlMeT             ; indexed by level id - 1; lvlMeT is the level ARRIVED at
        dex
        lda lvlPalceilT,x
        sta colW
        lda #$00
        sta colB
        sta $d022
        lda lvlPalseamT,x
        sta colS
        sta $d023
        lda lvlSprunderT,x
        sta sprU
        lda #$0f
        sta sprH

        lda lvlSprunderT,x
        sta sprU
        sta $d025
        lda colW                ; the two regions BELOW the departing rim are this level
        sta colF                ;   now -- but NOT irqB0. The overlap frames still have the old
        sta irqB2+1             ;   level's rim at the top, and lvlHi hands that over later.
                                ; irqB1 is NOT stored here: mnext publishes it from colF at raster
                                ;   250, with the pSplit that says where region 1 begins. Storing
                                ;   it here put the new ground on screen a whole frame before the
                                ;   line that bounds it.
symPut: ldx lvlMeT
        dex
        lda lvlSymT,x           ; 0 = plain, 8 = this level is marked
        clc
        adc #7                  ; walk both halves of symT backwards, row 7 down to 0
        tax
        ldy #7
spLp:   lda symT,x
        sta $c008,y      ; SOLID is code 1, so its glyph is base + 8
        sta $c808,y
        lda symOT,x             ; ...and the FULL OCCLUDER, which is solid wall to the eye and
        sta $c780,y   ;   was the one cell on a marked level with no
        sta $cf80,y ;   mark on it -- a blank black block in a dotted
        dex                     ;   wall. Same X, so it follows SOLID's plain/marked choice.
        dey
        bpl spLp
        rts

; ---- setGnd: A -> the ground colour, and the two operands the IRQ paints it from ----
; $d021 is written by the IRQ every RASTER frame now, so a plain "sta $d021" anywhere else
; survives at most 16ms. Everything else that sets the ground -- the death fade, the cut-scene
; pictures -- goes through here, which costs each site nothing: jsr is the same three bytes the
; store was. A is preserved, so a site that also writes $d022 still can.
setGnd: sta colT                ; THE SHADOWS ONLY. Both are published at raster 250, so the two
        sta colW                ;   halves change at the same top of frame instead of a frame
        sta colF                ;   apart -- and there is no mid-frame $d021 store to paint a
        rts                     ;   partial band down the middle of the one it lands in.
        * = $8600
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
        * = $8700
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
        * = $8800
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
        * = $8900
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
        * = $8a00
runWT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,22,0,0,0,0,0,0,0,10,0,0,0,0,0,0,14,0,0,0,0,0,0,0,22,0,0,0,0,0,0,8,0,0,0,0,0,0,0,14,0,0,0,0,0,19,0,22,0,0,0,0,0,0,8,0,0,0,0,0,0,0,14,0,16,0,0,0,19,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,16,0,0,0,0,0,22,0,0,0,0,0,0,9,0,0,0,0,0,0,0,14,0,16,0,0,0,20,0,22,0,0,0,0,0,0,9,0,0,0,0,0,0,0,14,0,0,0,0,0,20,0,22,0,0,0,0,0,0,0,11,0,0,0,0,0,0,14,0,0,0,0,0,0,0,22,0,0,0,5,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $8b00
runET: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,6,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,18,0,0,0,3,0,0,0,0,0,0,0,0,0,0,12,0,15,0,0,0,0,0,18,0,0,0,3,0,0,0,0,0,0,0,0,0,0,12,0,15,0,0,17,0,0,18,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,15,0,0,17,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,13,0,15,0,0,17,0,0,21,0,0,0,3,0,0,0,0,0,0,0,0,0,0,13,0,15,0,0,0,0,0,21,0,0,2,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,0,0,0,0,21,0,0,2,0,0,0,7,0,0,0,0,0,0,0,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $8c00
runNT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,27,27,27,27,27,27,27,0,0,0,29,0,0,0,0,30,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,34,34,34,34,34,34,34,0,0,0,0,0,0,0,36,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,40,40,40,40,0,0,0,0,0,0,41,41,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,42,42,0,0,43,43,0,0,0,0,0,0,44,44,44,44,44,44,44,44,44,0
        * = $8d00
runST: !byte 0,23,23,0,0,24,24,0,0,0,0,0,0,25,25,25,25,25,25,25,25,25,0,0,0,0,26,26,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,28,28,28,28,28,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,31,31,31,31,31,31,0,0,0,0,0,0,0,33,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,35,35,0,0,0,0,0,0,37,0,0,0,0,38,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,39,39,39,39,39,39,39,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $8e00
mapT:   !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,0,0,1,1,0,0,1,1
        !byte 1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0
        !byte 0,0,0,0,0,1,1,1,1,1,1,0,1,1,1,1
        !byte 1,1,1,0,1,1,1,0,0,0,0,1,1,1,1,1
        !byte 1,1,0,1,0,0,0,0,0,1,0,1,1,1,0,0
        !byte 0,0,1,1,1,1,1,1,1,0,1,0,1,1,0,0
        !byte 1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,1,0,1,1,0,0,0,0,1,1,1,0,0,0,0
        !byte 1,1,1,1,1,1,1,0,1,0,1,1,0,0,1,0
        !byte 1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1
        !byte 0,0,0,0,0,1,0,1,1,0,0,0,0,0,0,1
        !byte 1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1
        !byte 0,0,1,1,0,0,1,1,1,1,1,1,0,0,0,0
        !byte 0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1   ; padded to the page with WALL: mkRuns reads c-1 at cell 0 and c+1 at the last cell
        * = $8f00
rbT:    !byte 12,12,12,12,12,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,9,9,9
        !byte 9,9,9,9,9,8,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,6,6,6
        !byte 6,6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3
        !byte 3,3,3,3,3,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $9000
rsT:    !byte 13,13,13,13,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,10,10,10,10
        !byte 10,10,10,10,9,9,9,9,9,9,9,9,8,8,8,8,8,8,8,8,7,7,7,7
        !byte 7,7,7,7,6,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,4,4,4,4
        !byte 4,4,4,4,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,1,1,1,1
        !byte 1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $9100     ; a jsr target, in the page FINEANG's
        ; coarse delta tables vacated. It used to sit at $609b, a hole that only LEVEL 1's map
        ; leaves -- level 2's data ran straight through it and the build died. Everything from
        ; RELOC on is engine table space at fixed origins, so it is free on EVERY map.
; ---- snKick: voice 1 falls fast, so the ear hears an impact and not a note ----
; Voice 1 is free at this point: the drone is cut on the same frame the picture arrives. The
; fall is what makes it percussive -- held still it would just be a low tone under the noise.
snKick: lda #<$05c4
        sta dieFqL
        sta $d400
        lda #>$05c4
        sta dieFqH
        sta $d401
                                ; pulse width is already SND_PW from sndInit; no need to set it
        lda #$09
        sta $d405
        lda #$00
        sta $d406
        lda #$40                ; gate low first, or the envelope will not retrigger
        sta $d404
        lda #$41                ; pulse + gate
        sta $d404
        lda #$07
        sta dieKik
        rts

; called once a frame while a picture is up: steps the fall, then stops touching the voice
snKTick: lda dieKik
        beq snKDn
        dec dieKik
        sec
        lda dieFqL
        sbc #<$0091
        sta dieFqL
        sta $d400
        lda dieFqH
        sbc #>$0091
        sta dieFqH
        sta $d401
snKDn:  rts


        ; The sound effects, out here because the $9d00 block that holds the level shadow
        ; ran out of room the moment a level was allowed to declare its own sockets: the
        ; shadow carries the other level's tables and those grew with it. This hole is
        ; 768 bytes and holds nothing else.
        * = $9200
; ---- mkRuns: rebuild the wall-run tables from mapT ----
; Four 256-byte tables plus 100 bytes of per-run metadata -- 1,124 of the 1,789 bytes a level
; used to carry -- are DERIVED from the map by two passes over it, PLUS the split ids (see the
; tail): the merge-hazard lists split runs into pieces with ids of their own, which no pass over
; the map can produce, and this routine used to leave those ids' plane and face holding the level
; you fell FROM -- the socket room's column then occluded against level 1's planes. Carrying them was costing more
; than recomputing them: the swap runs at ~29 cycles a byte, so not moving 1,124 of them saves
; ~32,000 cycles, and this costs about 25,000. The drop through a hole gets CHEAPER, not dearer.
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
; MKRUNS=1 boots through this routine on top of the build's tables so the two can be compared.
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
        bne mrVw
        sta mrWp                ; open cell: both runs end here
        sta mrEp
        jmp mrVn
mrVw:   dey                     ; west face? the cell at c-1 must be open
        lda mapT,y
        iny                     ; restoring Y CLOBBERS the flags the load just set, so the
        cmp #$00                ;   compare has to be redone -- without this the branch below
        bne mrVwn               ;   tested Y and every west run came out wrong
        lda mrWp
        bne mrVws
        lda mrNext              ; a new run: plane = x, face W
        sta mrWid
        inc mrNext
        tax
        lda mrX
        sta runPlaneT,x
        lda #$00
        sta runFaceT,x
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
        bne mrVen
        lda mrEp
        bne mrVes
        lda mrNext              ; plane = x+1, face E
        sta mrEid
        inc mrNext
        tax
        lda mrX
        clc
        adc #$01
        sta runPlaneT,x
        lda #$80
        sta runFaceT,x
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
        bne mrHn
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
        bne mrHnn
        lda mrWp
        bne mrHns
        lda mrNext              ; plane = y, face N
        sta mrWid
        inc mrNext
        tax
        lda mrY
        sta runPlaneT,x
        lda #$01
        sta runFaceT,x
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
        bne mrHsn
        lda mrEp
        bne mrHss
        lda mrNext              ; plane = y+1, face S
        sta mrEid
        inc mrNext
        tax
        lda mrY
        clc
        adc #$01
        sta runPlaneT,x
        lda #$81
        sta runFaceT,x
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
        ldx #$00
mrB:    txa
        lsr
        lsr
        lsr
        sta runByteT,x
        txa
        and #$07
        tay
        lda mrBitT,y
        sta runBitT,x
        inx
        cpx #$39
        bcc mrB
        jmp hazSpFix            ; ...and the split ids' plane and face. Out of line: this block
                                ;   ends at bfsQ with nothing to spare.


; ---- sfx: one-shot effects on VOICE 3 ----
; Voices 1 and 2 are the angel drone and are rewritten every frame by sndTick, so an effect
; that borrowed one would fight it. Voice 3 is untouched by the drone and free.
; Everything is table-driven for the same reason the drone is: with pitch, waveform and volume
; all moving you cannot tell which one you are hearing.
; RELOCATED out of the main code stream, which was down to 1 byte. sndInit runs ONCE at
; boot and is entered by jsr only, so it has no business occupying the scarcest space in
; the program. Relocating code into a hole is established practice here -- the rule is
; enter by jsr/jmp only, nothing may fall in, and the block must appear in ADDRESS ORDER.
; ---- sndInit: one sustained chord of two, and then only the detune ever changes ----
; The SID has no reset line, so every register is cleared first -- whatever BASIC or the loader
; left in there is otherwise still playing. Gated once and never released: this is a drone, so
; the envelope only ever runs its attack.
sndInit:
        ldx #$18
        lda #$00
sniLp:  sta $d400,x
        dex
        bpl sniLp
        lda #<$0386
        sta $d400
        sta $d407
        lda #>$0386
        sta $d401
        sta $d408
        lda #$00
        sta $d402
        sta $d409
        lda #$08
        sta $d403
        sta $d40a
        lda #$80
        sta $d405
        sta $d40c
        lda #$fa
        sta $d406
        sta $d40d
        lda #$00                ; cutoff is 11 bits: three low, then eight. Only the top matters
        sta $d415
        lda #$1e
        sta $d416
        lda #$87
        sta $d417               ; resonance, and ALL THREE voices routed through the filter.
                                ;   Voice 3 was unfiltered and read bright and thin next to the
                                ;   drone; the cutoff is already low, so routing alone darkens the
                                ;   effects a long way. The drone's own path is unchanged.
        lda #$1f
        sta $d418               ; LOW-pass; sndTick varies only the volume nibble from here
        lda #$41                ; pulse + gate
        sta $d404
        sta $d40b

        rts

; An effect is a ROW OF TABLES, not code. sfxTick reads length, waveform, envelope, filter
; routing, peak volume and a pitch table out of them and never knows which effect is playing,
; so a new sound is a row plus a pitch table -- no new code, and nothing added to the main
; code stream, which has 23 bytes left.
sfxGo:  sta sfxK                ; A = effect id, 1..N
        tax
        lda sfxLenT-1,x
        sta sfxN
        lda sfxAdT-1,x          ; per-effect envelope. A clink and a rumble want different ones,
        sta $d413               ;   and ATTACK 0 rises instantly, which IS a click -- one shared
        lda sfxSrT-1,x          ;   envelope for every sound was half of "clippy".
        sta $d414
        lda sfxPLoT-1,x         ; aim the per-frame read at this effect's pitch table
        sta sfxRd+1
        lda sfxPHiT-1,x
        sta sfxRd+2
        lda #$83
        ora sfxFltT-1,x         ; voice 3 through the filter or not, per effect -- a rumble wants
        sta $d417               ;   it, a clink wants the sparkle. The drone's own two routing
        rts                     ;   bits are constant either way.

sfxTick:ldx sfxK
        beq sfxQ                ; nothing has ever played
        lda sfxN
        bne sfxOn
        lda sfxCtlT-1,x         ; idle: drop the GATE bit only and leave the waveform, so the
        and #$fe                ;   release phase rings out. Clearing the whole control register
        sta $d412               ;   yanked the oscillator mid-note -- the other half of the click.
sfxQ:   lda sndLvl              ; and the drone has the master back
        sta $d418
        rts
sfxOn:  dec sfxN
        ldy sfxN                ; counts DOWN, so a pitch table's LAST entry is its first frame
        lda #$00
        sta $d40e
sfxRd:  lda $ffff,y             ; SELF-MODIFIED by sfxGo: this effect's pitch table
        sta $d40f
        lda sfxCtlT-1,x
        sta $d412
        lda sfxVolT-1,x         ; the LOUDER of effect and drone, so the master never steps down
        cmp sndLvl              ;   when a sound starts next to a close angel
        bcs sfxV
        lda sndLvl
sfxV:   sta $d418
        rts

sndLvl: !byte $12               ; what the DRONE wants the master to be. sfxTick reconciles it
                                ;   with any effect and writes $d418 once.
sfxN:   !byte 0                 ; frames left in the effect; 0 = idle
sfxK:   !byte 0                 ; which effect is loaded

; Out of the main block (11 bytes over once level 1's two angel readouts met the per-level
; stride reads, 2026-09-18) into the tail of the bfsQ page. jsr-only; "* = $9500 moves
; backward" guards it.
; fallSnap: A = page of a screen buffer -> copy it into fallBuf. Four pages, not 1000 bytes:
; the tail past the matrix is the sprite pointers, and copying them costs nothing and is simpler.
fallSnap:
        sta fdS+1
        lda #$62
        sta fdD+1
        lda #$00
        sta fdS
        sta fdD
        ldx #$04
        ldy #$00
fsnLp:  lda (fdS),y
        sta (fdD),y
        iny
        bne fsnLp
        inc fdS+1
        inc fdD+1
        dex
        bne fsnLp
        rts

; ---- obOrder: project every entity, nearest first, until the sprite slots run out ----
; The walk used to go in entity order, and the slots ran out on whoever came last: level 3's
; third angel (entity 4, two sprites) simply did not draw whenever the two orbs, the hole and
; a socket had taken theirs -- "still blocks me, still kills me, but doesn't render" (the user,
; 2026-09-18). Now each entity gets a key of |dx|+|dy| cells from the player and the nearest is
; projected first, so what drops when eight is not enough is the smallest thing on screen.
; Up to eight entities, so the selection is a plain repeated minimum: ~600 cycles a frame.
; Out here because the main block has no room; jsr-only.
obOrder:ldx nOrbT
        beq obODn
obKLp:  dex
        lda #$ff                ; $ff = never: hidden, or not an angel while dying
        ldy orbHidT,x
        bne obKSt
        ldy dieSt               ; dying: the ANGEL keeps its sprite and nothing else does.
        beq obKLiv              ;   Done here rather than by clearing omEn, because orbMove
        ldy orbTallT,x          ;   refills omEn later in the same frame -- which is exactly how
        beq obKSt               ;   the carried-orb slot came back the last time this was tried.
obKLiv:
        lda orbXCT,x
        sec
        sbc px+1
        bcs obKx
        eor #$ff                ; negative: negate. The borrow left C clear, so the +1 is free
        adc #$01
obKx:   sta obKT
        lda orbYCT,x
        sec
        sbc py+1
        bcs obKy
        eor #$ff
        adc #$01
obKy:   clc
        adc obKT                ; |dx| + |dy| in cells: at most 30, so never $ff
obKSt:  sta obKeyT,x
        txa
        bne obKLp
obPick: lda #$ff
        sta obKT                ; the smallest key so far
        ldx nOrbT
obPLp:  dex
        lda obKeyT,x
        cmp obKT
        bcs obPNx
        sta obKT
        stx obKI
obPNx:  txa
        bne obPLp
        lda obKT
        cmp #$ff
        beq obODn               ; every entity done (or never)
        ldx obKI
        lda #$ff
        sta obKeyT,x            ; consumed
        stx oidx
        lda #$80
        sta ocanO
        jsr orbOne
        lda onv
        cmp onvH
        bcc obPick              ; slots left: the next nearest
obODn:  rts
        * = $9500
posXT:  !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        * = $9600
posYT:  !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $9700
rayOffT: !byte 233,233,233,233,233,234,234,234,234,235,235,235,235,236,236,236,236,237,237,237,238,238,238,238,239,239,239,239,240,240,240,241,241,241,241,242,242,242,243,243,243,244,244,244,244,245,245,245,246,246,246,247,247,247,248,248,248,249,249,249,250,250,250,251,251,251,252,252,252,253,253,253,254,254,254,255,255,255,255,0,0,1,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10,11,11,11,12,12,12,12,13,13,13,14,14,14,15,15,15,15,16,16,16,17,17,17,17,18,18,18,18,19,19,19,20,20,20,20,21,21,21,21,22,22,22,22,23,23,23,23,24
        ; ---- the seated orb's per-variant tables ----
        ; Indexed by ORB VARIANT, because a seated orb steps exactly as a standing one and
        ; hlRungE reads the same orbVarT. Out here in the tails of two pages the ray tables do
        ; not fill: the ORB_SMALL region they were in has no room for 44-entry tables.
        * = $97a0
seatPtrT: !byte 196,197,197,198,198,199,199,200,201,201,202,196,197,198,199,201,202,203,204,205,206,207
seatYBaseT: !byte 132,134,134,134,134,136,136,138,140,140,142,141,142,142,143,145,146,146,147,147,148,149
; The sound effects' parameter tables, in the tail of this page and the next: the $9200 block
; they lived in overran $9500 by eight bytes when level 2's 117 open cells grew bfsQ (2026-09-18).
;         swallow  collapse  clink
sfxLenT:!byte   8,      14,     5      ; frames
sfxCtlT:!byte $11,     $81,   $11      ; triangle, noise, triangle. Bit 0 is the gate.
sfxAdT: !byte $18,     $18,   $14      ; attack/decay
sfxSrT: !byte $f8,     $f8,   $04      ; sustain/release -- the clink has none, so it plinks
sfxVolT:!byte $19,     $19,   $17      ; peak master, low-pass bit included
sfxFltT:!byte $04,     $04,   $00      ; voice-3 filter routing bit
sfxPLoT:!byte <sfxSwT, <sfxWlT, <sfxCkT
sfxPHiT:!byte >sfxSwT, >sfxWlT, >sfxCkT

        * = $9800
colGrpT: !byte 0,0,0,0,1,1,1,1,2,2,3,3,3,3,4,4,4,5,5,5,5,6,6,6,7,7,7,7,8,8,8,9,9,9,9,10,10,10,10,11,11,11,11,11,12,12,12,12,13,13,13,13,13,13,14,14,14,14,14,14,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,13,13,13,13,13,13,12,12,12,12,11,11,11,11,11,10,10,10,10,9,9,9,9,8,8,8,7,7,7,7,6,6,6,5,5,5,5,4,4,4,3,3,3,3,2,2,1,1,1,1,0,0,0,0
        * = $98a0
seatFlagT: !byte 13,13,13,13,13,13,13,13,13,13,13,1,1,1,1,1,1,1,1,1,1,1
seatXOffT: !byte 12,12,12,12,12,12,12,12,12,12,12,6,6,6,6,6,6,6,6,6,6,6
sfxSwT: !byte 6,7,9,11,13,15,17,19                      ; ~300Hz down to ~95Hz
sfxWlT: !byte 12,13,14,16,18,20,22,24,26,28,31,34,38,42 ; NOT lower: noise clocked this slowly
                                                        ;   crackles rather than rumbles, which
                                                        ;   is what the old floor of 3 was doing
sfxCkT: !byte 96,85,74,62,51    ; RISING, ~800Hz up to ~1500Hz. It fell before, an octave lower,
                                ;   and a short fall low in the register is the shape every
                                ;   refusal sound has -- it read as the orb being rejected rather
                                ;   than taken. Up and bright is what acknowledgement sounds like.


        * = $9900
; The DDA deltas at quarter-angle resolution. TWO pages, not the eight a naive ddx/ddy pair at
; 1024 entries would take: |cos| has period half a circle and sin is cos a quarter turn along,
; so castRay picks between these two pages on bit 0 of the quarter and reads ddy out of the one
; ddx is not using. Both identities are asserted over every entry at build time.
; The 256-entry integer-angle originals are emitted only for FINEANG=0 -- posXT/posYT/absSinT/
; absCosT still index by the integer angle, and their page-alignment check would have to be
; reworked for no gain.
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
        * = $9b00
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
        * = $9d00
; ---- the angel-path fill's own state ----
; UNCONDITIONAL, and deliberately outside the block below: this is engine state and has nothing to
; do with how many levels are resident. Tucking it in there compiled fine on the default build and
; broke every TWOLEV=0 one with an undefined-symbol error. Nothing swaps it -- it is scratch.
bfsBlk: !byte 0                 ; was the neighbour the fill is looking at a blocked cell?
bfsEnI: !byte 0                 ; entity index, saved across the early-out's cell arithmetic
blkVer: !byte 0                 ; bumped whenever blkT changes -- see bfsTick
occVer: !byte $ff               ; blkVer and the cell orbOccAll last rebuilt for; $ff forces
occCell:!byte $ff               ;   a rebuild on the first frame
bfsBVF: !byte 0                 ; the blkT version the fill in progress is for
bfsBVD: !byte 0                 ; ...and the one the LIVE map was built from
atMsk:  !byte 0                 ; the leash bit under test
atTmp:  !byte 0                 ; ...and this angel's row offset into angBlkT
sockHit: !byte 0                ; socket index+1 the last orb was spent on; 0 = none
; Socket -> the GLOBAL wall id it opens, $ff = opens nothing. NOT inside the WALL_DELTA block
; below, even though only a wall build reads it: it is a LVL_TABLES entry, so lvlDstLoT names it
; in every build, and a chain with no removable walls anywhere (CHAIN=1) failed to assemble on
; an undefined symbol. Sockets and removable walls are separate features and the manifest should
; not couple them.
sockWallT: !byte $ff,$ff,$ff
sokShrT: !byte 0,3,6   ; rungs down, per closing frame
; ---- A WALL, TAKEN OUT AND PUT BACK ----
; Both configurations of the room are built (the second in a subprocess, same trick the shadow
; level uses) and only the DIFFERENCE ships. It cannot be recomputed on the machine: the
; merge-hazard pass alone is 1024 directions by 3x3 samples. Run ids renumber wholesale when a
; wall goes, so the delta is never the one map byte you would guess: these 3 come to
; 197, 33, 13 bytes. (It said "13 runs become 5 here" when there was one wall on one
; level to point at, and reported wall 0's count as if it were every wall's.)
; The format is (addrLo, addrHi, outValue, backValue) until $ff -- see hzRunW. It was two
; separate hzRun triple lists, one a direction, until levels 2 and 3 both had removable walls and
; the two sets together overran rayOffQS at $a900: the addresses were stored twice.
; NOT in the delta, deliberately: stepT (map-independent since STEPFB), orbOccT (orbOccAll
; rebuilds every mask every frame) and the charset (canonical -- fontA is byte-identical with the
; column present and removed).
; ONE PAIR PER REMOVABLE WALL (2026-09-18): level 2 has three sockets and three walls, and each
; socket names its wall through sockWallT. wsWall is the wall being toggled; wallStT its state.
wallDT0: !byte <mapT+58,>mapT+58,0,1,<mapT+74,>mapT+74,0,1,<mapT+90,>mapT+90,0,1,<holeSeeT+7,>holeSeeT+7,15,3,<holeSeeT+9,>holeSeeT+9,127,3,<holeSeeT+11,>holeSeeT+11,63,3,<holeSeeT+13,>holeSeeT+13,29,5,<holeSeeT+15,>holeSeeT+15,8,0,<holeSeeT+37,>holeSeeT+37,29,17,<holeSeeT+39,>holeSeeT+39,63,3,<holeSeeT+41,>holeSeeT+41,127,3,<holeSeeT+43,>holeSeeT+43,63,3,<holeSeeT+45,>holeSeeT+45,29,17,<holeSeeT+66,>holeSeeT+66,56,0,<holeSeeT+68,>holeSeeT+68,252,0,<holeSeeT+69,>holeSeeT+69,29,28,<holeSeeT+70,>holeSeeT+70,254,0,<holeSeeT+71,>holeSeeT+71,63,56,<holeSeeT+72,>holeSeeT+72,254,0,<holeSeeT+73,>holeSeeT+73,127,120,<holeSeeT+74,>holeSeeT+74,254,0,<holeSeeT+75,>holeSeeT+75,63,56,<holeSeeT+76,>holeSeeT+76,252,0,<holeSeeT+77,>holeSeeT+77,29,28,<holeSeeT+78,>holeSeeT+78,56,0,<holeSeeT+99,>holeSeeT+99,8,0,<holeSeeT+101,>holeSeeT+101,29,5,<holeSeeT+103,>holeSeeT+103,63,3,<holeSeeT+105,>holeSeeT+105,127,3,<holeSeeT+107,>holeSeeT+107,15,3,<holeSeeT+133,>holeSeeT+133,29,13,<holeSeeT+135,>holeSeeT+135,63,3,<holeSeeT+137,>holeSeeT+137,127,3,<holeSeeT+139,>holeSeeT+139,63,3,<holeSeeT+141,>holeSeeT+141,29,1,<holeSeeT+143,>holeSeeT+143,8,0,<holeSeeT+163,>holeSeeT+163,8,0,<holeSeeT+165,>holeSeeT+165,29,1,<holeSeeT+167,>holeSeeT+167,63,3,<holeSeeT+169,>holeSeeT+169,127,3,<holeSeeT+171,>holeSeeT+171,63,3,<holeSeeT+173,>holeSeeT+173,29,1,<holeSeeT+175,>holeSeeT+175,8,0,<holeSeeT+195,>holeSeeT+195,8,0,<holeSeeT+197,>holeSeeT+197,29,1,<holeSeeT+199,>holeSeeT+199,63,3,<holeSeeT+201,>holeSeeT+201,127,3,<holeSeeT+203,>holeSeeT+203,63,3,<holeSeeT+205,>holeSeeT+205,29,13,$ff
wallDT1: !byte <mapT+57,>mapT+57,0,1,<holeSeeT+7,>holeSeeT+7,2,0,<holeSeeT+10,>holeSeeT+10,1,0,<holeSeeT+12,>holeSeeT+12,192,0,<holeSeeT+13,>holeSeeT+13,1,0,<holeSeeT+15,>holeSeeT+15,64,0,<holeSeeT+36,>holeSeeT+36,4,0,<holeSeeT+39,>holeSeeT+39,2,0,$ff
wallDT2: !byte <mapT+227,>mapT+227,0,1,<holeSeeT+89,>holeSeeT+89,40,8,<holeSeeT+92,>holeSeeT+92,31,7,$ff
wallDLoT: !byte <wallDT0,<wallDT1,<wallDT2
wallDHiT: !byte >wallDT0,>wallDT1,>wallDT2
wallCells0: !byte $3a,$4a,$5a,$ff
wallCells1: !byte $39,$ff
wallCells2: !byte $e3,$ff   ; each wall's cells, $ff-ended
wallCLoT: !byte <wallCells0,<wallCells1,<wallCells2
wallCHiT: !byte >wallCells0,>wallCells1,>wallCells2
wallStT: !fill 3, 0   ; per wall, global across the chain: 0 = it is there
wsWall: !byte 0                 ; which wall wallTog / wallSink are working on
wsDir:  !byte 0                 ; ...and which way: 1 = taking it out, 0 = putting it back
hzWv:   !byte 0                 ; hzRunW's held "out" value while it reads the "back" one

; ---- wallTog: flip it, either way ----
wallTog:ldy wsWall
        lda wallStT,y
        bne wtBack
        lda #$01
        jsr wtCells             ; doomT[cell] = 1 for the group: the sink's column scan reads it
        lda #$04        ; going: START THE COLLAPSE. The map itself does not change until
        sta wsN                 ;   the last frame of it -- see wallSink.
        lda #$02
        jsr sfxGo               ; only on the way OUT: wtBack is how a restart puts the wall back

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
        lda #$00
        jsr wtCells             ; every cell of the group: blkT from the new mapT (the delta no
                                ;   longer carries blkT or the run tables, since neither travels
                                ;   with a level), and doomT back to 0
        jsr mkRuns              ; ...and the runs renumber wholesale, so re-derive the rest
        inc blkVer              ; the obstacle map moved: the angel's fill must be redone
        lda #$01
        sta entDty              ; ...and the frame redrawn even if nothing else moved
        jmp fallInv             ; renderSym's run cache still believes the old geometry -- a
                                ;   column it thinks is unchanged is a column it will not repaint

; ---- wtCells: walk wall wsWall's cell list: doomT[cell] = A, and blkT[cell] = mapT[cell] ----
wtCells:sta wtDoom+1
        ldy wsWall
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
        sta blkT,x
wtDoom: lda #$00
        sta doomT,x
        iny
        bne wtLd                ; always: a group is far shorter than a page
wtCDn:  rts

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
        ldx #$00                ; doomT is a bank-3 page no file loads: clear it, or the first
        txa                     ;   collapse's column scan matches power-on garbage. (Here rather
dmClr:  sta doomT,x             ;   than at entry because the main block had no room for it.)
        inx
        bne dmClr
        sta wsN                 ; a collapse in progress is abandoned
        ldx #$02   ; EVERY wall in the chain, not just the live level's:
wbLp:   stx wsWall              ;   a wall's triples name LIVE table addresses, so applying one
                                ;   belonging to another level would write that room's bytes into
                                ;   this one. Safe because this routine runs before every lvlSwap,
                                ;   so a level that is not live has wallStT 0 throughout and the
                                ;   branch below skips it -- which is the invariant the whole
                                ;   global-wall-id scheme rests on.
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
        lda doomT,y             ; is the cell this column struck one of the doomed group? (idT's
        beq wsFN                ;   $ff "no cell" reads doomT[255], the border, never doomed)
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
        ; How low may a column go? To the wall BESIDE it, and no lower. The room behind the
        ; doomed wall was never cast -- the ray stopped here -- so sinking past its
        ; surroundings paints flat ceiling and floor colour, which reads as a hole in the
        ; world. The columns just outside the span are the live answer to "what is the wall
        ; around this", and being live they survive the player moving mid-collapse, which a
        ; height captured once at arm time would not.
        ldx wsHi
        cpx #$9f
        beq wfNoR               ; span runs to the right edge: no neighbour that side
        inx
        lda colH,x
        bne wfGotR              ; treat 0 as no neighbour too
wfNoR:  lda #$00
wfGotR: sta wsFlr
        ldx wsLo
        beq wfDone              ; span runs to the left edge
        dex
        lda colH,x
        cmp wsFlr
        bcc wfDone              ; keep the TALLER side, so neither edge opens a gap
        sta wsFlr

        ; Applied PER COLUMN, so the wall does not go all at once: each column clamps as it
        ; reaches the surrounding height, and the ones with least to fall clamp first. The
        ; silhouette eats itself away instead of sinking as a block.
wfDone: lda #$00
        sta wsAny               ; ...and whether ANY column is still falling
        ldx wsHi
wsLp:   lda colH,x
        jsr wsScl
        cmp wsFlr
        bcc wsClamp
        beq wsClamp
        inc wsAny               ; still standing proud of the wall beside it
        jmp wsPut
wsClamp:lda wsFlr               ; level with its surroundings: this column has become the room
wsPut:  sta colH,x
        cpx wsLo
        beq wsScan
        dex
        jmp wsLp
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
        jsr wtOff               ; the collapse has finished: NOW the map really changes
        rts
wsMore: lda #$01
        sta entDty              ; keep the frame alive while it falls...
        jmp fallInv             ; ...and repaint in full, since colH is moving under the cache
wsN:    !byte 0                 ; frames of collapse left
wsT:    !byte 0
wsT2:   !byte 0
wsAny:  !byte 0                 ; any column still above the wall beside it this frame?
wsFlr:  !byte 0                 ; that surrounding height, recomputed live every frame
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
angBlkT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,0,0,0,0,0,0
        ; More per-level manifest bytes, moved here from the $3d40 block when the wider level 2
        ; map grew the run tables and pushed it three bytes past $6100. They are label-addressed
        ; and the manifest carries each chunk's destination, so where they live is free choice.
; THIS level's entity counts, and the offsets derived from them. Every shared loop and every
; boundary test reads one of these instead of an immediate, which is what lets one binary serve
; levels holding different numbers of things. SIX CONTIGUOUS BYTES and one manifest entry -- the
; swap copies the block, so a derived value can never drift from the count it came from.
; nOrbT doubles as the ORB/HOLE boundary in orbXCT/orbYCT because the layout is packed.
lvlNxtT:!byte $04,$ff,$ff,$ff   ; the LEVEL each EXIT leads to, one byte
                                ;   each; $ff = nowhere, and fallChk walks over such a hole
                                ;   rather than dropping you back where you stand
nOrbT:  !byte $04                 ; orbs
nHoleT: !byte $01                 ; hole-like entities: exits then sockets
nExitT: !byte $01                 ; ...of which this many are exits
nOrbM1T:!byte $03                 ; last orb index, for the down-counting loops
nSockT: !byte $05                 ; entity index of the first socket
nAllM1T:!byte $04                 ; last entity index of all
nAllT:  !byte $05                 ; ...and how MANY, which is the one
                                ;   an empty level can state: every loop below counts DOWN from an
                                ;   INDEX, and index 0 means "one entity", never "none"
nPedT:  !byte $01                 ; HOLE-LIKE index where the pedestals
                                ;   start -- hlSet's only way to tell a pedestal from a socket.
                                ;   Equal to nHoleT on a level with none, so the test never fires.
angPerT: !byte $78   ; 60ths between angel steps on THIS level, when it is close
lvlMeT: !byte $01                 ; the level that is live. OUTSIDE the TWOLEV block below,
                                ;   because the HUD's LEVEL line reads it in every build -- a
                                ;   standalone one included, where it is simply a constant. A
                                ;   single-slot chain still CHANGES level, it just never has to
                                ;   search for the slot.
; ---- THE OTHER LEVEL, SITTING IN THE DARK ----
; Level 2's copy of every per-level table, in manifest order, as one blob. lvlSwap EXCHANGES it
; with the live tables, so this holds whichever level you are not standing in. It lives in table
; space (fixed off RELOC) rather than in an image hole, because holes move when the map does --
; which is exactly how the old $609b and $bc00 placements broke the moment a second map existed.
; ONE BLOB PER RESIDENT LEVEL, back to back, each in manifest order and each the same length --
; lvlSwap indexes them by slot, and the slots are the OTHERS list in ascending level order.
; THE SHADOW IS NOT HERE ANY MORE (2026-09-16). It rides in VIC bank 3 as the disk file ILVL, at
; LVLSHADOW = $f500 -- plain RAM under both port modes (only $d000-$dfff is the
; I/O hole), so lvlSwap reads and writes it exactly as it did here, with no port dance. It moved
; because the image ran out: with the socket room (40 merge-hazard cells, 435 bytes of hazard
; tables) as level 1's shadow and the leash per angel, the shadow is 826 bytes, and the
; stream it lived in overran rayOffQS by a kilobyte. Same reasoning as IPIC: data the VIC never
; reads, needing only RAM nothing else touches, and it survives a warm restart because dieKey's
; `jmp entry` reloads nothing -- so after a fall and a RETURN the shadow holds the level you fell
; FROM, exactly as it did in the image.
; Where each chunk belongs when it is live, and how long it is. A length of 0 means 256 -- the
; swap loop counts with cpy, so the wrap does the right thing without a 16-bit counter.
; WHICH LEVEL IS IN WHICH SLOT, RIGHT NOW. lvlSwap exchanges, so every fall permutes the slots
; and no build-time slot number stays true past the first lap -- see lvlNxtT. They must NOT be in
; LVL_TABLES: a table in the manifest is exchanged by the very swap it is describing, which would
; undo each update as it was made.
; Only emitted with TWO OR MORE slots. With one there is nothing to permute -- the transposition
; is its own inverse, the wanted level is always slot 0, and the 31 bytes of search below are 31
; the ceiling does not have.
lvlAtT: !byte $04,$05   ; slot -> the level now in it
lvlBasLoT: !byte $00,$3a
lvlBasHiT: !byte $f5,$f8
lvlDstLoT: !byte <mapT,<holeSeeT,<rowMulT,<bfsDCT,<lvlDimT,<hazSpT,<orbXCT,<orbYCT,<orbX0T,<orbY0T,<angBlkT,<angPerT,<angPerFT,<angFarT,<hlFillT,<sockWallT,<orbTallT,<orbArtT,<orbColT2,<orbHid0T,<lvlNxtT,<nOrbT,<orbOccLoT,<orbOccT,<hazNT,<hazCT,<hazLoT,<hazHiT,<hazLstT,<hazRstT
lvlDstHiT: !byte >mapT,>holeSeeT,>rowMulT,>bfsDCT,>lvlDimT,>hazSpT,>orbXCT,>orbYCT,>orbX0T,>orbY0T,>angBlkT,>angPerT,>angPerFT,>angFarT,>hlFillT,>sockWallT,>orbTallT,>orbArtT,>orbColT2,>orbHid0T,>lvlNxtT,>nOrbT,>orbOccLoT,>orbOccT,>hazNT,>hazCT,>hazLoT,>hazHiT,>hazLstT,>hazRstT
lvlLenT: !byte $00,$e0,$20,$04,$05,$01,$0b,$0b,$04,$04,$80,$01,$01,$01,$07,$03,$04,$04,$04,$04,$04,$08,$0b,$58,$01,$01,$01,$01,$01,$01

; ---- lvlSwap: exchange the live per-level tables with the shadow ----
; X is the byte temp, not the loop index, because that is what makes the inner swap 27 cycles
; instead of 35 -- a memory temp costs two extra absolute accesses per byte and there are
; 826 of them. The table index lives in lsIdx for the same reason.
; Total is a shade over two frames, spent on the one frame the player steps into the hole, where
; fallStep has already taken the screen. An EXCHANGE, not a copy: the level being left survives,
; so the fall runs in both directions and dying never has to reload anything.
lvlSwap:                        ; A = which slot to exchange with
        tax
        lda lvlBasLoT,x         ; the slots are one blob each, back to back, all the same length
        sta lsS+1
        sta lsS2+1
        lda lvlBasHiT,x
        sta lsS+2
        sta lsS2+2
        lda #$00
        sta lsIdx
lsTab:  ldy lsIdx
        lda lvlLenT,y
        sta lsLen
        lda lvlDstLoT,y
        sta lsD+1
        sta lsD2+1
        lda lvlDstHiT,y
        sta lsD+2
        sta lsD2+2
        ldy #$00
lsByte:
lsD:    lda $ffff,y             ; only STA has an abs,y mode -- STX and STY do not -- so both
lsS:    ldx $ffff,y             ;   stores go through A and X is just the holding pen. Doing it
lsS2:   sta $ffff,y             ;   the obvious way, through a memory temp, costs 6 more cycles
        txa                     ;   a byte, which over 826 bytes is most of an extra frame.
lsD2:   sta $ffff,y
        iny
        cpy lsLen               ; lsLen 0 means 256: y wraps to 0 and matches after a full page
        bne lsByte
        ; The shadow is one run of bytes, so it advances by this chunk's length -- but a length
        ; of 0 MEANS 256, and "adc #0" advances by nothing. Six of these chunks are a full page,
        ; so getting this wrong swapped all of them against the same shadow page and left the
        ; live mapT holding some other table's bytes.
        lda lsLen
        beq lsPg                ; a whole page: the low byte is already right
        clc
        adc lsS+1
        sta lsS+1
        sta lsS2+1
        bcc lsNC
lsPg:   inc lsS+2
        inc lsS2+2
lsNC:   inc lsIdx
        lda lsIdx
        cmp #$1e
        bne lsTab
        rts
lsIdx:  !byte 0
lsLen:  !byte 0

; ---- orbColLT / orbColRT: the ball's extent each side of its centre column, per rung ----
; Eighty-four more bytes out of the ORB_SMALL block, for the same reason as everything below: pure
; functions of the ladder, not in the swap manifest. The two-level build with level 1 (44 runs,
; six masks an entity) and the socket room (40 merge-hazard cells, 315 list bytes) as each other's
; shadows overran $4000 by four bytes; these are the smallest self-contained pair that clears it.
orbColLT: !byte 11,12,11,10,9,10,9,8,7,8,5,6,6,5,5,4,3,3,2,2,1,1,23,21,21,19,17,15,13,12,11,11,10,9,8,7,6,5,5,4,3,2
orbColRT: !byte 12,9,10,9,10,7,8,7,6,5,6,5,4,4,3,2,2,1,1,0,0,0,24,22,20,18,16,14,14,11,10,9,8,7,6,6,5,4,3,2,1,0
; ---- runByteT / runBitT ----
; Out of the ORB_SMALL block, which ends at $4000 and was full: both are pure functions of the run
; INDEX rather than of the map, and neither travels in the swap manifest, so they can live in the
; free run below HAZ_BASE. A 28-wide level has 44 runs where a 16-wide one has 24, and four
; NRUN-sized tables in that block overran it by 38 bytes.
runByteT: !byte 0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,7
runBitT: !byte 1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1   ; every id, as mkRuns rebuilds it: split ids come from the hazard lists

; ---- occRT / occLT / occRTW / occLTW ----
; Sixteen bytes, moved here out of the ORB_SMALL block for the same reason runByteT was:
; that block ends at $4000 with nothing spare, so the only way to give the CODE more room
; is to need less of it. They are indexed by a clip column 0-3, are the same on every
; level, and travel in no manifest, so their address is free. What they MEAN is explained
; where they used to sit, next to the glyph scheme they belong to.
occRT: !byte 240,243,242,241
occLT: !byte 237,238,239,240
; the same two, backed by white, for a cell on a wall's vertical silhouette
occRTW: !byte 240,249,248,247
occLTW: !byte 244,245,246,240

; ---- kMskT / mMskT / bbLT / bbRT / orbBitT ----
; Twenty-four more bytes evicted from the ORB_SMALL block, same reason as the four above:
; that block is the only slack the CODE has, so the way to give the code room is to need
; less of the block. All five are small fixed lookups, identical on every level and in no
; manifest, so their address is free. This lever is nearly spent -- what is left in there
; is cellFillT (256 B) and the two 42-byte orb colour tables, which want a real home.
orbBitT: !byte 1,2,4,8,16,32,64,128




kMskT: !byte 0,8,12,14
; synMskT: a cellFillT column mask of the columns left SHOWING (bit 3 = column 0) -> the HIGH bit
; of each COVERED column's pixel pair (column c is bits 7-2c,6-2c), so that (b & $55) << 1 &
; synMskT[m] turns exactly the covered columns' 01 pairs into 11. The 01 -> 11 map is what makes wall pixels stamp ink and leaves 00
; (sky/floor) and 10 (seam) alone.
synMskT: !byte 170,168,162,160,138,136,130,128,42,40,34,32,10,8,2,0
mMskT: !byte 7,3,1,0
bbLT:   !byte $0f,$07,$03,$01
bbRT:   !byte $08,$0c,$0e,$0f




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
        sbc #$dd
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
        adc #$e1
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
; spare in every build that is not TOURW. A jsr per walking span, about 65 cycles a frame.
        ; dp is the perpendicular distance from the player to the wall PLANE, and runPlaneT holds
        ; that plane per run -- a run lies in one plane by construction. sideT picks the axis the
        ; same way calcU does, so the two cannot disagree about which coordinate u is.
        ; Once per span, and only here: 65% of spans die on the uaH/ubH test above without ever
        ; reaching the walk, and paying a multiply for those would cost more than this saves.
ssPwS:  ldx spanL
        ldy faceIdT,x           ; the RUN id. idT holds the CELL id -- that is what seamSpan's
        lda sideT,x             ;   first test compares -- and runPlaneT is indexed by run.
        bne spwX
        lda py                  ; side 0: u runs along Y, so the plane is an X
        sta ssPUL
        lda py+1
        sta ssPU
        lda #$00
        sec
        sbc px
        sta shD
        lda runPlaneT,y
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
        lda runPlaneT,y
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
; before anything asked whether an entity would use it. Exact conditions under which nothing
; can: no un-hidden orb exists, no hole-like entity is in line of sight from this cell
; (holeSeeT is the per-cell LOS bitmap the hole loop already tests, hoisted), and no icon wants
; a slot (the carried orb, a socket animation). This pays on an empty level -- the benchmark --
; and in any corridor with nothing in sight; a level with an orb placed always has something to
; project and takes the full path from the first test. Orbs have no LOS bitmap because they move.
entGate:
        lda carry
        ora sokAn
        bne ogYes
        ldx nOrbT               ; any orb not hidden?
        beq ogHole
ogOrbL: lda orbHidT-1,x
        beq ogYes              ; one is in the world: project
        dex
        bne ogOrbL
ogHole: lda nHoleT              ; no hole-likes on this level: the gate is shut
        beq ogNone
        lda py+1                ; the player's cell, for the LOS test
        jsr mulW
        clc
        adc px+1
        sta pcell
        and #$07
        tay
        lda pcell
        lsr
        lsr
        lsr
        sta rgtL                ; byte within a 32-byte LOS row. rgtL/rgtH are orbProj's,
                                ;   and orbProj has not run yet this frame
        ldx #$00                ; every exit, then every socket: the same set holeOne walks
ogHoLp: txa
        asl
        asl
        asl
        asl
        asl
        clc
        adc rgtL
        stx rgtH
        tax
        lda holeSeeT,x
        and orbBitT,y
        bne ogYes              ; in sight: project
        ldx rgtH
ogHoIn: inx                     ; exactly the set holeOne walks, in the same order
        cpx nHoleT
        bcc ogHoLp
ogNone:
        lda #$00                ; nothing in sight: an empty frame, registers cleared as usual
        sta omEn
        sta omXX
        sta omYY
        sta omPri
        sta omX8
        sta onv
        sec
        rts
ogYes:  clc
        rts
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
        cmp #$c9
        bcc oSPedg              ; a ramp or a step (SOLID is caught below)
        cmp #$dd
        bcc oSPdn               ; a readout: leave it
        cmp #$ed
        bcc oSPsol              ; a seam is a whole wall
        rts                     ; an occluder or scratch code already
oSPedg: cmp #$01
        beq oSPsol
        ldx osSyn
        cpx osLim
        bcs oSPfb               ; this buffer's scratch exhausted this frame: the old whole-column stamp
        sty osPY
        ; source glyph: charset A + code * 8
        sta osSrc
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
        adc #$fa        ; C is still 0
        sta osTmp               ; the code we will store
        txa
        asl
        asl
        asl
        adc #$d0   ; C = 0: X <= 6
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
oSPa:   sta $c7d0,y
oSPb:   sta $cfd0,x
        iny
        dex
        bpl oSPrw
        inc osSyn
        ldy osPY
        lda osTmp
        sta (osPtr),y
        rts
oSPfb:  lda ohMsk               ; fallback: the old rule
        jsr oSBack
        lda osGly
        bcs oSPst
        lda osGlyW
oSPst:  sta (osPtr),y
oSPdn:  rts
oSPsol: lda osGly               ; fully wall: black-backed split, no question to ask
        sta (osPtr),y
        rts
; ---- hazSpFix: the merge-hazard SPLIT ids take their parent run's plane and face ----
; mkRuns's tail. A spare id never appears in mapT's faces, so the two passes cannot give it a
; plane; hazSpT (per level, swapped) says which run it was split from. Until this existed the
; spare slots held whatever the PREVIOUS level's mkRuns had written there (2026-09-17).
hazSpFix:
        ldx #$00
hsfLp:  lda hazSpT,x            ; parent id, or $ff at the end
        cmp #$ff
        beq hsfDn
        tay
        lda runPlaneT,y
        pha
        lda runFaceT,y
        inx
        ldy hazSpT,x            ; the spare id
        sta runFaceT,y
        pla
        sta runPlaneT,y
        inx
        bne hsfLp               ; always: the table is far shorter than a page
hsfDn:  rts
; mkRuns's bit table and scratch. Out of the $9200 block, which the row-counted vertical pass
; (2026-09-17) filled to the byte -- bfsQ sits at its end and the page boundary is hard.
mrBitT: !byte 1,2,4,8,16,32,64,128
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
        lda #$00                ; sin(a) < 0 exactly when bit 7 of a is set, and cos(a) < 0
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
vsSet:  lda #$01
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
        sbc #$dd
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
        adc #$dd
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
        sbc #$dd
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
        adc #$dd
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
        ; recorded at HAZ_BASE's declaration). The stream simply continues, and the assembler's
        ; forward-only origin at rayOffQS ($a900) is the guard: overflow fails the build there.
hzRun:  ldx #$00                ; walk (addrLo, addrHi, value) triples until $ff
hzL:    jsr hzGet
        cmp #$ff
        beq hzRt
        sta hzS+1
        jsr hzGet
        sta hzS+2
        jsr hzGet
hzS:    sta $ffff               ; self-modified: the run-table byte this triple names
        jmp hzL
hzRt:   rts
hzGet:                          ; next byte of the list; every list is well under 256 bytes
hzRd:   lda $ffff,x
        inx
        rts
        ; ---- THE LIVE LEVEL'S SPLIT DATA. Every byte of it is swappable. ----
        ; hazNT is the whole on/off switch: $ff means this level splits nothing, and hazSet then
        ; touches only hazRstT (whose first byte is the $ff terminator), so a level with no
        ; hazards costs one branch. The shared lists are ONE flat run with the pointers held as
        ; offsets into it, rather than a label each, because a label resolves to an address and
        ; the other level's copy has to mean the same thing after it is swapped in.
hazNT:  !byte $ff
hazLoT: !byte 0
hazHiT: !byte 0
hazCT:  !byte 0
hazRstT: !byte $ff
hazLstT: !byte 0
hazSpT: !byte 255   ; (parent, spare) pairs for hazSpFix; $ff ends
        * = $a900
; SIGNED quarter-unit offset from the view centre, |v| < 128, so one byte covers the whole FOV
; and there is no second table. The first cut stored a 10-bit value as lo/hi pairs and the hi
; table landed on $c000 -- which is stackLT, the subdivision's own stack. It rendered fine until
; the recursion got deep enough to reach it, then corrupted every span from mid-screen right.
rayOffQS: !byte 162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,187,188,189,190,191,192,193,194,196,197,198,199,200,201,203,204,205,206,207,209,210,211,212,214,215,216,217,219,220,221,222,224,225,226,228,229,230,232,233,234,235,237,238,239,241,242,243,245,246,247,249,250,251,253,254,255,1,2,3,5,6,7,9,10,11,13,14,15,17,18,19,21,22,23,24,26,27,28,30,31,32,34,35,36,37,39,40,41,42,44,45,46,47,49,50,51,52,53,55,56,57,58,59,60,62,63,64,65,66,67,68,69,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94
        ; Step tables, one page each. Addressed by qA*(LM*LB) + qM*LB + qB, so a full byte of
        ; index -- exactly the case a page crossing taxes, and exactly why they are up here
        ; rather than packed in below the height tables where they used to live.
        * = $a9a0
; ---- lvlStart: put the player at the LIVE level's official start ----
; Boot and every death go through here. dieKey restarts with "jmp entry", but lvlMeT is RAM and
; still names the level you died on, so reading the start from a table indexed by it is what
; makes a death return you to THAT level's spot rather than the build's.
lvlStart: ldx lvlMeT
        dex
        lda lvlStXLoT,x
        sta px
        lda lvlStXHiT,x
        sta px+1
        lda lvlStYLoT,x
        sta py
        lda lvlStYHiT,x
        sta py+1
        lda lvlStAT,x
        sta pa
        lda lvlStAFT,x
        sta paF
        rts
lvlStXLoT: !byte $80,$6e,$80,$80,$80
lvlStXHiT: !byte $02,$04,$01,$03,$01
lvlStYLoT: !byte $80,$dc,$80,$80,$80
lvlStYHiT: !byte $02,$07,$01,$04,$08
lvlStAT:  !byte $19,$db,$20,$00,$00
lvlStAFT: !byte $c0,$00,$00,$00,$00

lvlSprunderT: !byte $0b,$0b,$0b,$00,$00
lvlPalceilT: !byte $01,$01,$01,$0b,$0b
lvlPalseamT: !byte $0b,$0b,$0b,$0e,$0e
        * = $aa00

; PIVOT's lookups live in the three pages PLAN=3 vacates -- stepT1/2/3 are replaced by the
; lo/hi pair up at 0x2900 and emit nothing here. There is no room above the tables (the
; profiler already claims 0x3600 and $c000 is stackLT), so this is the space there is, and it
; is why PIVOT requires PLAN=3.
;
; qToColT: a quarter-unit offset (biased by 128) straight back to a column -- the inverse of
; rayOffQS. This table is what keeps the prediction divide-free; the rectilinear column
; spacing lives here instead of in an atan.
qToColT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,24,25,26,27,28,29,30,31,31,32,33,34,35,36,37,37,38,39,40,41,42,42,43,44,45,46,46,47,48,49,50,50,51,52,53,54,54,55,56,57,58,58,59,60,61,61,62,63,64,64,65,66,67,67,68,69,70,70,71,72,73,73,74,75,76,77,77,78,79,80,80,81,82,82,83,84,85,86,86,87,88,89,89,90,91,92,92,93,94,95,95,96,97,98,98,99,100,101,101,102,103,104,105,105,106,107,108,109,109,110,111,112,113,113,114,115,116,117,117,118,119,120,121,122,122,123,124,125,126,127,128,128,129,130,131,132,133,134,135,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159
        * = $ab00

sinST:  !byte 0,3,6,9,13,16,19,22,25,28,31,34,37,40,43,46,49,52,55,58,60,63,66,68,71,74,76,79,81,84,86,88,91,93,95,97,99,101,103,105,106,108,110,111,113,114,116,117,118,119,121,122,122,123,124,125,126,126,127,127,127,127,127,127,127,127,127,127,127,127,127,126,126,125,124,123,122,122,121,119,118,117,116,114,113,111,110,108,106,105,103,101,99,97,95,93,91,88,86,84,81,79,76,74,71,68,66,63,60,58,55,52,49,46,43,40,37,34,31,28,25,22,19,16,13,9,6,3,0,253,250,247,243,240,237,234,231,228,225,222,219,216,213,210,207,204,201,198,196,193,190,188,185,182,180,177,175,172,170,168,165,163,161,159,157,155,153,151,150,148,146,145,143,142,140,139,138,137,135,134,134,133,132,131,130,130,129,129,129,128,128,128,128,128,128,128,129,129,129,130,130,131,132,133,134,134,135,137,138,139,140,142,143,145,146,148,150,151,153,155,157,159,161,163,165,168,170,172,175,177,180,182,185,188,190,193,196,198,201,204,207,210,213,216,219,222,225,228,231,234,237,240,243,247,250,253
        * = $ac00

; 163/d as a byte, d in 1/16 cells. 163 is the constant that makes the final shift exactly
; 2^15. Saturates at d = 0.639 cells, where the correction is under-applied and that boundary
; falls back to bisection -- harmless, because a missed prediction can only cost probes.
rcpDT:  !byte 255,255,255,255,255,255,255,255,255,255,255,237,217,201,186,174,163,153,145,137,130,124,119,113,109,104,100,97,93,90,87,84,82,79,77,75,72,70,69,67,65,64,62,61,59,58,57,55,54,53,52,51,50,49,48,47,47,46,45,44,43,43,42,41,41,40,40,39,38,38,37,37,36,36,35,35,34,34,33,33,33,32,32,31,31,31,30,30,30,29,29,29,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,24,24,24,24,23,23,23,23,23,22,22,22,22,22,22,21,21,21,21,21,21,20,20,20,20,20,20,19,19,19,19,19,19,19,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10
; The corner-partner tables used to sit at RELOC+$2800, which IS $ae00 -- the page bfsD0 claims
; immediately below. Nothing noticed because they are only emitted when CVXSEAM=0, and that
; config had not been built in a long time; when it was, it died with "* = $ae00 moves backward
; from $ae2a". They live in the stream now, with the other displaced lookups.

        * = $ad00               ; ---- the arc's pixel solver, and the fall's tail ----
; The page the pivot's three scratch tables vacated for VIC bank 3 (see PVBASE), and the only
; free run left in a four-level image big enough to hold fallTail in ONE piece -- the next
; largest is 36 bytes.
;
; arcPx is out here for the room, not for tidiness. FALLTAIL's dispersed edits -- cmp hCap at
; nine sites, fwSrcA's redirect for source rows past 24, fdNoF's bound on arcHi -- cost 72 bytes
; of a main block that has 3. arcPx is a jsr target only and runs once per arc COLUMN during a
; fall, which is a cold path, so the move costs nothing; hlRungH/S/E at $48c3 and fallSnap at
; $9500 are here for exactly the same reason.
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
        lda #$ff                ; no height cap up here: see hCap
        sta hCap
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
        sta hCap
        lda #$00                ; ...and bufOff, which rfStore turns into a chain index. Left at
        sta bufOff              ;   15 it points the NEXT store at entries 28..34 -- the tail's
                                ;   own stubs, which write into fallTailB. The background render
                                ;   of the destination room runs DURING the drop, so this is not
                                ;   hypothetical.
        rts
        ; ---- the tail's data and store stubs ----
hCap:   !byte 101               ; the height cap the cell chooser applies. 101 for the screen,
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

        * = $ae00
bfsD0:  !fill 253, 255      ; the angel's other distance map -- see bfsD1 at $5e00
        * = $af00
; The ninth index bit costs a second copy of every code table plus the thresholds that derive
; it. Each is page-aligned so "lda table,y" stays 4 cycles -- a page crossing here would tax the
; hottest lookup in the renderer. The single-copy rampT/stepT are not emitted at all under
; PLAN=3, which pays back four of these twelve pages.
rampTlo: !byte 0,0,0,0,34,106,51,99,117,165,181,150,150,150,150,63,0,0,0,0,34,106,84,182
        !byte 111,71,71,150,98,98,98,65,0,0,0,0,34,23,84,182,91,71,103,98,98,98,98,65
        !byte 0,0,0,0,115,23,73,137,91,71,103,98,98,98,65,65,85,85,85,39,42,36,124,41
        !byte 102,66,69,98,98,94,94,108,55,55,158,158,26,15,48,110,38,175,112,152,152,94,108,108
        !byte 55,195,195,76,166,72,25,79,185,62,189,125,95,95,108,92,104,114,114,172,93,3,105,2
        !byte 157,12,75,95,95,92,92,100,168,114,167,167,93,122,128,59,21,18,88,6,6,6,118,118
        !byte 120,167,167,162,156,190,47,60,14,19,68,54,29,29,29,57,163,27,162,96,30,30,135,192
        !byte 171,52,17,126,126,20,20,20,27,96,96,196,196,141,101,101,28,78,24,1,1,1,1,1
        !byte 27,96,96,196,196,141,101,101,191,161,24,1,1,1,1,1,27,96,96,196,22,141,101,143
        !byte 191,161,40,1,1,1,1,1,27,160,196,22,22,33,33,143,97,161,40,1,1,1,1,1
        !byte 144,22,22,22,33,33,143,143,97,198,40,1,1,1,1,1
        * = $b000
rampThi: !byte 0,0,0,0,34,23,84,9,111,71,150,63,150,150,98,65,0,0,0,0,34,23,186,182
        !byte 91,71,71,65,98,98,98,65,0,0,0,0,115,23,186,137,91,71,103,65,98,98,98,65
        !byte 0,0,0,0,8,119,73,138,91,71,69,65,98,98,65,65,85,85,39,7,42,142,41,41
        !byte 66,69,69,94,94,94,65,4,158,158,158,58,83,15,147,146,38,62,112,108,108,108,108,149
        !byte 195,178,178,76,164,43,25,81,31,62,125,95,95,108,92,53,114,114,172,93,93,3,44,2
        !byte 155,140,75,187,187,92,100,64,114,167,167,167,156,122,154,139,21,107,193,118,118,118,118,113
        !byte 163,162,162,162,188,30,47,116,61,19,90,29,29,57,57,57,163,27,96,96,30,30,135,192
        !byte 70,132,17,20,20,20,20,20,160,22,22,22,33,33,101,143,97,161,40,1,1,1,1,1
        !byte 96,96,196,196,141,33,101,143,97,161,40,1,1,1,1,1,144,96,196,196,22,33,33,143
        !byte 97,198,40,1,1,1,1,1,144,196,196,22,22,33,143,86,97,198,40,1,1,1,1,1
        !byte 22,22,22,22,11,197,199,86,129,198,40,1,1,1,1,1
        * = $b100
stepT1lo: !byte 183,34,23,84,9,117,165,181,35,183,80,80,138,138,74,74,98,65,183,32,74,74,74,32
        !byte 32,32,4,85,42,36,36,41,102,117,181,35,7,43,142,147,146,38,69,69,94,22,33,33
        !byte 32,32,4,32,151,4,55,26,15,15,41,102,38,103,169,26,83,15,147,110,38,175,112,152
        !byte 22,33,33,143,143,149,151,151,149,195,195,15,15,25,102,185,189,35,178,164,72,25,25,185
        !byte 62,189,125,22,33,33,143,143,151,151,151,53,104,104,3,3,2,91,71,131,35,172,93,3
        !byte 3,2,2,145,75,95,22,33,33,143,143,64,107,127,100,168,168,120,128,182,91,71,131,169
        !byte 167,156,122,128,2,21,12,18,13,22,33,33,143,143,61,107,127,118,121,120,179,179,121,91
        !byte 71,131,35,77,156,122,128,47,14,18,68,67,89,33,33,101,116,61,19,17,29,5,130,179
        !byte 179,179,134,134,37,56,163,180,179,134,37,136,18,68,67,89,180,30,135,192,70,52,17,126
        !byte 5,130,130,179,130,5,179,17,5,27,96,179,134,37,136,136,87,37,10,33,33,101,143,28
        !byte 28,24,17
        * = $b200
stepT1hi: !byte 183,8,80,73,138,91,71,103,63,183,80,80,74,74,74,32,32,65,123,4,4,4,4,4
        !byte 4,4,4,39,42,142,124,41,66,66,103,109,7,43,43,147,81,74,32,32,108,22,33,33
        !byte 32,32,4,151,4,4,58,26,15,48,146,38,38,112,109,26,83,43,147,146,155,140,32,108
        !byte 22,33,33,143,143,149,151,149,149,76,166,15,25,25,185,185,189,109,76,164,43,25,81,155
        !byte 140,151,108,22,33,33,143,143,151,151,151,53,114,93,3,3,2,91,71,131,109,172,93,3
        !byte 105,2,157,140,75,92,22,33,33,143,143,64,127,64,64,120,167,3,128,182,91,71,131,109
        !byte 156,156,122,154,139,21,18,88,6,22,33,33,143,143,61,127,113,113,120,120,179,128,121,91
        !byte 71,131,56,162,188,190,47,116,14,19,90,56,89,33,33,101,61,61,132,57,57,120,130,179
        !byte 134,179,134,134,37,56,96,30,30,135,192,171,19,17,56,196,176,33,101,70,97,132,82,20
        !byte 5,130,179,134,134,37,87,17,56,144,141,134,134,37,133,87,17,56,11,11,197,199,86,97
        !byte 161,40,126
        * = $b300
stepT2lo: !byte 183,34,23,51,9,111,71,150,35,39,8,80,138,138,74,69,98,65,10,8,80,138,74,74
        !byte 32,32,4,85,34,36,36,182,102,71,16,150,39,26,142,147,146,69,69,94,108,39,26,142
        !byte 147,81,74,32,151,4,158,26,15,48,41,102,175,103,169,158,83,15,147,146,38,175,112,109
        !byte 89,26,15,147,81,155,151,151,149,55,195,15,15,15,102,185,189,169,178,164,72,25,25,185
        !byte 185,189,169,89,200,50,25,81,155,151,151,53,104,114,3,3,2,157,177,16,63,114,93,3
        !byte 3,2,157,145,145,131,89,200,50,45,2,155,107,127,100,168,120,167,128,2,21,18,16,63
        !byte 170,156,122,128,2,2,18,18,13,89,200,50,45,59,14,107,127,118,121,120,179,179,2,14
        !byte 18,90,56,77,156,190,128,47,14,12,68,67,89,180,33,101,116,61,19,17,29,5,130,179
        !byte 134,37,136,18,17,56,163,180,30,134,37,136,19,68,67,89,180,50,135,192,70,52,17,126
        !byte 5,130,130,134,37,136,87,17,56,27,27,179,134,37,136,87,87,56,10,200,50,45,174,191
        !byte 161,24,24
        * = $b400
stepT2hi: !byte 49,115,119,49,137,71,16,16,63,39,8,80,138,74,74,74,32,65,10,8,80,138,74,74
        !byte 32,4,4,39,42,142,124,41,66,69,16,109,39,26,43,147,146,74,32,94,108,39,26,142
        !byte 147,81,74,32,151,4,158,83,15,48,146,38,175,109,109,83,43,43,147,146,31,140,108,108
        !byte 10,26,15,147,81,155,151,151,149,178,166,15,25,25,185,177,125,109,164,164,43,25,81,31
        !byte 177,125,173,10,200,50,25,81,155,151,151,53,114,93,3,3,2,157,177,16,63,170,93,3
        !byte 44,2,155,140,75,173,10,200,50,45,2,155,127,100,64,114,167,3,128,2,21,18,16,63
        !byte 77,156,122,154,139,21,107,193,6,10,200,50,45,59,14,127,127,113,120,120,179,128,2,14
        !byte 18,90,56,77,180,190,47,116,61,19,90,56,22,176,176,61,116,61,132,29,57,163,130,179
        !byte 134,37,136,18,17,56,89,180,180,135,192,171,19,17,56,22,176,176,101,70,70,132,82,20
        !byte 5,130,179,134,37,136,87,17,56,144,180,96,135,133,133,87,17,56,11,11,197,199,86,129
        !byte 161,40,126
        * = $b500
stepT3lo: !byte 115,34,106,51,99,99,165,181,35,183,80,119,49,137,91,71,150,150,46,46,65,65,65,65
        !byte 65,16,65,85,148,36,84,9,99,165,181,35,7,43,142,41,41,66,69,69,98,46,46,46
        !byte 108,108,108,108,94,94,158,26,15,15,15,102,102,181,35,83,83,15,48,110,38,38,169,169
        !byte 46,46,46,108,108,108,62,94,108,195,26,15,15,15,102,102,169,169,43,43,43,25,25,185
        !byte 185,169,169,46,46,46,46,46,92,140,75,95,114,93,3,3,114,114,114,169,169,3,3,3
        !byte 3,2,2,145,131,131,46,46,46,46,46,92,140,75,92,168,93,3,128,128,128,128,169,169
        !byte 123,122,122,128,2,21,12,13,13,46,46,46,199,86,118,107,193,6,120,156,122,128,163,163
        !byte 163,169,169,123,188,190,47,60,14,14,68,13,159,159,61,61,61,61,19,90,54,163,156,30
        !byte 30,27,27,27,27,131,196,30,30,135,135,14,19,68,67,159,176,176,70,70,70,132,17,17
        !byte 27,96,96,27,27,27,27,27,27,22,196,141,135,101,28,87,17,17,11,11,197,199,86,97
        !byte 161,24,17
        * = $b600
stepT3hi: !byte 183,115,119,73,182,117,117,181,35,183,80,119,138,138,66,71,103,98,46,46,65,65,65,65
        !byte 65,98,4,7,42,36,124,41,117,102,102,35,7,43,142,146,41,38,69,69,94,46,46,46
        !byte 108,108,108,108,94,4,83,83,15,15,15,102,102,102,169,43,43,43,147,146,38,175,112,169
        !byte 46,46,46,108,108,108,62,108,149,194,166,72,25,25,185,169,169,169,123,43,43,25,81,31
        !byte 62,125,131,46,46,46,46,46,92,140,92,53,172,93,3,3,114,114,114,169,169,123,44,44
        !byte 44,2,155,140,75,184,46,46,46,46,46,92,107,187,64,167,156,122,128,128,128,128,169,169
        !byte 123,123,139,139,139,21,18,88,153,46,46,46,199,86,118,107,193,118,162,156,122,128,163,163
        !byte 163,169,169,159,159,116,116,116,14,19,68,67,11,176,176,61,61,61,132,17,29,162,96,30
        !byte 30,27,27,27,27,131,159,176,176,135,192,171,52,17,17,11,11,197,199,86,129,132,82,20
        !byte 160,200,50,27,27,27,27,27,27,22,33,33,101,143,191,161,24,17,11,11,197,199,86,129
        !byte 198,40,24
        * = $b700
rampThrT: !byte 0,0,0,0,0,1,1,1,2,3,3,7,0,0,6,9,0,0,0,0,0,1,2,0,3,0,0,9,0,0,0,0,0,0,0,0,1,0,2,4,0,0,0,10,0,0,0,0,0,0,0,0,2,3,0,5,0,0,8,11,0,0,0,0,0,0,1,2,0,4,5,0,6,7,0,11,10,0,12,14,1,1,0,2,4,0,6,7,0,9,0,12,12,12,0,15,1,2,2,0,5,6,0,8,8,0,10,12,0,13,14,15,1,0,4,5,0,0,8,0,10,11,0,13,13,0,15,16,2,3,0,0,6,0,8,10,0,12,13,14,15,15,0,16,3,5,5,0,7,9,0,11,12,0,13,15,0,16,16,0,0,0,7,0,0,0,0,0,13,14,0,16,16,0,0,0,7,9,10,11,11,12,0,13,14,15,16,0,0,0,0,0,5,0,9,0,10,12,0,13,15,0,16,0,0,0,0,0,5,0,9,0,0,12,13,0,15,16,0,0,0,0,0,0,6,10,0,0,0,0,14,15,0,16,0,0,0,0,0,0,9,0,0,0,14,15,15,16,16,0,0,0,0,0,0,0
        * = $b800
stepThrT1: !byte 0,1,3,3,3,3,4,4,5,0,0,0,7,8,0,11,11,0,11,15,14,15,14,14,14,15,0,1,0,3,4,0,6,3,5,6,0,0,6,0,8,9,11,11,13,0,0,0,0,0,0,14,15,0,2,0,0,5,6,6,0,7,6,0,0,6,0,7,9,10,11,11,0,0,0,0,0,0,0,15,0,2,3,0,5,0,6,0,0,6,4,0,6,0,7,9,11,11,12,0,0,0,0,0,0,0,0,0,1,3,0,0,0,0,0,0,3,0,0,0,7,0,9,11,0,13,0,0,0,0,0,0,14,15,16,1,1,3,0,0,0,0,0,5,5,0,0,8,9,0,11,12,13,0,0,0,0,0,0,14,15,16,1,0,0,5,0,0,0,0,3,6,7,8,8,10,0,12,13,14,0,0,0,0,13,0,14,15,16,1,0,0,5,0,0,0,0,0,6,8,8,9,10,11,12,13,14,9,11,12,12,13,14,14,15,16,0,0,3,5,3,1,5,0,5,6,8,6,0,0,11,11,13,11,12,15,15,15,15,14,14,15,15
        * = $b900
stepThrT2: !byte 3,1,2,2,3,5,6,6,5,0,0,0,0,8,0,10,12,0,0,0,0,0,0,0,0,15,0,1,1,3,4,4,5,6,0,7,0,0,6,0,0,9,11,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,6,6,0,8,9,5,6,6,0,0,9,10,11,12,8,0,0,0,0,0,0,0,0,1,3,0,5,5,6,7,8,8,5,0,6,0,7,8,9,10,10,8,0,0,0,0,0,0,0,0,1,3,0,0,0,0,0,0,0,4,0,0,7,0,9,10,11,11,8,0,0,0,0,0,14,15,16,1,3,4,0,0,0,0,0,0,5,0,0,8,9,9,11,12,12,8,0,0,0,0,0,14,0,16,1,0,0,5,0,0,0,0,0,0,6,0,9,10,11,11,13,14,9,9,13,13,0,0,14,15,16,1,0,0,0,0,0,0,0,0,6,0,8,8,10,11,0,13,14,9,10,11,12,13,0,14,15,16,0,0,3,0,0,0,0,0,0,6,7,7,9,10,11,0,13,0,12,13,13,14,14,15,0,16,12
        * = $ba00
stepThrT3: !byte 2,1,2,2,1,1,1,0,0,0,0,0,5,5,5,0,6,7,0,0,0,0,0,0,0,9,14,1,2,0,3,3,2,3,3,0,0,0,0,6,0,7,0,0,10,0,0,0,0,0,0,0,0,15,3,3,0,0,0,0,0,3,4,6,6,6,6,7,0,8,7,0,0,0,0,0,0,0,0,12,15,3,4,5,5,5,5,5,0,0,7,0,0,0,7,8,8,9,7,0,0,0,0,0,0,0,13,14,4,0,0,0,0,0,0,0,0,8,7,7,7,0,9,10,10,9,0,0,0,0,0,0,13,13,15,4,6,6,0,0,0,0,0,0,0,9,9,9,9,0,11,11,11,0,0,0,0,0,0,0,0,14,4,0,0,0,0,0,0,0,0,11,11,10,11,11,0,12,0,11,14,14,14,0,0,0,14,14,15,4,7,0,0,0,0,0,0,0,11,10,10,0,11,12,13,13,13,15,15,15,15,15,15,0,15,15,6,9,8,0,0,0,0,0,0,0,12,12,12,13,14,14,14,0,0,0,0,0,0,16,16,16,15
        * = $bb00
clamp8T: !byte 0,1,2,3,4,5,6,7,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0

; The image used to be padded out to $bfff to buy load-time headroom -- the staged copy of the
; compressed stream was pinned to the image's top, so a taller image lifted it. There is no
; staged copy any more, so the padding bought nothing and cost a kilobyte of disk and load time.

        ; ---- dieChk and dieGo, relocated ----
        ; Another jsr target, out of the main block because the cut scene needs those bytes.
        ; $bc00 is a whole free page and now uncontested: the merge-hazard lists used to claim
        ; the same address and only fitted because level 1 has no hazard cells. They live in
        ; table space now (see HAZ_BASE), which is the same address on every map.
        * = $bc00
; ---- dieChk: is the mark still on, and has the player nearly turned far enough? ----
; The mark is SET by angOne when a step lands beside the player -- caused by the ANGEL moving,
; which is what makes walking into one harmless. Here we only LIFT it, and fire.
; The trigger is ONE angle comparison. Contact hides the angel outright, so there is no sprite to
; see and nothing to project -- turn DIE_TURN either way and the cut scene fires.
dieChk: lda dieSt               ; once it has started, the only thing left to do here is repaint
        beq dckIdl              ;   the sprites. obC is rewritten by orbMove every frame and
        lda dieInk              ;   flushed to $d027+n after us, so this is the last word on it.
        jmp dckPnt              ; the scene owns everything else: nothing live to check
dckIdl: lda idolHd              ; ---- and the MID-TONE follows the idol as well ----
        beq dckLive             ; $d025/$d026 are shared and sprPal already tints them, but the
        lda #$08              ;   body is per-sprite ($d027+n, out of obC) and kept the
        jsr dckPnt              ;   level's grey, which reads as disjoint against the brown and
                                ;   yellow around it. Orbs and angels both, for the same reason.
                                ; jsr, NOT a tail jump: carrying the idol this ran and RETURNED,
                                ;   so the live check below never happened and an angel could
                                ;   walk up to you all day without killing you.

dckLive:
        sec                     ; the turn they are ACTUALLY making, as a signed 16-bit rate over
        lda paF                 ;   pa:paF. The whole-byte version dropped the fraction, and the
        sbc dieOpaF             ;   fraction is most of it -- a hand turn is 3/4 of a unit a tick.
        sta dieDirF             ;   The scene then continues at exactly the speed they had.
        lda pa
        sbc dieOpa
        sta dieDir
        lda paF
        sta dieOpaF
        lda pa
        sta dieOpa
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
        sec                     ; THE WHOLE TRIGGER: did they turn far enough since it cornered
        lda pa                  ;   them? The angel is hidden, so there is no sprite to see and
        sbc markPa              ;   nothing to project. Turn 30 degrees either way and you die.
        bpl dcPos
        eor #$ff
        clc
        adc #$01
dcPos:  cmp #$15
        bcc dcNo
dcGo:                           ; also the entry DIENOW uses, so the test path is the real one
dieGo:  lda dieDir
        bne dgD
        lda #$01                ; not turning: give the face a side to come from anyway
        sta dieDir
dgD:    ; ---- which way round, and unhide it ----
        ; A marked angel is HIDDEN -- that is how contact works -- so the scene is where it comes
        ; back. The cell delta is one of eight neighbours; angBearT turns that into a bearing, and
        ; the signed difference from the current heading gives both the direction to turn and a
        ; first estimate of how far. dieOff starts far from centre so the stop cannot fire early.
        lda #$01                ; ---- ONE FRAME OF WHITE, ceiling and floor together ----
        jsr setGnd              ; setGnd writes colW AND colF, so both halves flash on the SAME
                                ;   frame -- they used to change on different ones. The ramp
                                ;   below takes it down from here, so the white lasts exactly the
                                ;   frame the angel reaches you, and the sprites lose the idol's
                                ;   fire on the same frame (sprPal stands down once dieSt is set).
        lda #$ff                ; unsigned "never projected", far outside the lock window
        sta dieOff
        lda #$ff
        sta dieRem
        lda marked
        beq dpDn
        ldx amIdx
        stx dieIdx              ; the one entity dieOff is allowed to come from
        lda #$00
        sta dieLk
        jsr snTone              ; the dissonance starts with the grab

        lda #$00
        sta orbHidT,x
        sec
        lda orbXCT,x            ; dx+1, in 0..2
        sbc px+1
        clc
        adc #$01
        sta dieCl
        sec
        lda orbYCT,x            ; (dy+1)*3
        sbc py+1
        clc
        adc #$01
        sta dieCy               ; dy+1, kept: *3 needs it twice
        asl                     ; 2(dy+1)
        clc
        adc dieCy               ; 3(dy+1)
        clc
        adc dieCl               ; + (dx+1)
        tax
        lda angBearT,x
        sec
        sbc pa                  ; shortest way round: the sign of the difference is the way to go
        sta dieCl
        ; dieDir is the HIGH BYTE OF A RATE now, not a direction flag. Storing +-1 into it left
        ; pa:paF advancing by $01xx or $FFxx a frame -- and $FFxx is minus a quarter of a unit, so
        ; the turn crawled backwards and never arrived. Keep the captured rate; only its SIGN is
        ; ours to choose.
        lda dieDir
        ora dieDirF
        bne dpHav               ; they were mid-turn, so there is a real rate to continue
        lda #$c0   ; ...and if they were not, a hand-speed default
        sta dieDirF
        lda #$02
        sta dieDir
dpHav:  lda dieCl
        eor dieDir
        bpl dpDn                ; already heading the short way round
        sec                     ; otherwise negate the whole 16-bit rate, magnitude intact
        lda #$00
        sbc dieDirF
        sta dieDirF
        lda #$00
        sbc dieDir
        sta dieDir
dpDn:   lda #$00                ; AFTER the branch above, not inside it: skipping it left the
        sta marked              ;   player marked through the whole cut scene when they WERE turning
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
        inc dieN                ; how many pictures this death earns; dshEnd resets it after the
        lda #$01                ;   last one, so the sequence starts over rather than running out
        sta dieSt
        lda frameCnt
        sta dieT0
        lda #$ff
        sta dieTck              ; no tick written yet
        rts
dcClr:  ldx amIdx               ; out of reach again: the sentence lifts and it comes back
        lda #$00
        sta orbHidT,x
        sta marked
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
picPut: ldx dieP
        lda picLoT,x
        sta ppRd+1
        lda picHiT,x
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
picOn:  jsr snBoom
        lda #$0c
        jsr setGnd
        lda #$0b
        sta $d022
        lda #$0f
        sta $d023
        rts

; ---- dieKey: RETURN restarts, from anywhere ----
dieKey: lda #$ff
        sta $dc00
        lda $dc01
        eor #$ff
        sta dkJoy               ; the stick shares these lines, same as palKeys and orbKey
        lda #$fe
        sta $dc00
        lda $dc01
        ora dkJoy
        and #$02                ; RETURN
        bne dkNo
        ldx #$ff                ; jumping out of a jsr chain, so drop the stack first
        txs
        jmp entry
dkNo:   lda #$ff
        sta $dc00
        rts

        ; 256 bytes, so it goes above the image with the rest rather than into the per-variant
        ; block, which it overflows. It is gated on ANGMID and nothing else -- it was once written
        ; inside the six-sprite angel's table block, and gating a table on one flag while its use
        ; site is gated on another broke the DEFAULT build outright.
        * = $be00
angMidT: !byte 3,3,2,2,1,1,0,0,0,1,0,0,255,1,0,0,255,0,0,0,1,0,0,255,0,0,0,1,0,0,255,0,0,0,1,0,0,255,1,0,0,255,0,0,0,1,0,0,255,0,0,0,255,255,1,1,0,0,0,255,255,1,1,1,0,0,255,255,1,1,1,0,0,255,255,2,1,1,0,0,255,255,255,1,1,0,0,255,255,255,1,1,0,0,0,255,255,1,1,0,0,0,255,255,254,254,253,253,253,252,252,251,251,251,250,250,249,249,248,248,248,247,247,246,246,246,245,245,244,244,243,243,243,242,242,241,241,240,240,240,239,239,238,238,238,237,237,236,236,235,235,235,234,234,233,233,232,232,232,231,231,230,230,230,229,229,228,228,227,227,227,226,226,225,225,225,224,224,223,223,222,222,222,221,221,220,220,219,219,219,218,218,217,217,217,216,216,215,215,214,214,214,213,213,212,212,211,211,211,210,210,209,209,209,208,208,207,207,206,206,206,205,205,204,204,204,203,203,202,202,201,201,201,200,200,199,199,198,198,198,197,197,196,196,196,195,195,194,194,193,193,193,192,192,191,191
        * = $bf00
qcosT: !byte 255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,254,254,254,254,254,253,253,253,253,252,252,252,252,251,251,251,250,250,250,249,249,249,248,248,248,247,247,246,246,245,245,245,244,244,243,243,242,242,241,241,240,239,239,238,238,237,237,236,235,235,234,233,233,232,231,231,230,229,229,228,227,227,226,225,224,224,223,222,221,220,220,219,218,217,216,215,215,214,213,212,211,210,209,208,207,207,206,205,204,203,202,201,200,199,198,197,196,195,194,193,192,191,190,189,188,186,185,184,183,182,181,180,179,178,177,175,174,173,172,171,170,168,167,166,165,164,162,161,160,159,157,156,155,154,152,151,150,149,147,146,145,144,142,141,140,138,137,136,134,133,132,130,129,128,126,125,123,122,121,119,118,117,115,114,112,111,109,108,107,105,104,102,101,99,98,97,95,94,92,91,89,88,86,85,83,82,80,79,77,76,74,73,71,70,68,67,65,64,62,61,59,58,56,55,53,51,50,48,47,45,44,42,41,39,38,36,34,33,31,30,28,27,25,24,22,20,19,17,16,14,13,11,9,8,6,5,3,2
