
charset = $d000        ; where the VIC reads them: under the I/O hole
charsetB = $d800
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
dtv     = $8050
dtm     = $8059                  ; elapsed ticks scaled for movement, and for turning
dtt     = $805a
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
skL     = $87                   ; --- seam pass scratch, all dead outside seamSpan ---
skH     = $88                   ; the seam's world coordinate k, as 8.8
uaL     = $89                   ; u at spanL / spanR
uaH     = $8a
ubL     = $8b
ubH     = $8c
saL     = $8d                   ; |u_L - k| and |u_R - k|, squeezed to 8 bits
saH     = $8e
sbL     = $8f
sbH     = $90
sPlo    = $91                   ; P = a*h_L, and the running sum P+Q
sPhi    = $92
sSlo    = $93
sShi    = $94
ssK     = $95                   ; current boundary coordinate, and how many are left
ssN     = $96
ssW     = $97                   ; span width in columns
ssAng   = $9d
mp      = $98                   ; mul8 operands / product
mq      = $99
plo     = $9a
phi     = $9b
cx0     = $82                   ; collision box corners, in map cells
cx1     = $83
cy0     = $84
cy1     = $85
; $0400-$04e0 is ALSO where the self-extracting loader copies its decoder and runs it, so these two
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
cqN     = $80f3                 ; entries in the colour queue
cqp     = $3e                   ; 2 bytes: colour RAM pointer, flush only
cqLo    = $8100                 ; colour queue: address low, high, and the value to write.
cqHi    = $8140                 ; Written after the buffer flip, never inline -- colour RAM is
cqCol   = $8180                 ; NOT double buffered, so an inline write repaints the frame
                                ; still on screen. That is the shimmer the old pairing hit.
pfAcc   = $7e00                 ; PROFILE: 13 phases x 3 bytes, raster lines summed
pfPrvF  = $7e30                 ; previous timestamp: frame counter, then raster line
pfPrvL  = $7e32
pfCurH  = $7e36                 ; ninth raster bit, current and previous
pfPrvH  = $7e37
pfTmp   = $7e38
pfTmp2  = $7e39
pfN     = $7e3c                 ; frames accumulated so far -- ONE byte. It is incremented and
                                ;   the WRAP to zero is what counts 256 (inc pfN / bne / inc pfDone),
                                ;   so pfDone is the high byte in effect. The comment here said
                                ;   "2 bytes" and pfDLo sits at $7e3d, which made the new overlap
                                ;   guard fire -- correctly, on the comment rather than the code.
pfCurF  = $7e3a                 ; scratch for one timestamp read and the delta
pfCurL  = $7e3b
pfCurX  = $7e3f
pfDLo   = $7e3d
pfDHi   = $7e3e
pfRow   = $7e34
pfDone  = $7e35
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
pvBnd   = $ad00                 ; the column the boundary was pinned at
pvAng   = $ad40                 ; its WORLD bearing as a byte angle, pa + rayOffT[col]
pvRcp   = $ad80                 ; 163/distance, for the translation term
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
omEn    = $851b
omXX    = $851c
omYY    = $851d
omPri   = $851e
omX8    = $851f
omBit   = $8520
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
osI     = $85f4                 ; orbStamp: slot being stamped, and how many there are
osN     = $85f5
osL     = $85f6                 ; the span/box intersection being stamped
osR     = $85f7
osRow   = $85f8                 ; char row range
osRowB  = $85f9
ohFst   = $8595                 ; the stamp's two edge glyphs, chosen once per span
ohLst   = $8596
osDC    = $85fb                 ; orbStamp: the de-seam's current cell column
oSCnt   = $85fc                 ; DBGORB: cells stamped this frame, orbs that entered the walk,
oSOrb   = $85fd                 ;   and spans visited -- the three numbers the cost is made of
oSSpn   = $85fe
ohSv    = $85fa                 ; span right edge / row counter, reused
osPtr   = $9e                   ; SHARES ocptr: the candidate walk is finished by the time
                                ;   orbStamp runs, so its pointer is free
omptr   = $87                   ; 2 bytes: this orb's occluder mask. Deliberately SHARES oaL/oaH,
                                ;   the multiply accumulator, which is dead once the projection
                                ;   has produced a column range -- the same aliasing the original
                                ;   used. Anything calling oabs after this point would break it.
ohRun   = $85f0                 ; the run id, held across the mask-byte lookup
ohL     = $85f1                 ; the span being tested: its left column, and the index into bndT
ohBX    = $85f2
ohDbg   = $85f3                 ; ORBOCCDBG: furthest stage any orb reached this frame
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
        ; loader decodes it STRAIGHT into $d000 with the port at $34. All that is left to do here is
        ; build the mirror, charset B, from the copy already in place.
        ;
        ; The port goes to $34 -- mode 4, RAM everywhere -- for the duration. Interrupts are still
        ; off (this is well before cli) and nothing here touches I/O, which is the only reason it
        ; is safe to have the VIC's registers unmapped for the duration (2KB read, 4KB written).
        ;
        ; ORDER MATTERS AND IT IS SUBTLE. The colour-RAM fill above had to run with I/O MAPPED,
        ; because colour RAM is a separate 1K chip at $d800-$dbff. Charset B also lives at $d800 --
        ; in the DRAM underneath, which is what the VIC reads. Two different memories at one
        ; address, each reached in a different port mode, and the writes above and below must not
        ; be swapped.
        lda #$34
        sta $01
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
        lda #$35                ; back to mode 5: I/O mapped, both ROMs still out
        sta $01
        lda #$00
        sta $d01a
        lda $dd00               ; VIC bank 3 ($c000-$ffff). The bits are INVERTED, so bank 3 is
        and #$fc                ; %00 -- "and", where bank 0 was "ora #$03".
        sta $dd00
        lda #$1b
        sta $d011
        lda #$18
        sta $d016               ; MCM: multicolor text -> 4 logical px per cell, 2 physical px each
        lda #$80
        sta d018vm              ; display buffer A; IRQ ORs the charset bits per half-screen
        lda #$84
        sta $d018
        ; Three inks, one register each, and each held in a variable so keys 1/2/3 can walk it
        ; round the palette. Bit pair 11 is unused -- see the charset note.
        lda #$01
        sta colW
        sta $d021               ; 00 = ceiling and floor
        lda #$00
        sta colB
        sta $d022               ; 01 = walls (and the readout glyphs, which are wall-coloured)
        lda #$0b
        sta colS
        sta $d023               ; 10 = panel seam. Its own register precisely so the tone can
                                ; be retuned without touching a charset entry.
        ; ---- orbs: static sprite setup. Position and shape change per frame in orbMove.
        lda #$00
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
        lda #$80
        sta px
        lda #$01
        sta px+1
        lda #$80
        sta py
        lda #$01
        sta py+1
        lda #$00
        sta pa
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
        jsr tickDelta
        jsr readKeys


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
        lda py+1                ; the DDA's starting cell, once for the whole frame
        asl
        asl
        asl
        asl
        clc
        adc px+1
        sta cell0
        lda pa                  ; pa*4 once a frame, not once a ray -- it is constant across
        asl                     ; the whole frame and the rays only add their own offset
        sta paqL
        lda #$00
        rol
        asl paqL
        rol
        sta paqH
        lda #$00                ; explicit: the clears above leave A holding their own fill
        sta nbnd

        jsr pivPrep             ; marches 0 and 159, then a bracket per predicted boundary,
                                ; and leaves the stack holding the spans between them
subLp:  ldx sp
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
        ; ...but only if the corner is CONCAVE, an inside corner where two perpendicular faces
        ; meet. There the two walls sit at the same depth, so it is black meeting black and the
        ; line is the only thing dividing them. A CONVEX corner -- the end of a receding wall,
        ; the kind you cannot see around -- is already drawn by the silhouette, which steps 20+
        ; rows at that column. The grey line adds nothing to a boundary that emphatic, so
        ; convex corners are left seam-free and render as plain two-black steps.
subCv:  lda spanR
        lsr
        lsr
        tax
        lda seamT,x
        cmp #$01       ; still a plain fill? one seam line per cell
        bne subCn               ; a line is already claimed in this cell; one per char code
        lda spanR
        and #$03
        clc
        adc #$f5
        sta seamT,x
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
        lda remHiT,y
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
        sta tmp
        lda spanR
        lsr
        lsr
        tax                     ; cell = spanR/4
        lda cstepT,x
        and #$03                ; bit 7 is subBnd's "delimiter inside this cell" mark, not a
        bne subLp               ; position -- first POSITION in a cell still wins
        lda cstepT,x
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
        jmp subFin

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
        jsr orbMove             ; once a frame: project every candidate the cell lists
        jsr renderSym
        jsr orbStamp            ; AFTER renderSym: it overwrites cells renderSym just drew
        jsr drawFps
        jsr drawDbg

        inc renderCnt
        lda renderCnt
        cmp #16
        bcc noFps
        jsr computeFps
        lda #$00
        sta renderCnt
noFps:
mvs:    lda $d012
        cmp #250
        bne mvs
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


        ldx #39                 ; X = cell column throughout; the chains use it as their index
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
rfEdgeL:
        ldy erow
        lda kTabT,y
        sta kr
        ldx colc
        lda col4T,x
        tax                     ; X = 4*column -> logical column of this cell
        lda colH,x              ; cap here, not over all 160 columns: (h + K) has to fit a
        cmp #101                ; signed byte, and colH is deliberately left uncapped so the
        bcc rfCp0               ; interpolator's merged spans stay linear
        lda #100
rfCp0:  clc
        adc kr
        tay
        lda clmp16,y
        sta hh0                 ; left level, already shifted into the high nibble
        lda colH+3,x
        cmp #101
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
        cmp #101                ; same cap as the endpoints: (h + K) must fit a signed byte
        bcc rmpM1
        lda #100
rmpM1:  clc
        adc kr
        tay
        lda clamp8T,y           ; the LEVEL 0..8, not clampT's 0..15 clamp index
        sta cmtmp
        lda colH+2,x
        cmp #101
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
        cmp #101                ; same cap as the endpoints: (h + K) must fit a signed byte
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
        bcc rfEdgeL
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
        bpl rfCol
        rts

; calcM: A = w1 + w2, the two columns the bucket index does not carry. Same cap and clamp the
; endpoints get -- (h + K) must fit a signed byte, and clampT is the only thing that turns a
; height into a level. A subroutine rather than inlined twice: 12 cycles of jsr/rts against
; ~40 bytes duplicated, on a path that already costs ~50.
calcM:  ldx colc
        lda col4T,x
        tax
        lda colH+1,x
        cmp #101
        bcc cm1
        lda #100
cm1:    clc
        adc kr
        tay
        lda clamp8T,y           ; the LEVEL 0..8, not clampT's 0..15 clamp index
        sta cmtmp
        lda colH+2,x
        cmp #101
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
        and #$09
        sta pkNew
        lda #$fd
        sta $dc00
        lda $dc01
        ora pkJoy
        eor #$ff
        and #$01
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
        lda pkEdge
        and #$01
        beq pk2
        inc colW
        lda colW
        and #$0f
        sta colW
        sta $d021
pk2:    lda pkEdge
        and #$08
        beq pk3
        inc colB
        lda colB
        and #$0f
        sta colB
        sta $d022
pk3:    lda pkEdge
        and #$04
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
        ; LEFT SHIFT: run. 3 cells/s and 120 deg/s, against 1 and 60 walking -- movement and
        ; turning get their own multipliers so running does not spin the world faster than it
        ; moves through it. Scaling elapsed TIME rather than the step keeps both frame-rate
        ; independent for free.
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
        lda #$00
        sta dxs
        sta dxsH
        sta dys
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
        ; ROUND TOWARD ZERO, not toward negative infinity. The shift below is arithmetic, so it
        ; floors -- and floor(v/16) + floor(-v/16) = -1 for any v that is not a multiple of 16.
        ; That makes a step forward and a step back NOT inverses: each pair loses one unit of
        ; 1/256 cell on every axis whose product is not a multiple of 16, always toward -x/-y.
        ; Wiggling back and forth therefore walked the player slowly north-west, which reads as
        ; a sideways drift whose SCREEN direction depends on facing -- the same world-space bleed
        ; projecting left at one heading and right at another.
        ;
        ; Biasing a negative value by 2^SHIFT-1 before an arithmetic shift truncates toward zero,
        ; which makes the two directions exact mirrors. The sign is already known in dxSgn/dySgn,
        ; so this is two conditional 16-bit adds once a frame. Verified with WIGGLE=1.
        lda dxSgn
        beq maBy
        clc
        lda dxs
        adc #$0f
        sta dxs
        lda dxsH
        adc #$00
        sta dxsH
maBy:   lda dySgn
        beq maBd
        clc
        lda dys
        adc #$0f
        sta dys
        lda dysH
        adc #$00
        sta dysH
