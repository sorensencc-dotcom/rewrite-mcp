# Usage Guide: pre-wrap-audit

## Overview

Blind-spot audit before session wrap. Identifies gaps, risks, and blockers that could lead to deployment failure.

## When to Use

**Required on:**
- `/finish` command (session termination)
- `/pre-wrap-audit` manual trigger
- ASHFALL termination (automatic)

**Optional on:**
- Session timeout (encouraged but not blocking)

## Manual Invocation

```bash
/pre-wrap-audit [--context="Project Context"]
```

Example:
```bash
/pre-wrap-audit --context="Phase 27 Wave F deployment"
```

## Workflow: 12-Point Audit

### Phase 1: Core Blind-Spot Questions (4)

The auditor asks **four critical questions** about gaps, missing context, assumptions, and verification:

1. **What am I least confident about, and why?**
   - Cite specific evidence gap (e.g., "Jest test never ran")
   - Unverified assumptions (e.g., "assumed 90-day retention")
   - Runtime behavior not tested

2. **What am I missing about this situation?**
   - Unexamined substate (dirty repos, untracked files)
   - Stakeholders not consulted
   - Unexplored edge cases

3. **What assumption would most change the recommendation if wrong?**
   - Load-bearing assumption (e.g., "We assume database is stable")
   - If false, entire recommendation breaks
   - Cite what you'd need to verify

4. **What must be verified before acting?**
   - Explicit MUST/SHOULD/NICE-TO-HAVE verification steps
   - Concrete commands or tests
   - Example: "MUST: Run Jest in isolation. SHOULD: Confirm alerting rules."

**Output:** 4 answers, each with specific details.

### Phase 2: Extended Audit Fields (8)

The auditor assesses **eight operational dimensions**:

5. **Dependencies** — External systems (DB, APIs, infrastructure)
   - Are they all online + monitored?
   - What's the failure mode if each goes down?

6. **Regression surface** — What existing code could break?
   - APIs changed? Data schemas changed?
   - Backwards compatibility tested?

7. **Documentation accuracy** — Do docs match what was built?
   - Training guides match actual code?
   - Runbooks match actual ops procedures?
   - Have operators reviewed docs?

8. **Rollback readiness** — Can we undo this if it fails?
   - Backup exists and recent?
   - Procedure tested?
   - Recovery time acceptable?

9. **Known unknowns** — What areas aren't tested?
   - Edge cases not covered?
   - Load testing not done?
   - Concurrency issues not explored?
   - Is it safe to deploy anyway?

10. **Stakeholder alignment** — Did decision-makers know?
    - On-call engineer aware?
    - Product/business approved?
    - Legal/compliance signed off (if needed)?
    - Decision-maker signed off?

11. **Data integrity** — If moving/transforming data, is it validated?
    - Migrations tested on prod-scale data?
    - Corruption detection + recovery working?
    - Backups exist before execution?

12. **Security surface** — Did we introduce vulnerabilities?
    - New auth/authz code reviewed?
    - Input validation complete?
    - Secrets or credentials exposed?

**Output:** 8 assessments, each with checks (✓/✗) and resolution steps.

### Phase 3: Verdict Assessment

Synthesize audit into **RED/YELLOW/GREEN**:

- **RED FLAG** — Critical blockers must be resolved. Deployment blocked.
- **YELLOW FLAG** — Important risks identified. Escalate for decision.
- **GREEN FLAG** — All checks pass or acceptable risk. Proceed.

### Phase 4: Escalation & Storage

- If **RED**: Block session termination. Escalate to engineering lead.
- If **YELLOW**: Prompt user for explicit risk acceptance.
- If **GREEN**: Proceed to ASHFALL termination.

Store audit report in session metadata (`.claude/sessions/[id]/audit-report.json`) for post-mortem if incident occurs.

## Output Format

### Summary (Console)

