"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ContextService_1 = require("../context-service/ContextService");
(0, vitest_1.describe)("ContextService", () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new ContextService_1.ContextService({
            crgBackendUrl: "http://localhost:8081",
            cicBackendUrl: "http://localhost:8082",
            cacheTTL: 3600000,
            requestTimeout: 30000,
            repoPath: process.cwd(),
        });
    });
    (0, vitest_1.afterEach)(() => {
        // TODO: Clean up service instance
    });
    (0, vitest_1.describe)("getContext", () => {
        (0, vitest_1.it)("should retrieve minimal context without slices", async () => {
            const context = await service.getContext("ctx-abc123", "trace-1");
            (0, vitest_1.expect)(context).toBeDefined();
            (0, vitest_1.expect)(context.id).toBeDefined();
            (0, vitest_1.expect)(context.code?.files).toBeDefined();
        });
        (0, vitest_1.it)("should return context with trace ID", async () => {
            const context = await service.getContext("ctx-abc123", "trace-xyz");
            (0, vitest_1.expect)(context.trace_id).toBe("trace-xyz");
        });
    });
    (0, vitest_1.describe)("getSlice", () => {
        (0, vitest_1.it)("should load slice content on demand", async () => {
            const slice = await service.getSlice("ctx-abc123", "Foo.bar:24-67");
            (0, vitest_1.expect)(slice).toBeDefined();
            (0, vitest_1.expect)(slice.id).toBe("Foo.bar:24-67");
            (0, vitest_1.expect)(slice.content).toBeDefined();
        });
        (0, vitest_1.it)("should cache slice after first load", async () => {
            await service.getSlice("ctx-abc123", "Foo.bar:24-67");
            const cached = await service.getSlice("ctx-abc123", "Foo.bar:24-67");
            (0, vitest_1.expect)(cached).toBeDefined();
        });
    });
    (0, vitest_1.describe)("query", () => {
        (0, vitest_1.it)("should execute semantic search", async () => {
            await service.getContext("ctx-abc123", "trace-search");
            const results = await service.query({
                query: "idea capture logic",
                context_id: "ctx-abc123",
                limit: 5,
            });
            (0, vitest_1.expect)(results).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(results.results)).toBe(true);
        });
        (0, vitest_1.it)("should handle query errors gracefully", async () => {
            const results = await service.query({
                query: "",
                context_id: "invalid-id",
                limit: 10,
            });
            (0, vitest_1.expect)(results.error).toBeDefined();
        });
    });
    (0, vitest_1.describe)("health", () => {
        (0, vitest_1.it)("should report service health", async () => {
            const health = await service.health();
            (0, vitest_1.expect)(health.status).toMatch(/healthy|degraded|unhealthy/);
        });
    });
    (0, vitest_1.describe)("cache behavior", () => {
        (0, vitest_1.it)("should respect cache TTL", async () => {
            const ctx1 = await service.getContext("ctx-abc123");
            const ctx2 = await service.getContext("ctx-abc123");
            (0, vitest_1.expect)(ctx1).toEqual(ctx2);
        });
        (0, vitest_1.it)("should clear cache on command", async () => {
            await service.getContext("ctx-abc123");
            await service.clearCaches();
            const health = await service.health();
            (0, vitest_1.expect)(health.cache_size).toBe(0);
        });
    });
});
//# sourceMappingURL=context-service.test.js.map