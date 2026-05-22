# Skill: doc-update

> **Shared model skill** — compatible with Claude, Gemini, and any AI assistant working in this workspace.  
> **When to run**: After every successful build, phase completion, or source file modification.  
> **Policy reference**: [`docs/DOC_POLICY.md`](../DOC_POLICY.md)

---

## Rules (inline — do not re-read DOC_POLICY.md)

| What shipped | Version bump |
| --- | --- |
| New feature, phase, subsystem | Minor (`X.Y+1.0`) |
| Bugfix, patch, polish | Patch (`X.Y.Z+1`) |
| Breaking API or architecture change | Major (`X+1.0.0`) |

- Every changed file gets its own bullet with a backtick path.
- Entries ordered newest-first. No version skipped.
- Suggestion Log: log every idea raised, even if not agreed upon.

---

## Step 0 — Read the state index (replaces reading CHANGELOG + ROADMAP)

```text
Read docs/DOC_STATE.json
```

Extract:

- `current_version` ← `state.version`
- `changelog_head` ← `state.changelog.headLine`
- `roadmap_completed_head` ← `state.roadmap.completedHead`
- `arch_docs` ← `state.archDocs` (map of file → `{ updatedForVersion, sections }`)

**Fallback** (if DOC_STATE.json is missing or corrupted): Read lines 1–8 of `docs/CHANGELOG.md` only (`limit: 8`) to extract the current version. Do not read the full file.

---

## Step 1 — Compute the next version

Apply the bump rule to `current_version`. Result: `next_version`.

---

## Step 2 — Write the changelog entry

Prepend immediately after the `# Changelog` heading using:

```text
old_string = "# Changelog\n"
new_string = "# Changelog\n\n## [next_version] - YYYY-MM-DD\n\n### Added\n\n- ...\n\n## [current_version]..."
```

> Do NOT read CHANGELOG.md first. The `# Changelog\n` sentinel is always unique. The existing content is preserved verbatim after your insertion.

Entry format:

```markdown
## [2.X.0] - 2026-MM-DD

### Added

- **Feature Name**: One-line summary.
    - **Sub-component** (`path/to/file.ext`): What changed and operator impact.
```

---

## Step 3 — Update the roadmap

### 3a. Move completed work to Completed

Prepend to the Completed list using the cached `roadmap_completed_head` as the anchor:

```text
old_string = "- [vX.Y.Z] {roadmap_completed_head}"
new_string = "- [vNEXT] {new entry}\n- [vX.Y.Z] {roadmap_completed_head}"
```

If the Completed section is empty (no prior entries), read lines 1–25 of `docs/ROADMAP.md` only (`limit: 25`) to find the insertion point.

### 3b–3d. Active / Planned / Suggestion Log

Read lines 1–50 of `docs/ROADMAP.md` only (`limit: 50`). This covers the header through the end of the Active section in all current configurations. Make targeted edits to Active, Planned, and Suggestion Log sections only.

---

## Step 4 — Update architecture docs (skip-if-current)

For each architecture doc that may need updating:

1. **Check `arch_docs[file].updatedForVersion`**. If it equals `current_version` (i.e., the doc was already updated this version), skip it entirely.
2. **Check `arch_docs[file].sections`**. If the relevant section already exists, skip unless you need to modify that section.
3. **When a read is needed**: use Grep to find the target line number, then `Read` with `offset` and `limit` to fetch only the surrounding context (±20 lines). Do not read the full file.
4. **When inserting a new section**: use Grep to find the anchor string, insert via Edit. No full-file read required.

---

## Step 5 — Update DOC_STATE.json

Write `docs/DOC_STATE.json` with the new state. This is the single most important step for future efficiency — it is what makes Step 0 fast next time.

```json
{
  "_note": "Machine-maintained. Updated by skills/doc-update and tools/doc-drift-check.js. Do not hand-edit.",
  "version": "NEXT_VERSION",
  "date": "YYYY-MM-DD",
  "changelog": {
    "headLine": "## [NEXT_VERSION] - YYYY-MM-DD",
    "entryCount": PREV_COUNT + 1
  },
  "roadmap": {
    "lastUpdated": "YYYY-MM-DD",
    "completedHead": "[vNEXT_VERSION] SHORT_DESCRIPTION — YYYY-MM-DD",
    "activeCount": N
  },
  "archDocs": {
    "docs/architecture/telemetry.md": {
      "updatedForVersion": "NEXT_VERSION_IF_TOUCHED_ELSE_PRIOR",
      "sections": ["...all known sections..."]
    }
  }
}
```

Only update `updatedForVersion` and `sections` for files you actually touched this session. Leave others as-is from the prior state.

---

## Step 6 — Validate

- [ ] `docs/CHANGELOG.md` has a new entry at top with today's date and correct version
- [ ] Every file changed this session is named in the changelog
- [ ] `docs/ROADMAP.md` Completed section includes what just shipped
- [ ] `docs/ROADMAP.md` Suggestion Log has any new ideas from this session
- [ ] `docs/DOC_STATE.json` reflects the new version and updated arch doc states
- [ ] No version numbers were skipped in the changelog
