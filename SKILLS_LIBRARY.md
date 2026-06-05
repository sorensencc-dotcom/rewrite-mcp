# Shared Skills Library
## v1.0.0 | 2026-06-05

Unified, implementation-ready skill definitions for Claude, Copilot, and Gemini.

This library defines both **new skills** (for cross-platform deployment) and **existing skills** (currently deployed in rewrite-mcp).

---

## Quick Reference: All Skills

| Skill | Category | Status | Platform Readiness |
|-------|----------|--------|-------------------|
| **cic-section-summarizer** | CIC Operations | ✅ New (Ready) | Claude, Copilot, Gemini |
| **agent-drift-detector** | CIC Operations | ✅ New (Ready) | Claude, Copilot, Gemini |
| **rewrite-labs-orchestrator** | Pipeline Operations | ✅ New (Ready) | Claude, Copilot, Gemini |
| **environment-diagnostics** | DevOps | ✅ New (Ready) | Claude, Copilot, Gemini |
| **session-boundary-manager** | Chat Ops | ✅ New (Ready) | Claude, Copilot, Gemini |
| **cic-roadmap-updater** | CIC Operations | ✅ New (Ready) | Claude, Copilot, Gemini |
| **operator-grade-procedures** | Documentation | ✅ New (Ready) | Claude, Copilot, Gemini |
| **web-regression** | Testing | ✅ Existing (Deployed) | Claude, Gemini |
| **research-capture** | Documentation | ✅ Existing (Deployed) | Claude, Gemini |
| **treatment-update** | Documentary | ✅ Existing (Deployed) | Claude |
| **doc-update** | Documentation | ✅ Existing (Deployed) | Claude, Gemini |
| **docs-sync-release** | Release Management | ✅ Existing (Deployed) | Claude, Gemini |
| **approvals-audit** | Governance | ✅ Existing (Deployed) | Claude |

---

## New Skills (Ready for Cross-Platform Deployment)

### 1. cic-section-summarizer
**Purpose:** Automatically summarize any CIC roadmap section into deterministic operator-grade report.

**When to use:**
- After implementing a CIC phase or section
- Before merging related changes
- During phase completion reviews
- For checkpoint validation

**Input:** Section ID (e.g., `§0.4`, `§3.2-C`), optional file paths or commit hashes
**Output:** JSON with status, % complete, blockers, recent changes, next steps

**Key features:**
- Deterministic summary generation
- Missing test detection
- Drift identification vs spec
- Actionable next steps

**Example:**
```bash
# Summarize Phase 5 implementation
cic-section-summarizer --section="§5.0" --files="projects/cic/ingestion/src/scoring/"
```

[Full implementation scaffold](./skills/cic-section-summarizer/)

---

### 2. agent-drift-detector
**Purpose:** Detect schema/logic drift across CIC agents, extractors, and pipeline components.

**When to use:**
- After modifying an extractor or agent
- During cross-platform validation (Claude vs Copilot vs Gemini)
- When integrating new agents into the pipeline
- For schema versioning checkpoints

**Input:** Agent name, expected schema, actual schema
**Output:** JSON with drift detection, missing/extra fields, fixes

**Key features:**
- Schema comparison
- Missing field detection
- Outdated logic identification
- Suggested patches

**Example:**
```bash
# Check ReverseImageSearchExtractor for drift
agent-drift-detector \
  --agent="ReverseImageSearchExtractor" \
  --expected="dist/extractors/schema/image-extractor.json" \
  --actual="projects/cic/src/extractors/ReverseImageSearchExtractor.ts"
```

[Full implementation scaffold](./skills/agent-drift-detector/)

---

### 3. rewrite-labs-orchestrator
**Purpose:** Track the entire Rewrite Labs pipeline continuously (Discovery → Harvester → Redesign → Outreach → Delivery + future stages).

**When to use:**
- During pipeline execution monitoring
- When debugging stage bottlenecks
- To detect cross-stage dependencies
- For long-running task coordination

