---
title: "540ms Tap-to-Paint: A WebView Bottom Sheet That Feels Native"
subtitle: "Warm pooling, fragment activation, and why we deleted ModalBottomSheet on Android"
description: "WebView bottom sheet performance on Android and iOS: warm pooling, session-at-the-tap and fragment activation cut tap-to-first-paint from 716-1119ms to ~540ms."
date: 2026-08-18T10:00:00Z
draft: false
category: "mobile"
group: "frak"
tags: ["Android", "iOS", "WebView", "WKWebView", "Jetpack Compose", "Performance", "SwiftUI", "Kotlin", "Swift"]
icon: "zap"
iconColor: "text-cyan-400"
githubUrl: "https://github.com/frak-id/wallet"
---

Tap a share button in a merchant's Android app. Between 716 and 1119 milliseconds later, the sheet finally has a page in it. For most of that window the user looks at a white rectangle, because the sheet swapped its spinner for a blank `WebView` the instant the session resolved, then sat through the whole document load.

Tap-to-first-paint now runs at roughly 540ms with no document load at all.

## What is native and what is hosted in the Frak sharing sheet

The sheet, its buttons, the haptics and the OS share chooser are native Kotlin and Swift. The reward card, FAQ and legal copy come from a hosted page at `/sharing` in the wallet web app. One reward amount, computed once, rendered identically on iOS, Android and web.

| Concern | Owner | Why |
|---|---|---|
| Sheet chrome, drag, scrim, haptics | Native | The user can feel the frame rate |
| Reward headline, FAQ, legal copy | Hosted `/sharing` | Three implementations would drift |
| OS share chooser and its payload | Native | A share must be signed by the SDK keypair |
| Product selection, copy interpolation | Hosted | The page owns the merchant config |

The public API returns `SharingResult` and never leaks the web view. The sheet has one job: open fast enough that the hosted half is invisible.

## Why a WebView bottom sheet took 716-1119ms to first paint

Almost none of the latency was where it looked. The dominant cost was `ModalBottomSheet` building its own `Dialog` window, which occupies Main for roughly 300ms, so anything sequenced inside that composition queued behind it. The warm-up meant to hide this warmed a view and then threw it away.

| Symptom | Measured | Cause |
|---|---|---|
| Sheet composition holds Main | ~300 ms | `ModalBottomSheet` building its `Dialog` window |
| Session build never starts | 203-430 ms | `LaunchedEffect` body queued behind that composition |
| Navigation never starts | 230-427 ms | Same queue, after the build moved to `Dispatchers.Default` |
| Blank white rectangle | Whole page load | The sheet built its `WebView` only after `buildLink`/`resolveConfig` resolved |

## How to start a WebView session on the click handler instead of in composition

Move the session out of the sheet. `SharingPresentation.start` runs from the merchant's click handler while Main is still idle: it takes the pooled view, attaches it, builds the session off `Dispatchers.Default` and issues the navigation itself. The sheet became purely presentational.

```kotlin
// sdk/android/frak-sdk-ui/src/main/kotlin/id/frak/sdk/ui/SharingPresentation.kt
fun start(
    pool: SharingWebViewPool,
    context: Context,
    launchContext: () -> Context,
    scope: CoroutineScope,
    request: SharingRequest,
    language: String?,
    onFinished: (SharingResult) -> Unit,
): SharingPresentation {
    val sessionId = UUID.randomUUID().toString()

    // Taken before the state exists: whether this view is a finished warm page decides how
    // the session navigates, and the state needs that answer at construction.
    val handle = pool.acquire(SharingWebViewBinding(sessionId = sessionId))

    // A fragment activation is only same-document if the document is actually there;
    // hanging one off a half-loaded page would strand the load.
    val activationBaseUrl = handle.loadedBaseUrl?.takeIf { handle.documentReady }
    // ... state constructed, binding installed ...

    // Attach before prepare: whichever finishes second issues the navigation.
    state.attach(handle.view)
    state.prepare(request)
    // Budget starts at the tap.
    state.startLoadDeadline(PAGE_LOAD_DEADLINE_MILLIS)

    return SharingPresentation(state = state, handle = handle, pool = pool)
}
```

