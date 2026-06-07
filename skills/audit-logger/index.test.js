const { describe, it, expect } = require('vitest');
const skill = require('./index.js');

describe('audit-logger', () => {
  it('logs skill-invoked events', async () => { const r = await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); expect(r.auditId).toBeDefined(); });
  it('logs workflow-executed events', async () => { const r = await skill({ action: 'log', event: 'workflow-executed', actor: 'system', resource: 'workflow:test' }); expect(r.event).toBe('workflow-executed'); });
  it('logs config-changed events', async () => { const r = await skill({ action: 'log', event: 'config-changed', actor: 'admin', resource: 'config' }); expect(r.event).toBe('config-changed'); });
  it('generates unique IDs', async () => { const r1 = await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); const r2 = await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); expect(r1.auditId).not.toBe(r2.auditId); });
  it('generates IDs with prefix', async () => { const r = await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); expect(r.auditId).toMatch(/^audit-/); });
  it('records ISO timestamp', async () => { const r = await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); expect(r.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); });
  it('tracks actor correctly', async () => { const r = await skill({ action: 'log', event: 'skill-invoked', actor: 'user-123', resource: 'skill:test' }); expect(r.actor).toBe('user-123'); });
  it('tracks resource correctly', async () => { const r = await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:security' }); expect(r.resource).toBe('skill:security'); });
  it('records changes object', async () => { const changes = { status: 'active' }; const r = await skill({ action: 'log', event: 'config-changed', actor: 'claude', resource: 'cfg', changes }); expect(r.changes).toEqual(changes); });
  it('handles missing changes', async () => { const r = await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); expect(r.changes).toEqual({}); });
  it('queries logs by time range', async () => { await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); const r = await skill({ action: 'query', timeRange: '7d' }); expect(r.logs).toBeInstanceOf(Array); expect(r.timeRange).toBe('7d'); });
  it('queries logs by event type', async () => { await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); const r = await skill({ action: 'query', event: 'skill-invoked' }); expect(r.logs).toBeInstanceOf(Array); });
  it('queries logs by resource', async () => { await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); const r = await skill({ action: 'query', resource: 'skill:test' }); expect(r.logs).toBeInstanceOf(Array); });
  it('exports logs in jsonl format', async () => { const r = await skill({ action: 'export' }); expect(r.format).toBe('jsonl'); expect(r.lines).toBeGreaterThanOrEqual(0); });
  it('enforces retention policy', async () => { const r = await skill({ action: 'retention', retentionDays: 30 }); expect(r.retentionDays).toBe(30); expect(r.remaining).toBeGreaterThanOrEqual(0); });
  it('calculates retention removal count', async () => { const r = await skill({ action: 'retention', retentionDays: 30 }); expect(r.removed).toBeGreaterThanOrEqual(0); });
  it('requires action parameter', async () => { await expect(skill({})).rejects.toThrow(); });
  it('requires actor for logging', async () => { await expect(skill({ action: 'log', event: 'skill-invoked', resource: 'skill:test' })).rejects.toThrow(); });
  it('requires resource for logging', async () => { await expect(skill({ action: 'log', event: 'skill-invoked', actor: 'claude' })).rejects.toThrow(); });
  it('sets success result on log', async () => { const r = await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); expect(r.result).toBe('success'); });
  it('records retention timestamp', async () => { const r = await skill({ action: 'log', event: 'skill-invoked', actor: 'claude', resource: 'skill:test' }); expect(r.retention).toBeDefined(); });
});
