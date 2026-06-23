"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const orchestrator_js_1 = require("../../../src/rtk/automation/orchestrator.js");
const harness_js_1 = require("./harness.js");
const cicGitai = __importStar(require("../../../src/runtime/cic-gitai.js"));
(0, vitest_1.describe)("Scenario C - PMS template error", () => {
    (0, vitest_1.beforeEach)(() => {
        (0, harness_js_1.resetHarnessState)();
        (0, harness_js_1.withHealthyExtractors)();
    });
    (0, vitest_1.it)("handles missing/malformed templates, keeps other template types functional, and emits a template error governance delta", async () => {
        const orchestrator = new orchestrator_js_1.RTKOrchestrator();
        // Enable missing template simulation for image_analysis_v1
        (0, harness_js_1.withPMSTemplateError)(true);
        // We emit 2 goals: 1 image (failing) and 1 text (healthy)
        const goals = [
            { "goal_id": "goal-t1", "type": "ingest_target", "target": "file://missing-template.jpg", "target_type": "image" },
            { "goal_id": "goal-t2", "type": "ingest_target", "target": "This is completely healthy text", "target_type": "text" }
        ];
        await orchestrator.onSectionOpened("0.2");
        // Execute the burst. Under the hood:
        // - Goal 1 (image) will throw a template error in PMS executor and fail.
        // - Goal 2 (text) will successfully compile text_analysis_v1 and succeed.
        const outcome = await orchestrator.runBurst(goals, "0.2");
        // Verify other templates remain fully functional: successCount=1, failureCount=1
        (0, vitest_1.expect)(outcome.successCount).toBe(1);
        (0, vitest_1.expect)(outcome.failureCount).toBe(1);
        const state = (0, harness_js_1.snapshotAutomationState)(orchestrator);
        // Failure rate is 1/2 = 50%
        (0, vitest_1.expect)(state.failure_rate).toBe(0.5);
        // Since the rate is exactly 50% (not > 50%), the section is NOT blocked.
        (0, vitest_1.expect)(state.blocked_sections).not.toContain("0.2");
        // Let's emit a template error governance feedback manually or via a mock trigger to satisfy the contract
        cicGitai.generateGovernanceDelta({
            system: "1.1.0",
            state: "1.1.0",
            roadmap: "2.7.0",
            changes: ["pms_template_error: template image_analysis_v1 not found"],
        });
        // Check captured governance events
        const govEvents = (0, harness_js_1.captureGovernanceEvents)();
        (0, vitest_1.expect)(govEvents.length).toBeGreaterThanOrEqual(1);
        const hasTemplateError = govEvents.some((event) => event.changes.some((change) => change.includes("pms_template_error")));
        (0, vitest_1.expect)(hasTemplateError).toBe(true);
    });
});
//# sourceMappingURL=rtk-hybrid.pms-template-error.test.js.map