Two traps here were caught by tests rather than review. The first: `View.post` cannot carry the navigation. The pooled view is detached, so the runnable parks until the sheet attaches it to a window, putting the load back behind the sheet's composition. The fix is a `Handler` on the main looper with an explicit thread check:

```kotlin
// sdk/android/frak-sdk-ui/src/main/kotlin/id/frak/sdk/ui/SharingSheetState.kt
private fun loadSessionUrl() {
    val view = webView ?: return
    val navigation = pageNavigation(confirmed = false) ?: return
    if (navigated) return
    navigated = true
    // Handler(mainLooper), not View.post: the pooled view is still detached at this point, and
    // View.post would park the runnable until the sheet attaches it to a window.
    if (Looper.myLooper() == Looper.getMainLooper()) {
        navigateNow(view, navigation)
    } else {
        mainHandler.post { navigateNow(view, navigation) }
    }
}
```

The second: nothing may acquire the view or start the build from a `remember` block. A `remember` lambda runs inside composition, which is the congested window the whole change exists to escape, and a recomposition can re-enter it.

On iOS the tap is the `isPresented` change: a merchant flips a `Binding`, so the launch runs from `.onChange`, before SwiftUI builds the hosting controller.

## Why warming a WebView on a neutral URL banks almost nothing

Both platforms warmed the wrong thing. Android's `preloadSharing` warmed a view it then discarded; iOS booted a throwaway `WKWebView` against a neutral `/sharing`. Either way the warmed page carried no `merchantId`, so DNS, TLS, the bundle and a V8 start were banked and nothing else: React booted again at the tap and both merchant-keyed queries started cold.

The pool now warms the real merchant page and lends that view to the sheet:

```kotlin
// sdk/android/frak-sdk-ui/src/main/kotlin/id/frak/sdk/ui/SharingWebViewPool.kt
fun warm(url: String) {
    if (destroyed) return
    // Before the unchanged-URL short circuit: a crashed view is still pooled against the URL
    // it died on, and would otherwise be kept forever by that comparison.
    discardIfRendererGone()
    if (warmUrl == url) return
    warmUrl = url
    val handle = pooled ?: newHandle().also { pooled = it }
    handle.bind(
        SharingWebViewBinding(
            sessionId = SharingWebViewBinding.WARM_SESSION_ID,
            onPageReady = {
                // Gates fragment activation — see SharingWebViewHandle.documentReady.
                handle.onDocumentReady()
                // Nobody is looking at this document until a tap.
                handle.pause()
            },
        ),
    )
    handle.resume()
    handle.load(url)
}
```

iOS needed one more split. Constructing a `WKWebView` boots two processes, takes hundreds of milliseconds and is main-thread-only, but needs nothing except a wallet origin, while the URL needs an identity mint and a merchant resolve first. Fused into one method, a fast tap paid the engine boot inside the sheet's own presentation: device QA reported 200-300ms of lag before even the skeleton appeared. `prepare()` now runs ahead of both awaits. Measured on an iPhone 15, engine ready 29ms after the share surface appears.

## How fragment activation makes the second navigation same-document

Warming the real page left one problem: the sheet still navigated twice. The per-tap half of the URL (link, products, seeded headline, session id) now arrives as a location fragment the browser resolves same-document. No request, no remount, no React boot.

