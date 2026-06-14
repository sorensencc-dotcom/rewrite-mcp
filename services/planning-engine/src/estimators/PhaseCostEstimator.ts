interface Phase {
  modelCalls?: number;
  repoOps?: number;
  governanceOps?: number;
  memoryOps?: number;
}

interface CostEstimate {
  score: number;
  category: 'low' | 'medium' | 'high';
}

const WEIGHTS = {
  modelCalls: 3,
  repoOps: 1,
  governanceOps: 2,
  memoryOps: 1,
};

const THRESHOLDS = {
  high: 20,
  medium: 8,
};

export default class PhaseCostEstimator {
  estimate(phase: Phase): CostEstimate {
    const modelCalls = phase.modelCalls ?? 0;
    const repoOps = phase.repoOps ?? 0;
    const governanceOps = phase.governanceOps ?? 0;
    const memoryOps = phase.memoryOps ?? 0;

    const score =
      modelCalls * WEIGHTS.modelCalls +
      repoOps * WEIGHTS.repoOps +
      governanceOps * WEIGHTS.governanceOps +
      memoryOps * WEIGHTS.memoryOps;

    let category: 'low' | 'medium' | 'high';
    if (score > THRESHOLDS.high) {
      category = 'high';
    } else if (score > THRESHOLDS.medium) {
      category = 'medium';
    } else {
      category = 'low';
    }

    return { score, category };
  }
}
