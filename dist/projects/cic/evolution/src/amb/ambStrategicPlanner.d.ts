import { AmbIntentArtifact } from "../types/ambIntent.js";
import { AmbMemorySnapshot, IntentBundleArtifact, StrategicPlanArtifact, PlannedIntent } from "../types/ambStrategic.js";
export interface DetectedPattern {
    pattern_type: "recurring_drift" | "persistent_mas_instability" | "rl_plateau" | "stale_graph";
    severity: "low" | "medium" | "high";
    description: string;
    evidence: Record<string, number>;
}
export declare class AmbStrategicPlanner {
    private readonly defaultHorizon;
    /**
     * Generate a strategic plan from current intents, bundles, and memory.
     */
    generatePlan(runId: string, intents: AmbIntentArtifact[], bundles: IntentBundleArtifact[], memory: AmbMemorySnapshot | null): StrategicPlanArtifact;
    /**
     * Detect recurring patterns from cross-run memory.
     */
    detectPatterns(memory: AmbMemorySnapshot | null): DetectedPattern[];
    /**
     * Sequence planned steps across future runs based on patterns and bundles.
     * Order: cleanup → stabilize → optimize/redesign
     */
    sequenceSteps(patterns: DetectedPattern[], bundles: IntentBundleArtifact[], intents: AmbIntentArtifact[]): PlannedIntent[];
    /**
     * Project aggregate impact across the planned steps.
     */
    private projectImpact;
    /**
     * Collect policy constraints that apply to the current intent set.
     */
    private collectPolicyConstraints;
}
//# sourceMappingURL=ambStrategicPlanner.d.ts.map