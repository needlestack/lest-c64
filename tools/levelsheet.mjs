#!/usr/bin/env node
// levelsheet.mjs -- write every level as a LEVEL SHEET: docs/levels/LEVELn.txt
//
//   node tools/levelsheet.mjs
//
// The language is docs/levels/KEY.txt. Each sheet is printed by the build itself (LEVELSHEET=1),
// from the data the game is built from, so re-running this after any level change brings every
// sheet up to date and a sheet can never disagree with the game. Each level is built against the
// whole game (every disk carries every level), so its exits show where they really lead.
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { ROOT } from '../src/paths.mjs';
process.chdir(ROOT);

const src = readFileSync('src/build-iray.mjs', 'utf8');
const ship = JSON.parse(/const SHIP_LEVEL_IDS = (\[[\d, ]*\]);/.exec(src)[1]);
mkdirSync('docs/levels', { recursive: true });
for (const n of ship) {
  const out = execFileSync(process.execPath, ['src/build-iray.mjs'], {
    env: { ...process.env, LVL: String(n), LEVELSHEET: '1' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  writeFileSync(`docs/levels/LEVEL${n}.txt`, out);
  console.log(`docs/levels/LEVEL${n}.txt`);
}
