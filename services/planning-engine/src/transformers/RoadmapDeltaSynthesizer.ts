import { randomUUID } from 'crypto';

export type DeltaActionType = 'FREEZE' | 'DEPRIORITIZE' | 'ACCELERATE' | 'ADD' | 'REMOVE' | 'RESCOPE';

export interface RoadmapAdjustment {
  phase: string;
  action: DeltaActionType;
  reason: string;
  priority?: number;
  effort_estimate?: number;
  affected_deliverables?: string[];
}

export interface RoadmapDelta {
  type: 'BUDGET_ADJUSTMENT' | 'SCHEDULE_SHIFT' | 'PRIORITY_REBALANCE' | 'SCOPE_CHANGE';
  timestamp: string;
  pct: number;
  adjustments: RoadmapAdjustment[];
  delta_id?: string;
  summary?: string;
  confidence?: number;
}

export interface RoadmapPhase {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'complete';
  priority: number;
  effort_estimate: number;
  start_date?: string;
  end_date?: string;
  dependencies?: string[];
  deliverables?: string[];
  metadata?: Record<string, unknown>;
}

export interface Roadmap {
  id: string;
  version: string;
  timestamp: string;
  phases: RoadmapPhase[];
  constraints?: {
    total_budget?: number;
    max_parallel_phases?: number;
    critical_path?: string[];
  };
}

export class RoadmapDeltaSynthesizer {
  private changeThreshold = 0.01;

  constructor(threshold?: number) {
    if (threshold) {
      this.changeThreshold = threshold;
    }
  }

  synthesize(original: Roadmap, prioritized: Roadmap): RoadmapDelta | null {
    const adjustments: RoadmapAdjustment[] = [];
    let totalBudgetChange = 0;

    const originalPhaseMap = this.buildPhaseMap(original);
    const prioritizedPhaseMap = this.buildPhaseMap(prioritized);

    const allPhaseIds = new Set([...originalPhaseMap.keys(), ...prioritizedPhaseMap.keys()]);

    for (const phaseId of allPhaseIds) {
      const originalPhase = originalPhaseMap.get(phaseId);
      const prioritizedPhase = prioritizedPhaseMap.get(phaseId);

      if (!originalPhase && prioritizedPhase) {
        adjustments.push({
          phase: phaseId,
          action: 'ADD',
          reason: `New phase added during prioritization: ${prioritizedPhase.name}`,
          effort_estimate: prioritizedPhase.effort_estimate,
        });
        totalBudgetChange += prioritizedPhase.effort_estimate;
      } else if (originalPhase && !prioritizedPhase) {
        adjustments.push({
          phase: phaseId,
          action: 'REMOVE',
          reason: `Phase removed: ${originalPhase.name}`,
          effort_estimate: originalPhase.effort_estimate,
        });
        totalBudgetChange -= originalPhase.effort_estimate;
      } else if (originalPhase && prioritizedPhase) {
        const phaseAdjustments = this.detectPhaseChanges(originalPhase, prioritizedPhase);
        adjustments.push(...phaseAdjustments);

        if (phaseAdjustments.some(a => a.action === 'ACCELERATE' || a.action === 'DEPRIORITIZE')) {
          totalBudgetChange += (prioritizedPhase.effort_estimate - originalPhase.effort_estimate);
        }
      }
    }

    const totalOriginalBudget = this.calculateTotalBudget(original);
    const percentageChange = totalOriginalBudget > 0 ? totalBudgetChange / totalOriginalBudget : 0;

    if (Math.abs(percentageChange) < this.changeThreshold && adjustments.length === 0) {
      return null;
    }

    return {
      type: this.determineDeltaType(adjustments),
      timestamp: new Date().toISOString(),
      pct: Math.round(percentageChange * 10000) / 100,
      adjustments: this.sortAdjustmentsByImpact(adjustments),
      delta_id: randomUUID(),
      summary: this.generateSummary(adjustments, percentageChange),
      confidence: this.calculateConfidence(adjustments),
    };
  }

  private buildPhaseMap(roadmap: Roadmap): Map<string, RoadmapPhase> {
    const map = new Map<string, RoadmapPhase>();
    for (const phase of roadmap.phases) {
      map.set(phase.id, phase);
    }
    return map;
  }

  private calculateTotalBudget(roadmap: Roadmap): number {
    return roadmap.phases.reduce((sum, phase) => sum + phase.effort_estimate, 0);
  }

