---
title: "A Bank Account for a Smart Contract: Wiring Monerium Into a Self-Custodial Wallet"
subtitle: "Why we plugged the wallet straight into a regulated e-money issuer instead of building our own rails, and how the integration actually works: browser-side OAuth2 with PKCE, an nginx proxy that defeats a broken CORS preflight, ERC-1271 address linking, delegated KYC, and a signed SEPA off-ramp"
description: "How we gave Frak's self-custodial smart-account wallet a real IBAN by integrating Monerium, a licensed e-money institution: a backend-free OAuth2 + PKCE connect flow, token refresh coalescing, an nginx CORS workaround for Tauri, ERC-1271 wallet linking with deploy-before-sign, fully delegated KYC, and a signed EURe redeem off-ramp."
date: 2026-06-01T10:00:00Z
draft: false
category: "engineering"
group: "frak"
tags: ["Monerium", "Stablecoins", "OAuth2", "PKCE", "Account Abstraction", "EURe", "Fintech"]
icon: "shield-check"
iconColor: "text-emerald-400"
githubUrl: "https://github.com/frak-id/wallet"
---

A self-custodial wallet that can't reach a bank account is a museum piece. Users can hold tokens, sign transactions, and earn rewards, but the moment they want euros in the account they actually pay rent from, the story collapses into "go to a centralized exchange, pass their KYC, withdraw, and wait."

Every off-ramp we could build ourselves starts with the same prerequisite: becoming a regulated money business. An e-money or payment license. Banking partners. A KYC vendor. SEPA access. An AML program with the staff to run it. None of that is wallet engineering, and all of it is a multi-year detour with a compliance department attached.

So we didn't build it. We plugged into [Monerium](https://monerium.com).

## Why Monerium

Monerium is a licensed **Electronic Money Institution**, regulated by the Financial Supervisory Authority of the Central Bank of Iceland since 2019, and the first EMI authorized to issue e-money on a public blockchain. It issues **EURe**, a euro e-money token that qualifies as a regulated e-money token under MiCA and is redeemable at par, one EURe for one euro (it also issues sterling and dollar siblings, GBPe and USDe, which our reward layer already lists as payout currencies).

The part that matters for a wallet is the mechanism, not the marketing. Monerium issues a **real, SEPA-reachable IBAN and binds it to a blockchain address**. Send an ordinary bank transfer to that IBAN and EURe is minted to the address. Place a redeem order and EURe is burned while a SEPA transfer leaves for any IBAN you name. The wallet address becomes a euro bank account.

That single fact buys us three things we would otherwise have to build and license:

1. **On-ramp and off-ramp for end users**, with no exchange sitting in the middle taking a cut and owning the relationship.
2. **KYC we never run.** The user verifies once, with Monerium. Our app never sees, stores, or is liable for a passport scan.
3. **Single sign-on.** "Connect with Monerium" is an OAuth2 flow, so the user's Monerium identity becomes the login that links their wallet to their IBAN.

One honest caveat up front: today this runs in **sandbox** (Arbitrum Sepolia, against `api.monerium.dev`), gated out of production behind a single flag while we finish the business and compliance side. Everything below is the real, working sandbox integration. The production switch is one environment away, not a rewrite away.

## The Whole Thing Is Client-Side

The first design decision is the one most people get wrong: there is **no backend**. The wallet talks straight to Monerium's REST API (v2) from the browser. No server holds tokens. No server places orders. It is a **public OAuth client using PKCE**, so there is no client secret anywhere in the stack, the access and refresh tokens live in the browser, and the only piece of server-side infrastructure involved does nothing but fix CORS.

We also didn't pull in `@monerium/sdk`. The REST client is about 290 lines we own, because we wanted direct control over three things the SDK would have abstracted away from us: the proxy base URL, the refresh coalescing, and the platform quirks of running inside a Tauri WebView.

The entire configuration surface is this:

```ts
// apps/wallet/app/module/monerium/utils/moneriumConfig.ts
export const moneriumConfig = {
    environment: isRunningInProd ? "production" : "sandbox",
    clientId: process.env.MONERIUM_CLIENT_ID ?? "",
    redirectUri: `${process.env.FRAK_WALLET_URL ?? "https://wallet-dev.frak.id"}/monerium/callback`,
    chain: isRunningInProd ? "arbitrum" : "arbitrumsepolia",
} as const;

export const MONERIUM_AUTH_BASE_URL = {
    production: "https://api.monerium.app/auth",
    sandbox: "https://api.monerium.dev/auth",
} as const;

export const ADDRESS_LINKING_MESSAGE =
    "I hereby declare that I am the address owner.";
```

A client id (public by design), a redirect URI, a chain, and two base URLs. The `clientId` is baked into the bundle at build time and is meant to be public; PKCE is what makes that safe.

## Connect With Monerium: OAuth2 + PKCE, by Hand

The connect flow is a textbook authorization-code grant with PKCE, written out so the moving parts are visible:

```ts
// apps/wallet/app/module/monerium/hooks/useMoneriumAuth.ts
const codeVerifier = createCodeVerifier();                     // 32 random bytes, base64url
const codeChallenge = await createCodeChallenge(codeVerifier); // SHA-256(verifier), base64url
const state = createStateNonce();                              // 16 random bytes, base64url

moneriumStore.getState().setPendingAuth(codeVerifier, state);

const searchParams = new URLSearchParams({
    client_id: moneriumConfig.clientId,
    redirect_uri: moneriumConfig.redirectUri,
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    address: walletAddress,   // rides along so Monerium's hosted flow knows the wallet
    signature: "0x",          // placeholder; real linking is a separate signed step
    chain: moneriumConfig.chain,
});

const authUrl = `${getMoneriumAuthBaseUrl()}?${searchParams.toString()}`;

if (IS_TAURI) {
    await openExternalUrl(authUrl);   // system browser on desktop and mobile
    return;
}
window.location.assign(authUrl);      // full-page redirect on web
```

Three details earn their place here:

**PKCE with S256, because the client is public.** There is no secret to prove we are who we say we are, so instead we send a SHA-256 hash of a random verifier up front (`code_challenge`) and reveal the verifier only at token-exchange time. Monerium accepts `S256` and rejects `plain`, which is the correct posture.

**The verifier and state are persisted as a pair, before the redirect.** A full-page redirect (or, on mobile, a cold relaunch when the user comes back from the system browser) destroys all in-memory state. So we stash both nonces in a persisted store keyed together:

```ts
// apps/wallet/app/module/monerium/store/moneriumStore.ts (persisted to localStorage)
/**
 * PKCE verifier and CSRF state nonce, generated together at the start of the
 * OAuth redirect and consumed when the callback returns. Stored as a pair so
 * we can never use one without validating the other.
 */
pendingCodeVerifier: string | null;
pendingState: string | null;
```

**The wallet address rides along in the authorization request.** Monerium lets you carry `address` and `chain` into the authorization URL so its hosted onboarding is pre-associated with the wallet. The `signature: "0x"` is a deliberate placeholder: we are not linking the address yet, because a real link needs an on-chain-verifiable signature that we collect after KYC. More on that below.

## The Callback, Where the Interesting Bugs Live

The redirect comes back to `/monerium/callback`, and this is where a connect flow either feels solid or feels haunted. The route is sandbox-gated and validates its own search params:

```ts
// apps/wallet/app/routes/_wallet/_protected/monerium.callback.tsx
beforeLoad: () => {
    if (isRunningInProd) {
        throw redirect({ to: "/wallet", replace: true });   // sandbox-only for now
    }
},
validateSearch: (search) => ({
    code: (search.code as string) || undefined,
    state: (search.state as string) || undefined,
    error: (search.error as string) || undefined,
}),
```

Then the CSRF check, which contains the single most counterintuitive decision in the whole integration:

```ts
// CSRF guard: the returned `state` must match what we stored before the
// redirect. On a mismatch we deliberately do NOT clear pendingAuth: a
// mismatch can be a transient race (a double callback delivery on Android),
// and clearing the verifier would turn a recoverable blip into a dead flow
// that forces the user to restart from the beginning. Leaving it in place
// lets a subsequent valid callback succeed.
if (state !== pendingState) {
    trackEvent("monerium_callback_outcome", { outcome: "csrf_mismatch" });
    recordError(new Error("Monerium OAuth state mismatch"), {
        source: "monerium_callback",
    });
    setStateMismatch(true);
    return;
}

mutate({ code, codeVerifier: pendingCodeVerifier });
```

