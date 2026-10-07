// endscene.mjs -- the winning scene: the tree picture with the rack LEDs alive. Builds endscene.d64.
//
//   node tools/endscene.mjs [tree.kla] [tree-regions.json] [tree-nobrown.json] [--flutter]
//
// A multicolour bitmap (the Koala file, shown as converted) plus a small player that runs once per
// frame (60 Hz NTSC, synced to the raster), with interrupts off.
//
// LIGHTS. About a dozen small red, yellow and green dots in the racks (1-3 pixels, at least ~10 apart
// so each reads as its own light) -- chosen with a seeded shuffle, so a rebuild picks the same ones --
// each with one of two personalities:
//   STEADY: regular on/off, each with its own period (about half a second to two seconds, some
//     lopsided) and its own starting point in the cycle, so none line up. Two of them are SYNCED
//     PAIRS: two dots close together blinking as one, like twin status LEDs. That is the only sync.
//   ACTIVITY (disk/network): 1-4 frames on, 2-17 off, at random -- and now and then a pause of half a
//     second to two and a half seconds, the gaps between bursts of activity.
// "Off" is pixel code 00, the black background every block has.
//
// --flutter adds the leaf flutter (off by default; the user: "without any leaf movement for now"):
// a byte wholly of canopy leaf pixels (black/green/light green) has its 4 pixels rotated one place
// left or right and is restored 4-11 frames later; how many start per frame is a WIND taking a
// random step every half second. The leaf pattern moves, the colours never change, nothing drifts.
//
// Memory: $0801 BASIC stub, $0810 code, $0c00 light tables, $1000 flutter sites (2048, lo/hi split),
// $2000 bitmap, $3f40 screen and $4328 colour RAM data (copied to $0400/$d800 at start).
import { readFileSync, writeFileSync } from 'fs';
import { assemble } from '../asm6502.mjs';
await import('../d64lib.js');
const D64 = globalThis.D64;

const argv = process.argv.slice(2), FLUTTER = argv.includes('--flutter');
const [KLA = 'tree.kla', REGF = 'tree-regions.json', NBF = 'tree-nobrown.json'] = argv.filter(a => !a.startsWith('--'));
const NSITES = 2048, NSLOT = 24;
const k = readFileSync(KLA);
if (k.length !== 10003 || (k[0] | k[1] << 8) !== 0x6000) throw new Error(`${KLA} is not a Koala file`);
const bm = k.subarray(2, 8002), scr = k.subarray(8002, 9002), col = k.subarray(9002, 10002), bg = k[10002];
const reg = JSON.parse(readFileSync(REGF, 'utf8')).labels;
let nb = null; try { nb = JSON.parse(readFileSync(NBF, 'utf8')).mask; } catch {}

// seeded PRNG for the BUILD's choices (sampling, personalities), so a rebuild is identical
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---- the picture as 160x200 colour indices ----
const W = 160, H = 200;
const byteOf = (x, y) => (y >> 3) * 320 + (x >> 2) * 8 + (y & 7), shiftOf = x => 6 - 2 * (x & 3);
const codeAt = (x, y) => (bm[byteOf(x, y)] >> shiftOf(x)) & 3;
const colourAt = (x, y) => { const c = codeAt(x, y), cell = (y >> 3) * 40 + (x >> 2);
  return c === 0 ? bg : c === 1 ? scr[cell] >> 4 : c === 2 ? scr[cell] & 15 : col[cell] & 15; };
const labAt = (x, y) => reg[y * 320 + 2 * x] | reg[y * 320 + 2 * x + 1];
const nbAt = (x, y) => nb ? nb[y * 320 + 2 * x] | nb[y * 320 + 2 * x + 1] : 0;

