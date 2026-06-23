import { AmbIntentArtifact } from "../types/ambIntent.js";
import { IntentBundleArtifact, BundleType } from "../types/ambStrategic.js";
export declare class AmbIntentBundler {
    /**
     * Group intents into coherent bundles by domain affinity.
     */
    bundleIntents(runId: string, intents: AmbIntentArtifact[]): IntentBundleArtifact[];
    /**
     * Classify a single intent into its bundle type based on target_domains.
     */
    classifyBundleType(intent: AmbIntentArtifact): BundleType;
    /**
     * Form a bundle from a set of intents of the same type.
     */
    private formBundle;
    /**
     * Generate a human-readable summary for a bundle.
     */
    private generateBundleSummary;
}
//# sourceMappingURL=ambIntentBundler.d.ts.map