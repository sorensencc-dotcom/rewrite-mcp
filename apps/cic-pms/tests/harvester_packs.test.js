/**
 * apps/cic-pms/tests/harvester_packs.test.js
 * Validation suite for Harvester-specific prompt packs.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPromptPack } from '../src/loader/loadPromptPack.js';
import { computeHash } from '../src/drift/computeHash.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKS_DIR = path.resolve(__dirname, '../packs');

describe('Harvester Prompt Packs Validation', () => {
  const packs = ['analysis_v1', 'research_v1', 'rewrite_v1'];

  packs.forEach(packName => {
    test(`${packName} should load and validate successfully`, async () => {
      const packPath = path.join(PACKS_DIR, `${packName}.json`);
      const pack = await loadPromptPack(packPath);
      
      expect(pack.name).toBe(packName);
      expect(pack.version).toBe('1.0.0');
      expect(pack.model).toBe('gemini');
      expect(pack.sections).toBeDefined();
      expect(pack.sections.system).toBeDefined();
      expect(pack.sections.instructions).toBeDefined();
    });

    test(`${packName} should have a deterministic hash`, async () => {
      const packPath = path.join(PACKS_DIR, `${packName}.json`);
      const pack = await loadPromptPack(packPath);
      
      const hash1 = computeHash(pack);
      const hash2 = computeHash(pack);
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex length
    });
  });

  test('analysis_v1 should contain specific modes', async () => {
    const pack = await loadPromptPack(path.join(PACKS_DIR, 'analysis_v1.json'));
    const instructions = pack.sections.instructions;
    
    expect(instructions).toContain('image_analysis');
    expect(instructions).toContain('reverse_image_search');
    expect(instructions).toContain('text_extraction');
    expect(instructions).toContain('metadata_extraction');
  });

  test('research_v1 should contain specific modes', async () => {
    const pack = await loadPromptPack(path.join(PACKS_DIR, 'research_v1.json'));
    const instructions = pack.sections.instructions;
    
    expect(instructions).toContain('file_classification');
    expect(instructions).toContain('domain_classification');
  });

  test('rewrite_v1 should contain specific modes', async () => {
    const pack = await loadPromptPack(path.join(PACKS_DIR, 'rewrite_v1.json'));
    const instructions = pack.sections.instructions;
    
    expect(instructions).toContain('summary');
    expect(instructions).toContain('entity_extraction');
  });
});