maBd:   ldx #4      ; arithmetic shift: cmp #$80 puts bit 7 back into carry
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
        cmp #16
        bcs mvBlk
        lda cx1
        cmp #16
        bcs mvBlk
        lda cy0
        cmp #16
        bcs mvBlk
        lda cy1
        cmp #16
        bcs mvBlk
        lda cy0                 ; all four corners must be open
        asl
        asl
        asl
        asl
        sta tmp
        ora cx0
        tax
        lda mapT,x
        bne mvBlk
        lda tmp
        ora cx1
        tax
        lda mapT,x
        bne mvBlk
        lda cy1
        asl
        asl
        asl
        asl
        sta tmp
        ora cx0
        tax
        lda mapT,x
        bne mvBlk
        lda tmp
        ora cx1
        tax
        lda mapT,x
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
        lda spanR
        sec
        sbc spanL
        cmp #$02
        bcc ssDn                ; adjacent columns: nothing between them to mark
        sta ssW                 ; span width in columns
        ; Cheap reject FIRST. idT already holds the hit cell at both ends, and the cell
        ; coordinate along the face is the whole question: same cell, no boundary. 65% of
        ; spans stop on this test, which is exactly why u is derived here instead of in
        ; marchCol -- computing it for all 19 marched columns spent ~2850 cycles a frame
        ; to use about a third of the answer.
        ldx spanL
        lda idT,x
        ldx spanR
        cmp idT,x
        beq ssDn                ; identical cell -> no boundary. A run is a contiguous line
                                ; of cells along ONE plane, so its cells can only differ in
                                ; the coordinate that runs along the face -- comparing the
                                ; raw cell ids is exactly the boundary test, no masking.
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
        bcc ssUp
        ; descending: boundaries at uaH, uaH-1, ... ubH+1
        lda uaH
        sta ssK
        lda uaH
        sec
        sbc ubH
        jmp ssCnt
ssUp:   lda uaH                 ; ascending: boundaries at uaH+1 ... ubH
        clc
        adc #$01
        sta ssK
        lda ubH
        sec
        sbc uaH
ssCnt:  cmp #17
        bcs ssDn                ; more than 16 cells of wall in one span means u is junk
        sta ssN                 ; (castRay's far/guard exits leave remL/remH meaningless)
        ; Every boundary this walk emits is INTERIOR to the run: uaH/ubH are the cells the two
        ; end rays land in, so the outer edges of the wall are never crossed between them. The
        ; corner at the end of a receding wall is marked by subFace instead, which is where it
        ; gets suppressed.
ssLp:   jsr seamOne
        dec ssN
        beq ssDn
        lda uaH                 ; step k toward the far end
        cmp ubH
        bcc ssKup
        dec ssK
        jmp ssLp
ssKup:  inc ssK
        jmp ssLp
ssDn:   rts

; One boundary, at world coordinate ssK. Leaves seamT marked if it lands on a free cell.
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
ssOff:  sta mq                  ; offset = (t * width) >> 8, rounded
        lda ssW
        jsr mul8
        lda plo                 ; round to nearest column: truncating biased every seam a
        cmp #$80                ; column low, which reads as the whole wall being off by one
        lda phi
        adc #$00
        clc
        adc spanL
        cmp #160
        bcs ssOne               ; off screen; cannot happen, but a stray write would corrupt
        tay                     ; Y = the seam's logical column
        tya
        lsr
        lsr
        tax                     ; cell column
        lda seamT,x
        cmp #$01       ; still a plain fill? one seam line per cell
        bne ssOne               ; already spoken for: one line per char code
        tya
        and #$03
        clc
        adc #$f5
        sta seamT,x
ssOne:  rts

; u for one marched column (X): where along the wall the ray landed, 8.8 cells.
; A y-face is a wall of constant y, so the coordinate that varies along it is x, and vice
; versa. u = p + d*dir, one sideMul: sideMul(fr, m) returns fr/256 * m, so feeding it |cos|
; (or |sin|) as 0..255 against the parked hit distance gives exactly d*|dir|. The sign comes
; from the same posXT/posYT the DDA used to choose its step. sideMul eats X, hence ssAng.
calcU:  lda remLoT,x
        sta mlo
        lda remHiT,x
        sta mhi
        lda pa
        clc
        adc rayOffT,x
        sta ssAng
        lda sideT,x
        bne cuX
        ldx ssAng
        lda absSinT,x
        sta fr
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
friSto: sta faceIdT,x           ; X still col: the run-table branch above only uses A and Y
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
        tax
        ldy rqL
        cpx #$00                ; NOT a bare BEQ: the LDY above sets Z from rqL, not from the
        beq faP0                ; page, and without this the dispatch branches on the index
        dex
        beq faP1
        dex
        beq faP2
        lda ddxLoTQ+768,y
        sta ddx
        lda ddxHiTQ+768,y
        sta ddxH
        lda ddyLoTQ+768,y
        sta ddy
        lda ddyHiTQ+768,y
        sta ddyH
        jmp faDn
faP0:   lda ddxLoTQ,y
        sta ddx
        lda ddxHiTQ,y
        sta ddxH
        lda ddyLoTQ,y
        sta ddy
        lda ddyHiTQ,y
        sta ddyH
        jmp faDn
faP1:   lda ddxLoTQ+256,y
        sta ddx
        lda ddxHiTQ+256,y
        sta ddxH
        lda ddyLoTQ+256,y
        sta ddy
        lda ddyHiTQ+256,y
        sta ddyH
        jmp faDn
faP2:   lda ddxLoTQ+512,y
        sta ddx
        lda ddxHiTQ+512,y
        sta ddxH
        lda ddyLoTQ+512,y
        sta ddy
        lda ddyHiTQ+512,y
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
        jmp cydo                ; negative: m IS the side distance, and the inlined
                                ; multiply above now writes it straight into sdx
cxpos:  lda #$01
        sta stpX
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
        lda #$f0                ; -16: one cell row back
        sta stpY16
        jmp cySat               ; negative: m IS the side distance, so there is nothing to
                                ; subtract -- but the saturation below still has to run
cypos:  lda #$01
        sta stpY
        lda #$10                ; +16: one cell row on
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
        ldy #24
        ldx cell
cdda:   lda sdxH
        cmp sdyH
        bcc cstepX
        bne cstepY
        lda sdx
        cmp sdy
        bcc cstepX
        beq cstepX
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
cstepX: clc
        lda sdx
        adc ddx
        sta sdx
        lda sdxH
        adc ddxH
        sta sdxH
        bcc cxNs
        lda #$ff
        sta sdx
        sta sdxH
cxNs:   txa
        clc
        adc stpX
        tax
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
        sta ppHi                ; 0..2: which page inside this column's group
        ldx col
        lda colGrpT,x           ; group base, already scaled to pages
        clc
        adc ppHi
        adc #>hTabT
        sta hp+1
        lda #$00
        sta hp
        ldy ppLo
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
        lda $d012
        cmp #$96
        bcs irqSplit
        ; --- top of frame: select charset A, arm the split ---
        lda d018vm
        ora #$04
        sta $d018
        lda #$96
        sta $d012
        inc frameCnt
        bne irqd
        inc frameCnt+1
        jmp irqd
irqSplit:
        lda d018vm              ; --- horizon: select mirrored charset B ---
        ora #$06
        sta $d018
        lda #$00
        sta $d012
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
        lda #$00
        jsr setRow
        ldy #$00
        lda fpsTens
        clc
        adc #$e3
        sta (ppPtr),y
        iny
        lda fpsOnes
        clc
        adc #$e3
        sta (ppPtr),y
        rts

; X/Y as cell.frac hex (1 nibble cell + 2 nibbles fraction of the 8.8 fixed point),
; A = the raw angle byte. Screenshot it to get an exactly reproducible viewpoint.
drawDbg:

        lda #$00
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
        lda #$01
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
ddAng:  lda #$02
        jsr setRow
        ldy #37
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
        rts
ddPut:  clc
        adc #$e3
        sta (ppPtr),y
        iny
        rts

; ================= data =================
cosCorrT: !byte 215,215,216,217,218,219,219,220,221,222,223,223,224,225,226,226,227,228,229,229,230,231,232,232,233,234,235,235,236,237,237,238,239,239,240,241,241,242,242,243,244,244,245,245,246,246,247,247,248,248,249,249,250,250,251,251,251,252,252,252,253,253,253,254,254,254,254,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,254,254,254,254,253,253,253,252,252,252,251,251,251,250,250,249,249,248,248,247,247,246,246,245,245,244,244,243,242,242,241,241,240,239,239,238,237,237,236,235,235,234,233,232,232,231,230,229,229,228,227,226,226,225,224,223,223,222,221,220,219,219,218,217,216,215,215
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
rowLoT: !byte 0,40,80,120,160,200,240,24,64,104,144,184,224,8,48,88,128,168,208,248,32,72,112,152,192
rowHiT: !byte 0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,2,2,3,3,3,3,3
kTabT:  !byte 164,172,180,188,196,204,212,220,228,236,244,252,4
col4T:  !byte 0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60,64,68,72,76,80,84,88,92,96,100,104,108,112,116,120,124,128,132,136,140,144,148,152,156
qmColT: !byte 0,1,1,2   ; middle-sample column, indexed by kpos

m32LoT: !byte 0,32,64,96,128,160,192,224,0,32,64,96,128,160,192,224,0,32,64,96,128,160,192,224
m32HiT: !byte 0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2
blkLoT: !byte 0,<bkA0,<bkA1,<bkA2,<bkA3,<bkA4,<bkA5,<bkA6,<bkA7,<bkA8,<bkA9,<bkA10,<bkA11,<bkA12,0,<bkB0,<bkB1,<bkB2,<bkB3,<bkB4,<bkB5,<bkB6,<bkB7,<bkB8,<bkB9,<bkB10,<bkB11,<bkB12
blkHiT: !byte 0,>bkA0,>bkA1,>bkA2,>bkA3,>bkA4,>bkA5,>bkA6,>bkA7,>bkA8,>bkA9,>bkA10,>bkA11,>bkA12,0,>bkB0,>bkB1,>bkB2,>bkB3,>bkB4,>bkB5,>bkB6,>bkB7,>bkB8,>bkB9,>bkB10,>bkB11,>bkB12
sldLoT: !byte <slA0,<slA1,<slA2,<slA3,<slA4,<slA5,<slA6,<slA7,<slA8,<slA9,<slA10,<slA11,<slA12,0,<slB0,<slB1,<slB2,<slB3,<slB4,<slB5,<slB6,<slB7,<slB8,<slB9,<slB10,<slB11,<slB12,0
sldHiT: !byte >slA0,>slA1,>slA2,>slA3,>slA4,>slA5,>slA6,>slA7,>slA8,>slA9,>slA10,>slA11,>slA12,0,>slB0,>slB1,>slB2,>slB3,>slB4,>slB5,>slB6,>slB7,>slB8,>slB9,>slB10,>slB11,>slB12,0
edgLoT: !byte <edA0,<edA1,<edA2,<edA3,<edA4,<edA5,<edA6,<edA7,<edA8,<edA9,<edA10,<edA11,<edA12,0,<edB0,<edB1,<edB2,<edB3,<edB4,<edB5,<edB6,<edB7,<edB8,<edB9,<edB10,<edB11,<edB12,0
edgHiT: !byte >edA0,>edA1,>edA2,>edA3,>edA4,>edA5,>edA6,>edA7,>edA8,>edA9,>edA10,>edA11,>edA12,0,>edB0,>edB1,>edB2,>edB3,>edB4,>edB5,>edB6,>edB7,>edB8,>edB9,>edB10,>edB11,>edB12,0
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
        lda pa
        cmp opa
        bne obMoved
        rts                     ; a still frame. The slot data from the last one still stands
                                ; and orbPaint runs unconditionally, so the walls come out
                                ; painted the same way without reprojecting anything.
obMoved:lda px
        sta opx
        lda px+1
        sta opx+1
        lda py
        sta opy
        lda py+1
        sta opy+1
        lda pa
        sta opa
        ldx pa                  ; |cos| and |sin| are already tabulated for the DDA
        lda absCosT,x
        sta ocos
        lda absSinT,x
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
        lda #$00                ; the per-sprite bit registers are built up a bit at a time and
        sta omEn                ; written once, so an unused slot is simply never set
        sta omXX
        sta omYY
        sta omPri
        sta omX8
        sta onv
        lda py+1                ; which cell is the player standing in?
        asl
        asl
        asl
        asl
        clc
        adc px+1
        tax
        lda candCntT,x
        beq obEnd
        sta ocn
        asl                     ; three bytes per record
        clc
        adc ocn
        sta ocn3
        lda candLoT,x
        sta ocptr
        lda candHiT,x
        sta ocptr+1
        lda #$00
        sta ocy
        
obLoop: ldy ocy
        lda (ocptr),y
        sta oidx
        iny
        lda pa                  ; is the orb anywhere near the way we are facing? The list is
        sec                     ; all-round, the view is 66 degrees, and a full projection
        sbc (ocptr),y           ; costs a hundred times what this compare does
        bpl obPos
        eor #$ff
        clc
        adc #$01
obPos:  iny
        sta tmp                 ; how far off the bearing we are
        lda (ocptr),y
        sta ocanO               ; bit 7: can ANY run reachable from this cell occlude this orb?
                                ; blockers() answered that at build time and it was being
                                ; thrown away here, so every projected orb paid for the full
                                ; per-cell mask even when the answer was always no
        and #$7f
        cmp tmp
        bcc obNext              ; outside the window: not on screen
        jsr orbOne
obNext: lda ocy
        clc
        adc #$03
        sta ocy
        lda onv
        cmp #$08                ; eight hardware sprites, and the list is nearest-first
        bcs obEnd
        lda ocy
        cmp ocn3
        bcc obLoop
obEnd:  rts

; ---- osFlush: hand the frame's sprite state to the VIC, in the border ----
; Everything above only fills buffers. Writing $d000/$d001, a sprite pointer or a colour while
; the raster is inside the visible area lets the VIC fetch half of one frame's sprite and half
; of the next -- a sheared orb, or one that pops to somewhere else for a single frame. Called
; after the raster wait and the buffer flip, when the beam is past line 250 and no sprite is
; being fetched. Costs about 30 cycles per visible orb, which is nothing next to the ~2400 it
; took to work out where the orb goes.
; ---- orbStamp: paint foreground black where a wall should clip an orb ----
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
orbStamp:
        lda onv
        beq oSDn
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
oSLoop: ldx osI

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
        ; it does: stamp [max(spanL, obL) .. min(spanR, obR)]
        ldx osI
        lda ohL
        cmp obL,x
        bcs oSL1
        lda obL,x
oSL1:   sta osL
        lda ohRun
        cmp obR,x
        bcc oSR1
        lda obR,x
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
        sta ohFst               ; the glyph for the cell the stamp starts in
        lda osR
        and #$03
        tay
        lda occLT,y
        sta ohLst               ; ... and for the one it ends in
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
        ; Columns k..m of it clip, and no single glyph says that unless k is 0 or m is 3. Take the
        ; "from the right" one, which clips k..3, over-covering to the right by up to 3 columns.
        ; Over-covering takes a small bite out of the orb; under-covering leaves orb drawn ON the
        ; wall, which is the error that reads as broken -- so this errs the safe way.
        lda ohFst
        sta (osPtr),y
        jmp oSCNx
oSCMid: lda ohFst        ; first cell: the stamp starts part way in, so clip from the right
        sta (osPtr),y
oSCCol: iny
        cpy ohRun
        beq oSCLst
        lda #$fc    ; interior cells are covered whole
        sta (osPtr),y
        jmp oSCCol
oSCLst: lda ohLst               ; last cell: the stamp ends part way in, so clip from the left
        sta (osPtr),y
oSCNx:  inc ohSv
        jmp oSCRow
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
        cmp #$f5
        bcc oSDNx
        cmp #$f9
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
        cmp #$f5       ;   solid run are ceiling or edge cells and must not become SOLID
        bcc oSDRN
        cmp #$f9
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
        ldx onv
        beq osBits
osLp:   dex
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
osBits: lda omEn
        sta $d015
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
orbOne: ldx oidx
        sec                     ; Ix, Iy = orb cell - player cell, -15..15
        lda orbXCT,x
        sbc px+1
        sta oix
        sec
        lda orbYCT,x
        sbc py+1
        sta oiy
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
        bmi orbNo               ; HERE, before "right" costs two more products: at any given
        bne ofwOk               ; moment most of the world is behind you
        lda fwdL
        cmp #$40
        bcc orbNo
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
        bne orbNo               ; |right|*h past 65535 is far outside the FOV
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
        bcs orbNo               ; past 255 columns off centre: nowhere near the screen
        sta ocoff
        ldx ohgt                ; --- size variant, scaled exactly as the walls are ---
        lda orbVarT,x
        sta ovar
        lda oaS                 ; --- centre column ---
        bmi ocN
        clc
        lda #80
        adc ocoff
        jmp ocS
ocN:    sec
        lda #80
        sbc ocoff
ocS:    sta ocol
        lda ocoff               ; --- screen X: 24 + 2*column - halfWidth, signed 16-bit ---
        asl
        sta o0
        lda #$00
        rol
        sta o1
        lda oaS
        bmi oxNeg
        clc
        lda o0
        adc #184
        sta o0
        lda o1
        adc #$00
        sta o1
        jmp oxDn
oxNeg:  sec
        lda #184
        sbc o0
        sta o0
        lda #$00
        sbc o1
        sta o1
oxDn:   ldx ovar
        sec
        lda o0
        sbc orbHalfT,x
        sta o0
        lda o1
        sbc #$00
        sta o1
        bmi orbNo               ; fully off the left edge
        cmp #$02
        bcs orbNo               ; past x = 512, fully off the right
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
        bcs orbNo               ; far below the screen
        cmp #251
        bcs orbNo               ; top of the sprite is past the last visible raster line
        sta o3
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
        ldx ovar                ; half the orb's width, in logical columns
        lda orbColT,x
        sta o2
        lda ocol                ; the bounding box, in logical columns
        sec
        sbc o2
        bcs opBL1
        lda #$00
opBL1:  cmp #$a0        ; and clamp the TOP end too. Only the underflow was caught, so
        bcc opBL2               ; an orb whose centre projects past the right edge gave a box
        lda #$9f    ; starting past column 159 -- cell 40 or beyond, which walks
opBL2:  sta ocl2                ; off the end of fgCell and seamT and writes past the screen
        lsr
        lsr
        sta ocl
        lda ocol
        clc
        adc o2
        bcc opBR1
        lda #159
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
        lda ocanO
        bpl opDone              ; build time: nothing reachable from this cell can occlude it, and
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
ohSR:   cmp ocl2
        bcc ohAdv               ; span ends before the orb begins: irrelevant, skip it
        lda ohL
        cmp ocmax
        beq ohChk
        bcs ohHide              ; span begins past the orb: every overlapping span occluded it
ohChk:
        ldx ohL
        ldy faceIdT,x           ; the run this span shows
        beq opDone              ; no run here at all, so the orb shows through
        sty ohRun
        lda runByteT,y
        tay
        lda (omptr),y           ; the mask byte holding this run's bit
        ldy ohRun
        and runBitT,y
        beq opDone              ; this run does not occlude this orb -> the orb is visible
ohAdv:  ldx ohBX
        cpx nbnd
        bcs ohHide              ; that was the last span, and it occluded
        lda bndT,x
        sta ohL                 ; the next span starts at this boundary
        inc ohBX
        jmp ohSpan
ohHide: jmp orbNo           ; wholly occluded: take no sprite slot at all
opDone:
        ; --- take a sprite slot ---
        ldx onv
        lda orbBitT,x
        sta omBit
        ora omEn
        sta omEn
        ldy ovar
        lda orbPtrT,y
        sta obP,x               ; buffered, not written: see osFlush
        ldy oidx
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
oNoX:   lda o0
        and #$fe                ; snap X to the MULTICOLOR grid. A multicolor char pixel is two
                                ; hires pixels aligned to the character (always even, since
                                ; sprite X 24 is screen x 0); a multicolor SPRITE pixel is also
                                ; two, but aligned to the sprite's own X. At an odd X the two
                                ; grids are half a pixel out of phase, and since the VIC decides
                                ; priority per HIRES pixel, one half of a sprite pixel lands on
                                ; foreground and clips while its partner lands on background and
                                ; draws -- a one-hires-pixel sliver of orb peeking past a wall
                                ; edge that is otherwise clipping it correctly. Costs 2 cycles
                                ; and quantises horizontal motion to 2px.
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
        inc onv
orbYes: rts
orbNo:  rts
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

; sideT / idT / colH are per-frame mutable arrays in scratch RAM at $c100+ (see equates)
dataEnd:                        ; guard: must clear both screen buffers AND the charset -- see the layout check in build-iray.mjs

; The charset is NOT in the image. It is shipped as its own compressed segment and decoded
; straight into $d000-$d7ff by the loader, with the port at $34 -- which is the one thing a KERNAL
; LOAD can never do, and the reason a low "source" copy existed here for as long as it did. See
; iray-charset.bin and the --seg argument in the SELFEXT block below.

; connected-wall-run id tables (indexed by cell id) live above the f-tables in free RAM

; charset B has NO source: cpChr derives it from A with an EOR #$07 on the row index. fontB is
; still built in JS -- charsetgen and the readout glyph checks compare against it -- but nothing
; is emitted, which is the point: it was a permutation of bytes already in the image.

; ================= orb tables =================
; These sit in the hole between the code and the first emitted table. Only what the projection
; and the whole-orb hide need: the painting pass's tables (fgCodeT, kMaskT, bbLT/bbRT, opbBaseT,
; popcT) are NOT here, because they addressed charset twins that no longer exist.
        * = $2e00
