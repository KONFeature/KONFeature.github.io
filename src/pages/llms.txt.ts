// Build-time llms.txt (https://llmstxt.org).
//
// This replaces the old hand-run `scripts/generate-llms-txt.mjs` + static
// `public/llms.txt` pair. That setup drifted: the script was never in the build
// chain, so publishing an article silently left llms.txt stale, and it also kept
// hand-copied duplicates of SITE_DESCRIPTION and ARTICLE_GROUPS that had already
// diverged from the real ones.
//
// Generating from the content collection means it cannot go stale.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ARTICLE_GROUPS } from '../articleGroups';
import {
	SITE_TITLE,
	SITE_DESCRIPTION,
	SITE_URL,
	JOB_TITLE,
	AVAILABILITY,
	CALENDLY_URL,
} from '../consts';

// Always yields exactly one leading and one trailing slash, matching the canonicals.
const url = (path: string) => {
	const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
	return clean ? `${SITE_URL}/${clean}/` : `${SITE_URL}/`;
};

export const GET: APIRoute = async () => {
	const articles = (await getCollection('articles'))
		.filter((a) => !a.data.draft)
		// Real recency. The old script sorted reverse-alphabetically by file id, so an
		// LLM reading list order as "most recent" got the wrong answer.
		.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

	const projects = (await getCollection('projects'))
		.filter((p) => !p.data.draft)
		.sort((a, b) => a.data.order - b.data.order);

	const out: string[] = [
		`# ${SITE_TITLE}`,
		'',
		`> ${SITE_DESCRIPTION}`,
		'',
		`Personal portfolio and technical blog of ${SITE_TITLE} (${JOB_TITLE}). ` +
			`${articles.length} long-form engineering write-ups, each based on systems actually shipped to production. ` +
			`Recurring topics: ERC-4337 / ERC-7579 account abstraction, WebAuthn and passkeys, Solidity, ` +
			`Kubernetes and self-hosted infrastructure, and embedded firmware. ` +
			`Available for consulting from ${AVAILABILITY}: ${CALENDLY_URL}`,
		'',
		'## Site sections',
		'',
		`- [Home](${url('/')}): Overview, latest articles, selected work.`,
		`- [About](${url('/about')}): Background, career history, and contact details.`,
		`- [All articles](${url('/articles')}): Complete archive of ${articles.length} engineering deep-dives.`,
		`- [Projects](${url('/projects')}): Real systems with role, stack, and metrics.`,
		`- [RSS feed](${SITE_URL}/rss.xml): Article feed.`,
		'',
		'## Projects',
		'',
		...projects.map((p) => `- [${p.data.name}](${url(`/projects/${p.id}`)}): ${p.data.description}`),
		'',
	];

	const groupIds = Object.keys(ARTICLE_GROUPS).sort(
		(a, b) => ARTICLE_GROUPS[a].order - ARTICLE_GROUPS[b].order
	);
	const grouped = new Set<string>();

	for (const id of groupIds) {
		const inGroup = articles.filter((a) => a.data.group === id);
		if (inGroup.length === 0) continue;
		const g = ARTICLE_GROUPS[id];
		out.push(
			`## ${g.name}`,
			'',
			g.description,
			'',
			`- [${g.name} index](${url(`/articles/${id}`)}): All ${inGroup.length} articles in this series.`
		);
		for (const a of inGroup) {
			grouped.add(a.id);
			out.push(`- [${a.data.title}](${url(`/articles/${a.id}`)}): ${a.data.description}`);
		}
		out.push('');
	}

	// Anything whose group has no ARTICLE_GROUPS entry still has to appear, or it
	// becomes invisible to every LLM reading this file.
	const ungrouped = articles.filter((a) => !grouped.has(a.id));
	if (ungrouped.length > 0) {
		out.push('## Other articles', '');
		for (const a of ungrouped) {
			out.push(`- [${a.data.title}](${url(`/articles/${a.id}`)}): ${a.data.description}`);
		}
		out.push('');
	}

	return new Response(out.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
