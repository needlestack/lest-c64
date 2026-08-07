// build-cube.mjs — C64 char-mode framebuffer rotating cube.
// Stage 2: 6502 fixed-point rotation math (static angle), single buffer.
import { writeFileSync } from 'fs';
import { assemble } from './asm6502.mjs';
await import('./d64lib.js');
const D64 = globalThis.D64;

const chunk = (arr, per = 24, indent = '        ') =>
  { const out = []; for (let i = 0; i < arr.length; i += per)
      out.push(indent + '!byte ' + Array.from(arr.slice(i, i + per)).join(',')); return out.join('\n'); };

// --- 256-char font: code == 8 logical pixels (2 wide x 4 tall), each 4x2 native ---
const font = new Uint8Array(256 * 8);
for (let c = 0; c < 256; c++) for (let r = 0; r < 8; r++) {
  const g = r >> 1, lb = 7 - g * 2, rb = 6 - g * 2;
  font[c * 8 + r] = (((c >> lb) & 1) ? 0xF0 : 0) | (((c >> rb) & 1) ? 0x0F : 0);
}
const maskTab = [0x80,0x40,0x20,0x10,0x08,0x04,0x02,0x01];
// y-indexed plot tables (0..99): row pointer = (y>>2)*40, and mask-row = (y&3)*2
const rowPtrLo = [], rowPtrHi = [], yrow2 = [];
for (let y = 0; y < 100; y++) { const v = (y >> 2) * 40; rowPtrLo.push(v & 0xFF); rowPtrHi.push(v >> 8); yrow2.push((y & 3) * 2); }
// x-indexed column table (0..79): xcol = x>>1
const colTab = []; for (let x = 0; x < 80; x++) colTab.push(x >> 1);
// sin table s.7 (256), signed bytes
const sinTab = [];
for (let i = 0; i < 256; i++) sinTab.push(Math.round(127 * Math.sin(i / 256 * 2 * Math.PI)) & 0xFF);
// squares table sqr[i]=floor(i*i/4), lo/hi (256)
const sqrLo = [], sqrHi = [];
for (let i = 0; i < 256; i++) { const v = Math.floor(i * i / 4); sqrLo.push(v & 0xFF); sqrHi.push((v >> 8) & 0xFF); }
// cube verts/edges
const R = 24;
const vx = [], vy = [], vz = [];
for (let i = 0; i < 8; i++) { vx.push(((i&1)?R:-R)&0xFF); vy.push(((i&2)?R:-R)&0xFF); vz.push(((i&4)?R:-R)&0xFF); }
// cube edge = vertex pair differing in exactly one coordinate bit (12 edges)
const edges = [];
for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const x = i ^ j; if ((x & (x - 1)) === 0) edges.push([i, j]); }
const edgeTab = []; for (const [a,b] of edges) edgeTab.push(a,b);

// asm helpers for the repetitive multiply-accumulate
const setMul = (a,b) => `        lda ${a}\n        sta mulA\n        lda ${b}\n        sta mulB\n        jsr smul`;
const accInit = `        lda prodLo\n        sta accLo\n        lda prodHi\n        sta accHi`;
const accAdd  = `        clc\n        lda accLo\n        adc prodLo\n        sta accLo\n        lda accHi\n        adc prodHi\n        sta accHi`;
const accSub  = `        sec\n        lda accLo\n        sbc prodLo\n        sta accLo\n        lda accHi\n        sbc prodHi\n        sta accHi`;

const MEASURE = process.env.MEASURE === '1';
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
const vsyncLoop = `floop:  lda $d012
        cmp #250
        bne floop               ; sync to raster line 250 (bottom border)
        lda showD018
        sta $d018               ; flip: show finished buffer (safe, in border)
        jsr clearRect
        jsr rotAll
        jsr drawEdges
        lda baseHi
        cmp #$04
        bne fbB
        lda #$1a
        sta showD018
        lda #$20
        sta baseHi
        jmp fadv
fbB:    lda #$8a
        sta showD018
        lda #$04
        sta baseHi
fadv:
${advAngles}
        jmp floop`;
const measLoop = `        lda #$04
        sta baseHi
        lda #$1a
        sta $d018               ; show bufA (tearing ok for timing)
mfl:    lda tglr
        eor #$02
        sta tglr
        sta $d020               ; border alternates 0/2 each iteration
        jsr clearHidden
        jsr rotAll
        jsr drawEdges
${advAngles}
        jmp mfl`;
