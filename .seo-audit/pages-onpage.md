Verification complete. Here is the full audit report.

```markdown
# SEO Audit — Templates, Non-Article Pages, Rendering & On-Page Technical
**Site:** https://nivelais.com (Astro 7 static) · **Lane:** pages/layouts/components/config
**Audited:** 2026-09-18 · **Build inspected:** `dist/` (43 published articles, 0 drafts)

> **Scope note / correction to brief:** the task states 44 articles. The repo contains
> **43** article files (`src/content/articles/**/*.md`), 0 with `draft: true`, and
> `dist/sitemap-0.xml` lists **43** article URLs. All counts below use 43.

---

## Top findings

| # | Severity | Finding | Location |
|---|---|---|---|
| 1 | **High** | KaTeX CSS is a render-blocking third-party stylesheet on **all 43** article pages; only **3** articles contain math | `src/layouts/ArticleLayout.astro:257` |
| 2 | **High** | `404.astro` emits `robots: index, follow` — the soft-404 is indexable | `src/pages/404.astro` / `dist/404.html:7` |
| 3 | **High** | **Nested `<a>` elements** on every category page card that has `githubUrl` — invalid HTML5, browser DOM fix-up breaks the card link | `src/pages/articles/[category].astro` |
| 4 | **High** | 3 URL path segments (`/articles/devops`, `/articles/mobile`, `/articles/opinion`) are **404s** — 5 articles sit under parent directories that don't resolve | `src/articleGroups.ts` vs. content folders |
| 5 | **High** | Homepage hydrates the **entire 19KB `LandingPage`** with `client:load`, including `<nav>`, `<footer>` and all static copy | `src/pages/index.astro:119` |
| 6 | **Medium** | `<meta charset="utf-8">` is emitted **after** two Google Analytics `<script>` tags | `src/components/BaseHead.astro:31-39` |
| 7 | **Medium** | `/case-studies` is a **meta-refresh**, not a 301 | `dist/case-studies/index.html` |
| 8 | **Medium** | RSS is **unsorted** (collection order, not reverse-chronological) and lacks author/category/self-link | `src/pages/rss.xml.js` |
| 9 | **Medium** | `<footer>` is nested **inside `<main>`** on 5 templates — landmark violation | `articles.astro`, `projects.astro`, `[category].astro`, `projects/[slug].astro`, `LandingPage.tsx` |
| 10 | **Medium** | 17 `heroImage` frontmatter values are **never rendered on-page**; no `astro:assets` `<Image>` anywhere in the repo | repo-wide |
| 11 | **Low** | `/articles` and `/projects` titles/descriptions are thin (31/27 and 65/140 chars) | `articles.astro`, `projects.astro` |
| 12 | **Low** | Project detail pages are excluded from Pagefind site search | `src/pages/projects/[slug].astro` |

---

## 1. Per-page meta

`BaseHead.astro` itself is well built — canonical, OG, Twitter, `article:*`, `max-image-preview:large`, conditional `og:image:width/height`. No changes needed to the component contract.

### Extracted values

| Page | `title` (chars) | `description` (chars) | Verdict |
|---|---|---|---|
| `index.astro` | `Quentin Nivelais — Web3 Infrastructure Architect` (48) | `SITE_DESCRIPTION` (157) | **Good.** Both in range. |
| `articles.astro` | `All Articles \| Quentin Nivelais` (31) | `Complete archive of engineering articles and technical deep-dives` (65) | **Thin.** No topic signals, no count. |
| `articles/[category].astro` | `${groupInfo.name} Articles \| Quentin Nivelais` (e.g. 37) | `groupInfo.description` (120–152) | **Correct — already hand-written and unique per group.** Not a template. No fix needed. |
| `articles/[...slug].astro` | article `title`, no brand suffix | `description \|\| subtitle \|\| title` | **Good.** Bare titles maximise SERP room. |
| `projects.astro` | `Projects \| Quentin Nivelais` (27) | `Real-world problems, the systems built to solve them, and my role in each: Web3 infrastructure, self-hosted AI sandboxes, embedded firmware.` (140) | Description **good and hand-written**; title thin. |
| `projects/[slug].astro` | `${project.data.name} \| Quentin Nivelais` | `project.data.description` | **Correct — per-project hand-written.** No fix needed. |
| `404.astro` | `Page not found` (14) | `This page doesn't exist. Browse the articles and projects on Quentin Nivelais instead.` (85) | Weak; and see §4. |

**No duplication** exists across the seven templates — every title and description resolves to a distinct string. That is already correct and is worth stating plainly: the category and project pages are **not** using a generic `"Articles about {X}"` template, which is the common failure mode. They are genuinely authored.

### Exact improved copy

`src/pages/articles.astro` — replace the `BaseHead` line:
```astro
<BaseHead
  title="All Articles — Web3, Infra & EVM Deep-Dives | Quentin Nivelais"
  description="43 engineering deep-dives on account abstraction, ERC-4337/7579, WebAuthn passkeys, Kubernetes cost optimization, and EVM gas golfing — from production systems at Frak Labs."
/>
```
(title 62 · description 189 → trim to 158: drop `— from production systems at Frak Labs.` if you want ≤160.)
Recommended 158-char variant:
```
43 engineering deep-dives on account abstraction, ERC-4337/7579, WebAuthn passkeys, Kubernetes cost optimization and EVM gas golfing, from production systems.
```
Also update the matching `articlesJsonLd.description` (line 48) to the same string so the structured data and the meta agree.

