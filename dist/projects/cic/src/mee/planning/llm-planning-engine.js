"use strict";
// File: projects/cic/src/mee/planning/llm-planning-engine.ts | Date: 2026-06-04 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMPlanningEngine = void 0;
class LLMPlanningEngine {
    constructor(client) {
        this.client = client;
    }
    async generatePlan(request, opts) {
        return this.client.generatePlan({
            request,
            repoSummary: opts?.repoSummary,
            recentFailures: opts?.recentFailures,
        });
    }
}
exports.LLMPlanningEngine = LLMPlanningEngine;
//# sourceMappingURL=llm-planning-engine.js.map