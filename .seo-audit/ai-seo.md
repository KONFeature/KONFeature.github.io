# AI Search / Answer-Engine Optimization & Structured Data Audit
**Site:** https://nivelais.com (Astro 7 static, 43 published articles)
**Scope:** `public/robots.txt`, `public/llms.txt`, all JSON-LD blocks, content extractability, E-E-A-T signals, machine-readable consulting surface
**Date:** 2026-09-18
**Method:** Read every file cited below at HEAD. No files were modified.

---

## Top findings

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| 1 | **High** | `llms.txt` is hand-run, not built. It is already stale (42 of 43 articles) and drifts silently on every publish. | `public/llms.txt`, `package.json:6`, `scripts/generate-llms-txt.mjs` |
| 2 | **High** | Article author is an anonymous `Person` node with no `@id` and no `sameAs`. The rich `Person` entity with `sameAs` exists **only on the homepage**, so no article page links the author to GitHub/LinkedIn/X. Biggest E-E-A-T gap on the site. | `src/layouts/ArticleLayout.astro:36-41` vs `src/pages/index.astro:43-77` |
| 3 | **High** | No `/about` page and no author bio block on any article. 43 deep technical articles carry zero on-page credential signal beyond a name. | `src/pages/` (no `about.astro`), `ArticleLayout.astro` |
| 4 | **Medium-High** | `robots.txt` handles **2** of the 12 AI agents asked about, and the two it names are put in a `Crawl-delay`-only group that removes them from the `*` group (confirmed: they do **not** inherit `Allow: /`). Useless today, a live foot-gun the moment a `Disallow` is added. | `public/robots.txt:8-13` |
| 5 | **Medium** | ~26 of 43 articles emit **no** `Article.image`. Fix is one line (fall back to `/og-default.png`, which already exists at 1200×630). | `ArticleLayout.astro:57`, `public/og-default.png` |
| 6 | **Medium** | `BreadcrumbList` on article pages skips the group level (`Home > Articles > Title`) even though `/articles/<group>/` hub pages exist and the UI already renders that breadcrumb link. | `ArticleLayout.astro:61-84` vs `ArticleLayout.astro:220-227` |
| 7 | **Medium** | Every `item`/`url` in JSON-LD omits the trailing slash while canonicals and the sitemap use one → two URL strings per entity for crawlers to reconcile. | `articles.astro:55`, `[category].astro:58,83,88`, `projects/[slug].astro:76` |
| 8 | **Medium** | `llms.txt` sorts articles **reverse-alphabetically by file id**, not by date, so the "latest" signal an LLM infers from list order is wrong. | `scripts/generate-llms-txt.mjs:66` |
| 9 | **Medium** | LinkedIn URL mismatch between `sameAs` and the rendered page link — one of them is wrong, and `sameAs` pointing at a non-resolving profile kills entity reconciliation. | `consts.ts:9` vs `LandingPage.tsx:145` |
| 10 | **Medium** | No `.md` endpoints and no `llms-full.txt`. ChatGPT/Claude/Perplexity fetchers currently parse a React-hydrated HTML page to get content that exists as clean markdown on disk. | site-wide |
| 11 | **Medium** | Eight articles open with narrative ledes ("Hey there, fellow blockchain enthusiasts 🚀", "My girlfriend started doing pottery") instead of a direct answer. Answer engines quote the first self-contained factual passage; there often isn't one. | see §4 |
| 12 | **Low-Med** | Two literal unrendered placeholders published in an article body. | `kiln/kiln-hardware.md:27,94` |
| 13 | **Low** | `/articles` `ItemList` declares `numberOfItems: 43` but lists 10. | `articles.astro:51-58` |

---

## 1. `public/robots.txt`

### Current file (verbatim, 13 lines)

```
# robots.txt for nivelais.com
User-agent: *
Allow: /

# Sitemaps
Sitemap: https://nivelais.com/sitemap-index.xml

# Crawl-delay for specific bots (optional)
User-agent: GPTBot
Crawl-delay: 2

User-agent: ChatGPT-User
Crawl-delay: 2
```

### Coverage against the 12 agents asked about

| Agent | Purpose | Explicitly handled? |
|---|---|---|
| GPTBot | OpenAI model training | **Yes** — but only `Crawl-delay: 2` |
| ChatGPT-User | User-triggered fetch inside ChatGPT | **Yes** — only `Crawl-delay: 2` |
| OAI-SearchBot | Powers ChatGPT Search result surfacing | **No** (not even mentioned in the task list — and it is the one that matters most for citations) |
| PerplexityBot | Perplexity index | **No** |
| Perplexity-User | Perplexity user-triggered fetch | **No** |
| ClaudeBot | Anthropic crawl | **No** |
| anthropic-ai | Legacy Anthropic token | **No** |
| Claude-User / Claude-SearchBot | Newer Anthropic tokens | **No** |
| Google-Extended | Opt-in/out for Gemini & grounded generation | **No** |
| CCBot | Common Crawl (feeds many model corpora) | **No** |
| Bingbot | Bing index → Copilot | **No** |
| Applebot-Extended | Apple Intelligence training opt-out | **No** |
| Amazonbot | Alexa/Rufus | **No** |
| Meta-ExternalAgent | Meta AI | **No** |
| Bytespider | ByteDance/Doubao scraping | **No** |

All unnamed agents fall into `User-agent: *` → `Allow: /`, so nothing is blocked today. The gap is **declarative**, not functional.

### Verification of the "Crawl-delay block resets the ruleset" claim — CONFIRMED

Per RFC 9309 §2.2.1, a crawler selects **the single group whose product token matches**, and "the crawler MUST ignore all other groups," including `*`. `GPTBot` and `ChatGPT-User` each match their own group at lines 9-10 and 12-13. Those groups contain **no `Allow` and no `Disallow`** — only a `Crawl-delay` extension directive.

So, precisely:

- **They do NOT inherit `Allow: /` from the `*` group.** The claim is correct.
- **They are still allowed to crawl everything**, because a matching group with zero `Disallow` rules means no path is disallowed (RFC 9309 §2.2.2: absence of a rule = allowed). The current net effect is therefore *identical to no block at all*.
- **The `Crawl-delay: 2` is almost certainly ignored.** `Crawl-delay` is not in RFC 9309. Google documents that it ignores the directive entirely; OpenAI's crawler documentation describes `Allow`/`Disallow` handling and does not document `Crawl-delay` support. Bing and Yandex do honour it — and Bingbot isn't named here. So this block throttles nothing.
- **The latent bug:** the day anyone adds `Disallow: /drafts/` or similar under `User-agent: *`, GPTBot and ChatGPT-User will silently ignore it. Conversely, if someone later adds `Disallow: /` to `*` to block scrapers, these two will keep full access. The ruleset is already logically inconsistent with intent.
- `Sitemap:` at line 6 is a non-group directive; its position between groups is legal and correct. ✅ No change needed there.

**Impact: Medium-High.** Nothing is broken today, but two of the most important AI tokens are in an unmanaged state, and 13 other agents have no explicit policy at a moment when explicit allow-listing is the cheap, reversible move for a consulting-lead-driven site.

### Corrected `public/robots.txt` (exact replacement)

```
# robots.txt for nivelais.com
# Machine-readable site summary: https://nivelais.com/llms.txt

# --- Default: everything is crawlable ---
User-agent: *
Allow: /

# --- Answer engines: explicitly welcome (these drive citations + referral traffic) ---
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: MistralAI-User
Allow: /

User-agent: DuckAssistBot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Applebot
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Meta-ExternalAgent
Allow: /

# --- Training-corpus opt-ins (these tokens only gate model training, not Search) ---
# Google-Extended gates use in Gemini apps / Vertex grounded generation.
# It has no effect on Google Search or AI Overviews (those use Googlebot).
User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

# --- Bulk scrapers with no attribution or referral path ---
# Decision point: uncomment to opt out. Bytespider has a poor record of
# honouring robots.txt, so treat this as a signal, not enforcement.
# User-agent: Bytespider
# Disallow: /

# Sitemaps
Sitemap: https://nivelais.com/sitemap-index.xml
```

Two notes on the above:
1. `Allow: /` with no `Disallow` is technically a no-op — that is intentional. The value is that each token now has an explicit, self-documenting group, so a future `Disallow` under `*` doesn't accidentally change AI policy, and a human reading the file sees the stance.
2. `CCBot` is the one I'd flag for a business decision. Common Crawl feeds training corpora with no referral path back, but it is also the substrate many smaller assistants index from. Given the portfolio's goal is discoverability for consulting leads, I'd keep it allowed.

---

## 2. `public/llms.txt`

