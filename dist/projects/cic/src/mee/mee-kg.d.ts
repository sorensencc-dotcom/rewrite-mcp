import { CkgStore, CkgGraph } from "../ckg/ckg-store.js";
import { MeeAgentCritique } from "./mee-schema.js";
export declare class MeeKnowledgeGraph {
    private readonly store;
    constructor(store: CkgStore);
    recordTaskNode(taskId: string, title: string, type: string, dependsOn: string[]): void;
    recordProposalNode(proposalId: string, title: string, planSummary: string, filesCreated: string[]): void;
    recordCritiqueEdge(proposalId: string, critique: MeeAgentCritique): void;
    recordFailureNode(failureId: string, proposalId: string, errorCode: string, message: string): void;
    recordHealingEdge(healingProposalId: string, failureId: string): void;
    recordVerificationMetricsNode(proposalId: string, metrics: {
        testCount: number;
        passed: boolean;
        durationMs: number;
        validationErrorsCount: number;
    }): void;
    getFragileModules(): {
        path: string;
        failureCount: number;
    }[];
    getSafetyRisks(): string[];
    getGraph(): CkgGraph;
}
//# sourceMappingURL=mee-kg.d.ts.map