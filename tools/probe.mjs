// probe.mjs -- read named variables out of a RUNNING build, self-verifying.
//
//   node tools/probe.mjs "CHAIN=5 CARRY=3" orbXCT:4 orbYCT:4 --until "dieSt>=3"
//   node tools/probe.mjs "CHAIN=1 WALK=1 MOVEAT=60 MOVEFOR=85 MOVELEGS=4" maS:20 --until "maGo>=2"
//
// Every wrong number this tool exists to prevent had the same shape: an address or a field
// offset that was right for a DIFFERENT build or a different layout. Stale labels twice, a
// histogram written over the profiler's own state, a rolling accumulator read mid-window, a
// wrong denominator. Each printed a plausible value and none of them announced itself.
//
// So the rules here are structural, not advisory:
//   * ONE build. The same invocation that writes lest-c64.d64 emits the labels, so an address
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
import { portHeld, launch, LAUNCH_FLAGS } from './vice.mjs';
// It builds and reads the build's files (lest-c64.d64, build/iray.syms.json, src/build-iray.mjs) by name, so it
// runs from the project root wherever it is started from. It takes no file paths of its own.
process.chdir(new URL('..', import.meta.url).pathname);

const VICE = '/Applications/vice-arm64-gtk3-3.8/bin/x64sc';
const DISK = './lest-c64.d64';
const args = process.argv.slice(2);
if (!args.length) { console.error('usage: node tools/probe.mjs "ENV=1 ..." name[:bytes] ...'); process.exit(2); }

