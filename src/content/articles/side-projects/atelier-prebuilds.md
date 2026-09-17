---
title: "L'Atelier: Content-Addressed Prebuilds"
date: 2026-09-17T12:00:00Z
draft: false
subtitle: "L'Atelier v3 can bake any git repo into a boot-ready sandbox. Content-addressed snapshots, CoW clones, and three bugs that taught me some respect for the filesystem, git credentials, and my own assumptions."
category: "tooling"
tags: ["Kubernetes", "VolumeSnapshots", "Prebuilds", "Dev Environments", "Self-Hosting", "Git", "AI"]
icon: "rocket"
iconColor: "text-green-400"
description: "How L'Atelier v3 bakes any git repo into a content-addressed VolumeSnapshot: content-key caching, torn-snapshot fixes, git credential hygiene, and CoW-clone fast boots."
githubUrl: "https://github.com/frak-id/atelier"
group: "atelier"
---

This is the fifth article about L'Atelier, my self-hosted sandbox orchestrator for AI coding agents. The [Kubernetes migration](/articles/side-projects/atelier-kubernetes-migration/) moved prebuilds onto the standard CSI `VolumeSnapshot` API, and the [supporting infrastructure post](/articles/side-projects/atelier-supporting-infrastructure/) covered the plumbing around them. But the most interesting change of v3.0.0 was the prebuild system itself, and it deserves more than a mention.

The idea is simple to state. A prebuild is not a config file you maintain. It is a content-addressed snapshot that the CLI can bake straight from whatever repo you have open.

The workflow I wanted was this. I'm in a project directory. I run `atelier prebuild create`, accept the defaults the CLI detected, and a few minutes later there's a snapshot of that repo with the code and the dependencies already in it. From then on, every sandbox I spawn into that repo boots in seconds with everything materialized.

It works now. But getting there meant fighting the page cache, the git credential system, and my own assumptions about what "clone succeeded" means. Here's how the system is designed, and the three bugs that shaped it.

## The Problem With Every Fresh Sandbox

A sandbox without a prebuild starts from a base image. `dev-base` is Debian plus Node 22, Bun, and git. Nothing an agent actually needs for *your* project.

So the first thing any agent does in a fresh sandbox is clone the repo and run the install. On a small project that's a minute of wasted time. On a monorepo with real dependencies, it's five to ten minutes of an agent staring at a progress bar, billed by the token.

And the cost isn't only time. Every fresh install is a fresh chance for a rate-limited npm or a broken postinstall script to derail the run. If the agent retries the task from a clean sandbox tomorrow, it pays all of it again.

The fix is well known. Codespaces has prebuilds, Gitpod has prebuilds, and I had a version of them too. In the original L'Atelier, workspace definitions baked a prebuilt volume that new sandboxes cloned. The K8s migration moved the snapshots to the standard CSI `VolumeSnapshot` API, which made the mechanics nicer. But the workflow still required a spec file describing the workspace: repos, build steps, all written and maintained by hand.

The spec file was the problem. Nobody wants to write YAML describing their repo when the repo itself already knows everything: its lockfile, its branch, its install command. All of that is sitting right there in the checkout. So in v3.0.0 I inverted the deal. Instead of writing a spec and getting a prebuild, you point at a repo and get a prebuild.

## The Flow: One Command From Any Checkout

From inside any git repository:

```bash
$ atelier prebuild create
? Repository URL to bake    github.com/frak-id/wallet
? Base image                dev-base
? Branch                    main
? Clone path                wallet
✓ Detected setup commands:
    [x] bun install
Baking prebuild…
✓ Baked snap-a1b2c3d4e5f6
```

The CLI walks you through repo URL, base image, branch, and clone path, sniffs the checkout for a lockfile to prefill the setup commands, and submits a `PrebuildSpec` to the server. Most of the answers are prefilled; you confirm and wait. For scripting there's a fully flagged variant: `--repo`, `--branch`, `--clone-path`, repeatable `--build` steps that override detection, `--no-detect`, and `--force`. One note for CI usage: non-interactive mode requires an explicit `--image <ref>`, since the CLI won't guess which base image to bake on top of.

