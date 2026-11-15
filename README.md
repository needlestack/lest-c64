# Lest

A new 3D game for the Commodore 64 

> "He drove out the man, and at the east of the garden he placed cherubim and a
> flaming sword that turned every way…"

![Level 2: a corridor of walls with panel seams, and an orb on the floor](art/screenshot-level2.png)

## Where it started

> Can an unmodified C64 run a first-person 3D game at full resolution
> with a decent frame rate?

That was the question. And the answer turned out to be: better than I expected.

There have been many 3D games for the C64, even up to including a port of DOOM.
However they all tend to have poor frame rate (under 10 fps) and often very
blocky graphics. My goal was to see if the C64 could produce something smoother
and clearer. And it turned out, it can.

Lots and lots of tricks were used to make it possible:

* screen drawn in character mode instead of bitmap mode
* character map built from sampling millions of rendered frames
* vertically mirrored scene so we only have to calculate the top
* ray cast hinted from previous frame does binary search for corners only
* interpolation of wall edges between corners
* wall seams projected instead of cast
* caching so unchanged areas aren't touched even when moving
* all entities are hardware sprites
* sprites are culled with precalculated zones
* sprites are occluded with per-frame occlusion stamps

And oh so much more. Aggressive profiling and optimizing, pass after pass,
taking advantage of every simplifying rule of our game format, using every
6502 programming trick, precalculating as much math as possible, aligning
tables in memory... you name it, it's in there.

## Playing

You can play it online right now at:

  https://needlestack.github.io/lest-c64/

