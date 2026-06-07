export function validateRRKGoal(goal: any): { ok: boolean; reason?: string } {
  const allowed = ["research_goal", "gap_fill_goal", "archive_target", "ingest_target"];
  if (!goal || typeof goal !== "object") return { ok: false, reason: "invalid_payload" };
  if (!allowed.includes(goal.type)) return { ok: false, reason: "unknown_goal_type" };
  if (!goal.target) return { ok: false, reason: "missing_target" };
  return { ok: true };
}

export function materializeGoal(goal: any): any {
  let type = "document";
  if (goal.type === "ingest_target") {
    type = "image";
  }
  return {
    job_id: "job-" + Math.random().toString(36).substr(2, 9),
    type: type,
    source: goal.target,
    metadata: goal.metadata || {}
  };
}
