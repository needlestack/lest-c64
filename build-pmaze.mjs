// build-pmaze.mjs — hi-res BITMAP POLYGON maze renderer, double-buffered (bank flip).
// Wayout-style: project wall FACES as filled trapezoids, painter's (front-to-back w/
// coverage). Same 80x80 window / look / controls / fps as build-bmaze, but the raycast
// core is replaced by a vector pipeline:
//   per frame:  cos/sin -> Kc[k]=k*cos, Ks[k]=k*sin (accumulated) ; depthBias/latBias
//   per face:   back-face cull -> transform (table lookups, no mul) -> near-clip ->
//               perspective divide (recip LUT + 1 mul/corner) -> order L/R -> cull
//   raster:     sort near-first, per-column coverage, fill trapezoid, white seams
import { writeFileSync } from 'fs';
import { assemble } from './asm6502.mjs';
const NOFILL = !!process.env.NOFILL;   // profiling: skip vertical pixel fills
await import('./d64lib.js');
const D64 = globalThis.D64;
const chunk = (arr, per = 24, ind = '        ') => { const o = []; for (let i = 0; i < arr.length; i += per) o.push(ind + '!byte ' + Array.from(arr.slice(i, i + per)).join(',')); return o.join('\n'); };
const sByte = v => v & 255;              // 8-bit two's complement byte

const WIN = 80, CW0 = 15, CH0 = 7, CH = 10;   // window: 10x10 char cells, centered
const CENTER = 40, PROJX = 61.5, PROJH = 70, MIND = 16; // MIND in 8.8 cells (=0.0625)

const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r => r.split('').map(Number));
const map = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) map.push(M[y][x]);
const wall = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? 1 : M[y][x];

// ---- wall faces: endpoints (integer grid) + back-face cull test (axis/op/thr) ----
// axis: 0=compare px, 1=compare py.  op: 0 = visible if coord<thr, 1 = coord>thr.
// thr is an integer cell boundary -> thr(8.8) has lo=0, hi=cell.  We store thrHi only.
const fx0 = [], fy0 = [], fx1 = [], fy1 = [], faxis = [], fop = [], fthr = [];
for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 16; cx++) {
  if (!wall(cx, cy)) continue;
  const push = (x0, y0, x1, y1, axis, op, thr) => { fx0.push(x0); fy0.push(y0); fx1.push(x1); fy1.push(y1); faxis.push(axis); fop.push(op); fthr.push(thr); };
  if (!wall(cx, cy - 1)) push(cx, cy, cx + 1, cy, 1, 0, cy);       // north edge y=cy, vis if py<cy
  if (!wall(cx, cy + 1)) push(cx, cy + 1, cx + 1, cy + 1, 1, 1, cy + 1); // south, vis if py>cy+1
  if (!wall(cx - 1, cy)) push(cx, cy, cx, cy + 1, 0, 0, cx);       // west, vis if px<cx
  if (!wall(cx + 1, cy)) push(cx + 1, cy, cx + 1, cy + 1, 0, 1, cx + 1); // east, vis if px>cx+1
}
const NF = fx0.length;
if (NF > 255) throw new Error('too many faces: ' + NF);
const MAXD = 110;

