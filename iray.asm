
charset = $2800
charsetB = $3800
px      = $02
py      = $04
pa      = $06
rang    = $07
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
cptr    = $1a
r0      = $1c
r1      = $1d
crc     = $1e
tmp     = $1f
baseHi  = $22
paF     = $cb5b                  ; low byte of the 16-bit player angle; pa is the high
dtv     = $cb50
dtm     = $cb59                  ; elapsed ticks scaled for movement, and for turning
dtt     = $cb5a
lastMv  = $cb51
dxs     = $cb52
dxsH    = $cb53
dys     = $cb54
dysH    = $cb55
dxSgn   = $cb56
dySgn   = $cb57
rowv    = $cb58                  ; keyboard row 1, held so SHIFT/E/S read it once
dxv     = $23
dyv     = $24
nxL     = $25
nxH     = $26
nyL     = $27
nyH     = $28
iterLo  = $29
iterHi  = $2a
remLo2  = $2b
cnt     = $2c
zpc     = $2d
frcnt   = $2e
lastf   = $2f
gi      = $30
cb      = $31
hh0     = $32
hh1     = $33
hh4     = $34
dd      = $35
xcol    = $36
hcur    = $37
tval    = $38
bval    = $39
ccell   = $3a
patt    = $3c
sprd    = $3d
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
patLo   = $59
patHi   = $5a
tpLo    = $5b
tpHi    = $5c
btLo    = $5d
btHi    = $5e
cellc   = $5f
spanL   = $60
spanR   = $61
sp      = $62
errv    = $63
syNeg   = $64
t1c     = $65
tbc     = $66
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
nbnd    = $14                   ; how many span delimiters the search pinned
nbnd    = $14                   ; delimiters the search pinned this frame
bcur    = $18
bswp    = $19
bcnt    = $08
nbnd    = $14                   ; delimiters the search pinned this frame
bcur    = $18
bswp    = $19
bcnt    = $08
cell0   = $13                   ; the player's own cell index, constant for the frame
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
ssCol   = $9c                   ; calcU: column, ray angle and side for the column in hand
ssAng   = $9d
ssSd    = $9e
ssCL    = $9f                   ; cell coordinate along the face, at spanL
mp      = $98                   ; mul8 operands / product
mq      = $99
plo     = $9a
phi     = $9b
cx0     = $82                   ; collision box corners, in map cells
cx1     = $83
cy0     = $84
cy1     = $85
stackLT = $c000
stackRT = $c080
; per-logical-column arrays, now 160 entries each (was 80). Page-aligned so a column
; index never needs a 16-bit add.
sideT   = $c100
idT     = $c200
colH    = $c300
cwA     = $c500                 ; per cell-column: the ceiling run length this buffer holds
cwB     = $c528
cbA     = $c550                 ; ... and the solid run start, or $ff for "always redraw"
cbB     = $c578
faceIdT = $c400
cellFaceT = $c4a0            ; per cell-column (40): the wall run its face belongs to
cstepT  = $c680                 ; per cell-column (40): face-boundary column, 0 = none
pfAcc   = $c900                 ; PROFILE: 7 phases x 3 bytes, raster lines summed
pfPrvF  = $c920                 ; previous timestamp: frame counter, then raster line
pfPrvL  = $c922
pfN     = $c923                 ; frames accumulated so far (2 bytes)
pfCurF  = $c925                 ; scratch for one timestamp read and the delta
pfCurL  = $c926
pfCurX  = $c927
pfDLo   = $c928
pfDHi   = $c929
pfRow   = $c92a
pfDone  = $c92b
seamT   = $c6c0                 ; per cell-column (40): char code for the solid run --
                                ;   SOLID, or a seam variant when a panel line lands here
; orbMove's hot working set, on seamSpan's scratch -- dead by the time orbMove runs
oaL     = $87
oaH     = $88
oaS     = $89
obm     = $8a
obs     = $8b
orL     = $8c
orH     = $8d
odxL    = $8e
odxH    = $8f
odxS    = $90
odyL    = $91
odyH    = $92
odyS    = $93
o0      = $94
o1      = $95
o2      = $96
ivL     = $97
ivH     = $9c                    ; $98-$9b is mul8's mp/mq/plo/phi -- step over it
ohgt    = $9d
omptr   = $87                    ; 2 bytes: this orb's occluder bitmap. Shares oaL/oaH,
                                ;   which are dead once the column offset has been worked out
ocptr   = $9e                    ; 2 bytes: into the cell's visibility list
; ... and the cold tail, touched once or twice each, left in absolute RAM
ocos    = $cb00
ocosS   = $cb01
osin    = $cb02
osinS   = $cb03
fwdL    = $cb04
fwdH    = $cb05
rgtL    = $cb06
rgtH    = $cb07
ogL     = $cb08
ogH     = $cb09
oe      = $cb0a
o3      = $cb0b
ocoff   = $cb0c
ovar    = $cb0d
ocmax   = $cb0e
ocnear  = $cb0f
ocol    = $cb10
ocspan  = $cb11
ocl     = $cb12
ocr     = $cb13
ocrow   = $cb14
ocrw2   = $cb15
ocl2    = $cb16
oidx    = $cb17
ocn3    = $cb2a
ocn     = $cb18
ocy     = $cb19
onv     = $cb1a
omEn    = $cb1b
omXX    = $cb1c
omYY    = $cb1d
omPri   = $cb1e
omX8    = $cb1f
omBit   = $cb20
omMix   = $cb21
obX     = $cb30
obY     = $cb38
obP     = $cb40
obC     = $cb48                  ; per-sprite state, flushed to the VIC in the border
opx     = $cb5c                  ; the viewpoint orbMove last projected from
opy     = $cb5e
opa     = $cb60
rpOn    = $cb61                  ; ... and the cell rectangle it repointed, to replay
rpH     = $cb62
rpRow   = $cb63
ofx     = $cb64
ofy     = $cb65
kxc     = $cb66
kxs     = $cb67
kyc     = $cb68
kys     = $cb69
kfL     = $cb6a
kfH     = $cb6b
krL     = $cb6c
krH     = $cb6d
oix     = $cb6e
oiy     = $cb6f
oax     = $cb70
oay     = $cb71
oixS    = $cb72
oiyS    = $cb73
ocmask  = $cb74                  ; per cell under the sprite: 1 = its face cannot occlude
oflag   = $cb75                  ; DBGORB: candidates that passed the bearing test
odb     = $cb22                  ; DBGORB scratch: six bytes shown as hex on screen row 3
bndT    = $ca00                 ; columns where a face or saturation state begins
remLoT  = $c700                 ; per marched column: castRay's raw hit distance, 8.8 cells.
remHiT  = $c800                 ;   Parked so u can be derived later, only where it is needed.

        * = $0801
        !byte $0c,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
entry:
        sei
        lda #$36                ; LORAM off: BASIC ROM out, so $a000-$bfff reads the RAM the
        sta $01                 ; program was loaded into. The relocated tables have grown past
                                ; $a000 and were silently reading ROM -- step patterns came back
                                ; as BASIC bytes, so corners picked nonsense and flickered.
                                ; KERNAL and I/O stay mapped.
        lda #$00
        sta $d01a
        lda $dd00
        ora #$03
        sta $dd00
        lda #$1b
        sta $d011
        lda #$18
        sta $d016               ; MCM: multicolor text -> 4 logical px per cell, 2 physical px each
        lda #$10
        sta d018vm              ; display buffer A; IRQ ORs the charset bits per half-screen
        lda #$1a
        sta $d018
        lda #$01
        sta $d021               ; 00 = white  (ceiling / floor)
        lda #$00
        sta $d022               ; 01 = black  (readout glyphs only; walls moved to 11)
        lda #$0b
        sta $d023               ; 10 = panel seam. Its own register precisely so the tone can
                                ; be retuned without touching a charset entry: bit pairs 00
                                ; and 01 carry the shape, 10 carries only the seam.
        lda #$00
        sta $d020
        lda #$ff
        sta $dc02
        lda #$00
        sta $dc03
        ldx #$00
        ldx #$00                ; no run cached for either buffer yet. NOT in the sprite
        lda #$ff                ; setup: SPRITES=0 builds render too, and an uninitialised
rfCz:   sta cwA,x               ; cache byte that happens to match rb or rs leaves a column
        inx                     ; never drawn at all
        bne rfCz
        lda #$08                ; bit3 = per-cell multicolor enable. The low three bits are
                                ; the bit-pair-11 colour, and nothing emits 11 any more --
                                ; shape comes from 00/01 and seams from 10 -- so this is
                                ; written once at startup and never touched again.
ccf:    sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne ccf
        ; ---- orb sprite: static setup. Position and shape change per frame in orbMove.
        lda #$00
        sta $d015               ; nothing visible until orbMove has decided what is
        sta rpOn
        lda pa
        eor #$80
        sta opa                 ; cannot match pa, so the first frame never takes the still path
        lda #$ff
        sta $d01c               ; ALL eight in multicolor -- orbMove hands out slots as it
                                ; finds visible orbs, so any of them can be in use. $d015 is
                                ; built per frame and not set here.
        lda #1
        sta $d01b               ; sprite 0 BEHIND foreground. Walls are bit pair 11 and seams
                                ; 10, both foreground, so the VIC clips the orb against the
                                ; scene per pixel and orbMove does not test occlusion at all.
        sta $d017
        sta $d01d
        lda #$0b
        sta $d025               ; bit pair 01 = blue, the shaded underside
        lda #$0f
        sta $d026               ; bit pair 11 = grey 3, highlight and ground shadow
        lda #$0e
        sta $d027               ; bit pair 10 = light blue, the body
        lda #128
        sta $07f8               ; the pointer lives in the SCREEN, so both buffers need it
        sta $27f8
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
        lda #$04
        sta baseHi
        lda #$00
        sta iterLo
        sta iterHi
        ; raster IRQ frame counter (for fps)
        lda #<irq
        sta $0314
        lda #>irq
        sta $0315
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
        lda #$01       ; and every cell back to a plain solid fill
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
        lda #$00                ; explicit: the clears above leave A holding their own fill
        sta nbnd
        sta col
        jsr marchCol            ; column 0

        lda #159
        sta col
        jsr marchCol            ; column 79

        lda #$00
        sta stackLT
        lda #159
        sta stackRT             ; push (0,79)
        lda #$01
        sta sp
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
        lda spanR
        lsr
        lsr
        tax
        lda seamT,x
        cmp #$01
        bne subCn               ; a line is already claimed in this cell; one per char code
        lda spanR
        and #$03
        clc
        adc #$f8
        sta seamT,x
