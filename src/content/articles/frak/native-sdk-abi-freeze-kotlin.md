---
title: "Designing a Kotlin SDK ABI You Can Never Take Back"
subtitle: "No default arguments, a hand-rolled binary-compatibility gate under AGP 9, and 17 CompletableFuture twins for Java callers"
description: "Kotlin SDK ABI design for Maven Central: why default arguments break binary compatibility, how to hand-roll an apiCheck gate on AGP 9, and what .api dumps miss."
date: 2026-09-12T10:00:00Z
draft: false
category: "mobile"
group: "frak"
tags: ["Kotlin", "Android", "SDK", "ABI", "Binary Compatibility", "Maven Central", "Gradle", "Java Interop", "Swift"]
icon: "lock"
iconColor: "text-amber-400"
githubUrl: "https://github.com/frak-id/wallet"
---

Add one optional parameter to a public Kotlin constructor and every merchant binary compiled against the old arity gets `NoSuchMethodError`. Not at build time. At runtime, in an APK that shipped to the Play Store weeks ago, inside an app whose release cycle we do not control.

That constraint is the whole design brief for the Frak native SDKs. We publish two Android artifacts to Maven Central, `id.frak.sdk:core` and `id.frak.sdk:ui`, and ship iOS as source through a SwiftPM mirror. `1.0.0` was cut on 2026-09-08, and from that version the public surface follows semantic versioning: a break takes a new major, and a merchant who cannot rebuild and resubmit gets a crash they did not write and cannot patch.

So most of the work was deciding what never to publish. The toolchain is Gradle 9.5.0, AGP 9.1.1, Kotlin 2.4.10 pinned to language and API level 2.2, JVM target 17, `compileSdk 36`, `minSdk 24`, with `explicitApi()` on in both modules.

## Why Kotlin default arguments break binary compatibility

A Kotlin default argument compiles to two JVM members: the full-arity declaration, and a synthetic `$default` bridge (for a constructor, an `<init>` taking a trailing `int` bitmask plus a `DefaultConstructorMarker`). The bitmask width and the descriptor both encode the parameter count. Add a parameter and both descriptors change, so an already-linked caller resolves neither.

The failure is unfixable by the person who hits it. Their binary is frozen at store submission. That ruled out default arguments on every public declaration in `:frak-sdk` and `:frak-sdk-ui`, which forced a different construction story per type role:

| Role | Treatment | Types |
|---|---|---|
| Merchant-constructed input | `Builder` | `FrakConfig`, `FrakMetadata`, `SharingRequest`, `SharingProduct`, `ProductDetails`, `AttributionParams`, `RewardRequest` |
| Read model the backend keeps growing | `internal` constructor, no defaults | `FrakResolvedConfig` and 9 others, `FrakContext.V1`/`.V2` |
| Not expected to grow | explicit overloads | `FrakEnvironment.Custom`, `FrakError.Server`, `FrakError.Decoding` |
| Opaque, write-only | `@JvmStatic` factories | `Interaction` |

Kotlin ergonomics live in a top-level function named after the type, delegating to the same Builder, so a default value has exactly one home:

```kotlin
// sdk/android/frak-sdk/src/main/kotlin/id/frak/sdk/core/FrakConfig.kt
public class FrakConfig internal constructor(
    public val merchantId: String?,
    public val packageId: String?,
    public val metadata: FrakMetadata,
    public val env: FrakEnvironment,
    public val deepLink: DeepLinkHandling,
    public val trackingEnabled: Boolean,
    public val logLevel: FrakLogLevel,
    public val logSink: FrakLogSink?,
) {
    /**
     * `Builder()` exists alongside `Builder(merchantId)` because [merchantId] is optional. The empty
     * one is primary: a shared `constructor(String?)` would erase to the same JVM descriptor as
     * `constructor(String)`.
     */
    public class Builder() {
        public constructor(merchantId: String) : this() {
            this.merchantId = merchantId
        }
        // ...
    }

    /** Not a `data class`: publishing one bakes `copy()`/`componentN()` into the ABI permanently. */
    internal fun withPackageId(packageId: String): FrakConfig = /* ... */
}

/** Kotlin sugar over [FrakConfig.Builder], for the merchant-id form. */
public fun FrakConfig(
    merchantId: String,
    configure: FrakConfig.Builder.() -> Unit,
): FrakConfig = FrakConfig.Builder(merchantId).apply(configure).build()
```

