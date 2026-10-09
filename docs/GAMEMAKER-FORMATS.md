# GameMaker file formats

The source art in `art/gamemaker/` was drawn in **Garry Kitchen's GameMaker** (Activision,
1985), the program GMC64 re-implements. This page documents the two file types we hold:
scenes (`.gek`, `/pic` on a GameMaker disk) and sprites (`.spr`, `/spr` on disk). It's written
so the files can be read without GMC64 to hand.

- **Reference readers** (authoritative where this page and they disagree):
  `../GMC64/code/js/gmScene.js` and `../GMC64/code/js/gmSprite.js`.
- **Use `decodeHeader()`/`serialize()` in `gmSprite.js`, not its header comment table.** The table
  is stale in at least five places, and a writer built from it loads with the wrong colours and
  a corrupt name.
- **Our readers:** `src/gek.mjs` for scenes, `tools/gm2png.mjs` for sprites. `gm2png` renders every
  file in `art/gamemaker/` to a PNG beside it.

All offsets below count from the first byte of the file, which is the 2-byte load address.

## On a GameMaker disk

- **Filenames:** a 6-character name, space-padded, then a type suffix: `hangl1/pic`, `orb0  /spr`.
  The padding is part of the name; `c1541 -read "orb0/spr"` won't find it.
- **File type:** every file is a PRG.
- **Extracting:** `c1541 -attach x.d64 -read "orb0  /spr" orb0.spr` gives you exactly the bytes
  described here.

## Scenes (`/pic`, our `.gek`)

A 160×200 multicolour bitmap with four colours.

| offset | size | contents |
|---|---|---|
| 0–1 | 2 | load address `$A000` (`00 A0`) |
| 2–4 | 3 | `GEK` |
| 5 | 1 | `$00` = uncompressed, `$FF` = RLE |
| 6 | 8000 | pixel data, or RLE pairs that expand to it |
| 8006 | 10 | footer |

**Pixel data.** Each byte holds 4 pixels, 2 bits each, leftmost in bits 7–6. The bytes are
grouped in **4×8 tiles** of 8 bytes, top row first. Tiles run left to right, 40 to a row, for 25
rows. A tile therefore has exactly the layout of a C64 character glyph in multicolour mode,
which is why `fit-angel.mjs` can cluster the tiles straight into a charset.

**Pixel value to colour:** `0` = background, `1` = colour 1, `2` = colour 2, `3` = colour 3.

**Footer** (offsets from its start):

| byte | contents |
|---|---|
| 0 | colour 1 in the high nibble, colour 2 in the low nibble |
| 1 | colour 3 (low nibble) |
| 2 | background (low nibble) |
| 3–8 | scene name, 6 PETSCII characters |
| 9 | padding |

**RLE** (flag `$FF`): everything after the header is `(count−1, value)` byte pairs, so `$00`
means one copy and `$FF` means 256. The footer is RLE-encoded along with the image, so expand
the whole stream to 8,010 bytes and then split it.

## Sprites (`/spr`, our `.spr`)

One logical sprite is up to four C64 hardware sprites, called **quads** (24×21 each). Each quad
holds 1–31 frames.

**File layout:**
1. A 37-byte main header, which also describes quad 1.
2. Quad 1's frames.
3. For each further quad: a 32-byte subheader, then that quad's frames.

Each frame is 64 bytes: 63 bytes of pixels and one pad byte. The file's very last frame may
lack its pad byte, so a reader must not require it. GMC64's `serialize()` always drops it.
Among our files, `icoorb.spr` (100 bytes) and `angel.spr` (37 + 64 + 32 + 63 = 196) lack it,
while the orbs and the cube keep it (37 + 64 = 101).

### Main header (37 bytes)

| offset | contents |
|---|---|
| 0–1 | load address `$601D` (`1D 60`) |
| 2–4 | `GEK` |
| 5–10 | name, 6 PETSCII characters |
| 11 | always `$01` |
| 12 | colour for pixel `01` (GameMaker's "Color 2"; multicolour only) |
| 13 | colour for pixel `11` (GameMaker's "Color 3"; multicolour only) |
| 14 | mode: `0` = hi-res, non-zero = multicolour |
| 15 | animation frame count − 1 (0–30) |
| 16 | x-double (non-zero = on) |
| 17 | y-double (non-zero = on) |
| 18 | background colour (transparent in a game) |
| 19 | number of quads − 1 (0–3) |
| 20–21 | this quad's data size, little-endian: **frames stored = (size − 32) / 64** |
| 24 | x position, low byte, in hi-res pixels, measured to the sprite's right edge (subtract 24) |
| 25 | y position, 50–229 for screen rows 0–179 |
| 26 | bit 4 set = add 256 to x |
| 27 | which quad this is − 1 |
| 28 | colour for pixel `10` (GameMaker's "Color 1", the sprite's own colour); the only colour a hi-res sprite uses |

The data size can count more frames than the animation count (byte 15) uses. The extra
"hidden" frames are still stored, so always step through the file by the data size.

### Subheader (32 bytes, quads 2–4)

This is the main header without the 5-byte load-address-and-`GEK` prefix. Any main-header field
at offset *n* is at *n* − 5 here. There are a few differences:

| offset | contents |
|---|---|
| 0 | `$2D` marker |
| 1–5 | name, 5 characters |
| 6 | always `$01` |
| 15–16 | this quad's data size (main 20–21 − 5) |
| 17 | x offset from quad 1, **signed**, in fat (multicolour) pixels for both modes |
| 18 | y offset from quad 1, signed, in rows |
| 19–20 | the quad's absolute position |

Subheaders repeat the colour bytes, but the hardware gives a logical sprite one palette, so
GMC64 ignores them and uses the main header's colours for every quad.

### Pixels

Each frame is 21 rows of 3 bytes, leftmost pixel in the high bits:
- **Multicolour:** 12 fat pixels a row, 2 bits each. `00` is transparent; `01`, `10` and `11` take
  the colours at main-header bytes 12, 28 and 13.
- **Hi-res:** 24 pixels a row, 1 bit each. `1` takes byte 28.

## What we hold

From the GameMaker disk `TMP-3.d64`, deleted 2026-10-09 once its files were extracted here:

| file | what |
|---|---|
| `hangl1.gek` | the angel face (colours: background 0, then 11, 15, 12); `fit-angel.mjs` → `data/angel-face.json` |
| `hangl2.gek` | a second face, unused |
| `angel.spr` | multicolour, two quads stacked (offset 0, 21) into a 24×42 figure, greys 11/12/15 |
| `cube.spr`, `orb0`–`orb6.spr` | multicolour, one quad, one frame each |
| `icoorb.spr` | hi-res, one quad, one frame, colour 11 |

None of the sprites is used by the build. The game's sprites are fitted from renders in `art/`.
