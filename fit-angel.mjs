// Fit a GEK scene (160x200 multicolor, stored as 4x8 tiles that are ALREADY C64 char glyphs)
// down to a 256-glyph charset plus 1000 screen codes, and write angel-face.json.
//
// Run by hand, not by the build: k-means over 1000 tiles takes seconds and the answer never
// changes. Usage:  node fit-angel.mjs TMP-3.d64 hangl1 hangl2
import { execFileSync } from 'child_process';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readGek } from './gek.mjs';
import { png } from './png.mjs';

const RGB = { 0:[0,0,0], 11:[68,68,68], 12:[108,108,108], 15:[149,149,149], 1:[255,255,255] };
const lum = c => (RGB[c][0]*0.299 + RGB[c][1]*0.587 + RGB[c][2]*0.114) / 255;

// The bit-pair values are NOT in luminance order -- 1 is dark grey, 2 is LIGHT, 3 is medium --
// so every distance here is measured in luminance. Comparing raw 2-bit values would score a
// light/mid swap as a smaller error than a light/dark one, which is backwards.
function tilesOf(img) {
  const out = [];
  for (let t = 0; t < 1000; t++) {
    const px = new Uint8Array(32);
    for (let r = 0; r < 8; r++) { const b = img[t*8 + r];
      for (let i = 0; i < 4; i++) px[r*4 + i] = (b >> (6 - 2*i)) & 3; }
    out.push(px);
  }
  return out;
}

function cluster(tiles, LU, K, iters = 60) {
  const freq = new Map();
  for (const p of tiles) { const k = p.join(','); freq.set(k, (freq.get(k) ?? 0) + 1); }
  // Seed on the most common distinct tiles: they are already the modes of the distribution, and
  // large flat areas (the black surround) collapse to one seed immediately.
  const cents = [...freq.entries()].sort((a,b) => b[1] - a[1]).slice(0, K)
    .map(([k]) => Uint8Array.from(k.split(',').map(Number)));
  while (cents.length < K) cents.push(new Uint8Array(32));
  const assign = new Int32Array(tiles.length);
  for (let it = 0; it < iters; it++) {
    let moved = 0;
    for (let i = 0; i < tiles.length; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < K; c++) {
        let d = 0;
        for (let p = 0; p < 32; p++) { const e = LU[tiles[i][p]] - LU[cents[c][p]]; d += e*e;
          if (d >= bd) break; }
        if (d < bd) { bd = d; best = c; }
      }
      if (assign[i] !== best) { assign[i] = best; moved++; }
    }
    const sum = [...Array(K)].map(() => new Float64Array(32)), cnt = new Int32Array(K);
    for (let i = 0; i < tiles.length; i++) { cnt[assign[i]]++;
      for (let p = 0; p < 32; p++) sum[assign[i]][p] += LU[tiles[i][p]]; }
    for (let c = 0; c < K; c++) {
      if (!cnt[c]) continue;
      for (let p = 0; p < 32; p++) {           // centroid in luminance, snapped to the 4 values
        const m = sum[c][p] / cnt[c];
        let bv = 0, bd = Infinity;
        for (let v = 0; v < 4; v++) { const d = Math.abs(LU[v] - m); if (d < bd) { bd = d; bv = v; } }
        cents[c][p] = bv;
      }
    }
    if (!moved && it) break;
  }
  return { cents, assign };
}

