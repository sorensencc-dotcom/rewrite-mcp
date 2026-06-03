// File: projects/cic/src/mee/mee-negotiation-agent.ts | Date: 2026-06-03 | v1.0.0

import { PhaseProposal, PhasePatchSet } from "./mee-schema.js";

export interface NegotiationResolution {
  type: "reorder" | "merge" | "drop" | "modify";
  reason: string;
  details?: Record<string, unknown>;
}

export class MeeNegotiationAgent {
  constructor(
    public readonly proposal: PhaseProposal,
    public readonly patchSet: PhasePatchSet
  ) {}

  analyzeConflicts(other: MeeNegotiationAgent): NegotiationResolution | null {
    if (!this.patchSet || !other.patchSet) return null;
    
    for (const a of this.patchSet.patches) {
      for (const b of other.patchSet.patches) {
        if (a.path === b.path) {
          return {
            type: "reorder",
            reason: `Both modify ${a.path}`,
            details: { path: a.path }
          };
        }
      }
    }
    return null;
  }

  proposeResolution(other: MeeNegotiationAgent): NegotiationResolution | null {
    return this.analyzeConflicts(other);
  }

  acceptResolution(_resolution: NegotiationResolution): boolean {
    return true;
  }

  rejectResolution(_resolution: NegotiationResolution): boolean {
    return false;
  }
}