subCn:
        jsr subBnd              ; a face starts here: remember it as a span delimiter
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
        bne subLp               ; first boundary in a cell wins, as the old adjacent-pair scan did
        lda tmp
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
subDn:  lda #$00                ; the first face always starts at column 0
        sta spanL
        sta bcur
        lda nbnd
        beq subOne              ; no delimiters: the whole screen is one face
        cmp #$02
        bcc subEmt              ; one delimiter needs no sorting
        ldx nbnd                ; bubble the handful of delimiters into column order
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
        ; ---- which wall face does each CELL show? ----
        ; A span has one face at both ends by construction, so filling per cell here costs at
        ; most 40 stores a frame -- against 160 if faceIdT were filled per column, which it is
        ; not (castRay writes it only where it actually marched). Cell granularity is all the
        ; sprite occlusion needs: it repoints whole cells anyway. A cell straddling two spans
        ; takes the later one, which is the same approximation the repointing already makes.
        lda spanL
        lsr
        lsr
        tax
        lda spanR
        lsr
        lsr
        sta tmp2
        ldy spanL
        lda faceIdT,y           ; the span's face: both ends agree, that is why it merged
cfLp:   sta cellFaceT,x
        inx
        cpx tmp2
        bcc cfLp
        beq cfLp
        jsr interpSpan
        jsr seamSpan
subFDn: rts

subBnd: ldx nbnd                ; remember a column where a new face/saturation state begins
        cpx #20
        bcs subBDn              ; list full: leave the rest as the search left them
        lda spanR
        sta bndT,x
        inc nbnd
subBDn: rts

subFin:
        jsr renderSym
        jsr drawFps
        jsr drawDbg
        jsr orbMove             ; needs colH, so after the render

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
        cmp #$04
        bne mshB
        lda #$10
        sta d018vm              ; show A, draw into B (IRQ ORs in the charset bits)
        lda #$24
        sta baseHi
        jmp mnext
mshB:   lda #$90
        sta d018vm              ; show B, draw into A
        lda #$04
        sta baseHi
mnext:
        jsr osFlush             ; sprite registers, now that the beam is out of the way
        inc iterLo
        bne mloop
        inc iterHi
        jmp mloop

; The old makeDiv drew a white seam slit by ZEROING colH at each face boundary. That is
; incompatible with 4-wide cells -- a zeroed column silently became a ramp endpoint, so a
; boundary landing on a cell edge turned the whole cell into a diagonal. It is also now
; redundant: the face boundary is rendered as a true vertical step (see prepCells/cstepT).

; ============ prepCells: per cell-column summary, once per frame ============
; renderSym visits 520 cells but only ~25 are edge cells; the other 495 must be rejected
; as fully-solid or fully-blank as cheaply as possible. Computing min/max over 4 columns
; inside that loop would cost 4 loads per cell, so it is hoisted here: 40 iterations
; instead of 520. Also caps the height at 100 -- colH is deliberately left UNCAPPED by the
; interpolator so merged spans stay linear, but (h + K) must fit a signed byte downstream.
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
        cmp #$04
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
        cmp #$04
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
        ldy col4T,x             ; first logical column of this cell; colH is page-aligned, so
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
        ldx colc
        lda cstepT,x
        bne rfStep
        lda hh0                 ; single face: ramp, index = wL*16 + wR
        ora hh1                 ; hh0 is already <<4, straight from clmp16
        tay
        lda rampT,y
        jmp rfStore             ; (the ramp is the common case; see rfStore below)
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
        adc kpos
        tax
        dex                     ; X = 4*column + k - 1
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
        lda kpos
        cmp #$02
        beq rfSt2
        bcs rfSt3
        lda stepT1,y
        jmp rfStore
rfSt2:  lda stepT2,y
        jmp rfStore
rfSt3:  lda stepT3,y
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
rfSolid:lda seamT,x
        cmp #$01
        bne rfSlSm              ; a seam here: its variant can change without rs moving, so
        lda rsv           ; this column is never cached
rfCb1:  cmp cbA,x
        beq rfNext
rfCb2:  sta cbA,x
        jmp rfSlDr
rfSlSm: lda #$ff
rfCb3:  sta cbA,x               ; a value rs can never take, so next frame redraws too
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
        cmp #$01
        bne ssOne               ; already spoken for: one line per char code
        tya
        and #$03
        clc
        adc #$f8
        sta seamT,x
ssOne:  rts

; u for one marched column (X): where along the wall the ray landed, 8.8 cells.
; A y-face is a wall of constant y, so the coordinate that varies along it is x, and vice
; versa. u = p + d*dir, one sideMul: sideMul(fr, m) returns fr/256 * m, so feeding it |cos|
; (or |sin|) as 0..255 against the parked hit distance gives exactly d*|dir|. The sign comes
; from the same posXT/posYT the DDA used to choose its step. sideMul eats X, hence ssAng.
calcU:  stx ssCol
        lda remLoT,x
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
        ldx col
        sta idT,x
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
friSto: ldx col
        sta faceIdT,x
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
        lda pa
        clc
        adc rayOffT,x
        sta rang
        tax
        lda ddxLoT,x
        sta ddx
        lda ddxHiT,x
        sta ddxH
        lda ddyLoT,x
        sta ddy
        lda ddyHiT,x
        sta ddyH
        lda cell0               ; cell = mapY*16 + mapX, stepped by +-1 / +-16 from here on.
        sta cell                ; The value is the player's cell, so it is the same for every
                                ; ray in the frame -- computed once in mloop, not 11 times.
        ; X side dist: m = frac*ddx>>8 ; -x -> sdx=m ; +x -> sdx=ddx-m
        ; (standard form: full cell at frac=0, avoids the fr=256->0 wrap spike)
        lda px
        sta fr
        lda ddx
        sta mlo
        lda ddxH
        sta mhi
        jsr sideMul

        ldx rang
        lda posXT,x
        bne cxpos
        lda #$ff
        sta stpX
        lda s1
        sta sdx
        lda s2
        sta sdxH
        jmp cydo
cxpos:  lda #$01
        sta stpX
        sec
        lda ddx
        sbc s1
        sta sdx
        lda ddxH
        sbc s2
        sta sdxH
cydo:   lda py
        sta fr
        lda ddy
        sta mlo
        lda ddyH
        sta mhi
        jsr sideMul

        ldx rang
        lda posYT,x
        bne cypos
        lda #$ff
        sta stpY
        lda #$f0                ; -16: one cell row back
        sta stpY16
        lda s1
        sta sdy
        lda s2
        sta sdyH
        jmp cydone
cypos:  lda #$01
        sta stpY
        lda #$10                ; +16: one cell row on
        sta stpY16
        sec
        lda ddy
        sbc s1
        sta sdy
        lda ddyH
        sbc s2
        sta sdyH
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
cydone: ldy #24
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
cidx:   lda remH
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
irq:    lda $d019
        and #$01
        beq irqd                ; not a raster IRQ
        lda $d012
        cmp #$96
        bcs irqSplit
        ; --- top of frame: select charset A, arm the split ---
        lda d018vm
        ora #$0a
        sta $d018
        lda #$96
        sta $d012
        inc frameCnt
        bne irqd
        inc frameCnt+1
        jmp irqd
irqSplit:
        lda d018vm              ; --- horizon: select mirrored charset B ---
        ora #$0e
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
        adc #$e6
        sta (ppPtr),y
        iny
        lda fpsOnes
        clc
        adc #$e6
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
        adc #$e6
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
; sideT / idT / colH are per-frame mutable arrays in scratch RAM at $c100+ (see equates)
dataEnd:                        ; guard: must clear both screen buffers AND the charset -- see the layout check in build-iray.mjs

        * = $2000
