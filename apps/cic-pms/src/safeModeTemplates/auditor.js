export function safeAuditorOutput(reason = "auditor_model_failure") {
  return {
    safe_mode: true,
    reason,
    score: 0,
    flags: [],
    explanations: [],
    notes: ["Auditor returned safe-mode output."]
  };
}
