import { AmbIntentArtifact } from "../types/ambIntent.js";
import { PolicyCharter } from "../types/ambPolicyCharter.js";
export declare class AmbPolicyInterpreter {
    private charter;
    constructor(charter: PolicyCharter);
    applyPolicy(intent: AmbIntentArtifact): AmbIntentArtifact;
    private isForbiddenDomain;
    private isOperatorRequired;
    private isLineageRequired;
    private isRlDependent;
    private computeRiskClass;
}
//# sourceMappingURL=ambPolicyInterpreter.d.ts.map