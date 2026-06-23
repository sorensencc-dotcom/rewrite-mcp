# Agents Panel — WebSocket Wiring Plan

Backend guide for wiring agent event streams to UI.

---

## Overview

Current state: UI polls every 5s via GET endpoints.  
Target state: UI receives real-time streams via WebSocket, with polling fallback.

**Work:** 2–3 hours, isolated from UI, no refactoring needed.

---

## Event Sources

Three backend services emit agent events:

### **1. AutonomyAPIServer (Heartbeat + Cost)**
Location: `cic-ingestion/AutonomyAPIServer.ts`

Events to capture:
- **Heartbeat:** Agent health check, latency, queue depth
- **Cost:** Token usage, execution cost, cumulative cost

Current: Routed via `GET /api/agents/:id/heartbeat` and `GET /api/agents/:id/cost`  
Target: Broadcast to `WS /stream/agents/:id/heartbeat` and `WS /stream/agents/cost`

---

### **2. Audit Agent (Execution Logs)**
Location: `cic-ingestion/agents/AuditAgent.ts` or similar

Events to capture:
- **Execution:** Job completed with input hash, output hash, drift, duration, error

Current: Stored in audit log, retrieved via `GET /api/agents/:id/logs`  
Target: Broadcast to `WS /stream/agents/:id/logs`

---

### **3. Governance Service (Approvals)**
Location: Governance layer, Phase 24+

Events to capture:
- **Approval:** Proposal voted on, result (approve/reject), timestamp, reason

Current: Stored in vault, retrieved via `GET /api/agents/:id/approvals`  
Target: Already slow-changing, polling OK (no WS needed)

---

## WebSocket Server Setup

### **1. Create WebSocket Server Instance**

In `AutonomyAPIServer.ts`:

```typescript
import { WebSocketServer } from 'ws';
import * as http from 'http';

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ── Agent Stream Subscribers ───────────────────────────────────────────────────
// Map of agentId → Set<WebSocket>
const agentSubscribers = new Map<string, Set<WebSocket>>();

// Map of stream type → Set<WebSocket> (for global streams like /stream/agents/cost)
const globalSubscribers = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws) => {
  const url = new URL(ws.url, `http://${ws._socket.remoteAddress}`);
  const pathname = url.pathname;

  // Route to correct handler
  if (pathname.startsWith('/stream/agents/')) {
    handleAgentStreamConnection(ws, pathname);
  }
});

function handleAgentStreamConnection(ws: WebSocket, pathname: string) {
  // /stream/agents/:id/heartbeat
  // /stream/agents/:id/logs
  // /stream/agents/cost (global)

  const match = pathname.match(/\/stream\/agents\/([^/]+)\/([^/]+)/);
  if (match) {
    const [_, agentId, streamType] = match;
    subscribeToAgentStream(ws, agentId, streamType);
  } else if (pathname === '/stream/agents/cost') {
    subscribeToGlobalStream(ws, 'cost');
  }
}

function subscribeToAgentStream(ws: WebSocket, agentId: string, streamType: string) {
  const key = `${agentId}:${streamType}`;
  if (!agentSubscribers.has(key)) {
    agentSubscribers.set(key, new Set());
  }
  agentSubscribers.get(key)!.add(ws);

  ws.on('close', () => {
    agentSubscribers.get(key)?.delete(ws);
  });

  // Send initial state
  sendInitialState(ws, agentId, streamType);
}

function subscribeToGlobalStream(ws: WebSocket, streamType: string) {
  if (!globalSubscribers.has(streamType)) {
    globalSubscribers.set(streamType, new Set());
  }
  globalSubscribers.get(streamType)!.add(ws);

  ws.on('close', () => {
    globalSubscribers.get(streamType)?.delete(ws);
  });
}

async function sendInitialState(ws: WebSocket, agentId: string, streamType: string) {
  try {
    if (streamType === 'heartbeat') {
      const res = await fetch(`/api/agents/${agentId}/heartbeat`);
      const data = await res.json();
      ws.send(JSON.stringify({ type: 'initial', data }));
    } else if (streamType === 'logs') {
      const res = await fetch(`/api/agents/${agentId}/logs`);
      const data = await res.json();
      ws.send(JSON.stringify({ type: 'initial', data }));
    }
  } catch (err) {
    console.error(`Failed to send initial state for ${agentId}:${streamType}`, err);
  }
}

