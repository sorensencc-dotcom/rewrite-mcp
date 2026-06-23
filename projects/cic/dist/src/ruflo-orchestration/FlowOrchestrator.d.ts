/**
 * Ruflo Flow Orchestrator
 * Executes multi-agent flows and coordinates agent interactions
 */
import { EventEmitter } from "events";
import { FlowRegistry, FlowExecution } from "./FlowRegistry.js";
import { IAgentCache } from "./IAgentCache.js";
export interface AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
}
export interface OrchestratorConfig {
    registry: FlowRegistry;
    agents: Record<string, AgentClient>;
    cache?: IAgentCache;
    cacheTtl?: number;
    maxConcurrency?: number;
    defaultTimeout?: number;
}
/**
 * FlowOrchestrator executes flow templates with agent coordination
 */
export declare class FlowOrchestrator extends EventEmitter {
    private registry;
    private agents;
    private maxConcurrency;
    private defaultTimeout;
    private activeExecutions;
    constructor(config: OrchestratorConfig);
    /**
     * Execute a flow asynchronously and return the execution ID
     */
    executeFlow(templateId: string, input: Record<string, unknown>, traceId: string): Promise<string>;
    /**
     * Wait for execution to complete (with timeout)
     */
    waitForExecution(executionId: string, timeoutMs?: number): Promise<FlowExecution>;
    /**
     * Internal: run execution to completion
     */
    private runExecution;
    /**
     * Execute a single stage (serial or parallel)
     */
    private executeStage;
    /**
     * Execute a single agent task
     */
    private executeTask;
    /**
     * Interpolate template variables in input (e.g., {{input.foo}}, {{stages[0].output}})
     * Preserves arrays and objects; only stringifies when necessary for string replacement
     */
    private interpolateInput;
    /**
     * Interpolate a single array item while preserving its type
     */
    private interpolateArrayItem;
    /**
     * Evaluate conditional expressions (simple comparison operators)
     */
    private evaluateCondition;
    /**
     * Create a promise that resolves after delay
     */
    private timeout;
}
export default FlowOrchestrator;
