---
title: "Chasing a Bun Memory Leak for 3 Days (The Answer Was 'Just Restart')"
subtitle: "Two-pass builds, forced GC, --smol flags, and a health endpoint that lies to Kubernetes"
description: "3 days debugging a Bun RSS memory leak on a Elysia.js backend. The fix was a scheduled pod restart via a health endpoint that lies to Kubernetes — and why we couldn't do anything else."
date: 2026-03-30T18:00:00Z
category: "devops"
group: "frak"
tags: ["bun", "elysia", "kubernetes", "memory", "debugging", "performance", "backend"]
icon: "bug"
iconColor: "text-red-400"
githubUrl: "https://github.com/frak-id/wallet"
---

The alert came in on a Tuesday afternoon. One of our Bun + Elysia.js pods had been OOM-killed for the third time in a week. Not a sudden spike — a slow, grinding climb. RSS would sit at ~120MB on boot, then creep upward: 180MB after 6 hours, 280MB by morning, 400MB+ before Kubernetes finally pulled the plug.

What made it suspicious was the shape of the curve. A real application memory leak — objects accumulating, caches not clearing, closures keeping references alive — tends to have a sawtooth pattern if there's any GC at all. This was a ramp. Smooth and consistent, like a timer that just... fills up.

## What We Were Running

Backend stack: Bun 1.1.38 with Elysia.js 1.2.x. Not the most battle-tested combo in production, but we'd committed to it for one hard reason — Elysia's WebSocket API. The app serves real-time updates to a fairly active frontend, and Elysia's WS implementation is clean, typed, and actually works.

The Node.js adapter exists but it's fundamentally broken in ways that aren't immediately obvious: event ordering gets weird under load, reconnect handling misbehaves, and there are open issues that have been sitting untouched for months. Switching wasn't an option we could realistically take in a weekend.

So we were stuck with Bun. Which meant debugging a runtime-level memory issue with the runtime's own tools.

## Day 1: Instrumentation

You can't fix what you can't measure. The Kubernetes dashboard showed RSS climbing but gave no insight into what was actually happening in the heap. I needed per-process visibility.

Bun ships a first-party JSC (JavaScriptCore) introspection module called `bun:jsc`. It's not documented heavily, but `heapStats()` returns a detailed breakdown of the JS heap — live bytes, dead bytes, object counts by type. Combined with `process.memoryUsage()`, you get a pretty complete picture.

```ts
export const debugRoutes = new Elysia({ prefix: "/debug" })
    .get("/memory", async () => {
        const { heapStats } = await import("bun:jsc");
        const mem = process.memoryUsage();
        const jsc = heapStats();
        return {
            rss: `${(mem.rss / 1024 / 1024).toFixed(1)}MB`,
            heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
            heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
            external: `${(mem.external / 1024 / 1024).toFixed(1)}MB`,
            jsc,
        };
    })
    .get("/memory/gc", async () => {
        const { heapStats } = await import("bun:jsc");
        const before = heapStats();
        const memBefore = process.memoryUsage();
        Bun.gc(true); // synchronous, blocks until GC completes
        const after = heapStats();
        const memAfter = process.memoryUsage();
        return {
            before: { rss: `${(memBefore.rss / 1024 / 1024).toFixed(1)}MB`, ...before },
            after: { rss: `${(memAfter.rss / 1024 / 1024).toFixed(1)}MB`, ...after },
        };
    });
```

If you're debugging a Bun memory issue and you haven't found `bun:jsc` yet, stop and use it. `heapStats()` gives you heap size, heap capacity, object count, protected object count, global object count — the full JSC internals, not just the v8-compat surface Node exposes.

I deployed this to staging, ran a load test that approximated 24h of production traffic in about 2 hours, and polled `/debug/memory` every 5 minutes. After 3 hours, the numbers looked like this:

```
rss: 187.3MB
heapUsed: 42.1MB
heapTotal: 67.4MB
external: 1.2MB
jsc.heapSize: 44382208
jsc.objectCount: 186432
```

RSS: 187MB. JS heap: 42MB. That 145MB gap was the first clue.

## The Diagnostic That Changed Everything

I hit `/debug/memory/gc` — `Bun.gc(true)`, synchronous GC. Before: heapSize 44MB. After: heapSize 39MB. Heap dropped 5MB. Normal. Then I checked RSS: still 187MB.

GC'd the heap, released thousands of objects, and RSS didn't move.

That's the moment I understood this wasn't a JavaScript leak at all.

### RSS vs heapUsed: Why They're Different Numbers

RSS (Resident Set Size) is the total physical memory the OS has assigned to this process. It includes everything: the JS heap, native modules, JSC's internal allocator arenas, mmapped files, Bun's own runtime overhead. It's the number your kernel actually cares about when it's deciding who to OOM-kill.

`heapUsed` is only the JS object graph — the part of memory that JSC's garbage collector manages. When GC runs, this number drops.

The gap between them is all the memory that's never touched by GC. And that gap was growing by ~15–20MB per hour regardless of what the JavaScript was doing.

## Three Attempted Fixes, None of Them Right

### Fix 1: Forced GC After Every Cron Job

My first hypothesis: our cron jobs were allocating and never releasing, and the GC wasn't collecting aggressively enough in a low-pressure server environment.

Added `Bun.gc(false)` at the end of each cron job handler. The `false` flag is non-blocking — hints to the GC without pausing the event loop.

Result: marginally helpful for about 6 hours, then the leak resumed at the same rate. `heapUsed` got slightly tidier. RSS kept climbing.

### Fix 2: `BUN_JSC_forceRAMSize`

