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
import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, existsSync } from 'fs';
import net from 'net';
import { tmpdir } from 'os';
import { join } from 'path';

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
const ROOT = new URL('..', import.meta.url).pathname;
const X64 = '/Applications/vice-arm64-gtk3-3.8/bin/x64sc';
const PORT = 6510;

// ---- build to its own disk, so latest.d64 is never touched ----
const env = { ...process.env, D64: 'zz-vprof.d64' };
for (const kv of ENV.split(/\s+/).filter(Boolean)) { const [k, v] = kv.split('='); env[k] = v ?? '1'; }
const b = execSync('node build-iray.mjs 2>&1', { cwd: ROOT, env }).toString();
const ok = b.split('\n').find(l => l.startsWith('ok:'));
if (!ok) { console.error(b.split('\n').slice(-15).join('\n')); process.exit(1); }
const SYMS = JSON.parse(readFileSync(join(ROOT, 'iray.syms.json'), 'utf8'));
const addrOf = n => { if (!(n in SYMS)) throw new Error(`no label ${n}`); return SYMS[n]; };
// VICE label file: one `al C:addr .name` per label. Several names on one address: keep them all,
// VICE shows the first, which is fine.
const tmp = mkdtempSync(join(tmpdir(), 'vprof-'));
const lbl = join(tmp, 'iray.lbl');
writeFileSync(lbl, Object.entries(SYMS).filter(([n, a]) => typeof a === 'number' && /^[A-Za-z_]\w*$/.test(n))
  .map(([n, a]) => `al C:${a.toString(16).padStart(4, '0')} .${n}`).join('\n') + '\n');

if (execSync(`lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t 2>/dev/null || true`).toString().trim()) {
  console.error(`port ${PORT} is held -- a leaked emulator? pkill -f x64sc`); process.exit(2);
}
const cfg = join(tmp, 'vice.cfg'); writeFileSync(cfg, '');
const vice = spawn(X64, ['-ntsc', '-config', cfg, '+minimized', '-warp', '-drive8truedrive', '+virtualdev8',
  '-autostart-handle-tde', '-remotemonitor', '-remotemonitoraddress', `ip4://127.0.0.1:${PORT}`,
  '-moncommands', lbl, '-autostart', join(ROOT, 'zz-vprof.d64')], { stdio: 'ignore' });
const killer = setTimeout(() => { try { vice.kill('SIGKILL'); } catch {} console.error('HARD CAP: killed'); process.exit(3); }, (SECS + 60) * 1000);

// ---- the text monitor: connect (which stops the CPU), run commands, `x` resumes ----
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function session(cmds) {
  // VICE's text monitor sends nothing on connect. The FIRST reply is "(C:$xxxx) <output>(C:$yyyy) "
  // -- a prompt, the output, a prompt -- and every later reply on the connection only the output
  // and its closing prompt. Connecting stops the CPU; the final `x` resumes it.
  const PR = /\(C:\$[0-9a-f]{4}\) /g;
  for (let tries = 0; ; tries++) {
    try {
      return await new Promise((res, rej) => {
        const s = net.connect(PORT, '127.0.0.1');
        let buf = '', out = [], i = 0;
        const send = () => {
          if (i < cmds.length) { buf = ''; s.write(cmds[i++] + '\n'); }
          else { s.write('x\n'); setTimeout(() => { s.end(); res(out); }, 50); }
        };
        s.on('connect', send);
        s.on('data', d => {
          buf += d.toString();
          const need = i === 1 ? 2 : 1;
          if ((buf.match(PR) || []).length >= need && /\(C:\$[0-9a-f]{4}\) $/.test(buf)) {
            out.push(buf.replace(/^\(C:\$[0-9a-f]{4}\) /, '').replace(/\(C:\$[0-9a-f]{4}\) $/, ''));
            send();
          }
        });
        s.on('error', rej);
        setTimeout(() => rej(new Error('monitor timeout')), 60000);
      });
    } catch (e) { if (tries > 60) throw e; await sleep(500); }
  }
}
const rd16 = async a => {
  const [o] = await session([`m ${a.toString(16)} ${(a + 1).toString(16)}`]);
  const m = /:([0-9a-f]{4})\s+([0-9a-f]{2})\s+([0-9a-f]{2})/i.exec(o);
  return m ? parseInt(m[2], 16) | (parseInt(m[3], 16) << 8) : NaN;
};

