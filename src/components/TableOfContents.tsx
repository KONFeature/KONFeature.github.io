import { useEffect, useState } from 'react';
import type { FC } from 'react';

interface Heading {
	slug: string;
	text: string;
	depth: number;
}

interface TableOfContentsProps {
	headings: Heading[];
}

const TableOfContents: FC<TableOfContentsProps> = ({ headings }) => {
	const [activeSlug, setActiveSlug] = useState<string>('');

	// Scroll spy runs on IntersectionObserver, never on a scroll listener.
	useEffect(() => {
		if (headings.length === 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setActiveSlug(entry.target.id);
					}
				});
			},
			{
				rootMargin: '-100px 0px -66%',
				threshold: 1.0,
			}
		);

		headings.forEach((heading) => {
			const element = document.getElementById(heading.slug);
			if (element) {
				observer.observe(element);
			}
		});

		return () => observer.disconnect();
	}, [headings]);

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
		const element = document.getElementById(slug);
		if (!element) return;

		e.preventDefault();

		// global.css sets scroll-margin-top on headings, so the browser already
		// clears the fixed nav; no bespoke offset math needed here.
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
		history.pushState(null, '', `#${slug}`);
	};

	if (headings.length === 0) {
		return null;
	}

	return (
		// Fixed, so it takes no layout space; below xl it is not rendered at all.
		<nav
			data-component="TableOfContents"
			/*
			 * The prose column is 46rem centred, so at exactly 1280px a 16rem panel
			 * would touch it. It starts narrow and widens once there is room.
			 */
			className="hidden xl:block fixed top-28 right-6 z-40 w-48 2xl:w-64 max-h-[calc(100vh-9rem)] overflow-y-auto"
			aria-label="Table of contents"
		>
			<p className="text-xs text-ink-3 mb-3">On this page</p>
			<ul className="border-l border-rule">
				{headings.map((heading) => {
					const isActive = activeSlug === heading.slug;
					const indent = Math.max(0, heading.depth - 2) * 12;

					return (
						<li key={heading.slug}>
							<a
								href={`#${heading.slug}`}
								onClick={(e) => handleClick(e, heading.slug)}
								style={{ paddingLeft: `${16 + indent}px` }}
								className={`block text-sm py-1 -ml-px border-l-2 transition-colors ${
									isActive
										? 'border-signal text-signal'
										: 'border-transparent text-ink-3 hover:text-ink'
								}`}
							>
								{heading.text}
							</a>
						</li>
					);
				})}
			</ul>
		</nav>
	);
};

export default TableOfContents;
