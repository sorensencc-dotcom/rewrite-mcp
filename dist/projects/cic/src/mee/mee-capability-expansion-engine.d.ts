import { MeeKnowledgeGraph } from "./mee-kg.js";
import { MeeCapabilitySpec, PhaseProposal } from "./mee-schema.js";
export declare class MeeCapabilityExpansionEngine {
    detectGaps(kg: MeeKnowledgeGraph): MeeCapabilitySpec[];
    generateProposal(spec: MeeCapabilitySpec): PhaseProposal;
    applyExpansion(spec: MeeCapabilitySpec, kg?: MeeKnowledgeGraph, baseDir?: string): Promise<void>;
}
//# sourceMappingURL=mee-capability-expansion-engine.d.ts.map