/**
 * Pagefind search utility
 * Provides a singleton instance of the Pagefind search API
 */

type PagefindInstance = {
	init: () => Promise<void>;
	search: (query: string) => Promise<any>;
};

let instance: PagefindInstance | null = null;
let initPromise: Promise<PagefindInstance> | null = null;

/**
 * Get the initialized Pagefind instance
 * Uses singleton pattern to ensure only one instance exists
 */
export async function getPagefind(): Promise<PagefindInstance> {
	if (instance) return instance;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		// Use Function constructor to prevent Vite from resolving this at build time
		// Pagefind is only available after the build completes
		const pagefind = await new Function('return import("/pagefind/pagefind.js")')();
		await pagefind.init();
		instance = pagefind;
		return pagefind;
	})();

	return initPromise;
}
