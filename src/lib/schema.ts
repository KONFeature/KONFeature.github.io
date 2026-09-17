// Shared JSON-LD entity nodes.
//
// The Person node is emitted on the homepage, the about page and every article.
// All three use the same `@id` so search engines and LLMs resolve them to a
// single entity instead of three anonymous authors.

import {
	AUTHOR_NAME,
	SITE_URL,
	JOB_TITLE,
	TAGLINE,
	GITHUB_HANDLE,
	LINKEDIN_URL,
	TWITTER_HANDLE,
	links,
} from '../consts';

/** Stable node id for the site owner. Referenced from every page that mentions him. */
export const PERSON_ID = `${SITE_URL}/#person`;

/** Stable node id for Frak Labs. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export const X_PROFILE_URL = `https://x.com/${TWITTER_HANDLE.replace('@', '')}`;

/** Profile URLs that prove the entity is the same person across the web. */
export const PERSON_SAME_AS = [
	`https://github.com/${GITHUB_HANDLE}`,
	LINKEDIN_URL,
	X_PROFILE_URL,
];

export const PERSON_KNOWS_ABOUT = [
	'Account Abstraction (ERC-4337, ERC-7579)',
	'WebAuthn & Passkeys',
	'Smart Contract Development',
	'Web3 Infrastructure',
	'Kubernetes & DevOps',
	'Blockchain Cost Optimization',
	'Ethereum Virtual Machine (EVM)',
	'Infrastructure as Code',
];

export const organizationJsonLd = {
	'@type': 'Organization',
	'@id': ORGANIZATION_ID,
	name: 'Frak Labs',
	url: links.frak,
	description:
		'Building the future of content monetization with Web3 infrastructure, account abstraction, and WebAuthn wallets.',
	founder: { '@id': PERSON_ID },
	sameAs: ['https://github.com/frak-id', 'https://x.com/FrakLabs'],
};

/**
 * The full Person node.
 *
 * Emit this inline wherever the author is referenced so each page is
 * self-contained; pages that need a second mention should use `personRef`
 * to avoid duplicating the node within one document.
 */
export const personJsonLd = {
	'@type': 'Person',
	'@id': PERSON_ID,
	name: AUTHOR_NAME,
	url: SITE_URL,
	jobTitle: JOB_TITLE,
	description: TAGLINE,
	worksFor: {
		'@type': 'Organization',
		'@id': ORGANIZATION_ID,
		name: 'Frak Labs',
		url: links.frak,
	},
	sameAs: PERSON_SAME_AS,
	knowsAbout: PERSON_KNOWS_ABOUT,
	hasOccupation: {
		'@type': 'Occupation',
		name: JOB_TITLE,
		occupationalCategory: 'Software Engineering',
	},
};

/** Lightweight pointer to the Person node defined elsewhere in the same document. */
export const personRef = { '@id': PERSON_ID };

/** Default social card, used when an article has no hero image. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

/** Canonical URLs carry a trailing slash; JSON-LD must match them exactly. */
export function canonical(path = ''): string {
	if (!path) return `${SITE_URL}/`;
	const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '');
	return `${SITE_URL}/${trimmed}/`;
}
