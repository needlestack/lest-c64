# How LEST's art becomes the game

Every picture in the game comes from a source image in `art/` and code in this repository. This page
says, for each one, what the source is, what turns it into C64 data, when that runs, and the history
worth knowing. The details -- why each conversion works the way it does -- are in each tool's header
comment; this is the map. (Verified 2026-11-15: every generator below reproduces its committed data
byte for byte from these sources.)

Third-party tools used: ImageMagick (`magick`) and `acme` must be installed; exomizer is fetched by
`tools/get-exomizer.sh`; Krill's loader is in `krill/`, prebuilt.

There are two kinds:

- **Fitted on every build.** `node src/build-iray.mjs` reads the image itself and fits it to sprites
  or glyphs each time. Change the image, rebuild, and the game has the new art.
- **Made by hand, committed to `data/`.** A tool converts the image once and writes a `.json` the
  build reads. Change the image, re-run the tool, then rebuild. These are either slow (minutes of
  clustering) or need an outside program, which is why they are not part of every build.

## Fitted on every build

| in the game | source | code | notes |
|---|---|---|---|
| the angel (all sizes) | `art/angel-full.png` | `fitArt` in `src/fit-orb.mjs`, from `angPx` in build-iray | every rung is fitted from the full image at its own size, not shrunk from a smaller one -- shrinking a dither averages it to mush. `ANGELART=x` reads `art/angel-x.png` instead. |
| level 10's big angel | `art/angel-fly.png` | `fitArt`, the big angel's sets in build-iray | the image is the figure ALREADY STRETCHED: wide wings, robe and tail lengthened so the whole is as tall as the biggest sprite set needs at 36 wide. That stretch was a build step until 2026-11-15; its output became the source (the original, unstretched, is in git history). A guard fails the build if the proportions stop matching `BIG_SETS` -- then re-stretch the art. |
| the orbs (all sizes) | `art/sphere-rough.png` | `src/fit-orb.mjs` | a photoreal sphere render, three greys + transparent; every rung re-fitted from the render. `node src/fit-orb.mjs sphere-rough.png` previews it. |
| the idol (levels 5-7, the hub) | `art/goat6.png` | `fitArt` from build-iray (`IDOLART`) | a render with the silhouette painted back over it by hand -- bold strokes for the horns and ring, stippling on the face -- because a plain render's thin marks average away at 12 columns. Not dithered: a dither re-resolves at every rung and shimmers. Chosen over five earlier passes. (A hand-drawn 12x21 sprite preceded it; gone 2026-11-15.) |
| level 9's sentries | `art/silver-orb-animation-v3.png` | `src/fit-silver.mjs` | four frames in quadrants: the plain ball, then three with lightning. The ball is fitted once and reused under each frame's lightning, so it does not shimmer. |
| level 10's ball lightning | `art/ball-lightning.png` | `src/fit-bolt.mjs` | cyan and yellow on black; each rung is cut from the art turned a few degrees more, so the ball rotates as it approaches. `node src/fit-bolt.mjs out.png` previews the ladder. |
| the flute (the hub's secret) | `art/flute.png` | build-iray (`FLUTEART`) | layered hi-res sprites, one per colour, cropped and contrast-shaped from the image. |
| the pedestals' stone | `data/pedestal-art.json` | see below | the drum's SHAPE is drawn procedurally (it changes with distance); only its material comes from the photo. |
| walls, floors, seams | none | build-iray, `src/charsetgen.mjs` | geometry, not art: the wall charset is computed. See `docs/RENDERING.md`. |

## Made by hand, committed to `data/`

| data file | source | command (from the repo root) | notes |
|---|---|---|---|
| `death-pics.json` -- the death picture | `art/death-angel-v5-85.png` | `SHIPPED=1 node tools/build-facetest3.mjs` | minutes of clustering into the death scene's 256-glyph charset. The source is the original statue art (hasterot-angel-5-sword.png, in git history) scaled to 85% and bottom-anchored on off-white; that scaled image became the source 2026-11-15. The candidates tried, which settings mattered and in what order, and the shipped recipe are in the tool's header; the recipe is also in the file's `recipe` field. |
| `quote-screen.json` -- the boot quote | `art/quote-start.png` | `node src/make-quote.mjs` | a hi-res image shipped as a charset + screen map (lossless), PACKED with exomizer because it loads at KERNAL speed. **Run `tools/get-exomizer.sh` once first:** it fetches and builds exomizer 3.1.2 (Magnus Lind, zlib licence), pinned by commit, into `tools/exomizer-3.1/` (git-ignored -- ~740 KB of source we do not carry). That exact release reproduces the committed quote byte for byte. Needs `acme` on PATH for the decruncher. |
| `quote-end.json` -- the ending's quote | `art/quote-end.png` | `QUOTE_OUT=data/quote-end.json QUOTE_PACK=0 QUOTE_GLYPHS=256 node src/make-quote.mjs art/quote-end.png` | same conversion, its own charset, not packed (the fast loader brings it). |
| `title-screen.json` -- the title | `art/lest.png` | `node src/make-title.mjs` (after make-quote) | built from the boot quote's own glyph shapes used as stamps, plus up to 39 of its own -- the two share one charset. |
| `pedestal-art.json` | `art/pedestal.png` | `node src/make-pedestal-art.mjs` | two small luminance bands (top and side) lifted off the photo; the build reads the bands, not the photo. |
| `end-scene.json` -- the ending's tree | `art/tree/` | `node tools/c64pic.mjs art/tree/source.png build/tree --mc --bg 0 --regions art/tree/regions.json --sharpen 0.8 --feather 0 --branchtex 1.2 --nobrown art/tree/nobrown.json --darkmap art/tree/darkmap.json` then `node tools/endscene.mjs` | `source.png` is the picture; three masks steer the conversion. `regions.json` (trunk, branches, racks...) comes from `tools/treeseg.mjs` on source.png. `nobrown.json` and `darkmap.json` come from the user's hand edits (`edit-nobrown.png`, `edit-dark.png`, via `tools/editzones.mjs` / `editdark.mjs`) painted on earlier renders that no longer exist -- regenerating them from today's render gets within ~4%, not exactly, so **the masks are the sources** and the edits are history. endscene.mjs adds the blinking rack lights (seeded, so stable), leaves and wind. |
| `charset-plan.json` -- the wall charset's codebook | a scan of every level | per level n: `CELLSCAN=1 CELLRAND=300000 CELLVIEWS=12 LVL=n CELLOUT=build/tmp/scan-n.json node src/build-iray.mjs`; merge the per-level files' buckets into `build/cellscan.json`; then `node src/charsetgen.mjs` | not art: the scan renders thousands of views and clusters the wall cells. One scan is ONE level (LVL), and charsetgen reads one file, so the shipped plan (2026-11-14) came from a scan of each level merged by hand -- there is no committed merge script. charsetgen WRITES `data/charset-plan.json`: keep a copy. A scan build also rewrites `build/iray.asm`; rebuild plainly after. Shipped with steps weighted 6x and 197 codes (the defaults). |

## When you change art

1. Replace the image in `art/` (same name, or point the tool at the new one).
2. If it is in the first table, rebuild. If in the second, run its command, then rebuild.
3. Check it in the game, and run the tests in `docs/TESTING.md` -- a different picture means regress
   will report the frames that show it as different, which is the point.
