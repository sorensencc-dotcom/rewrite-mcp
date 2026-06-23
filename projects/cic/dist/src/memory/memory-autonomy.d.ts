/**
 * memory-autonomy.ts
 * Phase 23.7 — Memory-Driven Autonomy
 */
import { MemorySubstrate } from "./memory-substrate.js";
export interface AutonomyProposal {
    id: string;
    reason: string;
    recommendation: string;
    timestamp: string;
}
export declare class MemoryAutonomyEngine {
    private substrate;
    constructor(substrate: MemorySubstrate);
    detectStalePhases(): AutonomyProposal[];
    detectRepeatedFailures(): AutonomyProposal[];
    detectPromptDrift(): AutonomyProposal[];
    detectLaneStagnation(): AutonomyProposal[];
    run(): AutonomyProposal[];
}
