// endscene.mjs -- the winning scene: the tree picture with the rack LEDs alive. Builds endscene.d64.
//
//   node tools/endscene.mjs [tree.kla] [tree-regions.json] [tree-nobrown.json] [--noleaves]
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
// LEAVES TURN (--noleaves to stop them): small squares of leaf pixels, 2x2 or 3x3, rotate 90 degrees
// for 2-5 frames and turn back -- a flick, then stillness -- at random sites across the canopy, as
// many per frame as a WIND that takes a random step every half second. See the LEAVES section.
// Memory: $0801 BASIC stub, $0810 code, $0c00 light tables, $2000 bitmap, $3f40 screen and $4328
// colour RAM data (copied to $0400/$d800 at start), $5000 leaf-site tables (nine 1K fields).
import { readFileSync, writeFileSync } from 'fs';
import { assemble } from '../asm6502.mjs';
await import('../d64lib.js');
const D64 = globalThis.D64;

const argv = process.argv.slice(2), LEAVES = !argv.includes('--noleaves');
const [KLA = 'tree.kla', REGF = 'tree-regions.json', NBF = 'tree-nobrown.json'] = argv.filter(a => !a.startsWith('--'));
const NSITES = 1024, NSLOT = 24;
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
// ...plus EXTRA_RIGHT on the NEAREST RIGHT RACK (the user asked for a couple more there): x >= 135 of
// 160, a little closer together (12 screen px) since it is one rack. The first is steady, the rest
// activity lights.
const EXTRA_RIGHT = 3, extra = [];
const rightBy = [7, 2, 5].map(col => shuffle(cands.filter(c => c.c === col && c.cx >= 135 && !chosen.includes(c))));
for (let turn = 0; extra.length < EXTRA_RIGHT && turn < 3 * cands.length; turn++) {   // colours in rotation here too
  const c = rightBy[turn % 3].find(o => !extra.includes(o) && [...chosen, ...extra].every(p => dist(p, o) >= 12));
  if (c) extra.push(c);
}
// the first two steady lights each take their nearest unchosen partner (same colour if possible,
// within ~3-12 screen px) as a SYNCED PAIR
const used = new Set([...chosen, ...extra]);
const lights = [...chosen, ...extra].map((c, i) => {
  const dots = [c];
  if (i < 2) { const p = partnerOf(c); if (p && !used.has(p)) { dots.push(p); used.add(p); } }
  const bytes = new Map();
  for (const d of dots) for (const [x, y] of d.px) { const o = byteOf(x, y); bytes.set(o, (bytes.get(o) ?? 0) | (3 << shiftOf(x))); }
  const kind = i < NSTEADY || i === NSTEADY + NACT ? 'steady' : 'activity';   // the first extra is steady
  return { kind, colour: DOT[c.c], pair: dots.length > 1, at: [Math.round(c.cx), Math.round(c.cy)],
           bytes: [...bytes].map(([o, mask]) => ({ addr: 0x2000 + o, on: bm[o], off: bm[o] & ~mask & 255 })) };
});
// STEADY periods (frames on, frames off): each light its own, about 0.5-2 s, some lopsided; and a
// starting point anywhere in its cycle
const PERIODS = shuffle([[30, 30], [45, 45], [60, 60], [40, 80], [90, 30], [25, 50], [75, 75], [55, 35], [35, 65]]);
let nSteady = 0;   // each steady light its OWN period: indexing by light number reused one (two at 90/30)
lights.forEach((l, i) => {
  if (l.kind === 'steady') { [l.onT, l.offT] = PERIODS[nSteady++ % PERIODS.length]; l.phase = 1 + Math.floor(rnd() * l.onT); }
  else { l.onT = 0; l.offT = 0; l.pause = 10 + Math.floor(rnd() * 30); l.phase = 1 + Math.floor(rnd() * 60); }
});
const flat = lights.flatMap(l => l.bytes);
if (flat.length > 255) throw new Error(`${flat.length} light bytes; the table holds 255`);
const NL = lights.length;
console.log(`lights: ${NL} -- ` + lights.map(l => `${l.colour} ${l.kind}${l.pair ? ' PAIR' : ''}` +
  (l.kind === 'steady' ? ` ${l.onT}/${l.offT}` : '') + ` @${l.at}`).join('; '));

