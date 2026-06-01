/**
 * apps/control-plane/src/runtime/install.mjs
 * @version 1.0.0
 *
 * Runtime initialization — sets up orchestrator engines.
 * Called once at server startup.
 */

import { initRegions } from '@cic/orchestrator/regions';
import { runtimeConfig } from './config.mjs';
import { logger } from '@cic/shared/logging';

export async function installRuntime() {
  logger.info('Installing CIC runtime...', {
    nodeEnv: runtimeConfig.nodeEnv,
    regions: runtimeConfig.regions.join(','),
    authDisabled: runtimeConfig.authDisabled,
  });

  try {
    // Initialize regions
    initRegions(runtimeConfig.regions);
    logger.info('Regions initialized', { count: runtimeConfig.regions.length });

    // TODO: initialize other orchestrator engines
    // - rollout
    // - arbitration
    // - drift
    // - expansion
    // - federation
    // - cognition

    logger.info('CIC runtime installed successfully');
  } catch (err) {
    logger.error('Runtime installation failed', { error: err.message });
    throw err;
  }
}
