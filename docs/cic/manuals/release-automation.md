# Release Automation Manual

**Authority**: Antigravity Release Engineering  
**Subsystem**: Release Plane (v2.10.0+)  
**Scope**: Monorepo-wide release synchronization and artifact generation.

---

## 1. Overview

The Rewrite Labs monorepo uses a semi-automated release suite to ensure that code, documentation, and telemetry remain synchronized. This suite extracts metadata from `CHANGELOG.md`, calculates velocity deltas, and packages distribution-ready bundles.

---

## 2. The Release Suite Commands

All commands are executed from the workspace root (`/mnt/c/dev/rewrite-mcp`).

| Command | Purpose | Output |
|---|---|---|
| `npm run doc:drift` | **Guardrail**: Verifies that the current version and changes are documented in `CHANGELOG.md`. | Error code on drift. |
| `npm run release:notes` | **Extraction**: Pulls the latest entry from `CHANGELOG.md` and creates standalone release notes. | `docs/releases/[VERSION].md` |
| `npm run release:diff` | **Analysis**: Compares the new version against the previous one to compute change velocity. | `docs/releases/diff-[VERSION].md` |
| `npm run release:timeline` | **Telemetry**: Updates the historical timeline used by the Operator UI. | `docs/releases/timeline.json` |
| `npm run release:bundle` | **Packaging**: Creates a compressed `.tar.gz` archive of the release artifacts. | `docs/releases/rewrite-mcp-release-[VERSION].tar.gz` |
| `npm run release:full` | **Orchestration**: Runs all the above commands in the correct sequence. | Full release artifact set. |

---

## 3. Workflow: When to Run

### **Phase Completion (Mandatory)**
When a development phase is declared complete:
1.  Update `CHANGELOG.md` with the new version and entries.
2.  Update `ROADMAP.md` (move Active → Completed).
3.  Update `"version"` in `package.json`.
4.  Execute `npm run release:full`.

### **Continuous Integration (Automated)**
On every push to `main`, the GitHub Action `.github/workflows/docs.yml` executes:
1.  `bash scripts/sync-docs.sh` (collects all docs into `docs/`).
2.  `mkdocs build` (generates the static site).
3.  Deploy to Cloudflare Pages.

---

## 4. Troubleshooting Drift

If `npm run doc:drift` fails:
- **Scenario**: "Version mismatch." → Ensure `package.json` and the latest `CHANGELOG.md` header match exactly.
- **Scenario**: "Missing entries." → The tool found code changes that aren't mentioned in the changelog. Add them to the `### Added` or `### Fixed` sections.
