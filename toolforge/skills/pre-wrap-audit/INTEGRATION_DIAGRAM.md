# Pre-Wrap-Audit Integration Architecture

```
Claude Code Hook (before-session-end)
    ↓
Pre-Wrap-Audit
    ├─→ Core Audit (4 questions)
    ├─→ Extended Audit (8 questions)
    ├─→ Drift Check
    ├─→ Memory Coherence
    └─→ Verdict (RED | YELLOW | GREEN)
        ↓
    [EXIT CODE] → Claude Code Hook Handler
        ├─→ RED (1): Block session termination, escalate
        ├─→ YELLOW (2): Warn operator, allow review
        └─→ GREEN (0): Proceed to Ashfall
            ↓
        Ashfall (Session wrap)
```

## Component Interactions

| Component | Interaction | Timing |
|-----------|-------------|--------|
| Claude Code | Invokes via hook | Before session end |
| Ashfall | Called after GREEN verdict | Post-audit |
| Drift Engine | Signal routing check | Extended audit |
| Memory System | Coherence validation | Extended audit |
| Roadmap Service | Tasks for next session | GREEN verdict output |

## Data Flow

1. **Capture**: Session state, commits, tests, memory
2. **Audit**: 12-point assessment
3. **Verdict**: RED/YELLOW/GREEN with rationale
4. **Action**: Block, warn, or proceed

---

See SKILL.md for schema details.
