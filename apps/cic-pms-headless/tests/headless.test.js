/**
 * pms-headless/tests/headless.test.js
 */
import { runHeadless } from '../src/runner/headlessRunner.js';

describe('Headless Runner', () => {
  const pack = {
    name: 'test-headless',
    version: '1.0.0',
    model: 'gemini',
    sections: {
      system: 'Sys prompt',
      instructions: 'Do work'
    }
  };

  test('should execute and return result', async () => {
    const mockExecutor = async (p) => `Executed: ${p}`;
    const result = await runHeadless(pack, mockExecutor);
    expect(result.status).toBe('success');
    expect(result.result).toContain('Executed: SYSTEM: Sys prompt\nINSTRUCTIONS: Do work');
  });

  test('should throw on executor failure', async () => {
    const mockFail = async () => { throw new Error('Fail'); };
    await expect(runHeadless(pack, mockFail)).rejects.toThrow();
  });
});