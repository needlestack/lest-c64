// TWO charsets, split by a raster IRQ: 512 glyphs for one full-screen picture.
//
// A charset is 256 glyphs and a picture is 1,000 cells, so the dictionary is the binding
// constraint on how well a photograph renders. But $d018 carries the charset pointer, and the
// game ALREADY changes it mid-screen every frame -- irqCm2 switches to the mirrored set at the
// horizon and back below the arc. So a cut-scene picture can have TWO dictionaries: one fitted to
// the rows above the split and one to the rows below.
//
// This is not just "twice as many glyphs". The bands are fitted SEPARATELY, so the top book spends
// itself on whatever is up there -- face, hair, sky -- and never wastes a codeword on a texture
// that only occurs at the bottom. Specialisation by region, not a generic doubling.
//
// Cost: 2,048 more bytes, ONCE, shared by every picture. Against la-test7's 7,048 that is 9,096
// for five pictures.
//
//   node tools/build-facetest3.mjs        -> la-test8.d64
//   SPLITROW=12 node tools/build-facetest3.mjs
import { writeFileSync, readFileSync } from 'fs';
import { assemble } from '../src/asm6502.mjs';
import { toPixels, dither, tilesOf, cluster, fitTo, LU, GREYS, BLACK } from '../src/fit-face.mjs';
await import('../src/d64lib.js');
import { ROOT } from '../src/paths.mjs';
process.chdir(ROOT);   // paths below are repo-relative (see src/paths.mjs)
const D64 = globalThis.D64;

const FACE = JSON.parse(readFileSync('./data/angel-face.json', 'utf8')).hangl1;
if (process.env.FACED023) FACE.d023 = +process.env.FACED023;   // as fit-face.mjs
// IMAGES=a.png,b.png (2026-10-15): fit other pictures than the five angels -- a candidate for the scene.
const IMAGES = process.env.IMAGES ? process.env.IMAGES.split(',').map(s => s.trim()).filter(Boolean)
  : ['art/angel-1.png', 'art/angel-2.png', 'art/angel-3.png', 'art/angel-4.png', 'art/angel-5.png'];
const hx = n => '$' + n.toString(16);
// Where the dictionary changes. 12 puts it just under the face on this image set; it is a build
// knob because the right row is a property of the PICTURES, not of the hardware.
const SPLITROW = +(process.env.SPLITROW ?? 12);
const KTOP = +(process.env.KTOP ?? 256), KBOT = +(process.env.KBOT ?? 256);

// ---- fit ----
// Same pipeline as fit-face.mjs, imported rather than reimplemented: greyscale and letterbox,
// Floyd-Steinberg with grit over the 4-ink palette, then k-medoids over the resulting tiles.
const INKS = [...GREYS, BLACK];
const pix = {}, tiles = {}, edge = {}, tone = {};
for (const f of IMAGES) {
  const { tgt } = toPixels(f);
  // the SMOOTH target, in luminance (background black), for FACESEAM: the dither's own pixel noise
  // would make every cell boundary look like a jump
  { const lo = Math.min(...INKS.map(v => LU[v])), hi = Math.max(...INKS.map(v => LU[v]));
    tone[f] = Float64Array.from(tgt, t => t < 0 ? LU[BLACK] : lo + t * (hi - lo)); }
  pix[f] = dither(tgt, INKS);
  tiles[f] = tilesOf(pix[f]);
  // a cell the silhouette crosses: some pixels figure (tgt >= 0), some background (tgt < 0)
  edge[f] = [...Array(1000)].map((_, c) => { let fg = 0, bg = 0;
    for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++)
      (tgt[(((c / 40) | 0) * 8 + r) * 160 + (c % 40) * 4 + i] < 0 ? bg++ : fg++);
    return fg > 0 && bg > 0; });
}
// EDGETRAIN=0 (2026-10-15): leave the cells the silhouette crosses OUT of the training pool. Each is a
// near-unique slice of outline and wins a glyph the interior then lacks; they are still drawn, fitted
// to the nearest glyph the interior produced. Default 1: trained like any other cell.
const EDGETRAIN = process.env.EDGETRAIN !== '0';
// ---- TRAIN / SHOW: the codebook's training set need not be the set it renders ----
// A codebook is a budget, and pooling every tile of every picture spends it evenly on content
// that does not matter evenly. TRAIN names what the clusterer sees, per picture and per band;
// SHOW names what actually gets drawn. Anything rendered but not trained on is fitted against a
// dictionary that never saw it -- which is the interesting half of the experiment, not a bug.
//   TRAIN=angel-1.png:top,angel-4.png:all      SHOW=angel-1.png,angel-4.png
const band = r => (r < SPLITROW ? 0 : 1);
const TRAIN = (process.env.TRAIN ?? IMAGES.map(f => `${f}:all`).join(','))
  .split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const [f, b = 'all'] = s.split(':');
    if (!IMAGES.includes(f)) throw new Error(`TRAIN names ${f}, which is not in IMAGES`);
    if (!['top', 'bottom', 'all'].includes(b)) throw new Error(`TRAIN band must be top|bottom|all, got ${b}`);
    return [f, b];
  });
