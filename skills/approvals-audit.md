# Skill: approvals-audit — v2.0.0 (2026-06-05)

## Overview

The approvals-audit skill now operates **proactively** with automatic threshold-based promotion. Commands that are requested 2 or more times are automatically added to the pre-approved list, eliminating manual approval overhead for stabilized patterns.

**Key Features:**

- ✅ **Auto-Promotion:** Commands reaching threshold of 2 occurrences auto-approve
- ✅ **Frequency Tracking:** Every build/command increments occurrence counter
- ✅ **Proactive Manifest:** maintains `approvals-manifest.json` with pre-approved and pending items
- ✅ **Trend Reporting:** Track auto-promotion rate and approval patterns

---

## Auto-Promoted Commands

Commands automatically approved after reaching threshold of 2 occurrences:

1. `npm run build-docs` — Build MkDocs documentation (2 occurrences)
2. `npm run cic-ui:sentinel` — Verify UI layer status (2 occurrences)
3. `npm run cic-ui:validate` — Run UI integrity checks (2 occurrences)
4. `npm run cic-ui:smoke` — Run UI smoke tests (2 occurrences)
5. `npm run cic-ui:snapshot -- verify` — Verify UI golden master (2 occurrences)
6. `npx tsx benchmarks/routing/learning/test_trainer.ts` — Test trainer script (2 occurrences)
7. `npm start` (in projects/cic/ingestion) — Launch intelligence server (2 occurrences)

## Pending Approval

Commands awaiting threshold (currently 1 occurrence):

1. `python .venv/bin/mkdocs --version` — Check mkdocs version (flagged: WSL-only venv)

## Approval Statistics

| Metric | Value |
| --- | --- |
| Total Requests | 13 |
| Auto-Promoted | 7 (53.8%) |
| Manually Approved | 5 (38.5%) |
| Pending Review | 1 (7.7%) |
| Auto-Promotion Threshold | 2 occurrences |

---

## How It Works

**Proactive Mode (NEW):**

- Every build/command request increments occurrence counter
- When a command reaches 2 occurrences, it's **automatically promoted** to pre-approved
- No manual approval needed for stabilized patterns
- Handler tracks frequency in `approvals-manifest.json`

**API Usage:**

```javascript
import { ApprovalHandler } from "./approval-handler.js";

const handler = new ApprovalHandler();

// Track a request (auto-promotes at threshold)
const result = handler.trackApproval(
  "npm run build-docs",
  "Build documentation"
);

// Manually approve (skip threshold)
handler.approveCommand("npm deploy", "Deploy to production");

// Get summary
const summary = handler.getSummary();
```

---

## Files

- `approvals-manifest.json` — Persistent approval state with pre-approved and pending lists
- `approval-handler.js` — Handler with `trackApproval()`, `approveCommand()`, and `getSummary()` methods
