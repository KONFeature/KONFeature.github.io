# Design direction

This document is the contract for every visual change in this repository. Read it before
touching any component. If a change conflicts with this document, the document wins.

## Design read

Redesign, overhaul mode: a working engineer's site for technical peers, hiring
partners, and prospective clients. The language is **instrument**: measured, dense,
legible, monochrome, with a single accent reserved for measured facts. It leans on
Astro + Tailwind v4 semantic CSS variables, self-hosted Archivo and IBM Plex Mono, and
restrained motion.

Dials: `DESIGN_VARIANCE 8`, `MOTION_INTENSITY 4`, `VISUAL_DENSITY 5`.

## Positioning

The site used to sell a Web3 and account abstraction specialist. The body of work is
broader: 43 articles spanning Kubernetes platforms, Rust firmware on an RP2350, AI agent
sandboxes, mobile passkeys, Shopify and WordPress integrations, and smart contracts.

The positioning is now: one engineer who takes production systems end to end, across
substrates. Account abstraction is a proof point, not the label. Breadth is evidence of
depth, so the range of substrates is shown, never apologised for.

## Colour

Semantic tokens only. Never write a raw hex value or a Tailwind palette colour
(`text-gray-500`, `bg-white`, `text-green-400`) in a component. Use the token utilities,
which already resolve for both themes.

| Utility | Meaning |
| --- | --- |
| `bg-paper` | page background |
| `bg-surface` | raised block, quoted panel, code block |
| `text-ink` | primary text, headings |
| `text-ink-2` | body text, descriptions |
| `text-ink-3` | metadata, timestamps, captions |
| `border-rule` | every hairline and border |
| `text-signal` / `bg-signal` | the single accent |

**The accent rule.** `signal` marks measured facts and interactive state, nothing else. A
number that came from a real system (`-85%`, `100k+`, `1222°C`, `#2`) may carry it. The
current nav item, the focus ring, and the active filter carry it. Decoration never
carries it. Do not put it on every hover. If the accent appears more than roughly six
times on a screen, it has stopped meaning anything.

Both themes ship. Every token pair is verified at WCAG AA or better for its use, so
`text-ink-3` is the floor for small text, and nothing lighter is allowed for body copy.

Contrast is measured against **both** backgrounds a token can sit on, paper and surface,
because record rows swap one for the other on hover. Measuring against paper alone is how
the light accent and `text-ink-3` first shipped at 4.12:1 and 4.44:1 on surface.

## Type

Two families, both self-hosted, no third family.

- **Archivo Variable** (`font-sans`): everything. UI, headlines, article body. Display
  sizes use tight tracking and a heavier weight, body uses 400.
- **IBM Plex Mono** (`font-mono`): measurements, code, versions, dates in tabular
  contexts. Mono means "this is data". It is not a decorative label font.

Scale is set in `global.css`. Article prose runs at `text-md` (17px) on a `max-w-measure`
(40rem) column with generous leading. Index and landing pages use `max-w-page` (74rem).

Heading sizes are uniform on purpose, with exactly one exception. Every page `h1` is
`text-3xl md:text-4xl`. The landing hero is a step larger at `text-4xl md:text-5xl`,
because it is the single display moment on the site. That size caps the headline at about
40 characters, so the copy is cut to fit the type rather than the type shrunk to fit the
copy.

Prohibited typographic moves, all of which the old site used:
- ALL CAPS tracked-out eyebrow labels above section headings. Use size and weight instead.
- `→` or any arrow glued to link or button text.
- Middle dots chaining more than two pieces of metadata.
- Em dashes and en dashes anywhere in visible copy. Use a hyphen, comma, or full stop.
- Accenting a single word of a headline in a different colour or family.

## Shape and structure

One radius scale, effectively sharp: 2px on everything interactive or contained. No
`rounded-lg`, no `rounded-xl`, no pill buttons. The radius tokens are already remapped, so
prefer `rounded-sm` and be explicit.

Cards are used only where elevation carries real hierarchy. Grouping is done with space
and a single hairline, not with a box around everything. No drop shadows: separation comes
from `border-rule` and `bg-surface`.

Structural devices must encode information. Numbering is allowed only for genuine
sequences. A date column next to a title is information; a decorative status dot is not.

## Layout

- `max-w-measure` (40rem): article prose only.
- `max-w-page` (74rem): landing, archive, projects, about.
- Pages are left-aligned. Centred stacks are reserved for the single contact block.
- Section layout families do not repeat: the landing page uses an asymmetric hero, a
  dated list, a metric grid, and an inline link cluster, each once.
- Every multi-column layout declares its single-column fallback under `md`.

## Motion

One orchestrated moment on the landing hero: the measured readout resolves once on load.
Everything else is state feedback only (hover, focus, open, close) at 150ms. No
scroll-reveal on sections, no infinite loops, no parallax. All motion sits behind
`@media (prefers-reduced-motion: no-preference)`.

## Copy

Plain, active, specific. One label per intent: contact is always "Book a call", never
also "Get in touch" or "Reach out". Describe what a thing does rather than selling it.
Numbers appear with their source, and unsourced numbers do not appear at all.

## Data

Shared content lives in `src/data/` and is imported, never retyped. Career history,
open-source contributions, and headline metrics each have exactly one definition.
Project summaries come from the `projects` content collection.

## Never change silently

Route slugs, anchor IDs, RSS and sitemap output, JSON-LD shape, and Pagefind data
attributes (`data-pagefind-body`). SEO migration is the main risk in this redesign.
