---
title: CIC Docs Index
version: 1.0.0
date: 2026-05-19
---

# CIC Docs Index

Master registry of all active Cast Iron Charlie and Rewrite Labs documents.
Updated automatically by the DocGen engine on every generation run.

## Document Registry

| Document | Version | Updated | Status |
|---|---|---|---|
| CIC Master Roadmap | Version: 1.0.0 | 2026-05-18 | Active |
| CIC Master Spec | Version: 1.0.0 | 2026-05-18 | Active |
| Rewrite Labs Roadmap | Version: 1.0.0 | 2026-05-18 | Active |

## Generation Instructions

To regenerate all docs:

```
cd projects/cic/docgen
npm install
node src/generateAll.js generate-all
```

To update this index only:

```
node src/generateAll.js update-index
```

## Notes

- All source documents are Markdown files in `projects/cic/docs/`
- DOCX outputs are stored in local output directory.
- Version numbers are maintained in each document's YAML frontmatter
- This index is the authoritative list of active documents
