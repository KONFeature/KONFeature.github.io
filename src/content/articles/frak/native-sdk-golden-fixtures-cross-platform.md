---
title: "Two Native SDKs, One Wire Contract: Golden Fixtures Instead of Kotlin Multiplatform"
subtitle: "22,232 lines of Kotlin and 20,361 lines of Swift with nothing shared between them, pinned by committed JSON vectors"
description: "Golden JSON fixtures as a cross-platform SDK contract: why we rejected Kotlin Multiplatform, the ICU U+202F hazard, and the drift the corpus still misses."
date: 2026-08-25T10:00:00Z
draft: false
category: "mobile"
group: "frak"
tags: ["Kotlin", "Swift", "Kotlin Multiplatform", "Cross-Platform", "SwiftPM", "ICU", "Testing", "Golden Fixtures", "iOS", "Android"]
icon: "layers"
iconColor: "text-violet-400"
githubUrl: "https://github.com/frak-id/wallet"
---

We hand-wrote the same SDK twice. 22,232 lines of Kotlin, 20,361 lines of Swift, no Kotlin Multiplatform, no Rust core, no shared runtime. Two implementations of one identity format, one URL codec, one currency formatter, maintained in parallel by the same small team.

That is a decision to let the two sides drift. So the contract had to live outside both of them: committed golden JSON fixtures that TypeScript, Kotlin and Swift must all reproduce byte for byte. The vectors are the spec; the implementations are three attempts at it. Here is what that bought, what it cost, and the part of the surface it still does not cover.

## Why we rejected Kotlin Multiplatform for a third-party mobile SDK

Kotlin/Native's generated Swift is not shippable to third parties. The Obj-C bridge loses exhaustive matching, cancellation and module structure, and those are what our public surface is made of: `FrakError` and `EstimatedReward` are sealed hierarchies a merchant is expected to `switch` over. A KMP export turns them into Obj-C classes and the merchant's compiler stops helping.

The binary side is worse. Each Kotlin/Native framework embeds its own runtime, roughly 6–40 MB, against a 256 KB budget a merchant is paying for out of their own app size. Two such frameworks in one host app can collide at link time, which is the merchant's problem to debug and not something they can fix.

| | Kotlin Multiplatform | Two hand-written codebases |
|---|---|---|
| Swift API quality | Obj-C bridge: no exhaustive `switch`, no structured cancellation, no module structure | Native Swift enums, `async`, real modules |
| Added binary weight | ~6–40 MB embedded runtime per framework | Zero runtime; `FrakSDK` has no dependencies at all |
| Two frameworks in one app | can collide at link time | not applicable |
| Cross-platform guarantee | shared code | shared committed fixtures |
| Cost | one implementation | two implementations that can drift |

The precedent argued the same way. No SDK vendor ships shared-core logic to third-party consumers: RevenueCat, PostHog and Sentry all wrap two independently maintained native SDKs.

The decision record carries an explicit revisit condition, which matters more than the decision. From `docs/plans/native-sdk/decisions.md` §1.1: revisit only if the shared deterministic surface exceeds ~1,000 lines *and* a drift bug reaches production despite the fixtures, and then Rust + UniFFI, not KMP. UniFFI generates idiomatic bindings on both sides instead of exporting one language's object model into the other.

## Zero third-party runtime dependencies, and the three exceptions

Both SDKs take no third-party runtime dependencies. The accepted exceptions are `kotlinx-coroutines-core` and Compose on Android, plus `androidx-webkit` on the UI module. Everything else a mobile SDK normally reaches for was rejected, because each one is a version constraint imposed on someone else's app.

| Accepted | Rejected |
|---|---|
| `kotlinx-coroutines-core` (`api`, since `suspend`/`StateFlow` are in the public surface) | Retrofit, Moshi, Gson |
| Compose (Android UI module) | Alamofire, Room, RxJava |
| `androidx-webkit` (`:frak-sdk-ui` only) | every DI framework, every analytics framework |

