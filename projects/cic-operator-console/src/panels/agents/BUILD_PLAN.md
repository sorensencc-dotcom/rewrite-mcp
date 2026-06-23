# Tier 2 Agents Panel — Complete Build Plan

**Status:** Skeletons + wiring specs complete. Ready for parallel execution.

---

## Deliverables (Complete)

### **1. React Component Skeletons ✅**
- Main panel + 9 subcomponents
- All props typed
- CIC design tokens enforced
- Polling-ready, WebSocket-compatible

**Files:**
- `AgentsPanel.tsx` (main container)
- `components/PanelHeader.tsx` (header + stats)
- `components/AgentList.tsx` (left column)
- `components/AgentDetailView.tsx` (tabs)
- `components/AgentMetadata.tsx` (tab 1)
- `components/AgentHeartbeat.tsx` (tab 2)
- `components/AgentCostTimeline.tsx` (tab 3)
- `components/AgentExecutionLog.tsx` (tab 4)
- `components/AgentApprovalHistory.tsx` (tab 5)
- `components/AgentSkillUsage.tsx` (tab 6)

### **2. Data Hooks ✅**
- `useAgentList` — fetch all agents (polling)
- `useAgent` — fetch single agent detail (polling)

**Features:**
- Configurable poll intervals
- Error handling + cleanup
- WebSocket-ready (no changes needed)

**Files:**
- `hooks/useAgentList.ts`
- `hooks/useAgent.ts`

### **3. Type Definitions ✅**
Complete TypeScript interfaces for type safety.

**Files:**
- `types.ts`

### **4. API Wiring Spec ✅**
Endpoint-to-component mappings, data shapes, error handling.

**Files:**
- `WIRING.md`

### **5. WebSocket Backend Plan ✅**
2–3 hour implementation guide for backend.

**Files:**
- `WEBSOCKET_WIRING.md`

### **6. Implementation Checklist ✅**
Component-by-component checklist for UI builders.

**Files:**
- `README.md`

---

## Build Phases

### **Phase 1: Component Implementation (UI Team)**

**Duration:** 12–18 hours (parallel tracks possible)

**Track A: Layout & Structure**
1. Implement `AgentList` (left column)
2. Implement `PanelHeader` (top)
3. Implement `PanelBody` (grid layout)

**Track B: Metadata Tab**
1. Implement `AgentMetadata` (static)

**Track C: Real-Time Tabs (can run in parallel)**
1. Implement `AgentHeartbeat`
2. Implement `AgentCostTimeline`
3. Implement `AgentExecutionLog`

**Track D: Governance Tabs**
1. Implement `AgentApprovalHistory`
2. Implement `AgentSkillUsage`

**Track E: Container**
1. Implement `AgentDetailView` (ties all tabs together)
2. Implement `AgentsPanel` (ties everything together)

**Dependency Chain:**
```
AgentsPanel (main container)
  ├─ PanelHeader (header + stats)
  ├─ PanelBody (grid layout)
  │   ├─ AgentList (left)
  │   └─ AgentDetailView (right, depends on all tabs)
  │       ├─ AgentMetadata
  │       ├─ AgentHeartbeat
  │       ├─ AgentCostTimeline
  │       ├─ AgentExecutionLog
  │       ├─ AgentApprovalHistory
  │       └─ AgentSkillUsage
```

**Parallelizable:**
- Tabs (A, B, C, D) can be implemented in parallel
- Container assembly (E) waits on all tabs

**Checkpoints:**
- After Track A: Left column visible, agent selection works
- After Track B: Metadata tab shows data
- After Track C: Real-time tabs show data (polling)
- After Track D: Governance tabs show data
- After Track E: Complete panel working

---

### **Phase 2: WebSocket Backend Wiring (Backend Team)**

**Duration:** 2–3 hours (parallel with Phase 1)

**Step 1:** Create WebSocket server in AutonomyAPIServer
- New `broadcastToAgent()` helper
- New `broadcastGlobal()` helper
- Subscription management (Subscriber Maps)
- Initial state on connect

**Step 2:** Wire heartbeat events
- Add broadcast in heartbeat computation loop
- Test with `wscat` client

**Step 3:** Wire cost pulse events
- Add broadcast in cost calculation (post-LLM-call)
- Test with multiple agents

**Step 4:** Wire execution log events
- Add broadcast in execution completion handler
- Test with end-to-end execution

**Step 5:** Integration test
- Enable `REACT_APP_USE_WEBSOCKET=true`
- Verify UI receives streams
- Verify polling fallback works

**Checkpoints:**
- After Step 1: WebSocket server accepts connections
- After Step 2: Heartbeat events streaming
- After Step 3: Cost events streaming
- After Step 4: Execution logs streaming
- After Step 5: UI + backend integrated

---

## Parallel Execution Timeline

```
Phase 1 (UI)                        Phase 2 (Backend)
├─ Hour 1-2: Layout                ├─ Hour 1: WebSocket server
├─ Hour 3-8: Tabs (parallel)       ├─ Hour 2: Heartbeat + cost
├─ Hour 9-12: Container            ├─ Hour 3: Execution logs
├─ Hour 13-15: Testing             └─ Hour 3+: Integration test
└─ Hour 16-18: Polish

Combined: 18 hours max (not sequential 36 hours)
```

---

## Ready to Build Immediately

