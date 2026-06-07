---
title: CIC SkillOpt System
version: 0.1.0
date: 2026-05-30
owner: Rewrite Labs / CIC
status: stage-2-integration
---

# Purpose

The CIC SkillOpt System is the subsystem that turns CIC's documentary analysis pipeline into a **self-improving skill trainer**.

It connects:

- **INGEST → ENRICH → ORCHESTRATE → SYNTHESIZE → AUDIT** (CIC core)
- **DATASET → TRAIN → VALIDATE → EXPORT best_skill.md** (SkillOpt loop)
- **RUNTIME SKILL REGISTRY** (CIC runtime execution)

# High-level flow

1. CIC runs a normal pipeline on a site with `--emit-skillopt` flag.
2. Harvester emits a `SkillOptItem` (DOM snapshot, audit deltas, target redesign).
3. SkillOpt consumes items from `./skillopt/data/{train,val,test}`.
4. SkillOpt validates outputs, trains the **Redesign** skill, exports `best_skill.md`.
5. CIC `SkillRegistryLoader` picks up `best_skill.md` at runtime.
6. RedesignAgent uses the trained skill to drive site transformations.

# Integration points

## Data Production: Harvester → SkillOptExporter

- **Location:** `cic-ingestion/src/harvester/SkillOptExporter.ts`
- **Trigger:** After `SYNTHESIZE`, before `AUDIT`
- **Output:** `./skillopt/data/{train,val,test}/item-*.json`
- **Contract:**
  - `input.dom` — DOM snapshot (HTML string)
  - `input.content_blocks` — semantic blocks extracted by COMPRESS
  - `input.audit_deltas` — accessibility/performance gaps from AUDIT
  - `target.redesign_plan` — ideal redesign (Markdown)
  - `metadata.url` — source URL
  - `metadata.brand_voice` — brand context

## Validation: SkillOpt Validator

- **Location:** `cic-ingestion/src/skillopt/validator/index.ts`
- **Metrics:**
  - `structural_completeness` — required sections present
  - `heuristic_alignment` — addresses audit deltas
  - `accessibility_uplift` — covers a11y issues
  - `performance_uplift` — covers perf issues
  - `brand_voice_similarity` — matches brand guidelines
  - `determinism_score` — consistency across rollouts

## Deployment: Runtime → SkillRegistryLoader

- **Location:** `cic-runtime/src/skills/SkillRegistryLoader.ts`
- **Trigger:** CIC startup, `skillopt:deploy` command
- **Input:** `./skills/rewritelabs/redesign/best_skill.md`
- **Output:** Locked skill object passed to RedesignAgent

# Commands

```bash
cic skillopt:emit [--url-pattern PATTERN]
  # Run pipeline and emit SkillOptItems to ./skillopt/data

cic skillopt:validate <item.json> <output.md>
  # Score a single redesign output against its input

cic skillopt:data-gen [--base-dir DIR] [--counts TRAIN,VAL,TEST]
  # Generate synthetic SkillOptItems for testing

cic skillopt:train [--config skillopt-config-redesign.yaml]
  # (Stage 3) Train Redesign skill from ./skillopt/data

cic skillopt:deploy [--skill-version V]
  # (Stage 3) Export best_skill.md and reload SkillRegistry

cic skillopt:telemetry [--recent N]
  # (Stage 3) Show skill versions, validation scores, rollout metrics
```

# Subsystem Ownership

- **Data collection:** Harvester / SkillOptExporter (part of CIC ingestion)
- **Validation:** SkillOptValidator (Node module in CIC ingestion)
- **Training:** SkillOpt (external, Python-based, called by CLI)
- **Deployment:** SkillRegistryLoader (part of CIC runtime)
- **Observability:** SkillOptTelemetry (external, writes to shared ledger)

# Governance

- **TokenEconomyAgent:** SkillOpt training respects max_cost budget
- **SecuritySentinelAgent:** Exported skills signed with SHA-256; validation gate required before deploy
- **AuditAgent:** Every skill rollout audited; regressions detected and logged

# Exit Criteria (Stage 2 → Stage 3)

- [x] CIC_SKILLOPT_SYSTEM.md spec
- [x] SkillOptExporter + SkillOptCommand stubs
- [x] Node validation harness (6 metrics)
- [x] Validation harness wired to `skillopt:validate`
- [x] SkillRegistryLoader verified ready
- [x] RedesignAgent initialized with loaded skill
- [x] End-to-end test: emit → validate → (later: train/deploy)