const SHOW = (process.env.SHOW ?? IMAGES.join(',')).split(',').map(s => s.trim()).filter(Boolean);
for (const f of SHOW) if (!IMAGES.includes(f)) throw new Error(`SHOW names ${f}, which is not in IMAGES`);
const pool = [[], []];
for (const [f, b] of TRAIN)
  tiles[f].forEach((t, i) => {
    if (!EDGETRAIN && edge[f][i]) return;
    const bd = band(Math.floor(i / 40));
    if (b === 'all' || (b === 'top') === (bd === 0)) pool[bd].push(t);
  });
if (process.env.TRAIN || process.env.SHOW)
  console.error(`  train: ${TRAIN.map(([f, b]) => f.replace('angel-', '').replace('.png', '') + ':' + b).join(' ')}` +
                `   show: ${SHOW.map(f => f.replace('angel-', '').replace('.png', '')).join(' ')}`);
// ONEBOOK=1: the CONTROL. One 256-codeword book for the whole frame, same dither, same
// clusterer, same fitter -- so the only thing that differs from the split build is the split.
// Comparing against la-test's preq instead would confound it: that was clustered with a
// per-picture slot budget, which is a different experiment.
const ONEBOOK = process.env.ONEBOOK === '1';
const books = [], K = [KTOP, KBOT];
if (ONEBOOK) {
  // KONE=n (2026-10-15): fewer than 256 codewords, so the shipped charset is smaller (the game packs
  // it to the glyphs drawn). The asset is still padded to 256 glyphs, which the build expects.
  const { cents } = cluster([...pool[0], ...pool[1]], +(process.env.KONE ?? 256));
  books.push(cents, cents);
  console.error(`  ONEBOOK control: ${pool[0].length + pool[1].length} tiles -> one 256-codeword book`);
} else for (let b = 0; b < 2; b++) {
  const { cents } = cluster(pool[b], K[b]);
  books.push(cents);
  console.error(`  band ${b} (${b ? 25 - SPLITROW : SPLITROW} rows): ${pool[b].length} tiles` +
                ` -> ${K[b]} codewords`);
}
// Luminance form, which is what fitTo compares in -- raw 2-bit values would score a light/mid
// swap as a smaller error than a light/dark one, which is backwards.
const lum = book => book.map(c => Float64Array.from(c, v => LU[v]));
const bookLum = books.map(lum);

