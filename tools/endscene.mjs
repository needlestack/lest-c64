// endscene.mjs -- the winning scene: the tree picture, gently alive. Builds endscene.d64.
//
//   node tools/endscene.mjs [tree.kla] [tree-regions.json] [tree-nobrown.json]
//
// A multicolour bitmap (the Koala file, shown as converted) plus a small player that, every frame:
//
// LEAVES FLUTTER. A flutter takes one bitmap byte -- 4 multicolour pixels side by side -- that lies
// wholly in the canopy and holds only leaf colours (black/green/light green), rotates its pixels one
// place left or right, and puts the byte back 4-11 frames later. Moving the leaf pattern instead of
// recolouring it leaves the canopy's brightness and colours exactly as converted, and restoring every
// byte means the picture can never drift, however long it runs.
//
// NOTHING IS PERIODIC. Sites come from a 16-bit LFSR; how many flutters start per frame is a WIND
// that takes a random step every half second, so the canopy sometimes stirs and sometimes rests.
//
// LIGHTS BLINK. The coloured spots in the racks (treeseg's racks/lights region, non-grey colours) are
// grouped into blobs and the biggest LIGHTS kept. Each has a temperament -- busy (rapid flicker),
// slow (long on, long off) or steady (mostly on, brief blinks) -- and draws a fresh random on-time and
// off-time every cycle, so no two keep step and none repeats. "Off" is pixel code 00, the black
// background every block has.
//
// Memory: $0801 BASIC stub, $0810 code, $0c00 light tables, $1000 flutter sites (2048, lo/hi split),
// $2000 bitmap, $3f40 screen and $4328 colour RAM data (copied to $0400/$d800 at start).
import { readFileSync, writeFileSync } from 'fs';
import { assemble } from '../asm6502.mjs';
await import('../d64lib.js');
const D64 = globalThis.D64;

const [KLA = 'tree.kla', REGF = 'tree-regions.json', NBF = 'tree-nobrown.json'] = process.argv.slice(2);
const NLIGHTS = 14, NSITES = 2048;
const k = readFileSync(KLA);
if (k.length !== 10003 || (k[0] | k[1] << 8) !== 0x6000) throw new Error(`${KLA} is not a Koala file`);
const bm = k.subarray(2, 8002), scr = k.subarray(8002, 9002), col = k.subarray(9002, 10002), bg = k[10002];
const reg = JSON.parse(readFileSync(REGF, 'utf8')).labels;
let nb = null; try { nb = JSON.parse(readFileSync(NBF, 'utf8')).mask; } catch {}

// seeded PRNG for the BUILD's choices (sampling, temperaments), so a rebuild is identical
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };

// ---- the picture as 160x200 colour indices ----
const W = 160, H = 200;
const byteOf = (x, y) => (y >> 3) * 320 + (x >> 2) * 8 + (y & 7), shiftOf = x => 6 - 2 * (x & 3);
const codeAt = (x, y) => (bm[byteOf(x, y)] >> shiftOf(x)) & 3;
const colourAt = (x, y) => { const c = codeAt(x, y), cell = (y >> 3) * 40 + (x >> 2);
  return c === 0 ? bg : c === 1 ? scr[cell] >> 4 : c === 2 ? scr[cell] & 15 : col[cell] & 15; };
const labAt = (x, y) => reg[y * 320 + 2 * x] | reg[y * 320 + 2 * x + 1];
const nbAt = (x, y) => nb ? nb[y * 320 + 2 * x] | nb[y * 320 + 2 * x + 1] : 0;

// ---- flutter sites: bytes wholly of leaf pixels in leaf colours, not all one code ----
const LEAF = new Set([0, 5, 13]), sites = [];
for (let y = 0; y < H; y++) for (let bx = 0; bx < 40; bx++) {
  let ok = true; const codes = new Set();
  for (let p = 0; p < 4; p++) { const x = bx * 4 + p, l = labAt(x, y);
    if (!(((l & 1) && !(l === 2)) || nbAt(x, y)) || !LEAF.has(colourAt(x, y))) { ok = false; break; }
    codes.add(codeAt(x, y)); }
  if (ok && codes.size > 1) sites.push(byteOf(bx * 4, y));
}
if (sites.length < 64) throw new Error(`only ${sites.length} flutter sites -- are the regions for this picture?`);
for (let i = sites.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sites[i], sites[j]] = [sites[j], sites[i]]; }
const table = Array.from({ length: NSITES }, (_, i) => 0x2000 + sites[i % sites.length]);

