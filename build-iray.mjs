// build-iray.mjs — char-framebuffer raycaster, 21 rays interpolated to 80 columns.
// Cast 21 rays across the FOV, record half-height + side per ray. Interpolate the
// wall height across each 4-pixel gap: CONTINUOUS gaps (same side, small height
// delta) lerp smoothly; DISCONTINUOUS gaps (corner / depth jump) snap a hard step.
// Emit 80 independent logical columns into the 256-char framebuffer via bit-spread.
// B&W, 8-bit DDA. ESDF turn/move. MEASURE=1 -> flat-out + fps counter.
import { writeFileSync } from 'fs';
import { assemble } from './asm6502.mjs';
await import('./d64lib.js');
const D64 = globalThis.D64;
const chunk = (arr, per = 24, ind = '        ') => { const o = []; for (let i = 0; i < arr.length; i += per) o.push(ind + '!byte ' + Array.from(arr.slice(i, i + per)).join(',')); return o.join('\n'); };

// 256-char font: code bit = logical pixel. Per cell = 2 logical cols (L,R) x 4 rows.
// group g (rows 2g..2g+1): bit(7-2g)=Left nibble(0xF0), bit(6-2g)=Right nibble(0x0F)
const font = new Uint8Array(256 * 8);
for (let c = 0; c < 256; c++) for (let r = 0; r < 8; r++) { const g = r >> 1, lb = 7 - g * 2, rb = 6 - g * 2; font[c * 8 + r] = (((c >> lb) & 1) ? 0xF0 : 0) | (((c >> rb) & 1) ? 0x0F : 0); }

const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r => r.split('').map(Number));
const map = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) map.push(M[y][x]);

// 16-bit fixed point: 256 units = 1 cell (8.8). deltaDist = 256/|dir|, clamp 65535.
const SCALE = 256;
const ddxLo = [], ddxHi = [], ddyLo = [], ddyHi = [], posX = [], posY = [];
for (let a = 0; a < 256; a++) {
  const cx = Math.cos(a / 256 * 2 * Math.PI), sy = Math.sin(a / 256 * 2 * Math.PI);
  const dx = Math.min(65535, Math.round(SCALE / Math.max(1e-3, Math.abs(cx))));
  const dy = Math.min(65535, Math.round(SCALE / Math.max(1e-3, Math.abs(sy))));
  ddxLo.push(dx & 255); ddxHi.push(dx >> 8); ddyLo.push(dy & 255); ddyHi.push(dy >> 8);
  posX.push(cx >= 0 ? 1 : 0); posY.push(sy >= 0 ? 1 : 0);
}
const NLOG = 80, FOV = 47;              // one ray per output column (option B)
// RECTILINEAR projection: columns spaced by atan (flat image plane) + per-column
// cos-correction of the distance. Fixes the fisheye arch AND makes wall height linear.
const CTR = (NLOG - 1) / 2, HALF_UNITS = FOV / 2, TANHALF = Math.tan(HALF_UNITS / 256 * 2 * Math.PI);
const rayOff = [], cosCorr = [];
for (let c = 0; c < NLOG; c++) {
  const camX = (c - CTR) / CTR * TANHALF;
  rayOff.push(Math.round(Math.atan(camX) / (2 * Math.PI) * 256) & 255);
  cosCorr.push(Math.min(255, Math.round(256 / Math.sqrt(1 + camX * camX))));
}
// half-height LUT indexed by perpDist>>3 (units of 1/32 cell) for finer vertical steps.
// half-height 0..49 directly (no >>1 rounding loss). 44 half-px at 1 cell (index 32).
// split into two 256-entry pages: hLUTa = index 0..255, hLUTb = 256..511.
const hLUTa = [], hLUTb = [];
for (let i = 0; i < 256; i++) { let h = Math.round(1408 / Math.max(1, i)); hLUTa.push(Math.max(0, Math.min(127, h))); }  // UNCAPPED (127) so merged spans interpolate the true (linear) height; renderSym caps at 50 on draw
for (let i = 256; i < 512; i++) { hLUTb.push(Math.max(0, Math.min(50, Math.round(1408 / i)))); }

