# Harness Integration: Auto-Trigger Pre-Wrap Audit on `/finish`

## Overview

When a user types `/finish` in Claude Code, the session should automatically trigger the pre-wrap audit before termination. This document specifies the integration contract.

## Session End Events

### User Command: `/finish`

**When:** User explicitly requests session termination

**Current behavior:** Calls ASHFALL → session ends

**New behavior:** 
1. Trigger pre-wrap-audit
2. If RED: Block termination, show blockers, escalate
3. If YELLOW: Prompt user for acceptance
4. If GREEN: Proceed to ASHFALL → session ends

### System Event: Timeout

**When:** Session context approaches limit or explicit timeout triggered

**Current behavior:** Auto-terminate, may skip ASHFALL

**New behavior:**
1. Optional pre-wrap-audit (encouraged, not required)
2. If audit exists and RED: Block termination
3. Otherwise: Proceed to ASHFALL

## Integration Points

### 1. Harness Session Handler

**Location:** Claude Code internal harness (`.claude/harness/session-end-handler.ts` or equivalent)

**Interface:**

```typescript
async function handleSessionEnd(reason: 'user' | 'timeout' | 'explicit-finish') {
  // If reason is 'explicit-finish' or user requested audit:
  if (reason === 'user' || shouldAudit(session)) {
    const auditReport = await triggerSkill('pre-wrap-audit', {
      sessionId: session.id,
      projectContext: detectProjectContext(),
      interactive: true
    });

    // Display verdict
    if (auditReport.verdict === 'RED') {
      console.error('🛑 RED: Session blocked. Fix blockers and try again.');
      return; // Don't proceed to termination
    }

    if (auditReport.verdict === 'YELLOW') {
      const accepted = await promptUserAcceptance(auditReport.risks);
      if (!accepted) {
        console.warn('⚠️  User declined to accept risks. Session not terminated.');
        return;
      }
    }

    // Store audit in session metadata
    session.metadata.auditReport = auditReport;
  }

  // Proceed to ASHFALL
  await triggerSkill('ashfall', {
    scope: 'full',
    verify: true
  });

  // End session
  session.end();
}
```

### 2. CLI Command Integration

**User command:**

```bash
/finish
```

**Internals:**

- Detects if session has uncommitted changes (git status)
- If yes: Auto-run pre-wrap-audit
- Otherwise: Proceed to ASHFALL

**User command with explicit audit:**

```bash
/pre-wrap-audit Phase 27 Wave F
/finish
```

Or inline:

```bash
/finish --audit --context="Phase 27 Wave F"
```

### 3. Storage

Audit reports stored per session:

```
.claude/sessions/[session-id]/
├── metadata.json
├── audit-report.json         (NEW)
├── transcript.jsonl
└── final-summary.md
```

**Structure:**

```json
{
  "sessionId": "abc123...",
  "verdict": "RED|YELLOW|GREEN",
  "blockers": ["..."],
  "risks": ["..."],
  "ready": ["..."],
  "nextSteps": [{"action": "...", "deadline": "..."}],
  "coreAnswers": {...},
  "extendedAnswers": {...},
  "timestamp": "2026-07-08T15:30:00Z",
  "stored": true
}
```

### 4. Auto-Detection: When to Audit

Audit is automatically triggered if ANY of:

- User types `/finish` (explicit)
- User types `/pre-wrap-audit` (manual)
- Session timeout + uncommitted changes detected
- ASHFALL is about to run (pre-wrap integrated)

Audit is skipped if ALL of:

- Session has no code changes
- No modified files
- No staged commits
- No uncommitted changes

### 5. Error Handling

**RED flag:**
```
🛑 RED FLAG: Pre-wrap audit found critical blockers.

Blockers:
  ✗ Code never executed at runtime
  ✗ Submodule state unknown

Fix these before attempting session wrap:
  → Run Jest in isolation
  → Verify submodule state with `git status`

Session remains open. Type `/finish` again after fixing.
```

**YELLOW flag:**
```
⚠️  YELLOW FLAG: Pre-wrap audit found important risks.

Risks:
  ⚠ Backwards compatibility not tested
  ⚠ Load testing incomplete

Accept these risks? Type: I accept YELLOW: [specific risk]
Example: I accept YELLOW: backwards compatibility untested; will monitor canary
```

**GREEN flag:**
```
✅ GREEN FLAG: Pre-wrap audit passed all checks.

Proceeding to ASHFALL termination...
```

## Implementation Checklist

- [ ] Add pre-wrap-audit skill to toolforge/skills/
- [ ] Update ASHFALL to call pre-wrap-audit (done ✓)
- [ ] Add session-end-handler integration in harness
- [ ] Add storage for audit reports in session metadata
- [ ] Wire `/finish` command to trigger audit
- [ ] Document user-facing UX for verdicts
- [ ] Add tests for audit → ASHFALL flow
- [ ] Add E2E test for `/finish` + audit
- [ ] Rollout plan (Phase 1: behind flag, Phase 2: canary, Phase 3: full)

## Deployment Plan

### Phase 1 (Week 1): Foundation

- Merge pre-wrap-audit skill
- Merge ASHFALL + pre-wrap-audit integration
- Deploy behind feature flag (audit runs, verdict logged but doesn't block)

### Phase 2 (Week 2): Canary

- Enable for 10% of users
- Monitor false positive rate (RED/YELLOW on green deployments)
- Tune verdict logic based on data

### Phase 3 (Week 3): Full Rollout

- Enable for all users
- RED flags block deployment (mandatory fix)
- YELLOW flags require user acceptance

## Rollback Plan

If audit verdict logic has high false positive rate:

1. Disable verdict enforcement (audit runs, only logs)
2. Collect feedback on false positives
3. Refine verdict rules
4. Re-enable

## Metrics to Track

- Audit run frequency (per session)
- Verdict distribution (RED/YELLOW/GREEN %)
- False positive rate (RED on successful deployments)
- Time to fix RED flags (MTTR)
- User acceptance rate on YELLOW
- Post-mortems referencing audit reports

## FAQ

**Q: What if I'm in a hurry and don't want to do the full audit?**
A: Type `--skip-audit` to proceed directly to ASHFALL (not recommended):
```bash
/finish --skip-audit
```
This is logged and flagged for review.

**Q: Can I override RED flags?**
A: Only with explicit escalation:
```bash
/finish --override-red --reason="Stakeholder-approved exception"
```
This requires sign-off from engineering lead.

**Q: How long does audit take?**
A: 5–10 minutes typically. You can pause at any time and resume later.

**Q: What if an external system is unavailable (e.g., security team)?**
A: Audit documents it. Deployment proceeds if no blocker. Escalate manually if needed.

## See Also

- [pre-wrap-audit Skill](../README.md)
- [USAGE Guide](USAGE.md)
- [Framework Details](FRAMEWORK.md)
- [ASHFALL Skill](../ashfall/README.md)
- [Examples](EXAMPLES.md)
