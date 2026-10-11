// compact.mjs -- relayout the image into three sections and report the gap.
//
//   ENGINE CODE   grows UP   from $0801
//   DATA TABLES   grow DOWN  from $c000 (VIC bank 3 is graphics and is not in the image)
//   between them: one contiguous arena, which is the whole point of the exercise.
//
// This produces a build that ASSEMBLES, not one that runs: nothing here fixes code that depends
// on where it sits. It exists to answer "how much contiguous room is there", which cannot be
// answered by adding up free bytes -- today's 6K of free space is ~40 fragments, and the largest
// is 178 bytes.
//
// Method: the assembler emits statements in SOURCE order, so a contiguous run of emitted bytes
// ends exactly where an origin directive moves the cursor. Reconstruct those runs from the
// listing, classify each as code or data, then rewrite the Nth origin directive with the Nth
// run's new address. Labels resolve wherever they land, so nothing else in the source changes.
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { assemble } from './asm6502.mjs';
// Every path is relative to THIS file's directory, never absolute and never the cwd: a clone (or a
// renamed checkout) must build in place, and an absolute path once made a clone's build read and
// write the original checkout's files without a word.
const ROOT = new URL('../build/', import.meta.url).pathname;   // compaction's inputs and outputs

// The source is the file the BUILD JUST WROTE, handed over as argv[2] -- not a fixed name.
// Hardcoding iray.asm meant that on a DIAGNOSTIC build, which writes iray.diag.asm so it cannot
// clobber the tracked reference copy, compaction read the PREVIOUS non-diagnostic build's
// assembly and the disk was built from that. Every DIAG flag -- PROFILE, PX/PY/PA --
// therefore shipped a program that was not the one it had just generated. It is why the profiler
// appeared to vanish, why two ROUTE builds with and without entities measured identically (they
// were the same stale image), and why the build prints "not for fps numbers" on a DIAG build --
// a symptom someone recorded without finding the cause.
const SRC = process.argv[2] || ROOT + 'iray.asm';
const OUT = ROOT + 'iray.compact.asm';
const ORG = 0x0801, CEIL = 0xc000;