// Each cell is fitted against ITS OWN band's book. fitTo works over a whole 160x200 frame, so
// run it twice per picture and take the rows that belong to each band.
const MAPS = [], rms = [];
for (const f of SHOW) {
  const top = fitTo(pix[f], bookLum[0]), bot = fitTo(pix[f], bookLum[1]);
  const m = new Array(1000);
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    const i = cy * 40 + cx;
    m[i] = (cy < SPLITROW ? top : bot).screen[i];
  }
  // ---- FACESEAM=w (2026-10-15): a seam-aware refit against blockiness ----
  // Each cell above chose its glyph alone. Blockiness is a step in tone AT a cell boundary that the
  // picture does not have, so refit cell by cell (3 passes, each seeing its neighbours' current
  // glyphs): own squared error, plus w times, per side, (the glyphs' mean-edge step - the source's
  // mean-edge step)^2 -- edge means of the SMOOTH tone, 4 pixels on a horizontal side, 8 on a vertical.
  const SEAMW = +(process.env.FACESEAM ?? 0);
  if (SEAMW > 0) {
    const T = tone[f], P = pix[f];
    // a cell's four edge means -- top, bottom, left, right -- from 32 luminances
    const edges = L => { let t = 0, b = 0, l = 0, r = 0;
      for (let i = 0; i < 4; i++) { t += L[i]; b += L[28 + i]; }
      for (let k = 0; k < 8; k++) { l += L[k * 4]; r += L[k * 4 + 3]; }
      return [t / 4, b / 4, l / 8, r / 8]; };
    const cellL = (src, c) => { const o = new Float64Array(32), cx = c % 40, cy = (c / 40) | 0;
      for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++) o[r * 4 + i] = src(((cy * 8 + r) * 160 + cx * 4 + i)); return o; };
    const gE = bookLum.map(bk => bk.map(edges));                                 // per band, per glyph
    const tE = [...Array(1000)].map((_, c) => edges(cellL(i => T[i], c)));
    const pL = [...Array(1000)].map((_, c) => cellL(i => LU[P[i]], c));
    // side k of a cell meets side opp[k] of the neighbour at offset nb[k]
    const nb = [-40, 40, -1, 1], opp = [1, 0, 3, 2];
    // FACERUN=n (2026-10-15): a horizontal run of n or more LIGHTEST-grey pixels -- inside the glyph or
    // across its joins with the cells left and right -- reads as a glitch (a 5-pixel bar across the
    // nose, from two cells that each looked fine). A glyph that would make one costs as much as a
    // whole badly fitted cell.
    const RUN = +(process.env.FACERUN ?? 0), LT = GREYS[GREYS.length - 1];
    const runCost = (c, cx, gv) => {
      if (!RUN || band((c / 40) | 0) !== 0) return 0;   // the FACE band only: below it, the sword's guard
                                                          //   and lit shoulders ARE horizontal light bars
      const L = cx > 0 ? books[band(((c - 1) / 40) | 0)][m[c - 1]] : null;
      const R = cx < 39 ? books[band(((c + 1) / 40) | 0)][m[c + 1]] : null;
      let bad = 0;
      for (let r = 0; r < 8; r++) {
        const row = [...(L ? L.slice(r * 4, r * 4 + 4) : [-1, -1, -1, -1]), ...gv.slice(r * 4, r * 4 + 4),
                     ...(R ? R.slice(r * 4, r * 4 + 4) : [-1, -1, -1, -1])];
        let run = 0;
        for (let k = 0; k < 12; k++) { run = row[k] === LT ? run + 1 : 0;
          if (run >= RUN && k >= 4 && k - run + 1 < 8) { bad++; break; } }   // the run touches THIS glyph
      }
      return bad * 32 * 255 * 255;
    };
    for (let pass = 0; pass < 3; pass++) for (let c = 0; c < 1000; c++) {
      const cx = c % 40, cy = (c / 40) | 0, bk = bookLum[band(cy)], ge = gE[band(cy)];
      let best = m[c], bd = Infinity;
      for (let g = 0; g < bk.length; g++) {
        let d = 0;
        for (let p = 0; p < 32; p++) { const e = pL[c][p] - bk[g][p]; d += e * e; }
        if (d >= bd) continue;
        for (let k = 0; k < 4; k++) {
          const n = c + nb[k];
          if ((k === 2 && cx === 0) || (k === 3 && cx === 39) || n < 0 || n >= 1000) continue;
          const nE = gE[band((n / 40) | 0)][m[n]][opp[k]];
          const e = (ge[g][k] - nE) - (tE[c][k] - tE[n][opp[k]]);
          d += SEAMW * e * e * (k < 2 ? 4 : 8);
        }
        d += runCost(c, cx, books[band(cy)][g]);
        if (d < bd) { bd = d; best = g; }
      }
      m[c] = best;
    }
  }
  MAPS.push(m);
  // Report the error over the cells each band actually owns, not the whole-frame RMS, which
  // would average in rows the other band drew and hide which half is doing badly.
  let e = 0;
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    const g = books[band(cy)][m[cy * 40 + cx]];
    for (let r = 0; r < 8; r++) for (let i2 = 0; i2 < 4; i2++) {
      const d = LU[pix[f][(cy * 8 + r) * 160 + cx * 4 + i2]] - LU[g[r * 4 + i2]];
      e += d * d;
    }
  }
  rms.push(Math.sqrt(e / 32000) / 255);
  console.error(`  ${f}: RMS ${rms[rms.length - 1].toFixed(4)}` +
                `  (${new Set(m.slice(0, SPLITROW * 40)).size} top codes, ` +
                `${new Set(m.slice(SPLITROW * 40)).size} bottom codes used)`);
}
console.error(`  mean RMS ${(rms.reduce((a, b) => a + b, 0) / rms.length).toFixed(4)}`);

