---
title: "Writing a Native WebAuthn Tauri Plugin from Scratch (iOS + Android)"
subtitle: "Replacing simplewebauthn with platform-native passkey APIs — and surviving iOS attestation objects"
description: "A step-by-step look at building a custom Tauri plugin for WebAuthn/passkeys on iOS and Android — including CBOR parsing, COSE key extraction, SPKI DER reconstruction, and the mobile dev TLS workaround."
date: 2026-03-30T12:00:00Z
category: "mobile"
group: "frak"
tags: ["tauri", "webauthn", "passkeys", "ios", "android", "rust", "swift", "kotlin", "mobile"]
icon: "lock"
iconColor: "text-indigo-400"
githubUrl: "https://github.com/frak-id/wallet"
---

The 388-line CBOR parser was the first sign something had gone wrong architecturally.

It lived in `wallet-shared/src/coseParser.ts`, shipped with 277 lines of tests, and existed for one reason: `simplewebauthn` returns a full WebAuthn response including attestation objects, and when you're running inside a Tauri WebView on iOS, the `tauri://localhost` origin breaks passkey registration entirely. The workaround was to intercept the native credential, manually decode the CBOR-encoded attestation object, extract the P-256 public key, repackage everything, and hand it to your smart contract. Functional. Fragile. A foot-gun pointed at anyone who touched it next.

The real problem was that we weren't using platform APIs at all. We were shimming WebAuthn through a JavaScript library inside a WebView, then parsing the results in TypeScript. On mobile, that's the wrong layer to be at. iOS has `ASAuthorizationController`. Android has `CredentialManager`. Both give you native passkey UX, correct origin binding, and — crucially — structured response objects you can trust. The question was whether I could expose them through a custom Tauri plugin without losing my mind.

There's almost no documentation on writing Tauri plugins that talk to native mobile APIs. The official guides cover desktop plugins. For mobile you get a handful of examples in the Tauri repo and a lot of reading Swift/Kotlin source code hoping the patterns transfer. Here's everything I learned doing it.

## The Plugin Skeleton

Tauri mobile plugins follow a specific structure. The Rust side is thin — it registers commands and delegates to platform-specific implementations. The actual logic lives in Swift (iOS) or Kotlin (Android).

The plugin directory layout:

```
tauri-plugin-frak-webauthn/
├── Cargo.toml
├── build.rs
├── src/lib.rs
├── src/mobile.rs
├── android/
│   ├── build.gradle.kts
│   └── FrakWebauthnPlugin.kt
├── ios/
│   ├── Package.swift
│   └── FrakWebauthnPlugin.swift
└── .tauri/tauri-api/
```

`build.rs` registers commands so Tauri knows what to expose:

```rust
const COMMANDS: &[&str] = &["register", "authenticate"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
```

The Rust entry point in `lib.rs` is deliberately minimal:

```rust
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("frak-webauthn")
        .setup(|_app, _api| {
            #[cfg(mobile)]
            mobile::init(_app, _api)?;
            Ok(())
        })
        .build()
}
```

No desktop implementation — this plugin is mobile-only. The `#[cfg(mobile)]` gate means the desktop build compiles fine but the setup does nothing. On desktop, the wallet uses the WebView's native WebAuthn via the browser stack, which works correctly there.

`src/mobile.rs` handles the platform dispatch:

```rust
#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "id.frak.webauthn";

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_frak_webauthn);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "android")]
    api.register_android_plugin(PLUGIN_IDENTIFIER, "FrakWebauthnPlugin")?;
    #[cfg(target_os = "ios")]
    api.register_ios_plugin(init_plugin_frak_webauthn)?;
    Ok(())
}
```

`ios_plugin_binding!` generates an extern C function that Tauri's iOS runtime calls to initialize the plugin. The Android identifier maps to the Kotlin class. This is pure plumbing — copy it and move on.

The `.tauri/tauri-api/` directory contains Swift API stubs that Tauri generates. You need those for the iOS Swift package to compile against the Tauri runtime types. If you're building from scratch inside a monorepo rather than using `tauri plugin new`, copy the pattern from `tauri-plugin-barcode-scanner`.

## Android: Surprisingly Boring (That's a Compliment)

The Android side took about 80 lines of Kotlin. `CredentialManager` does exactly what you want and the JSON protocol maps cleanly to WebAuthn.