  private detectPhaseChanges(original: RoadmapPhase, prioritized: RoadmapPhase): RoadmapAdjustment[] {
    const adjustments: RoadmapAdjustment[] = [];

    if (this.hasPriorityChange(original, prioritized)) {
      const action = prioritized.priority > original.priority ? 'DEPRIORITIZE' : 'ACCELERATE';
      adjustments.push({
        phase: original.id,
        action,
        reason: this.describePriorityChange(original, prioritized),
        priority: prioritized.priority,
      });
    }

    if (this.hasEffortChange(original, prioritized)) {
      adjustments.push({
        phase: original.id,
        action: 'RESCOPE',
        reason: this.describeEffortChange(original, prioritized),
        effort_estimate: prioritized.effort_estimate,
      });
    }

    if (this.isStatusFrozen(original, prioritized)) {
      adjustments.push({
        phase: original.id,
        action: 'FREEZE',
        reason: `Phase status changed from ${original.status} to ${prioritized.status}`,
      });
    }

    if (this.hasDependencyChange(original, prioritized)) {
      adjustments.push({
        phase: original.id,
        action: 'RESCOPE',
        reason: this.describeDependencyChange(original, prioritized),
      });
    }

    if (this.hasDeliverableChange(original, prioritized)) {
      adjustments.push({
        phase: original.id,
        action: 'RESCOPE',
        reason: `Deliverables modified`,
        affected_deliverables: this.getModifiedDeliverables(original, prioritized),
      });
    }

    return adjustments;
  }

  private hasPriorityChange(original: RoadmapPhase, prioritized: RoadmapPhase): boolean {
    return original.priority !== prioritized.priority;
  }

  private hasEffortChange(original: RoadmapPhase, prioritized: RoadmapPhase): boolean {
    return Math.abs(original.effort_estimate - prioritized.effort_estimate) > 0.5;
  }

  private isStatusFrozen(original: RoadmapPhase, prioritized: RoadmapPhase): boolean {
    return original.status !== prioritized.status && prioritized.status === 'blocked';
  }

  private hasDependencyChange(original: RoadmapPhase, prioritized: RoadmapPhase): boolean {
    const origDeps = original.dependencies || [];
    const prioDeps = prioritized.dependencies || [];

    if (origDeps.length !== prioDeps.length) {
      return true;
    }

    const origSet = new Set(origDeps);
    return prioDeps.some(dep => !origSet.has(dep));
  }

  private hasDeliverableChange(original: RoadmapPhase, prioritized: RoadmapPhase): boolean {
    const origDel = original.deliverables || [];
    const prioDel = prioritized.deliverables || [];

    if (origDel.length !== prioDel.length) {
      return true;
    }

    const origSet = new Set(origDel);
    return prioDel.some(del => !origSet.has(del));
  }

  private describePriorityChange(original: RoadmapPhase, prioritized: RoadmapPhase): string {
    const direction = prioritized.priority > original.priority ? 'down' : 'up';
    const delta = Math.abs(prioritized.priority - original.priority);
    return `Priority adjusted ${direction} by ${delta} positions`;
  }

  private describeEffortChange(original: RoadmapPhase, prioritized: RoadmapPhase): string {
    const delta = prioritized.effort_estimate - original.effort_estimate;
    const pct = Math.round((Math.abs(delta) / original.effort_estimate) * 100);
    const direction = delta > 0 ? 'increased' : 'decreased';
    return `Effort estimate ${direction} by ${pct}% (${original.effort_estimate} → ${prioritized.effort_estimate})`;
  }

  private describeDependencyChange(original: RoadmapPhase, prioritized: RoadmapPhase): string {
    const origDeps = original.dependencies || [];
    const prioDeps = prioritized.dependencies || [];
    const added = prioDeps.filter(d => !origDeps.includes(d));
    const removed = origDeps.filter(d => !prioDeps.includes(d));

    const parts: string[] = [];
    if (added.length > 0) parts.push(`added ${added.length} dependency(ies)`);
    if (removed.length > 0) parts.push(`removed ${removed.length} dependency(ies)`);

    return `Dependencies modified: ${parts.join(', ')}`;
  }

  private getModifiedDeliverables(original: RoadmapPhase, prioritized: RoadmapPhase): string[] {
    const origDel = new Set(original.deliverables || []);
    const prioDel = new Set(prioritized.deliverables || []);

    const modified: string[] = [];

    for (const del of prioDel) {
      if (!origDel.has(del)) {
        modified.push(`+${del}`);
      }
    }

    for (const del of origDel) {
      if (!prioDel.has(del)) {
        modified.push(`-${del}`);
      }
    }

    return modified;
  }

  private determineDeltaType(adjustments: RoadmapAdjustment[]): RoadmapDelta['type'] {
    const actionCounts = {
      FREEZE: 0,
      DEPRIORITIZE: 0,
      ACCELERATE: 0,
      ADD: 0,
      REMOVE: 0,
      RESCOPE: 0,
    };

    for (const adj of adjustments) {
      actionCounts[adj.action]++;
    }

    if (actionCounts.FREEZE > 0 || (actionCounts.DEPRIORITIZE + actionCounts.ACCELERATE > 0)) {
      return 'PRIORITY_REBALANCE';
    }

    if (actionCounts.ADD > 0 || actionCounts.REMOVE > 0) {
      return 'SCOPE_CHANGE';
    }

    if (actionCounts.RESCOPE > 0) {
      return 'BUDGET_ADJUSTMENT';
    }

    return 'BUDGET_ADJUSTMENT';
  }

