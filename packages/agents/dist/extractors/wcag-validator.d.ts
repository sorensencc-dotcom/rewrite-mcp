import type { DomModel } from './dom.js';
import type { ComputedStyle } from './playwright-extractor.js';
export type WcagLevel = 'A' | 'AA' | 'AAA';
export type SeverityLevel = 'critical' | 'serious' | 'moderate' | 'minor';
export interface WcagIssue {
    id: string;
    criterion: string;
    level: WcagLevel;
    severity: SeverityLevel;
    element?: string;
    description: string;
    remedy: string;
    affectedElements: string[];
}
export interface WcagAuditResult {
    wcagLevel: WcagLevel;
    targetLevel: WcagLevel;
    issuesFound: WcagIssue[];
    passedTests: number;
    failedTests: number;
    score: number;
    conformance: 'pass' | 'fail' | 'partial';
}
export interface ContrastRatio {
    foreground: string;
    background: string;
    ratio: number;
    meetsAA: boolean;
    meetsAAA: boolean;
}
/**
 * WCAG 2.1 AA compliance validator.
 * Checks: semantic HTML, contrast, images, forms, keyboard access, focus, ARIA.
 */
export declare class WcagValidator {
    private readonly targetLevel;
    private readonly domModel;
    private readonly computedStyles?;
    constructor(domModel: DomModel, computedStyles?: ComputedStyle[], targetLevel?: WcagLevel);
    /**
     * Run full WCAG audit against target level.
     */
    audit(): WcagAuditResult;
    private checkImages;
    private checkContrast;
    private checkKeyboardAccess;
    private checkNavigation;
    private checkReadability;
    private checkPredictability;
    private checkCompatibility;
    private calculateContrastRatio;
    private parseColor;
    private relativeLuminance;
}
