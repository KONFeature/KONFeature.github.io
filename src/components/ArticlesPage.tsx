import React, { useState, useMemo } from 'react';
import ArticleGroups from './ArticleGroups';

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

interface ArticlesPageProps {
	articles: ArticleData[];
}

const ArticlesPage: React.FC<ArticlesPageProps> = ({ articles }) => {
	const [selectedCategory, setSelectedCategory] = useState<string>('all');
	const [selectedGroup, setSelectedGroup] = useState<string>('all');

	// Get unique categories and groups
	const categories = useMemo(() => {
		const cats = new Set(articles.map(a => a.category));
		return ['all', ...Array.from(cats).sort()];
	}, [articles]);

	const groups = useMemo(() => {
		const grps = new Set(articles.map(a => a.group).filter((g): g is string => Boolean(g)));
		return ['all', ...Array.from(grps).sort()];
	}, [articles]);

	// Filter articles by category and group
	const filteredArticles = useMemo(() => {
		return articles.filter(article => {
			const categoryMatch = selectedCategory === 'all' || article.category === selectedCategory;
			const groupMatch = selectedGroup === 'all' || article.group === selectedGroup;
			return categoryMatch && groupMatch;
		});
	}, [articles, selectedCategory, selectedGroup]);

	return (
		<section>
			<div className="mb-12">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">All Articles</h1>
				<p className="text-gray-600 dark:text-gray-400 leading-relaxed">
					A complete archive of engineering deep-dives, technical explorations, and project post-mortems.
				</p>
			</div>

			<ArticleGroups articles={articles} />

			{/* Filters */}
			<div className="mb-8 space-y-4">
				{/* Category Filter */}
				<div>
					<label className="block text-xs font-mono text-gray-600 uppercase tracking-wider mb-2">
						Category
					</label>
					<div className="flex flex-wrap gap-2">
						{categories.map((category) => (
							<button
								key={category}
								onClick={() => setSelectedCategory(category)}
								className={`px-3 py-1 text-xs font-mono rounded-md transition-all capitalize ${
									selectedCategory === category 
										? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-400 dark:border-white/20' 
										: 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 border border-gray-300 dark:border-white/10'
								}`}
							>
								{category}
							</button>
						))}
					</div>
				</div>

				{/* Group Filter */}
				<div>
					<label className="block text-xs font-mono text-gray-600 uppercase tracking-wider mb-2">
						Project Group
					</label>
					<div className="flex flex-wrap gap-2">
						{groups.map((group) => (
							<button
								key={group}
								onClick={() => setSelectedGroup(group)}
								className={`px-3 py-1 text-xs font-mono rounded-md transition-all capitalize ${
									selectedGroup === group 
										? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-400 dark:border-white/20' 
										: 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 border border-gray-300 dark:border-white/10'
								}`}
							>
								{group}
							</button>
						))}
					</div>
				</div>

				{/* Results Count */}
				<div className="pt-2 border-t border-gray-300 dark:border-white/10">
					<p className="text-xs font-mono text-gray-600">
						Showing {filteredArticles.length} of {articles.length} articles
					</p>
				</div>
			</div>

			{/* Articles List */}
			<div className="space-y-1">
				{filteredArticles.length === 0 ? (
					<div className="py-12 text-center">
						<p className="text-gray-500">No articles found matching the selected filters.</p>
					</div>
				) : (
					filteredArticles.map((article) => (
						<a 
							key={article.id} 
							href={`/articles/${article.slug}`}
							className="group block p-4 rounded-lg border border-transparent hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
						>
							<div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8">
								<time className="font-mono text-xs text-gray-600 shrink-0 w-24">
									{new Date(article.date).toLocaleDateString('en-US', { 
										month: 'short', 
										year: 'numeric',
										day: 'numeric'
									})}
								</time>
								<div className="flex-1">
									<h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mb-1">
										{article.title}
									</h3>
									{article.subtitle && (
										<p className="text-gray-600 text-sm mb-2">
											{article.subtitle}
										</p>
									)}
									<div className="flex flex-wrap gap-2 items-center">
										<span className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded text-[10px] font-mono text-gray-600 dark:text-gray-500 uppercase">
											{article.category}
										</span>
										{article.group && (
											<span className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded text-[10px] font-mono text-gray-600 dark:text-gray-500">
												{article.group}
											</span>
										)}
										<span className="text-xs text-gray-600">•</span>
										<span className="text-xs text-gray-600">{article.readTime}</span>
									</div>
								</div>
							</div>
						</a>
					))
				)}
			</div>
		</section>
	);
};

export default ArticlesPage;