const measLoop3 = `        lda #$04
        sta baseHi
        lda #$1a
        sta $d018
        jsr clearHidden
        lda #$00
        sta iterLo
        sta iterHi
m3l:    jsr clearRect
${process.env.NOROT === '1' ? '' : '        jsr rotAll\n'}${process.env.NOEDGES === '1' ? '' : '        jsr drawEdges\n'}        jsr drawCounter
        inc iterLo
        bne m3a
        inc iterHi
m3a:
${advAngles}
        jmp m3l`;
const loopAsm = process.env.MEASURE3 === '1' ? measLoop3 : (MEASURE ? measLoop : vsyncLoop);

// ---- fast incremental line plotter ----
// State: ptr = current char-cell addr; mi = mask index (0..7) = (y&3)*2 + (x&1).
// Each Bresenham step nudges ptr and mi instead of recomputing from tables.
const xStepHplus = (p) => `        lda mi
        eor #$01
        sta mi
        and #$01
        bne ${p}nx
        inc ptr
        bne ${p}nx
        inc ptr+1
${p}nx:`;
const xStepHminus = (p) => `        lda mi
        eor #$01
        sta mi
        and #$01
        beq ${p}nx
        lda ptr
        bne ${p}nx2
        dec ptr+1
${p}nx2: dec ptr
${p}nx:`;
const yStepGeneric = (p) => `        lda mi
        clc
        adc yInc
        and #$07
        sta mi
        ldx syflag
        bne ${p}ym
        cmp #$02
        bcs ${p}yd
        clc
        lda ptr
        adc #40
        sta ptr
        bcc ${p}yd
        inc ptr+1
        jmp ${p}yd
${p}ym: cmp #$06
        bcc ${p}yd
        sec
        lda ptr
        sbc #40
        sta ptr
        bcs ${p}yd
        dec ptr+1
${p}yd:`;
const yStepVplus = (p) => `        lda mi
        clc
        adc #$02
        and #$07
        sta mi
        cmp #$02
        bcs ${p}yd
        clc
        lda ptr
        adc #40
        sta ptr
        bcc ${p}yd
        inc ptr+1
${p}yd:`;
const yStepVminus = (p) => `        lda mi
        clc
        adc #$06
        and #$07
        sta mi
        cmp #$06
        bcc ${p}yd
        sec
        lda ptr
        sbc #40
        sta ptr
        bcs ${p}yd
        dec ptr+1
${p}yd:`;
const xStepVgen = (p) => `        lda mi
        eor #$01
        sta mi
        ldx sxflag
        bne ${p}xm
        and #$01
        bne ${p}xd
        inc ptr
        bne ${p}xd
        inc ptr+1
        jmp ${p}xd
${p}xm: and #$01
        beq ${p}xd
        lda ptr
        bne ${p}xd2
        dec ptr+1
${p}xd2: dec ptr
${p}xd:`;
const hLoop = (p, xstep) => `${p}:   ldy #$00
${p}l:  ldx mi
        lda maskT,x
        ora (ptr),y
        sta (ptr),y
${xstep(p)}
        lda err
        clc
        adc dy
        cmp dx
        bcc ${p}s
        sbc dx
        sta err
${yStepGeneric(p)}
        jmp ${p}d
${p}s:  sta err
${p}d:  dec cnt
        bne ${p}l
        rts`;
const vLoop = (p, ystep) => `${p}:   ldy #$00
${p}l:  ldx mi
        lda maskT,x
        ora (ptr),y
        sta (ptr),y
${ystep(p)}
        lda err
        clc
        adc dx
        cmp dy
        bcc ${p}s
        sbc dy
        sta err
${xStepVgen(p)}
        jmp ${p}d
${p}s:  sta err
${p}d:  dec cnt
        bne ${p}l
        rts`;