`@JvmOverloads` is the obvious-looking escape and it is the wrong one. It generates the Java-visible overload ladder and leaves every Kotlin caller resolving through the same `$default` bridge with the same arity-encoded descriptor. Half a fix reads worse than none: the gate goes green while the break is live.

Nothing on the surface is a `data class` either: `copy()` carries its own defaults, so it re-imports the problem the class was declared to avoid.

Exactly one synthetic bridge survives in the committed dump, and no source change removes it:

```
# sdk/android/frak-sdk/api/frak-sdk.api
public synthetic fun <init> (Lid/frak/sdk/core/FrakError$Kind;Ljava/lang/String;Ljava/lang/Throwable;Lkotlin/jvm/internal/DefaultConstructorMarker;)V
```

That is a `sealed`-plus-parameters artifact on `FrakError`: the compiler emits a private constructor and a public marker bridge for the subclasses to call. BCV 0.18.1 drops a marker-only synthetic constructor (it does for `RewardTier` and `EstimatedReward`) and keeps one carrying real parameters.

## Why binary-compatibility-validator registers no apiDump task under AGP 9

binary-compatibility-validator registers `apiDump` and `apiCheck` only when `kotlin-android`, `kotlin` or `kotlin-multiplatform` is applied. AGP 9 compiles Kotlin itself and blocks `org.jetbrains.kotlin.android`. So BCV's hook never fires: no tasks, no warning, no error, and an unguarded ABI behind a build that looks configured ([BCV#312](https://github.com/Kotlin/binary-compatibility-validator/issues/312)).

KGP's documented replacement, `kotlin { abiValidation { } }`, is closed by the same gap. That DSL sits on the extension the standalone Kotlin plugin registers, not the one AGP provides ([KT-78025](https://youtrack.jetbrains.com/issue/KT-78025)).

The fix is to drive BCV's own task types from the AGP release compile tasks, which is what okhttp and elastic/apm-agent-android did for the same hole:

```kotlin
// sdk/android/buildSrc/src/main/kotlin/frak-publish.gradle.kts
val apiFile = layout.projectDirectory.file("api/${project.name}.api")

val apiBuild =
    tasks.register<KotlinApiBuildTask>("apiBuild") {
        description = "Extracts the public ABI of the release variant."

        // These `tasks.named` calls must stay inside this configuration action: it runs at task
        // realisation, after AGP created the compile tasks, and `named` fails eagerly otherwise.
        inputClassesDirs.from(tasks.named("compileReleaseKotlin").map { it.outputs.files })
        inputClassesDirs.from(tasks.named("compileReleaseJavaWithJavac").map { it.outputs.files })
        outputApiFile.set(layout.buildDirectory.file("bcv/${project.name}.api"))
        // `nonPublicMarkers`/`runtimeClasspath` are unset on purpose: BCV reads the former from the
        // root `apiValidation` extension, and the worker's classloader falls back to buildSrc's.
    }

val apiCheck =
    tasks.register<KotlinApiCompareTask>("apiCheck") {
        group = "verification"
        description = "Fails if the public ABI differs from the committed api/*.api dump."

        projectApiFile.set(apiFile)
        generatedApiFile.set(apiBuild.flatMap { it.outputApiFile })
    }

tasks.named("check") { dependsOn(apiCheck) }
```

`KotlinApiBuildTask` and `KotlinApiCompareTask` are internal to BCV, not public API, so the version is pinned rather than floated. BCV's worker also needs `kotlin-metadata-jvm` and ASM at runtime while its POM declares neither, and it falls back to buildSrc's classloader, so buildSrc declares them explicitly:

```kotlin
// sdk/android/buildSrc/build.gradle.kts
implementation("org.jetbrains.kotlinx:binary-compatibility-validator:0.18.1")

// BCV's ABI worker needs kotlin-metadata-jvm and ASM at runtime but its POM declares neither,
// and the worker's classloader falls back to buildSrc's. kotlin-metadata-jvm tracks the compiler
// version, not BCV's.
implementation("org.jetbrains.kotlin:kotlin-metadata-jvm:2.4.10")

// Transitive through AGP today; declared so an AGP bump can't break the ABI gate.
implementation("org.ow2.asm:asm:9.10.1")
implementation("org.ow2.asm:asm-tree:9.10.1")
```

