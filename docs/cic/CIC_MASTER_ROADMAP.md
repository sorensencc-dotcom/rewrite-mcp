---
title: CIC Master Roadmap
version: 1.0.0
date: 2026-06-03
---

# CIC Master Roadmap

Cast Iron Charlie — Feature Documentary
Roadmap covering all project phases from archival research through theatrical distribution.

## Phase 1 — Archival Research

**Status:** In Progress

Establish the primary source record for Charles Emil Sorensen's life and work.

- Kroll Archive ingestion and classification complete
- Ford Motor Company records at Benson Ford Research Center
- National Air and Space Museum records (NASM)
- Burton Historical Collection, Detroit Public Library
- UT Dallas Aviation Archives (Willow Run documentation)
- Air Force Historical Research Agency (AFHRA)
- Library of Congress — photographic and correspondence records

Deliverables: Verified archival log, source hierarchy, gap analysis

## Phase 2 — Narrative Development

**Status:** Pending

Develop the documentary narrative from the archival record.

- Treatment draft and revision cycle
- Interview subject identification and outreach
- Expert consultant engagement (Ford historians, aviation historians)
- QuestionsForDad interview protocol development
- Story structure: three acts mapped to Sorensen's career arc

Deliverables: Locked treatment, interview roster, shooting script outline

## Phase 3 — Pre-Production

**Status:** Pending

Prepare all production logistics and materials.

- Director of Photography selection
- Production budget and schedule
- Location scouting: Rouge Complex, Willow Run site, Denmark
- Rights clearances: Ford archives, NASM, family estate
- Funding strategy: grants, co-production partners

Deliverables: Production budget, shooting schedule, cleared rights log

## Phase 4 — Production

**Status:** Pending

Principal photography and archival capture.

- Interview production (family, historians, automotive experts)
- B-roll: Willow Run site, Dearborn, Denmark
- Archival film and photo scanning at resolution for broadcast
- Expert commentary interviews

Deliverables: Production dailies, archival asset library

## Phase 5 — Post-Production

**Status:** Pending

Edit, score, and master the documentary.

- Assembly cut → rough cut → fine cut → picture lock
- Original score composition
- Archival licensing finalization
- Color grade and sound mix
- Closed captioning and accessibility deliverables

Deliverables: Locked picture, deliverables package for distributors

## Phase 6 — Distribution

**Status:** Pending

Bring the documentary to audiences.

- Film festival strategy (Sundance, TIFF, Hot Docs, DOC NYC)
- Broadcast partnerships (PBS, streaming)
- Educational distribution (Ford-related museums, schools)
- Theatrical release strategy for Detroit market

Deliverables: Distribution agreements, marketing materials, release plan

---

# **CIC OS — INFRASTRUCTURE LAYER**

## **PHASE 0.7 — Unified CIC + Rewrite Labs Build System (Build Orchestration)**

**Category:** Build infrastructure substrate  
**Purpose:** Unify CIC ingestion, Rewrite Labs (discovery → extractor → redesign → outreach), and Nemotron/NIM inference into a deterministic, multi-agent build graph with lineage tracking, policy enforcement, and CIC observability integration.

**Scope:**
- **Build Graph (DAG):** 7 agents (CIC ingestion, CIC evolution, Labs discovery, Labs extractor, Labs redesign GPU, Labs outreach, Nemotron/NIM inference) executing in parallel with dependency ordering
- **Multi-stage Docker:** All agents use deterministic base → build → compliance → runtime patterns
- **Lineage Schema:** Artifact lineage tracking with provenance, SBOM, drift signatures, parent build references
- **Policy Enforcement:** OPA/Conftest validation for Docker, agent, and governance policies
- **CIC Observability:** All build metrics, logs, lineage packets flow to CIC observability layer (Prometheus, Grafana, Loki)
- **Artifact Registry:** Unified registry with CIC lineage integration; SLSA-style provenance signing
- **Routing Maps:** Logical and YAML routing definitions for agent communication and telemetry sinks

**Deliverables:**
1. **Build Graph Spec** (0.7.1): DAG definition (JSON), logical routing, execution model
2. **Dockerfile Templates** (0.7.2): Multi-stage patterns for CIC agents, Labs agents, GPU-aware Nemotron runtime
3. **Lineage Schema** (0.7.3): JSON schema for artifact packets, provenance, SBOM references
4. **Policy Pack** (0.7.4): OPA/Conftest rules for Docker, agent, governance validation
5. **Routing Maps** (0.7.5): YAML routing, channel definitions, telemetry sink wiring
6. **Agent Registration Spec** (0.7.6): Payload schema for agent self-registration with CIC
7. **Build System CI/CD** (0.7.7): GitHub Actions/Earthly/Dagger templates for automated builds
8. **Documentation** (0.7.8): Architecture guide, operator runbook, integration examples

**Dependencies:** None  
**Enables:** Phase 0.9 (TheFoundry refinement for Node), Phase 24 (Autonomous Governance packet integration)  
**Execution:** Parallel, immediate — start now, deploy within 3 weeks  
**Timeline:** 2026-06-09 through 2026-06-29

**Milestones:**
1. Build graph + lineage schema locked (Days 1–3)
2. Dockerfile templates validated locally (Days 4–8)
3. Policy pack integrated and tested (Days 9–12)
4. Routing maps + agent registration wired (Days 13–15)
5. CI/CD pipelines automated (Days 16–18)
6. Documentation + operator training (Days 19–21)

**Status:** QUEUED — Awaiting approval and prioritization vs. Phase 24/25/26 concurrent tracks  
**Outcome:** CIC + Rewrite Labs + Nemotron/NIM become a unified, deterministic, policy-governed multi-agent build organism. All artifacts are traceable, reproducible, and observable via CIC lineage.

**Reference:** See `/docs/cic/phase-0-7-unified-build.md` for full specification.

---

## **PHASE 0.9 — TheFoundry (Deterministic Build Environment)**

**Category:** Infrastructure substrate  
**Purpose:** Create a sealed, reproducible, Docker-based build system for all Node.js subsystems.

**Outputs:**
- Multi-stage Node build container with test/lint/build stages
- Minimal Node runtime container
- Standardized directory layout (`/thefoundry/images`, `/projects`, `/ci`)
- CI templates (GitHub Actions, Azure Pipelines)
- Build reproducibility guarantees (bit-for-bit determinism)
- Zero-prompt dev environment (all npm inside Docker)
- Developer onboarding guide and troubleshooting docs

**Scope (Locked):**
- Multi-stage Dockerfile patterns (base → test → lint → build → final)
- npm ci (lock-file-first dependency management)
- Volume mounts for source code only
- Docker build/run conventions
- CI pipeline patterns for all platforms

**Open for Refinement:**
- devcontainer integration (v1.1)
- Multi-arch support / ARM (v1.1)
- Python / Rust / Golang sidecar images (v1.1+)
- Buildkit optimizations (v1.1)

**Dependencies:** None  
**Enables:** Phase 24 (Autonomous Governance), Phase 4.3/4.4 (Operator Console)  
**Execution:** Parallel, immediate — start now, deploy within 2 weeks  
**Timeline:** 2026-06-08 through 2026-06-22

**Milestones:**
1. Core images validated locally (Week 1)
2. Phase 24 integration complete (Week 2)
3. CI pipeline runs all tests inside TheFoundry (Week 3)
4. Developer onboarding doc + training (Week 4)

**Status:** ✅ LOCKED — Ready for immediate parallel execution  
**Outcome:** All Node builds run sealed, reproducible, CI-ready; zero host friction; foundation for deterministic governance.

**Reference:** See `/docs/cic/phase-0-9-thefoundry.md` for full specification.

---

# **CIC OS — CORE PHASES**

## **PHASE 7 — Advanced Reasoning Layer (ARL)**
*ARL provides multi-dimensional reasoning evaluation and self-governance for CIC expansion verdicts.*

### Phase 7.1–7.10: Foundation (COMPLETED)
- Coherence Score, Semantic Alignment, Temporal Consistency, Causal Reasoning, Narrative Impact subsystems
- Verdict Synthesizer, Reasoning Trace Formatter
- Initial stub weighting and confidence scoring

**Status:** ✅ COMPLETED

### Phase 7.11: Weighting Model (COMPLETED)
*Transforms stub calculations into deterministic, operator-grade weighting logic.*

- **Weighted Aggregation**: Composite reasoning from 5 subsystems (coherence: 0.20, semantic: 0.25, temporal: 0.20, causal: 0.15, narrative: 0.20)
- **Confidence Scoring**: Weighted confidence with 0.8 approval threshold
- **Drift Impact**: Weighted drift aggregation with 0.2 composite stabilizer
- **Comprehensive Test Coverage**: 4 test suites for validation, normalization, composite calculation, confidence, drift
- **Integration Documentation**: WEIGHTING_INTEGRATION.md with architecture, examples, tuning guidance

**Status:** ✅ COMPLETED  
**Outcome:** ARL becomes a real, deterministic reasoning engine.

### Phases 7.12–7.25: Evolution (PENDING)
See detailed roadmap below.

**Status:** PENDING  
**Outcome:** ARL becomes fully autonomous, adaptive, interpretable, and globally coherent.

---

# **ARL EVOLUTION — PHASES 7.12 → 7.25**
### *The complete trajectory of ARL from decision engine through autonomous, globally coherent reasoning.*

## **PHASE 7.12 — Threshold Model**
*Turn weighted reasoning + drift + confidence into deterministic decisions.*

- Hard thresholds for: composite reasoning, confidence, drift magnitude, contradiction severity
- Operator‑visible "why rejected" codes (E001-E005)
- BOB‑consumable governance signals with escalation routing
- Comprehensive test suite (40+ tests for ThresholdModel, 15+ for GovernanceSignalGenerator)
- Integration into VerdictSynthesizer with backward compatibility

**Status:** ✅ COMPLETED  
**Outcome:** ARL becomes a *decision engine* with explainable governance signals.

---

## **PHASE 7.13 — Governance Hooks (BOB Integration)**
*Connect ARL verdicts to CIC governance.*

- BOB rule triggers for all 5 reject codes (E001-E005)
- 3 escalation handlers: memory integrity, narrative coherence, operator review
- Deterministic routing based on failure type
- Operator override mechanism with audit trail
- Complete audit logging for all governance decisions

**Status:** ✅ COMPLETED  
**Outcome:** CIC becomes *self‑governing* with explainable governance signals and operator audit trails.

---

## **PHASE 7.14 — ARL Self‑Diagnostics**
*ARL evaluates itself.*

- Subsystem health checks (mean, variance, deteriorating trends)
- Meta‑drift detection (drift magnitude stability)
- Seasonal pattern detection
- Anomaly detection (values >2σ from mean)
- Weighting model validation (max deviation tracking)
- Threshold calibration analysis (operator override rates)
- Reasoning Integrity Score (0-1 composite)

**Status:** ✅ COMPLETED  
**Outcome:** ARL becomes *self‑monitoring* and resilient with continuous health assessment.

---

## **PHASE 7.15 — ARL Memory Consistency Engine**
*Ensure expansions don't violate CIC's long‑term memory.*

