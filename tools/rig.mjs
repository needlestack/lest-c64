#!/usr/bin/env node
// rig.mjs -- patch a parameter set into a COPY of the test rig's disk (2026-11-14).
//
//   TESTRIG=1 D64=build/rig.d64 node src/build-iray.mjs      once: the rig, and build/rig.json beside it
//   node tools/rig.mjs build/rig.json build/tmp/x.d64 level=2 mode=walk at=60 for=85 legs=4 inset=21 \
//        px=01ad py=09e5 pa=e0 paf=80 noshock=1
//
// WHY: every test parameter used to be a build flag, so every run was a whole build (~3 minutes for
// the ten-level game) and fpsr's suite was 18 of them. A TESTRIG build reads its drivers' settings
// from a parameter block in IMG (rgBlk, see TESTRIG in build-iray.mjs), and the build writes
// <disk>.json: for each field its byte offsets IN THE .d64 FILE (IMG's sector chain, walked by the
// build) and its default bytes. So a run is a file copy and a few byte writes -- no rebuild.
//
// THE PARAMETERS (all optional; anything left out keeps the build's default, the idle):
//   level    1-10. Level 1 is where the rig boots; any other is entered by a REAL fall from it.
//   mode     idle | spin | walk | walkb  (SPIN, WALK, WALKB: timed by at/for/legs)
//            | spinf | walkf  (SPINF, WALKF: a fixed step per RENDERED frame from frame 0 of play).
//   at  MOVEAT: ticks from the first frame of play on the level to the window.
//   for  MOVEFOR, legs  MOVELEGS, inset  MOVEINSET.
//   px py    8.8 cells, hex like the build flags (PX=01ad);  pa paf  the angle, hex. Give px and py
//            to set a pose (pa/paf default 0); without them the level's own start stands.
//   noshock  1: a sentry's touch never kills (level 9's svChg).
// Stage 2 (2026-11-14), for frames.mjs, regress.sh and vprof.mjs. FRAME 0 is the first frame of
// play on the level (after the landing), so frame counts mean what they meant in a BOOTLVL build:
//   bench      BENCHF: park at benchEnd after exactly n rendered frames of play.
//   fallnow    FALLNOW: a forced fall (through exit 0) on frame n-1, 2n-1, ... -- n a power of two,
//              at least 4 off level 1 (frames 0 and 1 of level 1 come before the rig's level). Sixteen
//              falls at most, as the build's.
//   fallhold   FALLHOLD: every fall holds at its frame n (0-14) for ever.
//   angfreeze  1: the angels never step (ANGFREEZE).  svfreeze  1: level 9's sentries stand and
//              never spark (SVFREEZE).
//   angat      x,y: every angel starts in cell (x, y) (ANGAT, whole cells: ANGAT=3.5,4.5 is 3,4).
//   die        n: entity n (an angel) has already cornered you (DIETEST's mark).
//   dietest    1: the DIETEST build's scenario, its defaults included: the boot level's first angel
//              has cornered you (die), every angel at cell 3,4 (angat), the pose 0480,0480 facing
//              east, angfreeze -- each still overridable. Pair with mode=spinf, as DIETEST=1 SPINF=1.
//   (FALLEXIT is not carried: nothing used it, and the rig's image had no bytes to spare.)
//
// SAFETY: the bytes at every offset must still hold the json's defaults before anything is written,
// which proves the json and the disk came from the same build. A stale json would otherwise patch
// some other byte of the game and every run would measure something else, plausibly.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { dirname, basename, join } from 'path';

const hex = (v, what) => {
  const n = typeof v === 'number' ? v : parseInt(String(v), 16);
  if (!Number.isFinite(n)) throw new Error(`rig: ${what}=${v} is not hex`);
  return n;
};
const MODES = { idle: 0, spin: 1, walk: 2, walkb: 3, spinf: 4, walkf: 5 };
const KNOWN = new Set(['level', 'mode', 'at', 'for', 'legs', 'inset', 'px', 'py', 'pa', 'paf', 'noshock',
  'bench', 'fallnow', 'fallhold', 'angfreeze', 'svfreeze', 'angat', 'die', 'dietest']);

