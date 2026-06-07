# AGENTS.md — CIC Ingestion Pipeline
# Version: 1.0.0 | Date: 2026-05-23

Multi-tool coordination file for the CIC BOB Intelligence ingestion pipeline.
Read before making any changes. Governed by META_BOB_V_FINAL_FORM spec.

---

## Commit Attribution Convention

```
[claude]  architecture, extractors, LLM layer, PMS, registry
[copilot] test stubs, boilerplate, classifier expansion
[gemini]  seed data, research synthesis, model client experiments
[human]   manual config, .env, secrets, version bumps
```

---

## Zone Ownership — CIC Ingestion

| Path | Primary | May Assist | Notes |
|------|---------|-----------|-------|
| `src/extractors/` | Claude | — | ImageAnalyzerV2 lives here. IExtractor contract is frozen. |
| `src/harvester/extractors/` | Copilot | Claude | Legacy extractors. New ones go to `src/extractors/`. |
| `src/harvester/classifiers/` | Copilot | Claude | Classifier expansion OK; interface must stay stable. |
| `src/harvester/sidecars/` | Claude | Copilot | Entity/summary builders — Claude reviews shape changes. |
| `src/harvester/models/` | Gemini | Claude | Model client experiments. Coordinate before replacing. |
| `src/llm/` | Claude | — | LLM controller, prompt compiler, token meter. Claude-only. |
| `src/prompts/` | Claude | — | PMS-managed. Do NOT hand-edit. Run build-prompts.js. |
| `prompts/` | Claude | — | Prompt packs. PMS-managed. Same rule. |
| `src/pipeline/` | Claude | — | Pipeline orchestration. Coordinate all changes. |
| `src/digest/` | Claude | Copilot | Digest collector/synthesizer — Claude owns shape. |
| `src/ideas/` | Claude | Copilot | Ideas extractor/clusterer — Claude owns shape. |
| `src/context/` | Claude | — | Context store. Interface is shared — do not break. |
| `src/clients/` | Claude | Gemini | embedding/llama/model clients — Claude reviews changes. |
| `src/joplin/` | Copilot | Claude | Joplin integration. Copilot-friendly zone. |
| `src/memos/` | Copilot | Claude | Memo consumer. Copilot-friendly zone. |
| `src/delivery/` | Claude | Copilot | Delivery targets. Claude owns target interface. |
| `src/logging/` | Any | — | Logging utilities. Use [tool:X] prefix. |
| `src/utils/` | Any | — | Shared utilities. Use [tool:X] prefix. |
| `src/metrics/` | Any | — | Metrics. Use [tool:X] prefix. |
| `src/health/` | Any | — | Health checks. Use [tool:X] prefix. |
| `src/ops/` | Claude | — | Ops tooling. Claude-primary. |
| `src/replay/` | Claude | Copilot | Replay system. Claude owns replay contract. |
| `src/server/` | Claude | Copilot | Server entrypoint. Claude reviews route changes. |
| `src/tasks/` | Claude | Copilot | Task runners. Claude reviews orchestration changes. |
| `src/sources/` | Copilot | Claude | Source adapters. Copilot-friendly; interface must hold. |
| `scripts/` | Any | — | Build/harvest scripts. Use [tool:X] prefix. |
| `data/` | Any | — | Runtime state JSON. Never hand-edit `mas-blackboard.json`. |

---

## Critical Invariants

These must never be violated by any tool:

1. **IExtractor interface is frozen.**
   `src/extractors/` extractors must implement: `{ extract(item, deps): Promise<Result> }`.
   Do not add required constructor args without updating ALL extractors + tests.

2. **`src/prompts/` and `prompts/` are PMS-managed.**
   Running `node scripts/build-prompts.js` is the only sanctioned way to update prompt files.
   Direct edits will cause `drift.test.js` to fail.

3. **`data/mas-blackboard.json` is runtime state.**
   Never commit a hand-edited blackboard. The pipeline owns this file.

4. **`.env` and `secrets.md` are human-only.**
   No tool writes to `.env` or `secrets.md`. Period.

5. **Registry writes are Claude-only.**
   The extractor registry (`src/pipeline/` or equivalent registration point) is
   Claude-owned. Other tools must not register or deregister extractors.

---

## Session Start Checklist

```bash
cd projects/cic/ingestion
git log --oneline -15
cat HANDOFF.md
cat AGENTS.md
```

---

## Test Gate

Before any commit touching `src/`:
```bash
cd projects/cic/ingestion && npx vitest run
```
Failing tests must be documented in `HANDOFF.md`. Do not leave silent failures.

---

## Escalate to Human (Chris) When

- Any invariant above would be violated
- `.env` changes are needed
- A new external dependency (npm package) is required
- Pipeline data loss or Qdrant schema changes are needed
