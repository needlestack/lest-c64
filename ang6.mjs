// The six-sprite angel ladder: work out the rungs, what they cost in sprite slots, and render a
// contact sheet. Standalone so the stepping can be tuned without touching a working build.
//
//   node ang6.mjs            -- print the ladder and the slot cost
//   ANG6SHEET=1 node ang6.mjs -- and write ang6-sheet.png
//
// Geometry: a multicolor pixel is 1.667 display units wide and 1 tall, so for the figure's
// content box (604 x 1123, aspect 0.538) the bitmap's w/h is 0.538/1.667 = 0.3228 whenever the
// two axes are expanded EQUALLY. Expanding only one axis changes that ratio by the same factor.
import { fitArt } from './fit-orb.mjs';
import { png } from './png.mjs';
import { writeFileSync } from 'fs';

const SRC = process.env.ANG6SRC ?? 'angel-full.png';
const K = 0.3228;                       // bitmap w/h when xm == ym
const STEP = +(process.env.ANG6STEP ?? 1.10);
const HMAX = +(process.env.ANG6HMAX ?? 126);

export function ang6Ladder() {

// A rung is an apparent size (H rows) plus how it is drawn. Sprite layout follows from the
// bitmap: 12 mc pixels per sprite across, 21 rows down.
const layout = (w, h) => ({ cols: Math.ceil(w / 12), rows: Math.ceil(h / 21) });
const rung = (H, xm, ym) => {
  const h = Math.round(H / ym), w = Math.round(K * h * ym / xm);
  return { H, xm, ym, w, h, ...layout(w, h) };
};

// Drive the ladder from the BITMAP SETS, not from apparent sizes. A set drawn plain stands at
// H=h; the same bytes with both expands stand at H=2h. Walking H geometrically instead never
// lands on both ends of that pair, so nothing shares and the cost roughly doubles -- which is
// exactly what the first version of this did.
// Two rates, not one. A uniform step spends as many rungs on a 9-row angel as on a 60-row one,
// but the apparent jump that shows is at the TOP -- 126 to 108 is a visible pop, while 11 to 9
// is invisible. Fine above ANG6KNEE, coarse below, which buys the top rungs out of the bottom's
// budget rather than out of the sprite ceiling.
const STEPLO = +(process.env.ANG6STEPLO ?? 1.30);
const KNEE = +(process.env.ANG6KNEE ?? 34);
const heights = [];
for (let h = Math.round(HMAX / 2); h >= 6;) {
  heights.push(h);
  if (h === 6) break;
  const nh = Math.max(6, Math.floor(h / (h >= KNEE ? STEP : STEPLO)));
  if (nh === h) break;
  h = nh;
}
const sets = new Map();
const rungs = [];
const addRung = (H, xm, ym, w, h, cols, rows) => {
  if (rungs.some(r => r.H === H)) return;
  rungs.push({ H, xm, ym, w, h, cols, rows });
};
for (const h of heights) {
  const w = Math.round(K * h), { cols, rows } = layout(w, h);
  sets.set(`${w}x${h}`, { w, h, cols, rows, uses: [] });
  addRung(h, 1, 1, w, h, cols, rows);            // plain: finest pixels at this size
  // Double it ONLY where a plain set cannot reach. Three sprite rows top out at 63, so every
  // size below that already has a full-resolution rung -- adding the doubled one as well made
  // the ladder alternate between a plain 1x2 and a MAGNIFIED 1x1 as the angel approached,
  // throwing away half the resolution to save a sprite that was available anyway.
  if (2 * h <= HMAX && 2 * h > 63) {
    // Twice the size needs vmag. hmag as well only if the figure is then too wide for two
    // columns -- taking hmag when it is not needed halves the HORIZONTAL resolution, which is
    // already the coarser axis (an mc pixel is 1.667 units wide against 1 tall). So prefer
    // vmag alone wherever it fits: same size, twice the horizontal detail, at 4 slots not 2.
    // ...but only where it is worth an unshared set. A vmag-only bitmap shares with nothing,
    // where a plain one is also the both-expands rung at twice the size -- so paying for it
    // everywhere costs 79 slots against 48. Spend it only on the cliff: a LARGE angel that
    // both-expands would draw with a handful of sprites, i.e. very coarsely.
    const wv = Math.round(K * h * 2), lv = layout(wv, h);
    // ANG6VMAG=all: take vmag-only EVERYWHERE it fits, and both-expands only when the figure
    // is then too wide for two columns. Costs more slots (no set sharing) but keeps horizontal
    // resolution as long as possible -- worth seeing at the extreme before settling.
    const cliff = process.env.ANG6VMAG === 'all' || (2 * h >= 60 && cols * rows < 4);
    if (cliff && wv <= 24 && lv.cols <= 2 && lv.rows <= 3) {
      sets.set(`${wv}x${h}`, { w: wv, h, cols: lv.cols, rows: lv.rows, uses: [] });
      addRung(2 * h, 1, 2, wv, h, lv.cols, lv.rows);
    } else addRung(2 * h, 2, 2, w, h, cols, rows);
  }
}
rungs.sort((a, b) => b.H - a.H);
for (const r of rungs) sets.get(`${r.w}x${r.h}`).uses.push(r.H);
let slots = 0;
for (const s of sets.values()) slots += s.cols * s.rows;
  return { rungs, sets, slots, SRC };
}

