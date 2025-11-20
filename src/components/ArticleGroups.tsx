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

	return (
		<section id="collections" className="mb-24">
			<div className="flex items-center justify-between mb-8 border-b border-gray-300 dark:border-white/10 pb-2">
				<h2 className="font-mono text-xs uppercase tracking-widest text-gray-500">
					Article Collections
				</h2>
			</div>

			<div className="space-y-16">
				{groupedArticles.map(([groupId, groupArticles]) => {
					const group = ARTICLE_GROUPS[groupId];
					
					return (
						<div key={groupId} className="group/collection">
							{/* Group Header */}
							<div className="mb-6">
								<div className="flex items-center gap-3 mb-3">
									<div className={`p-2 rounded-lg bg-gray-100 dark:bg-white/5 ${group.iconColor}`}>
										<Icon name={group.icon} className="w-5 h-5" />
									</div>
									<h3 className="text-xl font-bold text-gray-900 dark:text-white">
										{group.name}
									</h3>
									<span className="text-xs font-mono text-gray-600">
										{groupArticles.length} {groupArticles.length === 1 ? 'article' : 'articles'}
									</span>
								</div>
								<p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-2xl">
									{group.description}
								</p>
							</div>

							{/* Articles in Group */}
							<div className="space-y-4 ml-0 md:ml-4">
								{groupArticles.map((article) => (
									<a 
										key={article.id} 
										href={`/articles/${article.slug}`}
										className="block group/article"
									>
										<div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6 p-4 rounded-lg border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
											<time className="font-mono text-xs text-gray-600 shrink-0 w-20">
												{new Date(article.date).toLocaleDateString('en-US', { 
													month: 'short', 
													year: '2-digit'
												})}
											</time>
											<div className="flex-1">
												<h4 className="text-base font-medium text-gray-900 dark:text-white group-hover/article:text-green-600 dark:group-hover/article:text-green-400 transition-colors mb-1">
													{article.title}
												</h4>
												{article.subtitle && (
													<p className="text-gray-600 text-xs mb-2">
														{article.subtitle}
													</p>
												)}
												<div className="flex flex-wrap gap-2 mt-2">
													{article.tags.slice(0, 3).map((tag) => (
														<span key={tag} className="text-[10px] font-mono text-gray-600 px-2 py-0.5 bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/5 rounded">
															{tag}
														</span>
													))}
												</div>
											</div>
										</div>
									</a>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
};

export default ArticleGroups;
