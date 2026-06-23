/**
 * CodeBurn Event format (normalized)
 */
export interface CodeburnEvent {
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    timestamp: string;
    metadata: Record<string, unknown>;
}
/**
 * Load and normalize CIC LLM call events from telemetry log
 */
export declare function loadCicLlmEvents(): CodeburnEvent[];
/**
 * Load and normalize CIC cost events
 */
export declare function loadCicCostEvents(): CodeburnEvent[];
/**
 * Aggregate CIC events into model statistics
 */
export interface ModelStats {
    model: string;
    provider: string;
    usage_count: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cache_read_tokens: number;
    total_cache_write_tokens: number;
    avg_cost_usd: number;
    avg_retry_rate: number;
    success_rate: number;
    pipeline_stages: string[];
    agents: string[];
}
export declare function aggregateToModelStats(events: CodeburnEvent[]): ModelStats[];
/**
 * Export CIC telemetry for CodeBurn analysis
 */
export declare function exportCicTelemetry(outputPath?: string): void;
