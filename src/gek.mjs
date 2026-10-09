import { readFileSync, writeFileSync } from 'fs';
// GEK scene: 2-byte load addr + "GEK" + RLE flag, then 8000 bytes of 160x200 multicolor stored
// as 4x8 TILES of 8 bytes -- which is already exactly a C64 char glyph -- then a 10-byte footer
// carrying the three global colours, the background, and a 6-char name. GMC64's scene format: the
// reference reader is ../GMC64/code/js/gmScene.js (sprites, art/gamemaker/*.spr: gmSprite.js).
export function readGek(path) {
  let d = new Uint8Array(readFileSync(path));
  const HDR = 6, IMG = 8000, FOOT = 10;
  if (d[5] === 0xff) {
    const out = new Uint8Array(HDR + IMG + FOOT);
    out.set(d.slice(0, HDR));
    let w = HDR;
    for (let i = HDR; i < d.length; i += 2)
      for (let r = 0; r <= d[i]; r++) out[w++] = d[i + 1];
    d = out;
  }
  const img = d.slice(HDR, HDR + IMG), f = d.slice(HDR + IMG);
  return { img, c1: f[0] >> 4, c2: f[0] & 15, c3: f[1] & 15, bg: f[2] & 15,
           name: String.fromCharCode(...f.slice(3, 9)).trim() };
}
