// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Quentin Nivelais';
export const SITE_DESCRIPTION = 'Systems engineer and CTO at Frak Labs. Production smart wallets, self-hosted Kubernetes platforms, Rust firmware and agent tooling, written up from the systems themselves.';
export const AUTHOR_NAME = 'Quentin Nivelais';
export const TWITTER_HANDLE = '@QNivelais';
export const GITHUB_HANDLE = 'KONFeature';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/quentin-nivelais-5081a4141/';
export const SITE_URL = 'https://nivelais.com';

// Consulting & Contact
export const CALENDLY_URL = 'https://app.cal.eu/konfeature';
export const TELEGRAM_HANDLE = '@KONFeature';
export const TELEGRAM_URL = 'https://t.me/KONFeature';
export const AVAILABILITY = 'Q3 2026';
export const AVAILABILITY_STATUS = 'limited'; // 'available' | 'limited' | 'booked'

// Positioning
//
// The corpus spans smart contracts, Kubernetes platforms, embedded firmware, mobile
// and agent tooling, so the positioning leads with the range rather than with one
// specialism. Account abstraction is a proof point, not the label.
export const JOB_TITLE = 'Systems engineer, CTO at Frak Labs';
export const TAGLINE =
	'I build production systems end to end: smart wallets, self-hosted infrastructure, embedded firmware, and the tooling around them.';

/**
 * Landing headline. Display type sets the limit, not the copy. Measured budget: the
 * hero column fits about 21 characters per line at 60px, so two lines means 40
 * characters or fewer. The word "production" moved to HERO_SUBTEXT, and the measured
 * readout beside the headline carries the proof.
 */
export const HERO_HEADLINE = 'I ship systems, bytecode to firmware.';

/** Landing subtext. Kept under 20 words so the hero fits one viewport. */
export const HERO_SUBTEXT =
	'CTO at Frak Labs. Account abstraction wallets, self-hosted Kubernetes, Rust firmware, and infrastructure for AI coding agents.';

/** One label per intent. Contact is always this string, everywhere on the site. */
export const CONTACT_LABEL = 'Book a call';

export const links = {
    // IaC & DevOps
    sst: 'https://sst.dev',
    pulumi: 'https://pulumi.com',

    // Tech
    bun: 'https://bun.sh',
    nitro: "https://v3.nitro.build",
    tanstack: 'https://tanstack.com',
    zustand: 'https://zustand-demo.pmnd.rs',
    elysia: 'https://elysiajs.com',
    tauri: 'https://tauri.app',
    rolldown: 'https://rolldown.rs',
    tsdown: 'https://tsdown.com',
    pymupdf: 'https://pymupdf.readthedocs.io',

    // Web3 & Blockchain
    foundry: 'https://getfoundry.sh',
    huff: 'https://docs.huff.sh',
    viem: 'https://viem.sh',
    Ox: 'https://oxlib.sh',

    // Smart acocunt
    kernel: 'https://github.com/zerodevapp/kernel/tree/v2.4',
    permissionless: 'https://github.com/pimlicolabs/permissionless.js',
    pimlico: 'https://www.pimlico.io',

    // Tools open source
    openPanel: 'https://openpanel.dev',
    erpc: 'https://erpc.cloud',
    pounder: 'https://ponder.sh',

    // Company
    frak: 'https://frak.id',
    frakWallet: 'https://wallet.frak.id',
}