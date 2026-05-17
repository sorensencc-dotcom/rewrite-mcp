/**
 * CIC v3.0 — Unified Test Runner
 * File: cic/tests/run.js | Version: 1.0.0 | Date: 2026-05-15
 */

import { testBasicEnqueueDequeue } from '../ingestion/v1.0.0/tests/queue.basic.test.js';
import { testDlq } from '../ingestion/v1.0.0/tests/queue.dlq.test.js';
import { testDrift } from '../ingestion/v1.0.0/tests/queue.drift.test.js';
import { testSchemaShape } from '../ingestion/v1.0.0/tests/queue.schema.test.js';
import { testCoreErrors } from './core.test.js';
import { testAgentRegistry } from './agents.test.js';
import { testPipelines } from './pipelines.test.js';

const tests = [
  ['queue.basic',      testBasicEnqueueDequeue],
  ['queue.dlq',        testDlq],
  ['queue.drift',      testDrift],
  ['queue.schema',     testSchemaShape],
  ['core.errors',      testCoreErrors],
  ['agents.registry',  testAgentRegistry],
  ['pipelines',        testPipelines],
];

let passed = 0;
let failed = 0;

for (const [name, fn] of tests) {
  try {
    await fn();
    process.stdout.write(`PASS ${name}\n`);
    passed++;
  } catch (err) {
    process.stderr.write(`FAIL ${name}: ${err.message}\n`);
    failed++;
  }
}

process.stdout.write(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