// ---- 0. ZERO PAGE: promote the most-referenced RAM buffers, BEFORE anything is measured ----
// Every free zero-page byte is worth bytes of CODE: an instruction that names a zero-page operand
// is one byte shorter than the absolute form (and a cycle faster). For SPACE, then, the measure is
// how many instructions name a buffer, per byte of zero page it needs -- a reference count, not a
// profile. (The profiler already put the HOT variables here; this fills what it left.)
// It runs first because it changes the size of the code: every later step measures the program
// with these buffers already in zero page.
// What counts as a saving: an instruction AFTER the equate's definition (the assembler sizes a
// forward reference as absolute), in a mode that HAS a zero-page form -- plain, or ,x for all but
// ldx/stx/cpx/cpy/bit, or ,y for ldx/stx only. `lda buf,y` still works from zero page (absolute,y
// with a zero high byte) but saves nothing.
// What is never moved:
//   - a buffer whose address is taken with < or > -- code that builds a pointer, or assumes two
//     buffers share a page, should not have its page changed under it;
//   - a buffer named by an instruction that is itself PATCHED (`label+1` / `label+2` written
//     elsewhere): a zero-page operand is one byte, so `label+2` would become the next opcode;
//   - a buffer that must be page-aligned or must not cross a page (iray.aligned.json);
//   - anything not exactly sized: an INDEXED buffer the build does not declare a size for, since
//     a zero-page ,x read WRAPS within page zero where the absolute one ran on.
// Free zero page: every byte no zero-page equate or literal operand claims, minus Krill's
// resident range (it runs during play, loading levels in the background). An indexed zero-page
// equate is taken to own every byte up to the next one, since its length is not declared.
// The KERNAL's own zero-page use ($90-$fa) is BOOT-TIME only: it is banked out before the game
// runs, and nothing calls it after. ZPALLOC=0 turns this pass off.
const zpAlloc = text => {
  if (process.env.ZPALLOC === '0') return text;
  const L = text.split('\n');
  const readJ = f => JSON.parse(readFileSync(ROOT + f, 'utf8'));
  const DECL = readJ('iray.bufsizes.json'), ALN = readJ('iray.aligned.json');
  const krill = readFileSync(new URL('../krill/loadersymbols-c64.inc', import.meta.url), 'utf8');
  const kz = k => parseInt(new RegExp(`^${k}\\s*=\\s*\\$([0-9a-fA-F]+)`, 'm').exec(krill)[1], 16);
  const MNEM = /^\s*(?:[A-Za-z_]\w*:)?\s*(adc|and|asl|bit|cmp|cpx|cpy|dec|eor|inc|lda|ldx|ldy|lsr|ora|rol|ror|sbc|sta|stx|sty|jmp|jsr)\s+(.*)$/i;
  const code = L.map(l => l.split(';')[0]);
  // equates: RAM buffers (4 hex digits, inside the image's range) and existing zero page
  const ram = new Map(), zpEq = new Map();
  code.forEach((l, i) => {
    const m = /^([A-Za-z_]\w*)\s*=\s*\$([0-9a-fA-F]+)\s*$/.exec(l.trim());
    if (!m) return;
    const v = parseInt(m[2], 16);
    if (m[2].length === 4 && v >= ORG && v < CEIL && !ram.has(m[1])) ram.set(m[1], { a: v, def: i });
    else if (v < 0x100 && !zpEq.has(m[1])) zpEq.set(m[1], v);
  });
  // ---- who names what, and how ----
  const st = new Map([...ram.keys()].map(n => [n, { save: 0, max: 0, idx: false, bad: false }]));
  const zpUse = new Set();                         // zero-page bytes claimed beyond the equates themselves
  const zpIdx = new Set();                         // zero-page equates used indexed
  const patched = new Set();
  for (const l of code) for (const m of l.matchAll(/\b([A-Za-z_]\w*)\s*\+\s*([12])\b/g)) patched.add(m[1]);
  code.forEach((l, i) => {
    for (const m of l.matchAll(/[<>]\s*\(?\s*([A-Za-z_]\w*)/g)) if (st.has(m[1])) st.get(m[1]).bad = true;
    const ins = MNEM.exec(l);
    if (!ins) return;
    const op = ins[1].toLowerCase(), opd = ins[2].trim();
    const lab = /^\s*([A-Za-z_]\w*):/.exec(l)?.[1];
    if (opd.startsWith('#')) return;
    const ind = /^\(\s*([^),]+?)\s*\)?\s*(,\s*[xy])?\s*\)?\s*(,\s*[yY])?$/.exec(opd);
    if (opd.startsWith('(')) {                     // (zp),y / (zp,x): the pointer's two bytes
      const e = ind?.[1] ?? '';
      const lit = /^\$([0-9a-fA-F]{1,2})$/.exec(e);
      const v = lit ? parseInt(lit[1], 16) : zpEq.get(e);
      if (v !== undefined && op !== 'jmp') { zpUse.add(v); zpUse.add(v + 1); }
      return;
    }
    const m = /^([A-Za-z_]\w*|\$[0-9a-fA-F]+)\s*(?:([+-])\s*(\$?[0-9a-fA-F]+))?\s*(?:,\s*([xyXY]))?$/.exec(opd);
    if (!m) return;
    const off = m[3] ? (m[2] === '-' ? -1 : 1) * parseInt(m[3].replace('$', ''), m[3][0] === '$' ? 16 : 10) : 0;
    const ix = m[4]?.toLowerCase();
    if (m[1][0] === '$') {                         // a literal zero-page operand claims its byte
      const v = parseInt(m[1].slice(1), 16);
      if (m[1].length <= 3 && v + off < 0x100) zpUse.add(v + off);
      return;
    }
    if (zpEq.has(m[1])) { zpUse.add(zpEq.get(m[1]) + off); if (ix) zpIdx.add(m[1]); return; }
    const s = st.get(m[1]);
    if (!s) return;
    if (op === 'jmp' || op === 'jsr' || (lab && patched.has(lab))) { s.bad = true; return; }
    s.max = Math.max(s.max, off);
    if (ix) s.idx = true;
    const shrinks = !ix ? !['jmp', 'jsr'].includes(op)
      : ix === 'x' ? !['ldx', 'stx', 'cpx', 'cpy', 'bit'].includes(op)
      : ['ldx', 'stx'].includes(op);
    if (shrinks && i > ram.get(m[1]).def) s.save++;
  });
  // ---- free zero page ----
  const used = new Set([0, 1, ...zpEq.values(), ...zpUse]);
  for (let a = kz('loader_zp_first'); a <= kz('loader_zp_last'); a++) used.add(a);
  const zpSorted = [...new Set(zpEq.values())].sort((a, b) => a - b);
  for (const n of zpIdx) {                         // an indexed zero-page buffer: up to the next equate
    const a = zpEq.get(n), next = zpSorted.find(v => v > a) ?? 0x100;
    for (let k = a; k < next; k++) used.add(k);
  }
  const free = [];
  for (let a = 2; a < 0x100; a++) if (!used.has(a)) free.push(a);
  // ---- candidates, one buffer each ----
  // Step 5 moves runs of ADJACENT buffers together, because it cannot tell which adjacency the code
  // relies on. Here it can: a buffer that is never indexed is touched only at its own +0..+max
  // offsets, so nothing reaches it through a neighbour and it moves alone. An indexed buffer must
  // have a DECLARED size (iray.bufsizes.json) to move at all. And EVERY buffer in the unbroken run
  // that follows an undeclared indexed one stays put: its reach is exactly what nobody declared.
  // omEn is the case: one masked loop over omEn,x clears omEn/omXX/omYY/omPri/omX8 at a fall, so
  // those four "scalars" are really omEn's tail -- promoting them broke the loop (2026-10-10).
  const sorted = [...ram].sort((x, y) => x[1].a - y[1].a);
  const sizeOf = n => DECL[n] ?? (st.get(n).idx ? null : st.get(n).max + 1);
  const cand = [];
  let tail = false;                                // inside an undeclared indexed buffer's run
  sorted.forEach(([n, { a }], k) => {
    const size = sizeOf(n), prev = sorted[k - 1];
    const prevEnd = prev ? prev[1].a + (sizeOf(prev[0]) ?? 0) : -1;
    if (size === null) { tail = true; return; }
    if (tail && !(prev && sizeOf(prev[0]) === null) && a !== prevEnd) tail = false;
    if (tail || st.get(n).bad || ALN[n] !== undefined) return;
    cand.push({ m: [{ n, size }], a, size, save: st.get(n).save });
  });
  if (process.env.ZPWHY) for (const n of process.env.ZPWHY.split(','))
    console.log(`  zpwhy ${n}: ${JSON.stringify(st.get(n))} size ${st.get(n) && sizeOf(n)} candidate ${cand.some(c => c.m[0].n === n)}`);
  cand.splice(0, cand.length, ...cand.filter(c => c.save > c.size && c.size <= 16)
    .sort((x, y) => y.save / y.size - x.save / x.size || y.save - x.save));
  // ---- place: best ratio first, each into the smallest free run it fits ----
  const freeSet = new Set(free), placed = [];
  const runOf = (a, n) => { for (let k = 0; k < n; k++) if (!freeSet.has(a + k)) return false; return true; };
  for (const c of cand) {
    const at = free.filter(a => freeSet.has(a) && runOf(a, c.size))
      .sort((x, y) => { const len = a => { let k = 0; while (freeSet.has(a + k)) k++; return k; }; return len(x) - len(y) || x - y; })[0];
    if (at === undefined) continue;
    for (let k = 0; k < c.size; k++) freeSet.delete(at + k);
    placed.push({ ...c, at });
  }
  const rename = new Map();
  for (const c of placed) { let o = c.at; for (const x of c.m) { rename.set(x.n, o); o += x.size; } }
  // ---- zero them at power-on, as the image used to ----
  // Emitted at the build's @ZPCLEAR marker. Not a store per promoted byte -- they are scattered
  // over ~25 runs and that came to ~140 bytes -- but one loop over ALL of zero page from $02 up,
  // skipping only Krill's live range ($00/$01 are the CPU port). The bytes it clears beyond the
  // promoted ones are the build's own zero-page variables, which nothing has written yet at
  // power-on either: zero is as good a starting value as whatever the boot chain left there,
  // and it is the same one every time.
  const k0 = kz('loader_zp_first'), k1 = kz('loader_zp_last');
  const clr = !rename.size ? [] : [
    '        lda #$00                ; ZPCLEAR: zero page from $02, all but the loader\'s',
    '        ldx #$02',
    `zpcLp:  cpx #$${k0.toString(16)}`,
    '        bcc zpcSt',
    `        cpx #$${(k1 + 1).toString(16)}`,
    '        bcc zpcNx               ; Krill\'s range: its resident is live during play',
    'zpcSt:  sta $00,x',
    'zpcNx:  inx',
    '        bne zpcLp'];
  const mk = L.findIndex(l => l.startsWith('; @ZPCLEAR'));
  if (mk < 0 && rename.size) throw new Error('compact: buffers promoted to zero page but no ; @ZPCLEAR marker to zero them at');
  if (mk >= 0) L.splice(mk, 1, L[mk], ...clr);
  const out = L.map(l => {
    const m = /^([A-Za-z_]\w*)(\s*=\s*)\$[0-9a-fA-F]{4}\b/.exec(l);
    return m && rename.has(m[1]) ? l.replace(/\$[0-9a-fA-F]{4}/, '$' + rename.get(m[1]).toString(16).padStart(2, '0')) : l;
  });
  const saved = placed.reduce((t, c) => t + c.save, 0), spent = placed.reduce((t, c) => t + c.size, 0);
  console.log(`  ZERO PAGE     ${placed.length} buffers (${spent} B of ${free.length} free) promoted: ~${saved} B of code saved` +
              `, ${freeSet.size} B left`);
  if (process.env.ZPSHOW) console.log('  ' + placed.map(c => `${c.m.map(x => x.n).join('+')}=$${c.at.toString(16)}(${c.save})`).join(' '));
  return out.join('\n');
};
const src = zpAlloc(readFileSync(SRC, 'utf8'));
const lines = src.split('\n');

