// cart-src.mjs -- LEST on an EasyFlash cartridge (lest-c64.crt), beside the disk (2026-11-15).
//
// WHY A CARTRIDGE. No one loader runs everywhere. Krill needs a real 1541 (or a cycle-exact
// emulation of one); an SD2IEC runs only the loaders its firmware knows, and Krill is not one of
// them, so on an SD2IEC the disk boot stops at "LEST NEEDS A 1541-COMPATIBLE DRIVE". An EasyFlash
// image runs on EasyFlash 3, Kung Fu Flash, the Ultimate 64 / 1541 Ultimate and every emulator --
// and loads faster than any disk.
//
// THE CARTRIDGE IS A FAST DISK, NOT A ROM GAME. Nothing executes in place. It holds the disk's
// own files, byte for byte (the same PRGs, minus their two-byte headers), and a loader that COPIES
// a file from the banks into RAM at its load address -- so the engine, the levels and the ending
// are exactly the disk's, and nothing in them knows which medium it came from.
//
// ONE SEAM MAKES THAT TRUE: every load in the game is `ldx #<name / ldy #>name / jsr $0400`, Krill's
// loadraw, and the engine never holds Krill itself. At its first start it PARKS whatever 251 bytes
// sit at $0400 (klPark -> krillRt) and copies them back before each load (llName); the ending's
// REBOOT calls $0400 directly. So this file's loader is a drop-in: assembled at $0400, at most 251
// bytes, Krill's calling convention -- X/Y = a zero-terminated name, carry clear on success, carry
// set and A = $ff (Krill's FILE NOT FOUND) if the name is not on the cartridge.
//
// THE CARTRIDGE LAYOUT. EasyFlash: 64 banks of 16K, each an 8K ROML ($8000) and an 8K ROMH ($a000
// in 16K mode, $e000 in Ultimax). $de00 selects the bank, $de02 the mode ($04 off, $07 16K, +$80 the
// LED).
//   bank 0 ROMH  the RESET stub. An EasyFlash powers up in Ultimax with bank 0, so the CPU's reset
//                vector is read from ROMH at $fffc. The stub switches to 16K mode and resets through
//                the KERNAL, which finds CBM80 at $8004 and enters the cartridge -- the ordinary way
//                in, with the KERNAL's own init then run by us (the PAL flag at $02a6 comes from it).
//   bank 0 ROML  the cold start, the DIRECTORY, the loader and the boot body (the last two copied to
//                RAM before anything is loaded: a bank switch makes ROM code vanish under itself).
//   banks 1..    the files, each starting on a page, running on through ROML then ROMH and on into
//                the next bank. A page-aligned start lets the loader's source be `lda $xx00,y`.
//
// THE COPY, AND THE GAME'S INTERRUPTS. The cartridge is visible only with $01 = $37 (ROML needs
// LORAM and HIRAM both up), which also maps the KERNAL in -- and with the KERNAL in, an IRQ goes
// through the KERNAL's vector, not the game's handler at $fffe in RAM; and anything the handler
// reads in $8000-$bfff would read cartridge bytes. So the loader copies ONE PAGE at a time with
// interrupts off, and between pages puts the machine back exactly as the caller had it (cartridge
// off, $01 restored, the caller's I flag) for one instruction, so a raster IRQ that came due runs
// late by at most a page (~3,600 cycles) and never sees the cartridge. Writes need nothing special:
// a store to a ROM address always goes to the RAM under it outside Ultimax, so a file loads into
// $8000-$bfff or $e000-$ffff through the very window it is being read from. ($d000-$dfff is I/O,
// as it is for Krill: no file loads there; the boot copies IHOL under it as the disk's boot does.)
//
// THE BOOT, presented as the disk's: the quote at power-on, then LEST, then level 1. On disk the
// quote's columns sweep grey2 -> grey3 as a progress bar; here everything loads in about a second, so
// there is no progress to show: the quote just HOLDS in its first colour, on a CLOCK (the user,
// 2026-11-15: timed, and skippable; then "just the first color"): QUOTE_S for the quote, TITLE_S
// for LEST. FIRE or SPACE skips ahead -- read exactly as the game reads them (dshFir: $dc00 = $7f,
// $dc01 bit 4), and only a FRESH press: a button already down at power-on skips nothing.

