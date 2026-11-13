// song-pack.mjs -- store a GoatTracker 2 song in fewer bytes, playing exactly the same.
//
//   node tools/song-pack.mjs in.sng out.sng
//
// song-glide writes a voice as one pattern a chord. Where a voice repeats a figure through every chord (the
// Chu-ka-Ti-ka noise: a hit command every 8th, the same in every bass pattern but for its first note), each
// pattern holds its own copy -- level 7's bass was 881 of its 1,504 pattern bytes. This cuts every pattern
// into L-row pieces, stores each piece that occurs twice or more ONCE as its own pattern, and plays it from
// the order lists (a run of the same piece as one repeat entry, $d0+n plays it n+1 times). Pieces seen once
// stay joined, as one pattern. L is chosen per voice, as the length that packs smallest (gt2reloc's packing,
// re-done in packed() below; a pattern also costs 2 bytes of pattern table, an order entry 1).
//
// What could make the split song play differently, and how each is ruled out:
// - gt2reloc packs a row's command only when it differs from the row before IN THE SAME PATTERN, and the player
//   runs what it packed; a cut between two rows carrying the same command would make the second one run
//   again. Such a row is never cut before.
// - the order lists' restart entry (song-glide loops back to chord 2) moves to where chord 2 now starts.
// Before that, the tables: one copy of each program and instrument (song-rounds appends round 2's renumbered),
// what nothing points at dropped, and runs of wave-table waits nothing enters between merged into one row.
// Check a song by its SID writes, frame for frame, in.sng against out.sng: gt2reloc each (as the build does,
// -N -D1 -G423.87 -W40 -Z80) and diff tools/sidtrace.mjs's output -- levels 5-7 matched over 200 s, 2026-10-31.
import { readFileSync, writeFileSync } from 'node:fs';

const [IN, OUT] = process.argv.slice(2);
if (!IN || !OUT) throw new Error('usage: song-pack.mjs in.sng out.sng');

// ---- read a GTS5 file (one subtune) ----
const d = readFileSync(IN); let p = 4 + 96;
if (d.toString('latin1', 0, 4) !== 'GTS5' || d[p++] !== 1) throw new Error(`${IN}: not a one-subtune GTS5`);
const head = d.subarray(0, 4 + 96 + 1), orders = [], restart = [];
for (let v = 0; v < 3; v++) { const n = d[p++]; const o = [...d.subarray(p, p + n)]; p += n + 1;
  if (o.at(-1) !== 0xff) throw new Error(`${IN}: order list ${v + 1}`); orders.push(o.slice(0, -1)); restart.push(d[p - 1]); }
const ins = [...Array(d[p++])].map(() => { const i = { b: [...d.subarray(p, p + 9)], name: [...d.subarray(p + 9, p + 25)] }; p += 25; return i; });
const TN = ['wave', 'pulse', 'filt', 'speed'], T = {};
for (const t of TN) { const n = d[p++]; T[t] = [...Array(n)].map((_, k) => [d[p + k], d[p + n + k]]); p += 2 * n; }
const P = [...Array(d[p++])].map(() => { const n = d[p++]; const rows = [...Array(n)].map((_, k) => [...d.subarray(p + 4 * k, p + 4 * k + 4)]); p += 4 * n;
  if (rows.at(-1)[0] !== 0xff) throw new Error(`${IN}: a pattern without its end mark`); return rows.slice(0, -1); });

// ---- one copy of each table program and instrument ----
// song-rounds appends round 2's tables and instruments renumbered, so a program both rounds play (the noise
// beat's, a glide's) is stored twice and the patterns that use it differ. Every pointer into a table (an
// instrument's, a pattern command's, a wave row's command, a jump) is remapped to the first identical copy,
// and what nothing points at goes. Table pointers: pattern commands 1-4 and E (speed: data 0 is none), 8
// wave, 9 pulse, A filter; wave-row commands $f0+ the same; instrument bytes 2 wave, 3 pulse, 4 filter, 5
// the vibrato's speed row
const CMDT = { 1: 'speed', 2: 'speed', 3: 'speed', 4: 'speed', 14: 'speed', 8: 'wave', 9: 'pulse', 10: 'filt' };
const INSB = { 2: 'wave', 3: 'pulse', 4: 'filt', 5: 'speed' };
const map = { speed: [], pulse: [], filt: [], wave: [] };   // old row (1-based) -> canonical old row
// (speed rows are single values; the others are programs, blocks of rows up to a jump, which may be entered
// anywhere -- the beat loop is -- and jump inside themselves)
T.speed.forEach((r, k) => { const at = T.speed.findIndex(x => x[0] === r[0] && x[1] === r[1]); map.speed[k + 1] = at + 1; });
const blocks = t => { const out = []; let s = 0; T[t].forEach(([l], k) => { if (l === 0xff) { out.push([s, k]); s = k + 1; } });
  if (s < T[t].length) out.push([s, T[t].length - 1]); return out; };
