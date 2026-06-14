import { UnifiedGovernanceAPI } from './UnifiedGovernanceAPI';
import fetch from 'node-fetch';

describe('UnifiedGovernanceAPI (M3 + Phase 23.2)', () => {
  let api: UnifiedGovernanceAPI;
  const API_KEY = 'test-key';
  const BASE_URL = 'http://localhost:3100';

  beforeAll(async () => {
    api = new UnifiedGovernanceAPI(3100);
    await api.start();
  });

  afterAll(async () => {
    // Server cleanup
  });

  describe('M3 Vault Records', () => {
    it('should write governance vault record', async () => {
      const record = {
        vault_record_id: 'vault-001',
        schema_version: '24.5',
        created_at: new Date().toISOString(),
        build_id: 'build-123',
        cic_pipeline_id: 'pipeline-456',
        decision: 'Approved',
        vault_digest: 'sha256:abc123',
      };

      const res = await fetch(`${BASE_URL}/vault/records`, {
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

    it('should retrieve vault record', async () => {
      const res = await fetch(`${BASE_URL}/vault/records/vault-001`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.vault_record_id).toBe('vault-001');
    });

    it('should report vault health', async () => {
      const res = await fetch(`${BASE_URL}/vault/health`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.status).toBe('ok');
      expect(data.service).toBe('vault');
    });
  });

  describe('Phase 23.2 Memory Query API', () => {
    it('should query events by type', async () => {
      const res = await fetch(`${BASE_URL}/memory/query/by-type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ event_type: 'PIPELINE_RUN', limit: 10 }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data).toHaveProperty('events');
      expect(data).toHaveProperty('count');
    });

    it('should query events by agent', async () => {
      const res = await fetch(`${BASE_URL}/memory/query/by-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ source_agent: 'codeflow-analyzer', limit: 10 }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data).toHaveProperty('events');
      expect(data).toHaveProperty('count');
    });

    it('should query events by time window', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);

      const res = await fetch(`${BASE_URL}/memory/query/by-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          after_timestamp: oneHourAgo.toISOString(),
          before_timestamp: now.toISOString(),
          limit: 10,
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data).toHaveProperty('events');
    });

    it('should detect semantic signals', async () => {
      const res = await fetch(`${BASE_URL}/memory/signals/semantic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ threshold: 0.7 }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(Array.isArray(data.signals)).toBe(true);
    });

    it('should detect temporal signals', async () => {
      const res = await fetch(`${BASE_URL}/memory/signals/temporal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ window_minutes: 60 }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(Array.isArray(data.signals)).toBe(true);
    });

    it('should detect all signals combined', async () => {
      const res = await fetch(`${BASE_URL}/memory/signals/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ semantic_threshold: 0.7, temporal_window: 60 }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data).toHaveProperty('semantic_signals');
      expect(data).toHaveProperty('temporal_signals');
      expect(data).toHaveProperty('causal_signals');
      expect(data).toHaveProperty('total_confidence');
    });
  });

  describe('Unified API', () => {
    it('should report health', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.status).toBe('ok');
      expect(data.services).toBeDefined();
    });

    it('should reject requests without auth', async () => {
      const res = await fetch(`${BASE_URL}/vault/records/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(401);
    });
  });
});
