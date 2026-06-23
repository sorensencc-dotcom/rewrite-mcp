import { MemorySubstrate } from "./memory-substrate.js";
export declare class MemorySynthesizer {
    private substrate;
    constructor(substrate: MemorySubstrate);
    weeklySummary(): any;
    monthlyReport(): any;
    detectTrends(): any;
    run(): Promise<void>;
}
