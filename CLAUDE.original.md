# CLAUDE.md — rewrite-mcp
# Version: 1.0.0 | Date: 2026-05-23

Operator instructions for all AI tools working in this repo.

---

## Commit Attribution Convention

Every commit subject line must carry a tool prefix:

```
[claude]  — architectural decisions, PMS/prompt/extractor/LLM work
[copilot] — code generation, test stubs, boilerplate
[gemini]  — research synthesis, seed data, doc generation
[human]   — manual edits by Chris
```

No prefix = rejected at review. When in doubt, use `[human]`.

---

## Session Protocol

1. Read `AGENTS.md` before touching any file
2. Read `HANDOFF.md` to pick up from the last session
3. Run `git log --oneline -15` to orient on recent changes
4. Update `HANDOFF.md` at end of session before committing

---

## Output Standards

- Deterministic, modular, implementation-ready
- Full drop-in files with clean namespaces
- Operator-grade error handling — zero silent failures
- No fluff, no repeated conclusions

---

## Zone Ownership

See `AGENTS.md` at repo root and `projects/cic/ingestion/AGENTS.md` for
path-level ownership rules. Do not bypass zone ownership without a
`[human]` commit acknowledging the exception.

---

## Non-Negotiables

- Never edit `.env` or `secrets.md`
- Never hand-edit PMS-managed prompt files
- Never commit with failing tests without flagging in HANDOFF.md
- Never register/deregister extractors without Claude review
