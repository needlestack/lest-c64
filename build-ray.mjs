// build-ray.mjs — C64 char-framebuffer raycaster (40 cols, 8-bit DDA).
// Solid black walls, white floor/ceiling, white dividers between wall faces.
// ESDF controls: E fwd, D back, S turn-left, F turn-right. Quarter-square mul.
// MEASURE=1 -> flat-out + fps counter.
import { writeFileSync } from 'fs';
import { assemble } from './asm6502.mjs';
await import('./d64lib.js');
const D64 = globalThis.D64;
const chunk = (arr, per = 24, ind = '        ') => { const o = []; for (let i = 0; i < arr.length; i += per) o.push(ind + '!byte ' + Array.from(arr.slice(i, i + per)).join(',')); return o.join('\n'); };

const font = new Uint8Array(256 * 8);
for (let c = 0; c < 256; c++) for (let r = 0; r < 8; r++) { const g = r >> 1, lb = 7 - g * 2, rb = 6 - g * 2; font[c * 8 + r] = (((c >> lb) & 1) ? 0xF0 : 0) | (((c >> rb) & 1) ? 0x0F : 0); }

const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r => r.split('').map(Number));
const map = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) map.push(M[y][x]);

const SCALE = 32;
const ddx8 = [], ddy8 = [], posX = [], posY = [];
for (let a = 0; a < 256; a++) {
  const cx = Math.cos(a / 256 * 2 * Math.PI), sy = Math.sin(a / 256 * 2 * Math.PI);
  ddx8.push(Math.min(255, Math.round(SCALE / Math.max(1e-3, Math.abs(cx)))));
  ddy8.push(Math.min(255, Math.round(SCALE / Math.max(1e-3, Math.abs(sy)))));
  posX.push(cx >= 0 ? 1 : 0); posY.push(sy >= 0 ? 1 : 0);
}
const NCOL = 40, FOV = 47;
const colOff = []; for (let c = 0; c < NCOL; c++) colOff.push(Math.round((c - (NCOL - 1) / 2) * FOV / (NCOL - 1)) & 255);
const hLUT8 = []; for (let d = 0; d < 256; d++) { let h = Math.round(2816 / Math.max(1, d)); h = Math.max(0, Math.min(99, h)); hLUT8.push(h); }
const moveX = [], moveY = [];
for (let a = 0; a < 256; a++) { moveX.push(Math.round(Math.cos(a / 256 * 2 * Math.PI) * 24) & 255); moveY.push(Math.round(Math.sin(a / 256 * 2 * Math.PI) * 24) & 255); }
const f0Lo = [], f0Hi = [], f1Lo = [], f1Hi = [];
for (let i = 0; i < 256; i++) { const v = Math.floor(i * i / 4); f0Lo.push(v & 255); f0Hi.push((v >> 8) & 255); }
for (let i = 256; i < 512; i++) { const v = Math.floor(i * i / 4); f1Lo.push(v & 255); f1Hi.push((v >> 8) & 255); }
const topMask = [0xFF, 0x3F, 0x0F, 0x03], botMask = [0xC0, 0xF0, 0xFC, 0xFF];

const MEASURE = process.env.MEASURE === '1';

const asm = `
bufA    = $0400
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
wtop    = $18
wbot    = $19
cptr    = $1a
r0      = $1c
r1      = $1d
crc     = $1e
tmp     = $1f
cellcol = $20
dvMask  = $21
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
showD   = $2f

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
        sta $d018
        lda #$01
        sta $d021
        lda #$00
        sta $d020
        lda #$ff
        sta $dc02
        lda #$00
        sta $dc03
        ldx #$00
        lda #$00
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

mloop:  jsr readKeys
        lda #$00
        sta col
mcol:   jsr castCol
        jsr calcTop
        ldx col
        lda wtop
        sta topT,x
        lda wbot
        sta botT,x
        lda mapY
        asl
        asl
        asl
        asl
        clc
        adc mapX
        sta tmp
        lda side
        beq mcns
        lda tmp
        eor #$80
        sta tmp
mcns:   ldx col
        lda tmp
        sta idT,x
        inc col
        lda col
        cmp #${NCOL}
        bcc mcol
        jsr drawSolidAll
${MEASURE ? '        jsr drawCounter\n' : ''}${MEASURE ? '' : `mvs:    lda $d012
        cmp #250
        bne mvs
