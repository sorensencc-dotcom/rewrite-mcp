// File: projects/cic/src/skills/skill-graph-store.ts | Date: 2026-06-03 | v1.0.0
import fs from "node:fs";
import path from "node:path";
export class SkillGraphStore {
    constructor(graphPath) {
        this.graphPath = graphPath;
    }
    load() {
        if (!fs.existsSync(this.graphPath)) {
            return { nodes: [], edges: [] };
        }
        const raw = fs.readFileSync(this.graphPath, "utf8");
        return JSON.parse(raw);
    }
    save(graph) {
        const dir = path.dirname(this.graphPath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.graphPath, JSON.stringify(graph, null, 2), "utf8");
    }
    update(mutator) {
        const current = this.load();
        const next = mutator(current);
        this.save(next);
    }
}
//# sourceMappingURL=skill-graph-store.js.map