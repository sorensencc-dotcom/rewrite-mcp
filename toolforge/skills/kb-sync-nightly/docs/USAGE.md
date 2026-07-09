# Knowledge Base Sync (kb-sync-nightly) — Usage Guide

**Version:** 1.0  
**Maintained:** Active  
**Type:** Operational Skill

---

## Quick Start

```bash
cd C:\dev\cic-os\personal-knowledge-base
python3 sync-all.py
```

## What It Does

Executes a two-stage pipeline:

### Stage 1: Wiki Sync (sync.py)
- Reads 7 predetermined CIC architecture documents from C:\dev root
- Detects changes using MD5 file hashing (incremental updates)
- Synthesizes each doc with summary + source attribution + timestamp
- Outputs: `wiki/cic/*.md`, `wiki/index.md`, `sources/.sync-state.json`

### Stage 2: Integration Layer (integrate.py)
- Scans `wiki/` (hand-curated) + `docs/` (auto-generated)
- Extracts topics from content using configurable patterns
- Builds cross-reference index (wiki ↔ docs)
- Detects duplicate topics (>30% similarity by default)
- Generates analysis and recommendations

## Output Files

### After sync-all.py:

```
wiki/
├── cic/
│   ├── overview.md
│   ├── agents.md
│   ├── agents-api.md
│   ├── environment.md
│   ├── observability.md
│   ├── token-packs.md
│   └── roadmap.md
├── index.md                    # (from sync.py)
├── index-unified.md            # (from integrate.py) ← UNIFIED INDEX
└── ...

_integration/
├── cross-refs.json             # Topic mappings (machine-readable)
├── report.json                 # Duplicates, gaps, recommendations
└── ...
```

### Key Files to Review

| File | Purpose | Use Case |
|------|---------|----------|
| `wiki/index-unified.md` | Master table of contents | Team reference, new member onboarding |
| `_integration/report.json` | Integration analysis | Find duplicates, identify coverage gaps |
| `_integration/cross-refs.json` | Topic-to-page mappings | Power search tools, audit automation |

## Running Specific Stages

```bash
# Wiki sync only (fast, incremental)
python3 sync.py

# Integration analysis only (after manual wiki edit)
python3 integrate.py

# Both stages (recommended)
python3 sync-all.py
```

## Automation

### Nightly Schedule (Windows Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. **Name:** KB Sync Nightly
4. **Trigger:** Daily at 8:00 AM
5. **Action:**
   - Program: `python`
   - Args: `C:\dev\cic-os\personal-knowledge-base\sync-all.py`
   - Start in: `C:\dev\cic-os\personal-knowledge-base`

### Nightly Schedule (Linux/Mac Cron)

```bash
0 8 * * * cd /path/to/cic-os/personal-knowledge-base && python3 sync-all.py
```

## Configuration

Edit `C:\dev\cic-os\personal-knowledge-base\integration-config.json` to customize:

### Add Custom Topics

```json
"topic_patterns": {
  "machine-learning": ["ml", "neural", "model", "training", "inference"],
  "distributed": ["distributed", "cluster", "replica", "consensus"]
}
```

### Adjust Duplicate Detection

```json
"cross_reference_rules": {
  "min_topic_overlap": 3,      # More strict (require 3 common topics)
  "min_similarity_score": 0.5  # Stricter (50% similarity to flag)
}
```

### Filter Content

```json
"exclude_patterns": [
  "_archive",
  "old_docs",
  "draft"
]
```

## Troubleshooting

### Error: "sync.py not found"
Ensure you're running from: `C:\dev\cic-os\personal-knowledge-base`

### Error: "docs/ not found"
The integration layer expects docs/ at `C:\dev\docs`. If it's elsewhere, edit `integrate.py` line 14.

### Error: "No pages found"
Check wiki/ has at least one .md file: `ls wiki/`

### Too many duplicates detected?
Increase `min_similarity_score` in `integration-config.json` (e.g., 0.5 instead of 0.3).

### Missing cross-references?
Lower `min_topic_overlap` in `integration-config.json` (e.g., 1 instead of 2).

## Performance

- **sync.py only:** <5 seconds (incremental)
- **integrate.py only:** 5-10 seconds (150 pages)
- **sync-all.py:** 10-15 seconds (full run)

## Support

- **Configuration:** See `integration-config.json` inline comments
- **Daily reference:** See INTEGRATION_GUIDE.md
- **Architecture:** See SYNC_ANALYSIS.md in C:\dev/