for (const t of ['pulse', 'filt', 'wave']) { const seen = new Map();
  for (const [a, z] of blocks(t)) {
    const rows = T[t].slice(a, z + 1).map(([l, r]) => l === 0xff ? (r > a && r <= z + 1 ? `j@${r - 1 - a}` : `j${r}`)
      : t === 'wave' && l >= 0xf0 && l < 0xff && CMDT[l - 0xf0] ? `${l},${CMDT[l - 0xf0]}${r && map[CMDT[l - 0xf0]][r]}` : `${l},${r}`).join(';');
    const first = seen.get(rows) ?? a; seen.set(rows, first);
    for (let k = a; k <= z; k++) map[t][k + 1] = first + (k - a) + 1; } }
const canon = (t, x) => x && (map[t][x] ?? x);
// instruments: remapped, then one copy of each
const insB = ins.map(({ b }) => b.map((x, k) => INSB[k] ? canon(INSB[k], x) : x));
const insMap = insB.map(b => insB.findIndex(c => c.join() === b.join()) + 1);
for (const rows of P) for (const r of rows) { if (r[1]) r[1] = insMap[r[1] - 1]; if (CMDT[r[2]]) r[3] = canon(CMDT[r[2]], r[3]); }
// what is still pointed at, from the patterns down: the instruments their notes use, and the table rows
// those, the commands, wave-row commands and jumps reach
const used = { wave: new Set(), pulse: new Set(), filt: new Set(), speed: new Set() }, usedIns = new Set();
for (const rows of P) for (const [, i, c, x] of rows) { if (i) usedIns.add(i); if (CMDT[c] && x) used[CMDT[c]].add(x); }
for (const i of usedIns) insB[i - 1].forEach((x, k) => { if (INSB[k] && x) used[INSB[k]].add(x); });
const keep = { speed: new Set() };
for (const t of ['wave', 'pulse', 'filt']) { keep[t] = new Set(); }
// (a block is kept whole if any row of it is entered; its wave commands and jumps then count as pointers)
for (let changed = true; changed;) { changed = false;
  for (const t of ['wave', 'pulse', 'filt']) for (const [a, z] of blocks(t)) {
    if (keep[t].has(a) || ![...Array(z - a + 1)].some((_, k) => used[t].has(a + k + 1))) continue;
    keep[t].add(a); changed = true;
    for (let k = a; k <= z; k++) { const [l, r] = T[t][k];
      if (l === 0xff && r) used[t].add(canon(t, r));
      if (t === 'wave' && l >= 0xf0 && l < 0xff && CMDT[l - 0xf0] && r) used[CMDT[l - 0xf0]].add(canon(CMDT[l - 0xf0], r)); } } }
// renumber: the kept blocks in order
const renum = { wave: [], pulse: [], filt: [], speed: [] }, NT = { wave: [], pulse: [], filt: [], speed: [] };
for (const t of ['wave', 'pulse', 'filt']) for (const [a, z] of blocks(t)) if (keep[t].has(a))
  for (let k = a; k <= z; k++) { renum[t][k + 1] = NT[t].length + 1; NT[t].push([...T[t][k]]); }
T.speed.forEach((r, k) => { if (used.speed.has(k + 1)) { renum.speed[k + 1] = NT.speed.length + 1; NT.speed.push([...r]); } });
const re = (t, x) => { if (!x) return 0; const y = renum[t][canon(t, x)]; if (!y) throw new Error(`${t} row ${x} lost`); return y; };
for (const t of ['wave', 'pulse', 'filt']) for (const r of NT[t]) {
  if (r[0] === 0xff) r[1] = re(t, r[1]);
  else if (t === 'wave' && r[0] >= 0xf0 && CMDT[r[0] - 0xf0]) r[1] = re(CMDT[r[0] - 0xf0], r[1]); }