orbVarT: !byte 21,21,21,21,21,20,20,20,20,19,19,19,19,18,18,18,18,17,17,17,17,16,16,16,16,15,15,15,15,14,14,14,14,13,13,13,13,12,12,12,12,12,11,11,11,10,10,10,9,9,9,9,8,8,8,8,7,7,7,7,6,6,6,6,5,5,5,5,4,4,4,4,3,3,3,3,2,2,2,2,2,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $2f00
candCntT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,8,5,5,5,5,0,5,5,5,5,4,5,5,0,0,7,8,6,6,5,5,0,6,6,6,6,5,5,3,0,0,6,7,6,6,6,6,0,9,8,8,0,0,0,4,0,0,6,0,0,0,7,10,12,12,11,9,0,3,3,2,0,0,4,0,4,5,7,8,0,0,10,9,0,4,0,0,0,0,4,0,4,0,0,0,0,6,9,7,0,6,8,5,0,0,4,0,2,0,3,5,5,6,8,9,10,7,0,3,0,0,4,0,3,0,3,0,0,0,0,0,12,9,0,3,0,0,4,5,4,0,2,0,3,3,3,6,10,10,0,3,0,0,0,0,4,0,3,0,4,0,0,0,0,9,8,5,0,0,2,4,4,5,3,0,4,0,3,4,4,7,7,6,0,0,4,0,0,0,0,0,6,0,6,0,0,0,0,0,0,0,4,3,3,4,6,7,7,8,7,0,4,4,4,4,0,0,2,2,2,0,0,7,7,8,8,7,5,5,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $3000
candLoT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,21,45,60,75,90,0,105,120,135,150,165,177,192,0,0,207,228,252,14,32,47,0,62,80,98,116,134,149,164,0,0,173,191,212,230,248,10,0,28,55,79,0,0,0,103,0,0,115,0,0,0,133,154,184,220,0,33,0,60,69,78,0,0,84,0,96,108,123,144,0,0,168,198,0,225,0,0,0,0,237,0,249,0,0,0,0,5,23,50,0,71,89,113,0,0,128,0,140,0,146,155,170,185,203,227,254,28,0,49,0,0,58,0,70,0,79,0,0,0,0,0,88,124,0,151,0,0,160,172,187,0,199,0,205,214,223,232,250,24,0,54,0,0,0,0,63,0,75,0,84,0,0,0,0,96,123,147,0,0,162,168,180,192,207,0,216,0,228,237,249,5,26,47,0,0,65,0,0,0,0,0,77,0,95,0,0,0,0,0,0,0,113,125,134,143,155,173,194,215,239,0,4,16,28,40,0,0,52,58,64,0,0,70,91,112,136,160,181,196,211,223,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $3100
candHiT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,55,55,55,55,55,55,0,55,55,55,55,55,55,55,0,0,55,55,55,56,56,56,0,56,56,56,56,56,56,56,0,0,56,56,56,56,56,57,0,57,57,57,0,0,0,57,0,0,57,0,0,0,57,57,57,57,58,58,0,58,58,58,0,0,58,0,58,58,58,58,0,0,58,58,0,58,0,0,0,0,58,0,58,0,0,0,0,59,59,59,0,59,59,59,0,0,59,0,59,0,59,59,59,59,59,59,59,60,0,60,0,0,60,0,60,0,60,0,0,0,0,0,60,60,0,60,0,0,60,60,60,0,60,0,60,60,60,60,60,61,0,61,0,0,0,0,61,0,61,0,61,0,0,0,0,61,61,61,0,0,61,61,61,61,61,0,61,0,61,61,61,62,62,62,0,0,62,0,0,0,0,0,62,0,62,0,0,0,0,0,0,0,62,62,62,62,62,62,62,62,62,0,63,63,63,63,0,0,63,63,63,0,0,63,63,63,63,63,63,63,63,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $3200
; One bit per (orb, run): is the orb BEYOND that face's plane, hence occluded by it. A constant,
; because the test does not involve the camera at all -- see the data layer above.
orbOccT: !byte 248,170,182,78,80,213,218,218,0,72,173,182,78,80,213,218,218,0,72,85,189,78,80,213,218,218,0,72,85,73,79,80,213,218,218,0,72,85,73,49,80,213,218,218,0,176,170,182,78,112,213,218,218,0,200,175,182,78,112,213,218,218,0,72,85,169,78,112,213,218,218,0,72,181,182,78,160,213,218,218,0,72,85,73,73,160,213,218,218,0,200,170,182,78,160,222,218,218,0,72,85,233,78,160,222,218,218,0,176,170,182,78,160,234,218,218,0,72,85,189,78,160,234,218,218,0,72,85,73,121,160,234,218,218,0,72,173,182,78,160,42,219,218,0,72,85,73,79,160,42,219,218,0,200,170,182,78,160,42,223,218,0,72,85,73,49,160,42,223,218,0,176,170,182,78,160,42,213,218,0,72,213,183,78,160,42,213,218,0,72,85,233,78,160,42,213,218,0,72,173,182,78,160,42,229,219,0,72,85,73,73,160,42,229,219,0,248,170,182,78,160,42,37,217,0,72,85,169,78,160,42,37,217,0,72,85,73,49,160,42,37,217,0,72,213,183,78,160,42,37,253,0,176,170,182,78,160,42,37,165,0,200,175,182,78,160,42,37,165,0,72,85,73,79,160,42,37,165,0,72,181,182,78,160,42,37,37,1,72,85,169,78,160,42,37,37,1,72,85,73,121,160,42,37,37,1
        * = $3400
