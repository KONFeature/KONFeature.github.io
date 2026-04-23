---
title: "A Tauri Plugin That Survives an App Uninstall: Passkey Continuity on iOS and Android"
subtitle: "iCloud KV + Keychain on iOS, Google Block Store + SharedPreferences on Android, and never storing anything sensitive"
description: "How we shipped a cross-platform Tauri plugin that persists a tiny recovery hint through app uninstalls and new-device setups, without ever touching a private key. A tour through NSUbiquitousKeyValueStore, iCloud Keychain, Google Block Store, and Android Auto Backup."
date: 2026-04-22T10:00:00Z
draft: false
category: "mobile"
group: "frak"
tags: ["Tauri", "Mobile", "iOS", "Android", "WebAuthn", "Passkey", "Keychain", "BlockStore", "Rust", "Kotlin", "Swift"]
icon: "shield-check"
iconColor: "text-indigo-400"
githubUrl: "https://github.com/frak-id/wallet"
---

A user downloads our wallet. Registers a passkey. Uses it for a week. Nukes the app. Reinstalls it a month later.

From their point of view, they have an account. From the app's point of view, the passkey is gone. Not the credential itself, iCloud Keychain and Credential Manager still have it, but every scrap of context we had about *which* credential to ask the OS for. The first screen is cold-start onboarding. "Create a wallet" instead of "Welcome back, Quentin."

This is the gap we spent a weekend closing. The fix is a Tauri mobile plugin that persists a tiny, deliberately non-sensitive hint through uninstalls, new-device restores, and the occasional rough flight between iCloud and Google accounts. None of it touches a private key. All of it survives the one thing `localStorage` and SQLite most emphatically do not: the OS nuking the app sandbox.

This is the story of the design, and of the weird little corners of `NSUbiquitousKeyValueStore`, `keychain-access-groups`, Google's Block Store, and Android Auto Backup that make it actually work.

## The Problem: Passkeys Are Device-Bound, But the Chrome Around Them Isn't

A passkey (our [WebAuthn-backed smart-wallet authenticator](./native-webauthn-tauri-plugin-ios-android)) is already a cloud-synced credential in 2026. iCloud Keychain syncs across Apple devices. Credential Manager + Google Password Manager syncs across Android devices. The actual cryptographic material survives a wipe.

What doesn't survive is the app's *view* of that credential. Specifically:

- The **`credentialId`** we need to request during `get()`, without it, WebAuthn falls back to a generic passkey picker and the UX immediately feels wrong.
- The **wallet address** derived from the authenticator's public key. Our wallets are [deterministically derived from the WebAuthn public key](/articles/frak/4337-webauthn), so the address exists on-chain regardless of the app, but the app doesn't know it yet.
- The **last-login timestamp**, which we use to decide between "Welcome back" and "Resume onboarding".

None of this is sensitive. The `credentialId` is public by WebAuthn spec, our backend already knows every ID we ever issued. The wallet address is public on-chain. The timestamp is a millisecond.

So the question becomes: *where do we stash three strings so that they outlive an uninstall, ride along with the user to a new phone, and require zero friction to restore?*

The answer is different on each platform. Both answers have fallbacks. Here's the plugin.

## Plugin Anatomy

The Rust side is intentionally bare, it's a pass-through to the mobile implementations. Same pattern as [our native WebAuthn plugin](./native-webauthn-tauri-plugin-ios-android): register the iOS + Android sides under `#[cfg(mobile)]`, no-op on desktop.

```rust
// apps/wallet/src-tauri/plugins/tauri-plugin-recovery-hint/src/lib.rs
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("recovery-hint")
        .setup(|_app, _api| {
            #[cfg(mobile)]
            mobile::init(_app, _api)?;
            Ok(())
        })
        .build()
}
```

