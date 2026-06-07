/**
 * auto-repair.mjs
 * @version 5.0.0
 * @date 2026-05-31
 *
 * CIC Phase 5: Auto-Repair Suggestion Engine
 *
 * Generates actionable repair suggestions for detected issues:
 *   - DOM fixes (missing alt text, heading hierarchy)
 *   - Content rewrites (clarity, completeness)
 *   - Accessibility patches (ARIA, labels)
 *   - Structured remediation steps
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * @typedef {Object} RepairSuggestion
 * @property {string} issueType            — Type of issue (e.g., 'missing_alt_text')
 * @property {string} severity             — Issue severity (critical, high, medium, low)
 * @property {string} description          — What the issue is
 * @property {string} suggestion           — How to fix it
 * @property {string|Object} codeExample   — Example fix (HTML, text, or structured)
 * @property {number} estimatedEffort      — 1-5 effort score
 * @property {string} impact               — Expected impact on score
 */

/**
 * Generate repair suggestions for detected issues.
 *
 * @param {string|Object} content   — Original content
 * @param {Array<Object>} issues    — Issues from scoring subsystems
 * @param {Object} metadata         — Context { user_id, correlation_id }
 * @returns {Promise<Array<RepairSuggestion>>}
 */
async function generateRepairSuggestions(content, issues = [], metadata = {}) {
  try {
    if (!issues || issues.length === 0) {
      return [];
    }

    const text = _extractText(content);
    const suggestions = [];

    // Group issues by type for efficiency
    const issuesByType = {};
    for (const issue of issues) {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    }

    // Generate suggestions for each issue type
    for (const [type, typeIssues] of Object.entries(issuesByType)) {
      const suggestion = await _generateSuggestion(type, typeIssues, text);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
    });
  } catch (error) {
    console.error('[auto-repair] Error generating suggestions:', error.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggestion Generation
// ─────────────────────────────────────────────────────────────────────────────

async function _generateSuggestion(issueType, issues, content) {
  // Rule-based suggestions for common issues
  const ruleBased = _getRuleBasedSuggestion(issueType, issues, content);
  if (ruleBased) return ruleBased;

  // LLM-based suggestion for complex issues
  return _getAIBasedSuggestion(issueType, issues, content);
}

function _getRuleBasedSuggestion(type, issues, content) {
  const severity = issues[0]?.severity || 'medium';
  const count = issues.length;

  switch (type) {
    case 'missing_alt_text':
      return {
        issueType: type,
        severity,
        description: `${count} image(s) missing alt text`,
        suggestion: 'Add descriptive alt attributes to all images for accessibility and SEO.',
        codeExample: {
          before: '<img src="photo.jpg">',
          after: '<img src="photo.jpg" alt="Detailed description of the image">',
        },
        estimatedEffort: 2,
        impact: 'High: +0.15-0.25 score for full a11y compliance',
      };

    case 'missing_headings':
      return {
        issueType: type,
        severity,
        description: 'Content lacks structural heading hierarchy',
        suggestion: 'Add H1 and subsection headings (H2, H3) to organize content logically.',
        codeExample: {
          before: '<p>Section Title\n<p>Content here...</p>',
          after: '<h2>Section Title</h2>\n<p>Content here...</p>',
        },
        estimatedEffort: 3,
        impact: 'High: +0.20 score for structure and a11y',
      };

    case 'heading_hierarchy_gap':
      return {
        issueType: type,
        severity,
        description: 'Heading levels skip (e.g., H1 → H3)',
        suggestion: 'Use sequential heading levels: H1 → H2 → H3, etc.',
        codeExample: {
          before: '<h1>Title</h1>\n<h3>Subsection</h3>',
          after: '<h1>Title</h1>\n<h2>Subsection</h2>',
        },
        estimatedEffort: 1,
        impact: 'Medium: +0.10 score',
      };

    case 'insufficient_content':
      return {
        issueType: type,
        severity,
        description: `Content too short (${content.length} words)`,
        suggestion: 'Expand content to at least 100 words. Add examples, details, or context.',
        codeExample: 'Add paragraphs with supporting information, examples, or elaboration.',
        estimatedEffort: 3,
        impact: 'Medium: +0.15-0.20 score',
      };

    case 'missing_label':
      return {
        issueType: type,
        severity,
        description: `${count} form input(s) missing labels`,
        suggestion: 'Associate labels with form inputs using the "for" attribute.',
        codeExample: {
          before: '<input id="email" type="email">\n<label>Email</label>',
          after: '<label for="email">Email</label>\n<input id="email" type="email">',
        },
        estimatedEffort: 1,
        impact: 'Medium: +0.15 score for form a11y',
      };

    case 'missing_h1':
      return {
        issueType: type,
        severity: 'critical',
        description: 'Page missing H1 heading',
        suggestion: 'Add exactly one H1 heading at the top of the page.',
        codeExample: {
          before: '<h2>My Page</h2>',
          after: '<h1>My Page</h1>',
        },
        estimatedEffort: 1,
        impact: 'High: +0.20 score',
      };

    case 'no_links':
      return {
        issueType: type,
        severity: 'low',
        description: 'Long content lacks hyperlinks',
        suggestion: 'Add relevant internal or external links to support navigation and context.',
        codeExample: '<a href="https://example.com/resource">Learn more about this topic</a>',
        estimatedEffort: 2,
        impact: 'Low: +0.05-0.10 score',
      };

    case 'choppy_writing':
      return {
        issueType: type,
        severity: 'low',
        description: 'Excessive consecutive short sentences',
        suggestion: 'Combine related short sentences to improve readability and flow.',
        codeExample: {
          before: 'He ran fast. He jumped high. He won the race.',
          after: 'He ran fast, jumped high, and won the race.',
        },
        estimatedEffort: 2,
        impact: 'Low: +0.05 score for clarity',
      };

    case 'topic_drift':
      return {
        issueType: type,
        severity: 'medium',
        description: 'Low vocabulary overlap between sections (topic drift)',
        suggestion: 'Improve coherence by using consistent terminology and connecting concepts.',
        codeExample: 'Use transition phrases like "Building on this...", "In contrast...", etc.',
        estimatedEffort: 3,
        impact: 'Medium: +0.10-0.15 score',
      };

    default:
      return null;
  }
}

async function _getAIBasedSuggestion(issueType, issues, content) {
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 300,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Generate a repair suggestion for this issue in JSON format:

Issue Type: ${issueType}
Severity: ${issues[0]?.severity || 'medium'}
Count: ${issues.length}
Issue Details: ${issues[0]?.message}

Content preview: ${content.slice(0, 200)}...

Respond with ONLY valid JSON (no markdown):
{
  "suggestion": "How to fix this issue",
  "codeExample": "Code or example fix",
  "estimatedEffort": 1-5,
  "impact": "Expected impact on score"
}`,
        },
      ],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(responseText);

    return {
      issueType,
      severity: issues[0]?.severity || 'medium',
      description: issues[0]?.message || 'Unknown issue',
      suggestion: parsed.suggestion,
      codeExample: parsed.codeExample,
      estimatedEffort: Math.max(1, Math.min(5, parsed.estimatedEffort || 2)),
      impact: parsed.impact,
    };
  } catch (error) {
    console.warn(`[auto-repair] AI suggestion failed for ${issueType}:`, error.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Repair Planning
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a prioritized repair plan.
 *
 * @param {Array<RepairSuggestion>} suggestions
 * @returns {Object} Repair plan with phases
 */
function createRepairPlan(suggestions) {
  const plan = {
    totalSuggestions: suggestions.length,
    phases: {
      critical: [],
      high: [],
      medium: [],
      low: [],
    },
    totalEstimatedEffort: 0,
  };

  for (const suggestion of suggestions) {
    const phase = suggestion.severity || 'medium';
    if (plan.phases[phase]) {
      plan.phases[phase].push(suggestion);
      plan.totalEstimatedEffort += suggestion.estimatedEffort || 0;
    }
  }

  return plan;
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

export { generateRepairSuggestions, createRepairPlan };
export default { generateRepairSuggestions, createRepairPlan };
