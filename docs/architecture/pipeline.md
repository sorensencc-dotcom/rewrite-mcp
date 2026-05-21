# Pipeline

The Rewrite Labs pipeline is a multi-stage process that transforms raw data into high-value intelligence.

## Pipeline Lifecycle

### 1. Ingestion (Harvester)

Raw data is collected from sources and stored in context memory. The Harvester uses the Prompt Management System (PMS) to load versioned prompt packs (e.g., `analysis_v1`, `research_v1`) which ensure consistent, deterministic data extraction and classification across different file types and sources.

### 2. Orchestration

The Orchestrator manages the intelligence generation process:

1. **Task Interpretation**: The system determines what the user wants.
2. **Pipeline Selection**: The Orchestrator chooses which specialized agents are required.
3. **Plan Generation**: A step-by-step execution plan is created.
4. **Agent Execution**: Specialized agents process the data according to the plan.
5. **Synthesis**: Agent outputs are combined into the final result.

### 3. MAS Routing (Phase 27/28)

Between each orchestration step, the **Synergy Analyzer** evaluates the executing agent's telemetry packet and emits a routing directive. The Orchestrator consumes this directive to adapt the execution plan mid-run — re-running an agent on high drift, triggering speculative parallel runs on low confidence, or skipping non-critical agents under queue pressure. All directives carry a SHA-256-derived `correlationId` for end-to-end trace linkage.

Agent intermediate state is written to the **Blackboard** (`data/mas-blackboard.json`), enabling downstream agents to read facts, signals, and hypotheses produced by upstream agents without coupling to their execution order.

## Telemetry & Governance

- **PMS Drift Detection**: Every stage checks its prompt packs for drift before execution.
- **Token Metering**: Usage is tracked across the entire pipeline.
- **Deterministic Planning**: All planning steps are recorded for audit and reproducibility.
- **MAS Correlation**: Every routing decision is hashed and linked to the originating telemetry packet.
