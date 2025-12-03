// Simple icon generation script
// Run with: node scripts/generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base64 encoded 1x1 blue pixel PNG as placeholder
// In production, replace with actual icons
const sizes = [16, 32, 48, 128];

// Create a simple SVG icon
const createSvgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#1b2554"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.5}">ES</text>
</svg>`;

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG icons (can be converted to PNG using online tools or canvas)
sizes.forEach(size => {
  const svg = createSvgIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
  console.log(`Created icon${size}.svg`);
});

console.log('\\nSVG icons created. Convert to PNG for Chrome extension.');
console.log('You can use online tools like https://svgtopng.com/ or Figma.');

