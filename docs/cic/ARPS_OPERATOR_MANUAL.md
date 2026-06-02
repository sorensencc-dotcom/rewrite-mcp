# ARPS Operator Manual

## 1. Purpose

ARPS (Autonomous Roadmap & Prompt Sandbox) maintains CIC’s roadmap and prompt doctrine in a closed loop:
- Harvests real project state.
- Synthesizes roadmap and state updates.
- Enforces prompt immutability and drift limits.
- Verifies docs build before committing.

## 2. How to run ARPS

### Dry-run (recommended first)

```bash
cd projects/cic
node dist/agents/roadmapping/pipeline.js --dry-run --verbose
```

This:
- Generates a `RoadmapDelta`.
- Shows proposed doc changes.
- Does **not** write files or commit.

### Commit mode

```bash
cd projects/cic
node dist/agents/roadmapping/pipeline.js --commit
```

This:
- Applies fenced markdown updates.
- Runs `npm run build-docs`.
- Creates a structured git commit if all checks pass.

## 3. Reading ARPS output

- **RoadmapDelta artifacts:**  
  `projects/cic/.artifacts/roadmap/delta-<timestamp>.json`
- **Failed markdown previews:**  
  `projects/cic/.artifacts/roadmap/failed-<timestamp>.md`
- **Sandbox decisions:**  
  Logged with: metric used, similarity, decision.

## 4. When ARPS refuses a change

Common reasons:
- Owner mismatch in `registry.yaml`.
- Similarity below threshold (0.90 embeddings, 0.85 Jaccard fallback).
- Markdown validation failure (broken fences/tables).

Operator actions:
- Inspect logs and failed preview.
- Fix the underlying doc or registry entry.
- Re-run ARPS in dry-run, then commit mode.

## 5. Safety guarantees

- Prompts are only changed via Git and `registry.yaml`.
- Docs are only modified inside fenced regions.
- Docs must build under MkDocs before commits.
- All changes are visible as git diffs.
