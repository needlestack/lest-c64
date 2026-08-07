// Minimal pipeline probe: assemble a trivial color program, write a .d64.
import { readFileSync, writeFileSync } from 'fs';
import { assemble } from './asm6502.mjs';
await import('./d64lib.js');
const D64 = globalThis.D64;

const asm = `
        * = $0801
        !byte $0c,$08, $0a,$00, $9e, $32,$30,$36,$31, $00, $00,$00
entry:
        sei
        lda #$02
        sta $d020        ; border red
        lda #$06
        sta $d021        ; background blue
        ldx #$00
        lda #$a0         ; reverse-space glyph -> solid cells
fill:   sta $0400,x
        sta $0500,x
        sta $0600,x
        sta $0700,x
        inx
        bne fill
        lda #$01
        ldx #$00
cf:     sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne cf
loop:   jmp loop
`;
const r = assemble(asm);
writeFileSync('./min.prg', Buffer.from(r.prg));
const d = D64.createEmpty('MINTEST', '01');
d.writeFile('MIN'.padEnd(6) + '/PRG', r.prg, D64.FILE_TYPE_PRG);
writeFileSync('./min.d64', Buffer.from(d.getData()));
console.log(`ok: org=$${r.org.toString(16)} end=$${r.end.toString(16)} bytes=${r.bytes.length}`);
console.log('files: min.prg, min.d64');
