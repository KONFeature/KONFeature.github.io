# SEO fixes — `frak/` + `web3/` lane

**Scope:** `src/content/articles/frak/**`, `src/content/articles/web3/**`
**Files changed:** 16 (all inside allowlist). Nothing staged. No build run.

---

## Verification summary

| Check | Result |
|---|---|
| Relative `](./` non-image links remaining in lane | **0** (was 7) |
| `](/articles/x/y)` links missing trailing slash | **0** (was 6) |
| `medium.com` links in ERC-2612 bodies | **0** (was 10); `mediumUrl` frontmatter keys preserved |
| Clap / follow-me / `[other]` artifacts | **0** (was 12) |
| `captionless image` / `hero image` / `Generated via` alts | **0** (was 15) |
| Code screenshots in ERC-2612 | **0** (was 19) → 19 fenced blocks; 3 hero illustrations kept |
| Code fences balanced (all 19 lane files) | even in every file |
| Frontmatter parses, required keys present | pass |
| Titles > 60 chars | 0 |
| Descriptions outside 120–165 | 0 |

---

## A. Broken relative links (verified live 404s)

`frak/mongodb-to-turso-rustfs.md` — **7 links across 6 lines** (task brief listed 6; line 58 was a 7th found by the follow-up grep).

| Line | Before | After |
|---|---|---|
| 58 | `./4337-webauthn` | `/articles/frak/4337-webauthn/` |
| 189 | `./frak-infrastructure-iac` | `/articles/frak/frak-infrastructure-iac/` |
| 445 | `./frak-infrastructure-iac` | `/articles/frak/frak-infrastructure-iac/` |
| 445 | `./cost-effective-infra` | `/articles/frak/cost-effective-infra/` |
| 458 | `./frak-infrastructure-iac` | `/articles/frak/frak-infrastructure-iac/` |
| 459 | `./cost-effective-infra` | `/articles/frak/cost-effective-infra/` |
| 460 | `./4337-webauthn` | `/articles/frak/4337-webauthn/` |

Also corrected the line 460 anchor text `WebAuthN Meets ERC-4337` → `WebAuthn Meets ERC-4337` (spec casing).
Image links using `./assets/` were left untouched, as instructed.

## B. Wrong `mediumUrl`

`frak/cost-effective-infra.md` — deleted the `mediumUrl` key. It pointed at the WebAuthn article's Medium URL (byte-identical to `frak/4337-webauthn.md`'s), so it was actively wrong for this article. No other frontmatter key reordered.

## C. Trailing slashes

| File | Lines |
|---|---|
| `frak/frak-wallet-ci-overhaul.md` | 19, 27, 128, 375 |
| `frak/frak-hetzner-platform.md` | 15 |
| `frak/frak-listener-ring-architecture.md` | 17 |

Follow-up grep across the whole lane returned no remaining slash-less `/articles/…` links.

## D. Orphan inbound link

`frak/frak-hetzner-platform.md:441` — appended to the existing stateful-services sentence, which already links the MongoDB→libSQL piece:

> Long-running workloads on this cluster have their own failure modes, too: [three days of chasing a Bun memory leak](/articles/devops/bun-memory-leak-kubernetes-restart/) ended with us letting the liveness probe restart the pod.

Matches the article's own framing and the target's actual conclusion. Did not edit the target file (not in allowlist).

## E. Heading promotion

`frak/cost-effective-infra.md:26` — `### The Challenge` → `## The Challenge`. It was the first heading in the body and sat below no H2.

## F. Image alt text — 15 replaced

**Hero alts (4)** — `frak-frontend-optimization.md`, `frak-infrastructure-iac.md`, `mongodb-to-turso-rustfs.md`, `wallet-devx-revolution.md`. Used the audit's suggested text; each sanity-checked against the article's own description field.

**`captionless image` (11)** — 5 in `4337-webauthn.md`, 4 in `webauthn-release.md`, 2 in `cost-effective-infra.md`. Each alt written from the surrounding prose, not from the filename alone. Example: the `paymaster-data-computing.png` alt reflects the article's point that the stage *runs before the signature is requested*, which is the whole setup for the RIP-7212 section.

**Generation-method alts (4)** — the 3 `Generated via mid journey, prompt : …` hero alts in the ERC-2612 series (these leaked the raw AI prompt into alt text) plus `frak/polygon-account-abstraction.md:18` `Generated via DALL-E`. The DALL-E one was not in the task's explicit file list but is the same defect class, is in my allowlist, and the audit calls it "the worst of the four" — fixed under task F.

