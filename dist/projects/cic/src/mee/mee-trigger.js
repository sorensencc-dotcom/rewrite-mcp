"use strict";
// File: projects/cic/src/mee/mee-trigger.ts | Date: 2026-06-03 | v1.1.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeTriggerEngine = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class MeeTriggerEngine {
    constructor(ckg) {
        this.ckg = ckg;
    }
    detectTriggers() {
        const events = [];
        const graph = this.ckg.load();
        const orphans = graph.meta?.hotspots?.orphans || [];
        if (orphans.length > 0) {
            events.push({
                id: node_crypto_1.default.randomUUID(),
                type: "capability_gap",
                payload: { orphans },
                timestamp: Date.now(),
            });
        }
        const stateDiscrepancies = graph.meta?.drift?.stateDiscrepancies || [];
        if (stateDiscrepancies.length > 0) {
            events.push({
                id: node_crypto_1.default.randomUUID(),
                type: "drift",
                payload: { stateDiscrepancies },
                timestamp: Date.now(),
            });
        }
        const unmappedSkills = graph.meta?.drift?.unmappedSkills || [];
        if (unmappedSkills.length > 0) {
            events.push({
                id: node_crypto_1.default.randomUUID(),
                type: "capability_gap",
                payload: { unmappedSkills },
                timestamp: Date.now(),
            });
        }
        return events;
    }
    serialize(event) {
        return { ...event };
    }
    deserialize(raw) {
        return {
            id: raw.id,
            type: raw.type,
            payload: raw.payload ?? {},
            timestamp: raw.timestamp ?? Date.now(),
        };
    }
}
exports.MeeTriggerEngine = MeeTriggerEngine;
//# sourceMappingURL=mee-trigger.js.map