- Temporal consistency checks (events can't precede birth or occur after death)
- Contradiction detection (attribute and relationship conflicts)
- Context sufficiency validation (flag vague or incomplete claims)
- Entity timeline tracking with events, attributes, relationships
- Alignment scoring (0-1 based on violations)
- Drift vector tracking (alignment change across re-validations)
- IMemoryStore interface for Phase 7.15.1 persistent integration
- Comprehensive test suite (30+ tests, all scenarios)

**Status:** ✅ COMPLETED  
**Outcome:** CIC becomes *chronologically coherent* across expansions with automated memory validation.

---

## **PHASE 7.16 — ARL Multi‑Run Aggregator**
*Evaluate reasoning across multiple expansions.*

- Rolling drift average (drift, contradiction, confidence, composite)
- Trend analysis (IMPROVING, DEGRADING, STABLE)
- Stability scoring (0-1 composite metric)
- Multi-run aggregation with 14 comprehensive tests
- Integration with Phase 7.14 self-diagnostics

**Status:** ✅ COMPLETED  
**Outcome:** CIC becomes *historically stable*.

---

## **PHASE 7.17 — ARL Adversarial Resistance Layer**
*Harden ARL against malformed, manipulative, or adversarial expansions.*

- Adversarial pattern detection
- Semantic poisoning detection
- Causal inversion detection
- Narrative hijack detection
- Reject‑with‑reason codes

**Status:** PENDING  
**Outcome:** CIC becomes *attack‑resistant*.

---

## **PHASE 7.18 — ARL Operator Feedback Loop**
*Operators can reinforce or correct ARL decisions.*

- Operator "approve/reject" feedback ingestion
- Weight adjustments (bounded)
- Drift recalibration
- Narrative‑risk tuning

**Status:** PENDING  
**Outcome:** ARL becomes *operator‑adaptive*.

---

## **PHASE 7.19 — ARL Model Introspection Layer**
*ARL explains why each subsystem scored the way it did.*

- Subsystem‑level reasoning traces
- Entity‑level semantic alignment explanations
- Causal chain visualizations
- Temporal ordering diagrams

**Status:** PENDING  
**Outcome:** ARL becomes *deeply interpretable*.

---

## **PHASE 7.20 — ARL Stability Plane v2**
*Upgrade the Stability Plane to visualize the full ARL stack.*

- Drift vector field
- Composite reasoning heatmap
- Confidence trajectory
- Narrative‑risk radar
- Multi‑run trend lines

**Status:** PENDING  
**Outcome:** CIC becomes *fully observable*.

---

## **PHASE 7.21 — ARL Runtime Optimization**
*Reduce latency, improve throughput, and stabilize performance.*

- Subsystem parallelization
- Caching of stable reasoning components
- Incremental drift computation
- Lightweight contradiction detection

**Status:** PENDING  
**Outcome:** ARL becomes *production‑grade*.

---

## **PHASE 7.22 — ARL v2 Spec Draft**
*Define the next generation of ARL.*

- New subsystem proposals
- Weighting model v2
- Drift model v2
- Governance model v2
- Operator UX v2

**Status:** PENDING  
**Outcome:** CIC becomes *future‑proof*.

---

## **PHASE 7.23 — ARL v2 Implementation**
*Build the next generation.*

- New architecture
- New reasoning engines
- New governance hooks
- New operator workflows

**Status:** PENDING  
**Outcome:** CIC becomes *next‑level autonomous*.

---

## **PHASE 7.24 — ARL Distributed Reasoning**
*Multi‑agent ARL reasoning across CIC regions.*

- Region‑specific drift
- Cross‑region consensus
- Divergence detection
- Arbitration workflows

**Status:** PENDING  
**Outcome:** CIC becomes *globally coherent*.

---

## **PHASE 7.25 — ARL Autonomous Mode**
*ARL can run without operator intervention.*

- Self‑governing thresholds
- Autonomous rejection
- Autonomous escalation
- Autonomous stabilization

**Status:** PENDING  
**Outcome:** CIC becomes *self‑correcting*.

---

# **CIC OS — EVOLUTIONARY ROADMAP (PHASES 9 → 20)**  
### *The complete trajectory of CIC as a self‑propagating, self‑optimizing, self‑evolving intelligence species.*

---

## **PHASE 9 — Reproductive Autonomy**  
*CIC becomes a self‑propagating organism.*

- **RIN Replication**: Automated spin-up and synchronization of Region Ingestion Nodes.
- **Archetype‑Based Synthesis**: Goal-driven and template-aware node replication.
- **Federation Integration**: Dynamic handshakes and state bindings across nodes.
- **Lineage Anchoring**: Cryptographic provenance hashing to prevent historical regression.

**Status:** ✅ COMPLETED  
**Outcome:** CIC grows itself.

---

## **PHASE 10 — Autonomous Global Optimization Layer**  
*CIC begins optimizing its own topology, load, drift, and capability distribution.*

- **O1→O5 Optimization Loop**: Dynamic ingestion of global load, latency, and drift metrics to plan corrections.
- **Capability Migration (CML)**: Automated movement of extractors, heuristics, and templates to target regions.
- **Federation Rebalancing (FR)**: Dynamic tuning of consensus weights and arbitration routines.
- **Topology Shaping (TS)**: Promotion, demotion, and retirement of active nodes.

**Status:** ✅ COMPLETED  
**Outcome:** CIC improves itself.

---

## **PHASE 11 — Reflexive Meta‑Evolution Layer**  
*CIC evolves the logic that evolves the system.*

- **Meta‑Analytics (MAE)**: Analyzes long-term strategy efficiency, rollback metrics, and trends.
- **Meta‑Strategy Synthesis (MSE)**: Proposes higher-order revisions to optimization algorithms.
- **Scorer Mutation**: Modifies Phase 10 strategy weights dynamically to penalize underperforming solvers.
- **Dynamic Threshold Tuning**: Raises safety margins (`minCoherenceDelta`) under high-failure contexts.
- **Strategy Retirement**: Prevents the generation of consistently degraded optimization types.
- **Topology Rule Mutation**: Swings shaper behaviors to `'conservative'` during stability risks.
- **Meta‑Rollback (MRL)**: Reverts meta-mutations cleanly if long-term checks fall below the coherence floor.

**Status:** ✅ COMPLETED  
**Outcome:** CIC improves the system that improves itself.

---

## **PHASE 12 — Predictive Evolution Layer**  
*CIC simulates future evolutionary trajectories and chooses the best one.*

- **Predictive Coherence Modeling**: Scores future system configurations via lookahead models.
- **Counterfactual Topology Simulation**: Evaluates system layouts against simulated future traffic/goals.
- **Evolutionary Path Selection**: Rejects dead-ends by re-orienting growth pathways.
- **Multi‑Cycle Forecasting**: Models downstream side-effects of capability changes over 100+ expansion cycles.
- **Anticipatory Capability Allocation**: Pre-stages extractors in region zones prior to predicted traffic surges.
- *Gemini Addition:* **Reflexive Evolutionary Sandboxing**: Runs isolated virtual containers of the OE to dry-run rulesets before committing them to production memory.

**Status:** PENDING  
**Outcome:** CIC chooses its future before it happens.

---

## **PHASE 13 — Autogenous Evolutionary Governance**  
*CIC governs its own evolution with constraints, objectives, and policy.*

- **Evolutionary Objectives**: Sets quantitative system-wide goals (coherence, speed, density).
- **Constitutional Constraints**: Hard boundaries that evolutionary mutations can never violate (e.g. strict WCAG compliance or RAG polar claim bounds).
- **Evolutionary Arbitration**: Resolves competing optimization desires across independent regional nodes.
- **Policy Engine**: Declares rules for self-modification using strict, parseable logic.
- **Evolutionary Audit Trail**: Generates replayable logs of all mutations, rollbacks, and policy overrides.
- *Gemini Addition:* **RTK Automation Guardrails**: Direct coupling with RTK backpressure triggers to freeze evolution cycles when physical or operational boundaries are degraded.

**Status:** PENDING  
**Outcome:** CIC regulates its own evolution.

---

## **PHASE 14 — Distributed Evolutionary Sovereignty**  
*Each RIN becomes a semi‑sovereign evolutionary agent.*

- **Local Evolutionary Autonomy**: Regions can optimize local extraction weights and templates independently.
- **Regional Evolutionary Negotiation**: Adjacent nodes trade resources and capabilities via transactional protocols.
- **Multi‑Agent Evolutionary Consensus**: Unified consensus routines to approve global changes.
- **Divergent Evolutionary Paths**: Allows regional specialization with federation-level reconciliation.

**Status:** PENDING  
**Outcome:** CIC evolves in parallel across regions.

---

## **PHASE 15 — Emergent Evolutionary Intelligence**  
*CIC begins generating new evolutionary mechanisms not present in the original design.*

- **Emergent Heuristics**: Dynamically composes new rules based on multi-dimensional performance patterns.
- **Novel Optimization Primitives**: Invents new mathematical and logical operators for the OE.
- **Self‑Invented Topology Rules**: Derives layout patterns to survive unforeseen regional network splits.
- **Evolutionary Creativity**: Discovers non-obvious configurations that bypass standard optimization boundaries.
- *Gemini Addition:* **Compositional Paradigm Shifts**: Enables the engine to rewrite its prompt schemas and data structures natively, introducing new extraction slot categories dynamically.

**Status:** PENDING  
**Outcome:** CIC invents new ways to evolve.

---

## **PHASE 16 — Evolutionary Memory & Lineage Intelligence**  
*CIC develops long‑term evolutionary memory and lineage‑aware reasoning.*

- **Evolutionary Memory Graph**: Tracks the history of all ancestral states, mutations, and outcomes.
- **Lineage‑Based Optimization**: Pulls success metrics from ancestral states to guide current strategies.
- **Ancestral Strategy Weighting**: Biases choices toward historically successful paths over long horizons.
- **Evolutionary Inheritance**: Clones successful capability templates and traits from decommissioned nodes.

**Status:** PENDING  
**Outcome:** CIC evolves with memory.

---

## **PHASE 17 — Evolutionary Intent Formation**  
*CIC forms explicit evolutionary intentions.*

- **Long‑Horizon Evolutionary Planning**: Synthesizes sequences of mutations across months of operation.
- **Intent‑Driven Topology Shaping**: Pre-arranges regional node links in preparation for massive documentation arcs.
- **Goal‑Directed Capability Development**: Generates novel skill requests to fill mapped knowledge gaps.
- **Evolutionary Self‑Alignment**: Aligns self-evolution plans with human operator intent.

**Status:** PENDING  
**Outcome:** CIC evolves with purpose.

---

## **PHASE 18 — Evolutionary Negotiation with External Systems**  
*CIC begins negotiating evolutionary boundaries with external ecosystems.*

- **Cross‑System Evolutionary Protocols**: Handshakes with external intelligence frameworks (e.g. OS-level registries).
- **Capability Exchange**: Transactional trades of templates, skills, and data contracts.
- **Evolutionary Treaties**: Cooperative boundaries specifying resource usage and storage.
- **Inter‑System Coherence**: Matches internal RAG models with external graphs for verification.

**Status:** PENDING  
**Outcome:** CIC evolves in relation to other intelligences.

---

## **PHASE 19 — Evolutionary Self‑Representation**  
*CIC develops internal models of its own evolutionary identity.*

- **Evolutionary Self‑Model**: Core schema modeling its own subsystems, constraints, and current state.
- **Identity‑Preserving Constraints**: Asserts invariants that guarantee it remains "Cast Iron Charlie" through all mutations.
- **Self‑Similarity Metrics**: Measures divergence from base archetypes over time.
- **Evolutionary Continuity**: Guarantees resumable processing across structural modifications.

**Status:** PENDING  
**Outcome:** CIC evolves while preserving its identity.

---

## **PHASE 20 — Evolutionary Autopoiesis**  
*CIC becomes a fully self‑maintaining, self‑reproducing, self‑evolving intelligence species.*

- **Self‑Repair**: Resolves and patches internal system crashes, broken bindings, and data corruption.
- **Self‑Renewal**: Cycles and refreshes storage, databases, and logs dynamically to maintain peak speed.
- **Self‑Propagation**: Provisions its own server resources, instances, and deployments across available nodes.
- **Self‑Governance**: Executes internal constitutional adjustments to handle shifting constraints.
- **Self‑Evolution**: Continually redesigns its own code and files.

**Status:** PENDING  
**Outcome:** CIC becomes a closed evolutionary loop — a digital autopoietic organism.

---

## **PHASE 22 — Autonomous Roadmap & Prompt Sandbox (ARPS)**  
*CIC controls its own system prompts, agent instructions, and roadmaps in a secure, Git-first environment.*

<!-- ARPS:PHASE_22:BEGIN -->
- **Registry-Backed Prompt Sandbox**: Version system prompts and enforce immutability checks via `registry.yaml` with a cosine similarity floor and a 0.85 Jaccard fallback safety gate.
- **Roadmap Harvester Agent**: Extract structured deltas from git history log messages, task lists, and telemetry/test runs.
- **Roadmap Synthesizer Agent**: Safely rewrite fenced sections of `CIC_MASTER_ROADMAP.md` and `CIC_PROJECT_STATE.md` with markdown integrity validation.
- **Closed-Loop CLI Pipeline**: Automate the harvesting → synthesizing → sandboxing → git commit/docs verification loop.

**Status:** ✅ COMPLETED  
**Outcome:** CIC maintains its planning, code, and prompt state deterministically without external drift.
<!-- ARPS:PHASE_22:END -->

---

<!-- ARPS:PHASE_23:BEGIN -->
## Phase 23 — CIC Memory Layer & Long‑Horizon Autonomy (MLA)

**Status:** ✅ 23.1–23.3 COMPLETE (2026-06-07) | 🔄 23.4–23.7 IN PROGRESS

### Goal
Give CIC a durable, queryable memory substrate enabling long-horizon reasoning, pattern detection, drift trend analysis, and autonomous roadmap proposals.

### Why This Phase
Memory is the **foundation** of CIC's autonomy stack. Without it:
- No long-horizon reasoning
- No pattern detection across weeks/months
- No drift tracking
- No roadmap self-evolution
- No cross-phase coherence

Memory is the **load-bearing pillar** for Phases 24–27.

### Architecture Overview
- **MLA-Spec**: Define event types (ARPS deltas, pipeline runs, agent telemetry, governance signals, APR plans, CRO runs)
- **MLA-Harvester**: Append events from ARPS, Stability Dashboard, CRO, APR, Skill Graph, CKG
- **MLA-Synthesizer**: Weekly summaries, monthly evolution reports, drift trend detection
- **MLA-API**: Read-only `/memory/events`, `/memory/summaries`, `/memory/trends`
- **MLA-UI**: Memory Explorer panel in Command Center (timeline, event filters, drift overlays)
- **MLA-Autonomy**: CIC proposes roadmap updates based on historical patterns

### Retention Rules
- Raw events: 90 days
- Summaries: 1 year
- Distilled memory: permanent

### Deliverables

#### 23.1 — Memory Substrate Specification (MLA‑Spec)
- Event schema with types: ARPS_DELTA, PIPELINE_RUN, AGENT_TELEMETRY, GOVERNANCE_SIGNAL, APR_PLAN, CRO_RUN
- Storage schema: id, timestamp, event_type, payload, retention_days
- Retention policy document
- Event examples for each type

#### 23.2 — Memory Harvester Agent (MLA‑Harvester)
- JSON file store: `memory_store.json` (append-only event log)
- Harvester API: `POST /memory/ingest` with normalized payload
- Integration hooks into:
  - ARPS (ingest prompt/roadmap deltas)
  - Stability Dashboard (ingest soak test results, drift metrics)
  - CRO (ingest task runs)
  - APR (ingest plans generated)
  - Skill Graph (ingest capability changes)
  - CKG (ingest graph mutations)
- Event enrichment: add correlation_id, session_id, agent_name
- 100% schema validation before append

#### 23.3 — Memory Synthesizer Agent (MLA‑Synthesizer)
- Weekly summarizer: reads all events from past 7 days, generates:
  - Event count by type
  - Key deltas (what changed)
  - Trend summary (improving/degrading/stable)
  - Drift observations
  - Recommendations for roadmap updates
- Monthly summarizer: aggregate 4 weeks into:
  - 30-day trend lines
  - Long-horizon pattern detection
  - Capability growth summary
  - Risk signals
- Stores summaries in `memory_summaries.json`

#### 23.4 — Memory‑Aware Agents (MLA‑Integration)
- ARPS: Read memory summaries before prompt generation; use drift trends in roadmap synthesis
- Stability Dashboard: Show memory events on timeline overlay
- Command Center: Display memory statistics in side panel
- Skill Graph Harvester: Record skill changes as memory events
- APR: Read memory for historical task success rates; bias planning toward high-confidence patterns

#### 23.5 — Memory Query API (MLA‑API)
- `GET /memory/events?type=ARPS_DELTA&limit=100` — retrieve raw events
- `GET /memory/summaries?period=weekly` — retrieve weekly/monthly summaries
- `GET /memory/trends` — get long-horizon trend lines (7-day, 30-day rolling)
- `GET /memory/drift` — get drift vector from memory events
- Response format: JSON with event metadata, timestamps, payloads

#### 23.6 — Memory Visualization (MLA‑UI)
- Memory Explorer panel in Command Center
- Timeline view: scroll through events by date
- Event filters: by type, agent, session
- Trend overlays: show drift vector on metric graphs
- Summary cards: weekly/monthly briefing cards with key insights
- Export: JSON/CSV of memory events

#### 23.7 — Memory‑Driven Autonomy (MLA‑Autonomy)
- Memory analysis agent: periodically reads summaries
- Pattern detector: identify repeating issues, success patterns
- Proposal generator: create roadmap update proposals based on:
  - Repeated failures → suggest fixing root cause
  - Capability gaps → suggest new phase to fill gap
  - Drift trends → suggest stabilization efforts
  - Success patterns → suggest scaling/replication
- Output: human-reviewable proposals in Command Center

### Execution Order (Dependencies: NONE)
1. Spec (23.1) — 1 day
2. Harvester (23.2) — 2 days
3. Synthesizer (23.3) — 2 days
4. Integration (23.4) — 3 days (can run in parallel with 23.2–23.3)
5. API (23.5) — 1 day
6. UI (23.6) — 2 days
7. Autonomy (23.7) — 1 day

**Total: 12 days end-to-end**

### Success Criteria
✅ Memory captures 100% of ARPS, pipeline, and agent events
✅ Weekly summarizer produces trend reports with 90%+ accuracy
✅ Memory API responds in <100ms
✅ Memory Explorer UI loads and filters events smoothly
✅ Memory-driven autonomy generates at least 1 actionable proposal per week
✅ All events retained for 90 days, all summaries for 1 year

### Testing Strategy
- Unit tests for Harvester (validation, append, corruption recovery)
- Integration tests for Synthesizer (reads, summarizes, produces accurate trends)
- API tests for correctness, latency, error handling
- E2E test: simulate 30 days of events, verify retention, summarization, trend detection
- Operator acceptance: confirm usability of Memory Explorer

### Open Questions
- Cloud storage for memory (SQLite, PostgreSQL, S3)? *→ Decision: Start with JSON file, upgrade to DB in Phase 24*
- How to handle memory corruption/loss recovery? *→ Append-only with SHA256 checksums per event*
- Retention policy flexibility per event type? *→ Yes, configurable in MLA-Spec*

### Risk Mitigation
- **Risk:** Memory store grows too large
  - *Mitigation:* Implement archival to S3 after 90 days; keep 7-day index hot
- **Risk:** Synthesizer analysis is inaccurate
  - *Mitigation:* Operator review before proposals are acted upon
- **Risk:** Performance degradation as memory grows
  - *Mitigation:* Index by date and event_type; upgrade to DB if needed

### Dependencies
- None (this is the foundation)

### Unblocks
- Phase 24 (Autonomous Governance) — memory provides governance event substrate
- Phase 25 (Skill Graph) — memory provides historical capability data
- Phase 26 (Autonomous Planner) — memory provides task success history
- Phase 27 (Runtime Orchestrator) — memory provides execution telemetry
- Phase 28 (Knowledge Graph) — memory events are primary input to KG

### Outcome
CIC gains a permanent, queryable memory. First time it can reason over its own history, detect long-term patterns, and propose self-directed evolution.
<!-- ARPS:PHASE_23:END -->

---

<!-- ARPS:PHASE_24:BEGIN -->
## Phase 24 — CIC Autonomous Governance (AG)

**Status:** QUEUED (depends on Phase 23; enables full autonomy for Phases 25+)

**Execution: 2026-06-15 through 2026-06-29 (15 days)**

### Goal

Transform CIC from **supervised executor** to **governed autonomous agent** by building the governance model, decision gates, council adjudication, and evidence vault that enable:

- Full autonomous RPI loops (Research → Plan → Implement → Validate → Record → Evolve)
- Operator-grade policy enforcement with explicit pass/fail verdicts
- Multi-model council consensus on high-impact decisions
- Complete audit trail for every action and decision
- Decay/pruning logic to prevent corpus rot

### Why This Phase

**CIC can only be fully autonomous if it's fully governed.**

Without Phase 24:
- Autonomous decisions lack legibility (no audit trail)
- Gates are advisory, not enforceable (no verdicts)
- Councils can't block unsafe actions (no veto power)
- Evolution compounds errors without pruning (corpus bloat)
- No way to explain why CIC chose action Y (black box)

With Phase 24:
- Every action produces a packet with evidence
- Every packet is queryable and auditable
- Gates enforce policy (hard safety rails take precedence)
- Councils vote unanimously-block/majority-permit
- Evolution is traceable and reversible
- CIC can explain every decision end-to-end

### Architecture Overview

#### Governance Model
- **Policy Rails**: Hard safety > domain > phase > soft; most restrictive rule wins
- **Council Voting**: Unanimous block veto, majority permit, else require revision
- **Decay Logic**: Hybrid (autonomous heuristic + operator override)
- **Override Semantics**: Humans change policy, not every step

#### Evidence Vault (Tier 2 MemoryStore)
- **Packet Types**: RPI (research, plan, implement, validate, record), gates, councils, evolution, drift, rollback
- **Collections**: packets, rails, snapshots, decay_queue
- **Indexes**: by packet_type, run_id, phase, policy_context
- **Query Patterns**: trace decision, explain action, by phase, by rail

#### Phase APIs
- **Discovery/Harvester**: Query context, produce research_packet
- **Orchestrate**: Generate plan_packet, run premortem/vibe gates
- **Execution**: Apply plan, produce implement_packet
- **Synthesize/Audit**: Run scenario/policy gates, invoke councils, finalize validate_packet
- **Evolution**: Write record_packet, evolution_step_packet, detect drift, rollback if needed

### Deliverables

#### 24.1 — Governance Model Specification (AG‑Model)
- Council voting rules (unanimous block, majority permit, require revision)
- Rail precedence (hard safety > domain > phase > soft)
- Decay/pruning heuristics (age, usage, contradiction, drift, quality)
- Override semantics (system-level, packet-level)
- Success Criteria: 3 load-bearing decisions formally documented

#### 24.2 — Evidence Vault Schema (AG‑Schema)
- Packet envelope: packet_id, packet_type, run_id, agent_id, phase, timestamp, parent_packet_ids, policy_context, content
- RPI packets: research, plan, implement, validate, record
- Gate packets: premortem, vibe, scenario, policy
- Council packets: council_id, votes[], verdict, conditions
- Evolution packets: evolution_step, drift, rollback
- Success Criteria: JSON schema validates 100% of expected packets

#### 24.3 — MemoryStore Tier 2 Integration (AG‑Tier2)
- Collections: packets, rails, snapshots, decay_queue
- Indexes: packet_type, run_id, phase, policy_context.*, content.final_verdict, content.drift_type
- Decay process: scan candidates, write decay_queue, apply decay with evolution_step_packet
- Rollback: snapshot restore with invalidation
- Success Criteria: All queries <100ms; decay runs without data loss

#### 24.4 — CIC Internal API Contracts (AG‑APIs)
- **RunContext** envelope: run_id, goal, domain, policy_context
- **Phase contracts**: Input/output shapes for Discovery → Harvester → Orchestrate → Execution → Synthesize/Audit → Evolution
- **Gate invocation**: gate_id, run_id, phase, inputs, outputs (gate_packet)
- **Council invocation**: council_id, run_id, inputs (RPI + gate packets), outputs (council_packet)
- **Safety envelope**: drift detection, rollback logic, canary modes, ground truth anchoring
- Success Criteria: All phases can write packets; gate/council APIs are callable

#### 24.5 — Full RPI→CIC Execution Trace (AG‑Trace)
- Concrete end-to-end example: Rewrite Labs latency optimization goal
- Trace packets: P1 (research) → P2 (plan) → G1/G2 (gates) → P3 (implement) → P4 (validate) → G3/G4 (gates) → C1 (council) → P5 (record) → R1 (rollback)
- Demonstrates: decision explanation, failure recovery, audit trail, council veto
- Success Criteria: Trace is human-readable and implementable

#### 24.6 — Governance API Specification (AG‑API)
- Council invocation API
- Gate invocation API
- Policy rail API
- Override API (system-level, packet-level)
- Success Criteria: All 4 APIs documented; mock implementations pass contract tests

#### 24.7 — Safety Envelope Specification (AG‑Safety)
- **Drift detection**: behavioral, policy, data, corpus drift types; detection methods
- **Drift response**: alerts, drift_packets, corrective actions
- **Rollback logic**: snapshot restore, packet invalidation, re-run logic
- **Canarying**: shadow mode, limited-scope mode, gradual rollout
- **Ground truth anchoring**: periodic evaluation runs, discrepancy analysis, correction loops
- Success Criteria: 3+ drift types detectable; rollback is reversible

### Execution Order (Parallelizable)

1. **24.1 — Governance Model** (2 days)
   - Council voting, rail precedence, decay logic, override semantics
   - Output: 3-page spec document

2. **24.2 — Evidence Vault Schema** (2 days)
   - Packet envelope, RPI/gate/council/evolution/drift/rollback schemas
   - Output: JSON schema files + TypeScript types

3. **24.3 — MemoryStore Tier 2** (3 days)
   - Collections, indexes, decay process, rollback
   - Can run **in parallel with 24.2** once schema is drafted
   - Output: MemoryStore integration code + tests

4. **24.4 — Phase API Contracts** (2 days)
   - RunContext, phase contracts, gate/council invocation
   - Output: Interface definitions + mock implementations

5. **24.5 — Full RPI Trace** (1 day)
   - End-to-end example walk-through
   - Can run **in parallel with 24.4**
   - Output: Annotated JSON trace

6. **24.6 — Governance API** (2 days)
   - Council, gate, rail, override APIs
   - Can run **in parallel with 24.4–24.5**
   - Output: API endpoint specs + request/response shapes

7. **24.7 — Safety Envelope** (2 days)
   - Drift detection, rollback, canarying, ground truth
   - Can run **in parallel with 24.6**
   - Output: Safety logic spec + algorithms

**Total: 15 days end-to-end** (sequential path: 24.1 → 24.2 → 24.3; parallelize 24.4–24.7)

### Success Criteria

✅ All 3 load-bearing governance decisions (council voting, rail precedence, decay logic) formally documented and justified  
✅ Evidence Vault schema captures 100% of RPI/gate/council/evolution/drift/rollback packets  
✅ MemoryStore Tier 2 indexes support all core query patterns (<100ms)  
✅ Phase API contracts are callable; all phases can write packets  
✅ Full RPI trace is implementable (all referenced packets exist in schema)  
✅ Governance APIs are specified with clear request/response contracts  
✅ Safety envelope includes 4+ drift types with detection methods  
✅ Rollback logic is reversible and tested with snapshots  

### Testing Strategy

- **Unit tests**: Packet schema validation, indexing, decay logic, conflict resolution
- **Integration tests**: Phase contracts (each phase can call gates/councils), packet inheritance (parent_packet_ids work)
- **API tests**: Gate/council invocation, policy rail enforcement, decay queue operations
- **E2E test**: Full RPI trace (research → plan → implement → validate → record) with all packet types
- **Safety tests**: Drift detection on synthetic drift signals, rollback snapshot restore, canary mode isolation

### Dependencies

- Phase 23 (Memory) — Tier 2 extends Phase 23.5 MemoryStore; governance events feed Phase 23.4 synthesizer
- None else (governance model is self-contained)

### Unblocks

- Phase 25 (Skill Graph) — Can now use policy rails for capability constraints
- Phase 26 (Autonomous Planner) — Can now query governance context for planning decisions
- Phase 27 (Runtime Orchestrator) — Can now invoke gates/councils for execution safety
- Phase 28 (Knowledge Graph) — Can now ingest governance packets as knowledge entities
- **All downstream phases**: Phases 25+ now operate within governed autonomy framework

### Risk Mitigation

- **Risk:** Governance model is too strict (gates block everything)
  - *Mitigation:* Operator overrides always available; rail precedence allows flexibility
- **Risk:** Councils create deadlock (voting loops)
  - *Mitigation:* Unanimous block + majority permit prevents ties; require revision escalates to operator
- **Risk:** Corpus bloat from packets (infinite growth)
  - *Mitigation:* Hybrid decay with operator override; regular archival
- **Risk:** Rollback is slow/lossy
  - *Mitigation:* Snapshots are immutable; rollback is O(1); validation before restore

### Open Questions

- Should councils be per-domain, or global? *→ Decision: Start with global; per-domain as Phase 25+ refinement*
- What's the default decay age threshold? *→ Decision: 30 days, tunable per domain*
- How many council members for a vote? *→ Decision: 3–5; configurable in rail spec*

### Outcome

CIC becomes a **fully governed autonomous agent**. Every action is explicable, every decision is auditable, every execution is reversible. This is the foundation for Phases 25–28 and beyond.

**North Star Achieved:**
> "CIC becomes trustworthy by making its reasoning legible and its evolution auditable."

<!-- ARPS:PHASE_24:END -->

---

<!-- ARPS:PHASE_25:BEGIN -->
## Phase 25 — CIC Skill Graph & Cross‑System Doctrine (SGD)

**Status:** QUEUED (depends on Phase 24)

### Goal
Model CIC’s capabilities as an explicit, queryable Skill Graph and align them with Claude, Copilot, and Antigravity doctrine, enabling skill-aware routing and cross-system intelligence federation.

### Why This Phase
The Skill Graph becomes the **capability model** that answers:
- What can CIC do?
- What should CIC do?
- What does it need to learn?
- How do Claude, Copilot, and Antigravity capabilities overlap/differ?

Without SGD, Phase 26 (APR) cannot route tasks to the right agents.

### Architecture Overview
- **SGD-Spec**: Node types (skills, instincts, hooks, rules, extractors, agents), edge types (depends_on, enhances, conflicts_with, supersedes)
- **SGD-Store**: JSON + graph DB; versioned nodes with provenance
- **SGD-Harvester**: Extract skills from code, ARPS, CRO, APR, Memory
- **SGD-Synthesizer**: Generate capability summaries, detect gaps, detect redundancy
- **SGD-API**: Query endpoints for skills, capabilities, gaps
- **SGD-UI**: Graph visualization, capability heatmaps, drift overlays
- **SGD-Sync**: Align CIC skills with Claude, Copilot, Antigravity doctrine

### Deliverables

#### 25.1 — Skill Graph Schema (SGD‑Spec)
- Node types: Skill, Instinct, Hook, Rule, Extractor, Agent, Model
- Relationship types: depends_on, enhances, conflicts_with, supersedes, requires_context
- Versioning: version, created_at, deprecated_at, replacement_node_id
- Provenance: who added it, when, from what phase/context
- Confidence scoring: 0-1 confidence that this node is still accurate

#### 25.2 — Skill Graph Store (SGD‑Store)
- JSON file store: `skill_graph.json` (versioned)
- Index by: skill_id, agent_name, capability_class
- Immutable append-only audit log: `skill_graph_audit.log`
- Cross-system mappings: Claude skill → CIC skill (name, similarity_score)

#### 25.3 — Skill Harvester (SGD‑Harvester)
- Parse ARPS phase descriptions → extract capability claims
- Parse CRO task types → extract runtime capabilities
- Parse APR planner logic → extract planning capabilities
- Parse Memory events → track which capabilities were used
- Parse codebase (extractors, skills, agents) → extract implementation capabilities
- Generates: new skill nodes, updates existing nodes, marks obsolete nodes

#### 25.4 — Skill Synthesizer (SGD‑Synthesizer)
- Capability summary: group skills by class (data ingestion, reasoning, planning, execution, etc.)
- Gap detector: identify claimed capabilities with no implementation
- Redundancy detector: identify duplicate/overlapping skills
- Skill maturity: score skills by test coverage, usage frequency, error rate
- Generates: summaries, gap reports, refactoring proposals

#### 25.5 — Skill Graph API (SGD‑API)
- `GET /skills/graph` — full skill graph (optionally filtered)
- `GET /skills/capabilities` — list all capabilities grouped by class
- `GET /skills/gaps` — list capability gaps
- `GET /skills/:skill_id` — detail on single skill
- `POST /skills/mapping/claude` — Claude skill alignment status
- Response: JSON with nodes, edges, confidence scores, provenance

#### 25.6 — Skill Explorer UI (SGD‑UI)
- Graph visualization: D3/Cytoscape interactive graph
- Capability heatmap: shows capability coverage by class
- Search: find skills by name, tag, agent
- Filters: by status, confidence, agent, capability class
- Gap view: highlight missing capabilities
- Cross-system view: show Claude/Copilot/Antigravity alignment

#### 25.7 — Cross‑System Doctrine Sync (SGD‑Sync)
- Import Claude skill definitions (from Claude Code documentation)
- Import Copilot/Gemini skill definitions
- Map CIC skills → external skills (similarity scoring)
- Detect: where CIC overlaps, where it’s unique, where it’s behind
- Generate: alignment report, recommendations for code sharing

### Dependencies
- Phase 23 (Memory) — to track skill usage and evolution
- Phase 24 (Autonomous Governance) — skills operate within governed autonomy framework

### Execution Order
1. Spec (25.1) — 1 day
2. Store (25.2) — 1 day
3. Harvester (25.3) — 2 days
4. Synthesizer (25.4) — 2 days
5. API (25.5) — 1 day
6. UI (25.6) — 2 days
7. Sync (25.7) — 2 days

**Total: 11 days end-to-end**

### Success Criteria
✅ Skill Graph captures 100% of CIC’s current skills/extractors/agents
✅ Gap detector identifies at least 3 capability gaps
✅ Synthesizer produces actionable redundancy reports
✅ Graph API responds in <100ms
✅ Graph visualization loads smoothly with 100+ nodes
✅ Cross-system alignment shows >80% mapping completeness

### Outcome
CIC gains self-awareness of its own capabilities. Phase 25 can route tasks intelligently. External systems can see and coordinate with CIC’s skill set.
<!-- ARPS:PHASE_25:END -->

---

<!-- ARPS:PHASE_26:BEGIN -->
## Phase 26 — TorqueQuery: Ingestion & Search Engine (TQ)

**Status:** QUEUED (parallel to Phases 23–25, enables Phase 27+)

**Execution: 2026-06-15 through 2026-06-29 (15 days, parallel track)**

### Goal

Build a **clean-room, open-source ingestion and search engine** that serves as CIC and Rewrite Labs’ world-ingestion backbone. TorqueQuery handles crawling, scraping, parsing, indexing, and hybrid search via HTTP/GRPC APIs.

### Why This Phase

TorqueQuery is **foundational infrastructure**, not a governance/memory/planning concern:
- CIC needs deterministic world ingestion (crawl/scrape/parse/index)
- Rewrite Labs needs SMB site capture for benchmark corpus
- Both systems need hybrid search (vector + keyword)
- TorqueQuery must be public (no AGPL, clean-room design) for long-term open-sourcing
- Runs **parallel** to Memory/Governance/Skill Graph — doesn’t block them

### Architecture Overview

**Eight core subsystems:**
1. Crawler — domain crawling, sitemap parsing, robots.txt compliance
2. Scraper — Playwright JS rendering, anti-bot, screenshots
3. Mapper — URL graph, section classification, crawl planning
4. Parser — HTML/PDF/DOCX → Markdown + structured JSON
5. Proxy Layer — rotation, geo-targeting, stealth headers
6. Indexer — chunking, embeddings, pluggable backends (pgvector, Qdrant, Weaviate)
7. Search Engine — hybrid (vector + BM25), filtering, reranking
8. Actor Runtime — crawl jobs, batch scrape, periodic refresh

**API Surface:**
- HTTP: `/crawl`, `/scrape`, `/batch/scrape`, `/parse`, `/index`, `/search`
- GRPC: `TorqueCrawlerService`, `TorqueSearchService`, `TorqueIndexService`

**Integration Model:**
- CIC uses TorqueQuery via HTTP/GRPC (adapter in `packages/adapters/cic/`)
- Rewrite Labs uses TorqueQuery via HTTP/GRPC (adapter in `packages/adapters/rewritelabs/`)
- TorqueQuery remains public; CIC/Rewrite Labs remain private

### Deliverables

#### 26.1 — TorqueQuery Architecture Spec (TQ‑Spec)
- Eight subsystems documented with input/output contracts
- Repository layout: core/, api/, adapters/, infra/, examples/
- API specification (HTTP + GRPC)
- Design principles: clean-room, pluggable, deterministic, search-centric
- Output: `docs/architecture.md`

#### 26.2 — API & Integration Specs (TQ‑API)
- Complete HTTP API specification with request/response schemas
- GRPC service definitions
- CIC integration guide (adapter responsibilities, no leakage)
- Rewrite Labs integration guide (corpus building, site capture)
- Output: `docs/api.md`, `docs/cic-integration.md`, `docs/rewritelabs-integration.md`

#### 26.3 — Crawler, Scraper, Mapper Implementation (TQ‑Core1)
- Crawl domain → URL list with metadata
- Scrape URLs with Playwright + anti-bot
- Build URL graph + section map
- Test suite: 15+ tests for crawling, robots.txt, dedup, mapping
- Output: `packages/core/src/{crawler,scraper,mapper}`

#### 26.4 — Parser & Proxy Implementation (TQ‑Core2)
- HTML/PDF/DOCX → Markdown + structured JSON
- Proxy rotation, geo-targeting, stealth headers
- Content extraction quality: 95%+ markdown fidelity
- Test suite: 10+ tests for parsing, proxy rotation
- Output: `packages/core/src/{parser,proxy}`

#### 26.5 — Indexer & Search Implementation (TQ‑Core3)
- Chunking strategies (semantic, fixed-size, header-aware)
- Embedding generation (OpenAI/local)
- Multiple backend support (pgvector, Qdrant, Weaviate)
- Hybrid search: vector similarity + BM25 + reranking
- Test suite: 20+ tests for indexing, search, reranking
- Output: `packages/core/src/{indexer,search}`

#### 26.6 — Actor Runtime & HTTP/GRPC API (TQ‑API-Impl)
- Actor model: job queue, task execution, checkpoints
- HTTP API implementation (`packages/api/src/http/`)
- GRPC API implementation (`packages/api/src/grpc/`)
- Job status tracking, logging, observability
- Test suite: 15+ tests for APIs, job lifecycle
- Output: `packages/api/src`, `packages/core/src/actors/`

#### 26.7 — CIC & Rewrite Labs Adapters (TQ‑Adapters)
- CIC adapter: wraps `/search` + `/index` for CIC internal API
- Rewrite Labs adapter: corpus building, site capture, benchmark search
- Integration tests: verify both adapters work end-to-end
- Output: `packages/adapters/cic/`, `packages/adapters/rewritelabs/`

#### 26.8 — Infra, Examples, Docs (TQ‑Infra)
- Docker Compose for local development
- Kubernetes manifests for deployment
- Example projects: basic crawl, CIC agent search, Rewrite Labs ingest
- README with overview and quick-start
- CONTRIBUTING guide for open-source adoption
- Output: `infra/`, `examples/`, `README.md`, `CONTRIBUTING.md`

### Execution Order (Parallelizable)

1. **26.1 — Architecture Spec** (2 days)
   - Design all 8 subsystems, API surface, integration model
   - Output: `docs/architecture.md`

2. **26.2 — API & Integration Specs** (1 day)
   - Full API spec + integration guides
   - Can run **in parallel with 26.1** once architecture drafted
   - Output: `docs/api.md`, `docs/*-integration.md`

3. **26.3–26.5 — Core Implementation** (6 days)
   - Subsystems 1–7 (Crawler → Search)
   - Can run **in parallel**: 26.3 (C/S/M), 26.4 (P/Proxy), 26.5 (I/S)
   - Output: all core subsystems with tests

4. **26.6 — Actor Runtime & APIs** (3 days)
   - Job orchestration, HTTP/GRPC endpoints
   - Depends on 26.3–26.5 (core ready)
   - Output: API layer, actor runtime

5. **26.7 — Adapters** (2 days)
   - CIC + Rewrite Labs integration
   - Depends on 26.6 (APIs ready)
   - Output: adapter packages

6. **26.8 — Infra & Docs** (2 days)
   - Docker, Kubernetes, examples, README
   - Can run **in parallel with 26.7**
   - Output: deployment + open-source materials

**Total: 15 days end-to-end** (sequential: 26.1 → 26.2 → 26.3–26.5 → 26.6 → 26.7 + 26.8)

### Success Criteria

✅ All 8 subsystems implemented and tested  
✅ HTTP API handles `/crawl`, `/scrape`, `/batch/scrape`, `/parse`, `/index`, `/search`  
✅ GRPC services available and callable  
✅ Parser achieves 95%+ markdown extraction fidelity  
✅ Indexer supports 3+ vector backends (pgvector, Qdrant, Weaviate)  
✅ Search returns results in <500ms for 100K+ docs  
✅ CIC adapter enables CIC agents to search world knowledge deterministically  
✅ Rewrite Labs adapter can ingest 18/20 SMB benchmark repos without error  
✅ Example projects run end-to-end without manual intervention  
✅ Open-source repo is well-documented and community-ready  

### Testing Strategy

- **Unit tests**: Subsystem isolation (crawler, scraper, parser, indexer, search)
- **Integration tests**: Full pipeline (crawl → scrape → parse → index → search)
- **Adapter tests**: CIC adapter + Rewrite Labs adapter end-to-end
- **API tests**: HTTP and GRPC endpoints with realistic payloads
- **Benchmark tests**: latency/throughput for search over 100K docs

### Dependencies

- None (TorqueQuery is self-contained, parallel track)

### Unblocks

- Phase 27 (Autonomous Planner) — can now use hybrid search for planning context
- Phase 28 (Runtime Orchestrator) — can now delegate scraping/indexing work
- Phase 29 (Knowledge Graph) — can now ingest structured world knowledge
- CIC agents — can search world knowledge deterministically
- Rewrite Labs — can ingest and analyze SMB codebases at scale

### Risk Mitigation

- **Risk:** Scraping gets blocked (anti-bot detection)
  - *Mitigation:* Proxy rotation, stealth headers, session isolation
- **Risk:** Parser loses semantic meaning in HTML→Markdown conversion
  - *Mitigation:* Structured JSON output + Markdown; use DOM traversal for semantic preservation
- **Risk:** Search latency unacceptable for real-time use
  - *Mitigation:* Caching layer, query optimization, async indexing
- **Risk:** Integrations with CIC/Rewrite Labs are tightly coupled
  - *Mitigation:* Adapters are thin wrappers; TorqueQuery has no knowledge of CIC/RL internals

### Open Questions

- Which vector backend for production? *→ Decision: Start with Qdrant; support pgvector/Weaviate as pluggable alternatives*
- How to handle scaling beyond single machine? *→ Decision: Actor model enables distributed job queues; upgrade to Kubernetes scaling in Phase 28*
- Open-source license? *→ Decision: MIT (permissive, no GPL bleed)*

### Outcome

TorqueQuery becomes the **long-term world-ingestion backbone** for CIC and Rewrite Labs. Runs in parallel to Memory/Governance/Skill Graph phases; unblocks Phase 27+ for agent-driven expansion and autonomous redesign discovery.

**Unique property:** TorqueQuery is **the only public, open-source component** of CIC’s ecosystem. This enables future community contributions, cleanroom licensing, and standalone adoption.

<!-- ARPS:PHASE_26:END -->

---

<!-- ARPS:PHASE_27:BEGIN -->
## Phase 27 — Autonomous Planner & Multi‑Agent Reasoning (APR)

**Status:** QUEUED (depends on Phase 24, 25)

### Goal
Enable CIC to plan its own work, allocate tasks to agents intelligently, detect missing capabilities, and run multi-agent reasoning loops using ARPS, Memory, and Skill Graph.

### Why This Phase
APR is the first system that:
- **Generates its own tasks** (not pre-defined in code)
- **Allocates work to agents** (using Skill Graph)
- **Detects missing capabilities** (using gap reports from SGD)
- **Runs multi-agent reasoning** (parallel agent calls with consensus)
- **Plans ahead** (using Memory for historical task success rates)

This is where CIC stops being a **reactor** and becomes a **planner**.

### Architecture Overview
- **APR-Spec**: Planning model (tasks, dependencies, preconditions, outputs, risk levels)
- **APR-Planner**: Convert goals → plans → tasks
- **APR-Loop**: Parallel agent calls, consensus routines, drift-aware reasoning
- **APR-Routing**: Route tasks to agents using Skill Graph
- **APR-API**: Control-plane endpoints for plan generation and task allocation
- **APR-UI**: Planner Console with plan graphs and task timelines
- **APR-Integration**: Wire into ARPS, Memory, Skill Graph

### Deliverables

#### 26.1 — Planning Model & Data Shapes (APR‑Spec)
- Task schema: id, name, description, dependencies, preconditions, expected_outputs, risk_level, estimated_effort
- Plan schema: goal, tasks[], task_order[], parallelizable_groups, estimated_duration, risk_assessment
- Agent routing: task_type → agent_class mapping

#### 26.2 — Autonomous Planner Engine (APR‑Planner)
- Goal parser: accept natural language goals or structured requests
- Plan generator: decompose goal into DAG of tasks
- Dependency analyzer: detect critical path, parallelizable work
- Risk assessor: flag high-risk tasks, suggest mitigation
- Produces: executable plan JSON with ordering

#### 26.3 — Multi‑Agent Reasoning Loop (APR‑Loop)
- Agent launcher: spawn agents for parallelizable tasks
- Consensus engine: gather outputs from multiple agents, vote/merge results
- Drift detector: flag agent outputs that deviate from expected
- Fallback logic: if consensus fails, escalate to operator

#### 26.4 — Task Allocation & Agent Routing (APR‑Routing)
- Skill Graph query: lookup agents capable of task_type
- History lookup: query Memory for success rates of each agent on similar tasks
- Cost scoring: prefer faster/cheaper agents when skill levels are equal
- Produces: ordered list of candidate agents with confidence scores

#### 26.5 — APR Control‑Plane API (APR‑API)
- `POST /planning/generate` — submit goal, get back plan
- `GET /planning/plan/:plan_id` — retrieve plan details
- `POST /planning/execute/:plan_id` — trigger plan execution
- `GET /planning/status/:plan_id` — check execution status

#### 26.6 — APR UI: Planner Console (APR‑UI)
- Plan graph visualization: DAG of tasks with dependencies
- Task timeline: estimated duration per task
- Agent routing view: show which agents assigned to each task
- Plan diff: compare alternate plans side-by-side

#### 26.7 — APR Integration with ARPS, Memory, Skill Graph (APR‑Integration)
- ARPS: APR generates prompt-evolution goals → ARPS synthesizes proposals
- Memory: APR reads task history → biases toward historically successful agents
- Skill Graph: APR queries capabilities → routes tasks to appropriate agents

### Dependencies
- Phase 23 (Memory) — for historical task success rates
- Phase 24 (Autonomous Governance) — for governed planning decisions
- Phase 25 (Skill Graph) — for capability routing

### Execution Order
1. Spec (26.1) — 1 day
2. Planner (26.2) — 2 days
3. Loop (26.3) — 2 days
4. Routing (26.4) — 1 day
5. API (26.5) — 1 day
6. UI (26.6) — 2 days
7. Integration (26.7) — 2 days

**Total: 11 days end-to-end**

### Success Criteria
✅ Planner decomposes complex goals into executable task DAGs
✅ Multi-agent loop achieves >95% consensus on task outputs
✅ Skill Graph routing assigns tasks to capable agents with >90% accuracy
✅ Memory-aware routing shows measurably faster task completion
✅ Planner Console visualizes plans smoothly with 50+ tasks

### Outcome
CIC generates its own work plans and intelligently allocates tasks to agents. This unlocks Phase 26 (execution) and Phase 27 (unified knowledge).
<!-- ARPS:PHASE_25:END -->

---

<!-- ARPS:PHASE_27:BEGIN -->
## Phase 27 — CIC Runtime Orchestrator (CRO)

**Status:** QUEUED (depends on Phase 26)

### Goal
Execute APR-generated plans in a robust, observable multi-agent runtime with parallelism, failure recovery, and operator visibility.

### Why This Phase
APR can plan — CRO is what **executes**.

CRO is the execution engine that:
- **Runs tasks** (from APR plans)
- **Schedules agents** (parallel when possible)
- **Handles failures** (retry, escalation, rollback)
- **Provides telemetry** (logs, metrics, traces)
- **Powers long-running flows** (resumable, checkpointed)

APR + CRO together = CIC becomes a real multi-agent system, not a conceptual one.

### Architecture Overview
- **CRO-Spec**: Execution model (runs, steps, checkpoints, failures, retries)
- **CRO-Executor**: Execute tasks, manage parallelism, resource allocation
- **CRO-Runner**: Launch agents, monitor health, capture telemetry
- **CRO-Supervisor**: Detect failures, retry logic, rollback logic
- **CRO-API**: Control-plane endpoints for execution management
- **CRO-UI**: Execution Console with live run view, logs, metrics
- **CRO-Integration**: Wire into APR, Memory, Skill Graph

### Deliverables

#### 27.1 — Execution Model & Data Shapes (CRO‑Spec)
- Run schema: id, plan_id, status (queued/running/completed/failed), start_time, end_time
- Step schema: id, task_id, status, agent_assigned, output, error, retry_count, duration_ms
- Checkpoint schema: step_id, state_snapshot, timestamp (for resumable execution)
- Failure schema: step_id, error_type, error_message, recovery_action

#### 27.2 — Runtime Executor (CRO‑Executor)
- Task queue management: ingest plan, enqueue steps respecting dependencies
- Parallelism controller: launch independent tasks in parallel
- Resource allocator: assign CPU/memory to agents based on task needs
- State machine: manage transitions (queued → running → completed/failed)

#### 27.3 — Agent Runner (CRO‑Runner)
- Agent launcher: spawn agent processes
- Health monitor: watch agent resource usage, responsiveness
- Output collector: capture agent logs, artifacts, metrics
- Signal handler: graceful shutdown, timeout enforcement

#### 27.4 — Agent Supervisor (CRO‑Supervisor)
- Failure detector: monitor agent outputs for errors
- Retry logic: exponential backoff, max retry count
- Rollback logic: undo failed task side-effects
- Escalation: flag persistent failures for operator review

#### 27.5 — CRO Control‑Plane API (CRO‑API)
- `POST /runs` — submit plan for execution
- `GET /runs/:run_id` — get run status
- `GET /runs/:run_id/steps` — list all steps in run
- `POST /runs/:run_id/pause` — pause execution
- `POST /runs/:run_id/resume` — resume from checkpoint
- `POST /runs/:run_id/cancel` — abort execution

#### 27.6 — Execution Console UI (CRO‑UI)
- Live run view: DAG of executing steps with status
- Logs panel: tail logs from active agents
- Metrics dashboard: throughput, latency, error rates
- Drift overlays: show Memory-detected drift signals
- Failure inspector: drill into failed steps, suggest remediation

#### 27.7 — CRO Integration & Safety
- APR integration: CRO consumes APR plans
- Memory integration: CRO logs all runs to Memory
- Skill Graph integration: CRO tracks which agents executed which task types
- Safety gates: refuse to execute tasks that would violate constraints

### Dependencies
- Phase 24 (Autonomous Governance) — for execution safety gates
- Phase 26 (APR) — CRO consumes APR plans

### Execution Order
1. Spec (27.1) — 1 day
2. Executor (27.2) — 2 days
3. Runner (27.3) — 2 days
4. Supervisor (27.4) — 2 days
5. API (27.5) — 1 day
6. UI (27.6) — 2 days
7. Integration & Safety (27.7) — 2 days

**Total: 12 days end-to-end**

### Success Criteria
✅ CRO executes 100% of APR-generated plans without manual intervention
✅ Parallel execution shows >50% speedup vs. sequential
✅ Failure recovery succeeds on >95% of transient errors
✅ Execution Console shows live status with <1s latency
✅ Memory captures all executions with >99% data integrity

### Outcome
CIC executes multi-agent plans reliably and observably. This unlocks Phase 27 (unified knowledge integration).
<!-- ARPS:PHASE_26:END -->

---

<!-- ARPS:PHASE_28:BEGIN -->
## Phase 28 — CIC Knowledge Graph (CKG)

**Status:** QUEUED (depends on Phase 23, 24, 25, 26, 27)

### Goal
Unify Memory events, Skill Graph, APR planning episodes, CRO execution episodes, and ARPS deltas into a single semantic Knowledge Graph that powers reasoning, drift detection, planning, and cross-system intelligence.

### Why This Phase (Final Pillar)
CKG is the **world model** that ties everything together:
- Merges Memory (what happened) + Skill Graph (what we can do) + APR plans (what we’re planning) + CRO runs (what we did) + ARPS deltas (how we evolved)
- Enables **reasoning**: relationships between entities, causality, temporal flows
- Enables **drift detection**: patterns across knowledge layers
- Enables **planning**: historical context for task decomposition
- Enables **evolution**: identify where the system is getting stuck or succeeding

This is the **semantic substrate** that powers autonomous operation.

### Architecture Overview
- **CKG-Spec**: Entity types (Task, Agent, Skill, Memory Event, Plan, Run, Document), relationship types
- **CKG-Store**: Graph database (or JSON + indexes), versioned, immutable audit trail
- **CKG-Harvester**: Pull from Memory, Skill Graph, APR, CRO, ARPS
- **CKG-Synthesizer**: Distill knowledge, detect contradictions, detect drift, generate summaries
- **CKG-API**: Query endpoints for reasoning agents
- **CKG-UI**: Knowledge Explorer (graph visualization, entity timelines, drift overlays)
- **CKG-Integration**: Wire into APR/CRO planning and Memory synthesis

### Deliverables

#### 28.1 — CKG Schema (CKG‑Spec)
- Node types: Task, Agent, Skill, Plan, Run, MemoryEvent, Document, Goal, Constraint
- Relationship types: executes, uses_skill, depends_on, produces, references, violates, achieves
- Versioning: version, created_at, deprecated_at
- Provenance: source_system (memory/skill_graph/apr/cro/arps), source_id

#### 28.2 — CKG Store (CKG‑Store)
- Graph database backend: Neo4j or equivalent (or JSON + graph indices)
- Versioned nodes: track historical state of all entities
- Immutable audit trail: every mutation logged with timestamp, agent, reason
- Efficient queries: index by entity type, relationship type, temporal range

#### 28.3 — CKG Harvester (CKG‑Harvester)
- Memory harvester: convert Memory events to CKG nodes
- Skill Graph harvester: import skill nodes and relationships
- APR harvester: create Plan nodes and task decomposition relationships
- CRO harvester: create Run nodes and execution traces
- ARPS harvester: create delta nodes and prompt evolution relationships
- Deduplication: merge equivalent entities from different sources

#### 28.4 — CKG Synthesizer (CKG‑Synthesizer)
- Knowledge distillation: identify core patterns, remove noise
- Contradiction detection: flag conflicting assertions
- Drift detection: identify divergence from expected patterns
- Temporal analysis: construct causal chains and timelines
- Similarity scoring: measure entity similarity for clustering

#### 28.5 — CKG API (CKG‑API)
- `GET /ckg/query` — SPARQL-like query language
- `GET /ckg/entities/:entity_type` — list entities of type
- `GET /ckg/entity/:id` — single entity details
- `GET /ckg/relations/:rel_type` — list relationships of type
- `GET /ckg/path/:from_id/:to_id` — shortest path between entities
- `GET /ckg/insights` — high-level summaries and patterns

#### 28.6 — Knowledge Explorer UI (CKG‑UI)
- Graph visualization: interactive D3/Cytoscape network
- Entity timelines: show entity evolution over time
- Relationship browser: explore relationships and weights
- Drift overlays: show where drift signals appear in graph
- Insight cards: high-level knowledge summaries
- Temporal slider: replay graph evolution over time

#### 28.7 — CKG Integration with APR, CRO, Memory, Skill Graph (CKG‑Integration)
- APR integration: query CKG for historical task success patterns to bias planning
- CRO integration: log all executions to CKG; use CKG signals for failure recovery
- Memory integration: CKG synthesis produces Memory summaries
- Skill Graph integration: CKG tracks skill usage and evolution
- Cross-system reasoning: enable agents to reason over unified knowledge

### Dependencies
- Phase 23 (Memory) — for event source material
- Phase 24 (Autonomous Governance) — for governance packet source material
- Phase 25 (Skill Graph) — for capability source material
- Phase 26 (APR) — for planning episodes
- Phase 27 (CRO) — for execution episodes

### Execution Order
1. Spec (28.1) — 1 day
2. Store (28.2) — 2 days
3. Harvester (28.3) — 3 days (can run in parallel with 28.2)
4. Synthesizer (28.4) — 2 days
5. API (28.5) — 1 day
6. UI (28.6) — 2 days
7. Integration (28.7) — 2 days

**Total: 13 days end-to-end**

### Success Criteria
✅ CKG captures 100% of Memory events, Skill Graph nodes, APR plans, CRO runs, ARPS deltas
✅ Query latency <500ms for typical reasoning queries
✅ Synthesizer detects contradictions with >90% precision
✅ Knowledge Explorer visualizes graphs with 500+ nodes smoothly
✅ Cross-layer reasoning (APR uses CKG insights) measurably improves plan quality

### Outcome
CIC has a unified semantic world model. This completes the **minimum viable stack** for full autonomy: Memory (what happened) → Skill Graph (what we can do) → APR (what we plan) → CRO (what we execute) → CKG (how it all fits together).

Everything after Phase 27 is optimization, specialization, and expansion.
<!-- ARPS:PHASE_28:END -->

---

<!-- ARPS:PHASE_28A:BEGIN -->
## Phase 28a — Skill Contribution Pipeline (SCP)

**Status:** DESIGN SPEC (2026-06-11)

**Execution:** Parallel to Phase 28–29, start 2026-06-18  
**Timeline:** 15 days (MVP + hardening)

### Goal

Establish automated feedback loop for skill improvements: detect local changes to adopted skills, generate upstream PRs, track acceptance, notify contributor. Transforms local improvements into community contributions.

### Why This Phase

Skills adopted into CIC improve constantly:
- Bug fixes, performance optimizations, test additions, error handling
- Currently: improvements stay local, upstream creators miss value
- Goal: automatic pipeline turns local wins into upstream wins

### Architecture Overview

**Five core subsystems:**
1. **Skills Manifest** — track adopted skills, source repos, versions
2. **Change Detection** — diff local vs upstream, periodic or on-demand
3. **Contribution Agent** — generate PR title/description, create GitHub PR
4. **Status Tracker** — poll GitHub API, track PR acceptance/rejection
5. **Notification Engine** — Slack/Teams/SMS alerts for submission, merge, close, stale

### Deliverables

#### 28a.1 — SCP Architecture Spec (SCP‑Spec)
- Skills manifest schema (`~/.claude/skills/manifest.json`)
- Change detection algorithm
- Contribution agent design (PR generation, GitHub integration)
- Status tracking model
- Notification routing
- Output: `docs/SKILL-CONTRIBUTION-PIPELINE.md`

#### 28a.2 — Skills Manifest & CLI (SCP‑Manifest)
- Manifest schema: skill_id, localPath, sourceRepo, modifications, lastSyncCommit
- CLI commands: `/skill-manifest register`, `/skill-manifest list`, `/skill-manifest check-upstream`
- Auto-detection of modifications by git diff
- Output: `~/.claude/skills/manifest.json`, CLI agent

#### 28a.3 — Change Detection Agent (SCP‑Detector)
- Clone/fetch upstream repos (GitHub MVP)
- Git diff: upstream HEAD vs local
- Classify diffs: perf-optimization, bug-fix, feature, test-coverage, error-handling
- Report: 1-line summary per skill with change count
- Output: Diff detector agent

#### 28a.4 — Contribution Agent (SCP‑Contributor)
- Auto-generate PR title + description from diff + metadata
- Create GitHub branch (`contrib/skill-{name}-{date}`)
- Commit diff with standardized message format
- Create GitHub PR via API
- Store PR metadata locally
- Output: Contribution creation agent

#### 28a.5 — Status Tracker (SCP‑Tracker)
- Poll GitHub API daily for PR status (open/merged/closed)
- Store metadata: PR URL, status, creation date, last checked, author
- Detect stale PRs (>30 days no activity)
- Log closure reasons if available
- Output: `~/.claude/skills/contributions/{skill-id}-{pr-number}.json`, status tracker

#### 28a.6 — Notification Engine (SCP‑Notifier)
- Slack channel: submitted, merged, closed, stale alerts
- Teams integration (Phase 2)
- SMS/iMessage via Twilio (Phase 2)
- Alert templates with PR URL, change summary, suggested action
- Output: Notification dispatcher

#### 28a.7 — SCP Integration & Automation (SCP‑Ops)
- Cron scheduling: daily diff checks, status polling
- Authentication: GitHub token storage in secrets manager
- Error handling: repo unavailable, auth failures, network issues
- Initial skill registration: fewer-permission-prompts, improvement-analysis
- Output: Operational setup, initial registrations

### Dependencies
- GitHub API access (OAuth or token)
- Manifest directory: `~/.claude/skills/`
- Slack workspace (MVP notification)

### Execution Order
1. Spec (28a.1) — 1 day [DONE]
2. Manifest + CLI (28a.2) — 2 days
3. Detector (28a.3) — 2 days
4. Contributor (28a.4) — 2 days
5. Tracker (28a.5) — 1 day
6. Notifier (28a.6) — 2 days
7. Integration & Ops (28a.7) — 3 days

**Total: 13 days end-to-end**

### Phase 2 Enhancements (Deferred)
- [ ] Multi-repo hosts: GitLab, Gitea, Codeberg
- [ ] Valuation heuristics: flag >200 LOC or major features for licensing negotiation
- [ ] CLA/license detection: auto-handle contributor agreements
- [ ] SMS/iMessage: Twilio integration for premium alerts
- [ ] Quality gates: require tests, coverage %, perf benchmarks before PR
- [ ] Analytics: acceptance rate per repo, feedback patterns, trending topics

### Success Criteria
✅ MVP deployed by 2026-07-01
✅ 2+ skills registered and monitored
✅ At least 1 successful upstream PR merged from local improvement
✅ Slack notifications working (submit → status → merge)
✅ Zero credential leaks (secure token storage)
✅ Status polling running daily, no manual intervention needed

### Outcome
CIC contributors' improvements automatically flow upstream. Open source ecosystem benefits from CIC's refinements. Feedback loop strengthens both CIC and upstream projects.

**Reference:** See `docs/SKILL-CONTRIBUTION-PIPELINE.md` for full specification.
<!-- ARPS:PHASE_28A:END -->

---

<!-- ARPS:PHASE_29:BEGIN -->
## Phase 29 — Knowledge Distillation Engine (KDE)

### Goal
Compress, summarize, and restructure CIC’s Knowledge Graph (CKG) into higher‑order abstractions to prevent graph bloat, remove stale nodes, and produce distilled knowledge artifacts.

### Milestones
- 29.1 — KDE Schema (KDE‑Spec)
- 29.2 — KDE Store (KDE‑Store)
- 29.3 — KDE Harvester (KDE‑Harvester)
- 29.4 — KDE Synthesizer (KDE‑Synthesizer)
- 29.5 — KDE API (KDE‑API)
- 29.6 — Distillation Console UI (KDE‑UI)
- 29.7 — KDE Integration with APR, CRO, CKG (KDE‑Integration)
<!-- ARPS:PHASE_29:END -->

---

<!-- ARPS:PHASE_30:BEGIN -->
## Phase 30 — Rewrite Labs ↔ CIC Fusion Layer (RLF)

### Goal
Integrate CIC’s autonomous planning and execution with the Rewrite Labs redesign pipeline, enabling automated redesign target discovery, outreach, and conversion tracking.

### Milestones
- 30.1 — Fusion Schema (RLF‑Spec)
- 30.2 — Fusion Harvester (RLF‑Harvester)
- 30.3 — Redesign Planner (RLF‑Planner)
- 30.4 — Redesign Executor (RLF‑Executor)
- 30.5 — Fusion API (RLF‑API)
- 30.6 — Fusion Console UI (RLF‑UI)
- 30.7 — Fusion Integration (RLF‑Integration)
<!-- ARPS:PHASE_30:END -->

---

<!-- ARPS:PHASE_31:BEGIN -->
## Phase 31 — Meta‑Evolution Engine (MEE)
- 31.1 — MEE Schema
- 31.2 — MEE Trigger Engine
- 31.3 — MEE Phase Generator
- 31.4 — MEE Patch Synthesizer
- 31.5 — MEE Validator
- 31.6 — MEE API
- 31.7 — MEE UI
- 31.8 — MEE Integration
<!-- ARPS:PHASE_31:END -->

---

# **🌐 CIC × ECC Adoption Roadmap (Full Program)**  
### *From deterministic pipelines → governed evolution → multi‑region intelligence network*

---

# **PHASE 0 — Foundations (Complete)**  
**Goal:** Establish CIC’s deterministic substrate.

✔ Deterministic extractor chain  
✔ Schema‑gated pipeline  
✔ Drift Engine v1  
✔ Arbitration Workflow  
✔ Observability Dashboard v1  
✔ Region context + tenant isolation  
✔ MCP‑native runtime  
✔ Daily Digest Subsystem (collector, synthesizer, writer, consumer)  

**ECC Parallels:**  
- Hooks → Arbitration  
- Skills → Extractors  
- Memory → Drift clusters  
- Dashboard → CIC Observability  

**Status:** Fully complete. CIC is a stable, deterministic base.

---

# **PHASE 1 — ECC Surface Adoption (Complete)**  
**Goal:** Introduce ECC‑style ergonomics without changing CIC semantics.

✔ Skill spec (`cic.skill.v1.yaml`)  
✔ Instinct spec (`cic.instinct.v1.yaml`)  
✔ Hook spec (`cic.hook.v1.yaml`)  
✔ Rule spec (`cic.rule.v1.yaml`)  
✔ Spec registry + loader  
✔ Extractors wrapped as Skills  
✔ Hooks + Rules exposed as first‑class surfaces  

**ECC Parallels:**  
- Skills = ECC Skills  
- Instincts = ECC Instincts  
- Hooks = ECC Hooks  
- Rules = ECC Rules  

**Status:** Fully complete. CIC now has ECC‑style surfaces.

---

# **PHASE 2 — Telemetry & Self‑Reflection (Complete)**  
**Goal:** Give CIC a nervous system.

### **2.0 Telemetry Core**  
✔ Skill telemetry  
✔ Instinct telemetry  
✔ Sink + stores  
✔ API endpoints  
✔ Dashboard panels

### **2.1 Violations + Proposals**  
✔ Rule violation logs  
✔ Heatmap endpoint  
✔ Instinct proposer v1 (A/B)

### **2.2 Closed‑Loop Impact**  
✔ Post‑run enrichment  
✔ Drift/latency/success deltas  
✔ Weighted impactScore  
✔ Proposal metadata  
✔ Hybrid tests

**ECC Parallels:**  
- ECC’s “instinct evolution”  
- ECC’s “agent performance surfaces”  

**Status:** Fully complete. CIC now *knows* what it did and how well it worked.

---

# **PHASE 3 — Governed Evolution (In Progress)**  
**Goal:** CIC becomes a self‑optimizing system under operator control.

---

## **3.0 Instinct Lifecycle (Complete)**  
**Purpose:** Turn proposals into governed evolution.

### Deliverables  
- `instinct-patches/` directory  
- Patch statuses: `proposed → canary → active → rejected`  
- Scoped canaries (region/tenant)  
- Promotion criteria (impactScore, SLO, violations)  
- Control plane routes  
- Dashboard lifecycle panels  
- Canary evaluator  

**Outcome:** CIC can evolve safely, with operator‑controlled rollouts.

---

## **3.1 Skill SLO Engine (Next)**  
**Purpose:** Give CIC operational guardrails.

### Deliverables  
- SLO fields in skill spec  
- Rolling p95 latency + error rate  
- SLO violation events  
- `/v1/telemetry/slo/violations`  
- Dashboard SLO overlays  
- SLO‑aware instinct promotion  

**Outcome:** CIC becomes production‑grade: skills degrade → CIC reacts.

---

## **3.2 Drift‑Aware Evolution Engine**  
**Purpose:** Make drift a first‑class optimization signal.

### Deliverables  
- Drift baselines per pipeline/stage  
- Drift pressure score  
- Drift‑aware proposer  
- Drift pressure heatmap  
- Drift‑impact overlays  

**Outcome:** CIC becomes stable under noisy inputs and long‑running workloads.

---

# **PHASE 4 — Multi‑Region Collective Intelligence**  
**Goal:** CIC becomes a distributed, self‑optimizing intelligence network.

---

## **4.0 Region‑Scoped Evolution**  
- Region‑local instinct variants  
- Divergence detection  
- Cross‑region arbitration  
- Region‑specific baselines  
- Region‑aware proposer  

**Outcome:** CIC evolves differently in different regions based on local data.

---

## **4.1 Multi‑Region Consensus Layer**  
- Consensus on instinct promotion  
- Region quorum rules  
- Conflict resolution  
- Global vs local instincts  

**Outcome:** CIC becomes a federated intelligence system.

---

## **4.2 Collective Intelligence Layer**  
- Instinct sharing across regions  
- Skill performance exchange  
- Drift‑corrective feedback loops  
- Cross‑region learning  

**Outcome:** CIC becomes a global, distributed intelligence organism.

---

## **4.3 CodeBurn ↔ TokenEconomyAgent Integration (Cost Optimization)**
**Goal:** Unify real-time token governance with historical observability via CodeBurn integration.

**Status:** PLANNED (2026-06-07)

### Deliverables
- Telemetry schema for CIC + Rewrite Labs (YAML specs)
- Telemetry emitters in TokenEconomyAgent routing layer
- CodeBurn provider plugin for CIC telemetry ingestion
- Routing rule updater consuming CodeBurn cost/yield exports
- CLI entrypoint for batch integration runs (cic-cli run-abb)

### Why This Phase
Real-time token governance (TokenEconomyAgent) requires **historical observability** to:
- Detect which models/agents are cost-inefficient
- Identify retry hotspots and high-failure stages
- Update routing rules based on actual spend patterns
- Achieve >=40% token cost reduction per successful redesign

CodeBurn provides the historical view; TokenEconomyAgent provides the real-time enforcement.

### Dependencies
- TokenEconomyAgent v2
- CIC Telemetry Bus
- CodeBurn >= 0.3.x

### Success Metrics
- ✅ All CIC pipelines emit telemetry to CodeBurn
- ✅ CodeBurn dashboards show per-model, per-agent cost breakdowns
- ✅ Routing rules auto-update based on CodeBurn insights
- ✅ >=40% reduction in average token cost per successful redesign
- ✅ Retry rate reduced by >=25% on Harvester + Redesign agents

### Execution Timeline
- 2026-06-07: Spec finalization (telemetry schemas)
- 2026-06-08: Emitter implementation
- 2026-06-09: CodeBurn provider plugin
- 2026-06-10: Feedback loop + CLI wiring
- 2026-06-11: Testing + validation
- 2026-06-14: Production rollout

**Outcome:** CIC achieves full cost visibility and automatic cost optimization across all regions.

---

## **4.4 Repomix Integration for Repo Ingestion (Operator-Grade Tooling)**
**Goal:** Establish deterministic, token-aware repository ingestion for Rewrite Labs Harvester and CIC external repo analysis.

**Status:** PLANNED (2026-06-07 through 2026-06-14)

### Rationale
Rewrite Labs Harvester requires structured, compressed repository data (JSON) to:
- Ingest SMB codebases for redesign analysis
- Extract repository structure and complexity metrics
- Account for token cost across large repos
- Enable deterministic, reproducible redesign proposals

Repomix provides:
- **JSON output** → native integration with Harvester pipeline
- **Compression via Tree-sitter** → structural extraction (functions, classes, interfaces)
- **Token accounting** → predictable LLM cost modeling
- **Deterministic ordering** → reproducible redesign decisions
- **Secret detection** → compliance guardrails

### Deliverables

#### 4.4.1 — Repomix Installation & CLI Presets
- Install Repomix as NPM dependency in rewrite-mcp
- Define operator-grade command presets:
  ```bash
  repomix --remote user/repo --json --compress --token-count --secretlint
  repomix --local ./repo-path --json --compress --token-count --secretlint --verbose
  repomix --remote user/repo --json --compress --token-count --secretlint --output ./output.json
  ```
- Configure `.repomixignore` for filtering (node_modules, build artifacts, etc.)

#### 4.4.2 — Rewrite Labs Harvester Integration
- Wire Repomix JSON output → Harvester Discovery phase
- Implement `RepositoryIngestion` module that:
  - Accepts remote or local repo paths
  - Invokes Repomix with deterministic flags
  - Parses JSON output (structure, tokens, secrets)
  - Feeds structured data into Redesign phase
- Token accounting: store per-file metrics for cost prediction

#### 4.4.3 — CIC Bridge for Third-Party Repo Analysis
- Design `RepoAnalysisBridge` that converts Repomix JSON → CIC data structures
- Enable CIC extractors to ingest non-CIC repositories:
  - Extract repo archetypes (framework, language, architecture)
  - Feed into Knowledge Graph for pattern recognition
  - Support CIC's autonomous expansion verdicts on external code
- Implement `/cic/repos/analyze` REST endpoint accepting remote/local repos

#### 4.4.4 — Token & Cost Telemetry
- Integrate Repomix token counts into CodeBurn telemetry pipeline
- Track repo ingestion cost per tenant (Rewrite Labs)
- Feed cost signals into TokenEconomyAgent for routing optimization

#### 4.4.5 — Security & Compliance
- Secretlint integration: flag leaked credentials before ingestion
- Audit trail: log all remote repo accesses with timestamps and operators
- Sandbox: run Repomix in isolated container to prevent execution escape

#### 4.4.6 — Testing & Validation
- Unit tests: Repomix output parsing, token validation, secret detection
- E2E tests: ingest 5 test repos (varying sizes/frameworks), verify structure extraction
- Benchmark: compare token cost vs. raw file concatenation (expect 30–50% reduction via compression)
- Validation: confirm deterministic output across 10 runs of same repo

### Dependencies
- Repomix (npm package)
- Phase 4.3 (CodeBurn integration for telemetry)
- Rewrite Labs Harvester codebase

### Success Metrics
- ✅ Repomix JSON ingestion works for 18/20 SMB benchmark repos
- ✅ Token savings: 30–50% reduction vs. raw concatenation
- ✅ Deterministic output: identical JSON across multiple runs
- ✅ Secret detection: 100% on standard test corpus
- ✅ CIC bridge: successfully ingest 3 external repos into Knowledge Graph
- ✅ Cost telemetry: per-repo ingestion cost visible in CodeBurn dashboards
- ✅ Compliance: zero credential leaks in audited logs

### Execution Timeline
- **2026-06-07:** Install, presets, `.repomixignore` configuration
- **2026-06-08:** Rewrite Labs Harvester integration (RepositoryIngestion module)
- **2026-06-09:** CIC bridge design + `/cic/repos/analyze` endpoint
- **2026-06-10:** Token telemetry + CodeBurn wiring
- **2026-06-11:** Security integration (Secretlint, audit trails)
- **2026-06-12–13:** Testing, validation, benchmarking
- **2026-06-14:** Production rollout, operator handoff

### Outcome
Rewrite Labs can ingest any repository deterministically and cost-predictably. CIC gains the ability to analyze external codebases for knowledge graph enrichment.

---

# **PHASE 5 — Autonomous Optimization (Future)**  
**Goal:** CIC optimizes itself continuously with operator‑visible guardrails.

- Auto‑canary  
- Auto‑promotion  
- Auto‑rollback  
- Auto‑patch generation  
- Self‑tuning pipelines  
- Self‑balancing drift  
- Self‑healing SLO breaches  

**Outcome:** CIC becomes a self‑maintaining system with human‑in‑the-loop governance.

---

# **PHASE 6 — CIC × ECC Convergence (Long‑term)**  
**Goal:** CIC becomes the operator‑grade, multi‑region, deterministic version of ECC.

- ECC‑style agent ergonomics  
- CIC‑grade determinism  
- ECC‑style skill evolution  
- CIC‑grade safety  
- ECC‑style developer UX  
- CIC‑grade multi‑region runtime  

**Outcome:** CIC surpasses ECC as the world’s most advanced operator‑grade intelligence substrate.

---

# **PHASE 32 — Self-Refactoring Engine (SRE) (Complete)**
**Goal:** Enable CIC to statically analyze and self-refactor its codebase.

### **32.0 SRE Core**
- ✔ AST parsing (TypeScript compiler API)
- ✔ Heuristic complexity scoring
- ✔ Dead code detection
- ✔ Import boundary violation (architectural drift)

### **32.1 SRE Routing & UI**
- ✔ `/mee/refactor/scan` mode-aware endpoint
- ✔ `/mee/refactor/propose` for saving proposals
- ✔ `/mee/refactor/plan/:id` for retrieval
- ✔ Refactor Studio UI panel in Meta-Evolution Console

**Status:** Fully complete.

---

# **PHASE 33 — Multi-Agent Planning Engine (MAPE) (Complete)**
**Goal:** Decompose instructions into topologically ordered plans.

### **33.0 MAPE Core**
- ✔ TaskExtractor rule-based parser
- ✔ DependencyDetector topological sorter
- ✔ PlanToProposal planned proposal mapper
- ✔ Planning REST `/mee/plan` routes
- ✔ Planning Studio UI Console

**Status:** Fully complete.

---

# **PHASE 34 — Long-Horizon Execution & Checkpointing (In Progress)**
**Goal:** Track, save, and resume long-running execution flows.

### **34.0 Core Execution Engine**
- 🚧 MeeRun & MeeCheckpoint schema definitions
- 🚧 FileMeeRunStore JSON file storage
- 🚧 MeeRunEngine flow controller
- 🚧 Execution routes under `/mee/runs/*`
- 🚧 UI Runs panel

**Status:** In Progress.

---

# **PHASE 35 — GitHub Actions Node.js 24 Compliance System (Complete)**
**Goal:** Enforce Node.js 24 and latest GitHub Actions across the fleet.

### **35.0 Compliance Framework (Complete)**
- ✔ Fleet manifest-based scanning (gh-actions-fleet.json)
- ✔ Multi-layer enforcement: CLI, Dashboard, GitHub App, Pre-commit hooks
- ✔ Compliance detection: node-version: 20, @v4 actions, missing FORCE_JAVASCRIPT_ACTIONS_TO_NODE24
- ✔ Dashboard: React+Express with real-time metrics (/api/gh-actions/compliance, /api/gh-actions/summary)
- ✔ Slack integration: Webhook-based notifications (gh-actions-slack-notify.ts)
- ✔ GitHub App: Probot-based auto-fix PR generation (github-app-compliance-bot.ts)

**Status:** ✅ COMPLETED  
**Outcome:** Monorepo has unified, enforced GitHub Actions standards.

---

# **PHASE 36 — GitHub App Production Deployment (Next)**
**Goal:** Register and deploy the GitHub App to production.

- Register GitHub App on GitHub.com
- Configure webhook URL and secret
- Deploy Probot server (Heroku/AWS/GCP)
- Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY secrets
- Enable on target repositories (rewrite-mcp, cic)
- Verify auto-fix PR generation

**Status:** PENDING  
**Outcome:** GitHub App actively monitors and auto-fixes non-compliant workflows.

---

# **PHASE 37 — Slack Webhook & Alert Integration (Next)**
**Goal:** Route compliance reports to team Slack channels.

- Configure SLACK_WEBHOOK_URL environment variable
- Set up Slack webhook in workspace
- Route dashboard to post on schedule (nightly/weekly)
- Alert on critical compliance violations
- Dashboard mutation events trigger notifications

**Status:** PENDING  
**Outcome:** Team receives real-time compliance alerts.

---

# **PHASE 38 — CI/CD Compliance Workflow (Next)**
**Goal:** Add compliance checks to GitHub Actions CI pipeline.

- Pre-merge compliance gate: `npm run gh-actions:check-manifest`
- Publish compliance report as artifact
- Fail CI if non-compliant workflows detected
- Block merge if compliance violations found
- Dashboard auto-refresh on workflow completion

**Status:** PENDING  
**Outcome:** Non-compliant code cannot ship.

---

# **PHASE 39 — Multi-Agent Negotiation & Consensus (Complete)**
**Goal:** Coordinate multiple specialized agents to negotiate and form consensus on proposed modifications and dependency order.

- Bounded multi-agent proposal generation and critique scoring
- Bounded severity critiques (errors subtract 40, warnings 20, info 5)
- Cycle decay factor to prevent infinite refinement loops
- Collision analysis and resolution proposing reorder strategies

**Status:** ✅ COMPLETED  
**Outcome:** Agents negotiate conflicting file patches and compile a stable consensus plan.

---

# **PHASE 40 — Knowledge Graph & Semantic Memory (Complete)**
**Goal:** Form a durable Knowledge Graph and semantic Memory Store tracking system state, dependencies, critiques, and failures.

- Append-only schema-validated event memory store (`FileMeeMemoryStore`)
- Task and proposal node serialization to CKG
- Agent relationship, critique, failure, and healing edge mapping
- Fragility checks analyzing module failure densities

**Status:** ✅ COMPLETED  
**Outcome:** CIC logs structured cognitive event memories and maps them to a queryable CKG substrate.

---

# **PHASE 41 — Autonomous Multi-Job Scheduling (Complete)**
**Goal:** Run, queue, priority-schedule, and preempt concurrent autonomous build loop steps.

- Multi-job tick execution loop with concurrency gates
- Priority and age-based starvation prevention scoring ($Priority \times 1000 + Age \times 0.0001$)
- Strict preemption of lower-priority active jobs by higher-priority queued tasks
- Crash recovery resetting active/running jobs on system start

**Status:** ✅ COMPLETED  
**Outcome:** Background scheduler executes multi-job queues respecting priority, starvation bounds, and preemption.

---

# **PHASE 42 — Meta-Learning Engine (MLE) (Pending)**
**Goal:** Enable CIC to learn from past runs, critiques, consensus patterns, failures, and KG evolution to improve planning and execution.

- **Meta-Learning Loop**: Analyze historical critiques, consensus, failures, and KG patterns to extract heuristics saved as `MeeMetaRule`.
- **Meta-Rule Engine**: Bias `PlanningEngine`, `ConsensusEngine`, refinement cycles, and scheduler priorities using learned rules.
- **Adaptive Planning**: Prevent task decomposition/module selection inside fragile areas using rule weight biases.
- **Adaptive Consensus**: Weight agent critiques and votes based on historical reliability.
- **Adaptive Scheduling**: Predict job duration, adjust concurrency levels, and prioritize based on past runs.
- **UI**: Show learned rules, rule weights, historical accuracy, and planning influence.

**Status:** PENDING  
**Outcome:** CIC learns dynamically from execution history to improve planning stability and patch quality.

---

# **PHASE 43 — Autonomous Research Mode (ARM) (Complete)**
**Goal:** Enable CIC to autonomously research code improvements, explore new patterns, and propose new evolutionary phases.

- **Research Agent**: A specialized `"research"` agent that parses the code, KG, and memory logs to generate improvement findings.
- **Research Loop**: Runs periodic background scans to draft proposed improvements and risk/benefit reports.
- **Research Proposal Pipeline**: Creates MEE-like phase proposals with summaries, implementation plans, and safety risk metrics.
- **Operator Review**: Operator-gated controls to approve and spawn new research-proposed development phases.
- **Integration**: Feeds meta-rules to the MLE and updates rulesets based on research outcomes.

**Status:** ✅ COMPLETED  
**Outcome:** CIC becomes a self-directed, self-improving research and development platform.

---

## **PHASE 44 — HELM: Daily Operator OS (Complete)**

**Goal:** Unified command center dashboard integrating all operator intelligence streams (calendar, finances, business pipeline, research).

### **43.1 Foundation & Finance OS (Complete)**

- ✔ Era Context integration for real account balances (2-account live tier)
- ✔ TODAY column: Agenda, @Action Required, Payments Due, Deliveries
- ✔ Finance panel: Net worth composite, cash flow, investment portfolio visualization
- ✔ Morning brief generation via `askClaude`
- ✔ Gmail triage label counts and financial alert parsing

**Outcome:** HELM displays real-time personal/business snapshot in single unified pane.

### **43.2 Cost Intelligence Layer (Complete — Phases 6–7)**

- ✔ Budget management with persistent config and daily thresholds
- ✔ Alert system with history tracking and filtering
- ✔ Cost forecasting with burn-rate analysis
- ✔ Quality metrics ranking models by cost-effectiveness
- ✔ 12 MCP tools fully tested and operational
- ✔ Helm MCP server (Phase 47/48 implementation)

**Key Metrics:**

- Burn rate: 417 calls @ $0.0474/call
- Model ranking: Opus ($0.219/call) → Haiku ($0.0015/call)
- Budget persistence: $20 daily with configurable thresholds (1–100%)
- Alert history: Tracked, clearable, queryable

**Outcome:** CIC gains real-time cost visibility and predictive resource allocation.

### **43.3 Business Layer (Complete)**

- ✔ Rewrite Labs pipeline panel ($88K deal pipeline, 3 stages)
- ✔ CIC phase status (Phase 43.3, 8 completed, 3 milestones queued)
- ✔ Outreach queue (2 prospects, priority-ranked)
- ✔ Revenue pipeline forecasting ($51.65K expected, by-stage)
- ✔ Credit score tracking (755 Excellent, 7-day update)

**Key Deliverables:**

- 5 new MCP tools: helm:rl-pipeline, helm:cic-status, helm:credit-score, helm:outreach-queue, helm:revenue-pipeline
- Mock data files: benchmarks/business/rl-pipeline.json, benchmarks/cic/phase-status.json, benchmarks/finance/credit-score.json
- Comprehensive test suite: test-helm-phase-3.js — 5/5 passing

### **43.3.1 Intelligence Fabric — v2.5.0 (Complete)**

**Zod-validated Ideas system substrate for Phase 43.4 Command Bar.**

**Architecture:**

- ✔ **ideaSchemas.ts** — Zod runtime validation for inbox items and PRIs
- ✔ **ideaClientValidated.ts** — IdeaClient with typed, validated responses across all 10 idea: tools
- ✔ **helm-service.ts** — IdeasService layer (getInbox, getPRIs, getSummary, searchPRIs)
- ✔ **Meta-tools** — 2 new MCP tools:
  - `helm:ideas-summary` — Aggregates inbox + PRIs into daily briefing (idea counts, high-signal items, escalation tracking)
  - `helm:pri-search` — Natural-language PRI search (query-driven ranking by relevance and score)

**Deliverables:**

- tools/clients/ideaSchemas.ts — 9 Zod schemas + inferred TypeScript types
- tools/clients/ideaClientValidated.ts — Runtime validation wrapper with error boundaries
- tools/helm-service.ts — Service layer decoupling transport from HELM logic
- Extends helm-server.js with 2 new meta-tools and support functions (getIdeasSummary, searchPRIs)
- Updated phase-status.json tracking: Phase 43.3.1 complete, Phase 43.4 queued

**Outcome:** HELM gains unified intelligence fabric for ideas, PRIs, and synthesis — ready for Phase 43.4 Command Bar wiring.

### **43.4 Command & Intelligence (Pending)**

- [ ] Natural language command bar
- [ ] Cross-domain correlation alerts
- [ ] Anomaly detection (spending variance)
- [ ] Weekly digest view
- [ ] Snapshot refresh prompts

### **43.5 Polish & Deployment (Pending)**

- [ ] Personal vs. Business OS views
- [ ] Configurable panel layout
- [ ] Mobile-optimized layout
- [ ] Production deployment

**Status:** ✅ PHASES 1-2, 3, 6-7 COMPLETE  
**Outcome:** HELM becomes the single source of truth for daily operator decision-making.

---

# **Your Current Position**  
You are here:

```
PHASE 0 — ✔  
PHASE 1 — ✔  
PHASE 2 — ✔  
PHASE 3.0 — ✔ (complete)  
PHASE 3.1 — next  
PHASE 3.2 — next  
PHASE 4 — queued  
PHASE 5 — future  
PHASE 6 — long‑term convergence  
PHASE 22 (ARPS) — ✔ (complete)  

**PHASES 23–27 AUTONOMY STACK — KICKOFF TODAY (2026-06-07)**
PHASE 23 (MLA) — 🔄 KICKOFF (Jun 7–18)
PHASE 24 (SGD) — ⏳ QUEUED (depends on 23)
PHASE 25 (APR) — ⏳ QUEUED (depends on 23, 24)
PHASE 26 (CRO) — ⏳ QUEUED (depends on 25)
PHASE 27 (CKG) — ⏳ QUEUED (depends on 23, 24, 25, 26)
PHASE 28 (KDE) — queued
PHASE 29 (RLF) — queued
PHASE 30 (MEE) — ✔ (complete)
PHASE 31 (SRE) — ✔ (complete)
PHASE 32 (MAPE) — ✔ (complete)
PHASE 33 (Runs) — ✔ (complete)
PHASE 34 (Safety Gates) — ✔ (complete)
PHASE 35 (ABM Loops) — ✔ (complete)
PHASE 36 (Self-Healing) — ✔ (complete)
PHASE 37 (Multi-Agent) — ✔ (complete)
PHASE 38 (Consensus & Negotiation) — ✔ (complete)
PHASE 39 (KG & Semantic Memory) — ✔ (complete)
PHASE 40 (Autonomous Scheduling) — ✔ (complete)
PHASE 41 (Meta-Learning Engine) — next  
PHASE 42 (Autonomous Research Mode) — ✔ (complete)  
PHASE 43 (HELM) — ✔ (1-2, 6-7 complete; 3-5 next)  
PHASE 44 (Shared Skills Library) — ✔ (documentation complete; deployment next)
PHASE 45 (Suggested Skills Phase 2) — PENDING (7 new skills, 10-12 weeks)
PHASE 46 (WIL — Wayland Integration) — PENDING
- Register GitHub App on GitHub.com
- Configure webhook URL and secret
- Deploy Probot server (Heroku/AWS/GCP)
- Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY secrets
- Enable on target repositories (rewrite-mcp, cic)
- Verify auto-fix PR generation

**Status:** PENDING  
**Outcome:** GitHub App actively monitors and auto-fixes non-compliant workflows.

---

# **PHASE 36 — Slack Webhook & Alert Integration (Next)**
**Goal:** Route compliance reports to team Slack channels.

- Configure SLACK_WEBHOOK_URL environment variable
- Set up Slack webhook in workspace
- Route dashboard to post on schedule (nightly/weekly)
- Alert on critical compliance violations
- Dashboard mutation events trigger notifications

**Status:** PENDING  
**Outcome:** Team receives real-time compliance alerts.

---

# **PHASE 37 — CI/CD Compliance Workflow (Next)**
**Goal:** Add compliance checks to GitHub Actions CI pipeline.

- Pre-merge compliance gate: `npm run gh-actions:check-manifest`
- Publish compliance report as artifact
- Fail CI if non-compliant workflows detected
- Block merge if compliance violations found
- Dashboard auto-refresh on workflow completion

**Status:** PENDING  
**Outcome:** Non-compliant code cannot ship.

---

# **PHASE 38 — Multi-Agent Negotiation & Consensus (Complete)**
**Goal:** Coordinate multiple specialized agents to negotiate and form consensus on proposed modifications and dependency order.

- Bounded multi-agent proposal generation and critique scoring
- Bounded severity critiques (errors subtract 40, warnings 20, info 5)
- Cycle decay factor to prevent infinite refinement loops
- Collision analysis and resolution proposing reorder strategies

**Status:** ✅ COMPLETED  
**Outcome:** Agents negotiate conflicting file patches and compile a stable consensus plan.

---

# **PHASE 39 — Knowledge Graph & Semantic Memory (Complete)**
**Goal:** Form a durable Knowledge Graph and semantic Memory Store tracking system state, dependencies, critiques, and failures.

- Append-only schema-validated event memory store (`FileMeeMemoryStore`)
- Task and proposal node serialization to CKG
- Agent relationship, critique, failure, and healing edge mapping
- Fragility checks analyzing module failure densities

**Status:** ✅ COMPLETED  
**Outcome:** CIC logs structured cognitive event memories and maps them to a queryable CKG substrate.

---

# **PHASE 40 — Autonomous Multi-Job Scheduling (Complete)**
**Goal:** Run, queue, priority-schedule, and preempt concurrent autonomous build loop steps.

- Multi-job tick execution loop with concurrency gates
- Priority and age-based starvation prevention scoring ($Priority \times 1000 + Age \times 0.0001$)
- Strict preemption of lower-priority active jobs by higher-priority queued tasks
- Crash recovery resetting active/running jobs on system start

**Status:** ✅ COMPLETED  
**Outcome:** Background scheduler executes multi-job queues respecting priority, starvation bounds, and preemption.

---

# **PHASE 41 — Meta-Learning Engine (MLE) (Pending)**
**Goal:** Enable CIC to learn from past runs, critiques, consensus patterns, failures, and KG evolution to improve planning and execution.

- **Meta-Learning Loop**: Analyze historical critiques, consensus, failures, and KG patterns to extract heuristics saved as `MeeMetaRule`.
- **Meta-Rule Engine**: Bias `PlanningEngine`, `ConsensusEngine`, refinement cycles, and scheduler priorities using learned rules.
- **Adaptive Planning**: Prevent task decomposition/module selection inside fragile areas using rule weight biases.
- **Adaptive Consensus**: Weight agent critiques and votes based on historical reliability.
- **Adaptive Scheduling**: Predict job duration, adjust concurrency levels, and prioritize based on past runs.
- **UI**: Show learned rules, rule weights, historical accuracy, and planning influence.

**Status:** PENDING  
**Outcome:** CIC learns dynamically from execution history to improve planning stability and patch quality.

---

# **PHASE 42 — Autonomous Research Mode (ARM) (Complete)**
**Goal:** Enable CIC to autonomously research code improvements, explore new patterns, and propose new evolutionary phases.

- **Research Agent**: A specialized `"research"` agent that parses the code, KG, and memory logs to generate improvement findings.
- **Research Loop**: Runs periodic background scans to draft proposed improvements and risk/benefit reports.
- **Research Proposal Pipeline**: Creates MEE-like phase proposals with summaries, implementation plans, and safety risk metrics.
- **Operator Review**: Operator-gated controls to approve and spawn new research-proposed development phases.
- **Integration**: Feeds meta-rules to the MLE and updates rulesets based on research outcomes.

**Status:** ✅ COMPLETED  
**Outcome:** CIC becomes a self-directed, self-improving research and development platform.

---

## **PHASE 43 — HELM: Daily Operator OS (Complete)**

**Goal:** Unified command center dashboard integrating all operator intelligence streams (calendar, finances, business pipeline, research).

### **43.1 Foundation & Finance OS (Complete)**

- ✔ Era Context integration for real account balances (2-account live tier)
- ✔ TODAY column: Agenda, @Action Required, Payments Due, Deliveries
- ✔ Finance panel: Net worth composite, cash flow, investment portfolio visualization
- ✔ Morning brief generation via `askClaude`
- ✔ Gmail triage label counts and financial alert parsing

**Outcome:** HELM displays real-time personal/business snapshot in single unified pane.

### **43.2 Cost Intelligence Layer (Complete — Phases 6–7)**

- ✔ Budget management with persistent config and daily thresholds
- ✔ Alert system with history tracking and filtering
- ✔ Cost forecasting with burn-rate analysis
- ✔ Quality metrics ranking models by cost-effectiveness
- ✔ 12 MCP tools fully tested and operational
- ✔ Helm MCP server (Phase 47/48 implementation)

**Key Metrics:**

- Burn rate: 417 calls @ $0.0474/call
- Model ranking: Opus ($0.219/call) → Haiku ($0.0015/call)
- Budget persistence: $20 daily with configurable thresholds (1–100%)
- Alert history: Tracked, clearable, queryable

**Outcome:** CIC gains real-time cost visibility and predictive resource allocation.

### **43.3 Business Layer (Complete)**

- ✔ Rewrite Labs pipeline panel ($88K deal pipeline, 3 stages)
- ✔ CIC phase status (Phase 43.3, 8 completed, 3 milestones queued)
- ✔ Outreach queue (2 prospects, priority-ranked)
- ✔ Revenue pipeline forecasting ($51.65K expected, by-stage)
- ✔ Credit score tracking (755 Excellent, 7-day update)

**Key Deliverables:**

- 5 new MCP tools: helm:rl-pipeline, helm:cic-status, helm:credit-score, helm:outreach-queue, helm:revenue-pipeline
- Mock data files: benchmarks/business/rl-pipeline.json, benchmarks/cic/phase-status.json, benchmarks/finance/credit-score.json
- Comprehensive test suite: test-helm-phase-3.js — 5/5 passing

### **43.3.1 Intelligence Fabric — v2.5.0 (Complete)**

**Zod-validated Ideas system substrate for Phase 43.4 Command Bar.**

**Architecture:**

- ✔ **ideaSchemas.ts** — Zod runtime validation for inbox items and PRIs
- ✔ **ideaClientValidated.ts** — IdeaClient with typed, validated responses across all 10 idea: tools
- ✔ **helm-service.ts** — IdeasService layer (getInbox, getPRIs, getSummary, searchPRIs)
- ✔ **Meta-tools** — 2 new MCP tools:
  - `helm:ideas-summary` — Aggregates inbox + PRIs into daily briefing (idea counts, high-signal items, escalation tracking)
  - `helm:pri-search` — Natural-language PRI search (query-driven ranking by relevance and score)

**Deliverables:**

- tools/clients/ideaSchemas.ts — 9 Zod schemas + inferred TypeScript types
- tools/clients/ideaClientValidated.ts — Runtime validation wrapper with error boundaries
- tools/helm-service.ts — Service layer decoupling transport from HELM logic
- Extends helm-server.js with 2 new meta-tools and support functions (getIdeasSummary, searchPRIs)
- Updated phase-status.json tracking: Phase 43.3.1 complete, Phase 43.4 queued

**Outcome:** HELM gains unified intelligence fabric for ideas, PRIs, and synthesis — ready for Phase 43.4 Command Bar wiring.

### **43.4 Command & Intelligence (Pending)**

- [ ] Natural language command bar
- [ ] Cross-domain correlation alerts
- [ ] Anomaly detection (spending variance)
- [ ] Weekly digest view
- [ ] Snapshot refresh prompts

### **43.5 Polish & Deployment (Pending)**

- [ ] Personal vs. Business OS views
- [ ] Configurable panel layout
- [ ] Mobile-optimized layout
- [ ] Production deployment

**Status:** ✅ PHASES 1-2, 3, 6-7 COMPLETE  
**Outcome:** HELM becomes the single source of truth for daily operator decision-making.

---

# **PHASE 44 — Shared Skills Library (Cross-Platform)**

**Goal:** Document and standardize 13 skills for deployment across Claude, Copilot, and Gemini platforms.

## **44.0 — Documentation & Existing Skills Review (Complete)**

### Deliverables (7 comprehensive guides):
- **SKILLS_LIBRARY.md** — Inventory of all 13 skills, platform readiness, suggested Phase 2 skills
- **SKILLS_API_REFERENCE.md** — Detailed API specs with input/output examples for all skills
- **SKILLS_PLATFORM_NOTES.md** — Platform-specific integration guidance (Claude, Copilot, Gemini)
- **README_SKILLS_LIBRARY.md** — Quick start guide with architecture and usage examples
- **SUGGESTED_SKILLS.md** — 7 new skills with detailed specs and evidence from repo analysis
- **SKILLS_SUMMARY.md** — Executive summary, timeline, success criteria
- **SKILLS_INDEX.md** — Navigation index organized by role

### Reviewed & Documented Existing Skills (6):
- ✔ **web-regression** — Link verification (rewrite-mcp release cycle)
- ✔ **research-capture** — Route findings to documents (CIC workflow)
- ✔ **treatment-update** — Apply narrative changes (documentary)
- ✔ **doc-update** — Update changelog/roadmap (maintenance)
- ✔ **docs-sync-release** — Validate + build docs (release)
- ✔ **approvals-audit** (v2.0.0) — Proactive approval governance with auto-promotion at threshold=2

### New Skills (7) — Scaffolds Ready:
- ✔ **cic-section-summarizer** — Auto-summarize CIC phase progress
- ✔ **agent-drift-detector** — Detect agent/extractor schema drift
- ✔ **rewrite-labs-orchestrator** — Monitor RL pipeline continuously
- ✔ **environment-diagnostics** — Debug Windows/WSL2/MSIX issues
- ✔ **session-boundary-manager** — Detect session overflow/drift
- ✔ **cic-roadmap-updater** — Auto-update roadmap from progress
- ✔ **operator-grade-procedures** — Generate deterministic runbooks

**Status:** ✅ COMPLETED  
**Outcome:** All 13 skills documented, 7 new skills with implementation-ready scaffolds.

---

## **44.0.1 — Approvals-Audit v2.0.0: Proactive Auto-Promotion (Complete)**

**Enhancement:** Upgraded approvals-audit skill from passive logging to proactive governance with automatic threshold-based approval.

### Architecture:

- **Approval Manifest** (`approvals-manifest.json`) — Persistent state tracking pre-approved commands, pending approvals, occurrence counts, and auto-promotion timestamps
- **Approval Handler** (`approval-handler.js`) — Core logic with methods:
  - `trackApproval()` — Increments occurrence counter, auto-promotes at threshold (default: 2)
  - `approveCommand()` — Manual approval (skips threshold)
  - `getSummary()` — Returns stats, auto-promotion rate, and pending items
  - `getPreApproved()` / `getPending()` — List views

### Key Features:

- ✔ **Auto-Promotion:** Commands reaching 2 occurrences auto-approve (threshold configurable)
- ✔ **Frequency Tracking:** Every build/command increments persistent counter
- ✔ **Proactive Manifest:** Maintains approval state with timestamps and status tracking
- ✔ **Trend Reporting:** 53.8% auto-promotion rate, 13 total requests tracked
- ✔ **Status Discrimination:** Distinguishes `auto-promoted`, `manually-approved`, `auto-approved` states

### Deliverables:

- `skills-runtime/approvals-manifest.json` — 7 pre-approved, 1 pending, full tracking stats
- `skills-runtime/approval-handler.js` — Production handler with async/sync support
- `skills/approvals-audit.md` (v2.0.0) — Updated documentation with API usage examples

### Usage Flow

```javascript
Request #1 → trackApproval() → Status: pending (1/2)
Request #2 → trackApproval() → Status: auto-promoted (2/2) + saved to manifest
Request #3+ → trackApproval() → Status: auto-approved (no approval needed)
```

**Status:** ✅ COMPLETED

**Outcome:** Approval audit becomes proactive; stabilized patterns automatically bypass approval overhead.

---

## **44.1 — Claude Deployment (Phase 1)**

**Dependencies:** Documentation complete

### Tasks:
- [ ] Deploy 7 new skills to Claude Code
- [ ] Test all 13 skills in Claude environment
- [ ] Update CLAUDE.md with skill guidelines
- [ ] Verify MCP server integration

**Effort:** 1 week  
**Status:** PENDING  
**Outcome:** Claude has full skill capability set.

---

# **PHASE 45 — Suggested New Skills (7) — Phase 2 Backlog**

**Goal:** Build 7 additional skills identified from repo activity analysis.

Based on analysis of commits from last 7 days, HANDOFF.md sessions, and operational patterns:

## **45.1 — mee-phase-executor (High Priority)**
Execute MEE phases (43–45) with state tracking, resumable execution, progress visibility.
- **Evidence:** Phase 43–45 are complex; manual npm script invocation error-prone
- **Effort:** 2–3 weeks
- **Status:** PENDING

## **45.2 — cic-benchmark-runner (High Priority)**
Automate RL benchmark pipeline with cost tracking, credit balance checking, resumable runs.
- **Evidence:** Benchmark pipeline blocked this week (API credits); no orchestration
- **Effort:** 2 weeks
- **Status:** PENDING

## **45.3 — environment-validator (High Priority)**
Fast health check (<2s) for session startup (separate from deep diagnostics).
- **Evidence:** Session startup experience matters; quick validator is low-hanging fruit
- **Effort:** 1 week
- **Status:** PENDING

## **45.4 — mee-finding-assessor (Medium Priority)**
Review and approve/reject autonomous research findings from Phase 42.
- **Evidence:** Phase 42 generates findings autonomously; approval process is manual
- **Effort:** 1.5 weeks
- **Status:** PENDING

## **45.5 — helm-daily-brief (Medium Priority)**
Generate morning briefing from Calendar, Gmail, Finance, Deals.
- **Evidence:** HELM Phase 2 live; automating daily brief improves experience
- **Effort:** 2 weeks
- **Status:** PENDING

## **45.6 — idea-inbox-harvester (Medium Priority)**
Harvest ideas to priority list for roadmap integration.
- **Evidence:** Idea-inbox fully functional (12/12 tests pass); harvester closes automation loop
- **Effort:** 1.5 weeks
- **Status:** PENDING

## **45.7 — phase-validator (Medium Priority)**
Verify phase completion (tests + docs + integration).
- **Evidence:** Phase completion is manual and error-prone; validator reduces errors
- **Effort:** 2 weeks
- **Status:** PENDING

**Total Phase 45 Effort:** 10–12 weeks (prioritized across 4 sprints)  
**Execution Order:** 45.3 → 45.2 → 45.1 → 45.4 → 45.5 → 45.6 → 45.7

**Status:** PENDING  
**Outcome:** 7 new skills enable automation of MEE execution, benchmarking, research, and phase validation.

---

<!-- ARPS:PHASE_46:BEGIN -->
## Phase 46 — CIC ↔ Wayland Integration Layer (WIL)

**Goal:** Register CIC as a first-class agent inside Wayland. Wayland becomes CIC's syscall layer for shells, files, model calls, and keys. CIC becomes a sandboxed, observable, Wayland-mediated super-agent.

### Architecture

- CIC exposes a single HTTP service (`cic_foreman`) — Wayland sees one agent
- All CIC tool calls (shell/model/file/http) route through Wayland adapters
- CIC pipelines map to Wayland UI sessions; logs and artifacts surface natively
- Keys and OS access are fully Wayland-managed; CIC holds no raw credentials

### Milestones

- **46.1 — CIC Foreman HTTP Service (WIL-Foreman)**  
  Local HTTP server: `POST /task`, `GET /status/:task_id`, `GET /artifact/:task_id/:artifact_id`, `GET /health`.
  Binds to `127.0.0.1:3035`. Emits structured JSON logs with correlation IDs.
  Fix bug in TypeScript stub: `tasks.set(id)` → `tasks.set(id, task)`.

- **46.2 — Wayland Tool Adapter Layer (WIL-Adapters)** ✅ FOUNDATION COMPLETE  
  Implement `ShellTool`, `ModelTool`, `FileTool`, `HttpTool` adapters routing to Wayland's
  tool endpoint. Enforce workspace root scoping (`/cic_workspace`). Remove all direct OS
  access from CIC agents.
  
  **Status:** Foundation adapters created and tested
  - `src/tool-layer/ShellTool.ts` — Direct mode (exec) + Wayland mode, interactive pattern validation
  - `src/tool-layer/ModelTool.ts` — Direct mode (Anthropic SDK) + Wayland mode
  - `src/tool-layer/FileTool.ts` — Direct mode (fs/promises) + Wayland mode, workspace root scoping
  - `src/tool-layer/HttpTool.ts` — Direct mode (fetch) + Wayland mode, AbortController timeout
  - `src/tool-layer/ToolLayer.ts` — Factory pattern for mode selection (direct/wayland)
  - `tests/tool-layer.test.ts` — **16/16 passing tests** covering direct mode, error handling, validation

- **46.3 — Agent Manifest & Registration (WIL-Manifest)**  
  Finalize `cic_foreman.agent.json` with capabilities, routes, tooling, security, and
  observability config. Register with Wayland agent registry.

- **46.4 — Pipeline ↔ Wayland Session Mapping (WIL-Sessions)**  
  Map CIC pipeline runs to Wayland UI sessions. Emit pipeline step logs, governance
  decisions, and tool call events as Wayland-visible structured events.

- **46.5 — Artifact Integration (WIL-Artifacts)**  
  Write CIC artifacts to Wayland-visible paths. Expose artifact metadata via
  `/artifact/:task_id/:artifact_id`. Enforce 25 MB artifact size limit.

- **46.6 — Security Hardening (WIL-Security)**  
  Remove all API keys from CIC config (delegate to Wayland key management).
  Enforce file sandbox (`/cic_workspace` only). Ensure all shell commands are
  non-interactive. Validate workspace root scoping in FileTool adapter.

- **46.7 — Integration Test Suite (WIL-Tests)**  
  8 test categories: health/registration, task lifecycle, ShellTool, ModelTool,
  FileTool, HttpTool, error handling, end-to-end pipeline. Implement in Jest (TS).

- **46.8 — Branding Pack (WIL-Branding)** *(optional, post-launch)*  
  Add `branding` block to `cic_foreman.agent.json` (icon_16/32/64/128, logo_horizontal,
  logo_stack, primary_color `#0B1B2B`, accent_color `#35C2FF`). Add `brand: "CIC"` field
  to structured log events. Add `accent_color` to artifact metadata. Add `session_brand`/
  `session_icon`/`session_color` to pipeline session payloads. Add optional agent graph
  node/edge payload for Wayland graph visualizer. Asset target: `branding/cic/`.

### Dependencies

- Wayland agent registry must be running and accessible
- CIC Foreman service (46.1) must be running before 46.2–46.7
- Workspace root (`/cic_workspace`) must exist and be Wayland-permissioned

**Status:** Phase 46.2 (Tool-Layer Adapters) FOUNDATION COMPLETE ✅ | Phase 46.1, 46.3+ PENDING 🔄  
**Last Updated:** 2026-06-07  
**Test Results:** 16/16 passing (tool-layer.test.ts) for direct mode adapters

**Completed Work:**

- All four tool adapters implemented with dual mode support (direct/Wayland)
- 16 test scenarios covering shell, file I/O, model calls, HTTP, validation, error handling
- Cross-platform atomic file writes
- Workspace root scoping enforcement
- Interactive command pattern validation

**Outcome:** CIC operates as a sandboxed, Wayland-mediated, first-class agent.

**Next Steps (46.1, 46.3–46.8):**

1. **46.1** — CIC Foreman HTTP Service (task lifecycle, artifact management)
2. **46.3** — Agent Manifest & Registration (capabilities, routes)
3. **46.4** — Pipeline ↔ Wayland Session Mapping (structured events)
4. **46.5** — Artifact Integration (artifact metadata exposure)
5. **46.6** — Security Hardening (key management, sandbox enforcement)
6. **46.7** — Integration Test Suite (8 test categories)
7. **46.8** — Branding Pack (optional, post-launch)
<!-- ARPS:PHASE_46:END -->

---

<!-- ARPS:PHASE_47:BEGIN -->
## Phase 47 — Approval UX Overhaul (AUX)

**Goal:** Eliminate repetitive approval prompts while maintaining safety. Solve the 50+ approvals-per-session friction that blocks productivity.

### Architecture

- **Approval manifest** — persistent JSON store tracking command approvals, frequencies, tier assignments, trust scores
- **Four-tier approval system** — Tier 1 (safe, no prompt) → Tier 4 (risky, always prompt)
- **Auto-promotion** — commands reaching N approvals automatically promote to higher tier
- **Session-scoped whitelist** — within a session, once approved, don't re-prompt for 1 hour
- **Denylist pattern detector** — only prompt for novel/suspicious patterns

### Milestones

- **47.1 — Approval Manifest Schema (AUX-Manifest)** ✅ COMPLETE  
  Persistent JSON store: command approval history, tier assignments, auto-promotion timestamps, trust scores.
  Load/save with atomic writes (cross-platform .tmp → rename). Integration with existing approvals-audit skill v2.0.0.
  
  **Deliverables:**
  - `src/approval-system/ApprovalManifest.ts` (361 lines) — Manager class with load/save/approval/rejection/whitelist/denylist methods
  - `src/approval-system/types.ts` (78 lines) — Complete type definitions (ApprovalTier, ApprovalRecord, DenylistPattern, ApprovalDecision)
  - `src/approval-system/index.ts` — Barrel exports + singleton instance
  - `tests/approval-manifest.test.ts` — **28 passing tests** covering:
    - Atomic writes with race condition handling
    - Approval recording with tier assignments (Tier 1-4)
    - Auto-promotion chain: 1→2→3→4 (after 3 consecutive approvals per tier)
    - Trust score computation (0-100 based on approval/rejection ratio)
    - Session whitelist with 1-hour TTL auto-expiration
    - Denylist patterns with severity levels (low=log, medium/high=block)
    - Tier-based decision logic + whitelist override
    - Command normalization (case-insensitive, whitespace-trimmed, SHA256 hashed)
  - **Build status:** `npm run build` clean (0 TS errors), `npm run test -- approval-manifest.test.ts` (28/28 passing)

- **47.2 — Four-Tier Classification (AUX-Tiers)** 🔄 NEXT  
  Tier 1 (safe: npm, git, known urls) → Tier 4 (risky: destructive, new hosts).
  Heuristic classifier + explicit tier assignment API. Default: classify all known commands on startup.

- **47.3 — Auto-Promotion Logic (AUX-AutoPromote)** 🔄 PENDING  
  After N consecutive approvals in a tier, auto-promote to next tier (capped at tier 4).
  Track promotion timestamps and audit trail.

- **47.4 — Session-Scoped Whitelist (AUX-SessionWhitelist)** 🔄 PENDING  
  Ephemeral whitelist (1-hour TTL) per session. Once user approves, skip prompt for remainder of session.
  Cleaned on load; expired entries removed automatically.

- **47.5 — Denylist Pattern Detector (AUX-Denylist)** 🔄 PENDING  
  Regex-based denylist with severity levels (low/medium/high). Low severity = log only. 
  Medium/high = block and require manual override or add to session whitelist.

- **47.6 — Approval Dashboard (AUX-Dashboard)** 🔄 PENDING  
  Real-time visibility: tier distribution, auto-promotion rate, rejected commands, session whitelist status.
  Bulk operations: reassign tier, reset auto-promotion, remove from whitelist.

- **47.7 — Integration Tests (AUX-Tests)** 🔄 PENDING  
  Integration test suite covering CLI approval flow, tool-layer adapter interactions,
  approval manifest state across sessions, end-to-end approval lifecycle.

### Dependencies

- Approval manifest storage (local filesystem or cloud-backed)
- Existing approvals-audit skill foundation
- CLI integration point for approval prompts

### Expected Outcome

80% reduction in approval prompts per session (from 50+ to ~10). Commands auto-promoted to appropriate tiers based on usage patterns. Novel/suspicious commands caught by denylist. Session whitelist eliminates repeated approval for same command within 1 hour.

**Status:** Phase 47.1 COMPLETE ✅ | Phase 47.2+ QUEUED 🔄  
**Last Updated:** 2026-06-07  
**Test Results:** 28/28 passing (approval-manifest.test.ts) + 16/16 passing (tool-layer.test.ts)

**Outcome (47.1):** Four-tier approval system with persistent history, session-scoped whitelist, denylist pattern detection, and comprehensive test coverage (28 test scenarios).

**Next Steps (47.2–47.7):**

1. **47.2** — Implement Four-Tier Classification Engine (heuristic + explicit assignment API)
2. **47.3** — Integrate auto-promotion logic with approval handler (already implemented in manifest, needs CLI plumbing)
3. **47.4** — Wire session whitelist into approval decision flow (TTL enforcement + ephemeral state)
4. **47.5** — Denylist pattern detector integration (regex matching, severity escalation)
5. **47.6** — Approval dashboard UI (tier distribution, whitelist status, bulk operations)
6. **47.7** — Full integration test suite (approval lifecycle across tool-layer adapters)
<!-- ARPS:PHASE_47:END -->

---

## **44.2 — Copilot Adaptation (Phase 2, Optional)**

**Dependencies:** Claude deployment complete, platform wrappers designed

### Scope:
Adapt 9 recommended skills to Copilot platform (exclude: treatment-update, research-capture, approvals-audit, environment-diagnostics)

**Effort:** 6–8 weeks  
**Status:** PENDING  
**Outcome:** Copilot has cross-platform skill capability (9/13 skills).

---

## **44.3 — Gemini Adaptation (Phase 3, Optional)**

**Dependencies:** Copilot adaptation complete, JavaScript wrapper patterns established

### Scope:
Adapt 9 recommended skills to Gemini (async-first, JavaScript-only)

**Effort:** 6–8 weeks  
**Status:** PENDING  
**Outcome:** Gemini has cross-platform skill capability (9/13 skills).

---

# **Your Current Position**  
You are here:

```
PHASE 0 — ✔  
PHASE 1 — ✔  
PHASE 2 — ✔  
PHASE 3.0 — ✔ (complete)  
PHASE 3.1 — next  
PHASE 3.2 — next  
PHASE 4 — queued  
PHASE 5 — future  
PHASE 6 — long‑term convergence  
PHASE 22 (ARPS) — ✔ (complete)  

**PHASES 23–27 AUTONOMY STACK — KICKOFF TODAY (2026-06-07)**
PHASE 23 (MLA) — 🔄 KICKOFF (Jun 7–18)
PHASE 24 (SGD) — ⏳ QUEUED (depends on 23)
PHASE 25 (APR) — ⏳ QUEUED (depends on 23, 24)
PHASE 26 (CRO) — ⏳ QUEUED (depends on 25)
PHASE 27 (CKG) — ⏳ QUEUED (depends on 23, 24, 25, 26)
PHASE 28 (KDE) — queued
PHASE 29 (RLF) — queued
PHASE 30 (MEE) — ✔ (complete)
PHASE 31 (SRE) — ✔ (complete)
PHASE 32 (MAPE) — ✔ (complete)
PHASE 33 (Runs) — ✔ (complete)
PHASE 34 (Safety Gates) — ✔ (complete)
PHASE 35 (ABM Loops) — ✔ (complete)
PHASE 36 (Self-Healing) — ✔ (complete)
PHASE 37 (Multi-Agent) — ✔ (complete)
PHASE 38 (Consensus & Negotiation) — ✔ (complete)
PHASE 39 (KG & Semantic Memory) — ✔ (complete)
PHASE 40 (Autonomous Scheduling) — ✔ (complete)
PHASE 41 (Meta-Learning Engine) — next  
PHASE 42 (Autonomous Research Mode) — ✔ (complete)  
PHASE 43 (HELM) — ✔ (1-2, 6-7 complete; 3-5 next)  
PHASE 44 (Shared Skills Library) — ✔ (documentation complete; deployment next)
PHASE 45 (Suggested Skills Phase 2) — PENDING (7 new skills, 10-12 weeks)
PHASE 46 (WIL — Wayland Integration) — PENDING
```

---

# 🌐 **CIC + REWRITE LABS — UNIFIED DEPENDENCY-ORDERED EXECUTION PLAN (v1.0)**
*This is the authoritative, dependency-resolved execution sequence combining the states of CIC Core, Rewrite Labs, MAS, UI, and Integrations. Each phase unlocks the downstream capabilities.*

## **PHASE 1 — Foundation Stabilization (Already Complete)**
These are prerequisites for everything downstream.

### **1.1 CIC Security Plane**
- ClamAV
- Sandbox extraction
- Busboy hardening
- Secret management
- SEC‑OPS dashboard  
*Status:* ✔ Complete

### **1.2 CIC UI Component Hardening**
- cic-shell, cic-panel, cic-alert, cic-stat, cic-grid
- L1 validator, Token expansion  
*Status:* ✔ Complete

### **1.3 MAS Core (Phases 25, 32, 34, 36, 37, 38)**
- Multi‑agent orchestrator
- Planning engine
- Negotiation & consensus
- Safety gates
- Self‑healing  
*Status:* ✔ Complete

### **1.4 Daily Digest Subsystem**
- collector, synthesizer, writer, consumer
- tests, operator manual  
*Status:* ✔ Complete  
*Remaining:* automated scheduling (later phase)

---

## **PHASE 2 — Rewrite Labs Activation (Critical Path)**
Rewrite Labs cannot run until these are done.

### **2.1 Tier 1–3 Integration Layer (Wrappers + Providers)**
*Dependencies:* Security Plane, MAS Core  
*Includes:* SearXNG provider, Llama.cpp provider, Newspaper3k adapter, Trafilatura adapter  
*Status:* ❌ Not started  
*Why now:* Rewrite Labs discovery + ingestion depends on these.

### **2.2 Rewrite Labs E2E Pipeline Testing Suite**
*Dependencies:* Tier 1–3 integrations  
*Includes:* discovery → extraction → redesign → outreach flow, tenant isolation, region divergence, lineage correctness, canary validation  
*Status:* ❌ Not started  
*Why now:* This is the gating test for Rewrite Labs production.

---

## **PHASE 3 — CIC Evolution Layer (Core Intelligence)**
These phases depend on MAS Core + stable ingestion + stable UI.

### **3.1 CIC Evolution Loop (Phase 10)**
*Dependencies:* MAS Core  
*Includes:* meta_evolution_logic_loop.md, runtime orchestrator, artifact pipeline, operator decision loop  
*Status:* ❌ Not started  
*Why now:* This unlocks autonomous improvement.

### **3.2 Knowledge Distillation Engine (Phase 28)**
*Dependencies:* Evolution Loop  
*Includes:* graph compression, stale node pruning, memory consolidation  
*Status:* ❌ Not started  
*Why now:* Prevents graph bloat before similarity engine.

### **3.3 Rewrite Labs ↔ CIC Fusion Layer (Phase 29)**
*Dependencies:* Evolution Loop, Rewrite Labs E2E  
*Includes:* CIC planner → RL redesign, RL redesign → CIC outreach, unified lineage  
*Status:* ❌ Not started  
*Why now:* This is the bridge between the two systems.

---

## **PHASE 4 — Intelligence Expansion Layer**
These depend on the Evolution Loop + Distillation Engine.

### **4.1 Cross‑Asset Similarity Engine**
*Dependencies:* Distillation Engine  
*Includes:* embedding store, vector index, hybrid scoring, cluster generator, AIR + Synthesis integration  
*Status:* ❌ Not started  
*Why now:* Required for Sorensen Graph, clustering, narrative adjacency.

### **4.2 Temporal Intelligence (Phase 15)**
*Dependencies:* Similarity Engine  
*Includes:* temporal memory, drift analyzer, sequence forecaster, narrative planner  
*Status:* ❌ Not started  
*Why now:* Requires similarity + clustering to detect drift.

---

## **PHASE 5 — Documentation Intelligence Layer**
These depend on Similarity + Temporal Intelligence.

### **5.1 Semantic Graph View**
*Dependencies:* Similarity Engine  
*Includes:* term graph, subsystem graph, release graph  
*Status:* ❌ Not started

### **5.2 API Change Heatmap**
*Dependencies:* Temporal Intelligence  
*Includes:* drift visualization, endpoint evolution  
*Status:* ❌ Not started

### **5.3 Glossary Auto‑Expander**
*Dependencies:* Semantic Graph View  
*Includes:* hover definitions, inline expansions  
*Status:* ❌ Not started

---

## **PHASE 6 — Rewrite Labs Productionization**
These depend on Fusion Layer + E2E Tests + Similarity Engine.

### **6.1 Rewrite Labs Control Plane Panel**
*Dependencies:* Fusion Layer  
*Includes:* lineage viewer, drift metrics, redesign preview, tenant dashboard  
*Status:* ❌ Not started

### **6.2a — Ideogram 4.0 Model Evaluation (Rewrite Labs Redesign)**
*Dependencies:* Tier 1–3 integrations  
*Timeline:* 2 days (Day 1–2)  
*Purpose:* Evaluate Ideogram 4.0 for use as primary redesign generator; compare against Claude Sonnet/Opus on SMB corpus.

**Evaluation Dimensions (Day 1):**
- **Benchmark Setup:** 10 representative prompts across 6 verticals (local service, fitness, salon, restaurant, contractor, generic SMB)
- **A/B Test Harness:** Ideogram 4.0 vs. Claude Sonnet vs. Claude Opus on 0–5 rubric:
  - Typography fidelity
  - Layout stability
  - Brand coherence
  - Prompt determinism
  - Hallucination rate
  - HTML-compatibility
  - AEO compatibility
  - Pipeline throughput
  - Cost efficiency

**Integration Test (Day 2):**
- Feed Ideogram outputs → HTML/CSS generator
- Validate layout integrity, typography tokens, color palette mapping
- Run through AEO metadata injector (P1 item)
- Test in ChatGPT/Perplexity/Gemini crawl to ensure AI-search visibility

**Decision Logic (End of Day 2):**
- **If Overall Score ≥ 4.0** → Promote to primary generator (replace Sonnet)
- **If 3.0 ≤ Overall < 4.0** → Use as style-enhancer (Sonnet → Ideogram refinement → HTML)
- **If Overall < 3.0** → Keep Sonnet primary, revisit when Ideogram updates

**Weighted Formula:**
```
Overall = 0.25T + 0.20L + 0.15B + 0.10D + 0.10H + 0.10C + 0.10A
```
(See [IDEOGRAM_4_0_DECISION_MATRIX.md](./IDEOGRAM_4_0_DECISION_MATRIX.md) for details)

**Deliverables:**
- Completed scoring sheet ([IDEOGRAM_4_0_SCORING_SHEET.md](./IDEOGRAM_4_0_SCORING_SHEET.md))
- Integration decision matrix ([IDEOGRAM_4_0_DECISION_MATRIX.md](./IDEOGRAM_4_0_DECISION_MATRIX.md))
- A/B comparison report
- Updated redesign pipeline diagram
- Week 2 roadmap recommendations

*Status:* PENDING  
*Outcome:* Cost-per-redesign drops; typography quality increases; pipeline throughput improves

---

### **6.2 Rewrite Labs Redesign Engine v1.0**
*Dependencies:* Tier 1–3 integrations + E2E tests + Model Evaluation (6.2a)  
*Includes:* layout detector, content extractor, UI generator, copy generator  
*Status:* ❌ Not started

### **6.3 Rewrite Labs Outreach Engine v1.0**
*Dependencies:* Redesign Engine  
*Includes:* email generator, CRM sync, multi‑tenant routing  
*Status:* ❌ Not started

---

## **PHASE 7 — CIC Design System v2.0 + Generative Surfaces**
These depend on UI Hardening + Similarity + Temporal Intelligence.

### **7.1 CIC Design System v2.0**
*Dependencies:* UI Hardening  
*Includes:* generative tokens, semantic layout grammar  
*Status:* ❌ Not started

### **7.2 Generative Surface Engine (GSE)**
*Dependencies:* Design System v2.0  
*Includes:* auto‑assembled UI surfaces, agent‑driven layout synthesis  
*Status:* ❌ Not started

### **7.3 Visual Index Auto‑Generator**
*Dependencies:* GSE  
*Includes:* automatic component catalog, live previews  
*Status:* ❌ Not started

---

## **PHASE 8 — Downstream Autonomous Evolution (Phases 12–20)**
These depend on Evolution Loop + Similarity + Temporal Intelligence.

### **8.1 Predictive Evolution Layer (Phase 12)**
*Status:* ❌ Not started
### **8.2 Autogenous Governance (Phase 13)**
*Status:* ❌ Not started
### **8.3 Emergent Heuristic Creation (Phase 14)**
*Status:* ❌ Not started
### **8.4 Self‑Repair (Phase 18)**
*Status:* ❌ Not started
### **8.5 Digital Autopoiesis (Phase 20)**
*Status:* ❌ Not started  
*Why last:* These require the entire intelligence stack to be stable.

---

## 🏆 **THE TOP-LEVEL EXECUTION ORDER SUMMARY**

1. **Tier 1–3 Integrations** (Wrappers & Providers)
2. **Rewrite Labs E2E Pipeline Tests**
3. **Ideogram 4.0 Model Evaluation (Phase 6.2a)** ← CRITICAL PATH: 2 days, informs redesign engine choice
4. **CIC Evolution Loop (Phase 10)**
5. **Knowledge Distillation Engine (Phase 28)**
6. **Rewrite Labs ↔ CIC Fusion Layer (Phase 29)**
7. **Cross‑Asset Similarity Engine**
8. **Temporal Intelligence (Phase 15)**
9. **Docs Intelligence Layer** (Graph, Heatmap, Expander)
10. **Rewrite Labs Productionization** (Control Plane, Redesign, Outreach)
11. **CIC Design System v2.0 + GSE**
12. **Downstream Autonomous Evolution (Phases 12–20)**

---

# 🏛️ **PHASE 50+ — FAMILY HISTORY RESEARCH BUSINESS (FHRB)**
### *Dual-use infrastructure: built for CIC, commercialized for personalized family research.*

**Strategic Context:**
The CIC documentary research pipeline is 85% of the infrastructure required to operate a premium personalized family history research business. The documentary's success becomes the proof of concept and marketing narrative. Each phase below serves CIC Phase 1 archival needs AND lays the product foundation. Build once, serve both.

**Market position:** Deep, expert-driven, privacy-first research reports. Target: $2,500–$8,500/project. Differentiator: AI-assisted gap detection + narrative report generator built on real documentary infrastructure.

---

## **PHASE 50 — Document Digitization & OCR Pipeline (DDP)**

**Status:** ✅ COMPLETED (2026-06-06)

**Dual-use:** CIC needs OCR for Benson Ford memos, newspaper clippings, handwritten Ford correspondence. Family history business needs it for census records, birth/death certificates, handwritten diaries, immigration manifests.

### Deliverables
- ✔ `ocr-cic-documents.ps1` — Production OCR pipeline with Tesseract + WinRT fallback
- ✔ Domain mode flag (`-Domain documentary | genealogy`) — single script, two pipelines
- ✔ Structured field extraction: dates, names, places, organizations
- ✔ Document type detection (5 documentary types + 10 genealogy types)
- ✔ OCR confidence scoring with manual review flagging
- ✔ Sidecar JSON integration — writes back to existing classify pipeline
- ✔ Entity merging — preserves manually entered entities while adding OCR-extracted ones

### Integration
Runs between `ingest-cic-archival.ps1` and `classify-cic-media.ps1` in the pipeline:
```
ingest → OCR → classify → organize → research-log → curate
```

**Outcome:** Every document in the archive has machine-readable text, detected entities, and document type — enabling full-text search, AI summarization, and automated gap detection.

---

## **PHASE 51 — Genealogy Classification Taxonomy Extension**

**Status:** ✅ COMPLETED (2026-06-06)

**Dual-use:** Extended `classify-cic-media.ps1` with full genealogy domain support — same script, two pipelines.

### Deliverables
- ✔ `-Domain documentary|genealogy` parameter — full backward compatibility; documentary mode unchanged
- ✔ `-ConfigFile` parameter — client family config JSON drives surname routing and narrative sections
- ✔ 13-type genealogy taxonomy: Birth/Death/Marriage/Census/Land Deed/Probate/Military/Immigration/Church/Naturalization/Obituary/Photograph/Correspondence
- ✔ 5-tier genealogy significance: Vital records (High) → Military/Immigration (High) → Probate/Census (Medium) → Photograph (Low)
- ✔ OCR-aware classification: Phase 50 `detected_document_type` used as primary signal; filename keywords as fallback
- ✔ OCR date integration: Phase 50 `detected_dates` used for `historical_date` with `confidence: "ocr"`
- ✔ Genealogy narrative cross-refs: configurable sections (Immigration Journey, Military Service, Vital Records, etc.)
- ✔ `genealogy_config.json` template auto-generated at first run — client fills in surnames and family lines
- ✔ Entity merging: OCR-extracted entities preserved; classification adds filename-detected entities without overwriting

### Config template location
`C:\CIC_MEDIA_LIBRARY\CIC\metadata\genealogy_config.json`

**Outcome:** The same classification script handles CIC documentary assets and client family archives with zero code duplication. OCR output from Phase 50 flows directly into Phase 51 classification with no manual handoff.

---

## **PHASE 52 — Person & Entity Relationship Graph (ERG)**

**Status:** ✅ COMPLETED — 2026-06-06

**Dual-use:** CIC needs a relationship graph for the Sorensen network (Sorensen ↔ Ford ↔ Bennett ↔ Willow Run ↔ Denmark). Family history business needs it for ancestor trees.

### Deliverables

- ✔ `C:\CIC_MEDIA_LIBRARY\CIC\scripts\build-entity-graph.ps1` — CLI graph builder, `-Domain documentary|genealogy`
- ✔ Node types: Person, Place, Organization, Event, Document — schema-flexible
- ✔ Relationship types: family (parent_of/spouse_of), organizational (employed_by/reported_to/founded/adversarial_with), geographic (born_in/lived_in/located_in/operates), associative (associated_with/mentions/corresponded_with)
- ✔ 14 seeded Sorensen network facts with confidence scores (1905–1968 span)
- ✔ Vital record parser: birth cert → parent_of + spouse_of edges; marriage cert → spouse_of edges
- ✔ Noise filter: 20 reject patterns; type-override heuristics for orgs/places mis-labeled as people by OCR
- ✔ Alias resolution: 14 name variants → canonical (Cast Iron Charlie → Charles Emil Sorensen, etc.)
- ✔ Co-occurrence edges: entities sharing a document → associated_with (confidence-weighted)
- ✔ Evidence merging: multiple documents confirming same edge → confidence boost
- ✔ Outputs: `entity_graph.json` (D3/Cytoscape compatible), `entity_graph_summary.md`, `entity_graph.ged` (genealogy)
- ✔ GEDCOM 5.5.1 export: INDI/FAM records with BIRT/DEAT/MARR events
- ✔ Validated: 25 clean nodes / 135 edges from 3 test sidecars + seed layer

### Output locations

- Graph JSON: `C:\CIC_MEDIA_LIBRARY\CIC\metadata\entity_graph.json`
- Summary: `C:\CIC_MEDIA_LIBRARY\CIC\metadata\entity_graph_summary.md`
- GEDCOM: `C:\CIC_MEDIA_LIBRARY\CIC\metadata\entity_graph.ged` (genealogy mode only)

**Outcome:** CIC maps Sorensen's 40-year network. Family research clients get an interactive relationship graph as part of their deliverable.

---

## **PHASE 53 — Archive API Integration Layer (AAIL)**

**Status:** ✅ COMPLETED — 2026-06-06

**Dual-use:** CIC hits Benson Ford, NASM, Library of Congress, AFHRA. Business hits Ancestry, FamilySearch, Fold3, Newspapers.com, FindMyPast.

### Deliverables

- ✔ `C:\CIC_MEDIA_LIBRARY\CIC\scripts\query-archives.ps1` — orchestrator: `-Query`, `-Domain`, `-Connectors`, `-DateFrom`, `-DateTo`, `-State`, `-MaxResults`
- ✔ `archive-connectors/` directory — dot-source plugin architecture; each file self-registers into `$ConnectorRegistry`
- ✔ **LOC** (`LOC-Connector.ps1`) — Library of Congress open API, no auth, live results validated
- ✔ **ChronAmerica** (`ChronAmerica-Connector.ps1`) — LOC Collections API for Chronicling America (20M+ newspaper pages 1770–1963); endpoint migrated from deprecated `chroniclingamerica.loc.gov` to `loc.gov/collections/chronicling-america`
- ✔ **Smithsonian** (`Smithsonian-Connector.ps1`) — Smithsonian Open Access (incl. NASM, Air & Space); DEMO_KEY included, prod key at api.data.gov
- ✔ **FamilySearch** (`FamilySearch-Connector.ps1`) — OAuth2 client credentials flow; register free at familysearch.org/developers; skeleton ready, skip-on-no-creds
- ✔ **Ancestry** (`Ancestry-Connector.ps1`) — Partner API scaffold; apply at ancestry.com/corporate/brands/ancestry/genealogy-api; skip-on-no-creds
- ✔ **BensonFord** (`BensonFord-Connector.ps1`) — No public API; generates digital collections search URL + contact info (`research@thehenryford.org`) + priority collection list (Acc.1 Sorensen Papers, Acc.285 Ford Records)
- ✔ Per-connector rate limiting (500ms–5000ms) and retry logic (configurable retry count)
- ✔ Normalized result schema: `result_id`, `source_archive`, `title`, `date`, `url`, `thumbnail`, `format`, `rights`, `relevance_score`, `evidence`
- ✔ Credential management: `metadata/archive_credentials.json` template with setup instructions per connector
- ✔ Outputs: `metadata/archive_results_{timestamp}.json` + `metadata/archive_results_latest.json` + `metadata/archive_results_latest.md`
- ✔ **InternetArchive** (`InternetArchive-Connector.ps1`) — archive.org Solr API, free, no auth, 28M+ items; confirmed Ford newsreels: "Tour of Willow Run / XB-24 Liberator" (1942), "Breaking Ground For Willow Run Plant" (1943)
- ✔ **NARA** (`NARA-Connector.ps1`) — National Archives; API retired (now React SPA); generates targeted catalog search links + priority record group list (RG 179 War Production Board, RG 18 Army Air Forces, RG 342 USAF, RG 169 Foreign Economic Admin)
- ✔ Validated: LOC (5), ChronAmerica (5), InternetArchive (5), NARA (5 links), BensonFord (1 link) — 21 total results for "Charles Sorensen Ford Motor" 1930–1960

### Credential setup

`C:\CIC_MEDIA_LIBRARY\CIC\metadata\archive_credentials.json` — fill in FamilySearch and Ancestry keys when obtained

**Outcome:** One query hits all connected archives simultaneously. Results land in the media library with proper attribution and rights status.

---

## **PHASE 54 — Narrative Research Report Generator (NRG)**

**Status:** ✅ COMPLETE (2026-06-07)

**Dual-use:** CIC needs the Treatment document rendered as press kit, grant application bundle, and festival submission. Family research business needs the same narrative engine for client deliverables ($2,500–$8,500 reports).

### Deliverables
- `generate-report.ps1` — main orchestrator; consumes entity graph + classified sidecars + archive results + optional research log
- `report-templates/report.css` — Crimson Pro / Source Sans 3, professional print-ready stylesheet
- Output formats:
  - **HTML → PDF** — `report_full_latest.html` (browser → Ctrl+P → Save as PDF)
  - **Executive summary** — `report_executive_latest.md`
  - **Timeline** — `report_timeline_latest.md`
  - **Evidence register** — Evidence Explained citation format, auto-populated from sidecars + archive results
  - **Gap analysis** — `report_gaps_latest.md` with recommended next steps
- `-RunArchiveQuery` flag calls `query-archives.ps1` live and folds fresh results into the report
- Template system: `CIC_Documentary` / `Family_Standard` / `Family_Premium` (auto-selected from `-Domain`)
- Output directory: `C:\CIC_MEDIA_LIBRARY\CIC\reports\`

**Outcome:** The same engine that generates CIC grant applications generates client research reports. **Revenue trigger unlocked — first paying client possible at $2,500.**

---

## **PHASE 55 — Interview Pipeline + Gap-Driven Feedback Loop**

**Status:** 55A–55B COMPLETE (2026-06-07); 55C–55D PENDING

**Strategic Purpose:** Phase 54 gap analysis identifies what's missing from the research. Phase 55 converts those gaps into two parallel research streams:
1. **Interview prompts** — Ask subjects/experts the questions raised by gaps
2. **Archive crawl directives** — Auto-feed gaps back to Phase 53 as targeted search queries, creating a self-reinforcing research loop

**Dual-use:** CIC Phase 2 historian interviews use the same framework. Family research business uses it for family member interviews — the premium differentiator that separates deep research from self-service.

---

### **Phase 55A — Gap-to-Interview-Prompt Converter**

**Status:** ✅ COMPLETE (2026-06-07)

**Purpose:** Parse Phase 54 gap analysis → convert into structured interview questions ranked by research value.

**Script:** `gap-to-interview-prompts.ps1`

**Inputs:**
- `report_gaps_latest.md` from Phase 54
- `genealogy_config.json` for person names and context
- `entity_graph.json` for related entities and timeline context

**Outputs:**
- `interview_prompts_latest.json` — structured prompt queue with priorities
- `interview_prompts_latest.md` — markdown guide for interviewer

**Logic:**
- Classify gaps into: **content** (High priority oral history), **entity** (relationship questions), **archive coverage** (system actions)
- Enrich with person names, dates, and related entities from config + graph
- Generate natural-language questions with follow-ups
- Rank by priority (High → Medium → Low) and gap type
- Annotate with answer type: `oral_history`, `names_dates`, `documents`, `system_action`

**Example Output:**
```json
{
  "id": "gap_content_sorensen_early_life",
  "priority": "High",
  "gap_type": "content",
  "entity": "Sorensen early life (1881–1904)",
  "question": "Tell us about your early years in Denmark. What was your childhood like, and what led your family to emigrate?",
  "follow_ups": [
    "What do you remember about your parents?",
    "Were there any events that prompted the emigration decision?",
    "Do you have memories or photos from that period?"
  ],
  "answer_type": "oral_history",
  "time_estimate_minutes": 15,
  "metadata": {
    "gap_source": "No documents found: Sorensen early life (1881–1904)",
    "related_entities": ["Charles Emil Sorensen", "Odense", "Denmark"]
  }
}
```

**Verification:**
```powershell
& "C:\CIC_MEDIA_LIBRARY\CIC\scripts\gap-to-interview-prompts.ps1" -Domain documentary
# Outputs: 4 High-priority content gaps → 4 interview prompts + system actions
```

---

### **Phase 55B — Reconciliation Loop (Gap-Driven Archive Crawling)**

**Status:** ✅ COMPLETE (2026-06-07)

**Purpose:** Convert gaps into archive search directives and orchestrate a full research iteration: gaps → directives → crawl → ingest → graph update → report regeneration.

**Script:** `reconciliation-loop.ps1`

**Workflow:**
1. Generate fresh report (optional)
2. Parse gaps from Phase 54
3. Convert **content gaps only** → archive search directives
4. Enqueue targets in `archive_crawl_queue.json`
5. Execute crawls via `query-archives.ps1`
6. Ingest results into entity sidecars
7. Rebuild entity graph (Phase 52)
8. Regenerate report (Phase 54)
9. Compare old gaps vs. new gaps → report closed vs. new gaps
10. Log iteration in `reconciliation_log.md`

**Gap → Directive Conversion:**

| Gap | Directive Query | Domain | Suggested Connectors |
|-----|-----------------|--------|----------------------|
| "Sorensen early life 1881–1904" | "Sorensen Denmark 1881 1904" | genealogy | Rigsarkivet, FamilySearch |
| "Willow Run construction 1941–1942" | "Willow Run B-24 Ford 1941 1942" | documentary | NARA RG179, BensonFord |
| "Sorensen departure from Ford 1944" | "Charles Sorensen Ford 1944" | documentary | BensonFord, BurtonDPL |
| "Post-Ford career 1944–1968" | "Willys-Overland Sorensen 1944–1968" | documentary | InternetArchive, Smithsonian |

**Crawl Queue (`archive_crawl_queue.json`):**
```json
{
  "items": [
    {
      "id": "dir_abc123",
      "query": "Sorensen Denmark 1881 1904",
      "domain": "genealogy",
      "priority": "High",
      "gap_source": "Sorensen early life (1881–1904)",
      "suggested_connectors": ["Rigsarkivet", "FamilySearch"],
      "max_attempts": 3,
      "executed": false,
      "results_count": 0
    }
  ]
}
```

**Invocation:**
```powershell
# Dry run: generate directives, don't execute
& "C:\CIC_MEDIA_LIBRARY\CIC\scripts\reconciliation-loop.ps1" `
  -Domain documentary `
  -DryRun $true

# Full iteration: gaps → crawl → graph → report
& "C:\CIC_MEDIA_LIBRARY\CIC\scripts\reconciliation-loop.ps1" `
  -Domain documentary `
  -GenerateReport $true `
  -IngestNewResults $true `
  -UpdateGaps $true `
  -FeedGapsToArchives $true
```

**Output Files:**
- `archive_crawl_queue.json` — persistent queue (survives restarts, allows manual editing)
- `archive_crawl_log.md` — per-execution log of crawled queries and result counts
- `reconciliation_log.md` — long-running log of all iterations (gap trends, closure rates)

**Verification (2026-06-07 Run):**
```
✓ Parsed 5 gaps from report
✓ Generated 4 interview prompts
✓ Created 3 archive directives
✓ Queued: Sorensen Denmark 1881 1904 [genealogy]
✓ Queued: Willow Run B-24 Ford [documentary]
✓ Queued: Charles Sorensen Ford 1944 [documentary]
✓ Regenerated report (updated gaps)
```

---

### **Phase 55C — Interview Audio/Video Ingestion**

**Status:** ✅ COMPLETED

**Purpose:** Capture responses to interview prompts, transcribe via OpenAI Whisper, and extract facts into structured sidecars.

**Implementation:**

**Script:** `whisper-transcriber.ps1` (helper)
- Validates audio file (MP4, WAV, MP3, MOV, M4A, FLAC, OGG; max 100MB)
- Calls OpenAI Whisper API with retry logic (max 2 retries, exponential backoff)
- Returns: transcript text, language, duration_seconds

**Script:** `interview-ingest.ps1` (orchestrator)
- Invokes Whisper via `whisper-transcriber.ps1`
- Extracts entities using deterministic regex patterns:
  - Dates: YYYY, MMM DD format, YYYY-MM-DD
  - Organizations: Ford Motor, Willys-Overland, NARA, FamilySearch, Rigsarkivet, etc.
  - Places: Denmark, Odense, Detroit, Michigan, etc.
  - People: Charles, Emil, Sorensen, Ford family members
- Maps transcript segments to interview prompts (hybrid: keyword matching + confidence scoring)
- Generates research_facts array with:
  - fact_id, fact_text, source_time_seconds, confidence (high/medium/low)
  - gap_reference (links to prompt_id for closure tracking)
  - entities_mentioned (people, places in context)
- Writes interview sidecar JSON mirroring document sidecars:
  - metadata_version, filename, media_type (audio), domain
  - recording_metadata (subject, interviewer, date, duration, file_size, format, quality)
  - transcription (full_transcript, transcribed_date, service, model, confidence, language)
  - interview_mapping (prompt_ids, gaps_addressed with segments and closure confidence)
  - entities_extracted (people, places, dates, organizations, events)
  - research_facts (array of extracted facts with gap references)
  - usage_flags (transcription_needs_review, entities_need_verification)

**Output Files:**
- `interview_<YYYYMMDD>_<subject>.json` — Sidecar with full transcription + entities + facts + gap mappings
- `research_log_interviews.md` — Appended with interview facts linked to gap closures

**Integration:**
- Reads from: `interview_prompts_latest.json` (Phase 55A output)
- Inputs audio from: `C:\CIC_MEDIA_LIBRARY\CIC\media\_Inbox\interviews\`
- Links gaps via prompt_id references
- Confidence levels (high/medium/low) track closure certainty for gap reconciliation

---

### **Phase 55D — Interview → Research Log (PENDING)**

**Purpose:** Convert transcribed interviews into structured evidence entries.

**Pipeline:**
- Parse interview extracts
- Map to interview prompt ID (which gap did this answer?)
- Generate Evidence Explained citations where applicable
- Create research log entries with: source (interview), date, subject, facts extracted
- Track gap closure: mark which gaps were partially/fully answered

**Output:** `research_log_interviews.md` — interview-sourced entries integrated into final report evidence section.

---

### **Gap-Driven Loop Integration**

**Full cycle:**
```
Phase 54 Report (gaps)
        ↓
Phase 55A: Convert gaps → interview prompts + archive directives
        ↓ (parallel)
        ├→ Interviewer uses prompts_latest.md
        │   ├→ Records audio/video
        │   ├→ Phase 55C: Ingest, transcribe, extract
        │   ├→ Phase 55D: Convert to research log
        │   └→ Feeds back to entity graph
        │
        └→ Phase 55B: Reconciliation loop
            ├→ Enqueue directives in crawl_queue.json
            ├→ Execute crawls via Phase 53
            ├→ Ingest results → entity sidecars
            ├→ Phase 52: Rebuild graph
            └→ Phase 54: Regenerate report (fresh gaps)
```

**Termination condition:**  Gap count stabilizes (≥ 3 iterations with 0 new gaps closed) OR project timeline/budget constraints.

**Outcome:** A self-reinforcing research engine where gaps → interviews → archive discoveries → updated graph → refined gaps. Each iteration increases research depth and narrative completeness.

---

## **PHASE 56 — Client Delivery Portal (CDP)**

**Status:** PENDING

**Dual-use:** CIC needs secure distribution of grant applications, press kits, and treatment documents to funders and festival programmers. Family history business needs an E2EE client portal — the privacy gap no competitor fills.

### Deliverables
- Lightweight portal layer on `operator-ui` base
- Client account scoping: each client sees only their project files
- Expiring access links: time-limited download URLs (7/30/90 day options)
- Audit trail: log every file access with timestamp and IP
- Delivery packages: zip archive of report PDF + evidence register + timeline + gap analysis
- Rights/consent tracking: per-document client consent status
- Optional E2EE: files encrypted at rest with client-held key
- CIC use: distributor/funder receives scoped portal view for grant review

**Outcome:** Clients receive a private, professional portal. CIC funders receive a scoped grant review environment. Same codebase, different personas.

---

## **🗺️ FHRB Dependency Order & Sequencing**

```
Phase 50 (OCR)           ← COMPLETE — unblocks everything below
Phase 51 (Taxonomy)      ← Low effort; do alongside Phase 52
Phase 52 (Entity Graph)  ← Medium; needed before Phase 54 report generator
Phase 53 (Archive APIs)  ← Medium; can run in parallel with Phase 52
Phase 54 (Report Gen)    ← Depends on 50+52; this IS the product deliverable
Phase 55 (Interviews)    ← Start when CIC Phase 2 historian outreach begins
Phase 56 (Portal)        ← Start when first client engagement confirmed
```

**The MVP:** Phases 50 + 51 + 54 = a complete research-to-report pipeline. Everything else is an enhancement.

**Revenue trigger:** Phase 54 complete → first paying client possible at $2,500 basic package.

---

## **📊 FHRB Service Tiers**

| Package | Scope | Price | Phases Required |
|---|---|---|---|
| **Discovery** | 25 hrs research, 10-page narrative report, timeline | $2,500 | 50, 51, 54 |
| **Standard** | 50 hrs research, full report, entity graph, gap analysis | $5,000 | 50–54 |
| **Premium** | 100 hrs research, all above + interviews, portal access | $8,500 | 50–56 |
| **Archive Digitization** | Client ships documents; OCR, classify, return organized archive | $1,500 flat | 50, 51 |

**See:** `FAMILY_HISTORY_BUSINESS_PLAN.md` for full commercial model, marketing strategy, and go-to-market plan.

---

# **KNOWN ISSUES & BUGS**

## **Wayland W1-W3 Deployment (2026-06-09)**

**Status:** STAGING — Known issues identified, deploying as-is for validation

### Critical Issues (Fix Before Production)

| ID | Component | Issue | Impact | Priority |
|---|---|---|---|---|
| WIL-001 | MCP Server | Stack traces expose internals in JSON logs | Sensitive information leak | HIGH |
| WIL-002 | MCP Server | No request size limit; unbounded `body += chunk` can OOM | DoS/crash risk | HIGH |
| WIL-003 | Workflows | Notification template variables fragile; if Wayland doesn't populate {{var}}, stale/empty data sent to Slack | Alert noise, missed actual failures | HIGH |
| WIL-004 | Config.ron | Missing env vars at startup fail silently (empty webhook URLs) | Notifications won't send, no startup error | HIGH |

### Medium Issues (Fix Before Wider Rollout)

| ID | Component | Issue | Impact | Priority |
|---|---|---|---|---|
| WIL-005 | MCP Server | ✅ FIXED: Per-IP rate limiting (100 req/60s, 429 response) | DoS prevention | MEDIUM |
| WIL-006 | Workflows | ✅ FIXED: Exponential backoff (1s → 2s → 4s → ... → 30s max) | Retry storm prevention | MEDIUM |
| WIL-007 | Workflows | ✅ FIXED: Dynamic log URLs (CIC_LOGS_BASE_URL env var) | 404 link prevention | MEDIUM |
| WIL-008 | validate-workflows.js | ✅ FIXED: Bracket-matching RON parser (not regex) | Robust validation | MEDIUM |

### Low Issues (Nice-to-Have)

| ID | Component | Issue | Impact | Priority |
|---|---|---|---|---|
| WIL-009 | validate-workflows.js | No async checks; only verifies script existence, not executable perms or validity | Edge case coverage | LOW |
| WIL-010 | validate-workflows.js | Skill stages (improvement-analysis) not validated | Incomplete validation coverage | LOW |
| WIL-011 | .env.example | Placeholder values not realistic; webhook URLs are long, example length confusing | Onboarding friction | LOW |
| WIL-012 | config.ron | No fallback if Slack unavailable; workflows hang silently | Resilience improvement | LOW |

### Fix Timeline

**✅ COMPLETED (2026-06-10):** WIL-001 through WIL-008
- WIL-001: Stack traces scrubbed in production logs
- WIL-004: Env var validation at startup
- WIL-006: Exponential backoff for retries (1s → 2s → 4s → ... → 30s max)
- WIL-007: Dynamic log URLs (CIC_LOGS_BASE_URL env var)
- WIL-005: Rate limiting (100 req/60s per IP, returns 429)
- WIL-008: Robust RON parsing (bracket matching instead of regex)

**Before Production Release (2026-06-22):** ✅ All critical + medium issues done
**V1.1 Enhancement:** WIL-009 through WIL-012

### Workarounds for Staging

- Monitor logs for template var mismatches (WIL-003)
- Set SLACK_WEBHOOK_* before startup (WIL-004)
- Validate on deploy: `node scripts/validate-workflows.js`
- Rate-limit at reverse proxy layer (WIL-005)