```kotlin
@TauriPlugin
class FrakWebauthnPlugin(activity: Activity) : Plugin(activity) {
    private val scope = CoroutineScope(Dispatchers.Main)
    private val credentialManager = CredentialManager.create(activity)

    @Command
    fun register(invoke: Invoke) {
        val options = invoke.getArgs().getJSObject("options") ?: run {
            invoke.reject("Missing 'options' parameter"); return
        }
        val request = CreatePublicKeyCredentialRequest(requestJson = options.toString())
        scope.launch {
            try {
                val result = credentialManager.createCredential(pluginActivity, request)
                    as CreatePublicKeyCredentialResponse
                val obj = JSObject(result.registrationResponseJson)
                invoke.resolve(obj)
            } catch (e: Exception) {
                invoke.reject(e.message ?: "Registration failed")
            }
        }
    }
}
```

The critical thing: `registrationResponseJson` includes `publicKey` in the response. That's the public key as a standard base64url-encoded SPKI structure. You get it for free. No CBOR parsing. No attestation object spelunking. Pass it through to your TypeScript layer and you're done.

`build.gradle.kts` needs two dependencies:

```kotlin
dependencies {
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
}
```

## iOS: Where Things Get Interesting

iOS was 211 lines of Swift. The surface-level structure mirrors Android — `ASAuthorizationController` with a delegate, `ASAuthorizationPlatformPublicKeyCredentialProvider` for the credential type. The async pattern is what trips you up first.

Tauri's `Invoke` object isn't `Sendable` in Swift's concurrency model, which means you can't capture it in an `async` context or hand it to a delegate directly. The pattern that works: store the pending invoke as an instance variable, fire the authorization controller, resolve or reject from the delegate callbacks.

```swift
class FrakWebauthnPlugin: Plugin, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding {

    private var pendingInvoke: Invoke?

    @objc public func register(_ invoke: Invoke) {
        guard #available(iOS 16.0, *) else {
            invoke.reject("Passkeys require iOS 16+")
            return
        }
        // parse args, build request...
        pendingInvoke = invoke
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let cred = authorization.credential
            as? ASAuthorizationPlatformPublicKeyCredentialRegistration else {
            pendingInvoke?.reject("Unexpected credential type")
            pendingInvoke = nil
            return
        }
        let response: [String: Any] = [
            "id":               cred.credentialID.base64URLEncodedString(),
            "rawId":            cred.credentialID.base64URLEncodedString(),
            "type":             "public-key",
            "response": [
                "clientDataJSON":    cred.rawClientDataJSON.base64URLEncodedString(),
                "attestationObject": cred.rawAttestationObject!.base64URLEncodedString(),
            ]
        ]
        pendingInvoke?.resolve(response)
        pendingInvoke = nil
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        pendingInvoke?.reject(error.localizedDescription)
        pendingInvoke = nil
    }
}
```

The `base64URLEncodedString()` helpers are extensions you have to write yourself. `Foundation`'s `base64EncodedString()` produces standard Base64 with padding. WebAuthn expects base64url — no padding, `+` to `-`, `/` to `_`:

```swift
extension Data {
    func base64URLEncodedString() -> String {
        return base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
```

## The Origin Problem

Here's the first non-obvious thing that breaks silently: iOS passkeys are bound to an RP ID, and the origin embedded in `clientDataJSON` is `https://${rpId}` — not `tauri://localhost`, not your server URL. If your rpId is `wallet.frak.id`, iOS will embed `https://wallet.frak.id` as the origin, regardless of what the WebView thinks the current URL is.

This is actually correct behavior per the WebAuthn spec. It's also what makes passkeys portable to the web — credentials registered in the native iOS app are accessible from `https://wallet.frak.id` in Safari, synced via iCloud Keychain. But it means:

1. Your WebAuthn server's origin validation must allow `https://your-rp-id` from mobile registrations.
2. Your Associated Domains entitlement must be configured correctly.

The `tauriBridge.ts` that was doing origin rewriting dropped from 219 lines to 64 after I understood this. Most of the code was compensating for the wrong mental model.

## The Attestation Object Problem

This one doesn't break with an error. It breaks by returning `undefined` where you expected a public key, or by your smart contract rejecting a valid signature.

Notice what's missing from the iOS response above: `publicKey`. The W3C spec defines a `publicKey` field in `AuthenticatorAttestationResponse`, but `ASAuthorizationPlatformPublicKeyCredentialRegistration` doesn't expose it as a separate property. Android's `CredentialManager` includes it directly in the JSON. iOS gives you `rawAttestationObject` — a CBOR-encoded blob — and nothing else.