The task names match upstream exactly, on purpose. If a future BCV or KGP release starts registering them for an AGP-9 Android library, Gradle fails with "a task with that name already exists". That failure is the signal to delete the hand-rolled block, and it arrives on the next dependency bump instead of never. One caveat: `apiDump` is a plain copy task whose output `apiCheck` reads with no declared dependency, so the two must never run in a single Gradle invocation.

The committed dumps are 769 and 81 lines, keyed off `project.name`. Reviewing that diff *is* the ABI decision: every added line is a symbol we can no longer change, every removed line is one a shipped merchant binary may already be linking against.

## How @InternalFrakApi keeps a cross-module symbol out of the .api dump

`:frak-sdk-ui` needs symbols from `:frak-sdk` that no merchant should see. Kotlin `internal` does not cross a module boundary, so those declarations are `public` and carry `@InternalFrakApi`, a `@RequiresOptIn(ERROR)` marker wired into BCV's `nonPublicMarkers`. Anything it marks drops out of the dump, and absence from the dump is the compatibility contract.

```kotlin
// sdk/android/frak-sdk/src/main/kotlin/id/frak/sdk/InternalFrakApi.kt
@RequiresOptIn(
    level = RequiresOptIn.Level.ERROR,
    message = "Internal to the Frak SDK; not covered by compatibility guarantees.",
)
@Retention(AnnotationRetention.BINARY)
// PROPERTY as well as CLASS: `FrakSdkVersion`'s wire constants are members of an otherwise
// merchant-facing object, so the marker has to land on the property, not the enclosing type.
// CONSTRUCTOR: the reward read models are merchant-facing types whose constructors are not, since
// only the SDK decodes one from the backend.
@Target(
    AnnotationTarget.CLASS,
    AnnotationTarget.PROPERTY,
    AnnotationTarget.FUNCTION,
    AnnotationTarget.CONSTRUCTOR,
)
public annotation class InternalFrakApi
```

The `@Target` list is load-bearing. BCV only sees annotations that survive into the class file, so a member-level marker needs `PROPERTY` or `FUNCTION`. `CLASS` alone would silently fail to hide a property on a public object.

The trap is that opt-in propagates through signatures. Marking a type makes every member returning it uncallable without opt-in, and an `@OptIn` at the declaration site does not stop the propagation. That is why the ten-type resolved-config tree got `internal` constructors instead of the marker: marking `FrakResolvedConfig` would have poisoned `ConfigApi.resolve()`.

`internal` alone was not enough either. Kotlin mangles `internal` functions but cannot mangle a constructor, so it is emitted `public` in the class file, and a `DefaultConstructorMarker` bridge lands in the dump even for an internal constructor. Both halves were needed. A new backend field is now a new getter and nothing else.

Opt-in is per-file `@OptIn`, never a module-wide `-opt-in` compiler flag. The flag would silently void `PublicSurfaceTest`, a JVM test that constructs every public *input* type through the public API and opts in exactly the way `:frak-sdk-ui` has to. Neither `@RequiresOptIn` nor `internal` stops javac, so a Java caller reaching past them is outside the contract by construction.

## Why FrakClient is a final class instead of an interface

Adding an abstract member to a published interface is an unconditional binary break. Every existing implementer fails `AbstractMethodError` at runtime on the JVM. A final class with an `internal` constructor takes additions for free, so `FrakClient` is declared that way and appears in the dump as `public final class id/frak/sdk/FrakClient`.

| | Public interface | Final class, internal constructor |
|---|---|---|
| Adding a member | `AbstractMethodError` on every implementer | additive, no break |
| Merchant can substitute a fake | yes | no |
| Test seam | injected implementation | `FrakEnvironment.Custom` against a stub server |
| Default methods | `jvmDefault` mode decides the break | not applicable |

The cost is real and accepted: nothing can substitute a fake `FrakClient`. `HttpClient` stays `internal`, transport injection is deliberately absent, and the documented seam is `FrakEnvironment.Custom` against a stub server. `:frak-sdk-ui`'s own tests inject a narrow `SharingDependencies` interface, an internal type and free to change.

