// note-font.mjs -- the ending's note, drawn at build time in a small proportional pixel face.
//
// THE FACE is the user's own, from GMC64's scene-maker (its 'sm' font, SM_GLYPHS in scene-maker.html,
// copied verbatim 2026-11-18): 5 pixels tall, capitals, each glyph its own width. GMC64 draws it in
// multicolor's double-wide pixels; here it is 1 HI-RES pixel per dot, half that width. The user chose
// that over 2x2 by eye in VICE's CRT emulation, PAL and NTSC ("like someone whispering you a secret";
// the 2x2 read "like a large-type book"), in grey 3.
//
// renderNote(lines) -> { chars, screen }: the 320x200 picture cut into 8x8 cells, as a charset
// (code 0 is the blank cell) and a 40x25 screen of codes. Rows are '#'/'.' joined by '/'.
const GLYPHS = {
  'A': ".#./#.#/###/#.#/#.#", 'B': "##./#.#/##./#.#/##.", 'C': ".#/#./#./#./.#",
  'D': "##./#.#/#.#/#.#/##.", 'E': "##/#./##/#./##", 'F': "##/#./##/#./#.",
  'G': ".##/#../#.#/#.#/.##", 'H': "#.#/#.#/###/#.#/#.#", 'I': "#/#/#/#/#",
  'J': ".#/.#/.#/.#/#.", 'K': "#.#/##./##./#.#/#.#", 'L': "#./#./#./#./##",
  'M': "#...#/##.##/#.#.#/#...#/#...#", 'N': "#..#/##.#/#.##/#..#/#..#",
  'O': ".#./#.#/#.#/#.#/.#.", 'P': "##./#.#/###/#../#..", 'Q': ".#./#.#/#.#/#.#/.##",
  'R': "##./#.#/##./##./#.#", 'S': ".##/#../.#./..#/##.", 'T': "###/.#./.#./.#./.#.",
  'U': "#.#/#.#/#.#/#.#/###", 'V': "#.#/#.#/#.#/#.#/.#.", 'W': "#...#/#...#/#.#.#/#.#.#/##.##",
  'X': "#.#/#.#/.#./#.#/#.#", 'Y': "#.#/#.#/.#./.#./.#.", 'Z': "###/..#/.#./#../###",
  '0': "###/#.#/#.#/#.#/###", '1': "#/#/#/#/#", '2': "##/.#/##/#./##", '3': "##/.#/##/.#/##",
  '4': "#.#/#.#/###/..#/..#", '5': "##/#./##/.#/##", '6': "###/#../###/#.#/###",
  '7': "##/.#/.#/.#/.#", '8': "###/#.#/###/#.#/###", '9': "###/#.#/###/..#/###",
  '-': "../../##/../..", '.': "././././#", ',': "./././#/#", '!': "#/#/#/./#",
  '?': "###/..#/.##/.../.#.", ':': "./#/./#/.", "'": "#/#/././.", '/': ".#/.#/##/#./#.",
  '[': "##/#./#./#./##", ']': "##/.#/.#/.#/##", '+': ".../.#./###/.#./...",
  '*': "#.#/.#./#.#/.../...", '(': ".#/#./#./#./.#", ')': "#./.#/.#/.#/#.",
  '<': "../.#/#./.#/..", '>': "../#./.#/#./..", '|': "#/#/#/#/#", '=': "../##/../##/..",
  '_': ".../.../.../.../###", '^': ".../.#./#.#/.../..."
};
const SPACE = 3, GAP = 1, LINE = 8;              // a space's advance, letter spacing, line pitch (GMC64's)

const glyph = c => { const g = GLYPHS[c]; if (!g) throw new Error(`the note font has no '${c}'`); return g.split('/'); };
const advance = c => c === ' ' ? SPACE : glyph(c)[0].length + GAP;
export const lineWidth = s => [...s].reduce((w, c) => w + advance(c), 0) - GAP;

// lines: the text, one string per 8-pixel line ('' = a blank line), in capitals. Each line is
// centred across the screen, the block centred down it.
export function renderNote(lines) {
  const W = 320, H = 200, px = new Uint8Array(W * H);
  const top = Math.round((H - lines.length * LINE) / 2);
  lines.forEach((ln, i) => {
    const w = lineWidth(ln);
    if (w > W) throw new Error(`the note: '${ln}' is ${w} pixels, wider than the screen`);
    let x = Math.round((W - w) / 2);
    for (const c of ln) {
      if (c !== ' ') glyph(c).forEach((row, y) => [...row].forEach((p, k) => { if (p === '#') px[(top + i * LINE + y) * W + x + k] = 1; }));
      x += advance(c);
    }
  });
  const codes = new Map([['0'.repeat(16), 0]]), chars = [0, 0, 0, 0, 0, 0, 0, 0], screen = [];
  for (let cy = 0; cy < 25; cy++) for (let cx = 0; cx < 40; cx++) {
    const cell = [];
    for (let y = 0; y < 8; y++) { let b = 0; for (let x = 0; x < 8; x++) b = b << 1 | px[(cy * 8 + y) * W + cx * 8 + x]; cell.push(b); }
    const key = cell.map(b => b.toString(16).padStart(2, '0')).join('');
    if (!codes.has(key)) { codes.set(key, codes.size); chars.push(...cell); }
    screen.push(codes.get(key));
  }
  if (codes.size > 256) throw new Error(`the note needs ${codes.size} cells; a charset holds 256`);
  return { chars, screen };
}
