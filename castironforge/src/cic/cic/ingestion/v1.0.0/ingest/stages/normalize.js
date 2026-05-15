/**
 * CIC Ingestion v1.0.0 — Normalize Stage
 */

export async function normalize(validated) {
  return {
    id: validated.id || `job-${Date.now()}`,
    sourceType: validated.sourceType || "unknown",
    payloadType: "generic",
    payload: validated.payload || {},
    metadata: {
      normalizedAt: Date.now()
    }
  };
}