// ---- lights: coloured blobs in the racks ----
const GREY = new Set([0, 1, 11, 12, 15, 8, 9]), seen = new Uint8Array(W * H), blobs = [];
const isLight = (x, y) => (labAt(x, y) & (4 | 16)) && !GREY.has(colourAt(x, y));
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!seen[y * W + x] && isLight(x, y)) {
  const st = [[x, y]], px = []; seen[y * W + x] = 1;
  while (st.length) { const [a, b] = st.pop(); px.push([a, b]);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = a + dx, yy = b + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && !seen[yy * W + xx] && isLight(xx, yy)) { seen[yy * W + xx] = 1; st.push([xx, yy]); } } }
  blobs.push(px);
}
blobs.sort((a, b) => b.length - a.length);
const lights = blobs.slice(0, NLIGHTS).map(px => {
  const bytes = new Map();
  for (const [x, y] of px) { const o = byteOf(x, y); bytes.set(o, (bytes.get(o) ?? 0) | (3 << shiftOf(x))); }
  return [...bytes].map(([o, mask]) => ({ addr: 0x2000 + o, on: bm[o], off: bm[o] & ~mask & 255 }));
});
// temperaments: [onMin, onMask, offMin, offMask] in frames -- a random on/off time each cycle is
// min + (rnd & mask)
const TEMPER = { busy: [3, 15, 2, 15], slow: [60, 127, 30, 63], steady: [150, 255, 3, 7] };
const kinds = lights.map((_, i) => ['busy', 'slow', 'steady'][Math.floor(rnd() * 3)]);
const flat = lights.flat();
if (flat.length > 255) throw new Error(`${flat.length} light bytes; the table holds 255`);
console.log(`flutter: ${sites.length} leaf sites (table of ${NSITES}); lights: ${lights.length} -- ` +
  lights.map((l, i) => `${kinds[i]}:${l.length}`).join(' '));