If you already maintain a spec file, `atelier up --bake --spec spec.jsonc` derives the prebuild from it and boots a sandbox from the result in a single command.

The spec that lands on the server is intentionally boring:

```jsonc
{
  "source": { "image": "dev-base" },
  "repos": [
    { "url": "https://github.com/frak-id/wallet", "branch": "main", "clonePath": "wallet" }
  ],
  "build": ["cd wallet && bun install"]
}
```

Repos to clone, ordered shell steps to run, fail fast on the first error. The interesting part is what the server does with it.

## Content-Addressed Prebuilds

Before executing anything, the server computes a content key for the spec:

```text
sha256(source ⊕ image digest ⊕ files ⊕ build steps ⊕ repos ⊕ repo HEADs)
```

Every component is pinned. The source image is resolved to an immutable digest before hashing, so a rebuilt base image produces a different key. And each repo contributes the commit hash of its remote HEAD, fetched via `git ls-remote` at key-resolution time.

That last piece is what makes the cache maintain itself. When you push a new commit, the HEAD changes, the hash changes, and the next bake misses the cache and rebuilds. Nobody remembers to invalidate a cache that's derived from the content itself.

The resulting snapshot is stored as `snap-<hash12>`, the SHA-256 truncated to 12 hex characters. The full 64-character hash rides along as a Kubernetes annotation rather than a label, because labels cap at 63 bytes. I lost twenty minutes to an API server rejecting my perfectly good hash for that reason.

Two more details worth naming. Concurrent bakes for the same key dedupe into a single execution, since two callers racing the same content would otherwise try to create the same temp pod (`pb-<hash12>`, deterministically named from the hash) twice. And `env` is deliberately excluded from the key: build-time secrets would otherwise leak their presence into a cache key. If your build environment changes, you re-bake with `--force`.

## The Bake: A Throwaway Pod

The execution model is cheap and disposable: boot a throwaway pod from the source image (or from a parent snapshot, which lets prebuilds chain), do the work, snapshot the workspace volume, tear everything down.

```text
Bake lifecycle (RuntimeService.prebuild)
├── 1. resolveContentKey()     → cache hit? return existing snapshot
├── 2. withThrowawayPod()      → boot pod, NO agent processes running
├── 3. write git credential    → transient, via agent file-write (not files[])
├── 4. git clone --depth 1     → as dev (uid 1000), per repo
├── 5. run build[] steps       → as dev, fail-fast, 10 min timeout each
├── 6. scrub credential file   → rm -f, as root
├── 7. sync                    → flush guest page cache
├── 8. snapshotPvc()           → VolumeSnapshot snap-<hash12>
└── 9. record prebuild         → before teardown, so cleanup can't orphan it
```

Steps 4, 7, and 3 each represent a bug that produced corrupted, useless, or quietly stale snapshots in production before I understood them.

### Bug 1: The Clone That Succeeded and Contained Nothing

The first baked snapshots were intermittently garbage. The bake job reported success, the snapshot looked fine, and then a sandbox booted from it with a `.git` directory that was partially there, an empty HEAD, and missing files.

The clone had exited 0. The snapshot was taken after the process finished. What could go wrong in between?

The answer is the Linux page cache. When `git clone` returns, its data is not guaranteed to be on disk. It can still be sitting in the guest's dirty page cache, waiting to be written back. A `VolumeSnapshot` is a point-in-time copy taken by the CSI driver (TopoLVM in my case), and on a Kata guest the copy races the writeback. The snapshot occasionally won, capturing a torn filesystem.

The fix is one line and extremely old school:

```typescript
// flush the guest page cache before snapshotting
await agent.exec(tempId, "sync", { user: "root", timeout: 30_000 });
```

`sync` blocks until dirty pages are written back. It mirrors the pre-pause sync the runtime already performs before pausing a sandbox, which means the lesson existed in the codebase and just hadn't reached the prebuild path yet. The OS is always right about when your data is durable. Ask it.

### Bug 2: Permission Denied, Everywhere

Next: build steps failing with `Permission denied` on clone. The cause was an assumption baked into the pod layout. The sandbox agent's working directory is `/`, which is root-owned and mode 0755. My build steps ran as the `dev` user, who can read `/` but certainly can't create a git repo inside it.

