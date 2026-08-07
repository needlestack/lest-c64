
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
colc    = $75                   ; cell column, parked while the chains own X
rbv     = $76                   ; first cell row that is not fully ceiling
rsv     = $77                   ; first cell row that is fully wall
erow    = $78                   ; current row inside the edge run
jv      = $79                   ; 2 bytes: chain entry vector, then the edge store pointer
ep2     = $7b                   ; 2 bytes: mirrored-row store pointer
bufOff  = $7d                   ; 0 or 14: selects the chain set for the buffer being drawn
cell    = $7e                   ; DDA cell index = mapY*16 + mapX, stepped incrementally
stpY16  = $7f                   ; +16 / -16: one Y step in cell-index units
hp      = $80                   ; 2 bytes: pointer into this column's height table
stackLT = $c000
stackRT = $c080
; per-logical-column arrays, now 160 entries each (was 80). Page-aligned so a column
; index never needs a 16-bit add.
sideT   = $c100
idT     = $c200
colH    = $c300
faceIdT = $c400
capH    = $c500                 ; colH capped at 100, filled by prepCells
cmnT    = $c600                 ; per cell-column (40): min of its 4 capped heights
cmxT    = $c640                 ; per cell-column (40): max
cstepT  = $c680                 ; per cell-column (40): face-boundary column, 0 = none

        * = $0801
        !byte $0c,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
entry:
        sei
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
        sta $d022               ; 01 = black  (wall)
        lda #$00
        sta $d020
        lda #$ff
        sta $dc02
        lda #$00
        sta $dc03
        ldx #$00
        lda #$08                ; bit3 = per-cell multicolor enable (colour bits unused: we
                                ; only ever emit bit pairs 00 and 01, i.e. $d021/$d022)
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

mloop:  jsr readKeys

        ; ---- adaptive subdivision: march only at connected-wall-run boundaries ----
        lda #$00
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
        bne subSp               ; different wall FACE -> split
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
        jsr interpSpan          ; same face -> merge (interpolate interior)
        jmp subLp
subSp:  lda spanR
        sec
        sbc spanL
        cmp #$02
        bcc subLp               ; adjacent -> boundary, nothing between
        lda spanL
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
subDn:
        jsr prepCells
        jsr renderSym
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
mnext:  inc iterLo
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
prepCells:
        lda #$00
        sta cellc
        sta zpc                 ; zpc = 4*cellc, the logical column
pcLp:   ldx zpc
        ldy #$04
        lda #$ff
        sta tmp                 ; running min
        lda #$00
        sta tmp2                ; running max
pcIn:   lda colH,x
        cmp #101
        bcc pcNc
        lda #100                ; cap: heights above the screen never affect the pattern
pcNc:   sta capH,x
        cmp tmp
        bcs pcNmn
        sta tmp
pcNmn:  cmp tmp2
        bcc pcNmx
        sta tmp2
pcNmx:  inx
        dey
        bne pcIn
        ldx cellc
        lda tmp
        sta cmnT,x
        lda tmp2
        sta cmxT,x
        ; Face boundary position inside this cell: 0 = one face (ramp), else the column
        ; 1..3 where faceIdT changes. Walls are vertical prisms so this IS the screen-space
        ; step, exactly -- and it does not depend on the row, so it is computed once here
        ; rather than 13 times in renderSym.
        ldy zpc
        lda #$00
        sta tmp
        lda faceIdT,y
        cmp faceIdT+1,y
        beq pcS2
        lda #$01
        sta tmp
        jmp pcSdn
pcS2:   lda faceIdT+1,y
        cmp faceIdT+2,y
        beq pcS3
        lda #$02
        sta tmp
        jmp pcSdn
pcS3:   lda faceIdT+2,y
        cmp faceIdT+3,y
        beq pcSdn
        lda #$03
        sta tmp
pcSdn:  lda tmp
        sta cstepT,x
        lda zpc
        clc
        adc #$04
        sta zpc
        inc cellc
        lda cellc
        cmp #40
        bcc pcLp
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
        ldx #39                 ; X = cell column throughout; the chains use it as their index
rfCol:  stx colc
        ldy cmxT,x
        lda rbT,y
        sta rbv
        ldy cmnT,x
        lda rsT,y
        cmp rbv
        bcs rfRs
        lda rbv                 ; a tall column can put rs below rb; keep the runs disjoint
rfRs:   sta rsv
        ; ---- ceiling run: rows 0 .. rb-1 ----
        lda rbv
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
rfEdge: lda rbv
        sta erow
rfEdgeL:lda erow
        cmp rsv
        bcs rfSolid
        ldy erow
        lda kTabT,y
        sta kr
        ldx colc
        lda col4T,x
        tax                     ; X = 4*column -> logical column of this cell
        lda capH,x
        clc
        adc kr
        tay
        lda clampT,y
        sta hh0                 ; left level  (0..12)
        lda capH+3,x
        clc
        adc kr
        tay
        lda clampT,y
        sta hh1                 ; right level (0..12)
        ldx colc
        lda cstepT,x
        bne rfStep
        lda hh0                 ; single face: ramp, index = wL*16 + wR
        asl
        asl
        asl
        asl
        ora hh1
        tay
        lda rampT,y
        jmp rfStore
rfStep: pha                     ; face boundary -> a genuinely vertical step at that column
        ldx hh0
        lda qIdxT,x
        asl
        asl
        asl
        sta tmp                 ; qA*8
        ldx hh1
        lda qIdxT,x
        ora tmp
        tay
        pla
        cmp #$02
        beq rfSt2
        bcs rfSt3
        lda stepT1,y
        jmp rfStore
