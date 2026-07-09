# Examples: pre-wrap-audit

## Example 1: Phase 27 Wave F Deployment (RED Verdict)

**Context:** Shipping Wave F ingestion gate + documentation. Jest test infrastructure broken, submodule state unknown.

**Audit Input:**

```
Q1 (Confidence): "Jest test never ran Wave F code. Only TypeScript compilation verified."
Q2 (Missing): "Submodules show untracked content. Unknown if deployment works correctly."
Q3 (Assumption): "I assume 90-day retention is correct. If it's 60 or 180, prune is wrong."
Q4 (Verification):
  ✗ MUST: Jest test isolated (not run yet)
  ✗ MUST: Submodule state verified (not checked)
  ✓ SHOULD: Training reviewed by operator (scheduled)
  ✗ SHOULD: Alerting rules verified (not done)

Q5 (Dependencies): "Datadog, Prometheus, load balancer all online. Monitored."
Q6 (Regression): "No breaking API changes. Backwards compat OK."
Q7 (Documentation): "Docs match code. Training guide reviewed by Chris."
Q8 (Rollback): "Procedure drafted but not rehearsed. Recovery time ~50 min."
Q9 (Unknowns): "Load testing not done. Edge cases around quarantine queue untested."
Q10 (Stakeholders): "All approved. Director aware."
Q11 (Data): "No migrations. Manifest schema clean."
Q12 (Security): "No new auth code. All input validated."
```

**Verdict:**

```
OVERALL: RED

BLOCKERS (must resolve):
  ✗ Confidence gap: Code unexecuted at runtime (Jest test never ran)
  ✗ Missing context: Submodule state unknown (affects deployment)
  ✗ Verification: MUST check — submodule state + test isolation

RISKS (escalate):
  ⚠ Assumption: 90-day retention. If false, prune is broken.
  ⚠ Unknowns: Load testing not done. Performance at scale unknown.
  ⚠ Rollback: Not rehearsed.

NEXT STEPS:
  1. Run Jest in isolation (MUST) — before canary
  2. Verify submodule state (MUST) — immediately
  3. Verify 90-day retention in product docs (SHOULD) — before rollout
  4. Load test with 1000+ concurrent requests (SHOULD) — Day 1 of canary
  5. Rehearse rollback (SHOULD) — before 10% traffic

SIGNED OFF: Not approved until blockers resolved.
```

**Action:** Block session termination. Escalate to engineering lead.

---

## Example 2: Feature Refactor (YELLOW Verdict)

**Context:** Refactored API layer, no breaking changes intended, tests passing.

**Audit Input:**

```
Q1 (Confidence): "All code paths tested. No confidence gaps."
Q2 (Missing): "No missing context. All stakeholders aware."
Q3 (Assumption): "Assuming backwards compatibility maintained."
Q4 (Verification):
  ✓ MUST: Unit tests 100% pass
  ✓ MUST: E2E tests pass
  ✓ SHOULD: Code reviewed by 2 engineers
  ✗ SHOULD: Load test run on new code

Q5 (Dependencies): "No new dependencies. All existing systems healthy."
Q6 (Regression): "API signatures unchanged. Backwards compat test passed."
Q7 (Documentation): "API docs updated. Examples work."
Q8 (Rollback): "Backup exists. Rollback tested. Recovery ~10 min."
Q9 (Unknowns): "No untested edge cases. Performance at scale not re-validated."
Q10 (Stakeholders): "All approved."
Q11 (Data): "No migrations."
Q12 (Security): "No security changes."
```

**Verdict:**

```
OVERALL: YELLOW

BLOCKERS: None

RISKS (user must accept):
  ⚠ Unknowns: Performance at scale not re-validated. If refactor introduced 
     inefficiency, latency may degrade under load.

READY:
  ✓ All tests passing
  ✓ Backwards compat verified
  ✓ Rollback tested
  ✓ Documentation updated

NEXT STEPS:
  1. Monitor latency in canary (first 4 hours)
  2. Run perf test if latency increases > 10%

ACTION REQUIRED: User must type explicit acceptance.
User types: "I accept YELLOW: Performance regression risk in canary"
Then proceeds to ASHFALL.
```

**Action:** Prompt user for explicit risk acceptance.

---

## Example 3: Bug Fix (GREEN Verdict)

**Context:** Fixed race condition in auth middleware. Minimal change, well-tested.

**Audit Input:**

```
Q1 (Confidence): "Code thoroughly tested. All paths covered."
Q2 (Missing): "No context gaps. All related areas examined."
Q3 (Assumption): "No load-bearing assumptions."
Q4 (Verification):
  ✓ MUST: Root cause identified and fixed
  ✓ MUST: Regression test added
  ✓ MUST: Fix doesn't break existing tests
  ✓ SHOULD: Code reviewed by auth expert
  ✓ NICE: Load test confirms fix improves throughput

Q5 (Dependencies): "No new dependencies. All existing systems healthy."
Q6 (Regression): "No API changes. Backwards compat verified."
Q7 (Documentation): "Code comment explains race condition fix."
Q8 (Rollback): "Rollback trivial (revert single commit). Recovery < 2 min."
Q9 (Unknowns): "All known areas examined. No unknowns."
Q10 (Stakeholders): "All aware. On-call engineer ready."
Q11 (Data): "No migrations."
Q12 (Security): "No security changes. No new input paths."
```

**Verdict:**

```
OVERALL: GREEN

BLOCKERS: None

RISKS: None

READY:
  ✓ Root cause fixed + regression test added
  ✓ All tests passing (includes 2 new race condition tests)
  ✓ Backwards compatible
  ✓ Rollback trivial
  ✓ No unknowns
  ✓ All stakeholders aligned
  ✓ On-call engineer trained

ACTION REQUIRED: None. Proceed to ASHFALL.
```

