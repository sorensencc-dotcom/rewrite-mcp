/**
 * pms/tests/assembler.test.js
 * 2026-05-18 v1.0.0
 */
import { assemblePrompt } from '../src/assembler/assemblePrompt.js';

describe('Assembler', () => {
  test('should assemble a prompt correctly', () => {
    const pack = {
      name: 'test',
      version: '1.0.0',
      model: 'gemini',
      sections: {
        system: 'sys',
        instructions: 'inst',
        examples: ['ex1'],
        constraints: 'cons'
      }
    };
    const result = assemblePrompt(pack);
    expect(result.model).toBe('gemini');
    expect(result.prompt).toContain('SYSTEM: sys');
    expect(result.prompt).toContain('INSTRUCTIONS: inst');
    expect(result.prompt).toContain('- ex1');
    expect(result.prompt).toContain('CONSTRAINTS: cons');
  });
});