The fix pins every step that runs as `dev` to a working directory it actually owns:

```typescript
// dev steps run in /home/dev; root steps inherit /
execStep(step, { user: "dev", workdir: "/home/dev" });
```

There's a second reason to clone as `dev` rather than root-then-chown: git's "dubious ownership" guard. If root clones the repo into the workspace and the agent later runs `git status` as dev, git refuses to touch a repo owned by another user. Cloning as uid 1000 from the start means the baked workspace just works at boot, no `safe.directory` workarounds.

### Bug 3: Stale Prebuilds That Never Invalidated

This one was the sneakiest, because nothing failed. Public repos got correct, distinct content keys. Private repos produced keys that never changed.

The code path that fetches remote HEADs ran without credentials. For a private repo, `git ls-remote` fails with exit 128, the error was swallowed, and the HEAD silently dropped out of the hash. The same private repo, before and after a push, hashed to the same key. Its prebuild was born stale and stayed stale forever.

The fix threads a GitHub token from the CLI through the API seam down to the `ls-remote` call, and it forced me to think carefully about how the token travels:

- It rides an environment variable that an inline git credential helper reads. Never argv, because tokens in argv are visible to anyone running `ps`.
- A leading empty `credential.helper=` resets any inherited system helper first, so a corporate credential helper on some host can't intercept the call.
- The `ls-remote` gets a 5-second timeout, and fetched HEADs get a 30-second TTL cache, because computing a content key shouldn't be hostage to a slow GitHub.

Fixing the auth exposed the second half of the private-repo problem. Plenty of people (me included) paste `git@github.com:org/repo.git` SSH remotes. Without an SSH key provisioned in the sandbox, those clones fail with the classic "Could not read from remote repository." The sandbox now writes a tiny gitconfig that rewrites those remotes to their HTTPS form:

```ini
[url "https://github.com/"]
    insteadOf = git@github.com:
    insteadOf = ssh://git@github.com/
```

One credential source, HTTPS, covering both syntaxes. The SSH remote is syntactic sugar; the token does the actual authenticating.

## Credential Hygiene: Where the Token Lives and Dies

A bake job with a GitHub token embedded in it is a small grenade: the token is sitting inside a snapshot that will be cloned, shared, and eventually deleted. The system defends in depth.

1. **The credential is transient by construction.** It's written at bake time through the agent's file-write channel, never through the spec's `files[]`. So it never enters the content hash, and it never lands in a declarative artifact that gets persisted alongside prebuild records.
2. **It's scrubbed before snapshotting.** `rm -f /etc/sandbox/secrets/git-credentials` runs as root just before the snapshot. The file also lives on the ephemeral rootfs, outside the workspace PVC (the one backing `/home/dev`) that actually gets snapshotted. The scrub is defense-in-depth, not the only barrier.
3. **Local mode asks before injecting.** `atelier local up --git-auth ask` is the default, and it never auto-injects a token non-interactively. CI environments full of ambient `GITHUB_TOKEN` variables are exactly where a silent injection would leak a credential you didn't mean to hand over. Scripted callers must opt in explicitly with `--git-auth`.

One honest gap remains: the background job that refreshes stale prebuilds runs without any user context, so it stays tokenless and skips private repos rather than attempting drift detection it can't authenticate for. Private prebuilds only update when something explicitly re-bakes them. That's a trade I'll take — a stale prebuild is an inconvenience, a leaked token is an incident.

## Restoring: The Fast Path and the Patient Path

On spawn, the CLI looks for a prebuild matching the repo and branch you're booting. An exact repo-plus-branch match wins. If only a different branch of the same repo was baked, it still uses that snapshot and reconciles after boot: `git fetch --all --prune`, checkout, and a `--ff-only` pull inside the sandbox. Branch drift costs one fetch, not one full bake.

The restore itself is the standard CSI dance. The sandbox's PVC is created with the prebuild snapshot as its `dataSource`, and TopoLVM hands back a copy-on-write clone: only blocks changed after the snapshot get written. A sandbox from a prebuild is ready in the same 5-6 seconds as any other Kata pod on my hardware, and the multi-gigabyte `node_modules` tree is already inside the volume, materialized the moment a block is first read.

