---
name: "Elle À Table Cooking Bot"
tagline: "A safety-first AI cooking assistant for 35,000+ French recipes"
description: "Client work for CMI Group (Elle magazine): a conversational, voice-guided cooking assistant built on a hybrid deterministic-safety + LLM architecture, with dual-vector semantic search and real-time audio generation. Production-grade engineering; shelved before launch for business reasons."
status: archived
role: "Architect & Lead Developer"
period: "Oct 2025"
order: 4
icon: "chef-hat"
iconColor: "text-emerald-400"
tech: ["Gemini", "spaCy", "Qdrant", "PostgreSQL", "TypeScript", "Bun", "Hono", "React", "SST", "Kubernetes", "Gemini TTS"]
metrics:
  - { label: "Recipes processed", value: "35,000+" }
  - { label: "Allergen detection", value: "100% deterministic" }
  - { label: "Parsing accuracy", value: "99.9%" }
links: []
articleGroups: ["cooking-bot"]
featured: false
draft: false
---

Built for CMI Group as the engine behind Elle À Table's AI cooking assistant: a conversational agent that helps users find recipes, adapts instructions to their skill level and allergies, and guides them hands-free with generated audio while they cook.

## Why safety came before AI

The starting constraint: a wrong answer about allergens can hurt someone, so LLMs were never trusted with that decision. Allergen detection and dietary classification run on a deterministic, rule-based engine (keyword matching, known derivatives, hidden sources, even E-number cross-referencing) that's 100% auditable and never hallucinates. LLMs are used only where being wrong is cheap: enriching missing metadata, parsing messy ingredient text, and holding a natural conversation. That split, rules for anything safety-critical and LLMs for everything else, is the core architectural decision the rest of the system follows.

## What I built

- **A 9-stage recipe processing pipeline** that took 35,000 real-world, inconsistently formatted French recipes (mixed units, missing fields, regional phrasing) to 99.9% parsing accuracy, with a quality-based router that sent clean recipes through a cheap direct-conversion path and only ran expensive spaCy NLP on the messy 30-40%, cutting processing cost by 60-70%.
- **Dual-vector semantic search**: a "semantic" embedding (region, season, cooking method) and a separate "ingredients-only" embedding, so "Italian summer recipes" and "I have tomatoes and basil" both route to the right kind of similarity search.
- **A tool-using conversational agent** with a two-tier preference system (persistent user allergies vs. per-conversation constraints like "cooking for 10 tonight"), enforced tool-call ordering so allergen filters always apply before a search runs, and full Langfuse observability on every LLM call.
- **On-demand voice-guided cooking mode**: step-by-step audio generated in parallel via Gemini TTS, deduplicated with an in-memory mutex so concurrent requests for the same recipe don't trigger duplicate generation, stored as raw PCM and converted to WAV only when played.

## Role and status

I owned the architecture and led development end to end: data pipeline, backend, search, and the conversational runtime. The system reached production-grade quality (accuracy, safety guarantees, cost profile all validated against real data) but the project was shelved before public launch, a business decision unrelated to the engineering. I'm including it because it's the clearest example of applied, safety-conscious LLM system design in my portfolio, not despite the fact it never shipped.
