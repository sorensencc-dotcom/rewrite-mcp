# Shared Skills Library — Quick Start
## v1.0.0 | 2026-06-05

Cross-platform skill library for Claude, Copilot, and Gemini.

---

## What Is This?

**Shared Skills Library** is a set of 13 deterministic, implementation-ready skills that work across Claude Code, GitHub Copilot, and Google Gemini.

- **7 new skills** — Ready to deploy immediately
- **6 existing skills** — Already deployed in rewrite-mcp
- **Platform support** — Claude (all 13), Copilot (9 recommended), Gemini (9 recommended)

---

## Quick Navigation

### For Operators
- **I want to use these skills** → Read [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md)
- **I want to see how to call them** → Read [SKILLS_API_REFERENCE.md](./SKILLS_API_REFERENCE.md)
- **I'm on Copilot/Gemini** → Read [SKILLS_PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md)

### For Builders
- **I want to implement a skill** → See [skills/](./skills/) directory and use the scaffolds
- **I want to understand the architecture** → Read the integration wiring below
- **I want to add a platform** → Follow the adaptation pattern in SKILLS_PLATFORM_NOTES.md

### For Decision-Makers
- **High-level overview** → See "What's Included" section below
- **Deployment timeline** → See "Timeline" section below
- **Platform readiness** → See [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md) status table

---

## What's Included

### New Skills (Ready Now)

| Skill | Purpose | Status |
|-------|---------|--------|
| **cic-section-summarizer** | Summarize CIC phase progress | ✅ Scaffold ready |
| **agent-drift-detector** | Detect agent/extractor schema drift | ✅ Scaffold ready |
| **rewrite-labs-orchestrator** | Monitor RL pipeline continuously | ✅ Scaffold ready |
| **environment-diagnostics** | Debug Windows/WSL2/MSIX/MCP issues | ✅ Scaffold ready |
| **session-boundary-manager** | Detect session overflow; recommend split | ✅ Scaffold ready |
| **cic-roadmap-updater** | Auto-update CIC roadmap from progress | ✅ Scaffold ready |
| **operator-grade-procedures** | Generate deterministic runbooks | ✅ Scaffold ready |

### Existing Skills (Already Deployed)

| Skill | Purpose | Deployed Where |
|-------|---------|-----------------|
| **web-regression** | Verify doc links after builds | rewrite-mcp release cycle |
| **research-capture** | Route research findings to documents | CIC documentary workflow |
| **treatment-update** | Apply narrative changes to treatment | CIC production |
| **doc-update** | Update changelog, roadmap, nav | rewrite-mcp maintenance |
| **docs-sync-release** | Validate + build + archive docs | CIC release pipeline |
| **approvals-audit** | Log operator approvals | Session governance |

---

## Architecture Overview

```
Shared Skills Library
├── New Skills (7)
│   ├── cic-section-summarizer/
│   ├── agent-drift-detector/
│   ├── rewrite-labs-orchestrator/
│   ├── environment-diagnostics/
│   ├── session-boundary-manager/
│   ├── cic-roadmap-updater/
│   └── operator-grade-procedures/
│
├── Existing Skills (6)
│   ├── web-regression.md
│   ├── research-capture.md
│   ├── treatment-update.md
│   ├── doc-update.md
│   ├── docs-sync-release.md
│   └── approvals-audit.md
│
├── Shared Utilities
│   ├── validate.js (validation helpers)
│   ├── logger.js (structured logging)
│   └── errors.js (unified error model)
│
└── Documentation
    ├── SKILLS_LIBRARY.md (overview)
    ├── SKILLS_API_REFERENCE.md (API specs)
    ├── SKILLS_PLATFORM_NOTES.md (platform guidance)
    └── README_SKILLS_LIBRARY.md (this file)
```

### Skill Structure

Each new skill follows this pattern:

```
skills/[skill-name]/
  ├── index.js              (core logic)
  ├── schema.json           (JSON schema for inputs/outputs)
  ├── index.test.js         (test suite)
  └── README.md             (skill-specific docs)
```

### Shared Utilities Pattern

```javascript
// Use validation helpers
import { assertString, assertObject, assertArray } from '../shared/utils/validate.js';

// Use structured logging
import { log } from '../shared/utils/logger.js';

// Use unified errors
import { SkillError } from '../shared/utils/errors.js';

export async function mySkill({ input }) {
  assertString('input', input);
  
  try {
    log('my-skill', 'Starting...', { input });
    // skill logic
  } catch (err) {
    throw new SkillError('my-skill', err.message, { input });
  }
}
```

---

## Getting Started

### Step 1: Choose Your Platform

**Claude (Recommended)**
- All 13 skills supported
- Full file I/O, MCP server access
- No platform-specific adaptation needed
- Deploy: Copy to `~/.claude/projects/c--dev/skills/`

**Copilot (Secondary)**
- 9 of 13 skills recommended
- Limited file I/O, process spawning
- Requires PowerShell equivalents for bash scripts
- Deploy: Create platform wrappers (see SKILLS_PLATFORM_NOTES.md)

**Gemini (Tertiary)**
- 9 of 13 skills recommended
- JavaScript-only (no shell access)
- Must be async-first
- Deploy: Create JavaScript wrappers (see SKILLS_PLATFORM_NOTES.md)

### Step 2: Read the Documentation

| Your Role | Start Here |
|-----------|-----------|
| **Operator** using Claude | [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md) overview + [API_REFERENCE.md](./SKILLS_API_REFERENCE.md) |
| **Operator** on Copilot/Gemini | [PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md) first |
| **Builder** adding a skill | [skills/](./skills/) scaffolds + [integration wiring guide](./SKILLS_INTEGRATION.md) |
| **DevOps** deploying to platform | [PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md) + deployment checklist |

