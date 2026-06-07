# Skill: web-regression

> **Shared model skill** — compatible with Claude, Gemini, and any AI assistant working in this workspace.  
> **When to run**: After every documentation build, UI modification, or before a full release.
> **Verification Script**: `tools/regressions/check-links.sh`

---

## Step 1 — Execute Regression Test

Run the following command from the workspace root:

```bash
bash tools/regressions/check-links.sh
```

---

## Step 2 — Analyze Output

### If Success (100% Verified)
Log the success in the current session context and proceed with the deployment or release.

### If Failure (Broken Links Found)
1.  **Identify Broken Targets**: Locate the `MISSING` markers in the script output.
2.  **Verify Asset Location**: Check if the target file exists on disk but is linked incorrectly (relative path error).
3.  **Check Nav Logic**: If the broken link is in the Global Nav, update `rewrite-mcp/apps/operator-ui/js/global-nav.js`.
4.  **Check Documentation Nav**: If the broken link is in MkDocs, update `rewrite-mcp/mkdocs.yml`.

---

## Step 3 — Remediation & Re-validation

1.  **Surgically Fix**: Correct the paths or remove the broken navigation items.
2.  **Rebuild Docs**: If the change was in MkDocs, rebuild the site:
    ```bash
    cd rewrite-mcp && ./.venv/bin/mkdocs build
    ```
3.  **Re-run Test**: Execute `bash tools/regressions/check-links.sh` again.
4.  **Confirm 100% Pass**: Do not proceed until the test returns `SUCCESS`.

---

## Quick Reference — Common Link Patterns

| Service | Canonical URL |
|---|---|
| Command Center | `/index.html` |
| Control Room | `/control-room.html` |
| Observability | `/dashboard/index.html` |
| Telemetry | `../../tools/prompt-telemetry/dashboard.html` |
| Documentation | `../../site/index.html` |
| Memos | `http://localhost:5230` |
| Research Lab | `http://localhost:8501` |
