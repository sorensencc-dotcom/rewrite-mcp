const { describe, it, expect } = require('vitest');
const skill = require('./index.js');

describe('cost-optimizer', () => {
  it('analyzes costs', async () => { const r = await skill({ action: 'analyze' }); expect(r.totalCost).toBeGreaterThan(0); });
  it('includes breakdown', async () => { const r = await skill({ action: 'analyze' }); expect(r.breakdown).toBeDefined(); });
  it('generates forecasts', async () => { const r = await skill({ action: 'forecast' }); expect(r.forecast).toBeDefined(); });
  it('provides suggestions', async () => { const r = await skill({ action: 'suggest' }); expect(r.suggestions).toBeInstanceOf(Array); });
  it('calculates savings', async () => { const r = await skill({ action: 'suggest' }); expect(r.suggestions[0].savings).toBeDefined(); });
  it('supports time ranges', async () => { const r = await skill({ action: 'analyze', timeRange: '30d' }); expect(r.period).toBeDefined(); });
  it('groups by skill', async () => { const r = await skill({ action: 'analyze', groupBy: 'skill' }); expect(r).toBeDefined(); });
  it('groups by workflow', async () => { const r = await skill({ action: 'analyze', groupBy: 'workflow' }); expect(r).toBeDefined(); });
  it('groups by provider', async () => { const r = await skill({ action: 'analyze', groupBy: 'provider' }); expect(r).toBeDefined(); });
  it('shows trends', async () => { const r = await skill({ action: 'analyze' }); expect(r.trends).toBeInstanceOf(Array); });
  it('includes weekly forecast', async () => { const r = await skill({ action: 'forecast' }); expect(r.forecast.week).toBeGreaterThan(0); });
  it('includes monthly forecast', async () => { const r = await skill({ action: 'forecast' }); expect(r.forecast.month).toBeGreaterThan(0); });
  it('detects deltas', async () => { const r = await skill({ action: 'analyze' }); expect(r.trends[0].delta).toBeDefined(); });
  it('defaults to analyze', async () => { const r = await skill({}); expect(r.totalCost).toBeGreaterThan(0); });
});