const insNew = [], insRenum = [];
[...usedIns].sort((a, b) => a - b).forEach(i => { insRenum[i] = insNew.length + 1;
  insNew.push({ b: insB[i - 1].map((x, k) => INSB[k] ? re(INSB[k], x) : x), name: ins[i - 1].name }); });
for (const rows of P) for (const r of rows) { if (r[1]) r[1] = insRenum[r[1]]; if (CMDT[r[2]]) r[3] = re(CMDT[r[2]], r[3]); }
// ---- wave waits merged ----
// a wave row $00-$0f with note $80 changes nothing for its value + 1 ticks; two in a row that nothing
// enters between (no pointer, no jump to the second) are one row of their sum, up to 16 ticks
for (let merged = true; merged;) { merged = false;
  const entered = new Set([...insNew.map(({ b }) => b[2]), ...P.flatMap(rows => rows.filter(r => r[2] === 8).map(r => r[3])),
    ...NT.wave.filter(([l]) => l === 0xff).map(([, r]) => r)]);
  for (let k = 0; k + 1 < NT.wave.length; k++) { const [a, ar] = NT.wave[k], [b, br] = NT.wave[k + 1];
    if (a > 0x0f || b > 0x0f || ar !== 0x80 || br !== 0x80 || a + b + 2 > 16 || entered.has(k + 2)) continue;
    NT.wave[k] = [a + b + 1, 0x80]; NT.wave.splice(k + 1, 1);
    const fix = x => x > k + 1 ? x - 1 : x;               // (rows after the gone one move up a row)
    for (const r of NT.wave) if (r[0] === 0xff) r[1] = fix(r[1]);
    for (const { b: ib } of insNew) ib[2] = fix(ib[2]);
    for (const rows of P) for (const r of rows) if (r[2] === 8) r[3] = fix(r[3]);
    merged = true; break; } }
const tabStat = TN.map(t => `${t} ${T[t].length}` + (NT[t].length !== T[t].length ? `->${NT[t].length}` : '')).join(' ');
for (const o of orders) if (o.some(x => x >= 0xd0)) throw new Error(`${IN}: already uses repeat/transpose entries`);

// ---- gt2reloc's packed size of a pattern (greloc.c packpattern): an instrument byte when it changes, a
// command (+data) when it changes, a note byte, runs of empty rows as one byte (up to 64), the end mark ----
const REST = 0xbd;
const packed = rows => { const t = []; let ins = 0, cmd = -1, dat = -1;
  rows.forEach(([n, i, c, x], k) => { if (k && i && i === ins) i = 0; else if (i) ins = i;
    if (i) t.push('I');
    const ch = c !== cmd || x !== dat; if (ch) { cmd = c; dat = x; }
    if (n === REST) { if (ch) { t.push('F'); if (c) t.push('d'); } else t.push('R'); }
    else { if (ch) { t.push('F'); if (c) t.push('d'); } t.push('N'); } });
  let n = 0; for (let c = 0; c < t.length;) { if (!c || t[c] !== 'R') { n++; c++; continue; }
    let e = c; while (e < t.length && t[e] === 'R' && e - c < 64) e++; n++; c += Math.max(1, e - c); }
  return n + 1; };

// ---- split one voice at a piece length L ----
// pieces: per order entry, its patterns' rows cut at multiples of L (never before a row repeating its
// predecessor's command); returns the order entries as lists of row-arrays
const cuts = (rows, L, H = L) => { const out = []; let s = 0;
  for (let k = H || L; k < rows.length; k += L) { const a = rows[k - 1], b = rows[k];
    if (b[2] && a[2] === b[2] && a[3] === b[3]) continue;
    out.push(rows.slice(s, k)); s = k; }
  out.push(rows.slice(s)); return out; };
const key = rows => rows.map(r => r.join(',')).join(';');
// a voice's order list at piece length L, against the pieces other voices already store (store: key -> rows)
const plan = (v, L, H, count) => {
  const seq = [];                                   // [{ rows, e: its order entry, first: starts the entry }]
  orders[v].forEach((pi, e) => { const pcs = L ? cuts(P[pi], L, H) : [P[pi]];
    let run = null;
    pcs.forEach((r, k) => { const shared = (count.get(key(r)) || 0) > 1;
      if (shared) { if (run) { seq.push({ rows: run, e, first: run.first }); run = null; } seq.push({ rows: r, e, first: !k }); }
      else if (run) run.push(...r); else { run = [...r]; run.first = !k; } });
    if (run) seq.push({ rows: run, e, first: run.first }); });
  return seq; };
