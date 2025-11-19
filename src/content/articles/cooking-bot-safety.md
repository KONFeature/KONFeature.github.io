---
title: "Deterministic Safety Pipelines in AI Food Systems"
date: 2025-02-23T12:00:00Z
draft: false
subtitle: "Why we don't trust LLMs with allergies"
category: "system-design"
tags: ["Safety", "NLP", "System Architecture", "BullMQ", "TypeScript"]
icon: "shield-check"
iconColor: "text-emerald-400"
featured: false
description: "A deep dive into the deterministic safety layer, Regex-based NLP pipeline, and queue architecture of Cooking Bot, demonstrating why some tasks are too critical for LLMs."
githubUrl: "https://github.com/frak-id/cooking-bot"
---

When building an AI product that impacts physical health—like a cooking assistant—"hallucination" isn't just a UX problem; it's a liability. If an LLM hallucinates that "seitan" is gluten-free, it could send a user to the hospital.

For **Cooking Bot**, we adopted a "Sandwich Architecture": probabilistic AI layers (enrichment, search) are sandwiched between deterministic engineering layers (extraction, safety validation). This article details that safety pipeline.

## The Safety Architecture

The safety pipeline operates asynchronously to handle backpressure from the scraping layer. It consists of three distinct stages:

1.  **Extraction:** Converting unstructured text to structured data.
2.  **Validation:** Deterministic rule-checking against safety databases.
3.  **Enrichment:** Only once safe, the data is passed to the AI for enhancement.

## 1. The Queue System: Handling Scale

Reliability starts with flow control. We utilize **BullMQ** (on Redis) to manage the processing pipeline. This allows us to handle spikes in scraping volume without overwhelming the expensive processing or AI layers.

### Queue Manager Implementation
The `QueueManager` handles job priority and exponential backoff for failed jobs (e.g., if the database is momentarily unreachable).

```typescript
// apps/processor/src/queue/queue-manager.ts
import { Queue, Worker, QueueEvents } from "bullmq";

export class QueueManager {
  constructor(config: Config["queue"]) {
    this.queue = new Queue<ProcessingJob>("recipe-processing", {
      connection: this.redis,
      defaultJobOptions: {
        attempts: config.retryAttempts, // 3
        backoff: {
          type: "exponential",
          delay: config.retryDelay,     // 1000ms * 2^attempt
        },
        removeOnComplete: { count: 100 },
      },
    });
  }

  async addBatch(recipes: CleanRecipe[]): Promise<string[]> {
    const jobs = recipes.map((recipe, index) => ({
      name: "process-recipe",
      data: { recipe },
      opts: {
        // FIFO with priority boost for batches
        priority: recipes.length - index, 
      },
    }));
    return await this.queue.addBulk(jobs);
  }
}
```

## 2. NLP: Why Regex Beats LLMs (Sometimes)

For ingredient extraction, we specifically chose **NOT** to use an LLM. 

**Why?**
1.  **Speed:** Regex matches in microseconds; LLMs take milliseconds/seconds.
2.  **Cost:** Processing 100,000 ingredients/day via GPT-4 is expensive.
3.  **Consistency:** "200g flour" must *always* parse to `200` grams. LLMs might occasionally output `0.2` kg or just "200".

### The Regex Logic
We built a `FrenchIngredientExtractor` that uses composite Regex patterns to dismantle ingredient strings.

```typescript
// apps/processor/src/nlp/ingredient-extractor.ts
export class FrenchIngredientExtractor {
  // Capture numbers with decimals/commas, optionally followed by ranges
  private quantityPattern = /(\d+(?:[,.]\d+)?)\s*(?:à\s*\d+)?/;

  // Dynamically built from a vocabulary dictionary
  constructor() {
    const measurementTerms = Object.keys(FRENCH_MEASUREMENTS)
      .concat(Object.values(FRENCH_MEASUREMENTS).flatMap((m) => m.aliases));
      
    this.measurementPatterns = new RegExp(
      `(${measurementTerms.join("|")})`, 
      "i"
    );
  }

  extract(ingredientLine: string): ExtractedIngredient {
    // 1. Extract Quantity
    // 2. Extract Unit & Normalize (e.g., "c.à.s" -> "cuillère à soupe")
    // 3. Extract Preparation (e.g., "haché", "fondu")
    // 4. The remainder is the ingredient name
    
    // ... (See repo for full implementation)
    
    return {
      raw,
      name,
      normalizedQuantity, // Converted to standard unit base
      confidence: this.calculateConfidence(...),
    };
  }
}
```

This approach gives us structured data `{ name: "tomate", quantity: 200, unit: "g", allergens: [] }` with 100% reproducibility.

## 3. Deterministic Safety Logic

The `AllergenValidator` is the critical gatekeeper. It uses a "negative safety" model: assume everything is unsafe until proven otherwise. It scans for direct matches, hidden aliases, and even cross-contamination risks associated with tools or methods.

### The Validator Logic
We map not just ingredients, but the *context* of ingredients.

```typescript
// apps/processor/src/safety/allergen-validator.ts
export class AllergenValidator {
  // Knowledge base of hidden allergens
  private additionalKeywords: Record<string, string[]> = {
    gluten: ["seitan", "malt", "levure de bière", "chapelure", "panure"],
    lait: ["petit-lait", "babeurre", "ghee", "mascarpone"],
    soja: ["edamame", "tamari", "natto", "yuba"],
  };

  // Knowledge base of kitchen risks
  private crossContaminationRisks: Record<string, string[]> = {
    "huile de friture": ["gluten", "poissons", "crustacés"],
    "planche à découper": ["tous les allergènes"], // Generic warning
    "four partagé": ["gluten"],
  };

  validate(ingredients: string[]): AllergenValidationResult {
    // ... iteration over ingredients
    
    // Heuristic: Reduce confidence for ambiguous terms
    const ambiguousTerms = ["peut contenir", "traces", "arôme"];
    
    if (ambiguousTerms.some(term => ingredient.includes(term))) {
      confidence -= 0.2;
    }

    // Determine if human review is required
    const requiresReview =
      detectedAllergens.some((a) => a.severity === "high") ||
      possibleAllergens.length > 3 ||
      overallConfidence < 0.7;

    return { detectedAllergens, confidence, requiresReview, ... };
  }
}
```

### Why this matters
If an LLM sees "Fry the tempura," it might just tag it as "Japanese food." Our validator sees "tempura" -> maps to "frying" + "batter" -> flags **Gluten** (batter) and **Cross-Contamination** (fryer oil). 

This level of granularity is hard to guarantee with prompt engineering alone but is trivial with a deterministic dictionary approach.

## Conclusion

By combining **BullMQ** for resilience, **Regex** for precise extraction, and **Deterministic Validation** for safety, `cooking-bot` demonstrates that the best AI systems are often those that know when *not* to use AI. We use AI for the "fuzzy" parts (search, summary) and rigid code for the "fatal" parts (allergens, quantities).
