"use strict";
/**
 * Agent Cache Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const MemoryAgentCache_1 = require("../../src/ruflo-orchestration/MemoryAgentCache");
const CachedAgentClient_1 = require("../../src/ruflo-orchestration/CachedAgentClient");
(0, vitest_1.describe)("MemoryAgentCache", () => {
    let cache;
    (0, vitest_1.beforeEach)(() => {
        cache = new MemoryAgentCache_1.MemoryAgentCache(100, 5000); // 100 capacity, 5s TTL
    });
    (0, vitest_1.it)("stores and retrieves values", () => {
        const value = { result: "test" };
        cache.put("key1", value);
        (0, vitest_1.expect)(cache.get("key1")).toEqual(value);
    });
    (0, vitest_1.it)("returns null for missing keys", () => {
        (0, vitest_1.expect)(cache.get("missing")).toBeNull();
    });
    (0, vitest_1.it)("tracks cache hits and misses", () => {
        cache.put("key1", { data: "value" });
        cache.get("key1"); // hit
        cache.get("key2"); // miss
        const stats = cache.stats();
        (0, vitest_1.expect)(stats.hits).toBe(1);
        (0, vitest_1.expect)(stats.misses).toBe(1);
    });
    (0, vitest_1.it)("expires entries after TTL", async () => {
        const cache2 = new MemoryAgentCache_1.MemoryAgentCache(100, 100); // 100ms TTL
        cache2.put("expiring", { data: "value" });
        (0, vitest_1.expect)(cache2.get("expiring")).not.toBeNull();
        await new Promise((resolve) => setTimeout(resolve, 150));
        (0, vitest_1.expect)(cache2.get("expiring")).toBeNull();
    });
    (0, vitest_1.it)("invalidates entries by key", () => {
        cache.put("key1", { data: "value1" });
        cache.put("key2", { data: "value2" });
        (0, vitest_1.expect)(cache.invalidate("key1")).toBe(true);
        (0, vitest_1.expect)(cache.get("key1")).toBeNull();
        (0, vitest_1.expect)(cache.get("key2")).not.toBeNull();
        (0, vitest_1.expect)(cache.invalidate("key1")).toBe(false); // already removed
    });
    (0, vitest_1.it)("invalidates entries by tag pattern", () => {
        cache.put("key1", { data: "v1" }, { tags: ["context:user1"] });
        cache.put("key2", { data: "v2" }, { tags: ["context:user2"] });
        cache.put("key3", { data: "v3" }, { tags: ["other:data"] });
        const count = cache.invalidateByTag("context:*");
        (0, vitest_1.expect)(count).toBe(2);
        (0, vitest_1.expect)(cache.get("key1")).toBeNull();
        (0, vitest_1.expect)(cache.get("key2")).toBeNull();
        (0, vitest_1.expect)(cache.get("key3")).not.toBeNull();
    });
    (0, vitest_1.it)("enforces LRU eviction at capacity", () => {
        const smallCache = new MemoryAgentCache_1.MemoryAgentCache(3, 0);
        smallCache.put("key1", { data: "1" });
        smallCache.put("key2", { data: "2" });
        smallCache.put("key3", { data: "3" });
        (0, vitest_1.expect)(smallCache.stats().evictions).toBe(0);
        // Adding 4th entry should evict LRU (key1)
        smallCache.put("key4", { data: "4" });
        (0, vitest_1.expect)(smallCache.stats().evictions).toBe(1);
        (0, vitest_1.expect)(smallCache.get("key1")).toBeNull();
        (0, vitest_1.expect)(smallCache.get("key4")).not.toBeNull();
    });
    (0, vitest_1.it)("clears all entries", () => {
        cache.put("key1", { data: "1" });
        cache.put("key2", { data: "2" });
        cache.clear();
        (0, vitest_1.expect)(cache.stats().size).toBe(0);
        (0, vitest_1.expect)(cache.get("key1")).toBeNull();
    });
});
(0, vitest_1.describe)("CachedAgentClient", () => {
    let invokeCount;
    const mockAgent = {
        async invoke(method, input) {
            invokeCount++;
            return { method, input, result: "data", invoked: invokeCount };
        },
    };
    let cache;
    let cachedClient;
    (0, vitest_1.beforeEach)(() => {
        invokeCount = 0;
        cache = new MemoryAgentCache_1.MemoryAgentCache(100, 5000);
        cachedClient = new CachedAgentClient_1.CachedAgentClient({
            agent: mockAgent,
            cache,
            ttl: 5000,
        });
    });
    (0, vitest_1.it)("delegates to underlying agent", async () => {
        const result = await cachedClient.invoke("test", { param: "value" }, "trace1");
        (0, vitest_1.expect)(result.result).toBe("data");
        (0, vitest_1.expect)(invokeCount).toBe(1);
    });
    (0, vitest_1.it)("caches results and avoids repeated invocations", async () => {
        const input = { param: "value" };
        const result1 = await cachedClient.invoke("test", input, "trace1");
        const result2 = await cachedClient.invoke("test", input, "trace2");
        (0, vitest_1.expect)(invokeCount).toBe(1); // Only invoked once
        (0, vitest_1.expect)(result1.invoked).toBe(1);
        (0, vitest_1.expect)(result2.invoked).toBe(1); // Same result from cache
    });
    (0, vitest_1.it)("caches separately for different inputs", async () => {
        await cachedClient.invoke("test", { param: "value1" }, "trace1");
        await cachedClient.invoke("test", { param: "value2" }, "trace2");
        (0, vitest_1.expect)(invokeCount).toBe(2); // Different inputs = separate cache entries
    });
    (0, vitest_1.it)("caches separately for different methods", async () => {
        const input = { param: "value" };
        await cachedClient.invoke("method1", input, "trace1");
        await cachedClient.invoke("method2", input, "trace2");
        (0, vitest_1.expect)(invokeCount).toBe(2); // Different methods = separate cache entries
    });
    (0, vitest_1.it)("respects cacheable filter", async () => {
        const selectiveCache = new MemoryAgentCache_1.MemoryAgentCache(100, 5000);
        const selectiveClient = new CachedAgentClient_1.CachedAgentClient({
            agent: mockAgent,
            cache: selectiveCache,
            cacheable: (method) => method !== "uncacheable",
        });
        const input = { param: "value" };
        await selectiveClient.invoke("cacheable", input, "trace1");
        await selectiveClient.invoke("cacheable", input, "trace2");
        await selectiveClient.invoke("uncacheable", input, "trace3");
        await selectiveClient.invoke("uncacheable", input, "trace4");
        (0, vitest_1.expect)(invokeCount).toBe(3); // cacheable x1, uncacheable x2
    });
    (0, vitest_1.it)("tags cache entries with agent, method, and trace", async () => {
        await cachedClient.invoke("test", { param: "value" }, "trace123");
        const stats = cache.stats();
        (0, vitest_1.expect)(stats.size).toBe(1);
    });
});
//# sourceMappingURL=agent-cache.test.js.map