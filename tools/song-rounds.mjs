// song-rounds.mjs -- play two song-glide.mjs songs one after the other, as one GoatTracker 2 song.
//
//   node tools/song-rounds.mjs out.sng round1.sng round2.sng
//
// Each input is a song-glide loop: an order list of chords 1..n, then chord 1 again as the loop arrives
// at it (glides from chord n), restarting at chord 2. Out plays round 1's chords 1..n, round 2's
// arriving chord 1 and 2..n, round 1's arriving chord 1, and loops to round 1's chord 2. The rounds must
// have the same chord layout (voice notes at the joins, tempo); their instruments and tables may differ
// (round 2's are appended and renumbered).
//
// The filter: song-glide starts a song's filter program from the first bass note's instrument, so a
// round's program would only run at the song's very start. Each join instead points the filter (pattern
// command Axx) at the round it enters, skipping a FADEIN -- the fade belongs to the song's first notes,
// not to every lap (the user: "the filter coming up from $00 should only happen at the very beginning").
//
// Used by tools/spell-levels.sh (music/spell-level-5/6/7.sng). A join needs no Axx when the rounds share one
// filter loop that each round plays a whole number of times, and starts the entering round's pulse sweeps
// where they differ (see below).
import { readFileSync, writeFileSync } from 'node:fs';

const [OUT, ...INS] = process.argv.slice(2);
if (!OUT || INS.length !== 2) throw new Error('usage: song-rounds.mjs out.sng round1.sng round2.sng');

// ---- read a GTS5 file (as song-glide.mjs writes them: one subtune) ----
const read = path => {
  const d = readFileSync(path); let p = 4 + 96;
  if (d.toString('latin1', 0, 4) !== 'GTS5' || d[p++] !== 1) throw new Error(`${path}: not a one-subtune GTS5`);
  const orders = [], restart = [];
  for (let v = 0; v < 3; v++) { const n = d[p++]; const o = [...d.subarray(p, p + n)]; p += n + 1;
    if (o.at(-1) !== 0xff) throw new Error(`${path}: order list ${v}`); orders.push(o.slice(0, -1)); restart.push(d[p - 1]); }
  const instr = [...Array(d[p++])].map(() => { const i = { b: [...d.subarray(p, p + 9)], name: d.subarray(p + 9, p + 25) }; p += 25; return i; });
  const T = {};
  for (const t of ['wave', 'pulse', 'filt', 'speed']) { const n = d[p++]; T[t] = [...Array(n)].map((_, k) => [d[p + k], d[p + n + k]]); p += 2 * n; }
  const P = [...Array(d[p++])].map(() => { const n = d[p++]; const rows = [...Array(n)].map((_, k) => [...d.subarray(p + 4 * k, p + 4 * k + 4)]); p += 4 * n; return rows; });
  return { orders, restart, instr, T, P };
};
const [A, B] = INS.map(read);
for (const s of [A, B]) if (s.restart.some(r => r !== 1) || s.orders.some(o => o.length !== s.orders[0].length))
  throw new Error('each round must be a song-glide loop (restart at chord 2, equal order lists)');
if (A.orders[0].length !== B.orders[0].length) throw new Error('the rounds have different chord counts');

// ---- round 2 renumbered after round 1 ----
let off = { wave: A.T.wave.length, pulse: A.T.pulse.length, filt: A.T.filt.length, speed: A.T.speed.length, instr: A.instr.length, pat: A.P.length };
const sh = (t, x) => x ? x + off[t] : 0;            // (a 0 pointer means "none" and stays 0)
const T = { wave: [...A.T.wave], pulse: [...A.T.pulse], filt: [...A.T.filt], speed: [...A.T.speed] };
// ---- each round's filter entry: its program without the fade ----
// (song-glide's RSWEEP program: type/resonance, [fade rows], a set-cutoff row, then the loop the program's
// $FF jumps back to; the entry is the first row, the set-cutoff row, and a jump into that loop)
// (the loop: the first jump in the table into its own block -- after the program's start for a plain one;
// song-glide's CLOOP opens the table with the entry and its up loop, and keeps a fade's rows after them)
const prog = s => { const fp = s.instr[0].b[4]; if (!fp) throw new Error('a round\'s first instrument has no filter program');
  let b = 0, k = 0; for (; k < s.T.filt.length; k++) if (s.T.filt[k][0] === 0xff) { const to = s.T.filt[k][1];
    if (to > b + 1 && to <= k + 1) break; b = k + 1; }
  if (k === s.T.filt.length) throw new Error('a round\'s filter program does not loop');
  const loopAt = s.T.filt[k][1]; return { first: s.T.filt[fp - 1], cut: s.T.filt[loopAt - 2], loopAt, body: s.T.filt.slice(loopAt - 1, k),
    rest: s.T.filt.slice(loopAt - 1) }; };
