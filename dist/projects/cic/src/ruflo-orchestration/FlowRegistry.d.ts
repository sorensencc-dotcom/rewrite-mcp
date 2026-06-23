/**
 * Ruflo Flow Registry
 * Manages multi-agent flow templates and execution
 * With optional persistent execution state via IExecutionStore
 */
import { IExecutionStore } from "./IExecutionStore.js";
export interface FlowTemplate {
    id: string;
    version: string;
    description: string;
    status: "draft" | "active" | "deprecated";
    stages: FlowStage[];
    created_at: string;
    updated_at: string;
    owner: string;
}
export interface FlowStage {
    id: string;
    name: string;
    type: "serial" | "parallel";
    agents: AgentTask[];
    if?: string;
    on_error?: "continue" | "skip" | "fail";
}
export interface AgentTask {
    agent: string;
    method: string;
    input: Record<string, unknown>;
    retry?: {
        max_attempts: number;
        backoff: "exponential" | "linear";
        initial_delay_ms: number;
    };
    timeout_ms?: number;
}
export interface FlowExecution {
    id: string;
    template_id: string;
    status: "queued" | "running" | "completed" | "failed";
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    stage_index: number;
    stage_status: Record<string, "pending" | "running" | "completed" | "failed" | "skipped">;
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
 * FlowRegistry manages flow templates and execution state
 */
export declare class FlowRegistry {
    private templates;
    private executions;
    private store;
    constructor(store?: IExecutionStore);
    /**
     * Register a new flow template
     */
    registerTemplate(template: FlowTemplate): void;
    /**
     * Retrieve a flow template
     */
    getTemplate(templateId: string): FlowTemplate | null;
    /**
     * List all templates (optionally filtered by status)
     */
    listTemplates(status?: FlowTemplate["status"]): FlowTemplate[];
    /**
     * Start a new flow execution
     */
    startExecution(templateId: string, input: Record<string, unknown>, traceId: string): Promise<FlowExecution>;
    /**
     * Get execution state (in-memory cache)
     */
    getExecution(executionId: string): FlowExecution | null;
    /**
     * Get or load execution from store (supports multi-instance scenarios)
     * Loads from persistent store if not in memory
     */
    getOrLoadExecution(executionId: string): Promise<FlowExecution | null>;
    /**
     * Update execution state (internal use)
     */
    updateExecution(executionId: string, updates: Partial<FlowExecution>): Promise<void>;
    /**
     * Record a span for observability (supports multi-instance)
     */
    recordSpan(executionId: string, span: FlowSpan): Promise<void>;
    /**
     * Register default/built-in flows
     */
    private registerDefaultFlows;
}
export default FlowRegistry;
//# sourceMappingURL=FlowRegistry.d.ts.map