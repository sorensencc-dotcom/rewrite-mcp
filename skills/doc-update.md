# Skill: doc-update

> **Shared model skill** — compatible with Claude, Gemini, and any AI assistant working in this workspace.  
> **When to run**: After every successful build, phase completion, or source file modification.  
> **Policy reference**: [`docs/DOC_POLICY.md`](../docs/DOC_POLICY.md)

---

## Step 1 — Determine the current version

Read `docs/CHANGELOG.md`. The current version is the first `## [X.Y.Z]` entry.

```
current_version = first changelog entry's version
```

---

## Step 2 — Determine the version bump

| What shipped | Bump |
|---|---|
| New feature, phase, subsystem | Minor (`X.Y+1.0`) |
| Bugfix, patch, polish | Patch (`X.Y.Z+1`) |
| Breaking API or architecture change | Major (`X+1.0.0`) |

Compute `next_version`.

---

## Step 3 — Write the changelog entry

Insert at the **top** of `docs/CHANGELOG.md`, immediately after the `# Changelog` heading:

```markdown
## [next_version] - YYYY-MM-DD
### Added
- **Phase Name — Short Description**: One-line summary of what this phase delivers.
    - **Sub-component** (`path/to/file.ext`): What changed and why it matters to an operator.
    - **Sub-component** (`path/to/file.ext`): What changed and why it matters to an operator.

### Fixed  ← omit this section if nothing was fixed
- **Bug Name** (`path/to/file.ext`): What was broken and how it was resolved.
```

Rules:
- Every changed file gets its own bullet with a backtick path.
- Be specific: name the function, endpoint, or component — not just the file.
- Do not add a `### Fixed` or `### Changed` section if there is nothing to put in it.

---

## Step 4 — Update MkDocs Navigation (Mandatory for New Docs)

If any **new** `.md` files were created, they **MUST** be added to the `nav` section of `mkdocs.yml`.

1. Open `mkdocs.yml`.
2. Find the appropriate section in the `nav` tree (e.g., `CIC Manual`, `RL Manual`, `RL Release`).
3. Add the new file with a descriptive label:
   ```yaml
   - "Label": path/to/new/file.md
   ```

---

## Step 5 — Update the Roadmap

Open `docs/ROADMAP.md`.

### 4a. Move completed work
For each item that just shipped:
- Find it in **Active** or **Planned**.
- Move it to **Completed** with format: `- [vX.Y.Z] Phase Name — YYYY-MM-DD`

### 4b. Add new Active items
If new work is starting, add it to **Active** with format: `- Phase Name — started YYYY-MM-DD`

### 4c. Update Planned
If the conversation surfaced agreement on next steps, move them from **Suggestion Log** to **Planned** in priority order.

### 4d. Log new suggestions
For **every idea, observation, or "what if" raised during this session** that was not explicitly agreed upon:
- Add it to **Suggestion Log** with format: `- YYYY-MM-DD — [idea description] — raised during [context]`
- Do not filter or evaluate — if it was said, log it.

---

## Step 6 — Validate

Before finishing, confirm:

- [ ] `docs/CHANGELOG.md` has a new entry at the top with today's date and the correct version
- [ ] Every file changed this session is named in the changelog
- [ ] **MkDocs Integration**: All new `.md` files are registered in `mkdocs.yml` navigation.
- [ ] `docs/ROADMAP.md` Completed section includes everything just shipped
- [ ] `docs/ROADMAP.md` Suggestion Log has any new ideas from this session
- [ ] No version numbers were skipped in the changelog

---

## Quick reference — Changelog entry template

```markdown
## [2.X.0] - 2026-MM-DD
### Added
- **Phase 27X — Feature Name**: One-sentence description of what this delivers.
    - **Module Name** (`apps/path/to/file.js`): Specific change with operator impact.
    - **Route** (`apps/control-plane/routes/mas.js`): Endpoint name, method, response shape.
    - **Dashboard Panel** (`apps/operator-ui/dashboard/index.html`): What the operator can now see.
```

## Quick reference — Roadmap entry templates

```markdown
<!-- Completed -->
- [v2.6.0] Phase 27A-F: MAS Decision Persistence + Synergy + Drift Panels — 2026-05-20

<!-- Active -->
- Phase 27G: MAS-Aware Waterfall — started 2026-05-20

<!-- Planned -->
- Phase 27H: MAS Routing Heatmap

<!-- Suggestion Log -->
- 2026-05-20 — Per-agent drift breakdown in Drift Panel — raised during Phase 27F implementation
```
