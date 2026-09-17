// Generates public/llms.txt (https://llmstxt.org) describing the site and its articles for AI crawlers.
// Run after content edits so descriptions are current: node scripts/generate-llms-txt.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)) + '/..');
const base = path.join(root, 'src', 'content', 'articles');
const SITE = 'https://nivelais.com';

// Site description mirrors src/consts.ts (kept in sync manually)
const SITE_TITLE = 'Quentin Nivelais';
const SITE_DESC = 'Web3 Infrastructure Architect & Account Abstraction Specialist. CTO at Frak Labs. Deep technical articles on blockchain, smart contracts, and infrastructure.';

// Group display names kept in sync with src/articleGroups.ts
const GROUP_NAMES = {
  'frak': 'Frak Labs',
  'cooking-bot': 'Cooking Bot',
  'web3': 'Web3 & Solidity',
  'side-projects': 'Side Projects',
  'atelier': "L'Atelier",
  'kiln': 'Pico Kiln',
  'scenario-parser': 'Scenario Parser',
  'devops': 'DevOps',
  'mobile': 'Mobile',
  'opinion': 'Opinions',
};

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(md|mdx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const articles = walk(base).map((p) => {
  const id = path.relative(base, p).replace(/\.(md|mdx)$/, '');
  const fm = readFileSync(p, 'utf8').split('---')[1] || '';
  const get = (key) => ((fm.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '').trim();
  return { id, title: get('title'), desc: get('description'), group: get('group'), draft: /^draft:\s*true/m.test(fm) };
}).filter((a) => !a.draft && a.id);

const lines = [
  `# ${SITE_TITLE}`,
  '',
  `> ${SITE_DESC}`,
  '',
  'This is the personal portfolio and technical blog of Quentin Nivelais (CTO at Frak Labs). Content is written for engineers working on blockchain infrastructure, account abstraction (ERC-4337 / ERC-7579), WebAuthn & passkeys, smart contracts, and production DevOps.',
  '',
  '## Site sections',
  '',
  `- [Home](${SITE}/): Portfolio overview, latest articles, selected work.`,
  `- [All articles](${SITE}/articles/): Complete archive of 40+ engineering deep-dives.`,
  `- [Projects](${SITE}/projects/): Real-world systems with role and architecture notes.`,
  '- [RSS feed](' + SITE + '/rss.xml): Full-text article feed.',
  '',
];

const groups = [...new Set(articles.map((a) => a.group || 'uncategorized'))];
for (const g of groups) {
  lines.push(`## ${GROUP_NAMES[g] || g}`);
  lines.push('');
  for (const a of articles.filter((x) => (x.group || 'uncategorized') === g).sort((x, y) => y.id.localeCompare(x.id))) {
    lines.push(`- [${a.title}](${SITE}/articles/${a.id}/): ${a.desc}`);
  }
  lines.push('');
}

writeFileSync(path.join(root, 'public', 'llms.txt'), lines.join('\n'));
console.log(`public/llms.txt generated: ${articles.length} articles in ${groups.length} groups`);
