---
name: skillopt-objective-redesign
description: Training objective for Redesign skill (Redesign v1.0.0)
version: 1.0.0
created: 2026-05-30
meta_bob_form: v1.0
---

# Redesign Skill — Training Objective (v1.0.0)

## Goal Statement
Given CIC's enriched site audit (DOM, heuristics, accessibility/performance deltas) and extracted content blocks, produce a deterministic, structured redesign plan that:
- Identifies and prioritizes UX, information architecture, layout, and content issues
- Proposes modernized structure aligned with Iron & Ember design patterns
- Rewrites content in brand-aligned voice
- Preserves factual accuracy while improving clarity and scannability
- Outputs valid JSON/Markdown deterministically
- Avoids hallucinating nonexistent features or inventing content

## What the Skill Must Learn

### 1. Issue Identification
- **UX Problems:** Navigation depth, cognitive load, interaction friction
- **IA Problems:** Content hierarchy, conceptual grouping, mental model alignment
- **Layout Problems:** Visual balance, whitespace, mobile responsiveness, hierarchy signaling
- **Content Problems:** Clarity, tone, structure, excessive jargon, missing context
- **Accessibility Gaps:** Color contrast, alt text, keyboard navigation, screen reader compatibility
- **Performance Gaps:** LCP, FID, CLS, bundle size, image optimization

### 2. Prioritization
Rank issues by:
- **Impact:** How much does fixing this improve the user experience or KPI?
- **Effort:** How much change does it require?
- **Feasibility:** Can it be implemented with Iron & Ember constraints?

Output: Prioritized list (P0 = critical, P1 = high, P2 = nice-to-have)

### 3. Pattern Application
- **Iron & Ember Patterns:** Apply consistent component vocabulary, spacing, typography
- **Brand Voice:** Rewrite in CIC-defined tone (authoritative, accessible, clear)
- **Accessibility:** Meet WCAG 2.1 Level AA (minimum)
- **Performance:** Optimize for Core Web Vitals targets

### 4. Deterministic Output
- Consistent JSON schema every time
- Stable field ordering
- No random elements in reasoning
- Reproducible across runs (same input = same output)

### 5. Hallucination Prevention
- **Never invent features** the site doesn't have
- **Never invent content** (quotes, stats, features, links)
- **Always cite sources** in the audits + extracted content
- **Flag assumptions** when inferring user intent

## Reward Functions

Each reward function outputs a score in [0, 1]. Higher is better.

### 1. Structural Completeness (weight: 0.20)
```
Measures: Does the redesign plan cover all sections?
- Heading hierarchy defined
- Content blocks mapped to layout zones
- Navigation structure specified
- Footer/sidebar/modal decisions made
Score: (sections_defined / sections_extracted) * accessibility_metric
```

### 2. Heuristic Alignment (weight: 0.25)
```
Measures: Does the redesign improve CIC's own heuristics?
Input heuristic score: 0.65
Target heuristic score: >= 0.82 (CIC's quality threshold)
Score: (target_score - input_score) / (0.95 - input_score)
Clamped: [0, 1]
```

### 3. Accessibility Uplift (weight: 0.20)
```
Measures: Does the redesign close accessibility gaps?
Input: WCAG 2.1 Level A (estimated from audit)
Target: WCAG 2.1 Level AA
Gaps fixed: color-contrast, alt-text, keyboard-nav, screen-reader
Score: gaps_fixed / total_gaps
```

### 4. Performance Uplift (weight: 0.15)
```
Measures: Does the redesign improve Core Web Vitals?
Input: LCP, FID, CLS measured from audit
Targets: LCP < 2.5s, FID < 100ms, CLS < 0.1
Score: (1 - normalized_metric_distance) if improvement, else 0
```

### 5. Brand Voice Similarity (weight: 0.12)
```
Measures: Does rewritten content match brand voice?
Method: Embed both source (brand guidelines) and target (rewritten content)
         Compute cosine similarity
Score: cosine_sim(brand_embedding, rewrite_embedding)
Target: >= 0.75
```

