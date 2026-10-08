// ---- the boot loader ----
// THREE files, chained, that install KRILL'S LOADER and then pull every other file straight to
// where it belongs. See AUTORUN_AT / QUOTE_RUN / IRAY_ENTRY below for the split and why.
//
// WHAT KERNAL LOADS HAVE TO CARRY. A fast loader cannot load itself, so everything up to and
// including Krill's installer arrives at ~290 bytes/sec, and that is the whole of the wait:
// 93 bytes of autorun stub, ~1.9 K of packed quote, then Krill's 530-byte resident and its
// 3,284-byte install routine. Everything AFTER install() runs at Krill's ~4.9 KB/s on NTSC,
// which takes the other 57 KB from 195 seconds to 12.
//
// THE MEMORY MAP THIS FORCES, all of it below $0801 so the 46 KB image cannot land on it:
//   $0400-$0611  Krill's resident. It only has to survive the boot: the first rendered frame
//                writes stackLT over it, and nothing loads again until the hub needs levels 5-7,
//                which is not built. That is why it costs no permanent RAM at all.
//   $0620-$07ff  this body.
//   $0940        Krill's install routine, inside IRAY's image, overwritten later by IMG.
// The PRG therefore spans $0801 to $0940 + 3,284 + 530, and the copy loop at $0801 lifts the
// resident and this body into place underneath it before jumping here.
//
// Two hardware facts still set the shape:
//   * KERNAL LOAD -- and Krill without LOAD_UNDER_D000_DFFF -- runs with I/O MAPPED, so neither
//     can physically write $d000-$dfff. The hole ladder is landed in bank 3 at $c000 and copied
//     under the hole with the port at $34.
//   * The image covers $0801-$bfff, which includes this stub's own PRG. Hence the relocation.
// LOAD_UNDER_D000_DFFF would delete that copy, and it is deliberately OFF: it requires IRQs
// through $fffe with the ROM disabled, while the KERNAL fallback requires $0314 with the ROM in,
// and at boot the KERNAL's own IRQ is the one running. The copy is 30 bytes; the conflict is not
// worth 116.
import { readFileSync } from 'fs';

export const LOADER_RUN = 0x0630;   // clear of Krill's resident, which END_ADDRESS_API made
                                    // 556 bytes: $0400-$062b. buildLoader asserts it.
const KDIR = 'krill';
const krillPrg = n => [...readFileSync(new URL(`../${KDIR}/${n}`, import.meta.url))];
const krillAt = p => p[0] | (p[1] << 8);
const KRILL_RES_PRG = krillPrg('loader-c64.prg'), KRILL_INST_PRG = krillPrg('install-c64.prg');
const KRILL_RES = KRILL_RES_PRG.slice(2), KRILL_INST = KRILL_INST_PRG.slice(2);
// $0980 is NOT Krill's default install address ($1000) -- krill/build.sh must be given the same
// one, and krill/loaderconfig.inc is the config it builds against. The installer sits inside the
// boot PRG, which is the one file loaded at KERNAL speed (~290 B/s), so every byte between the
// stub's end and the installer's start is dead air on the loading screen: at the default it was
// 654 bytes = 2.3 seconds of nothing.
const KRILL_RESIDENT = 0x0400, KRILL_INSTALL = 0x09c0;
// Where the KERNAL's screen goes so that install() cannot print on Krill's resident at $0400 --
// and, just as important, cannot print on the QUOTE. $cc00 is the 1K above IHOL in bank 3 and is
// exactly the 1000 bytes a screen needs; buildLoader guards that IHOL never grows into it.
const KSCR = 0xcc00;
// WHERE THE UNDER-HOLE FILE IS STAGED before the port flips to $34 and it is copied to $d000.
// It was $c000, which put it in the same page as KSCR and capped the ladder at 3K -- and the
// ladder had to grow past that when the orb ladder's tail moved under the hole. Nothing wanted
// bank 3 in particular: this file is the FIRST thing loaded, so the whole image region is still
// empty, and $b000 gives the full 4K of the hole to stage in with KSCR left where it is.
export const KSTAGE = 0xb000;
// ---- and where the game PARKS the live resident ----
// There is ONE resident and it has to be this one: Krill's protocol is stateful across loads, so
// a second pristine build at another address is not the party the drive is talking to -- it
// hangs waiting for a reply that never comes (PC stuck at $6ec7). $0400 is about to become
// stackLT, so entry copies it out of the way and lateLoad copies it back to run it in place.
export const KRILL_RESIDENT_AT = KRILL_RESIDENT;
export const KRILL_RT_AT = 0x6e00;
export const KRILL_RT_LEN = KRILL_RES.length;
// WHERE THE RESIDENT'S BYTES WAIT. They cannot simply be copied to $0400 by the stub and left
// there: $0400 is the default SCREEN, and install() calls KERNAL routines that write to it. The
// README says this for "below $0400"; it is just as true AT $0400, and the symptom was loadraw
// returning $f0 -- not a status at all, because it was not loadraw any more. So the bytes ride
// in the PRG above the install routine and the BODY copies them down once install has finished.
// DERIVED, and NOT page-aligned. It was a fixed $2800, which is fine while the installer is 7,056
// bytes and ends just short of it -- and silently wastes 3.9 KB of PRG, and so of LOAD TIME, the
// moment a smaller installer is built. A 1541-only Krill is half the size and the boot did not get
// one second faster, because the gap was still being loaded. Nothing here wants a page boundary:
// the copy loop that lifts this to KRILL_RESIDENT is absolute-indexed and aligns to the
// DESTINATION, so aligning the source only bought up to 255 more bytes of dead air.
const KRILL_RESDATA = KRILL_INSTALL + KRILL_INST.length;
// Krill is built by hand (krill/build.sh) and its INSTALL=/RESIDENT= addresses are baked into the
// binaries. If those drift from the two constants above, the boot jsr's into the middle of the
// installer and comes apart in a way that looks like anything but an address mismatch -- the last
// time these disagreed the symptom was a screen of garbage. The PRG headers say what they ARE.
for (const [name, prg, want] of [['install-c64.prg', KRILL_INST_PRG, KRILL_INSTALL],
                                 ['loader-c64.prg', KRILL_RES_PRG, KRILL_RESIDENT]])
  if (krillAt(prg) !== want) throw new Error(
    `${KDIR}/${name} is assembled for $${krillAt(prg).toString(16)} but loader-src.mjs expects ` +
    `$${want.toString(16)}. Re-run krill/build.sh with matching INSTALL=/RESIDENT=.`);
// Krill's two binaries, PRG files with a 2-byte load address we drop: the resident is placed by
// our copy loop, the install routine is simply part of the image at KRILL_INSTALL.


const hx4 = n => '$' + n.toString(16).padStart(4, '0');
const petscii = s => [...s].map(c => c.charCodeAt(0)).join(',');

// The quote screen: a charset and a 40x25 map in VIC bank 3, shown for the whole load. It is the
// only place either can live -- IMG owns $0801-$bfff and there is nothing below it -- so it sits
// where IPIC and ILVL eventually land, and those two go LAST, behind a blanked screen.
export const QUOTE_SCR = 0xf400, QUOTE_CHR = 0xf800;

