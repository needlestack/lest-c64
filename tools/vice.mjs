// vice.mjs -- the ONE way this project builds a disk, launches VICE, talks to its monitor and cleans up.
//
// Seven scripts used to do each of these their own way, and the differences were bugs:
//   * bin/x64sc is a shell WRAPPER whose child is the real emulator, so killing the spawned pid left
//     the emulator running. Some tools then cleaned up with `pkill -f x64sc` (closing a VICE the user
//     had open), probe.mjs killed every x64sc that appeared during its run (a concurrent run's too),
//     and NONE survived Ctrl-C or a crash without leaking one.
//   * symbol files were read without checking they came from the build just run.
//   * the text-monitor session code existed twice, the launch flags four times.
// Everything here is shared; a tool keeps only what is specific to its job.
//
// Exports:
//   ROOT, X64                      paths
//   parseEnv(str, base)            "CHAIN=4 IDOLSEAT=1 FOO" -> an env object (bare FOO means FOO=1)
//   buildDisk(envStr, d64)         run build-iray.mjs to d64; returns { out, syms, addrOf } or exits.
//                                  syms comes from iray.syms.json only if it was written BY THIS build.
//   portHeld(port)                 pids listening on a TCP port ('' if none)
//   LAUNCH_FLAGS                   the drive/loader flag set every warp run needs (see the note)
//   launch(args, opts)             spawn x64sc in its own process group; returns { pid, kill }.
//                                  The group is killed on normal exit, Ctrl-C, SIGTERM, an uncaught
//                                  error, or when opts.hardCapMs expires -- never anything else.
//   runToExit(args, capMs)         launch, wait for the emulator to exit by itself (or the cap), clean up
//   textMonitor(port)              a persistent text-monitor connection: { cmd, mem, pcOf, resume, close }
//   session(port, cmds)            one-shot: connect (stops the CPU), run cmds, resume
import { execSync, spawn } from 'child_process';
import { readFileSync, statSync, writeFileSync, mkdtempSync, openSync } from 'fs';
import net from 'net';
import { tmpdir } from 'os';
import { join } from 'path';

// LEST_ROOT: the tree to build and run, when it isn't this one. regress.sh points THIS tree's tools
// at the base revision's worktree, so both sides are measured by one tool set and a tool change in
// the working tree (a new VICE path, 2026-10-15) can't make the base side fail.
export const ROOT = process.env.LEST_ROOT || new URL('..', import.meta.url).pathname;
export const X64 = '/Applications/vice-arm64-gtk3-3.9/bin/x64sc';

export const parseEnv = (str, base = process.env) => {
  const env = { ...base };
  for (const kv of (str ?? '').split(/\s+/).filter(Boolean)) { const [k, v] = kv.split('='); env[k] = v ?? '1'; }
  return env;
};

export const buildDisk = (envStr, d64) => {
  const env = parseEnv(envStr, { ...process.env, D64: d64 });
  const t0 = Date.now() - 1000;          // allow for filesystem timestamp granularity
  let out = '';
  try { out = execSync('node src/build-iray.mjs 2>&1', { cwd: ROOT, env }).toString(); }
  catch (e) { out = (e.stdout ?? '').toString() + (e.stderr ?? '').toString(); }
  if (!out.split('\n').some(l => l.startsWith('ok:'))) {
    console.error('BUILD FAILED:\n  ' + out.trim().split('\n').slice(-6).join('\n  '));
    process.exit(1);
  }
  // FRESH SYMBOLS ONLY. compact.mjs rewrites iray.syms.json on every build (and deletes it when it
  // cannot produce correct addresses), so a file older than this build is from some other build.
  const symPath = join(ROOT, 'build/iray.syms.json');
  let syms = null;
  try { if (statSync(symPath).mtimeMs >= t0) syms = JSON.parse(readFileSync(symPath, 'utf8')); } catch {}
  const addrOf = n => {
    if (!syms) throw new Error('no iray.syms.json from this build -- compaction did not write one');
    if (!(n in syms)) throw new Error(`no label ${n} in this build`);
    return syms[n];
  };
  return { out, syms, addrOf };
};

