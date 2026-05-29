import { vi } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Import real components
import { PMSExecutor } from "../../../src/pms/executor.js";
import { Harvester } from "../../../src/harvester/harvester.js";
import { ImageAnalyzer } from "../../../src/harvester/extractors/imageAnalyzer.js";
import { TextExtractor } from "../../../src/harvester/extractors/textExtractor.js";
import { RTKOrchestrator } from "../../../src/rtk/automation/orchestrator.js";
import * as rtkCic from "../../../src/runtime/rtk-cic.js";
import * as cicGitai from "../../../src/runtime/cic-gitai.js";
import * as sectionTracking from "../../../src/lib/section-tracking.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Global controls for the harness
let injectedFailureRate = 0;
let jobExecutionCount = 0;
let simulatePMSMissingTemplate = false;
let governanceEvents: any[] = [];
let sectionTransitionEvents: string[] = [];
let currentSectionState: Record<string, string> = {
  "0.1-A": "COMPLETE",
  "0.2": "PENDING",
  "0.3": "PENDING",
  "0.4": "PENDING",
};

// 1. Create Controlled Extractor subclasses
export class ControlledImageAnalyzer extends ImageAnalyzer {
  async extract(input: any) {
    jobExecutionCount++;
    const shouldFail = injectedFailureRate > 0 && (jobExecutionCount % 10) < (injectedFailureRate * 10);
    if (shouldFail) {
      throw new Error("Simulated extractor failure (ImageAnalyzer)");
    }
    return super.extract(input);
  }
}

export class ControlledTextExtractor extends TextExtractor {
  async extract(input: any) {
    jobExecutionCount++;
    const shouldFail = injectedFailureRate > 0 && (jobExecutionCount % 10) < (injectedFailureRate * 10);
    if (shouldFail) {
      throw new Error("Simulated extractor failure (TextExtractor)");
    }
    return super.extract(input);
  }
}

// 2. Setup the Harvester and register Controlled Extractors
const harvesterInstance = new Harvester();
const testImageAnalyzer = new ControlledImageAnalyzer();
const testTextExtractor = new ControlledTextExtractor();

harvesterInstance.register("image", testImageAnalyzer);
harvesterInstance.register("text", testTextExtractor);

// 3. Spies and Mocks
vi.spyOn(rtkCic, "submitIngestionJob").mockImplementation(async (job: any) => {
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
  } catch (err: any) {
    return { ok: false };
  }
});

// Intercept PMS execute calls to simulate missing templates
const originalExecute = PMSExecutor.prototype.execute;
vi.spyOn(PMSExecutor.prototype, "execute").mockImplementation(function (
  this: PMSExecutor,
  reqOrTemplateId: any,
  vars?: any
) {
  const templateId = typeof reqOrTemplateId === "string" ? reqOrTemplateId : reqOrTemplateId.templateId;
  if (simulatePMSMissingTemplate && templateId === "image_analysis_v1") {
    throw new Error(`Template ${templateId} not found in registry`);
  }
  return originalExecute.call(this, reqOrTemplateId, vars);
});

// Intercept Governance delta generation
vi.spyOn(cicGitai, "generateGovernanceDelta").mockImplementation((data: any) => {
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
vi.spyOn(sectionTracking, "advanceSection").mockImplementation((section: string, state: Record<string, string>) => {
  sectionTransitionEvents.push(section);
  currentSectionState = originalAdvanceSection(section, state);
  return currentSectionState;
});

// 4. Exposed Harness Helpers
export function withHealthyExtractors() {
  injectedFailureRate = 0;
  jobExecutionCount = 0;
}

export function withFailingExtractors(rate: number) {
  injectedFailureRate = rate;
  jobExecutionCount = 0;
}

export function withPMSTemplateError(enabled: boolean) {
  simulatePMSMissingTemplate = enabled;
}

export function emitRRKGoals(fixtureFilename: string): any[] {
  const fixturePath = path.resolve(__dirname, "../../fixtures", fixtureFilename);
  const data = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(data);
}

export function advanceSection(sectionId: string) {
  currentSectionState = sectionTracking.advanceSection(sectionId, currentSectionState);
  return currentSectionState;
}

export function resetHarnessState() {
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

export function snapshotAutomationState(orchestrator: RTKOrchestrator) {
  return orchestrator.getStateTracker().getState();
}

export function captureGovernanceEvents() {
  const events = [...governanceEvents];
  governanceEvents = [];
  return events;
}

export function getMetricsSnapshot(orchestrator: RTKOrchestrator) {
  const state = orchestrator.getStateTracker().getState();
  return {
    rtk_bursts_active: state.open_bursts.length,
    rtk_burst_failure_rate: state.failure_rate,
    rtk_jobs_in_flight: 0,
    rtk_sections_blocked: state.blocked_sections.length,
  };
}
