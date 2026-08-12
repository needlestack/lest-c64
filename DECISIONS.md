# iray renderer — session decisions, 2026-08-09/10 (branch `walls-only`)

Each entry: what we chose, **why**, and what it measured. Ordered by how much it mattered.

## The metric everything is judged by

`accuracy = 100 - 100*(P + C)/2` where `P = wrongPx/(32*cells)`, `C = wrongCols/(4*cells)`.
Pixels say how far the silhouette is displaced, columns how widely; 8px across 8 columns is far
more visible than 8 stacked in one, so both are needed. **An index, not a physical quantity.**

Two SCOPES, never to be mixed:
- **cell accuracy** — only the cell approximation (what the charset/index control).
- **frame accuracy** — whole frame vs true geometry (`verify-render`), including ray
  quantisation and the interpolator. Most of a frame's wrong pixels were never the charset's.

Keeping these separate is what revealed that a predicted 27% cell gain moved the six views only
4.6%. Collapsing them into one number would have made the model look like it was lying.

**Caveat the user raised and it stands: measurable is not noticeable.** Inaccurate ramps are far
less visible than inaccurate steps; a glitchy wall edge stands out ~100x more than a ramp off by
a pixel. L1 scores "smeared corner" and "1px slope error" identically. Prefer schemes that
*cannot* produce the visible class, even at slightly worse aggregate error.

## 1. Ray angle: 2 fractional bits (FINEANG) — ADOPTED, biggest win

`rayOffT` was a BYTE: FOV 47 units over 160 columns = only **48 distinct ray directions**, so 3-5
adjacent columns marched the identical ray. A wall's far end could only sit on a run edge and
jumped a whole character (4 cols = 8px) instead of scrolling.

Fixed by putting the DDA deltas on a quarter-angle (1024-entry) table. Now 160/160 distinct.

  six views 1474 -> 1079 (-27%), fps 21.44 -> 21.70 (no cost)

**Why it is free:** only **13.2 of 160 columns are marched** per frame; 92% is interpolated. Check
that number before pricing ANY castRay change.

Only ddx/ddy grow. posXT/posYT flip at 0/64/128/192 = multiples of 4 in quarter units, so they
stay exact on the integer angle; absSin/absCos only feed seams (already +-1-2 cols).
4-way page dispatch on the quarter (~8 cyc), not self-modifying operands (~40).
Per-column offset is a SIGNED quarter-unit byte, so the whole FOV fits one 160-byte table.

## 2. We are ADDRESS limited, not shape limited — the reframing

Charset is 256/256 full, but giving all 561 reachable buckets their own code buys **0.08 points**.
The `rampT` index is ONE BYTE — two of the cell's four columns at 16 levels. The middle two
columns are not in the index at all, so `[6,5,5,4]` and `[6,7,7,4]` compute the same address.
Not "too few patterns" but "cannot tell these cells apart".

  SHIPPED                     94.784%   191 codes
  FLOOR (one code/bucket)     95.738%   561 codes
  PLAN=1 (k-medians, 232)     95.658%   232 codes   <- within 0.08 of the floor
  finer index, 232 codes      97.555%   232 codes
  PLAN=2 (colour RAM pairs)   97.933%   232 = 464 glyphs
  finer index, unlimited      98.021%

**80% of the gain is the INDEX, 19% the extra glyphs.** So the colour-RAM trick buys mostly the
smaller half and pays a nesting constraint for it. **Finer index chosen; colour RAM dropped.**

## 3. Charset by frequency-weighted k-medians (PLAN=1/3) — ADOPTED

Replaced the greedy pairwise merge, which folded a rare shape into whichever L1==1 NEIGHBOUR was
more common — so five shapes collapsing to one landed on the most popular member, not the one
closest to all five, and the result depended on which fold ran first.

k-medians is right here because the codeword is any [a,b,c,d] in 0..8 (the centre may sit BETWEEN
members), and under L1 the optimal centre is the per-column WEIGHTED MEDIAN — closed form. L2's
mean would be wrong: one outlier would drag the glyph.

