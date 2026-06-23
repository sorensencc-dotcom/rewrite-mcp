export interface DesignVariantInput {
    variantId: string;
    variantName: string;
    html: string;
    css: string;
}
export interface W3CResult {
    valid: boolean;
    errors: string[];
}
export interface RenderedVariant extends DesignVariantInput {
    tokenDriftScore: number;
    w3cValid: boolean;
    w3cErrors: string[];
    renderedAt: string;
}
export interface RenderOptions {
    sourceTokens?: Record<string, string>;
    strictW3C?: boolean;
}
export interface BatchRenderResult {
    variants: RenderedVariant[];
    allW3CValid: boolean;
    maxTokenDrift: number;
    meetsThreshold: boolean;
    threshold: number;
}
export declare class DesignVariantRenderer {
    render(variant: DesignVariantInput, options?: RenderOptions): RenderedVariant;
    renderAll(variants: DesignVariantInput[], options?: RenderOptions, driftThreshold?: number): BatchRenderResult;
    validateW3C(html: string, strict?: boolean): W3CResult;
    calculateTokenDrift(sourceTokens: Record<string, string>, generatedCSS: string): number;
}