```kotlin
// sdk/android/frak-sdk-ui/src/main/kotlin/id/frak/sdk/ui/SharingSession.kt
internal fun WebView.navigate(navigation: SharingNavigation) {
    when (navigation) {
        is SharingNavigation.Load -> loadUrl(navigation.url)

        is SharingNavigation.Activate -> {
            val committed = url?.substringBefore('#')
            if (committed != null) {
                loadUrl(committed + navigation.fragment)
            } else {
                // Nothing loaded to hang a fragment off; load the page rather than leave a skeleton.
                loadUrl(navigation.fullUrl)
            }
        }
    }
}
```

The page reads it back with a `hashchange` listener in `apps/wallet/app/module/sharing/params/fragment.ts` that replaces its activation state wholesale rather than merging. Replacement is load-bearing, because a warm view is recycled across sessions: session A's `shareText` would leak into session B if an activation merged into the previous one.

On device: tap to `page reported ready` in ~540ms with no `document finished` at all, against 555-757ms for a full second load.

Four guards make that safe, and each was a real bug:

| Guard | Failure mode without it |
|---|---|
| Hang the fragment off `WebView.getUrl()`, not the URL we warmed with | The page's router normalises its own search params on load, so the committed URL has already moved. A fragment on our own string becomes a cross-document navigation |
| Activation requires a *finished* warm document (`documentReady`) | A fragment change starts no request, so hanging one off a half-loaded page strands it forever |
| `warmBaseUrl` rebuilt from the same resolved config as `pageUrl`, compared before activating | A pool warmed for another merchant gets activated on top of |
| The activation itself settles the load deadline | A same-document navigation fires no `onPageFinished`/`didFinish`, so the fastest path timed out and raised the native chooser over a good page |

The last guard was the subtlest, and the bug self-healed, which gave it away. The first tap after a cold start lands while the warm load is in flight, so it does a full load and `onPageFinished` settles the budget. Every later tap activates instead, and the page's own `action=ready` cannot settle anything: it fires from two nested `requestAnimationFrame` calls, and rAF does not run in a WebView producing no frames.

Android supplies what the engine will not, at the activation site:

```kotlin
// sdk/android/frak-sdk-ui/src/main/kotlin/id/frak/sdk/ui/SharingSheetState.kt
private fun navigateNow(view: WebView, navigation: SharingNavigation) {
    view.navigate(navigation)
    if (navigation !is SharingNavigation.Activate) return
    // Only a finished document can be activated, so tap-to-content is already met: whatever
    // the page reports later, tier 3 must not fire over it.
    onPageReady()
    // Paint stays evidence-based. A pooled view has never rastered — it is 0×0 and detached
    // while warm — so uncovering it on the strength of the document alone shows a hole.
    val request = ++activationVisualState
    view.postVisualStateCallback(
        request,
        object : WebView.VisualStateCallback() {
            override fun onComplete(requestId: Long) {
                if (requestId != activationVisualState) return
                onPageVisible()
            }
        },
    )
}
```

## How to preload a hosted page without inflating your analytics funnel

Warming the real merchant page means it loads without anyone asking. A preload that fires `sharing_page_viewed` destroys the sharing funnel's denominator, so the warm URL carries `state=warm` and the page fires `sharing_page_preloaded` instead. Only the activation fragment clears the flag.

```typescript
// apps/wallet/app/module/sharing/params/table.ts
/**
 * `warm` means a host preloaded the page; it reports
 * `sharing_page_preloaded` instead of `sharing_page_viewed`. The fragment
 * default clears `warm` even when the host forgot to send `state`.
 */
state: {
    decode: oneOf("live", "warm"),
    transport: "both",
    fragmentDefault: "live",
},
```

`fragmentDefault` is doing real work. Any activation fragment that omits `state` still flips the page to `live`, so a host bug can only over-report views, never under-report them.

## Why we deleted ModalBottomSheet instead of configuring it

`ModalBottomSheet` is gone from `frak-sdk-ui`. The sheet is hosted in an `androidx.activity.ComponentDialog` on the caller's own window, as Shopify's Checkout Sheet Kit does. Keeping M3's sheet inside that dialog would have stacked two platform Windows, and almost nothing it provided was still switched on:

| | `ModalBottomSheet` inside a `ComponentDialog` | `ComponentDialog` alone |
|---|---|---|
| Windows | Two: two scrims, two back-press dispatchers, two IME contracts, conflicting TalkBack semantics | One |
| Gestures | Already disabled | Hand-rolled `draggable` on a grab strip |
| Drag handle | Already `null` | `BottomSheetDefaults.DragHandle()` inside our own hit target |
| Container, shape, slide | Already transparent, `RectangleShape`, hand-rolled `Animatable` | Unchanged |
| Scrim | M3's, at `0.32` alpha | `drawBehind`, keyed to the sheet's own offset |

Deletion also closed two rendering defects an earlier audit had filed as unfixable from a call site, read out of the Compose Material3 1.4.0 sources the build resolved at the time. `verticalScaleUp`/`verticalScaleDown` scale the sheet during its entry overshoot, which scales the `WebView` draw functor and blurs it, and every lever on the motion scheme is `internal`. And `DraggableAnchorsNode.measure` uses `placeable.place()` rather than `placeWithLayer()`, so the show/hide animation re-ran `WebView.layout()` every frame.

Two traps on the dialog itself. `themeResId = 0` inherits the merchant's dialog theme, which sets `windowIsFloating` and defeats `MATCH_PARENT`, so the theme is pinned. And `ComponentDialog` calls `initializeViewTreeOwners()` on every `setContentView`, which is the only reason `AbstractComposeView` gets its lifecycle and saved-state owners:

```kotlin
// sdk/android/frak-sdk-ui/src/main/kotlin/id/frak/sdk/ui/SharingSheetDialog.kt
// ComponentDialog, not Dialog: `setContentView` installs the ViewTree owners `AbstractComposeView`
// requires, and brings an `OnBackPressedDispatcher`. A platform translucent theme, because every
// standard dialog theme sets `windowIsFloating`, which would defeat the MATCH_PARENT below.
val dialog = ComponentDialog(activity, android.R.style.Theme_Translucent_NoTitleBar)
dialog.setContentView(content)
dialog.setCancelable(true)
// Never fires with a MATCH_PARENT window — every touch is inside it. The scrim is a Compose hit
// target instead; see [FrakSharingSheet].
dialog.setCanceledOnTouchOutside(false)
```

## Why canScrollVertically cannot arbitrate scroll between a bottom sheet and a WebView

The sheet and the hosted page raced for every vertical drag. M3 makes the whole sheet draggable, and the `canScrollVertically` heuristic meant to arbitrate was dead code, because the page scrolls an inner container styled `height: 100dvh; overflow-y: auto; overscroll-behavior: contain`. The WebView's own scroll offset never moves, so the heuristic always answers the same way. The drawn drag handle had no gesture either: `dragHandle = null` drops the slot that carries one, so the pill we rendered ourselves was decoration.

Ownership is explicit now. `sheetGesturesEnabled = false` was the first step, and the arrangement survived `ModalBottomSheet`'s deletion: the page gets every gesture landing on it, and the sheet is dragged from a 44dp Compose strip stacked above the `AndroidView`.

```kotlin
// sdk/android/frak-sdk-ui/src/main/kotlin/id/frak/sdk/ui/FrakSharingSheet.kt
Box(
    modifier =
        modifier
            .fillMaxWidth()
            .height(GRAB_STRIP_HEIGHT)
            .draggable(
                orientation = Orientation.Vertical,
                state = rememberDraggableState(onDelta = onDrag),
                onDragStopped = { velocity -> onDragStopped(velocity) },
            ),
    contentAlignment = Alignment.Center,
) {
    BottomSheetDefaults.DragHandle()
}

/** Deliberately generous: the visible pill is only 4dp tall. */
private val GRAB_STRIP_HEIGHT = 44.dp
```

