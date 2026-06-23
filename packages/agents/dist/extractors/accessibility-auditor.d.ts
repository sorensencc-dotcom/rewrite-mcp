import { type WcagAuditResult, type WcagLevel } from './wcag-validator.js';
import type { DomModel } from './dom.js';
import type { ComputedStyle } from './playwright-extractor.js';
export interface AccessibilityAuditReport {
    url: string;
    wcagResult: WcagAuditResult;
    recommendations: string[];
    prioritizedFixes: Array<{
        priority: 'critical' | 'high' | 'medium' | 'low';
        count: number;
        description: string;
    }>;
    overallAccessibilityScore: number;
    auditedAt: string;
}
export interface AccessibilityMetrics {
    headingHierarchy: Map<string, number>;
    landmarkRegions: string[];
    formFields: number;
    interactiveElements: number;
    hasSkipLinks: boolean;
    hasFocusIndicators: boolean;
    semanticHtmlScore: number;
}
/**
 * Comprehensive accessibility auditor combining WCAG, semantic HTML, and usability checks.
 */
export declare class AccessibilityAuditor {
    /**
     * Run full accessibility audit.
     */
    audit(domModel: DomModel, computedStyles?: ComputedStyle[], targetLevel?: WcagLevel): AccessibilityAuditReport;
    private analyzeMetrics;
    private generateRecommendations;
    private prioritizeIssues;
    private calculateAccessibilityScore;
}
