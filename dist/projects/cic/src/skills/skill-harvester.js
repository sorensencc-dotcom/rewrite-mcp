"use strict";
// File: projects/cic/src/skills/skill-harvester.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillHarvester = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class SkillHarvester {
    constructor(repoRoot, store) {
        this.repoRoot = repoRoot;
        this.store = store;
    }
    harvestAgents() {
        const agentsDir = node_path_1.default.join(this.repoRoot, "projects/cic/src/agents");
        if (!node_fs_1.default.existsSync(agentsDir))
            return [];
        // Recursive walker helper
        const walk = (dir) => {
            let results = [];
            const list = node_fs_1.default.readdirSync(dir);
            for (const file of list) {
                const fullPath = node_path_1.default.join(dir, file);
                const stat = node_fs_1.default.statSync(fullPath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(walk(fullPath));
                }
                else {
                    results.push(fullPath);
                }
            }
            return results;
        };
        const files = walk(agentsDir);
        return files
            .filter(f => f.endsWith(".ts"))
            .map(f => {
            const relativePath = node_path_1.default.relative(agentsDir, f).replace(/\\/g, "/");
            return {
                id: `agent:${relativePath}`,
                type: "agent",
                name: relativePath,
                meta: { path: node_path_1.default.relative(this.repoRoot, f).replace(/\\/g, "/") }
            };
        });
    }
    harvestPrompts() {
        const pmsDir = node_path_1.default.join(this.repoRoot, "projects/cic/pms/templates");
        if (!node_fs_1.default.existsSync(pmsDir))
            return [];
        // Recursive walker helper
        const walk = (dir) => {
            let results = [];
            const list = node_fs_1.default.readdirSync(dir);
            for (const file of list) {
                const fullPath = node_path_1.default.join(dir, file);
                const stat = node_fs_1.default.statSync(fullPath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(walk(fullPath));
                }
                else {
                    results.push(fullPath);
                }
            }
            return results;
        };
        const files = walk(pmsDir);
        return files
            .filter(f => f.endsWith(".yaml") || f.endsWith(".yml") || f.endsWith(".prompt.md"))
            .map(f => {
            const relativePath = node_path_1.default.relative(pmsDir, f).replace(/\\/g, "/");
            return {
                id: `skill:${relativePath}`,
                type: "skill",
                name: relativePath,
                meta: { path: node_path_1.default.relative(this.repoRoot, f).replace(/\\/g, "/") }
            };
        });
    }
    linkAgentsToSkills(agents, skills) {
        const edges = [];
        for (const a of agents) {
            const aName = node_path_1.default.basename(a.name, ".ts").toLowerCase().replace(/-agent$/, "");
            const match = skills.find(s => {
                const sName = node_path_1.default.basename(s.name, node_path_1.default.extname(s.name)).toLowerCase();
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
    run() {
        const agents = this.harvestAgents();
        const skills = this.harvestPrompts();
        const edges = this.linkAgentsToSkills(agents, skills);
        // Seed default external systems
        const externalSystems = [
            { id: "external_system:claude", type: "external_system", name: "Claude" },
            { id: "external_system:copilot", type: "external_system", name: "Copilot" },
            { id: "external_system:antigravity", type: "external_system", name: "Antigravity" }
        ];
        this.store.update(g => {
            // Merge and deduplicate
            const nodeMap = new Map();
            for (const n of [...g.nodes, ...agents, ...skills, ...externalSystems]) {
                nodeMap.set(n.id, n);
            }
            // Deduplicate edges
            const edgeMap = new Map();
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
exports.SkillHarvester = SkillHarvester;
//# sourceMappingURL=skill-harvester.js.map