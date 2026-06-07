/**
 * pms/src/assembler/assemblePrompt.js
 * 2026-05-18 v1.0.0
 */
import { mergeSections } from './mergeSections.js';
import { applyGuards } from './applyGuards.js';

export function assemblePrompt(args) {
  // Support both legacy (pack) and new ({ pack, model, context }) signatures
  const pack = args.pack || args;
  const model = args.model || pack.model;
  const context = args.context;

  applyGuards(pack);
  
  const prompt = mergeSections(pack.sections, context);
  
  return {
    model: model || 'gemini',
    prompt,
    context, // Pass context through for multimodal handling
    metadata: {
      name: pack.name,
      version: pack.version
    }
  };
}