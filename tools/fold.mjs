// fold.mjs -- retire build flags from build-iray.mjs by constant-folding them away.
//
//   node tools/fold.mjs build-iray.mjs --env A,B,C [--force X=false,LATE=[]]
//        [--after 'MARKER' --afterforce Y=true] [--dead] [--checkeach] [--dry]
//
//   --env       env flags to treat as UNSET (process.env.A / flag('A')). An on-by-default switch
//               (`process.env.A !== '0'`) therefore folds ON; an opt-in folds OFF.
//   --force     consts to treat as these values (JSON; `[]` = an array that is always empty).
//   --after/--afterforce  the same, but only for identifiers past the first MARKER in the source
//               (used for "true once past the LVLDUMP exit").
//   --dead      then remove top-level functions / pure consts nothing references, to a fixpoint.
//   --checkeach re-parse after every edit and stop at the first one that breaks the source.
//   --dry       report only.
//
// Consts whose initialiser folds to a literal (declared exactly once) are propagated and their
// declarations removed. Surviving source text is spliced VERBATIM, so nothing it keeps is
// reformatted. It then lists every remaining mention (comments included) for hand cleanup.
// Install once: (cd tools && npm install). Then ALWAYS run tools/ship.sh before and after.
//
// Traps it has hit, all fixed, all worth remembering when extending it:
//  - `x || 'lit'` is NOT `true`: folding an unknown left side is only valid for a boolean result.
//  - object shorthand `{ quad }` needs `quad: value`, not `value`.
//  - never infer an array EMPTY from `const q = []` -- it may be pushed to later. Only --force.
//  - `else if (false) ...` must leave `{}` behind, or the `else` dangles.
//  - deleting an unused VARIABLE EQUATE changes the binary: compact.mjs packs every declared
//    variable. That is a separate, non-identical step (verify by pixels), not a fold.
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { readFileSync, writeFileSync } from 'fs';

const EMPTY = Symbol('empty array');
const args = process.argv.slice(2);
const file = args[0];
const opt = k => { const i = args.indexOf(k); return i < 0 ? '' : args[i + 1]; };
const ENV = new Set(opt('--env').split(',').filter(Boolean));
const FORCE = new Map(opt('--force').split(',').filter(Boolean).map(s => { const [k, v] = s.split('='); const j = JSON.parse(v); return [k, Array.isArray(j) && !j.length ? EMPTY : j]; }));
const DRY = args.includes('--dry');
// --after 'MARKER' --afterforce A=true,B=true : identifiers A, B count as those values only AFTER the
// first occurrence of MARKER in the source (re-found every pass, since edits move it)
const AFTER = opt('--after');
const AFTERF = new Map(opt('--afterforce').split(',').filter(Boolean).map(s => { const [k, v] = s.split('='); return [k, JSON.parse(v)]; }));
let afterPos = Infinity;
let src = readFileSync(file, 'utf8');
const UNK = Symbol('unknown');
const log = [];

function parse(s) { return acorn.parse(s, { ecmaVersion: 'latest', sourceType: 'module', ranges: true }); }

