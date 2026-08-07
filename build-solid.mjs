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
const R = 40;
const vx = [], vy = [], vz = [];
for (let i = 0; i < 8; i++) { vx.push(((i&1)?R:-R)&0xFF); vy.push(((i&2)?R:-R)&0xFF); vz.push(((i&4)?R:-R)&0xFF); }
// cube edge = vertex pair differing in exactly one coordinate bit (12 edges)
const edges = [];
for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const x = i ^ j; if ((x & (x - 1)) === 0) edges.push([i, j]); }
const edgeTab = []; for (const [a,b] of edges) edgeTab.push(a,b);
// 6 faces, each 4 vertex indices ordered CCW as seen from OUTSIDE (consistent winding)
const coord = i => [(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1];
function faceVerts(axis, val) {
  let idx = []; for (let i = 0; i < 8; i++) if (coord(i)[axis] === val) idx.push(i);
  const o1 = (axis + 1) % 3, o2 = (axis + 2) % 3;
  idx.sort((p, q) => Math.atan2(coord(p)[o1], coord(p)[o2]) - Math.atan2(coord(q)[o1], coord(q)[o2]));
  const a = coord(idx[0]), b = coord(idx[1]), c = coord(idx[2]);
  const e1 = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], e2 = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
  const n = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
  if (n[axis] * val < 0) idx.reverse();
  return idx;
}
const faces = [];
for (const axis of [0, 1, 2]) for (const val of [1, -1]) faces.push(faceVerts(axis, val));
const faceTab = []; for (const f of faces) faceTab.push(...f);

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
const TIMING = process.env.TIMING === '1';
const tOn = TIMING ? '        lda #$02\n        sta $d020\n' : '';
const tOff = TIMING ? '        lda #$00\n        sta $d020\n' : '';
const vsyncLoop = `floop:  lda $d012
        cmp #250
        bne floop               ; sync to raster line 250 (bottom border)
        lda showD018
        sta $d018               ; flip: show finished buffer (safe, in border)
${tOn}        jsr clearHidden
        jsr rotAll
        jsr renderCube
${tOff}        lda baseHi
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
        jsr renderCube
${advAngles}
        jmp mfl`;
// MEASURE2: raster-IRQ frame counter. Render 128 frames flat-out, count
// elapsed video frames via IRQ, then draw that count as a bar (80 px/row).
// frames_per_iter = barpixels/128 ; fps = 60/(frames_per_iter) = 7680/barpixels.
const measLoop2 = `        sei
        lda #<m2irq
        sta $0314
        lda #>m2irq
        sta $0315
        lda #$01
        sta $d01a               ; enable raster IRQ
        lda #$00
        sta $d012
        lda $d011
        and #$7f
        sta $d011
        lda #$7f
        sta $dc0d               ; disable CIA IRQ
        lda $dc0d
        lda #$00
        sta fcLo
        sta fcHi
        lda #$04
        sta baseHi
        lda #$1a
        sta $d018
        cli
        lda #128
        sta itcnt
m2l:    jsr clearHidden
        jsr rotAll
        jsr renderCube
${advAngles}
        dec itcnt
        bne m2l
        sei
        lda #$00
        sta drawMode
        jsr clearHidden
        ; draw fc pixels as a bar (80 per row) into bufA
        lda fcLo
        sta remLo2
        lda fcHi
        sta remHi2
        lda #$00
        sta cx
        sta cy
m2bar:  lda remLo2
        ora remHi2
        beq m2done
        jsr plot
        inc cx
        lda cx
        cmp #80
        bne m2dec
        lda #$00
        sta cx
        inc cy
m2dec:  lda remLo2
        bne m2dl
        dec remHi2
m2dl:   dec remLo2
        jmp m2bar
m2done: lda #$1a
        sta $d018
m2halt: jmp m2halt
m2irq:  inc fcLo
        bne m2iack
        inc fcHi
m2iack: lda #$ff
        sta $d019
        jmp $ea31`;
const loopAsm = process.env.MEASURE2 === '1' ? measLoop2 : (MEASURE ? measLoop : vsyncLoop);

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
drawMode = $4e
tglr    = $4f
zpc     = $50
; --- fill / cull zp ---
ei      = $52
curY    = $53
spanL   = $54
spanR   = $55
den     = $56
numLo   = $57
numHi   = $58
remLo   = $59
remHi   = $5a
dsign   = $5b
fymin   = $5c
fymax   = $5d
faceI   = $5e
fbase   = $5f
axv     = $60
ayv     = $61
bxv     = $62
byv     = $63
cxv     = $64
cyv     = $65
crLo    = $66
crHi    = $67
fcLo    = $68
fcHi    = $69
itcnt   = $6a
remLo2  = $6b
remHi2  = $6c

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
        ; draw frame 0 into bufA
        lda #$04
        sta baseHi
        jsr clearHidden
        jsr rotAll
        jsr renderCube
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
        ldx vi
        sta vsyT,x

        inc vi
        lda vi
        cmp #8
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