orbBM:  !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,0,0,48,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,0,0,40,0,0,36,0,0,0,0,0,60,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,168,0,0,168,0,0,164,0,0,164,0,0,0,0,0,252,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,0,0,170,0,0,169,0,0,169,0,0,36,0,0,0,0,0,255,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,168,0,2,170,0,2,169,0,2,169,0,2,169,0,0,148,0,0,0,0,3,255,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,170,0,2,234,128,2,170,128,2,170,64,2,170,64,2,170,64,2,169,64,0,149,0,0,0,0,0,0,0,3,255,192,3,255,192,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,168,0,2,234,0,11,170,128,10,170,64,10,170,64,10,170,64,10,169,64,2,169,0,0,148,0,0,0,0,0,0,0,15,255,192,15,255,192,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,0,2,234,128,3,234,128,10,170,144,10,170,144,10,170,144,10,170,144,2,170,64,2,169,64,0,20,0,0,0,0,0,0,0,15,255,240,15,255,240,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,168,0,10,170,128,11,170,128,42,170,144,42,170,144,42,170,144,42,170,80,42,170,80,10,170,64,10,149,64,0,84,0,0,0,0,0,0,0,63,255,240,63,255,240,0
        !byte 0,0,0,0,0,0,0,170,0,2,170,128,11,234,160,43,170,164,42,170,164,42,170,164,42,170,148,42,170,148,42,170,148,42,170,84,10,170,80,2,149,64,0,85,0,0,0,0,0,0,0,0,0,0,0,255,0,63,255,252,3,255,192,0
        !byte 0,0,0,0,168,0,10,170,128,43,170,160,47,170,160,174,170,164,170,170,164,170,170,164,170,170,148,170,170,148,170,170,84,42,170,80,42,169,80,10,149,64,0,84,0,0,0,0,0,0,0,0,0,0,3,255,0,255,255,252,15,255,192,0
        !byte 0,170,0,10,170,160,43,234,168,47,170,168,174,170,169,170,170,169,170,170,169,170,170,165,170,170,165,170,170,165,170,170,149,42,170,148,42,170,84,10,149,80,0,85,0,0,0,0,0,0,0,0,0,0,0,255,0,255,255,255,3,255,192,0
        * = charset
        !byte 0,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,85,85,85,85,85,85,85,85,252,252,252,252,252,252,252,252
        !byte 63,63,63,63,63,63,63,63,3,3,3,3,3,3,3,3,192,192,192,192,192,192,192,192,240,240,240,240,240,240,240,240
        !byte 15,15,15,15,15,15,15,15,84,84,84,84,84,84,84,84,21,21,21,21,21,21,21,21,1,1,1,1,1,1,1,1
        !byte 64,64,64,64,64,64,64,64,80,80,80,80,80,80,80,80,5,5,5,5,5,5,5,5,0,0,0,0,0,0,0,1
        !byte 0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,5,0,0,0,0,1,1,5,5,0,0,0,1,1,1,5,5
        !byte 0,0,1,1,1,5,5,5,1,1,1,1,5,5,5,21,1,1,1,5,5,5,5,21,1,1,5,5,5,5,5,21
        !byte 1,1,5,5,5,5,21,21,1,5,5,5,5,5,21,21,0,0,0,0,0,0,1,5,0,0,1,1,1,5,5,21
        !byte 1,5,5,5,5,21,21,21,0,0,0,0,0,1,5,5,0,0,0,0,1,1,5,21,0,0,0,1,1,5,5,21
        !byte 1,1,5,5,5,21,21,21,5,5,5,5,5,21,21,21,0,0,0,0,0,0,0,5,0,0,0,0,0,0,1,21
        !byte 0,0,0,0,0,1,5,21,0,0,0,0,1,5,5,21,0,0,0,1,1,5,21,21,0,1,1,5,5,5,21,21
        !byte 5,5,5,5,21,21,21,21,0,0,0,0,0,0,0,64,0,0,0,0,0,0,0,80,0,0,0,0,0,0,0,85
        !byte 0,0,0,0,0,0,5,85,0,0,0,0,0,1,21,85,0,0,0,0,1,5,21,85,0,0,0,1,5,5,21,85
        !byte 0,0,1,1,5,21,21,85,0,1,1,5,5,21,21,85,1,1,5,5,21,21,21,85,5,5,5,21,21,21,21,85
        !byte 0,0,0,0,0,0,64,64,0,0,0,0,0,0,64,80,0,0,0,0,0,0,64,84,0,0,0,0,0,0,80,85
        !byte 0,0,0,0,0,0,85,85,0,0,0,0,0,5,85,85,0,0,0,0,1,21,85,85,0,0,0,1,5,21,85,85
        !byte 0,0,1,5,5,21,85,85,0,1,1,5,21,21,85,85,1,1,5,5,21,21,85,85,1,5,5,5,21,21,85,85
        !byte 1,5,5,21,21,21,85,85,5,5,5,21,21,21,85,85,0,0,0,0,0,64,64,80,0,0,0,0,0,64,80,80
        !byte 0,0,0,0,0,64,80,84,0,0,0,0,0,64,84,85,0,0,0,0,0,80,85,85,0,0,0,0,0,85,85,85
        !byte 0,0,0,0,5,85,85,85,0,0,0,1,21,85,85,85,0,0,1,5,21,85,85,85,0,1,5,5,21,85,85,85
        !byte 1,1,5,21,21,85,85,85,1,5,5,21,21,85,85,85,5,5,5,21,21,85,85,85,5,5,21,21,21,85,85,85
        !byte 0,0,0,0,64,64,80,80,0,0,0,0,64,64,80,84,0,0,0,0,64,80,80,84,0,0,0,0,64,80,84,85
        !byte 0,0,0,0,64,84,85,85,0,0,0,0,80,85,85,85,0,0,0,0,85,85,85,85,0,0,0,5,85,85,85,85
        !byte 0,0,1,21,85,85,85,85,0,1,5,21,85,85,85,85,1,5,5,21,85,85,85,85,1,5,21,21,85,85,85,85
        !byte 5,5,21,21,85,85,85,85,5,21,21,21,85,85,85,85,0,0,0,64,64,64,80,80,0,0,0,64,64,80,80,80
        !byte 0,0,0,64,64,80,80,84,0,0,0,64,64,80,84,84,0,0,0,64,80,80,84,85,0,0,0,64,80,84,85,85
        !byte 0,0,0,64,84,85,85,85,0,0,0,80,85,85,85,85,0,0,0,85,85,85,85,85,0,0,5,85,85,85,85,85
        !byte 0,1,21,85,85,85,85,85,1,5,21,85,85,85,85,85,5,5,21,85,85,85,85,85,5,21,21,85,85,85,85,85
        !byte 0,0,64,64,64,80,80,80,0,0,64,64,64,80,80,84,0,0,64,64,80,80,80,84,0,0,64,64,80,80,84,84
        !byte 0,0,64,64,80,84,84,85,0,0,64,80,80,84,85,85,0,0,64,80,84,85,85,85,0,0,64,84,85,85,85,85
        !byte 0,0,80,85,85,85,85,85,0,0,85,85,85,85,85,85,0,5,85,85,85,85,85,85,1,21,85,85,85,85,85,85
        !byte 5,21,85,85,85,85,85,85,21,21,85,85,85,85,85,85,0,64,64,64,80,80,80,80,0,64,64,64,80,80,80,84
        !byte 0,64,64,64,80,80,84,84,0,64,64,80,80,80,84,84,0,64,64,80,80,84,84,85,0,64,64,80,84,84,85,85
        !byte 0,64,80,80,84,85,85,85,0,64,80,84,85,85,85,85,0,64,84,85,85,85,85,85,0,80,85,85,85,85,85,85
        !byte 0,85,85,85,85,85,85,85,5,85,85,85,85,85,85,85,21,85,85,85,85,85,85,85,64,64,64,64,80,80,80,84
        !byte 64,64,64,80,80,80,80,84,64,64,64,80,80,80,84,84,64,64,64,80,80,84,84,84,64,64,80,80,80,84,84,85
        !byte 64,64,80,80,84,84,85,85,64,64,80,84,84,85,85,85,64,80,80,84,85,85,85,85,64,80,84,85,85,85,85,85
        !byte 64,84,85,85,85,85,85,85,80,85,85,85,85,85,85,85,64,64,80,80,80,80,84,84,64,64,80,80,80,84,84,84
        !byte 64,64,80,80,84,84,84,85,64,80,80,80,84,84,85,85,64,80,80,84,84,85,85,85,64,80,84,84,85,85,85,85
        !byte 80,80,84,85,85,85,85,85,80,84,85,85,85,85,85,85,84,85,85,85,85,85,85,85,64,64,80,80,80,80,80,84
        !byte 64,80,80,80,80,84,84,84,64,80,80,80,84,84,84,85,64,80,80,84,84,84,85,85,80,80,80,84,84,85,85,85
        !byte 80,80,84,84,85,85,85,85,80,84,84,85,85,85,85,85,64,80,80,80,80,80,84,84,64,80,80,80,84,84,84,84
        !byte 80,80,80,80,84,84,84,85,80,80,80,84,84,84,85,85,80,80,84,84,84,85,85,85,84,84,85,85,85,85,85,85
        !byte 80,80,80,80,80,84,84,84,80,80,80,80,84,84,84,84,80,80,80,84,84,84,84,85,80,84,84,84,85,85,85,85
        !byte 0,0,0,0,0,1,1,1,0,0,0,0,0,64,64,64,64,64,85,85,85,85,85,85,1,1,81,85,85,85,85,85
        !byte 64,64,64,64,64,80,80,80,84,84,84,85,85,85,85,85,1,1,1,1,1,1,1,85,0,0,0,0,84,84,84,84
        !byte 84,84,84,84,84,84,84,85,0,0,1,1,1,1,1,1,21,21,21,21,21,85,85,85,1,85,85,85,85,85,85,85
        !byte 21,21,21,21,21,21,21,85,0,0,64,64,64,64,64,64,80,80,80,85,85,85,85,85,84,84,84,84,84,85,85,85
        !byte 64,85,85,85,85,85,85,85,21,21,21,21,85,85,85,85,64,64,64,64,64,64,64,85,0,0,0,1,1,1,1,1
        !byte 1,1,1,1,85,85,85,85,0,0,0,0,1,1,1,1,80,80,80,80,80,80,85,85,0,5,5,5,5,5,5,5
        !byte 80,84,84,84,84,84,84,84,0,80,80,80,80,80,80,80,84,84,84,84,85,85,85,85,64,64,64,64,85,85,85,85
        !byte 5,5,5,5,5,5,85,85,0,1,1,1,1,1,1,1,1,1,1,1,1,85,85,85,5,5,5,85,85,85,85,85
        !byte 0,0,64,80,80,80,80,80,80,80,80,80,85,85,85,85,0,0,0,0,0,80,80,80,80,80,85,85,85,85,85,85
        !byte 5,5,5,5,5,85,85,85,64,64,64,85,85,85,85,85,80,80,80,80,80,85,85,85,0,0,0,0,21,21,21,21
        !byte 5,5,5,5,85,85,85,85,21,21,21,21,21,21,85,85,0,64,64,64,64,64,64,64,64,64,64,64,64,85,85,85
        !byte 84,84,84,84,84,84,85,85,64,64,80,80,80,80,80,80,1,1,1,1,1,1,85,85,0,64,80,80,84,84,84,84
        !byte 0,0,0,0,64,64,64,64,0,64,64,64,64,64,80,80,64,64,64,64,64,64,69,85,0,0,0,0,0,0,0,20
        !byte 0,0,5,21,85,85,85,85,0,0,80,84,85,85,85,85,0,21,85,85,85,85,85,85,0,0,0,0,0,0,5,21
        !byte 0,0,0,21,21,21,21,21,64,80,80,85,85,85,85,85,0,84,68,68,68,84,0,0,0,16,80,16,16,84,0,0
        !byte 0,84,4,84,64,84,0,0,0,84,4,84,4,84,0,0,0,68,68,84,4,4,0,0,0,84,64,84,4,84,0,0
        !byte 0,84,64,84,68,84,0,0,0,84,4,16,16,16,0,0,0,84,68,84,68,84,0,0,0,84,68,84,4,84,0,0
        !byte 0,16,68,84,68,68,0,0,0,80,68,80,68,80,0,0,0,84,64,64,64,84,0,0,0,80,68,68,68,80,0,0
        !byte 0,84,64,80,64,84,0,0,0,84,64,80,64,64,0,0,0,68,68,16,68,68,0,0,0,68,68,16,16,16,0,0
        !byte 191,191,191,191,191,191,191,191,239,239,239,239,239,239,239,239,251,251,251,251,251,251,251,251,254,254,254,254,254,254,254,254
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0

