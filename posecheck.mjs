// posecheck.mjs -- does the route compiler's movement model match what the machine did?
//
//   node posecheck.mjs "ROUTE=bench CHAIN=1 DIE=0 NOORB=1 ANGEL=0"
//
// One run, and a table of model-vs-machine pose at the end of every step. A disagreement means
// the route lands somewhere its author did not send it, and NOTHING ELSE REPORTS THAT: moveFwd
// refuses or slides along a wall silently, the tick budget is spent regardless, and every later
// waypoint is off by the same amount. The build-time wall check catches a route that clips in the
// model; this catches a model that is wrong about the machine.
import { execFileSync } from 'child_process';

const envStr = process.argv[2] ?? '';
const env = { ...process.env };
for (const kv of envStr.split(/\s+/).filter(Boolean)) env[kv.slice(0, kv.indexOf('='))] = kv.slice(kv.indexOf('=') + 1);
Object.assign(env, { TOURW: '1', TOURPOSE: '1', POSEDUMP: '1' });

// The model's poses come from the build's own stdout. probe.mjs rebuilds with the same env and
// so gets the same route; the poses are a pure function of the route and the compiler.
const build = execFileSync(process.execPath, ['build-iray.mjs'], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const model = [...build.matchAll(/^\s+pose (\d+) (\d+) (\d+) (-?\d+) (-?\d+) (\d+)$/gm)]
  .map(m => ({ i: +m[1], type: +m[2], ticks: +m[3], x: +m[4], y: +m[5], a: +m[6] }));
if (!model.length) { console.error('the build printed no poses (is ROUTE set to a compiled route?)'); process.exit(1); }
const N = model.length;

const out = execFileSync(process.execPath, ['probe.mjs', `${envStr} TOURW=1 TOURPOSE=1 POSEDUMP=1`,
  'twPose:252', 'twN', '--until', `twN>=${N}`, '--wait', '20000'], { encoding: 'utf8' });
const m = out.match(/^twPose\s+\$[0-9a-f]+\s+([0-9 ]+?)(?:\s{2}|$)/m);
if (!m) { console.error(out); process.exit(1); }
const b = m[1].trim().split(/\s+/).map(Number);

const TYPES = ['walk', 'back', 'run', 'turnL', 'turnR', 'fturnL', 'fturnR', 'space', 'wait', 'fall', 'arcL', 'arcR', 'rarcL', 'rarcR'];
console.log(`step  type    ticks   model (x, y, a)            machine (x, y, a)          dx    dy    da`);
let worst = 0;
for (const s of model) {
  // twPose[k] is written at twStepOn, which runs at the top of the frame AFTER step k-1 expired
  // -- twN has already been bumped by the expiring frame's fall-through -- so it holds the pose
  // at the end of step k-1. Compare model step i with machine slot i+1.
  const o = (s.i + 1) * 6;
  if (o + 5 >= b.length || s.i === model.length - 1) break;   // the last step's end is never written:
                                                              //   nothing advances past it
  const mx = b[o] + 256 * b[o + 1], my = b[o + 2] + 256 * b[o + 3], ma = b[o + 4] + 256 * b[o + 5];
  const dx = mx - s.x, dy = my - s.y, da = ((ma - s.a + 32768) & 0xffff) - 32768;
  worst = Math.max(worst, Math.abs(dx), Math.abs(dy));
  const flag = Math.abs(dx) > 16 || Math.abs(dy) > 16 ? '  <-- OFF' : Math.abs(da) > 256 ? '  <-- angle' : '';
  console.log(`${String(s.i).padStart(3)}   ${TYPES[s.type].padEnd(7)} ${String(s.ticks).padStart(4)}   ` +
    `(${(s.x / 256).toFixed(2).padStart(6)}, ${(s.y / 256).toFixed(2).padStart(6)}, ${s.a.toString(16).padStart(4, '0')})   ` +
    `(${(mx / 256).toFixed(2).padStart(6)}, ${(my / 256).toFixed(2).padStart(6)}, ${ma.toString(16).padStart(4, '0')})   ` +
    `${String(dx).padStart(4)}  ${String(dy).padStart(4)}  ${String(da).padStart(5)}${flag}`);
}
console.log(`\nworst position error ${worst} / 256 cells = ${(worst / 256).toFixed(3)} cells` +
  (worst > 16 ? ' -- THE MODEL IS WRONG somewhere above; fix compileRoute, not the route' : ' -- the model holds'));
