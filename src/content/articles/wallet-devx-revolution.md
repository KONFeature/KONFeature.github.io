---
title: "The DevX Revolution: Migrating Frak Wallet to TanStack Start & Rolldown"
date: 2025-02-26T10:00:00Z
draft: false
subtitle: "How we cut build times by 10x"
category: "devops"
tags: ["DevX", "Rolldown", "Vite", "TanStack Start", "Vitest", "Performance"]
icon: "rocket"
iconColor: "text-red-500"
featured: false
description: "A technical retrospective on migrating the Frak Wallet from Next.js to TanStack Start, adopting Rolldown for lightning-fast builds, and unifying our entire monorepo stack."
githubUrl: "https://github.com/frak-id/wallet"
---

In software development, speed is a feature—not just for the end user, but for the developer. A slow CI pipeline or a sluggish hot module replacement (HMR) loop kills flow states and slows down innovation.

At Frak, we recently undertook a massive architectural migration to achieve state-of-the-art Developer Experience (DevX). We moved from a standard Next.js setup to a bleeding-edge stack powered by **TanStack Start (React Router v7)**, **Rolldown**, and **Vitest**.

Here is how we overhauled our stack to make our tooling scream.

## 1. Goodbye Next.js, Hello TanStack Start

We migrated our primary wallet application from Next.js to **TanStack Start** (now integrated into React Router v7). While Next.js is powerful, we found its "magic" often got in the way of the granular control we needed for an embedded wallet that lives in an iframe.

### Type-Safe Routing
One of the biggest wins was the type-safe routing system. Instead of file-system conventions that are checked at runtime, we define our routes explicitly.

```typescript
// app/routes.ts
import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    index("./views/landings/home.tsx"),
    
    // Layout-based routing for the main wallet interface
    layout("./views/layouts/wallet.tsx", [
        route("/login", "./views/auth/login.tsx"),
        route("/recovery", "./views/auth/recovery.tsx"),
        
        // Protected routes requiring authentication
        layout("./views/layouts/protected.tsx", [
            route("/wallet", "./views/protected/wallet.tsx"),
            route("/settings", "./views/protected/settings.tsx"),
        ]),
    ]),
] satisfies RouteConfig;
```

This migration unlocked faster page loads and a significantly lighter bundle size, critical for our "embedded" use case.

## 2. The Rolldown Speedforce

Vite is great, but as our codebase grew, the "Rollup" part of the production build started to slow down. Enter **Rolldown**, a Rust-based bundler designed to be the future of Vite.

We didn't just wait for Vite 6; we adopted `rolldown-vite` immediately to replace the internal bundler.

### The "Override" Hack
To enforce Rolldown across our entire monorepo without rewriting every package config, we used a package manager override:

```json
// package.json
"overrides": {
    "vite": "npm:rolldown-vite@^7.1.20"
}
```

### Advanced Chunking Strategy
Rolldown gave us granular control over chunk splitting. We configured it to isolate our heavy cryptographic dependencies from the UI code. This ensures that the user sees the interface immediately, while the blockchain logic loads in the background.

```typescript
// vite.config.ts
export default defineConfig({
    build: {
        rolldownOptions: {
            output: {
                advancedChunks: {
                    minShareCount: 2,
                    groups: [
                        // Isolate React to cache it aggressively
                        {
                            name: "react-vendor",
                            test: /node_modules[\\/](react|react-dom)/,
                            priority: 40,
                        },
                        // Isolate heavy crypto libs (Viem, Wagmi)
                        {
                            name: "blockchain-vendor",
                            test: /node_modules[\\/](viem|wagmi|@noble)/,
                            priority: 35,
                        },
                    ],
                },
            },
        },
    },
});
```

This change alone reduced our cold start time by **~40%**.

## 3. Testing at the Speed of Thought

We migrated 100% of our unit and integration tests to **Vitest**. 

Previously, running our full test suite (over 3,000 tests) took upwards of 5 minutes. By switching to Vitest, which shares the same configuration pipeline as Vite/Rolldown and runs natively in ESM, we cut execution time to **under 1 minute**.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom', // Faster than jsdom
        pool: 'forks',            // Parallel execution
        restoreMocks: true,
        alias: {
            // Seamlessly resolve our internal packages
            '@frak-labs/core-sdk': './packages/core-sdk/src',
        },
    },
});
```

## 4. Unifying the SDK Build Pipeline

It wasn't just the frontend. Our SDKs (`@frak-labs/frame-connector`, etc.) needed love too. We previously used `rsbuild` (Rspack), but maintaining two different build systems (Vite for Apps, Rspack for Libs) was mentally taxing.

We migrated our libraries to **tsdown**, a zero-config bundler powered by Rolldown.

```json
// packages/rpc/package.json
{
    "scripts": {
        "build": "tsdown",
        "build:watch": "tsdown --watch"
    }
}
```

This unified our entire stack. Whether you are working on the Wallet App or the SDK, the tooling is identical: Rust-based, instant, and TypeScript-native.

## Conclusion

This overhaul wasn't just about chasing the "new shiny thing." It was a calculated move to solve specific bottlenecks:
1.  **Build Time:** Rolldown reduced CI times drastically.
2.  **Bundle Size:** TanStack Start + Advanced Chunking reduced our initial load.
3.  **Maintenance:** Unifying on Rolldown/Vite means one config structure for everything.

Now, our developers can focus on building features, not waiting for Webpack to compile.
