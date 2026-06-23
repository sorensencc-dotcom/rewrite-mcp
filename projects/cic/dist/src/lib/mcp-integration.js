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
import { randomUUID } from "node:crypto";
import { MCPClient, MCPError } from "./mcp-client.js";
// ============================================================================
// MCP Integration
// ============================================================================
export class CICMCPIntegration {
    constructor(mcpHost) {
        this.configManager = getMCPConfigManager();
        this.observabilityManager = getMCPObservabilityManager();
        this.client = new MCPClient(mcpHost);
    }
    /**
     * Summarize a section of a file.
     */
    async summarize(params, context) {
        return this.callWithObservability("cic.summarizeSection", params, context);
    }
    /**
     * Detect drift between spec and implementation.
     */
    async detectDrift(params, context) {
        return this.callWithObservability("cic.detectDrift", params, context);
    }
    /**
     * Run environment diagnostics.
     */
    async diagnose(params, context) {
        return this.callWithObservability("cic.diagnose", params, context);
    }
    /**
     * Synchronize documentation.
     */
    async syncDocs(params, context) {
        return this.callWithObservability("cic.syncDocs", params, context);
    }
    /**
     * Run a cross-system task through the orchestrator.
     */
    async runTask(params, context) {
        return this.callWithObservability("orchestrate.runTask", params, context);
    }
    /**
     * Check if MCP system is operational.
     */
    async isHealthy() {
        try {
            const result = await this.configManager.validateAllServers();
            return result.valid;
        }
        catch (err) {
            console.error("MCP health check failed:", err);
            return false;
        }
    }
    /**
     * Get operational metrics.
     */
    getMetrics(method) {
        if (method) {
            return this.observabilityManager.getStats(method);
        }
        return this.observabilityManager.getRecentMetrics();
    }
    /**
     * Get trace events for a trace ID.
     */
    getTraceEvents(traceId) {
        return this.observabilityManager.getTraceEvents(traceId);
    }
    /**
     * Internal: Call MCP with full observability.
     */
    async callWithObservability(method, params, context) {
        const traceId = context?.traceId || randomUUID();
        const correlationId = context?.correlationId || randomUUID();
        const spanId = randomUUID();
        const observabilityContext = {
            traceId,
            spanId,
            correlationId,
            parentSpanId: context?.parentSpanId,
        };
        const { recordSpan } = this.observabilityManager.startSpan(method, observabilityContext);
        try {
            const startTime = Date.now();
            const result = await this.client.call(method, params, {
                correlationId,
                traceId,
                onSpan: (span) => {
                    recordSpan(span);
                },
            });
            const endTime = Date.now();
            recordSpan({
                method,
                correlationId,
                startTime,
                endTime,
                durationMs: endTime - startTime,
                status: "success",
            });
            return result;
        }
        catch (err) {
            const endTime = Date.now();
            const error = err;
            if (error instanceof MCPError) {
                recordSpan({
                    method,
                    correlationId,
                    startTime: Date.now(),
                    status: "failed",
                }, error);
            }
            throw error;
        }
    }
}
// ============================================================================
// Singleton Instance
// ============================================================================
let integrationInstance = null;
export function getCICMCPIntegration(mcpHost) {
    if (!integrationInstance) {
        integrationInstance = new CICMCPIntegration(mcpHost);
    }
    return integrationInstance;
}
export function resetCICMCPIntegration() {
    integrationInstance = null;
}
//# sourceMappingURL=mcp-integration.js.map