rfSt2:  lda stepT2,y
        jmp rfStore
rfSt3:  lda stepT3,y
rfStore:pha
        ldy erow                ; this row, and its mirror 24-erow
        lda rowLoT,y
        clc
        adc colc
        sta jv
        lda rowHiT,y
        adc baseHi
        sta jv+1
        lda #24
        sec
        sbc erow
        tay
        lda rowLoT,y
        clc
        adc colc
        sta ep2
        lda rowHiT,y
        adc baseHi
        sta ep2+1
        pla
        ldy #$00
        sta (jv),y
        sta (ep2),y
        inc erow
        jmp rfEdgeL
        ; ---- solid run: rows rs .. 12 ----
rfSolid:lda rsv
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
        lda #$01
        jmp (jv)                ; -> ascending chain -> jmp rfNext
rfNext: ldx colc
        dex
        bpl rfCol
        rts

; ================= ESDF keyboard =================
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
        and #$40
        beq rkFwd               ; E held
        lda joyv
        and #$01
        bne rkNotE              ; joystick-1 up also moves forward
rkFwd:  jsr moveFwd
rkNotE: lda $dc01
        ora joyEor
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
        lda pa
        sec
        sbc #$06
        sta pa
rkJR:   lda joyv
        and #$08
        bne rkJD                ; joystick-1 right = turn right
        lda pa
        clc
        adc #$06
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
        lda dxv
        bpl mvxp
        clc
        lda px
        adc dxv
        sta nxL
        lda px+1
        adc #$ff
        sta nxH
        jmp mvy
mvxp:   clc
        lda px
        adc dxv
        sta nxL
        lda px+1
        adc #$00
        sta nxH
mvy:    lda dyv
        bpl mvyp
        clc
        lda py
        adc dyv
        sta nyL
        lda py+1
        adc #$ff
        sta nyH
        jmp mvchk
mvyp:   clc
        lda py
        adc dyv
        sta nyL
        lda py+1
        adc #$00
        sta nyH
mvchk:  lda nxH
        cmp #16
        bcs mvno
        lda nyH
        cmp #16
        bcs mvno
        lda nyH
        asl
        asl
        asl
        asl
        clc
        adc nxH
        tax
        lda mapT,x
        bne mvno
        lda nxL
        sta px
        lda nxH
        sta px+1
        lda nyL
        sta py
        lda nyH
        sta py+1
mvno:   rts

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
        lda faceIdT,x
        sta tmp2                ; span faceId (same across the merged interior)
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
isErr:  lda dxv
        lsr
        sta errv                ; err = width/2
        lda spanL
        sta col
isLp:   inc col
        lda col
        cmp spanR
        bcs isDn
        clc
        lda errv
        adc dyv
        sta errv
isW:    lda errv
        cmp dxv
        bcc isWr
        sec
        sbc dxv
        sta errv
        lda syNeg
        beq isInc
        dec hcur
        jmp isW
isInc:  inc hcur
        jmp isW
isWr:   ldx col
        lda hcur
        sta colH,x
        lda tmp2
        sta faceIdT,x
        jmp isLp
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
        lda py+1                ; cell = mapY*16 + mapX, stepped by +-1 / +-16 from here on
        asl
        asl
        asl
        asl
        clc
        adc px+1
        sta cell
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
cydone: ldy #24
cdda:   lda sdxH
        cmp sdyH
        bcc cstepX
        bne cstepY
        lda sdx
        cmp sdy
        bcc cstepX
        beq cstepX
cstepY: clc
        lda sdy
        adc ddy
        sta sdy
        lda sdyH
        adc ddyH
        sta sdyH
        lda cell
        clc
        adc stpY16
        sta cell
        lda #$01
        sta side
        jmp chit
cstepX: clc
        lda sdx
        adc ddx
        sta sdx
        lda sdxH
        adc ddxH
        sta sdxH
        lda cell
        clc
        adc stpX
        sta cell
        lda #$00
        sta side
        ; No bounds check: the map border is solid on all four sides (asserted at build
        ; time), so a ray always hits a wall before it can step outside the grid. That also
        ; makes the +-1 cell stepping safe -- mapX never runs off the end of a row.
chit:   ldx cell
        lda mapT,x
        bne cwall
        dey
        bne cdda
cfar:   lda #$01                ; step guard expired; unreachable with a solid border
        sta pp
        rts
cwall:  lda side
        bne cperpY
        sec
        lda sdx
        sbc ddx
        sta remL
        lda sdxH
        sbc ddxH
        sta remH
        jmp cidx
cperpY: sec
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
        lda remH
        sta tmp2
        lda #$00
        sta ppHi
        asl tmp2
        rol ppHi
        asl tmp2
        rol ppHi
        asl tmp2
        rol ppHi
        asl tmp2
        rol ppHi
        asl tmp2
        rol ppHi                ; tmp2 = (remH*32) low, ppHi = high bit
        lda tmp2
        clc
        adc tmp
        sta ppLo
        lda ppHi
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
        sta s1
        lda f1HiT,x
        sta s2
        jmp smh1
smh0:   lda f0LoT,x
        sta s1
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
        lda s1
        sbc f0LoT,x
        sta s1
        lda s2
        sbc f0HiT,x
        sta s2
        lda fr                  ; --- low half: (fr * mlo) >> 8, added into s1 ---
        clc
        adc mlo
        tax
        bcc sml0
        lda f1LoT,x
        sta qlo
        lda f1HiT,x
        sta qhi
        jmp sml1
