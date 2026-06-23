import { PlanTree, PhaseProposal, MeePlanningMode } from "../mee-schema.js";
import { LLMPlanningEngine } from "./llm-planning-engine.js";
export declare class PlanningEngine {
    private readonly mode;
    private readonly llm?;
    private readonly extractor;
    private readonly deps;
    private readonly converter;
    constructor(mode?: MeePlanningMode, llm?: LLMPlanningEngine | undefined);
    generatePlanWithMode(request: string, mode?: MeePlanningMode): Promise<PlanTree>;
    generatePlan(request: string): PlanTree;
    generateProposals(plan: PlanTree): PhaseProposal[];
}
//# sourceMappingURL=planning-engine.d.ts.map