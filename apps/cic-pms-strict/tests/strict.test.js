/**
 * pms-strict/tests/strict.test.js
 */
import { assemblePrompt } from '../src/assembler/assemblePrompt.js';

describe('Strict Assembler', () => {
  const pack = {
    name: 'strict-test',
    version: '1.0.0',
    model: 'gemini',
    response_schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    sections: {
      system: 'Sys',
      instructions: 'Inst',
      constraints: 'Cons'
    }
  };

  test('should include schema in prompt and payload', () => {
    const result = assemblePrompt(pack);
    expect(result.response_mime_type).toBe('application/json');
    expect(result.prompt).toContain('CRITICAL: You MUST return a valid JSON object matching this schema:');
    expect(result.response_schema).toBeDefined();
  });
});