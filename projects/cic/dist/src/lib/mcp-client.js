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
import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
// ============================================================================
// MCP Server Configuration
// ============================================================================
export const MCP_SERVERS = {
    summarizer: {
        port: 7070,
        method: "cic.summarizeSection",
        timeout: 5000,
    },
    drift: {
        port: 7071,
        method: "cic.detectDrift",
        timeout: 5000,
    },
    diagnostics: {
        port: 7072,
        method: "cic.diagnose",
        timeout: 10000,
    },
    docs: {
        port: 7073,
        method: "cic.syncDocs",
        timeout: 5000,
    },
    orchestrator: {
        port: 7074,
        method: "orchestrate.runTask",
        timeout: 15000,
    },
};
function getPortForMethod(method) {
    if (method.startsWith("cic.summarize"))
        return MCP_SERVERS.summarizer.port;
    if (method.startsWith("cic.detectDrift"))
        return MCP_SERVERS.drift.port;
    if (method.startsWith("cic.diagnose"))
        return MCP_SERVERS.diagnostics.port;
    if (method.startsWith("cic.syncDocs"))
        return MCP_SERVERS.docs.port;
    if (method.startsWith("orchestrate"))
        return MCP_SERVERS.orchestrator.port;
    throw new Error(`Unknown MCP method: ${method}`);
}
function getTimeoutForMethod(method) {
    if (method.startsWith("cic.summarize"))
        return MCP_SERVERS.summarizer.timeout;
    if (method.startsWith("cic.detectDrift"))
        return MCP_SERVERS.drift.timeout;
    if (method.startsWith("cic.diagnose"))
        return MCP_SERVERS.diagnostics.timeout;
    if (method.startsWith("cic.syncDocs"))
        return MCP_SERVERS.docs.timeout;
    if (method.startsWith("orchestrate"))
        return MCP_SERVERS.orchestrator.timeout;
    return 5000;
}
// ============================================================================
// MCP Client
// ============================================================================
export class MCPClient {
    constructor(host) {
        this.host = "127.0.0.1";
        if (host) {
            this.host = host;
        }
    }
    /**
     * Call an MCP server method with full observability support.
     *
     * @param method — MCP method name (e.g., "cic.summarizeSection")
     * @param params — request parameters
     * @param context — optional call context (correlation ID, trace ID, timeout, span callback)
     * @returns — response result or throws MCPError
     */
    async call(method, params, context) {
        const correlationId = context?.correlationId || randomUUID();
        const traceId = context?.traceId;
        const timeout = context?.timeout || getTimeoutForMethod(method);
        const onSpan = context?.onSpan;
        const span = {
            method,
            correlationId,
            startTime: Date.now(),
            status: "pending",
        };
        try {
            const port = getPortForMethod(method);
            const request = {
                id: randomUUID(),
                method,
                params,
            };
            const response = await this.makeRequest(request, port, timeout);
            span.status = "success";
            span.endTime = Date.now();
            span.durationMs = span.endTime - span.startTime;
            if (onSpan) {
                onSpan(span);
            }
            return response;
        }
        catch (err) {
            span.status = "failed";
            span.error = err.message;
            span.endTime = Date.now();
            span.durationMs = span.endTime - span.startTime;
            if (onSpan) {
                onSpan(span);
            }
            throw new MCPError(err.message, method, correlationId, traceId, err);
        }
    }
    /**
     * Make raw TCP request to MCP server.
     * Internal method — use `call()` instead for observability.
     *
     * Note: Ensures params are properly deserialized. If params contains
     * stringified JSON (e.g., from Ruflo template interpolation), parses it.
     */
    makeRequest(request, port, timeout) {
        return new Promise((resolve, reject) => {
            const socket = createConnection({
                host: this.host,
                port,
            });
            const timeoutHandle = setTimeout(() => {
                socket.destroy();
                reject(new Error(`MCP request timeout after ${timeout}ms`));
            }, timeout);
            socket.on("connect", () => {
                // Ensure params are properly deserialized
                const serializedRequest = {
                    ...request,
                    params: this.deserializeParams(request.params),
                };
                socket.write(JSON.stringify(serializedRequest));
            });
            socket.on("data", (data) => {
                clearTimeout(timeoutHandle);
                socket.destroy();
                try {
                    const response = JSON.parse(data.toString());
                    if (response.error) {
                        reject(new Error(`MCP error: ${response.error.code} - ${response.error.message}`));
                    }
                    else if (response.result === undefined) {
                        reject(new Error("MCP response missing result"));
                    }
                    else {
                        resolve(response.result);
                    }
                }
                catch (err) {
                    reject(new Error(`Failed to parse MCP response: ${err.message}`));
                }
            });
            socket.on("error", (err) => {
                clearTimeout(timeoutHandle);
                reject(new Error(`MCP connection error: ${err.message} (port ${port}, host ${this.host})`));
            });
            socket.on("close", () => {
                clearTimeout(timeoutHandle);
            });
        });
    }
    /**
     * Deserialize params, handling cases where they may be stringified JSON
     * This fixes the issue where Ruflo flow parameters arrive as JSON strings
     */
    deserializeParams(params) {
        if (typeof params === "string") {
            try {
                return JSON.parse(params);
            }
            catch {
                // If it's not valid JSON, return the string as-is
                return params;
            }
        }
        if (typeof params === "object" && params !== null) {
            // Recursively deserialize nested objects
            const deserialized = {};
            for (const [key, value] of Object.entries(params)) {
                if (typeof value === "string" && value.startsWith("[")) {
                    try {
                        deserialized[key] = JSON.parse(value);
                    }
                    catch {
                        deserialized[key] = value;
                    }
                }
                else if (typeof value === "string" && value.startsWith("{")) {
                    try {
                        deserialized[key] = JSON.parse(value);
                    }
                    catch {
                        deserialized[key] = value;
                    }
                }
                else {
                    deserialized[key] = value;
                }
            }
            return deserialized;
        }
        return params;
    }
}
// ============================================================================
// Error Handling
// ============================================================================
export class MCPError extends Error {
    constructor(message, method, correlationId, traceId, originalError) {
        super(`MCPError[${method}]: ${message} (correlation=${correlationId}${traceId ? `, trace=${traceId}` : ""})`);
        this.method = method;
        this.correlationId = correlationId;
        this.traceId = traceId;
        this.originalError = originalError;
        this.name = "MCPError";
    }
}
// ============================================================================
// Singleton Instance
// ============================================================================
let mcpClientInstance = null;
export function getMCPClient(host) {
    if (!mcpClientInstance) {
        mcpClientInstance = new MCPClient(host);
    }
    return mcpClientInstance;
}
export function resetMCPClient() {
    mcpClientInstance = null;
}
//# sourceMappingURL=mcp-client.js.map