import type { ComputedStyle, PlaywrightDomModel } from './playwright-extractor.js';
export interface ScreenshotReference {
    type: 'viewport' | 'fullpage';
    dataUrl: string;
    width: number;
    height: number;
}
export interface InteractiveMap {
    buttons: number;
    inputs: number;
    links: number;
    selects: number;
    textareas: number;
    customClickable: number;
}
export interface PerformanceSummary {
    navigationTimeMs: number;
    domContentLoadedMs: number;
    firstContentfulPaintMs: number;
    jsExecutionTimeMs: number;
}
export interface IRPacketV12Extension {
    playwrightEnabled: boolean;
    computedStyles?: ComputedStyle[];
    screenshots?: ScreenshotReference[];
    interactiveElements?: {
        count: InteractiveMap;
        elements: Array<{
            tag: string;
            text?: string;
            ariaLabel?: string;
            isVisible: boolean;
            isDisabled: boolean;
        }>;
    };
    performanceMetrics?: PerformanceSummary;
    designTokensExtracted?: {
        colors: string[];
        fonts: string[];
        fontSizes: string[];
        spacings: string[];
    };
}
/**
 * Build extended IR packet v1.2 with Playwright data.
 * Merges static extraction (v1.0) + CSS metrics (v1.1) + browser rendering (v1.2).
 */
export declare class IRPacketV12Builder {
    buildExtension(playwrightModel: PlaywrightDomModel): IRPacketV12Extension;
    private countInteractiveElements;
}
