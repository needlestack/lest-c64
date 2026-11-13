// sidtrace.mjs -- run a gt2reloc PRG (player at $4000: init $4000, play $4003) on a small 6502 core and
// print every SID write, frame by frame. Two songs that sound the same give the same trace -- the check that
// song-pack.mjs, BEATLOOP and CLOOP change nothing you hear.
//   ~/goattracker2/linux/gt2reloc song.sng song.prg -N -D1 -G423.87 -W40 -Z80
//   node tools/sidtrace.mjs song.prg frames > trace.txt          (frames at 60 a second; default 3600)
import { readFileSync } from 'node:fs';
const [f, nf = 3600] = process.argv.slice(2);
const prg = readFileSync(f), M = new Uint8Array(65536);
const load = prg[0] | prg[1] << 8; M.set(prg.subarray(2), load);
let A = 0, X = 0, Y = 0, S = 0xff, P = 0x24, PC = 0, writes = [];
const rd = a => M[a & 0xffff];
const wr = (a, v) => { a &= 0xffff; if (a >= 0xd400 && a <= 0xd41c) writes.push(((a - 0xd400) << 8) | v); M[a] = v; };
const C = 1, Z = 2, I = 4, D = 8, B = 16, V = 64, N = 128;
const nz = v => { P = (P & ~(N | Z)) | (v & N) | (v ? 0 : Z); return v; };
const push = v => { M[0x100 | S] = v; S = (S - 1) & 0xff; }, pop = () => (S = (S + 1) & 0xff, M[0x100 | S]);
const w16 = a => rd(a) | rd(a + 1) << 8;
// addressing modes return an address (imm returns PC of the operand)
const am = {
  imp: () => -1, acc: () => -1, imm: () => PC++,
  zp: () => rd(PC++), zpx: () => (rd(PC++) + X) & 0xff, zpy: () => (rd(PC++) + Y) & 0xff,
  abs: () => { const a = w16(PC); PC += 2; return a; }, abx: () => { const a = w16(PC); PC += 2; return (a + X) & 0xffff; },
  aby: () => { const a = w16(PC); PC += 2; return (a + Y) & 0xffff; },
  izx: () => { const z = (rd(PC++) + X) & 0xff; return rd(z) | rd((z + 1) & 0xff) << 8; },
  izy: () => { const z = rd(PC++); return ((rd(z) | rd((z + 1) & 0xff) << 8) + Y) & 0xffff; },
  ind: () => { const a = w16(PC); PC += 2; return rd(a) | rd((a & 0xff00) | ((a + 1) & 0xff)) << 8; },
  rel: () => { const o = rd(PC++); return (PC + (o < 128 ? o : o - 256)) & 0xffff; },
};
const adc = v => { if (P & D) throw new Error('decimal mode');
  const r = A + v + (P & C); P = (P & ~(C | V)) | (r > 0xff ? C : 0) | ((~(A ^ v) & (A ^ r) & 0x80) ? V : 0); A = nz(r & 0xff); };
