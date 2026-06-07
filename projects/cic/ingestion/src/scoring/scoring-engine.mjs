/**
 * scoring-engine.mjs
 * @version 5.0.0
 * @date 2026-05-31
 *
 * CIC Phase 5: Deterministic Scoring & Self-Evaluation Engine
 *
 * Aggregates multiple scoring subsystems (heuristic, semantic, structural, accessibility)
 * into a unified, deterministic score with weighted contributions and explainability.
 *
 * Usage:
 *   import { scoreContent } from './scoring-engine.mjs';
 *   const result = await scoreContent(contentDom, metadata);
 */

import { applyHeuristicRules } from './heuristic-rules.mjs';
import { evaluateSemantics } from './semantic-evaluator.mjs';
import { analyzeStructure } from './structural-analyzer.mjs';
import { checkAccessibility } from './accessibility-checker.mjs';
import { generateRepairSuggestions } from './auto-repair.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration & Weights
// ─────────────────────────────────────────────────────────────────────────────

const SCORING_CONFIG = {
  weights: {
    heuristic: 0.25,
    semantic: 0.35,
    structural: 0.20,
    accessibility: 0.20,
  },
  thresholds: {
    excellent: 0.85,
    good: 0.70,
    acceptable: 0.50,
    poor: 0.30,
    critical: 0.0,
  },
  timeoutMs: 30000,
};

/**
 * @typedef {Object} ScoringResult
 * @property {number} score                 — Overall 0-1 score
 * @property {string} grade                 — Letter grade (A, B, C, D, F)
 * @property {Object} breakdown             — Per-subsystem scores
 * @property {Object} breakdown.heuristic   — Heuristic rules score (0-1)
 * @property {Object} breakdown.semantic    — Semantic evaluation score (0-1)
 * @property {Object} breakdown.structural  — Structural analysis score (0-1)
 * @property {Object} breakdown.accessibility — A11y score (0-1)
 * @property {Array<Object>} issues         — Detected issues with severity
 * @property {Array<Object>} suggestions    — Auto-repair suggestions
 * @property {Object} metadata              — Scoring run metadata
 * @property {number} metadata.duration_ms  — Time to score
 * @property {string} metadata.correlation_id
 */

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score content with deterministic, multi-axis evaluation.
 *
 * @param {string|Object} contentDom       — HTML string or JSDOM Document
 * @param {Object} metadata                — Metadata context
 * @param {string} [metadata.url]          — Source URL
 * @param {string} [metadata.user_id]      — User context
 * @param {string} [metadata.correlation_id] — Request ID
 * @returns {Promise<ScoringResult>}
 */
export async function scoreContent(contentDom, metadata = {}) {
  const t0 = Date.now();
  const { correlation_id = _generateId() } = metadata;

  try {
    // Run all scoring subsystems in parallel
    const [heuristicScore, semanticScore, structuralScore, accessibilityScore] =
      await Promise.all([
        _withTimeout(applyHeuristicRules(contentDom), 'heuristic'),
        _withTimeout(evaluateSemantics(contentDom, metadata), 'semantic'),
        _withTimeout(analyzeStructure(contentDom), 'structural'),
        _withTimeout(checkAccessibility(contentDom), 'accessibility'),
      ]);

    // Aggregate weighted score
    const aggregated = _aggregateScores({
      heuristic: heuristicScore,
      semantic: semanticScore,
      structural: structuralScore,
      accessibility: accessibilityScore,
    });

    // Collect all issues from subscores
    const allIssues = _deduplicateIssues([
      ...(heuristicScore.issues || []),
      ...(semanticScore.issues || []),
      ...(structuralScore.issues || []),
      ...(accessibilityScore.issues || []),
    ]);

    // Generate repair suggestions for detected issues
    const suggestions = await _withTimeout(
      generateRepairSuggestions(contentDom, allIssues, metadata),
      'repair'
    );

    const duration_ms = Date.now() - t0;

    return {
      score: aggregated.score,
      grade: _scoreToGrade(aggregated.score),
      breakdown: {
        heuristic: heuristicScore,
        semantic: semanticScore,
        structural: structuralScore,
        accessibility: accessibilityScore,
      },
      issues: allIssues,
      suggestions,
      metadata: {
        duration_ms,
        correlation_id,
        ...metadata,
      },
    };
  } catch (error) {
    return {
      score: 0,
      grade: 'F',
      breakdown: { heuristic: null, semantic: null, structural: null, accessibility: null },
      issues: [{ type: 'fatal', message: error.message, severity: 'critical' }],
      suggestions: [],
      metadata: {
        duration_ms: Date.now() - t0,
        correlation_id,
        error: error.message,
        ...metadata,
      },
    };
  }
}