Cluster BUCKETS, not shapes: the engine answers one pattern per table entry regardless.
SHARED codebook beats split budgets (234 shared = 8.948 vs 224 split 140:84 = 9.550) because a
ramp and a step of the same shape are the same glyph once occlusion is gone.

## 4. Occlusion/sprites removed (walls-only) — ADOPTED, then DELETED OUTRIGHT (2026-08-11)

The fg/bg split is INVISIBLE: bit pairs 01 and 11 are both black; only sprite priority tells them
apart. With no sprites every pixel goes foreground and 43 codes come back (256/256 -> 213/256).

First this was a `SPRITES=0` default with the code still present. On 2026-08-11 the user decided
to redo objects as a SECOND PASS over the finished wall image, so every trace was removed rather
than left gated — ~2,200 lines of build script and ~35KB of 6502 source, plus the per-cell
`cellFaceT` fill in the subdivision's hot path, 84 scratch equates, and `splitT`.

**The removal is provably behaviour-neutral: `latest.d64` is byte-identical before and after**
(md5 582eda6d…, 46,079 bytes). Everything deleted was already unreachable under `SPRITES=0`.

Do NOT reinstate the old scheme when objects come back. What it cost, for reference: 43 of 256
char codes, a per-frame `fgCell` clear, an `orbPaint` pass whose rules never fully settled, and
a permanent constraint that a ramp and a step of the same shape could not share a code.

## 5. Scheme A: step cells by FORMULA — VALIDATED, NOT YET SHIPPED

Ramp the NEAR wall between its two existing samples (qA at col 0, qM at col kb-1); draw the far
wall FLAT at qB. Build-time only — stepT keeps its size, index and lookups.

  free 4-level glyph (best possible table)  0.514 px/step-cell
  A  ramp near, flat far                    0.574   (+0.172 wrong px/FRAME, ~1.4% of total)
  B  flat near, ramp far                    0.718
  C  ramp both sides toward the centre       2.787

**Chosen despite being nominally worse** because it structurally CANNOT smear a corner — see the
measurable-vs-noticeable note above. Formula verified against data: reproduces the true median
exactly on every major hard-edge bucket (s0.243, s1.8, s2.8, s0.8).

The plateau variant (BOTH sides flat) was tested and rejected: 0.730 vs 0.514, and it re-creates
the horizontal-cap artefact the sloped scheme fixed years ago (1.573 -> 0.606 in the build log).

## 5b. Antialiasing the wall top — BUILT, LOOKED AT, REVERTED (2026-08-11)

Tried at the user's suggestion and reverted on their verdict: **"makes sharp aliased edges (a
'look') a bit fringe-y, which isn't really a look."** Reverted whole at 4930c94; `latest.d64`
came back byte-identical to the pre-AA build, so nothing needed re-verifying.

It was not rejected for cost. The mechanism was free and it worked as designed:
- The four bit pairs give four inks and one was spare — 01 and 11 are both black, left over from
  sprite priority needing them distinguishable to the VIC and identical to the eye. Repointing
  `$d022` to light grey gave white / light grey / dark grey / black for no codes, no memory and
  no cycles (20 fps with and without, same viewpoint).
- Sub-pixel precision does not exist at render time (one level = one pixel), so it was
  RECONSTRUCTED at build time by least-squares fitting a line through the four samples — legal
  because a wall top is linear across a face. Residual > 0.9 meant "not a line" and kept hard
  edges, which also left BLANK and SOLID byte-identical.
- 139 of 232 codebook patterns antialiased (60%), mean 3.3 grey pixels of 32.

**Do not re-propose it as a rendering improvement.** Two implementation notes worth keeping if it
is ever revisited for another reason:
- Use AREA coverage across the column's width, not a point sample per column. A slope of exactly
  one level per column puts every sample on a pixel edge, so every coverage lands on 0 or 1 and
  the steepest smooth ramp gets no antialiasing at all.
- The C64 greys are not evenly spaced. Luminance 255/187/95/0 means the inks represent coverage
  0, 0.27, 0.63, 1.0, so nearest-ink thresholds are 0.135 / 0.45 / 0.815, not even quarters.

