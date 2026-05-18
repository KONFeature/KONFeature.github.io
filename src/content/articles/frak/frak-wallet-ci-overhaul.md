---
title: "From 9 Minutes to 2: Rebuilding the Wallet's CI on Our Own Platform"
date: 2026-05-19T10:00:00Z
draft: false
subtitle: "Killing Dockerfile.base, sharing cache mounts across six images, and what really moves the needle in Docker build pipelines"
category: "devops"
tags: ["CI", "GitHub Actions", "Docker", "BuildKit", "Kubernetes", "Performance", "Monorepo"]
icon: "gauge"
iconColor: "text-orange-400"
description: "How the wallet's deploy pipeline went from a 9-minute build to a 4-minute cold run and 2-minute cached run by killing a monolithic Dockerfile.base, moving BuildKit in-cluster, wiring a Zot registry cache, and sharing apt + bun caches across six images."
githubUrl: "https://github.com/frak-id/wallet"
group: "frak"
---

The deploy was 9 minutes. We weren't proud of it.

The wallet repo builds six Docker images (wallet, listener, business, backend, bootstrap, credential-sync), pushes them to GCP Artifact Registry, and deploys to a GKE cluster via SST. None of those steps are individually slow. But put them together with `ubuntu-latest` runners, GitHub Actions cache, and a shared `Dockerfile.base` that rebuilt the world every time a package.json moved, and you get 9 minutes of waiting on every push.

We've previously written about [making the wallet's framework stack scream](/articles/wallet-devx-revolution) by migrating to TanStack Start and Rolldown. That was about build-tool speed. This article is about the layer underneath: Docker build speed in CI, which is a different lever entirely.

The headline numbers, from the same workflow on the same repo:

| Build kind     | Before  | After cold | After cached |
| -------------- | ------- | ---------- | ------------ |
| Total wallclock | ~9 min | ~4 min    | ~2 min       |

That's roughly half the time on a cold build and a quarter on a warm one. Most of the win compounds from four levers we pulled, all of which became possible once we'd stood up [our Hetzner platform](/articles/frak-hetzner-platform). If you haven't read that piece yet, the one-paragraph recap is: we run a single Hetzner k3s box that hosts in-cluster GitHub Actions runners (ARC), a BuildKit pod behind mTLS, a Zot OCI registry as a shared layer cache, a Verdaccio NPM mirror, and a Kyverno policy that auto-injects `NPM_CONFIG_REGISTRY` into every pod.

This is how we wired the wallet's CI on top of it.

## Where we started

The pipeline before this work looked like a fairly typical monorepo deploy:

- `runs-on: ubuntu-latest` (GitHub-hosted runner).
- A monolithic `Dockerfile.base` that built all the shared layers (tooling, deps install, SDK build).
- Six app `Dockerfile`s each `FROM` that base, plus their app-specific bits.
- `actions/cache@v4` + `docker/setup-buildx-action@crazy-max-edition` for BuildKit cache.
- `docker/setup-qemu-action` for the cross-arch builds.

The pain wasn't any one of those choices in isolation. It was their interaction:

- **Dockerfile.base rebuilt the world whenever any `package.json` moved.** A typo fix in one workspace package invalidated the deps layer for all six images.
- **GHA cache hit its 10 GB ceiling.** Eviction was opaque, sharing across branches was awkward, and we ended up with our own branch-tagged hacks to compensate.
- **QEMU emulation on the runner was slow.** Multi-arch builds doubled wallclock for the same image content.
- **Every build pulled images fresh from GHCR and Docker Hub.** No persistent layer cache survived between runs because every runner pod was ephemeral.

We took 9 minutes for granted because we didn't have anywhere better to put the work. The platform changed that.

## The four levers

A short overview, then we'll expand each.

1. **Runner moves in-cluster.** Hetzner ARC scale set, on-demand pods, identity baked in via the cluster's GitHub App.
2. **BuildKit moves in-cluster.** Remote daemon over mTLS, persistent 100 Gi PVC cache, QEMU built in.
3. **Registry cache replaces GHA cache.** In-cluster Zot, branch-tagged exports with fallbacks, no quota.
4. **Dockerfile.base dies.** Six self-contained Dockerfiles share BuildKit cache mounts via global mount IDs.

Plus a supporting cast: nginx:alpine for the frontend runtime, parallel `gzip -9` pre-compression of static assets, Bun pinned to one version across all images, Docker syntax bumped to `1-labs` to unlock `COPY --link --parents`.

## Lever 1: A runner that already lives in the cluster

The diff in `.github/workflows/deploy.yml` is a single line:

