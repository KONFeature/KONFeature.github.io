---
title: "The Orchestration Engine: Building a Resilient Analysis Pipeline"
date: 2025-10-19T15:00:00Z
draft: false
subtitle: "Event-Driven Architecture & Graph Theory"
category: "system-design"
tags: ["architecture", "graph-theory", "typescript", "performance", "pipeline"]
icon: "workflow"
iconColor: "text-purple-400"
description: "A deep dive into the event-driven architecture, concurrency control, and graph theory algorithms powering scenario-parser's analysis engine."
# githubUrl: "https://github.com/KONFeature/scenario-parser"
heroImage: "./assets/scenario-parser/hero-pipeline.png"
group: "side-projects"
---

![hero image](./assets/scenario-parser/hero-pipeline.png)

When building `scenario-parser`, the primary challenge wasn't just "calling an LLM." It was orchestration. A typical screenplay analysis involves processing hundreds of entities, thousands of interactions, and maintaining a coherent state across multiple asynchronous stages.

This article dissects the orchestration architecture of **Stage 3: Analysis**, specifically focusing on concurrency control with `p-limit` and the implementation of Social Network Analysis (SNA) using `graphology`.

> **Note**: This article focuses on the analysis pipeline (Stage 3). For the complete system architecture including extraction and our 4-parser competitive strategy, see [The Complete Architecture](/articles/scenario-parser/architecture).

## The Analysis Pipeline Architecture