The surface is a root plus five namespace properties (`config`, `rewards`, `sharing`, `tracking`, `appLink`), each itself a final class with an internal constructor. `shutdown()` deliberately lives on the `Frak` facade rather than on the client, so no merchant can kill a client that `Frak.client` handed out to someone else. Where interfaces do survive, the compiler runs at `JvmDefaultMode.NO_COMPATIBILITY`, so their methods compile to real JVM default methods and adding one does not break older consumers.

## 17 CompletableFuture twins, and the main-thread deadlock we shipped through the beta line

A Java caller cannot name a `Continuation`, so every `suspend fun` on `FrakClient` and the five `*Api` namespaces has a `CompletableFuture` twin named `*Async`. The committed dump carries 17 of them. `kotlinx-coroutines-jdk8` merged into `-core` in 1.7.0 and `minSdk 24` clears the `CompletableFuture` floor, so the twins cost no new dependency.

All of them funnel through one helper. The body runs on IO, completion is signalled on the main thread so a merchant's `thenAccept` can touch views:

```kotlin
// sdk/android/frak-sdk/src/main/kotlin/id/frak/sdk/core/DefaultFrakClient.kt
fun <T> asFuture(block: suspend () -> T): CompletableFuture<T> =
    scope
        .future(mainDispatcher, CoroutineStart.UNDISPATCHED) {
            withContext(ioDispatcher) { block() }
        }.mainSafe(onMainThread)
```

`mainDispatcher` is hand-rolled. `Dispatchers.Main` lives in `kotlinx-coroutines-android`, which is on no classpath here: `:frak-sdk` has exactly one third-party runtime dependency, `kotlinx-coroutines-core`. So `MainThreadDispatcher` posts to a lazily-created `Handler(Looper.getMainLooper())` and falls back to `Dispatchers.IO` with a cancellation when `post` returns false on a dying looper.

Completing on the main thread has a consequence we published and then had to fix. `get()` or `join()` from that thread queues the completion behind the block waiting for it, so it resolves never. Android's ANR watchdog kills the app about five seconds later. Only 3 of the 17 KDoc comments warned.

`1.0.0` takes the `Tasks.await()` shape from Play services instead: keep main-thread completion, refuse the blocking call.

```kotlin
// sdk/android/frak-sdk/src/main/kotlin/id/frak/sdk/core/MainSafeFuture.kt
internal class MainSafeFuture<T>(
    private val onMainThread: () -> Boolean = ::isMainThread,
) : CompletableFuture<T>() {
    override fun get(): T {
        refuseOnMainThread()
        return super.get()
    }

    override fun join(): T {
        refuseOnMainThread()
        return super.join()
    }

    /** Carries the guard into `thenApply`-style derivatives, on the API levels that consult it. */
    override fun <U> newIncompleteFuture(): CompletableFuture<U> = MainSafeFuture(onMainThread)

    private fun refuseOnMainThread() {
        check(!onMainThread()) {
            "A Frak *Async future completes on the main thread, so blocking on one from the main " +
                "thread deadlocks. Use thenAccept/whenComplete, or block from a background thread."
        }
    }
}
```

| | Before 1.0.0 | 1.0.0 |
|---|---|---|
| `get()` / `join()` on main | hangs until the ANR watchdog kills the app | `IllegalStateException` naming the fix |
| `get()` / `join()` off main | works | works |
| `thenAccept` / `whenComplete` | unchanged | unchanged |
| JVM descriptors | — | unchanged, `apiCheck` stayed green |

That last row is the limit of the whole exercise. A behaviour change this size passed the ABI gate without a single diff line.

Two shapes were rejected along the way. `@JvmSynthetic` on the twins would hide them from Kotlin and also drop them from the ABI dump, moving them outside the contract we are trying to publish. `kotlin.Result` is a value class that erases to `Object` from Java and cannot carry the typed `FrakError` arm across the boundary, so tracking returns a hand-written `FrakResult<T>`.

## What a .api dump cannot catch: nullability, @Throws and suspend erasure

An `.api` dump compares JVM descriptors. Nullability, `@Throws`, `suspend`, and the presence or absence of `equals`/`hashCode` are all invisible to it. So the failure-signalling contract is documented per member and enforced by convention, not by the gate.

