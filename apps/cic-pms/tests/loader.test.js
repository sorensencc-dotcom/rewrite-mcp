/**
 * pms/tests/loader.test.js
 * 2026-05-18 v1.0.0
 */
import { validatePromptPack } from '../src/loader/validatePromptPack.js';

describe('Loader Validation', () => {
  test('should validate a correct pack', () => {
    const pack = {
      name: 'test',
      version: '1.0.0',
      model: 'gemini',
      sections: {
        system: 'sys',
        instructions: 'inst'
      }
    };
    expect(validatePromptPack(pack)).toBe(true);
  });

  test('should throw on invalid pack', () => {
    const pack = { name: 'invalid' };
    expect(() => validatePromptPack(pack)).toThrow();
  });
});