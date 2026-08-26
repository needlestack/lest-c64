// ONE map, ONE stored charset: the paired-glyph version of build-facetest.mjs, for comparison
// against la-test.d64.
//
// la-test carries TWO fitted maps per picture, one per charset, because it fits each picture
// independently against the upright and the flipped dictionary. That costs 2KB a picture and a
// second resident charset. This disk asks whether the flip can instead be carried entirely by the
// CHARSET ORDER:
//
//   Pair every glyph with the glyph nearest to its own vertical mirror, and lay each pair in
//   adjacent slots 2k / 2k+1. Then charset B is "reverse the rows AND swap with your neighbour",
//   which for a byte at offset x within the charset is simply x EOR 15 -- because (i^1)*8 is
//   i*8 EOR 8 and 7-r is r EOR 7, and those two fields are disjoint. cpChr in the game is
//   `eor #$07` today; the paired transform is the SAME LOOP with `eor #$0f`.
//
// So a cell coded 2k draws NEW[2k] upright and rev(NEW[2k+1]) flipped -- and the pairing is what
// makes the second of those still look like the picture. Every code stays usable: a cell coded
// 2k+1 draws NEW[2k+1] upright and rev(NEW[2k]) flipped. The dictionary is not halved.
//
// Data: 2,048 charset + 5 x 1,000 maps = 7,048 bytes, against la-test's 14,096. The second
// charset is GENERATED at startup, not stored.
//
//   node build-facetest2.mjs      -> la-test2.d64
import { writeFileSync, readFileSync } from 'fs';
import { assemble } from './asm6502.mjs';
await import('./d64lib.js');
const D64 = globalThis.D64;

const FACE  = JSON.parse(readFileSync('./angel-face.json', 'utf8')).hangl1;
const EXTRA = JSON.parse(readFileSync('./face-extra.json', 'utf8'));
const SRC   = EXTRA.preq;                        // the SAME dictionary la-test.d64 ships
const IMAGES = ['a1', 'a2', 'a3', 'a4', 'a5'];
const hx = n => '$' + n.toString(16);

// ---- the pairing ----
// Distance is over the 32 multicolor pixels of a 4x8 cell, counting pixels that differ. The
// weight is SYMMETRIC -- d(A[b],rev(A[a])) == d(rev(A[b]),A[a]), because row-reversal is an
// isometry -- so "nearest match when upside down" is a well-defined pairing rather than a
// one-way nearest-neighbour, and a perfect matching is the right question to ask.
const glyph = i => SRC.chars.slice(i * 8, i * 8 + 8);
const rev = b => [...b].reverse();
const pixels = b => { const p = []; for (const by of b) for (let k = 0; k < 4; k++) p.push((by >> (6 - 2 * k)) & 3); return p; };
const dist = (a, b) => { const x = pixels(a), y = pixels(b); let d = 0;
  for (let i = 0; i < 32; i++) if (x[i] !== y[i]) d++; return d; };
const G = [...Array(256)].map((_, i) => glyph(i));
const W = G.map(a => G.map(b => dist(b, rev(a))));   // MIRROR distance, for the paired mode
const D = G.map(a => G.map(b => dist(a, b)));        // plain similarity, for the twin mode

// ---- TWIN=1: pair by SIMILARITY, and store the partner already reversed ----
// The paired mode below asks "what does this glyph look like upside down", which makes frame B
// an attempt to reproduce frame A -- so frame A is exact and frame B carries all the error, and
// the effect reads as a picture being damaged and repaired rather than as two renderings cycling.
//
// The twin mode asks a different question. Put glyph X at slot 2j and rev(Y) at slot 2j+1, where
// X and Y are two SIMILAR glyphs. Code 2j then draws X upright and rev(rev(Y)) == Y flipped: two
// different codewords, both fitted to the picture, neither privileged. Every cell that used
// either X or Y takes code 2j, so each frame's error is the merge distance weighted by the OTHER
// member's usage -- and orienting each pair to whichever frame is behind keeps the two balanced.
// The price is that the 128 odd slots serve only VERTICALLY MIRRORED content, so the effective
// dictionary halves. That cost is already inside the measured error, not on top of it.
const TWIN = process.env.TWIN === '1';