```bash
$ atelier jobs get <job-id>    # poll a bake while it runs
$ atelier jobs watch           # or stream every job's output live
$ atelier up --from-snapshot snap-a1b2c3d4e5f6
```

Every long operation, bakes included, flows through the same `jobs` API, so a bake is exactly as observable as a sandbox boot: stream it, poll it, cancel it.

## Letting the Lockfile Do the Talking

The last piece is the detection that makes `atelier prebuild create` mostly a confirm-and-wait flow. It's pure filesystem sniffing, no network and no package registry calls, with a fixed precedence per ecosystem:

| Checkout contains | Detected step |
|---|---|
| `bun.lockb` / `bun.lock` | `bun install` |
| `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` |
| `yarn.lock` | `yarn install --frozen-lockfile` |
| `package-lock.json` | `npm ci` |
| `Cargo.toml` | `cargo fetch` |
| `go.mod` | `go mod download` |
| `poetry.lock` | `poetry install` |
| `Pipfile` | `pipenv install --deploy` |
| `pyproject.toml` / `requirements.txt` | `pip install .` / `pip install -r requirements.txt` |
| `Gemfile` / `composer.json` | `bundle install` / `composer install` |

One rule makes this safe to run from any directory: detection results are only trusted when the detected checkout belongs to the exact repo being baked. Standing in an unrelated project with a `package-lock.json` never pollutes a bake for a Go module. And repeatable `--build` flags override detection entirely for anything the lockfile can't express: codegen, proto compilation, that one `postinstall` you don't trust to run unattended.

## Trade-offs

**Baking is still minutes.** The content-addressed cache makes bakes repeatable, not instant. A fresh key means clone plus install plus build, same as always. The win is that you pay it once per unique state of the repo, and every subsequent sandbox of that state skips it.

**Snapshots are cheap but not free.** Copy-on-write clones start near-zero, but each distinct prebuild state is a full snapshot on the thin pool. A background job refreshes stale prebuilds and prunes unused ones on a 30-minute cron, and content-addressing means repeated bakes of unchanged repos dedupe instead of accumulating.

**The staleness cron can't see private repos.** Covered above. It's the one behavior I'd change if the server ever holds per-user tokens. Until then, private prebuilds are pull-driven: stale until you re-bake.

**Hash-busting is only as smart as the hash.** The content key sees the spec and the remote HEADs. It doesn't see your lockfile's contents or a base image's layer contents. It sees the digest, which is why image pinning matters. If your build depends on something outside the spec, a floating `latest` somewhere, an unpinned tool, the cache will happily serve you a stale world. The spec is the contract; put everything it depends on in it.

## What's Next

**Composed prebuilds.** Right now a prebuild is one big snapshot: base image, repo, and dependencies fused together. The proposal docs in the repo sketch splitting it into two tiers: a per-repo workspace snapshot for the code, plus separately versioned artifact bundles for toolchains, composed at boot within a ~500ms overlay budget. That would turn "npm published a new major" into a toolset re-bake that leaves the repo snapshot untouched, and make one repo snapshot reusable across several toolchains.

**A warm pool.** I floated this at the end of the migration post and it still holds: pre-claim one PVC per workspace from its prebuild snapshot, so spawn claims an existing clone instead of creating one on the fly. Combined with in-place pod vertical scaling, that's the path back toward the sub-second boots Firecracker used to give me. Which is a sentence I never expected to write about Kubernetes.

If you want to poke at the system, v3.0.x is on [GitHub](https://github.com/frak-id/atelier), and the Helm chart installs the whole stack: `helm install atelier oci://ghcr.io/frak-id/charts/atelier`. Local mode (`atelier local up`) runs the same stack on your machine, no cluster required.

## Links
- [L'Atelier on GitHub](https://github.com/frak-id/atelier)
- [Kubernetes VolumeSnapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [TopoLVM](https://github.com/topolvm/topolvm)
- [Kata Containers](https://katacontainers.io/)
- [GitHub credential helpers](https://git-scm.com/docs/gitcredentials)
