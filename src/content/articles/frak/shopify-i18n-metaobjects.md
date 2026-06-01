---
title: "One Translation Source for a Shopify App That Renders in Four Different Runtimes"
subtitle: "Why we moved merchant-editable text out of metafields and into a merchant-owned metaobject, how a three-tier Liquid cascade resolves it, and the self-healing sync that never overwrites a merchant's edits"
description: "How we localized Frak's Shopify app across a storefront banner, a product-page share button, and a post-purchase checkout card (three runtimes reading two different Shopify APIs) by making a single merchant-owned frak_i18n metaobject the source of truth, wired into Shopify's native Translate & Adapt."
date: 2026-05-28T10:00:00Z
draft: false
category: "engineering"
group: "frak"
tags: ["Shopify", "Internationalization", "Metaobjects", "Liquid", "GraphQL", "React Router", "Checkout Extensions"]
icon: "box"
iconColor: "text-emerald-400"
githubUrl: "https://github.com/frak-id/wallet"
---

A Shopify app isn't one program. It's several, each running in a different sandbox, each rendering a few words of text to a human. Frak's app renders the same wallet copy ("You've been referred!", "Share and earn!") in four places that share nothing at runtime:

- a **referral banner** injected into the storefront theme (**Liquid**);
- a **share button** on the product page (also **Liquid**, different block);
- a **post-purchase card** on the Thank You and Order Status pages (a **Preact** checkout UI extension in a Web Worker);
- the **merchant admin dashboard** (a **React Router** app in an iframe).

Three are buyer-facing and follow the storefront locale; one is merchant-facing and follows the admin locale. None can import a shared module, because they don't share a process: the Liquid runs on Shopify's servers, the checkout extension is sandboxed in the buyer's browser, the admin app runs on our Lambda. The only thing they can share is data living in Shopify. This is how that text comes from one place, survives an app upgrade, and stays editable by the merchant in the tool they already use: Shopify's **Translate & Adapt**.

## Metafields Leaked

v1 stored each translatable string as a shop **metafield** under our `frak` namespace. The checkout extension read them off the metafield bag and parsed each one:

```ts
// extensions/checkout-post-purchase/src/frakMetafields.ts (the old path)
/**
 * Translate & Adapt may return the same translatable text value as either
 * a plain string or a JSON-encoded string depending on the surface. Strip
 * either shape down to a non-empty string or `undefined`.
 */
function readTextValue(raw: string | number | boolean): string | undefined {
    const parsed = parseJsonValue<unknown>(raw);
    const value = typeof parsed === "string" ? parsed : String(parsed);
    return value.length > 0 ? value : undefined;
}
```

That comment is the problem: the same value comes back as a plain string or JSON-encoded depending on the surface. Loose metafields have no schema, the translation tooling treats each key idiosyncratically, and you end up writing defensive parsers.

The deeper issue is lifecycle. App-owned metafields (the `$app:` namespace) are tied to your app's declared definitions; change one on deploy and Shopify enforces the new schema against existing values, so a merchant's carefully translated copy can get reset by an update they didn't ask for.

We wanted three things at once:

1. **A real schema:** typed, named, described fields the translation tooling treats consistently.
2. **Merchant edits that survive our deploys.**
3. **One read that works from Liquid and from the Storefront API**, since the same strings render in both.

The answer to all three is a **metaobject**.

## Merchant-Owned, Not App-Owned

A metaobject is a structured record with typed fields. We define one type, `frak_i18n`, and create exactly one entry per shop (handle `default`): a singleton.

The non-obvious decision is ownership. Shopify's default advice is an **app-owned** type (the `$app:` prefix) so merchants can't break the schema. We went merchant-owned, for a reason a production incident taught us:

```ts
// apps/shopify/app/services.server/metafields.ts
/**
 * Why merchant-owned (no `$app:` prefix) despite app-owned being the
 * default for app-managed data: app-owned metaobjects are not reliably
 * accessible from Liquid theme app extensions (`shop.metaobjects['$app:…']`
 * returns empty in production stores; documented workarounds rely on the
 * fully-resolved `app--{app_id}--…` type name). Merchant-owned types
 * read cleanly via `shop.metaobjects.frak_i18n.default.<field>`.
 */
```

App-owned metaobjects are first-class in the Admin API but second-class in Liquid: `shop.metaobjects['$app:frak_i18n']` comes back empty on real stores, and the only workaround needs the fully-resolved `app--{numeric_app_id}--frak_i18n` type name, which you don't know at authoring time. A merchant-owned type just reads as `shop.metaobjects.frak_i18n.default.banner_referral_title`. We traded app ownership's schema-lock for the data being legible from a Liquid theme.

Fields are declared once, as data, with seed copy attached:

```ts
// apps/shopify/app/services.server/metafields.ts
export const FRAK_I18N_FIELDS: FrakI18nFieldDefinition[] = [
    {
        key: "banner_referral_title",
        name: "Banner / Referral title",
        description: "Referral banner heading shown to referred storefront visitors.",
        type: "single_line_text_field",
        defaults: { en: "You've been referred!", fr: "Vous avez été parrainé !" },
    },
    // … 10 more fields …
    {
        key: "post_purchase_badge_text",
        name: "Post-purchase / Badge",
        description: "Optional pill label above the heading. Leave empty to hide.",
        type: "single_line_text_field",
        defaults: {},   // no seed; merchant opts in
    },
];
```

`FRAK_I18N_FIELDS` is the single source for everything downstream: the definition's schema, the English seeds, and the French translations. Add a field here and it propagates to all three, with no second list to forget.

Two capabilities on the definition do the work:

```ts
// createFrakI18nDefinition
{
    type: "frak_i18n",
    access: { storefront: "PUBLIC_READ" },   // readable from Liquid + Storefront API
    capabilities: {
        publishable: { enabled: true },
        translatable: { enabled: true },       // ← shows up in Translate & Adapt
    },
    // …
}
```

`translatable: { enabled: true }` is the payoff: the metaobject appears as its own section in Translate & Adapt, so the merchant translates our copy in the same screen as their product titles, with no Frak-specific UI. `PUBLIC_READ` is what lets Liquid and the unauthenticated Storefront API read it at all.

## The Three-Tier Cascade

Every storefront string resolves the same way, expressed directly in Liquid:

```liquid
{# extensions/theme-components/blocks/banner.liquid #}
{% assign frak_i18n = shop.metaobjects.frak_i18n.default %}
{% assign referral_title_fallback = 'banner.referral.title' | t %}
{% assign referral_title = block.settings.referral_title
   | default: frak_i18n.banner_referral_title
   | default: referral_title_fallback %}
```

In priority order: the merchant's per-block setting, then the metaobject field (locale-resolved by Shopify from the storefront's active language), then the extension's bundled `locales/*.json` default.

The operator ordering is a real bug waiting to happen, documented inline:

```liquid
{# The `| t` filter is applied to the locale-key fallback BEFORE the `default`
   cascade; otherwise Liquid pipes the resolved value (merchant text or
   metaobject field) through `| t` and emits "Translation missing: {locale}.
   <text>". #}
```

`| t` doesn't conditionally translate; it treats whatever it receives as a translation key. Write `{{ block.settings.title | default: frak_i18n.x | t }}` and the merchant's literal text flows into `| t`, which can't find a key named "You've been referred!" and renders `Translation missing: fr. You've been referred!` on the live storefront. Resolve `'banner.referral.title' | t` into its own variable first, then use that as the final `| default:` rung.

## A Sync That Heals Itself and Never Clobbers an Edit

Something has to create and seed that metaobject per shop, exactly once, with no merchant-run migration. We do it lazily on the app's root loader, fire-and-forget:

```ts
// apps/shopify/app/routes/app.tsx (every authenticated admin load)
ensureFrakI18nMetaobject(context).catch(() => {});
```

`ensureFrakI18nMetaobject` is idempotent and safe to call on every page view:

```ts
// apps/shopify/app/services.server/metafields.ts
export async function ensureFrakI18nMetaobject(context: AuthenticatedContext): Promise<void> {
    const shop = await shopInfo(context);
    const cacheKey = shop.normalizedDomain;
    if (i18nMetaobjectSyncedShops.get(cacheKey)) return;   // 30-min LRU short-circuit

    const state = await readFrakI18nState(context);         // one round-trip
    if (!state) return;
    if (!state.definitionExists) {
        const created = await createFrakI18nDefinition(context);
        if (!created) return;
    }
    const entryId = state.entryId ?? (await upsertFrakI18nEntry(context));
    if (!entryId) return;

    const frOk = await syncFrakI18nFrTranslations(context, entryId);
    if (frOk) i18nMetaobjectSyncedShops.set(cacheKey, true);  // cache ONLY on full success
}
```

Four properties make that safe on a hot path:

**One query reads its whole world.** `readFrakI18nState` checks whether the definition and the singleton entry exist in a single round-trip, so the common case is one network call before the LRU cache takes over.

**English is seeded only on first creation.** `state.entryId ?? …` means an existing entry is never touched. A merchant who edited "Share and earn!" to "Share & cash in!" keeps that edit forever.

**French is seeded per-field, only where the merchant hasn't.** French is a *translation* registered against the entry (metaobjects expose one translatable resource per field), so we read the existing state and fill only the gaps:

```ts
// syncFrakI18nFrTranslations
const missing = FRAK_I18N_FIELDS.flatMap((f) => {
    if (!f.defaults.fr) return [];
    if (state.keysWithFr.has(f.key)) return [];        // merchant already has FR → skip
    const digest = state.digestByKey.get(f.key);
    if (!digest) return [];                            // need the content digest to register
    return [{ key: f.key, value: f.defaults.fr, digest }];
});
```

The `digest` is required: Shopify's `translationsRegister` wants a `translatableContentDigest`, a fingerprint of the source content, so it can reject a translation written against stale text. We fetch the digests and existing French values in the same query.

