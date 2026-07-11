# REWRITE_LABS_SYSTEM.md
Version: 1.2.0
Updated: 2026-05-10
Author: Chris Sorensen

Rewrite Labs — System Specification
Purpose: Operator-grade system document for Rewrite Labs AI-driven website redesign engine

---

## 1. Project Identity

Rewrite Labs is an AI-driven website redesign company operated by Chris Sorensen.

Mission:
- Discover outdated or underperforming SMB websites.
- Generate modern redesigns using AI.
- Support outreach and conversion with operator-grade, automated workflows.

Rewrite Labs is separate from CIC but shares the same engineering philosophy.

Collaborators: Chris Sorensen (founder/operator), Balraj (engineering).

---

## 2. Core System Components

### Discovery Pipeline
- Scans and identifies candidate domains.
- Scores sites based on age, UX quality, and business potential.
- Scoring filter: only run full pipeline on sites above threshold; discard modern sites early (saves cost).
- Google Maps API integration (Phase 2) — find outdated SMB sites by category + city.

### Redesign Engine
- Fetches target site → fingerprints → AI-classifies → AI-rewrites.
- Style Harvester: scans modern reference sites, extracts design signatures, generates HTML templates.
- Content Filler: extracts business content via AI, fills template placeholders.
- Unified Pipeline: single command — fetch → fingerprint → extract → match template → fill → before/after preview.
- Before/After Preview Page: full-width toggle design (After loads first, Before on toggle), blob URL iframe, dark toolbar, CTA footer.
- Headless browser support (Puppeteer): fallback for JS-rendered sites.

### Outreach Pipeline
- Generates tailored, personalized outreach messages per prospect.
- Tracks follow-ups and responses.
- Approval-queue UI: human-in-the-loop gate before send (in progress).
- Integration with Instantly or Smartlead for deliverability and sequencing (planned).

### Ops & Governance
- Operator-grade documentation, structured logging, and system standards.
- Integration with AI tools and MCP.
- ADR log for architecture decisions: ADR_001, ADR_002.

---

## 3. AI Model Architecture

| Stage | Model | Est. Cost |
|---|---|---|
| Scan + Classify | Claude Haiku | ~$0.001/site |
| Content Extract + Fill | Claude Haiku | ~$0.002/site |
| Client Delivery (full rewrite) | Claude Sonnet | ~$0.38/site |

**Active upgrade:** Site audit pipeline targeting Claude Opus 4.7 Vision for screenshot-based UX analysis. Target: >90% precision detecting poor UX patterns. Benchmark in progress against 50 real legacy sites.

**Note:** Switch `REWRITE_MODEL` in `poc-sweeper` from `claude-haiku-4-5` → `claude-sonnet-4-6` only for final paid client delivery.

---

## 4. Intelligence-Driven Roadmap Items (Week of May 8, 2026)

Action items ranked P0–P2 by impact and build-readiness.

### [P0] Upgrade Site Audit Pipeline to Claude Opus 4.7 Vision
Rationale: Opus 4.7 achieves 98.5% visual acuity on computer-use tasks, 3.75MP image support, 1M token context. Anthropic dropped pricing 67% ($5/M input tokens), making it viable at pipeline scale.
First step: Swap vision model. Benchmark accuracy on 50 real legacy site screenshots. Target: >90% precision on poor UX pattern detection.

### [P0] Build Agentic Outreach Module with Human-Approval Gate
Rationale: Agentic outreach shows 35% higher reply rates and 40% more meeting bookings within 24 hours. Outreach is the current missing link in the Rewrite Labs loop.
First step: Prototype approval-queue UI for Chris/Balraj to review AI-drafted outreach emails before send. Integrate with Instantly or Smartlead.

### [P1] Auto-Generate Conversion Impact Proposal Report Per Prospect
Rationale: Benchmark data (18–34% conversion lift, 3.2x faster ROI recovery from AI redesigns) is credible third-party proof. Auto-generated proposal per prospect raises close rates.
First step: Design PDF/web proposal template pulling prospect's site score, AI redesign mockup, and benchmark conversion uplift data. Auto-attach with each outreach send.

