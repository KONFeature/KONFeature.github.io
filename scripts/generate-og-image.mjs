// Generates the default Open Graph card (1200x630) used when a page has no hero image.
// Run: node scripts/generate-og-image.mjs
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <rect x="80" y="96" width="64" height="6" fill="#3b82f6"/>
  <text x="80" y="300" font-family="Helvetica, Arial, sans-serif" font-size="76" font-weight="700" fill="#fafafa" letter-spacing="-2">Quentin Nivelais</text>
  <text x="80" y="366" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="400" fill="#a3a3a3">Web3 Infrastructure Architect · Account Abstraction</text>
  <text x="80" y="546" font-family="Menlo, monospace" font-size="26" fill="#737373">nivelais.com</text>
</svg>
`;

await sharp(Buffer.from(svg)).png().toFile(path.join(root, 'public/og-default.png'));
console.log('public/og-default.png generated (1200x630)');