```yaml
# Before
jobs:
  deploy:
    runs-on: ubuntu-latest

# After
jobs:
  deploy:
    name: "☁️ Deploy"
    # In-cluster hetzner runner. `frak-hetzner-wallet` scale set in
    # infra-core (`infra/hetzner/arc.ts`). ARC autoscales pods on demand
    # (min=0, max=3), so the first run has a 30-60s cold start.
    runs-on: 'frak-hetzner-wallet'
```

What that one line gives us:

- **The runner is on the same network as everything it builds for.** No transit out of GitHub to GCP for image pushes, no transit to the public NPM registry for `bun install`. Every external surface stays an in-cluster hop.
- **No per-job credential rotation.** The runner pod already has cluster identity. The buildkit mTLS client cert is mounted by the scale-set spec via a `buildkit-client-tls` Secret (mirrored from the buildkit namespace by Pulumi). The workflow doesn't have to provision a thing.
- **Workflow secrets get smaller.** We still federate to GCP via Workload Identity for the actual deploy (`google-github-actions/auth@v3`), because we want the audit trail of an identity that ties to the workflow run rather than the runner pod. But there's no kubeconfig, no Docker Hub PAT, no GHA-cache token.

The tradeoff is real: cold start. First job after a quiet period waits 30–60s for ARC to spawn a pod. `minRunners: 0` is our cost-control default for staging. If the cold-start latency ever crosses the threshold of annoyance (for instance during a release window where we want a fast feedback loop), we'll switch on `minRunners: 1` and keep one pod warm. Cheap, two-line config change.

## Lever 2: BuildKit, but properly

The next change in `deploy.yml` is wiring BuildKit. Instead of `crazy-max/ghaction-setup-docker` spinning up a buildkitd on the runner pod, we point at the cluster's BuildKit daemon:

```yaml
# .github/workflows/deploy.yml (excerpt)

# Use the in-cluster buildkit pod (see infra-core's infra/hetzner/buildkit.ts)
# instead of spinning up local buildkit on the runner. Wins:
#   - persistent 50Gi PVC cache survives across runs (every runner pod is fresh)
#   - shared cache across all CI runs in the cluster
#   - drops setup-qemu: the buildkit pod ships QEMU emulators for cross-arch
#
# mTLS client cert is mounted at /buildkit-certs by the unprivileged
# `frak-hetzner-wallet` scale set (see infra-core arc.ts). The action
# marks this builder as active (default `use: true`) so
# `@pulumi/docker-build` Image resources in infra/gcp/*.ts pick it up
# automatically (no `builder` field set).
- name: "🐳 Setup remote buildkit builder"
  if: steps.changes.outputs.services == 'true' || github.event.inputs.force_deploy == 'true'
  uses: docker/setup-buildx-action@v4
  with:
    name: hetzner
    driver: remote
    endpoint: tcp://buildkitd.buildkit.svc.cluster.local:1234
    driver-opts: |
      cacert=/buildkit-certs/ca.crt
      cert=/buildkit-certs/tls.crt
      key=/buildkit-certs/tls.key
```

Three direct wins:

- **QEMU is in the pod, not the runner.** `setup-qemu-action` is gone. The BuildKit daemon ships emulators for both arm64 and amd64. Multi-arch builds happen server-side and are roughly as fast as native builds for our image graph.
- **The builder is persistent.** The 100 Gi cache PVC survives every CI run. The BuildKit daemon is the same pod from one job to the next. Layer cache hits are real, not opportunistic.
- **The cache is shared across all CI jobs in the cluster.** Wallet builds, infra-core builds, dev `docker buildx build` sessions from team macs. All hit the same daemon.

Action note: by default `setup-buildx-action` marks the new builder as active. The `@pulumi/docker-build` resources in our SST config don't need to specify a builder explicitly; they pick up the Hetzner builder automatically once the action runs.

The single point of contention is real: it's one BuildKit pod, one PVC. We tuned the `[worker.oci]` GC config (covered in detail in the [Hetzner platform article](/articles/frak-hetzner-platform)) so that 80 GiB of cache is the hard ceiling with a 30 GiB safety floor. We haven't seen it bottleneck under our current build load. If we do, the next step is profiling individual layer reuse and tightening which stages get exported to the cache.

## Lever 3: Cache moves to a registry we own

Old setup, in shorthand:

```
--cache-to type=gha,mode=max
--cache-from type=gha
```

Plus `crazy-max/ghaction-github-runtime` to wire up the GHA cache tokens. Plus the constant low-grade anxiety that the 10 GB cache quota was going to evict the layers we needed during a release window.

