// File: projects/cic/src/skills/skill-doctrine-sync.ts | Date: 2026-06-03 | v1.0.0

import { SkillGraphStore, SkillNode } from "./skill-graph-store.js";

export interface ExternalSkillMapping {
  cicSkillId: string;
  claudeSkillId?: string;
  copilotSkillId?: string;
  antigravityLaneId?: string;
}

export interface DoctrineDriftReport {
  unmappedCicSkills: SkillNode[];
  unmappedExternalSkills: string[];
}

export class SkillDoctrineSync {
  constructor(
    private store: SkillGraphStore,
    private mappings: ExternalSkillMapping[]
  ) {}

  computeDrift(): DoctrineDriftReport {
    const graph = this.store.load();
    const cicSkills = graph.nodes.filter(n => n.type === "skill");

    const mappedIds = new Set(
      this.mappings.map(m => m.cicSkillId)
    );

    const unmappedCicSkills = cicSkills.filter(
      s => !mappedIds.has(s.id)
    );

    // placeholder for external inventory integration
    const unmappedExternalSkills: string[] = [];

    return { unmappedCicSkills, unmappedExternalSkills };
  }
}
