export declare class AmbRunner {
    private runId;
    private timestamp;
    private ckgStore;
    private priorityEngine;
    private intentSynthesizer;
    private policyInterpreter;
    constructor();
    run(options?: {
        triggerLoop?: boolean;
    }): Promise<boolean>;
    private collectSignals;
    private persistArtifacts;
}
//# sourceMappingURL=ambRunner.d.ts.map