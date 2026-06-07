# Shared Skills Library — Index
## v1.0.0 | 2026-06-05

Quick navigation for all skills documentation and implementation scaffolds.

---

## 📋 Documentation (Start Here)

### Executive Summary
- **[SKILLS_SUMMARY.md](./SKILLS_SUMMARY.md)** — What was delivered, timeline, next steps

### For Different Audiences

| Your Role | Start Here | Then Read |
|-----------|-----------|-----------|
| **Operator** (using Claude) | [README_SKILLS_LIBRARY.md](./README_SKILLS_LIBRARY.md) | [SKILLS_API_REFERENCE.md](./SKILLS_API_REFERENCE.md) |
| **Operator** (on Copilot/Gemini) | [SKILLS_PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md) | [README_SKILLS_LIBRARY.md](./README_SKILLS_LIBRARY.md) |
| **Builder** (implementing a skill) | [skills/cic-section-summarizer/](./skills/cic-section-summarizer/) | [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md) |
| **DevOps** (deploying to platform) | [SKILLS_PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md) | [SKILLS_SUMMARY.md](./SKILLS_SUMMARY.md) |
| **Architect** (reviewing design) | [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md) | [SUGGESTED_SKILLS.md](./SUGGESTED_SKILLS.md) |
| **Decision-maker** | [SKILLS_SUMMARY.md](./SKILLS_SUMMARY.md) | [SUGGESTED_SKILLS.md](./SUGGESTED_SKILLS.md) |

### Complete Documentation Set

1. **[SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md)** (Comprehensive)
   - All 13 skills overview
   - Quick reference table (status + platform readiness)
   - Detailed purpose/usage for each skill
   - 7 suggested new skills (from repo analysis)

2. **[SKILLS_API_REFERENCE.md](./SKILLS_API_REFERENCE.md)** (Technical)
   - Full API specs for all 13 skills
   - Input/output examples with JSON
   - Error handling patterns
   - Testing guidelines

3. **[SKILLS_PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md)** (Integration)
   - Platform-specific guidance (Claude, Copilot, Gemini)
   - Adaptation patterns
   - Auth/credential handling per platform
   - Dependency management
   - Deployment checklist

4. **[README_SKILLS_LIBRARY.md](./README_SKILLS_LIBRARY.md)** (Quick Start)
   - Architecture overview
   - Getting started in 4 steps
   - Usage examples per platform
   - FAQ and timeline
   - Quick navigation for different roles

5. **[SUGGESTED_SKILLS.md](./SUGGESTED_SKILLS.md)** (Phase 2 Planning)
   - 7 new skills (detailed specs)
   - Why each skill should be built (evidence from repo activity)
   - Proposed interfaces (input/output)
   - Implementation notes
   - Prioritized roadmap

---

## 🛠️ Implementation Scaffolds

Each new skill has a complete scaffold in `skills/[skill-name]/`:

### New Skills (Ready to Implement)

