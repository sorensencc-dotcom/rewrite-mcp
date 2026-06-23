"use strict";
// File: projects/cic/src/mee/self-healing/self-healing-engine.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfHealingEngine = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class SelfHealingEngine {
    constructor(client) {
        this.client = client;
    }
    async generateHealingPlan(job, plan, failure) {
        const suggestion = await this.client.suggestHealing({
            request: job.request,
            plan,
            failure,
        });
        return {
            id: node_crypto_1.default.randomUUID(),
            parentJobId: job.id,
            createdAt: new Date().toISOString(),
            summary: suggestion.summary,
            suggestedTasks: suggestion.tasks,
        };
    }
}
exports.SelfHealingEngine = SelfHealingEngine;
//# sourceMappingURL=self-healing-engine.js.map