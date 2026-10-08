// endscene.mjs -- the winning scene's DATA: the tree picture, which rack LEDs blink and how, and
// which squares of leaves may turn. Writes end-scene.json, run by hand like make-quote.mjs; the
// main build (build-iray.mjs, via ending-src.mjs) assembles the player around it as ITRE.
//
//   node tools/endscene.mjs [tree.kla] [art/tree/regions.json] [art/tree/nobrown.json] [--noleaves]
//
// THE WHOLE RECIPE, from what is committed in art/tree/ (it reproduces end-scene.json byte for byte):
//   node tools/c64pic.mjs art/tree/source.png tree --mc --bg 0 --regions art/tree/regions.json \
//        --sharpen 0.8 --feather 0 --branchtex 1.2 --nobrown art/tree/nobrown.json --darkmap art/tree/darkmap.json
//   node tools/endscene.mjs                      # tree.kla -> end-scene.json; then rebuild the game
// The three masks are committed rather than re-derived, because they came from the user's hand edits
// of EARLIER renders (edit-nobrown.png, edit-dark.png, also kept): regions.json is tools/treeseg.mjs
// on source.png; nobrown.json is tools/editzones.mjs and darkmap.json tools/editdark.mjs, each
// aligning an edit against the render it was painted on -- renders that only the history still has.
//
// The player (ending-src.mjs) runs once per frame, synced to the raster, with interrupts off.
//
// LIGHTS. About a dozen small red, yellow and green dots in the racks (1-3 pixels, at least ~10 apart
// so each reads as its own light) -- chosen with a seeded shuffle, so a rebuild picks the same ones --
// each with one of two personalities:
//   STEADY: regular on/off, each with its own period (about half a second to two seconds, some
//     lopsided) and its own starting point in the cycle, so none line up. Two of them are SYNCED
//     PAIRS: two dots close together blinking as one, like twin status LEDs. That is the only sync.
//   ACTIVITY (disk/network): 1-4 frames on, 2-17 off, at random -- and now and then a pause of half a
//     second to two and a half seconds, the gaps between bursts of activity.
// "Off" is pixel code 00, the black background every block has.
//
// LEAVES TURN (--noleaves to stop them): small squares of leaf pixels, 2x2 or 3x3, rotate 90 degrees
// and STAY, only inside a GUST that drifts across the canopy, with calm between gusts. See LEAVES and
// the gust notes in ending-src.mjs.
// ADDRESSES ARE BITMAP OFFSETS (0..7999), not addresses: where the bitmap lives is the player's
// business, and it keeps the picture twice (see ending-src.mjs).
import { readFileSync, writeFileSync } from 'fs';

const argv = process.argv.slice(2), LEAVES = !argv.includes('--noleaves');
const [KLA = 'tree.kla', REGF = 'art/tree/regions.json', NBF = 'art/tree/nobrown.json'] = argv.filter(a => !a.startsWith('--'));
const NSITES = 1024;
const k = readFileSync(KLA);
if (k.length !== 10003 || (k[0] | k[1] << 8) !== 0x6000) throw new Error(`${KLA} is not a Koala file`);
const bm = k.subarray(2, 8002), scr = k.subarray(8002, 9002), col = k.subarray(9002, 10002), bg = k[10002];
const reg = JSON.parse(readFileSync(REGF, 'utf8')).labels;
let nb = null; try { nb = JSON.parse(readFileSync(NBF, 'utf8')).mask; } catch {}

// seeded PRNG for the BUILD's choices (sampling, personalities), so a rebuild is identical
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---- the picture as 160x200 colour indices ----
const W = 160, H = 200;
const byteOf = (x, y) => (y >> 3) * 320 + (x >> 2) * 8 + (y & 7), shiftOf = x => 6 - 2 * (x & 3);
const codeAt = (x, y) => (bm[byteOf(x, y)] >> shiftOf(x)) & 3;
const colourAt = (x, y) => { const c = codeAt(x, y), cell = (y >> 3) * 40 + (x >> 2);
  return c === 0 ? bg : c === 1 ? scr[cell] >> 4 : c === 2 ? scr[cell] & 15 : col[cell] & 15; };
const labAt = (x, y) => reg[y * 320 + 2 * x] | reg[y * 320 + 2 * x + 1];
const nbAt = (x, y) => nb ? nb[y * 320 + 2 * x] | nb[y * 320 + 2 * x + 1] : 0;

