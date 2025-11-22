---
title: "The DevX Revolution: How We Cut Build Times by 10x at Frak"
date: 2025-11-20T10:00:00Z
draft: false
subtitle: "From Next.js to TanStack Start, Rollup to Rolldown, and 5-minute builds to 30 seconds"
category: "devops"
tags: ["DevX", "Rolldown", "Vite", "TanStack Start", "Vitest", "Performance", "Monorepo"]
icon: "rocket"
iconColor: "text-red-500"
description: "A technical deep-dive into migrating our entire monorepo from Next.js to TanStack Start, adopting Rolldown across the stack, unifying on Vitest, and achieving a complete deployment pipeline in under 4 minutes."
githubUrl: "https://github.com/frak-id/wallet"
heroImage: "./assets/wallet-devx-revolution/hero.jpg"
group: "frak"
---

![hero image](./assets/wallet-devx-revolution/hero.jpg)

In software development, speed is a feature—not just for the end user, but for the developer. A slow CI pipeline or a sluggish hot module replacement (HMR) loop kills flow states and slows down innovation.

At Frak, we recently undertook a massive architectural migration to achieve state-of-the-art Developer Experience (DevX). We migrated our business dashboard from Next.js to **[TanStack](https://tanstack.com) Start**, unified all routing on **TanStack Router**, adopted **[Rolldown](https://rolldown.rs)** for blazing-fast builds, moved our entire test suite to **Vitest**, and rebuilt our SDK pipeline with **[tsdown](https://tsdown.com)**.

The result? Our business app build time dropped from **5 minutes to under 30 seconds**. Our complete deployment pipeline—including backend, 3 frontends, and all SDKs—now completes in **4 minutes**. And our 3,119 unit tests execute in **42 seconds**.

Here's how we overhauled our stack to make our tooling scream.

## 1. Business Dashboard: From Next.js to TanStack Start + Nitro

Our primary business dashboard was built on Next.js, deployed to AWS Lambda via SST and OpenNext. While this setup worked, it had significant pain points:

- **Build times**: 5+ minutes per deployment
- **Vendor lock-in**: Tied to AWS Lambda and OpenNext's abstractions
- **Limited control**: Next.js's "magic" made it hard to customize SSR behavior
- **Deployment complexity**: SST + OpenNext added layers of indirection

We migrated to **TanStack Start** with **Nitro** handling the SSR layer. This was a breath of fresh air:

- **Build time**: Down from 5 minutes to **under 30 seconds** (10x improvement)
- **DevX**: TanStack Start's explicit, type-safe routing is cleaner and more intuitive than Next.js's file-based conventions
- **Deployment flexibility**: Nitro compiles to a portable format we can run anywhere—no vendor lock-in
- **Infrastructure control**: We now deploy the business app to our existing Kubernetes cluster via Docker, alongside our backend

The mental model is simpler, the builds are faster, and we have complete control over hosting.

## 2. Routing Unification: Everything on TanStack Router

We had a fragmented routing landscape: some apps used React Router v7, others used file-based routing. We unified everything on **TanStack Router** across:

- `apps/wallet` (user wallet, embedded in iframes)
- `apps/listener` (iframe communication layer)
- `apps/dashboard-admin` (internal admin tools)
- `example/` projects (SDK showcases)

### Why TanStack Router?

TanStack Router gives us **compile-time type safety** for routes, params, and loaders. Instead of file-system conventions checked at runtime, we define routes explicitly:

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

This unified approach means every developer on the team uses the same mental model, regardless of which app they're working on.

## 3. The Rolldown Revolution: 70-80% Build Time Reduction

Vite is great, but as our codebase grew, the Rollup-based production build started to slow down. Enter **Rolldown**, a Rust-based bundler designed to be the future of Vite (and now integrated into Vite 6).

We didn't wait for the stable release. We adopted `rolldown-vite` (the experimental fork) immediately and saw **70-80% reduction in build times** across the board.

### Why Rolldown Matters

Beyond speed, Rolldown gave us two critical improvements:

1. **Unified configuration**: Since we now use Rolldown everywhere (apps, SDKs, packages), we can share configuration logic across the entire monorepo
2. **Intelligent code splitting**: Much better chunking options compared to Rollup, essential for our wallet which loads heavy crypto dependencies (Viem, Wagmi, @noble/*)

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

## 4. SDK Build Pipeline: From rslib to tsdown (Rolldown-powered)

Our SDK wasn't left behind. We previously used **rslib** (Rspack-based) to build our SDK packages, but maintaining two different build systems (Vite for apps, Rspack for libraries) was mentally taxing.

We migrated to **tsdown**, a zero-config bundler powered by Rolldown:

- **Unified stack**: Same build tool everywhere—Rolldown under the hood
- **30-40% faster builds**: All 4 SDK packages (plus shared packages) build in **under 10 seconds**
- **Better output**: tsdown produces clean ESM + CJS + types for NPM, plus optimized IIFE/ESM bundles for CDN

Our SDK structure:
- `sdk/core` - Core SDK (NPM: ESM+CJS, CDN: IIFE bundle)
- `sdk/react` - React hooks (NPM: ESM+CJS)
- `sdk/components` - Web Components with Preact (NPM: ESM, CDN: ESM with code splitting)
- `sdk/legacy` - Legacy IIFE bundle for backward compatibility

One shared configuration, consistent build behavior, and blazing-fast iteration.

## 5. Testing Unification: Everything on Vitest

The final missing piece was testing. We had fragmented test runners:
- **Frontend**: Vitest
- **Backend**: Bun test

While Bun test was fast, it lacked the ecosystem and configurability of Vitest. We migrated everything to **Vitest 4.0** with the Projects API.

### The Numbers

- **3,119 unit tests** across 7 projects
- **42 seconds** to run the entire suite in parallel
- **40% code coverage** target (lines, functions, branches, statements)

### Vitest Projects API

We use the Projects API to run all tests in a single command while keeping environment-specific configurations:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        projects: [
            {
                name: 'wallet-unit',
                environment: 'jsdom',
                include: ['apps/wallet/**/*.test.ts'],
            },
            {
                name: 'backend-unit',
                environment: 'node',
                include: ['services/backend/test/**/*.test.ts'],
            },
            // 5 more projects...
        ],
        pool: 'forks',            // Parallel execution
        restoreMocks: true,
    },
});
```

Now we run `bun run test` once, and Vitest orchestrates everything—frontend tests with jsdom, backend tests with Node environment, all in parallel.

### Benefits

- **Unified configuration**: One test runner, one mental model
- **Better tooling**: Coverage reports, watch mode, and UI dashboard work seamlessly
- **Faster CI**: 42 seconds vs. the previous ~5 minutes with fragmented runners

## 6. Deployment Pipeline: 4 Minutes for Everything

With all these optimizations in place, our deployment pipeline is now:

1. **Build base Docker image** with all SDK packages (~1 min)
2. **Push to private registry** (pause while this completes)
3. **Build application images in parallel**:
   - Backend (Elysia.js + Drizzle)
   - Wallet frontend
   - Listener frontend (iframe layer)
   - Business SSR app (TanStack Start + Nitro)
4. **Deploy to Kubernetes cluster**

Total time: **4 minutes** from commit to production.

This is a massive improvement from our previous setup:
- Business app alone took **2+ minutes** to build and deploy via SST + OpenNext to AWS Lambda
- Fragmented build tools meant no parallelization opportunities
- Now everything runs in Docker on our Kubernetes cluster—unified, fast, and under our control

## The Results: By The Numbers

Here's what we achieved with this migration:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Business build time | 5 min | 30 sec | **10x faster** |
| SDK build time | 35 sec | 10 sec | **75% faster** |
| Full test suite | ~5 min | 42 sec | **7x faster** |
| Deployment pipeline | N/A | 4 min | **Unified & streamlined** |
| Vite build time | Baseline | -70-80% | **Rolldown speedup** |

## Key Takeaways

This overhaul wasn't about chasing the "new shiny thing." It was a calculated move to solve real bottlenecks:

1. **Next.js → TanStack Start + Nitro**: Faster builds, better control, no vendor lock-in
2. **Rollup → Rolldown**: 70-80% faster builds, better code splitting, unified configuration
3. **rslib → tsdown**: SDK builds unified on Rolldown, 30-40% faster
4. **Bun test → Vitest**: Unified test runner, better tooling, 7x faster execution
5. **TanStack Router everywhere**: Consistent routing API across all apps

### Unified Stack Philosophy

The real win is **consistency**. Every package, every app, every test uses the same underlying tools:
- **Build**: Rolldown (via Vite or tsdown)
- **Test**: Vitest
- **Routing**: TanStack Router
- **Package manager**: Bun

Whether you're working on the wallet, the business dashboard, or the SDK, the developer experience is identical. No context switching, no special cases, just build, test, ship.

Now, our developers can focus on building features, not waiting for builds to complete.
