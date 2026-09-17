---
name: "Frak Labs"
tagline: "On-chain reward infrastructure and a seedless smart wallet for e-commerce and content"
description: "A web3 rewards platform with a self-custodial WebAuthn smart wallet: JS and native mobile SDKs embedding it into Shopify, WooCommerce, Magento, and any custom site or app."
status: production
role: "Co-founder & CTO"
period: "2022 - present"
order: 1
featured: true
icon: "rocket"
iconColor: "text-purple-400"
tech:
  - "ERC-4337"
  - "WebAuthn"
  - "Kubernetes"
  - "Bun"
  - "Elysia"
  - "TanStack"
  - "Foundry"
  - "Tauri"
metrics:
  - label: "Daily wallet loads"
    value: "100k+"
  - label: "Infra cost"
    value: "-85%"
  - label: "Wallet CI (cached)"
    value: "9min to 2min"
  - label: "Onboarding"
    value: "Seedless, biometric"
links:
  - label: "frak.id"
    url: "https://frak.id"
  - label: "Wallet"
    url: "https://wallet.frak.id"
articleGroups:
  - "frak"
---

## What Frak is

Frak is an on-chain reward and referral platform: brands run campaigns where users get paid in tokens for actions like sharing a product or referring a friend, settled automatically through smart contracts on Arbitrum. The catch with any "pay users in crypto" product is the onboarding wall: nobody installing a Shopify plugin wants to explain seed phrases to their customers. Frak's whole technical bet is removing that wall, then embedding the result cheaply enough that merchants don't notice the cost.

I'm co-founder and CTO. I own everything technical: architecture, the wallet, the chain layer, the backend, the infra, and the team building all of it.

## The wallet

The core product is a self-custodial smart wallet built on ERC-4337 account abstraction with WebAuthn (passkey) signing instead of a seed phrase. Users authenticate with their device's biometrics; a P256 signature validates the user operation on-chain through a Kernel-based smart account, so there's no private key for anyone to lose, write down, or phish. We built on and contributed back to the ZeroDev Kernel and Pimlico's `permissionless.js` to get there.

Once the wallet holds value, it needs to leave the crypto bubble. We integrated [Monerium](/articles/frak/monerium-onchain-iban), a licensed e-money institution, to give the smart account a real SEPA-reachable IBAN: a backend-free OAuth2 + PKCE connect flow, ERC-1271 wallet linking, delegated KYC, and a signed EURe redeem off-ramp. Users can move from on-chain rewards to euros in their bank account without us touching a compliance license.

## The blockchain layer

Reward logic, referral tracking, and campaign accounting live in Solidity contracts across 8 master contracts and multiple factories. We moved our contract tooling from Hardhat to Foundry early on for faster, more reliable testing, and gas optimization has stayed a constant discipline (I've placed #2 globally in a gas-golfing competition, which is more than a flex: it's the same skill that keeps user operations cheap to sponsor).

## Backend, SDK, and the embeddable wallet

The backend runs on Bun and Elysia. Integration has grown into a full SDK surface: a vanilla JS core SDK for the underlying protocol, a vanilla JS component SDK with prebuilt HTML components for teams that want drop-in UI, a React SDK for the same, and, newest, native Android and iOS SDKs so mobile apps get the same reward and referral flows as the web. The web SDKs mount a listener iframe on the merchant's page, a guest on someone else's page loading on hundreds of thousands of partner pageviews a day where the vast majority never trigger any wallet UI, so its cost had to round down to nearly zero. We rebuilt it around a ["ring architecture"](/articles/frak/frak-listener-ring-architecture): a 3-chunk eager bundle for the RPC bridge, with everything else (Preact, the modal, the sharing flow) split into lazy chunks the SDK preloads speculatively. Combined with an earlier pass that cut the wallet bundle by 30%, this is what keeps the embed invisible on partner sites' load times.

Separately, the Frak wallet app itself also ships as a native consumer app via Tauri (React + Rust), including a from-scratch native WebAuthn plugin for iOS and Android so passkeys work outside the browser.

## E-commerce integrations

Frak plugs into the platforms merchants already run: a Shopify app (storefront banner, product-page share button, and a post-purchase checkout extension, unified under one merchant-owned translation source across four different runtimes), a WordPress/WooCommerce plugin built to add near-zero overhead to every page load with webhook delivery delegated to WooCommerce's native pipeline rather than a hand-rolled dispatcher, and a Magento module for the same flows. Any other stack integrates through the base SDK directly, with a custom webhook acceptance flow standing in for a platform-specific plugin.

## Infrastructure

Infrastructure went through a real evolution: AWS Lambda serverless, to SST-managed infrastructure, to a self-hosted Kubernetes platform on Hetzner, cutting infrastructure costs by 85%. On top of that we run our own CI: in-cluster GitHub Actions runners, BuildKit over mTLS, and a shared registry cache, which took the wallet's deploy pipeline from a 9-minute build down to a 4-minute cold run and 2-minute cached run.

## My role

I've been technical lead since day one: architecture decisions across the wallet, contracts, backend, and infra; hiring and leading the engineering team; and staying hands-on in the codebase, from WebAuthn validator internals to the Kubernetes platform underneath everything.
