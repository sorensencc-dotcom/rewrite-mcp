# Phase 24.5 — Build Governance Integration

**Status:** COMPLETED  
**Date:** 2026-06-10  
**Phase:** 24.5 — Build Governance Integration  
**Deliverable:** Wire Phase 0.7/0.9 lineage packets into Phase 24 governance vault

---

## Executive Summary

Phase 24.5 wires the deterministic build system (Phase 0.7/0.9) into autonomous governance (Phase 24). Build artifacts now flow through the governance vault with full traceability:

1. **Lineage packets** (build provenance, SBOM, artifacts) enter as governance evidence
2. **BuildValidator** runs policy checks (SBOM completeness, git_sha integrity, determinism hash)
3. **BuildApprovalGate** invokes council voting on production promotion
4. **Governance verdict** (PERMIT/BLOCK/REVISE) enables/blocks artifact deployment

Result: **Every production build is approved by governance council under autonomous rule**.

---

## Architecture

### Data Flow

```
[Phase 0.7/0.9 Build]
        ↓
[LineagePacket]
  - artifact_id, build_id
  - git_sha, timestamp, builder
  - sbom_ref (CycloneDX/SPDX)
  - determinism_hash (sha256 of build env)
        ↓
[BuildValidator]
  ✓ git_sha format (40-char hex)
  ✓ SBOM completeness (component_count >= 5)
  ✓ Determinism hash presence (sha256:...)
  ✓ Artifact signatures (sha256 digests)
  ✓ Policy rails (HARD_SAFETY, DOMAIN, PHASE)
        ↓
[GatePacket] (evidence)
  - validation_status: passed/failed
  - failed_checks: [ check_ids ]
  - rail_violations: [ policy_id ]
        ↓
[BuildApprovalGate]
  - Council votes: safety_council, performance_council, security_council
  - Rule: unanimous block veto, majority permit, else revise
        ↓
[CouncilPacket] (verdict)
  - verdict: PERMIT | BLOCK | REVISE
  - conditions: [ remediation steps ]
        ↓
[GovernanceMemoryStore]
  - Audit trail: lineage → validation → council
  - canPromoteToProd() → eligibility check
```

### Policy Rails

**HARD_SAFETY** (non-negotiable):
- Require artifact SHA256 signatures (digest_sha256 must be present)
- Determinism hash present (git env state)
- All artifacts have digests

**DOMAIN** (project-specific):
- Registry allowlist (e.g., `registry.internal.cic/`, `ghcr.io/rewrite-labs/`)
- SBOM format: CycloneDX or SPDX only
- Minimum component count: 5+
- Builder identity recorded

**PHASE** (behavioral rules):
- Warning on <5 SBOM components
- Warning on missing determinism hash
- Warning on unsigned artifacts (advisory)

**SOFT** (guidance):
- Recommended SBOM detail levels
- Best-practice build practices

---

## Implementation

### BuildLineagePacket

Extends `GovernancePacket` with build provenance:

```typescript
interface BuildLineagePacketContent {
  build_id: string;
  agent_id: string;
  phase: 'orchestrate' | 'execution';
  artifacts: ArtifactSignature[];
  sbom: SBOMReference;
  provenance: ProvenanceData;
  dependencies?: string[];
  validation_status?: 'pending' | 'passed' | 'failed';
  validation_errors?: string[];
}

// Usage
const packet = PacketBuilder.buildLineage(
  run_id,
  'cic.ingestion',
  {
    build_id: 'build-20260610-001',
    agent_id: 'cic.ingestion',
    phase: 'execution',
    artifacts: [{
      artifact_id: 'cic.ingestion:0.7.0',
      artifact_type: 'container',
      registry_uri: 'registry.internal.cic/cic/ingestion:0.7.0',
      digest_sha256: 'abc...',
    }],
    sbom: {
      sbom_id: 'sbom-001',
      format: 'cyclonedx',
      ref_uri: 'sbom/cic-ingestion-0.7.0.xml',
      component_count: 25,
    },
    provenance: {
      git_sha: 'abc123...', // 40-char hex
      timestamp: '2026-06-10T10:30:00Z',
      builder: 'thefoundry-python',
      determinism_hash: 'sha256:abc...',
    },
  }
);
```

### BuildValidator

