
charset = $2800
px      = $02
py      = $04
pa      = $06
rang    = $07
mapX    = $08
mapY    = $09
sdx     = $0a
sdy     = $0b
ddx     = $0c
ddy     = $0d
stpX    = $0e
stpY    = $0f
side    = $10
pp      = $11
fr      = $12
qa      = $13
qb      = $14
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
dpx     = $54
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
dbgRow  = $69
pixInv  = $6a
; overlay-private scratch. plotDigit/plotPix must NOT alias renderer vars: hcur is
; the span-interpolation accumulator and tmp is live inside renderSym, so the shared
; names let drawFps/drawDbg reach back into the scene between frames.
pdBase  = $6b
pdTmp   = $6c
pdGi    = $6d
pdRowN  = $6e
pdBits  = $6f
pdColN  = $70
ppPtr   = $71                   ; 2 bytes ($71/$72)
stackLT = $c000
stackRT = $c060
sideT   = $c100
idT     = $c150
colH    = $c1a0
faceIdT = $c1f0

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
        lda #$08
        sta $d016
        lda #$1a
        sta $d018               ; display buffer A, chars $2800
        lda #$01
        sta $d021               ; background white
        lda #$00
        sta $d020
        lda #$ff
        sta $dc02
        lda #$00
        sta $dc03
        ldx #$00
        lda #$00
ccf:    sta $d800,x             ; color RAM black (fg)
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
        lda #79
        sta col
        jsr marchCol            ; column 79
        lda #$00
        sta stackLT
        lda #79
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
        lsr
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
subDn:  jsr makeDiv
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
        lda #$1a
        sta $d018               ; show A, draw into B
        lda #$24
        sta baseHi
        jmp mnext
mshB:   lda #$9a
        sta $d018               ; show B, draw into A
        lda #$04
        sta baseHi
mnext:  inc iterLo
        bne mloop
        inc iterHi
        jmp mloop

; ============ dividers: zero the half-height at each wall-cell boundary (white seam) ============
makeDiv:
        ldx #$01
mdl:    lda faceIdT,x
        cmp faceIdT-1,x         ; MERGE: seam only where the wall FACE changes (corners)
        beq mdnx
        lda #$00
        sta colH,x              ; boundary -> white slit at this real column
mdnx:   inx
        cpx #80
        bne mdl
        rts

; ================= render, cell-based + vertical symmetry (no clear, no RMW) =================
; For each cell (2 logical columns) compute the 8-bit char directly and WRITE it; mirror
; the top half to the bottom via flip[]. Only 13 cell-rows computed instead of 25.
renderSym:
        lda #$00
        sta crc                 ; cell-row 0..12
rsRow:  lda crc                 ; patLo/patHi = patTab + cr*64
        sta tmp
        lda #$00
        sta tmp2
        asl tmp
        rol tmp2
        asl tmp
        rol tmp2
        asl tmp
        rol tmp2
        asl tmp
        rol tmp2
        asl tmp
        rol tmp2
        asl tmp
        rol tmp2
        clc
        lda tmp
        adc #<patTabT
        sta patLo
        lda tmp2
        adc #>patTabT
        sta patHi
        ldx crc                 ; topPtr = base + rowLo[cr]
        lda rowLoT,x
        sta tpLo
        lda rowHiT,x
        clc
        adc baseHi
        sta tpHi
        lda #24                 ; botPtr = base + rowLo[24-cr]
        sec
        sbc crc
        tax
        lda rowLoT,x
        sta btLo
        lda rowHiT,x
        clc
        adc baseHi
        sta btHi
        ldx crc                 ; per-row solid/blank thresholds
        lda t1TabT,x
        sta t1c
        lda tbTabT,x
        sta tbc
        lda #$00
        sta cellc
rsCol:  lda cellc               ; xL = 2*cellc  (X held for the whole cell)
        asl
        tax
        ; --- fast path: both logical columns fully solid -> $FF ---
        lda colH,x
        cmp t1c
        bcc rsChkB
        lda colH+1,x
        cmp t1c
        bcc rsChkB
        lda #$ff
        ldy cellc
        sta (tpLo),y
        sta (btLo),y            ; flip[$ff]=$ff
        jmp rsNext
        ; --- fast path: both fully blank -> $00 ---
