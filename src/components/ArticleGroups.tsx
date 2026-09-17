import React from 'react';
import { ARTICLE_GROUPS, type ArticleGroup } from '../articleGroups';

/**
 * Shared pieces for the article archive and the per group hubs. The card grid
 * that used to live here is gone: the groups are now the spine of
 * ArticlesPage, so this file only holds the grouping data and the one row
 * component both surfaces render.
 */

export interface ArticleData {
	id: string;
	title: string;
	subtitle?: string;
	category: string;
	tags: string[];
	readTime: string;
	date: Date | string;
	icon: string;
	iconColor?: string;
	description: string;
	slug: string;
	githubUrl?: string;
	group?: string;
}

export interface ArticleGroupSection {
	id: string;
	name: string;
	description: string;
	/** Link to the group hub. Absent for articles with no known group. */
	href?: string;
	articles: ArticleData[];
}

/**
 * Reading order of the archive: the long running project series first, then
 * the looser collections. Groups outside this list fall back to the `order`
 * field in ARTICLE_GROUPS.
 */
export const ARTICLE_GROUP_ORDER = [
	'frak',
	'atelier',
	'kiln',
	'cooking-bot',
	'scenario-parser',
	'web3',
	'side-projects',
];

const UNGROUPED_ID = 'ungrouped';

function toTime(date: Date | string): number {
	return new Date(date).getTime();
}

function rank(groupId: string, group: ArticleGroup | undefined): number {
	const explicit = ARTICLE_GROUP_ORDER.indexOf(groupId);
	if (explicit !== -1) return explicit;
	return ARTICLE_GROUP_ORDER.length + (group?.order ?? 0);
}

/**
 * Buckets articles by their group, newest first inside each bucket. Articles
 * with no known group are kept in a trailing section so nothing ever drops
 * out of the archive.
 */
export function groupArticles(articles: ArticleData[]): ArticleGroupSection[] {
	const buckets = new Map<string, ArticleData[]>();

	for (const article of articles) {
		const groupId = article.group && ARTICLE_GROUPS[article.group] ? article.group : UNGROUPED_ID;
		const bucket = buckets.get(groupId);
		if (bucket) {
			bucket.push(article);
		} else {
			buckets.set(groupId, [article]);
		}
	}

	return Array.from(buckets.entries())
		.sort(([a], [b]) => {
			if (a === UNGROUPED_ID) return 1;
			if (b === UNGROUPED_ID) return -1;
			return rank(a, ARTICLE_GROUPS[a]) - rank(b, ARTICLE_GROUPS[b]);
		})
		.map(([groupId, groupArticleList]) => {
			const sorted = [...groupArticleList].sort((a, b) => toTime(b.date) - toTime(a.date));
			const group = ARTICLE_GROUPS[groupId];

			if (!group) {
				return {
					id: UNGROUPED_ID,
					name: 'Everything else',
					description: 'Standalone pieces that are not part of a longer project series.',
					articles: sorted,
				};
			}

			return {
				id: groupId,
				name: group.name,
				description: group.description,
				href: `/articles/${groupId}/`,
				articles: sorted,
			};
		});
}

export function formatArticleDate(date: Date | string): string {
	return new Date(date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC',
	});
}

/**
 * Article `category` is a data-model slug (`system-design`, `devops`). This is the one
 * place it is rendered to a visitor, so the mapping lives next to the row that needs it.
 */
const CATEGORY_LABELS: Record<string, string> = {
	'system-design': 'System design',
	devops: 'DevOps',
	electronics: 'Electronics',
	mobile: 'Mobile',
	tooling: 'Tooling',
	engineering: 'Engineering',
	ai: 'AI',
	opinion: 'Opinion',
	solidity: 'Solidity',
};

export function formatCategory(category: string): string {
	return CATEGORY_LABELS[category] ?? category;
}

interface ArticleRowProps {
	article: ArticleData;
	/**
	 * Collapsed rows stay in the DOM and are hidden with CSS so crawlers and
	 * Pagefind still see every article anchor.
	 */
	collapsed?: boolean;
	/**
	 * h3 under a group heading on the archive, h2 on a hub page where the
	 * group name is the h1.
	 */
	titleAs?: 'h2' | 'h3';
}

/**
 * One archive row: date column, title, one line of context, then the category
 * and read time. Shared by /articles/ and every /articles/<group>/ hub.
 */
export const ArticleRow: React.FC<ArticleRowProps> = ({
	article,
	collapsed = false,
	titleAs: Title = 'h3',
}) => {
	const date = new Date(article.date);
	const context = article.subtitle || article.description;

	return (
		<li className={`border-t border-rule ${collapsed ? 'hidden' : ''}`}>
			<a
				href={`/articles/${article.slug}/`}
				className="group grid grid-cols-1 gap-x-6 gap-y-1 py-3 md:grid-cols-[6.5rem_1fr] md:items-baseline lg:grid-cols-[6.5rem_minmax(0,1fr)_11rem]"
			>
				<time dateTime={date.toISOString()} className="font-mono text-xs text-ink-3">
					{formatArticleDate(date)}
				</time>
				<div className="min-w-0 md:col-start-2">
					<Title className="text-base font-medium text-ink underline-offset-4 decoration-rule-strong group-hover:underline md:text-lg">
						{article.title}
					</Title>
					{context && <p className="mt-0.5 truncate text-sm text-ink-2">{context}</p>}
				</div>
				{/* Meta sits under the title until lg, where it moves to its own column, each on its own line so nothing chains into a dot pair. */}
				<div className="text-xs text-ink-3 md:col-start-2 lg:col-start-3 lg:row-start-1 lg:text-right">
					<p className="font-mono">{article.readTime}</p>
					<p>{formatCategory(article.category)}</p>
				</div>
			</a>
		</li>
	);
};

export default ArticleRow;
