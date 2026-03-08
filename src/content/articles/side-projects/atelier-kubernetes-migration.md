---
title: "L'Atelier: Why I Deleted 8,702 Lines of Code to Move to Kubernetes"
date: 2026-03-06T12:00:00Z
draft: false
subtitle: "Migrating from a custom Firecracker orchestrator to Kata Containers and k3s. Better portability, less maintenance, and a lot of deleted code."
category: "tooling"
tags: ["Kubernetes", "Kata Containers", "Firecracker", "Cloud Hypervisor", "Self-Hosting", "Dev Environments", "LVM"]
icon: "ship"
iconColor: "text-blue-400"
description: "L'Atelier just went through its biggest architectural shift yet. I swapped a custom bare-metal Firecracker orchestrator for Kubernetes and Kata Containers — deleted 8,702 lines of code, gained portability, and traded sub-second boots for a system I can actually maintain."
githubUrl: "https://github.com/frak-id/atelier"
group: "side-projects"
---

In the first article, I talked about why I built L'Atelier: I wanted a self-hosted, isolated environment where AI agents could code without me having to watch their every move. Firecracker was the perfect tool for that. It gave me sub-second boot times and hardware-level isolation on bare metal.

As I wrote about in the second article, the dashboard was still one too many clicks away, which led to the Slack bot and MCP server. But even with those improvements, the underlying infrastructure was still a pet.

But after a month of daily use, the cracks started to show. Not in Firecracker itself, but in the mountain of custom code I had to write to keep it running.

I was babysitting the orchestrator instead of the agents.

Last week, I deleted 8,702 lines of code. I replaced my custom "kernel" with Kubernetes and Kata Containers. Here is why, how, and what I learned in the process.

## The Burden of Being Special

When you build a custom orchestrator on bare metal, you're responsible for everything. I mean everything.

To get a sandbox running in the old Firecracker-based system, L'Atelier had to:
1.  Talk to LVM to create a thin-provisioned logical volume.
2.  Format that volume and mount it to inject SSH keys and config.
3.  Manage a pool of TAP devices for networking.
4.  Configure iptables for NAT and port forwarding.
5.  Talk to the Caddy Admin API to update reverse proxy routes.
6.  Manage the Firecracker process lifecycle (jailer, vsock, etc.).
7.  Handle guest operations like clock sync, DNS, and hostname setup.

I had a CLI tool called `atelier init` that was 3,141 lines of TypeScript just to provision the server. It was brittle. If I wanted to move L'Atelier to a different VPS provider, I had to hope their kernel supported my specific LVM setup and network bridge configuration.

It wasn't portable. It was a pet, not a platform.

The complexity was everywhere. My `infrastructure/` directory alone was 2,471 lines of code. I had 827 lines just for managing Caddy routes and 642 lines for raw LVM shell-outs like `lvcreate` and `resize2fs`. Every time I wanted to add a feature, I had to think about how it would affect the underlying Linux host.

I was essentially building my own mini-Kubernetes, but worse. I was reinventing the wheel, and my wheel was square.

### Architecture Before (The Firecracker Era)

```text
Bare metal server (root required)
├── Manager (Bun/Elysia, port 4000)
├── Caddy (reverse proxy, TLS)
├── Verdaccio (host process, managed by manager)
├── Firecracker VMs (one per sandbox)
│   └── Rust agent (vsock:9998)
└── CLI (atelier) → server provisioning, LVM setup, image management
```

## The New Stack: k3s + Kata Containers

I decided to move everything into Kubernetes. But not "standard" Kubernetes with shared-kernel containers. I still needed the isolation of a VM for running untrusted AI-generated code.

The answer was Kata Containers with the Cloud Hypervisor VMM.

Kata lets you run pods inside lightweight VMs. To Kubernetes, it's just another pod. To the host, it's a secure, isolated sandbox. By using k3s (a lightweight K8s distro), I could keep the resource overhead low while offloading all the "boring" infrastructure work to the K8s ecosystem.

The transition happened in three distinct phases over about a week:
- **Phase 1**: Validating the stack. I ran k3s, Kata, Zot (a lightweight OCI registry), and Kaniko on a production VPS alongside the live Firecracker setup. I needed to be sure that Kata could actually run on my hardware without a massive performance hit.
- **Phase 2**: Rewriting the core. This took 11 incremental commits, touching the kernel, lifecycle management, prebuilds, and guest operations. This was the "surgery" phase where I swapped out the old Firecracker logic for the new K8s logic.
- **Phase 3**: Helm chart and cleanup. I deleted the old CLI and replaced it with a single `helm install` command. This was the most satisfying part, as I watched thousands of lines of code disappear from the repository.

### Architecture After (The K8s Era)

