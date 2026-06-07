# Claude Code Integration — Phase 44.1

**Objective:** Integrate Skill Runtime into Claude Code MCP server  
**Status:** Complete | **Version:** 1.0.0 | **Date:** 2026-06-05

---

## What You Have

✅ **13 Skills** — All tested, deployed  
✅ **Skill Runtime** — Loader, validator, sandbox, telemetry, context  
✅ **MCP Server** — Maps skills to Claude tools  
✅ **Error Handling** — SkillError → Claude-friendly messages  
✅ **Telemetry** — Full metrics & observability

---

## Integration Steps

### Step 1: Deploy MCP Server to Claude Code

1. **Verify files in place:**
   ```bash
   ls -la skills-runtime/
   # Should show:
   # - mcp-server.js
   # - mcp-server-client.js
   # - skill-tool-config.json
   # - index.js (updated)
   ```

2. **Add to Claude Code MCP configuration:**
   
   File: `.claude/mcp.json` or `claude.config.json`
   
   ```json
   {
     "mcpServers": {
       "skill-runtime": {
         "command": "node",
         "args": [
           "./skills-runtime/mcp-server-client.js"
         ],
         "env": {
           "NODE_PATH": "./skills-runtime:./skills",
           "SKILL_RUNTIME_PATH": "./skills-runtime"
         }
       }
     }
   }
   ```

3. **Restart Claude Code**
   - Close Claude Code
   - Wait 2 seconds
   - Reopen Claude Code

### Step 2: Verify Tool Availability

Ask Claude Code:

```
List the available tools you have access to.
```

Expected response: Claude lists 13 skill-runtime tools.

Or check programmatically:

```bash
node -e "
import { mcpServer } from './skills-runtime/mcp-server.js';
console.log(mcpServer.getTools().map(t => t.name));
"
```

Expected output:
```
[
  'summarize_cic_phase',
  'detect_agent_drift',
  'orchestrate_rl_pipeline',
  'diagnose_environment',
  'manage_session_boundary',
  'update_cic_roadmap',
  'generate_procedure',
  'detect_web_regression',
  'capture_research',
  'update_treatment',
  'update_documentation',
  'sync_docs_release',
  'audit_approvals'
]
```

### Step 3: Test Tool Invocation

In Claude Code, ask:

```
Summarize the current CIC phase. Use the summarize_cic_phase tool 
with sectionId="phase-44.1" and files=["phase-44.1.md"]
```

Expected Claude response:
```
I'll use the summarize_cic_phase tool to get the phase summary.

Tool: summarize_cic_phase
Input: {
  "sectionId": "phase-44.1",
  "files": ["phase-44.1.md"]
}

Result: {
  "sectionId": "phase-44.1",
  "percentComplete": 85,
  "status": "in-progress",
  ...
}
```

---

## Tool Mapping Reference

Each skill is exposed as an MCP tool:

| Skill | Tool Name | Parameters |
|-------|-----------|------------|
| cic-section-summarizer | `summarize_cic_phase` | `sectionId`, `files` |
| agent-drift-detector | `detect_agent_drift` | `agentName`, `expectedSchema`, `actualSchema` |
| rewrite-labs-orchestrator | `orchestrate_rl_pipeline` | `pipelineState` |
| environment-diagnostics | `diagnose_environment` | `logs`, `systemInfo` |
| session-boundary-manager | `manage_session_boundary` | `transcript` |
| cic-roadmap-updater | `update_cic_roadmap` | `roadmap`, `progress` |
| operator-grade-procedures | `generate_procedure` | `task`, `environment` |
| web-regression | `detect_web_regression` | `screenshotA`, `screenshotB` |
| research-capture | `capture_research` | `findings` |
| treatment-update | `update_treatment` | `treatmentId`, `config` |
| doc-update | `update_documentation` | `docPath`, `content` |
| docs-sync-release | `sync_docs_release` | `version` |
| approvals-audit | `audit_approvals` | `auditScope` |

---

## Error Handling

### Validation Errors

If you pass invalid input, Claude gets:

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

Claude will then ask you to provide the missing parameter.

### Execution Errors

If a skill fails during execution:

```json
{
  "error": true,
  "tool": "orchestrate_rl_pipeline",
  "type": "SkillError",
  "message": "Pipeline state is invalid",
  "skillName": "rewrite-labs-orchestrator",
  "durationMs": 245
}
```

