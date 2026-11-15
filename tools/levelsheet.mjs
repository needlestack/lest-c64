#!/usr/bin/env node
// levelsheet.mjs -- write every level as a LEVEL SHEET: docs/levels/LEVELn.txt
//
//   node tools/levelsheet.mjs
//
// The language is docs/levels/KEY.txt. Each sheet is drawn from src/levels.mjs, the data the game is
// built from -- map, wall groups, sockets, pedestals, exits and where they go, entities, leashes,
// start, inks -- so re-running this after any level change brings every sheet up to date and a sheet
// cannot drift from the game the way hand-kept ones did. Two characters a cell: the first says
// WHAT, the second is its one parameter (or repeats).
//
// NO BUILD (2026-11-15). Each sheet used to be a full run of src/build-iray.mjs with LEVELSHEET=1,
// which made a table dump of every other level and a rebuild per breakable wall before it printed
// and stopped -- minutes a sheet, for none of whose output the sheet needed (the user: "the levels
// are just data that can be read out? do we really have to build?"). The level definitions moved
// to src/levels.mjs, which the build imports too; this prints all ten from it in well under a second.
// The sheets describe the SHIPPING game: the build's test switches (NOORB, ANGEL=0, SOCKETS, PX...)
// are not applied here, and every exit's destination is the full game's (the ending included).
import { writeFileSync, mkdirSync } from 'fs';
import { ROOT } from '../src/paths.mjs';
import { SHIP_LEVEL_IDS, mapOf, LEVEL_WALLS, LEVEL_CLOSE, socketsOf, cellsOf, LEVEL_PEDESTALS,
         END_DST, HAS_CORNER, LEVEL_CORNER, exitsOf, levelExitDst, LEVEL_EXITCOL, entitiesOf,
         LEVEL_LEASH, leashGroups, LEVEL_START, palOf, LEVEL_FLICKER, LEVEL_FLOORDK, LEVEL_SYM,
         nextLevel, LEVEL_IDOL, L9_SHEET } from '../src/levels.mjs';
process.chdir(ROOT);

// ending = true: the game's last exit leads to the ending. In the build that is ENDING, which is
// also false in a table dump and under NOENDING; the sheet is of the game as shipped.
const LEVEL_EXITDST = levelExitDst(true);
const C64N = ['black','white','red','cyan','purple','green','blue','yellow','orange','brown',
              'light red','grey 1','grey 2','light green','light blue','grey 3'];