`}        lda baseHi
        cmp #$04
        bne mshB
        lda #$1a
        sta $d018
        lda #$20
        sta baseHi
        jmp mnext
mshB:   lda #$8a
        sta $d018
        lda #$04
        sta baseHi
mnext:  inc iterLo
        bne mloop
        inc iterHi
        jmp mloop

; ================= ESDF keyboard =================
readKeys:
        lda #$fd
        sta $dc00
        lda $dc01
        and #$40
        bne rkNotE
        jsr moveFwd
rkNotE: lda $dc01
        and #$20
        bne rkNotS
        lda pa
        sec
        sbc #$03
        sta pa
rkNotS: lda #$fb
        sta $dc00
        lda $dc01
        and #$04
        bne rkNotD
        jsr moveBack
rkNotD: lda $dc01
        and #$20
        bne rkNotF
        lda pa
        clc
        adc #$03
        sta pa
rkNotF: rts

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

; ================= cast one ray (8-bit DDA) =================
castCol:
        ldx col
        lda pa
        clc
        adc colOffT,x
        sta rang
        tax
        lda ddx8T,x
        sta ddx
        lda ddy8T,x
        sta ddy
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
cxmul:  lda fr
        sta qa
        lda ddx
        sta qb
        jsr mul8
        lda qhi
        sta sdx
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
cymul:  lda fr
        sta qa
        lda ddy
        sta qb
        jsr mul8
        lda qhi
        sta sdy
        ldy #24
cdda:   lda sdx
        cmp sdy
        bcc cstepX
        beq cstepX
cstepY: clc
        lda sdy
        adc ddy
        bcs cfar
        sta sdy
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
        bcs cfar
        sta sdx
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
        sta pp
        rts
cperpY: sec
        lda sdy
        sbc ddy
        sta pp
        rts

calcTop:
        ldx pp
        lda hLUT8t,x
        lsr
        sta tmp
        lda #50
        sec
        sbc tmp
        sta wtop
        lda #50
        clc
        adc tmp
        sta wbot
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

; ================= solid render + single-pass white dividers =================
drawSolidAll:
        lda #$00
        sta col
dsa:    lda col
        beq dsNoDv
        ldx col
        lda idT,x
        ldy col
        dey
        cmp idT,y
        bne dsDv
dsNoDv: lda #$ff
        jmp dsSet
dsDv:   lda #$55
dsSet:  sta dvMask
        ldx col
        lda topT,x
        sta wtop
        lda botT,x
        sta wbot
        lda col
        sta cellcol
        jsr drawColSolid
        inc col
        lda col
        cmp #${NCOL}
        bcc dsa
        rts

drawColSolid:
        lda wtop
        lsr
        lsr
        sta r0
        lda wbot
        lsr
        lsr
        sta r1
        lda #$00
        sta crc
        lda cellcol
        sta cptr
        lda baseHi
        sta cptr+1
dsRow:  lda crc
        cmp r0
        bcc dsW0
        lda r1
        cmp crc
        bcc dsW0
        lda #$ff
        sta tmp
        lda crc
        cmp r0
        bne dsCB
        lda wtop
        and #$03
        tax
        lda topMaskT,x
        and tmp
        sta tmp
dsCB:   lda crc
        cmp r1
        bne dsWT
        lda wbot
        and #$03
        tax
        lda botMaskT,x
        and tmp
        sta tmp
dsWT:   lda tmp
        jmp dsWr
dsW0:   lda #$00
dsWr:   and dvMask
        ldy #$00
        sta (cptr),y
        clc
        lda cptr
        adc #40
        sta cptr
        bcc dsNc
        inc cptr+1
dsNc:   inc crc
        lda crc
        cmp #25
        bcc dsRow
        rts

; fps counter
drawCounter:
        lda baseHi
        sta zpc+1
        lda #$00
        sta zpc
        ldy #39
        lda #$00
dczc:   sta (zpc),y
        dey
        bpl dczc
        lda iterLo
        sta remLo2
        lda iterHi
        sta cnt
        ldx #$00
        ldy #$00
dcl:    lsr cnt
        ror remLo2
        bcc dcsk
        txa
        asl
        sta zpc
        lda baseHi
        sta zpc+1
        lda #$c0
        sta (zpc),y
dcsk:   inx
        cpx #16
        bne dcl
        rts

; ================= data =================
mapT:   ${chunk(map, 16).trim()}
colOffT: !byte ${colOff.join(',')}
ddx8T:  ${chunk(ddx8).trim()}
ddy8T:  ${chunk(ddy8).trim()}
posXT:  ${chunk(posX).trim()}
posYT:  ${chunk(posY).trim()}
hLUT8t: ${chunk(hLUT8).trim()}
moveXT: ${chunk(moveX).trim()}
moveYT: ${chunk(moveY).trim()}
topMaskT: !byte ${topMask.join(',')}
botMaskT: !byte ${botMask.join(',')}
topT:   !fill ${NCOL},0
botT:   !fill ${NCOL},0
idT:    !fill ${NCOL},0

        * = charset
${chunk(font, 32)}

        * = $3000
f0LoT:  ${chunk(f0Lo).trim()}
f0HiT:  ${chunk(f0Hi).trim()}
f1LoT:  ${chunk(f1Lo).trim()}
f1HiT:  ${chunk(f1Hi).trim()}
`;

writeFileSync('./ray.asm', asm);
const r = assemble(asm);
writeFileSync('./ray.prg', Buffer.from(r.prg));
const d = D64.createEmpty('RAYCAST', '01');
d.writeFile('MAZE'.padEnd(6) + '/PRG', r.prg, D64.FILE_TYPE_PRG);
writeFileSync('./ray.d64', Buffer.from(d.getData()));
console.log(`ok: org=$${r.org.toString(16)} end=$${r.end.toString(16)} bytes=${r.bytes.length}`);
