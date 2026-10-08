// seamprof.mjs -- where the frame goes over a whole scripted walk, with pfTick's own cost taken
// back out. Two VICE runs, ~25 seconds each.
//
//   node tools/seamprof.mjs                       the benchmark route, level 1, no objects (bench.sh)
//   node tools/seamprof.mjs --route=walk          the game walkthrough instead (has entities in it)
//   node tools/seamprof.mjs --env "SEAMS=0"       any extra build vars, for A/B
//   node tools/seamprof.mjs --coarse              one run, top-level buckets only, no correction
//
// WHY A TOUR AND NOT A VIEWPOINT. fps here swings 8 to 30 with position and heading, so a number
// from one spot says almost nothing about the build. The tour is driven in 60Hz TICKS and so takes
// the same REAL TIME whatever the frame rate: 3,606 ticks, 60.1 seconds, on any build. That makes
// two things comparable that otherwise are not -- the frames rendered (which IS the fps) and each
// phase's share of a fixed minute.
//
// WHY TWO RUNS. pfTick charges its own cost to the bucket it closes, and the fine-grained buckets
// close about twenty times a frame each; uncorrected, one measurement in this engine was 78%
// instrumentation and a phase split once summed to 119% of the frame. The correction is
// raw - N x cost. PROFN counts N, and the cost is what the coarse and fine runs differ by:
//
//     cost = (work/frame at PROFSUB - work/frame at PROFCOARSE)
//          / (ticks/frame at PROFSUB - ticks/frame at PROFCOARSE)
//
// Both runs walk the same route for the same number of ticks, so their AVERAGE frame is the same
// scene mix even though the slower build renders fewer of them -- which is the property that makes
// per-frame figures from two different builds subtractable at all. Per-frame, not totals: a slower
// build renders fewer frames over the fixed minute, so its bucket TOTALS are smaller for a reason
// that has nothing to do with what is being measured.
import { execFileSync } from 'child_process';

