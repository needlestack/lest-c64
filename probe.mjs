// probe.mjs -- read named variables out of a RUNNING build, self-verifying.
//
//   node probe.mjs "TOURW=1 LVL=1 DIE=0" twN twFrm:4 occChk occBad
//   node probe.mjs "TOURW=1 LVL=1" twN --expect "twN<=17" --wait 22000
//
// Every wrong number this tool exists to prevent had the same shape: an address or a field
// offset that was right for a DIFFERENT build or a different layout. Stale labels twice, a
// histogram written over the profiler's own state, a rolling accumulator read mid-window, a
// wrong denominator. Each printed a plausible value and none of them announced itself.
//
// So the rules here are structural, not advisory:
//   * ONE build. The same invocation that writes latest.d64 emits the labels, so an address
//     can never come from a build the disk is not.
//   * A missing label is fatal. It used to yield an empty string, `$NaN`, and three reads of
//     the same nonsense.
//   * A short or mismatched reply is fatal. VICE's binary monitor answers with the request id
//     it was given; match on that, never on arrival order, and check the length that comes back.
//   * --expect assertions run before anything is printed, so an impossible value stops the run
//     instead of being interpreted.
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import net from 'net';

const VICE = '/Applications/vice-arm64-gtk3-3.8/bin/x64sc';
const DISK = './latest.d64';
const args = process.argv.slice(2);
if (!args.length) { console.error('usage: node probe.mjs "ENV=1 ..." name[:bytes] ...'); process.exit(2); }

const envStr = args.shift();
const wantWait = +((args.find(a => a === '--wait') ? args[args.indexOf('--wait') + 1] : 0)) || 45000;
// --at A[,B]: read when frameCnt first reaches tick A, and again at B. ABSOLUTE ticks since the
// program started, not "N from now" -- at warp the client cannot connect before a good deal of game
// time has already passed, and how much varies, so "N from now" lands somewhere different in every
// run. Two checkpoints give a WINDOW: the delta between them is what a rate has to be computed
// over. Without --at, everything is read once, whenever the program is first seen running.
const atArg = args.find(a => a === '--at') ? args[args.indexOf('--at') + 1] : '';
const marks = atArg.split(',').map(Number).filter(n => n > 0);
const expects = [];
const specs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--wait' || args[i] === '--at') { i++; continue; }
  if (args[i] === '--expect') { expects.push(args[++i]); continue; }
  specs.push(args[i]);
}
const names = specs.map(s => s.split(':')[0]);

