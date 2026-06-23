/**
 * filename: mcp-integration.ts
 * created: 2026-06-06
 * version: 0.1.0
 *
 * MCP Integration Layer — Unified API for CIC Agents
 * Provides high-level MCP calling interface with:
 * - Automatic observability (tracing, metrics)
 * - Configuration management
 * - Error handling and context propagation
 * - Retry logic (per config)
 *
 * Usage:
 *   const mcp = getCICMCPIntegration();
 *   const result = await mcp.summarize({ filePath, startLine, endLine }, { traceId, correlationId });
 *
 * Invariants:
 *   - All calls emit spans and metrics
 *   - Errors include full context
 *   - Observability is automatic, not optional
 *   - Configuration is always validated
 */
import { MCPMethod } from "./mcp-client.js";
export type SummarizeParams = {
    filePath: string;
    startLine: number;
    endLine: number;
};
export type SummarizeResult = {
    filePath: string;
    startLine: number;
    endLine: number;
    lineCount: number;
    checksum: string;
    content: string;
};
export type DetectDriftParams = {
    specPath: string;
    implPath: string;
    threshold?: number;
};
export type DetectDriftResult = {
    specPath: string;
    implPath: string;
    specLines: number;
    implLines: number;
    driftScore: number;
    threshold: number;
    exceedsThreshold: boolean;
    findings: Array<{
        type: string;
        severity: string;
        message: string;
    }>;
};
export type DiagnoseParams = {
    checks: Array<"node" | "typescript" | "qdrant" | "docker" | "envVars">;
};
export type DiagnoseResult = {
    timestamp: string;
    results: Array<{
        name: string;
        status: "pass" | "fail" | "warn";
        version?: string;
        message: string;
        remediation?: string;
    }>;
    allPassed: boolean;
};
export type SyncDocsParams = {
    changeType: "feature" | "bugfix" | "refactor";
    description: string;
    affectedFiles: string[];
    roadmapSection?: string;
};
export type SyncDocsResult = {
    changeType: string;
    description: string;
    docsUpdated: number;
    roadmapUpdated: boolean;
    commitHash?: string;
    timestamp: string;
};
export type RunTaskParams = {
    taskId: string;
    owner: "rewrite-labs" | "cic";
    taskType: "generate" | "rewrite" | "ingest" | "validate";
    input: unknown;
    correlationId?: string;
};
export type RunTaskResult = {
    taskId: string;
    owner: string;
    taskType: string;
    status: "pending" | "running" | "success" | "failed";
    output?: unknown;
    checksum?: string;
    correlationId: string;
    timestamp: string;
    executionMs: number;
};
export type MCPIntegrationContext = {
    traceId?: string;
    correlationId?: string;
    parentSpanId?: string;
};
export declare class CICMCPIntegration {
    private client;
    private configManager;
    private observabilityManager;
    constructor(mcpHost?: string);
    /**
     * Summarize a section of a file.
     */
    summarize(params: SummarizeParams, context?: MCPIntegrationContext): Promise<SummarizeResult>;
    /**
     * Detect drift between spec and implementation.
     */
    detectDrift(params: DetectDriftParams, context?: MCPIntegrationContext): Promise<DetectDriftResult>;
    /**
     * Run environment diagnostics.
     */
    diagnose(params: DiagnoseParams, context?: MCPIntegrationContext): Promise<DiagnoseResult>;
    /**
     * Synchronize documentation.
     */
    syncDocs(params: SyncDocsParams, context?: MCPIntegrationContext): Promise<SyncDocsResult>;
    /**
     * Run a cross-system task through the orchestrator.
     */
    runTask(params: RunTaskParams, context?: MCPIntegrationContext): Promise<RunTaskResult>;
    /**
     * Check if MCP system is operational.
     */
    isHealthy(): Promise<boolean>;
    /**
     * Get operational metrics.
     */
    getMetrics(method?: MCPMethod): any;
    /**
     * Get trace events for a trace ID.
     */
    getTraceEvents(traceId: string): any;
    /**
     * Internal: Call MCP with full observability.
     */
    private callWithObservability;
}
export declare function getCICMCPIntegration(mcpHost?: string): CICMCPIntegration;
export declare function resetCICMCPIntegration(): void;
