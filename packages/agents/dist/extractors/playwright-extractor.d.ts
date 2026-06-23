import type { Page } from 'playwright-core';
export interface PlaywrightOptions {
    headless?: boolean;
    timeout?: number;
    viewport?: {
        width: number;
        height: number;
    };
    userAgent?: string;
    waitForNavigation?: boolean;
    screenshotOnError?: boolean;
}
export interface ComputedStyle {
    selector: string;
    computed: Record<string, string>;
    box?: {
        width: number;
        height: number;
        top: number;
        left: number;
    };
}
export interface InteractiveElement {
    tag: string;
    type?: string;
    selector: string;
    text?: string;
    ariaLabel?: string;
    isVisible: boolean;
    isDisabled: boolean;
}
export interface ScreenshotMetadata {
    width: number;
    height: number;
    dataUrl: string;
    capturedAt: string;
}
export interface PlaywrightDomModel {
    url: string;
    title: string;
    viewport: {
        width: number;
        height: number;
    };
    computedStyles: ComputedStyle[];
    interactiveElements: InteractiveElement[];
    screenshots: ScreenshotMetadata[];
    performanceMetrics?: {
        navigationStart: number;
        loadEventEnd: number;
        domContentLoadedEventEnd: number;
        firstContentfulPaint: number;
    };
    jsExecutionTime: number;
    extractedAt: string;
}
export declare class PlaywrightNotConfiguredError extends Error {
    constructor(message: string);
}
export declare class PlaywrightExtractor {
    private readonly options;
    constructor(options?: PlaywrightOptions);
    extract(url: string): Promise<PlaywrightDomModel | null>;
    extractComputedStyles(page: Page): Promise<ComputedStyle[]>;
    extractInteractiveElements(page: Page): Promise<InteractiveElement[]>;
    takeScreenshots(page: Page): Promise<ScreenshotMetadata[]>;
    extractPerformanceMetrics(page: Page): Promise<PlaywrightDomModel['performanceMetrics'] | undefined>;
}
