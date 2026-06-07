---
name: skillopt-bridge-redesign-v1
description: CIC ↔ SkillOpt Bridge architecture for Redesign skill
version: 1.0.0
created: 2026-05-30
meta_bob_form: v1.0
---

# CIC ↔ SkillOpt Bridge (Redesign Skill v1.0.0)

## Executive Summary

The CIC ↔ SkillOpt Bridge transforms CIC from a deterministic pipeline into a **self-improving intelligence system**. Every site CIC analyzes becomes training data. SkillOpt trains the Redesign skill. CIC deploys the evolved skill back to runtime. The loop tightens: better audits → better training → better redesigns → better audits.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      CIC INGEST STAGE                            │
│                   (extract DOM, content)                         │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────────┐
│                      CIC ENRICH STAGE                            │
│              (heuristics, accessibility gaps)                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────────┐
│                      CIC HARVEST STAGE                           │
│                  (synthesize redesign plan)                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────────┐
│            SkillOpt Exporter (NEW)                               │
│         (normalize → training item)                              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────────┐
│              SkillOpt Training Loop                              │
│         (train Redesign skill → best_skill.md)                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────────┐
│         CIC Skill Registry Loader (NEW)                          │
│      (detect new skill → load into runtime)                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────────┐
│              CIC Runtime Agents                                  │
│    (Discovery → Extractor → Redesign → Outreach)                │
│           Uses evolved Redesign skill                            │
└─────────────────────────────────────────────────────────────────┘
```

## Three Integration Layers

### Layer 1: Data Production (CIC → SkillOpt)

**Component:** `SkillOptExporter.ts` (in CIC Harvester)

**Responsibility:**
- Capture CIC's audit outputs (INGEST, ENRICH, SYNTHESIZE)
- Normalize into SkillOpt training items
- Write to train/val/test splits
- Track lineage (extractor version, agent version, timestamp)

**Output:**
```
/skillopt/data/train/item-{uuid}.json
/skillopt/data/val/item-{uuid}.json
/skillopt/data/test/item-{uuid}.json
```

**Trigger:**
- CLI flag: `--emit-skillopt`
- Pipeline hook: after SYNTHESIZE, before AUDIT

**Deployment:**
```bash
node ingestion.js --emit-skillopt --region us-east
```

### Layer 2: Skill Training (SkillOpt Core)

**Responsibility:**
- Consume training dataset from Layer 1
- Run training loop (50 epochs max)
- Compute reward functions (structural, heuristic, accessibility, performance, voice, determinism)
- Validate on held-out set
- Produce `best_skill.md` when converged

**Configuration:** `skillopt-config-redesign.yaml`
**Objective:** `skillopt-objective-redesign.md`
**Schema:** `skillopt-dataset-schema.json`

**Convergence:**
- Validation score ≥ 0.87 for 3 consecutive epochs
- No regressions in core metrics
- Zero hallucinations detected
- Output deterministic (stable across runs)

**Outputs:**
```
skillopt/best_skill.md
skillopt/metrics/final_scores.json
skillopt/metrics/convergence_log.json
skillopt/checkpoints/epoch_XX.pt
```

### Layer 3: Skill Deployment (SkillOpt → CIC)

**Component:** `SkillRegistryLoader.ts` (in CIC Runtime)

**Responsibility:**
- Watch `/skills/rewritelabs/redesign/` for new `best_skill.md`
- Detect changes (hash-based)
- Load skill into runtime
- Version-tag: `skill-vX.Y.Z`
- Update active Redesign skill
- Log lineage + metrics to `/cic/logs/skills/`

**Deployment Flow:**
1. SkillOpt writes `best_skill.md` to `/skills/rewritelabs/redesign/`
2. SkillRegistryLoader detects change
3. SkillRegistryLoader validates against schema
4. SkillRegistryLoader loads skill into CIC context
5. SkillRegistryLoader logs: timestamp, version, metrics link, CIC version
6. All subsequent Redesign tasks use the new skill

**Logging:**
```
[SkillRegistryLoader] Loaded skill-v1.1.0
[SkillRegistryLoader] Timestamp: 2026-05-30T18:45:00Z
[SkillRegistryLoader] Metrics: /skillopt/metrics/final_scores.json
[SkillRegistryLoader] CIC version: 3.0.0
```

## CIC Modifications Required

### 1. Add SkillOptExporter

**File:** `cic-ingestion/src/harvester/SkillOptExporter.ts`

**Interface:**
```typescript
class SkillOptExporter {
  constructor(config: SkillOptConfig);
  export(synthesizeOutput: SynthesizeOutput): Promise<ExportResult>;
  getStats(): ExporterStats;
}
```

**Spec:** `skillopt-exporter-spec.md`

### 2. Add SkillRegistryLoader

**File:** `cic-ingestion/src/runtime/SkillRegistryLoader.ts`

**Interface:**
```typescript
class SkillRegistryLoader {
  constructor(skillsDir: string);
  watch(): Promise<void>;
  loadSkill(skillPath: string): Promise<Skill>;
  logDeployment(skill: Skill, metrics: Metrics): Promise<void>;
}
```

### 3. Add CLI Flag

**File:** `cic-ingestion/src/cli/index.ts`

**Addition:**
```typescript
.option('--emit-skillopt', 'Export training items to SkillOpt')
```

### 4. Add Skill Evolution Log

**File:** `cic-ingestion/src/logs/SkillEvolutionLog.ts`

**Log Location:** `/cic/logs/skills/skill-evolution-{date}.jsonl`

**Log Format:**
```json
{
  "timestamp": "2026-05-30T18:45:00Z",
  "skill_name": "redesign",
  "skill_version": "1.1.0",
  "action": "deployed",
  "cic_version": "3.0.0",
  "metrics_link": "/skillopt/metrics/final_scores.json",
  "previous_version": "1.0.0"
}
```

## Deployment Checklist

- [ ] Implement `SkillOptExporter.ts`
- [ ] Implement `SkillRegistryLoader.ts`
- [ ] Add `--emit-skillopt` CLI flag
- [ ] Add `SkillEvolutionLog.ts`
- [ ] Wire SkillOptExporter into Harvester (after SYNTHESIZE)
- [ ] Wire SkillRegistryLoader into CIC runtime initialization
- [ ] Create `/skills/rewritelabs/redesign/` directory
- [ ] Create `/skillopt/data/{train,val,test}/` directories
- [ ] Validate schema: `skillopt-dataset-schema.json`
- [ ] Test: Run CIC with `--emit-skillopt` flag
- [ ] Verify: Check `/skillopt/data/train/` for exported items
- [ ] Bootstrap: Collect 500–1000 training items from first runs
- [ ] Launch SkillOpt training loop
- [ ] Verify skill deployment to runtime
- [ ] Monitor skill evolution logs

## Self-Improvement Loop

```
Week 1: Bootstrap Training Dataset
  → Run CIC on 500 sites with --emit-skillopt
  → Collect 500 training items

