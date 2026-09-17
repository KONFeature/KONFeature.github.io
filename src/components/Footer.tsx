import React from 'react';
import { AVAILABILITY, CALENDLY_URL, CONTACT_LABEL } from '../consts';

/**
 * Site footer. It carries its own column so it reads correctly whether a page
 * mounts it inside a constrained main or directly in the body.
 */
const Footer = () => {
	return (
		<footer className="mt-24 border-t border-rule">
			<div className="mx-auto flex w-full max-w-page flex-col gap-3 px-6 py-8 text-sm md:flex-row md:items-baseline md:justify-between md:gap-8">
				<p className="text-ink-3">&copy; {new Date().getFullYear()} Quentin Nivelais</p>

				<p className="text-ink-2">
					Next availability <span className="font-mono text-ink">{AVAILABILITY}</span>
				</p>

				<div className="flex items-center gap-5">
					<a href="/about/" className="link-quiet">
						About
					</a>
					<a href="/articles/" className="link-quiet">
						Writing
					</a>
					<a
						href={CALENDLY_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="link-quiet"
					>
						{CONTACT_LABEL}
					</a>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
