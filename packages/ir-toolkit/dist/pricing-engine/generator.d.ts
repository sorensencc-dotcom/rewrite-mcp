import type { PricingQuote, PricingConfig } from '../schemas/pricing.types.js';
import type { PreviewGallery } from '../schemas/preview.types.js';
export declare class PricingEngine {
    private config;
    constructor(config?: PricingConfig);
    generate(gallery: PreviewGallery): PricingQuote;
    private calculateComponentCosts;
    private determineCategoryForComponent;
    private effortToMultiplier;
    private getEffortMultiplier;
    private calculateCostBreakdown;
    private estimateEffortHours;
    private determineTier;
    private calculateConfidence;
    private generateAssumptions;
    private generateCustomizations;
    private calculateTimeline;
    private generateSummary;
}
export declare function generatePricing(gallery: PreviewGallery, config?: PricingConfig): PricingQuote;
