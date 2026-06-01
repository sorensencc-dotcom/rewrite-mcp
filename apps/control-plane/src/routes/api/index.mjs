/**
 * apps/control-plane/src/routes/api/index.mjs
 * @version 1.0.0
 *
 * API route registration — all /api/v1/* endpoints.
 */

import { createRegionsRouter } from './regions.mjs';
import { createCognitionRouter } from './cognition.mjs';
import { logger } from '@cic/shared/logging';

export function registerApiRoutes(app) {
  logger.debug('Registering API routes');

  app.use('/api/v1/regions', createRegionsRouter());
  app.use('/api/v1/cognition', createCognitionRouter());

  // TODO: register additional endpoints
  // - /api/v1/rollout
  // - /api/v1/arbitration
  // - /api/v1/drift
  // - /api/v1/expansion
  // - /api/v1/federation

  logger.debug('API routes registered');
}
