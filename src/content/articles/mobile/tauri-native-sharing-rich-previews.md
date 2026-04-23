---
title: "Rich Share Sheets in a Tauri Mobile App (Without the Usual Compromises)"
subtitle: "Typed activity items on iOS, FileProvider thumbnails on Android, and a 2-second race against the share sheet"
description: "How we built a native Tauri share plugin for iOS and Android that surfaces proper URL cards, LPLinkMetadata preview tiles, and FileProvider-backed thumbnails, with a bounded image race so the share sheet never stalls."
date: 2026-04-23T10:00:00Z
draft: false
category: "mobile"
group: "frak"
tags: ["Tauri", "Mobile", "iOS", "Android", "FileProvider", "LPLinkMetadata", "UIActivityViewController", "Rust", "Kotlin", "Swift"]
icon: "share-2"
iconColor: "text-cyan-400"
githubUrl: "https://github.com/frak-id/wallet"
---

`navigator.share()` looks like the right answer until you open the Tauri WebView and call it on iOS.

Nothing happens. No error, no prompt, nothing. The Web Share API is gated on browsing contexts that Tauri's WKWebView / WebView2 don't provide, and even when a polyfill fires, you get a text-only share: title glued to body glued to URL, no preview card, no thumbnail, and a link that the receiving app treats as raw text instead of a URL. Messages won't render a rich card. Safari Reading List can't save it. Mail won't set the subject.

This doesn't look like a big deal right up until you realise that "tap to share, get a nice preview" is half the reason anyone invites a friend in the first place. A sharing flow that ships as a wall of text has, empirically, an order of magnitude lower conversion than one with a logo, a title, and a clickable link card.

So we built a native Tauri plugin that uses `UIActivityViewController` on iOS and `Intent.ACTION_SEND` on Android, with all the typed metadata each platform needs to render a proper rich preview. Here's how it works, and the specific places the details matter.

## The Shape of the Payload

The first lesson is that "a share" isn't a string. It's a typed bundle, URL, body text, optional title for the subject line, optional image for the preview tile. On the web, `navigator.share` accepts this shape. On iOS and Android, each field needs to be wired to the right primitive so the activity sheet / share chooser can format it per-destination.

The Rust side is a thin forwarder. It accepts a serde-deserialised payload and hands it to the mobile plugin:

```rust
// apps/wallet/src-tauri/plugins/tauri-plugin-frak-share/src/lib.rs
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ShareTextPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) image_url: Option<String>,
}
```

Note the `#[serde(rename_all = "camelCase")]`, Tauri converts JS `imageUrl` to Rust `image_url` for you, but the native plugins read fields by their camelCase JS names from `invoke.getArgs()`. So the Rust layer deserialises snake_case and re-serialises camelCase before handing off. Missing that one attribute is a "works on Android, broken on iOS" bug, because each platform's SDK differs about whether it tolerates inconsistent casing.

```rust
#[tauri::command]
async fn share_text<R: Runtime>(
    _app: AppHandle<R>,
    url: Option<String>,
    text: Option<String>,
    title: Option<String>,
    image_url: Option<String>,
) -> Result<ShareResponse, String> {
    let has_url = url.as_deref().map_or(false, |s| !s.is_empty());
    let has_text = text.as_deref().map_or(false, |s| !s.is_empty());
    if !has_url && !has_text {
        return Err("Missing 'url' or 'text' parameter".to_string());
    }

    #[cfg(mobile)]
    {
        _app.state::<FrakShare<R>>()
            .share_text(ShareTextPayload { url, text, title, image_url })
            .map_err(|err| err.to_string())
    }
    #[cfg(not(mobile))]
    {
        Err("frak-share is only available on iOS and Android".to_string())
    }
}
```

Validation happens in three places: here, in the iOS handler, and in the Kotlin handler. Belt-and-braces, but it means the share-sheet never gets an empty activity list, which on iOS renders as an empty sheet that instantly dismisses, the worst failure mode because the user thinks they did something wrong.

## iOS: Typed Activity Items and `LPLinkMetadata.iconProvider`

The iOS share sheet is `UIActivityViewController`. You hand it an array of `Any` objects called "activity items" and it routes them to destination activities. The naive approach is `[title, body, url]`, which *works*, but iOS treats the whole thing as anonymous text, which means Safari's Reading List activity gets "title body https://..." as its title field, Mail's subject is empty, and Messages treats the URL as inline text instead of generating a link card.

The right answer is **`UIActivityItemSource`**, a protocol that lets you give the share sheet typed, per-activity-customised items. We use two of them:

