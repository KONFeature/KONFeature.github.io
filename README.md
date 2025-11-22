# Quentin Nivelais — Portfolio

Personal portfolio and technical blog built with Astro, React, and TypeScript. Features deep-dive technical articles on Web3 development, hardware engineering, infrastructure optimization, and AI systems.

**Live site**: [nivelais.com](https://nivelais.com)

## Tech Stack

- **Framework**: [Astro 5](https://astro.build) — Static site generation with optimal performance
- **UI Library**: [React 19](https://react.dev) — Interactive components
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) — Utility-first styling with Typography plugin
- **Content**: [MDX](https://mdxjs.com) — Markdown with JSX components
- **Search**: [Pagefind](https://pagefind.app) — Client-side search engine
- **Icons**: [Lucide React](https://lucide.dev) — Modern icon library
- **Math/Diagrams**: KaTeX for mathematical notation, Mermaid for diagrams

## Content Categories

The site features technical articles organized into five main project groups:

- **Frak Labs** — Account abstraction, WebAuthn wallets, blockchain infrastructure, and frontend optimization
- **Pico Kiln** — Hardware engineering with Raspberry Pi Pico, firmware development, and control theory
- **Scenario Parser** — NLP pipeline for screenplay analysis and character psychology modeling
- **Cooking Bot** — AI safety layers, vector search, and deterministic guardrails for LLM applications
- **Web3 & Solidity** — EVM optimization, smart contract security, and cryptographic implementations

## Project Structure

```
├── src/
│   ├── components/      # React (.tsx) and Astro (.astro) components
│   ├── content/
│   │   └── articles/    # MDX articles organized by project group
│   ├── layouts/         # Page layouts
│   ├── pages/           # Routes (file-based routing)
│   ├── styles/          # Global CSS
│   ├── articleGroups.ts # Article category definitions
│   ├── consts.ts        # Site-wide constants
│   └── content.config.ts # Content schema definitions
├── public/              # Static assets (favicons, images, robots.txt)
├── astro.config.mjs     # Astro configuration
└── tailwind.config.mjs  # Tailwind configuration
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or Node.js 18+)

### Installation

```bash
# Clone the repository
git clone https://github.com/KONFeature/portfolio.git
cd portfolio

# Install dependencies
bun install
```

### Development

```bash
# Start dev server at localhost:4321
bun run dev
```

### Build

```bash
# Build for production
bun run build

# Preview production build
bun run preview
```

## Content Management

### Article Structure

Articles live in `src/content/articles/` and are organized by project group. Each article is written in MDX with frontmatter:

```markdown
---
title: "Article Title"
date: 2025-01-01T12:00:00Z
draft: false
subtitle: "Optional subtitle"
category: "engineering"
tags: ["Tag1", "Tag2", "Tag3"]
icon: "rocket"
iconColor: "text-blue-400"
description: "Article summary for SEO and previews"
heroImage: "./assets/project/hero.png"
githubUrl: "https://github.com/username/repo"
group: "project-group-id"
---

Article content here...
```

### Required Frontmatter Fields

- `title` — Article title
- `date` — Publication date (ISO 8601 format)
- `category` — Category slug
- `tags` — Array of tags
- `icon` — Lucide icon name (see `src/components/Icon.tsx`)
- `description` — SEO description
- `group` — Project group ID (must match key in `src/articleGroups.ts`)

### Adding New Article Groups

Edit `src/articleGroups.ts` to add new project categories:

```typescript
export const ARTICLE_GROUPS: Record<string, ArticleGroup> = {
	'new-group': {
		id: 'new-group',
		name: 'Display Name',
		description: 'Group description',
		icon: 'icon-name',
		iconColor: 'text-color-class',
		order: 6,
	},
};
```

## Features

- **Dark Mode Design** — Optimized for readability with custom dark theme
- **Math Rendering** — KaTeX support for mathematical notation
- **Diagram Support** — Mermaid diagrams with custom light/dark themes
- **Full-text Search** — Client-side search via Pagefind
- **RSS Feed** — Automatically generated at `/rss.xml`
- **Sitemap** — Auto-generated for SEO
- **Performance Optimized** — Lighthouse 100/100 scores
- **Responsive** — Mobile-first design

## Deployment

The site is configured for deployment to Cloudflare Pages via GitHub Actions (see `.github/workflows/deploy.yml`).

### Manual Deployment

```bash
# Build the site
bun run build

# Deploy ./dist/ to your hosting provider
```

## Code Style

- **Imports**: Grouped by external libs, Astro/React, local components, types
- **TypeScript**: Strict mode with `strictNullChecks`
- **Components**: Functional React components with TypeScript, Astro components for static layouts
- **Formatting**: Tabs for indentation in config files, single quotes in JS/TS
- **Naming**: PascalCase for components, camelCase for functions/variables, SCREAMING_SNAKE_CASE for constants

## License

MIT License — feel free to fork and adapt for your own portfolio.

## Author

**Quentin Nivelais**  
Co-Founder & CTO at Frak Labs

- Twitter: [@QNivelais](https://twitter.com/QNivelais)
- GitHub: [@KONFeature](https://github.com/KONFeature)
- LinkedIn: [quentin-nivelais](https://www.linkedin.com/in/quentin-nivelais)
