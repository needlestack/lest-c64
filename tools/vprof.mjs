// vprof.mjs -- an EXACT cycle profile of a build, from VICE's own monitor profiler.
//
//   node tools/vprof.mjs "CHAIN=4 IDOLSEAT=1 ANGFREEZE=1 SPIN=1" [--t0 600] [--secs 20] [--top 25]
//                        [--disass 8] [--out prof.txt]
//
// VICE 3.8's monitor has `prof`: it counts every cycle the CPU spends, attributed by JSR/RTS to
// the routine it is in ("self") and to everything below it ("total"), and can break any routine
// down per INSTRUCTION. No sampling and no profiler code in the build -- the binary is the
// shipping one (only the env's movers/poses differ). Attribution is by the real call structure,
// not by where someone put a pfTick bracket.
//
// The window: boot at warp, wait until frameCnt has advanced --t0 frames past boot (the level is
// up and the mover has been going), `prof on`, run --secs WALL seconds (still warp, so a long
// window: many hundreds of frames, which for SPIN averages over every heading), `prof off`.
// frameCnt (60ths) and iterLo/iterHi (rendered frames) are read at both ends, so the cycle counts
// can be divided down to PER RENDERED FRAME.
// Cycle counts include IRQ time, attributed to the IRQ handler's own entry.
//
// FIXED-WORKLOAD MODE (use this for A/B): build with SPINF=1 BENCHF=n and pass --until benchEnd.
// Every build then renders the same n frames, and two runs of one build agree TO THE CYCLE on every
// render routine. A timed window does not: it covers a different stretch of the spin each run
// (33-71 cy/frame of drift on renderSym between identical builds), and a faster build draws a
// different set of headings. In this mode the window includes BOOT, so the loader (Krill at
// $04xx, the KERNAL's $ffcf/$eea9, stackLT used as its buffer) and the idle wait vary with disk
// timing -- compare render routines, not the grand total.
//   node tools/vprof.mjs "CHAIN=1 SPINF=1 BENCHF=2000 ANGFREEZE=1 NOHUD=1" --until benchEnd
// Hard cap: the emulator is killed after --secs + 60 s whatever happens (one-minute rule).
import { writeFileSync, mkdtempSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ROOT, buildDisk, portHeld, launch, LAUNCH_FLAGS, textMonitor, session } from './vice.mjs';

const args = process.argv.slice(2);
const ENV = args[0] ?? '';
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const T0 = +opt('--t0', 600), SECS = +opt('--secs', 20), TOP = +opt('--top', 25), NDIS = +opt('--disass', 8);
const OUT = opt('--out', '');
// --until LABEL: a FIXED-WORKLOAD run (build with SPINF=1 BENCHF=n). Profile from the first
// moment the monitor answers until the CPU is parked at LABEL (benchEnd), so every build is
// measured over exactly the same n rendered frames. --t0/--secs are ignored.
const UNTIL = opt('--until', '');
// --dump e000-e7ff,fe00-fe9f (with --until): once parked, bsave each range to <--out>.<lo>.bin.
// The parked state is a fixed frame of a fixed workload, so two builds' dumps must be byte-identical
// when their output is: one run is both the cycle profile and the bitmap check.
const DUMP = opt('--dump', '');
// --shot file.png (with --until): a PNG of the parked frame, for eyeballing a change that is not byte-identical.
const SHOT = opt('--shot', '');
const PORT = 6510;

// ---- build to its own disk, so lest-c64.d64 is never touched ----
const { out: b, syms: SYMS, addrOf } = buildDisk(ENV, 'build/zz-vprof.d64');
const ok = b.split('\n').find(l => l.startsWith('ok:'));
if (!SYMS) { console.error('this build wrote no iray.syms.json'); process.exit(1); }
// VICE label file: one `al C:addr .name` per label, so the profile names routines.
const tmp = mkdtempSync(join(tmpdir(), 'vprof-'));
const lbl = join(tmp, 'iray.lbl');
writeFileSync(lbl, Object.entries(SYMS).filter(([n, a]) => typeof a === 'number' && /^[A-Za-z_]\w*$/.test(n))
  .map(([n, a]) => `al C:${a.toString(16).padStart(4, '0')} .${n}`).join('\n') + '\n');

