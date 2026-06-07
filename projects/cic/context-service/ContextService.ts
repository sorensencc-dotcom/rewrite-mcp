/**
 * CIC Context Service
 * Implements the Context API contract for unified code + narrative context retrieval
 */

import { EventEmitter } from "events";
import { CRGAdapter } from "../crg-adapter/CRGAdapter";

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
  repoPath?: string; // For local CRG adapter
}

/**
 * ContextService coordinates context retrieval from CRG and CIC backends
 */
export class ContextService extends EventEmitter {
  private config: ContextServiceConfig;
  private contextCache: Map<string, { value: Context; expiry: number }>;
  private sliceCache: Map<string, { value: ContextSlice; expiry: number }>;
  private crgAdapter: CRGAdapter | null = null;
  private lastHealthCheck: { crg: boolean; cic: boolean } = { crg: false, cic: false };

  constructor(config: ContextServiceConfig) {
    super();
    this.config = {
      cacheTTL: 3600000, // 1 hour default
      requestTimeout: 30000,
      maxSliceSize: 50000,
      ...config,
    };
    this.contextCache = new Map();
    this.sliceCache = new Map();

    // Initialize CRG adapter if repo path provided
    if (config.repoPath) {
      this.crgAdapter = new CRGAdapter(config.repoPath);
    }

    // Start cache eviction timer
    this.startCacheEviction();
  }

  /**
   * Retrieve context metadata (minimal, lazy-loaded)
   */
  async getContext(contextId: string, traceId: string): Promise<Context> {
    // Check cache
    const cached = this.contextCache.get(contextId);
    if (cached && cached.expiry > Date.now()) {
      this.emit("cache_hit", { contextId, type: "context" });
      return cached.value;
    }

    if (!this.crgAdapter) {
      throw new Error("CRG adapter not initialized");
    }

    // Fetch from CRG adapter
    const context = await this.crgAdapter.getMinimalContext(["*"], traceId);

    // Cache it
    this.contextCache.set(contextId, {
      value: context,
      expiry: Date.now() + (this.config.cacheTTL || 3600000),
    });

    return context;
  }

  /**
   * Load full content of a slice (lazy-loading)
   */
  async getSlice(
    contextId: string,
    sliceId: string,
    traceId: string
  ): Promise<ContextSlice> {
    // Check cache
    const cached = this.sliceCache.get(sliceId);
    if (cached && cached.expiry > Date.now()) {
      this.emit("cache_hit", { sliceId, type: "slice" });
      return cached.value;
    }

    if (!this.crgAdapter) {
      throw new Error("CRG adapter not initialized");
    }

    // Parse slice ID: filePath:functionName:startLine-endLine
    const [filePath, ...rest] = sliceId.split(":");
    const lineRange = rest[rest.length - 1];
    const [startLineStr, endLineStr] = lineRange.split("-");

    const startLine = parseInt(startLineStr, 10);
    const endLine = parseInt(endLineStr, 10);

    // Load content
    const content = await this.crgAdapter.loadSliceContent(
      filePath,
      startLine,
      endLine
    );

    // Build slice
    const slice: ContextSlice = {
      id: sliceId,
      type: "function",
      start_line: startLine,
      end_line: endLine,
      content: content.substring(0, this.config.maxSliceSize),
      tags: [],
      calls: [],
      called_by: [],
    };

    // Cache it
    this.sliceCache.set(sliceId, {
      value: slice,
      expiry: Date.now() + (this.config.cacheTTL || 3600000),
    });

    return slice;
  }

  /**
   * Semantic search across contexts (simple cosine similarity)
   */
  async query(request: {
    query: string;
    context_id: string;
    limit?: number;
  }): Promise<{ results?: QueryResult[]; error?: string }> {
    const { query, context_id, limit = 10 } = request;

    if (!query || query.trim().length === 0) {
      return { error: "Query cannot be empty" };
    }

    try {
      const context = await this.getContext(context_id, "");
      const results: QueryResult[] = [];

      // Simple keyword matching across all slices
      if (context.code?.files) {
        const queryTerms = query.toLowerCase().split(/\s+/);

        for (const file of context.code.files) {
          for (const slice of file.slices) {
            const sliceText = `${slice.id} ${slice.tags.join(" ")}`.toLowerCase();
            const matches = queryTerms.filter((term) =>
              sliceText.includes(term)
            ).length;

            if (matches > 0) {
              const score = matches / queryTerms.length;
              results.push({
                slice_id: slice.id,
                score,
                snippet: `${file.path}:${slice.start_line}-${slice.end_line}`,
              });
            }
          }
        }
      }

      // Sort by score and limit
      results.sort((a, b) => b.score - a.score);
      return { results: results.slice(0, limit) };
    } catch (error) {
      return { error: `Query failed: ${error}` };
    }
  }

  /**
   * Health check endpoint
   */
  async health(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    backends: Record<string, boolean>;
    cache_size: number;
    timestamp: string;
  }> {
    const cacheSize = this.contextCache.size + this.sliceCache.size;

    // Simple health check: adapter availability
    const crgHealthy = this.crgAdapter !== null;

    return {
      status: crgHealthy ? "healthy" : "degraded",
      backends: { crg: crgHealthy, cic: false },
      cache_size: cacheSize,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear caches (for testing and manual reset)
   */
  clearCaches(): void {
    this.contextCache.clear();
    this.sliceCache.clear();
    if (this.crgAdapter) {
      this.crgAdapter.clearCaches();
    }
    this.emit("cache_cleared");
  }

  /**
   * Start cache eviction timer
   */
  private startCacheEviction(): void {
    setInterval(() => {
      const now = Date.now();

      // Evict expired context cache entries
      for (const [key, cached] of this.contextCache.entries()) {
        if (cached.expiry <= now) {
          this.contextCache.delete(key);
        }
      }

      // Evict expired slice cache entries
      for (const [key, cached] of this.sliceCache.entries()) {
        if (cached.expiry <= now) {
          this.sliceCache.delete(key);
        }
      }
    }, 60000); // Check every minute
  }
}

export default ContextService;