const FA = prog(A), FB = prog(B);
// a filter program is ~230 rows (one row pair a resonance step, 16 s of them), so two do not fit the
// 255-row table. But the loop's cutoff moves are RELATIVE: two sweeps of the same span, speed and
// resonance differ only in the set-cutoff row before the loop -- round 2 then enters round 1's loop
// (song-glide's CLOOP keeps each drift direction's loop after the program and switches between them with
// Axx -- `rest`, all from the loop on, compares those too; a shared round 2's Axx then point at round 1's)
const shareFilt = JSON.stringify(FA.rest) === JSON.stringify(FB.rest);
if (shareFilt) off.filt = 0;
// wavetable: $FF jumps, and command rows $F1..$F4 (portamentos and vibrato) whose param is a speed row
T.wave.push(...B.T.wave.map(([l, r]) => [l, l === 0xff ? sh('wave', r) : l >= 0xf1 && l <= 0xf4 ? sh('speed', r) : r]));
for (const t of shareFilt ? ['pulse'] : ['pulse', 'filt']) T[t].push(...B.T[t].map(([l, r]) => [l, l === 0xff ? sh(t, r) : r]));
T.speed.push(...B.T.speed);
const filtEntry = ({ first, cut, loopAt }, loopOff) => { const at = T.filt.length + 1;
  T.filt.push(first, cut, [0xff, loopAt + loopOff]); return at; };
// (a round with no fade enters at its own program's first row -- the same three rows, three fewer in a table
// that two sweeps all but fill)
const own = (s, F) => F.loopAt === s.instr[0].b[4] + 2;
const FE = [own(A, FA) ? A.instr[0].b[4] : filtEntry(FA, 0),
  own(B, FB) && !shareFilt ? B.instr[0].b[4] + off.filt : filtEntry(FB, shareFilt ? FA.loopAt - FB.loopAt : off.filt)];
// instrument bytes: ad sr wave pulse filt vibspeed vibdelay gate firstwave (round 2's own start
// instrument never plays here; with a shared loop its filter pointer is round 2's entry)
const instr = [...A.instr, ...B.instr.map(({ b, name }) => ({ b: [b[0], b[1], sh('wave', b[2]), sh('pulse', b[3]),
  b[4] && shareFilt ? FE[1] : sh('filt', b[4]), sh('speed', b[5]), ...b.slice(6)], name }))];
// pattern commands whose data is a table row: 1-4 speed, 8 wave, 9 pulse, A filter
const CMDT = { 1: 'speed', 2: 'speed', 3: 'speed', 4: 'speed', 8: 'wave', 9: 'pulse', 10: 'filt' };
const shFilt = x => { if (!shareFilt) return sh('filt', x); if (x < FB.loopAt) throw new Error('round 2 points the filter before its loop');
  return x - FB.loopAt + FA.loopAt; };
const P = [...A.P, ...B.P.map(rows => rows.map(([n, i, c, x]) => n === 0xff ? [n, i, c, x]
  : [n, sh('instr', i), c, c === 10 ? shFilt(x) : CMDT[c] ? sh(CMDT[c], x) : x]))];
// a filter program's ticks (gplay.c): a type row 1 (with a set-cutoff row after it, the pair still 1), a
// set-cutoff row 1, a modulation row its count, a jump none
const progTicks = rows => rows.reduce((n, [l], k) => n + (l === 0xff ? 0 : l >= 0x80 ? 1 : l === 0 ? (k && rows[k - 1][0] >= 0x80 && rows[k - 1][0] !== 0xff ? 0 : 1) : l), 0);
// a round's length in ticks: its bass order's patterns at the tempo its first row sets
// (song-glide puts it on the first row free of a command -- with BEATCYCLE not row 0, which is exact only at
// tempo 6, GoatTracker's start tempo)
const roundTicks = s => { const t = s.P[s.orders[0][0]].find(r => r[2] === 15); if (!t) throw new Error('a round sets no tempo in its first pattern');
  return s.orders[0].slice(0, -1).reduce((n, pi) => n + s.P[pi].length - 1, 0) * t[3]; };   // (less each pattern's end mark)
