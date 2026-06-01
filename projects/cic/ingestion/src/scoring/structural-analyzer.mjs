/**
 * structural-analyzer.mjs
 * @version 5.0.0
 * @date 2026-05-31
 *
 * CIC Phase 5: Structural Analysis
 *
 * Evaluates content structure for:
 *   - Heading hierarchy (H1→H6 flow)
 *   - Section organization
 *   - List/blockquote usage
 *   - Link and media distribution
 *   - HTML validity and semantic tags
 */

/**
 * @typedef {Object} StructuralScore
 * @property {number} score         — 0-1 overall structural score
 * @property {Object} metrics       — Structure metrics (headings, links, etc.)
 * @property {Array<Object>} issues — Detected structural issues
 */

const STRUCTURAL_CONFIG = {
  minHeadings: 2,
  maxHeadingHierarchyGap: 1,
  minLinksPerSection: 0.5,
  minMediaPerContent: 0.05,
  maxConsecutiveBlocks: 3,
};

/**
 * Analyze content structure.
 *
 * @param {string|Object} content — HTML string or DOM object
 * @returns {Promise<StructuralScore>}
 */
export async function analyzeStructure(content) {
  try {
    const doc = _parseContent(content);
    const metrics = _analyzeMetrics(doc);
    const issues = _checkStructuralRules(metrics);

    let score = 1.0;

    // Penalize missing headings
    if (metrics.headingCount < STRUCTURAL_CONFIG.minHeadings) {
      score -= 0.3;
    }

    // Penalize heading hierarchy problems
    if (metrics.headingHierarchyGaps > 0) {
      score -= 0.1 * metrics.headingHierarchyGaps;
    }

    // Penalize low link density
    if (metrics.linkDensity < STRUCTURAL_CONFIG.minLinksPerSection) {
      score -= 0.1;
    }

    // Penalize low media usage
    if (metrics.mediaCount === 0 && metrics.wordCount > 500) {
      score -= 0.15;
    }

    // Penalize unbalanced blockquote usage
    if (metrics.blockquoteCount > metrics.sectionCount * 2) {
      score -= 0.1;
    }

    return {
      score: Math.max(0, Math.min(1, score)),
      metrics,
      issues,
    };
  } catch (error) {
    return {
      score: 0,
      metrics: {},
      issues: [{ type: 'structure_error', message: error.message, severity: 'critical' }],
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis Functions
// ─────────────────────────────────────────────────────────────────────────────

function _analyzeMetrics(doc) {
  const headings = doc.querySelectorAll?.('h1, h2, h3, h4, h5, h6') || [];
  const links = doc.querySelectorAll?.('a[href]') || [];
  const images = doc.querySelectorAll?.('img') || [];
  const videos = doc.querySelectorAll?.('video, iframe[src*="youtube"], iframe[src*="vimeo"]') || [];
  const blockquotes = doc.querySelectorAll?.('blockquote') || [];
  const sections = doc.querySelectorAll?.('section, article, main') || [];

  const headingLevels = Array.from(headings).map(h => parseInt(h.tagName[1]));
  const headingHierarchyGaps = _countHierarchyGaps(headingLevels);

  const text = doc.textContent || doc.innerText || '';
  const wordCount = text.match(/\b\w+\b/g)?.length || 0;

  return {
    headingCount: headings.length,
    headingLevels,
    headingHierarchyGaps,
    linkCount: links.length,
    mediaCount: images.length + videos.length,
    imageCount: images.length,
    videoCount: videos.length,
    blockquoteCount: blockquotes.length,
    sectionCount: Math.max(1, sections.length),
    wordCount,
    linkDensity: headings.length > 0 ? links.length / Math.max(1, headings.length) : 0,
  };
}

function _countHierarchyGaps(levels) {
  let gaps = 0;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > STRUCTURAL_CONFIG.maxHeadingHierarchyGap) {
      gaps++;
    }
  }
  return gaps;
}

function _checkStructuralRules(metrics) {
  const issues = [];

  // Missing headings
  if (metrics.headingCount === 0) {
    issues.push({
      type: 'missing_headings',
      message: 'No headings found; content lacks structural organization',
      severity: 'high',
    });
  }

  // Heading hierarchy problems
  if (metrics.headingHierarchyGaps > 0) {
    issues.push({
      type: 'heading_hierarchy_gap',
      message: `Heading hierarchy has ${metrics.headingHierarchyGaps} gap(s) (e.g., H1 → H3)`,
      severity: 'medium',
    });
  }

  // No links
  if (metrics.linkCount === 0 && metrics.wordCount > 300) {
    issues.push({
      type: 'no_links',
      message: 'Long content lacks hyperlinks for navigation',
      severity: 'low',
    });
  }

  // No media
  if (metrics.mediaCount === 0 && metrics.wordCount > 1000) {
    issues.push({
      type: 'no_media',
      message: 'Very long content has no images or videos; consider adding visual elements',
      severity: 'low',
    });
  }

  // Excessive blockquotes
  if (metrics.blockquoteCount > metrics.sectionCount * 2) {
    issues.push({
      type: 'excessive_blockquotes',
      message: `Too many blockquotes (${metrics.blockquoteCount}) relative to sections (${metrics.sectionCount})`,
      severity: 'medium',
    });
  }

  // Single heading
  if (metrics.headingCount === 1) {
    issues.push({
      type: 'single_heading',
      message: 'Only one heading found; content likely lacks subsections',
      severity: 'medium',
    });
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM Parsing
// ─────────────────────────────────────────────────────────────────────────────

function _parseContent(content) {
  // If it's already a DOM object, return it
  if (content && typeof content === 'object' && content.querySelectorAll) {
    return content;
  }

  // If it's a string, try to parse it
  if (typeof content === 'string') {
    if (typeof DOMParser !== 'undefined') {
      try {
        const dom = new DOMParser().parseFromString(content, 'text/html');
        return dom;
      } catch {
        // Fall through
      }
    }

    // Fallback: create a mock DOM object for string content
    return {
      querySelectorAll: () => [],
      textContent: content,
      innerText: content,
    };
  }

  return {
    querySelectorAll: () => [],
    textContent: '',
    innerText: '',
  };
}

export { analyzeStructure, STRUCTURAL_CONFIG };
export default { analyzeStructure, STRUCTURAL_CONFIG };