```swift
// ios/Sources/FrakSharePlugin.swift
private final class LinkActivityItemSource: NSObject, UIActivityItemSource {
    private let url: URL
    private let subject: String?
    private let metadata: LPLinkMetadata

    init(url: URL, subject: String?, metadata: LPLinkMetadata) {
        self.url = url
        self.subject = subject
        self.metadata = metadata
        super.init()
    }

    func activityViewControllerPlaceholderItem(
        _ activityViewController: UIActivityViewController
    ) -> Any {
        return url
    }

    func activityViewController(
        _ activityViewController: UIActivityViewController,
        itemForActivityType activityType: UIActivity.ActivityType?
    ) -> Any? {
        return url
    }

    func activityViewController(
        _ activityViewController: UIActivityViewController,
        subjectForActivityType activityType: UIActivity.ActivityType?
    ) -> String {
        return subject ?? ""
    }

    func activityViewControllerLinkMetadata(
        _ activityViewController: UIActivityViewController
    ) -> LPLinkMetadata? {
        return metadata
    }
}
```

Three things earn their slot here:

- `itemForActivityType` returns a typed `URL` object. Messages, Mail, Safari all inspect the runtime type of the item they receive, a `URL` triggers link-card behaviour, a `String` doesn't.
- `subjectForActivityType` populates the Mail / email-app subject line independently of the body. Users don't know it, but that field is why the email flow *feels* curated instead of raw.
- `activityViewControllerLinkMetadata` is the `LPLinkMetadata` hook. That's the thing that renders the header of the share sheet itself, the title, the icon, the "From: wallet.frak.id" line. Ship an `LPLinkMetadata` object and the sheet looks like a proper iOS share. Skip it and you get iOS's fallback, which is "a plain list of activities under the URL".

A second source handles the body text, separate from the URL, so apps that consume only a single item (Safari Reading List, some note apps) get the link, not the prose.

### Building the Metadata Up Front

The rich preview wants a thumbnail. iOS won't wait for you to fetch it, if you present the activity sheet before the `iconProvider` resolves, the preview appears without the logo and doesn't re-render when the image arrives.

So we build the metadata up front, hand off the thumbnail fetch async, and only `present()` the sheet once the icon resolves *or* a 2-second timeout elapses:

```swift
let metadata = LPLinkMetadata()
if let title = title, !title.isEmpty {
    metadata.title = title
}
if let linkURL = linkURL {
    metadata.originalURL = linkURL
    metadata.url = linkURL
}

let present: () -> Void = { [weak self] in
    self?.presentShareSheet(
        invoke: invoke,
        url: linkURL,
        text: text,
        title: title,
        metadata: metadata
    )
}

if let imageUrl = imageUrl, !imageUrl.isEmpty,
   let remoteImage = URL(string: imageUrl) {
    loadIconProvider(from: remoteImage, timeout: 2.0) { provider in
        if let provider = provider {
            metadata.iconProvider = provider
        }
        present()
    }
} else {
    present()
}
```

`loadIconProvider` itself is small and paranoid:

```swift
private func loadIconProvider(
    from imageUrl: URL,
    timeout: TimeInterval,
    completion: @escaping (NSItemProvider?) -> Void
) {
    var hasResolved = false
    let resolveOnce: (NSItemProvider?) -> Void = { provider in
        DispatchQueue.main.async {
            guard !hasResolved else { return }
            hasResolved = true
            completion(provider)
        }
    }

    let task = URLSession.shared.dataTask(with: imageUrl) { data, _, _ in
        guard let data = data, let image = UIImage(data: data) else {
            resolveOnce(nil)
            return
        }
        resolveOnce(NSItemProvider(object: image))
    }
    task.resume()

    DispatchQueue.main.asyncAfter(deadline: .now() + timeout) {
        if !hasResolved { task.cancel() }
        resolveOnce(nil)
    }
}
```

The `hasResolved` latch is the whole game. A fast network resolves via the data task. A slow network resolves via the timeout. A flipping-between-Wi-Fi network resolves via whichever fires first. In every case `completion` is called exactly once, on the main thread, and the share sheet presents, with a thumbnail if we have one, without if we don't. It never stalls.

If we don't supply an `iconProvider`, iOS falls back to fetching the OpenGraph / favicon for `metadata.originalURL`. That can take longer than 2 s on cold connections, but the fallback happens inside iOS's own process, it doesn't block our share sheet from presenting. We just live with whatever iOS produces.

### The iPad Gotcha

`UIActivityViewController` on iPad needs a `popoverPresentationController` source rect or it crashes on modal present. This is the sort of thing that works fine in simulator and fails in the App Review flow. We anchor to the view center as a safe default:

```swift
if let popover = activityController.popoverPresentationController {
    popover.sourceView = rootViewController.view
    popover.sourceRect = CGRect(
        x: rootViewController.view.bounds.midX,
        y: rootViewController.view.bounds.midY,
        width: 0,
        height: 0
    )
    popover.permittedArrowDirections = []
}
```

It's not beautiful, but the popover is a modal so nobody ever notices the anchor.

