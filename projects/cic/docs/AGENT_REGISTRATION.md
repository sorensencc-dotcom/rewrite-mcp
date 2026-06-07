# Agent Registration & Flow Template Guide

**Status**: ✅ Phase A+B Complete — Agents Registered, Flow Templates Configured

---

## Architecture Overview

CIC uses a **multi-agent orchestration** model:

```
┌─────────────────────────────────────────────────────────────┐
│                 Operator Console (React UI)                 │
│              Visualizes execution & observability            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP API
┌────────────────────────▼────────────────────────────────────┐
│                 CIC Context Service                          │
│            (Express Server on :8080)                         │
│                                                              │
│  POST /flow/execute → start flow                            │
│  GET /flow/execution/:id → query status                     │
│  GET /flows → list templates                                │
└────────────┬──────────────────────────────────┬─────────────┘
             │                                  │
    ┌────────▼────────┐              ┌─────────▼────────┐
    │ FlowOrchestrator │              │  FlowRegistry    │
    │ (async executor) │              │ (template store) │
    └────────┬────────┘              └──────────────────┘
             │
    ┌────────▼────────────────────────┐
    │      Mock Agent Clients          │
    │ (invoked via AgentClient.invoke) │
    │                                  │
    │  • code-analyzer                 │
    │  • call-graph-extractor          │
    │  • narrative-linker              │
    │  • context-synthesizer           │
    │  • idea-parser                   │
    │  • idea-classifier               │
    │  • refactor-proposal-engine      │
    │  • test-generator                │
    └──────────────────────────────────┘
```

---

## Registered Agents (Phase A)

All agents are defined in **`data/agents.json`** with:
- Agent ID, name, description
- Available methods (invoke signatures)
- Input/output schemas
- Timeout and retry policies

### Agent Catalog

| Agent ID | Methods | Purpose |
|----------|---------|---------|
| `code-analyzer` | `analyze`, `classify_patterns`, `find_dependencies` | Analyzes code structure & patterns |
| `call-graph-extractor` | `extract`, `analyze_flows` | Extracts call graphs & control flow |
| `narrative-linker` | `find_related_docs`, `link_narrative` | Links documentation & narratives |
| `context-synthesizer` | `merge`, `synthesize` | Merges code + narrative context |
| `idea-parser` | `parse`, `extract_metadata` | Parses incoming ideas |
| `idea-classifier` | `classify`, `score` | Classifies & scores ideas |
| `refactor-proposal-engine` | `propose`, `suggest_improvements` | Generates refactoring proposals |
| `test-generator` | `generate_tests`, `coverage_analysis` | Generates test cases |

---

## Flow Templates (Phase B)

All templates are defined in **`data/flows.json`** with:
- Template ID, version, description
- Multi-stage workflow definition
- Agent tasks per stage
- Serial/parallel execution modes
- Template variable interpolation

### Available Flows

#### 1. **flow-analyze-repository-v1**
Complete repository analysis: structures, patterns, dependencies, documentation.

```
Stage 1: Extract Code Structures (parallel)
  ├─ code-analyzer::analyze
  └─ call-graph-extractor::extract

Stage 2: Link Documentation (serial)
  └─ narrative-linker::find_related_docs

Stage 3: Synthesize Context (serial)
  └─ context-synthesizer::merge
```

#### 2. **flow-refactor-proposal-v1**
Generate refactoring proposals with risk assessment.

```
Stage 1: Analyze Target (parallel)
  ├─ code-analyzer::classify_patterns
  └─ call-graph-extractor::analyze_flows

Stage 2: Generate Proposals (serial)
  └─ refactor-proposal-engine::propose
```

#### 3. **flow-generate-tests-v1**
Analyze code and generate comprehensive test coverage.

```
Stage 1: Code Analysis (serial)
  └─ code-analyzer::analyze

Stage 2: Generate Tests (serial)
  └─ test-generator::generate_tests
```

#### 4. **flow-idea-pipeline-v1**
End-to-end idea processing: parse, classify, score.

```
Stage 1: Parse Idea (serial)
  └─ idea-parser::parse

Stage 2: Classify & Score (serial)
  └─ idea-classifier::score
```

#### 5. **flow-multi-stage-analysis-v1**
Advanced analysis combining code, patterns, and proposals.

```
Stage 1: Extract (parallel × 3 agents)
  ├─ code-analyzer::analyze
  ├─ call-graph-extractor::extract
  └─ code-analyzer::classify_patterns

Stage 2: Link & Synthesize (parallel × 2)
  ├─ narrative-linker::find_related_docs
  └─ context-synthesizer::merge

Stage 3: Propose Improvements (serial)
  └─ refactor-proposal-engine::suggest_improvements
```

---

## Execution Model

### FlowOrchestrator

**Location**: `ruflo-orchestration/FlowOrchestrator.ts`