// ---- MEASURE IN A LAYOUT THAT CANNOT FAIL ----
// The relayout used to assemble the source AS WRITTEN to measure it, which meant the hand-placed
// layout had to fit before compaction could rescue it -- exactly backwards, and it broke the
// moment the engine was sized for seven levels (overlap at $6b00). So the measuring pass strips
// every origin instead: everything emits back to back from $0801, which always assembles, and
// the only thing read from it is each statement's SIZE and whether it is code or data.
// Run boundaries then come from the SOURCE (which origin a statement follows), not from
// addresses -- which is why the assembler now records a line number per statement.
const orgLines = [];
lines.forEach((l, i) => { const m = /^\s*\* *= *\$([0-9a-fA-F]+)/.exec(l); if (m) orgLines.push({ i, at: parseInt(m[1], 16) }); });
const stripped = lines.map((l, i) => (i === orgLines[0].i || !/^\s*\* *= *\$/.test(l)) ? l : `; [origin removed for measurement]`);
const r = assemble(stripped.join('\n'));

const isCode = s => /^\s*(adc|and|asl|bcc|bcs|beq|bit|bmi|bne|bpl|brk|bvc|bvs|clc|cld|cli|clv|cmp|cpx|cpy|dec|dex|dey|eor|inc|inx|iny|jmp|jsr|lda|ldx|ldy|lsr|nop|ora|pha|php|pla|plp|rol|ror|rti|rts|sbc|sec|sed|sei|sta|stx|sty|tax|tay|tsx|txa|txs|tya)\b/i.test(s);

// ---- 1. runs, grouped by the origin each statement follows ----
// ALIGNMENT COMES FROM THE BUILD, not from "it happens to sit on a page today". That inference
// only worked while the hand layout existed. iray.aligned.json is the map the build's own
// page-boundary guard is authoritative for; a run that STARTS with one of those tables must start
// on a page.
// THE BUILD'S PUBLISHED FACTS ARE REQUIRED. These reads used to sit in silent try/catch blocks, so a
// missing file quietly degraded the layout -- alignment guessed from addresses, no hot-loop padding,
// and with no iray.reserve.json scratch could be placed ON the level region. build-iray.mjs writes all
// of them immediately before running this, so a missing one is a real fault: say so and stop.
const need = f => {
  try { return JSON.parse(readFileSync(ROOT + f, 'utf8')); }
  catch (e) { console.error(`compact: cannot read ${f} (${e.message}) -- run it via build-iray.mjs, which writes it`); process.exit(1); }
};
const ALIGNED = need('iray.aligned.json');
// HOT LOOPS, also from the build: each must sit inside one page (see step 3's re-measure).
const HOTLOOPS = need('iray.hotloops.json');
const labelLine = new Map();          // first source line that defines each label
lines.forEach((l, i) => { const m = /^([a-zA-Z][a-zA-Z0-9_]*):/.exec(l); if (m && !labelLine.has(m[1])) labelLine.set(m[1], i); });
// a run must begin where an origin is, and also at any table the build says must be page-aligned
const boundary = new Set(orgLines.map(o => o.i));
for (const n of Object.keys(ALIGNED)) if (labelLine.has(n)) boundary.add(labelLine.get(n));
const alignAtLine = new Map();
for (const n of Object.keys(ALIGNED)) if (labelLine.has(n)) alignAtLine.set(labelLine.get(n), n);

const runs = [];
let cur = null;
for (const e of r.listing) {
  if (!e.len) continue;
  const ln = e.ln - 1;                                    // listing line numbers are 1-based
  let startsHere = !cur;
  for (let k = (cur ? cur.lastLn + 1 : 0); k <= ln; k++) if (boundary.has(k)) startsHere = true;
  if (startsHere) { cur = { fromLn: ln, len: 0, code: 0, data: 0, aligned: false, names: [] }; runs.push(cur); }
  // does an aligned table open this run?
  for (const [l2, n] of alignAtLine) if (l2 <= ln && (cur.fromLn <= l2) && !cur.names.includes(n)) { cur.aligned = true; cur.names.push(n); }
  cur.lastLn = ln; cur.lastSrc = e.src; cur.len += e.len;
  if (isCode(e.src)) cur.code += e.len; else cur.data += e.len;
}
// (The size-based merge that used to be here is GONE. It compared each origin's original address
// against `origin + measured size`, but the sizes come from the STRIPPED layout, where branches
// that used to cross a hole are back in range and assemble three bytes shorter. So it merged runs
// that were never contiguous -- gluing a data table to the code after it, which then classified as
// CODE by majority and put `clmp16` in the code section, unaligned. A merge rule that can be wrong
// is worse than no merge: the boundaries are only safe if every one of them is.)
// ---- A RUN THAT FALLS THROUGH INTO THE NEXT CANNOT BE SEPARATED FROM IT ----
// This engine uses fall-through between routines deliberately ("fall through to lvlHi", bgCopy
// into snapCp). If a boundary lands on one, the two halves must stay adjacent AND in the same
// section -- and if the second happens to classify as data, it goes to the other end of the image
// and control walks straight into a table. That is the $1e77 jam, inside sMaxT.
// The test needs no addresses and no sizes: if the last emitted statement before a boundary is an
// instruction that is NOT an unconditional exit, control reaches the next byte, so merge.
const EXIT = /^\s*(rts|rti|jmp|brk)\b/i;
{
  const merged = [];
  for (const b of runs) {
    const prev = merged[merged.length - 1];
    if (prev && !b.aligned && prev.lastSrc && EXIT.test(prev.lastSrc) === false && /^\s*[a-z]{3}\b/i.test(prev.lastSrc)) {
      prev.len += b.len; prev.code += b.code; prev.data += b.data;
      prev.lastLn = b.lastLn; prev.lastSrc = b.lastSrc; prev.origEnd = b.origEnd;
      continue;
    }
    merged.push(b);
  }
  console.log(`  fall-through merges: ${runs.length} runs -> ${merged.length}`);
  runs.length = 0; runs.push(...merged);
}
// A run OPENED BY AN ALIGNED TABLE IS DATA, whatever the majority says. Splitting there is what
// gets the table onto a page, but the run then runs on into whatever follows -- and if that is
// code, majority-vote sent the whole thing to the code section and the table lost its alignment.
// `clmp16` landed at $3b52, unaligned, and the build's own page-boundary guard caught it.
for (const b of runs) b.isCode = b.aligned ? false : (b.code >= b.data);

