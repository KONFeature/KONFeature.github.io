# SEO fixes — non-frak / non-web3 article dirs

**Scope:** `scenario-parser/`, `side-projects/`, `cooking-bot/`, `mobile/`, `kiln/`, `opinion/`, `devops/`
**Files changed:** 18 · **Diff:** +36 / −42 lines
**Not touched:** `frak/`, `web3/` (owned by the concurrent agent — verified zero overlap via `git status`)

No build was run (per instruction). All verification was done against source with parsed/derived checks.

---

## Verification summary

| Check | Result |
|---|---|
| Non-image relative `](./…)` links remaining | **0** |
| `/articles/…` links missing trailing slash | **0** |
| Dead `](#)` links | **0** |
| `[IMAGE:` / `[DIAGRAM:` / `SCREENSHOT:` placeholders | **0** |
| `![hero image]` alts in scope | **0** |
| Duplicate tags in scope | **0** |
| Internal article links resolving to a real file | **83 / 83** |
| Anchor target ids confirmed present in `architecture.md` | **2 / 2** |
| Frontmatter required-key validation | **0 problems** |
| Real `<h1>` in any body (code fences stripped) | **0** |
| Titles > 60 chars / descriptions > 165 chars in scope | **0 / 0** |
| Heading-level skips in the 3 edited cooking-bot files | **0** |

---

## A. Broken relative links (live 404s) — DONE

`mobile/tauri-recovery-hint-uninstall-survival.md` lines 25, 41
`./native-webauthn-tauri-plugin-ios-android` → `/articles/mobile/native-webauthn-tauri-plugin-ios-android/`

Swept the whole allowlist for other non-image `](./` links: **none found**. `./assets/…` image paths left untouched as instructed.

## B. Broken fragment anchors — DONE

Derived the slugs from `architecture.md` headings with github-slugger rules and confirmed both resolve:

- `## STAGE 2: Parallel Parsing (4 Competing Strategies)` → `stage-2-parallel-parsing-4-competing-strategies`
- `## Quality Scoring Algorithm` → `quality-scoring-algorithm`

| File | Was | Now |
|---|---|---|
| `scenario-parser-extraction.md:63` | `…/architecture/#stage-2-parsing` | `…/architecture/#stage-2-parallel-parsing-4-competing-strategies` |
| `scenario-parser-pipeline.md:26` | `…/architecture#stage-2-parsing` | `…/architecture/#stage-2-parallel-parsing-4-competing-strategies` |
| `scenario-parser-psychology.md:28` | `…/architecture#quality-selection-algorithm` | `…/architecture/#quality-scoring-algorithm` |

## C. Trailing slashes — DONE (11 links)

All 11 listed links fixed, then swept the allowlist for stragglers (none left):

`scenario-parser-extraction.md` ×2 · `scenario-parser-pipeline.md` ×2 (incl. the anchor one) · `scenario-parser-psychology.md` ×4 · `atelier-slack-mcp.md` ×1 · `erc7579-uncomfortable-truth.md` ×1 · `tauri-recovery-hint-uninstall-survival.md` ×2

Two of these (`erc7579-uncomfortable-truth.md`, `tauri-recovery-hint-uninstall-survival.md`) point into `frak/`. I only changed the **href string in my own file** — no `frak/` file was opened or written.

## D. Orphan fix — DONE

`side-projects/atelier-prebuilds.md` (newest article, 0 inbound) now has 2 inbound links. Copied the existing update-pointer pattern from `atelier-slack-mcp.md:239` (`Update: since this article, …`), appended after the closing paragraph and before `## Links` in both hosts:

- `atelier-kubernetes-migration.md` — "Update: since this article, the prebuild system got its own rewrite. It now bakes [content-addressed snapshots straight from any git repo](…)."
- `atelier-supporting-infrastructure.md` — "Update: since this article, L'Atelier v3 made prebuilds content-addressed, [baking any git repo into a boot-ready snapshot](…)."