/**
 * Batch score multiple contents.
 *
 * @param {Array<{content: string, metadata?: Object}>} items
 * @returns {Promise<Array<ScoringResult>>}
 */
export async function scoreBatch(items) {
  return Promise.all(
    items.map(({ content, metadata }) => scoreContent(content, metadata))
  );
}

/**
 * Score with focus on specific subsystems only.
 *
 * @param {string|Object} contentDom
 * @param {Object} metadata
 * @param {Array<string>} systems — E.g., ['heuristic', 'accessibility']
 * @returns {Promise<ScoringResult>}
 */
export async function scoreContentPartial(contentDom, metadata = {}, systems = []) {
  const t0 = Date.now();
  const { correlation_id = _generateId() } = metadata;

  const breakdown = {};

  // Only run requested subsystems
  if (systems.includes('heuristic')) {
    breakdown.heuristic = await _withTimeout(applyHeuristicRules(contentDom), 'heuristic');
  }
  if (systems.includes('semantic')) {
    breakdown.semantic = await _withTimeout(evaluateSemantics(contentDom, metadata), 'semantic');
  }
  if (systems.includes('structural')) {
    breakdown.structural = await _withTimeout(analyzeStructure(contentDom), 'structural');
  }
  if (systems.includes('accessibility')) {
    breakdown.accessibility = await _withTimeout(checkAccessibility(contentDom), 'accessibility');
  }

  const aggregated = _aggregateScores(breakdown);

  return {
    score: aggregated.score,
    grade: _scoreToGrade(aggregated.score),
    breakdown,
    issues: _deduplicateIssues(
      Object.values(breakdown).flatMap(s => s?.issues || [])
    ),
    suggestions: [],
    metadata: {
      duration_ms: Date.now() - t0,
      correlation_id,
      systems,
      ...metadata,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate weighted scores from all subsystems.
 *
 * @private
 */
function _aggregateScores(breakdown) {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [system, result] of Object.entries(breakdown)) {
    if (!result) continue;
    const weight = SCORING_CONFIG.weights[system] || 0;
    const score = result.score ?? 0;
    totalScore += score * weight;
    totalWeight += weight;
  }

  return {
    score: totalWeight > 0 ? totalScore / totalWeight : 0,
    weighted: true,
  };
}

/**
 * Convert numeric score to letter grade.
 *
 * @private
 */
function _scoreToGrade(score) {
  if (score >= SCORING_CONFIG.thresholds.excellent) return 'A';
  if (score >= SCORING_CONFIG.thresholds.good) return 'B';
  if (score >= SCORING_CONFIG.thresholds.acceptable) return 'C';
  if (score >= SCORING_CONFIG.thresholds.poor) return 'D';
  return 'F';
}

/**
 * Deduplicate issues by message + severity.
 *
 * @private
 */
function _deduplicateIssues(issues) {
  const seen = new Set();
  const unique = [];

  for (const issue of issues) {
    const key = `${issue.type}:${issue.message}:${issue.severity}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(issue);
    }
  }

  return unique.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
  });
}

/**
 * Execute async operation with timeout.
 *
 * @private
 */
async function _withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`[${label}] timeout after ${SCORING_CONFIG.timeoutMs}ms`)),
        SCORING_CONFIG.timeoutMs
      )
    ),
  ]).catch(error => ({
    score: null,
    issues: [{ type: 'timeout', message: error.message, severity: 'high' }],
  }));
}

/**
 * Generate deterministic ID.
 *
 * @private
 */
function _generateId() {
  return 'score_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

export { SCORING_CONFIG };
export default { scoreContent, scoreBatch, scoreContentPartial, SCORING_CONFIG };
