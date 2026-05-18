/**
 * Control Plane — Agents Route
 * File: services/control-plane/routes/agents.js | Version: 1.0.0 | Date: 2026-05-15
 *
 * Aggregates agents from CIC agent registry.
 * Lists capabilities, execute signatures, and which pipelines reference each agent.
 *
 * Exports handler(action, params) — called by index.js router.
 */

'use strict';

import { HarvesterAgent } from '../../../castironforge/src/cic/cic/agents/HarvesterAgent.js';
import { IngestorAgent }  from '../../../castironforge/src/cic/cic/agents/IngestorAgent.js';
import { createLogger }   from '../../../castironforge/src/cic/cic/core/logger.js';

const log = createLogger('control-plane/agents');

// ---------------------------------------------------------------------------
// Static pipeline cross-reference
// The pipeline registry is logically defined in routes/pipelines.js; we replicate
// the reference map here as a lightweight constant to avoid a circular import.
// Any change to pipeline agent usage must be reflected here.
// ---------------------------------------------------------------------------

const AGENT_PIPELINE_MAP = {
  HarvesterAgent: ['harvestToIngest'],
  IngestorAgent:  ['harvestToIngest', 'ingestToOrchestrate'],
};

// ---------------------------------------------------------------------------
// Agent catalog
// ---------------------------------------------------------------------------

function buildAgentRecord(agent) {
  return {
    name:         agent.name,
    version:      agent.version ?? '1.0.0',
    type:         'agent',
    capabilities: agent.capabilities ?? [],
    signature:    agent.signature
                  ?? `execute(context: CicContext): Promise<Object>`,
    referencedBy: AGENT_PIPELINE_MAP[agent.name] ?? [],
  };
}

const AGENT_CATALOG = [HarvesterAgent, IngestorAgent].map(buildAgentRecord);

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * @param {'list'|'get'} action
 * @param {{ id?: string }} params
 * @returns {{ status: number, body: Object|Object[]|null, error?: string }}
 */
export function handler(action, params = {}) {
  if (action === 'list') {
    log.info('agents.list', { count: AGENT_CATALOG.length });
    return { status: 200, body: AGENT_CATALOG };
  }

  if (action === 'get') {
    const { id } = params;
    const agent = AGENT_CATALOG.find(a => a.name === id);
    if (!agent) {
      return { status: 404, body: null, error: `AGENT_NOT_FOUND: ${id}` };
    }
    log.info('agents.get', { id });
    return { status: 200, body: agent };
  }

  return { status: 400, body: null, error: `AGENTS_UNKNOWN_ACTION: ${action}` };
}