Each platform ships two artifacts so a merchant taking only tracking never links a web view: `id.frak.sdk:core` / `FrakSDK` carry no UI, `id.frak.sdk:ui` / `FrakSDKUI` carry the web view and the [sharing sheet](/articles/frak/native-sdk-webview-sharing-sheet/). The dependency never runs the other way.

One piece of Maven trivia is worth knowing before a first Central upload. Gradle module names and published artifact names are deliberately different:

```kotlin
// sdk/android/buildSrc/src/main/kotlin/frak-publish.gradle.kts
// `id.frak.sdk` and not `id.frak`: the verified Central namespace is `id.frak.sdk`, and Sonatype
// grants authorization downwards only — it covers `id.frak.sdk.*`, never the parent.
group = "id.frak.sdk"

// The Gradle module name is not the published artifact name. Modules keep their `frak-sdk` names
// because the ABI gate keys its dump path off `project.name` (`api/<project.name>.api`, below),
// and renaming them would churn both committed dumps for a cosmetic win.
val artifactName: String =
    when (project.name) {
        "frak-sdk" -> "core"
        "frak-sdk-ui" -> "ui"
        else -> error("frak-publish applied to an unmapped module: ${project.name}")
    }
```

`id.frak:frak-sdk` would have been rejected at upload: Sonatype authorizes a namespace downward, so a verified `id.frak.sdk` covers `id.frak.sdk.*` and never the parent. The module names stayed because the committed `.api` dump path is derived from `project.name`. The ABI freeze those dumps enforce is [its own story](/articles/frak/native-sdk-abi-freeze-kotlin/).

## How golden JSON fixtures work as a cross-platform SDK contract

A golden fixture corpus is a set of committed, language-agnostic JSON vectors that every implementation is asserted against. No implementation is the reference. All three are pinned to the file, never to each other, so a divergence shows up as a test failure on exactly one platform instead of a production mismatch. Three corpora live in `sdk/core/src/`, outside both native projects:

| Concern | File | Entries |
|---|---|---|
| Identity — signed byte layout | `identity/fixtures/golden-proofs.json` | 6 |
| FrakContext v2 codec | `context/fixtures/golden-context.json` | 32 (11 encode, 21 reject) |
| Reward selection + currency formatting | `rewards/fixtures/golden-rewards.json` | 67 across 6 kinds |

All three share one envelope, `{ "formatVersion": 1, "fixtures": [ … ] }`. `formatVersion` bumps only when the envelope shape changes, never when a payload gains a field, and everything inside an entry is opaque to both loaders.

Four rules make the corpus worth having:

- **Generated only, never hand-edited.** A wrong-looking fixture means the generator or the frozen module is wrong.
- **Byte-deterministic.** `generate-golden-rewards.ts` pins "now" to `FIXED_NOW_MS = 1_736_899_200_000` rather than calling `Date.now()`, so regenerating with no semantic change produces a zero diff.
- **No round-trip tests.** `encode(decode(x)) == x` proves internal consistency, not conformance. A codec can be self-consistently wrong on both platforms in the same way.
- **Fail loudly, never skip.** Both loaders throw on an absent file, an invalid file, a wrong `formatVersion` or an empty `fixtures` array.

The identity corpus is the clearest case, because the thing being pinned is a fixed-width byte layout with no parser:

```typescript
// sdk/core/src/identity/canonical.ts
/**
 * Everything here is FIXED WIDTH. There are no length prefixes, no JSON and
 * no text encoding of ids. A native port is a sequence of byte copies at
 * constant offsets rather than a parser.
 *
 * Signed message, `len(op) + 72` bytes:
 *
 *   msg := op ‖ merchantId(16) ‖ anonymousId(16) ‖ binding(32) ‖ ts(8)
 *
 *   op          := ASCII bytes of the op string, no length prefix. Domain
 *                  separation: a signature for one op never verifies for
 *                  another.
 *   merchantId  := the UUID's 16 raw bytes, NOT its 36-char text form. Text
 *                  would re-introduce a case-normalisation hazard: Swift's
 *                  `UUID.uuidString` is uppercase, so two platforms could
 *                  sign different bytes for the same id.
 *   ts          := 8-byte unsigned big-endian, Unix SECONDS.
 */
```

