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
const NLOG = 160, FOV = 47;             // one ray per output column (160 logical cols)
// RECTILINEAR projection: columns spaced by atan (flat image plane) + per-column
// cos-correction of the distance. Fixes the fisheye arch AND makes wall height linear.
const CTR = (NLOG - 1) / 2, HALF_UNITS = FOV / 2, TANHALF = Math.tan(HALF_UNITS / 256 * 2 * Math.PI);
const rayOff = [], cosCorr = [];
for (let c = 0; c < NLOG; c++) {
  const camX = (c - CTR) / CTR * TANHALF;
  rayOff.push(Math.round(Math.atan(camX) / (2 * Math.PI) * 256) & 255);
  cosCorr.push(Math.min(255, Math.round(256 / Math.sqrt(1 + camX * camX))));
}
// Half-height from distance. Indexed by perpDist>>3 (1/32-cell units); 88 half-px at one
// cell. Left UNCAPPED at 254 so merged spans interpolate the true (linear) height --
// prepCells caps at 100 on draw.
//
// The rectilinear cos correction depends ONLY on the column, never on the player, so it is
// folded in here rather than multiplied onto every ray's distance. That deletes one whole
// sideMul (two 8x16 multiplies) per ray, which was ~16% of castRay. Cost is one table per
// quantised cosine group: 16 groups keeps the drawn-height error to at most 1px (measured
// over every column x distance pair), for 12KB.
//
// Each group covers 768 entries = exactly 3 pages, so the asm picks a group by ADDING a
// page offset -- no multiply, no shifts. 768 entries spans 24 cells, more than the 22.6
// cell diagonal of a 16x16 map, so nothing in range is ever clamped away (the old code
// clamped past 16 cells and drew those walls at height 1).
const HGROUPS = 16, HSPAN = 768;
const ccLo = Math.min(...cosCorr), ccHi = Math.max(...cosCorr);
const hGrpOf = cosCorr.map(v => Math.min(HGROUPS - 1, Math.floor((v - ccLo) / (ccHi - ccLo + 1e-9) * HGROUPS)));
const hRep = [...Array(HGROUPS)].map((_, g) => { const m = cosCorr.filter((_, i) => hGrpOf[i] === g);
  return m.length ? Math.round((Math.min(...m) + Math.max(...m)) / 2) : ccLo; });
const colGrpT = hGrpOf.map(g => g * 3);         // page offset of this column's group
const hTab = [];
for (let g = 0; g < HGROUPS; g++) for (let j = 0; j < HSPAN; j++)
  hTab.push(Math.max(0, Math.min(254, Math.round(2816 / (Math.max(1, j) * hRep[g] / 256)))));

