# CIC Console Consolidation Plan

**Status**: Ready to Execute  
**Date**: 2026-06-05  
**Target**: Single, authoritative Operator Console v2

---

## Overview

The codebase currently has **2 fragmented console/dashboard implementations** that serve overlapping purposes. This plan consolidates them into a **single, operator-grade CIC Operator Console v2**.

**Principle**: One console, one source of truth, zero fragmentation.

---

## Legacy Consoles Being Retired

### 1. **projects/cic/ui/** — Old CIC Multi-Component UI
- **Status**: Legacy prototype
- **Components**: 
  - `PlannerConsole.tsx` (APR flow visualization)
  - `ExecutionConsole.tsx` (CRO execution tracking)
  - `MetaEvolutionConsole.tsx` (MEE autonomous engine monitoring)
  - `MemoryExplorer.tsx` (knowledge base browser)
  - `SkillExplorer.tsx` (skill registry)
  - `KnowledgeExplorer.tsx` (CKG viewer)
  - `Sidebar.tsx` + `router.tsx`
- **Why retire**: 
  - Built without Operator Console requirements
  - Not integrated with current CRG/CIC/Ruflo infrastructure
  - UI/UX doesn't match modern dashboard patterns
  - Overlaps with new Operator Console v2
- **Replacement**: Operator Console v2 (unified, modern, operator-grade)

### 2. **apps/gh-actions-dashboard/** — GitHub Actions Compliance Dashboard
- **Status**: Standalone compliance tool (useful but redundant)
- **Purpose**: Track GH Actions compliance status
- **Why retire**:
  - Separate app = separate deployment, separate URL, separate auth
  - CIC Operator Console v2 can incorporate compliance metrics
  - Better to have one dashboard for all CIC operations
- **Replacement**: Operator Console v2 integrates compliance + flow metrics

---

## What Gets Archived

All legacy code is **preserved** (not deleted) in:

```
archive/operator-console-legacy/
├── ui/                                  # Old CIC UI components
├── gh-actions-dashboard/                # Old compliance dashboard
└── ARCHIVE_MANIFEST.json               # Metadata + restoration guide
```

**Reversible**: If needed, code can be restored with `git revert`.

---

## CIC Operator Console v2 — What It Will Have

**Single source of truth** for all CIC operations:

| Feature | Source | Pages |
|---------|--------|-------|
| **Flow Execution** | CRG + FlowOrchestrator | Flow Explorer (timeline view) |
| **Agent Performance** | MetricsMiddleware | Agent Performance (latency, success rate) |
| **Context Latency** | ContextService | Context Inspector (load times, cache hit rate) |
| **CRG Health** | CRGAdapter | CRG Health (graph load, cache metrics) |
| **Compliance** | CIC service | Compliance page (integrated from gh-actions-dashboard) |
| **Raw Metrics** | MetricsMiddleware | Metrics page (Prometheus-style) |
| **Flow Registry** | FlowRegistry | Settings (flow templates) |
| **Agent Registry** | AgentRegistry | Settings (agent list + status) |

**Location**: `projects/cic-operator-console/`  
**Tech Stack**: React 18 + Vite + Tailwind + Recharts  
**Deployment**: npm start (dev) / Docker / K8s (prod)  

---

## Execution Plan

### Phase 1: Cleanup (This Script)
```bash
PowerShell -File scripts/cleanup-legacy-consoles.ps1
```

**Actions**:
1. Create `archive/operator-console-legacy/` directory
2. Move `projects/cic/ui/` → archived
3. Move `apps/gh-actions-dashboard/` → archived
4. Create `ARCHIVE_MANIFEST.json` (metadata + rollback guide)
5. List files with old routes requiring manual review
6. Update documentation (README.md, AGENTS.md, DEPLOYMENT.md)
7. Generate commit message template

**Time**: ~30 seconds  
**Reversible**: Yes (git revert)  
**Safety**: All archived code is preserved

### Phase 2: Route Cleanup (Manual)
Review `ROUTE_REVIEW_REQUIRED.txt` and remove any hardcoded routes to old consoles:

