---
name: skillopt-exporter-spec
description: CIC → SkillOpt Exporter specification for Redesign skill
version: 1.0.0
created: 2026-05-30
meta_bob_form: v1.0
---

# CIC → SkillOpt Exporter (Redesign Skill v1.0.0)

## Overview
The SkillOptExporter bridges CIC's internal pipeline events into SkillOpt training items. It runs within the CIC Harvester and normalizes audit outputs, heuristics, and synthesized redesign plans into a deterministic, versioned dataset.

## Location
```
cic-ingestion/src/harvester/SkillOptExporter.ts
```

## Responsibilities
1. Convert CIC pipeline events into SkillOpt training items
2. Normalize input, target, and metadata fields
3. Write items to train/val/test splits
4. Track exporter version and lineage
5. Handle errors deterministically (no silent failures)

## Event Mapping

| CIC Stage | SkillOpt Field | Source |
|-----------|---|---------|
| INGEST | `input.dom` | extracted HTML/DOM snapshot |
| INGEST | `input.content_blocks` | semantic content extraction |
| ENRICH | `input.heuristics` | CIC heuristics evaluation |
| ENRICH | `input.audit_deltas` | accessibility/performance gaps |
| SYNTHESIZE | `target.redesign_plan` | synthesized redesign (JSON/Markdown) |
| AUDIT | `metadata.validation_deltas` | audit report metadata |

## Export Trigger

**CLI Flag:** `--emit-skillopt`

**Pipeline Hook:** After SYNTHESIZE, before AUDIT

Example:
```bash
node ingestion.js --emit-skillopt --region us-east --output-format json
```

## Output Structure

```
/skillopt/data/train/item-{uuid}.json
/skillopt/data/val/item-{uuid}.json
/skillopt/data/test/item-{uuid}.json
```

## JSON Item Format

```json
{
  "item_id": "uuid-v4",
  "timestamp": "2026-05-30T12:34:56.789Z",
  "input": {
    "dom": "<!DOCTYPE html>...",
    "content_blocks": [
      {
        "type": "heading",
        "text": "...",
        "level": 1
      }
    ],
    "heuristics": {
      "wcag_violations": 5,
      "layout_score": 0.62,
      "readability_score": 0.71,
      "mobile_friendly": false
    },
    "audit_deltas": {
      "accessibility": {
        "current": "WCAG 2.1 Level A",
        "gaps": ["color-contrast", "alt-text"]
      },
      "performance": {
        "lcp_ms": 3200,
        "fid_ms": 150,
        "cls": 0.15
      }
    }
  },
  "target": {
    "redesign_plan": "{\n  \"layout\": \"...\",\n  \"content\": \"...\",\n  \"accessibility\": \"...\"\n}"
  },
  "metadata": {
    "region": "us-east",
    "extractor_version": "ImageAnalyzerV2/2.0.0",
    "agent_version": "CIC/3.0.0",
    "exporter_version": "SkillOptExporter/1.0.0",
    "site_url": "https://example.com",
    "domain": "example.com"
  },
  "split": "train"  // or "val", "test"
}
```

## Exporter Behavior

### Initialization
- Create output directories if missing
- Load configuration from `skillopt-config-redesign.yaml`
- Initialize counters: `train_count`, `val_count`, `test_count`

### Per-Event Processing
1. Receive event from pipeline
2. Validate required fields (no silent failures)
3. Normalize to SkillOpt schema
4. Assign split: 80% train, 10% val, 10% test (deterministic based on hash)
5. Write item to appropriate directory
6. Log: timestamp, item_id, split, lineage

### Error Handling
- Invalid event → throw with item_id + field name
- Missing required field → throw immediately
- Disk full → throw with context
- No side effects on error (transactional write)

## Split Assignment (Deterministic)

```typescript
const split = hash(item_id + timestamp) % 100 < 80 ? 'train' : 
              hash(item_id + timestamp) % 100 < 90 ? 'val' : 'test';
```

This ensures:
- Reproducible splits across runs
- No data leakage (val/test never overlap)
- Stable assignment (item always goes to same split)

## Deployment in CIC Pipeline

### Hook Points in Harvester

**After SYNTHESIZE:**
```typescript
const exporter = new SkillOptExporter(config);
await exporter.export(synthesizeOutput);
```

**Runtime Logging:**
```
[SkillOptExporter] Exported item-{uuid} → train
[SkillOptExporter] Count: train=1453, val=182, test=181
```

## Configuration Reference

From `skillopt-config-redesign.yaml`:
- `data.train_dir`, `data.val_dir`, `data.test_dir`
- `data.schema` → path to `skillopt-dataset-schema.json`

## Lineage Tracking

Every exported item includes:
- `extractor_version` (e.g., `ImageAnalyzerV2/2.0.0`)
- `agent_version` (e.g., `CIC/3.0.0`)
- `exporter_version` (e.g., `SkillOptExporter/1.0.0`)
- `timestamp`, `region`, `site_url`

This enables:
- Tracing which CIC components produced training data
- Correlating SkillOpt improvements back to CIC versions
- Regional analysis of skill performance

## Next Steps

1. Implement `SkillOptExporter.ts` in cic-ingestion
2. Add `--emit-skillopt` flag to CLI
3. Wire into Harvester after SYNTHESIZE
4. Validate output against `skillopt-dataset-schema.json`
5. Run on first 100 sites to bootstrap training dataset