// ===== connected-wall-run ids =====
// "Same wall" = same CONTIGUOUS run of wall faces, not merely the same plane. Two wall
// segments split by a hallway are different runs -> the merge won't span the gap. A run =
// maximal contiguous wall cells along a plane whose facing side is open (so the face is one
// visible flat surface). Four face directions; each cell gets the run id for the face a ray
// would hit from that side. This makes the face-merge exact (no gap-fill) with no precompute.
// castRay drops its bounds check and steps a single cell index by +-1 / +-16, both of
// which are only safe because a ray can never leave the grid. That holds iff the border is
// solid all the way round -- assert it rather than trust it.
for (let i = 0; i < 16; i++) {
  if (!map[i] || !map[15 * 16 + i] || !map[i * 16] || !map[i * 16 + 15])
    throw new Error(`map border must be solid: castRay has no bounds check (row/col ${i} is open)`);
}
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
// ===================== MULTICOLOR 4x8 CELL CHARSET =====================
// Multicolor text mode: a cell is 4 logical pixels wide x 8 tall (each pixel 2 physical
// px wide, 1 tall) => 160x200 logical in the same 1000 screen bytes. Bit pair per pixel:
// 00 = $d021 (ceiling/floor), 01 = $d022 (wall). Pixel k occupies bits (7-2k, 6-2k), so
// a wall pixel contributes 1<<(6-2k).
//
// A cell is described by [f0..f3] = wall pixels counted UP FROM THE CELL BOTTOM in each
// of the 4 columns. Only 253 of the 2^32 possible cells are ever needed, because under
// rectilinear projection the wall top is a straight line across a face -- see
// analyze-4x8*.mjs / analyze-final.mjs for the derivation and the measured error.
//
// Index: (wL, wR, bulge). wL/wR are the clamped end columns; bulge distinguishes the
// three interior shapes the endpoints alone cannot separate (a step cannot be told from
// a ramp by its endpoints). Straight-line interior sum is exactly wL+wR, which makes the
// bulge test a subtraction: (w1+w2)-(w0+w3).
const CLO = -2, CHI = 10, CN = CHI - CLO + 1;   // endpoint clamp range -> 13 levels
// Step levels are quantised. Walls are vertical prisms, so a face boundary is EXACTLY a
// vertical line on screen and the renderer reads its position straight out of faceIdT --
// no inference. But three step positions x a full 9x9 level cross product is 243 codes on
// its own, so levels are quantised: fine at the extremes (a saturated side must land
// exactly on 0 or 8) and coarse in the middle where 1px is invisible.
const STEPQ = [0, 1, 3, 5, 7, 8];
const C8 = x => Math.max(0, Math.min(8, x));
const qstep = v => STEPQ.reduce((b, q) => Math.abs(q - v) < Math.abs(b - v) ? q : b, STEPQ[0]);
const rampPat = (a, b) => [0, 1, 2, 3].map(k => C8(Math.round(a + (b - a) * k / 3)));
const stepPat = (A, B, k) => [0, 1, 2, 3].map(i => i < k ? A : B);
// 3x5 digit glyphs (each row = 3 bits, bit2 = left column). In the new scheme these are
// whole CHARACTERS, not plotted pixels -- the readout pokes a char code instead of ORing
// bits into a framebuffer, which is what let the old overlay corrupt renderer tables.
const digGlyph = [
 7,5,5,5,7, 2,6,2,2,7, 7,1,7,4,7, 7,1,7,1,7, 5,5,7,1,1,          // 0-4
 7,4,7,1,7, 7,4,7,5,7, 7,1,2,2,2, 7,5,7,5,7, 7,5,7,1,7,          // 5-9
 2,5,7,5,5, 6,5,6,5,6, 7,4,4,4,7, 6,5,5,5,6, 7,4,6,4,7, 7,4,6,4,4, // A-F (glyph idx = nibble)
 5,5,2,5,5, 5,5,2,2,2];                                          // X (16), Y (17) labels
const NGLYPH = digGlyph.length / 5;

// --- assign char codes: cell patterns first, then the 18 readout glyphs ---
const codeOf = new Map(), glyphs = [];          // glyphs[code] = 8 bytes of multicolor bitmap
const patBytes = p => [...Array(8)].map((_, i) =>
  (p[0] > 7 - i ? 0x40 : 0) | (p[1] > 7 - i ? 0x10 : 0) | (p[2] > 7 - i ? 0x04 : 0) | (p[3] > 7 - i ? 0x01 : 0));
function intern(p) { const k = p.join(','); if (!codeOf.has(k)) { codeOf.set(k, glyphs.length); glyphs.push(patBytes(p)); } return codeOf.get(k); }
intern([0, 0, 0, 0]); intern([8, 8, 8, 8]);     // BLANK=0 SOLID=1: the fast-fill constants
for (let a = CLO; a <= CHI; a++) for (let b = CLO; b <= CHI; b++) intern(rampPat(a, b));
for (let k = 1; k <= 3; k++) for (const A of STEPQ) for (const B of STEPQ) intern(stepPat(A, B, k));
const CELLCODES = glyphs.length;
const GLYPH0 = glyphs.length;                   // first readout glyph code
for (let g = 0; g < NGLYPH; g++) {
  const rows = digGlyph.slice(g * 5, g * 5 + 5);
  glyphs.push([...Array(8)].map((_, i) => { const r = (i >= 1 && i <= 5) ? rows[i - 1] : 0;
    return ((r >> 2 & 1) ? 0x40 : 0) | ((r >> 1 & 1) ? 0x10 : 0) | ((r & 1) ? 0x04 : 0); }));
}
if (glyphs.length > 256) throw new Error(`charset overflow: ${CELLCODES} cell patterns + ${NGLYPH} glyphs = ${glyphs.length} > 256`);
console.error(`charset: ${CELLCODES} cell patterns + ${NGLYPH} readout glyphs = ${glyphs.length}/256`);
// charset A, and charset B = every glyph flipped vertically. The raster split at the
// horizon selects B for the bottom half, so ONE char code renders as its own mirror
// there -- renderSym writes the identical byte to both halves and needs no flip table.
const fontA = new Uint8Array(256 * 8), fontB = new Uint8Array(256 * 8);
for (let c = 0; c < 256; c++) { const g = glyphs[c] || [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 8; i++) { fontA[c * 8 + i] = g[i]; fontB[c * 8 + i] = g[7 - i]; } }
// rampT[wL*16 + wR] -> char code, for a cell covering a single wall face.
const rampT = new Array(CN * 16).fill(0);
for (let a = 0; a < CN; a++) for (let b = 0; b < CN; b++) rampT[a * 16 + b] = codeOf.get(rampPat(a + CLO, b + CLO).join(','));
// stepT<k>[qA*8 + qB] -> char code, for a cell whose face boundary falls at column k.
const stepT = [1, 2, 3].map(k => { const t = new Array(6 * 8).fill(0);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) t[i * 8 + j] = codeOf.get(stepPat(STEPQ[i], STEPQ[j], k).join(','));
  return t; });
