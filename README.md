# Lest

A first-person game for an unmodified Commodore 64: smooth 3D at 10–20 frames per second, at
the machine's full multicolour resolution, without the 8×8 blocks.

> "He drove out the man, and at the east of the garden he placed cherubim and a flaming sword
> that turned every way…"

<!-- TODO(screenshot): a still or a short GIF of level 4 -->

## Where it started

> Drawing 3D at full resolution on a C64 is impossible, and 8×8 blocks are ugly. What if every
> character were a 2×4 block of pixels, with a 256-glyph charset holding every possible pattern?
> Could that render 3D at up to 30 fps?

That was the whole question, and the project was called *c64fps* while it was only a question.
The answer turned out to be "nearly, and differently". The 2×4 blocks became 4×8 multicolour
cells. Instead of holding every pattern, the charset holds the 243 shapes a wall edge actually
makes, fitted from millions of measured views. The frame rate settled at 10–20 fps on a stock
machine. Somewhere along the way it became a game.

## Playing

You need a C64, or [VICE](https://vice-emu.sourceforge.io/) (`x64sc`), and the disk image
`lest.d64` from the releases page, or one you build yourself (below). It's built and timed for
**NTSC** machines.

| control | |
|---|---|
| **E / D** or joystick up / down | forward / back |
| **S / F** | step left / right |
| joystick (port 1) left / right | turn |
| **left SHIFT** | run |
| **SPACE** | pick up / put down |
| **RETURN** | start again |

The loader talks to a real 1541. In VICE, keep **True Drive Emulation** on (the default).

## Building

Requirements: a recent [Node.js](https://nodejs.org/) (developed on 26), and [ImageMagick](https://imagemagick.org/) 7
(`magick` on the path; the build fits sprite art from the images in `art/`). There's no other
toolchain: the assembler (`asm6502.mjs`) and the disk-image writer (`d64lib.js`) are part of the project.

```sh
node build-iray.mjs                     # the whole game -> latest.d64
CHAIN=4 node build-iray.mjs             # one level on its own, for playtesting
```

`CHAIN` lists the levels on the disk, in order. A full build takes under 20 seconds: each level and each
removable wall is built as its own sub-build first, so the engine can be laid out around all of
them. Run it from the project directory.

## How it works

The screen is a character-mode **framebuffer**: 40×25 cells, each drawn from a charset of
wall-edge shapes, giving 160×200 multicolour pixels. Each frame:

- **Rays** are cast only where the picture can change: last frame's wall boundaries seed the
  subdivision, so a typical view needs around 14 rays rather than 160, and the columns between
  are interpolated.
- **Walls** become cell codes through tables. A wall's top edge in a cell is a ramp, a step or a
  level, and the charset was chosen by measuring which of those the engine really draws.
- **Seams**, the lines between wall panels, are painted in a reserved colour by one divide per seam.
- **Entities** (orbs, statues, idols, sockets, exits) are hardware sprites. Each is scaled from a
  ladder of pre-fitted sizes and hidden behind walls by per-frame occluder masks.
- **Memory**: the image is laid out by a build-time compactor, code from the bottom and tables from
  the top. Levels load from disk on demand, through Krill's loader.
- **Boot**: a two-stage loader. A few hundred bytes at the stock drive speed get the 1541 running
  its own small transfer routine, read straight off the disk, which brings in the quote and Krill's
  installer quickly; Krill then loads everything else, laid out at its native interleave. Drives
  that are not a 1541 take the stock route automatically.

The build also checks itself as it goes. Page alignment, memory overlaps, zero-page ownership,
unreachable code, and the precondition of every undocumented opcode it uses are verified before a
disk is written.

Deeper notes: [`RENDERING.md`](RENDERING.md) on the renderer, [`DECISIONS.md`](DECISIONS.md) on why
things are the way they are.

## Layout

| path | what |
|---|---|
| `build-iray.mjs` | the game: emits 6502 assembly, builds every level, writes the disk |
| `compact.mjs` | the image layout pass (run by the build) |
| `asm6502.mjs`, `d64lib.js` | assembler and disk writer |
| `art/` | source art: renders, paintings and hand-drawn sprites |
| `*.json` | fitted assets the build reads (sprites, charset plan, boot quote) |
| `fit-*.mjs`, `make-*.mjs`, `charsetgen.mjs` | hand-run generators that produce those assets |
| `krill/`, `krill-bg/` | Krill's loader, prebuilt |
| `tools/` | VICE-driven profiling and test rigs (`vprof`, `frames`, `ship.sh`, …) |
| `probe.mjs`, `fpsr.mjs`, `prof.mjs` | live-machine inspection and frame-rate benchmarks |

## Credits and licence

The code in this repository is released under the [MIT licence](LICENSE).

<!-- TODO(licence): decide whether art/ and the level designs are covered too, or reserved -->

Included third-party code keeps its own licence:

- **Loader by Krill** (Gunnar Ruthenberg), BSD 3-clause. See [`krill/README-krill`](krill/README-krill).
- **The fast first stage** (`IFBT`/`IDRV` in `loader-src.mjs`) adapts the idea of
  [fastboot1541](https://github.com/mist64/fastboot1541) by Michael Steil: have the drive read its
  own code off the disk, so almost nothing crosses the slow bus before a fast loader is running.
- **Exomizer decruncher** by Magnus Lind ([`exodecrunch.asm`](exodecrunch.asm)), under the notice
  in that file.