// ===== connected-wall-run ids =====
// "Same wall" = same CONTIGUOUS run of wall faces, not merely the same plane. Two wall
// segments split by a hallway are different runs -> the merge won't span the gap. A run =
// maximal contiguous wall cells along a plane whose facing side is open (so the face is one
// visible flat surface). Four face directions; each cell gets the run id for the face a ray
// would hit from that side. This makes the face-merge exact (no gap-fill) with no precompute.
const mapW = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? 1 : map[y * 16 + x];
const runW = new Array(256).fill(0), runE = new Array(256).fill(0), runN = new Array(256).fill(0), runS = new Array(256).fill(0);
let nextRun = 1;
for (let x = 0; x < 16; x++) {          // vertical planes: west/east faces, contiguous in y
  let wp = false, ep = false, wId = 0, eId = 0;
  for (let y = 0; y < 16; y++) {
    const wf = mapW(x, y) && !mapW(x - 1, y), ef = mapW(x, y) && !mapW(x + 1, y);
    if (wf) { if (!wp) wId = nextRun++; runW[y * 16 + x] = wId; } wp = wf;
    if (ef) { if (!ep) eId = nextRun++; runE[y * 16 + x] = eId; } ep = ef;
  }
}
for (let y = 0; y < 16; y++) {          // horizontal planes: north/south faces, contiguous in x
  let np = false, sp = false, nId = 0, sId = 0;
  for (let x = 0; x < 16; x++) {
    const nf = mapW(x, y) && !mapW(x, y - 1), sf = mapW(x, y) && !mapW(x, y + 1);
    if (nf) { if (!np) nId = nextRun++; runN[y * 16 + x] = nId; } np = nf;
    if (sf) { if (!sp) sId = nextRun++; runS[y * 16 + x] = sId; } sp = sf;
  }
}
if (nextRun - 1 > 255) throw new Error(`too many wall runs (${nextRun - 1}) for a byte id`);
console.error(`connected-wall-run ids: ${nextRun - 1} (byte-sized) — merge by run, gap-safe, no precompute`);
// Per-frame step, in 1/256ths of a map cell (px/py are 8.8 fixed point). Must stay well
// under 256: moveApply only collision-tests the DESTINATION cell, so a step approaching a
// full cell would tunnel through walls. 36/256 = 0.14 cells is safe.
const MOVE_STEP = 36;                   // was 24; 1.5x
const moveX = [], moveY = [];
for (let a = 0; a < 256; a++) { moveX.push(Math.round(Math.cos(a / 256 * 2 * Math.PI) * MOVE_STEP) & 255); moveY.push(Math.round(Math.sin(a / 256 * 2 * Math.PI) * MOVE_STEP) & 255); }
const f0Lo = [], f0Hi = [], f1Lo = [], f1Hi = [];
for (let i = 0; i < 256; i++) { const v = Math.floor(i * i / 4); f0Lo.push(v & 255); f0Hi.push((v >> 8) & 255); }
for (let i = 256; i < 512; i++) { const v = Math.floor(i * i / 4); f1Lo.push(v & 255); f1Hi.push((v >> 8) & 255); }
// bit-spread: 4-bit vertical pattern (bit k = row k) -> byte with bits at cell positions.
// Left col occupies bit (7-2k); Right col occupies bit (6-2k).
const spreadL = [], spreadR = [];
for (let p = 0; p < 16; p++) { let l = 0, r = 0; for (let k = 0; k < 4; k++) if (p & (1 << k)) { l |= 1 << (7 - 2 * k); r |= 1 << (6 - 2 * k); } spreadL.push(l); spreadR.push(r); }
const fromTop = [0xF, 0xE, 0xC, 0x8];   // rows >= m within a cell
const fromBot = [0x1, 0x3, 0x7, 0xF];   // rows <= m within a cell
// patTab[cr*64 + h] = 4-bit vertical wall pattern for cell-row cr (0..12), half-height h.
// Wall spans logical rows [50-h, 49+h] (symmetric about the 49.5 mirror axis).
const patTab = new Array(13 * 64).fill(0);
for (let cr = 0; cr < 13; cr++) for (let h = 0; h <= 50; h++) {
  let p = 0; for (let k = 0; k < 4; k++) { const R = 4 * cr + k; if (R >= 50 - h && R <= 49 + h) p |= (1 << k); }
  patTab[cr * 64 + h] = p;
}
// flip[code] = vertically-mirrored cell (swap logical-row groups g0<->g3, g1<->g2)
const flip = [];
for (let c = 0; c < 256; c++) { const b = i => (c >> i) & 1; flip.push((b(1) << 7) | (b(0) << 6) | (b(3) << 5) | (b(2) << 4) | (b(5) << 3) | (b(4) << 2) | (b(7) << 1) | b(6)); }
// 3x5 digit glyphs (each row = 3 bits, bit2 = left column)
const digGlyph = [
 7,5,5,5,7, 2,6,2,2,7, 7,1,7,4,7, 7,1,7,1,7, 5,5,7,1,1,          // 0-4
 7,4,7,1,7, 7,4,7,5,7, 7,1,2,2,2, 7,5,7,5,7, 7,5,7,1,7,          // 5-9
 2,5,7,5,5, 6,5,6,5,6, 7,4,4,4,7, 6,5,5,5,6, 7,4,6,4,7, 7,4,6,4,4, // A-F (hex, glyph idx = nibble)
 5,5,2,5,5, 5,5,2,2,2];                                          // X (16), Y (17) labels