// ---- THE BOOT IS THREE FILES, NOT ONE ----
// The one file loaded at KERNAL speed is the black screen: ~290 bytes/sec, and nothing can run
// until all of it has arrived. So the chain is split by WHAT HAS TO BE SEEN FIRST.
//
//   IRUN  93 B @ $02a7   0.3 s   autoruns, blanks the screen, loads IQOT
//   IQOT  ~1.9 K @ $4000  6.5 s   decrunches the quote to $f400 and PUTS IT UP, loads IRAY
//   IRAY  ~3.8 K @ $0801  13 s    Krill's installer and resident, behind the quote
//
// It was one 4,263-byte file and the quote appeared at ~19 s. The same bytes in this order put
// a black screen up at ~2 s and the quote at ~8.5 s, because the only thing in front of the
// quote is now the 93-byte stub and the quote's own packed data.
export const AUTORUN_AT = 0x02a7;   // free RAM below the vectors; the file runs THROUGH $0302
export const QUOTE_RUN = 0x4000;    // clear of IRAY ($0801-$18a5) and dead by the time IMG lands
export const IRAY_ENTRY = 0x0801;   // no BASIC line: nothing types RUN any more
// 156 bytes of decruncher scratch, live only while the quote is decrunching. $c000 is free until
// the body loads IHOL there, which is after install, which is long after this.
export const EXO_TABLE = 0xc000;
// The decruncher is exomizer's, in acme syntax, and asm6502.mjs is not acme -- no !macro, no
// !ifndef, no local labels. So it is PRE-ASSEMBLED by make-quote.mjs (which already needs a
// toolchain for the packer) and arrives as bytes, exactly like Krill's two binaries. Bytes are
// position-dependent, so both ends have to agree on the addresses, and these are that agreement:
export const EXO_GETBYTE = QUOTE_RUN + 3;    // the byte fetcher, right after IQOT's entry jmp
export const EXO_CODE = QUOTE_RUN + 0x14;    // the decruncher itself, after the fetcher

// ---- the loading sweep ---------------------------------------------------------------------
// The quote is inked grey2; as the load progresses its columns turn grey3, left to right. Real
// progress, not a timer: PAGES ARRIVED, counted by the two things that actually see the bytes.
//
// COLOUR IS PER 8x8 CELL. This is hi-res TEXT mode -- a sampled charset plus a 40x25 map -- so
// each cell's foreground is one nybble of colour RAM at $d800 and the background is the global
// $d021. A column is 25 bytes, $d800 + col + 40*row, and 40 columns is the whole resolution
// available. (Hi-res BITMAP mode takes the colour from the screen RAM nybbles instead; either
// way the unit is the cell, never the pixel.)
//
// The routines live in LOW RAM, assembled once and copied down by IQOT, because BOTH phases need
// them and neither can host them: IQOT at $4000 is buried by IMG while the sweep is still
// running, and Krill's resident plus the boot body already want more than the 1,024 bytes
// between $0400 and $0801. $0334-$03bf is free for the whole boot -- above IRUN's $02a7-$0303,
// below the resident -- and the game's own use of low RAM starts long after the sweep is gone.
const SW_COL = 0x0334, SW_ACC = 0x0335, SW_PG = 0x0337, SW_BASE = 0x0338,
      SW_WANT = 0x0339, SW_STEP = 0x033a,
      // the KRILL phase's step, set by whichever first stage ran (IQOT's KERNAL read or IFBT's fast
      // one): the columns left for Krill to paint depend on how far the first stage got, so it
      // cannot be one constant in the body any more
      SW_STEP2 = 0x033c;
export const SWEEP_AT = 0x0340;
const SW_IRQ = SWEEP_AT, SW_TICK = SWEEP_AT + 3,  // a jump table, so no entry's address depends
      SW_TITLE = SWEEP_AT + 6;                    //   on how long the code turns out to be

// ---- THE TITLE (LEST): the last ~20% of the load -----------------------------------------------
// The sweep runs its 40 columns over the first TITLE_AT of the time the quote is up; the tick that
// turns the last column switches the display to the title. ITTL brings it in one Krill load early
// in the boot: its own glyphs (stamped from the quote's charset by make-title.mjs, but only the 63
// it uses), the colours of its inked rows, and its screen -- all inside $e000-$e7e7, the game's
// screen-buffer area, which no boot file loads into and the game overwrites on its first frame.
// That is also why the title stays up through the LAST loads: they land on the quote ($ef80-$fc80),
// not here, so the blank they used to need is gone and the title holds until level 1 appears.
export const TITLE_CHR = 0xe000, TITLE_COL = 0xe200, TITLE_SCR = 0xe400;
export const TITLE_AT = 0.8;
const sweepSource = (title) => `        * = ${hx4(SWEEP_AT)}
        jmp swIrq
        jmp swTick
${title ? `        jmp swTitle` : `        rts                     ; no title: SW_TITLE does nothing (the table keeps its shape)
        !byte 0,0`}

swIrq:  lda $e3                 ; pages of the file in flight = end page - load page. Krill's
        sec                     ;   loads are blocking, so nothing in the mainline can watch
        sbc $e1                 ;   them -- but Krill is "arbitrarily interruptible" and
        bcs swi1                ;   END_ADDRESS_API keeps this pair current while it loads, for
        lda #$00                ;   26 bytes of resident. So the KERNAL's own 60 Hz IRQ, chained,
swi1:   clc                     ;   is the entire progress display.
        adc ${hx4(SW_BASE)}
        sta ${hx4(SW_WANT)}
swi2:   lda ${hx4(SW_PG)}       ; the sweep only ever moves FORWARD, so a momentarily lower
        cmp ${hx4(SW_WANT)}     ;   target simply does nothing
        bcs swi3
        jsr swTick
        jmp swi2
swi3:   jmp $ea31               ; on to the KERNAL's own handler

        ; One page has arrived. Bresenham with a denominator of 256, so "carry a column" is just
        ; a non-zero high byte -- and the STEP is per phase, because the two phases move at wildly
        ; different speeds. IRAY is 7% of the bytes and 57% of the WAIT: 4 KB at the KERNAL's
        ; ~290 B/s against 53 KB at Krill's ~4.9 KB/s. A sweep proportional to bytes sits still
        ; for the first fourteen seconds and then runs across in ten. Proportional to TIME is
        ; what a progress display means.
swTick: inc ${hx4(SW_PG)}
        lda ${hx4(SW_ACC)}
        clc
        adc ${hx4(SW_STEP)}
        sta ${hx4(SW_ACC)}
        lda ${hx4(SW_ACC + 1)}
        adc ${hx4(SW_STEP + 1)}
        sta ${hx4(SW_ACC + 1)}
stk1:   lda ${hx4(SW_ACC + 1)}
        beq stk9
        dec ${hx4(SW_ACC + 1)}
        jsr swPant
        jmp stk1
stk9:   rts

swPant: lda ${hx4(SW_COL)}      ; one column of colour RAM to grey3, all 25 rows
        cmp #$28
        bcs spn9
        inc ${hx4(SW_COL)}
        sta $fb                 ; $fb/$fc: free zero page, and clear of Krill's $e0-$e7
        lda #$d8
        sta $fc
        ldx #$19
        ldy #$00
spn1:   lda #$0f
        sta ($fb),y
        lda $fb
        clc
        adc #$28
        sta $fb
        bcc spn2
        inc $fc
spn2:   dex
        bne spn1
${title ? `        lda ${hx4(SW_COL)}      ; was that the LAST column? Then the quote has had its time
        cmp #$28
        beq swTitle
` : ''}spn9:   rts
${title ? `        ; ---- swTitle: show LEST. Called from the IRQ when the sweep ends, and again by the boot
        ; body before the last loads in case the estimate ran slow (they land on the quote). Doing it
        ; twice is harmless: it only ever writes the same values. Display FIRST, colours second, so
        ; the frame caught between shows the title in the sweep's grey rather than the quote in
        ; the title's greys.