// ---- LIGHTS: small single-colour dots of red (2), green (5) or yellow (7) in the racks ----
const DOT = { 2: 'red', 5: 'green', 7: 'yellow' }, seen = new Uint8Array(W * H), cands = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = colourAt(x, y);
  if (seen[y * W + x] || !(labAt(x, y) & (4 | 16)) || !DOT[c]) continue;
  const st = [[x, y]], px = []; seen[y * W + x] = 1;
  while (st.length) { const [a, b] = st.pop(); px.push([a, b]);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = a + dx, yy = b + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && !seen[yy * W + xx] && (labAt(xx, yy) & (4 | 16)) && colourAt(xx, yy) === c) {
        seen[yy * W + xx] = 1; st.push([xx, yy]); } } }
  // CLEARLY ON A RACK: no tree pixel (leaf/bark/overlap) within 3 pixels. Without this margin, green
  // leaf pixels at the canopy's edge and a yellow fleck on the trunk's edge passed as LEDs.
  const nearTree = px.some(([a, b]) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const xx = a + dx, yy = b + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && (labAt(xx, yy) & 3)) return true; } return false; });
  if (px.length <= 3 && !nearTree) cands.push({ c, px, cx: px.reduce((s, p) => s + p[0], 0) / px.length, cy: px.reduce((s, p) => s + p[1], 0) / px.length });
}
// distance on screen: a multicolour pixel is twice as wide as it is tall
const dist = (a, b) => Math.hypot(2 * (a.cx - b.cx), a.cy - b.cy);
const NSTEADY = 7, NACT = 5, MINGAP = 20;
// PAIRS FIRST, from dots that actually have a partner nearby (picking them afterwards left one
// without); then the rest in COLOUR ROTATION -- yellow, red, green -- because yellow is rare (7 dots)
// and a plain random pick missed it entirely.
const partnerOf = c => cands.filter(o => o !== c && dist(o, c) >= 3 && dist(o, c) <= 12)
  .sort((a, b) => (a.c !== c.c) - (b.c !== c.c) || dist(a, c) - dist(b, c))[0];
const chosen = [], spaced = c => chosen.every(o => dist(o, c) >= MINGAP);
for (const c of shuffle(cands.filter(partnerOf))) { if (chosen.length >= 2) break; if (spaced(c)) chosen.push(c); }
const byColour = [7, 2, 5].map(col => shuffle(cands.filter(c => c.c === col)));
for (let turn = 0; chosen.length < NSTEADY + NACT && turn < 3 * cands.length; turn++) {
  const pool = byColour[turn % 3], c = pool.find(o => !chosen.includes(o) && spaced(o));
  if (c) chosen.push(c);
}
// ...plus EXTRA_RIGHT on the NEAREST RIGHT RACK (the user asked for a couple more there): x >= 135 of
// 160, a little closer together (12 screen px) since it is one rack. The first is steady, the rest
// activity lights.
const EXTRA_RIGHT = 3, extra = [];
const rightBy = [7, 2, 5].map(col => shuffle(cands.filter(c => c.c === col && c.cx >= 135 && !chosen.includes(c))));
for (let turn = 0; extra.length < EXTRA_RIGHT && turn < 3 * cands.length; turn++) {   // colours in rotation here too
  const c = rightBy[turn % 3].find(o => !extra.includes(o) && [...chosen, ...extra].every(p => dist(p, o) >= 12));
  if (c) extra.push(c);
}
// the first two steady lights each take their nearest unchosen partner (same colour if possible,
// within ~3-12 screen px) as a SYNCED PAIR
const used = new Set([...chosen, ...extra]);
const lights = [...chosen, ...extra].map((c, i) => {
  const dots = [c];
  if (i < 2) { const p = partnerOf(c); if (p && !used.has(p)) { dots.push(p); used.add(p); } }
  const bytes = new Map();
  for (const d of dots) for (const [x, y] of d.px) { const o = byteOf(x, y); bytes.set(o, (bytes.get(o) ?? 0) | (3 << shiftOf(x))); }
  const kind = i < NSTEADY || i === NSTEADY + NACT ? 'steady' : 'activity';   // the first extra is steady
  return { kind, colour: DOT[c.c], pair: dots.length > 1, at: [Math.round(c.cx), Math.round(c.cy)],
           bytes: [...bytes].map(([o, mask]) => ({ o, on: bm[o], off: bm[o] & ~mask & 255 })) };
});
// STEADY periods (frames on, frames off): each light its own, about 0.5-2 s, some lopsided; and a
// starting point anywhere in its cycle
const PERIODS = shuffle([[30, 30], [45, 45], [60, 60], [40, 80], [90, 30], [25, 50], [75, 75], [55, 35], [35, 65]]);
let nSteady = 0;   // each steady light its OWN period: indexing by light number reused one (two at 90/30)
lights.forEach((l, i) => {
  if (l.kind === 'steady') { [l.onT, l.offT] = PERIODS[nSteady++ % PERIODS.length]; l.phase = 1 + Math.floor(rnd() * l.onT); }
  else { l.onT = 0; l.offT = 0; l.pause = 10 + Math.floor(rnd() * 30); l.phase = 1 + Math.floor(rnd() * 60); }
});
const flat = lights.flatMap(l => l.bytes);
if (flat.length > 255) throw new Error(`${flat.length} light bytes; the table holds 255`);
const NL = lights.length;
console.log(`lights: ${NL} -- ` + lights.map(l => `${l.colour} ${l.kind}${l.pair ? ' PAIR' : ''}` +
  (l.kind === 'steady' ? ` ${l.onT}/${l.offT}` : '') + ` @${l.at}`).join('; '));

