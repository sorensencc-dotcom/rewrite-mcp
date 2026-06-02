/**
 * apps/control-plane/src/routes/api/rollout.mjs
 * Canary and progressive rollout management endpoints
 */

import express from 'express'
import { logger } from '@cic/shared/logging'

export function createRolloutRouter() {
  const router = express.Router()

  /**
   * GET /api/v1/rollout/summary
   * Returns active canary and rollout metrics
   */
  router.get('/summary', (req, res) => {
    try {
      logger.debug('rollout_summary_requested')
      res.json({
        active_canaries: 3,
        rollback_events_24h: 0,
      })
    } catch (err) {
      logger.error('rollout_summary_failed', { error: err.message })
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
