// Post-build: injects <lastmod> per article URL into dist/sitemap-0.xml using git last-commit dates.
// Run automatically as part of `bun run build` (after `astro build`).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)) + '/..');
const sitemapPath = path.join(root, 'dist', 'sitemap-0.xml');

if (!existsSync(sitemapPath)) {
	console.error('add-sitemap-lastmod: dist/sitemap-0.xml not found, skipping');
	process.exit(0);
}

let xml = readFileSync(sitemapPath, 'utf8');

function gitLastmod(relFile) {
	try {
		// --follow keeps the real content history across renames. Without it, moving a
		// file resets its <lastmod> to the rename commit (or drops it entirely while the
		// rename is still uncommitted), which misreports freshness to crawlers.
		return execFileSync('git', ['log', '--follow', '-1', '--format=%cI', '--', relFile], {
			cwd: root,
			encoding: 'utf8',
		}).trim();
	} catch {
		return undefined;
	}
}

function findArticleFile(id) {
	for (const ext of ['.md', '.mdx']) {
		const candidate = path.join(root, 'src', 'content', 'articles', `${id}${ext}`);
		if (existsSync(candidate)) return path.relative(root, candidate);
	}
	return undefined;
}

// Article URLs in the sitemap look like <loc>https://nivelais.com/articles/<id>/</loc>.
// Group hub URLs (/articles/<group>/) also match this shape but have no backing file,
// so they fall out via findArticleFile returning undefined.
let injected = 0;
const missingHistory = [];
xml = xml.replace(
	/<loc>(https:\/\/nivelais\.com\/articles\/([^<]+?))\/<\/loc>/g,
	(match, url, id) => {
		const file = findArticleFile(id);
		if (!file) return match; // hub page, not an article
		const lastmod = gitLastmod(file);
		if (!lastmod) {
			missingHistory.push(id);
			return match;
		}
		injected += 1;
		return `<loc>${url}/</loc><lastmod>${lastmod}</lastmod>`;
	}
);

writeFileSync(sitemapPath, xml);
console.log(`add-sitemap-lastmod: injected ${injected} <lastmod> entries`);

// Guard: a silent drop here means articles ship without a freshness signal.
// A just-moved file has no history at its new path until the rename is committed,
// so this warns rather than fails.
if (missingHistory.length > 0) {
	console.warn(
		`add-sitemap-lastmod: WARNING ${missingHistory.length} article(s) have no git history ` +
			'and shipped without <lastmod>: ' +
			missingHistory.join(', ') +
			'\n  If you just moved these files, commit the rename and rebuild.'
	);
}
