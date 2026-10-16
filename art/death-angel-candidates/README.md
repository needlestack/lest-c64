# Death-scene angel candidates (2026-10-15)

The picture the game shows when an angel takes you, fitted from the user's statue art
(`art/hasterot-angel-N-sword.png`) into the scene's multicolour charset: four inks (mid grey,
dark grey, light grey, black), one map of 40x25 cells, at most ~200 glyphs (the image's budget).
Each candidate is a `.json` asset (what `tools/build-facetest3.mjs` writes) and its `.png`
(`node tools/renderpic.mjs X.json 0 X.png`). Any of them can be shipped by copying its `.json`
to `data/death-pics.json`.

**SHIPPED: `g20-s3`** -- its full recipe is in `data/death-pics.json` (`recipe`).

Common settings unless noted: source `art/death-angel-v5-85.png` (v5 at 85%, bottom-anchored on
off-white), `FACEBGFILL=1` (background = bright pixels connected to the top/sides, so the sword
survives), `FACEMAGICK="-clahe 25x25%+128+3"` (local contrast), `FACEEDGE=2,0.4` (darkens a
2-pixel band inside the silhouette, so the lit rim does not halo), `FACEGAMMA=1.5`, `KONE=200`,
`SPLITROW=9` and `TRAIN=top,all` (the face band counted twice).

| candidate | what differs |
|---|---|
| g20-s3 | grit 20, seam-aware refit 3 (`FACEGRIT=20 FACESEAM=3`) -- SHIPPED |
| g40-s3 | grit 40, seam 3: the user's favourite body; a 5-pixel light bar across the nose |
| g30-s3 | grit 30, seam 3 |
| g20top40-s3 | grit 20 in the face band, 40 below (`FACEGRITTOP=20 FACEGRITROW=72`) |
| g20top40-sword20-s3 | as above, plus grit 20 on the sword's bright pixels (`FACEGRITBOX=66,120,86,199,20,0.8`) |
| g40-s3-facerun4 | g40-s3 with the face-band light-bar rule (`FACERUN=4`): the nose bar gone, 2 cells changed |
| center-c4/c6/c8 | g40 body (fitted at 192) with g20's face copied EXACTLY in the centre 4/6/8 cells (`tools/compose-face.mjs ... all`) |
| edge2 / edge2-256 | grit 40, no seam refit; 200 and 256 glyphs |
| v3/v4/v6-85-200 | the other source revisions, grit 40, no seam refit, no edge darkening |

What mattered, in order: a smaller figure (cells per glyph near the original angel's 1.9),
local contrast, the seam-aware refit (blockiness), then grit. Fit error (RMS) guided but did not
decide: the user judges what LOOKS good and what draws the eye.
