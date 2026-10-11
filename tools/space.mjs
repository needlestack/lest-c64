#!/usr/bin/env node
// space.mjs -- what each FEATURE of the game costs in the image, byte by byte.
//
//   node tools/space.mjs                 build the default game and charge every image byte
//   node tools/space.mjs "CHAIN=4"       the same for any build flags (WIP=1 for an unshipped level)
//   node tools/space.mjs "" -v           also list each feature's largest items
//
// The image ($0801-$bfff) is three kinds of bytes, and this charges all three:
//   code     -- the ENGINE CODE section, from $0801 up
//   tables   -- the DATA TABLES section, from the top down (plus the few variables that live
//               in its holes)
//   scratch  -- the RAM buffers compact.mjs packs into the ARENA between the two
// Each label's size is the gap to the next label, so the columns add up to the whole image.
//
// HOW A BYTE FINDS ITS FEATURE. Code is charged by its label's name first, then by the section
// banner (`; ---- name: ... ----`) it sits under in build/iray.asm; tables and scratch by name
// alone, since compact.mjs moves them away from the banners they were written under. The rules
// are the CODE and DATA lists below -- prefixes, because that is how this codebase names things.
// A routine with a new prefix lands in its banner's feature, or in the renderer if it has none,
// so after adding code run with -v and read the renderer's list.
//
// What it CANNOT tell you is what switching a feature off would free. A shared table is charged
// to one owner, and an off-switch can leave its feature's tables behind (SEAMS=0 frees 567 bytes
// of code, not the 2.4K charged to seams here). For that, build with the switch and compare; the
// measured ones are in docs/SPACE.md.
import { spawnSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { ROOT } from '../src/paths.mjs';
process.chdir(ROOT);

const flags = process.argv[2] ?? '';
const verbose = process.argv.includes('-v');
const env = { ...process.env, D64: 'build/_space.d64' };   // never the official disk
for (const kv of flags.split(/\s+/).filter(Boolean)) env[kv.slice(0, kv.indexOf('='))] = kv.slice(kv.indexOf('=') + 1);
const run = spawnSync(process.execPath, ['src/build-iray.mjs'], { env, encoding: 'utf8', maxBuffer: 1 << 26 });
try { unlinkSync('build/_space.d64'); } catch {}
const report = (run.stdout ?? '') + (run.stderr ?? '');
if (run.status !== 0) { console.error(report.split('\n').slice(-12).join('\n') + '\nspace.mjs: the build failed'); process.exit(1); }
// the section bounds come from the build's own layout report, never from constants here
const range = name => {
  const m = new RegExp(`${name}\\s+\\$([0-9a-f]+)-\\$([0-9a-f]+)`).exec(report);
  if (!m) throw new Error(`space.mjs: no "${name}" line in the build report`);
  return [parseInt(m[1], 16), parseInt(m[2], 16) + 1];
};
const CODE = range('ENGINE CODE'), ARENA = range('ARENA'), TABLES = range('DATA TABLES');

const syms = JSON.parse(readFileSync('build/iray.syms.json', 'utf8'));
const owner = {};                                   // label -> the banner it was written under
let banner = '';
for (const l of readFileSync('build/iray.asm', 'utf8').split('\n')) {
  const b = /^;\s*(-{3,}|={3,})\s*(.*?)\s*(-{3,}|={3,})?\s*$/.exec(l);
  if (b && b[2]) { banner = b[2]; continue; }
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*=)/.exec(l);
  if (m && syms[m[1]] !== undefined && !(m[1] in owner)) owner[m[1]] = banner;
}

