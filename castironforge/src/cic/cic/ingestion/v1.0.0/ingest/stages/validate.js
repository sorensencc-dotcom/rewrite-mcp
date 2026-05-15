/**
 * CIC Ingestion v1.0.0 — Validate Stage
 */

export async function validate(raw) {
  if (!raw) {
    throw new Error("INGESTION_VALIDATE_EMPTY_PAYLOAD");
  }
  return raw;
}
