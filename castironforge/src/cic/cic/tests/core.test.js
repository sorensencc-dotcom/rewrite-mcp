/**
 * CIC v3.0 — Core Tests
 * File: cic/tests/core.test.js | Version: 1.0.0 | Date: 2026-05-15
 */

import { CIC_ERRORS } from '../core/errors.js';
import { createLogger } from '../core/logger.js';

export function testCoreErrors() {
  if (!CIC_ERRORS.AGENT_NOT_FOUND)      throw new Error('CIC_ERRORS.AGENT_NOT_FOUND missing');
  if (!CIC_ERRORS.PIPELINE_RUN_FAILED)  throw new Error('CIC_ERRORS.PIPELINE_RUN_FAILED missing');
  if (!CIC_ERRORS.HARVESTER_UNKNOWN_TYPE) throw new Error('CIC_ERRORS.HARVESTER_UNKNOWN_TYPE missing');
  if (!CIC_ERRORS.ORCH_MISSING_NODE_TYPE) throw new Error('CIC_ERRORS.ORCH_MISSING_NODE_TYPE missing');

  const log = createLogger('test');
  if (typeof log.info !== 'function') throw new Error('logger.info missing');
  if (typeof log.warn !== 'function') throw new Error('logger.warn missing');
  if (typeof log.error !== 'function') throw new Error('logger.error missing');
}