sml0:   lda f0LoT,x
        sta qlo
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
        lda qlo
        sbc f0LoT,x
        sta qlo
        lda qhi
        sbc f0HiT,x
        sta qhi
        clc
        lda s1
        adc qhi                 ; only the high byte of the low-half product survives the >>8
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
        adc #$dd
        sta (ppPtr),y
        iny
        lda fpsOnes
        clc
        adc #$dd
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
        lda #$02
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
        adc #$dd
        sta (ppPtr),y
        iny
        rts

; ================= data =================
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
rayOffT: !byte 233,233,233,233,233,234,234,234,234,235,235,235,235,236,236,236,236,237,237,237,238,238,238,238,239,239,239,239,240,240,240,241,241,241,241,242,242,242,243,243,243,244,244,244,244,245,245,245,246,246,246,247,247,247,248,248,248,249,249,249,250,250,250,251,251,251,252,252,252,253,253,253,254,254,254,255,255,255,255,0,0,1,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10,11,11,11,12,12,12,12,13,13,13,14,14,14,15,15,15,15,16,16,16,17,17,17,17,18,18,18,18,19,19,19,20,20,20,20,21,21,21,21,22,22,22,22,23,23,23,23,24
cosCorrT: !byte 215,215,216,217,218,219,219,220,221,222,223,223,224,225,226,226,227,228,229,229,230,231,232,232,233,234,235,235,236,237,237,238,239,239,240,241,241,242,242,243,244,244,245,245,246,246,247,247,248,248,249,249,250,250,251,251,251,252,252,252,253,253,253,254,254,254,254,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,254,254,254,254,253,253,253,252,252,252,251,251,251,250,250,249,249,248,248,247,247,246,246,245,245,244,244,243,242,242,241,241,240,239,239,238,237,237,236,235,235,234,233,232,232,231,230,229,229,228,227,226,226,225,224,223,223,222,221,220,219,219,218,217,216,215,215
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
colGrpT: !byte 0,0,0,0,3,3,3,3,6,6,9,9,9,9,12,12,12,15,15,15,15,18,18,18,21,21,21,21,24,24,24,27,27,27,27,30,30,30,30,33,33,33,33,33,36,36,36,36,39,39,39,39,39,39,42,42,42,42,42,42,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,42,42,42,42,42,42,39,39,39,39,39,39,36,36,36,36,33,33,33,33,33,30,30,30,30,27,27,27,27,24,24,24,21,21,21,21,18,18,18,15,15,15,15,12,12,12,9,9,9,9,6,6,3,3,3,3,0,0,0,0
moveXT: !byte 36,36,36,36,36,36,36,35,35,35,35,35,34,34,34,34,33,33,33,32,32,31,31,30
        !byte 30,29,29,28,28,27,27,26,25,25,24,24,23,22,21,21,20,19,19,18,17,16,15,15
        !byte 14,13,12,11,10,10,9,8,7,6,5,4,4,3,2,1,0,255,254,253,252,252,251,250
        !byte 249,248,247,246,246,245,244,243,242,241,241,240,239,238,237,237,236,235,235,234,233,232,232,231
        !byte 231,230,229,229,228,228,227,227,226,226,225,225,224,224,223,223,223,222,222,222,222,221,221,221
        !byte 221,221,220,220,220,220,220,220,220,220,220,220,220,220,220,221,221,221,221,221,222,222,222,222
        !byte 223,223,223,224,224,225,225,226,226,227,227,228,228,229,229,230,231,231,232,232,233,234,235,235
        !byte 236,237,237,238,239,240,241,241,242,243,244,245,246,246,247,248,249,250,251,252,252,253,254,255
        !byte 0,1,2,3,4,4,5,6,7,8,9,10,10,11,12,13,14,15,15,16,17,18,19,19
        !byte 20,21,21,22,23,24,24,25,25,26,27,27,28,28,29,29,30,30,31,31,32,32,33,33
        !byte 33,34,34,34,34,35,35,35,35,35,36,36,36,36,36,36
moveYT: !byte 0,1,2,3,4,4,5,6,7,8,9,10,10,11,12,13,14,15,15,16,17,18,19,19
        !byte 20,21,21,22,23,24,24,25,25,26,27,27,28,28,29,29,30,30,31,31,32,32,33,33
        !byte 33,34,34,34,34,35,35,35,35,35,36,36,36,36,36,36,36,36,36,36,36,36,36,35
        !byte 35,35,35,35,34,34,34,34,33,33,33,32,32,31,31,30,30,29,29,28,28,27,27,26
        !byte 25,25,24,24,23,22,21,21,20,19,19,18,17,16,15,15,14,13,12,11,10,10,9,8
        !byte 7,6,5,4,4,3,2,1,0,255,254,253,252,252,251,250,249,248,247,246,246,245,244,243
        !byte 242,241,241,240,239,238,237,237,236,235,235,234,233,232,232,231,231,230,229,229,228,228,227,227
        !byte 226,226,225,225,224,224,223,223,223,222,222,222,222,221,221,221,221,221,220,220,220,220,220,220
        !byte 220,220,220,220,220,220,220,221,221,221,221,221,222,222,222,222,223,223,223,224,224,225,225,226
        !byte 226,227,227,228,228,229,229,230,231,231,232,232,233,234,235,235,236,237,237,238,239,240,241,241
        !byte 242,243,244,245,246,246,247,248,249,250,251,252,252,253,254,255
