# Phase 24.1 — CIC Governance Model Specification

**Status:** COMPLETED  
**Date:** 2026-06-08  
**Phase:** 24.1 — Governance Model  
**Deliverable:** AG-Model (Governance Model Specification)

---

## Executive Summary

Phase 24.1 formalizes and implements the three load-bearing governance decisions that enable CIC to operate as a fully autonomous yet governed agent:

1. **Council Voting Model** — Unanimous block veto, majority permit, else require revision
2. **Policy Rail Precedence** — Hard safety > domain > phase > soft; most restrictive rule wins
3. **Decay / Pruning Logic** — Hybrid autonomous heuristic + operator override

These decisions are now formally specified, documented, implemented in code, and validated by comprehensive tests.

---

## Decision 1: Council Voting Model

### Specification

**Rule: Unanimous Block Veto + Majority Permit**

- If **any** council member votes `BLOCK` → verdict = `BLOCK`
- Else if **majority** (>50%) vote `PERMIT` → verdict = `PERMIT`
- Else → verdict = `REVISE`

### Rationale

**Safety:** Any council member can veto unsafe behavior, preventing consensus on dangerous decisions.

**Velocity:** Majority permit prevents deadlock where 50/50 splits would otherwise stall execution.

**Legibility:** Every dissenting vote (BLOCK or REVISE) becomes a structured rationale packet, making the reasoning transparent.

### Artifacts

- **Type:** `CouncilVerdict` with fields: `council_id`, `run_id`, `votes[]`, `verdict`, `conditions[]`, `timestamp`
- **Vote fields:** `member_id`, `vote` (PERMIT|BLOCK|REVISE), `rationale`, optional `confidence` (0-1)
- **Implementation:** `CouncilVoting.computeVerdict(council_id, run_id, votes) → CouncilVerdict`
- **Validation:** `CouncilVoting.validateVerdict(verdict) → { valid: boolean, reason?: string }`

### Example

**Scenario:** Rewrite Labs benchmark optimization (latency <500ms)

| Member | Vote | Rationale |
|--------|------|-----------|
| Safety Council | BLOCK | High-load latency 700ms violates spec |
| Performance Council | BLOCK | Edge case failures unacceptable |
| Research Council | PERMIT | Median latency acceptable |

**Verdict:** `BLOCK` (unanimous block veto triggered)

---

## Decision 2: Policy Rail Precedence

### Specification

**Precedence Order (strictest to weakest):**

1. **HARD_SAFETY** — Non-negotiable, organization-wide constraints
2. **DOMAIN** — Project/tenant-specific constraints
3. **PHASE** — Phase-specific behavioral rules (Discovery, Harvester, Orchestrate, Execution, Synthesize, Audit, Evolution)
4. **SOFT** — Guidance and heuristics (advisory, not enforcing)

**Conflict Resolution:** When two rails conflict, the rail that imposes the stricter constraint wins.

### Rationale

**Prevents privilege escalation:** A phase rail cannot override a domain constraint; a domain constraint cannot override hard safety.

**Predictability:** CIC's behavior is deterministic and auditable under autonomous operation.

**Clarity:** Every policy conflict produces a `policy_packet` documenting which rail won and why.

### Examples

#### Example 1: Domain Override by Hard Safety

```
Conflicting rails:
  - domain_rail: "Writes allowed in Orchestrate phase"
  - hard_safety: "No external writes without approval"

Resolution:
  → Hard safety wins
  → External writes require approval even in Orchestrate
```

#### Example 2: Phase Rule by Domain Constraint

```
Conflicting rails:
  - phase_rail: "Synthesize phase may compute new relationships"
  - domain_rail: "No new relationships without validation run"

Resolution:
  → Domain wins
  → Compute new relationships only after validation
```

### Artifacts

- **Type:** `PolicyRail` with fields: `rail_id`, `category` (HARD_SAFETY|DOMAIN|PHASE|SOFT), `name`, `description`, `constraint` (function), `severity` (info|warn|error|critical)
- **Conflict:** `RailConflict` with fields: `conflicting_rails[]`, `context`, `resolved_to`, `rationale`
- **Implementation:** `PolicyRails.applyPrecedence(context) → { allowed: boolean, reason: string, violated_rails[] }`

### API

```typescript
const rails = new PolicyRails();
rails.registerRail(hardSafetyRail);
rails.registerRail(domainRail);

const context = {
  global_rails: ['hs-no-external-writes'],
  domain_rails: ['domain-allow-writes-in-orchestrate'],
  phase_rails: [],
  metadata: { is_external_write: true, approved: false }
};

const result = rails.applyPrecedence(context);
// { allowed: false, violated_rails: [hardSafetyRail], reason: '...' }
```

---

## Decision 3: Decay / Pruning Logic

### Specification

**Autonomous Heuristic Decay Triggers:**