That comment names the exact bug the corpus exists to catch. Swift's `UUID.uuidString` is uppercase and Kotlin's is lowercase, so a text-encoded id would have produced two different signed messages for one merchant, surfacing as a backend signature rejection with no way to tell which side was wrong. The fixture proves each port copies raw bytes:

```kotlin
// sdk/android/frak-sdk/src/test/kotlin/id/frak/sdk/identity/ProofCodecTest.kt
@Test
fun `builds every fixture's canonical message byte-for-byte`() {
    val covered = mutableSetOf<ProofOp>()
    for (fixture in corpus.entries) {
        val op = opOf(fixture.getString("op")) ?: continue
        covered += op
        val message =
            ProofCodec.buildMessage(
                op = op,
                merchantId = fixture.getString("merchantId"),
                anonymousId = fixture.getString("anonymousId"),
                binding = hexToBytes(fixture.getString("bindingHex")),
                ts = fixture.getLong("ts"),
            )
        assertEquals(
            fixture.getString("description"),
            fixture.getString("canonicalMsgHex"),
            message.toHex(),
        )
    }
    assertEquals("every op this SDK can mint must have a fixture", ProofOp.entries.toSet(), covered)
}
```

The last assertion is the one that keeps the corpus honest over time: every op the SDK can mint must have a fixture, so adding an op without a vector fails the build.

## Why iOS and Android currency formatting needs a codepoint array, not a string

Because the difference between a passing and a failing string can be invisible. iOS and Android emit different output for identical locale and currency input, `"CHF 10.00"` versus `"CHF10.00"`, and ICU skew diverges even within one platform family, so "just call the platform formatter and compare" is unavailable. The corpus records every expected string twice.

The separators are the trap. `fr-FR` thousands grouping is `U+00A0` or `U+202F` depending on CLDR version, the locale-aware minus is `U+2212` rather than ASCII `-`, and `U+200E`/`U+200F` directional marks appear and disappear across releases. None of those show up in a diff.

Two mitigations, applied together. First, the corpus file is pure ASCII. `JSON.stringify` will happily emit a raw `U+202F`, so the generator escapes it afterwards, and a byte-level inspection of `golden-rewards.json` finds zero bytes above 0x7F:

```typescript
// sdk/core/scripts/generate-golden-rewards.ts
/**
 * Escape every codepoint above U+007F as `\uXXXX` so the corpus is pure ASCII:
 * that keeps the invisible ICU spaces reviewable in a diff, and safe from an
 * editor that normalises whitespace.
 */
