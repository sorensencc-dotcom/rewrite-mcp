export type Outcome = "success" | "partial" | "failure";
export interface SkillTelemetry {
    runId: string;
    pipeline: string;
    stage: string;
    skillName: string;
    skillVersion: string;
    tenantId: string;
    region: string;
    startedAt: string;
    finishedAt: string;
    latencyMs: number;
    inputSizeBytes: number;
    outputSizeBytes: number | null;
    outcome: Outcome;
    errorType?: string;
    errorMessageSnippet?: string;
    instinctName?: string;
    instinctVersion?: string;
    rulesEnforced: string[];
    hooksFired: string[];
}
export interface InstinctTelemetry {
    runId: string;
    pipeline: string;
    stage: string;
    instinctName: string;
    instinctVersion: string;
    tenantId: string;
    region: string;
    firedAt: string;
    skillsSelected: string[];
    skillsAvoided: string[];
    pipelineOutcome?: Outcome;
    driftDelta?: number;
    latencyDeltaMs?: number;
    costDelta?: number;
}
