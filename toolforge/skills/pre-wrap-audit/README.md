# pre-wrap-audit

Session wrap audit — 12-point blind-spot assessment before termination.

## Quick Reference

**What:** Structured interview on gaps, risks, assumptions, and verifications.

**When:** Before ASHFALL termination, on every session end (optional on timeout, required on `/finish`).

**Duration:** 5–10 minutes.

**Output:** Audit report + RED/YELLOW/GREEN verdict.

## Verdict Rules

- **RED:** Critical unresolved → blocks deployment
- **YELLOW:** Important gaps or risks → escalate for decision
- **GREEN:** All checks pass or acceptable risk → proceed

## Core Questions (4)

1. **Confidence gap** — What am I least confident about, and why?
2. **Missing context** — What am I missing about this situation?
3. **Assumption risk** — What assumption would most change the recommendation if wrong?
4. **Verification checklist** — What must be verified before acting?

## Extended Fields (8)

1. **Dependencies** (external systems, failure modes)
2. **Regression surface** (what could break)
3. **Documentation accuracy** (guides vs code match)
4. **Rollback readiness** (backup + recovery tested)
5. **Known unknowns** (untested areas, edge cases)
6. **Stakeholder alignment** (approvals, decision-makers)
7. **Data integrity** (migrations tested, backups exist)
8. **Security surface** (auth/authz, input validation, secrets)

## Integration with ASHFALL

```text
Implementation → Tests → PRE-WRAP AUDIT (NEW)
  ├─ Run 12-point audit
  ├─ If RED: Block termination, escalate
  ├─ If YELLOW: Get user acceptance
  ├─ If GREEN: Proceed
→ ASHFALL → Session end
```

See [HARNESS-INTEGRATION.md](docs/HARNESS-INTEGRATION.md) for `/finish` auto-trigger details.

## Manual Usage

```bash
/pre-wrap-audit Phase 27 Wave F deployment
```

## Success Criteria

- [ ] All 4 core questions answered with specific evidence
- [ ] All 8 extended fields assessed
- [ ] Explicit MUST/SHOULD/NICE-TO-HAVE verification steps
- [ ] RED/YELLOW/GREEN verdict produced
- [ ] Decision-maker informed if RED/YELLOW
- [ ] Audit report stored in session metadata

## Known Limitations

- Synchronous (takes 5–10 min, not automatable in < 1 min)
- Requires user input on unknowns
- Some verifications require external systems
- RED flags might require escalation to humans

## Future Enhancements

- Template audit reports per project type
- Auto-check some fields (git status, test coverage)
- CI/CD gate integration (block merge if RED)
- Audit history dashboard
- Post-mortem linking

## See Also

- [Framework Details](docs/FRAMEWORK.md) — 12-point framework with core + extended questions
- [USAGE.md](docs/USAGE.md) — Detailed workflow and verdict rules
- [HARNESS-INTEGRATION.md](docs/HARNESS-INTEGRATION.md) — Claude Code harness integration (`/finish` trigger)
- [EXAMPLES.md](docs/EXAMPLES.md) — Real-world audit examples (RED/YELLOW/GREEN verdicts)
- [OPERATOR-RUNBOOK.md](docs/OPERATOR-RUNBOOK.md) — For on-call team (Chris, operators): RED/YELLOW/GREEN handling, escalation matrix
- [HARNESS-IMPLEMENTATION-GUIDE.md](docs/HARNESS-IMPLEMENTATION-GUIDE.md) — For harness team: TypeScript implementation, test cases, deployment checklist
- [ASHFALL Skill](../ashfall/) — Session termination engine (now calls pre-wrap-audit)
