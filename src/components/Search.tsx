import React, { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

declare global {
	interface Window {
		PagefindUI: any;
		pagefindLoaded?: boolean;
	}
}

const Search = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const dialogRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLDivElement>(null);
	const pagefindInstanceRef = useRef<any>(null);

	// Load Pagefind scripts once globally
	useEffect(() => {
		if (window.pagefindLoaded) {
			setIsReady(true);
			return;
		}

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = '/pagefind/pagefind-ui.css';
		link.onerror = () => {
			console.warn('Pagefind CSS not found. Run `bun run build` to generate search index.');
		};
		document.head.appendChild(link);

		const script = document.createElement('script');
		script.src = '/pagefind/pagefind-ui.js';
		script.type = 'module';
		script.onload = () => {
			window.pagefindLoaded = true;
			setIsReady(true);
		};
		script.onerror = () => {
			console.warn('Pagefind not found. Run `bun run build` to generate search index.');
		};
		document.head.appendChild(script);
	}, []);

	// Initialize Pagefind UI when modal opens
	useEffect(() => {
		if (isOpen && isReady && searchRef.current && !pagefindInstanceRef.current) {
			if (window.PagefindUI) {
				pagefindInstanceRef.current = new window.PagefindUI({
					element: searchRef.current,
					showSubResults: true,
					showImages: false,
					excerptLength: 15,
					resetStyles: false,
					filters: {
						// Only show article pages, exclude index/career/articles list pages
					},
					bundlePath: '/pagefind/',
				});
				
				// Auto-focus the search input after PagefindUI is initialized
				setTimeout(() => {
					const input = searchRef.current?.querySelector('input');
					if (input) {
						input.focus();
					}
				}, 100);
			}
		}
	}, [isOpen, isReady]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				setIsOpen(true);
			}
			if (e.key === 'Escape' && isOpen) {
				setIsOpen(false);
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen]);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isOpen]);

	return (
		<>
			<button
				onClick={() => setIsOpen(true)}
				className="p-2 hover:text-gray-900 dark:hover:text-white transition-colors"
				aria-label="Search"
				title="Search (⌘K)"
			>
				<SearchIcon size={18} />
			</button>

		{isOpen && (
			<>
				<div 
					className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
					onClick={() => setIsOpen(false)}
				/>
				<div className="fixed top-20 left-1/2 -translate-x-1/2 z-[201] w-full max-w-2xl px-4">
					<div
						ref={dialogRef}
						className="w-full bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
							<span className="text-sm text-gray-600 dark:text-gray-400">Search articles</span>
							<button
								onClick={() => setIsOpen(false)}
								className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
								aria-label="Close search"
							>
								<X size={20} />
							</button>
						</div>
						{!isReady ? (
							<div className="p-8 text-center text-gray-600 dark:text-gray-400">
								<p>Search is only available in production builds.</p>
								<p className="text-sm mt-2">Run <code className="bg-gray-100 dark:bg-[#262626] px-2 py-1 rounded">bun run build</code> to generate the search index.</p>
							</div>
						) : (
							<div ref={searchRef} id="search" className="pagefind-container" />
						)}
					</div>
				</div>
			</>
		)}
		</>
	);
};

export default Search;