// ---- LIGHTS: small single-colour dots of red (2), green (5) or yellow (7) in the racks ----
const DOT = { 2: 'red', 5: 'green', 7: 'yellow' }, seen = new Uint8Array(W * H), cands = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = colourAt(x, y);
  if (seen[y * W + x] || !(labAt(x, y) & (4 | 16)) || !DOT[c]) continue;
  const st = [[x, y]], px = []; seen[y * W + x] = 1;
  while (st.length) { const [a, b] = st.pop(); px.push([a, b]);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = a + dx, yy = b + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && !seen[yy * W + xx] && (labAt(xx, yy) & (4 | 16)) && colourAt(xx, yy) === c) {
        seen[yy * W + xx] = 1; st.push([xx, yy]); } } }
  // CLEARLY ON A RACK: no tree pixel (leaf/bark/overlap) within 3 pixels. Without this margin, green
  // leaf pixels at the canopy's edge and a yellow fleck on the trunk's edge passed as LEDs.
  const nearTree = px.some(([a, b]) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const xx = a + dx, yy = b + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && (labAt(xx, yy) & 3)) return true; } return false; });
  if (px.length <= 3 && !nearTree) cands.push({ c, px, cx: px.reduce((s, p) => s + p[0], 0) / px.length, cy: px.reduce((s, p) => s + p[1], 0) / px.length });
}
// distance on screen: a multicolour pixel is twice as wide as it is tall
const dist = (a, b) => Math.hypot(2 * (a.cx - b.cx), a.cy - b.cy);
const NSTEADY = 7, NACT = 5, MINGAP = 20;
// PAIRS FIRST, from dots that actually have a partner nearby (picking them afterwards left one
// without); then the rest in COLOUR ROTATION -- yellow, red, green -- because yellow is rare (7 dots)
// and a plain random pick missed it entirely.
const partnerOf = c => cands.filter(o => o !== c && dist(o, c) >= 3 && dist(o, c) <= 12)
  .sort((a, b) => (a.c !== c.c) - (b.c !== c.c) || dist(a, c) - dist(b, c))[0];
const chosen = [], spaced = c => chosen.every(o => dist(o, c) >= MINGAP);
for (const c of shuffle(cands.filter(partnerOf))) { if (chosen.length >= 2) break; if (spaced(c)) chosen.push(c); }
const byColour = [7, 2, 5].map(col => shuffle(cands.filter(c => c.c === col)));
for (let turn = 0; chosen.length < NSTEADY + NACT && turn < 3 * cands.length; turn++) {
  const pool = byColour[turn % 3], c = pool.find(o => !chosen.includes(o) && spaced(o));
  if (c) chosen.push(c);
}
// the first two steady lights each take their nearest unchosen partner (same colour if possible,
// within ~3-12 screen px) as a SYNCED PAIR
const used = new Set(chosen);
const lights = chosen.map((c, i) => {
  const dots = [c];
  if (i < 2) { const p = partnerOf(c); if (p && !used.has(p)) { dots.push(p); used.add(p); } }
  const bytes = new Map();
  for (const d of dots) for (const [x, y] of d.px) { const o = byteOf(x, y); bytes.set(o, (bytes.get(o) ?? 0) | (3 << shiftOf(x))); }
  return { kind: i < NSTEADY ? 'steady' : 'activity', colour: DOT[c.c], pair: dots.length > 1, at: [Math.round(c.cx), Math.round(c.cy)],
           bytes: [...bytes].map(([o, mask]) => ({ addr: 0x2000 + o, on: bm[o], off: bm[o] & ~mask & 255 })) };
});
// STEADY periods (frames on, frames off): each light its own, about 0.5-2 s, some lopsided; and a
// starting point anywhere in its cycle
const PERIODS = shuffle([[30, 30], [45, 45], [60, 60], [40, 80], [90, 30], [25, 50], [75, 75], [55, 35]]);
lights.forEach((l, i) => {
  if (l.kind === 'steady') { [l.onT, l.offT] = PERIODS[i % PERIODS.length]; l.phase = 1 + Math.floor(rnd() * l.onT); }
  else { l.onT = 0; l.offT = 0; l.pause = 10 + Math.floor(rnd() * 30); l.phase = 1 + Math.floor(rnd() * 60); }
});
const flat = lights.flatMap(l => l.bytes);
if (flat.length > 255) throw new Error(`${flat.length} light bytes; the table holds 255`);
const NL = lights.length;
console.log(`lights: ${NL} -- ` + lights.map(l => `${l.colour} ${l.kind}${l.pair ? ' PAIR' : ''}` +
  (l.kind === 'steady' ? ` ${l.onT}/${l.offT}` : '') + ` @${l.at}`).join('; '));

