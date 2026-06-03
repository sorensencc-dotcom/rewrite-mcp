# CIC Skill Graph & Cross‑System Doctrine (SGD) — v1.6.0 Release Notes

## Summary

CIC v1.6.0 introduces the **Skill Graph & Cross-System Doctrine (SGD)** module, modeling the system's capabilities, agent roles, and prompt templates in a queryable graph structure. This release aligns internal competencies with external client frameworks (Claude, Copilot, Antigravity) for skill-aware orchestration and automated doctrine drift tracking.

Key pillars:
- **Skill Graph Schema**: Standard JSON-based node/edge layout validating skills, agents, tools, lanes, and phases.
- **Skill Graph Store**: Transaction-gated, file-backed repository for the active graph state.
- **Skill Harvester**: Automated repository walker scanning TypeScript agents and PMS prompt templates, generating relationships and dependencies.
- **Skill Synthesizer**: Analytical engine identifying orphan skills, unused agents, and dense graph hotspots.
- **Cross-System Doctrine Sync**: Divergence tracking computing alignment coverage with external AI platforms.
- **Express API Endpoint Engine**: Public REST routes `/v1/skills/*` exposing graph elements, hotspots, drift audits, and manual trigger controls.
- **Command Center Dashboard**: Premium glassmorphic dark-theme UI panel visualizing stats, connectivity, orphans, and drift charts.
- **Isolator Unit Testing**: Spy-based mocks isolating the unit test suites from filesystem state race conditions.

---

## Highlights

### 1. Persistent Store & Schemas
- Defined schema at [skill-graph.schema.json](file:///c:/dev/rewrite-mcp/projects/cic/skill-graph/schema/skill-graph.schema.json) for validating nodes and edges.
- Created transaction-gated persistent class [skill-graph-store.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/skills/skill-graph-store.ts) mapping records to `projects/cic/skill-graph/graph.json`.

### 2. Harvester & Synthesizer Pipeline
- Developed [skill-harvester.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/skills/skill-harvester.ts) to recursively walk agent files and PMS yaml templates, matching links, and seeding external targets.
- Created [skill-synthesizer.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/skills/skill-synthesizer.ts) to deduplicate entries, highlight orphan templates, detect unused modules, and find dense hotspot joints (degree &ge; 5).

### 3. Cross-System Doctrine Sync
- Implemented [skill-doctrine-sync.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/skills/skill-doctrine-sync.ts) to compute drift lists highlighting unmapped internal competencies and missing external requirements.

### 4. Public REST API & UI Explorer
- Registered public endpoints in [v1-router.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/cic/control-plane/v1-router.ts) via [skills-routes.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/cic/control-plane/skills-routes.ts).
- Integrated [SkillExplorer.tsx](file:///c:/dev/rewrite-mcp/projects/cic/ui/src/components/skills/SkillExplorer.tsx) visual dashboard into the navigation [router.tsx](file:///c:/dev/rewrite-mcp/projects/cic/ui/src/router.tsx) and sidebar panels in [Sidebar.tsx](file:///c:/dev/rewrite-mcp/projects/cic/ui/src/components/Sidebar.tsx).

### 5. Verification Integrity
- Fixed a file-system state race condition in [extractor-v2.test.ts](file:///c:/dev/rewrite-mcp/projects/cic/tests/runtime/extractor-v2.test.ts) by mocking global `specRegistry` evaluators.
- Evolved test suite to **200 passing tests (100% compliance)**.

---

## Files and Modules

- **Core SGD Modules**:
  - `projects/cic/src/skills/skill-graph-store.ts`
  - `projects/cic/src/skills/skill-harvester.ts`
  - `projects/cic/src/skills/skill-synthesizer.ts`
  - `projects/cic/src/skills/skill-doctrine-sync.ts`
- **Control Plane Routing**:
  - `projects/cic/src/cic/control-plane/skills-routes.ts`
- **UI Dashboard Components**:
  - `projects/cic/ui/src/components/skills/SkillExplorer.tsx`
- **Specification Schemas**:
  - `projects/cic/skill-graph/schema/skill-graph.schema.json`
- **Test Suites**:
  - `projects/cic/tests/skills/skills.test.ts`

---

## Upgrade and Verification Check

Re-run compilation and unit tests:
```bash
cd projects/cic
npm run build
npm test
```
