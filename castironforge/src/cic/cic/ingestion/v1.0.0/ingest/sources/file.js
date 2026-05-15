/**
 * CIC Ingestion v1.0.0 — File Source
 */

export async function readFileSource(config) {
  // Placeholder: integrate real filesystem or blob storage.
  return {
    sourceType: "file",
    path: config?.path || null,
    payload: config?.payload || null
  };
}
