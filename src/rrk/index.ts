// RRK Entry Point

// Contract integration (CIC AI Runtime v1.0.0)
import { loadRuntimeContract } from "../runtime/contract-loader";
import { logger } from "../lib/logger";

const rrkContract = (() => {
  try {
    const c = loadRuntimeContract();
    logger.info(`[RRK] CIC AI Runtime Contract v${c.version} loaded`);
    return c;
  } catch (err) {
    logger.error("[RRK] Could not load CIC AI Runtime Contract:", err);
    throw err;
  }
})();

export function validateRRKGoal(goal: any) {
  const allowed = ["research_goal", "gap_fill_goal", "archive_target", "ingest_target"];
  if (!goal || typeof goal !== "object") return { ok: false, reason: "invalid_payload" };
  if (!allowed.includes(goal.type)) return { ok: false, reason: "unknown_goal_type" };
  if (!goal.target) return { ok: false, reason: "missing_target" };
  return { ok: true };
}