### Spec conformance vs llmstxt.org — mostly correct ✅

| Spec element | Status |
|---|---|
| H1 with project/site name | ✅ `# Quentin Nivelais` |
| Blockquote short summary | ✅ `> Web3 Infrastructure Architect & Account Abstraction Specialist. CTO at Frak Labs. …` |
| Optional free-text detail paragraph before any H2 | ✅ "This is the personal portfolio and technical blog of Quentin Nivelais (CTO at Frak Labs)…" |
| H2 sections containing markdown link lists | ✅ 7 sections |
| `- [name](url): description` item format | ✅ every line conforms |
| URLs absolute | ✅ and they carry trailing slashes, matching canonicals |
| `## Optional` section for de-prioritizable links | ❌ absent (spec-optional, but useful — see fix) |

Structurally this is one of the better hand-rolled `llms.txt` files I've seen. The problems are freshness and process, not format.

### Staleness — CONFIRMED

`src/content/articles/**/*.{md,mdx}` contains **43** files; all 43 have `draft: false` or no `draft` key. `llms.txt` lists **42**.

**Missing entry:**

- `src/content/articles/side-projects/atelier-prebuilds.md` — `title: "L'Atelier: Content-Addressed Prebuilds"`, `date: 2026-09-17T12:00:00Z`, `group: "atelier"`. Published **yesterday**; absent from `llms.txt`.

Exact line to add under `## L'Atelier` (and it should be **first** in that section once date-sorted):

```
- [L'Atelier: Content-Addressed Prebuilds](https://nivelais.com/articles/side-projects/atelier-prebuilds/): How L'Atelier v3 bakes any git repo into a content-addressed VolumeSnapshot: content-key caching, torn-snapshot fixes, git credential hygiene, and CoW-clone fast boots.
```

**Other staleness:**

- `- [All articles](https://nivelais.com/articles/): Complete archive of 40+ engineering deep-dives.` — say `43`. LLMs quote numbers verbatim; "40+" is a weaker, vaguer claim than the true one.
- No `/projects/<slug>` URLs at all. Seven project pages exist (`src/content/projects/*.md`: atelier, elle-a-table, frak, pico-kiln, scenario-parser, tableau-elec, wordforge) and they are the highest commercial-intent pages on the site. They're invisible to an LLM reading `llms.txt`.
- No `/articles/<group>/` hub URLs (7 of them exist via `[category].astro`).

**Ordering bug (Medium):**

`scripts/generate-llms-txt.mjs:66`

```js
for (const a of articles.filter((x) => (x.group || 'uncategorized') === g).sort((x, y) => y.id.localeCompare(x.id))) {
```

This sorts **reverse-alphabetically by file id**, not by date. Evidence in the output: under `## Frak Labs`, the first entry is `tauri-recovery-hint-uninstall-survival` and the last is `4337-webauthn` — that ordering is `t > w > n > w > w > w > s > p > m > m > h > f > f > f > c > 4`, i.e. pure string sort. An LLM asked "what has Quentin written most recently?" will read list order as recency and answer wrong. The frontmatter already carries `date:`; the script simply never parses it.

### Generated or hand-maintained? — Generated, but **not at build time**

- `scripts/generate-llms-txt.mjs` exists and its header says: `// Run after content edits so descriptions are current: node scripts/generate-llms-txt.mjs`
- `package.json:6`: `"build": "astro build && node scripts/add-sitemap-lastmod.mjs"` — **`generate-llms-txt.mjs` is not in the build chain.**

So it's a manual ritual, and the ritual was skipped for `atelier-prebuilds`. This will happen again. Two secondary drift risks in the same script:

- `scripts/generate-llms-txt.mjs:22-33` — `GROUP_NAMES` is a hand-copied duplicate of `src/articleGroups.ts` ("kept in sync manually"). It already disagrees: it defines `devops`, `mobile`, `opinion` keys that don't exist in `ARTICLE_GROUPS`, and if a new group is added to `ARTICLE_GROUPS` only, `llms.txt` will print the raw slug as a heading.
- `scripts/generate-llms-txt.mjs:12-14` — `SITE_DESC` is a hand-copied duplicate of `SITE_DESCRIPTION` in `src/consts.ts`.
- `scripts/generate-llms-txt.mjs:44` — frontmatter is parsed with `readFileSync(p,'utf8').split('---')[1]` plus a per-key regex. It works today but will silently produce empty descriptions for any value containing an embedded `"`.

### Recommended fix: make it an Astro route, delete the script and the static file

Astro renders non-HTML routes at build time from the real content collection, which eliminates all three duplication sources and the drift window. **Delete `public/llms.txt` when you do this** — files in `public/` are copied verbatim into `dist/` and would collide with the generated route.

`src/pages/llms.txt.ts`:

```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ARTICLE_GROUPS } from '../articleGroups';
import { SITE_TITLE, SITE_DESCRIPTION, SITE_URL, JOB_TITLE, AVAILABILITY, CALENDLY_URL } from '../consts';

export const GET: APIRoute = async () => {
  const articles = (await getCollection('articles'))
    .filter((a) => !a.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime()); // real recency
  const projects = (await getCollection('projects')).filter((p) => !p.data.draft);

  const groupIds = Object.keys(ARTICLE_GROUPS)
    .sort((a, b) => ARTICLE_GROUPS[a].order - ARTICLE_GROUPS[b].order);

  const out: string[] = [
    `# ${SITE_TITLE}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `Personal portfolio and technical blog of ${SITE_TITLE} (${JOB_TITLE}). ` +
      `${articles.length} engineering deep-dives written for engineers working on blockchain infrastructure, ` +
      `account abstraction (ERC-4337 / ERC-7579), WebAuthn & passkeys, smart contracts, and production DevOps. ` +
      `Available for consulting from ${AVAILABILITY}: ${CALENDLY_URL}`,
    '',
    '## Site sections',
    '',
    `- [Home](${SITE_URL}/): Portfolio overview, latest articles, selected work.`,
    `- [All articles](${SITE_URL}/articles/): Complete archive of ${articles.length} engineering deep-dives.`,
    `- [Projects](${SITE_URL}/projects/): Real-world systems with role, metrics, and architecture notes.`,
    `- [Full text of every article](${SITE_URL}/llms-full.txt): Single-file markdown corpus.`,
    `- [RSS feed](${SITE_URL}/rss.xml): Article feed.`,
    '',
    '## Projects',
    '',
    ...projects.map((p) => `- [${p.data.name}](${SITE_URL}/projects/${p.id}/): ${p.data.description}`),
    '',
  ];

  for (const g of groupIds) {
    const inGroup = articles.filter((a) => a.data.group === g);
    if (!inGroup.length) continue;
    out.push(`## ${ARTICLE_GROUPS[g].name}`, '', `${ARTICLE_GROUPS[g].description}`, '');
    out.push(`- [${ARTICLE_GROUPS[g].name} index](${SITE_URL}/articles/${g}/): All ${inGroup.length} articles in this series.`);
    for (const a of inGroup) {
      out.push(`- [${a.data.title}](${SITE_URL}/articles/${a.id}/): ${a.data.description}`);
    }
    out.push('');
  }

  // Articles with no group still need to appear.
  const ungrouped = articles.filter((a) => !a.data.group || !ARTICLE_GROUPS[a.data.group]);
  if (ungrouped.length) {
    out.push('## Optional', '');
    for (const a of ungrouped) {
      out.push(`- [${a.data.title}](${SITE_URL}/articles/${a.id}/): ${a.data.description}`);
    }
    out.push('');
  }

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
```

This closes findings 1, 8, the "40+" imprecision, the missing project/hub URLs, and both duplication sources in one move. If you'd rather keep the script, the minimum viable fix is `"build": "node scripts/generate-llms-txt.mjs && astro build && node scripts/add-sitemap-lastmod.mjs"` — but you keep the `GROUP_NAMES`/`SITE_DESC` drift.

### `llms-full.txt` — **worth adding.** Medium value, near-zero cost.

`post.body` is already available (it's used for reading time in `articles.astro:23`). A single concatenated corpus means an assistant that fetches one URL gets the entire body of work instead of guessing which of 43 pages to open. Estimated size: 43 articles × roughly 2,500–4,000 words ≈ **600 KB–1.2 MB** of plain text — measure after first build; if it exceeds ~2 MB, split per group (`llms-frak.txt`, etc.) and list the splits in `llms.txt`.

```ts
// src/pages/llms-full.txt.ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_URL, JOB_TITLE } from '../consts';

