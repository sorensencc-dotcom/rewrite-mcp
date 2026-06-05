# Suggested New Skills
## Based on Repo Activity Analysis
## v1.0.0 | 2026-06-05

This document details 7 new skills recommended based on recent commits, HANDOFF.md activity, and identified operational patterns.

---

## Background

**Analysis period:** June 2026 (last 7 days)
**Commits reviewed:** 50+ commits
**Key files:** HANDOFF.md, git log, AGENTS.md
**Observation:** Automation gaps in MEE execution, benchmarking, environment validation, and task completion

---

## 1. mee-phase-executor

### Purpose
Execute MEE (Meta-Evolution Engine) phases 43–45 deterministically, with state tracking, validation, and observability.

### Why Build This?

**Evidence from HANDOFF.md:**
```
Phase 43 (APG): Autonomous Phase Generation
Phase 44 (AAR): Architecture Refactoring
Phase 45 (ACE): Capability Expansion

Current state: Manual execution via npm scripts
Pain point: Long-running; no state recovery; hard to debug
```

**Observation:**
Phases 43–45 are complex multi-stage engines. Manual npm script invocation is error-prone, offers no resumability, and lacks progress visibility.

### Proposed Interface

```bash
# Execute with state tracking
mee-phase-executor \
  --phase=43 \
  --environment="projects/cic/ingestion" \
  --state-file="data/mee-state/phase-43.json"

# Output:
{
  "phase": 43,
  "status": "running",
  "stage": 2,
  "progress": 0.35,
  "eta": "45m",
  "checkpoints": [
    { "stage": 1, "status": "complete", "duration": "12m" },
    { "stage": 2, "status": "running", "current_task": "generate-specs" }
  ]
}
```

### Key Features
- Resumable execution (persist state between sessions)
- Multi-stage progress tracking
- Automatic error recovery with fallback strategies
- State validation (detect corruption)
- Detailed logging (trace all decisions)

### Implementation Notes
- Build on existing `MeePhaseGeneratorEngine.ts` and related code
- Use file-based state persistence (JSON checkpoints)
- Integrate with observability middleware
- Support dry-run mode (show what would execute, no side effects)

### Priority
**High** — MEE phases are critical infrastructure; deterministic execution enables reliable automation.

---

## 2. cic-benchmark-runner

### Purpose
Automate Rewrite Labs benchmark pipeline: capture → extract metadata → run A/B comparison → generate report.

### Why Build This?

**Evidence from HANDOFF.md:**
```
Benchmark Execution: blocked (insufficient API credits)
Current flow:
  1. npm run bench:capture (fetch HTML)
  2. npm run bench:metadata (extract)
  3. npm run bench:opus-sonnet (A/B)
  4. Manual report generation

Pain point: API credit tracking, resumable runs, cost reporting
```

**Observation:**
Benchmark pipeline is multi-step but fragile. No cost tracking, no resumability, no credit-limit handling.

### Proposed Interface

```bash
# Run full benchmark with cost tracking
cic-benchmark-runner \
  --mode=full \
  --sites="hvac_fl,hvac_us,dentist_fl,..." \
  --models="opus-sonnet" \
  --track-costs

# Output:
{
  "benchmark_id": "2026-06-05-001",
  "sites_processed": 12,
  "sites_failed": 0,
  "cost": {
    "api_calls": 42,
    "estimated_cost_usd": 3.42,
    "credit_balance_remaining": 15.78
  },
  "results": {
    "hvac_fl": { "opus_score": 8.2, "sonnet_score": 7.9 },
    // ...
  },
  "report_path": "benchmarks/reports/2026-06-05-001.html"
}
```

### Key Features
- Cost tracking per site, per model
- Credit balance checking before execution
- Resumable runs (cache partial results)
- Multi-model A/B comparison
- HTML report generation
- Metadata extraction integration

### Implementation Notes
- Wrap existing `npm run bench:*` scripts
- Add cost estimation using Claude API pricing
- Implement checkpoint saving (allow resume)
- Generate HTML comparison reports
- Store results in `benchmarks/out/`

### Priority
**High** — Benchmark pipeline is actively used; automation removes manual steps and error-prone credit management.

---

## 3. environment-validator

### Purpose
Quick environment health check (separate from deep diagnostics); ideal for session startup.

### Why Build This?

**Evidence from HANDOFF.md:**
```
Environment Diagnostics: Comprehensive (deep analysis)
Current pain point: Takes 30–60 seconds for full run
Session startup: Operators want <5s check for obvious issues
```

**Observation:**
`environment-diagnostics` is thorough but slow. Operators want a fast "smoke test" at session start.

### Proposed Interface

```bash
# Quick health check
environment-validator --fast

# Output (takes <2 seconds):
{
  "health": "ok",
  "issues_found": 0,
  "mcp_servers": 3,
  "mcp_healthy": 3,
  "claude_desktop": "ok",
  "git_status": "clean",
  "dependencies": "ok",
  "warnings": []
}

# Or, if issues detected:
{
  "health": "warning",
  "issues_found": 2,
  "warnings": [
    "MSIX config drift detected",
    "One MCP server offline (idea-inbox)"
  ],
  "recommendation": "Run environment-diagnostics for detailed analysis"
}
```

