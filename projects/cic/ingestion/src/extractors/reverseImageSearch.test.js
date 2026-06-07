/**
 * projects/cic/ingestion/src/extractors/reverseImageSearch.test.js
 * @version 1.0.0
 * @date 2026-06-07
 *
 * Unit tests for ReverseImageSearchExtractor
 */

import { describe, it, expect } from 'vitest';
import { ReverseImageSearchExtractor } from './reverseImageSearch.js';

describe('ReverseImageSearchExtractor', () => {
  const mockCtx = {
    logDebug: () => {},
    logWarn: () => {},
    logError: () => {}
  };

  // Test 1: Supports only image assets
  it('should support image assets', () => {
    const envelope = {
      id: 'test-1',
      region: 'us',
      source: { type: 'image' },
      content: { media: [] }
    };
    expect(ReverseImageSearchExtractor.supports(envelope)).toBe(true);
  });

  // Test 2: Does not support non-image assets
  it('should not support non-image assets', () => {
    const envelope = {
      id: 'test-2',
      region: 'us',
      source: { type: 'text' },
      content: { media: [] }
    };
    expect(ReverseImageSearchExtractor.supports(envelope)).toBe(false);
  });

  // Test 3: Processes image media correctly
  it('should process image media and return artifacts', async () => {
    const envelope = {
      id: 'test-3',
      region: 'us',
      source: { type: 'image' },
      content: { media: [] }
    };

    const input = {
      envelope,
      text: null,
      media: [{ type: 'image', data: Buffer.from('fake') }],
      metadata: {}
    };

    const result = await ReverseImageSearchExtractor.run(input, mockCtx);

    expect(result.extractor.name).toBe('reverse-image-search');
    expect(result.assetId).toBe('test-3');
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(result.artifacts[0].payload.kind).toBe('reverse-image-results');
  });

  // Test 4: searchConfidence is in valid range
  it('should have searchConfidence between 0.0 and 1.0', async () => {
    const envelope = {
      id: 'test-4',
      region: 'us',
      source: { type: 'image' },
      content: { media: [] }
    };

    const input = {
      envelope,
      text: null,
      media: [{ type: 'image', data: Buffer.from('fake') }],
      metadata: {}
    };

    const result = await ReverseImageSearchExtractor.run(input, mockCtx);
    const confidence = result.artifacts[0].payload.searchConfidence;

    expect(confidence).toBeGreaterThanOrEqual(0.0);
    expect(confidence).toBeLessThanOrEqual(1.0);
  });

  // Test 5: Returns warning on no image media
  it('should return warning when no image media found', async () => {
    const envelope = {
      id: 'test-5',
      region: 'us',
      source: { type: 'image' },
      content: { media: [] }
    };

    const input = {
      envelope,
      text: null,
      media: [{ type: 'text', data: 'just text' }],
      metadata: {}
    };

    const result = await ReverseImageSearchExtractor.run(input, mockCtx);

    expect(result.artifacts.length).toBe(0);
    expect(result.warnings).toBeDefined();
    expect(result.warnings[0]).toContain('No image media found');
  });

  // Test 6: Results include required fields
  it('should include all required fields in results', async () => {
    const envelope = {
      id: 'test-6',
      region: 'us',
      source: { type: 'image' },
      content: { media: [] }
    };

    const input = {
      envelope,
      text: null,
      media: [{ type: 'image', data: Buffer.from('fake') }],
      metadata: {}
    };

    const result = await ReverseImageSearchExtractor.run(input, mockCtx);
    const payload = result.artifacts[0].payload;

    expect(payload.results).toBeDefined();
    expect(Array.isArray(payload.results)).toBe(true);
    expect(payload.totalMatches).toBeDefined();
    expect(payload.searchConfidence).toBeDefined();

    // Each result must have url, title, confidence, source
    payload.results.forEach(result => {
      expect(result.url).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.source).toBeDefined();
    });
  });
});