Week 2-3: First Training Cycle
  → SkillOpt trains Redesign skill
  → Converges at epoch ~35
  → best_skill.md v1.1.0 produced

Week 4: Deploy & Iterate
  → SkillRegistryLoader loads v1.1.0
  → CIC uses improved skill
  → New redesigns are better training data

Week 5+: Continuous Improvement
  → Every 500–1000 sites processed
  → New training cycle launched
  → Skill versions: 1.1.0 → 1.2.0 → 1.3.0 → ...
```

## Expected Outcomes

**At Convergence (epoch ~35):**
- Structural completeness: 0.95+
- Heuristic alignment: 0.90+
- Accessibility uplift: 0.85+
- Performance uplift: 0.72+
- Brand voice similarity: 0.78+
- Determinism: 1.00

**After First Deployment:**
- Redesign quality ↑ 20–30%
- Accessibility gaps ↓ 40%
- Content clarity ↑ 25%
- User engagement signals ↑ (measured post-deployment)

**Long-term (6+ months):**
- Skill versions: 1.1.0 → 1.5.0+
- Cumulative performance ↑ 60–80%
- CIC becomes domain expert on web redesign
- Outreach skill benefits (better context for copywriting)

## Monitoring & Alerting

**Metrics to Watch:**
- `skillopt/metrics/final_scores.json` → Skill performance deltas
- `/cic/logs/skills/` → Deployment frequency + versions
- CIC audit outputs → Heuristic scores trending upward
- RewriteLabs user feedback → Redesign quality subjective signals

**Alerts:**
- Convergence fails (epoch > 50 with no ≥0.87 score)
- Determinism breaks (skill outputs differ)
- Hallucinations detected (manual flag or heuristic)
- Skill loading fails (SkillRegistryLoader error)

## Files in This Artifact Set

| File | Purpose |
|------|---------|
| `skillopt-config-redesign.yaml` | SkillOpt training configuration |
| `skillopt-exporter-spec.md` | CIC exporter implementation spec |
| `skillopt-objective-redesign.md` | Training objective + reward functions |
| `skillopt-dataset-schema.json` | Training item JSON schema |
| `skillopt-bridge-redesign-v1.md` | This architecture doc |

## Next Steps

1. **Implement Layer 3 (CIC Runtime):** SkillRegistryLoader
2. **Implement Layer 1 (CIC Harvester):** SkillOptExporter
3. **Bootstrap training dataset:** Run CIC with `--emit-skillopt` on 500 sites
4. **Launch training:** Execute SkillOpt training loop
5. **Deploy skill:** SkillRegistryLoader loads best_skill.md
6. **Monitor:** Watch convergence, metrics, deployment logs
7. **Iterate:** Every 500–1000 sites, retrain skill

## Determinism Guarantee

Every component is deterministic:
- **SkillOptExporter:** Deterministic split assignment (hash-based)
- **SkillOpt training:** Fixed seed, frozen RNG
- **SkillRegistryLoader:** Hash-based change detection
- **Skill evolution logs:** Timestamped, immutable

Same input + configuration → same output, reproducible, auditable.