orbPtrT: !byte 0,1,2,3,4,5,6,7,8,9,10,0,2,4,6,8,10,11,12,13,14,15
orbExpT: !byte 1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0
orbHalfT: !byte 22,24,22,24,22,24,22,24,22,24,22,11,11,11,11,11,11,12,11,12,11,12
orbYBaseT: !byte 108,108,108,108,108,108,108,108,108,108,108,129,129,129,129,129,129,129,129,129,129,129
orbBlankT: !byte 0,2,4,6,8,10,12,14,16,18,20,0,2,4,6,8,10,12,14,16,18,20
orbAnchT: !byte 42,42,42,42,42,42,42,42,42,42,42,21,21,21,21,21,21,21,21,21,21,21
orbHgtT: !byte 42,42,42,42,42,42,42,42,42,42,42,21,21,21,21,21,21,21,21,21,21,21
orbColT: !byte 12,11,11,10,10,9,9,8,7,7,6,6,6,5,5,4,3,3,2,2,1,1
orbBitT: !byte 1,2,4,8,16,32,64,128
; The stamp's edge cells. A cell is 4 logical columns, so a stamp that begins or ends inside one
; needs a glyph with only part of it foreground.
;   occRT[k] -- the stamp STARTS at column k of this cell, so columns k..3 clip: "from the right"
;   occLT[m] -- the stamp ENDS at column m, so columns 0..m clip: "from the left"
; Both give the whole-cell glyph where the boundary lands on a cell edge, so no special case.
occRT: !byte 252,255,254,253
occLT: !byte 249,250,251,252
; Run id -> which byte of an orb's occluder mask holds its bit, and which bit. Two small tables
; instead of three lsrs and an and per column: this runs once per logical column under every orb
; that might be occluded, which is the only part of the test that is not O(1).
runByteT: !byte 0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,8,8,8
runBitT: !byte 1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4,8,16,32,64,128,1,2,4
orbOccLoT: !byte 0,9,18,27,36,45,54,63,72,81,90,99,108,117,126,135,144,153,162,171,180,189,198,207,216,225,234,243,252,5,14,23,32,41
orbOccHiT: !byte 50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,51,51,51,51,51
orbXCT: !byte 2,5,8,11,14,1,4,9,6,12,3,10,1,8,13,5,11,3,14,1,7,10,5,12,2,9,14,7,1,4,11,6,9,13
orbYCT: !byte 1,1,1,1,1,3,3,3,4,4,5,5,6,6,6,7,7,8,8,9,9,9,10,10,11,11,11,12,13,13,13,14,14,14
orbColT2: !byte 12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12
; bbLT / bbRT: a bounding box starts and ends part-way through a cell, so these give the columns
; of that first and last cell which lie inside it. Bit 3 is the leftmost column. These are about
; the BOUNDING BOX, not the charset -- which is why they come back while fgCodeT and kMaskT,
; which named charset twins, do not.
bbLT:   !byte $0f,$07,$03,$01
bbRT:   !byte $08,$0c,$0e,$0f
popcT:  !byte 0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4
opbBaseT: !byte 0,12,24,36,48,60,72,84
        * = $3700
candListT: !byte 0,0,51,5,64,40,6,24,34,1,0,33,12,64,32,8,22,31,19,64,30,0,0,58,5,83,39,6,32,36,1,0,35,8,26,32,12,72,160,19,69,158,11,19,157,0,128,51,1,0,40,6,45,39,5,96,36,8,32,33,1,0,51,0,128,40,6,64,40,5,104,34,8,40,34,1,0,58,6,83,39,0,128,35,8,51,35,5,109,32,1,128,51,6,96,36,8,64,35,0,128,33,5,112,31,2,0,58,7,45,39,3,0,35,11,45,32,4,0,31,2,128,51,3,0,40,7,64,40,11,54,33,4,0,32,3,0,51,2,128,40,7,83,39,4,0,33,11,64,33,3,0,58,7,96,36,2,128,35,4,0,35,11,74,161,3,128,51,4,0,40,7,104,34,2,128,33,4,0,51,3,128,40,7,109,160,2,128,32,8,112,158,4,0,58,3,128,35,7,112,159,2,128,31,8,113,157,5,64,51,0,224,45,6,13,35,12,64,33,1,246,33,8,16,159,19,64,30,0,192,51,5,96,45,6,19,39,1,243,35,12,74,161,8,19,160,19,70,158,11,15,157,0,160,45,6,32,45,1,237,39,5,109,39,8,24,34,11,16,158,6,64,51,1,224,45,0,147,39,8,32,36,5,115,35,11,19,158,1,192,51,6,96,45,8,45,39,0,141,35,5,118,33,1,160,45,8,64,40,6,109,39,0,138,33,5,120,32,2,192,51,7,32,45,3,243,35,11,40,34,4,249,31,23,45,157,7,64,51,2,160,45,3,237,39,11,51,35,4,248,32,23,49,157,3,224,45,7,96,45,2,147,39,11,64,35,4,246,33,8,109,160,3,192,51,7,109,167,2,141,35,4,243,35,11,77,163,8,112,159,3,160,45,4,237,39,7,115,163,2,138,33,8,115,159,4,224,45,3,147,39,7,118,161,2,136,32,8,117,158,4,192,51,3,141,35,2,135,31,5,0,58,0,211,39,6,0,35,12,64,35,1,237,32,19,64,31,5,128,51,0,192,40,6,0,40,12,77,163,1,232,34,8,10,161,19,71,159,6,0,51,5,128,40,0,173,39,1,224,36,8,13,163,11,11,158,6,0,58,1,211,39,8,19,167,0,160,36,5,128,35,11,13,159,6,128,51,8,32,45,1,192,40,0,152,34,5,128,33,11,16,159,8,64,51,6,128,40,1,173,39,0,147,32,11,19,160,5,128,32,7,0,51,2,192,40,8,109,167,11,32,36,3,232,34,16,38,160,10,112,159,4,243,159,23,43,158,7,0,58,2,173,39,11,45,39,3,224,36,8,115,163,4,240,159,10,115,159,23,48,158,7,128,51,11,64,40,3,211,167,2,160,36,13,88,162,8,118,161,4,237,160,10,117,158,4,192,40,9,109,167,3,152,162,2,141,159,5,192,51,12,64,40,0,205,163,6,243,163,1,230,160,19,64,32,8,0,51,6,160,173,10,109,167,1,192,35,5,138,161,7,246,161,0,160,161,8,0,58,6,147,167,1,179,35,7,243,163,10,115,163,11,10,161,0,154,32,5,136,160,3,234,159,4,241,157,8,128,51,7,237,167,2,205,163,6,141,163,11,13,163,1,168,162,10,118,161,3,230,160,16,26,160,0,150,159,5,135,159,4,240,158,7,224,45,8,128,40,11,19,167,2,192,35,6,138,161,3,224,33,16,32,161,10,120,160,0,147,158,4,237,158,5,134,158,23,40,158,7,192,51,11,32,45,13,83,167,8,128,35,2,179,35,3,216,34,16,40,162,6,136,160,10,121,159,23,45,158,5,133,158,11,64,51,7,160,45,13,96,164,3,205,163,2,168,34,8,128,33,6,135,159,23,51,159,10,122,158,9,0,58,14,45,167,23,64,31,9,128,51,4,205,163,23,71,159,9,128,40,4,192,35,12,64,51,5,192,40,19,64,33,0,202,161,10,0,58,17,64,35,8,243,163,7,243,159,10,128,51,8,237,167,17,77,163,1,202,161,7,240,159,8,224,45,10,128,40,6,173,167,1,192,33,7,237,160,0,166,160,3,232,158,8,192,51,6,160,164,10,128,35,7,232,162,1,182,33,0,160,159,3,229,158,4,237,157,11,0,51,13,96,173,7,192,40,16,32,164,8,141,163,2,182,161,3,211,160,6,144,159,23,42,159,26,36,158,11,0,58,7,173,39,13,109,167,16,45,167,3,202,161,8,138,161,2,173,32,23,48,159,6,141,159,9,192,51,14,32,173,16,83,167,23,64,32,12,0,58,5,192,35,19,64,35,0,200,160,10,192,51,17,64,40,8,232,162,7,237,158,13,0,58,11,237,167,7,205,163,15,115,163,16,13,35,3,214,159,13,128,51,11,224,45,16,19,167,7,192,35,15,118,161,23,38,160,2,184,160,3,208,159,26,32,158,11,192,51,16,32,173,13,128,40,7,179,35,23,45,160,15,120,160,2,176,31,14,0,51,16,96,173,9,192,40,21,88,162,23,64,33,15,122,158,14,0,58,9,173,167,16,109,167,18,45,167,23,74,161,21,96,161,26,56,160,15,123,158,14,128,51,18,64,40,16,115,163,21,102,160,26,64,32,12,192,51,19,64,40,5,192,33,0,199,159,17,64,51,10,192,40,15,0,58,22,64,35,16,0,31,15,128,51,13,237,167,22,77,163,11,237,160,16,0,32,13,224,173,15,128,40,11,232,162,16,0,33,3,216,158,13,192,51,11,224,36,15,128,35,16,0,35,7,202,161,3,211,158,13,160,45,16,0,40,11,211,39,7,192,33,15,128,33,14,246,161,2,185,159,3,205,159,16,0,51,11,192,40,13,147,39,14,243,163,23,40,162,7,182,33,15,128,32,26,32,159,2,179,31,16,0,58,11,173,167,14,237,167,21,83,167,9,205,163,13,141,163,23,51,35,7,173,160,15,128,31,2,173,158,16,128,51,14,224,173,21,96,164,9,192,35,23,64,35,13,138,161,15,128,30,18,64,51,14,160,173,26,64,33,19,64,51,12,192,40,5,192,32,0,198,158,17,0,58,19,109,167,10,192,35,15,192,51,22,64,40,16,249,159,16,192,51,21,96,173,23,45,167,14,224,164,11,179,163,13,152,162,9,202,161,20,118,161,26,32,161,7,176,159,15,135,159,2,176,158,16,160,45,23,64,40,14,211,167,21,109,167,26,40,162,9,192,33,13,147,160,20,120,160,15,134,158,18,0,58,14,173,167,26,64,35,19,0,58,17,237,167,12,192,35,5,192,31,19,128,51,17,224,173,12,179,163,10,202,161,5,185,159,17,192,51,19,128,40,24,83,167,10,192,33,22,64,51,15,192,40,20,0,58,21,0,35,27,64,35,20,128,51,21,0,40,27,77,163,21,0,51,20,128,40,14,230,160,21,0,58,16,211,167,23,19,167,20,128,35,14,224,161,26,19,160,21,128,51,23,32,173,16,192,40,14,216,162,26,24,162,20,128,33,11,182,161,9,200,160,7,179,159,2,177,157,23,64,51,21,128,40,16,173,39,26,32,164,11,173,160,9,192,32,13,154,160,20,128,32,7,173,158,2,173,157,18,192,51,26,64,40,23,109,167,24,96,173,17,192,40,19,147,167,10,192,32,22,0,58,15,192,35,24,115,163,20,192,51,27,64,40,21,243,163,31,74,161,23,0,58,21,147,167,26,19,39,16,179,163,25,115,163,20,136,160,11,176,159,9,192,31,7,176,158,23,128,51,26,32,45,18,211,167,21,141,163,16,168,162,25,118,161,9,185,159,20,135,159,26,64,51,18,192,40,23,128,40,21,138,161,25,120,160,24,0,51,28,64,40,24,0,58,28,83,167,17,205,163,10,199,159,24,128,51,22,237,167,17,192,35,10,192,31,22,224,173,24,128,40,17,179,163,15,202,161,10,185,159,22,192,51,24,128,35,15,192,33,27,64,51,20,192,40,31,77,163,32,40,162,25,0,58,32,64,35,26,0,32,25,128,51,23,237,167,32,77,163,26,0,33,23,224,173,25,128,40,26,0,35,9,198,158,23,192,51,26,0,40,25,128,35,16,182,161,11,179,159,9,192,30,7,177,157,26,0,51,23,160,45,18,205,163,25,128,33,16,173,160,9,186,158,7,173,157,26,0,58,23,147,39,18,192,35,21,147,160,16,166,160,25,128,32,28,64,51,24,224,173,29,13,163,32,10,157,27,0,58,31,83,167,32,32,164,20,192,35,29,115,163,28,121,159,25,192,51,32,64,40,31,104,162,26,248,160,29,120,160,28,123,158,28,0,58,24,211,167,29,0,35,32,5,158,28,128,51,29,0,40,32,6,158,29,0,51,28,128,40,32,7,159,29,0,58,31,19,167,28,128,35,32,8,160,29,128,51,31,32,173,27,237,167,28,128,33,32,10,161,33,5,158,31,64,51,27,224,173,29,128,40,32,13,35,20,202,161,28,128,32,33,6,158,27,192,51,31,96,45,32,19,39,29,128,35,20,192,33,28,128,31,33,7,159,27,160,173,32,32,45,25,211,167,31,109,39,29,128,33,20,182,161,33,8,160,28,128,30,32,64,51,25,192,40,27,147,167,31,115,35,33,10,161,29,128,32,28,128,30,30,0,58,32,109,167,33,19,39,31,120,160,30,128,51,33,32,45,32,115,163,31,121,159,33,64,51,30,128,40,32,118,161,31,122,158,33,96,45,30,128,35,32,120,160,31,123,158,28,192,51,29,243,35,28,160,45,29,237,167,29,224,173,28,147,39,31,0,58,27,211,167,29,147,167,32,0,35,20,200,160,28,136,160,33,0,30,31,128,51,27,192,40,32,0,40,29,141,163,20,192,32,33,0,31,28,135,159,32,0,51,31,128,40,27,173,167,25,205,163,29,138,161,33,0,32,20,184,160,28,134,158,32,0,58,30,237,167,27,160,164,25,192,35,31,128,35,33,0,33,29,136,160,28,133,158,32,128,51,30,224,173,33,0,35,25,179,163,27,152,162,31,128,33,29,135,159,30,192,51,32,128,40,33,0,40,31,128,32,29,134,158,33,0,51,30,160,45,32,128,35,31,128,31,29,133,158,33,0,58,30,147,39,32,128,33,31,128,30,33,128,51,30,141,35,32,128,32,31,128,30   ; read through a 16-bit pointer, so it may cross pages
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
        * = $4d00
