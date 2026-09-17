I have everything I need. Here is the complete audit artifact.

```markdown
# On-Page & Content SEO Audit — `src/content/articles/`

**Scope:** all article markdown under `src/content/articles/`
**Audited:** 2026-09-18
**Corpus size:** **43 published articles** (not 44 — `glob('**/*.{md,mdx}')` in `src/content.config.ts` matches exactly 43 `.md` files; zero `.mdx`, zero `draft: true`). If the site claims 44 somewhere, that count is stale.
**Lane:** on-page + content SEO only. Rendering/head/schema issues are noted only where the *content* is the cause.

---

## Correction to the brief (read this first)

The brief states: *"the 'category' frontmatter field is a SEPARATE taxonomy used by /articles/[category] pages."*

**That is not true in this codebase.** `src/pages/articles/[category].astro:14-22`:

```ts
const categories = Object.keys(ARTICLE_GROUPS);
return categories.map((category) => ({
    params: { category },
    props: {
        articles: articles.filter((article) => article.data.group === category),
```

`/articles/[category]` is generated from **`ARTICLE_GROUPS` keys** and filters on **`article.data.group`**. The `category` frontmatter field generates **no page at all**. Its only consumers are:
- a client-side filter chip in `src/components/ArticlesPage.tsx:30,42,145` (JS-driven, not a crawlable URL)
- `"articleSection": category` in the Article JSON-LD (`src/layouts/ArticleLayout.astro:55`)
- `og:section` via `BaseHead`

Consequence: there are **no thin category taxonomy pages to flag**, because there are no category pages. `category` is a near-dead field whose only real SEO surface is one JSON-LD string. Findings in §7 are re-scoped accordingly — and the real taxonomy bug turns out to be worse (three divergent taxonomies + three 404ing URL segments). See **T3**.

---

## Top findings

| # | Severity | Finding | Where |
|---|---|---|---|
| **T1** | **High** | **8 internal links are hard 404s in the built site.** Relative `./slug` hrefs are not rewritten by Astro and resolve *under* the current article's directory. Verified in `dist/`. | `frak/mongodb-to-turso-rustfs.md` (6), `mobile/tauri-recovery-hint-uninstall-survival.md` (2) |
| **T2** | **High** | **`cost-effective-infra.md` has a `mediumUrl` pointing at a completely different article** (the WebAuthn/ERC-4337 post). It duplicates `4337-webauthn.md`'s URL verbatim. | `frak/cost-effective-infra.md:12` |
| **T3** | **High** | **Three divergent taxonomies** (folder ≠ `group` ≠ `category`). `/articles/devops/`, `/articles/mobile/`, `/articles/opinion/` are live URL segments that **404**, while `/articles/atelier/` is a hub page with **zero** children at that path. | site-wide |
| **T4** | **High** | **The entire ERC-2612 series ships its Solidity code as PNG screenshots.** Zero fenced code blocks across Parts 1–3 (18 code images total). The technical payload is invisible to search. | `web3/erc-2612-part-{1,2,3}.md` |
| **T5** | **High** | **The ERC-2612 series cross-links itself to Medium instead of to itself** — 8 outbound links to the duplicate Medium versions of articles that exist on-site. Actively bleeds equity to the canonical competitor. | `web3/erc-2612-part-{1,2,3}.md` |
| **T6** | **Medium** | **2 orphan articles with zero inbound internal links**, including the newest post on the site. | `side-projects/atelier-prebuilds.md`, `devops/bun-memory-leak-kubernetes-restart.md` |
| **T7** | **Medium** | **26 images with junk alt text**: `"hero image"` ×8, `"captionless image"` ×15, `"SCREENSHOT: …"` ×2, `"Generated via DALL-E"` ×1. | 12 files |
| **T8** | **Medium** | **4 meta descriptions are byte-identical copies of the subtitle**, 3 of them far under length (71 / 91 / 104 chars). | `erc-2612-part-{1,2,3}`, `hardhat-to-foundry` |
| **T9** | **Medium** | **7 articles still carry Medium import cruft** — "give it a clap (up to 50x)", `@frak_defi` Twitter CTAs, and 3 literal `<b>[other]…[/other]</b>` artifacts rendered as body text. | see §9 |
| **T10** | **Medium** | **3 broken fragment anchors** in the scenario-parser series (`#stage-2-parsing`, `#quality-selection-algorithm` — neither ID exists). | `scenario-parser/*` |
| **T11** | **Low** | **Factual contradiction in a meta description**: `ingestion.md` says "7-stage pipeline"; the article itself is titled "The 9-Stage Intelligent Pipeline" and runs to "Stage 9". | `cooking-bot/ingestion.md:10` |
| **T12** | **Low** | **Duplicate tag inside one article** (`"IoT"` twice) + a fully-lowercased tag set in 2 articles breaking corpus casing (`bun`/`Bun`, `tauri`/`Tauri`, `webauthn`/`WebAuthn`/`WebAuthN`). | `kiln/pico-kiln-app.md:7` + §8 |

---

## 1. Title tags

**Rendered title = raw frontmatter title.** `src/components/BaseHead.astro:100` is `<title>{title}</title>` — no site suffix, no template. So frontmatter length *is* SERP length.

### Verdict: this is the healthiest area of the audit.

- **Zero titles over 60 chars.** Longest is 59 (`L'Atelier: Dispatch AI Agents from Slack with an MCP Server`).
- **Zero titles under 30 chars.** Shortest is 32.
- **Zero exact duplicates.**

Full length table:

| Chars | File | Title |
|---|---|---|
| 59 | `side-projects/atelier-slack-mcp.md` | L'Atelier: Dispatch AI Agents from Slack with an MCP Server |
| 58 | `side-projects/atelier-supporting-infrastructure.md` | L'Atelier Infrastructure: CLIProxy, Verdaccio, Zot and Helm |
| 57 | `frak/cost-effective-infra.md` | Cost-Effective Blockchain Infrastructure: eRPC and Ponder |
| 56 | `frak/frak-frontend-optimization.md` | How We Cut Our Wallet Size by 30%: Frontend Optimization |
| 56 | `side-projects/atelier-kubernetes-migration.md` | L'Atelier: Migrating Firecracker Sandboxes to Kubernetes |
| 55 | `opinion/erc7579-uncomfortable-truth.md` | ERC-7579 Modular Smart Wallets: The Uncomfortable Truth |
| 55 | `frak/frak-listener-ring-architecture.md` | Ring Architecture: A Wallet That Costs Nothing to Embed |
| 54 | `devops/bun-memory-leak-kubernetes-restart.md` | Bun Memory Leak on Kubernetes: 3 Days to a Pod Restart |
| 54 | `frak/mongodb-to-turso-rustfs.md` | Replacing MongoDB With libSQL and RustFS on Kubernetes |
| 54 | `mobile/tauri-recovery-hint-uninstall-survival.md` | Passkey Recovery That Survives App Uninstalls in Tauri |
| 53 | `mobile/tauri-native-sharing-rich-previews.md` | Rich Native Share Sheets for Tauri on iOS and Android |
| 53 | `mobile/native-webauthn-tauri-plugin-ios-android.md` | Native WebAuthn Passkeys for Tauri on iOS and Android |
| 53 | `frak/webauthn-release.md` | Our WebAuthN Smart Wallet Demo: What We Built and Why |
| 53 | `web3/erc-2612-part-2.md` | ERC-2612 Part 2: Solidity Implementation with EIP-712 |
| 53 | `frak/shopify-i18n-metaobjects.md` | Shopify i18n: One Metaobject Source for Four Runtimes |
| 52 | `web3/erc-2612-part-3.md` | ERC-2612 Part 3: Unit Testing with Hardhat and Forge |
| 52 | `side-projects/tableau-elec-3-phase-optimizer.md` | A 3-Phase Electrical Panel Optimizer for NF C 15-100 |
| 52 | `frak/frak-hetzner-platform.md` | A Self-Hosted Hetzner CI Platform for the Frak Stack |
| 52 | `kiln/pico-python-analysis.md` | Pico Kiln Part 4: Physics-Based PID Tuning in Python |
| 51 | `frak/wordpress-plugin-performance-native-webhooks.md` | A Fast WordPress + WooCommerce Plugin in Production |
| 51 | `kiln/pico-kiln-rust.md` | Pico Kiln - Part 5: Dropping to the Metal with Rust |
| 50 | `scenario-parser/scenario-parser-pipeline.md` | The Orchestration Engine: A Resilient LLM Pipeline |
| 50 | `frak/hardhat-to-foundry.md` | Migrating Solidity Testing from Hardhat to Foundry |
| 50 | `frak/frak-infrastructure-iac.md` | Why We Chose SST and Pulumi over Terraform for IaC |
| 50 | `side-projects/wordforge.md` | WordForge: AI-Powered WordPress Management via MCP |
| 50 | `web3/erc-2612-part-1.md` | ERC-2612 Part 1: How Gasless ERC-20 Approvals Work |
| 50 | `frak/monerium-onchain-iban.md` | Giving a Smart Wallet a Bank Account With Monerium |
| 49 | `scenario-parser/scenario-parser-extraction.md` | From PDF to Structured Data: The Extraction Layer |
| 49 | `frak/wallet-devx-revolution.md` | DevX Overhaul: Cutting Build Times by 10x at Frak |
| 49 | `kiln/pico-kiln-app.md` | Pico Kiln - Part 3: From Web to Native with Tauri |
| 48 | `kiln/kiln-hardware.md` | Pico Kiln Part 1: Converting a 380V Kiln to 220V |
| 47 | `cooking-bot/runtime.md` | Real-Time AI Conversations and Audio Processing |
| 47 | `frak/frak-wallet-ci-overhaul.md` | Rebuilding the Wallet's CI: From 9 Minutes to 2 |
| 46 | `frak/4337-webauthn.md` | WebAuthn Signatures for ERC-4337 Smart Wallets |
| 44 | `cooking-bot/ingestion.md` | The Sophisticated Recipe Processing Pipeline |
| 44 | `frak/polygon-account-abstraction.md` | Account Abstraction on Polygon With ERC-4337 |
| 42 | `scenario-parser/architecture.md` | Scenario Parser: The Complete Architecture |
| 42 | `side-projects/atelier-stop-babysitting.md` | L'Atelier: Stop Babysitting Your AI Agents |
| 41 | `kiln/pico-kiln-firmware.md` | Pico Kiln - Part 2: Firmware Architecture |
| 38 | `side-projects/atelier-prebuilds.md` | L'Atelier: Content-Addressed Prebuilds |
| 33 | `web3/securing-solidity-smart-contracts.md` | Securing Solidity Smart Contracts |
| 32 | `cooking-bot/introduction.md` | Safety-First AI for Food Systems |
| 52 | `web3/erc-2612-part-3.md` | *(listed above)* |

### 1a. Title findings

**F1.1 — Series-prefix inconsistency in the Pico Kiln series. Impact: Low.**
Two different separators are in use for the same 5-part series:

```
kiln/kiln-hardware.md:2          title: "Pico Kiln Part 1: Converting a 380V Kiln to 220V"
kiln/pico-kiln-firmware.md:2     title: "Pico Kiln - Part 2: Firmware Architecture"
kiln/pico-kiln-app.md:2          title: "Pico Kiln - Part 3: From Web to Native with Tauri"
kiln/pico-python-analysis.md:2   title: "Pico Kiln Part 4: Physics-Based PID Tuning in Python"
kiln/pico-kiln-rust.md:2         title: "Pico Kiln - Part 5: Dropping to the Metal with Rust"
```

Fix — normalise on the no-dash form (it's shorter, and Google already treats `-` as a title separator it may truncate at):
```yaml
kiln/pico-kiln-firmware.md:  title: "Pico Kiln Part 2: Firmware Architecture on the RP2040"
kiln/pico-kiln-app.md:       title: "Pico Kiln Part 3: From Web to Native with Tauri"
kiln/pico-kiln-rust.md:      title: "Pico Kiln Part 5: Dropping to the Metal with Rust"
```
(Part 2 gains the chip name because at 41 chars it has 19 chars of free SERP width and currently carries no entity.)

**F1.2 — Four titles carry no searchable entity. Impact: Medium.**
These read like internal doc headings. Nobody queries them.

| File | Current (chars) | Problem | Replacement |
|---|---|---|---|
| `cooking-bot/ingestion.md:2` | `The Sophisticated Recipe Processing Pipeline` (44) | "Sophisticated" is a self-compliment with zero query volume; no tech entity | `A 9-Stage Recipe Ingestion Pipeline with spaCy and LLMs` (54) |
| `cooking-bot/runtime.md:2` | `Real-Time AI Conversations and Audio Processing` (47) | no product, no stack, no differentiator | `Real-Time LLM Voice Guidance with Gemini TTS and Langfuse` (56) |
| `cooking-bot/introduction.md:2` | `Safety-First AI for Food Systems` (32) | 28 chars wasted; "Food Systems" is agritech jargon, the article is about allergen detection | `Safety-First AI: Rule-Based Allergen Detection over LLMs` (55) |
| `scenario-parser/architecture.md:2` | `Scenario Parser: The Complete Architecture` (42) | "Scenario Parser" is an unbranded internal name; the actual topic is screenplay PDF parsing | `Screenplay PDF Parsing: A 3-Stage Competitive Architecture` (57) |

**F1.3 — `webauthn-release.md` mis-cases the primary keyword in the title. Impact: Low.**
```
frak/webauthn-release.md:2   title: "Our WebAuthN Smart Wallet Demo: What We Built and Why"
```
`WebAuthN` is not the spec's casing (it is **WebAuthn**). Same title also front-loads "Our", a wasted first token. Fix:
```yaml
title: "WebAuthn Smart Wallet Demo: What We Built and Why"
```
(49 chars, keyword at position 1.)

**F1.4 — Front-loading is generally good.** 34 of 43 titles lead with the primary entity or an intent verb (`Replacing MongoDB…`, `Native WebAuthn Passkeys…`, `Bun Memory Leak on Kubernetes…`, `Migrating Solidity Testing…`). No action.

**F1.5 — Near-duplicate title pairs.** Two pairs are close enough to confuse Google's title selection, but both are legitimately distinct articles and the titles do disambiguate:
- `WebAuthn Signatures for ERC-4337 Smart Wallets` vs `Our WebAuthN Smart Wallet Demo: What We Built and Why` — technical vs. announcement. Acceptable once F1.3 lands.
- `A Self-Hosted Hetzner CI Platform for the Frak Stack` vs `Rebuilding the Wallet's CI: From 9 Minutes to 2` — platform vs. application layer, and both articles explicitly say so in body copy. Correct as-is.

---

## 2. Meta descriptions

`ArticleLayout.astro:91` passes `description={description || subtitle || title}` — so `description` is always present for all 43 (no empty-string descriptions exist). Baseline is fine.

### 2a. Out-of-range lengths

| File | Chars | Flag | Note |
|---|---|---|---|
| `web3/erc-2612-part-2.md:10` | **71** | ⛔ far too short | also = subtitle |
| `web3/erc-2612-part-3.md:10` | **91** | ⛔ too short | also = subtitle |
| `web3/erc-2612-part-1.md:10` | **104** | ⛔ too short | also = subtitle |
| `frak/frak-infrastructure-iac.md:10` | 121 | ⚠ low | 40 chars unused |
| `frak/hardhat-to-foundry.md:10` | 122 | ⚠ low | also = subtitle |
| `web3/securing-solidity-smart-contracts.md:10` | 126 | ⚠ low | — |
| `scenario-parser/scenario-parser-psychology.md:10` | 132 | ⚠ low | — |
| `cooking-bot/ingestion.md:10` | 135 | ⚠ low | + factually wrong, see T11 |
| `frak/polygon-account-abstraction.md:10` | 135 | ⚠ low | — |
| `frak/frak-hetzner-platform.md:10` | 135 | ⚠ low | — |
| `side-projects/atelier-prebuilds.md:10` | **168** | ⛔ over 165 | will truncate |

Everything else lands 138–160. That's a good corpus.

### 2b. Descriptions that are a verbatim copy of the subtitle — 4 offenders

**F2.1 — `web3/erc-2612-part-2.md`. Impact: High.**
```yaml
subtitle: "A deep dive into the Solidity code of gasless ERC-20 approvals ERC-2612"
description: "A deep dive into the Solidity code of gasless ERC-20 approvals ERC-2612"
```
71 chars, no hook, no numbers, duplicated phrase "ERC-20 approvals ERC-2612" reads as broken English. Replace:
```yaml
description: "Implement ERC-2612 permit in Solidity: the EIP-712 domain separator, the Permit typehash, nonce management, and the five pitfalls that cost us two days."
```
(156 chars)

**F2.2 — `web3/erc-2612-part-3.md`. Impact: High.**
```yaml
subtitle: "Perfecting ERC-2612: Boost Your DeFi Skills with Solidity Unit Testing in Hardhat and Forge"
description: "Perfecting ERC-2612: Boost Your DeFi Skills with Solidity Unit Testing in Hardhat and Forge"
```
91 chars of 2023-era clickbait ("Boost Your DeFi Skills"). Replace:
```yaml
description: "Unit-test an ERC-2612 permit in both Hardhat and Forge: building EIP-712 typed data, signing, extracting r/s/v, and why Forge ran 40ms vs 9.03ms."
```
(147 chars, carries the benchmark the article actually contains)

**F2.3 — `web3/erc-2612-part-1.md`. Impact: Medium.**
```yaml
subtitle: "How to use EIP-712 signatures to save gas, batch approvals and increase security for your ERC-20 tokens."
description: "How to use EIP-712 signatures to save gas, batch approvals and increase security for your ERC-20 tokens."
```
104 chars. Replace:
```yaml
description: "How ERC-2612 permit works: the EIP-712 signature fields, the two on-chain checks, and the wallet-compatibility traps that break gasless approvals."
```
(148 chars)

**F2.4 — `frak/hardhat-to-foundry.md`. Impact: Medium.**
```yaml
subtitle: "Evaluating the performance difference of Hardhat and Foundry for Solidity contract unit testing & reason behind the switch"
description: "Evaluating the performance difference of Hardhat and Foundry for Solidity contract unit testing & reason behind the switch"
```
122 chars and it buries the article's single best asset — the **13 seconds → 102 milliseconds** benchmark, which is the only thing in this post anyone will click for. Replace:
```yaml
description: "We migrated our Solidity test suite from Hardhat to Foundry in a week: 13 seconds down to 102 milliseconds, plus free fuzzing over 256 runs."
```
(140 chars)

### 2c. Other description defects

**F2.5 — `cooking-bot/ingestion.md:10` is factually contradicted by its own body. Impact: Medium (trust + SERP mismatch).**
```yaml
description: "Deep dive into our 7-stage recipe processing pipeline with intelligent routing, cost optimization, and comprehensive safety mechanisms."
```
Body says otherwise, repeatedly:
- `ingestion.md:31` → `## Our Solution: The 9-Stage Intelligent Pipeline`
- `ingestion.md:360` → `## Stage 9: Lightweight Qdrant + Full PostgreSQL Storage`
- and `cooking-bot/runtime.md:196` links to it as *"our 9-stage recipe ingestion pipeline"*

Fix:
```yaml
description: "Inside a 9-stage pipeline that processes 35,000+ recipes: quality-based routing, a spaCy IPC path, multi-layer allergen detection, and dual-vector embeddings."
```
(158 chars)

**F2.6 — `devops/bun-memory-leak-kubernetes-restart.md:4` has a visible grammar error. Impact: Low, but it's in the SERP snippet.**
```yaml
description: "Debug a Bun RSS memory leak on a Elysia.js backend in Kubernetes: forced GC, heap snapshots, and why a lying health endpoint and pod restart won."
```
`a Elysia.js` → `an Elysia.js`. Fix:
```yaml
description: "Debugging a Bun RSS memory leak on an Elysia.js backend in Kubernetes: forced GC, heap snapshots, --smol, and why a lying health endpoint won."
```
(143 chars)

**F2.7 — `side-projects/atelier-prebuilds.md:10` is 168 chars and will truncate mid-clause. Impact: Low.**
```yaml
description: "How L'Atelier v3 bakes any git repo into a content-addressed VolumeSnapshot: content-key caching, torn-snapshot fixes, git credential hygiene, and CoW-clone fast boots."
```
The tail (`and CoW-clone fast boots`) is the payoff and it's the part that gets cut. Fix:
```yaml
description: "How L'Atelier v3 bakes any git repo into a content-addressed VolumeSnapshot: content-key caching, CoW-clone fast boots, and three filesystem bugs."
```
(150 chars)

**F2.8 — `frak/frak-infrastructure-iac.md:10` wastes 40 chars. Impact: Low.**
```yaml
description: "Why Frak abandoned HCL for TypeScript: multi-cloud infrastructure with SST and Kubernetes cluster management with Pulumi."
```
Repeats "with … with", no outcome. Fix:
```yaml
description: "Why Frak abandoned HCL for TypeScript: SST for multi-cloud, Pulumi for GKE, zero cloud lock-in, and a 4-minute path from commit to production."
```
(144 chars)

**F2.9 — Subtitle is an empty string in 3 files. Impact: Low.**
`frak/webauthn-release.md:5`, `frak/cost-effective-infra.md:5`, `frak/4337-webauthn.md:5` all have `subtitle: ""`. `ArticleLayout.astro:314` guards with `{subtitle && …}` so nothing renders — no visual bug. But an empty string is meaningless data; delete the key entirely or write a real subtitle (the `<p>` under the H1 is prime keyword real estate that 3 articles are leaving blank).

---

## 3. H1 / heading hierarchy

### 3a. Double-H1: **clean. No action.**

`ArticleLayout.astro:313` emits the only H1:
```astro
<h1 class="text-4xl md:text-5xl font-bold …">{title}</h1>
```
I grepped `^#{1,6} ` across all 43 files. **Not one article body opens with a markdown `#` H1.** The only `^# ` matches are (a) commented-out frontmatter lines and (b) shell/YAML comments inside fenced code blocks — neither becomes a heading. This is correct and worth keeping correct.

### 3b. Heading level skips / inversions — 2 real offenders

**F3.1 — `web3/erc-2612-part-1.md`: document opens at H3, then jumps *up* to H2. Impact: Medium.**
```
erc-2612-part-1.md:42:  ### How does ERC-2612 work?      ← first heading in the body, an H3
erc-2612-part-1.md:74:  ## What are the benefits of ERC-2612?
erc-2612-part-1.md:82:  ## Pain points of implementing ERC-2612
```
The article's *most important* section ("How does ERC-2612 work?" — the head-term section) is demoted below two lesser ones. Fix: change line 42 to `## How does ERC-2612 work?`.

**F3.2 — `frak/cost-effective-infra.md`: opens at H3 before any H2 exists. Impact: Low.**
```
cost-effective-infra.md:26:  ### The Challenge
cost-effective-infra.md:36:  ## eRPC: Your Chain's Traffic Controller
```
Fix: change line 26 to `## The Challenge`.

I checked every `####` in the corpus for a `##→####` skip. There are none — every H4 in `cooking-bot/runtime.md`, `cooking-bot/ingestion.md`, `scenario-parser/scenario-parser-pipeline.md`, `scenario-parser/architecture.md` and `frak/frak-frontend-optimization.md` is correctly parented by an H3. Good.

### 3c. H2 that duplicates the frontmatter title — 3 offenders

Because the layout already renders the title as H1, an H2 repeating it produces `H1: X` immediately followed by `H2: X`.

| File | Line | Duplicated heading | Frontmatter title |
|---|---|---|---|
| `cooking-bot/runtime.md` | 15 | `## Real-Time AI Conversations and Audio Processing` | *identical* |
| `cooking-bot/ingestion.md` | 15 | `## The Sophisticated Recipe Processing Pipeline` | *identical* |
| `cooking-bot/introduction.md` | 15 | `## Building a Safety-First AI Cooking Assistant` | near-identical to `Safety-First AI for Food Systems` |

**Impact: Medium** — wastes the highest-weight in-body heading slot and pollutes the auto-generated TOC (`TableOfContents` is fed `headings` from `[...slug].astro:15`), where the first entry is a copy of the page title.

Fix — delete the line in `runtime.md:15` and `ingestion.md:15` outright (the paragraph below each already serves as the lede). For `introduction.md:15`, replace with a real section heading:
```markdown
## Why Allergen Detection Can't Be an LLM's Job
```

### 3d. Heading quality note (no fix required, but worth knowing)

`cooking-bot/runtime.md` and `cooking-bot/ingestion.md` wrap **every** H3/H4 in bold markers:
```
runtime.md:58:   ### **Langfuse: Prompt Management & Observability**
ingestion.md:70: ### **Quality Scoring Algorithm**
```
This renders `<h3><strong>…</strong></h3>`. Harmless for ranking, but it means the heading text in the TOC carries stray emphasis markup. Low priority; strip the `**` if you're touching these files anyway.

---

## 4. Image alt text

I grepped `!\[…\]\(`, `<img`, `<Image`, `<figure` across all 43 files. **Result: 49 markdown images, zero `<img>`/`<Image>`/`<figure>` usage in article bodies, zero images with a literally empty alt `![]()`.** So nothing is *missing* alt — but 26 of 49 have alt text that carries no information.

### 4a. Useless alt text — full list

**`"hero image"` — 8 occurrences. Impact: Medium** (these are the largest, most prominent images on the page, and they're the LCP element).

| File:line |
|---|
| `scenario-parser/architecture.md:16` |
| `scenario-parser/scenario-parser-extraction.md:16` |
| `scenario-parser/scenario-parser-pipeline.md:16` |
| `scenario-parser/scenario-parser-psychology.md:16` |
| `frak/frak-frontend-optimization.md:16` |
| `frak/frak-infrastructure-iac.md:16` |
| `frak/mongodb-to-turso-rustfs.md:16` |
| `frak/wallet-devx-revolution.md:16` |

Concrete replacements:
```markdown
scenario-parser/architecture.md:16
![Three-stage screenplay parsing architecture: PDF extraction, four competing parsers, quality selection](./assets/scenario-parser/hero-architecture.png)

scenario-parser/scenario-parser-extraction.md:16
![Screenplay PDF being decomposed into JSON, Markdown and plain-text extraction layers](./assets/scenario-parser/hero-extraction.png)

scenario-parser/scenario-parser-pipeline.md:16
![Event-driven LLM orchestration pipeline with concurrency-limited analysis stages](./assets/scenario-parser/hero-pipeline.png)

scenario-parser/scenario-parser-psychology.md:16
![Social network analysis graph of screenplay characters weighted by shared dialogue](./assets/scenario-parser/hero-sna.png)

frak/frak-frontend-optimization.md:16
![Frak embedded wallet bundle size cut by 30% after the Jotai to Zustand migration](./assets/frak-frontend-optimization/hero.jpg)

frak/frak-infrastructure-iac.md:16
![Frak's multi-cloud infrastructure managed with SST and Pulumi in TypeScript](./assets/frak-infrastructure-iac/hero.png)

frak/mongodb-to-turso-rustfs.md:16
![sqld and RustFS replacing MongoDB on a Kubernetes cluster with bottomless replication](./assets/mongodb-to-turso-rustfs/hero.png)

frak/wallet-devx-revolution.md:16
![Frak monorepo build pipeline after the Next.js to TanStack Start and Rolldown migration](./assets/wallet-devx-revolution/hero.jpg)
```

**`"captionless image"` — 15 occurrences. Impact: Medium.** This is a literal Medium-export placeholder that was never cleaned up.

| File | Lines | What the image actually is |
|---|---|---|
| `frak/4337-webauthn.md` | 40, 54, 79, 83, 105 | WebAuthn↔AA integration diagram; P256 verifier integration; sponsored UserOp flow; paymaster data computation; RIP-7212 precompile comparison |
| `frak/webauthn-release.md` | 19, 43, 84, 121 | wallet demo hero; biometric paywall replacement; wallet setup flow GIF; wallet technical architecture |
| `web3/erc-2612-part-3.md` | 76, 94, 100, 106 | Hardhat permit+transfer test; Forge typed-data build; Forge sign/extract; Forge permit+transfer test |
| `frak/cost-effective-infra.md` | 16, 221 | cost-effective infra hero; SST deploy output |

The filenames already describe the content — the fix is mechanical. Examples:
```markdown
frak/4337-webauthn.md:40
![Architecture diagram of WebAuthn signature validation inside an ERC-4337 smart account](./assets/4337-webauthn/webauthn-account-abstraction-integration.png)

frak/4337-webauthn.md:105
![Gas cost comparison: FCL Solidity P256 verifier versus the RIP-7212 precompile](./assets/4337-webauthn/rip-7212-precompile-comparison.png)

frak/webauthn-release.md:84
![Animated demo of the WebAuthn wallet setup flow, from biometric prompt to funded account](./assets/webauthn-release/wallet-setup-flow-demo.gif)

web3/erc-2612-part-3.md:106
![Forge test calling permit, asserting the allowance, then executing transferFrom](./assets/erc-2612-part-3/forge-permit-transfer-test.png)
```

**`"SCREENSHOT: …"` — 2 occurrences. Impact: Low.** A drafting placeholder prefix leaked into production alt text.
```
kiln/pico-python-analysis.md:28
![SCREENSHOT: 4-panel plot showing temperature curve, SSR output, step boundaries, and rate](./assets/pico-python-analysis/plot-run.png)

kiln/pico-python-analysis.md:157
![SCREENSHOT: Phase detection visualization showing SSR changes and detected boundaries](./assets/pico-python-analysis/plot-tuning.png)
```
Fix: delete the literal string `SCREENSHOT: ` from both. The rest of the alt is genuinely good.

**Generation-method alt — 4 occurrences. Impact: Low.** These describe *how the image was made*, not what it shows.
```
frak/polygon-account-abstraction.md:18
![Generated via DALL-E](./assets/polygon-account-abstraction/polygon-account-abstraction-hero.png)
    → ![Frak's ERC-4337 account abstraction stack on the Polygon network](…)

web3/erc-2612-part-1.md:19
![Generated via mid journey, prompt : A futuristic cityscape with Ethereum logo](…)
    → ![Ethereum-themed illustration for a guide to gasless ERC-20 approvals with ERC-2612](…)

web3/erc-2612-part-2.md:17
![Generated via mid journey, prompt : A person who handles a contract to a machine ethereum](…)
    → ![Illustration of handing a signed permit to a smart contract, ERC-2612 in Solidity](…)

web3/erc-2612-part-3.md:17
![Generated via mid journey, prompt : A small robot spending coins on a machine](…)
    → ![Illustration for unit-testing ERC-2612 permit signatures with Hardhat and Forge](…)
```
`"Generated via DALL-E"` is the worst of the four — 20 chars of pure metadata.

### 4b. Non-alt image findings

**F4.1 — Two images are jammed into one line with no separator. Impact: Low (rendering + alt readability).**
```
frak/hardhat-to-foundry.md:42
![Hardhat test run (13sec)](./assets/hardhat-to-foundry/hardhat-test-benchmark-13sec.png)![Forge test run (102ms)](./assets/hardhat-to-foundry/forge-test-benchmark-102ms.png)

web3/erc-2612-part-2.md:62
![Permit typehash](./assets/erc-2612-part-2/permit-typehash.png)![Contract variable that hold user nonces](./assets/erc-2612-part-2/user-nonces-variable.png)
```
Split onto separate lines with a blank line between. (The *alt text itself* on both of these is good — `"Hardhat test run (13sec)"` / `"Forge test run (102ms)"` is exactly right.)

**F4.2 — An extensionless Medium CDN artifact is being used as an image source. Impact: Medium.**
```
frak/cost-effective-infra.md:221
![captionless image](./assets/cost-effective-infra/0*MsLG-cXUT1he-wl7)
```
The asset `src/content/articles/frak/assets/cost-effective-infra/0*MsLG-cXUT1he-wl7` has **no file extension and a `*` in the filename**. Astro's image pipeline cannot infer a format for this, so it will not be optimised, will not get width/height, and the `*` is a shell-glob/URL-encoding hazard. Fix: rename the asset to `sst-deploy-output.png` and update the reference:
```markdown
![SST v3 deploying the Frak indexer stack, full output](./assets/cost-effective-infra/sst-deploy-output.png)
```

**F4.3 — Alt text that is already good (no action).** `side-projects/atelier-stop-babysitting.md` lines 21/109/118/129 are exemplary — `"An agent question on mobile: answerable from a ski lift"`, `"Task kanban: two workspaces, one active migration task, one completed"`. Same for `web3/securing-solidity-smart-contracts.md:45,96` and most of `erc-2612-part-2.md`. Use these as the house style.

### 4c. `heroImage` coverage note

`heroImage` is consumed **only** for `og:image` (`ArticleLayout.astro:17`, `:88`) — it is never rendered in the body. **25 of 43 articles have no `heroImage`** and therefore fall back to `/og-default.png`. Two of those 25 (`erc-2612-part-2.md`, `erc-2612-part-3.md`) *do* have a perfectly good hero image in the body at line 17 that simply isn't declared in frontmatter. Cheap fix:
```yaml
# web3/erc-2612-part-2.md
heroImage: "./assets/erc-2612-part-2/erc-2612-contract-machine-hero.png"
# web3/erc-2612-part-3.md
heroImage: "./assets/erc-2612-part-3/erc-2612-robot-coins-hero.png"
```
Also flag: `frak/hardhat-to-foundry.md:11` uses `heroImage: "./assets/hardhat-to-foundry/forge-test-benchmark-102ms.png"` — a terminal screenshot as the social card. It's legible at 1200×630 only if the screenshot is wide; worth a purpose-built card.

---

## 5. Internal linking

### 5a. Outbound: **excellent. Zero articles with zero outbound internal links.**

All 43 articles link to at least one other article. Distribution is healthy (1–6 outbound each, ~120 internal links total). This is genuinely well done and I'm not going to pad the report with advice about it.

### 5b. **Inbound orphans — 2 articles with ZERO inbound internal links. Impact: Medium.**

| File | Published | Inbound links |
|---|---|---|
| `side-projects/atelier-prebuilds.md` | 2026-09-17 | **0** |
| `devops/bun-memory-leak-kubernetes-restart.md` | 2026-03-30 | **0** |

`atelier-prebuilds` is the **newest article on the site** and the 5th part of the L'Atelier series. Every other L'Atelier part links forward to its successor except this one, which nothing links to. Evidence — `atelier-prebuilds.md:15` links *out* to two siblings:
> `The [Kubernetes migration](/articles/side-projects/atelier-kubernetes-migration/) moved prebuilds onto the standard CSI VolumeSnapshot API, and the [supporting infrastructure post](/articles/side-projects/atelier-supporting-infrastructure/) covered the plumbing`

…but neither of those two links back. Fix — add a forward pointer in each, matching the pattern already used at `atelier-slack-mcp.md:239` (`Update: since this article, L'Atelier [moved from Firecracker to Kubernetes…]`):

```markdown
# append to side-projects/atelier-supporting-infrastructure.md, in the "What's Next" section
L'Atelier v3 took the next step and made prebuilds content-addressed:
[baking any git repo into a boot-ready VolumeSnapshot](/articles/side-projects/atelier-prebuilds/).

# append to side-projects/atelier-kubernetes-migration.md:221, under "## What's Next"
The prebuild system that runs on top of these VolumeSnapshots got its own rewrite:
[content-addressed prebuilds in L'Atelier v3](/articles/side-projects/atelier-prebuilds/).
```

`bun-memory-leak-kubernetes-restart` is a strong, specific, high-intent article (`oven-sh/bun#21560`, `--smol`, `BUN_JSC_forceRAMSize`) with nothing pointing at it. It sits in `group: "frak"` alongside nine other Frak infra posts, none of which reference it. Fix — the most natural host is the Kubernetes/self-hosting article that discusses the same cluster:
```markdown
# append to frak/frak-hetzner-platform.md:441, next to the existing stateful-services paragraph
Long-running workloads on this cluster have their own failure modes — see
[three days of chasing a Bun memory leak that ended in a liveness-probe restart](/articles/devops/bun-memory-leak-kubernetes-restart/).
```

Near-orphans worth strengthening (1 inbound each): `frak/shopify-i18n-metaobjects.md`, `frak/webauthn-release.md`, `side-projects/wordforge.md`, `side-projects/tableau-elec-3-phase-optimizer.md`, and `frak/cost-effective-infra.md` (2 inbound, but **one of them is broken** — see F5.1).

### 5c. **F5.1 — Broken relative links: 8 hard 404s. Impact: High.**

Astro does **not** rewrite relative `href`s in markdown. Pages build to `dist/<path>/index.html` and are served with a trailing slash, so `./foo` resolves *inside* the current article's directory.

Verified directly in the build output:

```html
<!-- dist/articles/frak/mongodb-to-turso-rustfs/index.html:141 -->
<a href="./frak-infrastructure-iac">our previous infra-iac post</a>
```
Served from `https://nivelais.com/articles/frak/mongodb-to-turso-rustfs/`, this resolves to
`https://nivelais.com/articles/frak/mongodb-to-turso-rustfs/frak-infrastructure-iac` → **404** (confirmed: `dist/articles/frak/` contains only `frak-infrastructure-iac/`, not `mongodb-to-turso-rustfs/frak-infrastructure-iac/`).

Full list of broken links:

| Source file:line | Broken href | Correct href |
|---|---|---|
| `frak/mongodb-to-turso-rustfs.md:189` | `./frak-infrastructure-iac` | `/articles/frak/frak-infrastructure-iac/` |
| `frak/mongodb-to-turso-rustfs.md:445` | `./frak-infrastructure-iac` | `/articles/frak/frak-infrastructure-iac/` |
| `frak/mongodb-to-turso-rustfs.md:445` | `./cost-effective-infra` | `/articles/frak/cost-effective-infra/` |
| `frak/mongodb-to-turso-rustfs.md:458` | `./frak-infrastructure-iac` | `/articles/frak/frak-infrastructure-iac/` |
| `frak/mongodb-to-turso-rustfs.md:459` | `./cost-effective-infra` | `/articles/frak/cost-effective-infra/` |
| `frak/mongodb-to-turso-rustfs.md:460` | `./4337-webauthn` | `/articles/frak/4337-webauthn/` |
| `mobile/tauri-recovery-hint-uninstall-survival.md:25` | `./native-webauthn-tauri-plugin-ios-android` | `/articles/mobile/native-webauthn-tauri-plugin-ios-android/` |
| `mobile/tauri-recovery-hint-uninstall-survival.md:41` | `./native-webauthn-tauri-plugin-ios-android` | `/articles/mobile/native-webauthn-tauri-plugin-ios-android/` |

This is the single highest-value fix in the report: it restores 3 inbound links to `frak-infrastructure-iac`, 2 to `cost-effective-infra` (taking it from 1 working inbound to 3), 1 to `4337-webauthn`, and 2 to `native-webauthn-tauri-plugin-ios-android`. Every other article in the corpus uses absolute `/articles/…` paths; these two files are the only outliers.

### 5d. **F5.2 — Broken fragment anchors: 3. Impact: Medium.**

Verified against `dist/articles/scenario-parser/architecture/index.html`, which contains:
```html
<h2 id="stage-2-parallel-parsing-4-competing-strategies">STAGE 2: Parallel Parsing (4 Competing Strategies)</h2>
<h2 id="quality-scoring-algorithm">Quality Scoring Algorithm</h2>
```
Neither `#stage-2-parsing` nor `#quality-selection-algorithm` exists.

| Source file:line | Broken anchor | Correct anchor |
|---|---|---|
| `scenario-parser/scenario-parser-extraction.md:63` | `/articles/scenario-parser/architecture/#stage-2-parsing` | `…/architecture/#stage-2-parallel-parsing-4-competing-strategies` |
| `scenario-parser/scenario-parser-pipeline.md:26` | `/articles/scenario-parser/architecture#stage-2-parsing` | `…/architecture/#stage-2-parallel-parsing-4-competing-strategies` |
| `scenario-parser/scenario-parser-psychology.md:28` | `/articles/scenario-parser/architecture#quality-selection-algorithm` | `…/architecture/#quality-scoring-algorithm` |

### 5e. **F5.3 — Inconsistent trailing slashes: 15 links. Impact: Low.**

Pages are emitted as `dist/<path>/index.html` (trailing-slash canonical, confirmed by `<link rel="canonical" href="https://nivelais.com/articles/frak/hardhat-to-foundry/">`). Most content links match, but 15 omit the slash, causing a 301 hop on most static hosts:

```
opinion/erc7579-uncomfortable-truth.md:24        /articles/frak/4337-webauthn
mobile/tauri-recovery-hint-uninstall-survival.md:30  /articles/frak/4337-webauthn
scenario-parser/scenario-parser-extraction.md:20     /articles/scenario-parser/architecture
scenario-parser/scenario-parser-extraction.md:22     /articles/scenario-parser/architecture
scenario-parser/scenario-parser-pipeline.md:22       /articles/scenario-parser/architecture
scenario-parser/scenario-parser-psychology.md:18     /articles/scenario-parser/scenario-parser-pipeline
scenario-parser/scenario-parser-psychology.md:18     /articles/scenario-parser/scenario-parser-extraction
scenario-parser/scenario-parser-psychology.md:20     /articles/scenario-parser/architecture
side-projects/atelier-slack-mcp.md:15                /articles/side-projects/atelier-stop-babysitting
frak/frak-wallet-ci-overhaul.md:19                   /articles/frak/wallet-devx-revolution
frak/frak-wallet-ci-overhaul.md:27                   /articles/frak/frak-hetzner-platform
frak/frak-wallet-ci-overhaul.md:128                  /articles/frak/frak-hetzner-platform
frak/frak-wallet-ci-overhaul.md:375                  /articles/frak/frak-hetzner-platform
frak/frak-hetzner-platform.md:15                     /articles/frak/frak-infrastructure-iac
frak/frak-listener-ring-architecture.md:17           /articles/frak/frak-frontend-optimization
```
Fix: append `/` to each.

### 5f. Series cross-linking scorecard

| Series (`group`) | Parts | Fully meshed? | Gaps |
|---|---|---|---|
| **cooking-bot** | 3 | ✅ **Complete mesh** | none — every part links both siblings (`introduction.md:17,26`; `ingestion.md:17,309`; `runtime.md:17,196`) |
| **scenario-parser** | 4 | ⚠ 11/12 | `scenario-parser-extraction.md` never links `scenario-parser-psychology` |
| **kiln** | 5 | ⚠ 14/20 | Part 1 → Part 5 missing; Part 3 → Parts 1 & 4 missing; Part 4 → Part 3 missing |
| **atelier** | 5 | ⚠ 13/20 | **Part 5 (`atelier-prebuilds`) has 0 inbound** (F5.2b); Parts 1–4 never link it |
| **web3 / ERC-2612** | 3 (+1 security) | ⛔ **Broken** | Part 1 links Part 2 **to Medium**; Part 2 links Part 1 **to Medium ×2** and calls Part 3 "coming soon" although it shipped 2023-04-14; Part 3 links Parts 1 & 2 **to Medium ×4**. See §9. |
| **frak** (17 articles, loose cluster) | 17 | ✅ Dense | well interlinked; only gap is the `bun-memory-leak` orphan |

Concrete kiln fixes:
```markdown
# kiln/kiln-hardware.md — append to the "## Next Steps" bullet list at :492
- [Bare-metal Rust firmware on the RP2350](/articles/kiln/pico-kiln-rust/)

# kiln/pico-kiln-app.md — append to "## What We Get" (:216)
The hardware this app drives was a 1977 three-phase kiln before it was a smart one:
[Part 1, converting 380V to 220V](/articles/kiln/kiln-hardware/). The PID gains it
pushes come from [Part 4's physics-based tuning](/articles/kiln/pico-python-analysis/).

# kiln/pico-python-analysis.md — append near :813
These gains are edited and applied from the
[React/Tauri controller app in Part 3](/articles/kiln/pico-kiln-app/).
```

Concrete scenario-parser fix:
```markdown
# scenario-parser/scenario-parser-extraction.md:487 — extend the existing "next article" sentence
In the [next article on the analysis pipeline](/articles/scenario-parser/scenario-parser-pipeline/),
we'll explore how this clean structured data enables sophisticated graph-based analysis and LLM
orchestration — and then how it becomes
[full character psychology profiles](/articles/scenario-parser/scenario-parser-psychology/).
```

---

## 6. Keyword cannibalization

### 6a. Account-abstraction / ERC-4337 / WebAuthn cluster — **6 articles, real overlap**

| File | Date | Tags | Competing for |
|---|---|---|---|
| `frak/polygon-account-abstraction.md` | 2023-12-13 | `Account Abstraction`, `ERC-4337`, `Polygon`, `Smart Wallets`, `ZeroDev` | "account abstraction ERC-4337" |
| `frak/webauthn-release.md` | 2025-02-23 | `WebAuthN`, `Smart Wallets`, `Account Abstraction`, `ERC-4337`, `UX` | "webauthn smart wallet" |
| `frak/4337-webauthn.md` | 2024-05-26 | `ERC-4337`, `Account Abstraction`, `WebAuthN`, `Solidity`, `Smart Wallets` | "webauthn erc-4337" |
| `opinion/erc7579-uncomfortable-truth.md` | 2025-12-29 | `ERC-7579`, `Account Abstraction`, `Smart Wallets`, … | "erc-7579 modular smart wallet" |
| `mobile/native-webauthn-tauri-plugin-ios-android.md` | 2026-03-30 | `webauthn`, `passkeys`, `tauri`, … | "native webauthn tauri" |
| `mobile/tauri-recovery-hint-uninstall-survival.md` | 2026-04-22 | `WebAuthn`, `Passkey`, `Keychain`, … | "passkey recovery uninstall" |

**Verdict: mostly healthy, one genuine collision.**

Four of the six have clearly disjoint long-tail targets and the internal links state the relationship explicitly — e.g. `4337-webauthn.md:38` → *"For a candid look at where the smart wallet ecosystem has landed since, read [the uncomfortable truth about ERC-7579…]"*. That's correct disambiguation.

**F6.1 — `webauthn-release.md` vs `4337-webauthn.md` genuinely cannibalize. Impact: Medium.**
Both share **4 of 5 tags** (`ERC-4337`, `Account Abstraction`, `WebAuthN`, `Smart Wallets`), both are `category: "solidity"`, both are `group: "frak"`, and both frame themselves as *"how we built WebAuthn + ERC-4337"*:
- `webauthn-release.md:10` → `"How we built our first WebAuthn smart wallet POC: ERC-4337 accounts secured by biometrics…"`
- `4337-webauthn.md:10` → `"How we validate ERC-4337 user operations with WebAuthn signatures…"`

They are already cross-linked (`webauthn-release.md:39` → `4337-webauthn`), which is the right instinct, but the titles/descriptions don't separate intent.

Fix: re-position `webauthn-release.md` explicitly as the **product announcement / demo**, leaving `4337-webauthn.md` as the sole **technical** target:
```yaml
# frak/webauthn-release.md
title: "Shipping a Biometric Smart Wallet Demo: Our POC Story"      # 51
subtitle: "What a passkey-secured paywall replacement looks like when it actually runs in a browser"
description: "The product story behind our first passkey smart wallet: a biometric paywall-replacement demo, what shipped, what broke, and what we cut."
```
and leave `4337-webauthn.md` as-is (its title `WebAuthn Signatures for ERC-4337 Smart Wallets` is the correct technical head term).

**F6.2 — `polygon-account-abstraction.md` is the weakest page targeting the strongest term. Impact: Medium.**
It owns the site's only shot at "account abstraction Polygon", but it's 2023 marketing copy (see F10.2) and the stack has since moved to Arbitrum (`cost-effective-infra.md:10` → *"on-chain reward distribution on **Arbitrum**"*). Either refresh it (F10.2) or accept that `4337-webauthn.md` and `erc7579-uncomfortable-truth.md` will outrank it for every AA query.

### 6b. CI / Docker / build-time cluster — **4 articles, well-separated. No cannibalization.**

| File | Layer | Title |
|---|---|---|
| `frak/frak-hetzner-platform.md` | platform | A Self-Hosted Hetzner CI Platform for the Frak Stack |
| `frak/frak-wallet-ci-overhaul.md` | application | Rebuilding the Wallet's CI: From 9 Minutes to 2 |
| `frak/wallet-devx-revolution.md` | build tooling | DevX Overhaul: Cutting Build Times by 10x at Frak |
| `frak/frak-infrastructure-iac.md` | IaC | Why We Chose SST and Pulumi over Terraform for IaC |

This is the best-handled cluster on the site. The articles explicitly negotiate their own boundaries in body copy:
- `frak-wallet-ci-overhaul.md:19` → *"That was about build-tool speed. This article is about the layer underneath: Docker build speed in CI, which is a different lever entirely."*
- `frak-hetzner-platform.md:466` → *"read this article first and the CI overhaul second: they're the same project, told from two ends."*

**No action.** This is the pattern the ERC-2612 and AA clusters should copy.

Minor note: `frak-wallet-ci-overhaul` and `wallet-devx-revolution` share tags `Performance` + `Monorepo`, and `frak-hetzner-platform` + `frak-wallet-ci-overhaul` share `GitHub Actions`, `BuildKit`, `Kubernetes`. Tag overlap without title/description overlap is fine.

### 6c. Kubernetes / self-hosting cluster — **8 articles, one weak seam**

| File | Angle | `Self-Hosting` tag? |
|---|---|---|
| `frak/frak-hetzner-platform.md` | CI platform on k3s | `Self-hosting` (lowercase h) |
| `side-projects/atelier-kubernetes-migration.md` | Firecracker → Kata/k3s | ✅ |
| `side-projects/atelier-supporting-infrastructure.md` | in-cluster CLIProxy/Verdaccio/Zot | ✅ |
| `side-projects/atelier-prebuilds.md` | VolumeSnapshot prebuilds | ✅ |
| `side-projects/atelier-stop-babysitting.md` | Firecracker microVMs | ✅ |
| `frak/mongodb-to-turso-rustfs.md` | stateful services on k8s | ✗ |
| `frak/frak-infrastructure-iac.md` | GKE via Pulumi | ✗ |
| `devops/bun-memory-leak-kubernetes-restart.md` | k8s liveness probe | ✗ |

**F6.3 — `frak-hetzner-platform` and `atelier-supporting-infrastructure` overlap on "self-hosted Verdaccio + Zot on k3s". Impact: Low.**
Both describe the same trio of components:
- `frak-hetzner-platform.md:10` → `"a Zot OCI registry, and a Verdaccio NPM mirror on k3s"`
- `atelier-supporting-infrastructure.md:10` → `"a Verdaccio npm cache, an in-cluster Zot registry"`

They're different clusters for different projects and neither links the other. Fix: one sentence of mutual disambiguation, and it becomes a strength rather than a duplicate.
```markdown
# append to side-projects/atelier-supporting-infrastructure.md, under "## Zot: In-Cluster Image Storage"
The same Zot + Verdaccio pairing runs on Frak's production CI cluster too —
[the Hetzner platform post](/articles/frak/frak-hetzner-platform/) covers that deployment,
with mTLS BuildKit and Kyverno registry rewriting on top.
```

---

## 7. Category taxonomy

Re-scoped per the correction at the top: **`category` generates no pages**, so there is no thin-taxonomy-page risk. The findings are about data integrity and the `articleSection` JSON-LD value.

### 7a. Distinct `category` values (9 total, 43 articles)

| `category` | Count | Files |
|---|---|---|
| `devops` | 9 | frak-frontend-optimization, mongodb-to-turso-rustfs, frak-hetzner-platform, frak-infrastructure-iac, cost-effective-infra, bun-memory-leak, wallet-devx-revolution, frak-listener-ring-architecture, frak-wallet-ci-overhaul |
| `solidity` | 8 | erc-2612-part-{1,2,3}, securing-solidity, hardhat-to-foundry, polygon-account-abstraction, webauthn-release, 4337-webauthn |
| `tooling` | 6 | atelier-{stop-babysitting, slack-mcp, kubernetes-migration, supporting-infrastructure, prebuilds}, wordforge |
| `system-design` | 5 | cooking-bot/{introduction, ingestion, runtime}, scenario-parser/{architecture, pipeline} |
| `engineering` | 5 | tableau-elec, wordpress-plugin, shopify-i18n, monerium, pico-python-analysis |
| `mobile` | 4 | tauri-recovery-hint, tauri-native-sharing, native-webauthn-tauri, pico-kiln-app |
| `electronics` | 4 | kiln-hardware, pico-kiln-firmware, pico-kiln-rust, **scenario-parser-extraction** |
| `ai` | **1** | scenario-parser-psychology |
| `opinion` | **1** | erc7579-uncomfortable-truth |

### 7b. **F7.1 — `scenario-parser-extraction.md` is filed under `electronics`. Impact: Medium.**

```yaml
# src/content/articles/scenario-parser/scenario-parser-extraction.md:6-7
category: "electronics"
tags: ["Python", "PDF Parsing", "Regex", "Data Engineering", "ETL"]
```
A Python PDF-parsing article about PyMuPDF4LLM and Jaro-Winkler string matching, categorised as *electronics*. Its three siblings in the same folder are `system-design`, `system-design`, `ai`. This is almost certainly a copy-paste from a kiln article. It pollutes both the `/articles` filter chip and the `articleSection` JSON-LD.

Fix:
```yaml
category: "system-design"
```

### 7c. **F7.2 — The scenario-parser series uses 3 different categories for 4 articles. Impact: Low.**

```
scenario-parser/architecture.md:6                  category: "system-design"
scenario-parser/scenario-parser-pipeline.md:6      category: "system-design"
scenario-parser/scenario-parser-extraction.md:6    category: "electronics"   ← F7.1
scenario-parser/scenario-parser-psychology.md:6    category: "ai"
```
After fixing F7.1, set `scenario-parser-psychology.md:6` to `category: "system-design"` too — or, if you want `ai` to be a real category, move `cooking-bot/runtime.md` and `cooking-bot/introduction.md` into it as well so it isn't a category of one.

### 7d. **F7.3 — The kiln series splits across 3 categories. Impact: Low.**

```
kiln/kiln-hardware.md:6         category: "electronics"
kiln/pico-kiln-firmware.md:6    category: "electronics"
kiln/pico-kiln-rust.md:6        category: "electronics"
kiln/pico-python-analysis.md:6  category: "engineering"   ← odd one out
kiln/pico-kiln-app.md:6         category: "mobile"        ← defensible (Tauri app)
```
`pico-python-analysis` is control-theory analysis of kiln telemetry — same domain as its `electronics` siblings. Fix: `category: "electronics"`.

### 7e. **F7.4 — Two frontend articles are filed as `devops`. Impact: Low.**

```
frak/frak-frontend-optimization.md:6       category: "devops"
    tags: ["Frontend", "Performance", "Nginx", "Vite", "Rolldown", "Web3", "Zustand", "Kubernetes"]
frak/frak-listener-ring-architecture.md:6  category: "devops"
    tags: ["Frontend", "Performance", "Preact", "React", "Vite", "Rolldown", "Code Splitting", "SDK"]
```
Both are tagged `Frontend` as their *first* tag and are about bundle size and code splitting. `devops` is wrong for both. Fix: `category: "engineering"` (or introduce `frontend` — but then it's a category of two, which is still better than mislabelled).

### 7f. Single-article categories

`ai` (1) and `opinion` (1). Since neither generates a page, the only cost is a one-item filter chip on `/articles`. Fold `ai` into `system-design` per F7.2. Keep `opinion` — it's a genuine content-type distinction and `erc7579-uncomfortable-truth` really is the only opinion piece.

### 7g. **F7.5 — THE REAL TAXONOMY BUG: three divergent hierarchies, three 404 URL segments. Impact: High.**

Three independent taxonomies are in play and none of them agree:

| Article | URL folder | `group` (drives `/articles/[category]`) | `category` (drives nothing) |
|---|---|---|---|
| `devops/bun-memory-leak-kubernetes-restart.md` | `devops` | `frak` | `devops` |
| `mobile/native-webauthn-tauri-plugin-ios-android.md` | `mobile` | `frak` | `mobile` |
| `mobile/tauri-native-sharing-rich-previews.md` | `mobile` | `frak` | `mobile` |
| `mobile/tauri-recovery-hint-uninstall-survival.md` | `mobile` | `frak` | `mobile` |
| `opinion/erc7579-uncomfortable-truth.md` | `opinion` | `web3` | `opinion` |
| `side-projects/atelier-*.md` (×5) | `side-projects` | `atelier` | `tooling` |
| `kiln/pico-kiln-app.md` | `kiln` | `kiln` | `mobile` |

Two concrete consequences, both verified against `dist/`:

**(a) Three live URL segments 404.** `ARTICLE_GROUPS` (`src/articleGroups.ts:10-72`) has keys `frak, cooking-bot, web3, side-projects, atelier, kiln, scenario-parser` — no `devops`, `mobile`, or `opinion`. Confirmed:
```
dist/articles/devops/   → contains only bun-memory-leak-kubernetes-restart/   (no index.html → 404)
dist/articles/mobile/   → no index.html → 404
dist/articles/opinion/  → no index.html → 404
```
So `https://nivelais.com/articles/mobile/` is a 404 sitting in the middle of four live article URLs. Crawlers walking up the path hierarchy — and users truncating the URL — hit a dead end.

**(b) `/articles/atelier/` is a hub with no children at its own path.** `dist/articles/atelier/index.html` exists and lists five articles, every one of which lives at `/articles/side-projects/…`. The hub URL and the article URLs share no common path prefix, so the breadcrumb hierarchy is fictional.

Fix (content-side, lowest-risk, no route changes):
1. Add the three missing keys to `src/articleGroups.ts` so `/articles/devops/`, `/articles/mobile/`, `/articles/opinion/` resolve — **and** retag those articles' `group` to match their folder:
   ```yaml
   devops/bun-memory-leak-kubernetes-restart.md:  group: "devops"   # was "frak"
   mobile/native-webauthn-tauri-plugin-ios-android.md:  group: "mobile"   # was "frak"
   mobile/tauri-native-sharing-rich-previews.md:        group: "mobile"   # was "frak"
   mobile/tauri-recovery-hint-uninstall-survival.md:    group: "mobile"   # was "frak"
   opinion/erc7579-uncomfortable-truth.md:              group: "opinion"  # was "web3"
   ```
   Caveat: this changes prev/next series navigation (`[...slug].astro:28-56` walks `group`), and moves 4 articles off the `/articles/frak/` hub. If the Frak grouping is intentional editorial, do the opposite instead — **move the files** so folder == group (`src/content/articles/frak/bun-memory-leak-kubernetes-restart.md`, etc.). Either direction is fine; the current split is not.
2. Rename the `atelier` group to `side-projects`, or move the five `atelier-*.md` files to `src/content/articles/atelier/`. The latter is cleaner and makes `/articles/atelier/` a true parent.

Both options require URL changes → coordinate with redirects (`astro.config.mjs:19-21` already has a `redirects` block to extend).

---

## 8. Tags

**Important context: there is no tag page.** `src/pages/` contains no `[tag].astro`. Tags surface only as (a) on-page `<span>` chips, (b) `"keywords"` in Article JSON-LD (`ArticleLayout.astro:53`), (c) `article:tag` meta. So tag hygiene is a consistency/entity-signal issue, not a crawl-budget one. Findings sized accordingly.

### 8a. **F8.1 — Duplicate tag within a single article. Impact: Low.**

```yaml
# src/content/articles/kiln/pico-kiln-app.md:7
tags: ["Kiln", "IoT", "React", "Tauri", "IoT", "Local-First"]
```
`"IoT"` appears twice. It renders as two identical chips and emits `"keywords": "Kiln, IoT, React, Tauri, IoT, Local-First"` in JSON-LD. The schema (`content.config.ts:11`, `z.array(z.string())`) does not dedupe.

Fix:
```yaml
tags: ["Kiln", "IoT", "React", "Tauri", "Local-First", "Cross-Platform"]
```
This is the only duplicate-within-article in the corpus.

### 8b. **F8.2 — Casing inconsistencies across the corpus. Impact: Medium** (fragments the entity signal, and the `/articles` filter chips render as visually distinct tags).

Two files use an all-lowercase tag set while the other 41 use Title Case:

```yaml
# src/content/articles/mobile/native-webauthn-tauri-plugin-ios-android.md:8
tags: ["tauri", "webauthn", "passkeys", "ios", "android", "rust", "swift", "kotlin", "mobile"]

# src/content/articles/devops/bun-memory-leak-kubernetes-restart.md:8
tags: ["bun", "elysia", "kubernetes", "memory", "debugging", "performance", "backend"]
```

Every one of these collides with an existing Title Case variant:

| Canonical form | Used in | Variant | Used in |
|---|---|---|---|
| `Tauri` | tauri-recovery-hint, tauri-native-sharing, pico-kiln-app | `tauri` | native-webauthn-tauri |
| `WebAuthn` | tauri-recovery-hint, mongodb-to-turso-rustfs | `webauthn` / **`WebAuthN`** | native-webauthn-tauri / **webauthn-release, 4337-webauthn** |
| `iOS` / `Android` | tauri-recovery-hint, tauri-native-sharing | `ios` / `android` | native-webauthn-tauri |
| `Rust` | tauri-recovery-hint, tauri-native-sharing, pico-kiln-rust | `rust` | native-webauthn-tauri |
| `Swift` / `Kotlin` | tauri-recovery-hint, tauri-native-sharing | `swift` / `kotlin` | native-webauthn-tauri |
| `Mobile` | tauri-recovery-hint, tauri-native-sharing | `mobile` | native-webauthn-tauri |
| `Kubernetes` | 8 articles | `kubernetes` | bun-memory-leak |
| `Performance` | frak-frontend-optimization, wordpress-plugin, wallet-devx-revolution, frak-wallet-ci-overhaul | `performance` | scenario-parser-pipeline, bun-memory-leak |
| `Bun` | tableau-elec | `bun` | bun-memory-leak |
| `TypeScript` | cooking-bot/introduction, tableau-elec, frak-infrastructure-iac | `typescript` | scenario-parser-pipeline |
| `Self-Hosting` | 6 articles | **`Self-hosting`** | **frak-hetzner-platform** |
| `Pipeline` | cooking-bot/ingestion | `pipeline` | scenario-parser-pipeline |

`WebAuthn` is the worst: **three** spellings (`WebAuthn`, `WebAuthN`, `webauthn`) across 5 articles, and `WebAuthN` isn't even the correct spec casing.

Fixes:
```yaml
# mobile/native-webauthn-tauri-plugin-ios-android.md:8
tags: ["Tauri", "WebAuthn", "Passkey", "iOS", "Android", "Rust", "Swift", "Kotlin", "Mobile"]

# devops/bun-memory-leak-kubernetes-restart.md:8
tags: ["Bun", "Elysia", "Kubernetes", "Performance", "Debugging", "Backend", "Memory"]

# frak/webauthn-release.md:7
tags: ["WebAuthn", "Smart Wallets", "Account Abstraction", "ERC-4337", "UX"]

# frak/4337-webauthn.md:7
tags: ["ERC-4337", "Account Abstraction", "WebAuthn", "Solidity", "Smart Wallets"]

# frak/frak-hetzner-platform.md:7
tags: ["Kubernetes", "Hetzner", "GitHub Actions", "ARC", "BuildKit", "Pulumi", "SST", "Self-Hosting", "DevOps"]

# scenario-parser/scenario-parser-pipeline.md:7
tags: ["Architecture", "Graph Theory", "TypeScript", "Performance", "Pipeline"]
```
Note `scenario-parser/scenario-parser-pipeline.md` and `scenario-parser/architecture.md` also use hyphenated-lowercase slugs (`graph-theory`, `competitive-parsing`, `multi-strategy`, `quality-selection`, `self-healing`) which are unique to those two files — normalise to Title Case with spaces to match the other 41 articles.

### 8c. **F8.3 — ~85 one-off tags out of ~135 distinct. Impact: Low.**

Roughly 63% of distinct tags are used exactly once. A sample of the pure one-offs:

`Infrastructure, Verdaccio, Zot, CLIProxy, Audio, Observability, Real-Time, Graph Theory, Competitive Parsing, Multi-Strategy, Quality Selection, Self-Healing, PDF Parsing, Regex, Data Engineering, ETL, Prompt Engineering, Psychology, Synthesis, Kata Containers, Cloud Hypervisor, LVM, Slack, AI Agents, AI Orchestration, OpenCode, MicroVM, Processing, Keychain, BlockStore, System Architecture, spaCy, libSQL, Turso, RustFS, MongoDB, Drizzle, Side Project, Algorithms, Optimization, Domain Modelling, FileProvider, LPLinkMetadata, UIActivityViewController, VolumeSnapshots, Prebuilds, Git, Polygon, ZeroDev, Hetzner, ARC, UX, IaC, GCP, AWS, Smart Contracts, Blockchain Infrastructure, eRPC, Ponder, Gasless, PHP, Gutenberg, Webhooks, CI/CD, Shopify, Internationalization, Metaobjects, Liquid, GraphQL, React Router, Checkout Extensions, Monerium, Stablecoins, OAuth2, PKCE, EURe, Fintech, Embassy, no_std, RP2350, Firmware, Smart Contract Security, Auditing, Fuzzing, Security Tools, DevX, TanStack Start, Vitest, Local-First, ERC-7579, Rhinestone, ZK, Social Login, Preact, Code Splitting, SDK, Control Theory, PID, Data Analysis, Physics, Electrical Engineering, Restoration, CI, Docker, Raspberry Pi Pico, MicroPython, Industrial Automation`

Because no tag pages exist, this costs nothing in crawl budget — most of these are legitimate specific technology entities and are *useful* in `keywords` JSON-LD. **I would not mass-prune these.** The only two worth fixing are near-synonyms that split a real cluster:

- **`CI` vs `CI/CD`** — `frak-wallet-ci-overhaul.md:7` uses `"CI"`, `wordpress-plugin-performance-native-webhooks.md:9` uses `"CI/CD"`. Pick `"CI/CD"` for both.
- **`Architecture` vs `System Architecture`** — `scenario-parser-pipeline.md`/`architecture.md` use `architecture`; `cooking-bot/introduction.md:7` uses `"System Architecture"`. Pick `"Architecture"`.

Also worth adding: `Passkey` appears in `tauri-recovery-hint` but `passkeys` (plural, lowercase) in `native-webauthn-tauri`. Normalise both to `"Passkey"` (covered in F8.2).

---

## 9. `mediumUrl` and cross-post canonical risk

9 articles carry a `mediumUrl`. `ArticleLayout.astro:354-355` renders it as a plain outbound link:
```astro
<a href={mediumUrl} target="_blank" rel="noopener noreferrer" …>
```
It is **not** used as a `rel="canonical"` — `BaseHead.astro:24,98` always self-canonicalises:
```ts
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
…
<link rel="canonical" href={canonicalURL} />
```
**That's the correct setup** and I'm not going to second-guess it. The risk is elsewhere.

### 9a. **F9.1 — `cost-effective-infra.md` has a WRONG `mediumUrl`. Impact: High.**

```yaml
# src/content/articles/frak/cost-effective-infra.md:12
mediumUrl: "https://medium.com/frak-defi/unlocking-the-future-webauthn-meets-erc-4337-smart-wallets-e472b340452b"
```
```yaml
# src/content/articles/frak/4337-webauthn.md:12
mediumUrl: "https://medium.com/frak-defi/unlocking-the-future-webauthn-meets-erc-4337-smart-wallets-e472b340452b"
```
**Byte-identical.** `cost-effective-infra.md` is titled *"Cost-Effective Blockchain Infrastructure: eRPC and Ponder"* and is about RPC routing and on-chain indexing on Arbitrum. Its "Read on Medium" button sends the reader to an article about WebAuthn and ERC-4337 smart wallets. Zero topical overlap.

Fix — either point it at the correct Medium post if one exists, or delete the key entirely:
```yaml
# src/content/articles/frak/cost-effective-infra.md — remove line 12
```
I'd delete it. Nothing in the article body references a Medium original, unlike the ERC-2612 series.

### 9b. Full `mediumUrl` inventory

| File | `mediumUrl` slug | Topic match? |
|---|---|---|
| `web3/erc-2612-part-1.md:12` | `erc-2612-the-ultimate-guide-to-gasless-erc-20-approvals-2cd32ddee534` | ✅ |
| `web3/erc-2612-part-2.md:11` | `…-approvals-part-2-9c90c01eb69d` | ✅ |
| `web3/erc-2612-part-3.md:11` | `…-approvals-part-3-f4c8ebf75245` | ✅ |
| `web3/securing-solidity-smart-contracts.md:12` | `securing-solidity-smart-contracts-61d070914886` | ✅ |
| `frak/hardhat-to-foundry.md:12` | `maximizing-quality-and-reliability-in-solidity-our-journey-from-hardhat-to-foundry-…` | ✅ |
| `frak/webauthn-release.md:12` | `from-idea-to-innovation-unveiling-our-webauthn-smart-wallet-demo-…` | ✅ |
| `frak/polygon-account-abstraction.md:12` | `fraks-vanguard-pioneering-the-account-abstraction-revolution-in-the-polygon-ecosystem-…` | ✅ |
| `frak/4337-webauthn.md:12` | `unlocking-the-future-webauthn-meets-erc-4337-smart-wallets-…` | ✅ |
| **`frak/cost-effective-infra.md:12`** | `unlocking-the-future-webauthn-meets-erc-4337-smart-wallets-…` | ⛔ **WRONG** |

### 9c. **F9.2 — Duplicate-content risk assessment: real, and made worse by the body copy. Impact: High.**

All 9 Medium posts are on `medium.com/frak-defi`, published 2022–2025, and predate the nivelais.com versions. Medium articles carry a self-canonical, so **Medium is currently the canonical authority for all 9**. The site version is the duplicate, not the other way round.

Normally you'd shrug — but **the site's own body copy actively reinforces Medium's claim**. The ERC-2612 series contains **8 in-body links to the Medium duplicates of articles that exist on this very site**:

```markdown
web3/erc-2612-part-1.md:34
*   [Part 2: Solidity development of ERC-2612](https://medium.com/p/9c90c01eb69d)
    → should be: (/articles/web3/erc-2612-part-2/)

web3/erc-2612-part-2.md:19
… If you missed the [first article](https://medium.com/frak-defi/erc-2612-the-ultimate-guide-to-gasless-erc-20-approvals-2cd32ddee534), we covered …
    → should be: (/articles/web3/erc-2612-part-1/)

web3/erc-2612-part-2.md:27
1.  [Part 1: General overview of ERC-2612 (March 13, 2023)](https://medium.com/frak-defi/erc-2612-…-2cd32ddee534)
    → should be: (/articles/web3/erc-2612-part-1/)

web3/erc-2612-part-3.md:19
… In the [previous articles](https://medium.com/frak-defi/erc-2612-…-part-2-9c90c01eb69d), we've discussed …
    → should be: (/articles/web3/erc-2612-part-2/)

web3/erc-2612-part-3.md:27
*   [Part 1: General overview of ERC-2612 (March 13, 2023)](https://medium.com/frak-defi/erc-2612-…-2cd32ddee534)
    → should be: (/articles/web3/erc-2612-part-1/)

web3/erc-2612-part-3.md:28
*   [Part 2: Solidity development of ERC-2612 (March 23, 2023)](https://medium.com/frak-defi/erc-2612-…-part-2-9c90c01eb69d)
    → should be: (/articles/web3/erc-2612-part-2/)

web3/erc-2612-part-3.md:40
… we highly recommend reading [Part 1: General overview of ERC-2612](https://medium.com/frak-defi/…-2cd32ddee534) and [Part 2: Solidity development of ERC-2612](https://medium.com/frak-defi/…-part-2-9c90c01eb69d) before proceeding.
    → should be both internal
```

So on the nivelais.com copy of Part 3, a reader clicking "Part 1" or "Part 2" leaves the site for Medium — **4 times in one article**. Every one of those is a dofollow external link to a page that is the direct duplicate competitor of a page on this site. Replace all 8 with the internal equivalents listed above.

### 9d. **F9.3 — Medium engagement CTAs left in 7 articles. Impact: Medium.**

Off-brand on a personal portfolio, and several of them push readers to Medium.

```markdown
frak/hardhat-to-foundry.md:78-79
**_If you want to continue the conversation, you can connect with us_** [**_@frak_defi_**](https://twitter.com/frak_defi) **_on Twitter or on Telegram.
Be informed when a new article is published by following us on_** [**_Medium_**](https://medium.com/frak-defi)**_._ If you liked this article, please consider giving it a "clap" _(up to 50x) to let us know you enjoyed it. It'll mean a lot to us._**

web3/securing-solidity-smart-contracts.md:167-168
**_If you want to continue the conversation, you can connect with us_** [@frak_defi](https://twitter.com/frak_defi) **_on Twitter or on Telegram.
Be informed when a new article is published by following us on_** [**_Medium_**](https://medium.com/frak-defi)**_. If you liked this article, please clap for it (up to 50x)…_**

web3/erc-2612-part-1.md:100
… please don't hesitate to **follow** me and give this article a **clap**.

web3/erc-2612-part-2.md:110
… If you found this article helpful, please give it a clap, share it, and follow me…

web3/erc-2612-part-3.md:148
If you found this article helpful, please give it a **clap**, **share it**, and **follow me**…

frak/4337-webauthn.md:117
If you found this deep dive enlightening, **please give us a clap and share this article**…

frak/webauthn-release.md:154
*   **Clap and Share**: If this article resonated with you, please don't hesitate to applaud it…

frak/webauthn-release.md:167
*   [Explore Our Collaborative Articles on Medium](https://medium.com/@quentin.nivelais/list/webauthn-collaboration-fc06acc0823b)
```

Fix: delete all of these. Replace with a single consistent internal CTA. For example, at the end of `hardhat-to-foundry.md`:
```markdown
If you're setting up Solidity tooling from scratch, the companion piece covers
[the free security stack we ran before our audit](/articles/web3/securing-solidity-smart-contracts/),
and [Part 3 of the ERC-2612 series](/articles/web3/erc-2612-part-3/) shows these Forge tests in anger.
```

### 9e. **F9.4 — Literal Medium export artifacts rendered as body text. Impact: Medium.**

```markdown
web3/securing-solidity-smart-contracts.md:79
<b>[other]mythril.sh script inside tools/mythril/ folder[/other]</b>

web3/securing-solidity-smart-contracts.md:129
<b>[other]tools/run-all.sh script, running all the scripts we want[/other]</b>

web3/securing-solidity-smart-contracts.md:147
<b>[other]tools/run-all-nohup.sh, running all the script in the background[/other]</b>
```
`[other]…[/other]` is a Medium embed placeholder. It renders on the live page as literal bold text reading `[other]mythril.sh script inside tools/mythril/ folder[/other]`. These are clearly meant to be code-block captions.

Fix — convert to real captions:
```markdown
*`tools/mythril/mythril.sh` — runs Mythril analysis on a single contract*
*`tools/run-all.sh` — runs every analysis script in sequence*
*`tools/run-all-nohup.sh` — runs the full suite in the background*
```

---

## 10. Freshness & depth

### 10a. Depth — word-count estimates

Exact word counts aren't exposed in the build output (`remarkWordCount` feeds `wordCount` into JSON-LD only, and the minified HTML puts it on an unreadable single line). Estimates below are derived from file line counts (this corpus uses one-paragraph-per-line) and structural density.

**The corpus is deep.** Most articles run 2,500–8,000 words with heavy code and diagrams: `frak-infrastructure-iac.md` (~820 lines), `pico-kiln-firmware.md` (~890), `pico-python-analysis.md` (~815), `scenario-parser/architecture.md` (~770), `frak-listener-ring-architecture.md` (~540), `mongodb-to-turso-rustfs.md` (~460). No thin-content problem at the corpus level.

Shallowest articles:

| File | Lines | Est. words | Assessment |
|---|---|---|---|
| `frak/hardhat-to-foundry.md` | 85 | **~1,000** | Thinnest on the site. Focused and fine as a "why we switched" piece, but 2 of its 4 assets are screenshots and it promises a follow-up that never shipped (F10.3). |
| `web3/erc-2612-part-1.md` | 101 | ~1,600 | Adequate prose, **zero code** (F10.1). |
| `web3/erc-2612-part-2.md` | 112 | **~1,200** | **Effectively much thinner than it looks** — 9 of its "sections" are PNG screenshots of Solidity. Indexable technical content is minimal. |
| `frak/4337-webauthn.md` | 117 | ~1,450 | 5 screenshots, zero code blocks. |
| `frak/polygon-account-abstraction.md` | 132 | ~1,900 | Word count fine, but it's ~80% marketing bullets (F10.2). |
| `web3/erc-2612-part-3.md` | 151 | ~1,450 | 9 code screenshots, zero code blocks. |
| `web3/securing-solidity-smart-contracts.md` | 168 | ~1,150 | ~50 lines are shell code blocks (good — this one *does* use fences). |
| `frak/webauthn-release.md` | 169 | ~1,600 | 4 screenshots, zero code. |

### 10b. **F10.1 — The ERC-2612 series has ZERO fenced code blocks. Impact: High.**

Verified — grep for `^```` across `src/content/articles/web3/` returns matches **only** in `securing-solidity-smart-contracts.md` (lines 53, 78, 108, 128, 135, 146). Parts 1, 2, and 3 have **none**.

Instead, all 18 code exhibits are PNG screenshots:
```markdown
web3/erc-2612-part-2.md:40   ![EIP712 domain type hash](./assets/erc-2612-part-2/eip712-domain-typehash.png)
web3/erc-2612-part-2.md:48   ![Contract variable that hold the domain separator](…/domain-separator-variable.png)
web3/erc-2612-part-2.md:52   ![EIP712 Domain separator creation](…/domain-separator-creation.png)
web3/erc-2612-part-2.md:56   ![Small helper to retrieve the chainId](…/chainid-helper-function.png)
web3/erc-2612-part-2.md:62   ![Permit typehash](…/permit-typehash.png)![Contract variable that hold user nonces](…/user-nonces-variable.png)
web3/erc-2612-part-2.md:66   ![Permit function in the ERC20](…/permit-function-implementation.png)
web3/erc-2612-part-2.md:74   ![Creation of typed message hash](…/typed-message-hash-creation.png)
web3/erc-2612-part-3.md:56,62,68,76,88,94,100,106   (8 more)
web3/erc-2612-part-1.md:57   ![Permit signature format, following the ERC-2612](…/permit-signature-format.png)
```

Why this matters more than usual: these articles target **implementation** queries — `permit typehash`, `DOMAIN_SEPARATOR solidity`, `toTypedMessageHash`, `vm.sign forge permit`, `ecrecover zero address`. Every one of those literal strings a developer would search for exists **only inside a PNG**. The page cannot rank for its own subject matter. It's also unusable for copy-paste and inaccessible to screen readers.

This is the single biggest content-quality gap in the corpus. Fix: transcribe the 18 screenshots into fenced ```solidity / ```typescript blocks. The source is public and already linked from the articles — e.g. `erc-2612-part-2.md:50` links `https://github.com/frak-id/frak-id-blockchain/blob/68f6ffcea83b5333839cc0daec11bdcedac3fe33/contracts/utils/EIP712Base.sol#L53`. Keep the screenshots as supplementary if desired, but the text must exist.

Note the site already renders code beautifully elsewhere (Shiki via `astro.config.mjs:130`, plus Mermaid via `rehypeMermaid`) — `pico-kiln-firmware.md` and `frak-hetzner-platform.md` are full of proper fenced blocks. The ERC-2612 series is the outlier because it was imported from Medium, where screenshots were the only option.

### 10c. Pre-2024 articles — 6, all needing a refresh

| File | Date | Age | Issue |
|---|---|---|---|
| `web3/securing-solidity-smart-contracts.md` | **2022-10-08** | ~4 yrs | Tooling is stale (Manticore is effectively unmaintained since 2024); 3 `[other]` artifacts (F9.4); Medium CTA (F9.3) |
| `frak/hardhat-to-foundry.md` | **2023-01-10** | ~3.7 yrs | Thinnest article (F10.4); Medium CTA; unfulfilled promise (F10.3) |
| `web3/erc-2612-part-1.md` | **2023-03-13** | ~3.5 yrs | No code (F10.1); Medium-linked series (F9.2); dead "Part 4" promise |
| `web3/erc-2612-part-2.md` | **2023-03-23** | ~3.5 yrs | No code; Medium-linked ×2; **says Part 3 is "coming soon"** though it shipped (F10.3) |
| `web3/erc-2612-part-3.md` | **2023-04-14** | ~3.4 yrs | No code; Medium-linked ×4; dead "Part 4" promise |
| `frak/polygon-account-abstraction.md` | **2023-12-13** | ~2.8 yrs | Stale event framing + contradicted by later articles (F10.2) |

Everything from 2024 onward is current. The corpus is in good shape; the problem is concentrated in exactly these 6 legacy Medium imports.

### 10d. **F10.2 — `polygon-account-abstraction.md` is stale on two axes. Impact: Medium.**

**(a) Present tense about a long-past event.** The whole of section 5 is written as forward-looking:
```markdown
polygon-account-abstraction.md:109  ## 5. Frak at "Village BUIDL on Polygon #1": Showcasing Innovation
polygon-account-abstraction.md:111  As we prepare for the "Village BUIDL on Polygon #1" competition, our journey with Account Abstraction (AA) and the collaborations with ZeroDev and Pimlico take center stage.
polygon-account-abstraction.md:119  As we step into the "Village BUIDL on Polygon #1" competition, we're not just showcasing our technological advancements…
```
A December-2023 hackathon, described in the present tense, ~2.8 years later.

**(b) Contradicted by a newer article.** This post is the site's Polygon anchor, but `frak/cost-effective-infra.md:10` states Frak runs *"on-chain reward distribution on **Arbitrum**"*. There is no article explaining the Polygon→Arbitrum move, so the two articles simply disagree.

Fix — add a dated update note immediately after the intro (`polygon-account-abstraction.md:36`, before `## 1.`), matching the pattern already used successfully at `atelier-slack-mcp.md:239` and `pico-kiln-firmware.md:891`:
```markdown
> **Update (2026):** This post documents our December 2023 move to ERC-4337 on Polygon,
> written ahead of the "Village BUIDL on Polygon #1" hackathon. The account-abstraction
> architecture described here still holds, but our production reward distribution has
> since moved to Arbitrum — see [cost-effective blockchain infrastructure with eRPC and
> Ponder](/articles/frak/cost-effective-infra/). For where the modular smart-wallet
> ecosystem landed, see [the uncomfortable truth about ERC-7579](/articles/opinion/erc7579-uncomfortable-truth/).
```
Also: this article is unusually emoji-dense for the corpus (`🚀`, `🌟👥`, `🌟🔗🌍`, `📈`) and reads as press-release copy rather than engineering writing. If you refresh it, that's the thing to fix.

### 10e. **F10.3 — Three articles promise follow-ups that never shipped; one declares a shipped article "coming soon". Impact: Medium.**

```markdown
web3/erc-2612-part-1.md:36
*   Part 4: Implementation with Ether.js and Fireblocks

web3/erc-2612-part-2.md:29-30
3.  Part 3: Unit testing with Hardhat or Forge (coming soon)     ← SHIPPED 2023-04-14
4.  Part 4: Implementation with Ether.js and Fireblocks (coming soon)

web3/erc-2612-part-3.md:29
*   Part 4: Implementation with Ether.js and Fireblocks (coming soon)

web3/erc-2612-part-3.md:150
But we're not done yet! The final article in this series will cover the implementation of
ERC-2612 using Ether.js and Fireblocks…

frak/hardhat-to-foundry.md:74
Stay tuned for another article where I will explain how we set up Foundry in our existing
Hardhat project and how we set up base unit tests for our upgradeable contract!
```

`erc-2612-part-2.md:29` is the worst: it tells readers Part 3 is unavailable while Part 3 exists on the same site. Fix that line immediately:
```markdown
3.  [Part 3: Unit testing with Hardhat or Forge](/articles/web3/erc-2612-part-3/)
```
For the Part 4 references — either write it, or replace the dead promise with a pointer to what does exist:
```markdown
# replace the "Part 4 (coming soon)" bullet in all three files with:
*   Part 4 was never published. For the tooling side, see
    [free Solidity security tooling before an audit](/articles/web3/securing-solidity-smart-contracts/)
    and [our full migration from Hardhat to Foundry](/articles/frak/hardhat-to-foundry/).
```
And for `hardhat-to-foundry.md:74`, drop the promise and link forward to `erc-2612-part-3` (which *is* the Foundry-tests-in-practice article this sentence describes) — a link that already exists at `:24` and just needs re-anchoring here.

### 10f. **F10.4 — `hardhat-to-foundry.md` under-uses its own best evidence. Impact: Low.**

~1,000 words, and the two most valuable facts are locked in screenshots:
```markdown
hardhat-to-foundry.md:42
![Hardhat test run (13sec)](…/hardhat-test-benchmark-13sec.png)![Forge test run (102ms)](…/forge-test-benchmark-102ms.png)
```
The numbers *are* in the body prose (`:44` — *"Hardhat took **13 seconds** … Forge only took **102 milliseconds**"*), so this isn't as bad as F10.1. But a comparison table would earn a featured snippet:
```markdown
| | Hardhat | Forge |
|---|---|---|
| Full suite | 13 s | 102 ms |
| Treasury-drain test | ~9 s | included above |
| Fuzz runs | not supported | 256 |
| Language | JavaScript + Mocha | Solidity |
| Setup time to migrate | — | ~1 week |
```

---

## Consolidated fix list, ordered by value

| Priority | Fix | Files | Effort |
|---|---|---|---|
| 1 | Convert 8 relative `./slug` links to absolute `/articles/…/` (**F5.1** — 8 live 404s) | 2 | 10 min |
| 2 | Fix the wrong `mediumUrl` (**F9.1**) | 1 | 1 min |
| 3 | Repoint 8 Medium series links to internal equivalents (**F9.2**) | 3 | 15 min |
| 4 | Fix 3 broken fragment anchors (**F5.2**) | 3 | 5 min |
| 5 | Fix `erc-2612-part-2.md:29` "Part 3 coming soon" (**F10.3**) | 1 | 1 min |
| 6 | Rewrite 4 subtitle-clone descriptions + the "7-stage" error + "a Elysia.js" (**F2.1–F2.6**) | 6 | 30 min |
| 7 | Link the 2 orphans (**F5.2b**) | 2 | 10 min |
| 8 | Replace 26 junk alt texts (**§4a**) | 12 | 45 min |
| 9 | Delete Medium CTAs + `[other]` artifacts (**F9.3, F9.4**) | 7 | 20 min |
| 10 | Fix `category: "electronics"` on the PDF article + kiln/frontend misfiles (**F7.1, F7.3, F7.4**) | 4 | 5 min |
| 11 | Normalise tag casing + remove duplicate `IoT` (**F8.1, F8.2**) | 7 | 15 min |
| 12 | Remove the 3 duplicate H2s + fix 2 heading-level inversions (**§3b, §3c**) | 5 | 10 min |
| 13 | Resolve the folder/`group`/`category` divergence and the 3 × 404 segments (**F7.5**) | many + `articleGroups.ts` | design decision needed |
| 14 | Transcribe 18 ERC-2612 code screenshots into fenced blocks (**F10.1**) | 3 | several hours |
| 15 | Date-stamp + reframe `polygon-account-abstraction.md` (**F10.2**) | 1 | 20 min |

Items 1–5 are pure defect repair with no editorial judgement required and should ship first. Item 13 needs a call from you on whether `group` follows the folders or the folders follow `group`. Item 14 is the highest-value content investment but also the most expensive.

---

## What's already right (brief, for the record)

- **Title lengths: flawless.** 43/43 within 32–59 chars, no truncation risk, no duplicates, no brand-suffix bloat (`BaseHead.astro:100` emits the bare title).
- **No double-H1 anywhere.** The layout owns the single H1 (`ArticleLayout.astro:313`) and no markdown body opens with `#`.
- **Outbound internal linking is strong.** 43/43 articles link to at least one sibling, ~120 internal links, with genuinely contextual anchor text (`"shrinking that iframe by 30%"`, `"deleting 8,702 lines of code to move L'Atelier to Kubernetes"`) rather than "click here".
- **Self-canonical is correct** and `mediumUrl` is correctly *not* wired to `rel=canonical`.
- **The CI/Docker cluster is a model of anti-cannibalization** — the four articles explicitly negotiate their boundaries in prose.
- **The cooking-bot series is a complete internal-link mesh.**
- **Descriptions are present on all 43** and 32 of them land in the 138–160 sweet spot.
- **Heading hierarchy is clean** — only 2 inversions across ~700 headings, and zero `##→####` skips.
```