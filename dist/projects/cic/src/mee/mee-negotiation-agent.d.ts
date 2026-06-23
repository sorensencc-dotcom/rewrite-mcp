import { PhaseProposal, PhasePatchSet } from "./mee-schema.js";
export interface NegotiationResolution {
    type: "reorder" | "merge" | "drop" | "modify";
    reason: string;
    details?: Record<string, unknown>;
}
export declare class MeeNegotiationAgent {
    readonly proposal: PhaseProposal;
    readonly patchSet: PhasePatchSet;
    constructor(proposal: PhaseProposal, patchSet: PhasePatchSet);
    analyzeConflicts(other: MeeNegotiationAgent): NegotiationResolution | null;
    proposeResolution(other: MeeNegotiationAgent): NegotiationResolution | null;
    acceptResolution(_resolution: NegotiationResolution): boolean;
    rejectResolution(_resolution: NegotiationResolution): boolean;
}
//# sourceMappingURL=mee-negotiation-agent.d.ts.map