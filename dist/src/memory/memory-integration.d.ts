/**
 * Phase 23 Memory Layer Integration
 * Wires substrate, harvester, and synthesizer into a unified memory system
 */
import { MemorySubstrate } from "./memory-substrate";
import { MemoryHarvester } from "./memory-harvester";
import { MemorySynthesizer } from "./memory-synthesizer";
export declare class MemoryLayer {
    private substrate;
    private harvester;
    private synthesizer;
    constructor(storePath?: string);
    /**
     * Get harvester for event recording
     */
    getHarvester(): MemoryHarvester;
    /**
     * Get synthesizer for trend analysis
     */
    getSynthesizer(): MemorySynthesizer;
    /**
     * Get substrate for direct queries
     */
    getSubstrate(): MemorySubstrate;
    /**
     * Run full memory health check
     */
    healthCheck(): Promise<{
        status: "healthy" | "degraded" | "failed";
        stats: any;
        issues: string[];
    }>;
    /**
     * Run scheduled weekly synthesis
     */
    runWeeklySynthesis(): Promise<any>;
    /**
     * Run scheduled monthly synthesis
     */
    runMonthlySynthesis(): Promise<any>;
}
export declare function initializeMemoryLayer(storePath?: string): MemoryLayer;
export declare function getMemoryLayer(): MemoryLayer;
//# sourceMappingURL=memory-integration.d.ts.map