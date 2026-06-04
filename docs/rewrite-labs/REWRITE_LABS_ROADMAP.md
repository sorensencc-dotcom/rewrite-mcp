# Rewrite Labs — Engineering Roadmap (June 2026)

Last updated: 2026-06-03  
Owner: Rewrite Labs Engineering  
Status Legend:  
- **Planned** — Work begins this sprint  
- **Pending** — Scheduled for next 2–4 weeks  
- **Backlog** — Required but not yet scheduled  

---

## 1. Initiative Overview

Rewrite Labs is the autonomous website‑redesign engine built on top of the CIC platform.  
This roadmap defines the engineering work required to expand ingestion quality, rendering fidelity,  
template generation, outreach automation, and preview sandbox capabilities.

This roadmap is separate from the CIC Master Roadmap and represents the Rewrite Labs product layer.

---

## 2. Immediate (Planned)

### Upgrade generation pipeline to Claude Opus 4.8  
Status: **Planned** (BLOCKED: API credits exhausted)  
- A/B test HTML output vs Sonnet  
- Measure DOM structure, CSS fidelity, Lighthouse deltas  
- Track cost-per-site delta  
- **Note:** Corpus capture complete (13/20 sites). Metadata extraction complete. Benchmark harness ready. Awaiting API credit replenishment to run bench:opus-sonnet.

### Add Bumblebee (Perplexity) to CI pipeline  
Status: **Planned**  
- Scan MCP servers, npm, PyPI, VS Code extensions  
- Define severity thresholds  
- Store scan artifacts

### Clone screenshot-to-code locally  
Status: **Planned**  
- Run 10-input design ingestion benchmark  
- Compare fidelity vs Sweeper engine  
- Decide: replace, augment, or fallback

---

## 3. Short-Term (Pending)

### Benchmark Obscura vs Lightpanda  
Status: **Pending**  
- 100-page rendering workload  
- Metrics: render time, JS completeness, anti-detect, memory  
- Produce Q3 infra recommendation

### Integrate browser-use into page analysis pipeline  
Status: **Pending**  
- Test on 20 real client URLs  
- Build compatibility matrix (SPA, React, Vue, static)  
- Evaluate replacement of Puppeteer fallback

### Evaluate Obscura as primary headless browser  
Status: **Pending**  
- API compatibility audit  
- Anti-detect evaluation  
- Migration plan from Puppeteer

### Compile competitive pricing matrix  
Status: **Pending**  
- Webflow restructure (8/9)  
- Hostinger Horizons (.99/mo)  
- SMB price floor analysis  
- Rewrite Labs pricing model draft

---

## 4. Strategic (Pending)

### Prototype Kimi K2.5 for visual ingestion  
Status: **Pending**  
- Evaluate open-weight multimodal performance  
- GPU/VRAM requirements  
- Cost-per-site comparison vs Haiku/Sonnet

### Evaluate Servo for sandboxed preview  
Status: **Pending**  
- Embedded rendering context  
- Security model  
- Performance comparison vs Chromium

### Investigate page-agent  
Status: **Pending**  
- Client-side action simulation  
- Form fill, CTA detection, click paths  
- MCP integration plan

### Monitor Lovable + v0 ecosystems  
Status: **Pending**  
- Identify partner-layer opportunities  
- Template export, AI co-editing  
- Rewrite Labs differentiator statement

---

## 5. Required Supporting Work (Backlog)

### A/B Testing Harness  
Status: **Backlog**  
- DOM diff, HTML diff, Lighthouse scoring

### Rendering Benchmark Framework  
Status: **Backlog**  
- URL set, metrics, thresholds

### Design Ingestion Benchmark Pack  
Status: **Backlog**  
- 10 canonical screenshots across verticals

### Template Regression Suite  
Status: **Backlog**  
- Placeholder validation  
- Layout integrity checks

### Security & Anti-Detect Audit  
Status: **Backlog**  
- Obscura, browser-use, Puppeteer fallback

### Pricing Strategy Model  
Status: **Backlog**  
- 3-tier SMB pricing  
- CAC/LTV modeling

### Preview Sandbox Architecture  
Status: **Backlog**  
- Servo integration plan  
- Isolation boundaries

### Client-Side Agent Layer Spec  
Status: **Backlog**  
- page-agent integration  
- CTA simulation  
- Latency budget

---

## 6. Notes

This roadmap is maintained in-repo and versioned via Git.  
It is not part of the CIC Master Roadmap and should not be merged into CIC phases.