```rust
// src/mobile.rs
#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.plugin.recovery_hint";

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_recovery_hint);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "android")]
    api.register_android_plugin(PLUGIN_IDENTIFIER, "RecoveryHintPlugin")?;
    #[cfg(target_os = "ios")]
    api.register_ios_plugin(init_plugin_recovery_hint)?;
    Ok(())
}
```

The data shape is equally boring:

```rust
// src/models.rs
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RecoveryHint {
    #[serde(rename = "lastAuthenticatorId")]
    pub last_authenticator_id: Option<String>,
    #[serde(rename = "lastWallet")]
    pub last_wallet: Option<String>,
    #[serde(rename = "lastLoginAt")]
    pub last_login_at: Option<i64>,
}
```

Under 256 bytes of JSON in the wild. The platforms do the heavy lifting.

## iOS: `NSUbiquitousKeyValueStore` Primary, `kSecAttrSynchronizable` Keychain Fallback

`NSUbiquitousKeyValueStore` is the iCloud key-value store most developers forget exists. It's a dictionary-like API that Apple backs with iCloud KV, which silently falls back to an on-disk cache when the user is signed out of iCloud. Values sync across devices, and, critically, they survive an uninstall-reinstall on the same device because the cache lives outside the app sandbox.

```swift
// ios/Sources/RecoveryHintPlugin.swift
class RecoveryHintPlugin: Plugin {
    private let kvStore = NSUbiquitousKeyValueStore.default
    private let storageKey = "frak.wallet.recovery_hint.v1"
    private let keychainService = "id.frak.wallet.recovery-hint"

    override init() {
        super.init()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onICloudKVChangedExternally(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: kvStore
        )
        kvStore.synchronize()
    }
```

The `didChangeExternallyNotification` observer isn't load-bearing, we don't cache locally, `getRecoveryHint` re-reads every time, but it's invaluable when debugging sync propagation through TestFlight. You learn fast that iCloud KV syncs "eventually" in a way that makes "eventually consistent" look precise.

### The Dual-Write Pattern

Write to both, read from either. That's the whole contract:

```swift
@objc public func getRecoveryHint(_ invoke: Invoke) {
    let hint: JsonObject = readFromICloudKV() ?? readFromKeychain() ?? [:]
    invoke.resolve(hint)
}

@objc public func setRecoveryHint(_ invoke: Invoke) {
    do {
        let args = try invoke.parseArgs(RecoveryHintArgs.self)
        let dict = args.toDictionary()
        // Reject empty payloads so a caller that accidentally sends
        // `{}` doesn't clobber a previously-persisted hint.
        guard !dict.isEmpty else {
            invoke.reject("Refusing to persist an empty recovery hint")
            return
        }
        let kvOk = writeToICloudKV(dict)
        let kcOk = writeToKeychain(dict)
        if !kvOk && !kcOk {
            invoke.reject("Failed to persist recovery hint to any backing store")
            return
        }
        invoke.resolve()
    } catch {
        invoke.reject("Failed to set recovery hint: \(error.localizedDescription)")
    }
}
```

A few things worth calling out in those thirty lines:

**The empty-payload guard.** `guard !dict.isEmpty else { reject }` is not paranoia, it's the most painful bug I nearly shipped. A caller that builds a hint with a missing field, runs it through `JSONEncoder`, and invokes `set({})` would silently wipe a perfectly good hint. A single null reference in the TypeScript facade upstream becomes an unrecoverable regression for every active user. So the native plugin refuses.

**Dual-write, OR-read.** Each backend can fail independently. iCloud KV can be unavailable (user signed out, on a device without an Apple ID). Keychain writes can fail under weird memory conditions. As long as one succeeds, we resolve; on read, either backend satisfies the query. This is the cheapest redundancy in the world because both APIs are local and fast.

**`kSecAttrSynchronizable`.** This is the magic that turns the Keychain into a second iCloud backend:

```swift
private func keychainBaseQuery() -> [String: Any] {
    return [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: keychainService,
        kSecAttrAccount as String: storageKey,
        kSecAttrSynchronizable as String: kCFBooleanTrue as Any,
    ]
}
```

