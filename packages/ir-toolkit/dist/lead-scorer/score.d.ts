/**
 * Lead Scoring Engine
 * Deterministic scoring formula for sales qualification
 */
import type { IRPacket } from '../schemas/ir.types.js';
import type { LeadScoreResult, LeadScoringConfig, ScoringInput } from '../schemas/lead-score.types.js';
export declare class LeadScoringEngine {
    private weights;
    private thresholds;
    constructor(config?: LeadScoringConfig);
    score(input: ScoringInput): LeadScoreResult;
    private calculateFactors;
    private normalizeComplexity;
    private normalizeAudit;
    private normalizeAccessibility;
    private normalizeCompetitive;
    private computeScore;
    private determineTier;
    private estimatePercentile;
    private estimateComplexity;
    private generateSummary;
    private generateInsights;
    private generateRecommendations;
    private nextSteps;
}
export declare function scoreIRPacket(ir: IRPacket, config?: LeadScoringConfig): LeadScoreResult;
