import { describe, it, expect, vi } from 'vitest';
import { buildPrompt } from '../src/harvester/pmsClient.js';
import { loadPromptPack } from '../../../../apps/cic-pms/src/loader/loadPromptPack.js';
import path from 'node:path';

// Note: If you want this to run strictly without reading the filesystem, we would mock loadPromptPack.
// Here we're running it as a true integration test against actual packs.

describe('PMS Integration (Harvester -> PMS)', () => {
  it('should successfully build a prompt from the analysis_v1 pack', async () => {
    // analysis_v1 is assumed to exist in apps/cic-pms/packs/
    const payload = await buildPrompt({
      pack: 'analysis_v1',
      model: 'gemini',
      context: {
        mode: 'text_analysis',
        content: 'Test content to analyze.'
      }
    });

    expect(payload).toBeDefined();
    expect(payload).toHaveProperty('prompt');
    expect(payload.prompt).toContain('Test content to analyze.');
  });

  it('should throw an error when context is missing', async () => {
    await expect(
      buildPrompt({ pack: 'analysis_v1', model: 'gemini' })
    ).rejects.toThrow('buildPrompt: context must be an object');
  });

  it('should throw an error when pack name is missing', async () => {
    await expect(
      buildPrompt({ context: { mode: 'test' } })
    ).rejects.toThrow('buildPrompt: pack is required');
  });
});