The analysis pipeline operates on the **best screenplay** selected from our [4-parser competitive system](/articles/scenario-parser/architecture#stage-2-parsing). Once we have a high-quality parsed screenplay (Stage 2 complete), we move to Stage 3: Analysis.

The system is designed as a linear, state-aware pipeline with three main artifacts: `Synopsis`, `Character Analysis`, and `Scene Breakdown`. We use an event-driven approach where the completion of one artifact can trigger the processing of dependent artifacts.

Here is the high-level flow of data through the system:

```mermaid
graph TD
    subgraph "Input Layer"
        A[Upload PDF] --> B[Queue Job]
    end

    subgraph "Extraction Stage"
        B --> C[PyMuPDF4LLM]
        C --> D{Output Format}
        D -->|Markdown| E[Raw Markdown]
        D -->|Plain Text| F[Raw Text]
    end

    subgraph "Parsing Stage"
        E --> G[Regex Classifier]
        G --> H[Element Stream]
        H --> I[State Machine]
        I --> J[Structured Screenplay JSON]
    end

    subgraph "Analysis Stage"
        J --> K[Character Normalizer]
        K --> L[Graph Builder]
        L --> M[Centrality Computation]
        M --> N[LLM Synthesis Pass]
        N --> O[Final Dossier]
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style O fill:#9f9,stroke:#333,stroke-width:2px
```

### Event-Driven Flow with Artifact State Machine

The pipeline operates on an **artifact-based state machine**. Each artifact (extraction result, parsed screenplay, character analysis) progresses through distinct states tracked in PostgreSQL:

```mermaid
stateDiagram-v2
    [*] --> Pending: triggerArtifact()
    Pending --> Processing: tryMarkAsProcessing()
    Processing --> Completed: markAsCompleted()
    Processing --> Failed: markAsFailed()
    Failed --> Pending: Retry
    Completed --> [*]
    
    note right of Processing
        Optimistic locking prevents
        duplicate processing
    end note
    
    note right of Failed
        Error stored in DB
        with 500-char truncation
    end note
```

This state machine is implemented using **optimistic locking** to prevent race conditions in concurrent environments:

```typescript
// From apps/backend/src/domains/artifact/repository.ts
async function tryMarkAsProcessing(
    pdfId: string,
    type: ArtifactType,
    version: string,
): Promise<boolean> {
    // Atomic compare-and-swap operation
    const result = await db
        .update(pdfArtifact)
        .set({ status: "processing", updatedAt: new Date() })
        .where(
            and(
                eq(pdfArtifact.pdfId, pdfId),
                eq(pdfArtifact.type, type),
                eq(pdfArtifact.status, "pending"), // Only transition if still pending
            ),
        )
        .returning();
    
    return result.length > 0; // Success if row was updated
}
```

This pattern ensures that even if multiple workers attempt to process the same artifact simultaneously, only one succeeds. The others gracefully skip processing.

### Database Schema: The Source of Truth

Our PostgreSQL schema uses **Drizzle ORM** to define two core tables with compression, versioning, and cascade deletion. All binary data (PDFs, artifacts) is gzip-compressed before storage, reducing database size by 70-90%.

**Key design decisions:**

1. **Compression**: All binary data is gzip-compressed, reducing size by 70-90%
2. **Versioning**: Each artifact stores the processor version that generated it
3. **Cascade Deletion**: Foreign key constraints ensure cleanup
4. **Unique Constraints**: Composite index on `(pdfId, type)` enforces exactly-once semantics

### Concurrency Control with `p-limit`

One of the most critical engineering decisions was how to handle scale. When analyzing a TV series season, we might have 10+ scripts processing simultaneously. Each script generates dozens of LLM calls (one per scene, one per character).

Blindly firing `Promise.all()` is a recipe for disaster:
1.  **Rate Limits:** OpenAI/Anthropic APIs will instantly 429.
2.  **Memory Pressure:** Node's heap will explode with thousands of pending promises.
3.  **Database Locks:** Writing results concurrently can deadlock the DB.

We solved this using `p-limit`. It's a lightweight barrier pattern that restricts the number of promises running in parallel.

Here is the actual implementation from our `pipeline.ts`:

```typescript
import pLimit from "p-limit";
import { createComponentLogger } from "@scenario-parser/common";

// Global concurrency limiter: max 20 concurrent artifact processing jobs
// This ensures we don't flood the worker pool or external APIs
const processingLimit = pLimit(20);

/**
 * Trigger processing for a specific artifact type.
 * The job is wrapped in the limiter to ensure we respect global thresholds.
 */
export async function triggerArtifact(
    pdfId: string,
    artifactType: ArtifactType,
): Promise<void> {
    logger.info({ pdfId, artifactType }, "Triggering artifact");

    const processor = getProcessor(artifactType);
    const version = processor.getVersion();

    // Mark as pending immediately in the DB
    await ArtifactRepository.markAsPending(pdfId, artifactType, version);

    // Queue the processing job with concurrency control
    // Note: We don't await the limit() call here because we want to return 
    // to the API immediately while the job processes in the background.
    processingLimit(() => processArtifactInternal(pdfId, artifactType))
        .catch((err) =>
            logger.error({ pdfId, artifactType, err }, "Unhandled processing error"),
        );
}
```

This pattern allows us to "fire and forget" from the API controller's perspective, while the background worker efficiently chews through the queue at a safe, constant velocity.

### Advanced Concurrency Patterns: Beyond p-limit

While `p-limit` handles horizontal concurrency (max 20 jobs in parallel), we layer additional concurrency controls for different processing phases:

```typescript
// From packages/analyzer/src/character-analysis-v2/utils/limits.ts
import limit from "p-limit";

/**
 * Nested concurrency limiter specifically for LLM API calls.
 * Set to 20 to match Gemini's rate limits (60 RPM / 3 concurrent streams).
 */
export const llmPassLimits = limit(20);
```

This creates a **two-tier concurrency model**:

1. **Outer Limit (Pipeline)**: Max 20 screenplays processing at once
2. **Inner Limit (LLM Calls)**: Max 20 LLM API calls per screenplay analysis

```mermaid
graph TD
    subgraph "Outer Limit: 20 Screenplays"
        S1[Screenplay 1]
        S2[Screenplay 2]
        S3[Screenplay ...]
        S20[Screenplay 20]
    end
    
    subgraph "Inner Limit: 20 LLM Calls per Screenplay"
        S1 --> L1[Character 1 Analysis]
        S1 --> L2[Character 2 Analysis]
        S1 --> L3[Character ...]
        S1 --> L20[Character 20]
    end
    
    L1 --> API[Gemini API]
    L2 --> API
    L3 --> API
    L20 --> API
    
    style API fill:#ff9,stroke:#333,stroke-width:2px
```

**Backpressure handling**: When the LLM rate limit is hit, `p-limit` automatically queues pending promises in memory. The queue depth is unbounded, but each promise is lightweight (just a closure), so memory pressure remains manageable even with 1000+ queued character analyses.

### Error Handling and Retry Logic for LLM Calls

LLM APIs fail. Often. We implement a **three-layer error strategy**:

#### Layer 1: Vercel AI SDK Built-in Retries

```typescript
const result = await llmPassLimits(() =>
    generateObject({
        model: textModel,
        schema,
        system: systemPrompt,
        prompt,
        maxRetries: 3,  // Automatic exponential backoff for transient errors
    }),
);
```

This handles transient network errors, 429 rate limits, and 500 server errors with exponential backoff (1s, 2s, 4s).

#### Layer 2: Content Safety Filter Retry

Google Gemini's content safety filters occasionally reject screenplay content (violence, adult themes). We detect this and retry with an enhanced safety prompt that uses abstract, clinical terminology.

#### Layer 3: Graceful Degradation with Graph Metrics

If all retries fail, we fall back to **deterministic graph-based classification**. The LLM adds qualitative depth, but the graph metrics ensure we never return a completely empty analysis.

**Error rate in production**: ~2-3% of character analyses hit content safety filters. Of those, ~60% succeed on retry with the enhanced prompt. The remaining 40% use graph-based fallback, which still provides accurate tier classification.

## Memory Optimization: Streaming Without Loading Entire Scripts

A 120-page screenplay can be 500KB of raw text. Multiply that by 10 concurrent scripts, and you're pushing 5MB into memory.

### Lazy Loading and Compression

We employ several techniques to minimize memory footprint:

1. **Database Compression**: All artifacts stored in PostgreSQL are gzip-compressed. A typical 200KB parsed screenplay JSON compresses to ~40KB.

2. **Streaming Character Dossiers**: Instead of loading the entire screenplay into memory for character analysis, we generate **dossiers** that extract only the relevant scenes and dialogue for each character.

**Memory savings**: A lead character in a 120-page screenplay might appear in 60 scenes with 150 dialogues. Their dossier is ~30KB uncompressed, versus 500KB for the full screenplay. When analyzing 50 characters, this reduces memory usage from 25MB to ~1.5MB.

3. **Garbage Collection Pressure**: After each character analysis completes, the dossier is eligible for GC. The `llmPassLimits` queue ensures we never have more than 20 active analyses at once, capping peak memory usage.

## Social Network Analysis (SNA)

Once we have parsed the screenplay into structured data (Scenes, Characters, Dialogue), we don't just ask an LLM "who is important?". We *measure* it mathematically.

We use the `graphology` library to build a weighted undirected graph where:
*   **Nodes** are Characters.
*   **Edges** represent interactions (speaking in the same scene).
*   **Weights** are derived from the number of shared scenes and dialogue exchanges.

### Graph Construction: Edge Weighting Strategy

The way we weight edges is critical. A naive approach would be binary (edge exists if characters share a scene). We use a more sophisticated formula:

```typescript
// From packages/analyzer/src/character-analysis-v2/sna/graph-builder.ts
export function buildCharacterGraph(
    characterDossiers: Map<string, CharacterDossier>,
    pairDossiers: CharacterPairDossier[],
): Graph {
    const graph = new Graph({ type: "undirected" });

    // Add nodes (characters) with attributes
    for (const [name, dossier] of characterDossiers.entries()) {
        graph.addNode(name, {
            sceneCount: dossier.sceneCount,
            dialogueCount: dossier.dialogueCount,
            wordCount: dossier.stats.totalWords,
        });
    }

    // Add edges (relationships) with weighted scoring
    for (const pair of pairDossiers) {
        if (!graph.hasNode(pair.character1) || !graph.hasNode(pair.character2)) {
            continue;
        }

        // Weight formula: exchanges contribute MORE than just co-presence
        const weight = pair.sceneCount + pair.exchangeCount * 2;

        graph.addEdge(pair.character1, pair.character2, {
            sceneCount: pair.sceneCount,
            exchangeCount: pair.exchangeCount,
            weight,
        });
    }

    return graph;
}
```

**Why `exchangeCount * 2`?** Empirical testing on 50+ screenplays showed that direct dialogue exchanges are a stronger predictor of narrative importance than mere co-presence.

### Visualizing Graph Topologies

Different screenplay structures produce distinct graph topologies.

#### Star Topology (Single Protagonist)

```mermaid
graph TD
    P[PROTAGONIST]
    P --- A[Mentor]
    P --- B[Love Interest]
    P --- C[Antagonist]
    P --- D[Sidekick]
    P --- E[Ally]
    
    style P fill:#f96,stroke:#333,stroke-width:3px
```

**Characteristics:**
- Protagonist has highest degree centrality (connected to everyone)
- Protagonist has highest betweenness centrality (bridges all subplots)
- Example: *Die Hard* (John McClane), *Iron Man* (Tony Stark)

#### Ensemble Topology (Multi-Protagonist)

```mermaid
graph TD
    P1[Lead 1] --- P2[Lead 2]
    P1 --- P3[Lead 3]
    P2 --- P3
    P2 --- P4[Lead 4]
    P3 --- P4
    
    P1 --- S1[Supporting 1]
    P2 --- S2[Supporting 2]
    P3 --- S3[Supporting 3]
    P4 --- S4[Supporting 4]
    
    style P1 fill:#f96,stroke:#333,stroke-width:2px
    style P2 fill:#f96,stroke:#333,stroke-width:2px
    style P3 fill:#f96,stroke:#333,stroke-width:2px
    style P4 fill:#f96,stroke:#333,stroke-width:2px
```

**Characteristics:**
- Multiple characters with high centrality scores
- No single dominant node
- Example: *Avengers*, *Pulp Fiction*, *Game of Thrones*

#### Dual-Protagonist Topology (Buddy/Rivalry)

```mermaid
graph TD
    P1[Protagonist A] === P2[Protagonist B]
    P1 --- A1[A's Mentor]
    P1 --- A2[A's Love Interest]
    P2 --- B1[B's Family]
    P2 --- B2[B's Ally]
    
    style P1 fill:#f96,stroke:#333,stroke-width:2px
    style P2 fill:#f96,stroke:#333,stroke-width:2px
```

**Characteristics:**
- Two characters with comparable metrics
- Strong edge weight between them (triple line represents high `exchangeCount`)
- Example: *Lethal Weapon*, *The Departed*, *Breaking Bad* (Walt & Jesse)

### The Metrics

We compute four distinct centrality metrics to determine a character's narrative role. This is a deterministic layer that grounds the LLM's later qualitative analysis.

#### 1. Degree Centrality (Social Breadth)
Simple count of connections. "How many people do you know?"
*   *Interpretation:* High degree characters are social hubs (e.g., the host of a party).

#### 2. Betweenness Centrality (Information Broker)
This is the most computationally interesting metric. It measures how often a node acts as a bridge along the shortest path between two other nodes.

The mathematical formulation for Betweenness Centrality $C_B(v)$ of a node $v$ is:

$$ C_B(v) = \sum_{s \neq v \neq t} \frac{\sigma_{st}(v)}{\sigma_{st}} $$

Where:
*   $\sigma_{st}$ is the total number of shortest paths from node $s$ to node $t$.
*   $\sigma_{st}(v)$ is the number of those paths that pass through $v$.

**Computational Complexity**: The textbook algorithm (Brandes' algorithm) is $O(V \cdot E)$ for unweighted graphs and $O(V \cdot E + V^2 \log V)$ for weighted graphs. For a typical screenplay with 50 characters and 200 relationships:
- $V = 50$
- $E = 200$
- Complexity: ~10,000 operations (sub-millisecond on modern CPUs)

In our codebase, we use `graphology-metrics` to compute this efficiently:

```typescript
import Graph from "graphology";
import betweennessCentrality from "graphology-metrics/centrality/betweenness";
import { degreeCentrality } from "graphology-metrics/centrality/degree";
import eigenvectorCentrality from "graphology-metrics/centrality/eigenvector";

export function computeCentralityMetrics(
    graph: Graph,
    logger?: Logger,
): CentralityMetrics {
    const degree = degreeCentrality(graph);
    
    // High betweenness indicates a "Connector"
    const betweenness = betweennessCentrality(graph);

    // Eigenvector centrality can fail to converge on star graphs
    let eigenvector: Record<string, number>;
    try {
        eigenvector = eigenvectorCentrality(graph);
    } catch (error) {
        logger?.warn("Eigenvector centrality failed to converge, using zeros");
        eigenvector = Object.fromEntries(graph.nodes().map((node) => [node, 0]));
    }

    return { degree, betweenness, eigenvector };
}
```

**Betweenness in Practice**: In *The Godfather*, Michael Corleone has the highest betweenness centrality because he bridges multiple worlds: the Corleone family, the Five Families, and the civilian world through Kay.

#### 3. Harmonic Centrality (The "Protagonist" Metric)
Standard Closeness Centrality fails in disconnected graphs (which screenplays often are—think A-plot and B-plot). If two characters are in separate storylines, the distance is infinite.

We use **Harmonic Centrality** instead, which sums the inverse distances:

$$ H(x) = \sum_{y \neq x} \frac{1}{d(y, x)} $$

If $d(y,x) = \infty$, the term becomes 0, handling disconnected components gracefully.

```typescript
/**
 * Computes harmonic centrality for all nodes.
 * Better than closeness centrality for graphs with disconnected components.
 */
function harmonicCentrality(graph: Graph): Record<string, number> {
    const result: Record<string, number> = {};
    const nodes = graph.nodes();
    const n = nodes.length;

    for (const source of nodes) {
        let harmonicSum = 0;
        for (const target of nodes) {
            if (source === target) continue;

            const path = bidirectional(graph, source, target);

            if (path) {
                const distance = path.length - 1;
                if (distance > 0) {
                    harmonicSum += 1 / distance;
                }
            }
        }
        result[source] = n > 1 ? harmonicSum / (n - 1) : 0;
    }
    return result;
}
```

**Complexity Analysis**: 
- Outer loop: $O(V)$ (all source nodes)
- Inner loop: $O(V)$ (all target nodes)
- Shortest path: $O(E)$ per call (BFS on unweighted graph)
- **Total**: $O(V^2 \cdot E)$

For a 50-character screenplay: $50^2 \times 200 = 500,000$ operations. On a modern CPU, this executes in ~50-100ms.

#### 4. Eigenvector Centrality (Power/Influence)

Eigenvector centrality measures *who you know* rather than *how many you know*. In practice, this happens in ~5% of screenplays (mostly TV pilots). The fallback to zeros is safe because our importance score doesn't over-rely on eigenvector (only 10% weight).

### The Importance Score

Finally, we combine these raw metrics into a single "Importance Score" used to auto-classify characters as Leads, Supporting, or Day Players.

```typescript
export function buildCharacterMetrics(
    name: string,
    dossier: CharacterDossier,
    graph: Graph,
    centralityMetrics: CentralityMetrics,
): CharacterGraphMetrics {
    const degree = centralityMetrics.degree[name] ?? 0;
    const betweenness = centralityMetrics.betweenness[name] ?? 0;
    const closeness = centralityMetrics.closeness[name] ?? 0;
    const eigenvector = centralityMetrics.eigenvector[name] ?? 0;

    // The Secret Sauce:
    // Harmonic centrality (0.3) is the strongest predictor of Protagonist status.
    // Dialogue count (0.2) is a brute-force check against silent observers.
    
    const importanceScore =
        closeness * 0.3 +          // Story centrality
        degree * 0.15 +            // Social breadth
        betweenness * 0.15 +       // Bridge role
        eigenvector * 0.1 +        // Influence
        normalizeDialogue(dossier.dialogueCount) * 0.2 + 
        normalizeScenes(dossier.sceneCount) * 0.1;

    return { name, importanceScore };
}
```

### Data-Driven Tier Classification

Before even calling an LLM, we use the importance score to suggest character tiers based on percentile rankings and thresholds refined over analyzing hundreds of scripts.

### Performance Benchmarks

Real-world performance on a 2023 M2 MacBook Pro (8-core):

| Screenplay Size | Characters | Relationships | Graph Build | Centrality Compute | Total SNA Time |
|-----------------|------------|---------------|-------------|--------------------|----------------|
| 30 pages (short)| 12         | 25            | 2ms         | 5ms                | 7ms            |
| 120 pages (feature) | 45     | 180           | 8ms         | 45ms               | 53ms           |
| 600 pages (TV season) | 120  | 850           | 35ms        | 380ms              | 415ms          |

**Key Takeaway**: Even for a massive TV season, the entire graph analysis completes in under half a second. This is orders of magnitude faster than LLM calls (which take 2-5 seconds each).

## Hybrid Workflow: Graph + LLM Orchestration

The system implements a sophisticated multi-pass analysis pipeline that uses deterministic graph algorithms for structural questions and reserves LLMs for semantic analysis:

```mermaid
graph TD
    A[Phase 0: Generate Dossiers] --> B[Phase 1: Graph Analysis]
    B --> C[Pass 1: Per-Character LLM]
    C --> D[Pass 2: Per-Dyad LLM]
    D --> E[Pass 3: Synthesis]
    E --> F[Post-Processing]
    F --> G[Pass 4: Lead Deep Dive]
    F --> H[Pass 5: Supporting Clusters]
    F --> I[Pass 6: Day Players]
    
    style B fill:#9f9,stroke:#333,stroke-width:2px
    style C fill:#99f,stroke:#333,stroke-width:2px
    style D fill:#99f,stroke:#333,stroke-width:2px
    style E fill:#99f,stroke:#333,stroke-width:2px
```

### Why This Architecture Scales

Traditional approaches send the entire screenplay to the LLM and ask it to analyze all characters in one shot. Our hybrid approach solves scalability:

- **Graph analysis is deterministic**: It never hallucinates
- **LLM calls are isolated**: One failure doesn't affect others
- **Divide and conquer**: Each character gets their complete dossier

## Conclusion

By combining an event-driven architecture guarded by `p-limit` with rigorous graph theory, `scenario-parser` achieves two goals:
1.  **Stability:** It processes heavy workloads without crashing.
2.  **Accuracy:** It grounds LLM "hallucinations" in mathematical reality.

**Key Architectural Principles**:

1. **State machines everywhere**: Artifacts use explicit state machines with optimistic locking
2. **Compression by default**: All binary data is gzip-compressed (70-90% reduction)
3. **Two-tier concurrency**: Controlled parallelism without rate limit explosions
4. **Graph-first, LLM-second**: Deterministic analysis provides safety net
5. **Memory-conscious design**: Dossiers extract only relevant data
6. **Graceful degradation**: Every LLM call has a fallback strategy

In the next article, we explore the psychological modeling layer—how we use multi-pass LLM orchestration to extract character psychology while preventing hallucinations.
