// File: projects/cic/src/skills/skill-harvester.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import {
  SkillGraphStore,
  SkillNode,
  SkillEdge
} from "./skill-graph-store.js";

export class SkillHarvester {
  constructor(
    private repoRoot: string,
    private store: SkillGraphStore
  ) {}

  private harvestAgents(): SkillNode[] {
    const agentsDir = path.join(this.repoRoot, "projects/cic/src/agents");
    if (!fs.existsSync(agentsDir)) return [];
    
    // Recursive walker helper
    const walk = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(fullPath));
        } else {
          results.push(fullPath);
        }
      }
      return results;
    };

    const files = walk(agentsDir);
    return files
      .filter(f => f.endsWith(".ts"))
      .map(f => {
        const relativePath = path.relative(agentsDir, f).replace(/\\/g, "/");
        return {
          id: `agent:${relativePath}`,
          type: "agent" as const,
          name: relativePath,
          meta: { path: path.relative(this.repoRoot, f).replace(/\\/g, "/") }
        };
      });
  }

  private harvestPrompts(): SkillNode[] {
    const pmsDir = path.join(this.repoRoot, "projects/cic/pms/templates");
    if (!fs.existsSync(pmsDir)) return [];

    // Recursive walker helper
    const walk = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(fullPath));
        } else {
          results.push(fullPath);
        }
      }
      return results;
    };

    const files = walk(pmsDir);
    return files
      .filter(f => f.endsWith(".yaml") || f.endsWith(".yml") || f.endsWith(".prompt.md"))
      .map(f => {
        const relativePath = path.relative(pmsDir, f).replace(/\\/g, "/");
        return {
          id: `skill:${relativePath}`,
          type: "skill" as const,
          name: relativePath,
          meta: { path: path.relative(this.repoRoot, f).replace(/\\/g, "/") }
        };
      });
  }

  private linkAgentsToSkills(
    agents: SkillNode[],
    skills: SkillNode[]
  ): SkillEdge[] {
    const edges: SkillEdge[] = [];
    for (const a of agents) {
      const aName = path.basename(a.name, ".ts").toLowerCase().replace(/-agent$/, "");
      const match = skills.find(s => {
        const sName = path.basename(s.name, path.extname(s.name)).toLowerCase();
        return sName.includes(aName) || aName.includes(sName);
      });
      if (match) {
        edges.push({
          from: a.id,
          to: match.id,
          type: "implements",
          meta: { inferred: true }
        });
      }
    }
    return edges;
  }

  run(): void {
    const agents = this.harvestAgents();
    const skills = this.harvestPrompts();
    const edges = this.linkAgentsToSkills(agents, skills);

    // Seed default external systems
    const externalSystems: SkillNode[] = [
      { id: "external_system:claude", type: "external_system", name: "Claude" },
      { id: "external_system:copilot", type: "external_system", name: "Copilot" },
      { id: "external_system:antigravity", type: "external_system", name: "Antigravity" }
    ];

    this.store.update(g => {
      // Merge and deduplicate
      const nodeMap = new Map<string, SkillNode>();
      for (const n of [...g.nodes, ...agents, ...skills, ...externalSystems]) {
        nodeMap.set(n.id, n);
      }

      // Deduplicate edges
      const edgeMap = new Map<string, SkillEdge>();
      for (const e of [...g.edges, ...edges]) {
        const key = `${e.from}->${e.to}:${e.type}`;
        edgeMap.set(key, e);
      }

      return {
        nodes: Array.from(nodeMap.values()),
        edges: Array.from(edgeMap.values()),
        meta: g.meta
      };
    });
  }
}
