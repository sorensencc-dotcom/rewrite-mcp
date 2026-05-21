// index.js - v1.0.0

import { detectDrift } from "../../../../../apps/cic-pms/src/drift/detectDrift.js";
import { logger } from "../../../../../apps/cic-pms/src/logger.js";
import { config } from "../config.js";

async function logPmsDrift() {
  const packs = ["analysis_v1", "research_v1", "rewrite_v1"];

  for (const pack of packs) {
    const drift = await detectDrift(pack);
    logger.info("PMS_DRIFT_CHECK_STARTUP", {
      pack,
      version: drift.version,
      expectedHash: drift.expected,
      actualHash: drift.actual,
      drifted: drift.drifted,
    });
  }
}

await logPmsDrift();
// then start Harvester as usual
