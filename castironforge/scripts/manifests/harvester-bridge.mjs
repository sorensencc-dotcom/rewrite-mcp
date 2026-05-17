// castironforge/scripts/manifests/harvester-bridge.mjs
// Version: 1.0.1 | Date: 2026-05-15
// Fixed: was exporting empty object

import { harvest } from '../../src/cic/cic/harvester/v2.0.0/bridge/index.js';
import { normalizePayload } from '../../src/cic/cic/harvester/v2.0.0/normalizers/payload.js';

export const harvesterBridge = {
  harvest,
  normalizePayload,
};
