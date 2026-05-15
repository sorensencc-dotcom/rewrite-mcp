/**
 * CIC Harvester v2.0.0 — Sidecar Adapter
 */

export async function harvestSidecar(config) {
  // Placeholder: integrate real sidecar extractor.
  return {
    type: "sidecar",
    extractor: config?.extractor || "unknown",
    content: config?.mockContent || ""
  };
}
