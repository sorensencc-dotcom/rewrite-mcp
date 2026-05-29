
// Contract loader integration (CIC AI Runtime v1.0.0)
import { loadRuntimeContract, requireContractVersion } from "../runtime/contract-loader";
import { logger } from "../lib/logger";

try {
  const contract = loadRuntimeContract();
  logger.info(`[RTK] Loaded CIC AI Runtime Contract v${contract.version} from ${contract.path}`);
  // Optional: enforce exact version for this RTK release
  // requireContractVersion("1.0.0");
} catch (err) {
  logger.error("[RTK] Failed to load CIC AI Runtime Contract:", err);
  throw err;
}
