---
title: "The Supporting Cast: L'Atelier's Infrastructure Beyond the Orchestrator"
date: 2026-03-07T12:00:00Z
draft: false
subtitle: "The orchestrator gets all the glory, but it's the proxy, the cache, and the registry that make the system actually usable."
category: "tooling"
tags: ["Kubernetes", "Infrastructure", "LLM", "DevOps", "Self-Hosting", "Verdaccio", "Zot", "CLIProxy"]
icon: "layers"
iconColor: "text-green-400"
description: "An AI sandbox orchestrator needs more than just an orchestrator. Here's how CLIProxy, shared binary volumes, Verdaccio, and a single Helm chart turn L'Atelier from a VM launcher into a dev platform."
githubUrl: "https://github.com/frak-id/atelier"
group: "side-projects"
---

In my last post, I talked about the massive architectural shift of moving L'Atelier to Kubernetes and Kata Containers. Deleting 8,000 lines of code felt great, but an orchestrator alone doesn't make a development platform. It's just a way to start and stop VMs.

If the orchestrator is the heart of the system, the supporting infrastructure is the rest of the body. It's the stuff that handles LLM rate limits, caches npm packages so you aren't waiting ten minutes for a build, and manages the binaries that make the sandbox feel like a real IDE.

When we moved to K8s, we didn't just move the sandbox pods. We moved the entire supporting cast. Here is how we built the infrastructure that makes L'Atelier work day-to-day.

## CLIProxy: The LLM Load Balancer

The biggest bottleneck for any AI-powered dev tool isn't the code. It's the API limits.

We have three developers on the team. Each of us has our own enterprise accounts for Anthropic, OpenAI, and Google. If we hardcoded a single set of API keys into the manager, we'd hit rate limits the moment two of us started running complex tasks in parallel.

We needed a way to pool our keys and distribute the load.

Enter **CLIProxy**. It's an OpenAI-compatible API proxy that sits in front of every LLM provider we use. It runs as a standard K8s Deployment in the `atelier-system` namespace and exposes a single endpoint at port 8317.

### How it works

CLIProxy acts as a traffic controller. When an AI agent in a sandbox wants to talk to Claude 3.5 Sonnet, it doesn't call Anthropic directly. It calls CLIProxy.

```text
Sandbox Pod (OpenCode)
      │
      │ POST /v1/chat/completions
      ▼
CLIProxy (K8s Service)
      │
      ├─► Provider A (Anthropic Key 1)
      ├─► Provider B (Anthropic Key 2)
      └─► Provider C (OpenRouter/Google/etc.)
```

The proxy load-balances requests across all configured provider accounts equally. If one account hits a rate limit, it fails over to the next one. This gives us a massive aggregate throughput that a single account could never match.

### Per-Sandbox API Keys

This is the feature that changed how we track costs. Instead of using one master key for the whole cluster, the manager generates a unique API key for every single sandbox: `atelier-sbx-{sandboxId}-{random8chars}`.

When a sandbox boots, the manager:
1. Generates the unique key.
2. Registers it in CLIProxy via the management API.
3. Injects it into the sandbox's OpenCode configuration.
4. Revokes the key automatically when the sandbox is destroyed.

This gives us three things we didn't have before. First, **per-sandbox usage tracking**. We know exactly which task consumed how many tokens. Second, **quota enforcement**. We can set a hard limit on a specific sandbox so a runaway loop doesn't drain our entire monthly budget. Third, **security**. If a sandbox is compromised, that specific key is useless the moment the pod dies.

### Exportable Config for Local Dev

We also wanted the same experience when coding locally. The manager has an endpoint (`GET /api/cliproxy/export`) that generates a provider configuration from CLIProxy's current model list.

I can export this config to my local OpenCode installation. I get the same models, the same load balancing, and the same usage tracking, whether I'm running in a remote sandbox or on my laptop.

## Shared Binaries: The Read-Only Volume

One of the biggest mistakes I made in the early versions of L'Atelier was baking everything into the Docker image.

A standard sandbox needs `code-server` (~130MB) and the `OpenCode` binary (~90MB). If you put those in the base image, your image size balloons to over 500MB. That makes every `docker pull` slower and eats up registry storage.

Even worse, if you want to update `code-server`, you have to rebuild the entire image, push it, and then re-snapshot every single workspace. It's a nightmare.

In the K8s version, we moved these binaries to a **Shared PersistentVolume**.

```text
Host Filesystem: /opt/atelier/shared-binaries/
├── code-server/ (v4.109.5)
└── opencode/    (v1.2.18)

K8s Resources:
├── PersistentVolume (Local PV, hostPath)
├── PersistentVolumeClaim (ReadOnlyMany)
└── Sandbox Pods (mount at /opt/shared, read-only)
```

Because we use Kata Containers with Cloud Hypervisor, this volume is exposed to the VM guest via `virtio-fs`. The guest reads the host files directly with almost zero overhead.

### Why this is better

1. **Small Images**: Our base image is now ~300MB instead of ~520MB.
2. **Instant Updates**: To update `code-server`, we run a K8s Job that downloads the new version into the shared directory. The next time a sandbox starts, it sees the new version immediately. No image rebuilds required.
3. **Storage Efficiency**: We aren't duplicating 220MB of binaries across every single workspace snapshot.

