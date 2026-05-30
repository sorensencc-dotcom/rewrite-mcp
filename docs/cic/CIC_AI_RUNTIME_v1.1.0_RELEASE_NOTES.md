# CIC‑AI Runtime v1.1.0 — PMS, RTK Automation, Hybrid Harness

## Summary

CIC‑AI Runtime v1.1.0 promotes the runtime from a contract‑enforced core (v1.0.0) to a
**prompt‑aware, automation‑driven, hybrid‑tested intelligence engine**.

Key pillars:
- PMS (Prompt Management System) as a first‑class subsystem
- RTK Active Automation Layer (burst planning, smoke gating, safeguards)
- Hybrid Test Harness (Mode B) for end‑to‑end runtime verification

---

## Highlights

### 1. PMS Integration

- Added PMS executor, registry, loader, and YAML templates.
- Integrated PMS into:
  - ImageAnalyzer and TextExtractor
  - Harvester (PMS metadata propagation)
  - CIC Control Plane (`GET /pms/templates`)
- Ensures all extractors are prompt‑aware and contract‑aligned.

### 2. RTK Active Automation Layer

- Implemented RTK automation modules:
  - `types.ts`, `state.ts`, `bursts.ts`, `smoke.ts`, `orchestrator.ts`
- Features:
  - Burst ingestion planning (Mode A)
  - Smoke‑test gating on section transitions (Mode B)
  - Section‑tracking automation and safeguards (Mode C)
  - Governance feedback emission on critical failures
- Exposed automation state via Control Plane:
  - `GET /rtk/automation/state`

### 3. Hybrid Test Harness (Mode B)

- Added in‑process hybrid harness:
  - Real PMS, Extractors, Harvester, RTK Automation, section tracking
  - Mocked edges for RRK, git‑ai, external stores
- Scenarios covered:
  - Healthy bursts and monotonic section advancement
  - Failure‑rate safeguards and section blocking
  - PMS template error isolation
  - Smoke‑test gating on section changes
  - Observability (logs + metrics shape)
- Total tests: **63** (all passing).

---

## Files and Modules

- PMS:
  - `projects/cic/src/pms/*`
  - `projects/cic/pms/templates/*.yaml`
- RTK Automation:
  - `projects/cic/src/rtk/automation/*`
- Control Plane:
  - `projects/cic/src/cic/control-plane/index.ts`
- Hybrid Harness:
  - `projects/cic/tests/runtime/hybrid/*`
  - `projects/cic/tests/fixtures/*`
- Docs:
  - `projects/cic/docs/CIC_SYSTEM.md` (RTK Automation + PMS sections)

---

## Compatibility

- Requires CIC‑AI Runtime Contract **v1.0.0**.
- No breaking changes to existing contract; v1.1.0 is a **strict extension**.

---

## Upgrade Notes

- Ensure `npm install` is run in `projects/cic` to pick up new dependencies (`express`, `yaml`).
- Run:
  - `npm run build`
  - `npm test`
- Verify Control Plane endpoints:
  - `/pms/templates`
  - `/rtk/automation/state`