const envStr = args.shift();
// How long to sit still before dialling the monitor. It exists because POLLING THROUGH THE LOAD
// slows the load to a crawl (see dial below), not because the load needs this long: with true
// drive emulation off the whole 57K lands in a couple of seconds at warp. It was 45000, which
// cost every single probe run 45 seconds of nothing -- ~4x the rest of the run put together.
// 8000 measured safe with room to spare; the liveness loop below is the real safety net and it
// now has its own deadline rather than a multiple of this one, so lowering this cannot shorten
// the recovery window. --wait N overrides it if a slower machine ever needs it.
const waitGiven = args.includes('--wait');
// How long to let the program RUN before a bare read -- not how long to wait for it to start.
// 4s of warp is a few hundred to a few thousand frames, which is what a free-running counter needs
// to mean anything. --wait N overrides it and also restores the old sleep-then-connect behaviour.
const RUNFOR = 4000;
const wantWait = +((args.find(a => a === '--wait') ? args[args.indexOf('--wait') + 1] : 0)) || 8000;
const LIVE_DEADLINE = +(process.env.PROBE_DEADLINE ?? 90000);    // how long to keep polling for signs of life, independent of the above
// --at A[,B]: read when frameCnt first reaches tick A, and again at B. ABSOLUTE ticks since the
// program started, not "N from now" -- at warp the client cannot connect before a good deal of game
// time has already passed, and how much varies, so "N from now" lands somewhere different in every
// run. Two checkpoints give a WINDOW: the delta between them is what a rate has to be computed
// over. Without --at, everything is read once, whenever the program is first seen running.
const atArg = args.find(a => a === '--at') ? args[args.indexOf('--at') + 1] : '';
const marks = atArg.split(',').map(Number).filter(n => n > 0);
// --until "name>=N": poll a NAMED variable and read once it satisfies the test, instead of
// waiting on a frameCnt tick. --at exists to hit a specific MOMENT and has to turn warp off to
// do it; waiting for something to FINISH has no such problem, so --until keeps warp on and a
// sixty-second scripted tour costs a few seconds of wall clock. It is also the honest condition:
// "the tour has ended" is a fact about the program, where "tick 3606 has passed" is a guess about
// it that goes wrong the moment the route or the load time changes.
// --trap lo,hi: an EXECUTE checkpoint on that address range. The emulator stops the moment the PC
// lands in it; we then print PC, the stack, and the bytes asked for. For a program that ends up in
// BASIC with the KERNAL vectors back, the question is "who jumped there first", and a checkpoint on
// $e000-$ffff (ROM space, where our code never runs with the port at $35) answers it in one run.
const trapArg = args.find(a => a === '--trap') ? args[args.indexOf('--trap') + 1] : '';
// --watchall lo,hi: a STORE checkpoint armed from POWER-ON, logging EVERY hit (PC, registers, the
// top of the stack) and resuming, instead of stopping at the first. --watch arms only once the main
// loop is reached, which misses anything in the first frame or two -- and a log of every writer,
// boot's legitimate ones included, is an audit rather than a guess. Up to 40 hits or 45 seconds.
// --snapshot file.vsf: start from a VICE SNAPSHOT instead of booting -- the user's exact machine,
// a step before the bug. Loaded with the binary monitor's UNDUMP. VICE is launched WITHOUT
// -autostart then (the disk attached only): autostart types RUN when it sees READY, and those
// keystrokes would land in the game. The build this probe makes must be the one the snapshot was
// taken on, or every label is wrong -- the plain env builds lest-c64.d64, which is what the user plays.
const require_path = p => p.startsWith('/') ? p : process.cwd() + '/' + p;
const snapArg = args.find(a => a === '--snapshot') ? args[args.indexOf('--snapshot') + 1] : '';
const watchAllArg = args.find(a => a === '--watchall') ? args[args.indexOf('--watchall') + 1] : '';
const watchAll = watchAllArg ? watchAllArg.split(',').map(h => parseInt(h, 16)) : null;
const trap = trapArg ? trapArg.split(',').map(h => parseInt(h, 16)) : null;
// --watch lo,hi: a STORE checkpoint on that address range, armed once --until has come true (or
// at once without --until), so a write that happens legitimately a thousand times before the
// moment in question does not stop the machine first. Prints PC and the stack at the store --
// the answer to "who wrote this byte", which no amount of reading it back can give.
const watchArg = args.find(a => a === '--watch') ? args[args.indexOf('--watch') + 1] : '';
const watch = watchArg ? watchArg.split(',').map(h => parseInt(h, 16)) : null;
const untilArg = args.find(a => a === '--until') ? args[args.indexOf('--until') + 1] : '';
const until = untilArg ? (() => {
  const m = untilArg.match(/^(\w+)\s*(<=|>=|==|<|>)\s*(\d+)$/);
  if (!m) { console.error(`bad --until: ${untilArg} (want "name>=N")`); process.exit(2); }
  return { name: m[1], op: m[2], lim: +m[3] };
})() : null;
// --abort "name>=N": a condition that means the run is RUINED, polled alongside --until. Without
// it, a profile whose window never closes waits out the 600s deadline and reports "build or run
// failed" -- which is how "the angels killed the player, so the 256-frame window never finished"
// looked for two attempts. A wait needs a reason to give up as much as a reason to stop.
const abortArg = args.find(a => a === '--abort') ? args[args.indexOf('--abort') + 1] : '';
const abortC = abortArg ? (() => {
  const m = abortArg.match(/^(\w+)\s*(<=|>=|==|<|>)\s*(\d+)$/);
  if (!m) { console.error(`bad --abort: ${abortArg} (want "name>=N")`); process.exit(2); }
  return { name: m[1], op: m[2], lim: +m[3] };
})() : null;
const expects = [];
const specs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--wait' || args[i] === '--at' || args[i] === '--until' || args[i] === '--trap' || args[i] === '--watch' || args[i] === '--watchall' || args[i] === '--snapshot' || args[i] === '--abort') { i++; continue; }
  if (args[i] === '--expect') { expects.push(args[++i]); continue; }
  specs.push(args[i]);
}
// The polled name has to be one of the labels resolved below, or its address is never looked up.
if (until && !specs.some(s => s.split(':')[0] === until.name)) specs.push(until.name);
if (abortC && !specs.some(s => s.split(':')[0] === abortC.name)) specs.push(abortC.name);
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
// Captured before anything is added to `env`: the environment a plain `node src/build-iray.mjs`
// would see, which is what `stop` rebuilds the shipping disk with.
const SHIPENV = { ...process.env };
const LIVE = 'frameCnt';
env.LABELS = [...names.filter(n => !n.startsWith('@')), LIVE].join(',');   // the hook prints every label whose name contains one
let out = '';
try {
  out = execSync(`node src/build-iray.mjs`, { env, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
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
// A bare hex address -- "@e000:1000" -- reads RAM that has no label: the screen buffers, a
// table's interior, the I/O area's underlying RAM. Nothing to resolve, so nothing can be stale.
for (const n of [...names, LIVE]) {
  if (n.startsWith('@')) { addr[n] = parseInt(n.slice(1), 16); continue; }
  const m = build.match(new RegExp(`^\\s*label ${n} = \\$([0-9a-f]+)\\s*$`, 'm'));
  if (!m) { console.error(`LABEL NOT FOUND: ${n} -- it does not exist in this configuration.`); process.exit(1); }
  addr[n] = parseInt(m[1], 16);
}
// Every label's FINAL address, written by compact.mjs after the assembly that ships. Used to set
// an execution checkpoint by name; absent (an older build) it simply falls back to the old wait.
let SYMS = {};
try { SYMS = JSON.parse(readFileSync('./build/iray.syms.json', 'utf8')); } catch { /* optional */ }
if (!existsSync(DISK)) { console.error('no lest-c64.d64'); process.exit(1); }

// ---- run it, never touching an emulator that was already open ----
// A held monitor port makes VICE print "bind() failed: Address already in use" into its own log
// and start anyway WITHOUT a monitor; this script then attaches to nothing and grinds out the
// 90-second liveness deadline, which reads exactly like a jammed program. So a held port is fatal
// (checked below, on the port this run actually uses).
// A PRIVATE monitor port, not the default 6502. Another x64sc holding 6502 -- the user's own
// window, or a leaked run of this script -- makes the new instance's bind() fail while the client
// still connects happily to the OLD emulator. Every read then comes from a machine running some
// other disk, and nothing about it looks wrong. One leaked instance cost an afternoon of that.
const PORT = 6600 + (process.pid % 300);
// REFUSE TO START IF THAT PORT IS TAKEN -- it used to check 6502, which is not the port it then used.
// A held port means VICE would start without a monitor and this would wait out the liveness deadline
// for a machine it can never see. Wait a beat first: a run that just finished may still be letting go.
{
  let held = portHeld(PORT);
  for (let i = 0; held && i < 10; i++) { execSync('sleep 0.5'); held = portHeld(PORT); }
  if (held) { console.error(`port ${PORT} is already bound (pid ${held}) -- kill that process first:  kill ${held}`); process.exit(2); }
}
// THE PAIR IS THE OPPOSITE OF WHAT IT WAS, AND IT HAD TO INVERT (2026-09-25). It used to be
// -virtualdev8 +drive8truedrive: the kernal-trap fast loader ON and the cycle-exact 1541 OFF,
// which is what made the disk load in seconds. Krill's loader ended that. It talks to a REAL
// drive, so with no drive to talk to it loads IRUN and IQOT through the KERNAL fallback -- the
// quote comes up, looking like a healthy boot -- and then stalls for ever on the game itself.
// Every probe run died at "NOT RUNNING: frameCnt held at 0", which reads exactly like a build
// that crashes on entry. So: the true 1541 ON and the trap loader OFF, and -autostart-handle-tde
// so autostart uses that drive rather than side-loading the first file past it. Both drive
// resources are still passed explicitly because VICE writes vicerc on exit and drops resources
// that are at their defaults, so the file cannot be relied on to still say what it said.
// +minimized because the user wants to see the window.
// The cost is real time: a true 1541 puts the boot at ~25 emulated seconds, against ~2 before.
const LOG = `/tmp/probe-vice-${process.pid}.log`;
// --trap AND --watch KEEP WARP. A checkpoint is event-driven: it fires when the PC enters the
// range or a store lands in it, however fast the machine is running, so warp costs nothing but
// the risk that the event happens before the client connects -- which matters only for something
// in the first moments of the run. These used to turn warp off along with --at, which made a
// trap on anything minutes into a session unusable, and that is a limit of this script and not
// of VICE. Pair a trap with --until if the interesting event is early.
// --at turns WARP OFF, but not until the program is RUNNING. Under warp a 50ms poll overshoots an
// exact tick by hundreds, so the window itself needs real time -- about a second of wall clock per
// 60 ticks. What it does NOT need is for the disk load to happen in real time too, which is what
// launching without warp used to cost: ~25 of the 46 seconds a segment took. The mloop checkpoint
// stops the machine at frame 1, so warp covers the load and real time starts at the window.
// -config: a PRIVATE, empty settings file. Without it VICE reads the user's vicerc, and if that
// enables the binary monitor the socket is already bound by whatever they have open -- every run
// then dies on "bind() failed: Address already in use" no matter which port this picks, because
// the address in the config wins. It also keeps every other resource this run needs off whatever
// they last left set, which is the same trap the drive flags are in.
const CFG = `/tmp/probe-vice-${process.pid}.vrc`;
// launch() (tools/vice.mjs) puts the emulator in its own process group and kills exactly that group
// on stop, Ctrl-C, a crash or an uncaught error. This used to kill every x64sc that appeared during
// the run -- a concurrent run's, or a window the user opened meanwhile -- and leaked on Ctrl-C.
const vice = launch([...LAUNCH_FLAGS, '-warp', '-jamaction', '1',
  '-binarymonitor', '-binarymonitoraddress', `ip4://127.0.0.1:${PORT}`,
  ...(snapArg ? ['-8', DISK] : ['-autostart', DISK])], { config: CFG, log: LOG });
const stop = () => {
  vice.kill();                      // this run's process group, and nothing else
  // PUT THE SHIPPING DISK BACK. The build above runs with THIS probe's env, so lest-c64.d64 is
  // left holding whatever diagnostic was being measured -- and lest-c64.d64 is the one disk, the
  // thing a person loads to play. A FALLNOW build handed over this way drops the player through
  // the floor every 256 frames, which reads as the game being broken rather than the disk being
  // the wrong one. Three times before this was added. NOPROBEREBUILD=1 skips it for a run where
  // the diagnostic disk is the point.
  if (!process.env.NOPROBEREBUILD)
    try { execSync('node src/build-iray.mjs', { env: SHIPENV, stdio: 'ignore' }); } catch {}
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
// ---- DIAL EARLY AND ARM A CHECKPOINT, rather than sleeping and hoping ----
// The 8-second wait was HALF the wall clock of a probe run (16.2s total: 3.9 build, 8.0 asleep,
// ~4 working) and it was a guess in both directions -- too long on this machine, too short on a
// slower one, which is why it used to be 45. What it protects against is POLLING through the load:
// every monitor command stops the CPU, and stopping mid-transfer while true drive emulation clocks
// bits down the serial bus can leave the machine executing the stack page.
// A checkpoint does not poll. One command arms it, then the hit arrives on the socket BY ITSELF --
// zero monitor traffic while the load runs -- and "mloop was reached" is the honest condition that
// a sleep was standing in for. --wait N still forces the old behaviour if a machine ever needs it.
setTimeout(dial, (trap || !waitGiven) ? 1500 : wantWait);
let buf = Buffer.alloc(0); const pend = new Map(); let rid = 1, cpHit = false;
sock.on('data', d => {
  buf = Buffer.concat([buf, d]);
  while (buf.length >= 12) {
    const blen = buf.readUInt32BE ? buf.readUInt32LE(2) : 0;
    if (buf.length < 12 + blen) return;
    const body = buf.subarray(12, 12 + blen), err = buf[7], id = buf.readUInt32LE(8), type = buf[6];
    buf = buf.subarray(12 + blen);
    // A checkpoint HIT arrives unsolicited: type $11 with the hit flag set, request id $ffffffff.
    // Polling PC cannot see it -- every monitor command pauses the machine, so PC always "holds".
    if (id === 0xffffffff && type === 0x11 && body.length > 4 && body[4]) cpHit = true;
    const cb = pend.get(id); if (cb) { pend.delete(id); cb(err, body); }
  }
});
// BANK matters, and defaulting it is a trap this tool exists to prevent. Bank 0 is "default":
// whatever the CPU currently sees. At the engine's port ($35) that makes every read of
// $d000-$dfff come back as I/O -- $de40 is the expansion-port area, so a 280-byte read of the
// arc's glyph dictionary returned 280 copies of $1d (open bus) and looked exactly like a
// dictionary wiped clean. The RAM the VIC reads there is only reachable through the "ram" bank.
// MON_CMD_BANKS_AVAILABLE ($82): name -> id, straight from the emulator. Hardcoding "ram = 2"
// would be one more number that is right until it is not.
const banksAvail = () => new Promise((res, rej) => {
  const id = rid++, h = Buffer.alloc(11);
  h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(0, 2); h.writeUInt32LE(id, 6); h[10] = 0x82;
  pend.set(id, (err, body) => {
    if (err) return rej(new Error(`monitor error ${err} listing banks`));
    const out = {}; let o = 2;
    for (let n = body.readUInt16LE(0); n > 0 && o < body.length; n--) {
      const item = body[o], bid = body.readUInt16LE(o + 1), len = body[o + 3];
      out[body.toString('ascii', o + 4, o + 4 + len)] = bid; o += item + 1;
    }
    res(out);
  });
  sock.write(h);
});
// A spec is name[:count[:bank]]. The bank part only means anything for RAM the CPU cannot see
// at the engine's port -- in practice anything under the I/O hole, which in bank 3 is charsets
// and the arc dictionaries. `banks` is filled from the emulator once the socket is up.
let banks = null;
const bankOf = spec => {
  const nm = spec.split(':')[2];
  if (!nm) return 0;
  if (!banks || banks[nm] === undefined) {
    console.error(`UNKNOWN BANK "${nm}" -- this VICE offers: ${Object.keys(banks ?? {}).join(', ')}`);
    process.exit(2);
  }
  return banks[nm];
};
const readSpec = async spec => {
  const [n, cnt] = spec.split(':');
  return memGet(addr[n], +(cnt || 1), bankOf(spec));
};
const memGet = (start, count, bank = 0) => new Promise((res, rej) => {
  const id = rid++, b = Buffer.alloc(8);
  b[0] = 0; b.writeUInt16LE(start, 1); b.writeUInt16LE(start + count - 1, 3); b[5] = 0; b.writeUInt16LE(bank, 6);
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

const cpSet = (lo, hi, op = 4) => new Promise((res, rej) => {   // op: 1 load, 2 store, 4 exec
  const id = rid++, b = Buffer.alloc(8);
  b.writeUInt16LE(lo, 0); b.writeUInt16LE(hi, 2); b[4] = 1; b[5] = 1; b[6] = op; b[7] = 0;
  const h = Buffer.alloc(11);
  h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(b.length, 2); h.writeUInt32LE(id, 6); h[10] = 0x12;
  pend.set(id, (err, body) => err ? rej(new Error(`checkpoint set failed: ${err}`)) : res(body.readUInt32LE(0)));
  sock.write(Buffer.concat([h, b]));
});
// MON_CMD_RESOURCE_SET. Lets warp be turned OFF once the program is up, which is what makes --at
// affordable: the LOAD no longer has to happen in real time.
const resSet = (name, val) => new Promise(res => {
  const id = rid++, nb = Buffer.from(name, 'ascii'), vb = Buffer.from([val & 255]);
  const b = Buffer.concat([Buffer.from([0x01, nb.length]), nb, Buffer.from([vb.length]), vb]);
  const h = Buffer.alloc(11);
  h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(b.length, 2); h.writeUInt32LE(id, 6); h[10] = 0x32;
  pend.set(id, () => res());
  sock.write(Buffer.concat([h, b]));
});
const cpDel = n => new Promise(res => {                          // MON_CMD_CHECKPOINT_DELETE
  const id = rid++, b = Buffer.alloc(4); b.writeUInt32LE(n, 0);
  const h = Buffer.alloc(11);
  h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(4, 2); h.writeUInt32LE(id, 6); h[10] = 0x13;
  pend.set(id, () => res());
  sock.write(Buffer.concat([h, b]));
});
// A checkpoint hit arrives as an UNSOLICITED response (request id $ffffffff, type 0x11 with
// hit=1, or a STOPPED event 0x62). We watch for it by polling PC: while the CPU runs, PC moves;
// once the checkpoint stops it, PC holds inside the trap range. The monitor's own stop is the
// point -- we never resume past it.
const resume = () => new Promise(res => {
  const h = Buffer.alloc(11);
  h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(0, 2); h.writeUInt32LE(rid++, 6); h[10] = 0xaa;
  sock.write(h); setTimeout(res, 30);
});

sock.on('connect', async () => {
  try {
    await resume();                       // in case the connection itself left it stopped
    banks = await banksAvail();           // name -> id, before any spec is read
    if (snapArg) {
      // MON_CMD_UNDUMP ($42): a length-prefixed filename. The machine is stopped afterwards.
      await new Promise((res, rej) => {
        const id = rid++, nb = Buffer.from(require_path(snapArg), 'ascii');
        const b = Buffer.concat([Buffer.from([nb.length]), nb]), h = Buffer.alloc(11);
        h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(b.length, 2); h.writeUInt32LE(id, 6); h[10] = 0x42;
        pend.set(id, err => err ? rej(new Error(`snapshot load failed (monitor error ${err}): ${snapArg}`)) : res());
        sock.write(Buffer.concat([h, b]));
      });
      console.error(`  (started from snapshot ${snapArg}, PC $${(await pcGet()).toString(16)})`);
      if (!watchAll) {           // a straight read of the snapshot's state, nothing run
        for (const spec of specs) { const n = spec.split(':')[0]; const v = await readSpec(spec); console.log(`${n.padEnd(10)} $${addr[n].toString(16)}  ${v.join(' ')}`); }
        stop(); process.exit(0);
      }
    }
    if (watchAll) {
      await cpSet(watchAll[0], watchAll[1], 2); cpHit = false; await resume();
      const regsGet = () => new Promise(res => {
        const id = rid++, h = Buffer.alloc(11); h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(1, 2); h.writeUInt32LE(id, 6); h[10] = 0x31;
        pend.set(id, (err, body) => { const r = {}; for (let i = 2; i + 3 < body.length; i += body[i] + 1) r[body[i + 1]] = body.readUInt16LE(i + 2); res(r); });
        sock.write(Buffer.concat([h, Buffer.alloc(1)]));
      });
      // Hits are SUMMARISED by writer: the first time each PC stores here it is printed in full,
      // after that only counted. A boot that parks a 251-byte block would otherwise use the whole
      // budget on the one store everybody already knows about.
      let n = 0; const seen = new Map();
      for (const t0 = Date.now(); Date.now() - t0 < 45000 && n < 3000; ) {
        await new Promise(r => setTimeout(r, 20));
        if (!cpHit) continue;
        cpHit = false; n++;
        const r = await regsGet(), sp = r[4] & 255;
        const st = sp >= 0xff ? [] : await memGet(0x100 + sp + 1, Math.min(8, 255 - sp));
        const lab = (() => { let b = null; for (const [k, v] of Object.entries(SYMS)) if (v <= r[3] && (!b || v > b[1])) b = [k, v]; return b ? `${b[0]}+${r[3] - b[1]}` : '?'; })();
        const line = `PC $${r[3].toString(16)} (${lab})  A $${(r[0] & 255).toString(16)} X $${(r[1] & 255).toString(16)} Y $${(r[2] & 255).toString(16)} SP $${sp.toString(16)}  stack ${st.join(' ')}`;
        if (!seen.has(r[3])) { seen.set(r[3], 0); console.log(`HIT ${n} (first from this PC): ${line}`); }
        seen.set(r[3], seen.get(r[3]) + 1);
        await resume();
      }
      console.log(`watchall: ${n} hits from ${seen.size} writer(s): ` + [...seen].map(([pc, c]) => `$${pc.toString(16)} x${c}`).join(', '));
      stop(); process.exit(0);
    }
    if (trap) {                           // arm NOW, while the disk is still loading, then let it run
      await cpSet(trap[0], trap[1]); await resume();
      // The KERNAL's own loader runs in ROM space, so wait for OUR code to take over before
      // treating a hit as the fault: poll until frameCnt has moved (the program is up), THEN watch.
      let a0 = (await memGet(addr[LIVE], 2)).reduce((x, y, i) => x + y * (i ? 256 : 1), 0); await resume();
      for (const t0 = Date.now(); Date.now() - t0 < 300000; ) {
        await new Promise(r => setTimeout(r, 200));
        const pc = await pcGet();
        const a1 = (await memGet(addr[LIVE], 2)).reduce((x, y, i) => x + y * (i ? 256 : 1), 0);
        if (pc >= trap[0] && pc <= trap[1] && a1 !== a0 && a1 > 2) {
          // stopped in the range, and the program had started (frameCnt moved): this is the hit
          const sp = await (() => new Promise((res, rej) => {
            const id = rid++, h = Buffer.alloc(11); h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(1, 2); h.writeUInt32LE(id, 6); h[10] = 0x31;
            pend.set(id, (err, body) => { for (let i = 2; i + 3 < body.length; i += body[i] + 1) if (body[i + 1] === 4) return res(body.readUInt16LE(i + 2) & 255); rej(new Error('no SP')); });
            sock.write(Buffer.concat([h, Buffer.alloc(1)]));
          }))();
          // SP = $ff is an EMPTY stack (a store from top level, e.g. boot code): a zero-length read is a
        // monitor error, and it used to throw away the PC we stopped for.
        const stack = sp >= 0xff ? [] : await memGet(0x100 + sp + 1, Math.min(32, 255 - sp));
          console.log(`TRAP: PC = $${pc.toString(16)}  SP = $${sp.toString(16)}  frameCnt ${a1}`);
          const words = []; for (let i = 0; i + 1 < stack.length; i++) words.push(`$${(stack[i] + 256 * stack[i + 1]).toString(16)}`);
          console.log(`  stack: ${stack.join(' ')}`);
          console.log(`  as words: ${words.join(' ')}`);
          for (const spec of specs) { const n = spec.split(':')[0]; const v = await readSpec(spec); console.log(`${n.padEnd(10)} $${addr[n].toString(16)}  ${v.join(' ')}`); }
          stop(); process.exit(0);
        }
        if (pc >= trap[0] && pc <= trap[1]) await resume();   // the KERNAL loading: let it go on
        a0 = a1;
      }
      bail('--trap: the program ran for 5 minutes without entering the range');
    }
    // POLL for liveness rather than trusting one deadline. Warp speed is not a constant: with the
    // display asleep VICE slows by an order of magnitude, so a wait that was ample an hour ago
    // lands mid-load. Give up only after the deadline, and say what the screen shows when we do.
    const live = async () => { const m = await memGet(addr[LIVE], 2); return m[0] + 256 * m[1]; };
    let a = 0, b = 0, alive = false;
    // The main loop was REACHED -- which is what the sleep above was a proxy for, and strictly
    // better: it proves the load finished AND that the renderer is running, in one event, as fast
    // as the machine can get there. iray.syms.json is written by compact.mjs, so the address is
    // the one that ships rather than build-iray's pre-relayout guess.
    if (!waitGiven && SYMS.mloop) {
      const cp = await cpSet(SYMS.mloop, SYMS.mloop);
      await resume();
      for (const t0 = Date.now(); Date.now() - t0 < LIVE_DEADLINE && !cpHit; )
        await new Promise(r => setTimeout(r, 25));
      if (cpHit) {
        alive = true; cpHit = false; await cpDel(cp);
        // ---- WARP OFF ONLY NOW, AND ONLY FOR --at ----
        // --at reads at an exact tick, and at warp a 50ms poll overshoots by hundreds of them, so
        // it needs real time. It used to get that by launching WITHOUT warp -- which also made the
        // 219-block true-drive load happen in real time, ~25 seconds of the 46 a segment took.
        // The checkpoint stops the machine at frame 1, so the load can run at warp and real time
        // can start where it is actually needed. --until and bare reads keep warp throughout.
        if (marks.length) await resSet('WarpMode', 0);
        await resume();
        // ---- THE WAIT WAS DOING TWO JOBS. Separate them. ----
        // It let the LOAD finish (the checkpoint does that exactly, and faster) and it let the
        // program RUN long enough to have produced something (which the checkpoint does not do at
        // all -- it fires on frame 1). A read with no --at, --until or --watch has no stopping
        // condition of its own, so it still needs a run period, and free-running counters like
        // CULLCNT's are meaningless without one: without this a bare read came back at iterLo 5.
        // --at and --until express their own window, so they get none of this and keep the saving.
        if (!marks.length && !until && !watch) await new Promise(r => setTimeout(r, RUNFOR));
      } else console.error('  (the mloop checkpoint never fired -- falling back to the liveness poll)');
    }
    for (const t = Date.now(); Date.now() - t < LIVE_DEADLINE && !alive; ) {
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
    // --until: poll the named byte. The deadline is generous because the thing being waited for
    // is usually a whole scripted run, and a build that got SLOWER is exactly what one is often
    // measuring -- a timeout tuned to the fast build would report the slow one as broken.
    if (alive && until) {
      const test = v => ({ '<=': v <= until.lim, '>=': v >= until.lim, '==': v === until.lim,
                           '<': v < until.lim, '>': v > until.lim })[until.op];
      let last = null, ok = false;
      for (const t0 = Date.now(); Date.now() - t0 < 600000 && !ok; ) {
        last = (await memGet(addr[until.name], 1))[0];
        await resume();
        if (test(last)) { ok = true; break; }
        if (abortC) {                         // the run is ruined; say so now, not in ten minutes
          const av = (await memGet(addr[abortC.name], 1))[0]; await resume();
          const bad = ({ '<=': av <= abortC.lim, '>=': av >= abortC.lim, '==': av === abortC.lim,
                         '<': av < abortC.lim, '>': av > abortC.lim })[abortC.op];
          if (bad) bail(`--abort ${abortArg} came true (${abortC.name} = ${av}): the run is not ` +
            `measuring what was asked. --until ${untilArg} had ${until.name} at ${last}.`);
        }
        await new Promise(r => setTimeout(r, 100));
      }
      if (!ok) bail(`--until ${untilArg} never came true; ${until.name} was last ${last}. ` +
                    `The program is running, so either the condition cannot happen or it needs longer.`);
    }
    if (alive && watch) {
      cpHit = false;
      await cpSet(watch[0], watch[1], 2); await resume();
      for (const t0 = Date.now(); Date.now() - t0 < 120000; ) {
        await new Promise(r => setTimeout(r, 150));
        if (!cpHit) continue;                 // still running (the hit arrives on the socket by itself)
        const p1 = await pcGet();
        const regs = await (() => new Promise((res, rej) => {
          const id = rid++, h = Buffer.alloc(11); h[0] = 0x02; h[1] = 0x02; h.writeUInt32LE(1, 2); h.writeUInt32LE(id, 6); h[10] = 0x31;
          pend.set(id, (err, body) => { const r = {}; for (let i = 2; i + 3 < body.length; i += body[i] + 1) r[body[i + 1]] = body.readUInt16LE(i + 2); res(r); });
          sock.write(Buffer.concat([h, Buffer.alloc(1)]));
        }))();
        const sp = regs[4] & 255;
        // SP = $ff is an EMPTY stack (a store from top level, e.g. boot code): a zero-length read is a
        // monitor error, and it used to throw away the PC we stopped for.
        const stack = sp >= 0xff ? [] : await memGet(0x100 + sp + 1, Math.min(32, 255 - sp));
        console.log(`WATCH: a store into $${watch[0].toString(16)}-$${watch[1].toString(16)} stopped at PC = $${p1.toString(16)}  SP = $${sp.toString(16)}` +
          `  A = $${(regs[0] & 255).toString(16)}  X = $${(regs[1] & 255).toString(16)}  Y = $${(regs[2] & 255).toString(16)}`);
        const words = []; for (let i = 0; i + 1 < stack.length; i++) words.push(`$${(stack[i] + 256 * stack[i + 1]).toString(16)}`);
        console.log(`  stack: ${stack.join(' ')}`);
        console.log(`  as words: ${words.join(' ')}`);
        for (const spec of specs) { const n = spec.split(':')[0]; const v = await readSpec(spec); console.log(`${n.padEnd(10)} $${addr[n].toString(16)}  ${v.join(' ')}`); }
        stop(); process.exit(0);
      }
      bail('--watch: nothing stored there within two minutes');
    }
    if (!alive && process.env.PROBE_DEAD === '1') {
      // PROBE_DEAD=1: read the requested bytes ANYWAY. For a hang, the stack and vectors at the
      // moment the IRQ stopped are exactly the evidence, and the liveness bail was throwing it away.
      const v = {};
      for (const spec of specs) { const n = spec.split(':')[0]; v[n] = await readSpec(spec); await resume(); }
      for (const spec of specs) { const n = spec.split(':')[0]; console.log(`${n.padEnd(10)} $${addr[n].toString(16)}  ${v[n].join(' ')}`); }
      stop(); process.exit(3);
    }
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
      // DEADOK=1: read anyway. A jammed machine still has its RAM, and when the question is "how
      // far did it get" the answer is IN that RAM -- did the level land, did objInit derive its
      // tables, did anything render. Refusing to read is right by default (the values would be
      // image data, not runtime state, and that has misled before) but useless while debugging a
      // build that dies before the first frame.
      if (!process.env.DEADOK)
        bail(`NOT RUNNING: ${LIVE} ($${addr[LIVE].toString(16)}) held at ${a} for ${LIVE_DEADLINE / 1000}s.` +
          ` The program has not started -- everything else would be image data.${pc}${scr}` +
          `\n  (DEADOK=1 reads it anyway.)`);
      console.error(`DEADOK: ${LIVE} never moved${pc} -- reading the corpse.${scr}`);
    }
    const readAll = async () => {
      const v = {};
      for (const spec of specs) {
        v[spec.split(':')[0]] = await readSpec(spec);
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
