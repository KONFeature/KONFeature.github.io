export interface ArticleGroup {
	id: string;
	name: string;
	description: string;
	icon: string;
	iconColor: string;
	order: number;
}

export const ARTICLE_GROUPS: Record<string, ArticleGroup> = {
	frak: {
		id: 'frak',
		name: 'Frak Labs',
		description: 'Building the future of content monetization with Web3. From pioneering account abstraction and WebAuthn wallets to extreme frontend optimization and cost-effective blockchain infrastructure.',
		icon: 'rocket',
		iconColor: 'text-purple-400',
		order: 1,
	},
	'cooking-bot': {
		id: 'cooking-bot',
		name: 'Cooking Bot',
		description: 'An AI cooking assistant where safety is paramount. Exploring deterministic safety layers, vector search, and when NOT to use LLMs.',
		icon: 'shield-check',
		iconColor: 'text-emerald-400',
		order: 2,
	},
	web3: {
		id: 'web3',
		name: 'Web3 & Solidity',
		description: 'Deep dives into EVM optimization, account abstraction, cryptography, and the bleeding edge of smart contract development.',
		icon: 'blocks',
		iconColor: 'text-blue-400',
		order: 3,
	},
	'side-projects': {
		id: 'side-projects',
		name: 'Side Projects',
		description: 'Personal projects born from real problems. Hardware controllers for pottery kilns, NLP pipelines for screenplay analysis, AI-powered WordPress management — building what I need, open-sourcing what might help others.',
		icon: 'wrench',
		iconColor: 'text-cyan-400',
		order: 4,
	},
	opinion: {
		id: 'opinion',
		name: 'Tech Opinion',
		description: 'Unfiltered takes on the state of Web3, developer tooling, and the gap between specs and reality. Less tutorial, more editorial.',
		icon: 'message-square-warning',
		iconColor: 'text-amber-400',
		order: 5,
	},
};
