import { MeeHealingPlan, MeeRunFailureContext, MeeAutonomousJob, PlanTree } from "../mee-schema.js";
export interface HealingLLMClient {
    suggestHealing(input: {
        request: string;
        plan: PlanTree;
        failure: MeeRunFailureContext;
    }): Promise<{
        summary: string;
        tasks: {
            title: string;
            description: string;
            type: string;
        }[];
    }>;
}
export declare class SelfHealingEngine {
    private readonly client;
    constructor(client: HealingLLMClient);
    generateHealingPlan(job: MeeAutonomousJob, plan: PlanTree, failure: MeeRunFailureContext): Promise<MeeHealingPlan>;
}
//# sourceMappingURL=self-healing-engine.d.ts.map