// clampT output (level+2, 0..12) -> index into STEPQ.
const qIdxT = [...Array(CN)].map((_, v) => STEPQ.indexOf(qstep(C8(v + CLO))));

// ---- unrolled fill chains ----
// A straight line of store instructions, one slot per cell row, each with its screen
// address baked into the instruction. Jumping INTO the middle of that line writes exactly
// the rows from that slot to the end -- so a run of identical cells costs one jump plus
// ~5 cycles per cell, with no loop counter, no per-cell test and no address arithmetic.
// The descending chain paints the ceiling run above the wall top; the ascending one paints
// the solid run below it. Each slot also stores the MIRRORED row, so one pass covers both
// halves of the screen (row 12 is its own mirror, hence the single store there).
// One pair of chains per screen buffer, since the addresses are baked in.
const chainSrc = (nm, base, rows, tail) => rows.map(r => {
  const a = base + r * 40, b = base + (24 - r) * 40;
  return `${nm}${r}:` + `\tsta ${hx16(a)},x` + (r === 12 ? '' : `\n\tsta ${hx16(b)},x`);
}).join('\n') + `\n\tjmp ${tail}`;
const ROWSD = [...Array(13)].map((_, i) => 12 - i), ROWSA = [...Array(13)].map((_, i) => i);
// rbT[maxHeight] = first cell row that is not fully ceiling; rsT[minHeight] = first row
// that is fully wall. Derived from fill = h + 8R - 92, so they replace a per-cell test
// with one table lookup per column.
const rbT = [...Array(256)].map((_, cmx) => cmx > 92 ? 0 : Math.floor((92 - cmx) / 8) + 1);
const rsT = [...Array(256)].map((_, cmn) => cmn >= 100 ? 0 : Math.ceil((100 - cmn) / 8));
// entry tables: blk indexed by rb (target row rb-1), sld indexed by rs (target row rs)
const blkEnt = sel => ['0', ...ROWSA.map(r => `${sel}bkA${r}`)].concat(['0', ...ROWSA.map(r => `${sel}bkB${r}`)]).join(',');
const sldEnt = sel => [...ROWSA.map(r => `${sel}slA${r}`), '0'].concat([...ROWSA.map(r => `${sel}slB${r}`), '0']).join(',');
// clampT[(h + K) as signed byte] -> level 0..12. K = 8R-92 is negative for every row above
// the horizon, so the sum is genuinely signed; h is pre-capped at 100 so it cannot wrap.
const clampT = [...Array(256)].map((_, i) => { const v = i < 128 ? i : i - 256;
  return Math.max(CLO, Math.min(CHI, v)) - CLO; });