; ================= render: cull -> fill faces -> white edges =================
renderCube:
        lda #$00
        sta drawMode
        jsr cullAll
        ; fill visible faces (black)
        lda #$00
        sta faceI
rcf:    ldx faceI
        lda frontT,x
        beq rcnf
        jsr fillFace
rcnf:   inc faceI
        lda faceI
        cmp #$06
        bcc rcf
        ; white edges of visible faces (clear pixels)
        lda #$01
        sta drawMode
        lda #$00
        sta faceI
rce:    ldx faceI
        lda frontT,x
        beq rcne
        jsr drawFaceEdges
rcne:   inc faceI
        lda faceI
        cmp #$06
        bcc rce
        lda #$00
        sta drawMode
        rts

; ---- back-face cull: frontT[f] = 1 if face f faces viewer ----
cullAll:
        lda #$00
        sta faceI
caL:    lda faceI
        asl
        asl
        sta fbase
        ldx fbase
        lda faceTab,x
        tax
        lda vsxT,x
        sta axv
        lda vsyT,x
        sta ayv
        ldx fbase
        inx
        lda faceTab,x
        tax
        lda vsxT,x
        sta bxv
        lda vsyT,x
        sta byv
        lda fbase
        clc
        adc #$02
        tax
        lda faceTab,x
        tax
        lda vsxT,x
        sta cxv
        lda vsyT,x
        sta cyv
        ; cross = (bx-ax)*(cy-ay) - (by-ay)*(cx-ax)
        lda bxv
        sec
        sbc axv
        sta mulA
        lda cyv
        sec
        sbc ayv
        sta mulB
        jsr smul
        lda prodLo
        sta crLo
        lda prodHi
        sta crHi
        lda byv
        sec
        sbc ayv
        sta mulA
        lda cxv
        sec
        sbc axv
        sta mulB
        jsr smul
        sec
        lda crLo
        sbc prodLo
        sta crLo
        lda crHi
        sbc prodHi
        sta crHi
        ldx faceI
        lda crHi
        bmi cfront
        lda #$00
        sta frontT,x
        jmp cnext
cfront: lda #$01
        sta frontT,x
cnext:  inc faceI
        lda faceI
        cmp #$06
        bcc caL
        rts

; ---- fill one convex quad face (faceI) via active-edge scanline ----
fillFace:
        lda faceI
        asl
        asl
        sta fbase
        ; load 4 screen verts into fxT/fyT
        ldx #$00
ffld:   txa
        clc
        adc fbase
        tay
        lda faceTab,y
        tay
        lda vsxT,y
        sta fxT,x
        lda vsyT,y
        sta fyT,x
        inx
        cpx #$04
        bne ffld
        ; setup 4 edges
        ldx #$00
ffed:   stx ei
        txa
        clc
        adc #$01
        and #$03
        tay                     ; Y = next index
        lda fyT,x
        cmp fyT,y
        bcc fftop
        beq fftop
        ; next is top
        lda fyT,y
        sta eYlo,x
        lda fxT,y
        sta eXcH,x
        lda #$00
        sta eXcL,x
        lda fyT,x
        sec
        sbc fyT,y
        sta den
        lda fyT,x
        clc
        adc #$01
        sta eYhi,x
        lda fxT,x
        sec
        sbc fxT,y
        jmp ffslope
fftop:  lda fyT,x
        sta eYlo,x
        lda fxT,x
        sta eXcH,x
        lda #$00
        sta eXcL,x
        lda fyT,y
        sec
        sbc fyT,x
        sta den
        lda fyT,y
        clc
        adc #$01
        sta eYhi,x
        lda fxT,y
        sec
        sbc fxT,x
ffslope: sta tmp                ; tmp = dxE (signed)
        lda den
        bne ffnz
        ; horizontal edge -> inactive, slope 0
        lda eYlo,x
        sta eYhi,x
        lda #$00
        sta eSlL,x
        sta eSlH,x
        jmp ffednext
ffnz:   lda tmp
        bpl ffdpos
        eor #$ff
        clc
        adc #$01
        sta numHi
        lda #$01
        sta dsign
        jmp ffdiv
ffdpos: sta numHi
        lda #$00
        sta dsign
