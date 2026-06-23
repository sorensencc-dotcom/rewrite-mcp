import { MeeKnowledgeGraph } from "./mee-kg.js";
import { RefactorOpportunity, PhaseProposal } from "./mee-schema.js";
export declare class MeeArchitectureRefactorEngine {
    scan(kg: MeeKnowledgeGraph): RefactorOpportunity[];
    proposeRefactor(opportunity: RefactorOpportunity): PhaseProposal;
    applyRefactorPatch(proposal: PhaseProposal, baseDir?: string): Promise<void>;
}
//# sourceMappingURL=mee-architecture-refactor-engine.d.ts.map