`src/pages/projects.astro`:
```astro
<BaseHead
  title="Projects — Web3 Infrastructure, AI Sandboxes & Firmware | Quentin Nivelais"
  description="Real-world problems, the systems built to solve them, and my role in each: Frak's WebAuthn wallet, a self-hosted Kata sandbox for AI agents, and bare-metal Rust kiln firmware."
/>
```
(title 73 · description 175 → 158-char variant: `Real-world problems and the systems built to solve them: Frak's WebAuthn wallet, a self-hosted Kata sandbox for AI agents, and bare-metal Rust firmware.`)

`src/pages/404.astro`:
```astro
const pageTitle = `Page not found (404) | ${SITE_TITLE}`;
const pageDescription = `That page doesn't exist or has moved. Browse 43 engineering articles on Web3 infrastructure and account abstraction, or view the project write-ups.`;
```

`src/pages/articles/[category].astro` — title is fine, but one nit: for `atelier` the `groupInfo.name` is `L'Atelier`, producing `L'Atelier Articles | Quentin Nivelais`. That is correct but reads awkwardly. Optional:
```astro
const pageTitle = `${groupInfo.name} — Articles | ${SITE_TITLE}`;
```

---

## 2. H1 discipline

**This is already correct on every template.** Exactly one `<h1>` per page, no zero-H1 and no multiple-H1 pages.

| Template | H1 count | H1 text |
|---|---|---|
| `index.astro` → `LandingPage.tsx` | **1** | `Quentin Nivelais` |
| `articles.astro` → `ArticlesPage.tsx` | **1** | `All Articles` |
| `articles/[category].astro` | **1** | `{groupInfo.name}` |
| `articles/[...slug].astro` → `ArticleLayout.astro` | **1** | `{title}` |
| `projects.astro` | **1** | `Projects` |
| `projects/[slug].astro` | **1** | `{project.data.name}` |
| `404.astro` | **1** | `Page not found` |

`LandingPage.tsx` (19KB) checked in full: the only `h1` is at the hero (`Quentin Nivelais`); the five section headings are all `h2` (`Latest Articles`, `Selected Work`, `Engineering Impact`, `Get in Touch`) and article/work titles are `h3`. `Navigation.tsx` contains **no** heading elements (the brand is an `<a>` with a `<span>` — correct). `Footer.tsx` contains no headings. No H1 duplication from component composition.

### Heading-order defect (Medium)

`src/components/ArticlesPage.tsx` — the main article list uses `h3` with **no `h2` parent**:

```jsx
<h1 ...>All Articles</h1>          // line 51
<ArticleGroups .../>               // emits <h2>Browse by Category</h2> then <h3> per group
{/* Filters */}                    // no heading
<h3 className="text-lg font-medium ...">{article.title}</h3>   // ← orphan h3
```

The last `h2` in document order is `Browse by Category`, so all 43 article `h3`s are parsed as children of the *category-cards* section. Fix — add an `h2` immediately before the `{/* Articles List */}` block:

```jsx
{/* Articles List */}
<h2 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-8 border-b border-gray-300 dark:border-white/10 pb-2">
  All Articles ({articles.length})
</h2>
<div className="space-y-1">
```

### H1 copy improvement (Low)

`LandingPage.tsx` H1 is the bare name `Quentin Nivelais`, while the `<title>` carries the keyword. The `<p>` directly below already reads `Web3 Infrastructure Architect & Account Abstraction Specialist`. That is an acceptable name-first pattern for a personal brand — but the H1 carries no topical signal. Low-risk improvement:

```jsx
<h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
  Quentin Nivelais
</h1>
<p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-medium mb-6">
  Web3 Infrastructure Architect<span className="text-gray-400 dark:text-gray-600 mx-2">&</span>Account Abstraction Specialist
</p>
```
→ leave as-is if brand-name ranking for "Quentin Nivelais" is the priority. **This is a judgement call, not a defect.**

Similarly `[category].astro` H1 is `{groupInfo.name}` (e.g. `Frak Labs`, `Pico Kiln`) with no "Articles" qualifier. Consider:
```astro
<h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
  {groupInfo.name}
</h1>
```
→ acceptable, because the `<p>` beneath states `{n} articles`. **No change required.**

---

## 3. Internal linking & crawl depth

### The critical question: is `/articles` server-rendered?

**Verified: yes — and this is already correct.** Despite `ArticlesPage` being a React island with `client:load` and `useState` filters, Astro server-renders React islands at build time. `useState('all')` is the initial state, so `filteredArticles === articles` during SSR and **all 43 `<a href="/articles/...">` are present in the static HTML** of `dist/articles/index.html`.

The filters are `<button onClick>` handlers that only re-render an already-hydrated list. They do **not** gate the links. **Category pages are not orphaned by JS.** This is the failure mode the brief flagged and it does **not** apply here.

`ArticleGroups.tsx` likewise renders real server-side `<a href={`/articles/${groupId}`}>` cards for all 7 groups (line 68), and is rendered inside `ArticlesPage` — so the 7 category pages are crawlable from `/articles`.

### Link graph & click depth

```
/  (homepage)
├── nav → /articles, /projects                        depth 1
├── 5 most-recent article links                       depth 1
├── 2 hard-coded article links (trackRecord)          depth 1
│     /articles/frak/4337-webauthn
│     /articles/frak/cost-effective-infra
├── 1 hard-coded article link (INFRA stat)            depth 1
└── /articles                                          depth 1
      ├── 7 category cards (ArticleGroups)             depth 2
      │     └── articles in that group                 depth 3 ✅
      └── all 43 article links (flat list)             depth 2 ✅
