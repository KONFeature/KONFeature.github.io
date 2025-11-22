import React from 'react';
import { ARTICLE_GROUPS } from '../articleGroups';
import Icon from './Icon';

interface ArticleData {
	id: string;
	title: string;
	subtitle?: string;
	category: string;
	tags: string[];
	readTime: string;
	date: Date;
	icon: string;
	iconColor?: string;
	description: string;
	slug: string;
	githubUrl?: string;
	group?: string;
}

interface ArticleGroupsProps {
	articles: ArticleData[];
}

const ArticleGroups: React.FC<ArticleGroupsProps> = ({ articles }) => {
	// Group articles by their group field
	const groupedArticles = React.useMemo(() => {
		const groups = new Map<string, ArticleData[]>();

		articles.forEach(article => {
			if (article.group && ARTICLE_GROUPS[article.group]) {
				if (!groups.has(article.group)) {
					groups.set(article.group, []);
				}
				groups.get(article.group)!.push(article);
			}
		});

		// Sort articles within each group by date (newest first)
		groups.forEach((groupArticles) => {
			groupArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
		});

		// Return groups sorted by order
		return Array.from(groups.entries())
			.sort(([keyA], [keyB]) => ARTICLE_GROUPS[keyA].order - ARTICLE_GROUPS[keyB].order);
	}, [articles]);

	if (groupedArticles.length === 0) {
		return null;
	}

	// Just show category cards, no article listings
	return (
		<section id="collections" className="mb-24">
			<div className="flex items-center justify-between mb-8 border-b border-gray-300 dark:border-white/10 pb-2">
				<h2 className="font-mono text-xs uppercase tracking-widest text-gray-500">
					Browse by Category
				</h2>
				<a
					href="/articles"
					className="font-mono text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
				>
					View all →
				</a>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{groupedArticles.map(([groupId, groupArticles]) => {
					const group = ARTICLE_GROUPS[groupId];

					return (
						<a
							key={groupId}
							href={`/articles/${groupId}`}
							className="group/card p-6 rounded-lg border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
						>
							<div className="flex items-start gap-4 mb-3">
								<div className={`p-2.5 rounded-lg bg-gray-100 dark:bg-white/5 ${group.iconColor} shrink-0`}>
									<Icon name={group.icon} className="w-6 h-6" />
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover/card:text-green-600 dark:group-hover/card:text-green-400 transition-colors mb-1">
										{group.name}
									</h3>
									<p className="text-xs font-mono text-gray-600 mb-2">
										{groupArticles.length} {groupArticles.length === 1 ? 'article' : 'articles'}
									</p>
								</div>
							</div>
							<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
								{group.description}
							</p>
						</a>
					);
				})}
			</div>
		</section>
	);
};

export default ArticleGroups;