const sheetOf = LVL => {
  const rows = mapOf(LVL), W = rows[0].length, H = rows.length;
  const SOCKETS_AT = cellsOf(socketsOf(LVL)), PEDESTALS_AT = cellsOf(LEVEL_PEDESTALS[LVL] ?? '');
  const HOLES_AT = exitsOf(LVL), EXIT_COLS = LEVEL_EXITCOL[LVL] ?? [];
  const ORBS = entitiesOf(LVL), LEASH_GROUPS = leashGroups(LEVEL_LEASH[LVL] ?? '');
  const g = rows.map(r => [...r].map(c => c === '#' ? '[]' : '..'));
  const clash = [];
  const put = (x, y, gl, what) => {
    x = Math.floor(x); y = Math.floor(y);
    if (g[y][x] !== '..') clash.push(`(${x},${y}) ${what} on ${g[y][x]}`);
    g[y][x] = gl;
  };
  // removable walls: |n for group n, |+ for a cell in more than one group
  const wallGroups = {};
  (LEVEL_WALLS[LVL]?.walls ?? []).forEach((grp, k) => grp.forEach(([x, y]) =>
    (wallGroups[`${x},${y}`] ??= []).push(k + 1)));
  const sw = LEVEL_WALLS[LVL]?.sockWall ?? [];
  // a CLOSER is Wn, n the group its socket opens (W2 shuts when S2 is fed) -- see LEVEL_CLOSE
  const closeOf = Object.fromEntries((LEVEL_CLOSE[LVL] ?? []).map(c => [c.wall + 1, sw[c.sock] + 1]));
  for (const [xy, ks] of Object.entries(wallGroups)) {
    const [x, y] = xy.split(',').map(Number);
    g[y][x] = ks.length > 1 ? '|+' : closeOf[ks[0]] ? `W${closeOf[ks[0]]}` : `|${ks[0]}`;
  }
  SOCKETS_AT.forEach(([x, y], i) => put(x, y, `S${(sw[i] ?? -1) + 1 || '?'}`, 'socket'));
  PEDESTALS_AT.forEach(([x, y], i) => put(x, y, `/${(sw[SOCKETS_AT.length + i] ?? -1) + 1 || '?'}`, 'pedestal'));
  const dst = v => v === undefined || v === null ? '>' : v === END_DST ? '!' : String(v % 10);   // 10 is X0: a cell is two characters
  // The CORNER exit (LEVEL_CORNER) is in no cell: it is the north-west corner of a WALL cell, where four
  // breakable cells meet. It has no glyph; the line under the map says where it is.
  const isCorner = i => i === 0 && HAS_CORNER && !!LEVEL_CORNER[LVL];
  HOLES_AT.forEach(([x, y], i) => { if (!isCorner(i)) put(x, y, `X${dst(LEVEL_EXITDST[LVL]?.[i])}`, 'exit'); });
  let an = 0;
  for (const o of ORBS) {
    if (o.hidden) continue;                     // the hub's idol slots: they stand on the pedestals
    put(o.x, o.y, o.tall ? `A${++an}` : o.idol ? 'II' : 'OO', o.tall ? 'angel' : o.idol ? 'idol' : 'orb');
  }
  LEASH_GROUPS.forEach((grp, k) => grp.forEach(([x, y]) => put(x, y, `L${k + 1}`, 'leash')));
  const [sx, sy, sa, saf] = LEVEL_START[LVL] ?? LEVEL_START[1];
  const ang = (sa * 256 + saf) / 65536 * 360;   // 0 = east (+x), rising toward +y = south
  put(sx / 256, sy / 256, 'P' + '>v<^'[Math.round(ang / 90) % 4], 'player');
  if (clash.length) throw new Error(`level sheet ${LVL}: two things in one cell: ${clash.join('; ')}`);

  const ink = c => `${c} ${C64N[c]}`;
  const pal = palOf(LVL), out = [];
  const pad = (s, n) => String(s).padStart(n);
  out.push(`LEVEL ${LVL}`, '');
  out.push('    ' + [...Array(W)].map((_, x) => x >= 10 ? pad(Math.floor(x / 10), 2) : '  ').join(' '));
  out.push('    ' + [...Array(W)].map((_, x) => pad(x % 10, 2)).join(' '));
  g.forEach((r, y) => out.push(`${pad(y, 2)}  ${r.join(' ')}`));
  out.push('', `size     ${W} x ${H} = ${W * H} cells`);
  out.push(`start    (${(sx / 256).toFixed(2)}, ${(sy / 256).toFixed(2)}) facing ${ang.toFixed(0)} deg (0 east, 90 south)  [PX=${sx.toString(16).padStart(4, '0')} PY=${sy.toString(16).padStart(4, '0')} PA=${sa.toString(16).padStart(2, '0')} PAF=${saf.toString(16).padStart(2, '0')}]`);
  out.push(`inks     ground ${ink(pal.ceil)}, walls ${ink(pal.wall)}, seams ${ink(pal.seam)}`);
  if (LEVEL_FLICKER[LVL]) { const f = LEVEL_FLICKER[LVL];
    out.push(`flicker  lit for single frames: ground ${ink(f.gnd)}, walls ${ink(f.wall)}, seams ${ink(f.seam)}`); }
  if (LEVEL_FLOORDK[LVL]) out.push('floor    dithered (the floor half darkened by a black checker)');
  if (LEVEL_SYM[LVL]) out.push('walls    marked (a dot in every solid wall cell)');
  HOLES_AT.forEach(([x, y], i) => {
    const d = dst(LEVEL_EXITDST[LVL]?.[i]);
    out.push(`exit     ${isCorner(i) ? `(no glyph) at the north-west corner of (${x},${y}), where (${x - 1},${y - 1})-(${x},${y}) meet: it opens once all four are broken` : `X${d} at (${x},${y})`}: ${d === '>' ? `the next level in the chain (level ${nextLevel(LVL)} in the full game)` : d === '!' ? 'THE END (the ending sequence)' : `level ${d === '0' ? 10 : d}`}, hole ${ink(EXIT_COLS[i] ?? 0)}`);
  });
  (LEVEL_WALLS[LVL]?.walls ?? []).forEach((grp, k) => {
    if (closeOf[k + 1]) return out.push(`closer   W${closeOf[k + 1]} ${grp.map(([x, y]) => `(${x},${y})`).join(' ')} -- open at the start; back the moment S${closeOf[k + 1]} is fed (whatever stands in it is pushed ${(LEVEL_CLOSE[LVL].find(c => c.wall === k).cells.map(c => `to (${c.ax},${c.ay})`)).join(', ')})`);
    const by = [...SOCKETS_AT.map((c, i) => [`S${k + 1}`, c, i]), ...PEDESTALS_AT.map((c, i) => [`/${k + 1}`, c, SOCKETS_AT.length + i])]
      .filter(([, , i]) => sw[i] === k).map(([gl, [x, y]]) => `${gl} (${x},${y})`);
    out.push(`group ${k + 1}  ${grp.map(([x, y]) => `(${x},${y})`).join(' ')} -- opened by ${by.join(', ') || 'nothing'}${by.length > 1 && by[0][0] === '/' ? ' (all of them)' : by.length > 1 ? ' (any of them)' : ''}`);
  });
  for (const [xy, ks] of Object.entries(wallGroups)) if (ks.length > 1)
    out.push(`|+       (${xy}) is in groups ${ks.join(' and ')}: whichever opens first takes it out`);
  LEASH_GROUPS.forEach((grp, k) => { if (grp.length) out.push(`leash    A${k + 1} may not enter ${grp.map(([x, y]) => `(${x},${y})`).join(' ')}`); });
  if (LEVEL_IDOL[LVL]) out.push(`idol     carried to the hub's pedestals`);
  // Level 9's SENTRIES and STAGES have no glyphs in KEY.txt: drawn as above, its stage-0 sentries
  // read as orbs (OO), later stages' cast is missing, and the closing walls W1/W2 look like doors
  // opened by nothing. So its sheet also carries the authoring sheet the level is built from.
  if (LVL === 9) out.push('', 'The sheet above cannot show sentries or stages: its OO in the loops are the first stage\'s',
    'sentries, later stages are missing, and the groups "opened by nothing" are W1/W2, the walls that',
    'CLOSE behind you when S1/S2 are fed. The level is built from this authoring sheet (see L9_SHEET',
    'in src/levels.mjs for its notation: >n/<n/vn/^n a sentry heading off on path n, ~n path n,',
    'Wn closes when Sn is fed, |n opens):', L9_SHEET.replace(/^\n/, ''));
  return out.join('\n') + '\n';     // + '\n': what the build's console.log ended each sheet with
};

mkdirSync('docs/levels', { recursive: true });
for (const n of SHIP_LEVEL_IDS) {
  writeFileSync(`docs/levels/LEVEL${n}.txt`, sheetOf(n));
  console.log(`docs/levels/LEVEL${n}.txt`);
}
