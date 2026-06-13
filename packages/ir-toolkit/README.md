# @rewrite-labs/ir-toolkit

IR (Intermediate Representation) Toolkit for Rewrite Labs — lead scoring, preview generation, pricing automation, and deterministic website analysis for sales workflows.

## Features

- **Lead Scoring Engine** — Score website complexity, audit issues, accessibility debt, and competitive gaps to identify sales opportunities
- **Preview Generator** — Generate before/after redesign galleries with component diffs, layout improvements, and design token upgrades
- **Pricing Engine** — Deterministic cost estimation with tier breakdown (discovery, design, dev, QA, deploy) and customization options
- **IR Schema** — Canonical format for website extraction with design tokens, routes, components, and assets
- **Validators** — Type-safe validation for all inputs and outputs
- **Zero Dependencies** — Uses only Node.js stdlib

## Installation

```bash
npm install @rewrite-labs/ir-toolkit
```

## Usage

### Lead Scoring

```typescript
import { LeadScoringEngine, scoreIRPacket } from '@rewrite-labs/ir-toolkit/lead-scorer';
import type { IRPacket } from '@rewrite-labs/ir-toolkit/schemas';

// Option 1: Score from IR packet
const ir: IRPacket = {
  version: '1.0.0',
  meta: {
    url: 'https://example.com',
    captureDate: new Date().toISOString(),
    toolVersion: '1.0.0'
  },
  designTokens: { /* ... */ },
  routes: [ /* ... */ ],
  components: [ /* ... */ ],
  assets: { images: 10, videos: 2, svgs: 5, total: 17 }
};

const result = scoreIRPacket(ir);
console.log(`Lead Score: ${result.score}/100 (Tier ${result.tier})`);
console.log(`Sales Ready: ${result.salesReady}`);
console.log(`Next Steps:`, result.nextSteps);

// Option 2: Manual scoring
import type { ScoringInput } from '@rewrite-labs/ir-toolkit/schemas';

const engine = new LeadScoringEngine();
const input: ScoringInput = {
  complexity: { score: 75, factors: { /* ... */ } },
  audit: { issues: [], severity: 'medium', total: 10 },
  accessibility: { wcagLevel: 'AA', /* ... */ }
};

const score = engine.score(input);
```

### Preview Generation

```typescript
import { generatePreview } from '@rewrite-labs/ir-toolkit/preview-generator';
import type { IRPacket } from '@rewrite-labs/ir-toolkit/schemas';

const ir: IRPacket = { /* ... */ };

const gallery = generatePreview(ir, {
  focusOnAccessibility: true,    // Prioritize a11y improvements
  emphasizeVisualDesign: true,   // Show design token changes
  includePerformance: true,      // Highlight perf gains
  detailLevel: 'detailed'        // Show all improvements or 'summary' for top 5
});

console.log(`Overall Improvement Score: ${gallery.overallImprovementScore}/100`);
console.log(`Component Categories:`, Object.keys(gallery.componentCategories));
console.log(`Key Highlights:`, gallery.keyHighlights);
console.log(`Estimated Effort:`, gallery.estimatedTotalEffort);
```

### Preview Gallery Structure

```typescript
{
  url: 'https://example.com',
  before: {
    type: 'before',
    summary: 'Current state with accessibility issues...',
    description: 'Current state of your website'
  },
  after: {
    type: 'after',
    summary: 'Recommended improvements score 72/100...',
    description: 'Recommended improvements and redesign'
  },
  componentPreviews: [
    {
      id: 'hero',
      name: 'Hero Section',
      improvements: [
        {
          aspect: 'accessibility',
          current: 'WCAG compliance issues present',
          proposed: 'Full WCAG AA compliance',
          rationale: 'Expands audience reach and reduces legal risk',
          impactScore: 85
        }
      ],
      improvementScore: 72,
      estimatedEffort: 'medium'
    }
  ],
  layoutDiffs: [
    {
      aspect: 'responsive',
      current: '3 routes with inconsistent breakpoints',
      proposed: 'Unified responsive grid (mobile-first)',
      impactScore: 75
    }
  ],
  designTokenDiffs: [
    {
      category: 'color',
      currentValue: '12 custom colors',
      proposedValue: '8-color system',
      affectedCount: 18,
      impactScore: 70
    }
  ],
  overallImprovementScore: 72,
  transformationNarrative: 'example.com has a significant redesign opportunity...',
  keyHighlights: [
    'Hero Section, CTA Button — highest improvement potential',
    'Layout system — Creates visual hierarchy and consistency',
    'Design tokens — Standardize color, typography'
  ],
  estimatedTotalEffort: 'medium',
  componentCategories: {
    hero: [ /* ComponentPreview[] */ ],
    forms: [ /* ComponentPreview[] */ ],
    navigation: [ /* ComponentPreview[] */ ],
    cards: [ /* ComponentPreview[] */ ],
    buttons: [ /* ComponentPreview[] */ ],
    other: [ /* ComponentPreview[] */ ]
  }
}
```

### Pricing Generation

```typescript
import { generatePricing } from '@rewrite-labs/ir-toolkit/pricing-engine';
import type { PreviewGallery } from '@rewrite-labs/ir-toolkit/schemas';

const gallery: PreviewGallery = { /* ... from preview generator ... */ };

const quote = generatePricing(gallery, {
  baseCosts: {
    discovery: 5000,      // Optional: override default costs
    development: 25000
  },
  componentBaseCosts: {
    hero: 4000,           // Cost per component type
    forms: 3000,
    navigation: 3500,
    cards: 2500,
    buttons: 1500,
    other: 2000
  }
});

console.log(`Estimate: $${quote.totalEstimate}`);
console.log(`Tier: ${quote.tier}`);
console.log(`Effort: ${quote.overallEffortHours} hours`);
console.log(`Timeline: ${quote.executionTimeline.total} days`);
console.log(`Breakdown:`, quote.breakdown);
console.log(`Customizations:`, quote.customizations);
```