// ---- CBOOK=1: choose the 128 by CODEBOOK SELECTION, not by pairwise matching ----
// TWIN pairs glyphs off two at a time, which forces every merge to be the same size: a codeword
// serving 1,852 cells is married to exactly one partner, and a codeword serving 3 cells also gets
// exactly one. A codebook does not work that way -- it lets a dense region keep several codewords
// and a sparse one share. Measured, that difference is most of TWIN's error: a mirror-closed
// 128+128 codebook costs 1.05 px a cell against the unconstrained 256, where TWIN's matching costs
// 2.56/3.06. So: pick 128 codewords greedily by weighted benefit, assign every glyph to its
// nearest, then give each cluster TWO renderings -- and that second rendering is the churn.
//
// MINCHURN is the reason the background holds still. A cluster whose two renderings differ by only
// a pixel or two produces no visible alternation, just a PERIODIC one-pixel error -- a dot grid
// over every flat area, which reads as a fault. Below the threshold the cluster renders the same
// glyph in both frames and simply does not move.
// ---- STATIC=1: no cycling at all, and everything above becomes unnecessary ----
// The user's call after seeing the disks, and it is an artistic one, not a technical one: the
// still images are starker and more unsettling than the cycling. Dropping the flip removes every
// constraint this file was built to work around -- no pairing, no mirror-closure, no churn/fidelity
// trade -- and hands back the FULL 256-code dictionary, because nothing has to share a slot with
// its partner any more. The charset is used exactly as fitted and the picture is la-test's upright
// frame, which is the best rendering any of these variants achieved.
const STATIC = process.env.STATIC === '1';
const CBOOK = process.env.CBOOK === '1';
const MINCHURN = +(process.env.MINCHURN ?? 8);
const CHURNTOL = +(process.env.CHURNTOL ?? 2);

// ---- SELFPAIR: let a symmetric glyph pair with a COPY of itself ----
// A perfect matching pairs every slot with a DIFFERENT slot, so a glyph that is its own best
// mirror -- and glyph 0, the flat background, is exactly that, in 37% of all cells -- is forced
// to swap with something else. Its partner is near-identical, about ONE wrong pixel a cell, but
// the error is spatially PERIODIC: one dot per character cell is a regular dot grid across the
// whole background, switching on and off at 5Hz. That reads as a fault, not as an effect.
// Duplicating the glyph into both slots of a pair makes rev(NEW[2k+1]) == g exactly, so flat
// areas hold perfectly still while detail churns. Each duplicate costs one dictionary slot, paid
// for by dropping the least-used shape -- which at these counts is a shape no cell uses at all.
const usage = new Array(256).fill(0);
for (const im of IMAGES) for (const c of SRC.screen[im]) usage[c]++;
const selfD = [...Array(256).keys()].map(i => dist(G[i], rev(G[i])));
const SELFPAIR = +(process.env.SELFPAIR ?? 0);
const selfSet = new Set([...Array(256).keys()].filter(i => selfD[i] <= 2)
  .sort((a, b) => usage[b] - usage[a]).slice(0, SELFPAIR));
const dropSet = new Set([...Array(256).keys()].filter(i => !selfSet.has(i))
  .sort((a, b) => usage[a] - usage[b]).slice(0, selfSet.size));
for (const d of dropSet) if (usage[d])
  console.error(`  note: dropping shape ${d}, used by ${usage[d]} cells, to fund a self-pair`);

// Greedy minimum-weight perfect matching: cheapest available edge first, then a mop-up pass for
// anything stranded. Sort by DISTANCE ALONE. A first version sorted by distance x usage, which
// pushes the heavily-used glyphs to the END of the queue -- so glyph 0, at 37% of all cells, got
// whatever partner was left over and the mean churn came out at 18px instead of 5.6. Weighting an
// edge by importance and then processing in that order does the exact opposite of what is wanted.
const metric = TWIN ? D : W;
const pool = [...Array(256).keys()].filter(i => !selfSet.has(i) && !dropSet.has(i));
const edges = [];
for (let x = 0; x < pool.length; x++) for (let y = x + 1; y < pool.length; y++)
  edges.push([metric[pool[x]][pool[y]], pool[x], pool[y]]);
