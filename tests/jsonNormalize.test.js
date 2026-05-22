/**
 * tests/jsonNormalize.test.js
 * Verification for improved JSON robustness.
 */

import { normalizeModelOutput } from '../apps/cic-pms/src/jsonNormalize.js';
import assert from 'node:assert';

console.log("Running JSON Normalization Robustness Tests...");

// 1. Direct JSON
const direct = '{"foo": "bar"}';
const res1 = normalizeModelOutput(direct);
assert.strictEqual(res1.foo, "bar");
assert.strictEqual(res1.safe_mode, false);
console.log(" - Direct JSON: PASSED");

// 2. Markdown Block
const markdown = 'Here is the result:\n```json\n{"foo": "baz"}\n```\nHope that helps!';
const res2 = normalizeModelOutput(markdown);
assert.strictEqual(res2.foo, "baz");
assert.strictEqual(res2.safe_mode, false);
console.log(" - Markdown Block: PASSED");

// 3. Conversational Noise (Boundaries)
const noise = 'Agent response: {"key": "value"} - end of message';
const res3 = normalizeModelOutput(noise);
assert.strictEqual(res3.key, "value");
assert.strictEqual(res3.safe_mode, false);
console.log(" - Conversational Noise: PASSED");

// 4. Failed Parse
const fail = 'This is not JSON at all';
const res4 = normalizeModelOutput(fail);
assert.strictEqual(res4.safe_mode, true);
assert.strictEqual(res4.reason, "json_parse_failure");
console.log(" - Failed Parse: PASSED");

console.log("ALL JSON NORMALIZATION TESTS PASSED!");
