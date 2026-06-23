// File: projects/cic/src/memory/memory-api.ts | Date: 2026-06-03 | v1.0.0
export class MemoryAPI {
    constructor(substrate) {
        this.substrate = substrate;
    }
    getEvents(type) {
        return this.substrate.query({ type });
    }
    getTrends() {
        return this.substrate.snapshot();
    }
}
//# sourceMappingURL=memory-api.js.map