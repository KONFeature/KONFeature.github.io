import { links } from '../consts';

export interface ContributionItem {
	label: string;
	url: string;
}

export interface Contribution {
	project: string;
	context: string;
	url: string;
	items: ContributionItem[];
}

/**
 * Upstream work on tools other people ship on.
 * Single definition, imported by both the landing page and the about page.
 */
export const CONTRIBUTIONS: Contribution[] = [
	{
		project: 'ZeroDev Kernel',
		context: 'Smart account',
		url: links.kernel,
		items: [
			{ label: 'WebAuthn validator', url: 'https://github.com/zerodevapp/kernel/pull/68' },
			{ label: 'EIP-712 typed data', url: 'https://github.com/zerodevapp/kernel/pull/55' },
			{ label: 'Gas optimizations', url: 'https://github.com/zerodevapp/kernel/pull/50' },
		],
	},
	{
		project: 'eRPC',
		context: 'RPC load balancer',
		url: links.erpc,
		items: [
			{ label: 'JS and TS config', url: 'https://github.com/erpc/erpc/pull/123' },
			{ label: 'CLI tooling', url: 'https://github.com/erpc/erpc/pull/143' },
			{ label: 'Config validation', url: 'https://github.com/erpc/erpc/pull/139' },
		],
	},
	{
		project: 'Permissionless.js',
		context: 'Pimlico SDK',
		url: links.permissionless,
		items: [
			{
				label: 'Kernel wallet support',
				url: 'https://github.com/pimlicolabs/permissionless.js/pull/42',
			},
		],
	},
	{
		project: 'Others',
		context: 'IaC, agents, contests',
		url: links.sst,
		items: [
			{ label: 'SST', url: 'https://github.com/sst/sst/pull/5268' },
			{ label: 'Eliza', url: 'https://github.com/elizaOS/eliza/pull/1810' },
			{ label: 'Jokerace', url: 'https://github.com/jk-labs-inc/jokerace/issues/1170' },
		],
	},
];