// Printing and the contact sheet only when run directly -- build-iray.mjs imports this.
const isMain = process.argv[1]?.endsWith('ang6.mjs');
const { rungs, sets, slots } = ang6Ladder();
if (isMain) {

console.log(`ladder: ${rungs.length} rungs, ${sets.size} bitmap sets, ${slots} sprite slots ` +
            `(step ${((STEP - 1) * 100).toFixed(0)}%, max ${HMAX} rows)`);
console.log('    H   expands    bitmap   sprites   shares with');
for (const r of rungs) {
  const s = sets.get(`${r.w}x${r.h}`);
  const other = s.uses.filter(u => u !== r.H);
  console.log(`  ${String(r.H).padStart(3)}   ${r.xm}x${r.ym}      ` +
    `${String(r.w).padStart(2)}x${String(r.h).padStart(2)}     ${r.cols}x${r.rows}=${r.cols * r.rows}` +
    `      ${other.length ? 'H=' + other.join(',') : '-'}`);
}
const bySpr = {};
for (const r of rungs) bySpr[r.cols * r.rows] = (bySpr[r.cols * r.rows] ?? 0) + 1;
console.log('rungs by sprite count:', Object.entries(bySpr).map(([k, v]) => `${k}spr x${v}`).join('  '));

if (process.env.ANG6SHEET === '1') {
  // Every RUNG at its true apparent size: a set can be used at more than one expansion, so
  // drawing sets alone makes the vmag-only ones look squat -- they are 2 hires per pixel wide,
  // not 4, and the sheet was showing them at the wrong aspect.
  const INK = { 1: [68, 68, 68], 2: [108, 108, 108], 3: [149, 149, 149] };
  const Z = 2, GAP = 6;
  const wid = rungs.reduce((n, r) => n + r.w * 2 * r.xm * Z + GAP, 0);
  const hei = rungs[0].H * Z + 12;
  const rgb = new Uint8Array(wid * hei * 3);
  let ox = 0;
  for (const r of rungs) {
    const px = fitArt(SRC, r.w, r.h, { mirror: false }).px;
    const pw = 2 * r.xm * Z, ph = r.ym * Z;      // one mc pixel, in sheet pixels
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const v = px[y * r.w + x]; if (!v) continue;
      const c = INK[v];
      for (let dy = 0; dy < ph; dy++) for (let dx = 0; dx < pw; dx++) {
        const X = ox + x * pw + dx, Y = hei - r.H * Z + y * ph + dy - 6;
        if (X < 0 || X >= wid || Y < 0 || Y >= hei) continue;
        const o = (Y * wid + X) * 3; rgb[o] = c[0]; rgb[o + 1] = c[1]; rgb[o + 2] = c[2];
      }
    }
    ox += r.w * 2 * r.xm * Z + GAP;
  }
  writeFileSync('./ang6-sheet.png', png(wid, hei, rgb));
  console.log(`ang6-sheet.png: ${rungs.length} rungs at true apparent size`);
}
}
