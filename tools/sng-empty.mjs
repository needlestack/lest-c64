#!/usr/bin/env node
// sng-empty.mjs -- a GoatTracker 2 song with no notes: the player it packs to is there only for
// SOUND EFFECTS, on a level that has effects (footsteps, the orb's clink) and no music.
//
//   node tools/sng-empty.mjs [music/empty.sng]
//
// One silent pattern on every voice, looping; one instrument, because the format wants one. The
// packer leaves out every effect the song does not use, so this is the smallest player there is.
import { writeFileSync } from 'fs';
const OUT = process.argv[2] ?? 'music/empty.sng';
const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('Empty', 32); str('', 32); str('', 32);
b.push(1);                                              // one subtune
for (let c = 0; c < 3; c++) b.push(2, 0, 0xff, 0);      // orderlist: pattern 0, RST to 0
b.push(1, 0, 0, 0, 0, 0, 0, 0, 0x02, 0x09); str('Silent', 16);   // one instrument, no tables
for (let t = 0; t < 4; t++) b.push(0);                  // four empty tables
b.push(1, 2, 0xbd, 0, 0, 0, 0xff, 0, 0, 0);             // one pattern: a rest, then its end row
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes`);
