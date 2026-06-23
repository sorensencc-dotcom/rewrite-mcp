/**
 * filename: mcp-client.ts
 * created: 2026-06-06
 * version: 0.1.0
 *
 * MCP Client — Deterministic CIC MCP Server Interface
 * Provides unified client for all five MCP servers with:
 * - Type-safe request/response handling
 * - Deterministic timeouts and retries
 * - Observability hooks (tracing, metrics)
 * - Error context propagation
 *
 * Invariants:
 *   - All requests include correlation IDs
 *   - All responses are fully typed
 *   - No silent failures; all errors logged with context
 *   - Timeouts are deterministic and configurable per-method
 *   - No connection pooling; each call creates clean socket
 */
export type MCPMethod = "cic.summarizeSection" | "cic.detectDrift" | "cic.diagnose" | "cic.syncDocs" | "orchestrate.runTask";
export type MCPRequest = {
    id: string;
    method: MCPMethod;
    params: unknown;
};
export type MCPResponse<T = unknown> = {
    id: string;
    result?: T;
    error?: {
        message: string;
        code: string;
    };
};
export type MCPCallContext = {
    correlationId?: string;
    traceId?: string;
    timeout?: number;
    onSpan?: (span: MCPSpan) => void;
};
export type MCPSpan = {
    method: MCPMethod;
    correlationId: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    status: "pending" | "success" | "failed";
    error?: string;
    inputChecksum?: string;
    outputChecksum?: string;
};
export declare const MCP_SERVERS: {
    readonly summarizer: {
        readonly port: 7070;
        readonly method: MCPMethod;
        readonly timeout: 5000;
    };
    readonly drift: {
        readonly port: 7071;
        readonly method: MCPMethod;
        readonly timeout: 5000;
    };
    readonly diagnostics: {
        readonly port: 7072;
        readonly method: MCPMethod;
        readonly timeout: 10000;
    };
    readonly docs: {
        readonly port: 7073;
        readonly method: MCPMethod;
        readonly timeout: 5000;
    };
    readonly orchestrator: {
        readonly port: 7074;
        readonly method: MCPMethod;
        readonly timeout: 15000;
    };
};
export declare class MCPClient {
    private host;
    constructor(host?: string);
    /**
     * Call an MCP server method with full observability support.
     *
     * @param method — MCP method name (e.g., "cic.summarizeSection")
     * @param params — request parameters
     * @param context — optional call context (correlation ID, trace ID, timeout, span callback)
     * @returns — response result or throws MCPError
     */
    call<T = unknown>(method: MCPMethod, params: unknown, context?: MCPCallContext): Promise<T>;
    /**
     * Make raw TCP request to MCP server.
     * Internal method — use `call()` instead for observability.
     *
     * Note: Ensures params are properly deserialized. If params contains
     * stringified JSON (e.g., from Ruflo template interpolation), parses it.
     */
    private makeRequest;
    /**
     * Deserialize params, handling cases where they may be stringified JSON
     * This fixes the issue where Ruflo flow parameters arrive as JSON strings
     */
    private deserializeParams;
}
export declare class MCPError extends Error {
    method: MCPMethod;
    correlationId: string;
    traceId?: string | undefined;
    originalError?: Error | undefined;
    constructor(message: string, method: MCPMethod, correlationId: string, traceId?: string | undefined, originalError?: Error | undefined);
}
export declare function getMCPClient(host?: string): MCPClient;
export declare function resetMCPClient(): void;
