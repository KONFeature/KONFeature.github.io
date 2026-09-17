# SEO Audit — nivelais.com

**Date:** 2026-09-18 · **Corpus:** 43 published articles, 62 built pages, 109,429 words
**Method:** static source audit + `dist/` build inspection + live HTTP verification against https://nivelais.com

## Reports

| File | Lane |
|---|---|
| `articles-content.md` | On-page + content SEO across all 43 articles |
| `ai-seo.md` | Answer-engine optimization, `llms.txt`, JSON-LD, E-E-A-T |
| `pages-onpage.md` | Templates, non-article pages, rendering, Core Web Vitals |

---

## Verified baseline (what's already right)

These were measured, not assumed. Don't "fix" them.

- **Meta hygiene: zero duplicate titles, zero duplicate descriptions across all 62 pages.**
- **Zero titles over 60 chars** (longest 59). Zero under 30.
- **Zero double-H1.** Every page has exactly one `<h1>`; no article body opens with a markdown `#`.
- **Zero heading-level skips** across 43 articles.
- **Zero thin content.** Median 2,532 words; shortest 1,068.
- Canonicals, OG, Twitter cards, `article:*` meta, `max-image-preview:large` all correct in `BaseHead.astro`.
- Sitemap + `lastmod` injection working; `robots.txt` references it; all 43 articles indexable and ≤2 clicks from home.
- Every article has ≥1 outbound internal link (~120 total).
- All images have `loading="lazy"`, `decoding="async"`, and explicit `width`/`height` (no CLS risk).

---

## Priority 1 — Broken things (ship first)

| # | Issue | Evidence | Fix |
|---|---|---|---|
| 1 | **8 internal links are hard 404s.** Astro doesn't rewrite relative markdown hrefs; `./slug` resolves *under* the current article dir. | `curl https://nivelais.com/articles/frak/mongodb-to-turso-rustfs/frak-infrastructure-iac` → **404** | Replace `./x` → `/articles/<folder>/x/` in `frak/mongodb-to-turso-rustfs.md` (6) + `mobile/tauri-recovery-hint-uninstall-survival.md` (2) |
| 2 | **3 URL segments 404.** `/articles/devops/`, `/articles/mobile/`, `/articles/opinion/` are live path parents of 5 articles but generate no page. | `curl …/articles/devops/` → **404**; `dist/articles/{devops,mobile,opinion}/` have no `index.html` | Add `ARTICLE_GROUPS` entries, or redirect the 3 segments to their group hub |
| 3 | **Wrong `mediumUrl`.** `cost-effective-infra.md` points at the WebAuthn article's Medium URL. | `frak/cost-effective-infra.md:12` == `frak/4337-webauthn.md:12` verbatim | Correct or delete the key |
| 4 | **14 nested `<a>` elements** on every group hub page (githubUrl link inside the card link). Invalid HTML5; browser DOM fix-up breaks the card. | 14 occurrences in `dist/articles/frak/index.html` | Move the GitHub link outside the wrapping `<a>` in `articles/[category].astro` |
| 5 | **3 broken fragment anchors** in the scenario-parser series. | `#stage-2-parsing` doesn't exist; real id is `#stage-2-parallel-parsing-4-competing-strategies` | Fix the 3 hrefs |
| 6 | **404 page is `index, follow`.** | `dist/404.html` → `<meta name="robots" content="index, follow…">` | Pass `noIndex` in `404.astro` |

## Priority 2 — Leaking equity

| # | Issue | Evidence |
|---|---|---|
| 7 | **ERC-2612 series links to Medium instead of itself** — 10 outbound medium.com links, incl. Part 1↔2↔3 cross-references. Sends readers and equity to the duplicate. | `grep -c medium.com` → 2 / 3 / 5 across parts 1–3 |
| 8 | **The whole ERC-2612 series ships Solidity as PNG screenshots.** 0 fenced code blocks, 19 code images across parts 1–3. The technical payload is invisible to search and to LLMs. | `grep -c '^```'` → 0, 0, 0 |
| 9 | **2 orphan articles, 0 inbound links** — incl. `atelier-prebuilds` (the newest post) and `bun-memory-leak-kubernetes-restart`. | link-graph scan |
| 10 | **15 internal links missing trailing slash** → needless 301 hop (canonical is trailing-slash). | listed in `articles-content.md` §5e |
| 11 | **7 articles carry Medium import cruft**: "give it a clap (up to 50x)", `@frak_defi` CTAs, 3 literal `<b>[other]…[/other]</b>` artifacts rendered as body text. | `grep -rln 'clap\|@frak_defi\|\[/other\]'` |

