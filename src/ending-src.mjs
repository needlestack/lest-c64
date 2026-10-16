// ending-src.mjs -- THE END: what runs after the player drops through the last hole.
//
// Two files, because the quote has to be up in about a second and the tree is 25K:
//
//   IEND  $c000-$cfff  the end quote (charset + map, from quote-end.json) and the code that shows it,
//                      loads ITRE behind it, holds it for reading, cuts to black -- and, at the very
//                      end, REBOOT: reloads the game's files and starts it again at level 1.
//   ITRE  $0800-$6bff  the tree (from end-scene.json, see tools/endscene.mjs) and its player: the
//                      picture DISSOLVES in, lights blinking and leaves turning all the while, then
//                      just stays. RETURN blanks the screen and jumps to REBOOT.
//
// The game hands over in lvlLoad (build-iray.mjs): a hole whose destination is END_DST is not a
// level, so instead of a level file it loads IEND with the same live Krill resident and jumps in.
// From then on nothing of the game runs; Krill's resident at $0400 is the one thing that must survive
// until REBOOT has reloaded everything, so nothing here touches $0400-$07ff.
//
// THE PICTURE IS KEPT TWICE, plus a MASK, because it is animated while it dissolves in:
//   SRC  the picture as it is NOW. Lights and turning leaves change THIS, never the screen directly.
//   MASK one bit pair per pixel: has the dissolve reached it yet?
//   DSP  the bitmap the VIC shows. Every byte of it is always exactly SRC AND MASK.
// A leaf that turns before the dissolve reaches it is turned in SRC and stays invisible until its
// pixels come up -- already turned. Without the mask, a turn would either show pixels early or be
// overwritten by stale ones when the dissolve arrived. Once the dissolve is done the mask is all
// ones and the same code just copies.
//
// RANDOM WITH NO REPEATS: a 15-bit maximal-length LFSR (Galois form, x^15 + x^14 + 1) steps through
// every value 1..32767 exactly once before it repeats -- the trick Wolfenstein 3D's "fizzlefade"
// used. A multicolour bitmap is 160x200 = 32,000 pixels, so value v names pixel v-1, and the 767
// values past the picture are simply skipped. When the register is back at its seed, every pixel has
// been drawn exactly once: no pixel twice, none left over, no bookkeeping.
import { assemble } from './asm6502.mjs';

export const END_DST = 0xfe;        // lvlNxtT's "this hole is the end of the game" ($ff = no exit)
export const IEND_NAME = 'IEND', ITRE_NAME = 'ITRE';

// ---- IEND: bank 3 ($c000-$cfff), clear of every file REBOOT reloads (ICHR is $c000-$c7ff and
// lands on the quote's charset, which is dead by then -- but not on REBOOT itself at $cc00) ----
const Q_CHR = 0xc000, Q_SCR = 0xc800, Q_RUN = 0xcc00;
export const IEND_RUN = Q_RUN;      // the game's endGo jumps here once IEND is in
// ---- ITRE: VIC bank 2 for the display; everything else below it ----
const T_RUN = 0x0800;               // code and light tables, to $0fff
const SITE = 0x1000;                // five 1K leaf-site fields, to $23ff
const RINGS = 0x2400;               // 1024 rings of 8 bytes, to $43ff
const SRC = 0x4400;                 // the picture as it is now (8000)
const SRC_COL = 0x6400;             // colour RAM data (1000), copied to $d800 at the switch
const SRC_SCR = 0x6800;             // screen data (1000), copied to DSP_SCR at the switch
const T_END = 0x6c00;               // ITRE's file ends here; the rest is made at run time
const MASK = 0x6c00;                // 8000, zeroed at start
const DSP_SCR = 0x8c00;             // bank 2 + $0c00 ($9000-$9fff is the char ROM's shadow there)
const DSP = 0xa000;                 // bank 2 + $2000
// SRC, MASK and DSP are all page aligned, so one byte offset is the same low byte in all three and
// the high bytes differ by these constants
const MASKD = (MASK - SRC) >> 8, DSPD = (DSP - SRC) >> 8;

const hx = (n, w = 2) => '$' + n.toString(16).padStart(w, '0');
const B = a => a.map(v => hx(v & 255)).join(',');
const rows = (a, n = 32) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(`        !byte ${B(a.slice(i, i + n))}`); return o.join('\n'); };
const petscii = s => [...s].map(c => hx(c.charCodeAt(0))).join(',') + ',0';

