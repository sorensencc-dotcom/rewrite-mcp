// filename: analyzer-image-v2.test.js
// date: 2026-05-16
// version: 1.0.0

/**
 * Smoke test: CIC Analyzer Registry — ImageAnalyzerV2 wire-up
 *
 * Verifies:
 *  1. "image" resolves to a non-null analyzer module
 *  2. "image:v2" resolves to a non-null analyzer module
 *  3. Both keys resolve to the same object reference (ImageAnalyzerV2)
 *  4. The resolved module satisfies the IExtractor interface contract
 *  5. Unregistered keys return null (no throw)
 *
 * Run: node --test src/cic/cic/tests/analyzer-image-v2.test.js
 * (from castironforge/src/cic/)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getAnalyzer } from '../analyzers/registry.js';
import { validateExtractor } from '../analyzers/iExtractor.js';

test('Analyzer registry — "image" resolves', () => {
  const A = getAnalyzer('image');
  assert.ok(A !== null, 'getAnalyzer("image") must return non-null');
});

test('Analyzer registry — "image:v2" resolves', () => {
  const B = getAnalyzer('image:v2');
  assert.ok(B !== null, 'getAnalyzer("image:v2") must return non-null');
});

test('Analyzer registry — "image" and "image:v2" are same reference', () => {
  const A = getAnalyzer('image');
  const B = getAnalyzer('image:v2');
  assert.equal(A, B, '"image" and "image:v2" must resolve to the same module');
});

test('Analyzer registry — resolved module satisfies IExtractor contract', () => {
  const A = getAnalyzer('image');
  // validateExtractor throws on contract violation — no throw = pass
  assert.doesNotThrow(() => validateExtractor(A), 'ImageAnalyzerV2 must satisfy IExtractor');
});

test('Analyzer registry — unknown key returns null', () => {
  const X = getAnalyzer('nonexistent');
  assert.strictEqual(X, null, 'Unknown key must return null, not throw');
});
