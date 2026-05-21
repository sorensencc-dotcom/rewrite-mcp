# Prompt Management System (PMS)

The CIC Prompt Management System (PMS) is a deterministic, operator-grade subsystem designed to manage, validate, and assemble prompt payloads for multiple LLM targets. It ensures that prompts are versioned, idempotent, and conform to strict schema and model-specific formatting requirements.

## Core Architecture

The PMS is implemented as a set of modular apps under `rewrite-mcp/apps/`, each optimized for a specific model target or execution mode.

### Subsystems

| App | Target/Mode | Description |
| :--- | :--- | :--- |
| `cic-pms` | **Gemini** | The foundational standard for Gemini prompt management. |
| `cic-pms-claude` | **Claude** | Optimized for Claude with XML-style prompt wrapping. |
| `cic-pms-headless` | **Headless** | High-throughput, whitespace-stripped automation for non-interactive agents. |
| `cic-pms-strict` | **Strict-Mode** | High-precision, schema-enforced JSON extraction using Gemini native JSON mode. |

### Resilience Subsystems (Phase 26)

| Module | Purpose | Description |
| :--- | :--- | :--- |
| `modelFallback.js` | **Fallback & Retries** | Manages multi-tier model chaining (Gemini → Claude → Llama) with exponential backoff. |
| `safeModeTemplates/` | **Safe-Mode** | A library of deterministic JSON templates for every agent, ensuring structural integrity during failure. |
| `jsonNormalize.js` | **Normalization** | Centralized choke point for converting all model outputs into valid objects. |

## Key Components

### 1. Loader & Registry
- **Loader**: Resolves pack paths, reads JSON configuration, and validates schema using `ajv`.
- **Registry**: Provides a central point for managing and retrieving versioned prompt packs.

### 2. Assembler
- **Section Merging**: Combines `system`, `instructions`, `examples`, and `constraints` into a single prompt string.
- **Context Injection**: Supports dynamic `context` injection into the prompt, enabling mode-based logic within prompt packs.
- **Model Optimization**:
    - **Gemini**: Supports `{ pack, model, context }` signature for flexible multimodal and mode-based assembly.
    - **Claude**: Wraps sections in XML tags like `<instructions>` and `<example>`.
    - **Headless**: Strips extra whitespace to minimize token usage.
    - **Strict**: Injects JSON schemas and "CRITICAL" formatting instructions.

### 3. Guards
- **Validation**: Enforces that mandatory fields are present and sections are not empty.
- **Version Check**: Ensures prompt pack versions satisfy required semver ranges.
- **Model Pinning**: Prevents model-specific packs (like Claude) from being used with incorrect executors.

### 4. Drift Detection
- **Hashing**: Computes a SHA-256 hash of the prompt pack.
- **Integrity**: Compares the current hash against an expected hash to detect unauthorized "drift" in prompt logic.

## Harvester Integration

The Harvester subsystem (in `projects/cic/ingestion`) utilizes the PMS through a shared `pmsClient.js`. This integration ensures that all data extraction and classification tasks use versioned, deterministic prompt packs stored in `apps/cic-pms/packs/`.

### Harvester Prompt Packs

| Pack | Usage | Modes |
| :--- | :--- | :--- |
| `analysis_v1` | Extractors | `image_analysis`, `text_extraction`, `metadata_extraction`, `reverse_image_search` |
| `research_v1` | Classifiers | `file_classification`, `domain_classification` |
| `rewrite_v1` | Sidecars | `summary`, `entity_extraction` |

## Prompt Pack Schema

Every prompt pack follows a standardized JSON structure:

```json
{
  "name": "research",
  "version": "1.0.0",
  "model": "gemini",
  "sections": {
    "system": "System instructions...",
    "instructions": "Operational steps...",
    "examples": ["Example A", "Example B"],
    "constraints": "Constraints..."
  },
  "response_schema": { ... } // Required for Strict-Mode
}
```

## Testing & Verification

Each subsystem includes a comprehensive Jest test suite covering:
- Drift detection integrity.
- Schema validation accuracy.
- Deterministic prompt assembly.
- Guardrail enforcement.

Run tests using:
```bash
cd rewrite-mcp/apps/cic-pms-[variant]
npm test
```
