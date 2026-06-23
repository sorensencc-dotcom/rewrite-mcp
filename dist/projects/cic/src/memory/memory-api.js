"use strict";
// File: projects/cic/src/memory/memory-api.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryAPI = void 0;
class MemoryAPI {
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
exports.MemoryAPI = MemoryAPI;
//# sourceMappingURL=memory-api.js.map