// File: projects/cic/src/skills/skill-doctrine-sync.ts | Date: 2026-06-03 | v1.0.0
export class SkillDoctrineSync {
    constructor(store, mappings) {
        this.store = store;
        this.mappings = mappings;
    }
    computeDrift() {
        const graph = this.store.load();
        const cicSkills = graph.nodes.filter(n => n.type === "skill");
        const mappedIds = new Set(this.mappings.map(m => m.cicSkillId));
        const unmappedCicSkills = cicSkills.filter(s => !mappedIds.has(s.id));
        // placeholder for external inventory integration
        const unmappedExternalSkills = [];
        return { unmappedCicSkills, unmappedExternalSkills };
    }
}
//# sourceMappingURL=skill-doctrine-sync.js.map