import { loadRuntimeContract } from "../../runtime/contract-loader";
import { logger } from "../../lib/logger";

export function acknowledgeRuntimeContract() {
  try {
    const c = loadRuntimeContract();
    logger.info(`[CIC] Acknowledged CIC AI Runtime Contract v${c.version} at ${c.path}`);
    return { version: c.version, path: c.path, sections: c.sections };
  } catch (err) {
    logger.error("[CIC] Failed to acknowledge runtime contract:", err);
    throw err;
  }
}
