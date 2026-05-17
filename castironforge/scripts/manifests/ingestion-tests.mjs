// castironforge/scripts/manifests/ingestion-tests.mjs
// Version: 1.0.1 | Date: 2026-05-15
// Fixed: was exporting empty object

import { testBasicEnqueueDequeue } from '../../src/cic/cic/ingestion/v1.0.0/tests/queue.basic.test.js';
import { testDlq }                  from '../../src/cic/cic/ingestion/v1.0.0/tests/queue.dlq.test.js';
import { testDrift }                from '../../src/cic/cic/ingestion/v1.0.0/tests/queue.drift.test.js';
import { testSchemaShape }          from '../../src/cic/cic/ingestion/v1.0.0/tests/queue.schema.test.js';

export const ingestionTests = {
  testBasicEnqueueDequeue,
  testDlq,
  testDrift,
  testSchemaShape,
};