edges.sort((x, y) => x[0] - y[0]);
const mate = new Array(256).fill(-1);
for (const [, a, b] of edges) if (mate[a] < 0 && mate[b] < 0) { mate[a] = b; mate[b] = a; }
const left = pool.filter(i => mate[i] < 0);
while (left.length > 1) {                        // stranded glyphs: best remaining partner
  const a = left.shift();
  let bi = 0, bd = Infinity;
  for (let k = 0; k < left.length; k++) if (metric[a][left[k]] < bd) { bd = metric[a][left[k]]; bi = k; }
  const b = left.splice(bi, 1)[0];
  mate[a] = b; mate[b] = a;
}
if (left.length) throw new Error('odd glyph left unpaired -- the matching is not perfect');

// ---- lay the pairs into slots ----
// Both modes put a pair in adjacent slots 2j / 2j+1, so the EOR 15 transform serves either.
// They differ in WHAT the odd slot holds, and in whether both members keep their own code.
const slots = [];                                // 256 glyph-byte patterns, in slot order
const remap = new Array(256).fill(-1);           // original code -> slot
const seen = new Array(256).fill(false);
if (STATIC) {
  for (let i = 0; i < 256; i++) { remap[i] = i; slots.push(G[i]); }
} else if (CBOOK) {
  // 1. greedy forward selection of 128 codewords, by weighted reduction in total error
  const best = new Array(256).fill(Infinity), pick = [];
  for (let round = 0; round < 128; round++) {
    let bi = -1, bs = Infinity;
    for (let b = 0; b < 256; b++) {
      let s = 0;
      for (let t = 0; t < 256; t++) if (usage[t]) s += usage[t] * Math.min(best[t], D[t][b]);
      if (s < bs) { bs = s; bi = b; }
    }
    pick.push(bi);
    for (let t = 0; t < 256; t++) if (D[t][bi] < best[t]) best[t] = D[t][bi];
  }
  // 2. every glyph joins its nearest codeword
  const cluster = pick.map(() => []);
  for (let t = 0; t < 256; t++) {
    if (!usage[t]) continue;
    let bj = 0, bd = Infinity;
    pick.forEach((c, j) => { if (D[t][c] < bd) { bd = D[t][c]; bj = j; } });
    cluster[bj].push(t);
  }
  // 3. TWO renderings per cluster, chosen JOINTLY. A first version took the codeword plus the
  //    member furthest from it -- so frame B rendered every cluster's worst member and the frames
  //    came out 1.11 / 6.30, unlevel in the other direction. Both renderings have to cover the
  //    whole cluster, because every cell sees both: one in each frame. Below MINCHURN the two
  //    collapse to one and the cluster simply does not move.
  let held = 0, cbA = 0, cbB = 0;
  for (let j = 0; j < 128; j++) {
    const mem = cluster[j];
    if (!mem.length) { slots.push(G[pick[j]], rev(G[pick[j]])); continue; }
    // The churn must be REQUIRED, not merely permitted. Minimising both frames' error jointly
    // has an exact degenerate optimum at r1 == r2 -- the sum separates, so each term is minimised
    // independently by the same medoid -- and the whole effect vanishes. So: demand a separation
    // of at least MINCHURN and minimise error subject to it. A cluster too tight to reach that
    // separation holds still instead, which is what keeps the flat background from shimmering.
    const wErr = (r) => mem.reduce((a, t) => a + usage[t] * D[t][r], 0);
    const we = {}; for (const t of mem) we[t] = wErr(t);
    const wt = mem.reduce((a, t) => a + usage[t], 0);
    const solo = mem.reduce((b, t) => we[t] < we[b] ? t : b, mem[0]);
    let r1 = solo, r2 = solo, bs = Infinity;
    for (const p of mem) for (const q of mem) {
      if (D[p][q] < MINCHURN) continue;
      const s = we[p] + we[q];
      if (s < bs) { bs = s; r1 = p; r2 = q; }
    }
    // CHURN MUST NOT OVERRIDE FIDELITY. Requiring separation inside every cluster dragged the
    // BACKGROUND cluster -- 33 members, of which the blank alone is 1,852 cells -- off the blank
    // and onto two dotted glyphs with ten times the error, in BOTH frames. That is not a blinking
    // grid, it is a permanently wrong background. So price the churn: if forcing it costs more
    // than CHURNTOL extra pixels per cell, this cluster holds still instead.
    const cost = bs === Infinity ? Infinity : (bs / 2 - we[solo]) / wt;
    if (cost > CHURNTOL) { r1 = r2 = solo; held += wt; }
    // Point the better of the two renderings at whichever frame is currently behind, so the two
    // finish level rather than frame A always getting the tighter medoid.
    if (we[r1] !== we[r2] && ((we[r1] < we[r2]) === (cbA <= cbB))) { const t = r1; r1 = r2; r2 = t; }
    cbA += we[r1]; cbB += we[r2];
    for (const t of mem) remap[t] = slots.length;
    slots.push(G[r1], rev(G[r2]));               // frame A draws r1, frame B draws r2
  }
  const W = usage.reduce((a, b) => a + b, 0);
  console.error(`  CBOOK: ${held} of ${W} cells (${(100 * held / W).toFixed(1)}%) sit in clusters` +
                ` below MINCHURN=${MINCHURN} and hold still`);
} else if (TWIN) {
  // Orient each pair toward whichever frame is currently behind, so the two frames finish level.
  // Biggest-impact pairs first, or the small ones use up the slack before the big ones arrive.
  const plist = [];
  for (let a = 0; a < 256; a++) {
    if (seen[a] || dropSet.has(a)) continue;
    const b = mate[a]; seen[a] = seen[b] = true; plist.push([a, b]);
  }
  plist.sort((p, q) => D[q[0]][q[1]] * (usage[q[0]] + usage[q[1]])
                     - D[p[0]][p[1]] * (usage[p[0]] + usage[p[1]]));
  let eA = 0, eB = 0;
  for (const [a, b] of plist) {
    const d = D[a][b];
    const [inA, inB] = eA <= eB ? [a, b] : [b, a];   // inA renders upright, inB flipped
    eA += d * usage[inB]; eB += d * usage[inA];
    remap[a] = remap[b] = slots.length;             // BOTH codes collapse onto the even slot
    slots.push(G[inA], rev(G[inB]));                // rev, so the flip un-reverses it back to G[inB]
  }
} else {
  for (const a of selfSet) {                     // a self-pair: the same glyph in both slots
    remap[a] = slots.length; slots.push(G[a], G[a]); seen[a] = true;
  }
  for (let a = 0; a < 256; a++) {
    if (seen[a] || dropSet.has(a)) continue;
    const b = mate[a]; seen[a] = seen[b] = true;
    remap[a] = slots.length; slots.push(G[a]);
    remap[b] = slots.length; slots.push(G[b]);
  }
}
// A dropped shape's cells go to the nearest surviving shape, so no map entry is left dangling.
for (const d of dropSet) {
  let bd = Infinity, bj = -1;
  for (let j = 0; j < 256; j++) if (remap[j] >= 0) { const q = dist(G[j], G[d]); if (q < bd) { bd = q; bj = j; } }
  remap[d] = remap[bj];
}
if (slots.length !== 256) throw new Error(`layout produced ${slots.length} slots, not 256`);
if (remap.some(v => v < 0)) throw new Error('a glyph was left without a slot');
const CHARS_NEW = slots.flat();

