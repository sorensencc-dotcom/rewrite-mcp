# Technical specification: Embedded DuckDB agent analytics engine

- **Document ID**: `SPEC-REWRITE-MCP-DUCKDB-ANALYTICS-01`
- **Related RFC**: [`wiki/research/rfc-evaluate-embedded-duckdb-agent-analytics.md`](file:///C:/dev/wiki/research/rfc-evaluate-embedded-duckdb-agent-analytics.md)
- **Target Subsystem**: `rewrite-mcp/src/analytics/` & `planning-console`
- **Status**: `APPROVED_FOR_BUILD`
- **Owner**: `Rewrite Labs / Toolforge Core`
- **Date**: `2026-10-03`

---

## 1. System architecture and operational topology

The Embedded DuckDB Agent Analytics Engine provides in-process, vectorized OLAP analytics over heterogeneous agent execution logs. It aggregates token consumption, tool execution latencies, error distributions, and session trajectories without running external database daemons.

```
+-------------------------------------------------------------------------------+
|                       Agent Session Fleet (Rewrite-MCP)                       |
|   (Antigravity / Claude Code / Codex / Devin Session Trajectories)            |
+---------------------------------------+---------------------------------------+
                                        | Append-only event streaming
                                        v
+-------------------------------------------------------------------------------+
|                    Partitioned Storage & Compaction Layer                     |
|   - Hot tier: Raw session JSONL (.gemini/brain/*/logs/transcript.jsonl)       |
|   - Warm tier: Daily Parquet partitions (data/analytics/year=YYYY/month=MM/)  |
|   - Compactor: Micro-batch background worker (Zstandard compression)          |
+---------------------------------------+---------------------------------------+
                                        | Vectorized scan (read_parquet / JSON)
                                        v
+-------------------------------------------------------------------------------+
|                  DuckDB Analytics Engine (In-Process OLAP)                    |
|   - Ephemeral in-memory instances (':memory:')                                |
|   - Hard memory ceiling (SET max_memory = '512MB')                            |
|   - Arrow / Columnar SIMD query execution                                     |
+-------------------+-----------------------------------+-----------------------+
                    |                                   |
                    v                                   v
+-----------------------------------+   +---------------------------------------+
|   Rewrite Planning Console API    |   |     Autonomous Governance Sentinel    |
|   - P95 latency by tool           |   |     - Infinite loop / retry detection |
|   - Token burn rate by model      |   |     - Autonomous budget thresholding  |
+-----------------------------------+   +---------------------------------------+
```

---

## 2. Telemetry event schema contract

All agent runtimes must emit telemetry conforming to the following strict schema definitions:

### 2.1 Event data types & Parquet mapping

| Field Name | JSON Type | Parquet Type | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `session_id` | `string` | `VARCHAR` | No | Unique session UUID or conversation ID |
| `step_index` | `number` | `INTEGER` | No | 1-indexed execution step counter |
| `timestamp` | `string` | `TIMESTAMPTZ` | No | ISO 8601 UTC timestamp (`YYYY-MM-DDTHH:mm:ss.sssZ`) |
| `agent_role` | `string` | `VARCHAR` | No | Role identifier (`orchestrator`, `builder`, `reviewer`) |
| `model` | `string` | `VARCHAR` | No | LLM model identifier (`gemini-3.7-flash`, `claude-3-5-sonnet`) |
| `prompt_tokens` | `number` | `BIGINT` | No | Input context tokens consumed |
| `completion_tokens`| `number` | `BIGINT` | No | Output generation tokens consumed |
| `tool_name` | `string` | `VARCHAR` | Yes | Name of tool executed (null for pure response steps) |
| `duration_ms` | `number` | `DOUBLE` | No | Step or tool wall-clock duration in milliseconds |
| `status` | `string` | `VARCHAR` | No | Step status (`SUCCESS`, `ERROR`, `CANCELLED`) |
| `error_type` | `string` | `VARCHAR` | Yes | Error classification category (null on success) |
| `exit_code` | `number` | `INTEGER` | Yes | Subprocess exit code when applicable |

### 2.2 TypeScript interface contract

```typescript
export interface AgentTelemetryEvent {
  session_id: string;
  step_index: number;
  timestamp: string;
  agent_role: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  tool_name?: string | null;
  duration_ms: number;
  status: 'SUCCESS' | 'ERROR' | 'CANCELLED';
  error_type?: string | null;
  exit_code?: number | null;
}
```

---

## 3. DuckDB engine abstraction and concurrency model

### 3.1 In-process lifecycle and resource limits
To protect workstation stability during heavy multi-agent execution:
1. **Memory boundary**: The engine sets `SET max_memory = '512MB'` upon connection initialization.
2. **Thread bounding**: Thread allocation is capped via `SET threads = 4` to prevent CPU starvation of active language models.
3. **Connection reuse**: Query workers instantiate ephemeral in-memory databases (`:memory:`) and scan files directly using `read_parquet()` and `read_json_auto()`.

### 3.2 Concurrency and Windows file-locking discipline
Windows NTFS file locks block multi-process write access when an engine opens a persistent database catalog file.
To guarantee conflict-free concurrency:
1. **Decoupled write paths**: Agent workers append only to isolated JSONL logs or individual partition Parquet files.
2. **Read-only query sessions**: The analytics engine connects to `:memory:` and queries partition paths via glob expressions (`data/analytics/year=2026/month=10/*.parquet`), eliminating catalog lock contention.
3. **Zero-native fallback**: When native C++ addons fail to bind, the engine seamlessly routes queries to the streaming JavaScript evaluator ([`scripts/evaluate-duckdb-analytics.mjs`](file:///C:/dev/scripts/evaluate-duckdb-analytics.mjs)).

---

## 4. Compaction daemon and partition layout

### 4.1 Directory structure
```
data/analytics/
  ├── raw/                           # Ephemeral hot-tier JSONL staging
  │   └── session-14b2f0be.jsonl
  └── partitions/                    # Compressed warm-tier Parquet partitions
      └── year=2026/
          └── month=10/
              ├── day=01/
              │   └── events.parquet
              ├── day=02/
              │   └── events.parquet
              └── day=03/
                  └── events.parquet
```

### 4.2 Compaction execution cycle
The compactor daemon (`scripts/compact-agent-analytics.mjs`) executes on a 1-hour interval or session wrap-up:
1. **Discovery**: Scans `data/analytics/raw/*.jsonl` for closed sessions.
2. **Micro-batch transform**: Reads JSONL records, validates types against the schema contract, and writes Zstandard-compressed Parquet chunks.
3. **Atomic swap & tombstone**: Replaces raw JSONL files with a tombstone receipt and updates the partition catalog.

---

## 5. Query API interface specification

The analytics service exposes four core typed methods:

### 5.1 Tool latency & performance distribution
```typescript
export interface ToolPerformanceMetric {
  tool_name: string;
  total_invocations: number;
  total_errors: number;
  error_rate_pct: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
}

export async function getToolPerformanceMetrics(
  dateRange: { start: string; end: string }
): Promise<ToolPerformanceMetric[]>;
```

### 5.2 Token burn rate and cost attribution
```typescript
export interface TokenExpenditureMetric {
  model: string;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  session_count: number;
}

export async function getTokenExpenditure(
  dateRange: { start: string; end: string }
): Promise<TokenExpenditureMetric[]>;
```

### 5.3 Error categorization and failure clustering
```typescript
export interface ErrorDistributionMetric {
  error_type: string;
  tool_name: string;
  occurrence_count: number;
  sample_session_id: string;
}

export async function getErrorDistribution(
  limit?: number
): Promise<ErrorDistributionMetric[]>;
```

### 5.4 Session trajectory breakdown
```typescript
export interface SessionTrajectorySummary {
  session_id: string;
  agent_role: string;
  total_steps: number;
  duration_ms: number;
  total_tokens: number;
  error_count: number;
  tools_used: string[];
}

export async function getSessionTrajectory(
  sessionId: string
): Promise<SessionTrajectorySummary | null>;
```

---

## 6. Verification and conformance gates

To pass the conformance gate, the implementation must satisfy three verification checks:

1. **Gate 1: Contract correctness**:
   - `npm test tests/analytics-engine.test.ts` passes with 100% assertion coverage across all aggregation methods.
2. **Gate 2: Vectorized throughput**:
   - Querying 100,000 synthetic records executes in $< 25\text{ ms}$ on local developer hardware.
3. **Gate 3: Windows concurrency stress test**:
   - 4 concurrent processes appending to distinct JSONL files while 2 query workers execute continuous P95 latency scans must complete with 0 lock errors and 0 dropped records.
