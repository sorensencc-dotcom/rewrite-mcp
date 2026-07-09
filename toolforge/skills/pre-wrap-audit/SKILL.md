# Pre-Wrap-Audit — Session Termination Audit Engine

**Status: ACTIVE**  
**Version: 1.0.0**  
**Category: automation**  
**Owner: Soren**

---

## Purpose

12-point blind-spot assessment before session termination. Returns RED/YELLOW/GREEN verdict for deployment gates.

## Audit Questions (12-Point)

**Core (4 questions):**
1. Are all modified files committed and pushed?
2. Are all TODOs and FIXMEs resolved or documented?
3. Are all tests passing?
4. Have all architectural decisions been recorded?

**Extended (8 additional questions):**
- Memory state coherence
- Drift signal routing
- Dependency completeness
- Risk register updated
- Cross-subsystem impact assessed
- Rollback plan documented
- Stakeholder notification sent
- Next session roadmap ranked

## Verdicts

| Verdict | Meaning | Exit Code | Action |
|---------|---------|-----------|--------|
| 🟢 GREEN | Ready | 0 | Proceed to deployment |
| 🟡 YELLOW | Warnings | 2 | Operator review required |
| 🔴 RED | Blocker | 1 | Block termination |

## Inputs

```
context: PROJECT-CONTEXT (optional)
format: 'json' | 'markdown' | 'summary'
```

## Outputs

```
{
  verdict: "RED" | "YELLOW" | "GREEN",
  blockers: string[],
  risks: string[],
  ready: string[],
  nextSteps: { action, owner, deadline }[],
  coreAnswers: object,
  extendedAnswers: object,
  timestamp: ISO 8601,
  signedOffBy: string
}
```

## Integration

- **Ashfall**: Called during Phase 3 (Audit)
- **Claude Code Hook**: Runs before session termination
- **Drift Engine**: Checks drift signal routing
- **Memory System**: Validates memory coherence

## Exit Codes

- 0: GREEN (proceed)
- 1: RED (block)
- 2: YELLOW (review)

---

See [README.md](README.md) for quick start.