const MAPS = IMAGES.map(im => SRC.screen[im].map(c => remap[c]));
// BOTH frames are scored against ONE reference: la-test's upright frame. That is the best
// rendering of the source we have on hand, and the point of the exercise is whether the two
// frames are LEVEL -- which only means something if they are measured against the same thing.
// Scoring the flipped frame against la-test's FLIPPED fit instead reads as a large error for
// TWIN and none for the paired mode, but it is measuring agreement with a different
// approximation rather than fidelity to the picture, and it made this build cry foul on the very
// construction it exists to test. The reference is still a proxy: it is biased toward whatever
// la-test's upright fit happened to choose, so treat small differences as noise and go and look.
let errA = 0, errB = 0, tot = 0, n = 0;
for (let i = 0; i < IMAGES.length; i++) {
  const mA = SRC.screen[IMAGES[i]];
  for (let k = 0; k < 1000; k++) {
    const s = MAPS[i][k], ref = G[mA[k]];
    const fA = slots[s], fB = rev(slots[s ^ 1]);
    errA += dist(fA, ref);
    errB += dist(fB, ref);
    tot += dist(fA, fB); n++;                    // churn: what actually changes on screen
  }
}
const churn = tot / n;

// The flipped charset is DERIVED, exactly as the game would derive it: B[x] = A[x EOR 15].
// Verified here in JS so the 6502 loop below is checked against the intent, not just run.
{
  const B = [...Array(2048)].map((_, x) => CHARS_NEW[(x & ~255) | ((x & 255) ^ 15)]);
  for (let s = 0; s < 256; s++) {
    const want = rev(CHARS_NEW.slice((s ^ 1) * 8, (s ^ 1) * 8 + 8));
    const got = B.slice(s * 8, s * 8 + 8);
    for (let r = 0; r < 8; r++) if (want[r] !== got[r])
      throw new Error(`EOR 15 does not produce rev(pair) at slot ${s} row ${r}`);
  }
}

