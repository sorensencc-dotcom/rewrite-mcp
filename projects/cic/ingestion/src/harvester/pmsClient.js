// pmsClient.js - v1.0.0
// Shared PMS integration for Harvester

import { assemblePrompt } from "../../../../../apps/cic-pms/src/assembler/assemblePrompt.js";
import { loadPromptPack } from "../../../../../apps/cic-pms/src/loader/loadPromptPack.js";
import { detectDrift } from "../../../../../apps/cic-pms/src/drift/detectDrift.js";
import { logger } from "../../../../../apps/cic-pms/src/logger.js";
import { emitPackUsage, emitDrift } from "../../../../../apps/cic-pms/src/telemetryClient.js";
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKS_DIR = path.resolve(__dirname, '../../../../../apps/cic-pms/packs');

export async function buildPrompt({ pack: packName, model = "gemini", context, max_output_tokens = 256 }) {
  if (!packName) throw new Error("buildPrompt: pack is required");
  if (!context || typeof context !== "object") {
    throw new Error("buildPrompt: context must be an object");
  }

  // 1. Resolve and load pack
  const packPath = path.join(PACKS_DIR, `${packName}.json`);
  let pack;
  try {
    pack = await loadPromptPack(packPath);
  } catch (err) {
    logger.error("PMS_PACK_LOAD_FAILED", { pack: packName, error: err.message });
    throw new Error(`Failed to load prompt pack '${packName}': ${err.message}`);
  }

  // 2. Drift check — FAIL on drift (don't log and continue)
  const drift = detectDrift(pack);
  if (drift.drifted) {
    logger.error("PMS_PACK_DRIFTED", {
      pack: packName,
      version: pack.version,
      expectedHash: drift.expectedHash,
      actualHash: drift.currentHash,
    });
    throw new Error(`Prompt pack '${packName}' has drifted (hash mismatch). Regenerate the pack.`);
  }

  logger.info("PMS_PACK_LOADED", {
    pack: packName,
    version: pack.version,
    actualHash: drift.currentHash,
  });

  // 3. Assemble prompt with output bounds
  let payload;
  try {
    payload = await assemblePrompt({
      pack,
      model,
      context,
      constraints: {
        max_output_tokens,
        max_prompt_length: 32000, // Fallback safety
        timeout_ms: 30000,
      }
    });
  } catch (err) {
    logger.error("PMS_PROMPT_ASSEMBLY_FAILED", { pack: packName, error: err.message });
    throw new Error(`Failed to assemble prompt for pack '${packName}': ${err.message}`);
  }

  // 4. Validate payload structure
  if (!payload || typeof payload !== 'object') {
    throw new Error(`assemblePrompt returned invalid payload for pack '${packName}'`);
  }
  if (typeof payload.system_prompt !== 'string') {
    throw new Error(`assemblePrompt missing 'system_prompt' for pack '${packName}'`);
  }

  return {
    ...payload,
    _meta: {
      pack_name: packName,
      pack_version: pack.version,
      max_output_tokens,
      assembled_at: new Date().toISOString(),
    }
  };
}
