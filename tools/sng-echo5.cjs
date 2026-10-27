// node tools/sng-echo5.cjs -- builds music/gbb-v2-echo5.sng from music/gbb-v2-echo4.sng
// The counterpoint alone on channel 1 ("pull the bass notes out"): every channel-1 row that is not the
// Tone (instrument 1) becomes a rest, so the line rings out where the bass used to strike. The bass
// itself still sounds on voice 2 (its echo, a 16th late), which is untouched. cmd/data are kept, so
// pattern 0 row 0's tempo survives.
const fs = require('fs');
const src = fs.readFileSync('music/gbb-v2-echo4.sng');
let o = 4 + 96; const nsub = src[o++];
const ord = []; for (let c = 0; c < 3 * nsub; c++) { const L = src[o]; ord.push([...src.slice(o + 1, o + L + 2)]); o += L + 2; }
const ni = src[o++]; o += ni * 25; for (let t = 0; t < 4; t++) { const n = src[o++]; o += 2 * n; }
const out = Buffer.from(src);
const np = src[o++]; const at = []; for (let p = 0; p < np; p++) { const l = src[o++]; at.push(o); o += 4 * l; }
const ch1 = new Set(ord[0].slice(0, ord[0].indexOf(0xff)));
const pl = x => x.slice(0, x.indexOf(0xff));
for (const p of pl(ord[1]).concat(pl(ord[2]))) if (ch1.has(p)) throw new Error(`pattern ${p} is shared with another channel`);
let n = 0;
for (const p of ch1) for (let r = 0, b = at[p]; r < 16; r++, b += 4)
  if (out[b] < 0xbd && out[b + 1] !== 1) { out[b] = 0xbd; out[b + 1] = 0; n++; }
// The Tone (pp 0) never sets a pulse width -- it rides whatever the channel has. The bass strikes used to
// set it; without them the width stays 0 and the pulse is SILENT (only the triangle slap sounded). So the
// loop's first note is 'Tone start' (instrument 2): the same tone, starting the slow sweep the rest ride.
if (out[at[ord[0][0]] + 1] !== 1) throw new Error('channel 1 does not open on the Tone');
out[at[ord[0][0]] + 1] = 2;
fs.writeFileSync('music/gbb-v2-echo5.sng', out);
console.log('music/gbb-v2-echo5.sng', out.length, 'bytes,', n, 'bass rows rested on channel 1');