console.error(`${STATIC ? 'STATIC (no cycling, full 256-code dictionary)' : CBOOK ? 'CBOOK (128 codewords, two renderings each)' : TWIN ? 'TWIN (paired by similarity)' : 'PAIRED (by nearest mirror)'}:`);
if (STATIC) {
  console.error(`   one frame, no flip: ${(errA / n).toFixed(2)} px from the reference` +
                `  (la-test's own upright frame, which is the reference, so 0.00 is exact)`);
} else {
  console.error(`   upright frame ${(errA / n).toFixed(2)} px from the reference` +
                `      flipped frame ${(errB / n).toFixed(2)} px from the reference`);
  console.error(`   churn on screen ${churn.toFixed(2)} px = ${(100 * churn / 32).toFixed(1)}%` +
                ` of a cell   (la-test's own two frames differ by 6.40 px = 20.0%)`);
  if ((TWIN||CBOOK) && Math.abs(errA - errB) / n > 1.5)
    console.error(`   *** the two frames are NOT level ***`);
}

// ---- VIC bank 0 layout ----
// Two screen slots, not four: with one map per picture the flip does not change the screen, only
// the charset, so a picture needs one slot and the pair exists solely to preload the next one
// off-display. $1000-$1fff is the char-ROM shadow, so everything the VIC reads sits at $2000 up.
const LIVE = 0x2000;          // slot 0 = $2000, slot 1 = $2400
const CHARS = [0x3000, 0x3800];   // [0] stored, [1] generated at startup
const MAPSRC = 0x4000;        // five maps, $400 apart
const NIMG = IMAGES.length;
// idx = pair*2 + flip. SCREEN follows pair alone; CHARSET follows flip alone.
const d018T = [0, 1, 2, 3].map(idx =>
  hx(((((LIVE + (idx >> 1) * 0x400) >> 6) & 0xf0) | ((CHARS[idx & 1] >> 10) & 0x0e))));

const PICFR  = +(process.env.FACEPICFR  ?? 0);
const FLIPFR = STATIC ? 255 : +(process.env.FACEFLIPFR ?? 0);   // 255: never reached in a picture's 60 frames

