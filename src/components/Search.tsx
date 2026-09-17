import React, { useEffect, useId, useRef, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { getPagefind } from '../lib/pagefind';

interface SearchResult {
	url: string;
	title: string;
	excerpt: string;
}

const Search = () => {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const inputId = useId();
	const statusId = useId();

	// Initialize Pagefind on mount
	useEffect(() => {
		getPagefind()
			.then(() => setIsReady(true))
			.catch(() => setIsReady(false));
	}, []);

	const openDialog = () => {
		dialogRef.current?.showModal();
	};

	const closeDialog = () => {
		dialogRef.current?.close();
	};

	// showModal() confines focus to the dialog, but wrap-around from the last
	// focusable back to the first (and back) is not consistently reliable across
	// browsers, so Tab is trapped explicitly as a safety net.
	const trapTab = (e: React.KeyboardEvent<HTMLDialogElement>) => {
		if (e.key !== 'Tab') return;
		const dialog = dialogRef.current;
		if (!dialog) return;

		const focusables = Array.from(
			dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
		).filter((el) => el.offsetParent !== null);
		if (focusables.length === 0) return;

		const first = focusables[0];
		const last = focusables[focusables.length - 1];

		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	};

	// showModal() gives the focus trap and Escape handling for free. The native
	// `close` event covers Escape, the backdrop click handler below, and the
	// explicit close button, so focus return and state reset live in one place.
	// showModal() moves focus onto the dialog itself by default, so the open path
	// redirects it to the input.
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleClose = () => {
			setIsOpen(false);
			setQuery('');
			setResults([]);
			triggerRef.current?.focus();
		};

		dialog.addEventListener('close', handleClose);

		const observer = new MutationObserver(() => {
			if (dialog.open) {
				setIsOpen(true);
				inputRef.current?.focus();
			}
		});
		observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });

		return () => {
			dialog.removeEventListener('close', handleClose);
			observer.disconnect();
		};
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

	// Keyboard shortcut: Cmd/Ctrl+K opens. Escape is handled natively by <dialog>.
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				if (!dialogRef.current?.open) {
					openDialog();
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	const resultStatus = !query
		? ''
		: isSearching
			? 'Searching the archive.'
			: results.length === 0
				? `Nothing matches "${query}".`
				: `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}".`;

	return (
		<>
			<button
				ref={triggerRef}
				onClick={openDialog}
				className="rounded-sm p-1.5 text-ink-2 transition-colors duration-150 hover:text-ink"
				aria-label="Search the site"
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				title="Search (Cmd K)"
			>
				<SearchIcon size={18} strokeWidth={1.5} />
			</button>

			<dialog
				ref={dialogRef}
				aria-label="Search"
				onKeyDown={trapTab}
				onClick={(e) => {
					// Clicking the ::backdrop lands directly on the dialog element itself.
					if (e.target === dialogRef.current) {
						closeDialog();
					}
				}}
				className="m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-paper/70 backdrop:backdrop-blur-sm open:flex open:flex-col"
			>
				{/* Input row, aligned with the navigation bar it replaces. */}
				<div className="border-b border-rule bg-paper/95 backdrop-blur-sm">
					<div className="mx-auto flex h-16 max-w-page items-center gap-3 px-6">
						<SearchIcon
							size={18}
							strokeWidth={1.5}
							className="shrink-0 text-ink-3"
							aria-hidden="true"
						/>
						<label htmlFor={inputId} className="sr-only">
							Search articles and projects
						</label>
						<input
							ref={inputRef}
							id={inputId}
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search articles and projects"
							aria-describedby={statusId}
							className="flex-1 rounded-sm bg-transparent px-1 py-1 text-base text-ink placeholder:text-ink-3"
						/>
						{query && (
							<button
								onClick={() => setQuery('')}
								className="rounded-sm p-1 text-ink-3 transition-colors duration-150 hover:text-ink"
								aria-label="Clear the search field"
							>
								<X size={18} strokeWidth={1.5} />
							</button>
						)}
						<button
							onClick={closeDialog}
							className="rounded-sm p-1 text-ink-3 transition-colors duration-150 hover:text-ink"
							aria-label="Close search"
						>
							<X size={20} strokeWidth={1.5} />
						</button>
					</div>
				</div>

				<div aria-live="polite" className="sr-only" id={statusId}>
					{resultStatus}
				</div>

				{query && (
					<div className="overflow-y-auto">
						<div className="mx-auto max-w-page px-6 pt-2">
							<div className="max-h-[60vh] overflow-y-auto rounded-sm border border-rule bg-paper">
								{!isReady ? (
									<div className="px-4 py-6 text-sm text-ink-2">
										<p>Search runs on the index built with the site, so it is unavailable here.</p>
										<p className="mt-2">
											Run <code className="font-mono text-ink">bun run build</code> to generate
											the index.
										</p>
									</div>
								) : isSearching ? (
									<p className="px-4 py-6 text-sm text-ink-2">Searching the archive.</p>
								) : results.length === 0 ? (
									<p className="px-4 py-6 text-sm text-ink-2">
										Nothing matches "{query}". Try a shorter phrase or a single keyword.
									</p>
								) : (
									<>
										<div className="divide-y divide-rule">
											{results.map((result, index) => (
												<a
													key={index}
													href={result.url}
													onClick={closeDialog}
													className="block px-4 py-3 transition-colors duration-150 hover:bg-surface"
												>
													<span className="block font-medium text-ink">{result.title}</span>
													{/* Pagefind wraps matches in <mark>, which otherwise renders as browser yellow. */}
													<span
														className="mt-1 line-clamp-2 block text-sm text-ink-2 [&_mark]:bg-transparent [&_mark]:font-medium [&_mark]:text-ink"
														dangerouslySetInnerHTML={{ __html: result.excerpt }}
													/>
												</a>
											))}
										</div>
										<div className="flex items-center justify-between border-t border-rule px-4 py-2 text-xs text-ink-3">
											<span>
												<span className="font-mono">{results.length}</span> result
												{results.length !== 1 ? 's' : ''}
											</span>
											<span>
												Press <span className="font-mono">Esc</span> to close
											</span>
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				)}
			</dialog>
		</>
	);
};

export default Search;