hTabT:  !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,254,238,222,209,196,185,176,167,159,152,145,139,133,128,124,119,115,111,108
        !byte 104,101,98,95,93,90,88,86,83,81,79,78,76,74,73,71,70,68,67,65,64,63,62,61,60,59,58,57,56,55,54,53
        !byte 52,51,51,50,49,48,48,47,46,46,45,44,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,37,36,36,36,35
        !byte 35,34,34,34,33,33,33,32,32,32,31,31,31,31,30,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26
        !byte 26,26,26,25,25,25,25,25,25,24,24,24,24,24,24,23,23,23,23,23,23,22,22,22,22,22,22,22,21,21,21,21
        !byte 21,21,21,20,20,20,20,20,20,20,20,20,19,19,19,19,19,19,19,19,19,18,18,18,18,18,18,18,18,18,18,17
        !byte 17,17,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13
        !byte 13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12
        !byte 12,12,12,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,253,235,219,206,194,183,173,165,157,150,143,137,132,127,122,118,114,110,106
        !byte 103,100,97,94,91,89,87,84,82,80,78,77,75,73,72,70,69,67,66,65,63,62,61,60,59,58,57,56,55,54,53,52
        !byte 51,51,50,49,48,48,47,46,46,45,44,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35,35
        !byte 34,34,34,33,33,33,32,32,32,31,31,31,30,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,27,26,26,26
        !byte 26,26,25,25,25,25,25,24,24,24,24,24,24,23,23,23,23,23,23,22,22,22,22,22,22,22,21,21,21,21,21,21
        !byte 21,20,20,20,20,20,20,20,20,19,19,19,19,19,19,19,19,19,18,18,18,18,18,18,18,18,18,18,18,17,17,17
        !byte 17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13
        !byte 13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11
        !byte 11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,250,232,216,203,191,180,171,162,155,148,141,135,130,125,120,116,112,108,105
        !byte 101,98,96,93,90,88,85,83,81,79,77,76,74,72,71,69,68,66,65,64,62,61,60,59,58,57,56,55,54,53,52,52
        !byte 51,50,49,48,48,47,46,46,45,44,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,36,36,36,35,35,35,34
        !byte 34,33,33,33,32,32,32,32,31,31,31,30,30,30,30,29,29,29,28,28,28,28,28,27,27,27,27,26,26,26,26,26
        !byte 25,25,25,25,25,24,24,24,24,24,24,23,23,23,23,23,23,22,22,22,22,22,22,22,21,21,21,21,21,21,21,20
        !byte 20,20,20,20,20,20,20,19,19,19,19,19,19,19,19,19,18,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17
        !byte 17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13
        !byte 13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11
        !byte 11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,248,230,215,201,189,179,169,161,153,146,140,134,129,124,119,115,111,107,104
        !byte 101,98,95,92,89,87,85,83,80,78,77,75,73,72,70,68,67,66,64,63,62,61,60,59,57,56,55,55,54,53,52,51
        !byte 50,50,49,48,47,47,46,45,45,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35,35,34,34
        !byte 34,33,33,33,32,32,32,31,31,31,30,30,30,30,29,29,29,28,28,28,28,28,27,27,27,27,26,26,26,26,26,25
        !byte 25,25,25,25,24,24,24,24,24,23,23,23,23,23,23,23,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20
        !byte 20,20,20,20,20,20,19,19,19,19,19,19,19,19,18,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17
        !byte 17,17,17,17,16,16,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15,15,15,15,15,15,15,15,14,14
        !byte 14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13
        !byte 13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11
        !byte 11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,244,227,212,198,187,176,167,159,151,144,138,132,127,122,118,113,110,106,102
        !byte 99,96,93,91,88,86,84,81,79,77,76,74,72,71,69,68,66,65,64,62,61,60,59,58,57,56,55,54,53,52,51,50
        !byte 50,49,48,47,47,46,45,45,44,44,43,42,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35,35,34,34,33
        !byte 33,33,32,32,32,31,31,31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,26,25,25,25
        !byte 25,25,24,24,24,24,24,24,23,23,23,23,23,23,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20
        !byte 20,20,20,19,19,19,19,19,19,19,19,19,18,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,17
        !byte 17,16,16,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14
        !byte 14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12
        !byte 12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,11
        !byte 11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,242,225,210,197,185,175,166,157,150,143,137,131,126,121,117,112,109,105,102
        !byte 98,95,93,90,87,85,83,81,79,77,75,73,72,70,68,67,66,64,63,62,61,59,58,57,56,55,54,53,52,52,51,50
        !byte 49,48,48,47,46,46,45,44,44,43,43,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35,35,34,34,33,33
        !byte 33,32,32,32,31,31,31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,26,25,25,25,25
        !byte 25,24,24,24,24,24,23,23,23,23,23,23,22,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20,20
        !byte 20,20,19,19,19,19,19,19,19,19,19,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,17,17,16
        !byte 16,16,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14
        !byte 14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12
        !byte 12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,11,11,11,11
        !byte 11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,239,222,207,194,183,173,164,155,148,141,135,129,124,120,115,111,107,104,100
        !byte 97,94,91,89,86,84,82,80,78,76,74,72,71,69,68,66,65,63,62,61,60,59,58,56,55,55,54,53,52,51,50,49
        !byte 49,48,47,46,46,45,44,44,43,43,42,41,41,40,40,39,39,38,38,37,37,37,36,36,35,35,35,34,34,33,33,33
        !byte 32,32,32,31,31,31,30,30,30,30,29,29,29,29,28,28,28,27,27,27,27,27,26,26,26,26,25,25,25,25,25,24
        !byte 24,24,24,24,24,23,23,23,23,23,23,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20,20,20,20
        !byte 19,19,19,19,19,19,19,19,18,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,17,17,16,16,16
        !byte 16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14
        !byte 14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12
        !byte 12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11
        !byte 11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,254,237,220,205,193,181,171,162,154,147,140,134,128,123,118,114,110,106,103,99
        !byte 96,93,91,88,86,83,81,79,77,75,73,72,70,68,67,66,64,63,62,60,59,58,57,56,55,54,53,52,51,51,50,49
        !byte 48,47,47,46,45,45,44,43,43,42,42,41,41,40,39,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32
        !byte 32,32,31,31,31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24
        !byte 24,24,24,24,23,23,23,23,23,22,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20,20,20,19,19
        !byte 19,19,19,19,19,19,19,18,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,17,16,16,16,16,16
        !byte 16,16,16,16,16,16,16,15,15,15,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14
        !byte 14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12
        !byte 12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11
        !byte 11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,253,234,217,203,190,179,169,160,152,145,138,132,127,122,117,113,109,105,101,98
        !byte 95,92,89,87,84,82,80,78,76,74,72,71,69,68,66,65,63,62,61,60,58,57,56,55,54,53,52,52,51,50,49,48
        !byte 48,47,46,45,45,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32,32
        !byte 32,31,31,31,30,30,30,30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,26,25,25,25,25,25,24,24,24
        !byte 24,24,23,23,23,23,23,23,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20,20,20,19,19,19,19
        !byte 19,19,19,19,19,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16
        !byte 16,16,16,16,16,15,15,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14
        !byte 14,14,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12
        !byte 12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11
        !byte 11,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10
        !byte 10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,251,232,215,201,189,177,168,159,151,144,137,131,126,121,116,112,108,104,101,97
        !byte 94,91,89,86,84,82,79,77,75,74,72,70,69,67,66,64,63,62,60,59,58,57,56,55,54,53,52,51,50,49,49,48
        !byte 47,46,46,45,44,44,43,42,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,35,34,34,34,33,33,32,32,32
        !byte 31,31,31,30,30,30,30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,26,25,25,25,25,25,24,24,24,24
        !byte 24,23,23,23,23,23,23,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20,20,20,19,19,19,19,19
        !byte 19,19,19,19,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16
        !byte 16,16,16,15,15,15,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14
        !byte 13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12
        !byte 12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,248,229,213,199,186,175,165,157,149,142,135,130,124,119,115,110,106,103,99,96
        !byte 93,90,88,85,83,81,78,76,74,73,71,69,68,66,65,63,62,61,60,58,57,56,55,54,53,52,51,50,50,49,48,47
        !byte 47,46,45,44,44,43,43,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32,32,32,31
        !byte 31,31,30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24,24,23
        !byte 23,23,23,23,23,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20,20,20,19,19,19,19,19,19,19
        !byte 19,19,18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,16
        !byte 16,15,15,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13
        !byte 13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12
        !byte 12,12,12,12,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,246,227,211,197,185,174,164,155,148,141,134,128,123,118,114,109,106,102,98,95
        !byte 92,90,87,84,82,80,78,76,74,72,70,69,67,66,64,63,62,60,59,58,57,56,55,54,53,52,51,50,49,48,48,47
        !byte 46,45,45,44,43,43,42,42,41,40,40,39,39,38,38,37,37,36,36,36,35,35,34,34,34,33,33,32,32,32,31,31
        !byte 31,30,30,30,30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24,24,23,23
        !byte 23,23,23,23,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20,20,20,19,19,19,19,19,19,19,19
        !byte 18,18,18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,16,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13
        !byte 13,13,13,13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12
        !byte 12,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,243,225,208,195,182,172,162,154,146,139,133,127,122,117,112,108,104,101,97,94
        !byte 91,88,86,83,81,79,77,75,73,71,69,68,66,65,63,62,61,60,58,57,56,55,54,53,52,51,50,49,49,48,47,46
        !byte 46,45,44,44,43,42,42,41,41,40,39,39,38,38,37,37,36,36,36,35,35,34,34,34,33,33,32,32,32,31,31,31
        !byte 30,30,30,29,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24,24,23,23,23
        !byte 23,23,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20,20,20,19,19,19,19,19,19,19,19,18,18
        !byte 18,18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,16,16,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13
        !byte 13,13,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11
        !byte 11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,241,223,207,193,181,170,161,152,145,138,132,126,121,116,111,107,103,100,97,93
        !byte 90,88,85,83,80,78,76,74,72,71,69,67,66,64,63,62,60,59,58,57,56,55,54,53,52,51,50,49,48,47,47,46
        !byte 45,45,44,43,43,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,34,34,34,33,33,33,32,32,31,31,31,30
        !byte 30,30,30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,25,24,24,24,24,24,23,23,23,23
        !byte 23,22,22,22,22,22,22,21,21,21,21,21,21,21,20,20,20,20,20,20,20,19,19,19,19,19,19,19,19,18,18,18
        !byte 18,18,18,18,18,18,17,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13
        !byte 13,13,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11
        !byte 11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,238,220,204,191,179,168,159,151,143,136,130,124,119,114,110,106,102,99,95,92
        !byte 89,87,84,82,79,77,75,73,72,70,68,67,65,64,62,61,60,58,57,56,55,54,53,52,51,50,49,48,48,47,46,45
        !byte 45,44,43,43,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,34,34,34,33,33,33,32,32,31,31,31,30,30
        !byte 30,29,29,29,29,28,28,28,28,27,27,27,26,26,26,26,26,25,25,25,25,24,24,24,24,24,23,23,23,23,23,23
        !byte 22,22,22,22,22,22,21,21,21,21,21,21,20,20,20,20,20,20,20,19,19,19,19,19,19,19,19,18,18,18,18,18
        !byte 18,18,18,18,17,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13
        !byte 13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11
        !byte 11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 254,254,254,254,254,254,254,254,254,254,254,254,237,218,203,189,177,167,158,149,142,135,129,123,118,114,109,105,101,98,95,92
        !byte 89,86,83,81,79,77,75,73,71,69,68,66,65,63,62,60,59,58,57,56,55,54,53,52,51,50,49,48,47,47,46,45
        !byte 44,44,43,42,42,41,41,40,39,39,38,38,37,37,36,36,35,35,35,34,34,33,33,33,32,32,32,31,31,31,30,30
        !byte 30,29,29,29,28,28,28,28,27,27,27,27,26,26,26,26,25,25,25,25,24,24,24,24,24,23,23,23,23,23,23,22
        !byte 22,22,22,22,22,21,21,21,21,21,21,20,20,20,20,20,20,20,19,19,19,19,19,19,19,19,18,18,18,18,18,18
        !byte 18,18,18,17,17,17,17,17,17,17,17,17,17,16,16,16,16,16,16,16,16,16,16,16,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,13,13,13,13,13
        !byte 13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,11,11,11,11,11,11,11,11,11
        !byte 11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,10,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9
        !byte 9,9,9,9,9,9,9,9,9,9,9,9,9,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        ; ---- CPU-only tables, lifted clear of VIC bank 0 ----
        ; None of this is ever fetched by the VIC, so none of it belongs in the 16K the
        ; VIC can see. Moving it out frees bank 0 for sprites, and gives every 256-entry
        ; table its own page for free -- an "lda table,x" that crosses a page costs an
        ; extra cycle, and these are indexed by a full byte.
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
runWT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,31,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,31,0,0,0,0,0,0,0,14,0,0,0,24,0,0,0,31,0,0,3,0,0,0,0,0,0,0,0,24,0,0,0,31,0,0,3,0,0,0,0,16,0,0,0,24,0,28,0,0,0,0,3,0,8,0,0,0,0,0,0,24,0,0,0,32,0,0,3,0,8,0,0,0,0,0,0,0,0,29,0,32,0,0,3,0,8,0,12,0,0,0,0,0,0,29,0,32,0,0,0,0,8,0,12,0,0,0,0,0,0,29,0,32,0,0,0,0,8,0,12,0,19,0,0,0,0,0,0,32,0,0,0,0,0,0,12,0,19,0,0,0,0,0,0,32,0,0,6,0,0,0,0,0,19,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,22,0,0,0,0,33,0,0,0,0,10,0,0,0,0,0,0,0,0,0,0,33,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $8b00
runET: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,15,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,15,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,15,0,0,0,0,0,27,0,0,1,0,0,0,7,0,0,0,0,0,0,25,0,0,0,0,1,0,4,0,0,0,0,0,18,0,0,25,0,0,0,0,1,0,4,0,0,0,0,17,0,0,0,25,0,0,0,0,1,0,4,0,9,0,0,0,0,0,0,0,0,30,0,0,1,0,4,0,9,0,0,0,0,0,21,0,0,30,0,0,1,0,0,0,9,0,13,0,0,0,0,0,0,30,0,0,0,0,5,0,9,0,13,0,0,0,0,26,0,0,0,0,2,0,0,0,0,0,13,0,20,0,0,0,0,0,0,0,2,0,0,0,0,0,13,0,20,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,23,0,0,0,0,0,2,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $8c00
runNT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,37,37,0,0,0,0,39,39,39,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,41,41,0,0,0,0,43,43,0,0,0,0,0,45,45,45,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,0,0,0,0,0,0,0,0,50,50,50,50,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,53,53,0,0,0,0,0,56,56,56,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,58,58,58,0,0,0,0,61,61,61,61,61,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,64,0,0,0,0,0,0,0,0,0,0,0,65,65,65,0,0,66,66,66,66,66,66,66,66,66,0
        * = $8d00