// ---- PHASE-LOCK THE CYCLE-EXACT CODE ----
// The raster handler dispatches on $d012 and must land its `sta $d018` before the VIC's fetch
// point for the line -- its own comment records two extra cycles once being enough to break it.
// A taken branch that crosses a page costs one cycle, and which branches cross depends entirely on
// where the code sits. Relocating it freely is what left the chain dead after eight frames: not a
// crash, just a handler that stopped hitting its line.
// So the run holding it keeps its PAGE PHASE -- the same `at & 255` it had -- which makes every
// page boundary inside it fall exactly where it did, and the cycle counts identical rather than
// merely close. Costs up to 255 bytes of padding, which the scratch placement then fills.
const PHASELOCK = ['irq'];
{
  let orig = null;
  try { orig = assemble(src); } catch { /* the hand layout may not assemble; then we cannot lock */ }
  if (orig) {
    const atOfLine = new Map();
    for (const e of orig.listing) if (e.len && !atOfLine.has(e.ln - 1)) atOfLine.set(e.ln - 1, e.at);
    for (const name of PHASELOCK) {
      const ln = labelLine.get(name);
      if (ln === undefined) continue;
      const b = runs.find(x => x.fromLn <= ln && ln <= x.lastLn);
      const a0 = atOfLine.get(b?.fromLn);
      if (b && a0 !== undefined) { b.phase = a0 & 255; console.log(`  phase-locked ${name}'s run to $..${b.phase.toString(16).padStart(2, '0')}`); }
    }
  } else console.error('  phase-lock SKIPPED: the source as written does not assemble');
}

