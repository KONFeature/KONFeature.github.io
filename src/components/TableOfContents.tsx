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
	const [isOpen, setIsOpen] = useState(false);

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

		// Observe all headings
		headings.forEach((heading) => {
			const element = document.getElementById(heading.slug);
			if (element) {
				observer.observe(element);
			}
		});

		return () => {
			headings.forEach((heading) => {
				const element = document.getElementById(heading.slug);
				if (element) {
					observer.unobserve(element);
				}
			});
		};
	}, [headings]);

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
		e.preventDefault();
		const element = document.getElementById(slug);
		if (element) {
			const offset = 100; // Offset for fixed navigation
			const elementPosition = element.getBoundingClientRect().top;
			const offsetPosition = elementPosition + window.scrollY - offset;

			window.scrollTo({
				top: offsetPosition,
				behavior: 'smooth',
			});

			// Close mobile menu after clicking
			setIsOpen(false);
		}
	};

	if (headings.length === 0) {
		return null;
	}

	return (
		<>
			{/* Mobile Toggle Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="xl:hidden fixed bottom-6 right-6 z-50 p-4 bg-gray-100/80 dark:bg-white/10 hover:bg-gray-200/90 dark:hover:bg-white/20 backdrop-blur-sm rounded-full border border-gray-300 dark:border-white/20 transition-colors shadow-lg"
				aria-label="Toggle table of contents"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<line x1="3" y1="12" x2="21" y2="12" />
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="3" y1="18" x2="21" y2="18" />
				</svg>
			</button>

			{/* Mobile Overlay */}
			{isOpen && (
				<div
					className="xl:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
					onClick={() => setIsOpen(false)}
				/>
			)}

			{/* Table of Contents */}
			<nav
				data-component="TableOfContents"
				className={`
					fixed top-32 right-0 w-72 max-h-[calc(100vh-10rem)] overflow-y-auto
					bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-300 dark:border-white/10 p-6
					transition-transform duration-300 z-40
					${isOpen ? 'translate-x-0 mr-6' : 'translate-x-full xl:translate-x-0 xl:mr-6'}
				`}
				aria-label="Table of contents"
			>
				<h2 className="text-sm font-mono uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-4">
					On this page
				</h2>
				<ul className="space-y-2">
					{headings.map((heading) => {
						const isActive = activeSlug === heading.slug;
						const paddingLeft = (heading.depth - 1) * 12;

						return (
							<li key={heading.slug} style={{ paddingLeft: `${paddingLeft}px` }}>
								<a
									href={`#${heading.slug}`}
									onClick={(e) => handleClick(e, heading.slug)}
									className={`
										block text-sm transition-colors py-1 border-l-2 pl-3 -ml-3
										${
											isActive
												? 'border-gray-900 dark:border-white text-gray-900 dark:text-white font-medium'
												: 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600'
										}
									`}
								>
									{heading.text}
								</a>
							</li>
						);
					})}
				</ul>
			</nav>
		</>
	);
};

export default TableOfContents;
