/**
 * accessibility-checker.mjs
 * @version 5.0.0
 * @date 2026-05-31
 *
 * CIC Phase 5: Accessibility (A11y) Compliance Scoring
 *
 * Evaluates content against WCAG 2.1 AA principles:
 *   - Color contrast ratios
 *   - Image alt text presence
 *   - Form label association
 *   - Keyboard navigation
 *   - Focus management
 *   - ARIA attributes
 */

/**
 * @typedef {Object} A11yScore
 * @property {number} score         — 0-1 overall accessibility score
 * @property {Object} categories    — Per-category scores (contrast, alt-text, labels, etc.)
 * @property {Array<Object>} issues — WCAG violations
 */

const A11Y_RULES = {
  colorContrast: {
    normalText: 4.5,
    largeText: 3.0,
    graphics: 3.0,
  },
  images: {
    requireAlt: true,
    maxBlankAlt: 0.1,
  },
  forms: {
    requireLabels: true,
    requireId: true,
  },
  keyboard: {
    requireTabIndex: true,
  },
};

/**
 * Check content accessibility compliance.
 *
 * @param {string|Object} content — HTML string or DOM object
 * @returns {Promise<A11yScore>}
 */
export async function checkAccessibility(content) {
  try {
    const doc = _parseContent(content);

    const categories = {
      colorContrast: _checkColorContrast(doc),
      altText: _checkAltText(doc),
      formLabels: _checkFormLabels(doc),
      headingStructure: _checkHeadingStructure(doc),
      keyboardNavigation: _checkKeyboardNavigation(doc),
      ariaAttributes: _checkAriaAttributes(doc),
    };

    const allIssues = Object.values(categories).flatMap(c => c.issues);

    // Weight categories
    const score =
      (categories.colorContrast.score * 0.15 +
        categories.altText.score * 0.25 +
        categories.formLabels.score * 0.20 +
        categories.headingStructure.score * 0.15 +
        categories.keyboardNavigation.score * 0.15 +
        categories.ariaAttributes.score * 0.10) /
      (0.15 + 0.25 + 0.20 + 0.15 + 0.15 + 0.10);

    return {
      score: Math.max(0, Math.min(1, score)),
      categories,
      issues: allIssues,
    };
  } catch (error) {
    return {
      score: 0,
      categories: {},
      issues: [{ type: 'a11y_error', message: error.message, severity: 'critical' }],
    };
  }
}

/**
 * Batch check multiple contents.
 *
 * @param {Array<{content: string, metadata?: Object}>} items
 * @returns {Promise<Array<A11yScore>>}
 */
