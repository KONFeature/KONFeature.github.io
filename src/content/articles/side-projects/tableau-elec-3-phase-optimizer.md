---
title: "Wiring a House by Algorithm: A 3-Phase Panel Optimizer for NF C 15-100"
date: 2026-06-27T12:00:00Z
draft: false
subtitle: "Modelling rooms and sub-panels, auto-generating the tableau électrique, then minimising breaker count and balancing the three phases with a branch-and-bound search."
category: "engineering"
tags: ["Side Project", "TypeScript", "Algorithms", "Optimization", "Bun", "React", "Domain Modelling"]
icon: "zap"
iconColor: "text-yellow-400"
description: "Renovating a house means fighting French electrical norms. I built a tool that auto-generates sub-panels and runs a real optimizer to minimise breakers and balance the three phases."
githubUrl: "https://github.com/KONFeature/tableau-elec"
group: "side-projects"
---

I'm buying a house, and the renovation that comes with it is the full-gut kind. Walls, floors, and (because I apparently can't help myself) the electrical installation too. I want to do part of the work with my own hands, and wiring is one of the parts I refuse to fully sub out. Which is how I discovered the very particular joy of French electrical norms.

---

## The bureaucracy that started it

In France, residential wiring is governed by **NF C 15-100**. Some of it is genuinely good engineering encoded as law: wire cross-sections matched to breaker ratings so a cable never carries more current than it can dissipate, a cap on how many circuits can sit behind a single *disjoncteur* (breaker), residual-current protection split across at least two devices. That part I respect.

Then there's the other part. The norm demands a minimum number of sockets per room scaled by floor area. It demands communication sockets (RJ45) in your living room whether or not you own a single Ethernet device. It demands a reserve slot left empty in the main panel for "later." Individually each rule is defensible; collectively, when planning a renovation across floors and outbuildings, they're a spreadsheet from hell.

And mine genuinely is several buildings: a main dwelling over two floors, an *atelier* (workshop), and a *hangar* (barn). That means not one **tableau électrique** (the electrical panel) but a main panel plus divisional sub-panels, each fed from the one above it, each with its own breakers and residual-current devices. Planning that by hand, staying inside the norm *and* keeping it cheap, is exactly the fiddly combinatorial problem I'd rather hand to a computer.

So I built [tableau-elec](https://github.com/KONFeature/tableau-elec).

---

## The idea

The flow I wanted was simple:

1. **Add each room**: type, surface, and floor.
2. **Add each sub-panel** (second floor, workshop, barn) as a tree off the main panel.
3. **Add each equipment** to each room: sockets, lights, the oven, the EV charger, a three-phase workshop machine.
4. **Auto-generate a draft** of the main panel and every sub-panel: circuits grouped under residual-current devices, breaker and cable sizing, supply feed, modules, and reserve.
5. **Fine-tune it**, splitting a room's sockets into dedicated breakers, or merging them, to land on the fewest breakers and best **triphasé** (three-phase) balance.

The README is honest that this is an **early POC**. The room editor, live norm checks, persistence, the auto-laid-out panels, and the phase balancer all work end-to-end. Divisional-panel polish and precise module placement are still on the roadmap. But the technical heart, the optimizer, is real, and it's what I want to walk through.

---

## The shape of the codebase

It's a **Bun workspace monorepo**. The domain logic is deliberately quarantined from the rendering layer, so the same engine could later back a Tauri desktop build or a CLI without dragging React along:

```
tableau-elec/
├── apps/
│   └── web/            # TanStack Router SPA (Vite + React 19 + Tailwind v4)
└── packages/
    ├── norms/          # NF C 15-100 data + pure rule functions (zero deps)
    └── core/           # Domain model + compliance checks + tableau planning
```

| Package               | Responsibility                                              |
| --------------------- | ----------------------------------------------------------- |
| `@tableau-elec/norms` | The standard as data: per-room minimums, circuit specs.     |
| `@tableau-elec/core`  | Domain types, room/project evaluation, panel layout.        |
| `@tableau-elec/web`   | UI. Depends on `core` + `norms`, holds no domain logic.     |

The two domain packages are zero-dependency TypeScript, consumed **as source**, with no per-package build step. Vite and Bun compile them directly. The whole thing is client-only: state lives in `localStorage`, there's no server and no account, and the stack rounds out with **TanStack Router** (file-based), **Tailwind v4**, **Biome** for lint/format, and **bun:test**.

The `norms` package is the bit that turns the bureaucracy into auditable data. NF C 15-100's room rules become a lookup table (a 28 m² living room needs ≥ 7 sockets, a small kitchen under 4 m² drops to 3, a lighting point isn't required below 4 m²), and the panel constants become named exports the optimizer reads directly. That separation matters: when I inevitably misread a clause of the standard, the fix is a one-line data change, not a code change.

