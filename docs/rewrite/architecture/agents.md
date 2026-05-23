# Agents

Rewrite Labs uses a multi-agent architecture where specialized agents are coordinated by a central Orchestrator.

## Agent Coordination (v2.1)

Rewrite Labs uses a **High-Concurrency Multi-Agent Architecture**.

### Parallel Orchestration

Agents no longer execute in a strict linear sequence. The Orchestrator triggers multiple specialized agents in parallel, significantly reducing the total pipeline latency for complex jobs.

### Resilience & Safe-Mode

Every agent is protected by the **Flash-Grade Fallback Layer**. If the model tier fails after all retries and fallbacks (Gemini → Claude → Llama), the agent enters **Safe-Mode**. In this state, it returns a deterministic, schema-valid object from the `safeModeTemplates/` library, ensuring the pipeline can proceed even with partial results.

### MAS Routing Layer

The **Synergy Analyzer** (`src/mas/synergyAnalyzer.js`) intercepts agent telemetry packets between execution steps and emits routing directives consumed by the Orchestrator. Directives are deterministically hashed into a `correlationId` and linked to the run trace. Agents also share intermediate state via the **Blackboard** (`src/mas/blackboard.js`), a typed, WAL-persisted shared memory plane.

## Agent Types

### Harvester

- **Role**: Ingestion and Data Retrieval.
- **Task**: Connects to sources (Google Drive, Web, etc.) and extracts raw data for processing.
- **Integration**: PMS-driven extraction logic.

### Task Interpreter

- **Role**: Intent Analysis.
- **Task**: Analyzes incoming jobs to determine the `taskType` and confidence levels.
- **Prompt Pack**: `orchestrator_planning_v1` (mode: `task_interpretation`).

### Agent Planner

- **Role**: Strategy & Workflow Generation.
- **Task**: Determines the sequence of agents (the "pipeline") and specific inputs for each step.
- **Prompt Pack**: `orchestrator_planning_v1` (modes: `pipeline_selection`, `plan_generation`).

### Agent Executor

- **Role**: Specialized Action.
- **Task**: Executes specific instructions (e.g., extraction, classification, summarization).
- **Prompt Pack**: `orchestrator_agent_v1`.

### Synthesizer

- **Role**: Final Output Generation.
- **Task**: Merges multiple agent outputs into a cohesive final deliverable (Text or JSON).
- **Prompt Pack**: `orchestrator_synthesis_v1`.
