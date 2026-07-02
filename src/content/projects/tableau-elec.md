---
name: "3-Phase Panel Optimizer"
tagline: "A constraint solver that auto-generates a house's electrical panels and balances the three phases, so I don't have to do it by hand."
description: "Renovating a house under France's NF C 15-100 electrical norm means modelling every room and sub-panel, then hitting strict rules on socket counts, breaker limits, and phase balance. I built a tool that models the whole installation and runs a real branch-and-bound optimizer to auto-generate compliant panels: minimising breaker/differential count while keeping the three-phase load balanced within 15%."
status: "personal"
role: "Creator"
period: "Jun 2026"
order: 7
icon: "zap"
iconColor: "text-yellow-400"
tech: ["TypeScript", "Bun", "React 19", "TanStack Router", "Vite", "Tailwind CSS v4", "Biome"]
metrics:
  - label: "Phase Imbalance Target"
    value: "< 15%"
  - label: "Architecture"
    value: "Zero-dep domain core"
links:
  - label: "GitHub"
    url: "https://github.com/KONFeature/tableau-elec"
articleIds: ["side-projects/tableau-elec-3-phase-optimizer"]
featured: false
draft: false
---

I'm renovating a house down to the studs, including the electrical work, and doing part of it myself. French residential wiring is governed by NF C 15-100: sound engineering in places (wire gauges matched to breaker ratings, residual-current protection split across devices), bureaucratic sprawl in others (minimum socket counts per room by floor area, mandatory reserve slots). My property spans a main dwelling, a workshop, and a barn, which means a main panel feeding multiple sub-panels, each with its own breakers and compliance rules. Planning that by hand while staying compliant and cheap is exactly the kind of fiddly combinatorial problem I'd rather hand to a computer.

So I built tableau-elec: model each room, sub-panel, and piece of equipment, then auto-generate a draft panel layout that groups circuits under residual-current devices, sizes breakers and cable, and balances the load across the three phases.

The interesting part is the optimizer. On a three-phase supply, every single-phase circuit rides one of three lines, and the norm requires the load spread between the busiest and idlest phase to stay under 15%. Minimizing cost (fewer, cheaper differentials) and maximizing balance pull in opposite directions. The solver handles this with a greedy LPT seed followed by an exact, symmetry-broken depth-first search over phase assignment, wrapped in a branch-and-bound layer that decides when promoting a single-phase sub-panel to three-phase is worth the extra cost. The domain logic (the norm as data, the panel model, the optimizer) is a zero-dependency TypeScript core, deliberately isolated from the UI so it could later back a desktop build without dragging React along.

It's an early POC, and not a substitute for a certified electrician, but the optimizer core is real and it's what actually plans my panels today.

**My role:** sole creator, from domain modelling of the norm to the optimizer and the UI.