### Step 3: Run Tests

```bash
# Run all skill tests
npm test

# Run specific skill tests
npm test -- skills/cic-section-summarizer/

# Run with coverage
npm test -- --coverage

# Run platform-specific tests
npm test -- skills/cic-section-summarizer/*.copilot.test.ts
```

### Step 4: Deploy

**Claude:**
```bash
# Copy skills to Claude project directory
cp -r skills/ ~/.claude/projects/c--dev/skills/

# Register in settings.json
cat > ~/.claude/projects/c--dev/settings.json << 'EOF'
{
  "skills": {
    "cic-section-summarizer": { "enabled": true },
    "agent-drift-detector": { "enabled": true }
    // ... etc
  }
}
EOF
```

**Copilot/Gemini:**
See [PLATFORM_NOTES.md](./SKILLS_PLATFORM_NOTES.md) for platform-specific deployment.

---

## Usage Examples

### Claude: Summarize a CIC Section
```markdown
User: Can you summarize Phase 5 progress?

Claude: I'll use the cic-section-summarizer skill.

[Executes skill with section="§5.0"]

Output:
- Status: Complete
- % Complete: 92.5%
- Files touched: 12
- Tests passing: 304/304
- Next steps: ...
```

### Copilot: Check for Agent Drift
```markdown
User: Is ReverseImageSearchExtractor up to date?

Copilot: I'll check for schema drift.

[Executes adapted agent-drift-detector]

Output:
- Drift detected: Yes
- Missing field: confidenceScore
- Recommended fix: Add to schema
```

### Gemini: Generate a Procedure
```markdown
User: How do I execute Phase 43?

Gemini: I'll generate a step-by-step procedure.

[Executes operator-grade-procedures]

Output:
1. Validate environment variables
2. Check dependency versions
3. Initialize phase generator state
4. Execute Phase 43 APG cycle
5. Verify outputs
6. Handle errors (with branch logic)
```

---

## Suggested New Skills

Based on repo activity analysis, consider building these 7 additional skills:

| Skill | Purpose | Priority |
|-------|---------|----------|
| **mee-phase-executor** | Execute MEE phases with state tracking | High |
| **cic-benchmark-runner** | Automate RL benchmark pipeline | High |
| **environment-validator** | Quick health check (separate from diagnostics) | High |
| **mee-finding-assessor** | Review autonomous research findings | Medium |
| **helm-daily-brief** | Generate HELM morning briefing | Medium |
| **idea-inbox-harvester** | Harvest ideas to roadmap | Medium |
| **phase-validator** | Verify phase completion (tests + docs + integration) | Medium |

See [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md) for detailed descriptions.

---

## Known Limitations

### Claude
- No known limitations; all 13 skills fully supported

### Copilot
- 4 skills not supported: `treatment-update`, `research-capture`, `approvals-audit`, `environment-diagnostics`
- Process spawning limited to PowerShell on Windows (no bash)
- File access restricted to workspace boundaries
- npm may not be available in all Copilot instances

### Gemini
- 4 skills not supported (same as Copilot)
- No shell/subprocess access; JavaScript-only
- All operations must be async
- External API calls depend on Gemini's auth model

---

## FAQ

**Q: Do I have to deploy to all three platforms?**  
A: No. Start with Claude; add Copilot/Gemini later if needed.

**Q: Can I modify a skill?**  
A: Yes. Fork or adapt any skill for your needs. Follow the scaffold pattern.

**Q: How do I add a new skill?**  
A: Follow the scaffold pattern in [skills/](./skills/). See integration wiring guide.

**Q: What if a skill needs external APIs?**  
A: Abstract API calls in platform-specific wrappers. Use credential store pattern.

**Q: How often are skills updated?**  
A: Skills are immutable once released (version-locked). Create new versions for changes.

**Q: Can I combine skills?**  
A: Yes. Skills are composable; you can chain them (output of one → input of next).

---

## Timeline

### Phase 1: Ready Now
- [ ] Review documentation (1 day)
- [ ] Deploy to Claude (1 day)
- [ ] Test all 13 skills (2 days)

### Phase 2: Copilot Adaptation (Optional)
- [ ] Create platform wrappers (3 weeks)
- [ ] Test cross-platform (2 weeks)
- [ ] Deploy to Copilot (1 week)

### Phase 3: Gemini Adaptation (Optional)
- [ ] Create JavaScript wrappers (3 weeks)
- [ ] Test in Gemini environment (2 weeks)
- [ ] Deploy to Gemini (1 week)

### Phase 4: New Skills (Suggested)
- [ ] Build 7 suggested skills (6 weeks)
- [ ] Test and document (2 weeks)
- [ ] Deploy to all platforms (2 weeks)

---

## Support

- **Issues:** Report in [GitHub](https://github.com/anthropics/rewrite-mcp/issues)
- **Questions:** Ask in Claude Code or Copilot chat
- **Suggestions:** Add to [SKILLS_LIBRARY.md](./SKILLS_LIBRARY.md) suggestion log

---

## License

Same as rewrite-mcp main license (see [LICENSE](./LICENSE)).

---

## Related Files

- [CLAUDE.md](./CLAUDE.md) — Operator instructions for AI tools
- [AGENTS.md](./AGENTS.md) — Zone ownership and coordination rules
- [HANDOFF.md](./HANDOFF.md) — Session state and progress tracking
- [CIC_MASTER_ROADMAP.md](./docs/cic/CIC_MASTER_ROADMAP.md) — Phase planning

---

Last updated: **2026-06-05 | v1.0.0**
