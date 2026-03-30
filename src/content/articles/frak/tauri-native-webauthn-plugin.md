---
title: "Writing a Native WebAuthn Tauri Plugin from Scratch (iOS + Android)"
date: 2026-03-30T12:00:00Z
draft: false
category: "mobile"
tags: ["Tauri", "WebAuthn", "iOS", "Android", "Rust", "React", "Native Plugin", "CBOR", "Attestation"]
icon: "fingerprint"
iconColor: "text-purple-400"
description: "Building a native Tauri plugin for WebAuthn on iOS and Android — CBOR attestation parsing, x9.62 vs DER key formats, and the platform gaps that simplewebauthn doesn't tell you about."
githubUrl: "https://github.com/frak-id/wallet"
group: "frak"
---

There's almost nothing written about native WebAuthn bridging in Tauri — and iOS attestation edge cases are hell to debug without documentation.

When we started porting the Frak smart wallet (ERC-4337) to mobile, the goal was simple: take our working web-based WebAuthn implementation and drop it into Tauri. On desktop, `simplewebauthn` works flawlessly. You call the standard web APIs, the browser handles the biometric prompt, and you get back an attestation object.

But on iOS and Android inside a Tauri WebView? Not so fast.

I ended up ripping out our `simplewebauthn`-based Tauri plugin and writing a custom native implementation from scratch. Here's why the standard approach broke, the CBOR parsing nightmare that followed on iOS, and how the TypeScript bridge actually works under the hood.

## The Problem With WebAuthn in Mobile WebViews

In a desktop browser, WebAuthn is a first-class citizen. `navigator.credentials.create()` is natively supported.

When you wrap your app in Tauri on mobile, you are running inside WKWebView (iOS) or WebView (Android). Historically, WKWebView did not fully support the WebAuthn API or, if it did, it was notoriously flaky depending on the iOS version and whether it was an App Store app vs. a PWA.

The initial approach was to rely on a polyfill or a generic Tauri plugin. But `simplewebauthn` expects standard web API responses. When you bridge native iOS `ASAuthorizationPlatformPublicKeyCredentialProvider` or Android's Credential Manager to JavaScript, you don't magically get a perfect `AuthenticatorAttestationResponse`. You get raw bytes that you have to format yourself.

I realized quickly that trying to shim the native responses to perfectly match the W3C spec just so `simplewebauthn` would accept them was a losing battle. The error messages were opaque. It was time to go native.

## iOS Attestation: The CBOR parsing nightmare

The biggest hurdle was the iOS attestation object.

When you create a passkey on iOS natively, Apple's API gives you an `attestationObject`. According to the WebAuthn spec, this is a CBOR-encoded buffer containing the authenticator data and the attestation statement.

Our backend needed the public key to verify future signatures. Simple, right? Parse the CBOR, extract the public key.

Except, Apple doesn't just hand you a standard DER-encoded SPKI public key. The credential's public key inside the authenticator data is formatted as an EC2 key (x9.62 format) embedded deep within the CBOR structure.

Here is what you actually have to do to get the public key out of the iOS response in Swift:

1. Receive the `attestationObject` from `ASAuthorizationPlatformPublicKeyCredentialRegistration`.
2. Realize there is no built-in Swift library for parsing CBOR that doesn't add massive bloat.
3. Manually parse the CBOR or use a minimal, audited Rust crate bridged via Tauri to handle it.

We opted to handle the heavy lifting in Rust. Tauri's architecture is perfect for this: Swift handles the UI prompt, passes the raw bytes to Rust, and Rust uses robust libraries like `ciborium` or `serde_cbor` to tear it apart.

### The x9.62 vs DER Surprise

Once we extracted the public key bytes from the CBOR, the backend rejected it.

Our backend was expecting a DER-encoded SubjectPublicKeyInfo (SPKI) format. The bytes we pulled from the iOS authenticator data were in x9.62 raw format (a standard `0x04` prefix followed by the 32-byte X and 32-byte Y coordinates for P-256).

We had to add a translation layer. Either the mobile client had to wrap the x9.62 key in ASN.1 DER formatting before sending it, or the backend had to recognize the format. We ultimately updated our backend certificate parsing to handle both formats, which I'll cover later. But tracing a "Signature Invalid" error down to a missing ASN.1 header was two days of my life I'm not getting back.

## Building the Tauri Native Plugin

Tauri v2's plugin system is phenomenal for this. It allows you to write Swift for iOS, Kotlin for Android, and tie them together with a unified Rust API.

### The Rust Command Layer

The Rust layer acts as the traffic cop. It defines the commands the frontend can call and routes them to the platform-specific code.

```rust
// src/commands.rs (Rust)
#[tauri::command]
pub async fn create_credential<R: Runtime>(
    app: tauri::AppHandle<R>,
    options: CreateCredentialOptions,
) -> Result<CredentialResponse, String> {
    // This delegates to the platform-specific implementation
    crate::mobile::create_credential(app, options)
        .map_err(|e| e.to_string())
}
```

