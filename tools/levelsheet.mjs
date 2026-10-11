#!/usr/bin/env node
// levelsheet.mjs -- write every level as a LEVEL SHEET: docs/levels/LEVELn.txt
//
//   node tools/levelsheet.mjs
//
// The language is docs/levels/KEY.txt. Each sheet is printed by the build itself (LEVELSHEET=1),
// from the data the game is built from, so re-running this after any level change brings every
// sheet up to date and a sheet can never disagree with the game. A shipping level is built against
// the full game's chain, so its exits show where they really lead; a work-in-progress level
// (WIP_LEVEL_IDS) is built with WIP=1 and appended to that chain, so the game's own sheets never
// show an exit into a level that isn't in it.
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { ROOT } from '../src/paths.mjs';
process.chdir(ROOT);

const src = readFileSync('src/build-iray.mjs', 'utf8');
const list = name => JSON.parse(new RegExp(`const ${name} = (\\[[\\d, ]+\\]);`).exec(src)[1]);
const ship = list('SHIP_LEVEL_IDS'), wip = list('WIP_LEVEL_IDS');
mkdirSync('docs/levels', { recursive: true });
for (const n of [...ship, ...wip]) {
  const isWip = wip.includes(n);
  const out = execFileSync(process.execPath, ['src/build-iray.mjs'], {
    env: { ...process.env, CHAIN: (isWip ? [...ship, n] : ship).join(','), LVL: String(n),
           LEVELSHEET: '1', WIP: isWip ? '1' : '0' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  writeFileSync(`docs/levels/LEVEL${n}.txt`, out);
  console.log(`docs/levels/LEVEL${n}.txt${isWip ? '  (work in progress)' : ''}`);
}
