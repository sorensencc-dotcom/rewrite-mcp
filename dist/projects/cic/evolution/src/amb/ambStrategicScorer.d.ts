import { AmbIntentArtifact } from "../types/ambIntent.js";
import { AmbMemorySnapshot, IntentBundleArtifact } from "../types/ambStrategic.js";
export declare class AmbStrategicScorer {
    private memory;
    constructor(memory: AmbMemorySnapshot | null);
    /**
     * Compute strategic score for a single intent.
     * Formula: impact / (risk * operator_burden)
     */
    scoreIntent(intent: AmbIntentArtifact): number;
    /**
     * Compute strategic score for an intent bundle.
     * Uses the aggregate of member intent scores weighted by bundle priority.
     */
    scoreBundle(bundle: IntentBundleArtifact, intents: AmbIntentArtifact[]): number;
    /**
     * Rank intents by strategic score (descending).
     * Attaches strategic_score to each intent.
     */
    rankIntents(intents: AmbIntentArtifact[]): (AmbIntentArtifact & {
        strategic_score: number;
    })[];
    /**
     * Compute impact from desired_outcomes metrics + historical boost.
     */
    private computeImpact;
    /**
     * Compute historical boost factor for an intent type.
     * Higher success rate in past runs → higher boost.
     */
    computeHistoricalBoost(intentType: string): number;
    /**
     * Map risk class to numeric weight.
     */
    private mapRisk;
    /**
     * Compute operator burden from required actions.
     */
    private computeOperatorBurden;
}
//# sourceMappingURL=ambStrategicScorer.d.ts.map