# CIC Phase 3 — Analyzer Integration
# File: docs/architecture/cic-phase3-analyzer-integration.md | Version: 1.0.0 | Date: 2026-05-16
# Status: COMPLETE

---

## Context

Phase 3 wires the existing `ImageAnalyzerV2` AI model into the full CIC ingestion pipeline. Before this phase, the analyzer existed in isolation — callable directly but disconnected from the ingest → sidecar → corpus flow. Phase 3 closes that gap by adding:

- A corpus-payload wrapper around the raw analyzer output
- A dedicated extractor registry (separate from the analyzer registry)
- A MIME-dispatching sidecar pipeline
- A stateless corpus builder
- An operator-facing health probe and UI panel

All new code lives in two trees:

```
castironforge/src/cic/cic/   — core pipeline modules
services/                     — HTTP service layer
operator-ui/                  — operator console
```

---

## Module inventory

### New files

| File | Role |
|------|------|
| `analyzers/ImageAnalyzerV2Extractor.js` | Adapts `ImageAnalyzerV2` raw output to corpus payload shape |
| `extractors/registry.js` | Maps extractor keys → `ImageAnalyzerV2Extractor` module namespace |
| `pipelines/sidecar.js` | MIME → extractor key dispatch; runs extraction for a single job |
| `pipelines/corpusBuilder.js` | Stateless corpus accumulator; merges extract results |
| `services/analyzer-status.js` | Health probe for all registered analyzers |
| `services/control-plane/routes/analyzers.js` | REST route handler for `/api/control-plane/analyzers` |

### Updated files

| File | Change |
|------|--------|
| `pipelines/index.js` v1.1.0 | Added exports: `runSidecar`, `createCorpus`, `mergeIntoCorpus`, `buildCorpus` |
| `services/control-plane/index.js` v1.1.0 | Wired analyzers route into dispatch table; route table refactored to flat if/else-if chain |
| `operator-ui/control-room.html` v1.1.0 | Added Analyzers tab; inline `initAnalyzers()` polling panel |
| `docs/roadmaps/master-roadmap.md` v2.5.0 | Phase 3 marked Complete |

---

## IExtractor interface contract

All extractors — including the wrapper — must export three named functions at module level. No classes, no base class, no inheritance.

```js
// meta — static descriptor
export const meta = {
  name:    string,   // human-readable name
  key:     string,   // registry key (e.g. 'image:v2')
  version: string,   // semver
  mimeTypes: string[], // handled MIME types
};

// extract — runs extraction for one job
export async function extract(job: Job): Promise<ExtractResult>

// healthCheck — returns health state without side effects
export async function healthCheck(): Promise<{ ok: boolean, detail: string }>
```

`ImageAnalyzerV2` already satisfies this contract. `ImageAnalyzerV2Extractor` re-exports a compatible surface while reshaping the output.

---

## Dual registry pattern

Two registries coexist and serve different purposes:

```
analyzers/registry.js        — raw IExtractor modules (ImageAnalyzerV2)
extractors/registry.js       — corpus-payload wrappers (ImageAnalyzerV2Extractor)
```

The analyzer registry is used by `analyzer-status.js` for health probing — it works directly with the canonical module. The extractor registry is used by `sidecar.js` for job execution — it uses the wrapper that maps output to corpus shape.

Both registries are frozen objects with a `getExtractor(key)` / `getAnalyzer(key)` resolver. A registry gap throws; there is no silent `null` return from `getExtractor`.

---

## Data flow

