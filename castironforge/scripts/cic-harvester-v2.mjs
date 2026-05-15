// scripts/manifests/cic-harvester-v2.mjs

/**
 * CIC Harvester Subsystem
 * Version: v2.0.0
 * Subsystem: harvester
 * Layer: bridge + adapters + normalizers
 */

export const cicHarvesterV2 = {

  // ─────────────────────────────
  // ROOT INDEX + README
  // ─────────────────────────────

  "cic/harvester/v2.0.0/index.js": `\
/**
 * CIC Harvester v2.0.0
 * Entry point for the harvester subsystem.
 *
 * Exposes:
 *  - bridge API
 *  - adapters (web, file, sidecar)
 *  - normalizers
 */

import * as bridge from "./bridge/index.js";
import * as adapters from "./adapters/index.js";
import * as normalizers from "./normalizers/index.js";

export const version = "2.0.0";

export {
  bridge,
  adapters,
  normalizers
};
`,

  "cic/harvester/v2.0.0/README.md": `\
# CIC Harvester v2.0.0

Semantic versioned harvester subsystem for Castironforge CIC.

## Layout

- \`bridge/\` — unified harvester bridge API
- \`adapters/\` — source-specific adapters (web, file, sidecar)
- \`normalizers/\` — content normalization layer

## Invariants

- All adapters return a unified HarvesterPayload.
- Normalizers are pure functions.
- Bridge is the only public entrypoint.
`,

  // ─────────────────────────────
  // BRIDGE
  // ─────────────────────────────

  "cic/harvester/v2.0.0/bridge/index.js": `\
/**
 * CIC Harvester v2.0.0 — Bridge Index
 */

import { harvestWeb } from "../adapters/web.js";
import { harvestFile } from "../adapters/file.js";
import { harvestSidecar } from "../adapters/sidecar.js";
import { normalizePayload } from "../normalizers/payload.js";

/**
 * @param {Object} options
 * @param {string} options.type - "web" | "file" | "sidecar"
 * @param {Object} options.config
 */
export async function harvest(options) {
  const { type, config } = options;

  let raw;

  switch (type) {
    case "web":
      raw = await harvestWeb(config);
      break;
    case "file":
      raw = await harvestFile(config);
      break;
    case "sidecar":
      raw = await harvestSidecar(config);
      break;
    default:
      throw new Error(\`HARVESTER_UNKNOWN_TYPE: \${type}\`);
  }

  return normalizePayload(raw);
}
`,

  // ─────────────────────────────
  // ADAPTERS
  // ─────────────────────────────

  "cic/harvester/v2.0.0/adapters/index.js": `\
/**
 * CIC Harvester v2.0.0 — Adapters Index
 */

export { harvestWeb } from "./web.js";
export { harvestFile } from "./file.js";
export { harvestSidecar } from "./sidecar.js";
`,

  "cic/harvester/v2.0.0/adapters/web.js": `\
/**
 * CIC Harvester v2.0.0 — Web Adapter
 */

export async function harvestWeb(config) {
  // Placeholder: integrate real HTTP fetch.
  return {
    type: "web",
    url: config?.url || null,
    content: config?.mockContent || "<html></html>"
  };
}
`,

  "cic/harvester/v2.0.0/adapters/file.js": `\
/**
 * CIC Harvester v2.0.0 — File Adapter
 */

export async function harvestFile(config) {
  // Placeholder: integrate real filesystem.
  return {
    type: "file",
    path: config?.path || null,
    content: config?.mockContent || ""
  };
}
`,

  "cic/harvester/v2.0.0/adapters/sidecar.js": `\
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
`,

  // ─────────────────────────────
  // NORMALIZERS
  // ─────────────────────────────

  "cic/harvester/v2.0.0/normalizers/index.js": `\
/**
 * CIC Harvester v2.0.0 — Normalizers Index
 */

export { normalizePayload } from "./payload.js";
`,

  "cic/harvester/v2.0.0/normalizers/payload.js": `\
/**
 * CIC Harvester v2.0.0 — Payload Normalizer
 */

export function normalizePayload(raw) {
  return {
    id: \`harvest-\${Date.now()}\`,
    type: raw?.type || "unknown",
    content: raw?.content || "",
    metadata: {
      harvestedAt: Date.now()
    }
  };
}
`
};
