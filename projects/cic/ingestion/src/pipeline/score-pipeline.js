/**
 * score-pipeline.js
 * @version 5.0.0
 * @date 2026-05-31
 *
 * CIC Phase 5: Scoring Pipeline — Deterministic Quality Evaluation
 *
 * Runs Phase 5 scoring subsystem on content:
 *   - Multi-axis scoring (heuristic, semantic, structural, accessibility)
 *   - Aggregate weighted score (0-1)
 *   - Issue detection and prioritization
 *   - Auto-repair suggestions
 *
 * Usage (programmatic):
 *   import { runScoringPipeline } from './src/pipeline/score-pipeline.js';
 *   const result = await runScoringPipeline({ content, metadata });
 *
 * Usage (CLI):
 *   node src/pipeline/run-pipeline.js --mode=score --content="<html>..." [--user_id=<id>]
 */

import { scoreContent } from '../scoring/scoring-engine.mjs';
import { log } from '../logging/logger.js';
import crypto from 'node:crypto';
import { computeContextEfficiencyScore } from '../lib/headroomAutotune.js';

const MODULE = 'score-pipeline';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ScoringPipelineInput
 * @property {string} content       — HTML or text content to score
 * @property {string} [user_id]     — User context
 * @property {string} [url]         — Source URL
 * @property {string} [source]      — Source label (e.g., 'archive', 'drive')
 */

/**
 * @typedef {Object} ScoringPipelineResult
 * @property {string} correlation_id
 * @property {string} user_id
 * @property {number} score          — Overall 0-1 score
 * @property {string} grade          — Letter grade (A-F)
 * @property {Object} breakdown      — Per-subsystem scores
 * @property {Array<Object>} issues  — Detected issues
 * @property {Array<Object>} suggestions — Repair suggestions
 * @property {number} duration_ms
 */

/**
 * Run scoring pipeline on content.
 *
 * @param {ScoringPipelineInput} input
 * @returns {Promise<ScoringPipelineResult>}
 */
async function runScoringPipeline({
  content,
  user_id = 'anonymous',
  url = null,
  source = 'manual',
  correlation_id = crypto.randomUUID(),
}) {
  const t0 = Date.now();

  _assertInput({ content });

  log.info('scoring_pipeline_start', {
    correlation_id,
    user_id,
    source,
    content_length: content.length,
  });

  try {
    // Run Phase 5 scoring engine
    const scoringResult = await scoreContent(content, {
      user_id,
      url,
      correlation_id,
    });

    const duration_ms = Date.now() - t0;

    log.info('scoring_pipeline_complete', {
      correlation_id,
      user_id,
      score: scoringResult.score,
      grade: scoringResult.grade,
      issue_count: scoringResult.issues.length,
      suggestion_count: scoringResult.suggestions.length,
      duration_ms,
    });

    const efficiency = computeContextEfficiencyScore();
    return {
      correlation_id,
      user_id,
      score: scoringResult.score,
      grade: scoringResult.grade,
      breakdown: scoringResult.breakdown,
      issues: scoringResult.issues,
      suggestions: scoringResult.suggestions,
      metadata: scoringResult.metadata,
      duration_ms,
      contextEfficiencyScore: efficiency.score,
      contextEfficiencyCompression: efficiency.avgCompression,
      contextEfficiencyLatency: efficiency.avgLatency,
    };
  } catch (err) {
    log.error('scoring_pipeline_failed', {
      correlation_id,
      user_id,
      source,
      err: err.message,
      duration_ms: Date.now() - t0,
    });

    throw err;
  }
}

/**
 * Batch score multiple contents.
 *
 * @param {Array<ScoringPipelineInput>} items
 * @returns {Promise<Array<ScoringPipelineResult>>}
 */
async function runScoringPipelineBatch(items) {
  return Promise.all(
    items.map(input => runScoringPipeline(input))
  );
}

/**
 * Score with focus on specific subsystems.
 *
 * @param {ScoringPipelineInput & { systems?: Array<string> }} input
 * @returns {Promise<ScoringPipelineResult>}
 */
async function runScoringPipelinePartial({
  content,
  user_id = 'anonymous',
  url = null,
  source = 'manual',
  systems = ['heuristic', 'semantic', 'structural', 'accessibility'],
  correlation_id = crypto.randomUUID(),
}) {
  const t0 = Date.now();

  _assertInput({ content });

  try {
    const { scoreContentPartial } = await import('../scoring/scoring-engine.mjs');

    const scoringResult = await scoreContentPartial(
      content,
      { user_id, url, correlation_id },
      systems
    );

    const duration_ms = Date.now() - t0;

    log.info('scoring_pipeline_partial_complete', {
      correlation_id,
      user_id,
      systems,
      score: scoringResult.score,
      duration_ms,
    });

    const efficiency = computeContextEfficiencyScore();
    return {
      correlation_id,
      user_id,
      score: scoringResult.score,
      grade: scoringResult.grade,
      breakdown: scoringResult.breakdown,
      issues: scoringResult.issues,
      suggestions: [],
      metadata: scoringResult.metadata,
      duration_ms,
      contextEfficiencyScore: efficiency.score,
      contextEfficiencyCompression: efficiency.avgCompression,
      contextEfficiencyLatency: efficiency.avgLatency,
    };
  } catch (err) {
    log.error('scoring_pipeline_partial_failed', {
      correlation_id,
      user_id,
      err: err.message,
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function _assertInput({ content }) {
  if (!content || typeof content !== 'string') {
    throw new Error(`[${MODULE}] content is required and must be a string`);
  }
  if (content.trim().length === 0) {
    throw new Error(`[${MODULE}] content cannot be empty`);
  }
}

export { runScoringPipeline, runScoringPipelineBatch, runScoringPipelinePartial };
export default { runScoringPipeline, runScoringPipelineBatch, runScoringPipelinePartial };
