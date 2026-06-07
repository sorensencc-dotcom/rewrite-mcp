# Family History Research Business Plan
## Deep, Private, AI-Assisted Personalized Research Services

**Document version:** 1.0  
**Date:** 2026-06-06  
**Status:** Strategic draft — pre-launch  
**Owner:** Soren Sorensen  

---

## Executive Summary

This is a premium personalized family history research service built on infrastructure developed for the *Cast Iron Charlie* documentary. The documentary validates the research methodology and becomes the marketing story. The infrastructure — archival ingest, OCR, entity extraction, DAM organization, and narrative report generation — was built for CIC and repurposed here with minimal adaptation.

**The opportunity:** The genealogy market is $5.1B growing at 10% CAGR. The premium segment (professional, bespoke research) is underserved. The gap: no provider combines expert-driven deep research with AI-assisted gap detection, narrative-quality deliverables, and privacy-first client portals. Legacy Tree charges $3,200–$11,500 per project with a 4–6 month backlog. We can compete on speed, quality, and technology at comparable price points.

**The flywheel:** CIC documentary success → credibility and press → business launch → revenue funds CIC post-production → each client project trains the AI research layer → better research attracts more clients.

**Revenue target:** $120K ARR by end of Year 1 (24 projects at avg $5,000).

---

## 1. The Problem

Most people seeking deep family history research face one of three outcomes:

1. **Self-service dead ends** — Ancestry.com gives you records but not interpretation, narrative, or brick walls solved. 80% of self-service users abandon research within 90 days.
2. **Expensive black boxes** — Professional firms (Legacy Tree, Lineages) charge $3,200–$11,500 and take 4–6 months with limited client visibility into the process.
3. **No privacy** — Mainstream platforms monetize DNA and family data. Privacy-first alternatives (famstory, Heirloom) are storage tools, not research services.

The unmet need: a research partner that is fast, transparent, expert-grade, AI-assisted, and treats client data as private by default.

---

## 2. The Solution

A managed family history research service that delivers:

- **Expert-curated narrative reports** — not just a pile of records, but a readable, cited family story
- **AI-assisted gap detection** — our system flags what's missing and where to look next
- **Archival-grade organization** — every document digitized, classified, and indexed
- **Privacy by design** — client portal with scoped access, expiring links, no third-party data sharing
- **Transparent process** — clients see research progress in real time; no black box

**What makes us different from everyone else:**

> *"We built this infrastructure to research a real theatrical documentary about a Ford Motor Company executive. We know how to find things that don't want to be found."*

That sentence is the brand. No competitor can say it.

---

## 3. Market Segmentation

### Primary Target: The Motivated Family Historian
- Age 40–70, has already tried Ancestry/MyHeritage and hit walls
- Has money to spend on something meaningful; this is a gift to themselves or their family
- Has a specific mystery to solve (adoption, immigration origins, unknown parentage, lineage society application)
- Values quality of output — wants something they can frame, share, or publish

### Secondary Target: The Gift Buyer
- Adult child buying a premium experience for a parent/grandparent milestone (70th birthday, retirement, anniversary)
- Does not want to do the research themselves
- Price range $2,500–$5,000 is comfortable if the deliverable is tangible and emotional

### Tertiary Target: Legal / Estate Research
- Attorneys and families with inheritance disputes or heir location needs
- DNA testing companies as referral partners (they hit walls too)
- Adoption agencies and reunion organizations

---

## 4. Service Packages & Pricing

### Archive Digitization — $1,500 flat
*For clients who have boxes of family documents and photos but no organization.*
- Client ships or delivers physical documents (or provides high-res scans)
- We OCR, classify, deduplicate, and organize everything into a structured digital archive
- Delivery: organized folder structure + master inventory CSV + 1-page summary of what was found
- Turnaround: 2 weeks
- **CIC parallel:** Same pipeline used for Kroll Archive batches

### Discovery Package — $2,500
*For clients with a specific question to answer.*
- 25 research hours
- Focus on one family line or one specific mystery
- 10–15 page narrative report with citations
- Ancestor timeline visualization
- Gap analysis: what remains unknown and recommended next steps
- Secure digital delivery via client portal (30-day access)
- Turnaround: 4–6 weeks
- **CIC parallel:** Equivalent to a single CIC topic research log (e.g., "Cuba Research")

### Standard Package — $5,000
*For clients who want a comprehensive family history.*
- 50 research hours
- 2–3 family lines
- Full narrative report (25–40 pages) with citation appendix
- Entity relationship graph (interactive family tree)
- Document gallery (all found documents organized and described)
- Gap analysis brief
- Secure client portal (90-day access)
- 1 video consultation with researcher
- Turnaround: 8–10 weeks
- **CIC parallel:** Equivalent to CIC Phases 1–2 output for one person

