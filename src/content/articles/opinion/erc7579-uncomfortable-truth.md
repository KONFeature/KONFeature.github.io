---
title: "The Uncomfortable Truth About ERC-7579 and Modular Smart Wallets"
date: 2025-12-29T15:00:00Z
draft: false
subtitle: "2-3 weeks building a ZK social login wallet. Most of the pain wasn't the ZK part."
category: "opinion"
tags: ["ERC-7579", "Account Abstraction", "Rhinestone", "Smart Wallets", "ZK", "Social Login"]
icon: "message-square-warning"
iconColor: "text-amber-400"
description: "After weeks building a fully-featured ZK social wallet with 7579 modules, I have thoughts. The tech is here. The ecosystem... isn't."
group: "opinion"
---

Let me be direct: the modular smart wallet ecosystem is frustrating.

Not because the tech is bad—ERC-7579 is genuinely clever. Not because ZK proofs are hard—they're actually the easy part now. The frustration comes from an ecosystem that's *almost* there, but riddled with half-finished implementations, undocumented gotchas, and a puzzling reliance on centralized services for what should be decentralized infrastructure.

I spent the last 2-3 weeks building what I believe is the wallet of tomorrow: ZK social login as the primary signer, smart sessions for gasless UX, WebAuthn/ECDSA/MFA as fallback options, social recovery from similar wallets, and Monerium integration for fiat on/off ramps. The goal? True decentralization—no Privy, no Dynamic, no centralized OAuth proxies taking a cut while holding your users hostage.

Here's what I learned.

## The Experiment: Social Login Without the Middleman

At Frak, we've been down the WebAuthn rabbit hole before. Our [previous work on ERC-4337 + WebAuthn](/articles/frak/4337-webauthn) gave us a solid foundation. But we wanted more—specifically, social login that doesn't require trusting a third party with your users' keys.

The existing landscape is disappointing:

