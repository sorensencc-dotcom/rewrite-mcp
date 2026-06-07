# CLAUDE.md — rewrite-mcp
# Version: 1.1.0 | Date: 2026-06-06

Operator instructions for AI tools in repo.

---

## Commit Attribution Convention

Commit subject lines must carry tool prefix:

```
[claude]  — architectural decisions, PMS/prompt/extractor/LLM work
[copilot] — code generation, test stubs, boilerplate
[gemini]  — research synthesis, seed data, doc generation
[human]   — manual edits by Chris
```

No prefix = rejected. When in doubt, use `[human]`.

---

## Session Protocol

1. Read `AGENTS.md` before touch files
2. Read `HANDOFF.md` pick up from last session
3. Run `git log --oneline -15` orient on recent changes
4. Update `HANDOFF.md` end of session before commit

---

## Output Standards

- Deterministic, modular, implementation-ready
- Full drop-in files, clean namespaces
- Operator-grade error handling — zero silent failures
- No fluff, no conclusions

---

## Zone Ownership

See `AGENTS.md` at repo root and `projects/cic/ingestion/AGENTS.md` for path-level ownership rules. Do not bypass zone ownership without `[human]` commit acknowledging exception.

---

## Skills & MCP Integration (Phase 44.1)

13 skills are deployed as MCP tools in Claude Code via `skills-runtime`. Available tools:

| Tool | Skill | Purpose |
| --- | --- | --- |
| `summarize_cic_phase` | cic-section-summarizer | Summarize CIC phase progress |
| `detect_agent_drift` | agent-drift-detector | Detect schema mismatches |
| `orchestrate_rl_pipeline` | rewrite-labs-orchestrator | Monitor RL pipeline |
| `diagnose_environment` | environment-diagnostics | Debug environment issues |
| `manage_session_boundary` | session-boundary-manager | Check context overflow |
| `update_cic_roadmap` | cic-roadmap-updater | Auto-update roadmap |
| `generate_procedure` | operator-grade-procedures | Generate runbooks |
| `detect_web_regression` | web-regression | Find UI regressions |
| `capture_research` | research-capture | Structure research findings |
| `update_treatment` | treatment-update | Update treatment config |
| `update_documentation` | doc-update | Update project docs |
| `sync_docs_release` | docs-sync-release | Release docs updates |
| `audit_approvals` | approvals-audit | Audit workflows |
| `session_wrap` | session-wrap | Wrap up session: update docs, commit, summarize |

**Usage:** Ask Claude in Claude Code to invoke tools by name (e.g., "Use the summarize_cic_phase tool to...").

**Implementation:** See `SKILLS_LIBRARY.md`, `SKILLS_API_REFERENCE.md`, and `skills-runtime/` directory.

---

## Non-Negotiables

- Never edit `.env` or `secrets.md`
- Never hand-edit PMS-managed prompt files
- Never commit with failing tests without flagging in HANDOFF.md
- Never register/deregister extractors without Claude review