# How a frame is drawn, and what it costs

The engine's output is not pixels. It is **1,000 bytes: which of 256 glyphs goes in each
character cell** of a 40 x 25 screen. The glyph *is* the pixels -- multicolor character mode
gives a 4-wide x 8-tall cell, so the screen is 160 x 200 logical pixels with no bitmap. The
image is mirrored about the horizon, so the renderer decides the top 13 rows -- 520 cells --
and stores each once for its row and once for its mirror.

## One column, top to bottom

Take one screen column (4 logical pixels wide; 40 of them). Walking down it there is sky, the
wall's top edge, then solid wall to the horizon:

    rows 0 .. rb-1     SKY     glyph 0, all identical
    rows rb .. rs-1    EDGE    the wall top passes through these cells
    rows rs .. 12      WALL    glyph 1, all identical

`rb` and `rs` are char rows, computed from the column's four wall heights (`colH[4c..4c+3]`,
which `interpSpan` filled): `rb` from the max height, `rs` from the min.

**Sky and wall runs are cheap.** Same byte N times, through an unrolled store chain (~5 cycles a
cell), and a per-column, per-buffer *run cache* skips the chain entirely when `rb`/`rs` have not
changed since this buffer was last drawn. They are quantised to 8-pixel rows and a frame of
motion moves a wall top ~2 pixels, so under real movement **69% of columns hit the cache**.
That quantisation is also why a *seam* cannot use the cache: a seam sits at 2-pixel precision,
finer than a frame of motion, so its key never repeats (measured: 25 draws of 80 with the key
extended, 25 without -- not one extra hit).

**Edge cells are the expensive kind.** In an edge cell the wall top crosses somewhere inside
the 4 x 8 pixels, at some slope. The renderer has to pick, from ~200 wall-top glyphs, the one
whose shape fits. Per cell that is: the row's window offset `kTab[row] = 8*row - 92`; the outer
two heights `w0 = clamp(colH[4c] + k)`, `w3 = clamp(colH[4c+3] + k)` (clamped into the cell's
0..8, with a cap at 101 first so the sum fits a byte); the index `w0*16 + w3` into a 256-entry
table; and then the *ninth bit*. ~100-130 cycles, then ~30 to store it and its mirror through a
jump-through-table stub.

### Why four heights and not two

Two heights define the line, and the index uses two. The other two exist because the charset has
~200 slots for wall-top shapes and a k-medians fit over a 2M-position scan chose which to keep;
for some `(w0, w3)` buckets the best line through the cell bulges one way or the other depending
on the inner columns, so those buckets got a **second codeword** and a threshold on `w1 + w2`
picks between them. The code reads the threshold FIRST and skips the inner loads when it is zero
-- **44% of slots have no second codeword**. So a straight edge mostly IS two heights; the
four-height path is the correction for buckets one shape could not serve. Fewer heights would
cost edge accuracy, not cycles.

### Ramps and steps are different paths

A **ramp** is a single face's top crossing the cell: the inlined path above. A **step** is a
face boundary INSIDE the cell (position 1..3, read from `cstepT`, written by the subdivision) --
a genuinely vertical edge. The step path samples an extra column at the boundary so the plateau
slopes instead of capping flat, and goes through a subroutine; only ~2.7 cells a frame take it.

## Where the edge cells actually are

A column has as many edge cells as **char rows the wall top passes through in it**. For a smooth
wall top that is exactly one, and that is the ordinary case: measured from the middle of level
1's room facing a stepped wall, the per-column count is

    1 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 2 1  = 42

**One edge cell per column, forty columns, plus one extra at each of two face boundaries.** At a
boundary the wall top jumps -- a near face ending, a far one beginning -- and the cell column
spanning the jump has an edge cell for every char row the jump crosses. At that view the two
jumps were ~10 rows, so one extra cell each. Only right up against a step corner does a jump
run 30-60 rows and stack 4-8 edge cells in one column, and that is a few frames of a walk.

So **the edge cost of a view is ~40 cells wherever there is a wall top on screen**, ~130 cycles
each, ~5,200 cycles -- and it barely varies with the geometry. What DOES vary with the number
of faces is everything priced per face or per boundary: the rays that find the boundaries, the
spans `interpSpan` fills and `seamSpan` walks, the seams drawn, the run-cache misses where the
top moves. Level 1's room shows 7-10 faces where a corridor shows 2-4.

### Stacks are real, close to a corner

Pressed near a step corner -- X1EF Y1AC A13 -- column 14 has `colH = 83 82 82 17`, a 66-row
jump, and **nine edge cells stacked in rows 2..10**. The emitted codes down that column are

    0 0 185 4 4 4 4 4 4 4 41 229 229

Row 2 is the near wall's top with the vertical edge under it (`..../..../##../###.`), rows 3..9
are the pure split `###.` (code 4), row 10 is where the far top lands. The renderer was already
choosing these correctly -- the step path re-selects per row -- but at ~200 cycles a row for an
answer that, between the two tops, cannot be anything but the split at the boundary column.
`VSPLIT` (renderSym, `vsPrep`/`vsChk`) emits those middle rows directly: which side is near from
the two heights, the far top's row from `rbT`, the code from a six-entry table looked up in the
charset at build time. Exact -- pixel-identical on eight pinned views -- and worth ~1,700 cycles
a frame at that pose, ~0 on the benchmark route (which rarely hugs a corner). It only prepares
when the band is at least three rows deep; on every step cell it cost more than it saved.

How this was got wrong twice first, for the record. (1) `edgN/edcN = 40/5` was read from ONE
mid-tour frame as "8 cells per jump column, everywhere" -- a `colH` dump from the room's middle
shows one cell per column and no stacks at all. (2) A fast path that repeated the code ABOVE was
built on that reading; it fired on zero cells from the middle of the room, and at the corner it
would have been WRONG, stamping the top cell's glyph (with two rows of sky) down the whole stack.
A screen dump taken from a build that still contained it was then misread as the shipping
renderer's output. **Dump `colH` and the screen bytes at the pose in question, from a clean
build, before theorising** -- both are one tools/probe.mjs call (`@e000:1000`).

## The frame, by share (benchmark route, level 1, no objects, 2026-09-15)

    renderSym                  34.5%   the above; edge selection ~23% of it, chains ~53%
    the ray x ~10 per frame    19.4%   angle dispatch, side distances, DDA, hit
    interpSpan                 12.5%   Bresenham colH across each span, 27 cycles a column
    seamSpan                   11.8%   reject, calcU both ends, walk boundaries, seamOne each
    span glue + stack + sort    7.3%
    entities                    4.7%
    pivOne                      3.4%
    input + clears + HUD        5.1%

Measured with the since-retired `bench.sh` walkthrough; `node tools/fpsr.mjs "" suite` is the current per-level benchmark.
