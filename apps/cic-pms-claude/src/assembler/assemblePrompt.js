/**
 * pms-claude/src/assembler/assemblePrompt.js
 * 2026-05-18 v1.0.0
 */
import { mergeSections } from './mergeSections.js';
import { applyGuards } from './applyGuards.js';

export function assemblePrompt(pack) {
  applyGuards(pack);
  
  const prompt = mergeSections(pack.sections);
  
  return {
    model: pack.model,
    prompt,
    metadata: {
      name: pack.name,
      version: pack.version,
      flavor: 'claude-optimized'
    }
  };
}