---
title: Phase 23 Kickoff Plan — CIC Memory Layer & Long-Horizon Autonomy (MLA)
version: 1.0.0
date: 2026-06-07
status: READY FOR EXECUTION
---

# PHASE 23 KICKOFF PLAN

**Outcome Goal:** Implement a durable, queryable memory substrate that enables CIC to reason over its own history, detect patterns, and autonomously propose evolution.

**Timeline:** 12 days end-to-end (June 7–18, 2026)

**Dependencies:** None (this is the foundation)

---

## WHY PHASE 23 NOW

The entire CIC autonomy stack (Phases 24–27) depends on memory:

- **Phase 24** (Skill Graph) needs historical capability data
- **Phase 25** (Autonomous Planner) needs task success history
- **Phase 26** (Runtime Orchestrator) needs execution telemetry
- **Phase 27** (Knowledge Graph) needs memory events as primary input

Without memory, CIC cannot learn from its own history, detect drift, or propose self-improvement.

---

## EXECUTION PHASES (Week 1 + 2)

### WEEK 1 (June 7–11)

#### Day 1: Spec (June 7)

**Deliverable:** `mla-spec.md` — complete specification of event types, schemas, retention rules

**Work:**

1. **Define event types** (2 hours)
   - ARPS_DELTA: roadmap/prompt changes
   - PIPELINE_RUN: ingestion/classification/execution results
   - AGENT_TELEMETRY: agent health, performance, errors
   - GOVERNANCE_SIGNAL: approval decisions, policy violations
   - APR_PLAN: planning decisions, task decomposition
   - CRO_RUN: task execution traces, step results
   - Output format: JSON schema per type

2. **Storage schema** (1 hour)
   - Event: `{ id, timestamp, event_type, payload, retention_days, source_agent, session_id, correlation_id }`
   - Persistence: JSON file (`memory_store.json`), append-only
   - Validation: 100% schema enforcement before write

3. **Retention policy** (1 hour)
   - Raw events: 90 days (archive to S3 after)
   - Summaries: 1 year (automatic generation at day 7, 30)
   - Distilled memory: permanent
   - Operator: configurable per event_type

4. **Publish spec** (1 hour)
   - Document: `C:\dev\rewrite-mcp\docs\cic\mla-spec.md`
   - Review with operator
   - Get sign-off before moving to Day 2

**Definition of Done:**
- ✅ All 6 event types fully specified with examples
- ✅ JSON schemas for each type
- ✅ Retention rules documented
- ✅ Storage format locked

---

#### Days 2–3: Harvester (June 8–9)

**Deliverable:** `MLA-Harvester` agent + API — ingest events from all sources

**Work:**

1. **Build event store** (4 hours)
   - Implement: `src/memory/MemoryStore.ts`
   - Constructor: initialize/load from file
   - Methods: append(event), query(type, limit), validate(event), checkpoint()
   - Atomic writes: .tmp → rename pattern (cross-platform)
   - 100% schema validation before append
   - File location: `memory_store.json`

2. **Wire ingest API** (4 hours)
   - Express endpoint: `POST /memory/ingest`
   - Input: { event_type, payload, source_agent, session_id }
   - Validation: schema check, correlation_id auto-gen
   - Output: { event_id, timestamp, status }
   - Error handling: reject invalid, log reasons

3. **Create test suite** (2 hours)
   - Unit: schema validation, append, query, corruption recovery
   - Integration: ARPS → ingest → store retrieval
   - Test data: 50 events across all 6 types
   - Coverage: >90%

4. **Integrate with ARPS** (2 hours)
   - Hook ARPS phase synthesizer: emit ARPS_DELTA events on roadmap write
   - Emit on: phase completion, roadmap rewrite, prompt change
   - Correlation: link events to git commits where applicable

**Definition of Done:**
- ✅ MemoryStore persists 100% of ingest requests
- ✅ Schema validation rejects invalid events
- ✅ API responds in <100ms
- ✅ Recovery from file corruption works
- ✅ ARPS → ingest → retrieve end-to-end works

---

#### Days 4–5: Synthesizer (June 10–11)

**Deliverable:** `MLA-Synthesizer` agent — weekly/monthly summaries + trend detection

**Work:**

1. **Weekly synthesizer** (4 hours)
   - Job: runs every Monday @ 8am (or on-demand)
   - Input: all events from past 7 days
   - Output: `memory_summaries.json` append with weekly_summary object
   - Fields: period, event_count_by_type, key_deltas, trend (improving/degrading/stable), observations
   - Drift detection: compare to baseline metrics

