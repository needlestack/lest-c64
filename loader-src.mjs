// ---- the boot loader ----
// A tiny PRG you RUN, which pulls every other file straight to where it belongs. No compression,
// no staging area, no in-place decode -- and therefore none of the DUPLICATION that had the
// packed image existing twice in RAM at once and the load budget 156 bytes from the wall.
// The old scheme cost two bytes of headroom per packed byte, which is why it ran out.
//
// Two hardware facts set the shape:
//   * KERNAL LOAD runs with I/O MAPPED, so it physically CANNOT write $d000-$dfff. The charset
//     is landed in bank 3 at $c000 first and copied under the hole with the port at $34.
//   * The image covers $0801-$bfff, which includes this stub. So the body relocates itself into
//     bank 3's free tail and runs from there while the image lands on top of where it started.
// Hence the order: charset to $c000, copy it away, THEN the orb ladder over the top of it.
// $cd00, not $cf00 (2026-09-16). At $cf00 the body had exactly 256 bytes before the I/O hole at
// $d000, and it was ALREADY 264 -- the last filename sat in VIC registers and loaded by luck. The
// fifth disk file (ILVL) pushed it to 300, the name 'ILVL' landed on $d011 (the raster control
// register), SETNAM read back one garbage byte, and the disk asked for a file called 'I'. The
// program never started. IPIC ends at $cce8, so $cd00 is the lowest page above it: 768 bytes.
// $0400 (2026-09-16). The loader has to EXECUTE with the KERNAL mapped in -- it calls LOAD through
// $ffd5 -- so it needs RAM that reads as RAM under port $37: below $e000 and outside the I/O
// hole. It ran at $cd00 in bank 3 while the charsets were under the hole; with the charsets at
// $c000-$cfff (the user's rule: bank 3 is for what the VIC reads, and the CPU's writes there are
// for the VIC) that page is spoken for, and bank 3 has nowhere else that the KERNAL can execute.
// $0400-$07ff is the renderer's scratch -- stackLT, sideT, idT, colH -- written every frame and
// LOADED BY NOTHING, so the loader can run there and be overwritten by the first frame. It is
// also the KERNAL's screen while BASIC is up, which is why the body first clears the message
// flag at $9d: a "SEARCHING FOR" line scrolled through the code would be a very short run.
export const LOADER_RUN = 0x0400;
                                    // and runs to $cc7f, which used to land straight on the
                                    // loader body and drop the machine back to BASIC
const hx4 = n => '$' + n.toString(16).padStart(4, '0');
const petscii = s => [...s].map(c => c.charCodeAt(0)).join(',');

function bodySource(files, entry, pages) {
  const load = f => `
        lda #${f.name.length}
        ldx #<n${f.tag}
        ldy #>n${f.tag}
        jsr $ffbd               ; SETNAM
        lda #$01
        ldx dev
        ldy #$01                ; secondary 1: the file's own header says where it goes
        jsr $ffba               ; SETLFS
        lda #$00
        jsr $ffd5               ; LOAD
        bcs fail`;
  return `        * = ${hx4(LOADER_RUN)}
        lda #$00                ; no KERNAL messages: this code IS the screen
        sta $9d
        lda $ba                 ; load from whatever drive we came off
        cmp #$04
        bcs devok
        lda #$08
devok:  sta dev
${files.filter(f => f.first).map(load).join('\n')}
        sei                     ; the HOLE LADDER goes under the I/O hole: it lands at $c000 (the
        lda #$34                ;   only place LOAD can put it), then $c000 -> $d000 with the port
                                ;   at $34. The charsets used to take this trip; they live at
                                ;   $c000/$c800 now, plain RAM, and load straight there AFTER this
                                ;   copy has vacated $c000 (2026-09-16).
        sta $01
        ldx #$00
chr:${[...Array(pages)].map((_, p) => `
        lda $${(0xc000 + p * 256).toString(16)},x
        sta $${(0xd000 + p * 256).toString(16)},x`).join('')}
        inx
        bne chr
        lda #$37                ; KERNAL back in for the remaining loads
        sta $01
        cli
${files.filter(f => !f.first && !f.runtime).map(load).join('\n')}
        jmp ${hx4(entry)}
fail:   inc $d020               ; nothing sensible to do, so at least be obvious about it
        jmp fail
dev:    !byte $08
${files.filter(f => !f.runtime).map(f => `n${f.tag}: !byte ${petscii(f.name)}`).join('\n')}
`;
}

// Returns the PRG bytes for the stub: BASIC header, a copy loop that lifts the body into
// bank 3, and the body itself as data.
export function buildLoader(assemble, files, entry) {
  // How many pages the first file (the one that goes under the I/O hole) needs copied: its
  // length rounded up. It is the hole ladder now; it was the 2K charset.
  const first = files.find(f => f.first);
  const holePages = Math.ceil((first.length ?? 2048) / 256);
  if (holePages > 16) throw new Error(`the file under the I/O hole is ${first.length} bytes; the hole is 4K`);
  const body = assemble(bodySource(files, entry, holePages));
  // The body runs at LOADER_RUN with the port at $37 -- I/O mapped -- so anything of it past $d000
  // is written to and read from VIC/SID/CIA registers, not RAM. Fail here, not on the C64.
  if (LOADER_RUN + body.bytes.length > 0x0800) throw new Error(
    `the boot loader is ${body.bytes.length} bytes and runs past $0800 from ` +
    `$${LOADER_RUN.toString(16)}, into the image it is about to load`);
  const pages = Math.ceil(body.bytes.length / 256);
  const copy = [...Array(pages)].map((_, p) =>
    `        lda body+${p * 256},x\n        sta ${hx4(LOADER_RUN + p * 256)},x`).join('\n');
  const stub = `        * = $0801
        !byte $0b,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
        ldx #$00
cpy:
${copy}
        inx
        bne cpy
        jmp ${hx4(LOADER_RUN)}
body:   !byte ${[...body.bytes].join(',')}
`;
  return { prg: assemble(stub).prg, bodyLen: body.bytes.length };
}