**Input:** Current pipeline state, artifacts, stage outputs
**Output:** JSON with pipeline state, blocked stages, recommended next actions

**Key features:**
- Continuous pipeline tracking
- Cross-stage dependency detection
- Bottleneck identification
- Multi-session continuity

**Example:**
```bash
# Monitor entire RL pipeline
rewrite-labs-orchestrator --pipeline-state="data/pipeline-state.json"
```

[Full implementation scaffold](./skills/rewrite-labs-orchestrator/)

---

### 4. environment-diagnostics
**Purpose:** Diagnose environment issues across Windows, WSL2, MSIX, Claude Desktop, and MCP servers.

**When to use:**
- Troubleshooting startup failures
- Validating environment setup
- Debugging cross-platform issues
- After system updates or config changes

**Input:** Event logs, system info, dependency manifests, MCP logs
**Output:** JSON with issues, severity, root causes, fixes, validation steps

**Key features:**
- Windows Event Log parsing
- MSIX/Store corruption detection
- WSL2 networking validation
- MCP server health checks
- Isolation layer verification

**Example:**
```bash
# Diagnose environment issues
environment-diagnostics \
  --logs="C:\Windows\System32\winevt\Logs" \
  --mcp-dir="~/.config/Claude/mcp_servers.json"
```

[Full implementation scaffold](./skills/environment-diagnostics/)

---

### 5. session-boundary-manager
**Purpose:** Automatically detect when a session is drifting or exceeds context limits; recommend clean boundary.

**When to use:**
- Long multi-hour sessions
- When topic shifts significantly
- Before context window fills
- For session handoff planning

**Input:** Conversation transcript, context window size, topic metadata
**Output:** JSON with should-split decision, summary, new session entry prompt

**Key features:**
- Drift detection
- Context overload prediction
- Auto-summarization
- Clean boundary recommendations

**Example:**
```bash
# Evaluate session for splitting
session-boundary-manager --transcript="session.jsonl" --window-size=200000
```

[Full implementation scaffold](./skills/session-boundary-manager/)

---

### 6. cic-roadmap-updater
**Purpose:** Automatically update CIC Master Roadmap based on real progress, commits, and section summaries.

**When to use:**
- After phase completion
- During weekly status updates
- Before release commits
- For roadmap versioning

**Input:** Current roadmap, recent commits, section summaries, extractor statuses
**Output:** JSON with version bump, new entries, recommended roadmap changes

**Key features:**
- Deterministic version bumping
- Progress diff vs roadmap
- New roadmap entry generation
- Living-doc compliance

**Example:**
```bash
# Update roadmap with Phase 5 completion
cic-roadmap-updater \
  --roadmap="docs/cic/CIC_MASTER_ROADMAP.md" \
  --commits="HEAD~10..HEAD" \
  --phase-summary="§5.0"
```

[Full implementation scaffold](./skills/cic-roadmap-updater/)

---

### 7. operator-grade-procedures
**Purpose:** Generate deterministic, step-by-step procedures for any task with validation and error handling.

**When to use:**
- Creating runbooks
- Documenting complex operations
- Training new operators
- Safety-critical task sequencing

**Input:** Task description, environment context, constraints
**Output:** JSON with numbered steps, validation, error branches

**Key features:**
- Step-by-step determinism
- Validation checks
- Error handling branches
- Explicit commands (no ambiguity)

**Example:**
```bash
# Generate procedure for MEE phase execution
operator-grade-procedures \
  --task="Execute Phase 43 APG cycle" \
  --environment="projects/cic/ingestion" \
  --constraints="deterministic,no-rollbacks"
```

[Full implementation scaffold](./skills/operator-grade-procedures/)

---

## Existing Skills (Already Deployed)

### 1. web-regression
**Status:** ✅ Deployed | Used in: rewrite-mcp release cycle  
**Owner:** Claude  
**Description:** Verify all documentation links after builds, UI changes, or releases.

**When to use:**
- After every documentation build
- Before release commits
- When nav/site structure changes

