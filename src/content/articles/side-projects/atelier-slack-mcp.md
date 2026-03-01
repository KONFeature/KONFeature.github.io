---
title: "Talk to Your AI Dev Team: L'Atelier Gets a Slack Bot and an MCP Server"
date: 2026-03-01T12:00:00Z
draft: false
subtitle: "Three weeks of daily use revealed the real bottleneck. The dashboard was still one too many clicks away."
category: "tooling"
tags: ["MCP", "Slack", "AI Agents", "Firecracker", "Self-Hosting", "AI Orchestration", "OpenCode", "LLM"]
icon: "message-circle"
iconColor: "text-purple-400"
description: "L'Atelier now dispatches AI coding agents directly from Slack, powered by an MCP server and a system sandbox running an AI dispatcher agent. Here's how the architecture evolved."
githubUrl: "https://github.com/frak-id/atelier"
group: "side-projects"
---

Three weeks ago I published [the first article about L'Atelier](/articles/side-projects/atelier-stop-babysitting) — a self-hosted Firecracker-based system for running AI coding agents in isolated VMs. I built it before a ski vacation so I could dispatch work and check results from my phone. The core idea: stop babysitting your AI agents, let them run in the background, come back to results.

It worked. I came back to merged PRs and finished features. The isolation held. The prebuild snapshots made cold starts fast enough to not care about.

But using it daily revealed the next friction point. The dashboard was still a separate thing I had to open. I'd be in Slack, see a bug report, think "I should have the agent look at this" — and then I'd switch to the browser, navigate to the dashboard, pick a workspace, type a prompt, click create. Four context switches for what should be one thought.

The best interface for dispatching AI work turned out to be the tool I already live in: Slack.

---

## From Dashboard to DM

The core change: you can now @mention the Atelier bot in any Slack channel, or DM it directly, describe what you want in plain English, and it handles everything. Workspace selection, task creation, sandbox boot, agent start. You get emoji reactions as it progresses and a Block Kit message with the todo list when it's running.

```
@atelier add rate limiting to the payments API, 
         use the existing Redis client, 
         write tests
```

That's it. No dashboard. No workspace picker. No template selection.

The message flow looks like this:

```
Slack message
     │
     ▼
Integration Gateway
     │
     ▼
System Sandbox (warm Firecracker VM)
     │
     ▼
Dispatcher AI agent (temperature 0.1, max 5 steps)
     │  reads message, picks workspace from descriptions
     │  calls create_task via MCP
     ▼
New sandbox boots from prebuild snapshot
     │
     ▼
OpenCode coding agent starts working
     │
     ▼
Event Bridge (SSE) → Slack thread updates
```

The dispatcher is itself an AI agent running in a lightweight system sandbox — 1 vCPU, 1GB RAM. It boots on the first integration event and stays warm for 30 minutes of idle time, then shuts down. After 6 hours it recycles regardless. This keeps costs near zero when you're not actively using it.

For power users who know exactly what they want, there are slash commands:

| Command | What it does |
|---------|-------------|
| `/new [prompt]` | Create a new task (dispatcher picks workspace) |
| `/add [prompt]` | Add a follow-up session to the current sandbox |
| `/review` | Launch a code review session on the current branch |
| `/security` | Run a security audit session |
| `/simplify` | Refactoring pass |
| `/dev start [name]` | Start a dev server, get back a public URL |
| `/dev logs` | Tail the dev server logs |
| `/cancel` | Cancel the running session |
| `/restart` | Restart the current session |
| `/status` | Get current sandbox state |
| `/help` | List available commands |

Real-time feedback comes through two channels. First, emoji reactions on your original message: the bot adds 🧠 when the dispatcher is thinking, ⚠️ when something needs attention. Second, a Block Kit progress message in the thread that shows the agent's todo list, updated live as tasks complete. When the session finishes, you get a completion notification with a summary.

Thread continuity works the way you'd expect: reply in the same thread and the message goes to the existing sandbox as a follow-up. The event bridge tracks which Slack thread maps to which sandbox, so you can have multiple sandboxes running in parallel across different channels.

This is the [Ramp Inspect Slack bot](https://builders.ramp.com/post/why-we-built-our-background-agent) experience, but self-hosted and general-purpose.

---

## AI Agents All the Way Down: The MCP Server

This is the part I find most interesting architecturally, and it's also why I think the timing is right to write about it. MCP (Model Context Protocol) has been getting a lot of attention lately as the standard way for AI agents to interact with external systems. L'Atelier now exposes a full MCP server, and the system sandbox uses it in a way that creates a clean "AI orchestrating AI" loop.

The manager exposes an MCP server at `/mcp` with bearer token auth. The full tool list:

```
list_workspaces        — list available workspaces with descriptions
list_tasks             — list tasks with status filters
get_task               — get task details and sessions
create_task            — create a new task in a workspace
complete_task          — mark a task complete
list_sandboxes         — list running sandboxes
get_sandbox            — get sandbox details
list_dev_commands      — list registered dev servers
manage_dev_commands    — start/stop/restart dev servers
get_dev_command_logs   — tail dev server output
get_system_status      — overall system health
get_sandbox_git_status — git diff/status for a sandbox
get_task_sessions      — list sessions for a task
list_session_templates — available session templates
```

The dispatcher agent inside the system sandbox has access to exactly these tools and nothing else. All other tool categories are denied. It runs at temperature 0.1 with a max of 5 steps — it's not supposed to be creative, it's supposed to be reliable. Read the message, call `list_workspaces`, pick the right one, call `create_task`, done.

What I like about this design is that the dispatcher doesn't need any special integration code. It's just an OpenCode agent with a restricted tool set. The same protocol that lets a coding agent read files and run tests now lets a dispatcher agent orchestrate infrastructure. MCP as a universal interface for both local dev tooling and distributed system control.

The loop in full:

1. Slack message arrives at the Integration Gateway
2. Gateway routes it to the System Sandbox service
3. System Sandbox boots (or reuses warm VM) and runs the dispatcher agent
4. Dispatcher calls `list_workspaces` via MCP, reads descriptions, picks the best match
5. Dispatcher calls `create_task` with the parsed prompt
6. Manager creates the task, boots a new Firecracker sandbox from the appropriate prebuild snapshot
7. Coding agent starts working inside the new sandbox
8. Event Bridge subscribes to OpenCode's SSE stream (`session.status`, `session.idle`, `permission.asked`, `question.asked`, `todo.updated`)
9. Events flow back through the bridge to the Slack adapter, which updates reactions and Block Kit messages with a 2-second debounce

There's also a "description agent" — another system agent that runs when a workspace is first registered. It clones the repo, reads the README and key source files, and generates a concise description that the dispatcher uses for workspace selection. This runs at temperature 0.1 with up to 15 steps since it needs to actually explore the codebase. The descriptions get stored in the workspace record and updated when you push significant changes.

Without good descriptions, the dispatcher would have to guess from repo names alone. With them, it can distinguish between "the payments service" and "the payments dashboard" even if both repos have "payments" in the name.

---

## Session Chaining from Slack

One of the patterns that emerged from daily use: you rarely want just one agent session. A typical feature workflow looks like this:

```
1. @atelier implement the user export feature in the admin panel
   → dispatcher picks workspace, creates task, sandbox boots
   → coding agent implements the feature
   → you get a completion notification

2. /review
   → new OpenCode session on the same sandbox, same branch
   → review template: reads the diff, checks for issues, leaves comments
   → completion notification with findings

3. /security
   → another session, security audit template
   → checks for injection vectors, auth issues, data exposure
   → flags anything suspicious

4. /dev start admin
   → starts the dev server
   → Caddy route registered automatically
   → you get back: https://sandbox-abc123.dev.yourdomain.com

5. Check the preview, looks good

6. /add fix the pagination bug the review found
   → follow-up session on the same sandbox
   → agent fixes the specific issue

7. Push, open PR
```

All of that from Slack. The event bridge tracks progress across all sessions and keeps the thread updated. Each `/add`, `/review`, `/security`, `/simplify` command launches a new OpenCode session with the appropriate template, on the same branch, in the same sandbox. The sandbox persists between sessions — you're not re-cloning or re-installing dependencies each time.

The session templates are the same ones from the first article, just now accessible via slash commands instead of dashboard dropdowns. The template system didn't change; the access layer did.

---

## Operating Sandboxes from Chat

The `/dev` commands deserve their own section because they close a loop that used to require SSH access.

```
/dev start api
```

This starts the dev server named "api" in the current sandbox, registers a Caddy route for it, and returns a public HTTPS URL. The URL is stable for the lifetime of the sandbox. You can share it with a designer or PM without them needing any access to the infrastructure.

```
/dev logs api
```

Tails the last N lines of the dev server output. Useful when the agent says it started a server but you want to verify it's actually running.

```
/dev list
```

Shows all registered dev servers across all sandboxes, with their URLs and status.

The Caddy integration here is the same dynamic route management from the first article — wildcard routes, automatic HTTPS, routes cleaned up when the sandbox shuts down. The new piece is just the Slack-facing interface for triggering it.

The full workflow this enables: describe a feature in Slack, wait for implementation, `/dev start`, click the URL, verify it works, `/review`, push. You never leave Slack except to look at the preview URL.

---

## Other Improvements Worth Mentioning

**GitHub OAuth with PKCE.** Sandboxes need repo access to clone and push. Previously this required manually managing tokens. Now there's a proper OAuth flow with PKCE (code_challenge/code_verifier) — you authenticate once through the dashboard, and every sandbox that boots gets the token automatically. No more "the agent failed because it couldn't push."

**SSH proxy.** If you want to use your own IDE instead of the web dashboard, you can SSH directly into a sandbox:

```bash
ssh sandboxId@ssh.yourdomain.com -p 2222
```

This opens a shell inside the Firecracker VM. From there you can attach VS Code Remote, run commands manually, or inspect what the agent did. Useful for debugging when the agent's output isn't quite right and you want to poke around.

**Auth sync.** The OAuth token is synced to every sandbox automatically. You authenticate once; the system handles distribution. This was a manual step before.

**System self-healing.** The manager now detects zombie sandboxes (VMs that crashed but whose records weren't cleaned up), handles crash recovery, and survives manager restarts without losing track of running sandboxes. This matters more than it sounds — before, a manager restart would orphan any running VMs and you'd have to clean them up manually.

---

## Where This Lands

The first article compared L'Atelier to Ramp's Inspect system. That comparison still holds, and it's gotten more interesting. Ramp has a Slack bot for their internal AI coding system. L'Atelier now has one too, self-hosted, with the same conversational dispatch model.

The difference is still the same: theirs is internal infrastructure built by a team. This is one person's side project running on a single server. But the feature surface is converging faster than I expected.

What's next:

**GitHub PR comment integration.** The adapter architecture is already in place — the Integration Gateway has a clean adapter interface, and the Slack adapter is one implementation of it. A GitHub adapter would let you comment on a PR and have the bot pick up the task. The plumbing is ready; I just need to write the adapter.

**Multi-server distribution.** Right now everything runs on one machine. The architecture doesn't assume this, but the implementation does. Distributing sandboxes across multiple hosts is the next scaling step.

**Cost tracking.** I know roughly what this costs to run, but I don't have per-task token usage tracked yet. Adding that to the MCP server and surfacing it in Slack notifications would make the economics more visible.

The broader point: the interface for AI-assisted development shouldn't be a terminal or a dashboard. It should be wherever you already are. For me that's Slack. For someone else it might be a GitHub comment, a Linear ticket, a voice message. The adapter pattern makes adding new surfaces straightforward — the core orchestration logic doesn't change, just the input/output layer.

The system is running in production. We use it every day at [Frak](https://frak.id). The Slack integration has become the primary interface; I open the dashboard maybe once a day now, mostly to look at system data.

If you're building something similar or want to run this yourself, the repo is at [github.com/frak-id/atelier](https://github.com/frak-id/atelier). The setup docs cover the Firecracker prerequisites, LVM configuration, and Slack app setup. It's not a one-click install — you need a Linux host with KVM access — but the docs are thorough.
