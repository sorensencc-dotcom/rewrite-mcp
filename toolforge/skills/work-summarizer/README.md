# Work-Summarizer v3.0

Daily/weekly dev work reports from repo scans and Claude Code transcripts. Subsystem-aware classification, deterministic analysis with optional LLM-assisted synthesis.

## Inputs

- `mode` (string, optional): `"daily"` or `"weekly"`. Defaults to `"daily"`.
- `registryPath` (string, optional): Path to repo registry JSON. Defaults to `C:\dev\repo-registry.json`.
- `transcriptsRoot` (string, optional): Root directory for Claude Code session logs. Defaults to `C:\Users\soren\.claude\projects`.
- `outputDir` (string, optional): Directory for generated reports. Defaults to `C:\dev\CIP\CIC\logs\work-summaries`.
- `queueDir` (string, optional): Directory for routing artifacts. Defaults to `C:\dev\CIP\CIC\ingestion\queue`.
- `includeRoutingArtifact` (boolean, optional): Write MAAL routing artifact. Defaults to `false`.
- `reasoningEnabled` (boolean, optional): Enable Claude LLM reasoning synthesis. Defaults to `false`.
- `anthropicModel` (string, optional): Model for reasoning. Defaults to `claude-opus-4-1`.
- `reasoningTimeoutMs` (number, optional): Per-subsystem reasoning timeout. Defaults to `30000`.

## Outputs

Success: `{ status: "ok", message: string, data: Report }`

Error: `{ status: "error", message: string, data: undefined }`

### Report Schema (v3.0.0)

```json
{
  "schema_version": "3.0.0",
  "period": "daily|weekly",
  "window_start": "ISO timestamp",
  "window_end": "ISO timestamp",
  "generated_at": "ISO timestamp",
  "repos_scanned": number,
  "repos_skipped_missing": [string],
  "modified_files": number,
  "transcript_sessions_scanned": number,
  "transcript_files_touched": number,
  "work_by_category": { "category": count },
  "drift_signals": {
    "type": "drift-signals-detected",
    "count": number,
    "score": 0-1,
    "summary": string
  },
  "repo_deltas": [
    {
      "repo_name": string,
      "files_changed": number,
      "lines_added": number,
      "lines_deleted": number,
      "active_subsystems": [string]
    }
  ],
  "subsystem_impacts": [
    {
      "subsystem": string,
      "reasoning_source": "llm|fallback",
      "summary": string,
      "risk_level": "low|medium|high",
      "active": boolean
    }
  ],
  "cross_repo_impacts": [
    {
      "category": string,
      "neighbors_active": [string],
      "neighbors_silent": [string],
      "recommendation": string
    }
  ],
  "transcript_excerpts": [
    {
      "category": string,
      "excerpt": string
    }
  ],
  "notable_changes": [
    {
      "file": string,
      "risk_level": "low|medium|high",
      "subsystems": [string]
    }
  ],
  "risks_or_followups": [string],
  "message": string
}
```

## Features

### Deterministic Pipeline (always runs)
1. **Repo Scan**: Git diff stat per repo, file classification to 17-category taxonomy
2. **Transcript Analysis**: Walks Claude Code session logs for drift keywords, activity patterns
3. **Category Aggregation**: Counts files per category, detects zero-activity zones
4. **Weekly Aggregation** (weekly mode only): Loads last 7 daily reports, falls back to full scan if coverage < 50%

### Schema Versioning
- `schema_version: "3.0.0"` enables safe weekly aggregation during migration
- Old reports (missing version or version < 3) forced to full rescan
- New fields (subsystem_impacts, cross_repo_impacts, transcript_excerpts) additive, optional

### LLM Reasoning Synthesis (optional, `reasoningEnabled: true`)
- Per-active-subsystem Claude API call (concurrent, not sequential)
- Forced tool-use output with reasoning summary, risk_level
- Deterministic fallback on API failure, timeout, or missing key
- Captured in `reasoning_source` field (llm vs fallback)
- Per-subsystem timeout configurable, wrapped independently

## Determinism Notes

- No LLM calls by default. All context from git diffs + transcript keywords.
- Files matched to known repo roots. Unmatched ignored.
- Drift detection: keyword list (drift, driftScore, driftEngine, etc.) in message blocks and tool_use paths.
- Reasoning synthesis (if enabled) gracefully degrades to deterministic fallback on any failure.
- Windows path normalization: forward slashes for consistent classification.

## Error Conditions

- `REGISTRY_NOT_FOUND`: Registry JSON missing or empty.
- `NO_MODIFIED_FILES`: No changes detected across all repos.
- `OUTPUT_DIR_INVALID`: Unable to create output directory.

## Examples

### Daily Run
```js
const result = await run({ mode: 'daily' });
// Writes work-summary-daily-2026-07-02.json
```

### Weekly Run with Routing Artifact
```js
const result = await run({ mode: 'weekly', includeRoutingArtifact: true });
// Writes work-summary-weekly-2026-07-02.json
// Writes work-summary.artifact.json to queue
```

### With LLM Reasoning Enabled
```js
const result = await run({
  mode: 'weekly',
  reasoningEnabled: true,
  // ANTHROPIC_API_KEY must be set in environment
});
// subsystem_impacts populated via Claude reasoning (or fallback)
```

### Custom Paths
```js
const result = await run({
  mode: 'weekly',
  registryPath: 'C:\\custom\\registry.json',
  outputDir: 'C:\\custom\\reports'
});
```

## Environment Variables

- `ANTHROPIC_API_KEY`: Required if `reasoningEnabled: true`. Used for LLM synthesis calls.

## Testing

```bash
npm install
npm run build
npm test
```

## Migration Notes

v2.0 → v3.0:
- `schema_version` field added (required for weekly aggregation safety)
- `repo_deltas` now populated with real git stats (lines_added, lines_deleted, active_subsystems)
- `transcript_sessions_scanned` now real count (not hardcoded 0)
- Weekly aggregation validates schema_version >= 3, forces full rescan for v2 reports
- `notable_changes` shape changes from `string[]` to `{ file, risk_level, subsystems }[]`