### **UI Builders**
✅ Components are hollow (no external dependencies)  
✅ All endpoints exist (GET routes already implemented)  
✅ Polling works out-of-the-box  
✅ No blocking on backend  
✅ Can test with mock data right now

**Start here:**
1. Read `README.md` (implementation checklist)
2. Read `types.ts` (understand data shapes)
3. Implement components in parallel
4. Test each component with mock data
5. Wire real data via hooks (already implemented)

### **Backend Builders**
✅ WebSocket spec complete  
✅ No UI changes needed  
✅ Isolated from UI work  
✅ Can integrate anytime  

**Start here:**
1. Read `WEBSOCKET_WIRING.md`
2. Implement WebSocket server
3. Wire event emission points
4. Test with `wscat`
5. Enable UI flag when ready

---

## Code Quality Gates

### **CIC Design System**
- ✅ No inline styles (`style=` attributes)
- ✅ No hardcoded colors
- ✅ No custom spacing (use `cic.spacing.*`)
- ✅ All buttons via `CICButton` + `CICButtonGroup`
- ✅ All stats via `CICStat`
- ✅ All badges via `CICBadge`
- ✅ Build validator enforces this automatically

### **TypeScript**
- ✅ All components typed (no `any`)
- ✅ Props interfaces defined
- ✅ Data shapes from `types.ts`
- ✅ Strict mode enabled

### **Error Handling**
- ✅ All fetch errors caught
- ✅ Errors displayed in UI
- ✅ Network failures graceful
- ✅ No silent failures

### **Testing**
- ✅ Mock data for each component
- ✅ Polling + offline scenarios
- ✅ Button clicks (invoke, pause, restart, snapshot)
- ✅ Tab switching

---

## Git Workflow

**Current branch:** `feature/planning-engine`

**Commits (suggested):**
1. `[claude] feat(agents-panel): add component skeletons + hooks`
2. `[claude] feat(agents-panel): add websocket wiring backend plan`
3. `[human] feat(agents-panel): implement ui components` (when done)
4. `[human] feat(agents-panel): wire websocket backend` (when done)

**PR to main:** After both teams complete + tests pass

---

## Dependencies

### **UI Dependencies**
```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0"
}
```

No new dependencies needed (use existing CIC primitives + tokens).

### **Backend Dependencies**
```json
{
  "ws": "^8.13.0"
}
```

May already be installed (check `package.json`).

---

## File Manifest

**Total files generated:** 16

**Core:**
- `AgentsPanel.tsx` (120 lines)
- `types.ts` (75 lines)

**Hooks:**
- `hooks/useAgentList.ts` (40 lines)
- `hooks/useAgent.ts` (50 lines)

**Components:**
- `components/PanelHeader.tsx` (60 lines)
- `components/PanelBody.tsx` (65 lines)
- `components/AgentList.tsx` (75 lines)
- `components/AgentDetailView.tsx` (50 lines)
- `components/AgentMetadata.tsx` (40 lines)
- `components/AgentHeartbeat.tsx` (45 lines)
- `components/AgentCostTimeline.tsx` (85 lines)
- `components/AgentExecutionLog.tsx` (75 lines)
- `components/AgentApprovalHistory.tsx` (70 lines)
- `components/AgentSkillUsage.tsx` (100 lines)

**Documentation:**
- `WIRING.md` (270 lines)
- `WEBSOCKET_WIRING.md` (380 lines)
- `README.md` (200 lines)
- `BUILD_PLAN.md` (this file, 300 lines)

**Total LOC:** ~1900 (code) + 1150 (docs) = 3050

---

## Success Criteria

### **Phase 1 Complete (UI)**
- [ ] All components rendering with mock data
- [ ] CIC design tokens verified
- [ ] Polling data flow working
- [ ] Controls (buttons) functional
- [ ] All tabs switchable
- [ ] No TypeScript errors

### **Phase 2 Complete (Backend)**
- [ ] WebSocket server accepting connections
- [ ] All 3 streams (heartbeat, cost, logs) emitting
- [ ] Event payloads match schemas
- [ ] Polling fallback working
- [ ] No memory leaks (subscribers cleaned up)

### **Integration Complete**
- [ ] UI receives WebSocket events
- [ ] Real-time updates visible
- [ ] Fallback to polling on disconnect
- [ ] No errors in console
- [ ] Performance: sub-100ms latency

---

## Next Phase

After Agents panel complete:

**Tier 2 Panel 2: Alerts**
- Expected similar scope
- Event-driven from governance layer
- Real-time alerts (warnings, errors, approvals pending)

**Tier 2 Panel 3: Workspace**
- User activity, build status, permissions
- Slower-changing (polling OK)

---

## Notes

- All endpoints already exist (`GET /api/agents`, `POST /api/agents/:id/invoke`, etc.)
- No backend API changes needed for Phase 1 (polling)
- WebSocket is enhancement, not requirement
- UI works fully without backend changes
- Backward compatible (polling always works)

---

## Support

**Questions?**
- UI: See `README.md` + `WIRING.md`
- Backend: See `WEBSOCKET_WIRING.md`
- Types: See `types.ts`
- Overall: See this file

**Blockers?**
- Missing endpoint → Check AutonomyAPIServer routes
- Type error → Check `types.ts`
- Style issue → Check `cic.cls` helpers + ESLint

