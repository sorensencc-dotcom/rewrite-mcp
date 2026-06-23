/**
 * filename: mcp-tracing.ts
 * location: src/observability/mcp-tracing.ts
 * created: 2026-06-06
 *
 * MCP Observability and Tracing
 * Automatic span recording, metrics collection, and trace event subscription
 *
 * Provides:
 * - Automatic span creation and recording
 * - Metrics collection (call count, latency, errors)
 * - Trace event subscription and retrieval
 * - Correlation ID and trace ID propagation
 */
import type { MCPSpan, MCPMethod } from "../lib/mcp-client.js";
export interface ObservabilityContext {
    traceId: string;
    spanId: string;
    correlationId: string;
    parentSpanId?: string;
}
export interface SpanMetadata {
    method: MCPMethod;
    correlationId: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    status: "pending" | "running" | "completed" | "failed";
    error?: string;
}
export interface MethodStats {
    method: MCPMethod;
    callCount: number;
    successCount: number;
    failureCount: number;
    totalLatencyMs: number;
    avgLatencyMs: number;
    maxLatencyMs: number;
    minLatencyMs: number;
    lastCallTime?: number;
}
export declare class MCPMetricsCollector {
    private stats;
    recordCall(method: MCPMethod, durationMs: number, success: boolean): void;
    getStats(method: MCPMethod): MethodStats | undefined;
    getAllStats(): MethodStats[];
    reset(): void;
}
export declare class MCPTraceRecorder {
    private traceEvents;
    recordSpan(span: MCPSpan): void;
    getTraceEvents(traceId: string): MCPSpan[];
    getAllTraces(): Map<string, MCPSpan[]>;
    reset(): void;
}
export declare class MCPObservabilityManager {
    private metrics;
    private recorder;
    private spanStack;
    startSpan(method: MCPMethod, context: ObservabilityContext): {
        spanId: string;
        recordSpan: (span: MCPSpan | Partial<MCPSpan>, error?: Error) => void;
    };
    getStats(method?: MCPMethod): MethodStats | MethodStats[] | undefined;
    getRecentMetrics(): MethodStats[];
    getTraceEvents(traceId: string): MCPSpan[];
    getAllTraces(): Map<string, MCPSpan[]>;
    reset(): void;
}
export declare function getMCPObservabilityManager(): MCPObservabilityManager;
