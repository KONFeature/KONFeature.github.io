/** Shared across every page that lists articles, so the estimate cannot drift between them. */
const WORDS_PER_MINUTE = 200;

export function getReadingTime(content: string): string {
	const words = content.trim().split(/\s+/).length;
	const minutes = Math.ceil(words / WORDS_PER_MINUTE);
	return `${minutes} min read`;
}
