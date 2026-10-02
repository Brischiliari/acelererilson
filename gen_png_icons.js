// gen_png_icons.js — Gera ícones PNG puros sem dependências externas
// Usa escrita manual de pixels PNG via zlib (built-in no Node.js)
// Execute: node gen_png_icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// ─── PNG Encoder (minimal, sem dependências) ───────────────────────────────
function writePNG(width, height, pixels) {
  // pixels: Uint8Array of RGBA, row-major

  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let val = i;
      for (let j = 0; j < 8; j++) val = (val & 1) ? (0xedb88320 ^ (val >>> 1)) : (val >>> 1);
      table[i] = val;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBytes, data]);
    crcBuf.writeUInt32BE(crc32(combined));
    return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB color type (we'll embed alpha manually as RGBA=6)
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT - filter type 0 (None) for each row
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rawRows.push(pixels[idx], pixels[idx+1], pixels[idx+2], pixels[idx+3]);
    }
  }
  const rawData = Buffer.from(rawRows);
  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ─── Icon Rasterizer ──────────────────────────────────────────────────────
function rasterizeIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
  }

  function blendPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    const alpha = a / 255;
    pixels[i]   = Math.round(pixels[i]   * (1 - alpha) + r * alpha);
    pixels[i+1] = Math.round(pixels[i+1] * (1 - alpha) + g * alpha);
    pixels[i+2] = Math.round(pixels[i+2] * (1 - alpha) + b * alpha);
    pixels[i+3] = Math.min(255, pixels[i+3] + a);
  }

  function drawFilledPolygon(polyPoints, r, g, b, a) {
    // Scanline fill
    let minY = Infinity, maxY = -Infinity;
    polyPoints.forEach(([px, py]) => {
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    });
    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(size - 1, Math.ceil(maxY));

    for (let y = minY; y <= maxY; y++) {
      const intersections = [];
      const n = polyPoints.length;
      for (let i = 0; i < n; i++) {
        const [x1, y1] = polyPoints[i];
        const [x2, y2] = polyPoints[(i + 1) % n];
        if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
          const t = (y - y1) / (y2 - y1);
          intersections.push(x1 + t * (x2 - x1));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let k = 0; k < intersections.length - 1; k += 2) {
        const x1 = Math.max(0, Math.round(intersections[k]));
        const x2 = Math.min(size - 1, Math.round(intersections[k + 1]));
        for (let x = x1; x <= x2; x++) {
          blendPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  function drawRoundedRect(x, y, w, h, rx, r, g, b, a) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        const dx = Math.max(x + rx - px, 0, px - (x + w - rx));
        const dy = Math.max(y + rx - py, 0, py - (y + h - rx));
        if (Math.sqrt(dx * dx + dy * dy) <= rx) {
          blendPixel(px, py, r, g, b, a);
        }
      }
    }
  }

  const S = size;

  // Background (black, full rounded rect)
  drawRoundedRect(0, 0, S, S, Math.round(S * 0.15), 0, 0, 0, 255);

  // Subtle gray glow
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x - S/2, dy = y - S/2;
      const dist = Math.sqrt(dx*dx + dy*dy) / (S * 0.5);
      if (dist < 1.0) {
        const alpha = Math.round(18 * (1 - dist));
        blendPixel(x, y, 229, 229, 229, alpha);
      }
    }
  }

  // Border (gray, 1px rounded rect outline approximation)
  const bw = Math.max(1, Math.round(S * 0.035));
  const rad = Math.round(S * 0.15);
  for (let t = 0; t < bw; t++) {
    // Top/bottom
    for (let x = rad; x < S - rad; x++) {
      blendPixel(x, t, 140, 140, 140, 100);
      blendPixel(x, S - 1 - t, 140, 140, 140, 100);
    }
    // Left/right
    for (let y = rad; y < S - rad; y++) {
      blendPixel(t, y, 140, 140, 140, 100);
      blendPixel(S - 1 - t, y, 140, 140, 140, 100);
    }
  }

  // Lightning bolt (gray)
  drawFilledPolygon([
    [S * 0.38, S * 0.06],
    [S * 0.14, S * 0.52],
    [S * 0.27, S * 0.52],
    [S * 0.10, S * 0.94],
    [S * 0.38, S * 0.48],
    [S * 0.24, S * 0.48],
  ], 229, 229, 229, 255);

  // Arrow 1 (bright)
  drawFilledPolygon([
    [S * 0.52, S * 0.22],
    [S * 0.74, S * 0.50],
    [S * 0.52, S * 0.78],
    [S * 0.63, S * 0.50],
  ], 229, 229, 229, 255);

  // Arrow 2 (dimmer)
  drawFilledPolygon([
    [S * 0.69, S * 0.22],
    [S * 0.93, S * 0.50],
    [S * 0.69, S * 0.78],
    [S * 0.80, S * 0.50],
  ], 229, 229, 229, 140);

  return pixels;
}

// ─── Main ─────────────────────────────────────────────────────────────────
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const pixels = rasterizeIcon(size);
  const pngData = writePNG(size, size, pixels);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, pngData);
  console.log(`✅ icon${size}.png (${pngData.length} bytes)`);
});

console.log('\n⚡ ACELERERILSON ícones gerados com sucesso!');

