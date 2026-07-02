import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
	// Load Markdown and MDX files in the `src/content/articles/` directory.
	loader: glob({ base: './src/content/articles', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) => z.object({
		title: z.string(),
		subtitle: z.string().optional(),
		date: z.coerce.date(),
		category: z.string(),
		tags: z.array(z.string()),
		icon: z.string(),
		iconColor: z.string().optional(),
		description: z.string(),
		heroImage: image().optional(),
		mediumUrl: z.string().optional(),
		githubUrl: z.string().optional(),
		group: z.string().optional(),
		featured: z.boolean().optional().default(false),
		draft: z.boolean().optional().default(false),
	}),
});

const projects = defineCollection({
	// One markdown file per project in `src/content/projects/`.
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) => z.object({
		name: z.string(),
		tagline: z.string(),
		description: z.string(),
		status: z.enum(['production', 'internal', 'personal', 'archived']),
		role: z.string(),
		period: z.string(),
		order: z.number(),
		icon: z.string(),
		iconColor: z.string().optional(),
		tech: z.array(z.string()),
		metrics: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
		links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
		// Article group ids whose articles are listed under this project
		articleGroups: z.array(z.string()).default([]),
		// Explicit article ids (e.g. 'side-projects/wordforge') for projects without a dedicated group
		articleIds: z.array(z.string()).default([]),
		heroImage: image().optional(),
		featured: z.boolean().optional().default(false),
		draft: z.boolean().optional().default(false),
	}),
});

export const collections = { articles, projects };
