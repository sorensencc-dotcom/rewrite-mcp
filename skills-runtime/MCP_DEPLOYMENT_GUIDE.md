# MCP Deployment Guide — Phase 44.1

**Status:** Production Ready | **Version:** 1.0.0 | **Date:** 2026-06-05

---

## Overview

The Skill Runtime MCP Server exposes all 13 skills as callable tools in Claude Code.

**Benefits:**
- ✅ Single runtime for all skills
- ✅ Built-in validation, sandboxing, telemetry
- ✅ Error handling that surfaces cleanly in Claude
- ✅ Dependency tracking & cycle detection
- ✅ Shared context across tools

---

## Installation

### 1. Copy MCP Server Files

```bash
# Already in place:
# - skills-runtime/mcp-server.js
# - skills-runtime/skill-tool-config.json
```

### 2. Update Claude Code MCP Server Configuration

Add to your Claude Code `.env` or MCP config:

```json
{
  "mcpServers": {
    "skill-runtime": {
      "command": "node",
      "args": ["./skills-runtime/mcp-server-client.js"],
      "env": {
        "SKILL_RUNTIME_PATH": "./skills-runtime"
      }
    }
  }
}
```

### 3. Verify Installation

```bash
node -e "
import { mcpServer } from './skills-runtime/mcp-server.js';
console.log(mcpServer.exportConfig());
"
```

Expected output: List of 13 tools with schemas.

---

## Usage in Claude Code

### Option A: Direct Tool Call

Claude automatically sees all 13 skills as tools:

```
User: Summarize phase 44.0

Claude: I'll use the summarize_cic_phase tool.
```

Claude invokes:
```
Tool: summarize_cic_phase
Input: { sectionId: "phase-44.0" }
```

### Option B: Programmatic (Within Agents)

```javascript
import { mcpServer } from "./skills-runtime/mcp-server.js";

const result = await mcpServer.executeTool("summarize_cic_phase", {
  sectionId: "phase-44.0",
  files: ["phase-44.0.ts"]
});

console.log(result.content[0].text);
```

---

## Tool Availability

All 13 skills are available as MCP tools:

| Skill | MCP Tool | Use Case |
|-------|----------|----------|
| cic-section-summarizer | `summarize_cic_phase` | Get phase progress |
| agent-drift-detector | `detect_agent_drift` | Find schema mismatches |
| rewrite-labs-orchestrator | `orchestrate_rl_pipeline` | Monitor RL pipeline |
| environment-diagnostics | `diagnose_environment` | Debug environment |
| session-boundary-manager | `manage_session_boundary` | Check context overflow |
| cic-roadmap-updater | `update_cic_roadmap` | Bump roadmap version |
| operator-grade-procedures | `generate_procedure` | Generate runbooks |
| web-regression | `detect_web_regression` | Find UI regressions |
| research-capture | `capture_research` | Structure research findings |
| treatment-update | `update_treatment` | Configure treatments |
| doc-update | `update_documentation` | Update docs with validation |
| docs-sync-release | `sync_docs_release` | Release doc changes |
| approvals-audit | `audit_approvals` | Audit approval workflows |

---

## Error Handling

### Validation Error

**Input:** Missing required field

```json
{
  "error": true,
  "tool": "summarize_cic_phase",
  "type": "ValidationError",
  "message": "sectionId is required",
  "field": "sectionId",
  "details": "Check tool input against schema"
}
```

### Skill Error

**Input:** Skill execution fails

```json
{
  "error": true,
  "tool": "detect_agent_drift",
  "type": "SkillError",
  "message": "Schema comparison failed",
  "skillName": "agent-drift-detector",
  "durationMs": 125
}
```

### Generic Error

**Input:** Unexpected failure

```json
{
  "error": true,
  "tool": "orchestrate_rl_pipeline",
  "type": "Error",
  "message": "Timeout after 60000ms",
  "details": "Unexpected error during skill execution"
}
```

---

## Telemetry

### Access Metrics

Query runtime telemetry:

```javascript
import { mcpServer } from "./skills-runtime/mcp-server.js";

// Metrics for one skill
const metrics = mcpServer.getSkillMetrics("cic-section-summarizer");
console.log(metrics.averageDuration);   // ms
console.log(metrics.successfulInvocations);
console.log(metrics.failedInvocations);

// All metrics
const allMetrics = mcpServer.getAllMetrics();
console.log(allMetrics.summary.successRate);  // "95.5%"
```

