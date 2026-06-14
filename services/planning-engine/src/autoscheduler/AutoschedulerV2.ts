export interface Phase {
  id: string;
  cost: 'low' | 'medium' | 'high';
  importance: number;
  readiness: number;
}

export interface Signals {
  budget: {
    pct: number;
  };
  drift: {
    level: number;
  };
}

export interface ScheduledPhase {
  phase: Phase;
  score: number;
  window: number;
}

const COST_WEIGHTS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export class AutoschedulerV2 {
  scorePhase(phase: Phase, signals: Signals): number {
    const costWeight = COST_WEIGHTS[phase.cost];
    const budgetPressureWeight = signals.budget.pct;
    const driftWeight = signals.drift.level;
    const importanceWeight = phase.importance;
    const readinessWeight = phase.readiness;

    const costComponent = costWeight * (1 + budgetPressureWeight);
    const driftComponent = driftWeight * importanceWeight;
    const readinessBonus = readinessWeight * 0.5;

    const baseScore = costComponent + driftComponent + readinessBonus;

    return Math.round(baseScore * 10000) / 10000;
  }

  schedule(phases: Phase[], signals: Signals): ScheduledPhase[] {
    const scored = phases.map((phase) => ({
      phase,
      score: this.scorePhase(phase, signals),
    }));

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.phase.id.localeCompare(b.phase.id);
    });

    const scheduled = scored.map((item, index) => ({
      phase: item.phase,
      score: item.score,
      window: Math.floor(index / 5) + 1,
    }));

    return scheduled;
  }
}
