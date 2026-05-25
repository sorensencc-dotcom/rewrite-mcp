// orchestrator.ts - AI-OS Export Pipeline Orchestrator

import * as path from "node:path";
import { detectDrift } from "./drift.js";
import { normalize } from "./normalize.js";
import { merge } from "./merge.js";
import { version } from "./version.js";
import { syncDocs } from "./docs_sync.js";
import { validateAIOS } from "./validate.js"; // New import
import { generateDiff } from "./diff.js"; // New import

// Placeholder for generate, as it was not specified to be a separate module yet.
async function generate(root: string) { console.log("Generating AI-OS..."); }

export async function runPipeline(root: string) {
  console.log("Starting AI-OS Export Pipeline...");

  const aiOsRoot = path.join(root, "ai-os");
  const aiOsPrevRoot = path.join(root, "ai-os-prev");

  // 1. generate
  await generate(aiOsRoot);

  // 2. normalize
  await normalize(aiOsRoot);

  // 3. merge
  await merge(aiOsRoot);

  // 4. validate (New step)
  console.log("Validating AI-OS export...");
  const isValid = await validateAIOS(aiOsRoot);
  if (!isValid) {
    console.error("AI-OS Validation failed. Halting pipeline.");
    return; // Stop the pipeline
  }
  console.log("AI-OS Validation passed.");

  // 5. version
  await version(aiOsRoot);

  // 6. docs
  await syncDocs(aiOsRoot);

  // 7. drift
  await detectDrift(aiOsRoot, aiOsPrevRoot);

  // 8. diff (New step)
  await generateDiff(aiOsRoot, aiOsPrevRoot);

  console.log("AI-OS Export Pipeline completed.");
}

// Example usage (for testing or manual execution)
// runPipeline(process.cwd()).catch(console.error);
