/**
 * pms-claude/tests/guards.test.js
 * 2026-05-18 v1.0.0
 */
import { guard_missingFields } from '../src/guards/guard_missingFields.js';
import { guard_emptySections } from '../src/guards/guard_emptySections.js';

describe('Claude Guards', () => {
  test('guard_missingFields should throw if model is not claude', () => {
    const pack = { name: 'n', version: '1', model: '', sections: {} };
    expect(() => guard_missingFields(pack)).toThrow();
  });

  test('guard_emptySections should throw if instructions are missing', () => {
    const pack = { sections: { system: 's', instructions: '' } };
    expect(() => guard_emptySections(pack)).toThrow();
  });
});