### Key Features
- <2 second execution (no deep analysis)
- MCP server connectivity check
- Claude Desktop config validity
- Git repository check
- Key dependency verification
- Guidance to run deep diagnostics if issues found

### Implementation Notes
- Use fast checks: file exists, process responds, no deep parsing
- Separate from deep `environment-diagnostics`
- Run as part of session bootstrap
- Store last-known-good state for comparison

### Priority
**High** — Session startup experience matters; fast health check is low-hanging fruit.

---

## 4. mee-finding-assessor

### Purpose
Review and approve/reject autonomous research findings from Phase 42 before spec promotion.

### Why Build This?

**Evidence from HANDOFF.md:**
```
Phase 42 — Autonomous Research Engine
Generates: ResearchFinding objects (auto-discovery)
Current flow: Findings → Ledger → Manual approval

Pain point: Manual review is slow; no structured assessment
```

**Observation:**
Phase 42 generates findings autonomously, but approval process is manual and unstructured.

### Proposed Interface

```bash
# Review pending findings
mee-finding-assessor --list-pending

# Output:
{
  "pending_findings": 3,
  "findings": [
    {
      "id": "findings-2026-06-05-001",
      "title": "High rollback rate in Optimization Engine",
      "severity": "high",
      "source": "Runtime statistics",
      "recommendation": "Increase minCoherenceDelta floor to 0.5",
      "requires_approval": true
    }
  ]
}

# Approve a finding
mee-finding-assessor --approve findings-2026-06-05-001

# Output:
{
  "finding_id": "findings-2026-06-05-001",
  "status": "approved",
  "action": "Promote to spec; register threshold mutation"
}
```

### Key Features
- List pending findings with metadata
- Assess finding validity (confidence score)
- Approve/reject with rationale
- Suggest follow-up actions
- Track assessment history
- Integration with MEE meta-rule promotion

### Implementation Notes
- Build on Phase 42's `MeeResearchEngine`
- Use `ResearchFinding` and `MeeMetaRule` types
- Store assessments in `data/mee-findings-assessed/`
- Trigger `meta-rule-promotion` on approval
- Log all decisions for audit

### Priority
**Medium** — Phase 42 is operational; assessor would improve approval speed and auditability.

---

## 5. helm-daily-brief

### Purpose
Generate HELM morning briefing from Google Calendar, Gmail, Era Context, HubSpot.

### Why Build This?

**Evidence from HANDOFF.md:**
```
HELM Phase 2 — Daily Operator OS
Status: Live, Cowork artifact deployed

Components:
  - Google Calendar (7-day view)
  - Gmail (triage counts)
  - Era Context (net worth composite)
  - HubSpot (RL deal pipeline)

Current: Manual refresh on open
Desired: Automated daily brief generation
```

**Observation:**
HELM is fully wired but morning brief generation is manual. Operator would benefit from automated, scheduled brief.

### Proposed Interface

```bash
# Generate morning brief (callable via scheduled task)
helm-daily-brief --date="2026-06-05" --format="html"

# Output: HTML dashboard snapshot
<html>
  <section>Today's Agenda (3 events)</section>
  <section>Email Status (42 @Pending, 8 @Action Required)</section>
  <section>Finance Snapshot ($2.06M net worth across 10 accounts)</section>
  <section>RL Pipeline (12 active deals, $4.2M pipeline)</section>
</html>
```

### Key Features
- Multi-data-source aggregation (Calendar, Gmail, Era, HubSpot)
- Morning brief generation (HTML snapshot)
- Email action items extraction
- Finance summary
- Deal pipeline status
- Daily scheduling integration