const src = `
        * = $0801
        !byte $0b,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00   ; SYS 2061

start:  sei
        lda $d016
        ora #$10                ; multicolor char mode
        sta $d016
        lda #${FACE.d021}
        sta $d021
        lda #${FACE.d022}
        sta $d022
        lda #${FACE.d023}
        sta $d023
        lda #$00
        sta $d020
        ldx #$00
        lda #${hx(0x08 | (FACE.colram & 7))}
cr:     sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne cr

        ; ---- derive the flipped charset: B[x] = A[x EOR 15] ----
        ; Row-reversal is x EOR 7; the neighbour swap adds bit 3, because a glyph is 8 bytes so
        ; slot i^1 is offset i*8 EOR 8. Both fields sit in the low nibble, so the whole transform
        ; is one EOR and it never leaves the page -- which is why the game's cpChr can do this by
        ; changing its "eor #\$07" to "eor #\$0f" and nothing else.
        ldx #$00
mk:     txa
        eor #$0f
        tay
${[0, 1, 2, 3, 4, 5, 6, 7].map(p =>
`        lda ${hx(CHARS[0] + p * 256)},y
        sta ${hx(CHARS[1] + p * 256)},x`).join('\n')}
        inx
        bne mk

        lda $02a6               ; KERNAL's PAL flag: a frame is not the same length on the two
        beq isNtsc
        lda #${PICFR || 50}
        sta picFr
        lda #${FLIPFR || 10}
        sta flipFr
        jmp rdy
isNtsc: lda #${PICFR || 60}
        sta picFr
        lda #${FLIPFR || 12}
        sta flipFr

        ; preld loads the picture AFTER pic and always writes the slot NOT on display, so pic
        ; starts at the last picture and pair at 1, to make the first displayed picture 0.
rdy:    lda #${NIMG - 1}
        sta pic
        lda #$01
        sta pair
        jsr preld
        lda #$00
        sta pair
        lda nxt
        sta pic

main:   lda #$00                ; every picture starts on the upright charset
        sta flip
        jsr shown
        jsr preld
        lda picFr
        sta cnt
        lda flipFr
        sta fcnt
frm:    jsr wframe
        dec fcnt
        bne nof
        lda flipFr
        sta fcnt
        lda flip
        eor #$01                ; the whole A/B: one write to one register, and the SCREEN does
        sta flip                ;   not move -- only the charset pointer changes
        jsr shown
nof:    dec cnt
        bne frm

        lda pair
        eor #$01
        sta pair
        lda nxt
        sta pic
        bne main                ; only picture 0 gets the black second in front of it

        lda $d011               ; safe here: wframe just returned, so the beam is in the lower
        and #$ef                ;   border and DEN lands between frames rather than tearing one
        sta $d011
        lda #$00
        sta flip
        jsr shown
        ldx picFr
blk:    jsr wframe
        dex
        bne blk
        lda $d011
        ora #$10
        sta $d011
        jmp main

shown:  lda pair
        asl
        ora flip
        tax
        lda d018T,x
        sta $d018
        rts

        ; Copy the next picture's ONE map ($400) into the slot not on display.
preld:  ldx pic
        inx
        cpx #${NIMG}
        bcc pl1
        ldx #$00
pl1:    stx nxt
        txa
        asl
        asl                     ; $400 per picture = 4 pages
        clc
        adc #${hx(MAPSRC >> 8)}
        sta rdp+2
        lda pair
        eor #$01
        asl
        asl
        clc
        adc #${hx(LIVE >> 8)}
        sta wrp+2
        ldx #$04
pg:     ldy #$00
rdp:    lda $ff00,y             ; only the HIGH byte is patched, so the low one must be 00
wrp:    sta $ff00,y
        iny
        bne rdp
        inc rdp+2
        inc wrp+2
        dex
        bne pg
        rts

wframe: lda $d012
        cmp #$fb
        bne wframe
wf2:    lda $d012
        cmp #$fb
        beq wf2
        rts

pic:    !byte 0
nxt:    !byte 0
pair:   !byte 0
flip:   !byte 0
cnt:    !byte 0
fcnt:   !byte 0
picFr:  !byte 0
flipFr: !byte 0
d018T:  !byte ${d018T.join(',')}

        * = ${hx(CHARS[0])}
        !byte ${CHARS_NEW.join(',')}
${MAPS.map((m, i) => `        * = ${hx(MAPSRC + i * 0x400)}\n        !byte ${m.join(',')}`).join('\n')}
`;

const r = assemble(src);
const OUT = process.env.OUT ?? (STATIC ? './la-test7.d64' : CBOOK ? './la-test5.d64' : TWIN ? './la-test4.d64' : SELFPAIR ? './la-test3.d64' : './la-test2.d64');
const d = D64.createEmpty('FACETEST2', '02');
d.writeFile('FACETEST2', Buffer.from(r.prg), D64.FILE_TYPE_PRG);
writeFileSync(OUT, Buffer.from(d.getData()));
console.log(`${OUT}: $${r.org.toString(16)}-$${r.end.toString(16)}, ${r.bytes.length} bytes, ` +
            `${NIMG} pictures x 1 map, 1 stored charset (+1 derived), ` +
            `${STATIC?"STATIC":CBOOK?"CBOOK MINCHURN="+MINCHURN:TWIN?"TWIN":"SELFPAIR="+SELFPAIR}, d018 ${d018T.join(' ')}`);