Document scroll was tried on the wallet side and reverted: `android.webkit.WebView` does not implement `NestedScrollingChild`, so nothing bridges to `AndroidViewHolder` and the sheet took every drag anyway.

The gestures were not ported to iOS. The provoking condition transfers, but WebKit gives that inner container a real nested `UIScrollView` that `UISheetPresentationController` coordinates with, which Compose's sheet does not do.

## How a WebView sharing sheet survives an Android rotation

Pool, presentation and sheet state live on the `ViewModelStore` of the owner passed to `build()`. That store survives a configuration change and is cleared when the owner really finishes, which is the lifetime the pooled web view, the live session and the attribution scope all want. The dialog is bound to a window token and cannot be retained, so a rotation dismisses it and the recreated Activity re-attaches the same `WebView`. The DOM, the JS heap and the in-flight session are never re-created.

A `WebView` keeps a hard reference to its construction context, so a retained one built against an Activity leaks one per rotation, silently. It is built over a `MutableContextWrapper`:

```kotlin
// sdk/android/frak-sdk-ui/src/main/kotlin/id/frak/sdk/ui/SharingHost.kt
/**
 * A `WebView` hard-references its construction context, so a retained one built against an
 * Activity leaks it — but it also needs a themed, windowed context for its own popups. The base
 * is swapped in [attach] and [onDestroy].
 */
private val webViewContext = MutableContextWrapper(appContext)
```

The swap points are the host's `attach` and `onDestroy`, not the pool's `acquire`/`release`. `release` is not where the view is built (`warm()` is, and it runs first), and a `WebView` resolves its theme, `LayoutInflater` and popup host at construction, so a retroactive base swap does not fix already-resolved popups.

Rotation must also not report `Dismissed`. The old `abandon()` fired on "a composable left the tree", which a rotation does while nothing has been abandoned. The signal moved to "the `ViewModelStore` was cleared", and `onDestroy` reports nothing:

```kotlin
// sdk/android/frak-sdk-ui/src/main/kotlin/id/frak/sdk/ui/SharingHost.kt
override fun onDestroy(owner: LifecycleOwner) {
    val current = activity
    val changingConfigurations = current?.isChangingConfigurations == true
    // Dropped before the report below: on a rotation the outgoing Activity is past
    // `onSaveInstanceState`, so a result delivered to it lands in state that is never persisted.
    if (changingConfigurations) callback = null
    // ...
    current?.lifecycle?.removeObserver(this)
    activity = null
    // The load-bearing line for the leak: a retained WebView must not keep a destroyed Activity.
    webViewContext.baseContext = appContext
}
```

There is no `SavedStateHandle`, and process-death survival is undeliverable: the pool, the warm document and the session all die with the process. A result arriving mid-rotation is buffered in `pendingResult` and replayed on the next `build()`.

## Why the sharing sheet has no JavaScript bridge

Inbound state is query params, or an activation fragment when the view is already on the warm page. Outbound is an intercepted navigation to `<returnScheme>://result?action=…&sid=…` that the SDK cancels. `addJavascriptInterface` was rejected for having no origin control: an injected object is visible to every document the view loads.

```kotlin
// sdk/android/frak-sdk-ui/src/main/kotlin/id/frak/sdk/ui/SharingWebView.kt
if (url.scheme == returnScheme && url.host == SharingPageUrl.RESULT_HOST) {
    // `sid` guards against a result from an already-closed sheet, or from the warm page.
    if (url.getQueryParameter("sid") == binding.sessionId) {
        SharingPageAction
            .fromWire(
                action = url.getQueryParameter("action"),
                value = url.getQueryParameter("value"),
                exp = url.getQueryParameter("exp"),
                title = url.getQueryParameter("title"),
                text = url.getQueryParameter("text"),
            )?.let(binding.onAction)
    }
    return true
}
```

