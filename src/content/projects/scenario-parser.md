---
name: "Scenario Parser"
tagline: "Turning screenplay PDFs into structured psychology and social-graph data"
description: "Applied LLM research: a competitive multi-strategy pipeline that extracts structured data from screenplay PDFs, then models character psychology and relationship networks by combining social-network-analysis graph theory with multi-pass LLM orchestration."
status: internal
role: "Creator"
period: "Oct 2025"
order: 5
icon: "network"
iconColor: "text-purple-400"
tech: ["TypeScript", "Python", "pdfplumber", "pymupdf4llm", "Gemini", "graphology", "Zod", "p-limit", "PostgreSQL"]
metrics:
  - { label: "Parsing accuracy", value: "99%+" }
  - { label: "Zero-cost path", value: "68% of PDFs" }
  - { label: "Tier accuracy", value: "65% → 92%" }
links: []
articleGroups: ["scenario-parser"]
featured: false
draft: false
---

Scenario Parser is a research project exploring a question outside my usual Web3/infra work: can you get an LLM to reliably understand narrative structure (who the protagonist is, what a character wants, how a relationship works) without it hallucinating an arc that isn't there? It's used internally for screenplay analysis and was never released publicly; I'm sharing it because the architecture is the interesting part.

## Extraction: don't trust one parser

Screenplays are formatted for human eyes, not machines: a scene heading and a character name are only distinguishable by indentation. Rather than betting on a single parsing strategy, the system runs four in parallel (a fast regex/state-machine heuristic, two LLM-based text parsers, and a multimodal vision parser that reads the PDF as images) and picks the winner via an automated quality score. The cheap heuristic parser wins 68% of the time, since clean, standard-format PDFs cost nothing to parse, while the LLM and vision parsers act as a safety net for scanned pages, handwritten notes, or non-standard formats, pushing overall accuracy to 99%+.

## Orchestration: a resilient pipeline, not a script

Analyzing a script isn't one API call. It's an artifact pipeline (extraction → parsing → synopsis → character analysis → scene breakdown) with explicit state machines, optimistic locking to avoid duplicate processing, two-tier concurrency limits to stay under LLM rate limits, and layered retry logic (including a fallback to abstract, clinical prompt rewrites when content-safety filters trigger on screenplay violence, and a deterministic graph-based fallback if the LLM fails entirely).

## Character psychology: graph theory grounds the LLM

The most interesting layer. Before any LLM sees a character, the system builds a weighted social graph from co-appearances and dialogue exchanges, then computes centrality metrics (degree, betweenness, harmonic, eigenvector) to objectively rank narrative importance: an LLM can't call a three-line character a "protagonist" when the graph shows 5th-percentile centrality. Those quantitative anchors get injected into every prompt, and lead characters go through a three-pass split (casting requirements, psychology, synthesis) run in parallel rather than one monolithic prompt. Validated against professional casting-director classifications, this hybrid approach took character-tier accuracy from ~65% (single-pass LLM) to ~92%.

## Role and status

Built solo, end to end: extraction pipeline, orchestration engine, graph analysis, and prompt architecture. It's used internally for applied research rather than shipped as a product, and it's the deepest LLM-orchestration work in my portfolio: proof I can take "ask the LLM" from a demo to something that scales, doesn't hallucinate, and degrades gracefully in production.