Claude will suggest alternatives or debugging steps.

---

## Common Use Cases

### 1. Get Phase Status

```
User: What's the status of phase 44.0?

Claude: I'll check the phase status using the summarize tool.
[invokes summarize_cic_phase with sectionId="phase-44.0"]
```

### 2. Detect Environment Issues

```
User: Why is the MCP server not starting?

Claude: I'll analyze the error logs.
[invokes diagnose_environment with logs and systemInfo]
```

### 3. Generate Runbook

```
User: Generate a runbook for deploying phase 44.1

Claude: I'll create a procedure using the operator tool.
[invokes generate_procedure with task and environment]
```

### 4. Update Roadmap

```
User: We've completed 85% of phase 44. Update the roadmap.

Claude: I'll update the roadmap with the progress.
[invokes update_cic_roadmap with progress data]
```

---

## Monitoring & Observability

### Check Skill Health

```bash
node -e "
import { mcpServer } from './skills-runtime/mcp-server.js';
const metrics = mcpServer.getAllMetrics();
console.log(JSON.stringify(metrics.summary, null, 2));
"
```

Output:
```json
{
  "totalInvocations": 42,
  "totalErrors": 1,
  "successRate": "97.62%"
}
```

### Track Individual Skill Performance

```bash
node -e "
import { mcpServer } from './skills-runtime/mcp-server.js';
const metrics = mcpServer.getSkillMetrics('cic-section-summarizer');
console.log('Average duration:', metrics.averageDuration + 'ms');
console.log('Success rate:', (metrics.successfulInvocations / metrics.totalInvocations * 100).toFixed(1) + '%');
"
```

### View Recent Errors

```bash
node -e "
import { mcpServer } from './skills-runtime/mcp-server.js';
const telemetry = mcpServer.getAllMetrics();
console.log(JSON.stringify(telemetry.errors.slice(-5), null, 2));
"
```

---

## Troubleshooting

### Issue: "Unknown tool: summarize_cic_phase"

**Cause:** MCP server not loaded or skills not registered  
**Fix:**
1. Verify `skill-tool-config.json` exists
2. Check `NODE_PATH` environment variable
3. Restart Claude Code
4. Check logs: `NODE_PATH=... node skills-runtime/mcp-server-client.js`

### Issue: "Validation failed: sectionId is required"

**Cause:** Missing required tool parameter  
**Fix:** Check schema in `skill-tool-config.json` for required fields

### Issue: Tool executes but returns error

**Cause:** Skill execution failed  
**Check:**
1. Skill logic in `skills/[skillName]/index.js`
2. Telemetry: `mcpServer.getSkillMetrics('[skillName]')`
3. Error logs: `mcpServer.getAllMetrics().errors`

### Issue: Slow tool execution

**Cause:** Default 60s timeout may be tight for long operations  
**Check:** Update timeout in `mcp-server.js` line 37

---

## Next Phase: 44.2 (Operator Golden Paths)

Once Claude Code integration is verified, next phase is:

1. **Define 3–5 canonical workflows** (golden paths)
   - Phase summarization + roadmap update
   - Environment diagnostics + procedure generation
   - Pipeline orchestration + status reporting

2. **Build operator console** for skill invocation

3. **Add cost/time estimation** for each skill

4. **Integrate with CI/CD** for automated phase validation

---

## Files Reference

| File | Purpose |
|------|---------|
| `mcp-server.js` | Main MCP server class |
| `mcp-server-client.js` | CLI entry point for Claude Code |
| `skill-tool-config.json` | Skill → Tool mapping |
| `index.js` | Runtime exports (updated) |
| `MCP_DEPLOYMENT_GUIDE.md` | Full deployment guide |
| `mcp-server.test.js` | Integration tests |

---

## Success Checklist ✅

- [ ] MCP server files in place
- [ ] Claude Code MCP config updated
- [ ] Claude Code restarted
- [ ] 13 tools appear in Claude Code
- [ ] Test tool execution works
- [ ] Error handling surfaces cleanly
- [ ] Telemetry accessible via CLI
- [ ] Deployment guide reviewed
- [ ] Team notified of tool availability

---

**Phase 44.1 Status:** ✅ Complete  
**Phase 44.2 Status:** Ready to start  
**Date Completed:** 2026-06-05

