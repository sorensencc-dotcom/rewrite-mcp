/**
 * In-Memory Agent Cache with LRU eviction and TTL support
 */
export class MemoryAgentCache {
    constructor(capacity = 1000, defaultTtlMs = 3600000) {
        this.accessOrder = [];
        this.cache = new Map();
        this.capacity = capacity;
        this.defaultTtl = defaultTtlMs;
        this._stats = { hits: 0, misses: 0, evictions: 0 };
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this._stats.misses++;
            return null;
        }
        // Check expiry
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.accessOrder = this.accessOrder.filter((k) => k !== key);
            this._stats.misses++;
            return null;
        }
        // Update LRU order
        this.accessOrder = this.accessOrder.filter((k) => k !== key);
        this.accessOrder.push(key);
        this._stats.hits++;
        return entry.value;
    }
    put(key, value, options) {
        const now = Date.now();
        const ttl = options?.ttl ?? this.defaultTtl;
        const expiresAt = ttl > 0 ? now + ttl : undefined;
        const entry = {
            key,
            value,
            tags: options?.tags,
            ttl,
            createdAt: now,
            expiresAt,
        };
        // Remove if exists (for fresh LRU order)
        if (this.cache.has(key)) {
            this.accessOrder = this.accessOrder.filter((k) => k !== key);
        }
        // Check capacity and evict LRU if needed
        if (this.cache.size >= this.capacity &&
            !this.cache.has(key)) {
            const lruKey = this.accessOrder.shift();
            if (lruKey) {
                this.cache.delete(lruKey);
                this._stats.evictions++;
            }
        }
        this.cache.set(key, entry);
        this.accessOrder.push(key);
    }
    invalidate(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
            this.accessOrder = this.accessOrder.filter((k) => k !== key);
            return true;
        }
        return false;
    }
    invalidateByTag(pattern) {
        const regex = this.patternToRegex(pattern);
        let count = 0;
        const keysToDelete = [];
        this.cache.forEach((entry, key) => {
            if (entry.tags) {
                for (const tag of entry.tags) {
                    if (regex.test(tag)) {
                        keysToDelete.push(key);
                        break;
                    }
                }
            }
        });
        for (const key of keysToDelete) {
            this.cache.delete(key);
            this.accessOrder = this.accessOrder.filter((k) => k !== key);
            count++;
        }
        return count;
    }
    clear() {
        this.cache.clear();
        this.accessOrder = [];
        this._stats = { hits: 0, misses: 0, evictions: 0 };
    }
    stats() {
        return {
            hits: this._stats.hits,
            misses: this._stats.misses,
            evictions: this._stats.evictions,
            size: this.cache.size,
            capacity: this.capacity,
        };
    }
    patternToRegex(pattern) {
        // Convert glob pattern (e.g., "context:*") to regex
        // Replace * with a placeholder first
        const withPlaceholder = pattern.replace(/\*/g, "\0WILDCARD\0");
        // Escape all regex special chars
        const escaped = withPlaceholder.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
        // Replace placeholder with regex wildcard
        const regex = escaped.replace(/\0WILDCARD\0/g, ".*");
        return new RegExp(`^${regex}$`);
    }
}
//# sourceMappingURL=MemoryAgentCache.js.map