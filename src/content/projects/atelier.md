---
name: "L'Atelier"
tagline: "Self-hosted sandboxes for AI coding agents, so they stop needing a babysitter"
description: "A self-hosted orchestrator giving any AI coding agent its own VM-grade sandbox, harness-agnostic by design: spawn from a console, CLI, or MCP client, then walk away to a reviewed PR."
status: production
role: "Creator"
period: "Feb 2026 - present"
order: 2
icon: "container"
iconColor: "text-blue-400"
tech: ["Kubernetes", "Kata Containers", "Cloud Hypervisor", "k3s", "TopoLVM", "Firecracker", "Rust", "Bun", "ElysiaJS", "MCP", "ACP"]
metrics:
  - { label: "MCP tools", value: "14" }
  - { label: "Sandbox ready", value: "~1-3s" }
  - { label: "Install", value: "~15 min" }
links:
  - { label: "GitHub", url: "https://github.com/frak-id/atelier" }
articleGroups: ["atelier"]
featured: true
draft: false
---

AI coding agents are good enough to trust with real implementation work, but they need constant supervision: approving file writes, answering questions, babysitting progress across multiple terminals. L'Atelier gives each agent its own disposable, isolated sandbox and lets you dispatch work like tickets on a kanban board, then walk away.

## What it does

Each sandbox is a full, hardware-isolated environment (VS Code, an AI coding agent (OpenCode, pi, or any other harness that speaks the Agent Client Protocol), a browser, SSH) that boots in seconds and comes with a complete dev environment out of the box. You describe a task from the console, the CLI, or an MCP client, the system clones the right repo, spins up a sandbox from a pre-warmed snapshot, and starts the agent. You get progress updates, answer questions when the agent is stuck, and review a diff when it's done, all from a phone if needed.

## The point

Cloud sandbox vendors (Codespaces-style, or Ramp's internally-built "Inspect") solve this well, but are either vendor-locked, per-seat priced, or require infrastructure most teams shouldn't pay for. L'Atelier is the self-hosted version: one bare-metal server, no external dependencies, real VM-grade isolation instead of shared-kernel containers, because an AI agent with root access is one kernel exploit away from owning the host if it's "just" a container.

## Architecture highlights

- **Kata Containers + Cloud Hypervisor on k3s**: sandboxes look like normal Kubernetes pods to the orchestrator, but each one is a real microVM to the host. This replaced an earlier custom Firecracker orchestrator that required hand-rolling LVM provisioning, TAP networking, and guest lifecycle management; swapping it for Kubernetes primitives deleted 8,702 lines of bespoke infrastructure code (61% of the codebase) while trading ~150ms cold starts for a system that's actually maintainable and portable across any Kata-enabled cluster.
- **Harness-agnostic via ACP, orchestrable via MCP**: agents talk to sandboxes over the Agent Client Protocol, so swapping OpenCode for pi (or another ACP harness) is a client-side composer change, not a runtime rewrite. The same MCP server exposes 14 tools for sandbox lifecycle, exec, file patching, and toolbox management, so an AI agent can spawn, drive, and tear down its own sandboxes without a human relaying every step.
- **Copy-on-write everything**: prebuilt snapshots via TopoLVM VolumeSnapshots mean a sandbox with dependencies already installed clones in milliseconds instead of a multi-minute cold install.

## Role and status

I designed and built the entire system solo: orchestrator, Rust in-VM agent, console, CLI, Helm chart. It's not a personal toy: it's infrastructure the team uses daily at Frak to dispatch and review AI-assisted engineering work, and it continues to evolve (smoother first-run onboarding, in-console examples, and a plugin system for Slack/Linear/Grafana connectors are next).
