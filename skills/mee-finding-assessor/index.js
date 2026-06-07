/**
 * MEE Finding Assessor Skill (45.4)
 *
 * Assess and score findings from MEE phase execution.
 * Integrates with mee-phase-executor (45.1), cic-benchmark-runner (45.2) for context.
 */

export async function meeFindingAssessor(params) {
  const startTime = Date.now();

  try {
    validateInput(params);

    const {
      findings,
      assessmentContext = {},
      scoringWeights = {},
      batchMode = false,
      returnTopN = 10
    } = params;

    // Normalize scoring weights
    const weights = normalizeWeights(scoringWeights);

    // Assess each finding
    const assessedFindings = findings.map((finding, index) => {
      const baseScore = computeBaseScore(finding, weights);
      const contextBoost = computeContextBoost(finding, assessmentContext);
      const finalScore = Math.min(1, baseScore * (1 + contextBoost));

      return {
        ...finding,
        assessment: {
          baseScore: parseFloat(baseScore.toFixed(3)),
          contextBoost: parseFloat(contextBoost.toFixed(3)),
          finalScore: parseFloat(finalScore.toFixed(3)),
          rank: index + 1,
          recommendation: generateRecommendation(finding, finalScore),
          rationale: generateRationale(finding, weights, contextBoost)
        }
      };
    });

    // Sort by final score
    assessedFindings.sort((a, b) => b.assessment.finalScore - a.assessment.finalScore);

    // Update ranks after sorting
    assessedFindings.forEach((f, idx) => {
      f.assessment.rank = idx + 1;
    });

    // Select top N if requested
    const selectedFindings = assessedFindings.slice(0, returnTopN);

    // Compute summary statistics
    const summary = computeSummary(assessedFindings, selectedFindings);

    const elapsed = Date.now() - startTime;

    return {
      success: true,
      assessmentId: generateAssessmentId(),
      findings: selectedFindings,
      skippedFindings: assessedFindings.length - selectedFindings.length,
      summary,
      stats: {
        averageScore: (selectedFindings.reduce((sum, f) => sum + f.assessment.finalScore, 0) / selectedFindings.length).toFixed(3),
        topScore: selectedFindings[0]?.assessment.finalScore || 0,
        lowScore: selectedFindings[selectedFindings.length - 1]?.assessment.finalScore || 0,
        recommendCount: selectedFindings.filter(f => f.assessment.recommendation === 'approve').length,
        rejectCount: selectedFindings.filter(f => f.assessment.recommendation === 'reject').length,
        reviewCount: selectedFindings.filter(f => f.assessment.recommendation === 'review').length
      },
      elapsedMs: elapsed
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      assessmentId: 'error-' + generateAssessmentId().split('-')[1],
      elapsedMs: Date.now() - startTime
    };
  }
}

/**
 * Validate input parameters
 */
function validateInput(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('params must be an object');
  }

  if (!params.findings || !Array.isArray(params.findings) || params.findings.length === 0) {
    throw new Error('findings must be a non-empty array');
  }

  if (params.findings.length > 100) {
    throw new Error('findings array cannot exceed 100 items');
  }

  params.findings.forEach((f, idx) => {
    if (!f.id || typeof f.id !== 'string') {
      throw new Error(`finding[${idx}]: id must be a non-empty string`);
    }
    if (!f.type || !['optimization', 'refactor', 'bug', 'feature', 'performance'].includes(f.type)) {
      throw new Error(`finding[${idx}]: type must be one of optimization|refactor|bug|feature|performance`);
    }
    if (f.confidence === undefined || f.confidence < 0 || f.confidence > 1) {
      throw new Error(`finding[${idx}]: confidence must be between 0 and 1`);
    }
    if (f.impact === undefined || f.impact < 0 || f.impact > 1) {
      throw new Error(`finding[${idx}]: impact must be between 0 and 1`);
    }
  });

  if (params.returnTopN && (params.returnTopN < 1 || params.returnTopN > 50)) {
    throw new Error('returnTopN must be between 1 and 50');
  }
}

/**
 * Normalize and validate scoring weights
 */
function normalizeWeights(customWeights) {
  const defaults = {
    confidenceWeight: 0.3,
    impactWeight: 0.4,
    effortWeight: 0.3
  };

  const weights = { ...defaults, ...customWeights };

  // Normalize to sum to 1
  const sum = weights.confidenceWeight + weights.impactWeight + weights.effortWeight;
  if (sum > 0) {
    weights.confidenceWeight /= sum;
    weights.impactWeight /= sum;
    weights.effortWeight /= sum;
  }

  return weights;
}

/**
 * Compute base score from finding attributes
 */
function computeBaseScore(finding, weights) {
  const confidenceScore = finding.confidence || 0.5;
  const impactScore = finding.impact || 0.5;
  const effortScore = finding.effort ? Math.max(0, 1 - (finding.effort / 100)) : 0.5;

  return (
    confidenceScore * weights.confidenceWeight +
    impactScore * weights.impactWeight +
    effortScore * weights.effortWeight
  );
}

