import { MemorySubstrate } from "./memory-substrate.js";
export declare class MemoryAPI {
    private substrate;
    constructor(substrate: MemorySubstrate);
    getEvents(type?: string): import("./memory-substrate.js").MemoryEvent[];
    getTrends(): any;
}
//# sourceMappingURL=memory-api.d.ts.map