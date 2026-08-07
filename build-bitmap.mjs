// build-bitmap.mjs — hi-res BITMAP-mode wireframe cube, SAME rotation math as
// the char-framebuffer version, single-pixel plots. For CPU comparison.
//   default : vsync'd, single-buffer (flickers — fine for the comparison)
//   MEASURE3=1 : flat-out + 16-bit iteration counter drawn as spaced dots at top
import { writeFileSync } from 'fs';
import { assemble } from './asm6502.mjs';
await import('./d64lib.js');
const D64 = globalThis.D64;

const chunk = (arr, per = 24, indent = '        ') =>
  { const out = []; for (let i = 0; i < arr.length; i += per)
      out.push(indent + '!byte ' + Array.from(arr.slice(i, i + per)).join(',')); return out.join('\n'); };

const sinTab = [];
for (let i = 0; i < 256; i++) sinTab.push(Math.round(127 * Math.sin(i / 256 * 2 * Math.PI)) & 0xFF);
const sqrLo = [], sqrHi = [];
for (let i = 0; i < 256; i++) { const v = Math.floor(i * i / 4); sqrLo.push(v & 0xFF); sqrHi.push((v >> 8) & 0xFF); }
// hi-res bitmap y-table: (y>>3)*320 + (y&7), for y 0..199
const yLo = [], yHi = [];
for (let y = 0; y < 200; y++) { const v = (y >> 3) * 320 + (y & 7); yLo.push(v & 0xFF); yHi.push((v >> 8) & 0xFF); }
const bitMask = [0x80,0x40,0x20,0x10,0x08,0x04,0x02,0x01];
const R = 40;
const vx = [], vy = [], vz = [];
for (let i = 0; i < 8; i++) { vx.push(((i&1)?R:-R)&0xFF); vy.push(((i&2)?R:-R)&0xFF); vz.push(((i&4)?R:-R)&0xFF); }
const edges = [];
for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const x = i ^ j; if ((x & (x - 1)) === 0) edges.push([i, j]); }
const edgeTab = []; for (const [a,b] of edges) edgeTab.push(a,b);

const setMul = (a,b) => `        lda ${a}\n        sta mulA\n        lda ${b}\n        sta mulB\n        jsr smul`;
const accInit = `        lda prodLo\n        sta accLo\n        lda prodHi\n        sta accHi`;
const accAdd  = `        clc\n        lda accLo\n        adc prodLo\n        sta accLo\n        lda accHi\n        adc prodHi\n        sta accHi`;
const accSub  = `        sec\n        lda accLo\n        sbc prodLo\n        sta accLo\n        lda accHi\n        sbc prodHi\n        sta accHi`;
const advAngles = `        lda angA
        clc
        adc #$02
        sta angA
        lda angB
        clc
        adc #$03
        sta angB
        lda angC
        clc
        adc #$01
        sta angC`;

// clear pages $22..$3F (leaves char row 0 = $2000-$213F for the persistent
// counter; cube lives in char rows 3+, all >= $2200 so fully cleared).
const clearBody = Array.from({length:30}, (_,i) => `        sta $${(0x2200 + i*0x100).toString(16)},x`).join('\n');

const MEASURE3 = process.env.MEASURE3 === '1';
const vsyncLoop = `floop:  lda $d012
        cmp #250
        bne floop
        jsr clearBitmap
        jsr rotAll
        jsr drawEdges
${advAngles}
        jmp floop`;
const measLoop = `m3l:    jsr clearBitmap
        jsr rotAll
        jsr drawEdges
        jsr drawCounter
        inc iterLo
        bne m3a
        inc iterHi
m3a:
${advAngles}
        jmp m3l`;
const loopAsm = MEASURE3 ? measLoop : vsyncLoop;

