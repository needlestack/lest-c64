// bufcmp.mjs old.txt new.txt -- compare BOTH screen buffers ($e000, $e400; 1000 bytes each) from two
// probe.mjs dumps (`@e000:1000 @e400:1000`). A screenshot shows only the buffer on display; a bug
// in one buffer flickers in play and can hide from it. Fails loudly if a dump is missing.
import { readFileSync } from 'fs';
const rd = f => { const o = {}; for (const l of readFileSync(f, 'utf8').split('\n')) {
  const m = /^(@e[04]00)\s+\S+\s+(.*)$/.exec(l); if (m) o[m[1]] = m[2].trim().split(/\s+/).slice(0, 1000); } return o; };
const a = rd(process.argv[2]), b = rd(process.argv[3]);
let bad = 0;
for (const k of ['@e000', '@e400']) {
  if (!(a[k]?.length === 1000 && b[k]?.length === 1000)) { console.log(`${k}: MISSING DUMP`); process.exit(2); }
  const d = []; for (let i = 0; i < 1000; i++) if (a[k][i] !== b[k][i]) d.push(`r${Math.floor(i / 40)}c${i % 40}`);
  console.log(`${k}: ${d.length ? `${d.length} cells differ: ${d.slice(0, 10).join(' ')}` : 'same'}`); bad += d.length;
}
process.exit(bad ? 1 : 0);
