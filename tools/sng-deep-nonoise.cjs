// node tools/sng-deep-nonoise.cjs -- music/deep-song-nonoise.sng from music/deep-song.sng (2026-10-27):
// LEVEL 2's song. Since 2026-11-01 the GENTLE version: quieter, all-triangle data, a filter fade-in (below).
// The user, of "Deep": "a version without the noise track at all. and have the other parts start 1
// repeat earlier". The noise track is voice 3's steam engine; it came in after one 8-pattern repeat of
// the drone's phrase (1 2 3 4 1 2 5 4), the data part on voice 2 after two. Now voice 3 stays silent and
// voice 2 enters where the steam did -- one repeat earlier -- so a pass is one repeat (8 patterns)
// shorter: the drone plays its phrase three times, not four.
//
// THE HELD NOTE. Then: "after the full 3 repeats and it loops around, when the data goes silent the drone
// is changed and maintains a sort of rhythmic filter movement. I want to keep this and ensure that it's
// part of the song". It is the data part's LAST note: a data note is only cut short by the NEXT note's
// hard restart, and after the loop voice 2 plays rests, so nothing keys the last one off. It holds at
// its sustain, its wavetable trilling root/octave (the rhythm), inside the drone's filter sweep (which
// takes voice 2 too). Pass one never has it: voice 2 has not played yet. To make it the song's and not
// an accident of whatever the last row happens to be, the loop now restarts voice 2 into its OWN entry,
// HOLD: the filter-pointer pattern with that note tied on (3xx $00 = move to the note, no re-strike) --
// visible in the tracker, and checked here against the last row of the data part. Pass one is
// unchanged; every later pass is HOLD, the silence, the data part.
//
// THE BLANK CHANNEL: sound effects play on voice 3 (sfxPlay), now empty. The song's filter routed all
// three voices ($x7: the steam was in it); it routes voices 1 and 2 only ($x3), so an effect is not
// played through the drone's dark low-pass.
const fs = require('fs');
const b = [...fs.readFileSync('music/deep-song.sng')];
let o = 4 + 96;
const nsub = b[o++];
if (nsub !== 1) throw new Error(`expected one subtune, found ${nsub}`);
const old = [];
for (let v = 0; v < 3; v++) { const len = b[o]; old.push(b.slice(o + 1, o + len)); o += len + 2; }
// instruments (9 bytes + a 16-byte name each), the four tables, the patterns
const nIns = b[o], insAt = o + 1;
const ins = k => b.slice(insAt + 25 * (k - 1), insAt + 25 * (k - 1) + 9);    // 1-based
o = insAt + 25 * nIns;
const tabs = [];
for (let t = 0; t < 4; t++) { const n = b[o]; tabs.push({ at: o, n }); o += 1 + 2 * n; }
const nPat = b[o], pats = [];
o++;
for (let p = 0; p < nPat; p++) { const len = b[o]; pats.push(b.slice(o + 1, o + 1 + 4 * len)); o += 1 + 4 * len; }
const head = b.slice(0, 4 + 97), mid = b.slice(4 + 97 + old.reduce((s, ol) => s + ol.length + 3, 0) - 0, tabs[3].at + 1 + 2 * tabs[3].n);