```

**All 43 articles are reachable at depth 2** from the homepage via the flat `/articles` list. Crawl depth is healthy. Additionally `/projects` → `projects/[slug]` → related-article cards gives a second path, and `ArticleNavigation` gives prev/next within a group.

### Pagination

`/articles` renders **all 43** articles with no pagination. At 43 items this is **correct and preferable** — it keeps every article at depth 2 and concentrates internal PageRank. Do not paginate. Revisit past ~150 articles.

### Finding 4 (High) — three URL segments return 404

`getStaticPaths` in `[category].astro` builds pages from `Object.keys(ARTICLE_GROUPS)`:

```ts
const categories = Object.keys(ARTICLE_GROUPS);
// → frak, cooking-bot, web3, side-projects, atelier, kiln, scenario-parser
```

But article URLs derive from the **folder** name. The folders are:
`cooking-bot, devops, frak, kiln, mobile, opinion, scenario-parser, side-projects, web3`

Cross-referencing, confirmed against `dist/`:

| URL segment | Category page built? | Evidence |
|---|---|---|
| `/articles/devops/` | **NO — 404** | `dist/articles/devops/` contains only `bun-memory-leak-kubernetes-restart/`, no `index.html` |
| `/articles/mobile/` | **NO — 404** | `dist/articles/mobile/` contains 3 article dirs, no `index.html` |
| `/articles/opinion/` | **NO — 404** | `dist/articles/opinion/` contains 1 article dir, no `index.html` |
| `/articles/atelier/` | **YES** but is a phantom | `dist/articles/atelier/index.html` exists, yet **no article lives at `/articles/atelier/*`** — all 5 `atelier`-group articles are at `/articles/side-projects/*` |

Impact: 5 published articles (`devops/bun-memory-leak-kubernetes-restart`, 3× `mobile/*`, `opinion/erc7579-uncomfortable-truth`) sit beneath a directory URL that returns a 404. Users and crawlers who truncate the path hit an error page. `/articles/atelier/` meanwhile is a listing whose 5 entries all link *out* of its own path prefix — a breadcrumb/URL mismatch that weakens the topical cluster.

Note these 5 articles are **not orphaned** — their `group` values are `frak` (×4) and `web3` (×1), so they *are* linked from `/articles/frak/` and `/articles/web3/`. The defect is the 404-ing parent URL and the path/breadcrumb incoherence, not reachability.

**Fix (minimal, no content moves).** Generate a category page for every distinct folder as well as every group, so no path segment 404s. In `src/pages/articles/[category].astro`:

```ts
export const getStaticPaths = (async () => {
	const articles = (await getCollection('articles')).filter((a) => !a.data.draft);

	// Every group key that actually has articles …
	const groupKeys = Object.keys(ARTICLE_GROUPS).filter((k) =>
		articles.some((a) => a.data.group === k)
	);
	// … plus every folder segment that appears in a URL.
	const folderKeys = [...new Set(articles.map((a) => a.id.split('/')[0]))];

	const segments = [...new Set([...groupKeys, ...folderKeys])];

	return segments.map((category) => {
		const byGroup = articles.filter((a) => a.data.group === category);
		const byFolder = articles.filter((a) => a.id.startsWith(`${category}/`));
		// Prefer the group taxonomy; fall back to the folder for devops/mobile/opinion.
		const matched = byGroup.length > 0 ? byGroup : byFolder;

		return {
			params: { category },
			props: {
				articles: matched,
				groupInfo: ARTICLE_GROUPS[category] ?? {
					id: category,
					name: category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
					description: `Articles filed under ${category}.`,
					icon: 'blocks',
					iconColor: 'text-gray-400',
					order: 99,
				},
			},
		};
	});
}) satisfies GetStaticPaths;
```

Then add real descriptions for the three new segments to `src/articleGroups.ts` so they are not generic:

```ts
	devops: {
		id: 'devops', name: 'DevOps', order: 8,
		icon: 'blocks', iconColor: 'text-amber-400',
		description: 'Production debugging and platform work: Bun memory leaks under Kubernetes, forced GC, heap snapshots, and health endpoints that lie.',
	},
	mobile: {
		id: 'mobile', name: 'Mobile & Tauri', order: 9,
		icon: 'blocks', iconColor: 'text-pink-400',
		description: 'Native iOS and Android capability from a Tauri shell: WebAuthn passkey plugins, rich share sheets, and recovery hints that survive uninstalls.',
	},
	opinion: {
		id: 'opinion', name: 'Opinion', order: 10,
		icon: 'blocks', iconColor: 'text-yellow-400',
		description: 'Opinionated takes from production experience, starting with why ERC-7579 modular smart wallets are harder to ship than the spec suggests.',
	},
```

Because the new `groupKeys`/`folderKeys` union keys off `ARTICLE_GROUPS` first, adding these three entries makes them render with authored copy **and** keeps `/articles/atelier/` working. Note the `byGroup.length > 0` branch means `/articles/devops/` will list the 1 devops-folder article via the folder fallback.

Also: after this change `/articles/atelier/` still lists articles whose URLs are `/articles/side-projects/*`. That is tolerable, but the cleanest long-term fix is to move the 5 `atelier` files into `src/content/articles/atelier/` (out of my read-only lane; flagging for the content owner) with 301s from the old paths.

### Link text quality

Mostly good — card links wrap a descriptive `h2`/`h3` carrying the article title, which is ideal anchor text. Two weak spots:

- `LandingPage.tsx`: `View all →` and `All projects →`. Low impact (adjacent `h2` supplies context) but improvable:
  ```jsx
  <a href="/articles" className="font-mono text-xs text-gray-500 hover:...">
    All 43 articles →
  </a>
  ```
  ```jsx
  <a href="/projects" className="font-mono text-xs text-gray-500 hover:...">
    All project write-ups →
  </a>
  ```
- `[category].astro` and `ArticleLayout.astro`: `View on GitHub` repeated across cards. Acceptable for an external repo link. No change needed.

No `read more` / `click here` anywhere. That is already correct.

---

## 4. `404.astro`

**Soft-404 status:** on a static host Astro cannot set an HTTP status; `dist/404.html` must be wired to the host's 404 handler (Netlify/Cloudflare/S3 do this automatically for a root `404.html`). That part is fine and out of template control.

**Finding (High): the 404 page is marked indexable.** `404.astro` never passes `noIndex`, so `BaseHead`'s default `noIndex = false` applies. Confirmed in the build:

```html
<!-- dist/404.html:7 -->
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
```

If the host ever serves `404.html` with a 200 (a common misconfiguration, and the default for some SPA-style rewrites), Google will index a page titled `Page not found`. `BaseHead` already supports the flag — it is simply unused.

**Fix** — `src/pages/404.astro`:
```astro
<BaseHead title={pageTitle} description={pageDescription} noIndex={true} />
```

**Correct already:** the 404 provides three crawlable recovery links (`/`, `/articles/`, `/projects/`), has exactly one `h1`, places `<Footer />` outside `<main>`, and renders `<Footer />` **without** a client directive (static HTML, zero JS). Note the trailing slashes (`/articles/`, `/projects/`) here are consistent with the sitemap, whereas `Navigation.tsx` uses `/articles` and `/projects` without — see §6.

---

## 5. Redirects — `/case-studies` → `/projects`

`astro.config.mjs`:
```js
redirects: {
  '/case-studies': '/projects',
},
```

**Verified output** (`dist/case-studies/index.html`, entire file):
```html
<!doctype html><title>Redirecting to: /projects</title><meta http-equiv="refresh" content="0;url=/projects"><meta name="robots" content="noindex"><link rel="canonical" href="https://nivelais.com/projects"><body>	<a href="/projects">Redirecting from <code>/case-studies/</code> to <code>/projects</code></a></body>
```

**Finding (Medium): this is a meta-refresh, not a 301.** In `output: 'static'` mode Astro cannot emit an HTTP redirect, so it emits this HTML shim. Google treats an instant (`content="0"`) meta refresh as a redirect, but it is explicitly a *weaker*, slower signal than a 301 and is re-crawled rather than collapsed.

**Mitigations already present and correct:** `<meta name="robots" content="noindex">`, `<link rel="canonical" href="https://nivelais.com/projects">`, and a real `<a href="/projects">` fallback. This is about as good as a static shim gets.

**Sitemap — clean.** `dist/sitemap-0.xml` contains **no** `/case-studies` entry (verified by full read of the file; 60 `<url>` entries = 1 home + 1 `/articles/` + 7 category + 43 articles + 1 `/projects/` + 8 project pages). `@astrojs/sitemap` correctly excludes redirect pages. **No action needed on the sitemap.**

**Fix** — promote to a real 301 at the edge. Host-dependent; pick one:

Netlify — `public/_redirects`:
```
/case-studies   /projects   301
/case-studies/  /projects   301
```
Cloudflare Pages — `public/_redirects` (same syntax).
Vercel — `vercel.json`:
```json
{ "redirects": [{ "source": "/case-studies", "destination": "/projects", "permanent": true }] }
```

Keep the Astro `redirects` entry as a fallback; the edge rule wins.

Note the shim covers `/case-studies` only. If the old site had `/case-studies/<slug>` URLs, add a wildcard:
```
/case-studies/*  /projects/:splat  301
```

---

## 6. Accessibility-as-SEO

### Correct already
- Every template has `<html lang="en">`.
- `<main>` present on all 7 templates.
- `<nav>` in `Navigation.tsx` and in `ArticleNavigation.tsx` (prev/next correctly marked up as `<nav>`).
- `<article>` wraps article body in `ArticleLayout.astro` and each card in `[category].astro` / `projects/[slug].astro`.
- `<time datetime={publishedIso}>` with machine-readable ISO in `ArticleLayout.astro`.
- `aria-label` on the theme toggle and mobile menu buttons; `aria-hidden="true"` on decorative `·` separators and inline SVGs.
- All external links carry `rel="noopener noreferrer"` + `target="_blank"`.

### Finding 3 (High) — nested `<a>` on category pages

`src/pages/articles/[category].astro`. The card opens an anchor, then opens a **second anchor inside it**:

```astro
<a href={`/articles/${article.id}`} class="block">
  <div class="p-6 rounded-lg border ...">
    ...
    {article.data.githubUrl && (
      <div class="mt-4 pt-4 border-t border-gray-200 dark:border-white/5">
        <a
          href={article.data.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 ..."
        >
          <Icon name="github" className="w-4 h-4" />
          View on GitHub
        </a>
      </div>
    )}
  </div>
</a>
```

Interactive content may not be nested inside `<a>` (HTML5 §4.5.1). The parser performs fix-up: it **closes the outer `<a>` early**, splitting the card into two sibling anchors and orphaning the trailing markup. Result: unpredictable anchor boundaries, a broken tap target, and ambiguous anchor text for the article link. This fires on `/articles/side-projects/` (wordforge, tableau-elec) and any future group whose articles set `githubUrl`.

**Fix** — take the GitHub link out of the anchor by making the card a non-anchor container with a stretched-link title:

```astro
<article class="group relative p-6 rounded-lg border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
  <div class="flex items-start justify-between gap-4 mb-3">
    <h2 class="text-xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors flex-1">
      <a href={`/articles/${article.id}`} class="after:absolute after:inset-0">
        {article.data.title}
      </a>
    </h2>
    <time class="font-mono text-xs text-gray-600 shrink-0 mt-1">
      {article.data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </time>
  </div>

  {article.data.subtitle && (
    <p class="text-gray-700 dark:text-gray-300 mb-3 text-sm">{article.data.subtitle}</p>
  )}
  <p class="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{article.data.description}</p>

  <div class="flex items-center gap-4 flex-wrap">
    <div class="flex flex-wrap gap-2">
      {article.data.tags.map((tag: string) => (
        <span class="text-[10px] font-mono text-gray-600 px-2 py-1 bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/5 rounded">{tag}</span>
      ))}
    </div>
    <span class="text-xs text-gray-600 ml-auto">{getReadingTime(article.body || "")}</span>
  </div>

  {article.data.githubUrl && (
    <div class="mt-4 pt-4 border-t border-gray-200 dark:border-white/5">
      <a
        href={article.data.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="relative z-10 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <Icon name="github" className="w-4 h-4" />
        View {article.data.title} on GitHub
      </a>
    </div>
  )}
</article>
```

The `after:absolute after:inset-0` pseudo-element keeps the whole card clickable for the article, `relative z-10` lifts the GitHub link above it, and anchor text is now the article title (better than a generic card wrap). `projects/[slug].astro` uses the same card pattern but has **no** inner anchor — it is fine as-is.

### Finding 9 (Medium) — `<footer>` inside `<main>`

`<footer>` is a page-level landmark and must be a sibling of `<main>`, not a descendant (inside `<main>` it degrades to a generic section and is dropped from the landmark tree).

Affected:
- `src/pages/articles.astro` — `<Footer client:load />` inside `<main class="max-w-3xl ...">`
- `src/pages/projects.astro` — same
- `src/pages/articles/[category].astro` — same
- `src/pages/projects/[slug].astro` — same
- `src/components/LandingPage.tsx` — `<Footer />` inside `<main>`

`ArticleLayout.astro` and `404.astro` are **correct** (`<Footer />` after `</main>`).

**Fix** for `articles.astro` (apply the same shape to the other three `.astro` files):
```astro
<div class="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-300 font-sans selection:bg-gray-200 dark:selection:bg-white/20">
  <Navigation client:load />

  <main class="max-w-3xl mx-auto px-6 pt-32 pb-20">
    <ArticlesPage client:load articles={processedArticles} />
  </main>

  <div class="max-w-3xl mx-auto px-6 pb-20">
    <Footer />
  </div>
</div>
```
and in `LandingPage.tsx`, close `</main>` before `<Footer />`:
```jsx
      </section>
      </main>

      <div className="max-w-3xl mx-auto px-6 pb-20">
        <Footer />
      </div>
    </div>
```
(Note this also drops `client:load` from `Footer` — see §7.)

### Finding (Low) — trailing-slash inconsistency

The sitemap and canonicals use trailing slashes (`https://nivelais.com/articles/`), and `404.astro` links `/articles/` and `/projects/`. But `Navigation.tsx`, `LandingPage.tsx`, `ArticleGroups.tsx`, `ArticlesPage.tsx`, `ArticleNavigation.tsx` and `[category].astro` all link **without** a trailing slash (`/articles`, `/projects`, `/articles/${groupId}`). Astro's default `trailingSlash: 'ignore'` serves both, so this is not a 404 — but it produces an extra redirect hop on most static hosts and splits internal-link signals from the canonical form.

**Fix** — pin the config so builds and links agree, in `astro.config.mjs`:
```js
export default defineConfig({
  site: 'https://nivelais.com',
  trailingSlash: 'always',
  ...
```
then normalise the internal `href`s to include the trailing slash (`/articles/`, `/projects/`, `` `/articles/${groupId}/` ``, `` `/articles/${article.slug}/` ``). Alternatively set `trailingSlash: 'never'` and strip them from `404.astro` — either is fine, but pick one.

---

## 7. Performance / Core Web Vitals

### React islands — hydration inventory

| Component | Directive | Where | Assessment |
|---|---|---|---|
| `LandingPage` | `client:load` | `index.astro:119` | **Excessive (High).** Hydrates the whole 19KB page. |
| `Navigation` | `client:load` | articles, projects, `[category]`, `projects/[slug]`, `404`, `ArticleLayout` | Needs JS (theme toggle, mobile menu, Pagefind search) but not *immediately*. |
| `ArticlesPage` | `client:load` | `articles.astro:79` | Needed for filters, but not above the fold. |
| `Footer` | `client:load` | articles, projects, `[category]`, `projects/[slug]` | **Pure waste.** Zero interactivity. |
| `Footer` | *(none)* | `404.astro`, `ArticleLayout.astro` | **Correct.** |
| `ArticleNavigation` | `client:load` | `ArticleLayout.astro:400` | **Pure waste.** Renders static anchors only. |
| `TableOfContents` | `client:load` | `ArticleLayout.astro:412` | Needs `IntersectionObserver`, but is below/beside content. |

**Finding 5 (High) — homepage over-hydration.** `index.astro` ships and executes the entire landing page as a React island:
```astro
<LandingPage client:load articles={processedArticles} />
```
`LandingPage` imports `lucide-react` (`ArrowRight`, `Calendar`, `MessageCircle`), `BrandIcons`, `Navigation` (which pulls `Terminal, Menu, X, Sun, Moon` + `Search` + Pagefind) and `Footer`. All of it blocks the main thread on load for a page that is ~95% static text and links. Direct INP/TBT cost on the site's most important URL.

**Fix.** The only interactive parts are the theme toggle, the mobile menu and search — all inside `Navigation`. Decompose so the static shell is HTML and only `Navigation` hydrates. Restructure `index.astro`:

```astro
<body class="bg-white dark:bg-[#0a0a0a]">
  <div class="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-300 font-sans selection:bg-gray-200 dark:selection:bg-white/20">
    <Navigation client:idle />
    <LandingPage articles={processedArticles} />
  </div>
</body>
```
and remove the `<Navigation />` + wrapper `<div>` from inside `LandingPage.tsx` (keep `<main>`/`<Footer />`). `LandingPage` then has **no** hooks that matter at runtime — `useMemo` for `recentArticles` runs fine during SSR — so it renders as static HTML with zero client JS.

**Low-effort interim** if you do not want to refactor: change `client:load` → `client:idle` on `LandingPage`, `Navigation`, `ArticlesPage` and `TableOfContents`, and **delete** the directive entirely from `Footer` and `ArticleNavigation`:

```astro
<!-- articles.astro, projects.astro, [category].astro, projects/[slug].astro -->
<Navigation client:idle />
...
<Footer />                       <!-- was: <Footer client:load /> -->
```
```astro
<!-- ArticleLayout.astro -->
<ArticleNavigation
   prevArticle={prevArticle}
   nextArticle={nextArticle}
   groupName={groupName}
/>                               <!-- was: client:load -->
...
<TableOfContents client:idle headings={headings} />
```
Removing `client:load` from `Footer` and `ArticleNavigation` is safe — neither uses a hook or an event handler; both render identical static markup from SSR.

### Finding 1 (High) — KaTeX CSS is render-blocking on every article

`src/layouts/ArticleLayout.astro:257`:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
```

This is unconditional — it is in the layout `<head>`, so all **43** article pages load it. Verified present on `dist/articles/web3/erc-2612-part-3/index.html`, an article with **no** math.

Only **3** articles actually contain `$$` math (`scenario-parser/scenario-parser-pipeline.md`, `kiln/kiln-hardware.md`, `scenario-parser` inline usage); KaTeX output (`class="katex"`) appears in `dist` only under `scenario-parser/scenario-parser-pipeline/`. So **40 of 43** article pages pay for it needlessly.

Cost: `katex.min.css` is ~23KB gzipped and is a **render-blocking** stylesheet on a **third-party origin**, requiring a fresh DNS + TLS + TCP handshake to `cdn.jsdelivr.net` before first paint. (The `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>` in `BaseHead.astro` warms the connection but does **not** remove the render-blocking dependency, and is itself wasted on the 40 pages with no math.) It also introduces a third-party availability/privacy dependency on the critical path.

**Fix — two parts.**

**(a) Self-host.** Removes the cross-origin handshake and the CDN dependency. `katex` is already a transitive dependency of `rehype-katex`:
```astro
---
import 'katex/dist/katex.min.css';
---
```
Astro/Vite will bundle and hash it into `/_astro/`, served same-origin from your own cache headers. Then delete the `<link>` at line 257 **and** the two `cdn.jsdelivr.net` hints in `BaseHead.astro`:
```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
```

**(b) Load it only when the page has math.** `[...slug].astro` already renders the post; detect math and pass a flag.

`src/pages/articles/[...slug].astro`:
```astro
const hasMath = /\$\$|\\\(|\\\[/.test(post.body ?? '');
```
pass `hasMath={hasMath}` to `<ArticleLayout ... />`, then in `ArticleLayout.astro`:
```astro
const { ..., hasMath = false } = Astro.props;
```
```astro
{hasMath && <link rel="stylesheet" href={katexHref} />}
```
Combining (a) and (b): import conditionally is not possible with a top-level `import`, so keep the self-hosted asset and gate it — simplest is to copy `katex.min.css` to `public/katex.min.css` once and emit:
```astro
{hasMath && <link rel="stylesheet" href="/katex.min.css" />}
```
This removes a render-blocking third-party stylesheet from **40** article pages and makes the remaining 3 same-origin.

The `.katex` rules in the layout's inline `<style>` (lines ~248-256) are tiny and can stay unconditional.

### Finding 6 (Medium) — GA before `<meta charset>`

`BaseHead.astro` lines 31–39 emit the gtag tags as the **first** children of `<head>`, before the global metadata block at lines 42+. Confirmed in the build:

```html
<!-- dist/404.html:7 -->
</script><!-- Global Metadata --><meta charset="utf-8"><meta name="viewport" ...>
```

Two problems:
1. **Spec/correctness:** `<meta charset>` must appear within the first 1024 bytes of the document. The two gtag blocks plus the inline config push it later; if the GA snippet ever grows the parser may restart with a different encoding.
2. **Performance:** the inline `gtag('config', ...)` block is **synchronous and parser-blocking**. The `async` attribute only applies to the external `googletagmanager.com` fetch, not to the inline `<script>` below it, which executes immediately and delays `<head>` parsing — including discovery of the stylesheet and canonical.

The `async` on the external script and the `preconnect`/`dns-prefetch` to `googletagmanager.com` are already correct.

**Fix** — move the charset/viewport block above the analytics block in `src/components/BaseHead.astro`. Reorder the top of the file so it reads:

```astro
<!-- Global Metadata -->
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1"} />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="color-scheme" content="dark light" />

<!-- Canonical + Primary Meta Tags -->
<link rel="canonical" href={canonicalURL} />
<title>{title}</title>
<meta name="description" content={description} />

<!-- Google tag (gtag.js) -->
<script is:inline async src="https://www.googletagmanager.com/gtag/js?id=G-BEQMH82DRC"></script>
<script is:inline>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-BEQMH82DRC');
</script>
```
Better still, defer GA entirely so it never competes with first paint:
```astro
<script is:inline>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-BEQMH82DRC');
  addEventListener('load', () => {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-BEQMH82DRC';
    document.head.appendChild(s);
  }, { once: true });
</script>
```

### Finding 10 (Medium) — hero images are never rendered

`heroImage: image().optional()` is declared in `content.config.ts` for both collections, and **17 articles set it**. But repo-wide search for `astro:assets` / `<Image` returns **no matches**. The only consumer is `ArticleLayout.astro:17-19`:
```ts
const imageUrl = heroImage ? new URL(heroImage.src ?? heroImage, Astro.site).toString() : undefined;
const imageWidth = heroImage?.width;
const imageHeight = heroImage?.height;
```
— used solely for `og:image` / `twitter:image`.

**This means there is no LCP image and no CLS risk from hero images, because no hero image is displayed.** So the brief's CLS question resolves to: not applicable, but for the wrong reason. 17 authored hero images are dead weight that never reach a reader, and article pages have no visual anchor for image search or Discover.

The OG side is **correct**: `heroImage.width/height` are the real intrinsic dimensions and `BaseHead` emits `og:image:width`/`og:image:height` from them, with a proper 1200×630 fallback for `/og-default.png`. One caveat — these are the **unoptimised source** images (verified: `og:image` on `frak-frontend-optimization` points at the processed `_astro` asset). Keep an eye on files >5MB, which X/Facebook will reject.

**Fix** — render the hero with `<Image>` so it gets width/height, lazy/eager hints, and format conversion. In `ArticleLayout.astro`, add to the frontmatter:
```astro
import { Image } from 'astro:assets';
```
and after the `<h1>`/subtitle block, before `{tags && ...}`:
```astro
{heroImage && (
  <Image
    src={heroImage}
    alt={subtitle ?? title}
    widths={[640, 960, 1280]}
    sizes="(min-width: 768px) 768px, 100vw"
    loading="eager"
    fetchpriority="high"
    decoding="async"
    class="w-full h-auto rounded-lg border border-gray-200 dark:border-white/10 mt-8"
  />
)}
```
`<Image>` emits intrinsic `width`/`height` attributes automatically, so the reserved box prevents CLS. Use `loading="eager"` + `fetchpriority="high"` because this becomes the LCP element.

### Finding (Medium) — Mermaid `img-svg` output is not aspect-ratio-sized

`rehype-mermaid` with `strategy: 'img-svg'` emits (verified, `dist/articles/frak/frak-listener-ring-architecture/index.html:95`):
```html
<picture><source height="177.26649475097656" id="mermaid-dark-0" media="(prefers-color-scheme: dark)" srcset="data:image/svg+xml,..." >
```
Note `height` is present but **`width` is not**, so the browser cannot derive an aspect ratio from attributes. Worse, the layout CSS overrides sizing anyway:
```css
.prose img[id^="mermaid-"],
.prose picture {
    ...
    width: 100%;
    height: auto;
    ...
}
```
`width:100%; height:auto` with no `aspect-ratio` means the element has **zero height until the SVG is decoded**, then jumps to full height. Because the payload is a `data:` URI there is no network fetch, so the shift window is short — but on long articles with several diagrams (`scenario-parser-pipeline.md` has 5+, `cooking-bot/runtime.md` has 2) the cumulative shift is real, and it is compounded by the inline script that **rewrites `img.src` after `DOMContentLoaded`**:

```js
darkSource.removeAttribute('media');
darkSource.removeAttribute('srcset');
...
if (isDark && storedDarkSrc) { if (img.src !== storedDarkSrc) { img.src = storedDarkSrc; } }
```

Since the site's **default theme is dark**, most visitors render the light diagram first and then get a forced swap + re-decode — a guaranteed second layout/paint on every diagram.

**Fix (a) — reserve space via aspect-ratio.** In the `ArticleLayout.astro` `<style>` block, replace the `width/height` pair in the `.prose picture` rule:
```css
.prose img[id^="mermaid-"],
.prose picture {
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin: 2rem 0;
    width: 100%;
    aspect-ratio: 16 / 9;     /* replaces height: auto */
    object-fit: contain;
    display: block;
    border: 1px solid rgba(0, 0, 0, 0.1);
}
```
A fixed ratio over-reserves for some diagrams but eliminates the shift. For exact sizing, post-process in a small rehype plugin to copy the SVG `viewBox` into `width`/`height` attributes on the `<img>`.

**Fix (b) — kill the dark-mode swap flash.** Prefer CSS over JS: keep the native `<picture>`/`media` behaviour and drive it from the `.dark` class instead of rewriting `src`. Simplest improvement without touching the plugin — run `updateMermaidTheme()` from an inline script placed immediately after the article markup rather than on `DOMContentLoaded`, so the swap happens before first paint. Currently:
```js
document.addEventListener('DOMContentLoaded', () => { updateMermaidTheme(); });
```
This fires *after* the light image has painted.

**Fix (c) — add alt text.** The generated `<img>` carries no meaningful `alt`, so every architecture diagram is invisible to search and screen readers. Configure `rehype-mermaid` to use the code-fence meta as alt text, or add a rehype pass that sets `alt` from the preceding paragraph/heading.

### Other config notes (already correct)
- `prefetch: { prefetchAll: true, defaultStrategy: 'hover' }` — sensible; hover-triggered so no bandwidth waste on the 43-link `/articles` page.
- `experimental: { clientPrerender: true }` — upgrades prefetch to Speculation Rules where supported. Good.
- The anti-FOUC theme script is `is:inline` and runs before paint, and correctly re-applies on `astro:before-swap` for View Transitions. Correct.

---

## 8. RSS — `src/pages/rss.xml.js`

```js
items: posts.map((post) => ({
  title: post.data.title,
  description: post.data.description,
  pubDate: post.data.date,
  link: `/articles/${post.id}/`,
})),
```

**Correct already:** all 43 non-draft posts are included; `link` resolves to the canonical trailing-slash URL (verified in `dist/rss.xml`: `https://nivelais.com/articles/cooking-bot/ingestion/`); `<guid isPermaLink="true">` is auto-generated and matches; `pubDate` is a valid RFC-822 date; channel `title`/`description`/`link` are populated from `consts.ts`.