// ---- 3-4. ASSIGN, EMIT, AND RE-MEASURE UNTIL THE SIZES STOP MOVING ----
// A run's SIZE depends on where it is put. The assembler promotes an out-of-range branch to
// `inverse-branch + jmp`, 2 bytes to 5, so moving code changes how much of it there is -- and the
// measuring pass runs in a stripped layout where everything sits closer together and fewer
// branches promote. Measure once and every size is potentially short, so runs land where the
// final assembly does not end. An identity build proved it: 3 bytes differed, one promoted branch
// after `subFin`.
// So: assign from the current sizes, emit, assemble THAT, re-measure the runs in the layout they
// actually got, and go again until nothing changes. Same fixpoint the packer needs for its holes,
// and for the same reason -- a measurement taken in a layout that is not the one that ships is an
// approximation.
let out, lines2, codeEnd, dataStart, PAD, code, data, settled = false;
for (let pass = 0; pass < 6 && !settled; pass++) {
  PAD = [];
  // ---- 3. assign new addresses ----
  // Code up from $0801, data down from $c000, each keeping its original relative order. A run that
  // was page-aligned stays page-aligned: alignment is a correctness property for the byte-indexed
  // tables (mapT, the ramp tables, clampT...) and cannot be packed away.
  code = runs.filter(b => b.isCode); data = runs.filter(b => !b.isCode);
  // PAD is every byte the alignment costs. It is unwritten space INSIDE the two sections, so it is
  // a perfectly good home for RAM scratch -- which is never emitted and only has to be RAM nothing
  // else claims. Recording it here is what lets the scratch be placed into it below, instead of
  // being paid for twice: once as padding and again out of the arena.
  // PAD is reset per pass by the loop above
  // ---- TETRIS: fill each pre-alignment gap with runs that do not care where they sit ----
  // An aligned run must start on a page boundary, so placing one costs whatever it takes to reach
  // the next boundary. Paying that in PADDING is waste; paying it in a run that has no alignment
  // need is free. So before each aligned run, greedily drop in unaligned runs that fit the gap, and
  // only pad what is left. Largest-first, because one 200-byte run beats four 50-byte ones at
  // closing a 240-byte gap and leaves the small change for later gaps.
  const fitInto = (pool, room, place) => {
    let need = room;
    for (;;) {
      let i = -1;
      for (let k = 0; k < pool.length; k++)
        if (pool[k].len <= need && (i < 0 || pool[k].len > pool[i].len)) i = k;
      if (i < 0) return need;
      need -= place(pool[i]);
      pool.splice(i, 1);
    }
  };

  // CODE RUNS ARE NEVER REORDERED. A split can land in the middle of a routine -- the source has
  // decorative origins, and an aligned table can open a run inside one -- so the two halves must
  // stay ADJACENT or the fall-through is gone. Placing them back to back in source order makes any
  // split harmless, whatever caused it. Shuffling them to fill gaps is what put `sMaxT` where the
  // code expected its own next instruction, and the CPU jammed inside the table.
  // Data has no fall-through, so the gap filling below applies to data runs only.
  let up = ORG;
    for (const b of code) {
    if (b.phase !== undefined) { const a = up + ((b.phase - up) & 255); if (a > up) PAD.push([up, a]); up = a; }
    if (b.hotPad) { PAD.push([up, up + b.hotPad]); up += b.hotPad; }   // see HOT LOOPS below
    b.to = up; up += b.len;
  }
  // BISECT: data runs in SOURCE ORDER, no gap-filling. Reordering is safe in principle -- data has
  // no fall-through -- but only if nothing depends on one table following another. NOFILL=1 keeps
  // the order to find out.
  let down = CEIL;
  if (process.env.NOFILL) {
    for (const b of [...data].reverse()) {
      let start = down - b.len;
      if (b.aligned) start &= ~255;
      b.to = start; down = start;
    }
  } else {
    const poolD = data.filter(x => !x.aligned);
    for (const b of [...data.filter(x => x.aligned)].reverse()) {
      const start = (down - b.len) & ~255;
      let hi = down;
      const left = fitInto(poolD, down - (start + b.len), f => { hi -= f.len; f.to = hi; return f.len; });
      if (left > 0) PAD.push([start + b.len, start + b.len + left]);
      b.to = start; down = start;
    }
    for (const f of poolD) { down -= f.len; f.to = down; }
  }
  // IDENTITY=1: assign every run the address it already had. The layout is then unchanged and the
  // disk should behave exactly like the uncompacted build -- so if it does NOT, the fault is in this
  // pipeline (run boundaries, origin rewriting, buffer rehoming) and not in where things were put.
  if (process.env.IDENTITY) {
    const orig = assemble(src);                       // the source as written, addresses and all
    const atOfLine = new Map();
    for (const e of orig.listing) if (e.len && !atOfLine.has(e.ln - 1)) atOfLine.set(e.ln - 1, e.at);
    let missing = 0;
    for (const b of runs) { const a = atOfLine.get(b.fromLn); if (a === undefined) missing++; else b.to = a; }
    console.log(`  IDENTITY: ${runs.length - missing} runs put back where they were` +
                (missing ? `, ${missing} had no original address` : ''));
  }
  codeEnd = up; dataStart = down;

  // ---- 4. put an origin at the head of every run ----
  // A run begins either at an origin the source already has -- rewrite it -- or at a table the build
  // says must be page-aligned, where there is no origin at all and one has to be INSERTED. Every
  // other origin in the source is now redundant: the measuring pass proved the bytes flow contiguously
  // without them, so they become comments rather than a second, competing opinion about the layout.
  // AN ORIGIN MUST GO BEFORE THE RUN'S BARE LABELS, not before its first emitted byte. `hudX:`
  // sits on a line of its own and emits nothing, so the run's first STATEMENT is the line after
  // it -- and inserting there put the origin BETWEEN the label and its code. The label then took
  // the previous run's end address while the code assembled at the new one, so every `jsr hudX`
  // called into the gap. Two labels moved that way (hudX, seamEdge) and the machine died before
  // its first frame, with everything else about the layout correct.
  const bareHead = (ln) => {
    let i = ln;
    while (i > 0 && /^\s*$|^\s*;|^[a-zA-Z][a-zA-Z0-9_]*:\s*(;.*)?$/.test(lines[i - 1])) i--;
    return i;
  };
  const org4 = new Map();                       // source line -> address to emit there
  for (const b of runs) org4.set(bareHead(b.fromLn), b.to);
  const out4 = [...lines];
  for (const o of orgLines) if (!org4.has(o.i))  // an origin that no longer heads a run
    out4[o.i] = `; [origin folded into the run above by compact.mjs]`;
  const ins4 = [...org4].sort((x, y) => y[0] - x[0]);   // bottom-up so earlier indices hold
  for (const [ln, at] of ins4) {
    const hex = `* = $${at.toString(16).padStart(4, '0')}`;
    const o = orgLines.find(x => x.i === ln);
    if (o) out4[ln] = out4[ln].replace(/\* *= *\$[0-9a-fA-F]+/, hex);
    else out4.splice(ln, 0, `        ${hex}`);  // a run that starts at an aligned table
  }
  lines2 = out4;
  writeFileSync(OUT, lines2.join('\n'));
  try { out = assemble(lines2.join('\n')); }
  catch (e) { console.error('compact build FAILED to assemble: ' + e.message); process.exit(1); }

  // ---- re-measure: what did each run actually become, where it was put? ----
  // Emission order is source order is run order, so walking the listing and stepping to the next
  // run each time an address matches its assigned base attributes every byte to its own run.
  let i = -1; const got = runs.map(() => 0);
  for (const e of out.listing) {
    if (!e.len) continue;
    if (i + 1 < runs.length && e.at === runs[i + 1].to) i++;
    if (i >= 0) got[i] += e.len;
  }
  settled = runs.every((b, k) => b.len === got[k]);
  // ---- HOT LOOPS: no page boundary inside one ----
  // A loop runs from its label to the end of the last branch or jmp that targets it. If that span
  // straddles a page, pad before the loop's run by exactly enough to start the loop on the next
  // page: at most the loop's own length, and the padding is scratch space like any other PAD.
  // Sticky (it accumulates), so a later pass cannot undo it; it is re-checked every pass, since
  // earlier runs changing size can move the loop again.
  for (const name of HOTLOOPS) {
    const s = out.labels[name];
    if (s === undefined) { console.error(`compact: hot loop ${name} is not a label`); process.exit(1); }
    const back = new RegExp(`^\\s*(b(cc|cs|eq|ne|mi|pl|vc|vs)|jmp)\\s+${name}\\b`, 'i');
    let e = -1;
    for (const x of out.listing) if (x.len && x.at > s && back.test(lines2[x.ln - 1] ?? '')) e = Math.max(e, x.at + x.len);
    if (e < 0) { console.error(`compact: hot loop ${name} has no branch back to it`); process.exit(1); }
    if (e - s > 256) { console.error(`compact: hot loop ${name} is ${e - s} bytes -- cannot fit a page`); process.exit(1); }
    if ((s >> 8) === ((e - 1) >> 8)) continue;
    const k = runs.findIndex((b, j) => b.isCode && b.to <= s && s < b.to + got[j]);
    if (k < 0) { console.error(`compact: hot loop ${name} is in no code run`); process.exit(1); }
    const need = ((e - 1) & ~255) - s;
    runs[k].hotPad = (runs[k].hotPad ?? 0) + need;
    console.log(`  hot loop ${name} ($${s.toString(16)}-$${(e - 1).toString(16)}) straddled a page: +${need} bytes before its run`);
    settled = false;
  }
  const moved = runs.filter((b, k) => b.len !== got[k]).length;
  console.log(`  pass ${pass + 1}: ${settled ? 'sizes settled' : moved ? `${moved} run(s) changed size, going again` : 'hot-loop padding added, going again'}`);
  if (!settled) runs.forEach((b, k) => { b.len = got[k]; });
}
if (!settled) { console.error('compact: run sizes never settled after 6 passes'); process.exit(1); }
const K = n => (n / 1024).toFixed(1) + 'K';
const codeB = runs.filter(b => b.isCode).reduce((n, b) => n + b.len, 0);
const dataB = runs.filter(b => !b.isCode).reduce((n, b) => n + b.len, 0);
console.log(`runs: ${runs.length}  (${code.length} code, ${data.length} data)`);
console.log(`  ENGINE CODE   $0801-$${(codeEnd - 1).toString(16)}   ${codeB} bytes` +
            `  (+${codeEnd - ORG - codeB} alignment padding)`);