---

## The optimizer: where the interesting work is

Here's the actual problem. On a three-phase supply, every single-phase load sits on exactly one of three lines: L1, L2, L3. If you pile everything onto L1, you've got a wildly unbalanced installation: one phase saturated, two idle, and a utility that will not be pleased. NF C 15-100's guide demands the spread between the most- and least-loaded phase stays under **15 %**. Simultaneously, every residual-current device (a *DDR*, *dispositif différentiel résiduel*) and every extra DIN rail costs money, so I want as few of them as the norm allows.

Those two goals fight. More DDR rows give the balancer finer-grained chunks to spread across phases (better balance) but cost more (worse). Fewer rows are cheaper but coarser. The optimizer's job is to find the cheapest layout that still hits the balance target.

It lives in `packages/core/src/tableau/optimize/`, decomposed into a few files that each do one thing.

### The unit model: one phase per row

The atomic object is a **Unit** (`optimize/units.ts`). A unit is one DDR row, the thing that physically rides a single phase line. "One phase per row" falls out of the model for free, because a unit *is* a row.

```typescript
export interface Unit {
  id: string
  panelId: string
  family: "general" | "F" | "B"
  weight: number
  poles: 2 | 4
  circuits: PlannedCircuit[]
  /** Fixed line (a member already pinned); free units compete for a line. */
  pinned?: Line
}
```

`weight` is the load in VA the row contributes to its phase. When a circuit knows its real power draw it uses that; otherwise it estimates from the breaker rating at 230 V:

```typescript
export const weightVA = (c: { powerW?: number; breakerAmp: number }) =>
  c.powerW ?? c.breakerAmp * VOLTAGE.mono
```

### Classifying panels: sources vs blocks

Before anything gets balanced, `classifyPanels` walks the panel tree in DFS pre-order (parents before children) and sorts every panel into one of two categories:

- A **source** sees all three lines. The main panel is always a source; so is any panel forced or supplied as `tri`, or one carrying a genuine three-phase load. Its mono circuits become individual units spread across L1/L2/L3.
- A **block** is a single-phase sub-panel. The *entire subtree* rides one line as a unit: you don't split a sub-panel's internals across phases, you just decide which phase the whole thing hangs on.

A block's root is either pinned to a specific line (the user chose L2) or left `auto`, in which case it becomes a free unit competing for the least-loaded phase. This is the structural decision that makes the search tractable: a divisional panel with twenty circuits is one balanceable object, not twenty.

### The binning frontier

For a source panel, how do you group its mono circuits into rows? Fewer rows mean fewer (expensive) differentials; more rows give the balancer finer units. There's no single right answer, so `binning.ts` emits a small **Pareto frontier** of options.

`binningFrontier` first computes the floor (the minimum number of bins each protection family needs), then emits binnings from that floor up to floor-plus-two, splitting each family into more rows for balance flexibility:

```typescript
for (let delta = 0; delta <= 2; delta++) {
  const bins: Binning["bins"] = []
  let ok = true
  for (const [f, cs] of byFamily) {
    const k = Math.min((floorBins.get(f) ?? 1) + delta, cs.length)
    const split = splitBalanced(cs, k, heatLimit)
    if (!split) { ok = false; break }
    for (const group of split)
      bins.push({ family: f, weight: sum(group, weightVA), circuits: group })
  }
  if (ok) frontier.push({ bins })
}
```

Two norm constraints are baked in here. **Protection families never share a bin**: `general`, `F`, and `B` differentials are physically different devices, so they're grouped separately. And `splitBalanced` is a first-fit-decreasing pack that respects three caps at once: at most `MAX_CIRCUITS_PER_DDR` (8) circuits per row, heating load under the per-DDR limit (`HEATING_W_PER_DDR` is 7500 W mono / 13000 W tri), and the summed DDR rating under `DDR_MAX_RATING_A` (63 A, because the inter-panel feed cable tops out there).

