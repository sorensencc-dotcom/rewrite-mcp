# System Versioning Standard
Version: 1.1.0
Updated: 2026-05-10
Author: Chris Sorensen

CIC + Rewrite Labs
Semantic Versioning for System Documentation

---

## 1. Purpose

Define a deterministic, operator-grade versioning standard for all system documentation across CIC and Rewrite Labs.

This governs:
- SYSTEM docs
- Governance docs
- Architecture docs
- Orchestration specs
- Memory standards

It does NOT govern:
- Research logs
- Treatment
- QuestionsForDad
- Redesign briefs
- Outreach drafts
- State trackers

Those are living documents.

---

## 2. Version Format

All system docs use **Semantic Versioning**:

### MAJOR
Increment when:
- Architecture changes
- Governance rules change
- Memory rules change
- Multi-agent orchestration changes

### MINOR
Increment when:
- New sections added
- New capabilities documented
- New workflows added
- Repo structure changes
- New agents or pipeline stages documented

### PATCH
Increment when:
- Typos fixed
- Formatting improved
- Clarifications added
- Non-breaking edits made

---

## 3. Version Propagation Rules

### Rule 1 — SYSTEM docs version independently
`CIC_SYSTEM.md` and `REWRITE_LABS_SYSTEM.md` each maintain their own version numbers.

### Rule 2 — GLOBAL docs version independently
Memory Governance, Orchestration, Architecture Map, and Versioning Standard each maintain their own versions.

### Rule 3 — CHANGELOG.md is the canonical change record
Every update to any SYSTEM or GLOBAL doc must be recorded in `GLOBAL/CHANGELOG.md` before committing.

### Rule 4 — State trackers are never versioned
`CIC_PROJECT_STATE.md` and `REWRITE_LABS_STATE.md` are volatile and always represent the current state.

### Rule 5 — Living documents are not versioned
Kroll Archive Log, Treatment, QuestionsForDad, Redesign Briefs, Outreach docs evolve continuously.

---

## 4. File Header Standard

Each SYSTEM or GLOBAL doc must begin with:

```
# <Document Name>
Version: X.Y.Z
Updated: YYYY-MM-DD
Author: Chris Sorensen
```

---

## 5. Release Workflow

### Step 1 — Make changes
Edit SYSTEM or GLOBAL docs as needed.

### Step 2 — Increment version
Follow MAJOR/MINOR/PATCH rules.

### Step 3 — Update CHANGELOG.md
Record: version, what changed, why, impact.

### Step 4 — Commit
Commit message format:

```
docs(<system>): bump <doc> to vX.Y.Z — <summary>
```

Example:
```
docs(CIC): bump CIC_SYSTEM.md to v1.2.0 — added agent taxonomy, pipeline architecture, full DB schema, CLI command table, governance table
```

---

## 6. Examples

### Example MAJOR change
- New memory governance rules
- New multi-agent orchestration model

### Example MINOR change
- Added new section to CIC_SYSTEM.md (e.g., Agent Taxonomy, Database Schema)
- Added new pipeline stage or agent to Rewrite Labs

### Example PATCH change
- Fixed typos
- Improved formatting
- Clarified a definition

---

## 7. Enforcement

All system documentation must follow this standard.
All changes must be logged in CHANGELOG.md before commit.
All version numbers must be explicit in file headers.
