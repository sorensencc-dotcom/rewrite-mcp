import { MasHealthSnapshot } from "./ambMasHealthConfig.js";
import { AmbIntentArtifact } from "../types/ambIntent.js";
export declare class AmbMasHealthGate {
    private masSnapshot;
    constructor(masSnapshot: MasHealthSnapshot);
    isMasStableFor(intent: AmbIntentArtifact): boolean;
}
//# sourceMappingURL=ambMasHealthGate.d.ts.map