import test from 'node:test';
import assert from 'node:assert';
import { formatPayload, formatEventLine } from '../src/logging/formatter.js';

test('Formatter - should format payload with sorted keys', (t) => {
  const payload = { z: 1, a: 2, m: [3, 2, 1] };
  const formatted = formatPayload(payload);
  assert.strictEqual(formatted, 'a=2 m=[3,2,1] z=1');
});

test('Formatter - should format full event line', (t) => {
  const event = {
    timestamp: '2026-05-22T14:00:00Z',
    component: 'TestComponent',
    eventType: 'TEST_EVENT',
    payload: { id: 123, tags: ['a', 'b'] }
  };
  const line = formatEventLine(event);
  assert.strictEqual(line, '2026-05-22T14:00:00Z | TestComponent | TEST_EVENT | id=123 tags=[a,b]');
});

test('Formatter - should handle empty payload', (t) => {
  const event = {
    timestamp: '2026-05-22T14:00:00Z',
    component: 'TestComponent',
    eventType: 'EMPTY_EVENT',
    payload: {}
  };
  const line = formatEventLine(event);
  assert.strictEqual(line, '2026-05-22T14:00:00Z | TestComponent | EMPTY_EVENT');
});
