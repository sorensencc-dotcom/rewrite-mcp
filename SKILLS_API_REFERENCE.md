# Shared Skills Library — API Reference
## v1.0.0 | 2026-06-05

Detailed API specification for all 13 shared skills.

---

## New Skills (Ready for Deployment)

### cic-section-summarizer

```
POST /skill/cic-section-summarizer/summarize
Content-Type: application/json

{
  "sectionId": "§5.0",                              // Required: Section identifier
  "files": ["projects/cic/ingestion/src/scoring/"], // Optional: file paths to analyze
  "commitHash": "b4584fb"                           // Optional: specific commit
}
```

**Response:**
```json
{
  "section": "§5.0",
  "status": "Complete | In Progress | Blocked",
  "pct_complete": 92.5,
  "blockers": [
    "Semantic evaluator LLM calls require API credits",
    "Color contrast tests incomplete"
  ],
  "recent_changes": [
    "Scoring engine v1.0 complete",
    "Heuristic rules merged",
    "Auto-repair suggestions implemented"
  ],
  "files_touched": [
    "src/scoring/scoring-engine.mjs",
    "src/scoring/heuristic-rules.mjs"
  ],
  "tests_impacted": [
    "tests/scoring/heuristic.test.js (25 tests)",
    "tests/scoring/semantic.test.js (8 tests)"
  ],
  "next_steps": [
    "Run npm test to verify all scoring subsystems",
    "Validate auto-repair suggestions with real examples",
    "Prepare for integration with playbook evolution"
  ]
}
```

**Error responses:**
```json
// 400 Bad Request
{ "error": "sectionId must be a non-empty string" }

// 404 Not Found
{ "error": "Section §99.0 not found in roadmap" }

// 500 Internal Server Error
{ "error": "Failed to read file projects/cic/ingestion/src/scoring/" }
```

---

### agent-drift-detector

```
POST /skill/agent-drift-detector/detect
Content-Type: application/json

{
  "agentName": "ReverseImageSearchExtractor",
  "expectedSchema": { /* JSON schema */ },
  "actualSchema": { /* JSON schema */ },
  "strictMode": true                    // Optional: fail on any mismatch
}
```

**Response:**
```json
{
  "agent": "ReverseImageSearchExtractor",
  "drift_detected": true,
  "severity": "medium",
  "missing_fields": [
    {
      "field": "confidenceScore",
      "expectedType": "number",
      "impact": "Scoring pipeline cannot rank results"
    }
  ],
  "extra_fields": [
    {
      "field": "legacyTag",
      "actualType": "string",
      "notes": "Dead code; can be removed"
    }
  ],
  "schema_mismatches": [
    {
      "field": "imageUrl",
      "expectedType": "string",
      "actualType": "null | string",
      "issue": "Made nullable without migration"
    }
  ],
  "recommended_fixes": [
    "Add confidenceScore (number) to output schema",
    "Remove legacyTag from extractor logic",
    "Update imageUrl type definition to match actual output"
  ]
}
```

---

### rewrite-labs-orchestrator

```
POST /skill/rewrite-labs-orchestrator/status
Content-Type: application/json

{
  "pipelineState": {
    "Discovery": { "status": "complete", "artifacts": 42 },
    "Harvester": { "status": "running", "progress": 0.65 },
    "Redesign": { "status": "blocked", "blocker": "waiting-for-harvester" },
    "Outreach": { "status": "idle" },
    "Delivery": { "status": "idle" }
  }
}
```

**Response:**
```json
{
  "pipeline_state": {
    "Discovery": { "status": "complete", "artifacts": 42, "duration": "3h 22m" },
    "Harvester": { "status": "running", "progress": 0.65, "eta": "2h 15m" },
    "Redesign": { "status": "blocked", "blocker": "waiting-for-harvester" },
    "Outreach": { "status": "idle" },
    "Delivery": { "status": "idle" }
  },
  "cross_stage_dependencies": [
    "Redesign depends on Harvester output",
    "Outreach depends on Redesign approval",
    "Delivery depends on all prior stages"
  ],
  "blocked_stages": [
    {
      "stage": "Redesign",
      "reason": "Waiting for Harvester to complete",
      "resolution": "Monitor Harvester progress; Redesign will start automatically"
    }
  ],
  "recommended_next_actions": [
    "Monitor Harvester ETA (2h 15m remaining)",
    "Prepare Redesign queue (42 items ready)",
    "Pre-stage Outreach templates"
  ],
  "long_running_tasks": [
    {
      "task": "Harvester batch 5",
      "stage": "Harvester",
      "duration": "45m",
      "status": "healthy"
    }
  ]
}
```