### [P1] Add "You Own the Code" Delivery Tier (Clean Handoff)
Rationale: Wix/Squarespace lock users into proprietary ecosystems. HTML/Tailwind or Next.js output with no platform dependency is a genuine differentiator.
Delivery tiers: (a) hosted redesign managed by Rewrite Labs, (b) code handoff package. Price accordingly. Mention in outreach copy.

### [P2] Spike Figma MCP Server Remote for Headless Design Pipeline
Rationale: Figma remote MCP server connects from any IDE or AI agent without the desktop app.
First step: Assign to Balraj. Prototype: site URL → Claude Computer-Use screenshot analysis → Figma MCP → editable Figma file → code export.

---

## 5. Competitor Watch (May 2026)

| Competitor | Notes | Threat Level |
|---|---|---|
| Snap2Code | Most direct overlap: URL → theme → redesign preview → production code. Early-stage; no outreach component. | 🔴 Monitor closely |
| Framer | Wireframer + Workshop AI; raised $100M at $2B valuation. Targets designers, not SMB owners. | 🟡 Adjacent |
| Google Stitch | Free Gemini-powered prompt/image → responsive UI with HTML/CSS export. Raises baseline expectation for free AI design. | 🟡 Adjacent |
| v0 by Vercel | ~72% screenshot-to-code accuracy (React/Next.js). Tooling layer, not a service — potential pipeline component. | 🟢 Low / tool candidate |
| Wix ADI 2026 | Conversational refinement post-generation; dominant at SMB scale but generic output. | 🟡 Established incumbent |

---

## 6. Technical Environment

- Node 20+
- ESM with explicit `.js` extensions
- Structured JSON logs
- BullMQ job queue (in codebase)
- SQLite: persist lead records, scan results, template matches, outreach status (production target)
- Operator-grade coding standards: deterministic behavior, explicit versioning, boundary validation, no hallucination

---

## 7. Workflow Standards

- Deterministic, implementation-ready output.
- Modular, composable components.
- Verified vs. inferred vs. unknown separation.
- No filler or generic best practices.

---

## 8. Template Library (Current State)

**Deployed verticals:** plumber, dental, restaurant, roofing, auto repair (via Style Harvester).

**Pending additions:** legal, fitness, landscaping, salon/spa.

**Style variants per vertical:** e.g. `hvac_bold_hero`, `hvac_clean_minimal`, `hvac_warm_local`.

---

## 9. Production Architecture Targets

- Wire sweeper → harvester → filler as a proper pipeline (BullMQ already in codebase).
- Database: persist lead records, scan results, template matches, outreach status.
- Dashboard: simple UI to view leads, preview pages, outreach sent/opened.
- Multi-tenant: support multiple users/accounts when productized.

---

## 10. State Management

Volatile Rewrite Labs state lives in:

- **REWRITE_LABS_STATE.md** (OneDrive / Rewrite Labs Root)

Includes: discovery pipeline status, redesign tasks, outreach pipeline status, engineering tasks, next actions.

Never stored in AI memory.

---

## 11. Memory Governance

Claude stores only stable, evergreen facts:

- Rewrite Labs is an AI-driven redesign company run by Chris.
- It uses discovery, redesign, and outreach pipelines.
- It follows operator-grade, deterministic standards.

Volatile operational data → `REWRITE_LABS_STATE.md`.

---

## 12. Long-Term Goals

- Build a fully automated, operator-grade redesign-and-outreach engine.
- Scale to multi-tenant SaaS when productized.
- Maintain deterministic, high-signal workflows.

---

## 13. Interaction Rules

- For Rewrite Labs status → read/update `REWRITE_LABS_STATE.md`.
- For system structure → use this doc + memory.
- For new tasks → update `REWRITE_LABS_STATE.md`, not memory.
