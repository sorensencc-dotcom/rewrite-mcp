const { describe, it, expect } = require('vitest');
const skill = require('./index.js');

describe('security-scanner', () => {
  it('scans', async () => { const r = await skill({ scanType: 'all' }); expect(r.findings).toBeInstanceOf(Array); });
  it('categorizes', async () => { const r = await skill({ scanType: 'all' }); expect(r.summary.critical).toBeDefined(); });
  it('provides remediation', async () => { const r = await skill({ scanType: 'all' }); expect(r.findings[0].remediation).toBeDefined(); });
  it('scans code', async () => { const r = await skill({ scanType: 'code' }); expect(r.findings).toBeInstanceOf(Array); });
  it('scans config', async () => { const r = await skill({ scanType: 'config' }); expect(r.findings).toBeInstanceOf(Array); });
  it('scans deps', async () => { const r = await skill({ scanType: 'dependencies' }); expect(r.findings).toBeInstanceOf(Array); });
  it('filters severity', async () => { const r = await skill({ scanType: 'all', severity: 'high' }); expect(r.findings[0].severity).toBe('high'); });
  it('generates ID', async () => { const r = await skill({ scanType: 'all' }); expect(r.scanId).toBeDefined(); });
  it('includes timestamp', async () => { const r = await skill({ scanType: 'all' }); expect(r.timestamp).toBeDefined(); });
  it('counts by level', async () => { const r = await skill({ scanType: 'all' }); expect(r.summary.high).toBeDefined(); });
  it('provides total', async () => { const r = await skill({ scanType: 'all' }); expect(r.summary.total).toBeGreaterThanOrEqual(0); });
  it('detects secrets', async () => { const r = await skill({ scanType: 'all' }); expect(r.findings.some(f => f.type === 'secrets')).toBe(true); });
  it('identifies location', async () => { const r = await skill({ scanType: 'all' }); expect(r.findings[0].file).toBeDefined(); });
});
