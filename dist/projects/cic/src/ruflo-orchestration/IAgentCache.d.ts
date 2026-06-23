/**
 * Agent Cache Interface
 * Defines caching contract for agent invocation results
 */
export interface CacheEntry {
    key: string;
    value: Record<string, unknown>;
    tags?: string[];
    ttl?: number;
    createdAt: number;
    expiresAt?: number;
}
export interface ICacheStats {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    capacity: number;
}
export interface IAgentCache {
    /**
     * Get value from cache by key
     * Returns null if not found or expired
     */
    get(key: string): Record<string, unknown> | null;
    /**
     * Put value in cache with optional TTL and tags
     */
    put(key: string, value: Record<string, unknown>, options?: {
        ttl?: number;
        tags?: string[];
    }): void;
    /**
     * Invalidate entries by exact key
     */
    invalidate(key: string): boolean;
    /**
     * Invalidate entries matching tag pattern (e.g., "context:*")
     */
    invalidateByTag(pattern: string): number;
    /**
     * Clear all cached entries
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    stats(): ICacheStats;
}
//# sourceMappingURL=IAgentCache.d.ts.map