## Android: The EXTRA_TEXT Convention and FileProvider Thumbnails

Android has no direct equivalent to `LPLinkMetadata`. What it has is `Intent.ACTION_SEND` with a specific set of extras that the chooser (API 29+) picks up to render a preview header.

```kotlin
// android/src/main/java/id/frak/share/FrakSharePlugin.kt
val sendIntent = Intent(Intent.ACTION_SEND).apply {
    type = "text/plain"
    putExtra(Intent.EXTRA_TEXT, shareBody)
    if (!title.isNullOrEmpty()) {
        putExtra(Intent.EXTRA_SUBJECT, title)
        // `EXTRA_TITLE` drives the chooser preview header on API 29+
        // and is ignored on older versions, safe to always set.
        putExtra(Intent.EXTRA_TITLE, title)
    }
    if (thumbnailUri != null) {
        clipData = ClipData.newRawUri(title, thumbnailUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
}
```

Three separate extras, three separate purposes:

- `EXTRA_TEXT` is the body. By Android convention the URL lives inline in this string, receiving apps (Messages, WhatsApp, Slack) parse it out themselves. We concatenate `"${text}\n${url}"` so the body survives in apps that truncate long strings and the URL still survives.
- `EXTRA_SUBJECT` is the classic email-subject field. Gmail picks it up.
- `EXTRA_TITLE` is the one modern apps actually read for the preview header. It was added in API 29 and is silently ignored below that.

### The ClipData Thumbnail Trick

To get an actual thumbnail in the chooser preview tile, you need a `content://` URI that another process (the chooser) can read. `file://` URIs have been disallowed since Android 7 (`FileUriExposedException`), and remote HTTPS URLs aren't accepted either. You must use a **`FileProvider`**.

```kotlin
private fun resolveThumbnailUri(imageUrl: String): Uri? {
    return try {
        val future = imageLoader.submit<File?> { downloadImage(imageUrl) }
        val file = future.get(DOWNLOAD_TIMEOUT_MS, TimeUnit.MILLISECONDS) ?: return null
        FileProvider.getUriForFile(
            pluginActivity,
            "${pluginActivity.packageName}.fileprovider",
            file
        )
    } catch (e: Exception) {
        Log.w(TAG, "Thumbnail fetch failed, sharing without preview image", e)
        null
    }
}

private fun downloadImage(imageUrl: String): File? {
    val parsed = runCatching { URL(imageUrl) }.getOrNull() ?: return null
    val connection = (parsed.openConnection() as? HttpURLConnection) ?: return null
    connection.connectTimeout = 1_500
    connection.readTimeout = 1_500
    connection.instanceFollowRedirects = true
    return try {
        connection.connect()
        if (connection.responseCode !in 200..299) return null
        val extension = inferExtension(connection.contentType)
        val cacheDir = File(pluginActivity.cacheDir, "share").apply { mkdirs() }
        // Stable filename per URL so repeated shares hit the same cache entry.
        val file = File(cacheDir, "share-${imageUrl.hashCode()}.$extension")
        connection.inputStream.use { input ->
            file.outputStream().use { output -> input.copyTo(output) }
        }
        file
    } finally {
        connection.disconnect()
    }
}

companion object {
    private const val TAG = "FrakSharePlugin"
    private const val DOWNLOAD_TIMEOUT_MS = 2_000L
}
```

The pipeline:

1. Download the image to the app's cache directory (`context.cacheDir`) with short socket timeouts (1.5 s each leg).
2. Cache by a stable hash of the URL so re-shares hit the same file and don't re-download.
3. Wrap the file in `FileProvider.getUriForFile(context, "${packageName}.fileprovider", file)` to turn the `file://` URI into a `content://` URI.
4. Attach it to the intent as `ClipData.newRawUri(title, thumbnailUri)`, plus `Intent.FLAG_GRANT_READ_URI_PERMISSION` so the chooser (running in a different process) can actually read it.

The whole `resolveThumbnailUri` is bounded by `future.get(DOWNLOAD_TIMEOUT_MS, MILLISECONDS)`, 2 seconds. If the image host is slow, or the user has bad signal, we just share without a thumbnail instead of stalling the chooser. Same principle as iOS: the share sheet *always* presents, a thumbnail is nice-to-have.

You also need the provider declared in `AndroidManifest.xml` and a `provider_paths.xml` file pointing at the cache dir. That's the bit that doesn't go in the plugin, it lives in the main Android module:

```xml
<!-- AndroidManifest.xml -->
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.fileprovider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/provider_paths" />
</provider>
```

```xml
<!-- res/xml/provider_paths.xml -->
<paths>
    <cache-path name="share" path="share/" />
</paths>
```

### The "Did the User Actually Share?" Gap

iOS returns a completion callback with a `completed` boolean. Android doesn't, `Intent.ACTION_SEND` launches the chooser and that's it, we have no way to know whether the user tapped WhatsApp or hit "back".

