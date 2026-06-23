import { RefactorInsight, RefactorPlan, PhaseProposal } from "../mee-schema.js";
export declare class SelfRefactorEngine {
    private readonly analyzer;
    scan(files: {
        path: string;
        content: string;
    }[]): RefactorInsight[];
    generatePlan(insights: RefactorInsight[]): RefactorPlan;
    toProposal(plan: RefactorPlan): PhaseProposal;
}
//# sourceMappingURL=self-refactor-engine.d.ts.map