// node tools/sng-deep-nonoise.cjs -- music/deep-song-nonoise.sng from music/deep-song.sng (2026-10-27):
// LEVEL 2's song.
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
// reassemble
const out = [...head];
[nv1, nv2, nv3].forEach((ol, v) => out.push(ol.length + 1, ...ol, 0xff, restart[v]));
const insStart = 4 + 97 + old.reduce((s, ol) => s + ol.length + 3, 0);
out.push(...b.slice(insStart, tabs[3].at + 1 + 2 * tabs[3].n));
out.push(pats.length);
for (const p of pats) out.push(p.length / 4, ...p);
fs.writeFileSync('music/deep-song-nonoise.sng', Buffer.from(out));
console.log(`music/deep-song-nonoise.sng: ${out.length} bytes; pass one ${nv1.length} patterns, then 24; held note $${last.toString(16)} (instrument ${lastIns}); ${routed} filter routings now voices 1-2`);
