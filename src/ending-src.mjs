// ending-src.mjs -- THE END: what runs after the player drops through the last hole.
//
// Two files, because the quote has to be up in about a second and the tree is 25K:
//
//   IEND  $c000-$cfff  the end quote (charset + map, from quote-end.json) and the code that shows it,
//                      loads ITRE behind it, holds it for reading, cuts to black -- and, at the very
//                      end, REBOOT: reloads the game's files and starts it again at level 1.
//   ITRE  $0800-$6bff  the tree (from end-scene.json, see tools/endscene.mjs) and its player: the
//                      picture DISSOLVES in, lights blinking and leaves turning all the while, then
//                      just stays. Fire blanks the screen and jumps to REBOOT.
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
import { renderNote } from './note-font.mjs';
import { TUNE_ROW, TUNE_GAP, sidFreq, GEN_LOW, GEN_MODES, GEN_CELLS, GEN_LEN, GEN_ENDS, GEN_TRILL, GEN_TRILL_LAND, GEN_TRILL_IN, GEN_QUOTES, GEN_MOVES, GEN_HOMES, GEN_ENDINGS, GEN_OPEN, GEN_GLIDE_IN, GEN_BEND_IN, GEN_BEND_MIN, GEN_SLUR, GEN_SLUR_RUN, VIB_DEEP_IN, VIB_TURN, VIB_SWING } from './end-tunes.mjs';

export const END_DST = 0xfe;        // lvlNxtT's "this hole is the end of the game" ($ff = no exit)
export const IEND_NAME = 'IEND', ITRE_NAME = 'ITRE', NOTE_NAME = 'INOT';

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
// THE RAM AT $9000-$9FFF, the char ROM's shadow in bank 2 (plain RAM to the CPU), ITRE's run-time
// scratch. ONE MAP, checked for overlaps in buildEnding: from 2026-11-15 to 11-19 the lights' timers
// sat on the generative flute's phrase at $9400 (both "free above the dissolve's tables"), and every
// frame the lights rewrote the notes the flute was about to play.
const RAM_TB = 0x9000;              // the dissolve's tables (tPrep): $9000-$93ff
const GEN_PHRASE = 0x9400, GEN_PMAX = 32;   // the generator's phrase: degrees, then frames, GEN_PMAX each
const RAM_LIGHTS = GEN_PHRASE + 2 * GEN_PMAX; // each light's timer, then its state
// SRC, MASK and DSP are all page aligned, so one byte offset is the same low byte in all three and
// the high bytes differ by these constants
const MASKD = (MASK - SRC) >> 8, DSPD = (DSP - SRC) >> 8;

// level 4's wind: its noise's frequency word (B4 in its song, traced from music/hub.sng)
const WINDF = 0x1fa6;
const hx = (n, w = 2) => '$' + n.toString(16).padStart(w, '0');
const B = a => a.map(v => hx(v & 255)).join(',');
const rows = (a, n = 32) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(`        !byte ${B(a.slice(i, i + n))}`); return o.join('\n'); };
const petscii = s => [...s].map(c => hx(c.charCodeAt(0))).join(',') + ',0';
// THE NOTE after the tree (the user, 2026-11-17): the level select, revealed. Drawn at build time in
// the user's small pixel face (note-font.mjs; 2026-11-18, it was the ROM's font for a day), six
// 8-pixel lines centred on the screen, in grey 3. It is its own FILE, INOT, loaded on the press that
// takes the tree down (IEND's qNote): no room is left in IEND or ITRE for 84 glyphs and a screen.
// It loads into the tree's display, finished with by then: the charset at NOTE_CHR (DSP), the screen
// at NOTE_SCR -- and only its first NOTE_ROWS rows, the last that hold any text; lnote blanks the rest.
const NOTE = ['DURING GAMEPLAY YOU MAY NOW GO TO', "ANY LEVEL BY PRESSING 'L' AND A NUMBER", 'AT THE SAME TIME.',
              '', '', 'PRESS SPACE TO CONTINUE'];
const NOTE_INK = 15;                // grey 3: chosen over the quotes' grey 2 by eye on a CRT (2026-11-18)
const NOTE_CHR = 0xa000, NOTE_SCR = 0xa400;   // bank 2: charset at +$2000, screen at +$2400
const note = renderNote(NOTE);
const NOTE_ROWS = Math.max(...note.screen.map((c, i) => c ? Math.floor(i / 40) + 1 : 0));
if (NOTE_CHR + note.chars.length > NOTE_SCR) throw new Error(`the note's ${note.chars.length / 8} glyphs run into its screen`);
if (1000 - NOTE_ROWS * 40 > 512 || 1000 - NOTE_ROWS * 40 < 256) throw new Error(`lnote blanks the screen's last 256-512 bytes with two stores; the note leaves ${1000 - NOTE_ROWS * 40}`);

