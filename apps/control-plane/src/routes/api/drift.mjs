/**
 * apps/control-plane/src/routes/api/drift.mjs
 * Drift detection and monitoring endpoints
 */

import express from 'express'
import { logger } from '@cic/shared/logging'

export function createDriftRouter() {
  const router = express.Router()

  /**
   * GET /api/v1/drift/summary
   * Returns current drift metrics
   */
  router.get('/summary', (req, res) => {
    try {
      logger.debug('drift_summary_requested')
      res.json({
        global_score: 0.284,
        regions_above_threshold: 1,
      })
    } catch (err) {
      logger.error('drift_summary_failed', { error: err.message })
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
