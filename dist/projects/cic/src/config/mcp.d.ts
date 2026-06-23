/**
 * filename: mcp.ts
 * location: src/config/mcp.ts
 * created: 2026-06-06
 *
 * MCP Server Configuration
 * Defines all 5 MCP servers, ports, methods, and timeouts
 * Reads from environment variables with sensible defaults for local development
 *
 * Environment variables (optional):
 *   MCP_SUMMARIZER_PORT (default: 7070)
 *   MCP_DRIFT_PORT (default: 7071)
 *   MCP_DIAGNOSTICS_PORT (default: 7072)
 *   MCP_DOCS_PORT (default: 7073)
 *   MCP_ORCHESTRATOR_PORT (default: 7074)
 *   MCP_TIMEOUT_DEFAULT (default: 5000ms)
 */
export interface MCPServerConfig {
    id: string;
    host: string;
    port: number;
    methods: string[];
    timeout: number;
}
export declare class MCPConfigManager {
    private configs;
    private methodIndex;
    constructor();
    getConfigForMethod(method: string): MCPServerConfig;
    getAll(): MCPServerConfig[];
    buildMethodIndex(): Map<string, MCPServerConfig>;
    validateAllServers(): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    private checkServerHealth;
}
export declare function getMCPConfigManager(): MCPConfigManager;
export declare const DEFAULT_MCP_CONFIG: MCPConfigManager;
//# sourceMappingURL=mcp.d.ts.map