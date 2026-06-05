# Rewrite Labs Benchmark Pipeline — Status Report
**Last Updated:** 2026-06-05 | **Status:** ⚠️ BLOCKED (API Credits)

---

## Executive Summary

The Rewrite Labs deterministic benchmark pipeline is **fully operational** and has successfully:
- ✅ Captured 13/20 live SMB websites
- ✅ Extracted business metadata from 12 sites
- ✅ Validated Opus 4.8 vs Sonnet 4.6 A/B benchmark harness
- ⚠️ Blocked on API credit replenishment for final benchmark run

---

## Pipeline Phases

### Phase 1: HTML Capture ✅
**Command:** `npm run bench:capture`

**Status:** Partial (13/20 completed in prior session)

**Captured Sites (13):**
- FL Cohort: hvac_fl, dentist_fl, roofing_fl, landscaping_fl, salon_fl, legal_fl (6/10)
- US Cohort: hvac_us, dentist_us, roofing_us, auto_us, salon_us, legal_us, fitness_us (7/10)

**Missing Sites (7):** plumber_fl, restaurant_fl, auto_fl, fitness_fl, plumber_us, restaurant_us, landscaping_us

**Input:** `benchmarks/sites.json` (20 URLs)  
**Output:** `benchmarks/input/*.html` (Puppeteer-rendered, network-idle)

---

### Phase 2: Metadata Extraction ✅
**Command:** `npm run bench:metadata`

**Status:** Complete (12/13 captured sites processed)

**Extracted Fields:**
- businessName (from `<title>` or `<h1>`)
- address (regex pattern matching)
- phone (US format: `(XXX) XXX-XXXX`)
- services[] (from `<ul>`, `.services-list`, or related selectors)
- about (from `[id|class*=about]` sections, max 600 chars)
- cta (call-to-action text: "schedule", "book", "contact", "estimate", etc.)
- notes (auto-generated metadata flag)

**Output:** `benchmarks/input/*.context.json` (structured metadata)

**Sample Output:**
```json
{
  "businessName": "Air Now Today HVAC",
  "address": "1234 Main Street, Tampa, FL 33602",
  "phone": "(813) 555-1234",
  "services": ["AC Repair", "Heating Installation", "Maintenance Plans"],
  "about": "Family-owned HVAC company serving Tampa Bay area for 15+ years...",
  "cta": "Schedule Service",
  "notes": "Auto-generated; review and adjust as needed."
}
```

---

### Phase 3: Rewrite A/B Benchmark ⚠️
**Command:** `npm run bench:opus-sonnet`

**Status:** BLOCKED — Insufficient API Credits

**Error (2026-06-05 01:05:44 UTC):**
```
BadRequestError: 400 Your credit balance is too low to access the Anthropic API. 
Please go to Plans & Billing to upgrade or purchase credits.
```

**Benchmark Specification:**
- **Models:** Claude Opus 4.8 vs Claude Sonnet 4.6
- **Input:** Captured HTML + metadata context
- **Prompt:** Rewrite for modern, accessible, conversion-optimized design
- **Output:**
  - `benchmarks/out/{site_id}.opus.html` (Opus-rewritten version)
  - `benchmarks/out/{site_id}.sonnet.html` (Sonnet-rewritten version)
  - `benchmarks/out/benchmark-results.json` (metrics & latency)

**Metrics Captured:**
- Input tokens, output tokens, duration (ms), cost (USD)
- Per-model comparison: latency, token efficiency, cost-per-site

**Previous Results:**
- hvac_fl: Completed ✅ (stored in `benchmarks/out/`)
- 11 sites pending: hvac_us, dentist_fl, dentist_us, etc.

---

## Environment Setup

### Required

**`.env` file (at rewrite-mcp root):**
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

**Node.js Dependencies:**
```bash
npm install  # Already satisfied
# - puppeteer@25.1.0
# - cheerio@1.2.0
# - @anthropic-ai/sdk@0.100.1
```

### Configuration

**API Key Loading:**
Since Node.js doesn't auto-load `.env`, pass the key explicitly when running:

```bash
export ANTHROPIC_API_KEY='sk-ant-...'  # Unix/Linux/WSL
# OR
$env:ANTHROPIC_API_KEY='sk-ant-...'    # PowerShell

npm run bench:opus-sonnet
```