console.log(`  DATA TABLES   $${dataStart.toString(16)}-$bfff   ${dataB} bytes` +
            `  (+${CEIL - dataStart - dataB} alignment padding)`);
console.log(`  ARENA         $${codeEnd.toString(16)}-$${(dataStart - 1).toString(16)}   ` +
            `${dataStart - codeEnd} bytes = ${K(dataStart - codeEnd)}`);
console.log(`  assembled: org $${out.org.toString(16)} end $${out.end.toString(16)}`);

// ---- EVERY LABEL'S FINAL ADDRESS, for the tools ----
// Written HERE, not by build-iray.mjs, because this is the assembly that ships: the relayout moves
// code, so build-iray's own label table is pre-compaction and wrong by thousands of bytes.
// probe.mjs needs it to set an EXECUTION checkpoint on a routine by name, which is what lets it
// wait for "mloop was reached" instead of sleeping eight seconds and hoping the load finished.
writeFileSync(ROOT + 'iray.syms.json', JSON.stringify(out.labels));

// ---- 5. what would still have to move: RAM equates that used to live in the old holes ----
// A buffer declared as `name = $xxxx` is not emitted, so compaction cannot see it. Any that now
// fall inside the code or table sections have to be rehomed -- into the arena, or above the
// tables. Reported, because they are the difference between "it assembles" and "it could run".
const eqs = [...src.matchAll(/^([a-zA-Z][a-zA-Z0-9_]*) *= *\$([0-9a-fA-F]{4})(?:\s*;.*)?$/gm)]
  .map(m => [m[1], parseInt(m[2], 16)]).filter(([, a]) => a >= ORG && a < CEIL);

// ---- HOW BIG IS EACH SCRATCH BUFFER, REALLY ----
// An equate declares no length, so build-iray.mjs reserves its whole PAGE -- safe, and here it
// costs 3,840 bytes for 345 buffers that need nothing like that. Three rules, strongest first:
//   1. DECLARED. The two fall snapshots are the only big ones and the build already states them.
//   2. NEVER INDEXED -> exactly `1 + max(+k)`. If no instruction reaches it through ,x or ,y then
//      the program has no way to touch a byte past its largest literal offset. 316 of 345 qualify
//      and they total 320 bytes between them.
//   3. INDEXED -> the gap to the NEXT equate, capped at a page. They were hand-packed adjacently,
//      so that gap is what each was given; the cap stops a buffer that happens to be last in its
//      region from claiming everything up to the next one far away.
// The 29 indexed buffers, sized from the source's OWN comments and from the addresses they were
// hand-packed at. Gap-to-the-next is a bad proxy for these -- it gives obC 44 bytes where the
// layout gives it 8, and in aggregate it came out WORSE than page-rounding. These belong in
// build-iray.mjs's RUNTIME_BUFS, derived from the same constants that size them (NRUN, NORB,
// MAPN), so they cannot drift; they are written out here to get the measurement.
// SIZES COME FROM THE BUILD, not from here. build-iray.mjs already maintains the authoritative
// map for its own RAM-overlap guard, and several entries are derived from constants that vary with
// the chain -- runPlaneT is NRUN, which was 44 in one build and 65 in the next. Hardcoding them
// placed a buffer 21 bytes inside another. Read what the build published; fall back to the
// never-indexed rule and then to adjacency for anything it does not name.
const DECLARED = (() => {
  return need('iray.bufsizes.json');   // (its old fallback hardcoded the fall snapshots' size a second time)
})();
const MN = /^\s*(adc|and|asl|bcc|bcs|beq|bit|bmi|bne|bpl|brk|bvc|bvs|clc|cld|cli|clv|cmp|cpx|cpy|dec|dex|dey|eor|inc|inx|iny|jmp|jsr|lda|ldx|ldy|lsr|nop|ora|pha|php|pla|plp|rol|ror|rti|rts|sbc|sec|sed|sei|sta|stx|sty|tax|tay|tsx|txa|txs|tya)\b/i;
const use = new Map(eqs.map(([n]) => [n, { max: 0, indexed: false }]));
for (const raw of src.split('\n')) {
  const body = raw.split(';')[0].replace(/^[a-zA-Z][a-zA-Z0-9_]*:/, '');
  if (!MN.test(body)) continue;
  for (const m of body.matchAll(/\b([a-zA-Z][a-zA-Z0-9_]*)\b(?:\s*\+\s*(\d+))?(\s*,\s*[xyXY])?/g)) {
    const u = use.get(m[1]); if (!u) continue;
    u.max = Math.max(u.max, +(m[2] ?? 0));
    if (m[3]) u.indexed = true;
  }
}
const sorted = [...eqs].sort((a, b) => a[1] - b[1]);
// FATBUF=1: size EVERY buffer by the gap to the next one in the ORIGINAL layout. That is what the
// hand layout actually gave it, so it cannot be an under-estimate -- and if rehoming works with
// these sizes and fails with the declared ones, then a declared size is short and that is the bug.
const fatOf = (a, i) => Math.min((sorted[i + 1] ? sorted[i + 1][1] : CEIL) - a, 2048);
const sizeOf = (n, a, i) => {
  if (process.env.FATBUF) return fatOf(a, i);
  if (DECLARED[n]) return DECLARED[n];
  const u = use.get(n);
  if (!u.indexed) return u.max + 1;
  const next = sorted[i + 1] ? sorted[i + 1][1] : CEIL;
  return Math.min(next - a, 256);
};
// A BUFFER THAT WAS PAGE-ALIGNED MUST STAY PAGE-ALIGNED. Several are indexed by a whole byte and
// the code leans on the high byte never changing -- faceIdT says so in its own comment, "a column
// index must never need a 16-bit add". Rehoming them anywhere broke the renderer while leaving the
// HUD perfect, which is exactly what you would expect from a table that is read correctly for its
// first page and wrapped after.
const sized = sorted.map(([n, a], i) => ({ n, a, size: sizeOf(n, a, i) }));
// ---- CLUSTER BUFFERS THAT WERE ADJACENT, and move them as one ----
// Moving each buffer independently breaks every group the code treats as a run. colW/colB/colS
// are three consecutive bytes and init copies them into $d021/$d022/$d023 as a block; separate
// them and the walls come back in the ceiling's ink. The rule that a never-indexed buffer cannot
// exceed 1+max(+k) protects it from being UNDER-SIZED -- it says nothing about its NEIGHBOURS
// staying put. So: any buffer that begins exactly where the previous one ended joins its cluster,
// and clusters are what get placed.
// ---- AN EQUATE NOTHING NAMES GETS NO SPACE ----
// A debug flag's scratch, or a variable whose last reader was deleted, is still an equate, and
// was still given a byte (or a cluster's worth) of the arena. If no line but its own definition
// names it, nothing can touch it -- EXCEPT through an indexed neighbour, so a nameless buffer in
// the unbroken run after an indexed one keeps its place (the omEn rule; see zpAlloc). The rest
// lose their definition line in the compacted source.
const nameCount = new Map();
for (const raw of src.split('\n')) for (const m of raw.split(';')[0].matchAll(/\b[a-zA-Z][a-zA-Z0-9_]*\b/g))
  nameCount.set(m[0], (nameCount.get(m[0]) ?? 0) + 1);
