// File: projects/cic/src/mee/mee-negotiation-engine.ts | Date: 2026-06-03 | v1.0.0

import { MeeNegotiationAgent, NegotiationResolution } from "./mee-negotiation-agent.js";
import { PhaseProposal } from "./mee-schema.js";

export interface NegotiationTranscriptEntry {
  round: number;
  agentA: string;
  agentB: string;
  resolution: NegotiationResolution | null;
}

export class MeeNegotiationEngine {
  private transcript: NegotiationTranscriptEntry[] = [];

  runRound(agents: MeeNegotiationAgent[], round: number): boolean {
    let changed = false;

    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i];
        const b = agents[j];

        const resolution = a.proposeResolution(b);

        this.transcript.push({
          round,
          agentA: a.proposal.id,
          agentB: b.proposal.id,
          resolution
        });

        if (resolution) {
          changed = true;
        }
      }
    }

    return changed;
  }

  runUntilStable(agents: MeeNegotiationAgent[]): void {
    this.transcript = []; // Reset on new run
    let round = 1;
    while (this.runRound(agents, round)) {
      round++;
      if (round > 10) break;
    }
  }

  getTranscript(): NegotiationTranscriptEntry[] {
    return this.transcript;
  }

  produceConsensusPlan(agents: MeeNegotiationAgent[]): PhaseProposal[] {
    return agents
      .map((a) => a.proposal)
      .sort((a, b) => a.title.localeCompare(b.title));
  }
}
