# Daily Research Agents

## Overview

Daily Research Agents run after bundle creation to provide external context, verify entities, and build relationship graphs. This subsystem transforms raw metadata into structured historical research.

## Multi-Agent Orchestration

The system uses a **Planner-Worker-Aggregator** pattern:

1.  **Planner**: Analyzes the bundle and entities to create a research plan (e.g., "Lookup Sorensen's roles in 1942").
2.  **Workers**: Specialized agents that execute tasks like web searching, entity linking (Wikipedia), and timeline extraction.
3.  **Aggregator**: Merges results from all workers and persists them to the database.

## Capabilities

- **Web Enrichment**: Summaries of historical events/figures from external sources.
- **Entity Linking**: Persistent URLs for entities (e.g., Wikipedia, Museum archives).
- **Timeline Extraction**: Chronological ordering of events discovered within bundles.
- **Reasoning**: Gemini-powered analysis of how different assets and entities relate.

## Persistence

Findings are stored in:
- `research_metadata`: Structured JSON payloads per bundle.
- `entity_links`: Permanent mappings for entities.
- `relationships`: Semantic links (Source -> Predicate -> Target).

## Usage

```bash
# Run standalone
node scripts/run-agents.js

# Run as part of the pipeline
npm run pipeline
```