runST: !byte 0,34,34,34,34,34,34,0,35,35,35,35,35,35,35,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,0,0,0,0,38,38,0,0,0,0,0,40,40,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,42,0,0,0,0,44,44,0,0,0,0,0,0,46,46,46,0,0,0,47,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,49,0,0,0,0,51,51,51,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,52,0,0,0,54,54,0,55,0,0,0,0,57,57,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,59,59,59,59,59,0,60,0,0,62,62,62,62,0,0,0,0,0,0,0,0,0,0,0,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $8e00
mapT:   !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1
        !byte 1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1
        !byte 1,0,0,0,0,0,0,1,0,0,0,1,1,1,0,1
        !byte 1,0,1,1,1,0,0,0,0,0,0,1,0,0,0,1
        !byte 1,0,1,0,0,0,0,1,1,0,0,1,0,1,1,1
        !byte 1,0,1,0,1,1,1,1,0,0,0,1,0,0,0,1
        !byte 1,0,1,0,1,0,0,0,0,0,0,0,0,1,0,1
        !byte 1,0,1,0,1,0,1,1,1,1,1,0,0,1,0,1
        !byte 1,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1
        !byte 1,1,1,0,1,0,1,0,1,1,1,1,0,0,0,1
        !byte 1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1
        !byte 1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,1
        !byte 1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1
        !byte 1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
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
        * = $9100
ddxLoT: !byte 0,0,0,1,1,2,3,4,5,6,8,10,12,14,16,18,21,24,27,31,34,38,42,47
        !byte 52,57,63,69,75,82,90,97,106,115,125,136,148,160,174,189,205,223,242,7,31,57,87,120
        !byte 157,199,248,48,114,192,30,144,32,217,209,43,52,152,97,191,255,191,97,152,52,43,209,217
        !byte 32,144,30,192,114,48,248,199,157,120,87,57,31,7,242,223,205,189,174,160,148,136,125,115
        !byte 106,97,90,82,75,69,63,57,52,47,42,38,34,31,27,24,21,18,16,14,12,10,8,6
        !byte 5,4,3,2,1,1,0,0,0,0,0,1,1,2,3,4,5,6,8,10,12,14,16,18
        !byte 21,24,27,31,34,38,42,47,52,57,63,69,75,82,90,97,106,115,125,136,148,160,174,189
        !byte 205,223,242,7,31,57,87,120,157,199,248,48,114,192,30,144,32,217,209,43,52,152,97,191
        !byte 255,191,97,152,52,43,209,217,32,144,30,192,114,48,248,199,157,120,87,57,31,7,242,223
        !byte 205,189,174,160,148,136,125,115,106,97,90,82,75,69,63,57,52,47,42,38,34,31,27,24
        !byte 21,18,16,14,12,10,8,6,5,4,3,2,1,1,0,0
        * = $9200
ddxHiT: !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2
        !byte 2,2,2,3,3,3,4,4,5,5,6,8,10,13,20,40,255,40,20,13,10,8,6,5
        !byte 5,4,4,3,3,3,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,2,2,2,2,2,2,2,2,3,3,3,4,4,5,5,6,8,10,13,20,40
        !byte 255,40,20,13,10,8,6,5,5,4,4,3,3,3,2,2,2,2,2,2,2,2,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        * = $9300
ddyLoT: !byte 255,191,97,152,52,43,209,217,32,144,30,192,114,48,248,199,157,120,87,57,31,7,242,223
        !byte 205,189,174,160,148,136,125,115,106,97,90,82,75,69,63,57,52,47,42,38,34,31,27,24
        !byte 21,18,16,14,12,10,8,6,5,4,3,2,1,1,0,0,0,0,0,1,1,2,3,4
        !byte 5,6,8,10,12,14,16,18,21,24,27,31,34,38,42,47,52,57,63,69,75,82,90,97
        !byte 106,115,125,136,148,160,174,189,205,223,242,7,31,57,87,120,157,199,248,48,114,192,30,144
        !byte 32,217,209,43,52,152,97,191,255,191,97,152,52,43,209,217,32,144,30,192,114,48,248,199
        !byte 157,120,87,57,31,7,242,223,205,189,174,160,148,136,125,115,106,97,90,82,75,69,63,57
        !byte 52,47,42,38,34,31,27,24,21,18,16,14,12,10,8,6,5,4,3,2,1,1,0,0
        !byte 0,0,0,1,1,2,3,4,5,6,8,10,12,14,16,18,21,24,27,31,34,38,42,47
        !byte 52,57,63,69,75,82,90,97,106,115,125,136,148,160,174,189,205,223,242,7,31,57,87,120
        !byte 157,199,248,48,114,192,30,144,32,217,209,43,52,152,97,191
        * = $9400
ddyHiT: !byte 255,40,20,13,10,8,6,5,5,4,4,3,3,3,2,2,2,2,2,2,2,2,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,3,3,3,4,4
        !byte 5,5,6,8,10,13,20,40,255,40,20,13,10,8,6,5,5,4,4,3,3,3,2,2
        !byte 2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2
        !byte 2,2,2,3,3,3,4,4,5,5,6,8,10,13,20,40
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
        * = $9800
colGrpT: !byte 0,0,0,0,3,3,3,3,6,6,9,9,9,9,12,12,12,15,15,15,15,18,18,18,21,21,21,21,24,24,24,27,27,27,27,30,30,30,30,33,33,33,33,33,36,36,36,36,39,39,39,39,39,39,42,42,42,42,42,42,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,42,42,42,42,42,42,39,39,39,39,39,39,36,36,36,36,33,33,33,33,33,30,30,30,30,27,27,27,27,24,24,24,21,21,21,21,18,18,18,15,15,15,15,12,12,12,9,9,9,9,6,6,3,3,3,3,0,0,0,0

        * = $9900
; The DDA deltas at quarter-angle resolution. 1024 entries each, addressed as four pages via
; the dispatch in castRay, so no index arithmetic wider than a byte ever happens. The 256-entry
; originals are left in place and unused -- posXT/posYT/absSinT/absCosT still index by the
; integer angle, and their page-alignment check would have to be reworked for no gain.
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
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1
        !byte 1,1,2,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,6,6,6,7,7,8
        !byte 8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,15,16,16,17,18,18,19,20,20
        !byte 21,22,23,23,24,25,26,26,27,28,29,30,31,31,32,33,34,35,36,37,38,39,40,41
        !byte 42,44,45,46,47,48,49,51,52,53,54,56,57,58,60,61,63,64,66,67,69,70,72,74
        !byte 75,77,79,80,82,84,86,88,90,91,93,95,97,100,102,104,106,108,111,113,115,118,120,123
        !byte 125,128,130,133,136,139,142,145,148,151,154,157,160,163,167,170,174,177,181,185,189,193,197,201
        !byte 205,209,213,218,223,227,232,237,242,247,252,2,7,13,19,25,31,37,44,51,57,64,72,79
        !byte 87,95,103,111,120,129,138,147,157,167,177,188,199,211,223,235,248,5,19,33,48,64,80,96
        !byte 114,132,151,171,192,214,236,4,30,56,84,113,144,177,212,249,32,74,119,166,217,16,76,139
        !byte 209,28,110,200,43,153,19,155,52,225,168,141,152,212,79,30,97,74,43,154,191,84,125,250
        !byte 255,250,125,84,191,154,43,74,97,30,79,212,152,141,168,225,52,155,19,153,43,200,110,28
        !byte 209,139,76,16,217,166,119,74,32,249,212,177,144,113,84,56,30,4,236,214,192,171,151,132
        !byte 114,96,80,64,48,33,19,5,248,235,223,211,199,188,177,167,157,147,138,129,120,111,103,95
        !byte 87,79,72,64,57,51,44,37,31,25,19,13,7,2,252,247,242,237,232,227,223,218,213,209
        !byte 205,201,197,193,189,185,181,177,174,170,167,163,160,157,154,151,148,145,142,139,136,133,130,128
        !byte 125,123,120,118,115,113,111,108,106,104,102,100,97,95,93,91,90,88,86,84,82,80,79,77
        !byte 75,74,72,70,69,67,66,64,63,61,60,58,57,56,54,53,52,51,49,48,47,46,45,44
        !byte 42,41,40,39,38,37,36,35,34,33,32,31,31,30,29,28,27,26,26,25,24,23,23,22
        !byte 21,20,20,19,18,18,17,16,16,15,15,14,14,13,13,12,12,11,11,10,10,9,9,8
        !byte 8,8,7,7,6,6,6,5,5,5,4,4,4,4,3,3,3,3,2,2,2,2,2,1
        !byte 1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0
        * = $9d00
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
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2
        !byte 2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3
        !byte 3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,5,5,5,5,5,6,6,6
        !byte 6,7,7,7,8,8,9,9,10,10,11,12,13,14,16,18,20,23,27,32,40,54,81,162
        !byte 255,162,81,54,40,32,27,23,20,18,16,14,13,12,11,10,10,9,9,8,8,7,7,7
        !byte 6,6,6,6,5,5,5,5,5,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3
        !byte 3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
        !byte 2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        * = $a100