Or if you prefer, you can use [VICE](https://vice-emu.sourceforge.io/) with
the disk image [`lest-c64.d64`](lest-c64.d64) in this repository.

Be sure to use **x64sc**, and set the machine to **NTSC** and enable **true
drive emulation** under peripherals. The fast loader runs its own code inside
the 1541, so it needs a real (or truly emulated) drive. On a PAL machine the
disk runs wrong and its loads can stall.

**Controls**

| | keyboard | joystick (port 1) |
|---|---|---|
| forward, back | E, D | up, down |
| turn left, right | `,` `.` (the `<` `>` keys) | left, right |
| strafe left, right | S, F | hold the button + left, right |
| pick up, put down | SPACE | button |
| start again (after you're caught, or at the end) | SPACE | button |

Picking up and putting down happen when you let go of SPACE or the button,
unless you strafed while holding it.

On a real C64 plug the joystick into port 1. In VICE, map the cursor keys or a
gamepad to joystick port 1. The online version is already set up that way.

## Building

Requirements: a recent [Node.js](https://nodejs.org/) (developed on 26), and
[ImageMagick](https://imagemagick.org/) 7 (`magick` on the path; the build fits
sprite art from the images in `art/`). There's no other toolchain: the
assembler (`src/asm6502.mjs`) and the disk-image writer (`src/d64lib.js`) are
part of the project.

```sh
node src/build-iray.mjs                               # the whole game, levels 1-10 -> lest-c64.d64
D64=build/test.d64 node src/build-iray.mjs            # the same, to another disk
PAL=1 node src/build-iray.mjs                         # a PAL disk -> lest-c64-pal.d64 (experimental)
```

Every disk is the whole game, starting at level 1. `D64` names the disk to write;
without it, any build replaces `lest-c64.d64`. A full build takes a few minutes:
each level and each removable wall is built as its own sub-build first, so the
engine can be laid out around all of them. Run it from the project directory.

[`docs/TESTING.md`](docs/TESTING.md) says which test answers which question
(does it still play, does it still draw the same, did a routine get faster) and
how to run it.

The online version is [`index.html`](index.html), served from this repository
by GitHub Pages. It runs [EmulatorJS](https://emulatorjs.org/) (pinned, from
its CDN) set up for NTSC, true drive emulation, joystick port 1 and the whole
keyboard to the C64, and plays `lest-c64.d64` straight from the repository, so
pushing a new disk updates the site.

## How it works

The screen is a character-mode **framebuffer**: 40×25 cells, each drawn from a
charset of wall-edge shapes, giving 160×200 multicolour pixels. Around it:

- **Memory**: the image is laid out by a build-time compactor, code from the
  bottom and tables from the top. Levels load from disk on demand, through
  Krill's loader, into one slot. A level brings its own code with it, so a
  feature only one level uses (level 8's failing light, level 10's ball
  lightning) costs the others nothing.
- **Boot**: a two-stage loader. A few hundred bytes at the stock drive speed
  get the 1541 running its own small transfer routine, read straight off the
  disk, which brings in the loading screen and Krill's installer quickly; Krill
  then loads everything else, laid out at its native interleave. Drives that
  are not a 1541 take the stock route automatically.

The build also checks itself as it goes. Page alignment, memory overlaps,
zero-page ownership, unreachable code, and the precondition of every
undocumented opcode it uses are verified before a disk is written.

Deeper notes: [`docs/RENDERING.md`](docs/RENDERING.md) on the renderer. Every entity's
size ladder, drawn rung by rung at the C64's pixel aspect, is in
[`docs/ladders/`](docs/ladders/) (regenerate with `LADDERSHEET=1 node
src/build-iray.mjs`).

## Layout

| path | what |
|---|---|
| `lest-c64.d64` | the game, ready to play |
| `index.html` | the game in a browser (EmulatorJS), served by GitHub Pages |
| `src/build-iray.mjs` | the game: emits 6502 assembly, builds every level, writes the disk |
| `src/levels.mjs` | the ten levels as data: maps, walls, sockets, exits, entities, starts, inks (read by the build and by `tools/levelsheet.mjs`) |
| `src/compact.mjs` | the image layout pass (run by the build) |
| `src/loader-src.mjs` | the boot: autorun, fast first stage, quote, Krill's installer |
| `src/ending-src.mjs` | the ending: end quote, the tree dissolving in, and the reload |
| `src/asm6502.mjs`, `src/d64lib.js` | assembler and disk writer |
| `src/fit-*.mjs`, `src/make-*.mjs`, `src/charsetgen.mjs`, `tools/endscene.mjs`, `tools/build-facetest3.mjs` | the art converters: the `fit-*` ones run inside every build, the rest by hand to make the assets in `data/` (see `docs/ASSETS.md`) |
| `data/` | assets made by hand from `art/` that the build reads (death picture, quotes, title, pedestal, end scene, charset plan) |
| `build/` | build output; only `build/iray.asm` is committed, so a diff shows what a change did to the machine code |
| `art/` | source art: every picture in the game starts here (`docs/ASSETS.md` says how); `art/tree/` is the end scene's |
| `krill/` | Krill's loader, prebuilt |
| `docs/` | `TESTING.md`, THE tests: what to run for which question and how to read it; `SPACE.md`, where the image's bytes go; `RENDERING.md`; `levels/`, every level as a sheet (key in `levels/KEY.txt`, regenerate with `node tools/levelsheet.mjs`); and `ladders/`: every entity's ladder of sprite sizes, as pictures |
| `tools/` | live-machine inspection (`probe`), frame-rate and cycle benchmarks (`fpsr`, `prof`, `vprof`), test rigs (`regress.sh`, `ship.sh`, `frames`), the level sheets (`levelsheet`), and the music tools (`song-*`, `sidtrace`) |

## Credits and licence

Everything in this repository -- the code, the art in `art/`, the end-scene
picture and the level designs -- by Jonathan Field, written with Claude
(Anthropic) in Claude Code, is released under the [MIT licence](LICENSE).

Included third-party code keeps its own licence:

- **Loader by Krill** (Gunnar Ruthenberg), BSD 3-clause. See [`krill/README-krill`](krill/README-krill).
- **The fast first stage** (`IFBT`/`IDRV` in `src/loader-src.mjs`) adapts the idea of [fastboot1541](https://github.com/mist64/fastboot1541) by Michael Steil: have the drive read its own code off the disk, so almost nothing crosses the slow bus before a fast loader is running.
- **Exomizer decruncher** by Magnus Lind ([`src/exodecrunch.asm`](src/exodecrunch.asm)), under the notice in that file.