```text
k3s cluster (single or multi-node)
├── Manager + Dashboard (Deployment + PVC for SQLite)
│   └── Custom fetch()-based K8s client
├── Ingress controller (Traefik, bundled with k3s)
├── TopoLVM (CSI driver, LVM thin provisioning + VolumeSnapshots)
├── Zot registry (base images)
├── Verdaccio (Deployment + PVC, npm cache)
├── Kaniko (Job pods for base image builds)
├── Sandbox pods (runtimeClassName: kata-clh)
│   ├── Base image (dev-base or dev-cloud)
│   ├── Workspace PVC (CoW clone from VolumeSnapshot)
│   └── Shared binaries PV (ReadOnlyMany)
└── Helm chart replaces CLI entirely
```

## The LoC Economy: Deleting the "Kernel"

The most satisfying part of this migration was the `git rm`. Because I had previously refactored L'Atelier to use a hexagonal architecture (isolating the hypervisor logic into a `kernel/` directory), the migration was surprisingly clean.

I didn't have to touch the AI agent logic, the Slack bot, or the MCP server. I just had to write a new "kernel" that talked to the Kubernetes API instead of raw Linux syscalls.

| Component | Before | After | Delta |
|---|---|---|---|
| Manager (infra + orchestrators) | ~7,555 | ~3,764 | -3,791 |
| CLI | 3,141 | 0 | -3,141 |
| Agent | 3,040 | ~1,500 | -1,540 |
| Infra scripts | 480 | ~250 | -230 |
| **Total** | **~14,216** | **~5,514** | **-8,702** |

That is a **61% reduction in code**. I deleted more code than I currently have in the entire repository. This isn't just about vanity metrics; it's about maintenance. Every line of code I deleted is a line I no longer have to debug, test, or update.

## Technical Deep Dive

### 1. The Custom K8s Client
I ran into a snag early on. The official `@kubernetes/client-node` library has some deep-seated compatibility issues with Bun's runtime. Instead of fighting with polyfills, I realized I only needed about 5% of the K8s API.

I wrote a thin, zero-dependency wrapper using Bun's native `fetch()`. It's about 250 lines of code and handles everything: creating Pods, Services, Ingresses, and watching for status changes. Bun's `fetch()` is native and fast, so this ended up being a performance win as well. It also means L'Atelier has fewer dependencies to worry about.

### 2. Storage: From Raw LVM to VolumeSnapshots
In the Firecracker version, I used LVM snapshots for "prebuilds." When you start a new sandbox, it clones a pre-warmed LVM volume that already has `node_modules` installed.

In K8s, I use **TopoLVM** and the standard **VolumeSnapshot** API.
- **Prebuild**: A Job runs `npm install`, then we take a `VolumeSnapshot`.
- **Sandbox**: We create a new PVC using that snapshot as the `dataSource`.

It's still Copy-on-Write (CoW). It's still instant. But now it's managed by a CSI driver instead of my own buggy shell scripts. Plus, I can now resize PVCs on the fly with a simple `kubectl patch`. This was a huge pain point in the old system where volumes were fixed-size.

```text
TopoLVM Thin Pool (LVM VG on node)
├── Prebuild VolumeSnapshots (per-workspace)
│   ├── prebuild-myproject (snapshot of PVC + repo + init deps)
│   └── prebuild-backend
├── Sandbox PVCs (CoW clones from snapshots)
│   ├── sandbox-abc (~0 MB initially)
│   ├── sandbox-def (~0 MB initially)
│   └── sandbox-ghi (~12 MB delta)
└── Only changed blocks stored per sandbox
```

### 3. Networking: vsock to TCP
Firecracker uses `vsock` for host-guest communication. It's secure but a pain to work with from a Node/Bun environment. In K8s, every pod gets its own IP. My Rust agent now listens on a standard TCP port (9998).

The `AgentClient` shrank from 704 lines to about 200. No more vsock-to-tcp proxies or complex socket handling. The pods can talk to each other using standard K8s services, which makes things like the shared Verdaccio registry much easier to manage.

### 4. Dynamic Routing with Ingress
I replaced the Caddy Admin API integration with standard K8s Ingress resources. When the manager spawns a sandbox, it creates an Ingress that routes traffic to the pod's internal services.

```text
K8s Ingress (created dynamically by manager)
├── sandbox-{id}.{domain}    → svc/sandbox-{id}:8080 (VSCode)
├── opencode-{id}.{domain}   → svc/sandbox-{id}:3000 (OpenCode)
├── dev-{name}-{id}.{domain} → svc/sandbox-{id}:{port} (Dev servers)
└── browser-{id}.{domain}    → svc/sandbox-{id}:6080 (KasmVNC)
```

The manager creates these resources via the custom KubeClient. Caddy still sits at the edge of the server to handle TLS termination, but it just forwards everything to the K8s Ingress controller (Traefik, which comes bundled with k3s). This setup is much more reliable and follows standard K8s patterns.

### 5. Letting K8s Handle the "Guest Ops"
This was the biggest win. Look at all the code I was able to delete because Kubernetes handles it natively:

| Deleted Operation | Why K8s handles it |
|---|---|
| `buildDnsCommand()` | CoreDNS auto-populates pod DNS |
| `buildClockSyncCommand()` | Cloud Hypervisor provides kvmclock |
| `buildHostnameCommand()` | K8s pod spec `hostname` field |
| `buildSwapCommand()` | K8s memory requests/limits |
| `buildMountSharedBinariesCommand()` | K8s volume mounts |
| `resizeStorage()` | PVC resize via TopoLVM CSI |