rsChkB: lda colH,x
        cmp tbc
        bcs rsSlow
        lda colH+1,x
        cmp tbc
        bcs rsSlow
        lda #$00
        ldy cellc
        sta (tpLo),y
        sta (btLo),y            ; flip[$00]=$00
        jmp rsNext
        ; --- edge cell: real pattern computation ---
rsSlow: lda colH,x
        cmp #51                 ; cap uncapped height at 50 before pattern lookup
        bcc rsSa
        lda #50
rsSa:   tay
        lda (patLo),y
        tay
        lda spreadLT,y
        sta tmp
        lda colH+1,x
        cmp #51
        bcc rsSb
        lda #50
rsSb:   tay
        lda (patLo),y
        tay
        lda spreadRT,y
        ora tmp                 ; A = combined cell pattern
        ldx crc
        cpx #12
        beq rsCenter            ; center row straddles the mirror axis -> single symmetric write
        ldy cellc
        sta (tpLo),y            ; top half
        tax
        lda flipT,x
        sta (btLo),y            ; bottom half (mirrored)
        jmp rsNext
rsCenter:
        sta tmp2
        tax
        lda flipT,x
        ora tmp2                ; combined | flip(combined) = symmetric, order-independent
        ldy cellc
        sta (tpLo),y
rsNext: inc cellc
        lda cellc
        cmp #40
        bcc rsCol
        inc crc
        lda crc
        cmp #13
        bcc rsRow
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
        bne rkNotE
        jsr moveFwd
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
        bne rkNotD
        jsr moveBack
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
        lda mapY
        asl
        asl
        asl
        asl
        clc
        adc mapX                ; A = cell id (mapY*16 + mapX)
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
        lda px+1
        sta mapX
        lda py+1
        sta mapY
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
        lda s1
        sta sdy
        lda s2
        sta sdyH
        jmp cydone
cypos:  lda #$01
        sta stpY
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
        lda mapY
        clc
        adc stpY
        sta mapY
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
        lda mapX
        clc
        adc stpX
        sta mapX
        lda #$00
        sta side
chit:   lda mapX
        cmp #16
        bcs cfar
        lda mapY
        cmp #16
        bcs cfar
        lda mapY
        asl
        asl
        asl
        asl
        clc
        adc mapX
        tax
        lda mapT,x
        bne cwall
        dey
        bne cdda
cfar:   lda #$01
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
cidx:   lda col                 ; cos-correct: perpDist *= cosCorr[col] >>8 (rectilinear)
        tax
        lda cosCorrT,x
        sta fr
        lda remL
        sta mlo
        lda remH
        sta mhi
        jsr sideMul
        lda s1
        sta remL
        lda s2
        sta remH
        lda remH
        cmp #$10
        bcc cidxok
        lda #$01                ; >=16 cells -> tiny far wall
        sta pp
        rts
        ; pp16 = perpDist>>3 = remH*32 + (remL>>3)  (0..511), 1/32-cell steps
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
        sta ppHi
        ldx ppLo
        lda ppHi
        bne cidxb
        lda hLUTaT,x
        sta pp
        rts
cidxb:  lda hLUTbT,x
        sta pp
        rts

; sideMul: fr(8) * (mhi:mlo)(16) >>8 -> s2:s1
sideMul:
        lda fr
        sta qa
        lda mhi
        sta qb
        jsr mul8
        lda qlo
        sta s1
        lda qhi
        sta s2
        lda fr
        sta qa
        lda mlo
        sta qb
        jsr mul8
        clc
        lda s1
        adc qhi
        sta s1
        lda s2
        adc #$00
        sta s2
        rts

; mul8: qa*qb (unsigned) -> qlo:qhi
mul8:   lda qa
        clc
        adc qb
        tax
        bcc mslo
        lda f1LoT,x
        sta qlo
        lda f1HiT,x
        sta qhi
        jmp mdiff
mslo:   lda f0LoT,x
        sta qlo
        lda f0HiT,x
        sta qhi
mdiff:  lda qa
        sec
        sbc qb
        bcs mdpos
        eor #$ff
        clc
        adc #$01
mdpos:  tax
        sec
        lda qlo
        sbc f0LoT,x
        sta qlo
        lda qhi
        sbc f0HiT,x
        sta qhi
        rts