for (let pass = 0; pass < 60; pass++) {
  afterPos = AFTER ? src.indexOf(AFTER) : Infinity; if (AFTER && afterPos < 0) throw new Error('marker gone');
  const ast = parse(src);
  // declaration counts, to refuse to propagate shadowed names
  const declCount = new Map();
  walk.full(ast, n => {
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') declCount.set(n.id.name, (declCount.get(n.id.name) ?? 0) + 1);
    if ((n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression'))
      for (const p of n.params) if (p.type === 'Identifier') declCount.set(p.name, (declCount.get(p.name) ?? 0) + 1);
  });
  const known = new Map(FORCE);
  // const NAME = <foldable>  -> known (top-level only, declared once)
  const constDecls = [];
  walk.full(ast, st => {
    if (st.type === 'VariableDeclaration' && st.kind === 'const') for (const d of st.declarations) {
      if (d.id.type !== 'Identifier' || declCount.get(d.id.name) !== 1 || !d.init) continue;
      constDecls.push({ st, d });
    }
  });
  // a for(const x of ...) head is not a removable statement
  const forHeads = new Set(); walk.full(ast, n => { if (/^For(In|Of)?Statement$/.test(n.type)) { if (n.left) forHeads.add(n.left); if (n.init) forHeads.add(n.init); } });
  for (let i = constDecls.length - 1; i >= 0; i--) if (forHeads.has(constDecls[i].st)) constDecls.splice(i, 1);
  // evaluate with the current known map (iterate since consts reference each other in order)
  const isEnv = n => n.type === 'MemberExpression' && !n.computed && n.property.type === 'Identifier' &&
    n.object.type === 'MemberExpression' && !n.object.computed && n.object.object.type === 'Identifier' &&
    n.object.object.name === 'process' && n.object.property.name === 'env' && ENV.has(n.property.name);
  const isFlagCall = n => n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'flag' &&
    n.arguments.length === 1 && n.arguments[0].type === 'Literal' && ENV.has(n.arguments[0].value);
  function ev(n) {
    switch (n.type) {
      case 'Literal': return (n.regex ? UNK : n.value);
      case 'Identifier': if (n.name === 'undefined') return undefined; if (AFTERF.has(n.name) && n.start > afterPos) return AFTERF.get(n.name); return known.has(n.name) ? known.get(n.name) : UNK;
      case 'MemberExpression': {
        if (isEnv(n)) return undefined;
        if (!n.computed && n.property.name === 'length' && ev(n.object) === EMPTY) return 0;
        return UNK;
      }
      case 'CallExpression': {
        if (isFlagCall(n)) return false;
        const c = n.callee;
        if (c.type === 'MemberExpression' && !c.computed && ev(c.object) === EMPTY) {
          const m = c.property.name;
          if (m === 'includes' || m === 'some') return false;
          if (m === 'every') return true;
          if (m === 'join') return '';
          if (['map', 'filter', 'flatMap', 'slice', 'flat'].includes(m)) return EMPTY;
        }
        return UNK;
      }
      case 'ArrayExpression': return n.elements.length === 0 ? EMPTY : UNK;
      case 'ParenthesizedExpression': return ev(n.expression);
      case 'UnaryExpression': { if (n.operator !== '!') return UNK; const v = ev(n.argument); return v === UNK ? UNK : !v; }
      case 'BinaryExpression': {
        const a = ev(n.left), b = ev(n.right); if (a === UNK || b === UNK) return UNK;
        if (a === EMPTY || b === EMPTY) return UNK;
        switch (n.operator) { case '===': return a === b; case '!==': return a !== b; case '==': return a == b; case '!=': return a != b;
          case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b; default: return UNK; }
      }
      case 'LogicalExpression': {
        const a = ev(n.left);
        if (n.operator === '&&') { if (a === UNK) { const b = ev(n.right); return (b === false && pure(n.left)) ? false : UNK; } return a ? ev(n.right) : a; }
        if (n.operator === '||') { if (a === UNK) { const b = ev(n.right); return (b === true && pure(n.left)) ? true : UNK; } return a ? a : ev(n.right); }
        if (n.operator === '??') { if (a === UNK) return UNK; return (a === undefined || a === null) ? ev(n.right) : a; }
        return UNK;
      }
      case 'ConditionalExpression': { const c = ev(n.test); if (c === UNK) return UNK; return c ? ev(n.consequent) : ev(n.alternate); }
      case 'TemplateLiteral': return (n.expressions.length === 0) ? n.quasis[0].value.cooked : UNK;
      default: return UNK;
    }
  }
  function pure(n) {
    let ok = true;
    walk.full(n, m => { if (/Call|New|Assign|Update|Function|Arrow|Await|Yield/.test(m.type)) ok = false; });
    return ok;
  }
  for (const { d } of constDecls) { if (known.has(d.id.name)) continue; const v = ev(d.init); if (v !== UNK && (typeof v === 'boolean' || v === undefined || v === null)) known.set(d.id.name, v); /* never EMPTY: a const array can still be pushed to -- only --force says one is empty */ }
  // collect edits: outermost foldable nodes
  const edits = [];
  const take = (n, text, why) => edits.push({ s: n.start, e: n.end, text, why });
  const lit = v => v === undefined ? 'undefined' : v === EMPTY ? '[]' : JSON.stringify(v);
  const srcOf = n => src.slice(n.start, n.end);
  // the replacement text for a node whose value/branch is decided
  function decide(n) {
    if (n.type === 'ConditionalExpression') { const c = ev(n.test); if (c === UNK) return null; return srcOf(c ? n.consequent : n.alternate); }
    if (n.type === 'LogicalExpression') {
      const a = ev(n.left);
      if (n.operator === '&&') { if (a === UNK) { const b = ev(n.right); return (b === false && pure(n.left)) ? 'false' : null; } return a ? srcOf(n.right) : lit(a); }
      if (n.operator === '||') { if (a === UNK) { const b = ev(n.right); return (b === true && pure(n.left)) ? 'true' : null; } return a ? lit(a) : srcOf(n.right); }
      if (n.operator === '??') { if (a === UNK) return null; return (a === undefined || a === null) ? srcOf(n.right) : lit(a); }
    }
    if (n.type === 'UnaryExpression' && n.operator === '!') { const v = ev(n); return v === UNK ? null : lit(v); }
    if (n.type === 'BinaryExpression') { const v = ev(n); return v === UNK ? null : lit(v); }
    if (n.type === 'Identifier' && AFTERF.has(n.name) && n.start > afterPos) return lit(AFTERF.get(n.name));
    if (n.type === 'Identifier' && known.has(n.name)) return lit(known.get(n.name));
    if (n.type === 'MemberExpression') { const v = ev(n); return v === UNK ? null : lit(v); }
    if (n.type === 'CallExpression') { const v = ev(n); return v === UNK ? null : lit(v); }
    return null;
  }
  // walk with ancestors so we only take outermost; skip declarations of known consts' ids
  const covered = [];
  const inside = (s, e) => covered.some(c => s >= c.s && e <= c.e);
  // 1) statements: if (known) ..., and const decls of known names
  walk.ancestor(ast, {
    IfStatement(n) {
      if (inside(n.start, n.end)) return;
      const c = ev(n.test); if (c === UNK) return;
      const br = c ? n.consequent : n.alternate;
      let text = '';
      if (br) text = br.type === 'BlockStatement' ? src.slice(br.start + 1, br.end - 1) : srcOf(br);
      if (text.trim() === '' && /\belse\s*$/.test(src.slice(Math.max(0, n.start - 20), n.start))) text = '{}';
      take(n, text, 'if'); covered.push({ s: n.start, e: n.end });
    },
  });
  for (const { st, d } of constDecls) {
    if (!known.has(d.id.name) || inside(st.start, st.end)) continue;
    if (st.declarations.length === 1) {
      // remove the whole line (and its trailing comment on the same line)
      let s = st.start, e = st.end;
      while (s > 0 && src[s - 1] !== '\n' && /[ \t]/.test(src[s - 1])) s--;
      let e2 = src.indexOf('\n', e); if (e2 < 0) e2 = src.length;
      const tail = src.slice(e, e2);
      if (/^\s*(\/\/.*)?$/.test(tail)) e = e2 + 1;
      edits.push({ s, e, text: '', why: 'decl ' + d.id.name }); covered.push({ s, e });
    } else { log.push('MULTI-DECL ' + d.id.name); }
  }
  // 2) expressions
  const shorthand = new Set(); walk.full(ast, n => { if (n.type === 'Property' && n.shorthand) shorthand.add(n.value); });
  walk.full(ast, n => {
    if (inside(n.start, n.end)) return;
    if (!['ConditionalExpression', 'LogicalExpression', 'UnaryExpression', 'BinaryExpression', 'Identifier', 'MemberExpression', 'CallExpression'].includes(n.type)) return;
    const t = decide(n); if (t == null) return;
    // an identifier that IS a declaration id / property key is not a reference
    if (n.type === 'Identifier') {
      const before = src.slice(Math.max(0, n.start - 1), n.start);
      if (before === '.') return;
      const after = src.slice(n.end).match(/^\s*:/) && src.slice(0, n.start).match(/[{,]\s*$/);
      if (after) return;
    }
    edits.push({ s: n.start, e: n.end, text: shorthand.has(n) ? `${n.name}: ${t}` : t, why: n.type }); covered.push({ s: n.start, e: n.end });
  });
  // 3) template-literal cleanup: ${''} / ${``} vanish; ${`text`} and ${'text'} inline
  walk.full(ast, n => {
    if (n.type !== 'TemplateLiteral') return;
    n.expressions.forEach((x, i) => {
      if (inside(x.start, x.end)) return;
      const open = src.lastIndexOf('${', x.start), close = src.indexOf('}', x.end);
      if (src.slice(open + 2, x.start).trim() !== '' || src.slice(x.end, close).trim() !== '') return;
      let text = null;
      if (x.type === 'TemplateLiteral') text = src.slice(x.start + 1, x.end - 1);
      else if (x.type === 'Literal' && typeof x.value === 'string') {
        const raw = src.slice(x.start + 1, x.end - 1);
        if (!/[`\\]|\$\{/.test(raw.replace(/\\n/g, ''))) text = raw;
      }
      if (text == null) return;
      edits.push({ s: open, e: close + 1, text, why: 'tpl' }); covered.push({ s: open, e: close + 1 });
    });
  });
  if (!edits.length) break;
  edits.sort((a, b) => b.s - a.s);
  // drop overlaps (keep the outer/earlier-collected one)
  let last = Infinity; const kept = [];
  for (const ed of edits) { if (ed.e <= last) { kept.push(ed); last = ed.s; } }
  for (const ed of kept) {
    const before = src;
    src = src.slice(0, ed.s) + ed.text + src.slice(ed.e);
    if (args.includes('--checkeach')) try { parse(src); } catch (e) {
      console.log('EDIT BROKE PARSE:', ed.why, JSON.stringify(before.slice(ed.s, ed.e).slice(0, 200)), '->', JSON.stringify(ed.text.slice(0, 200)));
      console.log('context:', JSON.stringify(before.slice(Math.max(0, ed.s - 150), ed.e + 80)));
      process.exit(1);
    }
  }
  log.push(`pass ${pass}: ${kept.length} edits`);
}
// dead declarations: top-level functions / pure consts nothing references
if (args.includes('--dead')) for (let pass = 0; pass < 40; pass++) {
  const ast = parse(src);
  const refs = new Map();
  const declIds = new Set();
  walk.full(ast, n => {
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') declIds.add(n.id);
    if (n.type === 'FunctionDeclaration' && n.id) declIds.add(n.id);
  });
  walk.full(ast, n => { if (n.type === 'Identifier' && !declIds.has(n)) refs.set(n.name, (refs.get(n.name) ?? 0) + 1); });
  const exported = new Set(); for (const st of ast.body) if (/^Export/.test(st.type)) walk.full(st, n => { if (n.type === 'Identifier') exported.add(n.name); });
  const pureInit = e => { if (!e) return true; if (/Function|Arrow/.test(e.type)) return true; let ok = true; walk.full(e, m => { if (/Call|New|Assign|Update|Await|Yield/.test(m.type)) ok = false; }); return ok; };
  const dead = [];
  for (const st of ast.body) {
    let name = null, pureOk = false;
    if (st.type === 'FunctionDeclaration') { name = st.id.name; pureOk = true; }
    else if (st.type === 'VariableDeclaration' && st.declarations.length === 1 && st.declarations[0].id.type === 'Identifier') { name = st.declarations[0].id.name; pureOk = pureInit(st.declarations[0].init); }
    if (!name || (refs.get(name) ?? 0) > 0 || exported.has(name)) continue;
    if (!pureOk) { if (pass === 0) log.push('UNUSED (impure init, kept): ' + name + ' line ' + (src.slice(0, st.start).split('\n').length)); continue; }
    // the statement's lines, plus the contiguous // comment block directly above it
    let s = src.lastIndexOf('\n', st.start - 1) + 1, e = src.indexOf('\n', st.end); if (e < 0) e = src.length; else e++;
    for (;;) { const p = src.lastIndexOf('\n', s - 2) + 1; if (s > 0 && /^\s*\/\//.test(src.slice(p, s - 1))) s = p; else break; }
    dead.push({ s, e, name });
  }
  if (!dead.length) break;
  dead.sort((a, b) => b.s - a.s);
  for (const d of dead) src = src.slice(0, d.s) + src.slice(d.e);
  log.push('dead pass ' + pass + ': ' + dead.map(d => d.name).join(' '));
}
// leftovers
const left = [];
const lines = src.split('\n');
const names = [...ENV, ...FORCE.keys()];
lines.forEach((l, i) => { for (const n of names) if (new RegExp(`\\b${n}\\b`).test(l)) left.push(`${i + 1}: [${n}] ${l.trim().slice(0, 120)}`); });
console.log(log.join('\n'));
console.log(`leftover mentions: ${left.length}`); console.log(left.slice(0, 80).join('\n'));
if (!DRY) writeFileSync(file, src);