**Finding 8a (Medium) — items are not sorted.** `getCollection` returns collection order (alphabetical by id), and nothing re-sorts. `dist/rss.xml` opens with `cooking-bot/ingestion` (Oct 2025), then `cooking-bot/introduction`, `devops/...` (Mar 2026), `frak/4337-webauthn` (May 2024) — clearly not chronological. Most readers show feed order for the initial fetch, so new subscribers see a near-random selection instead of the latest work. Both `index.astro` and `articles.astro` sort correctly; the feed was missed.

**Finding 8b (Medium) — missing metadata.** No `<language>`, no `<lastBuildDate>`, no per-item `<category>` (tags are available), no `<author>`, and no `<atom:link rel="self">` (recommended by the RSS Advisory Board and used by feed validators/aggregators for canonicalisation).

**Fix** — full replacement for `src/pages/rss.xml.js`:

```js
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE, AUTHOR_NAME } from '../consts';

export async function GET(context) {
	const posts = (await getCollection('articles'))
		.filter((post) => !post.data.draft)
		.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		xmlns: { atom: 'http://www.w3.org/2005/Atom' },
		customData: [
			`<language>en-us</language>`,
			`<lastBuildDate>${posts[0]?.data.date.toUTCString() ?? new Date().toUTCString()}</lastBuildDate>`,
			`<atom:link href="${new URL('rss.xml', context.site)}" rel="self" type="application/rss+xml"/>`,
		].join(''),
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.date,
			link: `/articles/${post.id}/`,
			author: AUTHOR_NAME,
			categories: post.data.tags,
		})),
	});
}
```