I no longer have to worry about whether the guest VM has the right DNS settings or if the clock is drifting. Kubernetes just makes it work.

## The Trade-offs: Boot Time vs. Portability

I'll be honest: I lost some speed.

In the Firecracker era, with memory snapshots, I could restore a VM in under 150ms. Even without snapshots, a cold boot was about 1.5 seconds.

With Kata Containers and K8s, a sandbox takes about **5-6 seconds** to be "Ready."
- 1s for K8s to schedule the pod and create the PVC.
- 2s for Kata to start the Cloud Hypervisor VM.
- 2s for the agent to start and the network to settle.

For a dev environment that stays open for hours, 5 seconds is perfectly fine. The trade-off for portability and maintainability is worth it. I can now run L'Atelier on any cluster that supports Kata, and I don't need to run the manager as root anymore. This is a huge security win as well.

## Why Cloud Hypervisor?

Kata supports several VMMs (Virtual Machine Monitors), including Firecracker and QEMU. I chose **Cloud Hypervisor** as the default for L'Atelier.

| Feature | Firecracker | Cloud Hypervisor |
|---|---|---|
| CPU hot-plug | NO | YES |
| virtio-fs (live file sharing) | NO | YES |
| Boot time | ~125ms | ~200ms |
| Kata default | No | YES (since 3.x) |

The support for `virtio-fs` is the killer feature. It allows me to share a large pool of pre-compiled binaries (like different versions of Node, Go, or Rust) across all sandboxes without copying them into every image. This keeps the base images small and the sandboxes fast.

## The Sandbox Pod Anatomy

Every sandbox is now a standard K8s Pod, but with a twist: it uses the `kata-clh` runtime class.

```text
Kata Sandbox Pod (runtimeClassName: kata-clh)
├── Resources: CPU 500m-2000m, RAM 1Gi-4Gi
├── Volumes:
│   ├── workspace-pvc → /home/dev (CoW clone from VolumeSnapshot)
│   ├── shared-binaries-pvc → /opt/shared (ReadOnlyMany)
│   └── config-configmap → /etc/sandbox/config.json
├── Services:
│   ├── sandbox-agent (TCP:9998), Rust binary
│   ├── terminal (:7681), WebSocket PTY
│   └── browser, KasmVNC/Chromium on demand
└── Network: Pod IP (10.42.x.x), K8s CNI
```

## What Didn't Change

The core of L'Atelier remains the same. The sandbox agent is still written in Rust (because Bun still has issues running in the restricted instruction sets of some microVMs). The dashboard is still React, and the manager is still ElysiaJS.

The AI doesn't care if it's running in a raw Firecracker VM or a Kata-managed Pod. It just sees a Linux terminal and a filesystem. The session templates, auth sync, and event bridge all remained unchanged because they were already transport-agnostic.

## The Gitpod Counter-argument

You might have heard that Gitpod recently moved away from Kubernetes for their sandboxes. Their context is massive multi-tenant scale where K8s overhead becomes a significant cost and complexity factor. They were hitting limits that most of us will never see.

L'Atelier's context is different. It's designed for individuals or small teams. The 1.5GB of RAM overhead for k3s and its control plane is negligible on a 32GB or 64GB server. For us, the benefits of standard tooling (kubectl, helm, k9s) far outweigh the overhead. We get a lot of features for "free" by standing on the shoulders of the K8s community.

## What's Next

Now that L'Atelier is K8s-native, a few things are on the roadmap:

**Multi-node support.** Right now, it assumes a single-node cluster because of the local LVM dependency in TopoLVM. Moving to a distributed storage provider or simply allowing the manager to schedule across a pool of Kata-enabled nodes is the next scaling step. The architecture doesn't assume single-node — the implementation just hasn't caught up yet.

**Warm pool.** Pre-create one PVC per workspace from its prebuild snapshot. On spawn, the pod claims the pre-cloned PVC instead of creating one on the fly. Combined with `InPlacePodVerticalScaling` (K8s 1.35+, Cloud Hypervisor supports CPU/memory hot-plug), this could bring spawn times down to near-instant again.

**SSH proxy.** The old Firecracker setup had SSHPiper for `ssh sandboxId@host`. We dropped it during the migration to simplify things. The web terminals cover most use cases, but for VS Code Remote SSH and JetBrains remote development, native SSH access matters. It'll come back as a small K8s Deployment.

If you want to try it, the Helm chart is the recommended way to install. No more `root` required. Just a K8s cluster with Kata support and a few `helm` commands.

## Links
- [L'Atelier on GitHub](https://github.com/frak-id/atelier)
- [Kata Containers](https://katacontainers.io/)
- [Cloud Hypervisor](https://www.cloudhypervisor.org/)
- [TopoLVM](https://github.com/topolvm/topolvm)
- [k3s](https://k3s.io/)
- [OpenCode](https://github.com/anomalyco/opencode)
