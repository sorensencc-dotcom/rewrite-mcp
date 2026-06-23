"use strict";
/**
 * Agent Cache Load Test
 * Measures cache hit rate and latency improvement with 10 parallel flows
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const MemoryAgentCache_1 = require("../../src/ruflo-orchestration/MemoryAgentCache");
const CachedAgentClient_1 = require("../../src/ruflo-orchestration/CachedAgentClient");
(0, vitest_1.describe)("Agent Cache Load Test — 10 Parallel Flows", () => {
    (0, vitest_1.it)("measures cache hit rate and latency improvement", async () => {
        let totalInvocations = 0;
        const invocationTimes = [];
        const slowAgent = {
            async invoke(method, input) {
                // Simulate slow agent (e.g., LLM API call)
                const delay = Math.random() * 100 + 50; // 50-150ms
                await new Promise((resolve) => setTimeout(resolve, delay));
                totalInvocations++;
                return { method, result: `output-${method}`, cached: false };
            },
        };
        const cache = new MemoryAgentCache_1.MemoryAgentCache(1000, 60000); // 1000 capacity, 60s TTL
        const cachedAgent = new CachedAgentClient_1.CachedAgentClient({
            agent: slowAgent,
            cache,
            ttl: 60000,
        });
        // Scenario: 10 parallel flows, each invoking same agent with same inputs
        // Shared inputs = cache hits, different inputs = cache misses
        const flowInputs = [
            { query: "shared-input-1", context: "shared" },
            { query: "shared-input-1", context: "shared" }, // duplicate
            { query: "shared-input-1", context: "shared" }, // duplicate
            { query: "shared-input-2", context: "shared" },
            { query: "shared-input-2", context: "shared" }, // duplicate
            { query: "unique-input-1", context: "unique" },
            { query: "unique-input-2", context: "unique" },
            { query: "unique-input-1", context: "unique" }, // duplicate
            { query: "shared-input-1", context: "shared" }, // duplicate
            { query: "unique-input-3", context: "unique" },
        ];
        const startTime = Date.now();
        // Execute parallel flows
        const promises = flowInputs.map(async (input, index) => {
            const iterationStart = Date.now();
            const result = await cachedAgent.invoke("analyze", input, `trace-${index}`);
            const iterationTime = Date.now() - iterationStart;
            invocationTimes.push(iterationTime);
            return result;
        });
        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        const stats = cache.stats();
        const cacheHitRate = stats.hits / (stats.hits + stats.misses);
        console.log("\n=== Load Test Results ===");
        console.log(`Total flows: ${flowInputs.length}`);
        console.log(`Total invocations: ${totalInvocations}`);
        console.log(`Cache hits: ${stats.hits}`);
        console.log(`Cache misses: ${stats.misses}`);
        console.log(`Hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
        console.log(`Total time: ${totalTime}ms`);
        console.log(`Avg time per flow: ${(totalTime / flowInputs.length).toFixed(1)}ms`);
        console.log(`Avg cached invocation time: ${(invocationTimes.filter((_, i) => stats.hits > 0 && i > 2).reduce((a, b) => a + b, 0) / Math.max(1, stats.hits)).toFixed(1)}ms`);
        // Assertions
        // Expected: 5 unique inputs = 5 invocations, 5 cache hits from duplicates
        (0, vitest_1.expect)(totalInvocations).toBeLessThanOrEqual(5); // Should only invoke 5 times
        (0, vitest_1.expect)(stats.hits).toBeGreaterThanOrEqual(5); // Should have at least 5 hits
        (0, vitest_1.expect)(cacheHitRate).toBeGreaterThan(0.5); // >50% hit rate
        (0, vitest_1.expect)(results.length).toBe(10); // All flows completed
    });
    (0, vitest_1.it)("measures latency improvement: cached vs uncached", async () => {
        let uncachedTotalTime = 0;
        let cachedTotalTime = 0;
        const slowAgent = {
            async invoke(method, input) {
                const delay = 100; // Fixed 100ms delay
                await new Promise((resolve) => setTimeout(resolve, delay));
                return { method, result: "data" };
            },
        };
        // Test uncached (baseline)
        const testInput = { query: "test" };
        const uncachedStart = Date.now();
        for (let i = 0; i < 5; i++) {
            await slowAgent.invoke("test", testInput, `trace-${i}`);
        }
        uncachedTotalTime = Date.now() - uncachedStart;
        // Test cached
        const cache = new MemoryAgentCache_1.MemoryAgentCache(100, 60000);
        const cachedAgent = new CachedAgentClient_1.CachedAgentClient({
            agent: slowAgent,
            cache,
            ttl: 60000,
        });
        const cachedStart = Date.now();
        for (let i = 0; i < 5; i++) {
            await cachedAgent.invoke("test", testInput, `trace-${i}`);
        }
        cachedTotalTime = Date.now() - cachedStart;
        const latencyImprovement = ((uncachedTotalTime - cachedTotalTime) / uncachedTotalTime) * 100;
        console.log("\n=== Latency Comparison ===");
        console.log(`Uncached (5 calls): ${uncachedTotalTime}ms`);
        console.log(`Cached (5 calls): ${cachedTotalTime}ms`);
        console.log(`Latency improvement: ${latencyImprovement.toFixed(1)}% faster`);
        // Cached should be significantly faster (first call ~100ms, next 4 calls ~0-5ms)
        (0, vitest_1.expect)(cachedTotalTime).toBeLessThan(uncachedTotalTime);
        (0, vitest_1.expect)(latencyImprovement).toBeGreaterThan(50); // At least 50% faster
    });
});
//# sourceMappingURL=agent-cache-load-test.js.map