Both claims verified against the prebuilds body (`## Content-Addressed Prebuilds`, content-key at :71).

## E. Series cross-linking — DONE

| File | Gap closed | How |
|---|---|---|
| `kiln/kiln-hardware.md` | → Part 5 | One line after "Time to add the brains." |
| `kiln/pico-kiln-app.md` | → Part 1 | Clause in the opening paragraph (1977 kiln, 380V→220V — both verified in Part 1) |
| `kiln/pico-kiln-app.md` | → Part 4 | **Fixed a genuinely dead link** — the article ended with `[Part 4: …](#)`, a literal placeholder href. Now points at `/articles/kiln/pico-python-analysis/`. This was not in the audit. |
| `kiln/pico-python-analysis.md` | → Part 3 | Appended to the existing closing paragraph |
| `scenario-parser/scenario-parser-extraction.md` | → psychology | Extended the existing "next article" sentence rather than adding a block |

Kiln series is now fully meshed (20/20 directed pairs).

## F. Factual contradiction — DONE

`cooking-bot/ingestion.md:10`. Was "7-stage"; body says 9-stage at `:31` (`## Our Solution: The 9-Stage Intelligent Pipeline`) and `:360` (`## Stage 9:`), and `runtime.md:196` calls it 9-stage.

New description (**162 chars**):
> How a 9-stage pipeline processes 35,000+ recipes: quality-based routing, dual-path ingredient parsing, multi-layer allergen detection, and dual-vector embeddings.

Every claim verified in the body before use: `35,000+` (:17, :484, :511, :527), "Intelligent Quality-Based Routing" (:496), "Dual-Path Ingredient Processing" (:114), "Multi-Layer Allergen Detection" (:191), "Dual-Vector Embedding Generation" (:305). The audit's suggested string was 170 chars (over the limit), so I rephrased the opener to land at 162.

## G. H2 duplicating the title — DONE

- `cooking-bot/runtime.md:15` — deleted `## Real-Time AI Conversations and Audio Processing`
- `cooking-bot/ingestion.md:15` — deleted `## The Sophisticated Recipe Processing Pipeline`
- `cooking-bot/introduction.md:15` — replaced `## Building a Safety-First AI Cooking Assistant` with **`## Why Food AI Has No Margin for Error`**

I did **not** use the audit's suggested `## Why Allergen Detection Can't Be an LLM's Job` — that heading describes an argument the section doesn't actually make. The paragraph beneath is a lede about there being "no room for error … a single mistake in allergen detection could have serious consequences", so the heading I used describes what is actually there.

Confirmed no orphaned paragraphs: in all three files the following paragraph now sits directly under the H1 as a lede, and the next heading is still an H2 (no level skips introduced).

## H. Image alt text — DONE

