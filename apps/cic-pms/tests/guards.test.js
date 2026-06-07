/**
 * pms/tests/guards.test.js
 * 2026-05-18 v1.0.0
 */
import { guard_missingFields } from '../src/guards/guard_missingFields.js';
import { guard_emptySections } from '../src/guards/guard_emptySections.js';

describe('Guards', () => {
  test('guard_missingFields should throw if name is missing', () => {
    expect(() => guard_missingFields({ version: '1.0.0' })).toThrow(/name/);
  });

  test('guard_emptySections should throw if system is empty', () => {
    const pack = { sections: { system: '', instructions: 'inst' } };
    expect(() => guard_emptySections(pack)).toThrow(/System/);
  });
});