// params -> { field key: [bytes] }. Only what was given; the rest keep the disk's defaults.
// `rig` (the json) is needed only for dietest, whose angel is the build's own.
export function encode(p, rig = null) {
  p = { ...p };
  const bad = Object.keys(p).filter(k => !KNOWN.has(k));
  if (bad.length) throw new Error(`rig: unknown parameter(s) ${bad.join(', ')} -- known: ${[...KNOWN].join(' ')}`);
  if (+p.dietest) {                     // the DIETEST build's defaults, each overridable (see the header)
    const dt = rig?.dieTest;
    if (!dt || dt.angel < 0) throw new Error('rig: dietest needs a rig.json with dieTest (a stage-2 rig)');
    if (p.level !== undefined && +p.level !== dt.level) throw new Error(`rig: dietest is level ${dt.level}'s (the boot level), not ${p.level}`);
    p = { px: '0480', py: '0480', pa: '00', paf: '00', angat: '3,4', angfreeze: 1, die: dt.angel, ...p };
  }
  delete p.dietest;
  const out = {};
  const byte = (k, v, lo = 0, hi = 255) => {
    if (!Number.isInteger(v) || v < lo || v > hi) throw new Error(`rig: ${k}=${v}: want ${lo}..${hi}`);
    out[k] = [v];
  };
  if (p.level !== undefined) byte('level', +p.level, 1, 10);
  if (p.mode !== undefined) {
    if (!(p.mode in MODES)) throw new Error(`rig: mode=${p.mode}: want ${Object.keys(MODES).join(' | ')}`);
    byte('mode', MODES[p.mode]);
  }
  if (p.at !== undefined) byte('at', +p.at, 1, 255);
  const fr = p.for !== undefined ? +p.for : undefined, inset = +(p.inset ?? 0);
  if (fr !== undefined) {
    byte('for', fr, 1, 255);
    // MOVEINSET is stored as the later legs' length, which is all maStep needs (see MOVEINSET)
    if (inset < 0 || inset >= fr) throw new Error(`rig: inset=${inset}: want 0..for-1`);
    byte('len2', fr - inset);
  } else if (p.inset !== undefined) throw new Error('rig: inset needs for');
  if (p.legs !== undefined) byte('legs', +p.legs, 1, 255);
  if (p.px !== undefined || p.py !== undefined) {
    if (p.px === undefined || p.py === undefined) throw new Error('rig: a pose needs both px and py');
    const x = hex(p.px, 'px'), y = hex(p.py, 'py');
    out.pose = [5];                     // rgLand copies rgPx..rgPaf, x = 5 down to 0
    out.px = [x & 255, x >> 8]; out.py = [y & 255, y >> 8];
    out.pa = [hex(p.pa ?? 0, 'pa') & 255]; out.paf = [hex(p.paf ?? 0, 'paf') & 255];
  }
  if (p.noshock !== undefined) byte('noshock', +p.noshock ? 1 : 0);
  if (p.bench !== undefined) {
    const n = +p.bench;
    if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`rig: bench=${p.bench}: want 1..65535`);
    out.bench = [n & 255, n >> 8];
  }
  if (p.fallnow !== undefined) {
    const n = +p.fallnow, lvl = +(p.level ?? 1);
    if (!(n >= 1 && n <= 256 && (n & (n - 1)) === 0)) throw new Error(`rig: fallnow=${p.fallnow}: want a power of two, 1..256`);
    if (lvl !== 1 && n < 4) throw new Error(`rig: fallnow=${n} off level 1: want 4 or more (level 1's frames 0-1 come first)`);
    out.fallnow = [(n - 1) & 255, (n - 1) & 255];
  }
  if (p.fallhold !== undefined) byte('fallhold', +p.fallhold, 0, 14);
  if (p.angfreeze !== undefined || p.svfreeze !== undefined)
    out.freeze = [(+p.angfreeze ? 0x40 : 0) | (+p.svfreeze ? 0x80 : 0)];
  if (p.angat !== undefined) {
    const [x, y] = String(p.angat).split(',').map(Number);
    if (![x, y].every(v => Number.isInteger(v) && v >= 0 && v < 64)) throw new Error(`rig: angat=${p.angat}: want x,y in cells`);
    out.angat = [x, y];
  }
  if (p.die !== undefined) byte('die', +p.die, 0, 127);
  return out;
}