swTitle:
        lda #$${((((TITLE_SCR - 0xc000) >> 10) << 4) | (((TITLE_CHR - 0xc000) >> 11) << 1)).toString(16)}
        sta $d018               ; screen ${hx4(TITLE_SCR)}, charset ${hx4(TITLE_CHR)}, still bank 3
        ; THE COLOURS ARE UNDER THE KERNAL ROM. The VIC reads ${hx4(TITLE_COL)} as RAM, but the CPU reads
        ; ROM there while $01 is $37 -- the first version copied ROM bytes into colour RAM and drew
        ; LEST in confetti. $35 maps the ROM out and keeps I/O (colour RAM) in. sei for the window:
        ; the IRQ vector at $fffe is RAM then, and the body calls this with interrupts ON.
        php
        sei
        lda $01
        pha
        lda #$35
        sta $01
        ldx #$00
${[...Array(Math.ceil(title.len / 256))].map((_, p) => {
  const n = Math.min(256, title.len - p * 256), dst = 0xd800 + 40 * title.row0 + p * 256;
  return `stc${p}:   lda ${hx4(TITLE_COL + p * 256)},x  ; the inked rows' greys into colour RAM
        sta ${hx4(dst)},x
        inx
${n === 256 ? `        bne stc${p}` : `        cpx #$${n.toString(16).padStart(2, '0')}
        bne stc${p}
        ldx #$00`}
`; }).join('')}        pla
        sta $01
        plp
        rts
` : ''}`;

function bodySource(files, entry, pages, first, step2, title) {
  let step = 0;
  const load = f => `
        lda #${'$' + (++step).toString(16).padStart(2, '0')}
        sta $02                 ; BOOTSTEP: which load is in flight, for probe.mjs on a failure
        ldx #<n${f.tag}
        ldy #>n${f.tag}
        jsr ${hx4(KRILL_RESIDENT)}      ; loadraw: the file's own header says where it goes
${process.env.BOOTDBG === 'load' + step ? `        sta $d020               ; BOOTDBG: border = A, blanked so nothing else shows
        lda #$0b
        sta $d011
ldbg:   jmp ldbg
` : ''}${process.env.BOOTDBG === 'hi' + step ? `        lsr
        lsr
        lsr
        lsr
        sta $d020               ; BOOTDBG: border = A's HIGH nibble
        lda #$0b
        sta $d011
hdbg:   jmp hdbg
` : ''}${process.env.BOOTDBG === 'c' + step ? `        lda #$00
        rol
        sta $d020               ; BOOTDBG: border = the CARRY from this load
        lda #$0b
        sta $d011
cdbg:   jmp cdbg
` : ''}        bcs fail` + (f.last ? '' : `
        lda $e1                 ; file in: collapse the in-flight delta to zero BEFORE crediting
        sta $e3                 ;   its pages, so the two can never both be counted
        lda ${hx4(SW_BASE)}
        clc
        adc #${'$' + Math.floor(f.length / 256).toString(16).padStart(2, '0')}
        sta ${hx4(SW_BASE)}`);
  // A runtime file's NAME belongs to whoever loads it, and that is the game, not this stub. The
  // boot PRG comes down at KERNAL speed, so every byte in it is time on a black screen.
  const names = files.filter(f => !f.runtime)
    .map(f => `n${f.tag}: !byte ${petscii(f.name)},0`).join('\n');
  return `        * = ${hx4(LOADER_RUN)}
        lda #$00                ; no KERNAL messages: "SEARCHING FOR" would scroll the screen,
        sta $9d                 ;   and the screen is about to be somewhere much more useful
        lda #$01                ; ...and no cursor blink either. The KERNAL's IRQ writes the
        sta $cc                 ;   character under the cursor to $0400 -- which is now the
                                ;   middle of Krill's resident. BASIC clears this itself while a
                                ;   program runs, but one instruction is cheaper than trusting it.
        ; ---- THE SCREEN IS ALREADY WHERE IT NEEDS TO BE ----
        ; Krill's resident has to be in place BEFORE install(), because install PATCHES it with
        ; what it finds on the bus -- copying it afterwards gets a resident that has never been
        ; told which drive it is talking to, and loadraw returns $f0, which is not a status at
        ; all. But $0400 is the default SCREEN and install calls KERNAL routines that write
        ; there, so the KERNAL's screen has to be somewhere else before we get here.
        ; IQOT did that: it pointed $0288 at a SCRATCH page and ran CLRSCR to rebuild the line
        ; pointers cached in $d1/$d2. Note the scratch page is NOT the displayed screen -- the
        ; display is the quote at $f400, and a stray KERNAL print would eat a line of it.
        ; So nothing here touches $d011, $d018 or $dd00: the quote stays up through install and
        ; every load below, until the deliberate blank before the files that land on it.

        ldx #$00                ; now the resident, with $0400 no longer the screen.
                                ; GENERATED from the resident's actual length, never hardcoded:
                                ; this was two whole pages plus a remainder for the 530-byte
                                ; all-drives resident, and the 1541-only one is 226 bytes -- the
                                ; fixed loop copied 738 and ran through $0620, which is THIS CODE.
${[...Array(Math.floor(KRILL_RES.length / 256))].map((_, p) =>
`rcp${p}:  lda ${hx4(KRILL_RESDATA + p * 256)},x
        sta ${hx4(KRILL_RESIDENT + p * 256)},x
`).join('')}${Math.floor(KRILL_RES.length / 256) ? `        inx
        bne rcp0
        ldx #$00
` : ''}${KRILL_RES.length & 255 ? `rcpr:   lda ${hx4(KRILL_RESDATA + (KRILL_RES.length & ~255))},x
        sta ${hx4(KRILL_RESIDENT + (KRILL_RES.length & ~255))},x
        inx
        cpx #${'$' + (KRILL_RES.length & 255).toString(16).padStart(2, '0')}
        bne rcpr
` : ''}
${process.env.BOOTDBG === 'instc' ? `        jsr ${hx4(KRILL_INSTALL)}
        lda #$00
        rol                     ; BOOTDBG: border = install's CARRY, 0 = installed natively
        sta $d020
        lda #$0b
        sta $d011
icdbg:  jmp icdbg
` : ''}${process.env.BOOTDBG === 'res' ? `        lda ${hx4(KRILL_RESIDENT + 4)}       ; BOOTDBG: byte 4 of the resident, expect $07
        sta $d020
        lda #$0b
        sta $d011
rdbg:   jmp rdbg
` : ''}        jsr ${hx4(KRILL_INSTALL)}       ; upload the drive code. Carry set = no native drive; with
${process.env.BOOTDBG === 'install' ? `        pha
        lda #$00
        rol
        sta $d021               ; BOOTDBG: carry, seen only if you look; border carries A
        pla
        sta $d020
        lda #$0b
        sta $d011               ; BLANK: the whole display then shows the BORDER and nothing else
idbg:   jmp idbg
` : ''}
        ;bcs fail               ;   LOAD_VIA_KERNAL_FALLBACK the resident falls back to $ffd5 by
                                ;   itself, so a failure here is NOT fatal and must not be treated
                                ;   as one -- that is the whole point of the fallback, and it is
                                ;   what a stock VICE with true drive emulation off will take.
${process.env.BOOTDBG === 'res2' ? `        lda ${hx4(KRILL_RESIDENT + 4)}       ; BOOTDBG: same byte AFTER install, expect $07
        sta $d020
        lda #$0b
        sta $d011
r2dbg:  jmp r2dbg
` : ''}        lda ${hx4(SW_PG)}       ; phase 2: carry on from where IQOT's byte loop stopped
        sta ${hx4(SW_BASE)}
        lda $e1
        sta $e3                 ; nothing in flight yet
        lda ${hx4(SW_STEP2)}     ; the Krill phase's step: set by the first stage that ran, which
        sta ${hx4(SW_STEP)}     ;   knows how many columns it left to paint
        lda ${hx4(SW_STEP2 + 1)}
        sta ${hx4(SW_STEP + 1)}
        sei
        lda #<${hx4(SW_IRQ)}
        sta $0314
        lda #>${hx4(SW_IRQ)}
        sta $0315
        cli
${files.filter(f => f.first && !f.runtime).map(load).join('\n')}
        sei                     ; the HOLE LADDER goes under the I/O hole: it lands at $c000 (the
        lda #$34                ;   only place a loader with I/O mapped can put it), then
        sta $01                 ;   $c000 -> $d000 with the port at $34.
        ldx #$00
        ; ARITHMETIC, not string concatenation. This was a $c0 prefix with a 2-digit page, giving
        ; $c000,$c001..$c00b -- a stride of ONE, not 256. Every pair then copied the same bytes
        ; and the net effect was 267 bytes of a 2,944-byte ladder. The first page survived, so
        ; holes, sockets and pedestals rendered as rows of $ff: horizontal grey lines. It shipped
        ; for three commits because nothing downstream can tell a short copy from a real ladder.
hcp:${[...Array(pages)].map((_, p) => `
        lda $${(KSTAGE + p * 256).toString(16)},x
        sta $${(0xd000 + p * 256).toString(16)},x`).join('')}
        inx
        bne hcp
        ; ...and CHECK it arrived. A wrong stride is silent at every later stage, so compare the
        ; two ends of the ladder while the port is still at $34 and $d000 is still RAM.
        lda $${(KSTAGE + first.length - 1).toString(16)}
        cmp $${(0xd000 + first.length - 1).toString(16)}
        bne hcpbad
        lda $${(KSTAGE + (pages - 1) * 256).toString(16)}
        cmp $${(0xd000 + (pages - 1) * 256).toString(16)}
        beq hcpok
hcpbad: lda #$37
        sta $01
        lda #$02                ; RED border, screen on: the ladder did not arrive whole
        sta $d020
        lda #$1b
        sta $d011
hb:     jmp hb
hcpok:  lda #$37
        sta $01
        cli
${files.filter(f => !f.first && !f.last && !f.runtime).map(load).join('\n')}
${title ? `        jsr ${hx4(SW_TITLE)}     ; the last files land on the QUOTE: be sure it is not on screen
                                ;   (the sweep normally switched already; this covers a slow run)
` : `        lda #$0b                ; screen OFF: the last two files land on the quote, and black is
        sta $d011               ;   a better last frame than the picture coming apart
`}${files.filter(f => f.last && !f.runtime).map(load).join('\n')}
        sei                     ; $0314 must not point into a boot body IMG has already buried,
        lda #$31                ;   not even for the one frame before the game sets its own
        sta $0314
        lda #$ea
        sta $0315
        cli
        jmp ${hx4(entry)}

fail:   sta $03                 ; the status byte Krill returned, beside the step in $02
        sta $d020               ; BORDER = Krill's status, BACKGROUND = which load was in
        lda $02                 ;   flight. Readable off a screenshot, which is the only
        sta $d021               ;   instrument that works before there is a program to probe.
        lda #$1b
        sta $d011               ; screen ON, so both registers are visible at once
fstop:  jmp fstop

${names}
`;
}

// Returns the PRG bytes for the stub: BASIC header, a copy loop that lifts Krill's resident and
// the body into place below $0801, the two as data, and Krill's install routine at KRILL_INSTALL.
export function buildLoader(assemble, files, entry, step2, title = null) {
  const first = files.find(f => f.first);
  const holePages = Math.ceil((first.length ?? 2048) / 256);
  if (holePages > 16) throw new Error(`the file under the I/O hole is ${first.length} bytes; the hole is 4K`);
  // The staging run must stay clear of bank 3, where ICHR and KSCR both live.
  if (KSTAGE + holePages * 256 > 0xc000) throw new Error(
    `${first.name} is ${first.length} bytes staged at ${hx4(KSTAGE)} and reaches ` +
    `${hx4(KSTAGE + holePages * 256 - 1)}, past $c000 into the charset and the KERNAL's scratch ` +
    `screen at ${hx4(KSCR)}. Lower KSTAGE -- everything below it is still empty at this point.`);
  const body = assemble(bodySource(files, entry, holePages, first, step2, title));
  if (LOADER_RUN + body.bytes.length > 0x0800) throw new Error(
    `the boot body is ${body.bytes.length} bytes and runs past $0800 from ${hx4(LOADER_RUN)}, ` +
    `into the image it is about to load. Krill's resident takes $0400-$0612 below it.`);
  const res = KRILL_RES, inst = KRILL_INST;
  if (KRILL_RESIDENT + res.length > LOADER_RUN) throw new Error(
    `Krill's resident is ${res.length} bytes at ${hx4(KRILL_RESIDENT)} and runs into the boot ` +
    `body at ${hx4(LOADER_RUN)}. Rebuild it with a lower RESIDENT= or move the body up.`);
  if (res.length > 768) throw new Error(
    `the body's resident copy is two whole pages plus a tail; ${res.length} bytes needs a third`);
  // The body is longer than 255 bytes, so it CANNOT be copied by one `cpx #len` loop -- the
  // immediate is a single byte and the count silently truncates. (It did: the stub copied 44 of
  // 300 bytes, ran into whatever followed, and came back to BASIC with READY.) Full pages first,
  // then the remainder, and the remainder loop must not run at all when there isn't one.
  const bl = body.bytes.length, full = bl >> 8, rem = bl & 255;
  const cpBody = [...Array(full)].map((_, p) =>
      `        ldx #$00\ncpb${p}:  lda bdat+${p * 256},x\n        sta ${hx4(LOADER_RUN + p * 256)},x\n` +
      `        inx\n        bne cpb${p}`).join('\n') +
    (rem ? `\n        ldx #$00\ncpbr:   lda bdat+${full * 256},x\n` +
           `        sta ${hx4(LOADER_RUN + full * 256)},x\n        inx\n` +
           `        cpx #$${rem.toString(16).padStart(2, '0')}\n        bne cpbr` : '');
  // NO BASIC HEADER. This file is jumped to by IQOT, never RUN, so the twelve bytes of SYS line
  // would be twelve bytes of KERNAL-speed load for nothing -- and a half-second of black screen.
  const stub = `        * = ${hx4(IRAY_ENTRY)}
${cpBody}
        jmp ${hx4(LOADER_RUN)}
bdat:   !byte ${[...body.bytes].join(',')}
        * = ${hx4(KRILL_INSTALL)}
        !byte ${inst.join(',')}
        * = ${hx4(KRILL_RESDATA)}
        !byte ${res.join(',')}
`;
  const out = assemble(stub);
  return { prg: out.prg, bodyLen: body.bytes.length, resLen: res.length, instLen: inst.length };
}


// ---- IRUN: 93 bytes, and the only thing in front of a black screen ----------------------------
// LOAD"*",8,1 finds this because it is written to the disk first. It AUTORUNS -- no typing RUN --
// by the oldest trick there is: the file runs through $0302, BASIC's IMAIN vector. When LOAD
// returns, BASIC relinks the (empty) program at $0801 and jumps through $0302 to get to READY,
// and $0302 now points here.
//
// The file therefore has to SPAN $0302, which fixes its shape: code from $02a7 (where free RAM
// below the vectors starts) up to $0303, and no further. $0300 is IERROR and is written back with
// the value it already had -- we never return to BASIC, but two bytes is cheaper than reasoning
// about it. Stopping at $0303 is the point: $0314 and up are the KERNAL's vectors, IRQ included,
// and loading over those while the drive is still streaming is how this trick gets a reputation.
export function buildAutorun(assemble, nextName, nextRun) {
  const src = `        * = ${hx4(AUTORUN_AT)}
boot:   ldx #$ff                ; BASIC's main loop called us; take the stack back
        txs
        cld
        lda #$00                ; BLACK, now. This is the whole reason the file is 93 bytes.
        sta $d020
        sta $d021
        sta $9d                 ; no KERNAL messages: SEARCHING/LOADING would print over it
        lda #$0b
        sta $d011               ; and the screen off, so the next load shows nothing at all
        lda #$01
        sta $cc                 ; cursor blink off -- its IRQ writes through $d1/$d2, which still
                                ;   point into $0400, where Krill's resident is going to live
        lda #$04
        ldx #<nq
        ldy #>nq
        jsr $ffbd               ; SETNAM
        lda #$01
        ldx #$08
        ldy #$01                ; secondary 1 = load to the address in the file's own header
        jsr $ffba               ; SETLFS
        lda #$00
        jsr $ffd5               ; LOAD
        bcs bstop
        jmp ${hx4(nextRun)}
bstop:  inc $d020               ; no quote and no game: say so in the only way left
        jmp bstop
nq:     !byte ${petscii(nextName)}
        * = $0300
        !word $e38b             ; IERROR, put back exactly as it was
        !word boot              ; IMAIN -- THIS is the autorun
`;
  const out = assemble(src);
  if (out.prg.length - 2 !== 0x0304 - AUTORUN_AT) throw new Error(
    `the autorun stub is ${out.prg.length - 2} bytes; it must be exactly ${0x0304 - AUTORUN_AT}, ` +
    `spanning ${hx4(AUTORUN_AT)} through $0303, or it does not reach $0302 and nothing runs`);
  return out.prg;
}

// ---- IQOT: the quote, packed, and the first thing anyone actually sees -------------------------
// 2,760 bytes of charset-and-map crunched to ~1,455 by exomizer, which is ~4.5 seconds off the
// black screen at KERNAL speed. `exomizer mem file,$f400` -- NOT `raw`: this decruncher takes its
// destination from the stream's first three bytes, and a raw stream has no such header.
// Backward is exomizer's default and the pairing exodecrunch.asm expects with DECRUNCH_FORWARDS
// left at 0: the packed bytes are read from the END downwards, so the pointer starts one past.
export function buildQuote(assemble, q, irayName, step1, title = null, step2 = 1) {
  const d018 = (((QUOTE_SCR - 0xc000) >> 10) << 4) | (((QUOTE_CHR - 0xc000) >> 11) << 1);
  if (q.decr.at !== EXO_CODE) throw new Error(
    `the decruncher in quote-screen.json is assembled for ${hx4(q.decr.at)} but this build puts ` +
    `it at ${hx4(EXO_CODE)}. Re-run make-quote.mjs -- the bytes are position-dependent.`);
  // The fetcher is hand-placed at EXO_GETBYTE because the decruncher calls it by absolute address,
  // baked in when acme assembled it. Its last instruction's OPERAND is the read pointer, so the
  // two bytes that qrun writes are inside the code, at a fixed offset. Both are checked below.
  const qbLo = EXO_GETBYTE + 12;
  const sweep = [...assemble(sweepSource(title)).bytes];
  if (SWEEP_AT + sweep.length > 0x0400) throw new Error(
    `the sweep block is ${sweep.length} bytes at ${hx4(SWEEP_AT)} and runs into $0400, where ` +
    `Krill's resident goes`);
  const src = `        * = ${hx4(QUOTE_RUN)}
        jmp qrun                ; IRUN enters here; the fetcher has to own ${hx4(EXO_GETBYTE)}
qbLo = ${hx4(qbLo)}
qbHi = ${hx4(qbLo + 1)}
        lda qbLo                ; exod_get_crunched_byte: backward, so PRE-decrement, then read
        bne qbSkip
        dec qbHi
qbSkip: dec qbLo
        lda $ffff               ; this operand IS qbLo/qbHi
        rts
        * = ${hx4(EXO_CODE)}
        !byte ${q.decr.bytes.join(',')}
        ; ---- TWO ENTRIES. qrun is the KERNAL path (IRUN or IFBT's fallback jumps to $4000): show
        ; the quote, then read IRAY a byte at a time. qshow only shows the quote and installs the
        ; sweep, then RETURNS -- IFBT's fast path calls it between its two files and brings IRAY
        ; in itself. Each path then sets the sweep's two step rates for its own speed.
qrun:   jsr qshow
        lda #${'$' + (step1 & 255).toString(16).padStart(2, '0')}
        sta ${hx4(SW_STEP)}     ; ${step1}/256 of a column per page: ${Math.round(step1 * 100 / 256) / 100} columns each
        lda #${'$' + (step1 >> 8).toString(16).padStart(2, '0')}
        sta ${hx4(SW_STEP + 1)}
        lda #${'$' + (step2 & 255).toString(16).padStart(2, '0')}
        sta ${hx4(SW_STEP2)}     ; and the Krill phase's, which the body picks up
        lda #${'$' + (step2 >> 8).toString(16).padStart(2, '0')}
        sta ${hx4(SW_STEP2 + 1)}
        jmp qkern
qshow:  sei                     ; ${hx4(QUOTE_SCR)} is under the KERNAL ROM, so the ROM comes out -- and
        lda #$34                ;   with it the IRQ vector, hence the sei. Zero page is RAM either way.
        sta $01
        cld                     ; the decruncher's one stated precondition
        lda #<pkEnd
        sta qbLo
        lda #>pkEnd
        sta qbHi                ; one PAST the last packed byte: the fetcher pre-decrements
        jsr ${hx4(q.decr.entry)}
        lda #$37
        sta $01
        cli

        lda $dd00
        and #$fc                ; %00 = bank 3. The CIA's bank lines are inverted.
        sta $dd00
        lda #${'$' + d018.toString(16)}
        sta $d018               ; screen ${hx4(QUOTE_SCR)}, charset ${hx4(QUOTE_CHR)}
        lda #$c8
        sta $d016               ; 40 columns, NOT multicolour: the quote is a hi-res charset

        ; ---- and get the KERNAL's screen off $0400 while we are here ----
        ; Krill's resident is going to $0400 and install() calls KERNAL routines that print. The
        ; scratch page is deliberately NOT the displayed screen: one stray print on ${hx4(QUOTE_SCR)} would
        ; eat a line of the quote. CLRSCR is what rebuilds the line pointers cached in $d1/$d2 --
        ; without it a print still goes to the old address. It also repaints colour RAM, which is
        ; why the grey2 fill comes after it and not before.
        lda #${'$' + (KSCR >> 8).toString(16)}
        sta $0288
        jsr $e544               ; CLRSCR
        ldx #$00
qcol:   lda #$0c                ; grey2 over all of colour RAM, which the charset assumes
        sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne qcol
        lda #$1b
        sta $d011               ; and the quote is up. It stays up for the rest of the boot.

        ldx #$00                ; the sweep's routines go to low RAM, where BOTH phases reach
swcp:   lda swDat,x             ;   them -- IMG buries this file while they are still running
        sta ${hx4(SWEEP_AT)},x
        inx
        cpx #${'$' + sweep.length.toString(16).padStart(2, '0')}
        bne swcp
        lda #$00                ; column 0, nothing loaded
        sta ${hx4(SW_COL)}
        sta ${hx4(SW_ACC)}
        sta ${hx4(SW_ACC + 1)}
        sta ${hx4(SW_PG)}
        sta ${hx4(SW_BASE)}
        rts

qkern:

        ; ---- Krill, read a byte at a time, so the sweep can move DURING a KERNAL load ----
        ; LOAD is one blocking call with no progress hook, and this is the longest single wait in
        ; the boot: 4 KB at ~290 B/s. OPEN/CHKIN/BASIN is the same serial transfer with the byte
        ; loop in our hands, for a little KERNAL dispatch per byte -- nothing beside 3.4 ms of
        ; bus time. Secondary address 2 means the file arrives raw, so its own two-byte load
        ; address comes down the wire first; check it rather than skip it.
        lda #$04
        ldx #<nr
        ldy #>nr
        jsr $ffbd               ; SETNAM
        lda #$01
        ldx #$08
        ldy #$02
        jsr $ffba               ; SETLFS
        jsr $ffc0               ; OPEN
        bcs qstop
        ldx #$01
        jsr $ffc6               ; CHKIN
        bcs qstop
        jsr $ffcf
        cmp #<${hx4(IRAY_ENTRY)}
        bne qstop
        jsr $ffcf
        cmp #>${hx4(IRAY_ENTRY)}
        bne qstop
        lda #<${hx4(IRAY_ENTRY)}
        sta $fd
        lda #>${hx4(IRAY_ENTRY)}
        sta $fe
qrd:    jsr $ffcf               ; BASIN
        ldy #$00
        sta ($fd),y
        inc $fd
        bne qrd2
        inc $fe
        jsr ${hx4(SW_TICK)}     ; a page boundary -- the unit the sweep counts
qrd2:   lda $90                 ; ST stays 0 until the byte that carries EOI, which is a REAL
        beq qrd                 ;   byte and has already been stored
        and #$bf                ; EOI alone is the normal end; any other bit is an error
        bne qstop
        jsr $ffcc               ; CLRCHN
        lda #$01
        jsr $ffc3               ; CLOSE
        jmp ${hx4(IRAY_ENTRY)}
qstop:  inc $d020
        jmp qstop
nr:     !byte ${petscii(irayName)}
swDat:  !byte ${sweep.join(',')}
pkDat:  !byte ${q.packed.join(',')}
pkEnd:
`;
  const out = assemble(src);
  // The fetcher is only correct if it landed byte-for-byte where the decruncher calls it and its
  // read operand landed on qbLo. Neither is visible in a screenshot -- a decruncher reading the
  // wrong pointer produces a plausible screen of wrong pixels -- so check the bytes.
  const at = a => out.prg[2 + a - QUOTE_RUN];
  if (at(EXO_GETBYTE) !== 0xad || at(EXO_GETBYTE + 11) !== 0xad || at(EXO_GETBYTE + 14) !== 0x60)
    throw new Error('the quote byte fetcher did not assemble to the expected shape at EXO_GETBYTE');
  for (let i = 0; i < q.decr.bytes.length; i++) if (at(EXO_CODE + i) !== q.decr.bytes[i])
    throw new Error(`the decruncher is not at ${hx4(EXO_CODE)} in the assembled IQOT`);
  return { prg: out.prg, len: out.prg.length - 2, qshow: out.labels.qshow };
}


// ================================================================================================
// ---- FASTBOOT: the first stage at fast-loader speed ---------------------------------------------
// ================================================================================================
// WHY THIS EXISTS, AND WHY KRILL STAYS. Everything above loads at KERNAL speed (~290 B/s) until
// Krill is installed -- and Krill's installer is itself 3.3 KB of that, so the boot spent ~20 s on
// its first 5.8 KB and ~16 s on the other 58 KB. No full-featured loader fixes that by swapping in
// (Covert Bitops' and Bitfire's installers have the same problem); what fixes it is getting the
// DRIVE to read its own code off the disk, so almost nothing crosses the slow bus. That is the
// idea of Michael Steil's fastboot1541 (github.com/mist64/fastboot1541, "do anything you want
// with it"), adapted here. Krill then does the 58 KB and every in-game load, because it is FASTER
// at bulk (its drive code decodes GCR on the fly; this one leans on the drive ROM to read each
// sector) and it tolerates interrupts mid-transfer, which the sweep and background loading use.
// So: fastboot gets things going faster; Krill is faster and more workable after that.
//
//   IRUN (KERNAL) -> IFBT (KERNAL, small) --1541?--> IDRV runs IN THE DRIVE, streams IQOT + IRAY
//                                         \--no----> IQOT's KERNAL path, exactly the old boot
//
// TWO CHANGES FROM fastboot1541, both for robustness:
//   * HANDSHAKED, NOT CYCLE-TIMED. fastboot sends a byte as four bit-pairs 8 cycles apart, timed
//     for PAL (it fails on NTSC) with interrupts off and badlines dodged. Here the C64 CLOCKS EACH
//     BIT by toggling CLK and the drive answers on DATA. The one timing fact left is ONE-SIDED: the
//     C64 must sample later than the drive's worst response (FB_DRIVE_MAX). Interrupts, badlines,
//     sprites and NTSC/PAL can only make the C64 later, so none of them can break it.
//   * EXPLICIT SECTOR READ. fastboot executes the sector the drive happens to hold in an assumed
//     buffer. Here U1 reads IDRV into buffer 1 ($0400) on purpose and M-E runs it.
// A 1541 is recognised by M-R of its ROM's version string ("154" at $E5C4: 1541 and 1541-II; the
// 1570/71 say "157" and the 1581 differs), and anything that does not answer within FB_TIMEOUT
// falls back. SD2IEC and friends take the old path, which works everywhere.
export const FASTBOOT_AT = 0xc200;   // clear of IQOT ($4000+), IRAY ($0801-), EXO_TABLE ($c000-$c09b),
                                     //   KSCR ($cc00) and the quote; dead before Krill loads ICHR here
export const FB_NAME = 'IFBT', FB_DRV_NAME = 'IDRV';
const FB_DRV_AT = 0x0402;            // buffer 1, after the sector's two link bytes
const FB_TIMEOUT = 120;              // jiffies (2 s) for the drive code to say it is alive
// WORST drive response, in DRIVE cycles (1 MHz), from CLK changing to DATA holding the bit: one
// pass of sendb's level-wait loop (bit/branch, 7) plus branch-not-taken and the store (2 + 4). The
// output byte is prepared BEFORE the wait, so nothing else sits on that path. (The first version
// polled for ANY change and computed the bit after seeing it: 41 cycles, and 0.8 KB/s overall.)
// buildDriveCode() asserts the loops still have this shape; the C64 delay is derived from it.
const FB_DRIVE_MAX = 7 + 2 + 4;
// ...and how long after a store the drive is WAITING again (contract part 2, see buildDriveCode):
// between the bits of a pair 12 cycles, across a pair 21 (dec/bne), across a BYTE 47 (fetch, set up).
// The C64's gaps between toggles must exceed response + prep: 13 + 21 = 34 mid-byte, 13 + 47 = 60
// across a byte -- each with the same 1.3x margin, in NTSC cycles (0.978 us).
const FB_DRIVE_PREP_MID = 21, FB_DRIVE_PREP_BYTE = 47;
// C64 sample delay after its toggle = 5*DLY + 5 cycles. NTSC is the FAST clock (0.978 us/cycle), so
// it is the tight case; a 1.5x margin also covers the line's slower RISE when the drive releases
// it (open collector, pull-up). DLY 3 -> 20 cycles = 19.6 us against 13. PAL only adds margin.
const FB_DLY = +(process.env.FBDLY ?? Math.ceil((FB_DRIVE_MAX * 1.5 / 0.978 - 5) / 5));   // FBDLY: margin tests only

// IDRV: 254 bytes executed at $0402 in the 1541. files = [{track, sector}...] in order.
//
// THE TIMING CONTRACT, both halves derived here and asserted against the assembled code:
//   1. RESPONSE: from the C64 toggling CLK to DATA holding the bit, at most FB_DRIVE_MAX. The C64
//      samples FB_DLY-derived cycles later.
//   2. READINESS: the drive must already be WAITING when the next toggle arrives -- otherwise it
//      sees the toggle late and answers late. The first version broke exactly here: it computed
//      each bit after seeing the toggle, called a subroutine per bit and per byte, and at a byte
//      boundary needed ~80 cycles before it was polling again, while the C64's fast path toggled
//      again after ~45. So the C64's gap between toggles (FB_GAP) must exceed the drive's worst
//      store-to-polling time (FB_DRIVE_PREP) plus its response.
// What makes both small: every byte starts with CLK RELEASED (the end-of-sector ack is TWO
// toggles, so each sector's toggle count is even and the level to wait for never needs choosing),
// the count rides in the buffer in front of the data so one loop sends both, and the bit loop is
// unrolled in pairs (wait-pulled, wait-released) with each bit's output prepared before its wait.
export function buildDriveCode(assemble, files) {
  const tab = files.flatMap(f => [f.track, f.sector]).concat([0]);
  const half = (wait, br) => `        ldy #$02                ; a 0 pulls DATA low...
        asl sbyte
        bcc ${wait}
        ldy #$00                ; ...a 1 releases it (the line reads high)
${wait}:  bit $1800
        ${br} ${wait}
        sty $1800`;
  const src = `        * = ${hx4(FB_DRV_AT)}
        sei                     ; no DOS IRQ while we own the bus (re-enabled only to read a sector)
        lda #$00
        sta $1800               ; release DATA and CLK
dw0:    lda $1800               ; the C64 releases CLK after its UNLISTEN; start from a quiet line
        and #$04
        bne dw0
        sta fidx
nfile:  ldx fidx
        lda ftab,x              ; track of the next file's first sector; 0 = no more files
        beq done
        sta $06
        lda ftab+1,x
        sta $07
        inx
        inx
        stx fidx
nsect:  jsr rdsec               ; $06/$07 -> $0300; rdsec keeps the link's sector byte in ns
        lda $0300
        sta nt                  ; ...and its track byte: 0 = this is the file's last sector
        ldy #$fe                ; a full sector carries 254 bytes...
        tax                     ;   (Z from the track again: ldy just changed it)
        bne cnt
        ldy $0301               ; ...the last one, up to the index in its link
        dey
cnt:    sty $0301               ; the COUNT goes out first, from the buffer, like any byte
        iny                     ; count + 1 bytes: the count itself, then the data
        sty count
        ldx #$01
        jsr sendn
        lda nt                  ; follow the chain
        beq eof
        sta $06
        lda ns
        sta $07
        jmp nsect
eof:    lda #$00                ; end of file: one byte, a count of 0
        sta $0301
        lda #$01
        sta count
        ldx #$01
        jsr sendn
        jmp nfile
done:   lda #$00
        sta $1800
        cli
        rts                     ; back to DOS: M-E called us, and Krill's install needs DOS next

rdsec:  lda #$80                ; READ job for buffer 0 ($0300): DOS's job loop runs it in its IRQ
        sta $00
        cli
rd1:    lda $00
        bmi rd1
        sei
        cmp #$01                ; 1 = OK; anything else, read it again
        bne rdsec
        lda $0301
        sta ns                  ; the link's sector byte, before the count overwrites it
        rts

        ; ---- send count bytes from $0300,X, then take the TWO-toggle ack ----
sendn:  lda #$02
        sta $1800               ; READY: DATA low
sn1:    lda $0300,x
        sta sbyte
        lda #$04                ; for bit: CLK IN is bit 2 of $1800, set while the line is pulled
        ldy #$04
        sty pairs
sn2:
${half('sw0', 'beq')}
${half('sw1', 'bne')}
        dec pairs
        bne sn2
        inx
        dec count
        bne sn1
aw0:    bit $1800               ; ack, toggle 1: the C64 has the last bit -- let go of DATA (BUSY)
        beq aw0
        ldy #$00
        sty $1800
aw1:    bit $1800               ; ack, toggle 2: back to released, so the next byte starts there
        bne aw1
        rts
ftab:   !byte ${tab.join(',')}
fidx:   !byte 0
count:  !byte 0
sbyte:  !byte 0
pairs:  !byte 0
nt:     !byte 0
ns:     !byte 0
`;
  const out = assemble(src);
  const bytes = [...out.bytes];
  if (bytes.length > 254) throw new Error(`IDRV is ${bytes.length} bytes; one sector holds 254`);
  // The contract's numbers come from these loops' SHAPES: each wait is "bit $1800 / branch / sty
  // $1800". If that changes, FB_DRIVE_MAX and FB_DRIVE_PREP are stale.
  for (const w of ['sw0', 'sw1'])
    if (bytes[out.labels[w] - FB_DRV_AT] !== 0x2c || bytes[out.labels[w] - FB_DRV_AT + 5] !== 0x8c)
      throw new Error(`${w} is no longer "bit $1800 / branch / sty $1800": recount the fastboot timing`);
  const padded = bytes.concat(Array(254 - bytes.length).fill(0));
  padded.labels = out.labels;            // for timing probes (FBLABELS)
  return padded;
}

// IFBT: the C64 side. drv = IDRV's {track, sector}; qshow = IQOT's show-only entry; step1/step2
// = the sweep's rates for THIS path's speed.
export function buildFastboot(assemble, drv, qshow, step1, step2) {
  // TWO digits always ("01"): DOS reads leading zeros fine, and a fixed width keeps IFBT's length
  // the same in both of the build's disk passes -- the pass that learns where IDRV landed must not
  // move it by growing a byte.
  const dec = n => [...String(n).padStart(2, '0')].map(c => c.charCodeAt(0)).join(',');
  const src = `        * = ${hx4(FASTBOOT_AT)}
cptr = $fb                      ; free zero page; swPant takes it over only once the sweep runs
ptr  = $fd                      ; the store pointer, as IQOT's KERNAL loop uses it
rbv  = $02                      ; the byte being received
        ; ---- 1. is it a 1541? M-R three bytes of the ROM's version string ----
        lda #$06
        ldx #<mrc
        ldy #>mrc
        jsr $ffbd               ; SETNAM: the command IS the filename of channel 15
        lda #$0f
        ldx $ba                 ; the device we booted from
        ldy #$0f
        jsr $ffba               ; SETLFS
        jsr $ffc0               ; OPEN: sends M-R
        bcs slowa
        ldx #$0f
        jsr $ffc6               ; CHKIN
        ldy #$00
        sty bad
chk:    jsr $ffcf               ; CHRIN
        cmp sig,y
        beq chk2
        inc bad
chk2:   iny
        cpy #$03
        bne chk
        jsr $ffcc               ; CLRCHN
        lda bad
        bne slow15
        ; ---- 2. channel 2 on buffer 1 ($0400), read IDRV into it, run it ----
        lda #$02
        ldx #<bufn
        ldy #>bufn
        jsr $ffbd
        lda #$02
        ldx $ba
        ldy #$02
        jsr $ffba
        jsr $ffc0               ; OPEN 2,dev,2,"#1"
        bcs slow2
        lda #<u1c
        ldx #>u1c
        ldy #u1e-u1c
        jsr cmd                 ; U1:2 0 t s -- IDRV into buffer 1
        lda #<mec
        ldx #>mec
        ldy #mee-mec
        jsr cmd                 ; M-E ${hx4(FB_DRV_AT)} -- and the drive is ours
        ; ---- 3. let go of the bus and wait for the drive to say READY (DATA low) ----
        lda $dd00
        and #$c7                ; ATN, CLK and DATA released; the VIC bank bits untouched
        sta $dd00
        lda $a2
        clc
        adc #${FB_TIMEOUT}
        sta tmo
        ; FIRST see DATA released: the end of the M-E command's own bus handshake can leave it low
        ; for a moment, and that would read as READY before the drive code has even started.
wh:     bit $dd00
        bmi wa
        lda $a2
        cmp tmo
        bne wh
        jmp slow2
wa:     bit $dd00
        bpl alive
        lda $a2
        cmp tmo
        bne wa
        jmp slow2               ; no answer: whatever ran, take the KERNAL road
        ; ---- 4. IQOT, show the quote, IRAY with the sweep running, then on to IRAY ----
alive:  lda #<rtsx
        sta tickv
        lda #>rtsx
        sta tickv+1
        jsr rfile               ; IQOT (packed quote) to $4000
        jsr ${hx4(qshow)}       ; quote up, sweep installed
        lda #$${(step1 & 255).toString(16)}
        sta ${hx4(SW_STEP)}
        lda #$${(step1 >> 8).toString(16)}
        sta ${hx4(SW_STEP + 1)}
        lda #$${(step2 & 255).toString(16)}
        sta ${hx4(SW_STEP2)}
        lda #$${(step2 >> 8).toString(16)}
        sta ${hx4(SW_STEP2 + 1)}
        lda #<${hx4(SW_TICK)}
        sta tickv
        lda #>${hx4(SW_TICK)}
        sta tickv+1
        jsr rfile               ; IRAY, a sweep tick per page
        lda $dd00
        and #$c7                ; leave CLK released for the KERNAL (the toggles may end low)
        sta $dd00
        lda #$02
        jsr $ffc3               ; CLOSE 2 -- the drive is back in DOS by now (IDRV returned)
        lda #$0f
        jsr $ffc3               ; CLOSE 15
        jmp ${hx4(IRAY_ENTRY)}

        ; ---- the KERNAL road: the boot as it was before fastboot ----
slow2:  lda #$02
        jsr $ffc3
slow15: jsr $ffcc
        lda #$0f
        jsr $ffc3
slowa:  lda #$04
        ldx #<qnm
        ldy #>qnm
        jsr $ffbd
        lda #$01
        ldx $ba
        ldy #$01
        jsr $ffba
        lda #$00
        jsr $ffd5               ; LOAD IQOT
        bcs slowx
        jmp ${hx4(QUOTE_RUN)}
slowx:  inc $d020
        jmp slowx

        ; ---- send a command on channel 15: A/X = string, Y = length ----
cmd:    sta cptr
        stx cptr+1
        sty clen
        ldx #$0f
        jsr $ffc9               ; CHKOUT
        ldy #$00
cm1:    lda (cptr),y
        jsr $ffd2               ; CHROUT
        iny
        cpy clen
        bne cm1
        jmp $ffcc               ; CLRCHN: UNLISTEN, and the drive runs the command

        ; ---- one file: [count, bytes...] per sector until a count of 0. The first two bytes are
        ; ---- the load address, as in any PRG.
rfile:  lda #$02
        sta hdr
rs:     bit $dd00               ; READY = DATA low
        bmi rs
        jsr rbyte
        sta cnt
        beq rend
rb:     jsr rbyte
        ldy hdr
        beq rst
        cpy #$02
        bne rh1
        sta ptr
        dec hdr
        jmp rnext
rh1:    sta ptr+1
        dec hdr
        jmp rnext
rst:    ldy #$00
        sta (ptr),y
        inc ptr
        bne rnext
        inc ptr+1
        jsr tickj               ; a page has arrived
rnext:  dec cnt
        bne rb
        jsr ack
        jmp rs
rend:   jmp ack

        ; ---- one byte: eight toggles of CLK, each answered on DATA ----
        ; The sample comes 5*${FB_DLY}+5 = ${5 * FB_DLY + 5} cycles after the toggle, against a drive that has
        ; answered within ${FB_DRIVE_MAX} us. Anything that delays this code only adds margin.
rbyte:  ldy #$04                ; BYTE GAP: the drive needs ~47 cycles after its last store to be
rb0:    dey                     ;   waiting again (it fetches the next byte), and the C64's fastest
        bne rb0                 ;   path back here -- after the count byte -- is only ~64
        ldx #$08
rb1:    lda $dd00
        eor #$10                ; toggle CLK
        sta $dd00
        ldy #${FB_DLY}
rb2:    dey
        bne rb2
        lda $dd00               ; bit 7 = DATA = the bit
        asl
        rol rbv
        nop                     ; BIT GAP: toggles must be > 34 drive cycles apart x1.3 margin;
        nop                     ;   these two make it 46 C64 cycles
        dex
        bne rb1
        lda rbv
        rts

        ; ---- the end-of-sector ack: TWO toggles, so each sector's toggle count is even and every
        ; byte starts with CLK released -- the drive never has to choose which level to wait for.
ack:    jsr tog
        ldy #${2 * FB_DLY}      ; the drive answers the first (releasing DATA: BUSY) before the second
ak1:    dey
        bne ak1
        jsr tog
        ldy #${2 * FB_DLY}
ak2:    dey
        bne ak2
        rts
tog:    lda $dd00
        eor #$10
        sta $dd00
        rts

tickj:  jmp (tickv)
rtsx:   rts

mrc:    !byte ${'M-R'.split('').map(c => c.charCodeAt(0)).join(',')},$c4,$e5,$03
sig:    !byte $31,$35,$34       ; "154"
bufn:   !byte $23,$31           ; "#1"
u1c:    !byte $55,$31,$3a,$32,$20,$30,$20,${dec(drv.track)},$20,${dec(drv.sector)}
u1e:
mec:    !byte $4d,$2d,$45,$${(FB_DRV_AT & 255).toString(16)},$${(FB_DRV_AT >> 8).toString(16)}
mee:
qnm:    !byte $49,$51,$4f,$54   ; "IQOT"
bad:    !byte 0
tmo:    !byte 0
clen:   !byte 0
hdr:    !byte 0
cnt:    !byte 0
tickv:  !word 0
`;
  const out = assemble(src);
  return { prg: out.prg, len: out.prg.length - 2, labels: out.labels };
}