The scheme is derived from the package id and must match the wallet's own `^frak-[a-z0-9._-]{1,60}$` pattern, or every callback silently drops. The derivation filters on `it.code < 128`, because Kotlin's `isDigit` is `Character.isDigit` and accepts any Unicode `Nd`: a Devanagari digit would pass here and be rejected there.

One rule holds the design together. **No capability value ever rides the return URL**, with a single exemption for `action=code`, which carries an install code plus an `exp` parsed as a 64-bit integer on both platforms, never a `Double`, which silently accepts `NaN`.

`share` and `copy` are asks, not reports. A page cannot call `navigator.share` inside an Android WebView, and a share has to be signed by the SDK keypair, so the page hands over resolved title/text/image and the SDK raises the chooser itself. `FrakSDKUI/NativeShare.swift` carries its own `UIActivityItemSource` and `LPLinkMetadata` implementation. Same technique as the [Tauri share plugin we shipped for the wallet app](/articles/frak/tauri-native-sharing-rich-previews/), separate code, because a merchant's app cannot depend on our Tauri plugin. Being asks, both are exempt from the `sendHostResult` dedupe:

```typescript
// apps/wallet/app/module/sharing/host/bridge.ts
/** Actions exempt from the dedupe: repeated presses, plus a per-presentation `ready` ping. */
const REPEATABLE_ACTIONS: ReadonlySet<HostResultAction> = new Set([
    "share",
    "copy",
    "ready",
]);
```

The sub-frame check runs above the `returnScheme` branch on both platforms, and there is no `WebChromeClient`/`WKUIDelegate`, which blocks `window.open` outright.

## The iOS bug: a WKWebView reporting didFinish over a reclaimed content process

A second share after the install flow opened a permanently grey sheet. No page, no fallback, no way out. The obvious diagnosis was a page returning 200 OK whose JS never booted. The device said otherwise: WebKit had reclaimed the pooled `WKWebView`'s content process while it sat off-screen, and it does so **without** firing `webViewWebContentProcessDidTerminate`. So `rendererGone` was never set, the view kept answering, and it kept reporting `didFinish` over a document that no longer existed.

First conclusion: `didFinish` cannot mean "the page is alive". It settles no budget now, warm path and cold path alike:

```swift
// sdk/ios/Sources/FrakSDKUI/SharingSheetModel.swift
func onPageReady() {
    // Never backwards: an already-painted page that reports its document finished, or a
    // renderer crash the sheet has already covered, must not be uncovered again.
    if page == .loading { page = .documentReady }
    // Deliberately does not settle: this arrives from `didFinish`, which a reclaimed
    // renderer still delivers over an empty document. Only `onPageAction` — the page
    // speaking for itself — clears a budget, on the cold path as much as the warm one.
}
```

Second: a reload cannot revive a reclaimed process. Recovery asks the pool for a fresh engine bound to the same session, and the model publishes the swap:

```swift
// sdk/ios/Sources/FrakSDKUI/SharingWebViewPool.swift
/// For the case a reload cannot reach: a content process reclaimed without
/// `webViewWebContentProcessDidTerminate` leaves a `WKWebView` that still answers, still
/// reports `didFinish`, and has no document behind it — Web Inspector lists the target and
/// shows nothing. Only a new engine recovers that.
func rebuild(_ binding: SharingWebViewBinding) -> SharingWebView? {
    guard !destroyed else { return nil }
    if let corpse = pooled {
        corpse.view.removeFromSuperview()
        // `destroy()`, not `stopLoading()`: a replaced engine keeps this session's
        // binding and any booked retry, and either would fire `onPageUnavailable` over
        // the fresh engine. Also the only path that releases the WKWebView's processes.
        corpse.destroy()
    }
    let view = makeView()
    view.bind(binding)
    pooled = view
    lent = true
    return view
}
```

An activation gets a 1s budget and a full load 2s, both above the retry ladder they must outlast. Past that the page is loaded once more, then the share falls through to the OS chooser. Verified on an iPad: four consecutive shares render the sharing page.

