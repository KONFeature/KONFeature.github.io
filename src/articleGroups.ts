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
	kiln: {
		id: 'kiln',
		name: 'Pico Kiln',
		description: 'A hardware-software journey building a pottery kiln controller from scratch. Raspberry Pi Pico, custom firmware, and React Native come together.',
		icon: 'cpu',
		iconColor: 'text-orange-400',
		order: 2,
	},
	'scenario-parser': {
		id: 'scenario-parser',
		name: 'Scenario Parser',
		description: 'Transforming PDF screenplays into structured data. A complete pipeline from extraction through NLP to character psychology modeling.',
		icon: 'file-text',
		iconColor: 'text-yellow-400',
		order: 3,
	},
	'cooking-bot': {
		id: 'cooking-bot',
		name: 'Cooking Bot',
		description: 'An AI cooking assistant where safety is paramount. Exploring deterministic safety layers, vector search, and when NOT to use LLMs.',
		icon: 'shield-check',
		iconColor: 'text-emerald-400',
		order: 4,
	},
	web3: {
		id: 'web3',
		name: 'Web3 & Solidity',
		description: 'Deep dives into EVM optimization, account abstraction, cryptography, and the bleeding edge of smart contract development.',
		icon: 'blocks',
		iconColor: 'text-blue-400',
		order: 5,
	},
	'side-projects': {
		id: 'side-projects',
		name: 'Side Projects',
		description: 'Personal projects born from real problems. From self-hosted infrastructure to developer tooling — building what I need, open-sourcing what might help others.',
		icon: 'wrench',
		iconColor: 'text-cyan-400',
		order: 6,
	},
};