`kSecAttrSynchronizable` opts this keychain entry into **iCloud Keychain sync**. Paired with `kSecAttrAccessibleAfterFirstUnlock`, it reads after the device is unlocked once per boot, survives uninstalls, and syncs to new devices when the user restores via Quick Start or iCloud.

### Required Entitlements (The Bit Nobody Documents)

Getting iCloud KV + synchronizable Keychain working in a Tauri iOS bundle requires both entitlements and provisioning-profile changes. Getting it *wrong* manifests as silent `kvStore.synchronize()` returning `false` and `SecItemAdd` returning `errSecNotAvailable`. No log, no crash, just an empty read months later.

```xml
<!-- src-tauri/gen/apple/app_iOS/app_iOS.entitlements -->
<key>com.apple.developer.ubiquity-kvstore-identifier</key>
<string>$(TeamIdentifierPrefix)id.frak.wallet</string>

<key>keychain-access-groups</key>
<array>
    <string>$(AppIdentifierPrefix)id.frak.wallet</string>
</array>
```

Then in the Apple Developer Portal:

1. Enable the **iCloud** capability on the App ID (no container needed, iCloud KV uses the App ID as its key space).
2. Enable **Key-value storage** specifically.
3. Regenerate the provisioning profile. This is the step that ate an afternoon.

iCloud KV caps values at 1 MB total per app and 1024 keys. Our payload is `< 256 B` one key, we're approximately 0.025% into the quota. Not going to be a problem.

## Android: Google Block Store Primary, `SharedPreferences` with Auto Backup Fallback

On Android the equivalent-spiritually-but-not-API-wise of iCloud KV is **Block Store**. It's Google's "persist a few tiny bytes across uninstalls, restore on device setup" API, with optional end-to-end encryption and Google Play Services as the wire.

```kotlin
// android/src/main/java/com/plugin/recovery_hint/RecoveryHintPlugin.kt
@TauriPlugin
class RecoveryHintPlugin(private val activity: Activity) : Plugin(activity) {
    private val tag = "RecoveryHintPlugin"
    private val storageKey = "frak.wallet.recovery_hint.v1"
    private val prefsFile = "frak.wallet.recovery_hint"
    // SupervisorJob so one coroutine failure doesn't cancel the whole scope.
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /** Lazy because instantiation touches Google Play Services. */
    private val client: BlockstoreClient by lazy { Blockstore.getClient(activity) }
    private val prefs: SharedPreferences by lazy {
        activity.getSharedPreferences(prefsFile, Context.MODE_PRIVATE)
    }

    private val isBlockStoreAvailable: Boolean by lazy {
        val status = GoogleApiAvailability.getInstance()
            .isGooglePlayServicesAvailable(activity)
        status == ConnectionResult.SUCCESS
    }
```

Block Store writes look like this:

```kotlin
private suspend fun writeToBlockStore(payload: ByteArray): Boolean {
    return try {
        // Gate cloud backup on E2EE availability. If E2EE isn't
        // available we still write locally but don't opt into
        // cloud backup, the hint is non-sensitive but there's no
        // reason to ship it to Google in the clear.
        val e2eeAvailable = try {
            client.isEndToEndEncryptionAvailable().await()
        } catch (e: Exception) {
            false
        }
        val data = StoreBytesData.Builder()
            .setKey(storageKey)
            .setBytes(payload)
            .setShouldBackupToCloud(e2eeAvailable)
            .build()
        client.storeBytes(data).await()
        true
    } catch (e: Exception) {
        Log.w(tag, "Block Store write failed", e)
        false
    }
}
```

