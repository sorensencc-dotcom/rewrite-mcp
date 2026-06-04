# CLAUDE.md — rewrite-mcp
# Version: 1.0.0 | Date: 2026-05-23

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

## Non-Negotiables

- Never edit `.env` or `secrets.md`
- Never hand-edit PMS-managed prompt files
- Never commit with failing tests without flagging in HANDOFF.md
- Never register/deregister extractors without Claude review