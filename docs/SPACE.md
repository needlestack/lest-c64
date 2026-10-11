# Where the image's bytes go

What each feature of LEST costs in the C64 image. Measured 2026-10-10 on the default build
(chain 1–7, level 8 excluded: it is work in progress and builds only with `WIP=1`). Rerun with:

```
node tools/space.mjs          # the table below
node tools/space.mjs "" -v    # plus each feature's largest items
```

## The image is nearly full

The image runs from `$0801` to `$bfff`: **47,103 bytes**. It holds three kinds of bytes, and
`space.mjs` charges all three to a feature:

| | bytes | what |
|---|---:|---|
| code | 21,760 | the engine, from `$0801` up |
| tables | 22,309 | precomputed data, from `$bfff` down, plus a few variables in its holes |
| scratch | 2,604 | RAM buffers, packed into the arena between code and tables |
| **free** | **~550** | 431 B in 11 fragments (one of 315 B at the top of the arena, the rest 6- and 13-byte page tails) and 117 B of alignment padding |

Leaving level 8's flicker out of the shipping engine is what opened the 315-byte hole. `space.mjs`
sizes a label by the gap to the next one, so it charges that hole to the scratch buffer below it:
its scratch column reads 3,022, of which 418 B is the free space.

The 46 B of zero page at `$d2`–`$ff` are also unclaimed. See *Smaller wins* below.

## Cost by feature

| feature | code | tables | scratch | **total** |
|---|---:|---:|---:|---:|
| renderer: cast, subdivide, draw | 5,254 | 14,430 | 989 | **20,673** |
| entities: projection, sprites, occlusion | 5,441 | 2,338 | 149 | **7,928** |
| level fall + load (the drop) | 2,292 | 1,064 | 1,068 | **4,424** |
| death scene | 1,061 | 1,842 | 11 | **2,914** |
| seams | 1,319 | 1,024 | 101 | **2,444** |
| angel AI + BFS pathing | 1,060 | 797 | 263 | **2,120** |
| movement + input | 795 | 526 | 5 | **1,326** |
| level setup (entering a level) | 839 | 0 | 0 | **839** |
| boot, main loop, IRQ | 684 | 0 | 0 | **684** |
| orb carry (pick up / put down) | 640 | 0 | 3 | **643** |
| angel lunge (slide) | 472 | 156 | 0 | **628** |
| HUD + fps readout | 565 | 0 | 0 | **565** |
| sound | 395 | 131 | 7 | **533** |
| wall collapse (sockets) | 488 | 0 | 0 | **488** |
| idol + pedestals | 230 | 1 | 1 | **232** |
| palette keys 1/2/3 | 188 | 0 | 7 | **195** |
| THE END | 37 | 0 | 0 | **37** |
| free (charged to scratch by the tool) | | | 418 | **418** |
| **total** | **21,760** | **22,309** | **3,022** | **47,091** |

The total is 12 bytes short of 47,103: the image's last bytes below `$c000`, which hold no label.

**How bytes are charged:**

- A label's size is the gap to the next label.
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
