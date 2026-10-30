// node tools/sng-keys-loose.cjs [music/keys-loose.sng] -- keys-build3 with its dyads struck by hand
// (2026-10-27). After two freer takes (song-keys-drift.mjs: "too random, rather than intentional") the
// user: "go back to the original ... the diads are varied -- that much I like. So the timing is off and
// they're not always struck together. You can even add a couple odd notes in there, out of time with the
// diads. Then (for now) leave the rolling chords alone" -- and: "the random diad placement you had was OK".
//
// So music/keys-build3.sng is copied as it is -- the bass, the noise, the rolls, the filter, the grid
// (a row is 10 ticks, a 16th) -- and only the eight dyads of passes 1 and 2 are rewritten, each in its
// own pattern pair, with keys-drift's placement:
// - the lower note near count 2 (row 8), anywhere from row LOLO to LOHI;
// - the upper note late by 0..ULATE rows -- now and then (UFIRST) EARLY instead, sometimes an octave up
//   (UOCT), sometimes not struck at all (UMISS);
// - each keyed off after 5..8 rows, to ring on in its release as before.
// THE FINE GRID (2026-10-27, the user: "the earlier version of randomized diads was better? I think they
// clustered nicely around the expected times without hitting them exactly"): keys-drift placed on a
// 1/12 s grid, keys-build3's row is a 16th (1/6 s), so an off-time note here could only land on a NEIGHBOURING
// 16th -- a different beat, not a looser one. So every pattern is DOUBLED (each row followed by an empty
// one) and the tempo halved (F0A -> F05): the same music, the same ticks, two rows a 16th. The dyad is
// then placed as keys-drift placed it: the lower note clustered about count 2 (two dice, so near more
// often than far: LOSPREAD rows either side), the upper LATE by 1..ULATE rows (or early, UFIRST), an
// octave up (UOCT) or not struck (UMISS); each keyed off after KEYON rows, ringing on in its release.
// ODD notes (ODD of them across the 8 bars): a colour tone over the bass -- the 9th over A, F, Bb and E
// (B, G, C, F#) or the major 7th over F and Bb (E, A) -- on an off-beat row of its own, well after the
// dyad, on whichever dyad voice is free. SEED rerolls; each seed is always the same song.
const fs = require('fs');
const FROMBAR_ENV = () => +(process.env.FROMBAR ?? 1);
const OUT = process.argv[2] ?? 'music/keys-loose.sng';
const env = (k, d) => process.env[k] ?? d;
// (the knobs of the first two shapes -- LOSPREAD, ULATE, UFIRST, UMISS, ODD, MORETOG, MOREODD, ODDDYAD --
// went with them; see THE DYADS AND THE ODD NOTES below)
const SEED = +env('SEED', 1), UOCT = +env('UOCT', 0.2);
const KEYON = env('KEYON', '6,14').split(',').map(Number);

const b = [...fs.readFileSync(env('FROM', 'music/keys-build3.sng'))];
let o = 4 + 96;
if (b[o++] !== 1) throw new Error('expected one subtune');
const ords = [];
for (let v = 0; v < 3; v++) { const len = b[o]; ords.push(b.slice(o + 1, o + 1 + len)); o += len + 2; }  // entries, $ff, restart
const insAt = o, nIns = b[o];
o += 1 + 25 * nIns;
for (let t = 0; t < 4; t++) o += 1 + 2 * b[o];
const sounds = b.slice(insAt, o);
const nPat = b[o++], pats = [];
for (let p = 0; p < nPat; p++) { const len = b[o]; pats.push(b.slice(o + 1, o + 1 + 4 * len)); o += 1 + 4 * len; }
// the fine grid: every pattern doubled, and the tempo command (Fxx, xx ticks a row) halved
for (const [k, p] of pats.entries()) {
  const rows = p.length / 4 - 1, out = [];
  for (let r = 0; r < rows; r++) {
    const row = p.slice(4 * r, 4 * r + 4);
    if (row[2] === 0xf) { if (row[3] % 2 || row[3] >= 0x80) throw new Error(`tempo $${row[3].toString(16)} does not halve`); row[3] /= 2; }
    out.push(...row, 0xbd, 0, 0, 0); }
  if (2 * rows > 128) throw new Error(`pattern ${k}: ${2 * rows} rows is past GoatTracker's 128`);
  pats[k] = [...out, 0xff, 0, 0, 0]; }
const insName = k => String.fromCharCode(...b.slice(insAt + 1 + 25 * (k - 1) + 9, insAt + 1 + 25 * k)).replace(/\0.*$/, '');
const I = Object.fromEntries([...Array(nIns)].map((_, k) => [insName(k + 1), k + 1]));

