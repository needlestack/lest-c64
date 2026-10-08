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
//   node tools/deadvars.mjs [iray.asm]
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
// ---- two more facts about this codebase, in the same spirit as the notes above ----
// cpChr copies the charsets from where the LOADER put them to where the VIC reads them, and both
// ends of that copy look like bugs from here:
//   chrSrc / chrSrcB  are read and never written, because the loader writes them -- they name
//                     emitted data, not scratch.
//   charset / charsetB are written and never read, because the VIC reads them, not the CPU. They
//                     sit under the I/O hole, where the CPU cannot read them at all in normal
//                     port mode.
// Exempting them keeps both columns at zero, which is the only state in which anyone keeps
// reading this tool's output.
// Read but never written BY THE CPU, because the LOADER is the writer. This used to be
// chrSrc/chrSrcB -- emitted charset data copied up by cpChr. Both are gone; the charset is a
// compressed segment the self-extracting loader decodes straight into $d000, so `charset` itself
// is now the entry. cpChr reads it to build the mirror. Sprites will join this list.
const LOADER_WRITES = new Set(['charset']);
const VIC_READS = new Set(['charset', 'charsetB']);
// Written by orbOne, read by nobody YET: the per-orb bounding box, index, variant and
// occluder-plane mask. These are the inputs the occlusion pass consumes, and that pass is
// deliberately not ported alongside the projection -- occlusion is being rebuilt as stamped
// foreground-black chars rather than the charset-twin scheme that used to read these. Kept
// declared rather than deleted so the next step has its inputs, and listed here rather than
// left as noise, because a dirty deadvars baseline hides the next real bug.
const OCCLUSION_PENDING = new Set(['obCL', 'obCR', 'obBL', 'obBR', 'obIX', 'obV', 'obOcc']);     // the VIC is the reader, not the CPU
for (const n of OCCLUSION_PENDING) { const i = writtenNeverRead.findIndex(e => e[0] === n);
  if (i >= 0) writtenNeverRead.splice(i, 1); }
for (const n of LOADER_WRITES) { const i = readNeverWritten.findIndex(e => e[0] === n);
  if (i >= 0) readNeverWritten.splice(i, 1); }
for (const n of VIC_READS) { const i = writtenNeverRead.findIndex(e => e[0] === n);
  if (i >= 0) writtenNeverRead.splice(i, 1); }
show('READ, NEVER WRITTEN', readNeverWritten, 'reads uninitialised RAM -- the bug this tool exists for');
show('WRITTEN, NEVER READ', writtenNeverRead, 'dead stores, or a consumer that was deleted');
show('NEITHER', untouched, 'stale equates');

const orphan = [...labels].filter(([n, l]) => !refs.has(n) && l.afterRts);
console.log(`\nUNREACHABLE CODE: ${orphan.length}` +
  '   -- no branch names them and control cannot fall in');
for (const [n, l] of orphan) console.log(`  ${n.padEnd(9)} line ${l.line}`);

// ---- instructions stranded after an unconditional transfer ----
// The scan above enumerates LABELS, so it is structurally blind to code that has no label at
// all. That is exactly what the old orb painter's step 3 died of: a `bcc` naming the label AFTER the
// opmn/opmx stores, leaving those stores sitting between a `jmp` and the next label. Nothing
// could reach them, opmn/opmx kept their initial 39/0, and step 3 returned on its first
// compare -- no wall was painted foreground in any frame, for months. A label check cannot
// see it; walking the instruction stream can. This family has bitten twice (see also the
// `opFront` fall-through), which is why it is worth a standing check rather than a comment.
//
// Once control cannot arrive, everything stays unreachable until a LABEL reopens it -- so the
// dead flag persists across following instructions rather than being recomputed from each.
// A build flag that switches a block off by emitting an unconditional `jmp` over it is
// deliberate, not a bug -- a flag that disables a fast path does exactly that. Mark those `jmp`s DEADCODE-OK and the
// block they skip stays quiet, because a check that always prints the same known lines is one
// people stop reading, which is how the real bug survived in the first place.
const DIRECTIVE = /^\s*(?:!|\*\s*=)/;       // data / origin: not part of the instruction stream
const UNCOND = new Set(['jmp', 'rts', 'rti']);
const stranded = [];
let expected = 0;
{
  let dead = false, ok = false;
  src.forEach((line, i) => {
    if (EQ.test(line)) return;
    const code = line.split(';')[0];
    if (!code.trim()) return;                       // blank or comment-only line
    if (DIRECTIVE.test(code)) { dead = false; return; }
    if (/^([a-z]\w*):/i.test(code)) { dead = false; ok = false; }   // a label can be branched to
    const m = code.match(/^\s*(?:\w+:)?\s*([a-z]{3})\b/i);
    if (!m) return;
    if (dead) { if (ok) expected++; else stranded.push([i + 1, code.trim()]); }
    else if (UNCOND.has(m[1].toLowerCase())) { dead = true; ok = /DEADCODE-OK/.test(line); }
  });
}
console.log(`\nSTRANDED INSTRUCTIONS: ${stranded.length}` +
  '   -- after a jmp/rts/rti with no label between, so nothing can reach them' +
  (expected ? `   (${expected} more skipped by a DEADCODE-OK jmp)` : ''));
for (const [ln, text] of stranded) console.log(`  line ${String(ln).padStart(5)}  ${text}`);
