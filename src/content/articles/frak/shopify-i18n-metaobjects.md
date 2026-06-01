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

A Shopify app is not one app. It is a fistful of small programs that happen to share a name, each running in a different sandbox, each rendering a few words of text to a human.

Frak's Shopify app is a good example. The merchant-facing copy for our wallet ("You've been referred!", "Share and earn!", "Earn rewards through sharing") shows up in four places that have nothing in common at runtime:

- a **referral banner** injected into the storefront theme, rendered by **Liquid**;
- a **share button** on the product page, also **Liquid**, different block;
- a **post-purchase card** on the Thank You and Order Status pages, rendered by a **Preact checkout UI extension** running in a Web Worker;
- the **merchant admin dashboard** itself, a **React Router** app embedded in an iframe in the Shopify admin.

Three of those are buyer-facing and need to follow the *storefront's* locale. One is merchant-facing and needs to follow the *admin's* locale. None of them can import a shared module, because they don't share a process: the Liquid runs on Shopify's servers, the checkout extension runs sandboxed in the buyer's browser, and the admin app runs on our Lambda. The only thing they can share is *data living in Shopify*.

This is the story of getting all of that text to come from one place, survive an app upgrade, and stay editable by the merchant in the tool they already use: Shopify's **Translate & Adapt** app. It's also a story about two GraphQL APIs that name the same query differently, a Liquid filter that emits errors when you pipe it the wrong way, and a locale code that needs a single character flipped.

## The First Design Was Metafields, and It Leaked

The first version stored the translatable strings as shop **metafields** under our `frak` namespace: `frak.post_purchase_message`, `frak.post_purchase_description`, and so on. One metafield per string. The checkout extension read them off the checkout's metafield bag and parsed them:

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

Read that comment again. The same value comes back *either as a plain string or as a JSON-encoded string depending on the surface*. That sentence is the whole problem with using a pile of loose metafields for translatable content: there's no schema, the translation tooling treats each key idiosyncratically, and you end up writing defensive parsers that guess at the shape.

The deeper problem is lifecycle. App-owned metafields (the `$app:` namespace) are tied to your app's declared definitions. Change the definition on your next deploy (rename a key, change a type) and Shopify enforces the new schema against existing values. A merchant who carefully translated their banner copy into Québécois French could watch it get reset by an app update they didn't ask for. That is exactly the kind of "the app touched my data" surprise that gets you a one-star review.

We wanted three things the metafield zoo couldn't give us at once:

1. **A real schema:** typed fields, named, described, so the data is self-documenting and the translation tooling treats it consistently.
2. **Merchant edits that survive our deploys:** the merchant owns their words, not us.
3. **One read that works from Liquid *and* from the Storefront API**, because the same strings render in both.

The answer to all three is a **metaobject**.

## Metaobject, Not Metafield: Merchant-Owned, Not App-Owned

A metaobject is a structured record with typed fields: a whole table, where a metafield is a single column bolted onto an existing resource. We define one type, `frak_i18n`, with a dozen fields, and create exactly one entry per shop (handle: `default`). A singleton.

The non-obvious decision is *ownership*. Shopify's default advice for app-managed data is to use an **app-owned** type (the reserved `$app:` prefix), so the schema is version-controlled and merchants can't break it. We went the other way (a plain, merchant-owned `frak_i18n` type), and the reason is buried in a comment that took a production incident to earn:

```ts
// apps/shopify/app/services.server/metafields.ts
/**
 * Why merchant-owned (no `$app:` prefix) despite app-owned being the
 * default for app-managed data: app-owned metaobjects are not reliably
 * accessible from Liquid theme app extensions (`shop.metaobjects['$app:…']`
 * returns empty in production stores; documented workarounds rely on the
 * fully-resolved `app--{app_id}--…` type name). Merchant-owned types
 * read cleanly via `shop.metaobjects.frak_i18n.default.<field>`.
 *
 * Resolution chain per surface:
 *   block setting → metaobject field → storefront `| t` → SDK default
 */
```

App-owned metaobjects are first-class in the Admin API but second-class in Liquid: `shop.metaobjects['$app:frak_i18n']` comes back empty on real stores, and the only workaround is hard-coding the fully-resolved `app--{numeric_app_id}--frak_i18n` type name into your theme, which you can't, because you don't know the app id at authoring time. A merchant-owned type just reads as `shop.metaobjects.frak_i18n.default.banner_referral_title`. Clean. So we traded the schema-lock guarantee of app ownership for the thing we actually needed: the data being legible from a Liquid theme.

