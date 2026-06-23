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
import { randomUUID } from "node:crypto";
export class MCPMetricsCollector {
    constructor() {
        this.stats = new Map();
    }
    recordCall(method, durationMs, success) {
        const existing = this.stats.get(method) || {
            method,
            callCount: 0,
            successCount: 0,
            failureCount: 0,
            totalLatencyMs: 0,
            avgLatencyMs: 0,
            maxLatencyMs: 0,
            minLatencyMs: Infinity,
        };
        existing.callCount++;
        if (success) {
            existing.successCount++;
        }
        else {
            existing.failureCount++;
        }
        existing.totalLatencyMs += durationMs;
        existing.avgLatencyMs = existing.totalLatencyMs / existing.callCount;
        existing.maxLatencyMs = Math.max(existing.maxLatencyMs, durationMs);
        existing.minLatencyMs = Math.min(existing.minLatencyMs, durationMs);
        existing.lastCallTime = Date.now();
        this.stats.set(method, existing);
    }
    getStats(method) {
        return this.stats.get(method);
    }
    getAllStats() {
        return Array.from(this.stats.values());
    }
    reset() {
        this.stats.clear();
    }
}
export class MCPTraceRecorder {
    constructor() {
        this.traceEvents = new Map();
    }
    recordSpan(span) {
        const traceId = span.correlationId; // Use correlationId as trace key
        if (!this.traceEvents.has(traceId)) {
            this.traceEvents.set(traceId, []);
        }
        this.traceEvents.get(traceId).push(span);
    }
    getTraceEvents(traceId) {
        return this.traceEvents.get(traceId) || [];
    }
    getAllTraces() {
        return new Map(this.traceEvents);
    }
    reset() {
        this.traceEvents.clear();
    }
}
export class MCPObservabilityManager {
    constructor() {
        this.metrics = new MCPMetricsCollector();
        this.recorder = new MCPTraceRecorder();
        this.spanStack = new Map();
    }
    startSpan(method, context) {
        const spanId = context.spanId || randomUUID();
        this.spanStack.set(spanId, {
            spanId,
            startTime: Date.now(),
        });
        const recordSpan = (span, error) => {
            const fullSpan = {
                method,
                correlationId: context.correlationId,
                startTime: span.startTime || Date.now(),
                status: span.status || "completed",
                error: error?.message || span.error,
                ...span,
            };
            this.recorder.recordSpan(fullSpan);
            if (fullSpan.status === "success") {
                this.metrics.recordCall(method, fullSpan.durationMs || 0, true);
            }
            else if (fullSpan.status === "failed") {
                this.metrics.recordCall(method, fullSpan.durationMs || 0, false);
            }
            this.spanStack.delete(spanId);
        };
        return { spanId, recordSpan };
    }
    getStats(method) {
        if (method) {
            return this.metrics.getStats(method);
        }
        return this.metrics.getAllStats();
    }
    getRecentMetrics() {
        return this.metrics.getAllStats();
    }
    getTraceEvents(traceId) {
        return this.recorder.getTraceEvents(traceId);
    }
    getAllTraces() {
        return this.recorder.getAllTraces();
    }
    reset() {
        this.metrics.reset();
        this.recorder.reset();
        this.spanStack.clear();
    }
}
let observabilityManager = null;
export function getMCPObservabilityManager() {
    if (!observabilityManager) {
        observabilityManager = new MCPObservabilityManager();
    }
    return observabilityManager;
}
//# sourceMappingURL=mcp-tracing.js.map