; connected-wall-run id tables (indexed by cell id) live above the f-tables in free RAM

        * = charsetB            ; charset A with every glyph's 8 bytes reversed
        !byte 0,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,85,85,85,85,85,85,85,85,252,252,252,252,252,252,252,252
        !byte 63,63,63,63,63,63,63,63,3,3,3,3,3,3,3,3,192,192,192,192,192,192,192,192,240,240,240,240,240,240,240,240
        !byte 15,15,15,15,15,15,15,15,84,84,84,84,84,84,84,84,21,21,21,21,21,21,21,21,1,1,1,1,1,1,1,1
        !byte 64,64,64,64,64,64,64,64,80,80,80,80,80,80,80,80,5,5,5,5,5,5,5,5,1,0,0,0,0,0,0,0
        !byte 1,1,0,0,0,0,0,0,5,1,1,0,0,0,0,0,5,5,1,1,0,0,0,0,5,5,1,1,1,0,0,0
        !byte 5,5,5,1,1,1,0,0,21,5,5,5,1,1,1,1,21,5,5,5,5,1,1,1,21,5,5,5,5,5,1,1
        !byte 21,21,5,5,5,5,1,1,21,21,5,5,5,5,5,1,5,1,0,0,0,0,0,0,21,5,5,1,1,1,0,0
        !byte 21,21,21,5,5,5,5,1,5,5,1,0,0,0,0,0,21,5,1,1,0,0,0,0,21,5,5,1,1,0,0,0
        !byte 21,21,21,5,5,5,1,1,21,21,21,5,5,5,5,5,5,0,0,0,0,0,0,0,21,1,0,0,0,0,0,0
        !byte 21,5,1,0,0,0,0,0,21,5,5,1,0,0,0,0,21,21,5,1,1,0,0,0,21,21,5,5,5,1,1,0
        !byte 21,21,21,21,5,5,5,5,64,0,0,0,0,0,0,0,80,0,0,0,0,0,0,0,85,0,0,0,0,0,0,0
        !byte 85,5,0,0,0,0,0,0,85,21,1,0,0,0,0,0,85,21,5,1,0,0,0,0,85,21,5,5,1,0,0,0
        !byte 85,21,21,5,1,1,0,0,85,21,21,5,5,1,1,0,85,21,21,21,5,5,1,1,85,21,21,21,21,5,5,5
        !byte 64,64,0,0,0,0,0,0,80,64,0,0,0,0,0,0,84,64,0,0,0,0,0,0,85,80,0,0,0,0,0,0
        !byte 85,85,0,0,0,0,0,0,85,85,5,0,0,0,0,0,85,85,21,1,0,0,0,0,85,85,21,5,1,0,0,0
        !byte 85,85,21,5,5,1,0,0,85,85,21,21,5,1,1,0,85,85,21,21,5,5,1,1,85,85,21,21,5,5,5,1
        !byte 85,85,21,21,21,5,5,1,85,85,21,21,21,5,5,5,80,64,64,0,0,0,0,0,80,80,64,0,0,0,0,0
        !byte 84,80,64,0,0,0,0,0,85,84,64,0,0,0,0,0,85,85,80,0,0,0,0,0,85,85,85,0,0,0,0,0
        !byte 85,85,85,5,0,0,0,0,85,85,85,21,1,0,0,0,85,85,85,21,5,1,0,0,85,85,85,21,5,5,1,0
        !byte 85,85,85,21,21,5,1,1,85,85,85,21,21,5,5,1,85,85,85,21,21,5,5,5,85,85,85,21,21,21,5,5
        !byte 80,80,64,64,0,0,0,0,84,80,64,64,0,0,0,0,84,80,80,64,0,0,0,0,85,84,80,64,0,0,0,0
        !byte 85,85,84,64,0,0,0,0,85,85,85,80,0,0,0,0,85,85,85,85,0,0,0,0,85,85,85,85,5,0,0,0
        !byte 85,85,85,85,21,1,0,0,85,85,85,85,21,5,1,0,85,85,85,85,21,5,5,1,85,85,85,85,21,21,5,1
        !byte 85,85,85,85,21,21,5,5,85,85,85,85,21,21,21,5,80,80,64,64,64,0,0,0,80,80,80,64,64,0,0,0
        !byte 84,80,80,64,64,0,0,0,84,84,80,64,64,0,0,0,85,84,80,80,64,0,0,0,85,85,84,80,64,0,0,0
        !byte 85,85,85,84,64,0,0,0,85,85,85,85,80,0,0,0,85,85,85,85,85,0,0,0,85,85,85,85,85,5,0,0
        !byte 85,85,85,85,85,21,1,0,85,85,85,85,85,21,5,1,85,85,85,85,85,21,5,5,85,85,85,85,85,21,21,5
        !byte 80,80,80,64,64,64,0,0,84,80,80,64,64,64,0,0,84,80,80,80,64,64,0,0,84,84,80,80,64,64,0,0
        !byte 85,84,84,80,64,64,0,0,85,85,84,80,80,64,0,0,85,85,85,84,80,64,0,0,85,85,85,85,84,64,0,0
        !byte 85,85,85,85,85,80,0,0,85,85,85,85,85,85,0,0,85,85,85,85,85,85,5,0,85,85,85,85,85,85,21,1
        !byte 85,85,85,85,85,85,21,5,85,85,85,85,85,85,21,21,80,80,80,80,64,64,64,0,84,80,80,80,64,64,64,0
        !byte 84,84,80,80,64,64,64,0,84,84,80,80,80,64,64,0,85,84,84,80,80,64,64,0,85,85,84,84,80,64,64,0
        !byte 85,85,85,84,80,80,64,0,85,85,85,85,84,80,64,0,85,85,85,85,85,84,64,0,85,85,85,85,85,85,80,0
        !byte 85,85,85,85,85,85,85,0,85,85,85,85,85,85,85,5,85,85,85,85,85,85,85,21,84,80,80,80,64,64,64,64
        !byte 84,80,80,80,80,64,64,64,84,84,80,80,80,64,64,64,84,84,84,80,80,64,64,64,85,84,84,80,80,80,64,64
        !byte 85,85,84,84,80,80,64,64,85,85,85,84,84,80,64,64,85,85,85,85,84,80,80,64,85,85,85,85,85,84,80,64
        !byte 85,85,85,85,85,85,84,64,85,85,85,85,85,85,85,80,84,84,80,80,80,80,64,64,84,84,84,80,80,80,64,64
        !byte 85,84,84,84,80,80,64,64,85,85,84,84,80,80,80,64,85,85,85,84,84,80,80,64,85,85,85,85,84,84,80,64
        !byte 85,85,85,85,85,84,80,80,85,85,85,85,85,85,84,80,85,85,85,85,85,85,85,84,84,80,80,80,80,80,64,64
        !byte 84,84,84,80,80,80,80,64,85,84,84,84,80,80,80,64,85,85,84,84,84,80,80,64,85,85,85,84,84,80,80,80
        !byte 85,85,85,85,84,84,80,80,85,85,85,85,85,84,84,80,84,84,80,80,80,80,80,64,84,84,84,84,80,80,80,64
        !byte 85,84,84,84,80,80,80,80,85,85,84,84,84,80,80,80,85,85,85,84,84,84,80,80,85,85,85,85,85,85,84,84
        !byte 84,84,84,80,80,80,80,80,84,84,84,84,80,80,80,80,85,84,84,84,84,80,80,80,85,85,85,85,84,84,84,80
        !byte 1,1,1,0,0,0,0,0,64,64,64,0,0,0,0,0,85,85,85,85,85,85,64,64,85,85,85,85,85,81,1,1
        !byte 80,80,80,64,64,64,64,64,85,85,85,85,85,84,84,84,85,1,1,1,1,1,1,1,84,84,84,84,0,0,0,0
        !byte 85,84,84,84,84,84,84,84,1,1,1,1,1,1,0,0,85,85,85,21,21,21,21,21,85,85,85,85,85,85,85,1
        !byte 85,21,21,21,21,21,21,21,64,64,64,64,64,64,0,0,85,85,85,85,85,80,80,80,85,85,85,84,84,84,84,84
        !byte 85,85,85,85,85,85,85,64,85,85,85,85,21,21,21,21,85,64,64,64,64,64,64,64,1,1,1,1,1,0,0,0
        !byte 85,85,85,85,1,1,1,1,1,1,1,1,0,0,0,0,85,85,80,80,80,80,80,80,5,5,5,5,5,5,5,0
        !byte 84,84,84,84,84,84,84,80,80,80,80,80,80,80,80,0,85,85,85,85,84,84,84,84,85,85,85,85,64,64,64,64
        !byte 85,85,5,5,5,5,5,5,1,1,1,1,1,1,1,0,85,85,85,1,1,1,1,1,85,85,85,85,85,5,5,5
        !byte 80,80,80,80,80,64,0,0,85,85,85,85,80,80,80,80,80,80,80,0,0,0,0,0,85,85,85,85,85,85,80,80
        !byte 85,85,85,5,5,5,5,5,85,85,85,85,85,64,64,64,85,85,85,80,80,80,80,80,21,21,21,21,0,0,0,0
        !byte 85,85,85,85,5,5,5,5,85,85,21,21,21,21,21,21,64,64,64,64,64,64,64,0,85,85,85,64,64,64,64,64
        !byte 85,85,84,84,84,84,84,84,80,80,80,80,80,80,64,64,85,85,1,1,1,1,1,1,84,84,84,84,80,80,64,0
        !byte 64,64,64,64,0,0,0,0,80,80,64,64,64,64,64,0,85,69,64,64,64,64,64,64,20,0,0,0,0,0,0,0
        !byte 85,85,85,85,21,5,0,0,85,85,85,85,84,80,0,0,85,85,85,85,85,85,21,0,21,5,0,0,0,0,0,0
        !byte 21,21,21,21,21,0,0,0,85,85,85,85,85,80,80,64,0,0,84,68,68,68,84,0,0,0,84,16,16,80,16,0
        !byte 0,0,84,64,84,4,84,0,0,0,84,4,84,4,84,0,0,0,4,4,84,68,68,0,0,0,84,4,84,64,84,0
        !byte 0,0,84,68,84,64,84,0,0,0,16,16,16,4,84,0,0,0,84,68,84,68,84,0,0,0,84,4,84,68,84,0
        !byte 0,0,68,68,84,68,16,0,0,0,80,68,80,68,80,0,0,0,84,64,64,64,84,0,0,0,80,68,68,68,80,0
        !byte 0,0,84,64,80,64,84,0,0,0,64,64,80,64,84,0,0,0,68,68,16,68,68,0,0,0,16,16,16,68,68,0
        !byte 191,191,191,191,191,191,191,191,239,239,239,239,239,239,239,239,251,251,251,251,251,251,251,251,254,254,254,254,254,254,254,254
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0

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
qIdxAT: !byte 0,0,0,0,1,1,2,3,4,4,5,6,6,6,6,6
qIdxMT: !byte 0,0,0,0,0,1,1,1,2,2,2,3,3,3,3,3
qIdxBT: !byte 0,0,0,0,1,2,3,4,5,6,7,8,8,8,8,8
qmT:    !byte 0,9,18,27,0,0,0,0,36,45,54,63,0,0,0,0,72,81,90,99,0,0,0,0,108,117,126,135,0,0,0,0,144,153,162,171,0,0,0,0,180,189,198,207,0,0,0,0,216,225,234,243,0,0,0,0,0,0,0,0,0,0,0,0
rampT:  !byte 0,0,0,0,15,16,17,18,19,20,195,21,22,23,24,25,0,0,0,0,15,26,17,18
        !byte 19,27,21,22,22,24,25,28,0,0,0,0,15,26,29,30,31,21,39,22,24,32,28,33
        !byte 0,0,0,0,34,35,36,37,38,20,39,22,32,28,25,40,41,41,41,42,43,44,45,46
        !byte 47,48,49,32,50,50,40,51,52,53,53,54,55,56,57,58,59,60,61,62,63,64,65,65
        !byte 66,66,67,68,69,70,71,72,73,74,75,76,77,78,79,79,80,80,81,82,83,84,85,86
        !byte 87,88,89,90,91,92,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,107,107
        !byte 108,109,110,111,112,113,114,115,116,117,118,119,120,120,121,121,122,123,124,125,126,127,128,129
        !byte 130,131,132,133,134,134,134,134,135,136,137,138,139,140,141,142,143,144,145,1,1,1,1,1
        !byte 136,137,146,147,148,149,150,151,152,153,154,1,1,1,1,1,155,146,147,156,157,158,159,160
        !byte 161,153,154,1,1,1,1,1,146,162,156,163,164,165,166,160,161,167,154,1,1,1,1,1
        !byte 162,156,168,169,170,165,166,171,161,167,154,1,1,1,1,1
