/**
 * Lead Scoring Engine
 * Deterministic scoring formula for sales qualification
 */

import type {
  IRPacket,
  ComplexityScore,
  AuditResult,
  AccessibilityAudit,
  ComparisonGap
} from '../schemas/ir.types.js';
import type {
  LeadScoreResult,
  LeadScoringConfig,
  ScoringInput,
  LeadScoreFactor,
  LeadScoreFactors
} from '../schemas/lead-score.types.js';

const DEFAULT_WEIGHTS = {
  complexity: 0.35,
  audit: 0.30,
  accessibility: 0.20,
  competitive: 0.15
};

const DEFAULT_THRESHOLDS = {
  A: 80,
  B: 60,
  C: 40,
  D: 0
};

export class LeadScoringEngine {
  private weights: typeof DEFAULT_WEIGHTS;
  private thresholds: typeof DEFAULT_THRESHOLDS;

  constructor(config?: LeadScoringConfig) {
    this.weights = { ...DEFAULT_WEIGHTS, ...config?.weights };
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...config?.thresholds };

    // Validate weights sum to ~1.0
    const weightSum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      throw new Error(
        `Weights must sum to 1.0, got ${weightSum.toFixed(2)}`
      );
    }
  }

  score(input: ScoringInput): LeadScoreResult {
    const factors = this.calculateFactors(input);
    const finalScore = this.computeScore(factors);
    const tier = this.determineTier(finalScore);
    const percentile = this.estimatePercentile(finalScore);

    return {
      score: Math.round(finalScore),
      tier,
      percentile,
      factors,
      summary: this.generateSummary(finalScore, tier, input),
      insights: this.generateInsights(input, factors),
      recommendations: this.generateRecommendations(tier, input),
      salesReady: finalScore >= this.thresholds.A,
      estimatedComplexity: this.estimateComplexity(input),
      nextSteps: this.nextSteps(tier, input)
    };
  }

  private calculateFactors(input: ScoringInput): LeadScoreFactors {
    const complexityScore = this.normalizeComplexity(input.complexity);
    const auditScore = this.normalizeAudit(input.audit);
    const accessibilityScore = this.normalizeAccessibility(input.accessibility);
    const competitiveScore = input.competitive
      ? this.normalizeCompetitive(input.competitive)
      : 50;

    return {
      complexity: {
        value: complexityScore,
        weight: this.weights.complexity,
        contribution: complexityScore * this.weights.complexity
      },
      audit: {
        value: auditScore,
        weight: this.weights.audit,
        contribution: auditScore * this.weights.audit
      },
      accessibility: {
        value: accessibilityScore,
        weight: this.weights.accessibility,
        contribution: accessibilityScore * this.weights.accessibility
      },
      ...(input.competitive && {
        competitive: {
          value: competitiveScore,
          weight: this.weights.competitive,
          contribution: competitiveScore * this.weights.competitive
        }
      })
    };
  }

  private normalizeComplexity(complexity: ComplexityScore): number {
    // Normalize complexity score to 0-100 scale
    // Higher complexity = higher score (more opportunity)
    const score = Math.min(100, complexity.score * 1.2);
    return score;
  }

  private normalizeAudit(audit: AuditResult): number {
    // Convert audit issues to score
    // More issues = lower score (pain point indicator)
    const maxIssues = 50;
    const issueScore = Math.max(0, 100 - (audit.total / maxIssues) * 100);

    // Severity multiplier
    const severityMultiplier = {
      critical: 0.5,
      high: 0.7,
      medium: 0.85,
      low: 0.95
    };

    const multiplier = severityMultiplier[audit.severity] || 0.85;
    return issueScore * multiplier;
  }

  private normalizeAccessibility(accessibility: AccessibilityAudit): number {
    // Use built-in score directly
    // Accessibility debt is a strong signal
    return accessibility.score;
  }

  private normalizeCompetitive(gaps: ComparisonGap[]): number {
    // Score based on competitive gap analysis
    if (gaps.length === 0) return 50;

    const criticalGaps = gaps.filter(g => g.severity === 'high').length;
    const mediumGaps = gaps.filter(g => g.severity === 'medium').length;
    const lowGaps = gaps.filter(g => g.severity === 'low').length;

    // Gaps are opportunities
    const gapScore = (criticalGaps * 10) + (mediumGaps * 5) + (lowGaps * 1);
    return Math.min(100, gapScore * 2);
  }

  private computeScore(factors: LeadScoreFactors): number {
    return (
      factors.complexity.contribution +
      factors.audit.contribution +
      factors.accessibility.contribution +
      (factors.competitive?.contribution || 0)
    );
  }

  private determineTier(score: number): 'A' | 'B' | 'C' | 'D' {
    if (score >= this.thresholds.A) return 'A';
    if (score >= this.thresholds.B) return 'B';
    if (score >= this.thresholds.C) return 'C';
    return 'D';
  }

  private estimatePercentile(score: number): number {
    // Rough percentile estimation
    // Assumes normal distribution around 50
    return Math.round((score / 100) * 100);
  }

  private estimateComplexity(input: ScoringInput): 'low' | 'medium' | 'high' | 'enterprise' {
    const score = input.complexity.score;
    if (score < 25) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'enterprise';
  }

  private generateSummary(score: number, tier: string, input: ScoringInput): string {
    const complexity = input.complexity.score;
    const issues = input.audit.total;
    const wcagIssues = input.accessibility.failedTests;

    const summaryByTier = {
      A: `Excellent opportunity. High complexity (${complexity}/100), ${issues} audit issues, ${wcagIssues} WCAG gaps. Ready for sales conversation.`,
      B: `Strong prospect. Medium-high complexity, meaningful improvement opportunities in design and accessibility.`,
      C: `Moderate opportunity. Low-medium complexity, limited pain points but potential for growth.`,
      D: `Low priority. Minimal complexity or issues. Only pursue if part of strategic initiative.`
    };

    return summaryByTier[tier as keyof typeof summaryByTier] || '';
  }

  private generateInsights(input: ScoringInput, factors: LeadScoreFactors): string[] {
    const insights: string[] = [];

    if (factors.complexity.value > 70) {
      insights.push('High technical complexity indicates significant redesign scope');
    }

    if (factors.audit.value < 50) {
      insights.push('Multiple design/structural issues present strong value proposition');
    }

    if (factors.accessibility.value < 60) {
      insights.push('Accessibility debt is a compliance risk and market differentiator');
    }

    if (input.competitive && input.competitive.length > 3) {
      insights.push('Competitive analysis shows multiple gaps against best-in-class');
    }

    return insights;
  }

  private generateRecommendations(tier: string, input: ScoringInput): string[] {
    const recommendations: string[] = [];

    if (tier === 'A' || tier === 'B') {
      recommendations.push('Prepare preview gallery with before/after comparisons');
      recommendations.push('Build custom pricing estimate based on component inventory');
      recommendations.push('Prioritize founder outreach');
    }

    if (input.audit.total > 20) {
      recommendations.push('Lead with audit findings in initial pitch');
    }

    if (input.accessibility.score < 70) {
      recommendations.push('Emphasize accessibility as compliance + market advantage');
    }

    return recommendations;
  }

  private nextSteps(tier: string, input: ScoringInput): string[] {
    if (tier === 'A') {
      return [
        '1. Generate preview gallery',
        '2. Calculate pricing estimate',
        '3. Schedule founder call',
        '4. Present personalized deck'
      ];
    }

    if (tier === 'B') {
      return [
        '1. Send audit report',
        '2. Prepare pricing estimate',
        '3. Queue for outreach'
      ];
    }

    return ['1. Add to nurture campaign', '2. Check in quarterly'];
  }
}

export function scoreIRPacket(
  ir: IRPacket,
  config?: LeadScoringConfig
): LeadScoreResult {
  const engine = new LeadScoringEngine(config);

  const input: ScoringInput = {
    complexity: {
      score: ir.metrics?.averageComplexity || 50,
      factors: {
        componentDiversity: ir.components.length,
        routeDepth: ir.routes.length,
        assetCount: ir.assets.total,
        stateVariations: ir.components.reduce(
          (sum, c) => sum + (c.states?.length || 0),
          0
        )
      }
    },
    audit: {
      issues: [],
      severity: 'medium',
      total: 0
    },
    accessibility: {
      wcagLevel: 'AA',
      issues: [],
      passedTests: 0,
      failedTests: ir.metrics?.accessibility?.wcagIssues || 0,
      score: Math.max(0, 100 - (ir.metrics?.accessibility?.wcagIssues || 0) * 5)
    },
    competitive: []
  };

  return engine.score(input);
}
