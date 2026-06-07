# CIC Phase 5: Deterministic Scoring & Self-Evaluation

## Overview

Phase 5 implements a **deterministic scoring and self-evaluation layer** for content quality assessment. It provides multi-axis evaluation across four independent subsystems:

1. **Heuristic Rules** (25%) — Fast, pattern-based scoring
2. **Semantic Evaluation** (35%) — LLM-backed meaning & accuracy assessment
3. **Structural Analysis** (20%) — DOM/organization quality
4. **Accessibility Compliance** (20%) — WCAG 2.1 AA scoring

Plus **auto-repair suggestions** to help fix detected issues.

---

## Quick Start

### Programmatic Usage

```javascript
import { scoreContent } from './scoring-engine.mjs';

const html = '<h1>Example</h1><p>Some content here.</p>';
const result = await scoreContent(html, {
  user_id: 'my-user',
  correlation_id: 'req-123'
});

console.log(result);
// {
//   score: 0.72,
//   grade: 'C',
//   breakdown: { heuristic, semantic, structural, accessibility },
//   issues: [...],
//   suggestions: [...],
//   metadata: { duration_ms: 245, ... }
// }
```

### CLI Usage

```bash
# Score HTML content
node src/pipeline/run-pipeline.js --mode=score --content="<h1>Title</h1><p>Text</p>" --user_id=me

# Results in JSON
{
  "correlation_id": "...",
  "user_id": "me",
  "score": 0.72,
  "grade": "C",
  "breakdown": { ... },
  "issues": [ ... ],
  "suggestions": [ ... ],
  "duration_ms": 245
}
```

---

## Modules

### `scoring-engine.mjs`

**Main orchestrator.** Runs all subsystems in parallel, aggregates weighted scores, and coordinates issue collection.

**Exports:**
- `scoreContent(contentDom, metadata)` — Full scoring run
- `scoreBatch(items)` — Batch score multiple contents
- `scoreContentPartial(contentDom, metadata, systems)` — Run specific subsystems only
- `SCORING_CONFIG` — Configuration (weights, thresholds, timeout)

**Score Range:** 0 (critical failures) → 1 (excellent)

**Grades:**
- A: ≥ 0.85
- B: ≥ 0.70
- C: ≥ 0.50
- D: ≥ 0.30
- F: < 0.30

### `heuristic-rules.mjs`

Fast, deterministic scoring based on content surface properties.

**Factors:**
- **Completeness** (0.25 weight) — Word count balance (100–50,000 words)
- **Clarity** (0.25 weight) — Vocabulary complexity, sentence length
- **Coherence** (0.25 weight) — Vocabulary overlap between sections
- **Sourcing** (0.25 weight) — Citations, attribution keywords

**No LLM calls.** Runs in <10ms.

### `semantic-evaluator.mjs`

LLM-based evaluation via Claude API (cached for efficiency).

**Factors:**
- **Relevance** — How well content matches stated intent
- **Accuracy** — Factual correctness & support
- **Density** — Information efficiency (verbose vs. concise)
- **Argumentation** — Logical structure & reasoning quality

**Temperature:** 0 (deterministic)
**Cached:** Yes (ephemeral cache)
**Time:** ~1–2s per call

### `structural-analyzer.mjs`

DOM-level analysis of organization and semantic markup.

**Checks:**
- H1→H6 heading hierarchy (gaps, multiplicity)
- Section organization (number, balance)
- Link distribution (density vs. word count)
- Media usage (images, videos)
- Blockquote balance

**DOM Required:** Expects DOM-like object or HTML string

### `accessibility-checker.mjs`

WCAG 2.1 AA compliance scoring.

**Checks:**
- **Color Contrast** — Text & graphics ratios
- **Alt Text** — Image descriptions
- **Form Labels** — Input/label association
- **Heading Structure** — H1 presence, hierarchy
- **Keyboard Navigation** — Tab-focusable elements
- **ARIA Attributes** — Valid roles & semantics

**Weight Distribution:**
- Alt Text: 25%
- Form Labels: 20%
- Heading Structure: 15%
- Color Contrast: 15%
- Keyboard Navigation: 15%
- ARIA: 10%

### `auto-repair.mjs`

Generates actionable repair suggestions for detected issues.

**Features:**
- Rule-based suggestions (fast) for common issues
- LLM-based suggestions (flexible) for complex issues
- Effort estimation (1–5 scale)
- Impact prediction on score

**Suggestions Include:**
- Code examples (before/after)
- Detailed explanation
- Estimated effort to fix

---

## Configuration

### `SCORING_CONFIG` (scoring-engine.mjs)

