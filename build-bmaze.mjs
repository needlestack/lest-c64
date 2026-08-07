// build-bmaze.mjs — hi-res BITMAP raycaster, double-buffered via bank flip.
// 40x40-pixel window (true pixels), rest blank white. Two bitmaps:
//   buffer A = bank0 bitmap $2000 / screen $0400
//   buffer B = bank1 bitmap $6000 / screen $4400
// Render into hidden buffer, flip $DD00 in vblank. 8-bit DDA + quarter-square mul.
// Controls: E fwd / D back, S/F strafe, joystick-1 left/right = rotate.
import { writeFileSync } from 'fs';
import { assemble } from './asm6502.mjs';
await import('./d64lib.js');
const D64 = globalThis.D64;
const chunk = (arr, per = 24, ind = '        ') => { const o = []; for (let i = 0; i < arr.length; i += per) o.push(ind + '!byte ' + Array.from(arr.slice(i, i + per)).join(',')); return o.join('\n'); };

const WIN = 80, CW = 10, CH = 10;
const CW0 = 15, CH0 = 7;             // window top-left cell (centered)

const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r => r.split('').map(Number));
const map = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) map.push(M[y][x]);

// 16-bit fixed point: 256 units = 1 cell (8.8). deltaDist = 256/|dir| clamp 65535.
const ddxLo = [], ddxHi = [], ddyLo = [], ddyHi = [], posX = [], posY = [];
for (let a = 0; a < 256; a++) {
  const cx = Math.cos(a / 256 * 2 * Math.PI), sy = Math.sin(a / 256 * 2 * Math.PI);
  const dx = Math.min(65535, Math.round(256 / Math.max(1e-3, Math.abs(cx))));
  const dy = Math.min(65535, Math.round(256 / Math.max(1e-3, Math.abs(sy))));
  ddxLo.push(dx & 255); ddxHi.push(dx >> 8); ddyLo.push(dy & 255); ddyHi.push(dy >> 8);
  posX.push(cx >= 0 ? 1 : 0); posY.push(sy >= 0 ? 1 : 0);
}
const FOV = 47;
const colOff = []; for (let c = 0; c < WIN; c++) colOff.push(Math.round((c - (WIN - 1) / 2) * FOV / (WIN - 1)) & 255);
// height LUT indexed by perpDist>>4 (perpDist 16-bit, 8.8 cells): height = 72*256/perp
const hLUT = []; for (let i = 0; i < 256; i++) { const pd = i * 16 + 8; let h = Math.round(18432 / pd); h = Math.max(0, Math.min(WIN - 2, h)); hLUT.push(h); }
const moveX = [], moveY = [];
for (let a = 0; a < 256; a++) { moveX.push(Math.round(Math.cos(a / 256 * 2 * Math.PI) * 20) & 255); moveY.push(Math.round(Math.sin(a / 256 * 2 * Math.PI) * 20) & 255); }
const f0Lo = [], f0Hi = [], f1Lo = [], f1Hi = [];
for (let i = 0; i < 256; i++) { const v = Math.floor(i * i / 4); f0Lo.push(v & 255); f0Hi.push((v >> 8) & 255); }
for (let i = 256; i < 512; i++) { const v = Math.floor(i * i / 4); f1Lo.push(v & 255); f1Hi.push((v >> 8) & 255); }
// 8x8 digit glyphs 0-9 for the fps readout (bit set = black pixel)
const digits = [
 [0x3C,0x66,0x6E,0x76,0x66,0x66,0x3C,0x00],[0x18,0x38,0x18,0x18,0x18,0x18,0x7E,0x00],
 [0x3C,0x66,0x06,0x0C,0x30,0x60,0x7E,0x00],[0x3C,0x66,0x06,0x1C,0x06,0x66,0x3C,0x00],
 [0x0C,0x1C,0x3C,0x6C,0x7E,0x0C,0x0C,0x00],[0x7E,0x60,0x7C,0x06,0x06,0x66,0x3C,0x00],
 [0x3C,0x66,0x60,0x7C,0x66,0x66,0x3C,0x00],[0x7E,0x66,0x0C,0x18,0x18,0x18,0x18,0x00],
 [0x3C,0x66,0x66,0x3C,0x66,0x66,0x3C,0x00],[0x3C,0x66,0x66,0x3E,0x06,0x66,0x3C,0x00],
];
const digFont = digits.flat();