The attestation object structure: CBOR map to `authData` key to authenticator data binary: 32 bytes RP ID hash, 1 byte flags, 4 bytes sign count, 16 bytes AAGUID, 2 bytes credential ID length, credential ID, then the COSE-encoded public key.

A full CBOR parser handles this correctly. I had one. It was 388 lines. I deleted it.

For P-256 keys — which is all platform authenticators (Apple Secure Enclave, Android StrongBox) support — you don't need a general CBOR parser. You're looking for two 32-byte byte strings tagged with specific COSE map labels:

- `0x21` (CBOR encoding of -2) — x coordinate
- `0x22` (CBOR encoding of -3) — y coordinate

In CBOR, a 32-byte byte string encodes as `0x58 0x20` followed by the 32 bytes. So the x coordinate pattern in the raw binary is `[0x21, 0x58, 0x20, <32 bytes>]`. Byte-scan for it:

```ts
function findCoseCoordinate(data: Uint8Array, label: number): Uint8Array | null {
  const needle = [label, 0x58, 0x20];
  for (let i = 0; i <= data.length - 3 - 32; i++) {
    if (data[i] === needle[0] && data[i+1] === needle[1] && data[i+2] === needle[2]) {
      return data.slice(i + 3, i + 3 + 32);
    }
  }
  return null;
}
```

Once you have x and y, reconstruct the SPKI DER format that `SubtleCrypto.importKey('spki', ...)` expects. For P-256, it's always the same 26-byte header followed by `0x04` (uncompressed point prefix), then x, then y:

```ts
const SPKI_P256_HEADER = new Uint8Array([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
  0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03,
  0x42, 0x00,
]);

function extractSpkiFromAttestation(attestationObjectB64: string): ArrayBuffer | null {
  const data = new Uint8Array(fromBase64Url(attestationObjectB64));
  const x = findCoseCoordinate(data, 0x21); // COSE -2
  const y = findCoseCoordinate(data, 0x22); // COSE -3
  if (!x || !y) return null;
  const spki = new Uint8Array(SPKI_P256_HEADER.length + 1 + 32 + 32);
  spki.set(SPKI_P256_HEADER);
  spki[SPKI_P256_HEADER.length] = 0x04; // uncompressed point prefix
  spki.set(x, SPKI_P256_HEADER.length + 1);
  spki.set(y, SPKI_P256_HEADER.length + 1 + 32);
  return spki.buffer;
}
```

The 26-byte `SPKI_P256_HEADER` is the fixed DER encoding of the SubjectPublicKeyInfo structure for P-256 — the OID sequence for EC public keys and the P-256 curve. It's identical for every P-256 key. The resulting 91-byte buffer is valid SPKI DER that `SubtleCrypto` accepts, and it matches what Android returns directly in its registration JSON.

This approach won't work for Ed25519 or P-384. For platform authenticators using Apple Secure Enclave or Android StrongBox, P-256 is the only option, so it's fine.

The old 388-line CBOR parser and its 277 test lines are gone. This is the replacement.

## The mkcert Problem in Mobile Dev

One last thing that doesn't surface a clear error: the dev server uses `mkcert` for local HTTPS. Your OS trust store has the mkcert CA installed. iOS Simulator and Android Emulator don't. Every HTTPS request from the mobile WebView fails silently or with a generic network error.

The fix is to run a plain HTTP mirror of the dev backend on a second port. In the backend (Bun.serve):

```ts
if (isRunningLocally && tls) {
  const httpPort = 3031;
  Bun.serve({ port: httpPort, fetch: app.fetch });
  log.info(`HTTP mirror for mobile dev at http://localhost:${httpPort}`);
}
```

In the Tauri dev script, add ADB reverse for that port:

```bash
adb reverse tcp:3031 tcp:3031
```

Set `BACKEND_URL=http://localhost:3031` in Tauri's mobile dev config and remove the `getLocalIp()` utility entirely. ADB reverse handles the tunnel to the Android emulator. iOS Simulator maps `localhost` to the Mac loopback automatically. You never need to know your LAN IP again.

The result: a native passkey flow on both platforms, a `tauriBridge.ts` that fits in 64 lines instead of 219, no CBOR library, and passkeys that work identically in the iOS app and on the web.
