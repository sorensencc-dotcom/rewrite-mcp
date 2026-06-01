/**
 * scoring/index.mjs
 * @version 5.0.0
 * @date 2026-05-31
 *
 * CIC Phase 5: Scoring & Self-Evaluation Subsystem
 *
 * Unified export of all scoring modules:
 *   - Scoring engine (orchestration)
 *   - Heuristic rules
 *   - Semantic evaluation
 *   - Structural analysis
 *   - Accessibility checking
 *   - Auto-repair suggestions
 */

export {
  scoreContent,
  scoreBatch,
  scoreContentPartial,
  SCORING_CONFIG,
} from './scoring-engine.mjs';

export {
  applyHeuristicRules,
  RULES as HEURISTIC_RULES,
} from './heuristic-rules.mjs';

export {
  evaluateSemantics,
  evaluateSemanticsBatch,
} from './semantic-evaluator.mjs';

export {
  analyzeStructure,
  STRUCTURAL_CONFIG,
} from './structural-analyzer.mjs';

export {
  checkAccessibility,
  checkAccessibilityBatch,
  A11Y_RULES,
} from './accessibility-checker.mjs';

export {
  generateRepairSuggestions,
  createRepairPlan,
} from './auto-repair.mjs';

// Re-export from engine for convenience
export { default as scoringEngine } from './scoring-engine.mjs';

/**
 * Quick API for single content scoring with all defaults.
 *
 * @param {string} html - HTML content to score
 * @param {Object} [meta={}] - Optional metadata
 * @returns {Promise<import('./scoring-engine.mjs').ScoringResult>}
 */
export async function quickScore(html, meta = {}) {
  const { scoreContent } = await import('./scoring-engine.mjs');
  return scoreContent(html, meta);
}

export default {
  scoreContent: (await import('./scoring-engine.mjs')).scoreContent,
  applyHeuristicRules: (await import('./heuristic-rules.mjs')).applyHeuristicRules,
  evaluateSemantics: (await import('./semantic-evaluator.mjs')).evaluateSemantics,
  analyzeStructure: (await import('./structural-analyzer.mjs')).analyzeStructure,
  checkAccessibility: (await import('./accessibility-checker.mjs')).checkAccessibility,
  generateRepairSuggestions: (await import('./auto-repair.mjs')).generateRepairSuggestions,
  createRepairPlan: (await import('./auto-repair.mjs')).createRepairPlan,
};
