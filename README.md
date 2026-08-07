# c64fps — pseudo-3D rendering on a stock Commodore 64

An exploration of how far real-time 3D / pseudo-3D can be pushed on an unmodified
C64 (MOS 6510 @ ~1 MHz, 64 KB), and — more to the point — how much performance is
left on the table when you reach for "more hardware" instead of profiling and
rewriting. Short version: a lot. The flagship raycaster went from a flat ~5 fps to
**8–17 fps** with nothing but software optimization.

Each `build-*.mjs` is a Node script that assembles a 6502 program (via the homegrown
`asm6502.mjs`) and writes a `.d64` disk image (via `d64lib.js`). No toolchain needed
beyond Node.

```
cd ~/c64fps
node build-iray.mjs        # -> iray.d64  (then copied to disks/iray-ntsc.d64)
```

Everything is self-contained (local `d64lib.js` + `asm6502.mjs`); nothing reaches
outside this directory.

## The builds

| script | disk | what it is | fps (NTSC) |
|---|---|---|---|
| `build-iray.mjs` | `disks/iray-ntsc.d64` | **The main one.** Full-screen 80-column raycaster, char-mode framebuffer, 16-bit DDA. | **8–17** |
| `build-ray.mjs` | `disks/maze-ntsc.d64` | Original 40-column char raycaster, 8-bit DDA, solid walls. | ~12 |
| `build-bmaze.mjs` | `disks/bmaze-ntsc.d64` | Hi-res **bitmap** raycaster, double-buffered (bank flip), 80×80 window. | ~3–5 |
| `build-pmaze.mjs` | `disks/pmaze-ntsc.d64` | **Polygon** (Wayout-style) maze: projects wall faces as filled trapezoids. | ~3 |
| `build-cube.mjs` | `disks/cube-ntsc*.d64` | Char-framebuffer rotating cube (solid / bitmap / wireframe variants). | up to 30 |
| `build-bitmap/solid/min.mjs` | — | Early scaffolding experiments. |
| `poly-ref.mjs` | — | JS reference renderer used to validate the polygon math before the 6502 port. |
| `poly-maze.html` | — | Interactive **browser** version of the polygon maze (drive it with keys). |

`disks/*-ntsc.d64` are the canonical, delivered builds; the un-suffixed `.d64`s are
raw build outputs.

## The iray optimization journey (the headline result)

`build-iray.mjs` renders the maze with one ray per column into a 256-glyph
"framebuffer font" (each character code = a 2×4 logical-pixel pattern → 80×100 logical
resolution in plain character mode, so the per-frame redraw is ~2 KB, not an 8 KB
bitmap). Then, in order, each optimization measured against the last:

1. **Baseline** per-column 16-bit raycaster — ~5 fps, flat.
2. **Vertical symmetry** — the image mirrors about the horizon, so compute the top 13
   cell-rows and write each cell *and* its vertical flip. → 6.
3. **Adaptive subdivision** — march a full ray only where the visible *square face*
   changes; interpolate the wall top across same-face runs. This is exact and
   occlusion-safe (two rays on one unit face can't hide a nearer square between them),
   and it keeps the per-column dividers crisp. → 5–10, view-dependent.
4. **Fast solid/blank fill** — a cell is a constant `$FF` where both columns are wall
   and `$00` where both are ceiling; only the one edge cell per column-pair needs real
   computation. Fill becomes edge-proportional instead of area-proportional. → **8–17**.

Net: open corridors run ~17 fps; a room full of little panels (lots of distinct
squares to march) is the worst case at ~8. The performance curve finally matches
intuition — "how much wall is on screen" is free; "how many distinct squares" is the
cost.

Still on the table: sharing the per-ray setup multiplies across rays (they share the
frame-constant player position), and leaping empty runs with per-row next-wall tables.

## Controls (iray / mazes)

- **E / D** — forward / back
- **S / F** — strafe left / right
- **Joystick-1 left/right** — turn
- fps readout sits in the top-left corner.

## Testing headless in VICE

```
x64sc -silent -warp -ntsc +drive8truedrive -limitcycles 70000000 \
      -jamaction 1 -exitscreenshot out.png -autostart disks/iray-ntsc.d64
```

- `+drive8truedrive` disables true-drive emulation → near-instant loads (kernal trap).
- `-limitcycles N` runs exactly N cycles, then writes the screenshot and exits.
- `-warp` runs flat-out; `-ntsc` matches the build timing.

## Files

- `asm6502.mjs` — homegrown ACME-flavored 6502 assembler (expressions support `+`/`-` only).
- `d64lib.js` — `.d64` disk-image writer (exposes `globalThis.D64`).
- `disks/` — all built disk images.