**Also fixed:** `frak/hardhat-to-foundry.md:42` had two images concatenated on one line with no separator; split onto separate lines. Their alt text (`Hardhat test run (13sec)` / `Forge test run (102ms)`) was already good and was left alone.

## G. Medium import cruft — 7 files

| File | Removed |
|---|---|
| `frak/4337-webauthn.md` | "please give us a clap and share this article" closing paragraph |
| `frak/webauthn-release.md` | "**Clap and Share**" bullet (kept the "Explore the Demo" bullet) |
| `frak/hardhat-to-foundry.md` | Medium-follow + "clap (up to 50x)" + "Thank you :)" block |
| `web3/securing-solidity-smart-contracts.md` | 3 × `<b>[other]…[/other]</b>` + Medium-follow/clap block |
| `web3/erc-2612-part-1.md` | "follow me and give this article a clap" |
| `web3/erc-2612-part-2.md` | "give it a clap, share it, and follow me" + "Ready for the next adventure?" |
| `web3/erc-2612-part-3.md` | "give it a clap, share it, follow me" + "Are you ready to take the next step?" |

The three `[other]` artifacts were Medium code-block captions rendering as literal body text; converted to italic captions (e.g. *The `mythril.sh` script, inside the `tools/mythril/` folder.*) rather than deleted, since they label the code above them.

Genuine Frak links and the `@frak_defi` contact line were kept, rewritten to plain prose. Where removing a CTA left a stub, the paragraph was rewritten into a real one-sentence close that points at the next article in the series.

## H. ERC-2612 series rehab

### H1 — self-cannibalizing links: 10 → 0
Every `medium.com` link pointing at a series part that exists on-site was repointed. Part 1 ×2, Part 2 ×3, Part 3 ×5. Frontmatter `mediumUrl` keys left intact as canonical-origin pointers.

### H2 — "coming soon" lie
Part 4 (Ether.js + Fireblocks) was never written. Rather than keep promising it, **the line was dropped from all three series index blocks** and the lists now show three parts, all linked. Also removed the Part-4 promise from Part 1's intro paragraph and from the Part 2 / Part 3 conclusions. Part 3's close now states plainly that the series wraps.

One Fireblocks mention survives at `erc-2612-part-1.md:95` — it lists the Fireblocks SDK as an EIP-712 helper library, not as a forthcoming article. Correct to keep.

### H3 — code screenshots → fenced blocks

**19 of 19 replaced. Zero left needing human review.**

| # | File | Block | Lang | Status |
|---|---|---|---|---|
| 1 | part-1 | `struct Permit` | solidity | TRANSCRIBED-FROM-IMAGE |
| 2 | part-2 | `EIP712_DOMAIN_TYPEHASH` | solidity | **VERIFIED-FROM-SOURCE** |
| 3 | part-2 | `bytes32 internal domainSeperator;` | solidity | **VERIFIED-FROM-SOURCE** |
| 4 | part-2 | `_setDomainSeperator()` | solidity | **VERIFIED-FROM-SOURCE** (linked `EIP712Base.sol#L53`) |
| 5 | part-2 | `getChainId()` | solidity | **VERIFIED-FROM-SOURCE** |
| 6 | part-2 | `PERMIT_TYPEHASH` + `nonces` mapping | solidity | **VERIFIED-FROM-SOURCE** |
| 7 | part-2 | `permit()` | solidity | TRANSCRIBED-FROM-IMAGE (see note) |
| 8 | part-2 | `toTypedMessageHash()` | solidity | **VERIFIED-FROM-SOURCE** (linked `EIP712Base.sol#L72`) |
| 9 | part-3 | Hardhat: value/nonce/deadline setup | javascript | TRANSCRIBED-FROM-IMAGE |
| 10 | part-3 | Hardhat: domainData + types + value | javascript | TRANSCRIBED-FROM-IMAGE |
| 11 | part-3 | Hardhat: sign + extract r/s/v | javascript | TRANSCRIBED-FROM-IMAGE |
| 12 | part-3 | Hardhat: permit + allowance + transferFrom | javascript | TRANSCRIBED-FROM-IMAGE |
| 13 | part-3 | Forge: privateKey/owner/cost/deadline | solidity | TRANSCRIBED-FROM-IMAGE |
| 14 | part-3 | Forge: PERMIT_TYPEHASH + typedData + digest | solidity | TRANSCRIBED-FROM-IMAGE |
| 15 | part-3 | Forge: `vm.sign` | solidity | TRANSCRIBED-FROM-IMAGE |
| 16 | part-3 | Forge: permit + assertEq + transferFrom | solidity | TRANSCRIBED-FROM-IMAGE |

