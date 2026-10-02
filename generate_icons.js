// generate_icons.js — gera os ícones PNG para ACELERERILSON
// Execute: node generate_icons.js
// Requires: npm install canvas

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;
  const p = s * 0.06; // padding

  // Background - black with rounded feel
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  const r = s * 0.15;
  ctx.roundRect(0, 0, s, s, r);
  ctx.fill();

  // Subtle green glow bg
  const grd = ctx.createRadialGradient(s * 0.5, s * 0.5, 0, s * 0.5, s * 0.5, s * 0.5);
  grd.addColorStop(0, 'rgba(0,255,102,0.07)');
  grd.addColorStop(1, 'rgba(0,255,102,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.roundRect(0, 0, s, s, r);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(0,255,102,0.4)';
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.roundRect(ctx.lineWidth / 2, ctx.lineWidth / 2, s - ctx.lineWidth, s - ctx.lineWidth, r);
  ctx.stroke();

  // Lightning bolt (left)
  ctx.fillStyle = '#00FF66';
  ctx.shadowColor = '#00FF66';
  ctx.shadowBlur = s * 0.15;

  const lx = s * 0.12;
  const bolt = new Path2D();
  bolt.moveTo(lx + s * 0.28, p);
  bolt.lineTo(lx + s * 0.06, s * 0.52);
  bolt.lineTo(lx + s * 0.18, s * 0.52);
  bolt.lineTo(lx - s * 0.01, s - p);
  bolt.lineTo(lx + s * 0.24, s * 0.48);
  bolt.lineTo(lx + s * 0.12, s * 0.48);
  bolt.closePath();
  ctx.fill(bolt);

  // Double arrow (right)
  ctx.shadowBlur = s * 0.1;
  const ax = s * 0.52;
  const aw = s * 0.18;
  const ah = s * 0.28;
  const ay = s * 0.36;
  const gap = s * 0.04;

  // Arrow 1
  const a1 = new Path2D();
  a1.moveTo(ax, ay);
  a1.lineTo(ax + aw, ay + ah);
  a1.lineTo(ax, ay + ah * 2);
  a1.lineTo(ax + aw * 0.55, ay + ah);
  a1.closePath();
  ctx.fill(a1);

  // Arrow 2
  const a2 = new Path2D();
  a2.moveTo(ax + aw * 0.6, ay);
  a2.lineTo(ax + aw * 0.6 + aw, ay + ah);
  a2.lineTo(ax + aw * 0.6, ay + ah * 2);
  a2.lineTo(ax + aw * 0.6 + aw * 0.55, ay + ah);
  a2.closePath();
  ctx.globalAlpha = 0.65;
  ctx.fill(a2);
  ctx.globalAlpha = 1.0;

  ctx.shadowBlur = 0;

  return canvas.toBuffer('image/png');
}

sizes.forEach(size => {
  const buffer = drawIcon(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ icon${size}.png gerado`);
});

console.log('\n⚡ Todos os ícones ACELERERILSON gerados com sucesso!');