; ---- raster IRQ: count video frames ----
irq:    inc frameCnt
        bne irqd
        inc frameCnt+1
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

; ---- draw 2-digit fps at top-left (clears row0 + row1 cols0-3) ----
drawFps:
        lda #$00
        sta dbgRow              ; fps digits at logical rows 0-4
        sta pixInv              ; fps = white digits on black
        lda baseHi
        sta ppPtr+1
        lda #$00
        sta ppPtr
        lda #$00
        ldy #$07
dfc0:   sta (ppPtr),y           ; row 0 cells 0-7
        dey
        bpl dfc0
        ldy #47
dfc1:   sta (ppPtr),y           ; row 1 cells 40-47
        dey
        cpy #39
        bne dfc1
        lda fpsTens
        ldx #$00
        jsr plotDigit
        lda fpsOnes
        ldx #$04
        jsr plotDigit
        rts

; ===== debug readout (top-right): X/Y in cell.frac hex, A in hex. exact 8.8 position =====
drawDbg:
        lda #$00
        sta pixInv              ; white digits (same as fps)
        sta dbgRow
ddClrR: ldx dbgRow              ; black plate: rows 0-4, cols 29-39
        lda rowLoT,x
        clc
        adc #29
        sta ppPtr
        lda rowHiT,x
        adc baseHi
        sta ppPtr+1
        ldy #$0a
        lda #$00
ddClrC: sta (ppPtr),y
        dey
        bpl ddClrC
        inc dbgRow
        lda dbgRow
        cmp #$05
        bne ddClrR
        ; --- X line (rows 0-4): label, cell nibble, frac hi, frac lo ---
        lda #$00
        sta dbgRow
        lda #16
        ldx #60
        jsr plotDigit
        lda px+1
        and #$0f
        ldx #64
        jsr plotDigit
        lda px
        lsr
        lsr
        lsr
        lsr
        ldx #68
        jsr plotDigit
        lda px
        and #$0f
        ldx #72
        jsr plotDigit
        ; --- Y line (rows 6-10) ---
        lda #$06
        sta dbgRow
        lda #17
        ldx #60
        jsr plotDigit
        lda py+1
        and #$0f
        ldx #64
        jsr plotDigit
        lda py
        lsr
        lsr
        lsr
        lsr
        ldx #68
        jsr plotDigit
        lda py
        and #$0f
        ldx #72
        jsr plotDigit
        ; --- A line (rows 12-16): label + angle byte ---
        lda #12
        sta dbgRow
        lda #10
        ldx #60
        jsr plotDigit
        lda pa
        lsr
        lsr
        lsr
        lsr
        ldx #64
        jsr plotDigit
        lda pa
        and #$0f
        ldx #68
        jsr plotDigit
        rts

; plotDigit: A=digit(0..9), X=base logical col; 3x5 glyph at logical rows 0..4
plotDigit:
        stx pdBase
        sta pdTmp
        asl
        asl
        clc
        adc pdTmp
        sta pdGi                ; digit*5
        lda #$00
        sta pdRowN
pdRow:  ldx pdGi
        lda digGlyphT,x
        sta pdBits
        lda #$00
        sta pdColN
pdCol:  ldx pdColN
        lda pdBits
        and colBitT,x
        beq pdSkip
        lda pdBase
        clc
        adc pdColN
        sta dpx
        lda pdRowN
        clc
        adc dbgRow              ; base row (0 for fps; 0/6/12 for X/Y/A readout)
        sta dpy
        jsr plotPix
pdSkip: inc pdColN
        lda pdColN
        cmp #$03
        bne pdCol
        inc pdGi
        inc pdRowN
        lda pdRowN
        cmp #$05
        bne pdRow
        rts

; plotPix: OR black logical pixel (dpx,dpy) into hidden framebuffer
plotPix:
        lda dpy
        lsr
        lsr
        tax
        clc
        lda rowLoT,x
        sta ppPtr
        lda rowHiT,x
        adc baseHi
        sta ppPtr+1
        lda dpx
        lsr
        clc
        adc ppPtr
        sta ppPtr
        bcc ppnc
        inc ppPtr+1
ppnc:   lda dpy
        and #$03
        tax
        lda bit1T,x
        tax
        lda dpx
        and #$01
        beq ppL
        lda spreadRT,x
        jmp ppor