export const GET: APIRoute = async () => {
  const articles = (await getCollection('articles'))
    .filter((a) => !a.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const chunks = articles.map((a) => [
    `# ${a.data.title}`,
    '',
    `Source: ${SITE_URL}/articles/${a.id}/`,
    `Author: ${SITE_TITLE} (${JOB_TITLE})`,
    `Published: ${a.data.date.toISOString().slice(0, 10)}`,
    `Tags: ${a.data.tags.join(', ')}`,
    '',
    `> ${a.data.description}`,
    '',
    // Images live under src/content and are hashed by Astro's pipeline;
    // keep the alt text, drop the unresolvable path.
    (a.body ?? '').replace(/!\[([^\]]*)\]\([^)]*\)/g, '[image: $1]'),
    '',
    '---',
    '',
  ].join('\n'));

  return new Response(
    [`# ${SITE_TITLE} — full article corpus`, '', `${articles.length} articles.`, '', '---', '', ...chunks].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
```

### Per-article `.md` endpoints — **worth adding.** Highest ROI item in this section.

Article pages ship `<Navigation client:load />`, `<TableOfContents client:load />`, KaTeX CSS from a CDN, a 200-line `<style>` block, and a `<dialog>` with inline scripts (`ArticleLayout.astro:93-540`). A fetcher has to strip all of that to reach prose that already exists as clean markdown on disk. Serving `/articles/<slug>.md` removes the parsing step entirely, and several assistants prefer `text/markdown` when offered.

```ts
// src/pages/articles/[...slug].md.ts
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_URL, JOB_TITLE } from '../../consts';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = (await getCollection('articles')).filter((p) => !p.data.draft);
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
};

