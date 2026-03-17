import { toString } from 'mdast-util-to-string';

export function remarkWordCount() {
	return function (tree, file) {
		const text = toString(tree);
		const words = text.trim().split(/\s+/).filter(Boolean);
		file.data.astro ??= {};
		file.data.astro.frontmatter ??= {};
		file.data.astro.frontmatter.wordCount = words.length;
	};
}