### The line solver: LPT seed + exact DFS

Given a set of units and a balance target, `balanceUnits` (`balance.ts`) decides which line each free unit rides. It's a feasibility-or-minimise routine: get a fast answer if one's good enough, otherwise search for the best.

It starts with a **greedy LPT seed** (Longest Processing Time, the classic multiway-partition heuristic), sorting units heaviest-first and dropping each onto the least-loaded line:

```typescript
// Greedy LPT seed (heaviest onto the least-loaded line).
const seedLoads: Balance = { ...loads }
const seed = new Map<string, Line>()
for (const unit of movable) {
  const line = leastLoaded(seedLoads)
  seed.set(unit.id, line)
  seedLoads[line] += unit.weight
}
let best = { assign: seed, loads: seedLoads, imbalance: imbalanceRatio(seedLoads) }
```

If that seed already clears the 15 % target, it returns immediately. If not, it runs an exact depth-first search over the three-way assignment, capped at `nodeCap` (default 50,000) nodes and early-exiting the moment a leaf meets the target:

```typescript
const unit = movable[i] as Unit
const seen = new Set<number>()
for (const line of LINES) {
  // Symmetry break: two lines at equal load are interchangeable here.
  if (seen.has(ld[line])) continue
  seen.add(ld[line])
  cur.set(unit.id, line)
  ld[line] += unit.weight
  dfs(i + 1, ld)
  ld[line] -= unit.weight
}
```

The `seen` set is the symmetry-breaking trick that keeps the DFS honest: if two lines currently carry the same load, putting this unit on either produces an identical subtree, so it only explores one. With three lines this prunes a large chunk of the branching factor. The whole thing is deterministic, with no randomness and stable across runs, which I care about, because a tool that reshuffles your entire panel on every recompute is useless.

Imbalance is the obvious ratio:

```typescript
export function imbalanceRatio(balance: { L1: number; L2: number; L3: number }): number {
  const values = [balance.L1, balance.L2, balance.L3]
  const max = Math.max(...values)
  const min = Math.min(...values)
  return max > 0 ? (max - min) / max : 0
}
```

and the 15 % constant is the single source of truth in `norms`:

```typescript
/** Phase imbalance threshold (max−min)/max. Above this, warn. */
export const IMBALANCE_WARN_RATIO = 0.15
```

### The structural cost model

To rank two layouts I need a cost. I deliberately don't model euros or cable lengths yet (those are future PDF/quote work), so `cost.ts` is a *structural proxy*. Breaker count is fixed by the generation mode and constant across placements, so it's omitted. What varies is the number and type of differentials, the inter-panel feed cores, and the rail count:

```typescript
export function ddrCost(type: DifferentialType, poles: 2 | 4): number {
  return W.ddrBase + W.type[type] + W.poles[poles]
}

export function cost(s: SolutionShape): number {
  return (
    s.ddrs.reduce((acc, d) => acc + ddrCost(d.type, d.poles), 0) +
    W.feedCore * s.feedCores +
    W.rail * s.railCount
  )
}
```

The weights live in `norms` as `OPTIMIZER_WEIGHTS` and encode the real-world ordering: a type-B differential costs far more than a plain AC one (`{ AC: 0, A: 2, F: 6, B: 12 }`), a four-pole device more than two-pole, a tri feed carries more cores. They're tunable knobs, flagged for when actual pricing lands.

### The outer search: promotion by increasing size

All of the above is wrapped by `optimizeGeneration` in `search.ts`, the branch-and-bound layer tying the per-panel binning frontier to the shared line solver.

The key decision it owns is **promotion**: an `auto` single-phase block can be *promoted* to a full three-phase source. Doing so usually balances better (its load now spreads across all three lines) but costs more (four-pole devices, a four-core feed). So the search only promotes when balance demands it, and it does so frugally, enumerating promotion sets by increasing size, stopping at the cheapest feasible size:

```typescript
for (let size = 1; size <= promotable.length && !feasible; size++) {
  let bestAtSize: Solved | null = null
  for (const subset of combinations(promotable, size)) {
    if (nodes++ > PROMOTION_NODE_CAP) break
    const s = buildSolution(new Set(subset))
    if (s.imbalance <= target && (!bestAtSize || s.cost < bestAtSize.cost)) bestAtSize = s
  }
  if (bestAtSize) feasible = bestAtSize
}
```