**It caches success, not attempts.** The LRU entry is set only after the French sync returns OK, so any failure leaves the cache empty and the next load retries the whole convergence. A half-built metaobject is never cached as done.

## Two APIs That Name the Same Query Differently

The admin side (creating and seeding) uses the **Admin GraphQL API**; the post-purchase extension reads through the **Storefront API**. They don't agree on what the lookup is called.

Admin, by handle:

```graphql
# Admin API
metaobjectByHandle(handle: { type: "frak_i18n", handle: "default" }) { id }
```

Storefront, same compound input, different root field:

```graphql
# Storefront API (extensions/checkout-post-purchase/src/frakI18n.ts)
query FetchFrakI18n($type: String!, $handle: String!, $language: LanguageCode!)
  @inContext(language: $language) {
    metaobject(handle: { type: $type, handle: $handle }) {
        fields { key value }
    }
}
```

On the Admin API the field name also changed under us: as of version `2026-04` (which we pin), the bare `metaobject(handle:)` lookup is gone, replaced by `metaobjectByHandle`. The symptom wasn't an error. The "does the entry exist?" probe failed to parse, so the sync silently kept trying to recreate a definition that was already there.

`@inContext(language: $language)` is what makes buyer-side localization automatic: you query the entry in the buyer's language context and Shopify resolves the Translate & Adapt values transparently. You never query "the French value."

That leaves the locale code, which needs exactly one character changed. `useLanguage().isoCode` gives a BCP-47 tag (`fr`, `fr-CA`); Shopify's `LanguageCode` enum wants underscores and uppercase (`FR`, `FR_CA`):

```ts
// extensions/checkout-post-purchase/src/frakI18n.ts
function toLanguageCode(isoCode: string): string {
    return isoCode.replace("-", "_").toUpperCase();
}
```

A merchant selling into France and Québec exposes `fr` and `fr-CA`. Uppercasing without swapping the separator yields `FR-CA`, an invalid enum member; the query errors and the card silently falls back to its bundled default. Single-region testing never catches it; the one Canadian merchant does.

The card resolves text with the same priority as the Liquid cascade, in TypeScript:

```tsx
// extensions/checkout-post-purchase/src/PostPurchaseCard.tsx
const message     = settings.message     || textOverrides?.message     || defaults.message;
const description = settings.description || textOverrides?.description || defaults.description;
const ctaText     = settings.cta_text    || textOverrides?.ctaText     || defaults.cta;
const badgeText   = settings.badge_text  || textOverrides?.badgeText;   // no default → hides
```

## The Admin App Is a Separate System, on Purpose

The merchant dashboard needs localization too, and deliberately uses a different mechanism: it's our React code, it ships its own bundle, and Shopify hands it the admin locale on the iframe URL. So it uses `remix-i18next` with static JSON:

```ts
// apps/shopify/app/i18n/i18next.server.ts
const i18next = new RemixI18Next({
    detection: {
        supportedLanguages: ["en", "fr"],
        fallbackLanguage: "en",
        async findLocale(request) {
            // Shopify embeds the admin app with ?locale=fr|en
            return new URL(request.url).searchParams.get("locale");
        },
    },
});
```

No metaobject, no Translate & Adapt, no Storefront API: nothing here is merchant-editable. Forcing one i18n system onto both audiences would mean either putting merchant-translation tooling on text the merchant never sees, or build-time JSON on text the merchant must be able to edit. Two audiences, two lifecycles, two systems.

## Lessons

- **Translatable content belongs in a metaobject, not loose metafields.** One typed, single-entry metaobject is self-documenting and plugs into Translate & Adapt with a single `translatable` capability. Loose metafields give you per-surface parsing quirks and no schema.
- **Choose ownership by who reads it, not who writes it.** App-owned metaobjects are invisible to Liquid in production. If a theme has to read your data, make the type merchant-owned and read it as `shop.metaobjects.<type>.<handle>.<field>`.
- **Make the sync idempotent and cache only on full success.** Seed English once, fill French per-field where it's missing, and mark a shop done only after the last step succeeds. Never cache a partial state as complete.
- **Never overwrite a merchant's edit.** Gate seeding on "does an entry/translation already exist," not on a version number.
- **Know which GraphQL API you're on.** `metaobjectByHandle` (Admin) vs `metaobject` (Storefront), plus a field name that changed on the `2026-04` Admin version. The failure is silent, so pin your version and read the field names per-endpoint.
- **Regional locales find your locale bug.** BCP-47 `fr-CA` becomes the enum `FR_CA`, not `FR-CA`. Swap the separator and uppercase.

The app lives in [frak-id/wallet](https://github.com/frak-id/wallet) under `apps/shopify`. The translation system is most of `app/services.server/metafields.ts` plus the `frak_i18n` references across the extensions: about 250 lines that make four runtimes say the same thing in the buyer's language, and keep saying it after we ship.
