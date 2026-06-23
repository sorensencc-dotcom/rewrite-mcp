"use strict";
// File: projects/cic/src/mee/planning/planning-engine.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningEngine = void 0;
const task_extractor_js_1 = require("./task-extractor.js");
const dependency_detector_js_1 = require("./dependency-detector.js");
const plan_to_proposal_js_1 = require("./plan-to-proposal.js");
class PlanningEngine {
    constructor(mode = "deterministic", llm) {
        this.mode = mode;
        this.llm = llm;
        this.extractor = new task_extractor_js_1.TaskExtractor();
        this.deps = new dependency_detector_js_1.DependencyDetector();
        this.converter = new plan_to_proposal_js_1.PlanToProposal();
    }
    async generatePlanWithMode(request, mode) {
        const activeMode = mode || this.mode;
        if (activeMode === "llm" && this.llm) {
            return this.llm.generatePlan(request);
        }
        if (activeMode === "hybrid" && this.llm) {
            const deterministic = this.generatePlan(request);
            const llmPlan = await this.llm.generatePlan(request);
            return llmPlan.tasks.length ? llmPlan : deterministic;
        }
        return this.generatePlan(request);
    }
    generatePlan(request) {
        const tasks = this.extractor.extractTasks(request);
        const ordered = this.deps.orderTasks(tasks);
        return {
            rootRequest: request,
            tasks: ordered,
            summary: `Generated ${ordered.length} tasks from request`,
        };
    }
    generateProposals(plan) {
        return plan.tasks.map((t) => this.converter.toProposal(t));
    }
}
exports.PlanningEngine = PlanningEngine;
//# sourceMappingURL=planning-engine.js.map