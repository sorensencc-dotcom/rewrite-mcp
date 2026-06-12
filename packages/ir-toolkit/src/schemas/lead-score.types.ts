/**
 * Lead Scoring Schema v1.0.0
 * Sales intelligence layer for Rewrite Labs
 */

import type { ComplexityScore, AuditResult, AccessibilityAudit, ComparisonGap } from './ir.types.js';

export type LeadTier = 'A' | 'B' | 'C' | 'D';

export interface LeadScoreFactor {
  value: number;
  weight: number;
  contribution: number;
}

export interface LeadScoreFactors {
  complexity: LeadScoreFactor;
  audit: LeadScoreFactor;
  accessibility: LeadScoreFactor;
  competitive?: LeadScoreFactor;
}

export interface LeadScoreResult {
  score: number; // 0-100
  tier: LeadTier;
  percentile: number;
  factors: LeadScoreFactors;
  summary: string;
  insights: string[];
  recommendations: string[];
  salesReady: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high' | 'enterprise';
  nextSteps: string[];
}

export interface LeadScoringConfig {
  weights?: {
    complexity?: number;
    audit?: number;
    accessibility?: number;
    competitive?: number;
  };
  thresholds?: {
    A?: number;
    B?: number;
    C?: number;
    D?: number;
  };
  customFactors?: Record<string, (ir: any) => number>;
}

export interface ScoringInput {
  complexity: ComplexityScore;
  audit: AuditResult;
  accessibility: AccessibilityAudit;
  competitive?: ComparisonGap[];
}
