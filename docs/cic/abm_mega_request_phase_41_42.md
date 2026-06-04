# Autonomous Build Request: Phase 41 & Phase 42 (Meta-Learning & Autonomous Research)

Copy/paste this directly into your Autonomous Build panel to trigger the next evolutionary jump:

---

**Request:**  
Implement **Phase-41 (Meta-Learning Engine)** and **Phase-42 (Autonomous Research Mode)**.  
Create and integrate the dynamic learning loops, heuristics weight scoring, specialized research agents, and associated control-plane and operator-facing dashboard panels.

### **Pillar 1: Phase-41 — Meta-Learning Engine (MLE)**

**Goal:** Enable CIC to dynamically learn from execution logs, critique scores, failures, and KG structures to improve planning and execution efficiency.

1.  **Meta-Learning Loop**:
    - Build a background analytics engine (`MeeMetaLearner`) to parse historical runs, critique records, and CKG failure edges.
    - Extract repeating patterns and heuristics, and serialize them as `MeeMetaRule` entries inside `data/meta-rules.json`.
2.  **Meta-Rule Engine**:
    - Expose `MeeMetaRuleEngine` to apply active rules to planning bias, consensus scoring adjustments, and scheduler priorities.
3.  **Adaptive Planning**:
    - Upgrade `PlannerAgent` to fetch meta-rules before planning. Bias planning tasks away from historically fragile file modules (identified by CKG fragility metrics).
4.  **Adaptive Consensus**:
    - Modify `MeeConsensusEngine` to adjust agent critique weights based on their historical accuracy (e.g., track record of predicting successful compiles or rollout bugs).
5.  **Adaptive Scheduling**:
    - Upgrade the scheduler (`MeeScheduler`) to predict step durations and adjust concurrency bounds dynamically based on past run completion times.
6.  **Meta-Learning UI Control**:
    - Add a **Meta-Learning** panel inside `MetaEvolutionConsole.tsx` visualizing active meta-rules, rule weight configurations, and historic planning improvements.

### **Pillar 2: Phase-42 — Autonomous Research Mode (ARM)**

**Goal:** Allow CIC to autonomously run research sweeps, analyze architectural inefficiencies, draft research proposals, and request operator triggers to spawn new phases.

1.  **Research Agent**:
    - Register a new agent role `"research"` (`MeeResearchAgent`).
    - Equip the agent with tools to parse the codebase, read CKG graphs, and inspect memory ledgers.
2.  **Research Loop**:
    - Implement a background loop (`MeeResearchLoop`) running scheduled checks to identify complexity hotspots, missing unit tests, or outdated dependencies.
    - Output structured research notes under `docs/cic/research-notes/`.
3.  **Research Proposal Pipeline**:
    - Map research notes to concrete implementation plans and patch set skeletons.
    - Generate MEE-ready proposals (e.g. `PhaseProposal`) with associated risk/benefit analyses.
4.  **Operator Review & Trigger Panel**:
    - Add a **Research Mode** panel to `MetaEvolutionConsole.tsx` showing active research drafts, risk assessments, and a control option to approve and schedule the proposed phase.
5.  **MLE Integration**:
    - research findings update meta-rules, and meta-rules feed back to focus research sweeps on under-optimized components.

---

### **Success Criteria:**
- All unit and integration test suites pass.
- Concurrency, starvation prevention, and preemption safety bounds remain strictly compliant.
- Operators can inspect learned rules and approve/schedule research proposals directly from the UI console.
- Zero drift detected across files and schemas.