rowLoT: !byte 0,40,80,120,160,200,240,24,64,104,144,184,224,8,48,88,128,168,208,248,32,72,112,152,192
rowHiT: !byte 0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,2,2,3,3,3,3,3
kTabT:  !byte 164,172,180,188,196,204,212,220,228,236,244,252,4
col4T:  !byte 0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60,64,68,72,76,80,84,88,92,96,100,104,108,112,116,120,124,128,132,136,140,144,148,152,156
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
blkLoT: !byte 0,<bkA0,<bkA1,<bkA2,<bkA3,<bkA4,<bkA5,<bkA6,<bkA7,<bkA8,<bkA9,<bkA10,<bkA11,<bkA12,0,<bkB0,<bkB1,<bkB2,<bkB3,<bkB4,<bkB5,<bkB6,<bkB7,<bkB8,<bkB9,<bkB10,<bkB11,<bkB12
blkHiT: !byte 0,>bkA0,>bkA1,>bkA2,>bkA3,>bkA4,>bkA5,>bkA6,>bkA7,>bkA8,>bkA9,>bkA10,>bkA11,>bkA12,0,>bkB0,>bkB1,>bkB2,>bkB3,>bkB4,>bkB5,>bkB6,>bkB7,>bkB8,>bkB9,>bkB10,>bkB11,>bkB12
sldLoT: !byte <slA0,<slA1,<slA2,<slA3,<slA4,<slA5,<slA6,<slA7,<slA8,<slA9,<slA10,<slA11,<slA12,0,<slB0,<slB1,<slB2,<slB3,<slB4,<slB5,<slB6,<slB7,<slB8,<slB9,<slB10,<slB11,<slB12,0
sldHiT: !byte >slA0,>slA1,>slA2,>slA3,>slA4,>slA5,>slA6,>slA7,>slA8,>slA9,>slA10,>slA11,>slA12,0,>slB0,>slB1,>slB2,>slB3,>slB4,>slB5,>slB6,>slB7,>slB8,>slB9,>slB10,>slB11,>slB12,0
t1TabT: !byte 100,92,84,76,68,60,52,44,36,28,20,12,4
tbTabT: !byte 93,85,77,69,61,53,45,37,29,21,13,5,0
; sideT / idT / colH are per-frame mutable arrays in scratch RAM at $c100+ (see equates)
dataEnd:                        ; guard: must clear both screen buffers AND the charset -- see the layout check in build-iray.mjs

        * = charset
        !byte 0,0,0,0,0,0,0,0,85,85,85,85,85,85,85,85,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,5
        !byte 0,0,0,0,0,1,1,5,0,0,0,0,1,1,5,5,0,0,0,1,1,5,5,5,0,0,1,1,1,5,5,21
        !byte 0,1,1,1,5,5,5,21,1,1,1,5,5,5,5,21,1,1,1,5,5,5,21,21,1,1,5,5,5,5,21,21
        !byte 0,0,0,0,0,1,5,5,0,0,0,0,1,1,5,21,0,0,0,1,1,5,5,21,0,0,1,1,5,5,5,21
        !byte 0,1,1,1,5,5,21,21,1,1,5,5,5,21,21,21,0,0,0,0,0,0,0,5,0,0,0,0,0,0,1,21
        !byte 0,0,0,0,0,1,5,21,0,0,0,0,1,5,5,21,0,0,0,1,1,5,21,21,0,0,1,1,5,5,21,21
        !byte 0,1,1,5,5,5,21,21,1,1,1,5,5,21,21,21,1,5,5,5,5,21,21,21,0,0,0,0,0,0,0,64
        !byte 0,0,0,0,0,0,0,80,0,0,0,0,0,0,0,85,0,0,0,0,0,0,5,85,0,0,0,0,0,1,21,85
        !byte 0,0,0,0,1,5,21,85,0,0,0,1,5,5,21,85,0,0,1,1,5,21,21,85,0,1,1,5,5,21,21,85
        !byte 1,1,5,5,5,21,21,85,1,1,5,5,21,21,21,85,1,5,5,5,21,21,21,85,0,0,0,0,0,0,64,80
        !byte 0,0,0,0,0,0,64,84,0,0,0,0,0,0,80,85,0,0,0,0,0,0,85,85,0,0,0,0,0,5,85,85
        !byte 0,0,0,0,1,21,85,85,0,0,0,1,5,21,85,85,0,0,1,5,5,21,85,85,0,1,1,5,21,21,85,85
        !byte 1,1,5,5,21,21,85,85,1,5,5,5,21,21,85,85,1,5,5,21,21,21,85,85,0,0,0,0,0,64,64,80
        !byte 0,0,0,0,0,64,80,80,0,0,0,0,0,64,80,84,0,0,0,0,0,64,84,85,0,0,0,0,0,80,85,85
        !byte 0,0,0,0,0,85,85,85,0,0,0,0,5,85,85,85,0,0,0,1,21,85,85,85,0,0,1,5,21,85,85,85
        !byte 0,1,5,5,21,85,85,85,1,1,5,21,21,85,85,85,1,5,5,21,21,85,85,85,5,5,5,21,21,85,85,85
        !byte 0,0,0,0,64,64,80,80,0,0,0,0,64,64,80,84,0,0,0,0,64,80,80,84,0,0,0,0,64,80,84,85
        !byte 0,0,0,0,64,84,85,85,0,0,0,0,80,85,85,85,0,0,0,0,85,85,85,85,0,0,0,5,85,85,85,85
        !byte 0,0,1,21,85,85,85,85,0,1,5,21,85,85,85,85,1,5,5,21,85,85,85,85,1,5,21,21,85,85,85,85
        !byte 5,5,21,21,85,85,85,85,0,0,0,64,64,80,80,80,0,0,0,64,64,80,80,84,0,0,0,64,64,80,84,84
        !byte 0,0,0,64,80,80,84,85,0,0,0,64,80,84,85,85,0,0,0,64,84,85,85,85,0,0,0,80,85,85,85,85
        !byte 0,0,0,85,85,85,85,85,0,0,5,85,85,85,85,85,0,1,21,85,85,85,85,85,1,5,21,85,85,85,85,85
        !byte 5,5,21,85,85,85,85,85,5,21,21,85,85,85,85,85,0,0,64,64,64,80,80,84,0,0,64,64,80,80,80,84
        !byte 0,0,64,64,80,80,84,84,0,0,64,64,80,84,84,85,0,0,64,80,80,84,85,85,0,0,64,80,84,85,85,85
        !byte 0,0,64,84,85,85,85,85,0,0,80,85,85,85,85,85,0,0,85,85,85,85,85,85,0,5,85,85,85,85,85,85
        !byte 1,21,85,85,85,85,85,85,5,21,85,85,85,85,85,85,0,64,64,64,80,80,80,84,0,64,64,64,80,80,84,84
        !byte 0,64,64,80,80,80,84,84,0,64,64,80,80,84,84,85,0,64,64,80,84,84,85,85,0,64,80,80,84,85,85,85
        !byte 0,64,80,84,85,85,85,85,0,64,84,85,85,85,85,85,0,80,85,85,85,85,85,85,0,85,85,85,85,85,85,85
        !byte 5,85,85,85,85,85,85,85,21,85,85,85,85,85,85,85,64,64,64,80,80,80,80,84,64,64,64,80,80,80,84,84
        !byte 64,64,64,80,80,84,84,84,64,64,80,80,80,84,84,85,64,64,80,80,84,84,85,85,64,64,80,84,84,85,85,85
        !byte 64,80,80,84,85,85,85,85,64,80,84,85,85,85,85,85,64,84,85,85,85,85,85,85,80,85,85,85,85,85,85,85
        !byte 64,64,80,80,80,80,84,84,64,64,80,80,80,84,84,84,64,64,80,80,84,84,84,85,64,80,80,80,84,84,85,85
        !byte 64,80,80,84,84,85,85,85,64,80,84,84,85,85,85,85,80,80,84,85,85,85,85,85,80,84,85,85,85,85,85,85
        !byte 84,85,85,85,85,85,85,85,64,80,80,80,80,84,84,84,64,80,80,80,84,84,84,85,64,80,80,84,84,84,85,85
        !byte 80,80,80,84,84,85,85,85,80,80,84,84,85,85,85,85,80,84,84,85,85,85,85,85,0,0,0,0,0,0,0,21
        !byte 0,0,0,0,0,21,21,21,0,0,0,21,21,21,21,21,0,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21
        !byte 0,0,0,0,0,21,21,85,0,0,0,21,21,21,21,85,0,21,21,21,21,21,21,85,21,21,21,21,21,21,21,85
        !byte 0,0,0,0,0,64,64,64,0,0,0,0,0,64,64,85,0,0,0,21,21,85,85,85,0,21,21,21,21,85,85,85
        !byte 21,21,21,21,21,85,85,85,0,0,0,64,64,64,64,64,0,0,0,64,64,64,64,85,0,0,0,64,64,85,85,85
        !byte 0,21,21,85,85,85,85,85,21,21,21,85,85,85,85,85,0,64,64,64,64,64,64,64,0,64,64,64,64,64,64,85
        !byte 0,64,64,64,64,85,85,85,0,64,64,85,85,85,85,85,64,64,64,64,64,64,64,64,64,64,64,64,64,64,64,85
        !byte 64,64,64,64,64,85,85,85,64,64,64,85,85,85,85,85,64,85,85,85,85,85,85,85,0,0,0,0,0,5,5,5
        !byte 0,0,0,5,5,5,5,5,0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0,0,0,0,5,5,85
        !byte 0,0,0,5,5,5,5,85,0,5,5,5,5,5,5,85,5,5,5,5,5,5,5,85,0,0,0,0,0,80,80,80
        !byte 0,0,0,0,0,80,80,85,0,0,0,5,5,85,85,85,0,5,5,5,5,85,85,85,5,5,5,5,5,85,85,85
        !byte 0,0,0,80,80,80,80,80,0,0,0,80,80,80,80,85,0,0,0,80,80,85,85,85,0,5,5,85,85,85,85,85
        !byte 5,5,5,85,85,85,85,85,0,80,80,80,80,80,80,80,0,80,80,80,80,80,80,85,0,80,80,80,80,85,85,85
        !byte 0,80,80,85,85,85,85,85,80,80,80,80,80,80,80,80,80,80,80,80,80,80,80,85,80,80,80,80,80,85,85,85
        !byte 80,80,80,85,85,85,85,85,0,0,0,0,0,1,1,1,0,0,0,1,1,1,1,1,0,1,1,1,1,1,1,1
        !byte 1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,84,0,0,0,0,0,1,1,85,0,0,0,1,1,1,1,85
        !byte 0,1,1,1,1,1,1,85,1,1,1,1,1,1,1,85,0,0,0,0,0,84,84,84,0,0,0,0,0,84,84,85
        !byte 0,0,0,1,1,85,85,85,0,1,1,1,1,85,85,85,1,1,1,1,1,85,85,85,0,0,0,84,84,84,84,84
        !byte 0,0,0,84,84,84,84,85,0,0,0,84,84,85,85,85,0,1,1,85,85,85,85,85,1,1,1,85,85,85,85,85
        !byte 0,84,84,84,84,84,84,84,0,84,84,84,84,84,84,85,0,84,84,84,84,85,85,85,0,84,84,85,85,85,85,85
        !byte 1,85,85,85,85,85,85,85,84,84,84,84,84,84,84,84,84,84,84,84,84,84,84,85,84,84,84,84,84,85,85,85
        !byte 84,84,84,85,85,85,85,85,0,84,68,68,68,84,0,0,0,16,80,16,16,84,0,0,0,84,4,84,64,84,0,0
        !byte 0,84,4,84,4,84,0,0,0,68,68,84,4,4,0,0,0,84,64,84,4,84,0,0,0,84,64,84,68,84,0,0
        !byte 0,84,4,16,16,16,0,0,0,84,68,84,68,84,0,0,0,84,68,84,4,84,0,0,0,16,68,84,68,68,0,0
        !byte 0,80,68,80,68,80,0,0,0,84,64,64,64,84,0,0,0,80,68,68,68,80,0,0,0,84,64,80,64,84,0,0
        !byte 0,84,64,80,64,64,0,0,0,68,68,16,68,68,0,0,0,68,68,16,16,16,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0

        * = $3000
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
; connected-wall-run id tables (indexed by cell id) live above the f-tables in free RAM
runWT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,31,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,31,0,0,0,0,0,0,0,14,0,0,0,24,0,0,0,31,0,0,3,0,0,0,0,0,0,0,0,24,0,0,0,31,0,0,3,0,0,0,0,16,0,0,0,24,0,28,0,0,0,0,3,0,8,0,0,0,0,0,0,24,0,0,0,32,0,0,3,0,8,0,0,0,0,0,0,0,0,29,0,32,0,0,3,0,8,0,12,0,0,0,0,0,0,29,0,32,0,0,0,0,8,0,12,0,0,0,0,0,0,29,0,32,0,0,0,0,8,0,12,0,19,0,0,0,0,0,0,32,0,0,0,0,0,0,12,0,19,0,0,0,0,0,0,32,0,0,6,0,0,0,0,0,19,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,22,0,0,0,0,33,0,0,0,0,10,0,0,0,0,0,0,0,0,0,0,33,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
runET: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,15,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,15,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,15,0,0,0,0,0,27,0,0,1,0,0,0,7,0,0,0,0,0,0,25,0,0,0,0,1,0,4,0,0,0,0,0,18,0,0,25,0,0,0,0,1,0,4,0,0,0,0,17,0,0,0,25,0,0,0,0,1,0,4,0,9,0,0,0,0,0,0,0,0,30,0,0,1,0,4,0,9,0,0,0,0,0,21,0,0,30,0,0,1,0,0,0,9,0,13,0,0,0,0,0,0,30,0,0,0,0,5,0,9,0,13,0,0,0,0,26,0,0,0,0,2,0,0,0,0,0,13,0,20,0,0,0,0,0,0,0,2,0,0,0,0,0,13,0,20,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,23,0,0,0,0,0,2,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
runNT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,37,37,0,0,0,0,39,39,39,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,41,41,0,0,0,0,43,43,0,0,0,0,0,45,45,45,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,0,0,0,0,0,0,0,0,50,50,50,50,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,53,53,0,0,0,0,0,56,56,56,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,58,58,58,0,0,0,0,61,61,61,61,61,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,64,0,0,0,0,0,0,0,0,0,0,0,65,65,65,0,0,66,66,66,66,66,66,66,66,66,0
runST: !byte 0,34,34,34,34,34,34,0,35,35,35,35,35,35,35,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,0,0,0,0,38,38,0,0,0,0,0,40,40,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,42,0,0,0,0,44,44,0,0,0,0,0,0,46,46,46,0,0,0,47,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,49,0,0,0,0,51,51,51,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,52,0,0,0,54,54,0,55,0,0,0,0,57,57,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,59,59,59,59,59,0,60,0,0,62,62,62,62,0,0,0,0,0,0,0,0,0,0,0,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0

        * = charsetB            ; charset A with every glyph's 8 bytes reversed
        !byte 0,0,0,0,0,0,0,0,85,85,85,85,85,85,85,85,1,0,0,0,0,0,0,0,5,1,0,0,0,0,0,0
        !byte 5,1,1,0,0,0,0,0,5,5,1,1,0,0,0,0,5,5,5,1,1,0,0,0,21,5,5,1,1,1,0,0
        !byte 21,5,5,5,1,1,1,0,21,5,5,5,5,1,1,1,21,21,5,5,5,1,1,1,21,21,5,5,5,5,1,1
        !byte 5,5,1,0,0,0,0,0,21,5,1,1,0,0,0,0,21,5,5,1,1,0,0,0,21,5,5,5,1,1,0,0
        !byte 21,21,5,5,1,1,1,0,21,21,21,5,5,5,1,1,5,0,0,0,0,0,0,0,21,1,0,0,0,0,0,0
        !byte 21,5,1,0,0,0,0,0,21,5,5,1,0,0,0,0,21,21,5,1,1,0,0,0,21,21,5,5,1,1,0,0
        !byte 21,21,5,5,5,1,1,0,21,21,21,5,5,1,1,1,21,21,21,5,5,5,5,1,64,0,0,0,0,0,0,0
        !byte 80,0,0,0,0,0,0,0,85,0,0,0,0,0,0,0,85,5,0,0,0,0,0,0,85,21,1,0,0,0,0,0
        !byte 85,21,5,1,0,0,0,0,85,21,5,5,1,0,0,0,85,21,21,5,1,1,0,0,85,21,21,5,5,1,1,0
        !byte 85,21,21,5,5,5,1,1,85,21,21,21,5,5,1,1,85,21,21,21,5,5,5,1,80,64,0,0,0,0,0,0
        !byte 84,64,0,0,0,0,0,0,85,80,0,0,0,0,0,0,85,85,0,0,0,0,0,0,85,85,5,0,0,0,0,0
        !byte 85,85,21,1,0,0,0,0,85,85,21,5,1,0,0,0,85,85,21,5,5,1,0,0,85,85,21,21,5,1,1,0
        !byte 85,85,21,21,5,5,1,1,85,85,21,21,5,5,5,1,85,85,21,21,21,5,5,1,80,64,64,0,0,0,0,0
        !byte 80,80,64,0,0,0,0,0,84,80,64,0,0,0,0,0,85,84,64,0,0,0,0,0,85,85,80,0,0,0,0,0
        !byte 85,85,85,0,0,0,0,0,85,85,85,5,0,0,0,0,85,85,85,21,1,0,0,0,85,85,85,21,5,1,0,0
        !byte 85,85,85,21,5,5,1,0,85,85,85,21,21,5,1,1,85,85,85,21,21,5,5,1,85,85,85,21,21,5,5,5
        !byte 80,80,64,64,0,0,0,0,84,80,64,64,0,0,0,0,84,80,80,64,0,0,0,0,85,84,80,64,0,0,0,0
        !byte 85,85,84,64,0,0,0,0,85,85,85,80,0,0,0,0,85,85,85,85,0,0,0,0,85,85,85,85,5,0,0,0
        !byte 85,85,85,85,21,1,0,0,85,85,85,85,21,5,1,0,85,85,85,85,21,5,5,1,85,85,85,85,21,21,5,1
        !byte 85,85,85,85,21,21,5,5,80,80,80,64,64,0,0,0,84,80,80,64,64,0,0,0,84,84,80,64,64,0,0,0
        !byte 85,84,80,80,64,0,0,0,85,85,84,80,64,0,0,0,85,85,85,84,64,0,0,0,85,85,85,85,80,0,0,0
        !byte 85,85,85,85,85,0,0,0,85,85,85,85,85,5,0,0,85,85,85,85,85,21,1,0,85,85,85,85,85,21,5,1
        !byte 85,85,85,85,85,21,5,5,85,85,85,85,85,21,21,5,84,80,80,64,64,64,0,0,84,80,80,80,64,64,0,0
        !byte 84,84,80,80,64,64,0,0,85,84,84,80,64,64,0,0,85,85,84,80,80,64,0,0,85,85,85,84,80,64,0,0
        !byte 85,85,85,85,84,64,0,0,85,85,85,85,85,80,0,0,85,85,85,85,85,85,0,0,85,85,85,85,85,85,5,0
        !byte 85,85,85,85,85,85,21,1,85,85,85,85,85,85,21,5,84,80,80,80,64,64,64,0,84,84,80,80,64,64,64,0
        !byte 84,84,80,80,80,64,64,0,85,84,84,80,80,64,64,0,85,85,84,84,80,64,64,0,85,85,85,84,80,80,64,0
        !byte 85,85,85,85,84,80,64,0,85,85,85,85,85,84,64,0,85,85,85,85,85,85,80,0,85,85,85,85,85,85,85,0
        !byte 85,85,85,85,85,85,85,5,85,85,85,85,85,85,85,21,84,80,80,80,80,64,64,64,84,84,80,80,80,64,64,64
        !byte 84,84,84,80,80,64,64,64,85,84,84,80,80,80,64,64,85,85,84,84,80,80,64,64,85,85,85,84,84,80,64,64
        !byte 85,85,85,85,84,80,80,64,85,85,85,85,85,84,80,64,85,85,85,85,85,85,84,64,85,85,85,85,85,85,85,80
        !byte 84,84,80,80,80,80,64,64,84,84,84,80,80,80,64,64,85,84,84,84,80,80,64,64,85,85,84,84,80,80,80,64
        !byte 85,85,85,84,84,80,80,64,85,85,85,85,84,84,80,64,85,85,85,85,85,84,80,80,85,85,85,85,85,85,84,80
        !byte 85,85,85,85,85,85,85,84,84,84,84,80,80,80,80,64,85,84,84,84,80,80,80,64,85,85,84,84,84,80,80,64
        !byte 85,85,85,84,84,80,80,80,85,85,85,85,84,84,80,80,85,85,85,85,85,84,84,80,21,0,0,0,0,0,0,0
        !byte 21,21,21,0,0,0,0,0,21,21,21,21,21,0,0,0,21,21,21,21,21,21,21,0,21,21,21,21,21,21,21,21
        !byte 85,21,21,0,0,0,0,0,85,21,21,21,21,0,0,0,85,21,21,21,21,21,21,0,85,21,21,21,21,21,21,21
        !byte 64,64,64,0,0,0,0,0,85,64,64,0,0,0,0,0,85,85,85,21,21,0,0,0,85,85,85,21,21,21,21,0
        !byte 85,85,85,21,21,21,21,21,64,64,64,64,64,0,0,0,85,64,64,64,64,0,0,0,85,85,85,64,64,0,0,0
        !byte 85,85,85,85,85,21,21,0,85,85,85,85,85,21,21,21,64,64,64,64,64,64,64,0,85,64,64,64,64,64,64,0
        !byte 85,85,85,64,64,64,64,0,85,85,85,85,85,64,64,0,64,64,64,64,64,64,64,64,85,64,64,64,64,64,64,64
        !byte 85,85,85,64,64,64,64,64,85,85,85,85,85,64,64,64,85,85,85,85,85,85,85,64,5,5,5,0,0,0,0,0
        !byte 5,5,5,5,5,0,0,0,5,5,5,5,5,5,5,0,5,5,5,5,5,5,5,5,85,5,5,0,0,0,0,0
        !byte 85,5,5,5,5,0,0,0,85,5,5,5,5,5,5,0,85,5,5,5,5,5,5,5,80,80,80,0,0,0,0,0
        !byte 85,80,80,0,0,0,0,0,85,85,85,5,5,0,0,0,85,85,85,5,5,5,5,0,85,85,85,5,5,5,5,5
        !byte 80,80,80,80,80,0,0,0,85,80,80,80,80,0,0,0,85,85,85,80,80,0,0,0,85,85,85,85,85,5,5,0
        !byte 85,85,85,85,85,5,5,5,80,80,80,80,80,80,80,0,85,80,80,80,80,80,80,0,85,85,85,80,80,80,80,0
        !byte 85,85,85,85,85,80,80,0,80,80,80,80,80,80,80,80,85,80,80,80,80,80,80,80,85,85,85,80,80,80,80,80
        !byte 85,85,85,85,85,80,80,80,1,1,1,0,0,0,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,0
        !byte 1,1,1,1,1,1,1,1,84,0,0,0,0,0,0,0,85,1,1,0,0,0,0,0,85,1,1,1,1,0,0,0
        !byte 85,1,1,1,1,1,1,0,85,1,1,1,1,1,1,1,84,84,84,0,0,0,0,0,85,84,84,0,0,0,0,0
        !byte 85,85,85,1,1,0,0,0,85,85,85,1,1,1,1,0,85,85,85,1,1,1,1,1,84,84,84,84,84,0,0,0
        !byte 85,84,84,84,84,0,0,0,85,85,85,84,84,0,0,0,85,85,85,85,85,1,1,0,85,85,85,85,85,1,1,1
        !byte 84,84,84,84,84,84,84,0,85,84,84,84,84,84,84,0,85,85,85,84,84,84,84,0,85,85,85,85,85,84,84,0
        !byte 85,85,85,85,85,85,85,1,84,84,84,84,84,84,84,84,85,84,84,84,84,84,84,84,85,85,85,84,84,84,84,84
        !byte 85,85,85,85,85,84,84,84,0,0,84,68,68,68,84,0,0,0,84,16,16,80,16,0,0,0,84,64,84,4,84,0
        !byte 0,0,84,4,84,4,84,0,0,0,4,4,84,68,68,0,0,0,84,4,84,64,84,0,0,0,84,68,84,64,84,0
        !byte 0,0,16,16,16,4,84,0,0,0,84,68,84,68,84,0,0,0,84,4,84,68,84,0,0,0,68,68,84,68,16,0
        !byte 0,0,80,68,80,68,80,0,0,0,84,64,64,64,84,0,0,0,80,68,68,68,80,0,0,0,84,64,80,64,84,0
        !byte 0,0,64,64,80,64,84,0,0,0,68,68,16,68,68,0,0,0,16,16,16,68,68,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0

        * = $4000  ; VIC bank 0 is full -- these live above it