The textbook instinct on a `state` mismatch is to scorch the earth: clear everything, treat it as an attack. On mobile that instinct is wrong. The OS can deliver the same deep link twice, and the second delivery arrives after the first has already consumed and cleared the pending auth. If we cleared on every mismatch, the legitimate first callback would race the spurious second one and lose, stranding the user. So we record it, surface a recoverable screen, and leave the verifier alone.

The exchange itself is a `useMutation`, and even the ordering of its side effects is load-bearing:

```ts
mutationFn: async ({ code, codeVerifier }) => {
    const tokens = await exchangeCodeForTokens(code, codeVerifier);
    // Pending auth is cleared in onSuccess, not here: clearing now would flip
    // the subscribed selector before react-query flags isSuccess and flash
    // the error screen for a frame during the redirect.
    moneriumStore
        .getState()
        .setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
},
onSuccess: () => {
    modalStore.getState().openModal({ id: "moneriumBankFlow" });
    navigate({ to: "/wallet", replace: true });
    moneriumStore.getState().clearPendingAuth();
},
```

On Tauri there is no web redirect at all: the OS hands the app a `frakwallet://monerium?code=...&state=...` deep link, which the deep-link router resolves to this same `/monerium/callback` route with the `code` and `state` forwarded as search params. One callback component, two delivery mechanisms.

## Tokens That Refresh Themselves

Monerium's access tokens are short-lived (about an hour), so the REST client has to refresh transparently. The trap is concurrency: near expiry, a dozen queries can fire at once, and you never want two `/auth/token` calls racing, because a refresh-token rotation would invalidate whichever one loses. The fix is single-flight coalescing onto one in-flight promise:

```ts
// apps/wallet/app/module/monerium/utils/moneriumApi.ts
const TOKEN_REFRESH_GRACE_MS = 60_000;   // refresh when under a minute of life remains
const REFRESH_MAX_ATTEMPTS = 3;
const REFRESH_BASE_DELAY_MS = 500;

let activeRefresh: Promise<void> | null = null;

export async function refreshAccessToken(): Promise<void> {
    if (activeRefresh) return activeRefresh;   // every concurrent caller awaits the same refresh
    activeRefresh = doRefreshWithBackoff().finally(() => {
        activeRefresh = null;
    });
    return activeRefresh;
}
```

`doRefreshWithBackoff` then draws a hard line between two failure classes. A `400` or `401` means the refresh token itself is dead, which is terminal: disconnect and stop. A `5xx` or a network blip is transient: back off (500ms, 1s, 2s) and retry up to three times.

```ts
// 4xx auth failure: refresh token is dead, terminal.
if (error instanceof MoneriumApiError && (error.status === 400 || error.status === 401)) {
    moneriumStore.getState().disconnect();
    throw error;
}
// Transient (5xx or network): backoff and retry.
if (attempt < REFRESH_MAX_ATTEMPTS) {
    await delay(REFRESH_BASE_DELAY_MS * 2 ** (attempt - 1));
}
```

Every authenticated request goes through one `moneriumFetch` helper that pins the API version via the `Accept` header and retries exactly once on a `401`, transparently, after forcing a refresh:

```ts
headers.set("Accept", "application/vnd.monerium.api-v2+json");
// ...
if (response.status === 401 && !hasRetried) {
    await refreshAccessToken();
    return moneriumFetch<T>(path, options, true);   // one retry, guarded by hasRetried
}
```

The `hasRetried` flag is the recursion guard: a request can trigger at most one refresh-and-retry, and errors are logged only at the outer call so a refreshed retry doesn't double-report.

## The CORS Wall

This is the integration's lost afternoon. A browser `fetch` straight to Monerium failed on the preflight, and the reason is genuinely surprising:

```nginx
# apps/wallet/nginx.conf
# Server-side proxy to the Monerium API. Bypasses Monerium's broken CORS
# preflight (their OPTIONS handler routes by the actual Accept header value,
# which browsers do not replay on preflight) by going server-to-server.
location /monerium-api/ {
    # ... CORS handling (below) ...
    proxy_pass https://${MONERIUM_API_HOST}/;
    proxy_set_header Host ${MONERIUM_API_HOST};
    proxy_set_header Accept "application/vnd.monerium.api-v2+json";
    proxy_ssl_server_name on;
    proxy_buffering off;
}
```

The v2 API keys off the `Accept: application/vnd.monerium.api-v2+json` header. But a browser's CORS preflight is an `OPTIONS` request that does **not** carry your custom `Accept` value, so Monerium's `OPTIONS` routing misfires and the preflight never returns the headers the browser needs. Going server-to-server sidesteps the preflight entirely: the browser talks **same-origin** to `/monerium-api`, and nginx (which has no CORS rules to satisfy) forwards to Monerium with the right `Accept`.

That fixes web. Tauri adds a second twist, because the WebView is cross-origin to the deployed wallet and therefore does trigger CORS. We reflect the WebView's origin with a `map`, not an `if`:

```nginx
# Observed Origin values:
#   iOS Tauri:     tauri://localhost
#   Android Tauri: http://tauri.localhost   (NOT https: the asset protocol
#                                             registers as http even though
#                                             window.location.protocol is https)
map $http_origin $cors_origin {
    "~^tauri://localhost$"         $http_origin;
    "~^https?://tauri\.localhost$" $http_origin;
    default                        "";
}
```

```nginx
# Strip Monerium's own CORS headers before reflecting ours. Monerium sends
# `Access-Control-Allow-Origin: *`; layering our reflected origin on top
# yields two ACAO headers and the browser rejects the response (surfaces in
# JS as `TypeError: Failed to fetch`). Web is same-origin so the duplicate is
# invisible there; this only bites Tauri.
proxy_hide_header Access-Control-Allow-Origin;
add_header Access-Control-Allow-Origin $cors_origin always;
add_header Vary "Origin" always;
```