bkA12:	sta $05e0,x
bkA11:	sta $05b8,x
	sta $0608,x
bkA10:	sta $0590,x
	sta $0630,x
bkA9:	sta $0568,x
	sta $0658,x
bkA8:	sta $0540,x
	sta $0680,x
bkA7:	sta $0518,x
	sta $06a8,x
bkA6:	sta $04f0,x
	sta $06d0,x
bkA5:	sta $04c8,x
	sta $06f8,x
bkA4:	sta $04a0,x
	sta $0720,x
bkA3:	sta $0478,x
	sta $0748,x
bkA2:	sta $0450,x
	sta $0770,x
bkA1:	sta $0428,x
	sta $0798,x
bkA0:	sta $0400,x
	sta $07c0,x
	jmp rfEdge
bkB12:	sta $25e0,x
bkB11:	sta $25b8,x
	sta $2608,x
bkB10:	sta $2590,x
	sta $2630,x
bkB9:	sta $2568,x
	sta $2658,x
bkB8:	sta $2540,x
	sta $2680,x
bkB7:	sta $2518,x
	sta $26a8,x
bkB6:	sta $24f0,x
	sta $26d0,x
bkB5:	sta $24c8,x
	sta $26f8,x
bkB4:	sta $24a0,x
	sta $2720,x
bkB3:	sta $2478,x
	sta $2748,x
bkB2:	sta $2450,x
	sta $2770,x
bkB1:	sta $2428,x
	sta $2798,x
bkB0:	sta $2400,x
	sta $27c0,x
	jmp rfEdge
slA0:	sta $0400,x
	sta $07c0,x
slA1:	sta $0428,x
	sta $0798,x
slA2:	sta $0450,x
	sta $0770,x
slA3:	sta $0478,x
	sta $0748,x
slA4:	sta $04a0,x
	sta $0720,x
slA5:	sta $04c8,x
	sta $06f8,x
slA6:	sta $04f0,x
	sta $06d0,x
slA7:	sta $0518,x
	sta $06a8,x
slA8:	sta $0540,x
	sta $0680,x
slA9:	sta $0568,x
	sta $0658,x
slA10:	sta $0590,x
	sta $0630,x
slA11:	sta $05b8,x
	sta $0608,x
slA12:	sta $05e0,x
	jmp rfNext
slB0:	sta $2400,x
	sta $27c0,x
slB1:	sta $2428,x
	sta $2798,x
slB2:	sta $2450,x
	sta $2770,x
slB3:	sta $2478,x
	sta $2748,x
slB4:	sta $24a0,x
	sta $2720,x
slB5:	sta $24c8,x
	sta $26f8,x
slB6:	sta $24f0,x
	sta $26d0,x
slB7:	sta $2518,x
	sta $26a8,x
slB8:	sta $2540,x
	sta $2680,x
slB9:	sta $2568,x
	sta $2658,x
slB10:	sta $2590,x
	sta $2630,x
slB11:	sta $25b8,x
	sta $2608,x
slB12:	sta $25e0,x
	jmp rfNext
edA0:	sta $0400,x
	sta $07c0,x
	inc erow
	jmp rfEdgeT
edA1:	sta $0428,x
	sta $0798,x
	inc erow
	jmp rfEdgeT
edA2:	sta $0450,x
	sta $0770,x
	inc erow
	jmp rfEdgeT
edA3:	sta $0478,x
	sta $0748,x
	inc erow
	jmp rfEdgeT
edA4:	sta $04a0,x
	sta $0720,x
	inc erow
	jmp rfEdgeT
edA5:	sta $04c8,x
	sta $06f8,x
	inc erow
	jmp rfEdgeT
edA6:	sta $04f0,x
	sta $06d0,x
	inc erow
	jmp rfEdgeT
edA7:	sta $0518,x
	sta $06a8,x
	inc erow
	jmp rfEdgeT
edA8:	sta $0540,x
	sta $0680,x
	inc erow
	jmp rfEdgeT
edA9:	sta $0568,x
	sta $0658,x
	inc erow
	jmp rfEdgeT
edA10:	sta $0590,x
	sta $0630,x
	inc erow
	jmp rfEdgeT
edA11:	sta $05b8,x
	sta $0608,x
	inc erow
	jmp rfEdgeT
edA12:	sta $05e0,x
	inc erow
	jmp rfEdgeT
edB0:	sta $2400,x
	sta $27c0,x
	inc erow
	jmp rfEdgeT
edB1:	sta $2428,x
	sta $2798,x
	inc erow
	jmp rfEdgeT
edB2:	sta $2450,x
	sta $2770,x
	inc erow
	jmp rfEdgeT
edB3:	sta $2478,x
	sta $2748,x
	inc erow
	jmp rfEdgeT
edB4:	sta $24a0,x
	sta $2720,x
	inc erow
	jmp rfEdgeT
edB5:	sta $24c8,x
	sta $26f8,x
	inc erow
	jmp rfEdgeT
edB6:	sta $24f0,x
	sta $26d0,x
	inc erow
	jmp rfEdgeT
edB7:	sta $2518,x
	sta $26a8,x
	inc erow
	jmp rfEdgeT
edB8:	sta $2540,x
	sta $2680,x
	inc erow
	jmp rfEdgeT
edB9:	sta $2568,x
	sta $2658,x
	inc erow
	jmp rfEdgeT
edB10:	sta $2590,x
	sta $2630,x
	inc erow
	jmp rfEdgeT
edB11:	sta $25b8,x
	sta $2608,x
	inc erow
	jmp rfEdgeT
edB12:	sta $25e0,x
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
        jmp obMoved
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
        lda rpOn
        beq obStill
        jsr rpReplay
obStill:rts
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
        lda #$00
        sta rpOn
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
        sta omMix
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
        sta oflag               ; bit 7: some run visible from this cell could occlude this orb
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
osFlush:ldx onv
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
        sta $07f8,x             ; the pointer lives in the SCREEN, so both buffers need it
        sta $27f8,x
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
        lda oflag
        bpl opFront             ; nothing visible from this cell can occlude this orb at all
        ldx ovar
        lda orbColT,x
        sta o2
        lda ocol
        clc
        adc o2
        bcc opR1
        lda #159
opR1:   cmp #160
        bcc opR2
        lda #159
opR2:   lsr
        lsr
        sta ocr                 ; rightmost CELL the sprite covers
        lda ocol
        sec
        sbc o2
        bcs opL1
        lda #$00
opL1:   lsr
        lsr
        cmp ocr
        bcc opL2
        lda ocr
opL2:   sta ocl
        ldx oidx
        lda orbOccLoT,x         ; this orb's occluder bitmap
        sta omptr
        lda orbOccHiT,x
        sta omptr+1
        lda #$00
        sta ocnear
        sta ocspan
        sta ocmask
        ldx ocl
opScan: lda cellFaceT,x
        sta tmp
        lsr
        lsr
        lsr
        tay
        lda (omptr),y
        sta tmp2
        lda tmp
        and #$07
        tay
        lda orbBitT,y
        and tmp2
        bne opOcc
        ldy ocspan              ; this cell's face cannot occlude: mark it to be repointed
        lda orbBitT,y
        ora ocmask
        sta ocmask
        jmp opNx
opOcc:  inc ocnear
opNx:   inc ocspan
        inx
        cpx ocr
        bcc opScan
        beq opScan
        jmp opDone
        ; The flag says no run visible from this cell can occlude this orb, so skip the scan
        ; entirely and declare it unoccluded. ocspan is left stale on purpose: the consumers
        ; below only read it once ocnear is nonzero.
opFront:lda #$00
        sta ocnear
        sta ocmask
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
        sta obX,x
        lda o3
        sta obY,x
        lda o1
        beq oNoM
        lda omBit
        ora omX8
        sta omX8