```
Job (jobId, assetId, mimeType, data)
  │
  ▼
sidecar.js — runSidecar(job)
  │  1. resolves MIME type → extractor key
  │     image/jpeg | image/png | image/webp | image/gif → 'image:v2'
  │     unknown MIME → { status: 'unsupported' }  (no throw)
  │  2. getExtractor(key) from extractors/registry.js
  │     registry gap → throws (not silent)
  │  3. extractor.extract(job)
  │
  ▼
ImageAnalyzerV2Extractor.js — extract(job)
  │  1. calls ImageAnalyzerV2.extract(job)
  │     status 'error'       → throws Error
  │     status 'unsupported' → returns empty payload
  │     status 'ok'          → maps to corpus payload
  │
  │  Schema mapping:
  │    result.data.faceClusters.faces   → payload.faces
  │    result.data.sceneGraph.objects   → payload.objects
  │    compileLabels(data)              → payload.labels
  │    compileEmbeddings(data)          → payload.embeddings
  │
  ▼
ExtractResult { type, version, payload, extractorResult }
  │
  ▼
corpusBuilder.js — mergeIntoCorpus(corpus, extract)
  │  Stateless: returns new corpus, never mutates input
  │  extract.type === 'image':
  │    payload.faces      → corpus.people (push)
  │    payload.objects    → corpus.entities (push)
  │    payload.labels     → corpus.tags (dedup merge)
  │    payload.embeddings → corpus.vectors (string-only filter)
  │  Unknown type: warn + return corpus unchanged
  │
  ▼
Corpus { people[], entities[], tags[], vectors[], metadata{} }
```

### Label compilation (`compileLabels`)

Labels are assembled from three sources in `ImageAnalyzerV2Extractor`:

1. `data.sceneGraph.objects[]` — all scene object labels
2. `data.placeRecognition.candidates[]` where `confidence >= 0.4` — place names
3. `data.crossReferences.publicFigures[]` where `confidence >= 0.5` — public figure names

Result is deduped (case-sensitive) and sorted. Confidence thresholds are hardcoded in the extractor; adjust there if recall/precision needs tuning.

### Embedding hints (`compileEmbeddings`)

Embeddings are face-level textual descriptors extracted from `data.faceClusters.faces[].embeddingHint`. These are strings, not float vectors — they are hints for downstream text search, not vector DB entries. Only string values are accepted; numerics are filtered.

---

## Corpus shape

```js
{
  people:   [],   // face cluster objects from ImageAnalyzerV2
  entities: [],   // scene graph object descriptors
  tags:     [],   // compiled labels (strings, deduped)
  vectors:  [],   // embedding hint strings
  metadata: {}    // reserved
}
```

`createCorpus()` returns a fresh empty corpus. `mergeIntoCorpus(corpus, extract)` returns a new corpus — it never mutates the input. Multiple extracts can be merged in sequence:

```js
import { createCorpus, mergeIntoCorpus, runSidecar } from './pipelines/index.js';

let corpus = createCorpus();
for (const job of jobs) {
  const extract = await runSidecar(job);
  if (extract.status !== 'unsupported') {
    corpus = mergeIntoCorpus(corpus, extract.result);
  }
}
```

`buildCorpus(job)` is a convenience wrapper that runs `runSidecar` and `mergeIntoCorpus` in one call against a fresh corpus.

---

## Analyzer status service

`services/analyzer-status.js` exports `getAnalyzerStatus()`. It probes all registered analyzers in parallel via `Promise.allSettled` — a single failing probe does not abort the others.

`ImageAnalyzerV2` throws at module level if `GEMINI_API_KEY` is absent. The probe uses dynamic `import()` inside a try/catch to guard against this — the module is never statically imported at service load time.

Return shape:

```js
{
  analyzers: [{
    name:          string,
    key:           string,
    ok:            boolean,
    detail:        string,
    geminiKey:     boolean,   // GEMINI_API_KEY present in env
    lastCheckedMs: number,
    error:         string | null,
  }],
  timestamp: string,  // ISO 8601
}
```

---

## Control plane routes

Two new routes added to `GET /api/control-plane/`:

```
GET /api/control-plane/analyzers         — full status snapshot
GET /api/control-plane/analyzers/:key    — single analyzer by registry key
```

Both are read-only. The POST guard in `control-plane/index.js` already rejects POST to any non-`/pipelines/:id/runs` path, so no additional guard needed.

Response envelope matches all other control plane responses:

