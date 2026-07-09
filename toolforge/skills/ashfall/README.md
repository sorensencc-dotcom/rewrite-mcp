# ASHFALL — Session Termination & Context Handoff Engine

**Industrial-grade session wrap. Deterministic. Operator-focused. No fluff.**

## Quick Start

```bash
ashfall --scope=full
ashfall --scope=PHASE-26
ashfall --verify --output-format=json
```

Invoke at session end:
```
> "Let the ash fall."
```

## What It Does

5-step deterministic burn for session termination:

1. **Gather** — Collect modified files, architectural deltas, uncommitted changes, assumptions, risks
2. **Burn** — Incinerate irrelevant context, compress memory, prune drift, preserve structural truth
3. **Audit** — Apply Four Questions to surface blind spots and verify assumptions
4. **Seal** — Generate deterministic memory manifest, verify atomic write integrity
5. **Handoff** — Rank roadmap, emit pruned token-bounded memory for next session

## Output

Structured JSON + Markdown:
- `summary` — modified files, architectural changes, pending commits, context boundaries
- `blindSpotAudit` — confidence gaps, user blind spots, critical assumptions, verification steps
- `prioritizedRoadmap` — ranked 1–5 with blocker flags
- `nextSessionMemory` — compressed memory manifest

## Scope Options

| Scope | Use Case |
|-------|----------|
| `full` | Complete session audit + roadmap rerank |
| `PHASE-XX` | Single phase audit + dependencies |
| `partial` | Memory compression + minimal audit (fast) |

## Tone

Operator-grade. Deterministic. Industrial.  
Every output: specific, verifiable, ready for execution.

## Philosophy

Burn the noise. Keep the signal. Seal the truth. Prepare the next phase.

---

See [USAGE.md](docs/USAGE.md) for detailed workflows and examples.
