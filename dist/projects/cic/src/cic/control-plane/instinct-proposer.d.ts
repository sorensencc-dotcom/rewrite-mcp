import { SkillTelemetry, InstinctTelemetry } from "./telemetry-types.js";
export interface InstinctPatch {
    instinctName: string;
    baseVersion: string;
    proposedVersion: string;
    diff: any;
    impactScore: number;
    rationale: string;
    metricsBefore?: {
        successRate: number;
        avgLatencyMs: number;
        avgDrift: number;
    };
    metricsAfter?: {
        successRate: number;
        avgLatencyMs: number;
        avgDrift: number;
    };
}
export declare class InstinctProposer {
    private skillEvents;
    private instinctEvents;
    constructor(skillEvents: SkillTelemetry[], instinctEvents: InstinctTelemetry[]);
    /**
     * Compares runs where instincts fired vs where they did not,
     * producing optimization patches with weighted impact scores.
     */
    proposePatches(): InstinctPatch[];
    private bumpMinor;
}
//# sourceMappingURL=instinct-proposer.d.ts.map