(16 blocks cover the 19 images: items 6 and 14 each merge two screenshots that were adjacent/jammed, and the part-2 typehash pair was a single concatenated line.)

Sources fetched and diffed line-by-line:
- `raw.githubusercontent.com/frak-id/frak-id-blockchain/68f6ffc…/contracts/utils/EIP712Base.sol`
- `…/contracts/tokens/FrakTokenL2.sol`
- `…/contracts/utils/NativeMetaTransaction.sol` (confirmed `mapping(address => uint256) internal nonces;` at L36, matching the screenshot exactly)

**Note on block 7 (`permit()`).** The pinned source at `FrakTokenL2.sol#L124` inlines the typehash as `keccak256("Permit(address owner,…)")`. The screenshot uses the named constant `PERMIT_TYPEHASH`. These are semantically identical, and the article defines `PERMIT_TYPEHASH` in the section immediately above, so the screenshot version is the one that reads correctly in context. I transcribed the screenshot and classified it as TRANSCRIBED-FROM-IMAGE rather than claiming source verification. Everything else in the block (assembly deadline guard, `_PERMIT_DELAYED_EXPIRED_SELECTOR`, the `unchecked` comment, `nonces[owner]++`, `InvalidSigner`, `_approve`) is byte-matched to source.

**Note on block 5 (`getChainId()`).** Transcribed from source, which includes a trailing `return id;` that the screenshot omits. Both compile identically (named return). Source chosen per the brief.

Two live typos are preserved deliberately because they are real identifiers in the shipped contract: `domainSeperator` / `getDomainSeperator()`. Silently "fixing" them would make the code not match the repo.

### H4 — descriptions
All three were verbatim subtitle copies at 71 / 91 / 104 chars. Replaced; now 146 / 147 / 148.

Numbers were verified in-body before use:
- Part 3 description cites **40ms vs 9.03ms** → body line 217.
- Part 1 and Part 2 descriptions contain no numeric claims (the audit's suggested Part-2 copy included "the five pitfalls that cost us two days" — the article has **five** pitfall subsections but says nothing about two days, so I wrote the line without that claim).

### H5 — heading
`erc-2612-part-1.md:42` `### How does ERC-2612 work?` → `## `. It is the head-term section and was sitting below two H2s.

## I. `frak/hardhat-to-foundry.md` description
Was a 122-char verbatim subtitle copy. Now 146 chars and leads with the benchmark. **13 seconds**, **102 milliseconds** and **256** fuzz runs all confirmed in body (lines 46, 48) before being used.

## J. `frak/webauthn-release.md` repositioning
- `title`: `Our WebAuthN Smart Wallet Demo: What We Built and Why` → **`Replacing the Paywall: Our WebAuthn Smart Wallet POC`** (52 chars). Fixes spec casing, drops the wasted leading "Our", and front-loads the paywall angle so it stops competing with `4337-webauthn.md` for "webauthn smart wallet".
- `subtitle`: was `""` → a real subtitle (the audit flagged empty subtitles as wasted H1-adjacent real estate).
- `description`: rewritten to describe what the article actually contains (SDK, newspaper site, wallet PWA, paymaster). I did **not** use the audit's suggested "what shipped, what broke, and what we cut" — the article does not contain a retrospective of what broke or was cut, so that copy would have over-promised.
- `tags`: `"WebAuthN"` → `"WebAuthn"` for corpus casing consistency.

---

## Deliberately skipped

1. **`frak/cost-effective-infra.md:221` extensionless asset.** The file `./assets/cost-effective-infra/0*MsLG-cXUT1he-wl7` has no extension and a literal `*` in its name (audit F4.2). I fixed its alt text but did **not** rename the asset: renaming requires a build to confirm Astro's image pipeline resolves it, and I was instructed not to build. Recommend the parent handle this with a verification build. Low risk to leave; it simply stays unoptimised.
2. **`heroImage` for `erc-2612-part-2` / `-part-3`** (audit 4c). Both have a good in-body hero that isn't declared in frontmatter, so they fall back to `/og-default.png`. Not in my task list; one-line frontmatter add each if the parent wants it.
3. **Other agents' files.** `mobile/tauri-recovery-hint-uninstall-survival.md` also has broken `./` relative links per the audit — out of my allowlist, untouched.
4. **`bun-memory-leak-kubernetes-restart.md`** — not edited (not in allowlist); only linked *to*, per task D.

## Residual risk

No build or link-crawl was run in this lane, per instruction. The 6 new/edited internal link targets were confirmed to exist as source files, and all follow the `/articles/<folder>/<slug>/` trailing-slash form that matches the site's canonical URLs. The parent's verification build should confirm the 16 changed files compile and that the new anchors resolve.