New setup, in the `cachedImage` helper that wraps every `@pulumi/docker-build.Image` resource:

```typescript
// infra/gcp/utils.ts
const ZOT_HOST = "zot.zot.svc.cluster.local:5000";

const sanitizedBranch = (process.env.GITHUB_REF_NAME ?? "dev")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase()
    .slice(0, 100);

/**
 * Wrap `dockerbuild.Image` with import/export cache pointing at the
 * in-cluster zot.
 *
 * Cache key strategy:
 *   - Per-image repo (`cache/<name>`) avoids manifest write contention
 *     between concurrent builds and keeps retention policies scoped.
 *   - `cacheTo` writes to the current branch tag; long-lived branches
 *     accumulate their own warm cache.
 *   - `cacheFrom` falls back to `branch-dev` then `branch-main` so cold
 *     PR builds pick up the freshest available baseline.
 */
export function cachedImage(
    name: string,
    args: CachedImageArgs
): dockerbuild.Image {
    const repo = args.cacheRepo ?? `cache/${name}`;
    const cacheRef = (tag: string) => `${ZOT_HOST}/${repo}:${tag}`;

    return new dockerbuild.Image(name, {
        ...args,
        cacheFrom: [
            { registry: { ref: cacheRef(`branch-${sanitizedBranch}`) } },
            { registry: { ref: cacheRef("branch-dev") } },
            { registry: { ref: cacheRef("branch-main") } },
            ...(args.cacheFrom ?? []),
        ],
        cacheTo: [
            {
                registry: {
                    ref: cacheRef(`branch-${sanitizedBranch}`),
                    mode: "max",
                    imageManifest: true,
                    ociMediaTypes: true,
                },
            },
            ...(args.cacheTo ?? []),
        ],
    });
}
```

Four design choices worth calling out:

1. **Per-image cache repo.** `cache/wallet`, `cache/listener`, `cache/backend`, etc. Each image gets its own namespace. Two builds can run concurrently without writing to the same manifest, and retention policies stay easy to reason about.

2. **`cacheTo` writes to the current branch.** Long-lived branches (`dev`, `main`, integration branches) build up their own warm cache. Short-lived PR branches write into their own ref and won't pollute `dev`'s cache. They also won't *benefit* from `dev`'s cache by writing into it, which is correct.

3. **`cacheFrom` walks a fallback chain.** First the current branch's cache. Then `branch-dev`. Then `branch-main`. A cold PR build (branch never built before) gets to warm-start from whatever's freshest. No manual cache-warming, no special-case workflow dispatch.

4. **`mode: "max"` exports every intermediate layer.** Not just the final image's manifest. Multi-stage Dockerfiles only benefit from registry cache if intermediate stages are exported; `mode: "max"` is the difference between a cache that helps and a cache that doesn't.

The first two `imageManifest: true` + `ociMediaTypes: true` flags produce OCI-native manifests, matching Zot's preferred flavor and avoiding an occasional Docker-schema cache-miss footgun we hit during initial setup.

Zero quota. Zero egress. The same cache layer is reused by the GCP image push step that comes after: when SST's `dockerbuild.Image` pushes to Artifact Registry, the layers it needs are already in Zot, and BuildKit deduplicates by content hash.

The same idea landed on the infra-core side at the same time (`00667d3`: Swap GHA cache for registry cache, drop crazy-max action). Same shape, same wins.

## Lever 4: Killing Dockerfile.base

The biggest single commit of this work (`b4cf292a3`: Overhaul Docker build pipeline with zot registry cache) deletes `Dockerfile.base` and replaces it with six self-contained multi-stage Dockerfiles. The commit message captures the model:

> Delete the monolithic Dockerfile.base in favor of self-contained multi-stage builds. Each image now wires its own tooling -> deps -> sdk-builder -> app/runtime stages with BuildKit cache mounts that share state across all six images via id=bun-store, id=apt-cache, id=apt-lib.

The trick is the global cache mount IDs. Let's walk through what one of these Dockerfiles looks like, then explain why this works.

