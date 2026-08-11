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
