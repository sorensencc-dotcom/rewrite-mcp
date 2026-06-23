import type { ComputedStyle } from './playwright-extractor.js';
export interface StyleCategory {
    layout: string[];
    typography: string[];
    color: string[];
    spacing: string[];
    sizing: string[];
    visual: string[];
    transform: string[];
}
export interface ComputedStyleMetrics {
    totalElements: number;
    uniqueColors: Map<string, number>;
    uniqueFonts: Map<string, number>;
    uniqueFontSizes: Map<string, number>;
    layoutPatterns: Map<string, number>;
    displayModes: Map<string, number>;
    spacingValues: Map<string, number>;
    zIndexLayers: number[];
    mediaQueries: Set<string>;
}
export declare class ComputedStylesAnalyzer {
    /**
     * Analyze computed styles to extract design system info.
     * Returns aggregated metrics and patterns.
     */
    analyze(computedStyles: ComputedStyle[]): ComputedStyleMetrics;
    /**
     * Categorize styles by functional purpose.
     */
    categorizeStyles(computedStyles: ComputedStyle[]): Record<string, ComputedStyle[]>;
    /**
     * Extract design tokens from computed styles.
     * Returns normalized color, typography, spacing scales.
     */
    extractDesignTokens(metrics: ComputedStyleMetrics): {
        colors: string[];
        fonts: string[];
        fontSizes: string[];
        spacings: string[];
    };
    /**
     * Detect breakpoints from media queries.
     * Placeholder: real implementation would parse media queries from stylesheet.
     */
    detectBreakpoints(mediaQueries: Set<string>): number[];
    private collectValue;
}
