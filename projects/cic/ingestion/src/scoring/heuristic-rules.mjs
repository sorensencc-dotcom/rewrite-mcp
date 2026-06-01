/**
 * heuristic-rules.mjs
 * @version 5.0.0
 * @date 2026-05-31
 *
 * CIC Phase 5: Heuristic-Based Scoring Rules
 *
 * Fast, deterministic scoring based on content properties:
 *   - Completeness (word count, media coverage)
 *   - Clarity (vocabulary, sentence length)
 *   - Coherence (topic drift, section structure)
 *   - Sourcing (citations, references, attribution)
 */

/**
 * @typedef {Object} HeuristicScore
 * @property {number} score         — 0-1 overall heuristic score
 * @property {Object} factors       — Per-factor scores
 * @property {Array<Object>} issues — Detected issues
 */

const RULES = {
  completeness: {
    minWords: 100,
    maxWords: 50000,
    wordWeight: 0.25,
  },
  clarity: {
    avgSentenceLength: 20,
    avgWordLength: 5.5,
    maxConsecutiveShort: 10,
    clarityWeight: 0.25,
  },
  coherence: {
    sectionDrift: 0.15,
    coherenceWeight: 0.25,
  },
  sourcing: {
    citationPattern: /\[\d+\]|{{cite|url:/gi,
    attributionKeywords: ['source', 'via', 'attributed', 'according'],
    sourcingWeight: 0.25,
  },
};

/**
 * Apply heuristic scoring rules to content.
 *
 * @param {string|Object} content — HTML string or DOM object
 * @returns {Promise<HeuristicScore>}
 */
export async function applyHeuristicRules(content) {
  try {
    const text = _extractText(content);
    const words = _tokenizeWords(text);
    const sentences = _tokenizeSentences(text);

    const factors = {
      completeness: _scoreCompleteness(words),
      clarity: _scoreClarity(words, sentences),
      coherence: _scoreCoherence(sentences),
      sourcing: _scoreSourcing(text),
    };

    const score =
      (factors.completeness.score * RULES.completeness.wordWeight +
        factors.clarity.score * RULES.clarity.clarityWeight +
        factors.coherence.score * RULES.coherence.coherenceWeight +
        factors.sourcing.score * RULES.sourcing.sourcingWeight) /
      (RULES.completeness.wordWeight +
        RULES.clarity.clarityWeight +
        RULES.coherence.coherenceWeight +
        RULES.sourcing.sourcingWeight);

    const issues = [
      ...factors.completeness.issues,
      ...factors.clarity.issues,
      ...factors.coherence.issues,
      ...factors.sourcing.issues,
    ];

    return {
      score: Math.min(1, Math.max(0, score)),
      factors,
      issues,
    };
  } catch (error) {
    return {
      score: 0,
      factors: {},
      issues: [{ type: 'heuristic_error', message: error.message, severity: 'high' }],
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Functions
// ─────────────────────────────────────────────────────────────────────────────

function _scoreCompleteness(words) {
  const count = words.length;
  const issues = [];

  let score = 0.5; // baseline

  if (count < RULES.completeness.minWords) {
    score = Math.max(0, count / RULES.completeness.minWords) * 0.5;
    issues.push({
      type: 'insufficient_content',
      message: `Content too short: ${count} words (minimum ${RULES.completeness.minWords})`,
      severity: 'medium',
    });
  } else if (count > RULES.completeness.maxWords) {
    score = Math.max(0.5, 1 - (count - RULES.completeness.maxWords) / RULES.completeness.maxWords * 0.5);
    issues.push({
      type: 'excessive_content',
      message: `Content too long: ${count} words (maximum ${RULES.completeness.maxWords})`,
      severity: 'low',
    });
  } else {
    score = 1.0;
  }

  return { score, issues };
}

function _scoreClarity(words, sentences) {
  const issues = [];
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length || 0;
  const avgSentenceLength = words.length / sentences.length || 0;

  let score = 1.0;

  // Penalize overly complex vocabulary
  if (avgWordLength > RULES.clarity.avgWordLength) {
    score -= (avgWordLength - RULES.clarity.avgWordLength) * 0.1;
  }

  // Penalize overly long sentences
  if (avgSentenceLength > RULES.clarity.avgSentenceLength) {
    score -= (avgSentenceLength - RULES.clarity.avgSentenceLength) * 0.05;
  }

  // Check for too many consecutive short sentences (choppiness)
  let consecutiveShort = 0;
  for (const sentence of sentences) {
    const sentenceWords = _tokenizeWords(sentence);
    if (sentenceWords.length < 5) {
      consecutiveShort++;
      if (consecutiveShort > RULES.clarity.maxConsecutiveShort) {
        issues.push({
          type: 'choppy_writing',
          message: 'Too many consecutive short sentences (readability issue)',
          severity: 'low',
        });
        break;
      }
    } else {
      consecutiveShort = 0;
    }
  }

  return {
    score: Math.min(1, Math.max(0, score)),
    issues,
  };
}

function _scoreCoherence(sentences) {
  const issues = [];
  let score = 1.0;

  // Simple coherence check: detect topic drift via vocabulary consistency
  if (sentences.length < 3) {
    return { score: 0.8, issues: [{ type: 'short_content', message: 'Too few sentences for coherence analysis', severity: 'low' }] };
  }

  const firstHalf = sentences.slice(0, Math.floor(sentences.length / 2)).join(' ');
  const secondHalf = sentences.slice(Math.floor(sentences.length / 2)).join(' ');

  const firstWords = new Set(_tokenizeWords(firstHalf).map(w => w.toLowerCase()));
  const secondWords = new Set(_tokenizeWords(secondHalf).map(w => w.toLowerCase()));

  const overlap = Array.from(firstWords).filter(w => secondWords.has(w)).length;
  const avgVocab = (firstWords.size + secondWords.size) / 2;
  const overlapRatio = avgVocab > 0 ? overlap / avgVocab : 0;

  if (overlapRatio < RULES.coherence.sectionDrift) {
    score -= 0.3;
    issues.push({
      type: 'topic_drift',
      message: `Low vocabulary overlap between sections (${(overlapRatio * 100).toFixed(1)}% vs ${(RULES.coherence.sectionDrift * 100).toFixed(1)}% expected)`,
      severity: 'medium',
    });
  }

  return { score: Math.min(1, Math.max(0, score)), issues };
}

function _scoreSourcing(text) {
  const issues = [];
  let score = 0.5;

  const citations = (text.match(RULES.sourcing.citationPattern) || []).length;
  const attributions = RULES.sourcing.attributionKeywords.filter(kw =>
    new RegExp(`\\b${kw}\\b`, 'gi').test(text)
  ).length;

  const totalSources = citations + attributions;

  if (totalSources === 0) {
    score = 0.4;
    issues.push({
      type: 'missing_sources',
      message: 'No citations or attribution found',
      severity: 'medium',
    });
  } else if (totalSources >= 5) {
    score = 1.0;
  } else {
    score = 0.4 + (totalSources / 5) * 0.6;
  }

  return { score: Math.min(1, Math.max(0, score)), issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Processing
// ─────────────────────────────────────────────────────────────────────────────

function _extractText(content) {
  if (typeof content === 'string') {
    // Simple HTML tag removal
    return content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  // Assume it's a DOM-like object
  return content.textContent || content.innerText || '';
}

function _tokenizeWords(text) {
  return text
    .toLowerCase()
    .match(/\b\w+\b/g)
    || [];
}

function _tokenizeSentences(text) {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
}

export { applyHeuristicRules, RULES };
export default { applyHeuristicRules, RULES };