Validates SBOM + provenance against policy rails:

```typescript
const validator = new BuildValidator(policies);
const result = validator.validate(packet);

// result.overall_status: 'passed' | 'failed'
// result.checks: ValidationCheck[]
// result.failed_checks: ValidationCheck[]
// result.warnings: ValidationCheck[]
// result.rail_violations: string[]
```

**Checks:**
- Provenance integrity (git_sha format, timestamp, builder)
- SBOM completeness (format, component count, URI)
- Determinism (build env hash present and valid)
- Artifact signatures (all artifacts have sha256 digests)
- Policy rails (registry allowlist, format constraints)

### BuildApprovalGate

Invokes council voting on promotion:

```typescript
const gate = new BuildApprovalGate();

// 1. Evaluate gate
const decision = gate.evaluateGate(packet, validation, run_id);

// 2. Collect council votes (synthetic or real)
const votes = gate.collectCouncilVotes(decision);

// 3. Compute verdict: PERMIT (majority), BLOCK (any veto), REVISE (else)
const verdict = gate.computeVerdict(build_id, 'production', votes);

// 4. Create council packet for vault
const council_packet = gate.createCouncilPacket(verdict, run_id, agent_id, parents);
```

**Council Rules:**
- **Safety Council:** BLOCKs on hard_safety violations; PERMITs otherwise
- **Performance Council:** REVISEs on warnings; PERMITs on clean validation
- **Security Council:** REVISEs on domain violations; PERMITs on supply chain pass

**Verdict Logic:**
- If ANY council member votes BLOCK → verdict = BLOCK
- Else if >50% vote PERMIT → verdict = PERMIT
- Else → verdict = REVISE

### BuildGovernanceIntegration

Orchestrates the full flow:

```typescript
const integration = new BuildGovernanceIntegration({
  memory_store,
  active_policies: [
    { rail_id: 'registry-allowlist', type: 'DOMAIN', ... }
  ],
  promotion_target: 'production',
  require_council_vote: true,
});

// Ingest single lineage packet
const result = await integration.ingestLineagePacket(
  packet,
  runContext,
  { promoted_to: 'production' }
);

// result.lineage_packet: BuildLineagePacket
// result.validation_result: BuildValidationResult
// result.gate_packet: GatePacket
// result.council_packet?: CouncilPacket
// result.promotion_verdict?: PromotionVerdict

// Batch ingest multiple builds
const batch = await integration.ingestLineagePackets(packets, runContext);
// batch.total_packets, total_passed, total_failed

// Query evidence trail
const evidence = integration.queryBuildEvidence(build_id);
const audit_trail = integration.getPromotionAuditTrail(build_id);

// Check production eligibility
const check = integration.canPromoteToProd(build_id);
// { can_promote: true/false, reason?, blockers?: string[] }
```

---

## Integration Points

### Phase 0.7/0.9 → Phase 24

When Phase 0.7 build finishes:

1. Docker build system generates `lineage-packet.json`
2. Emit event: `build.lineage_packet_ready`
3. Phase 24 subscriber calls `integration.ingestLineagePacket()`
4. Result: governance evidence in vault, council vote recorded

### RunContext Integration

Build validation packets are added to `RunContext.packets`:

```typescript
runContext.addPacket(lineage_packet);
runContext.addPacket(gate_packet);
runContext.addPacket(council_packet);

// Later: audit trail
const packets = runContext.getPacketsByType('build_lineage');
```

### Phase Transitions

Execution phase → next phase blocked if:

```typescript
const check = integration.canPromoteToProd(build_id);
if (!check.can_promote) {
  phase_context.blockTransition(check.reason, check.blockers);
}
```

---

## Testing

Comprehensive test suite: `tests/cic/governance-build-integration.test.ts`

**Coverage:**
- ✓ Provenance git_sha validation (format, invalid)
- ✓ SBOM completeness (thresholds, warnings)
- ✓ Determinism hash (format, missing)
- ✓ Artifact signatures (digests, missing)
- ✓ Gate decision evaluation (validation_passed flag)
- ✓ Council voting (3-member council, unanimous block)
- ✓ Verdict computation (PERMIT, BLOCK, REVISE rules)
- ✓ Promotion eligibility (can_promote checks)
- ✓ Batch ingestion (multiple lineage packets)
- ✓ Audit trail (lineage→validation→council flow)

