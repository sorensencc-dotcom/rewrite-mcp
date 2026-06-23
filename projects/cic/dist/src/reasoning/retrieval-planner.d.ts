/**
 * projects/cic/src/reasoning/retrieval-planner.ts
 * Parses queries/goals to compile a detailed, bounded indexing and graph traversal plan.
 */
export interface RetrievalPlan {
    query: string;
    vectorQueries: {
        query: string;
        limit: number;
    }[];
    graphQueries: {
        startEntityId: string;
        depth: number;
        edgeTypes?: string[];
    }[];
    evidenceBudget: {
        maxDocuments: number;
        maxTokens: number;
    };
    temporalSlice?: string;
}
export declare class RetrievalPlanner {
    plan(query: string, context?: {
        timeWindow?: string;
        maxDocuments?: number;
        maxTokens?: number;
    }): RetrievalPlan;
}
export declare const retrievalPlanner: RetrievalPlanner;