const fastLine = `lineDraw:
        lda x1v
        sec
        sbc x0v
        bcs lxp
        eor #$ff
        clc
        adc #$01
        sta dx
        lda #$01
        sta sxflag
        jmp lyd
lxp:    sta dx
        lda #$00
        sta sxflag
lyd:    lda y1v
        sec
        sbc y0v
        bcs lyp
        eor #$ff
        clc
        adc #$01
        sta dy
        lda #$01
        sta syflag
        lda #$06
        sta yInc
        jmp linit
lyp:    sta dy
        lda #$00
        sta syflag
        lda #$02
        sta yInc
linit:  ldy y0v
        lda rowPtrLoT,y
        clc
        ldx x0v
        adc colTabT,x
        sta ptr
        lda rowPtrHiT,y
        adc #$00
        clc
        adc baseHi
        sta ptr+1
        lda y0v
        and #$03
        asl
        sta mi
        lda x0v
        and #$01
        ora mi
        sta mi
        lda dx
        cmp dy
        bcs lhmaj
        lda dy
        sta cnt
        inc cnt
        lsr
        sta err
        lda syflag
        bne lgvm
        jmp vplus
lgvm:   jmp vminus
lhmaj:  lda dx
        sta cnt
        inc cnt
        lsr
        sta err
        lda sxflag
        bne lghm
        jmp hplus
lghm:   jmp hminus

${hLoop('hplus', xStepHplus)}

${hLoop('hminus', xStepHminus)}

${vLoop('vplus', yStepVplus)}

${vLoop('vminus', yStepVminus)}`;

