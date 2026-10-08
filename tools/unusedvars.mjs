// unusedvars.mjs -- variable equates and storage labels in build-iray.mjs that nothing names.
// A name counts as used if it appears ANYWHERE else in the build script or compact.mjs (any flag's
// code, any comment-free expression) -- the safe direction: only names with a single mention, the
// definition itself, are reported. Prints "line name kind".
import { readFileSync } from 'fs';
const src = readFileSync(new URL('../src/build-iray.mjs', import.meta.url), 'utf8');
const other = readFileSync(new URL('../src/compact.mjs', import.meta.url), 'utf8');
const lines = src.split('\n');
// strip ;-comments and //-comments so a mention in prose does not count as a use
const code = s => s.replace(/;.*$/gm, '').replace(/\/\/.*$/gm, '');
const body = code(src) + '\n' + code(other);
const defs = [];
lines.forEach((l, i) => {
  let m = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\$[0-9a-fA-F]+\b/.exec(l);
  if (m) defs.push([i + 1, m[1], 'equate']);
  m = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*!(byte|fill|word)\b/.exec(l);
  if (m) defs.push([i + 1, m[1], 'storage']);
});
for (const [ln, n, k] of defs) {
  const c = (body.match(new RegExp(`(?<![A-Za-z0-9_])${n}(?![A-Za-z0-9_])`, 'g')) || []).length;
  if (c <= 1) console.log(ln, n, k);
}
