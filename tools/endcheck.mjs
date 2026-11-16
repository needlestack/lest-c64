#!/usr/bin/env node
// endcheck.mjs -- THE ENDING, end to end: the end quote's hold, its skip, the tree's clock, REBOOT.
//
//   node tools/endcheck.mjs ["FLAGS"]      (FLAGS: build flags, as fpsr's first argument; fpsr's
//                                         suite runs this last, with its own)
//
// The fps suite stops at level 9 and nothing else reaches the ending (the outside review, 2026-11-16),
// so this is its regression test. One test build (ENDTEST=1: level 1's exit is the last hole;
// FALLNOW=64 falls through it; ENDAUTO=120 presses fire 120 frames after the dissolve, which starts
// REBOOT), written to build/zz-end.d64 and its .crt -- never to lest-c64.d64 -- then four runs:
//
//   disk, NTSC   the hold timed: 6 s (holdS) on the 60 Hz clock
//   disk, PAL    the hold timed: 6 s on the 50 Hz clock (it was 7.2 before 2026-11-15)
//   cart, NTSC   the skip: a press HELD from the start skips nothing; a fresh one does
//   cart, PAL    the same (the cart's hold is CART_END_HOLD_S, 11 s)
//
// and in every run: the tree's sound/leaves/lights ticks per frame through the whole dissolve (1 on
// NTSC, 6/5 on PAL), that no frame is lost and no gust starts while it runs, that the first gust
// comes about a second after it (2026-11-16: gusts wait for the dissolve), and
// REBOOT reaching the game's entry with palF what the machine is (the reload used to zero it).
// Every number is checked; exit 1 if any fails. About a minute and a half.
//
// The build rewrites build/iray.asm and the symbol files; the tracked iray.asm is put back after.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ROOT, buildDisk, launch, textMonitor, LAUNCH_FLAGS } from './vice.mjs';

const D64 = 'build/zz-end.d64', CRT = 'build/zz-end.crt';
const asmPath = join(ROOT, 'build/iray.asm');
const asmKeep = existsSync(asmPath) ? readFileSync(asmPath) : null;
let R, Q, T, cartHold;
try {
  R = buildDisk(`${process.argv[2] ?? ''} ENDTEST=1 FALLNOW=64 ENDAUTO=120`, D64).syms;   // fire 2 s after the dissolve: past the first gust
  Q = JSON.parse(readFileSync(join(ROOT, 'build/end.syms.json'), 'utf8'));
  T = JSON.parse(readFileSync(join(ROOT, 'build/itre.syms.json'), 'utf8'));
  cartHold = (await import('../src/cart-src.mjs')).CART_END_HOLD_S;
} finally { if (asmKeep) writeFileSync(asmPath, asmKeep); }
if (!R) { console.error('no symbols from the test build'); process.exit(1); }

const CLOCK = { ntsc: { hz: 1022727, frame: 65 * 263 }, pal: { hz: 985248, frame: 63 * 312 } };
const h = n => n.toString(16).padStart(4, '0');
let bad = 0;
const check = (ok, what) => { if (!ok) bad++; console.log(`    ${ok ? 'ok  ' : 'FAIL'}  ${what}`); };