The aesthetic point is the durable one: this renderer's hard black-on-white edges are a
deliberate look, and four inks are too few to soften them without reading as fringing.

## 6. Rejected, with reasons

- **Colour-RAM pattern pairing** — buys the smaller 19%, needs a write queue + post-flip flush,
  and PLAN=2 measured 20.34 fps against 21.44. The queue, not the index derivation, was the cost.
- **Plateau reconstruction** (flat both sides) — 42% worse; already rejected once historically.
- **Ramp both sides toward the centre sample** — 5.4x worse. The far wall's height at the
  boundary has nothing to do with the near wall's, so it fights the geometry.
- **Moving qM to the far side** — 40% worse; sacrifices the near wall's slope, which is the one
  visibly receding.

## Open

- `qM` is REDUNDANT when kb=1 (`w[kb-1]` == `w[0]` == qA), so the s0 bucket class has the worst
  cost/cell (0.812 vs 0.31-0.41) and worst spread (17 vs 6-10). Scheme A sidesteps it; a direct
  fix would be `qM = w[min(kb,2)]`, free.
- Ramp buckets r176/r11 are BIMODAL (sharp edges and slopes sharing one bucket, medianed to
  [8,5,0,0]). A median is meaningless for a bimodal cluster — charsetgen should refuse and split.
- FINEANG's tables now own what was the orb-table space outright ($8600+0x1300..0x2300). An
  object pass needs its own home; $e000-$ffff under KERNAL is the 8K to take (own vectors at
  $fffa/$fffc/$fffe — the engine currently uses the KERNAL $0314 indirect). VIC bank 0 has
  3,072 bytes free = 48 sprite slots, which the build reports every run.
- PLAN=3 + STEPA: the shipped tables are stepT{1,2,3}{lo,hi}, NOT stepT. Patching stepT under
  PLAN=3 changes nothing (byte-identical disk).

## Process lessons that cost real time

- **zsh does not word-split unquoted parameters.** `env $1` with `$1="A=1 B=2"` silently builds
  the wrong config. Cost THREE measurements this session; twice it produced plausible wrong
  numbers rather than an error. **Tell: identical output from two supposedly different configs.**
- **Never redirect a build's stderr in a step whose failure mode is "the old artefact is still
  there".** A broken default build looked like a successful no-op rebuild for several commits.
