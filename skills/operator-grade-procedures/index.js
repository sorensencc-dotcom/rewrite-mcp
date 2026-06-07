function validateProcedureInputs(task, environment) {
  if (!task || typeof task !== "string") {
    throw new Error("task is required and must be a string");
  }
  if (!environment || typeof environment !== "object") {
    throw new Error("environment is required and must be an object");
  }
}

export function generateProcedure({ task, environment }) {
  validateProcedureInputs(task, environment);

  const steps = [];
  const validationChecks = [];
  const errorBranches = [];

  steps.push({ num: 1, action: `Initialize: ${task}`, detail: "Set up workspace" });
  steps.push({ num: 2, action: "Execute primary workflow", detail: "Run main task" });
  steps.push({ num: 3, action: "Validate output", detail: "Verify results" });
  steps.push({ num: 4, action: "Cleanup and report", detail: "Document completion" });

  validationChecks.push("Output files exist and are readable");
  validationChecks.push("No errors logged during execution");
  validationChecks.push("All required artifacts present");

  errorBranches.push({
    error: "File not found",
    action: "Check file paths in environment",
    fallback: "Use default path"
  });
  errorBranches.push({
    error: "Permission denied",
    action: "Verify user permissions",
    fallback: "Request elevated access"
  });
  errorBranches.push({
    error: "Timeout",
    action: "Increase timeout threshold",
    fallback: "Resume from checkpoint"
  });

  return {
    procedureId: `proc-${Date.now()}`,
    task,
    environment: environment.name || "default",
    steps,
    validationChecks,
    errorBranches,
    estimatedDuration: "15-30 minutes",
    riskLevel: "low"
  };
}