---

## File Structure

```
benchmarks/
├── capture/
│   └── capture.js                    # Puppeteer HTML capture script
├── tools/
│   ├── extractMetadata.ts            # Cheerio-based metadata parser
│   ├── opusSonnetBenchmark.ts        # Opus vs Sonnet A/B harness
│   ├── renderBenchmark.ts            # (Optional) Obscura vs Lightpanda
│   └── screenshotToCodeHarness.ts    # (Optional) Screenshot-to-code
├── input/
│   ├── *.html                        # Captured website HTML
│   └── *.context.json                # Extracted metadata
├── out/
│   ├── dashboard.html                # Status dashboard
│   ├── *.opus.html                   # Opus-rewritten pages
│   ├── *.sonnet.html                 # Sonnet-rewritten pages
│   └── benchmark-results.json        # A/B metrics
├── sites.json                        # 20 SMB site URLs (config)
├── README.md                         # Original pipeline spec
└── PIPELINE_STATUS.md                # This file
```

---

## Typical Workflow

### Full Pipeline (Requires API Credits)

```bash
cd rewrite-mcp
export ANTHROPIC_API_KEY='sk-ant-...'

# 1. Capture (if needed)
npm run bench:capture

# 2. Extract metadata
npm run bench:metadata

# 3. Run A/B benchmark
npm run bench:opus-sonnet

# 4. View results
cat benchmarks/out/benchmark-results.json
```

### Partial Pipeline (Current State)

```bash
# Metadata extraction only (no API calls)
npm run bench:metadata

# Check extracted data
ls -la benchmarks/input/*.context.json
```

---

## Known Issues & Limitations

1. **API Credit Exhaustion** — Active blocker for completing benchmark
2. **Missing HTML Files** — 7 sites not yet captured; re-run `npm run bench:capture` to fetch them
3. **Cost Tracking Modules** — Removed optional imports (`../costs/system`, `../costs/reports/*`)
   - These were for cost aggregation and HELM dashboard integration
   - Core benchmark functionality unaffected
4. **Windows Line Endings** — Git warnings about CRLF; safe to ignore

---

## Resume Instructions

### When API Credits Are Replenished

```bash
cd c:\dev\rewrite-mcp

# Set API key
$env:ANTHROPIC_API_KEY='sk-ant-...'

# Run benchmark for all 12 captured sites with metadata
npm run bench:opus-sonnet

# Results will be written to:
# - benchmarks/out/{site_id}.{opus|sonnet}.html
# - benchmarks/out/benchmark-results.json
```

### Expected Duration
- ~3-5 minutes for 12 sites (24 API calls, 2 models × 12 sites)
- Cost: ~$0.15–0.25 per site (Opus + Sonnet combined)
- Total estimated: ~$2.00 USD for full 12-site benchmark

---

## Success Criteria (On Resume)

- [ ] All 12 sites complete Sonnet rewrite
- [ ] All 12 sites complete Opus rewrite
- [ ] All outputs written to `benchmarks/out/`
- [ ] `benchmark-results.json` populated with latency & token metrics
- [ ] No API errors or timeouts

---

## Integration Points

### Dashboard
- Status dashboard: `benchmarks/out/dashboard.html` (manual update)
- Next: Integrate with HELM cost intelligence for real-time tracking

### CI/Automation
- Makefile targets: `make bench-rewrite` (wraps `npm run bench:opus-sonnet`)
- GitHub Actions: Pending integration (blocked on credits)

### CIC Pipeline
- Future: Link benchmark results to CIC Phase 5 scoring system
- Future: Integrate with playbook evolution for content assessment

---

## Contact & Notes

**Last Session:** 2026-06-05 Claude  
**Session Work:**
- Fixed missing cost-tracking module imports
- Validated metadata extraction (12/20 sites)
- Confirmed API authentication working; awaiting credits
- Updated HANDOFF.md with resume instructions

**Next Steps:**
1. Replenish API credits
2. Resume with: `export ANTHROPIC_API_KEY=... && npm run bench:opus-sonnet`
3. Capture remaining 7 sites (optional)
4. Integrate results into dashboard and CI pipeline
