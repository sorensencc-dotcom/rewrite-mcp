/**
 * imageAnalyzerV2.test.js
 * @version 2.0.1
 * @date 2026-05-18
 *
 * Unit tests for ImageAnalyzerV2 extractor.
 * Uses dependency injection (_deps) — no vi.mock, no live API calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from '../src/extractors/ImageAnalyzerV2.js';

// ---------------------------------------------------------------------------
// Fake deps + fixtures
// ---------------------------------------------------------------------------

function makeDeps({ responseText = null, readFileShouldThrow = null } = {}) {
  const readFile = readFileShouldThrow
    ? vi.fn().mockRejectedValue(new Error(readFileShouldThrow))
    : vi.fn().mockResolvedValue(Buffer.from('FAKEJPEGBYTES'));

  const anthropicCreate = responseText !== null
    ? vi.fn().mockResolvedValue({ content: [{ text: responseText }] })
    : vi.fn().mockRejectedValue(new Error('anthropicCreate not configured'));

  return { readFile, anthropicCreate };
}

function makeInput(overrides = {}) {
  return {
    assetId:          'asset-001',
    sourceSystem:     'fs',
    sourcePath:       '/tmp/test-image.jpg',
    mimeType:         'image/jpeg',
    originalFilename: 'test-image.jpg',
    folderPath:       'CIC/Photos',
    createdAt:        '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeResponseText({ description = 'A factory floor with workers.', withJson = true } = {}) {
  const jsonBlock = withJson
    ? '\n\n<json>\n' + JSON.stringify({
        summary: 'Factory floor with workers circa 1940s.',
        entities: {
          people: ['workers'], locations: ['Willow Run'],
          organizations: ['Ford Motor Company'],
          objects: ['machinery', 'conveyor belt'],
          activities: ['assembly'], emotions: ['focused'],
          timeOfDay: 'day', era: '1940s',
        },
        tags: ['factory', 'ford', 'willow-run', 'assembly-line', '1940s'],
      }, null, 2) + '\n</json>'
    : '';
  return description + jsonBlock;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImageAnalyzerV2.run()', () => {

  it('returns success=true with full envelope on clean run', async () => {
    const deps   = makeDeps({ responseText: makeResponseText() });
    const result = await run(makeInput(), {}, deps);

    expect(result.success).toBe(true);
    expect(result.analyzer).toBe('ImageAnalyzerV2');
    expect(result.version).toBe('2.0.0');
    expect(result.assetId).toBe('asset-001');
    expect(result.description).toContain('factory floor');
    expect(result.summary).toBe('Factory floor with workers circa 1940s.');
    expect(result.error).toBeUndefined();
  });

  it('populates entities correctly from structured JSON block', async () => {
    const deps   = makeDeps({ responseText: makeResponseText() });
    const result = await run(makeInput(), {}, deps);

    expect(result.entities.people).toContain('workers');
    expect(result.entities.locations).toContain('Willow Run');
    expect(result.entities.organizations).toContain('Ford Motor Company');
    expect(result.entities.era).toBe('1940s');
    expect(result.tags).toContain('assembly-line');
  });

  it('builds a valid ingestChunk with canonical text format', async () => {
    const deps   = makeDeps({ responseText: makeResponseText() });
    const result = await run(makeInput(), {}, deps);

    expect(result.ingestChunk).not.toBeNull();
    expect(result.ingestChunk.assetId).toBe('asset-001');
    expect(typeof result.ingestChunk.chunkId).toBe('string');
    expect(result.ingestChunk.text).toContain('[IMAGE DESCRIPTION]');
    expect(result.ingestChunk.text).toContain('Description:');
    expect(result.ingestChunk.text).toContain('Entities:');
    expect(result.ingestChunk.text).toContain('Source:');
    expect(result.ingestChunk.text).toContain('Asset ID: asset-001');
  });

  it('strips <json> block from description prose', async () => {
    const deps   = makeDeps({ responseText: makeResponseText() });
    const result = await run(makeInput(), {}, deps);

    expect(result.description).not.toContain('<json>');
    expect(result.description).not.toContain('</json>');
  });

  it('includes timing metadata with correct types', async () => {
    const deps   = makeDeps({ responseText: makeResponseText() });
    const result = await run(makeInput(), {}, deps);

    expect(result.timing.startedAt).toBeTruthy();
    expect(result.timing.finishedAt).toBeTruthy();
    expect(typeof result.timing.durationMs).toBe('number');
    expect(result.timing.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.timing.retries).toBe('number');
  });

  it('success=true with sparse entities when JSON block is absent', async () => {
    const deps   = makeDeps({ responseText: makeResponseText({ withJson: false }) });
    const result = await run(makeInput(), {}, deps);

    expect(result.success).toBe(true);
    expect(result.description).toContain('factory floor');
    expect(result.entities.people).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.ingestChunk).not.toBeNull();
  });

  it('success=true with sparse entities when JSON block is malformed', async () => {
    const deps   = makeDeps({ responseText: 'Some description.\n\n<json>NOT VALID JSON</json>' });
    const result = await run(makeInput(), {}, deps);

    expect(result.success).toBe(true);
    expect(result.entities.people).toEqual([]);
  });

  it('INVALID_INPUT when assetId is missing', async () => {
    const result = await run({ sourceSystem: 'fs', sourcePath: '/x.jpg', mimeType: 'image/jpeg' });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INVALID_INPUT');
    expect(result.ingestChunk).toBeNull();
  });

  it('INVALID_INPUT when mimeType is not an image', async () => {
    const result = await run(makeInput({ mimeType: 'application/pdf' }));

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INVALID_INPUT');
  });

  it('INVALID_INPUT when no source is resolvable', async () => {
    const result = await run({ assetId: 'x', sourceSystem: 'fs', mimeType: 'image/jpeg' });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INVALID_INPUT');
  });

  it('IMAGE_FETCH_FAILED when readFile rejects', async () => {
    const deps   = makeDeps({ readFileShouldThrow: 'ENOENT: no such file' });
    const result = await run(makeInput(), {}, deps);

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('IMAGE_FETCH_FAILED');
    expect(result.error.message).toContain('ENOENT');
    expect(result.ingestChunk).toBeNull();
  });

  it('VISION_PROVIDER_FAILED when Claude throws on all attempts', async () => {
    const anthropicCreate = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'));
    const deps = { readFile: vi.fn().mockResolvedValue(Buffer.from('BYTES')), anthropicCreate };

    const result = await run(makeInput(), { retries: 1 }, deps);

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('VISION_PROVIDER_FAILED');
    expect(result.error.message).toContain('rate limit');
    expect(result.timing.retries).toBe(1);
  });

  it('succeeds on second attempt after one transient provider failure', async () => {
    const anthropicCreate = vi.fn()
      .mockRejectedValueOnce(new Error('transient error'))
      .mockResolvedValueOnce({ content: [{ text: makeResponseText() }] });
    const deps = { readFile: vi.fn().mockResolvedValue(Buffer.from('BYTES')), anthropicCreate };

    const result = await run(makeInput(), { retries: 2 }, deps);

    expect(result.success).toBe(true);
    expect(result.timing.retries).toBe(1);
    expect(anthropicCreate).toHaveBeenCalledTimes(2);
  });

  it('VISION_PROVIDER_FAILED for unsupported provider', async () => {
    const deps   = makeDeps({ responseText: makeResponseText() });
    const result = await run(makeInput(), { provider: 'openai' }, deps);

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('VISION_PROVIDER_FAILED');
    expect(result.error.message).toContain('openai');
  });

  it('uses bytesPath and skips sourcePath', async () => {
    const deps   = makeDeps({ responseText: makeResponseText() });
    const input  = makeInput({ bytesPath: '/tmp/pre-downloaded.jpg' });
    const result = await run(input, {}, deps);

    expect(result.success).toBe(true);
    expect(deps.readFile).toHaveBeenCalledWith('/tmp/pre-downloaded.jpg');
    expect(deps.readFile).not.toHaveBeenCalledWith('/tmp/test-image.jpg');
  });

  it('disables JSON extraction when enableStructuredExtraction=false', async () => {
    const deps   = makeDeps({ responseText: makeResponseText() });
    const result = await run(makeInput(), { enableStructuredExtraction: false }, deps);

    expect(result.success).toBe(true);
    expect(result.description).toContain('<json>');
    expect(result.tags).toEqual([]);
  });

  it('error envelope always has null ingestChunk and zero-filled entities', async () => {
    const deps   = makeDeps({ readFileShouldThrow: 'disk error' });
    const result = await run(makeInput(), {}, deps);

    expect(result.ingestChunk).toBeNull();
    expect(result.timing.startedAt).toBeTruthy();
    expect(result.timing.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.entities.people).toEqual([]);
    expect(result.entities.era).toBeNull();
  });
});
