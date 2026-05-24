# AGENTS.md — rewrite-mcp Monorepo
# Version: 1.0.0 | Date: 2026-05-23

Multi-tool coordination file. Read this at the start of any session before making changes.
All tools operating in this repo must follow the rules below.

---

## Commit Attribution Convention

Every meaningful commit must carry a tool prefix in the subject line:

```
[claude]  architectural change or PMS/prompt/extractor work
[copilot] code generation, boilerplate, test stubs
[gemini]  research synthesis, seed data, doc generation
[human]   manual edits by Chris
```

Examples:
```
[claude] wire ImageAnalyzerV2 into extractor registry
[copilot] expand vitest coverage for digest module
[gemini] generate seed data for RL domain scan
[human]  bump version in package.json
```

---

## Zone Ownership — Monorepo Root

| Path | Primary | May Assist | Notes |
|------|---------|-----------|-------|
| `apps/cic-pms/src/` | Claude | — | PMS core. No edits without architectural intent. |
| `apps/cic-pms*/src/schema/` | Claude | — | Schema changes require drift test update. |
| `apps/cic-pms*/src/registry/` | Claude | — | Registry interface is contract surface — coordinate. |
| `apps/cic-pms*/tests/` | Copilot | Claude | Stub generation OK; Claude owns test architecture. |
| `apps/control-plane/` | Claude | Copilot | Control plane logic is Claude-primary. |
| `apps/operator-ui/` | Copilot | Claude | UI scaffolding; Claude reviews state/data shape. |
| `docs/` | Gemini | Claude | Research docs and summaries. |
| `site/` | Copilot | Gemini | Static site; no logic here. |
| `cloudflare/` | Claude | Copilot | Worker + KV config — coordinate before deploy changes. |
| `integrations/` | Any | — | Use [tool:X] prefix. No silent changes. |
| `scripts/` | Any | — | Use [tool:X] prefix. |
| `tools/` | Claude | Copilot | Runtime harness and prompt telemetry are Claude-owned. |
| `skills/` | Claude | — | Skill files require YAML frontmatter. Claude-only. |
| `projects/cic/` | See CIC AGENTS.md | — | Governed by separate file. |
| `projects/rl/` | Claude | Copilot | RewriteLabs scan/rewrite engine — Claude primary. |
| `quarantine/` | Any | — | Deprecated code. Do not promote without Claude review. |

---

## Cross-Cutting Rules

1. **No silent interface changes.** If you modify a function signature, export, or module
   contract that another module imports — note it in `HANDOFF.md` before the next session.

2. **No edits to PMS-managed prompts without PMS tooling.**
   `apps/cic-pms*/src/` prompt files are built by the PMS build runner.
   Hand-editing these will cause drift test failures.

3. **Breaking changes require a HANDOFF.md entry.**
   Breaking = changes to public API, exported interfaces, schema shape, or env vars.

4. **Test gate before handoff.**
   Any tool that modifies `src/` must confirm tests pass before committing.
   Failing tests must be flagged in `HANDOFF.md`.

5. **`quarantine/` is a dead zone.**
   Nothing in `quarantine/` should be imported or promoted without explicit Claude review
   and a `[human]` commit acknowledging the decision.

---

## Session Start Checklist (all tools)

```bash
git log --oneline -15          # what changed and who did it
cat HANDOFF.md                 # what the last session left pending
cat AGENTS.md                  # this file — zone reminders
```

---

## Escalate to Human (Chris) When

- A zone conflict can't be resolved by this file
- A breaking change affects more than one app
- Tests are failing at session end and can't be fixed in-session
- A dependency needs to be added or removed from `package.json`
