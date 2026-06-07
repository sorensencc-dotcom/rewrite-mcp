# CIC‑AI Runtime v1.2.0 — Planning Brief

## 1. Vision and Goal

Following the successful deployment of the **v1.1.0 Ingestion and Active Automation Substrate**, the focus of **v1.2.0** is to introduce **Operator-in-the-loop Governance, Durable Multi-Tenant Blackboard Memory, and Cost-Aware LLM Routing**.

This release transitions the system from a self-correcting automation engine into a **highly controllable, cost-optimized, and enterprise-grade intelligence platform**.

---

## 2. Key Design Pillars & Subsystems

### A. Operator-in-the-Loop Overrides (Governance Substrate)
- **Goal**: Expose manual intervention capabilities in the Control Plane and Observability Dashboard.
- **Features**:
  - Expose API endpoints for manual overriding of blocked sections (`POST /rtk/automation/override/:sectionId`).
  - Introduce dynamic policy tuning controls (such as modifying confidence thresholds or failure tolerances in real time).
  - Implement dynamic cooling-off period resets for autonomous effectors.
- **Dashboard Linkage**: Direct buttons in the *Control Room* and *SLO Dashboard* to instantly force-advance, throttle, or unblock subsystems.

### B. Durable Multi-Tenant Blackboard Memory Plane (Memory Substrate)
- **Goal**: Expand the current memory blackboard into a robust, concurrent, and durably-persisted blackboard system.
- **Features**:
  - Configurable Time-To-Live (TTL) policies and automated cleanup cron workers.
  - Multi-tenant isolation for handling parallel historical projects cleanly.
  - Snapshot and serialization APIs to support complete state persistence, recovery, and offline audit replays.

### C. Cost-Aware LLM Ingestion Routing (Intelligence Substrate)
- **Goal**: Hardened intelligence routing in the Harvester to optimize API budgets without sacrificing quality.
- **Features**:
  - Implement a dynamic routing controller evaluating complexity, tokens, and reliability scoring.
  - Automatically tier workloads:
    - **Tier 1 (Fast & Economical)**: Standard facts and deduplications routed to highly efficient local or cloud models.
    - **Tier 2 (Rich Reasoning)**: Intricate scenes, transcription alignments, and thematic synthesis routed to Gemini 3.5 Flash or Claude.
  - Fail-fast client fallbacks mapped cleanly under the existing `modelFallback.js` architectures.

### D. Security & Threat Modeling Integration
- **Goal**: Build pre-ingestion quarantine validation checks directly into the Harvester pipelines.
- **Features**:
  - Seamlessly wire in the existing signature-based malware scanner before extractors parse incoming sources.
  - Emit real-time security telemetry alerts directly to the Control Plane.

---

## 3. Proposed File Structure

- **Core Extensions**:
  - `projects/cic/src/governance/override.ts` (operator endpoints)
  - `projects/cic/src/mas/blackboard-durable.ts` (persisted blackboard)
  - `projects/cic/src/harvester/router.ts` (complexity-aware routing controller)
- **Dashboard Components**:
  - `apps/operator-ui/js/governance-panel.js`
  - `apps/operator-ui/js/override-controls.css`
- **Verification Suites**:
  - `projects/cic/tests/runtime/hybrid/rtk-hybrid.operator-override.test.ts`
  - `projects/cic/tests/runtime/hybrid/rtk-hybrid.durable-memory.test.ts`

---

## 4. Compatibility and Invariants

- **Backward Compatibility**: Fully compatible with the v1.1.0 prompt pack configurations and v1.0.0 coherence contracts.
- **Invariants Guarded**:
  - Cost caps are strictly honored.
  - Non-monotonic section jumps are blocked unless signed with explicit operator authorization keys.
