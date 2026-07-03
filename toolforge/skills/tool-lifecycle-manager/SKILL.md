---
skill_name: tool-lifecycle-manager
version: 0.1.0
category: operations
description: Manage tool lifecycle, versioning, classification, and deployment readiness
author: Chris Sorensen
tags: [toolforge, governance, lifecycle, automation]
---

# Tool Lifecycle Manager

Enforce Toolforge governance rules for tool classification, versioning, status transitions, and deployment readiness. Automates the rules documented in `GOVERNANCE.md`.

## What It Does

Validates and manages tool registrations across the Toolforge ecosystem:

1. **Classification enforcement** → Ensures tools are in correct category (sync-tools, daemons, adapters, utilities, prototypes, etc.)
2. **Version validation** → Enforces semantic versioning (MAJOR.MINOR.PATCH) and status progression (0.x → 1.0.0 → production)
3. **Manifest registration** → Ensures all tools are registered in `manifest.json` with required fields
4. **Status transitions** → Prevents invalid state changes (e.g., can't skip from beta to archived)
5. **Deployment readiness** → Checks prerequisites before promoting tool to production

## When to Use

- **Before deploying a tool** → Verify it meets production quality gates
- **When creating new tools** → Ensure correct classification and versioning
- **When changing tool status** → Validate transition is allowed
- **Weekly governance audit** → Check for misclassified or unregistered tools
- **Before archiving** → Ensure deprecation timeline is met

## How to Invoke

### Option A: Validate Single Tool
```powershell
toolforge-validate-tool -Name multiRepoRoadmapSync -Action readiness-check
```

Output: `✅ PRODUCTION_READY` or list of blockers

### Option B: Validate All Tools
```powershell
toolforge-validate-registry -Action full-audit
```

Output: Registry audit report with all tools and status

### Option C: Via Skill (when installed)
```
Invoke-CliScript -Skill tool-lifecycle-manager -Action validate-registry
```

## Output Examples

**Production Ready:**
```
✅ multiRepoRoadmapSync (v1.0.0, active)
  ✓ Correct classification: sync-tools
  ✓ Semantic versioning: valid
  ✓ Manifest entry: complete
  ✓ Documentation: present (README.md, docs/sync-tools)
  ✓ Tests: 80%+ coverage
  Status: PRODUCTION_READY
```

**Missing Manifest:**
```
❌ setupTaskScheduler (unregistered)
  ✗ Missing from manifest.json
  ✗ Location: utilities/
  ✗ Recommended: Add to manifest with version 0.1.0, status beta
  Action: REGISTER or move to prototypes/
```

**Deprecation Warning:**
```
⚠️ old-sync-tool (v2.1.0, archived)
  ⚠ Status: archived (deprecated 2026-04-28)
  ⚠ Replacement: multiRepoRoadmapSync (v1.1.0)
  ⚠ Cleanup date: 2026-10-28 (6 months post-deprecation)
  Action: Schedule cleanup or migrate users
```

## Governance Rules Enforced

**Classification**
- `sync-tools` → Multi-repo automation (Node.js/PowerShell, registry-based)
- `daemons` → Background services (Task Scheduler compatible)
- `utilities` → One-off helpers (no dependencies)
- `adapters` → Data transformers (reserved for Phase 3+)
- `mcp-servers` → MCP implementations (reserved for Phase 4+)
- `prototypes` → Early-stage (subject to deletion)

**Versioning**
- `0.x.x` → Development (breaking changes OK)
- `1.0.0-rc.X` → Beta (documented changes)
- `1.0.0+` → Production (MAJOR version for breaking changes)
- `x.y.z, archived` → Deprecated (no new deployments)

**Manifest Requirements**
```json
{
  "name": "toolName",
  "category": "sync-tools|daemons|adapters|...",
  "path": "C:/dev/toolforge/category/toolName",
  "version": "0.1.0|1.0.0|...",
  "status": "beta|active|archived|maintenance",
  "owner": "soren",
  "description": "...",
  "entrypoint": "run.ps1|server.ts|..."
}
```

**Status Progression**
- `beta` → In testing; can transition to `active` or back to development
- `active` → Production; must go through `archived` for deprecation
- `archived` → Deprecated; no new deployments; 6 months until cleanup
- `maintenance` → Working but no new features

**Quality Gates (for production promotion)**
- ✅ Semantic versioning enforced
- ✅ Tests: 80%+ coverage for .ts/.js, Pester for .ps1
- ✅ Documentation: README + examples
- ✅ Manifest: Complete registration with all fields
- ✅ No hardcoded secrets (API keys, passwords, tokens)
- ✅ Dependencies locked in lock files

## Evidence

**Why this matters:**
- Experience: GOVERNANCE.md (194 lines) documents rules that are currently manual
- Risk: Misclassification, version drift, unregistered tools, premature deployment
- Automation: Wrapping governance rules prevents human error

**Rulebook:** `C:\dev\toolforge\GOVERNANCE.md` (lines 1–194)

**Current tools:**
- multiRepoRoadmapSync (sync-tools, v0.1.0, beta) ✅
- toolforgeManifestSync (daemon, v0.1.0, beta) ✅
- toolforgeDocsSync (daemon, v0.1.0, beta) ✅
- setupTaskScheduler (utility, v0.1.0, beta) ✅

## Implementation Details

**Wraps:** Validation logic from GOVERNANCE.md + manifest.json schema

**Reads:** 
- `manifest.json` (tool registry)
- `VERSION.md` files (per-tool versions)
- Tool directories (presence of entrypoints, documentation)

**Reports to:** Console + optional `audit/REGISTRY-AUDIT.md`

**Exit codes:**
- 0 = All tools valid
- 1 = Warnings (missing docs, etc.)
- 2 = Errors (unregistered tool, version mismatch, etc.)

## Troubleshooting

**"Tool not found in registry"**
→ Add to `manifest.json` with version and status

**"Version does not match VERSION.md"**
→ Update manifest.json to match tool's VERSION.md

**"Cannot promote beta to archived"**
→ Tools must go: beta → active → archived
→ Recommend: Promote to active first

**"Missing quality gates"**
→ Add tests, docs, lock files before promoting to production

## See Also

- `GOVERNANCE.md` — Complete governance rules and lifecycle stages
- `manifest.json` — Tool registry with all registrations
- `CHANGELOG.md` — Version history and release notes
- `VERSION.md` — Current platform version

---

**Version:** 0.1.0 (beta)  
**Status:** beta (ready for integration into audit workflows)  
**Owner:** soren  
**Last Updated:** 2026-06-28