### Pricing Quote Structure

```typescript
{
  url: 'https://example.com',
  estimateDateIso: '2026-06-13T00:00:00.000Z',
  totalEstimate: 72000,                    // USD
  tier: 'professional',                    // basic | professional | enterprise
  breakdown: {
    discovery: { amount: 5000, reasoning: 'Discovery + requirements gathering' },
    design: { amount: 18000, reasoning: 'Design system + component redesign (12 components)' },
    development: { amount: 40000, reasoning: 'Implementation + high effort level' },
    qa: { amount: 6000, reasoning: 'Testing + accessibility validation' },
    deployment: { amount: 3000, reasoning: 'Deployment + client training' }
  },
  componentCosts: [
    {
      id: 'hero',
      name: 'Hero Section',
      category: 'hero',
      baseCost: 4000,
      effortMultiplier: 1.5,          // medium effort
      complexityMultiplier: 0.45,     // 45% complexity
      totalCost: 8700
    }
    // ... more components
  ],
  overallEffortHours: 360,            // Total project hours
  confidenceLevel: 'high',            // high | medium | low
  assumptions: [
    { factor: 'Component Count', impact: '12 components across 6 categories' },
    { factor: 'Effort Level', impact: 'high effort tier (8 complex components)' },
    { factor: 'Accessibility Work', impact: '20% cost increase for WCAG AA compliance' },
    { factor: 'Project Scope', impact: 'Covers redesign, implementation, testing, and launch' }
  ],
  customizations: [
    {
      name: 'Advanced Form Builder Integration',
      description: 'Custom form validation, multi-step flows, conditional logic',
      estimatedCost: 8000,
      implementationDays: 5
    }
    // ... more options
  ],
  recommendedPaymentTerms: '50% upfront, 50% upon delivery',
  executionTimeline: {
    discovery: 5,
    design: 12,
    development: 40,
    qa: 6,
    deployment: 2,
    total: 65                          // Calendar days
  },
  summary: 'Professional redesign for 12 components. Estimated investment: $72k.'
}
```

### Lead Score Result Structure

```typescript
{
  score: 75,           // 0-100
  tier: 'A',           // A | B | C | D
  percentile: 75,      // 0-100
  factors: {
    complexity: { value: 75, weight: 0.35, contribution: 26.25 },
    audit: { value: 65, weight: 0.30, contribution: 19.5 },
    accessibility: { value: 80, weight: 0.20, contribution: 16 },
    competitive: { value: 70, weight: 0.15, contribution: 10.5 }
  },
  summary: 'Excellent opportunity. High complexity...',
  insights: [
    'High technical complexity indicates significant redesign scope',
    'Multiple design/structural issues present strong value proposition'
  ],
  recommendations: [
    'Prepare preview gallery with before/after comparisons',
    'Build custom pricing estimate based on component inventory'
  ],
  salesReady: true,
  estimatedComplexity: 'high',
  nextSteps: [
    '1. Generate preview gallery',
    '2. Calculate pricing estimate',
    '3. Schedule founder call'
  ]
}
```

## Scoring Formula

Default weights (customizable):
- **Complexity** (35%) — Technical scope and redesign opportunity
- **Audit** (30%) — Design/structural issues severity
- **Accessibility** (20%) — WCAG compliance debt
- **Competitive** (15%) — Gaps vs. best-in-class competitors

Scoring is deterministic and reproducible. Same input always yields same score.

## Validation

```typescript
import { validateScoringInput, validateLeadScoreResult, validateIRPacket } from '@rewrite-labs/ir-toolkit/validators';

try {
  validateScoringInput(input);
  const result = engine.score(input);
  validateLeadScoreResult(result);
} catch (error) {
  console.error('Validation error:', error.message);
}
```

## Configuration

```typescript
const engine = new LeadScoringEngine({
  weights: {
    complexity: 0.4,      // Increase complexity weight
    audit: 0.25,
    accessibility: 0.2,
    competitive: 0.15
  },
  thresholds: {
    A: 85,                // Higher threshold for Tier A
    B: 65,
    C: 45,
    D: 0
  }
});
```

## Architecture

```
IR Packet (website analysis)
    ↓
Complexity Score (component diversity, route depth, assets, states)
Audit Result (visual/structural issues + severity)
Accessibility Audit (WCAG level + failed tests)
Comparison Gaps (competitive analysis)
    ↓
Lead Scoring Engine
    ↓
LeadScoreResult
├── Score (0-100)
├── Tier (A-D)
├── Insights (generated from input)
├── Recommendations (tier-specific actions)
└── Next Steps (sales workflow)
```

## Testing

```bash
npm test                 # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

**127 tests** covering:

- Lead scoring logic and factor weighting
- Preview generation and diff detection
- Pricing estimation and tier determination
- Component categorization and effort estimation
- Cost breakdown and timeline calculation
- Validation and error handling
- Real-world scenarios (SaaS, e-commerce, etc.)
- Custom configuration and multipliers
- Integration pipelines
- Edge cases (empty IRs, many routes, many tokens, complex components)

## Phases

**Phase 4.5** — Lead Scoring Engine ✅
**Phase 4.6** — Rewrite Labs Preview ✅
**Phase 4.7** — Pricing Engine ✅

## License

MIT
