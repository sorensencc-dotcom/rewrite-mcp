# Agents Panel (Tier 2)

Operator-grade agent instrumentation for Console v3.

## File Structure

```
agents/
├── AgentsPanel.tsx           # Main container + data orchestration
├── types.ts                  # All TypeScript interfaces
├── WIRING.md                 # API contract + endpoint mappings
├── README.md                 # This file
├── hooks/
│   ├── useAgentList.ts       # Fetch all agents (polling)
│   └── useAgent.ts           # Fetch single agent detail (polling)
└── components/
    ├── PanelHeader.tsx       # Status summary + global controls
    ├── PanelBody.tsx         # Two-column grid layout
    ├── AgentList.tsx         # Left column: agent list
    ├── AgentDetailView.tsx   # Right column: tabbed detail view
    ├── AgentMetadata.tsx     # Tab 1: name, version, region, capabilities
    ├── AgentHeartbeat.tsx    # Tab 2: latency, queue, health, lastPulse
    ├── AgentCostTimeline.tsx # Tab 3: cost history + aggregates
    ├── AgentExecutionLog.tsx # Tab 4: execution history with error tracking
    ├── AgentApprovalHistory.tsx # Tab 5: governance votes + approvals
    └── AgentSkillUsage.tsx   # Tab 6: skill frequency + cost + success rate
```

---

## Data Flow

### **Polling (Current)**
```
AgentsPanel
  ├─ useAgentList(5s)
  │   └─ GET /api/agents → AgentList
  └─ useAgent(selectedAgentId, 5s)
      └─ GET /api/agents/:id → AgentDetailView + all tabs
```

### **WebSocket (Ready for Future)**
Once backend wires event streams:
```
AgentsPanel
  ├─ useAgentList(5s)  [polling, slow-changing]
  └─ useAgent(selectedAgentId, WS + polling hybrid)
      ├─ WS /stream/agents/:id/heartbeat
      ├─ WS /stream/agents/:id/logs
      ├─ WS /stream/agents/cost
      └─ GET /api/agents/:id  [fallback + initial load]
```

---

## Component Checklist

### **PanelHeader**
- [ ] Status summary grid (online/degraded/offline/total)
- [ ] Error display (top)
- [ ] Button group: Invoke, Pause, Restart, Snapshot
- [ ] Disabled state during loading

### **AgentList**
- [ ] Scrollable list (max-h-96)
- [ ] Name + status badge + cost + latency + lastExecution
- [ ] Selected highlight
- [ ] Click to select agent

### **AgentMetadata**
- [ ] Name, Version, Region in grid
- [ ] Capabilities as badge list
- [ ] CIC design tokens for all styling

### **AgentHeartbeat**
- [ ] Latency (ms) + tone (green <100, yellow <500, red >500)
- [ ] Queue depth + tone (green 0, yellow <10, red >10)
- [ ] Health status + tone
- [ ] Last pulse timestamp

### **AgentCostTimeline**
- [ ] Total, Average, Peak summary
- [ ] Table of last 10 cost points (reversed chronological)
- [ ] Timestamp + cost columns

### **AgentExecutionLog**
- [ ] Table: Timestamp, Duration, Drift, Status
- [ ] Last 10 executions (reversed)
- [ ] Status badges (OK = green, Error = red)
- [ ] Last error message display (if any)

### **AgentApprovalHistory**
- [ ] Table: Proposal ID (short), Vote, Timestamp, Reason
- [ ] Vote badge (approve = green, reject = red)
- [ ] Reversed chronological order

### **AgentSkillUsage**
- [ ] Summary: Total Invocations, Total Cost, Avg Success Rate
- [ ] By-Skill table: Skill, Count, Avg Cost, Success Rate
- [ ] Sorted by count (descending)

### **PanelBody Controls**
- [ ] Kill button (danger variant)
- [ ] Clear Queue button (secondary variant)

---

## Implementation Notes

1. **Token Compliance**
   - All colors from `cic.colors.*`
   - All spacing from `cic.spacing.*`
   - No inline styles, no `style=` attributes
   - Use `cic.cls.*` helpers

2. **Responsive**
   - Grid layout: 1 col left, 2 col right (on desktop)
   - Stacks on mobile (fallback)
   - Max heights + scroll for long lists

3. **Loading States**
   - Buttons disabled during fetch
   - "Loading…" text while initial fetch
   - Error display in red at top

4. **Error Handling**
   - All fetch errors caught + displayed
   - Network errors show "Fetch failed"
   - HTTP errors show status code
   - Request cancellation prevents memory leaks

5. **WebSocket Ready**
   - `useAgent` hook supports `pollIntervalMs = null` for WS-only
   - Components already structured for streaming data
   - No refactoring needed when backend is ready

---

## API Endpoints (GET)

- `GET /api/agents` → AgentSummary[]
- `GET /api/agents/:id` → AgentDetail

## API Endpoints (POST)

- `POST /api/agents/:id/invoke`
- `POST /api/agents/:id/pause`
- `POST /api/agents/:id/restart`
- `POST /api/agents/:id/snapshot`
- `POST /api/agents/:id/kill`
- `POST /api/agents/:id/clear-queue`

See **WIRING.md** for full API contract + data shapes.

---

## Next Steps

1. **Implement components** from checklist above
2. **Test polling** with mock data (fetch `/api/agents`)
3. **Verify CIC token usage** (no hardcoded colors/spacing)
4. **Test controls** (buttons POST to endpoints)
5. **Add WebSocket support** (when backend ready) — no refactoring needed
6. **Merge to main** + add to Console v3 layout

---

## Support

- **WIRING.md** — Full API contract + endpoint mappings
- **types.ts** — All TypeScript interfaces for type safety
- **hooks/** — Reusable data fetching (polling + WebSocket ready)