// opts: scene (end-scene.json), quote (quote-end.json), files (the boot's file list: tag, name, at,
// length, first, runtime), entry (the game's entry address), krill (loadraw's address),
// holdS / dissolveS (timings; see below), palF (the game's PAL flag: read at qStart, written back by
// REBOOT -- IMG's reload resets it to 0, and only the boot body sets it)
// autoF (TEST ONLY, ENDAUTO=n in build-iray.mjs): press fire by itself n frames after the dissolve
// ends, so a headless run can reach REBOOT -- with interrupts off the keyboard matrix is read
// directly, and VICE's monitor can only feed the KERNAL's buffer, which nothing here reads.
// sound (2026-11-10, the user: "the wind from level 4 without the hum ... after 20 or so seconds of the
// final screen, there could be a song in the distance"): tune = parseTune()'s events, tuneS = seconds
// after the TREE IS WHOLE (the dissolve done) before it first plays, gustS the same for the first
// gust (the user, 2026-11-19: gusts 5 s after the tree, the flute 3 s after that), breath = voice 3's noise pitch (high byte; 0 = no breath),
// brSus its sustain. wind/gust/calm: see leafCode, and soundCode for the wind's filter steps.
// ramp: the dissolve's ending, { at: frames at the base pace, cap: pixels a frame at the end, climb:
// pixels a frame more each frame }.
export function buildEnding({ scene, quote, files, entry, krill, palF = null, holdS = 6, dissolveS = 8, autoF = 0, flute = null,
                              tune = [], tuneS = 8, gustS = 5, breath = 0x38, brSus = 1,
                              genOpts = {}, grate = 384, gust = [5, 4], calm = 60, ramp = { at: 30, cap: 119, climb: 2 } }) {
  if (autoF > 255) throw new Error('autoF counts frames in one byte');
  if (!(holdS >= 1 && holdS <= 255 && Number.isInteger(holdS))) throw new Error('holdS: whole seconds, 1-255');
  const GEN = tune === 'gen';         // the generative flute (genCode), else a fixed tune's events
  const G = GEN ? genCode(genOpts) : null;
  // ======================================================================================== IEND
  if (quote.glyphs > 256 || quote.chars.length > 0x800) throw new Error(`the end quote has ${quote.glyphs} glyphs; its charset slot holds 256`);
  // REBOOT reloads what the BOOT loads, minus the file under the I/O hole (IHOL, "first"): it lives in
  // the RAM at $d000-$dfff, which nothing in the ending can even write -- with I/O mapped a store there
  // is a register write -- so it is still intact. Runtime files (levels 2-7) the game loads itself.
  const reload = files.filter(f => !f.runtime && !f.first);
  const qsrc = `
        * = ${hx(Q_CHR, 4)}
${rows(quote.chars)}
${G ? G.data : ''}
; ---- qNote: load THE NOTE (INOT), for ITRE's lnote. Here in the charset slot's tail, as $cc00-$cfff
; is full: the quote is long gone when it runs, and its 180 glyphs end before this ----
qNote:  jsr qKern
        ldx #<nNot
        ldy #>nNot
        jsr ${hx(krill, 4)}       ; Krill's loadraw (the cart's own loader on the cart, same call)
        bcs qFail
        rts
nNot:   !byte ${petscii(NOTE_NAME)}
qNoteEnd:
        * = ${hx(Q_SCR, 4)}
${rows(quote.screen)}
        * = ${hx(Q_RUN, 4)}
qt      = $f2               ; frames left to wait
; ---- the game has just jumped here, from lvlLoad, mid-fall, with the display blanked ----
qStart: sei
        lda #$35            ; KERNAL and BASIC out, I/O in: what the game runs in -- and what an
        sta $01             ;   ENDBOOT test disk, arriving straight from the boot, does not
${flute !== null ? `        lda ${hx(flute, 4)}           ; THE FLUTE (the game's fluteGot): read NOW -- ITRE loads over the game --
        sta qFl             ;   and handed to ITRE's tFl once it is in` : ''}
${palF !== null ? `        lda ${hx(palF, 4)}           ; PAL OR NTSC (the game's palF): read NOW too -- REBOOT reloads IMG,
        sta qPal            ;   whose palF is 0 again, and writes this back before the game restarts` : ''}
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
        lda #${quote.ink}   ; the quote's ink: grey 3 since 2026-11-19 (the opening quote stays grey 2)
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
${flute !== null ? `        lda qFl             ; the flute, taken or not: the tune plays only if it was
        sta ${hx(T_RUN + 6, 4)}           ;   (ITRE's tFl)
` : ''}${palF !== null ? `        lda qPal            ; PAL or NTSC: ITRE keeps NTSC time on both
        sta ${hx(T_RUN + 7, 4)}           ;   (ITRE's tPal)
` : ''}        jsr ${hx(T_RUN + 3, 4)}       ; ITRE's tPrep: its setup, done now behind the quote
        ; READING TIME. The load is blocking, so it cannot be counted in frames; the quote is held
        ; HOLD seconds more after it, then CUT straight to the dissolve: the first frame after the
        ; quote is the tree's black bitmap. (It faded grey2 -> dark grey -> black at first; two steps
        ; did not read as a fade, per the user.)
        ; holdS SECONDS, one qHold a second: 60 frames on NTSC, 50 on PAL (it was holdS * 60 frames
        ; on both, so PAL held 7.2 s for 6). FIRE or SPACE cuts it short (the user, 2026-11-15) -- read
        ; as the game reads them, and only a FRESH press: a button held through the fall skips nothing.
        lda #$00
        sta qArm
        lda #${holdS}
        sta qSec
qhL:    lda #60
${palF !== null ? `        ldx qPal
        beq qhN
        lda #50
qhN:` : ''}        jsr qHold
        bcs qhD             ; skipped
        dec qSec
        bne qhL
qhD:    jmp ${hx(T_RUN, 4)}       ; ITRE's tStart

; A frames, each ended at raster line 250 -- by waiting for the line and then for it to pass, so a
; caller with nothing to do between two calls cannot see the same line twice. Carry set = cut short
; by a fresh fire/SPACE press (interrupts are off: the matrix is read directly, $dc00 = $7f is
; SPACE's column, and joystick-1 fire pulls the same line).
qHold:  sta qt
qh1:    lda $d012
        cmp #$fa
        bne qh1
qh2:    lda $d012
        cmp #$fa
        beq qh2
        lda #$7f
        sta $dc00
        lda $dc01
        ldx #$ff
        stx $dc00
        and #$10
        bne qhUp
        lda qArm
        beq qhNx            ; still the press from before the quote
        sec
        rts
qhUp:   lda #$01
        sta qArm
qhNx:   dec qt
        bne qh1
        clc
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

qFail:  sta $03             ; Krill's status, where the boot's own fail: keeps it (it was overwritten
        lda #$02            ;   before the store; 2026-11-13 audit). RED border, display on: a load failed
        sta $d020
        sta $02
qf:     jmp qf

; ---- REBOOT: ITRE's note (lnote) jumps here on the press that takes it down, display blanked ----
; The game's own files, in the boot's order, then the game's entry -- which is also where a death
; restarts it, so it already sets up everything it needs from a dirty machine. Level 1 is ILV1,
; reloaded with the rest, and entry starts at the boot level.
reboot: sei
        jsr qKern
${reload.map(f => `        ldx #<n${f.tag}
        ldy #>n${f.tag}
        jsr ${hx(krill, 4)}
        bcs qFail`).join('\n')}
${palF !== null ? `        lda qPal            ; the PAL flag back into the freshly loaded IMG, as the boot body does
        sta ${hx(palF, 4)}
` : ''}        jmp ${hx(entry, 4)}

nTre:   !byte ${petscii(ITRE_NAME)}
${flute !== null ? 'qFl:    !byte 1             ; the flute, read from the game at qStart' : ''}
qPal:   !byte 0             ; the game's palF, read at qStart
qSec:   !byte 0             ; seconds of the hold left
qArm:   !byte 0             ; fire/SPACE seen UP during the hold: a press now is a fresh one
${reload.map(f => `n${f.tag}:   !byte ${petscii(f.name)}`).join('\n')}
${G ? G.code : ''}`;
  const qa = assemble(qsrc), QL = qa.labels;
  if (QL.qStart !== IEND_RUN) throw new Error(`IEND's entry is ${hx(QL.qStart, 4)}, but the game jumps to ${hx(IEND_RUN, 4)}`);
  if (qa.end > 0xd000) throw new Error(`IEND runs to ${hx(qa.end, 4)}, into the I/O hole`);
  if (QL.qNoteEnd > Q_SCR) throw new Error(`qNote runs to ${hx(QL.qNoteEnd, 4)}, past the quote charset into its screen`);
  if (G && QL.genDataEnd > Q_SCR) throw new Error(`the generator's tables run to ${hx(QL.genDataEnd, 4)}, past the quote charset into its screen`);
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
  // THE DISSOLVE'S PACE: the whole period over dissolveS seconds at 60 frames a second -- at first;
  // see the ramp below, and PSTEPS for PAL.
  // A step is ~95 cycles since the table-driven dslv (2026-11-10; it was ~150), so 120 a frame is
  // ~11,400 of the ~16,000 a bitmap frame leaves -- with the leaves, lights and sound beside it.
  const STEPS = Math.ceil(32767 / (dissolveS * 60));
  if (STEPS > 120) throw new Error(`${STEPS} dissolve steps a frame will not fit in one; make dissolveS longer`);
  // ...and THE END COMES QUICKER (the user, 2026-11-10: "at the beginning I like the speed, but by the
  // time it's 2/3 done it feels like it should wrap up quicker"). A random dissolve's last third is the
  // slow-looking part: each frame fills a smaller share of what is still missing. So after ramp.at
  // frames at STEPS the pace climbs ramp.climb pixels a frame more each frame, to ramp.cap.
  // 2026-11-19 (the user: "start the speedup earlier and make it more pronounced ... about 4 seconds"):
  // half a second at STEPS, then +2 a frame -- 4.87 s, from 6.45 (240 frames, then +1). 4 s cannot be
  // had at this step's cost: the top pace from the first frame would still take 4.57 s.
  const RAMPAT = ramp.at, RAMPCAP = ramp.cap, CLIMB = ramp.climb;
  if (RAMPAT > 255 || RAMPCAP < STEPS || !(CLIMB >= 1 && CLIMB <= 3)) throw new Error('ramp: at <= 255 frames, STEPS <= cap, climb 1-3');
  // the pace as dslv runs it (it adds while below the cap, so it can pass the cap by climb - 1): the
  // frames it takes, and the highest pace it reaches -- which is what must fit a frame
  const dsRun = (s, at, cap, inc) => { let f = 0, done = 0, top = s; while (done < 32767) { done += s; f++;
    if (f > at && s < cap) { s += inc(); top = Math.max(top, s); } } return { f, top }; };
  const NT = dsRun(STEPS, RAMPAT, RAMPCAP, () => CLIMB), dsFrames = NT.f;
  if (NT.top > 120) throw new Error(`the dissolve reaches ${NT.top} pixels a frame; 120 is what fits an NTSC frame`);
  // PAL: the dissolve runs once a FRAME (two in a frame would not fit at the end of the climb), so
  // it gets the same curve in seconds: 6/5 the pixels a frame, 5/6 the frames before the climb, and
  // a climb of 1.5 a frame (alternating 1 and 2: the NTSC climb is 60 a second each second, 1.44 a PAL
  // frame each frame) to 6/5 the cap. dsl's step is ~95 cycles, and a PAL bitmap frame leaves ~18,600.
  // (Since 2026-11-19 the climb is CLIMB, CLIMB+1 alternating: 2.5 a PAL frame for NTSC's 2.)
  const PSTEPS = Math.round(STEPS * 6 / 5), PRAMPAT = Math.round(RAMPAT * 5 / 6), PRAMPCAP = Math.round(RAMPCAP * 6 / 5);
  let pTog = 0;
  const PA = dsRun(PSTEPS, PRAMPAT, PRAMPCAP, () => CLIMB + (pTog++ & 1)), dsFramesPal = PA.f;
  if (PA.top > 146) throw new Error(`the PAL dissolve reaches ${PA.top} pixels a frame; 146 is what fits a PAL frame`);
  if (Math.abs(dsFramesPal / 50 - dsFrames / 60) > 0.1) throw new Error(`PAL dissolve ${(dsFramesPal / 50).toFixed(2)} s against NTSC ${(dsFrames / 60).toFixed(2)} s`);
  // TURNS PER FRAME inside a gust, in 256ths: 171 was 2 every 3 frames, 128 before the user's "a bit
  // more wind in the leaves -- not a lot, just a little more"; 384 (1.5 a frame) since 2026-11-10 ("I
  // also think the tree could move more ... in gusts that move across the tree")
  const GRATE = grate;
  if (!(GRATE > 0 && GRATE < 1024)) throw new Error('grate: 1..1023 (256ths of a turn a frame)');
  const [GUSTW, GUSTH] = gust;   // half-width (cells) and half-height (rows) of the gust window (4,3 before)
  // the tune: one event a note or rest, frames long; a rest over 255 frames is cut in pieces. Notes
  // are indices into the frequency table, 1-based (0 = rest), with 3 semitones to spare above the
  // highest for the flute's scoop
  // (GEN: degrees 0-13 above GEN_LOW, the highest a C, 22 semitones up)
  const semis = GEN ? [GEN_LOW, GEN_LOW + 22] : tune.filter(e => e.semi !== null).map(e => e.semi);
  const LOW = semis.length ? Math.min(...semis) : 0, HIGH = semis.length ? Math.max(...semis) + 3 : 0;
  const ev = [];
  if (!GEN) for (const e of [...tune, { semi: null, rows: TUNE_GAP }])
    for (let f = e.rows * TUNE_ROW; f > 0; f -= 255) ev.push([e.semi === null ? 0 : e.semi - LOW + 1, Math.min(255, f)]);
  if (ev.length > 255) throw new Error(`the end tune has ${ev.length} events; its index is a byte`);
  const freqs = [0, ...Array.from({ length: HIGH - LOW + 1 }, (_, k) => sidFreq(LOW + k))];
  // ONE CLOCK AFTER THE TREE IS WHOLE (mdlo/mdhi, in ticks): it starts when the dissolve is done and
  // counts down to the tune. The first gust waits until it has GATEF left -- gustS after the tree
  // (2026-11-19; until then the tune counted from the cut, 20 s then 10, and the first gust came 1 s
  // after the dissolve). It runs with or without the flute, so the gusts always come.
  const TUNEF = Math.round(tuneS * 60), GATEF = TUNEF - Math.round(gustS * 60);
  if (TUNEF < 1 || TUNEF > 65535) throw new Error('tuneS: a 16-bit count of frames');
  if (!(GATEF >= 0)) throw new Error('gustS: the first gust comes no later than the tune (the clock that times it ends there)');
  // the dissolve's tables, made by tPrep in RAM nothing else uses: $9000-$9fff is the char ROM's
  // shadow for the VIC in bank 2, plain RAM to the CPU (DSP_SCR ends at $8fe7, DSP starts at $a000)
  const TB = RAM_TB, LO2 = TB, PBT = TB + 0x100, HI6 = TB + 0x200, SRCH = TB + 0x280, MSKH = TB + 0x300, DSPH = TB + 0x380;

  // the $9000 map: no two users of it may overlap, and all of it lies below the display at DSP
  const ram = [[TB, TB + 0x400, "the dissolve's tables"], ...(GEN ? [[GEN_PHRASE, GEN_PHRASE + 2 * GEN_PMAX, "the flute's phrase"]] : []),
               [RAM_LIGHTS, RAM_LIGHTS + 2 * NL, "the lights' timers"]];
  for (const [a0, a1, an] of ram) {
    if (a0 < 0x9000 || a1 > 0xa000) throw new Error(`${an} (${hx(a0, 4)}-${hx(a1 - 1, 4)}) is outside $9000-$9fff`);
    for (const [b0, b1, bn] of ram) if (an !== bn && a0 < b1 && b0 < a1) throw new Error(`${an} (${hx(a0, 4)}-${hx(a1 - 1, 4)}) overlaps ${bn} (${hx(b0, 4)}-${hx(b1 - 1, 4)})`);
  }

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
krel    = $2c               ; fire has been seen UP since the scene began
kauto   = $2d               ; ENDAUTO's countdown
gacc    = $2e               ; the gust's turn rate, accumulated
gturns  = $30               ; turns left this frame
wtk     = $31               ; the wind: frames to its next filter step
wcut    = $32               ;   its cutoff
wst     = $33               ;   the silent attack's countdown (0 = the noise is on)
mdlo    = $34               ; THE CLOCK AFTER THE TREE: ticks before the tune first plays (0 from then on)
mdhi    = $35
mptr    = $36               ;   the next event
mdur    = $37               ;   frames left of this one
mnt     = $38               ;   the note sounding (1-based), 0 = a rest
mage    = $39               ;   frames since it began (stops at 255)
voff    = $3a               ;   the vibrato's offset, signed 16-bit (and voffh)
vdir    = $3b               ;   ...its direction, 1 or -1
vcnt    = $3c               ;   ...frames to its turn
mraw    = $58               ;   the event's note byte as the generator gave it (bits 7, 6)
bofl    = $59               ;   the GLIDE/BEND offset, signed 16-bit, added to the frequency...
bofh    = $5a
brsh    = $5b               ;   ...and its decay: it loses 1/2^brsh of itself a frame
mt      = $5c               ;   scratch (and $5d)
voffh   = $5e
vdeep   = $5f               ;   this note's vibrato is twice as deep
ltimer  = ${hx(RAM_LIGHTS, 4)}             ; each light's frames to its next toggle, and its state: RUN-TIME
lstate  = ${hx(RAM_LIGHTS + NL, 4)}             ;   only (li sets both), so they live in the $9000 RAM (RAM_LIGHTS), not
                            ;   in the file's code page (2026-11-15: that page was full)
dsteps  = $3e               ; the dissolve's pixels a frame
dwait   = $3f               ; frames before it starts to speed up

        * = ${hx(T_RUN, 4)}
        jmp tStart          ; IEND, when the quote has had its time
        jmp tPrep           ; IEND, as soon as this file is in
tFl:    !byte 1             ; 0: no flute was taken, so no tune (IEND writes it; 1 plays, as an ENDBOOT test does)
tPal:   !byte 0             ; 1: a PAL machine (IEND writes the game's palF here before tPrep)
t5:     !byte 5             ; PAL: frames to the next double tick
dcap:   !byte ${RAMPCAP}    ; the dissolve's top pace, and on PAL its climb alternates (dTog)
dTog:   !byte 0

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
        lda #$00            ; no gust yet: the first comes gustS after the dissolve (gc1)
        sta gact
        sta gacc
        lda #$01            ; the first gust: as soon as the clock lets it (gc1)
        sta gcalm
        lda #${STEPS}       ; the dissolve's pace, and when it starts to climb
        sta dsteps
        lda #${RAMPAT}
        sta dwait
        lda tPal
        beq tpN
        lda #${PSTEPS}      ; PAL: the same curve in SECONDS (see P* in the build)
        sta dsteps
        lda #${PRAMPAT}
        sta dwait
        lda #${PRAMPCAP}
        sta dcap
        lda #${(CLIMB ^ (CLIMB + 1))}            ; the climb's step toggles ${CLIMB} <-> ${CLIMB + 1}
        sta dTog
tpN:
        lda #$01            ; the wind's first filter step on the first frame
        sta wtk
        lda #$10
        sta wcut
        lda #$08            ; 8 frames of silent attack (tStart gates it with no waveform)
        sta wst
        lda #${TUNEF & 255} ; the clock after the tree: the tune, tuneS seconds after it is whole
        sta mdlo
        lda #${TUNEF >> 8}
        sta mdhi
        lda #$00
        sta mptr
        sta mnt
        sta bofl
        sta bofh
        lda #$01            ; ...its first event on the first frame after that
        sta mdur
${GEN ? `        jsr ${hx(QL.gInit, 4)}       ; the generator: seeded, its first event made
` : ''}        ; THE DISSOLVE'S TABLES. The step reads the LFSR's register v and draws pixel p = v XOR $7fff
        ; (= 32767 - v: 0..32766 as v runs 32767..1, so every pixel has its value and none is lost to
        ; v = 0, which never occurs). p's byte is p >> 2, its pixel p AND 3 -- both looked up from v's
        ; two bytes instead of shifted out each step:
        ;   LO2[lo]  = (~lo) >> 2        the byte's low bits from v's low byte
        ;   PBT[lo]  = pbit[(~lo) & 3]   the pixel's bits
        ;   HI6[hi]  = ((~hi) & 3) << 6  the byte's top two bits from v's high byte
        ;   SRCH/MSKH/DSPH[hi] = the page: base + ((~hi) & $7f) >> 2
        ldx #$00
tg1:    txa
        eor #$ff
        lsr
        lsr
        sta ${hx(LO2, 4)},x
        txa
        eor #$ff
        and #$03
        tay
        lda pbit,y
        sta ${hx(PBT, 4)},x
        inx
        bne tg1
        ldx #$7f
tg2:    txa
        eor #$ff
        and #$03            ; 000000ab...
        lsr
        ror
        ror                 ; ...ab000000
        sta ${hx(HI6, 4)},x
        txa
        eor #$7f
        lsr
        lsr
        sta tmp
        clc
        adc #>${hx(SRC, 4)}
        sta ${hx(SRCH, 4)},x
        lda tmp
        clc
        adc #>${hx(MASK, 4)}
        sta ${hx(MSKH, 4)},x
        lda tmp
        clc
        adc #>${hx(DSP, 4)}
        sta ${hx(DSPH, 4)},x
        dex
        bpl tg2
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
        ; ---- THE SOUND starts at the cut: every SID register clean (the game may have left voices
        ; gated; the quote ran at volume 0), then the wind's voice gated with NO waveform -- its
        ; envelope reaches sustain unheard, and the noise comes on 8 frames later (wst). Level 4's
        ; wind does the same: on a 6581 a fast attack is a thump even with nothing playing.
        ldx #$18
        lda #$00
ts0:    sta $d400,x
        dex
        bpl ts0
        lda #<${hx(WINDF, 4)}     ; the wind: level 4's noise (B4), SR $2a (sustain 2, release 10)
        sta $d400
        lda #>${hx(WINDF, 4)}
        sta $d401
        lda #$2a
        sta $d406
        lda #$10            ; band-pass, closed down, resonance 8, voice 1 only: the tune plays straight
        sta $d416           ;   (the user: "leave it on the wind and let the triangle wave play straight")
        lda #$81
        sta $d417
        lda #$2f
        sta $d418
        lda #$11            ; the flute's envelope, as the user's instrument: AD $11, SR $38
        sta $d40c
        lda #$38
        sta $d40d
${breath ? `        lda #$11            ; ...and its BREATH (the user: "a micro (minimum sustain volume) noise
        sta $d413           ;   wave with a similar envelope as the flute ... the same for each note")
        lda #${hx((brSus << 4) | 8)}
        sta $d414
        lda #${hx(breath)}
        sta $d40f
` : ''}        lda #$01
        sta $d404           ; gate, no waveform
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
        ; ONE TICK = 1/60 s of the scene: the sound, the leaves and the lights all count in ticks. A
        ; PAL frame is 1/50 s, so on PAL every 5th frame runs a second tick -- as the game's IRQ does --
        ; and the scene keeps NTSC time on both (2026-11-15; before that PAL ran it at 5/6 speed).
        jsr tick
        lda tPal
        beq fOne
        dec t5
        bne fOne
        lda #$05
        sta t5
        jsr tick
fOne:   jsr dslv            ; the dissolve is per FRAME, with its own pace for each machine (tPrep)
        ; ---- FIRE: the end of the end. A PRESS, not a key held since before the scene ----
${autoF ? `        lda mdlo            ; ENDAUTO (a test): fire presses itself, autoF frames after the
        ora mdhi            ;   clock after the tree runs out (past the first gust, which endcheck
        bne kau9            ;   waits for; autoF is a byte, too short to count from the dissolve)
        dec kauto
        beq kgo
kau9:
` : ''}        lda #$7f            ; SPACE's column: bit 4 is SPACE there, and the stick's FIRE pulls the
        sta $dc00           ;   same line whatever the column -- so either one (SPACE as well since
        lda $dc01           ;   2026-11-13, as at a death's black; the only read here, so no restore)
        and #$10            ; low when down (RETURN until 2026-11-12: the game's keys went with
        bne kup             ;   the HUD)
        lda krel
        beq kdn             ; down, but never seen up: still held from before
kgo:    lda #$0b            ; BLACK: display off, border black
        sta $d011
        lda #$80            ; the wind lets go (release 10: it fades over ~1.5 s while the game
        sta $d404           ;   reloads), and so does the tune -- gates off, waveforms kept, since
        lda #$10            ;   a waveform of 0 is a DC step on a 6581, a pop
        sta $d40b
${breath ? `        lda #$80
        sta $d412
` : ''}        lda #$00
        sta $d020
        jmp lnote           ; THE NOTE (the level select), then IEND's REBOOT: the game again, from level 1
kup:    lda #$01
        sta krel
kdn:    jmp frame

; ---- tick: one 1/60 s of the sound, the wind in the leaves and the lights ----
tick:   jsr snd             ; first, so the sound's tick is the same point of every frame
${leafCode(fld, GRATE, GUSTW, GUSTH, calm, GATEF)}
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
        rts

; ---- the dissolve: dsteps pixels a frame, in the LFSR's order, until it is back at its seed ----
; (the tables tPrep made say where each pixel is: see there)
dslv:   lda ddone
        bne dsx
        lda dwait           ; the base pace for RAMPAT frames, then one more pixel a frame each frame
        beq dsr
        dec dwait
        jmp dsg
dsr:    lda dsteps
        cmp dcap
        bcs dsg
dsInc:  adc #${CLIMB}            ; (carry clear) -- ${CLIMB} on NTSC; ${CLIMB}, ${CLIMB + 1}, ${CLIMB}... on PAL
        sta dsteps
        lda dsInc+1
        eor dTog
        sta dsInc+1
dsg:    lda dsteps
        sta dcnt
        lda #$00            ; the pointers are page bases, Y the byte in the page (the leaves'
        sta sp              ;   sync sets mp/dp's low bytes, so this is every frame)
        sta mp
        sta dp
dsl:    lsr dvhi            ; one Galois step: shift right, and if a 1 fell out, apply the taps
        ror dvlo
        bcc dsn
        lda dvhi
        eor #$60            ; x^15 + x^14 + 1
        sta dvhi
dsn:    ldy dvhi
        cpy #$03            ; v < $300: p = 32767 - v >= 32000, past the picture
        bcc dsk
        lda ${hx(SRCH, 4)},y
        sta sp+1
        lda ${hx(MSKH, 4)},y
        sta mp+1
        lda ${hx(DSPH, 4)},y
        sta dp+1
        ldx dvlo
        lda ${hx(LO2, 4)},x
        ora ${hx(HI6, 4)},y
        tay
        lda ${hx(PBT, 4)},x  ; the pixel is now dissolved in...
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
${soundCode({ breath: breath ? { pitch: breath, sus: brSus } : 0, freqs, ev, gen: GEN && QL })}
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
; ---- THE NOTE: kgo jumps here on fire, with the display blanked ----
; The ending's last gift (the user, 2026-11-17): the level select, revealed. A picture of text in the
; user's pixel face (note-font.mjs), its own file INOT, loaded now by IEND's qNote into the tree's
; display, which is finished with: charset ${hx(NOTE_CHR, 4)}, screen ${hx(NOTE_SCR, 4)}. Interrupts are off and the
; SID releases on its own, so nothing runs during the load. The wind and the tune are already letting
; go (kgo): they fade under it. A FRESH fire/SPACE (IEND's qHold, as the quote's skip reads it: the
; press that got here skips nothing) blanks the screen again and goes to REBOOT.
; IT LIVES IN THE BITMAP'S TAIL, ${hx(SRC + 8000, 4)}-${hx(SRC_COL - 1, 4)}: SRC is 8000 bytes in a 32-page slot, and nothing
; reads or writes past its end (dslv skips the LFSR values past the picture; the leaves and lights
; touch picture bytes only). The code page ($0800-$0fff) and IEND's $cc00 page are full. The lights'
; own tables follow it.
lnote:  lda #$00            ; the screen's rows past the file's (code 0 is the blank cell): two
        tax                 ;   overlapping 256-byte stores, from the first such row and up to the 1000th
ln0:    sta ${hx(NOTE_SCR + NOTE_ROWS * 40, 4)},x
        sta ${hx(NOTE_SCR + 1000 - 256, 4)},x
        inx
        bne ln0
        jsr ${hx(QL.qNote, 4)}       ; IEND's qNote: INOT, the glyphs and the screen's first ${NOTE_ROWS} rows
        lda #${NOTE_INK}            ; grey 3
        jsr ${hx(QL.qInk, 4)}       ; (IEND's qInk)
        lda #${hx(((NOTE_SCR - 0x8000) >> 10) << 4 | ((NOTE_CHR - 0x8000) >> 11) << 1)}
        sta $d018           ; screen ${hx(NOTE_SCR, 4)}, charset ${hx(NOTE_CHR, 4)}
        lda #$08
        sta $d016           ; hi-res text, 40 columns
        lda #$00
        sta $d021
lnW:    lda $d012           ; on in the bottom border, as every cut here is
        cmp #$fa
        bne lnW
        lda #$1b
        sta $d011           ; text mode, display ON: the note is up
        lda #$00            ; the press that brought it here must be let go first
        sta ${hx(QL.qArm, 4)}       ; (IEND's qArm)
lnL:
${autoF ? `        lda #${autoF & 255}         ; ENDAUTO (a test): if no press comes, go on after autoF frames
        jsr ${hx(QL.qHold, 4)}
` : `        lda #$00            ; (256 frames a call; any count will do)
        jsr ${hx(QL.qHold, 4)}       ; (IEND's qHold: carry set = a fresh press)
        bcc lnL
`}        lda #$0b            ; BLACK again for the reload
        sta $d011
        jmp ${hx(QL.reboot, 4)}   ; IEND's REBOOT
lnEnd:
; ---- each light's own table, a byte a light: read only. Here since 2026-11-19, when the vibrato's
; 16-bit step left the code page one byte, and a test build (ENDAUTO) none ----
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
tailEnd:
        * = ${hx(SRC_COL, 4)}
${rows(scene.col)}
        * = ${hx(SRC_SCR, 4)}
${rows(scene.scr)}
`;
  const ta = assemble(tsrc), TL = ta.labels;
  if (TL.tFl !== T_RUN + 6 || TL.tPal !== T_RUN + 7) throw new Error('ITRE: IEND writes tFl and tPal at T_RUN+6 and +7');
  if (TL.tCodeEnd > SITE) throw new Error(`ITRE's code and light tables run to ${hx(TL.tCodeEnd, 4)}, into the leaf sites at ${hx(SITE, 4)}`);
  if (TL.tailEnd > SRC_COL) throw new Error(`ITRE's note and light tables run to ${hx(TL.tailEnd, 4)}, into the colour data at ${hx(SRC_COL, 4)}`);
  if (scene.bm.length !== 8000) throw new Error('the note sits right after an 8000-byte bitmap');
  // INOT: the glyphs, then the screen's first NOTE_ROWS rows. It loads over the tree's display (DSP),
  // never over anything the note or REBOOT still needs
  const na = assemble(`        * = ${hx(NOTE_CHR, 4)}
${rows(note.chars)}
        * = ${hx(NOTE_SCR, 4)}
${rows(note.screen.slice(0, NOTE_ROWS * 40))}
`);
  if (NOTE_CHR !== DSP || na.end > DSP + 8000) throw new Error(`INOT (${hx(na.org, 4)}-${hx(na.end, 4)}) must load into the tree's display, ${hx(DSP, 4)}`);
  if (ta.end > T_END) throw new Error(`ITRE runs to ${hx(ta.end, 4)}, into the mask at ${hx(MASK, 4)}`);
  if (ta.org < 0x0800) throw new Error(`ITRE starts at ${hx(ta.org, 4)}, on Krill's resident`);
  return {
    iend: { name: IEND_NAME, prg: qa.prg, at: qa.org, end: qa.end, run: QL.qStart, reboot: QL.reboot, labels: QL },
    itre: { name: ITRE_NAME, prg: ta.prg, at: ta.org, end: ta.end, run: TL.tStart, codeEnd: TL.tCodeEnd, labels: TL },
    inot: { name: NOTE_NAME, prg: na.prg, at: na.org, end: na.end },
    steps: STEPS, dsFrames, dsFramesPal,
  };
}

// THE WIND IS A GUST THAT TRAVELS (the user: "too much movement -- half as much at half the speed",
// and "I like your wind spatial idea"). A gust is a window GUSTW x GUSTH cells that drifts across the
// canopy from one side to the other (random side, height and speed: 3-7 s to cross); leaves turn
// only inside it, at most GRATE/256 turns a frame, so neighbouring leaves stir together and then
// settle. Between gusts, 1.5-2.5 s of CALM with only the odd lone turn anywhere (one in 16 frames).
// (Calm was 2-4 s and lone turns one in 32 until the user's "a little more wind"; then 1.5-2.5 s and
// GRATE 171 in a 4x3 window until 2026-11-10: now 1-2 s, 1.5 turns a frame, 5x4 -- see buildEnding.)
// A turn picks a random site and keeps it only if it lies inside the gust -- up to 6 tries a frame.
const leafCode = (fld, GRATE, GUSTW, GUSTH, CALM, GATEF) => `
        inc fcount
        lda gact
        bne gmove
        lda fcount          ; ---- CALM: the odd lone turn, anywhere ----
        and #$0f
        bne gc1
        jsr pick
        jsr turn
gc1:    lda ddone           ; NO GUST WHILE THE PICTURE DISSOLVES IN (the user, 2026-11-16): a gust
        beq gcw             ;   turning many leaves in the dissolve's full-speed end ran the frame over
        lda mdlo            ;   (endcheck counted 2-8 frames lost on NTSC, 0-16 on PAL). And none
        cmp #${(GATEF + 1) & 255}            ;   until the clock after the tree has GATEF ticks left,
        lda mdhi            ;   gustS after it (2026-11-19): clock - (GATEF+1), carry set = still more
        sbc #${(GATEF + 1) >> 8}
        bcs gcw
        dec gcalm
        beq gnew
gcw:    jmp sdone
gnew:   jsr rnd             ; ---- a new GUST: which way, how high, how fast ----
        and #$01
        sta gdir
gyR:    jsr rnd             ; rows 2..13, the canopy, EVENLY: 0..11 by rejection. It was "and #$0b",
        and #$0f            ;   a mask, not a range -- 0-3 and 8-11, so no gust ever centred on rows
        cmp #$0c            ;   6-9 (2026-11-13 audit)
        bcs gyR
        adc #$02            ; (C clear: the bcs fell through)
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
        lda gacc            ; GRATE/256 turns a frame: the whole part every frame, and one more
        clc                 ;   whenever the fraction carries
        adc #${GRATE & 255}
        sta gacc
        lda #${GRATE >> 8}
        adc #$00
        beq sdone
        sta gturns
gturn:  lda #$06            ; up to 6 tries for a site inside the gust
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
        jmp gnext
gno:    dec cnt2
        bne gtry
gnext:  dec gturns
        bne gturn
        jmp sdone
gend:   lda #$00            ; the gust has gone: CALM for CALM..CALM+63 frames (1-2 s at 60; it
        sta gact            ;   was 90-153 before 2026-11-10's "the tree could move more")
        jsr rnd
        lsr
        lsr
        clc
        adc #${CALM}
        sta gcalm
sdone:`;

// THE GENERATIVE FLUTE (ENDTUNE=gen; the music is described in end-tunes.mjs). Its CODE lives in IEND
// after REBOOT, its TABLES in the quote charset's unused tail (the quote has 180 of 256 glyphs; codes
// past it are never on screen), its phrase in RAM at GEN_PHRASE (ITRE's bank 2; see the $9000 map at the top). ITRE's code page is nearly full. All of it is dead once fire is pressed -- REBOOT reloads
// the charset over the tables, and nothing calls the generator after that.
// ITRE's player asks gGet for each event, and peeks gnN -- the event after it, made one ahead -- to
// know whether a note follows (hard restart), a SLURRED note follows (no restart: bit 7), or a rest.
//   gInit  seed, and make the first event         (ITRE's tPrep)
//   gGet   A = this event's note (0 = rest; else 1-based into ITRE's frequency table, bit 7 = slurred
//          from the note before), X = frames
// opts: now (a TEST: skip the user's two opening phrases), gap = [base, mult]: a long silence is
// base + mult * 0..255 frames (mult 1, 2 or 4)
const genCode = ({ now = false, gap = [300, 4] } = {}) => {
  const PDEG = GEN_PHRASE, PDUR = GEN_PHRASE + GEN_PMAX, PMAX = GEN_PMAX;
  const [LEN0, LEN1] = GEN_LEN;
  // the most a phrase can hold: a note short of LEN1, then the longest cell or a trill (8 + landing), then the end
  const worst = LEN1 - 1 + Math.max(...GEN_CELLS.map(c => c.length), 9) + 1;
  if (worst > PMAX || LEN1 - LEN0 > 15 || LEN0 < 2) throw new Error(`GEN_LEN: a phrase may need ${worst} of ${PMAX} notes; LEN1 - LEN0 <= 15`);
  for (const q of GEN_QUOTES) if (q.deg.length !== q.rows.length || q.rows.length > PMAX) throw new Error('GEN_QUOTES: a degree per note');
  if (GEN_CELLS.length !== 8 || GEN_MOVES.length !== 16 || GEN_MODES.length !== 4 || GEN_ENDS.length !== 2)
    throw new Error('GEN tables: 8 cells, 16 moves, 4 modes, 2 ends');
  if (![1, 2, 4].includes(gap[1]) || gap[0] + 255 * gap[1] > 65535) throw new Error('gap: base, mult 1/2/4');
  const F = r => { const f = r * TUNE_ROW; if (f > 255) throw new Error('a GEN note is over 255 frames'); return f; };
  // modeT: mode*16 + degree -> the note (1-based from GEN_LOW, as ITRE's frequency table)
  const modeT = GEN_MODES.flatMap(m => Array.from({ length: 16 }, (_, d) => d < 14 ? 12 * Math.floor(d / 7) + m[d % 7] + 1 : 0));
  // homeT: the home degree nearest each degree (ties to the lower: D over A)
  const homeT = Array.from({ length: 14 }, (_, d) => GEN_HOMES.reduce((b, h) => Math.abs(h - d) < Math.abs(b - d) ? h : b));
  // endT: an ending from 32 by GEN_ENDINGS' weights -- $40 = home, else the degree (bit 7: it asks for an answer)
  const endT = GEN_ENDINGS.flatMap(([d, w]) => Array(w).fill(d === 'home' ? 0x40 : d | (GEN_OPEN.includes(d) ? 0x80 : 0)));
  if (endT.length !== 32 || GEN_ENDINGS.some(([d]) => d !== 'home' && !(d >= 1 && d <= 6)))
    throw new Error('GEN_ENDINGS: weights summing to 32, degrees 1-6 (0 and 4 are home)');
  const cS = [], cL = [], cD = [];
  for (const c of GEN_CELLS) { cS.push(cD.length); cL.push(c.length); cD.push(...c.map(F)); }
  const qS = [], qL = [], qD = [], qG = [];
  for (const q of GEN_QUOTES) { qS.push(qD.length); qL.push(q.rows.length); qD.push(...q.rows.map(F)); qG.push(...q.deg); }
  const data = `
genData:
moveT:  !byte ${GEN_MOVES.map(v => hx(v & 255)).join(',')}
homeT:  !byte ${homeT.join(',')}
slurT:  !byte ${GEN_SLUR.map(f => Math.round(256 * f)).join(',')}
endT:   !byte ${endT.map(v => hx(v)).join(',')}
driftT: !byte $ff,0,0,1
shiftT: !byte 0,0,1,$ff,2,$fe,1,$ff
eD:     !byte ${GEN_ENDS.map(F).join(',')}
cS:     !byte ${cS.join(',')}
cL:     !byte ${cL.join(',')}
cD:     !byte ${cD.join(',')}
qS:     !byte ${qS.join(',')}
qL:     !byte ${qL.join(',')}
qD:     !byte ${qD.join(',')}
qG:     !byte ${qG.join(',')}
modeT:
${rows(modeT, 16)}
; (code too: the quote page after REBOOT is full, and the charset's tail has room)
; the phrase's END into PDEG,y (Y = its index; keeps Y): from endT, home or another note. Another is
; placed in the octave nearest the note before, which then moves to a step from it -- above it, unless it
; was below -- so the odd note is STEPPED to. (Not after a trill's landing, which must stay the trill's
; note: that ends home.)
gEnd:   lda PDEG-1,y        ; the note before
        bmi gEh
        and #$3f            ; (a bend's flag off)
        sta gi
        jsr grnd
        and #$1f
        tax
        lda endT,x
        cmp #$40
        bne gE1
        lda gi
gEh:    and #$3f            ; HOME: the D or A nearest the note before
        tax
        lda homeT,x
        sta PDEG,y
        rts
gE1:    sta gopen           ; (bit 7: it asks)
        and #$07
        sta gt              ; the degree in the low octave...
        lda gi
        sec
        sbc gt
        bcc gE2
        cmp #$04            ; ...or the high one, if the note before is nearer that
        bcc gE2
        lda gt
        adc #$06            ; (carry set: +7)
        sta gt
gE2:    lda gt
        sta PDEG,y
        tax                 ; the note before: a step above it...
        lda gi
        cmp gt
        bcc gE3
        inx
        cpx #$0e
        bcc gE4
        dex                 ; (no step above the top: below)
gE3:    dex                 ; ...or below
gE4:    txa
        sta PDEG-1,y
        rts

; ---- a new line's ORNAMENTS (not on a trill's slurred notes)
gOrn:   ldy #$00
        sty gk              ; notes in a row without an attack
gO1:    lda PDEG,y
        bmi gO3
        cpy #$00            ; (the first note: only a bend)
        beq gO2
        lda gk              ; GEN_SLUR_RUN unattacked in a row: this one is tongued
        cmp #${GEN_SLUR_RUN}
        bcs gO2
        lda PDEG-1,y        ; how far from the note before, in degrees (3 = a fourth or more)
        and #$3f
        sec
        sbc PDEG,y
        bcs gOa
        eor #$ff
        adc #$01
gOa:    beq gO2             ; (the same note: tongued, or the two would be one)
        cmp #$04
        bcc gOb
        lda #$03
gOb:    tax
        jsr grnd            ; a SLUR -- no attack, the pitch just changes -- likelier the closer it is
        cmp slurT,x
        bcs gOg
        lda PDEG,y
        ora #$80
        bne gOs
gOg:    jsr grnd            ; ...or a GLIDE
        cmp #${Math.round(256 / GEN_GLIDE_IN)}
        bcs gO2
        lda PDEG,y
        ora #$c0
gOs:    sta PDEG,y
        inc gk
        bne gO3
gO2:    lda #$00            ; (tongued)
        sta gk
        lda PDUR,y          ; a BEND, on a note long enough to hear it rise
        cmp #${GEN_BEND_MIN * TUNE_ROW}
        bcc gO3
        jsr grnd
        cmp #${Math.round(256 / GEN_BEND_IN)}
        bcs gO3
        lda PDEG,y
        ora #$40
        sta PDEG,y
gO3:    iny
        cpy gplen
        bne gO1
        rts
genDataEnd:`;
  const code = `
grl     = $40               ; the generator's own random numbers (16-bit Galois, as ITRE's rnd)
grh     = $41
gmode   = $42               ; the mode, 0-3 round the ring
gmleft  = $43               ; phrases before it moves
gcen    = $44               ; the register the melody wanders around (a degree)
gleap   = $45               ; the last move, if it was a leap: the next steps back against it
gplen   = $46               ; the phrase: its length...
gpidx   = $47               ;   ...and the next note of it
gphr    = $48               ; phrases so far (stops at 2: the two quotes are the opening)
ggl     = $49               ; frames of silence still to come after the phrase
ggh     = $4a
gnN     = $4b               ; THE NEXT EVENT, made one ahead: its note...
gnD     = $4c               ;   ...and frames
gd      = $4d               ; the degree the melody has walked to
gi      = $4e               ; scratch
gt      = $4f
gtg     = $50               ; the phrase's length to reach
gtr     = $51               ; a trill in this phrase already
gk      = $52
gs      = $53
gopen   = $54               ; bit 7: the phrase ends on a question (GEN_OPEN), so its silence is short
PDEG    = ${hx(PDEG, 4)}           ; the phrase: degree (bit 7 = slurred) and frames, a note each
PDUR    = ${hx(PDUR, 4)}

gInit:  lda $dc04           ; seed from a running CIA timer, as ITRE's own (never 0)
        ora #$01
        sta grl
        lda $dc05
        sta grh
        lda #$00
        sta gmode           ; Phrygian: the user's own
        sta gleap
        sta gplen
        sta gpidx
        sta ggl
        sta ggh
        lda #${now ? 2 : 0}${now ? '               ; (ENDGENNOW, a test: straight past the opening)' : ''}
        sta gphr
        lda #$04
        sta gmleft
        sta gcen            ; around A4
        jmp gEv

gGet:   lda gnN
        pha
        lda gnD
        pha
        jsr gEv
        pla
        tax
        pla
        rts

; ---- make the next event into gnN/gnD ----
gEv:    lda ggl             ; silence still to come: a rest of it, at most 255 frames
        ora ggh
        beq ge1
        lda ggh
        bne ge0
        lda ggl             ; the last of it
        ldx #$00
        stx ggl
        jmp geR
ge0:    lda ggl
        sec
        sbc #$ff
        sta ggl
        bcs ge0b
        dec ggh
ge0b:   lda #$ff
geR:    sta gnD
        lda #$00
        sta gnN
        rts
ge1:    lda gpidx           ; the phrase is over (and its silence): a new one
        cmp gplen
        bcc ge2
        jsr gComp
ge2:    ldx gpidx
        lda PDEG,x
        and #$c0
        sta gs              ; (slurred; glide or bend)
        lda gmode           ; the note: the degree in this mode
        asl
        asl
        asl
        asl
        sta gt
        lda PDEG,x
        and #$3f
        clc
        adc gt
        tay
        lda modeT,y
        ora gs
        sta gnN
        lda PDUR,x
        sta gnD
        inc gpidx
        lda gpidx
        cmp gplen
        bcc gex
        lda gphr            ; the phrase's last note: then its silence
        cmp #$01
        bne gg0
        lda #${8 * TUNE_ROW}         ; (after the opening phrase, the user's own 8 rows)
        sta ggl
        rts
gg0:    bit gopen           ; a phrase that ended asking is answered soon
        bmi gg0s
        jsr grnd
        cmp #$40
        bcs gg1
gg0s:   jsr grnd            ; a quarter of the time SHORT, 1-3 s: what follows sounds like an answer
        and #$7f
        clc
        adc #60
        sta ggl
        rts
gg1:    jsr grnd            ; ...otherwise LONG: base + mult * 0..255 frames
        sta ggl
        lda #$00
        sta ggh
${'        asl ggl\n        rol ggh\n'.repeat(Math.log2(gap[1]))}        lda ggl
        clc
        adc #<${gap[0]}
        sta ggl
        lda ggh
        adc #>${gap[0]}
        sta ggh
gex:    rts

; ---- compose a phrase into PDEG/PDUR ----
gComp:  lda #$00
        sta gpidx
        sta gopen
        dec gmleft          ; every 3-6 phrases the mode moves one step round the ring
        bne gc1
        jsr grnd
        and #$03
        clc
        adc #$03
        sta gmleft
        jsr grnd
        and #$02            ; 0 or 2 -> -1 or +1
        sec
        sbc #$01
        clc
        adc gmode
        and #$03
        sta gmode
gc1:    jsr grnd            ; the register drifts: down, stays (twice as likely), or up
        and #$03
        tax
        lda gcen
        clc
        adc driftT,x
        cmp #$02
        bcc gc1x
        cmp #$0a
        bcs gc1x
        sta gcen
gc1x:   lda gphr            ; the opening: the user's two phrases
        cmp #$02
        bcs gc2
        tax
        inc gphr
        jmp gQuote
gc2:    jsr grnd
        cmp #64             ; a quarter: the phrase before, moved
        bcs gc3
        jmp gRep
gc3:    cmp #106            ; a sixth: the user's tune again
        bcs gNew
        jsr grnd
        and #$01
        tax
        jmp gQuote

gNew:   jsr grnd            ; ---- a new LINE: how long... ----
        and #$0f
        clc
        adc #${LEN0}
        cmp #${LEN1 + 1}
        bcc gnl
        lda #${LEN1}
gnl:    sta gtg
        jsr grnd            ; ...from near the register...
        and #$03
        clc
        adc gcen
        sec
        sbc #$01
        sta gd
        lda #$00
        sta gleap
        sta gtr
        tay
gnC:    lda gtr             ; ...a cell at a time: now and then (once) a trill
        bne gnc1
        jsr grnd
        cmp #${Math.round(256 / GEN_TRILL_IN)}
        bcs gnc1
        jmp gTr
gnc1:   jsr grnd
        and #$07
        tax
        lda cS,x
        sta gi
        clc
        adc cL,x
        sta gk
gn1:    ldx gi
        lda cD,x
        sta PDUR,y
        lda gd
        sta PDEG,y
        iny
        jsr gStep
        inc gi
        lda gi
        cmp gk
        bne gn1
gnCx:   cpy gtg
        bcc gnC
        jsr gEnd            ; ...and the end: a long note, home (mostly), near the last
        jsr grnd
        and #$01
        bit gopen           ; (an ending that asks is held the long length)
        bpl gnE
        lda #$01
gnE:    tax
        lda eD,x
        sta PDUR,y
        iny
        sty gplen
        jmp gOrn

gTr:    inc gtr             ; ---- a TRILL: the note and the one above, slurred, 6 or 8 of them ----
        lda gd
        cmp #$0d
        bcc gt0
        lda #$0c            ; (room for the note above)
        sta gd
gt0:    jsr grnd
        and #$02
        clc
        adc #$06
        sta gk
        ldx #$00
gt1:    txa
        and #$01
        clc
        adc gd
        cpx #$00            ; the first is tongued, the rest slurred
        beq gt2
        ora #$80
gt2:    sta PDEG,y
        lda #${GEN_TRILL}
        sta PDUR,y
        iny
        inx
        cpx gk
        bne gt1
        lda gd              ; ...landing back on the note
        ora #$80
        sta PDEG,y
        lda #${GEN_TRILL_LAND}
        sta PDUR,y
        iny
        jsr gStep
        jmp gnCx

; the melody's next degree, into gd: after a leap a step back against it; otherwise a move from moveT
; (a leap is remembered). Keeps Y.
gStep:  lda gleap
        beq gs3
        bmi gsu
        dec gd
        jmp gs4
gsu:    inc gd
gs4:    lda #$00
        sta gleap
        jmp gs5
gs3:    jsr grnd
        and #$0f
        tax
        lda moveT,x
        sta gt
        clc
        adc gd
        sta gd
        lda gt              ; a leap (beyond -1..1) is remembered
        clc
        adc #$01
        cmp #$03
        bcc gs5
        lda gt
        sta gleap
gs5:    lda gd
        jsr gClamp
        sta gd
        rts

gRep:   jsr grnd            ; ---- the phrase before, moved up or down the scale ----
        and #$07
        tax
        lda shiftT,x
        sta gt
        ldy #$00
gr1:    lda PDEG,y
        and #$c0
        sta gs
        lda PDEG,y
        and #$3f
        clc
        adc gt
        jsr gClamp
        ora gs
        sta PDEG,y
        iny
        cpy gplen
        bne gr1
        dey                 ; its end chosen again, near the note before it
        jmp gEnd

gQuote: lda qS,x            ; ---- quote X: the user's phrase, as written ----
        sta gi
        lda qL,x
        sta gplen
        ldy #$00
gq1:    ldx gi
        lda qD,x
        sta PDUR,y
        lda qG,x
        sta PDEG,y
        inc gi
        iny
        cpy gplen
        bne gq1
        rts

gClamp: bpl gcl1            ; A (flags just set from it) into 0..13
        lda #$00
        rts
gcl1:   cmp #$0e
        bcc gcl2
        lda #$0d
gcl2:   rts

grnd:   lsr grh
        ror grl
        bcc grn1
        lda grh
        eor #$b4
        sta grh
grn1:   lda grl
        rts
`;
  return { code, data };
};

// THE SOUND, once a frame (snd). Interrupts are off for the whole ending, so this is the frame loop's
// own call -- the first thing after the raster wait, so its tick lands at the same point every frame.
//
// THE WIND IS THE GUST YOU SEE. Level 4's wind is band-passed noise whose resonance swells for each
// gust; here the swell is driven by the leaves' own gust (gact, gspd), so it is heard as the gust
// crosses the tree. In a gust the cutoff climbs one unit every 3 frames toward a peak set by the
// gust's speed (gspd $18-$37 -> $2c-$5a: a faster gust is a brighter one); in calm it sinks one unit
// every 6 frames to the floor ($10, as level 4's). Resonance follows the cutoff, 8 at the floor to F
// by $48 -- one variable, so the two can never drift apart.
//
// THE TUNE, in the distance: the user's flute, as the trace of their GoatTracker instrument plays it
// -- triangle, AD $11 / SR $38, a scoop down into each note (+3, +2 semitones, then the note), and
// after 20 frames a vibrato of about two fifths of a semitone, 3 a second (VIB_TURN and VIB_SWING in
// end-tunes.mjs). Until 2026-11-19 it was a sixth of a semitone, 6 a second (the user: "a step
// deeper", then "slow it a bit", then 3 a second at that depth). Between two notes the instrument's hard restart, as the tracker
// does it: 2 frames out, ADSR 0 and the gate off; 1 frame out, the envelope back and the test bit; then
// the gate. Before a rest the note just lets go, at release 8: it rings out into the space.
// BREATH (voice 3): noise at sustain brSus, one fixed pitch, gated with the flute.
const soundCode = ({ breath, freqs, ev, gen }) => `
snd:    lda wst             ; ---- the wind: the silent attack, then the noise ----
        beq wgo
        dec wst
        bne wgo
        lda #$81
        sta $d404
wgo:    dec wtk
        bne mel
        ldx #$03            ; in a gust: up every 3 frames, toward the gust's peak
        lda gact
        beq wcl
        lda gspd
        lsr
        clc
        adc gspd
        adc #$08
        jmp wg2
wcl:    ldx #$06            ; calm: down every 6 frames, to the floor
        lda #$10
wg2:    stx wtk
        cmp wcut
        beq wset
        bcc wdn
        inc wcut
        jmp wset
wdn:    dec wcut
wset:   lda wcut
        sta $d416
        sec
        sbc #$10
        lsr
        lsr
        lsr
        cmp #$08
        bcc wrs
        lda #$07
wrs:    clc
        adc #$08
        asl
        asl
        asl
        asl
        ora #$01            ; voice 1 only
        sta $d417
mel:    lda ddone           ; ---- THE CLOCK AFTER THE TREE: stopped until it is whole, then down to
        beq mrt             ;   the tune -- with or without the flute, as the first gust reads it ----
        lda mdlo
        ora mdhi
        beq mel0
        lda mdlo
        bne md1
        dec mdhi
md1:    dec mdlo
mrt:    rts
mel0:   lda tFl             ; ---- the tune: only with the flute (the user, 2026-11-12: "if you didn't
        bne mgo             ;   collect it, you just get the wind") ----
        rts
mgo:    dec mdur
        bne mhr
${gen ? `mnx:    jsr ${hx(gen.gGet, 4)}       ; ---- the next event, from the generator ----
        stx mdur
        sta mraw
        cmp #$80
        bcc mn0
        and #$3f            ; SLURRED: the gate stays, no scoop...
        tay
        bit mraw
        bvs ms1
        lda #$00            ; ...a trill's: the pitch just moves
        sta bofl
        sta bofh
        beq ms2
ms1:    ldx mnt             ; ...a GLIDE: from the pitch sounding (offset and all), sliding fast
        lda bofl
        clc
        adc flo,x
        sta bofl
        lda bofh
        adc fhi,x
        sta bofh
        lda bofl
        sec
        sbc flo,y
        sta bofl
        lda bofh
        sbc fhi,y
        sta bofh
        lda #$01
        sta brsh
ms2:    sty mnt
        lda #$02
        sta mage
        jmp mpit
mn0:    and #$3f
        sta mnt
` : `mnx:    ldx mptr            ; ---- the next event ----
        lda edur,x
        bne mn1
        ldx #$00            ; (the end: round again, from the first)
        stx mptr
        lda edur
mn1:    sta mdur
        lda enote,x
        sta mnt
        inc mptr
`}        lda mnt
        bne mon
        lda #$10            ; a rest: the note lets go and rings out
        jsr mctl
        rts
mon:    lda #$00
        sta mage
        sta voff
        sta voffh
        sta bofl
        sta bofh
        lda #$11            ; a note: the gate
        jsr mctl
${gen ? `        bit mraw
        bvc mpit
        lda #$02            ; a BEND: no scoop, but up into the note from about a semitone below
        sta mage            ;   (f/16 under it, 1.1 semitones) and slowly: an eighth of the way a frame
        ldy mnt
        lda fhi,y
        sta bofh
        lda flo,y
        ldx #$04
mb1:    lsr bofh
        ror
        dex
        bne mb1
        eor #$ff            ; negated
        clc
        adc #$01
        sta bofl
        lda bofh
        eor #$ff
        adc #$00
        sta bofh
        lda #$03
        sta brsh
` : ''}        jmp mpit
mhr:    lda mdur            ; ---- the hard restart, before a note that follows a note ----
        cmp #$03
        bcs mpit
${gen ? `        lda ${hx(gen.gnN)}            ; (the generator's event after this one)
        bmi mpit            ; slurred next: no restart, the note just moves
` : `        ldx mptr
        lda edur,x
        bne mh1
        ldx #$00
mh1:    lda enote,x
`}        beq mpit            ; a rest next: let this one ring
        lda mdur
        cmp #$02
        bne mh2
        lda mnt
        beq mpit            ; (after a rest there is nothing sounding to cut)
        lda #$00            ; 2 frames out: ADSR 0, gate off -- the envelope drops to 0 at once
        sta $d40c
        sta $d40d
${breath ? `        sta $d413
        sta $d414
` : ''}        lda #$10
        jsr mctl
        jmp mpit
mh2:    lda #$11            ; 1 frame out: the envelope back, and the test bit
        sta $d40c
        lda #$38
        sta $d40d
${breath ? `        lda #$11
        sta $d413
        lda #${hx((breath.sus << 4) | 8)}
        sta $d414
` : ''}        lda #$09
        jsr mctl
        rts
mpit:   lda mnt             ; ---- the pitch: the scoop, then the vibrato ----
        beq mx
        ldx mage
        cpx #$ff
        beq mp1
        inc mage
mp1:    cpx #$02
        bcs mp4
        clc
        adc scoop,x
mp4:    tay
        cpx #$14            ; 20 frames in: the vibrato starts, up half a run first, so it swings
        bcc mpw             ;   evenly about the note (VIB_TURN / 2; it was 2 of 5, half a step flat)
        bne mv1
        lda #$01
        sta vdir
        lda #${VIB_TURN >> 1}
        sta vcnt
        jsr rnd             ; one vibrato in ${VIB_DEEP_IN} twice as deep (the tracker's depth 32 -> 64)
        cmp #${Math.round(256 / VIB_DEEP_IN)}
        lda #$00
        rol
        sta vdeep           ; (0 = deep: the carry was clear)
mv1:    lda vstep,y         ; a frame's step (vstep, VIB_SWING / VIB_TURN of the frequency's high byte),
        ldx #$00            ;   or twice it deep. 16-BIT, into mt: deep, the top C's is 80, and
        stx mt+1            ;   was 134 (2026-11-19), past what a signed byte holds
        ldx vdeep
        bne mv1d            ; (0 = deep)
        asl
        rol mt+1
mv1d:   sta mt
        lda vdir
        bpl mv2
        lda #$00            ; down: the step negated
        sec
        sbc mt
        sta mt
        lda #$00
        sbc mt+1
        sta mt+1
mv2:    lda voff            ; the offset + the step
        clc
        adc mt
        sta voff
        lda voffh
        adc mt+1
        sta voffh
        dec vcnt
        bne mpw
        lda #${VIB_TURN}            ; the rate: a turn every VIB_TURN frames (end-tunes.mjs)
        sta vcnt
        lda vdir
        eor #$fe            ; 1 <-> -1
        sta vdir
mpw:    lda voff            ; the frequency + the vibrato...
        clc
        adc flo,y
        sta mt
        lda voffh
        adc fhi,y
        tax
        lda mt              ; ...+ the glide/bend offset
        clc
        adc bofl
        sta $d407
        txa
        adc bofh
        sta $d408
        lda bofl            ; the offset decays: less 1/2^brsh of itself (shifted, sign kept)
        ora bofh
        beq mx
        lda bofl
        sta mt
        lda bofh
        sta mt+1
        ldx brsh
mpd:    lda mt+1
        cmp #$80
        ror mt+1
        ror mt
        dex
        bne mpd
        lda bofl
        sec
        sbc mt
        sta bofl
        lda bofh
        sbc mt+1
        sta bofh
mx:     rts
mctl:   sta $d40b           ; the flute's control, and the breath's: the same gate and test bit on noise
${breath ? `        and #$0f
        ora #$80
        sta $d412
` : ''}        rts
scoop:  !byte 3,2
flo:
${rows(freqs.map(f => f & 255))}
fhi:
${rows(freqs.map(f => f >> 8))}
vstep:  ; the vibrato's step a frame, a note each (VIB_SWING / VIB_TURN of its frequency's high byte)
${rows(freqs.map(f => Math.round((f >> 8) * VIB_SWING / VIB_TURN)))}
${gen ? '' : `enote:
${rows(ev.map(e => e[0]))}
edur:
${rows([...ev.map(e => e[1]), 0])}`}`;


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
