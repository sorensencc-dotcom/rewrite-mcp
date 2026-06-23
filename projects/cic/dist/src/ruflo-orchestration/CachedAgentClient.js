/**
 * Cached Agent Client
 * Transparent caching wrapper around AgentClient
 */
import { createHash } from "crypto";
export class CachedAgentClient {
    constructor(config) {
        this.agent = config.agent;
        this.cache = config.cache;
        this.ttl = config.ttl ?? 0; // 0 = no expiry by default
        this.cacheable = config.cacheable ?? (() => true); // cache everything by default
        this.agentName = config.agent.constructor.name;
    }
    async invoke(method, input, traceId) {
        // Check if this method should be cached
        if (!this.cacheable(method)) {
            return this.agent.invoke(method, input, traceId);
        }
        // Generate cache key
        const cacheKey = this.generateCacheKey(method, input);
        // Try to get from cache
        const cached = this.cache.get(cacheKey);
        if (cached !== null) {
            return cached;
        }
        // Not in cache, invoke agent
        const result = await this.agent.invoke(method, input, traceId);
        // Cache the result
        this.cache.put(cacheKey, result, {
            ttl: this.ttl,
            tags: [
                `agent:${this.agentName}`,
                `method:${method}`,
                `trace:${traceId}`,
            ],
        });
        return result;
    }
    generateCacheKey(method, input) {
        // Create a deterministic hash of agent, method, and input
        const hash = createHash("sha256");
        hash.update(this.agentName);
        hash.update(method);
        hash.update(JSON.stringify(input)); // Ensure consistent ordering
        return hash.digest("hex");
    }
}
//# sourceMappingURL=CachedAgentClient.js.map