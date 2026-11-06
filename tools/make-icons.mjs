// Generates the PNG app icons (no dependencies). Run: node tools/make-icons.mjs
// Design: teal tile, white "calorie ring" (75% filled) with a dumbbell in the middle.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../icons/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const BG = [15, 118, 110];      // #0f766e
const WHITE = [255, 255, 255];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const S = 4; // supersampling
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const [pr, pg, pb, pa] = pixel((x + (sx + 0.5) / S) / size, (y + (sy + 0.5) / S) / size);
        r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round((a / (S * S)) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= x0 && x <= x1 && y >= y0 && y <= y1;
};
const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

function design({ rounded, scale = 1 }) {
  return (u, v) => {
    // background
    if (rounded && !inRoundRect(u, v, 0, 0, 1, 1, 0.22)) return [0, 0, 0, 0];
    // work in a scaled coordinate system centred on the tile
    const x = (u - 0.5) / scale, y = (v - 0.5) / scale;
    const d = Math.hypot(x, y);
    const R = 0.29, T = 0.075;
    if (Math.abs(d - R) <= T / 2) {
      // angle from 12 o'clock, clockwise, 0..1
      let ang = Math.atan2(x, -y) / (2 * Math.PI);
      if (ang < 0) ang += 1;
      return ang <= 0.75 ? [...WHITE, 1] : [...WHITE, 0.35].map((c, i) => (i < 3 ? Math.round(c * 0.35 + BG[i] * 0.65) : 1));
    }
    // dumbbell
    const bar = inRect(x, y, -0.11, -0.018, 0.11, 0.018);
    const plateL = inRoundRect(x, y, -0.15, -0.075, -0.095, 0.075, 0.015);
    const plateR = inRoundRect(x, y, 0.095, -0.075, 0.15, 0.075, 0.015);
    if (bar || plateL || plateR) return [...WHITE, 1];
    return [...BG, 1];
  };
}

writeFileSync(OUT + 'icon-192.png', png(192, design({ rounded: true })));
writeFileSync(OUT + 'icon-512.png', png(512, design({ rounded: true })));
writeFileSync(OUT + 'icon-maskable-512.png', png(512, design({ rounded: false, scale: 0.8 })));
writeFileSync(OUT + 'apple-touch-icon.png', png(180, design({ rounded: false })));
console.log('Icons written to', OUT);