const R = 'renderer: cast, subdivide, draw';
// [feature, label prefixes, banner prefixes]. First label match wins, then first banner match.
const CODE_RULES = [
  ['HUD + fps readout', /^(hud|hh|hx|drawDbg|ddAng|ddPut|symT|symOT|drawFps|setRow|lvlSymT|computeFps|cf)/, /^readout/],
  ['palette keys 1/2/3', /^(palKeys|pk\d|pkDn|palCol|pcCei|pcFlr|pcQ|pcW|pcDn|colT|colF)/, /^palCol/],
  ['movement + input', /^(readKeys|rk|move|strafe|mv[A-Z]|ma[A-Z]|tickDelta|td[A-Z])/, /tickDelta|ESDF/],
  ['angel lunge (slide)', /^(sl[A-Z]|st(Ix|Move|Y|Dty)|angSl|slFT|sn(Add|P|Y|S)$|slOff|slOn|orbProjS|opsS|slL)/, /LUNGE|slTick|slLand|orbProjS/],
  ['angel AI + BFS pathing', /^(ang|an[A-Z]|as[A-Z]|aa|al[A-Z]|bfs|apLd|anP|pathD)/, /^(angStep|angOne|angPick|anAdj|anTry|angDst|bfs)/],
  ['death scene', /^(die|dk|dg|dpHav|dpDn|dck|dsh|ds[A-Z]|df|pic|pp[A-Z]|sn(Tone|Rise|ROn|RDn|Off|Boom|Hit|Crash))/, /^(die|picPut|picOn|snBoom|snTone)/],
  ['sound', /^(snd|sfx|sni|snK|st(Ok|Lp|Px|Py|Next|Max))/, /^(sndTick|sndInit|snKick)/],
  ['flicker (level 8)', /^(flk|fk)/, /^(flkTick|fkInk)/],
  ['idol + pedestals', /^(idol|ip[A-Z]|ped|po[A-Z]|idlPut)/, /^(idolPlace|WHERE EACH IDOL|and WHERE|pedOff|idolLk|pedGate)/],
  ['wall collapse (sockets)', /^(wall|wt|ws|wf|wd|wb|hzRunW|hzW|sokShr)/, /^(wallSink|wallTog|wtDoom|wtCells|hzRunW|wallsBack|A WALL)/],
  ['orb carry (pick up / put down)', /^(takePick|tk|dropPick|dp(Lp|Next|Cand|Diag|Cnr|Dok)|orbKey|ok[A-Z]|orbPut|orbUse|hlAt|od[A-Z]|faceCell|fc[A-Z])/, /^(takePick|dropPick|orbKey|hlAt|dpDiag|faceCell)/],
  ['level fall + load (the drop)', /^(fall|fd|fs|fst|fg|fw|fm|ft|arc|ab|ap|ag|a2|bg|snap|kl|lvlLoad|llN|llZ|kp|nILV)/, /^(the drop|fallMid|fdWarp|fwait|arc|bgStep|fallTail|fdG|fdS|fdB|fsOv|klPark|snapCp|fwGen|THE FALL)/],
  ['THE END', /^(endGo|eg)/, /^endGo/],
  ['level setup (entering a level)', /^(lvl|objInit|oi[A-Z]|mkRuns|mr|hazSpFix|hsf|floorDk|fdM|setGnd|lvlChr|symPut|spLp|seamEdge|mulW)/, /^(WHAT ENTERING|objInit|mkRuns|lvlStart|lvlChr|floorDk|setGnd|hazSpFix|the per-level|seamEdge|mulW|THIS LEVEL)/],
  ['seams', /^(ss|seam|sd[A-Z]|calcU|cu[A-Z]|spw)/, /^(seamSpan|the solid-run draw for a SEAM|where does this wall stop|ssPw|SEAMHYST)/],
  ['entities: projection, sprites, occlusion', /^(orb|o[a-zA-Z]|ob|om|oS|os|og|ent|hl|ho|hole|hs|hr|occ|cn|ocs|oss|ivLp|ivR|ivDn|onLp|onDn|spr|sp[A-Z]|irqSp|saOff|cone)/, /^(orbs:|orbMove|osFlush|occStamp|the UPPER|orbOne|orbProj|holeTail|hlSet|entGate|omTrig|oSPut|orbOcc|obOrder|kMskT|occRT|orbColLT|sprPal|sprSpl|ENTCONE|orb tables|hole ladder)/],
  ['boot, main loop, IRQ', /^(entry|cpChr|mloop|mf|mvs|irq|nmi|ccf|rfCz)/, /^(raster IRQ|nmi)/],
];
const DATA_RULES = [
  ['death scene', /^(faceChr|die|dk|pic|darkerT|markSaw|opaq|marked)/],
  ['level fall + load (the drop)', /^fallSnap/],
  ['angel AI + BFS pathing', /^(bfs|blkT|ang(Bear|Acc|Per|Far|Leash)|an[KD]|pathD|orbSeenT)/],
  ['angel lunge (slide)', /^(sl[A-Z]\d|slFT|angSl)/],
  ['sound', /^(snd|sfx)/],
  ['seams', /^(seamT|se[A-Z]|seC|ss[A-Z]|sm(Lo|Hi)|sHy|absCos|absSin|posXT|posYT)/],
  [R, /^(f0|f1)(Lo|Hi)T$/],                         // the quarter-square multiply: castRay is its main reader
  ['entities: projection, sprites, occlusion', /^qcosT$/],   // orbMove's trig
  ['level fall + load (the drop)', /^(mul40|mulSnap|fd|fK|fL|fH|fN|fw|fs|fT0|fFrm|arc|ap[A-Z]|bg|snap|fall|krillRt|edT|pgC)/],
  ['entities: projection, sprites, occlusion', /^(cellFillT|occVrtT)$/],
  [R, /^(hTab|hPg|ddx|ramp|step|ecM|rbT|rsT|qm|qIdx|rayOff|rcpD|sinS|qToCol|runByte|runBit|run[WENS]T|ed[AB]|bk[AB]|sl[AB]|occVrt|cellFill|haz|recip|rem|faceId|runPlane|runFace|bndT|cw[AB]|cb[AB]|cstep|pv|o2r)/],
  ['entities: projection, sprites, occlusion', /^(orb|hole|sock|ped|angVarT|angMid|cone|hl|hrp|obOcc|oo|cnOk|ogP|ogT|ohHi|otmp|onv|oht|oqa|stmp|zBit|exitVis|hlK5|ob|o[a-z]|oS)/],
  ['palette keys 1/2/3', /^(pk|col[WBS])/],
  ['movement + input', /^(move|dtv|lastMv|dx|dy|rowv|dtm|dtt|paF|rxF|ryF|sk)/],
];
const featOfCode = k => {
  for (const [f, lr] of CODE_RULES) if (lr.test(k)) return f;
  for (const [f, , br] of CODE_RULES) if (br.test(owner[k] ?? '')) return f;
  return R;
};
const featOfData = k => (DATA_RULES.find(([, r]) => r.test(k)) ?? [null])[0] ?? featOfCode(k);