| Trigger | Condition | Frequency |
|---------|-----------|-----------|
| **Age** | Packet older than 30 days | Continuous (configurable) |
| **Low Usage** | Not referenced in last 10 runs | Per-run scan |
| **Contradiction** | Contradicted by council verdict | On verdict |
| **Drift** | Associated with drift detection window | On drift alert |
| **Quality** | Confidence score < 0.6 | Per-run evaluation |

**Decay Candidates:** Packets triggering 2+ conditions → review; 3+ → auto-decay recommendation

### Operator Overrides

**Pin:** Prevent decay of historically significant packets (permanent or time-bound)

**Force Decay:** Immediately decay problematic packets (quarantine)

**Restore:** Recover decayed packets for new analysis

**Adjust Thresholds:** Tune decay age, usage, quality per domain

### Rationale

**Pure heuristic decay** risks losing institutional knowledge (premature pruning).

**Pure operator decay** is too slow for autonomous evolution (bottleneck on human review).

**Hybrid approach:**
- Autonomous system autonomously prunes low-value packets (age, low usage, low quality)
- Operator retains veto power (pinning) and reset capability (restore)
- Thresholds adjust per domain, not globally

### Artifacts

- **Type:** `DecayCandidate` with fields: `packet_id`, `triggers[]`, `age_days`, `usage_count`, `confidence`, `suggested_action` (decay|pin|review)
- **Override:** `GovernanceOverride` with fields: `override_id`, `override_type` (SYSTEM|PACKET|POLICY|DECAY), `reason`, `target_id`, `operator_id`, `timestamp`, optional `expires`
- **Config:** `DecayConfig` with fields: `age_threshold_days` (30), `usage_threshold_runs` (10), `quality_threshold` (0.6), `auto_decay_enabled`, `operator_override_enabled`
- **Implementation:** `DecayLogic.scanForDecayCandidates(packets) → DecayCandidate[]`

### Example: Decay Flow

**Packet:** `research_packet_001` created 35 days ago, used 2 times, confidence 0.55

**Scan triggers:**
- ✓ Age (35 > 30 days)
- ✓ Low usage (2 < 10 runs)
- ✓ Low quality (0.55 < 0.6)

**Result:** 3 triggers → **auto-decay recommendation**

**Operator Review:** "This packet contains rare data about Willow Run production; pin it."

**Action:** `decay.pinPacket('research_packet_001', 'Willow Run historical significance', operator_id)`

**Result:** Packet protected from future decay for this domain.

---

## Testing & Validation

All three decisions are validated by comprehensive test suites in `tests/cic/governance.test.ts`:

- **Council Voting Tests:** 6 tests covering unanimous block, majority permit, revise logic, validation
- **Policy Rails Tests:** 4 tests covering precedence, conflict resolution, enforcement
- **Decay Logic Tests:** 7 tests covering age, usage, quality triggers, overrides, threshold adjustment
- **Integration Tests:** 2 tests verifying all three decisions work together

**Total: 19 tests, 100% pass rate**

---

## Success Criteria

✅ All 3 load-bearing governance decisions formally documented with rationale  
✅ Council voting implementation: unanimous block veto, majority permit, revise escalation  
✅ Policy rail precedence implementation: HARD_SAFETY > DOMAIN > PHASE > SOFT  
✅ Decay logic implementation: hybrid heuristic + operator override  
✅ All components have public APIs for phase integration  
✅ Comprehensive test coverage (19 tests, all passing)  
✅ Specification document explains each decision and rationale  

---

## Implementation Details

**Files Created:**
- `src/cic/governance/types.ts` — Core type definitions (60 lines)
- `src/cic/governance/council-voting.ts` — Council voting logic (100 lines)
- `src/cic/governance/policy-rails.ts` — Policy rail engine (180 lines)
- `src/cic/governance/decay-logic.ts` — Decay/pruning logic (150 lines)
- `src/cic/governance/index.ts` — Module exports (20 lines)
- `tests/cic/governance.test.ts` — Comprehensive tests (400+ lines)

**Total:** 900+ lines of production code and tests

---

## Unblocks

This completes Phase 24.1 and enables:

- **Phase 24.2** (Evidence Vault Schema) — Can now reference council, rail, decay packet types
- **Phase 24.3** (MemoryStore Tier 2) — Can build indexes for policy_context, votes, decay_queue
- **Phase 24.4** (Phase API Contracts) — Phase APIs can now invoke gates and councils with rails
- **Phase 24.5** (Full RPI Trace) — Can now illustrate all governance decisions in end-to-end trace
- **Phases 25+** — Can now operate within governed autonomy framework

---

## Next Steps

**Phase 24.2 — Evidence Vault Schema** (Starting 2026-06-08):
- Define packet envelope (all RPI/gate/council/evolution/drift/rollback types)
- Create JSON schema for validation
- Generate TypeScript types from schema
- Timeline: 2 days

---

## Outcome

CIC now has **formal, documented, tested governance decisions** that make its autonomy legible and auditable. Every council vote, rail enforcement, and decay action produces traceable evidence. This is the foundation for the evidence vault and all downstream governance integration.

**North Star Achieved:**
> "CIC becomes trustworthy by making its reasoning legible and its evolution auditable."
