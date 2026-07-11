---
skill_name: ashfall
version: 1.0.0
name: ashfall
category: automation
description: Deterministic session-termination and context-handoff engine for Cast Iron systems
author: Soren (Cast Iron Forge)
tags: ["session-management","context-handoff","audit","memory-compression","roadmap"]
---
# Ashfall — Session Termination & Context Handoff Engine

**Status: ACTIVE**  
**Version: 1.0.0**  
**Category: automation**  
**Owner: Soren**

---

## Purpose

Deterministic session-termination and context-handoff engine for Cast Iron systems.

## Five-Step Burn Process

1. **Gather** — Collect modified files, architectural deltas, uncommitted changes
2. **Burn** — Incinerate irrelevant context, compress memory, prune drift
3. **Audit** — Apply Four Questions to surface blind spots (pre-wrap-audit integration)
4. **Seal** — Generate deterministic memory manifest, verify atomic write integrity
5. **Handoff** — Rank roadmap, emit pruned token-bounded memory for next session

## Inputs

```
scope: 'full' | 'PHASE-XX' | 'partial'
verify: boolean
outputFormat: 'json' | 'markdown'
```

## Outputs

Structured summary, blind spot audit, prioritized roadmap, and next session memory.

## Exit Codes

- 0: Success
- 1: Warning
- 2: Error

## Philosophy

**Burn the noise. Keep the signal. Seal the truth. Prepare the next phase.**