async function run(medium, machine, test, n) {
  const pal = machine === 'pal', C = CLOCK[machine], port = 6700 + (process.pid % 200) + n;
  const flags = LAUNCH_FLAGS.map(f => f === '-ntsc' || f === '-pal' ? (pal ? '-pal' : '-ntsc') : f);
  const media = medium === 'cart' ? ['-cartcrt', join(ROOT, CRT), '+easyflashcrtwrite'] : ['-autostart', join(ROOT, D64)];
  const v = launch([...flags, '-warp', ...media, '-remotemonitor', '-remotemonitoraddress', `ip4://127.0.0.1:${port}`], { hardCapMs: 90000 });
  const m = await textMonitor(port);
  const go = async a => { await m.cmd('delete'); await m.cmd(`break ${h(a)}`); return m.pcOf(await m.cmd('x')); };
  const b = async a => (await m.mem(a, 1))[0];
  const sw = async () => +/Stopwatch:\s*(\d+)/.exec(await m.cmd('sw'))[1];
  const press = on => m.cmd(`> dc03 ${on ? '10' : '00'}`).then(() => m.cmd('> dc01 00'));
  const holdS = medium === 'cart' ? cartHold : 6;
  console.log(`  ${medium}, ${machine.toUpperCase()}: ${test}`);
  try {
    await go(Q.qhL);                                  // the hold has begun (IEND, ITRE loaded behind it)
    check(await b(Q.qPal) === (pal ? 1 : 0), `IEND read palF = ${await b(Q.qPal)}`);
    check(await b(Q.qSec) === holdS, `the hold is ${await b(Q.qSec)} s (wants ${holdS})`);
    if (test === 'time') {
      await m.cmd('sw reset');
      await go(Q.qhD);
      const s = await sw() / C.hz;
      check(Math.abs(s - holdS) < 0.05, `held ${s.toFixed(2)} s`);
    } else {
      await press(true);                               // held from the start: must not skip
      await m.cmd('delete'); await m.cmd(`break ${h(Q.qhL)}`);
      await m.cmd('x'); await m.cmd('x');
      check(!(await b(Q.qArm)), `a press held for 2 s skipped nothing (${await b(Q.qSec)} s left)`);
      await press(false); await m.cmd('x');
      await press(true);
      const pc = await go(Q.qhD), left = await b(Q.qSec);
      check(pc === Q.qhD && left >= holdS - 4, `a fresh press cut the hold with ${left} s left`);
      await press(false);
    }
    // THE TREE: every frame of the dissolve (dslv once a frame), counting ticks between
    await go(T.tStart);
    await m.cmd('delete'); await m.cmd(`break ${h(T.dslv)}`); await m.cmd(`break ${h(T.tick)}`);
    await m.cmd(`break ${h(T.gnew)}`);
    let frames = 0, ticks = 0, cyc = 0, gusts = 0;
    await m.cmd('x');                                   // the first tick or dslv
    await m.cmd('sw reset');
    while (frames < 600) {
      const pc = m.pcOf(await m.cmd('x'));
      if (pc === T.tick) { ticks++; continue; }
      if (pc === T.gnew) { gusts++; continue; }
      frames++;
      if (await b(0x28)) break;                         // ddone
    }
    check(gusts === 0, `no gust started during the dissolve (${gusts})`);
    cyc = await sw();
    const ratio = ticks / frames, want = pal ? 1.2 : 1;
    check(Math.abs(ratio - want) < 0.02, `dissolve: ${frames} frames, ${ticks} ticks (${ratio.toFixed(3)} a frame, wants ${want})`);
    // NO frame lost. Until 2026-11-16 a gust could run during the dissolve's full-speed end (120
    // pixels a frame NTSC, 144 PAL) and a frame where it turned many leaves ran over: 2-8 of 387 lost
    // on NTSC, 0-16 of 322 on PAL. The gusts now wait for the dissolve. (Half a frame of slack: the
    // count starts and ends at dslv, not on a frame boundary.)
    const lost = cyc / C.frame - frames;
    check(lost < 0.5, `dissolve took ${(cyc / C.hz).toFixed(2)} s = ${(cyc / C.frame).toFixed(1)} frames: none lost`);
    // ...and the first gust a second (60 ticks) after it -- gcalm's start, which waited
    let after = 0;
    while (after < 200) { const p = m.pcOf(await m.cmd('x')); if (p === T.gnew) break; if (p === T.tick) after++; }
    check(after >= 55 && after <= 65, `the first gust came ${after} ticks after the dissolve (wants ~60)`);
    // ENDAUTO presses fire: REBOOT reloads the game and starts it
    await go(Q.reboot);
    const pc = await go(R.entry);
    check(pc === R.entry && await b(R.palF) === (pal ? 1 : 0), `REBOOT reached entry with palF = ${await b(R.palF)}`);
    return cyc / C.hz;
  } catch (e) { bad++; console.log(`    FAIL  ${e.message}`); }
  finally { m.close(); v.kill(); }
}

const t0 = Date.now();
const runs = [['disk', 'ntsc', 'time'], ['disk', 'pal', 'time'], ['cart', 'ntsc', 'skip'], ['cart', 'pal', 'skip']];
const dis = [];
for (let i = 0; i < runs.length; i++) dis.push(await run(...runs[i], i));
console.log('  the dissolve on both machines:');
check(dis[0] && dis[1] && Math.abs(dis[0] - dis[1]) < 0.25, `NTSC ${dis[0]?.toFixed(2)} s, PAL ${dis[1]?.toFixed(2)} s`);
console.log(bad ? `*** ${bad} PROBLEM(S) -- see above ***` : `the ending ran clean (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(bad ? 1 : 0);