// ---- ONE build: it writes the disk AND tells us the addresses in that disk ----
const env = { ...process.env };
for (const kv of envStr.split(/\s+/).filter(Boolean)) {
  const k = kv.slice(0, kv.indexOf('=')), v = kv.slice(kv.indexOf('=') + 1);
  env[k] = v;
}
// frameCnt is the liveness witness: the program's own IRQ increments it, so if it does not move
// between two reads the machine is still in the loader (or jammed) and every other byte is image
// data, not runtime state. Reading a not-yet-running program is what produced a whole afternoon of
// plausible nonsense, so it is checked before anything is interpreted -- never assumed from a wait.
const LIVE = 'frameCnt';
env.LABELS = [...names, LIVE].join(',');   // the hook prints every label whose name contains one
let out = '';
try {
  out = execSync(`node build-iray.mjs`, { env, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
} catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
const build = out + '';
if (!/^ok:/m.test(build)) {
  const asm = build.match(/ASM ERROR.*/);
  console.error('BUILD FAILED -- the disk is whatever a previous build left behind.');
  console.error('  ' + (asm ? asm[0] : build.trim().split('\n').slice(-3).join('\n  ')));
  process.exit(1);
}
// LABELS matches by substring, so ask once per name and take the exact hit.
const addr = {};
for (const n of [...names, LIVE]) {
  const m = build.match(new RegExp(`^\\s*label ${n} = \\$([0-9a-f]+)\\s*$`, 'm'));
  if (!m) { console.error(`LABEL NOT FOUND: ${n} -- it does not exist in this configuration.`); process.exit(1); }
  addr[n] = parseInt(m[1], 16);
}
if (!existsSync(DISK)) { console.error('no latest.d64'); process.exit(1); }

// ---- run it, never touching an emulator that was already open ----
const before = new Set(execSync('pgrep -f x64sc || true').toString().split('\n').filter(Boolean));
// A PRIVATE monitor port, not the default 6502. Another x64sc holding 6502 -- the user's own
// window, or a leaked run of this script -- makes the new instance's bind() fail while the client
// still connects happily to the OLD emulator. Every read then comes from a machine running some
// other disk, and nothing about it looks wrong. One leaked instance cost an afternoon of that.
const PORT = 6600 + (process.pid % 300);
// -virtualdev8 turns ON the kernal-trap fast loader ("general mechanisms for fast disk emulation")
// and +drive8truedrive turns OFF the cycle-exact 1541. That pair is what makes the 221-block disk
// load in seconds. Get either backwards and you get minutes per run, or ?LOAD ERROR with no drive
// mechanism at all -- which reads exactly like a broken build. Both are passed explicitly because
// VICE writes vicerc on exit and drops resources that are at their defaults, so the file cannot be
// relied on to still say what it said. +minimized because the user wants to see the window.
const LOG = `/tmp/probe-vice-${process.pid}.log`;
// --at turns WARP OFF. Under warp the client cannot connect until thousands of game ticks have
// already passed -- an early checkpoint is simply unreachable, and `waitFor` returns instantly on
// a condition that was true before it was asked. Real time makes a tick a tick. It costs about a
// second of wall clock per 60 ticks, which is the price of hitting a specific moment.
execSync(`${VICE} ${marks.length ? '' : '-warp '}-ntsc +drive8truedrive -virtualdev8 +minimized -jamaction 1 ` +
  `-binarymonitor -binarymonitoraddress ip4://127.0.0.1:${PORT} ` +
  `-autostart ${DISK} >${LOG} 2>&1 &`);
const stop = () => {
  for (const p of execSync('pgrep -f x64sc || true').toString().split('\n').filter(Boolean))
    if (!before.has(p)) { try { execSync(`kill ${p}`); } catch {} }
};
// Anything that goes wrong below is nearly always explained by a line VICE printed at startup
// (a failed bind, a missing image), so show them rather than leaving a bare protocol error.
const bail = msg => {
  console.error(msg);
  let log = ''; try { log = readFileSync(LOG, 'utf8'); } catch {}
  // JAM first and on its own line: "*** Main CPU: JAM at $xxxx" names the PC, and it is the one
  // log line that says the build is broken rather than the harness.
  const jam = log.match(/Main CPU: JAM at \$[0-9A-Fa-f]+/);
  if (jam) console.error(`*** ${jam[0]} -- the BUILD crashed; the harness is not the problem.`);
  const bad = log.split('\n').filter(l => /Error|failed|cannot|unable/i.test(l));
  if (bad.length) console.error('VICE said:\n  ' + bad.slice(0, 6).join('\n  '));
  stop(); process.exit(1);
};

// Connect only AFTER the wait, never during the load. A monitor client holds the CPU stopped
// between commands, and stopping it mid-transfer while true drive emulation is clocking bits down
// the serial bus is a good way to end up executing the stack page.
const sock = new net.Socket();
let tries = 0;
const dial = () => sock.connect(PORT, '127.0.0.1');
sock.on('error', e => {
  if (++tries > 40) bail(`monitor connect failed on port ${PORT}: ${e.message}`);
  setTimeout(dial, 250);
});
// Dial only after --wait, never during the load. Each monitor command stops the CPU until the
// resume lands, so polling through a 219-block true-drive load slows it to a crawl and the program
// never comes up -- which looks exactly like a build that will not start.
setTimeout(dial, wantWait);
let buf = Buffer.alloc(0); const pend = new Map(); let rid = 1;
sock.on('data', d => {
  buf = Buffer.concat([buf, d]);
  while (buf.length >= 12) {
    const blen = buf.readUInt32BE ? buf.readUInt32LE(2) : 0;
    if (buf.length < 12 + blen) return;
    const body = buf.subarray(12, 12 + blen), err = buf[7], id = buf.readUInt32LE(8);
    buf = buf.subarray(12 + blen);
    const cb = pend.get(id); if (cb) { pend.delete(id); cb(err, body); }
  }
});
const memGet = (start, count) => new Promise((res, rej) => {
  const id = rid++, b = Buffer.alloc(8);
  b[0] = 0; b.writeUInt16LE(start, 1); b.writeUInt16LE(start + count - 1, 3); b[5] = 0; b.writeUInt16LE(0, 6);
  const h = Buffer.alloc(11);
  h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(b.length, 2); h.writeUInt32LE(id, 6); h[10] = 0x01;
  pend.set(id, (err, body) => {
    if (err) return rej(new Error(`monitor error ${err} reading $${start.toString(16)}`));
    const got = body.subarray(2);
    if (got.length !== count)
      return rej(new Error(`SHORT REPLY at $${start.toString(16)}: asked ${count} bytes, got ${got.length}`));
    res([...got]);
  });
  sock.write(Buffer.concat([h, b]));
});

// A binary-monitor command STOPS the emulated CPU until an explicit resume (0xaa). Forgetting it
// makes the machine look frozen -- two reads of a counter that cannot advance -- which is
// indistinguishable from a program that never started.
// Where the CPU actually is when nothing is advancing. $E5xx is the KERNAL editor loop -- BASIC is
// idle and our code never got control; anything under $4000 is our code, and it is hung, not
// missing. That one number separates two completely different investigations.
const pcGet = () => new Promise((res, rej) => {
  const id = rid++, b = Buffer.alloc(1);
  const h = Buffer.alloc(11);
  h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(1, 2); h.writeUInt32LE(id, 6); h[10] = 0x31;
  pend.set(id, (err, body) => {
    if (err) return rej(new Error(`monitor error ${err} reading registers`));
    for (let i = 2; i + 3 < body.length; i += body[i] + 1)
      if (body[i + 1] === 3) return res(body.readUInt16LE(i + 2));
    rej(new Error('no PC in the register reply'));
  });
  sock.write(Buffer.concat([h, b]));
});

const resume = () => new Promise(res => {
  const h = Buffer.alloc(11);
  h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(0, 2); h.writeUInt32LE(rid++, 6); h[10] = 0xaa;
  sock.write(h); setTimeout(res, 30);
});

sock.on('connect', async () => {
  try {
    await resume();                       // in case the connection itself left it stopped
    // POLL for liveness rather than trusting one deadline. Warp speed is not a constant: with the
    // display asleep VICE slows by an order of magnitude, so a wait that was ample an hour ago
    // lands mid-load. Give up only after the deadline, and say what the screen shows when we do.
    const live = async () => { const m = await memGet(addr[LIVE], 2); return m[0] + 256 * m[1]; };
    let a = 0, b = 0, alive = false;
    for (const t = Date.now(); Date.now() - t < wantWait * 3 && !alive; ) {
      a = await live();
      await resume();
      await new Promise(r => setTimeout(r, 2000));
      b = await live();
      await resume();
      alive = a !== b;
    }
    // frameCnt is SIXTEEN bits (`inc frameCnt / bne / inc frameCnt+1` in the raster IRQ) and read
    // as such above. Pacing off the low byte alone loses a wrap whenever a sample spans more than
    // 256 ticks, which at warp is a fraction of a second -- and the overshoot then depends on how
    // fast warp happens to be, so it differs between the two builds being compared.
    const waitFor = async mark => {
      for (const t0 = Date.now(); Date.now() - t0 < 600000; ) {
        if (await live() >= mark) { await resume(); return true; }
        await resume();
        await new Promise(r => setTimeout(r, 50));
      }
      return false;
    };
    if (alive && marks.length && !(await waitFor(marks[0])))
      bail(`${LIVE} never reached tick ${marks[0]} -- the program is running but not getting there.`);
    if (!alive) {
      // Show the KERNAL screen: "READY." means autostart never loaded anything, a LOAD line means
      // it is still loading, garbage means the program is up and frameCnt is at the wrong address.
      let scr = '', pc = '';
      try {
        const p1 = await pcGet(); await resume();
        await new Promise(r => setTimeout(r, 300));
        const p2 = await pcGet(); await resume();
        pc = `\n  PC = $${p1.toString(16)} then $${p2.toString(16)}` +
          (p1 >> 8 === 0xe5 && p2 >> 8 === 0xe5 ? '  (KERNAL editor loop -- BASIC is idle,'
            + ' our code never got control)' : p1 === p2 ? '  (not moving at all)' : '  (executing)');
      } catch {}
      try {
        const s = await memGet(0x0400, 1000);
        const ch = c => { c &= 127; return c === 32 ? ' ' : c >= 1 && c <= 26 ? String.fromCharCode(64 + c)
          : c >= 48 && c <= 57 ? String.fromCharCode(c) : '.'; };
        scr = '\n' + Array.from({ length: 25 }, (_, r) =>
          '  |' + s.slice(r * 40, r * 40 + 40).map(ch).join('') + '|')
          .filter(l => l.replace(/[ |.]/g, '')).join('\n');
      } catch {}
      bail(`NOT RUNNING: ${LIVE} ($${addr[LIVE].toString(16)}) held at ${a} for ${wantWait * 3 / 1000}s.` +
        ` The program has not started -- everything else would be image data.${pc}${scr}`);
    }
    const readAll = async () => {
      const v = {};
      for (const spec of specs) {
        const [n, cnt] = spec.split(':');
        v[n] = await memGet(addr[n], +(cnt || 1));
      }
      v[LIVE] = await memGet(addr[LIVE], 2);
      await resume();
      return v;
    };
    const val = await readAll();
    let val2 = null;
    if (marks.length > 1) {
      if (!(await waitFor(marks[1])))
        bail(`${LIVE} never reached tick ${marks[1]} for the second checkpoint.`);
      val2 = await readAll();
    }
    // assertions BEFORE interpretation: an impossible value must stop the run, not be read
    for (const e of expects) {
      const m = e.match(/^(\w+)\s*(<=|>=|==|<|>)\s*(\d+)$/);
      if (!m) { console.error(`bad --expect: ${e}`); process.exit(2); }
      const [, n, op, lim] = m, v = val[n][0] + (val[n].length > 1 ? 256 * val[n][1] : 0);
      const ok = { '<=': v <= +lim, '>=': v >= +lim, '==': v === +lim, '<': v < +lim, '>': v > +lim }[op];
      if (!ok) { console.error(`FAILED: ${n} = ${v}, expected ${n} ${op} ${lim}`); stop(); process.exit(1); }
    }
    const num = b => b.length >= 2 ? b[0] + 256 * b[1] : b[0];
    for (const spec of [...specs, ...(val2 ? [LIVE] : [])]) {
      const n = spec.split(':')[0], b = val[n];
      const w = b.length >= 2 ? `  (16-bit: ${num(b)})` : '';
      const d = val2 ? `   ->  ${val2[n].join(' ')}` +
        (b.length >= 2 ? `  (delta ${num(val2[n]) - num(b)})` : '') : '';
      console.log(`${n.padEnd(10)} $${addr[n].toString(16)}  ${b.join(' ')}${w}${d}`);
    }
  } catch (e) { console.error(String(e.message || e)); stop(); process.exit(1); }
  stop(); process.exit(0);
});
