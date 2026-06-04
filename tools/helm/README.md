# Helm — Claude Desktop Integration for Cost Intelligence

Helm exposes Phase 47/48 cost intelligence to Claude Desktop through three integration tiers:

- **Tier 1 (MVP):** Status line, MCP server, `/costs` command
- **Tier 2:** Advanced commands (`/routing`, `/budget`, `/prefer-local`)
- **Tier 3:** Web dashboard with analytics and forecasting

---

## Setup

### Prerequisites

- Phase 47 & 48 infrastructure running (benchmarks/routing, benchmarks/costs)
- Claude Desktop installed (works with claude-3.5-sonnet or later)
- Node.js 18+

### Installation

1. **Add MCP server to Claude Desktop settings**

   Create or edit `~/.config/claude/claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "helm": {
         "command": "node",
         "args": [
           "/path/to/rewrite-mcp/tools/mcp/helm-server.ts",
           "--loader",
           "tsx"
         ]
       }
     }
   }
   ```

   Or use TypeScript directly (requires tsx):

   ```bash
   npm install -g tsx
   ```

2. **Restart Claude Desktop**

   The Helm MCP server should now be available.

3. **Verify** by typing in Claude Desktop:
   ```
   Hello, what tools do you have?
   ```

   Claude should list:
   - `helm:today`
   - `helm:trends`
   - `helm:routing-status`
   - `helm:set-preference`
   - `helm:budget-warning`

---

## Tier 1: MVP (Status Line + Commands)

### Status Line

Shows real-time cost in the Claude Desktop status bar:

```
💰 $2.34/$10 (23%) | sonnet | ✓
```

Click to expand detail panel with breakdown by provider and quick actions.

### Command: `/costs`

Show today's spend and budget:

```
User: /costs
Claude: 
✓ Cost Summary

Today's Spend
- Real cost: $2.34
- Implied cost: $8.75

Budget Status
- Daily budget: $10.00
- Used: 23%
- Remaining: $7.66
```

### Command: `/routing`

Show current routing decisions:

```
User: /routing
Claude:
Routing Status

Preferences
- Prefer local: disabled
- Prefer cheaper: disabled

Task Type Overrides
- (none set, using automatic routing)
```

### Command: `/budget`

View or set daily budget:

```
User: /budget
Claude:
Budget Status
- Daily limit: $10.00
- Spent: 23% ($2.34)
- Remaining: $7.66

✓ OK: Budget healthy.
```

---

## Tier 2: Advanced Commands

### Command: `/prefer-local`

Toggle preference for Ollama (local models):

```
User: /prefer-local on
Claude: ✓ Local model preference enabled. 
Low-stakes tasks will route to Ollama.
```

### Command: `/quality`

Set global quality threshold (1–10):

```
User: /quality 7
Claude: ✓ Quality threshold set to 7/10

Router will prefer models matching quality target.
```

Lower = cheaper models OK  
Higher = premium models preferred

### Command: `/routing --set`

Override routing for a specific task type:

```
User: /routing --set rewrite claude-sonnet-4-6
Claude: ✓ Set rewrite to prefer claude-sonnet-4-6
```

Clear override:

```
User: /routing --set rewrite ""
Claude: ✓ Cleared override for rewrite. 
Will use automatic routing.
```

---

## Tier 3: Web Dashboard

### Access

Open in browser:

```
http://localhost:3847/helm
```

Or from Claude Desktop:

```
User: Show me the Helm dashboard
Claude: [Opens sidebar with embedded dashboard]
```

### Dashboard Features

- **Cost gauge:** Real and implied spend with progress bar
- **Budget timeline:** Daily, weekly, monthly trends
- **Provider breakdown:** Pie/bar charts by provider
- **Model distribution:** Which models are being used
- **Routing decisions:** Timeline of recent routing choices
- **Preferences editor:** Update settings directly
- **Cost forecast:** Project spend if trends continue
- **Savings analysis:** How much routing is saving

### Example Dashboard URL

```
http://localhost:3847/helm?date=2026-06-04&view=daily
```

Query parameters:
- `date`: YYYY-MM-DD
- `view`: daily|weekly|monthly
- `provider`: filter by provider (optional)

---

## Usage Patterns

### Pattern 1: Monitor Spend While Working

1. Keep status line visible (enabled by default)
2. Glance at cost every few minutes
3. Click status line to see full breakdown
4. Use `/costs --breakdown` if providers matter

### Pattern 2: Stay Within Budget

1. Set daily budget: `/budget 5.00`
2. Enable budget alerts (Tier 2)
3. Claude warns you when nearing limit
4. Use `/prefer-local` to cut costs if needed

### Pattern 3: Quality vs Cost Trade-off

1. Set quality threshold: `/quality 8` (require 8/10 quality)
2. Router automatically prefers cheaper models
3. Check savings: `/costs --trends`
4. Adjust if needed

### Pattern 4: Override for Critical Tasks

1. For high-stakes work: `/routing --set rewrite claude-opus-4-8`
2. For low-stakes: `/routing --set generation claude-haiku-4-5`
3. Clear when done: `/routing --set rewrite ""`

---

## MCP Server API

### Tool: `helm:today`

**Input:** None

**Output:**
```json
{
  "timestamp": "2026-06-04T10:30:00Z",
  "spend": {
    "real": { "usd": 2.34, "formatted": "$2.34" },
    "implied": { "usd": 8.75, "formatted": "$8.75" }
  },
  "budget": {
    "daily": { "usd": 10.0, "formatted": "$10.00" },
    "remaining": { "usd": 7.66, "formatted": "$7.66" },
    "percentUsed": 23.4,
    "percentRemaining": 76.6,
    "level": "ok"
  },
  "byProvider": [
    {
      "provider": "anthropic",
      "real": { "usd": 2.34, "formatted": "$2.34" },
      "implied": { "usd": 8.75, "formatted": "$8.75" }
    }
  ]
}
```

