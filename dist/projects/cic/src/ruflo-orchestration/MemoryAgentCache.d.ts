/**
 * In-Memory Agent Cache with LRU eviction and TTL support
 */
import { IAgentCache, ICacheStats } from "./IAgentCache";
export declare class MemoryAgentCache implements IAgentCache {
    private cache;
    private accessOrder;
    private capacity;
    private defaultTtl;
    private _stats;
    constructor(capacity?: number, defaultTtlMs?: number);
    get(key: string): Record<string, unknown> | null;
    put(key: string, value: Record<string, unknown>, options?: {
        ttl?: number;
        tags?: string[];
    }): void;
    invalidate(key: string): boolean;
    invalidateByTag(pattern: string): number;
    clear(): void;
    stats(): ICacheStats;
    private patternToRegex;
}
//# sourceMappingURL=MemoryAgentCache.d.ts.map