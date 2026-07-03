import { SubstrateClient, ChunkType } from './substrate-client';

/**
 * Integration tests for TorqueQuery Substrate Service
 * Validates all governance rules, ingestion pipeline, retrieval, and context packing
 */

describe('TorqueQuery Substrate Service Integration Tests', () => {
  const client = new SubstrateClient('http://localhost:3000');
  const testNamespace = `test-${Date.now()}`;
  let storedChunkIds: string[] = [];

  // Cleanup after all tests
  afterAll(async () => {
    try {
      for (const id of storedChunkIds) {
        await client.deleteChunk(id);
      }
    } catch (error) {
      console.log('Cleanup error (expected if chunks not found):', error);
    }
  });

  describe('GOVERNANCE RULES', () => {
    describe('Type Validation', () => {
      test('SYSTEM: should accept and persist SYSTEM chunks', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'SYSTEM',
          title: 'System Rule',
          body: 'This is a system-level rule',
          provenance: { source: 'test-system' }
        });
        expect(chunk.type).toBe('SYSTEM');
        expect(chunk.ttl_days).toBeNull();
        storedChunkIds.push(chunk.id);
      });

      test('LIVING: should accept and persist LIVING chunks', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          title: 'Living Document',
          body: 'This document evolves over time',
          provenance: { source: 'test-living' }
        });
        expect(chunk.type).toBe('LIVING');
        expect(chunk.ttl_days).toBeNull();
        storedChunkIds.push(chunk.id);
      });

      test('STATE: should accept STATE and default TTL to 30 days', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'STATE',
          title: 'Current State',
          body: 'Snapshot of current state',
          provenance: { source: 'test-state' }
        });
        expect(chunk.type).toBe('STATE');
        expect(chunk.ttl_days).toBe(30);
        storedChunkIds.push(chunk.id);
      });

      test('SCRATCH: should accept SCRATCH and default TTL to 7 days', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'SCRATCH',
          title: 'Scratch Notes',
          body: 'Temporary workspace',
          provenance: { source: 'test-scratch' }
        });
        expect(chunk.type).toBe('SCRATCH');
        expect(chunk.ttl_days).toBe(7);
        storedChunkIds.push(chunk.id);
      });

      test('Invalid type should throw error', async () => {
        await expect(
          client.storeChunk({
            namespace: testNamespace,
            type: 'INVALID' as ChunkType,
            provenance: { source: 'test' }
          })
        ).rejects.toThrow();
      });
    });

    describe('Namespace & Provenance Requirements', () => {
      test('Missing namespace should throw error', async () => {
        await expect(
          client.storeChunk({
            namespace: '' as any,
            type: 'LIVING',
            provenance: { source: 'test' }
          })
        ).rejects.toThrow();
      });

      test('Missing provenance should throw error', async () => {
        await expect(
          client.storeChunk({
            namespace: testNamespace,
            type: 'LIVING',
            provenance: undefined as any
          })
        ).rejects.toThrow();
      });

      test('Missing provenance.source should throw error', async () => {
        await expect(
          client.storeChunk({
            namespace: testNamespace,
            type: 'LIVING',
            provenance: { author: 'alice' } as any
          })
        ).rejects.toThrow();
      });
    });

    describe('TTL Enforcement Rules', () => {
      test('SYSTEM: should enforce TTL = null regardless of input', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'SYSTEM',
          ttl_days: 90,
          provenance: { source: 'test-ttl' }
        });
        expect(chunk.ttl_days).toBeNull();
        storedChunkIds.push(chunk.id);
      });

      test('LIVING: should enforce TTL = null regardless of input', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          ttl_days: 365,
          provenance: { source: 'test-ttl' }
        });
        expect(chunk.ttl_days).toBeNull();
        storedChunkIds.push(chunk.id);
      });

      test('STATE: should allow custom TTL override', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'STATE',
          ttl_days: 60,
          provenance: { source: 'test-ttl' }
        });
        expect(chunk.ttl_days).toBe(60);
        storedChunkIds.push(chunk.id);
      });

      test('SCRATCH: should allow custom TTL override', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'SCRATCH',
          ttl_days: 14,
          provenance: { source: 'test-ttl' }
        });
        expect(chunk.ttl_days).toBe(14);
        storedChunkIds.push(chunk.id);
      });
    });

    describe('Importance Clamping [0.0, 1.0]', () => {
      test('Importance < 0.0 should clamp to 0.0', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          importance: -0.5,
          provenance: { source: 'test-importance' }
        });
        expect(chunk.importance).toBe(0.0);
        storedChunkIds.push(chunk.id);
      });

      test('Importance > 1.0 should clamp to 1.0', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          importance: 2.5,
          provenance: { source: 'test-importance' }
        });
        expect(chunk.importance).toBe(1.0);
        storedChunkIds.push(chunk.id);
      });

      test('Valid importance should be preserved', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          importance: 0.75,
          provenance: { source: 'test-importance' }
        });
        expect(chunk.importance).toBe(0.75);
        storedChunkIds.push(chunk.id);
      });

      test('Missing importance should default to 0.5', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          provenance: { source: 'test-importance' }
        });
        expect(chunk.importance).toBe(0.5);
        storedChunkIds.push(chunk.id);
      });
    });

    describe('Body Size Limits', () => {
      test('Body <= 100KB should be accepted', async () => {
        const body = 'x'.repeat(50000);
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          body,
          provenance: { source: 'test-size' }
        });
        expect(chunk.body).toBe(body);
        storedChunkIds.push(chunk.id);
      });

      test('Body > 100KB should throw error', async () => {
        const body = 'x'.repeat(100001);
        await expect(
          client.storeChunk({
            namespace: testNamespace,
            type: 'LIVING',
            body,
            provenance: { source: 'test-size' }
          })
        ).rejects.toThrow();
      });
    });
  });

  describe('INGESTION PIPELINE', () => {
    describe('Normalization & Classification', () => {
      test('Type should be normalized to uppercase', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'system',
          provenance: { source: 'test-normalize' }
        });
        expect(chunk.type).toBe('SYSTEM');
        storedChunkIds.push(chunk.id);
      });

      test('Title and body should be trimmed', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          title: '  Padded Title  ',
          body: '  Padded Body  ',
          provenance: { source: 'test-normalize' }
        });
        expect(chunk.title).toBe('Padded Title');
        expect(chunk.body).toBe('Padded Body');
        storedChunkIds.push(chunk.id);
      });
    });

    describe('Enrichment', () => {
      test('Should auto-tag chunks containing "error"', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          body: 'This is an error condition that needs attention',
          provenance: { source: 'test-enrich' }
        });
        expect(chunk.tags).toContain('error');
        storedChunkIds.push(chunk.id);
      });

      test('Should not duplicate "error" tag', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          tags: ['error', 'critical'],
          body: 'Another error message',
          provenance: { source: 'test-enrich' }
        });
        const errorCount = chunk.tags.filter((t) => t === 'error').length;
        expect(errorCount).toBe(1);
        storedChunkIds.push(chunk.id);
      });

      test('Should preserve non-error tags', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          tags: ['feature', 'documentation'],
          body: 'Regular content',
          provenance: { source: 'test-enrich' }
        });
        expect(chunk.tags).toContain('feature');
        expect(chunk.tags).toContain('documentation');
        storedChunkIds.push(chunk.id);
      });
    });

    describe('Persistence & Versioning', () => {
      test('Stored chunk should have version = 1', async () => {
        const chunk = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          provenance: { source: 'test-version' }
        });
        expect(chunk.version).toBe(1);
        storedChunkIds.push(chunk.id);
      });

      test('Updated chunk should increment version', async () => {
        const stored = await client.storeChunk({
          namespace: testNamespace,
          type: 'LIVING',
          title: 'Original',
          provenance: { source: 'test-version' }
        });
        storedChunkIds.push(stored.id);

        const updated = await client.updateChunk(stored.id, {
          namespace: testNamespace,
          type: 'LIVING',
          title: 'Updated',
          provenance: { source: 'test-version' }
        });
        expect(updated.version).toBe(stored.version + 1);
      });
    });
  });

  describe('HYBRID RETRIEVAL', () => {
    beforeAll(async () => {
      // Pre-populate test data
      const testChunks = [
        {
          namespace: testNamespace,
          type: 'SYSTEM' as const,
          title: 'Architecture Overview',
          body: 'The system is built with microservices and PostgreSQL vector storage',
          tags: ['architecture', 'system'],
          importance: 0.9,
          provenance: { source: 'design-doc' }
        },
        {
          namespace: testNamespace,
          type: 'LIVING' as const,
          title: 'Redis Caching Strategy',
          body: 'We use Redis for high-speed caching and session management',
          tags: ['caching', 'redis'],
          importance: 0.8,
          provenance: { source: 'implementation' }
        },
        {
          namespace: testNamespace,
          type: 'STATE' as const,
          title: 'Current Deployment Status',
          body: 'Production deployment is stable with 99.9% uptime',
          tags: ['deployment', 'production'],
          importance: 0.7,
          provenance: { source: 'operations' }
        }
      ];

      for (const chunk of testChunks) {
        const stored = await client.storeChunk(chunk);
        storedChunkIds.push(stored.id);
      }
    });

    test('Text-only search should return BM25 results', async () => {
      const results = await client.searchHybrid({
        namespace: testNamespace,
        query: 'caching strategy',
        max_results: 10
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].bm25_score).toBeGreaterThan(0);
    });

    test('Hybrid search should use BM25 + Vector scoring', async () => {
      const embedding = new Array(1536).fill(0.1);
      const results = await client.searchHybrid({
        namespace: testNamespace,
        query: 'caching',
        embedding,
        max_results: 10
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].bm25_score).toBeGreaterThan(0);
      expect(results[0].vector_score).toBeGreaterThan(0);
      expect(results[0].fused_score).toBeGreaterThan(0);
    });

    test('Results should be sorted by fused score DESC', async () => {
      const embedding = new Array(1536).fill(0.1);
      const results = await client.searchHybrid({
        namespace: testNamespace,
        query: 'system',
        embedding,
        max_results: 10
      });
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].fused_score).toBeGreaterThanOrEqual(results[i].fused_score);
      }
    });

    test('Max results should be respected', async () => {
      const results = await client.searchHybrid({
        namespace: testNamespace,
        query: 'system',
        max_results: 2
      });
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('CONTEXT PACKING', () => {
    beforeAll(async () => {
      // Pre-populate diverse chunks for context packing
      const chunks = [
        {
          namespace: testNamespace,
          type: 'SYSTEM' as const,
          title: 'System Constraint 1',
          body: 'x'.repeat(500),
          importance: 0.95,
          provenance: { source: 'sys' }
        },
        {
          namespace: testNamespace,
          type: 'LIVING' as const,
          title: 'Living Document 1',
          body: 'y'.repeat(400),
          importance: 0.85,
          provenance: { source: 'live' }
        },
        {
          namespace: testNamespace,
          type: 'STATE' as const,
          title: 'State Snapshot 1',
          body: 'z'.repeat(300),
          importance: 0.7,
          provenance: { source: 'state' }
        },
        {
          namespace: testNamespace,
          type: 'SCRATCH' as const,
          title: 'Scratch Note 1',
          body: 'w'.repeat(200),
          importance: 0.5,
          provenance: { source: 'scratch' }
        }
      ];

      for (const chunk of chunks) {
        const stored = await client.storeChunk(chunk);
        storedChunkIds.push(stored.id);
      }
    });

    test('Should pack chunks respecting token budget', async () => {
      const result = await client.getContextForTask({
        namespace: testNamespace,
        task: 'Tell me about the system constraints and current state',
        max_context_tokens: 1000
      });

      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.token_count).toBeLessThanOrEqual(1000);
    });

    test('Should respect type preference order', async () => {
      const result = await client.getContextForTask({
        namespace: testNamespace,
        task: 'Describe the architecture',
        preferred_types: ['SYSTEM', 'LIVING', 'STATE', 'SCRATCH'],
        max_context_tokens: 5000
      });

      if (result.chunks.length > 1) {
        const typeRank: Record<string, number> = {
          'SYSTEM': 4,
          'LIVING': 3,
          'STATE': 2,
          'SCRATCH': 1
        };

        for (let i = 1; i < result.chunks.length; i++) {
          const prevRank = typeRank[result.chunks[i - 1].type] || 0;
          const currRank = typeRank[result.chunks[i].type] || 0;
          expect(prevRank).toBeGreaterThanOrEqual(currRank);
        }
      }
    });

    test('Should use default type preference when not specified', async () => {
      const result = await client.getContextForTask({
        namespace: testNamespace,
        task: 'General query',
        max_context_tokens: 5000
      });

      expect(result.chunks.length).toBeGreaterThan(0);
      // Default: SYSTEM > LIVING > STATE > SCRATCH
      const typeRank: Record<string, number> = {
        'SYSTEM': 4,
        'LIVING': 3,
        'STATE': 2,
        'SCRATCH': 1
      };

      for (let i = 1; i < result.chunks.length; i++) {
        const prevRank = typeRank[result.chunks[i - 1].type] || 0;
        const currRank = typeRank[result.chunks[i].type] || 0;
        expect(prevRank).toBeGreaterThanOrEqual(currRank);
      }
    });

    test('Should stop adding chunks when budget exceeded', async () => {
      const result = await client.getContextForTask({
        namespace: testNamespace,
        task: 'Some query',
        max_context_tokens: 500
      });

      expect(result.token_count).toBeLessThanOrEqual(500);
    });
  });

  describe('CRUD Operations', () => {
    test('Should retrieve stored chunk by ID', async () => {
      const stored = await client.storeChunk({
        namespace: testNamespace,
        type: 'LIVING',
        title: 'Test Chunk',
        body: 'Test content',
        provenance: { source: 'test-crud' }
      });
      storedChunkIds.push(stored.id);

      const retrieved = await client.getChunk(stored.id);
      expect(retrieved.id).toBe(stored.id);
      expect(retrieved.title).toBe('Test Chunk');
    });

    test('Should list chunks by namespace', async () => {
      const chunks = await client.listChunks(testNamespace, 10, 0);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every((c) => c.namespace === testNamespace)).toBe(true);
    });

    test('Should soft-delete chunk', async () => {
      const stored = await client.storeChunk({
        namespace: testNamespace,
        type: 'LIVING',
        provenance: { source: 'test-delete' }
      });

      const deleteResult = await client.deleteChunk(stored.id);
      expect(deleteResult.success).toBe(true);

      await expect(client.getChunk(stored.id)).rejects.toThrow();
    });

    test('Should update chunk with re-validation', async () => {
      const stored = await client.storeChunk({
        namespace: testNamespace,
        type: 'LIVING',
        title: 'Original Title',
        importance: 0.5,
        provenance: { source: 'test-update' }
      });
      storedChunkIds.push(stored.id);

      const updated = await client.updateChunk(stored.id, {
        namespace: testNamespace,
        type: 'LIVING',
        title: 'Updated Title',
        importance: 1.5,
        provenance: { source: 'test-update' }
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.importance).toBe(1.0); // Clamped
      expect(updated.version).toBeGreaterThan(stored.version);
    });
  });

  describe('SERVICE STATS', () => {
    test('Should return statistics by type and namespace', async () => {
      const stats = await client.getStats();
      expect(Array.isArray(stats)).toBe(true);
      if (stats.length > 0) {
        expect(stats[0]).toHaveProperty('type');
        expect(stats[0]).toHaveProperty('namespace');
        expect(stats[0]).toHaveProperty('active_chunks');
      }
    });
  });
});