// ── Broadcast Helpers ──────────────────────────────────────────────────────────

function broadcastToAgent(agentId: string, streamType: string, data: any) {
  const key = `${agentId}:${streamType}`;
  const subs = agentSubscribers.get(key);
  if (subs) {
    const msg = JSON.stringify({ type: streamType, data, timestamp: new Date().toISOString() });
    subs.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  }
}

function broadcastGlobal(streamType: string, data: any) {
  const subs = globalSubscribers.get(streamType);
  if (subs) {
    const msg = JSON.stringify({ type: streamType, data, timestamp: new Date().toISOString() });
    subs.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  }
}

export { broadcastToAgent, broadcastGlobal };

server.listen(3000);
```

---

## Event Emission Points

### **1. Heartbeat Events**

**Location:** AutonomyAPIServer heartbeat route

```typescript
// Existing GET /api/agents/:id/heartbeat
app.get('/api/agents/:id/heartbeat', async (req, res) => {
  const agentId = req.params.id;
  const heartbeat = await getAgentHeartbeat(agentId); // existing logic
  res.json(heartbeat);

  // ADD: Broadcast to WebSocket subscribers
  broadcastToAgent(agentId, 'heartbeat', heartbeat);
});
```

**Or:** If heartbeat is computed elsewhere (e.g., agent health check loop), add broadcast:

```typescript
// In agent health check loop (existing)
async function checkAgentHealth(agentId: string) {
  const heartbeat = {
    latencyMs: computeLatency(agentId),
    queueDepth: getQueueDepth(agentId),
    health: determineHealth(agentId),
    lastPulse: new Date().toISOString(),
  };

  // Existing: store in cache, respond to GET
  heartbeatCache.set(agentId, heartbeat);

  // ADD: Broadcast to WebSocket subscribers
  broadcastToAgent(agentId, 'heartbeat', heartbeat);
}
```

---

### **2. Cost Pulse Events**

**Location:** Synthesis Agent or cost tracking service

```typescript
// In Synthesis Agent execution loop (existing)
async function synthesizeResult(input: any) {
  const result = await llmCall(input);
  const cost = calculateCost(result.usage);

  // Existing: store in cost history
  costHistory.push({ timestamp: new Date().toISOString(), cost });

  // ADD: Broadcast to WebSocket subscribers
  broadcastGlobal('cost', {
    agentId: currentAgentId,
    timestamp: new Date().toISOString(),
    cost,
  });

  return result;
}
```

---

### **3. Execution Log Events**

**Location:** Audit Agent or execution handler

```typescript
// In execution completion handler (existing)
async function completeExecution(agentId: string, execution: Execution) {
  const logEntry: ExecutionLogEntry = {
    id: execution.id,
    timestamp: new Date().toISOString(),
    inputHash: hashInput(execution.input),
    outputHash: hashOutput(execution.output),
    driftScore: calculateDrift(execution),
    durationMs: execution.endTime - execution.startTime,
    error: execution.error || null,
  };

  // Existing: store in audit log
  auditLog.append(logEntry);

  // ADD: Broadcast to WebSocket subscribers
  broadcastToAgent(agentId, 'logs', logEntry);
}
```

---

## Event Schemas

### **Heartbeat Event**
```json
{
  "type": "heartbeat",
  "timestamp": "2026-06-20T15:23:50Z",
  "data": {
    "latencyMs": 45,
    "queueDepth": 0,
    "health": "online",
    "lastPulse": "2026-06-20T15:23:50Z"
  }
}
```

### **Cost Pulse Event**
```json
{
  "type": "cost",
  "timestamp": "2026-06-20T15:23:52Z",
  "data": {
    "agentId": "agent-001",
    "timestamp": "2026-06-20T15:23:52Z",
    "cost": 0.0047
  }
}
```

### **Execution Log Event**
```json
{
  "type": "logs",
  "timestamp": "2026-06-20T15:23:45Z",
  "data": {
    "id": "exec-001",
    "timestamp": "2026-06-20T15:23:45Z",
    "inputHash": "abc123...",
    "outputHash": "def456...",
    "driftScore": 0.02,
    "durationMs": 250,
    "error": null
  }
}
```

### **Initial State Event** (on subscription)
```json
{
  "type": "initial",
  "data": {
    "latencyMs": 45,
    "queueDepth": 0,
    "health": "online",
    "lastPulse": "2026-06-20T15:23:50Z"
  }
}
```

---

## Integration Points

### **Heartbeat Loop** (every 5–10s)
Where: AutonomyAPIServer or monitoring service  
Trigger: `broadcastToAgent(agentId, 'heartbeat', data)`

### **Cost Calculation** (on model usage)
Where: Synthesis Agent, after LLM call  
Trigger: `broadcastGlobal('cost', { agentId, timestamp, cost })`

### **Execution Completion** (on job finish)
Where: Audit Agent or execution handler  
Trigger: `broadcastToAgent(agentId, 'logs', logEntry)`

---

## UI Hook Integration

Hooks already support WebSocket. When backend is ready, UI can switch via environment flag:

```typescript
// hooks/useAgent.ts
const USE_WEBSOCKET = process.env.REACT_APP_USE_WEBSOCKET === 'true';