const costOf = (seq, stored, rep) => { let b = 0; const seen = new Set(stored);
  for (const { rows } of seq) { const k = key(rows); if (!seen.has(k)) { seen.add(k); b += packed(rows) + 2; } }
  let prev = null, run = 0;
  for (const { rows } of seq) { const k = key(rows); if (rep && k === prev && run < 16) { run++; if (run === 2) b++; } else { b++; prev = k; run = 1; } }
  return b; };

// ---- choose L per voice, smallest first; with repeat entries and without ----
// (gt2reloc leaves the order-list repeat out of the player unless a song uses it: it costs REPCODE bytes
// of player code, so a song whose repeats save less is better off without them)
const REPCODE = 21;
const choose = rep => {
  const stored = new Set(), newOrders = [], newRestart = [], pieces = [], idOf = new Map(), report = [];
  const store = rows => { const k = key(rows); if (!idOf.has(k)) { idOf.set(k, pieces.length); pieces.push(rows); stored.add(k); } return idOf.get(k); };
  let total = 0, usesRep = false;
  for (let v = 0; v < 3; v++) {
    let best = null;
    // (the first piece of each pattern H rows, then L: a chord's note and the figure's first beat apart, the
    // figure's whole cycle after it)
    for (let L = 0; L <= 64; L++) for (let H = 0; H <= L; H++) { if (L && L < 2 || !L && H) continue;
      const count = new Map();
      for (const pi of orders[v]) for (const r of L ? cuts(P[pi], L, H) : [P[pi]]) count.set(key(r), (count.get(key(r)) || 0) + 1);
      for (const k of stored) count.set(k, (count.get(k) || 0) + 2);   // (a piece another voice stores is free to share)
      const seq = plan(v, L, H, count), c = costOf(seq, stored, rep);
      if (!best || c < best.c) best = { L, H, seq, c }; }
    const before = costOf(plan(v, 0, 0, new Map()), new Set(), false);
    report.push(`voice ${v + 1}: ${before} -> ${best.c} B` + (best.L ? ` (${best.H && best.H !== best.L ? `${best.H}, then ` : ''}${best.L}-row pieces)` : ' (unchanged)'));
    total += best.c;
    // order list: runs of one piece as a repeat entry; the restart entry where order entry restart[v] starts
    const ol = []; let at = -1, k = 0;
    const ids = best.seq.map(s => store(s.rows));
    while (k < ids.length) { if (best.seq[k].e === restart[v] && best.seq[k].first && at < 0) at = ol.length;
      let n = 1; while (rep && k + n < ids.length && ids[k + n] === ids[k] && n < 16 && !(best.seq[k + n].e === restart[v] && best.seq[k + n].first)) n++;
      if (n > 1) { ol.push(0xd0 + n - 1); usesRep = true; } ol.push(ids[k]); k += n; }
    if (at < 0) throw new Error(`voice ${v + 1}: the restart entry was lost`);
    newOrders.push(ol); newRestart.push(at); }
  return { newOrders, newRestart, pieces, report, total: total + (usesRep ? REPCODE : 0), usesRep }; };
const withRep = choose(true), noRep = choose(false);
const { newOrders, newRestart, pieces, report, usesRep } = withRep.total < noRep.total ? withRep : noRep;
if (pieces.length > 208) throw new Error(`${pieces.length} patterns (GoatTracker holds 208)`);
for (const o of newOrders) if (o.length > 254) throw new Error(`an order list of ${o.length} entries`);

// ---- write ----
const out = [...head];
newOrders.forEach((o, v) => out.push(o.length + 1, ...o, 0xff, newRestart[v]));
out.push(insNew.length); for (const { b, name } of insNew) out.push(...b, ...name);
for (const t of TN) out.push(NT[t].length, ...NT[t].map(r => r[0]), ...NT[t].map(r => r[1]));
out.push(pieces.length);
for (const rows of pieces) { if (rows.length > 127) throw new Error('a pattern over 127 rows'); out.push(rows.length + 1); for (const r of rows) out.push(...r); out.push(0xff, 0, 0, 0); }
writeFileSync(OUT, Buffer.from(out));
console.log(`${OUT}: ${report.join(', ')}${usesRep ? ' with order-list repeats' : ''}; ${P.length} -> ${pieces.length} patterns; instruments ${ins.length}->${insNew.length}, tables ${tabStat}`);