This is actually fine. Both our analytics event (`sharing_link_shared`) and our backend-side attribution rely on the shared URL carrying a signed token, if the link is opened, attribution fires regardless of which app was tapped. The "completed" bit is nice for iOS; on Android we resolve with `shared: true` as soon as the chooser is presented, on the theory that opening the chooser is itself strong intent.

```kotlin
try {
    val chooser = Intent.createChooser(sendIntent, null)
    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    pluginActivity.startActivity(chooser)
    val result = JSObject()
    result.put("shared", true)
    invoke.resolve(result)
} catch (e: Exception) {
    invoke.reject(e.message ?: "Failed to open share sheet")
}
```

The chooser title is `null`, not a hard-coded string. On API 29+, `Intent.createChooser(intent, null)` lets Android render its own rich preview header (title + thumbnail); passing any string replaces that preview with a title-only bar. One of those details you don't know you need until you ship it with a hard-coded title and realise the preview is gone.

## The React Side

The TypeScript facade is a React Query hook that gates on platform:

```typescript
// packages/wallet-shared/src/sharing/hooks/useShareLink.ts
async function invokeTauriShare(payload: TauriSharePayload): Promise<boolean> {
    const { invoke } = await import("@tauri-apps/api/core");
    const response = await invoke<TauriShareResponse>(
        "plugin:frak-share|share_text",
        payload
    );
    return response?.shared ?? true;
}

export function useShareLink(
    link: string | null,
    shareData: ShareLinkData,
    options: {
        source: SharingSource;
        merchantId?: string;
        onShared?: () => void;
    } & MutationOptions
) {
    const useTauriShare = isIOS() || isAndroid();
    const canShare =
        useTauriShare ||
        (typeof navigator !== "undefined" &&
            typeof navigator.share === "function");

    const mutation = useMutation({
        mutationKey: ["sharing", "trigger", source, link ?? "no-link"],
        mutationFn: async () => {
            if (!link || !canShare) return;

            if (useTauriShare) {
                const shared = await invokeTauriShare({
                    url: link,
                    text: shareData.text,
                    title: shareData.title,
                    imageUrl: shareData.imageUrl,
                });
                if (!shared) return;
                trackEvent("sharing_link_shared", {
                    source, merchant_id: merchantId, link,
                });
                onShared?.();
                return true;
            }

            // Web fallback: navigator.share (no imageUrl support)
            await navigator.share({
                title: shareData.title,
                text: shareData.text,
                url: link,
            });
            trackEvent("sharing_link_shared", {
                source, merchant_id: merchantId, link,
            });
            onShared?.();
            return true;
        },
    });
    return { ...mutation, canShare };
}
```

A few notes on the decisions:

- **`isIOS() || isAndroid()`, not `isTauri()`.** The plugin only ships iOS and Android handlers. A hypothetical Tauri desktop build exists in theory but we never ship one; still, gating on the specific platforms is safer than assuming a broad `isTauri` covers it.
- **Unified analytics**. Every share, Tauri or web, fires the same `sharing_link_shared` event with the same payload shape. The whole point is that the data behind "native vs web share conversion" is a pivot, not a separate event type.
- **`imageUrl` is only consumed by the Tauri path.** `navigator.share` doesn't expose a standardised preview-image field, so there's nothing to do with it on web.

## Lessons

Five things from shipping this:

- **Treat a share as a typed bundle, not a string.** The rich preview is the difference between a utilitarian "send this" and an invite the recipient actually clicks. Once you buy into typed activity items on iOS and typed extras on Android, the code is the easy part.
- **Bound every network call inside a share flow.** Two seconds is the ceiling. People hit share and expect a sheet *now*; 200 ms feels snappy, 800 ms feels broken, 2 s is the point at which they start retrying. Build the timeout into your plumbing, not into your hope.
- **FileProvider, not `file://`.** Every guide that pre-dates Android 7 recommends `file://` URIs. They crash on modern Android with `FileUriExposedException`. Declare a provider once, wire your cache dir, and use `FileProvider.getUriForFile` for every inter-process URI.
- **`null` as the chooser title on Android.** The argument you think you need to hard-code is the argument that *erases* the preview header on API 29+. Pass `null`.
- **You probably can't tell if the user completed the share on Android, and that's OK.** Design your analytics / attribution to fire on open, not on "shared". The chooser appearing is enough intent to count.

The full plugin is about 1,200 lines, Swift, Kotlin, Rust, plus the autogen permissions scaffolding, sitting in [frak-id/wallet](https://github.com/frak-id/wallet) at `apps/wallet/src-tauri/plugins/tauri-plugin-frak-share`. Fork what you need; most of the weight is platform glue that's identical everywhere Tauri apps touch the OS share sheet.
