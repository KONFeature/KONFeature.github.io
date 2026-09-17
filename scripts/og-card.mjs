/**
 * Renders public/og-default.png, the fallback social card.
 *
 * The card uses the same tokens, type and accent rule as the site: monochrome
 * surface, Archivo for the name and positioning, IBM Plex Mono for the measured
 * facts, and the accent only on the numbers.
 *
 * Run with: node scripts/og-card.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontDir = path.join(root, 'node_modules');
const archivo = path.join(fontDir, '@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2');
const plex = path.join(fontDir, '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2');

const facts = [
	{ value: '100k+', label: 'daily wallet loads' },
	{ value: '-85%', label: 'infra cost' },
	{ value: '1222°C', label: 'kiln firmware' },
];

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Archivo'; src: url('file://${archivo}') format('woff2-variations'); font-weight: 100 900; }
@font-face { font-family: 'Plex'; src: url('file://${plex}') format('woff2'); font-weight: 500; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 1200px; height: 630px; background: #101418; color: #aeb7c0;
  font-family: 'Archivo', sans-serif; -webkit-font-smoothing: antialiased;
  padding: 0 80px 68px; display: flex; flex-direction: column; justify-content: flex-end; gap: 64px;
}
h1 { font-size: 82px; font-weight: 600; color: #eef1f4; letter-spacing: -0.03em; line-height: 1; }
p { font-size: 32px; line-height: 1.3; max-width: 31ch; margin-top: 24px; letter-spacing: -0.014em; }
.facts { display: flex; gap: 56px; align-items: baseline; }
.value { font-family: 'Plex', monospace; font-size: 30px; font-weight: 500; color: #ff6a3d; letter-spacing: -0.01em; }
.label { font-size: 18px; color: #9ba3ac; margin-top: 6px; }
footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #262d35; padding-top: 28px; }
.site { font-family: 'Plex', monospace; font-size: 18px; color: #9ba3ac; }
</style></head>
<body>
  <div>
    <h1>Quentin Nivelais</h1>
    <p>Systems engineer. Smart wallets, self-hosted infrastructure, firmware.</p>
  </div>
  <footer>
    <div class="facts">
      ${facts.map((f) => `<div><div class="value">${f.value}</div><div class="label">${f.label}</div></div>`).join('')}
    </div>
    <div class="site">nivelais.com</div>
  </footer>
</body></html>`;

const tmp = path.join(os.tmpdir(), 'og-card.html');
await writeFile(tmp, html, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`file://${tmp}`);
await page.waitForTimeout(400);
await mkdir(path.join(root, 'public'), { recursive: true });
await page.screenshot({ path: path.join(root, 'public/og-default.png') });
await browser.close();
console.log('wrote public/og-default.png');
