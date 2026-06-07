/**
 * pms-claude/tests/loader.test.js
 * 2026-05-18 v1.0.0
 */
import { validatePromptPack } from '../src/loader/validatePromptPack.js';

describe('Claude Loader Validation', () => {
  test('should validate a correct Claude pack', () => {
    const pack = {
      name: 'test',
      version: '1.0.0',
      model: 'claude',
      sections: {
        system: 'sys',
        instructions: 'inst'
      }
    };
    expect(validatePromptPack(pack)).toBe(true);
  });

  test('should throw on invalid Claude pack', () => {
    const pack = { name: 'invalid', model: 'gemini' };
    expect(() => validatePromptPack(pack)).toThrow();
  });
});