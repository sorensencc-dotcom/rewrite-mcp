/**
 * CIC Policy Rails Engine
 * Phase 24.1: Policy Rail Precedence Model
 *
 * Precedence: HARD_SAFETY > DOMAIN > PHASE > SOFT
 * Conflict resolution: Most restrictive rail wins
 */

import {
  PolicyRail,
  PolicyContext,
  RailCategory,
  RailConflict,
} from './types';

export class PolicyRails {
  private rails: Map<string, PolicyRail> = new Map();

  /**
   * Register a policy rail
   */
  registerRail(rail: PolicyRail): void {
    this.rails.set(rail.rail_id, rail);
  }

  /**
   * Get all rails
   */
  getAllRails(): PolicyRail[] {
    return Array.from(this.rails.values());
  }

  /**
   * Get rail by ID
   */
  getRail(rail_id: string): PolicyRail | undefined {
    return this.rails.get(rail_id);
  }

  /**
   * Evaluate all active rails for a given policy context
   * Returns list of violated rails (if any)
   */
  evaluateRails(
    context: PolicyContext,
  ): {
    violated: PolicyRail[];
    warnings: PolicyRail[];
    passed: PolicyRail[];
  } {
    const allRails = this.getAllRails();
    const activeRails = this.getActiveRails(context);

    const violated: PolicyRail[] = [];
    const warnings: PolicyRail[] = [];
    const passed: PolicyRail[] = [];

    for (const rail of activeRails) {
      const result = rail.constraint(context);

      if (result === true) {
        passed.push(rail);
      } else if (result === false) {
        if (rail.severity === 'critical' || rail.severity === 'error') {
          violated.push(rail);
        } else if (rail.severity === 'warn') {
          warnings.push(rail);
        }
      } else if (typeof result === 'string') {
        // Error message returned
        if (rail.severity === 'critical' || rail.severity === 'error') {
          violated.push(rail);
        } else if (rail.severity === 'warn') {
          warnings.push(rail);
        }
      }
    }

    return { violated, warnings, passed };
  }

  /**
   * Get active rails for context (filters by domain/phase)
   */
  private getActiveRails(context: PolicyContext): PolicyRail[] {
    const allRails = this.getAllRails();

    return allRails.filter((rail) => {
      // Global rails are always active
      if (context.global_rails?.includes(rail.rail_id)) {
        return true;
      }

      // Domain rails active if domain matches
      if (
        rail.category === RailCategory.DOMAIN &&
        context.domain_rails?.includes(rail.rail_id)
      ) {
        return true;
      }

      // Phase rails active if phase matches
      if (
        rail.category === RailCategory.PHASE &&
        context.phase_rails?.includes(rail.rail_id)
      ) {
        return true;
      }

      // SOFT rails are always included (advisory)
      if (rail.category === RailCategory.SOFT) {
        return true;
      }

      return false;
    });
  }

  /**
   * Resolve conflict between two rails (most restrictive wins)
   */
  resolveConflict(
    rail1: PolicyRail,
    rail2: PolicyRail,
    context: PolicyContext,
  ): RailConflict {
    // Precedence order
    const categoryPrecedence: Record<RailCategory, number> = {
      [RailCategory.HARD_SAFETY]: 4,
      [RailCategory.DOMAIN]: 3,
      [RailCategory.PHASE]: 2,
      [RailCategory.SOFT]: 1,
    };

    const precedence1 = categoryPrecedence[rail1.category];
    const precedence2 = categoryPrecedence[rail2.category];

    let resolved: PolicyRail;
    if (precedence1 > precedence2) {
      resolved = rail1;
    } else if (precedence2 > precedence1) {
      resolved = rail2;
    } else {
      // Same category: higher severity wins
      const severityPrecedence = { critical: 4, error: 3, warn: 2, info: 1 };
      resolved =
        severityPrecedence[rail1.severity] >=
        severityPrecedence[rail2.severity]
          ? rail1
          : rail2;
    }

    return {
      conflicting_rails: [rail1, rail2],
      context,
      resolved_to: resolved,
      rationale: `${resolved.category} (${resolved.severity}) takes precedence`,
    };
  }

  /**
   * Find all conflicts between active rails
   */
  findConflicts(
    context: PolicyContext,
  ): RailConflict[] {
    const activeRails = this.getActiveRails(context);
    const conflicts: RailConflict[] = [];

    // Check pairwise for conflicts
    for (let i = 0; i < activeRails.length; i++) {
      for (let j = i + 1; j < activeRails.length; j++) {
        const r1 = activeRails[i];
        const r2 = activeRails[j];

        // Simple heuristic: rules with overlapping names likely conflict
        if (
          r1.name.toLowerCase().includes(r1.domain || '') &&
          r2.name.toLowerCase().includes(r2.domain || '')
        ) {
          conflicts.push(this.resolveConflict(r1, r2, context));
        }
      }
    }

    return conflicts;
  }

  /**
   * Apply precedence to determine if action should be allowed
   * Returns: { allowed: boolean; reason: string; violated_rails: PolicyRail[] }
   */
  applyPrecedence(
    context: PolicyContext,
  ): {
    allowed: boolean;
    reason: string;
    violated_rails: PolicyRail[];
  } {
    const evaluation = this.evaluateRails(context);

    if (evaluation.violated.length > 0) {
      const mostRestrictive = evaluation.violated.reduce((a, b) => {
        const severityRank = { critical: 4, error: 3, warn: 2, info: 1 };
        return severityRank[a.severity] >= severityRank[b.severity] ? a : b;
      });

      return {
        allowed: false,
        reason: `Blocked by ${mostRestrictive.category} rail: ${mostRestrictive.name}`,
        violated_rails: evaluation.violated,
      };
    }

    return {
      allowed: true,
      reason: 'All active rails permit this action',
      violated_rails: [],
    };
  }
}

/**
 * Default hard safety rails (examples)
 */
export const DEFAULT_HARD_SAFETY_RAILS: PolicyRail[] = [
  {
    rail_id: 'hs_no_external_writes_without_approval',
    category: RailCategory.HARD_SAFETY,
    name: 'No External Writes Without Approval',
    description: 'External system writes require explicit approval',
    severity: 'critical',
    constraint: (context: PolicyContext) =>
      context.metadata?.requires_approval !== true ||
      context.metadata?.approved === true,
  },
  {
    rail_id: 'hs_no_destructive_without_backup',
    category: RailCategory.HARD_SAFETY,
    name: 'No Destructive Operations Without Backup',
    description: 'Destructive operations require prior backup/snapshot',
    severity: 'critical',
    constraint: (context: PolicyContext) =>
      context.metadata?.is_destructive !== true ||
      context.metadata?.has_backup === true,
  },
];
