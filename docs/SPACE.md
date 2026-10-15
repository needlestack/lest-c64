# Where the image's bytes go

What each feature of LEST costs in the C64 image. Measured 2026-10-10 on the default build
(chain 1–7; level 8 is work in progress and builds only with `WIP=1`), after the space audit
below. Rerun with:

```
node tools/space.mjs          # the table below
node tools/space.mjs "" -v    # plus each feature's largest items
```

## The image

The image runs from `$0801` to `$bfff`: **47,103 bytes**. It holds three kinds of bytes, and
`space.mjs` charges all three to a feature:

| | bytes | what |
|---|---:|---|
| code | 20,682 | the engine, from `$0801` up |
| tables | 21,498 | precomputed data, from `$bfff` down, plus a few variables in its holes |
| scratch | 2,346 | RAM buffers, packed into the arena between code and tables (another 184 sit in alignment padding) |
| **free** | **~2,700** | **2,565 B of level arena in one run (9 whole pages)**, plus 127 B of alignment padding |

All 88 free bytes of zero page are now in use: `compact.mjs` promotes the most-referenced
variables into them (see the audit).

## The space audit, 2026-10-10

The goal was room for features, without changing the game. The image went from **~240 B free to
~2,700**. Every step was checked with `tools/regress.sh` (draws the same as the pre-audit commit
`8a9f6dc`) and `node tools/fpsr.mjs "" suite` (every level plays; fps per level in
`docs/TESTING.md`).

| change | freed | how |
|---|---:|---|
| zero-page promotion | ~775 code + ~85 scratch | `compact.mjs` step 0: the most-referenced RAM variables go to the 88 free zero-page bytes, each saving a byte per instruction that names it (and a cycle). One clear loop at power-on zeroes zero page, as the image's scratch used to load as zeros |
| level 8 out of the shipping engine | ~420 | `WIP_LEVEL_IDS`, built only with `WIP=1` |
| three quarter-turn table pairs | 576 | `moveYT/moveXT`, `absSinT/absCosT`, `posYT/posXT`: cos is sin 64 entries on, so each pair is 320 bytes (`sharedPair`, asserted per entry) |
| `rbT` inside `rsT` | ~240 | `rbT[c] = rsT[c+7]`, so the pair is 263 bytes (`sharedPair`) |
| tables already inside other tables | ~105 | `rowLo/HiT` in `mul40Lo/HiT`, `sndV1H/sndV2H` in `recipHiT`, `qIdxAT/qIdxBT` in `ecM8` (`embedIn`, aliases checked at build time) |
| palette keys (1/2/3, Q/W) and `SNDTEST` | ~250 | development tools, removed |
| equates nothing names | 38 | `compact.mjs` gives them no RAM |
| dead code | ~70 | `oSWall`, `lvlLo` (FALLMID never calls it), `amDX/amDY`, `hlvOf`, four tail calls |

**Bugs found on the way:**

- **The render-cache clear (`rfCz`) ran X to 255 over a 160-byte cache.** It stamped `$ff` on the
  next 96 bytes at every boot and every death restart: `cstepT`, `seamT`, and whatever
  compaction put after them. It's now bounded. The colour-RAM fill after it had silently relied
  on X coming out of that loop as 0, which turned up as garbled walls; it now sets X itself.
- **The zero-page pass first broke the fall.** One masked loop over `omEn,x` clears five
  consecutive bytes, and four of them are named nowhere but there. Now any buffer in the
  unbroken run after an indexed buffer with no declared size stays put. The level-1 walk alone
  could not see this, which is why `regress.sh` has a falls workload.
- **`FALLNOW` forced its first fall on frame 0**, before anything was rendered. It now starts on
  frame n-1 (a test-flag change only).

**What was looked at and left:**

- **The edge-chain clamp tables (`ecMT`/`ecM16`/`ecM8`, 1,224 B).** They begin with ~146 zeros,
  which could overlap another table's zero tail for ~150 B. That moves them off their pages in the
  hottest code, so it needs a vprof A/B first.
- **The large renderer tables** (`hTabT`, the ramp/step pages). Every fold costs cycles in the
  renderer.
- **Boot-only overlays.** `entry` also runs on every death restart, so almost nothing runs only
  once.
- **The angel leash as a per-level overlay.** It is ~23 bytes of engine code, and its data already
  rides in the level file.

## Round 2: the drop and the death scene, same look (2026-10-11)

