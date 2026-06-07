/**
 * apps/control-plane/src/routes/api/index.mjs
 * @version 1.0.0
 *
 * API route registration — all /api/v1/* endpoints.
 */

import { createRegionsRouter } from './regions.mjs';
import { createCognitionRouter } from './cognition.mjs';
import { createArbitrationRouter } from './arbitration.mjs';
import { createDriftRouter } from './drift.mjs';
import { createRolloutRouter } from './rollout.mjs';
import { createExpansionRouter } from './expansion.mjs';
import { createFederationRouter } from './federation.mjs';
import { createMemosRouter } from './memos.mjs';
import { logger } from '@cic/shared/logging';

export function registerApiRoutes(app) {
  logger.debug('Registering API routes');

  app.use('/api/v1/regions', createRegionsRouter());
  app.use('/api/v1/cognition', createCognitionRouter());
  app.use('/api/v1/arbitration', createArbitrationRouter());
  app.use('/api/v1/drift', createDriftRouter());
  app.use('/api/v1/rollout', createRolloutRouter());
  app.use('/api/v1/expansion', createExpansionRouter());
  app.use('/api/v1/federation', createFederationRouter());
  app.use('/api/v1/memos', createMemosRouter());

  logger.debug('API routes registered');
}
