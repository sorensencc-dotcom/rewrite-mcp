// File: projects/cic/src/skills/skill-synthesizer.ts | Date: 2026-06-03 | v1.0.0

import {
  SkillGraphStore,
  SkillGraph,
  SkillNode,
  SkillEdge
} from "./skill-graph-store.js";

export interface SkillHotspots {
  orphanSkills: SkillNode[];
  unusedAgents: SkillNode[];
  denseNodes: SkillNode[];
}

export class SkillSynthesizer {
  constructor(private store: SkillGraphStore) {}

  private dedupe(graph: SkillGraph): SkillGraph {
    const seenNodes = new Map<string, SkillNode>();
    for (const n of graph.nodes) seenNodes.set(n.id, n);

    const seenEdges = new Map<string, SkillEdge>();
    for (const e of graph.edges) {
      const key = `${e.from}->${e.to}:${e.type}`;
      seenEdges.set(key, e);
    }

    return {
      nodes: [...seenNodes.values()],
      edges: [...seenEdges.values()]
    };
  }

  private computeHotspots(graph: SkillGraph): SkillHotspots {
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();

    for (const e of graph.edges) {
      outgoing.set(e.from, (outgoing.get(e.from) || 0) + 1);
      incoming.set(e.to, (incoming.get(e.to) || 0) + 1);
    }

    const orphanSkills = graph.nodes.filter(
      n =>
        n.type === "skill" &&
        !incoming.get(n.id) &&
        !outgoing.get(n.id)
    );

    const unusedAgents = graph.nodes.filter(
      n =>
        n.type === "agent" &&
        !outgoing.get(n.id)
    );

    const denseNodes = graph.nodes.filter(
      n =>
        (incoming.get(n.id) || 0) + (outgoing.get(n.id) || 0) >= 5
    );

    return { orphanSkills, unusedAgents, denseNodes };
  }

  run(): void {
    this.store.update(g => {
      const deduped = this.dedupe(g);
      const hotspots = this.computeHotspots(deduped);
      return {
        ...deduped,
        meta: {
          ...deduped.meta,
          hotspots
        }
      };
    });
  }
}
