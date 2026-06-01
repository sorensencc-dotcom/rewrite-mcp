/**
 * apps/control-plane/src/routes/health.mjs
 * @version 1.0.0
 *
 * Health check routes — public endpoints for orchestration health.
 */

import { Router } from 'express';
import { logger } from '@cic/shared/logging';

export function registerHealthRoutes(app) {
  const router = Router();

  router.get('/health', (_req, res) => {
    logger.debug('GET /health');
    res.json({
      ok: true,
      service: 'cic-control-plane',
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/healthz', (_req, res) => {
    logger.debug('GET /healthz');
    res.json({ ok: true });
  });

  app.use(router);
}
