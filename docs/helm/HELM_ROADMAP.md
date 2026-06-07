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

### Phase 1 — Foundation ✅ COMPLETE (2026-06-04)
- [x] Connect Era Context MCP for real bank/account data
- [x] Build TODAY column as first Cowork live artifact
- [x] Wire Calendar agenda + @Action Required + upcoming payments
- [x] `askClaude` morning brief at top of artifact
- [x] Gmail triage label counts surfaced

### Phase 2 — Finance OS ✅ COMPLETE (2026-06-04)
- [x] Finance panel: composite net worth, cash flow, upcoming bills
- [x] Era Context real balance integration (2-account free tier)
- [x] Full 10-account snapshot via rotation workflow — $2,059,038 NW
  - Live: Citizens One Deposit + Fidelity My Checking
  - Snapshot: 401k, FACTSET Plan, State Street SS, Rollover IRA, HSA, Olivia's 529, Joint Checking
- [x] Market alerts from Gmail (Coinbase, Simply Wall St)
- [x] Investment proportion bar visualization
- [ ] Credit score delta display (Credit Karma Gmail parsing — Phase 3)
- [ ] Full Era Context paid tier (unlock all accounts live)

### Phase 3 — Business Layer (Next)
- [ ] RL pipeline panel — live HubSpot deals with stage, amount, close date
- [ ] CIC live status — read from `intel.log` or pipeline health endpoint
- [ ] CIC phase progress — derive from git log or HANDOFF.md
- [ ] Outreach queue surface from HubSpot
- [ ] Revenue pipeline total
- [ ] Credit score delta widget from Gmail Credit Karma alerts

### Phase 4 — Command & Intelligence
- [ ] Natural language command bar (`sendPrompt` integration)
- [ ] Cross-domain correlation alerts ("payment due + portfolio down this week")
- [ ] Anomaly detection ("spend 23% above 3-month average")
- [ ] Weekly digest view (vs. daily)
- [ ] Snapshot refresh prompt — remind Chris to rotate when >30 days stale

### Phase 5 — Split Views & Polish
- [ ] Personal OS vs. Business OS tab switching
- [ ] Configurable panel layout (drag to reorder)
- [ ] Investment snapshot auto-refresh workflow (CSV import or custom Fidelity connector)
- [ ] Mobile-optimized narrow layout

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
