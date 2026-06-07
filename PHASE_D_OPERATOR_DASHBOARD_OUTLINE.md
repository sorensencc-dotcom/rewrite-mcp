# PHASE D OPERATOR DASHBOARD OUTLINE
*Minimal viable operator console for Phase D*

## Dashboard Sections

### 1. Pipeline Overview
- Current status: Idle / Running / Failed
- Last run timestamp
- Last run duration
- Last run result (Success / Partial / Failed)

---

### 2. Stage-Level Metrics
For each of the 6 stages:
- Status
- Latency
- Retry count
- Circuit breaker state
- Cache hit/miss
- Error count

**Expected layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ STAGE                  │ STATUS │ LATENCY │ RETRIES │ ERRORS │
├─────────────────────────────────────────────────────────────┤
│ 1. Code Analyzer       │ PASS   │ 320ms   │ 0       │ 0      │
│ 2. Call Graph          │ PASS   │ 450ms   │ 0       │ 0      │
│ 3. Narrative Linker    │ PASS   │ 280ms   │ 0       │ 0      │
│ 4. Context Synth       │ PASS   │ 520ms   │ 1       │ 0      │
│ 5. Conditional Router  │ PASS   │ 190ms   │ 0       │ 0      │
│ 6. Diagnostics         │ PASS   │ 410ms   │ 0       │ 0      │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. MCP Server Health
For each server (7070–7074):
- Reachability
- Version
- Latency
- Error rate
- Last heartbeat

**Expected layout:**
```
┌──────────────────────────────────────────────────────────┐
│ SERVER         │ STATUS │ LATENCY │ ERRORS │ LAST BEAT   │
├──────────────────────────────────────────────────────────┤
│ Port 7070      │ UP     │ 12ms    │ 0      │ 2min ago    │
│ Port 7071      │ UP     │ 15ms    │ 0      │ 2min ago    │
│ Port 7072      │ UP     │ 14ms    │ 0      │ 2min ago    │
│ Port 7073      │ UP     │ 13ms    │ 0      │ 2min ago    │
│ Port 7074      │ UP     │ 16ms    │ 0      │ 2min ago    │
└──────────────────────────────────────────────────────────┘
```

---

### 4. Trace Explorer
- List of recent traces
- Click to expand full span tree
- Highlight slow spans
- Highlight failed spans

**Expected layout:**
```
Recent Traces (last 20):

[2026-06-06 14:23:45] trace_id: abc123 | duration: 2.3s | status: SUCCESS
  └─ code-analyzer: 320ms
  └─ call-graph: 450ms
  └─ narrative-linker: 280ms
  └─ context-synth: 520ms
  └─ conditional-router: 190ms
  └─ diagnostics: 410ms

[2026-06-06 14:21:10] trace_id: def456 | duration: 2.1s | status: SUCCESS
  └─ [6 stages, all passed]
```

---

### 5. Governance Panel
- Whitelist status (12/12 approved)
- Exceptions expiring soon
- Artifact approvals
- Drift from governance rules

**Expected layout:**
```
GOVERNANCE STATUS:
  ✓ Whitelist: 12/12 artifacts approved
  ⏰ Exceptions expiring: 3 (cic-labs-orchestrator by 2026-06-30, ...)
  ✓ No drift detected
  ✓ Pre-commit hook active
```

---

### 6. Logs
- Structured logs
- Filter by trace ID
- Filter by correlation ID
- Filter by stage

**Expected layout:**
```
[2026-06-06T14:23:45.123Z] [trace: abc123] [stage: 1] code-analyzer started
[2026-06-06T14:23:45.443Z] [trace: abc123] [stage: 1] code-analyzer finished (latency: 320ms)
[2026-06-06T14:23:45.893Z] [trace: abc123] [stage: 2] call-graph started
...
```

---

## Implementation Notes

### Phase D MVP
For Phase D, implement sections 1–2 and 4 as static HTML + JSON data feed. Sections 3, 5, 6 can be manual CLI queries.

### Phase E Enhancement
Phase E adds:
- Live websocket updates
- Interactive filtering
- Alerting on threshold violations
- Historical trend analysis
