import { EvidenceScore } from './EvidenceScorer';

export interface Contradiction {
  description: string;
  severity: number;
}

export interface ContradictionAnalysis {
  contradictions: Contradiction[];
  hasCritical: boolean;
}

export function detectContradictions(
  scores: EvidenceScore[]
): ContradictionAnalysis {
  const contradictions: Contradiction[] = [];
  let hasCritical = false;

  // C1: Hypothesis quality conflicts (low scores across metrics)
  scores.forEach((score, idx) => {
    const avgScore =
      (score.narrativeContinuity +
        score.semanticCoherence +
        score.timelineConsistency +
        score.stabilityAlignment) /
      4;

    if (avgScore < 0.25) {
      contradictions.push({
        description: `Hypothesis "${score.hypothesis.description.substring(0, 50)}..." fails coherence (score: ${avgScore.toFixed(2)})`,
        severity: 0.7
      });
    }
  });

  // C2: Drift impact conflicts
  scores.forEach(score => {
    if (score.driftPenalty < 0.2) {
      contradictions.push({
        description: `Hypothesis introduces excessive drift (penalty: ${(1 - score.driftPenalty).toFixed(2)})`,
        severity: 0.8
      });
      hasCritical = true;
    }
  });

  // C3: Stability regression
  scores.forEach(score => {
    if (score.stabilityAlignment < 0.15) {
      contradictions.push({
        description: `Hypothesis destabilizes system (alignment: ${score.stabilityAlignment.toFixed(2)})`,
        severity: 0.9
      });
      hasCritical = true;
    }
  });

  // C4: Competing hypotheses (high-likelihood hypotheses with contradictory descriptions)
  const highLikelihoodHyps = scores.filter(s => s.hypothesis.likelihood > 0.6);

  for (let i = 0; i < highLikelihoodHyps.length; i++) {
    for (let j = i + 1; j < highLikelihoodHyps.length; j++) {
      const desc1 = highLikelihoodHyps[i].hypothesis.description.toLowerCase();
      const desc2 = highLikelihoodHyps[j].hypothesis.description.toLowerCase();

      // Simple heuristic: very different descriptions from similar entities might conflict
      if (
        desc1.length > 20 &&
        desc2.length > 20 &&
        !desc1.includes(desc2.substring(0, 10))
      ) {
        contradictions.push({
          description: `Competing interpretations: "${desc1.substring(0, 40)}..." vs "${desc2.substring(0, 40)}..."`,
          severity: 0.5
        });
      }
    }
  }

  return {
    contradictions,
    hasCritical
  };
}