function toAsciiJson(value: unknown): string {
    return JSON.stringify(value, null, 4).replace(
        /[\u0080-\uffff]/g,
        (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`
    );
}
```

Second, every string is paired with an explicit codepoint array under the same key plus a `Codepoints` suffix:

```typescript
// sdk/core/scripts/generate-golden-rewards.ts
/** fr-FR mixes U+202F and U+00A0: one label per codepoint makes it readable. */
const codepoints = (value: string): string[] =>
    Array.from(value, (char) => {
        const code = char.codePointAt(0) ?? 0;
        return `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
    });

type FormattedExpectation = {
    /** The literal expected string. Assert on this. */
    formatted: string;
    /** The same string, one label per codepoint. Print this on failure. */
    formattedCodepoints: string[];
};
```

Which produces entries that are readable without a hex editor:

```json
{
  "name": "format-amount-eur-zero",
  "description": "formatAmount: eur/fr-FR, zero",
  "kind": "format-amount",
  "amount": 0,
  "currency": "eur",
  "locale": "fr-FR",
  "formatted": "0\u00a0\u20ac",
  "formattedCodepoints": ["U+0030", "U+00A0", "U+20AC"]
}
```

Assertion order is part of the design. Assert the codepoint array first, then the literal. A `U+202F` → `U+00A0` substitution produces a literal-only diff that reads `expected "10 €", got "10 €"`. Against codepoints it is one changed array element.

The pairing is a generator invariant with no representation in the artifact, so the walker that checks it recurses rather than listing known fields. Some pairs are nested, for example `best.minPurchaseAmount` on a `select-best-reward` entry:

```typescript
// sdk/core/src/rewards/format.test.ts
function collectCodepointPairs(node: unknown, path: string): CodepointPair[] {
    if (Array.isArray(node)) {
        return node.flatMap((item, index) =>
            collectCodepointPairs(item, `${path}[${index}]`)
        );
    }
    if (node === null || typeof node !== "object") return [];

    const record = node as Record<string, unknown>;
    return Object.entries(record).flatMap(([key, value]) => {
        const nested = collectCodepointPairs(value, `${path}.${key}`);
        const codes = record[`${key}Codepoints`];
        if (typeof value !== "string" || !Array.isArray(codes)) return nested;
        return [
            { label: `${path}.${key}`, text: value, codes: codes as string[] },
            ...nested,
        ];
    });
}

it("keeps every literal in sync with its codepoint list, corpus-wide", () => {
    const pairs = collectCodepointPairs(goldenRewards.fixtures, "fixtures");

    // Guards against the walker silently finding nothing.
    expect(pairs.length).toBeGreaterThan(40);
    for (const pair of pairs) {
        expect({ at: pair.label, codes: codepoints(pair.text) }).toEqual({
            at: pair.label,
            codes: pair.codes,
        });
    }
});
```

The `toBeGreaterThan(40)` guard exists because a walker that finds nothing passes every assertion it never made.

One environment difference is documented rather than papered over. The corpus was generated under ICU 74.2 / CLDR 44. Android below roughly API 28 ships pre-ICU-63 CLDR and emits `U+00A0` where the corpus has `U+202F`. Exactly 6 entries carry a `U+202F`, so a mismatch confined to those 6 is a runtime CLDR difference and a mismatch anywhere else is a real finding. Coverage is `fr-FR`, `en-US`, `en-GB`, all LTR, with no negative amounts and no RTL locales.

## Why the fixture loaders use JSONSerialization and org.json instead of Codable

A typed payload would make every payload change a loader change too. Only the envelope is a contract; everything inside a fixture entry is opaque and evolves with whatever concern it covers. So both loaders validate `formatVersion` and `fixtures`, then hand back untyped dictionaries.

| | Android | iOS |
|---|---|---|
| Loader | `frak-sdk/src/test/kotlin/id/frak/sdk/fixtures/GoldenFixtures.kt` | `Tests/FrakSDKTests/Fixtures/GoldenFixtures.swift` |
| Parser | `org.json` (test scope) | `JSONSerialization` |
| Test framework | JUnit 4 | Swift Testing |

`org.json` needs a real `testImplementation` dependency on Android, because the stubbed test `android.jar` ships an `org.json` whose methods all throw. Being test-scoped, it never reaches the published POM.

Neither loader can treat the corpus as a bundle or test resource, since it sits outside both projects. Both walk upward looking for `sdk/core` **and** a repo marker (`.git` or `package.json`) together, since either alone produces false matches. Both fail with a message that says how to fix it:

```swift
// sdk/ios/Tests/FrakSDKTests/Fixtures/GoldenFixtures.swift
guard FileManager.default.fileExists(atPath: url.path) else {
    throw CorpusError(
        description: """
            Golden fixture corpus missing: \(repoRelativePath)
              Looked for: \(url.path)
              Repo root resolved to: \(root.path)

            The corpus lives in sdk/core, NOT inside this Swift package, and is \
            generated — never hand-written.
            Regenerate with (from the repo root):
              bun run --cwd sdk/core fixtures:generate           # identity
              bun run --cwd sdk/core fixtures:generate:context   # codec
              bun run --cwd sdk/core fixtures:generate:rewards   # rewards

            This is a hard failure by design.
            """
    )
}
```

An empty `fixtures` array throws for the same reason: "a corpus with no entries passes every test while proving nothing." Both platforms have a test for that failure path.

## Three places the iOS SDK could not mirror Android

Three divergences are forced by platform capability rather than chosen. Pretending otherwise would have produced a worse API on one side:

| | Android | iOS |
|---|---|---|
| Identity storage | key in `AndroidKeyStore`, non-exportable | key in a backup-excluded file; Secure Enclave when available, raw scalar otherwise |
| Inbound links | `Automatic` via `ActivityLifecycleCallbacks` | `.manual` only — a library cannot observe a host's `Scene`/`AppDelegate` |
| Install carrier | Play referrer, deterministic | install code + pasteboard + `SKOverlay` |

A fourth divergence is deliberate. `ConfigApi.updates` and `ConfigApi.current` exist only on iOS. Android had them and they lied: `updates` was fed only from the network-fetch success path, so a warm start that read a valid cache never fired it. iOS's is multicast, replay-latest, deduped on equality, and fed by background revalidation. The decision record says in capitals not to "fix" this into parity, which is how you stop a parity audit from closing a divergence as a bug.

## Why the iOS identity store splits by backup requirement, not by storage suite

Because the two values have opposite restore semantics. The device key and the merchant marker must **not** survive a restore, or a restored phone resurrects an identity that Android and web would treat as new. The consent decision **must** survive, or a user who withdrew tracking silently reverts to enabled on a new device.

So the key lives in a directory whose backup exclusion is set once, on the directory, so a file added later cannot forget it:

```swift
// sdk/ios/Sources/FrakSDK/Core/FrakStorage.swift
private static func prepare() throws -> URL {
    let manager = FileManager.default
    let support = try manager.url(
        for: .applicationSupportDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: true
    )
    var directory = support.appendingPathComponent(directoryName, isDirectory: true)
    try manager.createDirectory(at: directory, withIntermediateDirectories: true)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try directory.setResourceValues(values)
    return directory
}
```

And consent lives in its own backed-up `UserDefaults` suite:

```swift
// sdk/ios/Sources/FrakSDK/Config/KeyValueStore.swift
/// Matches the reason declared in `PrivacyInfo.xcprivacy`.
static let suiteName = "id.frak.sdk.config"

/// The consent decision, and only that: the one persisted value that SHOULD survive a restore.
/// Separate from the config suite so a corrupt write to that hot cache cannot take it along.
static let consentSuiteName = "id.frak.sdk.consent"
```

Keychain was rejected outright for the key. It survives uninstall and reinstall, so a user who deleted the app and came back would keep an anonymous id that Android and web would have regenerated. The identity store shares `FrakStorage.directory()` with the event queue but not its `tmp` fallback: `tmp` is purgeable, and an identity that churns reports every purge as a brand-new user, so `Frak.initialize` refuses rather than degrading.

## Why the iOS SDK ships from a force-pushed orphan mirror repository

SwiftPM resolves a package by repository URL plus tag and reads `Package.swift` from the repository root only. There is no subpath form ([swift-package-manager#5768](https://github.com/swiftlang/swift-package-manager/issues/5768) is open), so `sdk/ios/Package.swift` inside a monorepo is unreachable to a merchant. The release workflow force-pushes one orphan commit per release to `frak-id/frak-ios-sdk` over a repo-scoped deploy key.

Both alternatives were worse. A root `Package.swift` in the monorepo means every merchant clones 204 MiB for a 492 KB package, and iOS tags start colliding with the JS release train's tag namespace. Moving `sdk/ios` out of the monorepo breaks the golden-fixture contract outright, since the corpus lives in `sdk/core` and both loaders resolve it by walking to a shared repo root. Package identity in SwiftPM is the last URL path component, case-folded and globally unique, which is why the mirror is `frak-ios-sdk` and not `ios-sdk`.

```bash
# .github/workflows/release-ios-sdk.yml
# One ref transaction, so the tag cannot land without the commit it names, and a
# refused tag rolls main back instead of leaving the mirror advertising a version
# that does not resolve.
git push --atomic "$MIRROR" "+main:refs/heads/main" "refs/tags/$VERSION"
```

`main` is forced, the tag never is, and git refuses an existing tag on its own. A published version a merchant may have pinned in `Package.resolved` is immutable. A final job resolves the published package as a merchant would, building a throwaway consumer against `exact: "$VERSION"`, because the in-repo example uses a SwiftPM path dependency and never exercises the published spelling.

One consequence is deliberately left broken. `Tests/` are not mirrored, and the manifest ships unmodified with test targets pointing at absent directories, so `swift build` fails inside the mirror. No drift beats a divergent manifest: a stripped manifest in the mirror is one more artifact that can disagree with the source of truth.

## Why Swift 6 language mode belongs in Package.swift, not in the build script

Because the merchant's build should compile the package the way CI does. Passing `-swift-version 6` from `run.sh` only reached CI, so a strict-concurrency violation would first appear in a merchant's build log, on our code.

```swift
// sdk/ios/Package.swift
// Tools-version 6.0 is what makes `.swiftLanguageMode(.v6)` below available at all. It costs a
// hard Xcode 16 floor for anyone resolving this package. `.unsafeFlags` is not an
// alternative: SwiftPM forbids it on a package resolved as a dependency.
let package = Package(
    name: "FrakSDK",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
    ],
    products: [
        // Two artifacts, so a merchant taking only tracking never pulls in a web view.
        .library(name: "FrakSDK", targets: ["FrakSDK"]),
        .library(name: "FrakSDKUI", targets: ["FrakSDKUI"]),
    ],
    targets: [
        // Zero third-party runtime dependencies: `dependencies` is intentionally absent rather than empty.
        .target(
            name: "FrakSDK",
            path: "Sources/FrakSDK",
            resources: [.copy("PrivacyInfo.xcprivacy")],
            swiftSettings: [.swiftLanguageMode(.v6)]
        ),
```

The cost is a hard Xcode 16 floor for anyone resolving the package, stated in the merchant README. The consequence is that tests use Swift Testing rather than XCTest: the XCTest overlay cannot link at an iOS-simulator triple from SwiftPM, and CI cross-compiles to `arm64-apple-ios15.0-simulator` so an unguarded iOS 16+ API is a build error.

```bash
# sdk/ios/scripts/run.sh
# Swift Testing (not XCTest) lives in the platform Developer frameworks directory; SwiftPM
# does not add it for a cross-compiled triple. XCTest's overlay cannot link for
# iOS-simulator from SwiftPM at all.
set_ios_testing_flags() {
	local dev_dir
	dev_dir="$(xcrun --sdk iphonesimulator --show-sdk-platform-path)/Developer/Library/Frameworks"
	IOS_TESTING_FLAGS=(
		-Xswiftc -F -Xswiftc "$dev_dir"
		-Xlinker -F -Xlinker "$dev_dir"
	)
}
```

## What the golden fixture corpus does not cover, and the drift it already missed

The honest part. There is no golden corpus for URL query editing and attribution merging, which is 325 lines of logic hand-ported three ways: `queryParams.ts` / `UrlQuery.kt` / `URLQuery.swift`, and `mergeAttribution.ts` / `AttributionParams.kt` / `SharingLinkBuilder.swift`. Between them they encode a case-insensitive `fCtx` lookup, tolerant percent-decoding, "never re-encode the merchant's URL", empty-value skipping, and a seven-field precedence rule. A `golden-sharing-links.json` would close it the way `golden-context.json` closed the codec. It is not built.

That gap has already produced a divergence. Both native ports implement "never re-encode the merchant's URL" and each has a test asserting an exact untouched query string:

```kotlin
// sdk/android/frak-sdk/src/test/kotlin/id/frak/sdk/net/UrlQueryTest.kt
@Test
fun `never re-encodes a parameter the merchant already wrote`() {
    val query = UrlQuery.parse("https://acme.example/p?a=1%2B1")!!
    query.fillIfAbsent("b", "x y")
    assertEquals("https://acme.example/p?a=1%2B1&b=x%20y", query.toString())
}
```

The Swift test is character-for-character the same expectation. The TypeScript reference does not implement the rule at all:

```typescript
// sdk/core/src/context/frakContext.ts
const urlObj = safeParseUrl(url);
if (!urlObj) return null;

deleteQueryParamCaseInsensitive(urlObj.searchParams, contextKey);
urlObj.searchParams.set(contextKey, compressedContext);
applyAttributionParams(urlObj, attribution);
return urlObj.toString();
```

`URLSearchParams` plus `URL.toString()` round-trips the whole query, so `?note=hello%20world` comes back as `?note=hello+world`. `frakContext.test.ts` only reads back decoded values, so it passes either way. A link built web-side and a link built natively can byte-differ on identical input, and nothing in the repo would notice.

Two more gaps, stated as the docs state them:

- **Rewards conformance is absent on both native platforms.** `GoldenFixtures.REWARDS` and `GoldenFixtures.rewards` are declared constants that no suite loads. Reward decoding is asserted against hand-written literals on Kotlin and Swift instead. The 67-entry file is the largest corpus and the one carrying the entire codepoint apparatus above, and on native it currently asserts nothing. The TypeScript side does consume it, in `format.test.ts`, `select.test.ts` and `formatAmount.test.ts`.
- **Has the corpus ever caught a divergence? No.** The procedure for adding a fixture group ends with "break one byte on one platform and confirm the test fails", and that deliberate-injection test has never been run. A fixture nobody has seen fail is a fixture that proves nothing.

The current state is a contract that is architecturally right, executed on two of three surfaces, and unproven end to end. It is recorded as a table row in `contract.md` §4.5, which is the only reason it is fixable.

## Lessons

- **When you refuse to share code, name the artifact that carries the contract instead.** Two hand-written SDKs without a committed corpus is an absence, not a decision. The fixtures are what makes "no shared core" a design rather than a gamble.
- **Pin implementations to a file, never to each other.** If Kotlin asserts against Swift's output, a divergence tells you they disagree and not which one is wrong. A generated corpus makes the failure single-sided.
- **Any expected string that can contain a non-ASCII codepoint needs a second, explicit representation.** Escape the file to pure ASCII, store a codepoint array beside every literal, and assert the array first. Otherwise a `U+202F`/`U+00A0` swap costs you an afternoon.
- **Skip round-trip tests in a conformance suite.** `encode(decode(x)) == x` passes on an implementation that is self-consistently wrong, which is exactly the failure a cross-platform corpus exists to catch.
- **A test corpus that has never failed on purpose is untested infrastructure.** Break one byte on one platform, watch the suite go red, revert. We wrote the step down and have not run it, and that is the weakest point in this whole design.
- **Ship the strict compiler settings in the manifest, not the CI script.** `.swiftLanguageMode(.v6)` in `Package.swift` costs an Xcode 16 floor and buys the guarantee that a merchant's build compiles your package the way you tested it.

Both SDKs, all three fixture corpora, the generators and the mirror workflow are in [frak-id/wallet](https://github.com/frak-id/wallet) under `sdk/`. If you are weighing the same trade, the decision records under `docs/plans/native-sdk/` are more useful than the code: `decisions.md` for what was rejected and why, `open.md` §9 for the surfaces that are still unpinned.
