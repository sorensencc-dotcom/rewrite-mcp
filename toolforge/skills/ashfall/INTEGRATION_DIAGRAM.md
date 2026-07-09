# Ashfall Integration Architecture

```
Session End
    ↓
Ashfall (Orchestrator)
    ├─→ Gather (Modified files, deltas, risks)
    ├─→ Burn (Memory compression, drift pruning)
    ├─→ Audit (Pre-Wrap-Audit integration)
    │   └─→ Pre-Wrap-Audit (RED/YELLOW/GREEN verdict)
    ├─→ Seal (Memory manifest, atomic writes)
    └─→ Handoff (Roadmap rerank, memory emit)
        ↓
Next Session Ready
```

## Component Interactions

| Component | Role | Trigger |
|-----------|------|---------|
| Ashfall | Orchestrator | Session end hook |
| Pre-Wrap-Audit | Blind spot detection | Phase 3 (Audit) |
| Drift Engine | Signal routing | Audit phase |
| Memory System | Manifest generation | Phase 4 (Seal) |
| Roadmap Service | Task ranking | Phase 5 (Handoff) |

## Data Flow

1. **Input**: Session context, modified files, git state
2. **Processing**: Five-phase burn with audit loop
3. **Output**: JSON/Markdown with memory manifest
4. **Storage**: `.claude/sessions/[sessionId]/ashfall-report.json`