const BLANK = codeOf.get('0,0,0,0'), SOLID = codeOf.get('8,8,8,8');
// kTab[R] = 8R-92 as a two's-complement byte: fill = h + kTab[R], clamped to 0..8.
const kTab = [...Array(13)].map((_, R) => (8 * R - 92) & 255);
// per cell-row: cell is fully solid when min height >= t1, fully blank when max < tb.
// fill = h + 8R - 92, so solid at fill>=8 and blank at fill<=0.
const t1Tab = [], tbTab = [];
for (let R = 0; R < 13; R++) { t1Tab.push(100 - 8 * R); tbTab.push(Math.max(0, 93 - 8 * R)); }
const rowLo = [], rowHi = []; for (let R = 0; R < 25; R++) { rowLo.push((R * 40) & 255); rowHi.push((R * 40) >> 8); }

const MEASURE = process.env.MEASURE === '1';
const SPIN = process.env.SPIN === '1';   // diagnostic: auto-rotate, ignore input
const NORAY = process.env.NORAY === '1'; // diagnostic: skip marching/subdivision
const NOFILL = process.env.NOFILL === '1'; // diagnostic: skip renderSym (fill)
// diagnostic: static start angle, e.g. PA=4f. Angle-dependent glitches are far easier to
// pin here than under SPIN -- a fixed angle makes the frame reproducible, so a plain
// -exitscreenshot run is comparable across builds without breakpointing the frame counter.
const PA = process.env.PA ? parseInt(process.env.PA, 16) & 0xff : 0;
// PX/PY: exact 8.8 start position, matching the on-screen readout's cell.frac hex
// (e.g. the readout showing X=273 is PX=273). Lets a screenshot be replayed exactly.
const PX = process.env.PX ? parseInt(process.env.PX, 16) & 0xffff : 0x0180;
const PY = process.env.PY ? parseInt(process.env.PY, 16) & 0xffff : 0x0180;
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
// VIC bank 0 is now EXACTLY full -- two screen buffers, two charsets and the f-tables
// leave no free 1K/2K-aligned slot. Any new table must live above $4000 (see NEWTABLES).
const SCR_A = 0x0400;
const SCR_B = 0x2400;
const CHARSET = 0x2800;                 // charset A: upright glyphs, used above the horizon
const FTABLES = 0x3000;                 // f0Lo/f0Hi/f1Lo/f1Hi + run-id tables
const CHARSET_B = 0x3800;               // charset B: every glyph flipped vertically
const NEWTABLES = 0x4000;               // clampT / rampT / stepT, outside VIC bank 0
const HTABLE = 0x4800;                  // page-aligned: 16 height tables x 3 pages
// $d018: bits 7-4 = video matrix / 1024, bits 3-1 = charset / 2048
const vm = scr => (scr >> 10) << 4;
const cb = cs => (cs >> 11) << 1;
const CB_A = cb(CHARSET), CB_B = cb(CHARSET_B);
// Raster line of the horizon. The 25-row display window starts at raster 51, so logical
// row 100 is raster 151; arm the split one line early so the swap lands before that line's
// character fetch.
const SPLITLINE = 150;
const hx = n => '$' + n.toString(16).padStart(2, '0');
const hx16 = n => '$' + n.toString(16).padStart(4, '0');

