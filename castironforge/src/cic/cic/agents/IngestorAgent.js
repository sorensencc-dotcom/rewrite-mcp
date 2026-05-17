/**
 * CIC v3.0 — Ingestor Agent
 * File: cic/agents/IngestorAgent.js | Version: 1.0.0 | Date: 2026-05-15
 */

import { ingest } from '../ingestion/v1.0.0/ingest/ingest.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('IngestorAgent');

export const IngestorAgent = {
  name: 'IngestorAgent',
  version: '1.0.0',
  async execute(context) {
    const { sourceType, sourceConfig } = context;
    log.info('execute.start', { sourceType });
    try {
      const result = await ingest({ sourceType, sourceConfig });
      log.info('execute.success', { jobId: result.jobId });
      return result;
    } catch (err) {
      log.error('execute.failed', { error: err.message });
      throw err;
    }
  },
};
