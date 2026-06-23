import type { DomModel } from './dom.js';
export interface CssRule {
    selector: string;
    properties: Record<string, string>;
    specificity: number;
}
export interface StyleSheet {
    rules: CssRule[];
    fonts: string[];
    variables: Record<string, string>;
}
export interface StyleMetrics {
    totalSelectors: number;
    uniqueClasses: number;
    uniqueIds: number;
    colorCount: number;
    fontFamilies: string[];
    breakpoints: string[];
    transitionCount: number;
    animationCount: number;
}
export declare class StyleMatchEngine {
    /**
     * Parse CSS from style tags and external stylesheets in DOM.
     * Returns aggregated stylesheet with extracted rules and metadata.
     */
    parseStylesheet(dom: DomModel, cssText?: string): StyleSheet;
    /**
     * Calculate style metrics from DOM and stylesheet.
     */
    metrics(dom: DomModel, stylesheet: StyleSheet): StyleMetrics;
    private parseCss;
    private parseProperties;
    private calculateSpecificity;
    private walkDom;
}
