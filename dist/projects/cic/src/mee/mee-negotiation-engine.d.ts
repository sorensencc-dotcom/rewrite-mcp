import { MeeNegotiationAgent, NegotiationResolution } from "./mee-negotiation-agent.js";
import { PhaseProposal } from "./mee-schema.js";
export interface NegotiationTranscriptEntry {
    round: number;
    agentA: string;
    agentB: string;
    resolution: NegotiationResolution | null;
}
export declare class MeeNegotiationEngine {
    private transcript;
    runRound(agents: MeeNegotiationAgent[], round: number): boolean;
    runUntilStable(agents: MeeNegotiationAgent[]): void;
    getTranscript(): NegotiationTranscriptEntry[];
    produceConsensusPlan(agents: MeeNegotiationAgent[]): PhaseProposal[];
}
//# sourceMappingURL=mee-negotiation-engine.d.ts.map