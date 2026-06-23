/**
 * Tool Layer types — Shared interfaces for all tool adapters
 */
export type ToolMode = "direct" | "wayland";
export interface ToolRequest {
    id: string;
    kind: "shell" | "model" | "file" | "http";
    payload: any;
    timeout_ms?: number;
    metadata?: Record<string, any>;
}
export interface ToolError {
    code: string;
    message: string;
}
export interface ToolResponse<T> {
    success: boolean;
    payload?: T;
    error?: ToolError;
    duration_ms?: number;
    correlation_id?: string;
}
export interface ShellInput {
    command: string;
    timeout_ms?: number;
    env?: Record<string, string>;
}
export interface ShellOutput {
    exit_code: number;
    stdout: string;
    stderr: string;
    timed_out: boolean;
}
export interface ModelInput {
    model_id?: string;
    prompt: string;
    max_tokens?: number;
    temperature?: number;
    timeout_ms?: number;
}
export interface ModelOutput {
    text: string;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
    model_id: string;
    stop_reason: string;
}
export interface FileReadInput {
    path: string;
}
export interface FileReadOutput {
    exists: boolean;
    content?: string;
    size_bytes?: number;
    encoding?: string;
}
export interface FileWriteInput {
    path: string;
    content: string;
    overwrite?: boolean;
}
export interface FileWriteOutput {
    path: string;
    size_bytes: number;
    checksum: string;
    created_at: string;
}
export interface HttpInput {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    timeout_ms?: number;
}
export interface HttpOutput {
    status: number;
    headers: Record<string, string>;
    body: string;
    timed_out: boolean;
}
//# sourceMappingURL=types.d.ts.map