ddyLoTQ: !byte 255,250,125,84,191,154,43,74,97,30,79,212,152,141,168,225,52,155,19,153,43,200,110,28
        !byte 209,139,76,16,217,166,119,74,32,249,212,177,144,113,84,56,30,4,236,214,192,171,151,132
        !byte 114,96,80,64,48,33,19,5,248,235,223,211,199,188,177,167,157,147,138,129,120,111,103,95
        !byte 87,79,72,64,57,51,44,37,31,25,19,13,7,2,252,247,242,237,232,227,223,218,213,209
        !byte 205,201,197,193,189,185,181,177,174,170,167,163,160,157,154,151,148,145,142,139,136,133,130,128
        !byte 125,123,120,118,115,113,111,108,106,104,102,100,97,95,93,91,90,88,86,84,82,80,79,77
        !byte 75,74,72,70,69,67,66,64,63,61,60,58,57,56,54,53,52,51,49,48,47,46,45,44
        !byte 42,41,40,39,38,37,36,35,34,33,32,31,31,30,29,28,27,26,26,25,24,23,23,22
        !byte 21,20,20,19,18,18,17,16,16,15,15,14,14,13,13,12,12,11,11,10,10,9,9,8
        !byte 8,8,7,7,6,6,6,5,5,5,4,4,4,4,3,3,3,3,2,2,2,2,2,1
        !byte 1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,1,1,1,1,1,1,1,2,2,2,2,2,3,3,3,3,4,4,4,4,5
        !byte 5,5,6,6,6,7,7,8,8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,15
        !byte 16,16,17,18,18,19,20,20,21,22,23,23,24,25,26,26,27,28,29,30,31,31,32,33
        !byte 34,35,36,37,38,39,40,41,42,44,45,46,47,48,49,51,52,53,54,56,57,58,60,61
        !byte 63,64,66,67,69,70,72,74,75,77,79,80,82,84,86,88,90,91,93,95,97,100,102,104
        !byte 106,108,111,113,115,118,120,123,125,128,130,133,136,139,142,145,148,151,154,157,160,163,167,170
        !byte 174,177,181,185,189,193,197,201,205,209,213,218,223,227,232,237,242,247,252,2,7,13,19,25
        !byte 31,37,44,51,57,64,72,79,87,95,103,111,120,129,138,147,157,167,177,188,199,211,223,235
        !byte 248,5,19,33,48,64,80,96,114,132,151,171,192,214,236,4,30,56,84,113,144,177,212,249
        !byte 32,74,119,166,217,16,76,139,209,28,110,200,43,153,19,155,52,225,168,141,152,212,79,30
        !byte 97,74,43,154,191,84,125,250,255,250,125,84,191,154,43,74,97,30,79,212,152,141,168,225
        !byte 52,155,19,153,43,200,110,28,209,139,76,16,217,166,119,74,32,249,212,177,144,113,84,56
        !byte 30,4,236,214,192,171,151,132,114,96,80,64,48,33,19,5,248,235,223,211,199,188,177,167
        !byte 157,147,138,129,120,111,103,95,87,79,72,64,57,51,44,37,31,25,19,13,7,2,252,247
        !byte 242,237,232,227,223,218,213,209,205,201,197,193,189,185,181,177,174,170,167,163,160,157,154,151
        !byte 148,145,142,139,136,133,130,128,125,123,120,118,115,113,111,108,106,104,102,100,97,95,93,91
        !byte 90,88,86,84,82,80,79,77,75,74,72,70,69,67,66,64,63,61,60,58,57,56,54,53
        !byte 52,51,49,48,47,46,45,44,42,41,40,39,38,37,36,35,34,33,32,31,31,30,29,28
        !byte 27,26,26,25,24,23,23,22,21,20,20,19,18,18,17,16,16,15,15,14,14,13,13,12
        !byte 12,11,11,10,10,9,9,8,8,8,7,7,6,6,6,5,5,5,4,4,4,4,3,3
        !byte 3,3,2,2,2,2,2,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,2,2,2,2,2,3
        !byte 3,3,3,4,4,4,4,5,5,5,6,6,6,7,7,8,8,8,9,9,10,10,11,11
        !byte 12,12,13,13,14,14,15,15,16,16,17,18,18,19,20,20,21,22,23,23,24,25,26,26
        !byte 27,28,29,30,31,31,32,33,34,35,36,37,38,39,40,41,42,44,45,46,47,48,49,51
        !byte 52,53,54,56,57,58,60,61,63,64,66,67,69,70,72,74,75,77,79,80,82,84,86,88
        !byte 90,91,93,95,97,100,102,104,106,108,111,113,115,118,120,123,125,128,130,133,136,139,142,145
        !byte 148,151,154,157,160,163,167,170,174,177,181,185,189,193,197,201,205,209,213,218,223,227,232,237
        !byte 242,247,252,2,7,13,19,25,31,37,44,51,57,64,72,79,87,95,103,111,120,129,138,147
        !byte 157,167,177,188,199,211,223,235,248,5,19,33,48,64,80,96,114,132,151,171,192,214,236,4
        !byte 30,56,84,113,144,177,212,249,32,74,119,166,217,16,76,139,209,28,110,200,43,153,19,155
        !byte 52,225,168,141,152,212,79,30,97,74,43,154,191,84,125,250
        * = $a500
ddyHiTQ: !byte 255,162,81,54,40,32,27,23,20,18,16,14,13,12,11,10,10,9,9,8,8,7,7,7
        !byte 6,6,6,6,5,5,5,5,5,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3
        !byte 3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
        !byte 2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2
        !byte 2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
        !byte 2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4
        !byte 5,5,5,5,5,6,6,6,6,7,7,7,8,8,9,9,10,10,11,12,13,14,16,18
        !byte 20,23,27,32,40,54,81,162,255,162,81,54,40,32,27,23,20,18,16,14,13,12,11,10
        !byte 10,9,9,8,8,7,7,7,6,6,6,6,5,5,5,5,5,4,4,4,4,4,4,4
        !byte 4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2
        !byte 2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        !byte 1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
        !byte 2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4
        !byte 4,4,4,4,4,4,4,4,5,5,5,5,5,6,6,6,6,7,7,7,8,8,9,9
        !byte 10,10,11,12,13,14,16,18,20,23,27,32,40,54,81,162
        * = $a900
; SIGNED quarter-unit offset from the view centre, |v| < 128, so one byte covers the whole FOV
; and there is no second table. The first cut stored a 10-bit value as lo/hi pairs and the hi
; table landed on $c000 -- which is stackLT, the subdivision's own stack. It rendered fine until
; the recursion got deep enough to reach it, then corrupted every span from mid-screen right.
rayOffQS: !byte 162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,187,188,189,190,191,192,193,194,196,197,198,199,200,201,203,204,205,206,207,209,210,211,212,214,215,216,217,219,220,221,222,224,225,226,228,229,230,232,233,234,235,237,238,239,241,242,243,245,246,247,249,250,251,253,254,255,1,2,3,5,6,7,9,10,11,13,14,15,17,18,19,21,22,23,24,26,27,28,30,31,32,34,35,36,37,39,40,41,42,44,45,46,47,49,50,51,52,53,55,56,57,58,59,60,62,63,64,65,66,67,68,69,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94
        ; Step tables, one page each. Addressed by qA*(LM*LB) + qM*LB + qB, so a full byte of
        ; index -- exactly the case a page crossing taxes, and exactly why they are up here
        ; rather than packed in below the height tables where they used to live.
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
        * = $ae00
; The (at most two) runs each run meets at a CONCAVE corner, 0 for none. subFace keeps its
; corner line only when the run across the boundary is one of these; every other run-to-run
; boundary is a convex silhouette, where the wall's edge stands against something unrelated
; behind it and the 20-row step has already drawn the division.
; Indexed by run id, so whole tables rather than a packed set.
; Emitted only when CVXSEAM=0. With every run-to-run boundary drawing a line, nothing reads
; these -- 132 bytes of corner-partner
; tables and the whole build-time derivation exist purely to tell a corner from a silhouette,
; and the renderer no longer cares which it is.

        * = $af00
; The ninth index bit costs a second copy of every code table plus the thresholds that derive
; it. Each is page-aligned so "lda table,y" stays 4 cycles -- a page crossing here would tax the
; hottest lookup in the renderer. The single-copy rampT/stepT are not emitted at all under
; PLAN=3, which pays back four of these twelve pages.
rampTlo: !byte 22,22,22,22,101,160,112,158,226,50,159,28,28,28,170,170,22,22,22,22,101,160,162,157
        !byte 157,142,20,210,210,169,169,78,22,22,22,22,101,111,93,53,154,142,20,210,169,169,78,172
        !byte 22,22,22,22,51,99,116,119,154,20,20,210,149,149,172,172,22,22,22,89,14,68,100,109
        !byte 35,71,54,149,149,25,25,92,221,221,69,12,55,11,63,126,19,110,105,25,25,25,97,97
        !byte 151,6,220,113,45,8,70,59,187,91,163,146,146,146,97,139,156,75,113,131,94,72,37,2
        !byte 43,33,82,144,144,128,128,127,88,75,52,52,29,57,140,18,3,48,114,44,128,128,127,127
        !byte 192,52,52,76,29,184,62,143,26,34,85,115,15,15,15,177,202,213,213,213,199,174,225,108
        !byte 74,65,21,42,42,5,5,5,27,24,24,24,190,36,165,124,120,141,30,5,5,5,5,5
        !byte 27,24,24,175,190,36,167,124,222,10,30,5,5,5,5,5,27,24,24,175,36,36,167,122
        !byte 222,10,61,5,5,5,5,5,27,175,175,175,36,80,80,122,96,10,61,5,5,5,5,5
        !byte 23,175,175,175,183,80,201,196,96,102,61,5,5,5,5,5
        * = $b000
rampThi: !byte 22,22,22,22,101,111,162,157,157,142,159,178,170,169,169,78,22,22,22,22,101,111,93,157
        !byte 154,142,20,78,169,169,78,172,22,22,22,22,51,111,116,119,154,142,20,172,149,149,78,208
        !byte 22,22,22,22,9,147,116,117,35,20,54,172,149,78,172,208,22,22,89,84,14,86,13,109
        !byte 71,207,54,92,25,25,92,176,69,69,69,47,60,11,46,73,19,91,25,97,97,97,97,132
        !byte 6,220,113,113,145,17,70,121,98,91,82,146,146,139,139,132,6,75,131,81,94,133,83,2
        !byte 129,107,82,44,44,128,127,173,75,52,52,219,29,57,56,90,3,87,39,127,127,127,127,179
        !byte 79,76,76,76,166,62,62,32,77,34,66,15,15,177,177,177,79,213,24,199,199,36,123,108
        !byte 130,58,21,5,5,5,5,5,197,175,175,183,183,80,167,122,96,10,61,5,5,5,5,5
        !byte 24,24,175,175,36,80,167,122,96,10,61,5,5,5,5,5,24,24,175,175,36,80,201,122
        !byte 96,102,61,5,5,5,5,5,24,175,175,175,183,80,201,196,96,102,61,5,5,5,5,5
        !byte 197,183,194,194,194,203,200,195,41,102,61,5,5,5,5,5
        * = $b100
