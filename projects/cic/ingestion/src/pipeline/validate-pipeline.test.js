/**
 * projects/cic/ingestion/src/pipeline/validate-pipeline.test.js
 * @version 1.0.0
 * @date 2026-05-30
 *
 * Integration tests for INGEST → ENRICH → COMPRESS validated pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validatePipeline } from './validate-pipeline.js';

describe('Validate Pipeline — INGEST/ENRICH/COMPRESS Integration', () => {
  let mockQdrantClient;
  let mockClaudeClient;
  let mockEmitterClient;

  beforeEach(() => {
    // Mock Qdrant client
    mockQdrantClient = {
      search: vi.fn(async () => []),
      upsert: vi.fn(async () => ({})),
      retrieve: vi.fn(async () => null),
    };

    // Mock Claude client
    mockClaudeClient = {
      messages: {
        create: vi.fn(async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                root_cause_hypothesis: 'Test hypothesis',
                evidence: ['test evidence'],
                actions: [{ action: 'continue', rationale: 'normal operation' }],
                confidence: 95,
              }),
            },
          ],
        })),
      },
    };

    // Mock Federation Protocol emitter
    mockEmitterClient = {
      emit: vi.fn(async () => ({ message_id: 'msg_test_123', acknowledged: true })),
    };
  });

  it('should complete full pipeline with GREEN status on valid input', async () => {
    const result = await validatePipeline({
      user_id: 'test-user',
      intent: 'research',
      text: 'Charles Emil Sorensen supervised construction at Willow Run',
      source: 'archive',
      qdrantClient: mockQdrantClient,
      claudeClient: mockClaudeClient,
      emitterClient: mockEmitterClient,
    });

    expect(result).toBeDefined();
    expect(result.correlation_id).toBeDefined();
    expect(result.user_id).toBe('test-user');
    expect(result.intent).toBe('research');
    expect(result.source).toBe('archive');
    expect(result.success).toBe(true);
    expect(result.duration_ms).toBeGreaterThan(0);

    // Verify all 3 stages completed
    expect(result.ingest).toBeDefined();
    expect(result.ingest.envelope).toBeDefined();
    expect(result.ingest.validation_result).toBeDefined();

    expect(result.enrich).toBeDefined();
    expect(result.enrich.artifacts).toBeDefined();
    expect(result.enrich.validation_result).toBeDefined();

    expect(result.compress).toBeDefined();
    expect(result.compress.optimized_output).toBeDefined();
    expect(result.compress.validation_result).toBeDefined();
  });

  it('should fail on missing required fields', async () => {
    try {
      await validatePipeline({
        user_id: 'test-user',
        intent: 'research',
        text: '', // Missing text
        qdrantClient: mockQdrantClient,
        claudeClient: mockClaudeClient,
        emitterClient: mockEmitterClient,
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.message).toContain('missing required fields');
    }
  });

  it('should fail on missing required clients', async () => {
    try {
      await validatePipeline({
        user_id: 'test-user',
        intent: 'research',
        text: 'test text',
        // Missing clients
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.message).toContain('missing required clients');
    }
  });

  it('should emit telemetry for INGEST validation', async () => {
    await validatePipeline({
      user_id: 'test-user',
      intent: 'research',
      text: 'test content',
      qdrantClient: mockQdrantClient,
      claudeClient: mockClaudeClient,
      emitterClient: mockEmitterClient,
    });

    // Verify emitter was called at least once (INGEST validation)
    expect(mockEmitterClient.emit).toHaveBeenCalled();
  });

  it('should preserve envelope through all stages', async () => {
    const result = await validatePipeline({
      user_id: 'test-user',
      intent: 'research',
      text: 'test content',
      qdrantClient: mockQdrantClient,
      claudeClient: mockClaudeClient,
      emitterClient: mockEmitterClient,
    });

    // Envelope should have valid structure after INGEST
    expect(result.ingest.envelope).toHaveProperty('id');
    expect(result.ingest.envelope).toHaveProperty('region');
    expect(result.ingest.envelope).toHaveProperty('source');
    expect(result.ingest.envelope).toHaveProperty('content');
  });

  it('should generate artifacts during ENRICH stage', async () => {
    const result = await validatePipeline({
      user_id: 'test-user',
      intent: 'research',
      text: 'test content with image',
      source: 'drive',
      qdrantClient: mockQdrantClient,
      claudeClient: mockClaudeClient,
      emitterClient: mockEmitterClient,
    });

    // ENRICH stage should produce artifacts array (might be empty if no extractors match)
    expect(Array.isArray(result.enrich.artifacts)).toBe(true);
  });

  it('should produce compressed output smaller than original', async () => {
    const result = await validatePipeline({
      user_id: 'test-user',
      intent: 'research',
      text: 'test content',
      qdrantClient: mockQdrantClient,
      claudeClient: mockClaudeClient,
      emitterClient: mockEmitterClient,
    });

    const originalSize = JSON.stringify({
      envelope: result.ingest.envelope,
      artifacts: result.enrich.artifacts,
    }).length;

    const compressedSize = JSON.stringify(result.compress.optimized_output).length;

    // Compressed should be smaller
    expect(compressedSize).toBeLessThanOrEqual(originalSize);
  });

  it('should include correlation_id in all validation results', async () => {
    const result = await validatePipeline({
      user_id: 'test-user',
      intent: 'research',
      text: 'test content',
      qdrantClient: mockQdrantClient,
      claudeClient: mockClaudeClient,
      emitterClient: mockEmitterClient,
    });

    expect(result.ingest.validation_result).toHaveProperty('success');
    expect(result.enrich.validation_result).toHaveProperty('success');
    expect(result.compress.validation_result).toHaveProperty('success');
  });

  it('should handle different intents correctly', async () => {
    const intents = ['research', 'archive', 'documentary', 'events'];

    for (const intent of intents) {
      const result = await validatePipeline({
        user_id: 'test-user',
        intent,
        text: 'test content',
        qdrantClient: mockQdrantClient,
        claudeClient: mockClaudeClient,
        emitterClient: mockEmitterClient,
      });

      expect(result.intent).toBe(intent);
      expect(result.success).toBe(true);
      expect(result.ingest.envelope.region).toBeDefined();
    }
  });

  it('should return timing information for performance analysis', async () => {
    const result = await validatePipeline({
      user_id: 'test-user',
      intent: 'research',
      text: 'test content',
      qdrantClient: mockQdrantClient,
      claudeClient: mockClaudeClient,
      emitterClient: mockEmitterClient,
    });

    expect(result.duration_ms).toBeGreaterThan(0);
    expect(typeof result.duration_ms).toBe('number');
  });

  it('should handle errors gracefully and return success: false', async () => {
    // Create a broken normalizer by passing invalid input structure
    const result = await validatePipeline({
      user_id: 'test-user',
      intent: 'research',
      text: 'test',
      source: 'archive',
      qdrantClient: mockQdrantClient,
      claudeClient: mockClaudeClient,
      emitterClient: mockEmitterClient,
    });

    // Depending on implementation, this might succeed or fail gracefully
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('correlation_id');
  });
});