Four tiers, one per kind of answer:

| Tier | Shape | Meaning | Examples |
|---|---|---|---|
| Absence | `T?` | nothing was there, and that is normal | `anonymousId`, `RewardsApi.best`, `SharingApi.buildLink` null arm |
| Outcome | sealed or enum | several ends are all valid | `OpenAppResult` |
| Predicate | `Boolean` | a question with two answers | `AppLinkApi.isFrakAppInstalled` |
| Failure | throws `FrakError` | the call could have worked and did not | `ConfigApi.resolve`, `RewardsApi.campaigns`, `AppLinkApi.installPageUrl` |

`TrackingApi` is the one deliberate exception: `track()` and `purchase()` return `FrakResult<Unit>` and never throw, because they sit on hot paths where a `TrackingDisabled` refusal is expected rather than exceptional.

Moving a member between tiers is a source break with an unchanged descriptor, and `apiCheck` will pass it. Such a change needs a `!` in the commit subject and a release note. Naming follows the same logic: `FrakResolvedConfig.displayName` and `displayLogoUrl` carry a `display` prefix so a derived getter does not squat on the name a future top-level wire field would want. Equality is the other live case, invisible to the gate and visible to every merchant using the type as a map key. The cross-platform contract we do enforce mechanically is [golden fixtures for the wire formats](/articles/frak/native-sdk-golden-fixtures-cross-platform/), which covers bytes rather than descriptors.

## Why a Kotlin SDK with sealed classes ships a stub javadoc jar

Maven Central requires a `-javadoc` artifact to exist and never opens it. AGP's `withJavadocJar()` runs a bundled Dokka whose relocated ASM predates the `PermittedSubclasses` class-file attribute, so it throws from `ClassVisitor.visitPermittedSubclass` on the first `sealed` type it reads as a binary. This SDK has seven public sealed hierarchies.

Those seven are `FrakContext`, `FrakError`, `FrakEnvironment`, `FrakResult`, `RewardTier`, `EstimatedReward` and `SharingResult`. Dokka takes a module's *own* Kotlin sources through descriptors and falls back to ASM only for dependencies, so `:frak-sdk` had been publishing a real 571 KB Dokka jar all along, and only `:frak-sdk-ui`, which sees `:frak-sdk` as a jar, ever failed. The first diagnosis blamed Kotlin 2.4 class-file versions. A Kotlin downgrade would have changed nothing.

```kotlin
// sdk/android/buildSrc/src/main/kotlin/frak-publish.gradle.kts
val javadocStub =
    tasks.register("javadocStub") {
        val notice = layout.buildDirectory.file("frak-javadoc-stub/README.md")
        val text =
            """
            # ${project.group}:$artifactName — no generated Javadoc

            This artifact exists because Maven Central requires a `-javadoc` jar to be present.

            The API documentation is the KDoc in the sources jar, which is published alongside
            this one and is what an IDE reads on navigate-to-source:

                ${project.group}:$artifactName:$sdkVersion:sources

            """.trimIndent()
        // ...
    }
```

Pinning a modern Dokka was the plan and is not reachable from here. AGP resolves the Dokka worker classpath in a detached configuration, so there is nothing to force a version onto, and Dokka 2's Gradle plugin hooks the same `kotlin-android` plugin AGP 9 blocks. Both modules get the stub even though only one needed it: a real jar for one coordinate and a stub for its sibling is one family with a silently different contract.

## Gating a version string across five files before a Maven Central upload

A published version is immutable on Maven Central and on the SwiftPM mirror, so drift caught after tagging ships uncorrectable. `scripts/native-version.ts` gates every file carrying a version against that platform's single source of truth: five sites on Android against `frak.sdk.version` in `gradle.properties`, three on iOS against `FrakSDKVersion.current`.

```typescript
// scripts/native-version.ts
function extract(site: Site): string[] {
    const found = [...read(site.file).matchAll(site.pattern)].flatMap((m) =>
        m.slice(1).filter((v): v is string => v !== undefined)
    );
    if (found.length !== site.values) {
        die(
            `${site.file}: expected ${site.values} version reference(s) (${site.why}), found ${found.length}.\n` +
                "   Either the file changed shape or a site moved — update SPECS in scripts/native-version.ts."
        );
    }
    return found;
}
```

