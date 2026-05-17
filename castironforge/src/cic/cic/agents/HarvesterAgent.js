/**
 * CIC v3.0 — Harvester Agent
 * File: cic/agents/HarvesterAgent.js | Version: 1.0.0 | Date: 2026-05-15
 */

import { harvest } from '../harvester/v2.0.0/bridge/index.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('HarvesterAgent');

export const HarvesterAgent = {
  name: 'HarvesterAgent',
  version: '1.0.0',
  async execute(context) {
    const { type, config } = context;
    log.info('execute.start', { type });
    try {
      const result = await harvest({ type, config });
      log.info('execute.success', { id: result.id });
      return result;
    } catch (err) {
      log.error('execute.failed', { error: err.message });
      throw err;
    }
  },
};
