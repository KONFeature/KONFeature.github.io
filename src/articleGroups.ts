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
		description: 'Personal projects born from real problems. AI-powered WordPress management, home electrical panel optimization, building what I need, open-sourcing what might help others.',
		icon: 'wrench',
		iconColor: 'text-cyan-400',
		order: 4,
	},
	atelier: {
		id: 'atelier',
		name: "L'Atelier",
		description: 'A self-hosted cloud sandbox platform for AI coding agents, built on Kata Containers. From a monolithic orchestrator to a Kubernetes-native supporting infrastructure, plus a Slack bot and MCP server.',
		icon: 'layers',
		iconColor: 'text-orange-400',
		order: 5,
	},
	kiln: {
		id: 'kiln',
		name: 'Pico Kiln',
		description: 'Hardware and firmware for a smart, high-temperature pottery kiln controller. From 380V industrial rewiring to bare-metal Rust firmware and physics-based PID tuning.',
		icon: 'flame',
		iconColor: 'text-red-400',
		order: 6,
	},
	'scenario-parser': {
		id: 'scenario-parser',
		name: 'Scenario Parser',
		description: 'An internal NLP pipeline that turns screenplay PDFs into structured data: extraction, character psychology modeling, and a resilient orchestration engine.',
		icon: 'blocks',
		iconColor: 'text-indigo-400',
		order: 7,
	},
};