ppL:    lda spreadLT,x
ppor:   ldy #$00
        ldx pixInv
        bne ppBlk
        ora (ppPtr),y           ; white pixel (set bits)
        sta (ppPtr),y
        rts
ppBlk:  eor #$ff                ; black pixel (clear the masked bits)
        and (ppPtr),y
        sta (ppPtr),y
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
rayOffT: !byte 233,233,233,234,234,235,235,236,237,237,238,238,239,239,240,240,241,242,242,243,243,244,245,245,246,246,247,248,248,249,250,250,251,252,252,253,254,254,255,0,0,1,2,2,3,4,4,5,6,6,7,8,8,9,10,10,11,11,12,13,13,14,14,15,16,16,17,17,18,18,19,19,20,21,21,22,22,23,23,24
cosCorrT: !byte 215,216,218,219,221,223,224,226,227,229,230,232,233,235,236,237,239,240,241,243,244,245,246,247,248,249,250,251,252,252,253,254,254,255,255,255,255,255,255,255,255,255,255,255,255,255,255,254,254,253,252,252,251,250,249,248,247,246,245,244,243,241,240,239,237,236,235,233,232,230,229,227,226,224,223,221,219,218,216,215
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
hLUTaT: !byte 127,127,127,127,127,127,127,127,127,127,127,127,117,108,101,94,88,83,78,74,70,67,64,61
        !byte 59,56,54,52,50,49,47,45,44,43,41,40,39,38,37,36,35,34,34,33,32,31,31,30
        !byte 29,29,28,28,27,27,26,26,25,25,24,24,23,23,23,22,22,22,21,21,21,20,20,20
        !byte 20,19,19,19,19,18,18,18,18,17,17,17,17,17,16,16,16,16,16,15,15,15,15,15
        !byte 15,15,14,14,14,14,14,14,14,13,13,13,13,13,13,13,13,12,12,12,12,12,12,12
        !byte 12,12,12,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10
        !byte 10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8,8
        !byte 8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,7,7,7,7
        !byte 7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        !byte 7,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
        !byte 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
hLUTbT: !byte 6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
        !byte 5,5,5,5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        !byte 4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3
        !byte 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3
        !byte 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3
        !byte 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3
        !byte 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3
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
spreadLT: !byte 0,128,32,160,8,136,40,168,2,130,34,162,10,138,42,170
spreadRT: !byte 0,64,16,80,4,68,20,84,1,65,17,81,5,69,21,85
fromTopT: !byte 15,14,12,8
fromBotT: !byte 1,3,7,15
rowLoT: !byte 0,40,80,120,160,200,240,24,64,104,144,184,224,8,48,88,128,168,208,248,32,72,112,152,192
rowHiT: !byte 0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,2,2,3,3,3,3,3
bit1T:  !byte 1,2,4,8
colBitT: !byte 4,2,1
digGlyphT: !byte 7,5,5,5,7,2,6,2,2,7,7,1,7,4,7,7,1,7,1,7,5,5,7,1,1,7,4,7,1,7,7,4,7,5,7,7,1,2,2,2,7,5,7,5,7,7,5,7,1,7,2,5,7,5,5,6,5,6,5,6,7,4,4,4,7,6,5,5,5,6,7,4,6,4,7,7,4,6,4,4,5,5,2,5,5,5,5,2,2,2
flipT:  !byte 0,64,128,192,16,80,144,208,32,96,160,224,48,112,176,240,4,68,132,196,20,84,148,212
        !byte 36,100,164,228,52,116,180,244,8,72,136,200,24,88,152,216,40,104,168,232,56,120,184,248
        !byte 12,76,140,204,28,92,156,220,44,108,172,236,60,124,188,252,1,65,129,193,17,81,145,209
        !byte 33,97,161,225,49,113,177,241,5,69,133,197,21,85,149,213,37,101,165,229,53,117,181,245
        !byte 9,73,137,201,25,89,153,217,41,105,169,233,57,121,185,249,13,77,141,205,29,93,157,221
        !byte 45,109,173,237,61,125,189,253,2,66,130,194,18,82,146,210,34,98,162,226,50,114,178,242
        !byte 6,70,134,198,22,86,150,214,38,102,166,230,54,118,182,246,10,74,138,202,26,90,154,218
        !byte 42,106,170,234,58,122,186,250,14,78,142,206,30,94,158,222,46,110,174,238,62,126,190,254
        !byte 3,67,131,195,19,83,147,211,35,99,163,227,51,115,179,243,7,71,135,199,23,87,151,215
        !byte 39,103,167,231,55,119,183,247,11,75,139,203,27,91,155,219,43,107,171,235,59,123,187,251
        !byte 15,79,143,207,31,95,159,223,47,111,175,239,63,127,191,255
