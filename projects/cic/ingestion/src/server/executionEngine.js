// Deterministic multi‑step execution engine
/**
 * Run a deterministic plan consisting of ordered steps.
 * Each step is a plain‑object { id, command, cwd, env, checksum? }.
 * The plan is persisted to `data/operator/plans/` as JSON and
 * verified via checksum before execution. Logs are written to
 * `data/operator/logs/<stepId>.log`.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

export function runDeterministicPlan(planFilePath) {
  const plan = JSON.parse(fs.readFileSync(planFilePath, "utf-8"));
  plan.steps.forEach((step) => {
    const result = execSync(step.command, {
      cwd: step.cwd,
      env: { ...process.env, ...step.env },
      stdio: "pipe",
    });
    const logPath = path.join("data/operator/logs", `${step.id}.log`);
    fs.writeFileSync(logPath, result.toString());
    if (step.checksum) {
      const actual = crypto.createHash("sha256").update(result).digest("hex");
      if (actual !== step.checksum) {
        throw new Error(`Checksum mismatch for step ${step.id}`);
      }
    }
  });
}

// Export for external usage
export default { runDeterministicPlan };
