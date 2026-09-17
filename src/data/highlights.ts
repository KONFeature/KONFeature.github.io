/**
 * Measured facts used in the landing readout.
 *
 * Every entry comes from a real system and links to the write-up that explains it.
 * Nothing goes in this list without a source, because the accent colour on the site
 * means "this number was measured".
 */
export interface Highlight {
	/** The measured value. Set in mono, carries the accent. */
	value: string;
	/** What was measured. */
	label: string;
	/** Where the number comes from. */
	source: string;
	href: string;
	external?: boolean;
}

export const HIGHLIGHTS: Highlight[] = [
	{
		value: '100k+',
		label: 'daily wallet loads',
		source: 'Frak smart wallet',
		href: '/projects/frak/',
	},
	{
		value: '-85%',
		label: 'infrastructure cost',
		source: 'AWS to self-hosted',
		href: '/articles/frak/cost-effective-infra/',
	},
	{
		value: '-8,702',
		label: 'lines of orchestrator deleted',
		source: "L'Atelier on Kata",
		href: '/articles/atelier/atelier-kubernetes-migration/',
	},
	{
		value: '1222°C',
		label: 'kiln held by Rust firmware',
		source: 'Pico Kiln controller',
		href: '/projects/pico-kiln/',
	},
];

/** Secondary proof used in the about page intro. */
export const GAS_GOLFING = {
	value: '#2',
	label: 'global, EVM gas golfing contest',
	href: 'https://x.com/QNivelais/status/1791490793913413832',
};