const cmp = (r, v) => { const t = r - v; P = (P & ~C) | (t >= 0 ? C : 0); nz(t & 0xff); };
const br = (a, c) => { if (c) PC = a; };
const rmw = (a, fn) => { if (a < 0) A = fn(A); else wr(a, fn(rd(a))); };
const ops = {
  LDA: a => A = nz(rd(a)), LDX: a => X = nz(rd(a)), LDY: a => Y = nz(rd(a)),
  STA: a => wr(a, A), STX: a => wr(a, X), STY: a => wr(a, Y),
  ADC: a => adc(rd(a)), SBC: a => adc(rd(a) ^ 0xff),
  AND: a => A = nz(A & rd(a)), ORA: a => A = nz(A | rd(a)), EOR: a => A = nz(A ^ rd(a)),
  CMP: a => cmp(A, rd(a)), CPX: a => cmp(X, rd(a)), CPY: a => cmp(Y, rd(a)),
  BIT: a => { const v = rd(a); P = (P & ~(N | V | Z)) | (v & (N | V)) | (A & v ? 0 : Z); },
  INC: a => wr(a, nz((rd(a) + 1) & 0xff)), DEC: a => wr(a, nz((rd(a) - 1) & 0xff)),
  INX: () => X = nz((X + 1) & 0xff), INY: () => Y = nz((Y + 1) & 0xff),
  DEX: () => X = nz((X - 1) & 0xff), DEY: () => Y = nz((Y - 1) & 0xff),
  ASL: a => rmw(a, v => { P = (P & ~C) | (v >> 7); return nz((v << 1) & 0xff); }),
  LSR: a => rmw(a, v => { P = (P & ~C) | (v & 1); return nz(v >> 1); }),
  ROL: a => rmw(a, v => { const c = P & C; P = (P & ~C) | (v >> 7); return nz(((v << 1) | c) & 0xff); }),
  ROR: a => rmw(a, v => { const c = P & C; P = (P & ~C) | (v & 1); return nz((v >> 1) | (c << 7)); }),
  TAX: () => X = nz(A), TAY: () => Y = nz(A), TXA: () => A = nz(X), TYA: () => A = nz(Y),
  TSX: () => X = nz(S), TXS: () => S = X,
  PHA: () => push(A), PLA: () => A = nz(pop()), PHP: () => push(P | B | 0x20), PLP: () => P = pop() | 0x20,
  CLC: () => P &= ~C, SEC: () => P |= C, CLI: () => P &= ~I, SEI: () => P |= I, CLV: () => P &= ~V,
  CLD: () => P &= ~D, SED: () => P |= D, NOP: () => {},
  BPL: a => br(a, !(P & N)), BMI: a => br(a, P & N), BVC: a => br(a, !(P & V)), BVS: a => br(a, P & V),
  BCC: a => br(a, !(P & C)), BCS: a => br(a, P & C), BNE: a => br(a, !(P & Z)), BEQ: a => br(a, P & Z),
  JMP: a => PC = a, JSR: a => { const r = (PC - 1) & 0xffff; push(r >> 8); push(r & 0xff); PC = a; },
  RTS: () => { PC = ((pop() | pop() << 8) + 1) & 0xffff; }, RTI: () => { P = pop() | 0x20; PC = pop() | pop() << 8; },
  BRK: () => { throw new Error('BRK at ' + (PC - 1).toString(16)); },
};
// the official opcode map
const T = new Array(256);
const def = (s) => s.trim().split(/\s+/).forEach(e => { const [o, n, m] = e.split(':'); T[parseInt(o, 16)] = [n, m]; });
def(`00:BRK:imp 01:ORA:izx 05:ORA:zp 06:ASL:zp 08:PHP:imp 09:ORA:imm 0a:ASL:acc 0d:ORA:abs 0e:ASL:abs
10:BPL:rel 11:ORA:izy 15:ORA:zpx 16:ASL:zpx 18:CLC:imp 19:ORA:aby 1d:ORA:abx 1e:ASL:abx
20:JSR:abs 21:AND:izx 24:BIT:zp 25:AND:zp 26:ROL:zp 28:PLP:imp 29:AND:imm 2a:ROL:acc 2c:BIT:abs 2d:AND:abs 2e:ROL:abs
30:BMI:rel 31:AND:izy 35:AND:zpx 36:ROL:zpx 38:SEC:imp 39:AND:aby 3d:AND:abx 3e:ROL:abx
40:RTI:imp 41:EOR:izx 45:EOR:zp 46:LSR:zp 48:PHA:imp 49:EOR:imm 4a:LSR:acc 4c:JMP:abs 4d:EOR:abs 4e:LSR:abs
50:BVC:rel 51:EOR:izy 55:EOR:zpx 56:LSR:zpx 58:CLI:imp 59:EOR:aby 5d:EOR:abx 5e:LSR:abx
60:RTS:imp 61:ADC:izx 65:ADC:zp 66:ROR:zp 68:PLA:imp 69:ADC:imm 6a:ROR:acc 6c:JMP:ind 6d:ADC:abs 6e:ROR:abs
70:BVS:rel 71:ADC:izy 75:ADC:zpx 76:ROR:zpx 78:SEI:imp 79:ADC:aby 7d:ADC:abx 7e:ROR:abx
81:STA:izx 84:STY:zp 85:STA:zp 86:STX:zp 88:DEY:imp 8a:TXA:imp 8c:STY:abs 8d:STA:abs 8e:STX:abs
90:BCC:rel 91:STA:izy 94:STY:zpx 95:STA:zpx 96:STX:zpy 98:TYA:imp 99:STA:aby 9a:TXS:imp 9d:STA:abx
a0:LDY:imm a1:LDA:izx a2:LDX:imm a4:LDY:zp a5:LDA:zp a6:LDX:zp a8:TAY:imp a9:LDA:imm aa:TAX:imp ac:LDY:abs ad:LDA:abs ae:LDX:abs
b0:BCS:rel b1:LDA:izy b4:LDY:zpx b5:LDA:zpx b6:LDX:zpy b8:CLV:imp b9:LDA:aby ba:TSX:imp bc:LDY:abx bd:LDA:abx be:LDX:aby
c0:CPY:imm c1:CMP:izx c4:CPY:zp c5:CMP:zp c6:DEC:zp c8:INY:imp c9:CMP:imm ca:DEX:imp cc:CPY:abs cd:CMP:abs ce:DEC:abs
d0:BNE:rel d1:CMP:izy d5:CMP:zpx d6:DEC:zpx d8:CLD:imp d9:CMP:aby dd:CMP:abx de:DEC:abx
e0:CPX:imm e1:SBC:izx e4:CPX:zp e5:SBC:zp e6:INC:zp e8:INX:imp e9:SBC:imm ea:NOP:imp ec:CPX:abs ed:SBC:abs ee:INC:abs
f0:BEQ:rel f1:SBC:izy f5:SBC:zpx f6:INC:zpx f8:SED:imp f9:SBC:aby fd:SBC:abx fe:INC:abx`);
const call = (addr, a = 0) => { A = a; S = 0xfd; M[0x1fe] = 0xff; M[0x1ff] = 0xff; PC = addr; let n = 0;   // returns to $0000 via RTS
  while (PC !== 0) { const op = rd(PC++), t = T[op]; if (!t) throw new Error(`opcode ${op.toString(16)} at ${(PC - 1).toString(16)}`);
    ops[t[0]](am[t[1]]()); if (++n > 1e6) throw new Error('runaway'); } };
call(0x4000, 0);
const out = [];
for (let fr = 0; fr < nf; fr++) { writes = []; call(0x4003); out.push(fr + ': ' + writes.map(w => (w >> 8).toString(16).padStart(2, '0') + '=' + (w & 0xff).toString(16).padStart(2, '0')).join(' ')); }
console.log(out.join('\n'));
