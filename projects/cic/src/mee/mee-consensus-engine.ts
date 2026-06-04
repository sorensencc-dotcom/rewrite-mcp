// File: projects/cic/src/mee/mee-consensus-engine.ts | Date: 2026-06-04 | v1.0.0

import { MeeAgentCritique, MeeConsensusScore, MeeConsensusResult } from "./mee-schema.js";

export class MeeConsensusEngine {
  constructor(public readonly threshold: number = 70) {}

  scoreProposal(proposalId: string, critiques: MeeAgentCritique[], cycle: number = 1): MeeConsensusScore {
    let score = 100;

    for (const critique of critiques) {
      if (critique.severity === "error") {
        score -= 40;
      } else if (critique.severity === "warn") {
        score -= 20;
      } else if (critique.severity === "info") {
        score -= 5;
      }
    }

    // Apply cycle decay factor to prevent infinite refinement loops
    if (cycle > 1) {
      score -= (cycle - 1) * 10;
    }

    if (score < 0) {
      score = 0;
    }

    const passed = score >= this.threshold;

    return {
      proposalId,
      score,
      critiquesCount: critiques.length,
      passed
    };
  }

  determineResult(
    proposalId: string,
    score: number,
    critiques: MeeAgentCritique[],
    cycle: number,
    maxCycles: number = 3
  ): MeeConsensusResult {
    let decision: "ready" | "needs_revision" | "blocked";

    if (score >= this.threshold) {
      decision = "ready";
    } else if (cycle < maxCycles) {
      decision = "needs_revision";
    } else {
      decision = "blocked";
    }

    return {
      proposalId,
      decision,
      score,
      critiques,
      cycles: cycle
    };
  }
}
