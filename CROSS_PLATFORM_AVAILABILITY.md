# Cross-Platform Availability — Phase 44.3

**Date:** 2026-06-05 | **Status:** Production Ready

---

## Current State: What's Available Now

### **Claude Code** ✅ LIVE

**What Works:**
- ✅ All 13 skills via MCP tools
- ✅ All 3 workflows via tool invocation
- ✅ Real-time telemetry
- ✅ Unified status snapshots
- ✅ Operator console (HTML/JS)
- ✅ Alerts + health scoring

**How to Access:**
```
Claude Code → Skill Runtime MCP Server
  → invoke any of 13 skills
  → run any of 3 workflows
  → view telemetry dashboard
  → see unified status
```

**Files in Place:**
- `skills-runtime/mcp-server.js` ✅
- `skills-runtime/mcp-server-client.js` ✅
- `skills/manifest.json` ✅
- `skills/shared/` ✅
- `.claude/mcp.json` (your config)

**Status:** Production ready, no changes needed.

---

### **Copilot** ⏳ READY (Needs HTTP Gateway)

**What's Ready:**
- ✅ All 13 skills defined
- ✅ Adapter spec exists
- ✅ Schema validation ready
- ✅ Error handling defined

**What's Missing:**
- ❌ HTTP API gateway
- ❌ Azure AD auth (if using)
- ❌ Copilot plugin manifest

**To Enable (30 min):**

1. **Create HTTP Gateway**
   ```javascript
   // apps/skill-gateway/index.js
   import express from 'express';
   import { runtime } from '../../skills-runtime/index.js';
   
   const app = express();
   
   app.get('/skills', (req, res) => {
     res.json(runtime.getAvailableSkills());
   });
   
   app.post('/skill/:skillId/invoke', async (req, res) => {
     const result = await runtime.invokeSkill(
       req.params.skillId,
       req.body,
       { timeout: 60000, retries: 1 }
     );
     res.json(result);
   });
   
   app.get('/status', (req, res) => {
     res.json(unifiedStatus.computeSnapshot());
   });
   
   app.listen(3000);
   ```

2. **Deploy to Azure**
   ```bash
   az webapp create --resource-group rg --plan plan --name skill-gateway
   ```

3. **Register Copilot Plugin**
   ```json
   {
     "schema_version": "v1",
     "api": {
       "type": "REST",
       "url": "https://skill-gateway.azurewebsites.net"
     }
   }
   ```

**Result:**
```
Copilot → HTTP API Gateway → Skill Runtime → All 13 Skills
```

---

### **Gemini** ⏳ READY (Needs Google Cloud Adapter)

**What's Ready:**
- ✅ All 13 skills defined
- ✅ Adapter spec exists
- ✅ Schema validation ready
- ✅ Error handling defined

**What's Missing:**
- ❌ Vertex AI integration
- ❌ Google Cloud auth
- ❌ Gemini function calling setup

**To Enable (45 min):**

1. **Create Vertex AI Adapter**
   ```javascript
   // skills-runtime/adapters/vertex-ai.js
   import { VertexAI } from '@google-cloud/vertexai';
   
   const vertexAI = new VertexAI({
     project: process.env.GCP_PROJECT,
     location: 'us-central1'
   });
   
   export const geminiAdapter = {
     normalizeTool: (skill) => ({
       name: skill.name,
       description: skill.description,
       parameters: skill.schema
     }),
     
     invokeSkill: async (skillName, input) => {
       const result = await runtime.invokeSkill(skillName, input);
       return { success: true, data: result };
     }
   };
   ```

2. **Deploy to Vertex AI**
   ```bash
   gcloud functions deploy skill-invoker \
     --runtime nodejs18 \
     --trigger-http \
     --allow-unauthenticated
   ```

3. **Register with Gemini**
   ```python
   model = GenerativeModel('gemini-1.5-pro')
   model.enable_tools(gemini_adapter.get_tools())
   ```

**Result:**
```
Gemini → Vertex AI Functions → Skill Runtime → All 13 Skills
```

---

## Platform Comparison