`combinations` is a hand-rolled deterministic k-combination generator, and the enumeration is budget-capped at `PROMOTION_NODE_CAP` (20,000 nodes). If nothing is feasible within budget, it promotes nothing (fewest components wins) and reports the least achievable imbalance instead. Inside each `buildSolution`, it also tries the binning frontier at increasing granularity (`idx` 0→2) and stops at the first that meets the target, so it doesn't pay for extra rows it didn't need.

There's a second entry point, `resolveFromLayout` in `balance.ts`, for the analyze path: when the user has manually frozen a layout, the DDR rows are fixed, so each row simply becomes one unit and rides one line: no re-binning, no promotion, just the same `balanceUnits` solver over a locked structure. The two paths share the primitive, which keeps the auto-generated and hand-tuned panels consistent.

---

## The load simulator

The optimizer balances on *estimated* VA: power if known, breaker rating otherwise. But what I actually care about, standing in the half-demolished house, is: when the oven and the EV charger and the workshop machine all run at once, how does that land across the three phases? So I added a small **load tester**.

It lives in `load-sim.ts` and the `load-simulation` route. You create named scenarios ("winter evening", "everything on"), type a wattage into each breaker, and it aggregates the result per phase over the *already-computed* layout. No re-optimization: it reads the resolved `line`/`phase` the optimizer assigned and just sums:

```typescript
for (const rail of panel.rails) {
  for (const m of rail.modules) {
    if (m.kind !== "breaker") continue
    const w = (m.phaseKey != null ? loads[m.phaseKey] : undefined) ?? 0
    total += w

    if (m.phase === "tri") {
      const third = w / 3
      perPhase.L1 += third
      perPhase.L2 += third
      perPhase.L3 += third
    } else if (m.line != null) {
      perPhase[m.line] += w
    } else {
      unlined += w
    }
  }
}
```

Three details make it correct. A **tri** load splits evenly (`w / 3` onto each line) because a balanced three-phase appliance draws equally from all three. **Feeds are skipped** (only `breaker` modules count): a feed to a child panel isn't a load itself, the child's own breakers carry that, so counting it would double-count. And on a pure mono installation, breakers have no line at all, so their wattage falls into a separate `unlined` bucket shown as total-only rather than being misattributed to a phase.

The UI surfaces the result as a sticky summary bar: total kVA and current, the per-phase split, and a live imbalance percentage that turns red past 15 %. It's the feedback loop that lets me move a circuit from one breaker to another, watch the phases rebalance under a realistic load, and actually trust the layout before cutting a single length of cable.

---

## What's next

This is an early POC and I'm trying to be honest about it. What works today: projects, rooms with live NF C 15-100 checks, a reusable custom-equipment catalog with mono/tri power sizing, the full panel topology (main + divisional, parent feeds, DIN-rail layout, head-end), and the three-phase balancer with manual per-circuit and per-rail overrides.

What's still coming, roughly in order:

- The full NF C 15-100 rule set: the encoded rules are a partial, best-effort interpretation, and I'm working through the official extract.
- Per-floor organisation and room adjacency, leading to cable-length estimation. This unlocks a *real* cost model in euros, not just the structural proxy.
- Import/export (JSON first, then DXF for actual electrical drawings).
- Eventually, a Tauri desktop/mobile build off the same zero-dependency core.

And the standard disclaimer, which I mean sincerely: this is a planning aid, **not** a substitute for a certified electrician or the official text. Always have an installation validated by a qualified professional (Consuel). I'm building this to plan *my* renovation more cleverly, not to skip the inspection.

The fun of it, for me, was that a deeply bureaucratic, deeply un-fun problem turned out to have a genuinely satisfying algorithmic core. A partition problem with a cost model, symmetry breaking, and a branch-and-bound search, all dressed up as wiring a house.

---

## Links

- **tableau-elec**: [github.com/KONFeature/tableau-elec](https://github.com/KONFeature/tableau-elec)
- **NF C 15-100**: the French standard for low-voltage electrical installations

---

**Tech Stack**:
- **Runtime / monorepo**: Bun workspaces, TypeScript (strict)
- **Domain**: zero-dependency `norms` + `core` packages, consumed as source
- **Frontend**: React 19, TanStack Router (file-based), Vite, Tailwind CSS v4
- **Tooling**: Biome (lint + format), bun:test
- **Persistence**: localStorage (client-only, no server)