// ---- FLUTTER sites (only with --flutter): bytes wholly of leaf pixels in leaf colours ----
const LEAF = new Set([0, 5, 13]), sites = [];
if (FLUTTER) {
  for (let y = 0; y < H; y++) for (let bx = 0; bx < 40; bx++) {
    let ok = true; const codes = new Set();
    for (let p = 0; p < 4; p++) { const x = bx * 4 + p, l = labAt(x, y);
      if (!(((l & 1) && l !== 2) || nbAt(x, y)) || !LEAF.has(colourAt(x, y))) { ok = false; break; }
      codes.add(codeAt(x, y)); }
    if (ok && codes.size > 1) sites.push(byteOf(bx * 4, y));
  }
  if (sites.length < 64) throw new Error(`only ${sites.length} flutter sites -- are the regions for this picture?`);
  shuffle(sites);
  console.log(`flutter: ${sites.length} leaf sites`);
}
const table = FLUTTER ? Array.from({ length: NSITES }, (_, i) => 0x2000 + sites[i % sites.length]) : [];

const B = a => a.map(v => '$' + (v & 255).toString(16).padStart(2, '0')).join(',');
const rows = (a, n = 32) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(`        !byte ${B(a.slice(i, i + n))}`); return o.join('\n'); };
let first = 0; const lfirst = lights.map(l => { const f = first; first += l.bytes.length; return f; });

const flutterCode = `
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
sdone:`;

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
        ldx #${NL - 1}      ; every light starts ON (as in the picture), each at its own point
li:     lda #$01            ;   in its cycle
        sta lstate,x
        lda lphase,x
        sta ltimer,x
        dex
        bpl li

frame:  lda $d011           ; once per frame: wait for line 250 (the bottom border)
        bmi frame
fw:     lda $d012
        cmp #$fa
        bne fw
${FLUTTER ? flutterCode : ''}
        ; ---- lights: when a light's time is up it toggles, then picks its next wait ----
        ldx #${NL - 1}
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
        lda lmode,x
        bne act
        lda lstate,x        ; STEADY: its own fixed on-time and off-time
        beq stoff
        lda lonT,x
        jmp lset
stoff:  lda loffT,x
        jmp lset
act:    lda lstate,x        ; ACTIVITY: on 1-4 frames...
        beq actoff
        jsr rnd
        and #$03
        clc
        adc #$01
        jmp lset
actoff: jsr rnd             ; ...off 2-17, but sometimes a pause between bursts
        cmp lpause,x
        bcs actsh
        jsr rnd
        and #$7f
        clc
        adc #$1e
        jmp lset
actsh:  jsr rnd
        and #$0f
        clc
        adc #$02
lset:   sta ltimer,x
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
ltimer: !fill ${NL},0
lstate: !fill ${NL},0

        * = $0c00
lfirst:
${rows(lfirst)}
lcount:
${rows(lights.map(l => l.bytes.length))}
lmode:
${rows(lights.map(l => l.kind === 'steady' ? 0 : 1))}
lonT:
${rows(lights.map(l => l.onT))}
loffT:
${rows(lights.map(l => l.offT))}
lpause:
${rows(lights.map(l => l.pause ?? 0))}
lphase:
${rows(lights.map(l => l.phase))}
baddrlo:
${rows(flat.map(b => b.addr & 255))}
baddrhi:
${rows(flat.map(b => b.addr >> 8))}
bon:
${rows(flat.map(b => b.on))}
boff:
${rows(flat.map(b => b.off))}
${FLUTTER ? `
        * = $1000
sitelo:
${rows(table.map(a => a & 255))}
sitehi:
${rows(table.map(a => a >> 8))}` : 'sitelo = $1000'}

        * = $2000
${rows([...bm])}
scrdat:
${rows([...scr, ...Array(24).fill(0)])}
coldat:
${rows([...col, ...Array(24).fill(0)])}
`;
const out = assemble(src);
const L = out.labels;
if (L.stimer + 4 * NSLOT + 2 * NL > 0x0c00) throw new Error('the player ran into its light tables at $0c00');
if (FLUTTER && L.sitehi !== 0x1800) throw new Error(`sitehi at $${L.sitehi.toString(16)}, the code assumes sitelo + $800`);
if (L.scrdat !== 0x3f40) throw new Error('bitmap is not 8000 bytes');
const d = D64.createEmpty('THE TREE', '01');
d.writeFile('END', Buffer.from(out.prg), D64.FILE_TYPE_PRG);
writeFileSync('endscene.d64', Buffer.from(d.getData()));
console.log(`endscene.d64: END ${out.prg.length - 2} bytes, $0801-$${(0x0801 + out.prg.length - 3).toString(16)}${FLUTTER ? ' (with leaf flutter)' : ''}`);
