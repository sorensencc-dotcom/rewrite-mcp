/**
 * arps-memory-pipeline.ts
 * Phase 23 — ARPS ↔ Memory Layer Integration
 * Wraps RoadmapPipeline to emit ARPS_DELTA events to memory on roadmap changes
 */
export interface ArpsMemoryPipelineOptions {
    dryRun: boolean;
    verbose: boolean;
    deltaFile?: string;
    commit?: boolean;
    sessionId?: string;
}
export declare class ArpsMemoryPipeline {
    private repoRoot;
    private docsRoot;
    private registryPath;
    private substrate;
    private memoryHarvester;
    constructor(repoRoot: string, docsRoot: string, registryPath: string);
    /**
     * Emit ARPS_DELTA event to memory layer when harvester detects changes
     */
    private emitArpsDelta;
    /**
     * Query memory to detect trends and patterns from previous roadmap evolution
     */
    private queryMemoryContext;
    run(opts: ArpsMemoryPipelineOptions): Promise<void>;
}
