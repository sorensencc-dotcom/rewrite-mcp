// Shared Skills Library - Main Export Hub
// v1.0.0 | 2026-06-05

import { summarizeSection } from "./cic-section-summarizer/index.js";
import { detectDrift } from "./agent-drift-detector/index.js";
import { orchestratePipeline } from "./rewrite-labs-orchestrator/index.js";
import { diagnosticsEnvironment } from "./environment-diagnostics/index.js";
import { manageSessionBoundary } from "./session-boundary-manager/index.js";
import { updateRoadmap } from "./cic-roadmap-updater/index.js";
import { generateProcedure } from "./operator-grade-procedures/index.js";
import manifest from "./manifest.json" assert { type: "json" };

export const skills = {
  "cic-section-summarizer": summarizeSection,
  "agent-drift-detector": detectDrift,
  "rewrite-labs-orchestrator": orchestratePipeline,
  "environment-diagnostics": diagnosticsEnvironment,
  "session-boundary-manager": manageSessionBoundary,
  "cic-roadmap-updater": updateRoadmap,
  "operator-grade-procedures": generateProcedure
};

export { summarizeSection, detectDrift, orchestratePipeline, diagnosticsEnvironment, manageSessionBoundary, updateRoadmap, generateProcedure };

export { manifest };

export async function invokeSkill(skillName, payload) {
  const skill = skills[skillName];
  if (!skill) throw new Error(`Skill not found: ${skillName}`);
  return skill(payload);
}