---

### environment-diagnostics

```
POST /skill/environment-diagnostics/diagnose
Content-Type: application/json

{
  "logs": ["C:\\Windows\\System32\\winevt\\Logs\\Application.evtx"],
  "systemInfo": {
    "osVersion": "Windows 11 Pro 10.0.26200",
    "wsl2Enabled": true,
    "msixInstalled": true,
    "claudeDesktopVersion": "0.5.2"
  },
  "mcpServerLogs": [
    "~/.config/Claude/mcp_servers.json"
  ]
}
```

**Response:**
```json
{
  "issues": [
    {
      "issue": "MSIX state loss detected",
      "severity": "high",
      "component": "Claude Desktop",
      "symptom": "Config reverts after restart"
    },
    {
      "issue": "WSL2 DNS drift",
      "severity": "medium",
      "component": "WSL2",
      "symptom": "Intermittent resolution failures"
    }
  ],
  "severity": "high",
  "root_causes": [
    "MSIX package state not persisting to AppData",
    "WSL2 /etc/resolv.conf auto-generated with stale server"
  ],
  "recommended_fixes": [
    {
      "fix": "Re-register MSIX package",
      "steps": [
        "Open Settings > Apps > Installed apps",
        "Find Claude Desktop",
        "Click More options > Repair",
        "Restart application"
      ],
      "effort": "2 minutes"
    },
    {
      "fix": "Fix WSL2 DNS",
      "steps": [
        "Edit ~/.wslconfig",
        "Add '[interop] appendWindowsPath = false'",
        "Restart WSL2 with 'wsl --shutdown'"
      ],
      "effort": "3 minutes"
    }
  ],
  "validation_steps": [
    "Verify Claude Desktop config persists after restart",
    "Test DNS resolution: 'nslookup api.anthropic.com' (in WSL2)",
    "Check MCP server connectivity: 'npx mcp-client list'"
  ]
}
```

---

### session-boundary-manager

```
POST /skill/session-boundary-manager/evaluate
Content-Type: application/json

{
  "transcript": [
    { "role": "user", "content": "Help me with CIC phase 5" },
    { "role": "assistant", "content": "..." },
    // ... 500+ messages
  ],
  "contextWindowSize": 200000,
  "currentUsage": 180000
}
```

**Response:**
```json
{
  "should_split": true,
  "reason": "Context drift: started with CIC phases, now discussing HELM dashboard and benchmark tuning. Also approaching context limit (180k/200k).",
  "summary_for_new_session": "Session covered CIC Phase 5 (scoring system) completion, HELM Phase 2 dashboard integration, and Rewrite Labs benchmark pipeline setup. All three areas are now functional with clear next steps. Generated documentation for all phases.",
  "recommended_entry_prompt": "Continue from: CIC Phase 5 complete + working on next phases (6–10). HELM Phase 2 live. Benchmark pipeline setup (API credits pending). Ready to tackle either Phase 6 (MEE research engine) or HELM Phase 3 (business layer). Which direction?"
}
```

---

### cic-roadmap-updater

```
POST /skill/cic-roadmap-updater/update
Content-Type: application/json

{
  "roadmap": { /* current roadmap object */ },
  "progress": {
    "completedPhases": ["§5.0", "§5.1"],
    "activePhases": ["§6.0"],
    "commits": "b4584fb..HEAD"
  }
}
```

**Response:**
```json
{
  "version_bump": "minor",
  "new_version": "v2.4.0",
  "changes": [
    "Completed Phase 5 (Scoring System)",
    "Merged Phase 5 documentation into CIC_SYSTEM.md",
    "Updated test counts: 304 tests passing"
  ],
  "recommended_roadmap_entries": [
    {
      "section": "Completed",
      "entry": "[v2.4.0] Phase 5 — Deterministic Scoring & Self-Evaluation Layer — 2026-06-04"
    },
    {
      "section": "Active",
      "entry": "Phase 6 — MEE Research Engine — started 2026-06-05"
    }
  ]
}
```

---

### operator-grade-procedures

```
POST /skill/operator-grade-procedures/generate
Content-Type: application/json

{
  "task": "Execute Phase 43 APG cycle",
  "environment": "projects/cic/ingestion",
  "constraints": ["deterministic", "no-rollbacks", "observability-required"]
}
```

