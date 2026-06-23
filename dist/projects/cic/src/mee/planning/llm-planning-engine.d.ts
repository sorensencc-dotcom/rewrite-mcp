import { PlanTree } from "../mee-schema.js";
export interface LLMClient {
    generatePlan(input: {
        request: string;
        repoSummary?: string;
        recentFailures?: string;
    }): Promise<PlanTree>;
}
export declare class LLMPlanningEngine {
    private readonly client;
    constructor(client: LLMClient);
    generatePlan(request: string, opts?: {
        repoSummary?: string;
        recentFailures?: string;
    }): Promise<PlanTree>;
}
//# sourceMappingURL=llm-planning-engine.d.ts.map