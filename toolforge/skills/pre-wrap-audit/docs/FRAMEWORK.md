# Enhanced Session Wrap Audit Framework

**Purpose:** Prevent deployment of untested code, missing verification, unshipped docs, or misaligned stakeholders.

**When:** Before ASHFALL termination, every session end. Takes 5–10 min.

## Core Blind-Spot Questions (4)

### Q1: Confidence Gap

**Question:** What am I least confident about, and why?

**What to assess:**
- Specific evidence gap (unverified code, untested scenarios)
- Unexamined assumption (e.g., "assumed 90-day retention")
- Runtime behavior never executed

**Example:**
```
Answer: "Jest test never ran Wave F code. Only TypeScript compilation verified."
Risk: Unexecuted code fails at runtime.
Next: Run Wave F test in isolation.
```

### Q2: Missing Context

**Question:** What am I missing about this situation?

**What to assess:**
- Unexamined substate (dirty repos, untracked files, uncommitted changes)
- Stakeholders not consulted (on-call, product, legal)
- Unexplored edge cases or scenarios

**Example:**
```
Answer: "Submodules show untracked content. Unknown if deployment works."
Risk: Deployment copies wrong state, features don't work as expected.
Next: `cd castironforge/cic-ingestion && git status`
```

### Q3: Assumption Risk

**Question:** What assumption would most change the recommendation if wrong?

**What to assess:**
- Load-bearing assumption (if false, entire recommendation breaks)
- Bet you're unknowingly making (e.g., "assuming database is stable")
- Business requirement you haven't verified (e.g., "90-day retention")

**Example:**
```
Answer: "I assume 90-day retention is correct business requirement."
If false: Prune implementation is wrong (data discarded too early or kept too long).
Impact: Wrong retention policy breaks SLA or wastes storage.
Next: Verify requirement in docs or with product.
```

### Q4: Verification Checklist

**Question:** What must be verified with humans/logs/tests before acting?

**What to assess:**
- Explicit verification steps (not vague)
- MUST (blocks deployment), SHOULD (recommended), NICE-TO-HAVE (nice but optional)
- Concrete commands or tests (not "check X" but "run `npm test`")

**Example:**
```
Answer:
✗ MUST: Jest test run (not done)
✗ MUST: Submodule state checked (not done)
✓ SHOULD: Training reviewed by operator (scheduled)
✗ SHOULD: Alerting rules verified (not done)

Unchecked MUST items → RED flag (blocks deployment)
```

## Extended Audit Fields (8)

### Q5: Dependencies

**Question:** What external systems must be healthy for this to work?

**Check:**
- List all: Database, APIs, infrastructure, third-party services
- Online? (health check)
- Monitored? (alerting, dashboards)
- Failure mode if down? (graceful degradation vs catastrophic failure)

**Example:**
```
Systems: Datadog, Prometheus, load balancer
✓ All online? YES
✓ All monitored? YES
⚠ Failure mode: Canary won't split traffic properly if load balancer down
Next: Verify monitoring alert for load balancer status
```

### Q6: Regression Surface

**Question:** What existing systems could this break?

