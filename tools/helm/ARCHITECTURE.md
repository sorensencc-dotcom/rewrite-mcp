# Helm Architecture

System design for Phase 47/48 cost intelligence integration into Claude Desktop.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Claude Desktop                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Chat Interface                                       │  │
│  │  • Ask about costs: "How much have I spent?"         │  │
│  │  • Run commands: "/costs", "/routing", "/budget"     │  │
│  │  • MCP tools auto-available                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Status Line (Tier 2)                                 │  │
│  │  💰 $2.34/$10 (23%) | sonnet | ✓                     │  │
│  │  [Click to expand detail panel]                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                        ▲                                      │
│                        │ MCP Protocol                         │
│                        │                                      │
└────────────────────────┼──────────────────────────────────────┘
                         │
                         │
                    ┌────▼─────────────────────────────────┐
                    │  Helm MCP Server                     │
                    │  (tools/mcp/helm-server.ts)         │
                    │                                      │
                    │  Tools:                              │
                    │  • helm:today                        │
                    │  • helm:trends                       │
                    │  • helm:routing-status               │
                    │  • helm:set-preference               │
                    │  • helm:budget-warning               │
                    └────┬──────────────────────────────────┘
                         │ (Node.js process)
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────────┐        ┌─────────────────────┐
│  Command Handlers    │        │  Status Line Widget │
│ (helm-commands.ts)   │        │ (status-line.ts)    │
│                      │        │                     │
│ /costs               │        │ formatStatusText()  │
│ /routing             │        │ getHoverText()      │
│ /budget              │        │ getDetailPanel()    │
│ /prefer-local (T2)   │        │ checkAlert()        │
│ /quality (T2)        │        │                     │
│ /cost-forecast (T3)  │        │ Config:             │
│ /savings-analysis(T3)│        │ • updateInterval    │
│                      │        │ • showIcon          │
│                      │        │ • expandOnClick     │
└────────┬─────────────┘        └──────────┬──────────┘
         │                                 │
         └─────────────────┬───────────────┘
                           │
                    ┌──────▼──────────────────┐
                    │  Helm Data Layer         │
                    │                          │
                    │  Reads:                  │
                    │  • helm.json (today)     │
                    │  • daily/*.json          │
                    │  • costLog.json          │
                    │  • .agent-prefs.json     │
                    └──────┬──────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌─────────────────────────────┐      ┌──────────────────────────┐
│  Phase 48 (Cost Tracking)    │      │  Phase 47 (Routing)      │
│                              │      │                          │
│  benchmarks/costs/           │      │  benchmarks/routing/     │
│  • models.ts                 │      │  • router.ts (47A)       │
│  • subscriptions.ts          │      │  • interceptor.ts (47B)  │
│  • system.ts                 │      │  • agent.ts (47C)        │
│  • reports/generate.ts       │      │                          │
│  • reports/helm.ts           │      │  Outputs:                │
│                              │      │  • .agent-prefs.json     │
│  Outputs:                    │      │  • Routing decisions     │
│  • costLog.json              │      │  • Budget enforcement    │
│  • reports/daily/*.json      │      │                          │
│  • reports/helm.json         │      │                          │
└─────────────────────────────┘      └──────────────────────────┘
```

---

## Data Flow

### 1. User Asks About Costs

```
User: "How much have I spent today?"
  ↓
[Claude Desktop Chat Interface]
  ↓ (MCP tool selection)
[Helm MCP Server] calls helm:today()
  ↓
[Helm Data Layer] reads helm.json
  ↓
[Phase 48 Reports] returns: { spend: $2.34, budget: $10, ... }
  ↓
[MCP Server] formats JSON response
  ↓
[Claude] generates human response: "You've spent $2.34..."
```

### 2. User Sets Routing Preference

```
User: /routing --set rewrite claude-sonnet-4-6
  ↓
[Command Handler] (helm-commands.ts)
  ↓ (validates input)
[MCP Tool] helm:set-preference() called
  ↓
[Phase 47 Agent] updates .agent-prefs.json
  ↓
[Router] reads updated prefs
  ↓
Future calls use claude-sonnet-4-6 for rewrite tasks
```

### 3. Real-time Cost Update

```
[Phase 48 Logging]
  API call occurs → logAnthropicCall() → costLog.json updated
  ↓
[Phase 48 Agent] (periodic, every 5 minutes)
  Reads costLog → Generates helm.json
  ↓
[Helm Status Line] (polls every 5 seconds)
  Reads helm.json → Updates status bar display
  ↓
Claude Desktop shows updated cost in real-time
```

### 4. Budget Alert

```
[Phase 47 Cost Agent] (checks every 60 seconds)
  ↓ (reads helm.json)
Spend > 80% of budget?
  ↓ YES
  Emit: { type: "budget-warning", level: "warning" }
  ↓
[Status Line] displays: ⚠️
  ↓
User sees alert, can run: /prefer-local on
```

---

## File Organization

```
benchmarks/
├── costs/                          # Phase 48: Cost tracking
│   ├── models.ts                   # Provider pricing constants
│   ├── subscriptions.ts            # Subscription tier mappings
│   ├── system.ts                   # Central cost logger
│   ├── costLog.json                # [Generated] Append-only transaction log
│   ├── reports/
│   │   ├── generate.ts             # Report generator
│   │   ├── helm.ts                 # Helm dashboard artifact
│   │   ├── helm.json               # [Generated] Today's metrics
│   │   ├── daily/                  # [Generated] Daily reports
│   │   ├── weekly/                 # [Generated] Weekly reports
│   │   └── monthly/                # [Generated] Monthly reports
│   └── README.md
│
├── routing/                        # Phase 47: Cost-aware routing
│   ├── policy.ts                   # Types, configs, defaults
│   ├── router.ts                   # Model selection (47A)
│   ├── interceptor.ts              # Request wrapper (47B)
│   ├── agent.ts                    # Cost agent (47C)
│   ├── .agent-prefs.json           # [Generated] User preferences
│   ├── README.md
│   ├── INTEGRATION.md
│   ├── example.ts
│   └── ARCHITECTURE.md
│
└── tools/                          # Tools & integrations
    └── helm/
        ├── helm-server.ts          # [tools/mcp/] MCP server
        ├── helm-commands.ts        # CLI command handlers
        ├── status-line.ts          # Status bar widget
        ├── dashboard.html          # Web UI (Tier 3)
        ├── server.ts               # Dashboard HTTP server
        ├── README.md               # User guide
        ├── SETUP.md                # Installation
        ├── ARCHITECTURE.md         # This file
        └── IMPLEMENTATION_STATUS.md
```

---

## Component Details

### Helm MCP Server (helm-server.ts)

**Purpose:** Expose Helm functionality to Claude Desktop via MCP protocol

**Exports:**
```typescript
export const tools = {
  "helm:today": { ... },
  "helm:trends": { ... },
  "helm:routing-status": { ... },
  "helm:set-preference": { ... },
  "helm:budget-warning": { ... },
};

export function handleToolCall(toolName, input): string { ... }
```

**Dependencies:**
- Phase 47 agent (for preferences)
- Phase 48 reports (for cost data)

**Runtime:** Node.js process launched by Claude Desktop

### Command Handlers (helm-commands.ts)

**Purpose:** Implement CLI commands that humans use in chat

**Commands:**
- `cmdCosts(args)` → returns formatted cost summary
- `cmdRouting(args)` → returns routing status + recent decisions
- `cmdBudget(args)` → returns budget status
- `cmdPreferLocal(args)` → toggles Ollama preference
- `cmdQuality(args)` → sets quality threshold
- `cmdCostForecast(args)` → projects future spend
- `cmdSavingsAnalysis(args)` → shows savings from routing

**Flow:**
```
User types: /costs --trends
  ↓
Chat interface parses command
  ↓
Calls: handleCommand("costs", "--trends")
  ↓
Calls: cmdCosts("--trends")
  ↓
Reads: helmTrends(), formats as markdown
  ↓
Returns formatted text to Claude
  ↓
Claude displays in chat
```

### Status Line Widget (status-line.ts)

**Purpose:** Display cost in editor status bar (Tier 2)

**Functions:**
- `getStatusLineText()` → `"💰 $2.34/$10 (23%) | sonnet | ✓"`
- `getHoverText()` → detailed breakdown on hover
- `getDetailPanel()` → expanded card on click
- `checkBudgetAlert()` → returns alert if budget warning

**Updates:**
- Polled every 5 seconds (configurable)
- Reads `helm.json` directly
- No MCP overhead for status line

**Config:**
```typescript
defaultConfig = {
  updateIntervalMs: 5000,
  expandOnClick: true,
  alertOnBudgetWarning: true,
  showIcon: true,
  showBudget: true,
  showModel: true,
  showBudgetPercent: true,
};
```

### Dashboard Server (server.ts)

**Purpose:** Serve web-based analytics dashboard (Tier 3)

**Routes:**
- `GET /` → dashboard.html
- `GET /api/helm/today` → helm:today() response
- `GET /api/helm/trends` → helm:trends() response
- `GET /api/helm/routing` → helm:routing-status() response
- `GET /api/helm/tools` → available tools list
- `GET /health` → health check

**Port:** 3847 (default, configurable)

**Server:**
```bash
npx ts-node tools/helm/server.ts
# Then open: http://localhost:3847/helm
```

---

## Interaction Sequences

### Scenario 1: Check Budget Status

```
Timeline:
┌─ User ─────────────────────────────────────────────┐
│ (in Claude Desktop chat)                            │
│ "What's my budget status?"                          │
└────────────────────────────────────────────────────┘
                      ↓
┌─ Claude Desktop ────────────────────────────────────┐
│ Select tool: helm:today                             │
└────────────────────────────────────────────────────┘
                      ↓
┌─ Helm MCP Server ──────────────────────────────────┐
│ helmToday():                                        │
│  • Read helm.json                                   │
│  • Return: { spend, budget, byProvider }           │
└────────────────────────────────────────────────────┘
                      ↓
┌─ Claude ───────────────────────────────────────────┐
│ Format response:                                    │
│ "You've spent $2.34 of $10.00 (23% used)...       │
│  Remaining budget: $7.66"                          │
└────────────────────────────────────────────────────┘

Latency: <100ms
```

### Scenario 2: Override Routing for Rewrite

```
Timeline:
┌─ User ─────────────────────────────────────────────┐
│ "/routing --set rewrite claude-sonnet-4-6"         │
└────────────────────────────────────────────────────┘
                      ↓
┌─ Command Handler ──────────────────────────────────┐
│ cmdRouting("--set rewrite claude-sonnet-4-6")     │
│ → helmSetPreference({                              │
│     taskType: "rewrite",                           │
│     model: "claude-sonnet-4-6"                     │
│   })                                               │
└────────────────────────────────────────────────────┘
                      ↓
┌─ Phase 47 Agent ───────────────────────────────────┐
│ setTaskTypeOverride("rewrite", "claude-sonnet-4-6")│
│ → Update .agent-prefs.json:                        │
│   {                                                │
│     "taskTypeOverrides": {                         │
│       "rewrite": "claude-sonnet-4-6",  ← Updated   │
│       ...                                          │
│     }                                              │
│   }                                                │
└────────────────────────────────────────────────────┘
                      ↓
┌─ Phase 47 Router ──────────────────────────────────┐
│ Next call to selectModel({ taskType: "rewrite" })  │
│ → Reads .agent-prefs.json                          │
│ → If override set: use claude-sonnet-4-6           │
│ → (Ignores quality threshold, budgets)             │
└────────────────────────────────────────────────────┘
                      ↓
┌─ Claude ───────────────────────────────────────────┐
│ "✓ Set rewrite to prefer claude-sonnet-4-6"       │
└────────────────────────────────────────────────────┘

Latency: ~50ms
```

### Scenario 3: Real-time Status Line Update

```
Timeline (continuous loop):
┌─ Benchmark Running ────────────────────────────────┐
│ logAnthropicCall({...})                            │
│ → costLog.json updated                             │
└────────────────────────────────────────────────────┘
                      ↓ [every 5 min]
┌─ Phase 48 Agent ───────────────────────────────────┐
│ generateDailyReport()                              │
│ → Reads costLog.json                               │
│ → Writes helm.json with aggregated costs           │
└────────────────────────────────────────────────────┘
                      ↓ [every 5 sec]
┌─ Status Line Poller ───────────────────────────────┐
│ getStatusLineText():                               │
│  • Read helm.json                                   │
│  • Parse: spend, budget, model                     │
│  • Format: "💰 $X/$Y (Z%) | model | status"       │
│  → Update display                                   │
└────────────────────────────────────────────────────┘
                      ↓
┌─ Claude Desktop ───────────────────────────────────┐
│ Status bar shows: 💰 $2.34/$10 (23%) | sonnet | ✓ │
└────────────────────────────────────────────────────┘

Latency (status update): <10ms
Refresh interval: 5 seconds
```

---

## Error Handling

### Missing Cost Data

```
User asks: /costs
  ↓ (helm.json not found)
Response: "📊 No cost data available yet. 
           Run a benchmark to generate data. 
           Example: npm run bench:opus-sonnet"
```

### Invalid Preference Override

```
User asks: /routing --set invalid-type claude-sonnet-4-6
  ↓ (validates taskType)
Response: "Error: Unknown task type 'invalid-type'. 
           Valid: rewrite, analysis, generation, chat"
```

### Budget Exceeded

```
Phase 47 Agent detects: spend > dailyBudget
  ↓
helmBudgetWarning() returns:
  {
    warning: true,
    level: "critical",
    message: "🚨 OVER BUDGET: Spent $10.50 of $10.00..."
  }
  ↓
Status line shows: ⚠️ 🚨
  ↓
User can run: /prefer-local on
```

---

## Scalability

### Data Volume

- **costLog.json:** Grows ~1 KB per API call
  - 100 calls/day × 1 KB = 100 KB/day
  - 1 year = ~36 MB (acceptable)
  - Archive/rotate annually

- **helm.json:** Constant size (~5 KB)
  - Updated every 5 minutes
  - No growth

- **Daily reports:** One file per day (~2 KB)
  - 365 days/year = 730 KB/year (acceptable)

### Performance

- **MCP tool call:** <50ms (bottleneck: file read)
- **Status line update:** <10ms
- **Dashboard render:** <1s

### Concurrency

- Safe: All reads are idempotent
- Safe: costLog.json is append-only (no overwrites)
- Safe: helm.json is rebuilt each time (atomic writes)

---

## Security

### Data Privacy

- All data stored locally (`benchmarks/costs/`)
- No external API calls
- No telemetry

### User Preferences

- `.agent-prefs.json` is local file
- Not synced or shared
- Can be deleted to reset preferences

### Web Dashboard (Tier 3)

- Runs on `localhost:3847` only
- Not exposed to internet (unless user explicitly does)
- No authentication (localhost-only)

---

## Future Extensions

### Tier 2+

- [ ] Budget persistence to Claude config
- [ ] Slack/email alerts
- [ ] Multi-user cost aggregation
- [ ] Team dashboards

### Tier 3+

- [ ] ML-based spend forecasting
- [ ] Anomaly detection
- [ ] Cost attribution (per project, per user)
- [ ] BI export (CSV, Parquet)

---

## Debugging

### Enable verbose logging

In `helm-server.ts`:
```typescript
export function handleToolCall(toolName, input) {
  console.log(`[Helm] Tool called: ${toolName}`, input);
  // ... rest of function
}
```

### Check MCP server is running

```bash
ps aux | grep "helm-server"
# or
lsof -i :3847  # For dashboard server
```

### Verify data files

```bash
cat benchmarks/costs/reports/helm.json | jq .
cat benchmarks/routing/.agent-prefs.json | jq .
```

---

## Related Documentation

- **Phase 47:** `benchmarks/routing/README.md`
- **Phase 48:** `benchmarks/costs/README.md`
- **Integration:** `benchmarks/routing/INTEGRATION.md`
- **Setup:** `SETUP.md`
- **Implementation:** `IMPLEMENTATION_STATUS.md`
- **API Reference:** `README.md`
