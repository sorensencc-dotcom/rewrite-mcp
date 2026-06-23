/**
 * IR (Intermediate Representation) Schema v1.0.0
 * Canonical format for website extraction, audit, and redesign
 */
export interface DesignTokens {
    colors?: Record<string, string>;
    spacing?: Record<string, string>;
    typography?: Record<string, unknown>;
    radii?: Record<string, string>;
    shadows?: Record<string, string>;
    zIndex?: Record<string, number>;
    transitions?: Record<string, string>;
}
export interface ComponentSpec {
    id: string;
    name: string;
    type: string;
    usageCount: number;
    breakpoints?: string[];
    states?: string[];
    assets?: string[];
    complexity?: number;
}
export interface RouteInfo {
    path: string;
    title?: string;
    componentIds: string[];
    assetCount: number;
    complexity?: number;
}
export interface CssRule {
    selector: string;
    properties: Record<string, string>;
    specificity: number;
}
export interface StyleSheetInfo {
    rules: CssRule[];
    fonts: string[];
    variables: Record<string, string>;
}
export interface CssMetrics {
    totalSelectors: number;
    uniqueClasses: number;
    uniqueIds: number;
    colorCount: number;
    fontFamilies: string[];
    breakpoints: string[];
    transitionCount: number;
    animationCount: number;
}
export interface IRPacket {
    version: string;
    meta: {
        url: string;
        captureDate: string;
        toolVersion: string;
    };
    designTokens: DesignTokens;
    routes: RouteInfo[];
    components: ComponentSpec[];
    assets: {
        images: number;
        videos: number;
        svgs: number;
        total: number;
    };
    styleSheet?: StyleSheetInfo;
    cssMetrics?: CssMetrics;
    metrics?: {
        totalComponentCount: number;
        totalRouteCount: number;
        averageComplexity?: number;
        accessibility?: {
            wcagIssues: number;
            severity: 'low' | 'medium' | 'high' | 'critical';
        };
    };
}
export interface ComplexityScore {
    score: number;
    factors: {
        componentDiversity: number;
        routeDepth: number;
        assetCount: number;
        stateVariations: number;
    };
}
export interface AuditResult {
    issues: AuditIssue[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    total: number;
}
export interface AuditIssue {
    id: string;
    category: 'visual' | 'structural' | 'performance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    affectedElements: string[];
}
export interface AccessibilityAudit {
    wcagLevel: 'A' | 'AA' | 'AAA';
    issues: AccessibilityIssue[];
    passedTests: number;
    failedTests: number;
    score: number;
}
export interface AccessibilityIssue {
    wcagCriterion: string;
    severity: 'critical' | 'serious' | 'moderate' | 'minor';
    elements: string[];
    description: string;
    remedy: string;
}
export interface ComparisonGap {
    category: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    impact: string;
    competitorExample?: string;
}
