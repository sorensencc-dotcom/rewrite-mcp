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