stepT1lo: !byte 89,101,111,162,158,226,50,159,125,22,51,86,134,117,181,49,198,172,22,51,11,70,181,49
        !byte 138,138,189,22,14,106,67,109,35,142,20,182,22,14,86,13,73,19,207,54,149,22,14,68
        !byte 70,2,3,138,138,176,221,12,204,11,63,19,19,20,180,47,60,8,46,126,19,110,105,25
        !byte 221,14,11,63,2,3,87,138,97,151,6,204,8,59,150,50,50,125,113,145,8,70,59,187
        !byte 91,163,193,151,14,11,70,59,3,87,205,132,156,156,191,103,2,43,34,50,125,131,94,72
        !byte 103,2,2,33,206,144,156,14,11,103,2,43,87,205,127,88,88,88,103,2,3,48,21,182
        !byte 52,29,57,140,2,211,3,48,218,88,14,11,70,2,3,87,39,127,192,191,192,192,192,3
        !byte 34,66,182,64,64,184,140,18,3,34,164,104,188,185,36,32,32,77,34,66,15,168,168,152
        !byte 168,168,3,34,21,182,79,199,152,140,135,153,153,164,215,188,188,36,123,108,130,65,21,42
        !byte 7,7,152,152,7,7,152,152,215,27,24,152,152,135,155,153,209,155,23,183,80,201,122,120
        !byte 141,30,30
        * = $b200
stepT1hi: !byte 9,9,147,116,117,154,142,20,16,22,51,134,181,181,49,198,198,208,22,51,11,70,181,49
        !byte 138,138,31,89,14,68,100,109,71,71,54,149,22,14,13,13,181,49,198,198,92,22,14,68
        !byte 70,2,3,138,176,176,47,60,11,63,63,19,19,54,40,47,60,17,46,73,148,91,25,97
        !byte 221,14,11,63,2,3,138,132,132,113,45,8,63,59,187,150,54,40,81,145,17,37,59,98
        !byte 91,205,139,151,14,11,70,59,3,205,132,132,75,191,8,103,2,43,34,50,40,81,29,133
        !byte 83,2,43,107,82,144,156,14,11,103,2,43,205,173,173,75,191,191,103,2,3,48,21,40
        !byte 219,29,57,56,90,3,48,114,128,88,14,11,70,2,3,39,179,179,192,191,152,103,192,3
        !byte 34,66,40,76,166,184,62,32,77,34,85,224,175,185,36,32,32,77,58,66,177,202,191,152
        !byte 152,135,3,34,21,40,213,199,174,123,108,74,34,21,42,175,183,80,201,130,130,58,21,5
        !byte 7,152,152,152,135,155,209,209,40,24,190,152,135,135,153,209,21,42,4,4,203,200,195,41
        !byte 102,61,42
        * = $b300
stepT2lo: !byte 137,101,111,112,158,226,50,159,125,22,51,134,134,181,49,54,172,172,22,51,197,95,181,49
        !byte 198,138,189,22,22,106,67,53,154,142,159,182,22,14,86,13,73,19,54,25,92,22,14,68
        !byte 95,95,38,10,138,176,69,55,106,11,63,19,110,20,180,47,60,8,46,73,19,110,54,97
        !byte 221,55,11,63,95,38,138,138,97,151,6,8,8,8,150,150,118,180,220,145,8,70,59,187
        !byte 150,163,193,6,51,8,70,59,38,10,205,132,156,191,191,103,103,43,107,171,128,131,94,8
        !byte 103,103,43,33,206,214,75,51,197,37,2,43,87,205,127,88,191,191,103,18,3,48,171,128
        !byte 52,29,57,140,2,212,48,48,218,75,51,197,95,18,77,87,39,127,192,191,191,152,157,26
        !byte 34,85,15,64,52,184,140,18,26,3,164,104,188,185,184,32,32,77,34,66,15,168,191,152
        !byte 152,157,157,65,21,42,79,79,213,140,135,153,34,164,104,188,188,188,225,95,130,65,21,42
        !byte 7,7,152,152,135,153,209,30,5,27,27,152,135,135,153,209,209,172,23,23,197,95,95,38
        !byte 10,30,30
        * = $b400
stepT2hi: !byte 9,51,147,223,119,216,216,171,16,22,51,134,134,181,49,198,198,208,22,51,197,95,181,49
        !byte 198,138,31,89,14,86,13,109,71,216,171,16,22,14,13,13,181,49,198,92,92,22,14,68
        !byte 95,95,38,10,138,176,47,60,11,63,63,19,110,40,40,47,17,17,46,73,148,107,97,97
        !byte 221,55,11,63,95,38,138,97,132,220,45,8,63,59,187,91,163,40,81,145,17,70,121,148
        !byte 107,205,40,6,51,8,70,59,38,10,132,132,75,45,8,103,103,43,107,171,128,131,133,133
        !byte 83,2,129,107,205,144,75,51,197,37,2,43,205,173,173,75,191,8,103,18,3,48,171,128
        !byte 64,29,57,56,90,3,87,39,217,75,51,197,95,18,77,39,127,179,75,191,152,152,157,26
        !byte 34,85,15,64,64,184,62,32,77,34,85,224,185,185,32,32,32,58,58,66,177,202,202,152
        !byte 152,157,157,65,21,42,188,199,174,225,108,74,34,21,42,175,183,80,123,130,130,58,21,5
        !byte 202,152,152,152,135,153,209,30,5,27,24,36,36,108,153,209,21,172,4,4,203,200,195,41
        !byte 102,61,30
        * = $b500
stepT3lo: !byte 137,101,160,112,158,50,50,50,125,20,20,223,223,119,154,142,159,170,172,172,172,172,172,172
        !byte 172,171,78,22,14,106,67,53,50,50,50,182,207,207,13,13,109,71,207,54,149,92,92,92
        !byte 92,92,92,25,25,92,69,12,11,11,11,226,182,182,182,47,60,11,63,126,19,110,105,180
        !byte 97,97,97,97,97,97,25,25,97,6,45,8,8,8,150,150,180,180,17,17,17,70,59,187
        !byte 150,118,118,139,139,139,139,139,139,107,146,139,156,94,8,103,75,75,75,75,215,81,133,72
        !byte 103,2,2,33,206,215,128,128,128,128,128,128,107,82,144,75,29,8,103,52,52,52,52,52
        !byte 29,29,57,140,2,186,3,218,218,127,127,127,127,127,39,39,39,44,192,29,29,140,79,79
        !byte 79,79,79,185,166,184,62,18,3,26,161,161,185,185,32,32,32,77,34,85,115,202,213,213
        !byte 62,27,27,27,27,27,199,199,174,225,108,26,34,164,104,194,194,203,58,58,58,58,21,21
        !byte 27,24,24,167,135,98,91,105,172,175,190,36,165,124,120,209,21,21,194,194,203,196,196,96
        !byte 10,30,21
        * = $b600
stepT3hi: !byte 9,51,147,116,157,226,50,159,125,20,20,147,13,117,35,20,20,169,172,172,172,172,172,172
        !byte 172,78,31,84,14,68,100,100,226,182,182,182,207,207,13,13,71,19,54,54,25,92,92,92
        !byte 92,92,92,25,25,176,47,55,11,11,11,11,180,180,180,17,17,17,46,73,19,91,25,118
        !byte 97,97,97,97,97,97,25,97,132,136,45,8,8,8,150,150,118,118,17,17,17,59,121,148
        !byte 91,163,214,139,139,139,139,139,139,107,146,132,81,94,8,103,75,75,75,75,215,81,83,133
        !byte 37,2,43,107,82,214,128,128,128,128,128,128,205,205,173,52,29,29,140,52,52,52,52,52
        !byte 185,185,90,56,18,3,48,114,218,127,127,127,127,127,39,39,39,127,76,29,29,140,79,79
        !byte 79,79,79,185,185,32,32,143,26,34,164,104,185,185,203,32,32,58,58,66,15,213,199,174
        !byte 62,27,27,27,27,27,185,123,123,123,108,74,65,21,21,4,4,203,200,195,41,58,21,5
        !byte 23,190,36,167,135,98,91,105,172,194,183,80,201,122,222,10,30,21,4,4,203,200,195,41
        !byte 102,61,30
        * = $b700
rampThrT: !byte 0,0,0,0,0,1,1,1,2,3,0,7,5,6,6,9,0,0,0,0,0,1,2,0,3,0,0,9,8,0,10,12,0,0,0,0,1,0,3,4,0,0,0,10,9,9,0,13,0,0,0,0,2,3,0,5,5,0,8,11,0,10,0,13,0,0,1,2,0,4,5,0,6,7,0,11,10,0,12,14,1,1,0,3,4,0,6,7,0,9,10,12,12,12,0,15,1,2,3,0,5,6,0,8,8,0,11,0,0,13,14,15,1,0,4,5,0,7,8,0,10,11,0,13,13,0,15,16,2,3,0,5,0,0,8,10,0,12,13,14,15,15,0,16,3,5,5,0,7,9,0,11,12,0,14,15,0,16,16,0,3,0,7,8,0,10,11,0,13,14,0,16,16,0,0,0,7,9,10,11,11,12,12,13,14,15,16,0,0,0,0,0,5,0,9,0,10,12,0,13,15,0,16,0,0,0,0,0,6,0,9,0,0,12,13,0,15,16,0,0,0,0,0,0,6,0,0,0,12,0,14,15,0,16,0,0,0,0,0,0,9,12,13,13,14,15,15,16,16,0,0,0,0,0,0,0
        * = $b800
stepThrT1: !byte 2,1,3,3,3,3,4,4,5,0,0,6,7,7,9,11,0,13,0,0,0,0,0,0,0,0,16,1,0,3,4,0,6,6,7,5,0,0,6,0,8,9,11,11,11,0,0,0,0,0,0,0,15,0,2,3,4,5,0,0,0,7,6,0,0,6,0,7,9,9,10,11,0,0,0,0,0,0,14,15,16,2,3,4,5,0,6,1,1,6,5,0,6,7,0,8,0,11,12,0,0,0,0,0,0,14,15,0,1,1,3,0,0,0,0,0,5,5,6,7,7,0,9,11,11,0,0,0,0,0,0,0,14,15,16,1,1,1,0,0,0,0,0,5,5,0,0,8,9,10,11,12,13,0,0,0,0,0,0,14,15,16,0,0,3,3,0,0,0,0,6,6,7,0,8,10,11,0,13,14,9,0,0,0,0,0,14,0,16,1,2,0,1,1,0,0,0,5,6,0,8,9,10,11,11,13,9,9,9,12,13,13,0,14,0,16,0,1,0,0,3,3,5,5,6,7,8,0,7,0,9,11,13,11,12,14,15,15,15,15,15,15,15
        * = $b900
stepThrT2: !byte 2,1,2,2,3,4,3,4,5,0,0,0,0,0,0,10,12,13,0,0,0,0,0,0,0,0,16,1,1,3,4,4,5,6,6,7,0,0,6,0,8,9,11,12,0,0,0,0,0,0,0,0,0,0,2,3,3,5,0,0,0,8,9,0,6,6,0,0,8,11,10,0,0,0,0,0,0,0,0,15,16,1,3,0,5,5,6,7,7,7,5,0,6,0,7,8,9,11,10,0,0,0,0,0,0,0,15,0,1,3,4,0,0,0,0,0,0,0,6,6,7,7,9,10,11,11,0,0,0,0,0,0,14,15,16,1,0,4,0,0,0,0,0,0,5,0,0,8,9,9,11,12,12,0,0,0,0,0,0,14,15,16,1,0,4,0,0,0,0,0,0,0,6,0,8,10,11,11,13,13,8,0,10,0,0,14,14,0,16,1,3,0,0,0,0,0,0,0,6,6,8,8,9,11,0,13,14,10,10,11,12,12,0,14,0,16,1,3,0,0,0,0,0,0,0,0,6,8,9,10,0,0,13,0,12,13,13,14,14,15,15,16,0
        * = $ba00
stepThrT3: !byte 2,1,2,2,1,1,0,1,0,0,0,4,5,5,5,6,6,7,0,0,0,0,0,0,0,9,14,1,0,3,3,3,1,1,1,0,0,0,0,0,6,7,9,0,10,0,0,0,0,0,0,0,0,15,3,3,0,0,0,4,3,3,3,6,6,6,6,7,0,9,10,6,0,0,0,0,0,0,0,12,15,3,0,0,0,0,0,0,5,5,0,0,0,7,7,8,8,9,7,0,0,0,0,0,0,0,0,15,4,0,0,0,0,0,0,0,0,0,8,7,7,0,9,10,10,8,0,0,0,0,0,0,13,13,15,3,0,6,6,0,0,0,0,0,9,9,9,8,9,10,11,11,0,0,0,0,0,0,0,0,0,14,4,0,0,0,0,0,0,0,0,0,11,10,11,10,11,12,12,12,0,0,14,0,0,14,14,14,15,4,7,7,0,0,0,0,0,0,11,10,10,11,0,12,13,13,13,15,15,0,15,15,15,0,0,15,7,8,8,0,0,0,0,0,0,13,11,11,12,13,14,14,14,0,16,16,0,16,16,16,16,16,15
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


