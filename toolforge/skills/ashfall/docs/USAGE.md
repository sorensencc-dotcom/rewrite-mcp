# ASHFALL — Usage & Workflows

## Quick Reference

```bash
# Full session audit
ashfall --scope=full

# Single phase audit
ashfall --scope=PHASE-26

# Fast memory-only wrap
ashfall --scope=partial

# JSON output
ashfall --output-format=json

# Run with verification
ashfall --verify
```

## Invocation Ritual

At session end, signal:
```
"Let the ash fall."
```

ASHFALL executes 5-step deterministic burn:
1. **Gather** — git state, modified files, uncommitted changes
2. **Burn** — compress context, prune drift, preserve signal
3. **Audit** — Four Questions (blind spots, assumptions, verification)
4. **Seal** — memory manifest with atomic write guarantee
5. **Handoff** — ranked roadmap + token-bounded memory

## Full Workflow Example

### Step 1: Session Complete, Run ASHFALL

```bash
$ ashfall --scope=full --verify --output-format=json
[ASHFALL] Phase 1: GATHER...
[ASHFALL] Phase 2: BURN...
[ASHFALL] Phase 3: AUDIT (Four Questions)...
[ASHFALL] Phase 4: SEAL...
[ASHFALL] Phase 5: HANDOFF (Roadmap ranking)...
[ASHFALL] Complete. Burning the noise. Keeping the signal.
```

### Step 2: Review Output

Output structure:
```json
{
  "summary": {
    "modifiedFiles": ["file1.ts", "file2.ts"],
    "architecturalChanges": "...",
    "pendingCommits": [...],
    "contextBoundaries": ["main", "staging"]
  },
  "blindSpotAudit": {
    "findings": [
      {
        "question": "What am I missing?",
        "topic": "Docker image status",
        "risk": "Image build status unknown",
        "evidenceGap": "No build logs, no registry check",
        "nextCheck": "Run docker build, verify hash",
        "severity": "HIGH"
      }
    ],
    "leastConfident": {...}
  },
  "prioritizedRoadmap": [
    {
      "priority": 1,
      "task": "Verify Docker image build",
      "context": "PHASE-26 blocking",
      "source": "blindSpotAudit:Q1",
      "blocker": true
    }
  ],
  "nextSessionMemory": "markdown manifest...",
  "timestamp": "2026-07-05T...",
  "scope": "full"
}
```

### Step 3: Action on Roadmap

Priority 1 (blockers) → must resolve before deployment  
Priority 2–3 (high/medium) → next session work  
Priority 4–5 (low) → deferred unless critical  

### Step 4: Commit Memory

Memory manifest written to `C:\Users\soren\.claude\projects\c--dev\memory\`:

```markdown
---
name: session-ashfall-wrap-YYYY-MM-DD
description: ASHFALL audit + roadmap for next session
metadata:
  type: project
  timestamp: 2026-07-05T...
---

## Session Summary
...findings, blockers, verified assumptions...
```

## Scope Levels

### `--scope=full`
**When:** End of major milestone or complex session  
**Output:** Complete 5-phase burn, all findings, full roadmap ranking  
**Duration:** ~30s  
**Tokens:** ~3–5K in memory manifest  

Use when:
- Wrapping PHASE-complete work
- Multiple architectural changes
- Significant risk surface
- Cross-team handoff

### `--scope=PHASE-26` (or any phase name)
**When:** Single phase or area audit  
**Output:** Phase-scoped gather, audit focused on phase blockers, sliced roadmap  
**Duration:** ~15s  
**Tokens:** ~1–2K in memory manifest  

Use when:
- Phase nearly complete, final verification
- Isolated debugging session
- Fast wrap with minimal context overhead

### `--scope=partial`
**When:** Quick wrap, light context refresh  
**Output:** Memory compression + critical findings only  
**Duration:** ~5s  
**Tokens:** ~200–500 in memory manifest  

Use when:
- Mid-session checkpoint
- Memory cleanup needed urgently
- Audit later, compress now

## Four Questions Framework

ASHFALL's audit phase uses structured interrogation:

1. **"What part of your answer are you least confident about?"**
   - Surfaces confidence gaps
   - Identifies verification blockers
   - Flags assumptions under-tested

2. **"What am I missing about this situation?"**
   - Blind spot detection
   - Gap analysis across layers (code, infra, docs)
   - Integration breaks

3. **"What assumption would most change your recommendation?"**
   - Critical dependency exposure
   - Breaks if assumption false
   - Requires human verification

4. **"What should I verify with a human, source, log, or test?"**
   - Concrete verification steps
   - Blockers on deployment readiness
   - Evidence standards

Each finding includes:
- **topic** — specific area
- **risk** — what breaks if missed
- **evidenceGap** — what's unknown
- **nextCheck** — concrete verification step
- **severity** — HIGH | MEDIUM | LOW

## Example: PHASE-26 Audit

```bash
ashfall --scope=PHASE-26 --output-format=json
```

Output roadmap:
```
[BLOCKER, Priority 1] Verify Docker image build and push
  Context: PHASE-26 blocking — image status unknown
  Source: blindSpotAudit:Q1
  Next: Run docker build, verify hash, check registry

[BLOCKER, Priority 1] Run full E2E test suite
  Context: PHASE-26 blocking — E2E untested
  Source: blindSpotAudit:Q2
  Next: npm test:e2e, verify integration flows

[HIGH, Priority 2] Audit rewrite-mpc package.json
  Context: npm scripts gutted (93→16 lines)
  Source: blindSpotAudit:Q4
  Next: Check CI history, compare with sibling packages
```

## Output Formats

### JSON (machine-readable)
```bash
ashfall --output-format=json
```

For automation, scripting, CI gates:
```json
{
  "summary": {...},
  "blindSpotAudit": {...},
  "prioritizedRoadmap": [...],
  "nextSessionMemory": "...",
  "timestamp": "...",
  "scope": "full"
}
```

### Markdown (human-readable, default)
```bash
ashfall --output-format=markdown
```

Formatted for copy-paste to CLAUDE.md, memory, or status reports.

## Verification Mode

```bash
ashfall --verify
```

Runs post-audit validation:
- ✓ All blockers have concrete next checks
- ✓ Roadmap items ranked 1–5 with no gaps
- ✓ Memory manifest syntactically valid
- ✓ Output integrity check (not truncated)

Fails early if:
- Missing criticality (blocker without evidence)
- Inconsistent priority ordering
- Stale assumptions (> 1 day old)

## Integration with Claude Code

ASHFALL designed to run autonomously within Claude Code sessions.

**Trigger patterns:**
```
"Let the ash fall."             → Full 5-phase burn
"ashfall PHASE-26 --verify"     → Scoped + verified
/ashfall                        → Direct invocation
```

**Output feeds:**
- Memory system (`~/.claude/projects/*/memory/`)
- CI/CD gate validation
- Roadmap reranking for next session
- Cross-session audit trail

## Philosophy

**Operator-grade. Deterministic. Industrial.**

Every finding must be:
- **Specific** — exact risk + location
- **Verifiable** — concrete test or check
- **Actionable** — clear next step
- **Prioritized** — 1–5 blocker status

Burn the noise.  
Keep the signal.  
Seal the truth.  
Prepare the next phase.

---

Questions? See [README.md](../README.md) or invoke with `--help`.