const [d64, ...names] = process.argv.slice(2);
const tmp = mkdtempSync(join(tmpdir(), 'gek'));
const out = {};
for (const nm of names) {
  const f = join(tmp, nm + '.prg');
  execFileSync('/Applications/vice-arm64-gtk3-3.8/bin/c1541',
    ['-attach', d64, '-read', `${nm}/pic`, f], { stdio: 'ignore' });
  const g = readGek(f);
  const COL = [g.bg, g.c1, g.c2, g.c3], LU = COL.map(lum);
  const tiles = tilesOf(g.img);
  const K = +(process.env.FACEK ?? 256);
  const { cents, assign } = cluster(tiles, LU, K);
  let err = 0, exact = 0;
  for (let i = 0; i < 1000; i++) {
    let same = true;
    for (let p = 0; p < 32; p++) { const e = LU[tiles[i][p]] - LU[cents[assign[i]][p]];
      err += e*e; if (e) same = false; }
    if (same) exact++;
  }
  // pack each 32-pixel centroid back into 8 glyph bytes -- the same layout it came in as
  // Order the glyphs by similarity before emitting: a pure permutation, no quality cost, and it
  // lets the LZ match neighbouring glyphs against each other. Worth ~40 packed bytes, which is
  // ~80 of the self-extractor's staging headroom.
  const dist = (a, b) => { let d = 0; for (let i = 0; i < 32; i++) { const x = cents[a][i] - cents[b][i]; d += x*x; } return d; };
  const used = new Array(K).fill(false), chain = [0]; used[0] = true;
  for (let k = 1; k < K; k++) { const last = chain[k-1]; let bi = -1, bd = Infinity;
    for (let j = 0; j < K; j++) if (!used[j]) { const d = dist(last, j); if (d < bd) { bd = d; bi = j; } }
    chain.push(bi); used[bi] = true; }
  const inv = new Array(K); chain.forEach((o, i) => inv[o] = i);
  const ordered = chain.map(o => cents[o]);
  for (let i = 0; i < assign.length; i++) assign[i] = inv[assign[i]];
  cents.length = 0; cents.push(...ordered);
  // ---- SWAP pixel values 0 and 3, and this is forced by the hardware ----
  // In multicolor CHAR mode bit pair 11 reads only the LOW THREE BITS of colour RAM -- bit 3 is
  // the flag that makes the cell multicolor at all. So the per-cell colour can only be 0..7, and
  // none of those is a grey except black and white. The scene's c3 is mid-grey 12, which came out
  // as 12 & 7 = 4, PURPLE. Swapping 0 and 3 puts BLACK on the per-cell pair (0, in range) and
  // moves mid-grey onto $d021, which is a full four-bit register. The image is identical.
  const sw = v => v === 0 ? 3 : v === 3 ? 0 : v;
  const chars = [];
  for (const c of cents) for (let r = 0; r < 8; r++)
    chars.push((sw(c[r*4]) << 6) | (sw(c[r*4+1]) << 4) | (sw(c[r*4+2]) << 2) | sw(c[r*4+3]));
  // the all-background glyph is now all-ones, $ff
  let blank = -1;
  for (let gi = 0; gi < K; gi++)
    if (chars.slice(gi*8, gi*8+8).every(b => b === 0xff)) { blank = gi; break; }
  if (blank < 0) throw new Error('no all-background glyph after the swap');
  out[nm] = { chars, screen: [...assign], blank,
              d021: g.c3, d022: g.c1, d023: g.c2, colram: g.bg };
  console.error(`${nm}: K=${K} RMS ${Math.sqrt(err/32000).toFixed(4)}  exact ${exact}/1000`
              + `  $d021=${g.c3} $d022=${g.c1} $d023=${g.c2} colourRAM=${g.bg} blank=${blank}`);
  // a PNG of what the C64 will actually show, for eyeballing before it goes on the disk
  const W = 320, H = 200, rgb = new Uint8Array(W*H*3);
  for (let t = 0; t < 1000; t++) {
    const tx = (t % 40) * 4, ty = ((t / 40) | 0) * 8, c = cents[assign[t]];
    for (let p = 0; p < 32; p++) {
      const x = (tx + (p & 3)) * 2, y = ty + (p >> 2), col = RGB[COL[c[p]]];
      for (let d = 0; d < 2; d++) { const o = (y*W + x + d) * 3;
        rgb[o] = col[0]; rgb[o+1] = col[1]; rgb[o+2] = col[2]; }
    }
  }
  writeFileSync(`${nm}-fit.png`, png(W, H, rgb));
}
writeFileSync('angel-face.json', JSON.stringify(out));
console.error(`wrote angel-face.json (${names.join(', ')}) and the -fit.png previews`);
