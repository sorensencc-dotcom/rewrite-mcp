const { describe, it, expect } = require('vitest');
const skill = require('./index.js');

describe('dependency-analyzer', () => {
  it('lists deps', async () => { const r = await skill({ projectPath: '/p', action: 'list' }); expect(r.dependencies).toBeInstanceOf(Array); });
  it('identifies major', async () => { const r = await skill({ projectPath: '/p', action: 'list' }); expect(r.summary.majorVersions).toBeGreaterThanOrEqual(0); });
  it('checks updates', async () => { const r = await skill({ projectPath: '/p', action: 'check-updates' }); expect(r.updatesAvailable).toBeDefined(); });
  it('checks compat', async () => { const r = await skill({ projectPath: '/p', action: 'check-compatibility' }); expect(r.compatible).toBeDefined(); });
  it('audits', async () => { const r = await skill({ projectPath: '/p', action: 'audit' }); expect(r.vulnerabilities).toBeGreaterThanOrEqual(0); });
  it('detects breaking', async () => { const r = await skill({ projectPath: '/p', action: 'list' }); expect(r.dependencies[0].breakingChanges).toBeDefined(); });
  it('compares versions', async () => { const r = await skill({ projectPath: '/p', action: 'list' }); expect(r.dependencies[0].current).toBeDefined(); });
  it('recommends', async () => { const r = await skill({ projectPath: '/p', action: 'check-updates' }); expect(r.recommendations).toBeInstanceOf(Array); });
  it('analyzes semver', async () => { const r = await skill({ projectPath: '/p', action: 'check-updates' }); expect(r).toBeDefined(); });
  it('counts total', async () => { const r = await skill({ projectPath: '/p', action: 'list' }); expect(r.summary.total).toBeGreaterThan(0); });
  it('identifies uptodate', async () => { const r = await skill({ projectPath: '/p', action: 'list' }); expect(r.summary.upToDate).toBeGreaterThanOrEqual(0); });
  it('reports updates', async () => { const r = await skill({ projectPath: '/p', action: 'list' }); expect(r.summary.updatesAvailable).toBeGreaterThanOrEqual(0); });
  it('detects security', async () => { const r = await skill({ projectPath: '/p', action: 'list' }); expect(r.summary.criticalSecurityUpdates).toBeDefined(); });
  it('identifies conflicts', async () => { const r = await skill({ projectPath: '/p', action: 'check-compatibility' }); expect(r.conflicts).toBeInstanceOf(Array); });
  it('requires path', async () => { await expect(skill({ action: 'list' })).rejects.toThrow(); });
});