const asm = `
; ==== C64 char-mode framebuffer cube ====
bufA    = $0400
charset = $2800

ptr     = $02
baseHi  = $04
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
; --- math zp ---
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
cnt7    = $4c
showD018 = $4d
tglr    = $4f
zpc     = $50
iterLo  = $52
iterHi  = $53
remLo2  = $54
remHi2  = $55
bitn    = $56
tmpSX   = $57
tmpSY   = $58
mi      = $59
err     = $5a
cnt     = $5b
yInc    = $5c
sxflag  = $5d
syflag  = $5e

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
        lda #$00
        ldx #$00
ccf:    sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne ccf
        lda #>bufA
        sta baseHi

        ; initial angles
        lda #$00
        sta angA
        sta angB
        sta angC
        ; full-clear both buffers once (per-frame we only clear the cube rect)
        lda #$04
        sta baseHi
        jsr clearHidden
        lda #$20
        sta baseHi
        jsr clearHidden
        ; draw frame 0 into bufA
        lda #$04
        sta baseHi
        jsr clearRect
        jsr rotAll
        jsr drawEdges
        lda #$1a
        sta showD018
        lda #$20
        sta baseHi              ; next hidden = bufB

${loopAsm}

; clear the hidden buffer (page at baseHi, 1024 bytes)
clearHidden:
        lda #$00
        sta zpc
        lda baseHi
        sta zpc+1
        ldx #$04
        ldy #$00
        lda #$00
chl:    sta (zpc),y
        iny
        bne chl
        inc zpc+1
        dex
        bne chl
        rts

; clear the cube's bounding rect, padded (rows 3-22, cols 9-30 = 20x22)
clearRect:
        lda #129                ; row3*40 + col9
        sta zpc
        lda baseHi
        sta zpc+1
        ldx #20
crR:    ldy #21
        lda #$00
crC:    sta (zpc),y
        dey
        bpl crC
        clc
        lda zpc
        adc #40
        sta zpc
        bcc crN
        inc zpc+1
crN:    dex
        bne crR
        rts

; clear bufA cell rows 1-24 (skip row 0 = 40 bytes) for the counter
clearM3:
        lda #$00
        ldx #40
cm0:    sta $0400,x
        inx
        bne cm0
        ldx #$00
cm1:    sta $0500,x
        sta $0600,x
        sta $0700,x
        inx
        bne cm1
        rts

; draw 16-bit iter as dots (bit set -> 1 logical px at cx=bit*4, cy=0)
drawCounter:
        lda #$00
        ldx #$00
dcc:    sta $0400,x
        inx
        cpx #40
        bne dcc
        lda iterLo
        sta remLo2
        lda iterHi
        sta remHi2
        lda #$00
        sta bitn
dcl:    lda remLo2
        and #$01
        beq dcs
        lda bitn
        asl
        asl
        sta cx
        lda #$00
        sta cy
        jsr plot
dcs:    lsr remHi2
        ror remLo2
        inc bitn
        lda bitn
        cmp #16
        bne dcl
        rts

; ================= rotation of all 8 vertices =================
rotAll:
        ; trig lookups
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
        ; sAsB = asr7(sA*sB) ; cAsB = asr7(cA*sB)
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

        ; x2 = asr7( cB*X + sAsB*Y + cAsB*Z )
${setMul('cB','cvx')}
${accInit}
${setMul('sAsB','cvy')}
${accAdd}
${setMul('cAsB','cvz')}
${accAdd}
        jsr asr7
        lda accLo
        sta x2

        ; y2 = asr7( cA*Y - sA*Z )
${setMul('cA','cvy')}
${accInit}
${setMul('sA','cvz')}
${accSub}
        jsr asr7
        lda accLo
        sta y2

        ; sumX3 = cC*x2 - sC*y2 ; sx = 40 + asr9(sumX3)
${setMul('cC','x2')}
${accInit}
${setMul('sC','y2')}
${accSub}
        ; asr9: A = asr(accHi,1)
        lda accHi
        cmp #$80
        ror
        clc
        adc #40
        sta tmpSX
        ldx vi
        sta vsxT,x

        ; sumY3 = sC*x2 + cC*y2 ; sy = 50 + asr8(sumY3)
${setMul('sC','x2')}
${accInit}
${setMul('cC','y2')}
${accAdd}
        lda accHi
        clc
        adc #50
        sta tmpSY
        ldx vi
        sta vsyT,x

        ; opposite corner (7-vi) is the point reflection through the centre
        lda #7
        sec
        sbc vi
        tax
        lda #80
        sec
        sbc tmpSX
        sta vsxT,x
        lda #100
        sec
        sbc tmpSY
        sta vsyT,x

        inc vi
        lda vi
        cmp #4
        bcs rvDone
        jmp rvL
rvDone: rts

; asr7: arithmetic shift (accHi:accLo) right by 7, result low byte in accLo
asr7:   ldx #7
a7l:    lda accHi
        cmp #$80
        ror accHi
        ror accLo
        dex
        bne a7l
        rts

; ================= signed 8x8 -> 16 multiply (squares) =================
; mulA*mulB -> prodLo:prodHi (signed)
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
        tax                     ; s = ua+ub
        lda ua
        sec
        sbc ub
        bcs sdp
        eor #$ff
        clc
        adc #$01
sdp:    tay                     ; d = |ua-ub|
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

; ================= draw 12 edges =================
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

; ================= fast incremental line =================
${fastLine}

; ================= plot (cx,cy) — table-driven =================
plot:   ldy cy
        lda rowPtrLoT,y
        sta ptr
        lda rowPtrHiT,y
        clc
        adc baseHi
        sta ptr+1
        ldx cx
        lda colTabT,x
        clc
        adc ptr
        sta ptr
        bcc pnoc
        inc ptr+1
pnoc:   lda cx
        and #$01
        ora yrow2T,y            ; y still = cy
        tax
        lda maskT,x
        ldy #$00
        ora (ptr),y
        sta (ptr),y
        rts

; ================= data =================
rowPtrLoT: ${chunk(rowPtrLo).trim()}
rowPtrHiT: ${chunk(rowPtrHi).trim()}
yrow2T: ${chunk(yrow2).trim()}
colTabT: ${chunk(colTab).trim()}
maskT:  !byte ${maskTab.join(',')}
edgeTab: !byte ${edgeTab.join(',')}
vxT:    !byte ${vx.join(',')}
vyT:    !byte ${vy.join(',')}
vzT:    !byte ${vz.join(',')}
vsxT:   !fill 8,0
vsyT:   !fill 8,0
sinT:   ${chunk(sinTab).trim()}
sqrLoT: ${chunk(sqrLo).trim()}
sqrHiT: ${chunk(sqrHi).trim()}

        * = charset
${chunk(font, 32)}
`;

writeFileSync('./cube.asm', asm);
const r = assemble(asm);
writeFileSync('./cube.prg', Buffer.from(r.prg));
const d = D64.createEmpty('CUBE', '01');
d.writeFile('CUBE'.padEnd(6) + '/PRG', r.prg, D64.FILE_TYPE_PRG);
writeFileSync('./cube.d64', Buffer.from(d.getData()));
console.log(`ok: org=$${r.org.toString(16)} end=$${r.end.toString(16)} bytes=${r.bytes.length}`);