## Priority 3 — AI search & structured data

| # | Issue | Evidence |
|---|---|---|
| 12 | **Article author is an anonymous `Person`** — no `@id`, no `sameAs`. The rich entity with GitHub/LinkedIn/X exists **only on the homepage**, so none of the 43 articles link the author to any profile. Biggest E-E-A-T gap. | `ArticleLayout.astro:36-41` vs `index.astro:43-77` |
| 13 | **No `/about` page, no author bio on any article.** 43 deep technical posts with zero on-page credential signal. | no `about.astro` |
| 14 | **26 of 43 `Article` JSON-LD blocks have no `image`** — while OG already falls back to `/og-default.png` correctly. One-line fix. | measured: 26/43 |
| 15 | **`llms.txt` is hand-run, not built.** Already stale (42 of 43), and sorted reverse-*alphabetically* so "most recent" reads wrong to an LLM. | `generate-llms-txt.mjs` absent from `package.json:6` build chain |
| 16 | **`robots.txt` puts GPTBot/ChatGPT-User in a Crawl-delay-only group**, which removes them from the `*` group. Harmless today, a foot-gun the moment a `Disallow` is added. 10 other AI agents unhandled. | `public/robots.txt:8-13` |
| 17 | **BreadcrumbList skips the group level** (`Home > Articles > Title`) though `/articles/<group>/` hubs exist and the UI renders that crumb. | `ArticleLayout.astro:61-84` |
| 18 | JSON-LD `item`/`url` values omit the trailing slash while canonicals/sitemap include it → two URL strings per entity. | `[category].astro:58,83,88` |

## Priority 4 — Performance & polish

| # | Issue | Evidence |
|---|---|---|
| 19 | **KaTeX CSS render-blocking from jsdelivr on all 43 article pages; only 3 use math.** | `ArticleLayout.astro:257` |
| 20 | **Everything is `client:load`** — incl. `<nav>`, `<footer>` and the full 19KB LandingPage. 332KB JS total. | 11 `client:load`, 0 `client:idle`/`client:visible` |
| 21 | **26 junk alt texts**: `"captionless image"` ×15 (Medium artifact), `"hero image"` ×8, `"SCREENSHOT: …"` ×2 (shipped authoring placeholders). | `pico-python-analysis.md:28,157` |
| 22 | **RSS is unsorted** (collection order, not reverse-chron) and lacks author/category. | `dist/rss.xml` starts with cooking-bot |
| 23 | **GA script tags emitted before `<meta charset>`.** Still inside the 1024-byte window, so not breaking — but it's the first thing in `<head>`. | `BaseHead.astro:31-39` |
| 24 | **4 meta descriptions are verbatim copies of the subtitle**, 3 badly short (71/91/104 chars). | erc-2612 ×3, hardhat-to-foundry |
| 25 | **`ingestion.md` description says "7-stage"; the article says 9-stage throughout.** | `ingestion.md:10` vs `:31`, `:360` |
| 26 | `<footer>` nested inside `<main>` on 5 templates; LinkedIn URL mismatch between `sameAs` and the rendered link. | `consts.ts:9` vs `LandingPage.tsx:145` |

---

## Suggested order

1. **One commit, ~30 min:** items 1, 3, 5, 6, 10, 25 — pure find/replace, all verified broken.
2. **Second commit:** items 2, 4, 9 — routing + link graph.
3. **Third:** items 12–14, 17 — schema/E-E-A-T, highest ROI for AI citation.
4. **Then:** 7, 8, 11 — the ERC-2612 rehab (biggest content win, biggest effort).
5. **Background:** 19, 20 — perf.
