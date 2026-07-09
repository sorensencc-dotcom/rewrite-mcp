# Operator Runbook: Pre-Wrap Audit Verdicts & Escalation

Quick reference for operators (Chris, on-call team) handling RED/YELLOW/GREEN audit verdicts.

## Flow Chart

```
User types /finish
    ↓
Pre-wrap-audit runs (12 questions)
    ↓
    ├─ RED? → BLOCK. Show blockers. Escalate to SRE lead.
    ├─ YELLOW? → ESCALATE. Prompt user for explicit risk acceptance.
    └─ GREEN? → PROCEED. Session ends normally.
```

---

## RED FLAG SCENARIOS & FIXES

### Blocker: Code Never Executed

**Symptom:** Jest/unit tests never ran. Code path untested.

**Example verdict text:**
```
Code path never executed at runtime. Jest suite incomplete or never run.
```

**User action:**
```bash
npm test -- --testPathPattern="path/to/test"
# Verify: PASS or coverage gap?
# If PASS: re-run /pre-wrap-audit
```

**Escalation:** If tests fail, assign to dev team. Block session until PASS.

---

### Blocker: Submodule State Unknown

**Symptom:** Submodule dirty, detached HEAD, or not updated.

**Example verdict text:**
```
Submodule in unknown state. Git status shows 'm castironforge/cic-ingestion'.
```

**User action:**
```bash
git status
git submodule update --init
git submodule foreach git pull origin main
# OR if intentional:
git add castironforge/cic-ingestion
git commit -m "chore: Update submodule"
# Then re-run /pre-wrap-audit
```

**Escalation:** If submodule truly unknown (detached HEAD), escalate to infra team. Block session.

---

### Blocker: Credentials Exposed

**Symptom:** Audit detects secrets in code, .env, or git history.

**Example verdict text:**
```
Credentials found in staged files: API_KEY, DATABASE_PASSWORD.
```

**User action:**
```bash
# Check staged files
git diff --cached
# Remove secrets
rm .env  # or remove from file
git reset HEAD .env
git add [clean-files-only]
# Re-run audit
```

**Escalation:** If secrets already pushed, escalate to security team IMMEDIATELY. Revoke keys.

---

### Blocker: Stakeholder Not Approved

**Symptom:** Feature/change requires sign-off but not obtained.

**Example verdict text:**
```
Feature requires stakeholder approval (legal, compliance, product). Not confirmed.
```

**User action:**
```
Contact stakeholder. Get written approval (Slack, email, Jira comment).
Provide approval link in audit response:
  "Product approved: [Slack link] / [Jira link]"
Re-run /pre-wrap-audit
```

**Escalation:** If stakeholder unavailable, escalate to project lead. Decision required.

---

### Blocker: Data Risk (No Backup / Corruption Possible)

**Symptom:** Migration or data change without tested backup/rollback.

**Example verdict text:**
```
Data migration has no dry-run. Rollback untested. Corruption risk.
```

**User action (for migration):**
```bash
# 1. Create backup
pg_dump -h [host] -U [user] [db] > backup-$(date +%Y%m%d).sql

# 2. Test migration on copy
createdb [db-copy]
psql [db-copy] < backup.sql
# Run migration on copy
psql [db-copy] < migration.sql

# 3. Verify data integrity
# Run validation queries
SELECT COUNT(*) FROM [table];  # Row count unchanged?
SELECT * FROM [table] WHERE [id] = [sample];  # Data correct?

# 4. Document rollback plan
# Record: backup location, restore command, expected time

# Re-run audit with evidence
/pre-wrap-audit --context="Backup: [location]. Dry-run: PASS. Restore time: 5min"
```

**Escalation:** If backup missing or corrupt, block session. Escalate to DBA.

---

## YELLOW FLAG SCENARIOS & ACCEPTANCE

### Risk: Regression Not Tested

**Symptom:** Code change might break existing features. Backwards-compat untested.

**Example verdict text:**
```
Regression testing incomplete. Affected APIs: /api/v1/users, /api/v1/auth.
```

**Operator action:** Prompt user:
```
⚠️  YELLOW: Backwards compatibility not tested for /api/v1/users.

Accept this risk? Type:
  I accept YELLOW: backwards compatibility untested; will monitor canary
```

**User must type exact phrase.** Log acceptance. Proceed to ASHFALL.

**Post-session:** Monitor canary metrics. Alert on errors.

---

### Risk: Load Testing Incomplete

**Symptom:** Feature untested under load. Performance unknown.

**Example verdict text:**
```
Load test pending. Expected TPS: 1000. Stress test: not run.
```

**Operator action:** Prompt user:
```
⚠️  YELLOW: Load testing incomplete. Unknown behavior at 1000 TPS.

Accept this risk? Type:
  I accept YELLOW: load untested; will run in staging before prod
```