// opts: scene (end-scene.json), quote (quote-end.json), files (the boot's file list: tag, name, at,
// length, first, runtime), entry (the game's entry address), krill (loadraw's address),
// holdS / dissolveS (timings; see below)
// autoF (TEST ONLY, ENDAUTO=n in build-iray.mjs): press RETURN by itself n frames after the dissolve
// ends, so a headless run can reach REBOOT -- with interrupts off the keyboard matrix is read
// directly, and VICE's monitor can only feed the KERNAL's buffer, which nothing here reads.
export function buildEnding({ scene, quote, files, entry, krill, holdS = 6, dissolveS = 8, autoF = 0 }) {
  if (autoF > 255) throw new Error('autoF counts frames in one byte');
  // ======================================================================================== IEND
  if (quote.glyphs > 256 || quote.chars.length > 0x800) throw new Error(`the end quote has ${quote.glyphs} glyphs; its charset slot holds 256`);
  // REBOOT reloads what the BOOT loads, minus the file under the I/O hole (IHOL, "first"): it lives in
  // the RAM at $d000-$dfff, which nothing in the ending can even write -- with I/O mapped a store there
  // is a register write -- so it is still intact. Runtime files (levels 2-7) the game loads itself.
  const reload = files.filter(f => !f.runtime && !f.first);
  const qsrc = `
        * = ${hx(Q_CHR, 4)}
${rows(quote.chars)}
        * = ${hx(Q_SCR, 4)}
${rows(quote.screen)}
        * = ${hx(Q_RUN, 4)}
qt      = $f2               ; frames left to wait
; ---- the game has just jumped here, from lvlLoad, mid-fall, with the display blanked ----
qStart: sei
        lda #$35            ; KERNAL and BASIC out, I/O in: what the game runs in -- and what an
        sta $01             ;   ENDBOOT test disk, arriving straight from the boot, does not
        lda #$00
        sta $d015           ; the game's sprites
        sta $d01a           ; ...and its raster interrupt: this owns the machine now
        lda #$7f
        sta $dc0d
        sta $dd0d
        lda $dc0d
        lda $dd0d
        lda #$ff
        sta $d019           ; anything already pending
        lda #$00
        sta $d418           ; silence
        sta $d020
        sta $d021
        lda #${quote.ink}   ; the quote's ink, the same grey as the opening one
        jsr qInk
        lda #$00            ; VIC bank 3 -- written whole, upper bits 0: Krill owns $dd00's serial
        sta $dd00           ;   bits and asks that a bank switch never read-modify-write it
        lda #${hx(((Q_SCR - 0xc000) >> 10) << 4 | ((Q_CHR - 0xc000) >> 11) << 1)}
        sta $d018           ; screen ${hx(Q_SCR, 4)}, charset ${hx(Q_CHR, 4)}
        lda #$08
        sta $d016           ; hi-res text, 40 columns
        lda #$1b
        sta $d011           ; text mode, display ON: the quote is up
        ; ---- and the tree comes in behind it ----
        jsr qKern
        ldx #<nTre
        ldy #>nTre
        jsr ${hx(krill, 4)}       ; Krill's loadraw: the file's own header says where it goes
        bcs qFail
        jsr ${hx(T_RUN + 3, 4)}       ; ITRE's tPrep: its setup, done now behind the quote
        ; READING TIME. The load is blocking, so it cannot be counted in frames; the quote is held
        ; HOLD seconds more after it, then CUT straight to the dissolve: the first frame after the
        ; quote is the tree's black bitmap. (It faded grey2 -> dark grey -> black at first; two steps
        ; did not read as a fade, per the user.)
        ; holdS * 60 frames EXACTLY, in qWait calls of at most 240 (a byte). It used to round UP to
        ; whole 240-frame calls, so holdS = 6 held 8 s (2026-10-15).
${(() => { const out = []; for (let left = Math.round(holdS * 60); left > 0; left -= 240)
  out.push(`        lda #${Math.min(240, left)}\n        jsr qWait`); return out.join('\n'); })()}
        jmp ${hx(T_RUN, 4)}       ; ITRE's tStart

; A frames, each ended at raster line 250 -- by waiting for the line and then for it to pass, so a
; caller with nothing to do between two calls cannot see the same line twice
qWait:  sta qt
qw1:    lda $d012
        cmp #$fa
        bne qw1
qw2:    lda $d012
        cmp #$fa
        beq qw2
        dec qt
        bne qw1
        rts

qInk:   ldx #$00            ; colour RAM, all of it, to A
qi1:    sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne qi1
        rts

; the three KERNAL bytes Krill's resident reads, set as lvlLoad sets them
qKern:  lda #$00
        sta $99             ; DFLTN: input from the keyboard
        lda #$03
        sta $9a             ; DFLTO: output to the screen
        lda #$08
        sta $ba             ; FA: the drive to talk to
        rts

qFail:  lda #$02            ; RED border, display on: a load failed (status in A is lost; see $02)
        sta $d020
        sta $02
qf:     jmp qf

; ---- REBOOT: ITRE jumps here on RETURN, with the display blanked ----
; The game's own files, in the boot's order, then the game's entry -- which is also where a death
; restarts it, so it already sets up everything it needs from a dirty machine. Level 1 is ILV1,
; reloaded with the rest, and entry starts at the boot level.
reboot: sei
        jsr qKern
${reload.map(f => `        ldx #<n${f.tag}
        ldy #>n${f.tag}
        jsr ${hx(krill, 4)}
        bcs qFail`).join('\n')}
        jmp ${hx(entry, 4)}

nTre:   !byte ${petscii(ITRE_NAME)}
${reload.map(f => `n${f.tag}:   !byte ${petscii(f.name)}`).join('\n')}
`;
  const qa = assemble(qsrc), QL = qa.labels;
  if (QL.qStart !== IEND_RUN) throw new Error(`IEND's entry is ${hx(QL.qStart, 4)}, but the game jumps to ${hx(IEND_RUN, 4)}`);
  if (qa.end > 0xd000) throw new Error(`IEND runs to ${hx(qa.end, 4)}, into the I/O hole`);
  // REBOOT must not be loaded over while it is running the loads
  for (const f of reload) if (f.at < qa.end && f.at + f.length > Q_RUN) throw new Error(
    `REBOOT (${hx(Q_RUN, 4)}-${hx(qa.end, 4)}) would be overwritten by ${f.name} (${hx(f.at, 4)}+${f.length}) while it runs`);

  // ======================================================================================== ITRE
  const { lights, sites, bg } = scene;
  const flat = lights.flatMap(l => l.bytes), NL = lights.length;
  if (flat.length > 255) throw new Error(`${flat.length} light bytes; the table holds 255`);
  let first = 0; const lfirst = lights.map(l => { const f = first; first += l.bytes.length; return f; });
  const NSITES = sites.length;
  if (NSITES !== 1024) throw new Error(`the player indexes 1024 leaf sites with 10 random bits; the scene has ${NSITES}`);
  const FIELDS = ['alo', 'ahi', 'len', 'sx', 'sy'];
  // sx/sy: the site's character cell (column + 16, so a gust can start off-screen without going
  // negative; row), for the gust test
  const fieldOf = (f, st) => f === 'alo' ? (SRC + st.o) & 255 : f === 'ahi' ? (SRC + st.o) >> 8
    : f === 'len' ? st.ring.length : f === 'sx' ? st.cx + 16 : st.cy;
  // load field f of the current site (idxlo/idxhi) into A; clobbers Y and ptr
  const fld = f => `        lda idxlo
        sta ptr
        lda idxhi
        clc
        adc #>${hx(SITE + FIELDS.indexOf(f) * 0x400, 4)}
        sta ptr+1
        ldy #$00
        lda (ptr),y`;
  // THE DISSOLVE'S PACE: the whole period over dissolveS seconds at 60 frames a second (NTSC; a PAL
  // machine takes a fifth longer). Each step is ~90 cycles, so 68 a frame is ~6,000 of ~16,000.
  const STEPS = Math.ceil(32767 / (dissolveS * 60));
  if (STEPS > 120) throw new Error(`${STEPS} dissolve steps a frame will not fit in one; make dissolveS longer`);
  // TURNS PER FRAME inside a gust, in 256ths: 171 is 2 every 3 frames. It was one every 2nd frame
  // (128) until the user asked for "a bit more wind in the leaves -- not a lot, just a little more".
  const GRATE = 171;
  const GUSTW = 4, GUSTH = 3;   // half-width (cells) and half-height (rows) of the gust window

  const tsrc = `
seedlo  = $fb
seedhi  = $fc
ptr     = $fd               ; and $fe
tgt     = $f9               ; and $fa: the SRC byte being changed
cnt     = $f6
cnt2    = $f5
idxlo   = $f4
idxhi   = $f3
tlen    = $10
trp     = $11
tv      = $12
tm      = $13
tm2     = $14
tmp     = $15
rptr    = $16               ; and $17
fcount  = $18
gact    = $19
gdir    = $1a
gy      = $1b
gspd    = $1c
gxlo    = $1d
gxhi    = $1e
gcalm   = $1f
mp      = $20               ; and $21: the MASK byte
dp      = $22               ; and $23: the DSP byte
sp      = $24               ; and $25: the SRC byte (the dissolve's own)
dvlo    = $26               ; the dissolve's LFSR
dvhi    = $27
ddone   = $28
dcnt    = $29
plo     = $2a
phi     = $2b
krel    = $2c               ; RETURN has been seen UP since the scene began
kauto   = $2d               ; ENDAUTO's countdown
gacc    = $2e               ; the gust's turn rate, accumulated

        * = ${hx(T_RUN, 4)}
        jmp tStart          ; IEND, when the quote has had its time
        jmp tPrep           ; IEND, as soon as this file is in

; ---- tPrep: everything that can be made ready while the quote is still up ----
; About 0.2 s of work (16K zeroed, a screen copied). Done in the reading hold, the cut from the quote
; to the dissolve is instant; done at the cut it was a fifth of a second of black. Nothing here may
; touch what the VIC is showing -- the quote, in bank 3 -- and that includes COLOUR RAM, which the
; quote's text is inked from: that waits for tStart.
tPrep:  lda #>${hx(MASK, 4)}       ; nothing dissolved yet...
        ldy #$20
        jsr fill0
        lda #>${hx(DSP, 4)}        ; ...so nothing shown
        ldy #$20
        jsr fill0
        ldx #$00            ; the screen data into place: 4 pages (the last runs over the 1000 bytes by
cp:     lda ${hx(SRC_SCR, 4)},x     ;   24 -- harmless: past the end of the data is padding, and past the
        sta ${hx(DSP_SCR, 4)},x     ;   end of the screen are sprite pointers nothing uses)
        lda ${hx(SRC_SCR + 0x100, 4)},x
        sta ${hx(DSP_SCR + 0x100, 4)},x
        lda ${hx(SRC_SCR + 0x200, 4)},x
        sta ${hx(DSP_SCR + 0x200, 4)},x
        lda ${hx(SRC_SCR + 0x300, 4)},x
        sta ${hx(DSP_SCR + 0x300, 4)},x
        inx
        bne cp
        lda $dc04           ; seed the LFSR from a running CIA timer: every run differs
        ora #$01
        sta seedlo
        lda $dc05
        sta seedhi
        lda #$01            ; the dissolve's register at its seed -- any non-zero value would do
        sta dvlo
        lda #$00
        sta dvhi
        sta ddone
        sta krel
        lda #${autoF & 255}
        sta kauto
        lda #$00            ; no gust yet: the first comes after a second of calm
        sta gact
        lda #$3c
        sta gcalm
        ldx #${NL - 1}      ; every light starts ON (as in the picture), each at its own point
li:     lda #$01            ;   in its cycle
        sta lstate,x
        lda lphase,x
        sta ltimer,x
        dex
        bpl li
        rts

; ---- tStart: THE CUT. In the bottom border, so no frame shows half of each ----
; The bitmap goes up first, every byte of it still zero, so the screen is black whatever colour RAM
; holds -- and only then is colour RAM given the tree's colours (~10,000 cycles), unseen. The first
; dissolved pixels come on the next frame.
tStart: lda $d012
        cmp #$fa
        bne tStart
        lda #$00
        sta $d020
        lda #${bg}
        sta $d021
        lda #$01            ; VIC bank 2 ($8000-$bfff), written whole (see IEND)
        sta $dd00
        lda #${hx(((DSP_SCR - 0x8000) >> 10) << 4 | ((DSP - 0x8000) >> 13) << 3)}
        sta $d018           ; screen ${hx(DSP_SCR, 4)}, bitmap ${hx(DSP, 4)}
        lda #$18
        sta $d016           ; multicolour
        lda #$3b
        sta $d011           ; bitmap mode: all black
        ldx #$00
tc:     lda ${hx(SRC_COL, 4)},x
        sta $d800,x
        lda ${hx(SRC_COL + 0x100, 4)},x
        sta $d900,x
        lda ${hx(SRC_COL + 0x200, 4)},x
        sta $da00,x
        lda ${hx(SRC_COL + 0x300, 4)},x
        sta $db00,x
        inx
        bne tc

frame:  lda $d012           ; once per frame: raster line 250, the bottom border -- the line, and
        cmp #$fa            ;   then the line PASSING, so a short frame cannot run twice on it
        bne frame
fw:     lda $d012
        cmp #$fa
        beq fw
        jsr dslv
${leafCode(fld, GRATE, GUSTW, GUSTH)}
        ; ---- lights: when a light's time is up it toggles, then picks its next wait ----
        ldx #${NL - 1}
lt:     dec ltimer,x
        bne lt9
        lda lstate,x
        eor #$01
        sta lstate,x
        stx cnt
        lda lfirst,x        ; write this light's bytes, on or off -- into SRC, then show it
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
        jsr sync1
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
        ; ---- RETURN: the end of the end. A PRESS, not a key held since before the scene ----
${autoF ? `        lda ddone           ; ENDAUTO (a test): RETURN presses itself
        beq kau9
        dec kauto
        beq kgo
kau9:
` : ''}        lda #$fe            ; keyboard column 0...
        sta $dc00
        lda $dc01
        and #$02            ; ...row 1 is RETURN, low when down
        bne kup
        lda krel
        beq kdn             ; down, but never seen up: still held from before
kgo:    lda #$0b            ; BLACK: display off, border black
        sta $d011
        lda #$00
        sta $d020
        jmp ${hx(QL.reboot, 4)}   ; IEND's REBOOT: the game again, from level 1
kup:    lda #$01
        sta krel
kdn:    jmp frame

; ---- the dissolve: STEPS pixels a frame, in the LFSR's order, until it is back at its seed ----
dslv:   lda ddone
        bne dsx
        lda #${STEPS}
        sta dcnt
dsl:    lsr dvhi            ; one Galois step: shift right, and if a 1 fell out, apply the taps
        ror dvlo
        bcc dsn
        lda dvhi
        eor #$60            ; x^15 + x^14 + 1
        sta dvhi
dsn:    lda dvlo            ; pixel number p = v - 1, 0..32766
        sec
        sbc #$01
        sta plo
        lda dvhi
        sbc #$00
        cmp #$7d            ; p >= 32000 ($7d00): past the picture, nothing to draw
        bcs dsk
        sta phi
        lda plo
        and #$03
        tax                 ; which pixel of its byte
        lsr phi             ; ...and the byte, p / 4
        ror plo
        lsr phi
        ror plo
        lda plo
        sta sp
        sta mp
        sta dp
        lda phi
        clc
        adc #>${hx(SRC, 4)}
        sta sp+1
        lda phi
        clc
        adc #>${hx(MASK, 4)}
        sta mp+1
        lda phi
        clc
        adc #>${hx(DSP, 4)}
        sta dp+1
        ldy #$00
        lda pbit,x          ; the pixel is now dissolved in...
        ora (mp),y
        sta (mp),y
        and (sp),y          ; ...and the byte shown is SRC AND MASK, as always
        sta (dp),y
dsk:    lda dvhi            ; back at the seed: every pixel has been drawn exactly once
        bne dsc
        lda dvlo
        cmp #$01
        bne dsc
        inc ddone
        rts
dsc:    dec dcnt
        bne dsl
dsx:    rts
pbit:   !byte $c0,$30,$0c,$03

; ---- sync: SRC changed at tgt (row 0, and with sync3 rows 1 and 2): show it as SRC AND MASK ----
; Keeps X. Three rows for a leaf square (2 or 3 rows tall); re-syncing a byte that did not change is
; harmless, since DSP = SRC AND MASK holds for every byte at all times.
sync1:  ldy #$00
        beq syn             ; always
sync3:  ldy #$02
syn:    lda tgt
        sta mp
        sta dp
        lda tgt+1
        clc
        adc #${hx(MASKD)}
        sta mp+1
        lda tgt+1
        clc
        adc #${hx(DSPD)}
        sta dp+1
syl:    lda (tgt),y
        and (mp),y
        sta (dp),y
        dey
        bpl syl
        rts

fill0:  sta f0+2            ; Y pages from page A, to zero
        lda #$00
        tax
f0:     sta $ff00,x
        inx
        bne f0
        inc f0+2
        dey
        bne f0
        rts
${turnCode(fld, RINGS)}
; a random site (10 bits) into idxlo/idxhi
pick:   jsr rnd
        sta idxlo
        lda seedhi
        and #$03
        sta idxhi
        rts

        ; 16-bit Galois LFSR (taps $b400); returns the low byte in A
rnd:    lsr seedhi
        ror seedlo
        bcc rnd1
        lda seedhi
        eor #$b4
        sta seedhi
rnd1:   lda seedlo
        rts

ltimer: !fill ${NL},0
lstate: !fill ${NL},0
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
${rows(lights.map(l => l.pause))}
lphase:
${rows(lights.map(l => l.phase))}
baddrlo:
${rows(flat.map(b => (SRC + b.o) & 255))}
baddrhi:
${rows(flat.map(b => (SRC + b.o) >> 8))}
bon:
${rows(flat.map(b => b.on))}
boff:
${rows(flat.map(b => b.off))}
tCodeEnd:
${FIELDS.map((f, k) => `        * = ${hx(SITE + k * 0x400, 4)}\nsite_${f}:\n${rows(sites.map(st => fieldOf(f, st)))}`).join('\n')}
        * = ${hx(RINGS, 4)}
rings:
${rows(sites.flatMap(st => [...st.ring, ...Array(8 - st.ring.length).fill(0)]))}
        * = ${hx(SRC, 4)}
${rows(scene.bm)}
        * = ${hx(SRC_COL, 4)}
${rows(scene.col)}
        * = ${hx(SRC_SCR, 4)}
${rows(scene.scr)}
`;
  const ta = assemble(tsrc), TL = ta.labels;
  if (TL.tCodeEnd > SITE) throw new Error(`ITRE's code and light tables run to ${hx(TL.tCodeEnd, 4)}, into the leaf sites at ${hx(SITE, 4)}`);
  if (ta.end > T_END) throw new Error(`ITRE runs to ${hx(ta.end, 4)}, into the mask at ${hx(MASK, 4)}`);
  if (ta.org < 0x0800) throw new Error(`ITRE starts at ${hx(ta.org, 4)}, on Krill's resident`);
  return {
    iend: { name: IEND_NAME, prg: qa.prg, at: qa.org, end: qa.end, run: QL.qStart, reboot: QL.reboot },
    itre: { name: ITRE_NAME, prg: ta.prg, at: ta.org, end: ta.end, run: TL.tStart, codeEnd: TL.tCodeEnd, labels: TL },
    steps: STEPS,
  };
}

