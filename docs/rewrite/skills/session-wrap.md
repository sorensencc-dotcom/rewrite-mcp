# Skill: session-wrap — v1.0.0 (2026-06-07)

## Overview

Automate session wrap-up tasks: update documentation, stage and commit changes, provide summary and next steps.

**Key Features:**

- ✅ **Doc Updates:** Write changes to documentation files
- ✅ **Git Staging:** Detect and stage modified files automatically
- ✅ **Atomic Commit:** Create commit with proper [tool] attribution
- ✅ **Report Generation:** Summarize work and provide next steps

---

## Usage

```
/session-wrap
  commitMessage: "[claude] Phase 47.1: Feature implementation"
  summary: "Implemented X, tested Y, documented Z"
  docUpdates: [
    {path: "docs/FILE.md", content: "..."},
    {path: "HANDOFF.md", content: "..."}
  ]
```

---

## Input Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commitMessage` | string | ✅ | Commit message with [tool] prefix |
| `summary` | string | ❌ | Session summary text |
| `docUpdates` | array | ❌ | Doc files to update with content |

**Commit Message Format:** Must start with tool prefix:
- `[claude]` — LLM/architectural work
- `[copilot]` — code generation
- `[gemini]` — research/synthesis
- `[human]` — manual edits

---

## Output

Returns object with:
- `success` — true if workflow succeeded
- `commitHash` — Resulting git commit hash
- `docUpdates` — File update results with status
- `stagedFiles` — List of files staged for commit
- `report` — Detailed session wrap summary with checklist and next steps

---

## Implementation

**Location:** `skills-runtime/session-wrap.js`  
**Dependencies:** Node.js fs, child_process, git  
**Execution:** 4-stage orchestration (docs → stage → commit → report)

---

## Next Steps

1. Test with real session data
2. Add automatic HANDOFF.md updates
3. Add optional push capability
4. Integrate with test runner
