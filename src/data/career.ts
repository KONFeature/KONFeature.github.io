import { links } from '../consts';

/** One role in the work history. */
export interface CareerEntry {
	period: string;
	role: string;
	org: string;
	url?: string;
	detail: string;
}

/** Single definition of the work history. Imported by the about page. */
export const CAREER: CareerEntry[] = [
	{
		period: '2022 - present',
		role: 'Co-Founder and CTO',
		org: 'Frak Labs',
		url: links.frak,
		detail:
			'Content monetization infrastructure: a self-custodial WebAuthn smart wallet embedded into Shopify and WordPress stores, and the on-chain reward system behind it.',
	},
	{
		period: '2021 - 2023',
		role: 'Lead Android Engineer',
		org: 'Sybel',
		detail:
			'Android and Android Automotive apps, including a partnership with Renault for their onboard system launch.',
	},
	{
		period: '2019 - 2020',
		role: 'Freelance Android Developer',
		org: 'Various clients',
		detail: 'Custom mobile experiences, including the Coyali app to help seniors use smartphones.',
	},
	{
		period: '2017 - 2020',
		role: 'Mobile Engineer Consultant',
		org: 'Capgemini and SNCF',
		detail:
			'Android applications for onboard agents and ticket validation terminals on the French railway system.',
	},
	{
		period: '2016 - 2017',
		role: 'Full Stack Freelancer',
		org: 'Construction sector',
		detail: 'PHP automation tools for inventory management and vehicle mileage tracking.',
	},
];