2. **Monthly synthesizer** (3 hours)
   - Job: runs on 1st of month
   - Input: aggregate 4 weekly summaries
   - Output: append monthly_summary to same file
   - Fields: period, trend_lines (7-day rolling), pattern_analysis, risk_signals

3. **Test suite** (2 hours)
   - Unit: trend detection logic
   - Integration: 30-day event history → monthly summary
   - Validation: summary accuracy against raw events
   - Coverage: >85%

4. **Publish to Command Center** (1 hour)
   - Endpoint: `GET /memory/summaries?period=weekly|monthly`
   - Display in summary card on dashboard

**Definition of Done:**
- ✅ Weekly summary generated from 7-day event window
- ✅ Monthly summary correctly aggregates 4 weeks
- ✅ Trend detection produces actionable insights
- ✅ Summaries are human-readable

---

### WEEK 2 (June 12–18)

#### Days 6–8: Integration (June 12–14)

**Deliverable:** Wire Memory into ARPS, Stability Dashboard, Skill Graph Harvester

**Work:**

1. **ARPS integration** (3 hours)
   - ARPS reads Memory summaries before prompt synthesis
   - Input: `/memory/summaries?period=weekly`
   - Use case: bias prompt-generation toward recent drift signals
   - Integration point: `promptSynthesizer.generatePrompt()` checks memory first

2. **Stability Dashboard integration** (3 hours)
   - Dashboard injects memory events into telemetry stream
   - Pipeline runs → emit PIPELINE_RUN events
   - Soak test results → emit GOVERNANCE_SIGNAL events
   - Timeline view: overlay memory event markers on metric graphs

3. **Skill Graph Harvester prep** (2 hours)
   - Plan: Skill Graph changes will emit GOVERNANCE_SIGNAL events
   - Implement in Phase 24, but prep hooks now
   - Event format: { skill_id, change_type, confidence_delta }

4. **Test suite** (2 hours)
   - E2E: ARPS → memory ingest → summarizer → next ARPS cycle
   - Verify: memory is used in prompt generation
   - Verify: Stability Dashboard shows memory timeline

**Definition of Done:**
- ✅ ARPS demonstrates reading memory
- ✅ Stability Dashboard injects events to memory
- ✅ Memory-ARPS feedback loop works end-to-end

---

#### Day 9: API (June 15)

**Deliverable:** `MLA-API` — read-only query endpoints

**Work:**

1. **Query endpoints** (6 hours)
   - `GET /memory/events?type=ARPS_DELTA&limit=100` — raw events
   - `GET /memory/summaries?period=weekly&limit=10` — summaries
   - `GET /memory/trends` — 7-day + 30-day rolling trends
   - `GET /memory/drift` — current drift metrics
   - Response format: JSON with metadata, timestamps, payloads

2. **Performance** (1 hour)
   - Index by date and event_type
   - Target: <100ms response time
   - Caching: LRU cache for recent summaries

3. **Error handling** (1 hour)
   - 400 Bad Request: invalid query params
   - 404 Not Found: no events in range
   - 500 Internal: file read errors (with recovery)

**Definition of Done:**
- ✅ All 4 endpoints respond correctly
- ✅ Latency <100ms
- ✅ Query with filters works
- ✅ Error responses are informative

---

#### Days 10–11: UI (June 16–17)

**Deliverable:** `MLA-UI` — Memory Explorer panel in Command Center

**Work:**

1. **Memory Explorer component** (6 hours)
   - React component in `operator-ui`
   - Three tabs: Timeline, Summaries, Trends
   - Timeline: scroll through events by date, filter by type
   - Summaries: weekly cards with key insights
   - Trends: 7-day + 30-day drift metrics, visual sparklines

2. **Integration with Command Center** (2 hours)
   - Add Memory Explorer as left-side panel
   - Layout: 20% width, resizable
   - Toggle: show/hide memory explorer

3. **Test suite** (1 hour)
   - Component renders without error
   - Filters work (event type, date range)
   - API integration verified

**Definition of Done:**
- ✅ Memory Explorer renders
- ✅ Timeline scrolls smoothly
- ✅ Filters apply correctly
- ✅ Summaries display with key insights

---

#### Day 12: Autonomy (June 18)

**Deliverable:** `MLA-Autonomy` agent — auto-generate roadmap proposals

**Work:**

1. **Memory analysis agent** (4 hours)
   - Job: runs weekly (after summarizer)
   - Input: latest weekly + monthly summaries
   - Logic: pattern detection
     - Repeated failures → suggest root cause fix
     - Capability gaps → suggest new phase
     - Drift trends → suggest stabilization
     - Success patterns → suggest scaling
   - Output: proposals JSON (human-reviewable)

