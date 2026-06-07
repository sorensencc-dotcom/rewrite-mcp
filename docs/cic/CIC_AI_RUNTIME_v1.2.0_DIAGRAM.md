# CIC‑AI Runtime Diagram & Flow Delta — v1.2.0

## PMS v2 Compositional & Multi-Stage Prompt Pipeline

The diagram below represents the internal orchestration loop of the PMS v2 engine during a three-stage semantic ingestion burst:

```mermaid
graph TD
    A[Harvester Semantic Ingestion Job] --> B[ExtractorChain Run]
    B --> C[Pass 1: SemanticExtractor]
    C --> D[context.pmsEngine.requestPrompt 'seed']
    D --> E[PMS v2 Composer: resolve 'semantic_seed']
    E --> F[1. Resolve Parent Inheritance: base_semantic]
    F --> G[2. Override blocks: stage_header, stage_instructions]
    G --> H[3. Evaluate Conditional Guards: [[if ...]]]
    H --> I[4. Perform safe index lookup hooks]
    I --> J[5. Substitute variables & validate]
    J --> K[Return Composed Prompt & Metadata]
    K --> C
    C --> L[Pass 2: RelationshipExtractor]
    L --> M[context.pmsEngine.requestPrompt 'refine']
    M --> E
    L --> N[Pass 3: TopicExtractor]
    N --> O[context.pmsEngine.requestPrompt 'summarize']
    O --> E
    N --> P[Thread results, primary topics, final payload]
    P --> Q[Synchronous Qdrant point upsert & Graph linking]
    Q --> R[Ingestion Result: Attach pms metadata & return]
```

## Internal Component Overview

- **`PMSComposer`**: Coordinates the entire resolution pipeline. It takes `templateId` and variables, validates constraints, and runs the resolution sequence under error-isolation sandboxes.
- **`InheritanceResolver`**: Performs recursive parent climbs, resolving slot overrides by replacing parent `[[block:name]]` elements with child specifications.
- **`ConditionalEvaluator`**: Prunes template sections dynamically using regex matching from innermost-out, executing custom variable negation (`!`), intersection (`&&`), and union (`||`) operations.
- **`RateLimitedIndexLookup`**: Integrates `[[index_lookup query="..." limit=N]]` tags by querying the vector index with local rate-limiting intervals, returning deterministic historical snapshots in test stubs.
- **`MultiStageOrchestrator`**: Sequences pipeline stages (`seed` -> `refine` -> `summarize`) and serializes parameters to compute intermediate SHA-256 cache values in `MultiStageResult`.