**Command:** `bash tools/regressions/check-links.sh`

**Features:**
- Automated link verification
- Navigation structure checks
- Asset validation
- Quick reference for common patterns

[Full definition](./skills/web-regression.md)

---

### 2. research-capture
**Status:** ✅ Deployed | Used in: CIC documentary research  
**Owner:** Claude  
**Description:** Route research findings to the right documents; auto-update indices, logs, and archives.

**When to use:**
- After batch image review sessions
- When archival finds are discovered
- For outreach contact logging
- Post-source-analysis documentation

**Features:**
- Intelligent document routing
- Finding classification
- Multi-document batch updates
- Treatment implication flagging
- Project-aware (CIC-specific or generic)

[Full definition](./skills/research-capture.md)

---

### 3. treatment-update
**Status:** ✅ Deployed | Used in: CIC documentary production  
**Owner:** Claude  
**Description:** Apply research findings, archival evidence, or narrative changes to documentary treatment with version discipline.

**When to use:**
- Adding archival finds to scenes
- Correcting facts in treatment
- Structural revisions or reordering
- Narrative reframing based on new evidence

**Features:**
- Version-aware updates
- Editorial principle application
- Before/after drafting
- Dependency flagging
- Structural intelligence

[Full definition](./skills/treatment-update.md)

---

### 4. doc-update
**Status:** ✅ Deployed | Used in: rewrite-mcp maintenance  
**Owner:** Claude  
**Description:** Update changelog, roadmap, and mkdocs nav after phase completion or source changes.

**When to use:**
- After every completed phase
- When new docs are created
- During release preparation

**Features:**
- Semantic version bumping
- Changelog entry generation
- Roadmap section updates
- MkDocs nav integration
- Suggestion logging

[Full definition](./skills/doc-update.md)

---

### 5. docs-sync-release
**Status:** ✅ Deployed | Used in: CIC release pipeline  
**Owner:** Claude  
**Description:** Sync documentation, run validation suite, build docs, and package release artifacts.

**When to use:**
- Pre-release documentation audit
- After MEE phase completion
- Before deployment
- For documentation builds

**Features:**
- Roadmap/project-state/system-spec updates
- UI validation suite execution
- Documentation compilation
- Link verification
- Release packaging and archiving

[Full definition](./skills/docs-sync-release.md)

---

### 6. approvals-audit
**Status:** ✅ Deployed | Used in: Session governance  
**Owner:** Claude  
**Description:** Log all operator approvals and command executions for governance and accountability.

**When to use:**
- Automatically during sessions (passive)
- End-of-session records

**Features:**
- Approval tracking
- Command outcome logging
- Resolution documentation
- Governance trail

[Full definition](./skills/approvals-audit.md)

---

## Platform Integration Notes

### Claude
- **Skills:** All 13 (7 new + 6 existing)
- **MCP integration:** Via skill hooks in Claude Code settings.json
- **Deployment:** Copy skill definitions to Claude's skill directory

### Copilot (Suggested Integration)
- **Recommended skills:** 9 (all except treatment-update, research-capture, approvals-audit)
- **Integration:** Via custom prompt instructions or Copilot plugins
- **Testing:** Verify schema/API compatibility across platform

### Gemini (Suggested Integration)
- **Recommended skills:** 9 (same as Copilot)
- **Integration:** Via function definitions or extension prompts
- **Testing:** Validate schema consistency, no platform-specific APIs

---

## Implementation Roadmap

### Phase 1: New Skills (Ready Now)
- [ ] **cic-section-summarizer** — Drop into shared library; Claude validates
- [ ] **agent-drift-detector** — Drop into shared library; full test coverage
- [ ] **rewrite-labs-orchestrator** — Drop into shared library; pipeline testing
- [ ] **environment-diagnostics** — Drop into shared library; Windows/WSL testing
- [ ] **session-boundary-manager** — Drop into shared library; context window tests
- [ ] **cic-roadmap-updater** — Drop into shared library; roadmap versioning tests
- [ ] **operator-grade-procedures** — Drop into shared library; runbook validation

