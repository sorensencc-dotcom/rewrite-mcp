# Rewrite Labs Benchmark Suite

> **Note (August 2026)**: Automated nightly cloud CI execution is disabled. Run benchmarks locally on-demand (e.g. via local models/Ollama or manual CLI runs) when testing rewrite engine changes.

This directory contains the canonical 20-site benchmark corpus used for:

- Claude Opus vs Sonnet A/B testing
- Screenshot-to-code fidelity evaluation
- Obscura vs Lightpanda rendering benchmarks
- browser-use integration tests
- Template matching regression
- Rewrite quality validation

## Structure

```
benchmarks/
  sites.json                    (20-site corpus definition)
  input/
    *.html                      (captured HTML snapshots)
    *.context.json              (extracted business metadata)
  capture/
    capture.js                  (Puppeteer snapshotter script)
  out/                          (generated benchmark results)
  README.md                     (this file)
```

## Corpus Overview

### Florida Gulf Coast (10 sites)
- Plumber, HVAC, Dentist, Restaurant, Roofing, Auto, Landscaping, Salon, Legal, Fitness
- Geographic: Tampa → Sarasota → Fort Myers → Naples

### Nationwide (10 sites)
- Same 10 verticals
- Geographic: Los Angeles, National, Philadelphia, Boise, Maryland, Minnesota, Seattle, Austin, Oakland, NYC

## Workflow

### 1. Capture HTML snapshots

```bash
npm install puppeteer
node benchmarks/capture/capture.js
```

This will:
- Fetch each URL using Puppeteer
- Wait for full page render (networkidle2)
- Save rendered HTML to `benchmarks/input/*.html`

**Note:** Requires Node.js 18+ and a stable internet connection. Takes ~5-10 minutes for 20 sites.

### 2. Extract business metadata

For each HTML snapshot, manually or via extraction script, fill in the corresponding `context.json`:

```json
{
  "businessName": "Gulf Coast Plumbing Services",
  "address": "123 Main St, Tampa, FL 33602",
  "phone": "(813) 555-0123",
  "services": ["Emergency Plumbing", "Drain Cleaning", "Water Heater"],
  "about": "25+ years serving Tampa Bay area",
  "cta": "Schedule Service",
  "notes": ""
}
```

### 3. Run benchmarks

**Opus vs Sonnet A/B:**
```bash
npm run bench:rewrite
```

**Rendering (Obscura vs Lightpanda):**
```bash
npm run bench:rendering
```

**Design Ingestion (screenshot-to-code):**
```bash
npm run bench:design
```

### 4. Review and commit

- Check generated reports in `benchmarks/out/`
- Commit snapshots and metadata to version control
- Use as regression baseline for all future changes

## Important Notes

- All URLs are **publicly accessible** SMB websites with no login walls
- Safe for long-term, repeated benchmarking
- Snapshots are **version-controlled** for deterministic regression testing
- Each capture is a **point-in-time snapshot** — sites may change, but snapshots remain fixed
- Use as the **canonical baseline** for all Rewrite Labs subsystems

## Maintenance

- Re-run capture monthly to detect real-world regressions
- Update `context.json` if business info changes significantly
- Archive old snapshots if a site becomes inaccessible
- Track corpus changes in git history