(async () => {
  await sleep(1500);
  const FC = addrOf('frameCnt');
  if (UNTIL) {
    const at = addrOf(UNTIL);
    await session(['prof on']);
    let pc = -1;
    for (let k = 0; k < 2000; k++) {
      const [o] = await session(['r']);
      const m = /\.;([0-9a-f]{4})/i.exec(o); pc = m ? parseInt(m[1], 16) : -1;
      if (pc === at) break;
      await sleep(300);
    }
    if (pc !== at) throw new Error(`never reached ${UNTIL}`);
    const [flat] = await session(['prof off', `prof flat ${TOP}`]).then(o => [o[1]]);
    const frames = await rd16(addrOf('iterLo') ?? 0x29);
    if (DUMP) {
      if (!OUT) throw new Error('--dump needs --out');
      for (const r of DUMP.split(',')) {
        const [lo, hi] = r.split('-');
        const f = `${OUT}.${lo}.bin`; try { unlinkSync(f); } catch {}
        await session([`bsave "${f}" 0 ${lo} ${hi}`]);
        if (!existsSync(f)) throw new Error(`bsave wrote nothing for ${r}`);
      }
    }
    const names = [...flat.matchAll(/^\s*[\d,]+\s+[\d.na]+%\s+([\d,]+)\s+[\d.na]+%\s+(\S+)/gm)].map(m => m[2]).filter(n => n !== 'ROOT');
    const dis = [];
    for (const n of names.slice(0, NDIS)) { const [o] = await session([`prof disass ${n}`]); dis.push(`==== ${n}\n${o}`); }
    clearTimeout(killer); try { vice.kill('SIGKILL'); } catch {}
    const text = `vprof: ${ENV}\nwindow: boot to ${UNTIL}, ${frames} rendered frames; ${ok}\n\n${flat}\n${dis.join('\n')}`;
    if (OUT) writeFileSync(OUT, text);
    console.log(text);
    process.exit(0);
  }
  // wait for the game: frameCnt past T0 (it counts 60ths from boot)
  let fc = 0;
  for (let k = 0; k < 400; k++) { fc = await rd16(FC); if (fc >= T0) break; await sleep(250); }
  if (!(fc >= T0)) throw new Error(`frameCnt never reached ${T0} (last ${fc})`);
  const RF = SYMS.iterLo ?? 0x29;        // iterLo/iterHi: +1 per rendered frame (the main loop's inc)
  const t0 = await rd16(FC), r0 = RF ? await rd16(RF) : 0;
  await session(['prof on']);
  await sleep(SECS * 1000);
  const [flat] = await session(['prof off', `prof flat ${TOP}`]).then(o => [o[1]]);
  const t1 = await rd16(FC), r1 = RF ? await rd16(RF) : 0;
  const ticks = (t1 - t0) & 0xffff, frames = RF ? (r1 - r0) & 0xffff : null;
  // per-instruction breakdowns of the heaviest self-time routines
  const names = [...flat.matchAll(/^\s*[\d,]+\s+[\d.na]+%\s+([\d,]+)\s+[\d.na]+%\s+(\S+)/gm)].map(m => m[2]).filter(n => n !== 'ROOT');
  const dis = [];
  for (const n of names.slice(0, NDIS)) {
    const [o] = await session([`prof disass ${n}`]);
    dis.push(`==== ${n}\n${o}`);
  }
  clearTimeout(killer); try { vice.kill('SIGKILL'); } catch {}
  const head = `vprof: ${ENV}\nwindow: ${ticks} ticks (60ths)${frames != null ? `, ${frames} rendered frames` : ''}; ${ok}\n`;
  const text = head + '\n' + flat + '\n' + dis.join('\n');
  if (OUT) writeFileSync(OUT, text);
  console.log(text);
  process.exit(0);
})().catch(e => { console.error(e.message); try { vice.kill('SIGKILL'); } catch {} process.exit(1); });