The `e2eeAvailable` gate is worth explaining. Block Store will back the entry up to the user's Google account by default, but we wanted the guarantee that the hint *never* leaves the device without end-to-end encryption. `isEndToEndEncryptionAvailable()` returns `true` only when the user has a lock screen set up and is on Android 9+ with a supported device. If it's `false`, we still write locally (survives uninstalls on the same device via Block Store's own restore path), but we refuse to ship it upstream. The hint is non-sensitive, but there's no reason to relax the stance.

Block Store caps us at **16 entries, 4 KB per entry**. We use one entry, about 256 bytes.

### The Fallback Most Android Devs Don't Reach For

The commercially relevant edge cases on Android are not "Google Pixel with latest Play Services". They're Huawei (no Google Play Services), Amazon Fire Tablet (no GPS), and custom ROMs. For those, Block Store's `client.storeBytes()` throws before we get anywhere near the network.

So we write to `SharedPreferences` in parallel, and opt that preferences file into **Android Auto Backup**. That's the under-loved API that gives you 25 MB of cloud-backed storage per app, restored on reinstall if the user has backup enabled.

```xml
<!-- res/xml/backup_rules.xml -->
<full-backup-content>
    <include domain="sharedpref" path="frak.wallet.recovery_hint.xml" />
</full-backup-content>
```

Plus the partner file `data_extraction_rules.xml` for Android 12+'s stricter D2D transfer rules, and `android:allowBackup="true"` in the `AndroidManifest.xml`. With those three bits wired up, SharedPreferences survives uninstall on the same device, and opts into **Device-to-Device transfer** (the "set up new phone from old phone" flow) even when the user has cloud backup disabled.

That's the whole fallback:

```kotlin
private fun writeToPrefs(json: JSONObject): Boolean {
    return try {
        prefs.edit().putString(storageKey, json.toString()).apply()
        true
    } catch (e: Exception) {
        Log.w(tag, "SharedPreferences write failed", e)
        false
    }
}
```

The read side prioritises Block Store (cloud-synced, cross-device) and only falls through to prefs if Block Store returned null:

```kotlin
@Command
fun getRecoveryHint(invoke: Invoke) {
    scope.launch {
        val blockStoreJson = if (isBlockStoreAvailable) readFromBlockStore() else null
        val json = blockStoreJson ?: readFromPrefs()
        val result = json?.let { jsonToJSObject(it) } ?: JSObject()
        invoke.resolve(result)
    }
}
```

## The TypeScript Facade

Everything above is an implementation detail behind a ten-line public API. The facade is intentionally boring:

```typescript
// packages/wallet-shared/src/common/storage/recoveryHint.ts
export type RecoveryHint = {
    lastAuthenticatorId?: string;
    lastWallet?: Address;
    lastLoginAt?: number;
};

export const recoveryHintStorage = {
    async get(): Promise<RecoveryHint> {
        if (!isTauri()) return {};
        try {
            return await tauriInvoke<RecoveryHint>(INVOKE_GET);
        } catch (err) {
            console.warn("recoveryHintStorage.get failed", err);
            return {};
        }
    },

    async set(hint: RecoveryHint): Promise<void> {
        if (!isTauri()) return;
        try {
            const current = await recoveryHintStorage.get();
            // Missing fields are left untouched so callers can
            // update a single field without re-reading the whole hint.
            const merged: RecoveryHint = { ...current, ...hint };
            await tauriInvoke<void>(INVOKE_SET, merged);
        } catch (err) {
            console.warn("recoveryHintStorage.set failed", err);
        }
    },

    async clear(): Promise<void> {
        if (!isTauri()) return;
        try {
            await tauriInvoke<void>(INVOKE_CLEAR);
        } catch (err) {
            console.warn("recoveryHintStorage.clear failed", err);
        }
    },
};
```

Three things are worth noticing:

- **`isTauri()` guard, not `isMobile()`**. The native plugin is registered under `#[cfg(mobile)]`; on web / desktop Tauri builds there is no handler and the invocation would throw "command not found". We catch it anyway, but the short-circuit keeps errors out of the console on web.
- **Merge-on-set.** A caller updating only `lastLoginAt` shouldn't nuke `lastAuthenticatorId`. Reading current + merging means the native plugin only ever sees a full payload, which lets the native `empty-clobber` guard stay strict.
- **Every error is swallowed into `console.warn`.** The recovery hint is an optimisation, not a correctness-critical path. A failure means the next login shows "Create a wallet" instead of "Welcome back", an annoyance, not a bug worth surfacing to the user.

## Wiring It Up

Two call sites, both obvious once the facade exists:

```typescript
// On successful register or login:
await recoveryHintStorage.set({
    lastAuthenticatorId: authenticatorId,
    lastWallet: wallet,
    lastLoginAt: Date.now(),
});
```

```typescript
// On the login route, before showing the "Create a wallet" copy:
const hint = await recoveryHintStorage.get();
if (hint.lastAuthenticatorId) {
    // Welcome back, resume the recovery flow with a pre-filled credentialId
}
```

In practice the hint drives a small hook (`useLastAuthenticatorHint`) that the register and login routes both consume. It's the difference between a generic "Sign in or create" screen and "Welcome back, your last wallet is `0x8A…3F`", which, on a mobile wallet, is the difference between "I'll figure this out later" and "one tap to resume".

## Threat Model

Writing this article I went back and forth on how much to explain this, because the answer is blunter than it usually needs to be.

- **The hint is non-sensitive.** `credentialId`s are public WebAuthn artifacts, our backend knows every one we've ever issued. Wallet addresses are public on-chain. The only private-feeling piece is the timestamp, and even that is best-effort.
- **Both backends encrypt at rest.** iCloud KV is APNs-encrypted in transit and at rest. Block Store entries are wrapped by the Android Keystore, and we gate cloud backup on E2EE availability so Google never sees plaintext.
- **We never log or ship the hint to our servers.** It only ever transits between the OS's KV store and the app.
- **Shared Apple ID / Google account leaks the hint.** This is the same trust model as every other iCloud KV or Block Store app. A user who shares their account with someone else will leak the previous authenticator ID to that second person. Knowing an ID doesn't grant access, WebAuthn credentials are device-bound, they still need Face ID / biometric on the device holding the credential, but the *identity* bleeds. We document this in the privacy policy and call it a feature, because it's the whole point: a new device, same Apple ID, same user.
- **On explicit logout we call `recoveryHintStorage.clear()`**, which removes the hint from both backends. An unauth'd user gets a clean slate.

## Lessons

Five things I'd tell past-me on day one:

- **Dual-write, OR-read, reject-empty.** This triplet is the design pattern. Any single backend can fail, and any single caller can glitch. The combination means neither kills you.
- **The hardest part is entitlements and provisioning profiles.** The code took a day; the Apple Developer Portal took an afternoon and three regenerated provisioning profiles. Document this once and write the checklist.
- **`didChangeExternallyNotification` is TestFlight gold.** iCloud KV sync looks broken until you instrument it. With the observer logging reasons, you can distinguish "not synced yet" from "actually not syncing" within five minutes instead of five hours.
- **Don't write on every state change.** The hint is effectively immutable for the lifetime of a wallet. Writing on `register_succeeded` and `login_succeeded` is enough; chasing every state tick adds iCloud traffic nobody needs and fights the throttling both platforms do anyway.
- **Ship it behind a fallback, not behind a flag.** Our web and desktop builds call the same `recoveryHintStorage` functions. They no-op. The code paths that consume them just see an empty hint and fall back to "Create a wallet" gracefully. No platform switches, no UI branches, no flags to tombstone later.

The full plugin is in [frak-id/wallet](https://github.com/frak-id/wallet) under `apps/wallet/src-tauri/plugins/tauri-plugin-recovery-hint`, ~1,100 lines, including Kotlin + Swift + Rust + permissions autogen. Seven files do the real work; the rest is boilerplate. If you're building a Tauri mobile app with any notion of "the user had an account before" that needs to survive an uninstall, fork it. That's what it's there for.
