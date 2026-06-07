# Documentation Update Policy

**Authority**: This policy is enforced by all AI models working in this workspace (`ANTIGRAVITY.md` §3).  
**Skill**: [`../skills/doc-update.md`](../skills/doc-update.md) — execute this after every build and doc change.

---

## 1. Changelog

### Format
Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) exactly.

```
## [MAJOR.MINOR.PATCH] - YYYY-MM-DD
### Added | Fixed | Changed | Removed | Deprecated | Security
- **Feature Name**: One-line summary.
    - **Sub-component** (`path/to/file.js`): What it does, why it matters.
```

### Rules
- Every completed phase gets a new minor version bump (`2.3.0` → `2.4.0`).
- Every bugfix-only release gets a patch bump (`2.4.0` → `2.4.1`).
- Breaking changes bump the major version.
- Each bullet must name the specific file(s) changed using backtick paths.
- Entries are ordered newest-first.
- No entry is ever skipped. If a version is absent, it must be added retroactively.

### Automated Check
The `npm run doc:drift` tool enforces these rules by analyzing changed files and verifying their presence in the latest changelog entry.

### Timing
Update the changelog **immediately after** a phase is declared complete — not at the end of a session, not "later."

---

## 2. Roadmap

**File**: `docs/ROADMAP.md`

The roadmap has four live sections that must be kept current at all times:

| Section | Contains |
|---|---|
| **Completed** | All shipped phases with version + date |
| **Active** | Work currently in progress (max 3 items) |
| **Planned** | Agreed-upon next steps, in priority order |
| **Suggestion Log** | Ideas raised but not yet agreed upon |

### Rules
- When a phase ships: move it from **Active** → **Completed**, bump the version, add the date.
- When a new phase starts: add it to **Active**.
- When the operator agrees on next work: move from **Suggestion Log** → **Planned**.
- When any idea surfaces (in conversation, design docs, or implementation): log it in **Suggestion Log** immediately with the date it was raised.
- **Suggestion Log entries are never silently dropped.** They stay until explicitly accepted (→ Planned) or explicitly rejected (→ struck through with a rejection note).

---

## 3. Versioning

This project uses semantic versioning `MAJOR.MINOR.PATCH`:

- `MAJOR` — breaking API or architecture change
- `MINOR` — new feature, new phase, new subsystem
- `PATCH` — bugfix, polish, documentation-only change

The current version is the highest `[X.Y.Z]` entry in `docs/CHANGELOG.md`.

---

## 4. Triggers

Doc updates are **mandatory** in these situations:

| Trigger | Required action |
|---|---|
| Phase declared complete | New changelog entry + roadmap completion move |
| New feature merged | New changelog entry |
| Bug fixed | New changelog entry (patch) |
| New idea surfaced | Add to Suggestion Log |
| Planned item agreed | Move Suggestion Log → Planned |
| Build script run successfully | Verify changelog and roadmap are current |

---

## 5. Enforcement

All AI models in this workspace (Claude, Gemini, and others) must:

1. Read `docs/DOC_POLICY.md` at the start of every session.
2. Execute `../skills/doc-update.md` after every successful build or phase completion.
3. Never declare a phase "done" without updating both the changelog and roadmap.
4. Surface any new ideas immediately to the Suggestion Log — do not silently carry them in conversation.

## 6. Claude + Copilot Roles

- Claude is the deep architecture and reasoning engine.
- Claude receives the `Memory Diff Tool`, `Memory Injection Block`, `Rewrite Labs State Tracker`, and `docs/cic/CIC_SYSTEM.md` to establish a synchronized Claude memory baseline before any reasoning or proposal generation.
- This memory sync path is the authoritative state injection mechanism for Claude and must be refreshed whenever CIC state, contract, or system documentation changes.
- Claude may generate proposals, but it must preserve deterministic document authority behavior and respect locked system contracts.
- Copilot is the living-document manager. It owns versioning and update flow:
  - `FIND` — locate authoritative source documents
  - `READ` — understand current content and versioning
  - `DETERMINE VERSION BUMP` — choose the correct semantic increment
  - `GENERATE` — produce updated content, changelog, and roadmap entries
  - `UPLOAD` — write changes into the workspace
  - `ARCHIVE IN PLACE` — keep document history and preserve prior versions
  - `CONFIRM` — verify the new content, version bump, and documentation state are correct