oNoM:   inc onv
        lda ocnear
        beq orbYes              ; nothing nearer: draw over everything, cheapest case
        lda omBit
        ora omPri
        sta omPri               ; something is nearer, so let the VIC clip -- but that clips
        ; against FAR walls too, and only repointing their cells can say otherwise. Skip it
        ; when every column is nearer: then the orb is wholly behind the wall and correctly
        ; invisible, and there is nothing to repoint.
        lda ocnear
        cmp ocspan
        bcs orbYes

        ; --- mixed depth: repoint the FAR solid cells under this sprite to SOLID's twin.
        ; The marking is relative to ONE depth, so only the nearest such orb gets it; a farther
        ; one that a wall separates from this one would need the opposite marking, and falls
        ; back to the priority bit alone.
        lda omMix
        bne orbYes
        inc omMix
        lda ocl2
        lsr
        lsr
        sta ocl
        lda ocmax
        lsr
        lsr
        sta ocr
        lda o3                  ; sprite top, as a char row
        sec
        sbc #50
        bcs omT1
        lda #$00
omT1:   lsr
        lsr
        lsr
        sta ocrow
        ldx ovar
        lda orbSpHT,x
        clc
        adc o3
        sec
        sbc #50
        lsr
        lsr
        lsr
        cmp #25
        bcc omB1
        lda #24
omB1:   sta ocrw2
        lda ohgt                ; remember it: a still frame replays this without reprojecting
        sta rpH
        lda ocrow               ; the loop walks ocrow, so keep where it started
        sta rpRow
        inc rpOn
        jmp omRow
rpReplay:
        lda rpH
        sta ohgt
        lda rpRow
        sta ocrow
omRow:  ldy ocrow
        lda rowLoT,y
        sta ppPtr
        lda rowHiT,y
        clc
        adc baseHi
        sta ppPtr+1
        ldy ocl
omCol:  tya                     ; this cell's face: does it occlude, per the scan above?
        sec
        sbc ocl
        tax
        lda orbBitT,x
        and ocmask
        beq omNx                ; it occludes: leave it clipping
        lda (ppPtr),y
        cmp #$01
        beq omPut
        ; A vertical step is a wall CORNER, the one step that clips. When the wall it belongs to
        ; faces the orb it must not, and unlike SOLID it cannot become a flat black cell -- half
        ; of it is floor. Hence six twins, placed consecutively right after the six originals so
        ; the swap is one add.
        cmp #$03
        bcc omNS
        cmp #$09
        bcs omNS
        clc
        adc #$06
        sta (ppPtr),y
        jmp omNx
omNS:
        ; A seam cell is foreground too, and it was slicing a grey line through orbs standing
        ; in front of the wall. There is no background seam to swap to -- 00 is the ceiling
        ; and 01 is plain black -- so the seam simply goes for the cells an orb covers, which
        ; reads far better than a seam drawn across the front of it.
        cmp #$f8
        bcc omNx
        cmp #$fc
        bcs omNx
omPut:  lda #$02
        sta (ppPtr),y
omNx:   iny
        cpy ocr
        bcc omCol
        beq omCol
        inc ocrow
        lda ocrow
        cmp ocrw2
        bcc omRow
        beq omRow
        ; These cells now hold SOLID's twin, not what the chain would write, so the run cache
        ; must not let the chain be skipped over them next frame. Both buffers, since which
        ; one is in hand here is not worth working out for two stores.
        ldx ocl
        lda #$ff
omInv:  sta cbA,x
        sta cbB,x
        inx
        cpx ocr
        bcc omInv
        beq omInv
        rts
orbYes: rts
orbNo:  rts
; kSgn: the high byte a signed byte sign-extends to.
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
; (|a| * |b|) >> 8, then negated if the two signs disagree -- result is two's complement, so
; the callers above can just add and subtract normally.
orot:   lda obm
        sta mq
        lda oaL
        jsr mul8
        lda phi
        sta orL
        lda #$00
        sta orH
        lda obm
        sta mq
        lda oaH
        jsr mul8
        clc
        lda orL
        adc plo
        sta orL
        lda orH
        adc phi
        sta orH
        lda oaS
        eor obs
        bpl orotD
        sec
        lda #$00
        sbc orL
        sta orL
        lda #$00
        sbc orH
        sta orH
orotD:  rts

        ; ---- CPU-only tables, lifted clear of VIC bank 0 ----
        ; None of this is ever fetched by the VIC, so none of it belongs in the 16K the
        ; VIC can see. Moving it out frees bank 0 for sprites, and gives every 256-entry
        ; table its own page for free -- an "lda table,x" that crosses a page costs an
        ; extra cycle, and these are indexed by a full byte.
        * = $8400
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
        * = $8500
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
        * = $8600
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
        * = $8700
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
        * = $8800
runWT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,31,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,31,0,0,0,0,0,0,0,14,0,0,0,24,0,0,0,31,0,0,3,0,0,0,0,0,0,0,0,24,0,0,0,31,0,0,3,0,0,0,0,16,0,0,0,24,0,28,0,0,0,0,3,0,8,0,0,0,0,0,0,24,0,0,0,32,0,0,3,0,8,0,0,0,0,0,0,0,0,29,0,32,0,0,3,0,8,0,12,0,0,0,0,0,0,29,0,32,0,0,0,0,8,0,12,0,0,0,0,0,0,29,0,32,0,0,0,0,8,0,12,0,19,0,0,0,0,0,0,32,0,0,0,0,0,0,12,0,19,0,0,0,0,0,0,32,0,0,6,0,0,0,0,0,19,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,22,0,0,0,0,33,0,0,0,0,10,0,0,0,0,0,0,0,0,0,0,33,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $8900
runET: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,15,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,15,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,15,0,0,0,0,0,27,0,0,1,0,0,0,7,0,0,0,0,0,0,25,0,0,0,0,1,0,4,0,0,0,0,0,18,0,0,25,0,0,0,0,1,0,4,0,0,0,0,17,0,0,0,25,0,0,0,0,1,0,4,0,9,0,0,0,0,0,0,0,0,30,0,0,1,0,4,0,9,0,0,0,0,0,21,0,0,30,0,0,1,0,0,0,9,0,13,0,0,0,0,0,0,30,0,0,0,0,5,0,9,0,13,0,0,0,0,26,0,0,0,0,2,0,0,0,0,0,13,0,20,0,0,0,0,0,0,0,2,0,0,0,0,0,13,0,20,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,23,0,0,0,0,0,2,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $8a00
runNT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,37,37,0,0,0,0,39,39,39,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,41,41,0,0,0,0,43,43,0,0,0,0,0,45,45,45,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,0,0,0,0,0,0,0,0,50,50,50,50,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,53,53,0,0,0,0,0,56,56,56,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,58,58,58,0,0,0,0,61,61,61,61,61,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,64,0,0,0,0,0,0,0,0,0,0,0,65,65,65,0,0,66,66,66,66,66,66,66,66,66,0
        * = $8b00
runST: !byte 0,34,34,34,34,34,34,0,35,35,35,35,35,35,35,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,0,0,0,0,38,38,0,0,0,0,0,40,40,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,42,0,0,0,0,44,44,0,0,0,0,0,0,46,46,46,0,0,0,47,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,49,0,0,0,0,51,51,51,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,52,0,0,0,54,54,0,55,0,0,0,0,57,57,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,59,59,59,59,59,0,60,0,0,62,62,62,62,0,0,0,0,0,0,0,0,0,0,0,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $8c00
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
        * = $8d00
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
        * = $8e00
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
        * = $8f00
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
        * = $9000
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
        * = $9100
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
        * = $9200
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
        * = $9300
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
        * = $9400
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
        * = $9500
rayOffT: !byte 233,233,233,233,233,234,234,234,234,235,235,235,235,236,236,236,236,237,237,237,238,238,238,238,239,239,239,239,240,240,240,241,241,241,241,242,242,242,243,243,243,244,244,244,244,245,245,245,246,246,246,247,247,247,248,248,248,249,249,249,250,250,250,251,251,251,252,252,252,253,253,253,254,254,254,255,255,255,255,0,0,1,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10,11,11,11,12,12,12,12,13,13,13,14,14,14,15,15,15,15,16,16,16,17,17,17,17,18,18,18,18,19,19,19,20,20,20,20,21,21,21,21,22,22,22,22,23,23,23,23,24
        * = $9600
colGrpT: !byte 0,0,0,0,3,3,3,3,6,6,9,9,9,9,12,12,12,15,15,15,15,18,18,18,21,21,21,21,24,24,24,27,27,27,27,30,30,30,30,33,33,33,33,33,36,36,36,36,39,39,39,39,39,39,42,42,42,42,42,42,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,42,42,42,42,42,42,39,39,39,39,39,39,36,36,36,36,33,33,33,33,33,30,30,30,30,27,27,27,27,24,24,24,21,21,21,21,18,18,18,15,15,15,15,12,12,12,9,9,9,9,6,6,3,3,3,3,0,0,0,0

        * = $9700
orbVarT: !byte 0,0,0,0,0,0,1,1,1,2,2,2,2,3,3,3,3,4,4,4,5,5,5,5,6,6,6,7,7,7,7,8,8,8,8,9,9,9,10,10,10,10,11,11,11,11,11,12,12,12,12,12,12,12,13,13,13,13,13,13,13,13,14,14,14,14,14,14,14,15,15,15,15,15,15,15,16,16,16,16,16,16,16,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17
        * = $9800
orbPtrT: !byte 128,129,130,131,132,133,134,135,136,137,138,139,134,135,136,137,138,139
orbExpT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1
orbHalfT: !byte 11,12,11,12,11,12,11,12,11,12,11,12,22,24,22,24,22,24
orbYBaseT: !byte 129,129,129,129,129,129,129,129,129,129,129,129,108,108,108,108,108,108
orbColT: !byte 0,1,1,2,2,3,3,4,4,5,5,6,7,8,9,10,11,12
orbSpHT: !byte 21,21,21,21,21,21,21,21,21,21,21,21,42,42,42,42,42,42
orbBitT: !byte 1,2,4,8,16,32,64,128
orbOccLoT: !byte 0,9,18,27,36,45,54,63,72,81,90,99,108,117,126,135,144,153,162,171,180,189,198,207,216,225,234,243,252,5,14,23,32,41
orbOccHiT: !byte 166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,167,167,167,167,167
        * = $9900
orbXCT: !byte 2,5,8,11,14,1,4,9,6,12,3,10,1,8,13,5,11,3,14,1,7,10,5,12,2,9,14,7,1,4,11,6,9,13
orbYCT: !byte 1,1,1,1,1,3,3,3,4,4,5,5,6,6,6,7,7,8,8,9,9,9,10,10,11,11,11,12,13,13,13,14,14,14
orbColT2: !byte 12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12
        * = $9a00
