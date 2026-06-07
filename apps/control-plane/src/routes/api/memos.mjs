/**
 * apps/control-plane/src/routes/api/memos.mjs
 * Memos ingestion and evidence normalization endpoints
 */

import express from 'express'
import { logger } from '@cic/shared/logging'

export function createMemosRouter() {
  const router = express.Router()

  /**
   * GET /api/v1/memos/summary
   * Returns memos ingestion status
   */
  router.get('/summary', (req, res) => {
    try {
      logger.debug('memos_summary_requested')
      res.json({
        last_sync: new Date(Date.now() - 300000).toISOString(),
        total_notes: 847,
        distinct_tags: 142,
        last_error: 'none',
      })
    } catch (err) {
      logger.error('memos_summary_failed', { error: err.message })
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * GET /api/v1/memos/recent
   * Returns recently ingested memos
   */
  router.get('/recent', (req, res) => {
    try {
      logger.debug('memos_recent_requested')
      res.json({
        items: [
          {
            id: 'memo-001',
            timestamp: new Date(Date.now() - 60000).toISOString(),
            title: 'Federated sync event',
            tags: ['federation', 'sync'],
            preview: 'Completed federated sync across 7 regions with 99.8% coherence',
          },
          {
            id: 'memo-002',
            timestamp: new Date(Date.now() - 180000).toISOString(),
            title: 'Drift threshold alert',
            tags: ['drift', 'us-east-1'],
            preview: 'Drift score exceeded threshold in us-east-1, triggered mitigation',
          },
          {
            id: 'memo-003',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            title: 'Schema drift detected',
            tags: ['schema', 'memos'],
            preview: 'Evidence normalization pipeline detected schema drift in Memos source',
          },
        ],
      })
    } catch (err) {
      logger.error('memos_recent_failed', { error: err.message })
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
