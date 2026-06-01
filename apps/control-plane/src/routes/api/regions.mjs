/**
 * apps/control-plane/src/routes/api/regions.mjs
 * @version 1.0.0
 *
 * Regions API — list, lookup, status update.
 */

import { Router } from 'express';
import { listRegions, getRegion, setRegionStatus } from '@cic/orchestrator/regions';
import { logger } from '@cic/shared/logging';

export function createRegionsRouter() {
  const router = Router();

  router.get('/', (_req, res) => {
    logger.debug('GET /api/v1/regions');
    const regions = listRegions();
    res.json({ regions });
  });

  router.get('/:id', (req, res) => {
    logger.debug('GET /api/v1/regions/:id', { id: req.params.id });
    const region = getRegion(req.params.id);
    if (!region) {
      res.status(404).json({ error: `Region ${req.params.id} not found` });
      return;
    }
    res.json({ region });
  });

  router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    logger.debug('PATCH /api/v1/regions/:id/status', { id: req.params.id, status });

    if (!['healthy', 'degraded', 'down'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be one of: healthy, degraded, down' });
      return;
    }

    try {
      setRegionStatus(req.params.id, status);
      const region = getRegion(req.params.id);
      res.json({ region });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  return router;
}