### 6. Determinism Score (weight: 0.08)
```
Measures: Is the output stable across runs?
Run the skill 3 times on the same input.
Compare outputs: hash each, check for exact match.
Score: 1.0 if identical, 0.0 if differs in any way
```

## Combined Validation Score

```
total_score = (
  0.20 * structural_completeness +
  0.25 * heuristic_alignment +
  0.20 * accessibility_uplift +
  0.15 * performance_uplift +
  0.12 * brand_voice_similarity +
  0.08 * determinism_score
)
```

**Convergence threshold:** `total_score >= 0.87`

## Convergence Criteria

The skill has converged when:

1. **Validation score ≥ 0.87** for **3 consecutive epochs** (no improvement for 3 epochs)
2. **No regressions** in structural_completeness or heuristic_alignment
3. **Zero hallucinations** detected in test set (manual review or heuristic check)
4. **Output length variance < 5%** across identical inputs (determinism)

Once converged:
- Save best checkpoint
- Generate `best_skill.md`
- Write metrics to `/metrics/final_*.json`
- Log convergence event with timestamp

## Training Data Sources

### Train Set (80%)
- CIC sites processed through full pipeline
- Human-curated or CIC-curated "ideal redesigns"
- Covers diverse industries, regions, accessibility baselines

### Validation Set (10%)
- Held-out sites (never seen during training)
- Used to detect overfitting
- Evaluated every epoch

### Test Set (10%)
- Final evaluation after convergence
- Never touched during training
- Reported as final skill performance

## Failure Modes (What We're Preventing)

| Failure Mode | Signal | Prevention |
|--------------|--------|-----------|
| Hallucination (inventing content) | Test set content review | Require citations + audit sources |
| Structural incompleteness | Low structural_completeness score | Enforce all extracted sections covered |
| Accessibility regression | Accessible_uplift < 0 | Require >= 0 uplift |
| Determinism breakdown | Hash mismatch across runs | Seed RNG, freeze stochastic layers |
| Brand voice drift | brand_voice_similarity < 0.75 | Penalize dissimilar embeddings |
| Overfitting | Val score ≈ train score, test score ≈ 0.5 | Hold test set, evaluate frequently |

## Bootstrap Strategy

**Initial (epoch 0):** 
- No training yet; skill is a baseline prompt template
- Measure baseline scores on test set
- Establish performance floor

**Epochs 1–10:**
- Rapid learning phase
- Focus on structural completeness and heuristic alignment
- Accept regressions in other metrics

**Epochs 11–30:**
- Refinement phase
- Stabilize accessibility and performance gains
- Improve brand voice alignment

**Epochs 31+:**
- Fine-tuning phase
- Chase convergence
- Watch for overfitting

## Outputs

At convergence, the skill produces:
1. **`best_skill.md`** — The evolved skill (ready for CIC deployment)
2. **`metrics/final_scores.json`** — Breakdown of all reward functions
3. **`metrics/convergence_log.json`** — Epoch-by-epoch progression
4. **`checkpoints/epoch_XX.pt`** — Model weights at convergence (for versioning)

## Integration with CIC

Once `best_skill.md` is produced:
1. CIC SkillRegistryLoader detects the new skill
2. CIC loads it as the active Redesign skill
3. All subsequent RewriteLabs Redesign tasks use the evolved skill
4. New redesigns become new training data → next training cycle

This creates a **self-improving loop**: CIC → SkillOpt → Improved Skill → CIC.

## Next Steps

1. Implement validation harness (`validation.py` or TS equivalent)
2. Bootstrap initial training dataset (500–1000 items from first CIC runs)
3. Launch first training run
4. Monitor convergence (should stabilize in 30–50 epochs)
5. Deploy best_skill.md to CIC runtime
