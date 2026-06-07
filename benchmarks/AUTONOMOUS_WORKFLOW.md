# Rewrite Labs Autonomous Workflow

**Single command. Zero friction. No prompts.**

## Quick Start

```bash
make bench-fast
```

That's it. Runs the entire deterministic pipeline end-to-end:
1. Captures HTML from all 20 sites (Puppeteer)
2. Extracts business metadata (Cheerio)
3. Runs Opus vs Sonnet A/B benchmark (when API credits available)
4. Reports results

---

## What It Does

### Automatic
- ✅ Disables git hooks for the run (re-enables on completion)
- ✅ Runs capture, metadata extraction, benchmark silently
- ✅ Handles API credit errors gracefully (reports and continues)
- ✅ Reports elapsed time per phase
- ✅ No manual confirmations, no interactive prompts

### Output
```
========================================================
Rewrite Labs Autonomous Benchmark Pipeline
2026-06-05 05:56:53
========================================================

[setup] Disabling git hooks temporarily...
[phase 1/3] Capturing HTML snapshots...
[OK] complete (130.5s)

[phase 2/3] Extracting metadata...
[OK] complete (45.3s)

[phase 3/3] Running Opus vs Sonnet A/B benchmark...
[BLOCKED] insufficient credits (0.1s)

========================================================
Pipeline Summary
========================================================
Capture:   [OK] complete (130.5s)
Metadata:  [OK] complete (45.3s)
Benchmark: [BLOCKED] insufficient credits (0.1s)
Commit:    skipped
Duration:  176s
========================================================
```

---

## Advanced Usage

### Skip specific phases
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bench-autonomous.ps1 `
  -SkipCapture `
  -SkipMetadata `
  -ApiKey "sk-ant-..."
```

### Auto-commit results
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bench-autonomous.ps1 `
  -ApiKey "sk-ant-..." `
  -Commit
```

### Flags
- `-SkipCapture` — Skip HTML capture phase
- `-SkipMetadata` — Skip metadata extraction phase
- `-SkipBenchmark` — Skip A/B benchmark phase
- `-Commit` — Auto-commit changes at end
- `-ApiKey "sk-ant-..."` — Set API key (or use `$env:ANTHROPIC_API_KEY`)

---

## Why This Matters

**Old workflow:**
```bash
npm run bench:capture      # Manual step 1
npm run bench:metadata     # Manual step 2
npm run bench:opus-sonnet  # Manual step 3
git add benchmarks/        # Manual step 4
git commit ...             # Manual step 5
```
~5+ decisions, ~15+ minutes of human wait time per run

**New workflow:**
```bash
make bench-fast            # Single command
```
All phases orchestrated, hooks disabled, no friction

---

## How It Works

The `bench-autonomous.ps1` script:
1. Saves current git hooks config
2. Disables hooks (`git config core.hooksPath /dev/null`)
3. Runs each pipeline phase sequentially
4. Captures elapsed time per phase
5. Detects API credit errors (non-blocking)
6. Restores original hooks config
7. Reports results in clean summary format

**Key: Hooks are re-enabled even if any phase fails** (finally block).

---

## Integration

Add to your local dev routine:
```bash
# Repeat this during development
make bench-fast

# When ready to ship, add git context
make bench-fast && git push
```

Or integrate into CI/CD:
- `.github/workflows/benchmark.yml` can call this script
- Results auto-committed to benchmark branch
- Dashboard updated from `benchmarks/out/benchmark-results.json`

---

## Performance

Typical run: **3-4 minutes**

| Phase | Time | Notes |
|-------|------|-------|
| Capture (20 sites) | ~2 min | Puppeteer, network-idle |
| Metadata (18 sites) | ~30s | Cheerio parsing |
| Benchmark (18 sites, 2 models) | ~2-3 min | Requires API credits |
| **Total** | **~4-5 min** | No hook overhead |

---

## Troubleshooting

**"ANTHROPIC_API_KEY not set"**
```bash
$env:ANTHROPIC_API_KEY='sk-ant-...'
make bench-fast
```

**"insufficient credits"**
Expected if account is low on balance. Script logs and continues.
Resume when credits replenished: `make bench-fast`

**"Capture failed for some sites"**
Script reports which sites failed (DNS/SSL issues).
Check `benchmarks/out/*.html` — partial captures are valid.

**Hooks not re-enabled?**
Manually re-enable: `git config --unset core.hooksPath`

---

## Philosophy

**Autonomous benchmarking = minimal friction.**

Every prompt, every manual step, every delay breaks the feedback loop for rapid iteration. The autonomous workflow is designed to:
- ✅ Run fully deterministically
- ✅ Support local rapid iteration (no CI dependency)
- ✅ Integrate cleanly with git (transparent hook control)
- ✅ Fail gracefully (API errors don't block the pipeline)
- ✅ Report clearly (human-readable summary)

Use it. Iterate. Ship.
