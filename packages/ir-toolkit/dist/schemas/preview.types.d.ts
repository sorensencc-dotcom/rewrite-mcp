export interface ComponentImprovement {
    aspect: 'accessibility' | 'visual' | 'interaction' | 'performance' | 'layout';
    current: string;
    proposed: string;
    rationale: string;
    impactScore: number;
}
export interface ComponentPreview {
    id: string;
    name: string;
    type: string;
    currentUsageCount: number;
    currentComplexity: number;
    improvements: ComponentImprovement[];
    improvementScore: number;
    estimatedEffort: 'low' | 'medium' | 'high';
    visualDescription: string;
    beforeState: string;
    afterState: string;
}
export interface LayoutDiff {
    aspect: 'spacing' | 'grid' | 'responsive' | 'alignment';
    current: string;
    proposed: string;
    rationale: string;
    impactScore: number;
}
export interface DesignTokenDiff {
    category: 'color' | 'typography' | 'spacing' | 'shadow' | 'border';
    currentValue: string;
    proposedValue: string;
    rationale: string;
    affectedCount: number;
    impactScore: number;
}
export interface PreviewSnapshot {
    type: 'before' | 'after';
    timestamp: string;
    description: string;
    summary: string;
}
export interface PreviewGallery {
    url: string;
    title: string;
    before: PreviewSnapshot;
    after: PreviewSnapshot;
    componentPreviews: ComponentPreview[];
    layoutDiffs: LayoutDiff[];
    designTokenDiffs: DesignTokenDiff[];
    overallImprovementScore: number;
    transformationNarrative: string;
    keyHighlights: string[];
    estimatedTotalEffort: 'low' | 'medium' | 'high' | 'enterprise';
    componentCategories: {
        hero: ComponentPreview[];
        forms: ComponentPreview[];
        navigation: ComponentPreview[];
        cards: ComponentPreview[];
        buttons: ComponentPreview[];
        other: ComponentPreview[];
    };
}
export interface PreviewGeneratorConfig {
    focusOnAccessibility?: boolean;
    emphasizeVisualDesign?: boolean;
    includePerformance?: boolean;
    detailLevel?: 'summary' | 'detailed';
}
