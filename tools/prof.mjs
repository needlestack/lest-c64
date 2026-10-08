#!/usr/bin/env node
// Where a frame's time goes, per segment. Reads the on-chip profiler's accumulators instead of
// its screen output -- which prints hex over the game's own charset and reads as colour noise.
//
//   node tools/prof.mjs                    every segment, coarse phases
//   node tools/prof.mjs "ANGEL=0"          with a build flag
//   node tools/prof.mjs "" walk            one segment
//   node tools/prof.mjs "" walk ent        ENTPROF: split the entity bucket five ways
//
// The profiler brackets each phase of the main loop with a raster timestamp and sums the deltas
// over 256 frames, then halts. pfDone says it finished; pfAcc is 17 phases x 3 bytes, little
// endian, in RASTER LINES. Lines are the honest unit here -- fps is quantised to 60/n, so a
// change of several thousand cycles can move it not at all (both of this tool's first two runs
// read 29.98 while the same pair differed by a quarter by hand).
//
// PROFCOARSE by default: the fine ray buckets sit inside castRay, which runs ~20x a frame, so
// pfTick fires that often for each and charges its own cost to every one -- the fine shares once
// summed to 119% of the frame. ENTPROF reuses buckets 8-11 for the entity split, so it cannot be
// combined with the fine ray ones.
import { execFileSync } from 'child_process';

const COARSE = {
  0: 'input', 1: 'per-frame clears', 2: 'cast + interpolate + seams', 4: 'renderSym',
  5: 'fps counter + readout', 6: 'raster wait', 15: 'entities', 16: 'occStamp',
};
const ENT = { ...COARSE, 8: 'orbOccAll', 9: 'orbMove', 10: 'orbKey', 11: 'bfsTick', 15: 'angStep + dieChk' };
// ---- ONLY A SEGMENT THAT SURVIVES THE WHOLE WINDOW IS VALID HERE ----
// The profiler sums over 256 FRAMES, which at ~11 fps is ~23 seconds of game time. walk and
// strafe run clear for about five seconds before they hit a wall, so a profile of either is five
// seconds of motion and eighteen of standing in a corner, cached and cheap -- the cast reads far
// too low and every fixed bucket far too high. The fps benchmark guards this with a distance
// check; this one cannot, because it has no window to shorten.
// spin never moves, so it never bumps, and it sweeps all 256 cast angles. It is the only one of
// the three that can be profiled as it stands. Its total also cross-checks: 1079 lines / 263 per
// NTSC frame = 4.1, so ~14.6 fps against the 15.00 the benchmark measures independently.
const PROFILABLE = new Set(['spin']);
const SEGMENTS = {
  walk:   'WALK=1 PX=011a PY=0127 PA=21 PAF=c0',
  strafe: 'STRAFE=1 PX=0466 PY=08df PA=80 PAF=80',
  spin:   'SPIN=1 PX=044d PY=0579 PA=00 PAF=80',
};

const extra = process.argv[2] ?? '';
const only = process.argv[3];
const entMode = process.argv[4] === 'ent';
const names = entMode ? ENT : COARSE;
for (const [seg, pose] of Object.entries(SEGMENTS)) {
  if (only && seg !== only) continue;
  if (!only && !PROFILABLE.has(seg)) continue;            // see PROFILABLE
  if (!PROFILABLE.has(seg)) console.log(`${seg}: NOT PROFILABLE -- it bumps a wall long before ` +
    `the 256-frame window closes, so most of this is a stationary view. See PROFILABLE.`);
  // ENTPROF reuses the bucket indices PROFCOARSE FREES, so it is PROFCOARSE *plus* the entity
  // split, never an alternative to it. Passed alone, the fine ray buckets are still live inside
  // castRay and land on top of the entity ones -- which is how a keypress test came out at 108
  // raster lines a frame and the cast at 85, and why this file's first entity numbers were junk.
  const env = `CHAIN=1 PROFILE=1 PROFCOARSE=1 ${entMode ? 'ENTPROF=1 ' : ''}${pose}${extra ? ' ' + extra : ''}`;
  let out;
  try {
    // --until, NOT a long --wait. The window is 256 FRAMES and the emulator runs at warp, so it
    // closes in about a second of wall clock; a blind "--wait 20000" then sat there for another
    // nineteen before it so much as dialled the monitor, which is the whole reason a profile
    // seemed to hang. pfDone is the honest condition -- "the window has closed" -- and probe keeps
    // warp on for --until precisely because waiting for something to FINISH does not need real
    // time. The default 8s pre-connect wait stays: polling THROUGH the disk load slows the load.
    out = execFileSync(process.execPath,
      ['probe.mjs', env, 'pfAcc:51', 'pfDone:1', 'pfN:1', '--until', 'pfDone>=1',
       // A profile whose player DIES never closes its window: the cut scene owns the main loop and
       // pfN stops. That is not a slow run, it is a void one, and it deserves to say so in seconds.
       '--abort', 'dieSt>=1'],
      { cwd: new URL('.', import.meta.url).pathname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, DEADOK: '1' } });   // the profiler HALTS when it is done
  } catch (e) { console.log(`${seg}: build or run failed`); continue; }
  // The trailing "(16-bit: n)" is only printed for MULTI-byte specs, so a regex that requires the
  // paren silently fails on every 1-byte read -- which is why pfDone always reported unreadable.
  const row = n => new RegExp(`^${n}\\s+\\S+\\s+([0-9 ]+?)\\s*(?:\\(|$)`, 'm').exec(out)?.[1].trim().split(/\s+/).map(Number);
  const acc = row('pfAcc'), done = row('pfDone');
  if (!acc || acc.length < 51) { console.log(`${seg}: could not read pfAcc`); continue; }
  // The divisor is how many frames actually accumulated, not 256: pfN counts them and wraps at
  // 256, which is what sets pfDone. Dividing a partial window by 256 understates every phase
  // equally -- the shares stay right, the lines-a-frame figure does not.
  const nf = row('pfN');
  // pfN is ONE byte and the window is 256 frames, so a finished run reads pfN == 0 -- which is
  // why the flag has to be pfDone and not "pfN == 256". Falling back to pfN when pfDone cannot be
  // read would divide by zero on exactly the runs that went fine, so a missing pfDone is reported
  // as a missing pfDone, not silently patched.
  const frames = (done && done[0]) ? 256 : (nf && nf[0] ? nf[0] : 256);
  if (!done) console.log(`${seg}: could not read pfDone -- assuming the full ${frames}-frame window`);
  else if (!done[0]) console.log(`${seg}: window did not close -- ${frames} frames, shares are still valid`);
  const v = [...Array(17)].map((_, i) => acc[i * 3] + acc[i * 3 + 1] * 256 + acc[i * 3 + 2] * 65536);
  const total = v.reduce((a, b) => a + b, 0);
  console.log(`\n${seg}  --  ${(total / frames).toFixed(0)} raster lines a frame, over ${frames} frames`);
  v.map((lines, i) => ({ i, lines })).filter(p => p.lines && names[p.i])
   .sort((a, b) => b.lines - a.lines)
   .forEach(p => console.log(`   ${(names[p.i] ?? ('bucket ' + p.i)).padEnd(28)}` +
     `${String(Math.round(p.lines / frames)).padStart(5)} lines  ${(100 * p.lines / total).toFixed(1).padStart(5)}%`));
  const unnamed = v.map((l, i) => (l && !names[i]) ? i : null).filter(i => i !== null);
  if (unnamed.length) console.log(`   (buckets with no name in this mode: ${unnamed.join(', ')})`);
}