candCntT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,8,5,5,5,5,0,5,5,5,5,4,5,5,0,0,7,8,6,6,5,5,0,6,6,6,6,5,5,3,0,0,6,7,6,6,6,6,0,9,8,8,0,0,0,4,0,0,6,0,0,0,7,10,12,12,11,9,0,3,3,2,0,0,4,0,4,5,7,8,0,0,10,9,0,4,0,0,0,0,4,0,4,0,0,0,0,6,9,7,0,6,8,5,0,0,4,0,2,0,3,5,5,6,8,9,10,7,0,3,0,0,4,0,3,0,3,0,0,0,0,0,12,9,0,3,0,0,4,5,4,0,2,0,3,3,3,6,10,10,0,3,0,0,0,0,4,0,3,0,4,0,0,0,0,9,8,5,0,0,2,4,4,5,3,0,4,0,3,4,4,7,7,6,0,0,4,0,0,0,0,0,6,0,6,0,0,0,0,0,0,0,4,3,3,4,6,7,7,8,7,0,4,4,4,4,0,0,2,2,2,0,0,7,7,8,8,7,5,5,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $9b00
candLoT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,21,45,60,75,90,0,105,120,135,150,165,177,192,0,0,207,228,252,14,32,47,0,62,80,98,116,134,149,164,0,0,173,191,212,230,248,10,0,28,55,79,0,0,0,103,0,0,115,0,0,0,133,154,184,220,0,33,0,60,69,78,0,0,84,0,96,108,123,144,0,0,168,198,0,225,0,0,0,0,237,0,249,0,0,0,0,5,23,50,0,71,89,113,0,0,128,0,140,0,146,155,170,185,203,227,254,28,0,49,0,0,58,0,70,0,79,0,0,0,0,0,88,124,0,151,0,0,160,172,187,0,199,0,205,214,223,232,250,24,0,54,0,0,0,0,63,0,75,0,84,0,0,0,0,96,123,147,0,0,162,168,180,192,207,0,216,0,228,237,249,5,26,47,0,0,65,0,0,0,0,0,77,0,95,0,0,0,0,0,0,0,113,125,134,143,155,173,194,215,239,0,4,16,28,40,0,0,52,58,64,0,0,70,91,112,136,160,181,196,211,223,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $9c00
candHiT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,157,157,157,157,157,157,0,157,157,157,157,157,157,157,0,0,157,157,157,158,158,158,0,158,158,158,158,158,158,158,0,0,158,158,158,158,158,159,0,159,159,159,0,0,0,159,0,0,159,0,0,0,159,159,159,159,160,160,0,160,160,160,0,0,160,0,160,160,160,160,0,0,160,160,0,160,0,0,0,0,160,0,160,0,0,0,0,161,161,161,0,161,161,161,0,0,161,0,161,0,161,161,161,161,161,161,161,162,0,162,0,0,162,0,162,0,162,0,0,0,0,0,162,162,0,162,0,0,162,162,162,0,162,0,162,162,162,162,162,163,0,163,0,0,0,0,163,0,163,0,163,0,0,0,0,163,163,163,0,0,163,163,163,163,163,0,163,0,163,163,163,164,164,164,0,0,164,0,0,0,0,0,164,0,164,0,0,0,0,0,0,0,164,164,164,164,164,164,164,164,164,0,165,165,165,165,0,0,165,165,165,0,0,165,165,165,165,165,165,165,165,165,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        * = $9d00
candListT: !byte 0,0,51,5,64,40,6,24,34,1,0,33,12,64,32,8,22,31,19,64,30,0,0,58,5,83,39,6,32,36,1,0,35,8,26,32,12,72,160,19,69,158,11,19,157,0,128,51,1,0,40,6,45,39,5,96,36,8,32,33,1,0,51,0,128,40,6,64,40,5,104,34,8,40,34,1,0,58,6,83,39,0,128,35,8,51,35,5,109,32,1,128,51,6,96,36,8,64,35,0,128,33,5,112,31,2,0,58,7,45,39,3,0,35,11,45,32,4,0,31,2,128,51,3,0,40,7,64,40,11,54,33,4,0,32,3,0,51,2,128,40,7,83,39,4,0,33,11,64,33,3,0,58,7,96,36,2,128,35,4,0,35,11,74,161,3,128,51,4,0,40,7,104,34,2,128,33,4,0,51,3,128,40,7,109,160,2,128,32,8,112,158,4,0,58,3,128,35,7,112,159,2,128,31,8,113,157,5,64,51,0,224,45,6,13,35,12,64,33,1,246,33,8,16,159,19,64,30,0,192,51,5,96,45,6,19,39,1,243,35,12,74,161,8,19,160,19,70,158,11,15,157,0,160,45,6,32,45,1,237,39,5,109,39,8,24,34,11,16,158,6,64,51,1,224,45,0,147,39,8,32,36,5,115,35,11,19,158,1,192,51,6,96,45,8,45,39,0,141,35,5,118,33,1,160,45,8,64,40,6,109,39,0,138,33,5,120,32,2,192,51,7,32,45,3,243,35,11,40,34,4,249,31,23,45,157,7,64,51,2,160,45,3,237,39,11,51,35,4,248,32,23,49,157,3,224,45,7,96,45,2,147,39,11,64,35,4,246,33,8,109,160,3,192,51,7,109,167,2,141,35,4,243,35,11,77,163,8,112,159,3,160,45,4,237,39,7,115,163,2,138,33,8,115,159,4,224,45,3,147,39,7,118,161,2,136,32,8,117,158,4,192,51,3,141,35,2,135,31,5,0,58,0,211,39,6,0,35,12,64,35,1,237,32,19,64,31,5,128,51,0,192,40,6,0,40,12,77,163,1,232,34,8,10,161,19,71,159,6,0,51,5,128,40,0,173,39,1,224,36,8,13,163,11,11,158,6,0,58,1,211,39,8,19,167,0,160,36,5,128,35,11,13,159,6,128,51,8,32,45,1,192,40,0,152,34,5,128,33,11,16,159,8,64,51,6,128,40,1,173,39,0,147,32,11,19,160,5,128,32,7,0,51,2,192,40,8,109,167,11,32,36,3,232,34,16,38,160,10,112,159,4,243,159,23,43,158,7,0,58,2,173,39,11,45,39,3,224,36,8,115,163,4,240,159,10,115,159,23,48,158,7,128,51,11,64,40,3,211,167,2,160,36,13,88,162,8,118,161,4,237,160,10,117,158,4,192,40,9,109,167,3,152,162,2,141,159,5,192,51,12,64,40,0,205,163,6,243,163,1,230,160,19,64,32,8,0,51,6,160,173,10,109,167,1,192,35,5,138,161,7,246,161,0,160,161,8,0,58,6,147,167,1,179,35,7,243,163,10,115,163,11,10,161,0,154,32,5,136,160,3,234,159,4,241,157,8,128,51,7,237,167,2,205,163,6,141,163,11,13,163,1,168,162,10,118,161,3,230,160,16,26,160,0,150,159,5,135,159,4,240,158,7,224,45,8,128,40,11,19,167,2,192,35,6,138,161,3,224,33,16,32,161,10,120,160,0,147,158,4,237,158,5,134,158,23,40,158,7,192,51,11,32,45,13,83,167,8,128,35,2,179,35,3,216,34,16,40,162,6,136,160,10,121,159,23,45,158,5,133,158,11,64,51,7,160,45,13,96,164,3,205,163,2,168,34,8,128,33,6,135,159,23,51,159,10,122,158,9,0,58,14,45,167,23,64,31,9,128,51,4,205,163,23,71,159,9,128,40,4,192,35,12,64,51,5,192,40,19,64,33,0,202,161,10,0,58,17,64,35,8,243,163,7,243,159,10,128,51,8,237,167,17,77,163,1,202,161,7,240,159,8,224,45,10,128,40,6,173,167,1,192,33,7,237,160,0,166,160,3,232,158,8,192,51,6,160,164,10,128,35,7,232,162,1,182,33,0,160,159,3,229,158,4,237,157,11,0,51,13,96,173,7,192,40,16,32,164,8,141,163,2,182,161,3,211,160,6,144,159,23,42,159,26,36,158,11,0,58,7,173,39,13,109,167,16,45,167,3,202,161,8,138,161,2,173,32,23,48,159,6,141,159,9,192,51,14,32,173,16,83,167,23,64,32,12,0,58,5,192,35,19,64,35,0,200,160,10,192,51,17,64,40,8,232,162,7,237,158,13,0,58,11,237,167,7,205,163,15,115,163,16,13,35,3,214,159,13,128,51,11,224,45,16,19,167,7,192,35,15,118,161,23,38,160,2,184,160,3,208,159,26,32,158,11,192,51,16,32,173,13,128,40,7,179,35,23,45,160,15,120,160,2,176,31,14,0,51,16,96,173,9,192,40,21,88,162,23,64,33,15,122,158,14,0,58,9,173,167,16,109,167,18,45,167,23,74,161,21,96,161,26,56,160,15,123,158,14,128,51,18,64,40,16,115,163,21,102,160,26,64,32,12,192,51,19,64,40,5,192,33,0,199,159,17,64,51,10,192,40,15,0,58,22,64,35,16,0,31,15,128,51,13,237,167,22,77,163,11,237,160,16,0,32,13,224,173,15,128,40,11,232,162,16,0,33,3,216,158,13,192,51,11,224,36,15,128,35,16,0,35,7,202,161,3,211,158,13,160,45,16,0,40,11,211,39,7,192,33,15,128,33,14,246,161,2,185,159,3,205,159,16,0,51,11,192,40,13,147,39,14,243,163,23,40,162,7,182,33,15,128,32,26,32,159,2,179,31,16,0,58,11,173,167,14,237,167,21,83,167,9,205,163,13,141,163,23,51,35,7,173,160,15,128,31,2,173,158,16,128,51,14,224,173,21,96,164,9,192,35,23,64,35,13,138,161,15,128,30,18,64,51,14,160,173,26,64,33,19,64,51,12,192,40,5,192,32,0,198,158,17,0,58,19,109,167,10,192,35,15,192,51,22,64,40,16,249,159,16,192,51,21,96,173,23,45,167,14,224,164,11,179,163,13,152,162,9,202,161,20,118,161,26,32,161,7,176,159,15,135,159,2,176,158,16,160,45,23,64,40,14,211,167,21,109,167,26,40,162,9,192,33,13,147,160,20,120,160,15,134,158,18,0,58,14,173,167,26,64,35,19,0,58,17,237,167,12,192,35,5,192,31,19,128,51,17,224,173,12,179,163,10,202,161,5,185,159,17,192,51,19,128,40,24,83,167,10,192,33,22,64,51,15,192,40,20,0,58,21,0,35,27,64,35,20,128,51,21,0,40,27,77,163,21,0,51,20,128,40,14,230,160,21,0,58,16,211,167,23,19,167,20,128,35,14,224,161,26,19,160,21,128,51,23,32,173,16,192,40,14,216,162,26,24,162,20,128,33,11,182,161,9,200,160,7,179,159,2,177,157,23,64,51,21,128,40,16,173,39,26,32,164,11,173,160,9,192,32,13,154,160,20,128,32,7,173,158,2,173,157,18,192,51,26,64,40,23,109,167,24,96,173,17,192,40,19,147,167,10,192,32,22,0,58,15,192,35,24,115,163,20,192,51,27,64,40,21,243,163,31,74,161,23,0,58,21,147,167,26,19,39,16,179,163,25,115,163,20,136,160,11,176,159,9,192,31,7,176,158,23,128,51,26,32,45,18,211,167,21,141,163,16,168,162,25,118,161,9,185,159,20,135,159,26,64,51,18,192,40,23,128,40,21,138,161,25,120,160,24,0,51,28,64,40,24,0,58,28,83,167,17,205,163,10,199,159,24,128,51,22,237,167,17,192,35,10,192,31,22,224,173,24,128,40,17,179,163,15,202,161,10,185,159,22,192,51,24,128,35,15,192,33,27,64,51,20,192,40,31,77,163,32,40,162,25,0,58,32,64,35,26,0,32,25,128,51,23,237,167,32,77,163,26,0,33,23,224,173,25,128,40,26,0,35,9,198,158,23,192,51,26,0,40,25,128,35,16,182,161,11,179,159,9,192,30,7,177,157,26,0,51,23,160,45,18,205,163,25,128,33,16,173,160,9,186,158,7,173,157,26,0,58,23,147,39,18,192,35,21,147,160,16,166,160,25,128,32,28,64,51,24,224,173,29,13,163,32,10,157,27,0,58,31,83,167,32,32,164,20,192,35,29,115,163,28,121,159,25,192,51,32,64,40,31,104,162,26,248,160,29,120,160,28,123,158,28,0,58,24,211,167,29,0,35,32,5,158,28,128,51,29,0,40,32,6,158,29,0,51,28,128,40,32,7,159,29,0,58,31,19,167,28,128,35,32,8,160,29,128,51,31,32,173,27,237,167,28,128,33,32,10,161,33,5,158,31,64,51,27,224,173,29,128,40,32,13,35,20,202,161,28,128,32,33,6,158,27,192,51,31,96,45,32,19,39,29,128,35,20,192,33,28,128,31,33,7,159,27,160,173,32,32,45,25,211,167,31,109,39,29,128,33,20,182,161,33,8,160,28,128,30,32,64,51,25,192,40,27,147,167,31,115,35,33,10,161,29,128,32,28,128,30,30,0,58,32,109,167,33,19,39,31,120,160,30,128,51,33,32,45,32,115,163,31,121,159,33,64,51,30,128,40,32,118,161,31,122,158,33,96,45,30,128,35,32,120,160,31,123,158,28,192,51,29,243,35,28,160,45,29,237,167,29,224,173,28,147,39,31,0,58,27,211,167,29,147,167,32,0,35,20,200,160,28,136,160,33,0,30,31,128,51,27,192,40,32,0,40,29,141,163,20,192,32,33,0,31,28,135,159,32,0,51,31,128,40,27,173,167,25,205,163,29,138,161,33,0,32,20,184,160,28,134,158,32,0,58,30,237,167,27,160,164,25,192,35,31,128,35,33,0,33,29,136,160,28,133,158,32,128,51,30,224,173,33,0,35,25,179,163,27,152,162,31,128,33,29,135,159,30,192,51,32,128,40,33,0,40,31,128,32,29,134,158,33,0,51,30,160,45,32,128,35,31,128,31,29,133,158,33,0,58,30,147,39,32,128,33,31,128,30,33,128,51,30,141,35,32,128,32,31,128,30   ; read through a 16-bit pointer, so it may cross pages
        * = $a600
