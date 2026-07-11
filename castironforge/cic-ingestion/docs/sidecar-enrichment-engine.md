# Sidecar Enrichment Engine

## Overview

The Sidecar Enrichment Engine is a post-ingestion stage that enriches harvested assets with metadata, OCR text, transcripts, and AI-powered insights. It operates on the `CIC_Sidecars/` directory, generating versioned JSON files linked to each asset by content hash.

## Architecture

- **SidecarManager**: Handles loading, migration (v1 -> v2), and saving of sidecars.
- **Enricher**: Orchestrates a series of specialized extractors.
- **Extractors**: Modules focused on specific data types (e.g., OCRExtractor, EXIFExtractor, GeminiNERExtractor).

## Sidecar V2 Schema

The system uses the `cic-sidecar-v2.0.0` schema, which includes:
- `content`: Text, OCR, Transcripts, Summaries.
- `entities`: Named entities extracted from content.
- `topics`: High-level themes and tags.
- `technical`: EXIF, media info, and document metadata.
- `history`: Full audit trail of enrichment stages.

## Usage

```bash
# Run standalone
node scripts/run-sidecar.js

# Run as part of the pipeline
npm run pipeline
```

## Determinism & Idempotency

- Sidecars are indexed by SHA-256 content hash.
- Extractors only run if their target data is missing or out-of-date.
- The manager computes an "enrichment hash" to detect changes before saving.
