// song-end.mjs -- the ending's tunes (src/end-tunes.mjs) as GoatTracker songs, to hear and edit in the
// tracker beside the user's original.
//
//   node tools/song-end.mjs ["build/Test Song.sng"]     -> music/end-<tune>.sng, one per tune
//
// Each is the user's Test Song with its patterns replaced: the tables and instruments are theirs
// untouched, except that instrument 1 (the flute) loses its filter pointer (the user, 2026-11-10: "you
// can drop the filter from the flute sound ... let the triangle wave play straight"). Voice 1 plays
// pattern 0 (the tune, tempo 8 = TUNE_ROW frames a row) then pattern 1 (TUNE_GAP rows of rest); voices
// 2 and 3 play empty patterns of the same lengths. The ending's own player follows the same notes, the
// same instrument as the tracker plays it, and the same gap (ending-src.mjs, soundCode).
import { readFileSync, writeFileSync } from 'node:fs';
import { TUNES, TUNE_ROW, TUNE_GAP, parseTune } from '../src/end-tunes.mjs';

const IN = process.argv[2] ?? 'build/Test Song.sng';
const d = readFileSync(IN);
if (d.toString('latin1', 0, 4) !== 'GTS5' || d[100] !== 1) throw new Error(`${IN}: not a one-subtune GTS5`);
// skip the order lists, and find where the instruments and tables end (the patterns begin)
let p = 101;
for (let v = 0; v < 3; v++) p += d[p] + 2;
const insAt = p, nIns = d[p++];
p += nIns * 25;
for (let t = 0; t < 4; t++) p += 1 + 2 * d[p];
const mid = Buffer.from(d.subarray(insAt, p));
mid[1 + 4] = 0;                     // instrument 1's filter table pointer: none

const REST = 0xbd, OFF = 0xbe, END = [0xff, 0, 0, 0];
const pat = rows => Buffer.from([rows.length + 1, ...rows.flat(), ...END]);
for (const name of Object.keys(TUNES)) {
  const rows = [];
  for (const e of parseTune(name))
    for (let k = 0; k < e.rows; k++)
      rows.push([k ? REST : e.semi === null ? OFF : 0x60 + e.semi, !k && e.semi !== null ? 1 : 0, 0, 0]);
  rows[0][2] = 0x0f; rows[0][3] = TUNE_ROW;       // F08: tempo 8, once
  if (rows.length > 127 || TUNE_GAP > 127) throw new Error(`${name}: a pattern holds 127 rows`);
  const gap = [[OFF, 0, 0, 0], ...Array.from({ length: TUNE_GAP - 1 }, () => [REST, 0, 0, 0])];
  const empty = n => Array.from({ length: n }, () => [REST, 0, 0, 0]);
  const orders = Buffer.from([3, 0, 1, 0xff, 0, 3, 2, 3, 0xff, 0, 3, 2, 3, 0xff, 0]);
  const out = Buffer.concat([d.subarray(0, 101), orders, mid, Buffer.from([4]),
    pat(rows), pat(gap), pat(empty(rows.length)), pat(empty(TUNE_GAP))]);
  writeFileSync(`music/end-${name}.sng`, out);
  console.log(`music/end-${name}.sng: ${rows.length} rows + ${TUNE_GAP} of rest`);
}
