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
		return execFileSync('git', ['log', '-1', '--format=%cI', '--', relFile], {
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

// Article URLs in the sitemap look like <loc>https://nivelais.com/articles/<id>/</loc>
let injected = 0;
xml = xml.replace(
	/<loc>(https:\/\/nivelais\.com\/articles\/([^<]+?))\/<\/loc>/g,
	(match, url, id) => {
		const file = findArticleFile(id);
		if (!file) return match;
		const lastmod = gitLastmod(file);
		if (!lastmod) return match;
		injected += 1;
		return `<loc>${url}/</loc><lastmod>${lastmod}</lastmod>`;
	}
);

writeFileSync(sitemapPath, xml);
console.log(`add-sitemap-lastmod: injected ${injected} <lastmod> entries`);
