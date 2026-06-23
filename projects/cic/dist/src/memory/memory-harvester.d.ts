/**
 * memory-harvester.ts
 * Phase 23.2 — Memory Harvester Agent
 * Wires CIC subsystems → MemorySubstrate
 */
import { MemorySubstrate, MemoryEvent } from "./memory-substrate.js";
export declare class MemoryHarvester {
    private substrate;
    private repoRoot;
    constructor(substrate: MemorySubstrate, repoRoot: string);
    private collectArpsDelta;
    private collectPipelineRun;
    private collectDocsBuild;
    collect(): Promise<MemoryEvent[]>;
    run(): Promise<void>;
}