const asm = `
; ==== hi-res bitmap wireframe cube (same math as char version) ====
bitmap  = $2000

ptr     = $02
x0v     = $05
y0v     = $06
x1v     = $07
y1v     = $08
dx      = $09
dy      = $0a
sxs     = $0b
sys     = $0c
errLo   = $0d
errHi   = $0e
cx      = $0f
cy      = $10
tmp     = $11
e2Lo    = $12
e2Hi    = $13
eidx    = $14
mulA    = $30
mulB    = $31
ua      = $32
ub      = $33
sgn     = $34
prodLo  = $35
prodHi  = $36
accLo   = $37
accHi   = $38
cvx     = $39
cvy     = $3a
cvz     = $3b
x2      = $3c
y2      = $3d
cA      = $40
sA      = $41
cB      = $42
sB      = $43
cC      = $44
sC      = $45
sAsB    = $46
cAsB    = $47
angA    = $48
angB    = $49
angC    = $4a
vi      = $4b
zpc     = $50
iterLo  = $52
iterHi  = $53
remLo2  = $54
remHi2  = $55
bitn    = $56

        * = $0801
        !byte $0c,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
entry:
        sei
        lda #$00
        sta $d01a
        lda $dd00
        ora #$03
        sta $dd00               ; VIC bank 0
        lda #$3b
        sta $d011               ; bitmap mode, screen on
        lda #$08
        sta $d016               ; MCM off
        lda #$18
        sta $d018               ; screen $0400, bitmap $2000
        lda #$00
        sta $d020
        ; screen matrix = $01 (fg black, bg white)
        lda #$01
        ldx #$00
smf:    sta $0400,x
        sta $0500,x
        sta $0600,x
        sta $0700,x
        inx
        bne smf
        ; one-time clear of top region (per-frame clear skips $2000-$21ff)
        lda #$00
        ldx #$00
itc:    sta $2000,x
        sta $2100,x
        inx
        bne itc
        lda #$00
        sta angA
        sta angB
        sta angC
        sta iterLo
        sta iterHi

${loopAsm}

; clear 8KB bitmap ($2000-$3FFF)
clearBitmap:
        lda #$00
        ldx #$00
cbl:
${clearBody}
        inx
        bne cbl
        rts

; ================= rotation (asr7 projection -> 320x200, centered 160,100) =================
rotAll:
        ldx angA
        lda sinT,x
        sta sA
        lda angA
        clc
        adc #64
        tax
        lda sinT,x
        sta cA
        ldx angB
        lda sinT,x
        sta sB
        lda angB
        clc
        adc #64
        tax
        lda sinT,x
        sta cB
        ldx angC
        lda sinT,x
        sta sC
        lda angC
        clc
        adc #64
        tax
        lda sinT,x
        sta cC
${setMul('sA','sB')}
${accInit}
        jsr asr7
        lda accLo
        sta sAsB
${setMul('cA','sB')}
${accInit}
        jsr asr7
        lda accLo
        sta cAsB
        lda #$00
        sta vi
rvL:    ldx vi
        lda vxT,x
        sta cvx
        lda vyT,x
        sta cvy
        lda vzT,x
        sta cvz
${setMul('cB','cvx')}
${accInit}
${setMul('sAsB','cvy')}
${accAdd}
${setMul('cAsB','cvz')}
${accAdd}
        jsr asr7
        lda accLo
        sta x2
${setMul('cA','cvy')}
${accInit}
${setMul('sA','cvz')}
${accSub}
        jsr asr7
        lda accLo
        sta y2
        ; sx = 160 + asr7(cC*x2 - sC*y2)
${setMul('cC','x2')}
${accInit}
${setMul('sC','y2')}
${accSub}
        jsr asr7
        lda accLo
        clc
        adc #160
        ldx vi
        sta vsxT,x
        ; sy = 100 + asr7(sC*x2 + cC*y2)
${setMul('sC','x2')}
${accInit}
${setMul('cC','y2')}
${accAdd}
        jsr asr7
        lda accLo
        clc
        adc #100
        ldx vi
        sta vsyT,x
        inc vi
        lda vi
        cmp #8
        bcs rvDone
        jmp rvL
rvDone: rts

asr7:   ldx #7
a7l:    lda accHi
        cmp #$80
        ror accHi
        ror accLo
        dex
        bne a7l
        rts

smul:   lda #$00
        sta sgn
        lda mulA
        bpl sap
        eor #$ff
        clc
        adc #$01
        inc sgn
sap:    sta ua
        lda mulB
        bpl sbp
        eor #$ff
        clc
        adc #$01
        inc sgn
sbp:    sta ub
        lda ua
        clc
        adc ub
        tax
        lda ua
        sec
        sbc ub
        bcs sdp
        eor #$ff
        clc
        adc #$01
sdp:    tay
        lda sqrLoT,x
        sec
        sbc sqrLoT,y
        sta prodLo
        lda sqrHiT,x
        sbc sqrHiT,y
        sta prodHi
        lda sgn
        lsr
        bcc smd
        sec
        lda #$00
        sbc prodLo
        sta prodLo
        lda #$00
        sbc prodHi
        sta prodHi
smd:    rts

drawEdges:
        lda #$00
        sta eidx
deL:    ldx eidx
        lda edgeTab,x
        tay
        lda vsxT,y
        sta x0v
        lda vsyT,y
        sta y0v
        inx
        lda edgeTab,x
        tay
        lda vsxT,y
        sta x1v
        lda vsyT,y
        sta y1v
        jsr lineDraw
        lda eidx
        clc
        adc #$02
        sta eidx
        cmp #24
        bcc deL
        rts

lineDraw:
        lda x1v
        sec
        sbc x0v
        bcs ldxp
        eor #$ff
        clc
        adc #$01
        sta dx
        lda #$ff
        sta sxs
        jmp lddy
ldxp:   sta dx
        lda #$01
        sta sxs
lddy:   lda y1v
        sec
        sbc y0v
        bcs ldyp
        eor #$ff
        clc
        adc #$01
        sta dy
        lda #$ff
        sta sys
        jmp lerr
ldyp:   sta dy
        lda #$01
        sta sys
lerr:   lda dx
        sec
        sbc dy
        sta errLo
        lda #$00
        sbc #$00
        sta errHi
        lda x0v
        sta cx
        lda y0v
        sta cy
lstep:  jsr plot
        lda cx
        cmp x1v
        bne lcont
        lda cy
        cmp y1v
        bne lcont
        rts
lcont:  lda errLo
        asl
        sta e2Lo
        lda errHi
        rol
        sta e2Hi
        lda e2Lo
        clc
        adc dy
        sta tmp
        lda e2Hi
        adc #$00
        bmi skpx
        lda errLo
        sec
        sbc dy
        sta errLo
        lda errHi
        sbc #$00
        sta errHi
        lda cx
        clc
        adc sxs
        sta cx
skpx:   lda e2Lo
        sec
        sbc dx
        sta tmp
        lda e2Hi
        sbc #$00
        bpl skpy
        lda errLo
        clc
        adc dx
        sta errLo
        lda errHi
        adc #$00
        sta errHi
        lda cy
        clc
        adc sys
        sta cy
skpy:   jmp lstep

; ================= bitmap plot (cx,cy) =================
plot:   lda cx
        and #$f8
        sta tmp
        ldy cy
        lda yLoT,y
        clc
        adc tmp
        sta ptr
        lda yHiT,y
        adc #$20                ; + bitmap base hi
        sta ptr+1
        lda cx
        and #$07
        tax
        lda bitMaskT,x
        ldy #$00
        ora (ptr),y
        sta (ptr),y
        rts

; draw 16-bit iter as spaced dots (bit set -> 2x2 dot at x=bit*8, y=0..1)
drawCounter:
        ; clear char row 0 ($2000-$213F) so old dots don't persist
        lda #$00
        ldx #$00
dcc0:   sta $2000,x
        inx
        bne dcc0
        ldx #$00
dcc1:   sta $2100,x
        inx
        cpx #$40
        bne dcc1
        lda iterLo
        sta remLo2
        lda iterHi
        sta remHi2
        lda #$00
        sta bitn
dcl:    lda remLo2
        and #$01
        beq dcskip
        ; cx = bitn*8
        lda bitn
        asl
        asl
        asl
        sta cx
        lda #$00
        sta cy
        jsr plot
        inc cx
        jsr plot
        inc cy
        jsr plot
        dec cx
        jsr plot
dcskip: lsr remHi2
        ror remLo2
        inc bitn
        lda bitn
        cmp #16
        bne dcl
        rts

; ================= data =================
yLoT:   ${chunk(yLo).trim()}
yHiT:   ${chunk(yHi).trim()}
bitMaskT: !byte ${bitMask.join(',')}
edgeTab: !byte ${edgeTab.join(',')}
vxT:    !byte ${vx.join(',')}
vyT:    !byte ${vy.join(',')}
vzT:    !byte ${vz.join(',')}
vsxT:   !fill 8,0
vsyT:   !fill 8,0
sinT:   ${chunk(sinTab).trim()}
sqrLoT: ${chunk(sqrLo).trim()}
sqrHiT: ${chunk(sqrHi).trim()}
`;

writeFileSync('./cube-bitmap.asm', asm);
const r = assemble(asm);
writeFileSync('./cube-bitmap.prg', Buffer.from(r.prg));
const d = D64.createEmpty('CUBEBMP', '01');
d.writeFile('CUBE'.padEnd(6) + '/PRG', r.prg, D64.FILE_TYPE_PRG);
writeFileSync('./cube-bitmap.d64', Buffer.from(d.getData()));
console.log(`ok: org=$${r.org.toString(16)} end=$${r.end.toString(16)} bytes=${r.bytes.length}`);
