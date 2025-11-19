---
title: "From PDF to Structured Data: The Extraction Layer"
date: 2025-02-24T12:00:00Z
draft: false
subtitle: "Solving the Screenplay Parsing Challenge"
category: "data-engineering"
tags: ["Python", "PDF Parsing", "Regex", "Data Engineering", "ETL"]
icon: "file-text"
iconColor: "text-yellow-400"
featured: false
description: "How scenario-parser transforms raw PDF binaries into semantic screenplay data using PyMuPDF4LLM, heuristic state machines, and fuzzy string matching."
githubUrl: "https://github.com/KONFeature/scenario-parser"
group: "scenario-parser"
---

Screenplays are notoriously difficult to parse. They are PDF files formatted for human eyes, not machines. A Scene Header looks distinct to us because it's in uppercase, but to a computer, it's just text.

This article details the "Frontend" of our backend: getting clean data out of messy PDFs. We employ a multi-stage strategy involving Python-based extraction, regex-based classification, and LLM-assisted deduplication.

## The Extraction Layer (Python)

We rely on a dual-approach extraction strategy in `packages/extractor`. While Node.js is great for orchestration, Python ecosystem libraries for PDF manipulation are superior.

### Why `pymupdf4llm`?

We specifically use `pymupdf4llm`. This library is excellent because it doesn't just dump text; it attempts to preserve layout semantics, which is crucial for screenplays where indentation implies function (Character names are centered, dialogue is inset).

In `extractor-markdown.py`, we extract content into Markdown. Why Markdown? Because LLMs "speak" Markdown natively. It preserves bolding, headers, and lists without the overhead of XML or JSON.

```python
import pymupdf
import pymupdf4llm

def extract_pdf(pdf_path: str, output_base_path: str | None = None):
    # Open the PDF document with PyMuPDF
    doc = pymupdf.open(pdf_path)

    # Extract to markdown with specified options
    # We disable images/graphics because we only care about the text
    md_text = pymupdf4llm.to_markdown(
        doc,
        pages=None,        # Extract all pages
        page_chunks=False, # Return as single string
        write_images=False,
        ignore_images=True,
        ignore_graphics=True,
    )
    
    return md_text
```

We also handle low-level artifacts like form feed characters (`\x0c`) to understand page boundaries. This is essential because "Page 10" in the PDF metadata might be "Page 1" of the actual script (due to title pages).

## The Classification Heuristic

Once we have text, we need to identify *what* that text is. Is "EXT. PARK - DAY" a scene header? Or is it a character shouting about a park?

In `packages/parser-2/src/classifier.ts`, we implemented a robust `ElementClassifier` that scores each line against multiple criteria. It's not just a single Regex; it's a weighted confidence system.

### The Scoring Engine

We define patterns for every element type (Scene Heading, Character, Dialogue, Parenthetical, Transition).

```typescript
// Regex patterns for Scene Headings
patterns: {
    sceneHeading: [
        // Numbered scenes (e.g., "1 INT.", "2 EXT.")
        /^\d+[A-Z]?\s+(INT\.?|EXT\.?|INT\.?\/?EXT\.?|I\/E\.?)\s+/i,
        // Standard English patterns
        /^(INT\.?|EXT\.?|INT\.?\/?EXT\.?|I\/E\.?)\s+/i,
        // French patterns
        /^(INTÉRIEUR|EXTÉRIEUR|INT\.?|EXT\.?)\s+/i,
        // Time of day indicators
        /^(JOUR|NUIT|AUBE|CRÉPUSCULE)\s*[-–]/i,
    ],
    // ... other patterns
}
```

The `classifyLine` method calculates a score (0.0 to 1.0) for each potential type.

```typescript
private scoreSceneHeading(line: PlumberLineOutput, text: string, margin: number): number {
    let score = 0;

    // 1. Position Scoring (Margins)
    if (margin >= this.config.margins.sceneHeading.min && 
        margin <= this.config.margins.sceneHeading.max) {
        score += 0.3;
    }

    // 2. Content Scoring (Regex)
    for (const pattern of this.config.patterns.sceneHeading) {
        if (pattern.test(text)) {
            score += 0.5;
            break;
        }
    }

    // 3. Heuristics (Uppercase, Time of Day)
    if (text === text.toUpperCase() && text.length > 10) {
        score += 0.1;
    }
    
    return Math.min(score, 1.0);
}
```

This approach allows us to handle edge cases. For example, if a line looks like a Character (all caps) but is positioned at the left margin (Action), the margin score will pull it towards Action, avoiding a false positive Character detection.

### Before and After

**Raw PDF Text:**
```text
1 INT. COFFEE SHOP - DAY
          TED
     (nervous)
 I don't think we should be here.
```

**After Classification & Parsing:**
```json
{
  "scenes": [
    {
      "header": "INT. COFFEE SHOP - DAY",
      "elements": [
        {
          "type": "character",
          "text": "TED",
          "modifier": "(nervous)"
        },
        {
          "type": "dialogue",
          "text": "I don't think we should be here."
        }
      ]
    }
  ]
}
```

## Character Normalization (Deduplication)

One common issue in screenplays is inconsistent naming. A character might be "DOCTOR", "THE DOCTOR", "DR. SMITH", and "SMITH" in different scenes. If we treat these as four different people, our graph analysis is useless.

We use a two-phase deduplication process defined in `character-normalizer.ts`.

### Phase 1: Jaro-Winkler Distance

First, we use the Jaro-Winkler distance algorithm (via the `natural` library) to find names that are textually similar. This is faster and cheaper than an LLM for obvious matches (e.g., typos).

```typescript
import { JaroWinklerDistance } from "natural";

// Iterate over all candidates
for (let i = 0; i < candidates.length; i++) {
    const candidateA = candidates[i];
    // ...
    const dist = JaroWinklerDistance(candidateA.normalizedName, candidateB.normalizedName);
    
    // If similarity is high (> 0.9), group them as potential duplicates
    if (dist > config.minDistance && dist < 1) {
        group.push(candidateB);
    }
}
```

### Phase 2: Contextual LLM Verification

For ambiguous cases (e.g., is "Jack" the same person as "Father"?), we use an LLM. We extract 3-5 samples of dialogue for each candidate to provide context.

```typescript
// We send this payload to the LLM
{
  "candidateA": {
    "name": "Jack",
    "samples": ["I'm not your father!", "Leave me alone."]
  },
  "candidateB": {
    "name": "Father",
    "samples": ["Jack, come back!", "I am your father."]
  }
}
```

The LLM acts as a final judge, preventing false merges (two different "Guards") while catching semantic matches that regex misses.

## Conclusion

By combining the layout-awareness of `pymupdf`, the speed of Regex heuristics, and the intelligence of LLMs for final cleanup, `scenario-parser` creates a dataset that is clean enough for deep analysis.

In the final article, we will look at how we use this clean data to model character psychology.