  private sortAdjustmentsByImpact(adjustments: RoadmapAdjustment[]): RoadmapAdjustment[] {
    const impactOrder = {
      FREEZE: 0,
      REMOVE: 1,
      ACCELERATE: 2,
      DEPRIORITIZE: 3,
      ADD: 4,
      RESCOPE: 5,
    };

    return adjustments.sort((a, b) => {
      const aImpact = impactOrder[a.action];
      const bImpact = impactOrder[b.action];

      if (aImpact !== bImpact) {
        return aImpact - bImpact;
      }

      if (a.effort_estimate !== undefined && b.effort_estimate !== undefined) {
        return Math.abs(b.effort_estimate) - Math.abs(a.effort_estimate);
      }

      return 0;
    });
  }

  private generateSummary(adjustments: RoadmapAdjustment[], percentageChange: number): string {
    if (adjustments.length === 0) {
      return 'No significant roadmap changes detected';
    }

    const actionCounts: Record<DeltaActionType, number> = {
      FREEZE: 0,
      DEPRIORITIZE: 0,
      ACCELERATE: 0,
      ADD: 0,
      REMOVE: 0,
      RESCOPE: 0,
    };

    for (const adj of adjustments) {
      actionCounts[adj.action]++;
    }

    const parts: string[] = [];

    if (actionCounts.ADD > 0) parts.push(`Added ${actionCounts.ADD} phase(s)`);
    if (actionCounts.REMOVE > 0) parts.push(`Removed ${actionCounts.REMOVE} phase(s)`);
    if (actionCounts.FREEZE > 0) parts.push(`Froze ${actionCounts.FREEZE} phase(s)`);
    if (actionCounts.ACCELERATE > 0) parts.push(`Accelerated ${actionCounts.ACCELERATE} phase(s)`);
    if (actionCounts.DEPRIORITIZE > 0) parts.push(`Deprioritized ${actionCounts.DEPRIORITIZE} phase(s)`);
    if (actionCounts.RESCOPE > 0) parts.push(`Rescoped ${actionCounts.RESCOPE} phase(s)`);

    const budgetNote = percentageChange !== 0
      ? ` Budget impact: ${percentageChange > 0 ? '+' : ''}${Math.round(percentageChange * 100) / 100}%`
      : '';

    return parts.join('. ') + budgetNote;
  }

  private calculateConfidence(adjustments: RoadmapAdjustment[]): number {
    if (adjustments.length === 0) {
      return 1.0;
    }

    const hasCompleteRationale = adjustments.every(a => a.reason && a.reason.length > 0);
    const hasSpecificActions = adjustments.every(a => a.action in ['FREEZE', 'ACCELERATE', 'DEPRIORITIZE']);

    let confidence = 0.7;

    if (hasCompleteRationale) {
      confidence += 0.15;
    }

    if (hasSpecificActions && adjustments.length <= 5) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  getAdjustmentsByAction(delta: RoadmapDelta, action: DeltaActionType): RoadmapAdjustment[] {
    return delta.adjustments.filter(a => a.action === action);
  }

  getAdjustmentsByPhase(delta: RoadmapDelta, phaseId: string): RoadmapAdjustment[] {
    return delta.adjustments.filter(a => a.phase === phaseId);
  }

  mergeDeltas(deltas: RoadmapDelta[]): RoadmapDelta | null {
    if (deltas.length === 0) {
      return null;
    }

    if (deltas.length === 1) {
      return deltas[0];
    }

    const mergedAdjustments = new Map<string, RoadmapAdjustment>();
    let totalPct = 0;

    for (const delta of deltas) {
      totalPct += delta.pct;

      for (const adj of delta.adjustments) {
        const key = `${adj.phase}:${adj.action}`;

        if (mergedAdjustments.has(key)) {
          const existing = mergedAdjustments.get(key)!;
          if (adj.effort_estimate !== undefined && existing.effort_estimate !== undefined) {
            existing.effort_estimate += adj.effort_estimate;
          }
        } else {
          mergedAdjustments.set(key, { ...adj });
        }
      }
    }

    return {
      type: deltas[0].type,
      timestamp: new Date().toISOString(),
      pct: Math.round(totalPct * 100) / 100,
      adjustments: Array.from(mergedAdjustments.values()),
      delta_id: randomUUID(),
      summary: `Merged ${deltas.length} roadmap deltas`,
      confidence: deltas.reduce((sum, d) => sum + (d.confidence || 0.5), 0) / deltas.length,
    };
  }

  validateDelta(delta: RoadmapDelta): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!delta.type) {
      errors.push('Delta type is required');
    }

    if (!delta.timestamp) {
      errors.push('Timestamp is required');
    }

    if (typeof delta.pct !== 'number') {
      errors.push('Percentage change must be a number');
    }

    if (!Array.isArray(delta.adjustments)) {
      errors.push('Adjustments must be an array');
    } else {
      for (let i = 0; i < delta.adjustments.length; i++) {
        const adj = delta.adjustments[i];

        if (!adj.phase) {
          errors.push(`Adjustment ${i}: phase is required`);
        }

        if (!adj.action) {
          errors.push(`Adjustment ${i}: action is required`);
        }

        if (!adj.reason) {
          errors.push(`Adjustment ${i}: reason is required`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