// With one shared loop and the same entry, a join needs no Axx when each round lasts whole loops: the
// filter is then already where the Axx would put it (e.g. robin, whose every chord-1 row carries a command)
const P1 = progTicks(FA.body);
const sameFilt = shareFilt && JSON.stringify([FA.first, FA.cut, FA.loopAt]) === JSON.stringify([FB.first, FB.cut, FB.loopAt])
  && FA.loopAt === A.instr[0].b[4] + 2 && roundTicks(A) % P1 === 0 && roundTicks(B) % P1 === 0;
// a join's bass pattern: a copy of the arriving chord 1 with Axx on its first row
const withFilt = (pi, fe) => { if (sameFilt) return pi; const rows = P[pi].map(r => [...r]);
  // (a CLOOP round's own Axx there -- its loop switch -- gives way: the entry sets the cutoff too)
  if (rows[0][2] && rows[0][2] !== 10) throw new Error('a join\'s first bass row already has a command');
  rows[0][2] = 10; rows[0][3] = fe; P.push(rows); return P.length - 1; };

// PULSE SWEEPS: song-glide starts a voice's pulse program from its first note's 'start' instrument only, so a
// round entered at its arriving chord 1 would play on the OTHER round's pulse program -- or on none (a
// pulse voice after an all-triangle round has a width of 0). Where the two rounds' programs for a voice
// differ, the join's first strike in that voice takes a copy of the entering round's start instrument
// with no filter pointer (the filter is the joins' Axx's)
const strikeAt = rows => rows.findIndex(r => r[0] < 0xbd);
const startIns = (s, v, base) => { const rows = s.P[s.orders[v][0]], k = strikeAt(rows); return k < 0 ? 0 : rows[k][1] && rows[k][1] + base; };
const pulseProg = (s, pp) => { if (!pp) return 'none'; const out = []; for (let k = pp - 1; s.T.pulse[k][0] !== 0xff; k++) out.push(s.T.pulse[k]);
  return JSON.stringify(out); };
const withPulse = (pi, v, into, from, base) => { const iIn = startIns(into, v, 0), iFrom = startIns(from, v, 0);
  if (!iIn || pulseProg(into, into.instr[iIn - 1].b[3]) === pulseProg(from, from.instr[iFrom - 1]?.b[3])) return pi;
  const rows = P[pi].map(r => [...r]), k = strikeAt(rows); if (k < 0) throw new Error(`a join's voice ${v + 1} never strikes`);
  const c = instr[iIn + base - 1]; instr.push({ b: [...c.b.slice(0, 4), 0, ...c.b.slice(5)], name: c.name });
  rows[k][1] = instr.length; P.push(rows); return P.length - 1; };
const orders = [0, 1, 2].map(v => { const a = A.orders[v], b = B.orders[v].map(x => x + off.pat), n = a.length - 1;
  let bIn = withPulse(b[n], v, B, A, off.instr), aIn = withPulse(a[n], v, A, B, 0);
  if (v === 0) { bIn = withFilt(bIn, FE[1]); aIn = withFilt(aIn, FE[0]); }
  return [...a.slice(0, n), bIn, ...b.slice(1, n), aIn]; });

// ---- write ----
const out = [];
const str = (s, len) => { for (let k = 0; k < len; k++) out.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('Spell', 32); str('', 32); str('', 32);
out.push(1);
for (const o of orders) out.push(o.length + 1, ...o, 0xff, 1);
if (instr.length > 63 || P.length > 208) throw new Error(`${instr.length} instruments, ${P.length} patterns`);
out.push(instr.length);
for (const { b, name } of instr) out.push(...b, ...name);
for (const t of ['wave', 'pulse', 'filt', 'speed']) {
  if (T[t].length > 255) throw new Error(`${t} table: ${T[t].length} rows`);
  out.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1])); }
out.push(P.length);
for (const p of P) { out.push(p.length); for (const row of p) out.push(...row); }
writeFileSync(OUT, Buffer.from(out));
console.log(`${OUT}: ${out.length} bytes; ${orders[0].length} chords a lap (${INS.join(' then ')}), ` +
  `tables ${['wave', 'pulse', 'filt', 'speed'].map(t => `${t} ${T[t].length}`).join(', ')}, ${P.length} patterns, ${instr.length} instruments` +
  (sameFilt ? `; one filter program runs through (${P1}-tick loop)` : ''));
