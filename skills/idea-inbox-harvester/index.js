/**
 * Idea Inbox Harvester Skill (45.6)
 *
 * Harvest findings into idea store with deduplication and CKG integration.
 * Feeds idea-inbox-harvester → ckg-store (Contextual Knowledge Graph).
 */

export async function ideaInboxHarvester(params) {
  const startTime = Date.now();

  try {
    validateInput(params);

    const {
      findings,
      context = {},
      deduplicateMode = 'semantic',
      priorityThreshold = 0.6,
      storeInCKG = true,
      generateDashboard = false
    } = params;

    // Deduplicate findings
    const dedupedFindings = deduplicateFindings(findings, deduplicateMode);
    const dedupStats = {
      original: findings.length,
      deduplicated: dedupedFindings.length,
      removed: findings.length - dedupedFindings.length
    };

    // Sort into priority tiers
    const { inbox, archive } = prioritizeFindings(dedupedFindings, priorityThreshold);

    // Enrich with metadata
    const enrichedIdeas = inbox.map((finding, idx) => ({
      id: `idea-${Date.now()}-${idx}`,
      foundingId: finding.id,
      title: finding.title,
      description: finding.description,
      type: finding.type || 'general',
      score: finding.assessment?.finalScore || 0,
      recommendation: finding.assessment?.recommendation || 'review',
      metadata: {
        createdAt: new Date().toISOString(),
        source: context.source || 'automated',
        executionId: context.executionId,
        tags: context.tags || [],
        status: 'inbox'
      }
    }));

    // Store in CKG if enabled
    let ckgStats = { stored: 0, failed: 0 };
    if (storeInCKG) {
      ckgStats = await storeToCKG(enrichedIdeas);
    }

    // Generate dashboard if requested
    let dashboard = null;
    if (generateDashboard) {
      dashboard = generateIdeaDashboard(enrichedIdeas, dedupStats);
    }

    const elapsed = Date.now() - startTime;

    return {
      success: true,
      harvestId: generateHarvestId(),
      ideas: enrichedIdeas,
      stats: {
        totalProcessed: findings.length,
        inboxCount: inbox.length,
        archiveCount: archive.length,
        deduplication: dedupStats,
        ckgStorage: ckgStats,
        duplicateDetectionRate: dedupStats.removed / Math.max(1, findings.length)
      },
      dashboard,
      elapsedMs: elapsed
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      harvestId: 'error-' + generateHarvestId().split('-')[1],
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

  if (!params.findings || !Array.isArray(params.findings)) {
    throw new Error('findings must be an array');
  }

  if (params.findings.length > 100) {
    throw new Error('findings array cannot exceed 100 items');
  }

  params.findings.forEach((f, idx) => {
    if (!f.id || typeof f.id !== 'string') {
      throw new Error(`finding[${idx}]: id is required and must be a string`);
    }
    if (!f.title || typeof f.title !== 'string') {
      throw new Error(`finding[${idx}]: title is required and must be a string`);
    }
  });

  if (params.priorityThreshold && (params.priorityThreshold < 0 || params.priorityThreshold > 1)) {
    throw new Error('priorityThreshold must be between 0 and 1');
  }

  if (params.deduplicateMode && !['off', 'exact', 'semantic'].includes(params.deduplicateMode)) {
    throw new Error('deduplicateMode must be off|exact|semantic');
  }
}

/**
 * Deduplicate findings using specified strategy
 */
function deduplicateFindings(findings, mode) {
  if (mode === 'off') {
    return findings;
  }

  const seen = new Set();
  const deduped = [];

  findings.forEach(finding => {
    let key;

    if (mode === 'exact') {
      // Exact match on title
      key = finding.title.toLowerCase().trim();
    } else if (mode === 'semantic') {
      // Semantic match: first 3 words of title + type
      const titleWords = finding.title.toLowerCase().trim().split(/\s+/).slice(0, 3).join(' ');
      key = `${finding.type || 'general'}::${titleWords}`;
    }

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(finding);
    }
  });

  return deduped;
}

/**
 * Prioritize findings into inbox vs archive
 */
function prioritizeFindings(findings, threshold) {
  const inbox = [];
  const archive = [];

  findings.forEach(finding => {
    const score = finding.assessment?.finalScore || 0;
    if (score >= threshold) {
      inbox.push(finding);
    } else {
      archive.push(finding);
    }
  });

  // Sort inbox by score descending
  inbox.sort((a, b) => (b.assessment?.finalScore || 0) - (a.assessment?.finalScore || 0));

  return { inbox, archive };
}

/**
 * Store ideas in CKG (simulated for now, would use real CKG API in production)
 */
async function storeToCKG(ideas) {
  try {
    // In production, would call actual CKG store API
    // For now, simulate successful storage
    const stored = ideas.length;
    return {
      stored,
      failed: 0,
      cygraph: `ckg://ideas/${Date.now()}/batch`
    };
  } catch (error) {
    return {
      stored: 0,
      failed: ideas.length,
      error: error.message
    };
  }
}

/**
 * Generate idea management dashboard
 */
function generateIdeaDashboard(ideas, dedupStats) {
  const typeBreakdown = {};
  const recommendationBreakdown = { approve: 0, review: 0, reject: 0 };
  const scoreDistribution = { high: 0, medium: 0, low: 0 };

  ideas.forEach(idea => {
    // Type breakdown
    typeBreakdown[idea.type] = (typeBreakdown[idea.type] || 0) + 1;

    // Recommendation breakdown
    if (recommendationBreakdown.hasOwnProperty(idea.recommendation)) {
      recommendationBreakdown[idea.recommendation]++;
    }

    // Score distribution
    if (idea.score >= 0.75) scoreDistribution.high++;
    else if (idea.score >= 0.5) scoreDistribution.medium++;
    else scoreDistribution.low++;
  });

  const avgScore = ideas.length > 0 ? ideas.reduce((sum, i) => sum + i.score, 0) / ideas.length : 0;

  return {
    title: 'Idea Harvest Dashboard',
    harvestedAt: new Date().toISOString(),
    totalIdeas: ideas.length,
    avgScore: parseFloat(avgScore.toFixed(3)),
    typeBreakdown,
    recommendationBreakdown,
    scoreDistribution,
    deduplicationSummary: dedupStats,
    insights: generateInsights(ideas, dedupStats, typeBreakdown),
    nextSteps: generateNextSteps(ideas, recommendationBreakdown)
  };
}

/**
 * Generate analytical insights from harvested ideas
 */
function generateInsights(ideas, dedupStats, typeBreakdown) {
  const insights = [];

  if (dedupStats.removed > 0) {
    const dedupRate = ((dedupStats.removed / dedupStats.original) * 100).toFixed(1);
    insights.push(`Found ${dedupStats.removed} duplicates (${dedupRate}% of input)`);
  }

  const topType = Object.entries(typeBreakdown).sort(([, a], [, b]) => b - a)[0];
  if (topType) {
    insights.push(`Most common type: ${topType[0]} (${topType[1]} ideas)`);
  }

  const approveCount = ideas.filter(i => i.recommendation === 'approve').length;
  if (approveCount > 0) {
    insights.push(`${approveCount} ideas ready for immediate implementation`);
  }

  const highScoreCount = ideas.filter(i => i.score >= 0.75).length;
  if (highScoreCount > 0) {
    insights.push(`${highScoreCount} high-confidence ideas (score ≥ 0.75)`);
  }

  return insights.length > 0 ? insights : ['Standard idea harvest completed'];
}

/**
 * Generate actionable next steps
 */
function generateNextSteps(ideas, recommendations) {
  const steps = [];

  if (recommendations.approve > 0) {
    steps.push(`Implement ${recommendations.approve} pre-approved ideas`);
  }

  if (recommendations.review > 0) {
    steps.push(`Review and prioritize ${recommendations.review} ideas with stakeholders`);
  }

  if (ideas.length > 10) {
    steps.push('Consider phasing implementation over multiple sprints');
  }

  if (ideas.some(i => i.type === 'bug')) {
    steps.push('Schedule bug fixes as highest priority');
  }

  return steps.length > 0 ? steps : ['Review harvested ideas and plan next phase'];
}

/**
 * Generate unique harvest ID
 */
function generateHarvestId() {
  return `harvest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