Executes flows with:
- **Stage coordination** — serial/parallel execution
- **Template interpolation** — `{{input.x}}` and `{{stages[n].output}}` substitution
- **Retry logic** — configurable backoff strategies
- **Timeout enforcement** — per-task and per-stage timeouts
- **Span recording** — full observability trace

### Example: Executing a Flow

```bash
curl -X POST http://localhost:8080/flow/execute \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "flow-analyze-repository-v1",
    "input": {
      "context_id": "ctx-demo-repo-001"
    }
  }'

# Response:
{
  "execution_id": "exec-1717584720000-a1b2c3d4e5",
  "template_id": "flow-analyze-repository-v1",
  "status": "queued",
  "created_at": "2026-06-05T13:32:00Z"
}
```

### Check Execution Status

```bash
curl http://localhost:8080/flow/execution/exec-1717584720000-a1b2c3d4e5
```

---

## Adding New Agents (Future)

1. **Register in `data/agents.json`**:
   ```json
   {
     "id": "new-agent",
     "name": "New Agent Name",
     "methods": ["method1", "method2"],
     "timeout_ms": 30000,
     "status": "active"
   }
   ```

2. **Implement AgentClient interface** in `src/agents/`:
   ```typescript
   export class NewAgent implements AgentClient {
     async invoke(method, input, traceId) {
       // Implementation
     }
   }
   ```

3. **Register in ContextServer.createMockAgents()**:
   ```typescript
   "new-agent": new NewAgent(),
   ```

4. **Use in flow templates** (`data/flows.json`):
   ```json
   {
     "agent": "new-agent",
     "method": "method1",
     "input": {...}
   }
   ```

---

## Adding New Flow Templates (Future)

1. **Define in `data/flows.json`**:
   ```json
   {
     "id": "flow-new-workflow-v1",
     "version": "1.0.0",
     "description": "New workflow description",
     "status": "active",
     "stages": [...]
   }
   ```

2. **Reference registered agents** in stages:
   ```json
   {
     "agent": "agent-id",
     "method": "method-name",
     "input": {
       "param1": "{{input.value}}",
       "param2": "{{stages[0].output}}"
     }
   }
   ```

3. **Reload flows** via `FlowLoader.loadAndRegister()`

---

## Mock Agents (Phase A)

Current implementation uses **mock agents** that:
- Accept any method + input
- Return synthetic responses
- Simulate processing time
- Log execution for observability

**Real agents** (Phase C) will:
- Invoke actual code analyzers, LLMs, etc.
- Implement retry + timeout logic
- Publish real metrics
- Support streaming responses

---

## Testing First Flow

Run the end-to-end test:

```bash
cd projects/cic
npm run test:first-flow
```

Expected output:
```
╔════════════════════════════════════════════════════════════════╗
║         CIC First Flow Execution — End-to-End Test             ║
╚════════════════════════════════════════════════════════════════╝

📦 [1] Initializing Flow Registry...
   ✓ Registry initialized

📂 [2] Loading Flow Templates from data/flows.json...
   ✓ Loaded 5 flow templates

📋 [3] Available Flows:
   • flow-analyze-repository-v1 (Complete repository analysis...)
   • flow-refactor-proposal-v1 (Generate refactoring proposals...)
   ...

🚀 [4] Executing Flow: flow-analyze-repository-v1
   Input: context_id=ctx-demo-repo-001, repo=CIC
   Trace ID: trace-1717584720000-abc123

✅ [6] Flow Execution Complete
   Status: completed
   Duration: 2457ms
   Stages Completed: 3
   Spans Recorded: 5

📊 [7] Execution Timeline (Spans):
   1. stage-extract-code
      Agent: code-analyzer
      Duration: 312ms
      Status: completed
   ...
```

---

## Next Phase: Real Agent Integration

**Phase C (Future)** will:

1. **Implement real agent clients**
   - Claude API integration
   - Code analyzer microservice
   - Narrative search engine
   - Test generation framework

2. **Agent registry**
   - Dynamic agent discovery
   - Health checks + readiness probes
   - Request routing + load balancing

3. **Flow execution at scale**
   - Distributed execution
   - Queue-based task scheduling
   - Horizontal scaling

4. **Production observability**
   - Prometheus metrics export
   - OpenTelemetry tracing
   - Performance dashboards

---

## Files

- **Agent manifest**: `data/agents.json`
- **Flow templates**: `data/flows.json`
- **Repository metadata**: `data/repos.json`
- **Registry**: `ruflo-orchestration/FlowRegistry.ts`
- **Orchestrator**: `ruflo-orchestration/FlowOrchestrator.ts`
- **Flow loader**: `ruflo-orchestration/FlowLoader.ts`
- **Mock agents**: `src/agents/MockAgentClients.ts`
- **Test script**: `scripts/test-first-flow.ts`

---

**Ready for Phase C: Real Agent Integration**