### Implementation Notes
- Use existing MCP servers (Calendar, Gmail, Era Context, HubSpot)
- Store brief HTML in `data/helm-briefs/`
- Generate at 7:00 AM daily
- Cache MCP responses (don't re-fetch throughout day)
- Integrate with Claude Desktop scheduler

### Priority
**Medium** — HELM is live; automating daily brief improves operator experience.

---

## 6. idea-inbox-harvester

### Purpose
Harvest ideas from idea-inbox to priority list for roadmap integration.

### Why Build This?

**Evidence from HANDOFF.md:**
```
Idea-Inbox MCP Server: Fully functional, 12/12 tests pass
Status: Registered in Claude Desktop

Current flow:
  1. idea:capture (new ideas)
  2. idea:list-inbox (review)
  3. Manual extraction to roadmap

Pain point: Harvesting is manual; no priority-scoring
```

**Observation:**
Idea-inbox is mature; harvester would close the loop between idea capture and roadmap.

### Proposed Interface

```bash
# Harvest ideas from inbox to priority list
idea-inbox-harvester --inbox --status=active

# Output:
{
  "ideas_harvested": 8,
  "priority_list": [
    {
      "idea": "Phase 11 reflexive meta-evolution",
      "priority_score": 9.2,
      "tags": ["architecture", "mee"],
      "source": "idea-inbox",
      "recommendation": "Start next sprint"
    },
    {
      "idea": "Copilot skill adapter patterns",
      "priority_score": 7.8,
      "tags": ["platform", "integration"],
      "recommendation": "Schedule for Phase 2"
    }
  ],
  "roadmap_entries": [
    "- Phase 11 — Reflexive Meta-Evolution — high priority"
  ]
}
```

### Key Features
- Batch harvest from idea-inbox
- Priority scoring (impact × urgency × feasibility)
- Tag-based categorization
- Roadmap integration (generate entries)
- Deduplication
- Archive harvested ideas

### Implementation Notes
- Use existing `idea-inbox-server.js` tools
- Implement priority scoring function
- Store harvested ideas in `data/roadmap-candidates/`
- Generate CIC_MASTER_ROADMAP entries
- Support manual re-prioritization

### Priority
**Medium** — Idea-inbox is operational; harvester adds valuable automation to roadmap planning.

---

## 7. phase-validator

### Purpose
Verify a CIC phase is complete: tests pass, docs updated, integrations wired, no drift detected.

### Why Build This?

**Evidence from HANDOFF.md:**
```
Phase completion pattern:
  1. Implementation (code)
  2. Testing (npm test)
  3. Documentation (docs/CIC_SYSTEM.md, CHANGELOG)
  4. Roadmap update (CIC_MASTER_ROADMAP)
  5. Commit with [claude] prefix

Current: Manual checklist
Pain point: Easy to forget a step; no automated validation
```

**Observation:**
Phase completion has 5 required steps. Validator would ensure deterministic checkpoints.

### Proposed Interface

```bash
# Validate Phase 5 completion
phase-validator --phase="§5.0" --strict

# Output:
{
  "phase": "§5.0",
  "status": "complete",
  "checks": {
    "tests_passing": { "status": "pass", "detail": "304/304 tests" },
    "docs_updated": { "status": "pass", "detail": "CIC_SYSTEM.md bumped to v15.0.0" },
    "changelog_entry": { "status": "pass", "detail": "v2.29.2 entry present" },
    "roadmap_updated": { "status": "pass", "detail": "Phase §5.0 moved to Completed" },
    "no_drift": { "status": "pass", "detail": "Schema validation clean" },
    "integration_wired": { "status": "pass", "detail": "All endpoints registered" }
  },
  "readiness": "ready_for_release",
  "commit_recommendation": "[claude] Complete Phase 5 — Deterministic Scoring & Self-Evaluation Layer"
}
```

### Key Features
- 6-point completion checklist
- Automatic test detection and execution
- Doc version validation
- Schema drift detection
- Integration endpoint verification
- Suggested commit message generation

### Implementation Notes
- Check for test files in `tests/phases/[phase-id]/`
- Verify version bumps in `docs/cic/CIC_*.md`
- Query git for changelog entry
- Run `cic-section-summarizer` to detect drift
- Validate REST endpoints via health checks

### Priority
**Medium** — Phase completion is frequent; validator reduces human error in release processes.

---

## Summary Table

| Skill | Purpose | Priority | Est. Implementation | Effort |
|-------|---------|----------|-------------------|--------|
| **mee-phase-executor** | Execute MEE phases with state tracking | High | 2–3 weeks | Medium |
| **cic-benchmark-runner** | Automate RL benchmark + cost tracking | High | 2 weeks | Medium |
| **environment-validator** | Fast health check (<2s) | High | 1 week | Low |
| **mee-finding-assessor** | Review autonomous research findings | Medium | 1.5 weeks | Low |
| **helm-daily-brief** | Generate morning briefing | Medium | 2 weeks | Medium |
| **idea-inbox-harvester** | Harvest ideas to roadmap | Medium | 1.5 weeks | Low |
| **phase-validator** | Verify phase completion | Medium | 2 weeks | Medium |

---

## Recommended Implementation Order

### Sprint 1 (Weeks 1–2)
- [ ] **environment-validator** (Low effort, high ROI)
- [ ] **mee-finding-assessor** (Builds on Phase 42)

### Sprint 2 (Weeks 3–5)
- [ ] **mee-phase-executor** (Critical for automation)
- [ ] **cic-benchmark-runner** (Unblocks benchmarking)

### Sprint 3 (Weeks 6–7)
- [ ] **helm-daily-brief** (HELM enhancement)
- [ ] **idea-inbox-harvester** (Roadmap automation)

### Sprint 4 (Week 8)
- [ ] **phase-validator** (Release infrastructure)

---

## How to Propose New Skills

1. **Identify a gap** — Review recent HANDOFF.md or git commits
2. **Document the need** — Add a section like "## [Skill Name]" above
3. **Propose interface** — Show input/output examples
4. **Estimate effort** — Use existing skills as reference
5. **Submit for review** — Add to HANDOFF.md suggestion log

---

## References

- [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md) — All 13 existing skills
- [HANDOFF.md](./HANDOFF.md) — Recent session work
- [CIC_MASTER_ROADMAP.md](./docs/cic/CIC_MASTER_ROADMAP.md) — Phase definitions

---

Last updated: **2026-06-05 | v1.0.0**