Free: 2,629 -> 3,597 bytes; the arena now holds 12 whole pages. `regress.sh` IDENTICAL on every
workload, fps suite clean.

| change | freed |
|---|---:|
| Overlap-window code, dead since FALLMID set `ARC_OVERLAP` to 0, gated on it | ~145 |
| Fall timing log (`fmTk`/`fmLog`) behind `FMLOG=1` | ~90 |
| Death charset: exactly the 196 glyphs drawn (was EOR $0f pairs for a cycling that no longer exists) | 224 |
| The destination rendered whole in the black middle (`bgStep` slicing and the cast's per-pop budget check deleted) | ~83 |
| The drop slides the departing room straight off the screen (`fallSnapS` and its copy deleted; `DROPREAD` proves every row it reads is still on the displayed frame) | 526 |

Not done: loading the death charset from disk at death (~1.8K), which adds a pause at the cut.

## Level code: BUILT (2026-10-14)

Designed on 2026-10-11 and parked until level 9 v6 (19 sentries in three sealed rooms) left the
`WIP=1` engine 320 B short. A feature only some levels use now loads with those levels.

**The economics, measured:**

    saving = (sum of every feature's code) - (the largest module) - (hooks)

The block a module loads into is sized to the largest one, so one feature alone saves nothing: the
shipped game (flicker only) lost 67 B to the vectors. With two (flicker 477 B, sentries + stages
1,328 B) the `WIP=1` engine went from 320 B short to 344 B spendable. Each further special level
costs only what its module exceeds the largest by, and every level whose module is smaller has the
difference free for more level code.

**What was built (where it differs from the plan, the plan was wrong):**

- **Where it loads: in the level file, after the level's data.** Not a separate `ILX` file and not a
  separate block: `LXAT` is the end of the largest level's data plus wall lists, and a level that
  brings code is its tables, its wall lists, zeros up to `LXAT`, then the module. One file, one load,
  and the boot level's module rides in `IMG` with its tables, as the tables already did. The region
  compaction reserves runs to `LXAT + LX_SIZE`.
- **Which code.** The source marks it: `;@@LX-BEGIN <feature>` ... `;@@LX-END`. `LX_FEATURES` in the
  build says which levels use each feature and which vectors it answers. Today: `silver` (`svStep`,
  `svTick`, `svWr`, `stGo`, `stInit`/`svReset`) and `flicker` (`flkTick`, `fkEmpty`).
- **The vectors.** `lxTick`, `lxStep`, `lxInit`, `lxSock`, `lxWr`, `lxLook`, only those some feature
  answers. Each is a `jmp` the engine calls; a level's module begins with a jump table in the same
  order, and a vector none of its features answers goes to an `rts` in the module. `lvlLoad` stubs
  them all to `lxNone` before a load (the IRQ's first) and points them at the module after it if
  `lvlLxT` says the level brought one (the IRQ's last), each with interrupts masked. A death restart
  keeps them, as it keeps the module.
- **Linking.** The marked text is cut out of the engine's source before compaction, sized once with
  placeholder addresses (absolute, unless the source gives the name a zero-page address), and linked
  after the final assembly against the engine's real labels. A name compaction dropped fails the link.
- **State.** What the engine's own code reads stays resident, after `@@LX-END` (`svCnt`, the slot
  lists, `svY`, `flkDk`, `flkLit` ...). What only the module reads lives in the module: it is
  re-initialised by every load, which is the level starting over anyway.
- **The slot address is picked, not set.** The region's size depends on the build, so no one address
  serves the game, `WIP=1`, the lab and the rigs' chains. Without `SLOT_AT` the build runs itself as
  a child: the last address that worked for these settings (`build/slot-cache.json`), and if it does
  not fit, the highest page compaction says does (`build/iray.arena.json`), then a page or two lower.

**Four traps it hit, now guarded:**

- **Zero page the module owns.** Its equates leave the engine's source with it, so compaction saw
  `$b5-$bf` as free and promoted engine buffers onto the flicker's rectangle. The build publishes the
  module's zero page (`build/iray.zpres.json`) and compaction keeps off it.
- **Slot tables were told from scratch by ADDRESS.** Compaction left alone any RAM equate inside the
  reserve, on the theory that only the slot's tables were there. The longer region swallowed
  `runPlaneT`'s hand address, it stayed put, and `mkRuns` wrote over level 8's flicker code: a hang
  after two frames. Slot tables are now named (`build/iray.slotnames.json`), and a build guard fails
  any other RAM buffer that overlaps the region.
- **Slot tables promoted to zero page.** Compaction's zero-page pass never excluded the slot's tables;
  it was safe only while zero page was full. Moving module variables out freed some, `lvlMeT` went to
  `$66` where no level file writes it, and every `WIP=1` level drew a black sky and garbage walls. The
  pass now skips slot names, and the build fails if any slot table is not in the slot.
- **A guard that only sees nonzero bytes.** The boot-level patch refuses to overwrite emitted data,
  but tests for nonzero bytes, so a zero-padded table under the region would pass. The region guard
  above is the real check.

**What could move next:** each level's module has `LX_SIZE` minus its own size free, so features of
smaller levels are free to move: level 4's wall symbol (`symPut`, ~94 B); the idol and pedestal code,
duplicated into each of levels 4-7's modules if it can be cut cleanly; the sentry's resident hooks
(`orbRt`, `svReg`, `svQuad`, the variant branch), which need a call-site redesign. Floor dither (616 B,
levels 5-7) still doesn't move cleanly: it's woven into the drop's rim and charset rebuild.

## Level-loaded art: the first instance (2026-10-14)

Level 9's sentry needed 48 sprite slots that bank 3 didn't have. Rather than drop the idol and the
pedestal from the game, they now swap with the sentry's art per level. This is the pattern any
level-loaded asset will follow, so here it is written down.

- **A fixed landing area.** `OVLBASE` = `$f780`, 26 slots up to `COLH` at `$fe00`. It has to be
  RAM the CPU can reach: Krill can't write under the I/O hole, so anything swapped at runtime
  lives above it. What never swaps can live under the hole: the sentry's frames 0-1 sit at
  `SVBASE`, behind the exit ladder at the end of `IHOL`, where the pedestal and the idol were.
- **Sets that can occupy it.** `ART_SETS` in the build: `IAR0` = the pedestal then the idol
  (1.3K); `IAR1` = the sentry's frames 2-3 plus its data tables (`SVTBL`: `svVarT` and five
  small ones, 126 B), 1.6K. Data rides with art when only that level reads it.
- **Which set a level needs.** `lvlArtT`, one byte in the level file: `'0'`, `'1'`, or 0 for a
  level that uses neither and keeps whatever is there.
- **What's loaded now.** `artCur`, emitted as data, so a death restart (`jmp entry`, which loads
  nothing) keeps it, exactly like `dieN`.
- **When it loads.** At the end of `lvlLoad`, in the fall's blanked middle: if `lvlArtT` names a
  set other than `artCur`, the name buffer is renamed `IAR<c>` and loaded, then renamed back to
  `ILV`. About 0.3 s for 1.6K. The boot loads the set its own level wants; the other waits on
  the disk.
- **Guards.** The bank-3 overlap guard counts the landing area at the size of the LARGEST set. A
  level can't need two sets (a sentry level with an idol is a build error). Code that reads a
  set's data checks first that its level has the feature (`svTick` tests `svNT`), because on
  other levels those addresses hold the other set.

Checked: falling 9 -> 7 reloads `IAR0`, and level 7 is pixel-identical to booting it.

Level-loaded CODE is the same shape plus one hard part, linking code to run at the landing
address. That's "Level code: BUILT" above.

## Cost by feature

| feature | code | tables | scratch | **total** |
|---|---:|---:|---:|---:|
| renderer: cast, subdivide, draw | 5,113 | 13,921 | 907 | **19,941** |
| entities: projection, sprites, occlusion | 5,115 | 2,366 | 88 | **7,569** |
| level fall + load (the drop) | 2,200 | 1,002 | 1,042 | **4,244** |
| death scene | 994 | 1,837 | 6 | **2,837** |
| angel AI + BFS pathing | 998 | 801 | 257 | **2,056** |
| seams | 1,285 | 675 | 40 | **2,000** |
| movement + input | 759 | 328 | 0 | **1,087** |
| level setup (entering a level) | 825 | 0 | 3 | **828** |
| sound | 388 | 290 | 56 | **734** |
| boot, main loop, IRQ | 664 | 0 | 0 | **664** |
| angel lunge (slide) | 448 | 156 | 0 | **604** |
| orb carry (pick up / put down) | 595 | 3 | 0 | **598** |
| HUD + fps readout | 560 | 0 | 0 | **560** |
| wall collapse (sockets) | 485 | 0 | 0 | **485** |
| idol + pedestals | 228 | 2 | 0 | **230** |
| THE END | 37 | 0 | 0 | **37** |
| FREE: nothing lives here | 0 | 117 | 2,512 | **2,629** |
| **total** | **20,694** | **21,498** | **4,911** | **47,103** |

**How bytes are charged:**

- A label's size is the gap to the next label, but emitted data stops where the build's raw gaps
  begin (`RAWHOLES=1`), and a RAM buffer takes its declared size (`iray.bufsizes.json`). Bytes no
  label covers are FREE, and the FREE row matches the build's own "image holes" total. Until
  2026-10-11 the tool charged free space to the label below it: the arena's 2.4K went to
  `remLoT`, a 160-byte buffer, as renderer scratch.
- Code is charged by the label's name prefix, then by the section banner it sits under in
  `build/iray.asm`.
- Tables and scratch are charged by name alone, because `compact.mjs` moves them away from where
  they were written.
- A table shared by two features is charged to its main reader. For example, the quarter-square
  multiply goes to the renderer, though the fall also uses it.

**Features are engine-wide.** A mechanic is compiled in if *any* level of the game uses it, so
the engine is identical whatever the chain is. That is why a work-in-progress level is kept out
of the game entirely (`WIP_LEVEL_IDS`, built only with `WIP=1`): level 8's flicker would otherwise
put about 400 bytes into the shipping image.

### The renderer, 20.7K

*(Measured before the audit at `38fa972`. The table names still hold. The sizes of `rbT`/`rsT` and the move/seam pairs are now shared, as above.)*

Tables are most of it:

| table | bytes | what |
|---|---:|---|
| `hTabT` + `hPgT` | 4,256 | wall height by distance, 16 groups of one page each |
| ramp / step glyph selection (12 pages) | 3,072 | which charset code draws each cell edge |
| edge-chain clamps `ecMT` `ecM16` `ecM8` | 1,224 | EDGE CHAIN |
| wall-run tables `run*T` | 1,166 | |
| ray step `ddxLoTQ` / `ddxHiTQ` | 1,024 | |
| quarter-square multiply `f0`/`f1` | 1,024 | castRay, and the fall's warp |
| pivot (`rcpDT` `sinST` `qToColT` `rayOffQS`) | 928 | temporal pivot |
| render scratch (`rem*` `faceIdT` `runPlane/Face` `cw` `cb`…) | 902 | |
| edge-chain row tables `ed`/`bk`/`sl` | 592 | |
| reciprocal `recipLo/HiT` | 512 | |
| render cache `rbT` `rsT` | 512 | dirty-char skipping |

Code, 5.3K:

- `renderSym` and its 12 unrolled row writers: 1.7K
- subdivision and the main ray loop: about 1.1K
- `castRay`: 735
- `pivPrep`: 732
- step-column prep: 593
- `interpSpan`: 432

### Entities, 7.9K

Code, 5.4K:

- **projection, 2.5K:** `orbProjC`, `orbMove`, `omTrig`, `obOrder`
- **wall occlusion stamping, 1.4K:** `occStamp`, the tall-entity upper half, `oSPut`, `orbOcc*`
- **holes, sockets and pedestals on the floor, 935:** `holeTail`, `hlSet`
- **culling, 350:** `entGate`
- **sprite inks, 123:** `sprPal`, `sprSpl`

Tables, 2.3K:

- occlusion glyph tables `cellFillT` + `occVrtT`: 498
- per-rung ladder tables for orbs, holes, sockets and pedestals: about 600
- variant tables: 322
- `angMidT`: 256
- `qcosT`: 256
- `orbOccT`: 108
- ENTCONE: 96

### The fall, 4.4K

- **the two half-height screen snapshots, 1,040:** the scratch column
- **Krill's parked loader, 251**
- **code, 2.3K:** the arc, the warp copy, `fallMid`, the tail rows, background loading

## What an off-switch actually frees

*(Measured before the audit at `38fa972`. `PALKEYS` and `SNDTEST` no longer exist.)*

Measured by building with the switch and comparing against the default build. These differ from
the table above for two reasons. An off-switch can leave its feature's tables behind. And some
code is shared, so it can't be removed with the feature.

| switch | code | tables | scratch | **image freed** | other |
|---|---:|---:|---:|---:|---|
| `DIE=0` | 1,402 | 1,836 | 3 | **3,241** | +1,000 B bank 3 (the picture) |
| `EDGECHAIN=0` | 1,030 | 0 | 0 | **1,030** | the frame gets ~2.3k cycles slower |
| `SOUND=0` | 483 | 201 | 0 | **684** | |
| `SEAMS=0` | 567 | 0 | 0 | **567** | seam tables stay behind |
| `ANGSLIDE=0` | 516 | 0 | 0 | **516** | |
| `FALLTAIL=0` | 262 | 20 | 0 | **282** | |
| `ANGEL=0` | 84 | 32 | 2 | **118** | the angel code stays: it is engine |
| `NOHUD=1` | 115 | 0 | 0 | **115** | removes the level HUD only; the fps/position readout (~450) stays |
| `OCCSYNTH=0` | 113 | 0 | 0 | **113** | |
| `PARTIAL=0` | 4 | 0 | 0 | **4** | |
| `CELLANG=0`, `FASTBOOT=0`, `IDOLCON=0`, `SNDSTEP=0` | 0 | 0 | 0 | **0** | no effect on the image |

**Broken switches.** These no longer build, which is worth fixing or deleting in the pass:

| switch | what it does now |
|---|---|
| `FALL=0` | `undefined symbol: objInit` |
| `SPRITES=0` | SOLO routing error: `orbXCT orbYCT … route each one's site through LD()` |
| `ORBOCC=0` | `undefined symbol: occWalk` |
| `PALKEYS=0` | `undefined symbol: pkEdge` |
| `SHYCOL=0` | overflows. Expected: it restores the older, bigger path |
| `WIP=1 FLKSPR=2` | about 100 B over in the full game. Expected: the new sprite flicker needs room |

## The other memory

| region | used | free |
|---|---|---|
| VIC bank 3 (charsets, sprites, screens) | orb ladder 30 slots, hole ladder 41, idol 10, level slot `$f500` | **1,256 B = 19 sprite slots** |
| low RAM `$0200`–`$03fb` | 472 of 508 | 36 B |
| zero page | 159 named | 95 B, 46 of them in one run at `$d2`–`$ff` |
| level file (per level, loaded on entry) | 686 B per slot, 3 pages | not image space |

Bank 3 is where a level-8-only orb with a different shadow would go: a second orb ladder costs
about 30 slots, and only 19 are free.

## Where a pass could find room

*(Written before the audit. Done since: the zero-page pass, the duplicate tables, the palette keys. Still open: the HUD readout, the death picture charset, per-level overlays, the clamp-table overlap.)*

Ranked by size. Each one's cost in cycles or features has to be weighed against the room it
frees.

**Policy calls (no engineering):**

- **Debug readout and palette keys: ~760 B.**
  - The fps/position readout and HUD: 566 B, of which `NOHUD=1` frees only 115.
  - The 1/2/3 ink keys: 195 B.
  - Both are development tools. If the shipping game doesn't need them, both go, but they need
    working off-switches first: `PALKEYS=0` is broken, and the readout has no switch.
- **Death scene picture charset: 1,792 B.** It's only used during a death. Loading it at death
  time, or keeping it in bank 3, would free it from the image, at the cost of a disk load as
  the death starts.

**Engineering:**

- **Per-level code overlays.** Mechanics only some levels use could ride in the level file
  instead of the engine:
  - flicker: 393 B (level 8, once it ships)
  - wall collapse: 488 B
  - idol + pedestals: 232 B

  The engine would need a fixed overlay region the size of the largest set any one level uses,
  so the win is the difference. This is the plan in the engine/level split notes.
- **Table folding: hundreds of bytes, needs measurement.**
  - The three edge-chain clamp tables (1,224 B) may fold into one with an offset.
  - `hTabT` (4K) has been folded once already, from 12K.
  - The ramp/step selection pages (3K) are the charset plan's.

  Each fold trades cycles in the hottest code.
- **Zero page: maybe 100–300 B.** Every absolute variable moved to zero page saves a byte per
  instruction that reads or writes it. Moving the angel's eight variables saved 16 B. There are
  46 free bytes in one run at `$d2`–`$ff`.

**Smaller wins:**

- **Duplicate tables flagged by the build: up to 80 B.** `qIdxAT == qIdxBT`,
  `sndV1H == sndV2H`, `posXT == posYT == ddxHiTQ`.
- **Free fragments: 117 B.** Thirteen-byte page tails, which suit small tables or variables only.