const bit1 = [1, 2, 4, 8];              // 1<<(row&3)
const colBit = [4, 2, 1];               // column mask left->right
// per cell-row: half-height >= t1 => cell fully solid; < tb => cell fully blank
const t1Tab = [], tbTab = [];
for (let cr = 0; cr < 13; cr++) { t1Tab.push(Math.max(0, 50 - 4 * cr)); tbTab.push(Math.max(0, 47 - 4 * cr)); }
const rowLo = [], rowHi = []; for (let R = 0; R < 25; R++) { rowLo.push((R * 40) & 255); rowHi.push((R * 40) >> 8); }

const MEASURE = process.env.MEASURE === '1';
const SPIN = process.env.SPIN === '1';   // diagnostic: auto-rotate, ignore input
const NORAY = process.env.NORAY === '1'; // diagnostic: skip marching/subdivision
const NOFILL = process.env.NOFILL === '1'; // diagnostic: skip renderSym (fill)
// diagnostic: static start angle, e.g. PA=4f. Angle-dependent glitches are far easier to
// pin here than under SPIN -- a fixed angle makes the frame reproducible, so a plain
// -exitscreenshot run is comparable across builds without breakpointing the frame counter.
const PA = process.env.PA ? parseInt(process.env.PA, 16) & 0xff : 0;
// Angle units per frame while the joystick is held. The angle byte is a full turn in 256
// steps, so this is also the angular resolution of the view -- rayOff/cosCorr are indexed
// by the same byte, so turning cannot be made smooth by shrinking this, only coarser by
// growing it. 6/256 = 8.4 degrees per frame.
const TURN_STEP = 6;                    // was 3; 2x
const WALK = process.env.WALK === '1'; // diagnostic: auto-walk forward (sweeps frac through 0)
const STRAFE = process.env.STRAFE === '1'; // diagnostic: auto-strafe (parallel to walls)
const BACK = process.env.BACK === '1'; // diagnostic: auto-walk backward

// ---- VIC bank 0 memory layout ----
// The double buffer flips between two 1KB screen matrices. Both are RAM the renderer
// WRITES every frame, so any table overlapping one gets shredded a frame at a time --
// and because only one buffer is affected, the two banks then disagree and the display
// alternates between a good and a corrupt image. Buffer B used to sit at $2000, which
// overlapped the tail of patTab ($1d61-$20a1); drawDbg's black plate landed on
// patTab[cr=11][h=3..5], the live partial-fill entries for the cell row just above the
// horizon. Kept at $2400 so the whole data segment clears it; enforced by the guard
// after assemble(), which checks every reserved region, not just the charset.
const SCR_A = 0x0400;
const SCR_B = 0x2400;
const CHARSET = 0x2800;
const FTABLES = 0x3000;                 // f0Lo/f0Hi/f1Lo/f1Hi + run-id tables
// $d018: bits 7-4 = video matrix / 1024, bits 3-1 = charset / 2048
const d018 = scr => ((scr >> 10) << 4) | ((CHARSET >> 11) << 1);
const hx = n => '$' + n.toString(16).padStart(2, '0');

