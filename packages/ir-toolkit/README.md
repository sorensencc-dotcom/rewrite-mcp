# @rewrite-labs/ir-toolkit

IR (Intermediate Representation) Toolkit for Rewrite Labs — lead scoring, preview generation, and pricing automation built on deterministic website analysis.

## Features

- **Lead Scoring Engine** — Score website complexity, audit issues, accessibility debt, and competitive gaps to identify sales opportunities
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

### Result Structure

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

**45+ tests** covering:
- Scoring logic and factor weighting
- Validation and error handling
- Tier determination and edge cases
- Real-world scenarios (SaaS, e-commerce, etc.)
- Custom configuration
- Integration pipelines

## Phases

**Phase 4.5** — Lead Scoring Engine (current)
**Phase 4.6** — Rewrite Labs Preview (before/after gallery)
**Phase 4.7** — Pricing Engine (deterministic quoting)

## License

MIT
