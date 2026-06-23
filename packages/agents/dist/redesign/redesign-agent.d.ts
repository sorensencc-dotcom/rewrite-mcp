export declare const REDESIGN_VERSION = "1.0.0";
export declare class RedesignNotConfiguredError extends Error {
    constructor(message: string);
}
export interface DesignVariant {
    variantId: string;
    variantName: string;
    html: string;
    css: string;
    tokenDriftScore: number;
    w3cValid: boolean;
    w3cErrors: string[];
    generatedAt: string;
}
export interface RedesignInput {
    url: string;
    title?: string;
    designTokens?: Record<string, string>;
    computedStylesSummary?: string;
    interactiveElementCount?: number;
    performanceMs?: number;
    variantCount?: number;
}
export interface RedesignOutput {
    variants: DesignVariant[];
    sourceUrl: string;
    passesCompleted: number;
    generationTimeMs: number;
    generatedAt: string;
}
export declare class RedesignAgent {
    private readonly model;
    private readonly maxTokens;
    constructor(options?: {
        model?: string;
        maxTokens?: number;
    });
    redesign(input: RedesignInput): Promise<RedesignOutput>;
    private passStructureAnalysis;
    private passCssLayout;
    private passVariantGeneration;
    private parseJSON;
    validateW3C(html: string): {
        valid: boolean;
        errors: string[];
    };
    calculateTokenDrift(sourceTokens: Record<string, string>, generatedCSS: string): number;
}
