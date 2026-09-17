import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import Search from './Search';
import { CALENDLY_URL, CONTACT_LABEL } from '../consts';

/** The three navigation destinations. Contact is an action, so it sits apart. */
const NAV_ITEMS = [
	{ label: 'Writing', href: '/articles/' },
	{ label: 'Projects', href: '/projects/' },
	{ label: 'About', href: '/about/' },
] as const;

/** A section is current when the pathname sits inside it, so /articles/foo marks Writing. */
const isCurrent = (pathname: string, href: string) =>
	pathname === href || pathname.startsWith(href) || pathname === href.replace(/\/$/, '');

/** The inline theme script in BaseHead applies the class before hydration, so reading
 *  it here at first render avoids a flash of the wrong icon for light-theme visitors. */
const getInitialTheme = (): 'light' | 'dark' => {
	if (typeof document === 'undefined') return 'dark';
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

const getInitialPathname = () => (typeof window === 'undefined' ? '' : window.location.pathname);

const Navigation = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
	const [pathname, setPathname] = useState(getInitialPathname);
	const menuButtonRef = useRef<HTMLButtonElement>(null);

	// Theme and current section are both read from the document, and re-read after a
	// view transition so the active nav item survives ClientRouter navigation.
	useEffect(() => {
		const sync = () => {
			setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
			setPathname(window.location.pathname);
			setIsMenuOpen(false);
		};

		document.addEventListener('astro:page-load', sync);
		return () => document.removeEventListener('astro:page-load', sync);
	}, []);

	// Containment for the mobile panel: Escape closes it, body scroll is locked, and
	// the page content is inert so Tab cannot reach links hidden behind the opaque
	// overlay. Every page's content lives in <main> and <footer> regardless of how
	// deep the nav sits in the component tree (the landing page mounts Navigation,
	// main and Footer from one shared React root), so those are targeted directly
	// instead of walking direct children of <body>.
	useEffect(() => {
		if (!isMenuOpen) return;

		const outsideElements = Array.from(document.querySelectorAll('main, footer'));
		outsideElements.forEach((el) => el.setAttribute('inert', ''));

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		// Belt-and-braces Tab wrap: inert covers <main> and <footer>, but this keeps
		// focus inside the nav and the panel even if something else sits at the top
		// of <body> (the dev toolbar in local dev, for example).
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsMenuOpen(false);
				return;
			}
			if (e.key !== 'Tab') return;

			const nav = document.querySelector('nav');
			const panel = document.getElementById('mobile-menu');
			const scopes = [nav, panel].filter((el): el is HTMLElement => el !== null);
			const focusables = scopes.flatMap((scope) =>
				Array.from(
					scope.querySelectorAll<HTMLElement>(
						'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
					)
				).filter((el) => el.offsetParent !== null)
			);
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
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			outsideElements.forEach((el) => el.removeAttribute('inert'));
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', handleKeyDown);
			menuButtonRef.current?.focus();
		};
	}, [isMenuOpen]);

	const toggleTheme = () => {
		const newTheme = theme === 'dark' ? 'light' : 'dark';
		setTheme(newTheme);

		if (newTheme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}

		localStorage.setItem('theme', newTheme);

		// Trigger mermaid re-render event
		window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newTheme } }));
	};

	const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

	return (
		<>
			<a href="#main" className="skip-link">
				Skip to main content
			</a>

			<nav className="fixed top-0 z-50 w-full border-b border-rule bg-paper/90 backdrop-blur-sm">
				<div className="mx-auto flex h-16 max-w-page items-center justify-between gap-6 px-6">
					<a
						href="/"
						className="rounded-sm text-base font-semibold text-ink transition-colors duration-150"
					>
						Quentin Nivelais
					</a>

					<div className="flex items-center gap-1 text-sm md:gap-6">
						{/* Desktop-only section links. Collapse into the mobile panel below md. */}
						<div className="hidden items-center gap-6 md:flex">
							{NAV_ITEMS.map((item) => {
								const current = isCurrent(pathname, item.href);
								return (
									<a
										key={item.href}
										href={item.href}
										aria-current={current ? 'page' : undefined}
										className={`relative rounded-sm transition-colors duration-150 ${
											current ? 'font-medium text-ink' : 'text-ink-2 hover:text-ink'
										}`}
									>
										{item.label}
										{current && (
											<span
												aria-hidden="true"
												className="absolute inset-x-0 -bottom-1.5 h-[2px] bg-signal"
											/>
										)}
									</a>
								);
							})}
						</div>

						{/* Single instance: mounting Search once here (instead of once per
						    responsive container) keeps Cmd/Ctrl+K and the dialog singular. */}
						<Search />

						<button
							onClick={toggleTheme}
							className="rounded-sm p-1.5 text-ink-2 transition-colors duration-150 hover:text-ink"
							aria-label={themeLabel}
							title={themeLabel}
						>
							{theme === 'dark' ? (
								<Sun size={18} strokeWidth={1.5} />
							) : (
								<Moon size={18} strokeWidth={1.5} />
							)}
						</button>

						<a
							href={CALENDLY_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="btn btn-secondary hidden px-3 py-1.5 text-sm md:inline-flex"
						>
							{CONTACT_LABEL}
						</a>

						<button
							ref={menuButtonRef}
							className="rounded-sm p-1.5 text-ink-2 transition-colors duration-150 hover:text-ink md:hidden"
							onClick={() => setIsMenuOpen(!isMenuOpen)}
							aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
							aria-expanded={isMenuOpen}
							aria-controls="mobile-menu"
						>
							{isMenuOpen ? (
								<X size={20} strokeWidth={1.5} />
							) : (
								<Menu size={20} strokeWidth={1.5} />
							)}
						</button>
					</div>
				</div>
			</nav>

			{isMenuOpen && (
				<div id="mobile-menu" className="fixed inset-0 z-40 bg-paper px-6 pt-24 md:hidden">
					<div className="flex flex-col items-start gap-6 text-lg">
						{NAV_ITEMS.map((item) => {
							const current = isCurrent(pathname, item.href);
							return (
								<a
									key={item.href}
									href={item.href}
									onClick={() => setIsMenuOpen(false)}
									aria-current={current ? 'page' : undefined}
									className={`rounded-sm transition-colors duration-150 ${
										current
											? 'border-b-2 border-signal font-medium text-ink'
											: 'text-ink-2 hover:text-ink'
									}`}
								>
									{item.label}
								</a>
							);
						})}

						<a
							href={CALENDLY_URL}
							target="_blank"
							rel="noopener noreferrer"
							onClick={() => setIsMenuOpen(false)}
							className="btn btn-secondary mt-2"
						>
							{CONTACT_LABEL}
						</a>
					</div>
				</div>
			)}
		</>
	);
};

export default Navigation;
