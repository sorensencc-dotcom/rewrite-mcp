# Agents Panel Wiring Spec

## Overview

Tier 2: Agents Panel is a full-width operator console showing agent execution telemetry, cost tracking, approval history, and skill usage. Data flows via polling (5s) with WebSocket streaming ready.

---

## Data Sources

### **1. Agent List (polling)**
**Endpoint:** `GET /api/agents`  
**Poll Interval:** 5000ms  
**Hook:** `useAgentList`  
**Component:** `AgentList`

**Response:**
```json
[
  {
    "id": "agent-001",
    "name": "Synthesizer",
    "status": "online",
    "lastExecution": "2026-06-20T15:23:45Z",
    "costLast5m": 0.0523,
    "heartbeat": {
      "latencyMs": 45,
      "lastPulse": "2026-06-20T15:23:50Z"
    }
  }
]
```

---

### **2. Agent Detail (polling)**
**Endpoint:** `GET /api/agents/:id`  
**Poll Interval:** 5000ms (when selected)  
**Hook:** `useAgent`  
**Components:** `AgentDetailView` + tabs

**Response:**
```json
{
  "id": "agent-001",
  "metadata": {
    "name": "Synthesizer",
    "version": "1.0.0",
    "region": "us-east-1",
    "capabilities": ["memory", "approval", "skill-invocation"]
  },
  "heartbeat": {
    "latencyMs": 45,
    "queueDepth": 0,
    "health": "online",
    "lastPulse": "2026-06-20T15:23:50Z"
  },
  "costTimeline": [
    { "timestamp": "2026-06-20T15:23:00Z", "cost": 0.0105 }
  ],
  "executionLog": [
    {
      "id": "exec-001",
      "timestamp": "2026-06-20T15:23:45Z",
      "inputHash": "abc123...",
      "outputHash": "def456...",
      "driftScore": 0.02,
      "durationMs": 250,
      "error": null
    }
  ],
  "approvalHistory": [
    {
      "proposalId": "prop-001",
      "vote": "approve",
      "timestamp": "2026-06-20T15:20:00Z",
      "reason": "Governance approved"
    }
  ],
  "skillUsage": [
    {
      "skill": "memory-store",
      "count": 24,
      "avgCost": 0.0012,
      "successRate": 0.98
    }
  ]
}
```

---

### **3. Heartbeat Stream (WebSocket, ready for future)**
**Endpoint:** `WS /stream/agents/:id/heartbeat`  
**Message Format:** Same as `heartbeat` object  
**Fallback:** Polling via `useAgent` with 5s interval

---

### **4. Execution Log Stream (WebSocket, ready for future)**
**Endpoint:** `WS /stream/agents/:id/logs`  
**Message Format:** New `ExecutionLogEntry` on each execution  
**Fallback:** Polling via `useAgent` with 5s interval

---

### **5. Cost Pulse Stream (WebSocket, ready for future)**
**Endpoint:** `WS /stream/agents/cost`  
**Message Format:** `{ agentId, timestamp, cost }`  
**Fallback:** Polling via `useAgent` with 5s interval

---

## Control Surface (POST endpoints)

### **Invoke Agent**
**Endpoint:** `POST /api/agents/:id/invoke`  
**Trigger:** "Invoke" button in `PanelHeader`  
**Response:** `{ status: "ok" }`

---

### **Pause Agent**
**Endpoint:** `POST /api/agents/:id/pause`  
**Trigger:** "Pause" button in `PanelHeader`  
**Response:** `{ status: "ok" }`

---

### **Resume Agent**
**Endpoint:** `POST /api/agents/:id/resume`  
**Trigger:** "Resume" button (when paused)  
**Response:** `{ status: "ok" }`

---

### **Restart Agent**
**Endpoint:** `POST /api/agents/:id/restart`  
**Trigger:** "Restart" button in `PanelHeader`  
**Response:** `{ status: "ok" }`

---

### **Snapshot Agent State**
**Endpoint:** `POST /api/agents/:id/snapshot`  
**Trigger:** "Snapshot" button in `PanelHeader`  
**Response:** `{ snapshotId: "snap-001", timestamp: "..." }`

---

### **Kill Active Execution**
**Endpoint:** `POST /api/agents/:id/kill`  
**Trigger:** "Kill" button in `AgentDetailView`  
**Response:** `{ status: "ok" }`

---

### **Clear Execution Queue**
**Endpoint:** `POST /api/agents/:id/clear-queue`  
**Trigger:** "Clear Queue" button in `AgentDetailView`  
**Response:** `{ status: "ok" }`

---

## Component Tree

```
AgentsPanel
├── PanelHeader
│   ├── StatusSummary (stats: online/degraded/offline/total)
│   └── ControlButtons (invoke, pause, restart, snapshot)
└── PanelBody
    ├── AgentList (left column)
    │   └── AgentListItem × N
    └── AgentDetailView (right column)
        ├── AgentMetadata
        ├── AgentHeartbeat
        ├── AgentCostTimeline
        ├── AgentExecutionLog
        ├── AgentApprovalHistory
        └── AgentSkillUsage
```

---

## Data Binding

| Component | GET Endpoint | Hook | Update Interval |
|-----------|--------------|------|-----------------|
| AgentList | `/api/agents` | `useAgentList` | 5s |
| AgentDetailView | `/api/agents/:id` | `useAgent` | 5s |
| AgentMetadata | (in `/api/agents/:id`) | `useAgent` | 5s |
| AgentHeartbeat | (in `/api/agents/:id`) OR WS | `useAgent` | 5s / real-time |
| AgentCostTimeline | (in `/api/agents/:id`) OR WS | `useAgent` | 5s / real-time |
| AgentExecutionLog | (in `/api/agents/:id`) OR WS | `useAgent` | 5s / real-time |
| AgentApprovalHistory | (in `/api/agents/:id`) | `useAgent` | 5s |
| AgentSkillUsage | (in `/api/agents/:id`) | `useAgent` | 5s |

---

## Design System Enforcement

All components use CIC design tokens:

- **Colors:** `cic.colors.*` only
- **Spacing:** `cic.spacing.*` only
- **Grid:** `CICGrid` component
- **Buttons:** `CICButton` + `CICButtonGroup`
- **Badges:** `CICBadge` with variants (success/warning/error/accent)
- **Stats:** `CICStat` for key metrics
- **Tabs:** `CICTabs` for detail sections

---

## Polling vs. WebSocket Strategy

### **Current (Phase 2): Polling Only**
- All data via GET endpoints
- 5s refresh for lists + detail
- Simple, reliable, operator-observable

### **Future (Phase 3): WebSocket Streaming**
- High-frequency streams: heartbeat, logs, cost
- Low-frequency polling: approvals, skills
- Hybrid approach reduces server load
- UI components already WS-ready (see hooks)

---

## Error Handling

All hooks (`useAgentList`, `useAgent`) handle:
- Network failures → `error` state + display
- HTTP errors (404, 500) → `error` state + display
- Invalid JSON → `error` state + display
- Cancelled requests → cleanup (prevent memory leaks)

UI displays errors in `PanelHeader` as red text.

---

## Implementation Notes

1. **Token Compliance:** No inline styles, no hardcoded colors, no custom spacing.
2. **Responsive:** Two-column grid (left: 1, right: 2) collapses on mobile.
3. **Max Height:** Lists/tables max-h-96 with overflow-y-auto.
4. **Disabled States:** Buttons disabled during loading.
5. **Ready for Streaming:** Hooks support WS via environment flag (future).