// THE WIND IS A GUST THAT TRAVELS (the user: "too much movement -- half as much at half the speed",
// and "I like your wind spatial idea"). A gust is a window GUSTW x GUSTH cells that drifts across the
// canopy from one side to the other (random side, height and speed: 3-7 s to cross); leaves turn
// only inside it, at most GRATE/256 turns a frame, so neighbouring leaves stir together and then
// settle. Between gusts, 1.5-2.5 s of CALM with only the odd lone turn anywhere (one in 16 frames).
// (Calm was 2-4 s and lone turns one in 32 until the user's "a little more wind".)
// A turn picks a random site and keeps it only if it lies inside the gust -- up to 6 tries a frame.
const leafCode = (fld, GRATE, GUSTW, GUSTH) => `
        inc fcount
        lda gact
        bne gmove
        lda fcount          ; ---- CALM: the odd lone turn, anywhere ----
        and #$0f
        bne gc1
        jsr pick
        jsr turn
gc1:    dec gcalm
        beq gnew
        jmp sdone
gnew:   jsr rnd             ; ---- a new GUST: which way, how high, how fast ----
        and #$01
        sta gdir
        jsr rnd
        and #$0b
        clc
        adc #$02            ; rows 2..13: the canopy
        sta gy
        jsr rnd
        and #$1f
        clc
        adc #$18            ; $18..$37/256 of a cell a frame: 3-7 s across
        sta gspd
        lda gdir
        beq gnl
        lda #$0a            ; rightward: start off the left edge (column -6, stored +16)
        jmp gns
gnl:    lda #$3e            ; leftward: off the right edge (column 46)
gns:    sta gxhi
        lda #$00
        sta gxlo
        lda #$01
        sta gact
        jmp sdone
gmove:  lda gdir            ; ---- the gust drifts ----
        beq gml
        lda gxlo
        clc
        adc gspd
        sta gxlo
        bcc gm2
        inc gxhi
        jmp gm2
gml:    lda gxlo
        sec
        sbc gspd
        sta gxlo
        bcs gm2
        dec gxhi
gm2:    lda gxhi
        cmp #$0a
        bcc gend
        cmp #$3f
        bcs gend
        lda gacc            ; GRATE/256 of a turn a frame: a turn whenever the fraction carries
        clc
        adc #${GRATE}
        sta gacc
        bcc sdone
        lda #$06            ; up to 6 tries for a site inside the gust
        sta cnt2
gtry:   jsr pick
${fld('sx')}
        sec
        sbc gxhi
        bpl gax
        eor #$ff
        clc
        adc #$01
gax:    cmp #${GUSTW + 1}
        bcs gno
${fld('sy')}
        sec
        sbc gy
        bpl gay
        eor #$ff
        clc
        adc #$01
gay:    cmp #${GUSTH + 1}
        bcs gno
        jsr turn
        jmp sdone
gno:    dec cnt2
        bne gtry
        jmp sdone
gend:   lda #$00            ; the gust has gone: CALM for 1.5-2.5 s (90-153 frames)
        sta gact
        jsr rnd
        lsr
        lsr
        clc
        adc #$5a
        sta gcalm
sdone:`;