**Check:**
- APIs changed? (signature, response format)
- Data schemas changed? (migration path, backwards compat)
- Timing guarantees changed? (timeouts, ordering)
- Silent failure modes? (bugs that don't error, just degrade)
- Backwards compatibility tested?

**Example:**
```
Changed: manifest schema (added "cost" field)
⚠ Backwards compat: Old clients won't read "cost", but will they break? (UNKNOWN)
Next: Run integration test with old client version
```

### Q7: Documentation Accuracy

**Question:** Are docs actually correct to what was built?

**Check:**
- Training guides match actual code signatures? (function names, parameters)
- Runbooks match actual ops procedures? (steps, error messages)
- Examples in docs still work?
- Have operators reviewed docs against code?

**Example:**
```
Training guide: "Run `repair-manifest --config=prod.yaml`"
Code signature: `repair-manifest --configFile=prod.yaml` (renamed flag)
⚠ Docs outdated; operator will fail on first run
Next: Have Chris review training guide line-by-line
```

### Q8: Rollback Readiness

**Question:** Can we undo this if it fails?

**Check:**
- Backup exists and is recent? (last run, before deployment)
- Rollback procedure documented?
- Procedure tested? (dry-run, not just theoretical)
- Recovery time acceptable? (can we revert in < X minutes?)
- Backwards compatibility with old version?

**Example:**
```
Backup: Last manifest snapshot from 2026-07-07 18:00 UTC ✓
Procedure: `git revert f7d1a7b` + restart daemon ✓
Tested? Draft only, not rehearsed ✗
Recovery time: Estimated 50 min (decision + prep + exec + verify)
⚠ Not fully tested; schedule rehearsal before canary
```

### Q9: Known Unknowns

**Question:** What do we know we don't know?

**Check:**
- Untested areas (edge cases, error paths)
- Performance under load not validated
- Concurrency issues not explored
- Failure modes not examined
- Safe to deploy anyway, or must investigate?

**Example:**
```
Unknowns:
- Performance with 1000+ concurrent ingestions (not load-tested)
- Behavior under disk space exhaustion (edge case)
- Interaction with quarantine queue when backing up
Severity: Load testing critical; others can wait post-canary
Next: Load test with 1000 concurrent requests before 10% rollout
```

### Q10: Stakeholder Alignment

**Question:** Did everyone who matters know about this?

**Check:**
- On-call engineer aware? (can support on Day 1)
- Product/business approved? (feature matches requirements)
- Legal/compliance signed off? (if applicable)
- Manager/director aware? (escalation path clear)
- Decision-maker signed off? (explicit approval, not assumption)

**Example:**
```
On-call: Chris aware, trained 2026-07-07 ✓
Product: Feature matches spec ✓
Legal: Not applicable (no data handling change)
Director: Not yet informed (!) 
✗ Must notify director before 1% canary
Next: Slack director + attach canary plan
```

### Q11: Data Integrity

**Question:** If this moves/transforms data, is it validated?

**Check:**
- Migrations tested on production-scale data? (not toy dataset)
- Corruption detection + recovery working? (can detect + fix data issues)
- Backups exist before execution? (can recover if something breaks)
- Dry-run completed? (test on staging before prod)
- Data validation after migration? (spot-check results)

**Example:**
```
Schema change: Add "cost" field to manifest
Dry-run: Not completed on prod-scale data (100M+ records)
Backup: Exists from 2026-07-07 ✓
Corruption detection: Implemented ✓
⚠ MUST: Run dry-run on staging with full dataset copy
Next: Stage dry-run to production replica, time execution
```

### Q12: Security Surface

**Question:** Did we introduce vulnerabilities?

**Check:**
- New authentication/authorization code? (reviewed)
- Input validation complete? (all entry points validated)
- Secrets or credentials exposed? (logs, configs, git history)
- New network exposure? (open ports, APIs, webhooks)
- Dependency changes? (are new deps secure)

**Example:**
```
Changes: New API endpoint `/repair-manifest`
Auth: Requires admin token (checked)
Input validation: Manifest ID sanitized ✓
Secrets: None in code or logs ✓
Security review: Not yet done
⚠ Should: Have security team review before canary
Next: Slack security team, attach code diff
```

## Verdict Logic

### RED FLAG (Stop)

Deployment **blocked** if any CRITICAL unresolved:

```
IF (confidence_gap_includes("never ran" OR "unexecuted"))
   THEN RED (code unverified)

IF (missing_context_includes("unknown" AND "deployment"))
   THEN RED (state uncertain)

IF (Q4_includes("MUST" AND NOT "checked"))
   THEN RED (verification incomplete)

IF (stakeholder_alignment == "not signed off")
   THEN RED (decision-maker not approved)

IF (security_includes("secrets exposed" OR "vulnerable"))
   THEN RED (security vulnerability)

IF (data_integrity_includes("corruption" OR "not tested"))
   THEN RED (data risk)
```

**Action:** Block termination, escalate to engineering lead, document blocker.

### YELLOW FLAG (Caution)

Deployment **escalates** if important gaps/risks:

```
IF (regression == "not tested")
   THEN YELLOW (backwards compat unknown)

IF (rollback == "not tested")
   THEN YELLOW (recovery untested)

IF (load_testing == "not done")
   THEN YELLOW (performance unknown)

IF (documentation == "mismatch")
   THEN YELLOW (operators may follow wrong procedure)

IF (known_unknowns > threshold)
   THEN YELLOW (too many unknowns)
```

**Action:** Prompt user for explicit risk acceptance. User types: "I accept YELLOW: [specific risk]"

### GREEN FLAG (Go)

Deployment **proceeds** if:

```
IF (blockers == 0 AND risks_accepted == true)
   THEN GREEN (proceed to ASHFALL)
```

**Action:** Store audit report, proceed to ASHFALL termination.

## Checklist for Audit Conductor

- [ ] Ask all 4 core questions (no skipping)
- [ ] Assess all 8 extended fields (comprehensive, not sampled)
- [ ] Produce explicit MUST/SHOULD/NICE-TO-HAVE steps
- [ ] Identify blockers (RED flags)
- [ ] Identify risks (YELLOW flags)
- [ ] Block deployment on RED
- [ ] Escalate YELLOW for human decision
- [ ] Document audit output in session metadata
- [ ] Store report for post-mortem if incident occurs

## Integration Points

**ASHFALL Skill:**
- Audit runs as penultimate step (before final sign-off)
- If RED: Block termination, escalate
- If YELLOW: Get user acceptance
- If GREEN: Proceed to final commit + push

**Claude Code Harness:**
- On `/finish`: Auto-trigger audit
- On timeout: Optional audit (encouraged)
- Store report in `.claude/sessions/[id]/audit-report.json`

**Post-Mortems:**
- If incident occurs, audit report shows what was known/unknown
- Informs root cause analysis
- Feeds back into audit templates

## See Also

- [pre-wrap-audit Skill](../README.md)
- [USAGE Guide](USAGE.md)
- [Verdict Implementation](../src/verdict.ts)
