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
const orchestrator_js_1 = require("../../src/rtk/automation/orchestrator.js");
const rtkCic = __importStar(require("../../src/runtime/rtk-cic.js"));
vitest_1.vi.mock("../../src/runtime/rtk-cic.js");
(0, vitest_1.describe)("RTK Automation Hybrid Tests (Mode B)", () => {
    (0, vitest_1.it)("runs a healthy burst successfully", async () => {
        vitest_1.vi.spyOn(rtkCic, "submitIngestionJob").mockResolvedValue({ ok: true });
        const orchestrator = new orchestrator_js_1.RTKOrchestrator();
        const goals = [
            {
                goal_id: "goal-1",
                type: "ingest_target",
                target: "file://photo.jpg",
                target_type: "image",
            },
        ];
        const outcome = await orchestrator.runBurst(goals, "0.2");
        (0, vitest_1.expect)(outcome.successCount).toBe(1);
        (0, vitest_1.expect)(outcome.failureCount).toBe(0);
        (0, vitest_1.expect)(orchestrator.getStateTracker().getState().failure_rate).toBe(0);
        (0, vitest_1.expect)(orchestrator.getStateTracker().getState().blocked_sections).not.toContain("0.2");
    });
    (0, vitest_1.it)("blocks section when burst failure rate exceeds threshold", async () => {
        vitest_1.vi.spyOn(rtkCic, "submitIngestionJob").mockResolvedValue({ ok: false });
        const orchestrator = new orchestrator_js_1.RTKOrchestrator();
        const goals = [
            {
                goal_id: "goal-2",
                type: "ingest_target",
                target: "file://photo.jpg",
                target_type: "image",
            },
        ];
        const outcome = await orchestrator.runBurst(goals, "0.2");
        (0, vitest_1.expect)(outcome.successCount).toBe(0);
        (0, vitest_1.expect)(outcome.failureCount).toBe(1);
        (0, vitest_1.expect)(orchestrator.getStateTracker().getState().failure_rate).toBe(1);
        (0, vitest_1.expect)(orchestrator.getStateTracker().getState().blocked_sections).toContain("0.2");
    });
});
//# sourceMappingURL=rtk-automation.hybrid.test.js.map