// ---- LUTs ----
// cos/sin as signed 16-bit (8.8): value = round(256*trig), range -256..256
const cosLo = [], cosHi = [], sinLo = [], sinHi = [];
for (let a = 0; a < 256; a++) {
  const c = Math.round(256 * Math.cos(a / 256 * 2 * Math.PI)) & 0xffff;
  const s = Math.round(256 * Math.sin(a / 256 * 2 * Math.PI)) & 0xffff;
  cosLo.push(c & 255); cosHi.push((c >> 8) & 255);
  sinLo.push(s & 255); sinHi.push((s >> 8) & 255);
}
// depthU = depth(8.8) >> 4, in [1,255].  depth_cells = depthU/16.
// recipHalf[d] = 0.5*PROJH / (d/16) = 560/d, clamp [0,39]
// recipX[d]    = PROJX*16*256 / (256*d) = 984/d, clamp [0,255]  (sx = 40 + (lat8.8*recipX)>>8)
const recipHalf = [0], recipX = [0];
for (let d = 1; d < 256; d++) {
  recipHalf.push(Math.max(0, Math.min(39, Math.round(0.5 * PROJH * 16 / d))));
  recipX.push(Math.max(0, Math.min(255, Math.round(PROJX * 16 / d))));
}
// movement step per angle (20/256 cell)
const moveX = [], moveY = [];
for (let a = 0; a < 256; a++) { moveX.push(Math.round(Math.cos(a / 256 * 2 * Math.PI) * 20) & 255); moveY.push(Math.round(Math.sin(a / 256 * 2 * Math.PI) * 20) & 255); }
// quarter-square tables f(n)=floor(n^2/4)
const f0Lo = [], f0Hi = [], f1Lo = [], f1Hi = [];
for (let i = 0; i < 256; i++) { const v = Math.floor(i * i / 4); f0Lo.push(v & 255); f0Hi.push((v >> 8) & 255); }
for (let i = 256; i < 512; i++) { const v = Math.floor(i * i / 4); f1Lo.push(v & 255); f1Hi.push((v >> 8) & 255); }
// 8x8 digit glyphs 0-9
const digits = [
 [0x3C,0x66,0x6E,0x76,0x66,0x66,0x3C,0x00],[0x18,0x38,0x18,0x18,0x18,0x18,0x7E,0x00],
 [0x3C,0x66,0x06,0x0C,0x30,0x60,0x7E,0x00],[0x3C,0x66,0x06,0x1C,0x06,0x66,0x3C,0x00],
 [0x0C,0x1C,0x3C,0x6C,0x7E,0x0C,0x0C,0x00],[0x7E,0x60,0x7C,0x06,0x06,0x66,0x3C,0x00],
 [0x3C,0x66,0x60,0x7C,0x66,0x66,0x3C,0x00],[0x7E,0x66,0x0C,0x18,0x18,0x18,0x18,0x00],
 [0x3C,0x66,0x66,0x3C,0x66,0x66,0x3C,0x00],[0x3C,0x66,0x66,0x3E,0x06,0x66,0x3C,0x00],
];
const digFont = digits.flat();
// bitmap window plot tables (offset relative to a bitmap base page)
const winRowLo = [], winRowHi = [];
for (let wy = 0; wy < WIN; wy++) { const v = (CH0 + (wy >> 3)) * 320 + (wy & 7); winRowLo.push(v & 255); winRowHi.push(v >> 8); }
const winColByte = [], winBit = [];
for (let wx = 0; wx < WIN; wx++) { winColByte.push((CW0 + (wx >> 3)) * 8); winBit.push(1 << (7 - (wx & 7))); }
const winClrLo = [], winClrHi = [];
for (let cr = 0; cr < CH; cr++) { const v = (CH0 + cr) * 320 + CW0 * 8; winClrLo.push(v & 255); winClrHi.push(v >> 8); }