// ---- LEAVES: small squares of leaf pixels that TURN 90 degrees for a moment, then turn back ----
// The user, on the first version (a 4-pixel strip slid sideways and back): too regular -- a shape
// moving as a shape. Leaves turn in 3D, so their shape changes. So an event takes a 2x2 square
// (4 pixels) or a 3x3 one (its outer 8 turn round the fixed centre), rotates it 90 degrees one way
// or the other, and puts it back 2-5 frames later: a flick, then stillness. Each square lies inside
// ONE character cell (2x2: pixels 0-2 of a byte, rows 0-6; 3x3: pixels 0-1, rows 0-5), so the pixels
// keep their codes and therefore their colours -- only their places change. Every pixel must be a
// leaf (canopy region or a no-brown zone, black/green/light green), and the turn must change
// something. NSITES are sampled across the whole canopy; each event picks one at random.
const LEAF = new Set([0, 5, 13]), sites = [];
const leafPx = (x, y) => { const l = labAt(x, y); return ((l & 1) && l !== 2 || nbAt(x, y)) && LEAF.has(colourAt(x, y)); };
if (LEAVES) {
  const cand = [];
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) for (const n of [2, 3])
    for (let r0 = 0; r0 <= 8 - n; r0++) for (let x0 = 0; x0 <= 4 - n; x0++) {
      const X = cx * 4 + x0, Y = cy * 8 + r0, P = [];
      let ok = true;
      for (let r = 0; r < n && ok; r++) { P.push([]); for (let c = 0; c < n; c++) {
        if (!leafPx(X + c, Y + r)) { ok = false; break; } P[r].push(codeAt(X + c, Y + r)); } }
      if (!ok) continue;
      const cw = rng => rng() < 0.5;
      const dir = cw(rnd);
      const Q = P.map((row, r) => row.map((_, c) => dir ? P[n - 1 - c][r] : P[c][n - 1 - r]));
      if (Q.every((row, r) => row.every((v, c) => v === P[r][c]))) continue;   // the turn changes nothing
      const rows = [], turned = [];
      for (let r = 0; r < n; r++) { const o = byteOf(X, Y + r); let v = bm[o];
        for (let c = 0; c < n; c++) { const sh = shiftOf(X + c); v = (v & ~(3 << sh)) | (Q[r][c] << sh); }
        rows.push(bm[o]); turned.push(v & 255); }
      cand.push({ addr: 0x2000 + byteOf(X, Y), n, orig: rows, turned });
    }
  shuffle(cand);
  for (const c of cand) { if (sites.length >= NSITES) break; sites.push(c); }
  if (sites.length < 64) throw new Error(`only ${sites.length} leaf sites -- are the regions for this picture?`);
  while (sites.length < NSITES) sites.push(sites[sites.length % (sites.length || 1)]);   // fill the table (power of 2)
  console.log(`leaves: ${cand.length} possible turning squares, ${NSITES} sampled`);
}
// the site tables: one 1K page-aligned table per FIELD, indexed by a 10-bit site number
const FIELDS = ['alo', 'ahi', 'n', 'o0', 'o1', 'o2', 't0', 't1', 't2'];
const fieldOf = (f, st) => f === 'alo' ? st.addr & 255 : f === 'ahi' ? st.addr >> 8 : f === 'n' ? st.n
  : f[0] === 'o' ? (st.orig[+f[1]] ?? 0) : (st.turned[+f[1]] ?? 0);
const SITEBASE = 0x5000;

const B = a => a.map(v => '$' + (v & 255).toString(16).padStart(2, '0')).join(',');
const rows = (a, n = 32) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(`        !byte ${B(a.slice(i, i + n))}`); return o.join('\n'); };
let first = 0; const lfirst = lights.map(l => { const f = first; first += l.bytes.length; return f; });

