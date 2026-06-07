// File: projects/cic/src/mee/mee-proposal-graph.ts | Date: 2026-06-03 | v1.0.0

import { PhaseProposal, PhasePatchSet } from "./mee-schema.js";
import { MeePatchSynthesizer } from "./mee-synthesizer.js";
import { MeeValidator } from "./mee-validator.js";

export interface ProposalNode {
  id: string;
  proposal: PhaseProposal;
  patchSet: PhasePatchSet | null;
}

export interface DependencyEdge {
  from: string;
  to: string;
  reason: string;
}

export interface Conflict {
  proposalA: string;
  proposalB: string;
  path: string;
  type: "overwrite" | "schema" | "logical";
}

export interface ProposalGraph {
  nodes: ProposalNode[];
  edges: DependencyEdge[];
  conflicts: Conflict[];
}

export class MeeProposalGraph {
  constructor(
    private readonly synth: MeePatchSynthesizer,
    private readonly validator: MeeValidator
  ) {}

  buildGraph(proposals: PhaseProposal[]): ProposalGraph {
    const nodes = proposals.map((p) => ({
      id: p.id,
      proposal: p,
      patchSet: this.synth.synthesize(p),
    }));

    const edges: DependencyEdge[] = [];
    const conflicts: Conflict[] = [];

    // Detect conflicts based on pa.path === pb.path
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        if (a.patchSet && b.patchSet) {
          for (const pa of a.patchSet.patches) {
            for (const pb of b.patchSet.patches) {
              if (pa.path === pb.path) {
                conflicts.push({
                  proposalA: a.id,
                  proposalB: b.id,
                  path: pa.path,
                  type: "overwrite",
                });
              }
            }
          }
        }
      }
    }

    // Dependency edges (simple heuristic matching "Phase XX" in titles)
    for (const node of nodes) {
      if (node.proposal.title.includes("Phase")) {
        const match = node.proposal.title.match(/Phase\s*(\d+)/i);
        if (match) {
          const phaseNum = Number(match[1]);
          const prev = nodes.find((n) => {
            const m = n.proposal.title.match(/Phase\s*(\d+)/i);
            return m && Number(m[1]) === phaseNum - 1;
          });
          if (prev) {
            edges.push({
              from: prev.id,
              to: node.id,
              reason: `Sequential phase dependency (Phase ${phaseNum - 1} -> Phase ${phaseNum})`,
            });
          }
        }
      }
    }

    return { nodes, edges, conflicts };
  }

  topologicalSort(graph: ProposalGraph): ProposalNode[] {
    const incoming = new Map<string, number>();
    graph.nodes.forEach((n) => incoming.set(n.id, 0));

    graph.edges.forEach((e) => {
      if (incoming.has(e.to)) {
        incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
      }
    });

    const queue = graph.nodes.filter((n) => incoming.get(n.id) === 0);
    const result: ProposalNode[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      for (const edge of graph.edges.filter((e) => e.from === node.id)) {
        if (incoming.has(edge.to)) {
          const count = incoming.get(edge.to)! - 1;
          incoming.set(edge.to, count);
          if (count === 0) {
            const nextNode = graph.nodes.find((n) => n.id === edge.to);
            if (nextNode) queue.push(nextNode);
          }
        }
      }
    }

    // Append any isolated or cyclic nodes so we don't leave them out
    if (result.length < graph.nodes.length) {
      for (const node of graph.nodes) {
        if (!result.some((r) => r.id === node.id)) {
          result.push(node);
        }
      }
    }

    return result;
  }
}