ffdiv:  lda #$00
        sta numLo
        jsr udiv
        ldx ei
        lda numLo
        sta eSlL,x
        lda numHi
        sta eSlH,x
        lda dsign
        beq ffednext
        sec
        lda #$00
        sbc eSlL,x
        sta eSlL,x
        lda #$00
        sbc eSlH,x
        sta eSlH,x
ffednext: ldx ei
        inx
        cpx #$04
        beq ffedone
        jmp ffed
ffedone:
        ; ymin/ymax over fyT
        lda fyT+0
        sta fymin
        sta fymax
        ldx #$01
ffmm:   lda fyT,x
        cmp fymin
        bcs ffnmin
        sta fymin
ffnmin: lda fyT,x
        cmp fymax
        bcc ffnmax
        sta fymax
ffnmax: inx
        cpx #$04
        bne ffmm
        ; scanline loop
        lda fymin
        sta curY
ffsl:   lda #$ff
        sta spanL
        lda #$00
        sta spanR
        ldx #$00
ffae:   lda curY
        cmp eYlo,x
        bcc ffnx
        lda curY
        cmp eYhi,x
        bcs ffnx
        lda eXcH,x
        cmp spanL
        bcs ffnoL
        sta spanL
ffnoL:  lda eXcH,x
        cmp spanR
        bcc ffnoR
        sta spanR
ffnoR:  clc
        lda eXcL,x
        adc eSlL,x
        sta eXcL,x
        lda eXcH,x
        adc eSlH,x
        sta eXcH,x
ffnx:   inx
        cpx #$04
        bne ffae
        jsr fillSpan
        lda curY
        cmp fymax
        bcs ffdone
        inc curY
        jmp ffsl
ffdone: rts

; ---- fill horizontal span [spanL,spanR] at curY (uses plot in OR mode) ----
fillSpan:
        lda spanL
        cmp spanR
        beq fs1
        bcs fsret               ; spanL>spanR -> empty
fs1:    lda curY
        sta cy
        lda spanL
        sta cx
fsl:    jsr plot
        lda cx
        cmp spanR
        bcs fsret
        inc cx
        jmp fsl
fsret:  rts

; ---- draw the 4 edges of face faceI (drawMode set by caller) ----
drawFaceEdges:
        lda faceI
        asl
        asl
        sta fbase
        ldx #$00
dfe:    stx ei
        txa
        clc
        adc fbase
        tay
        lda faceTab,y
        tay
        lda vsxT,y
        sta x0v
        lda vsyT,y
        sta y0v
        lda ei
        clc
        adc #$01
        and #$03
        clc
        adc fbase
        tay
        lda faceTab,y
        tay
        lda vsxT,y
        sta x1v
        lda vsyT,y
        sta y1v
        jsr lineDraw
        ldx ei
        inx
        cpx #$04
        bne dfe
        rts

; ---- unsigned divide numLo:numHi / den -> quotient in numLo:numHi ----
udiv:   lda #$00
        sta remLo
        sta remHi
        ldx #$10
udl:    asl numLo
        rol numHi
        rol remLo
        rol remHi
        lda remLo
        sec
        sbc den
        tay
        lda remHi
        sbc #$00
        bcc udno
        sty remLo
        sta remHi
        inc numLo
udno:   dex
        bne udl
        rts

; ================= draw 12 edges (wireframe, unused in solid) =================
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

; ================= Bresenham line =================
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
        ldx drawMode
        bne pclr
        ldy #$00
        ora (ptr),y
        sta (ptr),y
        rts
pclr:   eor #$ff                ; clear (white edge): AND inverse mask
        ldy #$00
        and (ptr),y
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
faceTab: !byte ${faceTab.join(',')}
frontT: !fill 6,0
fxT:    !fill 4,0
fyT:    !fill 4,0
eYlo:   !fill 4,0
eYhi:   !fill 4,0
eXcL:   !fill 4,0
eXcH:   !fill 4,0
eSlL:   !fill 4,0
eSlH:   !fill 4,0
sinT:   ${chunk(sinTab).trim()}
sqrLoT: ${chunk(sqrLo).trim()}
sqrHiT: ${chunk(sqrHi).trim()}

        * = charset
${chunk(font, 32)}
`;

writeFileSync('./cube-solid.asm', asm);
const r = assemble(asm);
writeFileSync('./cube-solid.prg', Buffer.from(r.prg));
const d = D64.createEmpty('CUBESOLID', '01');
d.writeFile('CUBE'.padEnd(6) + '/PRG', r.prg, D64.FILE_TYPE_PRG);
writeFileSync('./cube-solid.d64', Buffer.from(d.getData()));
console.log(`ok: org=$${r.org.toString(16)} end=$${r.end.toString(16)} bytes=${r.bytes.length}`);
console.log('faces:', JSON.stringify(faces));
