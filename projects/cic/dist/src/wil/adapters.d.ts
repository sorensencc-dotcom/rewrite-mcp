/**
 * Wayland Tool Adapters (Phase 46.2)
 * with Security Hardening (Phase 46.6)
 *
 * Route CIC tool calls (shell/model/file/http) through Wayland.
 * Enforce workspace root scoping (/cic_workspace).
 * Remove all direct OS access from CIC agents.
 * Validate security constraints: no credentials, no interactive shells.
 */
export interface WaylandToolCall {
    tool: string;
    args: Record<string, unknown>;
    correlationId: string;
    timestamp: string;
}
export interface WaylandToolResponse {
    success: boolean;
    output?: string;
    error?: string;
    correlationId: string;
}
/**
 * Shell Tool Adapter
 * Route shell commands through Wayland.
 * Enforce: non-interactive, workspace scoping.
 */
export declare class ShellToolAdapter {
    execute(command: string, correlationId: string): Promise<WaylandToolResponse>;
}
/**
 * File Tool Adapter
 * Route file operations through Wayland.
 * Enforce: workspace root scoping only.
 */
export declare class FileToolAdapter {
    read(filePath: string, correlationId: string): Promise<WaylandToolResponse>;
    write(filePath: string, content: string, correlationId: string): Promise<WaylandToolResponse>;
    delete(filePath: string, correlationId: string): Promise<WaylandToolResponse>;
}
/**
 * Model Tool Adapter
 * Route model calls through Wayland.
 * All API keys delegated to Wayland key management.
 */
export declare class ModelToolAdapter {
    call(model: string, prompt: string, correlationId: string): Promise<WaylandToolResponse>;
}
/**
 * HTTP Tool Adapter
 * Route HTTP requests through Wayland.
 */
export declare class HttpToolAdapter {
    request(method: string, url: string, headers?: Record<string, unknown>, correlationId?: string): Promise<WaylandToolResponse>;
}
/**
 * Tool Router
 * Central dispatcher for all CIC tool calls.
 * Enforces security constraints before routing.
 */
export declare class ToolRouter {
    private shellAdapter;
    private fileAdapter;
    private modelAdapter;
    private httpAdapter;
    route(call: WaylandToolCall): Promise<WaylandToolResponse>;
}
export default ToolRouter;