---

## Example: Production Promotion Flow

### Input: Build Lineage Packet

```json
{
  "packet_id": "pkt-001",
  "packet_type": "build_lineage",
  "run_id": "run-2026-06-10-001",
  "agent_id": "labs.redesign.gpu",
  "phase": "execution",
  "content": {
    "build_id": "build-20260610-gpu-001",
    "agent_id": "labs.redesign.gpu",
    "artifacts": [{
      "artifact_id": "labs.redesign.gpu:0.7.0",
      "artifact_type": "container",
      "registry_uri": "registry.internal.cic/labs/redesign:0.7.0",
      "digest_sha256": "abc1234567..."
    }],
    "sbom": {
      "sbom_id": "sbom-2026-06-10-gpu",
      "format": "cyclonedx",
      "ref_uri": "s3://sbom-vault/gpu-0.7.0.xml",
      "component_count": 47
    },
    "provenance": {
      "git_sha": "d3f4a2c1...",
      "timestamp": "2026-06-10T10:30:00Z",
      "builder": "thefoundry-python-cuda:1.0.0",
      "determinism_hash": "sha256:e3f4a2c1..."
    }
  }
}
```

### Validation Result

```
✓ PASS: Provenance git_sha format valid
✓ PASS: Build timestamp valid and reasonable
✓ PASS: Builder identity recorded (thefoundry-python-cuda:1.0.0)
✓ PASS: SBOM artifact present (cyclonedx format)
✓ PASS: SBOM component count: 47 (threshold: 5+)
✓ PASS: Determinism hash valid (sha256:...)
✓ PASS: Artifact digest valid (sha256:abc...)
✓ PASS: Registry on allowlist (registry.internal.cic)

overall_status: PASSED
```

### Council Votes

| Member | Vote | Rationale | Confidence |
|--------|------|-----------|-----------|
| Safety Council | PERMIT | All hard safety checks passed | 0.95 |
| Performance Council | PERMIT | No performance warnings detected | 0.90 |
| Security Council | PERMIT | Supply chain validated, registry approved | 0.92 |

**Verdict:** `PERMIT` (3/3 votes, 92% avg confidence)

### Promotion Result

```
promotion_id: "promo-build-20260610-gpu-001-1686398200000"
build_id: "build-20260610-gpu-001"
target: "production"
verdict: "PERMIT"
permit_votes: 3
block_votes: 0
revise_votes: 0
unanimous_block: false
majority_permit: true
conditions: []

canPromoteToProd(build-20260610-gpu-001) → {
  can_promote: true,
  reason: "Approved by council"
}
```

→ **Build is eligible for production deployment**

---

## Files

- `src/cic/governance/build-validator.ts` — SBOM + provenance validation
- `src/cic/governance/build-approval-gate.ts` — Council voting gate
- `src/cic/governance/build-governance-integration.ts` — Full integration orchestrator
- `src/cic/governance/packet-types.ts` — BuildLineagePacket type + builders
- `src/cic/governance/index.ts` — Phase 24.5 exports
- `tests/cic/governance-build-integration.test.ts` — Comprehensive test suite

---

## Dependencies

- **Phase 24.1** (Governance Model) — council voting rules
- **Phase 24.2** (Evidence Vault) — packet schemas, validators
- **Phase 24.3** (MemoryStore) — audit vault storage
- **Phase 24.4** (Phase API Contracts) — RunContext integration
- **Phase 0.7** (Build Graph) — lineage packet schema
- **Phase 0.9** (TheFoundry) — deterministic build infrastructure

---

## Next Phase: Phase 24.6

Wire build approval verdicts into Phase 24.4 phase API contracts:

- [ ] Execute phase: check `canPromoteToProd()` before transitions
- [ ] Audit phase: reconcile actual deployment against council approval
- [ ] Evolution phase: learn from promotion patterns (fast approvals, revisions, blocks)

---

## Status: Production-Ready

✓ Code complete  
✓ Tests comprehensive  
✓ Policy enforcement operational  
✓ Audit trail end-to-end  
✓ Council voting validated  
✓ Ready for Phase 0.7/0.9 integration

---

_Deployed: 2026-06-10 | Last updated: 2026-06-10_