The fields are declared once, as data, with their seed copy attached:

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
    // … banner in-app strings, share button label + fallback …
    {
        key: "post_purchase_message",
        name: "Post-purchase / Heading",
        description: "Heading on the post-purchase sharing card.",
        type: "single_line_text_field",
        defaults: {
            en: "Earn rewards through sharing",
            fr: "Gagnez des récompenses en partageant",
        },
    },
    {
        key: "post_purchase_badge_text",
        name: "Post-purchase / Badge",
        description: "Optional pill label above the heading. Leave empty to hide.",
        type: "single_line_text_field",
        defaults: {},   // no seed; merchant opts in
    },
];
```

Twelve fields, eleven of them shipping English and French defaults; the badge is intentionally seedless so it stays hidden until a merchant wants it. The `FRAK_I18N_FIELDS` array is the single source for *everything downstream*: the metaobject definition's schema, the English seed values, and the French translations. Add a field here and it propagates to the definition, the seeding, and the translation registration with no second list to forget.

When the definition is created, two capabilities do the heavy lifting:

```ts
// apps/shopify/app/services.server/metafields.ts (createFrakI18nDefinition)
{
    type: "frak_i18n",
    name: "Frak Translations",
    access: { storefront: "PUBLIC_READ" },     // readable from Liquid + Storefront API
    capabilities: {
        publishable: { enabled: true },         // entries can be ACTIVE/DRAFT
        translatable: { enabled: true },         // ← shows up in Translate & Adapt
    },
    fieldDefinitions: FRAK_I18N_FIELDS.map((f) => ({
        key: f.key, name: f.name, description: f.description, type: f.type,
    })),
}
```

`translatable: { enabled: true }` is the entire payoff. It makes the metaobject appear as its own section inside Shopify's **Translate & Adapt** app, so the merchant translates our wallet's storefront copy in the exact same screen where they translate their product titles: no Frak-specific UI, no documentation to write. `access: { storefront: "PUBLIC_READ" }` is what lets Liquid and the unauthenticated Storefront API read it at all.

## The Three-Tier Cascade

With the data in place, every storefront string resolves the same way, and the cascade is expressed directly in Liquid:

```liquid
{# extensions/theme-components/blocks/banner.liquid #}
{% assign frak_i18n = shop.metaobjects.frak_i18n.default %}
{% assign referral_title_fallback = 'banner.referral.title' | t %}
{% assign referral_title = block.settings.referral_title
   | default: frak_i18n.banner_referral_title
   | default: referral_title_fallback %}

<frak-banner
  {% if referral_title != blank %}referral-title="{{ referral_title }}"{% endif %}
  …
></frak-banner>
```

Three tiers, in priority order:

1. **`block.settings.referral_title`**: what the merchant typed directly into *this* theme block in the editor. Most specific, wins if present.
2. **`frak_i18n.banner_referral_title`**: the metaobject field, locale-resolved by Shopify automatically based on the storefront's active language. This is the Translate & Adapt layer.
3. **`'banner.referral.title' | t`**: the extension's own bundled `locales/en.default.json` / `fr.json`, the last-resort default that ships with the app.

The resolved string is handed to the `<frak-banner>` web component as an HTML attribute. The component (shipped by our SDK) owns the layout and behavior; Liquid only owns the words and the merchant's color overrides.

This looks trivial. It cost a real bug to get right, and the fix is documented inline because it's the kind of thing you'll re-introduce in six months if you don't:

```liquid
{# The `| t` filter is applied to the locale-key fallback BEFORE the `default`
   cascade; otherwise Liquid pipes the resolved value (merchant text or
   metaobject field) through `| t` and emits "Translation missing: {locale}.
   <text>". #}
```

The intuitive way to write this is to apply the translation filter at the very end: `{{ block.settings.title | default: frak_i18n.x | t }}`. That's wrong. Liquid's `| t` doesn't *conditionally* translate; it treats whatever string it receives as a translation *key*. If the merchant's literal text or the metaobject value flows into `| t`, Liquid can't find a translation for the key "You've been referred!" and helpfully renders `Translation missing: fr. You've been referred!` onto the live storefront. The fix is to resolve `'banner.referral.title' | t` into its own variable *first*, then use that resolved string as the final `| default:` rung. Operator ordering, but in a templating language where the failure mode is user-visible text instead of an exception.

## A Sync That Heals Itself and Never Clobbers an Edit

Someone has to actually create that metaobject definition and seed it, per shop, exactly once, without a migration step the merchant runs. We do it lazily, on the app's root loader, fire-and-forget:

```ts
// apps/shopify/app/routes/app.tsx (runs on every authenticated admin load)
ensureFrakI18nMetaobject(context).catch(() => {});
```

`ensureFrakI18nMetaobject` is idempotent and self-healing: it converges the shop to the correct state no matter what state it starts in, and it's safe to call on every single page view. The orchestrator is small because the work is factored out:

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

Four properties make this safe to run on a hot path:

**It reads its whole world in one query.** `readFrakI18nState` checks whether the definition exists and whether the singleton entry exists in a single round-trip, so the common case (everything already there) is one network call before the LRU cache takes over entirely:

```ts
// readFrakI18nState
`#graphql
 query ReadFrakI18nState($type: String!, $entryHandle: MetaobjectHandleInput!) {
   metaobjectDefinitionByType(type: $type) { id }
   metaobjectByHandle(handle: $entryHandle) { id }
 }`
```

**It only seeds English on first creation.** The entry-creation call is gated behind `state.entryId ?? …`, so if an entry already exists it is *never* touched. English copy is only ever written when there is no entry at all. A merchant who edits "Share and earn!" to "Share & cash in!" keeps their edit forever:

```ts
// upsertFrakI18nEntry: only invoked when state.entryId === null
const fields = FRAK_I18N_FIELDS.flatMap((f) =>
    f.defaults.en ? [{ key: f.key, value: f.defaults.en }] : []
);
```

**It seeds French per-field, and only where the merchant hasn't.** French isn't a field value; it's a *translation* registered against the entry, which means metaobjects expose one translatable resource per field (unlike a metafield, which has a single translatable `value`). So we read the existing translation state and only fill the gaps:

```ts
// syncFrakI18nFrTranslations
const missing = FRAK_I18N_FIELDS.flatMap((f) => {
    if (!f.defaults.fr) return [];
    if (state.keysWithFr.has(f.key)) return [];        // merchant already has FR → skip
    const digest = state.digestByKey.get(f.key);
    if (!digest) return [];                            // need the content digest to register
    return [{ key: f.key, value: f.defaults.fr, digest }];
});
return registerFrakI18nFrTranslations(context, entryId, missing);
```

The `digest` is non-negotiable: Shopify's `translationsRegister` mutation requires a `translatableContentDigest`, a fingerprint of the source content the translation is *for*, so it can reject a translation that was written against stale source text. We fetch the digests and the existing French values in the same query, build a set of "keys that already have French," and register defaults only for the rest.

**It caches success, not attempts.** The LRU entry is set *after* the French sync returns OK. If any step fails (a transport error, a GraphQL error, a missing digest), the cache stays empty and the next page load retries the whole convergence. A half-built metaobject never gets cached as "done." That single `if (frOk)` is the difference between "self-healing" and "permanently broken for one unlucky shop."

The GraphQL plumbing under all five of those calls is one helper, extracted precisely because the same boilerplate (await, `.json()`, check top-level `errors`, try/catch) was about to appear five times:

```ts
// apps/shopify/app/services.server/metafields.ts
async function runGraphQL<TData>(
    graphql: AuthenticatedContext["admin"]["graphql"],
    label: string, query: string, variables: Record<string, unknown>,
): Promise<TData | null> {
    try {
        const response = await graphql(query, { variables });
        const body = (await response.json()) as GraphQLBody<TData>;
        if (body.errors?.length) {
            console.error(`[frakI18n] ${label} top-level errors:`, body.errors);
            return null;
        }
        return body.data ?? null;
    } catch (error) {
        console.error(`[frakI18n] ${label} threw:`, error);
        return null;
    }
}
```

The `label` argument is the small touch that pays off in production logs: every failure says *which* step failed (`[frakI18n] entry upsert threw`, `[frakI18n] fr register top-level errors`) without a stack-trace archaeology session.

## Two APIs That Name the Same Query Differently

Here is the trap that ate an afternoon. The admin side (creating and seeding the metaobject) talks to the **Admin GraphQL API**. The post-purchase checkout extension reads it through the **Storefront API**. They are not the same API, and they do not agree on what the query is called.

On the Admin API, you look an entry up by handle with `metaobjectByHandle`:

```graphql
# Admin API (apps/shopify/app/services.server/metafields.ts)
metaobjectByHandle(handle: { type: "frak_i18n", handle: "default" }) { id }
```

On the Storefront API, the same lookup is just `metaobject`:

```graphql
# Storefront API (extensions/checkout-post-purchase/src/frakI18n.ts)
query FetchFrakI18n($type: String!, $handle: String!, $language: LanguageCode!)
  @inContext(language: $language) {
    metaobject(handle: { type: $type, handle: $handle }) {
        fields { key value }
    }
}
```

Same compound `{ type, handle }` input, different root field name. And on the Admin side specifically, the field name *changed*: on API version `2026-04` (which our app and extensions pin), the bare `metaobject(handle:)` lookup we'd used was gone, replaced by `metaobjectByHandle`. The symptom was the worst kind: not an error, but `ensureFrakI18nMetaobject` silently bailing because the "does the entry exist?" probe failed to parse, so it kept trying to recreate a definition that was already there. The fix was three characters of field name, but finding it meant realizing that "metaobject" means two different things depending on which of Shopify's GraphQL endpoints you're pointed at.

The Storefront query carries the other subtlety: `@inContext(language: $language)`. That directive is what makes localization *automatic* on the buyer side: you ask for the metaobject "in the context of" the buyer's language, and Shopify resolves the Translate & Adapt translations transparently. You never query "the French value"; you query the entry in French context and get French back. The hook that drives it is shared by both post-purchase surfaces (Thank You and Order Status), so the two render identically:

```ts
// extensions/checkout-post-purchase/src/frakI18n.ts
export function usePostPurchaseTextOverrides(
    query: StorefrontQuery, languageIsoCode: string,
): PostPurchaseTextOverrides | undefined {
    const [overrides, setOverrides] = useState<PostPurchaseTextOverrides>();
    useEffect(() => {
        let cancelled = false;
        fetchPostPurchaseTextOverrides(query, languageIsoCode)
            .then((next) => { if (!cancelled) setOverrides(next); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [query, languageIsoCode]);
    return overrides;
}
```

And there's the locale code itself, which needs exactly one character changed. `useLanguage().isoCode` from the checkout extension hands you a **BCP-47** tag, like `fr`, or `fr-CA` for a Canadian-French market. Shopify's `LanguageCode` GraphQL enum wants underscore-delimited uppercase: `FR`, `FR_CA`. The conversion is a one-liner, and it's a one-liner we got wrong the first time by forgetting that regional markets exist:

```ts
// extensions/checkout-post-purchase/src/frakI18n.ts
/**
 * Convert a BCP-47 ISO code (`fr`, `fr-CA`) to Shopify's `LanguageCode`
 * GraphQL enum (`FR`, `FR_CA`). `useLanguage().isoCode` returns BCP-47
 * with `-` separators; the GraphQL enum uses `_`.
 */
function toLanguageCode(isoCode: string): string {
    return isoCode.replace("-", "_").toUpperCase();
}
```

A merchant selling into both France and Québec exposes two markets, `fr` and `fr-CA`. Naively uppercasing without swapping the separator (`FR-CA`) is not a valid enum member, the query errors, and the post-purchase card falls back to its bundled default, so the bug is invisible to anyone testing in a single-region store and very visible to the one Canadian merchant. `replace("-", "_")` is the whole fix.

The card then resolves text with the same priority shape as the Liquid cascade, just expressed in TypeScript. Per-extension setting, then metaobject override, then bundled default:

```tsx
// extensions/checkout-post-purchase/src/PostPurchaseCard.tsx
const message     = settings.message     || textOverrides?.message     || defaults.message;
const description = settings.description || textOverrides?.description || defaults.description;
const ctaText     = settings.cta_text    || textOverrides?.ctaText     || defaults.cta;
const badgeText   = settings.badge_text  || textOverrides?.badgeText;   // no default → hides
```

## The Admin App Speaks a Fourth Dialect

Everything above is for the *buyer*. The merchant dashboard (the embedded React Router app) needs localization too, and deliberately uses a completely different mechanism, because the constraints are different: it's our React code, it ships its own bundle, and Shopify tells it the admin locale directly.

So the admin app uses `remix-i18next` with static JSON resources and reads the locale straight off the iframe URL Shopify hands it:

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
    // …
});
```

No metaobject, no Translate & Adapt, no Storefront API, just `t("optionalSetup.title")` against bundled translation files, because nothing here is merchant-editable. It's worth being explicit that this is a *different* system on purpose: trying to unify the admin UI's strings and the storefront's strings into one mechanism would have meant forcing merchant-translatable content tooling onto text the merchant never sees, or forcing build-time JSON onto text the merchant must be able to edit. Two audiences, two lifecycles, two systems.

That admin app is also where the same `frak_i18n` work shows up in product terms. The post-go-live dashboard surfaces an optional-setup card that nudges merchants to add the two storefront blocks whose copy we just spent this whole article localizing, and it refreshes itself when the merchant tabs back from the theme editor, so the checklist updates without a manual reload:

```tsx
// apps/shopify/app/components/OptionalSetup/index.tsx
export function OptionalSetup({ onboardingData }: { onboardingData: OnboardingStepData }) {
    const { t } = useTranslation();
    const refresh = useRefreshData();
    useVisibilityChange(useCallback(() => { refresh(); }, [refresh]));

    const showShareButton =
        !onboardingData.isThemeHasFrakButton && Boolean(onboardingData.firstProduct);
    const showBanner = !onboardingData.isThemeHasFrakBanner;
    if (!showShareButton && !showBanner) return null;
    // … renders share-button + banner cards, each deep-linking into the theme editor
}
```

`useVisibilityChange` is a four-line hook over `document.visibilitychange`; `useRefreshData` re-runs the React Router loaders and refetches the TanStack Query cache. Together they turn the awkward "make a change in the theme editor tab, come back, wonder why the checklist is stale" into "come back, it's already updated." The same pattern drives the newsletter share card, which builds a `?frakAction=share` deep link the merchant pastes into Klaviyo or an email campaign:

```tsx
// apps/shopify/app/components/Sharing/index.tsx
function buildShareUrl(domain: string): string {
    return `https://${domain}/?frakAction=share`;   // SDK auto-opens the share modal
}
```

All of it rendered with Shopify's Polaris **web components** (`<s-section>`, `<s-stack>`, `<s-button>`) rather than the React Polaris library, the newer primitives that work the same way in the admin app and inside the checkout extension, which is a small consistency win when you're already juggling four runtimes.

## Lessons

What I'd tell the next person wiring localization through a Shopify app's many surfaces:

- **Translatable content belongs in a metaobject, not a pile of metafields.** A schema'd, typed, single-entry metaobject is self-documenting, plays cleanly with Translate & Adapt via one `translatable` capability, and gives the buyer's locale a single thing to resolve. Loose metafields give you per-surface parsing quirks and no schema.
- **Choose ownership by who reads it, not who writes it.** App-owned metaobjects are invisible to Liquid in production. If a theme has to read your data, make the type merchant-owned and read it as `shop.metaobjects.<type>.<handle>.<field>`. You give up schema-lock; you gain a storefront that can actually see the data.
- **Make the sync idempotent and cache only on full success.** A converge-on-every-load orchestrator that seeds English once, fills French per-field where it's missing, and only marks a shop "done" after the last step succeeds is the difference between self-healing and one permanently broken store. Never cache a partial state as complete.
- **Never overwrite a merchant's edit.** Gate seeding behind "does an entry/translation already exist," not behind a version number. The merchant's words are theirs; your defaults are only for the empty slots.
- **Know which GraphQL API you're talking to.** `metaobjectByHandle` on the Admin API, `metaobject` on the Storefront API, and a field name that changed under us on the `2026-04` Admin version. The failure mode is silent, so pin your API version and read the field names per-endpoint.
- **Regional locales will find your locale bug.** BCP-47 `fr-CA` becomes the enum `FR_CA`, not `FR-CA`. Swap the separator *and* uppercase. Single-region testing will never catch it; the one Canadian merchant will.
- **Don't force one i18n system onto two audiences.** Merchant-editable storefront copy and build-time admin UI strings have different lifecycles. A metaobject for one, `remix-i18next` for the other. Resisting premature unification was the right call.

The Shopify app lives in [frak-id/wallet](https://github.com/frak-id/wallet) under `apps/shopify`: the React Router dashboard, the Liquid theme extension, the Preact checkout extension, the web pixel, and the metaobject-backed i18n that stitches their words together. The translation system is most of `app/services.server/metafields.ts` and the `frak_i18n` references scattered across the extensions; it's about 250 lines of orchestration that make four runtimes say the same thing in the buyer's language, and keep saying it after we ship.