### Phase 2: Copilot Integration
- [ ] Adapt new skills for Copilot plugin system
- [ ] Test cross-platform API compatibility
- [ ] Validate JSON schema consistency
- [ ] Document platform-specific behavior

### Phase 3: Gemini Integration
- [ ] Adapt new skills for Gemini function definitions
- [ ] Test function calling and tool use
- [ ] Validate error handling consistency
- [ ] Document platform-specific behavior

### Phase 4: Documentation & Training
- [ ] Create platform-specific quick-start guides
- [ ] Test all skills in their target environments
- [ ] Update CLAUDE.md with skill guidelines
- [ ] Generate usage examples for each skill

---

## Suggested New Skills (Based on Repo Activity)

Based on analysis of commits from the last week and HANDOFF.md notes, here are **7 additional skills** worth building:

### 1. mee-phase-executor
**Purpose:** Execute MEE phases (43, 44, 45 — APG, AAR, ACE) with state tracking and validation.

**Why:** Phases 43–45 are complex multi-stage engines. Deterministic execution skill would improve reliability and observability.

**Suggested implementation location:** `skills/mee-phase-executor/`

---

### 2. cic-benchmark-runner
**Purpose:** Automate Rewrite Labs benchmark pipeline — capture, metadata, A/B comparison.

**Why:** Benchmark pipeline was blocked by API credits this week. Orchestration skill would enable resumable, resumable runs with cost tracking.

**Suggested implementation location:** `skills/cic-benchmark-runner/`

---

### 3. environment-validator (Quick Health Check)
**Purpose:** Fast environment health check (separate from deep diagnostics) — ideal for session startup.

**Why:** Many sessions start with environment questions. Quick validator would catch 90% of issues in <1s.

**Suggested implementation location:** `skills/environment-validator/`

---

### 4. mee-finding-assessor
**Purpose:** Review and approve autonomous research findings from Phase 42 before spec promotion.

**Why:** Phase 42 generates findings autonomously. Operator needs quick assessment tool to review and approve/reject.

**Suggested implementation location:** `skills/mee-finding-assessor/`

---

### 5. helm-daily-brief
**Purpose:** Generate HELM morning briefing from Google Calendar, Gmail, Era Context, HubSpot.

**Why:** HELM is live in Phase 2. Daily brief generation skill would automate the morning ritual.

**Suggested implementation location:** `skills/helm-daily-brief/`

---

### 6. idea-inbox-harvester
**Purpose:** Harvest ideas from idea-inbox to priority list for roadmap integration.

**Why:** Idea-inbox is fully functional (12/12 tests pass). Harvester would close the loop between idea capture and roadmap.

**Suggested implementation location:** `skills/idea-inbox-harvester/`

---

### 7. phase-validator
**Purpose:** Verify a CIC phase is complete — tests pass, docs updated, integrations wired, no drift.

**Why:** Phase completion is manual and error-prone. Validator would ensure deterministic completion checkpoints.

**Suggested implementation location:** `skills/phase-validator/`

---

## Next Steps

1. **Review & Approve:** Confirm the 7 new skills meet requirements
2. **Build & Test:** Implement each skill with full test coverage
3. **Platform Adapt:** Prepare Copilot and Gemini variants
4. **Documentation:** Create platform-specific integration guides
5. **Rollout:** Deploy to shared library for all three platforms

---

## References

- [CIC Master Roadmap](./docs/cic/CIC_MASTER_ROADMAP.md)
- [AGENTS.md — Zone Ownership](./AGENTS.md)
- [HANDOFF.md — Recent Work](./HANDOFF.md)
- [Integration Wiring (Full Scaffolds)](./SKILLS_INTEGRATION.md) ← *To be created*

---

## Questions?

For skill-specific questions, see the full implementation scaffold in `skills/[skill-name]/`.
For platform integration questions, see [PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md) ← *To be created*.