**Deliberately not recommended:** full-text `content:encoded`. Because this is a static build you would have to render each article's HTML into the feed, and with 43 long technical posts (many with inline `data:` URI Mermaid SVGs) the feed would balloon to multiple MB. Description-only is the right call here — noting it so it is not raised as an omission later.

**Discovery is already correct:** `BaseHead.astro` emits
```html
<link rel="alternate" type="application/rss+xml" title={SITE_TITLE} href={new URL('rss.xml', Astro.site)} />
```
on every page.

---

## 9. Additional finding — Pagefind coverage

`data-pagefind-*` usage across the repo:

```
src/pages/index.astro:118      <body ... data-pagefind-ignore>
src/pages/projects.astro:60    <body ... data-pagefind-ignore>
src/pages/articles.astro:73    <body ... data-pagefind-ignore>
src/layouts/ArticleLayout.astro:288   <main ... data-pagefind-body>
```

Pagefind's rule: **if `data-pagefind-body` appears on any page, every page lacking it is skipped.** Only `ArticleLayout` has it, so the index contains article pages only. For the three pages above that is clearly intentional (the explicit `data-pagefind-ignore` shows intent).

**Finding 12 (Low) — but `src/pages/projects/[slug].astro` and `src/pages/articles/[category].astro` have neither attribute**, so they are silently excluded rather than deliberately excluded. The 8 project write-ups — substantial hand-written pages with unique descriptions and real content — are unreachable via the site's own search. This is an internal-UX/engagement issue rather than a crawler issue (Google indexes them fine; they are all in the sitemap).