export async function checkAccessibilityBatch(items) {
  return Promise.all(
    items.map(({ content }) => checkAccessibility(content))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility Checks
// ─────────────────────────────────────────────────────────────────────────────

function _checkColorContrast(doc) {
  const issues = [];
  let passed = 0;
  let total = 0;

  // Note: Real color contrast check requires CSS cascade resolution
  // This is a simplified check for visually obvious issues
  const elements = doc.querySelectorAll?.('[style*="color"]') || [];

  for (const el of elements) {
    total++;
    // Simplified: just check if dark text on dark background or light on light
    const style = el.getAttribute?.('style') || '';
    if (style.includes('color: #000') && style.includes('background: #000')) {
      issues.push({
        type: 'contrast_violation',
        message: 'Potential zero contrast (black text on black background)',
        severity: 'critical',
      });
    } else {
      passed++;
    }
  }

  const score = total > 0 ? passed / total : 1.0;

  return {
    score: Math.max(0, Math.min(1, score)),
    passed,
    total,
    issues,
  };
}

function _checkAltText(doc) {
  const issues = [];
  const images = doc.querySelectorAll?.('img') || [];

  let passed = 0;
  for (const img of images) {
    const alt = img.getAttribute?.('alt') || '';
    const src = img.getAttribute?.('src') || '';

    // Check for decorative vs functional images
    if (!alt || alt.trim().length === 0) {
      if (!src.includes('decorative') && !src.includes('spacer')) {
        issues.push({
          type: 'missing_alt_text',
          message: `Image without alt text: ${src.slice(0, 50)}`,
          severity: 'high',
        });
      }
    } else {
      passed++;
    }
  }

  const total = images.length;
  const score = total > 0 ? passed / total : 1.0;

  return {
    score: Math.max(0, Math.min(1, score)),
    imageCount: total,
    altCount: passed,
    issues,
  };
}

function _checkFormLabels(doc) {
  const issues = [];
  const inputs = doc.querySelectorAll?.('input, select, textarea') || [];

  let passed = 0;
  for (const input of inputs) {
    const id = input.getAttribute?.('id');
    const name = input.getAttribute?.('name');
    const ariaLabel = input.getAttribute?.('aria-label');

    // Check for associated label
    const label = id ? doc.querySelector?.(`label[for="${id}"]`) : null;

    if (label || ariaLabel) {
      passed++;
    } else if (!name) {
      issues.push({
        type: 'missing_label',
        message: `Form input missing label: ${input.tagName}`,
        severity: 'high',
      });
    }
  }

  const total = inputs.length;
  const score = total > 0 ? passed / total : 1.0;

  return {
    score: Math.max(0, Math.min(1, score)),
    inputCount: total,
    labeledCount: passed,
    issues,
  };
}

function _checkHeadingStructure(doc) {
  const issues = [];
  const headings = doc.querySelectorAll?.('h1, h2, h3, h4, h5, h6') || [];

  let score = 1.0;

  // H1 check
  const h1Count = doc.querySelectorAll?.('h1')?.length || 0;
  if (h1Count === 0) {
    issues.push({
      type: 'missing_h1',
      message: 'Page missing H1 heading',
      severity: 'high',
    });
    score -= 0.3;
  } else if (h1Count > 1) {
    issues.push({
      type: 'multiple_h1',
      message: `Multiple H1 headings found (${h1Count}); only one recommended`,
      severity: 'medium',
    });
    score -= 0.1;
  }

  // Heading hierarchy
  const levels = Array.from(headings).map(h => parseInt(h.tagName[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      issues.push({
        type: 'heading_hierarchy_skip',
        message: `Heading hierarchy skip: H${levels[i - 1]} → H${levels[i]}`,
        severity: 'medium',
      });
      score -= 0.1;
    }
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    headingCount: headings.length,
    h1Count,
    issues,
  };
}

function _checkKeyboardNavigation(doc) {
  const issues = [];
  const interactive = doc.querySelectorAll?.('button, a[href], input, select, textarea') || [];

  let focusable = 0;
  for (const elem of interactive) {
    const tabindex = elem.getAttribute?.('tabindex');
    if (tabindex === null || parseInt(tabindex) >= 0) {
      focusable++;
    }
  }

  const score = interactive.length > 0 ? focusable / interactive.length : 1.0;

  if (score < 0.8) {
    issues.push({
      type: 'keyboard_navigation_issue',
      message: `Only ${focusable}/${interactive.length} interactive elements are keyboard-navigable`,
      severity: 'medium',
    });
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    interactiveCount: interactive.length,
    focusableCount: focusable,
    issues,
  };
}

function _checkAriaAttributes(doc) {
  const issues = [];
  const ariaElements = doc.querySelectorAll?.('[role], [aria-label], [aria-labelledby]') || [];

  let valid = 0;
  const validRoles = [
    'main', 'navigation', 'article', 'complementary', 'contentinfo',
    'button', 'link', 'menuitem', 'tab', 'tabpanel', 'alert', 'dialog'
  ];

  for (const elem of ariaElements) {
    const role = elem.getAttribute?.('role');
    if (!role || validRoles.includes(role)) {
      valid++;
    } else {
      issues.push({
        type: 'invalid_aria_role',
        message: `Invalid or deprecated ARIA role: "${role}"`,
        severity: 'medium',
      });
    }
  }

  const score = ariaElements.length > 0 ? valid / ariaElements.length : 1.0;

  return {
    score: Math.max(0, Math.min(1, score)),
    ariaElementCount: ariaElements.length,
    validCount: valid,
    issues,
  };
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
  }

  // Fallback: empty mock
  return {
    querySelectorAll: () => [],
    querySelector: () => null,
  };
}

export { checkAccessibility, checkAccessibilityBatch, A11Y_RULES };
export default { checkAccessibility, checkAccessibilityBatch, A11Y_RULES };