- 4× `![hero image]` in `scenario-parser/` → descriptive alts (used the audit's suggested strings; all four describe assets that exist).
- 2× `SCREENSHOT: ` prefix stripped in `kiln/pico-python-analysis.md:28,157`; the rest of each alt was already good.
- No `captionless image` or `Generated via DALL-E` alts exist in my dirs (those are all in `frak/` and `web3/`).

## I. Duplicate tag — DONE

`kiln/pico-kiln-app.md:7` — `["Kiln", "IoT", "React", "Tauri", "IoT", "Local-First"]` → removed the second `"IoT"`. Swept all my dirs for other duplicate-tag arrays: none.

## J. Title separator — DONE

All five normalized on the no-dash form, all ≤ 60 chars:

| Part | Title | Chars |
|---|---|---|
| 1 | Pico Kiln Part 1: Converting a 380V Kiln to 220V | 48 |
| 2 | Pico Kiln Part 2: Firmware Architecture | 39 |
| 3 | Pico Kiln Part 3: From Web to Native with Tauri | 47 |
| 4 | Pico Kiln Part 4: Physics-Based PID Tuning in Python | 52 |
| 5 | Pico Kiln Part 5: Dropping to the Metal with Rust | 49 |

I did **not** take the audit's suggestion to pad Part 2 to "…Firmware Architecture on the RP2040" just to use spare SERP width. Part 2 documents the **RP2040-era MicroPython** firmware while Part 5 moves to the **RP2350**; adding a chip name I hadn't verified against the body risked stating something wrong. Left at 39 chars.

## K. Unrendered placeholders — CONFIRMED REAL, DONE (4, not 2)

The audit flagged 2 in `kiln-hardware.md`. I found **4** — two more of the same class in `pico-python-analysis.md`. All four rendered to readers as literal bold bracket text.

| File:line | Placeholder | Action |
|---|---|---|
| `kiln-hardware.md:94` | `**[IMAGE: Electrical wiring diagram showing complete power delivery chain]**` | Deleted — the `mermaid graph TB` immediately below **is** that wiring diagram (Grid → 40A breaker → derivation box → elements) |
| `pico-python-analysis.md:245` | `**[DIAGRAM: Mermaid flowchart showing thermal model fitting pipeline]**` | Deleted — the `mermaid graph TD` immediately below is exactly that flowchart |
| `pico-python-analysis.md:382` | `**[DIAGRAM: Comparison of step responses for Z-N, Cohen-Coon, and AMIGO]**` | Deleted — the `mermaid graph LR` immediately below compares those three methods |
| `kiln-hardware.md:27` | `**[IMAGE: Original 3-phase wiring diagram with star configuration]**` | Deleted — no such asset was ever produced (`kiln/assets/` contains only the two `pico-python-analysis` plots), and the `### The Math Behind the Conversion` section below explains the star configuration in prose + LaTeX |

Three of the four were redundant with an adjacent rendered diagram. The fourth referenced an asset that does not exist. No content was invented to replace any of them.

---

## Extra fix beyond A–K (flagging explicitly)

**`side-projects/atelier-prebuilds.md:10` — description was 168 chars** (audit finding F2.7, over the 165 truncation limit). It is in my allowlist but was not in my A–K list, so I am calling it out rather than burying it.

Trimmed `git credential hygiene` → `credential hygiene` — **164 chars**, all four claims still verified in the body (content-key :71, torn snapshot :110, credential hygiene :156, copy-on-write clone :170).

I did **not** use the audit's suggested replacement, which ended "…and three filesystem bugs." Per the subtitle the three bugs are filesystem, git credentials, and the author's own assumptions — calling all three "filesystem bugs" would have been inaccurate.

---

## Deliberately skipped

| Item | Why |
|---|---|
| `cooking-bot/runtime.md` + `ingestion.md` bold-wrapped headings (`### **Foo**`) | Audit §3d itself rates this cosmetic and "no fix required". Touching ~30 headings would change TOC text and bloat the diff for zero ranking effect. |
| `frak/` and `web3/` link *targets* referenced from my files | Only the href strings in my own files were edited. No file outside the allowlist was opened for writing. |
| `bun run build` / `astro check` | Explicitly prohibited (concurrent builds clobber `dist/`). All verification done on source. |
| Padding Part 2's title with a chip name | See J — unverified technical claim, declined. |
| Rewriting the `cooking-bot` titles/descriptions per audit F1.2 | Out of my task scope (A–K); those are title-strategy changes, not defect fixes. Left for the parent to decide. |

---

## Residual risks

1. **Anchor slugs were derived, not build-verified.** I reproduced github-slugger's rules (lowercase, strip non-word chars, spaces→dashes) and matched the parent's independently-confirmed values, but I could not run a build. Worth a one-line confirm in the parent's final build.
2. **Three `side-projects` / `kiln` prose insertions add outbound links to existing closing sections.** They read in-voice to me, but they are new sentences — worth a skim.
3. **`introduction.md` heading is my wording**, not the audit's. If the parent prefers a different framing it is a one-line change.
