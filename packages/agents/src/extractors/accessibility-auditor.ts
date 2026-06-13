import { WcagValidator, type WcagAuditResult, type WcagLevel } from './wcag-validator.js';
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
export class AccessibilityAuditor {
  /**
   * Run full accessibility audit.
   */
  audit(domModel: DomModel, computedStyles?: ComputedStyle[], targetLevel: WcagLevel = 'AA'): AccessibilityAuditReport {
    const validator = new WcagValidator(domModel, computedStyles, targetLevel);
    const wcagResult = validator.audit();

    const metrics = this.analyzeMetrics(domModel);
    const recommendations = this.generateRecommendations(wcagResult, metrics);
    const prioritizedFixes = this.prioritizeIssues(wcagResult);
    const score = this.calculateAccessibilityScore(wcagResult, metrics);

    return {
      url: domModel.url,
      wcagResult,
      recommendations,
      prioritizedFixes,
      overallAccessibilityScore: score,
      auditedAt: new Date().toISOString(),
    };
  }

  private analyzeMetrics(domModel: DomModel): AccessibilityMetrics {
    const headingHierarchy = new Map<string, number>();
    const landmarkRegions: string[] = [];
    let formFields = 0;
    let interactiveElements = 0;
    let hasFocusIndicators = false;
    let semanticHtmlScore = 0;

    // Count headings
    for (const h of domModel.headings) {
      headingHierarchy.set(h.tag, (headingHierarchy.get(h.tag) ?? 0) + 1);
    }

    // Check for landmarks
    const findLandmarks = (node: any): void => {
      if (['main', 'nav', 'header', 'footer', 'aside', 'article'].includes(node.tag)) {
        landmarkRegions.push(node.tag);
      }
      if (node.attributes['role'] && ['main', 'navigation', 'contentinfo'].includes(node.attributes['role'])) {
        landmarkRegions.push(`[role="${node.attributes['role']}"]`);
      }

      for (const child of node.children) {
        findLandmarks(child);
      }
    };
    findLandmarks(domModel.root);

    // Count form fields and interactive elements
    const countInteractive = (node: any): void => {
      if (['input', 'select', 'textarea'].includes(node.tag)) formFields++;
      if (['button', 'input', 'select', 'textarea', 'a'].includes(node.tag)) interactiveElements++;

      for (const child of node.children) {
        countInteractive(child);
      }
    };
    countInteractive(domModel.root);

    // Check semantic HTML usage
    if (headingHierarchy.size > 0) semanticHtmlScore += 25;
    if (landmarkRegions.length > 0) semanticHtmlScore += 25;
    if (formFields > 0) semanticHtmlScore += 25;
    if (domModel.images.length > 0) semanticHtmlScore += 25;

    return {
      headingHierarchy,
      landmarkRegions: [...new Set(landmarkRegions)],
      formFields,
      interactiveElements,
      hasSkipLinks: false, // Would check in DOM walk
      hasFocusIndicators,
      semanticHtmlScore,
    };
  }

  private generateRecommendations(wcagResult: WcagAuditResult, metrics: AccessibilityMetrics): string[] {
    const recommendations: string[] = [];

    const criticalCount = wcagResult.issuesFound.filter(i => i.severity === 'critical').length;
    const seriousCount = wcagResult.issuesFound.filter(i => i.severity === 'serious').length;

    if (criticalCount > 0) {
      recommendations.push(`Fix ${criticalCount} critical accessibility issues (likely WCAG Level A failures)`);
    }
    if (seriousCount > 0) {
      recommendations.push(`Address ${seriousCount} serious issues (WCAG AA non-conformance)`);
    }

    if (metrics.headingHierarchy.size === 0) {
      recommendations.push('Add proper heading hierarchy (h1, h2, h3) for page structure');
    }
    if (metrics.landmarkRegions.length === 0) {
      recommendations.push('Use semantic landmarks (<main>, <nav>, <footer>) for screen reader navigation');
    }
    if (metrics.semanticHtmlScore < 50) {
      recommendations.push('Improve semantic HTML usage (alt text, labels, proper elements)');
    }
    if (metrics.interactiveElements > 0 && metrics.interactiveElements < 3 && !metrics.hasFocusIndicators) {
      recommendations.push('Ensure visible focus indicators on all interactive elements');
    }

    if (recommendations.length === 0) {
      recommendations.push('Page is WCAG compliant. Continue testing with screen readers and keyboard navigation.');
    }

    return recommendations;
  }

  private prioritizeIssues(
    wcagResult: WcagAuditResult,
  ): Array<{ priority: 'critical' | 'high' | 'medium' | 'low'; count: number; description: string }> {
    const critical = wcagResult.issuesFound.filter(i => i.severity === 'critical');
    const serious = wcagResult.issuesFound.filter(i => i.severity === 'serious');
    const moderate = wcagResult.issuesFound.filter(i => i.severity === 'moderate');
    const minor = wcagResult.issuesFound.filter(i => i.severity === 'minor');

    return [
      critical.length > 0 && {
        priority: 'critical' as const,
        count: critical.length,
        description: `${critical.map(i => i.criterion).join(', ')}`,
      },
      serious.length > 0 && {
        priority: 'high' as const,
        count: serious.length,
        description: `${serious.map(i => i.criterion).join(', ')}`,
      },
      moderate.length > 0 && {
        priority: 'medium' as const,
        count: moderate.length,
        description: `${moderate.map(i => i.criterion).join(', ')}`,
      },
      minor.length > 0 && {
        priority: 'low' as const,
        count: minor.length,
        description: `${minor.map(i => i.criterion).join(', ')}`,
      },
    ].filter(Boolean) as any[];
  }

  private calculateAccessibilityScore(wcagResult: WcagAuditResult, metrics: AccessibilityMetrics): number {
    let score = 100;

    // Deduct for WCAG failures
    const critical = wcagResult.issuesFound.filter(i => i.severity === 'critical').length;
    const serious = wcagResult.issuesFound.filter(i => i.severity === 'serious').length;
    const moderate = wcagResult.issuesFound.filter(i => i.severity === 'moderate').length;

    score -= critical * 15;
    score -= serious * 5;
    score -= moderate * 2;

    // Add bonus for semantic HTML
    score += metrics.semanticHtmlScore * 0.1;

    return Math.max(0, Math.min(100, score));
  }
}
