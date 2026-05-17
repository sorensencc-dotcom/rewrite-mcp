/**
 * CIC v3.0 — Pipeline: harvestToIngest
 * File: cic/pipelines/harvestToIngest.js | Version: 1.0.0 | Date: 2026-05-15
 */

import { harvest } from '../harvester/v2.0.0/bridge/index.js';
import { ingest } from '../ingestion/v1.0.0/ingest/ingest.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('pipeline.harvestToIngest');

/**
 * @param {Object} options
 * @param {"web"|"file"|"sidecar"} options.harvesterType
 * @param {Object} options.harvesterConfig
 * @param {"file"|"url"|"drive"} options.sourceType
 * @returns {Promise<{ harvested: Object, jobId: string }>}
 */
export async function harvestToIngest(options) {
  const { harvesterType, harvesterConfig, sourceType } = options;

  log.info('start', { harvesterType, sourceType });

  const harvested = await harvest({ type: harvesterType, config: harvesterConfig });
  log.info('harvested', { id: harvested.id });

  const result = await ingest({
    sourceType,
    sourceConfig: { payload: harvested },
  });

  log.info('complete', { jobId: result.jobId });
  return { harvested, jobId: result.jobId };
}
