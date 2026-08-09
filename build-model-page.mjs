// Refresh the model payload inside iray-model.html.
//
//   MODELJSON=1 node build-iray.mjs && node build-model-page.mjs
//
// The page is self-contained -- the Artifact CSP blocks every external fetch, so the map, the
// run ids and both code tables are inlined rather than loaded. That makes the page a COPY of
// build state, and a copy with no refresh step is a copy that goes stale silently: edit the
// map or requantise the steps and the page keeps confidently drawing the old world.
//
// It rewrites only the JSON in the payload <script>, so the page's own markup is edited by
// hand as normal and never regenerated from a template that would drift the other way.
import { readFileSync, writeFileSync } from 'fs';

const PAGE = './iray-model.html';
const OPEN = '<script id="model" type="application/json">';
const CLOSE = '</script>';

const model = readFileSync('./model.json', 'utf8');
if (model.includes(CLOSE)) throw new Error('model.json contains a closing script tag');

const page = readFileSync(PAGE, 'utf8');
const a = page.indexOf(OPEN);
if (a < 0) throw new Error(`no payload script in ${PAGE}`);
const b = page.indexOf(CLOSE, a + OPEN.length);
if (b < 0) throw new Error('payload script is not closed');

const before = page.slice(a + OPEN.length, b);
const out = page.slice(0, a + OPEN.length) + model + page.slice(b);
writeFileSync(PAGE, out);

const m = JSON.parse(model);
console.log(`${PAGE}: model payload ${before.length} -> ${model.length} bytes` +
  `${before === model ? '  (unchanged)' : '  (UPDATED)'}`);
console.log(`  ${m.cellCodes} cell codes, ${m.map.filter(v => !v).length} open map cells, ` +
  `${m.codePat.filter(Boolean).length} patterns`);
console.log(`  page is now ${out.length} bytes; republish it to update the artifact.`);