Found this undocumented env var that forces JSC to cap its heap at a specified byte size. The theory: if you cap it hard, the GC will be more aggressive about returning pages.

```yaml
env:
  - name: BUN_JSC_forceRAMSize
    value: "419430400" # 400MB
```

The pod stopped growing past ~400MB. Which sounds like a win until you realize: the leak didn't stop, we just capped the damage. And with only 512MB available in the container, a 400MB hard cap left 112MB for everything else. Under WebSocket load, that headroom evaporated. The cap doesn't apply to native allocations outside the managed heap — RSS growth rate: unchanged.

Removed it after a day.

### Fix 3: `bun --smol`

The `--smol` flag enables JSC's `stopIfNecessaryTimer` — a more aggressive GC mode designed for memory-constrained environments.

```dockerfile
CMD ["bun", "--smol", "dist/index.js"]
```

RSS growth slowed noticeably. But "surviving longer" isn't the same as "not leaking." After 36 hours the leak was still visible, just at a slower rate.

## oven-sh/bun#21560

By day three I had enough data to search the Bun issue tracker with precision. I knew: RSS grows while JS heap stays flat, GC can reclaim heap but not RSS, behavior worsens with cron job frequency.

The pattern is distinctive enough that I found [oven-sh/bun#21560](https://github.com/oven-sh/bun/issues/21560) in about 20 minutes. Opened months ago. Multiple confirmed reproductions. Still open.

The root cause: JSC's memory allocator holds onto pages it's allocated even after the JS objects living in them are collected. It doesn't return those pages to the OS. They stay in a process-level free list that grows over time. The heap is logically empty but the RSS reflects peak allocation.

It's not a JavaScript memory leak. It's a runtime bug that manifests as one.

## Sidebar: Prepared Statements

While we were at it, someone raised our Postgres driver. We were using `npm:postgres` with prepared statements enabled by default. In some driver implementations, prepared statements accumulate per-connection.

```ts
const sql = postgres(DATABASE_URL, { prepare: false });
```

Helped with a separate baseline memory issue, didn't touch the RSS leak. Still worth keeping.

## The Actual Fix: Teaching Kubernetes to Restart Us

We couldn't switch to Node. We couldn't fix the Bun bug. We couldn't safely cap memory. The only reliable solution: restart the pod before it OOM'd.

If the process eventually needs to die, the least bad way is a rolling restart triggered by a liveness probe. No OOM kill, no traffic drop, no 3am alerts.

Make the health endpoint return 500 after 24 hours. Kubernetes liveness probe sees consecutive failures, triggers rolling restart. WebSocket connections drain during the termination grace period. Zero-downtime.

```ts
const bootTime = Date.now();
const ONE_DAY_MS = 24 * 60 * 60_000;
const GRACE_PERIOD_MS = 10 * 60_000;

.get("/health", ({ set }) => {
    if (bootTime > Date.now() - GRACE_PERIOD_MS) {
        return { status: "ok", uptime: "fresh" };
    }
    if (bootTime < Date.now() - ONE_DAY_MS) {
        set.status = 500;
        return { status: "restarting", uptime: Date.now() - bootTime };
    }
    return { status: "ok", uptime: Date.now() - bootTime };
})
```

The 10-minute grace period on startup prevents restart loops during pod initialization — without it, a freshly-started pod could immediately trigger another cycle before it's had time to warm up.

Liveness probe config:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 30
  failureThreshold: 3
```

With `failureThreshold: 3` and `periodSeconds: 30`, the probe needs to fail for 90 seconds before Kubernetes acts. The health endpoint returns 500 for the entire post-24h window, so three consecutive failures is guaranteed. At hour 24 we're at ~350MB, well below the 512MB limit. The replacement pod boots at ~90MB and the cycle starts over.

Maximum observed RSS before restart: ~380MB. No OOM kills since deployment.

## Bonus: The Two-Pass Build

While investigating bundle size during the same week: Bun's built-in minifier is conservative about dead code elimination. SWC is more aggressive. Two-pass build: Bun handles bundling, SWC handles minification.

```ts
import { minify } from "@swc/core";
import { build } from "bun";

await build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    minify: false,
    target: "bun",
    define: {
        "process.env.STAGE": JSON.stringify("production"),
        "process.env.NODE_ENV": JSON.stringify("production"),
        "process.env.MONGODB_CRYPT_DEBUG": "undefined",
    },
});

const bundled = await Bun.file("./dist/index.js").text();
const { code } = await minify(bundled, {
    compress: { dead_code: true, passes: 2 },
    mangle: true,
});
await Bun.write("./dist/index.js", code);
```

The `define` block inlines env vars as string literals before bundling, so SWC can see `if ("production" === "development")` branches and eliminate them entirely. The extra `passes: 2` on compress is worth the build time; it catches eliminations that a single pass misses.

That said, the two-pass build was only part of the size story. The bigger wins came from dependency surgery done around the same time: replacing `firebase-admin` with direct HTTP/2 FCM calls (via `jose` + `node:http2`), removing the Airtable SDK which was pulling in `axios` despite us already using `ky` everywhere, and a few other dead imports. The next step is migrating off MongoDB entirely — moving to SQLite via `sqld` with a `rustfs` pod for backup, which should improve authenticator insert/query latency, reduce cloud service dependencies, and simplify horizontal scaling. More on that when it ships.

---

The right fix here wasn't elegant. It was pragmatic. The bug exists, it's not fixed upstream, and a scheduled rolling restart costs nothing. Sometimes the best debugging outcome isn't "I found and fixed the root cause." It's "I understood the problem well enough to contain it without making things worse."