const asm = `
charset = ${hx(CHARSET)}
charsetB = ${hx(CHARSET_B)}
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
        lda #${hx(vm(SCR_A))}
        sta d018vm              ; display buffer A; IRQ ORs the charset bits per half-screen
        lda #${hx(vm(SCR_A) | CB_A)}
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
        lda #${hx(PX & 255)}
        sta px
        lda #${hx(PX >> 8)}
        sta px+1
        lda #${hx(PY & 255)}
        sta py
        lda #${hx(PY >> 8)}
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
${NOFILL ? '' : '        jsr prepCells\n        jsr renderSym'}
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
        lda #${hx(vm(SCR_A))}
        sta d018vm              ; show A, draw into B (IRQ ORs in the charset bits)
        lda #${hx(SCR_B >> 8)}
        sta baseHi
        jmp mnext
mshB:   lda #${hx(vm(SCR_B))}
        sta d018vm              ; show B, draw into A
        lda #${hx(SCR_A >> 8)}
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
        cmp #${hx(SCR_A >> 8)}
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
        lda #${hx(BLANK)}       ; A must be loaded last: the chain stores it as-is
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
        lda #${hx(SOLID)}
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
; The player is a small square, not a point. Testing only the centre let you stand with
; your face flat against a wall at distance 0, which looks wrong and drives the wall height
; to absurd values (88/d). Radius is a hardcoded 26/256 = 0.10 cells -- computing it per
; frame would be pointless, it never changes.
;
; Note this does NOT stop colH from saturating: that needs 0.35 cells of clearance, which
; would feel like walking in a padded corridor. Saturation is handled properly in the
; span-merge instead (see subLp).
mvchk:  sec                     ; cx0 = (nx - r) >> 8
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
        bcs mvno
        lda cx1
        cmp #16
        bcs mvno
        lda cy0
        cmp #16
        bcs mvno
        lda cy1
        cmp #16
        bcs mvno
        lda cy0                 ; all four corners must be open
        asl
        asl
        asl
        asl
        sta tmp
        ora cx0
        tax
        lda mapT,x
        bne mvno
        lda tmp
        ora cx1
        tax
        lda mapT,x
        bne mvno
        lda cy1
        asl
        asl
        asl
        asl
        sta tmp
        ora cx0
        tax
        lda mapT,x
        bne mvno
        lda tmp
        ora cx1
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
        cmp #${hx(SPLITLINE)}
        bcs irqSplit
        ; --- top of frame: select charset A, arm the split ---
        lda d018vm
        ora #${hx(CB_A)}
        sta $d018
        lda #${hx(SPLITLINE)}
        sta $d012
        inc frameCnt
        bne irqd
        inc frameCnt+1
        jmp irqd
irqSplit:
        lda d018vm              ; --- horizon: select mirrored charset B ---
        ora #${hx(CB_B)}
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
        adc #${hx(GLYPH0)}
        sta (ppPtr),y
        iny
        lda fpsOnes
        clc
        adc #${hx(GLYPH0)}
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
        adc #${hx(GLYPH0)}
        sta (ppPtr),y
        iny
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
colGrpT: !byte ${colGrpT.join(',')}
moveXT: ${chunk(moveX).trim()}
moveYT: ${chunk(moveY).trim()}
rowLoT: !byte ${rowLo.join(',')}
rowHiT: !byte ${rowHi.join(',')}
kTabT:  !byte ${kTab.join(',')}
col4T:  !byte ${[...Array(40)].map((_, i) => i * 4).join(',')}
rbT:    ${chunk(rbT).trim()}
rsT:    ${chunk(rsT).trim()}
blkLoT: !byte ${blkEnt('<')}
blkHiT: !byte ${blkEnt('>')}
sldLoT: !byte ${sldEnt('<')}
sldHiT: !byte ${sldEnt('>')}
t1TabT: !byte ${t1Tab.join(',')}
tbTabT: !byte ${tbTab.join(',')}
; sideT / idT / colH are per-frame mutable arrays in scratch RAM at $c100+ (see equates)
dataEnd:                        ; guard: must clear both screen buffers AND the charset -- see the layout check in build-iray.mjs

        * = charset
${chunk(fontA, 32)}

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

        * = charsetB            ; charset A with every glyph's 8 bytes reversed
${chunk(fontB, 32)}

        * = ${hx16(NEWTABLES)}  ; VIC bank 0 is full -- these live above it
clampT: ${chunk(clampT).trim()}
qIdxT:  !byte ${qIdxT.join(',')}
rampT:  ${chunk(rampT).trim()}
stepT1: ${chunk(stepT[0]).trim()}
stepT2: ${chunk(stepT[1]).trim()}
stepT3: ${chunk(stepT[2]).trim()}
${chainSrc('bkA', SCR_A, ROWSD, 'rfEdge')}
${chainSrc('bkB', SCR_B, ROWSD, 'rfEdge')}
${chainSrc('slA', SCR_A, ROWSA, 'rfNext')}
${chainSrc('slB', SCR_B, ROWSA, 'rfNext')}
chainEnd:
        * = ${hx16(HTABLE)}
hTabT:  ${chunk(hTab, 32).trim()}
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
    ['charset A', CHARSET, CHARSET + 0x800],
    ['f-tables', FTABLES, FTABLES + 0x800],
    ['charset B', CHARSET_B, CHARSET_B + 0x800],
  ];
  if (r.labels.chainEnd > HTABLE)
    throw new Error(`fill chains end at $${r.labels.chainEnd.toString(16)}, past the height tables at $${HTABLE.toString(16)}`);
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
