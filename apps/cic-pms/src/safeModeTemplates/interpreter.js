export function safeInterpreterOutput(reason = "interpreter_model_failure") {
  return {
    safe_mode: true,
    reason,
    taskType: "unknown",
    intent: null,
    confidence: 0,
    notes: ["Interpreter returned safe-mode output."]
  };
}
