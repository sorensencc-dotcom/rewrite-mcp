/**
 * Ruflo Flow Registry
 * Manages multi-agent flow templates and execution
 * With optional persistent execution state via IExecutionStore
 */

import { IExecutionStore, FlowExecution as StoredFlowExecution, FlowSpan as StoredFlowSpan } from "./IExecutionStore.js";

export interface FlowTemplate {
  id: string; // e.g., "flow-context-enrichment-v1"
  version: string; // semantic version
  description: string;
  status: "draft" | "active" | "deprecated";

  // Flow definition
  stages: FlowStage[];

  // Metadata
  created_at: string;
  updated_at: string;
  owner: string; // team or person
}

export interface FlowStage {
  id: string;
  name: string;
  type: "serial" | "parallel";

  // Agents to invoke
  agents: AgentTask[];

  // Conditional routing
  if?: string; // boolean expression
  on_error?: "continue" | "skip" | "fail";
}

export interface AgentTask {
  agent: string; // e.g., "idea-harvest-agent", "code-analyzer"
  method: string; // e.g., "analyze", "classify"
  input: Record<string, unknown>;

  // Retry policy
  retry?: {
    max_attempts: number;
    backoff: "exponential" | "linear";
    initial_delay_ms: number;
  };

  // Timeout
  timeout_ms?: number;
}

export interface FlowExecution {
  id: string;
  template_id: string;
  status: "queued" | "running" | "completed" | "failed";

  // Input/output
  input: Record<string, unknown>;
  output?: Record<string, unknown>;

  // Tracking
  created_at: string;
  started_at?: string;
  completed_at?: string;

  // State
  stage_index: number;
  stage_status: Record<string, "pending" | "running" | "completed" | "failed" | "skipped">;

  // Observability
  trace_id: string;
  spans: FlowSpan[];
}

export interface FlowSpan {
  id: string;
  span_id: string;
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
}

/**
 * In-memory execution store (fallback for tests)
 */
class MemoryExecutionStore implements IExecutionStore {
  private executions = new Map<string, StoredFlowExecution>();

  async save(execution: StoredFlowExecution): Promise<void> {
    this.executions.set(execution.id, execution);
  }

  async update(executionId: string, updates: Partial<StoredFlowExecution>): Promise<void> {
    const exec = this.executions.get(executionId);
    if (!exec) throw new Error(`Execution not found: ${executionId}`);
    this.executions.set(executionId, { ...exec, ...updates });
  }

  async get(executionId: string): Promise<StoredFlowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  async list(): Promise<StoredFlowExecution[]> {
    return Array.from(this.executions.values());
  }

  async delete(executionId: string): Promise<void> {
    this.executions.delete(executionId);
  }

  async archive(): Promise<number> {
    return 0;
  }

  async addSpan(executionId: string, span: StoredFlowSpan): Promise<void> {
    const exec = this.executions.get(executionId);
    if (!exec) throw new Error(`Execution not found: ${executionId}`);
    exec.spans.push(span);
    await this.save(exec);
  }

  async updateSpan(executionId: string, spanId: string, updates: Partial<StoredFlowSpan>): Promise<void> {
    const exec = this.executions.get(executionId);
    if (!exec) throw new Error(`Execution not found: ${executionId}`);
    const spanIdx = exec.spans.findIndex((s) => s.id === spanId);
    if (spanIdx === -1) throw new Error(`Span not found: ${spanId}`);
    exec.spans[spanIdx] = { ...exec.spans[spanIdx], ...updates };
    await this.save(exec);
  }
}

/**
 * FlowRegistry manages flow templates and execution state
 */
export class FlowRegistry {
  private templates: Map<string, FlowTemplate>;
  private executions: Map<string, FlowExecution>;
  private store: IExecutionStore;

  constructor(store?: IExecutionStore) {
    this.templates = new Map();
    this.executions = new Map();
    this.store = store || new MemoryExecutionStore();
    this.registerDefaultFlows();
  }

  /**
   * Register a new flow template
   */
  registerTemplate(template: FlowTemplate): void {
    if (this.templates.has(template.id)) {
      throw new Error(`Template ${template.id} already registered`);
    }
    this.templates.set(template.id, template);
  }

  /**
   * Retrieve a flow template
   */
  getTemplate(templateId: string): FlowTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * List all templates (optionally filtered by status)
   */
  listTemplates(status?: FlowTemplate["status"]): FlowTemplate[] {
    const all = Array.from(this.templates.values());
    return status ? all.filter((t) => t.status === status) : all;
  }