const unnamed = [];
const bufs = [];
for (const b of sized) {
  const last = bufs[bufs.length - 1];
  const inIndexedRun = last && b.a === last.a + last.size && last.members.some(m => use.get(m.n).indexed && !DECLARED[m.n]);
  if ((nameCount.get(b.n) ?? 0) <= 1 && !inIndexedRun && ALIGNED[b.n] === undefined) { unnamed.push(b); continue; }
  // A buffer that DECLARES alignment cannot be a cluster member: a cluster is placed as one run
  // and aligned at its start, so a declared buffer sitting 520 bytes in lands wherever it lands.
  // fallSnapD and fallSnapS are adjacent and both declared -- merged, the second was never on a
  // page and the straddle guard refused the image.
  if (last && b.a === last.a + last.size && ALIGNED[b.n] === undefined) {
    last.size += b.size; last.members.push(b); continue;
  }
  // ALIGNED is the DECLARATION; (b.a & 255) === 0 is only a guess from where the buffer sits
  // today. Guessing was enough while every aligned buffer happened to start on a page in the
  // pre-compaction layout, and it silently stopped being enough the moment one did not: the
  // relayout then felt free to move it off a page, and the build's own straddle guard refused
  // the image (fallSnapS at $59ff, on any TOURW build). A requirement has to be read, not
  // inferred -- the same lesson as hTabT and bfsD0/bfsD1.
  // ...and a declaration can also say NO: alignment 1 means "this only starts on a page by
  // accident". The $8500 run of ~100 scalars (ocos, osin, ovar...) was inferred aligned purely for
  // its address, and a page-rounded 100-byte run is what kept four level slots from fitting.
  // ...and a third answer, { within: n }: "these n bytes must not CROSS a page", which is what an
  // abs,X table actually needs, and which can sit anywhere in a page it fits in. runPlaneT +
  // runFaceT (2026-10-09): page-aligned by inference, the pair stranded for want of a whole free
  // page when the arena's leftovers were 151 bytes of edges.
  const within = ALIGNED[b.n]?.within;
  const mustAlign = within ? false : ALIGNED[b.n] !== undefined ? ALIGNED[b.n] > 1 : (b.a & 255) === 0;
  bufs.push({ n: b.n, a: b.a, size: b.size, align: mustAlign, within, members: [b] });
}
bufs.sort((x, y) => y.size - x.size);                       // largest first: first-fit wants it
const bufB = bufs.reduce((t, b) => t + b.size, 0);

// ---- PLACE THEM: alignment padding first, then the arena ----
const padB0 = PAD.reduce((t, [lo, hi]) => t + (hi - lo), 0);   // BEFORE placement consumes it
// HOLES COME FROM THE ASSEMBLED LAYOUT, not from my own bookkeeping. `out.holes` is every range
// the assembler padded rather than filled -- which IS the alignment slack plus the arena, but
// derived from what was actually emitted instead of from a parallel account of it that can drift.
// It also makes IDENTITY meaningful: there the holes are the original layout's holes, so the
// buffers can be rehomed into the layout they came from and rehoming tested on its own.
// Smallest hole first, and among equals the LOWEST address. Best-fit keeps the big arena hole
// intact for as long as possible; preferring low addresses then packs whatever must go in it
// against its floor, so what is left of the arena stays ONE run instead of several. A level needs
// whole pages, and pages are lost at every fragment edge.
const bySize = (a, b) => (a[1] - a[0]) - (b[1] - b[0]) || a[0] - b[0];
// SUBTRACT THE LEVEL REGION. The levels are not emitted -- they arrive from disk -- so the
// assembler reports their home as a hole, and scratch would be placed straight on top of them.
let RESERVE = null;
RESERVE = need('iray.reserve.json');
const carve = ([lo, hi]) => {
  if (!RESERVE || RESERVE[1] <= lo || RESERVE[0] >= hi) return [[lo, hi]];
  return [[lo, Math.min(hi, RESERVE[0])], [Math.max(lo, RESERVE[1]), hi]].filter(([a, b]) => b > a);
};
const holes = out.holes.flatMap(([lo, hi]) => carve([lo, hi])).sort(bySize);
let inPad = 0, placed = 0;
for (const b of bufs) {
  // where it would start in a hole: on the next page if aligned, or if it would cross one
  const startIn = lo => b.align || (b.within && (lo & 255) + b.within > 256) ? (lo + 255) & ~255 : lo;
  const fits = ([lo, hi]) => startIn(lo) + b.size <= hi;
  const h = holes.find(fits);
  if (!h) {
    // NOT SILENT ANY MORE. A buffer with no hole stays at its hand-layout address, which is now
    // inside the image -- the build's equate guard then refuses the disk, but names only the
    // victims ("pvN=$8000 ... sit inside the emitted image"), not the cause. Twice (2026-10-08) the
    // cause was a scalar run INFERRED page-aligned from its address, stranded when the arena lost
    // a page; ALIGNED_T name: 1 is the fix when the run does not really need one.
    console.error(`  compact: no hole for ${b.n} (${b.size} B${b.align ? ', page-aligned' : ''}` +
      `${b.align && ALIGNED[b.n] === undefined ? ' -- INFERRED from its address; if nothing needs ' +
        'the page, declare ALIGNED_T ' + b.n + ': 1' : ''}); left at $${b.a.toString(16)}`);
    continue;
  }
  if (h[1] <= codeEnd || h[0] >= dataStart) inPad += b.size;
  b.at = startIn(h[0]);                          // REMEMBER where it went: this is what runs
  // A page-aligned buffer skips forward to the boundary. Those skipped bytes used to be simply
  // LOST -- 1,349 of them, more than a third of the level arena, thrown away to round up nine
  // buffers. They are perfectly good RAM and most of what is left to place is one or two bytes
  // wide, so hand the gap back as a hole instead of dropping it on the floor.
  if (b.at > h[0]) holes.push([h[0], b.at]);
  { let o = b.at; for (const m of b.members) { m.at = o; o += m.size; } }
  h[0] = b.at + b.size; placed++;
  holes.sort(bySize);
}
const arenaLeft = holes.filter(([lo, hi]) => lo >= codeEnd && hi <= dataStart)
                       .reduce((t, [lo, hi]) => t + (hi - lo), 0);

