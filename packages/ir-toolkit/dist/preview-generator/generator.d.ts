import type { PreviewGallery, PreviewGeneratorConfig } from '../schemas/preview.types.js';
import type { IRPacket } from '../schemas/ir.types.js';
export declare class PreviewGenerator {
    private config;
    constructor(config?: PreviewGeneratorConfig);
    generate(ir: IRPacket): PreviewGallery;
    private generateComponentPreviews;
    private generateImprovements;
    private generateLayoutDiffs;
    private generateDesignTokenDiffs;
    private calculateOverallScore;
    private estimateComponentEffort;
    private estimateOverallEffort;
    private categorizeComponents;
    private generateNarrative;
    private generateBeforeSummary;
    private generateAfterSummary;
    private describeComponent;
    private extractKeyHighlights;
}
export declare function generatePreview(ir: IRPacket, config?: PreviewGeneratorConfig): PreviewGallery;
