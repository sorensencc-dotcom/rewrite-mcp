# Work-Summarizer Usage Guide

## Quick Start

```bash
cd C:\dev\toolforge\skills\work-summarizer
npm install
npm run build
node dist/index.js
```

## Running via Claude Code Skill Runner

```bash
node C:\dev\CIP\CIC\automation\skill-runner.js work-summarizer-daily "C:\dev\CIP\CIC\logs\skill-executions"
node C:\dev\CIP\CIC\automation\skill-runner.js work-summarizer-weekly "C:\dev\CIP\CIC\logs\skill-executions"
```

## Scheduled Execution

Task Scheduler jobs are pre-configured:
- Daily: 09:00 UTC via `CIC-Skill-WorkSummarizer-Daily`
- Weekly (Mon): 10:00 UTC via `CIC-Skill-WorkSummarizer-Weekly`

Logs written to: `C:\dev\CIP\CIC\logs\work-summaries\`

## API Integration

```typescript
import run from './dist/index.js';

// Daily report
const daily = await run({ mode: 'daily' });

// Weekly report with routing artifact
const weekly = await run({
  mode: 'weekly',
  includeRoutingArtifact: true
});

// With LLM reasoning (requires ANTHROPIC_API_KEY env var)
const enhanced = await run({
  mode: 'weekly',
  reasoningEnabled: true,
  anthropicModel: 'claude-haiku-4-5-20251001',  // Default; use any valid Anthropic model ID
  reasoningTimeoutMs: 30000
});

if (enhanced.status === 'ok') {
  console.log(`Generated report: ${enhanced.data.period}`);
  console.log(`Categories: ${Object.keys(enhanced.data.work_by_category).length}`);
  console.log(`Drift signals: ${enhanced.data.drift_signals.count}`);
}
```

## Output Files

### Daily Reports

- `work-summary-daily-YYYY-MM-DD.json` — Structured report (v4.0.0 schema)
- `work-summary-daily-YYYY-MM-DD.txt` — Plaintext summary

### Weekly Reports

- `work-summary-weekly-YYYY-MM-DD.json` — Aggregated 7-day report with optional LLM synthesis
- `work-summary-weekly-YYYY-MM-DD.txt` — Plaintext summary
- `work-summary.artifact.json` — MAAL routing artifact (if `includeRoutingArtifact: true`)

## Schema Versioning

### v4.0.0 Fields (Current)

**New in v4.0.0:**

- `schema_version: "4.0.0"`
- `subsystem_impacts[]` — Per-active-category LLM-synthesized impact analysis (populated only if `reasoningEnabled: true` and API key set)
- `cross_repo_impacts[]` — Inferred downstream impacts via dependency graph (always populated)
- `transcript_excerpts[]` — Relevant transcript chunks with optional `reasoning_summary` (LLM-synthesized if reasoning enabled)
- `notable_changes[].title`, `.description`, `.risk_level` — Structured format (synthesized by LLM if enabled, fallback to deterministic)
- `risks_or_followups[].area`, `.risk_summary`, `.recommended_next_steps[]` — Structured format (synthesized by LLM if enabled)
- `message` — Top-level summary (LLM-synthesized if enabled)

**Backward Compatibility:**

- v3.0.0 reports automatically trigger full rescan (v3→v4 incompatible for aggregation)
- Deterministic fallback populates all v4.0.0 fields even if LLM disabled or unavailable

### Environment Variables

**LLM Reasoning:**

- `ANTHROPIC_API_KEY` — Required if `reasoningEnabled: true`. Must be visible to skill runtime (use machine-level env var for Task Scheduler).
- Default model: `claude-haiku-4-5-20251001` (override with `anthropicModel` input)
- Default timeout: 30000 ms (override with `reasoningTimeoutMs` input)

**Fallback:**

- If `reasoningEnabled: false` or `ANTHROPIC_API_KEY` missing, skill runs in deterministic-only mode (no LLM calls).
- Fallback reason logged in `risks_or_followups` array.

## Troubleshooting

### No output files generated
- Check `C:\dev\repo-registry.json` exists and contains repos
- Verify repos in registry actually exist on disk
- Check output directory is writable

### Weekly aggregation falls back to full scan
- Expected if < 50% of last 7 daily reports available
- Check `work-summary-daily-*.json` files exist in output directory
- Verify their `schema_version >= 3.0.0`

### LLM reasoning disabled despite `reasoningEnabled: true`
- Check `ANTHROPIC_API_KEY` env var is set
- Verify it's visible to Windows Task Scheduler (may need machine-level env var, not shell)
- Check skill logs for "reasoning_source": "fallback" (indicates API key issue)

### Task Scheduler job not firing
- Verify job exists: `Get-ScheduledTask -TaskPath "\CIC\Skills\" -TaskName "CIC-Skill-WorkSummarizer-Daily"`
- Check Task Scheduler history for failures
- Verify Node.js path is correct in job definition
- Ensure `ANTHROPIC_API_KEY` is set in task environment if reasoning enabled

## Monitoring

Check latest execution:

```powershell
Get-ChildItem "C:\dev\CIP\CIC\logs\work-summaries" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 2
```

Inspect report structure:

```powershell
$report = Get-Content "C:\dev\CIP\CIC\logs\work-summaries\work-summary-daily-2026-07-02.json" | ConvertFrom-Json
$report | Select-Object -ExpandProperty work_by_category | Format-Table
```

## Testing

```bash
npm test
```

Test matrix covers:
- Category-map regression (exact 17 names)
- Dependency-graph integrity checks
- Weekly aggregator schema-version gating
- Claude reasoning provider (mocked)
- Fallback-only scenarios (no API key, no activity)