The PATH inside the sandbox is configured to include `/opt/shared/code-server/bin` and `/opt/shared/opencode`. To the user, it looks like the tools are installed locally. To the system, they're a shared resource.

## Verdaccio: The npm Cache

If you've ever run `npm install` on a fresh project, you know the pain of waiting for the network. In a system where we spawn dozens of sandboxes a day, this latency is unacceptable.

Before the K8s migration, I had a custom setup where the manager spawned Verdaccio as a child process. I had 451 lines of code just to manage its lifecycle, handle storage eviction, and proxy requests. It was a mess.

Now, Verdaccio is just another Deployment.

### The Cache Flow

Every sandbox gets a custom registry configuration injected at boot:
- `/etc/npmrc` for npm
- `~/.bunfig.toml` for Bun
- `~/.yarnrc.yml` for Yarn

All of them point to `http://verdaccio.atelier-system.svc:4873`.

The first time any sandbox in the cluster requests a package, Verdaccio downloads it from the public registry and caches it. Every subsequent sandbox gets that package at local network speeds. Zero external calls.

This doesn't just save time; it makes the system more resilient. If npm goes down (it happens), our sandboxes keep working as long as the packages are in the cache.

## Zot: In-Cluster Image Storage

We pull base images every time a sandbox boots. If we relied on Docker Hub or GHCR, we'd be constantly fighting latency and rate limits.

We run **Zot**, a tiny, OCI-compliant registry, inside the cluster. It's a single 15MB binary that uses about 30MB of RAM when idle. It stores our two primary base images:

| Image | Contents |
|---|---|
| `dev-base` | Debian Bookworm, Node 22, Bun, git, and basic build tools. |
| `dev-cloud` | Everything in `dev-base` plus AWS CLI, GCloud SDK, and kubectl. |

When we need to build a new version of an image, the dashboard triggers a **Kaniko** Job. Kaniko builds the Dockerfile inside a pod and pushes it directly to Zot. We don't need a Docker daemon or privileged containers to build our own infrastructure.

## Task Creator Tracking

This was a small change that had a huge impact on how we use the system as a team.

In the old system, every git commit made by an AI agent showed up as "Sandbox User". When you're looking at a PR with twenty commits, it's impossible to tell who actually initiated the work.

We updated the task schema to include a `TaskCreator` object:
```typescript
{
  username: string,
  email: string,
  avatarUrl: string
}
```

Now, when a task spawns a sandbox, we use the creator's identity as the git user for that branch. When the AI agent commits code, it looks like this:

```text
Author: John Doe <john@example.com>
Date:   Sun Mar 8 14:20:00 2026

feat: implement the new billing logic
```

On the dashboard kanban board, every task card shows the creator's avatar. It sounds like a minor UI polish, but it makes the system feel human. You aren't just looking at a list of AI tasks; you're looking at work your teammates have dispatched.

## The Helm Chart: One Install to Rule Them All

The most significant "supporting" piece is the Helm chart itself.

In the Firecracker era, installing L'Atelier involved a 3,141-line TypeScript CLI that asked a dozen interactive questions, messed with your LVM setup, and created systemd units. It was terrifying to run.

Now, the entire system is defined in 17 YAML templates.

| Feature | Old CLI (TypeScript) | New Helm Chart (YAML) |
|---|---|---|
| Lines of Code | 3,141 | ~480 |
| Root Required | YES | NO (only for k3s install) |
| Portability | Locked to specific Linux distros | Any K8s cluster with Kata |
| Updates | Manual binary swap | `helm upgrade` |

Everything from the manager and CLIProxy to the RBAC rules and TLS certificates is handled by a single `values.yaml` file.

```bash
helm install atelier oci://ghcr.io/frak-id/charts/atelier \
  --values values.production.yaml
```

## What's Next

The infrastructure is stable, but there are pieces still missing.

**SSHPiper.** In the old setup, we had a proxy that let you SSH directly into a sandbox using its ID as the username. We removed it during the K8s migration to simplify the networking. The web-based terminals work for most things, but for VS Code Remote SSH or JetBrains remote development, native SSH matters. SSHPiper will come back as a K8s Deployment — the pods already have normal TCP IPs, so the plumbing is straightforward.

**Cost dashboard.** CLIProxy tracks per-sandbox usage, but we don't surface it yet. The data is there — we just need to wire it into the dashboard so you can see "this task cost $2.40 in API calls" next to the completion notification.

**Multi-node.** Right now, we're limited to a single node because our storage (TopoLVM) relies on local LVM groups. We're evaluating distributed storage options that would let us scale sandboxes across a pool of servers while keeping the instant-cloning performance of LVM thin provisioning.

The orchestrator gets all the glory, but it's these boring, reliable supporting services that make L'Atelier a place where we can actually get work done.

## Links
- [CLIProxy API](https://github.com/router-for-me/CLIProxyAPI)
- [Verdaccio](https://verdaccio.org/)
- [Zot Registry](https://zotregistry.dev/)
- [Kaniko](https://github.com/GoogleContainerTools/kaniko)
- [L'Atelier on GitHub](https://github.com/frak-id/atelier)
- [OpenCode](https://github.com/anomalyco/opencode)

