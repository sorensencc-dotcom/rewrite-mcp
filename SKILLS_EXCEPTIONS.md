# Skills Exceptions Registry

**Purpose:** Document approved exceptions to the Skills Policy threshold (0.70 overall score)  
**Last Updated:** 2026-06-06  
**Auditor:** Claude Code

---

## Exception Approval Process

| Status | Requirement |
|--------|-------------|
| ✅ Approved | Documented below with justification + reviewer |
| ⏳ Pending | Awaiting implementation or re-evaluation |
| 🔄 Review | Scheduled for re-evaluation on sunset date |
| ❌ Rejected | Must fix to score >= 0.70 or remove |

---

## Approved Exceptions

### 1. cic-section-summarizer (Score: 0.71)

**Status:** ✅ APPROVED  
**Approval Date:** 2026-06-06  
**Approver:** User  
**Reason:** Critical utility for audit trails; test gaps non-blocking

**Gaps:** Test coverage 0.60 (need CRLF, encoding, large file tests)

**Sunset:** 2026-06-30 (Phase E — Distributed Scaling)

**Action Items:**
- [ ] Add test: CRLF vs LF handling
- [ ] Add test: UTF-8 with BOM
- [ ] Add test: Files > 10MB

---

### 2. rewrite-labs-orchestrator (Score: 0.71)

**Status:** ✅ APPROVED  
**Approval Date:** 2026-06-06  
**Approver:** User  
**Reason:** Cross-system router in critical path

**Gaps:** Test coverage 0.55 (timeout, malformed response, overflow tests)

**Sunset:** 2026-06-20 (Phase D — Real Flow Execution)

**Action Items:**
- [ ] Add test: Connection timeout
- [ ] Add test: Malformed JSON handling
- [ ] Add test: Queue overflow
- [ ] Implement exponential backoff

---

### 3. cic-docs-sync (Score: 0.68)

**Status:** ✅ APPROVED WITH CONDITIONS  
**Approval Date:** 2026-06-06  
**Approver:** User  
**Reason:** Experimental MCP; git integration deferred; fire-and-forget utility

**Conditions:**
- ✅ Used only as utility (not critical flow)
- ✅ Error handling: on_error: "continue"
- ✅ Git integration NOT used until hardened

**Gaps:** Test coverage 0.50 (CRITICAL — no git tests)

**Sunset:** 2026-06-20 (Phase D)

**Action Items:**
- [ ] Add test: CHANGELOG append
- [ ] Add test: Git commit failure recovery
- [ ] Add test: Conflict detection
- [ ] Implement atomic git transactions

---

### 4-8. Agent Wrappers (Score: 0.65 each)

**Artifacts:** mcpSummarizerAgent, mcpDriftAgent, mcpDiagnosticsAgent, mcpDocsSyncAgent, mcpOrchestratorAgent

**Status:** ✅ APPROVED  
**Approval Date:** 2026-06-06  
**Approver:** User  
**Reason:** Thin wrappers (30 LOC); delegate to tested MCP servers

**Justification:** Errors propagate from backends; pure pass-through, no business logic

**Sunset:** 2026-06-30 (Phase E)

**Action Items (all 5):**
- [ ] Add integration test: Ruflo context propagation
- [ ] Add integration test: Timeout override
- [ ] Document correlation ID flow

---

### 9. mcp-integration-flow (Score: 0.64)

**Status:** ✅ APPROVED  
**Approval Date:** 2026-06-06  
**Approver:** User  
**Reason:** Reference template, not deployed; used for operator education

**Justification:** Flow template, not executable artifact

**Sunset:** 2026-06-30 (remove if no references)

---

### 10. cic-main-pipeline (Score: 0.67)

**Status:** ⏳ PENDING — BLOCKED  
**Approval Date:** Not yet approved  
**Blocker:** Execution failure (parameter serialization)

**Critical Issues:**
1. Parameter serialization error: `checks.map is not a function`
2. No successful test execution (0.10 coverage)
3. Conditional routing untested

**Path to Approval:**
- [ ] Fix diagnostics parameter serialization
- [ ] Run tests successfully
- [ ] Verify all 6 stages execute
- [ ] Verify Stage 5 conditional logic

**Target:** 2026-06-10 (Phase D)

---

## Governance Metrics

```
Total: 12 artifacts
✅ PASS: 2
⚠️ BORDERLINE: 2 (approved + sunset)
❌ FAIL: 8 (7 approved + exceptions, 1 blocked)
```

## Sunset Calendar

| Date | Items | Action |
|------|-------|--------|
| 2026-06-10 | cic-main-pipeline | Fix blockers OR reject |
| 2026-06-20 | cic-docs-sync, 3 agents, orchestrator | Re-evaluate OR extend |
| 2026-06-30 | section-summarizer, all agents, ref-flow | Re-evaluate OR remove |

---

**Reviewer:** User (2026-06-06)  
**Next Review:** 2026-06-10

