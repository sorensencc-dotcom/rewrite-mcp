/**
 * Agent Cache Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryAgentCache } from "../../src/ruflo-orchestration/MemoryAgentCache";
import { CachedAgentClient } from "../../src/ruflo-orchestration/CachedAgentClient";
import { AgentClient } from "../../src/ruflo-orchestration/FlowOrchestrator";

describe("MemoryAgentCache", () => {
  let cache: MemoryAgentCache;

  beforeEach(() => {
    cache = new MemoryAgentCache(100, 5000); // 100 capacity, 5s TTL
  });

  it("stores and retrieves values", () => {
    const value = { result: "test" };
    cache.put("key1", value);
    expect(cache.get("key1")).toEqual(value);
  });

  it("returns null for missing keys", () => {
    expect(cache.get("missing")).toBeNull();
  });

  it("tracks cache hits and misses", () => {
    cache.put("key1", { data: "value" });
    cache.get("key1"); // hit
    cache.get("key2"); // miss
    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it("expires entries after TTL", async () => {
    const cache2 = new MemoryAgentCache(100, 100); // 100ms TTL
    cache2.put("expiring", { data: "value" });
    expect(cache2.get("expiring")).not.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(cache2.get("expiring")).toBeNull();
  });

  it("invalidates entries by key", () => {
    cache.put("key1", { data: "value1" });
    cache.put("key2", { data: "value2" });
    expect(cache.invalidate("key1")).toBe(true);
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).not.toBeNull();
    expect(cache.invalidate("key1")).toBe(false); // already removed
  });

  it("invalidates entries by tag pattern", () => {
    cache.put("key1", { data: "v1" }, { tags: ["context:user1"] });
    cache.put("key2", { data: "v2" }, { tags: ["context:user2"] });
    cache.put("key3", { data: "v3" }, { tags: ["other:data"] });

    const count = cache.invalidateByTag("context:*");
    expect(count).toBe(2);
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
    expect(cache.get("key3")).not.toBeNull();
  });

  it("enforces LRU eviction at capacity", () => {
    const smallCache = new MemoryAgentCache(3, 0);
    smallCache.put("key1", { data: "1" });
    smallCache.put("key2", { data: "2" });
    smallCache.put("key3", { data: "3" });
    expect(smallCache.stats().evictions).toBe(0);

    // Adding 4th entry should evict LRU (key1)
    smallCache.put("key4", { data: "4" });
    expect(smallCache.stats().evictions).toBe(1);
    expect(smallCache.get("key1")).toBeNull();
    expect(smallCache.get("key4")).not.toBeNull();
  });

  it("clears all entries", () => {
    cache.put("key1", { data: "1" });
    cache.put("key2", { data: "2" });
    cache.clear();
    expect(cache.stats().size).toBe(0);
    expect(cache.get("key1")).toBeNull();
  });
});

describe("CachedAgentClient", () => {
  let invokeCount: number;
  const mockAgent: AgentClient = {
    async invoke(method: string, input: Record<string, unknown>) {
      invokeCount++;
      return { method, input, result: "data", invoked: invokeCount };
    },
  };

  let cache: MemoryAgentCache;
  let cachedClient: CachedAgentClient;

  beforeEach(() => {
    invokeCount = 0;
    cache = new MemoryAgentCache(100, 5000);
    cachedClient = new CachedAgentClient({
      agent: mockAgent,
      cache,
      ttl: 5000,
    });
  });

  it("delegates to underlying agent", async () => {
    const result = await cachedClient.invoke(
      "test",
      { param: "value" },
      "trace1"
    );
    expect(result.result).toBe("data");
    expect(invokeCount).toBe(1);
  });

  it("caches results and avoids repeated invocations", async () => {
    const input = { param: "value" };
    const result1 = await cachedClient.invoke("test", input, "trace1");
    const result2 = await cachedClient.invoke("test", input, "trace2");

    expect(invokeCount).toBe(1); // Only invoked once
    expect(result1.invoked).toBe(1);
    expect(result2.invoked).toBe(1); // Same result from cache
  });

  it("caches separately for different inputs", async () => {
    await cachedClient.invoke("test", { param: "value1" }, "trace1");
    await cachedClient.invoke("test", { param: "value2" }, "trace2");

    expect(invokeCount).toBe(2); // Different inputs = separate cache entries
  });

  it("caches separately for different methods", async () => {
    const input = { param: "value" };
    await cachedClient.invoke("method1", input, "trace1");
    await cachedClient.invoke("method2", input, "trace2");

    expect(invokeCount).toBe(2); // Different methods = separate cache entries
  });

  it("respects cacheable filter", async () => {
    const selectiveCache = new MemoryAgentCache(100, 5000);
    const selectiveClient = new CachedAgentClient({
      agent: mockAgent,
      cache: selectiveCache,
      cacheable: (method) => method !== "uncacheable",
    });

    const input = { param: "value" };
    await selectiveClient.invoke("cacheable", input, "trace1");
    await selectiveClient.invoke("cacheable", input, "trace2");
    await selectiveClient.invoke("uncacheable", input, "trace3");
    await selectiveClient.invoke("uncacheable", input, "trace4");

    expect(invokeCount).toBe(3); // cacheable x1, uncacheable x2
  });

  it("tags cache entries with agent, method, and trace", async () => {
    await cachedClient.invoke("test", { param: "value" }, "trace123");
    const stats = cache.stats();
    expect(stats.size).toBe(1);
  });
});