const hx2 = n => '$' + n.toString(16).padStart(2, '0');
const hx4 = n => '$' + n.toString(16).padStart(4, '0');

export const CART_LOADER = 0x0400, CART_LOADER_MAX = 251;   // the engine parks and restores 251 bytes
export const CART_BODY = 0x0500;     // above the loader, below IMG ($0801); nothing loads under it
const BODY_END = 0x0800;
const DIR = 0x8100;                  // bank 0 ROML: names (4 bytes each), then one array per field
const DIR_MAX = 63;                  // 4 * 63 names + the end marker fit one page, indexed by X
const F = { bnk: DIR + 0x100, src: DIR + 0x140, dlo: DIR + 0x180, dhi: DIR + 0x1c0,
            pgs: DIR + 0x200, rem: DIR + 0x240 };
const LD_ROM = 0x8400, BODY_ROM = 0x8500;   // where the cold start finds the two blobs it copies down
export const QUOTE_S = 8, TITLE_S = 2;      // seconds: the quote, then LEST
// ...and the END quote's hold (ending-src's holdS): on disk it is up while the tree loads, ~5 s, then
// 6 s more; here the tree is in at once, so the hold is all of it (the user, 2026-11-15: 11 s, skippable)
export const CART_END_HOLD_S = 11;
const EF_OFF = 0x04, EF_16K = 0x87;         // $de02: cartridge off / 16K mode with the LED on

// ---- the loader: Krill's loadraw, from the cartridge ----
const loaderSource = () => `        * = ${hx4(CART_LOADER)}
ld:     stx lnm+1               ; the name, into both compares (self-modifying: zero page is the
        sty lnm+2               ;   game's, every byte of it but Krill's $e0-$e6, and this needs none)
        stx lnm2+1
        sty lnm2+2
        php                     ; the caller's flags: its I bit is what the between-page window restores
        pla
        sta lfl
        sei
        lda $01
        sta lp1
        jsr lon                 ; bank 0: the directory
        lda #$00
        sta $de00
        tax
lsc:    lda ${hx4(DIR)},x       ; a zero first letter ends the directory
        beq lnf
        stx lbs
        ldy #$00
lcm:    lda ${hx4(DIR)},x
lnm:    cmp $ffff,y
        bne lnx
        cmp #$00                ; both names ended together: this one
        beq lfd
        inx
        iny
        cpy #$04
        bne lcm
lnm2:   lda $ffff,y             ; four letters alike: the name asked for must end there too
        beq lfd
lnx:    lda lbs
        clc
        adc #$04
        tax
        bne lsc                 ; (63 names at most: X cannot wrap before the end marker)
lnf:    jsr loff
        lda #$ff                ; FILE NOT FOUND, as Krill says it
        sec
        rts
lfd:    lda lbs
        lsr
        lsr
        tax                     ; the entry number indexes the field arrays
        lda ${hx4(F.bnk)},x
        sta lbk
        lda ${hx4(F.src)},x
        sta lsr+2
        lda ${hx4(F.dlo)},x
        sta ldt+1
        lda ${hx4(F.dhi)},x
        sta ldt+2
        lda ${hx4(F.pgs)},x
        sta lpg
        lda ${hx4(F.rem)},x
        sta lrm
lpl:    lda lbk
        sta $de00
        ldy #$00                ; a whole page (Y wraps to 0) unless this is the last and it is short
        lda lpg
        cmp #$01
        bne lfu
        ldy lrm
lfu:    sty lct+1
        ldy #$00
lsr:    lda $8000,y
ldt:    sta $ffff,y
        iny
lct:    cpy #$00
        bne lsr
        inc ldt+2
        inc lsr+2
        lda lsr+2
        cmp #$c0                ; off the top of ROMH: on into the next bank's ROML
        bne lnb
        lda #$80
        sta lsr+2
        inc lbk
lnb:    jsr loff                ; THE WINDOW: the machine as the caller had it, for one instruction,
        sei                     ;   so an IRQ that came due runs now, in the game's own handler
        jsr lon
        dec lpg
        bne lpl
        jsr loff
        lda #$00
        clc
        rts
loff:   lda #${hx2(EF_OFF)}
        sta $de02               ; cartridge off
        lda lp1
        sta $01
        lda lfl
        pha
        plp                     ; the caller's I flag (and the rest); the nop gives a pending IRQ its
        nop                     ;   instruction boundary before the sei that follows the return
        rts
lon:    lda #$37                ; ROML needs LORAM and HIRAM: the KERNAL comes in too, hence sei
        sta $01
        lda #${hx2(EF_16K)}
        sta $de02
        rts
lfl:    !byte 0
lp1:    !byte 0
lbs:    !byte 0
lbk:    !byte 0
lpg:    !byte 0
lrm:    !byte 0
`;

