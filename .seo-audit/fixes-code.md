# Code & Template SEO Fixes — changelog

**Lane:** `src/pages/**`, `src/layouts/**`, `src/components/**`, `src/consts.ts`
**Tasks:** A–J
**Status:** all 10 implemented. No content files touched.

---

## ⚠️ ACTION REQUIRED: LinkedIn URL mismatch (task J)

The two URLs in the repo differ **in the profile slug**. I did not silently pick a winner on the
merits — I consolidated both call sites onto the existing `LINKEDIN_URL` constant (which was already
the value being published in the homepage JSON-LD `sameAs`, so it was already the de-facto public
signal). **Please confirm which is correct.**

| Where | URL, verbatim |
|---|---|
| `src/consts.ts:9` (`LINKEDIN_URL`) — **now used everywhere** | `https://www.linkedin.com/in/quentin-nivelais` |
| `src/components/LandingPage.tsx:140` (was hardcoded) — **now removed** | `https://www.linkedin.com/in/quentin-nivelais-5081a4141/` |

Live probe was inconclusive (LinkedIn blocks automated requests):
- `…/quentin-nivelais` → HTTP **999** (LinkedIn's anti-scraping code; the path was not rejected)
- `…/quentin-nivelais-5081a4141/` → HTTP **301**, with no `Location` header exposed to the client

`…-5081a4141` has the shape of LinkedIn's **auto-generated** slug (name + member hash); the bare
`quentin-nivelais` has the shape of a **claimed custom vanity URL**. Both can be valid for the same
profile, and a custom vanity normally supersedes the generated one. **If the vanity URL was never
claimed, `LINKEDIN_URL` in `src/consts.ts` is wrong and is now propagating to the Person `sameAs`
on every page** — a bad entity signal. One click in a browser settles it.

---

## New files

### `src/lib/schema.ts` (new)
Single source of truth for JSON-LD entity nodes, so the homepage, `/about` and all 43 articles can
never drift apart.

Exports: `PERSON_ID` (`https://nivelais.com/#person`), `ORGANIZATION_ID`, `X_PROFILE_URL`,
`PERSON_SAME_AS`, `PERSON_KNOWS_ABOUT`, `personJsonLd`, `personRef`, `organizationJsonLd`,
`DEFAULT_OG_IMAGE`, `canonical()`.

- `X_PROFILE_URL` is **derived** from `TWITTER_HANDLE` rather than hardcoded (the old
  `index.astro` hardcoded `https://x.com/QNivelais` while the handle also lived in `consts.ts`).
- `canonical(path)` appends the trailing slash and is idempotent — `canonical('/articles/')` and
  `canonical('articles')` both yield `https://nivelais.com/articles/`.
- Node values preserved verbatim from the previous `index.astro` definitions. Nothing invented.

### `src/pages/about.astro` (new) — task H
Structure copied from `projects.astro` (BaseHead + `Navigation client:load` + `<main>` + Footer).
`<Footer />` is rendered **outside** `<main>` and **without** `client:load` (it has no
interactivity), matching the correct pattern already used in `404.astro`.

Emits `ProfilePage` + `BreadcrumbList` JSON-LD; `mainEntity` is the shared `personJsonLd`, so the
page reuses the same `@id` as the homepage and every article.

**Every fact is repo-sourced. Nothing invented:**

| Section | Source |
|---|---|
| Role, tagline, availability, contact | `src/consts.ts` |
| Career history (5 roles) | `src/components/Timeline.tsx` |
| Open-source PR list (ZeroDev Kernel, eRPC, Permissionless.js) | `src/components/LandingPage.tsx` |
| "I don't just use the tools…" line | `src/components/LandingPage.tsx`, quoted verbatim |
| Project list + roles + taglines | `src/content/projects/*.md` (read-only) |
| Article count | computed live from the collection, not hardcoded |

> **Flag for review:** `Timeline.tsx` is **dead code** — it is not imported by any page, so that
> career history has never been rendered on the live site. The task named it as an approved source
> and I used it, but since it has never been published, please sanity-check the employers and dates
> (Sybel; Capgemini/SNCF; Coyali; BTP) before this goes out. I dropped Timeline's three
> "achievement" entries (gas-golfing rank, "Technical Thought Leader", "WebAuthn Validator Pioneer")
> — the first is already on the homepage and the other two are self-assessments that read as
> puffery on a dedicated bio page. Career facts only.

---

## Changed files

### `src/pages/404.astro` — task A
- `<BaseHead … noIndex={true} />`. `BaseHead` already supported the prop; it was simply never passed.
  Fixes `dist/404.html` emitting `index, follow`.

### `src/pages/articles/[category].astro` — tasks B, F
- **Nested `<a>` removed (task B).** The card was `<a>…<a href={githubUrl}>…</a></a>` — invalid
  HTML5 that browsers fix up by splitting into sibling anchors, breaking the card link. Rebuilt as a
  **stretched-link**: `<article class="relative">` with the title anchor carrying
  `after:absolute after:inset-0`, and the GitHub link lifted above it with `relative z-10`.
  Whole card stays clickable; visual result identical (the card's border/padding/hover classes moved
  from the inner `<div>` onto the `<article>`, preserving every utility class).
  Anchor text for the article link is now the **article title** instead of the whole card blob.
- JSON-LD `url`/`item` values now use `canonical()` (trailing slash).
- `author` → shared `personJsonLd`.
- Visible "All Articles" back-link → `/articles/`.

### `src/layouts/ArticleLayout.astro` — tasks C, D, E, I
- **Author entity (C):** `author` is now the full shared `personJsonLd` — with `@id`, `sameAs`
  (GitHub/LinkedIn/X), `jobTitle`, `worksFor`, `knowsAbout` — on all 43 articles. Was an anonymous
  `{name, url}`. I emit the **full node** rather than a bare `@id` reference so each article page is
  self-contained for crawlers that don't resolve cross-page ids.
- `publisher` → `personRef` (`{"@id": …}`), avoiding a duplicate full node in the same document while
  still resolving. `mainEntityOfPage` kept unchanged.
- **Image fallback (D):** `"image": imageUrl ?? DEFAULT_OG_IMAGE`. Was
  `...(imageUrl && {image})`, which omitted the key entirely on the **26 of 43** articles with no
  `heroImage`. Now matches the OG fallback (`/og-default.png`, 1200×630, confirmed present).
- **Breadcrumb group level (E):** now `Home > Articles > <Group> > <Title>`, using `ARTICLE_GROUPS`
  (imported, not edited). Positions are computed from array length, so an article whose group has no
  `ARTICLE_GROUPS` entry cleanly falls back to the old 3-level trail with correct numbering.
  Verified both paths by simulation.
- **Author bio block (I):** `<aside>` between the article and prev/next nav — name, `JOB_TITLE`,
  link to `/about/`, and GitHub/X/LinkedIn (`rel="me"`). Styled with the existing card idiom
  (`border-gray-200 dark:border-white/5`, `bg-gray-50 dark:bg-white/[0.02]`).
- Byline "By Quentin Nivelais" now links to `/about/` with `rel="author"` (was `/`).
- Visible group breadcrumb link → trailing slash; uses the new `groupInfo` local.

### `src/pages/index.astro` — task C
- Person/Organization nodes replaced by imports from `src/lib/schema.ts`. **Output is unchanged** —
  same `@id`, same `sameAs`, same `knowsAbout` — but there is now one definition instead of two.
- `worksFor` now carries `@id: ORGANIZATION_ID` + `url`, so it resolves to the Organization node on
  the same page instead of being a loose `{name: "Frak Labs"}`.
- `websiteJsonLd.url` → `canonical()`.

### `src/pages/articles.astro` — tasks F, G
- **Task G — resolved by listing all items, not by shrinking the count.** `numberOfItems` was `43`
  while `itemListElement` was `.slice(0, 10)`. The page server-renders all 43 links, so the
  ItemList now maps **all** of them: the declared count and the actual list agree, and Google gets
  the complete set.
- `url`/`item` values → `canonical()`.
- `author` → `personJsonLd`.

### `src/pages/projects.astro`, `src/pages/projects/[slug].astro` — task F
- All JSON-LD URLs → `canonical()` (incl. breadcrumb `Home`/`Projects`).
- `creator` → `personJsonLd`; added `author: personRef` on the `CreativeWork`.
- Card/back-link hrefs → trailing slash.

### `src/components/Navigation.tsx` — task H
- **About** link added to desktop nav and mobile menu, following the existing pattern.
- `/articles` → `/articles/`, `/projects` → `/projects/`.

### `src/components/Footer.tsx` — task H
- **About** link added ahead of the availability badge.

### `src/components/LandingPage.tsx` — tasks J, F
- LinkedIn href → `LINKEDIN_URL` constant (see warning above).
- GitHub href → derived from `GITHUB_HANDLE` (was hardcoded `https://github.com/KONFeature`).
- Internal article/project links → trailing slash (incl. the two `trackRecord` entries).

### `src/components/Icon.tsx`
- Added `message-circle` (needed by the new about page) **and `container`, `hammer`, `network`,
  `zap`** — **pre-existing bug I found while verifying:** four `icon:` values in
  `src/content/projects/*.md` were not in `IconMap` and were silently falling back to a generic
  `Box` on the live `/projects` page. Now render correctly. Follows the AGENTS.md instruction to add
  new icons to the map.

### `src/components/ArticleGroups.tsx`, `ArticlesPage.tsx`, `ArticleNavigation.tsx` — task F
- Generated article/group hrefs → trailing slash, removing a 301 hop on internal navigation.

---

## Validation

| Check | Result |
|---|---|
| `bunx tsc --noEmit -p tsconfig.json` | **No errors found**, exit 0 (tsconfig `include: **/*` covers .tsx) |
| All 9 edited/created `.astro` files parsed with `@astrojs/compiler` | parse clean, 0 error diagnostics |
| Nested-`<a>` AST walk over all templates | **0 nested anchors** (was 14 in `dist/articles/frak/index.html`) |
| `canonical()` behaviour incl. idempotency | verified: `/`, `/articles/`, `/articles/frak/4337-webauthn/` |
| Breadcrumb: group present / group missing / no group | verified by simulation, positions sequential in all 3 |
| `articleUrl` matches `<link rel=canonical>` | confirmed identical in existing `dist` output |
| `dist/` fingerprint before vs after my commands | **unchanged** |
| `git diff --cached` | empty (nothing staged) |

**Did not run** `bun run build` / `astro build` as instructed. **Did not run** `astro check`: it
requires installing `@astrojs/check` + `typescript`, which would modify `package.json`/`bun.lock`
(outside my allowlist, and a conflict risk with concurrent agents). I substituted direct
`@astrojs/compiler` parsing, which covers template syntax errors, plus `tsc` for types.

---

## Skipped deliberately

| Item | Why |
|---|---|
| `/articles/devops/`, `/articles/mobile/`, `/articles/opinion/` 404s | Requires `src/articleGroups.ts` + `astro.config.mjs` — **parent owns routing**, explicitly excluded. |
| KaTeX render-blocking on 40 of 43 articles | Needs `hasMath` plumbed through `src/pages/articles/[...slug].astro` and a `public/` asset. Out of scope for A–J; still open from `pages-onpage.md` finding #1. |
| Over-hydration (`client:load` on Footer, ArticleNavigation, LandingPage) | Not in A–J and touches `index.astro` render structure; deferred to avoid conflicting with the parent's routing work. I did apply the correct pattern on the **new** about page only. |
| `<meta charset>` after GA scripts | Not in A–J. Benign — it lands at ~byte 340, inside the 1024-byte spec window. |
| `<footer>` inside `<main>` on 4 existing templates | Not in A–J; would touch the same JSX blocks the parent may restructure. New `/about` does it correctly. |
| RSS sorting/metadata | `src/pages/rss.xml.js` not in A–J. |
| Rewriting `/articles` + `/projects` title/description copy | Not in A–J; these are editorial strings and `pages-onpage.md`'s suggested copy contains a "43" count I'd rather see the author own. |

## Residual risks

1. **LinkedIn slug** — see the warning at the top. One-line fix in `src/consts.ts` if the vanity URL is wrong.
2. **Timeline.tsx career facts** were never live; please verify before publishing `/about`.
3. `/about` is new and **not yet linked from `llms.txt` or the sitemap config** — the sitemap is
   generated from routes so it will be picked up automatically on the next build, but `llms.txt`
   is generated by a script outside my allowlist.
4. The stretched-link card makes the **whole card** the article link. Text selection inside the card
   still works (the overlay is a pseudo-element), but it is a behaviour change worth an eyeball in
   the browser on `/articles/frak/`.