// TURN the site in idxlo/idxhi: read its ring's pixels out of SRC, write them back moved round the
// ring, then show the result (sync3). The ring is the site's pixel positions, row*4 + pixel, in
// clockwise order; a turn moves every pixel 1 or 3 places (ring of 4) or 2 or 6 (ring of 8) round it.
// WHY THIS CANNOT WEAR THE PICTURE OUT: see tools/endscene.mjs -- every square is leaf pixels inside
// one character cell, so each cell keeps exactly the pixels it started with.
const turnCode = (fld, RINGS) => `
turn:
${fld('alo')}
        sta tgt
${fld('ahi')}
        sta tgt+1
${fld('len')}
        sta tlen
        lda idxlo           ; rptr = RINGS + site*8
        asl
        asl
        asl
        sta rptr
        lda idxlo
        lsr
        lsr
        lsr
        lsr
        lsr
        sta tmp
        lda idxhi
        asl
        asl
        asl
        ora tmp
        clc
        adc #>${'$' + RINGS.toString(16)}
        sta rptr+1
        ldx #$00            ; READ: tbuf[i] = the pixel at ring position i
trd:    txa
        tay
        lda (rptr),y
        sta trp
        lsr
        lsr
        tay                 ; its row
        lda (tgt),y
        sta tv
        lda trp
        and #$03
        tay                 ; its pixel: shift right 2*(3-pixel)
        lda tv
tsh:    cpy #$03
        beq tshd
        lsr
        lsr
        iny
        jmp tsh
tshd:   and #$03
        sta tbuf,x
        inx
        cpx tlen
        bne trd
        jsr rnd             ; how far round: 1 or 3 places in a ring of 4, 2 or 6 in a ring of 8
        and #$01
        tay
        lda tlen
        cmp #$08
        beq t8
        lda m4,y
        jmp tm0
t8:     lda m8,y
tm0:    sta tm
        ldx #$00            ; WRITE: position j gets tbuf[(j + m) mod len]
twr:    txa
        clc
        adc tm
        cmp tlen
        bcc twr1
        sec
        sbc tlen
twr1:   tay
        lda tbuf,y
        sta tv
        txa
        tay
        lda (rptr),y
        sta trp
        and #$03
        tay                 ; shift left 2*(3-pixel)
        lda tv
tsl:    cpy #$03
        beq tsld
        asl
        asl
        iny
        jmp tsl
tsld:   sta tv
        lda trp
        and #$03
        tay
        lda clrm,y
        sta tm2
        lda trp
        lsr
        lsr
        tay
        lda (tgt),y
        and tm2
        ora tv
        sta (tgt),y
        inx
        cpx tlen
        bne twr
        jmp sync3           ; ...and show it, as far as the dissolve has come
m4:     !byte 1,3
m8:     !byte 2,6
clrm:   !byte $3f,$cf,$f3,$fc
tbuf:   !fill 8,0`;