const held = portHeld(PORT);
if (held) { console.error(`port ${PORT} is held by pid ${held} -- kill that process (not every x64sc)`); process.exit(2); }
// launch() owns the emulator: its whole process group dies on exit, Ctrl-C, an error, or the cap.
// The cap covers the whole run: --until mode waits for an event, not a wall-clock window.
const CAP = (UNTIL ? 240 : SECS + 60) * 1000;
launch([...LAUNCH_FLAGS, '-warp', '-remotemonitor', '-remotemonitoraddress', `ip4://127.0.0.1:${PORT}`,
  '-moncommands', lbl, '-autostart', join(ROOT, 'build/zz-vprof.d64')], { hardCapMs: CAP, label: 'vprof' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = o => o.replace(/^\(C:\$[0-9a-f]{4}\) /, '').replace(/\(C:\$[0-9a-f]{4}\) $/, '');
const rd16 = async (m, a) => { const [lo, hi] = await m.mem(a, 2); return lo | (hi << 8); };
const flatNames = flat => [...flat.matchAll(/^\s*[\d,]+\s+[\d.na]+%\s+([\d,]+)\s+[\d.na]+%\s+(\S+)/gm)]
  .map(m => m[2]).filter(n => n !== 'ROOT');

await sleep(1500);
if (UNTIL) {
  // EVENT-DRIVEN: a checkpoint at UNTIL stops the CPU exactly there. (This used to poll the PC every
  // 300 ms, which also let the parked loop run on into the profile.)
  const at = addrOf(UNTIL);
  const m = await textMonitor(PORT);
  await m.cmd('prof on');
  await m.cmd(`break ${at.toString(16)}`);
  const stop = await m.cmd('x');
  if (m.pcOf(stop) !== at) throw new Error(`stopped at $${m.pcOf(stop).toString(16)}, not ${UNTIL}`);
  await m.cmd('prof off');
  const flat = strip(await m.cmd(`prof flat ${TOP}`));
  const frames = await rd16(m, addrOf('iterLo'));
  if (SHOT) {
    try { unlinkSync(SHOT); } catch {}
    await m.cmd(`screenshot "${SHOT}" 2`);
    for (let k = 0; k < 20 && !existsSync(SHOT); k++) await sleep(100);
    if (!existsSync(SHOT)) throw new Error('screenshot wrote nothing');
  }
  if (DUMP) {
    if (!OUT) throw new Error('--dump needs --out');
    for (const r of DUMP.split(',')) {
      const [lo, hi] = r.split('-');
      const f = `${OUT}.${lo}.bin`; try { unlinkSync(f); } catch {}
      await m.cmd(`bsave "${f}" 0 ${lo} ${hi}`);
      if (!existsSync(f)) throw new Error(`bsave wrote nothing for ${r}`);
    }
  }
  const dis = [];
  for (const n of flatNames(flat).slice(0, NDIS)) dis.push(`==== ${n}\n${strip(await m.cmd(`prof disass ${n}`))}`);
  m.close();
  const text = `vprof: ${ENV}\nwindow: boot to ${UNTIL}, ${frames} rendered frames; ${ok}\n\n${flat}\n${dis.join('\n')}`;
  if (OUT) writeFileSync(OUT, text);
  console.log(text);
  process.exit(0);
}
// ---- timed window: wait for frameCnt to pass T0, profile SECS of wall clock ----
const FC = addrOf('frameCnt'), RF = addrOf('iterLo');
const read16 = async a => { const [o] = await session(PORT, [`m ${a.toString(16)} ${(a + 1).toString(16)}`]);
  const q = /:([0-9a-f]{4})\s+([0-9a-f]{2})\s+([0-9a-f]{2})/i.exec(o); return q ? parseInt(q[2], 16) | (parseInt(q[3], 16) << 8) : NaN; };
let fc = 0;
for (let k = 0; k < 400; k++) { fc = await read16(FC); if (fc >= T0) break; await sleep(250); }
if (!(fc >= T0)) throw new Error(`frameCnt never reached ${T0} (last ${fc})`);
const t0 = await read16(FC), r0 = await read16(RF);
await session(PORT, ['prof on']);
await sleep(SECS * 1000);
const [, flatRaw] = await session(PORT, ['prof off', `prof flat ${TOP}`]);
const flat = strip(flatRaw);
const t1 = await read16(FC), r1 = await read16(RF);
const ticks = (t1 - t0) & 0xffff, frames = (r1 - r0) & 0xffff;
const dis = [];
for (const n of flatNames(flat).slice(0, NDIS)) { const [o] = await session(PORT, [`prof disass ${n}`]); dis.push(`==== ${n}\n${strip(o)}`); }
const text = `vprof: ${ENV}\nwindow: ${ticks} ticks (60ths), ${frames} rendered frames; ${ok}\n\n${flat}\n${dis.join('\n')}`;
if (OUT) writeFileSync(OUT, text);
console.log(text);
process.exit(0);
