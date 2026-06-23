"use strict";
// File: projects/cic/src/mee/mee-research-finding-store.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMeeResearchFindingStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const mee_schema_js_1 = require("./mee-schema.js");
const DEFAULT_DATA = { findings: [] };
class FileMeeResearchFindingStore {
    constructor(baseDir = process.cwd()) {
        this.filePath = node_path_1.default.join(baseDir, "projects", "cic", "data", "mee", "findings.json");
    }
    ensureDir() {
        const dir = node_path_1.default.dirname(this.filePath);
        if (!node_fs_1.default.existsSync(dir)) {
            node_fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    loadFile() {
        try {
            if (!node_fs_1.default.existsSync(this.filePath)) {
                return DEFAULT_DATA;
            }
            const raw = node_fs_1.default.readFileSync(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed.findings))
                return DEFAULT_DATA;
            return parsed;
        }
        catch {
            return DEFAULT_DATA;
        }
    }
    saveFile(data) {
        this.ensureDir();
        node_fs_1.default.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
    }
    loadAll() {
        return this.loadFile().findings;
    }
    get(id) {
        return this.loadAll().find((f) => f.id === id) ?? null;
    }
    add(finding) {
        if (!(0, mee_schema_js_1.isResearchFinding)(finding)) {
            throw new Error(`Invalid ResearchFinding schema: ${JSON.stringify(finding)}`);
        }
        const data = this.loadFile();
        data.findings = [...data.findings, finding];
        this.saveFile(data);
    }
    update(id, partial) {
        const data = this.loadFile();
        const idx = data.findings.findIndex((f) => f.id === id);
        if (idx === -1)
            return;
        const updated = { ...data.findings[idx], ...partial };
        if (!(0, mee_schema_js_1.isResearchFinding)(updated)) {
            throw new Error(`Invalid ResearchFinding schema after update: ${JSON.stringify(updated)}`);
        }
        data.findings[idx] = updated;
        this.saveFile(data);
    }
    saveAll(findings) {
        if (!findings.every(mee_schema_js_1.isResearchFinding)) {
            throw new Error("One or more findings do not match ResearchFinding schema.");
        }
        this.saveFile({ findings });
    }
}
exports.FileMeeResearchFindingStore = FileMeeResearchFindingStore;
//# sourceMappingURL=mee-research-finding-store.js.map