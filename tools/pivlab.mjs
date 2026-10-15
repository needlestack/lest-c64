// pivlab.mjs -- the temporal pivot's bench: what the hints buy, per kind of motion.
//
//   node tools/pivlab.mjs "" "PIVCOLD=1" "PIVMOVE=0"     # one column group per variant
//
// Each argument is a build variant (extra env on top of BASE). Every variant runs the SAME
// script of motions (PIVLAB in build-iray.mjs: PLS, PLDT) in level 9's final room with no
// sentries and no seams, one step per rendered frame, so frame k is the same view in every
// build. One emulator run per variant, capped by probe's own deadline.
//
// Per segment it prints, per frame:
//   rays   marchCol calls -- the cast's unit of work, ~800 cycles each
//   floor  2 + 2 x boundaries found: what a PERFECT one-column prediction would march
//   hint   brackets cut from last frame's hints;  hit% = brackets that landed exactly
//   miss   how far the misses were from the nearest boundary found: 1 | 2-4 | 5+
//   cast   kcycles in the whole cast (rayAll); piv = of which pivOne, the prediction arithmetic
//   fps    from the ticks the frames took (whole frame, raster wait included)
// and checks that each shuttle (a segment followed by its mirror) ended where it began.
import { execFileSync } from 'node:child_process';
process.chdir(new URL('..', import.meta.url).pathname);

const BASE = process.env.PLBASE ?? 'LAB=1 NOSV=1 SEAMS=0 STAGE=2 NOSHOCK=1 SOUND=0 PX=0xe00 PY=0xa80 PA=0xc5';
const variants = process.argv.slice(2);
if (!variants.length) variants.push('');
const PLS = (process.env.PLS ?? '4:.,12:.,16:<,16:>,10:F,10:B,8:L,16:R,8:L,16:F<,16:B>,16:L>,16:R<')
  .split(',').map(s => { const [n, k] = s.split(':'); return { n: +n, k }; });
const NF = 35;   // fields in the record, 16 bytes each (PLF in build-iray.mjs)
const F = ['mL', 'mH', 'pL', 'pH', 'bL', 'bH', 'h0L', 'h0H', 'h1L', 'h1H', 'h2L', 'h2H', 'h3L', 'h3H',
  'cL', 'cM', 'cH', 'vL', 'vM', 'vH', 'tL', 'tH', 'fr', 'xL', 'xH', 'yL', 'yH', 'h4L', 'h4H',
  'k1L', 'k1H', 'k2L', 'k2H', 'k3L', 'k3H'];

const runs = [];
for (const v of variants) {
  const env = `${BASE} PIVLAB=1 ${v}`.trim() + (process.env.PLS ? ` PLS=${process.env.PLS}` : '') +
    (process.env.PLDT ? ` PLDT=${process.env.PLDT}` : '');
  let out;
  try {
    out = execFileSync(process.execPath, ['tools/probe.mjs', env, `plR:${NF * 16}`, 'plDone', '--until', 'plDone>=1'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PROBE_DEADLINE: '60000' } });
  } catch (e) {
    console.log(`[${v || 'default'}] RUN FAILED: ${String(e.stderr ?? '').trim().split('\n').slice(-3).join(' | ')}`);
    process.exit(1);
  }
  const b = (/^plR\s+\$\w+\s+([\d ]+)/m.exec(out)?.[1] ?? '').trim().split(' ').map(Number).slice(0, NF * 16);
  if (b.length !== NF * 16) { console.log(`[${v}] could not read plR`); process.exit(1); }
  const g = (f, s) => b[F.indexOf(f) * 16 + s];
  const w = (f, s) => g(f + 'L', s) + 256 * g(f + 'H', s);
  const w3 = (f, s) => g(f + 'L', s) + 256 * g(f + 'M', s) + 65536 * g(f + 'H', s);
  runs.push({ v: v || 'default', seg: PLS.map((p, s) => ({
    fr: g('fr', s), m: w('m', s), p: w('p', s), b: w('b', s), h: [0, 1, 2, 3, 4].map(k => w('h' + k, s)), k1: w('k1', s), k2: w('k2', s), k3: w('k3', s),
    c: w3('c', s), pv: w3('v', s), t: w('t', s), x: w('x', s) / 256, y: w('y', s) / 256 })) });
}

const name = k => k.split('').map(c => ({ F: 'walk', B: 'back', L: 'strafeL', R: 'strafeR', '<': 'turnL', '>': 'turnR', '.': 'still' })[c]).join('+');
const f1 = x => x.toFixed(1).padStart(5);
for (const r of runs) {
  console.log(`\n== ${r.v} ==   (per frame; fps from ticks)`);
  console.log('segment            frames  rays floor  hint  hit%  miss:-1   +1  2-4   5+    cast   piv   fps   ends at       split  line  tr0%');
  const tot = { fr: 0, m: 0, c: 0, pv: 0, t: 0, k1: 0, k2: 0 };
  r.seg.forEach((s, i) => {
    if (i === 0) return;                                  // the warm-up: the first frame has no hints
    const n = s.fr || 1, hits = s.h[0], pr = s.p || 1;
    console.log(`${name(PLS[i].k).padEnd(18)} ${String(s.fr).padStart(4)}  ${f1(s.m / n)} ${f1(2 + 2 * s.b / n)} ${f1(s.p / n)} ${(100 * hits / pr).toFixed(0).padStart(4)}%  ${f1((s.h[1] - s.h[4]) / n)} ${f1(s.h[4] / n)} ${f1(s.h[2] / n)} ${f1(s.h[3] / n)}  ${f1(s.c / n / 1000)}k ${f1(s.pv / n / 1000)}k ${(60 * s.fr / (s.t || 1)).toFixed(1).padStart(5)}   ${s.x.toFixed(2)},${s.y.toFixed(2)}   ${f1(s.k2 / n)} ${f1(s.k1 / n)} ${s.p ? (100 * s.k3 / s.p).toFixed(0).padStart(4) + '%' : '    -'}`);
    for (const k of Object.keys(tot)) tot[k] += s[k];
  });
  console.log(`${'ALL MOVING+STILL'.padEnd(18)} ${String(tot.fr).padStart(4)}  ${f1(tot.m / tot.fr)}                                          ${f1(tot.c / tot.fr / 1000)}k ${f1(tot.pv / tot.fr / 1000)}k ${(60 * tot.fr / tot.t).toFixed(1).padStart(5)}                  ${f1(tot.k2 / tot.fr)} ${f1(tot.k1 / tot.fr)}`);
}
if (runs.length > 1) {
  console.log('\n== cast kcycles per frame, side by side ==');
  console.log('segment            ' + runs.map(r => r.v.slice(0, 12).padStart(13)).join(''));
  PLS.forEach((p, i) => {
    if (!i) return;
    console.log(name(p.k).padEnd(18) + ' ' + runs.map(r => f1(r.seg[i].c / (r.seg[i].fr || 1) / 1000).padStart(12) + ' ').join(''));
  });
}