const asm = `
charset = ${hx(CHARSET)}
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
        lda #${hx(d018(SCR_A))}
        sta $d018               ; display buffer A, chars ${hx(CHARSET)}
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
        lda #${hx(PA)}
        sta pa
        lda #${hx(SCR_A >> 8)}
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

mloop:  ${SPIN ? 'inc pa' : WALK ? 'jsr moveFwd' : STRAFE ? 'jsr strafeR' : BACK ? 'jsr moveBack' : 'jsr readKeys'}
${NORAY ? '        jmp subDn' : ''}
        ; ---- adaptive subdivision: march only at connected-wall-run boundaries ----
        lda #$00
        sta col
        jsr marchCol            ; column 0
        lda #${NLOG - 1}
        sta col
        jsr marchCol            ; column 79
        lda #$00
        sta stackLT
        lda #${NLOG - 1}
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
${NOFILL ? '' : '        jsr renderSym'}
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
        cmp #${hx(SCR_A >> 8)}
        bne mshB
        lda #${hx(d018(SCR_A))}
        sta $d018               ; show A, draw into B
        lda #${hx(SCR_B >> 8)}
        sta baseHi
        jmp mnext
mshB:   lda #${hx(d018(SCR_B))}
        sta $d018               ; show B, draw into A
        lda #${hx(SCR_A >> 8)}
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
        cpx #${NLOG}
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
        sbc #${hx(TURN_STEP)}
        sta pa
rkJR:   lda joyv
        and #$08
        bne rkJD                ; joystick-1 right = turn right
        lda pa
        clc
        adc #${hx(TURN_STEP)}
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
mapT:   ${chunk(map, 16).trim()}
rayOffT: !byte ${rayOff.join(',')}
cosCorrT: !byte ${cosCorr.join(',')}
ddxLoT: ${chunk(ddxLo).trim()}
ddxHiT: ${chunk(ddxHi).trim()}
ddyLoT: ${chunk(ddyLo).trim()}
ddyHiT: ${chunk(ddyHi).trim()}
posXT:  ${chunk(posX).trim()}
posYT:  ${chunk(posY).trim()}
hLUTaT: ${chunk(hLUTa).trim()}
hLUTbT: ${chunk(hLUTb).trim()}
moveXT: ${chunk(moveX).trim()}
moveYT: ${chunk(moveY).trim()}
spreadLT: !byte ${spreadL.join(',')}
spreadRT: !byte ${spreadR.join(',')}
fromTopT: !byte ${fromTop.join(',')}
fromBotT: !byte ${fromBot.join(',')}
rowLoT: !byte ${rowLo.join(',')}
rowHiT: !byte ${rowHi.join(',')}
bit1T:  !byte ${bit1.join(',')}
colBitT: !byte ${colBit.join(',')}
digGlyphT: !byte ${digGlyph.join(',')}
flipT:  ${chunk(flip).trim()}
t1TabT: !byte ${t1Tab.join(',')}
tbTabT: !byte ${tbTab.join(',')}
patTabT: ${chunk(patTab).trim()}
; sideT / idT / colH are per-frame mutable arrays in scratch RAM at $c100+ (see equates)
dataEnd:                        ; guard: must clear both screen buffers AND the charset -- see the layout check in build-iray.mjs

        * = charset
${chunk(font, 32)}

        * = $3000
f0LoT:  ${chunk(f0Lo).trim()}
f0HiT:  ${chunk(f0Hi).trim()}
f1LoT:  ${chunk(f1Lo).trim()}
f1HiT:  ${chunk(f1Hi).trim()}
; connected-wall-run id tables (indexed by cell id) live above the f-tables in free RAM
runWT: !byte ${runW.join(',')}
runET: !byte ${runE.join(',')}
runNT: !byte ${runN.join(',')}
runST: !byte ${runS.join(',')}
`;

writeFileSync('./iray.asm', asm);
try {
  const r = assemble(asm);
  // Layout guard. The old version only checked the charset, which is why buffer B at
  // $2000 silently ate the tail of patTab for weeks: a screen buffer looks like free RAM
  // to the assembler but is rewritten every frame. Check every region the data segment
  // must not touch, and name the overlap so the next collision is a build error rather
  // than a glitch three cell-rows wide near the horizon.
  const reserved = [
    ['screen buffer A', SCR_A, SCR_A + 0x400],
    ['screen buffer B', SCR_B, SCR_B + 0x400],
    ['charset', CHARSET, CHARSET + 0x800],
    ['f-tables', FTABLES, FTABLES + 0x800],
  ];
  const dataLo = r.org, dataHi = r.labels.dataEnd;
  for (const [name, lo, hi] of reserved) {
    if (dataLo < hi && dataHi > lo) {
      throw new Error(`data segment $${dataLo.toString(16)}-$${dataHi.toString(16)} overlaps ${name} ` +
        `$${lo.toString(16)}-$${hi.toString(16)} by ${Math.min(dataHi, hi) - Math.max(dataLo, lo)} bytes ` +
        `(move tables above the f-tables)`);
    }
  }
  writeFileSync('./iray.prg', Buffer.from(r.prg));
  const d = D64.createEmpty('IRAY', '01');
  d.writeFile('IMAZE'.padEnd(6) + '/PRG', r.prg, D64.FILE_TYPE_PRG);
  // Single canonical disk. Every build overwrites it, so "the disk in the project root"
  // is always the current build -- no -ntsc/-merge/foundation variants to get stale and
  // mislead. iray.asm/iray.prg are the matching support files for diffing and label lookup.
  writeFileSync('./latest.d64', Buffer.from(d.getData()));
  console.log(`ok: rays=${NLOG} org=$${r.org.toString(16)} end=$${r.end.toString(16)} bytes=${r.bytes.length} -> latest.d64`);
} catch (e) { console.error('ASM ERROR:', e.message); process.exit(1); }
