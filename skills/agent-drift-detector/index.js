function validateDriftInputs(agentName, expectedSchema, actualSchema) {
  if (!agentName || typeof agentName !== "string") {
    throw new Error("agentName is required and must be a string");
  }
  if (!expectedSchema || typeof expectedSchema !== "object") {
    throw new Error("expectedSchema is required and must be an object");
  }
  if (!actualSchema || typeof actualSchema !== "object") {
    throw new Error("actualSchema is required and must be an object");
  }
}

export function detectDrift({ agentName, expectedSchema, actualSchema }) {
  validateDriftInputs(agentName, expectedSchema, actualSchema);

  const expectedKeys = Object.keys(expectedSchema).sort();
  const actualKeys = Object.keys(actualSchema).sort();

  const missing = expectedKeys.filter(k => !actualKeys.includes(k));
  const extra = actualKeys.filter(k => !expectedKeys.includes(k));

  return {
    agentName,
    driftDetected: missing.length > 0 || extra.length > 0,
    missingFields: missing,
    extraFields: extra,
    recommendations: [
      ...(missing.length > 0 ? [`Add missing fields: ${missing.join(", ")}`] : []),
      ...(extra.length > 0 ? [`Remove unexpected fields: ${extra.join(", ")}`] : []),
      ...(missing.length === 0 && extra.length === 0 ? ["Schema is aligned"] : [])
    ]
  };
}