- **Probe state, do not re-derive it.** Four hypotheses about the wall-end bug died because the
  specification was right every time; `DUMPH` (which reads the engine's own colH) settled it in
  one run.
- **Aggregate per-shape stats hide per-occurrence truth.** cellscan scored one representative's
  (w,kb) for a whole shape class; the browser transcription disagreeing on totals while matching
  counts is what exposed it.

## Unfinished: widening the step slot past one byte

MEASURED and worth doing, NOT implemented. The step index is `slot = qA*(LM*LB) + qM*LB + qB`
with levels 7/4/9 = 252 states, deliberately just under 256 so it is one byte and one `lda
stepT1,y`.

Floor per step cell, re-bucketing the walkthrough offline:

  7 x 4 x 9   252  1 page   0.352   <- ships today, and it is the BEST one-byte balance
  9 x 4 x 7   252  1 page   0.365      the mirror: left/right are nearly symmetric after all
  6 x 7 x 6   252  1 page   0.388      symmetric-looking, worse -- the edges are worth more
  9 x 4 x 9   324  2 pages  0.274      both edges exact, qM untouched
  9 x 6 x 9   486  2 pages  0.228
  9 x 9 x 9   729  3 pages  0.154      all three exact

Every rebalance inside the byte LOSES. There is no free win; the only lever is spending more
than a byte. (This also retracts an earlier claim of mine that qM at 4 levels was "underweighted"
-- it is the optimum for a 256-state budget. qA is the starved axis: 7 -> 9 alone buys more than
anything done to qM.)

Cost is small: ~2.9 step cells a frame, so ~30 extra cycles per frame. 2-page and 3-page are
nearly the same work -- one branch vs a 3-way branch.

WHAT IS DONE: the byte guard is lifted, and the fold tables qmLoT / qaLoT / qaHiT exist, sized
so that `qM*LB + qB` can never carry (max LM*LB - 1 < 256), which is what keeps the whole sum to
a single 16-bit add.

WHAT IS NOT: the 6502 side. `rfStep` still folds `qA*8 + qM` through `qmT` into one byte, and
stepT1/2/3 are emitted one page each. Both must change together:
  1. `lda qIdxAT,x` stops pre-shifting; qA stays a raw index
  2. slot = `qmLoT[qM] + qB + qaLoT[qA]`, carry into `qaHiT[qA]` -> slotL / slotH
  3. dispatch on slotH inside the existing kpos dispatch (3 x SLOTPAGES load blocks)
  4. emit stepT1/2/3 page-aligned at SLOTN bytes each, and find them a home -- 9 pages for
     9x9x9, which collides with FINEANG at RELOC+0x1300 and PLAN=3 at RELOC+0x2900
Until then QLEVELS with a product over 256 throws a build error naming exactly this.

## 12. interpSpan run-fill — BUILT, MEASURED, REJECTED (2026-08-12)

Fill a span's interior as RUNS of constant `colH` instead of stepping a Bresenham per column.
Written, verified byte-identical on hardware, measured, and then **reverted**.

**It works and it is exact.** The shipped loop starts `err` at `dxv>>1` and per interior column
adds `dyv`, subtracting `dxv` and stepping `h` on overflow, i.e. `h_i = floor((e0 + i*dyv)/dxv)`.
The run lengths between the crossings are themselves a Bresenham line of slope `frac/dyv` where
`dxv = base*dyv + frac`, seeded from `N = dxv - e0 - 1`:

    len0 = N div dyv    e = N mod dyv    base = dxv div dyv    frac = dxv mod dyv
    per run: L = base;  e += frac;  if (e >= dyv) { e -= dyv; L++ }

Verified identical over 120,870 span shapes in JS and byte-identical over the six views on real
hardware (196 78 158 6 292 154 unchanged). **The seeding had to be derived, not guessed** — a
first attempt seeded `e` from `e0 mod dyv` and disagreed on 8,928 of 12,719 shapes, by one column
here and there, which is invisible on screen. If this is ever revisited, keep the build-time
equivalence check; the algorithm is not the risky part, the seeding is.

**Why it was rejected: it is a wash at the viewpoint that sets the floor.** Measured at
`PX=c80 PY=a80 PA=b0`, interpSpan went 8,645 -> 8,970, i.e. **325 cycles SLOWER**. Modelled over
3,616 frames with hardware-derived costs, the best selector reaches -968 a mean frame and -1,664
on column-heavy frames but **+54 at the worst-fps viewpoint** — and no rule fixes that, because
that view is boundary-dense (10 spans, each paying two divides) and half its spans are steeper
than they are wide. A saving that is zero where the frame budget binds does not buy gameplay
headroom, which was the entire justification.

**Three estimation errors, all mine, all in the same direction:**
- *Baseline.* I took `interpSpan_net / interior_columns = 6,575/140 = 47` cycles a column. That
  quotient includes per-span setup. The loop's own comment says **38** and it was right.
  **Trust the code's own measured comment over a quotient you formed yourself.**
- *Run overhead.* Modelled at 22 cycles a run before the loop existed; as written it is ~70 —
  30 to clip the run to the span end, 5 for the end test, ~35 for the height and error step.
  **Pricing code you have not written is guessing.**
- *Setup.* 300 -> 380 -> 434 as I looked closer. Two `rfDiv` calls at ~200 each; `asl`/`inc` on
  zero page are 5 cycles, not 3.

Every parameter moved against the change, and only the emulator stopped it. That is the third
estimate this session wrong by ~2x (calcM inline 945 -> 455, seam incremental 3,000 -> 1,700).
**Model to decide WHERE to look; never to decide whether to ship.**

Cost of the experiment for the record: 179 bytes and ~90 lines, plus a second interpolation path
selected by a performance heuristic — which is also the change most likely to read as a mystery
later. Deleting it was the readable outcome as well as the fast one.

## 13. Skipping empty cells in the march (distance field) — REJECTED, no empty space exists

The march is an OCCLUSION SEARCH, not a distance measurement: the distance falls out as one
subtract (`rem = sdx - ddx`). So the natural shortcut is to not step through cells that cannot
contain a wall — sphere tracing. Precompute `distT[cell]` = Chebyshev distance to the nearest
wall and advance that far in one go.

**Measured over the map's 136 open cells: `distT` is 1 for 130 of them (96%), 2 for six, and
never more.** A jump has to clear about **8** cells to pay for itself — jumping in distance means
recomputing the cell and both side distances from scratch, the same ~307-cycle pair of multiplies
as ray setup, against ~65 to step one cell. The map never offers more than 2.

**The technique is standard and correct; a 16x16 maze with 1-2 cell corridors is the geometry that
starves it.** Every cell the DDA walks is wall-adjacent and could have been the answer. Revisit
only if the map ever gains open rooms several cells across.

Grounding numbers, worst viewpoint: 134 cell crossings to resolve 20 columns, 6.7 a ray (min 1,
max 14), ~65 cycles a crossing. Per ray: 89 angle + 307 side distances + 435 DDA + 141 answer.
**Only 14% of a ray produces the answer; 81% is the search and its setup.**

## 14. Projecting wall runs instead of casting rays — REJECTED, candidates outnumber the answer

The map is static, axis-aligned and unit-celled, so every wall run is a segment between two known
world points and `runWT`/`runET`/`runNT`/`runST` enumerate all 66 of them at build time. Project a
run's two endpoints to two screen columns and two `colH` values and you have exactly the span
endpoints the subdivision spends two rays each to find — and `colH` is linear across a run, so the
existing interpolator handles the rest unchanged.

**Measured over 7,232 frames (66 runs, 186 faces, mean run 2.8 cells):**

| | mean | max |
|---|---|---|
| runs facing the viewer (per-cell PVS) | **35.3** of 66 | — |
| runs to project (facing + inside the 66 deg FOV) | **11.27** | 33 |
| runs that actually reach the screen | **2.30** | 10 |

**80% of the projection work would be spent on fully-occluded geometry**, and a per-cell PVS
barely culls, because in a maze most of the map faces you. Priced at 550 cycles a projected run
(two bearings ~175, two view-axis distances ~100) against the measured 973 a ray:

    worst-fps viewpoint   CAST 20 x 973 = 19,460   PROJECT 22 x 550 = 12,100   -> 7,400 better
    start corridor        CAST 10 x 973 =  9,730   PROJECT 24 x 550 = 13,200   -> 3,500 WORSE
    mean over all frames                                                       -> ~1,700 worse

...and that is BEFORE occlusion, which the DDA gives away free (the first hit IS the visible one)
and which projection must reintroduce as a front-to-back order plus a column clip list.

**THE PRINCIPLE, worth more than the numbers: raycasting's cost scales with the ANSWER, projection's
with the CANDIDATES. Here candidates outnumber visible geometry 5:1 (11.27 vs 2.30), so projection
starts 5x behind.** That is why Wolfenstein-class geometry got raycast and Doom-class got BSP —
Doom's open sightlines make the candidate set small relative to what is visible; a maze inverts it.
`build-pmaze`'s ~3 fps is NOT evidence here: that was a full polygon rasteriser, not just a
geometry query. The DDA is the right model for this map.

## 15. Seam placement — corners are already free, interiors are already at the exact floor

Two different mechanisms, and only one of them costs anything.

**Corner seams are free and always were.** `subFace` writes `seamT[cell] = SEAM0 + (spanR & 3)`
the moment the subdivision pins a boundary to one column, gated on a concave-partner check
(`cpLoT`/`cpHiT`). No projection, no divide: ~40 cycles, ~360 a frame at the worst viewpoint, and
it rides entirely on boundary-finding work already being done. Convex corners are deliberately
left seam-free — the silhouette already steps 20+ rows there.

**All 5,210 cycles are the INTERIOR seams**, `seamSpan` marking where a long wall crosses cell
boundaries along its own face — the sliding cue. Cost is `calcU` twice per surviving span (~840)
plus `seamOne` at ~330 per seam.

**A "falloff pattern" is not a cheat here — it is the exact geometry.** Deriving `dc/du` for an
axis-aligned face, the `(s'z - sz')` term collapses to the perpendicular distance from the eye to
the face's plane, which is CONSTANT along that face. With `colH = 88/z` that gives

    gap between consecutive cell boundaries = K * colH(u) * colH(u+1),   K constant per span

**But the cheap single-height version, `K * colH^2`, is off by 3.65 columns on average and 10.37
at worst** (302 sample points, 4 viewpoints) — because the gaps are 18-24 columns wide and `colH`
changes substantially across one, so the derivative badly overestimates the difference.

**And the exact form reduces to what `seamOne` already does.** `z` is linear in `u` along the
face, so the column is projective in `u`: `c(k) = (P + Qk)/(R + Sk)`, i.e. two adds and one
divide per seam. `seamOne`'s reciprocal multiply IS that divide. There is no cheaper exact answer.

**The stepped-falloff version was then MODELLED and REJECTED** (2,986 spans, 7,829 seams). Errors
accumulate, because stepping replaces `seamOne`'s independent per-seam solve:

| scheme | mean err | p90 | worst |
|---|---|---|---|
| `K*h^2` (one height) | 14.13 cols | 47.04 | 120.81 |
| `K*h*h(c+gap)`, 1 iteration | 6.08 | 18.57 | 71.42 |
| `K*h*h(c+gap)`, 2 iterations | 4.41 | 14.42 | **161.02** |

Two iterations has a WORSE tail than one -- the fixed-point iteration diverges when the gap is
large relative to the span. And the prize is tiny: mean seams a span is **2.62**, so only 1.62 a
span get the cheap path, **~840 cycles at the worst viewpoint**. 840 cycles for a 6-column mean
placement error on a 160-column screen, on the feature the whole thing exists for. No.

**WHY THERE IS NO CHEAPER EXACT FORMULA -- the structural answer.** There IS a simple exact one,
`c(k) = (P + Qk)/(R + Sk)`, two adds and one divide, and the divide cannot go because
**perspective IS a division**: screen position = lateral / depth. What makes the rest of this
engine fast is that it never asks that question -- `1/z` is linear in screen column, so height is
a table lookup; height is therefore linear across a face, so `interpSpan` is adds only; and the
DDA runs screen -> world, getting depth as a by-product. **The seams are the ONLY forward
projection (world -> screen) in the renderer**, which is the one direction that needs a divide.
They are not badly implemented; they are the only genuinely projective question being asked, and
they already pay the minimum for it. The falloff law is exact and circular: it needs the height at
the next seam, which is what you are solving for.

**Also corrected here: convex corner seams ARE drawn** (`CVXSEAM=1`, the default since the orb
pass was deleted). They cover only the part below the far wall's top, because `seamT` applies to
the SOLID run (rows `rs..12`, `rs` from the cell's MINIMUM height) -- so the line starts where the
step pieces end and never runs up the near wall's full height. That is a consequence of the data
layout, not extra code, so concave-only vs both is purely a matter of taste at zero cost.

## 16. Log tables — one profitable customer out of ten, and `seamOne` was not it (2026-08-12)

Branch `logtables`. `a*b = exp2(log2 a + log2 b)`, with `logT`/`expT` (256 bytes each) and a 9-bit
mantissa. **Converted exactly ONE of the engine's ~10 multiply/divide sites**, and the rule that
predicts why:

> Logs win only where EVERY operand's log is a single lookup -- an 8-bit runtime value, or a table
> whose log can be precomputed offline -- AND the result tolerates 0.27% relative error.

| site | verdict |
|---|---|
| `castRay` initial side distances | **CONVERTED.** `frac` is an 8-bit runtime byte, `ddx`'s log is precomputed by `mkLog`, so the 16x8 multiply became one 16-bit add. **910 cycles.** See the accuracy correction below -- it is NOT more faithful. |
| `seamOne` divide + `*W` | **TRIED, MEASURED, REVERTED** -- see below |
| `calcU` x3 (`sideMul`) | one table operand, one runtime 16-BIT operand needing normalisation (~30 cy) -> ~80 against `sideMul`'s ~70. A loss. |
| `pivOne` x4 (`mul8`) | runtime x runtime |
| `pvRcS` (`rcpDT`) | already a single lookup |

**Quarter-squares are the better multiply and stay.** Exact, 1024 bytes, ~70 cycles, and they win
whenever a 16-bit LINEAR product is wanted, because the `exp2` denormalise shift costs about what
the whole multiply does. Logs' real edges are that they divide at all, and that a CHAIN costs one
`exp2` however many operations it contains.

**`seamOne`: 195 cycles for visible seam damage. Rejected.** It is the one site where the chain
argument applies -- `offset = exp2(log2 P - log2 sum + log2 W)` replaces a reciprocal multiply AND
a `mul8` -- and `logFr` doubles as the byte-log table (`log2(f)*256 = logFr[f] + 2048`, and across
`+P -sum +W` the three 2048s collapse to one). Wall pixels were untouched (866 either way), but:

| view | before | after |
|---|---|---|
| 1 | 8 drawn, 8 matched, avg 0.38, worst 1 | **9 drawn, 8 matched** (a SPURIOUS seam), avg 0.88, worst 2 |
| 2 | 6 drawn, 6 matched, avg 0.50 | 6 drawn, **5 matched** |
| 5 | 11 drawn, 11 matched, avg 0.45 | **10 drawn**, 10 matched (one seam LOST), avg 0.60 |
| 6 | avg 0.29 | avg 0.57 |
| 3 | avg 0.33 | avg 0.25 (better) |

A spurious seam, a lost seam, and doubled average offset in two views, for **195 cycles in
`seamSpan`** (measured 7,410 -> 7,215). Seams are the motion cue; that is not a trade worth making.

**SIXTH consecutive optimistic estimate.** Predicted ~1,000-1,170 for `seamOne`, got 195. The
running tally this session: `calcM` inline 945->455, seam falloff 3,000->1,700->rejected, run-fill
+2,000->negative, log side distances ~3,000->910, `seamOne` ~1,100->195. Only the KERNAL IRQ
vectors came in above estimate (100 -> 260). **Treat any unmeasured cycle estimate as a 2-3x
overstatement.**

**What the branch is worth if the log tables are dropped:** the 8KB at `$e000` (invisible to the
VIC, so it cannot eat bank 0's sprite headroom), 260 cycles from taking the IRQ vectors direct, the
image-vs-equate build guard, and the `$fffa` guard. All independent of the logs.

### Correction: the log path is NOT more accurate. The 884 -> 866 is luck.

Recorded here because the commit for the conversion claims otherwise, and the claim is wrong.

`runviews` went 914 (original) -> 884 (borrow drop) -> 866 (logs), and the logs' -18 decomposes as
**-48 on view 1 and +30 on view 2**, the +30 being the borrow drop's own gain handed back. That
looks like an improvement. It is not, and the measurement that settles it was already in hand:
replaying 217,600 rays against exact float, **logs land on a different wall run 0.059% of the time
against the shipped quarter-square's 0.056%** -- so the log path is marginally LESS faithful to the
geometry, not more.

Both carry about one LSB of error: logs from 1.04 LSB of quantisation (0.27% relative), the
quarter-square from a deliberate truncation of the same order. **Same magnitude, different
distribution.** Six viewpoints cannot tell "more accurate" from "differently wrong by the same
amount", and 18 pixels across 189,312 is not a signal. The borrow drop's 30 was correctly called
luck at the time; the same scepticism should have been applied here immediately.

**Which removes the last argument for keeping the log tables.** They are 910 cycles for ~200 lines,
four tables, the engine's most subtle invariants, and marginally worse geometry -- and one of those
invariants (the carry through `lg16`'s loop test) already broke silently while the build check
validated the intended algorithm rather than the emitted one. If the branch is trimmed, the RAM,
the IRQ vectors, the two build guards and both bug fixes all stand without them.