**Android is untouched and the symptom is still reachable there.** `SharingSheetState` settles its deadline on the same engine-level signal, and the identical bug in `onRenderProcessGone` was logged rather than fixed.

| | Android | iOS |
|---|---|---|
| Paint signal | `postVisualStateCallback` plus the page's `action=ready` | `action=ready` only; WebKit has no public equivalent |
| Load budget | 5 s spanning build, navigation, load and paint | 2 s full load, 1 s activation |
| `didFinish` settles the budget | Yes (`onPageFinished`) | No |
| Reclaimed-renderer recovery | Open | Fresh engine via `pool.rebuild` |
| Warm view paused while pooled | `onPause()`, resumed in `acquire()` | No analogue; never in a hierarchy |

## What is still unverified

There is no automated device or simulator tier. CI compiles the iOS tests at the simulator triple and runs them on the macOS host, so every UIKit-gated suite executes nowhere. That leaves roughly 2,000 lines of iOS sharing-sheet code with zero executed coverage, and is why `sharingReclaim`, `sharingExpiry` and `sharingShouldWatchActivation` were hoisted out from behind `#if canImport(UIKit)` into `SharingSheetLogic.swift` as free functions a macOS test host can reach. Android's `SharingHost` has no test constructing one either: no JVM harness supplies a real `ComponentActivity` plus `ViewModelStore` plus `ComponentDialog`.

Two harness blind spots are structural. Robolectric ships no WebView provider implementing `DOCUMENT_START_SCRIPT`, so `SharingHostStyle.install()` (which injects `--frak-host-top-radius` and `--frak-host-surface` at document start, scoped to the wallet origin) has no executed coverage. And `SharingSheetStateTest` injects `EmptyCoroutineContext` for `workContext`, collapsing `Dispatchers.Default` and `Main.immediate` onto one virtual scheduler. One scheduler cannot exhibit a two-dispatcher race, so the thread-confinement design has no regression test and cannot get one from the JVM.

None of the rendering claims about clip paths and draw functors are backed by a frame trace. They come from reading the Material3 sources and the `draw_fn.h` ABI, which carries `clip_left/top/right/bottom` and nothing else.

The performance targets still on the books (p75 under 400ms, p95 under 1s) were set for Chrome Custom Tabs and never re-measured for the WebView path.

## Lessons

- **Measure where the main thread is, not where your code is.** The 203-430ms we spent chasing a slow session build was a `LaunchedEffect` body waiting on a frame clock busy building a `Dialog` window. Moving work off-thread only moved the queue; moving it *earlier*, onto the click handler, is what paid.
- **A warm cache keyed on the wrong thing is a cold cache with extra steps.** Warm the exact document you will show. A neutral `/sharing` left both merchant-keyed queries cold.
- **Hang a same-document fragment off the committed URL, never off the URL you loaded.** Any router that normalises its own search params has already moved the document before your user taps.
- **Every preload needs an analytics flag whose default points the safe way.** `state=warm` plus `fragmentDefault: "live"` means a host bug can only over-report views.
- **Engine-level load callbacks are not liveness signals.** `didFinish` and `onPageFinished` both fire over a content process reclaimed out from under you. Settle your budget on a message the page's own JavaScript sent.
- **Deleting a framework component you have already switched off beats configuring around it.** Removing `ModalBottomSheet` closed two rendering defects a call site could not reach.

The Android UI module is about 3,560 lines of Kotlin in `sdk/android/frak-sdk-ui`, its iOS twin about 4,000 lines of Swift in `sdk/ios/Sources/FrakSDKUI`, and the wire contract spanning both plus the hosted page sits in `docs/plans/native-sdk/contract.md`. All of it is in [frak-id/wallet](https://github.com/frak-id/wallet). Read `decisions.md` §4 first: it is shorter than the code and records what we rejected.
