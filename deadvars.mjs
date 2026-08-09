// Every RAM variable in iray.asm, classified by whether anything reads it and whether anything
// writes it. Born from ocl2/ocmax (e83935a): the face-plane rewrite deleted the depth scan that
// SET them, but the repoint pass still READ them, so it walked a cell range out of whatever
// those two bytes of scratch RAM happened to hold -- flickering with the VIC bank, because the
// two screen buffers leave different rubbish behind.
//
// A dead write is conspicuous when you delete its consumer. A dead READ is invisible: the code
// still assembles, still runs, and quietly uses garbage. So the interesting column here is
// "read, never written".
//
//   node deadvars.mjs [iray.asm]
import { readFileSync } from 'fs';

const src = readFileSync(process.argv[2] ?? 'iray.asm', 'utf8').split('\n');

// Equates only -- these are the RAM variables. Labels are code addresses and not of interest.
const vars = new Map();                          // name -> {addr, reads:[], writes:[]}
const EQ = /^(\w+)\s*=\s*(\$[0-9a-fA-F]+)/;
for (const l of src) { const m = l.match(EQ); if (m) vars.set(m[1], { addr: m[2], reads: [], writes: [] }); }

const WRITE = new Set(['sta', 'stx', 'sty']);
const RMW   = new Set(['inc', 'dec', 'asl', 'lsr', 'rol', 'ror']);
const READ  = new Set(['lda', 'ldx', 'ldy', 'cmp', 'cpx', 'cpy', 'adc', 'sbc',
                       'and', 'ora', 'eor', 'bit']);

const labels = new Map();                        // name -> {line, refs, afterRts}
const refs = new Set();                          // every label named by a branch/jump/operand
// Pass 1 collects the labels. It has to run first: a data table is named by `lda rampT,x` long
// before its own definition line, and a single pass would not yet know rampT is a label at all
// -- which reported every table in the program as unreachable code.
{ let prevOp = '';
  for (const line of src) {
    if (EQ.test(line)) continue;
    const code = line.split(';')[0];
    const lab = code.match(/^([a-z]\w*):/i);
    if (lab) labels.set(lab[1], { line: src.indexOf(line) + 1,
                                  afterRts: ['rts', 'jmp', 'rti'].includes(prevOp) });
    const m = code.match(/^\s*(?:\w+:)?\s*([a-z]{3})\s+/);
    if (m) prevOp = m[1];
    else if (/^\s*(?:\w+:)?\s*(rts|rti)\s*$/.test(code)) prevOp = 'rts';
  }
}
let prevOp = '';
src.forEach((line, i) => {
  if (EQ.test(line)) return;
  const code = line.split(';')[0];               // a name in a comment is not a reference
  const lab = code.match(/^([a-z]\w*):/i);
  // A label nobody jumps to is dead only if control cannot fall into it either -- which is
  // exactly when the instruction before it does not continue. Fall-through markers like omNS
  // are not dead, and this is what keeps them out of the report.
  const m = code.match(/^\s*(?:\w+:)?\s*([a-z]{3})\s+(.+)$/);
  if (!m) { if (/^\s*(?:\w+:)?\s*(rts|rti)\s*$/.test(code)) prevOp = 'rts'; return; }
  const [, op, operand] = m;
  prevOp = op;
  // `lda #<foo` / `#>foo` takes foo's ADDRESS -- self-modifying code and pointer setup, not a
  // read of its contents. Counting those as reads is what made cwB/cbB look like dead reads.
  const addrOnly = /#[<>]/.test(operand);
  // `jmp (jv)` reads jv, and so does `sta (ppPtr),y` -- storing THROUGH a pointer reads the
  // pointer. Without this, every indirect dispatch vector and every scratch pointer reads as
  // write-only, and the next person deletes one.
  const indirect = /^\(/.test(operand.trim());
  for (const name of operand.matchAll(/\b([a-z]\w*)\b/gi)) {
    if (labels.has(name[1])) refs.add(name[1]);
    const v = vars.get(name[1]); if (!v || addrOnly) continue;
    if (indirect) v.reads.push(i + 1);
    else if (WRITE.has(op)) v.writes.push(i + 1);
    else if (RMW.has(op)) { v.reads.push(i + 1); v.writes.push(i + 1); }
    else if (READ.has(op)) v.reads.push(i + 1);
  }
});

const readNeverWritten = [], writtenNeverRead = [], untouched = [];
for (const [name, v] of vars) {
  if (v.reads.length && !v.writes.length) readNeverWritten.push([name, v]);
  else if (v.writes.length && !v.reads.length) writtenNeverRead.push([name, v]);
  else if (!v.reads.length && !v.writes.length) untouched.push([name, v]);
}
const show = (title, list, note) => {
  console.log(`\n${title}: ${list.length}${note ? '   -- ' + note : ''}`);
  for (const [n, v] of list)
    console.log(`  ${n.padEnd(9)} ${v.addr.padEnd(6)} ` +
      `reads ${v.reads.length ? 'line ' + v.reads.join(',') : 'none'}` +
      `  writes ${v.writes.length ? 'line ' + v.writes.join(',') : 'none'}`);
};
console.log(`${vars.size} RAM variables in ${process.argv[2] ?? 'iray.asm'}`);
show('READ, NEVER WRITTEN', readNeverWritten, 'each of these is an ocl2');
show('WRITTEN, NEVER READ', writtenNeverRead, 'dead stores, or a consumer that was deleted');
show('NEITHER', untouched, 'stale equates');

const orphan = [...labels].filter(([n, l]) => !refs.has(n) && l.afterRts);
console.log(`\nUNREACHABLE CODE: ${orphan.length}` +
  '   -- no branch names them and control cannot fall in');
for (const [n, l] of orphan) console.log(`  ${n.padEnd(9)} line ${l.line}`);