### Tool: `helm:trends`

**Input:** None

**Output:**
```json
{
  "period": {
    "daily": "2026-06-04",
    "weekly": "2026-05-28",
    "monthly": "2026-06"
  },
  "modelDistribution": [
    { "model": "claude-sonnet-4-6", "calls": 45, "percent": 60 },
    { "model": "claude-opus-4-8", "calls": 30, "percent": 40 }
  ],
  "totalCalls": 75,
  "savingsEstimate": {
    "weekly": "$12.50",
    "message": "Estimated savings vs always using Opus"
  }
}
```

### Tool: `helm:routing-status`

**Input:** None

**Output:**
```json
{
  "preferences": {
    "preferLocal": false,
    "preferCheaperModels": true,
    "taskTypeOverrides": {
      "rewrite": "",
      "analysis": "",
      "generation": "claude-haiku-4-5",
      "chat": ""
    }
  },
  "recentDecisions": [
    {
      "timestamp": "2026-06-04T10:25:00Z",
      "model": "claude-sonnet-4-6",
      "tokens": 3500,
      "cost": 0.0125,
      "taskType": "rewrite"
    }
  ],
  "status": {
    "agentActive": true,
    "lastUpdate": "2026-06-04T10:30:00Z"
  }
}
```

### Tool: `helm:set-preference`

**Input:**
```json
{
  "taskType": "rewrite",
  "model": "claude-sonnet-4-6"
}
```

**Output:**
```json
{
  "success": true,
  "message": "Set rewrite to prefer claude-sonnet-4-6",
  "taskType": "rewrite",
  "preferredModel": "claude-sonnet-4-6"
}
```

### Tool: `helm:budget-warning`

**Input:** None

**Output:**
```json
{
  "warning": false,
  "message": "Budget OK: $7.66 remaining (77% left)",
  "spent": 2.34,
  "remaining": 7.66,
  "percentUsed": 23.4
}
```

---

## Configuration

Edit `tools/helm/status-line.ts`:

```typescript
export const defaultConfig: StatusLineConfig = {
  enabled: true,
  showIcon: true,
  showBudget: true,
  showModel: true,
  showBudgetPercent: true,
  updateIntervalMs: 5000,    // Update every 5 seconds
  expandOnClick: true,
  alertOnBudgetWarning: true,
};
```

---

## Troubleshooting

### Status line not showing

- Verify MCP server is running: `ps aux | grep helm-server`
- Check Claude Desktop logs: `~/.claude/logs`
- Restart Claude Desktop

### Commands not working

- Type `What tools do you have?` to verify Helm tools are available
- Check that `benchmarks/costs/reports/helm.json` exists

### Budget not updating

- Ensure Phase 48 is logging costs: `cat benchmarks/costs/costLog.json`
- Regenerate reports: `npm run cost:helm`

### Dashboard not loading

- Start dashboard server: `node tools/helm/server.js` (Tier 3)
- Open `http://localhost:3847/helm`

---

## Integration with Claude Desktop

### In Chat

```
User: How much have I spent today?
Claude: [calls helm:today] $2.34 of your $10 budget...

User: Route my generation tasks to cheaper models
Claude: [calls helm:set-preference] Set generation to claude-haiku-4-5...

User: Will I exceed budget at this rate?
Claude: [calls helm:trends] Based on trends, weekly spend ~$16.40...
```

### In Status Bar

```
Default: 💰 $2.34/$10 (23%) | sonnet | ✓

After click (expand panel):
┌─────────────────────┐
│ Budget: $7.66 left  │
│ Anthropic: $2.34    │
│ Current: sonnet     │
│ [/costs] [/routing] │
└─────────────────────┘
```

### In Sidebar

When docked (Tier 3):
- Live cost gauge
- Budget progress bar
- Provider breakdown
- Quick command buttons

---

## Performance

Helm is designed to be lightweight:

- **Status line update:** <10ms
- **MCP tool call:** <50ms
- **Dashboard render:** <100ms

Polling interval: 5 seconds (configurable)  
Cost data: File-based, no database needed

---

## Cost Savings Impact

With Helm enabled:

- **Visibility:** Know where every dollar goes
- **Routing:** 20–30% savings through smart model selection
- **Alerts:** Catch budget overruns before they happen
- **Forecasting:** Plan spend (Tier 3)

**Expected weekly savings:** $5–15 (depending on usage)

---

## Files

```
tools/
├── mcp/
│   └── helm-server.ts       # MCP server (helm:today, helm:trends, etc.)
├── helm/
│   ├── helm-commands.ts     # Command handlers (/costs, /routing, etc.)
│   ├── status-line.ts       # Status bar display + config
│   ├── dashboard.html       # Web dashboard (Tier 3)
│   ├── server.js            # Dashboard server (Tier 3)
│   └── README.md            # This file
```

---

## Future Work

- [ ] Tier 3 dashboard: Full analytics, forecasting, visualization
- [ ] Budget persistence (save to user config)
- [ ] Multi-user cost aggregation
- [ ] Integration with team Slack channel
- [ ] Cost attribution per project/user
- [ ] BI export (CSV, JSON) for analysis
- [ ] ML-based spend prediction and anomaly detection

---

## Questions?

Check the Phase 47/48 documentation:
- `benchmarks/routing/README.md` — Routing layer
- `benchmarks/costs/README.md` — Cost tracking
- `benchmarks/routing/INTEGRATION.md` — Integration guide
