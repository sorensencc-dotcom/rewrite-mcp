/**
 * arps-memory-integration.ts
 * Phase 23 — ARPS ↔ Memory Layer Integration Rules
 */
import { MemorySubstrate } from "../../memory/memory-substrate.js";
export declare class ArpsMemoryIntegration {
    private substrate;
    constructor(substrate: MemorySubstrate);
    getRepeatedFailures(): import("../../memory/memory-substrate.js").MemoryEvent[];
    getPromptDriftTrend(): number[];
    getStalePhases(): import("../../memory/memory-substrate.js").MemoryEvent[];
    buildArpsHints(): {
        repeatedFailures: number;
        driftTrend: number[];
        stalePhases: number;
    };
}
//# sourceMappingURL=arps-memory-integration.d.ts.map