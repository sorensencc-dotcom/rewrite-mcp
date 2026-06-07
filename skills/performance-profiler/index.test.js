const { describe, it, expect } = require('vitest');
const skill = require('./index.js');

describe('performance-profiler', () => {
  it('profiles time', async () => { const r = await skill({ skillName: 'test' }); expect(r.metrics.execution).toBeDefined(); });
  it('calculates p95', async () => { const r = await skill({ skillName: 'test' }); expect(r.metrics.execution.p95).toBeGreaterThan(0); });
  it('calculates p99', async () => { const r = await skill({ skillName: 'test' }); expect(r.metrics.execution.p99).toBeGreaterThan(0); });
  it('profiles memory', async () => { const r = await skill({ skillName: 'test', profiling: 'memory' }); expect(r.metrics.memory).toBeDefined(); });
  it('profiles CPU', async () => { const r = await skill({ skillName: 'test', profiling: 'cpu' }); expect(r.metrics.cpu).toBeDefined(); });
  it('identifies bottlenecks', async () => { const r = await skill({ skillName: 'test' }); expect(r.bottlenecks).toBeInstanceOf(Array); });
  it('suggests optimizations', async () => { const r = await skill({ skillName: 'test' }); expect(r.bottlenecks[0].suggestion).toBeDefined(); });
  it('compares baseline', async () => { const r = await skill({ skillName: 'test', compareBaseline: true }); expect(r.vs_baseline).toBeDefined(); });
  it('generates samples', async () => { const r = await skill({ skillName: 'test', sampleSize: 100 }); expect(r.samples).toBe(100); });
  it('tracks min/max/median', async () => { const r = await skill({ skillName: 'test' }); expect(r.metrics.execution.min).toBeGreaterThan(0); });
  it('calculates percentages', async () => { const r = await skill({ skillName: 'test' }); expect(r.bottlenecks[0].percentage).toBeDefined(); });
  it('detects regression', async () => { const r = await skill({ skillName: 'test', compareBaseline: true }); expect(r.vs_baseline.status).toBeDefined(); });
  it('filters by type', async () => { const r = await skill({ skillName: 'test', profiling: 'execution-time' }); expect(r.metrics.execution).toBeDefined(); });
});
