import { VaultServer, VaultRecord } from './VaultServer';
import fetch from 'node-fetch';

describe('VaultServer', () => {
  let server: VaultServer;
  const API_KEY = 'test-key';

  beforeAll(async () => {
    server = new VaultServer(9999);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should reject requests without auth', async () => {
    const res = await fetch('http://localhost:9999/vault/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vault_record_id: 'test' }),
    });
    expect(res.status).toBe(401);
  });

  it('should store vault records deterministically', async () => {
    const record: VaultRecord = {
      vault_record_id: 'vault-001',
      schema_version: '24.5',
      created_at: new Date().toISOString(),
      build_id: 'build-123',
      cic_pipeline_id: 'pipeline-456',
      decision: 'Approved',
      vault_digest: 'sha256:abc123',
    };

    const res = await fetch('http://localhost:9999/vault/records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(record),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.vault_record_id).toBe('vault-001');
    expect(data.status).toBe('stored');
  });

  it('should retrieve stored records by ID', async () => {
    const record: VaultRecord = {
      vault_record_id: 'vault-002',
      schema_version: '24.5',
      created_at: new Date().toISOString(),
      build_id: 'build-124',
      cic_pipeline_id: 'pipeline-457',
      decision: 'Approved',
      vault_digest: 'sha256:def456',
    };

    await fetch('http://localhost:9999/vault/records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(record),
    });

    const getRes = await fetch('http://localhost:9999/vault/records/vault-002', {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });

    expect(getRes.status).toBe(200);
    const data = (await getRes.json()) as any;
    expect(data.build_id).toBe('build-124');
  });

  it('should return 404 for missing records', async () => {
    const res = await fetch('http://localhost:9999/vault/records/nonexistent', {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    expect(res.status).toBe(404);
  });

  it('should report health', async () => {
    const res = await fetch('http://localhost:9999/vault/health', {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
    expect(data.records).toBeGreaterThanOrEqual(0);
  });
});
