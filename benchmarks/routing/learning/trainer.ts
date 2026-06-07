import { readCostLog } from "../../costs/system";
import { extractFeatures } from "./features";
import { evaluateModels } from "./evaluator";
import { optimizePolicy, OptimizedPolicy } from "./optimizer";
import { savePolicies, getPolicyDiff } from "./policyStore";
import { generateDailyReport, generateWeeklyReport } from "../../costs/reports/generate";
import { writeHelmDashboardReport } from "../../costs/reports/helm";

export async function trainPolicies(): Promise<Record<string, OptimizedPolicy>> {
  console.log("[trainer] Starting Autonomous Routing Policy Engine (ARPE) training...");

  // 1. Load logs
  console.log("[trainer] Loading cost logs...");
  const logs = readCostLog();
  console.log(`[trainer] Loaded ${logs.length} log entries.`);

  // 2. Extract features
  console.log("[trainer] Extracting features from logs...");
  const features = extractFeatures(logs);
  console.log("[trainer] Feature extraction complete.");

  // 3. Evaluate models
  console.log("[trainer] Evaluating model performances...");
  const evaluations = evaluateModels(features, logs);
  
  for (const [taskType, evals] of Object.entries(evaluations)) {
    console.log(`[trainer] Evaluations for ${taskType}:`);
    evals.forEach((e) => {
      console.log(`  - ${e.model}: score=${e.score.toFixed(2)} cost=$${e.avgCost.toFixed(4)} qual=${e.avgQuality.toFixed(1)} rel=${e.reliability.toFixed(2)} lat=${e.avgLatency.toFixed(0)}ms`);
    });
  }

  // 4. Optimize policies
  console.log("[trainer] Optimizing routing policies...");
  const newPolicies: Record<string, OptimizedPolicy> = {};
  const allTasks: ("rewrite" | "analysis" | "generation" | "chat")[] = [
    "rewrite",
    "analysis",
    "generation",
    "chat",
  ];

  for (const taskType of allTasks) {
    const taskEvals = evaluations[taskType] || [];
    newPolicies[taskType] = optimizePolicy(taskType, taskEvals, logs);
    
    console.log(`[trainer] Optimized policy for ${taskType}:`);
    console.log(`  - Preferred Order: ${newPolicies[taskType].preferredOrder.join(" -> ")}`);
    console.log(`  - Quality Target: ${newPolicies[taskType].qualityTarget.toFixed(2)}`);
    console.log(`  - Max Cost USD: $${newPolicies[taskType].maxCostUsd.toFixed(4)}`);
    console.log(`  - Local Preference: ${newPolicies[taskType].localPreference.toFixed(2)}`);
    console.log(`  - Provider Weights: ${JSON.stringify(newPolicies[taskType].providerWeights)}`);
  }

  // 5. Save new policy
  console.log("[trainer] Saving new policies to store...");
  savePolicies(newPolicies);
  console.log("[trainer] Policies saved successfully.");

  // 6. Regenerate reports for Helm Dashboard
  console.log("[trainer] Regenerating Helm Dashboard reports...");
  try {
    await generateDailyReport();
    await generateWeeklyReport();
    await writeHelmDashboardReport();
    console.log("[trainer] Helm Dashboard reports updated.");
  } catch (err) {
    console.warn("[trainer] Failed to regenerate dashboard reports:", err);
  }

  const diff = getPolicyDiff();
  if (diff && diff.changed) {
    console.log(`[trainer] Policy Drift detected! Upgraded to version ${diff.version.current}.`);
  } else {
    console.log("[trainer] Policy stabilized. No significant drift detected.");
  }

  return newPolicies;
}

// Allow script execution
const isMain = process.argv[1] && (
  process.argv[1].replace(/\\/g, "/").endsWith("learning/trainer.ts") ||
  import.meta.url.endsWith(process.argv[1])
);

if (isMain) {
  trainPolicies()
    .then(() => {
      console.log("[trainer] Training run completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[trainer] Training run failed:", err);
      process.exit(1);
    });
}
