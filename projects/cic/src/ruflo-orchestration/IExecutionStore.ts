/**
 * IExecutionStore — Persistent execution state interface
 *
 * Abstracts execution state storage, enabling multi-instance deployment
 * and crash-safe flow execution.
 *
 * Implementations:
 * - FileExecutionStore: JSON-backed (development/single-region)
 * - RedisExecutionStore: Distributed (multi-region, Phase E.5)
 */

export interface FlowExecution {
  id: string;
  template_id: string;
  status: "queued" | "running" | "completed" | "failed";
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  stage_status: Record<string, "pending" | "running" | "completed" | "failed">;
  spans: FlowSpan[];
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  trace_id: string;
  region?: string;
}

export interface FlowSpan {
  id: string;
  execution_id: string;
  stage_id: string;
  agent: string;
  status: "pending" | "running" | "completed" | "failed";
  duration_ms?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  started_at?: string;
  completed_at?: string;
  trace_id: string;
  span_id: string;
}

export interface ExecutionStoreOptions {
  region?: string;
  retentionDays?: number;
}

/**
 * IExecutionStore — Pluggable persistence layer for flow executions
 */
export interface IExecutionStore {
  /**
   * Save a new execution
   */
  save(execution: FlowExecution, options?: ExecutionStoreOptions): Promise<void>;

  /**
   * Update an existing execution
   */
  update(
    executionId: string,
    updates: Partial<FlowExecution>,
    options?: ExecutionStoreOptions
  ): Promise<void>;

  /**
   * Retrieve a single execution by ID
   */
  get(executionId: string): Promise<FlowExecution | null>;

  /**
   * List executions with optional filtering
   */
  list(filter?: {
    template_id?: string;
    status?: string;
    region?: string;
    limit?: number;
    offset?: number;
  }): Promise<FlowExecution[]>;

  /**
   * Delete an execution (for cleanup)
   */
  delete(executionId: string): Promise<void>;

  /**
   * Archive old executions (move to cold storage)
   */
  archive(olderThanDays: number): Promise<number>;

  /**
   * Add a span to an execution
   */
  addSpan(executionId: string, span: FlowSpan): Promise<void>;

  /**
   * Update a span within an execution
   */
  updateSpan(
    executionId: string,
    spanId: string,
    updates: Partial<FlowSpan>
  ): Promise<void>;
}