// ---- the boot body: the disk boot's order, from the cartridge, with the quote on a clock ----
function bodySource({ files, entry, palF, quote, title, hole }) {
  let step = 0;
  const load = f => `        lda #${hx2(++step)}
        sta $02                 ; which load is in flight, for the fail screen
        ldx #<n${f.tag}
        ldy #>n${f.tag}
        jsr ${hx4(CART_LOADER)}
        bcs fail`;
  const boot = files.filter(f => !f.runtime);
  const qd018 = (((quote.scr - 0xc000) >> 10) << 4) | (((quote.chr - 0xc000) >> 11) << 1);
  const td018 = title ? (((title.scr - 0xc000) >> 10) << 4) | (((title.chr - 0xc000) >> 11) << 1) : 0;
  return `        * = ${hx4(CART_BODY)}
${load({ tag: 'Q' })}
        lda $dd00
        and #$fc                ; VIC bank 3 (the CIA's bank lines are inverted)
        sta $dd00
        lda #${hx2(qd018)}
        sta $d018               ; screen ${hx4(quote.scr)}, charset ${hx4(quote.chr)}
        lda #$c8
        sta $d016               ; 40 columns, hi-res: the quote is a hi-res charset
        ldx #$00
        lda #$0c                ; grey2 over all of colour RAM, which the charset assumes
qcol:   sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne qcol
        lda #$1b
        sta $d011               ; the quote is up
${boot.filter(f => f.first).map(load).join('\n')}
        lda #$34                ; the HOLE LADDER under the I/O hole, as the disk's boot does it:
        sta $01                 ;   landed at ${hx4(hole.stage)}, copied to $d000 with the port at $34
        ldx #$00
hcp:${[...Array(hole.pages)].map((_, p) => `
        lda ${hx4(hole.stage + p * 256)},x
        sta ${hx4(0xd000 + p * 256)},x`).join('')}
        inx
        bne hcp
        lda ${hx4(hole.stage + hole.length - 1)}   ; and check it arrived, both ends
        cmp ${hx4(0xd000 + hole.length - 1)}
        bne hcpbad
        lda ${hx4(hole.stage + (hole.pages - 1) * 256)}
        cmp ${hx4(0xd000 + (hole.pages - 1) * 256)}
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
${boot.filter(f => !f.first && !f.last).map(load).join('\n')}
        ; ---- the quote's time: QUOTE_S seconds, one wait a second (a wait counts in a byte) ----
        lda #$00
        sta arm                 ; not armed until fire/SPACE is seen UP
        lda #${QUOTE_S}
        sta secs
qtL:    ldx #60                 ; a second: NTSC
        lda $02a6
        beq qtN
        ldx #50                 ; PAL
qtN:    txa
        jsr wait
        bcs qtDn                ; skipped
        dec secs
        bne qtL
qtDn:
${title ? `        ; ---- LEST: the display first, then its colours (the disk's swTitle) ----
        lda #${hx2(td018)}
        sta $d018               ; screen ${hx4(title.scr)}, charset ${hx4(title.chr)}, still bank 3
        lda #$35                ; the colours sit under the KERNAL ROM
        sta $01
        ldx #$00
${[...Array(Math.ceil(title.len / 256))].map((_, p) => {
  const n = Math.min(256, title.len - p * 256), dst = 0xd800 + 40 * title.row0 + p * 256;
  return `stc${p}:  lda ${hx4(title.col + p * 256)},x
        sta ${hx4(dst)},x
        inx
${n === 256 ? `        bne stc${p}` : `        cpx #${hx2(n)}
        bne stc${p}
        ldx #$00`}`; }).join('\n')}
        lda #$37
        sta $01
` : `        lda #$0b                ; no title: screen off for the files that land on the quote
        sta $d011
`}${boot.filter(f => f.last).map(load).join('\n')}
${title ? `        ldx #${TITLE_S * 60}
        lda $02a6
        beq ttN
        ldx #${TITLE_S * 50}
ttN:    txa
        jsr wait                ; LEST's time, skippable too
` : ''}        lda #$31                ; the KERNAL's own IRQ back, as the disk's boot leaves it
        sta $0314
        lda #$ea
        sta $0315
${palF ? `        lda $02a6               ; the KERNAL's PAL flag into the engine's palF, as the disk's boot does
        sta ${hx4(palF)}
` : ''}        cli
        jmp ${hx4(entry)}

; wait A frames; carry set = cut short by a FRESH fire/SPACE press
wait:   sta wn
wl1:    lda $d012               ; raster line 255 comes once a frame on both machines
        cmp #$ff
        bne wl1
wl2:    lda $d012
        cmp #$ff
        beq wl2
        lda #$7f                ; SPACE's column; joystick-1 fire pulls the same line (dshFir)
        sta $dc00
        lda $dc01
        ldx #$ff
        stx $dc00
        and #$10
        bne wup
        lda arm
        beq wnx                 ; still the press from before
        lda #$00
        sta arm                 ; the next wait wants a new press
        sec
        rts
wup:    lda #$01
        sta arm
wnx:    dec wn
        bne wl1
        clc
        rts

fail:   sta $03                 ; BORDER = the loader's status, BACKGROUND = which load, as on disk
        sta $d020
        lda $02
        sta $d021
        lda #$1b
        sta $d011
fstop:  jmp fstop

secs:   !byte 0
arm:    !byte 0
wn:     !byte 0
nQ:     !byte ${[...quote.name].map(c => c.charCodeAt(0)).join(',')},0
${boot.map(f => `n${f.tag}: !byte ${[...f.name].map(c => c.charCodeAt(0)).join(',')},0`).join('\n')}
`;
}

// ---- bank 0: the cold start (ROML) and the reset stub (ROMH) ----
const coldSource = (ldLen, bodyLen) => `        * = $8000
        !word cold              ; the KERNAL's reset jumps here once it has seen CBM80
        !word $febc             ; warm start (an NMI while bank 0 is mapped): the KERNAL's own return
        !byte $c3,$c2,$cd,$38,$30   ; CBM80
cold:   jsr $fda3               ; IOINIT
        jsr $fd50               ; RAMTAS
        jsr $fd15               ; RESTOR
        jsr $ff5b               ; CINT -- which also sets the PAL flag at $02a6
        sei
        lda #$0b                ; screen off and black, now: what IRUN does on disk
        sta $d011
        lda #$00
        sta $d020
        sta $d021
        sta $9d                 ; no KERNAL messages
        lda #$01
        sta $cc                 ; no cursor blink: its IRQ writes $0400, the loader's page
        ldx #$00
cl:     lda ${hx4(LD_ROM)},x    ; the loader to $0400 and the body above it: both must be in RAM
        sta ${hx4(CART_LOADER)},x  ;   before the first bank switch takes this ROM away
        inx
        cpx #${hx2(ldLen)}
        bne cl
${[...Array(Math.ceil(bodyLen / 256))].map((_, p) => {
  const n = Math.min(256, bodyLen - p * 256);
  return `        ldx #$00
cb${p}:    lda ${hx4(BODY_ROM + p * 256)},x
        sta ${hx4(CART_BODY + p * 256)},x
        inx
${n === 256 ? `        bne cb${p}` : `        cpx #${hx2(n)}
        bne cb${p}`}`; }).join('\n')}
        jmp ${hx4(CART_BODY)}
`;
// Ultimax at power-on: ROMH answers at $e000-$ffff and RAM only below $1000. The stub copies three
// instructions to the stack page and runs them there, because the store to $de02 that leaves Ultimax
// takes this ROM away from under the instruction after it.
const resetSource = () => `        * = $ff00
rst:    sei
        ldx #$ff
        txs
        cld
        ldx #$07
rc:     lda rs,x
        sta $0100,x
        dex
        bpl rc
        jmp $0100
rs:     lda #$07                ; 16K mode: ROML at $8000, the KERNAL at $e000
        sta $de02
        jmp ($fffc)             ; the KERNAL's reset, which finds CBM80 and enters cold
nmi:    rti
`;

// Where byte i of a file stored from (bank, off) sits IN THE .crt FILE: 64 bytes of header, then per
// bank a ROML and a ROMH CHIP packet, each 16 bytes of packet header and 8K of data. tools/rig.mjs
// patches a test rig's parameters into a copy of the cartridge with these, as it does a disk's.
export const crtOffset = (bank, off, i) => {
  const p = bank * 0x4000 + off + i, b = p >> 14, w = p & 0x3fff;
  return 64 + b * 2 * 0x2010 + (w >> 13) * 0x2010 + 16 + (w & 0x1fff);
};

// files: [{ tag, name, prg (with its two-byte header), first, last, runtime }], in the disk's order.
// Returns the .crt file's bytes and a summary.
export function buildCart(assemble, { files, entry, palF, quote, title, hole, name = 'LEST' }) {
  const all = [{ tag: 'Q', name: quote.name, prg: quote.prg }, ...files];
  if (all.length > DIR_MAX) throw new Error(`${all.length} files; the cartridge directory holds ${DIR_MAX}`);
  for (const f of all) if (!/^[A-Z0-9:]{1,4}$/.test(f.name)) throw new Error(
    `cart: file name "${f.name}" -- the directory keeps four letters, and the game's names are four`);
  if (new Set(all.map(f => f.name)).size !== all.length) throw new Error('cart: two files share a name');
  // Nothing may load over the loader or the boot body while it runs, or into the I/O hole.
  for (const f of all) {
    const at = f.prg[0] | (f.prg[1] << 8), end = at + f.prg.length - 2;
    if (end > 0xd000 && at < 0xe000) throw new Error(`cart: ${f.name} (${hx4(at)}-${hx4(end - 1)}) loads into the I/O hole`);
    if (!f.runtime && at < BODY_END && end > CART_LOADER) throw new Error(
      `cart: ${f.name} (${hx4(at)}-${hx4(end - 1)}) would land on the loader or the boot body (${hx4(CART_LOADER)}-${hx4(BODY_END - 1)})`);
  }
  // LEST must be in before the quote's time ends: the file that carries its glyphs cannot be one of the last
  if (title) { const t = files.find(f => { const a = f.prg[0] | (f.prg[1] << 8); return a <= title.chr && title.chr < a + f.prg.length - 2; });
    if (!t || t.last || t.runtime) throw new Error(`cart: the title's glyphs (${hx4(title.chr)}) are not in a file the boot loads before the title`); }
  const ld = assemble(loaderSource());
  if (ld.bytes.length > CART_LOADER_MAX) throw new Error(
    `cart: the loader is ${ld.bytes.length} bytes; the engine parks and restores ${CART_LOADER_MAX}`);
  const body = assemble(bodySource({ files, entry, palF, quote, title, hole }));
  if (CART_BODY + body.bytes.length > BODY_END) throw new Error(
    `cart: the boot body is ${body.bytes.length} bytes and runs past ${hx4(BODY_END - 1)} into IMG`);
  const cold = assemble(coldSource(ld.bytes.length, body.bytes.length));
  if (cold.end > DIR) throw new Error(`cart: the cold start runs to ${hx4(cold.end)}, into the directory`);
  const rst = assemble(resetSource());

  // ---- the banks ----
  const banks = [new Uint8Array(0x4000).fill(0xff)];
  const put = (b, addr, bytes) => banks[b].set(bytes, addr - 0x8000);
  put(0, 0x8000, cold.bytes);
  put(0, LD_ROM, ld.bytes);
  put(0, BODY_ROM, body.bytes);
  if (BODY_ROM + body.bytes.length > 0xa000) throw new Error('cart: bank 0 ROML overflows');
  // the reset stub lives at $ff00-$ffff of ROMH (Ultimax maps ROMH at $e000)
  const romh = new Uint8Array(0x2000).fill(0xff);
  if (rst.end > 0xfffa) throw new Error('cart: the reset stub runs into the vectors');
  romh.set(rst.bytes, 0x1f00);
  const { nmi, rst: reset } = rst.labels;   // $fffa NMI, $fffc RESET, $fffe IRQ (none is expected)
  romh.set([nmi & 255, nmi >> 8, reset & 255, reset >> 8, nmi & 255, nmi >> 8], 0x1ffa);
  banks[0].set(romh, 0x2000);
  const dir = new Uint8Array(0x300);
  let bank = 1, off = 0;                  // where the next file starts: bank, offset in its 16K
  all.forEach((f, i) => {
    const at = f.prg[0] | (f.prg[1] << 8), data = f.prg.slice(2), pages = Math.ceil(data.length / 256);
    [...f.name].forEach((c, k) => { dir[4 * i + k] = c.charCodeAt(0); });
    Object.assign(f, { bank, off, at, len: data.length });
    const fld = (k, v) => { dir[F[k] - DIR + i] = v; };
    fld('bnk', bank); fld('src', 0x80 + (off >> 8)); fld('dlo', at & 255); fld('dhi', at >> 8);
    fld('pgs', pages); fld('rem', data.length & 255);
    if (pages > 255) throw new Error(`cart: ${f.name} is ${pages} pages; the loader counts 255`);
    for (let p = 0; p < data.length; p += 256) {
      while (banks.length <= bank) banks.push(new Uint8Array(0x4000).fill(0xff));
      banks[bank].set(data.slice(p, p + 256), off);
      off += 256;
      if (off === 0x4000) { bank++; off = 0; }
    }
  });
  if (bank >= 64 || (bank === 63 && off)) throw new Error('cart: more than 64 banks');
  put(0, DIR, dir);

  // ---- the .crt file: a 64-byte header, then a CHIP packet per 8K ----
  const be32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const be16 = n => [(n >> 8) & 255, n & 255];
  const nm = [...name].map(c => c.charCodeAt(0)).concat(Array(32).fill(0)).slice(0, 32);
  const out = [...'C64 CARTRIDGE   '].map(c => c.charCodeAt(0))
    .concat(be32(0x40), be16(0x0100), be16(32 /* EasyFlash */), [1 /* EXROM */, 0 /* GAME */], Array(6).fill(0), nm);
  banks.forEach((b, k) => {
    for (const [half, load] of [[0, 0x8000], [1, 0xa000]]) {
      out.push(...'CHIP'.split('').map(c => c.charCodeAt(0)), ...be32(0x2010), ...be16(2 /* flash */),
               ...be16(k), ...be16(load), ...be16(0x2000), ...b.slice(half * 0x2000, half * 0x2000 + 0x2000));
    }
  });
  return { crt: Uint8Array.from(out), banks: banks.length, loaderLen: ld.bytes.length,
           labels: { ...ld.labels, ...body.labels },   // the loader's and the boot body's, for a monitor
           bodyLen: body.bytes.length, files: all.map(({ name, bank, off, at, len }) => ({ name, bank, off, at, len })) };
}
