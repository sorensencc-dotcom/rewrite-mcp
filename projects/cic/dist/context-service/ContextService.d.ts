/**
 * CIC Context Service
 * Implements the Context API contract for unified code + narrative context retrieval
 */
import { EventEmitter } from "events";
export interface Context {
    id: string;
    type: "code" | "narrative" | "hybrid";
    version: string;
    timestamp: string;
    code?: {
        repo: string;
        branch: string;
        commit: string;
        files: ContextFile[];
    };
    narrative?: {
        section: string;
        doc_id: string;
        tags: string[];
    };
    minimal: {
        repo?: string;
        doc_id?: string;
        commit?: string;
        section?: string;
    };
    trace_id: string;
    parent_span_id?: string;
}
export interface ContextFile {
    path: string;
    language: string;
    slices: ContextSlice[];
    imports: string[];
    imported_by: string[];
}
export interface ContextSlice {
    id: string;
    type: "function" | "class" | "section" | "block";
    start_line: number;
    end_line: number;
    content?: string;
    tags: string[];
    calls: string[];
    called_by: string[];
}
export interface QueryRequest {
    query: string;
    context_id: string;
    limit?: number;
    trace_id: string;
}
export interface QueryResult {
    slice_id: string;
    score: number;
    snippet: string;
}
export interface ContextServiceConfig {
    crgBackendUrl: string;
    cicBackendUrl: string;
    cacheTTL?: number;
    requestTimeout?: number;
    maxSliceSize?: number;
    repoPath?: string;
}
/**
 * ContextService coordinates context retrieval from CRG and CIC backends
 */
export declare class ContextService extends EventEmitter {
    private config;
    private contextCache;
    private sliceCache;
    private crgAdapter;
    private lastHealthCheck;
    constructor(config: ContextServiceConfig);
    /**
     * Retrieve context metadata (minimal, lazy-loaded)
     */
    getContext(contextId: string, traceId: string): Promise<Context>;
    /**
     * Load full content of a slice (lazy-loading)
     */
    getSlice(contextId: string, sliceId: string, traceId: string): Promise<ContextSlice>;
    /**
     * Semantic search across contexts (simple cosine similarity)
     */
    query(request: {
        query: string;
        context_id: string;
        limit?: number;
    }): Promise<{
        results?: QueryResult[];
        error?: string;
    }>;
    /**
     * Health check endpoint
     */
    health(): Promise<{
        status: "healthy" | "degraded" | "unhealthy";
        backends: Record<string, boolean>;
        cache_size: number;
        timestamp: string;
    }>;
    /**
     * Clear caches (for testing and manual reset)
     */
    clearCaches(): void;
    /**
     * Start cache eviction timer
     */
    private startCacheEviction;
}
export default ContextService;