const argv = process.argv.slice(2);
const arg = (n, d) => { const a = argv.find(s => s.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const ROUTE = arg('route', 'bench');   // ROUTE=bench is THE benchmark; see bench.sh
const EXTRA = argv.includes('--env') ? argv[argv.indexOf('--env') + 1] : '';
const COARSE_ONLY = argv.includes('--coarse');

// One line is 65 cycles and a frame is 263 lines on the 6567R8, which is the chip -ntsc gives us.
const CY = 65;
// Bucket -> what closes it. The ldx immediates at the pfTick call sites ARE these indices; the
// sub-only ones do not exist in a PROFCOARSE build and read as zero there, which is how the
// table below tells the two runs apart without being told which is which.
const PH = [
  [0,  'input'],                 [1,  'table clears'],
  [2,  'cast+interp+seams'],     [3,  'ray: angle dispatch',  'sub'],
  [4,  'renderSym'],             [5,  'fps + readout'],
  [6,  'raster wait'],           [7,  'delimiter sort',       'sub'],
  [8,  'interpSpan',   'sub'],   [9,  'seamSpan',             'sub'],
  [10, 'ray: side dists','sub'], [11, 'ray: DDA loop',        'sub'],
  [12, 'ray: hit+march', 'sub'], [13, 'pivOne',               'sub'],
  [14, 'subLp span stack','sub'],[15, 'entities'],
  [16, 'occStamp'],
];
const WAIT = 6;

const run = coarse => {
  const env = `ROUTE=${ROUTE} CHAIN=1 DIE=0 NOORB=1 ANGEL=0 TOURW=1 ` +
              `PROFILE=1 PROFTOUR=1 PROFN=1 ${coarse ? 'PROFCOARSE=1 ' : ''}${EXTRA}`;
  process.stderr.write(`  ${coarse ? 'PROFCOARSE' : 'PROFSUB   '}  ${EXTRA || '(defaults)'} ...`);
  const out = execFileSync(process.execPath, [new URL('probe.mjs', import.meta.url).pathname, env,
    'pfAcc:51', 'pfNum:34', 'twFrm:2', 'twTck:2', 'twN', 'pfDone',
    '--until', 'pfDone>=1', '--wait', '20000'], { encoding: 'utf8' });
  const field = n => {
    const m = out.match(new RegExp(`^${n}\\s+\\$[0-9a-f]+\\s+([0-9 ]+?)(?:\\s{2}|$)`, 'm'));
    if (!m) throw new Error(`probe printed no ${n}:\n${out}`);
    return m[1].trim().split(/\s+/).map(Number);
  };
  const acc = field('pfAcc'), num = field('pfNum');
  const w16 = (b, i) => b[i] + 256 * b[i + 1];
  const r = {
    lines: PH.map(([i]) => acc[i * 3] + 256 * acc[i * 3 + 1] + 65536 * acc[i * 3 + 2]),
    ticks: PH.map(([i]) => w16(num, i * 2)),
    frames: w16(field('twFrm'), 0), tck: w16(field('twTck'), 0),
    steps: field('twN')[0], done: field('pfDone')[0],
  };
  // The latch is the only thing that says the numbers describe a WHOLE tour rather than however
  // much of one had happened when the emulator was read. Without it every figure below is a
  // fraction of the route, and nothing about it would look wrong.
  if (!r.done) throw new Error(`the profiler never latched: the tour stopped at step ${r.steps}`);
  process.stderr.write(` ${r.frames} frames over ${(r.tck / 60).toFixed(1)}s\n`);
  return r;
};

const C = run(true);
const S = COARSE_ONLY ? null : run(false);

const per = (r, a) => a.map(v => v / r.frames);
// Work is everything that is not the raster wait. The wait is what absorbs instrumentation, which
// is exactly why it must be outside this sum: with it in, both runs total the same wall clock and
// the difference the correction is derived from would be identically zero.
const work = r => r.lines.reduce((s, v, i) => s + (i === WAIT ? 0 : v), 0);
const nAll = r => r.ticks.reduce((s, v) => s + v, 0);

// --cost=N: reuse a pfTick cost measured by an earlier two-run pass. An A/B of two BUILDS wants
// only the coarse run of each -- the fine buckets are not what is being compared -- and that is
// one VICE run apiece instead of two, which matters against a five-run budget. The cost is a
// property of pfTick, not of the build under test, so carrying it across is sound as long as
// pfTick itself has not been edited.
let cost = argv.find(s => s.startsWith('--cost=')) ? +arg('cost') : null;
if (S) {
  const dW = work(S) / S.frames - work(C) / C.frames;
  const dN = nAll(S) / S.frames - nAll(C) / C.frames;
  cost = dW / dN;
}

const show = (r, label) => {
  const F = r.frames, tot = r.lines.reduce((a, b) => a + b, 0);
  console.log(`\n${label}: ${F} frames over ${(r.tck / 60).toFixed(1)}s = ` +
    `${(F / (r.tck / 60)).toFixed(2)} fps, ${(tot / F).toFixed(0)} lines/frame ` +
    `(${((tot / F) * CY).toFixed(0)} cycles)`);
  if (cost !== null)
    console.log(`  pfTick measured at ${cost.toFixed(1)} lines = ${(cost * CY).toFixed(0)} cycles a call` +
      `, and this run makes ${(nAll(r) / F).toFixed(1)} calls a frame`);
  // lines/tour is the column to A/B two builds on. lines/frame cannot be compared across builds
  // that render different numbers of frames: renderSym alone gets CHEAPER per frame as the frame
  // rate rises, because less moves between one frame and the next and the dirty-char cache has
  // less to redraw -- so a change that speeds the engine up flatters its own per-frame renderSym.
  // Over a tour of fixed wall-clock length that cancels: the same route is drawn either way.
  console.log('  bucket                 lines/fr   cycles   share   ticks/fr' +
              (cost !== null ? '   corrected   lines/tour' : ''));
  const rows = PH.map(([i, name], k) => {
    const raw = r.lines[k] / F, n = r.ticks[k] / F;
    const corr = cost === null ? raw : raw - n * cost;
    return { i, name, raw, n, corr, tot: r.lines[k] };
  }).filter(x => x.tot > 0 || x.n > 0);
  const sumCorr = rows.reduce((s, x) => s + (x.i === WAIT ? 0 : x.corr), 0);
  for (const x of rows.sort((a, b) => b.corr - a.corr))
    console.log(`  ${String(x.i).padStart(2)} ${x.name.padEnd(20)} ` +
      `${x.raw.toFixed(1).padStart(7)} ${(x.raw * CY).toFixed(0).padStart(8)} ` +
      `${(x.i === WAIT ? '' : (100 * x.corr / sumCorr).toFixed(1) + '%').padStart(7)} ` +
      `${x.n.toFixed(1).padStart(9)}` +
      (cost !== null ? `   ${x.corr.toFixed(1).padStart(7)}   ${(x.corr * F).toFixed(0).padStart(10)}` : ''));
  if (cost !== null)
    console.log(`  ${'TOTAL work (no wait)'.padEnd(23)}${''.padStart(7)} ${''.padStart(8)} ` +
      `${''.padStart(7)} ${''.padStart(9)}   ${sumCorr.toFixed(1).padStart(7)}   ` +
      `${(sumCorr * F).toFixed(0).padStart(10)}  = ${(sumCorr * F * CY / 1e6).toFixed(2)}M cycles ` +
      `of the ${(r.tck / 60 * 1022727 / 1e6).toFixed(1)}M the tour lasts`);
};

if (S) show(S, 'PROFSUB'); else show(C, 'PROFCOARSE');
show(C, 'PROFCOARSE (the trustworthy top-level split)');