- **Privy, Dynamic, Web3Auth**: Great DX, genuinely useful products. But centralized. You're paying for convenience while introducing a single point of failure and vendor lock-in.
- **Previous experiments**: We had built on top of [Shield Labs' zkLogin](https://github.com/shield-labs/zklogin) more than a year ago. That code is now outdated—gas-heavy, no MFA support, couldn't handle multiple social providers, used an old proof system. A lot has changed since then. Time to rebuild from scratch.

The target architecture:

- ZK-proven OAuth tokens (Google, Apple) as primary signers
- No backend custody—the user's social identity *is* the key
- Smart sessions for seamless interactions
- WebAuthn and ECDSA as backup/MFA options
- Social recovery from other wallets in the same ecosystem
- 7579-compliant modules for maximum composability

## Where I Expected Pain (And Didn't Find It)

**ZK Proofs**: Noir has matured significantly. I used `noir v1.0.0-beta` with `bb.js` for the browser prover. Building a circuit that verifies an OAuth JWT signature, extracts the `sub` claim, and produces a proof that can be verified on-chain? Took a couple of days. The tooling is alpha, sure, but it *works*.

**Multichain**: With 7579's modular architecture and proper account deployment strategies, multichain support is almost free. Deploy the same account across chains with the same modules—done.

**Monerium Integration**: Honestly, a breath of fresh air. Their API is clean, documentation is accurate, and integration took maybe half a day. This is what "production-ready" looks like.

## Where I Actually Spent My Time (The 7579 Reality)

Here's where things get uncomfortable.

### The Registry That Isn't

ERC-7579 has this beautiful concept of a module registry—a trust layer where modules are attested, audited, and verified. The Rhinestone Module Evaluator (MEV) is supposed to be the source of truth. Sounds great on paper.

In practice? I spent *days* debugging why my registry attestations weren't being accepted. Deep dive into the Safe 7579 adapter. Deep dive into Nexus. Here's what I found:

**Safe 7579 1.5 Factory**: The registry is passed as a parameter during initialization. Great! Except... it's not actually used within `init()`. The code path that validates modules against the registry? Commented out.

**Nexus**: Same story. Registry checks exist in the interface, commented out in implementation.

**MFA Validator**: Relies *solely* on the registry to accept new signers. Except the registry checks aren't running. So what's actually validating anything?

I understand why—gas costs, complexity, "we'll enable it later." But this is the foundation of the trust model for modular wallets. Having it exist in spec but not in implementation is worse than not having it at all. It's a false sense of security.

### The SDK Fragmentation Problem

I wanted something simple: view functions to check module state, helpers to encode installation/uninstallation calls, viem-like interfaces that follow established patterns. A "bare metal" SDK that lets me extend it with custom validators.

What's available:

- **Rhinestone SDK**: Tested it first. Stopped after hitting wall after wall. Requires an orchestrator with API keys baked in. Doesn't follow viem standards—no way to pass custom transports. Want to add a custom validator? Not possible. The whole thing assumes you're using their full stack or nothing.

- **Permissionless.js**: Great out-of-the-box solution for simple ECDSA wallets. Clean, viem-native. But limited to basic use cases.

- **AbstractJS (Biconomy)**: Solid AA support, but bloated with Biconomy-specific abstractions. Hard to use without buying into their entire ecosystem.

- **Safe SDK**: Supports Safe accounts, but not the 7579 adapter. If you're building on Safe 7579, you're on your own.

What I actually wanted:

```typescript
// Simple. Composable. Viem-native.
encodeModuleInstallation(moduleAddress, initData)
encodeSessionCreation(sessionConfig)
getModuleState(account, moduleType)

// With the ability to extend
createCustomValidator({ ... })
```

None of the existing SDKs let me do this cleanly.

### The API Key Problem

I understand that providing end users with cross-chain intents and relying on centralized services for orchestration makes sense as a *product*. Gasless transactions, intent resolution, MEV protection—these are complex problems where centralized infrastructure can genuinely help.

But bundle that into a *separate SDK*. Don't make API keys a requirement for basic module management. The permissionless layer should be... permissionless.

## What I Built

After hitting these walls, I ended up building a fully-fledged 7579 SDK from scratch. It supports:

**Account Types**:
- Safe 7579 adapter
- Biconomy Nexus

**Validators**:
- ECDSA (ownable, multi-sig with threshold)
- WebAuthn
- ZK Social (my implementation)
- MFA combinations

**Modules**:
- Smart Sessions with full policy support
- Registry integration (that actually works)
- Cross-chain state replication helpers

**Design Philosophy**:
- Viem-native interfaces
- Works with `viem/account-abstraction` out of the box
- Fully extensible—add your own validators, modules, policies
- No API keys required for core functionality
- Query actions to inspect account state, action helpers to modify it

The code is currently closed source—everything's still in beta and I'm not ready to support external users yet. But it will be integrated into the Frak wallet in the coming months.

## The Current State vs. Where We're Going

**Current Frak Wallet** (what we're migrating from):
- Kernel 2.1
- In-house WebAuthn validator
- Stuck on EntryPoint v0.6

It works. It's battle-tested. But being behind on EntryPoint versions is a burden—we're missing features and optimizations that v0.7+ provides.

**Next Generation** (what we're building):
- Safe 7579 1.5.0
- EntryPoint v0.7
- ZK Social / WebAuthn as primary authentication
- Ownable (ECDSA) as backup
- Social recovery from other wallets in the ecosystem
- Custom session modules for Frak-specific workflows

## The Bigger Picture: Why Are We Still Paying Privy?

Here's what keeps me up at night: the technology for fully non-custodial social login **exists**.

- ZK proofs for OAuth token verification: Working
- On-chain JWT signature verification: Doable (expensive, but getting cheaper)
- Modular wallet architecture: Specified
- Account abstraction for gas sponsorship: Mature

So why are projects still paying per-user fees for centralized social login providers?

**The answer isn't technical—it's ecosystem maturity.**

The pieces exist but aren't assembled:
- No audited, production-ready ZK social module
- No "just works" SDK that respects developer autonomy
- Documentation assumes you're using the full Rhinestone stack
- Reference implementations are half-finished

Meanwhile, Privy gives you `npm install` → working social login in an hour. The DX gap is massive.

## What the Ecosystem Needs

1. **Bare-metal SDKs**: Just the helpers, no orchestrator lock-in. Follow viem patterns. Be extensible.

2. **Honest documentation**: If registry checks are disabled, say so. If a feature is aspirational, mark it as such.

3. **Audited ZK social modules**: The circuits are straightforward—someone needs to fund the audits.

4. **Separation of concerns**: Permissionless core SDK for module management. Optional orchestrator SDK for those who want managed infrastructure.

## The Path Forward

Gas costs for ZK verification will drop. Recent Ethereum upgrades are reducing calldata costs. RIP-7212 precompiles for P256 verification are rolling out. The economics are improving.

What's missing is the last-mile work:
- Polish the implementations
- Audit the critical paths
- Build SDKs that respect developer autonomy
- Document the actual state of things, not the aspirational spec

The irony isn't lost on me: I'm frustrated about centralization while relying on Google/Apple OAuth. But there's a spectrum. Trusting Google's OAuth server is different from trusting a startup with your private keys. And this can be layered with zk-email recovery, hardware key fallbacks, social recovery—defense in depth.

I'm not saying don't use Privy or Dynamic—they're excellent products solving real problems. I'm saying we should have alternatives. True decentralization means options, not "decentralized in theory, Privy in practice."

## Conclusion

After 2-3 weeks in the 7579 trenches:

**The good**: ERC-7579 is well-designed. The modular architecture makes sense. ZK tooling has reached usable maturity. The building blocks exist.

**The frustrating**: The ecosystem is half-built. Registry systems that don't register. SDKs that require API keys for "permissionless" modules. Commented code blocks that change security properties. Documentation that describes aspiration, not reality.

**The hopeful**: This is solvable. It's not a fundamental technical problem—it's coordination, funding, and follow-through. The hardest parts (ZK circuits, account abstraction, modular architecture) are done. What remains is the unglamorous work of finishing what's started.

I'll keep building. The wallet of tomorrow shouldn't require trusting yesterday's intermediaries.

---

*Feedback welcome—especially if I've misunderstood something in my debugging. Always happy to be wrong if it means the ecosystem is more functional than I thought.*