| Feature | Claude Code | Copilot | Gemini |
|---------|------------|---------|--------|
| **Status** | ✅ Live | ⏳ Ready | ⏳ Ready |
| **Skills (13)** | ✅ Yes | ⏳ Yes | ⏳ Yes |
| **Workflows (3)** | ✅ Yes | ⏳ Yes | ⏳ Yes |
| **Telemetry** | ✅ Yes | ⏳ API | ⏳ API |
| **Console** | ✅ HTML | ⏳ Web | ⏳ Web |
| **Auth** | ✅ Built-in | ⏳ Azure AD | ⏳ GCP |
| **Deployment** | ✅ No setup | ⏳ 30 min | ⏳ 45 min |
| **Cost** | $0 (user's Claude account) | $ (Azure) | $ (GCP) |

---

## Quick Start: Enable All Three Platforms

### Step 1: Verify Claude Code (5 min)

```bash
# Check MCP config exists
cat ~/.claude/projects/c--dev/mcp.json

# Restart Claude Code
# Verify 13 tools appear in sidebar
```

### Step 2: Deploy HTTP Gateway for Copilot (30 min)

```bash
cd c:\dev\rewrite-mcp
npm install express cors dotenv

# Create gateway
cat > apps/skill-gateway/index.js << 'EOF'
import express from 'express';
import cors from 'cors';
import { runtime } from '../../skills-runtime/index.js';
import { unifiedStatus } from '../../skills-runtime/unified-status.js';
import { extendedTelemetry } from '../../skills-runtime/telemetry-extended.js';

const app = express();
app.use(cors());
app.use(express.json());

// List all skills
app.get('/skills', (req, res) => {
  res.json({ skills: runtime.getAvailableSkills() });
});

// Invoke skill
app.post('/skill/:skillId/invoke', async (req, res) => {
  try {
    const result = await runtime.invokeSkill(
      req.params.skillId,
      req.body,
      { timeout: 60000, retries: 1 }
    );
    extendedTelemetry.recordWorkflow(
      `gateway:${req.params.skillId}`,
      0,
      [req.params.skillId],
      true
    );
    res.json({ success: true, data: result });
  } catch (error) {
    extendedTelemetry.recordWorkflow(
      `gateway:${req.params.skillId}`,
      0,
      [req.params.skillId],
      false,
      error
    );
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get unified status
app.get('/status', (req, res) => {
  res.json(unifiedStatus.computeSnapshot());
});

// Get telemetry
app.get('/telemetry', (req, res) => {
  res.json(extendedTelemetry.export());
});

// List workflows
app.get('/workflows', (req, res) => {
  res.json({
    workflows: [
      {
        id: 'phase-summary-roadmap',
        label: 'Phase Summary + Roadmap Update'
      },
      {
        id: 'environment-check-procedure',
        label: 'Environment Check + Procedure'
      },
      {
        id: 'pipeline-orchestration-dashboard',
        label: 'Pipeline Orchestration + Dashboard'
      }
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Skill Gateway running on port ${PORT}`);
});
EOF

# Run locally
node apps/skill-gateway/index.js
```

### Step 3: Register with Copilot (15 min)

[Copilot plugin registration via Microsoft Partner Center]

### Step 4: Deploy to Vertex AI for Gemini (45 min)

[Google Cloud Functions deployment]

---

## What Copilot & Gemini Can Do (Post-Deployment)

### With HTTP Gateway:

**Copilot Scenarios:**
```
"Run phase summary for phase-44.0"
  → Copilot calls /skill/cic-section-summarizer/invoke
  → Returns phase progress + next steps

"Check my environment"
  → Copilot calls /skill/environment-diagnostics/invoke
  → Returns health status + fixes

"What's the system status?"
  → Copilot calls /status
  → Shows unified snapshot
```

**Gemini Scenarios:**
```
"Summarize the current phase and update the roadmap"
  → Gemini calls phase-summary workflow
  → Then calls cic-roadmap-updater skill
  → Returns updated roadmap

"Is my environment ready?"
  → Gemini calls environment-validator
  → Returns compatibility report

"Show me alerts"
  → Gemini calls /telemetry
  → Returns recent alerts + trends
```

---

## Architecture Diagram

### Current (Phase 44.3)
```
Claude Code ← MCP ← Skill Runtime ← 13 Skills
```

### Post-Deployment (Phase 44.4)
```
Claude Code ← MCP ←┐
Copilot ← HTTP   ┼→ Skill Runtime ← 13 Skills
Gemini ← GCP ←┘

All platforms share same runtime + telemetry
```

---

## Deployment Checklist

### Claude Code (Already Done ✅)
- [x] MCP server files
- [x] Skill manifest
- [x] MCP config in `.claude/mcp.json`
- [x] Restart Claude Code
- [x] Verify 13 tools appear

### Copilot (Ready to Deploy)
- [ ] Create HTTP gateway (`apps/skill-gateway/index.js`)
- [ ] Test locally (`node apps/skill-gateway/index.js`)
- [ ] Deploy to Azure
- [ ] Register plugin manifest
- [ ] Test with Copilot

### Gemini (Ready to Deploy)
- [ ] Create Vertex AI adapter
- [ ] Deploy to Google Cloud Functions
- [ ] Register functions with Gemini
- [ ] Test with Gemini

---

## Next Steps

### Immediate (Today)
1. ✅ Verify Claude Code works
2. Deploy HTTP gateway (30 min)
3. Test with Copilot (15 min)

### This Week
4. Deploy Vertex AI adapter (45 min)
5. Test with Gemini (15 min)
6. Verify all platforms can run workflows

### Next Week
7. Phase 44.4 (Autonomous Orchestrator)
8. Phase 45 (7 New Skills)

---

**Status:** Claude Code ✅ Live | Copilot ⏳ Ready (30 min) | Gemini ⏳ Ready (45 min)

All 13 skills + 3 workflows can be available on all 3 platforms by end of today.

