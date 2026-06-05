# Phase 44.1 Quick Start

**Deploy Skill Runtime to Claude Code in 3 steps**

---

## 1. Update Claude Code MCP Config

Add to `.claude/mcp.json` or `claude.config.json`:

```json
{
  "mcpServers": {
    "skill-runtime": {
      "command": "node",
      "args": ["./skills-runtime/mcp-server-client.js"],
      "env": {
        "NODE_PATH": "./skills-runtime:./skills",
        "SKILL_RUNTIME_PATH": "./skills-runtime"
      }
    }
  }
}
```

## 2. Restart Claude Code

Close and reopen Claude Code.

## 3. Ask Claude to Summarize a Phase

```
Summarize phase 44.0 using the summarize_cic_phase tool.
```

Claude should invoke the tool automatically.

---

## 13 Tools Now Available

```
summarize_cic_phase          ← Get phase progress
detect_agent_drift           ← Find schema mismatches
orchestrate_rl_pipeline      ← Monitor RL pipeline
diagnose_environment         ← Debug environment
manage_session_boundary      ← Check context
update_cic_roadmap           ← Bump roadmap version
generate_procedure           ← Create runbooks
detect_web_regression        ← Find UI regressions
capture_research             ← Structure research
update_treatment             ← Configure treatments
update_documentation         ← Update docs
sync_docs_release            ← Release docs
audit_approvals              ← Audit workflows
```

---

## Test It

In Claude Code:

```
Use the diagnose_environment tool to check my system.
Provide logs and systemInfo like this:

{
  "logs": ["Error: ENOENT"],
  "systemInfo": {
    "os": "win32",
    "nodeVersion": "18.0.0"
  }
}
```

---

## Full Documentation

- **Deployment:** `MCP_DEPLOYMENT_GUIDE.md`
- **Integration:** `CLAUDE_CODE_INTEGRATION.md`
- **Completion:** `../PHASE_44.1_COMPLETION.md`

---

## Verify Tools Work

```bash
node -e "
import { mcpServer } from './skills-runtime/mcp-server.js';
const tools = mcpServer.getTools();
console.log(\`Available: \${tools.length} tools\`);
tools.forEach(t => console.log('  ✓', t.name));
"
```

---

**Status:** ✅ Ready to use  
**Next:** Phase 44.2 (Operator Golden Paths)