const B = a => a.map(v => '$' + (v & 255).toString(16).padStart(2, '0')).join(',');
const rows = (a, n = 32) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(`        !byte ${B(a.slice(i, i + n))}`); return o.join('\n'); };
const NSLOT = 24;
const src = `
        * = $0801
        !byte $0b,$08,$0a,$00,$9e,$32,$30,$36,$34,$00,$00,$00    ; 10 SYS2064
seedlo  = $fb
seedhi  = $fc
ptr     = $fd               ; and $fe
tgt     = $f9               ; and $fa
wind    = $f8
windt   = $f7
cnt     = $f6
        * = $0810
        sei
        lda #$00
        sta $d020
        lda #${bg}
        sta $d021
        ldx #$00            ; screen and colour data into place: 4 pages each (the last runs over
cp:     lda scrdat,x        ;   the 1000 bytes by 24 -- harmless, the data is padded)
        sta $0400,x
        lda scrdat+$100,x
        sta $0500,x
        lda scrdat+$200,x
        sta $0600,x
        lda scrdat+$300,x
        sta $0700,x
        lda coldat,x
        sta $d800,x
        lda coldat+$100,x
        sta $d900,x
        lda coldat+$200,x
        sta $da00,x
        lda coldat+$300,x
        sta $db00,x
        inx
        bne cp
        lda #$3b            ; bitmap mode, screen on
        sta $d011
        lda #$18            ; multicolour
        sta $d016
        lda #$18            ; screen $0400, bitmap $2000 (VIC bank 0)
        sta $d018
        lda $dc04           ; seed the LFSR from a running CIA timer: every run differs
        ora #$01
        sta seedlo
        lda $dc05
        sta seedhi
        lda #$01
        sta wind
        lda #$1e
        sta windt
        ldx #${NLIGHTS - 1}         ; every light starts on, each with its own first wait
li:     lda #$01
        sta lstate,x
        jsr rnd
        and #$3f
        ora #$01
        sta ltimer,x
        dex
        bpl li

frame:  lda $d011           ; once per frame: wait for line 250 (the bottom border)
        bmi frame
fw:     lda $d012
        cmp #$fa
        bne fw
        ; ---- the WIND: a random step every ~half second, kept within 0..3 ----
        dec windt
        bne nowind
        lda #$1e
        sta windt
        jsr rnd
        and #$03
        beq wdn             ; 1 in 4 down, 1 in 4 up, else hold
        cmp #$01
        bne nowind
        lda wind
        cmp #$03
        beq nowind
        inc wind
        jmp nowind
wdn:    lda wind
        beq nowind
        dec wind
nowind:
        ; ---- age the flutters; put a byte back when its time is up ----
        ldx #${NSLOT - 1}
age:    lda stimer,x
        beq age2
        dec stimer,x
        bne age2
        lda slo,x
        sta tgt
        lda shi,x
        sta tgt+1
        ldy #$00
        lda sorig,x
        sta (tgt),y
age2:   dex
        bpl age
        ; ---- start up to WIND new flutters ----
        lda wind
        sta cnt
spawn:  lda cnt
        beq sdone
        dec cnt
        ldx #${NSLOT - 1}   ; a free slot
fs:     lda stimer,x
        beq got
        dex
        bpl fs
        jmp sdone
got:    jsr rnd             ; a random site: 11 bits index the lo/hi tables
        sta ptr
        lda seedhi
        and #$07
        clc
        adc #>sitelo
        sta ptr+1
        ldy #$00
        lda (ptr),y
        sta tgt
        lda ptr+1
        clc
        adc #$08            ; sitehi is sitelo + $800
        sta ptr+1
        lda (ptr),y
        sta tgt+1
        ldy #${NSLOT - 1}   ; already fluttering? then skip it this time (its saved byte is the
bz:     lda stimer,y        ;   real one; a second save would capture the rotated byte)
        beq bz2
        lda slo,y
        cmp tgt
        bne bz2
        lda shi,y
        cmp tgt+1
        beq spawn
bz2:    dey
        bpl bz
        lda tgt
        sta slo,x
        lda tgt+1
        sta shi,x
        ldy #$00
        lda (tgt),y
        sta sorig,x
        pha
        jsr rnd             ; lifetime 4..11 frames
        and #$07
        clc
        adc #$04
        sta stimer,x
        lda seedhi          ; ...and a direction
        lsr
        pla
        bcs rr
        asl                 ; rotate the 4 pixels LEFT one place (2 bits, circular)
        adc #$00
        asl
        adc #$00
        jmp wr
rr:     lsr                 ; ...or RIGHT one place
        bcc rr1
        ora #$80
rr1:    lsr
        bcc wr
        ora #$80
wr:     ldy #$00
        sta (tgt),y
        jmp spawn
sdone:
        ; ---- lights ----
        ldx #${NLIGHTS - 1}
lt:     dec ltimer,x
        bne lt9
        lda lstate,x
        eor #$01
        sta lstate,x
        stx cnt
        lda lfirst,x        ; write this light's bytes, on or off
        tay
        lda lcount,x
        sta ptr
lw:     lda baddrlo,y
        sta tgt
        lda baddrhi,y
        sta tgt+1
        lda lstate,x
        beq loff
        lda bon,y
        jmp lput
loff:   lda boff,y
lput:   sty ptr+1
        ldy #$00
        sta (tgt),y
        ldy ptr+1
        iny
        dec ptr
        bne lw
        ldx cnt
        jsr rnd             ; next wait: min + (rnd & mask) for the new state
        ldy lstate,x
        beq lof2
        and lonmask,x
        clc
        adc lonmin,x
        jmp lset
lof2:   and loffmask,x
        clc
        adc loffmin,x
lset:   bne lset2
        lda #$01
lset2:  sta ltimer,x
lt9:    dex
        bpl lt
        jmp frame

        ; 16-bit Galois LFSR (taps $b400); returns the low byte in A
rnd:    lsr seedhi
        ror seedlo
        bcc rnd1
        lda seedhi
        eor #$b4
        sta seedhi
rnd1:   lda seedlo
        rts

stimer: !fill ${NSLOT},0
slo:    !fill ${NSLOT},0
shi:    !fill ${NSLOT},0
sorig:  !fill ${NSLOT},0
ltimer: !fill ${NLIGHTS},0
lstate: !fill ${NLIGHTS},0

        * = $0c00
lfirst:
${rows(lights.map((l, i) => lights.slice(0, i).reduce((n, m) => n + m.length, 0)))}
lcount:
${rows(lights.map(l => l.length))}
lonmin:
${rows(kinds.map(t => TEMPER[t][0]))}
lonmask:
${rows(kinds.map(t => TEMPER[t][1]))}
loffmin:
${rows(kinds.map(t => TEMPER[t][2]))}
loffmask:
${rows(kinds.map(t => TEMPER[t][3]))}
baddrlo:
${rows(flat.map(b => b.addr & 255))}
baddrhi:
${rows(flat.map(b => b.addr >> 8))}
bon:
${rows(flat.map(b => b.on))}
boff:
${rows(flat.map(b => b.off))}

        * = $1000
sitelo:
${rows(table.map(a => a & 255))}
sitehi:
${rows(table.map(a => a >> 8))}

        * = $2000
${rows([...bm])}
scrdat:
${rows([...scr, ...Array(24).fill(0)])}
coldat:
${rows([...col, ...Array(24).fill(0)])}
`;
const out = assemble(src);
const L = out.labels;
if (L.lfirst < 0x0c00 || L.stimer + 4 * NSLOT + 2 * NLIGHTS > 0x0c00) throw new Error('the player ran into its light tables at $0c00');
if (L.sitehi !== 0x1800) throw new Error(`sitehi at $${L.sitehi.toString(16)}, the code assumes sitelo + $800`);
if (L.scrdat !== 0x3f40) throw new Error('bitmap is not 8000 bytes');
const d = D64.createEmpty('THE TREE', '01');
d.writeFile('END', Buffer.from(out.prg), D64.FILE_TYPE_PRG);
writeFileSync('endscene.d64', Buffer.from(d.getData()));
console.log(`endscene.d64: END ${out.prg.length - 2} bytes, $0801-$${(0x0801 + out.prg.length - 3).toString(16)}`);
