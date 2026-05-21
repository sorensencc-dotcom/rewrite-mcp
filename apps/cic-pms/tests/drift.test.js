/**
 * pms/tests/drift.test.js
 * 2026-05-18 v1.0.0
 */
import { computeHash } from '../src/drift/computeHash.js';
import { detectDrift } from '../src/drift/detectDrift.js';

describe('Drift Detection', () => {
  const pack = { name: 'test', version: '1.0.0', model: 'gemini', sections: { system: 's', instructions: 'i' } };
  
  test('should detect no drift when hashes match', () => {
    const hash = computeHash(pack);
    const result = detectDrift(pack, hash);
    expect(result.drifted).toBe(false);
  });

  test('should detect drift when pack changes', () => {
    const hash = computeHash(pack);
    const driftedPack = { ...pack, version: '1.1.0' };
    const result = detectDrift(driftedPack, hash);
    expect(result.drifted).toBe(true);
  });
});