export const portHeld = port =>
  execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null || true`).toString().trim();

// THE DRIVE FLAGS (see probe.mjs's 2026-09-25 note): Krill's loader talks to a REAL 1541, so the true
// drive is ON and the kernal-trap loader OFF -- with the trap loader the boot stalls after the quote
// screen. -autostart-handle-tde makes autostart use that drive. Passed explicitly every time because
// VICE drops at-default resources from vicerc. +minimized: the user can still see the window.
export const LAUNCH_FLAGS = ['-ntsc', '+minimized', '-drive8truedrive', '+virtualdev8', '-autostart-handle-tde'];

// ---- process-group lifetime: one registry, cleaned on every way out ----
const live = new Set();
const killAll = () => { for (const k of [...live]) k(); };
let hooked = false;
const hookExit = () => {
  if (hooked) return; hooked = true;
  process.on('exit', killAll);                               // process.kill is synchronous: safe here
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'])
    process.on(sig, () => { killAll(); process.exit(sig === 'SIGINT' ? 130 : 143); });
  process.on('uncaughtException', e => { killAll(); console.error(e?.stack ?? e); process.exit(1); });
  process.on('unhandledRejection', e => { killAll(); console.error(e?.stack ?? e); process.exit(1); });
};

// opts: { config: path|true (a private empty vicerc; default true), log: path, hardCapMs, label }
// A PRIVATE config by default: the user's vicerc may enable a monitor on a port this run needs, or
// carry settings that change what the run measures.
export const launch = (args, opts = {}) => {
  hookExit();
  let cfgArgs = [];
  if (opts.config !== false) {
    const cfg = typeof opts.config === 'string' ? opts.config : join(mkdtempSync(join(tmpdir(), 'vice-')), 'vice.cfg');
    writeFileSync(cfg, '');
    cfgArgs = ['-config', cfg];
  }
  const out = opts.log ? openSync(opts.log, 'w') : 'ignore';
  const proc = spawn(X64, [...cfgArgs, ...args], { stdio: ['ignore', out, out], detached: true });
  let dead = false;
  const kill = () => {
    if (dead) return; dead = true; live.delete(kill);
    try { process.kill(-proc.pid, 'SIGKILL'); } catch {}     // the WHOLE group: wrapper and emulator
  };
  live.add(kill);
  proc.on('exit', () => { /* the wrapper exited; the group may not have -- kill() still sweeps it */ });
  if (opts.hardCapMs) {
    const t = setTimeout(() => { console.error(`HARD CAP${opts.label ? ' (' + opts.label + ')' : ''}: killed after ${opts.hardCapMs / 1000}s`); kill(); process.exit(3); }, opts.hardCapMs);
    t.unref?.();
  }
  return { pid: proc.pid, proc, kill };
};

// For screenshot-style runs that end themselves (-limitcycles / -exitscreenshot): wait for the
// emulator to exit, or kill it at the cap; either way nothing is left behind.
export const runToExit = (args, capMs, opts = {}) => new Promise(res => {
  const v = launch(args, { ...opts, hardCapMs: 0 });
  const t = setTimeout(() => { v.kill(); res(false); }, capMs);
  v.proc.on('exit', () => { clearTimeout(t); v.kill(); res(true); });
});

// ---- the text monitor (-remotemonitor) ----
// VICE's text monitor sends NOTHING on connect; the first reply is "(C:$xxxx) <output>(C:$yyyy) "
// and each later one "<output>(C:$yyyy) ". A connection stops the CPU; `x` resumes it, and a
// checkpoint hit stops it again with a fresh prompt on the same socket. So: one persistent socket,
// every command waits for the closing prompt, and the caller decides when to resume.
// C: is the computer; 8: (9:...) is a DRIVE's CPU after `device 8:`, whose prompt differs
const PR = /\((?:C|\d+):\$([0-9a-f]{4})\) $/;
export const textMonitor = async (port, { connectTries = 160, replyMs = 60000 } = {}) => {
  let sock;
  for (let k = 0; ; k++) {
    try { await new Promise((res, rej) => { sock = net.connect(port, '127.0.0.1', res); sock.on('error', rej); }); break; }
    catch { if (k >= connectTries) throw new Error(`no text monitor on port ${port}`); await new Promise(r => setTimeout(r, 250)); }
  }
  let buf = '', waiter = null;
  sock.on('data', d => { buf += d.toString(); waiter?.(); });
  const until = () => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('monitor reply timeout')), replyMs);
    waiter = () => { const m = PR.exec(buf); if (m) { clearTimeout(t); const o = buf; buf = ''; waiter = null; res(o); } };
    waiter();
  });
  const cmd = async c => { buf = ''; sock.write(c + '\n'); return until(); };
  // m a b -> bytes; the dump lines look like ">C:e000  20 20 20 20  20 ...   ascii"
  const mem = async (a, n) => {
    const o = await cmd(`m ${a.toString(16)} ${(a + n - 1).toString(16)}`), b = [];
    for (const l of o.split('\n')) {
      const m = /^>(?:C|\d+):[0-9a-f]{4}\s+((?:[0-9a-f]{2}\s+){1,16})/i.exec(l);   // C: or a drive's 8:
      if (m) b.push(...m[1].trim().split(/\s+/).map(h => parseInt(h, 16)));
    }
    return b.slice(0, n);
  };
  const pcOf = reply => parseInt((PR.exec(reply) ?? [0, 'ffff'])[1], 16);
  // resume: let the CPU run and drop the connection (the next connect stops it again)
  const resume = () => { try { sock.write('x\n'); } catch {} setTimeout(() => { try { sock.destroy(); } catch {} }, 50); };
  return { cmd, mem, pcOf, resume, close: () => { try { sock.destroy(); } catch {} } };
};
// One-shot: connect (stopping the CPU), run cmds, resume. Returns each command's output.
export const session = async (port, cmds, opts) => {
  const m = await textMonitor(port, opts), out = [];
  for (const c of cmds) out.push(await m.cmd(c));
  m.resume();
  return out;
};
