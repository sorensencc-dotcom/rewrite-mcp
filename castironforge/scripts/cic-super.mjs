// scripts/manifests/cic-super.mjs
// CIC Super‑Manifest
// Aggregates ingestion v1.0.0, harvester v2.0.0, orchestrator v3.0.0

import { cicIngestionV1 } from "./cic-ingestion-v1.mjs";
import { cicHarvesterV2 } from "./cic-harvester-v2.mjs";
import { cicOrchestratorV3 } from "./cic-orchestrator-v3.mjs";

/**
 * cicManifest
 *
 * A single flattened object mapping:
 *   "relative/path/to/file" → "file contents"
 *
 * This is consumed by the CIC assembler to write the entire CIC tree.
 */

export const cicManifest = {
  ...cicIngestionV1,
  ...cicHarvesterV2,
  ...cicOrchestratorV3
};

/**
 * Utility: list all manifest keys (for debugging)
 */
export function listManifestPaths() {
  return Object.keys(cicManifest);
}

/**
 * Utility: get file content by path
 */
export function getFile(path) {
  return cicManifest[path] || null;
}
