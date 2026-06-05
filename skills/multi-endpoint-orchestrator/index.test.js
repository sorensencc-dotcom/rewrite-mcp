const { describe, it, expect } = require('vitest');
const skill = require('./index.js');

describe('multi-endpoint-orchestrator', () => {
  it('executes sequential endpoints', async () => {
    const result = await skill({ endpoints: [{ service: 's1', skill: 'sk1' }, { service: 's2', skill: 'sk2' }], sequentialMode: true });
    expect(result.results).toHaveLength(2);
  });

  it('executes parallel endpoints', async () => {
    const result = await skill({ endpoints: [{ service: 's1', skill: 'sk1' }, { service: 's2', skill: 'sk2' }], sequentialMode: false });
    expect(result.results).toHaveLength(2);
  });

  it('requires endpoints', async () => {
    await expect(skill({})).rejects.toThrow();
  });

  it('tracks execution time', async () => {
    const result = await skill({ endpoints: [{ service: 's1', skill: 'sk1' }] });
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('counts failures', async () => {
    const result = await skill({ endpoints: [{ service: 's1', skill: 'sk1' }] });
    expect(typeof result.failureCount).toBe('number');
  });

  it('supports fallback strategies', async () => {
    const result = await skill({ endpoints: [{ service: 's1', skill: 'sk1' }], fallbackStrategy: 'skip-failed' });
    expect(result.fallbacksApplied).toBeDefined();
  });

  it('maintains result order', async () => {
    const result = await skill({ endpoints: [{ service: 's1', skill: 'sk1' }, { service: 's2', skill: 'sk2' }], sequentialMode: true });
    expect(result.results[0].service).toBe('s1');
    expect(result.results[1].service).toBe('s2');
  });

  it('includes result status', async () => {
    const result = await skill({ endpoints: [{ service: 's1', skill: 'sk1' }] });
    expect(result.results[0].status).toBeDefined();
  });

  it('tracks success count', async () => {
    const result = await skill({ endpoints: [{ service: 's1', skill: 'sk1' }] });
    expect(result.successCount).toBeGreaterThanOrEqual(0);
  });

  it('handles timeout option', async () => {
    const result = await skill({ endpoints: [{ service: 's1', skill: 'sk1' }], timeout: 60000 });
    expect(result).toBeDefined();
  });
});
