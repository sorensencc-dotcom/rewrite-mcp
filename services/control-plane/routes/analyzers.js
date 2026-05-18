// filename: services/control-plane/routes/analyzers.js
// date: 2026-05-16
// version: 1.0.0

/**
 * Control Plane — Analyzers Route
 *
 * Exposes analyzer health state to the operator UI.
 *
 * Routes handled by this module (resolved by control-plane/index.js):
 *   GET /api/control-plane/analyzers        — full status snapshot
 *   GET /api/control-plane/analyzers/:key   — single analyzer by registry key
 *
 * Exports handler(action, params) — called by index.js router.
 */

'use strict';

import { getAnalyzerStatus } from '../../analyzer-status.js';
import { createLogger } from '../../../castironforge/src/cic/cic/core/logger.js';

const log = createLogger('control-plane/analyzers');

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * @param {{ action: string, params: Record<string,string> }} ctx
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function handler({ action, params }) {
  if (action === 'list') {
    log.info('list');
    const snapshot = await getAnalyzerStatus();
    return { status: 200, body: snapshot };
  }

  if (action === 'get') {
    const { key } = params;
    log.info('get', { key });
    const snapshot = await getAnalyzerStatus();
    const entry = snapshot.analyzers.find(a => a.key === key);
    if (!entry) {
      return { status: 404, body: { error: `Analyzer not found: ${key}` } };
    }
    return { status: 200, body: { analyzer: entry, timestamp: snapshot.timestamp } };
  }

  return { status: 400, body: { error: `Unknown action: ${action}` } };
}
