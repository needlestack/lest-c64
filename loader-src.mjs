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

export const LOADER_RUN = 0x0620;
const krillPrg = n => [...readFileSync(`./krill/${n}`)];
const krillAt = p => p[0] | (p[1] << 8);
const KRILL_RES_PRG = krillPrg('loader-c64.prg'), KRILL_INST_PRG = krillPrg('install-c64.prg');
const KRILL_RES = KRILL_RES_PRG.slice(2), KRILL_INST = KRILL_INST_PRG.slice(2);
// $0980 is NOT Krill's default install address ($1000) -- krill/build.sh must be given the same
// one, and krill/loaderconfig.inc is the config it builds against. The installer sits inside the
// boot PRG, which is the one file loaded at KERNAL speed (~290 B/s), so every byte between the
// stub's end and the installer's start is dead air on the loading screen: at the default it was
// 654 bytes = 2.3 seconds of nothing.
const KRILL_RESIDENT = 0x0400, KRILL_INSTALL = 0x0960;
// Where the KERNAL's screen goes so that install() cannot print on Krill's resident at $0400 --
// and, just as important, cannot print on the QUOTE. $cc00 is the 1K above IHOL in bank 3 and is
// exactly the 1000 bytes a screen needs; buildLoader guards that IHOL never grows into it.
const KSCR = 0xcc00;
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
    `krill/${name} is assembled for $${krillAt(prg).toString(16)} but loader-src.mjs expects ` +
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

function bodySource(files, entry, pages, first) {
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
` : ''}        bcs fail`;
  const names = files.map(f => `n${f.tag}: !byte ${petscii(f.name)},0`).join('\n');
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
` : ''}${files.filter(f => f.first).map(load).join('\n')}
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
        lda $${(0xc000 + p * 256).toString(16)},x
        sta $${(0xd000 + p * 256).toString(16)},x`).join('')}
        inx
        bne hcp
        ; ...and CHECK it arrived. A wrong stride is silent at every later stage, so compare the
        ; two ends of the ladder while the port is still at $34 and $d000 is still RAM.
        lda $${(0xc000 + first.length - 1).toString(16)}
        cmp $${(0xd000 + first.length - 1).toString(16)}
        bne hcpbad
        lda $${(0xc000 + (pages - 1) * 256).toString(16)}
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
${files.filter(f => !f.first && !f.last).map(load).join('\n')}
        lda #$0b                ; screen OFF: the last two files land on the quote, and black is
        sta $d011               ;   a better last frame than the picture coming apart
${files.filter(f => f.last).map(load).join('\n')}
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
export function buildLoader(assemble, files, entry) {
  const first = files.find(f => f.first);
  const holePages = Math.ceil((first.length ?? 2048) / 256);
  if (holePages > 16) throw new Error(`the file under the I/O hole is ${first.length} bytes; the hole is 4K`);
  if (0xc000 + holePages * 256 > KSCR) throw new Error(
    `${first.name} is ${first.length} bytes at $c000 and reaches ${hx4(0xc000 + holePages * 256 - 1)}, ` +
    `into the KERNAL's scratch screen at ${hx4(KSCR)} that install() prints on. Move KSCR ` +
    `(loader-src.mjs) -- and note it needs 1000 contiguous bytes clear of every boot-time load.`);
  const body = assemble(bodySource(files, entry, holePages, first));
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
export function buildQuote(assemble, q, irayName) {
  const d018 = (((QUOTE_SCR - 0xc000) >> 10) << 4) | (((QUOTE_CHR - 0xc000) >> 11) << 1);
  if (q.decr.at !== EXO_CODE) throw new Error(
    `the decruncher in quote-screen.json is assembled for ${hx4(q.decr.at)} but this build puts ` +
    `it at ${hx4(EXO_CODE)}. Re-run make-quote.mjs -- the bytes are position-dependent.`);
  // The fetcher is hand-placed at EXO_GETBYTE because the decruncher calls it by absolute address,
  // baked in when acme assembled it. Its last instruction's OPERAND is the read pointer, so the
  // two bytes that qrun writes are inside the code, at a fixed offset. Both are checked below.
  const qbLo = EXO_GETBYTE + 12;
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
qrun:   sei                     ; ${hx4(QUOTE_SCR)} is under the KERNAL ROM, so the ROM comes out -- and
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

        lda #$04
        ldx #<nr
        ldy #>nr
        jsr $ffbd
        lda #$01
        ldx #$08
        ldy #$01
        jsr $ffba
        lda #$00
        jsr $ffd5               ; the 3.8 K of Krill, behind the quote
        bcs qstop
        jmp ${hx4(IRAY_ENTRY)}
qstop:  inc $d020
        jmp qstop
nr:     !byte ${petscii(irayName)}
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
  return { prg: out.prg, len: out.prg.length - 2 };
}