export const GET: APIRoute = ({ props }) => {
  const { post } = props as any;
  const body = (post.body ?? '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '[image: $1]')  // hashed asset paths aren't stable
    .replace(/\]\(\/(?!\/)/g, `](${SITE_URL}/`);         // root-relative links -> absolute
  return new Response([
    `# ${post.data.title}`,
    '',
    `> ${post.data.description}`,
    '',
    `Canonical: ${SITE_URL}/articles/${post.id}/`,
    `Author: ${SITE_TITLE} (${JOB_TITLE})`,
    `Published: ${post.data.date.toISOString().slice(0, 10)}`,
    `Tags: ${post.data.tags.join(', ')}`,
    '', '---', '',
    body,
  ].join('\n'), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
```

Then make them discoverable — add to `BaseHead.astro` (guarded by the `article` prop) and to each `llms.txt` line:

```astro
{article && <link rel="alternate" type="text/markdown" href={`${canonicalURL.href.replace(/\/$/, '')}.md`} />}
```

One caveat worth knowing before you build it: `rehype-mermaid` and `rehype-katex` (`astro.config.mjs:31-38`) run at the *rehype* stage, so `post.body` still contains raw ```` ```mermaid ```` blocks and raw `$$…$$` LaTeX. That's fine — arguably better for an LLM than a base64 SVG — but don't expect rendered diagrams.

---

## 3. Structured data

### 3.1 `src/layouts/ArticleLayout.astro:31-84` — `Article` + `BreadcrumbList`

**Correct already:** `@context`, `headline`, `description`, `inLanguage`, `datePublished`, `dateModified`, `mainEntityOfPage`, `keywords`, `articleSection`, `wordCount`. `dateModified` comes from `remark-modified-time.mjs` using `git log -1 --pretty="format:%cI"` → RFC 3339 with offset, which is a valid schema.org `DateTime`. ✅ All 43 `headline` values are well under Google's 110-character guidance (longest is `"L'Atelier Infrastructure: CLIProxy, Verdaccio, Zot and Helm"`, 58 chars). ✅

**Finding 3.1a — `image` missing on ~26 of 43 articles. Impact: Medium.**

`ArticleLayout.astro:57`:
```js
...(imageUrl && { "image": imageUrl }),
```
`imageUrl` derives from `heroImage`, and only **17** article files declare one (`frak/frak-frontend-optimization.md:12`, `scenario-parser/*` ×4, `frak/hardhat-to-foundry.md:11`, `frak/cost-effective-infra.md:11`, `frak/wallet-devx-revolution.md:12`, `frak/frak-infrastructure-iac.md:12`, `frak/polygon-account-abstraction.md:11`, `side-projects/atelier-stop-babysitting.md:12`, `frak/webauthn-release.md:11`, `kiln/pico-python-analysis.md:11`, `frak/mongodb-to-turso-rustfs.md:12`, `web3/erc-2612-part-1.md:11`, `frak/4337-webauthn.md:11`, `web3/securing-solidity-smart-contracts.md:11`). The other 26 emit `Article` with no `image`.

**Does Google require it?** No — Google's Article documentation lists `image` as **recommended**, not required, and there are no required properties for `Article`. Search Console will surface it as a non-blocking "Missing field 'image'" warning. But it does gate the thumbnail in Discover and in several AI answer surfaces, and `BaseHead.astro:26` already falls back to `/og-default.png` for Open Graph — so the JSON-LD is *less* complete than the meta tags on the same page, for no reason.

Fix (`ArticleLayout.astro`, replace lines 16-19 and line 57):

```js
// Resolve image metadata: heroImage may be an ImageMetadata object with width/height.
// Fall back to the generated 1200x630 OG card so Article.image is never absent.
const imageUrl = heroImage ? new URL(heroImage.src ?? heroImage, Astro.site).toString() : undefined;
const imageWidth = heroImage?.width;
const imageHeight = heroImage?.height;
const schemaImage = {
	"@type": "ImageObject",
	"url": imageUrl ?? new URL('/og-default.png', Astro.site).toString(),
	"width": imageWidth ?? 1200,
	"height": imageHeight ?? 630,
};
```
```js
	"image": schemaImage,
```

**Finding 3.1b — author `Person` is a detached node with no `@id` and no `sameAs`. Impact: High.**

`ArticleLayout.astro:36-41`:
```js
	"author": {
		"@type": "Person",
		"name": AUTHOR_NAME,
		"url": SITE_URL
	},
```

Meanwhile `index.astro:43-77` defines a full `Person` with `@id: "https://nivelais.com/#person"`, `jobTitle`, `worksFor`, `knowsAbout` (8 entries), `hasOccupation`, and `sameAs` → GitHub, LinkedIn, X. **None of that is reachable from any article page.** A crawler that only ever sees `/articles/frak/4337-webauthn/` gets a bare name string with no external verification path — the exact signal answer engines use to decide whether an author is a credible source on ERC-4337.

The `@id` graph is half-built: `index.astro:86` (`websiteJsonLd.author`) and `index.astro:98` (`organizationJsonLd.founder`) both reference `${SITE_URL}/#person` correctly ✅, but articles and projects do not.

**Finding 3.1c — `publisher` as `Person` is valid, but redundant. Impact: Low.**

`ArticleLayout.astro:43-47`. schema.org types `publisher` as `Organization | Person`, so `Person` is **valid** — no error. Google's current Article documentation no longer lists `publisher` among recommended properties at all. Keep it, but make it an `@id` reference rather than a third duplicate literal.

**Finding 3.1d — `BreadcrumbList` skips the group level. Impact: Medium.**

`ArticleLayout.astro:61-84` emits `Home > Articles > <title>` — three levels. But the page's own UI renders a group breadcrumb right below it (`ArticleLayout.astro:220-227`, `<a href={`/articles/${group}`}>{ARTICLE_GROUPS[group].name}</a>`), and `/articles/<group>/` pages exist with their own `CollectionPage` + `BreadcrumbList`. The structured data contradicts the visible navigation and hides the topical cluster — which is precisely the signal that tells an answer engine "this author has *five* articles on kiln firmware, not one."

**Finding 3.1e — missing `url`, `isPartOf`, `about`. Impact: Low.**

**Corrected `ArticleLayout.astro` JSON-LD (exact replacement for lines 31-84):**

```js
// Build JSON-LD structured data
const groupInfo = group ? ARTICLE_GROUPS[group] : undefined;

const jsonLd = {
	"@context": "https://schema.org",
	"@type": ["BlogPosting", "TechArticle"],
	"@id": `${articleUrl}#article`,
	"url": articleUrl,
	"headline": title,
	"description": description || subtitle || title,
	"inLanguage": "en",
	"author": { "@id": `${SITE_URL}/#person` },
	"publisher": { "@id": `${SITE_URL}/#person` },
	"datePublished": date?.toISOString(),
	"dateModified": lastModified ?? date?.toISOString(),
	"mainEntityOfPage": { "@type": "WebPage", "@id": articleUrl },
	"isPartOf": { "@type": "Blog", "@id": `${SITE_URL}/articles/#blog`, "name": "Quentin Nivelais — Engineering Articles" },
	"image": schemaImage,
	"keywords": tags?.join(', '),
	"about": tags?.map((t: string) => ({ "@type": "Thing", "name": t })),
	"articleSection": groupInfo?.name ?? category,
	"proficiencyLevel": "Expert",
	...(wordCount && { "wordCount": wordCount }),
	...(githubUrl && { "codeRepository": githubUrl })
};

// The full author entity, repeated on every article so no page is a dead end.
// Keep in sync with src/pages/index.astro (or extract to src/schema.ts — recommended).
const personJsonLd = {
	"@context": "https://schema.org",
	"@type": "Person",
	"@id": `${SITE_URL}/#person`,
	"name": AUTHOR_NAME,
	"url": SITE_URL,
	"jobTitle": JOB_TITLE,
	"description": TAGLINE,
	"worksFor": { "@type": "Organization", "name": "Frak Labs", "url": "https://frak.id" },
	"sameAs": [
		`https://github.com/${GITHUB_HANDLE}`,
		LINKEDIN_URL,
		"https://x.com/QNivelais",
		"https://medium.com/@KONFeature"
	],
	"knowsAbout": [
		"Account Abstraction (ERC-4337, ERC-7579)",
		"WebAuthn & Passkeys",
		"Smart Contract Development",
		"Web3 Infrastructure",
		"Kubernetes & DevOps",
		"Blockchain Cost Optimization",
		"Ethereum Virtual Machine (EVM)",
		"Infrastructure as Code"
	]
};

// Build breadcrumb structured data — includes the article group level.
const breadcrumbJsonLd = {
	"@context": "https://schema.org",
	"@type": "BreadcrumbList",
	"itemListElement": [
		{ "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
		{ "@type": "ListItem", "position": 2, "name": "Articles", "item": `${SITE_URL}/articles/` },
		...(groupInfo
			? [{ "@type": "ListItem", "position": 3, "name": groupInfo.name, "item": `${SITE_URL}/articles/${group}/` }]
			: []),
		{ "@type": "ListItem", "position": groupInfo ? 4 : 3, "name": title, "item": articleUrl }
	]
};
```

Then add the third script tag after line 106:

```astro
		<script type="application/ld+json" set:html={JSON.stringify(personJsonLd)} />
```

You'll need to extend the import at `ArticleLayout.astro:8` to `import { AUTHOR_NAME, SITE_URL, JOB_TITLE, TAGLINE, GITHUB_HANDLE, LINKEDIN_URL } from '../consts';`.

Two deliberate choices above worth flagging:
- `"@type": ["BlogPosting", "TechArticle"]` — Google's Article rich result supports `Article`, `NewsArticle`, `BlogPosting`. `TechArticle` is a valid schema.org subtype of `Article` but is **not** in Google's supported list, so pairing it with `BlogPosting` keeps Google eligibility while giving LLMs the more precise type. Multi-type arrays are valid JSON-LD and Google handles them. If you want zero risk, use `"BlogPosting"` alone.
- `articleSection` now prefers the group display name. Right now it emits the `category` frontmatter value — e.g. `scenario-parser/scenario-parser-extraction.md:6` says `category: "electronics"` for an article about PDF parsing, which is simply wrong data being published as a structured signal. Note this is a **content bug worth fixing at the source too** (`electronics` → `system-design`). Also note the `category` taxonomy is currently *unused for routing*: `pages/articles/[category].astro:19-26` builds paths from `Object.keys(ARTICLE_GROUPS)` and filters on `article.data.group`, never on `article.data.category`. The `category` field is display-only + this JSON-LD field.

### 3.2 `src/pages/index.astro:43-104` — `Person` + `WebSite` + `Organization`

**Correct already:** the `@id` graph works (`websiteJsonLd.author` → `#person`, `organizationJsonLd.founder` → `#person`). `knowsAbout`, `hasOccupation`, `worksFor`, `sameAs` are all valid and well chosen. This is the strongest JSON-LD on the site. ✅

**Finding 3.2a — `sameAs` LinkedIn URL disagrees with the rendered link. Impact: Medium.**

`consts.ts:9`:
```ts
export const LINKEDIN_URL = 'https://www.linkedin.com/in/quentin-nivelais';
```
`LandingPage.tsx:145`:
```jsx
<a href="https://www.linkedin.com/in/quentin-nivelais-5081a4141/" className="flex items-center gap-2 …">
```

One of these is wrong. `sameAs` is the mechanism search engines use to merge your site's `Person` node with LinkedIn's — if it 404s, the reconciliation silently fails and you lose the strongest third-party credential link you have. Verify which resolves, then use `LINKEDIN_URL` in both places (`LandingPage.tsx` already imports from `../consts` at line 11 — add `LINKEDIN_URL` to that import and use `href={LINKEDIN_URL}`).

**Finding 3.2b — no `Person.image`. Impact: Low-Medium.**

There is no headshot anywhere in `public/` (contents: favicons, `og-default.png`, `browserconfig.xml`, `site.webmanifest`, `llms.txt`, `robots.txt`). Knowledge panels and several AI profile surfaces want `image`. Add `public/quentin-nivelais.jpg` and `"image": "https://nivelais.com/quentin-nivelais.jpg"`.

**Finding 3.2c — homepage is a profile but isn't typed as one. Impact: Low-Medium.**

The homepage is literally a personal profile page (`LandingPage.tsx` hero → bio → track record → contact). Google supports a `ProfilePage` rich result for creator profiles. Add a fourth block:

```js
const profilePageJsonLd = {
	"@context": "https://schema.org",
	"@type": "ProfilePage",
	"@id": `${SITE_URL}/#profilepage`,
	"url": SITE_URL,
	"name": "Quentin Nivelais — Web3 Infrastructure Architect",
	"dateModified": new Date().toISOString(),
	"mainEntity": { "@id": `${SITE_URL}/#person` },
	"isPartOf": { "@id": `${SITE_URL}/#website` }
};
```
(and add `"@id": `${SITE_URL}/#website`` to `websiteJsonLd`, which currently has none — `index.astro:79-88`.)

**Finding 3.2d — `WebSite` has no `publisher` and no `potentialAction`. Impact: Low.** Pagefind search exists (`components/Search.tsx`) but is client-side only, so a `SearchAction` would point at a URL that doesn't accept a query param. Skip `potentialAction`; do add `"publisher": { "@id": `${SITE_URL}/#person` }`.

### 3.3 `src/pages/projects/[slug].astro:58-79` — `CreativeWork` + `BreadcrumbList`

**Correct already:** `name`, `description`, `url`, `creator`, `keywords` are all valid `CreativeWork` properties. Breadcrumb is 3 levels and matches the actual hierarchy. ✅

**Findings:**
- **Type is too generic (Low-Medium).** WordForge, L'Atelier, Scenario Parser, Pico Kiln, Tableau Elec are software. `SoftwareApplication` (or `SoftwareSourceCode` where there's a repo) tells an assistant "this is a tool you could recommend," which `CreativeWork` does not.
- **`creator` is another detached `Person` literal (Medium).** Same problem as 3.1b.
- **Missing `datePublished`/`dateModified`, `image`, `about`, `sameAs` to the repo/live URLs (Low).** `project.data.links` already holds these (`frak.md:29-33`: `frak.id`, `wallet.frak.id`).
- **Trailing-slash mismatch (Low):** `projects/[slug].astro:76` uses `${SITE_URL}/projects` while the canonical is `/projects/`.

Corrected replacement for lines 58-79:

```js
const isSoftware = project.data.tech.length > 0;

const projectJsonLd = {
	"@context": "https://schema.org",
	"@type": isSoftware ? ["SoftwareApplication", "CreativeWork"] : "CreativeWork",
	"@id": `${projectUrl}#project`,
	"name": project.data.name,
	"alternateName": project.data.tagline,
	"description": project.data.description,
	"url": projectUrl,
	"applicationCategory": "DeveloperApplication",
	"creator": { "@id": `${SITE_URL}/#person` },
	"author": { "@id": `${SITE_URL}/#person` },
	"keywords": project.data.tech.join(', '),
	"about": project.data.tech.map((t: string) => ({ "@type": "Thing", "name": t })),
	"sameAs": project.data.links.map((l: { url: string }) => l.url),
	"isPartOf": { "@type": "CollectionPage", "@id": `${SITE_URL}/projects/#collection` },
	...(project.data.heroImage && {
		"image": new URL(project.data.heroImage.src, Astro.site).toString()
	}),
};

const breadcrumbJsonLd = {
	"@context": "https://schema.org",
	"@type": "BreadcrumbList",
	"itemListElement": [
		{ "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
		{ "@type": "ListItem", "position": 2, "name": "Projects", "item": `${SITE_URL}/projects/` },
		{ "@type": "ListItem", "position": 3, "name": project.data.name, "item": projectUrl },
	],
};
```

Bonus: `project.data.metrics` (`frak.md:21-29`: `"Daily wallet loads": "100k+"`, `"Infra cost": "-85%"`) are exactly the quotable proof points an answer engine wants, and they're currently invisible to structured data. Add:

```js
	"additionalProperty": project.data.metrics.map((m: { label: string; value: string }) => ({
		"@type": "PropertyValue",
		"name": m.label,
		"value": m.value,
	})),
```

### 3.4 `src/pages/articles/[category].astro:47-93` — `CollectionPage` + `BreadcrumbList`

**Correct already:** `CollectionPage` + `mainEntity: ItemList` with all items (no slicing here ✅), `numberOfItems` matches the list length ✅, and the breadcrumb correctly includes the group level ✅ — which makes the article-layout omission (3.1d) an inconsistency, not a philosophy.

**Findings:**
- **Trailing slashes (Low-Medium):** line 58 `${SITE_URL}/articles/${article.id}` and lines 83/88 `${SITE_URL}/articles`, `categoryUrl`. Canonicals carry trailing slashes (Astro's default `build.format: 'directory'`; confirmed by `scripts/add-sitemap-lastmod.mjs:44`, whose regex matches `<loc>https://nivelais.com/articles/([^<]+?)/</loc>`). Fix: append `/` to all four.
- **`author` is a fourth detached `Person` literal (Medium):** lines 62-66 → replace with `{ "@id": `${SITE_URL}/#person` }`.
- **`ListItem` entries carry only `url` + `name` (Low):** adding `"item": { "@type": "BlogPosting", "@id": …, "name": …, "datePublished": …, "description": … }` turns the hub page into a self-contained summary of the cluster, which is exactly what a crawler needs to decide whether to fetch 5 more pages.

### 3.5 `src/pages/articles.astro:43-65` — `CollectionPage`

**Finding — `numberOfItems` lies. Impact: Low.**

```js
		"numberOfItems": processedArticles.length,   // 43
		"itemListElement": processedArticles.slice(0, 10).map(…)   // 10
```

Not a schema.org *error* (`ItemList` permits a partial listing), but it's self-contradictory data and it hides 33 URLs from any consumer that trusts the JSON-LD over the DOM. This is a static build; emitting all 43 costs a few KB. Drop the `.slice(0, 10)`, or if you want to cap it, set `"numberOfItems": 10` and add `"url": `${SITE_URL}/articles/`` so the consumer knows where the rest are.

Also: `author` is a fifth detached `Person` literal (lines 59-64) → `{ "@id": `${SITE_URL}/#person` }`. And add `"@id": `${SITE_URL}/articles/#collection``, `"isPartOf": { "@id": `${SITE_URL}/#website` }`, plus a `BreadcrumbList` (this page has none while `/articles/<group>/` and `/projects/<slug>/` both do).

### 3.6 `src/pages/projects.astro:17-38` — `CollectionPage`

**Correct already:** lists all projects, `numberOfItems` matches. ✅
**Findings:** same detached `author` (lines 32-36), same missing trailing slash (line 28 `${SITE_URL}/projects/${project.id}`), no `BreadcrumbList`.

### 3.7 Cross-cutting recommendation

Five files now hand-build a `Person` literal. Extract one helper and import it everywhere — this is the single change that fixes findings 2, 3.1b, 3.3, 3.4, 3.5, 3.6 at once:

```ts
// src/schema.ts
import { AUTHOR_NAME, SITE_URL, JOB_TITLE, TAGLINE, GITHUB_HANDLE, LINKEDIN_URL } from './consts';

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const personRef = { "@id": PERSON_ID };
export const personJsonLd = { /* full node, as in §3.1 */ };
```

---

## 4. Extractability of article content

I sampled 8 articles across 7 folders:

1. `web3/erc-2612-part-1.md`
2. `devops/bun-memory-leak-kubernetes-restart.md`
3. `frak/4337-webauthn.md`
4. `frak/hardhat-to-foundry.md`
5. `opinion/erc7579-uncomfortable-truth.md`
6. `kiln/kiln-hardware.md`
7. `side-projects/wordforge.md`
8. `cooking-bot/introduction.md`

Plus repo-wide greps for tables, question-headings, and summary blocks.

### What's already working ✅

- **Question-shaped H2/H3s exist in 12 articles** — `web3/erc-2612-part-1.md:42` `### How does ERC-2612 work?`, `:74` `## What are the benefits of ERC-2612?`; `frak/mongodb-to-turso-rustfs.md:78` `## Why libSQL + sqld, Not Raw SQLite?`; `frak/frak-frontend-optimization.md:123,154,423`; `scenario-parser/architecture.md:529,544,560`. These are literally the retrieval keys answer engines match on.
- **Comparison tables exist in 12 files** (32 tables total) — e.g. `frak/frak-frontend-optimization.md:513-522` (8-row before/after metrics table), `frak/frak-wallet-ci-overhaul.md:24`, `scenario-parser/architecture.md` (8 tables). These are the most citable structures on the site.
- **Two articles have explicit `## Key Takeaways` sections** — `frak/frak-frontend-optimization.md:539`, `frak/wallet-devx-revolution.md:238`. Plus `frak/frak-infrastructure-iac.md:818` `## The Bottom Line`.
- **Dense internal linking with descriptive anchors** — e.g. `mobile/native-webauthn-tauri-plugin-ios-android.md:16` links to `/articles/frak/4337-webauthn/` mid-sentence; `opinion/erc7579-uncomfortable-truth.md:26` links to the prior WebAuthn article. This builds a topical graph an LLM can traverse. Well done.
- **Specific, quotable numbers throughout** — "13 seconds vs 102 milliseconds", "9 minutes to 2", "8,702 lines deleted", "-85% infra cost", "35,000+ French recipes". This is the raw material; the problem is packaging, not substance.

### Gap 1 — Narrative ledes bury the answer. Impact: Medium. Affects most articles.

Answer engines extract the first self-contained factual passage. Here is what they currently find:

| File | Opening line (verbatim) |
|---|---|
| `frak/4337-webauthn.md:18` | `Hey there, fellow blockchain enthusiasts and developers! 🚀 In this piece, we're diving deep into the nitty-gritty…` |
| `side-projects/wordforge.md:15` | `My girlfriend started doing pottery. Beautiful handcrafted pieces that deserved an online presence.` |
| `devops/bun-memory-leak-kubernetes-restart.md:14` | `The alert came in on a Tuesday afternoon.` |
| `kiln/kiln-hardware.md:15` | `Reviving an industrial tool is more than just plugging it in. It's an exercise in electrical engineering, thermal physics, and heavy lifting.` |
| `cooking-bot/introduction.md:17-18` | `## Building a Safety-First AI Cooking Assistant` then `In the world of AI-powered food applications, there's no room for error…` |

None of these answer a question. They're good *writing* — I'm not asking you to delete them.

**Concrete fix: add a 40-60 word answer block immediately after the H1, before the lede.** It's additive, it doesn't touch the narrative voice, and it gives the extractor a clean target. Example for `devops/bun-memory-leak-kubernetes-restart.md` (insert at line 14, before "The alert came in…"):

```markdown
**Short answer:** A Bun 1.1.38 + Elysia.js service leaked RSS at roughly 10 MB/hour in Kubernetes — 120 MB at boot, 400 MB+ before the OOM kill, on a smooth ramp rather than a sawtooth. `bun:jsc`'s `heapStats()` showed the JS heap flat at ~42 MB, so the growth was outside the JS heap. The fix that shipped was a health endpoint that reports unhealthy above a threshold and lets Kubernetes restart the pod.
```
(58 words, self-contained, contains the entities — Bun, Elysia, Kubernetes, `bun:jsc`, RSS, OOM — that a query would match.)

For `frak/4337-webauthn.md`, insert before line 18:

```markdown
**Short answer:** ERC-4337 user operations can be validated with WebAuthn passkey signatures instead of an EOA key. Because WebAuthn signs a double hash of a JSON payload rather than your 32-byte challenge, the authenticator data and client data must be forwarded on-chain and re-hashed there. Frak uses the FreshCryptoLib (FCL) P256 verifier with base64 calldata encoding, inside a ZeroDev Kernel validator module.
```
(62 words.)

Do this for all 43. It is the highest-leverage content change in this audit.

### Gap 2 — Zero definition blocks. Impact: Medium.

Not one article defines its core term in a standalone, liftable sentence. `web3/erc-2612-part-1.md:42-44` comes closest and shows the right shape:

> `ERC-2612 introduces a new function called **permit** that takes an **EIP-712 signature** as an input and updates the allowance mapping accordingly.`

That's a clean definition — but it's on line 42, after 20 lines of preamble, and the pattern isn't repeated in any other article. Adopt it as a house style: the first paragraph under any `## What is X` / `## Why X` heading should be a complete definition with no anaphora ("this", "it", "the above") pointing outside the paragraph.

### Gap 3 — Comparison claims without comparison tables. Impact: Medium.

`frak/hardhat-to-foundry.md` is the clearest case. It has `## Hardhat vs Foundry` (line 26) and `## Benchmark` (line 34), and the headline numbers are real:

> `You can see that Hardhat took **13 seconds** to execute all the tests, and almost 9 seconds for the test where we need to empty the treasury. Meanwhile, Forge only took **102 milliseconds** to perform the same thing.` (line 42)

But the *evidence* is two images (`hardhat-test-benchmark-13sec.png`, `forge-test-benchmark-102ms.png`, line 40) and the comparison itself is prose. The repo-wide table grep confirms `hardhat-to-foundry.md` has **no table**. An LLM answering "Hardhat vs Foundry test speed" has to parse a run-on paragraph.

Fix — insert after line 34:

```markdown
| | Hardhat | Foundry (Forge) |
|---|---|---|
| Language | JavaScript (Mocha + ethers.js) | Solidity |
| Local chain | Hardhat Network | Anvil |
| Full suite runtime (FrakTreasuryWallet) | **13 s** | **102 ms** |
| Slowest single test (drain treasury) | ~9 s | included in the 102 ms |
| Fuzzing | Not available | 256 runs, included |
| Migration cost | — | ~1 week to port the suite |
```

Same treatment for `frak/webauthn-release.md` (FCL vs alternative P256 approaches, currently bulleted prose at `4337-webauthn.md:68+`) and `opinion/erc7579-uncomfortable-truth.md` (Privy vs Dynamic vs Web3Auth vs self-hosted ZK login — currently a bullet list at line 33).

### Gap 4 — No FAQ sections anywhere. Impact: Medium.

Zero articles contain an `## FAQ` heading. Twelve articles contain question-shaped headings scattered mid-body, which is good but not consolidated. See §6.1 for the concrete candidates.

### Gap 5 — Published placeholder text. Impact: Low-Medium but embarrassing.

`kiln/kiln-hardware.md:27`:
```markdown
**[IMAGE: Original 3-phase wiring diagram with star configuration]**
```
`kiln/kiln-hardware.md:94`:
```markdown
**[IMAGE: Electrical wiring diagram showing complete power delivery chain]**
```

These render as literal bold text in the published article and will be extracted as content. Either add the images or delete the lines.

Related, lower severity: `kiln/pico-python-analysis.md:28,157` use `![SCREENSHOT: 4-panel plot showing temperature curve, SSR output, step boundaries, and rate](…)`. The image exists, but "SCREENSHOT:" as an alt-text prefix is noise — alt text is a real extraction surface. Change to `![4-panel plot: temperature curve, SSR output, detected step boundaries, and rate of rise](…)`.

### Gap 6 — H1/H2 duplication. Impact: Low.

`cooking-bot/introduction.md` renders `<h1>Safety-First AI for Food Systems</h1>` (from frontmatter, via `ArticleLayout.astro:245`) immediately followed by body line 17 `## Building a Safety-First AI Cooking Assistant`. Two near-identical top headings with no content between them. Replace the H2 with the answer block from Gap 1.

### Summary of extractability recommendations, ranked

1. Add a 40-60 word `**Short answer:**` block after the H1 of all 43 articles.
2. Add `## Key Takeaways` (3-5 bullets, each self-contained) to the 41 articles that lack one — the two that have it (`frak-frontend-optimization.md:539`, `wallet-devx-revolution.md:238`) are the template.
3. Convert the prose comparisons in `hardhat-to-foundry.md`, `erc7579-uncomfortable-truth.md`, `webauthn-release.md` into tables.
4. Add a `## FAQ` section to the 7 articles listed in §6.1, with `FAQPage` JSON-LD.
5. Fix the two `[IMAGE: …]` placeholders and the `SCREENSHOT:` alt prefixes.
6. Fix `scenario-parser/scenario-parser-extraction.md:6` (`category: "electronics"` on a PDF-parsing article).

---

## 5. E-E-A-T

### What exists ✅

- **Byline on every article** — `ArticleLayout.astro:264-276`: `By <a href="/">Quentin Nivelais</a>` plus `<time datetime={publishedIso}>` and a conditional `Updated <time>` gated on a >7-day delta (`ArticleLayout.astro:28`). Machine-readable dates, visible attribution. Good.
- **Strong first-person experience signals in the prose** — `hardhat-to-foundry.md:18` "As the head of smart contract at Frak…"; `erc7579-uncomfortable-truth.md:22` "I spent the last 2-3 weeks building…"; `erc-2612-part-1.md:76` "In my experience with Frak, where we have custodial wallets…". This is genuine first-hand Experience, the hardest E-E-A-T component to fake, and it's present throughout.
- **Verifiable third-party proof on the homepage** — `LandingPage.tsx:264-340` links to 9 specific merged PRs (`zerodevapp/kernel/pull/68`, `erpc/erpc/pull/123`, `pimlicolabs/permissionless.js/pull/42`, `sst/sst/pull/5268`, …) and a gas-golfing rank with a source link. Excellent authority evidence.
- **`sameAs` on the homepage `Person`** — GitHub, LinkedIn, X (`index.astro:60-64`).
- **Contact is real and reachable** — `CALENDLY_URL` in `Navigation.tsx:45`, `LandingPage.tsx:126` & `:371`, `Footer.tsx:16`, `projects/[slug].astro:250`; `TELEGRAM_URL` in `LandingPage.tsx:380`. Availability status is surfaced site-wide via `Footer.tsx:12-14` (`Available {AVAILABILITY}` → "Available Q3 2026").
- **Transparent about limits** — `frak-hetzner-platform.md:439` "point-in-time recovery available if we ever wire backups (we haven't; explicit TODO before this platform sees production data)". That kind of admission is a trust signal, not a flaw.

### Gaps

**Gap A — No `/about` page. Impact: High.**

`src/pages/` contains `404.astro`, `articles.astro`, `articles/[category].astro`, `articles/[...slug].astro`, `index.astro`, `projects.astro`, `projects/[slug].astro`, `rss.xml.js`. There is no `about.astro`.

The homepage carries the bio, but it's a React island (`<LandingPage client:load />`) mixing hero, articles, work, impact, and contact. There is no single URL an answer engine can cite for "who is Quentin Nivelais". The article byline links to `/`, not to a dedicated author page — meaning the strongest author signal is a homepage that is also the article index and the portfolio.

Fix: create `/about` as a static `.astro` page (no `client:load`) with `ProfilePage` + `Person` JSON-LD, a 200-400 word first-person bio, the credential list currently trapped in `LandingPage.tsx` `trackRecord` (lines 40-69), the PR list, and contact. Then point the byline at it: `ArticleLayout.astro:266` `<a href="/">` → `<a href="/about" rel="author">`.

**Gap B — No author bio block on article pages. Impact: High.**

`ArticleLayout.astro` ends an article with the Medium/GitHub links (lines 289-315) then `ArticleNavigation`. A reader — human or machine — who lands on `/articles/kiln/pico-kiln-rust/` from a search result gets no statement of who wrote it or why they'd know.

Fix — insert after the `{(mediumUrl || githubUrl) && …}` block, inside `<article>`:

```astro
<aside class="mt-12 pt-8 border-t border-gray-300 dark:border-white/10 not-prose" itemscope itemtype="https://schema.org/Person">
    <p class="text-xs font-mono uppercase tracking-wider text-gray-500 mb-3">About the author</p>
    <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
        <a href="/about" class="font-medium text-gray-900 dark:text-white" rel="author">{AUTHOR_NAME}</a> is {JOB_TITLE}.
        He builds production ERC-4337 account abstraction, WebAuthn smart wallets, and self-hosted Kubernetes
        infrastructure, and has contributed to ZeroDev Kernel, Pimlico's permissionless.js, eRPC, and SST.
        Ranked #2 globally in an EVM gas-golfing contest.
    </p>
    <p class="mt-3 text-sm">
        <a href={`https://github.com/${GITHUB_HANDLE}`} rel="me noopener" target="_blank">GitHub</a> ·
        <a href={LINKEDIN_URL} rel="me noopener" target="_blank">LinkedIn</a> ·
        <a href="https://x.com/QNivelais" rel="me noopener" target="_blank">X</a> ·
        <a href={CALENDLY_URL} rel="noopener" target="_blank">Book a call</a>
    </p>
</aside>
```

Note `rel="me"` on the profile links — it's the HTML counterpart to `sameAs` and is independently consumed by several identity crawlers.

**Gap C — `sameAs` unreachable from 50 of ~53 pages. Impact: High.** Covered in §3.1b. Fixed by the `personJsonLd` block.

**Gap D — No contact info in structured data. Impact: Medium.**

The `Person` node has no `contactPoint`, no `email`, no `knowsLanguage`. An assistant asked "how do I hire Quentin?" has to scrape a button. Add to `personJsonLd`:

```js
	"knowsLanguage": ["fr", "en"],
	"contactPoint": {
		"@type": "ContactPoint",
		"contactType": "Consulting & technical advisory",
		"url": CALENDLY_URL,
		"availableLanguage": ["English", "French"]
	},
```

**Gap E — No `mediumUrl` profile in `sameAs`. Impact: Low.** Three articles carry `mediumUrl` (`erc-2612-part-1.md:12`, `4337-webauthn.md:12`, `webauthn-release.md`). The Medium profile should be in `sameAs`, and those articles should note the canonical relationship explicitly ("originally published on Medium; this is the canonical version") so the duplicate isn't read as the authority.

**Gap F — No author photo.** Covered in §3.2b.

**Gap G — RSS feed has no author and no content. Impact: Low.** `src/pages/rss.xml.js:14-17` emits `title`, `description`, `pubDate`, `link` only. Adding `author: AUTHOR_NAME` and `customData` with `<category>` improves a secondary machine-readable surface at trivial cost.

---

## 6. Concrete additions

### 6.1 `FAQPage` schema candidates

**Accuracy note first:** since August 2023, Google restricts `FAQPage` rich results to well-known authoritative government and health sites, so this will **not** produce FAQ accordions in Google for this domain. Recommend it anyway — `FAQPage` is a clean, unambiguous Q→A mapping that ChatGPT, Perplexity, and Claude consume directly when fetching a page, and it costs a JSON blob.

Candidates, ranked by how ready the content already is:

| Article | Existing question headings | Ready? |
|---|---|---|
| `scenario-parser/architecture.md` | `:529` Why Competitive Parsing? · `:544` Why 3 Extraction Formats? · `:560` Why Graph-Based Character Analysis? · `:352` Decision Tree: Which Parser Wins? | **4 Q/A, immediately** |
| `frak/frak-frontend-optimization.md` | `:123` Why Not Just Use Code Splitting? · `:154` Why Is It Faster Without a CDN? · `:423` Why Three Layers? | **3 Q/A, immediately** |
| `frak/webauthn-release.md` | `:33` Why This POC? · `:98` How Does It Work Under the Hood? · `:123` What's Next? | 3 Q/A |
| `web3/erc-2612-part-1.md` | `:42` How does ERC-2612 work? · `:74` What are the benefits of ERC-2612? | 2 Q/A + add "What are the pain points?" from `:80` |
| `frak/mongodb-to-turso-rustfs.md` | `:78` Why libSQL + sqld, Not Raw SQLite? · `:88` Why RustFS for the Backup Target? | 2 Q/A |
| `side-projects/atelier-kubernetes-migration.md` | `:178` Why Cloud Hypervisor? | 1 Q/A — add 2 more |
| `kiln/pico-kiln-app.md` | `:165` Why Not Just Use the Browser? | 1 Q/A — add 2 more |

Implementation — opt-in via frontmatter so it's per-article, not global. Add to `content.config.ts` schema:

```ts
		faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
```

Frontmatter in `scenario-parser/architecture.md`:

```yaml
faq:
  - q: "Why run four competing screenplay parsers instead of picking one?"
    a: "Screenplay PDFs vary wildly in formatting, so no single strategy wins everywhere. Scenario-parser runs four parsers concurrently with Promise.all, scores each output for quality, and keeps the highest scorer. Running all four costs a few seconds; picking wrong costs a whole misparsed screenplay."
  - q: "Why extract three formats (JSON, Markdown, plain text) from one PDF?"
    a: "Each downstream consumer wants a different shape. parser-compute needs the pdfplumber JSON with bounding boxes and margins to apply layout heuristics. LLM parsers do better with structured Markdown that preserves scene headings as '## INT. LOCATION'. Some models perform better on clean plain text, so it is kept as a fallback."
```

Then in `ArticleLayout.astro`:

```js
const faqJsonLd = faq?.length ? {
	"@context": "https://schema.org",
	"@type": "FAQPage",
	"@id": `${articleUrl}#faq`,
	"isPartOf": { "@id": `${articleUrl}#article` },
	"mainEntity": faq.map((item: { q: string; a: string }) => ({
		"@type": "Question",
		"name": item.q,
		"acceptedAnswer": { "@type": "Answer", "text": item.a }
	}))
} : undefined;
```
```astro
{faqJsonLd && <script type="application/ld+json" set:html={JSON.stringify(faqJsonLd)} />}
```

**Critical:** the Q&A must also be rendered visibly on the page. Structured data describing content that isn't in the DOM is a policy violation and gets ignored. Render the `faq` array as an `## FAQ` section near the end of `ArticleLayout.astro`.

### 6.2 `HowTo` schema candidates

**Accuracy note:** Google deprecated `HowTo` rich results in September 2023 and removed them from Search entirely. `HowTo` markup earns **no** Google rich result today. It remains valid schema.org and is still parsed by AI assistants. Recommend it selectively, for the AI channel only.

Strongest candidates (genuinely sequential, reproducible procedures):

1. **`web3/securing-solidity-smart-contracts.md`** — the cleanest fit. Headings are already an ordered procedure: `:25` Tools we will use → `:39` Including the tools inside the project structure → `:49` Sample tools configuration → `:102` Launch all the scripts, and preparation for CI. Add `supply` (Docker, Slither, Mythril, Manticore, Echidna) and 4 `HowToStep`s.
2. **`frak/hardhat-to-foundry.md`** — "migrate a Solidity test suite from Hardhat to Foundry", with `totalTime: "P1W"` (the article says "In about **a week**", line 66+).
3. **`mobile/native-webauthn-tauri-plugin-ios-android.md`** — `:35` The Plugin Skeleton → `build.rs` command registration → Swift `ASAuthorizationController` → Kotlin `CredentialManager`. Genuinely step-wise and there is, as the article says at line 20, "almost no documentation on writing Tauri plugins that talk to native mobile APIs" — a high-value, low-competition query space.
4. **`side-projects/atelier-prebuilds.md`** — `atelier prebuild create` from any checkout; a short 3-step HowTo.

Skip `kiln/kiln-hardware.md`. Marking 380V→220V rewiring as a `HowTo` invites people to follow it; the article's framing (personal restoration log) is the safer posture.

Example for `securing-solidity-smart-contracts.md`:

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "@id": "https://nivelais.com/articles/web3/securing-solidity-smart-contracts/#howto",
  "name": "Set up free Solidity security tooling in Docker",
  "description": "Run Slither, Mythril, Manticore and Echidna against a Solidity project in Docker to catch issues before paying for an audit.",
  "totalTime": "PT2H",
  "estimatedCost": { "@type": "MonetaryAmount", "currency": "EUR", "value": "0" },
  "tool": [
    { "@type": "HowToTool", "name": "Docker" },
    { "@type": "HowToTool", "name": "Slither" },
    { "@type": "HowToTool", "name": "Mythril" },
    { "@type": "HowToTool", "name": "Manticore" },
    { "@type": "HowToTool", "name": "Echidna" }
  ],
  "step": [
    { "@type": "HowToStep", "position": 1, "name": "Choose the tools",
      "url": "https://nivelais.com/articles/web3/securing-solidity-smart-contracts/#tools-we-will-use" },
    { "@type": "HowToStep", "position": 2, "name": "Add the tools to the project structure",
      "url": "https://nivelais.com/articles/web3/securing-solidity-smart-contracts/#including-the-tools-inside-the-project-structure" },
    { "@type": "HowToStep", "position": 3, "name": "Configure each tool",
      "url": "https://nivelais.com/articles/web3/securing-solidity-smart-contracts/#sample-tools-configuration" },
    { "@type": "HowToStep", "position": 4, "name": "Run everything and wire it into CI",
      "url": "https://nivelais.com/articles/web3/securing-solidity-smart-contracts/#launch-all-the-scripts-and-preparation-for-ci" }
  ]
}
```

### 6.3 A machine-readable services file — **strongly recommended**

`src/consts.ts` already holds every input:

```ts
export const CALENDLY_URL = 'https://app.cal.eu/konfeature';
export const TELEGRAM_URL = 'https://t.me/KONFeature';
export const AVAILABILITY = 'Q3 2026';
export const AVAILABILITY_STATUS = 'limited';
export const JOB_TITLE = 'Web3 Infrastructure Architect & CTO at Frak Labs';
export const TAGLINE = 'I help blockchain projects ship production-ready infrastructure and wallet UX that doesn\'t suck.';
```

None of it is exposed as a discrete, citable document. `AVAILABILITY` appears only as UI text inside a React island (`Footer.tsx:13`), and `TAGLINE` only as a paragraph in `LandingPage.tsx:118`. When someone asks ChatGPT "who can I hire to build an ERC-4337 WebAuthn wallet", there is no page for it to cite that says what you do, what it costs, and when you're free.

Create **`src/pages/services.md.ts`** (served at `/services.md`, `text/markdown`), link it from `llms.txt` and from the site nav, and pair it with a `ProfessionalService` JSON-LD block on a rendered `/services` page.

```markdown
# Consulting — Quentin Nivelais

> Web3 Infrastructure Architect & CTO at Frak Labs. I help blockchain projects ship
> production-ready infrastructure and wallet UX that doesn't suck.

**Availability:** Limited — next engagement window Q3 2026
**Book:** https://app.cal.eu/konfeature
**Telegram:** https://t.me/KONFeature
**Languages:** English, French
**Engagement model:** Fractional CTO, architecture review, hands-on build

## What I do

- **Account abstraction (ERC-4337 / ERC-7579).** Production WebAuthn passkey validators,
  smart sessions, modular accounts. Contributed the WebAuthn validator, EIP-712 typed-data
  support, and gas optimizations to ZeroDev Kernel; Kernel wallet support to Pimlico's
  permissionless.js.
- **WebAuthn & passkey wallets.** Seedless, biometric onboarding on web and native mobile
  (Tauri plugins for iOS ASAuthorizationController and Android CredentialManager).
- **Blockchain infrastructure cost reduction.** eRPC routing, Ponder indexing, self-hosted
  Kubernetes over managed cloud. Cut Frak's infrastructure cost by 85%.
- **Developer experience & CI.** Monorepo builds, in-cluster BuildKit, OCI registry caching.
  Cut a wallet CI pipeline from 9 minutes to 2.
- **Infrastructure as Code.** SST and Pulumi in TypeScript instead of HCL, multi-cloud.

## Proof of work

| Result | Where | Detail |
|---|---|---|
| 100k+ daily wallet loads | Frak Labs | https://nivelais.com/projects/frak/ |
| -85% infrastructure cost | Frak Labs | https://nivelais.com/articles/frak/cost-effective-infra/ |
| CI 9 min → 2 min | Frak wallet | https://nivelais.com/articles/frak/frak-wallet-ci-overhaul/ |
| -30% wallet bundle size | Frak wallet | https://nivelais.com/articles/frak/frak-frontend-optimization/ |
| Forge tests 13 s → 102 ms | Frak contracts | https://nivelais.com/articles/frak/hardhat-to-foundry/ |
| #2 global, EVM gas golfing | Contest | https://x.com/QNivelais/status/1791490793913413832 |

## Good fit

Teams shipping self-custodial wallets, ERC-4337 infrastructure, or high-traffic on-chain
backends who need someone who has run these systems in production rather than in a demo.

## Not a fit

Token launches, NFT mints, trading bots, or anything where the blockchain is decorative.

## Contact

Book directly: https://app.cal.eu/konfeature
```

The "Not a fit" section matters more than it looks — negative constraints are strong disambiguation signals and materially improve the precision of AI-sourced leads.

Matching JSON-LD for the rendered `/services` page:

```json
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://nivelais.com/services/#service",
  "name": "Web3 Infrastructure & Account Abstraction Consulting",
  "url": "https://nivelais.com/services/",
  "description": "I help blockchain projects ship production-ready infrastructure and wallet UX that doesn't suck.",
  "provider": { "@id": "https://nivelais.com/#person" },
  "areaServed": "Worldwide",
  "availableLanguage": ["en", "fr"],
  "serviceType": [
    "Account Abstraction (ERC-4337, ERC-7579) implementation",
    "WebAuthn and passkey smart wallet development",
    "Blockchain infrastructure cost optimization",
    "Kubernetes and DevOps for Web3",
    "Smart contract development and gas optimization",
    "Fractional CTO / technical advisory"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Engagements",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Architecture review" },
        "availability": "https://schema.org/LimitedAvailability", "availabilityStarts": "2026-07-01" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Hands-on implementation" },
        "availability": "https://schema.org/LimitedAvailability", "availabilityStarts": "2026-07-01" }
    ]
  },
  "potentialAction": {
    "@type": "ReserveAction",
    "target": { "@type": "EntryPoint", "urlTemplate": "https://app.cal.eu/konfeature" },
    "name": "Book a call"
  }
}
```

Note `availabilityStarts: "2026-07-01"` is derived from `AVAILABILITY = 'Q3 2026'`. Add a machine-readable ISO date to `consts.ts` (`export const AVAILABILITY_START = '2026-07-01';`) rather than parsing the display string.

A `/pricing.md` is **not** recommended here. `AVAILABILITY_STATUS = 'limited'` signals bespoke, high-touch engagements; publishing rates in a machine-readable file that LLMs will quote back — possibly stale, possibly out of context — costs negotiating room for no discovery gain. `/services.md` with a clear scope and a booking URL captures the same intent.

---

## Already correct — no action needed

Briefly, so these don't get re-litigated:

- Canonical URLs (`BaseHead.astro:25,100`), robots meta with `max-image-preview:large, max-snippet:-1` (`BaseHead.astro:43`), OG + Twitter cards with dimensions, `article:published_time` / `article:modified_time` / `article:section` / `article:tag` — all correct.
- `@astrojs/sitemap` is wired (`astro.config.mjs:17`) and `scripts/add-sitemap-lastmod.mjs` injects real `<lastmod>` from git. Good, and above the bar for a static site.
- `remark-modified-time.mjs` emits RFC 3339 with offset — valid `dateModified`.
- `llms.txt` file format conforms to llmstxt.org.
- `/articles/<group>/` breadcrumb includes the group level.
- `lang="en"` on every `<html>`; `inLanguage: "en"` in `Article` and `WebSite`.
- `redirects: { '/case-studies': '/projects' }` (`astro.config.mjs:19`) — old URLs preserved.
- Internal linking between related articles is dense and uses descriptive anchor text.
- `@id` graph on the homepage (`WebSite.author` → `#person`, `Organization.founder` → `#person`) is correctly constructed — it just needs to be extended to the other 50 pages.