console.log(`  RAM SCRATCH   ${eqs.length} buffers = ${bufB} bytes ` +
            `(was ${new Set(eqs.map(([, a]) => a & ~255)).size * 256} page-rounded)`);
console.log(`                ${bufs.filter(b => !use.get(b.n).indexed).length} exactly sized, ` +
            `${bufs.filter(b => use.get(b.n).indexed).length} indexed (sized by the gap to the next)`);
// What the arena actually lost, and to what. A page-aligned buffer is rounded UP to the next page
// before it is placed, so it can cost far more than its size -- that rounding is the difference
// between "the gap" and "what a level can have", and it was not visible anywhere.
{
  const inArena = bufs.filter(b => b.at !== undefined && b.at >= codeEnd && b.at < dataStart);
  const bytes = inArena.reduce((t, b) => t + b.size, 0);
  const spent = (dataStart - codeEnd) - arenaLeft;
  console.log(`  ARENA SPENT   ${spent} bytes to RAM scratch: ${bytes} of buffers + ` +
              `${spent - bytes} of page-alignment rounding (${inArena.filter(b => b.align).length} of them page-aligned)`);
}
console.log(`  PADDING       ${padB0} bytes of alignment slack -> ${inPad} used by scratch, ` +
            `${padB0 - inPad} left over (fragmented inside the sections, not usable for a level)`);
// A LEVEL SLOT MUST START ON A PAGE BOUNDARY (mapT sits at offset 0), so the bytes between the
// arena's low edge and the next boundary can never hold one -- they are scratch space, exactly
// like the alignment padding. Report the usable figure in PAGES, which is what a slot is bought in.
const free = holes.filter(([lo, hi]) => lo >= codeEnd && hi <= dataStart).sort((a, b) => a[0] - b[0]);
const usable = free.reduce((t, [lo, hi]) => t + Math.max(0, (hi & ~255) - ((lo + 255) & ~255)), 0);
if (process.env.ARENAMAP) console.log('  arena free runs: ' +
  free.map(([lo, hi]) => `$${lo.toString(16)}-$${(hi - 1).toString(16)}(${hi - lo})`).join(' '));
console.log(`  ===> LEVEL ARENA  ${arenaLeft} bytes, of which ${usable} are page-aligned ` +
            `= ${usable >> 8} slot pages (${arenaLeft - usable} B of sub-page edge -> more scratch room)`);

// ---- 6. REWRITE THE RAM EQUATES TO WHERE THEY WERE PLACED ----
// Relocating the emitted runs is only half a build: the 344 uninitialised buffers live in the
// holes compaction just removed, so unless they move too the program writes over its own tables
// the moment it runs. They are safe to move as a set because build-iray.mjs already guarantees
// none of them aliases emitted data -- that is exactly what its "no RAM equate inside the emitted
// image" guard checks. So each one's `name = $xxxx` is rewritten to the address it was assigned.
{
  const placedAt = (process.env.IDENTITY && !process.env.REHOME) ? new Map()   // identity: leave them
    : new Map([...bufs.filter(b => b.at !== undefined)
    .flatMap(b => b.members).map(m => [m.n, m.at])]);
  if (unnamed.length) console.log(`  UNNAMED       ${unnamed.length} equates nothing names, given no space: ${unnamed.map(b => b.n).join(' ')}`);
  let out = lines2.join('\n'), n = 0;
  for (const { n: nm } of unnamed)             // nothing names them, so the definition can simply go
    out = out.replace(new RegExp(`^${nm} *= *\\$[0-9a-fA-F]{4}`, 'm'), `; ${nm}: named by nothing in this build, so given no RAM (compact.mjs)`);
  for (const [name, at] of placedAt) {
    const re = new RegExp(`^(${name} *= *)\\$[0-9a-fA-F]{4}`, 'm');
    if (!re.test(out)) continue;
    out = out.replace(re, `$1$${at.toString(16).padStart(4, '0')}`);
    n++;
  }
  writeFileSync(OUT, out);
  let run;
  try { run = assemble(out); } catch (e) { console.log(`  REHOMED build failed: ${e.message.slice(0, 90)}`); run = null; }
  // THE SYMBOLS AGAIN, NOW THAT THE BUFFERS HAVE MOVED. The write above (step 4) predates the
  // rehoming, so every RAM equate in it was its PRE-move address -- faceIdT read as $8200 while
  // the engine kept it at $6300 -- and any tool reading a buffer by name (vprof --dump, probes,
  // monitor scripts) silently read junk. Code labels were right; only the buffers were stale.
  if (run) writeFileSync(ROOT + 'iray.syms.json', JSON.stringify(run.labels));
  else {        // the pre-move symbols are WRONG for every buffer: better no file than a stale one
    try { unlinkSync(ROOT + 'iray.syms.json'); } catch {}
    console.error('compact: the rehomed source did not assemble -- iray.syms.json removed rather than left stale');
  }
  if (process.env.SHOWMOVED)
    console.log('  moved: ' + [...placedAt].map(([nm, at]) => {
      const was = (sorted.find(([q]) => q === nm) || [, 0])[1];
      return `${nm} $${was.toString(16)}->$${at.toString(16)}`;
    }).join('  '));
  console.log(`  rehomed ${n} of ${placedAt.size} RAM buffers` +
              (run ? `; the compacted source assembles with them in place ($${run.org.toString(16)}-$${run.end.toString(16)})` : ''));
}