t1TabT: !byte 50,46,42,38,34,30,26,22,18,14,10,6,2
tbTabT: !byte 47,43,39,35,31,27,23,19,15,11,7,3,0
patTabT: !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8
        !byte 12,14,15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,8,12,14,15,15,15,15,15,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8
        !byte 12,14,15,15,15,15,15,15,15,15,15,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,8,12,14,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8
        !byte 12,14,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,8,12,14,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8
        !byte 12,14,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,8,12,14,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8
        !byte 12,14,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,8,12,14,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8
        !byte 12,14,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,0,0,0,0,0
        !byte 0,0,0,0,0,0,0,0,0,0,0,8,12,14,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,0,0,0,0,0,0,0,0,0,0,0,0,0
        !byte 0,6,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15
        !byte 15,15,15,0,0,0,0,0,0,0,0,0,0,0,0,0
; sideT / idT / colH are per-frame mutable arrays in scratch RAM at $c100+ (see equates)
dataEnd:                        ; guard: must clear both screen buffers AND the charset -- see the layout check in build-iray.mjs

        * = charset
        !byte 0,0,0,0,0,0,0,0,0,0,0,0,0,0,15,15,0,0,0,0,0,0,240,240,0,0,0,0,0,0,255,255
        !byte 0,0,0,0,15,15,0,0,0,0,0,0,15,15,15,15,0,0,0,0,15,15,240,240,0,0,0,0,15,15,255,255
        !byte 0,0,0,0,240,240,0,0,0,0,0,0,240,240,15,15,0,0,0,0,240,240,240,240,0,0,0,0,240,240,255,255
        !byte 0,0,0,0,255,255,0,0,0,0,0,0,255,255,15,15,0,0,0,0,255,255,240,240,0,0,0,0,255,255,255,255
        !byte 0,0,15,15,0,0,0,0,0,0,15,15,0,0,15,15,0,0,15,15,0,0,240,240,0,0,15,15,0,0,255,255
        !byte 0,0,15,15,15,15,0,0,0,0,15,15,15,15,15,15,0,0,15,15,15,15,240,240,0,0,15,15,15,15,255,255
        !byte 0,0,15,15,240,240,0,0,0,0,15,15,240,240,15,15,0,0,15,15,240,240,240,240,0,0,15,15,240,240,255,255
        !byte 0,0,15,15,255,255,0,0,0,0,15,15,255,255,15,15,0,0,15,15,255,255,240,240,0,0,15,15,255,255,255,255
        !byte 0,0,240,240,0,0,0,0,0,0,240,240,0,0,15,15,0,0,240,240,0,0,240,240,0,0,240,240,0,0,255,255
        !byte 0,0,240,240,15,15,0,0,0,0,240,240,15,15,15,15,0,0,240,240,15,15,240,240,0,0,240,240,15,15,255,255
        !byte 0,0,240,240,240,240,0,0,0,0,240,240,240,240,15,15,0,0,240,240,240,240,240,240,0,0,240,240,240,240,255,255
        !byte 0,0,240,240,255,255,0,0,0,0,240,240,255,255,15,15,0,0,240,240,255,255,240,240,0,0,240,240,255,255,255,255
        !byte 0,0,255,255,0,0,0,0,0,0,255,255,0,0,15,15,0,0,255,255,0,0,240,240,0,0,255,255,0,0,255,255
        !byte 0,0,255,255,15,15,0,0,0,0,255,255,15,15,15,15,0,0,255,255,15,15,240,240,0,0,255,255,15,15,255,255
        !byte 0,0,255,255,240,240,0,0,0,0,255,255,240,240,15,15,0,0,255,255,240,240,240,240,0,0,255,255,240,240,255,255
        !byte 0,0,255,255,255,255,0,0,0,0,255,255,255,255,15,15,0,0,255,255,255,255,240,240,0,0,255,255,255,255,255,255
        !byte 15,15,0,0,0,0,0,0,15,15,0,0,0,0,15,15,15,15,0,0,0,0,240,240,15,15,0,0,0,0,255,255
        !byte 15,15,0,0,15,15,0,0,15,15,0,0,15,15,15,15,15,15,0,0,15,15,240,240,15,15,0,0,15,15,255,255
        !byte 15,15,0,0,240,240,0,0,15,15,0,0,240,240,15,15,15,15,0,0,240,240,240,240,15,15,0,0,240,240,255,255
        !byte 15,15,0,0,255,255,0,0,15,15,0,0,255,255,15,15,15,15,0,0,255,255,240,240,15,15,0,0,255,255,255,255
        !byte 15,15,15,15,0,0,0,0,15,15,15,15,0,0,15,15,15,15,15,15,0,0,240,240,15,15,15,15,0,0,255,255
        !byte 15,15,15,15,15,15,0,0,15,15,15,15,15,15,15,15,15,15,15,15,15,15,240,240,15,15,15,15,15,15,255,255
        !byte 15,15,15,15,240,240,0,0,15,15,15,15,240,240,15,15,15,15,15,15,240,240,240,240,15,15,15,15,240,240,255,255
        !byte 15,15,15,15,255,255,0,0,15,15,15,15,255,255,15,15,15,15,15,15,255,255,240,240,15,15,15,15,255,255,255,255
        !byte 15,15,240,240,0,0,0,0,15,15,240,240,0,0,15,15,15,15,240,240,0,0,240,240,15,15,240,240,0,0,255,255
        !byte 15,15,240,240,15,15,0,0,15,15,240,240,15,15,15,15,15,15,240,240,15,15,240,240,15,15,240,240,15,15,255,255
        !byte 15,15,240,240,240,240,0,0,15,15,240,240,240,240,15,15,15,15,240,240,240,240,240,240,15,15,240,240,240,240,255,255
        !byte 15,15,240,240,255,255,0,0,15,15,240,240,255,255,15,15,15,15,240,240,255,255,240,240,15,15,240,240,255,255,255,255
        !byte 15,15,255,255,0,0,0,0,15,15,255,255,0,0,15,15,15,15,255,255,0,0,240,240,15,15,255,255,0,0,255,255
        !byte 15,15,255,255,15,15,0,0,15,15,255,255,15,15,15,15,15,15,255,255,15,15,240,240,15,15,255,255,15,15,255,255
        !byte 15,15,255,255,240,240,0,0,15,15,255,255,240,240,15,15,15,15,255,255,240,240,240,240,15,15,255,255,240,240,255,255
        !byte 15,15,255,255,255,255,0,0,15,15,255,255,255,255,15,15,15,15,255,255,255,255,240,240,15,15,255,255,255,255,255,255
        !byte 240,240,0,0,0,0,0,0,240,240,0,0,0,0,15,15,240,240,0,0,0,0,240,240,240,240,0,0,0,0,255,255
        !byte 240,240,0,0,15,15,0,0,240,240,0,0,15,15,15,15,240,240,0,0,15,15,240,240,240,240,0,0,15,15,255,255
        !byte 240,240,0,0,240,240,0,0,240,240,0,0,240,240,15,15,240,240,0,0,240,240,240,240,240,240,0,0,240,240,255,255
        !byte 240,240,0,0,255,255,0,0,240,240,0,0,255,255,15,15,240,240,0,0,255,255,240,240,240,240,0,0,255,255,255,255
        !byte 240,240,15,15,0,0,0,0,240,240,15,15,0,0,15,15,240,240,15,15,0,0,240,240,240,240,15,15,0,0,255,255
        !byte 240,240,15,15,15,15,0,0,240,240,15,15,15,15,15,15,240,240,15,15,15,15,240,240,240,240,15,15,15,15,255,255
        !byte 240,240,15,15,240,240,0,0,240,240,15,15,240,240,15,15,240,240,15,15,240,240,240,240,240,240,15,15,240,240,255,255
        !byte 240,240,15,15,255,255,0,0,240,240,15,15,255,255,15,15,240,240,15,15,255,255,240,240,240,240,15,15,255,255,255,255
        !byte 240,240,240,240,0,0,0,0,240,240,240,240,0,0,15,15,240,240,240,240,0,0,240,240,240,240,240,240,0,0,255,255
        !byte 240,240,240,240,15,15,0,0,240,240,240,240,15,15,15,15,240,240,240,240,15,15,240,240,240,240,240,240,15,15,255,255
        !byte 240,240,240,240,240,240,0,0,240,240,240,240,240,240,15,15,240,240,240,240,240,240,240,240,240,240,240,240,240,240,255,255
        !byte 240,240,240,240,255,255,0,0,240,240,240,240,255,255,15,15,240,240,240,240,255,255,240,240,240,240,240,240,255,255,255,255
        !byte 240,240,255,255,0,0,0,0,240,240,255,255,0,0,15,15,240,240,255,255,0,0,240,240,240,240,255,255,0,0,255,255
        !byte 240,240,255,255,15,15,0,0,240,240,255,255,15,15,15,15,240,240,255,255,15,15,240,240,240,240,255,255,15,15,255,255
        !byte 240,240,255,255,240,240,0,0,240,240,255,255,240,240,15,15,240,240,255,255,240,240,240,240,240,240,255,255,240,240,255,255
        !byte 240,240,255,255,255,255,0,0,240,240,255,255,255,255,15,15,240,240,255,255,255,255,240,240,240,240,255,255,255,255,255,255
        !byte 255,255,0,0,0,0,0,0,255,255,0,0,0,0,15,15,255,255,0,0,0,0,240,240,255,255,0,0,0,0,255,255
        !byte 255,255,0,0,15,15,0,0,255,255,0,0,15,15,15,15,255,255,0,0,15,15,240,240,255,255,0,0,15,15,255,255
        !byte 255,255,0,0,240,240,0,0,255,255,0,0,240,240,15,15,255,255,0,0,240,240,240,240,255,255,0,0,240,240,255,255
        !byte 255,255,0,0,255,255,0,0,255,255,0,0,255,255,15,15,255,255,0,0,255,255,240,240,255,255,0,0,255,255,255,255
        !byte 255,255,15,15,0,0,0,0,255,255,15,15,0,0,15,15,255,255,15,15,0,0,240,240,255,255,15,15,0,0,255,255
        !byte 255,255,15,15,15,15,0,0,255,255,15,15,15,15,15,15,255,255,15,15,15,15,240,240,255,255,15,15,15,15,255,255
        !byte 255,255,15,15,240,240,0,0,255,255,15,15,240,240,15,15,255,255,15,15,240,240,240,240,255,255,15,15,240,240,255,255
        !byte 255,255,15,15,255,255,0,0,255,255,15,15,255,255,15,15,255,255,15,15,255,255,240,240,255,255,15,15,255,255,255,255
        !byte 255,255,240,240,0,0,0,0,255,255,240,240,0,0,15,15,255,255,240,240,0,0,240,240,255,255,240,240,0,0,255,255
        !byte 255,255,240,240,15,15,0,0,255,255,240,240,15,15,15,15,255,255,240,240,15,15,240,240,255,255,240,240,15,15,255,255
        !byte 255,255,240,240,240,240,0,0,255,255,240,240,240,240,15,15,255,255,240,240,240,240,240,240,255,255,240,240,240,240,255,255
        !byte 255,255,240,240,255,255,0,0,255,255,240,240,255,255,15,15,255,255,240,240,255,255,240,240,255,255,240,240,255,255,255,255
        !byte 255,255,255,255,0,0,0,0,255,255,255,255,0,0,15,15,255,255,255,255,0,0,240,240,255,255,255,255,0,0,255,255
        !byte 255,255,255,255,15,15,0,0,255,255,255,255,15,15,15,15,255,255,255,255,15,15,240,240,255,255,255,255,15,15,255,255
        !byte 255,255,255,255,240,240,0,0,255,255,255,255,240,240,15,15,255,255,255,255,240,240,240,240,255,255,255,255,240,240,255,255
        !byte 255,255,255,255,255,255,0,0,255,255,255,255,255,255,15,15,255,255,255,255,255,255,240,240,255,255,255,255,255,255,255,255

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