const REST = 0xbd, KEYOFF = 0xbe;
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const n = s => { const m = /^([A-G]#?)(\d)$/.exec(s); return 0x60 + 12 * +m[2] + NOTE[m[1]]; };
// the dyad bars: the first 8 entries of voices 2 and 3 (passes 1 and 2), each a 32-row pattern with its
// note on row 8; the bass note under each, for the odd notes
const v2 = ords[1].slice(0, -1), v3 = ords[2].slice(0, -1);
const BASS = ['A', 'F', 'Bb', 'E', 'A', 'F', 'Bb', 'E'];   // (rows below are the fine grid's: 64 a bar, the dyad on 16)
// THE ODD NOTES' POOL (2026-10-27, the user: "notes that are unexpected tones, but still in the
// chord/scale, with timing being the more variable piece ... I didn't love that F# ... try not to have an
// 'after the diad' note be the same as part of the diad before or after it"). The song's scale is A
// phrygian -- A Bb C D E F G, from the bass line A F Bb E D C -- with the E chord's own G# and B (the
// roll's B3 D E and E G# A B C D). Over each bass note, the scale tones that are NOT already sounding
// there: no bass note, no 5th, mostly nothing the obvious triad would give. Then any pitch in this bar's dyad or the
// next bar's is struck off, so an odd note never just repeats the dyad around it. (The first pool,
// before this: A B4 | F G4 E5 | Bb C5 A4 | E F#4.)
// Over A: G (b7), D (4th), B (9th -- the one tone from outside phrygian, the E chord's, heard and liked
// in the first take), F (b6). Over F: G (9th), D (6th), Bb (4th). Over Bb: C (9th), G (6th), A (maj 7th).
// Over E: G# (the E chord's 3rd, against the song's minor), A (4th), F (b9).
const ODDS = { A: ['G4', 'D5', 'B4', 'F4'], F: ['G4', 'D5', 'A#4'], Bb: ['C5', 'G4', 'A4'], E: ['G#4', 'A4', 'F4'] };
const pc = x => x % 12;
const poolFor = k => { const near = [...dyads[k], ...(dyads[k + 1] ?? [])].map(pc);
  const p = ODDS[BASS[k]].filter(nm => !near.includes(pc(n(nm))));
  if (!p.length) throw new Error(`bar ${k + 1}: every odd note is in a dyad`); return p; };
const noteAt = (p, r) => pats[p][4 * r];
const dyads = [...Array(8)].map((_, k) => {
  const lo = noteAt(v2[k], 16), hi = noteAt(v3[k], 16);
  if (lo >= REST || hi >= REST || pats[v2[k]].length / 4 - 1 !== 64) throw new Error(`bar ${k}: no dyad on row 16`);
  return [lo, hi]; });

let s = SEED >>> 0;
const rnd = () => { s = s + 0x6d2b79f5 >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const ri = (a, c) => a + Math.floor(rnd() * (c - a + 1));
const added = [];
const newPat = rows => { pats.push([...rows.flat(), 0xff, 0, 0, 0]); return pats.length - 1; };
// ---- THE DYADS AND THE ODD NOTES, third shape (2026-10-27). The two before it: a random placement of
// both notes (seed 3, liked), then extra together strikes, extra odd notes and odd notes paired ("liking
// this a bit less"). The user: "the original diad notes are basically as they originally were except
// some are together, some are a flam, and some have a larger delay, but they should all read as 'these
// two notes are falling around this first beat'. Moving one of the diad notes up an octave is acceptable.
// Then the odd notes come at a more random time between diads ... sometimes a single note, sometimes a
// flam, sometimes like two distinct notes, usually higher register than the diads."
// THE DYAD: the lower note on count 2 give or take LOJIT rows; the upper always struck, after it by
//   together 0 rows | flam 1 row | delayed 3-6 rows   (DYADMIX: their chances)
//   and an octave up with chance UOCT. Bar 1 states it plainly: together, on the beat.
// THE ODD EVENT (chance ODDP a bar, never bar 1): somewhere in the bar after both dyad notes are let go,
//   single  one note                                  | flam  two notes a row apart, one on each voice |
//   two     two notes 3-8 rows apart on the same voice (the second cuts the first)   (ODDFORM: chances)
//   Pitches from ROLLTONES (below; first poolFor's scale tones); the second note a different pitch
//   3 to 9 semitones from the first. Register: the octave above the dyads (5) with chance ODDHIGH, else
//   octave 4 -- above the dyad's E4 either way.
// ODD NOTES' PITCHES, third pool (2026-10-27, the user: "not liking the out choices in the first section
// :) choose notes from the rolls for our 'out' notes. make them out with timing rather than pitch"): the
// roll's own chord over each bass note (KROLL in song-deep.mjs), in the register above the dyads. The
// scale pool (poolFor) is no longer used for them. A note is never the dyad's exact note, this bar's or
// the next's (the register already sees to that: the dyads are octave 4, these sit above E4).
// (Then -- the user: "i think the rolls have some scale notes, not just the chord notes?" -- they do: the
// first four bars roll three notes, but Bb and E come back in the second half over the F E D A cell and
// the E G# A B C D run. So each bass note takes EVERY note the rolls play over it.)
const ROLLTONES = { A: ['A3', 'C4', 'E4'], F: ['C4', 'E4', 'F4'], Bb: ['A3', 'A#3', 'D4', 'E4', 'F4'], E: ['A3', 'B3', 'C4', 'D4', 'E4', 'G#4'] };
const nearDyad = k => [...dyads[k], ...(dyads[k + 1] ?? [])];
const LOJIT = +env('LOJIT', 2), DYADMIX = env('DYADMIX', '0.35,0.35,0.3').split(',').map(Number);
const ODDP = +env('ODDP', 0.75), ODDFORM = env('ODDFORM', '0.5,0.25,0.25').split(',').map(Number), ODDHIGH = +env('ODDHIGH', 0.8);
const choose = w => { let x = rnd() * w.reduce((a, b) => a + b, 0); return w.findIndex(v => (x -= v) < 0); };
const reg = pcName => { const nn = n(pcName.replace(/\d$/, '4')); const hi = rnd() < ODDHIGH ? nn + 12 : nn; return hi <= n('E4') ? hi + 12 : hi; };
// THE BAR'S SHAPE, fourth (2026-10-27, the user: "vibe's still not right in the first section ... it should
// be something like 1: sloppy diad 2: rest 3: off-time note (or diad) 4: maybe another off-time note (or
// diad)"). Counted from the dyad (a count is 16 rows of the fine grid, the dyad's own count 2 its "1"):
//   1  the dyad, as above (KEYON short, so it is let go by the next count)
//   2  a rest
//   3  an ODD event about count 4 of the bar: within ODDSPREAD rows of row 48, always on an ODD row --
//      between the 16ths, so it is off the grid as well as off the beat
//   4  with chance SLOT4, another 8-11 rows after it, in the same bar (first: early in the NEXT bar,
//      too close to its dyad); never in bar 8, where the rolls begin
// An event is one note, or (chance ODDDY) a loose dyad of two: the second a row or two after the first,
// on the other voice, 3-9 semitones away. Pitches from ROLLTONES, mostly the octave above the dyads.
const ODDSPREAD = +env('ODDSPREAD', 5), SLOT4 = +env('SLOT4', 0.5), ODDDY = +env('ODDDY', 0.4);
const BARS = [];
for (let k = 0; k < 8; k++) {
  // start from the original bar (its row 0 carries the filter hand-offs and the key-off after the roll)
  const R = [v2[k], v3[k]].map(p => [...Array(64)].map((_, r) => pats[p].slice(4 * r, 4 * r + 4)));
  for (const rs of R) { rs[16] = [REST, 0, 0, 0]; rs[28] = [REST, 0, 0, 0]; }
  const [lo, hi] = dyads[k];
  const rl = k === 0 ? 16 : 16 + ri(-LOJIT, LOJIT);
  const kind = k === 0 ? 0 : choose(DYADMIX), ru = rl + [0, 1, ri(3, 6)][kind];
  const up = k > 0 && rnd() < UOCT ? 12 : 0;
  R[0][rl] = [lo, I['Keys'], R[0][rl][2], R[0][rl][3]];
  R[1][ru] = [hi + up, I['Keys hi'], 0, 0];
  R[0][rl + ri(...KEYON)] = [KEYOFF, 0, 0, 0]; R[1][ru + ri(...KEYON)] = [KEYOFF, 0, 0, 0];
  BARS.push({ R, rl, line: `bar ${k + 1}: dyad rows ${rl}/${ru} (${['together', 'flam', 'delayed'][kind]}${up ? ', octave up' : ''})` });
}
// an odd event at row r of bar k, let go by row `until` (exclusive)
// THE RANGE (2026-10-27, the user: "some were too high pitched"): every note of the bass's ROLLTONES
// above the dyads' E4 and no higher than ODDMAX (E5: the octave above them), one drawn uniformly. (Was:
// octave 5 four times in five, up to Bb5 and B5.)
const ODDMAX = n(env('ODDMAX', 'E5'));
const inRange = k => ROLLTONES[BASS[k]].flatMap(nm => [0, 12, 24].map(o => n(nm.replace(/\d$/, '3')) + o))
  .filter(y => y > n('E4') && y <= ODDMAX && !nearDyad(k).includes(y)).sort((a, b) => a - b);
// (`avoid`: slot 3's note, so slot 4 moves -- the same pitch twice read as a stuck note)
let lastOdd = null;
const oddEvent = (k, r, until, avoid) => {
  const { R } = BARS[k], pl0 = inRange(k), pl = avoid === undefined ? pl0 : pl0.filter(y => y !== avoid), x = pl[Math.floor(rnd() * pl.length)];
  lastOdd = x;
  rnd();                                                   // (the old register coin: kept so the timing draws stay in step)
  const two = rnd() < ODDDY;
  const cands = pl.filter(y => y % 12 !== x % 12 && Math.abs(y - x) >= 3 && Math.abs(y - x) <= 9);
  const y = two && cands.length ? cands[Math.floor(rnd() * cands.length)] : null, r2 = r + ri(1, 2);
  R[1][r] = [x, I['Keys hi'], 0, 0]; R[1][Math.min(until - 1, r + 8)] = [KEYOFF, 0, 0, 0];
  if (y !== null) { R[0][r2] = [y, I['Keys'], 0, 0]; R[0][Math.min(until - 1, r2 + 8)] = [KEYOFF, 0, 0, 0]; }
  return `$${x.toString(16)}${y !== null ? `+$${y.toString(16)}` : ''} row ${r}`; };
// SLOT 4 IN THE SAME BAR (2026-10-27, the user: "some of the notes came too close to the next diad"):
// it was early in the NEXT bar, under a second before that bar's dyad; it is now 8-11 rows after slot 3,
// still in this bar, and both are let go by the bar line -- the next dyad is then at least a count away.
for (let k = 0; k < 8; k++) {
  let r3 = 48 + ri(-ODDSPREAD, ODDSPREAD); if (r3 % 2 === 0) r3 += r3 < 48 ? 1 : -1;
  if (k < 7 && rnd() < SLOT4) {
    r3 = Math.min(r3, 49);                                  // room for slot 4 after it
    let r4 = r3 + ri(8, 11); if (r4 % 2 === 0) r4++;
    BARS[k].line += `; 3: ${oddEvent(k, r3, r4)}`; BARS[k].line += `; 4: ${oddEvent(k, r4, 64, lastOdd)}`; }
  else BARS[k].line += `; 3: ${oddEvent(k, r3, 64)}`;
}
// ---- BY HAND (2026-10-28): the user now edits the SEED=3 draw note by note ("Show me the list of diads
// and off notes ... and I'll give you some adjustments"). Each edit names the row it expects to find, so
// a changed draw under it fails here instead of moving the wrong note. Rows are the bar's 0-63; voice 0
// is the lower dyad voice, 1 the upper. HAND=0 leaves the draw as it fell.
const THEORY = env('THEORY', '0') === '1';
const HAND = !THEORY && env('HAND', '1') === '1';
const at = (k, v, r) => BARS[k - 1].R[v][r];
const want = (k, v, r, nt) => { if (at(k, v, r)[0] !== n(nt)) throw new Error(`HAND: bar ${k} voice ${v} row ${r} is not ${nt}: the draw changed`); };
const move = (k, v, from, to, nt, len) => { want(k, v, from, nt); const R = BARS[k - 1].R[v];
  const off = R.findIndex((x, r) => r > from && x[0] === KEYOFF);
  R[to] = R[from]; R[from] = [REST, 0, 0, 0]; R[off] = [REST, 0, 0, 0]; R[to + len] = [KEYOFF, 0, 0, 0]; };
// bend: a channel's own tempo over a run of rows, which must add up to 5 a row (the grid's) -- the voice
// is back in step after it. A channel tempo STAYS until the next one, so the run must end on a 5: if the
// last row given is not one, the row after it gets it. (2026-10-28: bar 5's bend ended on 7 and the
// upper voice ran at 7 ticks a row from there on -- the rolls' echo, on that voice, fell out of step.)
const bend = (k, v, rows) => {
  if (rows.at(-1)[1] !== 5) rows = [...rows, [rows.at(-1)[0] + 1, 5]];
  if (rows.reduce((a, [, t]) => a + t, 0) !== 5 * rows.length || rows.some(([, t]) => t < 3)) throw new Error(`HAND: bar ${k} bend is off the grid`);
  for (const [r, t] of rows) { const x = at(k, v, r);
    if (x[2]) throw new Error(`HAND: bar ${k} voice ${v} row ${r} has a command`); x[2] = 0xf; x[3] = 0x80 | t; } };
const put = (k, v, r, nt, off) => { const R = BARS[k - 1].R[v];
  if (R[r][0] < REST || R[off][0] < REST) throw new Error(`HAND: bar ${k} voice ${v} rows ${r}/${off} are taken`);
  R[r] = [n(nt), I[v ? 'Keys hi' : 'Keys'], 0, 0]; R[off] = [KEYOFF, 0, 0, 0]; };
if (HAND) {
  // bar 2 (the user: "tighten the delay on bar 2 diad without making it a flam"): upper E4 18 -> 16,
  // two rows after the lower C4 at 14 (a flam is one), held its drawn 8 rows
  move(2, 1, 18, 16, 'E4', 8);
  // (then "make the diad of bar 2 a little bit tighter": tighter than two rows (10 ticks) but looser than
  // a flam's one (5) is finer than the grid, so the upper voice's own clock bends -- FXY with Y >= $83 is
  // a tempo for that channel alone: rows 14-17 last 3+4+8+5 ticks, the same 20 as four rows of 5, so the
  // voice is back on the grid by row 18 and the E4 strikes 7 ticks after the C4. (A tempo takes the row
  // it is on: gplay.c runs the row's command on its tick 0 and reloads the counter from the channel's
  // tempo on the tick after.) The player stops the song if the gate timer (2) is not under a bent row's
  // length -- the hard restart -- so 3 is the shortest a row may be.)
  bend(2, 1, [[14, 3], [15, 4], [16, 8], [17, 5]]);
  // ("add another note above and after the E5 in bar 2, later than the second note in the first bar"):
  // bar 1's second off note is E5 at 59; F5 -- the bass F's own note, the one roll tone above E5.
  // (Was row 61; then "a little later still": 63; then "a bit earlier (I guess 62?)": row 62, keyed off
  // two rows on -- row 0 of bar 3, the gate it had at 61 -- so it rings out on its release into bar 3.)
  want(2, 1, 47, 'E5');
  if (at(2, 1, 62)[0] < REST || at(3, 1, 0)[0] !== REST) throw new Error('HAND: bar 2 row 62 or bar 3 row 0 is taken');
  BARS[1].R[1][62] = [n('F5'), I['Keys hi'], 0, 0]; BARS[2].R[1][0] = [KEYOFF, 0, 0, 0];
  BARS[1].line += ' | by hand: upper E4 18->16, 7 ticks after the lower; + F5 row 62';
  // bar 5 (the user: "bring bar 5's diad closer together"): it was a flam, C4 at 18 and E4 at 19 -- 5
  // ticks. The upper voice's row 18 bent to 3 ticks (the shortest), row 19 to 7: the E4 3 ticks after.
  // (then "is the bar 5 diad late as a whole? ... it should be a bit closer to in time to re-establish
  // the base before we go back to out-of-time notes. And maybe a flam": it was -- the draw put the C4 two
  // rows (10 ticks) after the beat. Now C4 on the beat, row 16, and the E4 a flam after it, row 17: one
  // row, 5 ticks. No bend. Both keep their drawn lengths, 8 and 14 rows.)
  move(5, 0, 18, 16, 'C4', 8); move(5, 1, 19, 17, 'E4', 14);
  // ("try a different note for the off note in bar 5"): E5 -> A4, the bass's own note -- bar 1, over the
  // same A, already had C5 and E5
  want(5, 1, 49, 'E5'); at(5, 1, 49)[0] = n('A4');
  // ("bar 5 - add a note before the A4"): C5 at 41, 8 rows ahead, on the LOWER voice (free after the
  // dyad's C4 lets go at 26) so the A4 does not cut it -- it falls a third into the A4. C5: the one
  // roll tone over A between them in this register but E5, which the A4 replaced.
  // (then "move the C5 and A4 in bar 5 a smidge earlier": two rows each, C5 41 -> 39 and A4 49 -> 47)
  put(5, 0, 39, 'C5', 47); move(5, 1, 49, 47, 'A4', 8);
  BARS[4].line += ' | by hand: dyad on the beat, 16/17; + C5 row 39; off E5 -> A4 row 47';
  // bar 6 (the user: "move the e5 closer to the C... i'm thinking maybe try having 4-6 ascending notes in
  // bar 6 sort of evenly spaced"): the octave-up E5 comes down to E4, by the C4 (still a flam, 17/18),
  // and the dyad starts a climb through the roll's notes over F -- C E F, the only ones it has --
  // F4 C5 E5 F5, ten rows apart on odd rows (27 37 47 57), the voices taking turns so each note rings
  // on its release under the next: six notes up from the C4. The off F4 at 53 goes (the climb has it).
  want(6, 1, 18, 'E5'); at(6, 1, 18)[0] = n('E4');
  want(6, 1, 53, 'F4'); at(6, 1, 53)[0] = REST; at(6, 1, 61)[0] = REST;
  if (at(6, 1, 30)[0] !== KEYOFF) throw new Error('HAND: bar 6 upper dyad note is not let go at 30');
  // (then "push the four post-diad notes in bar 6 to start a little later and be closer together. the F5
  // can be in the same place, just tighten the other three notes up toward it": eight rows apart, not
  // ten -- 33 41 49 57, from 27 37 47 57)
  // (then "on bar 6 if the last higher note can be something different than what we hit in bar 2 ... is
  // there a note that works there that gives it a different flavor?": F5 -> G5, the 9th over F -- off the
  // rolls' notes (C E F) but in the song's scale; over the bass F with the C and E below it, Fmaj9, open
  // where bar 2's F5 was the root)
  [[0, 33, 'F4'], [1, 41, 'C5'], [0, 49, 'E5'], [1, 57, 'G5']].forEach(([v, r, nt]) => put(6, v, r, nt, Math.min(r + 8, 63)));
  BARS[5].line += ' | by hand: upper E5 -> E4; climb F4 C5 E5 G5 at 33 41 49 57 (off F4 gone)';
  // bar 7 (the user: "at the end of bar 6 there's a nice note that we could resolve to ... coming down
  // from the highest last note in that sequence, maybe hit that note as part of the diad instead of
  // whatever the top note of the flam is now"): bar 6's climb ends on G5; the step down from it is F5 --
  // the 5th of bar 7's bass Bb and one of the rolls' notes over it. The dyad's upper E4 becomes F5: D4 +
  // F5 over the Bb is the plain Bb major triad, the resolution, in the octave-up shape bar 8 also uses.
  // Timing as drawn (together, row 14).
  want(7, 1, 14, 'E4'); at(7, 1, 14)[0] = n('F5');
  BARS[6].line += ' | by hand: upper E4 -> F5 (the step down from bar 6\'s G5)';
  // bar 8 (the user: "add one more flam of out notes in bar 8 after the one there"): the drawn flam is
  // D5 at 43 then B4 at 45; the new one steps down a tone behind it, C5 at 55 then G#4 at 56 -- a flam
  // (one row), each voice the one it had, let go by the bar line. G#4 is the E chord's own third: the
  // leading tone into the rolls' A.
  // (then "not quite right. maybe just keep one of the notes from the flam (one seems out of tune, so keep
  // the more in-tune one)": the C5 goes. It came in while the B4 below it was still ringing on its
  // release -- a semitone rubbing against it -- and C natural over the E chord is its augmented 5th; the
  // G#4 is the chord's third.)
  want(8, 1, 43, 'D5'); want(8, 0, 45, 'B4');
  // BARS 7 AND 8 LEAN INTO THE ROLLS (the user: "for 7 and 8 we may want to add more increasingly in-time
  // notes, a bit more often, sort of anticipating the arrival of the rolls? so 7 gets maybe a descending
  // line on or near most quarter notes, and bar 8 gets a few more"). A beat is 16 rows: 0 16 32 48.
  // Bar 7: from the dyad's F5 (row 14, two early) down through the rolls' notes over Bb -- E5 at 31, D5 at
  // 47 (each a row early), A#4 at 62 (two early for bar 8's downbeat) -- the voices taking turns so each
  // rings under the next, the last let go in bar 8. Its two drawn off notes (A#4 49, E5 59) go.
  want(7, 1, 49, 'A#4'); want(7, 1, 59, 'E5');
  for (const r of [49, 57, 59, 63]) at(7, 1, r)[0] = REST;
  put(7, 0, 31, 'E5', 39); put(7, 1, 47, 'D5', 55); put(7, 0, 62, 'A#4', 63);
  at(7, 0, 63)[0] = REST; if (at(8, 0, 6)[0] !== REST) throw new Error('HAND: bar 8 voice 0 row 6 is taken');
  at(8, 0, 6)[0] = KEYOFF;
  BARS[6].line += '; line E5 31, D5 47, A#4 62 (off notes gone)';
  // Bar 8 kept its flam and its G#4 and gained A4 on beat 3 (row 32) and E5 at 60 over the G#4; then
  // (the user: "make the bar 8 notes be individual notes instead of flams or whatever"): the same five
  // notes one at a time, ON the 8th-note grid from beat 3 -- A4 32, D5 40, B4 48, G#4 56 -- and the E5
  // a 16th after, at 60: bar 7 had quarters a row early, bar 8 has 8ths dead on, the rolls 16ths. The
  // voices take turns, so no note cuts the one before it. (The dyad keeps its flam.)
  for (const [v, r] of [[1, 43], [1, 51], [0, 45], [0, 53]]) at(8, v, r)[0] = REST;
  [[0, 32, 'A4', 40], [1, 40, 'D5', 48], [0, 48, 'B4', 56], [1, 56, 'G#4', 60], [0, 60, 'E5', 63]]
    .forEach(([v, r, nt, off]) => put(8, v, r, nt, off));
  BARS[7].line += ' | by hand: drawn flam gone; A4 32, D5 40, B4 48, G#4 56, E5 60';
}
// ---- THEORY=1: THE FIRST SECTION COMPOSED, NOT DRAWN (2026-10-28, the user: "take some post-modern music
// theory and adjust all the notes in the first part (diads and out notes) ... to be more in-line of
// music theory and musicality ... they're maybe a bit more random and a bit less musical. I don't mean
// they need to be in time, but the timing can be more musically directed. I want to see if it sounds
// better or worse than this version"). A separate take (music/keys-theory.sng); HAND's version stands.
// THE HARMONY. A F Bb E is i - bVI - bII - V in A: the Neapolitan (Bb) falling a tritone to the
// dominant. E is in all four chords -- the 5th of Am, the maj7 of F, the #11 of Bb, the root of E -- so
// the dyad's E4 is a COMMON-TONE PEDAL whose meaning changes under it while the lower voice moves C C D D
// by step. The dyads keep those notes.
// THE MOTIF is the pianto, the falling semitone sigh, in the rhythm of the bars the user liked best
// (3 and 4: Bb -> A, C -> B): an entry off the grid at row 49 and its resolution an 8th later at 57.
//   bar 1 (A)  F5 -> E5   b6 -> 5 of A
//   bar 2 (F)  E5 -> F5   the INVERSION, augmented: the rising leading tone, the sigh answered.
//                         (The E5 was at 47, as the user placed it -- "the same timing as the first out
//                         note in bar 1" (F5 at 49). Now 39: bar 1's sigh LAGS the beat at 48; the
//                         answer LEADS the 8th at 40, a row ahead, and holds 12 rows -- the F5 at 62
//                         arrives long after, so the answer is stretched further: 23 rows, not 15)
//   bar 3 (Bb) Bb4 (+D5) -> A4   b2 -> 1 of A: the Neapolitan's own pull
//   bar 4 (E)  C5 -> B4   b6 -> 5 of E: bar 1's motif a fifth down -- the phrase rhymes
//              (B4 at 57, the motif's rhythm; the dyad an early flam. Briefly put back to the user's own bar
//              4 on "keep bar 4 the same as it was" -- which meant THIS bar, as it was before bar 5 changed)
// Phrase 2 develops it and converges on the rolls:
//   bar 5 (A)  C5 (+E5) B4 A4   the sigh extended into a falling line, 8th to 8th, and (to "make bar
//                         5 stand out a bit" from bar 4's C5 B4) its first note struck as a loose dyad,
//                         E5 three rows behind the C5 and held over the B4 -- the line moves under a
//                         note that stays. (All three in thirds, a flam apart, was "a bit too much
//                         regular going on")
//                         (Tried and dropped: G#4-A4 grace, E5 alone -- "doesn't sound quite as good")
//   bar 6 (F)  F4 C5 E5 G5   the climb (the user's), contrary motion to bar 5; G5 the 9th
//   bar 7 (Bb) dyad D4 + F5: G5 -> F5 is the pianto again ACROSS the bar line, at phrase scale; then
//              E5 D5 A#4 on (nearly) the quarters
//   bar 8 (E)  A4 resolves the A#4 -- Bb A G# is the passus duriusculus, the chromatic lament, spread
//              over two bars -- then B4 D5 B4 G#4 E5, the E7's notes, in 8ths then 16ths: the rhythm
//              ACCELERATES into the rolls' 16ths, and G#4 is the leading tone to their A
// THE DYADS' TIMING follows the tension, not the dice: the tonic (bar 1) together on the beat; bar 2 a
// little apart (7 ticks); the Neapolitan (bar 3), the most remote chord, the most apart (3 rows); the
// dominant (bar 4) a flam ahead of the beat, leaning in. Phrase 2 converges: flam, 3 ticks, together,
// together -- dyads and line both reach the grid by bar 8, where the rolls take over.
// [voice, row, note, row let go (64+ = the next bar's)]; voice 0 the lower, 1 the upper
// SCOREDRAG: [bar, voice, row] -- notes dragged 3 ticks behind the grid (THEORYEND=build)
const SCOREDRAG = [];
const SCORE = [
  /* 1 */ [[0, 16, 'C4', 24], [1, 16, 'E4', 28], [1, 49, 'F5', 57], [0, 57, 'E5', 63]],
  /* 2 */ [[0, 14, 'C4', 21], [1, 16, 'E4', 24], [1, 39, 'E5', 51], [1, 62, 'F5', 64]],
  /* 3 */ [[0, 16, 'D4', 24], [1, 19, 'E4', 29], [1, 49, 'A#4', 56], [0, 50, 'D5', 58], [1, 57, 'A4', 63]],
  /* 4 */ [[0, 15, 'D4', 24], [1, 16, 'E4', 26], [1, 49, 'C5', 57], [0, 57, 'B4', 63]],
  /* 5 */ [[0, 16, 'C4', 24], [1, 17, 'E4', 29], [0, 39, 'C5', null], [1, 42, 'E5', 52], [0, 47, 'B4', null], [0, 55, 'A4', 63]],
  /* 6 */ [[0, 16, 'C4', 24], [1, 17, 'E4', 29], [0, 33, 'F4', 41], [1, 41, 'C5', 49], [0, 49, 'E5', 57], [1, 57, 'G5', 63]],
  /* 7 */ [[0, 16, 'D4', 24], [1, 16, 'F5', 28], [0, 31, 'E5', 39], [1, 47, 'D5', 55], [0, 62, 'A#4', 70]],
  /* 8 */ [[0, 16, 'D4', 24], [1, 16, 'E5', 26], [0, 32, 'A4', 40], [1, 40, 'B4', 48], [0, 48, 'D5', 52], [1, 52, 'B4', 56], [0, 56, 'G#4', 60], [1, 60, 'E5', 63]]];
// THE LEAD-IN, STRAIGHTENED (heard: "in bar 8 at the end there are a few notes that lead into the rolls,
// and it somehow picks up a bit of a swing feel, which feels out of place. those notes leading into should
// be more straight.... maybe even the last two bars before the rolls start could be 1 2 3 rest 1 2 3 rest
// ROLLS"). The swing: bar 7's line a row AHEAD of each beat (31 47 62), then 8ths turning into 16ths, the
// notes alternating between the two voices' instruments -- a long-short lilt. THEORYEND picks:
//   straight  bar 7's line ON the beats (E5 32, D5 48, the A#4 on bar 8's downbeat); bar 8 even 8ths from
//             beat 3, A4 B4 D5 G#4, all on the upper voice so every note is articulated alike
//   123       bars 7 and 8 in quarters, beats 1 2 3 and a rest on 4, the dyad on beat 2 of each:
//             G5 (bar 6) -> F5 | D4+E5 | D5 | -- || A#4 | D4+A4 | G#4 | -- || ROLLS
//             the top line falls by step -- F E D, then the lament Bb A G# -- and bar 8's dyad D+A over
//             E is a suspension (the 4th) that the G# resolves; the rolls' A answers the G#
//   roll      (then: "I actually meant the last two... measures? of bar 8 that maybe the notes should reach
//             the speed of the rolls and play 123rest 123rest rolls. But I like what you have here for bar 7
//             and the first half of bar 8"): 123's bars 7 and 8 up to the G#4 on beat 3; then the last
//             two 4-note groups of the bar (rows 48-63) at the ROLLS' speed, a note every 2 rows -- three
//             struck, one rest, twice: E4 G#4 B4 . G#4 B4 D5 . -- the E7 climbing in the rolls' own shape
//             (their first group is A3 C4 E4: low, middle, high), the second group a third above the first,
//             and the rolls' A minor answers it.
//             (Heard: "i'm not hearing the rolls at the end of bar 8 at all?" -- on 'Keys hi' they could not
//             sound: its wavetable waits 2 ticks before the triangle starts and the hard restart takes the
//             gate 2 before the next note, so a 2-row note let go after one row had about two ticks of
//             sound, at sustain 2. Now they are played on the ROLL's own instrument, the lower voice --
//             'Roll': attack 0, sustain 6, no hard restart, the triangle the rolls began as -- each note
//             running into the next as in the rolls, let go only on the rest rows.)
//             (Then: "they sound different from the instrument used for the diads and out notes -- but it
//             should just be a continuation of those with the same sound and volume ... that same
//             instrument building up": 'Keys', the lower voice's own -- the same triangle and envelope as
//             'Keys hi' without its 2-tick wait -- so its hard restart still gets 8 of each note's 10
//             ticks.)
//   build     (then: "I like how bar 7 feels like it's building towards something, but then 8 is too empty
//             as it starts and at the end to straight and still to sparse. I want to do something there
//             that continues bar 7's build"): bar 8 SUBDIVIDES, a beat at a time, on one voice and the
//             grid -- 8ths, 8ths, 16ths, then the rolls' own speed -- until it IS a roll:
//               beat 1  A#4 A4      8ths: bar 7's falling line goes on, the lament Bb A ...
//               beat 2  G#4 B4      ... G# (the dyad's D4 under it) and the turn upward
//               beat 3  E4 G#4 B4 D5   16ths: the E7 from the bottom
//               beat 4  G#4 B4 D5 E5, then F5 HELD   the rolls' speed and their shape for half a beat --
//                       the E7 rolled as they roll their chords -- then (the user: "I wonder if we need to
//                       add a held note at the end of bar 8 (after some of those unfiltered triangle rolls)
//                       to create a tension gap for the rolls to come in from?") one note held for the
//                       last 8 rows: F5, the b9 over E -- the E7b9, the hardest pull to A minor the
//                       song's scale has, and bar 1's sigh (F5 -> E5) waiting to be answered. The
//                       rolls' first note (A3, the same voice) cuts it.
//             (Then: "i wonder if we can make 8 feel a little less regular?" -- the subdividing kept, the
//             even spacing broken: uneven groups, not long-short pairs, which read as swing:
//               beat 1  A#4 @0, A4 @6        6 rows, not 8
//               beat 2  G#4 @12, B4 @22     the G# 4 rows AHEAD of the dyad's D4 (still on 16)
//               beat 3  E4 @32, G#4 @36, B4 @38, D5 @44   4 2 6: the 16ths bunch, then hang
//               beat 4  G#4 B4 D5 E5 @48-54 as the rolls, and the held F5 a row LATE, at 57 -- a
//                       catch of breath before it holds. Was: 0 8 16 24 | 32 36 40 44 | 48-54 | 56.)
//             (Then: "maybe make 8 a little more sparse (i know i asked for the opposite before, i just think
//             it was the wrong direction)": 13 notes -> 9, the shape kept -- the fall A#4 A4 G#4 as it was;
//             the B4 after it gone, so the D4 dyad and the G# hang for 20 rows; the climb two notes (E4,
//             G#4 @38) not four; the run at the rolls' speed three (B4 D5 E5 @50-54), not four; the F5.)
//             (Then: "Make bar 8 more like bar 7, with slightly different notes and maybe an extra note or
//             two": bar 7's frame -- quarters on beats 1 2 3, the dyad on 2, each note let go after 12 rows,
//             the voices taking turns -- with the lament in it, A#4 | D4+A4 | G#4, the A over E a 4th the
//             G# resolves; then the extras: B4 an 8th after the G#, and beat 4 not a rest but the held F5
//             (the b9, a row late), cut by the rolls.)
//             (Then: "2 more notes in the second half of bar 7, and lose the last note in bar 8": bar 7's
//             beat 4 rest becomes F4 @42 and A4 @50 -- the Bb chord's 5th and maj7, each a row or two
//             behind its 8th, low, under the line -- and the A4 is the leading tone up into bar 8's A#4.
//             Bar 8 ends on the B4; its beat 4 is the rest bar 7's was, the gap before the rolls.)
//             (Then: "the new notes in bar 7 should follow that descending line set up in the first part of
//             bar 7 and bridge to the notes in bar 8": F5 E5 D5 goes on down, C5 @42 and B4 @54, into bar
//             8's A#4 A4 G#4 -- C B Bb A G#, the chromatic lament (passus duriusculus) the section has been
//             pointing at, whole, from bar 7's beat 3 to bar 8's. The B natural over the Bb bass is a
//             chromatic passing note. The C5, the B4 and bar 8's A#4 on one voice, each cut by the next, so
//             no two of them ring together.)
//             (Then: "bar 7->8 notes good, but rhythm is not quite right. they should be in time but
//             dragging?": the line put ON a grid -- quarters F E D C, then 8ths B | Bb A G# B, bar 8's
//             shape -- and every line note DRAGGED, 3 ticks (50 ms) behind its row, the same amount each
//             time: laid back, not late. The dyads' lower notes stay on the beat, so the drag is felt
//             against them. A drag is a bend of the voice's clock around the note: the row before 8
//             ticks, the note's row 3, the row after 4 -- 15, three rows' worth, so the voice is back in
//             step after it.)
//             (That drag LEFT THE VOICE AT 4 TICKS A ROW -- 8 3 4 never came back to 5 -- so it ran fast
//             from each drag on, and from bar 8's last one into the rolls: "the rolling ... is now racing
//             along". The drag rows now end on a 5. And then, of the feel: "i may not mean on grid with a
//             small delay. i might mean on grid a beat late?": the drag is gone; the line is DISPLACED a
//             16th (4 rows) -- each note on the grid, but a 16th behind where the beat says it belongs,
//             so it always seems to arrive after the music it is following. The dyads' D4s stay on the
//             beat, so bar 7's E5 and bar 8's A4 fall a 16th after their dyad's lower note.)
const THEORYEND = env('THEORYEND', 'build');
if (THEORYEND === 'straight') {
  SCORE[6] = [[0, 16, 'D4', 24], [1, 16, 'F5', 28], [0, 32, 'E5', 44], [1, 48, 'D5', 60]];
  SCORE[7] = [[0, 0, 'A#4', 12], [0, 16, 'D4', 24], [1, 16, 'E5', 26], [1, 32, 'A4', 39], [1, 40, 'B4', 47], [1, 48, 'D5', 55], [1, 56, 'G#4', 63]]; }
else if (THEORYEND === '123') {
  SCORE[6] = [[1, 0, 'F5', 12], [0, 16, 'D4', 28], [1, 16, 'E5', 28], [0, 32, 'D5', 44]];
  SCORE[7] = [[1, 0, 'A#4', 12], [0, 16, 'D4', 28], [1, 16, 'A4', 28], [0, 32, 'G#4', 44]]; }
else if (THEORYEND === 'roll') {
  SCORE[6] = [[1, 0, 'F5', 12], [0, 16, 'D4', 28], [1, 16, 'E5', 28], [0, 32, 'D5', 44]];
  SCORE[7] = [[1, 0, 'A#4', 12], [0, 16, 'D4', 28], [1, 16, 'A4', 28], [0, 32, 'G#4', 44],
              ...[['E4', 48], ['G#4', 50], ['B4', 52], ['G#4', 56], ['B4', 58], ['D5', 60]]
                .map(([nt, r]) => [0, r, nt, r % 8 === 4 ? r + 2 : null])]; }
else if (THEORYEND === 'build') {
  const LATE = +env('LINELATE', 4), DRAG = env('LINEDRAG', '0') === '1';
  SCORE[6] = [[1, LATE, 'F5', LATE + 12], [0, 16, 'D4', 28], [1, 16 + LATE, 'E5', 28 + LATE], [0, 32 + LATE, 'D5', 44 + LATE], [1, 48 + LATE, 'C5', null], [1, 56 + LATE, 'B4', null]];
  SCORE[7] = [[1, LATE, 'A#4', LATE + 12], [0, 16, 'D4', 28], [1, 16 + LATE, 'A4', 28 + LATE], [0, 32 + LATE, 'G#4', 44 + LATE], [1, 40 + LATE, 'B4', 52 + LATE]];
  if (DRAG) SCOREDRAG.push(...[[7, 1, 0], [7, 1, 16], [7, 0, 32], [7, 1, 48], [7, 1, 56], [8, 1, 0], [8, 1, 16], [8, 0, 32], [8, 1, 40]].map(([k, v, r]) => [k, v, r + LATE])); }
else if (THEORYEND !== 'accel') throw new Error('THEORYEND: build, roll, straight, 123 or accel (the first take)');
// the sub-row gaps, as HAND's: bar 2's E4 7 ticks after the C4 (rows 14-17 of the upper voice: 3 4 8 5);
// bar 6's 3 ticks (row 16 of the upper voice 3, row 17 7, back to 5)
const SCOREBEND = [[2, [[14, 3], [15, 4], [16, 8], [17, 5]]], [6, [[16, 3], [17, 7], [18, 5]]]];
if (THEORY) {
  for (const { R } of BARS) for (const rs of R) for (let r = 1; r < 64; r++) rs[r] = [REST, 0, 0, 0];
  // (a fifth field names another instrument; a null release leaves the note to the next one's strike)
  SCORE.forEach((ev, k) => { for (const [v, r, nt, off, ins] of ev) {
    const R = BARS[k].R[v];
    if (R[r][0] !== REST) throw new Error(`THEORY: bar ${k + 1} voice ${v} row ${r} is taken`);
    R[r] = [n(nt), I[ins ?? (v ? 'Keys hi' : 'Keys')], 0, 0];
    if (off === null) continue;
    const [kk, rr] = off < 64 ? [k, off] : [k + 1, off - 64];
    if (BARS[kk].R[v][rr][0] < REST) throw new Error(`THEORY: bar ${k + 1}'s ${nt} is let go on a note`);
    BARS[kk].R[v][rr] = [KEYOFF, 0, BARS[kk].R[v][rr][2], BARS[kk].R[v][rr][3]]; } });
  for (const [k, rows] of SCOREBEND) for (const [r, t] of rows) { const x = BARS[k - 1].R[1][r]; x[2] = 0xf; x[3] = 0x80 | t; }
  // a drag: rows r-1, r, r+1, r+2 of the voice at 8 3 4 5 ticks (20 = 4 x 5), the last putting the
  // voice's tempo BACK to 5 -- a channel tempo stays until the next; the bar before's last row when r is 0
  for (const [k, v, r] of SCOREDRAG) {
    if (BARS[k - 1].R[v][r][0] >= REST) throw new Error(`THEORY: no note to drag at bar ${k} voice ${v} row ${r}`);
    [[-1, 8], [0, 3], [1, 4], [2, 5]].forEach(([d, t]) => { const rr = r + d, x = rr < 0 ? BARS[k - 2].R[v][64 + rr] : BARS[k - 1].R[v][rr];
      if (x[2]) throw new Error(`THEORY: bar ${k} voice ${v} row ${rr} already has a command`); x[2] = 0xf; x[3] = 0x80 | t; }); }
  BARS.forEach((b, k) => { b.line = `bar ${k + 1} (THEORY): ${SCORE[k].map(([, r, nt]) => `${nt}@${r}`).join(' ')}`; }); }
for (let k = 0; k < 8; k++) { added.push(BARS[k].line); v2[k] = newPat(BARS[k].R[0]); v3[k] = newPat(BARS[k].R[1]); }
// ---- PULSE ROLLS (2026-10-27, the user: "make the rolling chords be dynamic pulse going through the
// filter"). The Roll and its echo change from triangle to PULSE, each note with a quick width sweep (the
// pulse table restarts every note, so each 16th "opens": the roll's own 12% -> 36%, the echo's 50% -> 27%,
// over its ten ticks), and pass 3 hands the filter a program of its own: voices 1-3 routed in (the roll,
// the echo AND the bass, which is already in), resonance ROLLRES, the cutoff climbing ROLLCUT's range in
// stairs of 4 over the first half of the pass and back down over the second. Pass 1's own hand-off (A01)
// puts the routing back to the bass alone.
const ROLLPULSE = env('ROLLPULSE', '1') === '1';
// (2026-10-27, the user: "open the filter sweep a bit once the rolls come in ... bump it up by about $20":
// was 18,78)
// (then: "open up the bottom end more, but not the top end -- maybe $58-$98? ... have it roll up and down
// more than once ... Maybe twice and a half so that it starts at $58 but finishes at $98": ROLLCYCLES,
// up-and-downs over the pass; its half-cycles are the LEGS, alternating up and down from the first, and
// the program stops where the last one ends)
const ROLLCYCLES = +env('ROLLCYCLES', 2.5);
const ROLLCUT = env('ROLLCUT', '58,98').split(',').map(x => parseInt(x, 16)), ROLLRES = parseInt(env('ROLLRES', 'a'), 16);
if (ROLLPULSE) {
  // the four tables, as [left, right] rows, rebuilt into `sounds` at the end
  let q = 1 + 25 * nIns;
  const T = [];
  for (let t = 0; t < 4; t++) { const nn = sounds[q]; T.push([...Array(nn)].map((_, i) => [sounds[q + 1 + i], sounds[q + 1 + nn + i]])); q += 1 + 2 * nn; }
  const add = (t, rows) => { const at = T[t].length + 1; T[t].push(...rows); return at; };
  // TIMBRE BY THE BEAT (2026-10-27, the user: "how the rolls would sound if sometimes it switched to
  // triangle or saw? or maybe instead of sweeping the pulse it shifted for each four note section? It
  // doesn't have to change every time, but throw in a 4-note-tri run and then a sharp 4-note-saw run").
  // Each beat (4 16ths) of pass 3 is one timbre: a PULSE at one of PWIDTHS, which steps to a neighbouring
  // width at the beat line with chance PSHIFT -- or, in TSBARS, one TRIANGLE beat (the bar's 3rd or 4th)
  // and a SAW beat 2-3 beats after it. One instrument per timbre, the Roll's bytes with its wave and
  // pulse pointers changed, and an echo twin from 'Roll echo': the echo of a note takes that note's timbre.
  const PWIDTHS = env('PWIDTHS', '300,500,700,900').split(',').map(x => parseInt(x, 16));
  const PSHIFT = +env('PSHIFT', 0.5), TSBARS = env('TSBARS', '2,5,7').split(',').map(Number);
  // TIMBREPLAN: the beats' timbres as written (1-4 the widths, T, S; a word a bar) -- the plan the dice
  // gave the take the user approved ("pretty good"), kept when the dyads' draws changed under it.
  // TIMBREPLAN=random draws a new one.
  // (2026-10-27: the first bar was tried all TRIANGLE, "to smooth the transition from the first section"
  // -- "the wrong move, revert that")
  // (2026-10-28: tried a different timbre every beat -- thin $140, medium $400, square $800, tri, saw,
  // no beat repeating the one before: TIMBREPLAN='312T3S12 3T1S231T 2S31T2S3 12T3S132 T1S23T21 S321TS3T
  // 213ST21S 3T21S3T2' PWIDTHS=140,400,800. The user: "I think i like keys-pulse-pw4 best for the rolling
  // section. Let's lock that in" -- the plan below, LOCKED.)
  const TIMBREPLAN = env('TIMBREPLAN', '22222222 23T44S33 43332333 33233334 32T32S12 11111111 21T1S111 12344432');
  // ROLL VOLUME (2026-10-27, the user: "when the filter clamps down the difference between the
  // tri/saw/pulse is not noticeable as they all get clipped and that becomes the character. Is it possible
  // to lower the volume of those notes so the filter saturates less?"): the sustain trick -- AD 00 reaches
  // its peak in 2 ms and decays to the sustain in 6, so the SUSTAIN is the note's level. Roll a -> ROLLSUS,
  // echo 5 -> ECHOSUS; the last note's 6XY (sustain + release B, the tail into pass 1) follows.
  const ROLLSUS = parseInt(env('ROLLSUS', '6'), 16), ECHOSUS = parseInt(env('ECHOSUS', '3'), 16);
  for (const [nm, sus] of [['Roll', ROLLSUS], ['Roll echo', ECHOSUS]]) { const at = 1 + 25 * (I[nm] - 1) + 1; sounds[at] = sus << 4 | sounds[at] & 0x0f; }
  for (const [p, sus] of [[v2[15], ROLLSUS], [v3[15], ECHOSUS]]) {
    const q = pats[p] = [...pats[p]];
    for (let r = 0; r < 64; r++) if (q[4 * r + 2] === 0x6) q[4 * r + 3] = sus << 4 | q[4 * r + 3] & 0x0f; }
  const W_PUL = add(0, [[0x41, 0x00], [0xff, 0x00]]), W_TRI = add(0, [[0x11, 0x00], [0xff, 0x00]]), W_SAW = add(0, [[0x21, 0x00], [0xff, 0x00]]);
  const timbres = [...PWIDTHS.map(w => ({ nm: `pw ${w.toString(16)}`, wp: W_PUL, pp: add(1, [[0x80 | w >> 8, w & 0xff], [0xff, 0x00]]) })),
                   { nm: 'tri', wp: W_TRI, pp: 0 }, { nm: 'saw', wp: W_SAW, pp: 0 }];
  const insBytes = [];
  let nNew = 0;
  const mkIns = (from, t, nm) => { const at = 1 + 25 * (I[from] - 1), x = sounds.slice(at, at + 25);
    x[2] = t.wp; x[3] = t.pp; x.splice(9, 16, ...Buffer.from(nm.padEnd(16, '\0').slice(0, 16), 'latin1'));
    insBytes.push(...x); return nIns + ++nNew; };
  for (const t of timbres) { t.roll = mkIns('Roll', t, `Roll ${t.nm}`); t.echo = mkIns('Roll echo', t, `Echo ${t.nm}`); }
  // the 64 beats' timbres
  const beatT = [];
  let w = 1;
  if (TIMBREPLAN !== 'random') {
    const ws = TIMBREPLAN.split(' ');
    if (ws.length !== 8 || ws.some(x => !new RegExp(`^[1-${PWIDTHS.length}TS]{8}$`).test(x))) throw new Error(`TIMBREPLAN: eight words of eight beats (1-${PWIDTHS.length}, T, S)`);
    for (const c of ws.join('')) beatT.push(c === 'T' ? timbres[PWIDTHS.length] : c === 'S' ? timbres[PWIDTHS.length + 1] : timbres[+c - 1]); }
  else for (let bar = 0; bar < 8; bar++) {
    const tri = TSBARS.includes(bar + 1) ? ri(2, 3) : -1, saw = tri < 0 ? -1 : tri + ri(2, 3);
    for (let bt = 0; bt < 8; bt++) {
      if (bar + bt && rnd() < PSHIFT) w = Math.max(0, Math.min(PWIDTHS.length - 1, w + (rnd() < 0.5 ? -1 : 1)));
      beatT.push(bt === tri ? timbres[PWIDTHS.length] : bt === saw ? timbres[PWIDTHS.length + 1] : timbres[w]); } }
  for (let k = 8; k < 16; k++) {
    const b0 = 32 * (k - 8);
    for (const [p, shift, which] of [[v2[k], 0, 'roll'], [v3[k], 1, 'echo']]) {
      const q = pats[p] = [...pats[p]];
      for (let r = 0; r < 64; r += 2) { const i = b0 + r / 2 - shift;      // the roll 16th this row sounds
        if (i >= 0 && q[4 * r] < REST && q[4 * r + 1]) q[4 * r + 1] = beatT[i >> 2][which]; } } }
  sounds.splice(1 + 25 * nIns, 0, ...insBytes); sounds[0] += nNew;
  added.push(`roll timbres by beat: ${[...Array(8)].map((_, bar) => beatT.slice(8 * bar, 8 * bar + 8).map(t => t.nm === 'tri' ? 'T' : t.nm === 'saw' ? 'S' : String(PWIDTHS.findIndex(x => `pw ${x.toString(16)}` === t.nm) + 1)).join('')).join(' ')}`);
  const legs = Math.round(2 * ROLLCYCLES), stairs = (ROLLCUT[1] - ROLLCUT[0]) / 4, hold = Math.round(8 * 32 * 10 / legs / stairs) - 1;
  if (!Number.isInteger(stairs) || hold < 1 || hold > 0x7f) throw new Error('ROLLCUT: a range in whole stairs of 4');
  const FP = add(2, [[0x90, ROLLRES << 4 | 0x07], [0x00, ROLLCUT[0]],
    ...[...Array(legs)].flatMap((_, l) => [...Array(stairs)].flatMap(() => [[0x01, l % 2 ? 0xfc : 0x04], [hold, 0x00]])), [0xff, 0x00]]);
  if (T.some(t => t.length > 255)) throw new Error('a table is past 255 rows');
  sounds.splice(1 + 25 * (nIns + nNew), Infinity, ...T.flatMap(t => [t.length, ...t.map(x => x[0]), ...t.map(x => x[1])]));
  // the hand-off: pass 3's first roll row, on whichever voice has row 0's command free
  const k = 8, pv = [v2[k], v3[k]].find(p => !pats[p][2]);
  if (pv === undefined) throw new Error('no free command on pass 3\'s first row');
  pats[pv] = [...pats[pv]]; pats[pv][2] = 0xa; pats[pv][3] = FP;
  added.push(`pulse rolls: filter $${ROLLCUT[0].toString(16)}-$${ROLLCUT[1].toString(16)} resonance ${ROLLRES}, ${legs} legs of ${stairs} stairs, ${hold + 1} ticks a stair (${((stairs * (hold + 1)) / 60).toFixed(1)} s a leg), ending at $${(legs % 2 ? ROLLCUT[1] : ROLLCUT[0]).toString(16)}`);
}
// ---- THE ROLLS, IN A RHYTHM (2026-10-27). Tries before this one: holds and quarter notes cut into each
// bar; a held note with release and vibrato; random mutes ("doesn't sound very musical"). The user: "a
// pattern of some sort that plays into a rhythm ... uses the original notes where they are, and skips
// some to create the rhythm. That rhythm should be established throughout, but it's ok to do a
// variation as long as it is musically justified and not just random."
// Every note still sounds where the roll put it; a CELL (8 16ths, two beats) says which are struck:
//   R  xx-xx-x-   THE RHYTHM: 3+3+2 (a tresillo) with the first two of each group struck -- the roll
//                 keeps moving, but in a groove instead of a stream
//   F  xxxxxxxx   the roll as written: a FILL, only where the music turns a corner
//   E  x-------   the last note, left to ring (release B) into the top of the song
// A bar is four cells (ROLLBARS, one word a bar). The plan, and why:
//   A F Bb      RRRF  the rhythm three times, the fill pulling into the next bass note
//   E           RRFF  a longer fill: the end of the first half, into the new section
//   D C         RRRR  the F E D A cells, no fill: their own climbing and falling carries the bar
//   Bb          RRFF  the fill again, into the resolution
//   E (last)    FFRE  the full roll at the top, the rhythm once more, then one note ringing out
// A struck note is keyed off on the next unstruck 16th, so the rests are rests; the echo (a 16th behind,
// voice 3) follows the same cells.
const CELL = { R: 'xx-xx-x-', F: 'xxxxxxxx', E: 'x-------' };
// (2026-10-27: "far too bouncy cheery for the mood" -- OFF unless ROLLBARS is given; the plan was
// 'RRRF RRRF RRRF RRFF RRRR RRRR RRFF FFRE')
const ROLLBARS = env('ROLLBARS', '').split(' ').filter(Boolean);
if (ROLLBARS.length) {
if (ROLLBARS.length !== 8 || ROLLBARS.some(w => !/^[RFE]{4}$/.test(w))) throw new Error('ROLLBARS: eight words of four cells (R, F, E)');
const rollAt = 8, P = [];
const mask = ROLLBARS.map(w => [...w].map(c => CELL[c]).join('')).join('');   // 256 16ths
const ring = new Set(ROLLBARS.flatMap((w, bi) => [...w].flatMap((c, ci) => c === 'E' ? [32 * bi + 8 * ci] : [])));
const on = i => mask[i] === 'x';
for (let k = rollAt; k < rollAt + 8; k++) {
  const b0 = 32 * (k - rollAt);
  const cut = (p, shift) => { const q = [...pats[p]];
    // row 2(i + shift) sounds the roll's 16th i (the echo's, a 16th late); the echo's row 0 answers the
    // bar before's last 16th
    const one = (r, i) => {
      if (on(i)) { if (ring.has(i) && q[4 * r] < 0xbd) { q[4 * r + 2] = 0x6; q[4 * r + 3] = shift ? 0x5b : 0xab; } return; }
      if (i > 0 && on(i - 1) && !ring.has(i - 1)) { q[4 * r] = 0xbe; q[4 * r + 1] = 0; }        // the rest after a note
      else if (ring.has(i - 4)) { q[4 * r] = 0xbe; q[4 * r + 1] = 0; }                         // a ringing note let go
      else if (q[4 * r] < 0xbd) { q[4 * r] = 0xbd; q[4 * r + 1] = 0; } };
    for (let i = 0; i < 32; i++) if (2 * (i + shift) < 64) one(2 * (i + shift), b0 + i);
    if (shift && b0) one(0, b0 - 1);
    pats.push(q); return pats.length - 1; };
  if (pats[v2[k]].length / 4 - 1 !== 64) throw new Error(`roll bar ${k - rollAt + 1} is not 64 rows`);
  v2[k] = cut(v2[k], 0); v3[k] = cut(v3[k], 1);
  P.push(`roll ${k - rollAt + 1} (${ROLLBARS[k - rollAt]}): ${mask.slice(b0, b0 + 32).replace(/(.{8})/g, '$1 ').trim()}`);
}
added.push(...P);
}
ords[1] = [...v2, 0xff]; ords[2] = [...v3, 0xff];
// THE LAST ROLL NOTE KEEPS ITS FILTER (2026-10-28, the user: "the very last note of rolling carries over
// the loop into the beginning -- what's weird is that it loses the filter at that point ... I'm curious
// to hear it with the filter carrying over ... and not shutting off until the diad hits"). Bar 1's row 0
// hands the filter to the bass's program (A01: routing voice 1 only), which drops the ringing roll note
// out of it. On the LOOP, the hand-off moves to row 16, the dyad's row: until then the rolls' filter
// stays as it ended ($98, all three voices). But the song's first bar needs A01 on row 0 -- nothing has
// set the filter yet -- so voice 2 plays its list twice, the second time with that bar 1, and loops to
// the second copy: the other voices' lists are the same length as one copy, so all three stay in step.
// (The bass program starts a beat later on the loop; it is a slow drift, nothing lands on it.)
// (Heard: "no, i think it sounded better the way it was before" -- OFF unless LOOPFILT=1.)
const LOOPFILT = env('LOOPFILT', '0') === '1';
if (LOOPFILT && FROMBAR_ENV() <= 1) {
  const p0 = pats[v2[0]];
  if (p0[2] !== 0xa || p0[3] !== 0x01 || p0[4 * 16 + 2]) throw new Error('LOOPFILT: bar 1 has no A01 on row 0, or row 16 has a command');
  const q = [...p0]; q[4 * 16 + 2] = 0xa; q[4 * 16 + 3] = 0x01; q[2] = 0; q[3] = 0;
  pats.push(q);
  ords[1] = [...v2, pats.length - 1, ...v2.slice(1), 0xff];
  added.push(`loop: voice 2 loops to a bar 1 with the filter hand-off on row 16`); }
// FROMBAR=n (2026-10-28, the user: "make a temporary testing version of the song where we start at 5 so we
// can work this out"): every voice's orderlist starts at bar n and loops back there -- a WORKING copy,
// never the song. Voice 1 is a transpose + pattern pair a bar; bars 5-8 bring their own filter program
// (A24 on bar 5), so nothing the skipped bars set up is missing.
const FROMBAR = FROMBAR_ENV();
if (FROMBAR > 1) {
  const v1 = ords[0].slice(0, -1);
  if (v1.length !== 32 || v1.some((x, i) => (i % 2 === 0) !== (x >= 0xe0 && x < 0xff))) throw new Error('FROMBAR: voice 1 is not 16 transpose + pattern pairs');
  ords[0] = [...v1.slice(2 * (FROMBAR - 1)), 0xff];
  ords[1] = [...v2.slice(FROMBAR - 1), 0xff]; ords[2] = [...v3.slice(FROMBAR - 1), 0xff];
  added.push(`TESTING COPY: starts at bar ${FROMBAR}`); }
if (pats.length > 208) throw new Error('too many patterns');

const out = b.slice(0, 4 + 97);
out.splice(4, 32, ...Buffer.from('Keys loose'.padEnd(32, '\0'), 'latin1'));
// orderlists: keep each voice's restart position (the byte after its $ff)
o = 4 + 97;
const restarts = [];
for (let v = 0; v < 3; v++) { const len = b[o]; restarts.push(b[o + len + 1]); o += len + 2; }
if (LOOPFILT && FROMBAR <= 1) { if (restarts[1] !== 0) throw new Error('LOOPFILT: voice 2 did not loop to its start'); restarts[1] = v2.length; }
ords.forEach((ol, v) => out.push(ol.length, ...ol, FROMBAR > 1 ? 0 : restarts[v]));
out.push(...sounds, pats.length);
for (const p of pats) out.push(p.length / 4, ...p);
fs.writeFileSync(OUT, Buffer.from(out));
console.log(`${OUT}: ${out.length} bytes, seed ${SEED}\n  ${added.join('\n  ')}`);