// bitmap plot tables (offsets relative to a bitmap base page):
// window pixel (wx,wy) -> byte = (CH0+(wy>>3))*320 + (wy&7) + (CW0+(wx>>3))*8 ; bit = 7-(wx&7)
const winRowLo = [], winRowHi = [];
for (let wy = 0; wy < WIN; wy++) { const v = (CH0 + (wy >> 3)) * 320 + (wy & 7); winRowLo.push(v & 255); winRowHi.push(v >> 8); }
const winColByte = [], winBit = [];
for (let wx = 0; wx < WIN; wx++) { winColByte.push((CW0 + (wx >> 3)) * 8); winBit.push(1 << (7 - (wx & 7))); }
// clear-window: 5 char-rows, each 40 bytes starting at (CH0+cr)*320 + CW0*8
const winClrLo = [], winClrHi = [];
for (let cr = 0; cr < CH; cr++) { const v = (CH0 + cr) * 320 + CW0 * 8; winClrLo.push(v & 255); winClrHi.push(v >> 8); }

const asm = `
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
wtop    = $18
wbot    = $19
hh      = $1a
cyv     = $1b
colByte = $1c
xbit    = $1d
ptr     = $1e
baseHi  = $20
tmpid   = $21
prevId  = $22
dxv     = $23
dyv     = $24
nxL     = $25
nxH     = $26
nyL     = $27
nyH     = $28
tmp     = $29
frameCnt = $2a
lastFrame = $2c
renderCnt = $2e
fpsv    = $2f
fpsTens = $30
fpsOnes = $31
deltaL  = $32
deltaH  = $33
remL    = $34
remH    = $35
ddxH    = $36
ddyH    = $37
sdxH    = $38
sdyH    = $39
mlo     = $3a
mhi     = $3b
r1      = $3c
r2      = $3d

        * = $0801
        !byte $0c,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
entry:
        sei
        lda #$00
        sta $d01a
        lda #$3b
        sta $d011               ; bitmap mode
        lda #$08
        sta $d016
        lda #$18
        sta $d018               ; screen bank+$0400, bitmap bank+$2000
        lda #$00
        sta $d020
        lda $dd02
        ora #$03
        sta $dd02               ; CIA2 PA0,1 output (VIC bank)
        lda $dd00
        and #$fc
        ora #$03
        sta $dd00               ; show bank0 (buffer A) to start
        lda #$ff
        sta $dc02
        lda #$00
        sta $dc03
        ; screen matrices A ($0400) and B ($4400) = $01 (fg black, bg white)
        lda #$01
        ldx #$00
smf:    sta $0400,x
        sta $0500,x
        sta $0600,x
        sta $0700,x
        sta $4400,x
        sta $4500,x
        sta $4600,x
        sta $4700,x
        inx
        bne smf
        ; clear bitmap A ($2000-$3fff) and B ($6000-$7fff) to 0
        lda #$00
        sta ptr
        lda #$20
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
        lda #$60
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
        lda #$60
        sta baseHi              ; render into B (hidden); A is shown
        cli

mloop:  jsr readInput
        jsr clearWin
        lda #$00
        sta col
mcol:   jsr castCol
        lda mapY
        asl
        asl
        asl
        asl
        clc
        adc mapX
        sta tmpid
        lda side
        beq idns
        lda tmpid
        eor #$80
        sta tmpid
idns:   lda col
        beq dow
        lda tmpid
        cmp prevId
        bne noWall              ; face boundary -> white divider column
dow:    ldx pp
        lda hLUTt,x
        sta hh
        lsr
        sta tmp
        lda #40
        sec
        sbc tmp
        sta wtop
        lda #40
        clc
        adc hh
        sec
        sbc tmp
        sta wbot
        ldx col
        lda winColByteT,x
        sta colByte
        lda winBitT,x
        sta xbit
        lda wtop
        sta cyv
vsl:    ldx cyv
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
        bcc vsl
        beq vsl
noWall: lda tmpid
        sta prevId
        inc col
        lda col
        cmp #${WIN}
        bcc mcol
        jsr drawFps
        inc renderCnt
        lda renderCnt
        cmp #32
        bcc noFps
        jsr computeFps
        lda #$00
        sta renderCnt
noFps:  ; wait vblank, flip to show the buffer we just rendered
wv:     lda $d012
        cmp #250
        bne wv
        lda baseHi
        cmp #$20
        bne shB
        ; hidden = A ($20) -> show bank0, next hidden = B
        lda $dd00
        and #$fc
        ora #$03
        sta $dd00
        lda #$60
        sta baseHi
        jmp mloop
shB:    lda $dd00
        and #$fc
        ora #$02
        sta $dd00               ; show bank1 (buffer B)
        lda #$20
        sta baseHi
        jmp mloop

; ---- clear the 40x40 window region of the hidden bitmap (5 rows x 40 bytes) ----
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

; ================= cast one ray (16-bit DDA) =================
castCol:
        ldx col
        lda pa
        clc
        adc colOffT,x
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
        lda posXT,x
        bne cxpos
        lda #$ff
        sta stpX
        lda px
        sta fr
        jmp cxmul
cxpos:  lda #$01
        sta stpX
        lda #$00
        sec
        sbc px
        sta fr
cxmul:  lda ddx
        sta mlo
        lda ddxH
        sta mhi
        jsr sideMul
        lda r1
        sta sdx
        lda r2
        sta sdxH
        ldx rang
        lda posYT,x
        bne cypos
        lda #$ff
        sta stpY
        lda py
        sta fr
        jmp cymul
cypos:  lda #$01
        sta stpY
        lda #$00
        sec
        sbc py
        sta fr
cymul:  lda ddy
        sta mlo
        lda ddyH
        sta mhi
        jsr sideMul
        lda r1
        sta sdy
        lda r2
        sta sdyH
        ldy #24
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
cfar:   lda #$ff
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
cidx:   lda remH
        cmp #$10
        bcc cidxok
        lda #$ff
        sta pp
        rts
cidxok: lda remL
        lsr
        lsr
        lsr
        lsr
        sta tmp
        lda remH
        asl
        asl
        asl
        asl
        ora tmp
        sta pp
        rts

; sideMul: fr(8) * (mhi:mlo)(16) >> 8 -> r2:r1  (via two quarter-square 8x8)
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

; ---- fps = 1920 / (frames per 32 renders); split into tens/ones ----
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

; ---- blit 2 fps digits into hidden bitmap bottom-right ----
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

; ================= data =================
digFontT: !byte ${digFont.join(',')}
mapT:   ${chunk(map, 16).trim()}
colOffT: !byte ${colOff.join(',')}
ddxLoT: ${chunk(ddxLo).trim()}
ddxHiT: ${chunk(ddxHi).trim()}
ddyLoT: ${chunk(ddyLo).trim()}
ddyHiT: ${chunk(ddyHi).trim()}
posXT:  ${chunk(posX).trim()}
posYT:  ${chunk(posY).trim()}
hLUTt:  ${chunk(hLUT).trim()}
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
`;

writeFileSync('./bmaze.asm', asm);
const r = assemble(asm);
writeFileSync('./bmaze.prg', Buffer.from(r.prg));
const d = D64.createEmpty('BMAZE', '01');
d.writeFile('BMAZE'.padEnd(6) + '/PRG', r.prg, D64.FILE_TYPE_PRG);
writeFileSync('./bmaze.d64', Buffer.from(d.getData()));
console.log(`ok: org=$${r.org.toString(16)} end=$${r.end.toString(16)} bytes=${r.bytes.length}`);
