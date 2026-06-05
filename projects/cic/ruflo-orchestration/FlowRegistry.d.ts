/**
 * Ruflo Flow Registry
 * Manages multi-agent flow templates and execution
 */
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
    stage_status: Record<string, "pending" | "running" | "completed" | "failed">;
    trace_id: string;
    spans: FlowSpan[];
}
export interface FlowSpan {
    id: string;
    parent_id?: string;
    stage_id: string;
    agent: string;
    start_time: string;
    end_time?: string;
    duration_ms?: number;
    status: "pending" | "running" | "completed" | "failed";
    error?: string;
}
/**
 * FlowRegistry manages flow templates and execution state
 */
export declare class FlowRegistry {
    private templates;
    private executions;
    constructor();
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
    startExecution(templateId: string, input: Record<string, unknown>, traceId: string): FlowExecution;
    /**
     * Get execution state
     */
    getExecution(executionId: string): FlowExecution | null;
    /**
     * Update execution state (internal use)
     */
    updateExecution(executionId: string, updates: Partial<FlowExecution>): void;
    /**
     * Record a span for observability
     */
    recordSpan(executionId: string, span: FlowSpan): void;
    /**
     * Register default/built-in flows
     */
    private registerDefaultFlows;
}
export default FlowRegistry;