const [v1, v2, v3] = old;
const phrase = v1.slice(1, 9);
const silent = v2[2], part = v2.slice(17), lead = v2[1];
if (v2.slice(2, 17).some(p => p !== silent)) throw new Error('voice 2 is not 15 silent patterns before its part');
// the data part's last sounding row, and HOLD: the lead-in pattern with that note tied on at row 1
const lastPat = pats[part.at(-1)], rows = lastPat.length / 4 - 1;
let last = null, lastIns = 0;
for (let r = 0; r < rows; r++) { const [nt, i] = lastPat.slice(4 * r, 4 * r + 2); if (nt < 0xbd) last = nt; if (i) lastIns = i; }
if (last === null) throw new Error('the data part ends with no note');
if (!(ins(lastIns)[1] >> 4)) throw new Error(`the last data note's instrument ${lastIns} has no sustain: nothing would hold`);
const leadPat = pats[lead];
if (leadPat[4] !== 0xbd || leadPat[6]) throw new Error('the lead-in pattern\'s row 1 is not empty');
const hold = [...leadPat];
hold.splice(4, 4, last, 0, 0x3, 0x00);                // row 1: the note, tied (toneportamento $00)
const HOLD = pats.length;
pats.push(hold);
// orderlists: pass one as before (25 entries); then 24-pattern passes, voice 2's starting at HOLD
const nv1 = [v1[0], ...phrase, ...phrase, ...phrase];
const pass2 = [...Array(7).fill(silent), ...part];
const nv2 = [v2[0], lead, ...pass2, HOLD, ...pass2];
const nv3 = [v3[0], v3[1], ...Array(nv1.length - 2).fill(silent)];
const restart = [1, nv1.length, 1];                    // voice 2 loops to HOLD, the others to entry 1
if (nv1.length !== 25 || nv2.length - nv1.length !== 24) throw new Error('the voices no longer loop together');
// the filter: every "set type + routing" row, $x7 -> $x3
const ft = tabs[2];
let routed = 0;
for (let k = 0; k < ft.n; k++) {
  const L = ft.at + 1 + k, R = ft.at + 1 + ft.n + k;
  if (b[L] >= 0x80 && b[L] < 0xff && (b[R] & 7) === 7) { b[R] &= 0xfb; routed++; }
}
if (!routed) throw new Error('no filter routing row found');
// TWO MIXES (MIX=duck, the default, or MIX=gentle):
//  duck   (2026-11-03) -> music/deep-song-duck.sng. The user: "start with l2orig and make only two changes:
//         bring the drone down from F to A when the data comes in, and make the second data section triangle".
//         The original's levels everywhere else (drone 8F/F8, resonance A, data sustains C/A/A/9).
//  gentle (2026-11-01) -> music/deep-song-nonoise.sng, the song level 2 plays until the duck is approved.
const MIX = process.env.MIX || 'duck';
if (!['duck', 'gentle'].includes(MIX)) throw new Error(`MIX=${MIX}: duck or gentle`);
const insB = k => insAt + 25 * (k - 1);                 // instrument k's bytes in b (1-based)
const setB = (a, from, to, what) => { if (b[a] !== from) throw new Error(`${what}: expected $${from.toString(16)}, found $${b[a].toString(16)}`); b[a] = to; };
const wt = tabs[0];
let filt = b.slice(ft.at, ft.at + 1 + 2 * ft.n);
if (MIX === 'duck') {
  //   the data's second half (instruments 12-15, "Data ..."): pulse ($41) -> triangle ($11) like the first
  for (let k = 12; k < 16; k++) setB(wt.at + 1 + ins(k)[2] - 1, 0x41, 0x11, `data ${k} waveform`);
  //   THE DUCK. The drone is struck once (the intro pattern) and glides from then on, so it never re-strikes
  //   and its envelope is the instrument's for the whole song: a 6XY (set sustain/release) on its channel
  //   lowers it for good. Sustain F -> A, release 8 kept, in the phrase where voice 2's data part enters
  //   (rows 0-4 carry the glide). The SID decays to a lower sustain at the DECAY rate, so a 5XY first sets it:
  //   the drone's F would take ~2.6 s from F to A (85 envelope steps x 31,251 cycles, NTSC); DUCKDECAY E (the
  //   default, the user: "1-2 seconds") ~1.6 s, D ~1.0 s, C ~0.3 s. One command per row: decay on row 5,
  //   sustain on row 6. (It never rises again without a re-strike, so later passes stay at A.)
  const DUCKDECAY = parseInt(process.env.DUCKDECAY || 'e', 16);
  if (ins(1)[0] !== 0x8f || ins(1)[1] !== 0xf8) throw new Error('the drone\'s AD/SR are not $8f/$f8');
  const at = 1 + 8;                                      // voice 1's entry where the part enters (intro + one phrase)
  if (nv2[at] !== part[0] || nv1[at] !== phrase[0]) throw new Error('the data part no longer enters with the drone\'s second phrase');
  const duck = [...pats[nv1[at]]];
  for (const r of [5, 6]) if (duck[4 * r] !== 0xbd || duck[4 * r + 1] || duck[4 * r + 2]) throw new Error(`row ${r} of the drone's phrase is not empty`);
  duck.splice(4 * 5 + 2, 2, 0x5, 0x80 | DUCKDECAY);
  duck.splice(4 * 6 + 2, 2, 0x6, 0xa8);
  nv1[at] = pats.length; pats.push(duck);
} else {
// THE GENTLE VERSION (2026-11-01). The user, of the full one: "it's so much more in-your-face ... I need the
// gentler version for background music on this level". The 6581's filter overloaded once the data part came
// in on pulse (two pulses through one filter), so every level going into it comes down, and the data part is
// triangle throughout: (sustain is an SR's high nibble)
//   the drone (instrument 1): sustain F -> 8, attack/decay 8/F -> 0/0 (the user: "I don't really love the way
//   the A/D sounds"); the filter fades it in instead, below
setB(insB(1), 0x8f, 0x00, 'drone AD');
setB(insB(1) + 1, 0xf8, 0x88, 'drone SR');
//   the data part (instruments 8-15: two halves of four, same roles): sustain C/A/A/9 -> 9/7/7/6, and the
//   second half's pulse ($41) -> triangle ($11) like the first
const DATA_SR = [[0xc4, 0x94], [0xa4, 0x74], [0xa4, 0x74], [0x94, 0x64]];
for (let k = 8; k < 16; k++) setB(insB(k) + 1, ...DATA_SR[(k - 8) % 4], `data ${k} SR`);
for (let k = 12; k < 16; k++) setB(wt.at + 1 + ins(k)[2] - 1, 0x41, 0x11, `data ${k} waveform`);
//   the drone's filter program: resonance A -> 5 (on row 1, voices 1-2 as routed above)
const fp = ins(1)[4];
setB(ft.at + 1 + ft.n + fp - 1, 0xa3, 0x53, 'drone filter resonance');
//   THE FADE-IN: the drone strikes into a closed filter and opens over 8 frames to $08, where the sweep starts
//   (row 3 of its program, after "set type" and "cutoff $08"). Four rows on the table's end, entered only from
//   the instrument: the patterns' A01s (voice 2's lead-in, HOLD) still restart the sweep at row 1 unfaded.
const FADE = [[0x90, 0x53], [0x00, 0x00], [0x08, 0x01], [0xff, fp + 2]];   // LP res 5 v1+2; cutoff $00; +1 x8; the sweep
if (b[ft.at + 1 + fp] !== 0x00 || b[ft.at + 1 + ft.n + fp] !== 0x08) throw new Error('the drone\'s sweep does not start at cutoff $08');
if (ft.n + FADE.length > 255) throw new Error('no room in the filter table for the fade-in');
b[insB(1) + 4] = ft.n + 1;
filt = [ft.n + FADE.length, ...b.slice(ft.at + 1, ft.at + 1 + ft.n), ...FADE.map(r => r[0]),
  ...b.slice(ft.at + 1 + ft.n, ft.at + 1 + 2 * ft.n), ...FADE.map(r => r[1])];
}
// reassemble
const out = [...head];
[nv1, nv2, nv3].forEach((ol, v) => out.push(ol.length + 1, ...ol, 0xff, restart[v]));
const insStart = 4 + 97 + old.reduce((s, ol) => s + ol.length + 3, 0);
out.push(...b.slice(insStart, ft.at), ...filt, ...b.slice(tabs[3].at, tabs[3].at + 1 + 2 * tabs[3].n));
out.push(pats.length);
for (const p of pats) out.push(p.length / 4, ...p);
const OUT = MIX === 'duck' ? 'music/deep-song-duck.sng' : 'music/deep-song-nonoise.sng';
fs.writeFileSync(OUT, Buffer.from(out));
console.log(`${OUT} (${MIX}): ${out.length} bytes; pass one ${nv1.length} patterns, then 24; held note $${last.toString(16)} (instrument ${lastIns}); ${routed} filter routings now voices 1-2`);
