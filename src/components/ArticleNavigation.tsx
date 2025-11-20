import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ArticleNavigationProps {
	prevArticle?: {
		title: string;
		slug: string;
	};
	nextArticle?: {
		title: string;
		slug: string;
	};
	groupName?: string;
}

const ArticleNavigation: React.FC<ArticleNavigationProps> = ({ 
	prevArticle, 
	nextArticle,
	groupName 
}) => {
	if (!prevArticle && !nextArticle) {
		return null;
	}

	return (
		<nav className="mt-16 pt-8 border-t border-gray-300 dark:border-white/10">
			{groupName && (
				<p className="text-xs font-mono text-gray-600 uppercase tracking-wider mb-6">
					More from {groupName}
				</p>
			)}
			
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Previous Article */}
				{prevArticle ? (
					<a 
						href={`/articles/${prevArticle.slug}`}
						className="group flex items-center gap-3 p-4 rounded-lg border border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
					>
						<ChevronLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors shrink-0" />
						<div className="min-w-0">
							<p className="text-xs font-mono text-gray-600 mb-1">Previous</p>
							<p className="text-sm text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
								{prevArticle.title}
							</p>
						</div>
					</a>
				) : (
					<div className="hidden md:block" />
				)}

				{/* Next Article */}
				{nextArticle && (
					<a 
						href={`/articles/${nextArticle.slug}`}
						className="group flex items-center gap-3 p-4 rounded-lg border border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/5 transition-all md:justify-end"
					>
						<div className="min-w-0 text-left md:text-right">
							<p className="text-xs font-mono text-gray-600 mb-1">Next</p>
							<p className="text-sm text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
								{nextArticle.title}
							</p>
						</div>
						<ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors shrink-0" />
					</a>
				)}
			</div>
		</nav>
	);
};

export default ArticleNavigation;
