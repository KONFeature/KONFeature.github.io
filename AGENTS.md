# Agent Guidelines for Portfolio Project

## Commands
- **Dev**: `bun run dev` (starts Astro dev server)
- **Build**: `bun run build` (builds for production)
- **Preview**: `bun run preview` (previews production build)
- **Note**: No test suite configured. Playwright is installed but not set up with scripts.

## Tech Stack
Astro 5 + React 19 + TypeScript + Tailwind CSS + MDX for articles

## Code Style
- **Imports**: Group by external libs, Astro/React, local components, types. Use named exports except for default component exports.
- **TypeScript**: Use strict mode with strictNullChecks. Define interfaces for component props. Leverage Astro's type inference.
- **Components**: React components use functional style with TypeScript. Astro components for layouts/pages. Use `.astro` for static, `.tsx` for interactive.
- **Formatting**: Tabs for indentation in config files, follow existing patterns. Use single quotes in JS/TS, consistent spacing.
- **Naming**: PascalCase for components, camelCase for functions/variables, SCREAMING_SNAKE_CASE for constants (see `src/consts.ts`).
- **Content**: Articles live in `src/content/articles/` as MDX with frontmatter schema defined in `content.config.ts`. Required fields: title, date, category, tags, icon, description.
- **Styling**: Tailwind utility classes. Use Tailwind Typography plugin for article content. Follow existing color scheme (dark theme, white/10 borders).
- **Icons**: Use lucide-react icons via `IconMap` in `src/components/Icon.tsx`. Add new icons to the map if needed.

## Project Structure
- `/src/pages/*` - Routes (Astro file-based routing)
- `/src/components/*` - React (.tsx) and Astro (.astro) components
- `/src/content/articles/*` - MDX blog articles with frontmatter
- `/src/layouts/*` - Page layouts
- `/public/assets/*` - Static assets organized by article
