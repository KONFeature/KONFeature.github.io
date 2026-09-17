import React from 'react';

interface SiblingArticle {
	title: string;
	slug: string;
	position: number;
}

interface ArticleNavigationProps {
	prevArticle?: SiblingArticle;
	nextArticle?: SiblingArticle;
	groupName?: string;
	groupTotal?: number;
}

// Previous/next carry real information instead of pagination chrome: the
// sibling's title, its position in the group, and the group name. Next is
// weighted heavier so it reads as the obvious continuation of the series
// rather than a "next page" control.
const ArticleNavigation: React.FC<ArticleNavigationProps> = ({
	prevArticle,
	nextArticle,
	groupName,
	groupTotal
}) => {
	if (!prevArticle && !nextArticle) {
		return null;
	}

	return (
		<nav aria-label="Article series navigation" className="mt-12 pt-6 border-t border-rule">
			<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
				{prevArticle ? (
					<a
						href={`/articles/${prevArticle.slug}/`}
						className="group block"
					>
						<span className="block text-xs text-ink-3">
							{groupName ? `${groupName} · ` : ''}
							{groupTotal ? (
								<span className="font-mono">Part {prevArticle.position} of {groupTotal}</span>
							) : (
								'Previous'
							)}
						</span>
						<span className="block mt-1 text-sm text-ink-2 group-hover:underline underline-offset-4 decoration-rule-strong">
							{prevArticle.title}
						</span>
					</a>
				) : (
					<div className="hidden md:block" />
				)}

				{nextArticle && (
					<a
						href={`/articles/${nextArticle.slug}/`}
						className="group block md:text-right"
					>
						<span className="block text-xs text-ink-3">
							{groupTotal ? (
								<>
									Continuing{groupName ? ` ${groupName}` : ''} ·{' '}
									<span className="font-mono">Part {nextArticle.position} of {groupTotal}</span>
								</>
							) : (
								'Next'
							)}
						</span>
						<span className="block mt-1 text-lg font-semibold text-ink group-hover:underline underline-offset-4 decoration-rule-strong">
							{nextArticle.title}
						</span>
					</a>
				)}
			</div>
		</nav>
	);
};

export default ArticleNavigation;
