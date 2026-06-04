# Skill: docs-sync-release

> **Shared model skill** — compatible with Claude, Gemini, and any AI assistant working in this workspace.  
> **When to run**: After completing MEE evolutionary phases, modifying core specifications, or performing pre-release documentation builds.
> **Verification Scripts**: `tools/cic-ui/*` validation suite and `scripts/sync-docs.sh` build script.

---

## Step 1 — Sync & Update Documentation

1.  **Update Roadmap**: Reflect phase completion and plan next ascent checks in `docs/cic/CIC_MASTER_ROADMAP.md`.
2.  **Update Project State**: Refresh system versions, test integrity counts, and component ledger rows in `docs/cic/CIC_PROJECT_STATE.md`.
3.  **Update System Specifications**: Detail the architectures, data flows, and guarantees of any newly implemented components in `docs/cic/CIC_SYSTEM.md`.

---

## Step 2 — Run UI Release Validation Suite

Execute the following commands from the workspace root to verify UI compilation, integrity, and snapshots:

```bash
# 1. Check UI layer stability and file imports
npm run cic-ui:sentinel

# 2. Verify monorepo package imports and style assets
npm run cic-ui:validate

# 3. Execute UI layout and navigation smoke tests
npm run cic-ui:smoke

# 4. Assert assets match the golden master snapshot
npm run cic-ui:snapshot -- verify
```

All validation steps **MUST** return `PASS` or `SUCCESS` before moving to documentation compilation.

---

## Step 3 — Compile Documentation & Verify Links

1.  **Build MkDocs**: Run the compiler script to build the static documentation site:
    ```bash
    npm run build-docs
    ```
2.  **Verify Internal Links**: Ensure the link-checking script returns success with zero broken internal targets.

---

## Step 4 — Execute Release Packaging & Archiving

1.  **Run Full Release Suite**: Execute the release synchronization scripts (notes extraction, velocity diffs, timeline updates):
    ```bash
    npm run release:full
    ```
2.  **Compress Documentation Archive**: Package all system-facing and operator-facing docs into a tarball from the workspace root:
    ```bash
    tar -czf docs-backup.tar.gz \
      rewrite-mcp/docs \
      rewrite-mcp/projects/cic/docs \
      CIP/RewriteLabs/rewrite-mcp/docs
    ```
3.  **Confirm Artifacts**: Verify that `docs-backup.tar.gz` and distribution release bundles exist in the workspace root.