// load field f of the current site (idxlo/idxhi) into A; clobbers Y and ptr
const fld = f => `        lda idxlo
        sta ptr
        lda idxhi
        clc
        adc #>${'$' + (SITEBASE + FIELDS.indexOf(f) * 0x400).toString(16)}
        sta ptr+1
        ldy #$00
        lda (ptr),y`;
// write the site's rows from fields pre+0..2 to (tgt),0..n-1
const putRows = pre => `${fld(pre + '0')}
        ldy #$00
        sta (tgt),y
${fld(pre + '1')}
        ldy #$01
        sta (tgt),y
${fld('n')}
        cmp #$03
        bne pr9${pre}
${fld(pre + '2')}
        ldy #$02
        sta (tgt),y
pr9${pre}:`;
const tgtOfSite = `${fld('alo')}
        sta tgt
${fld('ahi')}
        sta tgt+1`;
const leafCode = `
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
        ; ---- age the turns; turn a square back when its moment is over ----
        ldx #${NSLOT - 1}
age:    lda stimer,x
        beq age2
        dec stimer,x
        bne age2
        lda sidxlo,x
        sta idxlo
        lda sidxhi,x
        sta idxhi
        stx cnt
${tgtOfSite}
${putRows('o')}
        ldx cnt
age2:   dex
        bpl age
        ; ---- start up to WIND new turns ----
        lda wind
        sta cnt2
spawn:  lda cnt2
        beq sdone
        dec cnt2
        ldx #${NSLOT - 1}   ; a free slot
fs:     lda stimer,x
        beq got
        dex
        bpl fs
        jmp sdone
got:    jsr rnd             ; a random site: 10 bits
        sta idxlo
        lda seedhi
        and #$03
        sta idxhi
        stx cnt
${tgtOfSite}
        ldx cnt
        lda tgt             ; its CELL (8 bytes): busy if any live turn is in the same cell
        and #$f8
        sta tcell
        ldy #${NSLOT - 1}
bz:     lda stimer,y
        beq bz2
        lda scell,y
        cmp tcell
        bne bz2
        lda scellh,y
        cmp tgt+1
        beq spawn
bz2:    dey
        bpl bz
        lda idxlo
        sta sidxlo,x
        lda idxhi
        sta sidxhi,x
        lda tcell
        sta scell,x
        lda tgt+1
        sta scellh,x
        jsr rnd             ; its moment: 2..5 frames
        and #$03
        clc
        adc #$02
        sta stimer,x
${putRows('t')}
        ldx cnt
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
cnt2    = $f5
idxlo   = $f4
idxhi   = $f3
tcell   = $f2
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
${LEAVES ? leafCode : ''}
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
sidxlo: !fill ${NSLOT},0
sidxhi: !fill ${NSLOT},0
scell:  !fill ${NSLOT},0
scellh: !fill ${NSLOT},0
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


        * = $2000
${rows([...bm])}
scrdat:
${rows([...scr, ...Array(24).fill(0)])}
coldat:
${rows([...col, ...Array(24).fill(0)])}
${LEAVES ? FIELDS.map((f, k) => `        * = $${(SITEBASE + k * 0x400).toString(16)}\nsite_${f}:\n${rows(sites.map(st => fieldOf(f, st)))}`).join('\n') : ''}
`;
const out = assemble(src);
const L = out.labels;
if (L.stimer + 5 * NSLOT + 2 * NL > 0x0c00) throw new Error('the player ran into its light tables at $0c00');
if (LEAVES && L.coldat + 1024 > SITEBASE) throw new Error('the colour data runs into the leaf tables');
if (L.scrdat !== 0x3f40) throw new Error('bitmap is not 8000 bytes');
const d = D64.createEmpty('THE TREE', '01');
d.writeFile('END', Buffer.from(out.prg), D64.FILE_TYPE_PRG);
writeFileSync('endscene.d64', Buffer.from(d.getData()));
console.log(`endscene.d64: END ${out.prg.length - 2} bytes, $0801-$${(0x0801 + out.prg.length - 3).toString(16)}${LEAVES ? ' (with turning leaves)' : ''}`);
