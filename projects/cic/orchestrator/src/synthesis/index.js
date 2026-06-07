/**
 * projects/cic/orchestrator/src/synthesis/index.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Synthesis Engine Orchestrator
 * Main intelligence "spine" connecting AIR to final research artifacts.
 */

import { runTechnicalLens } from './lenses/technical.js';
import { runHistoricalLens } from './lenses/historical.js';
import { runNarrativeLens } from './lenses/narrative.js';
import { toMarkdown } from './formatters/markdown.js';
import { toJson } from './formatters/json.js';

/**
 * Orchestrates the synthesis process for an Asset Intelligence Record.
 * 
 * @param {Object} air - Asset Intelligence Record
 * @returns {Promise<Object>} - { result, markdown, json }
 */
export async function synthesizeAsset(air) {
  // 1. Run all lenses in parallel
  const [technical, historical, narrative] = await Promise.all([
    runTechnicalLens(air).catch(err => _fallbackLensResult('technical', err)),
    runHistoricalLens(air).catch(err => _fallbackLensResult('historical', err)),
    runNarrativeLens(air).catch(err => _fallbackLensResult('narrative', err))
  ]);

  // 2. Merge thematic tags
  const thematicTags = mergeTags(technical, historical, narrative);

  // 3. Compute synthesis confidence
  const synthesisConfidence = computeSynthesisConfidence({
    technical,
    historical,
    narrative
  });

  // 4. Derive suggested chapters
  const suggestedChapters = deriveSuggestedChapters({
    technical,
    historical,
    narrative,
    tags: thematicTags
  });

  // 5. Build the SynthesisResult
  const result = {
    assetId: air.assetId,
    version: "1.0.0",

    executiveSummary: buildExecutiveSummary({
      technical,
      historical,
      narrative,
      tags: thematicTags
    }),

    analysis: {
      technical: technical.analysis,
      historical: historical.analysis,
      narrative: narrative.analysis
    },

    thematicTags,
    suggestedChapters,
    synthesisConfidence
  };

  // 6. Format outputs
  return {
    result,
    markdown: toMarkdown(result),
    json: toJson(result)
  };
}

/**
 * Merges and deduplicates tags from all lenses.
 * Sorted lexicographically for determinism.
 */
export function mergeTags(technical, historical, narrative) {
  const set = new Set([
    ...technical.tags,
    ...historical.tags,
    ...narrative.tags
  ]);
  return Array.from(set).sort();
}

/**
 * Computes weighted synthesis confidence.
 * Weights: Technical (0.4), Historical (0.35), Narrative (0.25)
 */
export function computeSynthesisConfidence({ technical, historical, narrative }) {
  const weighted =
    (technical.confidence * 0.4) +
    (historical.confidence * 0.35) +
    (narrative.confidence * 0.25);

  return Math.max(0, Math.min(1, Number(weighted.toFixed(3))));
}

/**
 * Maps thematic tags to documentary chapters/beats.
 */
export function deriveSuggestedChapters({ tags }) {
  const chapters = [];

  const mappings = {
    'moving-line': 'The Birth of the Moving Assembly Line',
    'foundry': 'Fire and Iron: The Foundry Workers',
    'willow-run': 'The Arsenal of Democracy',
    'ford-motor-co': 'The Ford Empire',
    'industrial-warfare': 'Production for Victory'
  };

  for (const [tag, chapter] of Object.entries(mappings)) {
    if (tags.includes(tag)) {
      chapters.push(chapter);
    }
  }

  return Array.from(new Set(chapters)).sort();
}

/**
 * Builds the high-level executive summary.
 * Currently template-driven for strict determinism.
 */
export function buildExecutiveSummary({ technical, historical, narrative, tags }) {
  // Option 1: Template-driven
  return [
    technical.analysis,
    historical.analysis,
    narrative.analysis
  ].join(' ').trim();
}

/**
 * Fallback for lens-level failures.
 */
function _fallbackLensResult(kind, err) {
  console.warn(`[SynthesisOrchestrator] Lens failure (${kind}): ${err.message}`);
  return {
    analysis: `[${kind}] Analysis unavailable due to insufficient signal.`,
    tags: [],
    confidence: 0
  };
}
