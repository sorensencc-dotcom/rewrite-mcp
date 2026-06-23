import { AmbIntentArtifact } from "./types/ambIntent.js";
export interface EvolutionConfig {
    autoApprove?: boolean;
    enableDistillation?: boolean;
    enableFusion?: boolean;
    tenantId?: string;
    tenantUrl?: string;
    ambIntents?: AmbIntentArtifact[];
}
export declare class LoopRunner {
    private runId;
    private runDir;
    private ckgStore;
    private config;
    private ambIntents;
    constructor(config?: EvolutionConfig);
    getRunId(): string;
    getRunDir(): string;
    runLifecycle(): Promise<boolean>;
    private stageAudit;
    private stageDistillation;
    private stageProposals;
    private stageSimulations;
    private stageRanking;
    private stageOperatorDecision;
    private stageApply;
    private stageLog;
    private writeArtifact;
}
//# sourceMappingURL=loopRunner.d.ts.map