const asm = `
; ---- zero page ----
px=$02
py=$04
pa=$06
baseHi=$07
cosL=$08
cosH=$09
sinL=$0a
sinH=$0b
dbL=$0c
dbH=$0d
lbL=$0e
lbH=$0f
adL=$10
adH=$11
alL=$12
alH=$13
bdL=$14
bdH=$15
blL=$16
blH=$17
duA=$18
duB=$19
halfA=$1a
halfB=$1b
sxAL=$1c
sxAH=$1d
sxBL=$1e
sxBH=$1f
ptr=$20
xL=$22
xH=$23
haL=$24
haH=$25
hsL=$26
hsH=$27
LxL=$28
LxH=$29
RxL=$2a
RxH=$2b
Lhf=$2c
Rhf=$2d
colByte=$2e
xbit=$2f
cyv=$30
wtop=$31
wbot=$32
hh=$33
tmp=$34
tmp2=$35
tmp3=$36
fidx=$37
wx0=$38
wy0=$39
wx1=$3a
wy1=$3b
sgn=$3c
ndraw=$3d
si=$3e
sj=$3f
qa=$40
qb=$41
qlo=$42
qhi=$43
fr=$44
mlo=$45
mhi=$46
r1=$47
r2=$48
kacc=$49
kaccH=$4a
kk=$4b
keyv=$4c
dxv=$4d
dyv=$4e
nxL=$4f
nxH=$50
nyL=$51
nyH=$52
divN=$53
divNH=$54
divD=$55
divDH=$56
divR=$57
divRH=$58
mAl=$70
mAh=$71
mBl=$72
mBh=$73
oL=$74
oH=$75
ss0=$77
ss1=$78
ss2=$79
ss3=$7a
pr0=$7b
pr1=$7c
pr2=$7d
pr3=$7e
frameCnt=$60
lastFrame=$62
renderCnt=$64
fpsTens=$65
fpsOnes=$66
fpsv=$67
deltaL=$68
deltaH=$69
remL=$6a
remH=$6b

; ---- scratch arrays in free RAM (not emitted) ----
colDone=$c000
KcLo=$c060
KcHi=$c080
KsLo=$c0a0
KsHi=$c0c0
idx=$c100
drLxL=$c180
drLxH=$c200
drRxL=$c280
drRxH=$c300
drLhf=$c380
drRhf=$c400
drKey=$c480

        * = $0801
        !byte $0c,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
entry:
        sei
        lda #$36                ; LORAM=0: bank BASIC out so $a000-$bfff reads as RAM
        sta $01                 ; (KERNAL still in for IRQ, I/O still visible)
        lda #$00
        sta $d01a
        lda #$3b
        sta $d011
        lda #$08
        sta $d016
        lda #$18
        sta $d018
        lda #$00
        sta $d020
        lda $dd02
        ora #$03
        sta $dd02
        lda $dd00
        and #$fc
        ora #$02
        sta $dd00               ; show bank1 (buffer A, bitmap $6000)
        lda #$ff
        sta $dc02
        lda #$00
        sta $dc03
        ; screen matrices A ($4400) / B ($8400) = $01 (fg black, bg white)
        lda #$01
        ldx #$00
smf:    sta $4400,x
        sta $4500,x
        sta $4600,x
        sta $4700,x
        sta $8400,x
        sta $8500,x
        sta $8600,x
        sta $8700,x
        inx
        bne smf
        ; clear both bitmaps: A $6000-$7fff, B $a000-$bfff
        lda #$00
        sta ptr
        lda #$60
        sta ptr+1
        ldx #$20
        ldy #$00
        lda #$00
cba:    sta (ptr),y
        iny
        bne cba
        inc ptr+1
        dex
        bne cba
        lda #$00
        sta ptr
        lda #$a0
        sta ptr+1
        ldx #$20
        ldy #$00
        lda #$00
cbb:    sta (ptr),y
        iny
        bne cbb
        inc ptr+1
        dex
        bne cbb
        ; raster IRQ frame counter
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
        ; player start (2.5,2.5) facing +x
        lda #$80
        sta px
        lda #$02
        sta px+1
        lda #$80
        sta py
        lda #$02
        sta py+1
        lda #$00
        sta pa
        lda #$a0
        sta baseHi              ; render into B (hidden, bitmap $a000)
        cli

mloop:  jsr readInput
        jsr frameSetup
        jsr clearWin
        jsr clearCols
        jsr buildDraws
        jsr sortDraws
        jsr raster
        jsr drawFps
        inc renderCnt
        lda renderCnt
        cmp #32
        bcc noFps
        jsr computeFps
        lda #$00
        sta renderCnt
noFps:
wv:     lda $d012
        cmp #250
        bne wv
        lda baseHi
        cmp #$60
        bne shB
        ; just rendered A ($6000) -> show bank1 (%10)
        lda $dd00
        and #$fc
        ora #$02
        sta $dd00
        lda #$a0
        sta baseHi
        jmp mloop
shB:    ; just rendered B ($a000) -> show bank2 (%01)
        lda $dd00
        and #$fc
        ora #$01
        sta $dd00
        lda #$60
        sta baseHi
        jmp mloop

; ================= per-frame setup =================
frameSetup:
        ldx pa
        lda cosLoT,x
        sta cosL
        lda cosHiT,x
        sta cosH
        lda sinLoT,x
        sta sinL
        lda sinHiT,x
        sta sinH
        ; Kc[0]=0, Ks[0]=0 ; accumulate
        lda #$00
        sta KcLo
        sta KcHi
        sta KsLo
        sta KsHi
        sta kacc                ; Kc accumulator lo
        sta kaccH
        ldx #$00                ; index into Kc (0..15 -> writes 1..16)
kcbld:  clc
        lda kacc
        adc cosL
        sta kacc
        lda kaccH
        adc cosH
        sta kaccH
        lda kacc
        sta KcLo+1,x
        lda kaccH
        sta KcHi+1,x
        inx
        cpx #16
        bne kcbld
        lda #$00
        sta kacc
        sta kaccH
        ldx #$00
ksbld:  clc
        lda kacc
        adc sinL
        sta kacc
        lda kaccH
        adc sinH
        sta kaccH
        lda kacc
        sta KsLo+1,x
        lda kaccH
        sta KsHi+1,x
        inx
        cpx #16
        bne ksbld
        ; dbias = px*cos + py*sin
        lda px
        sta mAl
        lda px+1
        sta mAh
        lda cosL
        sta mBl
        lda cosH
        sta mBh
        jsr smul
        lda oL
        sta dbL
        lda oH
        sta dbH
        lda py
        sta mAl
        lda py+1
        sta mAh
        lda sinL
        sta mBl
        lda sinH
        sta mBh
        jsr smul
        clc
        lda dbL
        adc oL
        sta dbL
        lda dbH
        adc oH
        sta dbH
        ; lbias = py*cos - px*sin
        lda py
        sta mAl
        lda py+1
        sta mAh
        lda cosL
        sta mBl
        lda cosH
        sta mBh
        jsr smul
        lda oL
        sta lbL
        lda oH
        sta lbH
        lda px
        sta mAl
        lda px+1
        sta mAh
        lda sinL
        sta mBl
        lda sinH
        sta mBh
        jsr smul
        sec
        lda lbL
        sbc oL
        sta lbL
        lda lbH
        sbc oH
        sta lbH
        rts

; ================= build draw list =================
buildDraws:
        lda #$00
        sta ndraw
        sta fidx
bdloop:
        ; ---- back-face cull ----
        ldx fidx
        lda faxisT,x
        beq bfx
        ; axis = Y : compare py vs thr
        lda py
        sta tmp
        lda py+1
        sta tmp2
        jmp bfcmp
bfx:    lda px
        sta tmp
        lda px+1
        sta tmp2
bfcmp:  ldx fidx
        lda fthrT,x             ; thr hi (thr lo = 0)
        sta tmp3
        lda fopT,x
        bne bfgt
        ; op LT: visible if (tmp2:tmp) < (tmp3:00)
        lda tmp
        cmp #$00
        lda tmp2
        sbc tmp3
        bcc bfvis              ; coord < thr
        jmp bfnext
bfgt:   ; op GT: visible if (tmp3:00) < (tmp2:tmp)
        lda #$00
        cmp tmp
        lda tmp3
        sbc tmp2
        bcc bfvis
        jmp bfnext
bfvis:
        ; ---- fetch endpoints ----
        ldx fidx
        lda fx0T,x
        sta wx0
        lda fy0T,x
        sta wy0
        lda fx1T,x
        sta wx1
        lda fy1T,x
        sta wy1
        ; ad = Kc[wx0] + Ks[wy0] - dbias
        ldx wy0
        lda KsLo,x
        sta tmp
        lda KsHi,x
        sta tmp2
        ldx wx0
        clc
        lda KcLo,x
        adc tmp
        sta adL
        lda KcHi,x
        adc tmp2
        sta adH
        sec
        lda adL
        sbc dbL
        sta adL
        lda adH
        sbc dbH
        sta adH
        ; al = Kc[wy0] - Ks[wx0] - lbias
        ldx wx0
        lda KsLo,x
        sta tmp
        lda KsHi,x
        sta tmp2
        ldx wy0
        sec
        lda KcLo,x
        sbc tmp
        sta alL
        lda KcHi,x
        sbc tmp2
        sta alH
        sec
        lda alL
        sbc lbL
        sta alL
        lda alH
        sbc lbH
        sta alH
        ; bd = Kc[wx1] + Ks[wy1] - dbias
        ldx wy1
        lda KsLo,x
        sta tmp
        lda KsHi,x
        sta tmp2
        ldx wx1
        clc
        lda KcLo,x
        adc tmp
        sta bdL
        lda KcHi,x
        adc tmp2
        sta bdH
        sec
        lda bdL
        sbc dbL
        sta bdL
        lda bdH
        sbc dbH
        sta bdH
        ; bl = Kc[wy1] - Ks[wx1] - lbias
        ldx wx1
        lda KsLo,x
        sta tmp
        lda KsHi,x
        sta tmp2
        ldx wy1
        sec
        lda KcLo,x
        sbc tmp
        sta blL
        lda KcHi,x
        sbc tmp2
        sta blH
        sec
        lda blL
        sbc lbL
        sta blL
        lda blH
        sbc lbH
        sta blH
        ; ---- near clip (MIND) ----
        ; behindA = ad < MIND ; behindB = bd < MIND
        lda adL
        cmp #${MIND}
        lda adH
        sbc #$00
        bpl aok0                ; ad >= MIND
        ; A behind
        lda bdL
        cmp #${MIND}
        lda bdH
        sbc #$00
        bmi bdrop               ; both behind -> skip
        jsr clipA
        jmp aok1
bdrop:  jmp bfnext
aok0:   lda bdL
        cmp #${MIND}
        lda bdH
        sbc #$00
        bpl aok1                ; bd >= MIND, no clip
        jsr clipB
aok1:
        ; ---- project A ----
        lda adL
        sta divN
        lda adH
        sta divNH
        jsr depthU
        sta duA
        tax
        lda recipHalfT,x
        sta halfA
        lda alL
        sta mlo
        lda alH
        sta mhi
        ldx duA
        lda recipXT,x
        sta fr
        jsr projSx
        lda oL
        sta sxAL
        lda oH
        sta sxAH
        ; ---- project B ----
        lda bdL
        sta divN
        lda bdH
        sta divNH
        jsr depthU
        sta duB
        tax
        lda recipHalfT,x
        sta halfB
        lda blL
        sta mlo
        lda blH
        sta mhi
        ldx duB
        lda recipXT,x
        sta fr
        jsr projSx
        lda oL
        sta sxBL
        lda oH
        sta sxBH
        ; ---- order L/R by sx (signed 16 compare sxA<=sxB ?) ----
        sec
        lda sxAL
        sbc sxBL
        lda sxAH
        sbc sxBH
        bvc lr1
        eor #$80
lr1:    bmi aLeft               ; sxA < sxB -> A is left
        ; B is left
        lda sxBL
        sta LxL
        lda sxBH
        sta LxH
        lda halfB
        sta Lhf
        lda sxAL
        sta RxL
        lda sxAH
        sta RxH
        lda halfA
        sta Rhf
        jmp lrdone
aLeft:  lda sxAL
        sta LxL
        lda sxAH
        sta LxH
        lda halfA
        sta Lhf
        lda sxBL
        sta RxL
        lda sxBH
        sta RxH
        lda halfB
        sta Rhf
lrdone:
        ; ---- off-screen cull: skip if Rx<0 or Lx>79 ----
        lda RxH
        bmi bfnext              ; Rx < 0
        lda LxH
        bmi lokL                ; Lx < 0 -> on screen left
        bne bfnext              ; Lx >= 256
        lda LxL
        cmp #${WIN}
        bcs bfnext              ; Lx >= 80
lokL:
        ; ---- store draw ----
        ldx ndraw
        cpx #${MAXD}
        bcs bfnext
        lda LxL
        sta drLxL,x
        lda LxH
        sta drLxH,x
        lda RxL
        sta drRxL,x
        lda RxH
        sta drRxH,x
        lda Lhf
        sta drLhf,x
        lda Rhf
        sta drRhf,x
        ; key = min(duA,duB)
        lda duA
        cmp duB
        bcc kA
        lda duB
kA:     sta drKey,x
        txa
        sta idx,x
        inc ndraw
bfnext:
        inc fidx
        lda fidx
        cmp #${NF}
        bcs bddone
        jmp bdloop
bddone: rts

; clip endpoint A to near plane (ad<MIND<bd): al += (bl-al)*t ; ad=MIND
;   t = (MIND-ad)/(bd-ad)  in .8
clipA:
        sec
        lda #${MIND}
        sbc adL
        sta divN
        lda #$00
        sbc adH
        sta divNH               ; num = MIND-ad
        sec
        lda bdL
        sbc adL
        sta divD
        lda bdH
        sbc adH
        sta divDH               ; den = bd-ad
        jsr divfrac             ; -> tmp = t(.8)
        ; dlat = bl-al (signed) ; al += (dlat*t)>>8
        sec
        lda blL
        sbc alL
        sta mlo
        lda blH
        sbc alH
        sta mhi
        lda tmp
        sta fr
        jsr smulFrac            ; oL/oH = sign*(|m|*t)>>8
        clc
        lda alL
        adc oL
        sta alL
        lda alH
        adc oH
        sta alH
        lda #${MIND}
        sta adL
        lda #$00
        sta adH
        rts
clipB:
        sec
        lda #${MIND}
        sbc bdL
        sta divN
        lda #$00
        sbc bdH
        sta divNH
        sec
        lda adL
        sbc bdL
        sta divD
        lda adH
        sbc bdH
        sta divDH
        jsr divfrac
        sec
        lda alL
        sbc blL
        sta mlo
        lda alH
        sbc blH
        sta mhi
        lda tmp
        sta fr
        jsr smulFrac
        clc
        lda blL
        adc oL
        sta blL
        lda blH
        adc oH
        sta blH
        lda #${MIND}
        sta bdL
        lda #$00
        sta bdH
        rts

; depthU: (divNH:divN) >>4, clamp [1,255] -> A
depthU:
        lda divNH
        cmp #16
        bcc dush
        lda #255
        rts
dush:   lda divN
        lsr
        lsr
        lsr
        lsr
        sta tmp
        lda divNH
        asl
        asl
        asl
        asl
        ora tmp
        bne dunz
        lda #1
dunz:   rts

; projSx: oL/oH = CENTER + sign(mhi:mlo) * (fr * |mhi:mlo|)>>8, clamped to [-100,180]
projSx:
        jsr smulFrac            ; oL/oH = signed (fr*m)>>8
        clc
        lda oL
        adc #${CENTER}
        sta oL
        lda oH
        adc #$00
        sta oH
        ; clamp signed (oH:oL) into [-100,180] so raster loop stays bounded
        lda oH
        bmi csneg
        bne csmax
        lda oL
        cmp #181
        bcc csok
csmax:  lda #180
        sta oL
        lda #$00
        sta oH
        rts
csneg:  clc
        lda oL
        adc #100
        lda oH
        adc #$00
        bmi csmin
        rts
csmin:  lda #$9c
        sta oL
        lda #$ff
        sta oH
csok:   rts

; smulFrac: (mhi:mlo signed) * (fr unsigned 8) >>8 -> oL/oH signed
smulFrac:
        lda mhi
        bpl smfpos
        lda #$01
        sta sgn
        sec
        lda #$00
        sbc mlo
        sta mlo
        lda #$00
        sbc mhi
        sta mhi
        jmp smfdo
smfpos: lda #$00
        sta sgn
smfdo:  jsr sideMul             ; r2:r1 = (fr*mhi:mlo)>>8
        lda r1
        sta oL
        lda r2
        sta oH
        lda sgn
        beq smfd2
        sec
        lda #$00
        sbc oL
        sta oL
        lda #$00
        sbc oH
        sta oH
smfd2:  rts

; ================= sort draws ascending by key (insertion) =================
sortDraws:
        lda ndraw
        cmp #$02
        bcc sdone
        lda #$01
        sta si
sout:   lda si
        cmp ndraw
        bcs sdone
        ldx si
        lda idx,x
        sta tmp                 ; value to insert
        tay
        lda drKey,y
        sta keyv
        lda si
        sta sj
sin:    lda sj
        beq sput
        tax
        dex                     ; sj-1
        lda idx,x
        tay
        lda drKey,y
        cmp keyv
        bcc sput                ; key[sj-1] < keyv -> place
        ; shift up
        lda idx,x
        ldy sj
        sta idx,y
        dec sj
        jmp sin
sput:   ldx sj
        lda tmp
        sta idx,x
        inc si
        jmp sout
sdone:  rts

; ================= rasterize (front-to-back, coverage) =================
raster:
        lda #$00
        sta si
rloop:  lda si
        cmp ndraw
        bcs rdone
        ldx si
        lda idx,x
        tax                     ; draw index
        lda drLxL,x
        sta LxL
        lda drLxH,x
        sta LxH
        lda drRxL,x
        sta RxL
        lda drRxH,x
        sta RxH
        lda drLhf,x
        sta Lhf
        lda drRhf,x
        sta Rhf
        jsr drawTrap
        inc si
        jmp rloop
rdone:  rts

drawTrap:
        ; span = Rx-Lx (>=0) ; if 0 ->1
        sec
        lda RxL
        sbc LxL
        sta divD
        lda RxH
        sbc LxH
        sta divDH
        lda divD
        ora divDH
        bne spok
        lda #$01
        sta divD
spok:
        ; halfStep = (Rhf-Lhf)*256 / span   (signed)
        sec
        lda Rhf
        sbc Lhf
        sta tmp                 ; dhalf (signed byte)
        bpl hspos
        lda #$01
        sta sgn
        sec
        lda #$00
        sbc tmp
        sta tmp
        jmp hsdiv
hspos:  lda #$00
        sta sgn
hsdiv:  lda #$00
        sta divN                ; num = |dhalf|<<8
        lda tmp
        sta divNH
        jsr udiv16              ; quotient -> divN/divNH
        lda divN
        sta hsL
        lda divNH
        sta hsH
        lda sgn
        beq hsp2
        sec
        lda #$00
        sbc hsL
        sta hsL
        lda #$00
        sbc hsH
        sta hsH
hsp2:
        ; halfAcc = Lhf (8.8) ; x = Lx
        lda #$00
        sta haL
        lda Lhf
        sta haH
        lda LxL
        sta xL
        lda LxH
        sta xH
dtcol:
        ; done when x > Rx (signed)
        sec
        lda RxL
        sbc xL
        lda RxH
        sbc xH
        bvc dt0
        eor #$80
dt0:    bmi dtend               ; Rx < x
        ; on-screen? 0<=x<=79
        lda xH
        bmi dtadv               ; x<0
        bne dtend               ; x>=256
        lda xL
        cmp #${WIN}
        bcs dtend               ; x>=80
        ; covered already?
        ldx xL
        lda colDone,x
        bne dtadv
        lda #$01
        sta colDone,x
        ; seam? x==Lx or x==Rx -> leave white (still covered)
        lda xL
        cmp LxL
        bne dtnl
        lda xH
        cmp LxH
        beq dtadv
dtnl:   lda xL
        cmp RxL
        bne dtfill
        lda xH
        cmp RxH
        beq dtadv
dtfill:
${NOFILL ? '        jmp dtadv' : ''}
        ; half = haH, clamp >=0 (haH>=0 normally)
        lda haH
        bpl hhok
        lda #$00
hhok:   sta hh
        ; wtop = 40-half ; wbot = 40+half
        lda #${CENTER}
        sec
        sbc hh
        bpl wtok
        lda #$00
wtok:   sta wtop
        lda #${CENTER}
        clc
        adc hh
        cmp #${WIN}
        bcc wbok
        lda #${WIN - 1}
wbok:   sta wbot
        ldx xL
        lda winColByteT,x
        sta colByte
        lda winBitT,x
        sta xbit
        lda wtop
        sta cyv
vfl:    ldx cyv
        clc
        lda winRowLoT,x
        adc colByte
        sta ptr
        lda winRowHiT,x
        adc baseHi
        sta ptr+1
        ldy #$00
        lda (ptr),y
        ora xbit
        sta (ptr),y
        inc cyv
        lda cyv
        cmp wbot
        bcc vfl
        beq vfl
dtadv:
        clc
        lda haL
        adc hsL
        sta haL
        lda haH
        adc hsH
        sta haH
        inc xL
        bne dtc2
        inc xH
dtc2:   jmp dtcol
dtend:  rts

; ================= clear coverage flags (80 bytes) =================
clearCols:
        ldx #${WIN - 1}
        lda #$00
ccl:    sta colDone,x
        dex
        bpl ccl
        rts

; ================= clear the 80x80 window of hidden bitmap =================
clearWin:
        ldx #$00
cwr:    lda winClrLoT,x
        sta ptr
        lda winClrHiT,x
        clc
        adc baseHi
        sta ptr+1
        ldy #79
        lda #$00
cwb:    sta (ptr),y
        dey
        bpl cwb
        inx
        cpx #${CH}
        bne cwr
        rts

; ================= input: ESDF strafe/move + joy1 rotate =================
readInput:
        lda #$fd
        sta $dc00
        lda $dc01
        and #$40
        bne inE
        jsr moveFwd
inE:    lda $dc01
        and #$20
        bne inS
        jsr strafeL
inS:    lda #$fb
        sta $dc00
        lda $dc01
        and #$04
        bne inD
        jsr moveBack
inD:    lda $dc01
        and #$20
        bne inF
        jsr strafeR
inF:    lda #$ff
        sta $dc00
        lda $dc01
        sta tmp
        and #$04
        bne inJL
        lda pa
        sec
        sbc #$02
        sta pa
inJL:   lda tmp
        and #$08
        bne inJR
        lda pa
        clc
        adc #$02
        sta pa
inJR:   rts

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

; ================= math helpers =================
; sideMul: fr(8) * (mhi:mlo)(16) >>8 -> r2:r1  (unsigned, quarter-square)
sideMul:
        lda fr
        sta qa
        lda mhi
        sta qb
        jsr mul8
        lda qlo
        sta r1
        lda qhi
        sta r2
        lda fr
        sta qa
        lda mlo
        sta qb
        jsr mul8
        clc
        lda r1
        adc qhi
        sta r1
        lda r2
        adc #$00
        sta r2
        rts
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

; smul: (mAh:mAl unsigned) * (mBh:mBl signed) >>8 -> oL/oH signed
smul:
        lda mBh
        bpl smpos
        lda #$01
        sta sgn
        sec
        lda #$00
        sbc mBl
        sta mBl
        lda #$00
        sbc mBh
        sta mBh
        jmp smgo
smpos:  lda #$00
        sta sgn
smgo:   lda #$00
        sta pr0
        sta pr1
        sta pr2
        sta pr3
        lda mAl
        sta ss0
        lda mAh
        sta ss1
        lda #$00
        sta ss2
        sta ss3
        ldx #16
smlp:   lsr mBh
        ror mBl
        bcc smsk
        clc
        lda pr0
        adc ss0
        sta pr0
        lda pr1
        adc ss1
        sta pr1
        lda pr2
        adc ss2
        sta pr2
        lda pr3
        adc ss3
        sta pr3
smsk:   asl ss0
        rol ss1
        rol ss2
        rol ss3
        dex
        bne smlp
        lda pr1
        sta oL
        lda pr2
        sta oH
        lda sgn
        beq smd
        sec
        lda #$00
        sbc oL
        sta oL
        lda #$00
        sbc oH
        sta oH
smd:    rts

; udiv16: (divNH:divN) / (divDH:divD) -> quotient in divN/divNH ; rem trashed
udiv16:
        lda #$00
        sta divR
        sta divRH
        ldx #16
udl:    asl divN
        rol divNH
        rol divR
        rol divRH
        sec
        lda divR
        sbc divD
        sta tmp
        lda divRH
        sbc divDH
        bcc udno
        sta divRH
        lda tmp
        sta divR
        inc divN
udno:   dex
        bne udl
        rts

; divfrac: t(.8) = (divNH:divN)*256 / (divDH:divD), assumes 0<num<den -> tmp
;   rem=num; 8x: rem<<=1; if rem>=den {rem-=den; q=q<<1|1} else q=q<<1|0
divfrac:
        lda divN
        sta divR
        lda divNH
        sta divRH
        lda #$00
        sta tmp                 ; quotient
        ldx #8
dfl:    asl divR
        rol divRH
        sec
        lda divR
        sbc divD
        sta tmp2
        lda divRH
        sbc divDH
        bcc dfno
        sta divRH
        lda tmp2
        sta divR
        sec
        rol tmp                 ; q = q<<1 | 1
        jmp dfnx
dfno:   clc
        rol tmp                 ; q = q<<1 | 0
dfnx:   dex
        bne dfl
        rts

; ---- raster IRQ ----
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

; ---- fps = 1920 / (frames per 32 renders) ----
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
cf1:    lda #$80
        sta remL
        lda #$07
        sta remH
        lda #$00
        sta fpsv
cfdiv:  sec
        lda remL
        sbc deltaL
        tax
        lda remH
        sbc deltaH
        bcc cfdd
        stx remL
        sta remH
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

; ---- blit fps digits into hidden bitmap bottom-right ----
drawFps:
        lda #$28
        sta ptr
        lda #$1f
        clc
        adc baseHi
        sta ptr+1
        lda fpsTens
        jsr blitDig
        lda #$30
        sta ptr
        lda #$1f
        clc
        adc baseHi
        sta ptr+1
        lda fpsOnes
        jsr blitDig
        rts
blitDig:
        asl
        asl
        asl
        tax
        ldy #$00
bdl:    lda digFontT,x
        sta (ptr),y
        inx
        iny
        cpy #$08
        bne bdl
        rts

; ================= data (contiguous after code) =================
digFontT: !byte ${digFont.join(',')}
mapT:   ${chunk(map, 16).trim()}
cosLoT: ${chunk(cosLo).trim()}
cosHiT: ${chunk(cosHi).trim()}
sinLoT: ${chunk(sinLo).trim()}
sinHiT: ${chunk(sinHi).trim()}
recipHalfT: ${chunk(recipHalf).trim()}
recipXT: ${chunk(recipX).trim()}
moveXT: ${chunk(moveX).trim()}
moveYT: ${chunk(moveY).trim()}
winRowLoT: !byte ${winRowLo.join(',')}
winRowHiT: !byte ${winRowHi.join(',')}
winColByteT: !byte ${winColByte.join(',')}
winBitT: !byte ${winBit.join(',')}
winClrLoT: !byte ${winClrLo.join(',')}
winClrHiT: !byte ${winClrHi.join(',')}
f0LoT:  ${chunk(f0Lo).trim()}
f0HiT:  ${chunk(f0Hi).trim()}
f1LoT:  ${chunk(f1Lo).trim()}
f1HiT:  ${chunk(f1Hi).trim()}
fx0T:   ${chunk(fx0, 24).trim()}
fy0T:   ${chunk(fy0, 24).trim()}
fx1T:   ${chunk(fx1, 24).trim()}
fy1T:   ${chunk(fy1, 24).trim()}
faxisT: ${chunk(faxis, 24).trim()}
fopT:   ${chunk(fop, 24).trim()}
fthrT:  ${chunk(fthr, 24).trim()}
`;

writeFileSync('./pmaze.asm', asm);
try {
  const r = assemble(asm);
  writeFileSync('./pmaze.prg', Buffer.from(r.prg));
  const d = D64.createEmpty('PMAZE', '01');
  d.writeFile('PMAZE'.padEnd(6) + '/PRG', r.prg, D64.FILE_TYPE_PRG);
  writeFileSync('./pmaze.d64', Buffer.from(d.getData()));
  console.log(`ok: NF=${NF} org=$${r.org.toString(16)} end=$${r.end.toString(16)} bytes=${r.bytes.length}`);
} catch (e) {
  console.error('ASM ERROR:', e.message);
  process.exit(1);
}