### Premium Package — $8,500
*For clients who want everything, including recorded family stories.*
- 100 research hours
- All family lines within 3 generations
- Full narrative report (50–75 pages)
- Entity relationship graph
- Document gallery + all documents digitized and archived
- 2–3 recorded family interviews (transcribed, indexed, searchable)
- DNA analysis coordination (if client provides 23andMe/AncestryDNA raw data)
- Secure client portal (permanent access, annual renewal $150)
- 2 video consultations
- Turnaround: 14–16 weeks
- **CIC parallel:** CIC full-stack with Treatment + interview pipeline

### Add-Ons
| Add-On | Price |
|--------|-------|
| DNA analysis integration (raw data parsing + match analysis) | $500 |
| Additional research hours (beyond package) | $125/hr |
| Printed deluxe report (bound, archival quality) | $350 |
| Heritage travel research (locations, what's accessible today) | $750 |
| Lineage society application package (DAR, Mayflower, etc.) | $1,200 |
| Permanent portal access upgrade | $150/yr |

---

## 5. Operations Model

### How a Project Runs

**Week 1: Intake**
- Client completes intake questionnaire (what they know, what they want, what mysteries exist)
- NDA and consent form executed
- Research plan drafted and shared with client
- Client uploads any existing documents to secure intake portal

**Weeks 2–N: Research**
- Researcher begins archival work using the CIC pipeline:
  - Documents ingested via `ingest-cic-archival.ps1` (client's docs)
  - OCR via `ocr-cic-documents.ps1 -Domain genealogy`
  - Classification via `classify-cic-media.ps1 -Domain genealogy`
  - Research log maintained via `maintain-research-log.ps1`
  - Archive API connectors pull from FamilySearch, Ancestry, Fold3
  - ARM (Autonomous Research Mode) flags gaps and suggests next searches
- Client receives weekly progress update (email + portal note)

**Final Week: Delivery**
- Narrative report generated via Phase 54 report generator
- Timeline visualization and entity graph exported
- Gap analysis brief drafted
- All materials packaged and uploaded to client portal
- Video delivery call (Standard/Premium packages)

### Staffing Model (Year 1)
- **Founder/Operator:** Project oversight, client relationships, business development
- **1 Freelance Researcher (part-time, contract):** 20 hrs/week, $50–75/hr, accredited genealogist
- **AI pipeline:** Handles OCR, classification, gap detection, draft report generation
- **Capacity:** 3–4 active projects simultaneously; 24–30 projects/year

**Cost per project (Standard, 50 hrs):**
- Researcher time: 30 hrs × $65/hr = $1,950
- AI/cloud costs: ~$50
- Tools/portal: ~$30
- Total: ~$2,030
- Revenue: $5,000
- **Gross margin: ~59%**

---

## 6. Technology Stack

All infrastructure is built on CIC/Rewrite Labs. No separate tooling needed.

| Function | Tool | Status |
|----------|------|--------|
| Document ingest & dedup | `ingest-cic-archival.ps1` | ✅ Live |
| OCR & text extraction | `ocr-cic-documents.ps1` | ✅ Live (Phase 50) |
| Classification & routing | `classify-cic-media.ps1` | ✅ Live (genealogy extension pending) |
| DAM organization | `organize-cic-media-library.ps1` | ✅ Live |
| Research logging | `maintain-research-log.ps1` | ✅ Live |
| Gap detection (AI) | ARM (Phase 42) | ✅ Live |
| Entity relationship graph | ERG (Phase 52) | 🔧 Pending |
| Archive API connectors | AAIL (Phase 53) | 🔧 Pending |
| Narrative report generator | NRG (Phase 54) | 🔧 Pending |
| Interview transcription | IOHP (Phase 55) | 🔧 Pending |
| Client delivery portal | CDP (Phase 56) | 🔧 Pending |

**MVP capability (today):** Ingest, OCR, classify, organize, research log, gap detection. Can run Discovery and Archive Digitization packages now with manual report writing.

**Full-stack capability:** After Phases 52–54 (estimated 8–12 weeks of build time).

---

## 7. Legal & Privacy Framework

### Client Data Handling
- All client documents stored locally on encrypted drives; no third-party cloud storage without explicit consent
- NDA executed at intake covering researcher and subcontractors
- Client owns all research findings and deliverables; no license retained
- DNA raw data: never shared, never retained after project completion, deleted upon client request
- GDPR/CCPA compliance by design: data minimization, right to deletion, consent management

### Researcher Standards
- All contracted researchers sign confidentiality agreements
- Prefer accredited genealogists (AG, CG credentials)
- Evidence Explained citation standards required on all deliverables

### Liability Limits
- Service agreement caps liability at project fee paid
- No guarantee of specific findings (genealogy research is inherently uncertain)
- Clear scope definition in writing before work begins

---

## 8. Financial Projections

### Year 1 (Months 1–12)

**Assumptions:**
- First paying client: Month 3 (Phase 54 report generator complete)
- Ramp: 1 project/month months 3–6, 2/month months 7–9, 3/month months 10–12
- Average project value: $4,500 (mix of packages)
- Researcher costs included; no office overhead

| Month | Projects | Revenue | Researcher Cost | Net |
|-------|----------|---------|-----------------|-----|
| 1–2 | 0 | $0 | $0 | $0 |
| 3–6 | 4 | $18,000 | $7,800 | $10,200 |
| 7–9 | 6 | $27,000 | $11,700 | $15,300 |
| 10–12 | 9 | $40,500 | $17,550 | $22,950 |
| **Year 1 Total** | **19** | **$85,500** | **$37,050** | **$48,450** |

### Year 2 (Scale)
- Add 1 additional researcher (30 hrs/week)
- Capacity: 5–6 active projects simultaneously
- Target: 40–45 projects, $195K–$215K revenue
- Introduce annual portal subscription ($150/yr per past client)
- Explore licensing the research platform to other genealogists (SaaS, Year 3)

---

## 9. Marketing Strategy

### Positioning Statement
*"We built an AI-powered research pipeline to make a documentary. Now we use it to find your family."*

This line does the heavy lifting. It signals:
- Technical sophistication (AI pipeline, not just Google searches)
- Proof by analogy (if we can research a 1940s Ford executive, we can research your family)
- Credibility through the documentary context

### Channel Strategy

#### 1. Content Marketing — Primary Channel (Months 1–6)
**Goal:** Establish authority before selling anything.

- **CIC documentary blog:** Publish behind-the-scenes research stories while making the documentary. Show how we found things. Show the process. This is the product demonstration.
  - "How we found King Frederik X's letters to a Ford engineer"
  - "What a 1943 Willow Run payroll record actually tells you"
  - "Five sources most genealogists miss for 1940s immigrants"
- **YouTube/video:** Short-form process videos. Screen recordings of the pipeline finding something unexpected. Documentary-style b-roll of archive research.
- **Newsletter:** Monthly "Research Find of the Month" — one discovery from CIC research, anonymized client discovery (with permission). Builds list before launch.

**Why this works:** The content is genuinely interesting because CIC is genuinely interesting. We're not manufacturing content; we're documenting work we're already doing.

#### 2. Documentary Release — Launchpad (Whenever CIC Releases)
The documentary premiere is the business launch event. Every review, interview, and press hit about the documentary includes the business story. The pitch to journalists:

> *"The same AI research pipeline we built to make this documentary is now available to help families find their own history."*

Press targets:
- Detroit Free Press (Sorensen/Ford connection)
- Genealogy Insider, Ancestry Magazine, Family Tree Magazine
- NPR Weekend Edition / podcasts (genealogy, documentary, AI)
- Danish media (Sorensen's Danish heritage angle)

#### 3. Partnership Referrals — Months 4–8
- **DNA testing companies:** 23andMe, AncestryDNA hit walls when matches are distant. Establish referral relationship: "Need a researcher to interpret your results? Here's our partner."
- **Adoption reunion organizations:** High need, emotionally motivated, willing to pay for expert help.
- **Lineage societies:** DAR, Sons of the American Revolution, Mayflower Society members who need help qualifying. These clients are self-selected for quality and payment ability.
- **Estate attorneys:** Heir location and family tree verification for estate settlements.
- **Funeral homes / legacy services:** Families composing obituaries often want deeper research.

#### 4. Targeted Paid Search — Month 6+
- Google Ads: "professional genealogy research," "find my family history," "genealogy research service"
- Facebook/Instagram: targeted to 50+ with interest in genealogy, family history, Ancestry.com
- Budget: $500–$1,000/month; measure cost per lead, optimize toward $2,500+ packages

#### 5. Community Presence
- **r/Genealogy**, **r/DNA_Genealogy**: Provide genuinely useful answers (no selling). Build reputation as the person who knows things. Link to blog posts when relevant.
- **Facebook genealogy groups** (there are thousands, total membership in the tens of millions): Same approach — help first.
- **Local genealogical societies:** Speak at meetings, offer a free 30-minute consultation to members. Societies are referral networks.

### Pricing Psychology
- Lead with the Standard ($5,000) package in all marketing — it anchors perception. Discovery ($2,500) then reads as accessible.
- Archive Digitization ($1,500) is the low-risk entry point — clients who engage here almost always upgrade to a research package.
- The Premium ($8,500) justifies itself by comparison to Legacy Tree ($11,500+) for comparable scope.

### Client Acquisition Funnel
```
Content / press / referral
        ↓
Newsletter subscriber or website visitor
        ↓
Free 30-minute discovery call (founder-led)
        ↓
Intake questionnaire + research plan
        ↓
NDA + payment (50% upfront, 50% on delivery)
        ↓
Active project
        ↓
Delivery + video call
        ↓
Referral ask + testimonial request
```

---

## 10. Competitive Differentiation Summary

| Factor | Us | Legacy Tree | Ancestry.com | Freelance Genealogist |
|--------|----|-------------|-------------|----------------------|
| Deep bespoke research | ✅ | ✅ | ❌ | ✅ |
| AI gap detection | ✅ | ❌ | ❌ | ❌ |
| Privacy-first portal | ✅ | Partial | ❌ | ❌ |
| Documentary credibility | ✅ | ❌ | ❌ | ❌ |
| Speed (vs Legacy Tree backlog) | ✅ | ❌ | N/A | ✅ |
| Narrative report quality | ✅ | ✅ | ❌ | Varies |
| Transparent process | ✅ | Partial | N/A | Varies |
| Price (mid-range) | $2,500–$8,500 | $3,200–$11,500 | $13–54/mo | $100–150/hr |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Documentary takes longer than expected | Medium | Low | Business can launch independently; documentary is marketing accelerant, not dependency |
| Researcher quality inconsistency | Medium | High | Hire accredited genealogists (AG/CG); peer review all reports before delivery |
| Slow client acquisition | Medium | Medium | Archive Digitization at $1,500 is a low-friction entry that converts to research clients |
| AI pipeline errors in client work | Low | High | Human researcher reviews all AI output; AI is assistant, not decision-maker |
| Competitor copies the model | Low | Medium | Brand story (CIC documentary) is not replicable; infrastructure lead is 2+ years |

---

## 12. Milestones & Launch Checklist

### Pre-Launch (Now → Month 2)
- [ ] Complete Phase 51 (genealogy taxonomy extension) — 1 week
- [ ] Complete Phase 54 (narrative report generator) — 4–6 weeks
- [ ] Draft service agreement and NDA templates
- [ ] Set up intake form (Typeform or equivalent)
- [ ] Set up payment processing (Stripe)
- [ ] Build landing page (single page, email capture, waitlist)
- [ ] Start content publishing: first 3 CIC research blog posts
- [ ] Identify and contact first 5 accredited genealogist candidates

### Soft Launch (Month 3)
- [ ] First paying client (likely from personal network or DNA company referral)
- [ ] Archive Digitization package as entry point
- [ ] Run full pipeline on client documents
- [ ] Deliver Discovery package report
- [ ] Collect testimonial and iterate

### Full Launch (Month 4–6)
- [ ] Phase 53 (archive APIs) connected to FamilySearch + Fold3
- [ ] Phase 56 (client portal) live
- [ ] Press outreach begins (genealogy media)
- [ ] Partnership outreach to DNA companies and adoption orgs
- [ ] 3 concurrent projects running

### Documentary Release (TBD)
- [ ] Press kit ready (uses same NRG report generator as client deliverable)
- [ ] Business mentioned in all CIC press materials
- [ ] Festival / premiere event includes business announcement
- [ ] "Built for a documentary" campaign launches

---

## 13. Long-Term Vision (Year 3+)

The infrastructure built for this service has platform potential:

**Option A — Scale the service:** Add researchers, increase capacity to 100+ projects/year. $500K+ ARR. High-end boutique with a 3–6 month waitlist (like Legacy Tree).

**Option B — Platform/SaaS:** License the CIC pipeline (OCR + classify + entity graph + report generator) to other professional genealogists. $99–299/month subscription. 200 users = $200–600K ARR with near-zero marginal cost.

**Option C — Hybrid:** Operate the premium service AND offer the platform to independent researchers who don't want to build their own infrastructure.

The CIC OS architecture (Phases 22–45) was designed for exactly this kind of multi-tenant, multi-domain deployment. Option B/C is already baked into the infrastructure.

---

*This document is the commercial companion to the CIC Master Roadmap. All infrastructure references map to Phases 50–56 of that document. See also: `ocr-cic-documents.ps1` (Phase 50 deliverable) and the CIC Media Library scripts directory.*
