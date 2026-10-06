// frames.mjs -- the DISPLAYED screen after every rendered frame of a fixed workload, and how much
// of it OSCILLATES.
//
//   node tools/frames.mjs "CHAIN=1 WALKF=1 BENCHF=300 ANGFREEZE=1 NOHUD=1" --out dir [--cmp otherdir]
//
// Why: a change that moves a seam or an edge by one column is fine as a STEP and bad as a
// SHIMMER -- a cell that goes A, B, A on three consecutive frames while the player moves steadily
// one way. Stills cannot tell the two apart; a frame-by-frame record can. With a fixed workload
// (SPINF/WALKF + BENCHF) frame k is the same view in every build, so two builds' counts compare.
//
// How: a breakpoint at `mnext`, the instruction after the buffer flip. There the buffer just drawn
// is the one on display, and baseHi already names the OTHER one (the next to be drawn). Each stop
// saves the displayed buffer's 1000 visible bytes; the run ends at benchEnd (BENCHF).
// Output: dir/frames.bin (n x 1000 bytes) and a report of A-B-A flips per frame and per cell.
// --cmp: also report flips present in this run and not in the other (same frames, cell by cell).
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os'; import { join } from 'path';
import { ROOT, buildDisk, portHeld, launch, LAUNCH_FLAGS, textMonitor } from './vice.mjs';

const args = process.argv.slice(2), ENV = args[0] ?? '';
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const OUT = opt('--out', ''), CMP = opt('--cmp', '');
if (!OUT) { console.error('--out dir is required'); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const PORT = 6510;
if (!/\bBENCHF=/.test(ENV)) { console.error('needs a fixed workload: BENCHF=n (with SPINF=1 or WALKF=1)'); process.exit(1); }
const { addrOf } = buildDisk(ENV, 'zz-frames.d64');
const MNEXT = addrOf('mnext'), END = addrOf('benchEnd'), BASEHI = addrOf('baseHi');
const held = portHeld(PORT);
if (held) { console.error(`port ${PORT} is held by pid ${held} -- kill that process (not every x64sc)`); process.exit(2); }
// launch() owns the emulator's lifetime: its whole process group dies on exit, Ctrl-C, an error, or the cap
launch([...LAUNCH_FLAGS, '-warp', '-remotemonitor', '-remotemonitoraddress', `ip4://127.0.0.1:${PORT}`,
  '-autostart', join(ROOT, 'zz-frames.d64')], { hardCapMs: 240000, label: 'frames' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmp = mkdtempSync(join(tmpdir(), 'frames-'));
const mon = await textMonitor(PORT), cmd = mon.cmd;
const PR = /\(C:\$([0-9a-f]{4})\) $/;
// (VICE's text monitor sends nothing on connect: the first prompt arrives with the first reply)
await cmd(`break ${MNEXT.toString(16)}`);
await cmd(`break ${END.toString(16)}`);
const frames = [];
const tmpf = join(tmp, 'scr.bin');
for (;;) {
  const o = await cmd('x');                             // run to the next stop
  const pc = parseInt(PR.exec(o)[1], 16);
  if (pc === END) break;
  if (pc !== MNEXT) continue;
  const m = await cmd(`m ${BASEHI.toString(16)} ${BASEHI.toString(16)}`);
  const hi = parseInt(/:[0-9a-f]{4}\s+([0-9a-f]{2})/i.exec(m)[1], 16);
  const shown = (hi === 0xe0 ? 0xe400 : 0xe000);       // baseHi = next to DRAW; the other is on screen
  try { unlinkSync(tmpf); } catch {}
  await cmd(`bsave "${tmpf}" 0 ${shown.toString(16)} ${(shown + 999).toString(16)}`);
  for (let k = 0; k < 50 && !existsSync(tmpf); k++) await sleep(20);
  frames.push(readFileSync(tmpf));
}
mon.close();
writeFileSync(join(OUT, 'frames.bin'), Buffer.concat(frames));

// ---- A-B-A: a cell that changes and changes straight back ----
const aba = fr => { const hits = [];
  for (let k = 1; k + 1 < fr.length; k++) for (let i = 0; i < 1000; i++)
    if (fr[k][i] !== fr[k - 1][i] && fr[k + 1][i] === fr[k - 1][i]) hits.push([k, i]);
  return hits; };
const load = d => { const b = readFileSync(join(d, 'frames.bin')), n = b.length / 1000;
  return [...Array(n)].map((_, k) => b.subarray(k * 1000, k * 1000 + 1000)); };
const mine = aba(frames);
const changed = frames.slice(1).reduce((n, f, k) => n + f.reduce((m, v, i) => m + (v !== frames[k][i]), 0), 0);
let rep = `${ENV}\n${frames.length} displayed frames; ${changed} cell changes; ${mine.length} A-B-A flips\n`;
if (CMP) {
  const other = load(CMP), theirs = new Set(aba(other).map(([k, i]) => `${k}:${i}`));
  const only = mine.filter(([k, i]) => !theirs.has(`${k}:${i}`));
  const mineS = new Set(mine.map(([k, i]) => `${k}:${i}`));
  const gone = [...theirs].filter(s => !mineS.has(s)).length;
  const sameN = Math.min(other.length, frames.length);
  let diffFrames = 0; for (let k = 0; k < sameN; k++) if (Buffer.compare(other[k], frames[k])) diffFrames++;
  rep += `vs ${CMP}: ${theirs.size} flips there; ${only.length} flips ONLY here, ${gone} only there; ` +
         `${diffFrames} of ${sameN} frames differ\n`;
  for (const [k, i] of only.slice(0, 20)) rep += `  frame ${k} row ${Math.floor(i / 40)} col ${i % 40}: ` +
    `${frames[k - 1][i]} -> ${frames[k][i]} -> ${frames[k + 1][i]}\n`;
}
writeFileSync(join(OUT, 'report.txt'), rep);
console.log(rep);
process.exit(0);
