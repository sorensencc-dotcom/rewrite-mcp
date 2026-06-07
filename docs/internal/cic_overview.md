# CIC (Cast Iron Charlie) Overview

**Subsystem:** Multi‑agent Documentary Research Engine

### Pipeline
```
INGEST → ENRICH → ORCHESTRATE → SYNTHESIZE → AUDIT
```

### Core Subsystems
- **Image Analyzer** – extracts visual features from harvested assets.
- **Document Analyzer** – parses and enriches textual content.
- **Evidence Normalizer** – transforms raw evidence into a canonical form.
- **Evidence Schema v1.0** – JSON schema for all audit‑ready evidence (see `docs/skills/evidence-schema-v1.md`).

### Current Status
- **ReverseImageSearchExtractor** – complete, 6/6 tests passing.
- **Queue / DLQ** – stable, operational.
- All related tests are passing.

### Observability
- **CIC Observability Dashboard** monitors 6 agents (updates every 10 seconds).

### Repository Root
```
C:\dev\rewrite-mcp\castironforge\cic-ingestion\
```
