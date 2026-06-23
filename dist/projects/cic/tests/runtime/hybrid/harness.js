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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlledTextExtractor = exports.ControlledImageAnalyzer = void 0;
exports.withHealthyExtractors = withHealthyExtractors;
exports.withFailingExtractors = withFailingExtractors;
exports.withPMSTemplateError = withPMSTemplateError;
exports.emitRRKGoals = emitRRKGoals;
exports.advanceSection = advanceSection;
exports.resetHarnessState = resetHarnessState;
exports.snapshotAutomationState = snapshotAutomationState;
exports.captureGovernanceEvents = captureGovernanceEvents;
exports.getMetricsSnapshot = getMetricsSnapshot;
const vitest_1 = require("vitest");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// Import real components
const executor_js_1 = require("../../../src/pms/executor.js");
const harvester_js_1 = require("../../../src/harvester/harvester.js");
const imageAnalyzer_js_1 = require("../../../src/harvester/extractors/imageAnalyzer.js");
const textExtractor_js_1 = require("../../../src/harvester/extractors/textExtractor.js");
const rtkCic = __importStar(require("../../../src/runtime/rtk-cic.js"));
const cicGitai = __importStar(require("../../../src/runtime/cic-gitai.js"));
const sectionTracking = __importStar(require("../../../src/lib/section-tracking.js"));
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
// Global controls for the harness
let injectedFailureRate = 0;
let jobExecutionCount = 0;
let simulatePMSMissingTemplate = false;
let governanceEvents = [];
let sectionTransitionEvents = [];
let currentSectionState = {
    "0.1-A": "COMPLETE",
    "0.2": "PENDING",
    "0.3": "PENDING",
    "0.4": "PENDING",
};
// 1. Create Controlled Extractor subclasses
class ControlledImageAnalyzer extends imageAnalyzer_js_1.ImageAnalyzer {
    async extract(input) {
        jobExecutionCount++;
        const shouldFail = injectedFailureRate > 0 && (jobExecutionCount % 10) < (injectedFailureRate * 10);
        if (shouldFail) {
            throw new Error("Simulated extractor failure (ImageAnalyzer)");
        }
        return super.extract(input);
    }
}
exports.ControlledImageAnalyzer = ControlledImageAnalyzer;
class ControlledTextExtractor extends textExtractor_js_1.TextExtractor {
    async extract(input) {
        jobExecutionCount++;
        const shouldFail = injectedFailureRate > 0 && (jobExecutionCount % 10) < (injectedFailureRate * 10);
        if (shouldFail) {
            throw new Error("Simulated extractor failure (TextExtractor)");
        }
        return super.extract(input);
    }
}
exports.ControlledTextExtractor = ControlledTextExtractor;
// 2. Setup the Harvester and register Controlled Extractors
const harvesterInstance = new harvester_js_1.Harvester();
const testImageAnalyzer = new ControlledImageAnalyzer();
const testTextExtractor = new ControlledTextExtractor();
harvesterInstance.register("image", testImageAnalyzer);
harvesterInstance.register("text", testTextExtractor);
// 3. Spies and Mocks
vitest_1.vi.spyOn(rtkCic, "submitIngestionJob").mockImplementation(async (job) => {
    try {
        // Map job payload to extractor input format
        const isText = job.type === "text";
        const harvesterJob = {
            type: isText ? "text" : "image",
            payload: isText
                ? { raw: job.target || "Default text content for testing" }
                : {
                    filename: job.target ? job.target.replace("file://", "") : "photo.jpg",
                    mime: "image/jpeg",
                },
        };
        // Run the job through the real Harvester pipeline
        await harvesterInstance.run(harvesterJob);
        return { ok: true };
    }
    catch (err) {
        return { ok: false };
    }
});
// Intercept PMS execute calls to simulate missing templates
const originalExecute = executor_js_1.PMSExecutor.prototype.execute;
vitest_1.vi.spyOn(executor_js_1.PMSExecutor.prototype, "execute").mockImplementation(function (reqOrTemplateId, vars) {
    const templateId = typeof reqOrTemplateId === "string" ? reqOrTemplateId : reqOrTemplateId.templateId;
    if (simulatePMSMissingTemplate && templateId === "image_analysis_v1") {
        throw new Error(`Template ${templateId} not found in registry`);
    }
    return originalExecute.call(this, reqOrTemplateId, vars);
});
// Intercept Governance delta generation
vitest_1.vi.spyOn(cicGitai, "generateGovernanceDelta").mockImplementation((data) => {
    const result = {
        system_version: data.system,
        state_version: data.state,
        roadmap_version: data.roadmap,
        changes: data.changes,
    };
    governanceEvents.push(result);
    return result;
});
// Intercept section tracking
const originalAdvanceSection = sectionTracking.advanceSection;
vitest_1.vi.spyOn(sectionTracking, "advanceSection").mockImplementation((section, state) => {
    sectionTransitionEvents.push(section);
    currentSectionState = originalAdvanceSection(section, state);
    return currentSectionState;
});
// 4. Exposed Harness Helpers
function withHealthyExtractors() {
    injectedFailureRate = 0;
    jobExecutionCount = 0;
}
function withFailingExtractors(rate) {
    injectedFailureRate = rate;
    jobExecutionCount = 0;
}
function withPMSTemplateError(enabled) {
    simulatePMSMissingTemplate = enabled;
}
function emitRRKGoals(fixtureFilename) {
    const fixturePath = path_1.default.resolve(__dirname, "../../fixtures", fixtureFilename);
    const data = fs_1.default.readFileSync(fixturePath, "utf-8");
    return JSON.parse(data);
}
function advanceSection(sectionId) {
    currentSectionState = sectionTracking.advanceSection(sectionId, currentSectionState);
    return currentSectionState;
}
function resetHarnessState() {
    injectedFailureRate = 0;
    jobExecutionCount = 0;
    simulatePMSMissingTemplate = false;
    governanceEvents = [];
    sectionTransitionEvents = [];
    currentSectionState = {
        "0.1-A": "COMPLETE",
        "0.2": "PENDING",
        "0.3": "PENDING",
        "0.4": "PENDING",
    };
}
function snapshotAutomationState(orchestrator) {
    return orchestrator.getStateTracker().getState();
}
function captureGovernanceEvents() {
    const events = [...governanceEvents];
    governanceEvents = [];
    return events;
}
function getMetricsSnapshot(orchestrator) {
    const state = orchestrator.getStateTracker().getState();
    return {
        rtk_bursts_active: state.open_bursts.length,
        rtk_burst_failure_rate: state.failure_rate,
        rtk_jobs_in_flight: 0,
        rtk_sections_blocked: state.blocked_sections.length,
    };
}
//# sourceMappingURL=harness.js.map