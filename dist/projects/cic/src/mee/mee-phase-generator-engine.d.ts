import { MeePhaseSpec, ResearchFinding, MeeConsensusResult } from "./mee-schema.js";
import { MeeAgentOrchestrator } from "./mee-agent-orchestrator.js";
export declare class MeePhaseGeneratorEngine {
    private readonly threshold;
    constructor(threshold?: number);
    generatePhaseSpec(findings: ResearchFinding[], nextPhaseNumber?: number): MeePhaseSpec;
    scorePhaseSpec(spec: MeePhaseSpec): number;
    runValidationRound(spec: MeePhaseSpec, orchestrator: MeeAgentOrchestrator, jobId: string): Promise<MeeConsensusResult>;
}
//# sourceMappingURL=mee-phase-generator-engine.d.ts.map