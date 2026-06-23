/**
 * harvester-agent.ts
 * ARPS Phase 22.2 — Roadmap Harvester Agent
 * Extracts deltas from git logs, tasks, telemetry, and test outputs.
 */
export interface RoadmapComponentDelta {
    name: string;
    status: string;
    details: string;
    source: string;
}
export interface RoadmapDelta {
    components: RoadmapComponentDelta[];
    completions: string[];
    gaps: string[];
    timestamp: string;
}
export declare class RoadmapHarvester {
    private repoRoot;
    constructor(repoRoot: string);
    parseGit(): Promise<RoadmapComponentDelta[]>;
    parseTasks(): Promise<RoadmapComponentDelta[]>;
    parseTelemetry(): Promise<RoadmapComponentDelta[]>;
    run(): Promise<RoadmapDelta>;
}