Three things had to be true at once: reflect the WebView origin (because `*` and credentials don't mix), strip Monerium's wildcard first (because two `Access-Control-Allow-Origin` headers is an instant browser reject), and use a `map` rather than an `if` to dodge nginx's well-known "if is evil" footgun, where `add_header` inheritance across `if` blocks is undefined. `MONERIUM_API_HOST` is substituted at container startup via `envsubst` (`api.monerium.app` in prod, `api.monerium.dev` in sandbox), and in local dev Vite's proxy does the identical job.

## KYC We Never Run

Here is the compliance payoff in code. The wallet collects no identity data. It reads a single Monerium profile state and routes the UI off it. The whole flow is a pure function from account state to the screen that should be visible:

```ts
// apps/wallet/app/module/monerium/component/MoneriumBankFlow/index.tsx
function deriveSetupScreen(params): MoneriumFlowScreen {
    if (!params.isConnected) return "info";
    if (params.isProfileLoading) return "loading";

    const needsKyc =
        !params.profileState ||
        (isRunningInProd &&
            (params.profileState === "created" ||
                params.profileState === "pending"));
    if (needsKyc) return "kyc";

    if (params.profileState === "approved" && params.isAddressesLoading)
        return "loading";
    if (params.profileState === "approved" && !params.isWalletLinked)
        return "link";
    if (
        params.profileState === "approved" &&
        params.isWalletLinked &&
        !params.hasSeenSetupSuccess
    )
        return "success";

    return "transfer-amount";
}
```

The profile state machine (`created` then `pending` then `approved`) is driven entirely by Monerium. When the profile isn't approved, we show a screen whose only job is to bounce the user back into Monerium's hosted onboarding, and we poll `GET /profiles` every 30 seconds while the state is `pending` so the UI advances the moment Monerium approves. (In sandbox the `needsKyc` gate is relaxed so test accounts skip straight to linking, which is why the production guard is explicit in the condition.)

The regulated work, government-ID verification, proof of address, sanctions and PEP screening, lives entirely on Monerium's side. We store none of it. That is the concrete meaning of "free KYC" here: not free as in cheap, but free as in not our data and not our liability.

## Giving a Smart Contract a Bank Account

This is the conceptual heart of the whole thing. The IBAN binds to an address, and our addresses are **ERC-4337 smart accounts**, not plain EOAs. That has two consequences, and the linking hook handles both:

```ts
// apps/wallet/app/module/monerium/hooks/useMoneriumLinkWallet.ts
const deployed = await isSmartAccountDeployed(client, address);
if (!deployed) {
    await sendTransactionAsync({ to: address, value: 0n });   // force deployment
}

const signature = await signMessageAsync({ message: ADDRESS_LINKING_MESSAGE });

return await linkAddress({
    profile: profiles.profiles[0].id,
    address,
    signature,
    message: ADDRESS_LINKING_MESSAGE,   // "I hereby declare that I am the address owner."
    chain: moneriumConfig.chain,
});
```

Monerium proves you own an address by checking a signature over a fixed canonical message. For an EOA that is ordinary ECDSA recovery, done off-chain. For a smart account it is **ERC-1271**: Monerium calls `isValidSignature` on the account contract, which is an on-chain call that only resolves if **the contract actually exists on-chain**.

And a fresh Frak user's smart account frequently does not exist yet. Account abstraction lets us hand someone a usable address that is only deployed lazily, on their first real transaction. A user who has so far only received rewards may own an address whose contract has never been deployed. Ask them to ERC-1271-sign and Monerium's verification call hits empty bytecode and fails.

So the fix is the `sendTransactionAsync({ to: address, value: 0n })`: a zero-value self-send that costs nothing meaningful but forces the account to deploy. Deploy first, then sign, then `POST /addresses` succeeds. The message string is Monerium's canonical link message and has to match byte for byte; it is a constant for exactly that reason.

## Off-Ramp: Signing a SEPA Transfer

Withdrawing euros is a **redeem order**: burn EURe on-chain, send SEPA to a beneficiary IBAN. The user authorizes it by signing a per-order message, and the format is fussier than it looks:

```ts
// apps/wallet/app/module/monerium/hooks/useMoneriumOfframp.ts
// Redeems of €15,000 or more require a supportingDocumentId uploaded via
// POST /files. We haven't built that flow, so we hard-cap below the threshold.
export const MAX_REDEEM_AMOUNT_EUR = 15_000;

// Monerium expects "Send <CCY> <AMOUNT> to <IBAN> at <RFC3339>".
// The timestamp must be UTC and accurate to the minute (seconds zeroed).
const timestamp = new Date().toISOString().replace(/:\d{2}\.\d{3}Z$/, ":00Z");
const message = `Send EUR ${amount} to ${shortenIban(iban)} at ${timestamp}`;

const signature = await signMessageAsync({ message });

return await placeOrder({
    amount,
    signature,
    currency: "eur",
    address: walletAddress,
    chain: moneriumConfig.chain,
    counterpart: {
        identifier: { standard: "iban", iban },
        details: { firstName: firstName.trim(), lastName: lastName.trim() },
    },
    message,
    memo: memo?.trim() || "Frak Wallet offramp",
});
```

`placeOrder` is the one place the order `kind` is stamped, so the off-ramp call site never has to think about it:

```ts
// apps/wallet/app/module/monerium/utils/moneriumApi.ts
export async function placeOrder(order: MoneriumNewOrder): Promise<MoneriumOrder> {
    return moneriumFetch<MoneriumOrder>("/orders", {
        method: "POST",
        body: JSON.stringify({ kind: "redeem", ...order }),
    });
}
```

The gotcha is the timestamp. It has to be UTC, RFC3339, and accurate to the minute with seconds zeroed; that little regex truncates `:SS.mmmZ` to `:00Z`. Sign a message whose timestamp doesn't match the shape Monerium reconstructs and the signature is rejected. The `€15,000` cap is an honesty cap: above it Monerium requires a supporting document uploaded through `POST /files`, a flow we haven't built, so rather than ship a large-transfer path that fails at the final step we block below the threshold and will lift it when the document flow exists.

The on-ramp, notably, has **no code at all**, and that is the point. On-ramp is Monerium minting EURe when a SEPA payment lands on the user's IBAN; it needs nothing from us beyond surfacing that IBAN to the user, which is the next increment. The expensive direction, authorizing a burn and an outbound SEPA transfer from a self-custodial signature, is the one we built first.

## Orders Become History

A redeem isn't instant, so the wallet tracks it. `useMoneriumOrders` reads `GET /orders?address=...` and the order walks a small state machine (`placed`, then `pending`, then `processed` or `rejected`). Those orders are merged into the same timeline as on-chain rewards:

```ts
// apps/wallet/app/module/history/utils/historyEntry.ts
export type HistoryEntry =
    | { kind: "reward"; /* ... */ }
    | { kind: "monerium-order"; id: string; timestamp: number; order: MoneriumOrder };

export function mergeHistoryEntries(rewards, orders): HistoryEntry[] {
    // unified list, sorted by timestamp descending
}
```

One history view shows rewards earned and euros withdrawn side by side, and tapping a processed order opens its detail sheet with a link to the on-chain burn transaction on Arbiscan. The bank withdrawal and the blockchain event are, correctly, the same event seen from two sides.

## What It Unlocks

The strategic return on this is larger than the line count:

- **The wallet address is a euro account.** No exchange, no second app, no custodian between the user and their money. Receiving fiat mints tokens; spending tokens sends fiat.
- **We carry zero KYC and PII liability.** Monerium is the regulated party. The best way to handle a passport scan is to never receive one.
- **"Connect with Monerium" doubles as SSO**, so the identity that satisfies compliance is the same one that links the wallet.
- **It cost a lazy-loaded feature chunk and roughly 290 lines of REST client, not a banking license.** The entire Monerium subtree is code-split and loaded only when a user opens the bank flow.

And the next steps are visible from here. Surface the user's own IBAN for on-ramp top-ups, which is mostly UI on top of rails that already work. Then the merchant side: paying campaign rewards in EURe (or GBPe, or USDe) that a merchant withdraws to their company IBAN, which the business dashboard already lists as currency options. That is a separate post.

## Lessons

What I'd hand the next person wiring a regulated money rail into a wallet:

- **A licensed EMI with an API beats building your own rails.** The integration is days of engineering; the alternative is years of licensing. Buy the regulated parts, build the wallet parts.
- **PKCE in the browser, no secret, and persist the verifier and state as a pair.** A full-page OAuth redirect (or a mobile cold start) wipes memory; the handshake only survives if both nonces were written to storage before you left.
- **On an OAuth `state` mismatch, do not nuke the pending auth.** Mobile platforms double-deliver callbacks. Treat a mismatch as recoverable, not as a guaranteed attack, or you turn a race into a dead end.
- **Coalesce token refreshes onto one in-flight promise.** Near expiry, many requests refresh at once; without single-flight you race two token rotations and one of them loses.
- **When a vendor's CORS preflight is broken, go server-to-server.** Proxy same-origin, set the real headers server-side, reflect the right origin, and strip the vendor's wildcard so you don't emit two `Access-Control-Allow-Origin` headers.
- **A smart account must be deployed before anyone can verify its ERC-1271 signature.** Counterfactual addresses are an account-abstraction superpower right up until an off-chain partner needs to call `isValidSignature`. Deploy, then sign.
- **Delegate KYC to the licensed party and store none of it.** The cheapest compliance posture is reading a `state` field off someone else's profile.
- **Cap what you can't fully support yet.** Blocking redeems at the document threshold is more honest than shipping a large-transfer path that fails on the last call.

The integration lives in [frak-id/wallet](https://github.com/frak-id/wallet) under `apps/wallet/app/module/monerium`: a hand-rolled REST client, two persisted Zustand stores, a handful of TanStack Query hooks, a screen-driven bank flow, and an nginx config that exists almost entirely to win one argument with a CORS preflight. It turns a self-custodial smart-account wallet into something with an IBAN, and it does it without our servers ever touching a token or a passport.