```js
{
  requestId: string,
  timestamp: string,
  source:    'control-plane/v1.1.0',
  data:      { analyzers: [...], timestamp: string }
}
```

The route dispatch uses a flat if/else-if chain (not nested else-blocks). Adding a new route: add one `match(...)` call in the variable block and one `else if (mFoo.matched && method === 'GET')` branch. Do not nest.

---

## Operator UI — Analyzers tab

`operator-ui/control-room.html` lazy-inits the Analyzers panel on first tab activation. The panel polls `GET /api/control-plane/analyzers` every 30 seconds.

Each analyzer renders:
- Name and registry key
- ONLINE / OFFLINE badge (from `ok`)
- GEMINI_API_KEY: PRESENT / MISSING badge
- Detail string from `healthCheck()`
- Error message if `healthCheck()` threw

The panel is self-contained inline JS — no separate `.js` module file is needed or used.

---

## Environment requirements

| Variable | Required by | Effect if absent |
|----------|-------------|------------------|
| `GEMINI_API_KEY` | `ImageAnalyzerV2.js` | Module throws at load time; dynamic import guard in `analyzer-status.js` prevents crash |
| `CONTROL_PLANE_PORT` | `services/control-plane/index.js` | Defaults to `4000` |

**Start the control plane:**

```bash
cd C:/dev/CIP/RewriteLabs/rewrite-mcp
GEMINI_API_KEY=<key> node services/control-plane/index.js
```

**Without a real API key**, the analyzer will report `ok: false` and `geminiKey: false` in the status panel. The service still starts and all other routes remain functional.

---

## Key decisions

**Why a separate extractor registry vs the analyzer registry?**
The analyzer registry holds canonical IExtractor modules — used for health probing and direct model invocation. The extractor registry holds corpus-payload wrappers — used by the sidecar pipeline. Keeping them separate means the health probe always sees the real module, not a wrapper, and adding a new extractor type does not require touching the analyzer registry.

**Why stateless corpus merging?**
`mergeIntoCorpus` returns a new corpus rather than mutating in place. This makes it safe to use in concurrent contexts and trivially composable — corpus state can be checkpointed at any point without risk of partial mutation.

**Why dynamic import in `analyzer-status.js`?**
`ImageAnalyzerV2.js` has a module-level guard that throws if `GEMINI_API_KEY` is absent. A static import would crash the entire control plane service on startup without the key. Dynamic import isolates the throw to the probe, which catches it and returns `ok: false`.

**Why flat if/else-if routing in `control-plane/index.js`?**
The original nested else-blocks accumulated brace drift across edits. The flat chain is easier to audit, easier to extend, and eliminates the structural risk of mismatched braces when adding routes.

---

## Validation

```bash
# Syntax check all Phase 3 files
node --check castironforge/src/cic/cic/analyzers/ImageAnalyzerV2Extractor.js
node --check castironforge/src/cic/cic/extractors/registry.js
node --check castironforge/src/cic/cic/pipelines/sidecar.js
node --check castironforge/src/cic/cic/pipelines/corpusBuilder.js
node --check castironforge/src/cic/cic/pipelines/index.js
node --check services/analyzer-status.js
node --check services/control-plane/routes/analyzers.js
node --check services/control-plane/index.js

# Analyzer registry test suite (5/5 expected)
node --test castironforge/src/cic/cic/tests/analyzer-image-v2.test.js
```

All 8 files pass `node --check`. All 5 tests pass. Validated 2026-05-16.

---

## Phase 4 integration points

The corpus produced by Phase 3 is the input to Phase 4 (Qdrant persistence + semantic search). The handoff contract:

- Corpus shape: `{ people[], entities[], tags[], vectors[], metadata{} }` — Phase 4 will consume all four arrays
- `vectors` currently holds string embedding hints — Phase 4 will replace or augment these with float vectors from a dedicated embedding model
- `people` holds raw face cluster objects — Phase 4 will extract identity fields for indexing
- `tags` are deduplicated strings — ready for keyword index ingestion as-is
