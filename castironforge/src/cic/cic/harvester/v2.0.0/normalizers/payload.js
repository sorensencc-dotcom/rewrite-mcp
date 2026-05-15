/**
 * CIC Harvester v2.0.0 — Payload Normalizer
 */

export function normalizePayload(raw) {
  return {
    id: `harvest-${Date.now()}`,
    type: raw?.type || "unknown",
    content: raw?.content || "",
    metadata: {
      harvestedAt: Date.now()
    }
  };
}