```javascript
{
  weights: {
    heuristic: 0.25,
    semantic: 0.35,
    structural: 0.20,
    accessibility: 0.20,
  },
  thresholds: {
    excellent: 0.85,
    good: 0.70,
    acceptable: 0.50,
    poor: 0.30,
    critical: 0.0,
  },
  timeoutMs: 30000,
}
```

Adjust weights in your code:

```javascript
import { scoreContent, SCORING_CONFIG } from './scoring-engine.mjs';

// Customize weights
SCORING_CONFIG.weights.semantic = 0.5;  // Emphasize LLM evaluation
SCORING_CONFIG.weights.heuristic = 0.1;

const result = await scoreContent(html);
```

---

## Integration Examples

### With Orchestrator/Playbook

```javascript
import { scoreContent } from './src/scoring/scoring-engine.mjs';

// Score playbook candidates during evolution
async function evaluateCandidate(candidate, testContent) {
  const result = await scoreContent(testContent);
  
  if (result.score >= 0.85) {
    console.log(`Candidate PASSED: grade ${result.grade}`);
    return true;
  }
  
  console.log(`Issues to fix:`, result.issues);
  console.log(`Suggestions:`, result.suggestions);
  return false;
}
```

### With Harvester/Ingestion

```javascript
import { scoreContent } from './src/scoring/scoring-engine.mjs';
import { ingestChunk } from './src/llm/index.js';

// Score before ingestion
async function ingestAndScore(content, metadata) {
  const scoreResult = await scoreContent(content, metadata);
  
  if (scoreResult.score < 0.5) {
    console.warn(`Low quality content (${scoreResult.grade}):`, scoreResult.issues);
    // Optionally reject or mark as low-confidence
  }
  
  // Proceed with ingestion
  await ingestChunk({ user_id: metadata.user_id, text: content, intent: 'auto' });
}
```

### Batch Scoring

```javascript
import { scoreBatch } from './src/scoring/scoring-engine.mjs';

const documents = [
  { content: '<h1>Doc 1</h1>...' },
  { content: '<h1>Doc 2</h1>...' },
  { content: '<h1>Doc 3</h1>...' },
];

const results = await scoreBatch(documents);
const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
console.log(`Average score: ${avgScore.toFixed(2)}`);
```

---

## Pipeline Modes

The `run-pipeline.js` now supports two modes:

### Mode: `score` (Phase 5)

```bash
node src/pipeline/run-pipeline.js \
  --mode=score \
  --content="<html>..." \
  --user_id=my-user
```

**Returns:** `ScoringPipelineResult` with score, grade, issues, suggestions.

### Mode: `ingest` (Default, Phase 18)

```bash
node src/pipeline/run-pipeline.js \
  --user_id=cic \
  --intent=research \
  --text="Content to ingest..." \
  --source=archive
```

**Returns:** `IngestPipelineResult` with answer, tokens, strategy, cache_hit.

---

## Error Handling

All subsystems have timeout protection (default: 30s). If a subsystem times out:

```javascript
{
  score: 0,
  grade: 'F',
  issues: [
    { type: 'timeout', message: '[semantic] timeout after 30000ms', severity: 'high' }
  ],
  // other fields may be null
}
```

Individual subsystem failures don't block the entire score—other subsystems continue.

---

## Performance

| Subsystem | Time | Calls LLM? |
|-----------|------|----------|
| Heuristic | <10ms | No |
| Semantic | 1–2s | Yes (cached) |
| Structural | <50ms | No |
| Accessibility | <30ms | No |
| Auto-Repair | 100–500ms | Partial |

**Total typical:** ~2–3 seconds for full score.

---

## Testing

See `scoring.test.js` (if available) for comprehensive test suite.

Quick manual test:

```bash
# Create a test HTML file
echo '<h1>Test</h1><p>This is test content with some words.</p>' > /tmp/test.html

# Score it
node src/pipeline/run-pipeline.js \
  --mode=score \
  --content="$(cat /tmp/test.html)" \
  | jq '.score, .grade, .issues'
```

---

## Future Enhancements

- [ ] Real color contrast calculation (Relative Luminance formula)
- [ ] Semantic similarity checks (embeddings-based coherence)
- [ ] Custom scoring rules per domain
- [ ] Interactive repair wizard (LLM-guided fixes)
- [ ] Score regression detection (track over time)
- [ ] Custom weight profiles (news vs. academic vs. e-commerce)

---

## References

- [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/)
- [Claude API Docs](https://docs.anthropic.com/)
- [CIC Orchestrator](../orchestrator/README.md)
