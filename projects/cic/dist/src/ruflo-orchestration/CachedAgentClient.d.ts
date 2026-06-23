/**
 * Cached Agent Client
 * Transparent caching wrapper around AgentClient
 */
import { AgentClient } from "./FlowOrchestrator";
import { IAgentCache } from "./IAgentCache";
export interface CachedAgentClientConfig {
    agent: AgentClient;
    cache: IAgentCache;
    ttl?: number;
    cacheable?: (method: string) => boolean;
}
export declare class CachedAgentClient implements AgentClient {
    private agent;
    private cache;
    private ttl;
    private cacheable;
    private agentName;
    constructor(config: CachedAgentClientConfig);
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
    private generateCacheKey;
}
