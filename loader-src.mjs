// ---- the boot loader ----
// A tiny PRG you RUN, which pulls every other file straight to where it belongs. No compression,
// no staging area, no in-place decode -- and therefore none of the DUPLICATION that had the
// packed image existing twice in RAM at once and the load budget 156 bytes from the wall.
// See iray-memory-map: the old scheme cost two bytes of headroom per packed byte.
//
// Two hardware facts set the shape:
//   * KERNAL LOAD runs with I/O MAPPED, so it physically CANNOT write $d000-$dfff. The charset
//     is landed in bank 3 at $c000 first and copied under the hole with the port at $34.
//   * The image covers $0801-$bfff, which includes this stub. So the body relocates itself into
//     bank 3's free tail and runs from there while the image lands on top of where it started.
// Hence the order: charset to $c000, copy it away, THEN the orb ladder over the top of it.
export const LOADER_RUN = 0xcb00;
const hx4 = n => '$' + n.toString(16).padStart(4, '0');
const petscii = s => [...s].map(c => c.charCodeAt(0)).join(',');

function bodySource(files, entry) {
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
        lda $ba                 ; load from whatever drive we came off
        cmp #$04
        bcs devok
        lda #$08
devok:  sta dev
${files.filter(f => f.first).map(load).join('\n')}
        sei                     ; charset under the I/O hole: $c000 -> $d000, 2K, port $34
        lda #$34
        sta $01
        ldx #$00
chr:    lda $c000,x
        sta $d000,x
        lda $c100,x
        sta $d100,x
        lda $c200,x
        sta $d200,x
        lda $c300,x
        sta $d300,x
        lda $c400,x
        sta $d400,x
        lda $c500,x
        sta $d500,x
        lda $c600,x
        sta $d600,x
        lda $c700,x
        sta $d700,x
        inx
        bne chr
        lda #$37                ; KERNAL back in for the remaining loads
        sta $01
        cli
${files.filter(f => !f.first).map(load).join('\n')}
        jmp ${hx4(entry)}
fail:   inc $d020               ; nothing sensible to do, so at least be obvious about it
        jmp fail
dev:    !byte $08
${files.map(f => `n${f.tag}: !byte ${petscii(f.name)}`).join('\n')}
`;
}

// Returns the PRG bytes for the stub: BASIC header, a copy loop that lifts the body into
// bank 3, and the body itself as data.
export function buildLoader(assemble, files, entry) {
  const body = assemble(bodySource(files, entry));
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