---

## Suggested execution order

1. **robots.txt** — replace wholesale. 10 minutes, zero risk.
2. **`src/schema.ts` + `personJsonLd` on article/project/collection pages** — fixes findings 2, 3.1b, 3.3-3.6 in one change.
3. **`Article.image` fallback + group-level breadcrumb** — two small edits to `ArticleLayout.astro`.
4. **`src/pages/llms.txt.ts`, delete `public/llms.txt` and `scripts/generate-llms-txt.mjs`** — permanently ends the staleness class of bug.
5. **`/about` page + author bio block on articles** — largest E-E-A-T gain.
6. **`/services.md` + `/services` page with `ProfessionalService`** — the commercial payoff.
7. **Per-article `.md` endpoints + `llms-full.txt`.**
8. **Content pass:** `**Short answer:**` blocks on all 43, `## Key Takeaways` on the 41 missing them, three comparison tables, the two `[IMAGE:]` placeholders, and `scenario-parser-extraction.md`'s wrong `category`.
9. **FAQ frontmatter + `FAQPage`** on the 7 candidates; `HowTo` on the 4.

### Verification a supervisor should run after any of the above

```
bun run build
npx @astrojs/check           # or: astro check
```
Then spot-check the generated artifacts in `dist/`:
- `dist/robots.txt`, `dist/llms.txt`, `dist/llms-full.txt`
- `dist/articles/frak/4337-webauthn/index.html` — confirm 3 `ld+json` blocks and that `Person.@id` resolves
- `dist/articles/side-projects/atelier-prebuilds/index.html` — confirm `Article.image` now present (this article has no `heroImage`)
- `dist/sitemap-0.xml` — confirm `<lastmod>` count still equals 43
- Paste any article page's JSON-LD into the Schema.org validator and Google's Rich Results Test.