### The Swift Implementation (iOS)

On iOS, we tap into `AuthenticationServices`. The code has to conform to `ASAuthorizationControllerDelegate` to receive the callbacks.

```swift
// ios/Plugin/WebAuthnPlugin.swift
@available(iOS 15.0, *)
func createCredential(options: CreateOptions) {
    let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: options.rpId)
    let request = provider.createCredentialRegistrationRequest(
        challenge: options.challenge,
        name: options.userName,
        userID: options.userId
    )
    
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    controller.performRequests()
}
```

When the delegate receives `authorizationController(controller:didCompleteWithAuthorization:)`, we extract the `rawAttestationObject` and the `credentialID`, base64url encode them, and shoot them back to Rust.

### The Kotlin Implementation (Android)

Android was a different beast entirely. We had to use the relatively new `CredentialManager` API, which unifies passkeys and saved passwords.

```kotlin
// android/src/main/java/id/frak/webauthn/WebAuthnPlugin.kt
val createPublicKeyCredentialRequest = CreatePublicKeyCredentialRequest(
    requestJson = optionsJson // Android expects the W3C JSON format!
)

credentialManager.createCredential(
    context,
    createPublicKeyCredentialRequest
)
```

Notice the difference? iOS wants specific fields (challenge, name, id) fed into a builder. Android wants the entire W3C standard JSON string passed directly into the request. This discrepancy is exactly why a generic polyfill fails — the native APIs require fundamentally different input shapes.

## Android vs iOS: The Platform Gaps

Writing the native code exposed how differently Apple and Google treat WebAuthn.

1.  **Input Formats**: As shown above, Android takes the W3C JSON. iOS requires strict programmatic construction of the request objects.
2.  **Attestation Delivery**: iOS delivers the full CBOR attestation object. Android's response is a JSON string representing the W3C `AuthenticatorAttestationResponse`. We had to write parsing logic in Rust to normalize these into a single format for our frontend.
3.  **Error Handling**: User cancellations. On iOS, you get `ASAuthorizationError.canceled`. On Android, it's a specific `CreateCredentialCancellationException`. Normalizing these errors so the React frontend could gracefully handle a user tapping "Cancel" took meticulous mapping in the Rust layer.

## The TypeScript Bridge

The goal was to shield the frontend developers (and myself) from this mess. The TypeScript API needed to feel as close to the web standard as possible, while accepting that it's running native commands.

```typescript
// src/plugin.ts
import { invoke } from '@tauri-apps/api/core';

export interface PasskeyResponse {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string; // Base64url encoded
  };
  type: 'public-key';
}

export async function createPasskey(options: PublicKeyCredentialCreationOptions): Promise<PasskeyResponse> {
  // We serialize the ArrayBuffers to base64url before sending to Rust
  const sanitizedOptions = sanitizeOptions(options);
  
  return await invoke<PasskeyResponse>('plugin:webauthn|create_credential', {
    options: sanitizedOptions
  });
}
```

By abstracting the Tauri `invoke` calls behind a clean interface, the React components don't know or care if they are running on iOS, Android, or desktop. They just call `createPasskey()`.

## The Backend Certificate Fix

I mentioned earlier that the backend rejected the iOS keys because of the x9.62 vs DER format issue.

Desktop browsers handle the heavy lifting. When Chrome generates a passkey, the attestation object it sends to your server is beautifully standard. Our backend (Node.js using `@simplewebauthn/server`) was verifying these perfectly.

But when mobile iOS sent its raw x9.62 key embedded in the CBOR, `simplewebauthn/server` choked during the verification step.

Instead of writing a complex ASN.1 encoder in Swift or Rust on the client side, I decided to fix it where we had the most control: our backend service. Right before we pass the client response to the verification library, we inspect the public key bytes.

If it's exactly 65 bytes and starts with `0x04` (the uncompressed point indicator for P-256), we know it's a raw x9.62 key. We wrote a tiny utility to prepend the correct ASN.1 DER header for `id-ecPublicKey` and the `prime256v1` curve.

```typescript
// Backend fix
function ensureDerFormat(publicKeyBytes: Buffer): Buffer {
  if (publicKeyBytes.length === 65 && publicKeyBytes[0] === 0x04) {
    // Standard P-256 ASN.1 DER prefix
    const prefix = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex');
    return Buffer.concat([prefix, publicKeyBytes]);
  }
  return publicKeyBytes;
}
```

This single function saved us from having to compile a massive crypto library into the mobile apps just to format a string of bytes. It was deployed in v1.0.20 just before the Tauri plugin PR was merged.

Building a native WebAuthn plugin for Tauri isn't trivial. You are bridging two very opinionated mobile ecosystems through Rust into a web context. But once you abstract away the CBOR parsing and normalize the platform quirks, the result is a seamless, native biometric experience that a polyfill simply can't match.
