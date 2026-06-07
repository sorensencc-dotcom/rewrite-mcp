import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeImage } from '../src/harvester/extractors/imageAnalyzer.js';
import { geminiClient } from '../src/harvester/models/geminiClient.js';
import { buildPrompt } from '../src/harvester/pmsClient.js';

vi.mock('../src/harvester/pmsClient.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    buildPrompt: vi.fn()
  };
});

describe('Harvester Golden-Path Test', () => {
  const originalRun = geminiClient.run;

  beforeEach(() => {
    // Mock buildPrompt
    vi.mocked(buildPrompt).mockResolvedValue({
      contents: [{ role: 'user', parts: [{ text: 'Mocked Prompt' }] }]
    });

    // Mock geminiClient
    geminiClient.run = vi.fn().mockResolvedValue({
      output: JSON.stringify({
        objects: ['Ford Model T', 'Assembly Line'],
        scenes: ['Factory Interior'],
        people: ['Workers'],
        confidence: 0.95
      }),
      usage: { promptTokens: 100, candidatesTokens: 50, totalTokens: 150 }
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    geminiClient.run = originalRun;
  });

  it('should successfully analyze an image via the golden path (Ingest -> Harvester -> PMS -> Model)', async () => {
    const result = await analyzeImage({
      imageBase64: 'fake-base64-data',
      filePath: '/path/to/image.jpg',
      metadata: { originalFilename: 'model_t.jpg' }
    });

    // 1. Verify PMS was called
    expect(buildPrompt).toHaveBeenCalled();
    const pmsArgs = vi.mocked(buildPrompt).mock.calls[0][0];
    // Expected to use analysis_v1 or similar for images, adapt based on actual implementation
    expect(pmsArgs.pack).toBeDefined();

    // 2. Verify Model was called
    expect(geminiClient.run).toHaveBeenCalled();

    // 3. Verify Output shape
    expect(result).toHaveProperty('objects');
    expect(result.objects).toContain('Ford Model T');
    expect(result.confidence).toBe(0.95);
  });
});
