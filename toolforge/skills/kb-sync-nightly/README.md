# Knowledge Base Sync — Quick Reference

**Status:** Ready to Use  
**Version:** 1.0.0  
**Location:** `C:\dev\cic-os\personal-knowledge-base/`

---

## One-Minute Start

```bash
cd C:\dev\cic-os\personal-knowledge-base
python3 sync-all.py
```

Check results:
```bash
cat wiki/index-unified.md                # Master index
cat _integration/report.json             # Analysis
```

---

## Daily Workflow

### Option A: Automatic (Recommended)
Nightly scheduler runs `python3 sync-all.py` at 8 AM.

**You:** Review `_integration/report.json` for duplicates/gaps.

### Option B: Manual
```bash
# After code changes
python3 sync-all.py

# After manual wiki edits only
python3 integrate.py

# After documentation updates only
python3 sync.py
```

---

## Common Tasks

### Find Duplicate Pages
```bash
cat _integration/report.json | grep -A 10 '"duplicates"'
```

### Review Cross-References
```bash
cat _integration/cross-refs.json | less
```

### Check Coverage Gaps
```bash
cat _integration/report.json | grep -A 5 '"recommendations"'
```

### Update Topic Patterns
Edit `integration-config.json`, then re-run:
```bash
python3 integrate.py
```

---

## File Structure

```
C:\dev\cic-os\personal-knowledge-base/
├── sync.py                     # Original wiki sync (unchanged)
├── sync-all.py                 # New: Master orchestrator
├── integrate.py                # New: Cross-ref builder
├── integration-config.json     # New: Configuration
├── INTEGRATION_GUIDE.md        # Detailed quick reference (in skill docs)
├── wiki/                       # Output: synthesized docs
│   ├── cic/
│   ├── index.md
│   └── index-unified.md        # ← Master TOC (generated)
├── _integration/               # Output: analysis
│   ├── cross-refs.json         # ← Topic mappings (generated)
│   └── report.json             # ← Analysis report (generated)
└── sources/
    └── .sync-state.json        # Internal: change tracking
```

---

## Skill Metadata

| Property | Value |
|----------|-------|
| **Type** | Operational |
| **Entry** | `sync-all.py` in cic-os/personal-knowledge-base/ |
| **Runtime** | 10-15 seconds (full) |
| **Requires** | Python 3.8+ |
| **Output Format** | Markdown + JSON |
| **Dependencies** | Standard library (json, re, pathlib, hashlib, datetime) |

---

## Use Cases

- ✅ Nightly documentation sync
- ✅ Post-code-push integration analysis
- ✅ Duplicate detection (find similar pages)
- ✅ Coverage analysis (what's documented?)
- ✅ Team reference (unified knowledge index)

---

## Quick Fixes

| Problem | Fix |
|---------|-----|
| Too many duplicates | Increase `min_similarity_score` in config (0.3 → 0.5) |
| Missing cross-refs | Lower `min_topic_overlap` in config (2 → 1) |
| Slow performance | Run `sync.py` alone instead of `sync-all.py` |
| Output files empty | Check disk space and directory permissions |

---

## Configuration Tuning

### More Duplicates (Lower Threshold)
```json
"min_similarity_score": 0.2
```

### Fewer Duplicates (Higher Threshold)
```json
"min_similarity_score": 0.5
```

### Add Custom Topics
```json
"topic_patterns": {
  "my_domain": ["term1", "term2", "term3"]
}
```

---

## Supported Stages

| Command | What It Does | Time |
|---------|------------|------|
| `sync-all.py` | Wiki sync + integration | 10-15 sec |
| `sync.py` | Wiki sync only | <5 sec |
| `integrate.py` | Integration analysis only | 5-10 sec |

---

## Output Examples

**wiki/index-unified.md** (Master TOC):
```markdown
# Unified Knowledge Index

## CIC Architecture
- [Overview](wiki/cic/overview.md)
  - Related: [Component Ref](docs/reference/...)
```

**_integration/report.json** (Analysis):
```json
{
  "summary": {
    "total_pages": 150,
    "wiki_pages": 7,
    "docs_pages": 143,
    "cross_references": 42,
    "duplicate_groups": 3
  }
}
```

---

## Documentation

- **Usage Details:** See `docs/USAGE.md`
- **Daily Reference:** See `INTEGRATION_GUIDE.md` in cic-os/personal-knowledge-base/
- **Architecture:** See `SYNC_ANALYSIS.md` in C:\dev/
- **Configuration:** See inline comments in `integration-config.json`

---

## Support

For detailed help, see the full `USAGE.md` in the `docs/` directory of this skill.