// A parameter set as text: "level=4 mode=walkf bench=300" -> { level: '4', ... } (what regress.sh,
// frames.mjs and vprof.mjs take on their command lines).
export const parseSet = str => Object.fromEntries(String(str).split(/\s+/).filter(Boolean).map(a => {
  const i = a.indexOf('=');
  if (i < 1) throw new Error(`rig: "${a}" is not key=value`);
  return [a.slice(0, i), a.slice(i + 1)];
}));

// The rig's disk and labels, as absolute paths. The build writes <base>.json beside <base>.d64 and
// <base>.syms.json, so they are found beside the json -- which also works for a rig built in another
// tree (regress.sh's REV worktree), whose json names its paths relative to THAT tree's root.
export function rigFiles(jsonPath) {
  const rig = JSON.parse(readFileSync(jsonPath, 'utf8')), dir = dirname(jsonPath);
  return { rig, d64: join(dir, basename(rig.d64)), syms: join(dir, basename(rig.syms)) };
}

// Build the rig in `root` (default: this tree) with extra build flags; returns its json's path.
// Throws with the build's own reason if it fails, or if the tree's build makes no rig at all (a
// revision from before TESTRIG=1, which ignores the flag and builds the plain game).
export function buildRig(flags = {}, root = new URL('..', import.meta.url).pathname, d64 = 'build/rig.d64') {
  let out;
  try {
    out = execFileSync(process.execPath, ['src/build-iray.mjs'], { cwd: root, encoding: 'utf8',
      env: { ...process.env, ...flags, TESTRIG: '1', D64: d64 }, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const o = String(e.stdout ?? '') + String(e.stderr ?? '');
    throw new Error(`rig build failed in ${root}: ${o.match(/ASM ERROR.*|Error: .*/)?.[0] ?? o.trim().split('\n').slice(-3).join(' | ')}`);
  }
  const json = join(root, d64.replace(/\.d64$/i, '.json'));
  if (!/^rig: /m.test(out) || !existsSync(json))
    throw new Error(`${root} built, but no rig: its build-iray.mjs has no TESTRIG=1 (a revision before 2026-11-14?)`);
  return json;
}

// Copy the rig disk named by the json to `dst` with `params` written in; returns dst.
export function patchRig(jsonPath, dst, params) {
  const { rig, d64 } = rigFiles(jsonPath);
  const disk = readFileSync(d64);
  for (const f of rig.fields) f.offsets.forEach((o, i) => {
    if (disk[o] !== f.default[i]) throw new Error(`rig: ${rig.d64} byte ${o} (${f.label}+${i}) is ${disk[o]}, ` +
      `${jsonPath} says ${f.default[i]} -- the json and the disk are from different builds`);
  });
  const enc = encode({ ...params }, rig);
  for (const [k, bytes] of Object.entries(enc)) {
    const f = rig.fields.find(x => x.key === k);
    if (!f) throw new Error(`rig: this rig has no ${k} field`);
    bytes.forEach((b, i) => { disk[f.offsets[i]] = b; });
  }
  writeFileSync(dst, disk);
  return dst;
}

// CLI: node tools/rig.mjs <rig.json> <out.d64> key=value ...
if (import.meta.url === `file://${process.argv[1]}`) {
  const [json, dst, ...kv] = process.argv.slice(2);
  if (!json || !dst) { console.error(`usage: node tools/rig.mjs build/rig.json out.d64 [key=value ...] -- keys: ${[...KNOWN].join(' ')}`); process.exit(2); }
  const p = parseSet(kv.join(' '));
  console.log(patchRig(json, dst, p));
}