**Post-session:** Schedule load test in staging. Block prod deploy until PASS.

---

### Risk: Documentation Mismatch

**Symptom:** Code changed, docs not updated. Maintenance risk.

**Example verdict text:**
```
API contract changed. README.md still documents old behavior.
```

**Operator action:** Prompt user:
```
⚠️  YELLOW: Documentation outdated. README describes old API signature.

Accept this risk? Type:
  I accept YELLOW: docs out of sync; will update in follow-up PR
```

**Post-session:** Track in tickets. Verify docs updated in next PR.

---

### Risk: Too Many Unknowns

**Symptom:** Multiple unverified assumptions or untested code paths.

**Example verdict text:**
```
5+ unknowns: submodule drift, load behavior, integration points unclear.
```

**Operator action:** Escalate to tech lead. Suggest:
- Break into smaller PRs
- Add explicit verification steps
- Re-run audit after resolving unknowns

---

## GREEN FLAG: PROCEED

**Symptom:** All checks pass. No blockers, risks acceptable.

**Operator action:**
```
✅ GREEN: Session ready for termination.
Proceed to ASHFALL → session ends.
```

Log: Session clean, audit PASS, time to deploy: [X min].

---

## Escalation Matrix

| Scenario | Owner | Action | Timeline |
|----------|-------|--------|----------|
| Jest/tests FAIL | Dev team | Fix tests, re-audit | 1–4 hours |
| Submodule detached | Infra team | Update/reset submodule | 30 min |
| Credentials exposed | Security team | Revoke keys, review git history | URGENT (15 min) |
| Stakeholder missing | Project lead | Get approval, document | 24 hours |
| Data migration risky | DBA | Backup/dry-run, test restore | 2–4 hours |
| Load untested | Perf team | Schedule load test | Schedule for staging |
| Docs out of sync | Dev team | Update docs | Next PR (tracked) |
| Multiple unknowns | Tech lead | Refactor scope, smaller PRs | Reassess risk |

---

## Common Phrases for Users

When prompting users to accept YELLOW risks, use these templates:

**Regression untested:**
```
I accept YELLOW: backwards compatibility untested; will monitor canary for [X days]
```

**Load untested:**
```
I accept YELLOW: load testing pending; will run staging test before prod deploy
```

**Documentation drift:**
```
I accept YELLOW: docs out of sync; will update in follow-up PR within [X days]
```

**Assumptions unchecked:**
```
I accept YELLOW: [assumption]; verified by [method] on [date]
```

**Data risk:**
```
I accept YELLOW: data migration untested; backup exists at [location], restore time [X min]
```

---

## Verdicts in Metrics

Track & report daily:

- **RED count:** Issues blocking deployment
- **YELLOW count:** Risks accepted by users
- **GREEN count:** Clean deployments
- **Avg RED resolution time:** How long to fix blockers
- **Avg YELLOW acceptance:** Do users accept risks?
- **False positive rate:** RED on actually-good deployments

Report weekly to infra lead.

---

## FAQ for Operators

**Q: User skips audit with `--skip-audit`. What do I do?**
A: Log it. Escalate to tech lead. Audit skip is a risk signal.

**Q: User wants to override RED. Can they?**
A: Only with explicit escalation & sign-off:
```
/finish --override-red --reason="Stakeholder-approved exception: [link]"
```
Requires engineering lead sign-off. Log & escalate.

**Q: Audit takes 10 minutes. Session timeout approaches. What do I do?**
A: Allow user to pause & resume. Store partial answers. Re-run on `/finish`.

**Q: External system unavailable (e.g., security team can't review). What do I do?**
A: Document it. Proceed if no blocker. Escalate manually to lead if risk.

**Q: User claims RED is wrong (false positive). What do I do?**
A: Log claim + evidence. Collect feedback. Report to Phase 27 retrospective. May need verdict-rule refinement.

---

## Training Checklist (For Chris & On-Call)

- [ ] Read this runbook (10 min)
- [ ] Review EXAMPLES.md (6 real verdicts) (15 min)
- [ ] Walk through 1 RED scenario (fix + re-audit) (20 min)
- [ ] Walk through 1 YELLOW scenario (user acceptance) (15 min)
- [ ] Practice escalation matrix (who to call, when) (10 min)
- [ ] Test audit locally: `/pre-wrap-audit Phase 27 Wave F` (5 min)
- [ ] **Total: ~75 min training**

---

## See Also

- [EXAMPLES.md](EXAMPLES.md) — 6 real audit verdicts
- [USAGE.md](USAGE.md) — Detailed audit workflow
- [FRAMEWORK.md](FRAMEWORK.md) — 12-point assessment details
- [pre-wrap-audit README](../README.md) — Quick reference
