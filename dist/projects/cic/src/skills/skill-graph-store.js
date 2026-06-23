"use strict";
// File: projects/cic/src/skills/skill-graph-store.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillGraphStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class SkillGraphStore {
    constructor(graphPath) {
        this.graphPath = graphPath;
    }
    load() {
        if (!node_fs_1.default.existsSync(this.graphPath)) {
            return { nodes: [], edges: [] };
        }
        const raw = node_fs_1.default.readFileSync(this.graphPath, "utf8");
        return JSON.parse(raw);
    }
    save(graph) {
        const dir = node_path_1.default.dirname(this.graphPath);
        if (!node_fs_1.default.existsSync(dir))
            node_fs_1.default.mkdirSync(dir, { recursive: true });
        node_fs_1.default.writeFileSync(this.graphPath, JSON.stringify(graph, null, 2), "utf8");
    }
    update(mutator) {
        const current = this.load();
        const next = mutator(current);
        this.save(next);
    }
}
exports.SkillGraphStore = SkillGraphStore;
//# sourceMappingURL=skill-graph-store.js.map