**Fix** — if project pages should be searchable, add to `src/pages/projects/[slug].astro`:
```astro
<main class="max-w-3xl mx-auto px-6 pt-32 pb-20" data-pagefind-body>
```
Leave `[category].astro` excluded — it is a listing page and would only return duplicate hits.

---

## Summary of file-level changes

| File | Changes |
|---|---|
| `src/components/BaseHead.astro` | Move charset/viewport above GA; defer gtag; drop jsdelivr preconnect/dns-prefetch |
| `src/pages/404.astro` | Add `noIndex={true}`; stronger title/description |
| `src/pages/articles/[category].astro` | Fix nested `<a>`; extend `getStaticPaths` to cover folder segments; move `<Footer>` out of `<main>`; drop `client:load` on Footer |
| `src/articleGroups.ts` | Add `devops`, `mobile`, `opinion` entries with authored descriptions |
| `src/layouts/ArticleLayout.astro` | Self-host + conditionally load KaTeX; render `heroImage` via `<Image>`; `aspect-ratio` for Mermaid; drop `client:load` on `ArticleNavigation`; `client:idle` on `TableOfContents`; run `updateMermaidTheme` pre-paint |
| `src/pages/articles/[...slug].astro` | Compute + pass `hasMath` |
| `src/pages/index.astro` | Lift `Navigation` out of `LandingPage`; `client:idle` |
| `src/components/LandingPage.tsx` | Remove internal `Navigation`; close `</main>` before `<Footer>`; descriptive "View all" anchor text |
| `src/components/ArticlesPage.tsx` | Add `<h2>` before the article list |
| `src/pages/articles.astro` | New title/description (+ matching JSON-LD); Footer out of `<main>`, no `client:load`; `Navigation client:idle` |
| `src/pages/projects.astro` | New title/description; Footer out of `<main>`, no `client:load` |
| `src/pages/projects/[slug].astro` | `data-pagefind-body` on `<main>`; Footer out of `<main>` |
| `src/pages/rss.xml.js` | Sort desc; add language/lastBuildDate/atom self-link/author/categories |
| `astro.config.mjs` | Set `trailingSlash` explicitly |
| `public/_redirects` *(new)* | Real 301 for `/case-studies` |

## Verification the supervisor should run

```bash
bun run build
# 1. category coverage — expect index.html under every segment incl. devops/mobile/opinion
find dist/articles -maxdepth 2 -name index.html | sort
# 2. KaTeX must appear on ~3 pages, not 43
grep -rl "katex.min.css" dist/articles | wc -l
# 3. 404 must be noindex
grep -o 'name="robots" content="[^"]*"' dist/404.html
# 4. RSS must be reverse-chronological
grep -o '<pubDate>[^<]*</pubDate>' dist/rss.xml | head -5
# 5. no nested anchors
npx html-validate "dist/articles/side-projects/index.html"
```
```