| Skill | Purpose | Scaffold | API Spec |
|-------|---------|----------|----------|
| **cic-section-summarizer** | Summarize CIC phase progress | [skills/cic-section-summarizer/](./skills/cic-section-summarizer/) | [SKILLS_API_REFERENCE.md#cic-section-summarizer](./SKILLS_API_REFERENCE.md#cic-section-summarizer) |
| **agent-drift-detector** | Detect agent/extractor drift | [skills/agent-drift-detector/](./skills/agent-drift-detector/) | [SKILLS_API_REFERENCE.md#agent-drift-detector](./SKILLS_API_REFERENCE.md#agent-drift-detector) |
| **rewrite-labs-orchestrator** | Monitor RL pipeline | [skills/rewrite-labs-orchestrator/](./skills/rewrite-labs-orchestrator/) | [SKILLS_API_REFERENCE.md#rewrite-labs-orchestrator](./SKILLS_API_REFERENCE.md#rewrite-labs-orchestrator) |
| **environment-diagnostics** | Debug environment issues | [skills/environment-diagnostics/](./skills/environment-diagnostics/) | [SKILLS_API_REFERENCE.md#environment-diagnostics](./SKILLS_API_REFERENCE.md#environment-diagnostics) |
| **session-boundary-manager** | Detect session overflow | [skills/session-boundary-manager/](./skills/session-boundary-manager/) | [SKILLS_API_REFERENCE.md#session-boundary-manager](./SKILLS_API_REFERENCE.md#session-boundary-manager) |
| **cic-roadmap-updater** | Auto-update roadmap | [skills/cic-roadmap-updater/](./skills/cic-roadmap-updater/) | [SKILLS_API_REFERENCE.md#cic-roadmap-updater](./SKILLS_API_REFERENCE.md#cic-roadmap-updater) |
| **operator-grade-procedures** | Generate runbooks | [skills/operator-grade-procedures/](./skills/operator-grade-procedures/) | [SKILLS_API_REFERENCE.md#operator-grade-procedures](./SKILLS_API_REFERENCE.md#operator-grade-procedures) |

### Existing Skills (Already Deployed)

| Skill | Status | Definition | Location |
|-------|--------|------------|----------|
| **web-regression** | ✅ Deployed | [skills/web-regression.md](./skills/web-regression.md) | rewrite-mcp release cycle |
| **research-capture** | ✅ Deployed | [skills/research-capture.md](./skills/research-capture.md) | CIC documentary workflow |
| **treatment-update** | ✅ Deployed | [skills/treatment-update.md](./skills/treatment-update.md) | CIC production |
| **doc-update** | ✅ Deployed | [skills/doc-update.md](./skills/doc-update.md) | rewrite-mcp maintenance |
| **docs-sync-release** | ✅ Deployed | [skills/docs-sync-release.md](./skills/docs-sync-release.md) | CIC release pipeline |
| **approvals-audit** | ✅ Deployed | [skills/approvals-audit.md](./skills/approvals-audit.md) | Session governance |

### Scaffold Contents

Each new skill includes:
```
skills/[skill-name]/
  ├── index.js              (Core logic with type signatures)
  ├── schema.json           (JSON schema for inputs/outputs)
  ├── index.test.js         (Test skeleton)
  └── README.md             (Skill-specific docs)
```

---

## 📊 Quick Facts

| Metric | Value |
|--------|-------|
| Total Skills | 13 (7 new + 6 existing) |
| Documentation Pages | 6 (5 guides + this index) |
| New Skill Scaffolds | 7/7 complete (100%) |
| Platform Support | Claude (13/13), Copilot (9/13), Gemini (9/13) |
| Suggested Phase 2 Skills | 7 (detailed in SUGGESTED_SKILLS.md) |

---

## 🚀 Getting Started

### Option A: I Want to Use These Skills (Operator)
1. Read [README_SKILLS_LIBRARY.md](./README_SKILLS_LIBRARY.md) (5 min)
2. Bookmark [SKILLS_API_REFERENCE.md](./SKILLS_API_REFERENCE.md) for API specs
3. Try a skill in Claude Code: `@cic-section-summarizer`
4. For platform-specific questions, see [SKILLS_PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md)

### Option B: I Want to Implement These Skills (Builder)
1. Read [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md) overview (10 min)
2. Pick a skill: [skills/](./skills/) directory
3. Start with scaffold in `skills/[skill-name]/index.js`
4. Reference [SKILLS_API_REFERENCE.md](./SKILLS_API_REFERENCE.md) for expected I/O
5. Run tests: `npm test -- skills/[skill-name]/`

### Option C: I Want to Deploy to Another Platform (DevOps)
1. Read [SKILLS_PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md) (15 min)
2. Choose your platform (Copilot or Gemini)
3. Follow adaptation pattern for each skill
4. Use deployment checklist at end of SKILLS_PLATFORM_NOTES.md

### Option D: I Want to Plan Phase 2 (Architect)
1. Read [SKILLS_SUMMARY.md](./SKILLS_SUMMARY.md) (10 min)
2. Review [SUGGESTED_SKILLS.md](./SUGGESTED_SKILLS.md) (30 min)
3. Check implementation estimates and priorities
4. Decide which skills to build first

---

## 📌 Key Files

### Documentation
- `SKILLS_SUMMARY.md` — Executive summary (start here if unsure)
- `SKILLS_LIBRARY.md` — Complete inventory
- `SKILLS_API_REFERENCE.md` — API specifications
- `SKILLS_PLATFORM_NOTES.md` — Platform guidance
- `README_SKILLS_LIBRARY.md` — Quick start
- `SUGGESTED_SKILLS.md` — Phase 2 planning
- `SKILLS_INDEX.md` — This file (navigation)

### Existing Skills (Definitions)
- `skills/web-regression.md`
- `skills/research-capture.md`
- `skills/treatment-update.md`
- `skills/doc-update.md`
- `skills/docs-sync-release.md`
- `skills/approvals-audit.md`

### New Skills (Scaffolds)
- `skills/cic-section-summarizer/` (+ 6 more)

---

## 🔍 Find Information By Topic

### Architecture & Design
- Architecture overview: [README_SKILLS_LIBRARY.md#architecture-overview](./README_SKILLS_LIBRARY.md#architecture-overview)
- Cross-platform patterns: [SKILLS_PLATFORM_NOTES.md#cross-platform-implementation-pattern](./SKILLS_PLATFORM_NOTES.md#cross-platform-implementation-pattern)
- Shared utilities: [README_SKILLS_LIBRARY.md#shared-utilities-pattern](./README_SKILLS_LIBRARY.md#shared-utilities-pattern)

### Implementation
- Skill scaffolds: [skills/](./skills/) directory
- Testing guide: [SKILLS_API_REFERENCE.md#testing](./SKILLS_API_REFERENCE.md#testing)
- Error handling: [SKILLS_API_REFERENCE.md#error-handling](./SKILLS_API_REFERENCE.md#error-handling)

### Platform Integration
- Claude: [SKILLS_PLATFORM_NOTES.md#claude-primary-platform](./SKILLS_PLATFORM_NOTES.md#claude-primary-platform)
- Copilot: [SKILLS_PLATFORM_NOTES.md#copilot-secondary-platform](./SKILLS_PLATFORM_NOTES.md#copilot-secondary-platform)
- Gemini: [SKILLS_PLATFORM_NOTES.md#gemini-tertiary-platform](./SKILLS_PLATFORM_NOTES.md#gemini-tertiary-platform)

### Roadmap & Planning
- Timeline: [SKILLS_SUMMARY.md#deployment-timeline](./SKILLS_SUMMARY.md#deployment-timeline)
- Phase 2 skills: [SUGGESTED_SKILLS.md](./SUGGESTED_SKILLS.md)
- Success criteria: [SKILLS_SUMMARY.md#success-criteria](./SKILLS_SUMMARY.md#success-criteria)

---

## ❓ FAQ Quick Links

**Q: Where do I start?**  
A: 
- **Operator:** [README_SKILLS_LIBRARY.md](./README_SKILLS_LIBRARY.md)
- **Builder:** [skills/](./skills/) + [SKILLS_API_REFERENCE.md](./SKILLS_API_REFERENCE.md)
- **Decision-maker:** [SKILLS_SUMMARY.md](./SKILLS_SUMMARY.md)

**Q: How do I use a skill?**  
A: See [SKILLS_API_REFERENCE.md](./SKILLS_API_REFERENCE.md) for examples

**Q: How do I implement a skill?**  
A: See skill scaffold in `skills/[name]/` + [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md) overview

**Q: What about Copilot/Gemini?**  
A: See [SKILLS_PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md)

**Q: What skills should we build next?**  
A: See [SUGGESTED_SKILLS.md](./SUGGESTED_SKILLS.md) with priorities

---

## 📖 Reading Time Estimates

| Document | Time | Best For |
|----------|------|----------|
| SKILLS_SUMMARY.md | 10 min | Everyone (quick overview) |
| README_SKILLS_LIBRARY.md | 15 min | Operators + new users |
| SKILLS_LIBRARY.md | 20 min | Decision-makers + architects |
| SKILLS_API_REFERENCE.md | 30 min | Builders + platform engineers |
| SKILLS_PLATFORM_NOTES.md | 20 min | DevOps + platform engineers |
| SUGGESTED_SKILLS.md | 30 min | Architects + product managers |

**Recommended path:** 45 minutes for operators, 2 hours for decision-makers, 3+ hours for builders

---

## 🔗 Related Documents (Existing)

- [CLAUDE.md](./CLAUDE.md) — Operator instructions
- [AGENTS.md](./AGENTS.md) — Zone ownership & coordination
- [HANDOFF.md](./HANDOFF.md) — Session state & progress
- [CIC_MASTER_ROADMAP.md](./docs/cic/CIC_MASTER_ROADMAP.md) — Phase planning

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| **1.0.0** | 2026-06-05 | Initial release: 13 skills, 6 documentation guides, 7 new skill scaffolds, 7 suggested Phase 2 skills |

---

## ✅ Checklist Before Deploying

- [ ] Read [SKILLS_SUMMARY.md](./SKILLS_SUMMARY.md)
- [ ] Review [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md) inventory
- [ ] Understand your role's documentation ([README_SKILLS_LIBRARY.md](./README_SKILLS_LIBRARY.md) or [SKILLS_API_REFERENCE.md](./SKILLS_API_REFERENCE.md))
- [ ] For multi-platform, read [SKILLS_PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md)
- [ ] For Phase 2 planning, review [SUGGESTED_SKILLS.md](./SUGGESTED_SKILLS.md)
- [ ] Run tests: `npm test` (or skill-specific: `npm test -- skills/[name]/`)
- [ ] Approve timeline: [SKILLS_SUMMARY.md#deployment-timeline](./SKILLS_SUMMARY.md#deployment-timeline)

---

**Last Updated:** 2026-06-05 | **Version:** 1.0.0 | **Status:** Ready for Review

🎯 **Next Step:** Choose your role above and start reading!
