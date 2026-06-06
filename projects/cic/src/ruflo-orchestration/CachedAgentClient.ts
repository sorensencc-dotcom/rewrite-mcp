/**
 * Cached Agent Client
 * Transparent caching wrapper around AgentClient
 */

import { createHash } from "crypto";
import { AgentClient } from "./FlowOrchestrator";
import { IAgentCache } from "./IAgentCache";

export interface CachedAgentClientConfig {
  agent: AgentClient;
  cache: IAgentCache;
  ttl?: number; // per-agent TTL in milliseconds
  cacheable?: (method: string) => boolean; // determine if method should be cached
}

export class CachedAgentClient implements AgentClient {
  private agent: AgentClient;
  private cache: IAgentCache;
  private ttl: number;
  private cacheable: (method: string) => boolean;
  private agentName: string;

  constructor(config: CachedAgentClientConfig) {
    this.agent = config.agent;
    this.cache = config.cache;
    this.ttl = config.ttl ?? 0; // 0 = no expiry by default
    this.cacheable = config.cacheable ?? (() => true); // cache everything by default
    this.agentName = config.agent.constructor.name;
  }

  async invoke(
    method: string,
    input: Record<string, unknown>,
    traceId: string
  ): Promise<Record<string, unknown>> {
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

  private generateCacheKey(method: string, input: Record<string, unknown>): string {
    // Create a deterministic hash of agent, method, and input
    const hash = createHash("sha256");
    hash.update(this.agentName);
    hash.update(method);
    hash.update(JSON.stringify(input)); // Ensure consistent ordering
    return hash.digest("hex");
  }
}
