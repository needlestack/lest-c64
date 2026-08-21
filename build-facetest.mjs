// A standalone viewer for the face-charset experiment. Nothing to do with the game.
//
// One 256-glyph charset carries five full-screen pictures, and a SECOND charset is the same 256
// glyphs with every row reversed -- which costs nothing at runtime, because cpChr in the game
// builds its second charset from the first with exactly that transform. This disk runs the two
// against each other automatically: each picture strobes between the upright and flipped
// charsets 5x/second for one second, then the next picture, then a black second before looping.
//
//   node fit-face.mjs ... FACEPREQ=1 FACEKEY=preq   (first, to make face-extra.json)
//   node build-facetest.mjs                          -> la-test.d64
import { writeFileSync, readFileSync } from 'fs';
import { assemble } from './asm6502.mjs';
await import('./d64lib.js');
const D64 = globalThis.D64;

const FACE  = JSON.parse(readFileSync('./angel-face.json', 'utf8')).hangl1;
const EXTRA = JSON.parse(readFileSync('./face-extra.json', 'utf8'));
const IMAGES = ['a1', 'a2', 'a3', 'a4', 'a5'];   // angel-1..5, in order
// The two charsets, and a screen map per picture per charset. A glyph code means something
// different in each charset, so the map has to change with $d018 -- see LIVE below.
const SETS = [EXTRA.preq, EXTRA.preqFlip];
const hx = n => '$' + n.toString(16);

// ---- VIC bank 0 layout ----
// The flip has to be glitch-free at 5Hz, so it must NOT copy a screen map. $d018 holds the screen
// pointer AND the charset pointer, so if both maps are already resident the whole flip is one
// write to one register. Four live screen slots, not two: while a pair is on display the other
// pair is where the NEXT picture is loaded, so the 2KB copy never touches visible memory.
// $1000-$1fff is the char-ROM shadow -- the one place in this bank the VIC cannot see RAM -- so
// everything the VIC reads sits at $2000 and above.
const LIVE = 0x2000;          // 4 screen slots x $400: pair 0 = 0,1  pair 1 = 2,3
const CHARS = [0x3000, 0x3800];
const MAPSRC = 0x4000;        // the five pictures' maps, $800 per picture (upright then flipped)
const NIMG = IMAGES.length;
// idx = pair*2 + flip. Screen = LIVE + idx*$400, charset = CHARS[flip].
const d018T = [0, 1, 2, 3].map(idx =>
  hx((((LIVE + idx * 0x400) >> 6) & 0xf0) | ((CHARS[idx & 1] >> 10) & 0x0e)));

const PICFR  = +(process.env.FACEPICFR  ?? 0);   // 0 = one second, from the PAL/NTSC flag
const FLIPFR = +(process.env.FACEFLIPFR ?? 0);   // 0 = 5 flips/second

const src = `
        * = $0801
        !byte $0b,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00   ; SYS 2061

        ; Interrupts OFF for the whole run. Nothing here needs the KERNAL, and the frame tick is
        ; a poll of $d012 -- the KERNAL's own IRQ scans the keyboard for well over a scanline, so
        ; it would occasionally step right over the one line the poll is watching for.
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
        sta $d020               ; blanking the screen shows BORDER colour, so this is the black
        ; Colour RAM is the fourth ink, one value for every cell. Bit 3 is the per-cell
        ; multicolor flag, so this is $08 + the colour, and bit pair 11 can only ever be 0..7.
        ldx #$00
        lda #${hx(0x08 | (FACE.colram & 7))}
cr:     sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne cr

        ; One second and 5 flips/second are frame counts, and a frame is not the same length on
        ; the two machines. $02a6 is the KERNAL's PAL flag, set at boot and still valid here.
        lda $02a6
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

        ; Seeding for the first picture, and it has to lie to preld twice. preld loads the picture
        ; AFTER pic, so pic starts at the LAST one to make that picture 0; and it always writes to
        ; the pair NOT on display, so pair starts at 1 to make that destination pair 0 -- the pair
        ; main is about to show. Get either wrong and the first second displays uninitialised RAM,
        ; which looks like a deliberate black frame rather than a bug, because glyph 0 is empty.
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
        jsr preld               ; next picture into the OTHER pair, off-screen, while this one runs
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
        eor #$01                ; the whole A/B: one write to one register
        sta flip
        jsr shown
nof:    dec cnt
        bne frm

        lda pair                ; hand over to the pair preld just filled
        eor #$01
        sta pair
        lda nxt
        sta pic
        bne main                ; only picture 0 gets the black second in front of it

        ; ---- one second of black before the loop restarts ----
        ; Safe to touch $d011 here: wframe just returned, so the beam is in the lower border and
        ; the display-enable change lands between frames rather than tearing one in half.
        lda $d011
        and #$ef                ; DEN off: the VIC draws border colour over the whole screen
        sta $d011
        lda #$00
        sta flip
        jsr shown               ; point at picture 0 while nothing is visible
        ldx picFr
blk:    jsr wframe
        dex
        bne blk
        lda $d011
        ora #$10
        sta $d011
        jmp main

        ; $d018 from (pair, flip). Screen pointer and charset pointer both live in this register,
        ; which is the entire reason the flip needs no memory copy.
shown:  lda pair
        asl
        ora flip
        tax
        lda d018T,x
        sta $d018
        rts

        ; Copy the next picture's two maps ($800, both charsets) into the pair NOT on display.
        ; Once a second, and never into visible memory, so it can take as long as it likes.
preld:  ldx pic
        inx
        cpx #${NIMG}
        bcc pl1
        ldx #$00
pl1:    stx nxt
        txa
        asl
        asl
        asl                     ; $800 per picture = 8 pages
        clc
        adc #${hx(MAPSRC >> 8)}
        sta rdp+2
        lda pair
        eor #$01                ; the off-screen pair
        asl
        asl
        asl
        clc
        adc #${hx(LIVE >> 8)}
        sta wrp+2
        ldx #$08
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

        ; One call = one frame. Raster $fb is in the lower border on both PAL and NTSC; waiting
        ; for it to arrive and then to leave means a second call cannot re-trigger on the same line.
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

${SETS.map((st, i) => `        * = ${hx(CHARS[i])}\n        !byte ${st.chars.join(',')}`).join('\n')}
${IMAGES.flatMap((im, ii) => SETS.map((st, si) =>
    `        * = ${hx(MAPSRC + (ii * 2 + si) * 0x400)}\n        !byte ${st.screen[im].join(',')}`
  )).join('\n')}
`;

const r = assemble(src);
const d = D64.createEmpty('FACETEST', '01');
d.writeFile('FACETEST', Buffer.from(r.prg), D64.FILE_TYPE_PRG);
writeFileSync('./la-test.d64', Buffer.from(d.getData()));
console.log(`la-test.d64: $${r.org.toString(16)}-$${r.end.toString(16)}, ` +
            `${r.bytes.length} bytes, ${NIMG} pictures x 2 charsets, ` +
            `d018 ${d018T.join(' ')}`);
