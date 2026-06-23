/**
 * pipeline.ts
 * ARPS Phase 22.4 — Closed-loop Roadmapping Pipeline
 * Orchestrates harvester → synthesizer → sandbox → git → docs.
 */
export declare class RoadmapPipeline {
    private repoRoot;
    private docsRoot;
    private registryPath;
    constructor(repoRoot: string, docsRoot: string, registryPath: string);
    run(opts: {
        dryRun: boolean;
        verbose: boolean;
        deltaFile?: string;
        commit?: boolean;
    }): Promise<void>;
}
//# sourceMappingURL=pipeline.d.ts.map