// ---- LEAVES: small squares of leaf pixels that TURN 90 degrees -- and STAY turned ----
// History, both from the user: (1) a 4-pixel strip slid sideways and back read as a shape moving
// as a shape -- leaves turn in 3D, so their shape changes; (2) turning a square and turning it BACK
// after a few frames still looked wrong: "maybe it shouldn't be change and back, but change and
// stay". So each event now rotates a 2x2 square, or a 3x3 square's outer ring of 8 round its fixed
// centre, 90 degrees one way or the other -- and leaves it. Because a turn is applied to whatever the
// square holds NOW (another turn may have moved things since), the player rotates at run time: a
// site is a RING of pixel positions (4 or 8, in clockwise order) and a turn moves every pixel 1 or
// L-1 places (2x2) / 2 or 6 places (3x3) round it.
// WHY THIS CANNOT WEAR THE PICTURE OUT: every square lies inside ONE character cell and is made only
// of leaf pixels (canopy region or a no-brown zone, black/green/light green), so a pixel can only
// ever trade places with another leaf pixel of the same cell. Each cell keeps exactly the pixels it
// started with -- its colours and brightness are fixed forever; only their arrangement drifts.
const LEAF = new Set([0, 5, 13]), sites = [];
const leafPx = (x, y) => { const l = labAt(x, y); return ((l & 1) && l !== 2 || nbAt(x, y)) && LEAF.has(colourAt(x, y)); };
const RING = { 2: [[0, 0], [0, 1], [1, 1], [1, 0]], 3: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, 0]] };
if (LEAVES) {
  const cand = [];
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) for (const n of [2, 3])
    for (let r0 = 0; r0 <= 8 - n; r0++) for (let x0 = 0; x0 <= 4 - n; x0++) {
      const X = cx * 4 + x0, Y = cy * 8 + r0;
      let ok = true; const codes = new Set();
      for (let r = 0; r < n && ok; r++) for (let c = 0; c < n; c++) {
        if (!leafPx(X + c, Y + r)) { ok = false; break; } codes.add(codeAt(X + c, Y + r)); }
      if (!ok || codes.size < 2) continue;                       // nothing to turn
      cand.push({ o: byteOf(X, Y), n, cx, cy, ring: RING[n].map(([r, c]) => r * 4 + x0 + c) });   // row*4 + pixel
    }
  shuffle(cand);
  for (const c of cand) { if (sites.length >= NSITES) break; sites.push(c); }
  if (sites.length < 64) throw new Error(`only ${sites.length} leaf sites -- are the regions for this picture?`);
  while (sites.length < NSITES) sites.push(sites[sites.length % (sites.length || 1)]);   // fill the table (power of 2)
  console.log(`leaves: ${cand.length} possible turning squares, ${NSITES} sampled`);
}
writeFileSync('end-scene.json', JSON.stringify({
  note: 'The end scene: tree.kla plus its live parts -- see tools/endscene.mjs. bm/scr/col are the Koala ' +
        'bitmap, screen and colour RAM; light byte offsets (o) and leaf site offsets are into the bitmap.',
  bg, bm: [...bm], scr: [...scr], col: [...col],
  lights: lights.map(l => ({ kind: l.kind, colour: l.colour, pair: l.pair, at: l.at, onT: l.onT, offT: l.offT,
    pause: l.pause ?? 0, phase: l.phase, bytes: l.bytes })),
  sites: sites.map(st => ({ o: st.o, cx: st.cx, cy: st.cy, ring: st.ring })),
}));
console.log(`end-scene.json: ${lights.length} lights (${flat.length} bytes), ${sites.length} leaf sites`);
