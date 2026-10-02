// generate_icons_svg.js — gera ícones SVG e PNG via sharp/puro-svg
// Esta versão usa apenas SVG inline + jimp (se disponível) ou gera SVGs puro
// Execute: node generate_icons_svg.js

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Gera SVG como string
function generateSVG(size) {
  const s = size;
  const r = Math.round(s * 0.15);
  
  // Scale factors
  const boltX = s * 0.08;
  const boltW = s * 0.38;
  const arrowX = s * 0.52;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00FF66" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#00FF66" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${s * 0.05}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${s}" height="${s}" rx="${r}" ry="${r}" fill="#000000"/>
  <rect width="${s}" height="${s}" rx="${r}" ry="${r}" fill="url(#bg-glow)"/>
  
  <!-- Border -->
  <rect x="1" y="1" width="${s - 2}" height="${s - 2}" rx="${r - 1}" ry="${r - 1}"
    fill="none" stroke="rgba(0,255,102,0.45)" stroke-width="${Math.max(1, Math.round(s * 0.03))}"/>

  <!-- Lightning Bolt -->
  <polygon
    points="
      ${s * 0.38},${s * 0.06}
      ${s * 0.14},${s * 0.52}
      ${s * 0.28},${s * 0.52}
      ${s * 0.10},${s * 0.94}
      ${s * 0.38},${s * 0.48}
      ${s * 0.24},${s * 0.48}
    "
    fill="#00FF66"
    filter="url(#glow)"
  />

  <!-- Arrow 1 -->
  <polygon
    points="
      ${s * 0.53},${s * 0.22}
      ${s * 0.73},${s * 0.50}
      ${s * 0.53},${s * 0.78}
      ${s * 0.63},${s * 0.50}
    "
    fill="#00FF66"
    opacity="1"
    filter="url(#glow)"
  />
  
  <!-- Arrow 2 -->
  <polygon
    points="
      ${s * 0.68},${s * 0.22}
      ${s * 0.92},${s * 0.50}
      ${s * 0.68},${s * 0.78}
      ${s * 0.80},${s * 0.50}
    "
    fill="#00FF66"
    opacity="0.55"
  />
</svg>`;
}

const sizes = [16, 48, 128];

sizes.forEach(size => {
  const svgContent = generateSVG(size);
  const svgPath = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(svgPath, svgContent, 'utf8');
  console.log(`✅ icon${size}.svg criado`);
});

console.log('\n⚡ SVGs gerados! Use um conversor SVG→PNG ou renomeie os .svg para .png para teste.');
console.log('   Dica: Chrome Extension aceita SVG como ícone se você alterar o manifest.');
console.log('   Para PNG real, instale: npm install sharp');
