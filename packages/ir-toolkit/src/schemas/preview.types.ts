export interface ComponentImprovement {
  aspect: 'accessibility' | 'visual' | 'interaction' | 'performance' | 'layout';
  current: string;
  proposed: string;
  rationale: string;
  impactScore: number; // 0-100
}

export interface ComponentPreview {
  id: string;
  name: string;
  type: string;
  currentUsageCount: number;
  currentComplexity: number;
  improvements: ComponentImprovement[];
  improvementScore: number; // 0-100 average of improvements
  estimatedEffort: 'low' | 'medium' | 'high'; // based on complexity + improvement count
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
  affectedCount: number; // how many components affected
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
  overallImprovementScore: number; // 0-100
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
  focusOnAccessibility?: boolean; // prioritize a11y improvements
  emphasizeVisualDesign?: boolean; // show design token changes
  includePerformance?: boolean; // highlight perf gains
  detailLevel?: 'summary' | 'detailed'; // summary shows top 5, detailed shows all
}