```bash
# Examples to find and remove:
grep -r "app.use.*dashboard" projects/cic/
grep -r "app.use.*operator" projects/cic/
grep -r "/console" projects/cic/
```

**Commit separately** from Phase 1 (easier to review).

### Phase 3: Generate Operator Console v2 Scaffold
```bash
# After cleanup is committed
# Generate full Vite/React project with all pages
```

**Deliverables**:
- React component structure
- API client (CIC service integration)
- 7 pages (Dashboard, Flow Explorer, Agent Performance, etc.)
- Tailwind theme + styling
- Docker + K8s deployment

### Phase 4: Deploy
```bash
cd projects/cic-operator-console
npm install
npm start

# Visit http://localhost:5173
```

---

## Files Affected

### Deleted (Archived)
```
projects/cic/ui/                         → archive/operator-console-legacy/ui/
apps/gh-actions-dashboard/               → archive/operator-console-legacy/gh-actions-dashboard/
```

### Updated (Documentation)
```
README.md
  - Replace "legacy CIC console" with "CIC Operator Console v2"
  - Point to projects/cic-operator-console/

projects/cic/README.md
  - Add: "See Operator Console v2 for monitoring"

projects/cic/AGENTS.md
  - Add governance section: "CIC Operator Console v2 is the single authoritative console"

DEPLOYMENT_SUMMARY.md
  - Update monitoring section with new console URL
```

### Code Review Required
```
projects/cic/src/**/*.ts       (check for /dashboard, /console routes)
projects/cic/context-service/ContextServer.ts
projects/cic/src/mee/mee-autonomous-engine.ts
```

---

## Governance Update

**AGENTS.md will include**:

```markdown
## CIC Operator Console v2

**Location**: projects/cic-operator-console/  
**Owners**: CIC Platform Team  
**Status**: Production Grade  

### Scope
Single authoritative console for:
- Flow execution monitoring
- Agent performance metrics
- Context latency tracking
- CRG health
- Compliance metrics
- Settings (flow registry, agent registry)

### Legacy Consoles (Deprecated)
The following are no longer supported:
- projects/cic/ui/ (archived)
- apps/gh-actions-dashboard/ (archived)

All legacy code is preserved in archive/operator-console-legacy/ for reference.

### Access
- Development: http://localhost:5173
- Staging: https://cic-console-staging.internal/
- Production: https://cic-console.internal/
```

---

## Rollback Plan

If something breaks:

```bash
# Revert cleanup commit
git revert <commit-hash>

# Restore from archive manually
mv archive/operator-console-legacy/ui/ projects/cic/ui/
mv archive/operator-console-legacy/gh-actions-dashboard/ apps/gh-actions-dashboard/

# Restore docs
git checkout HEAD~1 -- README.md projects/cic/README.md
```

**Nothing is lost.** Archive is preserved indefinitely.

---

## Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Run cleanup script | 30s | Ready |
| 2 | Review ROUTE_REVIEW_REQUIRED.txt | 5-10m | TBD |
| 2 | Remove old routes (PR) | 15-30m | TBD |
| 3 | Generate Console v2 scaffold | 2-5m | TBD |
| 4 | First local run | 1-2m | TBD |

**Total**: ~1 hour to fully clean and scaffold new console

---

## Success Criteria

✅ Legacy UI directories archived to `archive/operator-console-legacy/`  
✅ All legacy code preserved (no deletions)  
✅ Documentation updated to reference Operator Console v2 only  
✅ Old routes identified and marked for removal  
✅ Archive manifest created with restoration guide  
✅ Cleanup changes committed with governance tags  
✅ Operator Console v2 scaffold generated and working  
✅ Single console running on http://localhost:5173 (dev)  

---

## Next Step

Run the cleanup script:

```bash
PowerShell -File scripts/cleanup-legacy-consoles.ps1
```

Or dry-run first:

```bash
PowerShell -File scripts/cleanup-legacy-consoles.ps1 -DryRun
```

Then confirm in prompt, and cleanup will proceed automatically.

---

**Questions?** See `scripts/cleanup-legacy-consoles.ps1` for full implementation.
