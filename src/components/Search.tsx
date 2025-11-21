import React, { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { getPagefind } from '../lib/pagefind';

interface SearchResult {
	url: string;
	title: string;
	excerpt: string;
}

const Search = () => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	// Initialize Pagefind on mount
	useEffect(() => {
		getPagefind()
			.then(() => setIsReady(true))
			.catch(() => setIsReady(false));
	}, []);

	// Perform search with debouncing
	useEffect(() => {
		if (!query.trim()) {
			setResults([]);
			return;
		}

		setIsSearching(true);
		const timer = setTimeout(async () => {
			try {
				const pagefind = await getPagefind();
				const search = await pagefind.search(query);
				
				const searchResults = await Promise.all(
					search.results.slice(0, 8).map(async (result: any) => {
						const data = await result.data();
						return {
							url: data.url,
							title: data.meta.title,
							excerpt: data.excerpt,
						};
					})
				);

				setResults(searchResults);
			} catch (error) {
				console.error('Search error:', error);
				setResults([]);
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [query]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				setIsExpanded(true);
			}
			if (e.key === 'Escape' && isExpanded) {
				setIsExpanded(false);
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isExpanded]);

	// Auto-focus input when expanded
	useEffect(() => {
		if (isExpanded) {
			inputRef.current?.focus();
		} else {
			// Reset state when closed
			setQuery('');
			setResults([]);
		}
	}, [isExpanded]);

	return (
		<>
			{/* Search Button */}
			<button
				onClick={() => setIsExpanded(true)}
				className="p-2 hover:text-gray-900 dark:hover:text-white transition-colors"
				aria-label="Search"
				title="Search (⌘K)"
			>
				<SearchIcon size={18} />
			</button>

			{/* Search Overlay */}
			{isExpanded && (
				<>
					{/* Backdrop */}
					<div 
						className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[45]"
						onClick={() => setIsExpanded(false)}
					/>

					{/* Search Bar */}
					<div className="fixed left-0 right-0 top-0 z-[60] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/5">
						<div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-3">
							<SearchIcon size={18} className="text-gray-400 flex-shrink-0" />
							<input
								ref={inputRef}
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search articles..."
								className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm"
							/>
							{query && (
								<button
									onClick={() => setQuery('')}
									className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
									aria-label="Clear search"
								>
									<X size={18} />
								</button>
							)}
							<button
								onClick={() => setIsExpanded(false)}
								className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
								aria-label="Close search"
							>
								<X size={20} />
							</button>
						</div>
					</div>

					{/* Results Dropdown */}
					{query && (
						<div className="fixed left-0 right-0 top-16 z-[55]">
							<div className="max-w-3xl mx-auto px-6 pt-2">
								<div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
									<div className="max-h-[60vh] overflow-y-auto">
										{!isReady ? (
											<div className="p-8 text-center text-gray-600 dark:text-gray-400">
												<p>Search is only available in production builds.</p>
												<p className="text-sm mt-2">
													Run <code className="bg-gray-100 dark:bg-[#262626] px-2 py-1 rounded">bun run build</code> to generate the search index.
												</p>
											</div>
										) : isSearching ? (
											<div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
												Searching...
											</div>
										) : results.length === 0 ? (
											<div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
												No results found for "{query}"
											</div>
										) : (
											<>
												<div className="p-2">
													{results.map((result, index) => (
														<a
															key={index}
															href={result.url}
															onClick={() => setIsExpanded(false)}
															className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
														>
															<div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
																{result.title}
															</div>
															<div 
																className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2"
																dangerouslySetInnerHTML={{ __html: result.excerpt }}
															/>
														</a>
													))}
												</div>
												<div className="px-4 py-2 border-t border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
													<span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
													<span className="text-gray-400">ESC to close</span>
												</div>
											</>
										)}
									</div>
								</div>
							</div>
						</div>
					)}
				</>
			)}
		</>
	);
};

export default Search;