const sum = {};
const charge = ([lo, hi], kind, feat) => {
  const e = Object.entries(syms).filter(([, v]) => v >= lo && v < hi).sort((a, b) => a[1] - b[1]);
  e.forEach(([k, v], i) => {
    const sz = (i + 1 < e.length ? e[i + 1][1] : hi) - v;
    if (!sz) return;
    const s = sum[feat(k)] ??= { code: 0, tables: 0, scratch: 0, items: [] };
    s[kind] += sz; s.items.push([k, sz]);
  });
};
charge(CODE, 'code', featOfCode);
charge(ARENA, 'scratch', featOfData);
charge(TABLES, 'tables', featOfData);

const all = s => s.code + s.tables + s.scratch;
const rows = Object.entries(sum).sort((a, b) => all(b[1]) - all(a[1]));
const pad = (v, n = 7) => String(v).padStart(n);
console.log(`${flags ? `flags: ${flags}\n` : ''}   code  tables scratch   total  feature`);
const tot = { code: 0, tables: 0, scratch: 0 };
for (const [f, s] of rows) {
  for (const k in tot) tot[k] += s[k];
  console.log(`${pad(s.code)} ${pad(s.tables)} ${pad(s.scratch)} ${pad(all(s))}  ${f}`);
  if (verbose) console.log('          ' + s.items.sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, z]) => `${k} ${z}`).join(', '));
}
console.log(`${pad(tot.code)} ${pad(tot.tables)} ${pad(tot.scratch)} ${pad(all(tot))}  TOTAL ($${CODE[0].toString(16)}-$${(TABLES[1] - 1).toString(16)})`);