### Telemetry Fields

```javascript
{
  summary: {
    totalInvocations: 42,
    totalErrors: 2,
    successRate: "95.24%"
  },
  metrics: {
    "cic-section-summarizer": {
      totalInvocations: 10,
      successfulInvocations: 10,
      failedInvocations: 0,
      averageDuration: 245,
      minDuration: 180,
      maxDuration: 320
    }
  },
  invocations: [ /* last 100 calls */ ],
  errors: [ /* error log */ ]
}
```

---

## Validation & Dependencies

### Check Skill Health

```javascript
const health = mcpServer.validateSkill("cic-roadmap-updater");
// {
//   skillName: "cic-roadmap-updater",
//   isValid: true,
//   dependencies: ["cic-section-summarizer"],
//   missingDependencies: []
// }
```

### Check for Cycles

```javascript
const depGraph = mcpServer.checkDependencies();
// {
//   hasCycles: false,
//   topologicalOrder: [ /* execution order */ ]
// }
```

---

## Schema Reference

### summarize_cic_phase

```json
{
  "sectionId": "phase-44.0",
  "files": ["src/phase44/index.ts"]
}
```

Returns:
```json
{
  "sectionId": "phase-44.0",
  "percentComplete": 75,
  "status": "in-progress",
  "blockers": [],
  "nextSteps": [...]
}
```

### detect_agent_drift

```json
{
  "agentName": "operator-v2",
  "expectedSchema": { "version": "1.0", "fields": ["a", "b"] },
  "actualSchema": { "version": "1.0", "fields": ["a", "b", "c"] }
}
```

Returns:
```json
{
  "driftDetected": true,
  "missingFields": [],
  "extraFields": ["c"],
  "recommendations": ["Add 'c' to spec or remove from deployment"]
}
```

### orchestrate_rl_pipeline

```json
{
  "pipelineState": {
    "stages": ["ingestion", "processing", "output"],
    "current": "processing",
    "status": "running"
  }
}
```

Returns:
```json
{
  "totalStages": 3,
  "completedStages": 1,
  "blockedStages": 0,
  "progressPercent": 33,
  "nextSteps": ["Continue processing..."]
}
```

### diagnose_environment

```json
{
  "logs": [
    "Error: ENOENT: no such file or directory",
    "at Object.openSync (fs.js:476:3)"
  ],
  "systemInfo": {
    "os": "win32",
    "nodeVersion": "18.0.0"
  }
}
```

Returns:
```json
{
  "issuesFound": 1,
  "issues": ["Missing file or directory"],
  "rootCauses": ["File path not found"],
  "fixes": ["Check file path exists", "Verify permissions"],
  "overallHealth": "degraded"
}
```

---

## Best Practices

### 1. Always Use Tool Input Validation
Claude validates tool inputs against schemas automatically.

### 2. Monitor Telemetry
Review metrics weekly:
- High error rates → investigate skill
- High latency → increase timeout
- Low usage → consider removing

### 3. Set Appropriate Timeouts
Default 60s works for most skills. Override for long-running:

```javascript
// Not exposed yet, but available in runtime
await runtime.invokeSkill("my-skill", input, {
  timeout: 120000  // 2 minutes
});
```

### 4. Use Shared Context Wisely
Store shared state across tool calls:

```javascript
mcpServer.runtime.setContext("phase", "current", "44.0", 3600000); // 1 hour TTL
const phase = mcpServer.runtime.getContext("phase").current;
```

---

## Troubleshooting

### "Unknown tool: foo"
- Verify tool name in skill-tool-config.json
- Check SKILL_RUNTIME_PATH env var
- Restart Claude Code

### "Validation failed"
- Check tool input matches schema
- Review MCP_DEPLOYMENT_GUIDE.md schema section
- Use Claude's validation error message

### "Timeout after 60000ms"
- Increase timeout in MCP server (Phase 44.2)
- Check skill performance via telemetry
- Profile slow skills with benchmarks

### "Skill not found"
- Verify skill exists in skills/ directory
- Check manifest.json for registration
- Confirm schema.json in skill directory

---

## Next Steps — Phase 44.2+

- [ ] Define operator golden paths (3–5 canonical workflows)
- [ ] Build operator console UI for skill invocation
- [ ] Add cost modeling to telemetry
- [ ] Integrate machine-time estimator
- [ ] Multi-model pipeline support

---

**Last updated:** 2026-06-05 | **Status:** Phase 44.1 Complete