// How compressible is a map? They are mostly one background code, so a run-length pass may
// decide whether the pictures live in the game's image or have to come off the disk.
{
  const rle = m => { let n = 0; for (let i = 0; i < m.length;) { let j = i; 
    while (j < m.length && m[j] === m[i] && j - i < 255) j++; n += 2; i = j; } return n; };
  const tot = MAPS.reduce((a, m) => a + rle(m), 0);
  console.error('  RLE report: ' + MAPS.map(m => rle(m)).join(' + ') + ' = ' + tot +
                ' bytes, against ' + MAPS.length * 1000 + ' raw');
}
const packed = book => book.flatMap(c => {
  const bytes = [];
  for (let r = 0; r < 8; r++)
    bytes.push([0, 1, 2, 3].reduce((v, i) => v | (c[r * 4 + i] << (6 - 2 * i)), 0));
  return bytes;
});

// ---- VIC bank 0 ----
const LIVE = 0x2000;              // two screen slots, so the next picture loads off-display
// With one book there is no second charset to point at, so both $d018 values name the same
// address and the split store becomes a harmless rewrite of the value already there.
const CHARS = ONEBOOK ? [0x3000, 0x3000] : [0x3000, 0x3800];
const MAPSRC = 0x4000;
const NIMG = SHOW.length;
// The screen pointer is the high nibble and the charset pointer is bits 1-3, so one byte carries
// both -- and the split is a single store of the SAME screen with the other charset.
const d018 = (slot, chr) => hx(((((LIVE + slot * 0x400) >> 6) & 0xf0) | ((CHARS[chr] >> 10) & 0x0e)));
// Raster line of the split. Row 0's first line is 51, so row N starts at 51 + N*8. The store has
// to land before the VIC fetches this line's character data, which is why it happens at the very
// top of the line rather than at leisure.
const SPLITRAS = 51 + SPLITROW * 8;
const PICFR = +(process.env.FACEPICFR ?? 0);

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

        lda $02a6               ; KERNAL's PAL flag, still valid: a frame differs on the two machines
        beq isNtsc
        lda #${PICFR || 100}
        sta picFr
        jmp rdy
isNtsc: lda #${PICFR || 120}
        sta picFr

rdy:    lda #${NIMG - 1}        ; see preld: it loads the picture AFTER pic, into the slot NOT
        sta pic                 ;   displayed, so both start one behind
        lda #$01
        sta slot
        jsr preld
        lda #$00
        sta slot
        lda nxt
        sta pic

main:   jsr shown
        jsr preld               ; next picture into the other slot while this one is up
        lda picFr
        sta cnt
frm:    jsr wframe
        dec cnt
        bne frm
        lda slot
        eor #$01
        sta slot
        lda nxt
        sta pic
        bne main                ; only picture 0 gets the black pause in front of it

        lda $d011               ; safe here: wframe just returned, so the beam is in the lower
        and #$ef                ;   border and DEN lands between frames rather than tearing one
        sta $d011
        jsr shown
        ldx picFr
blk:    jsr wframe
        dex
        bne blk
        lda $d011
        ora #$10
        sta $d011
        jmp main

        ; The two $d018 values for the slot on display: same screen, the two charsets.
shown:  ldx slot
        lda d018TT,x
        sta vTop
        lda d018TB,x
        sta vBot
        ; Store the TOP value, not the bottom one. wframe only restores vTop at raster 251, which
        ; is after the coming frame has already been drawn -- and preld's 1KB copy runs for most
        ; of that frame -- so leaving $d018 on the bottom charset here draws the whole top band
        ; with the wrong dictionary for exactly one frame at every picture change. That is the
        ; flicker. Called from the lower border, so the store itself is safe.
        lda vTop
        sta $d018
        rts

        ; ---- one frame, and the charset split inside it ----
        ; Wait for the split line and store the bottom charset, then wait for the lower border and
        ; put the top one back for the next frame. Two stores; the VIC does the rest.
        ; The split line is a BADLINE -- row N's first line is raster 51+8N and 51&7 == 3 ==
        ; YSCROLL, so the VIC stalls the CPU from cycle 12 to 54 on exactly the line we want to
        ; change. A store issued at cycle ~10 races that stall; lose, and it lands at cycle 55
        ; with the whole line already fetched from the OLD charset -- one scanline of row N drawn
        ; with the wrong dictionary, which is a visible crease on every picture.
        ; So switch on the line BEFORE, which is not a badline, and only after its own character
        ; fetch has finished. The delay puts the store in the gap between the two lines' fetches.
