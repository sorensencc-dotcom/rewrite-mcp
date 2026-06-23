import { MeeAgentCritique, MeeConsensusScore, MeeConsensusResult } from "./mee-schema.js";
export declare class MeeConsensusEngine {
    readonly threshold: number;
    constructor(threshold?: number);
    scoreProposal(proposalId: string, critiques: MeeAgentCritique[], cycle?: number): MeeConsensusScore;
    determineResult(proposalId: string, score: number, critiques: MeeAgentCritique[], cycle: number, maxCycles?: number): MeeConsensusResult;
}
//# sourceMappingURL=mee-consensus-engine.d.ts.map