**Response:**
```json
{
  "steps": [
    {
      "step": 1,
      "action": "Validate environment variables",
      "command": "env | grep -E 'ANTHROPIC_API_KEY|CIC_'"
    },
    {
      "step": 2,
      "action": "Check dependency versions",
      "command": "npm list --depth=0"
    },
    {
      "step": 3,
      "action": "Initialize MEE phase generator state",
      "command": "npm run cic:mee:init-phase-generator"
    },
    {
      "step": 4,
      "action": "Execute Phase 43 APG cycle",
      "command": "npm run mee:phase:43:apg"
    },
    {
      "step": 5,
      "action": "Verify outputs",
      "check": "Confirm output in projects/cic/mee-specs/phase-43-*.json"
    },
    {
      "step": 6,
      "action": "Handle errors",
      "errors": [
        {
          "error": "API credits exhausted",
          "resolution": "Re-run with --dry-run flag; review proposed changes without execution"
        },
        {
          "error": "State corruption detected",
          "resolution": "Rollback: git checkout HEAD -- projects/cic/mee-state/"
        }
      ]
    }
  ]
}
```

---

## Existing Skills API

### web-regression

**Command:** `bash tools/regressions/check-links.sh`

**Exit codes:**
- `0` — All links valid
- `1` — Broken links found
- `2` — Configuration error

**Output:** Structured log with link checks and any broken targets.

---

### research-capture

**Usage:** Skill runs interactively; takes findings from conversation context.

**Output:** Markdown blocks marked by:
```
--- UPDATE FOR: [filename] ---
[content]
--- END UPDATE ---
```

---

### treatment-update

**Usage:** Skill runs interactively; prompts for treatment version.

**Output:** Treatment drafts marked by:
```
--- TREATMENT CHANGE: [Section] ---
TYPE: [type]
CURRENT TEXT: ...
PROPOSED TEXT: ...
REASON: ...
--- END CHANGE ---
```

---

### doc-update

**Usage:** Skill runs interactively; reads from `docs/CHANGELOG.md`, `docs/ROADMAP.md`, `mkdocs.yml`.

**Output:** Updated files written directly.

---

### docs-sync-release

**Command:** `npm run build-docs` (and supporting validation commands)

**Exit codes:**
- `0` — All validations pass
- `1` — Validation failed

**Output:** Compiled documentation, validation reports, archive.

---

### approvals-audit

**Usage:** Passive skill; automatically logged during sessions.

**Output:** Markdown table in `skills/approvals-audit.md` with request/outcome/resolution.

---

## Error Handling

All new skills return standardized error responses:

```json
{
  "error": "Description of what went wrong",
  "code": "ERROR_CODE",
  "suggestions": ["Try X", "Or try Y"],
  "context": { /* optional debug context */ }
}
```

**Common error codes:**
- `INVALID_INPUT` — Bad request parameters
- `NOT_FOUND` — Resource doesn't exist
- `EXTERNAL_FAILURE` — Dependency failed (API, file system)
- `TIMEOUT` — Operation took too long
- `UNIMPLEMENTED` — Feature not yet available

---

## Testing

Each skill includes a test suite:

```bash
# Run all tests
npm test

# Run specific skill tests
npm test -- skills/cic-section-summarizer/

# Run with coverage
npm test -- --coverage
```

---

## Integration Examples

### Claude Code Hook (Suggested)

```json
{
  "settings": {
    "skills": {
      "cic-section-summarizer": {
        "enabled": true,
        "path": "./skills/cic-section-summarizer/index.js"
      }
    }
  }
}
```

### Bash Invocation

```bash
# Via npm script
npm run skill:cic-section-summarizer -- --section="§5.0"

# Via node CLI
node skills/cic-section-summarizer/cli.js --section="§5.0"
```

### API Server

```javascript
import { summarizeSection } from './skills/cic-section-summarizer/index.js';

const result = await summarizeSection({ sectionId: '§5.0' });
```

---

## Next Steps

1. **Validate API contracts** — Ensure JSON schemas match all three platforms
2. **Test cross-platform** — Run skills in Claude, Copilot, Gemini environments
3. **Document platform-specific behavior** — See [PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md)
4. **Create usage examples** — One example per skill for each platform

---

## Questions?

Refer to the full [implementation scaffolds](./skills/) or the [master library documentation](./SKILLS_LIBRARY.md).
