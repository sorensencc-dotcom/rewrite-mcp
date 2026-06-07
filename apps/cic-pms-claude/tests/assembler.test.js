/**
 * pms-claude/tests/assembler.test.js
 * 2026-05-18 v1.0.0
 */
import { assemblePrompt } from '../src/assembler/assemblePrompt.js';

describe('Claude Assembler', () => {
  test('should assemble a Claude prompt with XML tags', () => {
    const pack = {
      name: 'test',
      version: '1.0.0',
      model: 'claude',
      sections: {
        system: 'sys',
        instructions: 'inst',
        examples: ['ex1'],
        constraints: 'cons'
      }
    };
    const result = assemblePrompt(pack);
    expect(result.model).toBe('claude');
    expect(result.prompt).toContain('<system_prompt>\nsys\n</system_prompt>');
    expect(result.prompt).toContain('<instructions>\ninst\n</instructions>');
    expect(result.prompt).toContain('<example>\nex1\n</example>');
  });
});