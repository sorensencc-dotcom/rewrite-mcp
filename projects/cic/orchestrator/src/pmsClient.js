// pmsClient.js - v1.0.0
// Shared PMS integration for Orchestrator

import { assemblePrompt } from "../../../../apps/cic-pms/src/assembler/assemblePrompt.js";
import { loadPromptPack } from "../../../../apps/cic-pms/src/loader/loadPromptPack.js";
import { detectDrift } from "../../../../apps/cic-pms/src/drift/detectDrift.js";
import { logger } from "../../../../apps/cic-pms/src/logger.js";
import { emitPackUsage, emitDrift } from "../../../../apps/cic-pms/src/telemetryClient.js";
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKS_DIR = path.resolve(__dirname, '../../../../apps/cic-pms/packs');

export async function buildPrompt({ pack: packName, model = "gemini", context }) {
  if (!packName) throw new Error("buildPrompt: pack is required");
  if (!context || typeof context !== "object") {
    throw new Error("buildPrompt: context must be an object");
  }

  // 1. Resolve and load pack
  const packPath = path.join(PACKS_DIR, `${packName}.json`);
  const pack = await loadPromptPack(packPath);

  // 2. Drift check
  const drift = detectDrift(pack);
  
  // 3. Telemetry
  emitPackUsage({ pack: packName, version: pack.version });
  if (drift.drifted) {
    emitDrift({ pack: packName, expectedHash: pack.hash, actualHash: drift.currentHash });
  }

  logger.info("PMS_ORCHESTRATOR_BUILD", {
    pack: packName,
    version: pack.version,
    drifted: drift.drifted
  });

  const payload = await assemblePrompt({
    pack,
    model,
    context,
  });

  return { payload, drift: drift.drifted ? 1.0 : 0.0 };
}