```dockerfile
# apps/wallet/Dockerfile
# syntax=docker/dockerfile:1-labs

ARG BUN_VERSION=1.3.11

FROM oven/bun:${BUN_VERSION} AS tooling
# Node 24 needed by tsdown / @vanilla-extract/integration during SDK build.
# vanilla-extract's compile() uses vm.Script + Module._load via the `eval`
# package, which Bun's Node compat layer cannot satisfy from a VM sandbox.
RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs

FROM tooling AS deps
WORKDIR /app
COPY --link package.json bun.lock tsconfig.json ./
# `--parents` (Dockerfile 1.7+) preserves directory structure so every
# workspace package.json lands at its canonical path without 22 separate
# COPY statements.
COPY --link --parents \
    apps/*/package.json \
    services/*/package.json \
    packages/*/package.json \
    sdk/*/package.json \
    example/*/package.json \
    ./
RUN --mount=type=cache,id=bun-store,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile

FROM deps AS sdk-builder
COPY --link sdk ./sdk
COPY --link packages/rpc ./packages/rpc
COPY --link packages/dev-tooling ./packages/dev-tooling
COPY --link packages/ui ./packages/ui
COPY --link packages/design-system ./packages/design-system
RUN bun run build:sdk

FROM sdk-builder AS app-builder
COPY --link packages ./packages
COPY --link apps/wallet ./apps/wallet
# ... ARGs, secrets, bun run build ...

# Pre-compress static assets so nginx `gzip_static on` serves them
# without spending CPU per request.
RUN find dist -type f \
    \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' \
       -o -name '*.svg' -o -name '*.txt' -o -name '*.xml' -o -name '*.ico' \) \
    -print0 \
    | xargs -0 -P "$(nproc)" -n 32 gzip -9 -k && \
    echo "Pre-compressed $(find dist -name '*.gz' | wc -l) files"

FROM nginx:1.29.1-alpine
COPY --from=app-builder /app/apps/wallet/dist /usr/share/nginx/html
# ...
```

Three things make this work as a *shared* cache strategy across six images.

**Cache mount IDs are global to the BuildKit daemon.** When two Dockerfiles both declare `id=bun-store`, they read and write the same cache directory inside the daemon. Image B's `deps` stage warms the same `~/.bun/install/cache` that image A's `deps` stage just populated. Six images, one cache. The trick scales: `id=apt-cache` shares the apt download cache, `id=apt-lib` shares the apt lib directory, and Node + Bun setup runs from cache for every image after the first.

**`COPY --link --parents` keeps the deps stage stable.** Without `--parents`, copying 22 workspace `package.json`s required 22 separate `COPY` statements with rigid paths. With it, one glob copies them all in their canonical directory structure. The resulting layer hash is deterministic: only changes to the actual package.jsons invalidate the layer. The `dockerfile:1-labs` syntax pragma is what unlocks `--parents`; we standardized it across all six Dockerfiles in the same commit (`29dc83cbd`).

**Each image's runtime stage is genuinely minimal.** The frontend images (`wallet`, `listener`, `business`) ship `nginx:1.29.1-alpine` with just the `dist/` directory copied in: ~50 MB shed per image vs the Debian-based nginx we were using before. The backend stays on Debian-flavored `oven/bun` because three runtime dependencies (sharp, lightningcss, @libsql/client) ship native binaries reliably only against glibc. The honest comment in the file:

```dockerfile
# Runtime stays on the Debian-flavored `oven/bun` image because three
# runtime dependencies ship native binaries that are reliably available
# there:
#   - sharp           (libvips bindings; glibc prebuilds are first-class)
#   - lightningcss    (parcel CSS engine; glibc binary preferred)
#   - @libsql/client  (better-sqlite3 native bindings)
# These three are excluded from `bun build` and installed at runtime
# instead of being bundled. Switching to alpine would require validating
# musl prebuilds for all three on every dependency bump, which is not
# worth the ~150 MB savings.
```

The bootstrap and credential-sync services get a different treatment: they're bundled to `dist/index.js` (728 KB) by `bun build`, and the runtime image ships `dist/` plus drizzle migration SQL. No `node_modules` at runtime. The smallest of the six images ends up under 200 MB.

One final detail in the backend's Dockerfile: a dedicated `runtime-deps` stage that installs the native modules into a scratch directory. The previous Dockerfile used a `/tmp` + `cp -rL` dance to get those modules out of the build stage; the cleaner version is a separate stage that produces a minimal `node_modules`:

```dockerfile
# Pre-install runtime-only native modules into a scratch directory so
# the final image gets a clean, minimal node_modules layer.
FROM tooling AS runtime-deps
WORKDIR /runtime
RUN --mount=type=cache,id=bun-store,target=/root/.bun/install/cache,sharing=locked \
    bun init -y >/dev/null \
    && bun add sharp lightningcss @libsql/client

FROM oven/bun:${BUN_VERSION}
WORKDIR /app
COPY --from=app-builder --chown=bun:bun /app/services/backend/dist ./dist
COPY --from=runtime-deps --chown=bun:bun /runtime/node_modules ./node_modules
```