Failing on the wrong *count* rather than only on the wrong value is the part worth copying. A site whose shape moved would otherwise compare empty to empty and gate nothing, reporting success for as long as it stays broken. The script also refuses to release a version with no `## [x.y.z]` section in `sdk/android/CHANGELOG.md`, and both release workflows publish that section as the GitHub release body.

## What is still open after 1.0.0

Six ABI decisions were tracked as "free before the first artifact exists", and `1.0.0` spent that budget. Nothing has consumed a published artifact yet, so today's practical cost is still near zero. It stops being near zero the moment a merchant integrates.

| Item | Platform | State |
|---|---|---|
| `FrakContext` and `SharingResult` have no unknown arm. A `Kind` discriminator does not fix it: `SharingResult` gained a 6th arm (`WalletOpened`) five days after being "narrowed" by `Kind`. A Kotlin `when` with no `else` throws `NoWhenBranchMatchedException` on an already-installed binary | both | unowned |
| `tracking.purchase(String, String, String)`: three unlabelled strings on the money path, trivially mis-ordered and permanently so | Android | unowned |
| `FrakError` has no retryable/fatal axis, and iOS's `LocalizedError` conformance exposes raw diagnostics as user-facing strings | both | unowned |
| Equality split across 8 types. Android input types are 3-have / 4-haven't; `FrakConfig`/`FrakMetadata` are reference-identity on Android and hand-written `Hashable` on iOS. Adding equality later is a behaviour change with an unchanged descriptor | both | unowned |
| The on-disk event-queue row format carries no reliability tier. A queue file cannot be migrated once merchants have rows on disk | both | unowned |
| iOS input types use memberwise `init` where Android uses Builders. Source-compatible only while iOS ships source; this changes the day `do_xcframework()` produces a precompiled binary | iOS | tied to XCFramework |

`do_xcframework()` still `die`s "not implemented", so iOS distribution is source-only and its freeze is source-level rather than binary. There is no ABI gate on the Swift side and no easy way to build one. Also open: `:frak-sdk-ui` logs outside the merchant's configured `FrakLogger`, and closing that needs a new `@InternalFrakApi` accessor, which is itself an ABI change. The sheet doing the logging is covered in the [WebView sharing sheet write-up](/articles/frak/native-sdk-webview-sharing-sheet/).

## Lessons

- **Publish the narrowest thing that answers the question.** Every convenience Kotlin generates for you (`copy()`, `componentN()`, `$default` bridges, `@JvmOverloads` ladders) is a descriptor you are promising to keep forever.
- **A gate that registers no tasks is worse than no gate.** BCV under AGP 9 fails by doing nothing. Name your hand-rolled replacement exactly what upstream would, so the day upstream ships the fix your build collides instead of silently double-checking.
- **Check the reference count, not only the value.** `native-version.ts` fails when a file yields the wrong *number* of version references. A regex that stops matching returns an empty set, and an empty set compares equal to everything.
- **Know what your gate cannot see.** `apiCheck` compares JVM descriptors, so nullability, `@Throws`, `suspend` and equality changes pass through untouched. Those need a documented convention and a `!` in the commit subject, because no tool is watching.
- **`internal` is not a binary boundary, and neither is `@RequiresOptIn`.** Kotlin cannot mangle a constructor, javac is never told about opt-in markers, and a `DefaultConstructorMarker` bridge lands in the dump even for an internal constructor. Combine the visibility modifier with the shape change, or you have done half of each.
- **Re-derive the diagnosis from the stack frame.** "Dokka cannot parse Kotlin 2.4 class files" was written down and wrong; `ClassVisitor.visitPermittedSubclass` said ASM, not Kotlin, and the version downgrade it implied would have fixed nothing.

Both Gradle modules, the `buildSrc` ABI wiring and the two committed `.api` dumps live in [frak-id/wallet](https://github.com/frak-id/wallet) under `sdk/android`, with the reasoning for each frozen decision in `docs/plans/native-sdk/decisions.md`. The `frak-publish.gradle.kts` gate block is about 60 lines and transplants to any AGP 9 Android library that needs one before BCV#312 closes.
