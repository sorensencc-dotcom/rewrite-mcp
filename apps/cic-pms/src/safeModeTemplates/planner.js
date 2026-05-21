export function safePlannerOutput(reason = "planner_model_failure") {
  return {
    safe_mode: true,
    reason,
    steps: [],
    priority: "low",
    dependencies: [],
    notes: ["Planner returned safe-mode output."]
  };
}