clampT: !byte 2,3,4,5,6,7,8,9,10,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12
        !byte 12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12
        !byte 12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12
        !byte 12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12
        !byte 12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12
        !byte 12,12,12,12,12,12,12,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1
qIdxT:  !byte 0,0,0,1,1,2,2,3,3,4,5,5,5
rampT:  !byte 0,0,0,2,3,4,5,6,7,8,9,10,11,0,0,0,0,0,0,2,3,12,13,14
        !byte 15,16,10,11,17,0,0,0,0,0,0,18,19,20,21,22,23,24,25,17,26,0,0,0
        !byte 27,27,28,29,30,31,32,33,34,35,36,37,38,0,0,0,39,39,40,41,42,43,44,45
        !byte 46,47,48,49,50,0,0,0,51,52,53,54,55,56,57,58,59,60,61,62,63,0,0,0
        !byte 64,65,66,67,68,69,70,71,72,73,74,75,76,0,0,0,77,78,79,80,81,82,83,84
        !byte 85,86,87,88,89,0,0,0,90,91,92,93,94,95,96,97,98,99,100,101,101,0,0,0
        !byte 102,103,104,105,106,107,108,109,110,111,112,113,113,0,0,0,114,115,116,117,118,119,120,121
        !byte 122,123,1,1,1,0,0,0,115,124,125,126,127,128,129,130,131,132,1,1,1,0,0,0
        !byte 124,125,133,134,135,136,137,138,131,132,1,1,1,0,0,0
stepT1: !byte 0,139,140,141,142,143,0,0,27,29,144,145,146,147,0,0,148,149,56,150,151,152,0,0
        !byte 153,154,155,84,156,157,0,0,158,159,160,161,111,113,0,0,162,163,164,165,166,1,0,0
stepT2: !byte 0,18,167,168,169,170,0,0,28,29,171,172,173,174,0,0,175,176,56,177,178,179,0,0
        !byte 180,181,182,84,183,184,0,0,185,186,187,188,111,112,0,0,189,190,191,192,123,1,0,0
stepT3: !byte 0,2,193,194,195,196,0,0,197,29,198,199,200,201,0,0,202,203,56,204,205,206,0,0
        !byte 207,208,209,84,210,211,0,0,212,213,214,215,111,216,0,0,217,218,219,220,132,1,0,0
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
chainEnd:
        * = $4800
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
