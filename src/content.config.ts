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
		description: z.string(),
		mediumUrl: z.string().optional(),
		githubUrl: z.string().optional(),
		group: z.string().optional(),
		featured: z.boolean().optional().default(false),
		draft: z.boolean().optional().default(false),
	}),
});

export const collections = { articles };