  /**
   * Start a new flow execution
   */
  async startExecution(
    templateId: string,
    input: Record<string, unknown>,
    traceId: string
  ): Promise<FlowExecution> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const execution: FlowExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      template_id: templateId,
      status: "queued",
      input,
      created_at: new Date().toISOString(),
      stage_index: 0,
      stage_status: template.stages.reduce(
        (acc, stage) => {
          acc[stage.id] = "pending" as const;
          return acc;
        },
        {} as Record<string, "pending" | "running" | "completed" | "failed" | "skipped">
      ),
      trace_id: traceId,
      spans: [],
    };

    this.executions.set(execution.id, execution);
    // Persist to store
    await this.store.save({
      ...execution,
      status: execution.status as "queued" | "running" | "completed" | "failed",
    } as StoredFlowExecution);
    return execution;
  }

  /**
   * Get execution state (in-memory cache)
   */
  getExecution(executionId: string): FlowExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * Get or load execution from store (supports multi-instance scenarios)
   * Loads from persistent store if not in memory
   */
  async getOrLoadExecution(executionId: string): Promise<FlowExecution | null> {
    // Check in-memory cache first
    const cached = this.executions.get(executionId);
    if (cached) return cached;

    // Try to load from persistent store
    const stored = await this.store.get(executionId);
    if (stored) {
      // Load into memory for this instance
      const execution: FlowExecution = {
        id: stored.id,
        template_id: stored.template_id,
        status: stored.status as "queued" | "running" | "completed" | "failed",
        input: stored.input,
        output: stored.output,
        created_at: stored.created_at,
        started_at: stored.started_at,
        completed_at: stored.completed_at,
        stage_index: 0,
        stage_status: stored.stage_status,
        trace_id: stored.trace_id,
        spans: stored.spans || [],
      };
      this.executions.set(executionId, execution);
      return execution;
    }

    return null;
  }

  /**
   * Update execution state (internal use)
   */
  async updateExecution(
    executionId: string,
    updates: Partial<FlowExecution>
  ): Promise<void> {
    const execution = this.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    Object.assign(execution, updates);
    // Persist to store
    await this.store.update(executionId, updates as Partial<StoredFlowExecution>);
  }

  /**
   * Record a span for observability (supports multi-instance)
   */
  async recordSpan(executionId: string, span: FlowSpan): Promise<void> {
    let execution = this.getExecution(executionId);
    if (!execution) {
      // Try to load from store (multi-instance scenario)
      execution = await this.getOrLoadExecution(executionId);
    }
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    execution.spans.push(span);
    // Persist to store
    await this.store.addSpan(executionId, span as StoredFlowSpan);
  }

  /**
   * Register default/built-in flows
   */
  private registerDefaultFlows(): void {
    // Context Enrichment Flow
    this.registerTemplate({
      id: "flow-context-enrichment-v1",
      version: "1.0.0",
      description: "Enrich a code context with narrative and metadata",
      status: "active",
      stages: [
        {
          id: "stage-extract-code",
          name: "Extract Code Structures",
          type: "parallel",
          agents: [
            {
              agent: "code-analyzer",
              method: "analyze",
              input: { context_id: "{{input.context_id}}" },
              retry: { max_attempts: 3, backoff: "exponential", initial_delay_ms: 100 },
              timeout_ms: 30000,
            },
            {
              agent: "call-graph-extractor",
              method: "extract",
              input: { context_id: "{{input.context_id}}" },
              retry: { max_attempts: 3, backoff: "exponential", initial_delay_ms: 100 },
              timeout_ms: 30000,
            },
          ],
        },
        {
          id: "stage-find-narrative",
          name: "Find Related Narratives",
          type: "serial",
          agents: [
            {
              agent: "narrative-linker",
              method: "find_related_docs",
              input: { context_id: "{{input.context_id}}", code_analysis: "{{stages[0].output}}" },
              retry: { max_attempts: 2, backoff: "linear", initial_delay_ms: 500 },
              timeout_ms: 20000,
            },
          ],
        },
        {
          id: "stage-synthesize",
          name: "Synthesize Context",
          type: "serial",
          agents: [
            {
              agent: "context-synthesizer",
              method: "merge",
              input: {
                code_analysis: "{{stages[0].output}}",
                narratives: "{{stages[1].output}}",
              },
              timeout_ms: 10000,
            },
          ],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: "cic-team",
    });

    // Idea Classification Flow
    this.registerTemplate({
      id: "flow-idea-classification-v1",
      version: "1.0.0",
      description: "Classify and score incoming ideas",
      status: "active",
      stages: [
        {
          id: "stage-parse",
          name: "Parse Idea",
          type: "serial",
          agents: [
            {
              agent: "idea-parser",
              method: "parse",
              input: { idea_id: "{{input.idea_id}}" },
              timeout_ms: 5000,
            },
          ],
        },
        {
          id: "stage-classify",
          name: "Classify & Score",
          type: "serial",
          agents: [
            {
              agent: "idea-classifier",
              method: "classify",
              input: { parsed_idea: "{{stages[0].output}}" },
              timeout_ms: 15000,
            },
          ],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: "inbox-team",
    });
  }
}

export default FlowRegistry;
