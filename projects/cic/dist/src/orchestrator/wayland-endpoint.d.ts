import type { Request, Response } from 'express';
export interface ReasoningRequest {
    action: string;
    timestamp: string;
    metadata?: Record<string, any>;
}
export interface ReasoningResponse {
    status: 'ok' | 'error';
    requestId: string;
    action: string;
    result?: any;
    error?: string;
    processingTimeMs: number;
}
export declare class WaylandOrchestratorEndpoint {
    private logger;
    constructor(logger: any);
    handleReasoning(req: Request, res: Response<ReasoningResponse>): Promise<void>;
    private handleIngestReasoning;
    register(app: any): any;
}
