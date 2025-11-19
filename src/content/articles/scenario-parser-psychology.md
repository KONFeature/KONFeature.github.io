---
title: "Beyond Text: Modeling Character Psychology with LLMs"
date: 2025-02-24T15:00:00Z
draft: false
subtitle: "Deconstructing Personality with AI"
category: "ai"
tags: ["LLM", "Prompt Engineering", "Psychology", "AI", "Synthesis"]
icon: "brain"
iconColor: "text-pink-400"
featured: false
description: "A technical deep dive into prompt engineering, multi-pass architecture, and the 'Big Five' personality synthesis in scenario-parser."
githubUrl: "https://github.com/KONFeature/scenario-parser"
---

In the previous articles, we explored the [Pipeline](/articles/scenario-parser-pipeline) and [Extraction](/articles/scenario-parser-extraction) layers. Today, we look at the "brain" of `scenario-parser`: the `Character Analysis V2` engine.

Teaching an AI to understand a character is not as simple as asking, "Who is this person?" To get professional-grade analysis—the kind a casting director uses—we must deconstruct the character into component parts: Voice, Psychology, and Narrative Function.

## The "Context Trap" & Dossier Generation

A feature film script is 120 pages long. Even with 128k context windows, dumping the entire script into an LLM is inefficient and prone to "hallucinations." The model loses track of supporting characters in the noise.

Our solution is the **Dossier System**. Instead of the whole script, we generate a focused `CharacterDossier` for each role.

```typescript
export type CharacterDossier = {
    name: string;
    sceneCount: number;
    // We extract ONLY the dialogue lines for this character, 
    // plus the immediate action lines before/after for context.
    dialogues: DialogueWithContext[]; 
    stats: {
        totalWords: number;
        averageDialogueLength: number;
    };
};
```

This "distillate" ensures the LLM sees *only* what is relevant to "Dr. Smith," eliminating the noise of the other 50 characters.

## The Multi-Pass Architecture

We don't ask for everything at once. We use a specialized multi-pass architecture defined in `packages/analyzer`.

### Pass 1: The Anchor (Quantitative)
We explicitly anchor the LLM with hard data calculated during the parsing phase. In `per-character-prompts.ts`:

> "For TIER classification, USE THE QUANTITATIVE DATA AS YOUR PRIMARY ANCHOR. Start with the concrete numbers: dialogue count, scene count, network position."

This prevents the common error where an LLM over-inflates a minor character's importance just because they have one catchy monologue.

### Pass 2: The Psychological Deep Dive
This is where we extract the "Big Five" equivalent for narrative. In `lead-character-prompts.ts`, we force the model to identify conflicting forces.

We use a structured JSON schema (via Zod) to enforce this output:

```typescript
export type PsychologicalProfile = {
    corePersonality: string;
    motivations: {
        primary: string; // The engine driving the car
        secondary: string[];
    };
    fears: string[];     // The brake pedal
    desires: string[];   // The destination
    // The most important field:
    contradictions: string[]; // e.g. "Wants intimacy but pushes people away"
    moralAlignment: string;
};
```

By explicitly asking for `contradictions`, we force the LLM to look for nuance. A flat character has no contradictions. A deep character always does.

### Example Output (Raw JSON)

Here is an actual output from the engine for a "Protagonist" character:

```json
{
  "psychologicalProfile": {
    "corePersonality": "Resilient survivor masking deep vulnerability",
    "motivations": {
      "primary": "To protect his younger brother from the cartel",
      "secondary": ["To redeem himself for his father's death"]
    },
    "fears": [
      "Becoming the monster he fights",
      "Total isolation"
    ],
    "contradictions": [
      "Preaches non-violence to his brother but solves problems with brutality",
      "Craves connection but trusts no one"
    ],
    "moralAlignment": "Chaotic Good"
  },
  "narrativeArc": {
    "arcType": "Redemption",
    "startingPoint": "Cynical enforcer",
    "endingPoint": "Self-sacrificing guardian",
    "completeness": "COMPLETE"
  }
}
```

## The Synthesis Pass: Solving the "Rashomon" Effect

When you analyze characters individually, you get the "Blind Men and the Elephant" problem. Character A thinks they are the hero; Character B thinks A is the villain.

To fix this, we run a final **Synthesis Pass** (`synthesis-pass.ts`). We feed the summaries of all characters into one context to determine the global truth.

### Prompt Strategy

The prompt for this pass (`synthesis-prompts.ts`) is designed to resolve conflicts and identify clusters.

```typescript
export function buildSynthesisPrompt(input: SynthesisInput): string {
    return `
    You are a professional screenplay analyst.
    
    TASK:
    Based on the character classifications above, determine:

    1. ENSEMBLE TYPE:
       - SINGLE_PROTAGONIST: One clear main character
       - DUAL_PROTAGONIST: Two equal protagonists
       - ENSEMBLE: Multiple characters with equal weight

    2. RELATIONSHIP CLUSTERS:
       Groups of 3-8 characters who are strongly connected.
       (e.g., "The Heist Crew", "The Royal Family")
    `;
}
```

This pass allows us to detect "Ensembles" vs "Single Protagonists" accurately. If we just counted lines, a chatty villain might look like a protagonist. The Synthesis pass understands narrative weight.

## Conclusion

The `scenario-parser` project demonstrates that "AI for Screenwriting" isn't about generating scripts—it's about understanding them. By combining:
1.  **Graph Theory** (Pipeline)
2.  **Heuristic Extraction** (Extraction)
3.  **Psychological Modeling** (Analysis)

We create a tool that mirrors the intuition of a human reader but scales to thousands of scripts. The result is not just data, but insight.
