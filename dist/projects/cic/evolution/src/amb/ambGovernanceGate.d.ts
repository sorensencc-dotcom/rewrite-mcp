import { AmbIntentArtifact } from "../types/ambIntent.js";
import { AmbMasHealthGate } from "./ambMasHealthGate.js";
import { AmbRlTestGate } from "./ambRlTestGate.js";
export interface GovernanceReport {
    timestamp: number;
    evaluatedCount: number;
    approvedCount: number;
    rejectedCount: number;
    rejections: {
        intentId: string;
        reason: string;
    }[];
}
export declare class AmbGovernanceGate {
    private readonly masGate;
    private readonly rlGate;
    constructor(masGate: AmbMasHealthGate, rlGate: AmbRlTestGate);
    evaluateIntents(intents: AmbIntentArtifact[]): {
        approvedIntents: AmbIntentArtifact[];
        allIntentsWithStatus: AmbIntentArtifact[];
        report: GovernanceReport;
    };
    private applyGovernance;
}
//# sourceMappingURL=ambGovernanceGate.d.ts.map