/**
 * Apply context-based scoring boost
 */
function computeContextBoost(finding, context) {
  let boost = 0;

  if (!context || typeof context !== 'object') {
    return boost;
  }

  // Priority level boost
  if (context.priorityLevel) {
    const priorityBoost = {
      critical: 0.3,
      high: 0.2,
      medium: 0.1,
      low: 0
    };
    boost += priorityBoost[context.priorityLevel] || 0;
  }

  // Type-based boost (bugs and critical fixes get priority)
  if (finding.type === 'bug') {
    boost += 0.15;
  } else if (finding.type === 'performance') {
    boost += 0.1;
  }

  // Budget constraint (lower effort findings get boost)
  if (context.budgetRemaining && finding.effort) {
    if (finding.effort < context.budgetRemaining * 10) {
      boost += 0.1;
    }
  }

  return Math.min(0.5, boost); // Cap boost at 0.5
}

/**
 * Generate recommendation based on assessment
 */
function generateRecommendation(finding, score) {
  if (score >= 0.75) {
    return 'approve';
  } else if (score >= 0.5) {
    return 'review';
  } else {
    return 'reject';
  }
}

/**
 * Generate rationale for recommendation
 */
function generateRationale(finding, weights, contextBoost) {
  const parts = [];

  if (finding.confidence > 0.8) {
    parts.push('High confidence in finding');
  } else if (finding.confidence < 0.3) {
    parts.push('Low confidence in finding');
  }

  if (finding.impact > 0.8) {
    parts.push('Significant impact potential');
  }

  if (finding.effort && finding.effort < 20) {
    parts.push('Low effort to implement');
  } else if (finding.effort && finding.effort > 80) {
    parts.push('High effort required');
  }

  if (contextBoost > 0) {
    parts.push(`Context boost applied (+${(contextBoost * 100).toFixed(0)}%)`);
  }

  return parts.length > 0 ? parts.join('; ') : 'Standard assessment applied';
}

/**
 * Compute summary statistics
 */
function computeSummary(allFindings, selectedFindings) {
  const typeBreakdown = {};
  const recommendationBreakdown = {
    approve: 0,
    review: 0,
    reject: 0
  };

  selectedFindings.forEach(f => {
    // Type breakdown
    typeBreakdown[f.type] = (typeBreakdown[f.type] || 0) + 1;

    // Recommendation breakdown
    if (recommendationBreakdown.hasOwnProperty(f.assessment.recommendation)) {
      recommendationBreakdown[f.assessment.recommendation]++;
    }
  });

  const highConfidenceCount = selectedFindings.filter(f => f.assessment.finalScore >= 0.75).length;
  const implementationPath = generateImplementationPath(selectedFindings);

  return {
    totalAssessed: allFindings.length,
    totalSelected: selectedFindings.length,
    typeBreakdown,
    recommendationBreakdown,
    highConfidenceCount,
    suggestedPhasing: implementationPath,
    nextActions: generateNextActions(selectedFindings)
  };
}

/**
 * Generate phased implementation path
 */
function generateImplementationPath(findings) {
  const phases = {
    phase1: { maxEffort: 20, findings: [] },
    phase2: { maxEffort: 50, findings: [] },
    phase3: { maxEffort: Infinity, findings: [] }
  };

  findings
    .filter(f => f.assessment.recommendation === 'approve')
    .forEach(f => {
      const effort = f.effort || 30;
      if (effort <= 20) {
        phases.phase1.findings.push(f.id);
      } else if (effort <= 50) {
        phases.phase2.findings.push(f.id);
      } else {
        phases.phase3.findings.push(f.id);
      }
    });

  return phases;
}

/**
 * Generate next action recommendations
 */
function generateNextActions(findings) {
  const actions = [];

  const toApprove = findings.filter(f => f.assessment.recommendation === 'approve');
  if (toApprove.length > 0) {
    actions.push(`Approve and implement ${toApprove.length} high-confidence finding(s)`);
  }

  const toReview = findings.filter(f => f.assessment.recommendation === 'review');
  if (toReview.length > 0) {
    actions.push(`Review ${toReview.length} finding(s) with human decision-maker`);
  }

  const bugs = findings.filter(f => f.type === 'bug' && f.assessment.recommendation === 'approve');
  if (bugs.length > 0) {
    actions.push(`Prioritize ${bugs.length} bug fix(es) for immediate implementation`);
  }

  const perf = findings.filter(f => f.type === 'performance' && f.assessment.finalScore >= 0.75);
  if (perf.length > 0) {
    actions.push(`Consider performance improvements: ${perf.map(p => p.id).join(', ')}`);
  }

  return actions.length > 0 ? actions : ['Review findings and determine next implementation phase'];
}

/**
 * Generate unique assessment ID
 */
function generateAssessmentId() {
  return `assess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
