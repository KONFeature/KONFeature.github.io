import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
	// Load Markdown and MDX files in the `src/content/articles/` directory.
	loader: glob({ base: './src/content/articles', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		subtitle: z.string().optional(),
		date: z.coerce.date(),
		category: z.string(),
		tags: z.array(z.string()),
		icon: z.string(),
		iconColor: z.string().optional(),
		featured: z.boolean().default(false),
		description: z.string(),
		mediumUrl: z.string().optional(),
	}),
});

export const collections = { articles };
