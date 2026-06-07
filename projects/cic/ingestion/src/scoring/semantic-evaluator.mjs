/**
 * semantic-evaluator.mjs
 * @version 5.0.0
 * @date 2026-05-31
 *
 * CIC Phase 5: Semantic Evaluation via LLM
 *
 * Uses Claude API to evaluate semantic quality:
 *   - Relevance to declared intent
 *   - Factual accuracy assessment
 *   - Information density
 *   - Argument quality
 *
 * Prompt-cached for efficiency; deterministic via temperature=0.
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SEMANTIC_SYSTEM_PROMPT = `You are a semantic quality evaluator. Assess the provided content on:

1. **Relevance** (0-1): How well does the content match the stated intent?
2. **Accuracy** (0-1): How factually correct and well-supported is the content?
3. **Density** (0-1): How efficiently is information presented (0=verbose, 1=concise)?
4. **Argumentation** (0-1): How sound is the logical structure and reasoning?

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "relevance": 0.85,
  "accuracy": 0.90,
  "density": 0.75,
  "argumentation": 0.80,
  "assessment": "Brief explanation of scores",
  "concerns": ["specific concern 1", "specific concern 2"]
}`;

/**
 * @typedef {Object} SemanticScore
 * @property {number} score         — 0-1 overall semantic score
 * @property {Object} factors       — Per-factor scores (relevance, accuracy, density, argumentation)
 * @property {string} assessment    — LLM's text assessment
 * @property {Array<string>} concerns — Identified issues
 * @property {Array<Object>} issues — Formatted issues array
 */

/**
 * Evaluate content semantics via Claude.
 *
 * @param {string} content       — Text to evaluate
 * @param {Object} metadata      — { intent, user_id, correlation_id }
 * @returns {Promise<SemanticScore>}
 */
async function evaluateSemantics(content, metadata = {}) {
  try {
    const text = _extractText(content);
    const { intent = 'general', correlation_id } = metadata;

    if (!text || text.length === 0) {
      return {
        score: 0,
        factors: { relevance: 0, accuracy: 0, density: 0, argumentation: 0 },
        assessment: 'No content to evaluate',
        concerns: ['Empty content'],
        issues: [{ type: 'empty_content', message: 'Content is empty', severity: 'high' }],
      };
    }

    const userPrompt = `Evaluate this content for the stated intent: "${intent}"\n\n${text}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 500,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: SEMANTIC_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse LLM response (must be valid JSON)
    let evaluation;
    try {
      evaluation = JSON.parse(responseText);
    } catch {
      return {
        score: 0.5,
        factors: { relevance: 0.5, accuracy: 0.5, density: 0.5, argumentation: 0.5 },
        assessment: 'LLM response parsing failed',
        concerns: ['Failed to parse LLM evaluation'],
        issues: [{ type: 'semantic_parse_error', message: 'Could not parse semantic evaluation', severity: 'high' }],
      };
    }

    // Aggregate factor scores
    const factors = {
      relevance: Math.max(0, Math.min(1, evaluation.relevance ?? 0.5)),
      accuracy: Math.max(0, Math.min(1, evaluation.accuracy ?? 0.5)),
      density: Math.max(0, Math.min(1, evaluation.density ?? 0.5)),
      argumentation: Math.max(0, Math.min(1, evaluation.argumentation ?? 0.5)),
    };

    const score = (factors.relevance + factors.accuracy + factors.density + factors.argumentation) / 4;

    // Convert concerns to issues
    const issues = (evaluation.concerns || []).map(concern => ({
      type: 'semantic_concern',
      message: concern,
      severity: score < 0.5 ? 'high' : 'medium',
    }));

    return {
      score: Math.max(0, Math.min(1, score)),
      factors,
      assessment: evaluation.assessment || 'No assessment provided',
      concerns: evaluation.concerns || [],
      issues,
    };
  } catch (error) {
    return {
      score: 0,
      factors: { relevance: 0, accuracy: 0, density: 0, argumentation: 0 },
      assessment: `Error: ${error.message}`,
      concerns: [error.message],
      issues: [{ type: 'semantic_error', message: error.message, severity: 'critical' }],
    };
  }
}

/**
 * Batch evaluate multiple contents.
 *
 * @param {Array<{content: string, metadata?: Object}>} items
 * @returns {Promise<Array<SemanticScore>>}
 */
async function evaluateSemanticsBatch(items) {
  return Promise.all(
    items.map(({ content, metadata }) => evaluateSemantics(content, metadata))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal
// ─────────────────────────────────────────────────────────────────────────────

function _extractText(content) {
  if (typeof content === 'string') {
    return content.replace(/<[^>]*>/g, '').trim();
  }
  return content?.textContent || content?.innerText || '';
}

export { evaluateSemantics, evaluateSemanticsBatch };
export default { evaluateSemantics, evaluateSemanticsBatch };
