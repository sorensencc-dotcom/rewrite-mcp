// File: projects/cic/src/skills/skill-graph-store.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";

export type SkillNodeType =
  | "skill"
  | "agent"
  | "tool"
  | "lane"
  | "phase"
  | "doc"
  | "external_system";

export type SkillEdgeType =
  | "depends_on"
  | "implements"
  | "observes"
  | "controls"
  | "documents"
  | "mirrors";

export interface SkillNode {
  id: string;
  type: SkillNodeType;
  name: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface SkillEdge {
  from: string;
  to: string;
  type: SkillEdgeType;
  meta?: Record<string, unknown>;
}

export interface SkillGraph {
  nodes: SkillNode[];
  edges: SkillEdge[];
  meta?: Record<string, unknown>;
}

export class SkillGraphStore {
  constructor(private graphPath: string) {}

  load(): SkillGraph {
    if (!fs.existsSync(this.graphPath)) {
      return { nodes: [], edges: [] };
    }
    const raw = fs.readFileSync(this.graphPath, "utf8");
    return JSON.parse(raw) as SkillGraph;
  }

  save(graph: SkillGraph): void {
    const dir = path.dirname(this.graphPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.graphPath, JSON.stringify(graph, null, 2), "utf8");
  }

  update(mutator: (g: SkillGraph) => SkillGraph): void {
    const current = this.load();
    const next = mutator(current);
    this.save(next);
  }
}
