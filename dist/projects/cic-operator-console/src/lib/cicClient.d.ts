declare const api: import("axios").AxiosInstance;
export interface Context {
    id: string;
    type: string;
    code?: {
        repo: string;
        files: any[];
    };
    minimal?: {
        repo: string;
        commit: string;
    };
    trace_id: string;
}
export interface FlowExecution {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: Record<string, any>;
    spans: Array<{
        id: string;
        agent: string;
        status: string;
    }>;
    trace_id: string;
}
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    backends: Record<string, boolean>;
    cache_size: number;
    timestamp: string;
}
export interface Metrics {
    request_count: number;
    avg_latency_ms: number;
    error_rate: number;
    cache_hit_rate: number;
}
export declare const CIC: {
    health: () => Promise<import("axios").AxiosResponse<{
        health: HealthStatus;
    }, any, {}>>;
    getContext: (id: string, traceId?: string) => Promise<import("axios").AxiosResponse<{
        context: Context;
    }, any, {}>>;
    getSlice: (contextId: string, sliceId: string) => Promise<import("axios").AxiosResponse<any, any, {}>>;
    queryContext: (query: string, contextId: string, limit?: number) => Promise<import("axios").AxiosResponse<{
        results: any[];
    }, any, {}>>;
    executeFlow: (flowId: string, input: Record<string, any>, traceId?: string) => Promise<import("axios").AxiosResponse<{
        execution_id: string;
    }, any, {}>>;
    getFlowExecution: (executionId: string) => Promise<import("axios").AxiosResponse<{
        execution: FlowExecution;
    }, any, {}>>;
    metrics: () => Promise<import("axios").AxiosResponse<Metrics, any, {}>>;
    listFlows: () => Promise<import("axios").AxiosResponse<any, any, {}>>;
    listAgents: () => Promise<import("axios").AxiosResponse<any, any, {}>>;
};
export default api;
//# sourceMappingURL=cicClient.d.ts.map