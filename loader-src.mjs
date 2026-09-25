// ---- the boot loader ----
// A tiny PRG you RUN, which installs KRILL'S LOADER and then pulls every other file straight to
// where it belongs. No compression, no staging area, no in-place decode.
//
// WHAT ONE KERNAL LOAD HAS TO CARRY. A fast loader cannot load itself, so the autostart PRG is
// the bootstrap and everything in it arrives at ~290 bytes/sec: the BASIC header, this body,
// Krill's 531-byte resident and its 7,056-byte install routine. That is ~26 seconds on a real
// drive, and it is why there is a quote on the screen for it. Everything AFTER install() runs at
// Krill's ~7 KB/s, which takes the other 50 KB from 170 seconds to 7.
//
// THE MEMORY MAP THIS FORCES, all of it below $0801 so the 46 KB image cannot land on it:
//   $0400-$0612  Krill's resident. It only has to survive the boot: the first rendered frame
//                writes stackLT over it, and nothing loads again until the hub needs levels 5-7,
//                which is not built. That is why it costs no permanent RAM at all.
//   $0620-$07ff  this body.
//   $0c00        Krill's install routine, inside the PRG image, overwritten later by IMG.
// The PRG therefore spans $0801 to $0c00 + 7,056, and the copy loop at $0801 lifts the resident
// and this body into place underneath it before jumping here.
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
const KRILL_RESIDENT = 0x0400, KRILL_INSTALL = 0x0c00;
// WHERE THE RESIDENT'S BYTES WAIT. They cannot simply be copied to $0400 by the stub and left
// there: $0400 is the default SCREEN, and install() calls KERNAL routines that write to it. The
// README says this for "below $0400"; it is just as true AT $0400, and the symptom was loadraw
// returning $f0 -- not a status at all, because it was not loadraw any more. So the bytes ride
// in the PRG above the install routine and the BODY copies them down once install has finished.
const KRILL_RESDATA = 0x2800;
// Krill's two binaries, PRG files with a 2-byte load address we drop: the resident is placed by
// our copy loop, the install routine is simply part of the image at KRILL_INSTALL.
const krill = n => [...readFileSync(`./krill/${n}`)].slice(2);
const KRILL_RES = krill('loader-c64.prg'), KRILL_INST = krill('install-c64.prg');

const hx4 = n => '$' + n.toString(16).padStart(4, '0');
const petscii = s => [...s].map(c => c.charCodeAt(0)).join(',');

// The quote screen: a charset and a 40x25 map in VIC bank 3, shown for the whole load. It is the
// only place either can live -- IMG owns $0801-$bfff and there is nothing below it -- so it sits
// where IPIC and ILVL eventually land, and those two go LAST, behind a blanked screen.
export const QUOTE_SCR = 0xf400, QUOTE_CHR = 0xf800;

function bodySource(files, entry, pages, quote) {
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
        lda #$0b
        sta $d011               ; screen off: what follows is not worth showing

        ; ---- GET THE SCREEN OUT OF $0400 BEFORE ANYTHING ELSE ----
        ; Krill's resident has to be in place BEFORE install(), because install PATCHES it with
        ; what it finds on the bus -- copying it afterwards gets a resident that has never been
        ; told which drive it is talking to, and loadraw returns $f0, which is not a status at
        ; all. But $0400 is the default SCREEN, and install calls KERNAL routines that write
        ; there. Both are true at once, so the screen has to move.
        ; It goes where the quote is about to land: VIC bank 3, screen $f400. $0288 is how the
        ; KERNAL knows where to write, and CLRSCR rebuilds the line pointers it has already
        ; cached in $d1/$d2 -- without that a print still goes to the old address.
        lda $dd00
        and #$fc                ; %00 = bank 3. The CIA's bank lines are inverted.
        sta $dd00
        lda #${'$' + ((((QUOTE_SCR - 0xc000) >> 10) << 4) | (((QUOTE_CHR - 0xc000) >> 11) << 1)).toString(16)}
        sta $d018               ; screen ${hx4(QUOTE_SCR)}, charset ${hx4(QUOTE_CHR)}
        lda #${'$' + (QUOTE_SCR >> 8).toString(16)}
        sta $0288
        jsr $e544               ; CLRSCR

        ldx #$00                ; now the resident, with $0400 no longer the screen
rcp0:   lda ${hx4(KRILL_RESDATA)},x
        sta ${hx4(KRILL_RESIDENT)},x
        lda ${hx4(KRILL_RESDATA + 256)},x
        sta ${hx4(KRILL_RESIDENT + 256)},x
        inx
        bne rcp0
        ldx #$00
rcp1:   lda ${hx4(KRILL_RESDATA + 512)},x
        sta ${hx4(KRILL_RESIDENT + 512)},x
        inx
        cpx #${'$' + (KRILL_RES.length & 255).toString(16).padStart(2, '0')}
        bne rcp1

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
` : ''}${quote ? `${load(quote)}
        ; ---- the quote, for the twenty-six seconds the bootstrap just cost ----
        lda #$c8                ; the bank and $d018 were set before install, to move the
                                ;   KERNAL's screen off $0400 -- see above
        sta $d016
        lda #$00
        sta $d020
        sta $d021
        ldx #$00
qcol:   lda #$0c                ; grey2 over the whole of colour RAM, which the charset assumes
        sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne qcol
        lda #$1b
        sta $d011               ; and on
${process.env.BOOTDBG === 'quote' ? `qdbg:   jmp qdbg        ; BOOTDBG: stop here with the quote on screen
` : ''}` : ''}${files.filter(f => f.first).map(load).join('\n')}
        sei                     ; the HOLE LADDER goes under the I/O hole: it lands at $c000 (the
        lda #$34                ;   only place a loader with I/O mapped can put it), then
        sta $01                 ;   $c000 -> $d000 with the port at $34.
        ldx #$00
hcp:${[...Array(pages)].map((_, p) =>
    `\n        lda $c0${p.toString(16).padStart(2, '0')},x\n        sta $d0${p.toString(16).padStart(2, '0')},x`).join('')}
        inx
        bne hcp
        lda #$37
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
${quote ? `n${quote.tag}: !byte ${petscii(quote.name)},0` : ''}
`;
}

// Returns the PRG bytes for the stub: BASIC header, a copy loop that lifts Krill's resident and
// the body into place below $0801, the two as data, and Krill's install routine at KRILL_INSTALL.
export function buildLoader(assemble, files, entry, quote) {
  const first = files.find(f => f.first);
  const holePages = Math.ceil((first.length ?? 2048) / 256);
  if (holePages > 16) throw new Error(`the file under the I/O hole is ${first.length} bytes; the hole is 4K`);
  const body = assemble(bodySource(files, entry, holePages, quote));
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
  const stub = `        * = $0801
        !byte $0b,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
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