2. **Proposal generator** (2 hours)
   - Schema: { id, type (fix/gap/stabilize/scale), priority, description, risk_level, effort_estimate }
   - Example: "REPEATED_FAILURE: extraction fails in >2% of runs → suggest EXTRACTOR_ROBUSTNESS phase"

3. **Publish to Command Center** (1 hour)
   - New "Autonomy Proposals" card
   - Show top 3 proposals by priority
   - "Accept" button → creates phase in roadmap

4. **Test suite** (1 hour)
   - Pattern detection logic
   - Proposal generation accuracy

**Definition of Done:**
- ✅ Agent generates proposals based on memory
- ✅ Proposals are actionable
- ✅ Operator can review in Command Center
- ✅ At least 1 proposal generated per week

---

## DELIVERABLES CHECKLIST

### Code Deliverables

- [ ] `src/memory/MemoryStore.ts` — event store with append/query/validate
- [ ] `src/memory/MemoryHarvester.ts` — ingest handler
- [ ] `src/memory/MemorySynthesizer.ts` — weekly/monthly summarizer
- [ ] `src/memory/MemoryAPI.ts` — Express routes for query API
- [ ] `src/memory/MemoryAutonomy.ts` — proposal generator
- [ ] `operator-ui/src/components/MemoryExplorer.tsx` — React UI
- [ ] `docs/cic/mla-spec.md` — specification document
- [ ] Test suites (>90% coverage for each module)

### Configuration/Integration

- [ ] `memory_store.json` — persistent event log (version control: .gitignore)
- [ ] `memory_summaries.json` — weekly/monthly summaries
- [ ] ARPS hook: emit ARPS_DELTA on roadmap changes
- [ ] Stability Dashboard integration: emit PIPELINE_RUN events
- [ ] Command Center: Memory Explorer panel wired

---

## DAILY STANDUP TEMPLATE

**Each day, update this table:**

| Date | Deliverable | Status | Blockers | % Complete |
|------|-------------|--------|----------|------------|
| Jun 7 | MLA-Spec | ✅ Complete | None | 100% |
| Jun 8 | MLA-Harvester (build) | 🚧 In Progress | Need MemoryStore design review | 60% |
| Jun 9 | MLA-Harvester (test) | Pending | Awaits Day 8 | 0% |
| ... | ... | ... | ... | ... |

---

## SUCCESS METRICS (End of Phase 23)

### Functional

- ✅ Memory captures 100% of ARPS, pipeline, agent events
- ✅ Retention works: 90-day raw, 1-year summaries, permanent distilled
- ✅ Weekly summarizer runs without error, produces human-readable insights
- ✅ Memory API responds in <100ms
- ✅ Memory Explorer UI loads and filters smoothly
- ✅ Autonomy agent generates at least 1 actionable proposal per week

### Quality

- ✅ Code coverage >90% across all modules
- ✅ Zero data loss: 100% event durability
- ✅ Zero silent failures: all errors logged and visible
- ✅ Cross-platform file writes: works on Windows/Mac/Linux

### Integration

- ✅ ARPS → Memory → ARPS feedback loop works end-to-end
- ✅ Stability Dashboard injects all relevant events
- ✅ Command Center displays Memory Explorer without lag
- ✅ Phase 24 (Skill Graph) can consume Memory output

---

## RISK MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Memory store file grows too large | Disk space, query latency | Archive events >90 days to S3; keep 7-day hot index |
| Synthesizer produces inaccurate insights | Operator makes bad decisions | Operator review before acting on proposals |
| Event schema changes mid-phase | Backwards compatibility issues | Lock schema before Day 2; migration plan if needed |
| ARPS integration breaks existing logic | Regression | Run full ARPS test suite after integration; use feature flag if needed |

---

## OPERATOR HANDOFF

**At end of Phase 23 (June 18, 6pm):**

1. Memory store has 12 days of event history
2. Weekly summarizer has run at least once (June 14)
3. Memory-aware ARPS has generated prompts using memory insights
4. Command Center shows Memory Explorer with live data
5. Autonomy agent has generated first proposals (for review)

**Ready for Phase 24:**
- Skill Graph Harvester can emit events to memory
- Phase 24 can use Memory for historical capability tracking
- Foundation complete for Phases 25–27

---

## NOTES

- **Git strategy:** Create feature branch `feature/phase-23-mla`; PR to main on June 18
- **Commit convention:** Use `[claude]` prefix for all commits (per CLAUDE.md)
- **Documentation:** Keep `CIC_MASTER_ROADMAP.md` updated daily with status
- **Communication:** Update HANDOFF.md at end of each day

---

**Status:** Ready to begin today (2026-06-07)

**Next Checkpoint:** June 8 EOD (MLA-Spec complete, MLA-Harvester build started)