wframe: lda $d012
        cmp #${hx(SPLITRAS - 1)}
        bne wframe
        ldx #${process.env.SPLITDLY ?? 10}
wfd:    dex
        bne wfd
        lda vBot
        sta $d018
wf2:    lda $d012
        cmp #$fb
        bne wf2
        lda vTop
        sta $d018
wf3:    lda $d012               ; leave the line, so a second call cannot retrigger on it
        cmp #$fb
        beq wf3
        rts

        ; Copy the next picture's map ($400) into the slot not on display.
preld:  ldx pic
        inx
        cpx #${NIMG}
        bcc pl1
        ldx #$00
pl1:    stx nxt
        txa
        asl
        asl                     ; $400 a picture = 4 pages
        clc
        adc #${hx(MAPSRC >> 8)}
        sta rdp+2
        lda slot
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

pic:    !byte 0
nxt:    !byte 0
slot:   !byte 0
cnt:    !byte 0
picFr:  !byte 0
vTop:   !byte 0
vBot:   !byte 0
d018TT: !byte ${[0, 1].map(s => d018(s, 0)).join(',')}
d018TB: !byte ${[0, 1].map(s => d018(s, 1)).join(',')}

        * = ${hx(CHARS[0])}
        !byte ${packed(books[0]).join(',')}${ONEBOOK ? '' : `
        * = ${hx(CHARS[1])}
        !byte ${packed(books[1]).join(',')}`}
${MAPS.map((m, i) => `        * = ${hx(MAPSRC + i * 0x400)}\n        !byte ${m.join(',')}`).join('\n')}
`;

const OUT = process.env.OUT ?? './la-test8.d64';
const r = assemble(src);
const d = D64.createEmpty('FACETEST3', '03');
d.writeFile('FACETEST3', Buffer.from(r.prg), D64.FILE_TYPE_PRG);
writeFileSync(OUT, Buffer.from(d.getData()));
console.log(`${OUT}: $${r.org.toString(16)}-$${r.end.toString(16)}, ${r.bytes.length} bytes, ` +
            `${NIMG} pictures x 1 map, ${ONEBOOK ? 'ONE charset (' + (2048 + NIMG*1000) + ' bytes)' : 'TWO charsets split at row ' + SPLITROW + ' (raster ' + SPLITRAS + ')'}`);

// ---- ASSET=1: emit death-pics.json for build-iray.mjs ----
// Same rule the rest of the project follows: a file the BUILD READS is an asset and is committed,
// and everything else here is a picture regenerated by a tool. The game needs the charset, one
// map per picture, and the four palette values -- nothing about the slideshow harness.
if (process.env.ASSET === '1') {
  if (!ONEBOOK) throw new Error('ASSET needs ONEBOOK=1: the game has ONE charset for the scene');
  const asset = {
    source: 'build-facetest3.mjs',
    train: TRAIN.map(([f, b]) => `${f}:${b}`).join(','),
    chars: packed(books[0]),
    maps: SHOW.map((f, i) => ({ name: f, map: MAPS[i] })),
    d021: FACE.d021, d022: FACE.d022, d023: FACE.d023,
    colram: 0x08 | (FACE.colram & 7),
    rms: rms.map(v => +v.toFixed(4)),
  };
  while (asset.chars.length < 2048) asset.chars.push(0);     // KONE < 256: pad to the full charset
  if (asset.chars.length !== 2048) throw new Error(`charset is ${asset.chars.length} bytes, not 2048`);
  for (const m of asset.maps) if (m.map.length !== 1000)
    throw new Error(`${m.name} map is ${m.map.length} cells, not 1000`);
  // ASSETOUT=path: write the asset elsewhere, to LOOK at a candidate without replacing the game's
  // (tools/renderpic.mjs draws one as a PNG)
  writeFileSync(process.env.ASSETOUT ?? './data/death-pics.json', JSON.stringify(asset));
  console.error(`  death-pics.json: charset 2048 + ${asset.maps.length} x 1000` +
                ` = ${2048 + asset.maps.length * 1000} bytes, RMS ${asset.rms.join('/')}`);
}