**Action:** Store audit report, proceed directly to ASHFALL + deployment.

---

## Example 4: Data Migration (YELLOW → RED)

**Context:** Adding "cost" field to manifest schema. Dry-run incomplete.

**Audit Input:**

```
Q1 (Confidence): "Schema change is clear. Dry-run not yet complete."
Q2 (Missing): "No context gaps."
Q3 (Assumption): "Assuming dry-run will complete without data loss."
Q4 (Verification):
  ✓ MUST: Migration script tested
  ✗ MUST: Dry-run on prod-scale data (not done)
  ✗ MUST: Validation query confirmed after migration (not done)
  ✓ SHOULD: Backup taken

Q5 (Dependencies): "Database healthy. Backups working."
Q6 (Regression): "No API changes. Additive field only."
Q7 (Documentation): "Docs match schema change."
Q8 (Rollback): "Backup exists. Can restore. Recovery ~1 hour."
Q9 (Unknowns): "No unknowns."
Q10 (Stakeholders): "All approved."
Q11 (Data): 
  ✗ Dry-run: Not completed on prod-scale dataset
  ✗ Validation: Post-migration check not confirmed
  ✓ Backup: Exists from 2026-07-08 00:00 UTC
Q12 (Security): "No security changes."
```

**Verdict:**

```
OVERALL: RED

BLOCKERS (must resolve):
  ✗ Data integrity: Dry-run not completed on production-scale data.
     Risk: Unexpected behavior (e.g., timeout, index issues, data loss)
     without rehearsal on real dataset.
  ✗ Data integrity: Post-migration validation not confirmed.
     Risk: Migration completes without detecting silent corruption.

NEXT STEPS:
  1. Run dry-run on staging replica of production (100M+ records)
     Time execution. Confirm completion < 30 min.
  2. Verify validation query detects corruption (if intentionally corrupt)
  3. Confirm rollback from backup works

SIGNED OFF: Not approved until dry-run + validation complete.
```

**Action:** Block deployment. Require dry-run before canary.

---

## Example 5: Complex Feature with Partial Testing (YELLOW Verdict)

**Context:** New dashboard component. Unit tests pass, E2E on happy path pass, stress not tested.

**Audit Input:**

```
Q1 (Confidence): "Happy path well-tested. Edge cases not exercised."
Q2 (Missing): "Unknown if component works under network latency. Untested."
Q3 (Assumption): "Assuming network timeout gracefully degrades. Not verified."
Q4 (Verification):
  ✓ MUST: Unit tests pass
  ✓ MUST: E2E happy path pass
  ✗ MUST: Stress test at 10K concurrent users (not done)
  ⚠ SHOULD: Network latency simulation tested (only on localhost)

Q5 (Dependencies): "API server, database, cache all healthy."
Q6 (Regression): "New component isolated. No regression risk."
Q7 (Documentation): "Component docs match implementation."
Q8 (Rollback): "Rollback simple (revert feature flag). < 5 min."
Q9 (Unknowns): 
  - Performance at scale unknown
  - Behavior under degraded network unknown
  - Database query behavior under 100K concurrent loads unknown
Q10 (Stakeholders): "All approved. Product aware."
Q11 (Data): "No data changes."
Q12 (Security): "Component has input validation. CSRF token enforced."
```

**Verdict:**

```
OVERALL: YELLOW

BLOCKERS: None

RISKS (user must accept):
  ⚠ Known unknowns: Performance at scale not validated. Stress test not run.
     Risk: Component may timeout or degrade under production load.
  ⚠ Assumption: Network timeout handling not verified under simulated latency.
     Risk: User experience may be poor if network slow.

READY:
  ✓ Unit + E2E happy path passing
  ✓ No regression risk
  ✓ Input validation enforced
  ✓ Rollback simple

NEXT STEPS:
  1. Monitor component latency in canary (1% → 10% → 100%)
  2. If p99 latency > threshold, investigate + optimize
  3. If timeouts occur, escalate to on-call

ACTION REQUIRED: User accepts YELLOW risks in canary.
```

**Action:** Prompt user for explicit acceptance. Proceed with 1% canary + heightened monitoring.

---

## Example 6: Security Review Pending (RED Verdict)

**Context:** New API endpoint for sensitive operation. Code review done, security review not.

**Audit Input:**

```
Q1 (Confidence): "Code review complete. Security review pending."
Q2 (Missing): "No context gaps."
Q3 (Assumption): "Assuming no auth bypass. Not verified by security team."
Q4 (Verification):
  ✓ MUST: Code review done
  ✗ MUST: Security review done (not yet)

Q12 (Security):
  ✗ New authentication code? Yes, but not security-reviewed.
  ✗ Input validation complete? Assumed, not verified by sec team.
  - Secrets exposed? No.
```

**Verdict:**

```
OVERALL: RED

BLOCKERS:
  ✗ Security surface: New auth code not reviewed by security team.
     Risk: Auth bypass, privilege escalation, data exposure.

NEXT STEPS:
  1. Schedule security review (MUST)
  2. Address security feedback before canary

SIGNED OFF: Not approved until security review complete.
```

**Action:** Block deployment. Require security team sign-off.

---

## Summary: Verdict Patterns

| Verdict | Blockers | Risks | Action |
|---------|----------|-------|--------|
| **RED** | 1+ | N/A | Block deployment. Fix blocker. Re-audit. |
| **YELLOW** | 0 | 1+ | Escalate. Get user acceptance. Monitor. |
| **GREEN** | 0 | 0 | Proceed to ASHFALL. Deploy normally. |

