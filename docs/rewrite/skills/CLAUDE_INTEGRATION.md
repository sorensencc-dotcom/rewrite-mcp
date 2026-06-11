# Shared Skills Library — Claude Code Integration

## Overview

The Shared Skills Library is now available in Claude Code as a set of deterministic, reusable skills.

**Total skills available:** 13  
**New skills ready:** 7  
**Existing skills:** 6  

---

## How to Use a Skill

### Option 1: Import and invoke directly

```javascript
import { summarizeSection, detectDrift, orchestratePipeline } from "./skills/index.js";

const result = summarizeSection({
  sectionId: "phase-44.0",
  files: ["file1.ts", "file2.ts"]
});
```

### Option 2: Use the universal invoker

```javascript
import { invokeSkill } from "./skills/index.js";

const result = await invokeSkill("cic-section-summarizer", {
  sectionId: "phase-44.0",
  files: []
});
```

### Option 3: Dynamic loading (on-demand)

```javascript
import { loadSkill, getSkillsByPlatform } from "./skills/skill-loader.js";

const skill = await loadSkill("cic-section-summarizer");
const result = skill({ sectionId: "phase-44.0" });

// Get all Claude-compatible skills
const claudeSkills = await getSkillsByPlatform("claude");
```

---

## Available Skills

### New Skills (7)

| Skill | Purpose | Input | Output |
|-------|---------|-------|--------|
| **cic-section-summarizer** | Summarize CIC phase progress | `{sectionId, files?}` | `{sectionId, percentComplete, status, blockers, nextSteps}` |
| **agent-drift-detector** | Detect schema drift | `{agentName, expectedSchema, actualSchema}` | `{driftDetected, missingFields, extraFields, recommendations}` |
| **rewrite-labs-orchestrator** | Monitor pipeline | `{pipelineState}` | `{totalStages, blockedStages, progressPercent, nextSteps}` |
| **environment-diagnostics** | Debug environment | `{logs, systemInfo}` | `{issuesFound, issues, rootCauses, fixes, overallHealth}` |
| **session-boundary-manager** | Detect overflow | `{transcript}` | `{messageCount, contextDriftScore, isOverflowing, recommendations}` |
| **cic-roadmap-updater** | Update roadmap | `{roadmap, progress}` | `{percentComplete, suggestedVersion, newEntries}` |
| **operator-grade-procedures** | Generate runbooks | `{task, environment}` | `{procedureId, steps, validationChecks, errorBranches}` |

### Deployed Skills (6)

- **web-regression** — Verify doc links
- **research-capture** — Route findings to documents
- **treatment-update** — Apply narrative changes
- **doc-update** — Update changelog/roadmap
- **docs-sync-release** — Validate + build docs
- **approvals-audit** — Log operator approvals

---

## Error Handling

All skills use a unified error model:

```javascript
import { SkillError, ValidationError } from "./skills/shared/errors.js";

try {
  const result = summarizeSection({});
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(`Validation failed: ${err.message}`);
    console.log(`Field: ${err.details.field}`);
  }
}
```

---

## Validation Utilities

For building new skills, use shared validation:

```javascript
import { assertString, assertObject, assertArray } from "./skills/shared/validate.js";

function mySkill({ name, config, items }) {
  assertString(name, "name", "my-skill");
  assertObject(config, "config", "my-skill");
  assertArray(items, "items", "my-skill");
  // ... rest of logic
}
```

---

## Logging

Each skill can use structured logging:

```javascript
import { createLogger } from "./skills/shared/logger.js";

const logger = createLogger("my-skill");
logger.info("Skill started", { payload });
logger.debug("Processing item", { item });
logger.warn("Fallback used", { reason });
logger.error("Failed to process", err, { context });
```

---

## Testing

All skills have test suites. Run:

```bash
npm test -- skills/cic-section-summarizer/
npm test -- skills/*/index.test.js  # all skills
```

---

## Skill Manifest

The `manifest.json` defines all skills with:
- Version
- Entry point (index.js)
- Schema (schema.json)
- Platform support (claude, copilot, gemini)
- Description

Use it to:
- Discover available skills
- Check platform compatibility
- Validate skill versions

```javascript
import { manifest } from "./skills/index.js";
console.log(manifest.skills);
```

---

## Adding New Skills

1. Create directory: `skills/my-skill/`
2. Add three files:
   - `index.js` — Export skill function
   - `schema.json` — JSON schema for inputs
   - `index.test.js` — Test suite
3. Register in `manifest.json`
4. Test: `npm test -- skills/my-skill/`
5. Export from `skills/index.js` (optional)

---

## Platform Notes

| Skill | Claude | Copilot | Gemini |
|-------|--------|---------|--------|
| cic-section-summarizer | ✅ | ⚠️ | ⚠️ |
| agent-drift-detector | ✅ | ⚠️ | ⚠️ |
| rewrite-labs-orchestrator | ✅ | ⚠️ | ⚠️ |
| environment-diagnostics | ✅ | ❌ | ❌ |
| session-boundary-manager | ✅ | ✅ | ✅ |
| cic-roadmap-updater | ✅ | ⚠️ | ⚠️ |
| operator-grade-procedures | ✅ | ⚠️ | ⚠️ |

Legend: ✅ Ready | ⚠️ Needs adaptation | ❌ Not applicable

---

## Documentation

For more details, see:
- `SKILLS_LIBRARY.md` — Complete skill inventory
- `SKILLS_API_REFERENCE.md` — Full API specifications
- `SKILLS_PLATFORM_NOTES.md` — Platform-specific guidance
- `README_SKILLS_LIBRARY.md` — Quick start guide

---

**Last updated:** 2026-06-05 | **Version:** 1.0.0
