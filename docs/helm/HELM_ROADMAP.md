# HELM — Daily Operator OS
## Roadmap & Vision Document
**Status:** Pre-Alpha — Concept Phase  
**Version:** 0.1.0  
**Date:** 2026-06-04  
**Owner:** Chris Sorensen

---

## What Is HELM

HELM is the unified daily operator dashboard for Chris Sorensen's personal and business operations. It replaces the cognitive overhead of checking 6+ apps every morning with a single live interface that pulls real data from connected services and surfaces signal, not noise.

It is not a reporting tool. It is a command center.

HELM sits on top of:
- The **Executive Intelligence Engine** (Gmail triage, file staging)
- The **CIC Ingestion Pipeline** (research intelligence)
- **Rewrite Labs** (business pipeline, client ops)
- **Google Calendar + Gmail** (daily operations)
- **Era Context / bank connections** (Finance OS)
- **HubSpot** (CRM, outreach)

---

## Core Design Principles

1. **Signal over data.** Every panel shows the minimum needed to act. No raw data dumps.
2. **Live, not cached.** Pulls fresh from connectors on every open.
3. **One screen.** No drilling into sub-pages for the daily briefing.
4. **Operator-grade.** Decisions and actions, not just visibility.
5. **Narrated.** `askClaude` generates a 3-sentence morning brief at the top before panels render.

---

## Layout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  🔱 HELM          Wed Jun 4 · Good morning, Chris               │
│  ─────────────────────────────────────────────────────────────  │
│  "2 action items. $302 payment today. CIC Phase 30 on track."  │
├──────────────────┬──────────────────┬───────────────────────────┤
│  TODAY           │  FINANCE OS      │  BUSINESS                 │
│                  │                  │                           │
│  📅 Agenda       │  💰 Net Worth    │  🏗️ Rewrite Labs          │
│  🔴 Action Req   │  📊 Cash Flow    │  🔬 CIC Pipeline          │
│  ⏰ Payments Due │  📈 Investments  │  📬 Outreach Queue        │
│  📦 Deliveries   │  💳 Credit       │  💼 Open Deals            │
│                  │  🚨 Alerts       │                           │
├──────────────────┴──────────────────┴───────────────────────────┤
│  [ Command: "Add lunch meeting 1pm" · "Show RL pipeline" ]      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Panel Specifications

### LEFT — Today

| Widget | Data Source | Notes |
|---|---|---|
| Agenda | Google Calendar MCP | Next 24h blocks |
| @Action Required | Gmail MCP (EIE labels) | Filtered by `@Action Required` label |
| Payments Due | Gmail MCP | Parse financial emails for due dates |
| Deliveries | Gmail MCP | UPS/FedEx/USPS tracking emails |

### CENTER — Finance OS

| Widget | Data Source | Notes |
|---|---|---|
| Net Worth | Era Context MCP | Real account balances |
| Cash Flow | Era Context MCP | Income vs. spend this month |
| Investments | Gmail (Robinhood, Coinbase alerts) + Era Context | Portfolio pulse |
| Credit Score | Gmail (Credit Karma alerts) | Delta from last reading |
| Bills Due | Gmail + Era Context | Next 7 days |
| Alerts | Gmail (Coinbase, Simply Wall St, Robinhood) | Price/portfolio alerts |

### RIGHT — Business

| Widget | Data Source | Notes |
|---|---|---|
| Rewrite Labs Pipeline | HubSpot MCP | Active prospects, deals, stage |
| CIC Phase Status | Filesystem / pipeline logs | Current phase, last run |
| Outreach Queue | HubSpot + Gmail | Pending outreach items |
| Open Deals | HubSpot MCP | Revenue pipeline |

### BOTTOM — Command Strip
Natural language command bar. Triggers actions without leaving HELM:
- Add calendar events
- Label/dismiss emails
- Flag RL prospects
- Trigger pipeline runs

---

## Data Source Map

| Source | Connected | MCP | Finance OS | Today | Business |
|---|---|---|---|---|---|
| Gmail | ✅ | `mcp__ee119579` | ✅ (alerts) | ✅ | — |
| Google Calendar | ✅ | `mcp__55ff68b8` | — | ✅ | — |
| HubSpot | ✅ | `mcp__c99a9e94` | — | — | ✅ |
| Era Context | ❌ | TBD | ✅ | — | — |
| CIC Pipeline | ✅ | filesystem | — | — | ✅ |
| EIE Server | ✅ | `mcp__executive` | — | ✅ | — |

---

## Build Phases

### Phase 1 — Foundation (Now)
- [ ] Connect Era Context MCP for real bank/account data
- [ ] Build TODAY column as first Cowork live artifact
- [ ] Wire Calendar agenda + @Action Required + upcoming payments
- [ ] `askClaude` morning brief at top of artifact
- [ ] Update scheduled triage task to include agenda in output

### Phase 2 — Finance OS
- [ ] Finance panel: net worth, cash flow, upcoming bills
- [ ] Parse Gmail financial alerts into structured Finance signals
- [ ] Credit score delta display
- [ ] Investment portfolio pulse (Robinhood + Coinbase via Gmail)
- [ ] Era Context real balance integration

### Phase 3 — Business Layer
- [ ] Rewrite Labs pipeline panel from HubSpot
- [ ] CIC phase status + last run indicator
- [ ] Outreach queue surface
- [ ] Open deals / revenue tracker

### Phase 4 — Command & Intelligence
- [ ] Natural language command bar
- [ ] Cross-domain correlation alerts ("payment due + portfolio down")
- [ ] Anomaly detection ("spend 23% above average this month")
- [ ] Weekly summary view (vs. daily)
- [ ] Mobile-optimized narrow layout

### Phase 5 — Split Views
- [ ] Separate Personal OS vs. Business OS views
- [ ] Role-switching (personal mode vs. operator mode)
- [ ] Configurable panel layout
- [ ] Dark/light theme toggle

---

## Identity

**Name:** HELM  
**Tagline:** *Command your day.*  
**Logo concept:** Minimal ship's wheel / helm icon — 8-spoke, clean lines, works at small sizes. Primary color: deep orange (matching existing mkdocs palette). Dark background.  
**Aesthetic:** Operator-grade. Dense but readable. No decorative elements. Data speaks.

**Alternate names considered:** FORGE (too CIC-specific), MERIDIAN (too passive), VIGIL (too niche)

---

## Open Questions

- Era Context: free tier limits? Need to verify before building Finance OS panel
- Command bar: Cowork live artifact supports `sendPrompt()` — is this sufficient or do we need a dedicated slash command interface?
- CIC pipeline status: best read from `intel.log` or expose a dedicated status endpoint?
- HELM as a Cowork artifact vs. standalone React app (control-plane dashboard already exists at `apps/control-plane/dashboard`) — merge or separate?

---

## Related Docs

- [Executive Intelligence Engine Manual](../cic/manuals/executive_intelligence_engine.md)
- [CIC System Overview](../cic/CIC_SYSTEM.md)
- [RL System Overview](../rewrite/REWRITE_LABS_SYSTEM.md)
- [Control Plane Dashboard](../../apps/control-plane/dashboard/)