export function useAgent(agentId: string | null, pollIntervalMs: number | null = 0) {
  // Current: polling only
  if (!USE_WEBSOCKET) {
    // existing polling logic
  }

  // Future: WebSocket + polling hybrid
  if (USE_WEBSOCKET && agentId) {
    useEffect(() => {
      const ws = new WebSocket(`ws://${API_HOST}/stream/agents/${agentId}/heartbeat`);
      ws.onmessage = (event) => {
        const { type, data } = JSON.parse(event.data);
        if (type === 'heartbeat' || type === 'initial') {
          // update UI
        }
      };
    }, [agentId]);
  }
}
```

---

## Implementation Checklist

- [ ] Create WebSocket server in AutonomyAPIServer
- [ ] Add broadcast helpers (`broadcastToAgent`, `broadcastGlobal`)
- [ ] Wire heartbeat loop → `broadcastToAgent(agentId, 'heartbeat', ...)`
- [ ] Wire cost calculation → `broadcastGlobal('cost', ...)`
- [ ] Wire execution completion → `broadcastToAgent(agentId, 'logs', ...)`
- [ ] Test WebSocket connections with `wscat` or browser DevTools
- [ ] Test broadcast payload format (matches schemas above)
- [ ] Verify polling fallback still works (no breaking changes)
- [ ] Document WS endpoints in API spec
- [ ] Enable UI via `REACT_APP_USE_WEBSOCKET=true`

---

## Testing

### **Verify WebSocket Endpoints**
```bash
# Terminal 1: Start server
npm start

# Terminal 2: Test connection
npx wscat -c ws://localhost:3000/stream/agents/agent-001/heartbeat

# Should receive:
# {"type":"initial","data":{...}}
# {"type":"heartbeat","data":{...},"timestamp":"..."}
```

### **Verify Broadcast Timing**
- Heartbeat: should broadcast every 5–10s (or on change)
- Cost: should broadcast on each LLM call
- Logs: should broadcast on execution completion

### **Verify Fallback**
- Disable WS in browser DevTools (Network → offline)
- UI should fall back to polling
- No errors in console

---

## Performance Notes

1. **Subscriber Cleanup:** On WebSocket close, remove from subscribers Map
2. **Backpressure:** If client falls behind, messages queue (default ws behavior)
3. **Broadcasting:** Only send to OPEN connections (`readyState === WebSocket.OPEN`)
4. **Memory:** Subscriber Maps cleaned automatically as WebSockets close
5. **Scaling:** For 100+ agents, consider stream multiplexing or separate processes

---

## No UI Refactoring Needed

✅ Hooks already support streaming  
✅ Components already handle stream data  
✅ Error handling already in place  
✅ Polling fallback automatic  

Backend can wire independently and flip UI flag when ready.
