import React, { useMemo, useState } from 'react';
import { ArticleRow, formatCategory, groupArticles, type ArticleData } from './ArticleGroups';

interface ArticlesPageProps {
	articles: ArticleData[];
}

/** Long groups show this many rows before the expand control. */
const COLLAPSED_ROWS = 6;

const ArticlesPage: React.FC<ArticlesPageProps> = ({ articles }) => {
	const [selectedCategory, setSelectedCategory] = useState<string>('all');
	const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

	// Busiest categories first, so the filter row reads as a distribution.
	const categories = useMemo(() => {
		const counts = new Map<string, number>();
		for (const article of articles) {
			counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
		}
		return Array.from(counts.entries())
			.sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB))
			.map(([name]) => name);
	}, [articles]);

	const sections = useMemo(() => {
		const visible =
			selectedCategory === 'all'
				? articles
				: articles.filter((article) => article.category === selectedCategory);
		return groupArticles(visible).filter((section) => section.articles.length > 0);
	}, [articles, selectedCategory]);

	const visibleCount = useMemo(
		() => sections.reduce((total, section) => total + section.articles.length, 0),
		[sections],
	);

	const toggleGroup = (groupId: string) => {
		setExpandedGroups((current) =>
			current.includes(groupId)
				? current.filter((id) => id !== groupId)
				: [...current, groupId],
		);
	};

	return (
		<section>
			<header className="border-b border-rule pb-8">
				<h1 className="text-3xl text-ink md:text-4xl">All articles</h1>
				<p className="mt-3 max-w-measure text-ink-2">
					Every article is filed under the project it came out of, so the failures and the fixes
					stay next to the system that produced them.
				</p>
				<p className="mt-4 text-sm text-ink-3">
					{selectedCategory === 'all' ? (
						<>
							<span className="metric-value">{visibleCount}</span> articles
						</>
					) : (
						<>
							<span className="metric-value">{visibleCount}</span> of {articles.length} articles
							in {formatCategory(selectedCategory)}
						</>
					)}
				</p>
			</header>

			<div
				className="flex flex-wrap gap-2 py-6"
				role="group"
				aria-label="Filter articles by category"
			>
				{['all', ...categories].map((category) => {
					const isActive = selectedCategory === category;
					return (
						<button
							key={category}
							type="button"
							onClick={() => setSelectedCategory(category)}
							aria-pressed={isActive}
							className={`rounded-sm border px-2.5 py-1 font-mono text-xs transition-colors ${
								isActive
									? 'border-signal text-signal'
									: 'border-rule text-ink-2 hover:border-rule-strong hover:text-ink'
							}`}
						>
							{category === 'all' ? 'All' : formatCategory(category)}
						</button>
					);
				})}
			</div>

			<div id="collections" className="space-y-14">
					{sections.map((section) => {
						const isExpanded = expandedGroups.includes(section.id);
						const isCollapsible = section.articles.length > COLLAPSED_ROWS;

						return (
							<section key={section.id} aria-labelledby={`group-${section.id}`}>
								<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
									<h2 id={`group-${section.id}`} className="text-xl font-semibold text-ink">
										{section.href ? (
											<a
												href={section.href}
												className="underline-offset-4 decoration-rule-strong hover:underline"
											>
												{section.name}
											</a>
										) : (
											section.name
										)}
									</h2>
									<p className="font-mono text-xs text-ink-3">
										{section.articles.length}{' '}
										{section.articles.length === 1 ? 'article' : 'articles'}
									</p>
								</div>

								<p className="mt-2 max-w-measure text-sm text-ink-2">{section.description}</p>

								<ul id={`group-${section.id}-list`} className="mt-5">
									{section.articles.map((article, index) => (
										<ArticleRow
											key={article.id}
											article={article}
											collapsed={isCollapsible && !isExpanded && index >= COLLAPSED_ROWS}
										/>
									))}
								</ul>

								{isCollapsible && (
									<button
										type="button"
										onClick={() => toggleGroup(section.id)}
										aria-expanded={isExpanded}
										aria-controls={`group-${section.id}-list`}
										className="mt-4 rounded-sm border border-rule px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
									>
										{isExpanded ? 'Show fewer' : `Show all ${section.articles.length}`}
									</button>
								)}
							</section>
						);
					})}
			</div>
		</section>
	);
};

export default ArticlesPage;
