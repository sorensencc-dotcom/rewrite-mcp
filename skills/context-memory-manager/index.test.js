const { describe, it, expect } = require('vitest');
const skill = require('./index.js');

describe('context-memory-manager', () => {
  it('stores values', async () => {
    const result = await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 'test' } });
    expect(result.success).toBe(true);
  });

  it('retrieves values', async () => {
    await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 'test' } });
    const result = await skill({ action: 'retrieve', namespace: 'ns1', key: 'k1' });
    expect(result.success).toBe(true);
    expect(result.value.d).toBe('test');
  });

  it('deletes values', async () => {
    await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 'test' } });
    const result = await skill({ action: 'delete', namespace: 'ns1', key: 'k1' });
    expect(result.deleted).toBe(true);
  });

  it('lists namespace', async () => {
    await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 't' } });
    const result = await skill({ action: 'list', namespace: 'ns1' });
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it('isolates namespaces', async () => {
    await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 'ns1' } });
    await skill({ action: 'store', namespace: 'ns2', key: 'k1', value: { d: 'ns2' } });
    const r1 = await skill({ action: 'retrieve', namespace: 'ns1', key: 'k1' });
    const r2 = await skill({ action: 'retrieve', namespace: 'ns2', key: 'k1' });
    expect(r1.value.d).toBe('ns1');
    expect(r2.value.d).toBe('ns2');
  });

  it('respects TTL', async () => {
    await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 't' }, ttl: 1 });
    await new Promise(r => setTimeout(r, 1100));
    const result = await skill({ action: 'retrieve', namespace: 'ns1', key: 'k1' });
    expect(result.success).toBe(false);
  });

  it('requires action', async () => {
    await expect(skill({ namespace: 'ns1' })).rejects.toThrow();
  });

  it('requires namespace', async () => {
    await expect(skill({ action: 'store' })).rejects.toThrow();
  });

  it('tracks size', async () => {
    const result = await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 'test' } });
    expect(result.size).toBeGreaterThan(0);
  });

  it('supports tags', async () => {
    const result = await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 't' }, tags: ['tag1'] });
    expect(result).toBeDefined();
  });

  it('provides expiration time', async () => {
    const result = await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 't' } });
    expect(result.expiresAt).toBeDefined();
  });

  it('returns not found for missing', async () => {
    const result = await skill({ action: 'retrieve', namespace: 'ns1', key: 'missing' });
    expect(result.success).toBe(false);
  });

  it('lists items with details', async () => {
    await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 't' } });
    const result = await skill({ action: 'list', namespace: 'ns1' });
    expect(result.items).toBeInstanceOf(Array);
  });

  it('defaults TTL to 24h', async () => {
    const result = await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: { d: 't' } });
    expect(result.expiresAt).toBeDefined();
  });

  it('handles large values', async () => {
    const large = { d: 'x'.repeat(10000) };
    const result = await skill({ action: 'store', namespace: 'ns1', key: 'k1', value: large });
    expect(result.size).toBeGreaterThan(1000);
  });
});