orbOccT: !byte 248,170,182,78,80,213,218,218,0,72,173,182,78,80,213,218,218,0,72,85,189,78,80,213,218,218,0,72,85,73,79,80,213,218,218,0,72,85,73,49,80,213,218,218,0,176,170,182,78,112,213,218,218,0,200,175,182,78,112,213,218,218,0,72,85,169,78,112,213,218,218,0,72,181,182,78,160,213,218,218,0,72,85,73,73,160,213,218,218,0,200,170,182,78,160,222,218,218,0,72,85,233,78,160,222,218,218,0,176,170,182,78,160,234,218,218,0,72,85,189,78,160,234,218,218,0,72,85,73,121,160,234,218,218,0,72,173,182,78,160,42,219,218,0,72,85,73,79,160,42,219,218,0,200,170,182,78,160,42,223,218,0,72,85,73,49,160,42,223,218,0,176,170,182,78,160,42,213,218,0,72,213,183,78,160,42,213,218,0,72,85,233,78,160,42,213,218,0,72,173,182,78,160,42,229,219,0,72,85,73,73,160,42,229,219,0,248,170,182,78,160,42,37,217,0,72,85,169,78,160,42,37,217,0,72,85,73,49,160,42,37,217,0,72,213,183,78,160,42,37,253,0,176,170,182,78,160,42,37,165,0,200,175,182,78,160,42,37,165,0,72,85,73,79,160,42,37,165,0,72,181,182,78,160,42,37,37,1,72,85,169,78,160,42,37,37,1,72,85,73,121,160,42,37,37,1
        ; Step tables, one page each. Addressed by qA*(LM*LB) + qM*LB + qB, so a full byte of
        ; index -- exactly the case a page crossing taxes, and exactly why they are up here
        ; rather than packed in below the height tables where they used to live.
        * = $a800
stepT1: !byte 223,15,35,17,211,228,181,195,4,0,34,56,71,211,228,117,132,4,0,34,56,71,211,228
        !byte 117,132,4,0,34,56,71,211,228,117,132,4,41,43,44,71,86,47,50,49,184,52,55,56
        !byte 57,58,38,131,132,213,41,43,44,71,86,102,117,132,184,41,43,44,71,86,102,117,132,184
        !byte 173,43,56,71,72,102,117,132,182,173,69,70,71,72,73,48,75,182,173,43,56,71,72,102
        !byte 117,132,182,173,43,56,71,72,102,117,132,182,220,43,56,71,86,87,117,132,189,220,43,56
        !byte 71,86,87,88,61,189,220,43,56,71,86,87,117,132,189,220,43,56,71,86,87,117,132,189
        !byte 0,43,56,71,86,102,103,132,106,0,43,56,71,86,102,103,132,106,185,43,56,114,101,102
        !byte 117,226,121,0,43,56,71,86,102,103,132,106,214,43,56,71,86,102,117,132,134,214,43,56
        !byte 71,86,102,117,132,134,214,43,56,71,86,130,131,132,134,214,43,56,71,86,102,117,132,134
        !byte 6,190,56,215,199,209,174,188,1,6,190,56,215,199,209,174,188,1,6,190,56,215,199,209
        !byte 174,188,1,6,190,222,215,199,209,174,188,1
        * = $a900
stepT2: !byte 223,15,26,172,193,191,181,195,8,0,34,56,38,39,22,24,28,24,0,34,227,17,211,116
        !byte 117,195,33,0,34,227,210,211,228,207,145,4,41,43,44,27,18,31,27,44,178,52,43,56
        !byte 57,46,47,24,39,200,41,43,44,45,46,116,117,118,40,41,43,44,210,205,186,207,145,184
        !byte 173,34,70,71,72,19,20,195,78,206,69,70,71,72,73,32,75,208,66,34,70,71,72,116
        !byte 117,118,79,66,34,70,71,72,186,207,145,182,220,34,16,85,86,87,224,195,92,80,82,56
        !byte 71,86,87,224,25,212,80,34,44,85,88,87,224,91,51,80,34,194,85,86,87,207,145,189
        !byte 185,34,16,17,101,102,103,195,106,95,98,56,85,86,102,103,25,106,204,98,113,114,225,102
        !byte 103,104,203,94,34,194,210,101,102,103,145,121,214,34,16,17,18,19,131,132,133,221,55,56
        !byte 57,39,22,131,132,133,197,126,125,128,128,102,131,132,133,122,34,194,210,205,186,131,132,134
        !byte 6,34,222,215,199,209,174,145,1,176,190,70,215,199,209,174,145,1,217,139,140,139,140,229
        !byte 174,188,93,7,164,194,210,205,186,207,145,1
        * = $aa00
stepT3: !byte 223,15,16,172,193,191,181,201,5,30,30,227,27,37,19,27,21,21,32,32,32,32,32,32
        !byte 32,32,32,40,40,40,40,40,40,40,40,40,41,43,35,43,42,42,43,43,178,56,45,56
        !byte 57,45,56,45,56,218,50,50,50,50,50,50,50,50,50,51,51,51,51,51,51,51,51,51
        !byte 66,67,67,67,67,67,67,67,67,206,69,70,71,58,70,70,71,202,76,76,76,76,76,73
        !byte 76,61,76,79,79,79,79,79,79,79,79,79,82,80,80,80,80,80,80,80,80,179,83,70
        !byte 85,86,73,86,86,192,89,89,89,89,89,87,224,89,87,92,92,92,92,92,92,92,92,92
        !byte 185,95,95,95,95,95,95,95,95,111,83,70,85,101,98,98,98,100,204,98,113,117,101,102
        !byte 103,118,175,107,107,107,107,107,107,107,107,121,221,122,122,122,122,122,122,122,122,219,126,125
        !byte 128,101,125,125,125,125,219,129,131,132,131,130,131,132,183,134,134,134,134,134,134,134,134,134
        !byte 176,15,16,85,199,73,74,61,25,168,164,140,159,137,137,137,137,137,196,143,143,159,151,229
        !byte 153,145,119,3,180,216,187,198,177,167,154,1