Same `id=bun-store` cache mount as everywhere else: even installing three native modules into a scratch directory benefits from the shared bun store.

## The numbers, with caveats

The before/after we shipped:

| Build stage             | Before    | After cold  | After cached |
| ----------------------- | --------- | ----------- | ------------ |
| Total wallclock         | ~9 min    | ~4 min      | ~2 min       |
| `bun install` (warm)    | ~60 s     | ~12 s       | ~3 s         |
| SDK build               | ~45 s     | ~25 s       | ~10 s        |
| Image push (×6)         | ~90 s     | ~20 s       | ~10 s        |

The numbers are approximate; they vary by ±15% run-to-run depending on which image set the `paths-filter` step decides to rebuild. The headline rows are what we consistently see now.

Where the remaining minutes go:

- **The 30–60s runner cold start.** Min=0 scale set, first job after quiet pays the spawn cost. Worth ~25% of the "cached" number.
- **`gcloud auth + setup-gcloud + kubectl auth`.** ~40 s of cluster auth + Workload Identity federation we can't really compress.
- **`sst deploy` itself.** Pulumi state read, plan, apply. Even with no resource changes, it's ~30 s.
- **The build steps for the images that *did* change.** The whole point of the cache strategy is that *most* layers are reused; the 4-minute cold and 2-minute cached numbers are dominated by the few layers that genuinely need to be rebuilt.

We could squeeze further. Pre-warming a runner during business hours (`minRunners: 1`) would shave 30-60s. Mirroring frequently-used base layers into Zot would shave ~10s per cold image pull from Artifact Registry. We haven't, because the current numbers feel like the right place on the cost / complexity curve.

## What's transferable, even without our platform

The cluster makes this nice, but most of the wins are portable. If you're running on GitHub-hosted runners and a normal Docker registry, here's the short list of what to steal:

1. **Use BuildKit cache mount IDs (`id=bun-store`, `id=apt-cache`) instead of relying on layer caching.** Works with any BuildKit daemon. Massive win for monorepos where multiple images share an install step.

2. **If you're using GHA cache, prefer `type=registry` over `type=gha` once you outgrow the 10 GB quota.** Even pushing the cache to GHCR is workable; the per-image branch-tagged fallback chain pattern works against any registry.

3. **Branch-tagged cache exports with `dev`/`main` fallbacks.** Cheap to set up, dramatic improvement for PR builds that previously started cold.

4. **`COPY --link --parents` (with `dockerfile:1-labs`).** Best-in-class for monorepo package.json globbing. The syntax pragma is one line; the readability win is permanent.

5. **Pre-compress static assets in the build stage.** `nginx -t -c` will validate `gzip_static on` for you. Serving precomputed `.gz` files removes per-request compression CPU at runtime and makes cold-cache responses faster.

6. **Native modules: install in a dedicated stage, not the runtime image's main flow.** Easier to keep slim and easier to debug.

7. **`mode: "max"` on cache export.** Default `mode: "min"` only exports the final image layers; multi-stage builds need `max` for the cache to actually pay off.

8. **Pin BuildKit syntax version explicitly.** `# syntax=docker/dockerfile:1-labs` at the top of every Dockerfile makes the build deterministic across daemon upgrades.

## What we'd do next

Three loose ends.

**A warm runner during release windows.** `minRunners: 1` on a schedule (workday hours, US/EU overlap) would erase the cold-start tax during the hours we actually want fast feedback. Not on yet; on the list.

**Image pulls during deploy still hit Artifact Registry.** Mirroring our most-pulled base layers (oven/bun, nginx:alpine, the node 24 setup chain) into Zot would let the deploy pull cluster-local instead of GCP-resident. Small win individually, but compounds across the six images.

**A `Dockerfile` integration test.** The cache mount IDs and the multi-stage structure are a contract. We'd like a tiny CI step that asserts: each Dockerfile starts with the syntax pragma, each `bun install` step uses `id=bun-store`, no Dockerfile imports a `FROM base:latest` from a hypothetical resurrected `Dockerfile.base`. The kind of cheap test that catches regressions a year from now.

The bigger picture is that with the Hetzner platform in place, the per-repo CI work becomes a 100-line PR rather than a 6-month project. The next time we onboard a service to this pipeline, the cost is one Dockerfile, one entry in `cachedImage`, one `runs-on` change. The platform earns its keep every time we don't have to re-explain how to make a build fast.

If you're considering this kind of self-hosted CI investment, [start with the platform piece](/articles/frak-hetzner-platform); that's where most of the engineering lives. This article is the easier half: the application-side rewiring that consumes what the platform exposes.
