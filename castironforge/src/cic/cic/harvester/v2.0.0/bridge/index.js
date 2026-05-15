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
      throw new Error(`HARVESTER_UNKNOWN_TYPE: ${type}`);
  }

  return normalizePayload(raw);
}
