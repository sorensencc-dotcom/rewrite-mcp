import { AmbIntentArtifact } from "../types/ambIntent.js";
import { AmbSignals, AmbPriorityResult } from "./ambPriorityEngine.js";
import { PolicyCharter } from "../types/ambPolicyCharter.js";
export declare class AmbIntentSynthesizer {
    private interpreter;
    constructor(charter: PolicyCharter);
    synthesizeIntents(runId: string, priorities: AmbPriorityResult[], signals: AmbSignals): AmbIntentArtifact[];
}
//# sourceMappingURL=ambIntentSynthesizer.d.ts.map