```
═══════════════════════════════════════════════════════════
AUDIT VERDICT
═══════════════════════════════════════════════════════════

OVERALL: RED

BLOCKERS (RED) — Must resolve:
  ✗ Confidence gap: Jest test never ran. Code unverified.
  ✗ Missing context: Submodule state unknown.

RISKS (YELLOW) — Escalate:
  ⚠ Regression: Backwards compat testing incomplete.
  ⚠ Load testing: Performance under scale not validated.

READY (GREEN) — Verification passes:
  ✓ Documentation matches code.
  ✓ Rollback procedure tested.

NEXT STEPS:
  1. Run Jest in isolation (MUST)
  2. Verify submodule state (MUST)
  3. Run regression tests (SHOULD)

═══════════════════════════════════════════════════════════
```

### JSON Format

```json
{
  "verdict": "RED",
  "blockers": ["..."],
  "risks": ["..."],
  "ready": ["..."],
  "nextSteps": [
    {"action": "Run Jest test", "deadline": "Before canary"}
  ],
  "coreAnswers": {...},
  "extendedAnswers": {...},
  "timestamp": "2026-07-08T15:30:00Z",
  "sessionId": "..."
}
```

### Markdown Format

Full report with all answers, assessment, blockers, risks, ready items, and next steps.

## Integration with ASHFALL

ASHFALL workflow:

```
1. Implementation & Testing
2. Code Review & Gates
3. → PRE-WRAP AUDIT (NEW)
   ├─ Run 12-point audit
   ├─ If RED: Block, escalate
   ├─ If YELLOW: Get acceptance
   ├─ If GREEN: Proceed
4. → ASHFALL
   ├─ Final commit + push
   ├─ Session report
5. → End
```

Before ASHFALL termination, pre-wrap-audit runs automatically.

## Red Flag Examples

Deployment is **blocked** on RED. Examples:

- "Jest test never ran" (unverified code)
- "Submodule state unknown" (deployment state uncertain)
- "Decision-maker not approved" (stakeholder misalignment)
- "Secrets exposed in logs" (security vulnerability)
- "Migration dry-run not complete" (data integrity risk)

## Yellow Flag Examples

Deployment **escalates** on YELLOW. User must explicitly accept. Examples:

- "Backwards compatibility not tested"
- "Load testing incomplete"
- "Documentation may be outdated"
- "Rollback procedure drafted but not tested"
- "Performance under scale not validated"

## Green Flag Examples

Deployment **proceeds** on GREEN:

- All verification steps complete
- No unresolved gaps
- All stakeholders approved
- Tests passing
- Documentation accurate

## Tips for Effective Audits

1. **Be specific.** Don't say "uncertain." Say "Jest test never ran Wave F code."

2. **Link to blockers.** Don't assume. List what would unblock: "MUST: Run test. SHOULD: Verify alerting."

3. **Check assumptions.** Ask: "What if I'm wrong about retention policy?" If wrong, does deployment fail?

4. **Use MUST/SHOULD/NICE-TO-HAVE.** Not all verifications are equal. Mark critical ones.

5. **Default skeptical.** Assume you're missing something. Look for it in the audit.

6. **Store the report.** If incident occurs later, audit shows what was known/unknown.

## Troubleshooting

**Q: Audit is taking too long (> 10 min)**
A: You can skip on timeout, but MUST be thorough on `/finish`. Allocate 10 min for session wrap.

**Q: I disagree with RED verdict**
A: RED blocks deployment intentionally. Fix the blocker or escalate to engineering lead for override.

**Q: Can I change YELLOW to GREEN by saying "accept risk"?**
A: No. User must type full acceptance (e.g., "I accept YELLOW: backwards compat risk"). One-word yes doesn't count.

**Q: What if external systems are unavailable (e.g., Datadog)?**
A: Pre-audit checks systems. If unavailable, auditor documents it. Deployment proceeds if no blocker.

## Success Metrics

- [ ] All 4 core questions answered with specifics
- [ ] All 8 extended fields assessed
- [ ] Explicit MUST/SHOULD/NICE-TO-HAVE steps
- [ ] RED/YELLOW/GREEN verdict
- [ ] Decision-maker aware of RED/YELLOW
- [ ] Audit report stored
- [ ] No RED flags override without escalation

## See Also

- [Framework Details](FRAMEWORK.md)
- [ASHFALL Integration](../README.md)
- [Verdict Logic](../src/verdict.ts)
