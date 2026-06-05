import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ContextService } from "../context-service/ContextService";

describe("ContextService", () => {
  let service: ContextService;

  beforeEach(() => {
    // TODO: Initialize ContextService with mock backends
    service = new ContextService({
      crgBackendUrl: "http://localhost:8081",
      cicBackendUrl: "http://localhost:8082",
      cacheTTL: 3600,
      requestTimeout: 30000,
    });
  });

  afterEach(() => {
    // TODO: Clean up service instance
  });

  describe("getContext", () => {
    it("should retrieve minimal context without slices", async () => {
      const context = await service.getContext("ctx-abc123");
      expect(context).toBeDefined();
      expect(context.id).toBe("ctx-abc123");
      expect(context.files).toBeDefined();
    });

    it("should return context with trace ID", async () => {
      const context = await service.getContext("ctx-abc123", "trace-xyz");
      expect(context.trace_id).toBe("trace-xyz");
    });
  });

  describe("getSlice", () => {
    it("should load slice content on demand", async () => {
      const slice = await service.getSlice("ctx-abc123", "Foo.bar:24-67");
      expect(slice).toBeDefined();
      expect(slice.id).toBe("Foo.bar:24-67");
      expect(slice.content).toBeDefined();
    });

    it("should cache slice after first load", async () => {
      await service.getSlice("ctx-abc123", "Foo.bar:24-67");
      const cached = await service.getSlice("ctx-abc123", "Foo.bar:24-67");
      expect(cached).toBeDefined();
    });
  });

  describe("query", () => {
    it("should execute semantic search", async () => {
      const results = await service.query({
        query: "idea capture logic",
        context_id: "ctx-abc123",
        limit: 5,
      });
      expect(results).toBeDefined();
      expect(Array.isArray(results.results)).toBe(true);
    });

    it("should handle query errors gracefully", async () => {
      const results = await service.query({
        query: "",
        context_id: "invalid-id",
        limit: 10,
      });
      expect(results.error).toBeDefined();
    });
  });

  describe("health", () => {
    it("should report service health", async () => {
      const health = await service.health();
      expect(health.status).toMatch(/up|degraded|down/);
    });
  });

  describe("cache behavior", () => {
    it("should respect cache TTL", async () => {
      const ctx1 = await service.getContext("ctx-abc123");
      const ctx2 = await service.getContext("ctx-abc123");
      expect(ctx1).toEqual(ctx2);
    });

    it("should clear cache on command", async () => {
      await service.getContext("ctx-abc123");
      await service.clearCaches();
      const health = await service.health();
      expect(health.cache_size).toBe(0);
    });
  });
});
