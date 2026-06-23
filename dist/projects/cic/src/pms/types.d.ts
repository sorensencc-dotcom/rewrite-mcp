/**
 * src/pms/types.ts
 * PMS Type Definitions — v1.0.0
 * Date: 2026-05-29
 */
export interface PMSTemplate {
    template_id: string;
    name: string;
    version: string;
    extractor_type: "vision" | "ocr" | "reverse_image" | "custom";
    content_type: string;
    template: string;
    created_at: string;
    max_tokens: number;
    temperature: number;
    top_p: number;
    deprecated: boolean;
}
export interface PMSExecutionRequest {
    templateId: string;
    vars: Record<string, any>;
}
export interface PMSExecutionResult {
    status: "success" | "error";
    templateId: string;
    renderedPrompt?: string;
    error?: string;
    config?: {
        max_tokens: number;
        temperature: number;
        top_p: number;
    };
}
export interface PMSConfig {
    templatesDir: string;
    cacheEnabled?: boolean;
    cacheTTLMs?: number;
}
//# sourceMappingURL=types.d.ts.map