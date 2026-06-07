# CIC‑AI Runtime v1.2.0 — PMS v2 Compositional Prompt Engine

## Summary

CIC‑AI Runtime v1.2.0 introduces **PMS v2**, promoting the Prompt Management System from a basic static template executor to a **dynamic, compositional, multi-stage prompt orchestration engine**.

Key pillars:
- **Compositional Template Inheritance**: Recursive parental structures with overridable `[[block:name]]` slot slots.
- **Strict Conditional Logic**: Nested guard blocks `[[if condition]]...[[endif]]` parsed innermost-out using custom logical expression evaluators (`!`, `&&`, `||`).
- **Safe Vector Index Lookup Hook**: Rate-limited, in-context vector snippet injections (`[[index_lookup query="..." limit=N]]`).
- **Multi-Stage API Orchestration**: Three-pass semantic pipeline (`seed` $\rightarrow$ `refine` $\rightarrow$ `summarize`) integrated directly inside `ExtractorChain` and `Harvester`.
- **In-Memory Composed Prompt Caching**: SHA-256 caching of compiled prompts to optimize repeat iterations.
- **Control Plane Resolve API**: Endpoint `POST /pms/resolve` for interactive prompt rendering and troubleshooting.

---

## Highlights

### 1. Compositional Templates & Inheritance

- Added parent template `base_semantic.yaml` defining master structure, header/instruction slots, and finalization checks.
- Added child templates `semantic_seed.yaml`, `semantic_refine.yaml`, and `semantic_summary.yaml` that inherit from the parent and override specific blocks.
- Cycles are prevented dynamically via recursion path tracking, rejecting loop references with explicit cyclical inheritance exceptions.

### 2. Multi-Stage Pipeline Integration

- Modified `ExtractorChain` to thread `pmsEngine` through the pass context and expose `pms.requestPrompt(stage, context)`.
- Updated `SemanticExtractor` (Pass 1 / `seed`), `RelationshipExtractor` (Pass 2 / `refine`), and `TopicExtractor` (Pass 3 / `summarize`) to request prompts dynamically from PMS v2.
- Hardened `Harvester` to compile and decorate final results with detailed template ID, version, and error telemetry.

### 3. Control Plane Resolve Endpoint

- Exposed `POST /pms/resolve` in the Control Plane router to receive a template ID and variables, rendering and returning the fully resolved prompt text alongside compilation metadata.

### 4. Hardened Verification Suites

- **Contract Tests** (`tests/runtime/pms-v2.contract.test.ts`):
  - Validates schema correctness, recursive inheritance block overrides, nested condition check evaluations under true/false/negated/combined logic states, index lookup replacements, and error isolation under invalid configurations.
- **Hybrid Tests** (`tests/runtime/hybrid/pms-v2.hybrid.test.ts`):
  - Validates the real multi-stage prompt flow through `ExtractorChain` and `Harvester`, asserts intermediate cache hits, and ensures template error isolation doesn't swallow pipeline-level failures.
- **Total Tests**: Evolved to **111 tests** (all fully passing).

---

## Files and Modules

- **Core PMS v2 Modules**:
  - `projects/cic/src/pms/v2/schema.ts`
  - `projects/cic/src/pms/v2/errors.ts`
  - `projects/cic/src/pms/v2/conditional.ts`
  - `projects/cic/src/pms/v2/inheritance.ts`
  - `projects/cic/src/pms/v2/composer.ts`
  - `projects/cic/src/pms/v2/multi-stage.ts`
- **YAML Templates**:
  - `projects/cic/pms/templates/custom/base_semantic.yaml`
  - `projects/cic/pms/templates/custom/semantic_seed.yaml`
  - `projects/cic/pms/templates/custom/semantic_refine.yaml`
  - `projects/cic/pms/templates/custom/semantic_summary.yaml`
- **Pipeline Integrations**:
  - `projects/cic/src/harvester/extractors/extractor-chain.ts`
  - `projects/cic/src/harvester/harvester.ts`
  - `projects/cic/src/cic/control-plane/index.ts`
- **Test Suites**:
  - `projects/cic/tests/runtime/pms-v2.contract.test.ts`
  - `projects/cic/tests/runtime/hybrid/pms-v2.hybrid.test.ts`

---

## Compatibility and Upgrade Notes

- Requires CIC‑AI Runtime Contract **v1.2.0**.
- Fully backward compatible with the v1.1.0 and v1.0.0 prompt registries.
- Re-run TS build and Vitest suite:
  ```bash
  cd projects/cic
  npm run build
  npm test
  ```
